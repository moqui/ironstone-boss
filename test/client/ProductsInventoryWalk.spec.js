feature("a stock planner opens the Stock tab and saves stock levels and a dated lot exception without Warehouse", {
    expect() {
        const page = browser.newPage({user: "catalog.stock.plan", viewport: {width: 1280, height: 1100}, timeout: 30})
        page.allowProblems(/userPhoto\?userId=/)
        page.goto("/qapps/Products/Products/Product360?productId=BOSS_PRD_OWN").status == 200
        page.getByRole("tab", {name: "Stock", exact: true}).click()
        page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Current inventory"))
        !page.text().includes("991")
        !page.text().includes("510.98")
        page.goto("/qapps/Products/Products/Product360/Stock/Policy?productId=BOSS_PRD_OWN&facilityId=BOSS_PRD_WH").status == 200
        page.waitFor(() => !!document.querySelector("#FacilityStockPolicy"))
        page.fill("#FacilityStockPolicy input[name=minimumStock]", "9")
        page.fill("#FacilityStockPolicy input[name=maximumStock]", "30")
        page.fill("#FacilityStockPolicy input[name=reorderQuantity]", "14")
        page.fill("#FacilityStockPolicy input[name=changeReason]", "Browser stock planner review")
        page.locator("#FacilityStockPolicy").getByRole("button", {name: "Save stock policy", exact: true}).click()
        page.waitFor(() => document.querySelector("#FacilityStockPolicy input[name=minimumStock]")?.value === "9")
        const tracking = page.locator("#ProductTrackingPolicy")
        tracking.getByLabel("Lot required", {exact: true}).click()
        page.getByRole("option", {name: "Yes", exact: true}).click()
        tracking.locator("input[name=shelfLifeDays]").fill("30")
        tracking.locator("input[name=changeReason]").fill("Browser lot exception")
        tracking.getByRole("button", {name: "Save dated tracking policy", exact: true}).click()
        page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Browser lot exception"))
        page.text().includes("Effective sources at this facility")
        page.screenshot("Inventory-planner-policy-history", {fullPage: true})
    }
})
feature("a catalog editor reads stock policy without its write actions", {
    expect() {
        const page = browser.newPage({user: "catalog.catalog.edit", viewport: {width: 1280, height: 1100}, timeout: 30})
        page.allowProblems(/userPhoto\?userId=/)
        page.goto("/qapps/Products/Products/Product360/Stock/Policy?productId=BOSS_PRD_OWN&facilityId=BOSS_PRD_WH").status == 200
        page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Product tracking policy"))
        !page.text().includes("Save stock policy")
        !page.text().includes("Save dated tracking policy")
        page.text().includes("Browser lot exception")
        page.screenshot("Inventory-catalog-editor-readonly", {fullPage: true})
    }
})
