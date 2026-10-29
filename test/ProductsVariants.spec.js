const V = "ironstone.products.VariantServices.",
    S = "ironstone.products.SettingsServices.",
    P = "mantle.product.",
    F = P + "feature.",
    C = "ironstone.products.CatalogServices.",
    time = Date.now()
function as(user, fn) {
    login(user)
    const was = ec.artifactExecution.disableAuthz()
    try {
        return fn()
    } finally {
        ec.message.clearErrors()
        if (!was) ec.artifactExecution.enableAuthz()
        login("john.doe")
    }
}
function invoke(n, p) {
    try {
        const out = call(n, p) || {},
            error = ec.message.getErrorsString()
        ec.message.clearErrors()
        return Object.assign({}, out, {error})
    } catch (e) {
        ec.message.clearErrors()
        return {error: String(e.message || e)}
    }
}
function source(id, owner = "ORG_ZIZI_SERVICES") {
    call("create#" + P + "Product", {
        productId: id,
        productName: id,
        pseudoId: id,
        productTypeEnumId: "PtVirtual",
        ownerPartyId: owner,
        amountUomId: "OTH_ea"
    })
    for (const productFeatureId of ["BOSS_VAR_BLUE", "BOSS_VAR_RED", "BOSS_VAR_SMALL", "BOSS_VAR_LARGE"])
        call("create#" + F + "ProductFeatureAppl", {
            productId: id,
            productFeatureId,
            applTypeEnumId: "PfatSelectable",
            fromDate: time - 1000
        })
}
spec({
    setupSpec() {
        login("john.doe")
        ec.user.setEffectiveTime(time)
    }
})
feature("preview and generation enforce the real editor and owner, including disabled artifact authorization", {
    when() {
        as("john.doe", () => source("B4_OTHER", "ORG_ZIZI_RETAIL"))
        const out = as("catalog.reader", () => ({
            read: invoke(V + "preview#VariantProducts", {productId: "BOSS_PRD_VIRT"}),
            write: invoke(V + "create#VariantProducts", {
                productId: "BOSS_PRD_VIRT",
                selectedFeatureSets: [["BOSS_VAR_BLUE", "BOSS_VAR_SMALL"]]
            })
        }))
        const other = as("catalog.catalog.edit", () => invoke(V + "preview#VariantProducts", {productId: "B4_OTHER"}))
        return {out, other}
    },
    then({out, other}) {
        out.read.error.includes("not available")
        out.write.error.includes("not available")
        other.error.includes("not available")
        !JSON.stringify(other).includes("B4_OTHER")
    }
})
feature("preview omits price extras and hidden selectable features before sending the response", {
    when() {
        as("john.doe", () => {
            source("B4_SCOPE")
            call("create#" + F + "ProductFeature", {
                productFeatureId: "B4_SECRET",
                productFeatureTypeEnumId: "PftColor",
                description: "Retail private feature",
                ownerPartyId: "ORG_ZIZI_RETAIL"
            })
            call("create#" + F + "ProductFeatureAppl", {
                productId: "B4_SCOPE",
                productFeatureId: "B4_SECRET",
                applTypeEnumId: "PfatSelectable",
                fromDate: time - 1000
            })
        })
        const out = as("catalog.catalog.edit", () => call(V + "preview#VariantProducts", {productId: "B4_SCOPE"}))
        return {out, text: JSON.stringify(out)}
    },
    then({out, text}) {
        out.totalCount == 4
        !text.includes("B4_SECRET")
        !text.includes("Retail private")
        !text.includes("featureExtra")
        !text.includes("defaultAmount")
        out.rows.every(r => r.allowed)
        out.previewRevision.length < 200
    }
})
feature("selected generation is idempotent and reports a separate result for each independent combination", {
    when() {
        as("john.doe", () => {
            source("B4_SELECT")
            call("create#" + P + "Product", {
                productId: "B4_SELECT_RD_L",
                productName: "Unrelated collision",
                productTypeEnumId: "PtAsset"
            })
        })
        return as("catalog.catalog.edit", () => {
            const preview = call(V + "preview#VariantProducts", {productId: "B4_SELECT"}),
                params = {
                    productId: "B4_SELECT",
                    previewRevision: preview.previewRevision,
                    selectedFeatureSets: [
                        ["BOSS_VAR_BLUE", "BOSS_VAR_SMALL"],
                        ["BOSS_VAR_RED", "BOSS_VAR_LARGE"]
                    ]
                }
            const first = invoke(V + "create#VariantProducts", params),
                retry = invoke(V + "create#VariantProducts", params),
                empty = invoke(V + "create#VariantProducts", Object.assign({}, params, {selectedFeatureSets: []}))
            return {first, retry, empty}
        })
    },
    then({first, retry, empty}) {
        first.error == ""
        first.createdCount == 1
        first.failedCount == 1
        retry.existingCount == 1
        retry.failedCount == 1
        empty.error.includes("Select at least one")
    }
})
feature("unsafe copying and stale previews cannot change products or existing variant overrides", {
    when() {
        as("john.doe", () => source("B4_STALE"))
        return as("catalog.catalog.edit", () => {
            const p = call(V + "preview#VariantProducts", {productId: "B4_STALE"})
            const unsafe = invoke(V + "preview#VariantProducts", {productId: "B4_STALE", copyFields: ["standardCost"]})
            call(C + "store#Product", {productId: "B4_STALE", productName: "Renamed source"})
            const stale = invoke(V + "create#VariantProducts", {
                productId: "B4_STALE",
                previewRevision: p.previewRevision,
                selectedFeatureSets: [["BOSS_VAR_BLUE", "BOSS_VAR_SMALL"]]
            })
            return {unsafe, stale}
        })
    },
    then({unsafe, stale}) {
        unsafe.error.includes("allowlist")
        stale.error.includes("preview changed")
    }
})
feature("variant policies change by effective date, keep old values and reject stale or unauthorized updates", {
    when() {
        const out = as("catalog.admin", () => {
            const initial = call(S + "get#VariantSettings", {organizationPartyId: "ORG_ZIZI_SERVICES"})
            const first = invoke(S + "store#VariantSettings", {
                organizationPartyId: initial.organizationPartyId,
                expectedFromDate: initial.fromDate,
                settings: {batchLimit: 2, copyFields: ["description", "amountUomId"]},
                changeReason: "Small interactive batches"
            })
            const future = invoke(S + "store#VariantSettings", {
                organizationPartyId: initial.organizationPartyId,
                expectedFromDate: first.fromDate,
                fromDate: new Date(time + 60000).toISOString(),
                settings: {batchLimit: 1, copyFields: ["amountUomId"]},
                changeReason: "Scheduled change"
            })
            const now = call(S + "get#VariantSettings", {organizationPartyId: initial.organizationPartyId}),
                later = call(S + "get#VariantSettings", {
                    organizationPartyId: initial.organizationPartyId,
                    asOfDate: new Date(time + 61000).toISOString()
                })
            const stale = invoke(S + "store#VariantSettings", {
                organizationPartyId: initial.organizationPartyId,
                expectedFromDate: null,
                fromDate: new Date(time + 120000).toISOString(),
                settings: {batchLimit: 3}
            })
            return {
                first,
                future,
                now,
                later,
                stale,
                auditCount: ec.entity
                    .find("moqui.entity.EntityAuditLog")
                    .condition({changedEntityName: "mantle.product.ProductVariantSetting", changedFieldName: "thruDate"})
                    .disableAuthz()
                    .count()
            }
        })
        const denied = as("catalog.catalog.edit", () =>
            invoke(S + "store#VariantSettings", {organizationPartyId: "ORG_ZIZI_SERVICES", settings: {batchLimit: 5}})
        )
        return {out, denied}
    },
    then({out, denied}) {
        out.first.error == ""
        out.future.error == ""
        out.now.settings.batchLimit == 2
        out.later.settings.batchLimit == 1
        out.now.history.length == 2
        out.auditCount > 0
        out.now.history[1].thruDate != null
        out.stale.error.includes("changed")
        denied.error.includes("not available")
    }
})
feature("large selections use a durable manifest, resume in bounded chunks and bind operation keys to the exact request", {
    when() {
        as("john.doe", () => source("B4_BATCH"))
        return as("catalog.catalog.edit", () => {
            const preview = call(V + "preview#VariantProducts", {productId: "B4_BATCH"}),
                p = {
                    productId: "B4_BATCH",
                    previewRevision: preview.previewRevision,
                    selectedFeatureSets: preview.rows.map(r => r.productFeatureIds)
                }
            const interactive = invoke(V + "create#VariantProducts", p),
                queued = invoke(V + "start#VariantBatch", Object.assign({}, p, {operationKey: "B4_RUN"})),
                again = invoke(V + "start#VariantBatch", Object.assign({}, p, {operationKey: "B4_RUN"})),
                changed = invoke(
                    V + "start#VariantBatch",
                    Object.assign({}, p, {operationKey: "B4_RUN", selectedFeatureSets: [p.selectedFeatureSets[0]]})
                ),
                first = invoke(V + "run#VariantBatch", {operationKey: "B4_RUN", limit: 1}),
                second = invoke(V + "run#VariantBatch", {operationKey: "B4_RUN", limit: 100}),
                third = invoke(V + "run#VariantBatch", {operationKey: "B4_RUN", limit: 100}),
                done = invoke(V + "run#VariantBatch", {operationKey: "B4_RUN"})
            return {interactive, queued, again, changed, first, second, third, done}
        })
    },
    then({interactive, queued, again, changed, first, second, third, done}) {
        interactive.error.includes("durable batch")
        queued.error == ""
        queued.pendingCount == 4
        again.pendingCount == 4
        changed.error.includes("bound")
        first.pendingCount == 3
        second.pendingCount == 1
        third.pendingCount == 0
        done.createdCount == 4
        done.results.length == 4
        done.error == ""
    }
})
feature("a changed batch input fails each affected item without losing its manifest or successes", {
    when() {
        as("john.doe", () => source("B4_CHANGE"))
        return as("catalog.catalog.edit", () => {
            const before = call(V + "preview#VariantProducts", {productId: "B4_CHANGE"})
            call(V + "start#VariantBatch", {
                productId: "B4_CHANGE",
                operationKey: "B4_CHANGE_RUN",
                previewRevision: before.previewRevision,
                selectedFeatureSets: before.rows.map(r => r.productFeatureIds)
            })
            const first = call(V + "run#VariantBatch", {operationKey: "B4_CHANGE_RUN", limit: 1})
            call(C + "store#Product", {productId: "B4_CHANGE", productName: "Changed after partial batch"})
            const rest = call(V + "run#VariantBatch", {operationKey: "B4_CHANGE_RUN", limit: 100})
            return {first, rest}
        })
    },
    then({first, rest}) {
        first.createdCount == 1
        rest.createdCount == 1
        rest.failedCount == 2
        rest.pendingCount == 1
    }
})
feature("blank optional XML form fields retain the previewed copy policy", {
    when() {
        as("john.doe", () => source("B4_XML"))
        return as("catalog.catalog.edit", () => {
            const preview = call(V + "preview#VariantProducts", {productId: "B4_XML"})
            return invoke(V + "create#VariantProducts", {
                productId: "B4_XML",
                operationKey: "B4_XML_RUN",
                productTypeEnumId: "",
                productFeatureGroupIds: "",
                copyFieldsJson: "",
                filterFeatureIdsJson: "",
                copyCategoryMembers: false,
                previewRevision: preview.previewRevision,
                selectedFeatureSetsJson: JSON.stringify([preview.rows[0].productFeatureIds])
            })
        })
    },
    then(out) {
        out.error == ""
        out.createdCount == 1
        out.operationKey == "B4_XML_RUN"
    }
})
