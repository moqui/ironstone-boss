let pages = {}
spec({
    setupSpec() {
        for (const width of [390, 1280, 1440]) {
            pages[width] = browser.newPage({user: "catalog.reader", viewport: {width, height: 1100}, timeout: 30})
            pages[width].allowProblems(/userPhoto\?userId=/)
            pages["admin" + width] = browser.newPage({user: "catalog.admin", viewport: {width, height: 1100}, timeout: 30})
            pages["admin" + width].allowProblems(/userPhoto\?userId=/)
        }
    }
})
feature("catalog tools #kind at #width dark=#dark", {
    where: ["units", "packaging", "labels", "identifiers"].flatMap(kind =>
        [390, 1280, 1440].flatMap(width => [false, true].map(dark => ({kind, width, dark})))
    ),
    expect({kind, width, dark}) {
        const p = pages[(kind === "identifiers" ? "admin" : "") + width],
            path = {
                units: "Units/Index?text=kilogram&uomId=WT_kg&toUomId=WT_g",
                packaging: "Units/Packaging?baseProductId=BOSS_PRD_OWN&scanId=BOSS_PACK_12",
                labels: "Units/Labels?operationKey=BOSS_LABEL_SAMPLE",
                identifiers: "Settings/IdentificationTypes?organizationPartyId=ORG_ZIZI_SERVICES"
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
        p.screenshot("Tools-" + kind + "-" + width + (dark ? "-dark" : "-light"), {fullPage: true})
    }
})
feature("label guidance and controls fit the phone width", {
    expect() {
        const p = pages[390]
        p.goto("/qapps/Products/Units/Labels?operationKey=BOSS_LABEL_SAMPLE").status == 200
        p.evaluate(() => document.documentElement.scrollWidth <= innerWidth) == true
    }
})
