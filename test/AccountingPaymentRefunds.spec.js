// Refunds on the payment screens: the manual refund dialog's input, its retained review and result rendered through the
// Accounting mount (preview#PaymentRefund and refund#ReviewedPayment over Mantle's create#RefundPayment), the refund
// through the gateway dialog (refund#SinglePayment), and treasury-only access.
const app = ec.resource.script("component://mr-boss/test/AccountingSpecLib.js")
const screen = () => ec.resource.script("component://mr-boss/service/ironstone/accounting/Payments.js")
const native = "mantle.account.PaymentServices."
const org = app.ids.organizationPartyId
spec({
    setup() {
        login("john.doe")
        ec.artifactExecution.disableAuthz()
    }
})

// A delivered customer receipt into the organization's bank, made as the system so each feature has its own.
function receipt(amount = "50", extra = {}) {
    return app.call(
        native + "create#Payment",
        Object.assign(
            {
                fromPartyId: app.ids.paymentPartyId,
                toPartyId: org,
                paymentTypeEnumId: "PtInvoicePayment",
                paymentInstrumentEnumId: "PiCompanyCheck",
                toPaymentMethodId: "BOSS_ACCT_GW_BANK",
                amount,
                amountUomId: "USD",
                statusId: "PmntDelivered",
                effectiveDate: ec.user.nowTimestamp
            },
            extra
        )
    ).paymentId
}
const context = parameters =>
    app.call(
        "ironstone.accounting.PaymentScreenServices.get#PaymentContext",
        Object.assign({organizationPartyId: org}, parameters)
    )

feature("the manual refund dialog sends the reviewed fields and the chosen methods' ids only", {
    when() {
        return screen().refundInput({
            organizationPartyId: org,
            paymentId: "P1",
            amount: "5",
            effectiveDate: "2026-10-30",
            reason: "Return",
            referenceNumber: "R1",
            paymentInstrumentEnumId: "PiCompanyCheck",
            organizationMethodToken: "ORG_BANK~v1",
            counterpartyMethodToken: "CUSTOMER_BANK~v2",
            toPaymentMethodId: "SOMEONE_ELSE",
            operationKey: "x"
        })
    },
    then(input) {
        input.organizationPaymentMethodId == "ORG_BANK"
        input.counterpartyPaymentMethodId == "CUSTOMER_BANK"
        input.toPaymentMethodId == null
        input.operationKey == null
        input.amount == "5"
    }
})

feature("treasury reviews and confirms a manual refund on the Refunds tab; the review and its result render", {
    when() {
        const paymentId = receipt()
        return app.asUser("finance.treasury", () => {
            const detail = context({paymentId}).financePayment,
                input = screen().refundInput(Object.assign({}, detail.refundValue, {amount: "15", reason: "Unused deposit"})),
                preview = app.call(native + "preview#PaymentRefund", input),
                parameters = {paymentId, previewId: preview.previewId, previewKind: "refund"},
                review = context(parameters).paymentReview,
                reviewPages = ["qvt", "tui", "html"].map(mode => app.page("Payments/PaymentDetail/Refunds", parameters, mode)),
                first = app.call(native + "refund#ReviewedPayment", review.confirmParameters),
                retry = app.call(native + "refund#ReviewedPayment", review.confirmParameters),
                completed = context(parameters).paymentReview,
                resultPages = ["qvt", "html"].map(mode => app.page("Payments/PaymentDetail/Refunds", parameters, mode)),
                after = context({paymentId}).financePayment
            return {paymentId, detail, review, reviewPages, first, retry, completed, resultPages, after}
        })
    },
    then({paymentId, detail, review, reviewPages, first, retry, completed, resultPages, after}) {
        detail.capabilities.canPreviewRefund == true
        toDecimal(detail.refundValue.amount).eq(50)
        detail.refundValue.organizationMethodToken.startsWith("BOSS_ACCT_GW_BANK~")
        review.isRefund == true
        review.canConfirm == true
        review.reviewedMethods.organization.paymentMethodId == "BOSS_ACCT_GW_BANK"
        review.fundingRows.find(row => row.label == "Available to refund").afterAmount == 35
        reviewPages.every(
            page =>
                page.status === 200 &&
                !page.errors.length &&
                page.output.includes("Reviewed refund") &&
                page.output.includes("Confirm refund")
        )
        first.statusId == "PmntDelivered"
        retry.alreadyApplied == true
        retry.refundPaymentId == first.refundPaymentId
        completed.hasResults == true
        completed.actualRefundRows[0].paymentId == first.refundPaymentId
        resultPages.every(page => page.status === 200 && !page.errors.length && page.output.includes("Refund completed"))
        after.refundRows.some(row => row.paymentId == first.refundPaymentId)
        after.refundSummaryRows.find(row => row.label == "Available to refund").amount == 35
        first.paymentId == paymentId
    }
})

feature("a receivables user reads the receipt but is offered no refund and cannot review one", {
    when() {
        const paymentId = receipt("20")
        return app.asUser("finance.ar", () => {
            const detail = context({paymentId}).financePayment,
                page = app.page("Payments/PaymentDetail/Refunds", {paymentId}),
                refused = app.refusal(native + "preview#PaymentRefund", {
                    organizationPartyId: org,
                    paymentId,
                    amount: "5",
                    effectiveDate: ec.user.nowTimestamp,
                    reason: "Not mine"
                })
            return {detail, page, refused}
        })
    },
    then({detail, page, refused}) {
        detail.capabilities.canPreviewRefund != true
        page.status == 200
        !page.output.includes("Review refund")
        page.output.includes("Refunds require treasury access")
        refused != ""
    }
})

feature("a refund through the gateway dialog delivers a refund payment linked to the captured payment", {
    when() {
        const paymentId = receipt("30", {
            statusId: "PmntPromised",
            paymentInstrumentEnumId: "PiAch",
            paymentMethodId: "BOSS_ACCT_GW_CUSTOMER_BANK",
            paymentGatewayConfigId: "BOSS_ACCT_GW_TEST"
        })
        return app.asUser("finance.treasury", () => {
            const run = (action, extra = {}) => {
                const preview = app.call(
                    native + "preview#PaymentGatewayAction",
                    screen().gatewayActionInput(
                        Object.assign({organizationPartyId: org, paymentId, action, reason: "Customer request"}, extra)
                    )
                )
                return app.call(
                    native + "execute#PaymentGatewayAction",
                    context({paymentId, previewId: preview.previewId, previewKind: "gateway"}).paymentReview.confirmParameters
                )
            }
            run("authorize")
            run("capture")
            const before = context({paymentId}).financePayment,
                refunded = run("refund", {amount: "12"}),
                after = context({paymentId}).financePayment,
                page = app.page("Payments/PaymentDetail/Refunds", {paymentId})
            return {before, refunded, after, page}
        })
    },
    then({before, refunded, after, page}) {
        before.capabilities.canGatewayRefund == true
        toDecimal(before.gatewayRefundValue.amount).eq(30)
        refunded.outcome == "accepted"
        refunded.refundStatusId == "PmntDelivered"
        after.refundRows.some(row => row.paymentId == refunded.refundPaymentId)
        after.refundSummaryRows.find(row => row.label == "Available to refund").amount == 18
        page.output.includes(refunded.refundPaymentId)
    }
})
