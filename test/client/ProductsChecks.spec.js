// the check evidence at phone width is in ProductsPhone
feature("a reader opens Home readiness and retries one issue without changing catalog records", {
    expect() {
        const p = browser.newPage({user: "catalog.reader", viewport: {width: 1280, height: 1100}, timeout: 30})
        p.allowProblems(/userPhoto\?userId=/)
        p.goto("/qapps/Products/Home").status == 200
        p.text().includes("Incomplete")
        p.goto(
            "/qapps/Products/CatalogChecks?runChecks=true&productIds=BOSS_CHK_EMPTY,BOSS_CHK_DUP_A,BOSS_PRD_PACK&checkIds=requiredFields,identifiers,legacyPacks"
        ).status == 200
        p.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Required field is empty"))
        p.text().includes("already assigned")
        p.goto("/qapps/Products/CatalogChecks?runChecks=true&productIds=BOSS_CHK_DUP_A&checkIds=identifiers").status == 200
        p.getByRole("link", {name: "Retry check", exact: true}).first().click()
        p.waitFor(() => document.querySelector(".q-page")?.innerText.includes("1 products checked"))
        p.text().includes("already assigned")
    }
})
