// Each exported screen operation receives a fresh routing scope.
function scopeFor(parameters) {
    const requestedRoot = parameters.appRoot || "Products"
    // Products read/form context; validation is owned by Mantle.
    const call = (n, p = {}) => {
        const out =
            ec.service
                .sync()
                .name(n)
                .parameters(Object.assign({appRoot: requestedRoot}, p))
                .call() || {}
        if (ec.message.hasError()) throw new Error(ec.message.getErrorsString())
        return out
    }
    function context(p) {
        const a = call("ironstone.products.CatalogServices.get#SharedContext", {appRoot: p.appRoot})
        if (!a.capabilities.read) throw new Error("Catalog read access is required")
        const strings = v => (Array.isArray(v) ? v : [v]).flatMap(x => String(x || "").split(/[\s,]+/)).filter(Boolean),
            params = Object.assign({}, p, {
                productIds: p.productIds || p.productId ? strings(p.productIds || p.productId) : null,
                checkIds: p.checkIds ? strings(p.checkIds) : null
            }),
            catalogChecksRan = !!p.runChecks
        const result = catalogChecksRan
            ? call("mantle.product.CatalogCheckServices.validate#Catalog", params)
            : Object.assign(
                  {issueRows: [], checkedCount: 0, issueCount: 0, incompleteCount: 0, valid: true},
                  call("mantle.product.CatalogCheckServices.get#CatalogChecks")
              )
        return Object.assign({}, result, {
            appRoot: a.appRoot,
            catalogChecksRan,
            ownerOptions: call("ironstone.products.CatalogServices.get#CatalogOptions", {optionNames: ["owners"]}).options.owners,
            checkForm: Object.assign({}, p, {
                productIds: params.productIds?.join(", ") || "",
                checkIds: params.checkIds || result.checkOptions.map(r => r.value),
                runChecks: true
            })
        })
    }
    return {context}
}
;({context: p => scopeFor(p).context(p)})
