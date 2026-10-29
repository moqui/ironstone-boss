// Index the sample order using the same inventory document as the price-history report.
spec({
    setupSpec() {
        login("john.doe")
    },
    setup() {
        ec.artifactExecution.disableAuthz()
    },
    cleanup() {
        ec.message.clearErrors()
        ec.artifactExecution.enableAuthz()
    }
})
feature("the sample sale is available to scoped transaction statistics", {
    when() {
        const available = ec.search.isAvailable(),
            documents = ec.entity.getDataDocuments("MantleInventoryOrderItem", {orderId: "BOSS_PRICE_ORDER"})
        if (available) ec.search.indexDocuments(documents)
        return {available, documents}
    },
    then({available, documents}) {
        documents.length == 1
        documents[0].currencyUomId == "USD"
        documents[0].orderItemTotal == 30
    }
})
