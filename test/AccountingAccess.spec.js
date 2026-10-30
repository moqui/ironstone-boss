const native = (service, p = {}) =>
    ec.service
        .sync()
        .name("mantle.ledger." + service)
        .parameters(p)
        .call() || {}
function asFinance(user, enabled, run) {
    login(user)
    const disabled = ec.artifactExecution.authzDisabled()
    if (enabled) ec.artifactExecution.enableAuthz()
    else ec.artifactExecution.disableAuthz()
    try {
        return run()
    } finally {
        ec.message.clearErrors()
        if (disabled) ec.artifactExecution.disableAuthz()
        else ec.artifactExecution.enableAuthz()
        login("john.doe")
    }
}
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
