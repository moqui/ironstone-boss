const paymentDetailRoute = "/qapps/Accounting/Payments/PaymentDetail"
const gatewayOrganization = "BOSS_ACCT_ORG"
// a demo draft whose customer bank account is on the demo gateway (Mantle's test gateway services, which approve)
const gatewayPayment = "BOSS_ACCT_GW_DRAFT"

function gatewayPage(user = "finance.treasury", width = 1280) {
    const page = browser.newPage({user, viewport: {width, height: 1000}, timeout: 30})
    page.allowProblems(/userPhoto\?userId=/)
    page.allowProblems(/Blocked script execution in 'about:srcdoc'.*sandboxed/)
    return page
}

// The header's action (the primary button), its dialog with a reason, and the review screen it opens
function reviewAction(page, action, reason, submit) {
    page.locator(".m-record-actions")
        .getByRole("button", {name: new RegExp(action + "$")})
        .click()
    const dialog = page.getByRole("dialog")
    dialog.waitFor()
    dialog.locator('textarea[name="reason"]').fill(reason)
    dialog.getByRole("button", {name: submit, exact: true}).click()
    page.waitForURL(/\/PaymentDetail\/Review\?/)
    return confirmIdentity(page)
}

// The confirm form's review identity
function confirmIdentity(page) {
    page.waitFor(() => window.moqui.screenForms.some(form => /\/confirmReview$/.test(form.action) && form.fields?.previewId))
    return JSON.parse(
        page.evaluate(() => {
            const form = window.moqui.screenForms.find(form => /\/confirmReview$/.test(form.action) && form.fields?.previewId)
            return JSON.stringify({
                paymentId: form.fields.paymentId,
                previewId: form.fields.previewId,
                previewKind: form.fields.previewKind,
                inputFingerprint: form.fields.inputFingerprint,
                operationKey: form.fields.operationKey
            })
        })
    )
}

// The review's button is the action itself ("Capture payment"); the result shows on the review
function confirmAction(page, action, resultTitle) {
    page.evaluate(() => {
        window.confirm = () => true
        return true
    })
    page.locator(".q-page form")
        .getByRole("button", {name: action, exact: true})
        .click()
    page.waitFor(title => document.querySelector(".q-page")?.innerText.includes(title), {arg: resultTitle})
    return resultFacts(page)
}

function resultFacts(page) {
    page.settle()
    return page.evaluate(
        () =>
            document
                .querySelector('[id^="ReviewResultFacts"][id$="_table"]')
                ?.innerText.replace(/\s+/g, " ")
                .trim() || ""
    )
}

function backToPayment(page) {
    page.getByRole("link", {name: "Back to payment", exact: true}).click()
    page.waitFor(() => !new URL(location.href).searchParams.get("previewId"))
}

// The Gateway tab's answers, as row texts
function gatewayAnswers(page) {
    return page.evaluate(() =>
        Array.from(document.querySelectorAll('[id^="PaymentGatewayAnswers"][id$="_table"] .tr'))
            .slice(1)
            .map(row => row.innerText.replace(/\s+/g, " ").trim())
    )
}

// One pass through the live client: the header's gateway actions open their dialogs and reviews, a review keeps its
// identity across a reload, the confirm shows the gateway's answer, the saved result is checked again, and the Gateway
// tab lists the answers. Declines, release, refunds and AR refusal are AccountingPaymentGateway and
// AccountingPaymentRefunds (mr-boss) and mr-mantle's gateway specs.
feature("treasury validates a gateway payment, authorizes it and captures it through the test gateway", {
    expect() {
        const page = gatewayPage()
        page.goto(paymentDetailRoute + "?organizationPartyId=" + gatewayOrganization + "&paymentId=" + gatewayPayment)
            .status == 200
        // a draft is validated before the gateway is asked
        reviewAction(page, "Validate payment", "Customer instruction checked", "Review change")
        confirmAction(page, "Validate payment", "Payment change completed").includes("Promised")
        backToPayment(page)

        const authorize = reviewAction(page, "Authorize payment", "Customer authorized sixty", "Review gateway action")
        authorize.paymentId == gatewayPayment
        authorize.previewKind == "gateway"
        page.text().includes("Demonstration test gateway")
        page.text().includes("Customer authorized sixty")
        page.text().includes("$60.00")
        const authorized = confirmAction(page, "Authorize payment", "Gateway answer: Accepted")
        authorized.includes("Authorized")
        page.getByRole("button", {name: "Check saved result", exact: true}).click()
        page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Gateway answer: Accepted"))
        resultFacts(page) == authorized
        backToPayment(page)
        page.waitFor(() => document.querySelector(".m-record-status")?.innerText.includes("Authorized"))

        const capture = reviewAction(page, "Capture payment", "First shipment accepted", "Review gateway action")
        page.goto(page.url()).status == 200
        JSON.stringify(confirmIdentity(page)) == JSON.stringify(capture)
        confirmAction(page, "Capture payment", "Gateway answer: Accepted").includes("Delivered")
        backToPayment(page)
        page.waitFor(() => document.querySelector(".m-record-status")?.innerText.includes("Delivered"))
        // the Gateway tab: the authorization's and the capture's answers, accepted, and the capture's details lookup
        page.getByRole("tab", {name: "Gateway", exact: true}).click()
        page.waitFor(() => !!document.querySelector('[id^="PaymentGatewayAnswers"][id$="_table"]'))
        const answers = gatewayAnswers(page)
        answers.filter(row => / Authorize /.test(row)).length == 1
        answers.filter(row => / Capture /.test(row)).length == 1
        answers.every(row => row.includes("Accepted") && row.includes("$60.00"))
    }
})
