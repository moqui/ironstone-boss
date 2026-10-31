const settlementRoute = "/qapps/Accounting/Receivables/ReceivablesWorkbench"
const settlementCustomer = "BOSS_ACCT_STL_CUSTOMER"
function settlementPage(user = "finance.ar", width = 1280) {
    const page = browser.newPage({user, viewport: {width, height: 1000}, timeout: 30})
    page.allowProblems(/userPhoto\?userId=/)
    return page
}
function closeSettlementOptions(page) {
    page.settle()
    if (
        page.evaluate(() =>
            Array.from(document.querySelectorAll(".q-menu")).some(
                menu => menu.getClientRects().length && getComputedStyle(menu).visibility !== "hidden"
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
function openSettlement(page) {
    page.goto(settlementRoute + "?organizationPartyId=BOSS_ACCT_ORG").status == 200
    page.getByLabel("Customer", {exact: true}).click()
    page.getByLabel("Customer", {exact: true}).fill("Settlement customer")
    page.getByRole("option", {name: "Settlement customer", exact: true}).click()
    closeSettlementOptions(page)
    page.getByRole("button", {name: "Find open items", exact: true}).click()
    page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Available receipts and credits"))
}
function chooseSettlementItem(page, dialog, field, id) {
    dialog.getByLabel(field, {exact: true}).click()
    dialog.getByLabel(field, {exact: true}).fill(id)
    page.getByRole("option", {name: new RegExp(id)})
        .first()
        .click()
    closeSettlementOptions(page)
}
function addAllocation(page, source, target, amount) {
    page.getByRole("button", {name: "Add allocation", exact: true}).click()
    const dialog = page.getByRole("dialog")
    chooseSettlementItem(page, dialog, "Receipt or credit", source)
    chooseSettlementItem(page, dialog, "Invoice or payment", target)
    dialog.locator("input[name=amount]").fill(amount)
    dialog.getByRole("button", {name: "Add allocation", exact: true}).click()
    page.waitFor(() => !document.querySelector("[role=dialog]"))
    page.waitFor(value => document.querySelector('[id^="SettlementAllocations"][id$="_table"]')?.innerText.includes(value), {
        arg: source
    })
}
function previewSettlement(page) {
    page.getByRole("button", {name: "Preview settlement", exact: true}).click()
    page.waitForURL(/\/SettlementReview\?/)
    page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Settlement for Settlement customer"))
}
function confirmSettlement(page) {
    page.evaluate(() => {
        window.confirm = () => true
        return true
    }) == true
    page.getByRole("button", {name: "Confirm settlement", exact: true}).click()
}
function applicationReferences(page) {
    return page.evaluate(() =>
        Array.from(document.querySelectorAll('[id^="SettlementApplicationResults"][id$="_table"] .text-mono'))
            .map(element => element.innerText.trim())
            .filter(Boolean)
    )
}
function confirmationIdentity(page) {
    page.waitFor(() =>
        window.moqui.screenForms.some(
            form => form.fields?.previewId && form.fields?.inputFingerprint && /\/confirmSettlement$/.test(form.action)
        )
    )
    return JSON.parse(
        page.evaluate(() => {
            const form = window.moqui.screenForms.find(
                form => form.fields?.previewId && form.fields?.inputFingerprint && /\/confirmSettlement$/.test(form.action)
            )
            return JSON.stringify({
                previewId: form.fields.previewId,
                inputFingerprint: form.fields.inputFingerprint,
                operationKey: form.fields.operationKey
            })
        })
    )
}
function rowText(page, table, id) {
    return page.evaluate(
        ({table, id}) =>
            Array.from(document.querySelectorAll('[id^="' + table + '"][id$="_table"] .tr')).find(row =>
                row.innerText.includes(id)
            )?.innerText || "",
        {table, id}
    )
}

// One pass through the live client: the workbench's dialogs post the allocations, the reviewed identity survives a
// reload, and the saved result is checked again without another application. The settlement rules themselves are
// AccountingSettlement (mr-boss) and mr-mantle's AccountingSettlement specs.
feature("AR reviews a partial receipt and credit together and retries the saved settlement without another application", {
    expect() {
        const page = settlementPage()
        openSettlement(page)
        addAllocation(page, "BOSS_ACCT_STL_RECEIPT60", "BOSS_ACCT_STL_INV100", "60")
        addAllocation(page, "BOSS_ACCT_STL_CREDIT25", "BOSS_ACCT_STL_INV100", "25")
        previewSettlement(page)
        rowText(page, "SettlementReviewBalances", "BOSS_ACCT_STL_INV100").includes("15.00")
        const reviewedIdentity = confirmationIdentity(page)
        page.goto(page.url()).status == 200
        JSON.stringify(confirmationIdentity(page)) == JSON.stringify(reviewedIdentity)
        confirmSettlement(page)
        page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Settlement applied"))
        const original = applicationReferences(page)
        original.length == 2
        rowText(page, "SettlementRemainingResults", "BOSS_ACCT_STL_INV100").includes("15.00")
        page.getByRole("button", {name: "Check saved result", exact: true}).click()
        page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Settlement applied"))
        JSON.stringify(applicationReferences(page).sort()) == JSON.stringify(original.sort())
    }
})
