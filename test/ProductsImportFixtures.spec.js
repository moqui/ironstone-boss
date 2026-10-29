spec({
    cleanup() {
        ec.message.clearErrors()
        ec.artifactExecution.enableAuthz()
    }
})
feature("the import gallery opens a durable validated run over a mixed demonstration file", {
    expect() {
        login("catalog.edit")
        const disabled = ec.artifactExecution.disableAuthz()
        const S = "mantle.product.ProductImportServices.",
            staged = call(S + "stage#CatalogImport", {
                kindId: "products",
                organizationPartyId: "ORG_ZIZI_SERVICES",
                sourceText:
                    "productId,productName,amountUomId\nBOSS_IMPORT_SAMPLE,Imported sample,OTH_ea\nBOSS_IMPORT_NEEDS_NAME,,OTH_ea\n"
            }),
            checked = call(S + "validate#CatalogImport", {
                operationKey: staged.operationKey,
                mappingRevision: staged.mappingRevision
            }),
            row = ec.entity
                .find("mantle.product.ProductCatalogOperation")
                .condition("operationKey", staged.operationKey)
                .disableAuthz()
                .one()
        call(
            "create#mantle.product.ProductCatalogOperation",
            Object.assign({}, row.getMap(), {operationKey: "BOSS_IMPORT_SAMPLE_RUN"})
        )
        for (const item of ec.entity
            .find("mantle.product.ProductCatalogOperationItem")
            .condition("operationKey", staged.operationKey)
            .disableAuthz()
            .list())
            call(
                "create#mantle.product.ProductCatalogOperationItem",
                Object.assign({}, item.getMap(), {operationKey: "BOSS_IMPORT_SAMPLE_RUN"})
            )
        checked.validCount == 1
        checked.errorCount == 1
        login("john.doe")
    }
})
