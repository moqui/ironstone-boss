const S = "mantle.product.ProductImportServices.",
    B = "ironstone.products.ImportServices."
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
        const result = call(n, p) || {},
            error = ec.message.getErrorsString()
        ec.message.clearErrors()
        return Object.assign({}, result, {error})
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
feature("the import wizard renders in #mode with guarded mapping choices", {
    where: [{mode: "qvt"}, {mode: "html"}, {mode: "tui"}],
    expect({mode}) {
        const r = as("catalog.catalog.edit", () =>
            ec.screen
                .makeTest()
                .rootScreen("component://mr-boss/screen/Products.xml")
                .renderMode(mode)
                .withStaticData()
                .render("ProductImport", {}, null)
        )
        if (r.errorMessages.length) log.warn(r.errorMessages.join(" | "))
        r.status == 200
        r.errorMessages.length == 0
        !/Error rendering|Exception in render/.test(r.output)
    }
})
feature("the BOSS mapping form configures native work and emits one aggregate result notice for an applied run", {
    when() {
        return as("catalog.catalog.edit", () => {
            const staged = call(S + "stage#CatalogImport", {
                    kindId: "products",
                    organizationPartyId: "ORG_ZIZI_SERVICES",
                    sourceText: "Code,Name\nBOSS_IMPORT_VALID,Imported catalog product\nBOSS_IMPORT_INVALID,\n"
                }),
                first = call(B + "map#CatalogImport", {
                    operationKey: staged.operationKey,
                    mappingRevision: staged.mappingRevision,
                    mappingAction: "column",
                    sourceColumn: "Code",
                    targetField: "productId"
                }),
                mapped = call(B + "map#CatalogImport", {
                    operationKey: staged.operationKey,
                    mappingRevision: first.mappingRevision,
                    mappingAction: "column",
                    sourceColumn: "Name",
                    targetField: "productName"
                }),
                validated = call(S + "validate#CatalogImport", {
                    operationKey: staged.operationKey,
                    mappingRevision: mapped.mappingRevision
                }),
                applied = call(S + "apply#CatalogImport", {
                    operationKey: staged.operationKey,
                    inputFingerprint: validated.inputFingerprint
                }),
                repeated = call(S + "apply#CatalogImport", {
                    operationKey: staged.operationKey,
                    inputFingerprint: validated.inputFingerprint
                }),
                context = call(B + "get#ImportContext", {operationKey: staged.operationKey}),
                notices = ec.entity
                    .find("mantle.product.ProductCatalogOperation")
                    .condition("operationType", "import-notice")
                    .disableAuthz()
                    .list()
            return {validated, applied, repeated, context, notices}
        })
    },
    then({validated, applied, repeated, context, notices}) {
        validated.validCount == 1
        validated.errorCount == 1
        applied.appliedCount == 1
        applied.attemptedCount == 1
        repeated.changedRows == 0
        context.mappingRows.length == 2
        context.previewRows.some(r => r.errorMessage)
        context.previewRows.every(r => !r.proposedText.includes("expectedLastUpdatedStamp"))
        Array.from(notices).filter(r => JSON.parse(r.requestJson).operationKey === applied.operationKey).length == 1
    }
})
feature("native import staging and source reports keep their role and owner guards with authz #enabled", {
    where: [{enabled: true}, {enabled: false}],
    when({enabled}) {
        return {
            reader: as(
                "catalog.reader",
                () =>
                    invoke(S + "stage#CatalogImport", {
                        kindId: "products",
                        organizationPartyId: "ORG_ZIZI_SERVICES",
                        sourceText: "productId,productName\nDENIED,Denied\n"
                    }),
                enabled
            ),
            editor: as(
                "catalog.catalog.edit",
                () => call(S + "get#CatalogImportKinds", {organizationPartyId: "ORG_ZIZI_SERVICES"}),
                enabled
            ),
            prices: as(
                "catalog.catalog.edit",
                () =>
                    invoke(S + "stage#CatalogImport", {
                        kindId: "supplierPrices",
                        organizationPartyId: "ORG_ZIZI_SERVICES",
                        sourceText: "productId,vendorPartyId,price,priceUomId\nBOSS_PRD_OWN,BOSS_PRD_SUPPLIER,9,USD\n"
                    }),
                enabled
            )
        }
    },
    then({reader, editor, prices}) {
        reader.error.length > 0
        editor.kindOptions.some(r => r.value === "products")
        !editor.kindOptions.some(r => r.value === "supplierPrices")
        prices.error.length > 0
    }
})
feature("a price import sends its aggregate notice while suppressing per-row price notifications", {
    when() {
        as("john.doe", () =>
            call("create#mantle.product.Product", {
                productId: "BOSS_IMPORT_PRICE_TARGET",
                productName: "Price import target",
                ownerPartyId: "ORG_ZIZI_SERVICES",
                productTypeEnumId: "PtAsset",
                amountUomId: "OTH_ea"
            })
        )
        return as("catalog.price.edit", () => {
            const staged = call(S + "stage#CatalogImport", {
                    kindId: "prices",
                    organizationPartyId: "ORG_ZIZI_SERVICES",
                    sourceText:
                        "productId,price,priceUomId,minQuantity\nBOSS_IMPORT_PRICE_TARGET,20,USD,1\nBOSS_IMPORT_PRICE_TARGET,15,USD,10\nBOSS_IMPORT_PRICE_TARGET,10,USD,20\n"
                }),
                valid = call(S + "validate#CatalogImport", {
                    operationKey: staged.operationKey,
                    mappingRevision: staged.mappingRevision
                }),
                applied = call(S + "apply#CatalogImport", {
                    operationKey: staged.operationKey,
                    inputFingerprint: valid.inputFingerprint
                })
            for (const mode of ["qvt", "html", "tui"]) {
                const r = ec.screen
                    .makeTest()
                    .rootScreen("component://mr-boss/screen/Products.xml")
                    .renderMode(mode)
                    .withStaticData()
                    .render("ProductImport", {operationKey: staged.operationKey}, null)
                if (r.errorMessages.length) throw new Error(r.errorMessages.join("; "))
            }
            const priceIds = applied.importRows.map(r => r.resultRecordId),
                markers = Array.from(ec.entity.find("mantle.product.ProductCatalogOperation").disableAuthz().list())
            return {applied, priceIds, markers}
        })
    },
    then({applied, priceIds, markers}) {
        applied.appliedCount == 3
        markers.filter(
            r => r.operationType === "import-notice" && JSON.parse(r.requestJson).operationKey === applied.operationKey
        ).length == 1
        markers.filter(r => r.operationType === "price-notice" && priceIds.includes(JSON.parse(r.requestJson).productPriceId))
            .length == 0
    }
})
