// App routing and shell shapes. Native services remain the finance authority.
const policy = ec.resource.script("component://mr-mantle/service/mantle/ledger/AccountingPolicy.js")

// The list and detail screen of each record kind, under the app root.
const listPaths = {
    invoices: "Receivables/Invoices",
    bills: "Payables/Bills",
    payments: "Payments/Payments",
    accounts: "GeneralLedger/ChartOfAccounts",
    journals: "GeneralLedger/JournalEntries"
}
const detailPaths = {
    invoices: "Receivables/InvoiceDetail",
    bills: "Payables/BillDetail",
    payments: "Payments/PaymentDetail",
    accounts: "GeneralLedger/AccountDetail",
    journals: "GeneralLedger/JournalEntryDetail"
}
const choiceLimit = 30

function recordUrl(kind, recordId) {
    return "/qapps/Accounting/" + detailPaths[kind] + "?recordId=" + encodeURIComponent(recordId)
}

// The Accounting detail URL of a record the user may read, else null. An invoice opens as a bill when the user reads it
// from the payable side.
function recordLink(kind, recordId) {
    if (!policy.capabilities().read) return null
    for (const candidate of kind === "invoices" ? ["invoices", "bills"] : [kind]) {
        try {
            if (policy.query({kind: candidate, recordId}).q.count()) return recordUrl(candidate, recordId)
        } catch (error) {
            ec.logger.debug("Accounting " + candidate + " link unavailable: " + error.message)
        }
    }
    return null
}

function access(parameters) {
    if (parameters.appRoot && parameters.appRoot !== "Accounting") throw new Error("Unknown accounting mount")
    const linkPaths = [
        ...Object.values(listPaths),
        ...Object.values(detailPaths),
        "Home",
        "Receivables/Customer360",
        "Receivables/BillingQueue",
        "Receivables/Statements",
        "Receivables/StatementPrint",
        "Receivables/InvoiceBatch",
        "Receivables/InvoicePrint",
        "Reports/TrialBalance",
        "Reports/GeneralLedger"
    ]
    return Object.assign(policy.scope(parameters), {
        appRoot: "Accounting",
        linkBase: "//Accounting",
        webBase: "/qapps/Accounting",
        sharedLinks: Object.fromEntries(linkPaths.map(path => [path, "//Accounting/" + path]))
    })
}

// A count or health read that fails is named as unavailable; the others still show.
function probe(name, parameters) {
    ec.message.pushErrors()
    try {
        const out = ec.service.sync().name(name).parameters(parameters).disableAuthz().requireNewTransaction(true).call()
        if (ec.message.hasError()) throw new Error(ec.message.getErrorsString())
        return out
    } finally {
        ec.message.clearErrors()
        ec.message.popErrors()
    }
}

function summary(parameters) {
    const scope = access(parameters)
    const counts = {
        unposted: null,
        posted: null,
        accounts: null,
        periods: null,
        arDue: null,
        arOverdue: null,
        apDue: null,
        bank: null
    }
    const findings = []
    if (scope.capabilities.reportRead || scope.capabilities.glPost) {
        for (const [counter, kind, extra] of [
            ["unposted", "journals", {isPosted: "N"}],
            ["posted", "journals", {isPosted: "Y"}],
            ["accounts", "accounts", {}],
            ["periods", "periods", {}]
        ]) {
            try {
                const out = probe(
                    "mantle.ledger.AccountingServices.find#Records",
                    Object.assign({kind, organizationPartyId: scope.organizationPartyId, pageSize: 1}, extra)
                )
                counts[counter] = out.recordCount
            } catch (error) {
                ec.logger.error("Accounting Home " + counter + " count: " + error.message)
                findings.push(counter + " count is unavailable")
            }
        }
    }
    try {
        const out = probe("mantle.ledger.SetupServices.get#Readiness", {organizationPartyId: scope.organizationPartyId})
        findings.push(...(out.findings || []).map(row => row.code + ": " + row.message))
    } catch (error) {
        ec.logger.error("Accounting Home setup health: " + error.message)
        findings.push("Setup health is unavailable")
    }
    counts.asOf = ec.l10n.format(ec.user.nowTimestamp, "yyyy-MM-dd HH:mm:ss")
    return {summary: counts, findings, workRows: []}
}

function search(parameters) {
    access(parameters)
    const rows = []
    const limit = Math.max(1, Math.min(20, Number(parameters.limit || 5)))
    for (const kind of Object.keys(listPaths)) {
        try {
            const found = policy.query({kind, text: parameters.text, organizationPartyId: parameters.organizationPartyId})
            for (const record of Array.from(found.q.limit(limit).list())) {
                const recordId = record[found.kind[1]]
                rows.push({
                    title: record.accountName || record.description || String(recordId),
                    subtitle: kind,
                    icon: "sym_o_account_balance",
                    url: recordUrl(kind, recordId)
                })
            }
        } catch (error) {
            ec.logger.warn("Accounting palette " + kind + ": " + error.message)
        }
    }
    return {rows: rows.slice(0, limit)}
}

// Choices: each source finds the authorized rows, searches its fields ignoring case in the query, and labels a row.

function matching(query, fields, term) {
    if (!term) return query
    const conditions = ec.entity.conditionFactory
    const any = fields.map(field => conditions.makeCondition(field, "like", "%" + term + "%").ignoreCase())
    return query.condition(conditions.makeCondition(any, "or"))
}
function accountLabel(row) {
    return (row.accountCode || row.glAccountId) + " — " + row.accountName
}
function recordLabel(row, idField) {
    return row.glJournalName || row.templateName || row.periodName || row.description || row.changeReason || row[idField]
}
function entitySource(entity, idField, labelField, scoped = query => query) {
    return {
        find: parameters => scoped(policy.find(entity), parameters).orderBy(labelField),
        fields: [idField, labelField],
        value: row => row[idField],
        label: row => row[labelField] || row[idField]
    }
}
function ownedBy(chain) {
    return (query, parameters) => {
        const organizationPartyId = policy.organization(parameters).organizationPartyId
        const owners = chain ? ["_NA_", ...policy.organizationChain(organizationPartyId)] : [organizationPartyId]
        return query.condition("ownerPartyId", "in", owners)
    }
}
function recordSource(kind, conditions = {}, statusIds = null) {
    const idField = policy.kinds[kind][1]
    const query = (parameters, term, recordId = null) => {
        let found = policy
            .query({kind, organizationPartyId: parameters.organizationPartyId, text: term, recordId})
            .q.condition(conditions)
        if (statusIds) found = found.condition("statusId", "in", statusIds)
        return found
    }
    return {
        // The search text goes through the policy's query, which matches each kind's own names.
        find: (parameters, term) => query(parameters, term),
        searchedByPolicy: true,
        value: row => row[idField],
        label: row => recordLabel(row, idField),
        selected: (parameters, id) => query(parameters, null, id).one()
    }
}
function uomSource(uomTypeEnumId) {
    return {
        find: () => policy.find("moqui.basic.Uom", {uomTypeEnumId}).orderBy("description"),
        fields: ["uomId", "description"],
        value: row => row.uomId,
        label: row => row.description || row.uomId
    }
}
function organizationSource(idsOf) {
    return {
        find: (parameters, term, scope) => {
            const ids = idsOf(scope, parameters)
            return policy
                .find("mantle.party.Organization")
                .condition("partyId", "in", ids.length ? ids : ["_DENIED_"])
                .orderBy("organizationName")
        },
        fields: ["partyId", "organizationName"],
        value: row => row.partyId,
        label: row => row.organizationName || row.partyId
    }
}
function postingAccounts(parameters, term) {
    const conditions = ec.entity.conditionFactory
    return policy
        .query({kind: "accounts", organizationPartyId: parameters.organizationPartyId, text: term})
        .q.condition(
            conditions.makeCondition(
                [
                    conditions.makeCondition("disallowPosting", "not-equals", "Y"),
                    conditions.makeCondition("disallowPosting", "is-null", null)
                ],
                "or"
            )
        )
        .orderBy("accountCode")
}
function chartAccounts(parameters, term) {
    return policy
        .query({kind: "accounts", organizationPartyId: parameters.organizationPartyId, text: term})
        .q.orderBy("accountCode")
}
function unassignedAccounts(parameters) {
    const organizationPartyId = policy.organization(parameters, "glPost").organizationPartyId
    const assigned = policy
        .organizationChain(organizationPartyId)
        .flatMap(id =>
            policy.rows("mantle.ledger.account.GlAccountOrganization", {organizationPartyId: id}).map(row => row.glAccountId)
        )
    const query = policy.find("mantle.ledger.account.GlAccount").orderBy("accountCode")
    return assigned.length ? query.condition("glAccountId", "not-in", assigned) : query
}
function rollupChildren(parameters) {
    const organizationPartyId = policy.organization(parameters).organizationPartyId
    const ids = policy
        .rows("mantle.party.PartyRelationship", {toPartyId: organizationPartyId, relationshipTypeEnumId: "PrtOrgRollup"})
        .filter(row => policy.active(row))
        .map(row => row.fromPartyId)
    return policy
        .find("mantle.party.Organization")
        .condition("partyId", "in", ids.length ? ids : ["_DENIED_"])
        .orderBy("organizationName")
}
function counterparties() {
    // Organizations only, keeping the private-contact rule that disabling authz would otherwise drop.
    const conditions = ec.entity.conditionFactory
    return ec.entity
        .find("mantle.party.PartyDetail")
        .disableAuthz()
        .condition("partyTypeEnumId", "PtyOrganization")
        .condition(
            conditions.makeCondition(
                [
                    conditions.makeCondition("privateOwnerUserId", "is-null", null),
                    conditions.makeCondition("privateOwnerUserId", "equals", ec.user.userId)
                ],
                "or"
            )
        )
        .orderBy("organizationName")
}
function adminOnly(entity, orderField) {
    return parameters => {
        policy.organization(parameters, "admin")
        return policy.find(entity).orderBy(orderField)
    }
}

function receivableCredits(parameters) {
    const invoice = policy.record({
        kind: "invoices",
        recordId: parameters.invoiceId,
        organizationPartyId: parameters.organizationPartyId
    })
    return policy
        .find("mantle.account.invoice.Invoice", {
            invoiceTypeEnumId: "InvoiceCreditMemo",
            fromPartyId: invoice.toPartyId,
            toPartyId: invoice.fromPartyId,
            currencyUomId: invoice.currencyUomId
        })
        .condition("statusId", "in", ["InvoiceFinalized", "InvoiceSent", "InvoiceAcked"])
        .orderBy("invoiceDate,invoiceId")
}

const enumTypes = [
    "GlAccountClass",
    "GlAccountType",
    "InvoiceType",
    "ItemType",
    "AcctgTransType",
    "PaymentType",
    "PaymentInstrument",
    "InvoiceSequence",
    "AssetType",
    "AssetClass",
    "GlAccountGroupType",
    "FinancialAccountTransReason",
    "InventoryVarianceReason",
    "PartyIdType",
    "BankAccountType"
]
const accountRow = {value: row => row.glAccountId, label: accountLabel, searchedByPolicy: true}
const choiceSources = {
    accounts: Object.assign(
        {find: postingAccounts, selected: (parameters, id) => postingAccounts(parameters).condition("glAccountId", id).one()},
        accountRow
    ),
    accountParents: Object.assign(
        {
            find: chartAccounts,
            // A parent outside the organization's chart is shown when one of the chart's accounts rolls up to it.
            selected: (parameters, id) =>
                chartAccounts(parameters).condition("parentGlAccountId", id).count()
                    ? policy.one("mantle.ledger.account.GlAccount", {glAccountId: id})
                    : chartAccounts(parameters).condition("glAccountId", id).one()
        },
        accountRow
    ),
    unassignedAccounts: {
        find: unassignedAccounts,
        fields: ["glAccountId", "accountCode", "accountName"],
        value: row => row.glAccountId,
        label: accountLabel,
        // The selected account stays labelled after it is assigned.
        selected: (parameters, id) => {
            policy.organization(parameters, "glPost")
            return policy.one("mantle.ledger.account.GlAccount", {glAccountId: id})
        }
    },
    drafts: recordSource("journals", {isPosted: "N"}),
    invoices: recordSource("invoices", {statusId: "InvoiceInProcess"}),
    bills: recordSource("bills", {}, ["InvoiceIncoming", "InvoiceReceived"]),
    journals: recordSource("journals"),
    batches: recordSource("batches"),
    templates: recordSource("templates"),
    locks: recordSource("locks"),
    periods: recordSource("periods"),
    products: entitySource("mantle.product.Product", "productId", "productName", ownedBy(true)),
    projects: entitySource("mantle.work.effort.WorkEffort", "workEffortId", "workEffortName", (query, parameters) =>
        ownedBy(false)(query.condition("workEffortTypeEnumId", "WetProject"), parameters)
    ),
    categories: entitySource("mantle.product.category.ProductCategory", "productCategoryId", "categoryName", ownedBy(true)),
    assets: entitySource("mantle.product.asset.Asset", "assetId", "assetName", ownedBy(false)),
    financialTypes: entitySource("mantle.account.financial.FinancialAccountType", "finAccountTypeId", "description"),
    roles: entitySource("mantle.party.RoleType", "roleTypeId", "description"),
    accountCategories: entitySource("mantle.ledger.account.GlAccountCategory", "glAccountCategoryId", "description"),
    accountGroups: entitySource("mantle.ledger.account.GlAccountGroup", "glAccountGroupId", "description"),
    facilities: {
        find: parameters => ownedBy(false)(policy.find("mantle.facility.Facility"), parameters).orderBy("facilityName"),
        fields: ["facilityId", "facilityName"],
        value: row => row.facilityId,
        label: row => row.facilityName || row.facilityId
    },
    costCenters: {
        find: rollupChildren,
        fields: ["partyId", "organizationName"],
        value: row => row.partyId,
        label: row => row.organizationName || row.partyId
    },
    terms: {
        find: () => policy.find("mantle.account.invoice.SettlementTerm").orderBy("description"),
        fields: ["settlementTermId", "description"],
        value: row => row.settlementTermId,
        label: row => row.description || row.settlementTermId
    },
    receivableCredits: {
        find: receivableCredits,
        fields: ["invoiceId", "description", "referenceNumber"],
        value: row => row.invoiceId,
        label: row => row.invoiceId + (row.description ? " — " + row.description : "")
    },
    taxAuthorities: entitySource("mantle.other.tax.TaxAuthority", "taxAuthorityId", "description"),
    timeUnits: uomSource("UT_TIME_FREQ_MEASURE"),
    currencies: uomSource("UT_CURRENCY_MEASURE"),
    users: {
        find: adminOnly("moqui.security.UserAccount", "userFullName"),
        fields: ["userId", "username", "userFullName"],
        value: row => row.userId,
        label: row => row.userFullName || row.username || row.userId
    },
    groups: {
        find: adminOnly("moqui.security.UserGroup", "description"),
        fields: ["userGroupId", "description"],
        value: row => row.userGroupId,
        label: row => row.description || row.userGroupId
    },
    organizations: organizationSource(scope => scope.allowedOrganizationPartyIds),
    allOrganizations: organizationSource(scope => scope.organizationPartyIds),
    parties: {
        find: counterparties,
        fields: ["partyId", "organizationName"],
        value: row => row.partyId,
        label: row => row.organizationName || row.partyId
    }
}
for (const enumTypeId of enumTypes) {
    choiceSources["enum:" + enumTypeId] = {
        find: () => policy.find("moqui.basic.Enumeration", {enumTypeId}).orderBy("sequenceNum,description"),
        fields: ["enumId", "description"],
        value: row => row.enumId,
        label: row => row.description || row.enumId
    }
}
choiceSources.invoiceTypes = choiceSources["enum:InvoiceType"]
choiceSources.invoiceStatuses = {
    find: () =>
        policy
            .find("moqui.basic.StatusItem", {statusTypeId: "Invoice"})
            .condition("statusId", "in", [
                "InvoiceInProcess",
                "InvoiceFinalized",
                "InvoiceSent",
                "InvoiceAcked",
                "InvoicePmtRecvd",
                "InvoiceWriteOff",
                "InvoiceCancelled"
            ])
            .orderBy("sequenceNum,description"),
    fields: ["statusId", "description"],
    value: row => row.statusId,
    label: row => row.description || row.statusId
}
choiceSources.invoiceItemTypes = choiceSources["enum:ItemType"]
choiceSources.identificationTypes = choiceSources["enum:PartyIdType"]
choiceSources.bankAccountTypes = choiceSources["enum:BankAccountType"]

function choices(parameters) {
    const scope = access(parameters)
    if (["invoiceAttachments", "reviewedInvoiceAttachments"].includes(parameters.choice)) {
        let selected = parameters.selected || []
        if (!Array.isArray(selected)) {
            const text = String(selected)
            selected = text.startsWith("[") ? JSON.parse(text) : text.split(",").filter(Boolean)
        }
        selected = selected.map(String)
        const reviewed = parameters.choice === "reviewedInvoiceAttachments"
        const selectedId = value => (reviewed ? value.split("~")[0] : value)
        const request = {invoiceId: parameters.invoiceId, organizationPartyId: scope.organizationPartyId}
        const result = policy.call("mantle.account.InvoiceServices.get#InvoiceDeliveryAttachments", request)
        const rows = Array.from(result.attachmentRows || [])
        const missing = [...new Set(selected.map(selectedId).filter(id => !rows.some(row => row.invoiceContentId === id)))]
        if (missing.length) {
            const explicit = policy.call(
                "mantle.account.InvoiceServices.get#InvoiceDeliveryAttachments",
                Object.assign({}, request, {attachmentContentIdList: missing})
            )
            rows.push(...Array.from(explicit.attachmentRows || []))
        }
        const label = row =>
            (row.description ? row.description + " · " : "") +
            row.fileName +
            " (" +
            ec.l10n.format(row.contentSize, "#,##0") +
            " bytes)"
        const value = row => (reviewed ? row.invoiceContentId + "~" + row.attachmentVersion : row.invoiceContentId)
        const term = String(parameters.term || "")
            .trim()
            .toLocaleLowerCase()
        const matches = rows.filter(
            row =>
                !term ||
                [row.invoiceContentId, row.fileName, row.description].some(text =>
                    String(text || "")
                        .toLocaleLowerCase()
                        .includes(term)
                )
        )
        const options = matches.slice(0, choiceLimit).map(row => ({value: value(row), label: label(row)}))
        for (const chosen of selected) {
            const row = rows.find(row => row.invoiceContentId === selectedId(chosen))
            // Retain the reviewed version. A changed live file must fail the native stale check when sent.
            const retained = reviewed && chosen.includes("~") ? chosen : row && value(row)
            if (row && !options.some(option => option.value === retained)) options.push({value: retained, label: label(row)})
        }
        return {options}
    }
    const source = choiceSources[parameters.choice]
    if (!source) throw new Error("Unknown accounting choice " + parameters.choice)
    const term = String(parameters.term || "").trim()
    const query = source.find(parameters, term, scope)
    const found = source.searchedByPolicy ? query : matching(query, source.fields, term)
    const options = Array.from(found.limit(choiceLimit).list()).map(row => ({value: source.value(row), label: source.label(row)}))
    const selectedId = parameters.selected
    if (selectedId && !options.some(option => option.value === selectedId)) {
        const row = source.selected
            ? source.selected(parameters, selectedId)
            : source.find(parameters, "", scope).condition(source.fields[0], selectedId).one()
        if (row) options.push({value: source.value(row), label: source.label(row)})
    }
    return {options}
}

function selectOrganization(parameters) {
    const scope = policy.access()
    const organizationPartyId = parameters.organizationPartyId || null
    if (organizationPartyId && !scope.organizationPartyIds.includes(organizationPartyId))
        throw new Error("Accounting organization is not available")
    ec.user.setPreference("ACTIVE_ORGANIZATION", organizationPartyId)
    policy.call("mantle.party.PartyServices.setup#UserOrganizationInfo")
    return {organizationPartyId}
}

const operations = {selectOrganization, access, summary, search, choices}
;({
    recordLink,
    execute: (op, parameters) => {
        if (!operations[op]) throw new Error("Unknown Accounting operation " + op)
        return operations[op](parameters)
    }
})
