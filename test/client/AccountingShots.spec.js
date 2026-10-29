// Every P0–P3 destination, all required widths and both themes, from one table.
const destinations = [
    ["Home", "Home"],
    ["Invoices", "Receivables/Invoices"],
    ["Invoice", "Receivables/InvoiceDetail?recordId=BOSS_ACCT_INVOICE"],
    ["Bills", "Payables/Bills"],
    ["Bill", "Payables/BillDetail?recordId=BOSS_ACCT_BILL"],
    ["Payments", "Payments/Payments"],
    ["Payment", "Payments/PaymentDetail?recordId=BOSS_ACCT_PAYMENT"],
    ["Chart", "GeneralLedger/ChartOfAccounts"],
    ["Account", "GeneralLedger/AccountDetail?recordId=111100000"],
    ["Journals", "GeneralLedger/JournalEntries"],
    ["Draft", "GeneralLedger/JournalEntryDetail?recordId=BOSS_ACCT_ENTRY"],
    ["Posted", "GeneralLedger/JournalEntryDetail?recordId=BOSS_ACCT_POSTED"],
    ["Lines", "GeneralLedger/TransactionEntries"],
    ["Batches", "GeneralLedger/JournalBatches"],
    ["Templates", "GeneralLedger/JournalTemplates"],
    ["Periods", "PeriodClose/Periods"],
    ["Locks", "PeriodClose/PeriodLocks"],
    ["Reports", "Reports/Reports"],
    ["TrialBalance", "Reports/TrialBalance"],
    ["Ledger", "Reports/GeneralLedger"],
    ["Settings", "Settings/Settings"],
    ...[
        "AccountingPreferences",
        "PostingDefaults",
        "PaymentTerms",
        "Currencies",
        "PaymentMethods",
        "DocumentSettings",
    ].map((n) => [n, "Settings/" + n]),
    ...["NewInvoice", "NewBill", "NewPayment", "NewEntry"].map((n) => [
        n,
        "QuickCreate/" + n,
    ]),
]
const cases = destinations.flatMap(([name, path]) =>
    [390, 1280, 1440].flatMap((width) =>
        [false, true].map((dark) => ({ name, path, width, dark })),
    ),
)
let pages = {}
spec({
    setupSpec() {
        for (const width of [390, 1280, 1440]) {
            pages[width] = browser.newPage({
                user: "finance.admin",
                viewport: { width, height: 900 },
                timeout: 30,
            })
            pages[width].allowProblems(/userPhoto\?userId=/)
            pages[width].allowProblems(
                /Blocked script execution in 'about:srcdoc'.*sandboxed/,
            )
        }
    },
})
feature("Accounting #name at #width dark=#dark", {
    where: cases.filter(
        (item) => !params.names || params.names.split(",").includes(item.name),
    ),
    expect({ name, path, width, dark }) {
        const page = pages[width]
        page.goto(
            "/qapps/Accounting/" +
                path +
                (path.includes("?") ? "&" : "?") +
                "organizationPartyId=ORG_ZIZI_CORP",
        ).status == 200
        page.waitFor(
            () => !!document.querySelector(".q-page")?.innerText.trim(),
        )
        page.settle()
        page.evaluate((dark) => {
            document
                .querySelector("#apps-root")
                .__vue_app__.config.globalProperties.$q.dark.set(!!dark)
            return true
        }, dark) == true
        page.waitFor(
            (dark) => document.body.classList.contains("body--dark") === dark,
            { arg: dark },
        )
        !/Error rendering|Exception in render|is not written yet/.test(
            page.text(),
        )
        if (["Invoice", "Bill"].includes(name)) {
            page.waitFor(() =>
                /Invoice date\s+\d{4}-\d{2}-\d{2}/.test(
                    document.querySelector(".q-page")?.innerText || "",
                ),
            )
            assert.ok(/Invoice date\s+\d{4}-\d{2}-\d{2}/.test(page.text()))
            assert.ok(/\$[\d,]+\.\d{2}/.test(page.text()))
        }
        page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
        ) == true
        page.screenshot(
            "Accounting-" + name + "-" + width + (dark ? "-dark" : "-light"),
            { fullPage: true },
        )
    },
})
