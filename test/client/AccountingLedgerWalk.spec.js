feature("a GL operator creates balanced lines, reviews and posts a journal", {
    expect() {
        const page = browser.newPage({
            user: "finance.gl",
            viewport: {width: 1280, height: 900},
            timeout: 30
        })
        page.allowProblems(/userPhoto\?userId=/)
        page.goto("/qapps/Accounting/QuickCreate/NewEntry?organizationPartyId=ORG_ZIZI_CORP").status == 200
        page.fill("input[name=description]", "Browser Accounting journal " + Date.now())
        page.getByRole("button", {name: "Create draft entry", exact: true}).click()
        page.waitForURL(/JournalEntryDetail/)
        // the header's More menu holds the draft's actions; click the item's own button, not the menu row around it
        const headerAction = label => {
            page.evaluate(() => {
                Array.from(document.querySelectorAll(".m-record-actions button"))
                    .find(button => button.innerText.includes("More"))
                    .click()
                return true
            }) == true
            page.waitFor(
                label => Array.from(document.querySelectorAll(".q-menu button")).some(b => b.innerText.trim().endsWith(label)),
                {arg: label}
            )
            page.evaluate(label => {
                Array.from(document.querySelectorAll(".q-menu button"))
                    .find(b => b.innerText.trim().endsWith(label))
                    .click()
                return true
            }, label) == true
        }
        // a Quasar radio in the open dialog, by its label
        const chooseRadio = label =>
            page.evaluate(label => {
                Array.from(document.querySelectorAll(".q-dialog .q-radio"))
                    .find(radio => radio.innerText.trim() == label)
                    .click()
                return true
            }, label) == true
        for (const side of ["Debit", "Credit"]) {
            headerAction("Add line")
            const dialog = page.getByRole("dialog")
            dialog.getByLabel("Account", {exact: true}).click()
            page.getByRole("option", {name: /111100/})
                .first()
                .click()
            chooseRadio(side)
            dialog.locator("input[name=amount]").fill("25")
            dialog.getByRole("button", {name: "Add line", exact: true}).click()
            page.waitFor(() => !document.querySelector("[role=dialog]"))
        }
        ;/Difference \D*0(\.00)?\b/.test(page.text())
        page.getByRole("button", {
            name: "Review posting",
            exact: true
        }).click()
        page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Posting review"))
        page.text().includes("Posting review")
        page.fill("input[name=changeReason]", "Browser reviewed posting")
        page.evaluate(() => {
            window.confirm = () => true
            return true
        }) == true
        page.getByRole("button", {
            name: "Post reviewed entry",
            exact: true
        }).click()
        page.waitFor(() => document.querySelector(".m-record-status")?.innerText.includes("Posted"))
        page.screenshot("Accounting-ledger-posted", {fullPage: true})
        headerAction("Reverse entry")
        const reversal = page.getByRole("dialog")
        // tomorrow, in the runner's zone, which is the demo user's
        const tomorrow = new Date(Date.now() + 86400000)
        const two = value => String(value).padStart(2, "0")
        const reversalDate =
            tomorrow.getFullYear() + "-" + two(tomorrow.getMonth() + 1) + "-" + two(tomorrow.getDate()) + " 12:00"
        reversal.locator("input[name=reversalDate]").fill(reversalDate)
        reversal.locator("input[name=changeReason]").fill("Browser dated reversal")
        reversal.getByRole("button", {name: "Reverse entry", exact: true}).click()
        page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Reversed by"))
        page.screenshot("Accounting-ledger-reversed", {fullPage: true})
    }
})
