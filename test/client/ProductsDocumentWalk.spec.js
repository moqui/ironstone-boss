feature("two editors retain a conflict draft, then a source edit flags the saved translation for review", {
    expect() {
        const a = browser.newPage({user: "catalog.edit", viewport: {width: 1280, height: 1100}, timeout: 30}),
            b = browser.newPage({user: "catalog.edit", viewport: {width: 1280, height: 1100}, timeout: 30})
        for (const p of [a, b]) p.allowProblems(/userPhoto\?userId=/)
        a.goto("/qapps/Products/Documents?productId=BOSS_PRD_OWN").status == 200
        a.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Catalog documents"))
        a.getByRole("button", {name: "Add document or text", exact: true}).click()
        let dialog = a.getByRole("dialog")
        dialog.getByLabel("Product content type", {exact: true}).click()
        a.getByRole("option", {name: "Product Name", exact: true}).click()
        dialog.locator("textarea[name=contentText]").fill("Browser content source")
        dialog.getByRole("button", {name: "Save document", exact: true}).click()
        a.waitFor(() => !document.querySelector("[role=dialog]"))
        a.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Product Name"))
        const id = a.evaluate(() => new URL(window.location.href).searchParams.get("contentId"))
        !!id
        const url = "/qapps/Products/DocumentDetail?productId=BOSS_PRD_OWN&productContentId=" + id
        a.goto(url).status == 200
        b.goto(url).status == 200
        for (const p of [a, b]) {
            p.getByRole("button", {name: "Edit document", exact: true}).click()
            p.waitFor(() => !!document.querySelector("#ProductContentMetadata textarea[name=contentText]"))
        }
        a.fill("#ProductContentMetadata textarea[name=contentText]", "Browser winning source")
        a.locator("#ProductContentMetadata").getByRole("button", {name: "Save document", exact: true}).click()
        a.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Browser winning source"))
        b.fill("#ProductContentMetadata textarea[name=contentText]", "Browser concurrent draft")
        b.locator("#ProductContentMetadata").getByRole("button", {name: "Save document", exact: true}).click()
        b.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Concurrent edit drafts"))
        b.text().includes("Browser winning source")
        a.goto("/qapps/Products/Translations?productId=BOSS_PRD_OWN&sourceLocale=en&targetLocale=es").status == 200
        a.getByRole("button", {name: "Translate BOSS_PRD_OWN: Product Name", exact: true}).click()
        dialog = a.getByRole("dialog")
        dialog.locator("textarea[name=targetText]").fill("Nombre del navegador")
        dialog.getByLabel("Reviewed against this source", {exact: true}).click()
        a.getByRole("option", {name: "Yes", exact: true}).click()
        dialog.getByRole("button", {name: "Save translation", exact: true}).click()
        a.waitFor(() => !document.querySelector("[role=dialog]"))
        a.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Reviewed"))
        a.goto(url).status == 200
        a.getByRole("button", {name: "Edit document", exact: true}).click()
        a.waitFor(() => !!document.querySelector("#ProductContentMetadata textarea[name=contentText]"))
        a.fill("#ProductContentMetadata textarea[name=contentText]", "Browser changed source")
        a.locator("#ProductContentMetadata").getByRole("button", {name: "Save document", exact: true}).click()
        a.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Browser changed source"))
        a.goto("/qapps/Products/Translations?productId=BOSS_PRD_OWN&sourceLocale=en&targetLocale=es").status == 200
        a.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Needs review"))
        a.text().includes("Nombre del navegador")
    }
})
feature("the guarded product datasheet opens as HTML and prints to PDF without a search document", {
    expect() {
        const p = browser.newPage({user: "catalog.reader", timeout: 30})
        p.goto("/apps/Products/DocumentDetail/datasheet?productId=BOSS_PRD_OWN").status == 200
        p.text().includes("Services catalog sample")
        const pdf = p.pdf("Product-datasheet")
        pdf.magic == "%PDF"
        pdf.size > 1000
    }
})
