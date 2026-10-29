const paths = [
    ["Builder", "/qapps/Products/Products/VariantBuilder?productId=BOSS_PRD_VIRT"],
    ["CombinationList", "/qapps/Products/Products/VariantBuilderTui?productId=BOSS_PRD_VIRT"],
    ["VariantSettings", "/qapps/Products/Settings/VariantSettings?organizationPartyId=ORG_ZIZI_SERVICES"],
    ["VirtualProductFeatures", "/qapps/Products/Products/Product360/Features?productId=BOSS_PRD_VIRT"]
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
feature("variants #name at #width dark=#dark", {
    where: cases,
    expect({name, path, width, dark}) {
        const page = pages[width]
        page.goto(path).status == 200
        page.waitFor(() => document.querySelector(".q-page")?.innerText.trim().length > 20)
        if (name === "Builder") page.waitFor(() => document.querySelector("[data-feature-key]"))
        page.settle()
        page.evaluate(dark => {
            document.querySelector("#apps-root").__vue_app__.config.globalProperties.$q.dark.set(!!dark)
            return true
        }, dark) == true
        page.waitFor(dark => document.body.classList.contains("body--dark") === !!dark, {arg: dark})
        !/Error rendering|Exception in render/.test(page.text())
        if (name === "Builder") {
            page.text().includes("4 combinations")
            if (width === 390) page.locator("[data-variant-list]").count() == 1
            else page.locator("[data-variant-matrix]").count() == 1
        }
        if (name === "CombinationList") page.text().includes("BOSS_VAR_BLUE")
        if (name === "VirtualProductFeatures") page.text().includes("Build variants")
        page.screenshot("Variants-" + name + "-" + width + (dark ? "-dark" : "-light"), {fullPage: true})
    }
})
