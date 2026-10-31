// What changes at phone width: the Products pages built for 390 px fit it without scrolling sideways, and the variant
// builder shows its list there in place of the matrix. Then the price dialogs open from their pages at 1280.
const priceRow = (page, label) =>
    page.evaluate(label => {
        const row = Array.from(document.querySelectorAll(".tr")).find(r =>
            r.querySelector('a[href*="productPriceId=BOSS_PRICE_SALES"]')
        )
        const button = row && Array.from(row.querySelectorAll("button")).find(b => b.innerText.trim().endsWith(label))
        if (!button) return false
        button.click()
        return true
    }, label)
const button = name => page => page.getByRole("button", {name, exact: true}).click()
// a case names its dialog by index: the table keeps the functions
const dialogs = [
    {name: "New sales price", path: "/qapps/Products/Prices?productId=BOSS_PRD_OWN", open: button("New sales price")},
    {name: "Schedule price", path: "/qapps/Products/Prices?productId=BOSS_PRD_OWN", open: page => priceRow(page, "Schedule")},
    {name: "End price", path: "/qapps/Products/Prices?productId=BOSS_PRD_OWN", open: page => priceRow(page, "End")},
    {name: "New price list", path: "/qapps/Products/Prices/PriceLists", open: button("New price list")},
    {
        name: "New rule",
        path: "/qapps/Products/Prices/PriceLists/PriceListDetail?priceListId=BOSS_PRICE_LIST",
        open: button("New rule")
    }
]
// one page per user and width, signed in once before the cases
let pages = {}
const pageFor = (user, width) => pages[user + ":" + width]
spec({
    setupSpec() {
        for (const [user, width] of [
            ["catalog.reader", 390],
            ["catalog.edit", 390],
            ["john.doe", 390],
            ["john.doe", 1280]
        ]) {
            pages[user + ":" + width] = browser.newPage({user, viewport: {width, height: 1000}, timeout: 30})
            // the demo accounts have no photo; the shell falls back to their initials
            pages[user + ":" + width].allowProblems(/userPhoto\?userId=/)
        }
    }
})
feature("Products #name fits 390 px", {
    where: [
        {name: "labels", user: "catalog.reader", path: "/qapps/Products/Units/Labels?operationKey=BOSS_LABEL_SAMPLE", wait: ""},
        {
            name: "catalog checks",
            user: "catalog.reader",
            path: "/qapps/Products/CatalogChecks?runChecks=true&productIds=BOSS_CHK_EMPTY,BOSS_CHK_DUP_A,BOSS_PRD_PACK&checkIds=requiredFields,identifiers,legacyPacks",
            wait: "Required field is empty"
        },
        {
            name: "import",
            user: "catalog.edit",
            path: "/qapps/Products/ProductImport?operationKey=BOSS_IMPORT_SAMPLE_RUN",
            wait: "Product name is required"
        }
    ],
    expect({user, path, wait}) {
        const page = pageFor(user, 390)
        page.goto(path).status == 200
        page.waitFor(text => (document.querySelector(".q-page")?.innerText.trim() ?? "").length > 20 &&
            document.querySelector(".q-page").innerText.includes(text), {arg: wait})
        page.settle()
        !/Error rendering|Exception in render/.test(page.text())
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth) == true
    }
})
feature("the variant builder is a list at 390 px", {
    expect() {
        const page = pageFor("john.doe", 390)
        page.goto("/qapps/Products/Products/VariantBuilder?productId=BOSS_PRD_VIRT").status == 200
        page.waitFor(() => !!document.querySelector("[data-feature-key]"))
        page.settle()
        page.text().includes("Choose combinations · 4")
        page.locator("[data-variant-list]").count() == 1
        page.locator("[data-variant-matrix]").count() == 0
    }
})
feature("#name opens its dialog", {
    where: dialogs.map(({name}, d) => ({name, d})),
    expect({d}) {
        const page = pageFor("john.doe", 1280)
        page.goto(dialogs[d].path).status == 200
        page.waitFor(() => (document.querySelector(".q-page")?.innerText.trim() ?? "").length > 20)
        page.settle()
        dialogs[d].open(page) == true
        page.getByRole("dialog").waitFor()
        !/Error rendering|Exception in render/.test(page.text())
        page.press("Escape")
        page.getByRole("dialog").waitFor({state: "hidden"})
    }
})
