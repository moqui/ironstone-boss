feature("an administrator saves catalog policy and sees the effective dates and reason", {
    expect() {
        const page = browser.newPage({user: "catalog.admin", viewport: {width: 1280, height: 1100}, timeout: 30})
        page.allowProblems(/userPhoto\?userId=/)
        page.goto("/qapps/Products/Settings/Index?organizationPartyId=ORG_ZIZI_SERVICES").status == 200
        page.waitFor(() => !!document.querySelector("#CatalogSettings"))
        page.fill("#CatalogSettings input[name=changeReason]", "Browser dated catalog policy")
        page.fill("#CatalogSettings input[name=requiredFields]", "productName,productTypeEnumId,amountUomId")
        page.locator("#CatalogSettings").getByRole("button", {name: "Save", exact: true}).click()
        page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Browser dated catalog policy"))
        !page.text().includes("Revision ")
        page.screenshot("Catalog-policy-saved-history", {fullPage: true})
    }
})
feature("dated catalog settings at #width dark=#dark", {
    where: [390, 1280, 1440].flatMap(width => [false, true].map(dark => ({width, dark}))),
    expect({width, dark}) {
        const page = browser.newPage({user: "catalog.admin", viewport: {width, height: 1100}, timeout: 30})
        page.allowProblems(/userPhoto\?userId=/)
        page.goto("/qapps/Products/Settings/Index?organizationPartyId=ORG_ZIZI_SERVICES").status == 200
        page.waitFor(() => !!document.querySelector("#CatalogSettings"))
        page.evaluate(dark => {
            document.querySelector("#apps-root").__vue_app__.config.globalProperties.$q.dark.set(!!dark)
            return true
        }, dark) == true
        page.waitFor(dark => document.body.classList.contains("body--dark") === !!dark, {arg: dark})
        page.settle()
        page.waitFor(() =>
            document
                .getAnimations()
                .filter(a => a.effect?.getTiming().iterations !== Infinity)
                .every(a => a.playState !== "running")
        )
        !/Error rendering|Exception in render/.test(page.text())
        page.screenshot("Catalog-policy-" + width + (dark ? "-dark" : "-light"), {fullPage: true})
    }
})
