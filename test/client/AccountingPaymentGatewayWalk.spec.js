const gatewayDetailRoute = "/qapps/Accounting/Payments/PaymentDetail/Gateway"
const gatewayOrganization = "BOSS_ACCT_ORG"
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

function gatewayConfirmationIdentity(page) {
    const fields = gatewayFormFields(page, "confirmGatewayAction", false)
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

function confirmGatewayAction(page) {
    const identity = gatewayConfirmationIdentity(page)
    page.getByRole("checkbox", {
        name: "I reviewed the provider instruction, amount, evidence and cash posting effects",
        exact: true
    }).click()
    page.evaluate(() => {
        window.confirm = () => true
        return true
    })
    page.getByRole("button", {name: "Confirm gateway action", exact: true}).click()
    page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Completed results"))
    assert(
        page.evaluate(() => new URL(location.href).searchParams.get("previewId")) === identity.previewId,
        "The first confirmation retains the reviewed native preview"
    )
    assert(
        page.evaluate(() => new URL(location.href).searchParams.get("previewKind")) === "gatewayAction",
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

function retryGatewayResult(page, expected) {
    page.getByRole("button", {name: "Check saved gateway result", exact: true}).click()
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

// One pass through the live client: the action dialogs post the selected gateway binding and amount, a review keeps its
// identity across a reload, and a capture becomes its own cash payment with issued files. Provider outcomes (pending,
// uncertain, recovery), release and AR refusal are AccountingPaymentGateway (mr-boss) and mr-mantle's gateway specs.
feature("treasury authorizes sixty and captures twenty into a separate actual cash payment", {
    expect() {
        const page = gatewayPage(),
            parent = "BOSS_ACCT_GW_DRAFT"
        page.goto(gatewayPaymentUrl(parent)).status == 200
        reviewGatewayAction(page, "authorize", "60", "AUTH-60", "Customer authorized the sixty unit instruction")
        confirmGatewayAction(page)
        const authorized = gatewayResultIdentity(page)
        authorized.cash.length == 0
        backToGateway(page)
        gatewayCapacityIs(page, "Available to capture", "60.00")

        reviewGatewayAction(page, "capture", "20", "CAPTURE-20", "First shipment accepted for twenty units")
        const review = gatewayConfirmationIdentity(page)
        page.goto(page.url()).status == 200
        JSON.stringify(gatewayConfirmationIdentity(page)) == JSON.stringify(review)
        confirmGatewayAction(page)
        const captured = gatewayResultIdentity(page)
        captured.cash.length == 1
        captured.cash[0].paymentId != parent
        captured.outputs.length >= 2
        captured.outputs.every(row => row.paymentId === captured.cash[0].paymentId && !!row.outputId)
        retryGatewayResult(page, captured)
        backToGateway(page)
        gatewayCapacityIs(page, "Captured cash", "20.00")
        gatewayCapacityIs(page, "Available to capture", "40.00")
    }
})
