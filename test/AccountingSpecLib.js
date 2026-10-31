// Shared Accounting spec identities, authorized-user scope and render checks. Tests run inside Moqui, without Node.
const ids = {
    organizationPartyId: "BOSS_ACCT_ORG",
    foreignOrganizationPartyId: "ORG_ZIZI_SERVICES",
    customerPartyId: "ORG_ACME",
    invoiceId: "BOSS_ACCT_INVOICE",
    finalizedInvoiceId: "BOSS_ACCT_AR_FINALIZED",
    settlementPartyId: "BOSS_ACCT_STL_CUSTOMER",
    settlementInvoiceId: "BOSS_ACCT_STL_INV100",
    settlementPaymentId: "BOSS_ACCT_STL_RECEIPT60",
    settlementCreditId: "BOSS_ACCT_STL_CREDIT25",
    paymentPartyId: "BOSS_ACCT_PAY_CUSTOMER",
    paymentDraftId: "BOSS_ACCT_PAY_DRAFT",
    paymentDeliveredId: "BOSS_ACCT_PAY_DELIVERED"
}

function selectOrganization(organizationPartyId) {
    ec.user.setPreference("ACTIVE_ORGANIZATION", organizationPartyId || null)
    ec.service.sync().name("mantle.party.PartyServices.setup#UserOrganizationInfo").disableAuthz().throwOnError(true).call()
}

function asUser(username, action, enabled = true, organizationPartyId = ids.organizationPartyId) {
    const previousUsername = ec.user.username || "john.doe"
    login(username)
    const disabled = ec.artifactExecution.authzDisabled()
    const previousOrganizationPartyId = ec.user.getPreference("ACTIVE_ORGANIZATION")
    try {
        ec.artifactExecution.disableAuthz()
        selectOrganization(organizationPartyId)
        if (enabled) ec.artifactExecution.enableAuthz()
        return action()
    } finally {
        ec.message.clearErrors()
        ec.artifactExecution.disableAuthz()
        try {
            selectOrganization(previousOrganizationPartyId)
        } finally {
            if (!disabled) ec.artifactExecution.enableAuthz()
            login(previousUsername)
        }
    }
}

function call(service, parameters = {}) {
    return ec.service.sync().name(service).parameters(parameters).throwOnError(true).call() || {}
}

function refusal(service, parameters) {
    ec.message.pushErrors()
    try {
        ec.service
            .sync()
            .name(service)
            .parameters(parameters)
            .disableAuthz()
            .requireNewTransaction(true)
            .throwOnError(true)
            .call()
        return ""
    } catch (error) {
        return String(error.message)
    } finally {
        ec.message.clearErrors()
        ec.message.popErrors()
    }
}

function page(path, parameters = {}, mode = "qvt") {
    const renderer = ec.screen.makeTest().rootScreen("component://mr-boss/screen/Accounting.xml").renderMode(mode)
    if (mode === "qvt") renderer.withStaticData()
    const result = renderer.render(
        path,
        Object.assign(
            {
                organizationPartyId: ids.organizationPartyId,
                lastStandalone: /^(?:Receivables\/(?:InvoiceDetail|Customer360)|Payments\/PaymentDetail)\//.test(path)
                    ? "true"
                    : "-2"
            },
            parameters
        ),
        null
    )
    const output = String(result.output || "")
    return {
        status: result.status,
        output,
        errors: Array.from(result.errorMessages || []).concat(
            output.match(/(?:Error rendering|Exception in render)[^\n<]*/g) || []
        )
    }
}

const invoiceTabs = [
    ["Overview", "Overview"],
    ["Items", "Items and taxes"],
    ["Payments", "Payments and credits"],
    ["Orders", "Orders"],
    ["Shipments", "Shipments"],
    ["Budget", "Budget details"],
    ["GeneralLedger", "General ledger"],
    ["Files", "Files"],
    ["Conversation", "Conversation"],
    ["History", "History"]
]
const customerTabs = [
    ["Contact", "Contact"],
    ["Orders", "Orders"],
    ["Money", "Invoices and payments"],
    ["Agreements", "Agreements"],
    ["FinanceDetails", "Finance details"],
    ["Files", "Files"]
]
const paymentTabs = [
    ["Overview", "Payment overview"],
    ["Applications", "Applications and open items"],
    ["Gateway", "Gateway answers"],
    ["Refunds", "Linked refunds"],
    ["GeneralLedger", "Payment ledger"],
    ["Files", "Payment files and issued documents"],
    ["History", "Payment history"]
]

// The customer's statements, so the statement routes render real content rather than an empty selection.
function statementPreview() {
    return ec.service
        .sync()
        .name("mantle.account.CollectionServices.get#Statements")
        .parameters({
            organizationPartyId: ids.organizationPartyId,
            customerPartyIdList: [ids.customerPartyId],
            asOfDate: ec.user.nowTimestamp,
            includeZeroBalance: true
        })
        .disableAuthz()
        .requireNewTransaction(true)
        .throwOnError(true)
        .call()
}

function routeFixtures() {
    const snapshot = statementPreview()
    if (!snapshot.statementRows?.some(row => row.invoiceRows?.some(invoice => invoice.invoiceId === ids.finalizedInvoiceId)))
        throw new Error("Accounting screen fixtures require the finalized customer invoice in the customer statement")
    const statementParameters = {customerPartyId: ids.customerPartyId, includeZeroBalance: "Y", showStatements: "Y"}
    const destinations = [
        ["Home", "Shortcuts"],
        ["Receivables/Invoices", "Invoices"],
        ["Payables/Bills", "Bills"],
        ["Payments/Payments", "Payments"],
        ["GeneralLedger/ChartOfAccounts", "Chart of accounts"],
        ["GeneralLedger/JournalEntries", "Journal entries"],
        ["GeneralLedger/TransactionEntries", "Transaction entries"],
        ["GeneralLedger/JournalBatches", "Journal batches"],
        ["GeneralLedger/JournalTemplates", "Journal templates"],
        ["PeriodClose/Periods", "Fiscal periods"],
        ["PeriodClose/PeriodLocks", "Posting locks"],
        ["Reports/TrialBalance", "Trial balance"],
        ["Reports/GeneralLedger", "General ledger"],
        ["Settings/Settings", "Accounting settings"],
        ["Settings/AccountingPreferences", "Accounting preferences"],
        ["Settings/PostingDefaults", "Posting defaults"],
        ["Settings/PaymentTerms", "Payment terms"],
        ["Settings/Currencies", "Currencies"],
        ["Settings/PaymentMethods", "Payment methods"],
        ["Settings/DocumentSettings", "Document settings"],
        ["Receivables/InvoiceDetail", "Accounting demo customer invoice", {recordId: ids.invoiceId}],
        ["Payables/BillDetail", "Accounting demo supplier bill", {recordId: "BOSS_ACCT_BILL"}],
        ["Payments/PaymentDetail", "Payment customer", {recordId: ids.paymentDraftId}],
        ["Payments/GatewayTransactions", "Gateway transactions", {paymentId: ids.paymentDeliveredId}],
        ["Payments/PaymentPrint", "Payment document", {paymentId: ids.paymentDeliveredId, outputType: "receipt"}],
        ["QuickCreate/NewPayment", "Create payment"],
        // the review screens without a review: their not-available state
        ["Payments/PaymentDetail/Review", "Review not available", {recordId: ids.paymentDraftId, lastStandalone: "true"}],
        ["Payments/TransferReview", "Transfer review not available"],
        ["Receivables/SettlementReview", "Settlement review not available"],
        ...paymentTabs.map(([tab, text]) => [
            "Payments/PaymentDetail/" + tab,
            text,
            {
                recordId:
                    tab === "Applications"
                        ? "BOSS_ACCT_PAY_APPLIED"
                        : tab === "GeneralLedger"
                          ? ids.paymentDeliveredId
                          : tab === "Files"
                            ? "BOSS_ACCT_PAY_CHECK"
                            : ids.paymentDraftId,
                lastStandalone: "true"
            }
        ]),
        ["GeneralLedger/JournalEntryDetail", "Office expense review", {recordId: "BOSS_ACCT_ENTRY"}],
        ["GeneralLedger/AccountDetail", "Open account ledger", {recordId: "111100000"}],
        ["Receivables/BillingQueue", "Billing queue"],
        ["Receivables/ReceivablesWorkbench", "Allocate receipts and credits", {partyId: ids.settlementPartyId}],
        ["Receivables/InvoiceBatch", ids.invoiceId, {invoiceIdList: [ids.invoiceId, ids.finalizedInvoiceId]}],
        ["Receivables/Statements", "Print statements", statementParameters],
        ["Receivables/StatementPrint", "Customer statement", statementParameters],
        ["Receivables/InvoicePrint", "Open the printable invoice", {invoiceId: ids.finalizedInvoiceId}],
        ["Receivables/Customer360", "Another Company Making Everything", {customerPartyId: ids.customerPartyId}],
        ...invoiceTabs.map(([tab, text]) => [
            "Receivables/InvoiceDetail/" + tab,
            text,
            {recordId: tab === "GeneralLedger" ? ids.finalizedInvoiceId : ids.invoiceId, lastStandalone: "true"}
        ]),
        ...customerTabs.map(([tab, text]) => [
            "Receivables/Customer360/" + tab,
            text,
            {customerPartyId: ids.customerPartyId, lastStandalone: "true"}
        ])
    ]
    return Object.fromEntries(
        destinations.map(([path, text, parameters = {}]) => [
            path,
            {
                path,
                text,
                parameters: Object.assign({organizationPartyId: ids.organizationPartyId}, parameters)
            }
        ])
    )
}

;({ids, asUser, selectOrganization, call, refusal, page, invoiceTabs, customerTabs, paymentTabs, statementPreview, routeFixtures})
