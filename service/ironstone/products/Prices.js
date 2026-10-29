// Price projections and reviewed changes. Every native/domain read is scoped before any value enters a response.
// Each invocation keeps its app route local (ProductsLib.forCall).
function run(op, parameters) {
    const lib = ec.resource.script("component://mr-boss/service/ironstone/products/ProductsLib.js"),
        local = lib.forCall(parameters.appRoot),
        {find, one, rows, rowsIn, ms, dateText, ids} = lib,
        {access: shared} = local
    const P = "mantle.product.",
        E = P + "ProductPrice",
        C = "ironstone.products.CatalogServices.",
        M = P + "PriceServices."
    const call = (name, p = {}, newTransaction = false) => local.call(name, p, {sys: true, strict: true, newTransaction})
    const domain = (op, p) => ec.resource.script("component://mr-mantle/service/mantle/product/PricePolicy.js").execute(op, p)
    const enumDescriptions = new Map()
    const enumDescription = enumId => {
        if (!enumDescriptions.has(enumId))
            enumDescriptions.set(enumId, one("moqui.basic.Enumeration", {enumId})?.description || enumId)
        return enumDescriptions.get(enumId)
    }
    function access() {
        const context = shared()
        if (!context.capabilities.read) throw new Error("Catalog read authority is required")
        return context
    }
    function product(productId) {
        const record = local.readableProduct(productId)
        if (!record) throw new Error("Product is not available")
        return record
    }
    function row(productPriceId, write = false) {
        const price = one(E, {productPriceId})
        if (!price) throw new Error("Price record is not available")
        product(price.productId)
        domain("access", price)
        if (write) {
            const capabilities = access().capabilities,
                direction = domain("direction", price)
            if (!(
                capabilities.systemAdmin || (direction === "purchase" ? capabilities.supplierPriceEdit : capabilities.priceEdit)
            ))
                throw new Error("Price edit authority is required")
        }
        return price
    }
    // A price row as the screens show it: names, state, whether it may be edited or corrected, and margin when allowed.
    function display(price) {
        const out = lib.map(price),
            context = access(),
            capabilities = context.capabilities,
            direction = domain("direction", price),
            now = ms(ec.user.nowTimestamp)
        out.direction = direction === "public" ? "sales" : direction
        out.productName = product(price.productId).productName
        out.priceType = enumDescription(price.priceTypeEnumId)
        out.canEdit =
            price.priceTypeEnumId !== "PptAverage" &&
            (capabilities.systemAdmin || (direction === "purchase" ? capabilities.supplierPriceEdit : capabilities.priceEdit))
        for (const field of ["fromDate", "thruDate", "lastUpdatedStamp"]) out[field + "Text"] = dateText(price[field])
        out.canCorrect = out.canEdit && find("mantle.order.OrderItem", {productPriceId: price.productPriceId}).count() === 0
        if (
            capabilities.marginRead &&
            out.direction === "sales" &&
            price.priceTypeEnumId !== "PptAverage" &&
            price.pricePurposeEnumId === "PppPurchase" &&
            !price.termUomId
        )
            Object.assign(
                out,
                call("mantle.product.CostServices.get#ProductMargin", {
                    productId: price.productId,
                    organizationPartyId:
                        price.vendorPartyId || context.activeOrganizationPartyId || context.organizationPartyIds[0],
                    quantityUomId: price.quantityUomId,
                    priceUomId: price.priceUomId,
                    asOfDate: ec.user.nowTimestamp,
                    price: price.price
                })
            )
        out.state =
            ms(price.fromDate) > now
                ? "Scheduled"
                : ms(price.thruDate) != null && ms(price.thruDate) <= now
                  ? "Ended"
                  : "Effective"
        return out
    }
    function findPrices(p) {
        const capabilities = access().capabilities
        if (!capabilities.priceRead && !capabilities.supplierPriceRead && !capabilities.costRead)
            throw new Error("Price read authority is required")
        if (p.productId) product(p.productId)
        // the products with price rows, read as one distinct column, then only those the user may read
        const productIds = p.productId
            ? [p.productId]
            : local.visibleProductIds(
                  Array.from(find(E, {}).selectField("productId").distinct(true).list()).map(price => price.productId)
              )
        const matching = []
        for (const productId of productIds) {
            ec.message.pushErrors()
            try {
                const found = call(M + "find#ProductPrices", {
                    productId,
                    includeHistory: p.includeHistory,
                    asOfDate: p.asOfDate,
                    direction: p.direction || "all",
                    priceTypeEnumId: p.priceTypeEnumId
                })
                for (const price of found.productPriceList || []) {
                    if (
                        p.organizationPartyId &&
                        price.vendorPartyId !== p.organizationPartyId &&
                        price.customerPartyId !== p.organizationPartyId
                    )
                        continue
                    if (p.priceUomId && price.priceUomId !== p.priceUomId) continue
                    if (p.pricePurposeEnumId && price.pricePurposeEnumId !== p.pricePurposeEnumId) continue
                    if (p.vendorPartyId && price.vendorPartyId !== p.vendorPartyId) continue
                    if (p.customerPartyId && price.customerPartyId !== p.customerPartyId) continue
                    if (p.productStoreId && price.productStoreId !== p.productStoreId) continue
                    if (p.agreementId && price.agreementId !== p.agreementId) continue
                    matching.push(price)
                }
            } catch (e) {
                ec.logger.error("Price rows for product " + productId + " failed: " + e)
            } finally {
                ec.message.clearErrors()
                ec.message.popErrors()
            }
        }
        matching.sort(
            (a, b) =>
                String(a.productId).localeCompare(String(b.productId)) ||
                ms(b.fromDate) - ms(a.fromDate) ||
                String(a.productPriceId).localeCompare(String(b.productPriceId))
        )
        // only the page shown is decorated: names, margins and order counts are read for these rows alone
        const shown = lib.page(matching, p)
        return {
            priceRows: shown.rows.map(display),
            priceRowsCount: shown.count,
            pageIndex: shown.pageIndex,
            pageSize: shown.pageSize
        }
    }
    function store(p) {
        access()
        if (p.productPriceId) {
            const old = row(p.productPriceId, true)
            if (p.productId && p.productId !== old.productId) throw new Error("Price is not on this product")
        } else product(p.productId)
        return call(M + "store#ProductPrice", p)
    }
    function replace(p) {
        access()
        row(p.productPriceId, true)
        return call(M + "replace#ProductPrice", p)
    }
    function expire(p) {
        access()
        row(p.productPriceId, true)
        return call(M + "expire#ProductPrice", p)
    }
    // The organizations, suppliers and customers the user may price for: parties in those roles, read by role and then
    // by ID, with names from one query each.
    function options() {
        const context = access(),
            capabilities = context.capabilities,
            roleRows = find("mantle.party.PartyRole")
                .condition("roleTypeId", "in", ["OrgInternal", "Supplier", "Customer"])
                .list(),
            roles = {OrgInternal: new Set(), Supplier: new Set(), Customer: new Set()}
        for (const role of roleRows) roles[role.roleTypeId].add(role.partyId)
        const partyIds = [...roles.OrgInternal, ...roles.Supplier, ...roles.Customer],
            parties = rowsIn("mantle.party.Party", "partyId", partyIds).filter(
                party =>
                    (!party.privateOwnerUserId || party.privateOwnerUserId === ec.user.userId) &&
                    (capabilities.systemAdmin ||
                        context.ownerPartyIds.includes(party.ownerPartyId) ||
                        context.organizationPartyIds.includes(party.partyId))
            ),
            names = new Map()
        for (const person of rowsIn("mantle.party.Person", "partyId", partyIds)) names.set(person.partyId, person.firstName)
        for (const org of rowsIn("mantle.party.Organization", "partyId", partyIds)) names.set(org.partyId, org.organizationName)
        const partyOption = party => ({
            value: party.partyId,
            label: (names.get(party.partyId) || party.partyId) + " (" + party.partyId + ")"
        })
        const defaultOrg = context.activeOrganizationPartyId || context.organizationPartyIds[0] || null,
            pricingDefaults =
                defaultOrg && (capabilities.priceRead || capabilities.supplierPriceRead || capabilities.catalogAdmin)
                    ? call(M + "get#PricingSettings", {organizationPartyId: defaultOrg}).settings
                    : {}
        return {
            pricingDefaults,
            priceOptions: {
                organizations: parties.filter(party => roles.OrgInternal.has(party.partyId)).map(partyOption),
                suppliers: parties
                    .filter(party => roles.Supplier.has(party.partyId) && !roles.OrgInternal.has(party.partyId))
                    .map(partyOption),
                customers: parties.filter(party => roles.Customer.has(party.partyId)).map(partyOption),
                types: lib
                    .enumOptions("ProductPriceType")
                    .filter(option => option.value !== "PptAverage" || capabilities.costRead),
                purposes: lib.enumOptions("ProductPricePurpose"),
                currencies: rows("moqui.basic.Uom", {uomTypeEnumId: "UT_CURRENCY_MEASURE"}).map(uom => ({
                    value: uom.uomId,
                    label: uom.uomId + " · " + uom.description
                })),
                units: rows("moqui.basic.Uom")
                    .filter(
                        uom =>
                            uom.uomTypeEnumId !== "UT_CURRENCY_MEASURE" &&
                            (uom.uomTypeEnumId !== "UT_OTHER_MEASURE" || ["OTH_ea", "OTH_ct", "OTH_pp"].includes(uom.uomId))
                    )
                    .map(uom => ({value: uom.uomId, label: uom.description + " (" + uom.uomId + ")"})),
                stores: rows(P + "store.ProductStore")
                    .filter(store => capabilities.systemAdmin || context.ownerPartyIds.includes(store.organizationPartyId))
                    .map(store => ({value: store.productStoreId, label: store.storeName || store.productStoreId}))
            },
            defaultOrganizationPartyId: defaultOrg,
            canPriceEdit: capabilities.priceEdit,
            canSupplierPriceEdit: capabilities.supplierPriceEdit
        }
    }
    function audit(p) {
        access()
        product(p.productId)
        const allowed = call(M + "find#ProductPrices", {productId: p.productId, includeHistory: true}).productPriceList,
            changes = []
        let historyRestricted = false
        const labels = {
            price: "Unit price",
            minQuantity: "Minimum quantity",
            fromDate: "Effective from",
            thruDate: "Through",
            priceUomId: "Currency",
            quantityUomId: "Quantity unit",
            vendorPartyId: "Vendor",
            customerPartyId: "Customer",
            priceTypeEnumId: "Price type",
            pricePurposeEnumId: "Purpose",
            productId: "Product",
            productStoreId: "Store",
            agreementId: "Agreement",
            agreementItemSeqId: "Agreement item",
            changeReason: "Reason",
            otherPartyItemId: "Supplier item code",
            otherPartyItemName: "Supplier item name",
            standardLeadTimeDays: "Lead time in days",
            termUomId: "Term unit"
        }
        const text = (field, value) =>
            value == null
                ? ""
                : ["fromDate", "thruDate"].includes(field) && Number.isFinite(ms(value))
                  ? dateText(value)
                  : ["priceTypeEnumId", "pricePurposeEnumId"].includes(field)
                    ? enumDescription(value)
                    : String(value)
        for (const price of allowed) {
            if (p.productPriceId && price.productPriceId !== p.productPriceId) continue
            const direction = domain("direction", price),
                org = direction === "purchase" ? price.customerPartyId : price.vendorPartyId
            if (
                (p.direction && p.direction !== "all" && p.direction !== (direction === "public" ? "sales" : direction)) ||
                (p.organizationPartyId && p.organizationPartyId !== org) ||
                (p.priceUomId && p.priceUomId !== price.priceUomId)
            )
                continue
            // A legacy row's earlier amounts show only when each of its earlier scopes is readable (PricePolicy).
            if (!domain("earlierScopesVisible", {productPriceId: price.productPriceId}).visible) {
                historyRestricted = true
                continue
            }
            for (const log of rows("moqui.entity.EntityAuditLog", {changedEntityName: E, pkPrimaryValue: price.productPriceId})) {
                if ((p.fromDate && ms(log.changedDate) < ms(p.fromDate)) || (p.thruDate && ms(log.changedDate) >= ms(p.thruDate)))
                    continue
                changes.push({
                    productPriceId: price.productPriceId,
                    direction,
                    priceUomId: price.priceUomId,
                    changedFieldName: log.changedFieldName,
                    fieldLabel: labels[log.changedFieldName] || log.changedFieldName,
                    oldValueText: log.oldValueText,
                    newValueText: log.newValueText,
                    oldDisplay: text(log.changedFieldName, log.oldValueText),
                    newDisplay: text(log.changedFieldName, log.newValueText),
                    changeReason: log.changeReason || price.changeReason,
                    changedByUserId: log.changedByUserId,
                    changedDate: log.changedDate,
                    changedDateText: dateText(log.changedDate)
                })
            }
        }
        changes.sort((a, b) => ms(b.changedDate) - ms(a.changedDate))
        return {auditRows: changes.slice(0, 1000), historyRestricted}
    }
    // The organization's default price currency, else the user's.
    function defaultCurrency(organizationPartyId) {
        const settings = organizationPartyId ? call(M + "get#PricingSettings", {organizationPartyId}).settings || {} : {}
        return settings.defaultCurrencyUomId || ec.user.userAccount?.currencyUomId || null
    }
    function statistics(p) {
        const context = access(),
            capabilities = context.capabilities
        product(p.productId)
        const direction = p.direction || "sales",
            org = p.organizationPartyId || context.activeOrganizationPartyId || context.organizationPartyIds[0]
        if (
            !["sales", "purchase"].includes(direction) ||
            !(direction === "sales" ? capabilities.priceRead : capabilities.supplierPriceRead)
        )
            throw new Error("Price authority for this direction is required")
        if (!org || (!capabilities.systemAdmin && !context.ownerPartyIds.includes(org)))
            throw new Error("Choose an available price organization")
        const currency = p.priceUomId || defaultCurrency(org)
        if (one("moqui.basic.Uom", {uomId: currency})?.uomTypeEnumId !== "UT_CURRENCY_MEASURE")
            throw new Error("Choose a price currency")
        const got = call(P + "InventoryReportServices.get#PriceHistoryInfo", {
            productIdList: [p.productId],
            vendorPartyId: direction === "sales" ? org : null,
            customerPartyId: direction === "purchase" ? org : null,
            direction,
            currencyUomId: currency,
            fromDate: p.fromDate,
            thruDate: p.thruDate || ec.user.nowTimestamp
        })
        return {
            statisticsAvailable: got.searchAvailable,
            statisticsMessage: got.searchAvailable
                ? "Transacted order prices in " + currency + " for " + org + "."
                : "Search is unavailable; transaction price statistics cannot be calculated.",
            statisticsRows: Object.entries(got.infoByProductId || {}).map(([productId, data]) =>
                Object.assign({productId, direction, organizationPartyId: org, priceUomId: currency}, data)
            )
        }
    }
    function bulkPreview(p) {
        const a = access(),
            org = p.organizationPartyId || a.activeOrganizationPartyId || a.organizationPartyIds[0],
            direction = p.direction || "sales"
        if (
            !org ||
            (!a.capabilities.systemAdmin && !a.ownerPartyIds.includes(org)) ||
            !(direction === "purchase" ? a.capabilities.supplierPriceEdit : a.capabilities.priceEdit)
        )
            throw new Error("Price editor authority in the selected organization is required")
        if (!["sales", "purchase"].includes(direction)) throw new Error("Choose a sales or supplier direction")
        if (!p.effectiveDate || ms(p.effectiveDate) < ms(ec.user.nowTimestamp))
            throw new Error("Choose an effective date now or later")
        if (!String(p.changeReason || "").trim()) throw new Error("Give a reason for the reviewed change")
        let selected = ids(p.productPriceIds),
            productIds = ids(p.productIds)
        const sourceFailures = []
        if (!selected.length && productIds.length)
            for (const id of productIds) {
                const found = findPrices(Object.assign({}, p, {productId: id, pageSize: 100, includeHistory: false}))
                selected.push(...found.priceRows.map(r => r.productPriceId))
                if (!found.priceRows.length)
                    sourceFailures.push({
                        productId: id,
                        result: "failed",
                        error: "No readable effective price matches this product and scope"
                    })
            }
        selected = ids(selected)
        if ((!selected.length && !sourceFailures.length) || selected.length > 1000)
            throw new Error("Select between 1 and 1000 price rows")
        const operationKey = p.operationKey || ec.user.randomString(32)
        if (!/^[A-Za-z0-9_.-]{1,40}$/.test(operationKey) || one(P + "ProductCatalogOperation", {operationKey}))
            throw new Error("Use a new operation key")
        const plan = [],
            result = sourceFailures
        for (const id of selected) {
            try {
                const old = row(id, true),
                    d = domain("direction", old),
                    rowOrg = d === "purchase" ? old.customerPartyId : old.vendorPartyId
                if ((d !== "public" && d !== direction) || rowOrg !== org)
                    throw new Error("Price row is outside the reviewed scope")
                for (const field of [
                    "priceTypeEnumId",
                    "pricePurposeEnumId",
                    "priceUomId",
                    "productStoreId",
                    "agreementId",
                    "vendorPartyId",
                    "customerPartyId"
                ])
                    if (p[field] && p[field] !== old[field]) throw new Error("Price row does not match the reviewed " + field)
                const amount =
                    p.fixedPrice != null
                        ? toDecimal(p.fixedPrice)
                        : toDecimal(old.price)
                              .multiply(toDecimal(1).add(toDecimal(p.percentChange || 0).divide(100)))
                              .add(p.amountChange || 0)
                const price = amount.setScale(6, "HALF_UP")
                if (price.compare(0) < 0) throw new Error("Resulting price cannot be negative")
                const request = {
                    productPriceId: id,
                    productId: old.productId,
                    expectedLastUpdatedStamp: old.lastUpdatedStamp,
                    expectedState: ec.user.singleUseCodeHash(JSON.stringify(old.getMap())),
                    effectiveDate: p.effectiveDate,
                    price: String(price),
                    beforePrice: String(old.price),
                    priceUomId: old.priceUomId,
                    minQuantity: old.minQuantity == null ? null : String(old.minQuantity),
                    changeReason: p.changeReason
                }
                plan.push(request)
                result.push({
                    productPriceId: id,
                    productId: old.productId,
                    productName: product(old.productId).productName,
                    priceUomId: old.priceUomId,
                    minQuantity: old.minQuantity,
                    vendorPartyId: old.vendorPartyId,
                    customerPartyId: old.customerPartyId,
                    productStoreId: old.productStoreId,
                    agreementId: old.agreementId,
                    beforePrice: old.price,
                    afterPrice: price,
                    result: "ready"
                })
            } catch (e) {
                ec.logger.error("Price-change preview row " + id + " failed: " + e)
                result.push({productPriceId: id, result: "failed", error: String(e.message || e)})
            }
        }
        const previewToken = ec.user.singleUseCodeHash(JSON.stringify(plan)),
            requestJson = JSON.stringify({
                organizationPartyId: org,
                direction,
                previewToken,
                changeReason: p.changeReason,
                previewFailures: result.filter(r => r.result === "failed")
            })
        call("create#" + P + "ProductCatalogOperation", {
            operationKey,
            operationType: "price-change",
            ownerPartyId: org,
            submittedByUserId: ec.user.userId,
            submittedDate: ec.user.nowTimestamp,
            requestJson
        })
        for (let i = 0; i < plan.length; i++)
            call("create#" + P + "ProductCatalogOperationItem", {
                operationKey,
                itemSeqId: i,
                itemKey: plan[i].productPriceId,
                requestJson: JSON.stringify(plan[i])
            })
        return {
            operationKey,
            previewToken,
            previewRows: result,
            readyCount: plan.length,
            failedCount: result.length - plan.length
        }
    }
    function operation(p) {
        const a = access(),
            op = one(P + "ProductCatalogOperation", {operationKey: p.operationKey})
        if (!op || op.operationType !== "price-change") throw new Error("Price-change operation is not available")
        const request = JSON.parse(op.requestJson)
        if (
            (!a.capabilities.systemAdmin && !a.ownerPartyIds.includes(op.ownerPartyId)) ||
            !(request.direction === "purchase" ? a.capabilities.supplierPriceEdit : a.capabilities.priceEdit)
        )
            throw new Error("Price-change operation is not available")
        return {op, request}
    }
    function applyItem(p) {
        const {request} = operation(p),
            item = find(P + "ProductCatalogOperationItem", {operationKey: p.operationKey, itemSeqId: p.itemSeqId})
                .forUpdate(true)
                .one()
        if (!item) throw new Error("Price-change item is not available")
        if (item.result === "created") return {}
        const args = JSON.parse(item.requestJson)
        row(args.productPriceId, true)
        const changed = call(M + "replace#ProductPrice", args)
        call("update#" + P + "ProductCatalogOperationItem", {
            operationKey: p.operationKey,
            itemSeqId: p.itemSeqId,
            result: "created",
            resultRecordId: changed.productPriceId,
            resultEntityName: E,
            errorMessage: null,
            completedDate: ec.user.nowTimestamp
        })
        return {}
    }
    function failItem(p) {
        operation(p)
        const item = find(P + "ProductCatalogOperationItem", {operationKey: p.operationKey, itemSeqId: p.itemSeqId})
            .forUpdate(true)
            .one()
        if (item && item.result !== "created")
            call("update#" + P + "ProductCatalogOperationItem", {
                operationKey: p.operationKey,
                itemSeqId: p.itemSeqId,
                result: "failed",
                errorMessage: p.errorMessage,
                completedDate: ec.user.nowTimestamp
            })
        return {}
    }
    function bulkApply(p) {
        const {request} = operation(p)
        if (!p.previewToken || request.previewToken !== p.previewToken)
            throw new Error("Confirm the exact reviewed price-change preview")
        for (const item of rows(P + "ProductCatalogOperationItem", {operationKey: p.operationKey}).filter(
            r => r.result !== "created"
        )) {
            ec.message.pushErrors()
            try {
                call(C + "apply#PriceChangeItem", {operationKey: p.operationKey, itemSeqId: item.itemSeqId}, true)
            } catch (e) {
                ec.logger.error("Price-change operation " + p.operationKey + " row " + item.itemKey + " failed: " + e)
                ec.message.clearErrors()
                try {
                    call(
                        C + "fail#PriceChangeItem",
                        {operationKey: p.operationKey, itemSeqId: item.itemSeqId, errorMessage: String(e.message || e)},
                        true
                    )
                } catch (storeError) {
                    ec.logger.error("Could not save price-change failure " + item.itemKey + ": " + storeError)
                }
            } finally {
                ec.message.clearErrors()
                ec.message.popErrors()
            }
        }
        return bulkResult(p)
    }
    function bulkResult(p) {
        const {request} = operation(p),
            result = Array.from(request.previewFailures || [])
        for (const item of rows(P + "ProductCatalogOperationItem", {operationKey: p.operationKey})) {
            const saved = JSON.parse(item.requestJson)
            try {
                row(saved.productPriceId, true)
                result.push({
                    productPriceId: saved.productPriceId,
                    productId: saved.productId,
                    successorProductPriceId: item.resultRecordId,
                    result: item.result || "pending",
                    error: item.errorMessage
                })
            } catch (e) {
                result.push({result: "unavailable", error: "Price row is no longer available"})
            }
        }
        return {
            operationKey: p.operationKey,
            previewToken: request.previewToken,
            results: result,
            successCount: result.filter(r => r.result === "created").length,
            failedCount: result.filter(r => r.result === "failed").length
        }
    }
    function bulkInfo(p) {
        const {request: manifest} = operation(p)
        const previewRows = rows(P + "ProductCatalogOperationItem", {operationKey: p.operationKey}).map(item => {
            const request = JSON.parse(item.requestJson),
                old = row(request.productPriceId, true)
            return {
                productPriceId: old.productPriceId,
                productId: old.productId,
                productName: product(old.productId).productName,
                beforePrice: request.beforePrice,
                afterPrice: request.price,
                priceUomId: request.priceUomId,
                minQuantity: request.minQuantity,
                changeReason: request.changeReason,
                result: item.result || (ms(old.lastUpdatedStamp) === ms(request.expectedLastUpdatedStamp) ? "ready" : "stale")
            }
        })
        return Object.assign(bulkResult(p), {
            previewRows: previewRows.concat(manifest.previewFailures || []),
            readyCount: previewRows.filter(r => r.result === "ready").length
        })
    }
    function execute(op, p) {
        return {
            findPrices,
            store,
            replace,
            expire,
            options,
            audit,
            statistics,
            bulkPreview,
            bulkApply,
            applyItem,
            failItem,
            bulkResult,
            bulkInfo
        }[op](p)
    }
    return execute(op, parameters)
}
;({execute: run})
