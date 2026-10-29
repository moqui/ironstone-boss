// Internal price notifications carry record links. They are sent only to current pricing staff in the price organization.
const P = "mantle.product.",
    E = P + "ProductPrice",
    C = "ironstone.products.CatalogServices."
const lib = ec.resource.script("component://mr-boss/service/ironstone/products/ProductsLib.js"),
    {find, one, rows, ms} = lib,
    effective = r =>
        (ms(r.fromDate) == null || ms(r.fromDate) <= ms(ec.user.nowTimestamp)) &&
        (ms(r.thruDate) == null || ms(r.thruDate) > ms(ec.user.nowTimestamp))
const call = (n, p) =>
    ec.service
        .sync()
        .name(n)
        .parameters(p || {})
        .disableAuthz()
        .call() || {}
const auditActor = r =>
    find("moqui.entity.EntityAuditLog", {changedEntityName: E, pkPrimaryValue: r.productPriceId})
        .condition("changedByUserId", "is-not-null", null)
        .orderBy("-changedDate")
        .limit(1)
        .one()?.changedByUserId
const direction = r => ec.resource.script("component://mr-mantle/service/mantle/product/PricePolicy.js").execute("direction", r)
// The user groups that hold any of these permissions now.
const groupsWith = permissionIds =>
    new Set(
        rows("moqui.security.UserGroupPermission")
            .filter(row => permissionIds.includes(row.userPermissionId) && effective(row))
            .map(row => row.userGroupId)
    )
// Recipients open the Products app (its launcher groups) and hold the price permission of the row's direction, by any
// group, in the price organization; project clients never receive one.
function recipients(r) {
    const d = direction(r),
        org = d === "purchase" ? r.customerPartyId : r.vendorPartyId,
        product = one(P + "Product", {productId: r.productId})
    if (!org || !product) return []
    const prefix = d === "purchase" ? "SUPPLIER_PRICE_" : "PRICE_",
        priceGroups = groupsWith([prefix + "VIEW", prefix + "EDIT"]),
        clientGroups = groupsWith(["PROJECT_CLIENT"]),
        appGroups = new Set(["BOSS_PRODUCTS", "BOSS_PRODUCTS_ADMIN"])
    const staffPartyIds = new Set(
        rows("mantle.party.PartyRelationship", {toPartyId: org})
            .filter(rel => effective(rel) && ["PrtAgent", "PrtEmployee", "PrtMember"].includes(rel.relationshipTypeEnumId))
            .map(rel => rel.fromPartyId)
    )
    const out = []
    for (const partyId of staffPartyIds) {
        for (const u of rows("moqui.security.UserAccount", {partyId})) {
            const userId = u.userId,
                groups = new Set(
                    rows("moqui.security.UserGroupMember", {userId})
                        .filter(effective)
                        .map(m => m.userGroupId)
                ),
                admin = groups.has("ADMIN"),
                holds = set => [...groups].some(g => set.has(g))
            if (!admin && (holds(clientGroups) || !holds(appGroups) || !holds(priceGroups))) continue
            if (
                [r.vendorPartyId, r.customerPartyId].filter(Boolean).some(id => {
                    const party = one("mantle.party.Party", {partyId: id})
                    return (
                        !party ||
                        (party.privateOwnerUserId && party.privateOwnerUserId !== userId) ||
                        (!admin && party.ownerPartyId && !["_NA_", org].includes(party.ownerPartyId) && id !== org)
                    )
                })
            )
                continue
            if (!admin && product.ownerPartyId !== "_NA_" && product.ownerPartyId !== org) continue
            out.push(userId)
        }
    }
    return out
}
function sendOne(p) {
    const r = one(E, {productPriceId: p.productPriceId})
    if (!r) return {sent: false}
    if (!["ProductPriceChanged", "ProductPriceExpiring"].includes(p.topic)) throw new Error("Unknown price notice")
    if (p.topic === "ProductPriceExpiring") {
        if (ec.user.userId && !ec.user.isInGroup("ADMIN"))
            throw new Error("Only the scheduler or a system administrator sends expiration notices")
    } else if (ec.user.userId) {
        const a = call(C + "get#CatalogAccess"),
            d = direction(r)
        if (!a.capabilities?.systemAdmin && !(d === "purchase" ? a.capabilities?.supplierPriceEdit : a.capabilities?.priceEdit))
            throw new Error("Price edit authority is required")
        ec.resource.script("component://mr-mantle/service/mantle/product/PricePolicy.js").execute("access", r)
    } else if (!auditActor(r)) throw new Error("A price change must have an audited author")
    if (!recipients(r).includes(p.recipientUserId)) throw new Error("Price notice recipient is not authorized")
    const product = one(P + "Product", {productId: r.productId}),
        marker = ec.user
            .singleUseCodeHash(
                p.topic +
                    "|" +
                    r.productPriceId +
                    "|" +
                    (p.topic === "ProductPriceExpiring" ? r.thruDate : r.lastUpdatedStamp) +
                    "|" +
                    p.recipientUserId
            )
            .slice(0, 40)
    // The marker is the operation's primary key: a concurrent send of the same notice fails its insert and rolls back.
    if (one(P + "ProductCatalogOperation", {operationKey: marker})) return {sent: false}
    const url = "/qapps/Products/Products/Product360/Prices?productId=" + encodeURIComponent(r.productId),
        nm = ec
            .makeNotificationMessage()
            .topic(p.topic)
            .userId(p.recipientUserId)
            .message({
                productId: r.productId,
                productPriceId: r.productPriceId,
                productName: product.productName,
                thruDate: r.thruDate ? lib.dateText(r.thruDate, "yyyy-MM-dd") : null,
                recordEntityName: P + "Product",
                recordId: r.productId
            })
            .link(url)
    if (nm.appName) nm.appName("Products")
    if (nm.actorUserId && (ec.user.userId || auditActor(r))) nm.actorUserId(ec.user.userId || auditActor(r))
    nm.send()
    call("create#" + P + "ProductCatalogOperation", {
        operationKey: marker,
        operationType: "price-notice",
        productId: r.productId,
        ownerPartyId: direction(r) === "purchase" ? r.customerPartyId : r.vendorPartyId,
        submittedByUserId: ec.user.userId,
        submittedDate: ec.user.nowTimestamp,
        requestJson: JSON.stringify({productPriceId: r.productPriceId, userId: p.recipientUserId, topic: p.topic})
    })
    if (ec.message.hasError()) throw new Error(ec.message.getErrorsString())
    return {sent: true}
}
function send(r, topic) {
    const out = []
    for (const recipientUserId of recipients(r)) {
        ec.message.pushErrors()
        try {
            const result =
                ec.service
                    .sync()
                    .name("ironstone.products.PriceNoticeServices.send#ProductPriceNotice")
                    .parameters({productPriceId: r.productPriceId, topic, recipientUserId})
                    .disableAuthz()
                    .requireNewTransaction(true)
                    .call() || {}
            if (ec.message.hasError()) throw new Error(ec.message.getErrorsString())
            if (result.sent) out.push(recipientUserId)
        } catch (e) {
            ec.logger.error("Price notice " + topic + " for " + r.productPriceId + " to " + recipientUserId + " failed: " + e)
        } finally {
            ec.message.clearErrors()
            ec.message.popErrors()
        }
    }
    return out
}
function changed(p) {
    const r = one(E, {productPriceId: p.productPriceId})
    if (!r || r.priceTypeEnumId === "PptAverage") return {sentCount: 0, sentToUserIds: []}
    // tx-commit rules run on a new worker context. Its anonymous call is internal only; the validated change has an audited author.
    if (ec.user.userId) {
        const a = call(C + "get#CatalogAccess"),
            d = direction(r)
        if (!a.capabilities?.systemAdmin && !(d === "purchase" ? a.capabilities?.supplierPriceEdit : a.capabilities?.priceEdit))
            throw new Error("Price edit authority is required")
        ec.resource.script("component://mr-mantle/service/mantle/product/PricePolicy.js").execute("access", r)
    } else if (!auditActor(r)) throw new Error("A price change must have an audited author")
    const sent = send(r, "ProductPriceChanged")
    return {sentCount: sent.length, sentToUserIds: sent}
}
function expiring(p) {
    if (ec.user.userId && !ec.user.isInGroup("ADMIN"))
        throw new Error("Only the scheduler or a system administrator sends expiration notices")
    const at = ms(ec.user.nowTimestamp),
        end = at + Math.max(1, Math.min(90, Number(p.days || 30))) * 86400000
    let sentCount = 0
    const ending = find(E)
        .condition("thruDate", "greater", new Date(at))
        .condition("thruDate", "less-equals", new Date(end))
        .list()
    for (const r of Array.from(ending).filter(
        r => (ms(r.fromDate) == null || ms(r.fromDate) <= at) && r.priceTypeEnumId !== "PptAverage"
    )) {
        ec.message.pushErrors()
        try {
            sentCount += send(r, "ProductPriceExpiring").length
        } catch (e) {
            ec.logger.error("Expiring price notice for " + r.productPriceId + " failed: " + e)
        } finally {
            ec.message.clearErrors()
            ec.message.popErrors()
        }
    }
    return {sentCount}
}
function execute(op, p) {
    return {changed, expiring, sendOne}[op](p)
}
;({execute})
