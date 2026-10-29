const C = "ironstone.products.CatalogServices."
const E = {
    category: "mantle.product.category.ProductCategory",
    feature: "mantle.product.feature.ProductFeature",
    group: "mantle.product.feature.ProductFeatureGroup"
}
const K = {category: "productCategoryId", feature: "productFeatureId", group: "productFeatureGroupId"}
const R = "mantle.product.category.ProductCategoryRollup"
const call = (name, p, sys = false) => {
    let c = ec.service
        .sync()
        .name(name)
        .parameters(p || {})
    if (sys) c = c.disableAuthz()
    return c.call() || {}
}
const lib = ec.resource.script("component://mr-boss/service/ironstone/products/ProductsLib.js"),
    {find, one, rows, rowsIn, ms} = lib
const now = () => ms(ec.user.nowTimestamp)
const current = (row, at = now()) =>
    (ms(row.fromDate) == null || ms(row.fromDate) <= at) && (ms(row.thruDate) == null || ms(row.thruDate) > at)
const pick = (p, names) =>
    Object.fromEntries(
        names
            .split(",")
            .filter(key => Object.keys(p).includes(key))
            .map(key => [key, p[key] === "" ? null : p[key]])
    )
function data(row) {
    const out = lib.map(row)
    for (const key of ["fromDate", "thruDate"])
        if (out[key] != null) out[key + "Text"] = lib.dateText(out[key], "yyyy-MM-dd HH:mm")
    return out
}
// The user's catalog access, read once per operation (execute resets it).
let accessCache = null
const access = () => accessCache || (accessCache = call(C + "get#CatalogAccess"))
function record(kind, id, need = "read", quiet = false) {
    const out = call(C + "get#CatalogRecord", {recordEntityName: E[kind], recordId: id, need, checkOnly: true})
    if (!out.record && !quiet) throw new Error("Catalog record is not available for this action")
    return out.record
}
function product(id, need = "read", quiet = false) {
    const out = call(C + "get#CatalogRecord", {recordId: id, need, checkOnly: true})
    if (!out.record && !quiet) throw new Error("Product is not available for this action")
    return out.record
}
function owner(id, a) {
    if (
        !a.capabilities.catalogEdit ||
        !id ||
        (id === "_NA_" ? !a.capabilities.systemAdmin : !a.capabilities.systemAdmin && !a.organizationPartyIds.includes(id))
    )
        throw new Error("Catalog editor authority over the owner is required")
    if (id !== "_NA_" && !one("mantle.party.PartyRole", {partyId: id, roleTypeId: "OrgInternal"}))
        throw new Error("Choose an internal owner")
}
function graphLock() {
    find("moqui.basic.EnumerationType", {enumTypeId: "ProductCategoryType"}).forUpdate(true).one()
}
function featureLock() {
    find("moqui.basic.EnumerationType", {enumTypeId: "ProductFeatureType"}).forUpdate(true).one()
}
function storeMaster(p) {
    const kind = p.kind,
        key = K[kind],
        entity = E[kind]
    if (!key) throw new Error("Unknown catalog master type")
    if (kind === "category") graphLock()
    if (kind === "feature") {
        featureLock()
        if (p.productId) product(p.productId, "catalogEdit")
    }
    const oldRow = p[key]
            ? find(entity, {[key]: p[key]})
                  .forUpdate(true)
                  .one()
            : null,
        old = oldRow ? data(oldRow) : null,
        a = access()
    if (old && p.expectedLastUpdatedStamp && ms(old.lastUpdatedStamp) !== ms(p.expectedLastUpdatedStamp))
        throw new Error("Catalog master changed; reload before saving")
    if (p.createOnly && old) throw new Error("Catalog ID is already in use")
    const ownerId = old ? old.ownerPartyId || "_NA_" : p.ownerPartyId || a.activeOrganizationPartyId || a.organizationPartyIds[0]
    owner(ownerId, a)
    if (old) {
        record(kind, p[key], "catalogEdit")
        if (p.ownerPartyId && p.ownerPartyId !== (old.ownerPartyId || (kind === "group" ? "_NA_" : null)))
            throw new Error("Owner changes require a separate migration")
    }
    if (p[key] && !/^[A-Za-z0-9_.-]{1,40}$/.test(p[key]))
        throw new Error("Catalog ID must contain 1–40 letters, numbers, dots, dashes or underscores")
    const names = {
        category: "categoryName,description,pseudoId,productCategoryTypeEnumId",
        feature:
            "description,productFeatureTypeEnumId,abbrev,idCode,numberSpecified,numberUomId,defaultAmount,defaultSequenceNum",
        group: "description"
    }[kind]
    const values = Object.assign({}, old || {}, pick(p, names), {[key]: p[key], ownerPartyId: ownerId})
    if (!String(values[kind === "category" ? "categoryName" : "description"] || "").trim())
        throw new Error("Name or description is required")
    const typeField = kind === "category" ? "productCategoryTypeEnumId" : "productFeatureTypeEnumId"
    if (
        kind !== "group" &&
        one("moqui.basic.Enumeration", {enumId: values[typeField]})?.enumTypeId !==
            (kind === "category" ? "ProductCategoryType" : "ProductFeatureType")
    )
        throw new Error("Choose a valid catalog type")
    if (kind === "feature") {
        if (values.numberUomId && one("moqui.basic.Uom", {uomId: values.numberUomId})?.uomTypeEnumId === "UT_CURRENCY_MEASURE")
            throw new Error("Feature measurement units cannot be currencies")
        if (
            old &&
            ["productFeatureTypeEnumId", "abbrev", "idCode", "numberSpecified", "numberUomId"].some(
                field => String(values[field] ?? "") !== String(old[field] ?? "")
            )
        ) {
            for (const use of rows("mantle.product.feature.ProductFeatureAppl", {
                productFeatureId: p[key],
                applTypeEnumId: "PfatDistinguishing"
            })) {
                const used = one("mantle.product.Product", {productId: use.productId})
                if (used && (used.statusId || "PrdActive") !== "PrdDraft")
                    throw new Error("This feature identifies an active or used variant; create a new value instead")
            }
        }
    }
    const saved = Object.assign(pick(values, names), {[key]: p[key], ownerPartyId: ownerId})
    const out = call((old ? "update#" : "create#") + entity, saved, true)
    const id = p[key] || out[key]
    if (kind === "feature" && p.productId)
        call(C + "store#CatalogRow", {
            kind: "feature",
            productId: p.productId,
            productFeatureId: id,
            applTypeEnumId: p.applTypeEnumId || "PfatStandard",
            fromDate: p.fromDate,
            thruDate: p.thruDate
        })
    if (kind === "category" && p.parentProductCategoryId && !old)
        storeRollup({
            productCategoryId: id,
            parentProductCategoryId: p.parentProductCategoryId,
            fromDate: p.fromDate,
            thruDate: p.thruDate
        })
    return {[key]: id}
}
function assertAcyclic(child, parent, from, thru, ignore) {
    const all = rows(R).filter(
        row =>
            !ignore ||
            !(
                row.productCategoryId === ignore.productCategoryId &&
                row.parentProductCategoryId === ignore.parentProductCategoryId &&
                ms(row.fromDate) === ms(ignore.fromDate)
            )
    )
    const walk = (id, low, high, path) => {
        if (id === child) throw new Error("Category cycle: " + path.concat(id).join(" → "))
        if (path.length >= 100 || path.includes(id))
            throw new Error("Invalid existing category path: " + path.concat(id).join(" → "))
        for (const edge of all.filter(row => row.productCategoryId === id)) {
            const a = Math.max(low, ms(edge.fromDate) ?? -Infinity),
                b = Math.min(high, ms(edge.thruDate) ?? Infinity)
            if (a < b) walk(edge.parentProductCategoryId, a, b, path.concat(id))
        }
    }
    walk(parent, from, thru, [])
}
function storeRollup(p) {
    record("category", p.productCategoryId, "catalogEdit")
    record("category", p.parentProductCategoryId)
    graphLock()
    const from = p.fromDate || ec.user.nowTimestamp,
        thru = p.thruDate || null
    if (ms(thru) != null && ms(thru) <= ms(from)) throw new Error("Category edge end must follow its start")
    for (const row of rows(R, {productCategoryId: p.productCategoryId, parentProductCategoryId: p.parentProductCategoryId})) {
        if (
            ms(row.fromDate) !== ms(from) &&
            Math.max(ms(row.fromDate), ms(from)) < Math.min(ms(row.thruDate) ?? Infinity, ms(thru) ?? Infinity)
        )
            throw new Error("This parent edge already overlaps that interval")
    }
    assertAcyclic(p.productCategoryId, p.parentProductCategoryId, ms(from), ms(thru) ?? Infinity, {
        productCategoryId: p.productCategoryId,
        parentProductCategoryId: p.parentProductCategoryId,
        fromDate: from
    })
    call(
        "store#" + R,
        {
            productCategoryId: p.productCategoryId,
            parentProductCategoryId: p.parentProductCategoryId,
            fromDate: from,
            thruDate: thru,
            sequenceNum: p.sequenceNum
        },
        true
    )
    return {productCategoryId: p.productCategoryId, fromDate: from}
}
function parseOccurrence(value) {
    if (!value) return []
    try {
        const parts = JSON.parse(decodeURIComponent(value))
        if (
            !Array.isArray(parts) ||
            parts.length > 100 ||
            parts.some(part => !Array.isArray(part) || typeof part[0] !== "string")
        )
            throw new Error("shape")
        return parts
    } catch (e) {
        throw new Error("Category occurrence changed; reload the tree")
    }
}
const occurrence = parts => encodeURIComponent(JSON.stringify(parts))
function graph(p) {
    const a = access()
    if (!a.capabilities.read) throw new Error("Catalog read access is required")
    const at = ms(p.asOfDate) ?? now(),
        categories = a.capabilities.systemAdmin ? rows(E.category) : rowsIn(E.category, "ownerPartyId", a.ownerPartyIds),
        byId = Object.fromEntries(categories.map(row => [row.productCategoryId, row])),
        categoryIds = Object.keys(byId)
    const edges = rowsIn(R, "productCategoryId", categoryIds).filter(row => current(row, at) && byId[row.parentProductCategoryId])
    // the current members of the readable categories whose products the user may read, checked in one query
    const memberRows = rowsIn("mantle.product.category.ProductCategoryMember", "productCategoryId", categoryIds).filter(row =>
            current(row, at)
        ),
        readable = new Set(
            rowsIn(
                "mantle.product.Product",
                "productId",
                memberRows.map(row => row.productId)
            )
                .filter(row => a.capabilities.systemAdmin || a.ownerPartyIds.includes(row.ownerPartyId))
                .map(row => row.productId)
        ),
        members = memberRows.filter(row => readable.has(row.productId))
    const membersOf = new Map(),
        childrenOf = new Map()
    for (const row of members)
        (membersOf.get(row.productCategoryId) || membersOf.set(row.productCategoryId, []).get(row.productCategoryId)).push(
            row.productId
        )
    for (const edge of edges)
        (
            childrenOf.get(edge.parentProductCategoryId) ||
            childrenOf.set(edge.parentProductCategoryId, []).get(edge.parentProductCategoryId)
        ).push(edge)
    // the distinct products of a category and its branch, each counted once however many paths reach it
    const branch = (id, seen = new Set()) => {
        if (seen.has(id)) return new Set()
        seen.add(id)
        const ids = new Set(membersOf.get(id) || [])
        for (const edge of childrenOf.get(id) || []) for (const value of branch(edge.productCategoryId, seen)) ids.add(value)
        return ids
    }
    return {a, at, categories, byId, edges, members, childrenOf, branch}
}
function findCategories(p) {
    const g = graph(p),
        needle = String(p.text || "").toLowerCase(),
        path = parseOccurrence(p.parentOccurrenceId)
    const match = row =>
        (!needle ||
            [row.productCategoryId, row.categoryName, row.pseudoId].some(value =>
                String(value || "")
                    .toLowerCase()
                    .includes(needle)
            )) &&
        (!p.productCategoryTypeEnumId || row.productCategoryTypeEnumId === p.productCategoryTypeEnumId) &&
        (!p.ownerPartyId || row.ownerPartyId === p.ownerPartyId)
    const make = (row, parts, edge) =>
        Object.assign(data(row), {
            occurrenceId: occurrence(parts),
            parentOccurrenceId: parts.length > 1 ? occurrence(parts.slice(0, -1)) : "",
            originalParentProductCategoryId: edge?.parentProductCategoryId || null,
            fromDate: edge?.fromDate || null,
            fromDateText: edge?.fromDate ? lib.dateText(edge.fromDate, "yyyy-MM-dd HH:mm") : null,
            sequenceNum: edge?.sequenceNum || 0,
            childCount: (g.childrenOf.get(row.productCategoryId) || []).length,
            branchProductCount: g.branch(row.productCategoryId).size
        })
    let found = []
    if (path.length) {
        // Every link of a supplied path is checked; callers cannot fabricate an occurrence through a hidden parent.
        for (let i = 0; i < path.length; i++) {
            if (
                !g.byId[path[i][0]] ||
                (i > 0 &&
                    !g.edges.some(
                        edge =>
                            edge.productCategoryId === path[i][0] &&
                            edge.parentProductCategoryId === path[i - 1][0] &&
                            ms(edge.fromDate) === Number(path[i][1])
                    ))
            )
                throw new Error("Category occurrence changed; reload the tree")
        }
        const parent = path[path.length - 1][0]
        found = g.edges
            .filter(edge => edge.parentProductCategoryId === parent)
            .map(edge => make(g.byId[edge.productCategoryId], path.concat([[edge.productCategoryId, ms(edge.fromDate)]]), edge))
            .filter(match)
    } else if (needle || p.productCategoryTypeEnumId || p.ownerPartyId || p.allCategories) {
        const parents = (id, seen = []) => {
            if (seen.includes(id) || seen.length >= 100) {
                ec.logger.error("Category " + id + " has an invalid existing ancestor path")
                return []
            }
            const links = g.edges.filter(edge => edge.productCategoryId === id)
            return links.length
                ? links.flatMap(edge =>
                      parents(edge.parentProductCategoryId, seen.concat(id)).map(up => up.concat([[id, ms(edge.fromDate)]]))
                  )
                : [[[id, null]]]
        }
        for (const row of g.categories.filter(match))
            for (const parts of parents(row.productCategoryId)) {
                const edge =
                    parts.length > 1
                        ? g.edges.find(
                              edge =>
                                  edge.productCategoryId === row.productCategoryId &&
                                  edge.parentProductCategoryId === parts[parts.length - 2][0] &&
                                  ms(edge.fromDate) === parts[parts.length - 1][1]
                          )
                        : null
                found.push(make(row, parts, edge))
            }
    } else
        found = g.categories
            .filter(row => !g.edges.some(edge => edge.productCategoryId === row.productCategoryId))
            .map(row => make(row, [[row.productCategoryId, null]], null))
    found.sort(
        (a, b) =>
            a.parentOccurrenceId.localeCompare(b.parentOccurrenceId) ||
            Number(a.sequenceNum || 0) - Number(b.sequenceNum || 0) ||
            String(a.categoryName).localeCompare(String(b.categoryName)) ||
            a.occurrenceId.localeCompare(b.occurrenceId)
    )
    return {
        categoryRows: found,
        categoryCount: new Set(found.map(row => row.productCategoryId)).size,
        asOfDate: p.asOfDate || null
    }
}
function ancestors(p) {
    const g = graph(p),
        result = new Map()
    for (const id of String(p.ids || "")
        .split(",")
        .filter(Boolean)) {
        const parts = parseOccurrence(id)
        for (let count = 1; count <= parts.length; count++) {
            const head = parts.slice(0, count),
                last = head[head.length - 1],
                row = g.byId[last[0]]
            if (!row) throw new Error("Category ancestor is not available")
            if (
                count > 1 &&
                !g.edges.some(
                    edge =>
                        edge.productCategoryId === last[0] &&
                        edge.parentProductCategoryId === head[count - 2][0] &&
                        ms(edge.fromDate) === Number(last[1])
                )
            )
                throw new Error("Category occurrence changed; reload the tree")
            result.set(
                occurrence(head),
                Object.assign(data(row), {
                    occurrenceId: occurrence(head),
                    parentOccurrenceId: count > 1 ? occurrence(head.slice(0, -1)) : "",
                    childCount: g.edges.filter(edge => edge.parentProductCategoryId === last[0]).length,
                    branchProductCount: g.branch(last[0]).size
                })
            )
        }
    }
    return {categoryRows: Array.from(result.values())}
}
function move(p) {
    record("category", p.productCategoryId, "catalogEdit")
    graphLock()
    const oldParent = p.originalParentProductCategoryId || null,
        old = oldParent
            ? one(R, {productCategoryId: p.productCategoryId, parentProductCategoryId: oldParent, fromDate: p.fromDate})
            : null
    if (oldParent && !old) throw new Error("Category edge changed; reload before moving it")
    if (!oldParent && rows(R, {productCategoryId: p.productCategoryId}).some(row => current(row)))
        throw new Error("This category acquired a parent; reload or use Add parent")
    const parts = parseOccurrence(p.parentOccurrenceId),
        newParent = p.parentProductCategoryId || (parts.length ? parts[parts.length - 1][0] : null)
    if (newParent) record("category", newParent)
    if (parts.length) ancestors({ids: p.parentOccurrenceId, asOfDate: p.asOfDate})
    if (p.occurrenceId) {
        const selected = parseOccurrence(p.occurrenceId),
            last = selected[selected.length - 1]
        if (
            !last ||
            last[0] !== p.productCategoryId ||
            (selected.length > 1 ? selected[selected.length - 2][0] : null) !== oldParent ||
            (old && Number(last[1]) !== ms(old.fromDate))
        )
            throw new Error("Category occurrence changed; reload before moving it")
    }
    if (old && !current(old, ms(p.asOfDate) ?? now())) throw new Error("Only an effective parent edge can be moved")
    const ordering = Object.keys(p).includes("previousSiblingId")
    let sequence = Number(old?.sequenceNum || 0)
    if (oldParent !== newParent || ordering) {
        if (!newParent && ordering)
            throw new Error("Root categories are sorted by name; use the Move parent dialog to change a root placement")
        const siblings = newParent
            ? rows(R, {parentProductCategoryId: newParent})
                  .filter(
                      row =>
                          row.productCategoryId !== p.productCategoryId &&
                          current(row, ms(p.effectiveDate) ?? now()) &&
                          record("category", row.productCategoryId, "read", true)
                  )
                  .sort(
                      (a, b) =>
                          Number(a.sequenceNum || 0) - Number(b.sequenceNum || 0) ||
                          String(record("category", a.productCategoryId).categoryName).localeCompare(
                              String(record("category", b.productCategoryId).categoryName)
                          )
                  )
            : []
        let previous = ordering ? -1 : siblings.length - 1
        if (p.previousSiblingId) {
            const path = parseOccurrence(p.previousSiblingId),
                last = path[path.length - 1]
            previous = siblings.findIndex(row => row.productCategoryId === last?.[0] && ms(row.fromDate) === Number(last?.[1]))
            if (previous < 0) throw new Error("Previous sibling changed; reload before moving")
        }
        if (previous < 0) sequence = siblings.length ? Number(siblings[0].sequenceNum || 0) - 10 : 10
        else if (previous === siblings.length - 1) sequence = Number(siblings[previous].sequenceNum || 0) + 10
        else {
            const left = Number(siblings[previous].sequenceNum || 0),
                right = Number(siblings[previous + 1].sequenceNum || 0)
            if (right - left > 1) sequence = Math.floor((left + right) / 2)
            else {
                // Renumber only after every affected child edge passed its own write guard.
                if (siblings.some(row => !record("category", row.productCategoryId, "catalogEdit", true)))
                    throw new Error("This order has no gap; an administrator must renumber the shared siblings")
                for (let index = 0; index < siblings.length; index++)
                    call(
                        "update#" + R,
                        {
                            productCategoryId: siblings[index].productCategoryId,
                            parentProductCategoryId: newParent,
                            fromDate: siblings[index].fromDate,
                            sequenceNum: (index + 1) * 10
                        },
                        true
                    )
                sequence = (previous + 1) * 10 + 5
            }
        }
    }
    if (oldParent === newParent) {
        if (old)
            call(
                "update#" + R,
                {
                    productCategoryId: p.productCategoryId,
                    parentProductCategoryId: oldParent,
                    fromDate: old.fromDate,
                    sequenceNum: sequence
                },
                true
            )
        return {productCategoryId: p.productCategoryId}
    }
    const effective = p.effectiveDate || ec.user.nowTimestamp
    if (old && ms(effective) < ms(old.fromDate)) throw new Error("Move date precedes the selected edge")
    if (newParent)
        storeRollup({
            productCategoryId: p.productCategoryId,
            parentProductCategoryId: newParent,
            fromDate: effective,
            thruDate: old?.thruDate || null,
            sequenceNum: sequence
        })
    if (old) {
        if (ms(effective) === ms(old.fromDate))
            call(
                "delete#" + R,
                {productCategoryId: p.productCategoryId, parentProductCategoryId: oldParent, fromDate: old.fromDate},
                true
            )
        else
            call(
                "update#" + R,
                {
                    productCategoryId: p.productCategoryId,
                    parentProductCategoryId: oldParent,
                    fromDate: old.fromDate,
                    thruDate: effective
                },
                true
            )
    }
    return {productCategoryId: p.productCategoryId, parentProductCategoryId: newParent}
}
function listMasters(p) {
    const kind = p.kind,
        key = K[kind],
        entity = E[kind],
        a = access()
    if (!key || !a.capabilities.read) throw new Error("Catalog read access is required")
    const needle = String(p.text || "").toLowerCase()
    let result = rows(entity)
        .filter(
            row => a.capabilities.systemAdmin || a.ownerPartyIds.includes(row.ownerPartyId || (kind === "group" ? "_NA_" : null))
        )
        .filter(
            row =>
                !needle ||
                [row[key], row.description, row.abbrev, row.idCode].some(value =>
                    String(value || "")
                        .toLowerCase()
                        .includes(needle)
                )
        )
        .filter(row => !p.productFeatureTypeEnumId || row.productFeatureTypeEnumId === p.productFeatureTypeEnumId)
        .filter(row => !p.ownerPartyId || row.ownerPartyId === p.ownerPartyId)
    if (p.productFeatureGroupId) {
        record("group", p.productFeatureGroupId)
        const ids = new Set(
            rows("mantle.product.feature.ProductFeatureGroupAppl", {productFeatureGroupId: p.productFeatureGroupId})
                .filter(row => current(row))
                .map(row => row.productFeatureId)
        )
        result = result.filter(row => ids.has(row.productFeatureId))
    }
    return {
        rows: result
            .map(row =>
                Object.assign(
                    data(row),
                    {ownerPartyId: row.ownerPartyId || (kind === "group" ? "_NA_" : null)},
                    kind === "group"
                        ? {
                              featureCount: rows("mantle.product.feature.ProductFeatureGroupAppl", {
                                  productFeatureGroupId: row.productFeatureGroupId
                              }).filter(use => current(use) && record("feature", use.productFeatureId, "read", true)).length,
                              categoryCount: rows("mantle.product.feature.ProductCategoryFeatGrpAppl", {
                                  productFeatureGroupId: row.productFeatureGroupId
                              }).filter(use => current(use) && record("category", use.productCategoryId, "read", true)).length
                          }
                        : {}
                )
            )
            .sort((a, b) => String(a.description).localeCompare(String(b.description))),
        count: result.length
    }
}
function detail(p) {
    const kind = p.kind,
        key = K[kind],
        master = record(kind, p[key]),
        canEdit = !!record(kind, p[key], "catalogEdit", true)
    const out = {
        master: data(master),
        canEdit,
        capabilities: access().capabilities,
        parents: [],
        children: [],
        products: [],
        groups: [],
        features: [],
        categories: [],
        identifiers: [],
        interactions: []
    }
    if (kind === "category") {
        out.parents = rows(R, {productCategoryId: p[key]})
            .filter(row => record("category", row.parentProductCategoryId, "read", true))
            .map(row => Object.assign(data(row), {parentName: record("category", row.parentProductCategoryId).categoryName}))
        out.children = rows(R, {parentProductCategoryId: p[key]})
            .filter(row => record("category", row.productCategoryId, "read", true))
            .map(row => Object.assign(data(row), {categoryName: record("category", row.productCategoryId).categoryName}))
        out.products = rows("mantle.product.category.ProductCategoryMember", {productCategoryId: p[key]})
            .filter(row => product(row.productId, "read", true))
            .map(row => Object.assign(data(row), {productName: product(row.productId).productName}))
        out.groups = rows("mantle.product.feature.ProductCategoryFeatGrpAppl", {productCategoryId: p[key]})
            .filter(row => record("group", row.productFeatureGroupId, "read", true))
            .map(data)
        out.identifiers = rows("mantle.product.category.ProductCategoryIdent", {productCategoryId: p[key]}).map(data)
        out.branchProductCount = graph(p).branch(p[key]).size
    } else if (kind === "feature") {
        out.groups = rows("mantle.product.feature.ProductFeatureGroupAppl", {productFeatureId: p[key]})
            .filter(row => record("group", row.productFeatureGroupId, "read", true))
            .map(data)
        out.products = rows("mantle.product.feature.ProductFeatureAppl", {productFeatureId: p[key]})
            .filter(row => product(row.productId, "read", true))
            .map(row => Object.assign(data(row), {productName: product(row.productId).productName}))
        out.interactions = interactions({productFeatureId: p[key]}).rows
    } else if (kind === "group") {
        out.features = rows("mantle.product.feature.ProductFeatureGroupAppl", {productFeatureGroupId: p[key]})
            .filter(row => record("feature", row.productFeatureId, "read", true))
            .map(row => Object.assign(data(row), {description: record("feature", row.productFeatureId).description}))
        out.categories = rows("mantle.product.feature.ProductCategoryFeatGrpAppl", {productFeatureGroupId: p[key]})
            .filter(row => record("category", row.productCategoryId, "read", true))
            .map(row => Object.assign(data(row), {categoryName: record("category", row.productCategoryId).categoryName}))
    }
    return {detail: out}
}
function storeRow(p) {
    let entity, values, keys
    if (p.rowKind === "member") {
        record("category", p.productCategoryId, "catalogEdit")
        return call(C + "store#CatalogRow", Object.assign({}, p, {kind: "category"}))
    } else if (p.rowKind === "featureProduct") {
        record("feature", p.productFeatureId)
        return call(C + "store#CatalogRow", Object.assign({}, p, {kind: "feature"}))
    } else if (p.rowKind === "groupFeature") {
        featureLock()
        record("group", p.productFeatureGroupId, "catalogEdit")
        record("feature", p.productFeatureId)
        entity = "mantle.product.feature.ProductFeatureGroupAppl"
        keys = "productFeatureGroupId,productFeatureId,fromDate"
        values = pick(p, keys + ",thruDate,sequenceNum")
    } else if (p.rowKind === "categoryGroup") {
        featureLock()
        record("category", p.productCategoryId, "catalogEdit")
        record("group", p.productFeatureGroupId)
        entity = "mantle.product.feature.ProductCategoryFeatGrpAppl"
        keys = "productCategoryId,productFeatureGroupId,fromDate"
        values = pick(p, keys + ",thruDate,applTypeEnumId")
        if (!["PfatStandard", "PfatSelectable", "PfatDistinguishing"].includes(values.applTypeEnumId))
            throw new Error("Choose a feature application type")
    } else if (p.rowKind === "identifier") {
        record("category", p.productCategoryId, "catalogEdit")
        entity = "mantle.product.category.ProductCategoryIdent"
        keys = "productCategoryIdentId"
        values = pick(p, "productCategoryIdentId,productCategoryId,identTypeEnumId,productStoreId,marketSegmentId,idValue")
        if (
            p.productCategoryIdentId &&
            one(entity, {productCategoryIdentId: p.productCategoryIdentId})?.productCategoryId !== p.productCategoryId
        )
            throw new Error("Identifier is not on this category")
        if (values.productStoreId) {
            const a = access(),
                store = one("mantle.product.store.ProductStore", {productStoreId: values.productStoreId})
            if (!store || (!a.capabilities.systemAdmin && !a.ownerPartyIds.includes(store.organizationPartyId)))
                throw new Error("Store is not available")
        }
        if (values.identTypeEnumId !== "PcitUrlSlug" || !String(values.idValue || "").trim())
            throw new Error("Choose a URL slug and enter its value")
        graphLock()
        if (rows(entity, {idValue: values.idValue}).some(row => row.productCategoryIdentId !== p.productCategoryIdentId))
            throw new Error("Category identifier is already assigned")
    } else throw new Error("Unknown taxonomy row type")
    if (keys.includes("fromDate")) {
        values.fromDate = p.fromDate || ec.user.nowTimestamp
        if (p.operation === "expire") {
            const old = one(entity, pick(values, keys))
            if (!old || ms(old.fromDate) >= now()) throw new Error("Effective row changed; reload before ending it")
            values = Object.assign(pick(values, keys), {thruDate: ec.user.nowTimestamp})
        } else {
            if (ms(values.thruDate) != null && ms(values.thruDate) <= ms(values.fromDate))
                throw new Error("End must follow start")
            for (const other of rows(entity, pick(values, keys.replace(",fromDate", ""))))
                if (
                    ms(other.fromDate) !== ms(values.fromDate) &&
                    Math.max(ms(other.fromDate), ms(values.fromDate)) <
                        Math.min(ms(other.thruDate) ?? Infinity, ms(values.thruDate) ?? Infinity)
                )
                    throw new Error("This relationship already overlaps that interval")
        }
    }
    return call((p.rowKind === "identifier" && !p.productCategoryIdentId ? "create#" : "store#") + entity, values, true)
}
function expireRollup(p) {
    record("category", p.productCategoryId, "catalogEdit")
    graphLock()
    const old = one(R, pick(p, "productCategoryId,parentProductCategoryId,fromDate"))
    if (p.operation === "delete") {
        if (!old || ms(old.fromDate) <= now())
            throw new Error("Only a future category edge may be removed; end effective relationships instead")
        call("delete#" + R, pick(p, "productCategoryId,parentProductCategoryId,fromDate"), true)
        return {productCategoryId: p.productCategoryId}
    }
    if (!old || !current(old) || ms(old.fromDate) >= now())
        throw new Error("Effective category edge changed; reload before ending it")
    call(
        "update#" + R,
        Object.assign(pick(p, "productCategoryId,parentProductCategoryId,fromDate"), {thruDate: ec.user.nowTimestamp}),
        true
    )
    return {productCategoryId: p.productCategoryId}
}
function deleteMaster(p) {
    const kind = p.kind,
        key = K[kind]
    if (!key) throw new Error("Unknown catalog master type")
    record(kind, p[key], "catalogEdit")
    if (kind === "category") graphLock()
    else featureLock()
    const uses = {
        category: [
            ["mantle.product.category.ProductCategoryMember", "productCategoryId"],
            [R, "productCategoryId"],
            [R, "parentProductCategoryId"],
            ["mantle.product.feature.ProductCategoryFeatGrpAppl", "productCategoryId"],
            ["mantle.product.store.ProductStoreCategory", "productCategoryId"],
            ["mantle.product.category.ProductCategoryContent", "productCategoryId"],
            ["mantle.product.category.ProductCategoryIdent", "productCategoryId"]
        ],
        feature: [
            ["mantle.product.feature.ProductFeatureAppl", "productFeatureId"],
            ["mantle.product.feature.ProductFeatureGroupAppl", "productFeatureId"],
            ["mantle.product.feature.ProductFeatureIactn", "productFeatureId"],
            ["mantle.product.feature.ProductFeatureIactn", "toProductFeatureId"]
        ],
        group: [
            ["mantle.product.feature.ProductFeatureGroupAppl", "productFeatureGroupId"],
            ["mantle.product.feature.ProductCategoryFeatGrpAppl", "productFeatureGroupId"]
        ]
    }[kind]
    for (const [entity, field] of uses)
        if (find(entity, {[field]: p[key]}).count())
            throw new Error("This catalog master is used by " + entity + "; end its relationships instead")
    call("delete#" + E[kind], {[key]: p[key]}, true)
    return {[key]: p[key]}
}
function interactions(p) {
    const a = access()
    if (!a.capabilities.read) throw new Error("Catalog read access is required")
    return {
        rows: rows("mantle.product.feature.ProductFeatureIactn")
            .filter(
                row =>
                    (!p.productFeatureId ||
                        row.productFeatureId === p.productFeatureId ||
                        row.toProductFeatureId === p.productFeatureId) &&
                    (!p.productId || row.productId === p.productId)
            )
            .filter(
                row =>
                    record("feature", row.productFeatureId, "read", true) &&
                    record("feature", row.toProductFeatureId, "read", true) &&
                    (!row.productId || product(row.productId, "read", true))
            )
            .map(data)
    }
}
function storeInteraction(p) {
    record("feature", p.productFeatureId, p.productId ? "read" : "catalogEdit")
    record("feature", p.toProductFeatureId, p.productId ? "read" : "catalogEdit")
    if (p.productId) product(p.productId, "catalogEdit")
    for (const pair of [
        [p.productFeatureId, p.toProductFeatureId],
        [p.toProductFeatureId, p.productFeatureId]
    ]) {
        const old = one("mantle.product.feature.ProductFeatureIactn", {productFeatureId: pair[0], toProductFeatureId: pair[1]})
        if (old && (old.productId || null) !== (p.productId || null))
            throw new Error("Feature pair " + pair.join(" → ") + " already has a rule in another product scope")
    }
    return call("mantle.product.ProductServices.store#FeatureInteraction", p, true)
}
function preview(p) {
    product(p.productId)
    const ids = (Array.isArray(p.productFeatureIds) ? p.productFeatureIds : [p.productFeatureIds || ""])
        .flatMap(value => String(value).split(","))
        .map(value => value.trim())
        .filter(Boolean)
    for (const id of ids) record("feature", id)
    const result = call(
        "mantle.product.ProductServices.preview#FeatureInteractions",
        {productId: p.productId, productFeatureIds: ids},
        true
    )
    result.issues = Array.from(result.issues || []).map(issue =>
        record("feature", issue.productFeatureId, "read", true) && record("feature", issue.toProductFeatureId, "read", true)
            ? issue
            : {message: "A required or conflicting feature is unavailable", rule: "Restricted interaction"}
    )
    return result
}
function options() {
    const a = access(),
        catalog = call(C + "get#CatalogOptions").options
    const groups = rows(E.group)
        .filter(row => a.capabilities.systemAdmin || a.ownerPartyIds.includes(row.ownerPartyId || "_NA_"))
        .map(row => ({value: row.productFeatureGroupId, label: row.description || row.productFeatureGroupId}))
    const enums = type =>
        rows("moqui.basic.Enumeration", {enumTypeId: type}).map(row => ({
            value: row.enumId,
            label: row.description || row.enumId
        }))
    return {
        options: Object.assign({}, catalog, {
            groups,
            stores: rows("mantle.product.store.ProductStore")
                .filter(row => a.capabilities.systemAdmin || a.ownerPartyIds.includes(row.organizationPartyId))
                .map(row => ({value: row.productStoreId, label: row.storeName || row.productStoreId})),
            tags: rows(E.category, {productCategoryTypeEnumId: "PctTag"})
                .filter(row => a.capabilities.systemAdmin || a.ownerPartyIds.includes(row.ownerPartyId))
                .map(row => ({value: row.productCategoryId, label: row.categoryName || row.productCategoryId})),
            categoryTypes: enums("ProductCategoryType"),
            featureTypes: enums("ProductFeatureType"),
            interactionTypes: enums("ProductFeatureIactnType")
        })
    }
}
function slug(p) {
    record("category", p.productCategoryId, "catalogEdit")
    return call(
        "mantle.product.StoreServices.format#UrlSlug",
        {inUrlSlug: p.categoryName || record("category", p.productCategoryId).categoryName},
        true
    )
}
function execute(op, p) {
    accessCache = null
    const operations = {
        storeMaster,
        storeRollup,
        findCategories,
        ancestors,
        move,
        listMasters,
        detail,
        storeRow,
        expireRollup,
        deleteMaster,
        interactions,
        storeInteraction,
        preview,
        options,
        slug
    }
    if (!operations[op]) throw new Error("Unknown taxonomy operation " + op)
    return operations[op](p || {})
}
;({execute})
