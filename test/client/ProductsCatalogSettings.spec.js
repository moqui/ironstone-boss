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
    }
})
