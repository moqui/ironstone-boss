let pages = {}
spec({
    setupSpec() {
        for (const width of [390, 1280, 1440]) {
            pages[width] = browser.newPage({user: "catalog.reader", viewport: {width, height: 1100}, timeout: 30})
            pages[width].allowProblems(/userPhoto\?userId=/)
        }
    }
})
feature("catalog check evidence at #width dark=#dark", {
    where: [390, 1280, 1440].flatMap(width => [false, true].map(dark => ({width, dark}))),
    expect({width, dark}) {
        const p = pages[width]
        p.goto(
            "/qapps/Products/CatalogChecks?runChecks=true&productIds=BOSS_CHK_EMPTY,BOSS_CHK_DUP_A,BOSS_PRD_PACK&checkIds=requiredFields,identifiers,legacyPacks"
        ).status == 200
        p.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Required field is empty"))
        p.text().includes("already assigned")
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
        p.evaluate(() => document.documentElement.scrollWidth <= innerWidth) == true
        p.screenshot("Catalog-checks-" + width + (dark ? "-dark" : "-light"), {fullPage: true})
    }
})
feature("a reader opens Home readiness and retries one issue without changing catalog records", {
    expect() {
        const p = pages[1280]
        p.goto("/qapps/Products/Home").status == 200
        p.text().includes("Incomplete")
        p.goto("/qapps/Products/CatalogChecks?runChecks=true&productIds=BOSS_CHK_DUP_A&checkIds=identifiers").status == 200
        p.getByRole("link", {name: "Retry check", exact: true}).first().click()
        p.waitFor(() => document.querySelector(".q-page")?.innerText.includes("1 products checked"))
        p.text().includes("already assigned")
    }
})
