// Initial gateway fixture states, before the financial walks: every destination and dialog at each required width/theme.
const gatewayShotGroups = [
    {
        user: "finance.treasury",
        prefix: "Accounting-gateway",
        pages: [
            {name: "Transactions", path: "GatewayTransactions", text: "Gateway transactions", list: true},
            {
                name: "PendingAttempt",
                path: "GatewayTransactions?paymentId=BOSS_ACCT_GW_PENDING",
                text: "Gateway transactions",
                selectCapture: true,
                providerState: "Pending provider confirmation",
                localOutcome: "No cash posting",
                lookup: true
            },
            {
                name: "UncertainAttempt",
                path: "GatewayTransactions?paymentId=BOSS_ACCT_GW_UNCERTAIN",
                text: "Gateway transactions",
                selectCapture: true,
                providerState: "Provider status uncertain",
                localOutcome: "No cash posting",
                lookup: true
            },
            {
                name: "RecoverAttempt",
                path: "GatewayTransactions?paymentId=BOSS_ACCT_GW_RECOVER",
                text: "Gateway transactions",
                selectCapture: true,
                providerState: "Accepted",
                localOutcome: "Cash posting needs review",
                recover: true
            },
            {
                name: "AuthorizationOverview",
                path: "PaymentDetail?paymentId=BOSS_ACCT_GW_AUTHORIZED",
                text: "Payment overview",
                nonCash: true
            },
            {
                name: "AuthorizationCapacity",
                path: "PaymentDetail/Gateway?paymentId=BOSS_ACCT_GW_AUTHORIZED",
                text: "Authorization capacity",
                capacities: {Authorized: "60.00", "Captured cash": "0.00", "Available to capture": "60.00"}
            },
            {
                name: "PartialCapture",
                path: "PaymentDetail/Gateway?paymentId=BOSS_ACCT_GW_PARTIAL",
                text: "Authorization capacity",
                capacities: {Authorized: "60.00", "Captured cash": "20.00", "Available to capture": "40.00"}
            },
            {
                name: "Draft",
                path: "PaymentDetail?paymentId=BOSS_ACCT_GW_DRAFT",
                text: "Payment overview",
                action: "Authorize payment"
            },
            {
                name: "AuthorizeDialog",
                path: "PaymentDetail?paymentId=BOSS_ACCT_GW_DRAFT",
                text: "Payment overview",
                open: "Authorize payment",
                dialogTitle: "Authorize payment BOSS_ACCT_GW_DRAFT",
                fixedAmount: "60.00"
            },
            {
                name: "CaptureDialog",
                path: "PaymentDetail/Gateway?paymentId=BOSS_ACCT_GW_PARTIAL",
                text: "Authorization capacity",
                open: "Capture payment",
                dialogTitle: "Capture payment BOSS_ACCT_GW_PARTIAL",
                editableAmount: true
            },
            {
                name: "ReleaseDialog",
                path: "PaymentDetail/Gateway?paymentId=BOSS_ACCT_GW_PARTIAL",
                text: "Authorization capacity",
                open: "Release authorization",
                dialogTitle: "Release authorization BOSS_ACCT_GW_PARTIAL",
                fixedAmount: "40.00"
            }
        ]
    },
    {
        user: "finance.ar",
        prefix: "Accounting-gateway-ar",
        pages: [
            {
                name: "RestrictedAuthorization",
                path: "PaymentDetail/Gateway?paymentId=BOSS_ACCT_GW_AUTHORIZED",
                text: "Gateway evidence requires treasury access",
                restricted: true
            }
        ]
    }
]
const gatewayShotWidths = [390, 1280, 1440]
const gatewayShotCases = gatewayShotGroups.flatMap(({user, prefix, pages}) =>
    pages.flatMap(entry =>
        gatewayShotWidths.flatMap(width => [false, true].map(dark => ({user, prefix, name: entry.name, entry, width, dark})))
    )
)
let gatewayShotPages = {}

spec({
    setupSpec() {
        for (const {user} of gatewayShotGroups)
            for (const width of gatewayShotWidths) {
                const page = browser.newPage({user, viewport: {width, height: 1000}, timeout: 30})
                page.allowProblems(/userPhoto\?userId=/)
                page.allowProblems(/Blocked script execution in 'about:srcdoc'.*sandboxed/)
                gatewayShotPages[user + ":" + width] = page
            }
    }
})

function gatewayShotSelectCapture(page) {
    page.waitFor(() => !!document.querySelector('[id^="GatewayTransactionResults"][id$="_table"] .tbody > .tr'))
    const attemptIds = page.evaluate(() => {
        const table = document.querySelector('[id^="GatewayTransactionResults"][id$="_table"]')
        return Array.from(table.querySelectorAll(".tbody > .tr")).flatMap(row => {
            const capture =
                row.querySelector('[id^="GatewayTransactionResults_action"][id$="_display"]')?.innerText.trim() === "capture"
            if (!capture) return []
            return Array.from(row.querySelectorAll("a[href]"))
                .map(link => new URL(link.href, location.href).searchParams.get("attemptId"))
                .filter(Boolean)
        })
    })
    assert(attemptIds.length === 1, "The fixture exposes exactly one actual capture attempt in its scoped list")
    const geometry = page.evaluate(attemptId => {
        const table = document.querySelector('[id^="GatewayTransactionResults"][id$="_table"]'),
            link = Array.from(table?.querySelectorAll("a[href]") || []).find(
                link => new URL(link.href, location.href).searchParams.get("attemptId") === attemptId
            )
        if (!link) return {attemptId, found: false}
        link.scrollIntoView({block: "center", inline: "nearest"})
        const rect = link.getBoundingClientRect(),
            hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
        return {
            attemptId,
            href: link.href,
            text: link.innerText,
            display: getComputedStyle(link).display,
            rect: {left: rect.left, top: rect.top, width: rect.width, height: rect.height},
            fragments: Array.from(link.getClientRects()).map(rect => ({
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height
            })),
            centerHitsLink: hit === link || link.contains(hit),
            hit: hit ? {tag: hit.tagName, className: hit.className, text: hit.innerText?.slice(0, 120)} : null
        }
    }, attemptIds[0])
    log.info("Gateway shot attempt link geometry " + JSON.stringify(geometry))
    assert(
        geometry.display === "block" && geometry.fragments?.length === 1 && geometry.centerHitsLink === true,
        "The actual native attempt is a single rectangular record-link target: " + JSON.stringify(geometry)
    )
    page.getByRole("link", {name: attemptIds[0], exact: true}).click()
    page.waitFor(id => document.querySelector(".q-page")?.innerText.includes("Provider attempt " + id), {arg: attemptIds[0]})
    return attemptIds[0]
}

function gatewayShotCapacity(page, label, amount) {
    const text = page.evaluate(label => {
        const table = document.querySelector('[id^="PaymentGatewayCapacity"][id$="_table"]')
        return (
            Array.from(table?.querySelectorAll(".tbody > .tr") || []).find(row =>
                Array.from(row.querySelectorAll(".td")).some(cell => cell.innerText.trim() === label)
            )?.innerText || ""
        )
    }, label)
    assert(
        new RegExp("(^|[^0-9])" + amount.replace(".", "\\.") + "([^0-9]|$)").test(text),
        "The native " + label + " capacity is " + amount + ": " + text
    )
}

feature("#prefix #name at #width dark=#dark", {
    where: gatewayShotCases.filter(item => !params.names || params.names.split(",").includes(item.name)),
    expect({user, prefix, name, entry, width, dark}) {
        const {path, text} = entry,
            page = gatewayShotPages[user + ":" + width]
        page.goto("/qapps/Accounting/Payments/" + path + (path.includes("?") ? "&" : "?") + "organizationPartyId=ORG_ZIZI_CORP")
            .status == 200
        page.waitFor(text => document.querySelector(".q-page")?.innerText.includes(text), {arg: text})
        if (entry.list) {
            page.waitFor(() => !!document.querySelector('[id^="GatewayTransactionResults"][id$="_table"] .tbody > .tr'))
            assert(page.text().includes("BOSS_ACCT_GW_PENDING"), "The organization list contains actual gateway fixture rows")
        }
        if (entry.selectCapture) {
            const attemptId = gatewayShotSelectCapture(page),
                selected = page.evaluate(() => {
                    const form = document.querySelector('form[id^="GatewayAttemptSummary"]')
                    return Array.from(form?.querySelectorAll(".q-chip") || []).map(chip => chip.innerText.trim())
                })
            assert(selected[0] === entry.providerState, "The selected actual attempt shows its current provider state")
            assert(selected[1] === entry.localOutcome, "The selected actual attempt shows its current local outcome")
            assert(
                page.evaluate(() => new URL(location.href).searchParams.get("attemptId")) === attemptId,
                "The selected route retains the actual native attempt identity"
            )
            assert(
                page.getByRole("button", {name: "Check provider status", exact: true}).isVisible() === Boolean(entry.lookup),
                "Only unresolved provider outcomes offer an exact status lookup"
            )
            assert(
                page.getByRole("button", {name: "Review cash posting", exact: true}).isVisible() === Boolean(entry.recover),
                "Only provider-accepted local posting failures offer financial recovery"
            )
            assert(
                page.getByRole("link", {name: /^Actual cash payment /}).count() === 0,
                "An incomplete capture has no completed cash-payment link"
            )
            assert(
                page.locator('[id^="GatewayAttemptOutputs"][id$="_table"]').count() === 0,
                "An incomplete capture has no issued cash documents"
            )
        }
        if (entry.capacities)
            for (const [label, amount] of Object.entries(entry.capacities)) gatewayShotCapacity(page, label, amount)
        if (entry.nonCash) {
            assert(page.text().includes("Authorization amount"), "The parent amount is labeled as authorization")
            assert(
                page.locator('[id^="PaymentSummary_appliedTotal"][id$="_display"]').count() === 0 &&
                    page.locator('[id^="PaymentSummary_unappliedTotal"][id$="_display"]').count() === 0,
                "The authorization parent is not presented as applied or unapplied cash"
            )
        }
        if (entry.action)
            assert(
                page
                    .locator(".m-record-actions")
                    .getByRole("button", {name: new RegExp(entry.action + "$")})
                    .isVisible(),
                "The current native capability offers " + entry.action
            )
        if (entry.restricted) {
            assert(
                page
                    .locator(".m-record-actions")
                    .getByRole("button", {name: /Authorize payment|Capture payment|Release authorization/})
                    .count() === 0,
                "AR read authority does not offer provider mutations"
            )
            assert(
                page.getByRole("link", {name: "Inspect gateway attempts", exact: true}).count() === 0 &&
                    !page.text().includes("Authorization capacity") &&
                    !page.text().includes("BOSS_ACCT_GW_TEST") &&
                    !page.text().includes("BOSS_ACCT_GW_BANK"),
                "AR read authority omits treasury capacity, provider identities and funding methods"
            )
        }
        if (entry.open) {
            page.locator(".m-record-actions")
                .getByRole("button", {name: new RegExp(entry.open + "$")})
                .click()
            const dialog = page.getByRole("dialog")
            assert(dialog.isVisible() && dialog.text().includes(entry.dialogTitle), "The requested gateway dialog is visible")
            assert(
                /^\d{4}-\d{2}-\d{2}$/.test(dialog.locator('input[name="effectiveDate"]').value()),
                "The review dialog carries an explicit accounting day"
            )
            assert(dialog.locator('textarea[name="reason"]').isEditable(), "The review dialog asks for a reason")
            assert(
                dialog.getByLabel("Gateway (optional default)", {exact: true}).isVisible(),
                "The reviewed gateway is chosen by label"
            )
            if (entry.editableAmount)
                assert(dialog.locator('input[name="amount"]').isEditable(), "A capture asks for its explicit partial amount")
            if (entry.fixedAmount)
                assert(
                    dialog.locator('[id*="_amount"][id$="_display"]').value().includes(entry.fixedAmount),
                    "The authorization or release shows its exact native amount"
                )
        }
        page.settle()
        page.evaluate(dark => {
            document.querySelector("#apps-root").__vue_app__.config.globalProperties.$q.dark.set(dark)
            return true
        }, dark) == true
        page.waitFor(dark => document.body.classList.contains("body--dark") === dark, {arg: dark})
        page.settle()
        page.evaluate(async () => {
            await Promise.all(
                document
                    .getAnimations()
                    .filter(animation => Number.isFinite(animation.effect?.getComputedTiming().endTime))
                    .map(animation => animation.finished.catch(() => {}))
            )
            return true
        })
        if ((entry.list || entry.selectCapture) && width === 390) {
            const geometry = page.evaluate(() => {
                const table = document.querySelector('[id^="GatewayTransactionResults"][id$="_table"]')
                const box = node => {
                    if (!node) return null
                    const rect = node.getBoundingClientRect()
                    return {
                        left: rect.left,
                        right: rect.right,
                        width: rect.width,
                        height: rect.height,
                        clientWidth: node.clientWidth,
                        scrollWidth: node.scrollWidth,
                        clientHeight: node.clientHeight,
                        scrollHeight: node.scrollHeight,
                        text: node.innerText?.slice(0, 160)
                    }
                }
                return {
                    viewport: document.documentElement.clientWidth,
                    documentScrollWidth: document.documentElement.scrollWidth,
                    table: box(table),
                    container: box(table?.closest(".q-table__container")),
                    rows: Array.from(table?.querySelectorAll(".tbody > .tr") || []).map(row => ({
                        cells: Array.from(row.querySelectorAll(".td")).map(box),
                        amount: box(row.querySelector('[id^="GatewayTransactionResults_amount"][id$="_display"]')),
                        states: Array.from(row.querySelectorAll(".q-chip")).map(chip => ({
                            ...box(chip),
                            content: box(chip.querySelector(".q-chip__content"))
                        }))
                    }))
                }
            })
            log.info("Gateway phone table geometry " + JSON.stringify({...geometry, rows: geometry.rows.slice(0, 2)}))
            assert(
                geometry.container &&
                    geometry.table &&
                    geometry.rows.length > 0 &&
                    geometry.container.scrollWidth <= geometry.container.clientWidth + 1 &&
                    geometry.table.right <= geometry.container.right + 1,
                "The phone gateway table fits its visible container: " + JSON.stringify(geometry)
            )
            assert(
                geometry.rows.every(
                    row =>
                        row.amount &&
                        row.amount.width > 0 &&
                        row.amount.left >= geometry.container.left &&
                        row.amount.right <= geometry.container.right + 1 &&
                        row.states.length === 2 &&
                        row.states.every(
                            state =>
                                state.left >= geometry.container.left &&
                                state.right <= geometry.container.right + 1 &&
                                state.content &&
                                state.content.scrollWidth <= state.content.clientWidth + 1 &&
                                state.content.scrollHeight <= state.content.clientHeight + 1
                        )
                ),
                "Every provider amount and distinct provider/local outcome fits on phone: " + JSON.stringify(geometry)
            )
        }
        !/Error rendering|Exception in render|This payment is not available/.test(page.text())
        page.text().includes(text)
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1) == true
        page.screenshot(prefix + "-" + name + "-" + width + (dark ? "-dark" : "-light"), {fullPage: true})
    }
})
