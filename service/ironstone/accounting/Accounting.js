// App routing and shell shapes. Native services remain the finance authority.
const native = ec.resource.script(
    "component://mr-mantle/service/mantle/ledger/AccountingPolicy.js",
)
const { call, map } = native
const paths = {
    invoices: "Receivables/Invoices",
    bills: "Payables/Bills",
    payments: "Payments/Payments",
    accounts: "GeneralLedger/ChartOfAccounts",
    journals: "GeneralLedger/JournalEntries",
}
const details = {
    invoices: "Receivables/InvoiceDetail",
    bills: "Payables/BillDetail",
    payments: "Payments/PaymentDetail",
    accounts: "GeneralLedger/AccountDetail",
    journals: "GeneralLedger/JournalEntryDetail",
}
function access(p) {
    if (p.appRoot && p.appRoot !== "Accounting")
        throw new Error("Unknown accounting mount")
    const a = native.scope(p)
    return Object.assign(a, {
        appRoot: "Accounting",
        linkBase: "//Accounting",
        webBase: "/qapps/Accounting",
        sharedLinks: Object.fromEntries(
            [
                ...Object.values(paths),
                ...Object.values(details),
                "Home",
                "Reports/TrialBalance",
                "Reports/GeneralLedger",
            ].map((path) => [path, "//Accounting/" + path]),
        ),
    })
}
function summary(p) {
    const a = access(p),
        summary = {
            asOf: ec.l10n.format(ec.user.nowTimestamp, "yyyy-MM-dd HH:mm:ss"),
            unposted: null,
            posted: null,
            accounts: null,
            periods: null,
            arDue: null,
            arOverdue: null,
            apDue: null,
            bank: null,
            unmatched: null,
        },
        findings = []
    if (a.capabilities.reportRead || a.capabilities.glPost) {
        for (const [counter, kind, extra] of [
            ["unposted", "journals", { isPosted: "N" }],
            ["posted", "journals", { isPosted: "Y" }],
            ["accounts", "accounts", {}],
            ["periods", "periods", {}],
        ]) {
            ec.message.pushErrors()
            try {
                const out = ec.service
                    .sync()
                    .name("mantle.ledger.AccountingServices.find#Records")
                    .parameters(
                        Object.assign(
                            {
                                kind,
                                organizationPartyId: a.organizationPartyId,
                                pageSize: 1,
                            },
                            extra,
                        ),
                    )
                    .disableAuthz()
                    .requireNewTransaction(true)
                    .call()
                if (ec.message.hasError())
                    throw new Error(ec.message.getErrorsString())
                summary[counter] = out.recordCount
            } catch (error) {
                ec.logger.error(
                    "Accounting Home " + counter + " count: " + error.message,
                )
                findings.push(counter + " count is unavailable")
            } finally {
                ec.message.clearErrors()
                ec.message.popErrors()
            }
        }
    }
    ec.message.pushErrors()
    try {
        const out = ec.service
            .sync()
            .name("mantle.ledger.SetupServices.get#Readiness")
            .parameters({ organizationPartyId: a.organizationPartyId })
            .disableAuthz()
            .requireNewTransaction(true)
            .call()
        if (ec.message.hasError()) throw new Error(ec.message.getErrorsString())
        findings.push(
            ...(out.findings || []).map((row) => row.code + ": " + row.message),
        )
    } catch (error) {
        ec.logger.error("Accounting Home setup health: " + error.message)
        findings.push("Setup health is unavailable")
    } finally {
        ec.message.clearErrors()
        ec.message.popErrors()
    }
    return { summary, findings, workRows: [] }
}
function search(p) {
    access(p)
    const rows = [],
        limit = Math.max(1, Math.min(20, Number(p.limit || 5)))
    for (const kind of Object.keys(paths)) {
        try {
            const out = native.query({
                kind,
                text: p.text,
                organizationPartyId: p.organizationPartyId,
            })
            for (const record of Array.from(out.q.limit(limit).list())) {
                const id = record[out.kind[1]]
                rows.push({
                    title:
                        record.accountName || record.description || String(id),
                    subtitle: kind,
                    icon: "sym_o_account_balance",
                    url:
                        "/qapps/Accounting/" +
                        details[kind] +
                        "?recordId=" +
                        encodeURIComponent(id),
                })
            }
        } catch (error) {
            ec.logger.warn("Accounting palette " + kind + ": " + error.message)
        }
    }
    return { rows: rows.slice(0, limit) }
}
function choices(p) {
    const a = access(p),
        term = String(p.term || "")
    let options = []
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
    ]
    if (
        p.choice?.startsWith("enum:") &&
        enumTypes.includes(p.choice.slice(5))
    ) {
        options = native
            .rows("moqui.basic.Enumeration", { enumTypeId: p.choice.slice(5) })
            .map((r) => ({ value: r.enumId, label: r.description }))
    } else if (p.choice === "drafts") {
        options = Array.from(
            native
                .query({
                    kind: "journals",
                    isPosted: "N",
                    organizationPartyId: p.organizationPartyId,
                    text: term,
                })
                .q.limit(30)
                .list(),
        ).map((r) => ({
            value: r.acctgTransId,
            label: r.acctgTransId + " — " + (r.description || "Draft"),
        }))
    } else if (
        ["batches", "templates", "journals", "locks", "periods"].includes(
            p.choice,
        )
    ) {
        options = Array.from(
            native
                .query({
                    kind: p.choice,
                    organizationPartyId: p.organizationPartyId,
                })
                .q.limit(30)
                .list(),
        ).map((r) => ({
            value: r[native.kinds[p.choice][1]],
            label:
                r.glJournalName ||
                r.templateName ||
                r.description ||
                r.changeReason ||
                r[native.kinds[p.choice][1]],
        }))
    } else if (
        [
            "products",
            "categories",
            "assets",
            "financialTypes",
            "roles",
            "accountCategories",
            "accountGroups",
        ].includes(p.choice)
    ) {
        const s = native.organization(p),
            description = {
                products: [
                    "mantle.product.Product",
                    "productId",
                    "productName",
                ],
                categories: [
                    "mantle.product.category.ProductCategory",
                    "productCategoryId",
                    "categoryName",
                ],
                assets: ["mantle.product.asset.Asset", "assetId", "assetName"],
                financialTypes: [
                    "mantle.account.financial.FinancialAccountType",
                    "finAccountTypeId",
                    "description",
                ],
                roles: ["mantle.party.RoleType", "roleTypeId", "description"],
                accountCategories: [
                    "mantle.ledger.account.GlAccountCategory",
                    "glAccountCategoryId",
                    "description",
                ],
                accountGroups: [
                    "mantle.ledger.account.GlAccountGroup",
                    "glAccountGroupId",
                    "description",
                ],
            }[p.choice]
        let q = native.find(description[0])
        if (["products", "categories", "assets"].includes(p.choice))
            q = q.condition(
                "ownerPartyId",
                "in",
                p.choice === "assets"
                    ? [s.organizationPartyId]
                    : [
                          "_NA_",
                          ...native.organizationChain(s.organizationPartyId),
                      ],
            )
        options = Array.from(
            q
                .condition(description[2], "like", "%" + term + "%")
                .limit(30)
                .list(),
        ).map((r) => ({
            value: r[description[1]],
            label: r[description[2]] || r[description[1]],
        }))
    } else if (p.choice === "facilities") {
        const s = native.organization(p)
        options = native
            .rows("mantle.facility.Facility", {
                ownerPartyId: s.organizationPartyId,
            })
            .map((r) => ({
                value: r.facilityId,
                label: r.facilityName || r.facilityId,
            }))
    } else if (p.choice === "costCenters") {
        const s = native.organization(p)
        const ids = native
            .rows("mantle.party.PartyRelationship", {
                toPartyId: s.organizationPartyId,
                relationshipTypeEnumId: "PrtOrgRollup",
            })
            .filter((r) => native.active(r))
            .map((r) => r.fromPartyId)
        options = ids.length
            ? Array.from(
                  native
                      .find("mantle.party.Organization")
                      .condition("partyId", "in", ids)
                      .list(),
              ).map((r) => ({ value: r.partyId, label: r.organizationName }))
            : []
    } else if (["terms", "timeUnits"].includes(p.choice)) {
        options = (
            p.choice === "terms"
                ? native.rows("mantle.account.invoice.SettlementTerm", {})
                : native.rows("moqui.basic.Uom", {
                      uomTypeEnumId: "UT_TIME_FREQ_MEASURE",
                  })
        ).map((r) => ({
            value: r.settlementTermId || r.uomId,
            label: r.description,
        }))
    } else if (["users", "groups"].includes(p.choice)) {
        native.organization(p, "admin")
        const entity =
                p.choice === "users"
                    ? "moqui.security.UserAccount"
                    : "moqui.security.UserGroup",
            key = p.choice === "users" ? "userId" : "userGroupId"
        options = Array.from(native.find(entity).limit(30).list()).map((r) => ({
            value: r[key],
            label: r.userFullName || r.description || r[key],
        }))
    } else if (["organizations", "allOrganizations"].includes(p.choice)) {
        options = Array.from(
            native
                .find("mantle.party.Organization")
                .condition(
                    "partyId",
                    "in",
                    (p.choice === "allOrganizations"
                        ? a.organizationPartyIds
                        : a.allowedOrganizationPartyIds
                    ).length
                        ? p.choice === "allOrganizations"
                            ? a.organizationPartyIds
                            : a.allowedOrganizationPartyIds
                        : ["_DENIED_"],
                )
                .list(),
        ).map((r) => ({ value: r.partyId, label: r.organizationName }))
    } else if (p.choice === "unassignedAccounts") {
        const scope = native.organization(p, "glPost"),
            cf = ec.entity.conditionFactory
        const assigned = native
            .organizationChain(scope.organizationPartyId)
            .flatMap((id) =>
                native
                    .rows("mantle.ledger.account.GlAccountOrganization", {
                        organizationPartyId: id,
                    })
                    .map((row) => row.glAccountId),
            )
        let q = native.find("mantle.ledger.account.GlAccount")
        if (assigned.length) q = q.condition("glAccountId", "not-in", assigned)
        q = q.condition(
            cf.makeCondition(
                [
                    cf.makeCondition("accountName", "like", "%" + term + "%"),
                    cf.makeCondition("accountCode", "like", "%" + term + "%"),
                    cf.makeCondition("glAccountId", "like", "%" + term + "%"),
                ],
                "or",
            ),
        )
        options = Array.from(q.orderBy("accountCode").limit(30).list()).map(
            (row) => ({
                value: row.glAccountId,
                label:
                    (row.accountCode || row.glAccountId) +
                    " — " +
                    row.accountName,
            }),
        )
    } else if (["accounts", "accountParents"].includes(p.choice)) {
        const cf = ec.entity.conditionFactory
        let q = native.query({
            kind: "accounts",
            organizationPartyId: p.organizationPartyId,
        }).q
        if (p.choice !== "accountParents")
            q = q.condition(
                cf.makeCondition(
                    [
                        cf.makeCondition("disallowPosting", "not-equals", "Y"),
                        cf.makeCondition("disallowPosting", "is-null", null),
                    ],
                    "or",
                ),
            )
        options = Array.from(
            q
                .condition(
                    cf.makeCondition(
                        [
                            cf.makeCondition(
                                "accountName",
                                "like",
                                "%" + term + "%",
                            ),
                            cf.makeCondition(
                                "accountCode",
                                "like",
                                "%" + term + "%",
                            ),
                            cf.makeCondition(
                                "glAccountId",
                                "like",
                                "%" + term + "%",
                            ),
                        ],
                        "or",
                    ),
                )
                .limit(30)
                .list(),
        ).map((r) => ({
            value: r.glAccountId,
            label: r.accountCode + " — " + r.accountName,
        }))
    } else if (p.choice === "parties") {
        // Keep private-contact entity filters; no unrestricted party lookup.
        const cf = ec.entity.conditionFactory
        const q = ec.entity
            .find("mantle.party.PartyDetail")
            .disableAuthz()
            .condition("partyTypeEnumId", "PtyOrganization")
            .condition(
                cf.makeCondition(
                    [
                        cf.makeCondition("privateOwnerUserId", "is-null", null),
                        cf.makeCondition("privateOwnerUserId", ec.user.userId),
                    ],
                    "or",
                ),
            )
        options = Array.from(
            q
                .condition("organizationName", "like", "%" + term + "%")
                .limit(30)
                .list(),
        ).map((r) => ({
            value: r.partyId,
            label: r.organizationName || r.partyId,
        }))
    } else if (p.choice === "currencies") {
        options = native
            .rows("moqui.basic.Uom", { uomTypeEnumId: "UT_CURRENCY_MEASURE" })
            .map((r) => ({ value: r.uomId, label: r.description || r.uomId }))
    }
    const needle = term.trim().toLowerCase()
    if (needle)
        options = options.filter(
            (option) =>
                String(option.value || "")
                    .toLowerCase()
                    .includes(needle) ||
                String(option.label || "")
                    .toLowerCase()
                    .includes(needle),
        )
    if (p.selected && !options.some((row) => row.value === p.selected)) {
        let selected
        if (["accounts", "accountParents"].includes(p.choice)) {
            let row
            if (
                p.choice === "accountParents" &&
                native
                    .query({
                        kind: "accounts",
                        organizationPartyId: p.organizationPartyId,
                    })
                    .q.condition("parentGlAccountId", p.selected)
                    .count()
            )
                row = native.one("mantle.ledger.account.GlAccount", {
                    glAccountId: p.selected,
                })
            else
                row = native.record({
                    kind: "accounts",
                    recordId: p.selected,
                    organizationPartyId: p.organizationPartyId,
                })
            selected = {
                value: row.glAccountId,
                label:
                    (row.accountCode || row.glAccountId) +
                    " — " +
                    row.accountName,
            }
        } else if (p.choice === "unassignedAccounts") {
            native.organization(p, "glPost")
            const row = native.one("mantle.ledger.account.GlAccount", {
                glAccountId: p.selected,
            })
            if (row)
                selected = {
                    value: row.glAccountId,
                    label:
                        (row.accountCode || row.glAccountId) +
                        " — " +
                        row.accountName,
                }
        } else if (
            p.choice?.startsWith("enum:") &&
            enumTypes.includes(p.choice.slice(5))
        ) {
            const row = native.one("moqui.basic.Enumeration", {
                enumId: p.selected,
                enumTypeId: p.choice.slice(5),
            })
            if (row) selected = { value: row.enumId, label: row.description }
        } else if (["currencies", "timeUnits"].includes(p.choice)) {
            const row = native.one("moqui.basic.Uom", {
                uomId: p.selected,
                uomTypeEnumId:
                    p.choice === "currencies"
                        ? "UT_CURRENCY_MEASURE"
                        : "UT_TIME_FREQ_MEASURE",
            })
            if (row) selected = { value: row.uomId, label: row.description }
        } else if (
            [
                "batches",
                "templates",
                "journals",
                "locks",
                "periods",
                "drafts",
            ].includes(p.choice)
        ) {
            const kind = p.choice === "drafts" ? "journals" : p.choice,
                row = native.record({
                    kind,
                    recordId: p.selected,
                    organizationPartyId: p.organizationPartyId,
                })
            if (p.choice === "drafts" && row.isPosted === "Y")
                throw new Error("Choose a draft")
            selected = {
                value: row[native.kinds[kind][1]],
                label:
                    row.glJournalName ||
                    row.templateName ||
                    row.description ||
                    row.changeReason ||
                    row[native.kinds[kind][1]],
            }
        } else if (["organizations", "allOrganizations"].includes(p.choice)) {
            const ids =
                p.choice === "allOrganizations"
                    ? a.organizationPartyIds
                    : a.allowedOrganizationPartyIds
            if (!ids.includes(p.selected))
                throw new Error("Organization is not available")
            const row = native.one("mantle.party.Organization", {
                partyId: p.selected,
            })
            if (row)
                selected = { value: row.partyId, label: row.organizationName }
        } else if (p.choice === "facilities") {
            const scope = native.organization(p)
            native.dimensions(scope.organizationPartyId, {
                facilityId: p.selected,
            })
            const row = native.one("mantle.facility.Facility", {
                facilityId: p.selected,
            })
            if (row)
                selected = { value: row.facilityId, label: row.facilityName }
        } else if (p.choice === "costCenters") {
            const scope = native.organization(p)
            native.dimensions(scope.organizationPartyId, {
                costCenterId: p.selected,
            })
            const row = native.one("mantle.party.Organization", {
                partyId: p.selected,
            })
            if (row)
                selected = { value: row.partyId, label: row.organizationName }
        } else if (p.choice === "terms") {
            const row = native.one("mantle.account.invoice.SettlementTerm", {
                settlementTermId: p.selected,
            })
            if (row)
                selected = {
                    value: row.settlementTermId,
                    label: row.description,
                }
        }
        if (selected) options.push(selected)
    }
    return { options }
}
function selectOrganization(p) {
    const a = native.access(),
        id = p.organizationPartyId || null
    if (id && !a.organizationPartyIds.includes(id))
        throw new Error("Accounting organization is not available")
    ec.user.setPreference("ACTIVE_ORGANIZATION", id)
    call("mantle.party.PartyServices.setup#UserOrganizationInfo")
    return { organizationPartyId: id }
}
// Format safe response maps before JSON serialization removes date types. Raw values remain available to writers.
function formatDates(value, fields) {
    const values = (Array.isArray(value) ? value : [value]).map((row) =>
        row ? native.map(row) : null,
    )
    for (const row of values) {
        if (!row) continue
        for (const [field, pattern] of fields) {
            const date = row[field]
            try {
                if (date == null || date === "") row[field + "Text"] = ""
                else if (/^\d{4}-\d{2}-\d{2}$/.test(String(date)))
                    row[field + "Text"] =
                        String(date) +
                        (pattern.includes("HH:mm") ? " 00:00" : "")
                else
                    row[field + "Text"] = ec.l10n.format(
                        new Date(native.ms(date)),
                        pattern,
                    )
            } catch (error) {
                ec.logger.error(
                    "Accounting date " + field + ": " + error.message,
                )
                row[field + "Text"] = "Unavailable"
            }
        }
    }
    return Array.isArray(value) ? values : values[0]
}
const operations = { selectOrganization, access, summary, search, choices }
;({
    formatDates,
    execute: (op, p) => {
        if (!operations[op])
            throw new Error("Unknown Accounting operation " + op)
        return operations[op](p)
    },
})
