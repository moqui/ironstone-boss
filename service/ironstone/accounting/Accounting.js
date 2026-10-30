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
        "Receivables/ReceivablesWorkbench",
        "Payments/GatewayTransactions",
        "Payments/PaymentPrint",
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
const probe = policy.probe

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
// The statuses of Mantle's receivable invoice status flow.
choiceSources.invoiceStatuses = {
    find: () =>
        policy
            .find("moqui.basic.StatusItem", {statusTypeId: "Invoice"})
            .condition(
                "statusId",
                "in",
                policy.rows("moqui.basic.StatusFlowItem", {statusFlowId: "InvoiceReceivable"}).map(row => row.statusId)
            )
            .orderBy("sequenceNum,description"),
    fields: ["statusId", "description"],
    value: row => row.statusId,
    label: row => row.description || row.statusId
}
choiceSources.invoiceItemTypes = choiceSources["enum:ItemType"]
choiceSources.identificationTypes = choiceSources["enum:PartyIdType"]
choiceSources.bankAccountTypes = choiceSources["enum:BankAccountType"]
choiceSources.paymentParties = choiceSources.parties
choiceSources.paymentInstruments = choiceSources["enum:PaymentInstrument"]
choiceSources.paymentDraftInstruments = Object.assign({}, choiceSources.paymentInstruments, {
    find: () => choiceSources.paymentInstruments.find().condition("enumId", "not-in", ["PiWriteOff", "PiDiscount"])
})
choiceSources.paymentStatuses = {
    find: () => policy.find("moqui.basic.StatusItem", {statusTypeId: "Payment"}).orderBy("sequenceNum,description"),
    fields: ["statusId", "description"],
    value: row => row.statusId,
    label: row => row.description || row.statusId
}

function selectedValues(value) {
    if (value == null || value === "") return []
    const parsed = Array.isArray(value)
        ? value
        : String(value).startsWith("[")
          ? JSON.parse(String(value))
          : String(value).split(",")
    if (!Array.isArray(parsed) || parsed.length > 200) throw new Error("Choose at most 200 records")
    return [...new Set(parsed.filter(value => value != null && value !== "").map(String))]
}
function paymentChoices(parameters, scope) {
    const chosen = selectedValues(parameters.selected),
        native = "mantle.account.PaymentServices.",
        request = {organizationPartyId: scope.organizationPartyId}
    if (parameters.choice === "internalTransferFeeAccounts") {
        const result = policy.call(
                native + "find#InternalTransferFeeAccounts",
                Object.assign({}, request, {
                    effectiveDate: parameters.effectiveDate,
                    text: parameters.term || null,
                    selectedIdList: chosen,
                    pageIndex: 0,
                    pageSize: choiceLimit
                })
            ),
            options = []
        for (const row of [...Array.from(result.rows || []), ...Array.from(result.selectedRows || [])])
            if (!options.some(option => option.value === row.glAccountId))
                options.push({value: row.glAccountId, label: accountLabel(row)})
        if (result.complete === false || result.incomplete)
            options.push({
                value: "unavailable:internalTransferFeeAccounts",
                label: "Some transfer fee accounts are unavailable",
                disable: true
            })
        return {options}
    }
    if (parameters.choice === "payments") {
        const result = policy.call(
            native + "find#Payments",
            Object.assign({}, request, {
                queue: "all",
                text: parameters.term || null,
                pageIndex: 0,
                pageSize: choiceLimit,
                selectedPaymentIdList: chosen
            })
        )
        const options = [],
            label = row =>
                [row.paymentId, row.partyName, ec.l10n.formatCurrency(row.amount, row.currencyUomId)].filter(Boolean).join(" · ")
        for (const row of [...Array.from(result.rows || []), ...Array.from(result.selectedRows || [])])
            if (!options.some(option => option.value === row.paymentId)) options.push({value: row.paymentId, label: label(row)})
        if (result.incomplete || result.complete === false)
            options.push({value: "unavailable:payments", label: "Some payment choices are unavailable", disable: true})
        return {options}
    }
    if (parameters.choice === "paymentGatewayProviders") {
        const result = policy.call(
            native + "find#PaymentGatewayProviders",
            Object.assign({}, request, {
                text: parameters.term || null,
                selectedIdList: chosen,
                pageIndex: 0,
                pageSize: choiceLimit
            })
        )
        const options = []
        for (const row of [...Array.from(result.rows || []), ...Array.from(result.selectedRows || [])])
            if (!options.some(option => option.value === row.paymentGatewayConfigId))
                options.push({value: row.paymentGatewayConfigId, label: row.description || row.paymentGatewayConfigId})
        if (result.complete === false)
            options.push({
                value: "unavailable:paymentGatewayProviders",
                label: "Some provider choices are unavailable",
                disable: true
            })
        return {options}
    }
    const decode = ec.resource.script("component://mr-boss/service/ironstone/accounting/Payments.js").reviewedToken,
        selections = chosen.map(token => ({token, ...decode(token, "reviewed item")}))
    let rows,
        selectedRows,
        idField,
        label,
        incomplete = false
    if (parameters.choice === "internalTransferMethods") {
        const result = policy.call(
            native + "find#InternalTransferMethods",
            Object.assign({}, request, {
                currencyUomId: parameters.currencyUomId,
                effectiveDate: parameters.effectiveDate,
                text: parameters.term || null,
                selectedIdList: selections.map(item => item.id),
                pageIndex: 0,
                pageSize: choiceLimit
            })
        )
        rows = Array.from(result.rows || [])
        selectedRows = Array.from(result.selectedRows || [])
        idField = "paymentMethodId"
        label = row => row.label || row.paymentMethodId
        incomplete = result.incomplete || result.complete === false
    } else if (["reviewedOrganizationPaymentMethods", "reviewedCounterpartyPaymentMethods"].includes(parameters.choice)) {
        const result = policy.call(
            native + "find#PaymentMethods",
            Object.assign({}, request, {
                cashDirection: parameters.cashDirection,
                methodRole: parameters.choice === "reviewedOrganizationPaymentMethods" ? "organization" : "counterparty",
                partyId: parameters.partyId,
                currencyUomId: parameters.currencyUomId,
                effectiveDate: parameters.effectiveDate,
                text: parameters.term || null,
                pageIndex: 0,
                pageSize: choiceLimit,
                selectedPaymentMethodIdList: selections.map(item => item.id)
            })
        )
        rows = Array.from(result.rows || [])
        selectedRows = Array.from(result.selectedRows || [])
        idField = "paymentMethodId"
        label = row => row.label || row.description || row.typeDescription || row.paymentMethodId
        incomplete = result.incomplete || result.complete === false
    } else if (parameters.choice === "reviewedRefundDrafts") {
        const result = policy.call(
            native + "find#PaymentRefundDrafts",
            Object.assign({}, request, {
                paymentId: parameters.paymentId,
                effectiveDate: parameters.effectiveDate,
                text: parameters.term || null,
                selectedPaymentIdList: selections.map(item => item.id),
                pageIndex: 0,
                pageSize: choiceLimit
            })
        )
        const project = row => Object.assign({}, row, {version: row.sourceVersion})
        rows = Array.from(result.rows || []).map(project)
        selectedRows = Array.from(result.selectedRows || []).map(project)
        idField = "paymentId"
        label = row =>
            row.label ||
            [
                row.paymentId,
                row.partyName,
                row.amount != null && row.currencyUomId ? ec.l10n.formatCurrency(row.amount, row.currencyUomId) : ""
            ]
                .filter(Boolean)
                .join(" · ")
        incomplete = result.complete === false || result.incomplete
    } else if (parameters.choice === "reviewedPaymentGatewayBindings") {
        const result = policy.call(
            native + "find#PaymentGatewayBindings",
            Object.assign({}, request, {
                paymentId: parameters.paymentId,
                action: parameters.action,
                effectiveDate: parameters.effectiveDate,
                text: parameters.term || null,
                selectedIdList: selections.map(item => item.id),
                pageIndex: 0,
                pageSize: choiceLimit
            })
        )
        const project = row => Object.assign({}, row, {version: row.bindingVersion})
        rows = Array.from(result.rows || []).map(project)
        selectedRows = Array.from(result.selectedRows || []).map(project)
        idField = "paymentGatewayConfigId"
        label = row => row.description || row.paymentGatewayConfigId
        incomplete = result.complete === false
    } else {
        const detail = policy.call(
            native + "get#PaymentFinanceDetail",
            Object.assign({}, request, {paymentId: parameters.paymentId})
        )
        const evidence = parameters.choice === "reviewedPaymentEvidence"
        rows = Array.from(evidence ? detail.evidenceRows || [] : detail.applicationRows || [])
        if (!evidence) rows = rows.filter(row => toDecimal(row.amountApplied || 0).compare(0) > 0)
        selectedRows = rows
        idField = evidence ? "paymentContentId" : "paymentApplicationId"
        label = evidence
            ? row =>
                  [row.description, row.fileName, ec.l10n.format(row.contentSize, "#,##0") + " bytes"].filter(Boolean).join(" · ")
            : row =>
                  [
                      row.paymentApplicationId,
                      row.invoiceId || row.toInvoiceId || row.toPaymentId,
                      ec.l10n.formatCurrency(row.amountApplied, row.currencyUomId)
                  ]
                      .filter(Boolean)
                      .join(" · ")
        incomplete = detail.incomplete || detail.complete === false || (evidence && detail.evidenceIncomplete)
        const term = String(parameters.term || "")
            .trim()
            .toLocaleLowerCase()
        rows = rows.filter(
            row =>
                !term ||
                [row[idField], label(row)].some(value =>
                    String(value || "")
                        .toLocaleLowerCase()
                        .includes(term)
                )
        )
    }
    const options = rows.slice(0, choiceLimit).map(row => ({value: row[idField] + "~" + row.version, label: label(row)}))
    for (const item of selections) {
        const row = selectedRows.find(row => row[idField] === item.id)
        if (row && !options.some(option => option.value === item.token))
            options.push({
                value: item.token,
                label: label(row) + (row.version !== item.version ? " · Changed since selection" : "")
            })
    }
    if (incomplete)
        options.push({
            value: "unavailable:" + parameters.choice,
            label: "Some choices are unavailable; review the payment details",
            disable: true
        })
    return {options}
}
function settlementChoices(parameters, scope) {
    const chosen = selectedValues(parameters.selected)
    if (parameters.choice === "settlementAdjustmentAccounts") {
        const result = policy.call("mantle.account.PaymentServices.find#SettlementAdjustmentAccounts", {
            organizationPartyId: scope.organizationPartyId,
            direction: parameters.direction || "receivable",
            effectiveDate: parameters.effectiveDate,
            text: parameters.term || null,
            selectedIdList: chosen,
            pageIndex: 0,
            pageSize: choiceLimit
        })
        const options = Array.from(result.rows || []).map(row => ({value: row.glAccountId, label: accountLabel(row)}))
        for (const row of Array.from(result.selectedRows || []))
            if (!options.some(option => option.value === row.glAccountId))
                options.push({value: row.glAccountId, label: accountLabel(row)})
        return {options}
    }
    const decode = ec.resource.script("component://mr-boss/service/ironstone/accounting/Settlements.js").itemToken
    const selections = chosen.map(token => ({token, ...decode(token)}))
    const kinds = {
        settlementSources: ["payment", "credit"],
        settlementTargets: ["invoice", "paymentTarget"],
        settlementAdjustmentInvoices: ["invoice"]
    }[parameters.choice]
    if (!kinds) throw new Error("Unknown settlement choice " + parameters.choice)
    const lists = [],
        selected = [],
        unavailable = []
    const labels = {payment: "Receipt", credit: "Credit", invoice: "Invoice", paymentTarget: "Payment"}
    const label = row =>
        labels[row.sourceKind] +
        " " +
        row.sourceId +
        " · " +
        (row.counterpartyName || "") +
        " · " +
        ec.l10n.formatCurrency(row.remaining, row.currencyUomId) +
        (row.dueDateText ? " · Due " + row.dueDateText : "")
    for (const sourceKind of kinds) {
        try {
            const result = probe("mantle.account.PaymentServices.find#OpenItems", {
                organizationPartyId: scope.organizationPartyId,
                partyId: parameters.partyId,
                direction: parameters.direction || "receivable",
                currencyUomId: parameters.currencyUomId,
                asOfDate: parameters.asOfDate || null,
                sourceKind,
                text: parameters.term || null,
                pageIndex: 0,
                pageSize: choiceLimit,
                selectedKeyList: selections.filter(item => item.kind === sourceKind).map(item => item.key)
            })
            if (result.incomplete || result.complete === false) throw new Error("Authoritative balances are unavailable")
            lists.push(Array.from(result.rows || []).map(row => ({value: row.sourceKey + "~" + row.version, label: label(row)})))
            selected.push(...Array.from(result.selectedRows || []))
        } catch (error) {
            ec.logger.error("Accounting " + sourceKind + " choices: " + error.message)
            unavailable.push({
                value: "unavailable:" + sourceKind,
                label: labels[sourceKind] + " choices are unavailable",
                disable: true
            })
        }
    }
    // Offer both kinds on the first page; each native query searches before its own limit.
    const options = []
    for (let index = 0; index < choiceLimit && options.length < choiceLimit; index++)
        for (const list of lists) if (list[index] && options.length < choiceLimit) options.push(list[index])
    for (const item of selections) {
        const row = selected.find(row => row.sourceKey === item.key)
        if (row && !options.some(option => option.value === item.token))
            options.push({
                value: item.token,
                label: label(row) + (item.version !== row.version ? " · Changed since selection" : "")
            })
    }
    options.push(...unavailable)
    return {options}
}
function choices(parameters) {
    const scope = access(parameters)
    if (
        [
            "payments",
            "reviewedOrganizationPaymentMethods",
            "reviewedCounterpartyPaymentMethods",
            "reviewedPaymentGatewayBindings",
            "reviewedRefundDrafts",
            "internalTransferMethods",
            "internalTransferFeeAccounts",
            "paymentGatewayProviders",
            "reviewedPaymentEvidence",
            "reviewedPaymentApplications"
        ].includes(parameters.choice)
    )
        return paymentChoices(parameters, scope)
    if (
        ["settlementSources", "settlementTargets", "settlementAdjustmentInvoices", "settlementAdjustmentAccounts"].includes(
            parameters.choice
        )
    )
        return settlementChoices(parameters, scope)
    if (parameters.choice === "receivableCredits") {
        // The credits Mantle allows applying to the invoice: its linked credits, issued, with a balance.
        const detail = policy.call("mantle.account.InvoiceServices.get#InvoiceFinanceDetail", {
            invoiceId: parameters.invoiceId,
            organizationPartyId: scope.organizationPartyId
        })
        const term = String(parameters.term || "").toLocaleLowerCase()
        const options = Array.from(detail.creditRows || [])
            .filter(
                row =>
                    !term ||
                    row.invoiceId === parameters.selected ||
                    [row.invoiceId, row.description, row.referenceNumber].some(text =>
                        String(text || "")
                            .toLocaleLowerCase()
                            .includes(term)
                    )
            )
            .map(row => ({value: row.invoiceId, label: row.invoiceId + (row.description ? " — " + row.description : "")}))
        return {options}
    }
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
