// Run send walks with mail_capture_sends=true (docs/Build-Test.md). Retained recipient rows distinguish captured sends from queued transport.
function invoiceHeaderAction(page, label) {
    page.evaluate(label => {
        const actions = document.querySelector(".m-record-header .m-record-actions")
        const target = Array.from(actions.querySelectorAll("button,a")).find(button => button.innerText.trim().endsWith(label))
        if (target) target.click()
        else
            Array.from(actions.querySelectorAll("button"))
                .find(button => /More/.test(button.innerText))
                .click()
        return !!target
    }, label)
    const openMenu = page.evaluate(() => !!document.querySelector(".q-menu"))
    if (openMenu) {
        page.evaluate(label => {
            Array.from(document.querySelectorAll(".q-menu button,.q-menu a"))
                .find(button => button.innerText.trim().endsWith(label))
                .click()
            return true
        }, label) == true
    }
}

function arPage(width = 1280) {
    const page = browser.newPage({user: "finance.ar", viewport: {width, height: 1000}, timeout: 30})
    page.allowProblems(/userPhoto\?userId=/)
    page.allowProblems(/Blocked script execution in 'about:srcdoc'.*sandboxed/)
    return page
}
function createReceivable(page, description, currency) {
    assert(
        page.goto("/qapps/Accounting/Receivables/Invoices?organizationPartyId=BOSS_ACCT_ORG").status === 200,
        "Invoice list opens"
    )
    page.getByRole("button", {name: "New invoice", exact: true}).click()
    const dialog = page.getByRole("dialog")
    dialog.getByLabel("Customer", {exact: true}).click()
    page.getByRole("option", {name: "Another Company Making Everything", exact: true}).click()
    if (currency) {
        dialog.getByLabel("Currency", {exact: true}).click()
        dialog.getByLabel("Currency", {exact: true}).fill(currency)
        page.getByRole("option", {name: /Euro|EUR/})
            .first()
            .click()
    }
    dialog.locator("input[name=description]").fill(description)
    dialog.getByRole("button", {name: "Create receivable", exact: true}).click()
    page.waitForURL(/recordId=/)
    return page.evaluate(() => new URL(location.href).searchParams.get("recordId"))
}
function addReceivableLine(page, description, amount = "24.50", quantity = "2") {
    page.getByRole("tab", {name: "Items and taxes", exact: true}).click()
    page.getByRole("button", {name: "Add line", exact: true}).click()
    const dialog = page.getByRole("dialog")
    dialog.getByLabel("Line type", {exact: true}).click()
    dialog.getByLabel("Line type", {exact: true}).fill("Time")
    page.getByRole("option", {name: /^Time entry$|ItemTimeEntry/i})
        .first()
        .click()
    dialog.locator("input[name=description]").fill(description)
    dialog.locator("input[name=quantity]").fill(quantity)
    dialog.locator("input[name=amount]").fill(amount)
    dialog.getByRole("button", {name: "Save line", exact: true}).click()
    page.waitFor(() => !document.querySelector("[role=dialog]"))
    page.waitFor(text => document.querySelector(".q-page")?.innerText.includes(text), {arg: description})
}
function sendInvoice(page, addresses, draft = false) {
    invoiceHeaderAction(page, draft ? "Finalize and send" : "Send invoice")
    const dialog = page.getByRole("dialog")
    dialog.locator("input[name=toAddresses]").fill(addresses)
    dialog.getByRole("button", {name: "Send invoice", exact: true}).click()
    page.waitFor(() => !document.querySelector("[role=dialog]"))
    page.waitFor(() => document.querySelector(".m-record-status")?.innerText.includes("Sent"))
    page.getByRole("tab", {name: "Overview", exact: true}).click()
    page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Delivery outcomes"))
}
function mailReferences(page, recipient) {
    return page.evaluate(
        recipient =>
            Array.from(document.querySelectorAll(".tr"))
                .filter(row => row.innerText.includes(recipient))
                .map(row => row.querySelector(".text-mono")?.innerText.trim())
                .filter(Boolean),
        recipient
    )
}
feature("an AR user creates, finalizes and sends an invoice without a store", {
    expect() {
        const page = arPage()
        const name = "Browser customer services " + Date.now()
        const invoiceId = createReceivable(page, name)
        !!invoiceId
        addReceivableLine(page, "Browser invoice service")
        page.text().includes("49.00")
        page.screenshot("Accounting-receivable-draft", {fullPage: true})
        page.evaluate(() => {
            window.confirm = () => true
            return true
        }) == true
        page.getByRole("button", {name: "Finalize invoice", exact: true}).click()
        page.waitFor(() => document.querySelector(".m-record-status")?.innerText.includes("Finalized"))
        page.screenshot("Accounting-receivable-finalized", {fullPage: true})
        const recipient = "accounting.customer@example.test"
        sendInvoice(page, recipient + ",bad-address")
        page.text().includes("Invalid recipient address")
        page.text().includes("bad-address")
        const firstReferences = mailReferences(page, recipient)
        firstReferences.length == 1
        page.screenshot("Accounting-receivable-recipient-failure", {fullPage: true})
        sendInvoice(page, recipient + ",bad-address")
        page.waitFor(
            recipient =>
                Array.from(document.querySelectorAll(".tr")).filter(
                    row => row.innerText.includes(recipient) && row.querySelector(".text-mono")?.innerText.trim()
                ).length >= 2,
            {arg: recipient}
        )
        const replayReferences = mailReferences(page, recipient)
        new Set(replayReferences).size == 1
        replayReferences[0] == firstReferences[0]
        !/Error rendering|Exception in render/.test(page.text())
        page.screenshot("Accounting-receivable-retry-same-mail", {fullPage: true})
        page.evaluate(() => {
            document.querySelector('.m-record-title a[href*="Customer360"]').click()
            return true
        }) == true
        page.waitForURL(/Customer360/)
        page.getByRole("tab", {name: "Invoices and payments", exact: true}).click()
        page.waitFor(text => document.querySelector(".q-page")?.innerText.includes(text), {arg: name})
        page.text().includes(name)
        !page.text().includes("Add bank account")
        page.screenshot("Accounting-customer-money", {fullPage: true})
        page.getByRole("link", {name: "Customer statement", exact: true}).click()
        page.waitForURL(/Receivables\/Statements/)
        page.getByRole("button", {name: "Preview statements", exact: true}).click()
        page.waitForURL(/snapshotId=/)
        page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Reviewed statement snapshot"))
        page.text().includes(invoiceId)
        page.screenshot("Accounting-customer-statement-preview", {fullPage: true})
    }
})

feature("a finance reader sees invoice items and customer money without financial editing controls", {
    expect() {
        const page = browser.newPage({user: "finance.read", viewport: {width: 390, height: 900}, timeout: 30})
        page.allowProblems(/userPhoto\?userId=/)
        page.goto(
            "/qapps/Accounting/Receivables/InvoiceDetail/Items?recordId=BOSS_ACCT_INVOICE&organizationPartyId=BOSS_ACCT_ORG"
        ).status == 200
        page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Accounting demo services"))
        !page.text().includes("Add line")
        !page.text().includes("Finalize invoice")
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth) == true
        page.screenshot("Accounting-reader-receivable-items-phone", {fullPage: true})
        page.goto(
            "/qapps/Accounting/Receivables/Customer360/FinanceDetails?customerPartyId=ORG_ACME&organizationPartyId=BOSS_ACCT_ORG"
        ).status == 200
        page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Finance details"))
        !page.text().includes("Add bank account")
        !page.text().includes("Add tax registration")
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth) == true
        page.screenshot("Accounting-reader-customer-finance-phone", {fullPage: true})
    }
})

feature("a reviewed invoice batch names a bad recipient, sends the others and replays without new mail", {
    expect() {
        const page = arPage()
        const prefix = "Browser receivable batch " + Date.now()
        const invoiceIds = []
        for (const suffix of ["A", "B"]) {
            invoiceIds.push(createReceivable(page, prefix + " " + suffix))
            addReceivableLine(page, "Batch consulting " + suffix, "25", "1")
        }
        page.goto("/qapps/Accounting/Receivables/Invoices?organizationPartyId=BOSS_ACCT_ORG&text=" + encodeURIComponent(prefix))
            .status == 200
        page.evaluate(invoiceIds => {
            for (const invoiceId of invoiceIds) {
                const row = Array.from(document.querySelectorAll(".tr")).find(row =>
                    row.querySelector('a[href*="recordId=' + encodeURIComponent(invoiceId) + '"]')
                )
                row.querySelector("[role=checkbox]").click()
            }
            return true
        }, invoiceIds) == true
        page.evaluate(() => {
            Array.from(document.querySelectorAll(".q-page button"))
                .find(button => button.innerText.includes("more_vert"))
                .click()
            return true
        }) == true
        page.waitFor(() =>
            Array.from(document.querySelectorAll(".q-menu button,.q-menu a")).some(button =>
                button.innerText.trim().endsWith("Review selected invoices")
            )
        )
        page.evaluate(() => {
            Array.from(document.querySelectorAll(".q-menu button,.q-menu a"))
                .find(button => button.innerText.trim().endsWith("Review selected invoices"))
                .click()
            return true
        }) == true
        page.getByRole("dialog").getByRole("button", {name: "Review selected invoices", exact: true}).click()
        page.waitForURL(/InvoiceBatch/)
        const recipient = "accounting.batch@example.test"
        page.fill("input[name=toAddresses]", recipient + ",bad-address")
        page.getByRole("checkbox", {name: "I reviewed the selected invoices and recipients", exact: true}).click()
        page.evaluate(() => {
            window.confirm = () => true
            return true
        }) == true
        page.getByRole("button", {name: "Process reviewed invoices", exact: true}).click()
        page.waitFor(
            () =>
                document.querySelector(".q-page")?.innerText.includes("Invoice results") &&
                document.querySelector(".q-page")?.innerText.includes("Invalid recipient address")
        )
        page.text().includes("bad-address")
        const originalMail = mailReferences(page, recipient)
        originalMail.length == 2
        new Set(originalMail).size == 2
        page.screenshot("Accounting-invoice-batch-recipient-results", {fullPage: true})
        const review = page.getByRole("checkbox", {name: "I reviewed the selected invoices and recipients", exact: true})
        if (review.attribute("aria-checked") !== "true") review.click()
        page.getByRole("button", {name: "Process reviewed invoices", exact: true}).click()
        page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Invoice results"))
        const replayedMail = mailReferences(page, recipient)
        JSON.stringify(replayedMail.sort()) == JSON.stringify(originalMail.sort())
        !page.text().includes("Operation key was used for another request")
        page.screenshot("Accounting-invoice-batch-replayed", {fullPage: true})
    }
})

feature("finalizing and sending a store invoice keeps one mail reference when sent again", {
    expect() {
        const page = arPage()
        page.goto("/qapps/Accounting/Receivables/InvoiceDetail?recordId=BOSS_ACCT_STORE_DRAFT&organizationPartyId=BOSS_ACCT_ORG")
            .status == 200
        page.waitFor(() => document.querySelector(".m-record-title")?.innerText.includes("BOSS_ACCT_STORE_DRAFT"))
        const recipient = "accounting.store@example.test"
        sendInvoice(page, recipient, true)
        const first = mailReferences(page, recipient)
        first.length == 1
        sendInvoice(page, recipient)
        page.waitFor(
            recipient =>
                Array.from(document.querySelectorAll(".tr")).filter(
                    row => row.innerText.includes(recipient) && row.querySelector(".text-mono")?.innerText.trim()
                ).length >= 2,
            {arg: recipient}
        )
        const repeated = mailReferences(page, recipient)
        new Set(repeated).size == 1
        repeated[0] == first[0]
        page.screenshot("Accounting-store-invoice-single-mail-reference", {fullPage: true})
    }
})

feature("AR explicitly selects a supporting file and a same-key retry keeps the sent files and mail reference", {
    expect() {
        const page = arPage()
        page.goto("/qapps/Accounting/Receivables/InvoiceDetail?recordId=BOSS_ACCT_AR_FINALIZED&organizationPartyId=BOSS_ACCT_ORG")
            .status == 200
        const recipient = "accounting.supporting@example.test"
        let reviewed
        for (let attempt = 0; attempt < 2; attempt++) {
            invoiceHeaderAction(page, "Send invoice")
            const dialog = page.getByRole("dialog")
            dialog.locator("input[name=toAddresses]").fill(recipient)
            dialog.getByLabel("Supporting files", {exact: true}).click()
            dialog.getByLabel("Supporting files", {exact: true}).fill("Scope")
            page.getByRole("option", {name: /Approved service scope.*Scope\.txt/}).click()
            page.keyboard.press("Escape")
            const selection = page.evaluate(previous => {
                const form = window.moqui.screenForms.find(
                    form => form.fields && "reviewedAttachmentList" in form.fields && form.$el.closest("[role=dialog]")
                )
                // Reuse the first submitted key to exercise a network retry of the identical reviewed request.
                if (previous) form.fields.operationKey = previous.operationKey
                return {
                    operationKey: form.fields.operationKey,
                    reviewedAttachmentList: form.fields.reviewedAttachmentList
                }
            }, reviewed || null)
            selection.reviewedAttachmentList.length == 1
            selection.reviewedAttachmentList[0].startsWith("BOSS_ACCT_AR_SUPPORT~")
            if (reviewed) {
                selection.operationKey == reviewed.operationKey
                JSON.stringify(selection.reviewedAttachmentList) == JSON.stringify(reviewed.reviewedAttachmentList)
            } else reviewed = selection
            dialog.getByRole("button", {name: "Send invoice", exact: true}).click()
            page.waitFor(() => !document.querySelector("[role=dialog]"))
            page.getByRole("tab", {name: "Overview", exact: true}).click()
            page.waitFor(
                recipient =>
                    Array.from(document.querySelectorAll(".tr")).some(
                        row => row.innerText.includes(recipient) && row.innerText.includes("Scope.txt")
                    ),
                {arg: recipient}
            )
            page.text().includes("Invoice-BOSS_ACCT_AR_FINALIZED.pdf")
            const references = mailReferences(page, recipient)
            references.length == 1
            if (attempt === 0) reviewed.mailReference = references[0]
            else references[0] == reviewed.mailReference
        }
        page.screenshot("Accounting-invoice-selected-supporting-file-retried", {fullPage: true})
    }
})

feature("a foreign-currency invoice remains a draft when AR attempts to finalize it", {
    expect() {
        const page = arPage()
        page.allowProblems(/invoice currency must match|base currency/)
        page.allowProblems(
            /^response: 500 Internal Server Error https?:\/\/[^/]+\/apps\/Accounting\/Receivables\/InvoiceDetail\/financeChangeStatus$/
        )
        const invoiceId = createReceivable(page, "Browser foreign invoice " + Date.now(), "EUR")
        !!invoiceId
        addReceivableLine(page, "Foreign consulting", "25", "1")
        page.evaluate(() => {
            window.confirm = () => true
            return true
        }) == true
        page.getByRole("button", {name: "Finalize invoice", exact: true}).click()
        page.waitFor(() => document.body.innerText.includes("base currency"))
        page.text().includes("base currency")
        !page.evaluate(() => document.querySelector(".m-record-status")?.innerText.includes("Finalized"))
        page.getByRole("button", {name: "Add line", exact: true}).isVisible()
        page.screenshot("Accounting-foreign-invoice-refused", {fullPage: true})
    }
})

feature("AR bills approved project time from Accounting and the billed source leaves the queue", {
    expect() {
        const page = arPage()
        const queue =
            "/qapps/Accounting/Receivables/BillingQueue?organizationPartyId=BOSS_ACCT_ORG&workEffortId=BOSS_ACCT_PROJECT"
        page.goto(queue).status == 200
        page.waitFor(() =>
            Array.from(document.querySelectorAll(".tr")).some(
                row =>
                    row.innerText.includes("Accounting customer consulting") &&
                    Array.from(row.querySelectorAll("button")).some(button =>
                        button.innerText.trim().endsWith("Create draft invoice")
                    )
            )
        )
        page.evaluate(() => {
            const row = Array.from(document.querySelectorAll(".tr")).find(
                row =>
                    row.innerText.includes("Accounting customer consulting") &&
                    Array.from(row.querySelectorAll("button")).some(button =>
                        button.innerText.trim().endsWith("Create draft invoice")
                    )
            )
            Array.from(row.querySelectorAll("button"))
                .find(button => button.innerText.trim().endsWith("Create draft invoice"))
                .click()
            return true
        }) == true
        page.getByRole("dialog").getByRole("button", {name: "Create draft invoice", exact: true}).click()
        page.waitForURL(/recordId=/)
        page.getByRole("tab", {name: "Items and taxes", exact: true}).click()
        page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("85.00"))
        page.text().includes("85.00")
        page.screenshot("Accounting-approved-time-invoice", {fullPage: true})
        page.goto(queue).status == 200
        page.waitFor(() =>
            document.querySelector(".q-page")?.innerText.includes("No approved unbilled work matches these filters")
        )
        !page.text().includes("Create draft invoice")
        page.screenshot("Accounting-approved-time-billed-once", {fullPage: true})
    }
})
