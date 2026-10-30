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
const gatewayOutcomeText = {
    accepted: "Accepted",
    declined: "Declined",
    failed: "Failed",
    pending: "Pending at the gateway",
    none: "No gateway response"
}
const gatewayActionTitles = {
    authorize: "Authorize payment",
    capture: "Capture payment",
    release: "Release authorization",
    refund: "Refund through the gateway",
    lookup: "Check with the gateway"
}
const gatewayReasonMessages = {
    PERMISSION_DENIED: "Gateway actions require treasury access.",
    GATEWAY_UNAVAILABLE: "This payment has no gateway.",
    GATEWAY_ACTION_UNAVAILABLE: "No gateway action is available for this payment in its status."
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
        [...gatewayFilterNames, "pageIndex", "pageSize"]
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

const statusText = statusId => (statusId ? policy.one("moqui.basic.StatusItem", {statusId})?.description || statusId : "")
// A payment detail link that opens the payment itself, not a review.
const recordParameters = (organizationPartyId, paymentId) => ({
    organizationPartyId,
    paymentId,
    recordId: paymentId,
    previewId: "",
    previewKind: ""
})

// The parts of a retained review that the generic review sections show, empty where a gateway or refund review has none.
function reviewBase(retained, payment, operationKey) {
    return Object.assign({}, policy.display(retained), {
        paymentSummary: {
            paymentId: retained.paymentId,
            partyName: payment.partyName,
            cashDirection: payment.cashDirection,
            amount: retained.amount,
            currencyUomId: retained.currencyUomId,
            accountingDateText: retained.accountingDateText || payment.accountingDateText
        },
        postingSummary: {},
        summaryUnavailable: retained.amount == null || !retained.currencyUomId,
        evidenceRows: [],
        applicationEffects: [],
        balanceRows: [],
        ledgerPreview: [],
        blockers: [],
        applicationResultRows: [],
        postingResultRows: [],
        outputResultRows: [],
        results: retained.results || {},
        operationKey,
        confirmParameters: {
            previewId: retained.previewId,
            inputFingerprint: retained.inputFingerprint,
            operationKey,
            reviewed: "Y"
        }
    })
}

function gatewayReviewPresentation(retained, payment, organizationPartyId) {
    if (!retained?.previewId) return null
    const operationKey =
            retained.operationKey || "gw-" + policy.hash({previewId: retained.previewId, userId: ec.user.userId}).slice(0, 32),
        result = retained.results || {},
        refund = retained.action === "refund",
        hasResults = retained.status === "complete" && !!result.outcome,
        summary = retained.refundSummary || {},
        amount = toDecimal(retained.amount ?? 0)
    return Object.assign(reviewBase(retained, payment, operationKey), {
        previewKind: "gateway",
        isGateway: true,
        isProviderRefund: refund,
        actionTitle: gatewayActionTitles[retained.action] || retained.action,
        gatewaySummary: {description: retained.gatewayDescription, paymentGatewayConfigId: retained.paymentGatewayConfigId},
        postingSummary: {
            effect: refund
                ? "An accepted refund delivers and posts a refund payment applied to this payment."
                : retained.action === "capture"
                  ? "An accepted capture delivers and posts this payment."
                  : "No posting: the payment's status changes only."
        },
        effectRows: [
            {
                label: refund ? "Payment status" : "Status",
                beforeText: statusText(retained.statusId),
                afterText: statusText(retained.afterStatusId)
            }
        ],
        fundingRows: refund
            ? [
                  ["Refunded", "completedRefundAmount", amount],
                  ["Available to refund", "refundableAmount", toDecimal(0).subtract(amount)]
              ].map(([label, field, change]) => ({
                  label,
                  beforeAmount: summary[field],
                  afterAmount: summary[field] == null ? null : toDecimal(summary[field]).add(change),
                  currencyUomId: retained.currencyUomId
              }))
            : [],
        canConfirm: retained.canApply === true && retained.status === "review",
        hasResults,
        outcomeText: gatewayOutcomeText[result.outcome] || "",
        resultsTitle: hasResults ? "Gateway answer: " + (gatewayOutcomeText[result.outcome] || result.outcome) : "",
        resultRows: hasResults
            ? [
                  ["Gateway response", result.paymentGatewayResponseId],
                  ["Payment status", statusText(result.statusId)],
                  ["Refund status", statusText(result.refundStatusId)]
              ]
                  .filter(([, value]) => !!value)
                  .map(([label, value]) => ({label, value}))
            : [],
        actualPaymentRows:
            hasResults && result.refundPaymentId
                ? [
                      {
                          paymentId: result.refundPaymentId,
                          label: "Refund payment · " + statusText(result.refundStatusId),
                          recordParameters: recordParameters(organizationPartyId, result.refundPaymentId)
                      }
                  ]
                : []
    })
}

function gatewayTransactionRows(value, organizationPartyId, providerNames = {}) {
    return rows(value).map(row =>
        Object.assign(row, {
            currencyUomId: row.amountUomId,
            outcomeText: gatewayOutcomeText[row.outcome] || row.outcome || "",
            providerName: providerNames[row.paymentGatewayConfigId] || row.paymentGatewayConfigId || "",
            paymentParameters: recordParameters(organizationPartyId, row.paymentId),
            refundParameters: row.refundPaymentId ? recordParameters(organizationPartyId, row.refundPaymentId) : null
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
                      pageSize: parameters.pageSize
                  })
              )
            : {}
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
        records: gatewayTransactionRows(nativeRows, scope.organizationPartyId, providerNames),
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
    if (!["authorize", "capture", "release", "refund"].includes(parameters.action))
        throw new Error("Choose an available gateway action")
    const input = Object.fromEntries(
        ["organizationPartyId", "paymentId", "action", "reason"].map(field => [field, parameters[field]])
    )
    if (parameters.action === "refund" && parameters.amount) input.amount = parameters.amount
    return input
}

function transferInput(parameters) {
    const input = Object.fromEntries(
        [
            "organizationPartyId",
            "amount",
            "currencyUomId",
            "effectiveDate",
            "feeAmount",
            "feeGlAccountId",
            "feePartyId",
            "referenceNumber",
            "reason"
        ].map(field => [field, parameters[field]])
    )
    for (const prefix of ["from", "to"]) {
        const method = reviewedToken(parameters[prefix + "MethodToken"], "transfer method")
        input[prefix + "PaymentMethodId"] = method.id
        input[prefix + "MethodVersion"] = method.version
    }
    return input
}

function transferPreparedValue(retained) {
    return {
        fromMethodToken:
            retained.fromPaymentMethodId && retained.fromMethodVersion
                ? retained.fromPaymentMethodId + "~" + retained.fromMethodVersion
                : null,
        toMethodToken:
            retained.toPaymentMethodId && retained.toMethodVersion
                ? retained.toPaymentMethodId + "~" + retained.toMethodVersion
                : null,
        amount: retained.principalAmount,
        currencyUomId: retained.currencyUomId,
        effectiveDate: retained.accountingDateText,
        feeAmount: retained.feeAmount,
        feeGlAccountId: retained.feeGlAccountId || null,
        feePartyId: retained.feePartyId || null,
        referenceNumber: retained.referenceNumber || "",
        reason: retained.reason || ""
    }
}

function transferPresentation(retained, organizationPartyId) {
    if (!retained?.previewId) return null
    if (retained.previewKind !== "transfer") throw new Error("The selected transfer review is not available")
    const result = retained.results || {},
        complete =
            retained.status === "complete" &&
            !!retained.operationKey &&
            !!result.paymentId &&
            result.operationKey === retained.operationKey,
        summaryAvailable =
            retained.principalAmount != null &&
            retained.feeAmount != null &&
            retained.totalAmount != null &&
            !!retained.currencyUomId &&
            !!retained.accountingDateText,
        operationKey =
            retained.operationKey || "trf-" + policy.hash({previewId: retained.previewId, userId: ec.user.userId}).slice(0, 32),
        actualIds = {transfer: result.paymentId, fee: result.feePaymentId},
        legTexts = {transfer: "Transfer", fee: "Fee"}
    return Object.assign({}, policy.display(retained), {
        hasResults: complete,
        summaryAvailable,
        operationKey,
        canConfirm:
            retained.status === "review" && retained.canApply === true && summaryAvailable && !array(retained.blockers).length,
        blockers: array(retained.blockers),
        confirmParameters: {
            organizationPartyId,
            transferPreviewId: retained.previewId,
            previewId: retained.previewId,
            inputFingerprint: retained.inputFingerprint,
            operationKey
        },
        editParameters: {
            organizationPartyId,
            transferPreviewId: "",
            transferEditPreviewId: retained.previewId,
            operationKey: "",
            _openDialog: "AccountingInternalTransferDialog"
        },
        plannedLegRows: rows(retained.legRows).map(row => Object.assign(row, {legText: legTexts[row.leg] || row.leg})),
        actualLegRows: complete
            ? rows(result.legRows).map(row => {
                  const own = !!row.paymentId && row.paymentId === actualIds[row.leg]
                  return Object.assign(row, {
                      legText: legTexts[row.leg] || row.leg,
                      canOpen: own,
                      recordParameters: {
                          organizationPartyId,
                          paymentId: own ? row.paymentId : "",
                          recordId: own ? row.paymentId : "",
                          previewId: "",
                          previewKind: ""
                      }
                  })
              })
            : [],
        ledgerRows:
            retained.capabilities?.canReadLedger === true
                ? array(retained.ledgerPreview).flatMap(plan =>
                      rows(plan.lines).map(line =>
                          Object.assign(line, {
                              leg: plan.leg,
                              currencyUomId: plan.currencyUomId || retained.currencyUomId,
                              accountName: line.accountName || line.accountCode || line.glAccountId
                          })
                      )
                  )
                : [],
        postingRows: complete
            ? array(result.acctgTransIds).map(acctgTransId => ({
                  acctgTransId,
                  canOpen: retained.capabilities?.canReadLedger === true
              }))
            : [],
        outputRows: complete
            ? rows(result.outputRows).map(row => {
                  const owner = row.paymentId === result.paymentId
                  return Object.assign(row, {
                      canOpen: owner && !!row.outputId && row.outputType === "detail" && row.canOpen === true,
                      outputParameters: {
                          organizationPartyId,
                          paymentId: owner ? row.paymentId : "",
                          recordId: owner ? row.paymentId : "",
                          sourceVersion: "",
                          outputId: row.outputId,
                          outputType: row.outputType
                      }
                  })
              })
            : []
    })
}

function refundInput(parameters) {
    const input = Object.fromEntries(
        [
            "organizationPartyId",
            "paymentId",
            "amount",
            "effectiveDate",
            "reason",
            "referenceNumber",
            "paymentInstrumentEnumId"
        ].map(field => [field, parameters[field]])
    )
    for (const prefix of ["organization", "counterparty"])
        if (parameters[prefix + "MethodToken"])
            input[prefix + "PaymentMethodId"] = reviewedToken(parameters[prefix + "MethodToken"], "method").id
    return input
}

function refundReviewPresentation(retained, payment, organizationPartyId) {
    if (!retained?.previewId) return null
    const operationKey =
            retained.operationKey || "rfd-" + policy.hash({previewId: retained.previewId, userId: ec.user.userId}).slice(0, 32),
        result = retained.results || {},
        hasResults = retained.status === "complete" && !!result.refundPaymentId,
        summary = retained.refundSummary || {},
        amount = toDecimal(retained.amount ?? 0)
    return Object.assign(reviewBase(retained, payment, operationKey), {
        previewKind: "refund",
        isRefund: true,
        effectiveDateText: retained.accountingDateText,
        postingSummary: {effect: "A delivered refund payment posts on its date and is applied to this payment."},
        reviewedMethods: {
            organization: retained.organizationMethod || null,
            counterparty: retained.counterpartyMethod || null
        },
        effectRows: [],
        fundingRows: [
            ["Refunded", "completedRefundAmount", amount],
            ["Unapplied cash", "unappliedTotal", toDecimal(0).subtract(amount)],
            ["Available to refund", "refundableAmount", toDecimal(0).subtract(amount)]
        ].map(([label, field, change]) => ({
            label,
            beforeAmount: summary[field],
            afterAmount: summary[field] == null ? null : toDecimal(summary[field]).add(change),
            currencyUomId: retained.currencyUomId
        })),
        canConfirm: retained.canApply === true && retained.status === "review",
        hasResults,
        resultsTitle: "Refund completed",
        resultRows: hasResults
            ? [
                  ["Refund payment", result.refundPaymentId],
                  ["Funding application", result.paymentApplicationId],
                  ["Outcome", result.reasonCode]
              ]
                  .filter(([, value]) => !!value)
                  .map(([label, value]) => ({label, value}))
            : [],
        postingResultRows: hasResults
            ? array(result.acctgTransIds).map(acctgTransId => ({
                  acctgTransId,
                  action: "refund",
                  canOpen: true
              }))
            : [],
        actualRefundRows: hasResults
            ? [
                  {
                      paymentId: result.refundPaymentId,
                      amount: result.amount,
                      currencyUomId: result.currencyUomId,
                      recordParameters: recordParameters(organizationPartyId, result.refundPaymentId)
                  }
              ]
            : []
    })
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
    let transferReview = null,
        transferEdit = null,
        transferUnavailable = false
    for (const [field, target] of [
        ["transferPreviewId", "review"],
        ["transferEditPreviewId", "edit"]
    ]) {
        if (!parameters[field]) continue
        try {
            if (!scope.organizationPartyId) throw new Error("Choose an organization before opening a transfer")
            const retained = policy.probe(native + "get#InternalTransferPreview", {
                organizationPartyId: scope.organizationPartyId,
                previewId: parameters[field]
            })
            if (
                retained.previewKind !== "transfer" ||
                (retained.organizationPartyId && retained.organizationPartyId !== scope.organizationPartyId)
            )
                throw new Error("Transfer review scope changed")
            if (target === "review") transferReview = transferPresentation(retained, scope.organizationPartyId)
            else transferEdit = transferPreparedValue(retained)
        } catch (error) {
            ec.logger.warn("Internal transfer " + parameters[field] + " is unavailable: " + error.message)
            transferUnavailable = true
        }
    }
    return Object.assign({}, filters, {
        organizationPartyId: scope.organizationPartyId,
        records,
        recordsCount: result.recordCount ?? 0,
        recordsPageIndex: result.pageIndex ?? 0,
        recordsPageSize: result.pageSize ?? 20,
        recordsPageMaxIndex: result.pageMaxIndex ?? 0,
        recordsPageRangeLow: result.pageRangeLow ?? 0,
        recordsPageRangeHigh: result.pageRangeHigh ?? 0,
        transferPreviewId: parameters.transferPreviewId || "",
        transferEditPreviewId: parameters.transferEditPreviewId || "",
        transferReview: transferReview || {},
        transferUnavailable,
        transferValue: Object.assign(
            {
                organizationPartyId: scope.organizationPartyId,
                fromMethodToken: null,
                toMethodToken: null,
                amount: "",
                currencyUomId: scope.organizationPartyId ? policy.preference(scope.organizationPartyId).baseCurrencyUomId : null,
                effectiveDate: today(),
                feeAmount: "0",
                feeGlAccountId: null,
                referenceNumber: "",
                reason: ""
            },
            transferEdit || {}
        ),
        paymentList: {
            ready: !!scope.organizationPartyId,
            available: !scope.organizationPartyId || (cap.canRead === true && result.complete === true),
            incomplete: !!result.incomplete,
            errors: array(result.errors),
            capabilities: cap,
            canCreate: !transferReview && filters.queue !== "transfers" && cap.canCreate === true,
            canTransfer: !transferReview && cap.canTransfer === true,
            hasTransferReview: !!transferReview,
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
    const isGateway = previewKind === "gateway"
    if (!["state", "unapply", "gateway", "refund"].includes(previewKind)) throw new Error("Payment review is not available")
    const retained = parameters.previewId
        ? policy.call(
              native +
                  {
                      gateway: "get#PaymentGatewayActionPreview",
                      refund: "get#PaymentRefundPreview",
                      unapply: "get#PaymentUnapplyPreview",
                      state: "get#PaymentStatePreview"
                  }[previewKind],
              {organizationPartyId: scope.organizationPartyId, previewId: parameters.previewId}
          )
        : null
    if (retained && retained.paymentId !== paymentId)
        throw new Error("PAYMENT_REVIEW_MISMATCH: This review belongs to another payment")
    const review = isGateway
        ? gatewayReviewPresentation(retained, payment, scope.organizationPartyId)
        : previewKind === "refund"
          ? refundReviewPresentation(retained, payment, scope.organizationPartyId)
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
        review.gatewayReturnParameters = Object.assign({}, gatewayFindParameters(parameters.gatewayFindJson), {
            organizationPartyId: scope.organizationPartyId
        })
        review.gatewayTransactionParameters = {organizationPartyId: scope.organizationPartyId, paymentId}
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
    const gatewayActions = result.gatewayActions || {},
        gatewayPrimaryAction = review
            ? null
            : ["authorize", "capture"].find(action => array(gatewayActions.actionList).includes(action)) || null,
        // The values of the authorize, capture and release dialogs: the payment's whole amount, a reason to enter.
        gatewayActionValues = Object.fromEntries(
            ["authorize", "capture", "release"].map(action => [
                action,
                {
                    organizationPartyId: scope.organizationPartyId,
                    paymentId,
                    action,
                    amount: payment.amount,
                    currencyUomId: payment.currencyUomId,
                    reason: ""
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
        operationKey: ""
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
            transferSummary: policy.display(result.transferSummary || {}),
            transferLegRows: rows(result.transferLegRows).map(row =>
                Object.assign(row, {
                    legText: {outgoing: "Outgoing", incoming: "Incoming"}[row.leg] || row.leg,
                    recordParameters: {
                        organizationPartyId: scope.organizationPartyId,
                        paymentId: row.paymentId,
                        recordId: row.paymentId,
                        previewId: "",
                        previewKind: ""
                    }
                })
            ),
            refundSummary: policy.display(result.refundSummary || {}),
            refundSummaryAvailable: !!result.refundSummary,
            gatewayRefundValue: {
                organizationPartyId: scope.organizationPartyId,
                paymentId,
                action: "refund",
                amount: result.refundSummary?.refundableAmount ?? "",
                currencyUomId: payment.currencyUomId,
                reason: ""
            },
            refundValue: {
                organizationPartyId: scope.organizationPartyId,
                paymentId,
                partyId: payment.partyId,
                currencyUomId: payment.currencyUomId,
                cashDirection: payment.cashDirection === "incoming" ? "outgoing" : "incoming",
                effectiveDate: today(),
                amount: result.refundSummary?.refundableAmount ?? "",
                reason: "",
                referenceNumber: "",
                paymentInstrumentEnumId: payment.paymentInstrumentEnumId || null,
                organizationMethodToken:
                    organizationMethodId && methodVersion(organizationMethodId)
                        ? organizationMethodId + "~" + methodVersion(organizationMethodId)
                        : null,
                counterpartyMethodToken:
                    counterpartyMethodId && methodVersion(counterpartyMethodId)
                        ? counterpartyMethodId + "~" + methodVersion(counterpartyMethodId)
                        : null
            },
            refundSummaryRows: result.refundSummary
                ? [
                      ["amount", "Original payment"],
                      ["completedRefundAmount", "Refunded"],
                      ["pendingRefundAmount", "Refunds pending"],
                      ["unappliedTotal", "Unapplied cash"],
                      ["refundableAmount", "Available to refund"]
                  ].map(([field, label]) => ({
                      label,
                      amount: result.refundSummary[field],
                      currencyUomId: result.refundSummary.currencyUomId
                  }))
                : [],
            gatewayRows: rows(result.gatewayRows).map(row =>
                Object.assign(row, {
                    currencyUomId: row.amountUomId || payment.currencyUomId,
                    gatewayOutcome:
                        row.resultSuccess === "Y"
                            ? "Accepted"
                            : row.resultDeclined === "Y"
                              ? "Declined"
                              : row.resultError === "Y"
                                ? "Failed"
                                : row.transactionStatus || "Pending"
                })
            ),
            gatewayActions,
            gatewayReasonRows: gatewayActions.reasonCode
                ? [
                      {
                          reasonCode: gatewayActions.reasonCode,
                          message: gatewayReasonMessages[gatewayActions.reasonCode] || "Gateway actions are unavailable."
                      }
                  ]
                : [],
            gatewayLookupParameters: {organizationPartyId: scope.organizationPartyId, paymentId},
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
                    "canPreviewRefund",
                    "canGatewayRefund"
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
    gatewayReviewPresentation,
    gatewayTransactionRows,
    draftInput,
    stateInput,
    unapplyInput,
    gatewayActionInput,
    refundInput,
    refundReviewPresentation,
    transferInput,
    transferPreparedValue,
    transferPresentation,
    reviewPresentation,
    execute: (operation, parameters) => {
        if (operation === "list") return listContext(parameters)
        if (operation === "detail") return detailContext(parameters)
        if (operation === "gatewayTransactions") return gatewayTransactionsContext(parameters)
        throw new Error("Unknown payment screen operation")
    }
})
