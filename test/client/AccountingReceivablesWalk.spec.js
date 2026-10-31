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

function arPage() {
    const page = browser.newPage({user: "finance.ar", viewport: {width: 1280, height: 1000}, timeout: 30})
    page.allowProblems(/userPhoto\?userId=/)
    page.allowProblems(/Blocked script execution in 'about:srcdoc'.*sandboxed/)
    return page
}
function createReceivable(page, description) {
    assert(
        page.goto("/qapps/Accounting/Receivables/Invoices?organizationPartyId=BOSS_ACCT_ORG").status === 200,
        "Invoice list opens"
    )
    page.getByRole("button", {name: "New invoice", exact: true}).click()
    const dialog = page.getByRole("dialog")
    dialog.getByLabel("Customer", {exact: true}).click()
    page.getByRole("option", {name: "Another Company Making Everything", exact: true}).click()
    dialog.locator("input[name=description]").fill(description)
    dialog.getByRole("button", {name: "Create receivable", exact: true}).click()
    page.waitForURL(/recordId=/)
    return page.evaluate(() => new URL(location.href).searchParams.get("recordId"))
}
function addReceivableLine(page, description) {
    page.getByRole("tab", {name: "Items and taxes", exact: true}).click()
    page.getByRole("button", {name: "Add line", exact: true}).click()
    const dialog = page.getByRole("dialog")
    dialog.getByLabel("Line type", {exact: true}).click()
    dialog.getByLabel("Line type", {exact: true}).fill("Time")
    page.getByRole("option", {name: /^Time entry$|ItemTimeEntry/i})
        .first()
        .click()
    dialog.locator("input[name=description]").fill(description)
    dialog.locator("input[name=quantity]").fill("2")
    dialog.locator("input[name=amount]").fill("24.50")
    dialog.getByRole("button", {name: "Save line", exact: true}).click()
    page.waitFor(() => !document.querySelector("[role=dialog]"))
    page.waitFor(text => document.querySelector(".q-page")?.innerText.includes(text), {arg: description})
}
function sendInvoice(page, addresses) {
    invoiceHeaderAction(page, "Send invoice")
    const dialog = page.getByRole("dialog")
    dialog.locator("input[name=toAddresses]").fill(addresses)
    dialog.getByRole("button", {name: "Send invoice", exact: true}).click()
    page.waitFor(() => !document.querySelector("[role=dialog]"))
    page.waitFor(() => document.querySelector(".m-record-status")?.innerText.includes("Sent"))
    page.getByRole("tab", {name: "Overview", exact: true}).click()
    page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Delivery outcomes"))
}
// The Delivery outcomes rows of a recipient, as their text: recipient, sent date, outcome, failure and files.
function deliveryRows(page, recipient) {
    return page.evaluate(
        recipient =>
            Array.from(document.querySelectorAll('[id^="InvoiceDeliveries"][id$="_table"] .tr'))
                .map(row => row.innerText.replace(/\s+/g, " ").trim())
                .filter(text => text.includes(recipient)),
        recipient
    )
}

// One pass through the live client: the new-invoice and line dialogs post, the header's finalize and send actions
// work, a bad recipient is reported beside the good one, and each send is a row of who it went to and when. Batches,
// supporting files, currency refusal, billing from time and reader access are AccountingReceivables (mr-boss) and
// mr-mantle's AccountingReceivables specs.
feature("an AR user creates, finalizes and sends an invoice without a store", {
    expect() {
        const page = arPage()
        createReceivable(page, "Browser customer services " + Date.now())
        addReceivableLine(page, "Browser invoice service")
        page.text().includes("49.00")
        page.evaluate(() => {
            window.confirm = () => true
            return true
        }) == true
        page.getByRole("button", {name: "Finalize invoice", exact: true}).click()
        page.waitFor(() => document.querySelector(".m-record-status")?.innerText.includes("Finalized"))
        const recipient = "accounting.customer@example.test"
        sendInvoice(page, recipient + ",bad-address")
        page.text().includes("Invalid recipient address")
        // the deliveries show who was sent to and when, not a mail id
        const header = page.evaluate(
            () => document.querySelector('[id^="InvoiceDeliveries"][id$="_table"] .tr')?.innerText.replace(/\s+/g, " ") || ""
        )
        header.includes("Recipient") && header.includes("Sent")
        !page.text().includes("Mail reference")
        page.waitFor(recipient => document.querySelector('[id^="InvoiceDeliveries"][id$="_table"]')?.innerText.includes(recipient), {
            arg: recipient
        })
        const first = deliveryRows(page, recipient)
        first.length == 1
        /Queued for delivery|Sent/.test(first[0])
        // the finalize sent to the customer's billing address: its row has the sent date
        page.waitFor(() =>
            /billing\.acme@test\.com \d{4}-\d{2}-\d{2}/.test(
                document.querySelector('[id^="InvoiceDeliveries"][id$="_table"]')?.innerText.replace(/\s+/g, " ")
            )
        )
        // sending again from the reloaded dialog is a new send: a second mail to the recipient, the first one kept
        sendInvoice(page, recipient + ",bad-address")
        page.waitFor(
            recipient =>
                Array.from(document.querySelectorAll('[id^="InvoiceDeliveries"][id$="_table"] .tr')).filter(row =>
                    row.innerText.includes(recipient)
                ).length == 2,
            {arg: recipient}
        )
        deliveryRows(page, recipient).length == 2
        deliveryRows(page, recipient).includes(first[0])
    }
})
