// Products context for Manufacturing-owned methods. All writes still pass the owner's independent guards.
// Each invocation keeps its app route local, including nested catalog reads (ProductsLib.forCall).
function run(op, parameters) {
    const lib = ec.resource.script("component://mr-boss/service/ironstone/products/ProductsLib.js"),
        local = lib.forCall(parameters.appRoot),
        policy = ec.resource.script("component://mr-mantle/service/mantle/product/MethodPolicy.js"),
        {rows, rowsIn, map, dateText} = lib
    const S = "mantle.product.BomServices.",
        R = "mantle.work.RoutingServices."
    const call = (name, p = {}) => policy.call(name, p)
    // The product, its method organization and BOM, and the user's method access: what a write needs to be authorized.
    function method(p) {
        if (!local.access().capabilities.read) throw new Error("Catalog read access is required")
        let productId = p.productId,
            detail = null
        if (p.productBomId) {
            detail = call(S + "get#BomDetail", {productBomId: p.productBomId, asOfDate: p.asOfDate})
            if (productId && productId !== detail.productBom.productId) throw new Error("BOM does not belong to this product")
            productId = detail.productBom.productId
        }
        const product = local.readableProduct(productId)
        if (!product) throw new Error("Product is not available")
        const access = policy.capabilities(),
            found = {product, productId, access, detail, bomRows: [], kit: product.productTypeEnumId === "PtPickAssembly"}
        if (!access.read) return found
        found.organizationPartyId = policy.scope(
            Object.assign({}, p, {organizationPartyId: detail?.productBom.organizationPartyId || p.organizationPartyId})
        ).organizationPartyId
        if (!found.kit) {
            found.bomRows = call(S + "find#Boms", {
                organizationPartyId: found.organizationPartyId,
                productId,
                asOfDate: p.asOfDate
            }).bomRows
            if (!detail && found.bomRows.length)
                found.detail = call(S + "get#BomDetail", {productBomId: found.bomRows[0].productBomId, asOfDate: p.asOfDate})
        }
        found.productBomId = found.detail?.productBom.productBomId || null
        found.workEffortId = p.workEffortId || found.detail?.productBom.routingWorkEffortId || null
        return found
    }
    function requireAccess(found, need = "read") {
        if (!found.access.read || !found.access[need]) throw new Error("Manufacturing " + need + " authority is required")
        return found
    }
    // The screen context of the method screens: the method with its edit defaults, options and the rows to show.
    function context(p, found = method(p)) {
        const {product, productId, access, detail} = found,
            amountUomId = product.amountUomId || "OTH_ea",
            out = {
                appRoot: local.access().appRoot,
                product: map(product),
                productId,
                methodAccess: access,
                productBomId: p.productBomId || null,
                bomRows: [],
                bomItemRows: [],
                draftItemRows: [],
                releaseHistory: [],
                bomHeader: {baseQuantity: 1, quantityUomId: amountUomId, methodCode: "MAIN", isPhantom: "N"},
                bomItemEdit: {
                    quantity: 1,
                    quantityUomId: amountUomId,
                    scrapFactor: 0,
                    roleEnumId: "BmirConsume",
                    sequenceNum: 10
                },
                methodMessage: !access.read
                    ? "Manufacturing method access is required."
                    : found.kit
                      ? "Kits use dated Kit components. Their usage is shown read only."
                      : ""
            }
        if (!access.read) return out
        Object.assign(out, {organizationPartyId: found.organizationPartyId, kit: found.kit, bomRows: found.bomRows})
        if (detail) {
            const selected = p.selectedBomItemId
                ? [...detail.draftItemRows, ...detail.bomItemRows].find(row => row.bomItemId === p.selectedBomItemId)
                : null
            Object.assign(out, detail, {
                productId,
                productBomId: found.productBomId,
                bomHeader: Object.assign({}, detail.productBom, {changeReason: ""}),
                bomItemEdit: Object.assign({}, out.bomItemEdit, selected || {})
            })
            out.bomItemEdit.componentProductId = out.bomItemEdit.productId || ""
            delete out.bomItemEdit.productId
            out.bomItemEdit.changeReason = ""
            out.bomExpectedRevision = detail.expectedRevision
            delete out.expectedRevision
        }
        out.workEffortId = found.workEffortId
        out.routingOptions = call(R + "find#Routings", {organizationPartyId: out.organizationPartyId}).routingRows.map(
            routing => ({
                value: routing.workEffortId,
                label: routing.workEffortName || routing.workEffortId
            })
        )
        const facilities = rows("mantle.facility.Facility", {ownerPartyId: out.organizationPartyId}),
            centers = new Set(
                rowsIn(
                    "mantle.work.production.WorkCenter",
                    "facilityId",
                    facilities.map(f => f.facilityId)
                ).map(c => c.facilityId)
            )
        out.facilityOptions = facilities.map(facility => ({
            value: facility.facilityId,
            label: facility.facilityName || facility.facilityId
        }))
        out.centerOptions = out.facilityOptions.filter(option => centers.has(option.value))
        const usedUnits = [
            "OTH_ea",
            "TF_hr",
            "TF_min",
            "LEN_m",
            "WT_kg",
            product.amountUomId,
            detail?.productBom.quantityUomId,
            ...(detail?.bomItemRows || []).map(row => row.quantityUomId),
            ...(detail?.draftItemRows || []).map(row => row.quantityUomId)
        ]
        const units = rowsIn("moqui.basic.Uom", "uomId", usedUnits)
        out.unitOptions = units.map(uom => ({value: uom.uomId, label: uom.description || uom.uomId}))
        out.skillOptions = lib.enumOptions("SkillType")
        // a new rate is in the organization's default price currency (for a user who may read pricing), else the user's
        const capabilities = local.access().capabilities,
            pricing =
                capabilities.priceRead || capabilities.supplierPriceRead || capabilities.catalogAdmin
                    ? call("mantle.product.PriceServices.get#PricingSettings", {organizationPartyId: out.organizationPartyId})
                          .settings || {}
                    : {}
        out.rateSettings = {
            priceUomId: pricing.defaultCurrencyUomId || ec.user.userAccount?.currencyUomId || null,
            componentTypeEnumId: "PccLabor",
            approve: false
        }
        out.currencyOptions = rows("moqui.basic.Uom", {uomTypeEnumId: "UT_CURRENCY_MEASURE"}).map(uom => ({
            value: uom.uomId,
            label: uom.uomId
        }))
        out.releaseOptions = out.releaseHistory.map(release => ({
            value: release.methodReleaseDecisionId,
            label: dateText(release.fromDate) + " · " + release.changeReason
        }))
        out.leftReleaseId =
            p.leftReleaseId ||
            out.releaseHistory[1]?.methodReleaseDecisionId ||
            out.releaseHistory[0]?.methodReleaseDecisionId ||
            null
        out.rightReleaseId = p.rightReleaseId || out.releaseHistory[0]?.methodReleaseDecisionId || null
        // names for the rows' products, units and approvers, each read in one query
        const all = [...out.bomItemRows, ...out.draftItemRows, ...out.releaseHistory],
            productNames = new Map(
                rowsIn(
                    "mantle.product.Product",
                    "productId",
                    all.map(row => row.productId)
                ).map(row => [row.productId, row.productName])
            ),
            unitNames = new Map(units.map(uom => [uom.uomId, uom.description])),
            userNames = new Map(
                rowsIn(
                    "moqui.security.UserAccount",
                    "userId",
                    all.map(row => row.approvedByUserId)
                ).map(user => [user.userId, user.userFullName])
            )
        for (const row of all.filter(row => row.quantityUomId && !unitNames.has(row.quantityUomId)))
            unitNames.set(row.quantityUomId, null)
        const dated = list =>
            list.map(row =>
                Object.assign({}, map(row), {
                    fromDateText: row.fromDate ? dateText(row.fromDate) : "Draft",
                    thruDateText: dateText(row.thruDate),
                    productName: row.productId ? productNames.get(row.productId) || row.productId : null,
                    quantityUomText: row.quantityUomId ? unitNames.get(row.quantityUomId) || row.quantityUomId : null,
                    approverText: row.approvedByUserId ? userNames.get(row.approvedByUserId) || row.approvedByUserId : null,
                    roleText: row.roleEnumId === "BmirByproduct" ? "By-product" : "Consume"
                })
            )
        out.bomItemRows = dated(out.bomItemRows)
        out.draftItemRows = dated(out.draftItemRows)
        out.releaseHistory = dated(out.releaseHistory)
        out.asOfDate = p.asOfDate ? dateText(p.asOfDate) : null
        // the record header: its caption facts and a state chip
        const bom = out.productBom
        out.methodFactsText = [
            bom && "Base " + String(bom.baseQuantity ?? 1) + " " + (unitNames.get(bom.quantityUomId) || bom.quantityUomId || ""),
            bom?.routingWorkEffortId &&
                "Routing " +
                    (out.routingOptions.find(option => option.value === bom.routingWorkEffortId)?.label ||
                        bom.routingWorkEffortId),
            out.asOfDate && "At " + out.asOfDate
        ]
            .filter(Boolean)
            .join(" · ")
        out.methodState = found.kit
            ? null
            : !bom
              ? {text: "No method", color: "grey"}
              : out.draftItemRows.length
                ? {
                      text: out.draftItemRows.length + " draft " + (out.draftItemRows.length === 1 ? "change" : "changes"),
                      color: "warning"
                  }
                : out.releaseHistory.length
                  ? {text: "Released", color: "positive"}
                  : {text: "Not released", color: "grey"}
        return out
    }
    function storeBom(p) {
        const found = requireAccess(method(p), "edit"),
            out = call(
                S + "store#Bom",
                Object.assign({}, p, {
                    productId: found.productId,
                    productBomId: p.productBomId || null,
                    organizationPartyId: found.organizationPartyId
                })
            )
        return {productBomId: out.productBom.productBomId, productId: found.productId}
    }
    function storeItem(p) {
        const found = requireAccess(method(p), "edit")
        if (!found.productBomId) throw new Error("Create or select a BOM first")
        if (
            p.bomItemId &&
            !rows("mantle.product.bom.ProductBomItem", {productBomId: found.productBomId}).some(
                row => row.bomItemId === p.bomItemId
            )
        )
            throw new Error("BOM item is not in this product method")
        const out = call(
            S + "store#BomItem",
            Object.assign({}, p, {productBomId: found.productBomId, productId: p.componentProductId})
        )
        return {productBomId: found.productBomId, productId: found.productId, bomItemId: out.bomItemId}
    }
    // A Mantle method service for the product's method, with the product, BOM, organization and routing fixed.
    function native(p, name, found) {
        const out = call(
            name,
            Object.assign({}, p, {
                productId: found.productId,
                productBomId: found.productBomId,
                organizationPartyId: found.organizationPartyId,
                workEffortId: p.workEffortId || found.workEffortId
            })
        )
        return Object.assign(out, {
            productId: found.productId,
            productBomId: out.productBom?.productBomId || found.productBomId,
            workEffortId: out.routing?.workEffortId || p.workEffortId || found.workEffortId
        })
    }
    // A method report merged into the screen context; a failure becomes a finding and the report stays readable.
    function report(p, name) {
        const found = requireAccess(method(p)),
            c = context(p, found)
        if (!c.productBomId && name !== S + "get#BomWhereUsed")
            return Object.assign(c, {
                findings: [],
                reportMessage: "Create and release a method before running this report.",
                explosionRows: [],
                comparisonRows: [],
                whereUsedRows: []
            })
        ec.message.pushErrors()
        try {
            const args = Object.assign({}, p)
            if (name === S + "compare#BomDates") {
                const left = c.releaseHistory.find(r => r.methodReleaseDecisionId === c.leftReleaseId),
                    right = c.releaseHistory.find(r => r.methodReleaseDecisionId === c.rightReleaseId)
                if ((p.leftReleaseId && !left) || (p.rightReleaseId && !right))
                    throw new Error("Choose approvals from this method")
                args.leftDate = p.manualLeftDate || (p.leftReleaseId ? left?.fromDate : p.leftDate || left?.fromDate)
                args.rightDate = p.manualRightDate || (p.rightReleaseId ? right?.fromDate : p.rightDate || right?.fromDate)
            }
            const result = Object.assign(c, native(args, name, found))
            for (const field of ["manualLeftDate", "manualRightDate"]) result[field] = p[field] ? dateText(p[field]) : null
            if (result.comparisonRows)
                result.comparisonRows = result.comparisonRows.map(r =>
                    Object.assign({}, r, {
                        beforeProductId: r.left?.productId || "",
                        beforeQuantity: r.left?.quantity,
                        afterProductId: r.right?.productId || "",
                        afterQuantity: r.right?.quantity
                    })
                )
            for (const field of ["asOfDate", "leftDate", "rightDate"]) if (result[field]) result[field] = dateText(result[field])
            return result
        } catch (e) {
            ec.logger.error("Method report " + c.productId + ": " + e)
            return Object.assign(c, {
                complete: false,
                findings: [{recordId: c.productBomId, message: String(e.message || e)}],
                reportMessage: "This report is incomplete. Review its findings.",
                explosionRows: [],
                comparisonRows: [],
                whereUsedRows: []
            })
        } finally {
            ec.message.clearErrors()
            ec.message.popErrors()
        }
    }
    function routing(p) {
        const c = context(p, requireAccess(method(p))),
            out = c.workEffortId
                ? call(R + "get#RoutingDetail", {workEffortId: c.workEffortId, asOfDate: p.asOfDate})
                : {routing: {}, operationRows: [], releasedOperationRows: [], releaseHistory: [], expectedRevision: null}
        if (out.routing.ownerPartyId && out.routing.ownerPartyId !== c.organizationPartyId)
            throw new Error("Routing belongs to another method organization")
        const edited =
            [...out.operationRows, ...out.releasedOperationRows].find(o => o.workEffortId === p.selectedOperationId) || {}
        const result = Object.assign(c, out, {
            workEffortId: c.workEffortId,
            operationEdit: Object.assign(
                {
                    methodBatchQuantity: 1,
                    methodQuantityUomId: c.product.amountUomId || "OTH_ea",
                    timeUomId: "TF_hr",
                    estimatedSetupTime: 0,
                    estimatedWorkTime: 0,
                    methodMachineSetupTime: 0,
                    methodMachineRunTime: 0
                },
                edited,
                {
                    operationWorkEffortId: edited.workEffortId || null,
                    estimatedSetupTime: edited.estimatedSetupTime ?? edited.setupTime ?? 0,
                    estimatedWorkTime: edited.estimatedWorkTime ?? edited.runTime ?? 0,
                    methodMachineSetupTime: edited.methodMachineSetupTime ?? edited.machineSetupTime ?? 0,
                    methodMachineRunTime: edited.methodMachineRunTime ?? edited.machineRunTime ?? 0,
                    methodBatchQuantity: edited.methodBatchQuantity ?? edited.batchQuantity ?? 1,
                    methodQuantityUomId: edited.methodQuantityUomId || edited.quantityUomId || c.product.amountUomId || "OTH_ea",
                    methodWorkCenterId: edited.methodWorkCenterId || edited.workCenterFacilityId || null,
                    methodPredecessorIds: edited.methodPredecessorIds || edited.predecessorWorkEffortIds || "",
                    changeReason: ""
                }
            )
        })
        delete result.operationEdit.workEffortId
        result.routingExpectedRevision = out.expectedRevision
        delete result.expectedRevision
        // the routing header: its caption facts and a state chip
        const drafts = out.operationRows.length,
            released = out.releasedOperationRows.length
        result.routingFactsText = c.workEffortId
            ? "Routing " + c.workEffortId + " · " + released + " released " + (released === 1 ? "operation" : "operations")
            : "This method has no routing yet."
        result.routingState = !c.workEffortId
            ? {text: "No routing", color: "grey"}
            : drafts
              ? {text: drafts + " draft " + (drafts === 1 ? "change" : "changes"), color: "warning"}
              : out.releaseHistory?.length || released
                ? {text: "Released", color: "positive"}
                : {text: "Not released", color: "grey"}
        return result
    }
    function execute(op, p) {
        p = lib.blankToNull(p, [
            "productBomId",
            "workEffortId",
            "bomItemId",
            "operationWorkEffortId",
            "componentProductBomId",
            "expectedRevision"
        ])
        if (op === "context") return context(p)
        if (op === "storeBom") return storeBom(p)
        if (op === "storeItem") return storeItem(p)
        if (op === "routing") return routing(p)
        if (op === "explosion") {
            const result = report(p, S + "get#BomExplosion"),
                costAccess = ec.resource.script("component://mr-mantle/service/mantle/product/CostPolicy.js").capabilities()
            result.canCostRead = costAccess.read
            if (costAccess.read && result.productBomId) {
                // A failing cost preview leaves the explosion itself readable, with the failure as a cost finding.
                ec.message.pushErrors()
                try {
                    const cost = call(
                        "mantle.product.CostServices.preview#ProductCostRollup",
                        Object.assign({}, p, {
                            productId: result.productId,
                            productBomId: result.productBomId,
                            organizationPartyId: result.organizationPartyId,
                            transientPreview: true,
                            includePathTotals: true
                        })
                    )
                    result.costFindings = cost.findings
                    result.costSummary = cost.standardCost
                    const totals = cost.pathTotals || {}
                    result.explosionRows = result.explosionRows.map(row =>
                        Object.assign({}, row, {
                            estimatedAmount: totals[row.path] ?? null,
                            costCurrency: cost.standardCost.priceUomId
                        })
                    )
                } catch (e) {
                    ec.logger.error("Explosion cost preview of product " + result.productId + ": " + e)
                    result.costFindings = [{recordId: result.productBomId, message: String(e.message || e)}]
                } finally {
                    ec.message.clearErrors()
                    ec.message.popErrors()
                }
            }
            return result
        }
        if (op === "compare") return report(p, S + "compare#BomDates")
        if (op === "whereUsed") return report(p, S + "get#BomWhereUsed")
        const route = {
            importLegacy: [S + "import#LegacyBom", "edit"],
            validate: [S + "validate#BomDraft"],
            release: [S + "release#BomDraft", "approve"],
            storeRouting: [R + "store#Routing", "edit"],
            storeOperation: [R + "store#RoutingOperation", "edit"],
            storeResource: [R + "store#RoutingResource", "edit"],
            validateRouting: [R + "validate#RoutingDraft"],
            releaseRouting: [R + "release#RoutingDraft", "approve"],
            storeCenter: [R + "store#WorkCenter", "resources"],
            storeRate: [R + "store#WorkCenterRate", "resources"]
        }
        if (!route[op]) throw new Error("Unknown method operation " + op)
        const [name, need] = route[op]
        return native(p, name, requireAccess(method(p), need || "read"))
    }
    return execute(op, parameters)
}
;({execute: run})
