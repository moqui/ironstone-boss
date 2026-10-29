// Products boundary for variant previews, selected writes, dated policy and resumable operations.
const P = "mantle.product.",
    F = P + "feature.",
    C = "ironstone.products.CatalogServices.",
    V = "ironstone.products.VariantServices.",
    M = P + "ProductServices."
const call = (n, p = {}, fresh = false) => {
    let c = ec.service.sync().name(n).parameters(p).disableAuthz()
    if (fresh) c = c.requireNewTransaction(true)
    const out = c.call() || {}
    if (ec.message.hasError()) throw new Error(ec.message.getErrorsString())
    return out
}
const find = (n, p) =>
    ec.entity
        .find(n)
        .condition(p || {})
        .disableAuthz()
const one = (n, p) => find(n, p).one()
const rows = (n, p) => Array.from(find(n, p).list())
const ms = x => (x == null || x === "" ? null : Number.isFinite(Number(String(x))) ? Number(String(x)) : Date.parse(String(x)))
const current = (r, at = ms(ec.user.nowTimestamp)) =>
    (ms(r.fromDate) == null || ms(r.fromDate) <= at) && (ms(r.thruDate) == null || ms(r.thruDate) > at)
const now = r => current(r)
const ids = v => [
    ...new Set(
        Array.isArray(v)
            ? v.map(String)
            : String(v || "")
                  .split(",")
                  .map(x => x.trim())
                  .filter(Boolean)
    )
]
const parse = (value, fallback) =>
    value == null || value === "" ? fallback : typeof value === "string" ? JSON.parse(value) : value
const safeCopy = [
    "description",
    "comments",
    "productClassEnumId",
    "amountUomId",
    "amountFixed",
    "amountRequire",
    "salesAllowed",
    "purchaseAllowed",
    "requireInventory",
    "chargeShipping",
    "taxable",
    "returnable",
    "originGeoId"
]
const fieldLabels = {
    description: "Description",
    comments: "Comments",
    productClassEnumId: "Product class",
    amountUomId: "Stock unit",
    amountFixed: "Fixed amount",
    amountRequire: "Require amount",
    salesAllowed: "Allow sales",
    purchaseAllowed: "Allow purchases",
    requireInventory: "Require inventory",
    chargeShipping: "Charge shipping",
    taxable: "Taxable",
    returnable: "Returnable",
    originGeoId: "Origin"
}
const defaultCopy = [
    "description",
    "productClassEnumId",
    "amountUomId",
    "salesAllowed",
    "purchaseAllowed",
    "requireInventory",
    "chargeShipping",
    "taxable",
    "returnable"
]
const access = () => call(C + "get#CatalogAccess")
function record(id, need = "read", entity = P + "Product") {
    const r = call(C + "get#CatalogRecord", {recordId: id, need, recordEntityName: entity, checkOnly: true}).record
    if (!r) throw new Error("Catalog record is not available for this action")
    return r
}
function readable(id, entity = P + "Product") {
    return !!call(C + "get#CatalogRecord", {recordId: id, recordEntityName: entity, checkOnly: true}).record
}
function organization(id, need = "read") {
    const a = access()
    id = id || a.activeOrganizationPartyId || a.organizationPartyIds[0]
    if (
        !a.capabilities[need] ||
        !id ||
        (!a.capabilities.systemAdmin && !a.organizationPartyIds.includes(id)) ||
        !one("mantle.party.PartyRole", {partyId: id, roleTypeId: "OrgInternal"})
    )
        throw new Error("Organization is not available for this action")
    return id
}
function settings(p) {
    const organizationPartyId = organization(p.organizationPartyId),
        at = p.asOfDate == null ? ms(ec.user.nowTimestamp) : ms(p.asOfDate)
    if (!Number.isFinite(at)) throw new Error("Choose a valid effective date")
    const row = rows(P + "ProductVariantSetting", {organizationPartyId}).find(r => current(r, at))
    const out = {
        batchLimit: Number(row?.batchLimit || 1000),
        copyFields: row ? ids(row.copyFields) : defaultCopy,
        copyCategoryMembers: row?.copyCategoryMembers === "Y",
        identifierPattern: "{base}_{features}"
    }
    return {
        organizationPartyId,
        fromDate: row?.fromDate || null,
        thruDate: row?.thruDate || null,
        asOfDate: at,
        settings: out,
        safeCopyFields: safeCopy,
        copyFieldOptions: safeCopy.map(f => ({value: f, label: fieldLabels[f] || f})),
        history: rows(P + "ProductVariantSetting", {organizationPartyId})
            .sort((a, b) => ms(b.fromDate) - ms(a.fromDate))
            .map(r => ({
                fromDate: r.fromDate,
                thruDate: r.thruDate,
                batchLimit: r.batchLimit,
                copyFields: r.copyFields,
                changeReason: r.changeReason,
                fromDateText: ec.l10n.format(new Date(ms(r.fromDate)), "yyyy-MM-dd HH:mm:ss"),
                thruDateText: r.thruDate ? ec.l10n.format(new Date(ms(r.thruDate)), "yyyy-MM-dd HH:mm:ss") : ""
            }))
    }
}
function storeSettings(p) {
    const organizationPartyId = organization(p.organizationPartyId, "catalogAdmin")
    find("mantle.party.Party", {partyId: organizationPartyId}).forUpdate(true).one()
    const old = settings({organizationPartyId}),
        data = parse(p.settingsJson, p.settings || {}),
        fromDate = p.fromDate || ec.user.nowTimestamp,
        at = ms(fromDate)
    if (!Number.isFinite(at) || at < ms(ec.user.nowTimestamp)) throw new Error("Policy changes must take effect now or later")
    if (ms(p.expectedFromDate) !== ms(old.fromDate)) throw new Error("Variant policy changed; reload before saving")
    const batchLimit = Number(data.batchLimit == null ? old.settings.batchLimit : data.batchLimit),
        copyFields = data.copyFields == null ? old.settings.copyFields : ids(data.copyFields)
    if (!Number.isInteger(batchLimit) || batchLimit < 1 || batchLimit > 1000)
        throw new Error("Interactive batch limit must be between 1 and 1000")
    if (copyFields.some(f => !safeCopy.includes(f)))
        throw new Error("Identity, prices, costs and transactional fields are never copyable")
    if (data.identifierPattern && data.identifierPattern !== "{base}_{features}")
        throw new Error("Use the canonical {base}_{features} identifier pattern")
    if (data.updateExisting === true || data.updateExisting === "Y")
        throw new Error("Existing overrides require a separate explicit propagation preview")
    ec.context.putAll(
        Object.fromEntries(
            ["fromDate", "thruDate", "batchLimit", "copyFields", "copyCategoryMembers", "identifierPattern"].map(field => [
                field + "_changeReason",
                p.changeReason || data.changeReason || "Variant policy changed"
            ])
        )
    )
    const all = rows(P + "ProductVariantSetting", {organizationPartyId}).sort((a, b) => ms(a.fromDate) - ms(b.fromDate))
    if (all.some(r => ms(r.fromDate) === at))
        throw new Error("A policy already starts at this time; choose a later effective date")
    const before = all.filter(r => ms(r.fromDate) < at && (!r.thruDate || ms(r.thruDate) > at)).at(-1),
        after = all.find(r => ms(r.fromDate) > at)
    if (before)
        call("update#" + P + "ProductVariantSetting", {
            organizationPartyId,
            fromDate: new Date(ms(before.fromDate)).toISOString(),
            thruDate: new Date(at).toISOString()
        })
    call("create#" + P + "ProductVariantSetting", {
        organizationPartyId,
        fromDate,
        thruDate: after?.fromDate || null,
        batchLimit,
        copyFields: copyFields.join(","),
        copyCategoryMembers: (
            data.copyCategoryMembers == null
                ? old.settings.copyCategoryMembers
                : data.copyCategoryMembers === true || data.copyCategoryMembers === "Y" || data.copyCategoryMembers === "true"
        )
            ? "Y"
            : "N",
        identifierPattern: "{base}_{features}",
        changeReason: p.changeReason || data.changeReason || "Variant policy changed"
    })
    return settings({organizationPartyId, asOfDate: fromDate})
}
function scope(p, need = "catalogEdit") {
    const b = record(p.productId, need)
    if (b.productTypeEnumId !== "PtVirtual") throw new Error("Choose a virtual product")
    const cfg =
        b.ownerPartyId === "_NA_"
            ? {fromDate: null, settings: {batchLimit: 1000, copyFields: defaultCopy, copyCategoryMembers: false}}
            : settings({organizationPartyId: b.ownerPartyId})
    const groups = ids(parse(p.productFeatureGroupIds, p.productFeatureGroupIdSet)),
        allowedFeatureIds = new Set(),
        allowedCategoryIds = []
    for (const a of rows(F + "ProductFeatureAppl", {productId: p.productId}).filter(now))
        if (readable(a.productFeatureId, F + "ProductFeature")) allowedFeatureIds.add(a.productFeatureId)
    const groupOptions = new Map()
    for (const m of rows(P + "category.ProductCategoryMember", {productId: p.productId}).filter(now)) {
        if (!readable(m.productCategoryId, P + "category.ProductCategory")) continue
        allowedCategoryIds.push(m.productCategoryId)
        for (const g of rows(F + "ProductCategoryFeatGrpAppl", {
            productCategoryId: m.productCategoryId,
            applTypeEnumId: "PfatSelectable"
        }).filter(now)) {
            if (!readable(g.productFeatureGroupId, F + "ProductFeatureGroup")) continue
            const group = one(F + "ProductFeatureGroup", {productFeatureGroupId: g.productFeatureGroupId})
            groupOptions.set(g.productFeatureGroupId, {
                value: g.productFeatureGroupId,
                label: group.description || g.productFeatureGroupId
            })
            if (groups.length && !groups.includes(g.productFeatureGroupId)) continue
            for (const a of rows(F + "ProductFeatureGroupAppl", {productFeatureGroupId: g.productFeatureGroupId}).filter(now))
                if (readable(a.productFeatureId, F + "ProductFeature")) allowedFeatureIds.add(a.productFeatureId)
        }
    }
    if (groups.some(id => !groupOptions.has(id))) throw new Error("Feature group is not available for this product")
    const requested = p.copyFieldsJson != null && p.copyFieldsJson !== "" ? parse(p.copyFieldsJson, []) : p.copyFields,
        copyFields = requested == null ? cfg.settings.copyFields : ids(requested)
    if (copyFields.some(f => !cfg.settings.copyFields.includes(f)))
        throw new Error("A requested field is outside the organization copy allowlist")
    const copyCategoryMembers =
        p.copyCategoryMembers == null
            ? cfg.settings.copyCategoryMembers
            : p.copyCategoryMembers === true || p.copyCategoryMembers === "Y" || p.copyCategoryMembers === "true"
    if (copyCategoryMembers && !cfg.settings.copyCategoryMembers)
        throw new Error("Category copying is not enabled by variant policy")
    return {
        b,
        cfg,
        groupOptions: [...groupOptions.values()],
        args: {
            productId: p.productId,
            productTypeEnumId: p.productTypeEnumId || "PtAsset",
            productFeatureGroupIdSet: groups.length ? groups : null,
            filterFeatureIds: parse(p.filterFeatureIdsJson, p.filterFeatureIds) || null,
            copyFields,
            copyCategoryMembers,
            allowedFeatureIds: [...allowedFeatureIds],
            allowedCategoryIds,
            policyStamp: String(cfg.fromDate || ""),
            requiredOwnerPartyId: b.ownerPartyId
        }
    }
}
function preview(p) {
    const s = scope(p),
        out = call(M + "preview#VariantProducts", Object.assign({}, s.args, {pageIndex: p.pageIndex, pageSize: p.pageSize}))
    for (const r of out.rows)
        if (r.existingProductId && !readable(r.existingProductId)) {
            r.existingProductId = null
            r.allowed = false
            r.reason = "Existing combination is not available"
        }
    // Feature extras are price data, including extras embedded in the feature choices.
    if (!access().capabilities.priceRead) {
        for (const r of out.rows) delete r.featureExtra
        for (const a of out.featureTypeInfoList) for (const f of a.featureInfoList) delete f.amount
    }
    return Object.assign(out, {
        product: s.b,
        groupOptions: s.groupOptions,
        batchLimit: s.cfg.settings.batchLimit,
        copyFields: s.args.copyFields,
        copyCategoryMembers: s.args.copyCategoryMembers,
        categoryCopyAllowed: s.cfg.settings.copyCategoryMembers,
        copyFieldOptions: s.cfg.settings.copyFields.map(f => ({value: f, label: fieldLabels[f] || f})),
        variantTypes: call(C + "get#CatalogOptions").options.productTypes.filter(r => r.value !== "PtVirtual")
    })
}
function selected(p) {
    const sets = parse(p.selectedFeatureSetsJson, p.selectedFeatureSets)
    if (!Array.isArray(sets) || sets.length === 0) throw new Error("Select at least one feature combination")
    if (sets.length > 100000) throw new Error("Submit at most 100000 combinations in one durable operation")
    return [
        ...new Map(
            sets.map(v => {
                const value = ids(Array.isArray(v) ? v : v.productFeatureIds).sort()
                return [JSON.stringify(value), value]
            })
        ).values()
    ]
}
function generate(p) {
    const s = scope(p),
        sets = selected(p)
    if (!p.previewRevision) throw new Error("Preview the selection before generating")
    if (sets.length > s.cfg.settings.batchLimit)
        throw new Error("Selection exceeds the interactive limit; submit a durable batch")
    // The XML twin carries this durable result key across its redirect, including an interrupted response.
    if (p.operationKey) {
        let out = call(V + "start#VariantBatch", p, true)
        for (let i = 0; i < 10 && out.pendingCount; i++)
            out = call(V + "run#VariantBatch", {operationKey: p.operationKey, limit: 100}, true)
        return out
    }
    return call(
        M + "create#VariantProducts",
        Object.assign({}, s.args, {
            selectedFeatureSets: sets,
            previewRevision: p.previewRevision,
            interactiveLimit: s.cfg.settings.batchLimit
        })
    )
}
function operation(p, need = "read") {
    const row = one(P + "ProductCatalogOperation", {operationKey: p.operationKey})
    if (!row || row.operationType !== "variants") throw new Error("Variant operation is not available")
    record(row.productId, need)
    return row
}
function getBatch(p) {
    const op = operation(p),
        pageSize = 50,
        totalCount = find(P + "ProductCatalogOperationItem", {operationKey: p.operationKey}).count(),
        pageIndex = Math.max(0, Math.min(Math.max(0, Math.ceil(totalCount / pageSize) - 1), Number(p.pageIndex || 0)))
    const count = result => find(P + "ProductCatalogOperationItem", {operationKey: p.operationKey, result}).count()
    const items = Array.from(
        find(P + "ProductCatalogOperationItem", {operationKey: p.operationKey})
            .orderBy("itemSeqId")
            .offset(pageIndex * pageSize)
            .limit(pageSize)
            .list()
    )
    return {
        operationKey: p.operationKey,
        productId: op.productId,
        totalCount,
        pendingCount: count(null),
        createdCount: count("created"),
        existingCount: count("existing"),
        failedCount: count("failed"),
        pageIndex,
        results: items.map(r => ({
            itemSeqId: r.itemSeqId,
            featureKey: r.itemKey,
            result: r.result || "pending",
            productId: r.resultProductId && readable(r.resultProductId) ? r.resultProductId : null,
            error: r.errorMessage
        }))
    }
}
function startBatch(p) {
    const s = scope(p),
        sets = selected(p)
    if (!/^[A-Za-z0-9_.-]{1,40}$/.test(p.operationKey || ""))
        throw new Error("Provide an operation key with 1–40 letters, numbers, dots, dashes or underscores")
    const fresh = call(M + "preview#VariantProducts", Object.assign({}, s.args, {pageSize: 1}))
    if (!p.previewRevision || fresh.previewRevision !== p.previewRevision)
        throw new Error("Variant preview changed; preview again before queuing")
    const request = Object.assign({}, s.args, {previewRevision: p.previewRevision}),
        requestJson = JSON.stringify({request, selectionHash: ec.user.singleUseCodeHash(JSON.stringify(sets))})
    find(P + "Product", {productId: p.productId})
        .forUpdate(true)
        .one()
    const old = one(P + "ProductCatalogOperation", {operationKey: p.operationKey})
    if (old) {
        operation(p, "catalogEdit")
        if (old.requestJson !== requestJson) throw new Error("Operation key is already bound to another selection")
        return getBatch(p)
    }
    call("create#" + P + "ProductCatalogOperation", {
        operationKey: p.operationKey,
        operationType: "variants",
        productId: p.productId,
        ownerPartyId: s.b.ownerPartyId,
        submittedByUserId: ec.user.userId,
        submittedDate: ec.user.nowTimestamp,
        requestJson
    })
    for (let i = 0; i < sets.length; i++)
        call("create#" + P + "ProductCatalogOperationItem", {
            operationKey: p.operationKey,
            itemSeqId: i,
            itemKey: JSON.stringify(sets[i]),
            requestJson: JSON.stringify(sets[i])
        })
    return getBatch(p)
}
function runItem(p) {
    const op = operation(p, "catalogEdit"),
        item = find(P + "ProductCatalogOperationItem", {operationKey: p.operationKey, itemSeqId: p.itemSeqId})
            .forUpdate(true)
            .one()
    if (!item) throw new Error("Operation item is not available")
    if (item.result && item.result !== "failed") return {result: item.result}
    const saved = JSON.parse(op.requestJson).request,
        s = scope(saved),
        args = Object.assign({}, s.args, {
            previewRevision: saved.previewRevision,
            selectedFeatureSets: [JSON.parse(item.requestJson)],
            interactiveLimit: 1
        })
    const out = call(M + "create#VariantProducts", args)
    if (ec.message.hasError()) throw new Error(ec.message.getErrorsString())
    const r = out.results?.[0] || {result: "failed", error: "Variant produced no result"}
    call("update#" + P + "ProductCatalogOperationItem", {
        operationKey: p.operationKey,
        itemSeqId: p.itemSeqId,
        result: r.result,
        resultProductId: r.productId || null,
        errorMessage: r.error || null,
        completedDate: ec.user.nowTimestamp
    })
    return {result: r.result}
}
function runBatch(p) {
    const op = operation(p, "catalogEdit"),
        s = scope({productId: op.productId}),
        limit = Math.max(1, Math.min(100, s.cfg.settings.batchLimit, Number(p.limit || 100)))
    const work = Array.from(
        find(P + "ProductCatalogOperationItem", {operationKey: p.operationKey, result: null})
            .orderBy("itemSeqId")
            .limit(limit)
            .list()
    )
    if (p.retryFailed && work.length < limit)
        work.push(
            ...Array.from(
                find(P + "ProductCatalogOperationItem", {operationKey: p.operationKey, result: "failed"})
                    .orderBy("itemSeqId")
                    .limit(limit - work.length)
                    .list()
            )
        )
    for (const r of work) {
        ec.message.pushErrors()
        try {
            call(V + "run#VariantItem", {operationKey: p.operationKey, itemSeqId: r.itemSeqId}, true)
            if (ec.message.hasError()) throw new Error(ec.message.getErrorsString())
        } catch (e) {
            ec.logger.error("Variant operation " + p.operationKey + " item " + r.itemSeqId + " failed: " + e)
            ec.message.clearErrors()
            try {
                call(
                    V + "fail#VariantItem",
                    {operationKey: p.operationKey, itemSeqId: r.itemSeqId, errorMessage: String(e.message || e)},
                    true
                )
            } catch (persistError) {
                ec.logger.error(
                    "Could not save failure for variant operation " +
                        p.operationKey +
                        " item " +
                        r.itemSeqId +
                        ": " +
                        persistError
                )
            }
        } finally {
            ec.message.clearErrors()
            ec.message.popErrors()
        }
    }
    return getBatch(p)
}
function failItem(p) {
    operation(p, "catalogEdit")
    const item = find(P + "ProductCatalogOperationItem", {operationKey: p.operationKey, itemSeqId: p.itemSeqId})
        .forUpdate(true)
        .one()
    if (item && !item.result)
        call("update#" + P + "ProductCatalogOperationItem", {
            operationKey: p.operationKey,
            itemSeqId: p.itemSeqId,
            result: "failed",
            errorMessage: "Combination could not be generated; preview again before retrying",
            completedDate: ec.user.nowTimestamp
        })
    return {}
}
function execute(op, p) {
    return {settings, storeSettings, preview, generate, startBatch, getBatch, runBatch, runItem, failItem}[op](p)
}
;({execute})
