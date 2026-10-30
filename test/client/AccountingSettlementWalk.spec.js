const settlementRoute = "/qapps/Accounting/Receivables/ReceivablesWorkbench"
const settlementCustomer = "BOSS_ACCT_STL_CUSTOMER"
function settlementPage(user = "finance.ar", width = 1280) {
    const page = browser.newPage({user, viewport: {width, height: 1000}, timeout: 30})
    page.allowProblems(/userPhoto\?userId=/)
    return page
}
function closeSettlementOptions(page) {
    page.settle()
    if (
        page.evaluate(() =>
            Array.from(document.querySelectorAll(".q-menu")).some(
                menu => menu.getClientRects().length && getComputedStyle(menu).visibility !== "hidden"
            )
        )
    )
        page.keyboard.press("Escape")
    page.waitFor(
        () =>
            !Array.from(document.querySelectorAll(".q-menu")).some(
                menu => menu.getClientRects().length && getComputedStyle(menu).visibility !== "hidden"
            )
    )
    page.settle()
}
function openSettlement(page) {
    page.goto(settlementRoute + "?organizationPartyId=ORG_ZIZI_CORP").status == 200
    page.getByLabel("Customer", {exact: true}).click()
    page.getByLabel("Customer", {exact: true}).fill("Settlement customer")
    page.getByRole("option", {name: "Settlement customer", exact: true}).click()
    closeSettlementOptions(page)
    page.getByRole("button", {name: "Find open items", exact: true}).click()
    page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Available receipts and credits"))
}
function chooseSettlementItem(page, dialog, field, id) {
    dialog.getByLabel(field, {exact: true}).click()
    dialog.getByLabel(field, {exact: true}).fill(id)
    page.getByRole("option", {name: new RegExp(id)})
        .first()
        .click()
    closeSettlementOptions(page)
}
function addAllocation(page, source, target, amount) {
    page.getByRole("button", {name: "Add allocation", exact: true}).click()
    const dialog = page.getByRole("dialog")
    chooseSettlementItem(page, dialog, "Receipt or credit", source)
    chooseSettlementItem(page, dialog, "Invoice or payment", target)
    dialog.locator("input[name=amount]").fill(amount)
    dialog.getByRole("button", {name: "Add allocation", exact: true}).click()
    page.waitFor(() => !document.querySelector("[role=dialog]"))
    page.waitFor(value => document.querySelector('[id^="SettlementAllocations"][id$="_table"]')?.innerText.includes(value), {
        arg: source
    })
}
function previewSettlement(page) {
    page.getByRole("button", {name: "Preview settlement", exact: true}).click()
    page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Reviewed settlement"))
}
function confirmSettlement(page) {
    page.getByRole("checkbox", {
        name: "I reviewed the allocations, adjustments, accounts and settlement date",
        exact: true
    }).click()
    page.evaluate(() => {
        window.confirm = () => true
        return true
    }) == true
    page.getByRole("button", {name: "Confirm settlement", exact: true}).click()
}
function applicationReferences(page) {
    return page.evaluate(() =>
        Array.from(document.querySelectorAll('[id^="SettlementApplicationResults"][id$="_table"] .text-mono'))
            .map(element => element.innerText.trim())
            .filter(Boolean)
    )
}
function confirmationIdentity(page) {
    page.waitFor(() =>
        window.moqui.screenForms.some(
            form => form.fields?.previewId && form.fields?.inputFingerprint && /\/confirmSettlement$/.test(form.action)
        )
    )
    return JSON.parse(
        page.evaluate(() => {
            const form = window.moqui.screenForms.find(
                form => form.fields?.previewId && form.fields?.inputFingerprint && /\/confirmSettlement$/.test(form.action)
            )
            return JSON.stringify({
                previewId: form.fields.previewId,
                inputFingerprint: form.fields.inputFingerprint,
                operationKey: form.fields.operationKey
            })
        })
    )
}
function previewDraftDiagnostics(page) {
    return JSON.parse(
        page.evaluate(() => {
            const form = window.moqui.screenForms.find(form => /\/previewSettlement$/.test(form.action))
            const button = Array.from(document.querySelectorAll('button[type="submit"]')).find(
                button => button.innerText.trim() === "Preview settlement"
            )
            const hidden = button?.closest("form")?.querySelector('input[name="draftJson"]')
            return JSON.stringify({
                formId: form?.$attrs.id,
                formFieldsDraft: form?.fields?.draftJson || null,
                fieldsInitialDraft: form?.fieldsInitial?.draftJson || null,
                hiddenDraft: hidden?.value || null,
                locationDraft: new URL(location.href).searchParams.get("draftJson"),
                visibleAdjustments: document.querySelector('[id^="SettlementAdjustments"][id$="_table"]')?.innerText || ""
            })
        })
    )
}
function rowText(page, table, id) {
    return page.evaluate(
        ({table, id}) =>
            Array.from(document.querySelectorAll('[id^="' + table + '"][id$="_table"] .tr')).find(row =>
                row.innerText.includes(id)
            )?.innerText || "",
        {table, id}
    )
}
function settlementStateShots(url, state) {
    const expected = state === "applied" ? "Settlement applied" : "Reviewed settlement"
    for (const width of [390, 1280, 1440]) {
        for (const dark of [false, true]) {
            const page = settlementPage("finance.ar", width)
            try {
                assert(page.goto(url).status === 200, "The retained settlement must open for its owner")
                page.waitFor(text => document.querySelector(".q-page")?.innerText.includes(text), {arg: expected})
                page.evaluate(dark => {
                    document.querySelector("#apps-root").__vue_app__.config.globalProperties.$q.dark.set(dark)
                    return true
                }, dark) == true
                page.waitFor(dark => document.body.classList.contains("body--dark") === dark, {arg: dark})
                page.settle()
                page.evaluate(async () => {
                    const animations = document
                        .getAnimations()
                        .filter(animation => Number.isFinite(animation.effect?.getComputedTiming().endTime))
                    await Promise.all(animations.map(animation => animation.finished.catch(() => {})))
                    return true
                }) == true
                if (width === 390)
                    log.info(
                        page.evaluate(
                            ({state, dark}) => {
                                const caption = Array.from(document.querySelectorAll(".q-page .text-caption")).find(element =>
                                    element.textContent.includes("Balances were current")
                                )
                                const rect = value =>
                                    value
                                        ? {
                                              left: value.left,
                                              top: value.top,
                                              right: value.right,
                                              bottom: value.bottom,
                                              width: value.width,
                                              height: value.height
                                          }
                                        : null
                                const range = document.createRange()
                                if (caption) range.selectNodeContents(caption)
                                return JSON.stringify({
                                    measurement: "settlement-caption",
                                    state,
                                    theme: dark ? "dark" : "light",
                                    text: caption?.textContent || null,
                                    elementRect: rect(caption?.getBoundingClientRect()),
                                    textRects: caption ? Array.from(range.getClientRects(), rect) : [],
                                    documentClientWidth: document.documentElement.clientWidth,
                                    documentScrollWidth: document.documentElement.scrollWidth,
                                    windowInnerWidth: window.innerWidth
                                })
                            },
                            {state, dark}
                        )
                    )
                assert(
                    !/Error rendering|Exception in render/.test(page.text()),
                    "The retained settlement must render without errors"
                )
                assert(
                    page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
                    "The retained settlement must fit its viewport"
                )
                page.screenshot("Accounting-settlement-" + state + "-" + width + "-" + (dark ? "dark" : "light"), {
                    fullPage: true
                })
            } finally {
                page.close()
            }
        }
    }
}

feature("AR reviews a partial receipt and credit together and retries the saved settlement without another application", {
    expect() {
        const page = settlementPage()
        openSettlement(page)
        addAllocation(page, "BOSS_ACCT_STL_RECEIPT60", "BOSS_ACCT_STL_INV100", "60")
        addAllocation(page, "BOSS_ACCT_STL_CREDIT25", "BOSS_ACCT_STL_INV100", "25")
        page.locator('form[id^="SettlementOpenItemFind"] input[name="text"]').fill("not-a-document-match")
        page.getByRole("button", {name: "Find open items", exact: true}).click()
        page.waitFor(() =>
            document.querySelector('[id^="SettlementAllocations"][id$="_table"]')?.innerText.includes("BOSS_ACCT_STL_CREDIT25")
        )
        rowText(page, "SettlementAllocations", "BOSS_ACCT_STL_RECEIPT60").includes("60.00")
        rowText(page, "SettlementAllocations", "BOSS_ACCT_STL_CREDIT25").includes("25.00")
        page.screenshot("Accounting-settlement-mixed-draft", {fullPage: true})
        previewSettlement(page)
        rowText(page, "ReviewedBalances", "BOSS_ACCT_STL_INV100").includes("100.00")
        rowText(page, "ReviewedBalances", "BOSS_ACCT_STL_INV100").includes("15.00")
        page.text().includes("USD")
        page.text().includes("Settlement date")
        page.getByRole("link", {name: "Back to selection", exact: true}).click()
        page.waitFor(() => !new URL(location.href).searchParams.get("previewId"))
        page.evaluate(() => !new URL(location.href).searchParams.get("operationKey")) == true
        page.waitFor(() =>
            document.querySelector('[id^="SettlementAllocations"][id$="_table"]')?.innerText.includes("BOSS_ACCT_STL_CREDIT25")
        )
        page.evaluate(() => document.querySelector("input[name=text]")?.value) == "not-a-document-match"
        previewSettlement(page)
        const reviewedIdentity = confirmationIdentity(page)
        page.goto(page.url()).status == 200
        JSON.stringify(confirmationIdentity(page)) == JSON.stringify(reviewedIdentity)
        page.screenshot("Accounting-settlement-mixed-review", {fullPage: true})
        settlementStateShots(page.url(), "reviewed")
        confirmSettlement(page)
        page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Settlement applied"))
        const original = applicationReferences(page)
        original.length == 2
        new Set(original).size == 2
        rowText(page, "SettlementRemainingResults", "BOSS_ACCT_STL_INV100").includes("15.00")
        page.screenshot("Accounting-settlement-mixed-applied", {fullPage: true})
        settlementStateShots(page.url(), "applied")
        page.getByRole("button", {name: "Check saved result", exact: true}).click()
        page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Settlement applied"))
        JSON.stringify(applicationReferences(page).sort()) == JSON.stringify(original.sort())
        !page.text().includes("Operation key was used for another request")
    }
})

feature("a receipt splits across two invoices while another stale review retains its original selection and refuses", {
    expect() {
        const page = settlementPage()
        const stale = settlementPage()
        openSettlement(page)
        addAllocation(page, "BOSS_ACCT_STL_RECEIPT70", "BOSS_ACCT_STL_INV40", "40")
        addAllocation(page, "BOSS_ACCT_STL_RECEIPT70", "BOSS_ACCT_STL_SPLIT100", "30")
        previewSettlement(page)
        openSettlement(stale)
        addAllocation(stale, "BOSS_ACCT_STL_RECEIPT70", "BOSS_ACCT_STL_INV40", "1")
        previewSettlement(stale)
        const originalPreview = stale.evaluate(() => new URL(location.href).searchParams.get("previewId"))
        const staleIdentity = confirmationIdentity(stale)
        confirmSettlement(page)
        page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Settlement applied"))
        applicationReferences(page).length == 2
        rowText(page, "SettlementRemainingResults", "BOSS_ACCT_STL_INV40").includes("0.00")
        rowText(page, "SettlementRemainingResults", "BOSS_ACCT_STL_SPLIT100").includes("70.00")
        page.screenshot("Accounting-settlement-split-applied", {fullPage: true})
        stale.allowProblems(/notification: warning.*STALE_PREVIEW/)
        stale.allowProblems(
            /^response: 500 Internal Server Error https?:\/\/[^/]+\/apps\/Accounting\/Receivables\/ReceivablesWorkbench\/confirmSettlement$/
        )
        confirmSettlement(stale)
        stale.waitFor(() => document.body.innerText.includes("STALE_PREVIEW"))
        stale.evaluate(() => new URL(location.href).searchParams.get("previewId")) == originalPreview
        rowText(stale, "ReviewedAllocations", "BOSS_ACCT_STL_RECEIPT70").includes("1.00")
        !stale.text().includes("Settlement applied")
        JSON.stringify(confirmationIdentity(stale)) == JSON.stringify(staleIdentity)
        stale.goto(stale.url()).status == 200
        JSON.stringify(confirmationIdentity(stale)) == JSON.stringify(staleIdentity)
        stale.screenshot("Accounting-settlement-stale-review-retained", {fullPage: true})
        stale.getByRole("link", {name: "Back to selection", exact: true}).click()
        stale.waitFor(() => !new URL(location.href).searchParams.get("previewId"))
        stale.evaluate(() => !new URL(location.href).searchParams.get("operationKey")) == true
        stale.waitFor(() =>
            document.querySelector('[id^="SettlementAllocations"][id$="_table"]')?.innerText.includes("An item changed")
        )
        rowText(stale, "SettlementAllocations", "BOSS_ACCT_STL_RECEIPT70").includes("1.00")
    }
})

feature("a write-off needs an explicit account and its amount, account and reason survive correction and review", {
    expect() {
        const page = settlementPage()
        openSettlement(page)
        page.getByRole("button", {name: "Add discount or write-off", exact: true}).click()
        let dialog = page.getByRole("dialog")
        chooseSettlementItem(page, dialog, "Invoice", "BOSS_ACCT_STL_ADJUST50")
        dialog.locator("input[name=amount]").fill("5")
        dialog.locator("textarea[name=reason]").fill("Customer balance agreed at settlement")
        dialog.getByRole("button", {name: "Add adjustment", exact: true}).click()
        page.waitFor(() => !document.querySelector("[role=dialog]"))
        page.allowProblems(/notification: warning.*ADJUSTMENT_ACCOUNT_REQUIRED/)
        page.allowProblems(
            /^response: 500 Internal Server Error https?:\/\/[^/]+\/apps\/Accounting\/Receivables\/ReceivablesWorkbench\/previewSettlement$/
        )
        page.getByRole("button", {name: "Preview settlement", exact: true}).click()
        page.waitFor(() => document.body.innerText.includes("ADJUSTMENT_ACCOUNT_REQUIRED"))
        rowText(page, "SettlementAdjustments", "BOSS_ACCT_STL_ADJUST50").includes("5.00")
        rowText(page, "SettlementAdjustments", "BOSS_ACCT_STL_ADJUST50").includes("Customer balance agreed at settlement")
        page.evaluate(() => {
            const row = Array.from(document.querySelectorAll('[id^="SettlementAdjustments"][id$="_table"] .tr')).find(row =>
                row.innerText.includes("BOSS_ACCT_STL_ADJUST50")
            )
            Array.from(row.querySelectorAll("button"))
                .find(button => button.innerText.trim().endsWith("Edit"))
                .click()
            return true
        }) == true
        dialog = page.getByRole("dialog")
        dialog.getByLabel("Posting account", {exact: true}).click()
        dialog.getByLabel("Posting account", {exact: true}).fill("782100000")
        page.getByRole("option", {name: /782100000.*Accounts Receivable Write Off/}).click()
        closeSettlementOptions(page)
        page.text().includes("Accounts Receivable Write Off")
        dialog.getByRole("button", {name: "Save adjustment", exact: true}).click()
        page.waitFor(() => !document.querySelector("[role=dialog]"))
        rowText(page, "SettlementAdjustments", "BOSS_ACCT_STL_ADJUST50").includes("Accounts Receivable Write Off")
        const previewDraft = previewDraftDiagnostics(page)
        assert(
            JSON.parse(previewDraft.hiddenDraft || "{}").adjustments?.[0]?.glAccountId === "782100000",
            "Corrected adjustment must be submitted by the preview form: " + JSON.stringify(previewDraft)
        )
        previewSettlement(page)
        rowText(page, "ReviewedAdjustments", "BOSS_ACCT_STL_ADJUST50").includes("Customer balance agreed at settlement")
        rowText(page, "ReviewedAdjustments", "BOSS_ACCT_STL_ADJUST50").includes("782100000")
        rowText(page, "ReviewedAdjustments", "BOSS_ACCT_STL_ADJUST50").includes("Accounts Receivable Write Off")
        rowText(page, "ReviewedBalances", "BOSS_ACCT_STL_ADJUST50").includes("45.00")
        page.text().includes("Posting preview")
        page.screenshot("Accounting-settlement-writeoff-review", {fullPage: true})
        confirmSettlement(page)
        page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Settlement applied"))
        rowText(page, "SettlementRemainingResults", "BOSS_ACCT_STL_ADJUST50").includes("45.00")
        page.screenshot("Accounting-settlement-writeoff-applied", {fullPage: true})
    }
})

feature("a finance reader reviews scoped open items on a phone without allocation, gateway or bank controls", {
    expect() {
        const page = settlementPage("finance.read", 390)
        openSettlement(page)
        page.text().includes("Balances are current")
        page.text().includes("Available receipts and credits")
        !page.text().includes("Add allocation")
        !page.text().includes("Add discount or write-off")
        !page.text().includes("Capture payment")
        !page.text().includes("Bank account")
        page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1) == true
        page.screenshot("Accounting-settlement-reader-phone", {fullPage: true})
    }
})
