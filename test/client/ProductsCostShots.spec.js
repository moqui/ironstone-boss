let pages = {}
spec({
    setupSpec() {
        for (const width of [390, 1280, 1440]) {
            pages[width] = browser.newPage({user: "catalog.cost.estimate", viewport: {width, height: 1100}, timeout: 30})
            pages[width].allowProblems(/userPhoto\?userId=/)
        }
    }
})
feature("cost #tab at #width dark=#dark", {
    where: ["StandardCosts", "CostRollup", "CostHistory"].flatMap(tab =>
        [390, 1280, 1440].flatMap(width => [false, true].map(dark => ({tab, width, dark})))
    ),
    expect({tab, width, dark}) {
        const page = pages[width]
        page.goto("/qapps/Products/Prices/" + tab + "?productId=BOSS_PRD_OWN&productStandardCostId=BOSS_COST_SAMPLE").status ==
            200
        page.waitFor(text => document.querySelector(".q-page")?.innerText.includes(text), {
            arg: {StandardCosts: "Standard costs", CostRollup: "Cost roll-up", CostHistory: "Cost history"}[tab]
        })
        page.settle()
        page.evaluate(dark => {
            document.querySelector("#apps-root").__vue_app__.config.globalProperties.$q.dark.set(!!dark)
            return true
        }, dark) == true
        page.waitFor(dark => document.body.classList.contains("body--dark") === !!dark, {arg: dark})
        page.waitFor(() =>
            document
                .getAnimations()
                .filter(a => a.effect?.getTiming().iterations !== Infinity)
                .every(a => a.playState !== "running")
        )
        !/Error rendering|Exception in render/.test(page.text())
        page.screenshot("Cost-" + tab + "-" + width + (dark ? "-dark" : "-light"), {fullPage: true})
    }
})
