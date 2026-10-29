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
            arDue: null,
            arOverdue: null,
            apDue: null,
            bank: null,
            unmatched: null,
        },
        findings = []
    if (a.capabilities.reportRead || a.capabilities.glPost) {
        ec.message.pushErrors()
        try {
            const out = ec.service
                .sync()
                .name("mantle.ledger.AccountingServices.find#Records")
                .parameters({
                    kind: "journals",
                    isPosted: "N",
                    organizationPartyId: a.organizationPartyId,
                    pageSize: 1,
                })
                .disableAuthz()
                .requireNewTransaction(true)
                .call()
            if (ec.message.hasError())
                throw new Error(ec.message.getErrorsString())
            summary.unposted = out.recordCount
        } catch (error) {
            ec.logger.error("Accounting Home unposted count: " + error.message)
            findings.push("Unposted count is unavailable")
        } finally {
            ec.message.clearErrors()
            ec.message.popErrors()
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
        "InvoiceItemType",
        "AcctgTransType",
        "PaymentType",
        "PaymentInstrument",
        "InvoiceSequence",
        "AssetType",
        "AssetClass",
        "GlAccountGroupType",
        "FinancialAccountTransReason",
        "PhysicalInventoryVarianceReason",
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
                .condition("accountName", "like", "%" + term + "%")
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
    if (p.selected && !options.some((r) => r.value === p.selected)) {
        // Selected labels go through the same authorization path.
        if (["accounts", "accountParents"].includes(p.choice)) {
            const row = native.record({
                kind: "accounts",
                recordId: p.selected,
                organizationPartyId: p.organizationPartyId,
            })
            options.push({ value: row.glAccountId, label: row.accountName })
        }
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
const operations = { selectOrganization, access, summary, search, choices }
;({
    execute: (op, p) => {
        if (!operations[op])
            throw new Error("Unknown Accounting operation " + op)
        return operations[op](p)
    },
})
