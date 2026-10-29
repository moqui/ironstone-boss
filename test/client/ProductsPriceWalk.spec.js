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
        page.waitFor(() => Array.from(document.querySelectorAll("button")).some(b => /Correct\s+\d+/.test(b.innerText)))
        const id = page.evaluate(
            () =>
                Array.from(document.querySelectorAll("button"))
                    .map(b => b.innerText.match(/Correct\s+(\d+)/))
                    .find(Boolean)[1]
        )
        page.getByRole("button", {name: "Correct " + id, exact: true}).click()
        dialog = page.getByRole("dialog")
        dialog.locator("input[name=price]").fill("23")
        dialog.locator("input[name=changeReason]").fill("Browser corrected offer")
        dialog.getByRole("button", {name: "Save correction", exact: true}).click()
        page.waitFor(() => !document.querySelector("[role=dialog]"))
        page.getByRole("button", {name: "Schedule " + id, exact: true}).click()
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
        page.getByRole("button", {name: "End " + id, exact: true}).click()
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
