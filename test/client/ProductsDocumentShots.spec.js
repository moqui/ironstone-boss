let pages = {}
spec({
    setupSpec() {
        for (const width of [390, 1280, 1440]) {
            pages[width] = browser.newPage({user: "catalog.catalog.edit", viewport: {width, height: 1100}, timeout: 30})
            pages[width].allowProblems(/userPhoto\?userId=/)
        }
    }
})
feature("documents #kind at #width dark=#dark", {
    where: ["list", "cards", "detail", "translations", "category"].flatMap(kind =>
        [390, 1280, 1440].flatMap(width => [false, true].map(dark => ({kind, width, dark})))
    ),
    expect({kind, width, dark}) {
        const p = pages[width],
            path = {
                list: "Documents?productId=BOSS_PRD_OWN",
                cards: "Documents?productId=BOSS_PRD_OWN&view=cards",
                detail: "DocumentDetail?productId=BOSS_PRD_OWN&productContentId=BOSS_CONTENT_SAMPLE",
                translations: "Translations?productId=BOSS_PRD_OWN",
                category: "Categories/CategoryDetail/Content?productCategoryId=BOSS_PRD_CAT"
            }[kind]
        p.goto("/qapps/Products/" + path).status == 200
        p.waitFor(() => !!document.querySelector(".q-page"))
        p.settle()
        p.evaluate(dark => {
            document.querySelector("#apps-root").__vue_app__.config.globalProperties.$q.dark.set(!!dark)
            return true
        }, dark) == true
        p.waitFor(dark => document.body.classList.contains("body--dark") === !!dark, {arg: dark})
        p.waitFor(() =>
            document
                .getAnimations()
                .filter(a => a.effect?.getTiming().iterations !== Infinity)
                .every(a => a.playState !== "running")
        )
        !/Error rendering|Exception in render/.test(p.text())
        p.screenshot("Documents-" + kind + "-" + width + (dark ? "-dark" : "-light"), {fullPage: true})
    }
})
