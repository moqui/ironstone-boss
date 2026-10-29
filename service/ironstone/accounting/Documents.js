// Approved finance document layouts and representative preview output, independent of document issue/send workflows.
const lib = ec.resource.script(
    "component://mr-mantle/service/mantle/ledger/AccountingPolicy.js",
)
function validate(p) {
    lib.organization(p, "admin")
    if (p.template && p.template !== "standard")
        throw new Error("Choose an approved document layout")
    return { valid: true }
}
function preview(p) {
    const s = lib.scope(p, "admin")
    if (!s.organizationPartyId)
        return {
            valid: false,
            previewHtml: "",
            previewText: "Choose an organization to preview a document",
        }
    validate(p)
    const settings = lib.preference(s.organizationPartyId),
        currency = settings.baseCurrencyUomId
    const unit = lib.currency(currency)
    const escape = (value) =>
        String(value || "").replace(
            /[&<>"']/g,
            (c) =>
                ({
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#39;",
                })[c],
        )
    const amount = ec.l10n.formatCurrency(
        ec.l10n.roundCurrency(toDecimal("12.34"), currency),
        currency,
    )
    const lines = Array.from(
        { length: 40 },
        (_, i) =>
            "<tr><td>" +
            (i + 1) +
            "</td><td>Representative long service description with project and delivery details for multi-page review</td><td>" +
            escape(amount) +
            " " +
            escape(currency) +
            "</td></tr>",
    ).join("")
    const previewHtml =
        "<article><h1>Invoice preview</h1><p>" +
        escape(settings.invoiceIdPrefix) +
        "PREVIEW · " +
        escape(settings.documentLocale || ec.user.locale) +
        "</p><table><thead><tr><th>Line</th><th>Description</th><th>Amount</th></tr></thead><tbody>" +
        lines +
        "</tbody></table><p>Totals retain their currency and locale. Preview numbers are never issued.</p><footer>" +
        escape(settings.documentFooter) +
        "</footer></article>"
    return {
        valid: true,
        previewHtml,
        previewText:
            "Invoice preview with 40 representative lines and currency " +
            currency,
    }
}
const operations = { validate, preview }
;({
    execute: (op, p) => {
        if (!operations[op]) throw new Error("Unknown document operation")
        return operations[op](p)
    },
})
