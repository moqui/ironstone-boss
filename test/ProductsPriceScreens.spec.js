const root = "component://mr-boss/screen/Products.xml"
const screens = [
    ["Prices/List", {productId: "BOSS_PRD_OWN"}],
    ["Prices/PriceHistory", {productId: "BOSS_PRD_OWN"}],
    ["Products/BulkPrice", {productIds: "BOSS_PRD_OWN"}],
    ["Products/Product360/Prices", {productId: "BOSS_PRD_OWN"}]
]
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
feature("pricing #path renders directly in #mode", {
    where: screens.flatMap(([path, parameters]) => ["qvt", "html", "tui"].map(mode => ({path, parameters, mode}))),
    expect({path, parameters, mode}) {
        const got = ec.screen
            .makeTest()
            .rootScreen(root)
            .renderMode(mode)
            .withStaticData()
            .render(path, Object.assign({lastStandalone: "-2"}, parameters), null)
        if (got.errorMessages.length || /Error rendering|Exception in render/.test(got.output))
            log.warn(path + " " + mode + ": " + got.errorMessages.join(" | ") + " " + got.output.substring(0, 2000))
        got.status == 200
        got.errorMessages.length == 0
        got.output.length > 100
        !/Error rendering|Exception in render/.test(got.output)
    }
})
