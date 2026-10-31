feature("a Products price reader resolves a dated selection and downloads matching HTML, PDF and CSV", {
    expect() {
        const page = browser.newPage({user: "catalog.price.read", viewport: {width: 1280, height: 1000}, timeout: 30})
        page.allowProblems(/userPhoto\?userId=/)
        page.goto("/qapps/Products/Prices/PriceLists/PriceListDetail?priceListId=BOSS_PRICE_LIST").status == 200
        page.locator("#EffectivePriceScope input[name=quantity]").fill("2")
        page.locator("#EffectivePriceScope textarea[name=productIds]").fill("BOSS_PRD_OWN,BOSS_PRD_OTHER")
        page.locator("#EffectivePriceScope").getByRole("button", {name: "Resolve prices", exact: true}).click()
        page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("1 product"))
        page.text().includes("13.5")
        !page.text().includes("Retail catalog sample")
        const htmlUrl = page.getByRole("link", {name: "Print resolved prices", exact: true}).attribute("href"),
            pdfUrl = page.getByRole("link", {name: "Download resolved prices PDF", exact: true}).attribute("href"),
            s = session({user: "catalog.price.read"})
        const html = s.get(htmlUrl),
            pdf = s.get(pdfUrl)
        html.status == 200
        html.contentType.includes("text/html")
        html.text.includes("BOSS_PRD_OWN")
        html.text.includes("13.5")
        !html.text.includes("BOSS_PRD_OTHER")
        pdf.status == 200
        pdf.contentType.includes("application/pdf")
        pdf.magic == "%PDF"
        html.save("Effective-price-list.html")
        pdf.save("Effective-price-list.pdf")
        const csv = s.get("/apps/Products/Prices/PriceLists/PriceListDetail.csv", {
            params: {priceListId: "BOSS_PRICE_LIST", productIds: "BOSS_PRD_OWN,BOSS_PRD_OTHER", quantity: 2}
        })
        csv.status == 200
        csv.contentType.includes("csv")
        csv.text.includes("BOSS_PRD_OWN")
        !csv.text.includes("BOSS_PRD_OTHER")
        csv.text.includes("13.5")
    }
})
feature("a Products price reader downloads the matching xlsx", {
    requires: ["xlsx"],
    expect() {
        const s = session({user: "catalog.price.read"})
        const xlsx = s.get("/apps/Products/Prices/PriceLists/PriceListDetail.xlsx", {
            params: {priceListId: "BOSS_PRICE_LIST", productIds: "BOSS_PRD_OWN,BOSS_PRD_OTHER", quantity: 2}
        })
        xlsx.status == 200
        ;/^(PK|504b0304)/.test(xlsx.magic)
        xlsx.save("Effective-price-list.xlsx")
    }
})
feature("Products alone refuses other launchers and restricted raw outputs while retaining its scoped exports", {
    expect() {
        const s = session({user: "catalog.reader"})
        for (const app of ["Accounting", "Warehouse", "Manufacturing", "Purchasing"]) {
            const r = s.get("/apps/" + app)
            r.status == 403
        }
        const catalog = s.get("/apps/Products/Products/List.csv", {params: {text: "catalog sample"}})
        catalog.status == 200
        catalog.text.includes("BOSS_PRD_OWN")
        !catalog.text.includes("BOSS_PRD_OTHER")
        const report = s.get("/apps/Products/Prices/PriceLists/PriceListDetail/effectiveOutput", {
            params: {priceListId: "BOSS_PRICE_LIST", productIds: "BOSS_PRD_OWN", outputFormat: "pdf"}
        })
        report.status >= 400 || !report.contentType.includes("application/pdf")
        const foreign = s.get("/apps/Products/Products/Product360/Summary", {params: {productId: "BOSS_PRD_OTHER"}})
        !foreign.text.includes("Retail catalog sample")
    }
})
