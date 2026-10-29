let pages = {}
spec({
    setupSpec() {
        for (const width of [390, 1280, 1440]) {
            pages[width] = browser.newPage({user: "catalog.catalog.edit", viewport: {width, height: 1100}, timeout: 30})
            pages[width].allowProblems(/userPhoto\?userId=/)
        }
    }
})
feature("catalog import at #width dark=#dark", {
    where: [390, 1280, 1440].flatMap(width => [false, true].map(dark => ({width, dark}))),
    expect({width, dark}) {
        const p = pages[width]
        p.goto("/qapps/Products/ProductImport?operationKey=BOSS_IMPORT_SAMPLE_RUN").status == 200
        p.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Product name is required"))
        p.evaluate(dark => {
            document.querySelector("#apps-root").__vue_app__.config.globalProperties.$q.dark.set(!!dark)
            return true
        }, dark) == true
        p.waitFor(dark => document.body.classList.contains("body--dark") === !!dark, {arg: dark})
        p.settle()
        p.waitFor(() =>
            document
                .getAnimations()
                .filter(a => a.effect?.getTiming().iterations !== Infinity)
                .every(a => a.playState !== "running")
        )
        !/Error rendering|Exception in render/.test(p.text())
        p.evaluate(() => document.documentElement.scrollWidth <= innerWidth) == true
        p.screenshot("Catalog-import-" + width + (dark ? "-dark" : "-light"), {fullPage: true})
    }
})
