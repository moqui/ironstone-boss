const T = "ironstone.products.ProductToolsServices.",
    P = "mantle.product.ProductServices.",
    L = "mantle.product.LabelServices."
function as(user, fn, on = false) {
    login(user)
    if (on) ec.artifactExecution.enableAuthz()
    else ec.artifactExecution.disableAuthz()
    try {
        return fn()
    } finally {
        ec.message.clearErrors()
        ec.artifactExecution.disableAuthz()
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
spec({
    cleanup() {
        ec.message.clearErrors()
        ec.artifactExecution.enableAuthz()
    }
})
feature("catalog tool #path renders in #mode", {
    where: [
        "Units/Index",
        "Units/Packaging",
        "Units/Labels",
        "Settings/IdentificationTypes",
        "Products/Product360/Packaging",
        "Products/Product360/Identifiers"
    ].flatMap(path => ["qvt", "html", "tui"].map(mode => ({path, mode}))),
    expect({path, mode}) {
        const r = as("catalog.admin", () =>
            ec.screen
                .makeTest()
                .rootScreen("component://mr-boss/screen/Products.xml")
                .renderMode(mode)
                .withStaticData()
                .render(path, {productId: "BOSS_PRD_OWN", organizationPartyId: "ORG_ZIZI_SERVICES"}, null)
        )
        if (r.errorMessages.length) log.warn(r.errorMessages.join(" | "))
        r.status == 200
        r.errorMessages.length == 0
        !/Error rendering|Exception in render/.test(r.output)
    }
})
feature("a reader sees dated packaging and resolves a pack without global unit or catalog edit authority", {
    when() {
        return as("catalog.reader", () => ({
            context: call(T + "get#ToolsContext", {
                workspace: "packaging",
                baseProductId: "BOSS_PRD_OWN",
                scanId: "BOSS_PACK_12"
            }),
            units: call(T + "get#ToolsContext", {workspace: "units"}),
            packDenied: invoke(P + "store#ProductPackaging", {
                packProductId: "BOSS_PRD_PACK",
                baseProductId: "BOSS_PRD_OWN",
                quantity: 24,
                quantityUomId: "OTH_ea",
                changeReason: "Denied"
            }),
            unitDenied: invoke("org.moqui.impl.UnitServices.store#Unit", {
                uomId: "BOSS_DENIED",
                description: "Denied",
                uomTypeEnumId: "UT_OTHER_MEASURE",
                changeReason: "Denied"
            })
        }))
    },
    then({context, units, packDenied, unitDenied}) {
        context.packagingRows.some(r => r.packProductId === "BOSS_PRD_PACK")
        context.scanResult.productId == "BOSS_PRD_OWN"
        toDecimal(context.scanResult.containedQuantity).compare("12") === 0
        units.canManageUnits == false
        packDenied.error.length > 0
        unitDenied.error.length > 0
    }
})
feature("catalog administrator cannot write framework units or currencies and foreign products stay masked", {
    when() {
        return as("catalog.admin", () => ({
            unit: invoke("org.moqui.impl.UnitServices.store#Unit", {
                uomId: "BOSS_DENIED",
                description: "Denied",
                uomTypeEnumId: "UT_OTHER_MEASURE",
                changeReason: "Denied"
            }),
            foreign: invoke(P + "resolve#ScannedProduct", {scanId: "BOSS_OTHER_SECRET"}),
            context: call(T + "get#ToolsContext", {
                workspace: "identifiers",
                organizationPartyId: "ORG_ZIZI_SERVICES",
                productIdTypeEnumId: "PidtSku"
            })
        }))
    },
    then({unit, foreign, context}) {
        unit.error.length > 0
        foreign.found != true
        context.identifierPolicyForm.organizationPartyId == "ORG_ZIZI_SERVICES"
        context.identifierPolicyForm.expectedRevision != null
    }
})
feature("a label selection retains ready products and named failures, and its actor boundary survives disabled authz", {
    when() {
        const prepared = as("catalog.reader", () =>
            call(L + "prepare#ProductLabels", {
                productIds: ["BOSS_PRD_PACK", "BOSS_PRD_OWN", "BOSS_PRD_OTHER", "NO_SUCH_PRODUCT"],
                symbology: "QR",
                copies: 2
            })
        )
        return {
            prepared,
            loaded: as("catalog.reader", () =>
                call(T + "get#ToolsContext", {workspace: "labels", operationKey: prepared.operationKey})
            ),
            denied: as("catalog.catalog.edit", () => invoke(L + "get#ProductLabels", {operationKey: prepared.operationKey}))
        }
    },
    then({prepared, loaded, denied}) {
        prepared.labelCount == 4
        prepared.findings.length == 2
        loaded.labelRows.length == 2
        loaded.stale == false
        denied.error.includes("own label selection")
    }
})
