feature(
    "a finance administrator saves due terms, dated rates and document preferences",
    {
        expect() {
            const page = browser.newPage({
                user: "finance.admin",
                viewport: { width: 1280, height: 900 },
                timeout: 30,
            })
            page.allowProblems(/userPhoto\?userId=/)
            page.allowProblems(
                /Blocked script execution in 'about:srcdoc'.*sandboxed/,
            )
            const go = (path) =>
                page.goto(
                    "/qapps/Accounting/Settings/" +
                        path +
                        "?organizationPartyId=ORG_ZIZI_CORP",
                )
            page.goto(
                "/qapps/Accounting/GeneralLedger/ChartOfAccounts?organizationPartyId=ORG_ZIZI_CORP",
            ).status == 200
            page.getByRole("button", {
                name: "Assign existing account",
                exact: true,
            }).click()
            let assignment = page.getByRole("dialog")
            assignment
                .getByLabel("Existing chart account", { exact: true })
                .click()
            assignment
                .getByLabel("Existing chart account", { exact: true })
                .fill("909900001")
            page.getByRole("option", { name: /909900001/ })
                .first()
                .click()
            assignment
                .locator("input[name=changeReason]")
                .fill("Browser purchase account assignment")
            assignment
                .getByRole("button", { name: "Assign account", exact: true })
                .click()
            page.waitForURL(/AccountDetail/)
            go("PostingDefaults").status == 200
            page.getByRole("button", {
                name: "Add posting mapping",
                exact: true,
            }).click()
            let mapping = page.getByRole("dialog")
            mapping.getByLabel("Mapping kind", { exact: true }).click()
            page.getByRole("option", { name: "item", exact: true }).click()
            mapping.getByLabel("Item type", { exact: true }).click()
            mapping
                .getByLabel("Item type", { exact: true })
                .fill("Accounting service")
            page.getByRole("option", {
                name: "Accounting service item",
                exact: true,
            }).click()
            mapping.getByLabel("Direction", { exact: true }).click()
            page.getByRole("option", { name: "Incoming", exact: true }).click()
            mapping.getByLabel("Posting account", { exact: true }).click()
            mapping
                .getByLabel("Posting account", { exact: true })
                .fill("909900001")
            page.getByRole("option", { name: /909900001/ })
                .first()
                .click()
            mapping
                .locator("input[name=changeReason]")
                .fill("Browser missing item mapping repair")
            mapping
                .getByRole("button", { name: "Save mapping", exact: true })
                .click()
            page.waitFor(() => !document.querySelector("[role=dialog]"))
            go("PaymentTerms").status == 200
            page.getByRole("button", {
                name: "New due term",
                exact: true,
            }).click()
            let dialog = page.getByRole("dialog")
            dialog.locator("input[name=description]").fill("Browser net 37")
            dialog.locator("input[name=termValue]").fill("37")
            dialog.getByLabel("Time unit", { exact: true }).click()
            page.getByRole("option", { name: /Day/ }).first().click()
            dialog
                .locator("input[name=changeReason]")
                .fill("Browser finance settings review")
            dialog
                .getByRole("button", { name: "Save due term", exact: true })
                .click()
            page.waitFor(() =>
                document
                    .querySelector(".q-page")
                    ?.innerText.includes("Browser net 37"),
            )
            go("Currencies").status == 200
            page.getByRole("button", {
                name: "Import rate CSV",
                exact: true,
            }).click()
            dialog = page.getByRole("dialog")
            dialog
                .locator("textarea[name=csvText]")
                .fill(
                    "uomId,toUomId,fromDate,conversionFactor,rateSource\nUSD,EUR,2026-10-29T00:00:00Z,0.92,Browser review\nUSD,EUR,2026-10-30T00:00:00Z,-1,Malformed review\n",
                )
            dialog
                .locator("input[name=changeReason]")
                .fill("Browser rate import review")
            dialog
                .getByRole("button", { name: "Import rate rows", exact: true })
                .click()
            page.waitFor(() =>
                document
                    .querySelector(".q-page")
                    ?.innerText.includes("Browser review"),
            )
            page.text().includes("positive")
            assert.ok(/\d{4}-\d{2}-\d{2}/.test(page.text()))
            page.screenshot("Accounting-settings-rates", { fullPage: true })
            go("DocumentSettings").status == 200
            page.fill("input[name=invoiceIdPrefix]", "BROWSER-")
            page.fill(
                "input[name=changeReason]",
                "Browser numbering preferences",
            )
            page.getByRole("button", {
                name: "Save document defaults",
                exact: true,
            }).click()
            page.waitFor(
                () =>
                    document.querySelector("input[name=invoiceIdPrefix]")
                        ?.value === "BROWSER-",
            )
            page.screenshot("Accounting-settings-documents", { fullPage: true })
        },
    },
)
