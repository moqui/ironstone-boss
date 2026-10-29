feature("an editor moves one category edge, retains the other parent and manages a feature group", {
    expect() {
        const page = browser.newPage({user: "catalog.catalog.edit", viewport: {width: 1280, height: 1000}, timeout: 30})
        page.allowProblems(/userPhoto\?userId=/)
        const stamp = Date.now(),
            destination = "P3_BROWSER_C_" + stamp
        page.goto("/qapps/Products/Categories/NewCategory").status == 200
        page.fill("input[name=productCategoryId]", destination)
        page.fill("input[name=categoryName]", "Browser destination")
        page.locator("#NewCategory").getByRole("button", {name: "Create", exact: true}).click()
        page.waitForURL(/CategoryDetail/)
        page.goto("/qapps/Products/Categories/CategoryDetail/Parents?productCategoryId=BOSS_PRD_CAT")
        page.getByRole("button", {name: "Move from BOSS_PRD_PARENT_A", exact: true}).click()
        const dialog = page.getByRole("dialog")
        dialog.getByLabel("New parent", {exact: true}).click()
        page.getByRole("option", {name: "Browser destination", exact: true}).click()
        dialog.getByRole("button", {name: "Move selected edge", exact: true}).click()
        page.waitFor(() => !document.querySelector("[role=dialog]"))
        page.text().includes("BOSS_PRD_PARENT_B")
        page.text().includes(destination)
        page.goto("/qapps/Products/Categories?text=Services%20catalog")
        page.waitFor(
            destination => {
                const paths = Array.from(document.querySelectorAll("[data-tree-key]"))
                    .map(row => JSON.parse(decodeURIComponent(row.dataset.treeKey)))
                    .filter(parts => parts[parts.length - 1][0] === "BOSS_PRD_CAT")
                return (
                    paths.length === 2 &&
                    paths.some(parts => parts[parts.length - 2][0] === "BOSS_PRD_PARENT_B") &&
                    paths.some(parts => parts[parts.length - 2][0] === destination)
                )
            },
            {arg: destination}
        )
        page.evaluate(() => {
            window.confirm = text => {
                window.taxonomyConfirmation = text
                return false
            }
            return true
        }) == true
        const childKey = page.evaluate(
            () =>
                Array.from(document.querySelectorAll("[data-tree-key]")).find(row => {
                    const p = JSON.parse(decodeURIComponent(row.dataset.treeKey))
                    return p.length > 1 && p[p.length - 1][0] === "BOSS_PRD_CAT" && p[p.length - 2][0] === "BOSS_PRD_PARENT_B"
                }).dataset.treeKey
        )
        page.locator('[data-tree-key="' + childKey + '"]').focus()
        page.keyboard.press("Shift+Tab")
        page.waitFor(() => !!window.taxonomyConfirmation)
        page.evaluate(
            () => window.taxonomyConfirmation.includes("Industries") && window.taxonomyConfirmation.includes("Services catalog")
        ) == true
        page.screenshot("Taxonomy-multi-parent-after-move", {fullPage: true})
        const featureId = "P3_BROWSER_F_" + stamp
        page.goto("/qapps/Products/Features/NewFeature")
        page.fill("input[name=productFeatureId]", featureId)
        page.fill("input[name=description]", "Browser finish")
        page.locator("#NewFeature").getByRole("button", {name: "Create", exact: true}).click()
        page.waitForURL(/FeatureDetail/)
        const groupId = "P3_BROWSER_G_" + stamp
        page.goto("/qapps/Products/Features/FeatureGroups/NewGroup")
        page.fill("input[name=productFeatureGroupId]", groupId)
        page.fill("input[name=description]", "Browser group")
        page.locator("#NewFeatureGroup").getByRole("button", {name: "Create", exact: true}).click()
        page.waitForURL(/FeatureGroupDetail/)
        page.goto("/qapps/Products/Features/FeatureGroups/FeatureGroupDetail/Features?productFeatureGroupId=" + groupId)
        page.getByRole("button", {name: "Add", exact: true}).click()
        const groupDialog = page.getByRole("dialog")
        groupDialog.getByLabel("Feature", {exact: true}).click()
        page.getByRole("option", {name: "Browser finish", exact: true}).click()
        groupDialog.getByRole("button", {name: "Save", exact: true}).click()
        page.waitFor(() => !document.querySelector("[role=dialog]"))
        page.text().includes(featureId)
        page.screenshot("Taxonomy-feature-group-completed", {fullPage: true})
    }
})
