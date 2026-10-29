// The shared pricing screens use real direction grants, independently of a launcher or caller-supplied capabilities.
// Each invocation keeps its app route local (ProductsLib.forCall).
function run(op, parameters) {
    const lib = ec.resource.script("component://mr-boss/service/ironstone/products/ProductsLib.js"),
        local = lib.forCall(parameters.appRoot),
        {find, one, rows, rowsIn, ms, dateText: text} = lib
    const P = "mantle.product.",
        M = P + "PriceServices."
    const call = (name, p = {}) => local.call(name, p, {sys: true, strict: true})
    const domain = () => ec.resource.script("component://mr-mantle/service/mantle/product/PriceLists.js")
    let accessCache = null
    // The price-list scope of PriceLists.js with the user's direction grants, read once per invocation.
    function access() {
        if (accessCache) return accessCache
        if (!local.access().capabilities.read) throw new Error("Catalog read access is required")
        const policy = domain(),
            scope = policy.scope(),
            has = policy.has
        accessCache = Object.assign({}, scope, {
            canPriceRead: scope.systemAdmin || has("PRICE_VIEW") || has("PRICE_EDIT"),
            canSupplierRead: scope.systemAdmin || has("SUPPLIER_PRICE_VIEW") || has("SUPPLIER_PRICE_EDIT"),
            canPriceEdit: scope.systemAdmin || has("PRICE_EDIT"),
            canSupplierEdit: scope.systemAdmin || has("SUPPLIER_PRICE_EDIT"),
            canSettings: scope.systemAdmin || has("PRODUCT_CATALOG_ADMIN"),
            canCostRead: ec.resource.script("component://mr-mantle/service/mantle/product/CostPolicy.js").capabilities().read
        })
        return accessCache
    }
    function options() {
        const a = access()
        if (!a.canPriceRead && !a.canSupplierRead && !a.canSettings) throw new Error("Price authority is required")
        const visible = party =>
            (!party.privateOwnerUserId || party.privateOwnerUserId === ec.user.userId) &&
            (a.systemAdmin || a.ownerPartyIds.includes(party.ownerPartyId) || a.organizationPartyIds.includes(party.partyId))
        // the parties in the three roles a list names, read by role and then by ID, with names from one query each
        const roles = {OrgInternal: new Set(), Supplier: new Set(), Customer: new Set()}
        for (const role of find("mantle.party.PartyRole").condition("roleTypeId", "in", Object.keys(roles)).list())
            roles[role.roleTypeId].add(role.partyId)
        const partyIds = [...roles.OrgInternal, ...roles.Supplier, ...roles.Customer],
            parties = rowsIn("mantle.party.Party", "partyId", partyIds).filter(visible),
            names = new Map()
        for (const person of rowsIn("mantle.party.Person", "partyId", partyIds)) names.set(person.partyId, person.firstName)
        for (const org of rowsIn("mantle.party.Organization", "partyId", partyIds)) names.set(org.partyId, org.organizationName)
        const option = party => ({
            value: party.partyId,
            label: (names.get(party.partyId) || party.partyId) + " (" + party.partyId + ")"
        })
        const listChoices = call(M + "find#ProductPriceLists", {includeHistory: true}).priceListRows
        if (a.canSettings && !a.canPriceRead)
            for (const list of rows(P + "ProductPriceList", {direction: "sales"}).filter(
                list => a.systemAdmin || a.ownerPartyIds.includes(list.organizationPartyId)
            )) {
                if (
                    rows(P + "ProductPriceListParty", {priceListId: list.priceListId}).some(
                        listParty => !visible(one("mantle.party.Party", {partyId: listParty.partyId}) || {})
                    )
                )
                    continue
                listChoices.push({priceListId: list.priceListId, listName: list.listName})
            }
        return {
            pricingAccess: a,
            defaultOrganizationPartyId: a.activeOrganizationPartyId || a.organizationPartyIds[0],
            pricingOptions: {
                organizations: parties.filter(party => roles.OrgInternal.has(party.partyId)).map(option),
                vendors: parties.filter(party => roles.Supplier.has(party.partyId)).map(option),
                customers: parties.filter(party => roles.Customer.has(party.partyId)).map(option),
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
                bases: [
                    {value: "typed", label: "Typed price"},
                    {value: "fixed", label: "Fixed amount"},
                    {value: "list", label: "Another list"},
                    ...(a.canCostRead ? [{value: "standard", label: "Approved standard estimate"}] : [])
                ],
                purposes: lib.enumOptions("ProductPricePurpose"),
                types: lib.enumOptions("ProductPriceType").filter(option => option.value !== "PptAverage"),
                lists: listChoices.map(list => ({value: list.priceListId, label: list.listName + " (" + list.priceListId + ")"}))
            }
        }
    }
    function formatted(r) {
        return Object.assign({}, r, {
            fromDateText: text(r.fromDate),
            thruDateText: text(r.thruDate),
            canEdit: r.direction === "purchase" ? access().canSupplierEdit : access().canPriceEdit,
            stateText:
                ms(r.fromDate) > ms(ec.user.nowTimestamp)
                    ? "Scheduled"
                    : ms(r.thruDate) != null && ms(r.thruDate) <= ms(ec.user.nowTimestamp)
                      ? "Ended"
                      : r.state
        })
    }
    function lists(p) {
        const out = call(M + "find#ProductPriceLists", p)
        return {priceListRows: out.priceListRows.map(formatted)}
    }
    function detail(p) {
        const out = call(M + "get#ProductPriceListPublication", p),
            data = call(M + "find#ProductPriceRules", p),
            header = formatted(out.priceList),
            roles = header.parties || []
        header.asOfDateText = text(p.asOfDate || ec.user.nowTimestamp)
        const escape = v =>
            String(v ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c])
        header.printHeaderHtml =
            "<h1>" +
            escape(header.listName) +
            "</h1><p>Effective policy at " +
            escape(header.asOfDateText) +
            '</p><dl class="pricing-print-scope">' +
            [
                ["List", header.priceListId],
                ["Organization", header.organizationPartyId],
                ["Direction", header.direction],
                ["Currency", header.priceUomId],
                ["Purpose", header.pricePurposeEnumId],
                ["From", header.fromDateText],
                ["Through", header.thruDateText],
                ["Store", header.productStoreId],
                ["Agreement", header.agreementId],
                ["Agreement item", header.agreementItemSeqId],
                ["Party classification", header.partyClassificationId],
                ["Geography", header.geoId],
                ...roles.map(r => [r.roleTypeId, r.partyId])
            ]
                .filter(([, value]) => value != null && value !== "")
                .map(([label, value]) => "<div><dt>" + escape(label) + "</dt><dd>" + escape(value) + "</dd></div>")
                .join("") +
            "</dl>"
        for (const role of roles) header[role.roleTypeId === "Vendor" ? "vendorPartyId" : "customerPartyId"] = role.partyId
        const rules = data.priceRuleRows.map(r =>
            Object.assign({}, r, {
                fromDateText: text(r.fromDate),
                thruDateText: text(r.thruDate),
                calculation:
                    r.baseType === "fixed"
                        ? "Fixed " + String(r.fixedPrice)
                        : r.baseType === "list"
                          ? "List " + r.basePriceListId
                          : r.baseType === "standard"
                            ? "Approved standard estimate"
                            : r.basePriceTypeEnumId,
                selectorText: r.selector === "all" ? "All products" : r.productId || r.productCategoryId || r.productFeatureId,
                fromDateInput: ec.l10n.format(new Date(Math.max(Date.now(), ms(r.fromDate))), "yyyy-MM-dd HH:mm:ss")
            })
        )
        for (const rule of rules)
            for (const key of [
                "sequenceNum",
                "minQuantity",
                "maxQuantity",
                "fixedPrice",
                "percentChange",
                "amountChange",
                "roundingIncrement",
                "minimumPrice",
                "maximumPrice"
            ])
                if (rule[key] != null) rule[key] = String(rule[key])
        return {
            priceList: header,
            priceRuleRows: rules,
            publicationToken: out.publicationToken,
            defaultRule: {
                priceListId: p.priceListId,
                sequenceNum: Math.max(0, ...rules.map(r => Number(r.sequenceNum || 0))) + 10,
                selector: "all",
                baseType: "typed",
                basePriceTypeEnumId: "PptCurrent",
                minQuantity: "0",
                fromDate: ec.l10n.format(new Date(Math.max(ms(header.fromDate), ms(ec.user.nowTimestamp))), "yyyy-MM-dd HH:mm:ss")
            },
            successor: Object.assign({}, header, {
                // the next whole second after the current list's start, as the form shows seconds
                fromDate: ec.l10n.format(
                    new Date(Math.max(Math.floor(ms(header.fromDate) / 1000) * 1000 + 1000, ms(ec.user.nowTimestamp))),
                    "yyyy-MM-dd HH:mm:ss"
                )
            })
        }
    }
    function explanation(p) {
        const a = access(),
            product = one(P + "Product", {productId: p.productId})
        if (!product || (!a.systemAdmin && !a.ownerPartyIds.includes(product.ownerPartyId)))
            throw new Error("Product is not available")
        const direction = p.direction || "sales"
        if (!(direction === "purchase" ? a.canSupplierRead : a.canPriceRead))
            throw new Error("Price-read authority for this direction is required")
        const out = call(M + "get#ProductPrice", Object.assign({}, p, {explain: true}))
        if (direction === "sales" && a.canCostRead && out.price != null)
            Object.assign(
                out,
                call("mantle.product.CostServices.get#ProductMargin", {
                    productId: p.productId,
                    organizationPartyId:
                        p.organizationPartyId || p.vendorPartyId || a.activeOrganizationPartyId || a.organizationPartyIds[0],
                    quantityUomId: p.quantityUomId,
                    priceUomId: out.priceUomId || p.priceUomId,
                    asOfDate: p.validDate,
                    price: out.price
                })
            )
        out.priceTrace = (out.priceTrace || []).map(r =>
            Object.assign({}, r, {
                beforeText: r.beforeAmount == null ? "" : String(r.beforeAmount),
                afterText: r.afterAmount == null ? "" : String(r.afterAmount),
                operandText: r.operand == null ? "" : String(r.operand),
                eligibleText: r.eligible == null ? "" : r.eligible ? "Yes" : "No"
            })
        )
        return {priceResult: out, traceRows: out.priceTrace}
    }
    const operations = {options, lists, detail, explanation}
    if (!operations[op]) throw new Error("Unknown pricing operation " + op)
    return operations[op](parameters)
}
;({execute: run})
