// Payment screen projections and reviewed-choice decoding. Mantle owns financial decisions and mutations.
const policy = ec.resource.script("component://mr-mantle/service/mantle/ledger/AccountingPolicy.js")
const native = "mantle.account.PaymentServices."
const array = value => Array.from(value || [])
const rows = value => array(value).map(row => policy.display(row))
const paymentRow = value =>
    Object.assign(policy.display(value), {
        paymentInstrumentDescription: value.instrumentDescription || value.paymentInstrumentDescription
    })
const today = () => ec.l10n.format(ec.user.nowTimestamp, "yyyy-MM-dd")
const filterNames = ["queue", "partyId", "paymentInstrumentEnumId", "statusId", "currencyUomId", "fromDay", "throughDay", "text"]
const gatewayFilterNames = [
    "paymentId",
    "partyId",
    "paymentGatewayConfigId",
    "action",
    "outcome",
    "fromDay",
    "throughDay",
    "text"
]
const gatewayCapacityFields = [
    ["authorizedAmount", "Authorized"],
    ["capturedAmount", "Captured cash"],
    ["providerCapturedAmount", "Accepted captures"],
    ["authorizationHeldAmount", "Authorization reserved"],
    ["captureHeldAmount", "Capture reserved"],
    ["releaseHeldAmount", "Release reserved"],
    ["releasedAmount", "Released"],
    ["capturableAmount", "Available to capture"]
]
const gatewayStateDescriptions = {
    reserved: "Reserved",
    dispatched: "Submitted",
    pending: "Pending provider confirmation",
    uncertain: "Provider status uncertain",
    declined: "Declined",
    accepted: "Accepted",
    quarantined: "Needs investigation",
    none: "No cash posting",
    accepted_unposted: "Cash posting needs review",
    completed: "Completed"
}
const gatewayReasonMessages = {
    PERMISSION_DENIED: "Gateway actions require treasury access.",
    SETTLEMENT_GUARD_REQUIRED: "Enable settlement application controls before using gateway actions.",
    GATEWAY_WORKFLOW_REQUIRED: "Enable gateway processing for this organization.",
    GATEWAY_DRAFT_REQUIRED: "Prepare a proposed payment before reviewing a gateway action.",
    GATEWAY_PAYMENT_INELIGIBLE: "This payment uses the manual payment workflow.",
    GATEWAY_ADAPTER_UNSUPPORTED: "Choose an approved gateway with the required operation and status checks.",
    GATEWAY_BINDING_UNAVAILABLE: "No approved gateway is available for this payment and date."
}
function findParameters(value) {
    if (!value) return {}
    if (typeof value !== "string" || value.length > 8192) throw new Error("Payment filters are not available")
    const decoded = JSON.parse(value)
    return Object.fromEntries(
        [...filterNames, "pageIndex", "pageSize"].filter(key => decoded[key] != null).map(key => [key, decoded[key]])
    )
}
function gatewayFindParameters(value) {
    if (!value) return {}
    if (typeof value !== "string" || value.length > 8192) throw new Error("Gateway filters are not available")
    const decoded = JSON.parse(value)
    return Object.fromEntries(
        [...gatewayFilterNames, "pageIndex", "pageSize", "attemptId"]
            .filter(field => decoded[field] != null)
            .map(field => [field, decoded[field]])
    )
}

function access(parameters) {
    if (parameters.appRoot && parameters.appRoot !== "Accounting") throw new Error("Payment context is not available")
    const scope = policy.scope(parameters)
    const cap = scope.capabilities
    if (!(cap.paymentRead || cap.reportRead || cap.arRead || cap.apRead || cap.admin || cap.systemAdmin))
        throw new Error("Payment read authority is required")
    return scope
}

// These tokens preserve the revision the user selected. Never discover a new revision during a submitted write.
function reviewedToken(value, label = "payment method") {
    if (typeof value !== "string" || value.length > 2048) throw new Error("Choose a " + label + " from the list")
    const separator = value.lastIndexOf("~")
    if (separator < 1 || separator === value.length - 1) throw new Error("Review the selected " + label + " again")
    return {id: value.slice(0, separator), version: value.slice(separator + 1)}
}

function reviewedSelection(value, label = "evidence file", maximum = 10) {
    let selected = value == null || value === "" ? [] : value
    if (typeof selected === "string") selected = selected.trim().startsWith("[") ? JSON.parse(selected) : [selected]
    if (!Array.isArray(selected) || selected.length > maximum) throw new Error("Choose at most " + maximum + " " + label + "s")
    const versions = new Map()
    for (const token of selected) {
        const item = reviewedToken(token, label)
        if (versions.has(item.id) && versions.get(item.id) !== item.version)
            throw new Error("An item has different reviewed revisions. Choose it again")
        versions.set(item.id, item.version)
    }
    return {ids: Array.from(versions.keys()), versions: Object.fromEntries(versions)}
}

function gatewayConfirmationKey(retained) {
    if (!retained?.previewId || !["gatewayAction", "gatewayRecovery"].includes(retained.previewKind))
        throw new Error("Review the gateway action before confirming it")
    return (
        retained.operationKey ||
        "gw-" +
            policy.hash({previewId: retained.previewId, previewKind: retained.previewKind, userId: ec.user.userId}).slice(0, 32)
    )
}

function gatewayOutputRows(retained, organizationPartyId) {
    if (retained.results?.financialState !== "completed") return []
    return rows(retained.results.outputRows).map(row =>
        Object.assign(row, {
            // Issued cash documents belong to the actual capture child, never the authorization parent.
            canOpen: row.canOpen === true && !!row.paymentId && !!row.outputId,
            outputParameters: {
                organizationPartyId,
                paymentId: row.paymentId || "",
                recordId: row.paymentId || "",
                sourceVersion: "",
                outputId: row.outputId,
                outputType: row.outputType
            }
        })
    )
}

function gatewayReviewPresentation(retained, organizationPartyId, currencyUomId = null) {
    if (!retained?.previewId) return null
    const operationKey = gatewayConfirmationKey(retained),
        review = reviewPresentation(retained, currencyUomId),
        result = retained.results || {},
        completed = result.financialState === "completed",
        stateText = gatewayStateDescriptions
    return Object.assign(review, {
        isGateway: true,
        previewKind: retained.previewKind,
        financialOnly: retained.financialOnly === true,
        gatewaySummary: policy.display(retained.gatewaySummary || {}),
        capacityEffectRows: gatewayCapacityFields
            .filter(([field]) => retained.before?.[field] != null || retained.after?.[field] != null)
            .map(([field, label]) => ({
                label,
                beforeAmount: retained.before?.[field] ?? null,
                afterAmount: retained.after?.[field] ?? null,
                currencyUomId:
                    retained.after?.currencyUomId || retained.before?.currencyUomId || review.paymentSummary.currencyUomId
            })),
        plannedCapacityAssumption: retained.after?.assumption || null,
        reservationRows: rows(retained.reservationEffects),
        operationKey,
        confirmParameters: {previewId: retained.previewId, inputFingerprint: retained.inputFingerprint, operationKey},
        canConfirm: retained.canApply === true && !review.summaryUnavailable && !array(retained.blockers).length,
        hasResults: !!result.attemptId && !!retained.operationKey && ["submitted", "complete"].includes(retained.status),
        financialCompleted: completed,
        providerStateText: stateText[result.providerState] || "",
        financialStateText:
            completed && ["authorize", "release"].includes(retained.action || result.action)
                ? "No cash posting required"
                : stateText[result.financialState] || "",
        resultsTitle: completed ? "Gateway action completed" : "Gateway status recorded",
        resultRows: ["attemptId", "providerOperationId", "reasonCode"]
            .filter(field => result[field] != null)
            .map(field => ({
                label: {attemptId: "Attempt", providerOperationId: "Provider operation", reasonCode: "Outcome"}[field],
                value: result[field]
            })),
        actualPaymentRows:
            completed && result.cashPaymentId
                ? [
                      {
                          paymentId: result.cashPaymentId,
                          label: "Captured payment",
                          recordParameters: {
                              organizationPartyId,
                              paymentId: result.cashPaymentId,
                              recordId: result.cashPaymentId,
                              previewId: "",
                              previewKind: ""
                          }
                      }
                  ]
                : [],
        applicationResultRows: completed ? review.applicationResultRows : [],
        postingResultRows: completed ? review.postingResultRows : [],
        outputResultRows: gatewayOutputRows(retained, organizationPartyId)
    })
}

function gatewayCapacityRows(summary) {
    return gatewayCapacityFields
        .filter(([field]) => summary?.[field] != null)
        .map(([field, label]) => ({label, amount: summary[field], currencyUomId: summary.currencyUomId}))
}

function gatewayAttemptPresentation(value, organizationPartyId) {
    if (!value?.attemptId || !value.attemptVersion) throw new Error("The selected gateway attempt is not available")
    const result = policy.display(
        policy.pick(value, [
            "attemptId",
            "attemptVersion",
            "providerOperationId",
            "paymentId",
            "cashPaymentId",
            "action",
            "outcome",
            "providerState",
            "financialState",
            "amount",
            "currencyUomId",
            "accountingDateText",
            "operationKey",
            "reasonCode",
            "errorMessage"
        ])
    )
    result.capabilities = value.capabilities || {}
    result.paymentSummary = policy.display(value.paymentSummary || {})
    result.gatewaySummary = policy.display(value.gatewaySummary || {})
    result.providerStateText = gatewayStateDescriptions[value.providerState] || value.providerState || ""
    result.financialStateText =
        value.financialState === "completed" && ["authorize", "release"].includes(value.action)
            ? "No cash posting required"
            : gatewayStateDescriptions[value.financialState] || value.financialState || ""
    result.financialCompleted = value.financialState === "completed"
    if (!result.financialCompleted) delete result.cashPaymentId
    result.paymentParameters = {
        organizationPartyId,
        paymentId: value.paymentId,
        recordId: value.paymentId,
        previewId: "",
        previewKind: ""
    }
    result.cashPaymentParameters =
        result.financialCompleted && value.cashPaymentId
            ? {organizationPartyId, paymentId: value.cashPaymentId, recordId: value.cashPaymentId, previewId: "", previewKind: ""}
            : null
    result.outputRows = gatewayOutputRows({results: value}, organizationPartyId)
    result.postingRows = result.financialCompleted
        ? array(value.acctgTransIds).map(acctgTransId => ({acctgTransId, canOpen: value.capabilities?.canReadLedger === true}))
        : []
    result.lookupParameters = {
        organizationPartyId,
        attemptId: value.attemptId,
        attemptVersion: value.attemptVersion,
        operationKey:
            "gwl-" +
            policy.hash({attemptId: value.attemptId, attemptVersion: value.attemptVersion, userId: ec.user.userId}).slice(0, 32)
    }
    result.recoveryValue = {organizationPartyId, attemptId: value.attemptId, attemptVersion: value.attemptVersion}
    return result
}

function gatewayTransactionRows(value, organizationPartyId, filters = {}, providerNames = {}) {
    return rows(value).map(row =>
        Object.assign(row, {
            currencyUomId: row.currencyUomId || row.amountUomId,
            providerStateText:
                gatewayStateDescriptions[row.providerState] ||
                (row.resultError === "Y"
                    ? "Error"
                    : row.resultDeclined === "Y"
                      ? "Declined"
                      : row.resultSuccess === "Y"
                        ? "Accepted"
                        : "Recorded"),
            financialStateText:
                row.financialState === "completed" && ["authorize", "release"].includes(row.action)
                    ? "No cash posting required"
                    : gatewayStateDescriptions[row.financialState] || "",
            providerName: providerNames[row.paymentGatewayConfigId] || row.paymentGatewayConfigId || "",
            paymentParameters: {
                organizationPartyId,
                paymentId: row.paymentId,
                recordId: row.paymentId,
                previewId: "",
                previewKind: ""
            },
            attemptParameters: row.attemptId ? Object.assign({}, filters, {organizationPartyId, attemptId: row.attemptId}) : null,
            cashPaymentParameters:
                row.financialState === "completed" && row.cashPaymentId
                    ? {
                          organizationPartyId,
                          paymentId: row.cashPaymentId,
                          recordId: row.cashPaymentId,
                          previewId: "",
                          previewKind: ""
                      }
                    : null
        })
    )
}

function gatewayTransactionsContext(parameters) {
    const scope = access(parameters),
        filters = Object.fromEntries(gatewayFilterNames.map(field => [field, parameters[field] || ""])),
        result = scope.organizationPartyId
            ? policy.call(
                  native + "find#PaymentGatewayTransactions",
                  Object.assign({}, filters, {
                      organizationPartyId: scope.organizationPartyId,
                      pageIndex: parameters.pageIndex,
                      pageSize: parameters.pageSize,
                      selectedAttemptIdList: parameters.attemptId ? [parameters.attemptId] : []
                  })
              )
            : {}
    let selectedAttempt = null,
        attemptUnavailable = false
    if (scope.organizationPartyId && parameters.attemptId && result.complete === true) {
        try {
            const attempt = policy.probe(native + "get#PaymentGatewayAttempt", {
                organizationPartyId: scope.organizationPartyId,
                attemptId: parameters.attemptId
            })
            if (attempt.attemptId !== parameters.attemptId) throw new Error("Gateway attempt identity changed")
            selectedAttempt = gatewayAttemptPresentation(attempt, scope.organizationPartyId)
            const response = [...array(result.selectedRows), ...array(result.rows)].find(
                row => row.attemptId === attempt.attemptId && row.paymentId === attempt.paymentId
            )
            if (response) {
                selectedAttempt.providerReference = response.referenceNum || ""
                selectedAttempt.providerResponseCode = response.responseCode || ""
            }
            selectedAttempt.recoveryValue.gatewayFindJson = JSON.stringify(
                Object.assign({}, filters, {
                    attemptId: parameters.attemptId,
                    pageIndex: result.pageIndex,
                    pageSize: result.pageSize
                })
            )
            Object.assign(selectedAttempt.lookupParameters, filters)
        } catch (error) {
            ec.logger.warn("Gateway attempt " + parameters.attemptId + " is unavailable: " + error.message)
            attemptUnavailable = true
        }
    }
    const nativeRows = result.complete === true ? array(result.rows) : [],
        providerIds = [...new Set(nativeRows.map(row => row.paymentGatewayConfigId).filter(Boolean))]
    let providerNames = {},
        providerLabelsUnavailable = false
    if (scope.organizationPartyId && providerIds.length) {
        try {
            const providers = policy.probe(native + "find#PaymentGatewayProviders", {
                organizationPartyId: scope.organizationPartyId,
                selectedIdList: providerIds,
                pageSize: 1
            })
            if (providers.complete !== true) throw new Error("Gateway provider labels are incomplete")
            providerNames = Object.fromEntries(
                array(providers.selectedRows).map(row => [row.paymentGatewayConfigId, row.description])
            )
        } catch (error) {
            ec.logger.warn("Gateway provider labels are unavailable: " + error.message)
            providerLabelsUnavailable = true
        }
    }
    return Object.assign({}, filters, {
        organizationPartyId: scope.organizationPartyId,
        attemptId: parameters.attemptId || "",
        records: gatewayTransactionRows(nativeRows, scope.organizationPartyId, filters, providerNames),
        recordsCount: result.recordCount ?? 0,
        recordsPageIndex: result.pageIndex ?? 0,
        recordsPageSize: result.pageSize ?? 20,
        recordsPageMaxIndex: result.pageMaxIndex ?? 0,
        recordsPageRangeLow: result.pageRangeLow ?? 0,
        recordsPageRangeHigh: result.pageRangeHigh ?? 0,
        gatewayTransactions: {
            ready: !!scope.organizationPartyId,
            available: result.complete === true,
            complete: result.complete === true,
            errors: array(result.errors),
            filters: Object.assign({organizationPartyId: scope.organizationPartyId}, filters),
            selectedAttempt,
            attemptUnavailable,
            providerLabelsUnavailable
        }
    })
}

function draftInput(parameters) {
    const input = Object.fromEntries(
        [
            "organizationPartyId",
            "paymentId",
            "sourceVersion",
            "cashDirection",
            "partyId",
            "amount",
            "currencyUomId",
            "effectiveDate",
            "paymentInstrumentEnumId",
            "referenceNumber",
            "comments",
            "operationKey"
        ].map(key => [key, parameters[key]])
    )
    for (const [field, prefix] of [
        ["organizationMethodToken", "organization"],
        ["counterpartyMethodToken", "counterparty"]
    ]) {
        if (!parameters[field]) continue
        const method = reviewedToken(parameters[field])
        input[prefix + "PaymentMethodId"] = method.id
        input[prefix + "MethodVersion"] = method.version
    }
    return input
}

function stateInput(parameters) {
    const evidence = reviewedSelection(parameters.evidenceTokenList)
    return Object.assign(
        Object.fromEntries(
            ["organizationPartyId", "paymentId", "sourceVersion", "action", "settlementDate", "referenceNumber", "reason"].map(
                key => [key, parameters[key]]
            )
        ),
        {evidenceContentIdList: evidence.ids, evidenceVersions: evidence.versions}
    )
}

function unapplyInput(parameters) {
    const selected = reviewedSelection(parameters.applicationTokenList, "application", 200)
    return {
        organizationPartyId: parameters.organizationPartyId,
        paymentId: parameters.paymentId,
        sourceVersion: parameters.sourceVersion,
        paymentApplicationIdList: selected.ids,
        applicationVersions: selected.versions,
        reason: parameters.reason
    }
}

function gatewayActionInput(parameters) {
    if (!["authorize", "capture", "release"].includes(parameters.action)) throw new Error("Choose an available gateway action")
    const input = Object.fromEntries(
            [
                "organizationPartyId",
                "paymentId",
                "sourceVersion",
                "action",
                "amount",
                "effectiveDate",
                "reason",
                "referenceNumber",
                "parentAttemptId"
            ].map(field => [field, parameters[field]])
        ),
        evidence = reviewedSelection(parameters.evidenceTokenList)
    if (parameters.gatewayBindingToken) {
        const binding = reviewedToken(parameters.gatewayBindingToken, "gateway")
        input.paymentGatewayConfigId = binding.id
        input.gatewayBindingVersion = binding.version
    }
    return Object.assign(input, {evidenceContentIdList: evidence.ids, evidenceVersions: evidence.versions})
}

function refundInput(parameters) {
    const input = Object.fromEntries(
        [
            "organizationPartyId",
            "paymentId",
            "sourceVersion",
            "amount",
            "effectiveDate",
            "reason",
            "referenceNumber",
            "paymentInstrumentEnumId"
        ].map(field => [field, parameters[field]])
    )
    if (parameters.refundDraftToken) {
        const draft = reviewedToken(parameters.refundDraftToken, "refund draft")
        input.refundPaymentId = draft.id
        input.refundSourceVersion = draft.version
    }
    for (const prefix of ["organization", "counterparty"]) {
        if (!parameters[prefix + "MethodToken"]) continue
        const method = reviewedToken(parameters[prefix + "MethodToken"], "method")
        input[prefix + "PaymentMethodId"] = method.id
        input[prefix + "MethodVersion"] = method.version
    }
    const evidence = reviewedSelection(parameters.evidenceTokenList)
    return Object.assign(input, {evidenceContentIdList: evidence.ids, evidenceVersions: evidence.versions})
}

function refundReviewPresentation(retained, organizationPartyId, currencyUomId = null) {
    if (!retained?.previewId) return null
    const review = reviewPresentation(retained, currencyUomId),
        result = retained.results || {},
        completed =
            retained.status === "complete" &&
            !!retained.operationKey &&
            !!result.refundPaymentId &&
            result.paymentId === retained.paymentId &&
            result.originalPaymentId === retained.paymentId,
        operationKey =
            retained.operationKey || "rfd-" + policy.hash({previewId: retained.previewId, userId: ec.user.userId}).slice(0, 32)
    return Object.assign(review, {
        isRefund: true,
        previewKind: "refund",
        refundSummary: policy.display(retained.refundSummary || {}),
        operationKey,
        canConfirm:
            retained.status === "review" &&
            retained.canApply === true &&
            !review.summaryUnavailable &&
            !array(retained.blockers).length &&
            !completed,
        hasResults: completed,
        resultsTitle: "Refund completed",
        confirmParameters: {previewId: retained.previewId, inputFingerprint: retained.inputFingerprint, operationKey},
        actualRefundRows: completed
            ? [
                  {
                      paymentId: result.refundPaymentId,
                      amount: result.amount,
                      currencyUomId: result.currencyUomId,
                      recordParameters: {
                          organizationPartyId,
                          paymentId: result.refundPaymentId,
                          recordId: result.refundPaymentId,
                          previewId: "",
                          previewKind: ""
                      }
                  }
              ]
            : [],
        fundingRows: [
            "originalCashAmount",
            "completedRefundAmount",
            "heldRefundAmount",
            "unappliedTotal",
            "reservedAmount",
            "availableAmount",
            "refundableAmount"
        ]
            .filter(field => retained.before?.[field] != null || retained.after?.[field] != null)
            .map(field => ({
                label: {
                    originalCashAmount: "Original cash",
                    completedRefundAmount: "Refunded",
                    heldRefundAmount: "Refunds reserved",
                    unappliedTotal: "Unapplied cash",
                    reservedAmount: "Cash reserved",
                    availableAmount: "Available cash",
                    refundableAmount: "Available to refund"
                }[field],
                beforeAmount: retained.before?.[field] ?? null,
                afterAmount: retained.after?.[field] ?? null,
                currencyUomId: retained.refundSummary?.currencyUomId || currencyUomId
            })),
        resultRows: completed
            ? ["originalPaymentId", "refundPaymentId", "paymentApplicationId", "paymentLifecycleEventId", "reasonCode"]
                  .filter(field => result[field] != null)
                  .map(field => ({
                      label: {
                          originalPaymentId: "Original payment",
                          refundPaymentId: "Refund payment",
                          paymentApplicationId: "Funding application",
                          paymentLifecycleEventId: "Recorded event",
                          reasonCode: "Outcome"
                      }[field],
                      value: result[field]
                  }))
            : [],
        applicationResultRows: completed ? review.applicationResultRows : [],
        postingResultRows: completed ? review.postingResultRows : [],
        outputResultRows: completed
            ? rows(result.outputRows).map(row =>
                  Object.assign(row, {
                      canOpen: row.canOpen === true && row.paymentId === result.refundPaymentId && !!row.outputId,
                      outputParameters: {
                          organizationPartyId,
                          paymentId: row.paymentId === result.refundPaymentId ? row.paymentId : "",
                          recordId: row.paymentId === result.refundPaymentId ? row.paymentId : "",
                          sourceVersion: "",
                          outputId: row.outputId,
                          outputType: row.outputType
                      }
                  })
              )
            : []
    })
}

function refundPreparedValue(retained) {
    const defaults = retained.refundDefaults || {},
        token = prefix =>
            defaults[prefix + "PaymentMethodId"] && defaults[prefix + "MethodVersion"]
                ? defaults[prefix + "PaymentMethodId"] + "~" + defaults[prefix + "MethodVersion"]
                : null
    return {
        sourceVersion: retained.sourceVersion,
        amount: retained.paymentSummary?.amount,
        effectiveDate: retained.paymentSummary?.accountingDateText || retained.effectiveDateText,
        reason: retained.reason || "",
        referenceNumber: retained.referenceNumber || "",
        paymentInstrumentEnumId: retained.paymentInstrumentEnumId || defaults.paymentInstrumentEnumId,
        refundDraftToken:
            retained.refundPaymentId && retained.refundSourceVersion
                ? retained.refundPaymentId + "~" + retained.refundSourceVersion
                : null,
        organizationMethodToken: token("organization"),
        counterpartyMethodToken: token("counterparty"),
        evidenceTokenList: array(retained.evidenceRows)
            .filter(row => row.paymentContentId && row.version)
            .map(row => row.paymentContentId + "~" + row.version)
    }
}

function listContext(parameters) {
    const scope = access(parameters)
    const filters = Object.fromEntries(filterNames.map(key => [key, parameters[key] || ""]))
    filters.queue = filters.queue || "incoming"
    const result = scope.organizationPartyId
        ? policy.call(
              native + "find#Payments",
              Object.assign({}, filters, {
                  organizationPartyId: scope.organizationPartyId,
                  pageIndex: parameters.pageIndex,
                  pageSize: parameters.pageSize
              })
          )
        : {}
    const cap = result.capabilities || {}
    const records = cap.canRead === true ? array(result.rows).map(paymentRow) : []
    return Object.assign({}, filters, {
        organizationPartyId: scope.organizationPartyId,
        records,
        recordsCount: result.recordCount ?? 0,
        recordsPageIndex: result.pageIndex ?? 0,
        recordsPageSize: result.pageSize ?? 20,
        recordsPageMaxIndex: result.pageMaxIndex ?? 0,
        recordsPageRangeLow: result.pageRangeLow ?? 0,
        recordsPageRangeHigh: result.pageRangeHigh ?? 0,
        paymentList: {
            ready: !!scope.organizationPartyId,
            available: !scope.organizationPartyId || (cap.canRead === true && result.complete === true),
            incomplete: !!result.incomplete,
            errors: array(result.errors),
            capabilities: cap,
            canCreate: cap.canCreate === true,
            guardDisabled: cap.guardEnabled === false,
            totals: result.totals || {},
            filters: Object.assign({organizationPartyId: scope.organizationPartyId}, filters),
            detailParameters: {
                organizationPartyId: scope.organizationPartyId,
                paymentId: "",
                previewId: "",
                previewKind: "",
                operationKey: "",
                findJson: JSON.stringify(
                    Object.assign({}, filters, {pageIndex: parameters.pageIndex || 0, pageSize: parameters.pageSize || 20})
                )
            },
            queues: [
                ["incoming", "Incoming"],
                ["outgoing", "Outgoing"],
                ["toValidate", "To validate"],
                ["unapplied", "Unapplied"],
                ["refunds", "Refunds"],
                ["transfers", "Transfers"],
                ["all", "All"]
            ].map(([queue, title]) => ({
                title,
                parameters: Object.assign({organizationPartyId: scope.organizationPartyId}, filters, {queue, pageIndex: 0})
            }))
        },
        newPaymentValue: {
            organizationPartyId: scope.organizationPartyId,
            cashDirection: filters.queue === "outgoing" ? "outgoing" : "incoming",
            currencyUomId: scope.organizationPartyId ? policy.preference(scope.organizationPartyId).baseCurrencyUomId : null,
            effectiveDate: today(),
            operationKey:
                "pay-" +
                policy.hash({userId: ec.user.userId, at: String(ec.user.nowTimestamp), random: Math.random()}).slice(0, 32)
        }
    })
}

function reviewPresentation(retained, currencyUomId = null) {
    if (!retained?.previewId) return null
    const paymentSummary = retained.paymentSummary || {}
    const hasSummary =
        paymentSummary.paymentId === retained.paymentId && paymentSummary.amount != null && !!paymentSummary.currencyUomId
    const operationKey =
        retained.operationKey || "pay-" + policy.hash({previewId: retained.previewId, userId: ec.user.userId}).slice(0, 32)
    return Object.assign({}, policy.display(retained), {
        before: policy.display(retained.before || {}),
        after: policy.display(retained.after || {}),
        paymentSummary,
        postingSummary: retained.postingSummary || {},
        summaryUnavailable: !hasSummary,
        evidenceRows: rows(retained.evidenceRows),
        applicationEffects: rows(retained.applicationEffects).map(row =>
            Object.assign(row, {
                fromPaymentId: row.paymentId || null,
                targetPaymentId: row.toPaymentId || null,
                amountOriginallyApplied: row.amountOriginallyApplied ?? row.amountApplied,
                currencyUomId: row.currencyUomId || paymentSummary.currencyUomId
            })
        ),
        balanceRows: rows(retained.beforeBalances).map(before => {
            const after = array(retained.afterBalances).find(
                row => row.sourceKind === before.sourceKind && row.sourceId === before.sourceId
            )
            return {
                sourceKind: before.sourceKind,
                sourceId: before.sourceId,
                original: before.original,
                beforeRemaining: before.remaining,
                afterRemaining: after?.remaining,
                currencyUomId: before.currencyUomId || paymentSummary.currencyUomId
            }
        }),
        ledgerPreview: array(retained.ledgerPreview).flatMap(plan =>
            plan.lines
                ? rows(plan.lines).map(line =>
                      Object.assign(line, {
                          currencyUomId: plan.amountUomId || plan.currencyUomId || currencyUomId,
                          originalAcctgTransId: plan.originalAcctgTransId,
                          accountingDateText: plan.accountingDateText || paymentSummary.accountingDateText,
                          accountName: line.accountName || line.accountCode || line.glAccountId
                      })
                  )
                : [policy.display(plan)]
        ),
        blockers: array(retained.blockers),
        operationKey,
        results: retained.results || {},
        applicationResultRows: rows(retained.results?.applicationResults).map(row =>
            Object.assign(row, {currencyUomId: row.currencyUomId || paymentSummary.currencyUomId})
        ),
        postingResultRows: array(retained.results?.acctgTransIds)
            .filter(id => typeof id === "string" && !!id)
            .map(acctgTransId => ({
                acctgTransId,
                action: retained.results.action || null,
                canOpen: retained.capabilities?.canReadLedger === true
            })),
        outputResultRows: rows(retained.results?.outputRows).map(row =>
            Object.assign(row, {
                canOpen:
                    retained.capabilities?.[
                        {receipt: "canPrintReceipt", detail: "canPrintDetail", check: "canPrintCheck"}[row.outputType]
                    ] === true
            })
        ),
        confirmParameters: {
            previewId: retained.previewId,
            inputFingerprint: retained.inputFingerprint,
            operationKey,
            reviewed: "Y"
        },
        resultRows: ["paymentId", "statusId", "paymentLifecycleEventId", "reasonCode", "outputId"]
            .filter(field => retained.results?.[field] != null)
            .map(field => ({
                label: {
                    paymentId: "Payment",
                    statusId: "State",
                    paymentLifecycleEventId: "Recorded event",
                    reasonCode: "Outcome",
                    outputId: "Issued document"
                }[field],
                value: retained.results[field]
            })),
        canConfirm: retained.canApply === true && hasSummary && !array(retained.blockers).length && !retained.results?.paymentId,
        effectRows: [
            ["Status", "statusDescription", "statusId"],
            ["Payment date", "accountingDateText", "effectiveDateText"],
            ["Settlement date", "settlementDateText"],
            ["Reference", "referenceNumber", "paymentRefNum"]
        ]
            .map(([label, ...fields]) => ({
                label,
                beforeText: fields.map(field => retained.before?.[field]).find(value => value != null && value !== "") || "",
                afterText: fields.map(field => retained.after?.[field]).find(value => value != null && value !== "") || ""
            }))
            .filter(row => row.beforeText !== "" || row.afterText !== "")
    })
}

function detailContext(parameters) {
    const scope = access(parameters)
    const paymentId = parameters.paymentId || parameters.recordId
    const result = policy.call(native + "get#PaymentFinanceDetail", {organizationPartyId: scope.organizationPartyId, paymentId})
    const payment = paymentRow(result.payment || {})
    const cap = result.capabilities || {}
    if (!payment.paymentId || cap.canRead !== true) throw new Error("Payment detail is not available")
    const previewKind = parameters.previewKind || "state"
    const isGateway = ["gatewayAction", "gatewayRecovery"].includes(previewKind)
    if (!["state", "unapply", "gatewayAction", "gatewayRecovery", "refund"].includes(previewKind))
        throw new Error("Payment review is not available")
    const retained = parameters.previewId
        ? policy.call(
              native +
                  (isGateway
                      ? "get#PaymentGatewayActionPreview"
                      : previewKind === "refund"
                        ? "get#PaymentRefundPreview"
                        : previewKind === "unapply"
                          ? "get#PaymentUnapplyPreview"
                          : "get#PaymentStatePreview"),
              {
                  organizationPartyId: scope.organizationPartyId,
                  previewId: parameters.previewId
              }
          )
        : null
    if (retained && retained.paymentId !== paymentId)
        throw new Error("PAYMENT_REVIEW_MISMATCH: This review belongs to another payment")
    if (retained && isGateway && retained.previewKind !== previewKind)
        throw new Error("PAYMENT_REVIEW_MISMATCH: This review belongs to another gateway action")
    if (retained && previewKind === "refund" && retained.previewKind !== "refund")
        throw new Error("PAYMENT_REVIEW_MISMATCH: This review belongs to another refund")
    const refundEdit = parameters.refundEditPreviewId
        ? policy.call(native + "get#PaymentRefundPreview", {
              organizationPartyId: scope.organizationPartyId,
              previewId: parameters.refundEditPreviewId
          })
        : null
    if (refundEdit && (refundEdit.paymentId !== paymentId || refundEdit.previewKind !== "refund"))
        throw new Error("PAYMENT_REVIEW_MISMATCH: This preparation belongs to another refund")
    const review = isGateway
        ? gatewayReviewPresentation(retained, scope.organizationPartyId, payment.currencyUomId)
        : previewKind === "refund"
          ? refundReviewPresentation(retained, scope.organizationPartyId, payment.currencyUomId)
          : reviewPresentation(retained, payment.currencyUomId)
    if (review) {
        Object.assign(review.confirmParameters, {
            organizationPartyId: scope.organizationPartyId,
            paymentId,
            previewKind,
            findJson: parameters.findJson || "",
            gatewayFindJson: parameters.gatewayFindJson || ""
        })
        review.previewKind = previewKind
        if (previewKind === "refund")
            review.editParameters = {
                organizationPartyId: scope.organizationPartyId,
                paymentId,
                recordId: paymentId,
                previewId: "",
                previewKind: "",
                operationKey: "",
                refundEditPreviewId: review.previewId,
                _openDialog: "ManualRefundDialog"
            }
        review.gatewayReturnParameters = Object.assign({}, gatewayFindParameters(parameters.gatewayFindJson), {
            organizationPartyId: scope.organizationPartyId
        })
        review.gatewayAttemptParameters = Object.assign(
            {},
            parameters.gatewayFindJson
                ? review.gatewayReturnParameters
                : {organizationPartyId: scope.organizationPartyId, paymentId},
            {attemptId: review.results?.attemptId || ""}
        )
        if (!isGateway && previewKind !== "refund")
            review.resultsTitle = previewKind === "unapply" ? "Application correction completed" : "Payment change completed"
        for (const row of review.balanceRows) {
            row.recordPath =
                row.sourceKind === "payment"
                    ? "Payments/PaymentDetail"
                    : row.sourceKind === "invoice"
                      ? payment.financeDirection === "payable"
                          ? "Payables/BillDetail"
                          : "Receivables/InvoiceDetail"
                      : null
            row.recordParameters = {
                organizationPartyId: scope.organizationPartyId,
                recordId: row.sourceId,
                paymentId: row.sourceKind === "payment" ? row.sourceId : "",
                invoiceId: row.sourceKind === "invoice" ? row.sourceId : "",
                previewId: "",
                previewKind: ""
            }
        }
        if (!isGateway && previewKind !== "refund")
            for (const row of review.outputResultRows)
                row.outputParameters = {
                    organizationPartyId: scope.organizationPartyId,
                    paymentId,
                    outputId: row.outputId,
                    outputType: row.outputType
                }
    }
    const gatewayInstruction = policy.display(result.gatewayInstruction || {}),
        gatewayPrimaryAction = review
            ? null
            : ["authorize", "capture", "release"].find(
                  action => cap["canGateway" + action[0].toUpperCase() + action.slice(1)] === true
              ),
        gatewayDay = payment.accountingDateText && payment.accountingDateText > today() ? payment.accountingDateText : today(),
        gatewayActionValues = Object.fromEntries(
            ["authorize", "capture", "release"].map(action => [
                action,
                {
                    organizationPartyId: scope.organizationPartyId,
                    paymentId,
                    sourceVersion: result.sourceVersion,
                    action,
                    amount:
                        action === "authorize" ? payment.amount : action === "release" ? gatewayInstruction.capturableAmount : "",
                    effectiveDate: gatewayDay,
                    currencyUomId: payment.currencyUomId,
                    referenceNumber: payment.referenceNumber || "",
                    reason: "",
                    gatewayBindingToken: null,
                    parentAttemptId: gatewayInstruction.authorizationAttemptId || null
                }
            ])
        )
    const primaryAction =
        review || gatewayPrimaryAction
            ? null
            : ["validate", "deliver", "confirm"].find(
                  action => cap["can" + action[0].toUpperCase() + action.slice(1)] === true
              ) || null
    const methodVersion = id => array(result.maskedMethodRows).find(row => row.paymentMethodId === id)?.version
    const organizationMethodId =
        payment.organizationPaymentMethodId ||
        (payment.cashDirection === "incoming" ? payment.toPaymentMethodId : payment.paymentMethodId)
    const counterpartyMethodId =
        payment.counterpartyPaymentMethodId ||
        (payment.cashDirection === "incoming" ? payment.paymentMethodId : payment.toPaymentMethodId)
    const headerValue = Object.assign({}, payment, {
        organizationPartyId: scope.organizationPartyId,
        paymentId,
        sourceVersion: result.sourceVersion,
        effectiveDate: payment.effectiveDateValue || payment.accountingDateText || today(),
        referenceNumber: payment.referenceNumber || payment.paymentRefNum || "",
        organizationMethodToken:
            organizationMethodId && methodVersion(organizationMethodId)
                ? organizationMethodId + "~" + methodVersion(organizationMethodId)
                : null,
        counterpartyMethodToken:
            counterpartyMethodId && methodVersion(counterpartyMethodId)
                ? counterpartyMethodId + "~" + methodVersion(counterpartyMethodId)
                : null,
        operationKey: "pay-" + policy.hash({paymentId, sourceVersion: result.sourceVersion, userId: ec.user.userId}).slice(0, 32)
    })
    const baseParameters = {
        organizationPartyId: scope.organizationPartyId,
        paymentId,
        recordId: paymentId,
        previewId: "",
        previewKind: "",
        findJson: parameters.findJson || "",
        operationKey: "",
        refundEditPreviewId: ""
    }
    return {
        organizationPartyId: scope.organizationPartyId,
        paymentId,
        recordId: paymentId,
        recordFound: !!payment.paymentId,
        paymentHeaderValue: headerValue,
        paymentReview: review || {},
        findJson: parameters.findJson || "",
        gatewayFindJson: parameters.gatewayFindJson || "",
        refundEditPreviewId: parameters.refundEditPreviewId || "",
        financePayment: Object.assign({}, payment, {
            title: payment.description || payment.partyName || payment.paymentId,
            sourceVersion: result.sourceVersion,
            totals: result.totals || {},
            capabilities: cap,
            reasons: array(result.reasons),
            maskedMethodRows: rows(result.maskedMethodRows),
            applicationRows: rows(result.applicationRows).map(row =>
                Object.assign(row, {
                    currencyUomId: row.currencyUomId || payment.currencyUomId,
                    invoiceId: row.invoiceId || row.toInvoiceId || null,
                    relatedPaymentId: (row.paymentId === paymentId ? row.toPaymentId : row.paymentId) || null
                })
            ),
            refundRows: array(result.refundRows).map(paymentRow),
            refundSummary: policy.display(result.refundSummary || {}),
            refundSummaryAvailable: result.refundSummary?.complete === true,
            refundValue: Object.assign(
                {
                    organizationPartyId: scope.organizationPartyId,
                    paymentId,
                    sourceVersion: result.sourceVersion,
                    partyId: payment.partyId,
                    currencyUomId: payment.currencyUomId,
                    cashDirection: result.refundSummary?.refundCashDirection || null,
                    effectiveDate: today(),
                    amount: "",
                    reason: "",
                    referenceNumber: "",
                    refundDraftToken: null,
                    paymentInstrumentEnumId: result.refundDefaults?.paymentInstrumentEnumId || null,
                    organizationMethodToken:
                        result.refundDefaults?.organizationPaymentMethodId && result.refundDefaults?.organizationMethodVersion
                            ? result.refundDefaults.organizationPaymentMethodId +
                              "~" +
                              result.refundDefaults.organizationMethodVersion
                            : null,
                    counterpartyMethodToken:
                        result.refundDefaults?.counterpartyPaymentMethodId && result.refundDefaults?.counterpartyMethodVersion
                            ? result.refundDefaults.counterpartyPaymentMethodId +
                              "~" +
                              result.refundDefaults.counterpartyMethodVersion
                            : null
                },
                refundEdit ? refundPreparedValue(refundEdit) : {}
            ),
            refundSummaryRows:
                result.refundSummary?.complete === true
                    ? [
                          ["originalCashAmount", "Original cash"],
                          ["completedRefundAmount", "Refunded"],
                          ["heldRefundAmount", "Refunds reserved"],
                          ["unappliedTotal", "Unapplied cash"],
                          ["reservedAmount", "Cash reserved"],
                          ["availableAmount", "Available cash"],
                          ["refundableAmount", "Available to refund"]
                      ]
                          .filter(([field]) => result.refundSummary[field] != null)
                          .map(([field, label]) => ({
                              label,
                              amount: result.refundSummary[field],
                              currencyUomId: result.refundSummary.currencyUomId
                          }))
                    : [],
            gatewayRows: rows(result.gatewayRows).map(row =>
                Object.assign(row, {
                    currencyUomId: row.amountUomId || payment.currencyUomId,
                    gatewayOutcome:
                        row.resultError === "Y"
                            ? "Error"
                            : row.resultDeclined === "Y"
                              ? "Declined"
                              : row.resultSuccess === "Y"
                                ? "Accepted"
                                : row.transactionStatus || "Recorded"
                })
            ),
            gatewayInstruction,
            gatewayCapacityRows: gatewayCapacityRows(gatewayInstruction),
            gatewayReasonRows: array(cap.gatewayReasons).map(reasonCode => ({
                reasonCode,
                message: gatewayReasonMessages[reasonCode] || "Gateway actions are unavailable for this payment."
            })),
            gatewayActionValues,
            gatewayPrimaryAction,
            ledgerRows: rows(result.ledgerRows),
            contentRows: rows(result.contentRows).map(row =>
                Object.assign(row, {
                    fileName:
                        array(result.evidenceRows).find(file => file.paymentContentId === row.paymentContentId)?.fileName ||
                        row.description ||
                        row.paymentContentId
                })
            ),
            historyRows: rows(result.historyRows),
            sourceRows: rows(result.sourceRows),
            primaryAction,
            canEdit: !review && (cap.canEditDraft === true || cap.canEdit === true),
            hasMoreActions:
                !review &&
                [
                    "canEditDraft",
                    "canEdit",
                    "canCancel",
                    "canVoid",
                    "canPrintReceipt",
                    "canPrintDetail",
                    "canPrintCheck",
                    "canPreviewRefund"
                ].some(name => cap[name] === true),
            canReadLedger: cap.canReadLedger === true,
            canSettle:
                payment.isCash !== false &&
                payment.financeDirection === "receivable" &&
                scope.capabilities.arRead &&
                scope.capabilities.arEdit,
            hasReview: !!review,
            complete: result.complete === true,
            errors: array(result.errors),
            evidenceRows: rows(result.evidenceRows),
            evidenceIncomplete: !!result.evidenceIncomplete,
            baseParameters,
            returnParameters: Object.assign({}, findParameters(parameters.findJson), {
                organizationPartyId: scope.organizationPartyId,
                paymentId: "",
                recordId: "",
                previewId: "",
                previewKind: "",
                operationKey: ""
            }),
            settlementParameters: {
                organizationPartyId: scope.organizationPartyId,
                partyId: payment.partyId,
                currencyUomId: payment.currencyUomId
            },
            stateActions: ["validate", "deliver", "confirm", "cancel", "void"]
                .filter(action => cap["can" + action[0].toUpperCase() + action.slice(1)] === true)
                .map(action => ({
                    action,
                    title: {
                        validate: "Validate payment",
                        deliver: "Record delivery",
                        confirm: "Confirm settlement",
                        cancel: "Cancel payment",
                        void: "Void payment"
                    }[action],
                    primary: primaryAction === action,
                    parameters: Object.assign({}, baseParameters, {action, sourceVersion: result.sourceVersion})
                }))
        })
    }
}

;({
    reviewedToken,
    findParameters,
    gatewayFindParameters,
    reviewedSelection,
    gatewayConfirmationKey,
    gatewayOutputRows,
    gatewayReviewPresentation,
    gatewayCapacityRows,
    gatewayAttemptPresentation,
    gatewayTransactionRows,
    draftInput,
    stateInput,
    unapplyInput,
    gatewayActionInput,
    refundInput,
    refundReviewPresentation,
    refundPreparedValue,
    reviewPresentation,
    execute: (operation, parameters) => {
        if (operation === "list") return listContext(parameters)
        if (operation === "detail") return detailContext(parameters)
        if (operation === "gatewayTransactions") return gatewayTransactionsContext(parameters)
        throw new Error("Unknown payment screen operation")
    }
})
