// Each exported screen operation receives a fresh routing scope.
function scopeFor(parameters) {
    const requestedRoot = parameters.appRoot || "Products"
    // Products workspace reads and shapes. Mutating transitions call the owning domain service directly.
    const policy = () => ec.resource.script("component://mr-mantle/service/mantle/product/CatalogPolicy.js"),
        call = (n, p = {}) => policy().call(n, p)
    function context(p) {
        const a = call("ironstone.products.CatalogServices.get#SharedContext", {appRoot: p.appRoot})
        if (!a.capabilities.read) throw new Error("Catalog read access is required")
        const out = {
            appRoot: a.appRoot,
            toolAccess: a.capabilities,
            workspace: p.workspace || "units",
            toolMessage: "",
            unitForm: {uomId: "", uomTypeEnumId: "UT_OTHER_MEASURE"},
            conversionForm: {conversionFactor: "1", conversionOffset: 0, fromDate: null},
            packagingForm: {quantity: 1, quantityUomId: "OTH_ea", fromDate: null},
            identifierPolicyForm: null,
            labelRows: [],
            findings: [],
            scanResult: null,
            operationKey: p.operationKey || null,
            labelDraft: {
                productIds: p.productIds || p.productId || "",
                copies: 1,
                templateId: "product-50x30",
                symbology: "auto",
                priceUomId: "USD"
            }
        }
        const date = v => (v ? ec.l10n.format(new Date(policy().ms(v)), "yyyy-MM-dd HH:mm:ss") : "")
        const opts = call("ironstone.products.CatalogServices.get#CatalogOptions")
        out.ownerOptions = opts.options?.owners || []
        out.identifierTypes = opts.options?.idTypes || []
        out.unitOptions = opts.options?.units || []
        if (out.workspace === "units") {
            Object.assign(out, call("org.moqui.impl.UnitServices.get#UnitContext", p))
            out.unitForm = Object.assign(out.unitForm, out.unitRows.find(r => r.uomId === p.selectedUomId) || {})
            const selected = out.conversionRows.find(r => r.uomConversionId === p.selectedConversionId)
            if (selected) out.conversionForm = Object.assign({}, selected, {fromDate: null, thruDate: null, changeReason: ""})
            out.conversionRows = out.conversionRows.map(r =>
                Object.assign({}, r, {fromDateText: date(r.fromDate), thruDateText: date(r.thruDate)})
            )
            if (p.previewUomId && p.previewToUomId)
                try {
                    Object.assign(
                        out,
                        call("org.moqui.impl.UnitServices.preview#UnitConversion", {
                            uomId: p.previewUomId,
                            toUomId: p.previewToUomId,
                            amount: p.previewAmount ?? 1,
                            asOfDate: p.previewAsOfDate
                        })
                    )
                } catch (e) {
                    ec.logger.error("Unit preview " + p.previewUomId + " to " + p.previewToUomId + ": " + e)
                    ec.message.clearErrors()
                    out.toolMessage = String(e.message || e)
                }
        } else if (out.workspace === "packaging") {
            const base = p.baseProductId || p.productId || null
            Object.assign(
                out,
                call("mantle.product.ProductServices.find#ProductPackaging", Object.assign({}, p, {baseProductId: base}))
            )
            const selected = out.packagingRows.find(
                r =>
                    r.packProductId === p.selectedPackProductId &&
                    (p.selectedFromDate == null || policy().ms(r.fromDate) === policy().ms(p.selectedFromDate))
            )
            out.packagingForm = Object.assign({}, out.packagingForm, selected || {baseProductId: base}, {
                fromDate: null,
                thruDate: null,
                changeReason: ""
            })
            out.packagingRows = out.packagingRows.map(r =>
                Object.assign({}, r, {fromDateText: date(r.fromDate), thruDateText: date(r.thruDate)})
            )
            if (p.scanId) out.scanResult = call("mantle.product.ProductServices.resolve#ScannedProduct", p)
        } else if (out.workspace === "identifiers") {
            const organizationPartyId = p.organizationPartyId || a.activeOrganizationPartyId || a.organizationPartyIds[0]
            Object.assign(
                out,
                call("mantle.product.IdentifierServices.get#IdentifierContext", Object.assign({}, p, {organizationPartyId}))
            )
            const selected = out.identifierPolicyRows.find(r => r.productIdTypeEnumId === (p.productIdTypeEnumId || "PidtSku"))
            out.identifierPolicyForm = Object.assign({}, selected, {organizationPartyId, fromDate: null, changeReason: ""})
            out.identifierPolicyHistory = out.identifierPolicyHistory.map(r =>
                Object.assign({}, r, {fromDateText: date(r.fromDate), thruDateText: date(r.thruDate)})
            )
            if (p.testProductId && p.testIdentifierType)
                out.identifierTest = call("mantle.product.ProductServices.validate#ProductIdentifier", {
                    productId: p.testProductId,
                    productIdTypeEnumId: p.testIdentifierType,
                    idValue: p.testValue,
                    generate: p.generate,
                    forAssignment: true
                })
        } else if (out.workspace === "labels") {
            out.templateOptions = ec.resource.script("component://mr-mantle/service/mantle/product/Labels.js").templates
            out.printerOptions = policy()
                .rows("moqui.basic.print.NetworkPrinter")
                .map(r => ({value: r.networkPrinterId, label: r.description || r.printerName || r.networkPrinterId}))
            out.canPriceLabels = ["PRICE_VIEW", "PRICE_EDIT"].some(n =>
                ec.resource.script("component://mr-mantle/service/mantle/product/ProductAccess.js").has(n)
            )
            if (p.operationKey) {
                Object.assign(out, call("mantle.product.LabelServices.get#ProductLabels", p))
                out.labelDraft = Object.assign({}, out.request, {
                    productIds: out.request.items.map(r => r.productId).join(", "),
                    copies: out.request.items[0]?.copies || 1
                })
            }
        } else throw new Error("Unknown catalog workspace")
        return out
    }
    return {context}
}
;({context: p => scopeFor(p).context(p)})
