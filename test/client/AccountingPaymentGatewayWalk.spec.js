const gatewayDetailRoute = "/qapps/Accounting/Payments/PaymentDetail/Gateway"
const gatewayOrganization = "ORG_ZIZI_CORP"
const gatewayProvider = "BOSS_ACCT_GW_TEST"

function gatewayPage(user = "finance.treasury", width = 1280) {
    const page = browser.newPage({user, viewport: {width, height: 1000}, timeout: 30})
    page.allowProblems(/userPhoto\?userId=/)
    page.allowProblems(/Blocked script execution in 'about:srcdoc'.*sandboxed/)
    return page
}

function gatewayPaymentUrl(paymentId) {
    return gatewayDetailRoute + "?organizationPartyId=" + gatewayOrganization + "&paymentId=" + encodeURIComponent(paymentId)
}

function gatewayFormFields(page, transition, dialogOnly = true) {
    const state = JSON.parse(
        page.evaluate(
            ({transition, dialogOnly}) => {
                const visible = node => node && node.getClientRects().length && getComputedStyle(node).visibility !== "hidden"
                const forms = window.moqui.screenForms.filter(
                    form =>
                        typeof form.action === "string" &&
                        form.action.endsWith("/" + transition) &&
                        (!dialogOnly || visible(form.$el.closest('[role="dialog"]'))) &&
                        Array.from(
                            form.$el.querySelectorAll('button, input:not([type="hidden"]), textarea, [role="combobox"]')
                        ).some(visible)
                )
                return JSON.stringify({count: forms.length, fields: forms.length === 1 ? forms[0].fields : {}})
            },
            {transition, dialogOnly}
        )
    )
    assert(state.count === 1, "Exactly one visible gateway form submits " + transition + ": " + JSON.stringify(state))
    return state.fields
}

function closeGatewayOptions(page) {
    page.settle()
    if (
        page.evaluate(() =>
            Array.from(document.querySelectorAll('[role="combobox"][aria-expanded="true"]')).some(
                control => control.getClientRects().length && getComputedStyle(control).visibility !== "hidden"
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

function reviewGatewayAction(page, action, amount, reference, reason) {
    const labels = {authorize: "Authorize payment", capture: "Capture payment", release: "Release authorization"}
    page.locator(".m-record-actions")
        .getByRole("button", {name: new RegExp(labels[action] + "$")})
        .click()
    const dialog = page.getByRole("dialog")
    assert(dialog.isVisible(), "The reviewed gateway action opens its own dialog")
    if (action === "capture") dialog.locator('input[name="amount"]').fill(amount)
    dialog.locator('input[name="referenceNumber"]').fill(reference)
    dialog.locator('textarea[name="reason"]').fill(reason)
    const day = dialog.locator('input[name="effectiveDate"]').value()
    assert(/^\d{4}-\d{2}-\d{2}$/.test(day), "The gateway action has an explicit accounting day")
    dialog.getByLabel("Gateway (optional default)", {exact: true}).click()
    dialog.getByLabel("Gateway (optional default)", {exact: true}).fill(gatewayProvider)
    page.getByRole("option").first().click()
    closeGatewayOptions(page)
    assert(dialog.isVisible(), "Choosing the approved gateway keeps the review dialog open")
    const fields = gatewayFormFields(page, "previewGatewayAction")
    assert(fields.action === action, "The actual form retains the requested provider action")
    assert(!!fields.sourceVersion, "The actual form retains the reviewed payment revision")
    assert(
        typeof fields.gatewayBindingToken === "string" && fields.gatewayBindingToken.startsWith(gatewayProvider + "~"),
        "The actual form submits the explicitly selected gateway and its original binding revision"
    )
    assert(String(fields.amount).replace(/\.0+$/, "") === amount, "The actual form submits the reviewed action amount")
    if (action !== "authorize") assert(!!fields.parentAttemptId, "Capture and release retain their actual authorization attempt")
    dialog.getByRole("button", {name: "Review gateway action", exact: true}).click()
    page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Reviewed gateway action"))
    assert(page.text().includes(reason), "The retained review displays the submitted reason")
    assert(page.text().includes(day), "The retained review displays the canonical accounting day")
    assert(
        page.evaluate(
            amount =>
                Array.from(document.querySelectorAll("p")).some(
                    node => node.innerText.startsWith("Reviewed action amount") && node.innerText.includes(amount + ".00")
                ),
            amount
        ),
        "The retained review prominently displays this action's amount"
    )
    return {day, sourceVersion: fields.sourceVersion, gatewayBindingToken: fields.gatewayBindingToken}
}

function gatewayConfirmationIdentity(page, recovery = false) {
    const fields = gatewayFormFields(page, recovery ? "confirmGatewayRecovery" : "confirmGatewayAction", false)
    assert(
        !!fields.previewId && !!fields.inputFingerprint && !!fields.operationKey,
        "Confirmation uses the retained native identity"
    )
    return {
        paymentId: fields.paymentId,
        previewId: fields.previewId,
        inputFingerprint: fields.inputFingerprint,
        operationKey: fields.operationKey
    }
}

function confirmGatewayAction(page, recovery = false, expected = "completed") {
    const identity = gatewayConfirmationIdentity(page, recovery)
    page.getByRole("checkbox", {
        name: recovery
            ? "I reviewed the accepted provider operation and local cash posting"
            : "I reviewed the provider instruction, amount, evidence and cash posting effects",
        exact: true
    }).click()
    page.evaluate(() => {
        window.confirm = () => true
        return true
    })
    page.getByRole("button", {name: recovery ? "Complete cash posting" : "Confirm gateway action", exact: true}).click()
    page.waitFor(text => document.querySelector(".q-page")?.innerText.includes(text), {
        arg: expected === "completed" ? "Completed results" : "Recorded provider outcome"
    })
    assert(
        page.evaluate(() => new URL(location.href).searchParams.get("previewId")) === identity.previewId,
        "The first confirmation retains the reviewed native preview"
    )
    assert(
        page.evaluate(() => new URL(location.href).searchParams.get("previewKind")) ===
            (recovery ? "gatewayRecovery" : "gatewayAction"),
        "The result URL retains the canonical review kind"
    )
    return identity
}

function gatewayResultIdentity(page) {
    return JSON.parse(
        page.evaluate(() => {
            const table = name => document.querySelector('[id^="' + name + '"][id$="_table"]')
            const links = name =>
                Array.from(table(name)?.querySelectorAll("a[href]") || []).map(link => {
                    const url = new URL(link.href, location.href)
                    return {
                        text: link.innerText.trim(),
                        href: link.href,
                        paymentId: url.searchParams.get("paymentId"),
                        recordId: url.searchParams.get("recordId"),
                        sourceVersion: url.searchParams.get("sourceVersion"),
                        outputId: url.searchParams.get("outputId"),
                        outputType: url.searchParams.get("outputType")
                    }
                })
            return JSON.stringify({
                result: table("PaymentChangeResults")?.innerText.trim() || "",
                cash: links("GatewayActualCashPayments"),
                applications: table("PaymentActualApplicationResults")?.innerText.trim() || "",
                postings: table("PaymentActualPostingResults")?.innerText.trim() || "",
                outputs: links("PaymentActualOutputResults")
            })
        })
    )
}

function retryGatewayResult(page, expected, recovery = false) {
    page.getByRole("button", {name: recovery ? "Check saved posting result" : "Check saved gateway result", exact: true}).click()
    page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Completed results"))
    assert(
        JSON.stringify(gatewayResultIdentity(page)) === JSON.stringify(expected),
        "The same reviewed retry retains the exact attempt, cash payment, applications, postings and issued files"
    )
}

function gatewayCapacity(page, label) {
    return page.evaluate(label => {
        const table = document.querySelector('[id^="PaymentGatewayCapacity"][id$="_table"]')
        const row = Array.from(table?.querySelectorAll(".tbody > .tr") || []).find(row => row.innerText.includes(label))
        return row?.innerText.trim() || ""
    }, label)
}

function gatewayCapacityIs(page, label, amount) {
    return new RegExp("(^|[^0-9])" + amount.replace(".", "\\.") + "([^0-9]|$)").test(gatewayCapacity(page, label))
}

function backToGateway(page) {
    page.getByRole("link", {name: "Back to gateway", exact: true}).click()
    page.waitFor(() => !new URL(location.href).searchParams.get("previewId"))
    page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Authorization capacity"))
}

function gatewayRetainedShots(url, state) {
    for (const width of [390, 1280, 1440]) {
        for (const dark of [false, true]) {
            const page = gatewayPage("finance.treasury", width)
            try {
                assert(page.goto(url).status === 200, "The owner can reopen this retained gateway review")
                page.waitFor(text => document.querySelector(".q-page")?.innerText.includes(text), {
                    arg: state.endsWith("reviewed")
                        ? state.startsWith("recovery")
                            ? "Reviewed cash posting"
                            : "Reviewed gateway action"
                        : "Completed results"
                })
                page.evaluate(dark => {
                    document.querySelector("#apps-root").__vue_app__.config.globalProperties.$q.dark.set(dark)
                    return true
                }, dark)
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
                assert(
                    !/Error rendering|Exception in render/.test(page.text()),
                    "Retained gateway content renders without errors"
                )
                assert(
                    page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
                    "Retained gateway content fits its viewport"
                )
                page.screenshot("Accounting-gateway-" + state + "-" + width + "-" + (dark ? "dark" : "light"), {fullPage: true})
            } finally {
                page.close()
            }
        }
    }
}

function gatewayAttemptRows(page) {
    return JSON.parse(
        page.evaluate(() => {
            const table = document.querySelector('[id^="GatewayTransactionResults"][id$="_table"]')
            return JSON.stringify(
                Array.from(table?.querySelectorAll(".tbody > .tr") || []).flatMap(row => {
                    const link = Array.from(row.querySelectorAll("a[href]")).find(link =>
                        new URL(link.href, location.href).searchParams.get("attemptId")
                    )
                    if (!link) return []
                    return [
                        {
                            attemptId: new URL(link.href, location.href).searchParams.get("attemptId"),
                            action: Array.from(row.querySelectorAll(".td"))
                                .map(cell => cell.innerText.trim())
                                .find(text => ["authorize", "capture", "release"].includes(text)),
                            text: row.innerText
                        }
                    ]
                })
            )
        })
    )
}

function openGatewayCaptureAttempt(page, paymentId) {
    assert(page.goto(gatewayPaymentUrl(paymentId)).status === 200, "The gateway fixture opens through its ordinary payment route")
    page.getByRole("link", {name: "Inspect gateway attempts", exact: true}).click()
    page.waitFor(() => !!document.querySelector('[id^="GatewayTransactionResults"][id$="_table"] a[href]'))
    const records = gatewayAttemptRows(page),
        captures = records.filter(row => row.action === "capture")
    assert(captures.length === 1, "The scoped transaction list identifies the fixture's one actual capture attempt")
    log.info(
        "Gateway attempt link geometry " +
            JSON.stringify(
                page.evaluate(attemptId => {
                    const table = document.querySelector('[id^="GatewayTransactionResults"][id$="_table"]'),
                        link = Array.from(table?.querySelectorAll("a[href]") || []).find(
                            link => new URL(link.href, location.href).searchParams.get("attemptId") === attemptId
                        )
                    if (!link) return {attemptId, found: false}
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
                }, captures[0].attemptId)
            )
    )
    page.getByRole("link", {name: captures[0].attemptId, exact: true}).click()
    page.waitFor(id => document.querySelector(".q-page")?.innerText.includes("Provider attempt " + id), {
        arg: captures[0].attemptId
    })
    assert(
        page.evaluate(() => new URL(location.href).searchParams.get("paymentId")) === paymentId,
        "Selecting the actual attempt retains the searched payment scope"
    )
    return {attemptId: captures[0].attemptId, attemptIds: records.map(row => row.attemptId).sort()}
}

function selectedGatewayAttempt(page) {
    return JSON.parse(
        page.evaluate(() => {
            const stateChips = Array.from(document.querySelectorAll('form[id^="GatewayAttemptSummary"] .q-chip'))
            const value = field => {
                const node = document.querySelector('[id^="GatewayAttemptSummary_' + field + '"][id$="_display"]')
                return node?.value ?? node?.innerText ?? ""
            }
            const outputTable = document.querySelector('[id^="GatewayAttemptOutputs"][id$="_table"]')
            const cash = Array.from(document.querySelectorAll(".q-page a[href]")).find(link =>
                link.innerText.trim().startsWith("Actual cash payment ")
            )
            return JSON.stringify({
                attemptId: new URL(location.href).searchParams.get("attemptId"),
                providerOperationId: value("providerOperationId"),
                providerState: stateChips[0]?.innerText.trim() ?? value("providerStateText"),
                localOutcome: stateChips[1]?.innerText.trim() ?? value("financialStateText"),
                amount: value("amount"),
                cashPaymentId: cash ? new URL(cash.href, location.href).searchParams.get("paymentId") : null,
                outputs: Array.from(outputTable?.querySelectorAll("a[href]") || []).map(link => {
                    const url = new URL(link.href, location.href)
                    return {paymentId: url.searchParams.get("paymentId"), outputId: url.searchParams.get("outputId")}
                })
            })
        })
    )
}

function gatewayLookupIdentity(page) {
    const fields = JSON.parse(
        page.evaluate(() => {
            const button = Array.from(document.querySelectorAll("button")).find(button =>
                button.innerText.trim().endsWith("Check provider status")
            )
            const form = button?.closest("form")
            return JSON.stringify(form ? Object.fromEntries(new FormData(form)) : {})
        })
    )
    assert(
        !!fields.attemptId && !!fields.attemptVersion && !!fields.operationKey,
        "The actual lookup form retains its attempt revision"
    )
    return {attemptId: fields.attemptId, attemptVersion: fields.attemptVersion, operationKey: fields.operationKey}
}

feature("treasury authorizes sixty and captures twenty plus forty into separate actual cash payments", {
    expect() {
        const page = gatewayPage(),
            parent = "BOSS_ACCT_GW_DRAFT"
        page.goto(gatewayPaymentUrl(parent)).status == 200
        reviewGatewayAction(page, "authorize", "60", "AUTH-60", "Customer authorized the sixty unit instruction")
        const authorizedReview = gatewayConfirmationIdentity(page)
        page.goto(page.url()).status == 200
        JSON.stringify(gatewayConfirmationIdentity(page)) == JSON.stringify(authorizedReview)
        confirmGatewayAction(page)
        const authorized = gatewayResultIdentity(page)
        authorized.result.includes("Attempt")
        authorized.cash.length == 0
        authorized.outputs.length == 0
        authorized.postings == ""
        page.text().includes("No cash posting required")
        retryGatewayResult(page, authorized)
        backToGateway(page)
        gatewayCapacityIs(page, "Authorized", "60.00")
        gatewayCapacityIs(page, "Available to capture", "60.00")
        !page.text().includes("Unapplied amount")

        reviewGatewayAction(page, "capture", "20", "CAPTURE-20", "First shipment accepted for twenty units")
        page.text().includes("Authorized amount")
        page.text().includes("60.00")
        const firstReview = gatewayConfirmationIdentity(page)
        page.goto(page.url()).status == 200
        JSON.stringify(gatewayConfirmationIdentity(page)) == JSON.stringify(firstReview)
        gatewayRetainedShots(page.url(), "capture-reviewed")
        confirmGatewayAction(page)
        const first = gatewayResultIdentity(page)
        first.cash.length == 1
        first.cash[0].paymentId != parent
        first.cash[0].recordId == first.cash[0].paymentId
        first.outputs.length >= 2
        first.outputs.every(row => row.paymentId === first.cash[0].paymentId && row.recordId === row.paymentId && !!row.outputId)
        first.outputs.every(row => !row.sourceVersion)
        first.postings == ""
        gatewayRetainedShots(page.url(), "capture-applied")
        retryGatewayResult(page, first)
        const print = gatewayPage()
        print.goto(first.outputs[0].href).status == 200
        print.text().includes("Payment document")
        print.text().includes("20.00")
        print.text().includes("Payment customer")
        !print.text().includes("This payment document is not available")
        print.screenshot("Accounting-gateway-capture-issued-receipt", {fullPage: true})
        print.close()
        backToGateway(page)
        gatewayCapacityIs(page, "Captured cash", "20.00")
        gatewayCapacityIs(page, "Available to capture", "40.00")

        reviewGatewayAction(page, "capture", "40", "CAPTURE-40", "Remaining shipment accepted for forty units")
        confirmGatewayAction(page)
        const second = gatewayResultIdentity(page)
        second.cash.length == 1
        second.cash[0].paymentId != parent
        second.cash[0].paymentId != first.cash[0].paymentId
        second.result != first.result
        second.outputs.every(
            row => row.paymentId === second.cash[0].paymentId && row.recordId === row.paymentId && !!row.outputId
        )
        retryGatewayResult(page, second)
        backToGateway(page)
        gatewayCapacityIs(page, "Captured cash", "60.00")
        gatewayCapacityIs(page, "Available to capture", "0.00")
        page
            .locator(".m-record-actions")
            .getByRole("button", {name: /Capture payment$/})
            .count() == 0
        page.screenshot("Accounting-gateway-authorization-fully-captured", {fullPage: true})
    }
})

feature("treasury releases the remaining authorization after a partial capture without creating another cash payment", {
    expect() {
        const page = gatewayPage(),
            parent = "BOSS_ACCT_GW_PARTIAL"
        page.goto(gatewayPaymentUrl(parent)).status == 200
        gatewayCapacityIs(page, "Authorized", "60.00")
        gatewayCapacityIs(page, "Captured cash", "20.00")
        gatewayCapacityIs(page, "Available to capture", "40.00")
        reviewGatewayAction(page, "release", "40", "RELEASE-40", "Customer cancelled the unshipped balance")
        page.text().includes("Authorized amount")
        page.text().includes("60.00")
        confirmGatewayAction(page)
        const released = gatewayResultIdentity(page)
        released.cash.length == 0
        released.outputs.length == 0
        released.postings == ""
        page.text().includes("No cash posting required")
        retryGatewayResult(page, released)
        backToGateway(page)
        gatewayCapacityIs(page, "Captured cash", "20.00")
        gatewayCapacityIs(page, "Released", "40.00")
        gatewayCapacityIs(page, "Available to capture", "0.00")
        page
            .locator(".m-record-actions")
            .getByRole("button", {name: /Release authorization$/})
            .count() == 0
        page.screenshot("Accounting-gateway-authorization-released", {fullPage: true})
    }
})

feature("the same authorized instruction offers capture to treasury while AR sees no provider controls or cash balances", {
    expect() {
        const url = gatewayPaymentUrl("BOSS_ACCT_GW_AUTHORIZED"),
            treasury = gatewayPage(),
            reader = gatewayPage("finance.ar", 390)
        treasury.goto(url).status == 200
        treasury
            .locator(".m-record-actions")
            .getByRole("button", {name: /Capture payment$/})
            .isVisible() == true
        treasury.text().includes("Authorization capacity")
        reader.goto(url).status == 200
        reader.text().includes("Payment customer")
        reader.text().includes("Gateway evidence requires treasury access")
        reader
            .locator(".m-record-actions")
            .getByRole("button", {name: /Authorize payment|Capture payment|Release authorization/})
            .count() == 0
        reader.getByRole("link", {name: "Inspect gateway attempts", exact: true}).count() == 0
        !reader.text().includes("Authorization capacity")
        !reader.text().includes("Unapplied amount")
        !reader.text().includes(gatewayProvider)
        !reader.text().includes("BOSS_ACCT_GW_BANK")
        reader.screenshot("Accounting-gateway-ar-reader", {fullPage: true})
    }
})

feature("a pending capture is completed by looking up its original provider operation", {
    expect() {
        const page = gatewayPage(),
            parent = "BOSS_ACCT_GW_PENDING",
            scoped = openGatewayCaptureAttempt(page, parent),
            pending = selectedGatewayAttempt(page),
            lookup = gatewayLookupIdentity(page)
        pending.attemptId == scoped.attemptId
        Boolean(pending.providerOperationId) == true
        pending.providerState == "Pending provider confirmation"
        pending.localOutcome == "No cash posting"
        pending.amount.includes("20.00")
        pending.cashPaymentId == null
        pending.outputs.length == 0
        lookup.attemptId == scoped.attemptId
        page.getByRole("button", {name: "Review cash posting", exact: true}).count() == 0
        page.screenshot("Accounting-gateway-pending-provider-attempt", {fullPage: true})
        page.getByRole("button", {name: "Check provider status", exact: true}).click()
        page.waitFor(() =>
            Array.from(document.querySelectorAll(".q-page a[href]")).some(link =>
                link.innerText.trim().startsWith("Actual cash payment ")
            )
        )
        const completed = selectedGatewayAttempt(page)
        completed.attemptId == pending.attemptId
        completed.providerOperationId == pending.providerOperationId
        completed.providerState == "Accepted"
        completed.localOutcome == "Completed"
        completed.cashPaymentId != null
        completed.cashPaymentId != parent
        completed.outputs.length >= 2
        completed.outputs.every(row => row.paymentId === completed.cashPaymentId && !!row.outputId)
        JSON.stringify(
            gatewayAttemptRows(page)
                .map(row => row.attemptId)
                .sort()
        ) == JSON.stringify(scoped.attemptIds)
        page.getByRole("button", {name: "Check provider status", exact: true}).count() == 0
        page.screenshot("Accounting-gateway-pending-capture-completed", {fullPage: true})
    }
})

feature("an uncertain capture resolves through the exact provider lookup without another capture instruction", {
    expect() {
        const page = gatewayPage(),
            parent = "BOSS_ACCT_GW_UNCERTAIN",
            scoped = openGatewayCaptureAttempt(page, parent),
            uncertain = selectedGatewayAttempt(page),
            lookup = gatewayLookupIdentity(page)
        uncertain.attemptId == scoped.attemptId
        Boolean(uncertain.providerOperationId) == true
        uncertain.providerState == "Provider status uncertain"
        uncertain.amount.includes("20.00")
        uncertain.cashPaymentId == null
        uncertain.outputs.length == 0
        lookup.attemptId == scoped.attemptId
        page.getByRole("button", {name: "Review cash posting", exact: true}).count() == 0
        page.screenshot("Accounting-gateway-uncertain-provider-attempt", {fullPage: true})
        page.getByRole("button", {name: "Check provider status", exact: true}).click()
        page.waitFor(() =>
            Array.from(document.querySelectorAll(".q-page a[href]")).some(link =>
                link.innerText.trim().startsWith("Actual cash payment ")
            )
        )
        const completed = selectedGatewayAttempt(page)
        completed.attemptId == uncertain.attemptId
        completed.providerOperationId == uncertain.providerOperationId
        completed.providerState == "Accepted"
        completed.localOutcome == "Completed"
        completed.cashPaymentId != null
        completed.cashPaymentId != parent
        completed.outputs.length >= 2
        completed.outputs.every(row => row.paymentId === completed.cashPaymentId && !!row.outputId)
        JSON.stringify(
            gatewayAttemptRows(page)
                .map(row => row.attemptId)
                .sort()
        ) == JSON.stringify(scoped.attemptIds)
        page.screenshot("Accounting-gateway-uncertain-capture-completed", {fullPage: true})
    }
})

feature("an accepted capture with failed local posting is reviewed and repaired without another provider operation", {
    expect() {
        const page = gatewayPage(),
            parent = "BOSS_ACCT_GW_RECOVER",
            scoped = openGatewayCaptureAttempt(page, parent),
            accepted = selectedGatewayAttempt(page)
        accepted.attemptId == scoped.attemptId
        Boolean(accepted.providerOperationId) == true
        accepted.providerState == "Accepted"
        accepted.localOutcome == "Cash posting needs review"
        accepted.amount.includes("20.00")
        accepted.cashPaymentId == null
        accepted.outputs.length == 0
        page.getByRole("button", {name: "Check provider status", exact: true}).count() == 0
        page.screenshot("Accounting-gateway-cash-posting-needs-review", {fullPage: true})
        page.getByRole("button", {name: "Review cash posting", exact: true}).click()
        const dialog = page.getByRole("dialog")
        dialog.locator('textarea[name="reason"]').fill("Provider acceptance verified; the accounting lock has been removed")
        const fields = gatewayFormFields(page, "previewGatewayRecovery")
        fields.attemptId == scoped.attemptId
        Boolean(fields.attemptVersion) == true
        dialog.getByRole("button", {name: "Review cash posting", exact: true}).click()
        page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Reviewed cash posting"))
        page.text().includes(accepted.providerOperationId)
        page.text().includes("Reviewed action amount")
        page.text().includes("20.00")
        page.getByRole("button", {name: "Check saved posting result", exact: true}).count() == 0
        const review = gatewayConfirmationIdentity(page, true)
        page.goto(page.url()).status == 200
        JSON.stringify(gatewayConfirmationIdentity(page, true)) == JSON.stringify(review)
        gatewayRetainedShots(page.url(), "recovery-reviewed")
        confirmGatewayAction(page, true)
        const repaired = gatewayResultIdentity(page)
        repaired.result.includes(scoped.attemptId)
        repaired.result.includes(accepted.providerOperationId)
        repaired.cash.length == 1
        repaired.cash[0].paymentId != parent
        repaired.outputs.length >= 2
        repaired.outputs.every(row => row.paymentId === repaired.cash[0].paymentId && !!row.outputId)
        repaired.postings == ""
        gatewayRetainedShots(page.url(), "recovery-applied")
        retryGatewayResult(page, repaired, true)
        page.getByRole("link", {name: "Back to gateway transactions", exact: true}).click()
        page.waitFor(id => document.querySelector(".q-page")?.innerText.includes("Provider attempt " + id), {
            arg: scoped.attemptId
        })
        page.evaluate(() => new URL(location.href).searchParams.get("paymentId")) == parent
        const completed = selectedGatewayAttempt(page)
        completed.attemptId == accepted.attemptId
        completed.providerOperationId == accepted.providerOperationId
        completed.cashPaymentId == repaired.cash[0].paymentId
        completed.localOutcome == "Completed"
        JSON.stringify(
            gatewayAttemptRows(page)
                .map(row => row.attemptId)
                .sort()
        ) == JSON.stringify(scoped.attemptIds)
        page.getByRole("button", {name: "Review cash posting", exact: true}).count() == 0
        page.screenshot("Accounting-gateway-financial-only-repair-completed", {fullPage: true})
    }
})
