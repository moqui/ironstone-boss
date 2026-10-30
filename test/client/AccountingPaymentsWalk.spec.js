const paymentsRoute = "/qapps/Accounting/Payments/Payments?organizationPartyId=BOSS_ACCT_ORG"
function paymentPage(user = "finance.treasury", width = 1280) {
    const page = browser.newPage({user, viewport: {width, height: 1000}, timeout: 30})
    page.allowProblems(/userPhoto\?userId=/)
    page.allowProblems(/Blocked script execution in 'about:srcdoc'.*sandboxed/)
    return page
}
function closePaymentOptions(page) {
    page.settle()
    if (
        page.evaluate(() =>
            // A closed QSelect menu can retain its box during its leave transition.
            // Escape belongs to the select only while its accessible popup state is still open.
            Array.from(document.querySelectorAll('[role="combobox"][aria-expanded="true"]')).some(
                control => control.getClientRects().length && getComputedStyle(control).visibility !== "hidden"
            )
        )
    )
        page.keyboard.press("Escape")
    page.waitFor(
        () =>
            !Array.from(document.querySelectorAll(".q-menu")).some(
                menu => menu.getClientRects().length && getComputedStyle(menu).visibility !== "hidden"
            )
    )
    page.settle()
}
function choosePaymentOption(page, dialog, label, search, option) {
    assert(dialog.isVisible(), "The payment dialog is open before choosing " + label)
    dialog.getByLabel(label, {exact: true}).click()
    if (search) dialog.getByLabel(label, {exact: true}).fill(search)
    page.getByRole("option", {name: option, exact: typeof option === "string"})
        .first()
        .click()
    closePaymentOptions(page)
    assert(dialog.isVisible(), "Choosing " + label + " closes only its option popup and keeps the payment dialog open")
}
function visiblePaymentFormFields(page, transition) {
    const state = JSON.parse(
        page.evaluate(transition => {
            const visible = node => node && node.getClientRects().length && getComputedStyle(node).visibility !== "hidden"
            const forms = window.moqui.screenForms.filter(
                form =>
                    typeof form.action === "string" &&
                    form.action.endsWith("/" + transition) &&
                    visible(form.$el.closest('[role="dialog"]')) &&
                    Array.from(form.$el.querySelectorAll('button, input:not([type="hidden"]), textarea, [role="combobox"]')).some(
                        visible
                    )
            )
            const fields = forms.length === 1 ? forms[0].fields : {}
            return JSON.stringify({
                count: forms.length,
                fields: {
                    partyId: fields.partyId,
                    currencyUomId: fields.currencyUomId,
                    organizationMethodToken: fields.organizationMethodToken
                }
            })
        }, transition)
    )
    assert(state.count === 1, "Exactly one visible payment dialog submits " + transition + ": " + JSON.stringify(state))
    return state.fields
}
function createManualPayment(page, direction, amount, reference) {
    page.goto(paymentsRoute).status == 200
    page.getByRole("button", {name: "New payment", exact: true}).click()
    const dialog = page.getByRole("dialog")
    choosePaymentOption(page, dialog, "Cash direction", null, direction === "incoming" ? "Incoming receipt" : "Outgoing payment")
    choosePaymentOption(page, dialog, "Counterparty", "Payment customer", "Payment customer")
    dialog.locator('input[name="amount"]').fill(amount)
    const day = page.evaluate(() => document.querySelector('[role="dialog"] input[name="effectiveDate"]')?.value)
    assert(/^\d{4}-\d{2}-\d{2}$/.test(day), "A payment starts with an explicit organization-local date")
    dialog.locator('input[name="effectiveDate"]').fill(day)
    choosePaymentOption(page, dialog, "Instrument", "cash", /^Cash$/i)
    choosePaymentOption(page, dialog, "Organization method", "Accounting payment cash", /Accounting payment cash/)
    dialog.locator('input[name="referenceNumber"]').fill(reference)
    dialog.locator('textarea[name="comments"]').fill("Payment lifecycle walk " + reference)
    const selected = visiblePaymentFormFields(page, "createPaymentDraft")
    assert(selected.partyId === "BOSS_ACCT_PAY_CUSTOMER", "The actual create form retains the selected counterparty")
    assert(!!selected.currencyUomId, "The actual create form retains its explicit currency")
    assert(
        typeof selected.organizationMethodToken === "string" && /^BOSS_ACCT_PAY_CASH~.+$/.test(selected.organizationMethodToken),
        "The actual create form submits the selected organization method and its reviewed revision"
    )
    dialog.getByRole("button", {name: "Create payment", exact: true}).click()
    page.waitFor(() => document.querySelector(".m-record-header")?.innerText.includes("Payment customer"))
    const id = page.evaluate(
        () => new URL(location.href).searchParams.get("recordId") || new URL(location.href).searchParams.get("paymentId")
    )
    assert(!!id, "Creating the draft opens its actual payment")
    page.waitFor(() => !!document.querySelector('[id^="PaymentSummary_amount"][id$="_display"]'))
    return {paymentId: id, day, organizationMethodToken: selected.organizationMethodToken}
}
function previewPaymentState(page, button, reference, reason) {
    page.locator(".m-record-actions")
        .getByRole("button", {name: new RegExp(button + "$")})
        .click()
    const dialog = page.getByRole("dialog")
    dialog.locator('input[name="referenceNumber"]').fill(reference)
    dialog.locator('textarea[name="reason"]').fill(reason)
    dialog.getByRole("button", {name: "Review payment change", exact: true}).click()
    page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Reviewed payment change"))
}
function paymentConfirmationIdentity(page) {
    page.waitFor(() =>
        window.moqui.screenForms.some(form => /\/confirmPaymentState$/.test(form.action) && form.fields?.previewId)
    )
    return JSON.parse(
        page.evaluate(() => {
            const form = window.moqui.screenForms.find(
                form => /\/confirmPaymentState$/.test(form.action) && form.fields?.previewId
            )
            return JSON.stringify({
                paymentId: form.fields.paymentId,
                previewId: form.fields.previewId,
                inputFingerprint: form.fields.inputFingerprint,
                operationKey: form.fields.operationKey
            })
        })
    )
}
function confirmPaymentState(page) {
    const identity = paymentConfirmationIdentity(page)
    page.getByRole("checkbox", {name: "I reviewed the payment, evidence, application and posting effects", exact: true}).click()
    page.evaluate(() => {
        window.confirm = () => true
        return true
    }) == true
    page.getByRole("button", {name: "Confirm payment change", exact: true}).click()
    page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Payment change completed"))
    page.waitFor(() => new URL(location.href).searchParams.get("previewKind") === "state")
    assert(
        page.evaluate(() => new URL(location.href).searchParams.get("previewId")) === identity.previewId,
        "The first confirmation retains the reviewed native identity"
    )
    assert(
        page.evaluate(
            id => document.querySelector('[id^="PaymentChangeResults"][id$="_table"]')?.innerText.includes(id),
            identity.paymentId
        ),
        "The first confirmation displays the actual payment result"
    )
}
function completedPaymentIdentity(page) {
    page.settle()
    return JSON.parse(
        page.evaluate(() => {
            const table = name => document.querySelector('[id^="' + name + '"][id$="_table"]')
            const text = name => table(name)?.innerText.trim() || ""
            const references = (name, key) =>
                Array.from(table(name)?.querySelectorAll("a[href]") || []).map(link => ({
                    id: new URL(link.href, location.href).searchParams.get(key),
                    label: link.innerText.trim()
                }))
            return JSON.stringify({
                event: text("PaymentChangeResults"),
                applications: text("PaymentActualApplicationResults"),
                postings: text("PaymentActualPostingResults"),
                postingReferences: references("PaymentActualPostingResults", "acctgTransId"),
                files: text("PaymentActualOutputResults"),
                outputReferences: references("PaymentActualOutputResults", "outputId")
            })
        })
    )
}

// One pass through the live client: the new-payment dialog posts its selected method revision, the delivery review
// keeps its identity across a reload, and the saved result is checked again. Payment rules, permissions, refusals and
// stale reviews are AccountingPayments (mr-boss) and mr-mantle's AccountingPayment specs.
feature("treasury creates an incoming draft, validates it, records delivery and retries the retained result", {
    expect() {
        const page = paymentPage()
        const made = createManualPayment(page, "incoming", "12.50", "IN-12.50")
        previewPaymentState(page, "Validate payment", "IN-12.50", "Payment details reviewed")
        confirmPaymentState(page)
        page.getByRole("link", {name: "Back to payment", exact: true}).click()
        page.waitFor(() => !new URL(location.href).searchParams.get("previewId"))
        previewPaymentState(page, "Record delivery", "CASH-12.50", "Cash receipt counted and matched")
        page.text().includes(made.day)
        const reviewed = paymentConfirmationIdentity(page)
        page.goto(page.url()).status == 200
        JSON.stringify(paymentConfirmationIdentity(page)) == JSON.stringify(reviewed)
        confirmPaymentState(page)
        const event = completedPaymentIdentity(page)
        event.outputReferences.length >= 2
        page.getByRole("button", {name: "Check saved payment result", exact: true}).click()
        page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Payment change completed"))
        JSON.stringify(completedPaymentIdentity(page)) == JSON.stringify(event)
    }
})
