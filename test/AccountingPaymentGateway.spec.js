// Gateway actions on the payment screens: the header dialogs' input, the retained review and its result rendered through
// the Accounting mount, treasury-only access, and the gateway transactions list. The demo gateway BOSS_ACCT_GW_TEST
// runs Mantle's test gateway services (PaymentTestServices), which always approve.
const app = ec.resource.script("component://mr-boss/test/AccountingSpecLib.js")
const screen = () => ec.resource.script("component://mr-boss/service/ironstone/accounting/Payments.js")
const native = "mantle.account.PaymentServices."
const org = app.ids.organizationPartyId,
    gatewayId = "BOSS_ACCT_GW_TEST"
spec({
    setup() {
        login("john.doe")
        ec.artifactExecution.disableAuthz()
    }
})

// A promised customer payment through the demo gateway, made as the system so each feature has its own.
function promised(amount = "40") {
    return app.call(native + "create#Payment", {
        fromPartyId: app.ids.paymentPartyId,
        toPartyId: org,
        paymentTypeEnumId: "PtInvoicePayment",
        paymentInstrumentEnumId: "PiAch",
        paymentMethodId: "BOSS_ACCT_GW_CUSTOMER_BANK",
        toPaymentMethodId: "BOSS_ACCT_GW_BANK",
        paymentGatewayConfigId: gatewayId,
        amount,
        amountUomId: "USD",
        statusId: "PmntPromised",
        effectiveDate: ec.user.nowTimestamp
    }).paymentId
}
// Review and confirm one action as the screen does: the dialog's input, then the confirm form's operation key.
function act(paymentId, action, extra = {}) {
    const input = screen().execute(
            "gatewayActionInput",
            Object.assign({organizationPartyId: org, paymentId, action, reason: "Customer instruction"}, extra)
        ),
        preview = app.call(native + "preview#PaymentGatewayAction", input),
        review = app.call("ironstone.accounting.PaymentScreenServices.get#PaymentReviewContext", {
            organizationPartyId: org,
            paymentId,
            previewId: preview.previewId,
            previewKind: "gateway"
        }).paymentReview
    return app.call(native + "execute#PaymentGatewayAction", review.confirmParameters)
}

feature("the gateway dialogs send only the action, reason and a refund's amount", {
    when() {
        const input = screen().execute("gatewayActionInput", {
                organizationPartyId: org,
                paymentId: "P1",
                action: "capture",
                amount: "5",
                reason: "Ship today",
                paymentGatewayConfigId: "OTHER",
                operationKey: "x"
            }),
            refund = screen().execute("gatewayActionInput", {
                organizationPartyId: org,
                paymentId: "P1",
                action: "refund",
                amount: "5"
            })
        let unknown = ""
        try {
            screen().execute("gatewayActionInput", {organizationPartyId: org, paymentId: "P1", action: "lookup"})
        } catch (error) {
            unknown = error.message
        }
        return {input, refund, unknown}
    },
    then({input, refund, unknown}) {
        Object.keys(input).sort().join() == "action,organizationPartyId,paymentId,reason"
        refund.amount == "5"
        unknown.includes("Choose an available gateway action")
    }
})

feature("treasury reviews and confirms an authorization and a capture; the review and its answer render in every mode", {
    when() {
        const paymentId = promised()
        return app.asUser("finance.treasury", () => {
            const detail = app.call("ironstone.accounting.PaymentScreenServices.get#PaymentContext", {
                organizationPartyId: org,
                paymentId
            })
            act(paymentId, "authorize")
            const input = screen().execute("gatewayActionInput", {
                    organizationPartyId: org,
                    paymentId,
                    action: "capture",
                    reason: "Shipped"
                }),
                preview = app.call(native + "preview#PaymentGatewayAction", input),
                parameters = {paymentId, previewId: preview.previewId, previewKind: "gateway"},
                reviewPages = ["qvt", "tui", "html"].map(mode => app.page("Payments/PaymentDetail/Review", parameters, mode)),
                context = app.call(
                    "ironstone.accounting.PaymentScreenServices.get#PaymentReviewContext",
                    Object.assign({organizationPartyId: org}, parameters)
                ),
                first = app.call(native + "execute#PaymentGatewayAction", context.paymentReview.confirmParameters),
                retry = app.call(native + "execute#PaymentGatewayAction", context.paymentReview.confirmParameters),
                resultPages = ["qvt", "html"].map(mode => app.page("Payments/PaymentDetail/Review", parameters, mode)),
                after = app.call(native + "get#PaymentFinanceDetail", {organizationPartyId: org, paymentId})
            return {detail, context, reviewPages, first, retry, resultPages, after}
        })
    },
    then({detail, context, reviewPages, first, retry, resultPages, after}) {
        detail.financePayment.capabilities.canGatewayAuthorize == true
        detail.financePayment.primaryAction == "authorize"
        detail.financePayment.gatewayActionRows
            .filter(row => row.primary)
            .map(row => row.action)
            .join() == "authorize"
        !detail.financePayment.stateActionRows.some(row => row.primary)
        detail.financePayment.gatewayActions.gatewayDescription == "Demonstration test gateway"
        context.reviewFound == true
        context.paymentReview.previewKind == "gateway"
        context.paymentReview.title == "Capture payment"
        context.paymentReview.canConfirm == true
        context.paymentReview.effectRows[0].afterText == "Delivered"
        reviewPages.every(
            page =>
                page.status === 200 &&
                !page.errors.length &&
                page.output.includes("Capture payment") &&
                page.output.includes("Confirm by")
        )
        first.outcome == "accepted"
        retry.alreadyApplied == true
        retry.paymentGatewayResponseId == first.paymentGatewayResponseId
        resultPages.every(page => page.status === 200 && !page.errors.length && page.output.includes("Gateway answer: Accepted"))
        after.payment.statusId == "PmntDelivered"
        after.gatewayRows.length >= 2
    }
})

feature("a receivables user sees the payment without gateway actions and cannot open gateway transactions", {
    when() {
        const paymentId = promised(),
            treasury = app.asUser("finance.treasury", () => app.page("Payments/PaymentDetail", {paymentId})),
            ar = app.asUser("finance.ar", () => app.page("Payments/PaymentDetail", {paymentId})),
            arTransactions = app.asUser("finance.ar", () => app.page("Payments/GatewayTransactions")),
            arPreview = app.asUser("finance.ar", () =>
                app.refusal(native + "preview#PaymentGatewayAction", {
                    organizationPartyId: org,
                    paymentId,
                    action: "authorize",
                    reason: "Not mine"
                })
            )
        return {paymentId, treasury, ar, arTransactions, arPreview}
    },
    then({paymentId, treasury, ar, arTransactions, arPreview}) {
        treasury.output.includes("Authorize payment")
        ar.output.includes(paymentId)
        !ar.output.includes("Authorize payment")
        arTransactions.output.includes("Treasury access is required")
        arPreview != ""
    }
})

feature("gateway transactions list a payment's answers with their outcome and refund payment", {
    when() {
        const paymentId = promised("30")
        return app.asUser("finance.treasury", () => {
            act(paymentId, "authorize")
            act(paymentId, "capture")
            const refund = act(paymentId, "refund", {amount: "10"}),
                listed = screen().execute("gatewayTransactions", {organizationPartyId: org, paymentId}),
                accepted = screen().execute("gatewayTransactions", {organizationPartyId: org, paymentId, outcome: "accepted"}),
                pages = ["qvt", "tui", "html"].map(mode => app.page("Payments/GatewayTransactions", {paymentId}, mode)),
                providers = app.call("ironstone.accounting.AccessServices.get#Choices", {
                    organizationPartyId: org,
                    choice: "paymentGatewayProviders",
                    selected: gatewayId
                })
            return {refund, listed, accepted, pages, providers}
        })
    },
    then({refund, listed, accepted, pages, providers}) {
        refund.outcome == "accepted"
        listed.records.length >= 3
        listed.records.some(row => row.refundPaymentId == refund.refundPaymentId && row.refundParameters != null)
        listed.records.every(row => row.providerName == "Demonstration test gateway")
        accepted.records.every(row => row.outcomeText == "Accepted")
        pages.every(page => page.status === 200 && !page.errors.length && page.output.includes(refund.refundPaymentId))
        providers.options.some(row => row.value == gatewayId && row.label == "Demonstration test gateway")
    }
})
