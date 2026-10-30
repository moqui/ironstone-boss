const paymentsRoute = "/qapps/Accounting/Payments/Payments?organizationPartyId=BOSS_ACCT_ORG"
const paymentDetailRoute = "/qapps/Accounting/Payments/PaymentDetail"
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
                    organizationMethodToken: fields.organizationMethodToken,
                    counterpartyMethodToken: fields.counterpartyMethodToken,
                    evidenceTokenList: fields.evidenceTokenList,
                    applicationTokenList: fields.applicationTokenList,
                    referenceNumber: fields.referenceNumber,
                    reason: fields.reason,
                    sourceVersion: fields.sourceVersion
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
function openPaymentState(page, button) {
    if (["Cancel payment", "Void payment"].includes(button)) {
        page.locator(".m-record-actions .q-btn-dropdown").first().click()
        page.locator(".q-menu")
            .getByRole("button", {name: new RegExp(button + "$")})
            .click()
    } else
        page.locator(".m-record-actions")
            .getByRole("button", {name: new RegExp(button + "$")})
            .click()
    return page.getByRole("dialog")
}
function previewPaymentState(page, button, reference, reason, settlementDay, previousSourceVersion) {
    const dialog = openPaymentState(page, button)
    dialog.locator('input[name="referenceNumber"]').fill(reference)
    dialog.locator('textarea[name="reason"]').fill(reason)
    if (settlementDay) dialog.locator('input[name="settlementDate"]').fill(settlementDay)
    if (previousSourceVersion)
        assert(
            visiblePaymentFormFields(page, "previewPaymentState").sourceVersion !== previousSourceVersion,
            "A successful own draft edit starts a new review with the updated source revision"
        )
    dialog.getByRole("button", {name: "Review payment change", exact: true}).click()
    page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Reviewed payment change"))
}
function paymentConfirmationIdentity(page) {
    page.waitFor(() =>
        window.moqui.screenForms.some(form => /\/confirmPayment(?:State|Unapply)$/.test(form.action) && form.fields?.previewId)
    )
    return JSON.parse(
        page.evaluate(() => {
            const form = window.moqui.screenForms.find(
                form => /\/confirmPayment(?:State|Unapply)$/.test(form.action) && form.fields?.previewId
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
function confirmPaymentState(page, correction = false) {
    const identity = paymentConfirmationIdentity(page)
    page.getByRole("checkbox", {name: "I reviewed the payment, evidence, application and posting effects", exact: true}).click()
    page.evaluate(() => {
        window.confirm = () => true
        return true
    }) == true
    page.getByRole("button", {
        name: correction ? "Confirm application correction" : "Confirm payment change",
        exact: true
    }).click()
    page.waitFor(text => document.querySelector(".q-page")?.innerText.includes(text), {
        arg: correction ? "Application correction completed" : "Payment change completed"
    })
    page.waitFor(kind => new URL(location.href).searchParams.get("previewKind") === kind, {arg: correction ? "unapply" : "state"})
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
function paymentHeaderText(page) {
    return page.evaluate(() => document.querySelector(".m-record-header")?.innerText || "")
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
function paymentRetainedShots(url, state, user = "finance.treasury") {
    for (const width of [390, 1280, 1440]) {
        for (const dark of [false, true]) {
            const page = paymentPage(user, width)
            try {
                assert(page.goto(url).status === 200, "The owner can reopen the retained payment review")
                page.waitFor(text => document.querySelector(".q-page")?.innerText.includes(text), {
                    arg: state.endsWith("reviewed")
                        ? "Reviewed payment change"
                        : state.startsWith("unapply")
                          ? "Application correction completed"
                          : "Payment change completed"
                })
                page.evaluate(dark => {
                    document.querySelector("#apps-root").__vue_app__.config.globalProperties.$q.dark.set(dark)
                    return true
                }, dark) == true
                page.waitFor(dark => document.body.classList.contains("body--dark") === dark, {arg: dark})
                page.settle()
                page.evaluate(async () => {
                    await Promise.all(
                        document
                            .getAnimations()
                            .filter(animation => Number.isFinite(animation.effect?.getComputedTiming().endTime))
                            .map(animation => animation.finished.catch(() => {}))
                    )
                    return true
                })
                assert(
                    !/Error rendering|Exception in render/.test(page.text()),
                    "Retained payment content must render without errors"
                )
                assert(
                    page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
                    "Retained payment content fits its viewport"
                )
                page.screenshot("Accounting-payment-" + state + "-" + width + "-" + (dark ? "dark" : "light"), {fullPage: true})
            } finally {
                page.close()
            }
        }
    }
}

feature("treasury creates and edits an incoming draft, validates it, records delivery and retries the retained result", {
    expect() {
        const page = paymentPage()
        const made = createManualPayment(page, "incoming", "12.50", "IN-12.50")
        page.locator(".m-record-actions .q-btn-dropdown").first().click()
        page.getByRole("button", {name: "Edit draft", exact: true}).click()
        const edit = page.getByRole("dialog")
        assert(edit.text().includes("Accounting payment cash"), "The edit dialog resolves the authorized initial method label")
        edit.locator('input[name="amount"]').fill("13.50")
        assert(
            visiblePaymentFormFields(page, "savePaymentDraft").organizationMethodToken === made.organizationMethodToken,
            "The edit dialog resolves and retains the original reviewed organization method without reselecting it"
        )
        edit.getByRole("button", {name: "Save payment", exact: true}).click()
        page.waitFor(() => !document.querySelector('[role="dialog"]'))
        previewPaymentState(page, "Validate payment", "IN-13.50", "Payment details reviewed")
        confirmPaymentState(page)
        page.getByRole("link", {name: "Back to payment", exact: true}).click()
        page.waitFor(() => !new URL(location.href).searchParams.get("previewId"))
        previewPaymentState(page, "Record delivery", "CASH-13.50", "Cash receipt counted and matched")
        page.text().includes(made.day)
        page.evaluate(() => document.querySelector('[id^="AccountingPaymentReviewSummary"]')?.innerText.includes("13.50")) == true
        const reviewed = paymentConfirmationIdentity(page)
        page.goto(page.url()).status == 200
        JSON.stringify(paymentConfirmationIdentity(page)) == JSON.stringify(reviewed)
        page.screenshot("Accounting-payment-receipt-review", {fullPage: true})
        paymentRetainedShots(page.url(), "reviewed")
        confirmPaymentState(page)
        page.text().includes("Recorded event")
        page.screenshot("Accounting-payment-receipt-delivered", {fullPage: true})
        paymentRetainedShots(page.url(), "applied")
        const event = completedPaymentIdentity(page)
        event.outputReferences.length >= 2
        new Set(event.outputReferences.map(row => row.id)).size == event.outputReferences.length
        page.getByRole("button", {name: "Check saved payment result", exact: true}).click()
        page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Payment change completed"))
        JSON.stringify(completedPaymentIdentity(page)) == JSON.stringify(event)
        !page.text().includes("Operation key was used for another request")
        page.getByRole("link", {name: "Back to payment", exact: true}).click()
        page.locator(".m-record-actions .q-btn-dropdown").first().click()
        page.getByRole("link", {name: "Payment receipt", exact: true}).click()
        page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Payment document"))
        page.text().includes("13.50")
        page.text().includes(made.day)
        page.text().includes("Payment customer")
        page.text().includes("CASH-13.50")
        page.screenshot("Accounting-payment-issued-receipt", {fullPage: true})
    }
})

feature("an outgoing manual payment requires reference and reason, then confirms an explicit settlement date", {
    expect() {
        const page = paymentPage()
        const made = createManualPayment(page, "outgoing", "18.00", "OUT-18")
        previewPaymentState(page, "Validate payment", "OUT-18", "Outgoing payment checked")
        confirmPaymentState(page)
        page.getByRole("link", {name: "Back to payment", exact: true}).click()
        const dialog = openPaymentState(page, "Record delivery")
        dialog.locator('input[name="referenceNumber"]').fill("")
        dialog.locator('textarea[name="reason"]').fill("")
        page.allowProblems(/notification: warning.*PAYMENT_EVIDENCE_REQUIRED/)
        page.allowProblems(
            /^response: 500 Internal Server Error https?:\/\/[^/]+\/apps\/Accounting\/Payments\/PaymentDetail(?:\/Overview)?\/previewPaymentState$/
        )
        dialog.getByRole("button", {name: "Review payment change", exact: true}).click()
        page.waitFor(() => document.body.innerText.includes("PAYMENT_EVIDENCE_REQUIRED"))
        !page.text().includes("Payment change completed")
        const corrected = page.getByRole("dialog")
        corrected.locator('input[name="referenceNumber"]').fill("DISBURSE-18")
        corrected.locator('textarea[name="reason"]').fill("Cash disbursement counted and receipted")
        corrected.getByRole("button", {name: "Review payment change", exact: true}).click()
        page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Reviewed payment change"))
        confirmPaymentState(page)
        page.getByRole("link", {name: "Back to payment", exact: true}).click()
        previewPaymentState(page, "Confirm settlement", "CLEARED-18", "Receipt reconciled to the cash record", made.day)
        page.text().includes(made.day)
        confirmPaymentState(page)
        page.screenshot("Accounting-payment-outgoing-confirmed", {fullPage: true})
        page.getByRole("link", {name: "Back to payment", exact: true}).click()
        paymentHeaderText(page).includes("Confirmed")
        !page.text().includes("Record delivery")
    }
})

feature("a failed delivery review recovers after closing the dialog and editing the draft amount on the same page", {
    expect() {
        const page = paymentPage()
        const made = createManualPayment(page, "incoming", "21.00", "RECOVER-21")
        previewPaymentState(page, "Validate payment", "RECOVER-21", "Receipt details checked before delivery")
        confirmPaymentState(page)
        page.getByRole("link", {name: "Back to payment", exact: true}).click()
        const failed = openPaymentState(page, "Record delivery")
        failed.locator('input[name="referenceNumber"]').fill("RECOVER-21")
        failed.locator('textarea[name="reason"]').fill("")
        page.allowProblems(/notification: warning.*PAYMENT_EVIDENCE_REQUIRED/)
        page.allowProblems(
            /^response: 500 Internal Server Error https?:\/\/[^/]+\/apps\/Accounting\/Payments\/PaymentDetail(?:\/Overview)?\/previewPaymentState$/
        )
        const firstAttempt = visiblePaymentFormFields(page, "previewPaymentState")
        failed.getByRole("button", {name: "Review payment change", exact: true}).click()
        page.waitFor(() => document.body.innerText.includes("PAYMENT_EVIDENCE_REQUIRED"))
        const refusedAttempt = visiblePaymentFormFields(page, "previewPaymentState")
        refusedAttempt.sourceVersion == firstAttempt.sourceVersion
        refusedAttempt.referenceNumber == firstAttempt.referenceNumber
        refusedAttempt.reason == firstAttempt.reason
        JSON.stringify(refusedAttempt.evidenceTokenList) == JSON.stringify(firstAttempt.evidenceTokenList)
        page.keyboard.press("Escape")
        page.waitFor(() => !document.querySelector('[role="dialog"]'))
        page.locator(".m-record-actions .q-btn-dropdown").first().click()
        page.getByRole("button", {name: "Edit draft", exact: true}).click()
        const edit = page.getByRole("dialog")
        edit.locator('input[name="amount"]').fill("22.00")
        edit.getByRole("button", {name: "Save payment", exact: true}).click()
        page.waitFor(() => !document.querySelector('[role="dialog"]'))
        page.waitFor(() => document.querySelector('[id^="PaymentSummary_amount"][id$="_display"]')?.value.includes("22.00"))
        page.evaluate(
            () => new URL(location.href).searchParams.get("paymentId") || new URL(location.href).searchParams.get("recordId")
        ) == made.paymentId
        previewPaymentState(
            page,
            "Record delivery",
            "RECOVER-22",
            "Corrected receipt amount counted and matched",
            null,
            firstAttempt.sourceVersion
        )
        page.evaluate(() => document.querySelector('[id^="AccountingPaymentReviewSummary"]')?.innerText.includes("22.00")) == true
        confirmPaymentState(page)
        page.text().includes("Corrected receipt amount counted and matched")
        page.evaluate(() => document.querySelector('[id^="AccountingPaymentReviewSummary"]')?.innerText.includes("22.00")) == true
        page.screenshot("Accounting-payment-delivery-review-recovered-after-draft-edit", {fullPage: true})
    }
})

feature("an unposted payment is cancelled through a retained review and a reader cannot perform treasury actions", {
    expect() {
        const page = paymentPage()
        const made = createManualPayment(page, "incoming", "7.00", "CANCEL-7")
        previewPaymentState(page, "Cancel payment", "CANCEL-7", "Duplicate receipt entry identified before delivery")
        confirmPaymentState(page)
        page.screenshot("Accounting-payment-cancelled", {fullPage: true})
        const reader = paymentPage("finance.ar", 390)
        reader.goto(paymentDetailRoute + "?organizationPartyId=BOSS_ACCT_ORG&paymentId=" + encodeURIComponent(made.paymentId))
            .status == 200
        reader.waitFor(() => document.querySelector(".m-record-header")?.innerText.includes("Payment customer"))
        !reader.text().includes("Edit draft")
        !reader.text().includes("Record delivery")
        !reader.text().includes("Void payment")
        !reader.text().includes("Capture payment")
        !reader.text().includes("Create refund")
        reader.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1) == true
        reader.screenshot("Accounting-payment-reader-phone", {fullPage: true})
    }
})

feature("a payment review retains its identity and refuses after another page edits the draft", {
    expect() {
        const page = paymentPage()
        const made = createManualPayment(page, "incoming", "9.00", "STALE-9")
        previewPaymentState(page, "Validate payment", "STALE-9", "Review before another draft edit")
        const reviewed = paymentConfirmationIdentity(page)
        const other = paymentPage()
        other.goto(paymentDetailRoute + "?organizationPartyId=BOSS_ACCT_ORG&paymentId=" + encodeURIComponent(made.paymentId))
            .status == 200
        other.locator(".m-record-actions .q-btn-dropdown").first().click()
        other.getByRole("button", {name: "Edit draft", exact: true}).click()
        const edit = other.getByRole("dialog")
        edit.locator('input[name="amount"]').fill("10.00")
        edit.getByRole("button", {name: "Save payment", exact: true}).click()
        other.waitFor(() => !document.querySelector('[role="dialog"]'))
        page.allowProblems(/notification: warning.*STALE_REVISION/)
        page.allowProblems(
            /^response: 500 Internal Server Error https?:\/\/[^/]+\/apps\/Accounting\/Payments\/PaymentDetail(?:\/Overview)?\/confirmPaymentState$/
        )
        page.getByRole("checkbox", {
            name: "I reviewed the payment, evidence, application and posting effects",
            exact: true
        }).click()
        page.evaluate(() => {
            window.confirm = () => true
            return true
        }) == true
        page.getByRole("button", {name: "Confirm payment change", exact: true}).click()
        page.waitFor(() => document.body.innerText.includes("STALE_REVISION"))
        JSON.stringify(paymentConfirmationIdentity(page)) == JSON.stringify(reviewed)
        !page.text().includes("Payment change completed")
        page.goto(page.url()).status == 200
        JSON.stringify(paymentConfirmationIdentity(page)) == JSON.stringify(reviewed)
        page.evaluate(() => document.querySelector('[id^="AccountingPaymentReviewSummary"]')?.innerText.includes("9.00")) == true
        page.screenshot("Accounting-payment-stale-review-retained", {fullPage: true})
        page.getByRole("link", {name: "Back to payment", exact: true}).click()
        page.waitFor(() => !new URL(location.href).searchParams.get("previewId"))
        paymentHeaderText(page).includes("Proposed")
        page.waitFor(() => document.querySelector('[id^="PaymentSummary_amount"][id$="_display"]')?.value.includes("10.00"))
        page.evaluate(() => document.querySelector('[id^="PaymentSummary_amount"][id$="_display"]')?.value.includes("10.00")) ==
            true
    }
})

feature("treasury selects a supporting receipt file before delivery and the retained retry keeps the same evidence and event", {
    expect() {
        const page = paymentPage()
        page.goto(paymentDetailRoute + "?organizationPartyId=BOSS_ACCT_ORG&paymentId=BOSS_ACCT_PAY_EVIDENCE_DRAFT").status == 200
        previewPaymentState(page, "Validate payment", "EVIDENCE-RECEIPT", "Receipt identity and amount checked")
        confirmPaymentState(page)
        page.getByRole("link", {name: "Back to payment", exact: true}).click()
        const dialog = openPaymentState(page, "Record delivery")
        dialog.locator('input[name="referenceNumber"]').fill("RECEIPT-EVIDENCE")
        dialog.locator('textarea[name="reason"]').fill("Cash receipt accompanied by signed supporting evidence")
        dialog.getByLabel("Supporting evidence (optional)", {exact: true}).click()
        dialog.getByLabel("Supporting evidence (optional)", {exact: true}).fill("Receipt")
        page.getByRole("option", {name: /Receipt\.txt/})
            .first()
            .click()
        closePaymentOptions(page)
        const selected = visiblePaymentFormFields(page, "previewPaymentState").evidenceTokenList
        assert(Array.isArray(selected), "The visible delivery form retains its actual selected evidence tokens")
        selected.length == 1
        selected[0].startsWith("BOSS_ACCT_PAY_EVIDENCE~")
        dialog.locator('input[name="referenceNumber"]').fill("")
        const firstAttempt = visiblePaymentFormFields(page, "previewPaymentState")
        page.allowProblems(/notification: warning.*PAYMENT_EVIDENCE_REQUIRED/)
        page.allowProblems(
            /^response: 500 Internal Server Error https?:\/\/[^/]+\/apps\/Accounting\/Payments\/PaymentDetail(?:\/Overview)?\/previewPaymentState$/
        )
        dialog.getByRole("button", {name: "Review payment change", exact: true}).click()
        page.waitFor(() => document.body.innerText.includes("PAYMENT_EVIDENCE_REQUIRED"))
        const refusedAttempt = visiblePaymentFormFields(page, "previewPaymentState")
        refusedAttempt.sourceVersion == firstAttempt.sourceVersion
        refusedAttempt.referenceNumber == firstAttempt.referenceNumber
        refusedAttempt.reason == firstAttempt.reason
        JSON.stringify(refusedAttempt.evidenceTokenList) == JSON.stringify(selected)
        dialog.locator('input[name="referenceNumber"]').fill("RECEIPT-EVIDENCE")
        dialog.getByRole("button", {name: "Review payment change", exact: true}).click()
        page.waitFor(() =>
            document.querySelector('[id^="PaymentReviewEvidence"][id$="_table"]')?.innerText.includes("Receipt.txt")
        )
        page.text().includes("Cash receipt accompanied by signed supporting evidence")
        page.screenshot("Accounting-payment-selected-evidence-review", {fullPage: true})
        confirmPaymentState(page)
        page.text().includes("Receipt.txt")
        const event = completedPaymentIdentity(page)
        page.getByRole("button", {name: "Check saved payment result", exact: true}).click()
        page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Payment change completed"))
        JSON.stringify(completedPaymentIdentity(page)) == JSON.stringify(event)
        page.text().includes("Receipt.txt")
        page.screenshot("Accounting-payment-selected-evidence-retried", {fullPage: true})
    }
})

feature(
    "treasury plus receivable authority releases selected applications before a reviewed void and retains exact retry results",
    {
        expect() {
            const correctionRoute =
                "/qapps/Accounting/Payments/PaymentDetail?organizationPartyId=BOSS_ACCT_ORG&paymentId=BOSS_ACCT_PAY_APPLIED"
            const treasury = paymentPage("finance.treasury")
            treasury.goto(correctionRoute).status == 200
            treasury.getByRole("tab", {name: "Applications", exact: true}).click()
            treasury.waitFor(() =>
                document.querySelector('[id^="PaymentApplications"][id$="_table"]')?.innerText.includes("BOSS_ACCT_PAY_INVOICE")
            )
            !treasury.text().includes("Release applications")

            const page = paymentPage("finance.paymentar")
            page.goto(correctionRoute).status == 200
            page.getByRole("tab", {name: "Applications", exact: true}).click()
            page.waitFor(() =>
                document.querySelector('[id^="PaymentApplications"][id$="_table"]')?.innerText.includes("BOSS_ACCT_PAY_INVOICE")
            )
            const applicationId = page.evaluate(() =>
                Array.from(document.querySelectorAll('[id^="PaymentApplications"][id$="_table"] .tr'))
                    .find(row => row.innerText.includes("BOSS_ACCT_PAY_INVOICE"))
                    ?.querySelector(".td")
                    ?.innerText.trim()
            )
            assert(!!applicationId, "The actual invoice application is visible before it is selected")
            page.getByRole("button", {name: "Release applications", exact: true}).click()
            const dialog = page.getByRole("dialog")
            dialog.getByLabel("Applications to release", {exact: true}).click()
            dialog.getByLabel("Applications to release", {exact: true}).fill(applicationId)
            page.getByRole("option", {name: new RegExp(applicationId)})
                .first()
                .click()
            closePaymentOptions(page)
            dialog.locator('textarea[name="reason"]').fill("Allocation belonged to the wrong invoice")
            const selected = visiblePaymentFormFields(page, "previewPaymentUnapply").applicationTokenList
            assert(
                Array.isArray(selected) && selected.length === 1 && selected[0].startsWith(applicationId + "~"),
                "The visible correction form submits the selected application with its reviewed revision"
            )
            dialog.getByRole("button", {name: "Review application correction", exact: true}).click()
            page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Reviewed payment change"))
            page.text().includes(applicationId)
            page.text().includes("Allocation belonged to the wrong invoice")
            const original = paymentConfirmationIdentity(page)
            page.goto(page.url()).status == 200
            JSON.stringify(paymentConfirmationIdentity(page)) == JSON.stringify(original)
            page.screenshot("Accounting-payment-application-release-review", {fullPage: true})
            paymentRetainedShots(page.url(), "unapply-reviewed", "finance.paymentar")
            confirmPaymentState(page, true)
            paymentRetainedShots(page.url(), "unapply-applied", "finance.paymentar")
            page.evaluate(
                id =>
                    Array.from(document.querySelectorAll('[id^="PaymentActualApplicationResults"][id$="_table"] .tr')).some(
                        row => row.innerText.includes(id) && row.innerText.includes("0.00")
                    ),
                applicationId
            ) == true
            const result = completedPaymentIdentity(page)
            page.getByRole("button", {name: "Check saved correction result", exact: true}).click()
            page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Application correction completed"))
            JSON.stringify(completedPaymentIdentity(page)) == JSON.stringify(result)
            page.getByRole("link", {name: "Back to payment", exact: true}).click()
            page.waitFor(() => !new URL(location.href).searchParams.get("previewId"))
            page.getByRole("tab", {name: "Applications", exact: true}).click()
            page.waitFor(() =>
                Array.from(document.querySelectorAll('[id^="PaymentApplications"][id$="_table"] .tr')).some(
                    row => row.innerText.includes("BOSS_ACCT_PAY_INVOICE") && row.innerText.includes("0.00")
                )
            )
            page.locator(".m-record-actions .q-btn-dropdown").first().click()
            page.getByRole("button", {name: "Void payment", exact: true}).click()
            const voidDialog = page.getByRole("dialog")
            voidDialog.locator('input[name="referenceNumber"]').fill("VOID-RECEIPT")
            voidDialog.locator('textarea[name="reason"]').fill("Cash receipt was duplicated; original applications released")
            voidDialog.getByRole("button", {name: "Review payment change", exact: true}).click()
            page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Reviewed payment change"))
            page.text().includes("Cash receipt was duplicated")
            confirmPaymentState(page)
            page.screenshot("Accounting-payment-applications-released-and-voided", {fullPage: true})
            page.getByRole("link", {name: "Back to payment", exact: true}).click()
            page.waitFor(() => /Void/.test(document.querySelector(".m-record-header")?.innerText || ""))
            !page.text().includes("Record delivery")
        }
    }
)
