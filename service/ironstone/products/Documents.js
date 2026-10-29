// App routing is local to this invocation, including nested catalog reads.
function run(op, parameters) {
    // Products capabilities and screen shaping; content storage, revisions and review rules belong to Mantle.
    const lib = ec.resource.script("component://mr-boss/service/ironstone/products/ProductsLib.js"),
        policy = () => ec.resource.script("component://mr-mantle/service/mantle/product/MethodPolicy.js"),
        call = (n, p = {}) => policy().call(n, p),
        S = "mantle.product.ContentServices."
    function check(p, edit = false) {
        const a = call("ironstone.products.CatalogServices.get#SharedContext", {appRoot: p.appRoot})
        if (!a.capabilities[edit ? "catalogEdit" : "read"])
            throw new Error("Catalog " + (edit ? "edit" : "read") + " access is required")
        return a
    }
    function context(p) {
        const a = check(p),
            category = p.recordKind === "category" || !!p.productCategoryId,
            kind = category ? "category" : "product",
            c = ec.resource
                .script("component://mr-mantle/service/mantle/product/Content.js")
                .config(Object.assign({}, p, {recordKind: kind})),
            out = call(S + "find#CatalogContents", Object.assign({}, p, {recordKind: kind})),
            date = lib.dateText,
            // the language of the user's locale (en_US is en) is the default source and draft locale
            userLanguage = String(ec.user.locale || "en").split(/[_-]/)[0]
        Object.assign(out, {
            recordKind: kind,
            appRoot: a.appRoot,
            sourceLocale: p.sourceLocale || userLanguage,
            targetLocale: p.targetLocale || "es",
            contentDraft: {locale: p.locale || userLanguage, [c.owner]: p[c.owner]},
            contentTypes: lib.enumOptions(c.enumType),
            canEdit: a.capabilities.catalogEdit && out.canEdit,
            view: p.view || "list",
            document: null,
            versionRows: [],
            conflictRows: [],
            diff: null
        })
        out.driveOptions =
            call("ironstone.products.CatalogServices.get#CatalogOptions", {optionNames: ["drives"]}).options?.drives || []
        const parameters = r => ({recordKind: kind, [c.id]: r.contentId, [c.owner]: r.recordId}),
            query = r =>
                Object.entries(parameters(r))
                    .filter(([k, v]) => v != null)
                    .map(([k, v]) => encodeURIComponent(k) + "=" + encodeURIComponent(v))
                    .join("&")
        out.contentRows = out.contentRows.map(r =>
            Object.assign({}, r, {
                fromDateText: date(r.fromDate),
                thruDateText: date(r.thruDate),
                detailUrl: "//Products/DocumentDetail?" + query(r),
                previewUrl: "//Products/DocumentDetail/download?" + query(r) + "&inline=true",
                imagePreview: r.inlineAllowed && String(r.mimeType).startsWith("image/"),
                inheritanceText: r.inherited ? "Inherited from " + r.recordId : "Direct content"
            })
        )
        if (p.contentId || p.productContentId || p.productCategoryContentId) {
            const d = call(S + "get#CatalogContent", p)
            Object.assign(out, d)
            out.documentForm = Object.assign({}, d.document, {
                contentText: d.contentText,
                expectedRevision: d.expectedRevision,
                fromDate: d.document.fromDate ? policy().iso(d.document.fromDate) : null,
                thruDate: d.document.thruDate ? policy().iso(d.document.thruDate) : null
            })
            out.versionRows = out.versionRows.map(r => Object.assign({}, r, {dateText: date(r.versionDate)}))
            out.conflictRows = out.conflictRows.map(r => Object.assign({}, r, {dateText: date(r.submittedDate)}))
        }
        return out
    }
    function execute(op, p) {
        p = Object.assign({}, p)
        for (const key of ["contentId", "productContentId", "productCategoryContentId", "productId", "productCategoryId"])
            if (["", "null", "undefined"].includes(p[key])) p[key] = null
        if (op === "context") return context(p)
        // The existing P2 CatalogServices.store#ProductContent API remains compatible.
        if (op === "store") {
            check(p, true)
            const out = call(S + "store#CatalogContent", p)
            if (out.conflict) ec.message.addMessage("This document changed. Your submission is retained as a separate draft.")
            return out
        }
        throw new Error("Unknown catalog document operation")
    }
    return execute(op, parameters)
}
;({execute: run})
