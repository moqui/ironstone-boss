const paths = [
    ["Categories", "/qapps/Products/Categories?text=Services%20catalog"],
    ["NewCategory", "/qapps/Products/Categories/NewCategory"],
    ["Features", "/qapps/Products/Features"],
    ["NewFeature", "/qapps/Products/Features/NewFeature"],
    ["Interactions", "/qapps/Products/Features/FeatureInteractions"],
    ["Groups", "/qapps/Products/Features/FeatureGroups"],
    ["NewGroup", "/qapps/Products/Features/FeatureGroups/NewGroup"],
    ...["Summary", "Parents", "Products", "FeatureDefaults", "Identifiers"].map(tab => [
        "Category" + tab,
        "/qapps/Products/Categories/CategoryDetail/" + tab + "?productCategoryId=BOSS_PRD_CAT"
    ]),
    ...["Summary", "Groups", "Products", "Interactions"].map(tab => [
        "Feature" + tab,
        "/qapps/Products/Features/FeatureDetail/" + tab + "?productFeatureId=BOSS_PRD_FEATURE"
    ]),
    ...["Summary", "Features", "Categories"].map(tab => [
        "Group" + tab,
        "/qapps/Products/Features/FeatureGroups/FeatureGroupDetail/" + tab + "?productFeatureGroupId=BOSS_PRD_GROUP"
    ]),
    ["ProductTags", "/qapps/Products/Products/Product360/Summary?productId=BOSS_PRD_OWN"],
    ["TagFind", "/qapps/Products/Products?tagIds=BOSS_PRD_TAG"]
]
const cases = []
for (const width of [390, 1280, 1440])
    for (const dark of [false, true]) for (const [name, path] of paths) cases.push({width, dark, name, path})
let pages = {}
spec({
    setupSpec() {
        for (const width of [390, 1280, 1440]) {
            pages[width] = browser.newPage({user: "john.doe", viewport: {width, height: 900}, timeout: 30})
            pages[width].allowProblems(/userPhoto\?userId=/)
        }
    }
})
feature("taxonomy #name at #width dark=#dark", {
    where: cases,
    expect({width, dark, name, path}) {
        const page = pages[width]
        page.goto(path).status == 200
        page.waitFor(() => document.querySelector(".q-page")?.innerText.trim().length > 20)
        page.settle()
        page.evaluate(dark => {
            document.querySelector("#apps-root").__vue_app__.config.globalProperties.$q.dark.set(!!dark)
            return true
        }, dark) == true
        page.waitFor(dark => document.body.classList.contains("body--dark") === !!dark, {arg: dark})
        !/Error rendering|Exception in render/.test(page.text())
        if (name === "Categories") page.locator("[data-tree-key]").count() >= 2
        if (["Categories", "Features", "Groups"].includes(name)) !page.text().includes("No results found")
        if (name === "ProductTags") page.text().includes("Ready for review")
        if (name === "TagFind") page.text().includes("Services catalog sample")
        page.screenshot("Taxonomy-" + name + "-" + width + (dark ? "-dark" : "-light"), {fullPage: true})
    }
})
