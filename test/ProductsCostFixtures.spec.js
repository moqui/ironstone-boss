const C = "mantle.product.CostServices."
function as(user, fn) {
    login(user)
    ec.artifactExecution.disableAuthz()
    try {
        return fn()
    } finally {
        ec.message.clearErrors()
        login("john.doe")
    }
}
spec({
    setupSpec() {
        try {
            ec.resource.xslFoTransform("<html><body>Standard estimate approval</body></html>", null, null, "application/pdf")
        } catch (e) {
            if (String(e).includes("PDF is not available"))
                skip("Cost approval integration needs Chromium: configure pdf_chromium_path")
            throw e
        }
    },
    cleanup() {
        ec.message.clearErrors()
        ec.artifactExecution.enableAuthz()
    }
})
feature("dated cost demonstration approvals store their PDF through the owner service without stock postings", {
    expect() {
        as("john.doe", () => {
            const entity = "mantle.ledger.config.PartyAcctgPreference"
            if (!ec.entity.find(entity).condition("organizationPartyId", "ORG_ZIZI_SERVICES").disableAuthz().one()) {
                const defaults = ec.entity
                    .find(entity)
                    .condition("organizationPartyId", "DefaultSettings")
                    .disableAuthz()
                    .one()
                    .getMap()
                delete defaults.lastUpdatedStamp
                call(
                    "create#" + entity,
                    Object.assign({}, defaults, {
                        organizationPartyId: "ORG_ZIZI_SERVICES",
                        realTimeGlSummary: "N",
                        inventoryRevaluationEnabled: "Y"
                    })
                )
            }
            call("mantle.party.TimeServices.getOrCreate#TimePeriod", {
                partyId: "ORG_ZIZI_SERVICES",
                timePeriodTypeId: "FiscalYear",
                fromDate: new Date(Number(ec.user.nowTimestamp)).getUTCFullYear() + "-01-01"
            })
        })
        as("catalog.cost.approve", () => {
            const d = call(C + "get#ProductStandardCost", {productStandardCostId: "BOSS_COST_SAMPLE"}),
                a = call(C + "approve#ProductStandardCost", {
                    productStandardCostId: "BOSS_COST_SAMPLE",
                    expectedRevision: d.estimateRevision,
                    changeReason: "Approved demonstration standard"
                })
            a.standardCost.state == "approved"
            toDecimal(a.standardCost.unitCost).compare("6.25") === 0
        })
        const draft = as("catalog.cost.estimate", () => {
            const d = call(C + "store#ProductStandardCost", {
                productId: "BOSS_PRD_PACK",
                organizationPartyId: "ORG_ZIZI_SERVICES",
                quantity: 1,
                changeReason: "Pack planned material"
            })
            return call(C + "store#StandardCostComponent", {
                productStandardCostId: d.standardCost.productStandardCostId,
                quantity: 1,
                quantityUomId: "OTH_ea",
                rateAmount: 8,
                description: "Planned pack material",
                changeReason: "Pack material basis"
            })
        })
        as("catalog.cost.approve", () =>
            call(C + "approve#ProductStandardCost", {
                productStandardCostId: draft.standardCost.productStandardCostId,
                expectedRevision: draft.estimateRevision,
                changeReason: "Approved pack estimate"
            })
        )
    }
})
