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
    choosePaymentOption(page, dialog, "Direction", null, direction === "incoming" ? "Incoming receipt" : "Outgoing payment")
    choosePaymentOption(page, dialog, "Counterparty", "Payment customer", "Payment customer")
    dialog.locator('input[name="amount"]').fill(amount)
    const day = page.evaluate(() => document.querySelector('[role="dialog"] input[name="effectiveDate"]')?.value)
    assert(/^\d{4}-\d{2}-\d{2}$/.test(day), "A payment starts with an explicit organization-local date")
    dialog.locator('input[name="effectiveDate"]').fill(day)
    choosePaymentOption(page, dialog, "Instrument", "cash", /^Cash$/i)
    choosePaymentOption(page, dialog, "Organization method", "Accounting payment cash", /Accounting payment cash/)
    dialog.locator('input[name="referenceNumber"]').fill(reference)
    dialog.locator('textarea[name="comments"]').fill("Payment lifecycle walk " + reference)
    const selected = visiblePaymentFormFields(page, "savePaymentDraft")
    assert(selected.partyId === "BOSS_ACCT_PAY_CUSTOMER", "The actual create form retains the selected counterparty")
    assert(!!selected.currencyUomId, "The actual create form retains its explicit currency")
    assert(
        typeof selected.organizationMethodToken === "string" && /^BOSS_ACCT_PAY_CASH~.+$/.test(selected.organizationMethodToken),
        "The actual create form submits the selected organization method and its reviewed revision"
    )
    dialog.getByRole("button", {name: "Create payment", exact: true}).click()
    page.waitForURL(/\/PaymentDetail/)
    page.waitFor(() => document.querySelector(".m-record-header")?.innerText.includes("Payment customer"))
    const id = page.evaluate(
        () => new URL(location.href).searchParams.get("recordId") || new URL(location.href).searchParams.get("paymentId")
    )
    assert(!!id, "Creating the draft opens its actual payment")
    return {paymentId: id, day, organizationMethodToken: selected.organizationMethodToken}
}
// The header's action for the payment's state (the primary button, or an item of More), its dialog, and the review
function previewPaymentState(page, action, reference, reason) {
    page.locator(".m-record-actions")
        .getByRole("button", {name: new RegExp(action + "$")})
        .click()
    const dialog = page.getByRole("dialog")
    dialog.locator('input[name="referenceNumber"]').fill(reference)
    dialog.locator('textarea[name="reason"]').fill(reason)
    dialog.getByRole("button", {name: "Review change", exact: true}).click()
    page.waitForURL(/\/PaymentDetail\/Review\?/)
    page.waitFor(() => window.moqui.screenForms.some(form => /\/confirmReview$/.test(form.action) && form.fields?.previewId))
}
function paymentConfirmationIdentity(page) {
    page.waitFor(() => window.moqui.screenForms.some(form => /\/confirmReview$/.test(form.action) && form.fields?.previewId))
    return JSON.parse(
        page.evaluate(() => {
            const form = window.moqui.screenForms.find(form => /\/confirmReview$/.test(form.action) && form.fields?.previewId)
            return JSON.stringify({
                paymentId: form.fields.paymentId,
                previewId: form.fields.previewId,
                previewKind: form.fields.previewKind,
                inputFingerprint: form.fields.inputFingerprint,
                operationKey: form.fields.operationKey
            })
        })
    )
}
// The review's own button names the change ("Validate payment"); its result stays on the review
function confirmPaymentState(page, action) {
    const identity = paymentConfirmationIdentity(page)
    page.evaluate(() => {
        window.confirm = () => true
        return true
    }) == true
    page.locator(".q-page form")
        .getByRole("button", {name: action, exact: true})
        .click()
    page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Payment change completed"))
    assert(
        page.evaluate(() => new URL(location.href).searchParams.get("previewId")) === identity.previewId,
        "The confirmation shows the reviewed preview's result"
    )
    assert(
        page.evaluate(() => new URL(location.href).searchParams.get("paymentId")) === identity.paymentId,
        "The confirmation stays on its payment"
    )
    assert(
        page.evaluate(
            id => document.querySelector('[id^="ReviewResultFacts"][id$="_table"]')?.innerText.includes(id),
            identity.paymentId
        ),
        "The confirmation displays the actual payment result"
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
                result: text("ReviewResultFacts"),
                applications: text("ReviewResultApplications"),
                postings: text("ReviewPostingResults"),
                postingReferences: references("ReviewPostingResults", "acctgTransId"),
                files: text("ReviewOutputResults"),
                outputReferences: references("ReviewOutputResults", "outputId")
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
        page.text().includes("Payment details reviewed")
        confirmPaymentState(page, "Validate payment")
        page.getByRole("link", {name: "Back to payment", exact: true}).click()
        page.waitFor(() => !new URL(location.href).searchParams.get("previewId"))
        page.waitFor(() => document.querySelector(".m-record-status")?.innerText.includes("Promised"))
        previewPaymentState(page, "Record delivery", "CASH-12.50", "Cash receipt counted and matched")
        page.text().includes(made.day)
        page.text().includes("12.50")
        const reviewed = paymentConfirmationIdentity(page)
        reviewed.paymentId == made.paymentId
        page.goto(page.url()).status == 200
        JSON.stringify(paymentConfirmationIdentity(page)) == JSON.stringify(reviewed)
        confirmPaymentState(page, "Record delivery")
        const event = completedPaymentIdentity(page)
        event.result.includes("Delivered")
        // the receipt and the payment detail, each a link to its file
        event.outputReferences.length >= 2
        event.outputReferences.every(row => !!row.id)
        page.getByRole("button", {name: "Check saved result", exact: true}).click()
        page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Payment change completed"))
        JSON.stringify(completedPaymentIdentity(page)) == JSON.stringify(event)
    }
})
