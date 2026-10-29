const source = "/qapps/Products/Prices?productId=BOSS_PRD_OWN"
const paths = [
    ["Prices", source],
    ["PriceHistory", "/qapps/Products/Prices/PriceHistory?productId=BOSS_PRD_OWN&organizationPartyId=ORG_ZIZI_SERVICES"],
    ["BulkPrice", "/qapps/Products/Products/BulkPrice?productPriceIds=BOSS_PRICE_SALES&organizationPartyId=ORG_ZIZI_SERVICES"],
    ["ProductPrices", "/qapps/Products/Products/Product360/Prices?productId=BOSS_PRD_OWN"],
    ["NewSalesPrice", source],
    ["SchedulePrice", source],
    ["EndPrice", source]
]
const cases = paths.flatMap(([name, path]) =>
    [390, 1280, 1440].flatMap(width => [false, true].map(dark => ({name, path, width, dark})))
)
let pages = {}
spec({
    setupSpec() {
        for (const width of [390, 1280, 1440]) {
            pages[width] = browser.newPage({user: "john.doe", viewport: {width, height: 1000}, timeout: 30})
            pages[width].allowProblems(/userPhoto\?userId=/)
        }
    }
})
feature("prices #name at #width dark=#dark", {
    where: cases,
    expect({name, path, width, dark}) {
        const page = pages[width]
        page.goto(path).status == 200
        page.waitFor(() => document.querySelector(".q-page")?.innerText.trim().length > 20)
        page.settle()
        page.evaluate(dark => {
            document.querySelector("#apps-root").__vue_app__.config.globalProperties.$q.dark.set(!!dark)
            return true
        }, dark) == true
        page.waitFor(dark => document.body.classList.contains("body--dark") === !!dark, {arg: dark})
        if (name === "NewSalesPrice") page.getByRole("button", {name: "New sales price", exact: true}).click()
        if (name === "SchedulePrice") page.getByRole("button", {name: "Schedule BOSS_PRICE_SALES", exact: true}).click()
        if (name === "EndPrice") page.getByRole("button", {name: "End BOSS_PRICE_SALES", exact: true}).click()
        page.settle()
        page.waitFor(() =>
            document
                .getAnimations()
                .filter(a => a.effect?.getTiming().iterations !== Infinity)
                .every(a => a.playState !== "running")
        )
        !/Error rendering|Exception in render/.test(page.text())
        page.screenshot("Prices-" + name + "-" + width + (dark ? "-dark" : "-light"), {fullPage: true})
    }
})
