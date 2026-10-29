const root = "component://webroot/screen/webroot.xml"
function finance(user, run) {
    login(user)
    const disabled = ec.artifactExecution.authzDisabled()
    ec.artifactExecution.enableAuthz()
    try {
        return run()
    } finally {
        ec.message.clearErrors()
        if (disabled) ec.artifactExecution.disableAuthz()
        login("john.doe")
    }
}
const roles = [
    {
        role: "ar",
        sections: ["Receivables", "Payments"],
        create: ["accountingNewInvoice"],
    },
    {
        role: "ap",
        sections: ["Payables", "Payments"],
        create: ["accountingNewBill"],
    },
    { role: "match", sections: [], create: [] },
    {
        role: "treasury",
        sections: ["Payments"],
        create: ["accountingNewPayment"],
    },
    {
        role: "gl",
        sections: [
            "Receivables",
            "Payables",
            "Payments",
            "GeneralLedger",
            "PeriodClose",
            "Reports",
        ],
        create: ["accountingNewEntry"],
    },
    { role: "tax", sections: [], create: [] },
    {
        role: "read",
        sections: [
            "Receivables",
            "Payables",
            "Payments",
            "GeneralLedger",
            "Reports",
        ],
        create: [],
    },
    {
        role: "approve",
        sections: [
            "Receivables",
            "Payables",
            "Payments",
            "GeneralLedger",
            "PeriodClose",
            "Reports",
        ],
        create: [],
    },
    {
        role: "admin",
        sections: [
            "Receivables",
            "Payables",
            "Payments",
            "GeneralLedger",
            "PeriodClose",
            "Reports",
            "Settings",
        ],
        create: [
            "accountingNewInvoice",
            "accountingNewBill",
            "accountingNewPayment",
            "accountingNewEntry",
        ],
    },
]
feature("Accounting menu and quick create follow the #role grants", {
    where: roles,
    when({ role }) {
        return finance("finance." + role, () => {
            const menu = ec.screen
                .makeTest()
                .rootScreen(root)
                .render("menuData/apps/Accounting/Home", {}, null)
            const shell = ec.screen
                .makeTest()
                .rootScreen(root)
                .render("shellData", {}, null)
            return {
                names: JSON.parse(menu.output)
                    .find((level) => level.name === "Accounting")
                    .subscreens.filter((item) => item.menuInclude)
                    .map((item) => item.name),
                providers: JSON.parse(shell.output).apps.find(
                    (app) => app.name === "Accounting",
                ).providers,
            }
        })
    },
    then({ names, providers, sections, create }) {
        names == ["Home", ...sections]
        providers.quickCreate.map((item) => item.kind) == create
        providers.paletteTypes ==
            [
                "MantleInvoice",
                "MantlePayment",
                "MantleGlAccount",
                "MantleAcctgTrans",
            ]
        providers.keymaps[0].scope == "accounting"
    },
})
feature(
    "Accounting reader palette and record links preserve authorized finance destinations",
    {
        when() {
            return finance("finance.read", () => {
                const invoke = (name, p) =>
                    ec.service.sync().name(name).parameters(p).call()
                return {
                    palette: invoke(
                        "ironstone.accounting.AccessServices.search#Records",
                        { text: "BOSS_ACCT", limit: 20 },
                    ),
                    invoice: invoke(
                        "ironstone.commons.PaletteServices.get#RecordLink",
                        {
                            docType: "MantleInvoice",
                            id: "BOSS_ACCT_INVOICE",
                        },
                    ),
                    bill: invoke(
                        "ironstone.commons.PaletteServices.get#RecordLink",
                        {
                            docType: "MantleInvoice",
                            id: "BOSS_ACCT_BILL",
                        },
                    ),
                    payment: invoke(
                        "ironstone.commons.PaletteServices.get#RecordLink",
                        {
                            docType: "MantlePayment",
                            id: "BOSS_ACCT_PAYMENT",
                        },
                    ),
                    journal: invoke(
                        "ironstone.commons.PaletteServices.get#RecordLink",
                        {
                            docType: "MantleAcctgTrans",
                            id: "BOSS_ACCT_ENTRY",
                        },
                    ),
                }
            })
        },
        then({ palette, invoice, bill, payment, journal }) {
            palette.rows.length > 0
            invoice.url.includes("Accounting/Receivables/InvoiceDetail")
            bill.url.includes("Accounting/Payables/BillDetail")
            payment.url.includes("Accounting/Payments/PaymentDetail")
            journal.url.includes("Accounting/GeneralLedger/JournalEntryDetail")
        },
    },
)
feature(
    "posting-default server choices use installed native enumeration contracts",
    {
        when() {
            return finance("finance.admin", () => {
                const missing = []
                for (const type of [
                    "ItemType",
                    "GlAccountType",
                    "AcctgTransType",
                    "InvoiceType",
                    "PaymentType",
                    "PaymentInstrument",
                    "FinancialAccountTransReason",
                    "InventoryVarianceReason",
                    "AssetType",
                    "AssetClass",
                ]) {
                    const result = ec.service
                        .sync()
                        .name("ironstone.accounting.AccessServices.get#Choices")
                        .parameters({
                            organizationPartyId: "ORG_ZIZI_CORP",
                            choice: "enum:" + type,
                        })
                        .call()
                    if (!result.options.length) missing.push(type)
                }
                return { missing }
            })
        },
        then({ missing }) {
            missing == []
        },
    },
)
feature(
    "existing unassigned chart accounts are searchable by code without financial balances",
    {
        when() {
            return finance("finance.admin", () =>
                ec.service
                    .sync()
                    .name("ironstone.accounting.AccessServices.get#Choices")
                    .parameters({
                        organizationPartyId: "ORG_ZIZI_CORP",
                        choice: "unassignedAccounts",
                        term: "909900001",
                    })
                    .call(),
            )
        },
        then({ options }) {
            options.some((row) => row.value == "BOSS_ACCOUNTING_EXPENSE")
            !JSON.stringify(options).includes("postedBalance")
        },
    },
)
feature("the shared choices transition preserves account search terms", {
    when() {
        return finance("finance.admin", () => {
            const r = ec.screen
                .makeTest()
                .rootScreen("component://mr-boss/screen/Accounting.xml")
                .render(
                    "GeneralLedger/ChartOfAccounts/choices",
                    {
                        organizationPartyId: "ORG_ZIZI_CORP",
                        choice: "unassignedAccounts",
                        term: "909900001",
                    },
                    "post",
                )
            return { status: r.status, output: r.output }
        })
    },
    then({ status, output }) {
        status == 200
        JSON.parse(output).some((row) => row.value == "BOSS_ACCOUNTING_EXPENSE")
    },
})

feature("report readers see ledger records without journal mutation controls", {
    when() {
        return finance("finance.read", () => {
            const failures = []
            for (const [path, controls] of [
                ["JournalBatches", ["New batch", "NewBatch"]],
                ["JournalTemplates", ["New template", "NewTemplate"]],
                ["JournalEntryDetail", ["DraftHeader", "ReviewPosting"]],
            ]) {
                const result = ec.screen
                    .makeTest()
                    .rootScreen("component://mr-boss/screen/Accounting.xml")
                    .render(
                        "GeneralLedger/" + path,
                        {
                            organizationPartyId: "ORG_ZIZI_CORP",
                            recordId: "BOSS_ACCT_ENTRY",
                        },
                        null,
                    )
                if (
                    result.status !== 200 ||
                    result.errorMessages.length ||
                    controls.some((text) => result.output.includes(text))
                )
                    failures.push(path)
            }
            return { failures }
        })
    },
    then({ failures }) {
        failures == []
    },
})
feature(
    "ledger and approval roles can follow authorized source document links",
    {
        where: [{ role: "gl" }, { role: "approve" }],
        when({ role }) {
            return finance("finance." + role, () => {
                const failures = []
                for (const [path, id] of [
                    ["Receivables/InvoiceDetail", "BOSS_ACCT_INVOICE"],
                    ["Payables/BillDetail", "BOSS_ACCT_BILL"],
                    ["Payments/PaymentDetail", "BOSS_ACCT_PAYMENT"],
                ]) {
                    const result = ec.screen
                        .makeTest()
                        .rootScreen("component://mr-boss/screen/Accounting.xml")
                        .render(
                            path,
                            {
                                organizationPartyId: "ORG_ZIZI_CORP",
                                recordId: id,
                            },
                            null,
                        )
                    if (result.status !== 200 || result.errorMessages.length)
                        failures.push(path)
                }
                return { failures }
            })
        },
        then({ failures }) {
            failures == []
        },
    },
)

feature(
    "safe response maps format timestamp and calendar dates before browser serialization",
    {
        when() {
            const source = { stamp: ec.user.nowTimestamp, day: "2026-10-29" }
            const formatted = ec.resource
                .script(
                    "component://mr-boss/service/ironstone/accounting/Accounting.js",
                )
                .formatDates(source, [
                    ["stamp", "yyyy-MM-dd"],
                    ["day", "yyyy-MM-dd"],
                ])
            return {
                formatted,
                expected: ec.l10n.format(ec.user.nowTimestamp, "yyyy-MM-dd"),
                source,
            }
        },
        then({ formatted, expected, source }) {
            formatted.stampText == expected
            formatted.dayText == "2026-10-29"
            source.stampText == null
        },
    },
)
