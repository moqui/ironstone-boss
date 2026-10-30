feature(
    "an estimator reviews and saves a roll-up, a separate approver freezes it, and Accounting posts the reviewed value change",
    {
        expect() {
            const estimator = browser.newPage({user: "catalog.cost.estimate", viewport: {width: 1280, height: 1100}, timeout: 30})
            estimator.allowProblems(/userPhoto\?userId=/)
            estimator.goto("/qapps/Products/Prices/CostRollup?productId=BOSS_PRD_PACK").status == 200
            estimator.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Cost roll-up"))
            estimator.locator("#CostRollupInputs").getByLabel("Method basis", {exact: true}).click()
            estimator.getByRole("option", {name: "Purchased item — no method", exact: true}).click()
            estimator.fill("#CostRollupInputs input[name=quantity]", "10")
            estimator.locator("#CostRollupInputs").getByRole("button", {name: "Preview estimate", exact: true}).click()
            estimator.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Complete estimate"))
            estimator.fill("#CostRollupSave textarea[name=changeReason]", "Browser reviewed pack estimate")
            estimator.locator("#CostRollupSave").getByRole("button", {name: "Save reviewed draft", exact: true}).click()
            estimator.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Browser reviewed pack estimate"))
            const id = estimator.evaluate(() => new URL(window.location.href).searchParams.get("productStandardCostId"))
            !!id
            const approver = browser.newPage({user: "catalog.cost.approve", viewport: {width: 1280, height: 1100}, timeout: 30})
            approver.allowProblems(/userPhoto\?userId=/)
            approver.goto("/qapps/Products/Prices/StandardCosts?productId=BOSS_PRD_PACK&productStandardCostId=" + id).status ==
                200
            approver.getByRole("button", {name: "Approve estimate", exact: true}).click()
            approver.fill("#ApproveStandardCost textarea[name=changeReason]", "Browser independently approved estimate")
            approver.locator("#ApproveStandardCost").getByRole("button", {name: "Approve estimate", exact: true}).click()
            approver.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Approved PDF"))
            const finance = browser.newPage({user: "catalog.cost.gl", viewport: {width: 1280, height: 1100}, timeout: 30})
            finance.allowProblems(/userPhoto\?userId=/)
            finance.goto("/qapps/Products/InventoryValuation?productId=BOSS_PRD_PACK&productStandardCostId=" + id).status == 200
            finance.getByRole("button", {name: "Preview revaluation", exact: true}).click()
            finance.fill("#ValuationAdjustment textarea[name=changeReason]", "Browser reviewed inventory adjustment")
            finance.locator("#ValuationAdjustment").getByRole("button", {name: "Preview owned inventory", exact: true}).click()
            finance.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Reviewed inputs are complete."))
            finance.getByRole("button", {name: "Post reviewed revaluation", exact: true}).click()
            finance.locator("#PostRevaluation").getByRole("button", {name: "Confirm and post", exact: true}).click()
            finance.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Posted accounting transaction"))
        }
    }
)
