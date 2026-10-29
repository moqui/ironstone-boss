// Helpers shared by the Products service scripts. The top-level ones keep no state. forCall(appRoot) gives the helpers
// of one invocation: its app route, and the access and record reads it caches, stay local to that call.
const CATALOG = "ironstone.products.CatalogServices."

// Entity reads: every Products script checks access itself, before any value reaches a response.
function find(entityName, conditions) {
    return ec.entity
        .find(entityName)
        .condition(conditions || {})
        .disableAuthz()
}
function one(entityName, conditions) {
    return find(entityName, conditions).one()
}
function rows(entityName, conditions) {
    return Array.from(find(entityName, conditions).list())
}
// The rows whose field is one of the values, in one query.
function rowsIn(entityName, fieldName, values, conditions) {
    const distinct = [...new Set((values || []).filter(value => value != null && value !== ""))]
    if (!distinct.length) return []
    return Array.from(find(entityName, conditions).condition(fieldName, "in", distinct).list())
}
function map(row) {
    return row?.getMap ? row.getMap() : Object.assign({}, row || {})
}

// Dates: a timestamp, epoch milliseconds or a date string, as milliseconds; and as text in the user's time zone.
function ms(value) {
    if (value == null || value === "") return null
    const number = Number(String(value))
    return Number.isFinite(number) ? number : Date.parse(String(value))
}
function dateText(value, pattern = "yyyy-MM-dd HH:mm:ss") {
    return value == null || value === "" ? "" : ec.l10n.format(new Date(ms(value)), pattern)
}

// Request values: a form's empty choice, and a list given as an array or as comma-separated text.
function blankToNull(parameters, names) {
    const out = Object.assign({}, parameters)
    for (const name of names) if (["null", "undefined", ""].includes(out[name])) out[name] = null
    return out
}
function ids(value) {
    return [
        ...new Set(
            (Array.isArray(value) ? value : [value || ""])
                .flatMap(item => String(item).split(","))
                .map(item => item.trim())
                .filter(Boolean)
        )
    ]
}

// One page of a list: pageSize from 1 to maxSize, and a pageIndex within the list.
function page(list, parameters, maxSize = 100) {
    const pageSize = Math.max(1, Math.min(maxSize, Number(parameters.pageSize || 25))),
        lastIndex = Math.max(0, Math.ceil(list.length / pageSize) - 1),
        pageIndex = Math.max(0, Math.min(lastIndex, Number(parameters.pageIndex || 0)))
    return {rows: list.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize), count: list.length, pageIndex, pageSize}
}

// Drop-down options.
function enumOptions(enumTypeId) {
    return find("moqui.basic.Enumeration", {enumTypeId})
        .orderBy("sequenceNum,description")
        .list()
        .map(row => ({value: row.enumId, label: row.description || row.enumId}))
}

function forCall(appRoot) {
    const route = appRoot || "Products"
    let accessCache = null
    const productCache = new Map()
    // A service call, with this invocation's app route. sys: without artifact authorization (the called service checks
    // the user itself); newTransaction: in its own transaction; strict: an error message becomes an exception.
    function call(name, parameters, options = {}) {
        let caller = ec.service
            .sync()
            .name(name)
            .parameters(Object.assign({appRoot: route}, parameters || {}))
        if (options.sys) caller = caller.disableAuthz()
        if (options.newTransaction) caller = caller.requireNewTransaction(true)
        const out = caller.call() || {}
        if (options.strict && ec.message.hasError()) throw new Error(ec.message.getErrorsString())
        return out
    }
    // The shared context (capabilities and owner scope) of the user, read once per invocation.
    function access() {
        if (!accessCache) accessCache = call(CATALOG + "get#SharedContext", {appRoot: route}, {sys: true, strict: true})
        return accessCache
    }
    // A product the user may read, or null; read once per invocation.
    function readableProduct(productId) {
        if (!productId) return null
        if (!productCache.has(productId))
            productCache.set(
                productId,
                call(CATALOG + "get#CatalogRecord", {recordId: productId, checkOnly: true}, {sys: true, strict: true}).record ||
                    null
            )
        return productCache.get(productId)
    }
    // Of these products, the ones the user may read: one query for the rows, then the owner scope of access().
    function visibleProductIds(productIds) {
        const a = access(),
            scope = new Set(a.ownerPartyIds || [])
        return rowsIn("mantle.product.Product", "productId", productIds)
            .filter(row => a.capabilities.read && (a.capabilities.systemAdmin || scope.has(row.ownerPartyId)))
            .map(row => row.productId)
    }
    return {route, call, access, readableProduct, visibleProductIds}
}

;({find, one, rows, rowsIn, map, ms, dateText, blankToNull, ids, page, enumOptions, forCall})
