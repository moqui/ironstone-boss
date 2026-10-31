// A header More action: open the menu of the method header (or the routing's), then choose the item.
function menuAction(page, label, actions = ".m-method-actions") {
    page.evaluate(actions => {
        Array.from(document.querySelectorAll(actions + " button"))
            .find(b => b.innerText.includes("More"))
            .click()
        return true
    }, actions) == true
    page.waitFor(
        label =>
            Array.from(document.querySelectorAll(".q-menu .q-item, .q-menu button")).some(i =>
                i.innerText.trim().endsWith(label)
            ),
        {arg: label}
    )
    // the item's own button (a dialog's or a link's), not the menu row around it
    page.evaluate(label => {
        const hit = i => i.innerText.trim().endsWith(label)
        ;(
            Array.from(document.querySelectorAll(".q-menu button, .q-menu a")).find(hit) ||
            Array.from(document.querySelectorAll(".q-menu .q-item")).find(hit)
        ).click()
        return true
    }, label) == true
}
feature("a method engineer imports legacy material, releases a routing and method and compares dated changes in Products", {
    expect() {
        const page = browser.newPage({user: "catalog.method.walk", viewport: {width: 1280, height: 1100}, timeout: 30})
        page.allowProblems(/userPhoto\?userId=/)
        page.goto("/qapps/Products/Products/Product360/BOM?productId=DEMO_3_1").status == 200
        page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Compare dates"))
        menuAction(page, "Import legacy components")
        const imp = page.locator("#ImportLegacyBom")
        imp.getByLabel("Legacy quantity unit", {exact: true}).click()
        page.getByRole("option", {name: "Each/Piece", exact: true}).click()
        imp.locator("input[name=changeReason]").fill("Browser legacy method import")
        imp.getByRole("button", {name: "Import legacy manufacturing components", exact: true}).click()
        page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Demo Sub Assembly One"))
        page.getByRole("tab", {name: "Routing", exact: true}).click()
        page.getByRole("button", {name: "New routing", exact: true}).click()
        page.fill("#NewRouting input[name=workEffortName]", "Browser method routing")
        page.fill("#NewRouting input[name=changeReason]", "Browser routing draft")
        page.locator("#NewRouting").getByRole("button", {name: "Save routing draft", exact: true}).click()
        page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Released operations"))
        menuAction(page, "Configure work center", ".m-routing-actions")
        page.locator("#WorkCenter").getByLabel("Facility", {exact: true}).click()
        page.getByRole("option", {name: "Ziziwork Retail Warehouse", exact: true}).click()
        page.fill("#WorkCenter input[name=efficiencyPercent]", "95")
        page.fill("#WorkCenter input[name=changeReason]", "Browser center configuration")
        page.locator("#WorkCenter").getByRole("button", {name: "Save work center", exact: true}).click()
        page.settle()
        menuAction(page, "Add hourly rate", ".m-routing-actions")
        const rate = page.locator("#WorkCenterRate")
        rate.getByLabel("Work center", {exact: true}).click()
        page.getByRole("option", {name: "Ziziwork Retail Warehouse", exact: true}).click()
        rate.getByLabel("Component", {exact: true}).click()
        page.getByRole("option", {name: "Labor", exact: true}).click()
        rate.locator("input[name=rateAmount]").fill("35")
        rate.getByLabel("Approve this dated rate", {exact: true}).click()
        rate.locator("input[name=changeReason]").fill("Browser hourly rate approval")
        rate.getByRole("button", {name: "Save hourly rate", exact: true}).click()
        page.settle()
        page.getByRole("button", {name: "Add operation", exact: true}).click()
        page.fill("#RoutingOperation input[name=workEffortName]", "Browser assembly step")
        page.fill("#RoutingOperation input[name=estimatedSetupTime]", "0.25")
        page.fill("#RoutingOperation input[name=estimatedWorkTime]", "0.1")
        page.fill("#RoutingOperation input[name=methodBatchQuantity]", "1")
        page.locator("#RoutingOperation").getByLabel("Work center", {exact: true}).click()
        page.getByRole("option", {name: "Ziziwork Retail Warehouse", exact: true}).click()
        page.fill("#RoutingOperation input[name=changeReason]", "Browser standards")
        page.locator("#RoutingOperation").getByRole("button", {name: "Save operation draft", exact: true}).click()
        page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Browser assembly step"))
        page.getByRole("button", {name: "Approve routing", exact: true}).click()
        page.fill("#RoutingRelease input[name=changeReason]", "Browser routing approval")
        page.locator("#RoutingRelease").getByRole("button", {name: "Release routing", exact: true}).click()
        page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Stage standards"))
        page.getByRole("tab", {name: "Method", exact: true}).click()
        menuAction(page, "Edit method draft")
        page.locator("#BomHeader").getByLabel("Routing", {exact: true}).click()
        page.getByRole("option", {name: "Browser method routing", exact: true}).click()
        page.fill("#BomHeader input[name=changeReason]", "Browser method routing selection")
        page.locator("#BomHeader").getByRole("button", {name: "Save method draft", exact: true}).click()
        page.getByRole("button", {name: "Approve method", exact: true}).click()
        page.fill("#BomRelease input[name=changeReason]", "Browser first method approval")
        page.locator("#BomRelease").getByRole("button", {name: "Release method", exact: true}).click()
        page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Browser first method approval"))
        page.getByRole("tab", {name: "Explosion", exact: true}).click()
        page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("DEMO_RM_1"))
        page.getByRole("tab", {name: "Method", exact: true}).click()
        // the link reloads with the line selected and opens its component dialog
        page.getByRole("link", {name: "Stage change", exact: true}).first().click()
        page.waitFor(() => !!document.querySelector("#BomItem input[name=quantity]"))
        page.fill("#BomItem input[name=quantity]", "3")
        page.fill("#BomItem input[name=changeReason]", "Browser revised component")
        page.locator("#BomItem").getByRole("button", {name: "Save component draft", exact: true}).click()
        page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Edit draft"))
        page.getByRole("button", {name: "Approve method", exact: true}).click()
        page.fill("#BomRelease input[name=changeReason]", "Browser second method approval")
        page.locator("#BomRelease").getByRole("button", {name: "Release method", exact: true}).click()
        page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Browser second method approval"))
        page.getByRole("tab", {name: "Compare dates", exact: true}).click()
        page.text().includes("Compare method dates")
        page.text().includes("Changed")
    }
})
