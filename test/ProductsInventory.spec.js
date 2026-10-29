const I = "ironstone.products.InventoryServices.",
    N = "mantle.facility.WarehousePolicyServices.",
    F = "mantle.facility.FacilityServices.",
    C = "ironstone.products.CatalogServices."
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
const scope = {productId: "BOSS_PRD_OWN", facilityId: "BOSS_PRD_WH"}
spec({
    setupSpec() {
        as("john.doe", () => {
            if (ec.search.isAvailable())
                ec.search.indexDocuments(ec.entity.getDataDocuments("MantleInventoryAsset", {productId: "BOSS_PRD_OWN"}))
        })
    },
    cleanup() {
        ec.message.clearErrors()
        ec.artifactExecution.enableAuthz()
    }
})
feature(
    "stock quantities exclude a different owner in the same custody facility and never include valuation without cost authority",
    {
        when() {
            return as("catalog.reader", () => ({
                summary: call(I + "get#InventorySummary", scope),
                projection: call(I + "get#InventoryProjection", scope),
                other: invoke(I + "get#InventorySummary", {productId: "BOSS_PRD_OTHER", facilityId: "ZIRET_WH"})
            }))
        },
        then({summary, projection, other}) {
            summary.totals.onHand == "15"
            summary.totals.available == "12"
            summary.totals.held == "3"
            summary.totals.incoming == "0"
            summary.stockRows.length >= 1
            summary.stockRows.every(row => row.incoming != null && row.facilityName)
            Array.isArray(summary.lotRows)
            summary.costRead == false
            !JSON.stringify(summary).includes("510.98")
            !JSON.stringify(summary).includes("888.77")
            !JSON.stringify(summary).includes("991")
            projection.projectionAvailable == true
            projection.projectionRows.length == 3
            projection.projectionRows.every(r => r.projected === 12)
            other.error.includes("not available")
        }
    }
)
feature(
    "a stock planner saves facility and pick-location levels and an effective product tracking exception without a Warehouse launcher",
    {
        when() {
            return as("catalog.stock.plan", () => {
                const before = call(I + "get#InventoryPolicy", scope),
                    stock = invoke(
                        I + "store#FacilityPolicy",
                        Object.assign({}, scope, {
                            minimumStock: 8,
                            maximumStock: 25,
                            reorderQuantity: 12,
                            reorderMethodEnumId: "RdmUpToMaximum",
                            abcClassEnumId: "AbcA",
                            expectedLastUpdatedStamp: before.facilityPolicy.lastUpdatedStamp,
                            changeReason: "Stock planner review"
                        })
                    ),
                    location = invoke(
                        I + "store#FacilityPolicy",
                        Object.assign({}, scope, {
                            locationSeqId: "PICK",
                            minimumStock: 3,
                            moveQuantity: 6,
                            changeReason: "Pick level review"
                        })
                    ),
                    tracking = invoke(
                        I + "store#TrackingPolicy",
                        Object.assign({}, scope, {
                            trackingScope: "facility",
                            expectedFromDate: before.trackingSettings.expectedFromDate,
                            lotRequired: "Y",
                            shelfLifeDays: 30,
                            changeReason: "Lots required at this warehouse"
                        })
                    ),
                    after = call(I + "get#InventoryPolicy", scope)
                return {stock, location, tracking, after, warehouseAdmin: ec.user.isInGroup("BOSS_WAREHOUSE_ADMIN")}
            })
        },
        then({stock, location, tracking, after, warehouseAdmin}) {
            warehouseAdmin == false
            stock.error == ""
            location.error == ""
            tracking.error == ""
            after.facilityPolicy.minimumStock == "8"
            after.facilityPolicy.maximumStock == "25"
            after.facilityPolicy.abcClassEnumId == "AbcA"
            after.locationPolicies.find(r => r.locationSeqId === "PICK").moveQuantity == "6"
            after.trackingSettings.lotRequired == "Y"
            after.trackingHistory.some(r => r.changeReason === "Lots required at this warehouse")
            after.trackingSources.find(r => r.fieldLabel === "Lot required").valueText == "Yes"
        }
    }
)
feature("Products administrators and catalog editors cannot change Warehouse policy through either service boundary", {
    where: [{user: "catalog.admin"}, {user: "catalog.edit"}],
    when({user}) {
        return as(user, () => ({
            shared: invoke(I + "store#FacilityPolicy", Object.assign({}, scope, {minimumStock: 1, changeReason: "Refused"})),
            native: invoke(
                F + "store#ProductFacilityPolicy",
                Object.assign({}, scope, {minimumStock: 1, changeReason: "Refused"})
            ),
            tracking: invoke(
                N + "store#TrackingPolicy",
                Object.assign({}, scope, {organizationPartyId: "ORG_ZIZI_SERVICES", lotRequired: "N", changeReason: "Refused"})
            )
        }))
    },
    then({shared, native, tracking}) {
        shared.error.includes("stock-planner")
        native.error.includes("stock-planner")
        tracking.error.includes("stock-planner")
    }
})
const paths = [
    ["Products/Product360/Stock", scope],
    ["Products/Product360/Stock/Projection", scope],
    ["Products/Product360/Stock/Policy", scope]
]
feature("Product360 stock #path renders in #mode through Warehouse-owned contracts", {
    where: paths.flatMap(([path, parameters]) => ["qvt", "html", "tui"].map(mode => ({path, parameters, mode}))),
    expect({path, parameters, mode}) {
        const result = as("catalog.stock.plan", () =>
            ec.screen
                .makeTest()
                .rootScreen("component://mr-boss/screen/Products.xml")
                .renderMode(mode)
                .withStaticData()
                .render(path, Object.assign({lastStandalone: "-2"}, parameters), null)
        )
        if (result.errorMessages.length) log.warn(result.errorMessages.join(" | "))
        result.status == 200
        result.errorMessages.length == 0
        !/Error rendering|Exception in render/.test(result.output)
        !result.output.includes("510.98")
        !result.output.includes("888.77")
    }
})
