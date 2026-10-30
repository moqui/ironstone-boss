const transferHelper = ec.resource.script("component://mr-boss/test/AccountingSpecLib.js")
const transferScreen = () => ec.resource.script("component://mr-boss/service/ironstone/accounting/Payments.js")
const transferNative = (name, parameters) => transferHelper.call("mantle.account.PaymentServices." + name, parameters)

function transferSelection() {
    const organizationPartyId = transferHelper.ids.organizationPartyId,
        effectiveDate = ec.l10n.format(ec.user.nowTimestamp, "yyyy-MM-dd"),
        currencyUomId = transferNative("get#PaymentFinanceDetail", {
            organizationPartyId,
            paymentId: transferHelper.ids.paymentDeliveredId
        }).payment.currencyUomId,
        methods = transferNative("find#InternalTransferMethods", {
            organizationPartyId,
            currencyUomId,
            effectiveDate,
            selectedIdList: ["BOSS_ACCT_PAY_CASH", "BOSS_ACCT_GW_BANK"],
            pageSize: 1
        }),
        from = methods.selectedRows.find(row => row.paymentMethodId === "BOSS_ACCT_PAY_CASH"),
        to = methods.selectedRows.find(row => row.paymentMethodId === "BOSS_ACCT_GW_BANK"),
        fees = transferNative("find#InternalTransferFeeAccounts", {
            organizationPartyId,
            currencyUomId,
            effectiveDate,
            pageSize: 1
        }),
        fee = fees.rows[0]
    if (!methods.complete || !from?.version || !to?.version)
        throw new Error("Two authorized organization-owned transfer method fixtures are required")
    if (!fees.complete || !fee?.glAccountId) throw new Error("An assigned eligible transfer fee expense account is required")
    return {
        organizationPartyId,
        effectiveDate,
        currencyUomId,
        methods,
        fees,
        from,
        to,
        fee,
        input: {
            organizationPartyId,
            fromPaymentMethodId: from.paymentMethodId,
            fromMethodVersion: from.version,
            toPaymentMethodId: to.paymentMethodId,
            toMethodVersion: to.version,
            amount: "10",
            currencyUomId,
            effectiveDate,
            feeAmount: "1",
            feeGlAccountId: fee.glAccountId,
            referenceNumber: "Reviewed transfer selection",
            reason: "Move organization cash and review the explicit fee"
        }
    }
}

function transferPacket(changes = {}) {
    return {
        previewId: "reviewed-transfer",
        previewKind: "internalTransfer",
        internalTransferId: "reviewed-pair",
        status: "complete",
        operationKey: "recorded-transfer-key",
        principalAmount: "10",
        feeAmount: "1",
        totalAmount: "11",
        currencyUomId: "USD",
        accountingDateText: "2026-10-30",
        capabilities: {canReadLedger: true},
        results: {
            transferId: "reviewed-pair",
            internalTransferId: "reviewed-pair",
            operationKey: "recorded-transfer-key",
            fromPaymentId: "actual-outgoing",
            toPaymentId: "actual-incoming",
            legRows: [
                {leg: "outgoing", paymentId: "actual-outgoing", amount: "11"},
                {leg: "incoming", paymentId: "actual-incoming", amount: "10"}
            ],
            acctgTransIds: ["actual-outgoing-posting", "actual-incoming-posting"],
            outputRows: [
                {paymentId: "actual-outgoing", outputId: "out-detail", outputType: "detail", canOpen: true},
                {paymentId: "actual-incoming", outputId: "in-detail", outputType: "detail", canOpen: true},
                {paymentId: "another-payment", outputId: "foreign-detail", outputType: "detail", canOpen: true},
                {paymentId: "actual-outgoing", outputId: "wrong-receipt", outputType: "receipt", canOpen: true}
            ]
        },
        ...changes
    }
}

function transferPage(path, parameters, mode) {
    // The real mount supplies authorized shared destinations; -4 selects this payment leaf below webroot/apps.
    const renderer = ec.screen.makeTest().rootScreen("component://webroot/screen/webroot.xml").renderMode(mode)
    if (mode === "qvt") renderer.withStaticData()
    const rendered = renderer.render("apps/Accounting/Payments/" + path, {...parameters, lastStandalone: "-4"}, null),
        output = String(rendered.output || ""),
        links = []
    if (mode === "tui") {
        const pending = [JSON.parse(output)]
        while (pending.length) {
            const value = pending.pop()
            if (Array.isArray(value)) pending.push(...value)
            else if (value && typeof value === "object") {
                if (value.t === "link") links.push(value)
                pending.push(...Object.values(value).filter(item => item && typeof item === "object"))
            }
        }
    } else
        for (const match of output.matchAll(/<(a|m-link)\b([^>]*)>([\s\S]*?)<\/\1>/g)) {
            const href = match[2].match(/\bhref="([^"]*)"/)
            if (href)
                links.push({
                    url: href[1].replace(/&amp;/g, "&"),
                    disabled: /\baria-disabled="true"|\bclass="[^"]*\bdisabled\b/.test(match[2])
                })
        }
    const parameter = (url, name) => {
        const value = String(url || "").match(new RegExp("[?&]" + name + "=([^&#]*)"))
        return value ? decodeURIComponent(value[1].replace(/\+/g, " ")) : null
    }
    return {
        mode,
        status: rendered.status,
        output,
        errors: Array.from(rendered.errorMessages || []).concat(
            output.match(/(?:Error rendering|Exception in render)[^\n<]*/g) || []
        ),
        references: links.map(link => ({
            url: link.url,
            disabled: link.disabled === true,
            paymentId: parameter(link.url, "paymentId"),
            recordId: parameter(link.url, "recordId"),
            outputId: parameter(link.url, "outputId"),
            outputType: parameter(link.url, "outputType")
        }))
    }
}

feature("transfer preparation decodes exact reviewed method revisions and excludes financial result overrides", {
    when() {
        return {
            input: transferScreen().transferInput({
                organizationPartyId: "organization",
                fromMethodToken: "reviewed-from~old-from",
                toMethodToken: "reviewed-to~old-to",
                amount: "10",
                currencyUomId: "USD",
                effectiveDate: "2026-10-30",
                feeAmount: "1",
                feeGlAccountId: "reviewed-expense",
                referenceNumber: "Original reference",
                reason: "Original reason",
                fromPaymentMethodId: "forged-method",
                fromMethodVersion: "fresh-without-review",
                fromPaymentId: "forged-cash",
                totalAmount: "999",
                glAccountId: "forged-cash-account",
                transitGlAccountId: "forged-transit",
                status: "complete"
            })
        }
    },
    then({input}) {
        input.fromPaymentMethodId == "reviewed-from"
        input.fromMethodVersion == "old-from"
        input.toPaymentMethodId == "reviewed-to"
        input.toMethodVersion == "old-to"
        input.amount == "10"
        input.feeGlAccountId == "reviewed-expense"
        input.referenceNumber == "Original reference"
        !["fromPaymentId", "totalAmount", "glAccountId", "transitGlAccountId", "status"].some(field => field in input)
    }
})

feature("transfer preparation restores retained tokens and the canonical day without re-reviewing methods", {
    when() {
        return {
            value: transferScreen().transferPreparedValue({
                fromPaymentMethodId: "from",
                fromMethodVersion: "reviewed-from",
                toPaymentMethodId: "to",
                toMethodVersion: "reviewed-to",
                principalAmount: "10",
                feeAmount: "1",
                feeGlAccountId: "reviewed-expense",
                currencyUomId: "USD",
                accountingDateText: "2026-10-30",
                referenceNumber: "Retained reference",
                reason: "Retained reason"
            })
        }
    },
    then({value}) {
        value.fromMethodToken == "from~reviewed-from"
        value.toMethodToken == "to~reviewed-to"
        value.effectiveDate == "2026-10-30"
        value.amount == "10"
        value.feeAmount == "1"
        value.feeGlAccountId == "reviewed-expense"
        value.referenceNumber == "Retained reference"
        value.reason == "Retained reason"
    }
})

feature("transfer review keeps one preview-bound confirmation key and displays only native movement amounts", {
    when() {
        return transferHelper.asUser("finance.treasury", () => {
            const retained = transferPacket({
                    status: "review",
                    operationKey: null,
                    canApply: true,
                    results: null,
                    before: {principalAmount: "0", feeAmount: "0"},
                    after: {principalAmount: "10", feeAmount: "1", outgoingCashAmount: "11", incomingCashAmount: "10"},
                    capabilities: {canReadLedger: false}
                }),
                module = transferScreen()
            return {
                first: module.transferPresentation(retained, "organization"),
                reopened: module.transferPresentation(retained, "organization"),
                other: module.transferPresentation({...retained, previewId: "other-review"}, "organization"),
                unavailable: module.transferPresentation({...retained, canApply: false}, "organization"),
                incomplete: module.transferPresentation({...retained, totalAmount: null}, "organization")
            }
        })
    },
    then({first, reopened, other, unavailable, incomplete}) {
        first.canConfirm == true
        first.hasResults == false
        first.operationKey == reopened.operationKey
        first.operationKey != other.operationKey
        first.operationKey.length <= 40
        first.movementRows.find(row => row.label === "Outgoing cash").afterAmount == "11"
        first.movementRows.find(row => row.label === "Incoming cash").beforeAmount == null
        first.movementRows.some(row => row.label === "Transit net") == false
        first.ledgerRows.length == 0
        unavailable.canConfirm == false
        incomplete.canConfirm == false
        first.editParameters.transferPreviewId == ""
        first.editParameters.operationKey == ""
        first.editParameters.transferEditPreviewId == "reviewed-transfer"
    }
})

feature("completed transfer links use the exact pair legs and only child-owned detail outputs", {
    when() {
        return {view: transferScreen().transferPresentation(transferPacket(), "organization")}
    },
    then({view}) {
        view.hasResults == true
        view.operationKey == "recorded-transfer-key"
        view.actualLegRows.length == 2
        view.actualLegRows[0].canOpen == true
        view.actualLegRows[0].recordParameters.paymentId == "actual-outgoing"
        view.actualLegRows[1].recordParameters.recordId == "actual-incoming"
        view.postingRows.length == 2
        view.outputRows[0].canOpen == true
        view.outputRows[0].outputParameters.paymentId == "actual-outgoing"
        view.outputRows[1].outputParameters.recordId == "actual-incoming"
        view.outputRows[2].canOpen == false
        view.outputRows[2].outputParameters.paymentId == ""
        view.outputRows[3].canOpen == false
    }
})

feature("foreign pair identities, mismatched recorded keys and false completion cannot expose actual transfer claims", {
    when() {
        const module = transferScreen(),
            base = transferPacket(),
            invalid = [
                {...base, internalTransferId: "another-retained-pair"},
                {...base, internalTransferId: null},
                {...base, results: {...base.results, operationKey: "another-confirmation"}},
                {...base, results: {...base.results, internalTransferId: "another-alias"}},
                {...base, results: {...base.results, fromPaymentId: "same", toPaymentId: "same"}},
                {...base, status: "review"}
            ]
        return {
            views: invalid.map(value => module.transferPresentation(value, "organization")),
            invalidLeg: module.transferPresentation(
                {
                    ...base,
                    results: {...base.results, legRows: [{leg: "outgoing", paymentId: "another-payment", amount: "11"}]}
                },
                "organization"
            )
        }
    },
    then({views, invalidLeg}) {
        views.every(view => !view.hasResults && !view.actualLegRows.length && !view.postingRows.length && !view.outputRows.length)
        invalidLeg.actualLegRows[0].canOpen == false
        invalidLeg.actualLegRows[0].recordParameters.paymentId == ""
        invalidLeg.actualLegRows[0].recordParameters.recordId == ""
    }
})

feature("the same real method selection permits Treasury and refuses AR transfer access without leaking bank data", {
    when() {
        const allowed = transferHelper.asUser("finance.treasury", () => {
            const selection = transferSelection(),
                preview = transferNative("preview#InternalTransfer", selection.input),
                parameters = {organizationPartyId: selection.organizationPartyId, transferPreviewId: preview.previewId},
                context = transferHelper.call("ironstone.accounting.PaymentScreenServices.get#PaymentListContext", parameters),
                prepared = transferHelper.call("ironstone.accounting.PaymentScreenServices.get#PaymentListContext", {
                    organizationPartyId: selection.organizationPartyId,
                    transferEditPreviewId: preview.previewId
                }),
                pages = ["qvt", "tui"].map(mode => transferPage("Payments", parameters, mode))
            return {selection, preview, context, prepared, pages}
        })
        return {
            allowed,
            refused: transferHelper.asUser("finance.ar", () => ({
                preview: transferHelper.refusal(
                    "mantle.account.PaymentServices.preview#InternalTransfer",
                    allowed.selection.input
                ),
                methods: transferHelper.refusal("mantle.account.PaymentServices.find#InternalTransferMethods", {
                    organizationPartyId: allowed.selection.organizationPartyId,
                    currencyUomId: allowed.selection.currencyUomId,
                    effectiveDate: allowed.selection.effectiveDate,
                    selectedIdList: [allowed.selection.from.paymentMethodId, allowed.selection.to.paymentMethodId]
                }),
                context: transferHelper.call("ironstone.accounting.PaymentScreenServices.get#PaymentListContext", {
                    organizationPartyId: allowed.selection.organizationPartyId,
                    transferPreviewId: allowed.preview.previewId
                })
            }))
        }
    },
    then({allowed, refused}) {
        allowed.selection.methods.complete == true
        allowed.preview.canApply == true
        allowed.context.transferReview.canConfirm == true
        allowed.context.transferReview.hasResults == false
        allowed.context.transferReview.ledgerRows.length == 0
        allowed.context.transferReview.operationKey.length <= 40
        allowed.prepared.transferValue.fromMethodToken ==
            allowed.selection.from.paymentMethodId + "~" + allowed.selection.from.version
        allowed.prepared.transferValue.toMethodToken == allowed.selection.to.paymentMethodId + "~" + allowed.selection.to.version
        allowed.prepared.transferValue.effectiveDate == allowed.selection.effectiveDate
        allowed.pages.every(
            page => page.status === 200 && !page.errors.length && page.output.includes("Reviewed internal transfer")
        )
        allowed.pages.every(page => page.output.includes(allowed.preview.accountingDateText))
        refused.preview.includes("PERMISSION_DENIED")
        refused.methods.includes("PERMISSION_DENIED")
        refused.context.paymentList.canTransfer == false
        refused.context.transferUnavailable == true
        refused.context.paymentList.hasTransferReview == false
        !/"(?:accountNumber|routingNumber|cardNumber|credentials|providerBody)"/.test(JSON.stringify(allowed))
    }
})

feature("actual fee-bearing transfers retain exact paired results, detail files and role-scoped postings", {
    where: [
        {username: "finance.treasury", expectLedger: false},
        {username: "finance.admin", expectLedger: true}
    ],
    when({username, expectLedger}) {
        return transferHelper.asUser(username, () => {
            const selection = transferSelection(),
                operationKey = "app-trf-" + ec.user.randomString(16),
                preview = transferNative("preview#InternalTransfer", {
                    ...selection.input,
                    referenceNumber: operationKey,
                    reason: "Actual paired cash transfer with an explicit expense fee"
                }),
                initial = transferHelper.call("ironstone.accounting.PaymentScreenServices.get#PaymentListContext", {
                    organizationPartyId: selection.organizationPartyId,
                    transferPreviewId: preview.previewId
                }),
                confirmed = transferNative("create#InternalTransfer", {
                    previewId: preview.previewId,
                    inputFingerprint: preview.inputFingerprint,
                    operationKey
                }),
                retained = transferNative("get#InternalTransferPreview", {
                    organizationPartyId: selection.organizationPartyId,
                    previewId: preview.previewId
                }),
                retried = transferNative("create#InternalTransfer", {
                    previewId: preview.previewId,
                    inputFingerprint: preview.inputFingerprint,
                    operationKey
                }),
                parameters = {organizationPartyId: selection.organizationPartyId, transferPreviewId: preview.previewId},
                presented = transferHelper.call("ironstone.accounting.PaymentScreenServices.get#PaymentListContext", parameters),
                outputRows = Array.from(retained.results.outputRows),
                postingIds = Array.from(retained.results.acctgTransIds || []),
                pages = ["qvt", "tui", "html"].map(mode => transferPage("Payments", parameters, mode)),
                legs = [confirmed.fromPaymentId, confirmed.toPaymentId].map(paymentId => {
                    const detail = transferNative("get#PaymentFinanceDetail", {
                            organizationPartyId: selection.organizationPartyId,
                            paymentId
                        }),
                        context = transferHelper.call("ironstone.accounting.PaymentScreenServices.get#PaymentContext", {
                            organizationPartyId: selection.organizationPartyId,
                            paymentId
                        }),
                        page = transferPage(
                            "PaymentDetail",
                            {organizationPartyId: selection.organizationPartyId, paymentId, recordId: paymentId},
                            "tui"
                        )
                    return {detail, context, page}
                })
            return {
                selection,
                preview,
                initial,
                confirmed,
                retained,
                retried,
                presented,
                operationKey,
                expectLedger,
                postingIdJson: JSON.stringify(postingIds),
                postingIds,
                outputRows,
                pages,
                legs
            }
        })
    },
    then({
        selection,
        preview,
        initial,
        confirmed,
        retained,
        retried,
        presented,
        operationKey,
        expectLedger,
        postingIdJson,
        postingIds,
        outputRows,
        pages,
        legs
    }) {
        preview.canApply == true
        initial.transferReview.canConfirm == true
        initial.transferReview.hasResults == false
        initial.transferReview.actualLegRows.length == 0
        toDecimal(preview.principalAmount).eq("10")
        toDecimal(preview.feeAmount).eq("1")
        toDecimal(preview.totalAmount).eq("11")
        toDecimal(preview.after.outgoingCashAmount).eq("11")
        toDecimal(preview.after.incomingCashAmount).eq("10")
        toDecimal(preview.after.transitNetAmount).isZero()
        preview.feeAccountLabel.includes(selection.fee.accountName)
        preview.accountingDateText == selection.effectiveDate
        confirmed.transferId == preview.internalTransferId
        confirmed.internalTransferId == confirmed.transferId
        confirmed.fromPaymentId != confirmed.toPaymentId
        confirmed.reasonCode == "INTERNAL_TRANSFER_COMPLETED"
        confirmed.operationKey == operationKey
        retained.operationKey == operationKey
        retained.internalTransferId == confirmed.transferId
        presented.transferReview.hasResults == true
        presented.transferReview.operationKey == operationKey
        retried.alreadyApplied == true
        retried.fromPaymentId == confirmed.fromPaymentId
        retried.toPaymentId == confirmed.toPaymentId
        retried.transferId == confirmed.transferId
        JSON.stringify(retried.outputRows.map(row => row.outputId)) == JSON.stringify(outputRows.map(row => row.outputId))
        expectLedger ? confirmed.acctgTransIds.length === 2 : !("acctgTransIds" in confirmed)
        JSON.stringify(presented.transferReview.postingRows.map(row => row.acctgTransId)) == postingIdJson
        Boolean(presented.transferReview.ledgerRows.length) == expectLedger
        outputRows.length == 2
        outputRows.every(row => row.outputType === "detail" && row.canOpen === true)
        outputRows.some(row => row.paymentId === confirmed.fromPaymentId)
        outputRows.some(row => row.paymentId === confirmed.toPaymentId)
        presented.transferReview.actualLegRows.every(row => row.canOpen === true)
        presented.transferReview.outputRows.every(row => row.canOpen === true && row.outputParameters.sourceVersion === "")
        legs.every(
            leg => leg.detail.payment.paymentTypeEnumId === "PtInternalTransfer" && leg.detail.applicationRows.length === 0
        )
        toDecimal(legs[0].detail.payment.amount).eq("11")
        toDecimal(legs[1].detail.payment.amount).eq("10")
        legs[0].detail.payment.cashDirection == "outgoing"
        legs[1].detail.payment.cashDirection == "incoming"
        legs.every(leg => leg.detail.transferSummary.internalTransferId === confirmed.transferId)
        legs.every(leg => leg.context.financePayment.transferLegRows.length === 2)
        legs.every(
            leg =>
                leg.detail.capabilities.canPrintDetail === true &&
                leg.detail.capabilities.canPrintReceipt === false &&
                leg.detail.capabilities.canPrintCheck === false
        )
        legs.every(
            leg =>
                leg.page.status === 200 &&
                !leg.page.errors.length &&
                leg.page.output.includes(confirmed.fromPaymentId) &&
                leg.page.output.includes(confirmed.toPaymentId)
        )
        pages.every(page => page.status === 200 && !page.errors.length && page.output.includes("Internal transfer completed"))
        pages.every(page => page.output.includes(confirmed.transferId) && page.output.includes(preview.accountingDateText))
        pages.every(page =>
            outputRows.every(
                row =>
                    page.output.includes(row.fileName) &&
                    page.references.some(
                        link =>
                            !link.disabled &&
                            link.url.includes("/Accounting/Payments/PaymentPrint") &&
                            link.outputId === row.outputId &&
                            link.outputType === "detail" &&
                            link.paymentId === row.paymentId &&
                            link.recordId === row.paymentId
                    )
            )
        )
        pages.every(page => postingIds.every(id => page.output.includes(id)))
        !/"(?:accountNumber|routingNumber|cardNumber|credentials|providerBody)"/.test(JSON.stringify({presented, retained, legs}))
    }
})
