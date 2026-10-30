const providerRefundHelper = ec.resource.script("component://mr-boss/test/AccountingSpecLib.js")
const providerRefundScreen = () => ec.resource.script("component://mr-boss/service/ironstone/accounting/Payments.js")
const providerRefundNative = (name, parameters) => providerRefundHelper.call("mantle.account.PaymentServices." + name, parameters)

function providerRefundCashSource() {
    const organizationPartyId = providerRefundHelper.ids.organizationPartyId,
        partyId = providerRefundHelper.ids.paymentPartyId,
        effectiveDate = ec.l10n.format(ec.user.nowTimestamp, "yyyy-MM-dd"),
        currencyUomId = providerRefundNative("get#PaymentFinanceDetail", {
            organizationPartyId,
            paymentId: providerRefundHelper.ids.paymentDeliveredId
        }).payment.currencyUomId,
        method = (methodRole, paymentMethodId) => {
            const result = providerRefundNative("find#PaymentMethods", {
                    organizationPartyId,
                    partyId,
                    cashDirection: "incoming",
                    methodRole,
                    currencyUomId,
                    effectiveDate,
                    selectedPaymentMethodIdList: [paymentMethodId],
                    pageSize: 1
                }),
                row = result.selectedRows.find(row => row.paymentMethodId === paymentMethodId)
            if (!row?.version) throw new Error("The reviewed gateway method fixture is required: " + paymentMethodId)
            return row
        },
        own = method("organization", "BOSS_ACCT_GW_BANK"),
        other = method("counterparty", "BOSS_ACCT_GW_CUSTOMER_BANK"),
        key = "app-pgr-" + ec.user.randomString(16),
        made = providerRefundNative("create#PaymentDraft", {
            organizationPartyId,
            cashDirection: "incoming",
            partyId,
            amount: "60",
            currencyUomId,
            effectiveDate,
            paymentInstrumentEnumId: "PiAch",
            organizationPaymentMethodId: own.paymentMethodId,
            organizationMethodVersion: own.version,
            counterpartyPaymentMethodId: other.paymentMethodId,
            counterpartyMethodVersion: other.version,
            referenceNumber: "Isolated provider refund funding",
            operationKey: key + "-c"
        }),
        bindings = providerRefundNative("find#PaymentGatewayBindings", {
            organizationPartyId,
            paymentId: made.paymentId,
            action: "authorize",
            effectiveDate,
            selectedIdList: ["BOSS_ACCT_GW_TEST"],
            pageSize: 1
        }),
        binding = bindings.selectedRows.find(row => row.paymentGatewayConfigId === "BOSS_ACCT_GW_TEST")
    if (!binding?.bindingVersion) throw new Error("The explicit safe gateway fixture must support reviewed authorization")
    const authorization = providerRefundNative("preview#PaymentGatewayAction", {
        organizationPartyId,
        paymentId: made.paymentId,
        sourceVersion: made.sourceVersion,
        action: "authorize",
        effectiveDate,
        reason: "Authorize the isolated refund source",
        paymentGatewayConfigId: binding.paymentGatewayConfigId,
        gatewayBindingVersion: binding.bindingVersion
    })
    providerRefundNative("execute#PaymentGatewayAction", {
        previewId: authorization.previewId,
        inputFingerprint: authorization.inputFingerprint,
        operationKey: key + "-a"
    })
    const authorized = providerRefundNative("get#PaymentFinanceDetail", {organizationPartyId, paymentId: made.paymentId}),
        capture = providerRefundNative("preview#PaymentGatewayAction", {
            organizationPartyId,
            paymentId: made.paymentId,
            sourceVersion: authorized.sourceVersion,
            action: "capture",
            amount: "20",
            effectiveDate,
            reason: "Capture twenty as actual original refund funding"
        }),
        captured = providerRefundNative("execute#PaymentGatewayAction", {
            previewId: capture.previewId,
            inputFingerprint: capture.inputFingerprint,
            operationKey: key + "-p"
        })
    if (captured.financialState !== "completed" || !captured.cashPaymentId)
        throw new Error("The original provider capture must have actual completed cash")
    return {
        organizationPartyId,
        partyId,
        currencyUomId,
        effectiveDate,
        key,
        parentPaymentId: made.paymentId,
        paymentId: captured.cashPaymentId,
        original: providerRefundNative("get#PaymentFinanceDetail", {organizationPartyId, paymentId: captured.cashPaymentId})
    }
}

function providerRefundResultPage(parameters, mode) {
    const renderer = ec.screen.makeTest().rootScreen("component://webroot/screen/webroot.xml").renderMode(mode)
    if (mode === "qvt") renderer.withStaticData()
    const rendered = renderer.render("apps/Accounting/Payments/PaymentDetail", {...parameters, lastStandalone: "-4"}, null),
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
        links: links.map(link => ({
            url: link.url,
            disabled: link.disabled === true,
            paymentId: parameter(link.url, "paymentId"),
            recordId: parameter(link.url, "recordId"),
            outputId: parameter(link.url, "outputId")
        }))
    }
}
function providerRefundReview(extra = {}) {
    return Object.assign(
        {
            paymentId: "capture-cash",
            previewId: "provider-refund-review",
            previewKind: "gatewayAction",
            action: "refund",
            status: "review",
            canApply: true,
            sourceVersion: "original-cash-revision",
            paymentSummary: {
                paymentId: "capture-cash",
                amount: "5",
                currencyUomId: "USD",
                cashDirection: "outgoing",
                accountingDateText: "2026-10-30"
            },
            refundSummary: {currencyUomId: "USD"},
            gatewaySummary: {
                originalCapture: {
                    paymentId: "capture-cash",
                    attemptId: "capture-attempt",
                    providerOperationId: "original-charge",
                    providerReference: "original-reference"
                }
            },
            before: {originalCashAmount: "20", providerRefundableAmount: "20", availableAmount: "20"},
            after: {originalCashAmount: "20", providerRefundableAmount: "15", availableAmount: "15"},
            reservationEffects: [
                {holdKind: "refund", paymentId: "capture-cash", amount: "5", currencyUomId: "USD"},
                {holdKind: "cash", paymentId: "capture-cash", amount: "5", currencyUomId: "USD"}
            ],
            draftClaim: {refundPaymentId: "opposing-draft", status: "held", effect: "reserve"}
        },
        extra
    )
}

feature("provider refund decoder retains reviewed draft and evidence while excluding routing and credential overrides", {
    when() {
        return {
            input: providerRefundScreen().gatewayActionInput({
                organizationPartyId: "organization",
                paymentId: "capture-cash",
                sourceVersion: "old-cash",
                action: "refund",
                amount: "5",
                effectiveDate: "2026-10-30",
                reason: "Return unused capture",
                referenceNumber: "REFUND-5",
                refundDraftToken: "draft~old-draft",
                evidenceTokenList: ["file~old-file"],
                parentAttemptId: "forged-parent",
                gatewayBindingToken: "another-provider~new-binding",
                paymentGatewayConfigId: "another-provider",
                organizationPaymentMethodId: "new-destination",
                providerReference: "forged-reference"
            })
        }
    },
    then({input}) {
        input.paymentId == "capture-cash"
        input.sourceVersion == "old-cash"
        input.refundPaymentId == "draft"
        input.refundSourceVersion == "old-draft"
        input.evidenceVersions == {file: "old-file"}
        ![
            "parentAttemptId",
            "paymentGatewayConfigId",
            "gatewayBindingVersion",
            "organizationPaymentMethodId",
            "providerReference"
        ].some(field => field in input)
    }
})

feature("provider refund preparation restores original reviewed revisions without introducing a method or gateway picker", {
    when() {
        return {
            value: providerRefundScreen().gatewayRefundPreparedValue(
                providerRefundReview({
                    refundPaymentId: "draft",
                    refundSourceVersion: "old-draft",
                    reason: "Original reason",
                    referenceNumber: "Original reference",
                    evidenceRows: [{paymentContentId: "file", version: "old-file"}]
                })
            )
        }
    },
    then({value}) {
        value.sourceVersion == "original-cash-revision"
        value.refundDraftToken == "draft~old-draft"
        value.evidenceTokenList == ["file~old-file"]
        value.reason == "Original reason"
        value.amount == "5"
        ![
            "paymentInstrumentEnumId",
            "organizationMethodToken",
            "counterpartyMethodToken",
            "gatewayBindingToken",
            "parentAttemptId"
        ].some(field => field in value)
    }
})

feature("provider refund review keeps per-capture native funding, both holds and the draft claim distinct", {
    when() {
        return {view: providerRefundScreen().gatewayReviewPresentation(providerRefundReview(), "organization")}
    },
    then({view}) {
        view.isProviderRefund == true
        view.paymentSummary.amount == "5"
        view.paymentSummary.cashDirection == "outgoing"
        view.gatewaySummary.originalCapture.providerReference == "original-reference"
        view.fundingRows.find(row => row.label === "Original cash").beforeAmount == "20"
        view.fundingRows.find(row => row.label === "Provider refundable").afterAmount == "15"
        view.reservationRows.length == 2
        view.reservationRows.every(row => row.sourceId === "capture-cash" && row.amount === "5")
        view.reservationRows.map(row => row.holdLabel) == ["Provider refundable amount", "Original cash funding"]
        view.draftClaim.refundPaymentId == "opposing-draft"
        view.actualPaymentRows.length == 0
        view.outputResultRows.length == 0
    }
})

feature("completed provider refund output remains bound to the retained original and exact actual refund child", {
    when() {
        const result = {
                attemptId: "refund-attempt",
                action: "refund",
                paymentId: "capture-cash",
                originalPaymentId: "capture-cash",
                cashPaymentId: "refund-child",
                refundPaymentId: "refund-child",
                financialState: "completed",
                providerState: "accepted",
                outputRows: [{paymentId: "refund-child", outputId: "issued-refund", canOpen: true}]
            },
            screen = providerRefundScreen()
        return {
            valid: screen.gatewayReviewPresentation(
                providerRefundReview({status: "complete", operationKey: "recorded-provider-refund", results: result}),
                "organization"
            ),
            foreign: screen.gatewayReviewPresentation(
                providerRefundReview({
                    status: "complete",
                    operationKey: "recorded-provider-refund",
                    results: {...result, paymentId: "foreign-capture", originalPaymentId: "foreign-capture"}
                }),
                "organization"
            ),
            pending: screen.gatewayReviewPresentation(
                providerRefundReview({
                    status: "submitted",
                    operationKey: "recorded-provider-refund",
                    results: {...result, financialState: "accepted_unposted"}
                }),
                "organization"
            )
        }
    },
    then({valid, foreign, pending}) {
        valid.actualPaymentRows[0].label == "Refund payment"
        valid.actualPaymentRows[0].recordParameters.paymentId == "refund-child"
        valid.outputResultRows[0].canOpen == true
        valid.outputResultRows[0].outputParameters.paymentId == "refund-child"
        valid.operationKey == "recorded-provider-refund"
        foreign.financialCompleted == false
        foreign.actualPaymentRows.length == 0
        foreign.outputResultRows.length == 0
        pending.actualPaymentRows.length == 0
        pending.outputResultRows.length == 0
    }
})

feature("provider refund list and selected attempt hide a completed cash link whose source or refund aliases disagree", {
    when() {
        const screen = providerRefundScreen(),
            valid = {
                attemptId: "attempt",
                attemptVersion: "revision",
                action: "refund",
                paymentId: "capture",
                originalPaymentId: "capture",
                cashPaymentId: "refund",
                refundPaymentId: "refund",
                financialState: "completed"
            },
            bad = {...valid, originalPaymentId: "another-capture"}
        return {
            list: screen.gatewayTransactionRows([valid, bad], "organization"),
            selected: screen.gatewayAttemptPresentation(
                {...bad, outputRows: [{paymentId: "refund", outputId: "file", canOpen: true}]},
                "organization"
            )
        }
    },
    then({list, selected}) {
        list[0].cashPaymentParameters.paymentId == "refund"
        list[1].cashPaymentParameters == null
        selected.financialCompleted == false
        selected.cashPaymentParameters == null
        selected.outputRows.length == 0
    }
})

feature("#user refunds five then fifteen against an actual capture and retries the exact first financial result", {
    where: [
        {user: "finance.treasury", expectLedger: false},
        {user: "finance.admin", expectLedger: true}
    ],
    when({user, expectLedger}) {
        return providerRefundHelper.asUser(user, () => {
            const source = providerRefundCashSource(),
                {organizationPartyId, paymentId, effectiveDate, key} = source,
                payload = {
                    organizationPartyId,
                    paymentId,
                    sourceVersion: source.original.sourceVersion,
                    action: "refund",
                    amount: "5",
                    effectiveDate,
                    reason: "Return five of the original captured funds",
                    referenceNumber: "PROVIDER-REFUND-5"
                },
                review = providerRefundNative("preview#PaymentGatewayAction", payload),
                arRefusal = providerRefundHelper.asUser("finance.ar", () =>
                    providerRefundHelper.refusal("mantle.account.PaymentServices.preview#PaymentGatewayAction", payload)
                ),
                first = providerRefundNative("execute#PaymentGatewayAction", {
                    previewId: review.previewId,
                    inputFingerprint: review.inputFingerprint,
                    operationKey: key + "-r5"
                }),
                next = providerRefundNative("get#PaymentFinanceDetail", {organizationPartyId, paymentId}),
                remainingReview = providerRefundNative("preview#PaymentGatewayAction", {
                    organizationPartyId,
                    paymentId,
                    sourceVersion: next.sourceVersion,
                    action: "refund",
                    amount: "15",
                    effectiveDate,
                    reason: "Return the remaining original captured funds",
                    referenceNumber: "PROVIDER-REFUND-15"
                }),
                second = providerRefundNative("execute#PaymentGatewayAction", {
                    previewId: remainingReview.previewId,
                    inputFingerprint: remainingReview.inputFingerprint,
                    operationKey: key + "-r15"
                }),
                retried = providerRefundNative("execute#PaymentGatewayAction", {
                    previewId: review.previewId,
                    inputFingerprint: review.inputFingerprint,
                    operationKey: key + "-r5"
                }),
                retained = providerRefundNative("get#PaymentGatewayActionPreview", {
                    organizationPartyId,
                    previewId: review.previewId
                }),
                parameters = {
                    organizationPartyId,
                    paymentId,
                    recordId: paymentId,
                    previewId: review.previewId,
                    previewKind: "gatewayAction"
                },
                view = providerRefundHelper.call(
                    "ironstone.accounting.PaymentScreenServices.get#PaymentContext",
                    parameters
                ).paymentReview,
                child = providerRefundNative("get#PaymentFinanceDetail", {organizationPartyId, paymentId: first.cashPaymentId}),
                summary = providerRefundNative("get#PaymentRefundSummary", {organizationPartyId, paymentId}),
                original = providerRefundNative("get#PaymentFinanceDetail", {organizationPartyId, paymentId}),
                listed = providerRefundNative("find#PaymentGatewayTransactions", {
                    organizationPartyId,
                    paymentId,
                    action: "refund",
                    pageSize: 20
                }),
                outputRows = Array.from(retained.results.outputRows),
                postingIds = Array.from(retained.results.acctgTransIds || []),
                pages = ["qvt", "tui", "html"].map(mode => providerRefundResultPage(parameters, mode))
            return {
                source,
                review,
                arRefusal,
                first,
                second,
                retried,
                retained,
                view,
                child,
                summary,
                original,
                listed,
                outputRows,
                postingIds,
                postingIdJson: JSON.stringify(postingIds),
                expectLedger,
                pages
            }
        })
    },
    then({
        source,
        review,
        arRefusal,
        first,
        second,
        retried,
        retained,
        view,
        child,
        summary,
        original,
        listed,
        outputRows,
        postingIds,
        postingIdJson,
        expectLedger,
        pages
    }) {
        review.action == "refund"
        review.gatewaySummary.originalCapture.paymentId == source.paymentId
        arRefusal.includes("PERMISSION_DENIED")
        first.financialState == "completed"
        first.paymentId == source.paymentId
        first.originalPaymentId == source.paymentId
        first.cashPaymentId == first.refundPaymentId
        first.cashPaymentId != source.paymentId
        first.cashPaymentId != source.parentPaymentId
        second.financialState == "completed"
        second.cashPaymentId != first.cashPaymentId
        retried.alreadyApplied == true
        retried.attemptId == first.attemptId
        retried.cashPaymentId == first.cashPaymentId
        JSON.stringify(retried.outputRows.map(row => row.outputId)) == JSON.stringify(outputRows.map(row => row.outputId))
        retained.operationKey == source.key + "-r5"
        view.actualPaymentRows[0].label == "Refund payment"
        view.actualPaymentRows[0].recordParameters.paymentId == first.cashPaymentId
        child.sourceRows.some(row => row.sourceKind === "payment" && row.sourceId === source.paymentId)
        child.applicationRows.some(
            row =>
                row.paymentId === first.cashPaymentId &&
                row.toPaymentId === source.paymentId &&
                toDecimal(row.amountApplied).eq("5")
        )
        toDecimal(original.payment.amount).eq("20")
        toDecimal(summary.refundSummary.completedRefundAmount).eq("20")
        toDecimal(summary.refundSummary.providerRefundedAmount).eq("20")
        toDecimal(summary.refundSummary.refundableAmount).isZero()
        listed.rows.filter(
            row => row.action === "refund" && row.paymentId === source.paymentId && row.financialState === "completed"
        ).length == 2
        expectLedger ? first.acctgTransIds.length === 2 : !("acctgTransIds" in first)
        JSON.stringify(view.postingResultRows.map(row => row.acctgTransId)) == postingIdJson
        outputRows.length >= 2
        outputRows.every(row => row.paymentId === first.cashPaymentId && row.canOpen === true)
        view.outputResultRows.every(
            row =>
                row.canOpen === true &&
                row.outputParameters.paymentId === first.cashPaymentId &&
                row.outputParameters.recordId === first.cashPaymentId
        )
        pages.every(page => page.status === 200 && !page.errors.length && page.output.includes("Actual refund payment"))
        pages.every(page =>
            outputRows.every(
                row =>
                    page.output.includes(row.fileName) &&
                    page.links.some(
                        link =>
                            !link.disabled &&
                            link.url.includes("/Accounting/Payments/PaymentPrint") &&
                            link.paymentId === first.cashPaymentId &&
                            link.recordId === first.cashPaymentId &&
                            link.outputId === row.outputId
                    )
            )
        )
        pages.every(page => postingIds.every(id => page.output.includes(id)))
    }
})

feature("an optional reviewed opposing draft becomes the exact provider refund child without refreshing its selected revision", {
    when() {
        return providerRefundHelper.asUser("finance.treasury", () => {
            const source = providerRefundCashSource(),
                {organizationPartyId, partyId, currencyUomId, effectiveDate, paymentId, key} = source,
                methods = providerRefundNative("find#PaymentMethods", {
                    organizationPartyId,
                    partyId,
                    currencyUomId,
                    effectiveDate,
                    cashDirection: "outgoing",
                    methodRole: "organization",
                    selectedPaymentMethodIdList: ["BOSS_ACCT_PAY_CASH"],
                    pageSize: 1
                }),
                method = methods.selectedRows.find(row => row.paymentMethodId === "BOSS_ACCT_PAY_CASH")
            if (!method?.version) throw new Error("The reviewed clean draft method fixture is required")
            const draft = providerRefundNative("create#PaymentDraft", {
                    organizationPartyId,
                    partyId,
                    currencyUomId,
                    effectiveDate,
                    cashDirection: "outgoing",
                    paymentInstrumentEnumId: "PiCash",
                    organizationPaymentMethodId: method.paymentMethodId,
                    organizationMethodVersion: method.version,
                    amount: "5",
                    referenceNumber: "Optional provider refund draft",
                    operationKey: key + "-dr"
                }),
                token = draft.paymentId + "~" + draft.sourceVersion,
                choices = providerRefundHelper.call("ironstone.accounting.AccessServices.get#Choices", {
                    organizationPartyId,
                    paymentId,
                    effectiveDate,
                    choice: "reviewedRefundDrafts",
                    selected: token,
                    term: "no-draft-label-matches-this-term"
                }),
                input = providerRefundScreen().gatewayActionInput({
                    organizationPartyId,
                    paymentId,
                    sourceVersion: source.original.sourceVersion,
                    action: "refund",
                    amount: "5",
                    effectiveDate,
                    reason: "Use the reviewed existing opposing draft",
                    referenceNumber: "EXISTING-PROVIDER-REFUND",
                    refundDraftToken: token
                }),
                review = providerRefundNative("preview#PaymentGatewayAction", input),
                restored = providerRefundHelper.call("ironstone.accounting.PaymentScreenServices.get#PaymentContext", {
                    organizationPartyId,
                    paymentId,
                    gatewayRefundEditPreviewId: review.previewId
                }),
                result = providerRefundNative("execute#PaymentGatewayAction", {
                    previewId: review.previewId,
                    inputFingerprint: review.inputFingerprint,
                    operationKey: key + "-rd"
                }),
                retained = providerRefundNative("get#PaymentGatewayActionPreview", {
                    organizationPartyId,
                    previewId: review.previewId
                }),
                child = providerRefundNative("get#PaymentFinanceDetail", {organizationPartyId, paymentId: draft.paymentId})
            return {source, draft, token, choices, input, review, restored, result, retained, child}
        })
    },
    then({source, draft, token, choices, input, review, restored, result, retained, child}) {
        choices.options.some(row => row.value === token)
        input.refundPaymentId == draft.paymentId
        input.refundSourceVersion == draft.sourceVersion
        review.refundPaymentId == draft.paymentId
        review.refundSourceVersion == draft.sourceVersion
        restored.financePayment.gatewayRefundValue.refundDraftToken == token
        restored.financePayment.gatewayRefundValue.sourceVersion == source.original.sourceVersion
        result.financialState == "completed"
        result.cashPaymentId == draft.paymentId
        result.refundPaymentId == draft.paymentId
        retained.results.cashPaymentId == draft.paymentId
        result.outputRows.every(row => row.paymentId === draft.paymentId)
        child.payment.paymentTypeEnumId == "PtRefund"
        child.sourceRows.some(row => row.sourceKind === "payment" && row.sourceId === source.paymentId)
    }
})
