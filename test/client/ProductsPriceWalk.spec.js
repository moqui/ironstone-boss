// A row's action: the price row is the one whose History link names its productPriceId. An inline action is a button of
// the row; a More action opens the row's menu first.
function rowAction(page, id, label, inMenu) {
    page.evaluate(
        ([id, label, inMenu]) => {
            const row = Array.from(document.querySelectorAll(".tr")).find(r =>
                r.querySelector('a[href*="productPriceId=' + id + '"]')
            )
            const buttons = Array.from(row.querySelectorAll("button"))
            const button = inMenu
                ? buttons.find(b => b.innerText.includes("more_vert"))
                : buttons.find(b => b.innerText.trim().endsWith(label))
            button.click()
            return true
        },
        [id, label, inMenu]
    ) == true
    if (inMenu) {
        page.waitFor(
            label =>
                Array.from(document.querySelectorAll(".q-menu .q-item, .q-menu button")).some(i =>
                    i.innerText.trim().endsWith(label)
                ),
            {arg: label}
        )
        page.evaluate(label => {
            Array.from(document.querySelectorAll(".q-menu .q-item, .q-menu button"))
                .find(i => i.innerText.trim().endsWith(label))
                .click()
            return true
        }, label) == true
    }
}
feature("a price editor creates, corrects, schedules, reviews bulk changes and ends an interval", {
    expect() {
        const page = browser.newPage({user: "catalog.price.edit", viewport: {width: 1280, height: 1000}, timeout: 30})
        page.allowProblems(/userPhoto\?userId=/)
        const next = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
        page.goto("/qapps/Products/Prices?productId=BOSS_PRD_OWN").status == 200
        page.getByRole("button", {name: "New sales price", exact: true}).click()
        let dialog = page.getByRole("dialog")
        dialog.locator("input[name=price]").fill("21")
        dialog.locator("input[name=minQuantity]").fill("5")
        dialog.locator("input[name=changeReason]").fill("Browser new tier")
        dialog.getByRole("button", {name: "Create price", exact: true}).click()
        page.waitFor(() => !document.querySelector("[role=dialog]"))
        // the new tier: the row with a 21 price for 5 or more, and its ID from its History link
        page.waitFor(() =>
            Array.from(document.querySelectorAll(".tr")).some(
                r => /\b21(\.0+)?\b/.test(r.innerText) && r.querySelector('a[href*="productPriceId="]')
            )
        )
        const id = page.evaluate(() => {
            const row = Array.from(document.querySelectorAll(".tr")).find(
                r =>
                    /\b21(\.0+)?\b/.test(r.innerText) &&
                    /\b5(\.0+)?\b/.test(r.innerText) &&
                    r.querySelector('a[href*="productPriceId="]')
            )
            return new URL(row.querySelector('a[href*="productPriceId="]').href).searchParams.get("productPriceId")
        })
        rowAction(page, id, "Correct", false)
        dialog = page.getByRole("dialog")
        dialog.locator("input[name=price]").fill("23")
        dialog.locator("input[name=changeReason]").fill("Browser corrected offer")
        dialog.getByRole("button", {name: "Save correction", exact: true}).click()
        page.waitFor(() => !document.querySelector("[role=dialog]"))
        rowAction(page, id, "Schedule", false)
        dialog = page.getByRole("dialog")
        dialog.locator("input[name=price]").fill("24")
        dialog.locator("input[name=effectiveDate]").fill(next + " 12:00")
        dialog.locator("input[name=changeReason]").fill("Browser scheduled successor")
        dialog.getByRole("button", {name: "Schedule change", exact: true}).click()
        page.waitFor(() => !document.querySelector("[role=dialog]"))
        page.goto(
            "/qapps/Products/Prices/PriceHistory?productId=BOSS_PRD_OWN&productPriceId=" +
                id +
                "&organizationPartyId=ORG_ZIZI_SERVICES"
        )
        page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Browser scheduled successor"))
        page.text().includes("Browser corrected offer")
        page.screenshot("Prices-correction-and-successor-history", {fullPage: true})
        page.goto("/qapps/Products/Products/BulkPrice?productPriceIds=BOSS_PRICE_SALES&organizationPartyId=ORG_ZIZI_SERVICES")
        page.fill("input[name=fixedPrice]", "17")
        page.fill("input[name=effectiveDate]", next + " 14:00")
        page.fill("input[name=changeReason]", "Browser reviewed change")
        page.locator("#BulkPriceSetup").getByRole("button", {name: "Preview price changes", exact: true}).click()
        page.waitForURL(/operationKey=/)
        page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("ready"))
        page.screenshot("Prices-reviewed-bulk-preview", {fullPage: true})
        page.getByRole("checkbox", {name: "I reviewed these rows and their proposed amounts", exact: true}).click()
        page.getByRole("button", {name: "Apply reviewed changes", exact: true}).click()
        page.waitFor(
            () =>
                document.querySelector(".q-page")?.innerText.includes("Successor row") &&
                document.querySelector(".q-page").innerText.includes("created")
        )
        page.screenshot("Prices-reviewed-bulk-results", {fullPage: true})
        page.goto("/qapps/Products/Prices?productId=BOSS_PRD_OWN")
        page.evaluate(() => {
            window.confirm = () => true
            return true
        }) == true
        rowAction(page, id, "End", false)
        dialog = page.getByRole("dialog")
        dialog.locator("input[name=changeReason]").fill("Browser ended interval")
        dialog.getByRole("button", {name: "End price", exact: true}).click()
        page.waitFor(() => !document.querySelector("[role=dialog]"))
        page.goto(
            "/qapps/Products/Prices/PriceHistory?productId=BOSS_PRD_OWN&productPriceId=" +
                id +
                "&organizationPartyId=ORG_ZIZI_SERVICES"
        )
        page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Browser ended interval"))
        page.screenshot("Prices-ended-interval-audit", {fullPage: true})
    }
})
feature("a price editor selects products on the Products list and opens their price change review", {
    expect() {
        const page = browser.newPage({user: "catalog.price.edit", viewport: {width: 1280, height: 1000}, timeout: 30})
        page.allowProblems(/userPhoto\?userId=/)
        page.goto("/qapps/Products/Products?text=BOSS_PRD_OWN").status == 200
        // check the product's row, then open the row actions menu in the list head
        page.waitFor(() =>
            Array.from(document.querySelectorAll(".tr")).some(
                r => r.innerText.includes("BOSS_PRD_OWN") && r.querySelector("[role=checkbox]")
            )
        )
        page.evaluate(() => {
            Array.from(document.querySelectorAll(".tr"))
                .find(r => r.innerText.includes("BOSS_PRD_OWN") && r.querySelector("[role=checkbox]"))
                .querySelector("[role=checkbox]")
                .click()
            return true
        }) == true
        page.waitFor(() =>
            Array.from(document.querySelectorAll(".tr")).some(
                r => r.innerText.includes("BOSS_PRD_OWN") && r.querySelector("[role=checkbox][aria-checked=true]")
            )
        )
        page.evaluate(() => {
            Array.from(document.querySelectorAll(".q-page button"))
                .find(b => b.innerText.includes("more_vert"))
                .click()
            return true
        }) == true
        page.waitFor(() =>
            Array.from(document.querySelectorAll(".q-menu .q-item, .q-menu button")).some(i =>
                i.innerText.trim().endsWith("Prices")
            )
        )
        page.evaluate(() => {
            Array.from(document.querySelectorAll(".q-menu .q-item, .q-menu button"))
                .find(i => i.innerText.trim().endsWith("Prices"))
                .click()
            return true
        }) == true
        page.getByRole("dialog").getByRole("button", {name: "Review price changes", exact: true}).click()
        page.waitFor(
            () =>
                location.pathname.endsWith("/BulkPrice") &&
                document.querySelector(".q-page")?.innerText.includes("Selected products")
        )
        page.screenshot("Prices-bulk-from-selection", {fullPage: true})
        // the selection is a read-only field of the setup form
        page.evaluate(() => document.querySelector("#BulkPriceSetup").innerHTML.includes("BOSS_PRD_OWN")) == true
    }
})
