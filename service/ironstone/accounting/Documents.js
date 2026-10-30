// Approved finance document layouts and a representative preview, independent of the document issue and send workflows.
const policy = ec.resource.script("component://mr-mantle/service/mantle/ledger/AccountingPolicy.js")
const layouts = ["standard"]
const previewLines = 40

function checkLayout(template) {
    if (template && !layouts.includes(template)) throw new Error("Choose an approved document layout")
}

function escapeHtml(value) {
    const entities = {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}
    return String(value || "").replace(/[&<>"']/g, character => entities[character])
}

// A long invoice in the organization's numbering, currency and footer, so a layout is reviewed across pages. No number
// is issued.
function preview(parameters) {
    const scope = policy.scope(parameters, "admin")
    if (!scope.organizationPartyId)
        return {valid: false, previewHtml: "", previewText: "Choose an organization to preview a document"}
    checkLayout(parameters.template)
    const settings = policy.preference(scope.organizationPartyId)
    const currency = settings.baseCurrencyUomId
    if (!currency)
        return {valid: false, previewHtml: "", previewText: "Choose the organization's base currency to preview a document"}
    const amount = escapeHtml(ec.l10n.formatCurrency(ec.l10n.roundCurrency(toDecimal("12.34"), currency), currency))
    const description = "Representative long service description with project and delivery details for multi-page review"
    const rows = Array.from(
        {length: previewLines},
        (_, index) => "<tr><td>" + (index + 1) + "</td><td>" + description + "</td><td>" + amount + "</td></tr>"
    )
    const previewHtml =
        "<article><h1>Invoice preview</h1><p>" +
        escapeHtml(settings.invoiceIdPrefix) +
        "PREVIEW · " +
        escapeHtml(settings.documentLocale || ec.user.locale) +
        "</p><table><thead><tr><th>Line</th><th>Description</th><th>Amount</th></tr></thead><tbody>" +
        rows.join("") +
        "</tbody></table><p>Totals keep their currency and locale. Preview numbers are never issued.</p><footer>" +
        escapeHtml(settings.documentFooter) +
        "</footer></article>"
    return {
        valid: true,
        previewHtml,
        previewText: "Invoice preview with " + previewLines + " representative lines in " + currency
    }
}

const operations = {preview}
;({
    execute: (op, parameters) => {
        if (!operations[op]) throw new Error("Unknown document operation " + op)
        return operations[op](parameters)
    }
})
