// Every P0–P3 destination at every required width in both themes, from one table: groups of a user, a screenshot
// prefix and its pages; each page names a text it shows, so a page that renders but is wrong fails.
const adminPages = [
    ["Home", "Home", "Shortcuts"],
    ["Invoices", "Receivables/Invoices", "Accounting demo customer invoice"],
    ["Invoice", "Receivables/InvoiceDetail?recordId=BOSS_ACCT_INVOICE", "Accounting demo customer invoice"],
    ["Bills", "Payables/Bills", "Accounting demo supplier bill"],
    ["Bill", "Payables/BillDetail?recordId=BOSS_ACCT_BILL", "Accounting demo supplier bill"],
    ["Payments", "Payments/Payments", "Accounting demo proposed payment"],
    ["Payment", "Payments/PaymentDetail?recordId=BOSS_ACCT_PAYMENT", "Accounting demo proposed payment"],
    ["Chart", "GeneralLedger/ChartOfAccounts", "Chart of accounts"],
    ["Account", "GeneralLedger/AccountDetail?recordId=111100000", "Open account ledger"],
    ["Journals", "GeneralLedger/JournalEntries", "Office expense review"],
    ["Draft", "GeneralLedger/JournalEntryDetail?recordId=BOSS_ACCT_ENTRY", "Review posting"],
    ["Posted", "GeneralLedger/JournalEntryDetail?recordId=BOSS_ACCT_POSTED", "Posted office expense"],
    ["Lines", "GeneralLedger/TransactionEntries", "Office expense review"],
    ["Batches", "GeneralLedger/JournalBatches", "New journal batch"],
    ["Templates", "GeneralLedger/JournalTemplates", "New journal template"],
    ["Periods", "PeriodClose/Periods", "Generate periods"],
    ["Locks", "PeriodClose/PeriodLocks", "Add posting lock"],
    ["Reports", "Reports/Reports", "Open trial balance"],
    ["TrialBalance", "Reports/TrialBalance", "Run report"],
    ["Ledger", "Reports/GeneralLedger", "Run report"],
    ["Settings", "Settings/Settings", "Accounting settings"],
    ["AccountingPreferences", "Settings/AccountingPreferences", "Save preferences"],
    ["PostingDefaults", "Settings/PostingDefaults", "Add mapping"],
    ["PaymentTerms", "Settings/PaymentTerms", "New due term"],
    ["Currencies", "Settings/Currencies", "Add exchange rate"],
    ["PaymentMethods", "Settings/PaymentMethods", "New payment method"],
    ["DocumentSettings", "Settings/DocumentSettings", "Invoice preview"],
    ["NewInvoice", "QuickCreate/NewInvoice", "Create draft invoice"],
    ["NewBill", "QuickCreate/NewBill", "Create draft bill"],
    ["NewPayment", "QuickCreate/NewPayment", "Create draft payment"],
    ["NewEntry", "QuickCreate/NewEntry", "Create draft entry"]
]
const groups = [
    {user: "finance.admin", prefix: "Accounting", pages: adminPages},
    {
        user: "finance.read",
        prefix: "Accounting-reader",
        pages: [
            ["Home", "Home", "Trial balance"],
            ["Invoice", "Receivables/InvoiceDetail?recordId=BOSS_ACCT_INVOICE", "Accounting demo customer invoice"],
            ["Posted", "GeneralLedger/JournalEntryDetail?recordId=BOSS_ACCT_POSTED", "Posted office expense"],
            ["Account", "GeneralLedger/AccountDetail?recordId=111100000", "Open account ledger"]
        ]
    },
    {
        user: "finance.ap",
        prefix: "Accounting-ap",
        pages: [
            ["Home", "Home", "New bill"],
            ["Bills", "Payables/Bills", "Accounting demo supplier bill"],
            ["Bill", "Payables/BillDetail?recordId=BOSS_ACCT_BILL", "Accounting demo supplier bill"]
        ]
    }
]
const widths = [390, 1280, 1440]
const cases = groups.flatMap(({user, prefix, pages}) =>
    pages.flatMap(([name, path, text]) =>
        widths.flatMap(width => [false, true].map(dark => ({user, prefix, name, path, text, width, dark})))
    )
)
let pages = {}
spec({
    setupSpec() {
        for (const {user} of groups)
            for (const width of widths) {
                const page = browser.newPage({user, viewport: {width, height: 900}, timeout: 30})
                page.allowProblems(/userPhoto\?userId=/)
                page.allowProblems(/Blocked script execution in 'about:srcdoc'.*sandboxed/)
                pages[user + width] = page
            }
    }
})
feature("#prefix #name at #width dark=#dark", {
    where: cases.filter(item => !params.names || params.names.split(",").includes(item.name)),
    expect({user, prefix, name, path, text, width, dark}) {
        const page = pages[user + width]
        page.goto("/qapps/Accounting/" + path + (path.includes("?") ? "&" : "?") + "organizationPartyId=BOSS_ACCT_ORG").status ==
            200
        page.waitFor(text => !!document.querySelector(".q-page")?.innerText.includes(text), {arg: text})
        page.settle()
        page.evaluate(dark => {
            document.querySelector("#apps-root").__vue_app__.config.globalProperties.$q.dark.set(!!dark)
            return true
        }, dark) == true
        page.waitFor(dark => document.body.classList.contains("body--dark") === dark, {arg: dark})
        !/Error rendering|Exception in render|not available in Accounting yet|Not available/.test(page.text())
        page.text().includes(text)
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth) == true
        page.screenshot(prefix + "-" + name + "-" + width + (dark ? "-dark" : "-light"), {fullPage: true})
    }
})
