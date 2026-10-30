const helper = ec.resource.script("component://mr-boss/test/AccountingSpecLib.js")
const screen = () => ec.resource.script("component://mr-boss/service/ironstone/accounting/Payments.js")

spec({dependsOn: ["AccountingGatewayFixtures"]})

feature("gateway confirmation keys are retained per reviewed intent and keep recovery separate from dispatch", {
    when() {
        return helper.asUser("finance.treasury", () => {
            const module = screen(),
                action = {previewId: "gateway-preview", previewKind: "gatewayAction"},
                recovery = {previewId: "gateway-preview", previewKind: "gatewayRecovery"}
            return {
                first: module.gatewayConfirmationKey(action),
                reopened: module.gatewayConfirmationKey(action),
                recovery: module.gatewayConfirmationKey(recovery),
                recorded: module.gatewayConfirmationKey({...recovery, operationKey: "recorded-financial-confirm"})
            }
        })
    },
    then({first, reopened, recovery, recorded}) {
        first == reopened
        first.length <= 40
        first != recovery
        recorded == "recorded-financial-confirm"
    }
})

feature("only completed gateway results project issued files and each link targets its actual cash payment", {
    when() {
        const module = screen(),
            outputs = [
                {paymentId: "cash-20", outputId: "receipt-20", outputType: "receipt", fileName: "Cash-20.pdf", canOpen: true},
                {paymentId: "cash-40", outputId: "receipt-40", outputType: "receipt", fileName: "Cash-40.pdf", canOpen: false},
                {outputId: "no-cash-owner", outputType: "detail", fileName: "Unknown-owner.pdf", canOpen: true}
            ]
        return {
            completed: module.gatewayOutputRows(
                {paymentId: "authorization-parent", results: {financialState: "completed", outputRows: outputs}},
                helper.ids.organizationPartyId
            ),
            pending: module.gatewayOutputRows(
                {results: {financialState: "accepted_unposted", outputRows: outputs}},
                helper.ids.organizationPartyId
            )
        }
    },
    then({completed, pending}) {
        completed[0].outputParameters.paymentId == "cash-20"
        completed[0].outputParameters.recordId == "cash-20"
        completed[0].outputParameters.sourceVersion == ""
        completed[0].outputParameters.outputId == "receipt-20"
        completed[0].canOpen == true
        completed[1].outputParameters.paymentId == "cash-40"
        completed[1].canOpen == false
        completed[2].outputParameters.paymentId == ""
        completed[2].canOpen == false
        !JSON.stringify(completed).includes("authorization-parent")
        pending.length == 0
    }
})

feature("provider acceptance remains distinct from actual local cash, application and ledger completion", {
    when() {
        const module = screen(),
            retained = {
                paymentId: "authorization-parent",
                previewId: "capture-review",
                previewKind: "gatewayAction",
                inputFingerprint: "reviewed-capture",
                paymentSummary: {paymentId: "authorization-parent", amount: "20", currencyUomId: "USD"},
                gatewaySummary: {
                    amount: "20",
                    currencyUomId: "USD",
                    instruction: {authorizedAmount: "60", currencyUomId: "USD"}
                },
                capabilities: {canReadLedger: true},
                results: {
                    attemptId: "capture-attempt",
                    providerOperationId: "original-provider-operation",
                    providerState: "accepted",
                    financialState: "accepted_unposted",
                    cashPaymentId: "cash-child",
                    applicationResults: [{paymentApplicationId: "actual-application"}],
                    acctgTransIds: ["actual-posting"],
                    outputRows: [{paymentId: "cash-child", outputId: "actual-output", outputType: "receipt", canOpen: true}]
                }
            }
        return {
            pending: module.gatewayReviewPresentation(retained, helper.ids.organizationPartyId),
            completed: module.gatewayReviewPresentation(
                {...retained, results: {...retained.results, financialState: "completed"}},
                helper.ids.organizationPartyId
            )
        }
    },
    then({pending, completed}) {
        pending.paymentSummary.amount == "20"
        pending.gatewaySummary.instruction.authorizedAmount == "60"
        pending.providerStateText == "Accepted"
        pending.financialStateText == "Cash posting needs review"
        pending.actualPaymentRows.length == 0
        pending.applicationResultRows.length == 0
        pending.postingResultRows.length == 0
        pending.outputResultRows.length == 0
        completed.actualPaymentRows[0].recordParameters.paymentId == "cash-child"
        completed.applicationResultRows[0].paymentApplicationId == "actual-application"
        completed.postingResultRows[0].acctgTransId == "actual-posting"
        completed.outputResultRows[0].outputParameters.paymentId == "cash-child"
    }
})

feature("native capacity values remain distinct from cash and missing planned values remain unavailable", {
    when() {
        const module = screen()
        return {
            rows: module.gatewayCapacityRows({
                currencyUomId: "USD",
                authorizedAmount: "60",
                capturedAmount: "20",
                captureHeldAmount: "10",
                capturableAmount: "30"
            }),
            review: module.gatewayReviewPresentation(
                {
                    paymentId: "parent",
                    previewId: "capacity-preview",
                    previewKind: "gatewayAction",
                    paymentSummary: {paymentId: "parent", amount: "20", currencyUomId: "USD"},
                    before: {currencyUomId: "USD", authorizedAmount: "60", capturedAmount: "20", capturableAmount: "40"},
                    after: {
                        currencyUomId: "USD",
                        assumption: "providerAcceptedAndLocalCompleted",
                        capturedAmount: "40",
                        capturableAmount: "20"
                    }
                },
                helper.ids.organizationPartyId
            )
        }
    },
    then({rows, review}) {
        rows.map(row => row.amount) == ["60", "20", "10", "30"]
        review.capacityEffectRows.find(row => row.label === "Authorized").afterAmount == null
        review.capacityEffectRows.find(row => row.label === "Available to capture").beforeAmount == "40"
        review.capacityEffectRows.find(row => row.label === "Available to capture").afterAmount == "20"
        review.plannedCapacityAssumption == "providerAcceptedAndLocalCompleted"
    }
})

feature("gateway list and selected-attempt projections preserve filters, native revisions and completion boundaries", {
    when() {
        const module = screen(),
            filters = {partyId: "customer", text: "reference", action: "capture"},
            pending = {
                attemptId: "attempt",
                attemptVersion: "reviewed-attempt",
                paymentId: "parent",
                cashPaymentId: "cash",
                financialState: "accepted_unposted",
                providerBody: "not-public",
                acctgTransIds: ["posting"],
                capabilities: {canReadLedger: true}
            },
            list = module.gatewayTransactionRows(
                [
                    {
                        attemptId: "attempt",
                        paymentId: "parent",
                        paymentGatewayConfigId: "gateway",
                        amountUomId: "USD",
                        cashPaymentId: "cash",
                        financialState: "completed"
                    }
                ],
                helper.ids.organizationPartyId,
                filters,
                {gateway: "Approved provider"}
            )
        return {
            list,
            pending: module.gatewayAttemptPresentation(pending, helper.ids.organizationPartyId),
            completed: module.gatewayAttemptPresentation(
                {...pending, financialState: "completed"},
                helper.ids.organizationPartyId
            )
        }
    },
    then({list, pending, completed}) {
        list[0].providerName == "Approved provider"
        list[0].attemptParameters.partyId == "customer"
        list[0].attemptParameters.text == "reference"
        list[0].attemptParameters.action == "capture"
        list[0].cashPaymentParameters.paymentId == "cash"
        pending.attemptVersion == "reviewed-attempt"
        !("providerBody" in pending)
        !("cashPaymentId" in pending)
        pending.cashPaymentParameters == null
        pending.postingRows.length == 0
        completed.cashPaymentParameters.paymentId == "cash"
        completed.postingRows[0].acctgTransId == "posting"
    }
})

feature("gateway preparation forwards original reviewed bindings and evidence without derived financial or provider fields", {
    when() {
        const module = screen()
        return {
            input: module.gatewayActionInput({
                organizationPartyId: "org",
                paymentId: "parent",
                sourceVersion: "opaque-payment",
                action: "capture",
                amount: "20",
                effectiveDate: "2026-10-30",
                reason: "Accepted order",
                referenceNumber: "ORDER-20",
                gatewayBindingToken: "approved-gateway~original-binding",
                evidenceTokenList: ["evidence~original-file"],
                providerState: "accepted",
                financialState: "completed",
                cashPaymentId: "forged",
                glAccountId: "forged"
            }),
            filters: module.gatewayFindParameters(
                JSON.stringify({
                    paymentId: "parent",
                    text: "reference",
                    attemptId: "attempt",
                    pageIndex: 2,
                    action: "capture",
                    organizationPartyId: "foreign",
                    operationKey: "forged",
                    attemptVersion: "forged"
                })
            )
        }
    },
    then({input, filters}) {
        input.sourceVersion == "opaque-payment"
        input.paymentGatewayConfigId == "approved-gateway"
        input.gatewayBindingVersion == "original-binding"
        input.evidenceContentIdList == ["evidence"]
        input.evidenceVersions == {evidence: "original-file"}
        !["providerState", "financialState", "cashPaymentId", "glAccountId"].some(field => field in input)
        filters == {paymentId: "parent", text: "reference", attemptId: "attempt", pageIndex: 2, action: "capture"}
    }
})

feature("a recovery review with original attempt evidence remains confirmable only under native review authority", {
    when() {
        const module = screen(),
            retained = {
                paymentId: "parent",
                previewId: "financial-review",
                previewKind: "gatewayRecovery",
                status: "review",
                financialOnly: true,
                canApply: true,
                inputFingerprint: "financial-fingerprint",
                paymentSummary: {paymentId: "parent", amount: "20", currencyUomId: "USD"},
                results: {
                    attemptId: "original-attempt",
                    paymentId: "parent",
                    financialState: "accepted_unposted",
                    operationKey: "original-provider-key"
                }
            }
        return {
            review: module.gatewayReviewPresentation(retained, helper.ids.organizationPartyId),
            saved: module.gatewayReviewPresentation(
                {
                    ...retained,
                    canApply: false,
                    status: "complete",
                    operationKey: "recorded-financial-key",
                    results: {...retained.results, financialState: "completed", cashPaymentId: "actual-cash"}
                },
                helper.ids.organizationPartyId
            )
        }
    },
    then({review, saved}) {
        review.canConfirm == true
        review.hasResults == false
        review.actualPaymentRows.length == 0
        review.confirmParameters.operationKey != "original-provider-key"
        saved.canConfirm == false
        saved.hasResults == true
        saved.confirmParameters.operationKey == "recorded-financial-key"
        saved.actualPaymentRows[0].recordParameters.paymentId == "actual-cash"
    }
})

feature("unexecuted recovery reviews never offer a saved-result retry when their confirmation authority is unavailable", {
    where: [{reason: "expired"}, {reason: "lostEditAuthority"}, {reason: "adoptionDisabled"}],
    when({reason}) {
        return {
            review: screen().gatewayReviewPresentation(
                {
                    paymentId: "parent",
                    previewId: "unexecuted-recovery-" + reason,
                    previewKind: "gatewayRecovery",
                    financialOnly: true,
                    status: "review",
                    canApply: false,
                    operationKey: null,
                    inputFingerprint: "original-financial-review",
                    paymentSummary: {paymentId: "parent", amount: "20", currencyUomId: "USD"},
                    results: {
                        attemptId: "original-accepted-attempt",
                        operationKey: "original-provider-key",
                        financialState: "accepted_unposted"
                    }
                },
                helper.ids.organizationPartyId
            )
        }
    },
    then({review}) {
        review.canConfirm == false
        review.hasResults == false
        review.actualPaymentRows.length == 0
        review.resultRows.some(row => row.label === "Attempt" && row.value === "original-accepted-attempt")
        review.confirmParameters.operationKey != "original-provider-key"
    }
})

feature("Treasury gateway investigation and the matching AR refusal keep their native boundary with authz #enabled", {
    where: [{enabled: true}, {enabled: false}],
    when({enabled}) {
        const parameters = {organizationPartyId: helper.ids.organizationPartyId, paymentId: helper.ids.paymentDraftId},
            service = "ironstone.accounting.PaymentScreenServices.get#GatewayTransactionsContext"
        return {
            allowed: helper.asUser("finance.treasury", () => helper.call(service, parameters), enabled),
            refused: helper.asUser("finance.ar", () => helper.refusal(service, parameters), enabled)
        }
    },
    then({allowed, refused}) {
        allowed.gatewayTransactions.available == true
        allowed.gatewayTransactions.complete == true
        allowed.gatewayTransactions.filters.paymentId == helper.ids.paymentDraftId
        refused.includes("PERMISSION_DENIED")
        !/"(?:cardNumber|accountNumber|routingNumber|providerBody|credentials|operationServiceName|lookupServiceName)"/.test(
            JSON.stringify(allowed)
        )
    }
})

feature("an unavailable selected attempt is isolated from the authorized gateway list and subsequent reads", {
    when() {
        return helper.asUser("finance.treasury", () => ({
            context: helper.call("ironstone.accounting.PaymentScreenServices.get#GatewayTransactionsContext", {
                organizationPartyId: helper.ids.organizationPartyId,
                paymentId: helper.ids.paymentDraftId,
                attemptId: "no-such-attempt"
            }),
            payment: helper.call("mantle.account.PaymentServices.get#PaymentFinanceDetail", {
                organizationPartyId: helper.ids.organizationPartyId,
                paymentId: helper.ids.paymentDraftId
            })
        }))
    },
    then({context, payment}) {
        context.gatewayTransactions.available == true
        context.gatewayTransactions.attemptUnavailable == true
        context.gatewayTransactions.selectedAttempt == null
        payment.payment.paymentId == helper.ids.paymentDraftId
    }
})

feature("selected gateway reference evidence comes only from the exact authorized attempt and payment outside search", {
    when() {
        return helper.asUser("finance.treasury", () => {
            const organizationPartyId = helper.ids.organizationPartyId,
                paymentId = "BOSS_ACCT_GW_RECOVER",
                listed = helper.call("mantle.account.PaymentServices.find#PaymentGatewayTransactions", {
                    organizationPartyId,
                    paymentId,
                    action: "capture",
                    pageSize: 1
                }),
                response = listed.rows[0]
            if (!response?.attemptId || !response.referenceNum || !response.responseCode)
                throw new Error("The real recovery fixture must have a provider capture response")
            const presented = helper.call("ironstone.accounting.PaymentScreenServices.get#GatewayTransactionsContext", {
                organizationPartyId,
                paymentId,
                attemptId: response.attemptId,
                text: "no-provider-reference-matches-this-search"
            })
            return {response, presented}
        })
    },
    then({response, presented}) {
        presented.records.length == 0
        presented.gatewayTransactions.selectedAttempt.attemptId == response.attemptId
        presented.gatewayTransactions.selectedAttempt.paymentId == response.paymentId
        presented.gatewayTransactions.selectedAttempt.providerReference == response.referenceNum
        presented.gatewayTransactions.selectedAttempt.providerResponseCode == response.responseCode
    }
})
