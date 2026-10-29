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
        sections: ["GeneralLedger", "PeriodClose", "Reports"],
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
    { role: "approve", sections: ["PeriodClose", "Reports"], create: [] },
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
                        { docType: "MantleInvoice", id: "BOSS_ACCT_INVOICE" },
                    ),
                    bill: invoke(
                        "ironstone.commons.PaletteServices.get#RecordLink",
                        { docType: "MantleInvoice", id: "BOSS_ACCT_BILL" },
                    ),
                    payment: invoke(
                        "ironstone.commons.PaletteServices.get#RecordLink",
                        { docType: "MantlePayment", id: "BOSS_ACCT_PAYMENT" },
                    ),
                    journal: invoke(
                        "ironstone.commons.PaletteServices.get#RecordLink",
                        { docType: "MantleAcctgTrans", id: "BOSS_ACCT_ENTRY" },
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
