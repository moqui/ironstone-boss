feature("a GL operator creates balanced lines, reviews and posts a journal", {
    expect() {
        const page = browser.newPage({
            user: "finance.gl",
            viewport: { width: 1280, height: 900 },
            timeout: 30,
        })
        page.allowProblems(/userPhoto\?userId=/)
        page.goto(
            "/qapps/Accounting/QuickCreate/NewEntry?organizationPartyId=ORG_ZIZI_CORP",
        ).status == 200
        page.fill(
            "input[name=description]",
            "Browser Accounting journal " + Date.now(),
        )
        page.getByRole("button", { name: "Create draft", exact: true }).click()
        page.waitForURL(/JournalEntryDetail/)
        for (const side of ["Debit", "Credit"]) {
            page.getByRole("button", { name: "Add line", exact: true }).click()
            const dialog = page.getByRole("dialog")
            dialog.getByLabel("Account", { exact: true }).click()
            page.getByRole("option", { name: /111100/ })
                .first()
                .click()
            dialog.getByLabel("Side", { exact: true }).click()
            page.getByRole("option", { name: side, exact: true }).click()
            dialog.locator("input[name=amount]").fill("25")
            dialog
                .getByRole("button", { name: "Add line", exact: true })
                .click()
            page.waitFor(() => !document.querySelector("[role=dialog]"))
        }
        page.text().includes("Difference 0")
        page.getByRole("button", {
            name: "Review posting",
            exact: true,
        }).click()
        page.waitFor(() =>
            document
                .querySelector(".q-page")
                ?.innerText.includes("Posting preview"),
        )
        page.text().includes("Posting preview")
        page.fill("input[name=changeReason]", "Browser reviewed posting")
        page.evaluate(() => {
            window.confirm = () => true
            return true
        }) == true
        page.getByRole("button", {
            name: "Post reviewed entry",
            exact: true,
        }).click()
        page.waitFor(() =>
            document
                .querySelector(".m-record-status")
                ?.innerText.includes("Posted"),
        )
        page.screenshot("Accounting-ledger-posted", { fullPage: true })
        page.getByRole("button", { name: "Reverse entry", exact: true }).click()
        const reversal = page.getByRole("dialog")
        reversal.locator("input[name=reversalDate]").fill("2026-10-30 12:00")
        reversal
            .locator("input[name=changeReason]")
            .fill("Browser dated reversal")
        reversal
            .getByRole("button", { name: "Reverse entry", exact: true })
            .click()
        page.waitFor(() =>
            document
                .querySelector(".q-page")
                ?.innerText.includes("Open linked reversal"),
        )
        page.screenshot("Accounting-ledger-reversed", { fullPage: true })
    },
})
