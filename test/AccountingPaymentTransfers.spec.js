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
            // the demo cash method has no bank party to pay the fee to
            feePartyId: transferHelper.ids.paymentPartyId,
            referenceNumber: "Reviewed transfer selection",
            reason: "Move organization cash and review the explicit fee"
        }
    }
}

function transferPacket(changes = {}) {
    return {
        previewId: "reviewed-transfer",
        previewKind: "transfer",
        status: "complete",
        operationKey: "recorded-transfer-key",
        principalAmount: "10",
        feeAmount: "1",
        totalAmount: "11",
        currencyUomId: "USD",
        accountingDateText: "2026-10-30",
        capabilities: {canReadLedger: true},
        results: {
            paymentId: "actual-transfer",
            feePaymentId: "actual-fee",
            operationKey: "recorded-transfer-key",
            legRows: [
                {leg: "transfer", paymentId: "actual-transfer", amount: "10"},
                {leg: "fee", paymentId: "actual-fee", amount: "1"}
            ],
            acctgTransIds: ["transfer-outgoing", "transfer-incoming", "fee-posting"],
            outputRows: [
                {paymentId: "actual-transfer", outputId: "transfer-detail", outputType: "detail", canOpen: true},
                {paymentId: "another-payment", outputId: "foreign-detail", outputType: "detail", canOpen: true},
                {paymentId: "actual-transfer", outputId: "wrong-receipt", outputType: "receipt", canOpen: true}
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
            input: transferScreen().execute("transferInput", {
                organizationPartyId: "organization",
                fromMethodToken: "reviewed-from~old-from",
                toMethodToken: "reviewed-to~old-to",
                amount: "10",
                currencyUomId: "USD",
                effectiveDate: "2026-10-30",
                feeAmount: "1",
                feeGlAccountId: "reviewed-expense",
                feePartyId: "fee-party",
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
        input.feePartyId == "fee-party"
        input.referenceNumber == "Original reference"
        !["fromPaymentId", "totalAmount", "glAccountId", "transitGlAccountId", "status"].some(field => field in input)
    }
})

feature("transfer preparation restores retained tokens and the canonical day without re-reviewing methods", {
    when() {
        return {
            value: transferScreen().execute("transferPreparedValue", {
                fromPaymentMethodId: "from",
                fromMethodVersion: "reviewed-from",
                toPaymentMethodId: "to",
                toMethodVersion: "reviewed-to",
                principalAmount: "10",
                feeAmount: "1",
                feeGlAccountId: "reviewed-expense",
                feePartyId: "fee-party",
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
        value.feePartyId == "fee-party"
        value.referenceNumber == "Retained reference"
        value.reason == "Retained reason"
    }
})

feature("transfer review keeps one preview-bound confirmation key and plans the transfer and fee payments", {
    when() {
        return transferHelper.asUser("finance.treasury", () => {
            const retained = transferPacket({
                    status: "review",
                    operationKey: null,
                    canApply: true,
                    results: null,
                    legRows: [
                        {leg: "transfer", amount: "10"},
                        {leg: "fee", amount: "1"}
                    ],
                    ledgerPreview: [{leg: "outgoing", lines: [{glAccountId: "transit", debitCreditFlag: "D", amount: "10"}]}],
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
        first.plannedLegRows.map(row => row.legText).join() == "Transfer,Fee"
        first.ledgerRows.length == 0
        unavailable.canConfirm == false
        incomplete.canConfirm == false
        first.editParameters.transferPreviewId == ""
        first.editParameters.operationKey == ""
        first.editParameters.transferEditPreviewId == "reviewed-transfer"
    }
})

feature("completed transfer links open the exact transfer and fee payments and only the transfer's detail", {
    when() {
        const module = transferScreen(),
            base = transferPacket()
        return {
            view: module.transferPresentation(base, "organization"),
            claims: [
                {...base, results: {...base.results, operationKey: "another-confirmation"}},
                {...base, results: {...base.results, paymentId: null}},
                {...base, status: "review"}
            ].map(value => module.transferPresentation(value, "organization")),
            invalidLeg: module.transferPresentation(
                {...base, results: {...base.results, legRows: [{leg: "transfer", paymentId: "another-payment", amount: "10"}]}},
                "organization"
            )
        }
    },
    then({view, claims, invalidLeg}) {
        view.hasResults == true
        view.operationKey == "recorded-transfer-key"
        view.actualLegRows.map(row => row.legText + ":" + row.recordParameters.paymentId).join() ==
            "Transfer:actual-transfer,Fee:actual-fee"
        view.actualLegRows.every(row => row.canOpen)
        view.postingRows.length == 3
        view.outputRows[0].canOpen == true
        view.outputRows[0].outputParameters.recordId == "actual-transfer"
        view.outputRows[1].canOpen == false
        view.outputRows[1].outputParameters.paymentId == ""
        view.outputRows[2].canOpen == false
        claims.every(claim => !claim.hasResults && !claim.actualLegRows.length)
        claims.every(claim => !claim.postingRows.length && !claim.outputRows.length)
        invalidLeg.actualLegRows[0].canOpen == false
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

feature("a fee-bearing transfer from the demo cash, its fee paid to a chosen party, shows its fee payment on its detail", {
    where: [
        {username: "finance.treasury", expectLedger: false},
        {username: "finance.admin", expectLedger: true}
    ],
    when({username, expectLedger}) {
        return transferHelper.asUser(username, () => {
            const selection = transferSelection(),
                // the BOSS form's fields: reviewed method tokens and the party paid the fee
                reviewed = transferHelper.call("ironstone.accounting.PaymentScreenServices.preview#InternalTransfer", {
                    organizationPartyId: selection.organizationPartyId,
                    fromMethodToken: selection.from.paymentMethodId + "~" + selection.from.version,
                    toMethodToken: selection.to.paymentMethodId + "~" + selection.to.version,
                    amount: "10",
                    currencyUomId: selection.currencyUomId,
                    effectiveDate: selection.effectiveDate,
                    feeAmount: "1",
                    feeGlAccountId: selection.fee.glAccountId,
                    feePartyId: selection.input.feePartyId,
                    referenceNumber: "Fee-bearing cash transfer",
                    reason: "Actual paired cash transfer with an explicit expense fee"
                }),
                preview = transferNative("get#InternalTransferPreview", {
                    organizationPartyId: selection.organizationPartyId,
                    previewId: reviewed.previewId
                }),
                operationKey = "app-trf-" + preview.previewId,
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
                legs = [confirmed.paymentId, confirmed.feePaymentId].map(paymentId => {
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
        preview.feePartyId == selection.input.feePartyId
        initial.transferReview.canConfirm == true
        initial.transferReview.hasResults == false
        initial.transferReview.actualLegRows.length == 0
        toDecimal(preview.principalAmount).eq("10")
        toDecimal(preview.feeAmount).eq("1")
        toDecimal(preview.totalAmount).eq("11")
        preview.feeAccountLabel.includes(selection.fee.accountName)
        preview.accountingDateText == selection.effectiveDate
        confirmed.reasonCode == "INTERNAL_TRANSFER_COMPLETED"
        confirmed.operationKey == operationKey
        confirmed.paymentId != confirmed.feePaymentId
        retained.operationKey == operationKey
        retained.results.paymentId == confirmed.paymentId
        presented.transferReview.hasResults == true
        presented.transferReview.operationKey == operationKey
        retried.alreadyApplied == true
        retried.paymentId == confirmed.paymentId
        retried.feePaymentId == confirmed.feePaymentId
        JSON.stringify(retried.outputRows.map(row => row.outputId)) == JSON.stringify(outputRows.map(row => row.outputId))
        expectLedger ? confirmed.acctgTransIds.length === 3 : confirmed.acctgTransIds == null
        JSON.stringify(presented.transferReview.postingRows.map(row => row.acctgTransId)) == postingIdJson
        Boolean(presented.transferReview.ledgerRows.length) == expectLedger
        outputRows.length == 1
        outputRows[0].outputType == "detail" && outputRows[0].canOpen === true
        outputRows[0].paymentId == confirmed.paymentId
        presented.transferReview.actualLegRows.every(row => row.canOpen === true)
        presented.transferReview.outputRows.every(row => row.canOpen === true && row.outputParameters.sourceVersion === "")
        legs[0].detail.payment.paymentTypeEnumId == "PtInternalTransfer"
        legs[1].detail.payment.paymentTypeEnumId == "PtDisbursement"
        legs.every(leg => leg.detail.applicationRows.length === 0)
        toDecimal(legs[0].detail.payment.amount).eq("10")
        toDecimal(legs[1].detail.payment.amount).eq("1")
        legs[0].detail.payment.cashDirection == "transfer"
        legs[1].detail.payment.cashDirection == "outgoing"
        legs[0].detail.transferSummary.paymentId == confirmed.paymentId
        legs[0].detail.transferSummary.feePaymentId == confirmed.feePaymentId
        legs[0].detail.transferSummary.feePartyId == selection.input.feePartyId
        legs[0].context.financePayment.feeParameters.paymentId == confirmed.feePaymentId
        legs[0].page.output.includes(confirmed.feePaymentId)
        legs[0].context.financePayment.transferLegRows.length == 2
        legs[0].detail.capabilities.canPrintDetail == true
        legs[0].detail.capabilities.canPrintReceipt == false
        legs[0].detail.capabilities.canPrintCheck == false
        legs.every(leg => leg.page.status === 200 && !leg.page.errors.length)
        legs[0].page.output.includes(confirmed.paymentId)
        pages.every(page => page.status === 200 && !page.errors.length && page.output.includes("Internal transfer completed"))
        pages.every(page => page.output.includes(confirmed.paymentId) && page.output.includes(preview.accountingDateText))
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
