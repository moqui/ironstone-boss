feature("an editor generates one choice, retries it, resumes a durable batch and uses the XML twin", {
    expect() {
        const page = browser.newPage({user: "catalog.catalog.edit", viewport: {width: 1280, height: 1000}, timeout: 30})
        page.allowProblems(/userPhoto\?userId=/)
        page.goto("/qapps/Products/Products/VariantBuilder?productId=BOSS_PRD_VIRT").status == 200
        page.waitFor(() => document.querySelectorAll("[data-feature-key]").length === 4)
        page.getByRole("checkbox", {name: "BOSS_PRD_VIRT_BL_L", exact: true}).click()
        page.getByRole("button", {name: "Generate selected", exact: true}).click()
        page.waitFor(() => document.querySelector("[role=status]")?.textContent.includes("1 created"))
        page.text().includes("Existing: BOSS_PRD_VIRT_BL_L")
        page.getByRole("button", {name: "Generate selected", exact: true}).click()
        page.waitFor(() => document.querySelector("[role=status]")?.textContent.includes("1 existing"))
        page.getByRole("button", {name: "Select allowed on page", exact: true}).click()
        page.getByRole("button", {name: "Queue selected", exact: true}).click()
        page.waitFor(() => document.querySelector("input[name=operationKey]")?.value.startsWith("variants-"))
        const key = page.evaluate(() => document.querySelector("input[name=operationKey]").value)
        page.text().includes("4 pending")
        page.screenshot("Variants-selected-and-queued", {fullPage: true})
        page.goto("/qapps/Products/Products/VariantBuilder?productId=BOSS_PRD_VIRT")
        page.waitFor(() => !!document.querySelector("[data-feature-key]"))
        page.fill("input[name=operationKey]", key)
        page.getByRole("button", {name: "Load operation", exact: true}).click()
        page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("4 pending"))
        page.getByRole("button", {name: "Process next batch", exact: true}).click()
        page.waitFor(() => document.querySelector("[role=status]")?.textContent.includes("3 created"))
        page.text().includes("1 existing")
        page.screenshot("Variants-operation-complete", {fullPage: true})
        page.goto("/qapps/Products/Products/VariantBuilderTui?productId=BOSS_PRD_VIRT")
        page.waitFor(() => !!document.querySelector("#GenerateSelection"))
        const form = page.locator("#GenerateSelection")
        form.locator("textarea[name=selectedFeatureSetsJson]").fill(JSON.stringify([["BOSS_VAR_RED", "BOSS_VAR_SMALL"]]))
        form.getByRole("button", {name: "Generate feature sets", exact: true}).click()
        page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("existing"))
        page.text().includes("BOSS_PRD_VIRT_RD_S")
        page.screenshot("Variants-xml-twin-results", {fullPage: true})
    }
})
feature("an administrator saves an effective-dated variant policy and sees its history", {
    expect() {
        const page = browser.newPage({user: "catalog.admin", viewport: {width: 1280, height: 900}, timeout: 30})
        page.allowProblems(/userPhoto\?userId=/)
        page.goto("/qapps/Products/Settings/VariantSettings?organizationPartyId=ORG_ZIZI_SERVICES").status == 200
        page.waitFor(() => !!document.querySelector("input[name=batchLimit]"))
        page.evaluate(() => document.querySelector("input[name=batchLimit]").value) === "1000"
        page.fill("input[name=batchLimit]", "100")
        page.fill("input[name=changeReason]", "Browser variant policy validation")
        page.locator("#VariantPolicy").getByRole("button", {name: "Save policy", exact: true}).click()
        page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Browser variant policy validation"))
        page.evaluate(() => document.querySelector("input[name=batchLimit]").value) === "100"
        page.screenshot("Variants-policy-history", {fullPage: true})
    }
})
