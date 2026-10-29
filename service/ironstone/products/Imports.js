// Each exported screen operation receives a fresh routing scope.
function scopeFor(parameters) {
    const requestedRoot = parameters.appRoot || "Products"
    // App-specific wizard mapping and read projections. Import work is performed by the native domain services.
    const S = "mantle.product.ProductImportServices.",
        call = (n, p = {}) => {
            const r =
                ec.service
                    .sync()
                    .name(n)
                    .parameters(Object.assign({appRoot: requestedRoot}, p))
                    .disableAuthz()
                    .call() || {}
            if (ec.message.hasError()) throw new Error(ec.message.getErrorsString())
            return r
        }
    function access(p) {
        const a = call("ironstone.products.CatalogServices.get#SharedContext", {appRoot: p.appRoot})
        if (!a.capabilities.read) throw new Error("Catalog read access is required")
        return a
    }
    function context(p) {
        const a = access(p),
            kinds = call(S + "get#CatalogImportKinds", {organizationPartyId: p.organizationPartyId}),
            out = Object.assign(
                {
                    appRoot: a.appRoot,
                    operationKey: p.operationKey || null,
                    canStage: kinds.kindOptions.length > 0,
                    hasImport: !!p.operationKey,
                    importRows: [],
                    mappingRows: [],
                    targetOptions: [],
                    previewRows: []
                },
                kinds,
                {
                    ownerOptions: call("ironstone.products.CatalogServices.get#CatalogOptions", {optionNames: ["owners"]}).options
                        .owners,
                    uploadForm: {
                        organizationPartyId: p.organizationPartyId || a.activeOrganizationPartyId || a.organizationPartyIds[0],
                        kindId: p.kindId || kinds.kindOptions[0]?.value,
                        delimiter: ",",
                        updateMode: "upsert"
                    }
                }
            )
        if (p.operationKey) {
            Object.assign(out, call(S + "get#CatalogImport", p))
            out.mappingRows = out.headers.map(sourceColumn => ({
                sourceColumn,
                targetField: out.mapping[sourceColumn] || "",
                mappingRevision: out.mappingRevision,
                operationKey: p.operationKey
            }))
            out.targetOptions = out.columns.map(c => ({value: c.name, label: c.label}))
            out.clearOptions = out.columns
                .filter(c => ["description", "comments", "pseudoId"].includes(c.name))
                .map(c => ({value: c.name, label: c.label}))
            out.formatForm = {
                operationKey: p.operationKey,
                mappingRevision: out.mappingRevision,
                updateMode: out.updateMode,
                dateFormat: out.dateFormat,
                decimalSeparator: out.numberFormat.decimal,
                groupSeparator: out.numberFormat.group,
                clearFields: out.clearFields
            }
            out.valueMappingRows = []
            for (const [field, values] of Object.entries(out.valueMappings))
                for (const [sourceValue, targetValue] of Object.entries(values))
                    out.valueMappingRows.push({field, sourceValue, targetValue})
            out.defaultRows = Object.entries(out.defaults).map(([field, value]) => ({field, value}))
            out.previewRows = out.importRows.map(r =>
                Object.assign({}, r, {
                    sourceText: Object.entries(r.sourceValues)
                        .map(([k, v]) => k + ": " + v)
                        .join("; "),
                    proposedText: out.columns
                        .filter(c => r.values && Object.prototype.hasOwnProperty.call(r.values, c.name))
                        .map(c => c.label + ": " + (r.values[c.name] ?? "(clear)"))
                        .join("; "),
                    changeText: r.changes
                        .filter(c => out.columns.some(f => f.name === c.field))
                        .map(
                            c =>
                                (out.columns.find(f => f.name === c.field)?.label || c.field) +
                                ": " +
                                (c.before ?? "(empty)") +
                                " → " +
                                (c.after ?? "(clear)")
                        )
                        .join("; "),
                    warningText: r.warnings.join("; ")
                })
            )
        }
        return out
    }
    function mapping(p) {
        access(p)
        const current = call(S + "get#CatalogImport", {operationKey: p.operationKey})
        let params = {operationKey: p.operationKey, mappingRevision: p.mappingRevision}
        if (p.mappingAction === "column") {
            if (!current.headers.includes(p.sourceColumn)) throw new Error("Choose a source column")
            params.mapping = Object.assign({}, current.mapping, {[p.sourceColumn]: p.targetField || null})
        } else if (p.mappingAction === "default") {
            params.defaults = Object.assign({}, current.defaults)
            if (p.removeValue) delete params.defaults[p.targetField]
            else params.defaults[p.targetField] = p.defaultValue
        } else if (p.mappingAction === "value") {
            params.valueMappings = Object.fromEntries(
                Object.entries(current.valueMappings).map(([k, v]) => [k, Object.assign({}, v)])
            )
            const values = params.valueMappings[p.targetField] || {}
            if (p.removeValue) delete values[p.sourceValue]
            else values[p.sourceValue] = p.targetValue
            params.valueMappings[p.targetField] = values
        } else if (p.mappingAction === "formats") {
            params.updateMode = p.updateMode
            params.dateFormat = p.dateFormat
            params.numberFormat = {decimal: p.decimalSeparator, group: p.groupSeparator || ""}
            params.clearFields = Array.isArray(p.clearFields)
                ? p.clearFields
                : String(p.clearFields || "")
                      .split(/[\s,]+/)
                      .filter(Boolean)
        } else throw new Error("Choose a mapping action")
        return call(S + "configure#CatalogImport", params)
    }
    function notice(p) {
        access(p)
        if (!p.attemptedCount) return {sent: false}
        const imported = call(S + "get#CatalogImport", {operationKey: p.operationKey}),
            key =
                "import-notice-" +
                ec.user
                    .singleUseCodeHash(
                        p.operationKey +
                            "|" +
                            p.inputFingerprint +
                            "|" +
                            imported.appliedCount +
                            "|" +
                            imported.errorCount +
                            "|" +
                            p.changedRows
                    )
                    .slice(0, 24)
        if (ec.entity.find("mantle.product.ProductCatalogOperation").condition("operationKey", key).disableAuthz().one())
            return {sent: false}
        const title = imported.errorCount ? "Catalog import needs attention" : "Catalog import completed",
            nm = ec
                .makeNotificationMessage()
                .topic("CatalogImportResult")
                .userId(ec.user.userId)
                .message({
                    title,
                    operationKey: p.operationKey,
                    filename: imported.filename,
                    appliedCount: imported.appliedCount,
                    errorCount: imported.errorCount
                })
                .link("/qapps/Products/ProductImport?operationKey=" + encodeURIComponent(p.operationKey))
        if (nm.appName) nm.appName("Products")
        if (nm.actorUserId) nm.actorUserId(ec.user.userId)
        nm.send()
        call("create#mantle.product.ProductCatalogOperation", {
            operationKey: key,
            operationType: "import-notice",
            ownerPartyId: imported.organizationPartyId,
            submittedByUserId: ec.user.userId,
            submittedDate: ec.user.nowTimestamp,
            requestJson: JSON.stringify({
                operationKey: p.operationKey,
                appliedCount: imported.appliedCount,
                errorCount: imported.errorCount
            })
        })
        return {sent: true}
    }
    return {context, mapping, notice}
}
;({context: p => scopeFor(p).context(p), mapping: p => scopeFor(p).mapping(p), notice: p => scopeFor(p).notice(p)})
