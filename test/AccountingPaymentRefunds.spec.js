const refundHelper = ec.resource.script("component://mr-boss/test/AccountingSpecLib.js")
const refundScreen = () => ec.resource.script("component://mr-boss/service/ironstone/accounting/Payments.js")
const refundNative = "mantle.account.PaymentServices."

feature("refund preparation decodes only the original reviewed source, draft, methods and evidence", {
    when() {
        return {
            input: refundScreen().refundInput({
                organizationPartyId: "organization",
                paymentId: "original-cash",
                sourceVersion: "old-original",
                amount: "20",
                effectiveDate: "2026-10-30",
                reason: "Return agreed",
                referenceNumber: "RETURN-20",
                paymentInstrumentEnumId: "PiCash",
                refundDraftToken: "opposite-draft~old-draft",
                organizationMethodToken: "cash-method~old-method",
                counterpartyMethodToken: "customer-method~old-customer",
                evidenceTokenList: ["evidence~old-file"],
                refundPaymentId: "forged-child",
                providerState: "accepted",
                financialState: "completed",
                glAccountId: "forged-account"
            })
        }
    },
    then({input}) {
        input.paymentId == "original-cash"
        input.sourceVersion == "old-original"
        input.refundPaymentId == "opposite-draft"
        input.refundSourceVersion == "old-draft"
        input.organizationPaymentMethodId == "cash-method"
        input.organizationMethodVersion == "old-method"
        input.counterpartyMethodVersion == "old-customer"
        input.evidenceContentIdList == ["evidence"]
        input.evidenceVersions == {evidence: "old-file"}
        !["providerState", "financialState", "glAccountId"].some(field => field in input)
    }
})

feature("refund preparation restored from a retained review keeps the exact old selected revisions", {
    when() {
        return {
            value: refundScreen().refundPreparedValue({
                sourceVersion: "reviewed-source",
                paymentSummary: {amount: "20", accountingDateText: "2026-10-30"},
                reason: "Original reason",
                referenceNumber: "Original reference",
                refundPaymentId: "draft",
                refundSourceVersion: "reviewed-draft",
                refundDefaults: {
                    paymentInstrumentEnumId: "PiCash",
                    organizationPaymentMethodId: "method",
                    organizationMethodVersion: "reviewed-method"
                },
                evidenceRows: [{paymentContentId: "file", version: "reviewed-bytes"}]
            })
        }
    },
    then({value}) {
        value.sourceVersion == "reviewed-source"
        value.effectiveDate == "2026-10-30"
        value.amount == "20"
        value.reason == "Original reason"
        value.referenceNumber == "Original reference"
        value.refundDraftToken == "draft~reviewed-draft"
        value.organizationMethodToken == "method~reviewed-method"
        value.evidenceTokenList == ["file~reviewed-bytes"]
    }
})

feature("refund confirmation is retained per preview and cannot treat original cash identity as completion", {
    when() {
        return refundHelper.asUser("finance.treasury", () => {
            const module = refundScreen(),
                original = {
                    paymentId: "original",
                    previewId: "refund-review",
                    previewKind: "refund",
                    status: "review",
                    canApply: true,
                    paymentSummary: {paymentId: "original", amount: "20", currencyUomId: "USD"}
                }
            return {
                first: module.refundReviewPresentation(original, "organization"),
                reopened: module.refundReviewPresentation(original, "organization"),
                other: module.refundReviewPresentation({...original, previewId: "other-refund-review"}, "organization"),
                unavailable: module.refundReviewPresentation(
                    {...original, canApply: false, results: {paymentId: "original"}},
                    "organization"
                )
            }
        })
    },
    then({first, reopened, other, unavailable}) {
        first.canConfirm == true
        first.operationKey == reopened.operationKey
        first.operationKey.length <= 40
        first.operationKey != other.operationKey
        unavailable.canConfirm == false
        unavailable.hasResults == false
        unavailable.actualRefundRows.length == 0
    }
})

feature("completed refund files and actual payment links belong to the opposite child and preserve ledger omission", {
    when() {
        const retained = {
            paymentId: "original",
            previewId: "refund-result",
            previewKind: "refund",
            status: "complete",
            operationKey: "recorded-refund-key",
            paymentSummary: {paymentId: "original", amount: "20", currencyUomId: "USD"},
            results: {
                paymentId: "original",
                originalPaymentId: "original",
                refundPaymentId: "actual-refund",
                amount: "20",
                currencyUomId: "USD",
                paymentApplicationId: "actual-funding",
                outputRows: [
                    {paymentId: "actual-refund", outputId: "refund-receipt", fileName: "Refund.pdf", canOpen: true},
                    {paymentId: "original", outputId: "wrong-owner", canOpen: true}
                ]
            }
        }
        return {
            view: refundScreen().refundReviewPresentation(retained, "organization"),
            mismatch: refundScreen().refundReviewPresentation(
                {...retained, results: {...retained.results, originalPaymentId: "another-original"}},
                "organization"
            )
        }
    },
    then({view, mismatch}) {
        view.hasResults == true
        view.operationKey == "recorded-refund-key"
        view.actualRefundRows[0].recordParameters.paymentId == "actual-refund"
        view.outputResultRows[0].canOpen == true
        view.outputResultRows[0].outputParameters.paymentId == "actual-refund"
        view.outputResultRows[0].outputParameters.recordId == "actual-refund"
        view.outputResultRows[0].outputParameters.sourceVersion == ""
        view.outputResultRows[1].canOpen == false
        view.postingResultRows.length == 0
        mismatch.hasResults == false
        mismatch.outputResultRows.length == 0
    }
})

feature("refund funding review uses native before and after money without deriving missing amounts", {
    when() {
        return {
            view: refundScreen().refundReviewPresentation(
                {
                    paymentId: "original",
                    previewId: "funding-review",
                    paymentSummary: {paymentId: "original", amount: "20", currencyUomId: "USD"},
                    refundSummary: {currencyUomId: "USD"},
                    before: {refundableAmount: "60", heldRefundAmount: "5"},
                    after: {refundableAmount: "40"}
                },
                "organization"
            )
        }
    },
    then({view}) {
        view.fundingRows.find(row => row.label === "Available to refund").beforeAmount == "60"
        view.fundingRows.find(row => row.label === "Available to refund").afterAmount == "40"
        view.fundingRows.find(row => row.label === "Refunds reserved").afterAmount == null
    }
})

feature("the same real original cash permits Treasury refund reads and refuses AR refund authority", {
    when() {
        const parameters = {
            organizationPartyId: refundHelper.ids.organizationPartyId,
            paymentId: refundHelper.ids.paymentDeliveredId
        }
        return {
            allowed: refundHelper.asUser("finance.treasury", () =>
                refundHelper.call(refundNative + "get#PaymentRefundSummary", parameters)
            ),
            refused: refundHelper.asUser("finance.ar", () =>
                refundHelper.refusal(refundNative + "get#PaymentRefundSummary", parameters)
            )
        }
    },
    then({allowed, refused}) {
        allowed.refundSummary.complete == true
        allowed.refundSummary.originalPaymentId == refundHelper.ids.paymentDeliveredId
        refused.includes("PERMISSION_DENIED")
        !/"(?:accountNumber|routingNumber|cardNumber|credentials|providerBody)"/.test(JSON.stringify(allowed))
    }
})

feature("a real owner-bound manual refund preview renders its native funding and can be reopened without changing selection", {
    when() {
        return refundHelper.asUser("finance.treasury", () => {
            const organizationPartyId = refundHelper.ids.organizationPartyId,
                paymentId = refundHelper.ids.paymentDeliveredId,
                detail = refundHelper.call(refundNative + "get#PaymentFinanceDetail", {organizationPartyId, paymentId}),
                read = refundHelper.call(refundNative + "get#PaymentRefundSummary", {organizationPartyId, paymentId}),
                preview = refundHelper.call(refundNative + "preview#PaymentRefund", {
                    ...read.refundDefaults,
                    organizationPartyId,
                    paymentId,
                    sourceVersion: detail.sourceVersion,
                    amount: "1",
                    effectiveDate: ec.l10n.format(ec.user.nowTimestamp, "yyyy-MM-dd"),
                    reason: "Review actual manual refund funding",
                    referenceNumber: "APP-REFUND-REVIEW"
                }),
                parameters = {organizationPartyId, paymentId, previewId: preview.previewId, previewKind: "refund"},
                first = refundHelper.call("ironstone.accounting.PaymentScreenServices.get#PaymentContext", parameters),
                reopened = refundHelper.call("ironstone.accounting.PaymentScreenServices.get#PaymentContext", parameters),
                prepared = refundHelper.call("ironstone.accounting.PaymentScreenServices.get#PaymentContext", {
                    organizationPartyId,
                    paymentId,
                    refundEditPreviewId: preview.previewId
                }),
                pages = ["qvt", "tui", "html"].map(mode => refundHelper.page("Payments/PaymentDetail/Refunds", parameters, mode))
            return {preview, first, reopened, prepared, pages}
        })
    },
    then({preview, first, reopened, prepared, pages}) {
        preview.paymentId == refundHelper.ids.paymentDeliveredId
        first.paymentReview.previewKind == "refund"
        first.paymentReview.operationKey == reopened.paymentReview.operationKey
        first.paymentReview.hasResults == false
        toDecimal(preview.applicationEffects[0].amountOriginallyApplied).isZero()
        toDecimal(preview.applicationEffects[0].afterAmountApplied).eq(preview.paymentSummary.amount)
        first.paymentReview.applicationEffects[0].amountOriginallyApplied == preview.applicationEffects[0].amountOriginallyApplied
        first.paymentReview.applicationEffects[0].afterAmountApplied == preview.applicationEffects[0].afterAmountApplied
        first.paymentReview.applicationEffects[0].targetPaymentId == preview.paymentId
        prepared.financePayment.refundValue.sourceVersion == preview.sourceVersion
        prepared.financePayment.refundValue.amount == preview.paymentSummary.amount
        pages.every(
            page =>
                page.status === 200 &&
                !page.errors.length &&
                page.output.includes("Reviewed refund") &&
                page.output.includes("Reviewed refund funding") &&
                page.output.includes("From payment") &&
                page.output.includes("To payment") &&
                page.output.includes("New refund payment")
        )
    }
})

feature("#user confirms its own manual refund with exact funding, issued child documents and retained retry", {
    where: [
        {user: "finance.treasury", expectLedger: false},
        {user: "finance.admin", expectLedger: true}
    ],
    when({user, expectLedger}) {
        return refundHelper.asUser(user, () => {
            const organizationPartyId = refundHelper.ids.organizationPartyId,
                effectiveDate = ec.l10n.format(ec.user.nowTimestamp, "yyyy-MM-dd"),
                currencyUomId = refundHelper.call(refundNative + "get#PaymentFinanceDetail", {
                    organizationPartyId,
                    paymentId: refundHelper.ids.paymentDeliveredId
                }).payment.currencyUomId,
                methods = refundHelper.call(refundNative + "find#PaymentMethods", {
                    organizationPartyId,
                    cashDirection: "incoming",
                    methodRole: "organization",
                    partyId: refundHelper.ids.paymentPartyId,
                    currencyUomId,
                    effectiveDate,
                    selectedPaymentMethodIdList: ["BOSS_ACCT_PAY_CASH"],
                    pageSize: 1
                }),
                method = methods.selectedRows.find(row => row.paymentMethodId === "BOSS_ACCT_PAY_CASH"),
                intent = "app-refund-" + ec.user.randomString(16)
            if (!method?.version) throw new Error("The native reviewed cash method is required for this isolated refund source")
            const created = refundHelper.call(refundNative + "create#PaymentDraft", {
                    organizationPartyId,
                    cashDirection: "incoming",
                    partyId: refundHelper.ids.paymentPartyId,
                    amount: "3",
                    currencyUomId,
                    effectiveDate,
                    paymentInstrumentEnumId: "PiCash",
                    organizationPaymentMethodId: method.paymentMethodId,
                    organizationMethodVersion: method.version,
                    referenceNumber: "Isolated refund funding",
                    operationKey: intent + "-c"
                }),
                validation = refundHelper.call(refundNative + "preview#PaymentState", {
                    organizationPartyId,
                    paymentId: created.paymentId,
                    sourceVersion: created.sourceVersion,
                    action: "validate"
                })
            refundHelper.call(refundNative + "change#PaymentState", {
                previewId: validation.previewId,
                inputFingerprint: validation.inputFingerprint,
                operationKey: intent + "-v"
            })
            const validated = refundHelper.call(refundNative + "get#PaymentFinanceDetail", {
                    organizationPartyId,
                    paymentId: created.paymentId
                }),
                delivery = refundHelper.call(refundNative + "preview#PaymentState", {
                    organizationPartyId,
                    paymentId: created.paymentId,
                    sourceVersion: validated.sourceVersion,
                    action: "deliver",
                    settlementDate: effectiveDate,
                    referenceNumber: "Isolated cash received",
                    reason: "Counted cash provides actual original refund backing"
                })
            refundHelper.call(refundNative + "change#PaymentState", {
                previewId: delivery.previewId,
                inputFingerprint: delivery.inputFingerprint,
                operationKey: intent + "-d"
            })
            const original = refundHelper.call(refundNative + "get#PaymentFinanceDetail", {
                    organizationPartyId,
                    paymentId: created.paymentId
                }),
                funding = refundHelper.call(refundNative + "get#PaymentRefundSummary", {
                    organizationPartyId,
                    paymentId: created.paymentId
                }),
                review = refundHelper.call(refundNative + "preview#PaymentRefund", {
                    ...funding.refundDefaults,
                    organizationPartyId,
                    paymentId: created.paymentId,
                    sourceVersion: original.sourceVersion,
                    amount: "1",
                    effectiveDate,
                    referenceNumber: "Actual reviewed refund",
                    reason: "Return one unit of unused original cash"
                }),
                operationKey = intent + "-r",
                confirmed = refundHelper.call(refundNative + "refund#ReviewedPayment", {
                    previewId: review.previewId,
                    inputFingerprint: review.inputFingerprint,
                    operationKey
                }),
                retained = refundHelper.call(refundNative + "get#PaymentRefundPreview", {
                    organizationPartyId,
                    previewId: review.previewId
                }),
                parameters = {
                    organizationPartyId,
                    paymentId: created.paymentId,
                    recordId: created.paymentId,
                    previewId: review.previewId,
                    previewKind: "refund",
                    lastStandalone: "-4"
                },
                presented = refundHelper.call(
                    "ironstone.accounting.PaymentScreenServices.get#PaymentContext",
                    parameters
                ).paymentReview,
                retried = refundHelper.call(refundNative + "refund#ReviewedPayment", {
                    previewId: review.previewId,
                    inputFingerprint: review.inputFingerprint,
                    operationKey
                }),
                child = refundHelper.call(refundNative + "get#PaymentFinanceDetail", {
                    organizationPartyId,
                    paymentId: confirmed.refundPaymentId
                }),
                after = refundHelper.call(refundNative + "get#PaymentFinanceDetail", {
                    organizationPartyId,
                    paymentId: created.paymentId
                }),
                summary = refundHelper.call(refundNative + "get#PaymentRefundSummary", {
                    organizationPartyId,
                    paymentId: created.paymentId
                }),
                outputRows = Array.from(retained.results.outputRows),
                postingIds = Array.from(retained.results.acctgTransIds || []),
                pages = ["qvt", "tui", "html"].map(mode => {
                    const renderer = ec.screen.makeTest().rootScreen("component://webroot/screen/webroot.xml").renderMode(mode)
                    if (mode === "qvt") renderer.withStaticData()
                    const result = renderer.render("apps/Accounting/Payments/PaymentDetail", parameters, null),
                        output = String(result.output || ""),
                        links = []
                    if (mode === "tui") {
                        const pending = [JSON.parse(output)]
                        while (pending.length) {
                            const item = pending.pop()
                            if (Array.isArray(item)) pending.push(...item)
                            else if (item && typeof item === "object") {
                                if (item.t === "link") links.push(item)
                                pending.push(...Object.values(item).filter(value => value && typeof value === "object"))
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
                        status: result.status,
                        output,
                        errors: Array.from(result.errorMessages || []).concat(
                            output.match(/(?:Error rendering|Exception in render)[^\n<]*/g) || []
                        ),
                        references: links.map(link => ({
                            url: link.url,
                            disabled: link.disabled === true,
                            paymentId: parameter(link.url, "paymentId"),
                            recordId: parameter(link.url, "recordId"),
                            outputId: parameter(link.url, "outputId")
                        }))
                    }
                })
            return {
                original,
                confirmed,
                retained,
                retried,
                presented,
                child,
                after,
                summary,
                operationKey,
                expectLedger,
                outputRows,
                postingIds,
                postingIdJson: JSON.stringify(postingIds),
                pages
            }
        })
    },
    then({
        original,
        confirmed,
        retained,
        retried,
        presented,
        child,
        after,
        summary,
        operationKey,
        expectLedger,
        outputRows,
        postingIds,
        postingIdJson,
        pages
    }) {
        confirmed.paymentId == original.payment.paymentId
        confirmed.originalPaymentId == original.payment.paymentId
        confirmed.refundPaymentId != original.payment.paymentId
        confirmed.paymentApplicationId != null
        confirmed.reasonCode == "REFUND_COMPLETED"
        retained.operationKey == operationKey
        presented.operationKey == operationKey
        presented.hasResults == true
        retried.alreadyApplied == true
        retried.refundPaymentId == confirmed.refundPaymentId
        retried.paymentApplicationId == confirmed.paymentApplicationId
        child.sourceRows.some(row => row.sourceKind === "payment" && row.sourceId === original.payment.paymentId)
        child.payment.paymentTypeEnumId == "PtRefund"
        child.payment.cashDirection == "outgoing"
        child.payment.financeDirection == "receivable"
        child.applicationRows.filter(
            row =>
                row.paymentApplicationId === confirmed.paymentApplicationId &&
                row.paymentId === confirmed.refundPaymentId &&
                row.toPaymentId === original.payment.paymentId &&
                toDecimal(row.amountApplied).eq("1")
        ).length == 1
        after.applicationRows.filter(row => row.paymentApplicationId === confirmed.paymentApplicationId).length == 1
        toDecimal(after.payment.amount).eq("3")
        toDecimal(summary.refundSummary.completedRefundAmount).eq("1")
        toDecimal(summary.refundSummary.refundableAmount).eq("2")
        expectLedger ? confirmed.acctgTransIds.length === 2 : !("acctgTransIds" in confirmed)
        JSON.stringify(presented.postingResultRows.map(row => row.acctgTransId)) == postingIdJson
        outputRows.length >= 2
        outputRows.every(row => row.paymentId === confirmed.refundPaymentId && row.canOpen === true)
        presented.outputResultRows.every(
            row =>
                row.canOpen === true &&
                row.outputParameters.paymentId === confirmed.refundPaymentId &&
                row.outputParameters.recordId === confirmed.refundPaymentId
        )
        JSON.stringify(retried.outputRows.map(row => row.outputId)) == JSON.stringify(outputRows.map(row => row.outputId))
        pages.every(
            page =>
                page.status === 200 &&
                !page.errors.length &&
                page.output.includes("Refund completed") &&
                page.output.includes("Actual refund payment")
        )
        pages.every(page =>
            outputRows.every(
                row =>
                    page.output.includes(row.fileName) &&
                    page.references.some(
                        link =>
                            !link.disabled &&
                            link.url.includes("/Accounting/Payments/PaymentPrint") &&
                            link.outputId === row.outputId &&
                            link.paymentId === confirmed.refundPaymentId &&
                            link.recordId === confirmed.refundPaymentId
                    )
            )
        )
        pages.every(page => postingIds.every(id => page.output.includes(id)))
    }
})
