// The Accounting demo records for BOSS_ACCT_ORG (BossZAccountingDemoData.xml), made once by fixed ID: a draft invoice,
// bill and payment, a draft and a posted journal entry, and the organization's adoption of the posting guard,
// dimensions and forward adjustments. It is not a Ziziwork organization, so the adoption does not reach Mantle's demo
// flows, which post for ORG_ZIZI_RETAIL (rolled up to ORG_ZIZI_CORP) directly.
const policy = ec.resource.script("component://mr-mantle/service/mantle/ledger/AccountingPolicy.js")
const organizationPartyId = "BOSS_ACCT_ORG"

function createOnce(entity, key, values) {
    if (!policy.one(entity, key)) policy.call("create#" + entity, Object.assign({}, key, values))
}

function documents(currency) {
    const common = {statusId: "InvoiceInProcess", currencyUomId: currency, invoiceDate: ec.user.nowTimestamp}
    createOnce(
        "mantle.account.invoice.Invoice",
        {invoiceId: "BOSS_ACCT_INVOICE"},
        Object.assign({invoiceTypeEnumId: "InvoiceSales", fromPartyId: organizationPartyId, toPartyId: "ORG_ACME"}, common, {
            description: "Accounting demo customer invoice"
        })
    )
    createOnce(
        "mantle.account.invoice.Invoice",
        {invoiceId: "BOSS_ACCT_BILL"},
        Object.assign({invoiceTypeEnumId: "InvoiceSales", fromPartyId: "ORG_ACME", toPartyId: organizationPartyId}, common, {
            description: "Accounting demo supplier bill"
        })
    )
    createOnce(
        "mantle.account.payment.Payment",
        {paymentId: "BOSS_ACCT_PAYMENT"},
        {
            paymentTypeEnumId: "PtDisbursement",
            paymentInstrumentEnumId: "PiOther",
            statusId: "PmntProposed",
            fromPartyId: organizationPartyId,
            toPartyId: "ORG_ACME",
            amountUomId: currency,
            amount: 125,
            comments: "Accounting demo proposed payment"
        }
    )
}

// An expense account to debit and an asset account to credit, by account code, so the demo is the same on every load.
function entryAccounts() {
    const conditions = ec.entity.conditionFactory
    const postable = conditions.makeCondition(
        [
            conditions.makeCondition("disallowPosting", "is-null", null),
            conditions.makeCondition("disallowPosting", "not-equals", "Y")
        ],
        "or"
    )
    const accounts = Array.from(
        policy
            .find("mantle.ledger.account.GlAccountAndOrganization", {organizationPartyId})
            .condition(postable)
            .orderBy("accountCode,glAccountId")
            .list()
    )
    const code = account => String(account.accountCode || account.glAccountId)
    const expense = accounts.find(account => code(account).startsWith("6"))
    const asset = accounts.find(account => code(account).startsWith("1"))
    if (!expense || !asset) throw new Error("The Accounting demo needs an expense and an asset posting account")
    return [expense.glAccountId, asset.glAccountId]
}

function journalEntries(currency) {
    const [debitAccountId, creditAccountId] = entryAccounts()
    for (const [acctgTransId, description] of [
        ["BOSS_ACCT_ENTRY", "Office expense review"],
        ["BOSS_ACCT_POSTED", "Posted office expense"]
    ]) {
        if (policy.one("mantle.ledger.transaction.AcctgTrans", {acctgTransId})) continue
        policy.call("create#mantle.ledger.transaction.AcctgTrans", {
            acctgTransId,
            organizationPartyId,
            acctgTransTypeEnumId: "AttInternal",
            amountUomId: currency,
            transactionDate: ec.user.nowTimestamp,
            isPosted: "N",
            glFiscalTypeEnumId: "GLFT_ACTUAL",
            description
        })
        for (const [glAccountId, debitCreditFlag] of [
            [debitAccountId, "D"],
            [creditAccountId, "C"]
        ])
            policy.call("mantle.ledger.LedgerServices.create#AcctgTransEntry", {
                acctgTransId,
                glAccountId,
                debitCreditFlag,
                amount: 125
            })
        if (acctgTransId === "BOSS_ACCT_POSTED") {
            const reviewed = policy.call("mantle.ledger.JournalServices.preview#Entry", {acctgTransId})
            policy.call(
                "mantle.ledger.JournalServices.post#Entry",
                Object.assign({}, reviewed, {
                    acctgTransId,
                    operationKey: "BOSS_ACCT_DEMO_POST",
                    changeReason: "Accounting demo posting"
                })
            )
        }
    }
}

function configuration() {
    policy.call("update#mantle.ledger.config.PartyAcctgPreference", {
        organizationPartyId,
        postingGuardEnabled: "Y",
        requiredLedgerDimensionsEnabled: "Y",
        forwardIssuanceRepostEnabled: "Y"
    })
    createOnce(
        "mantle.ledger.account.GlAccountOrganization",
        {organizationPartyId, glAccountId: "BOSS_INVENTORY_REVALUATION"},
        {fromDate: 0}
    )
    const offset = policy.call("mantle.ledger.LedgerServices.get#DefaultGlAccountByType", {
        organizationPartyId,
        glAccountTypeEnumId: "GatInventoryRevaluation"
    })
    if (!offset.glAccountId)
        policy.call("create#mantle.ledger.config.GlAccountTypeDefault", {
            organizationPartyId,
            glAccountTypeEnumId: "GatInventoryRevaluation",
            glAccountId: "BOSS_INVENTORY_REVALUATION"
        })
    for (const paymentGatewayConfigId of ["TEST_APPROVE", "TEST_DECLINE"])
        createOnce(
            "mantle.account.method.PaymentGatewayOrganization",
            {organizationPartyId, paymentGatewayConfigId},
            {fromDate: 0, isEnabled: "Y"}
        )
}

// Run by data loading (no user) or a system administrator.
function load() {
    if (ec.user.userId && !policy.capabilities().systemAdmin) throw new Error("Demo loading requires system administration")
    const loggedIn = !!ec.user.username
    if (!loggedIn) ec.user.internalLoginUser("john.doe")
    const authzDisabled = ec.artifactExecution.disableAuthz()
    try {
        const currency = policy.preference(organizationPartyId).baseCurrencyUomId
        documents(currency)
        journalEntries(currency)
        configuration()
        return {complete: true}
    } finally {
        if (!authzDisabled) ec.artifactExecution.enableAuthz()
        if (!loggedIn) ec.user.logoutUser()
    }
}

;({execute: () => load()})
