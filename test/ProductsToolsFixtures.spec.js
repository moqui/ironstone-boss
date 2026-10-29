spec({
    cleanup() {
        ec.message.clearErrors()
        ec.artifactExecution.enableAuthz()
    }
})
feature("the label demonstration is a durable reader-owned selection over ordinary catalog records", {
    expect() {
        login("catalog.reader")
        const disabled = ec.artifactExecution.disableAuthz()
        const made = call("mantle.product.LabelServices.prepare#ProductLabels", {
            productIds: ["BOSS_PRD_PACK", "BOSS_PRD_OWN"],
            copies: 2,
            symbology: "QR"
        })
        made.labelRows.length == 2
        const row = ec.entity
            .find("mantle.product.ProductCatalogOperation")
            .condition("operationKey", made.operationKey)
            .disableAuthz()
            .one()
        ec.service
            .sync()
            .name("create#mantle.product.ProductCatalogOperation")
            .parameters(Object.assign({}, row.getMap(), {operationKey: "BOSS_LABEL_SAMPLE"}))
            .disableAuthz()
            .call()
        for (const item of ec.entity
            .find("mantle.product.ProductCatalogOperationItem")
            .condition("operationKey", made.operationKey)
            .disableAuthz()
            .list())
            ec.service
                .sync()
                .name("create#mantle.product.ProductCatalogOperationItem")
                .parameters(Object.assign({}, item.getMap(), {operationKey: "BOSS_LABEL_SAMPLE"}))
                .disableAuthz()
                .call()
        login("john.doe")
    }
})
