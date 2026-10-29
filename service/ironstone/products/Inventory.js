// Products view of Warehouse-owned inventory and policy. Quantities are scoped before they enter a response.
// Each invocation keeps its app route local, including nested catalog reads (ProductsLib.forCall).
function run(op, parameters) {
    const lib = ec.resource.script("component://mr-boss/service/ironstone/products/ProductsLib.js"),
        local = lib.forCall(parameters.appRoot),
        {one, rows, rowsIn, map, ms, dateText} = lib
    const P = "mantle.product.",
        F = "mantle.facility.",
        W = F + "WarehousePolicyServices."
    const call = (name, p = {}) => local.call(name, p, {sys: true, strict: true})
    const fieldLabels = {
        lotRequired: "Lot required",
        serialRequired: "Serial required",
        expiryBlock: "Block expired stock",
        serialPattern: "Serial pattern",
        lotPattern: "Lot pattern",
        shelfLifeDays: "Shelf life in days",
        nearExpiryDays: "Near-expiry warning days",
        minimumRemainingShelfLifeDays: "Minimum remaining shelf life"
    }
    // The product, the authorized facilities (those of internal organizations the user may read) and the one in focus.
    function context(p) {
        const shared = local.access(),
            capabilities = shared.capabilities,
            product = local.readableProduct(p.productId)
        if (!product) throw new Error("Product is not available")
        const internal = new Set(rows("mantle.party.PartyRole", {roleTypeId: "OrgInternal"}).map(role => role.partyId)),
            owners = capabilities.systemAdmin ? [...internal] : shared.ownerPartyIds.filter(id => internal.has(id))
        let facilities = rowsIn(F + "Facility", "ownerPartyId", owners)
        if (p.organizationPartyId && !p.facilityId)
            facilities = facilities.filter(row => row.ownerPartyId === p.organizationPartyId)
        const facility = p.facilityId
            ? facilities.find(row => row.facilityId === p.facilityId)
            : facilities.find(row => row.facilityTypeEnumId === "FcTpWarehouse") || facilities[0]
        if (p.facilityId && !facility) throw new Error("Facility is not available")
        const organizationPartyId =
            facility?.ownerPartyId || p.organizationPartyId || shared.activeOrganizationPartyId || shared.organizationPartyIds[0]
        if (organizationPartyId && !capabilities.systemAdmin && !shared.ownerPartyIds.includes(organizationPartyId))
            throw new Error("Stock organization is not available")
        return {
            appRoot: shared.appRoot,
            facilities,
            owners,
            product: map(product),
            productId: p.productId,
            stockable: ["PtAsset", "PtDigitalAsset", "PtAssetUse", "PtPickAssembly"].includes(product.productTypeEnumId),
            facility: facility ? map(facility) : null,
            facilityId: facility?.facilityId || null,
            organizationPartyId,
            facilityOptions: facilities.map(row => ({
                value: row.facilityId,
                label: (row.facilityName || row.facilityId) + " · " + row.ownerPartyId
            })),
            canPlan: !!(capabilities.stockPlan || capabilities.stockManage),
            costRead: !!capabilities.costRead
        }
    }
    // Stock in every authorized facility that holds or expects the product, one row per facility, and its lots.
    function stock(p) {
        const focus = context(p),
            checkedAt = ms(ec.user.nowTimestamp),
            empty = message =>
                Object.assign(focus, {stockRows: [], lotRows: [], totals: null, checkedAt, summaryMessage: message})
        if (!focus.stockable) return empty("This product does not carry stock.")
        if (!focus.facilities.length) return empty("No authorized stock facility is available.")
        const facilityIds = focus.facilities.map(row => row.facilityId),
            assets = rowsIn("mantle.product.asset.Asset", "facilityId", facilityIds).filter(
                row => row.productId === focus.productId && focus.owners.includes(row.ownerPartyId)
            ),
            openParts = rowsIn("mantle.order.OrderPart", "facilityId", facilityIds).filter(
                row =>
                    focus.owners.includes(row.customerPartyId) &&
                    ["OrderPlaced", "OrderProcessing", "OrderApproved", "OrderSent", "OrderHold"].includes(row.statusId)
            ),
            ordered = new Set(
                rowsIn(
                    "mantle.order.OrderItem",
                    "orderId",
                    openParts.map(row => row.orderId)
                )
                    .filter(row => row.productId === focus.productId)
                    .map(row => row.orderId + ":" + row.orderPartSeqId)
            ),
            // a facility gets a row when it holds the product, expects it on an open purchase, or is the one in focus
            used = new Set([
                ...assets.map(row => row.facilityId),
                ...openParts.filter(row => ordered.has(row.orderId + ":" + row.orderPartSeqId)).map(row => row.facilityId),
                focus.facilityId
            ]),
            unitText = one("moqui.basic.Uom", {uomId: focus.product.amountUomId})?.description || focus.product.amountUomId,
            sum = {onHand: 0, reserved: 0, available: 0, held: 0, incoming: 0},
            stockRows = []
        for (const facility of focus.facilities.filter(row => used.has(row.facilityId))) {
            try {
                const out = call(P + "AssetServices.get#ProductStockTotals", {
                        productId: focus.productId,
                        facilityId: facility.facilityId,
                        ownerPartyId: facility.ownerPartyId
                    }),
                    row = {
                        onHand: out.quantityOnHandTotal ?? 0,
                        reserved: out.reservedQuantity ?? 0,
                        available: out.availableToPromiseTotal ?? 0,
                        held: out.heldQuantity ?? 0,
                        incoming: out.incomingQuantity ?? 0
                    }
                for (const key of Object.keys(sum)) sum[key] = toDecimal(sum[key]).add(row[key])
                stockRows.push(
                    Object.assign(
                        {},
                        Object.fromEntries(Object.entries(row).map(([key, value]) => [key, Number(String(value))])),
                        {
                            productId: focus.productId,
                            facilityId: facility.facilityId,
                            facilityName: facility.facilityName || facility.facilityId,
                            ownerPartyId: facility.ownerPartyId,
                            quantityUomText: unitText,
                            availableStatusOnHand: String(out.availableStatusQuantity ?? 0),
                            focused: facility.facilityId === focus.facilityId
                        }
                    )
                )
            } catch (e) {
                ec.logger.error("Stock of " + focus.productId + " at " + facility.facilityId + " failed: " + e)
            }
        }
        const lots = new Map(
                rowsIn(
                    "mantle.product.asset.Lot",
                    "lotId",
                    assets.map(row => row.lotId)
                ).map(row => [row.lotId, row])
            ),
            names = new Map(focus.facilities.map(row => [row.facilityId, row.facilityName || row.facilityId])),
            byLot = new Map()
        for (const asset of assets.filter(row => row.lotId && toDecimal(row.quantityOnHandTotal ?? 0).compare(0) > 0)) {
            const key = asset.facilityId + ":" + asset.lotId,
                lot = lots.get(asset.lotId),
                row = byLot.get(key) || {
                    lotId: asset.lotId,
                    lotNumber: lot?.lotNumber || asset.lotId,
                    expirationDateText: dateText(lot?.expirationDate, "yyyy-MM-dd"),
                    facilityId: asset.facilityId,
                    facilityName: names.get(asset.facilityId),
                    onHand: toDecimal(0)
                }
            row.onHand = toDecimal(row.onHand).add(asset.quantityOnHandTotal)
            byLot.set(key, row)
        }
        const totals = Object.fromEntries(Object.entries(sum).map(([key, value]) => [key, String(value)]))
        return Object.assign(focus, {
            stockRows,
            lotRows: [...byLot.values()].map(row => Object.assign(row, {onHand: Number(String(row.onHand))})),
            totals,
            // the focused facility's own totals, which the projection checks against
            focusTotals: stockRows.find(row => row.focused) || null,
            checkedAt,
            summaryMessage:
                focus.product.productTypeEnumId === "PtPickAssembly"
                    ? "Kit availability includes assemblies possible from components."
                    : "Availability follows each facility’s order-pool rules. Held stock is separate from available stock; incoming is what open purchase orders still bring."
        })
    }
    function projection(p) {
        const focus = context(p),
            now = ms(ec.user.nowTimestamp),
            projectionRows = []
        if (!focus.stockable || !focus.facility)
            return Object.assign(focus, {
                projectionRows,
                projectionAvailable: false,
                projectionMessage: "Choose an authorized stock facility."
            })
        if (!ec.search.isAvailable())
            return Object.assign(focus, {
                projectionRows,
                projectionAvailable: false,
                projectionMessage: "Search is unavailable; demand and supply projection cannot be read."
            })
        const current = stock(p)
        let fresh = true,
            failed = false
        for (const days of [7, 14, 30]) {
            ec.message.pushErrors()
            try {
                const horizon = new Date(now + days * 86400000).toISOString(),
                    out = call(P + "InventoryReportServices.get#InventoryProjectedInfo", {
                        productIdList: [focus.productId],
                        facilityId: focus.facilityId,
                        organizationPartyId: focus.organizationPartyId,
                        estThruDate: horizon
                    }),
                    info = out.infoByProductId?.[focus.productId]
                if (!info) continue
                const matches =
                    toDecimal(info.quantityOnHandTotalSum ?? 0).compare(current.focusTotals?.availableStatusOnHand ?? 0) === 0
                fresh = fresh && matches
                projectionRows.push({
                    horizonText: ec.l10n.format(new Date(now + days * 86400000), "yyyy-MM-dd"),
                    demand: info.orderNotReserved,
                    consume: info.estRunConsumeRemaining,
                    produce: info.estRunProduceRemaining,
                    incoming: info.prodEstQuantitySum,
                    projected: info.totalProjected,
                    freshness: matches ? "Stock quantity agrees" : "Stock quantity differs"
                })
            } catch (e) {
                failed = true
                ec.logger.error(
                    "Stock projection " + focus.productId + " at " + focus.facilityId + " horizon " + days + " failed: " + e
                )
            } finally {
                ec.message.clearErrors()
                ec.message.popErrors()
            }
        }
        return Object.assign(focus, {
            projectionRows,
            projectionAvailable: projectionRows.length > 0,
            projectionMessage: !projectionRows.length
                ? "No indexed projection is available for this product, facility and owner."
                : failed || !fresh
                  ? "Projection may be stale or incomplete. Current stock remains available on Summary."
                  : "Indexed sales demand, production consumption and supply. Stock quantity was checked against current records; projected dates are not promises."
        })
    }
    function policy(p) {
        const focus = context(p)
        if (!focus.facility || !focus.stockable)
            return Object.assign(focus, {
                facilityPolicy: {},
                locationPolicies: [],
                locationOptions: [],
                trackingSettings: {},
                trackingHistory: [],
                trackingSources: [],
                policyMessage: "Choose a stockable product and authorized facility."
            })
        const facility = call(F + "FacilityServices.get#ProductFacilityPolicy", {
                productId: focus.productId,
                facilityId: focus.facilityId
            }),
            resolved = call(W + "resolve#WarehousePolicy", {
                organizationPartyId: focus.organizationPartyId,
                productId: focus.productId,
                facilityId: focus.facilityId,
                asOfDate: p.asOfDate
            }),
            trackingScope = p.trackingScope === "organization" ? "organization" : "facility",
            edited =
                trackingScope === "facility"
                    ? resolved
                    : call(W + "resolve#WarehousePolicy", {
                          organizationPartyId: focus.organizationPartyId,
                          productId: focus.productId,
                          asOfDate: p.asOfDate
                      })
        const trackingSettings = Object.assign(
            {
                productId: focus.productId,
                facilityId: focus.facilityId,
                organizationPartyId: focus.organizationPartyId,
                trackingScope
            },
            edited.configuredPolicy
        )
        trackingSettings.facilityId = focus.facilityId
        trackingSettings.productId = focus.productId
        trackingSettings.trackingScope = trackingScope
        for (const field of Object.keys(fieldLabels)) if (trackingSettings[field] == null) trackingSettings[field] = ""
        trackingSettings.expectedFromDate = edited.configuredPolicy.fromDate || null
        trackingSettings.changeReason = ""
        facility.facilityPolicy = Object.assign(
            {productId: focus.productId, facilityId: focus.facilityId},
            facility.facilityPolicy
        )
        facility.facilityPolicy.changeReason = ""
        facility.facilityPolicy.reorderMethodText =
            one("moqui.basic.Enumeration", {enumId: facility.facilityPolicy.reorderMethodEnumId})?.description || ""
        facility.facilityPolicy.abcClassText =
            one("moqui.basic.Enumeration", {enumId: facility.facilityPolicy.abcClassEnumId})?.description || ""
        for (const key of ["minimumStock", "maximumStock", "reorderQuantity", "daysToShip"])
            if (facility.facilityPolicy[key] != null) facility.facilityPolicy[key] = String(facility.facilityPolicy[key])
        for (const row of facility.locationPolicies)
            for (const key of ["minimumStock", "moveQuantity"]) if (row[key] != null) row[key] = String(row[key])
        return Object.assign(focus, facility, {
            trackingScope,
            trackingSettings,
            trackingSources: resolved.sourceRows.map(r => ({
                fieldLabel: fieldLabels[r.field],
                valueText: r.value == null ? "Not set" : r.value === "Y" ? "Yes" : r.value === "N" ? "No" : String(r.value),
                sourceText:
                    r.source ||
                    r.organizationPartyId +
                        " · " +
                        (r.facilityId === "_NA_" ? "all facilities" : r.facilityId) +
                        " · " +
                        (r.productId === "_NA_" ? "all products" : r.productId),
                fromDateText: dateText(r.fromDate)
            })),
            trackingHistory: edited.history.map(r =>
                Object.assign({}, r, {
                    lotText: r.lotRequired == null ? "Inherit" : r.lotRequired === "Y" ? "Yes" : "No",
                    serialText: r.serialRequired == null ? "Inherit" : r.serialRequired === "Y" ? "Yes" : "No",
                    fromDateText: dateText(r.fromDate),
                    thruDateText: dateText(r.thruDate)
                })
            ),
            locationOptions: rows(F + "FacilityLocation", {facilityId: focus.facilityId}).map(r => ({
                value: r.locationSeqId,
                label: [r.locationSeqId, r.areaId, r.aisleId, r.sectionId].filter(Boolean).join(" · ")
            })),
            abcOptions: lib.enumOptions("AbcClass"),
            reorderOptions: lib.enumOptions("ReorderMethod"),
            policyMessage:
                "Tracking changes start a dated policy. Empty exception fields inherit from broader scopes; an inherited expiry prohibition remains in force."
        })
    }
    function storeFacility(p) {
        const focus = context(p)
        if (!focus.canPlan) throw new Error("Warehouse stock-planner or manager authority is required")
        return call(
            F + "FacilityServices.store#ProductFacilityPolicy",
            Object.assign({}, p, {
                productId: focus.productId,
                facilityId: focus.facilityId,
                organizationPartyId: focus.organizationPartyId
            })
        )
    }
    function storeTracking(p) {
        const focus = context(p)
        if (!focus.canPlan) throw new Error("Warehouse stock-planner or manager authority is required")
        return call(
            W + "store#TrackingPolicy",
            Object.assign({}, p, {
                productId: focus.productId,
                organizationPartyId: focus.organizationPartyId,
                facilityId: p.trackingScope === "organization" ? null : focus.facilityId,
                fromDate: p.effectiveFromDate || p.fromDate || null
            })
        )
    }
    const operations = {context, stock, projection, policy, storeFacility, storeTracking}
    if (!operations[op]) throw new Error("Unknown stock operation " + op)
    return operations[op](parameters)
}
;({execute: run})
