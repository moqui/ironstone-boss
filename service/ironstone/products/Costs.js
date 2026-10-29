// Products mounts for the native, capability-checked standard-estimate services.
// Each invocation keeps its app route local, including nested catalog reads (ProductsLib.forCall).
function run(op, parameters) {
    const lib = ec.resource.script("component://mr-boss/service/ironstone/products/ProductsLib.js"),
        local = lib.forCall(parameters.appRoot),
        policy = ec.resource.script("component://mr-mantle/service/mantle/product/CostPolicy.js"),
        {rows, rowsIn, dateText} = lib
    const S = "mantle.product.CostServices."
    const call = (name, p = {}) => policy.call(name, p)
    // The estimate screens' context: the user's cost access, the product's estimates and the selected one with its
    // components, the edit defaults and the options.
    function context(p) {
        const shared = local.access()
        if (!shared.capabilities.read) throw new Error("Catalog read access is required")
        const access = policy.capabilities(),
            out = {
                appRoot: shared.appRoot,
                costAccess: access,
                standardCostRows: [],
                componentRows: [],
                costHistoryRows: [],
                findings: [],
                costMessage: access.read ? "" : "Standard-cost read authority is required.",
                costDraft: {quantity: 1, quantityUomId: "OTH_ea", priceUomId: ec.user.userAccount?.currencyUomId || null},
                componentDraft: {quantity: 1, rateAmount: 0, quantityUomId: "OTH_ea", componentTypeEnumId: "PccMaterial"}
            }
        if (!access.read) return out
        let selected = null
        if (p.productStandardCostId) {
            selected = call(S + "get#ProductStandardCost", p)
            if (p.productId && p.productId !== selected.standardCost.productId)
                throw new Error("Estimate does not belong to this product")
        }
        const scope = policy.scope(Object.assign({}, p, selected?.standardCost || {}))
        out.organizationPartyId = scope.organizationPartyId
        out.productId = selected?.standardCost.productId || p.productId || null
        const product = out.productId ? policy.product(out.productId, scope) : null
        if (product) out.costDraft.quantityUomId = product.amountUomId || "OTH_ea"
        out.componentDraft.quantityUomId = out.costDraft.quantityUomId
        Object.assign(
            out,
            call(
                S + "find#ProductStandardCosts",
                Object.assign({}, p, {
                    organizationPartyId: scope.organizationPartyId,
                    productId: out.productId,
                    includeHistory: p.includeHistory !== false
                })
            )
        )
        out.facilityOptions = rows("mantle.facility.Facility", {ownerPartyId: scope.organizationPartyId}).map(facility => ({
            value: facility.facilityId,
            label: facility.facilityName || facility.facilityId
        }))
        const units = rowsIn("moqui.basic.Uom", "uomId", [
            "OTH_ea",
            "TF_hr",
            "TF_min",
            "LEN_m",
            "WT_kg",
            product?.amountUomId,
            selected?.standardCost.quantityUomId,
            ...(selected?.componentRows || []).map(row => row.quantityUomId),
            ...out.standardCostRows.map(row => row.quantityUomId),
            ...out.componentRows.map(row => row.quantityUomId)
        ])
        out.unitOptions = units.map(uom => ({value: uom.uomId, label: uom.description || uom.uomId}))
        out.currencyOptions = rows("moqui.basic.Uom", {uomTypeEnumId: "UT_CURRENCY_MEASURE"}).map(uom => ({
            value: uom.uomId,
            label: uom.uomId
        }))
        out.componentTypes = lib.enumOptions("ProductCostComponentType").filter(option => option.value !== "PccOverheadPercent")
        if (selected) {
            Object.assign(out, selected)
            out.costDraft = Object.assign({}, selected.standardCost, {changeReason: ""})
            out.findings = JSON.parse(selected.standardCost.findingsJson || "[]")
            const component = selected.componentRows.find(row => row.productStandardCostComponentId === p.selectedComponentId)
            if (component) out.componentDraft = Object.assign({}, component, {changeReason: ""})
        }
        const unitText = new Map(units.map(uom => [uom.uomId, uom.abbreviation || uom.uomId])),
            typeText = new Map(out.componentTypes.map(option => [option.value, option.label]))
        out.standardCostRows = out.standardCostRows.map(row =>
            Object.assign({}, row, {
                fromDateText: row.fromDate ? dateText(row.fromDate) : "Draft",
                thruDateText: dateText(row.thruDate),
                unitText: unitText.get(row.quantityUomId) || row.quantityUomId || ""
            })
        )
        out.componentRows = out.componentRows.map(row =>
            Object.assign({}, row, {
                componentTypeText: typeText.get(row.componentTypeEnumId) || row.componentTypeEnumId,
                unitText: unitText.get(row.quantityUomId) || row.quantityUomId || ""
            })
        )
        return out
    }
    function native(name, p) {
        const out = call(S + name, p)
        if (out.standardCost) out.productStandardCostId = out.standardCost.productStandardCostId
        return out
    }
    // Cost history with one chart per product, currency and unit, a series per cost basis.
    function history(p) {
        const result = context(p)
        if (!result.costAccess.read) return result
        Object.assign(
            result,
            native("get#ProductCostHistory", Object.assign({}, p, {organizationPartyId: result.organizationPartyId}))
        )
        const units = new Map(
            rowsIn(
                "moqui.basic.Uom",
                "uomId",
                result.costHistoryRows.map(row => row.quantityUomId)
            ).map(uom => [uom.uomId, uom.abbreviation || uom.uomId])
        )
        result.costHistoryRows = result.costHistoryRows.map(row =>
            Object.assign({}, row, {dateText: dateText(row.date), unitText: units.get(row.quantityUomId) || row.quantityUomId})
        )
        const groups = {}
        for (const row of result.costHistoryRows) {
            if (row.unitCost == null || !row.date) continue
            const key = [row.productId, row.priceUomId, row.quantityUomId].join(" · ")
            ;(groups[key] || (groups[key] = [])).push(row)
        }
        const json = value => JSON.stringify(value).replace(/'/g, "\\u0027").replace(/</g, "\\u003c"),
            colors = ["primary", "secondary", "accent"]
        result.costCharts = Object.entries(groups).map(([title, facts]) => {
            const labels = [...new Set(facts.map(row => row.dateText))].sort(),
                bases = [...new Set(facts.map(row => row.basis))],
                series = bases.map((basis, i) => ({
                    label: basis,
                    colorKey: colors[i % colors.length],
                    data: labels.map(date => {
                        const row = facts.find(fact => fact.dateText === date && fact.basis === basis)
                        return row ? toDecimal(row.unitCost).toNumber() : null
                    })
                }))
            return {
                title: title.split(" · ").slice(0, 2).concat(facts[0].unitText).join(" · "),
                labelsJson: json(labels),
                seriesJson: json(series)
            }
        })
        return result
    }
    function rollup(p) {
        const screen = context(p)
        if (!screen.costAccess.read || !p.calculationId) return Object.assign(screen, {calculationId: null, complete: false})
        const result = native("get#ProductCostRollup", p)
        return Object.assign(screen, result, result.request, {
            asOfDate: result.request.asOfDate ? dateText(result.request.asOfDate) : null
        })
    }
    const nativeOperations = {
        store: "store#ProductStandardCost",
        component: "store#StandardCostComponent",
        clone: "clone#ProductStandardCost",
        approve: "approve#ProductStandardCost",
        preview: "preview#ProductCostRollup",
        save: "save#ProductCostRollup",
        print: "get#StandardCostPrint"
    }
    const p = lib.blankToNull(parameters, [
        "productStandardCostId",
        "productStandardCostComponentId",
        "facilityId",
        "productBomId",
        "expectedRevision"
    ])
    if (op === "context") return context(p)
    if (op === "history") return history(p)
    if (op === "rollup") return rollup(p)
    if (!nativeOperations[op]) throw new Error("Unknown cost operation " + op)
    return native(nativeOperations[op], p)
}
;({execute: run})
