const T = "mantle.ledger.transaction.AcctgTrans",
    INVOICE = "mantle.account.invoice.Invoice",
    PAYMENT = "mantle.account.payment.Payment"
const invoke = (name, p = {}) => ec.service.sync().name(name).parameters(p).disableAuthz().call() || {}
const accounting = ec.resource.script("component://mr-boss/test/AccountingSpecLib.js")
spec({
    setupSpec() {
        login("john.doe")
        ec.artifactExecution.disableAuthz()
        invoke("create#mantle.party.Party", {
            partyId: "BOSS_FIN_OUTSIDE",
            partyTypeEnumId: "PtyOrganization"
        })
        invoke("create#mantle.party.Organization", {
            partyId: "BOSS_FIN_OUTSIDE",
            organizationName: "Unrelated financial organization"
        })
        invoke("create#mantle.party.PartyRole", {
            partyId: "BOSS_FIN_OUTSIDE",
            roleTypeId: "OrgInternal"
        })
        invoke("create#" + INVOICE, {
            invoiceId: "BOSS_ISO_INVOICE",
            invoiceTypeEnumId: "InvoiceSales",
            statusId: "InvoiceInProcess",
            fromPartyId: "BOSS_FIN_OUTSIDE",
            toPartyId: "_NA_",
            currencyUomId: "USD",
            description: "Secret finance isolation"
        })
        invoke("create#" + PAYMENT, {
            paymentId: "BOSS_ISO_PAYMENT",
            paymentTypeEnumId: "PtDisbursement",
            paymentInstrumentEnumId: "PiOther",
            statusId: "PmntProposed",
            fromPartyId: "BOSS_FIN_OUTSIDE",
            toPartyId: "_NA_",
            amount: 42,
            amountUomId: "USD"
        })
        invoke("create#" + T, {
            acctgTransId: "BOSS_ISO_ENTRY",
            organizationPartyId: "BOSS_FIN_OUTSIDE",
            acctgTransTypeEnumId: "AttInternal",
            isPosted: "N",
            amountUomId: "USD",
            transactionDate: ec.user.nowTimestamp,
            description: "Secret finance isolation"
        })
        invoke("create#mantle.ledger.transaction.AcctgTransContent", {
            acctgTransContentId: "BOSS_ISO_FILE",
            acctgTransId: "BOSS_ISO_ENTRY",
            contentLocation: "dbresource://finance-isolation.txt",
            contentTypeEnumId: "AtctEvidence"
        })
        for (const [document, key] of [
            ["MantleInvoice", {invoiceId: "BOSS_ISO_INVOICE"}],
            ["MantlePayment", {paymentId: "BOSS_ISO_PAYMENT"}],
            ["MantleAcctgTrans", {acctgTransId: "BOSS_ISO_ENTRY"}],
            ["MantleGlAccount", {glAccountId: "111100000"}]
        ])
            ec.search.indexDocuments(ec.entity.getDataDocuments(document, key))
    }
})
function asReader(enabled, fn) {
    return accounting.asUser("finance.read", fn, enabled)
}
// The message a call is refused with, or "" when it succeeds.
function refusal(name, p) {
    ec.message.pushErrors()
    try {
        ec.service.sync().name(name).parameters(p).disableAuthz().requireNewTransaction(true).call()
        return ec.message.hasError() ? ec.message.getErrorsString() : ""
    } catch (error) {
        return String(error.message)
    } finally {
        ec.message.clearErrors()
        ec.message.popErrors()
    }
}
// refused for want of access, not for a bad request
const refused = (name, p) => /not available|authority is required|not permitted|not authorized/i.test(refusal(name, p))
feature("Accounting isolates lists, exports, search, record links and files with authz #enabled", {
    where: [{enabled: true}, {enabled: false}],
    when({enabled}) {
        const content = ec.entity
            .find("mantle.ledger.transaction.AcctgTransContent")
            .condition("acctgTransContentId", "BOSS_ISO_FILE")
            .disableAuthz()
            .one()
        const contentExists = content?.acctgTransId === "BOSS_ISO_ENTRY"
        // The administrator selects the file's actual organization; the reader remains explicitly scoped to Corp.
        const ownerSeesFile = accounting.asUser(
            "john.doe",
            () =>
                refusal("mantle.party.CommunicationServices.get#RecordLinkInfo", {
                    recordEntityName: "mantle.ledger.transaction.AcctgTransContent",
                    recordId: "BOSS_ISO_FILE"
                }),
            enabled,
            "BOSS_FIN_OUTSIDE"
        )
        return Object.assign(
            {ownerSeesFile, contentExists},
            asReader(enabled, () => {
                const checks = []
                for (const [kind, id, type, entity, path] of [
                    ["invoices", "BOSS_ISO_INVOICE", "MantleInvoice", INVOICE, "Receivables/Invoices"],
                    ["payments", "BOSS_ISO_PAYMENT", "MantlePayment", PAYMENT, "Payments/Payments"],
                    ["journals", "BOSS_ISO_ENTRY", "MantleAcctgTrans", T, "GeneralLedger/JournalEntries"]
                ]) {
                    const list = invoke("mantle.ledger.AccountingServices.find#Records", {
                        kind,
                        text: "BOSS_ISO"
                    })
                    const link = invoke("ironstone.commons.PaletteServices.get#RecordLink", {docType: type, id})
                    const search = invoke("mantle.search.UniversalSearchServices.search#Universal", {
                        q: "BOSS_ISO",
                        entityType: type
                    })
                    const csv = ec.screen
                        .makeTest()
                        .rootScreen("component://mr-boss/screen/Accounting.xml")
                        .renderMode("csv")
                        .withStaticData()
                        .render(
                            path,
                            {
                                organizationPartyId: "BOSS_ACCT_ORG",
                                text: "BOSS_ISO",
                                lastStandalone: "-2"
                            },
                            null
                        )
                    checks.push({
                        list: list.records.length === 0,
                        link: !link.url,
                        search: search.results.length === 0,
                        csv: !String(csv.output).includes(id),
                        record: refused("mantle.ledger.AccountingServices.get#Record", {
                            kind,
                            recordId: id
                        })
                    })
                }
                const files = refusal("mantle.party.CommunicationServices.get#RecordLinkInfo", {
                    recordEntityName: "mantle.ledger.transaction.AcctgTransContent",
                    recordId: "BOSS_ISO_FILE"
                })
                const reports = refused("mantle.ledger.FinanceReportServices.run#GeneralLedger", {
                    organizationPartyId: "BOSS_FIN_OUTSIDE"
                })
                return {checks, files, reports}
            })
        )
    },
    then({checks, files, reports, ownerSeesFile, contentExists}) {
        contentExists == true
        checks.every(row => Object.values(row).every(Boolean))
        files.includes("not found") || files.includes("not available")
        ownerSeesFile == ""
        reports == true
    }
})
feature("the same reader does see its own organization's records through the same calls", {
    where: [{enabled: true}, {enabled: false}],
    when({enabled}) {
        return asReader(enabled, () => {
            const failures = []
            for (const [kind, id, type] of [
                ["invoices", "BOSS_ACCT_INVOICE", "MantleInvoice"],
                ["payments", "BOSS_ACCT_PAYMENT", "MantlePayment"],
                ["journals", "BOSS_ACCT_ENTRY", "MantleAcctgTrans"]
            ]) {
                const list = invoke("mantle.ledger.AccountingServices.find#Records", {kind, text: id})
                if (!list.records.some(row => Object.values(row).includes(id))) failures.push(kind + " list")
                const link = invoke("ironstone.commons.PaletteServices.get#RecordLink", {docType: type, id})
                if (!link.url) failures.push(kind + " link")
                const read = refusal("mantle.ledger.AccountingServices.get#Record", {kind, recordId: id})
                if (read) failures.push(kind + " record: " + read)
            }
            return {failures}
        })
    },
    then({failures}) {
        failures.join("\n") == ""
    }
})
