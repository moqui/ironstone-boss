// Products context for supplier offers. The native price policy remains the writer and amount guard.
// Each invocation keeps its app route local, including nested catalog reads (ProductsLib.forCall).
function run(op, parameters) {
    const lib = ec.resource.script("component://mr-boss/service/ironstone/products/ProductsLib.js"),
        local = lib.forCall(parameters.appRoot),
        {find, one, rows, rowsIn, ms, dateText} = lib
    const C = "ironstone.products.CatalogServices.",
        P = "mantle.product."
    const call = (name, p = {}) => local.call(name, p, {sys: true, strict: true})
    const active = (row, at) => (ms(row.fromDate) ?? -Infinity) <= at && (ms(row.thruDate) ?? Infinity) > at
    const price = (op, p) => ec.resource.script("component://mr-boss/service/ironstone/products/Prices.js").execute(op, p)

    // The user's shared context with the internal buying organization the offers belong to.
    function scope(p, write = false) {
        const context = local.access(),
            capabilities = context.capabilities,
            organizationPartyId = p.organizationPartyId || context.activeOrganizationPartyId || context.organizationPartyIds[0]
        if (!(write ? capabilities.supplierPriceEdit : capabilities.supplierPriceRead))
            throw new Error("Supplier-price authority is required")
        if (
            !organizationPartyId ||
            !one("mantle.party.PartyRole", {partyId: organizationPartyId, roleTypeId: "OrgInternal"}) ||
            (!capabilities.systemAdmin && !context.organizationPartyIds.includes(organizationPartyId))
        )
            throw new Error("Choose an available internal buying organization")
        return Object.assign({}, context, {organizationPartyId})
    }
    function partyVisible(party, context) {
        return (
            !!party &&
            (!party.privateOwnerUserId || party.privateOwnerUserId === ec.user.userId) &&
            (context.capabilities.systemAdmin ||
                context.ownerPartyIds.includes(party.ownerPartyId) ||
                context.organizationPartyIds.includes(party.partyId))
        )
    }
    // An external supplier the user may see; checked once per supplier in an invocation.
    const supplierChecks = new Map()
    function supplier(partyId, context) {
        if (!supplierChecks.has(partyId)) {
            const party = one("mantle.party.Party", {partyId})
            const usable =
                partyVisible(party, context) &&
                party.disabled !== "Y" &&
                !!one("mantle.party.PartyRole", {partyId, roleTypeId: "Supplier"}) &&
                !one("mantle.party.PartyRole", {partyId, roleTypeId: "OrgInternal"})
            supplierChecks.set(partyId, usable ? party : null)
        }
        const party = supplierChecks.get(partyId)
        if (!party) throw new Error("Supplier is not available")
        return party
    }
    function product(productId) {
        const record = local.readableProduct(productId)
        if (!record) throw new Error("Product is not available")
        return record
    }
    // An offer as the screens show it: names, its pack, state and whether it may be corrected.
    function display(offer, context, at, names) {
        const data = lib.map(offer),
            now = ms(ec.user.nowTimestamp),
            pack = rows(P + "ProductAssoc", {productId: offer.productId, productAssocTypeEnumId: "PatPackagingFor"}).find(
                edge => active(edge, at) && local.readableProduct(edge.toProductId)
            )
        Object.assign(data, {
            organizationPartyId: context.organizationPartyId,
            productName: product(offer.productId).productName,
            supplierName: names.get(offer.vendorPartyId) || offer.vendorPartyId,
            buyerName: names.get(offer.customerPartyId) || offer.customerPartyId,
            packProductId: pack ? offer.productId : null,
            baseProductId: pack?.toProductId || null,
            packSize: pack?.quantity || offer.quantityIncluded || null,
            packQuantityUomId: pack ? pack.quantityUomId || product(pack.toProductId).amountUomId || null : null,
            canEdit: context.capabilities.supplierPriceEdit,
            canCorrect: find("mantle.order.OrderItem", {productPriceId: offer.productPriceId}).count() === 0,
            state:
                ms(offer.fromDate) > now
                    ? "Scheduled"
                    : ms(offer.thruDate) != null && ms(offer.thruDate) <= now
                      ? "Ended"
                      : "Effective"
        })
        for (const field of ["fromDate", "thruDate"]) data[field + "Text"] = dateText(offer[field])
        for (const field of ["price", "minQuantity", "quantityIncrement", "quantityIncluded", "standardLeadTimeDays", "packSize"])
            if (data[field] != null) data[field] = String(data[field])
        return data
    }
    function offers(p) {
        const context = scope(p),
            at = p.asOfDate == null ? ms(ec.user.nowTimestamp) : ms(p.asOfDate)
        if (!Number.isFinite(at)) throw new Error("Choose a valid offer date")
        if (p.vendorPartyId) supplier(p.vendorPartyId, context)
        let productIds
        if (p.productId) {
            // Pack offers retain their own priced product. No dimensional unit is invented for a pack.
            productIds = [product(p.productId).productId]
            for (const edge of rows(P + "ProductAssoc", {toProductId: p.productId, productAssocTypeEnumId: "PatPackagingFor"}))
                if (active(edge, at) && local.readableProduct(edge.productId)) productIds.push(edge.productId)
            productIds = [...new Set(productIds)]
        } else {
            const priced = find(P + "ProductPrice", {customerPartyId: context.organizationPartyId})
                .selectField("productId")
                .distinct(true)
                .list()
            productIds = local.visibleProductIds(Array.from(priced).map(row => row.productId))
        }
        const matching = []
        const itemCode = String(p.supplierItemCode || "").toLowerCase()
        for (const productId of productIds) {
            ec.message.pushErrors()
            try {
                const found = call(P + "PriceServices.find#ProductPrices", {
                    productId,
                    direction: "purchase",
                    asOfDate: p.asOfDate,
                    includeHistory: p.includeHistory
                })
                for (const offer of found.productPriceList || []) {
                    if (
                        offer.customerPartyId !== context.organizationPartyId ||
                        offer.priceTypeEnumId === "PptAverage" ||
                        (p.vendorPartyId && offer.vendorPartyId !== p.vendorPartyId) ||
                        (p.priceUomId && offer.priceUomId !== p.priceUomId) ||
                        (p.preferredOrderEnumId && offer.preferredOrderEnumId !== p.preferredOrderEnumId) ||
                        (itemCode &&
                            !String(offer.otherPartyItemId || "")
                                .toLowerCase()
                                .includes(itemCode))
                    )
                        continue
                    try {
                        supplier(offer.vendorPartyId, context)
                        matching.push(offer)
                    } catch (e) {
                        ec.logger.error("Supplier offer " + offer.productPriceId + " failed: " + e)
                    }
                }
            } catch (e) {
                ec.logger.error("Supplier offers for product " + productId + " failed: " + e)
            } finally {
                ec.message.clearErrors()
                ec.message.popErrors()
            }
        }
        const groupKey = offer => String(p.groupBy === "product" ? offer.productId : offer.vendorPartyId)
        matching.sort(
            (a, b) =>
                groupKey(a).localeCompare(groupKey(b)) ||
                String(a.productId).localeCompare(String(b.productId)) ||
                ms(b.fromDate) - ms(a.fromDate)
        )
        // only the page shown is decorated, with the party names of its rows read in one query
        const shown = lib.page(matching, p),
            names = new Map(
                rowsIn(
                    "mantle.party.Organization",
                    "partyId",
                    shown.rows.flatMap(offer => [offer.vendorPartyId, offer.customerPartyId])
                ).map(org => [org.partyId, org.organizationName])
            )
        return {
            appRoot: context.appRoot,
            organizationPartyId: context.organizationPartyId,
            offerRows: shown.rows.map(offer => display(offer, context, at, names)),
            offerRowsCount: shown.count,
            pageIndex: shown.pageIndex,
            pageSize: shown.pageSize,
            canSupplierPriceEdit: context.capabilities.supplierPriceEdit
        }
    }
    function options(p) {
        const context = scope(p),
            out = price("options", {appRoot: parameters.appRoot})
        out.priceOptions.types = out.priceOptions.types.filter(option => option.value !== "PptAverage")
        out.priceOptions.organizations = out.priceOptions.organizations.filter(
            option => context.capabilities.systemAdmin || context.organizationPartyIds.includes(option.value)
        )
        out.pricingDefaults = call(P + "PriceServices.get#PricingSettings", {
            organizationPartyId: context.organizationPartyId
        }).settings
        return Object.assign(out, {
            organizationPartyId: context.organizationPartyId,
            preferenceOptions: lib.enumOptions("SupplierPreferredOrder"),
            ratingOptions: lib.enumOptions("SupplierRatingType"),
            appRoot: context.appRoot
        })
    }
    // store, replace or expire through Prices.js, with the buyer and supplier of an existing offer fixed.
    function write(op, p) {
        const context = scope(p, true),
            old = p.productPriceId ? one(P + "ProductPrice", {productPriceId: p.productPriceId}) : null
        if (p.productPriceId && !old) throw new Error("Supplier offer is not available")
        const buyer = old?.customerPartyId || p.customerPartyId || context.organizationPartyId,
            vendor = old?.vendorPartyId || p.vendorPartyId
        if (
            buyer !== context.organizationPartyId ||
            (p.customerPartyId && p.customerPartyId !== buyer) ||
            (p.vendorPartyId && old && p.vendorPartyId !== vendor)
        )
            throw new Error("Offer is outside the fixed supplier and buyer scope")
        supplier(vendor, context)
        if (
            old &&
            ec.resource.script("component://mr-mantle/service/mantle/product/PricePolicy.js").execute("direction", old) !==
                "purchase"
        )
            throw new Error("Only supplier offers belong here")
        return price(op, Object.assign({}, p, {customerPartyId: buyer, vendorPartyId: vendor}))
    }
    function detail(p) {
        const context = scope(p),
            party = supplier(p.vendorPartyId || p.partyId, context),
            contacts = call("ironstone.commons.ContactServices.get#ContactRecord", {partyId: party.partyId})
        return {
            appRoot: context.appRoot,
            organizationPartyId: context.organizationPartyId,
            vendorPartyId: party.partyId,
            supplier: {
                partyId: party.partyId,
                supplierName: one("mantle.party.Organization", {partyId: party.partyId})?.organizationName || party.partyId,
                ownerPartyId: party.ownerPartyId,
                canEditContact: !!contacts.access?.canEdit
            },
            contactRows: contacts.contactMechList || [],
            addressRows: contacts.addressList || [],
            roleRows: rows("mantle.party.PartyRole", {partyId: party.partyId}).map(role => ({roleTypeId: role.roleTypeId})),
            relatedContacts: (contacts.relationshipList || []).filter(relation =>
                partyVisible(one("mantle.party.Party", {partyId: relation.otherPartyId || relation.partyId}), context)
            )
        }
    }
    const operations = {
        offers,
        options,
        detail,
        store: p => write("store", p),
        replace: p => write("replace", p),
        expire: p => write("expire", p)
    }
    if (!operations[op]) throw new Error("Unknown supplier operation " + op)
    return operations[op](parameters)
}
;({execute: run})
