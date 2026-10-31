const native = (service, p = {}) =>
    ec.service
        .sync()
        .name("mantle.ledger." + service)
        .parameters(p)
        .call() || {}
function asFinance(user, enabled, run) {
    return ec.resource.script("component://mr-boss/test/AccountingSpecLib.js").asUser(user, run, enabled)
}
feature("Treasury can read the scoped settlement workbench without gaining AR editing with authz #enabled", {
    where: [{enabled: true}, {enabled: false}],
    when({enabled}) {
        return asFinance("finance.treasury", enabled, () => {
            const helper = ec.resource.script("component://mr-boss/test/AccountingSpecLib.js")
            const parameters = {
                organizationPartyId: helper.ids.organizationPartyId,
                partyId: helper.ids.settlementPartyId,
                currencyUomId: "USD"
            }
            const items = helper.call("mantle.account.PaymentServices.find#OpenItems", {...parameters, direction: "receivable"})
            const source = items.paymentRows.find(row => row.sourceId === "BOSS_ACCT_STL_RECEIPT60")
            const target = items.invoiceRows.find(row => row.sourceId === "BOSS_ACCT_STL_INV100")
            assert(source && target, "Treasury's negative needs the same real settlement that AR may preview")
            const preview = {
                ...parameters,
                direction: "receivable",
                effectiveDate: ec.user.nowTimestamp,
                allocations: [{sourceKey: source.sourceKey, targetKey: target.sourceKey, amount: "1"}],
                sourceVersions: {[source.sourceKey]: source.version, [target.sourceKey]: target.version}
            }
            return {
                page: helper.page("Receivables/ReceivablesWorkbench", parameters, "qvt"),
                items,
                edit: refusal("mantle.account.PaymentServices.preview#Settlement", preview),
                arEdit: helper.asUser(
                    "finance.ar",
                    () => refusal("mantle.account.PaymentServices.preview#Settlement", preview),
                    enabled
                ),
                invoice: refusal("mantle.account.InvoiceServices.get#InvoiceFinanceDetail", {
                    organizationPartyId: helper.ids.organizationPartyId,
                    invoiceId: helper.ids.finalizedInvoiceId
                })
            }
        })
    },
    then({page, items, edit, arEdit, invoice}) {
        page.status == 200
        page.errors == []
        page.output.includes("Allocate receipts and credits")
        !page.output.includes("Add allocation")
        items.capabilities.canRead == true
        items.capabilities.canApply == false
        items.invoiceRows.some(row => row.sourceId === "BOSS_ACCT_STL_INV100")
        edit.includes("PERMISSION_DENIED")
        arEdit == ""
        invoice.includes("PERMISSION_DENIED")
    }
})
// The message a call is refused with, or "" when it succeeds. A negative case checks the message names the missing
// authority, and a positive case with the same parameters gets "", so a validation error is not taken for a refusal.
function refusal(service, p) {
    ec.message.pushErrors()
    try {
        ec.service.sync().name(service).parameters(p).disableAuthz().requireNewTransaction(true).call()
        return ec.message.hasError() ? ec.message.getErrorsString() : ""
    } catch (error) {
        return String(error.message)
    } finally {
        ec.message.clearErrors()
        ec.message.popErrors()
    }
}
const readerDraft = {organizationPartyId: "BOSS_ACCT_ORG", description: "Access spec draft"}
feature("Accounting reader sees own organization documents with authz enabled or disabled", {
    where: [{enabled: true}, {enabled: false}],
    when({enabled}) {
        return asFinance("finance.read", enabled, () => ({
            access: native("AccountingServices.get#Access"),
            own: native("AccountingServices.get#Record", {
                kind: "invoices",
                recordId: "BOSS_ACCT_INVOICE"
            }),
            other: refusal("mantle.ledger.AccountingServices.get#Record", {
                kind: "accounts",
                recordId: "110000",
                organizationPartyId: "ORG_ZIZI_SERVICES"
            }),
            settings: refusal("mantle.ledger.SetupServices.get#Preferences", {organizationPartyId: "BOSS_ACCT_ORG"}),
            create: refusal("mantle.ledger.JournalServices.store#DraftEntry", readerDraft),
            // the same draft is made for a GL user
            glCreate: asFinance("finance.gl", enabled, () =>
                refusal("mantle.ledger.JournalServices.store#DraftEntry", readerDraft)
            ),
            glSettings: asFinance("finance.admin", enabled, () =>
                refusal("mantle.ledger.SetupServices.get#Preferences", {organizationPartyId: "BOSS_ACCT_ORG"})
            )
        }))
    },
    then({access, own, other, settings, create, glCreate, glSettings}) {
        access.capabilities.reportRead == true
        access.capabilities.glPost == false
        own.record.invoiceId == "BOSS_ACCT_INVOICE"
        other.includes("not available")
        settings.includes("admin authority is required")
        create.includes("glPost authority is required")
        glCreate == ""
        glSettings == ""
    }
})
feature("a reader has only the Accounting business launcher and no finance quick create", {
    when() {
        return asFinance("finance.read", true, () => {
            const rendered = ec.screen
                .makeTest()
                .rootScreen("component://webroot/screen/webroot.xml")
                .render("shellData", {}, null)
            return {
                status: rendered.status,
                data: JSON.parse(rendered.output)
            }
        })
    },
    then({status, data}) {
        status == 200
        data.apps.some(app => app.name === "Accounting")
        !data.apps.some(app => ["Products", "Projects", "Warehouse", "Purchasing"].includes(app.name))
        data.apps.find(app => app.name === "Accounting").providers.quickCreate.length == 0
    }
})
feature("the GL operator cannot change preferences, rates or terms even with artifact authz disabled", {
    when() {
        return asFinance("finance.gl", false, () => ({
            preferences: refusal("mantle.ledger.SetupServices.store#Preferences", {
                organizationPartyId: "BOSS_ACCT_ORG",
                settings: {invoiceIdPrefix: "BAD"},
                changeReason: "Denied"
            }),
            rates: refusal("mantle.ledger.CurrencyServices.store#Rate", {
                organizationPartyId: "BOSS_ACCT_ORG",
                uomId: "USD",
                toUomId: "EUR",
                conversionFactor: 1,
                fromDate: ec.user.nowTimestamp,
                rateSource: "test",
                changeReason: "Denied"
            }),
            terms: refusal("mantle.ledger.SetupServices.store#SettlementTerm", {
                organizationPartyId: "BOSS_ACCT_ORG",
                description: "Denied",
                termValue: 30,
                termValueUomId: "TF_day",
                changeReason: "Denied"
            })
        }))
    },
    then({preferences, rates, terms}) {
        preferences.includes("admin authority is required")
        rates.includes("admin authority is required")
        terms.includes("admin authority is required")
    }
})
feature("a finance admin can change the rates and terms the GL operator cannot, with the same parameters", {
    when() {
        return asFinance("finance.admin", false, () => ({
            rates: refusal("mantle.ledger.CurrencyServices.store#Rate", {
                organizationPartyId: "BOSS_ACCT_ORG",
                uomId: "USD",
                toUomId: "EUR",
                conversionFactor: 1,
                fromDate: ec.user.nowTimestamp,
                rateSource: "test",
                changeReason: "Allowed"
            }),
            terms: refusal("mantle.ledger.SetupServices.store#SettlementTerm", {
                organizationPartyId: "BOSS_ACCT_ORG",
                description: "Access spec term",
                termValue: 30,
                termValueUomId: "TF_day",
                changeReason: "Allowed"
            })
        }))
    },
    then({rates, terms}) {
        rates == ""
        terms == ""
    }
})
feature("Accounting root grants do not authorize Mantle REST financial mutators", {
    when() {
        return asFinance("finance.gl", true, () => {
            const failures = []
            for (const path of ["s1/mantle/gl/trans", "s1/mantle/invoices", "s1/mantle/payments"]) {
                const rendered = ec.screen
                    .makeTest()
                    .rootScreen("component://webroot/screen/webroot/rest.xml")
                    .render(path, {organizationPartyId: "BOSS_ACCT_ORG"}, "post")
                if (![401, 403].includes(rendered.status)) failures.push(path + ": " + rendered.status)
                ec.message.clearErrors()
            }
            return {failures}
        })
    },
    then({failures}) {
        failures == []
    }
})

feature("finance reads follow the view permissions, not group names or another app's edit permission", {
    when() {
        const groupId = "BOSS_SPEC_RECEIVABLE_VIEW"
        const readerId = "BOSS_PRD_READER"
        const make = (entity, fields) =>
            ec.service
                .sync()
                .name("create#" + entity)
                .parameters(fields)
                .disableAuthz()
                .call()
        const remove = (entity, conditions) => ec.entity.find(entity).condition(conditions).disableAuthz().deleteAll()
        const reach = () => {
            const capabilities = ec.resource
                .script("component://mr-mantle/service/mantle/ledger/AccountingPolicy.js")
                .capabilities()
            const link = ec.service
                .sync()
                .name("ironstone.commons.PaletteServices.get#RecordLink")
                .parameters({docType: "MantleInvoice", id: "BOSS_ACCT_INVOICE"})
                .disableAuthz()
                .call().url
            return {
                read: capabilities.read,
                link: link || null,
                list: !refusal("mantle.ledger.AccountingServices.find#Records", {kind: "invoices"})
            }
        }
        make("mantle.party.PartyRelationship", {
            partyRelationshipId: "BOSS_SPEC_READER_CORP",
            relationshipTypeEnumId: "PrtAgent",
            fromPartyId: readerId,
            toPartyId: "BOSS_ACCT_ORG",
            toRoleTypeId: "OrgInternal",
            fromDate: 0
        })
        make("moqui.security.UserGroup", {userGroupId: groupId, description: "Receivables view by permission alone"})
        try {
            make("moqui.security.UserGroupMember", {userGroupId: "BOSS_PROJECT_MANAGER", userId: readerId, fromDate: 0})
            const manager = asFinance("catalog.reader", false, reach)
            remove("moqui.security.UserGroupMember", {userGroupId: "BOSS_PROJECT_MANAGER", userId: readerId})
            make("moqui.security.UserGroupPermission", {userGroupId: groupId, userPermissionId: "RECEIVABLE_VIEW", fromDate: 0})
            make("moqui.security.UserGroupMember", {userGroupId: groupId, userId: readerId, fromDate: 0})
            const viewer = asFinance("catalog.reader", false, reach)
            return {manager, viewer}
        } finally {
            remove("moqui.security.UserGroupMember", {userId: readerId, userGroupId: groupId})
            remove("moqui.security.UserGroupMember", {userId: readerId, userGroupId: "BOSS_PROJECT_MANAGER"})
            remove("moqui.security.UserGroupPermission", {userGroupId: groupId})
            remove("moqui.security.UserGroup", {userGroupId: groupId})
            remove("mantle.party.PartyRelationship", {partyRelationshipId: "BOSS_SPEC_READER_CORP"})
        }
    },
    then({manager, viewer}) {
        manager.read == false
        manager.link == null
        manager.list == false
        viewer.read == true
        viewer.link.includes("Accounting/Receivables/InvoiceDetail")
        viewer.list == true
    }
})

const receivablesHelper = ec.resource.script("component://mr-boss/test/AccountingSpecLib.js")
const receivablesIds = receivablesHelper.ids
const receivablesReadCases = [
    ["mantle.account.InvoiceServices.get#InvoiceFinanceDetail", {invoiceId: receivablesIds.invoiceId}],
    ["mantle.account.InvoiceServices.find#Receivables", {}],
    ["mantle.account.InvoiceServices.get#ReceivableSummary", {}],
    ["mantle.account.InvoiceServices.get#InvoiceOutput", {invoiceId: receivablesIds.finalizedInvoiceId}],
    ["mantle.account.InvoiceServices.find#ApprovedTimeBilling", {}],
    ["mantle.account.CustomerFinanceServices.get#CustomerFinance", {customerPartyId: receivablesIds.customerPartyId}],
    ["ironstone.accounting.ReceivableServices.get#InvoiceContext", {invoiceId: receivablesIds.invoiceId}],
    ["ironstone.accounting.ReceivableServices.find#Invoices", {}],
    ["ironstone.accounting.ReceivableServices.get#BillingQueue", {}],
    ["ironstone.accounting.ReceivableServices.get#CustomerContext", {customerPartyId: receivablesIds.customerPartyId}]
].map(([service, parameters]) => ({
    service,
    parameters: Object.assign({organizationPartyId: receivablesIds.organizationPartyId}, parameters)
}))

feature("P4 read #service accepts AR and refuses AP for the same valid request with artifact authz disabled", {
    where: receivablesReadCases,
    when({service, parameters}) {
        const allowed = receivablesHelper.asUser("finance.ar", () => receivablesHelper.refusal(service, parameters), false)
        const denied = receivablesHelper.asUser("finance.ap", () => receivablesHelper.refusal(service, parameters), false)
        return {allowed, denied}
    },
    then({allowed, denied}) {
        allowed == ""
        denied.includes("PERMISSION_DENIED")
    }
})

feature("P4 read #service refuses a supplied organization outside the active selection with artifact authz disabled", {
    where: receivablesReadCases,
    when({service, parameters}) {
        return receivablesHelper.asUser(
            "finance.ar",
            () => ({
                allowed: receivablesHelper.refusal(service, parameters),
                denied: receivablesHelper.refusal(
                    service,
                    Object.assign({}, parameters, {
                        organizationPartyId: receivablesIds.foreignOrganizationPartyId
                    })
                )
            }),
            false
        )
    },
    then({allowed, denied}) {
        allowed == ""
        denied.toLowerCase().includes("organization")
    }
})

feature("supporting attachment discovery requires AR edit for the same real invoice file", {
    when() {
        const service = "mantle.account.InvoiceServices.get#InvoiceDeliveryAttachments"
        const parameters = {
            organizationPartyId: receivablesIds.organizationPartyId,
            invoiceId: receivablesIds.finalizedInvoiceId,
            attachmentContentIdList: ["BOSS_ACCT_AR_SUPPORT"]
        }
        return {
            allowed: receivablesHelper.asUser("finance.ar", () => receivablesHelper.call(service, parameters), false),
            ap: receivablesHelper.asUser("finance.ap", () => receivablesHelper.refusal(service, parameters), false),
            reader: receivablesHelper.asUser("finance.read", () => receivablesHelper.refusal(service, parameters), false),
            outside: receivablesHelper.asUser(
                "finance.ar",
                () =>
                    receivablesHelper.refusal(
                        service,
                        Object.assign({}, parameters, {organizationPartyId: receivablesIds.foreignOrganizationPartyId})
                    ),
                false
            )
        }
    },
    then({allowed, ap, reader, outside}) {
        allowed.attachmentRows.length == 1
        allowed.attachmentRows[0].invoiceContentId == "BOSS_ACCT_AR_SUPPORT"
        allowed.attachmentRows[0].fileName == "Scope.txt"
        !!allowed.attachmentRows[0].attachmentVersion
        allowed.attachmentRows[0].contentLocation == null
        ap.includes("PERMISSION_DENIED")
        ap.includes("RECEIVABLE_EDIT")
        reader.includes("PERMISSION_DENIED")
        reader.includes("RECEIVABLE_EDIT")
        outside.includes("ORGANIZATION_DENIED")
    }
})

feature("P4 batch review omits unavailable invoice values for AP while AR sees the same selected records", {
    when() {
        const parameters = {
            organizationPartyId: receivablesIds.organizationPartyId,
            invoiceIdList: [receivablesIds.invoiceId, receivablesIds.finalizedInvoiceId]
        }
        const review = () => receivablesHelper.call("ironstone.accounting.ReceivableServices.get#InvoiceBatchContext", parameters)
        return {
            ar: receivablesHelper.asUser("finance.ar", review, false),
            ap: receivablesHelper.asUser("finance.ap", review, false)
        }
    },
    then({ar, ap}) {
        ar.batchRows.length == 2
        ar.batchRows.every(row => row.available && row.totalText && row.customerName)
        ap.batchRows.length == 2
        ap.batchRows.every(row => !row.available && !row.totalText && !row.customerName)
    }
})

feature("customer statements require AR edit even when the reader can read the same invoices", {
    when() {
        const parameters = {
            organizationPartyId: receivablesIds.organizationPartyId,
            customerPartyIdList: [receivablesIds.customerPartyId],
            includeZeroBalance: true
        }
        const service = "mantle.account.CollectionServices.get#Statements"
        return {
            allowed: receivablesHelper.asUser("finance.ar", () => receivablesHelper.refusal(service, parameters), false),
            denied: receivablesHelper.asUser("finance.read", () => receivablesHelper.refusal(service, parameters), false)
        }
    },
    then({allowed, denied}) {
        allowed == ""
        denied.includes("PERMISSION_DENIED")
        denied.includes("RECEIVABLE_EDIT")
    }
})

feature("the finance approver approves another author's invoice while only AR may edit the draft", {
    when() {
        const service = "mantle.account.InvoiceServices."
        const invoiceId = receivablesHelper.asUser(
            "finance.ar",
            () => {
                const made = receivablesHelper.call(service + "create#Receivable", {
                    organizationPartyId: receivablesIds.organizationPartyId,
                    customerPartyId: receivablesIds.customerPartyId,
                    description: "Approval access fixture"
                })
                receivablesHelper.call(service + "store#InvoiceDraftItem", {
                    organizationPartyId: receivablesIds.organizationPartyId,
                    invoiceId: made.invoiceId,
                    itemTypeEnumId: "ItemTimeEntry",
                    quantity: 1,
                    amount: 10,
                    description: "Approval access services"
                })
                return made.invoiceId
            },
            false
        )
        const record = ec.entity.find("mantle.account.invoice.Invoice").condition("invoiceId", invoiceId).disableAuthz().one()
        const parameters = {
            organizationPartyId: receivablesIds.organizationPartyId,
            invoiceId,
            lastUpdatedStamp: record.lastUpdatedStamp,
            description: "Edited by AR"
        }
        const deniedReader = receivablesHelper.asUser(
            "finance.read",
            () => receivablesHelper.refusal(service + "store#InvoiceDraft", parameters),
            false
        )
        const deniedApprover = receivablesHelper.asUser(
            "finance.approve",
            () => receivablesHelper.refusal(service + "store#InvoiceDraft", parameters),
            false
        )
        const allowedEditor = receivablesHelper.asUser(
            "finance.ar",
            () => receivablesHelper.refusal(service + "store#InvoiceDraft", parameters),
            false
        )
        const current = ec.entity.find("mantle.account.invoice.Invoice").condition("invoiceId", invoiceId).disableAuthz().one()
        const approval = {
            organizationPartyId: receivablesIds.organizationPartyId,
            invoiceId,
            action: "approve",
            lastUpdatedStamp: current.lastUpdatedStamp,
            operationKey: "access-approve-" + ec.user.randomString(20),
            changeReason: "Separate finance approval"
        }
        const deniedEditor = receivablesHelper.asUser(
            "finance.ar",
            () => receivablesHelper.refusal(service + "change#InvoiceState", approval),
            false
        )
        const approved = receivablesHelper.asUser(
            "finance.approve",
            () => receivablesHelper.call(service + "change#InvoiceState", approval),
            false
        )
        const detail = () =>
            receivablesHelper.call(service + "get#InvoiceFinanceDetail", {
                organizationPartyId: receivablesIds.organizationPartyId,
                invoiceId: receivablesIds.invoiceId
            })
        return {
            deniedReader,
            deniedApprover,
            allowedEditor,
            deniedEditor,
            approved,
            editor: receivablesHelper.asUser("finance.ar", detail, false),
            approver: receivablesHelper.asUser("finance.approve", detail, false)
        }
    },
    then({deniedReader, deniedApprover, allowedEditor, deniedEditor, approved, editor, approver}) {
        deniedReader.includes("RECEIVABLE_EDIT")
        deniedApprover.includes("RECEIVABLE_EDIT")
        allowedEditor == ""
        deniedEditor.includes("INVOICE_APPROVE")
        approved.statusId == "InvoiceFinalized"
        editor.capabilities.canDraftEdit == true
        editor.capabilities.canApprove == false
        approver.capabilities.canDraftEdit == false
        approver.capabilities.canApprove == true
    }
})

feature("P4 server choices preserve selected labels outside the search page", {
    when() {
        return receivablesHelper.asUser(
            "finance.admin",
            () => {
                const service = "mantle.account.InvoiceServices."
                const organizationPartyId = receivablesIds.organizationPartyId
                // Own the source and credit used by the picker; shared demo invoices retain their original balances.
                const target = receivablesHelper.call(service + "create#Receivable", {
                    organizationPartyId,
                    customerPartyId: receivablesIds.customerPartyId,
                    description: "Choice source invoice"
                })
                receivablesHelper.call(service + "store#InvoiceDraftItem", {
                    organizationPartyId,
                    invoiceId: target.invoiceId,
                    itemTypeEnumId: "ItemTimeEntry",
                    quantity: 1,
                    amount: 25,
                    description: "Choice source services"
                })
                const finalize = invoiceId => {
                    const record = ec.entity
                        .find("mantle.account.invoice.Invoice")
                        .condition("invoiceId", invoiceId)
                        .disableAuthz()
                        .one()
                    return receivablesHelper.call(service + "change#InvoiceState", {
                        organizationPartyId,
                        invoiceId,
                        action: "finalize",
                        lastUpdatedStamp: record.lastUpdatedStamp,
                        operationKey: "choice-finalize-" + ec.user.randomString(20),
                        changeReason: "Prepare a valid selected choice"
                    })
                }
                finalize(target.invoiceId)
                const credit = receivablesHelper.call(service + "create#InvoiceCreditMemo", {
                    organizationPartyId,
                    originalInvoiceId: target.invoiceId,
                    amount: 5,
                    description: "Choice customer credit",
                    linkToOriginal: true,
                    allocateToLines: true,
                    operationKey: "choice-credit-" + ec.user.randomString(20)
                })
                finalize(credit.invoiceId)
                const bill = receivablesHelper.call("mantle.ledger.AccountingServices.create#DraftDocument", {
                    kind: "bills",
                    organizationPartyId,
                    otherPartyId: receivablesIds.customerPartyId,
                    description: "Choice supplier bill"
                })
                const reviewedContentId = "CHOICE_ATTACH_" + ec.user.randomString(20)
                const reviewedLocation =
                    "dbresource://mantle/content/invoice/" + target.invoiceId + "/content_" + reviewedContentId + "/Reviewed.txt"
                const reviewedFile = ec.resource.getLocationReference(reviewedLocation)
                reviewedFile.putText("The supporting scope reviewed by this test")
                receivablesHelper.call("create#mantle.account.invoice.InvoiceContent", {
                    invoiceContentId: reviewedContentId,
                    invoiceId: target.invoiceId,
                    contentLocation: reviewedLocation,
                    contentTypeEnumId: "IctInvoiceDocument",
                    description: "Reviewed customer attachment"
                })
                const nativeAttachmentParameters = {
                    organizationPartyId,
                    invoiceId: target.invoiceId,
                    attachmentContentIdList: [reviewedContentId]
                }
                const reviewedRow = receivablesHelper.call(service + "get#InvoiceDeliveryAttachments", nativeAttachmentParameters)
                    .attachmentRows[0]
                const reviewedToken = reviewedContentId + "~" + reviewedRow.attachmentVersion
                const cases = [
                    ...[
                        "parties",
                        "invoices",
                        "products",
                        "projects",
                        "terms",
                        "currencies",
                        "enum:ItemType",
                        "enum:InvoiceType"
                    ].map(choice => ({choice})),
                    {choice: "bills", selected: bill.recordId},
                    {choice: "receivableCredits", invoiceId: target.invoiceId, selected: credit.invoiceId},
                    {choice: "invoiceTypes", selected: "InvoiceSales"},
                    {choice: "invoiceStatuses", selected: "InvoiceFinalized"},
                    {
                        choice: "invoiceAttachments",
                        invoiceId: receivablesIds.finalizedInvoiceId,
                        selected: "BOSS_ACCT_AR_SUPPORT"
                    },
                    {choice: "reviewedInvoiceAttachments", invoiceId: target.invoiceId, selected: reviewedToken},
                    {choice: "invoiceItemTypes", selected: "ItemTimeEntry"},
                    {choice: "identificationTypes", selected: "PtidPassport"},
                    {choice: "bankAccountTypes", selected: "BatChecking"},
                    {choice: "taxAuthorities", selected: "UsaIrs"}
                ]
                const failures = []
                for (const entry of cases) {
                    const projectScope = entry.choice === "projects"
                    if (projectScope) receivablesHelper.selectOrganization(receivablesIds.foreignOrganizationPartyId)
                    try {
                        const parameters = Object.assign(
                            {
                                organizationPartyId:
                                    entry.choice === "projects" ? receivablesIds.foreignOrganizationPartyId : organizationPartyId
                            },
                            entry
                        )
                        const initial =
                            receivablesHelper.call("ironstone.accounting.AccessServices.get#Choices", parameters).options || []
                        const selected = entry.selected ? initial.find(row => row.value === entry.selected) : initial[0]
                        if (!selected) {
                            failures.push(entry.choice + ": required fixture option is absent")
                            continue
                        }
                        const term = "no-matching-accounting-fixture-92831"
                        const outside =
                            receivablesHelper.call(
                                "ironstone.accounting.AccessServices.get#Choices",
                                Object.assign({}, parameters, {term, selected: null})
                            ).options || []
                        if (outside.length) failures.push(entry.choice + ": search did not exclude the selected fixture")
                        const filtered =
                            receivablesHelper.call(
                                "ironstone.accounting.AccessServices.get#Choices",
                                Object.assign({}, parameters, {term, selected: selected.value})
                            ).options || []
                        if (!filtered.some(row => row.value === selected.value && row.label === selected.label))
                            failures.push(entry.choice + ": selected label was lost")
                    } finally {
                        if (projectScope) receivablesHelper.selectOrganization(organizationPartyId)
                    }
                }
                reviewedFile.putText("This source changed after its supporting bytes were reviewed")
                const currentRow = receivablesHelper.call(service + "get#InvoiceDeliveryAttachments", nativeAttachmentParameters)
                    .attachmentRows[0]
                if (currentRow.attachmentVersion === reviewedRow.attachmentVersion)
                    failures.push("reviewedInvoiceAttachments: source byte change did not change its version")
                const retained =
                    receivablesHelper.call("ironstone.accounting.AccessServices.get#Choices", {
                        organizationPartyId,
                        invoiceId: target.invoiceId,
                        choice: "reviewedInvoiceAttachments",
                        term: "no-matching-accounting-fixture-92831",
                        selected: reviewedToken
                    }).options || []
                if (!retained.some(row => row.value === reviewedToken && row.label.includes("Reviewed.txt")))
                    failures.push("reviewedInvoiceAttachments: original reviewed token was lost after source change")
                if (retained.some(row => row.value === reviewedContentId + "~" + currentRow.attachmentVersion))
                    failures.push("reviewedInvoiceAttachments: selection silently adopted the changed source version")
                if (JSON.stringify(retained).includes("dbresource://"))
                    failures.push("reviewedInvoiceAttachments: choice exposed an archive location")
                return {failures}
            },
            false
        )
    },
    then({failures}) {
        failures == []
    }
})

feature("a linked customer credit remains an AR record in the common reads and never appears as an AP bill", {
    when() {
        const credit = receivablesHelper.asUser(
            "finance.ar",
            () =>
                receivablesHelper.call("mantle.account.InvoiceServices.create#InvoiceCreditMemo", {
                    organizationPartyId: receivablesIds.organizationPartyId,
                    originalInvoiceId: receivablesIds.finalizedInvoiceId,
                    amount: 5,
                    description: "Credit access fixture",
                    linkToOriginal: true,
                    allocateToLines: true,
                    operationKey: "access-credit-" + ec.user.randomString(20)
                }),
            false
        )
        const invoiceId = credit.invoiceId
        const parameters = {organizationPartyId: receivablesIds.organizationPartyId, recordId: invoiceId}
        const list = kind =>
            receivablesHelper.call("mantle.ledger.AccountingServices.find#Records", Object.assign({}, parameters, {kind}))
        return {
            invoiceId,
            ar: receivablesHelper.asUser(
                "finance.ar",
                () => ({
                    record: receivablesHelper.call(
                        "mantle.ledger.AccountingServices.get#Record",
                        Object.assign({}, parameters, {kind: "invoices"})
                    ).record,
                    records: list("invoices").records
                }),
                false
            ),
            ap: receivablesHelper.asUser(
                "finance.ap",
                () => ({
                    denied: receivablesHelper.refusal(
                        "mantle.ledger.AccountingServices.get#Record",
                        Object.assign({}, parameters, {kind: "bills"})
                    ),
                    records: list("bills").records
                }),
                false
            )
        }
    },
    then({invoiceId, ar, ap}) {
        !!invoiceId
        ar.record.invoiceId == invoiceId
        ar.records.some(row => row.invoiceId === invoiceId)
        ap.denied.includes("not available")
        !ap.records.some(row => row.invoiceId === invoiceId)
    }
})

feature("invoice header controls pair the approver, editor and reader capabilities", {
    when() {
        const render = () => receivablesHelper.page("Receivables/InvoiceDetail", {recordId: receivablesIds.invoiceId}, "html")
        return {
            approver: receivablesHelper.asUser("finance.approve", render),
            editor: receivablesHelper.asUser("finance.ar", render),
            reader: receivablesHelper.asUser("finance.read", render)
        }
    },
    then({approver, editor, reader}) {
        approver.status == 200
        editor.status == 200
        reader.status == 200
        approver.errors == []
        editor.errors == []
        reader.errors == []
        approver.output.includes("Approve invoice")
        !approver.output.includes("Edit invoice")
        editor.output.includes("Edit invoice")
        editor.output.includes("Finalize invoice")
        !editor.output.includes("Approve invoice")
        !reader.output.includes("Approve invoice")
        !reader.output.includes("Finalize invoice")
        !reader.output.includes("Edit invoice")
    }
})
