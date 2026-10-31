// Helpers the Accounting screen modules share: the app's access check, reviewed id~version tokens, paging names, links
// to records and the before/after rows of a review. Mantle owns every financial decision; these shape its answers.
const policy = ec.resource.script("component://mr-mantle/service/mantle/ledger/AccountingPolicy.js")
const array = value => Array.from(value || [])
const plain = value => policy.display(value || {})
const rows = value => array(value).map(plain)
const today = () => ec.l10n.format(ec.user.nowTimestamp, "yyyy-MM-dd")
// A day as yyyy-MM-dd text in the user's zone; today when none is given.
const day = value =>
    value ? (/^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? String(value) : ec.l10n.format(value, "yyyy-MM-dd")) : today()
const money = (value, currency) => (value == null || value === "" ? "" : ec.l10n.formatCurrency(toDecimal(value), currency))
const statusText = statusId => (statusId ? policy.one("moqui.basic.StatusItem", {statusId})?.description || statusId : "")

// The finance scope of an Accounting screen. Refuses another app root and, when capabilities are named, a user who has
// none of them.
function access(parameters, capabilities = [], message = "Accounting read authority is required") {
    if (parameters.appRoot && parameters.appRoot !== "Accounting") throw new Error("Accounting context is not available")
    const scope = policy.scope(parameters)
    if (capabilities.length && !capabilities.some(name => scope.capabilities[name])) throw new Error(message)
    return scope
}

// A read the screen shows as unavailable when it fails: run in its own transaction and error frame, null on failure.
function optional(serviceName, parameters, label = serviceName) {
    try {
        return policy.probe(serviceName, parameters)
    } catch (error) {
        ec.logger.warn(label + ": " + error.message)
        return null
    }
}

// A reviewed choice is "id~version": the record and the revision the user saw. A write never discovers a newer revision.
function tokenOf(id, version) {
    return id && version ? id + "~" + version : null
}
function token(value, label = "record") {
    if (typeof value !== "string" || value.length > 2048) throw new Error("Choose a " + label + " from the list")
    const separator = value.lastIndexOf("~")
    if (separator < 1 || separator === value.length - 1) throw new Error("Review the selected " + label + " again")
    return {id: value.slice(0, separator), version: value.slice(separator + 1)}
}
// An open item's reviewed token: its settlement key (kind:id, as find#OpenItems gives it) and the version the user saw.
const settlementKinds = ["invoice", "credit", "payment", "paymentTarget"]
function settlementToken(value) {
    const {id: key, version} = token(value, "open item")
    const colon = key.indexOf(":")
    const kind = key.slice(0, colon)
    if (colon < 1 || !settlementKinds.includes(kind)) throw new Error("Choose an open item from the list")
    const id = decodeURIComponent(key.slice(colon + 1))
    if (!id || kind + ":" + encodeURIComponent(id) !== key) throw new Error("Choose an open item from the list")
    return {key, kind, id, version}
}
// Several reviewed tokens (a list, a JSON list or one token) as their ids and the version of each.
function tokens(value, label = "record", maximum = 10) {
    let selected = value == null || value === "" ? [] : value
    if (typeof selected === "string") selected = selected.trim().startsWith("[") ? JSON.parse(selected) : [selected]
    selected = array(selected)
    if (selected.length > maximum) throw new Error("Choose at most " + maximum + " " + label + "s")
    const versions = new Map()
    for (const value of selected) {
        const item = token(value, label)
        if (versions.has(item.id) && versions.get(item.id) !== item.version)
            throw new Error("An item has different reviewed revisions. Choose it again")
        versions.set(item.id, item.version)
    }
    return {ids: Array.from(versions.keys()), versions: Object.fromEntries(versions)}
}

// A Mantle page (recordCount, pageIndex, ...) under a form-list's names (recordsCount, recordsPageIndex, ...); with
// source, a page already under that list's names is renamed.
const pageNames = ["Count", "PageIndex", "PageSize", "PageMaxIndex", "PageRangeLow", "PageRangeHigh"]
function paging(result, list = "records", source = null, pageSize = 20) {
    const defaults = {Count: 0, PageIndex: 0, PageSize: pageSize, PageMaxIndex: 0, PageRangeLow: 0, PageRangeHigh: 0}
    return Object.fromEntries(
        pageNames.map(name => {
            const field = source ? source + name : name === "Count" ? "recordCount" : name[0].toLowerCase() + name.slice(1)
            return [list + name, result?.[field] ?? defaults[name]]
        })
    )
}

// The parameters of a link to a record's detail screen.
function recordParameters(organizationPartyId, recordId, fields = {}) {
    return Object.assign({organizationPartyId, recordId}, fields)
}

// The operation key of a form a user submits once: a sequenced id, so a resubmitted form is answered as the first.
function operationKey(prefix) {
    return prefix + "-" + ec.entity.sequencedIdPrimary("ironstone.accounting.OperationKey", null, null)
}
// The operation key that confirms a retained review: Mantle's when it gave one, else one for that review.
function reviewKey(retained, prefix) {
    return retained.operationKey || prefix + "-" + retained.previewId
}

// Before and after rows of a review: for each [label, field] of a summary, its value and the value after the change.
function changeRows(summary, changes, currencyUomId) {
    return changes.map(([label, field, change]) => ({
        label,
        beforeAmount: summary[field],
        afterAmount: summary[field] == null ? null : toDecimal(summary[field]).add(change),
        currencyUomId
    }))
}
// Before and after texts of a review: for each [label, ...fields], the first of the fields with a value.
function effectRows(before = {}, after = {}, specs = []) {
    const first = (values, fields) => fields.map(field => values?.[field]).find(value => value != null && value !== "") || ""
    return specs
        .map(([label, ...fields]) => ({label, beforeText: first(before, fields), afterText: first(after, fields)}))
        .filter(row => row.beforeText !== "" || row.afterText !== "")
}

// The rows of the review screens' shared sections (template/AccountingPayments.xml). A planned posting line: its account,
// debit or credit, currency, posting day and a note (noteOf names the plan: its leg, the transaction it reverses). A plan
// with lines gives a row for each line; one without is itself a line.
function ledgerPreviewRows(plans, currencyUomId = null, accountingDateText = "", noteOf = () => "") {
    return array(plans).flatMap(plan => {
        const lines = plan.lines ? array(plan.lines) : [plan]
        return lines.map(line => {
            const row = plain(line)
            return {
                accountText:
                    [row.accountCode || row.glAccountCode, row.accountName || row.glAccountName].filter(Boolean).join(" · ") ||
                    row.glAccountId ||
                    "",
                debit: row.debitCreditFlag === "D" ? row.amount : null,
                credit: row.debitCreditFlag === "C" ? row.amount : null,
                currencyUomId: row.currencyUomId || plan.amountUomId || plan.currencyUomId || currencyUomId,
                accountingDateText: plan.accountingDateText || accountingDateText || "",
                note: noteOf(plan) || ""
            }
        })
    })
}
// A posted transaction of a completed review, which the user may open when canOpen.
function postingResultRows(acctgTransIds, canOpen = true, note = "") {
    return [...new Set(array(acctgTransIds).filter(id => typeof id === "string" && !!id))].map(acctgTransId => ({
        acctgTransId,
        canOpen,
        note
    }))
}
// The label and value rows of a review's summary, leaving out those without a value.
function factRows(facts) {
    return facts.filter(([, value]) => value != null && value !== "").map(([label, value]) => ({label, value: String(value)}))
}

;({
    policy,
    array,
    plain,
    rows,
    today,
    day,
    money,
    statusText,
    access,
    optional,
    tokenOf,
    token,
    tokens,
    settlementKinds,
    settlementToken,
    paging,
    recordParameters,
    operationKey,
    reviewKey,
    changeRows,
    effectRows,
    ledgerPreviewRows,
    postingResultRows,
    factRows
})
