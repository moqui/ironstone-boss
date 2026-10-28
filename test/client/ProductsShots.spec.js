// Browser QA of every Products foundation screen, including mobile and both themes.
const rows = []
for (const width of [390, 1280, 1440]) for (const dark of [false, true])
    for (const [name, path] of [["Home", "/qapps/Products/Home"],
        ["Products", "/qapps/Products/Products?text=catalog%20sample"],
        ["Product360", "/qapps/Products/Products/Product360?productId=BOSS_PRD_OWN"],
        ["CategoryDetail", "/qapps/Products/Categories/CategoryDetail?productCategoryId=BOSS_PRD_CAT"],
        ["Categories", "/qapps/Products/Categories"], ["Features", "/qapps/Products/Features"],
        ["Prices", "/qapps/Products/Prices"], ["SupplierPrices", "/qapps/Products/SupplierPrices"],
        ["Documents", "/qapps/Products/Documents"], ["Units", "/qapps/Products/Units"], ["Settings", "/qapps/Products/Settings"]])
        rows.push({name, path, width, dark})
let pages = {}
spec({setupSpec() {
    login("john.doe", "moqui")
    for (const width of [390, 1280, 1440]) {
        pages[width] = browser.newPage({user: "john.doe", password: "moqui", viewport: {width, height: 900}, timeout: 30})
        // The demo account has no photo; the shell correctly falls back to its initials.
        pages[width].allowProblems(/userPhoto\?userId=/)
    }
}})
feature("Products #name at #width dark=#dark", {
    where: rows,
    expect({name, path, width, dark}) {
        const page = pages[width]
        page.goto(path).status == 200
        page.waitFor(() => {
            const box = document.querySelector(".q-page")
            return !!(box && box.innerText.trim().length > 20 && !document.querySelector(".q-loading-bar--visible, .q-inner-loading")
                && !(window.moqui && window.moqui.webrootVue && window.moqui.webrootVue.loading))
        })
        page.settle()
        page.evaluate(dark => {
            const app = document.querySelector("#apps-root").__vue_app__
            app.config.globalProperties.$q.dark.set(!!dark)
            return true
        }, dark) == true
        page.waitFor(dark => document.body.classList.contains("body--dark") === !!dark, {arg: dark})
        !/Error rendering|Exception in render|is not written yet/.test(page.text())
        if (name === "Product360") page.text().includes("Services catalog sample")
        if (name === "CategoryDetail") page.text().includes("Services catalog")
        page.screenshot("Products-" + name + "-" + width + (dark ? "-dark" : "-light"), {fullPage: true})
    },
})
