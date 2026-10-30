// An effective scoped price list prints without its editing controls: john.doe can edit BOSS_PRICE_LIST, so its html
// render has them, and its html-print render has its rules and none of them.
const controls = ["Publish reviewed list", "End price list", "Print effective list", "RuleSuccessor"]
function render(mode) {
    return ec.screen
        .makeTest()
        .rootScreen("component://mr-boss/screen/Products.xml")
        .renderMode(mode)
        .withStaticData()
        .render("Prices/PriceLists/PriceListDetail", {lastStandalone: "-2", priceListId: "BOSS_PRICE_LIST"}, null)
}
spec({
    setupSpec() {
        login("john.doe")
    },
    cleanup() {
        ec.message.clearErrors()
    }
})
feature("an effective scoped price list prints without its editing controls", {
    when() {
        return {html: render("html"), print: render("html-print")}
    },
    then({html, print}) {
        html.status == 200
        controls.filter(c => html.output.includes(c)) == controls
        print.status == 200
        print.errorMessages.length == 0
        !/Error rendering|Exception in render/.test(print.output)
        print.output.includes("Services catalog policy")
        print.output.includes("BOSS_PRD_OWN")
        controls.filter(c => print.output.includes(c)) == []
    }
})
