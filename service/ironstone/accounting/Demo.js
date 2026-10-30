// The Accounting demo records for ORG_ZIZI_CORP, made once by fixed ID: a draft invoice, bill and payment, a draft and
// a posted journal entry, and the organization's adoption of the posting guard, dimensions and forward adjustments.
const policy = ec.resource.script("component://mr-mantle/service/mantle/ledger/AccountingPolicy.js")
const organizationPartyId = "ORG_ZIZI_CORP"

function createOnce(entity, key, values) {
    if (!policy.one(entity, key)) policy.call("create#" + entity, Object.assign({}, key, values))
}

function documents(currency) {
    const common = {
        statusId: "InvoiceInProcess",
        currencyUomId: currency,
        invoiceDate: ec.user.nowTimestamp,
        accountingDate: ec.l10n.format(ec.user.nowTimestamp, "yyyy-MM-dd")
    }
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
    createOnce("mantle.party.PartyRole", {partyId: "ORG_ACME", roleTypeId: "Customer"}, {})
    for (const invoiceId of ["BOSS_ACCT_INVOICE", "BOSS_ACCT_BILL"]) {
        if (policy.one("mantle.account.invoice.InvoiceItem", {invoiceId, invoiceItemSeqId: "00001"})) continue
        policy.call("mantle.account.InvoiceServices.create#InvoiceItem", {
            invoiceId,
            invoiceItemSeqId: "00001",
            itemTypeEnumId: "ItemTimeEntry",
            description: "Accounting demo services",
            quantity: "1",
            amount: ec.l10n.roundCurrency(toDecimal("125"), currency)
        })
    }
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
        forwardIssuanceRepostEnabled: "Y",
        singleCurrencyDocumentsOnly: "Y",
        settlementApplicationGuardEnabled: "Y",
        paymentAutoApplicationEnabled: "Y"
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

function finalizedReceivable(currency) {
    const invoiceId = "BOSS_ACCT_AR_FINALIZED"
    createOnce(
        "mantle.account.invoice.Invoice",
        {invoiceId},
        {
            invoiceTypeEnumId: "InvoiceSales",
            statusId: "InvoiceInProcess",
            fromPartyId: organizationPartyId,
            toPartyId: "ORG_ACME",
            invoiceDate: ec.user.nowTimestamp,
            accountingDate: ec.l10n.format(ec.user.nowTimestamp, "yyyy-MM-dd"),
            currencyUomId: currency,
            description: "Customer services invoice",
            draftedByUserId: ec.user.userId
        }
    )
    if (!policy.one("mantle.account.invoice.InvoiceItem", {invoiceId, invoiceItemSeqId: "00001"}))
        policy.call("mantle.account.InvoiceServices.create#InvoiceItem", {
            invoiceId,
            invoiceItemSeqId: "00001",
            itemTypeEnumId: "ItemTimeEntry",
            quantity: "1",
            amount: ec.l10n.roundCurrency(toDecimal("125"), currency),
            description: "Customer services"
        })
    const invoice = policy.one("mantle.account.invoice.Invoice", {invoiceId})
    if (invoice.statusId === "InvoiceInProcess")
        policy.call("mantle.account.InvoiceServices.change#InvoiceState", {
            invoiceId,
            organizationPartyId,
            action: "finalize",
            lastUpdatedStamp: invoice.lastUpdatedStamp,
            operationKey: "BOSS_ACCT_DEMO_AR_FINAL",
            changeReason: "Accounting demo invoice posting"
        })
}

function storeReceivable(currency) {
    const productStoreId = "BOSS_ACCT_STORE"
    const invoiceId = "BOSS_ACCT_STORE_DRAFT"
    createOnce(
        "mantle.product.store.ProductStore",
        {productStoreId},
        {
            storeName: "Accounting consulting store",
            organizationPartyId
        }
    )
    createOnce(
        "moqui.basic.email.EmailTemplate",
        {emailTemplateId: "BOSS_ACCT_STORE_NOTICE"},
        {
            emailServerId: "BOSS_ACCOUNTING_DEMO",
            fromAddress: "accounting@example.test",
            subject: "Store invoice finalized",
            bodyScreenLocation: "component://framework/screen/ScreenRenderEmail.xml"
        }
    )
    createOnce(
        "mantle.product.store.ProductStoreEmail",
        {productStoreId, emailTypeEnumId: "PsetInvoiceFinalized", fromDate: "1970-01-01T00:00:00Z"},
        {
            emailTemplateId: "BOSS_ACCT_STORE_NOTICE"
        }
    )
    if (
        !policy
            .find("mantle.party.contact.PartyContactMechInfo", {partyId: "ORG_ACME", contactMechPurposeId: "EmailBilling"})
            .conditionDate("fromDate", "thruDate", null)
            .count()
    )
        policy.call("mantle.party.ContactServices.create#EmailAddress", {
            partyId: "ORG_ACME",
            emailAddress: "accounting.customer@example.test",
            contactMechPurposeId: "EmailBilling"
        })
    createOnce(
        "mantle.account.invoice.Invoice",
        {invoiceId},
        {
            invoiceTypeEnumId: "InvoiceSales",
            statusId: "InvoiceInProcess",
            fromPartyId: organizationPartyId,
            toPartyId: "ORG_ACME",
            invoiceDate: ec.user.nowTimestamp,
            accountingDate: ec.l10n.format(ec.user.nowTimestamp, "yyyy-MM-dd"),
            currencyUomId: currency,
            productStoreId,
            description: "Store customer services",
            draftedByUserId: ec.user.userId
        }
    )
    if (!policy.one("mantle.account.invoice.InvoiceItem", {invoiceId, invoiceItemSeqId: "00001"}))
        policy.call("mantle.account.InvoiceServices.create#InvoiceItem", {
            invoiceId,
            invoiceItemSeqId: "00001",
            itemTypeEnumId: "ItemTimeEntry",
            quantity: "1",
            amount: ec.l10n.roundCurrency(toDecimal("35"), currency),
            description: "Store consulting"
        })
}

function receivableSupport() {
    const invoiceId = "BOSS_ACCT_AR_FINALIZED"
    const invoiceContentId = "BOSS_ACCT_AR_SUPPORT"
    const contentLocation = "dbresource://mantle/content/invoice/" + invoiceId + "/content_" + invoiceContentId + "/Scope.txt"
    if (policy.one("mantle.account.invoice.InvoiceContent", {invoiceContentId})) return
    ec.resource
        .getLocationReference(contentLocation)
        .putText("Approved customer service scope and terms. Accounting supporting document.")
    policy.call("create#mantle.account.invoice.InvoiceContent", {
        invoiceContentId,
        invoiceId,
        contentLocation,
        contentTypeEnumId: "IctInvoiceDocument",
        contentDate: ec.user.nowTimestamp,
        description: "Approved service scope"
    })
}

// Approved work belongs to the finance organization and needs no Projects launcher grant to bill it.
function approvedWork() {
    const workEffortId = "BOSS_ACCT_PROJECT"
    const timesheetId = "BOSS_ACCT_TIMESHEET"
    const fromDate = Number(ec.user.nowTimestamp) - 86400000
    const thruDate = fromDate + 3600000
    createOnce(
        "mantle.work.effort.WorkEffort",
        {workEffortId},
        {
            workEffortTypeEnumId: "WetProject",
            ownerPartyId: organizationPartyId,
            workEffortName: "Accounting customer consulting"
        }
    )
    for (const [partyId, roleTypeId] of [
        [organizationPartyId, "Vendor"],
        ["ORG_ACME", "Customer"]
    ])
        createOnce(
            "mantle.work.effort.WorkEffortParty",
            {workEffortId, partyId, roleTypeId, fromDate: "1970-01-01T00:00:00Z"},
            {}
        )
    createOnce(
        "mantle.work.time.Timesheet",
        {timesheetId},
        {
            partyId: "EX_JOHN_DOE",
            statusId: "TmshApproved",
            fromDate,
            thruDate
        }
    )
    createOnce(
        "mantle.work.time.TimeEntry",
        {timeEntryId: "BOSS_ACCT_APPROVED_TIME"},
        {
            timesheetId,
            partyId: "EX_JOHN_DOE",
            vendorPartyId: organizationPartyId,
            clientPartyId: "ORG_ACME",
            workEffortId,
            fromDate,
            thruDate,
            hours: "1",
            clientHourRate: "85",
            vendorHourRate: "40",
            hasModifiedRates: "Y"
        }
    )
}

// Run by data loading (no user) or a system administrator.
// Separate issued settlement examples leave the receivables/Projects fixtures unchanged.
function settlementDocuments(currency) {
    const partyId = "BOSS_ACCT_STL_CUSTOMER"
    createOnce("mantle.party.Party", {partyId}, {partyTypeEnumId: "PtyOrganization"})
    createOnce("mantle.party.Organization", {partyId}, {organizationName: "Settlement customer"})
    createOnce("mantle.party.PartyRole", {partyId, roleTypeId: "Customer"}, {})
    const day = ec.l10n.format(ec.user.nowTimestamp, "yyyy-MM-dd")
    const at = ec.user.nowTimestamp
    const sourceAccount = policy.call("mantle.ledger.InvoiceAutoPostServices.get#InvoiceItemGlAccount", {
        organizationPartyId,
        otherPartyId: partyId,
        itemTypeEnumId: "ItemTimeEntry",
        direction: "O"
    }).glAccountId
    if (!sourceAccount) throw new Error("The settlement demo needs a services revenue account")
    for (const [invoiceId, amount, description, creditForInvoiceId] of [
        ["BOSS_ACCT_STL_INV100", "100", "Settlement services invoice", null],
        ["BOSS_ACCT_STL_SPLIT100", "100", "Split receipt services invoice", null],
        ["BOSS_ACCT_STL_INV40", "40", "Split receipt second invoice", null],
        ["BOSS_ACCT_STL_ADJUST50", "50", "Settlement adjustment invoice", null],
        ["BOSS_ACCT_STL_CREDIT25", "25", "Available settlement credit", "BOSS_ACCT_STL_INV100"]
    ]) {
        if (policy.one("mantle.account.invoice.Invoice", {invoiceId})) continue
        policy.call("create#mantle.account.invoice.Invoice", {
            invoiceId,
            invoiceTypeEnumId: creditForInvoiceId ? "InvoiceCreditMemo" : "InvoiceSales",
            fromPartyId: creditForInvoiceId ? partyId : organizationPartyId,
            toPartyId: creditForInvoiceId ? organizationPartyId : partyId,
            financeOrganizationPartyId: organizationPartyId,
            financeDirection: "receivable",
            creditForInvoiceId,
            draftedByUserId: ec.user.userId,
            statusId: "InvoiceInProcess",
            invoiceDate: at,
            accountingDate: day,
            currencyUomId: currency,
            description
        })
        policy.call("mantle.account.InvoiceServices.create#InvoiceItem", {
            invoiceId,
            quantity: "1",
            amount,
            description,
            itemTypeEnumId: "ItemTimeEntry",
            overrideGlAccountId: sourceAccount
        })
        const invoice = policy.one("mantle.account.invoice.Invoice", {invoiceId})
        policy.call("mantle.account.InvoiceServices.change#InvoiceState", {
            invoiceId,
            organizationPartyId,
            action: "finalize",
            lastUpdatedStamp: invoice.lastUpdatedStamp,
            operationKey: "demo-final-" + invoiceId
        })
    }
    const [, cashGlAccountId] = entryAccounts()
    createOnce(
        "mantle.account.method.PaymentMethod",
        {paymentMethodId: "BOSS_ACCT_STL_CASH"},
        {
            paymentMethodTypeEnumId: "PmtOther",
            ownerPartyId: organizationPartyId,
            currencyUomId: currency,
            fromDate: "1970-01-01T00:00:00Z",
            description: "Settlement demonstration cash",
            glAccountId: cashGlAccountId
        }
    )
    for (const [paymentId, amount] of [
        ["BOSS_ACCT_STL_RECEIPT60", "60"],
        ["BOSS_ACCT_STL_RECEIPT70", "70"]
    ]) {
        if (policy.one("mantle.account.payment.Payment", {paymentId})) continue
        policy.call("create#mantle.account.payment.Payment", {
            paymentId,
            fromPartyId: partyId,
            toPartyId: organizationPartyId,
            financeOrganizationPartyId: organizationPartyId,
            financeDirection: "receivable",
            paymentTypeEnumId: "PtInvoicePayment",
            paymentInstrumentEnumId: "PiCash",
            toPaymentMethodId: "BOSS_ACCT_STL_CASH",
            amount,
            amountUomId: currency,
            statusId: "PmntPromised",
            effectiveDate: at,
            accountingDate: day,
            comments: "Available settlement receipt " + amount
        })
        policy.call("update#mantle.account.payment.Payment", {paymentId, statusId: "PmntDelivered"})
        const posted = policy
            .find("mantle.ledger.transaction.AcctgTrans", {paymentId, organizationPartyId, isPosted: "Y"})
            .count()
        if (!posted) throw new Error("The settlement receipt " + paymentId + " did not post")
    }
}

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
        finalizedReceivable(currency)
        receivableSupport()
        approvedWork()
        storeReceivable(currency)
        settlementDocuments(currency)
        return {complete: true}
    } finally {
        if (!authzDisabled) ec.artifactExecution.enableAuthz()
        if (!loggedIn) ec.user.logoutUser()
    }
}

;({execute: () => load()})
