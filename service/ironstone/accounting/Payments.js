// Payment screen contexts and the inputs of the payment write services. Mantle owns every financial decision and change;
// this shapes its answers for the payment screens and decodes the reviewed id~version tokens of their forms.
const lib = ec.resource.script("component://mr-boss/service/ironstone/accounting/AccountingLib.js")
const {policy, array, rows, today, money, statusText, recordParameters, tokenOf, factRows} = lib
const native = "mantle.account.PaymentServices."

// The color of a payment status chip (style guide §5.2): proposed grey, promised primary, authorized info, delivered and
// confirmed positive, ended negative.
const statusColors = {
    PmntProposed: "grey-7",
    PmntPromised: "primary",
    PmntAuthorized: "info",
    PmntDelivered: "positive",
    PmntConfirmed: "positive",
    PmntCancelled: "negative",
    PmntVoid: "negative",
    PmntDeclined: "negative"
}
const statusColor = statusId => statusColors[statusId] || "grey-7"
const directionTexts = {incoming: "Incoming", outgoing: "Outgoing", transfer: "Transfer"}
const sideTexts = {receivable: "Receivable", payable: "Payable", transfer: "Internal transfer"}
const queueTitles = {
    incoming: "Incoming payments",
    outgoing: "Outgoing payments",
    toValidate: "Payments to validate",
    unapplied: "Unapplied payments",
    refunds: "Refunds",
    transfers: "Internal transfers",
    all: "All payments"
}
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
const gatewayOutcomeColors = {accepted: "positive", declined: "negative", failed: "negative"}
const gatewayActionTexts = {
    authorize: "Authorize",
    capture: "Capture",
    release: "Release",
    refund: "Refund",
    lookup: "Check with the gateway"
}
const gatewayReasonMessages = {
    PERMISSION_DENIED: "Gateway actions require treasury access.",
    GATEWAY_UNAVAILABLE: "This payment has no gateway.",
    GATEWAY_ACTION_UNAVAILABLE: "No gateway action is available for this payment in its status."
}
// The state actions of a payment, in the order of its flow; cancel and void end it.
const stateTitles = {
    validate: "Validate payment",
    deliver: "Record delivery",
    confirm: "Confirm settlement",
    cancel: "Cancel payment",
    void: "Void payment"
}
const endActions = ["cancel", "void"]
// The gateway actions: what each asks of the gateway and what an accepted answer does.
const gatewayActions = {
    authorize: {
        title: "Authorize payment",
        effect: "The gateway authorizes the payment amount; nothing posts until it is captured."
    },
    capture: {
        title: "Capture payment",
        effect: "The gateway captures the authorized amount; an accepted capture delivers and posts the payment."
    },
    release: {
        title: "Release authorization",
        effect: "The gateway releases the authorization; the payment returns to promised."
    },
    refund: {
        title: "Refund through the gateway",
        effect:
            "The gateway returns the amount to the payment's card or account; an accepted refund delivers a refund " +
            "payment applied to this one."
    }
}
const outputTypeTexts = {receipt: "Receipt", detail: "Payment detail", check: "Check"}
const printCapabilities = {receipt: "canPrintReceipt", detail: "canPrintDetail", check: "canPrintCheck"}
const capabilityOf = action => "can" + action[0].toUpperCase() + action.slice(1)
// A user without the read permission or in another organization is refused; a record that does not exist or is not
// visible is only not found.
const refused = error => /PERMISSION_DENIED|ORGANIZATION_DENIED/.test(String(error.message))

const access = parameters =>
    lib.access(
        parameters,
        ["paymentRead", "reportRead", "arRead", "apRead", "admin", "systemAdmin"],
        "Payment read authority is required"
    )
const paymentParameters = (organizationPartyId, paymentId) => recordParameters(organizationPartyId, paymentId, {paymentId})

// A payment row with its instrument, direction and status color.
function paymentRow(value) {
    return Object.assign(policy.display(value), {
        paymentInstrumentDescription: value.instrumentDescription || value.paymentInstrumentDescription,
        directionText: directionTexts[value.cashDirection] || "",
        statusColor: statusColor(value.statusId)
    })
}

// The filters a list link carries, from the list's JSON (findJson): only the list's own fields.
function findParameters(value) {
    if (!value) return {}
    if (typeof value !== "string" || value.length > 8192) throw new Error("Payment filters are not available")
    const decoded = JSON.parse(value)
    return Object.fromEntries(
        [...filterNames, "pageIndex", "pageSize"].filter(key => decoded[key] != null).map(key => [key, decoded[key]])
    )
}

// The organization's gateway answers, a page at a time; the full shape when the user may not read them.
function gatewayTransactionsContext(parameters) {
    const scope = access(parameters),
        filters = Object.fromEntries(gatewayFilterNames.map(field => [field, parameters[field] || ""]))
    let result = {}
    if (scope.organizationPartyId) {
        try {
            result = policy.probe(
                native + "find#PaymentGatewayTransactions",
                Object.assign({}, filters, {
                    organizationPartyId: scope.organizationPartyId,
                    pageIndex: parameters.pageIndex,
                    pageSize: parameters.pageSize
                })
            )
        } catch (error) {
            ec.logger.info("Gateway transactions are not available: " + error.message)
        }
    }
    const nativeRows = result.complete === true ? array(result.rows) : [],
        providerIds = [...new Set(nativeRows.map(row => row.paymentGatewayConfigId).filter(Boolean))]
    let providerNames = {},
        providerLabelsUnavailable = false
    if (providerIds.length) {
        const providers = lib.optional(
            native + "find#PaymentGatewayProviders",
            {organizationPartyId: scope.organizationPartyId, selectedIdList: providerIds, pageSize: 1},
            "Gateway provider labels are unavailable"
        )
        providerNames = Object.fromEntries(
            array(providers?.selectedRows).map(row => [row.paymentGatewayConfigId, row.description])
        )
        providerLabelsUnavailable = !providers
    }
    const records = rows(nativeRows).map(row =>
        Object.assign(row, {
            currencyUomId: row.amountUomId,
            actionText: gatewayActionTexts[row.action] || row.action || "",
            outcomeText: gatewayOutcomeText[row.outcome] || row.outcome || "",
            outcomeColor: gatewayOutcomeColors[row.outcome] || "warning",
            providerName: providerNames[row.paymentGatewayConfigId] || row.paymentGatewayConfigId || "",
            paymentParameters: paymentParameters(scope.organizationPartyId, row.paymentId),
            refundParameters: row.refundPaymentId ? paymentParameters(scope.organizationPartyId, row.refundPaymentId) : null
        })
    )
    return Object.assign({}, filters, lib.paging(result), {
        organizationPartyId: scope.organizationPartyId,
        records,
        gatewayTransactions: {
            ready: !!scope.organizationPartyId,
            available: result.complete === true,
            errors: array(result.errors),
            providerLabelsUnavailable
        }
    })
}

// The payment list: its queues, filters, rows and the values of the New payment and Transfer funds forms.
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
    const baseCurrencyUomId = scope.organizationPartyId ? policy.preference(scope.organizationPartyId).baseCurrencyUomId : null
    const findJson = JSON.stringify(
        Object.assign({}, filters, {pageIndex: parameters.pageIndex || 0, pageSize: parameters.pageSize || 20})
    )
    const records =
        cap.canRead === true
            ? array(result.rows).map(value =>
                  Object.assign(paymentRow(value), {
                      detailParameters: recordParameters(scope.organizationPartyId, value.paymentId, {findJson})
                  })
              )
            : []
    return Object.assign({}, filters, lib.paging(result), {
        organizationPartyId: scope.organizationPartyId,
        records,
        transferValue: transferValue(scope.organizationPartyId, baseCurrencyUomId),
        paymentDraftValue: {
            organizationPartyId: scope.organizationPartyId,
            cashDirection: filters.queue === "outgoing" ? "outgoing" : "incoming",
            currencyUomId: baseCurrencyUomId,
            effectiveDate: today(),
            operationKey: lib.operationKey("pay")
        },
        paymentList: {
            ready: !!scope.organizationPartyId,
            available: !scope.organizationPartyId || (cap.canRead === true && result.complete === true),
            incomplete: !!result.incomplete,
            errors: array(result.errors),
            canCreate: filters.queue !== "transfers" && cap.canCreate === true,
            canTransfer: cap.canTransfer === true,
            queueTitle: queueTitles[filters.queue] || "Payments",
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
                active: queue === filters.queue,
                parameters: Object.assign({organizationPartyId: scope.organizationPartyId}, filters, {queue, pageIndex: 0})
            }))
        }
    })
}

// The values of the Transfer funds form: a new transfer, or the one a review retained.
function transferValue(organizationPartyId, currencyUomId, retained = null) {
    return retained
        ? {
              organizationPartyId,
              fromMethodToken: tokenOf(retained.fromPaymentMethodId, retained.fromMethodVersion),
              toMethodToken: tokenOf(retained.toPaymentMethodId, retained.toMethodVersion),
              amount: retained.principalAmount,
              currencyUomId: retained.currencyUomId,
              effectiveDate: retained.accountingDateText,
              feeAmount: retained.feeAmount,
              feeGlAccountId: retained.feeGlAccountId || null,
              feePartyId: retained.feePartyId || null,
              referenceNumber: retained.referenceNumber || "",
              reason: retained.reason || ""
          }
        : {
              organizationPartyId,
              fromMethodToken: null,
              toMethodToken: null,
              amount: "",
              currencyUomId,
              effectiveDate: today(),
              feeAmount: "0",
              feeGlAccountId: null,
              feePartyId: null,
              referenceNumber: "",
              reason: ""
          }
}

// A state or gateway action, for the one dialog of its kind (template/AccountingPayments.xml). Its placement is where the
// dialog is: the header's primary action, the header's More menu or the Refunds tab. A screen iterates over the whole
// list in each place, so each dialog keeps its own index on the page.
function stateAction(action, placement, sourceVersion) {
    return {
        action,
        title: stateTitles[action],
        dialogId: "PaymentState_" + action,
        placement,
        primary: placement === "primary",
        danger: endActions.includes(action),
        withSettlementDate: action === "confirm",
        sourceVersion
    }
}
function gatewayAction(action, placement, payment, amount) {
    return {
        action,
        title: gatewayActions[action].title,
        effectText: gatewayActions[action].effect,
        dialogId: "PaymentGateway_" + action,
        placement,
        primary: placement === "primary",
        danger: action === "release" || action === "refund",
        amountEditable: action === "refund",
        amount,
        currencyUomId: payment.currencyUomId,
        reason: ""
    }
}

// The payment of a detail screen, every part present: a payment that does not exist or that the user may not see has
// recordFound false and empty parts, so the screen shows its "not available" state.
function detailContext(parameters) {
    const scope = access(parameters)
    const organizationPartyId = scope.organizationPartyId
    const paymentId = parameters.paymentId || parameters.recordId || ""
    let result = {}
    if (paymentId && organizationPartyId) {
        try {
            result = policy.probe(native + "get#PaymentFinanceDetail", {organizationPartyId, paymentId})
        } catch (error) {
            if (refused(error)) throw error
            ec.logger.info("Payment " + paymentId + " is not available: " + error.message)
        }
    }
    const cap = result.capabilities || {}
    const recordFound = !!result.payment?.paymentId && cap.canRead === true
    if (!recordFound) result = {}
    const payment = paymentRow(result.payment || {})
    const transfer = result.transferSummary || {}
    const currency = payment.currencyUomId
    const isTransfer = payment.cashDirection === "transfer"
    const sourceVersion = result.sourceVersion || null
    const gatewayList = array(result.gatewayActions?.actionList)
    const gatewayPrimary = ["authorize", "capture"].find(action => gatewayList.includes(action)) || null
    const statePrimary = gatewayPrimary
        ? null
        : ["validate", "deliver", "confirm"].find(action => cap[capabilityOf(action)] === true) || null
    const primaryAction = gatewayPrimary || statePrimary
    const refundable = result.refundSummary?.refundableAmount ?? null
    const stateRows = Object.keys(stateTitles)
        .filter(action => cap[capabilityOf(action)] === true)
        .map(action => stateAction(action, action === statePrimary ? "primary" : "more", sourceVersion))
    const gatewayRows = ["authorize", "capture", "release"]
        .filter(action => gatewayList.includes(action))
        .map(action => gatewayAction(action, action === gatewayPrimary ? "primary" : "more", payment, payment.amount))
        .concat(cap.canGatewayRefund === true ? [gatewayAction("refund", "refunds", payment, refundable ?? "")] : [])
    const methodToken = id => tokenOf(id, array(result.maskedMethodRows).find(row => row.paymentMethodId === id)?.version)
    const organizationMethodId =
        payment.organizationPaymentMethodId ||
        (payment.cashDirection === "incoming" ? payment.toPaymentMethodId : payment.paymentMethodId)
    const counterpartyMethodId =
        payment.counterpartyPaymentMethodId ||
        (payment.cashDirection === "incoming" ? payment.paymentMethodId : payment.toPaymentMethodId)
    const findJson = parameters.findJson || ""
    const invoicePath = payment.financeDirection === "payable" ? "Payables/BillDetail" : "Receivables/InvoiceDetail"
    const directionCaption = isTransfer
        ? "Internal transfer"
        : (payment.cashDirection === "outgoing" ? "Payment to " : "Receipt from ") + (payment.partyName || "")
    const printRows = Object.entries(printCapabilities)
        .filter(([, capability]) => cap[capability] === true)
        .map(([outputType]) => ({
            outputType,
            text: outputTypeTexts[outputType],
            parameters: Object.assign(paymentParameters(organizationPartyId, paymentId), {outputType, sourceVersion})
        }))
    const canEdit = cap.canEditDraft === true || cap.canEdit === true
    const financePayment = Object.assign({}, payment, {
        title: payment.description || payment.partyName || payment.paymentId || paymentId,
        captionText: [directionCaption, money(payment.amount, currency), payment.accountingDateText].filter(Boolean).join(" · "),
        sideText: sideTexts[payment.financeDirection] || "",
        isTransfer,
        amountText: money(payment.amount, currency),
        appliedText: money(payment.appliedTotal, currency),
        unappliedText: money(payment.unappliedTotal, currency),
        sourceVersion,
        totals: result.totals || {},
        capabilities: cap,
        complete: !recordFound || result.complete === true,
        errors: array(result.errors),
        primaryAction,
        stateActionRows: stateRows,
        gatewayActionRows: gatewayRows,
        canEdit,
        printRows,
        hasMoreActions: canEdit || [...stateRows, ...gatewayRows].some(row => row.placement === "more") || printRows.length > 0,
        returnParameters: Object.assign({organizationPartyId}, findParameters(findJson)),
        // Overview
        originalParameters: payment.refundForPaymentId
            ? paymentParameters(organizationPartyId, payment.refundForPaymentId)
            : null,
        maskedMethodRows: rows(result.maskedMethodRows),
        sourceRows: rows(result.sourceRows),
        transferSummary: policy.display(transfer),
        transferAmountText: transfer.paymentId ? money(transfer.principalAmount, transfer.currencyUomId) : "",
        transferLegRows: rows(result.transferLegRows).map(row =>
            Object.assign(row, {
                legText: {outgoing: "Outgoing", incoming: "Incoming"}[row.leg] || row.leg,
                recordParameters: paymentParameters(organizationPartyId, row.paymentId)
            })
        ),
        feeParameters: transfer.feePaymentId ? paymentParameters(organizationPartyId, transfer.feePaymentId) : null,
        feeText: transfer.feePaymentId
            ? "Fee " + money(transfer.feeAmount ?? 0, transfer.currencyUomId) + " paid to " + (transfer.feePartyName || "")
            : "",
        // Applications
        applicationRows: rows(result.applicationRows).map(row => {
            const invoiceId = row.invoiceId || row.toInvoiceId || null
            const relatedPaymentId = (row.paymentId === paymentId ? row.toPaymentId : row.paymentId) || null
            return Object.assign(row, {
                currencyUomId: row.currencyUomId || currency,
                invoiceId,
                invoicePath,
                invoiceParameters: invoiceId ? recordParameters(organizationPartyId, invoiceId, {invoiceId}) : null,
                relatedPaymentId,
                relatedParameters: relatedPaymentId ? paymentParameters(organizationPartyId, relatedPaymentId) : null
            })
        }),
        canUnapply: cap.canUnapply === true,
        canSettle: payment.financeDirection === "receivable" && !!scope.capabilities.arRead && !!scope.capabilities.arEdit,
        settlementParameters: {organizationPartyId, partyId: payment.partyId, currencyUomId: currency},
        // Gateway
        gatewayDescription: result.gatewayActions?.gatewayDescription || "",
        gatewayActions: result.gatewayActions || {},
        canReadGateway: cap.canReadGateway === true,
        canGatewayLookup: cap.canGatewayLookup === true,
        gatewayReasonRows: result.gatewayActions?.reasonCode
            ? [{message: gatewayReasonMessages[result.gatewayActions.reasonCode] || "Gateway actions are unavailable."}]
            : [],
        gatewayRows: rows(result.gatewayRows).map(row => {
            const outcome =
                row.resultSuccess === "Y"
                    ? "accepted"
                    : row.resultDeclined === "Y"
                      ? "declined"
                      : row.resultError === "Y"
                        ? "failed"
                        : "pending"
            return Object.assign(row, {
                currencyUomId: row.amountUomId || currency,
                outcomeText: outcome === "pending" ? row.transactionStatus || "Pending" : gatewayOutcomeText[outcome],
                outcomeColor: gatewayOutcomeColors[outcome] || "warning"
            })
        }),
        // Refunds
        refundSummaryAvailable: !!result.refundSummary,
        refundableText: refundable == null ? "" : money(refundable, currency),
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
        refundRows: array(result.refundRows).map(value =>
            Object.assign(paymentRow(value), {recordParameters: paymentParameters(organizationPartyId, value.paymentId)})
        ),
        canPreviewRefund: cap.canPreviewRefund === true,
        refundValue: {
            organizationPartyId,
            paymentId,
            partyId: payment.partyId,
            currencyUomId: currency,
            cashDirection: payment.cashDirection === "incoming" ? "outgoing" : "incoming",
            effectiveDate: today(),
            amount: refundable ?? "",
            reason: "",
            referenceNumber: "",
            paymentInstrumentEnumId: payment.paymentInstrumentEnumId || null,
            organizationMethodToken: methodToken(organizationMethodId),
            counterpartyMethodToken: methodToken(counterpartyMethodId)
        },
        canGatewayRefund: cap.canGatewayRefund === true,
        // General ledger, files and history
        canReadLedger: cap.canReadLedger === true,
        ledgerRows: rows(result.ledgerRows).map(row =>
            Object.assign(row, {
                postedText: row.isPosted === "Y" ? "Posted" : "Not posted",
                transactionParameters: recordParameters(organizationPartyId, row.acctgTransId)
            })
        ),
        canReadFiles: cap.canReadFiles === true,
        contentRows: rows(result.contentRows).map(row =>
            Object.assign(row, {
                fileName:
                    array(result.evidenceRows).find(file => file.paymentContentId === row.paymentContentId)?.fileName ||
                    row.description ||
                    row.paymentContentId
            })
        ),
        evidenceIncomplete: !!result.evidenceIncomplete,
        historyRows: rows(result.historyRows)
    })
    return {
        organizationPartyId,
        paymentId,
        recordId: paymentId,
        recordFound,
        findJson,
        financePayment,
        paymentDraftValue: Object.assign({}, payment, {
            organizationPartyId,
            paymentId,
            sourceVersion,
            effectiveDate: payment.effectiveDateValue || payment.accountingDateText || today(),
            referenceNumber: payment.referenceNumber || payment.paymentRefNum || "",
            organizationMethodToken: methodToken(organizationMethodId),
            counterpartyMethodToken: methodToken(counterpartyMethodId),
            operationKey: recordFound
                ? "pay-" + policy.hash({paymentId, sourceVersion, userId: ec.user.userId}).slice(0, 32)
                : null
        })
    }
}

// The retained reviews of a payment, by the kind the review screen names.
const reviewServices = {
    state: "get#PaymentStatePreview",
    unapply: "get#PaymentUnapplyPreview",
    gateway: "get#PaymentGatewayActionPreview",
    refund: "get#PaymentRefundPreview"
}
const reviewTabs = {state: "Overview", unapply: "Applications", gateway: "Gateway", refund: "Refunds"}

// A review for PaymentDetail/Review, every part present. The kinds differ in their title, facts and planned effects;
// all confirm with the review's previewId, inputFingerprint and operation key, and show their results the same way.
function reviewPresentation(retained, kind = "state", organizationPartyId = null, financeDirection = null) {
    const summary = retained.paymentSummary || {}
    const result = retained.results || {}
    const currency = retained.currencyUomId || summary.currencyUomId
    const amount = retained.amount ?? summary.amount
    const amountText = amount == null ? "" : money(toDecimal(amount), currency)
    const operationKey = lib.reviewKey(retained, {state: "pay", unapply: "pay", gateway: "gw", refund: "rfd"}[kind])
    const gateway = kind === "gateway"
    const action = kind === "unapply" ? "unapply" : retained.action || kind
    const title =
        kind === "state"
            ? stateTitles[action] || "Change payment"
            : kind === "unapply"
              ? "Release applications"
              : gateway
                ? gatewayActions[action]?.title || "Gateway action"
                : "Refund payment"
    const blockers = array(retained.blockers)
    const summaryAvailable = kind === "state" || kind === "unapply" ? summary.paymentId === retained.paymentId : true
    const hasResults =
        kind === "refund"
            ? retained.status === "complete" && !!result.refundPaymentId
            : gateway
              ? retained.status === "complete" && !!result.outcome
              : !!result.paymentId
    const refundAmount = toDecimal(retained.amount ?? 0)
    const refundSummary = retained.refundSummary || {}
    const resultPaymentId = kind === "refund" || gateway ? result.refundPaymentId : null
    const capabilities = retained.capabilities || {}
    const review = {
        paymentId: retained.paymentId,
        previewId: retained.previewId,
        previewKind: kind,
        action,
        title,
        danger: endActions.includes(action) || kind === "unapply" || kind === "refund" || ["release", "refund"].includes(action),
        returnTab: gateway && action === "refund" ? "Refunds" : reviewTabs[kind],
        amountText,
        expiresDateText: retained.expiresDateText || "",
        confirmation: title + " " + retained.paymentId + (amountText ? " for " + amountText : "") + "?",
        paymentSummary: summary,
        summaryUnavailable: !summaryAvailable || amount == null || !currency,
        factRows: factRows([
            [kind === "refund" ? "Refund amount" : "Amount", amountText],
            ["Gateway", gateway ? retained.gatewayDescription || retained.paymentGatewayConfigId : null],
            ["Payment date", kind === "state" ? summary.accountingDateText || retained.effectiveDateText : null],
            ["Settlement date", kind === "state" ? retained.settlementDateText : null],
            ["Refund date", kind === "refund" ? retained.accountingDateText : null],
            ["Method", kind === "state" ? summary.maskedMethodLabel : null],
            ["Organization method", retained.organizationMethod?.label],
            ["Counterparty method", retained.counterpartyMethod?.label],
            ["Reference", retained.referenceNumber],
            ["Reason", retained.reason],
            [
                "Posting",
                kind === "refund"
                    ? "A delivered refund payment posts on its date and is applied to this payment."
                    : gateway
                      ? action === "refund"
                          ? "An accepted refund delivers and posts a refund payment applied to this payment."
                          : action === "capture"
                            ? "An accepted capture delivers and posts this payment."
                            : "No posting: the payment's status changes only."
                      : retained.postingSummary?.effect
            ]
        ]),
        effectRows: gateway
            ? [{label: "Status", beforeText: statusText(retained.statusId), afterText: statusText(retained.afterStatusId)}]
            : lib.effectRows(retained.before, retained.after, [
                  ["Status", "statusDescription", "statusId"],
                  ["Payment date", "accountingDateText", "effectiveDateText"],
                  ["Settlement date", "settlementDateText"],
                  ["Reference", "referenceNumber", "paymentRefNum"]
              ]),
        fundingRows:
            kind === "refund"
                ? lib.changeRows(
                      refundSummary,
                      [
                          ["Refunded", "completedRefundAmount", refundAmount],
                          ["Unapplied cash", "unappliedTotal", toDecimal(0).subtract(refundAmount)],
                          ["Available to refund", "refundableAmount", toDecimal(0).subtract(refundAmount)]
                      ],
                      currency
                  )
                : gateway && action === "refund"
                  ? lib.changeRows(
                        refundSummary,
                        [
                            ["Refunded", "completedRefundAmount", refundAmount],
                            ["Available to refund", "refundableAmount", toDecimal(0).subtract(refundAmount)]
                        ],
                        currency
                    )
                  : [],
        evidenceRows: rows(retained.evidenceRows),
        applicationEffects: rows(retained.applicationEffects).map(row =>
            Object.assign(row, {
                fromPaymentId: row.paymentId || (kind === "refund" ? "New refund payment" : null),
                targetPaymentId: row.toPaymentId || null,
                amountOriginallyApplied: row.amountOriginallyApplied ?? row.amountApplied,
                currencyUomId: row.currencyUomId || currency
            })
        ),
        balanceRows: rows(retained.beforeBalances).map(before => {
            const after = array(retained.afterBalances).find(
                row => row.sourceKind === before.sourceKind && row.sourceId === before.sourceId
            )
            const recordPath =
                before.sourceKind === "payment"
                    ? "Payments/PaymentDetail"
                    : before.sourceKind === "invoice"
                      ? financeDirection === "payable"
                          ? "Payables/BillDetail"
                          : "Receivables/InvoiceDetail"
                      : null
            return {
                sourceKind: before.sourceKind,
                sourceId: before.sourceId,
                original: before.original,
                beforeRemaining: before.remaining,
                afterRemaining: after?.remaining,
                currencyUomId: before.currencyUomId || currency,
                recordPath,
                recordParameters: recordParameters(organizationPartyId, before.sourceId, {
                    paymentId: before.sourceKind === "payment" ? before.sourceId : null,
                    invoiceId: before.sourceKind === "invoice" ? before.sourceId : null
                })
            }
        }),
        ledgerPreviewRows: lib.ledgerPreviewRows(
            retained.ledgerPreview,
            currency,
            summary.accountingDateText || retained.accountingDateText,
            plan => (plan.originalAcctgTransId ? "Reverses " + plan.originalAcctgTransId : "")
        ),
        blockers,
        operationKey,
        inputFingerprint: retained.inputFingerprint,
        canConfirm:
            retained.canApply === true &&
            !hasResults &&
            !blockers.length &&
            (kind === "state" || kind === "unapply" ? summaryAvailable : retained.status === "review"),
        confirmParameters: {
            organizationPartyId,
            paymentId: retained.paymentId,
            previewId: retained.previewId,
            previewKind: kind,
            inputFingerprint: retained.inputFingerprint,
            operationKey
        },
        results: result,
        hasResults,
        resultsTitle: !hasResults
            ? ""
            : kind === "refund"
              ? "Refund completed"
              : gateway
                ? "Gateway answer: " + (gatewayOutcomeText[result.outcome] || result.outcome)
                : kind === "unapply"
                  ? "Applications released"
                  : "Payment change completed",
        resultRows: !hasResults
            ? []
            : factRows(
                  kind === "refund"
                      ? [
                            ["Refund payment", result.refundPaymentId],
                            ["Funding application", result.paymentApplicationId],
                            ["Outcome", result.reasonCode]
                        ]
                      : gateway
                        ? [
                              ["Gateway response", result.paymentGatewayResponseId],
                              ["Payment status", statusText(result.statusId)],
                              ["Refund status", statusText(result.refundStatusId)]
                          ]
                        : [
                              ["Payment", result.paymentId],
                              ["Status", statusText(result.statusId)],
                              ["Recorded event", result.paymentLifecycleEventId],
                              ["Outcome", result.reasonCode],
                              ["Issued document", result.outputId]
                          ]
              ),
        applicationResultRows: rows(result.applicationResults).map(row =>
            Object.assign(row, {currencyUomId: row.currencyUomId || currency})
        ),
        resultPaymentRows:
            hasResults && resultPaymentId
                ? [
                      {
                          paymentId: resultPaymentId,
                          label: "Refund payment" + (result.refundStatusId ? " · " + statusText(result.refundStatusId) : ""),
                          amountText: kind === "refund" ? money(result.amount, result.currencyUomId || currency) : "",
                          recordParameters: paymentParameters(organizationPartyId, resultPaymentId)
                      }
                  ]
                : [],
        postingResultRows: lib.postingResultRows(
            result.acctgTransIds,
            kind === "refund" || capabilities.canReadLedger === true,
            kind === "refund" ? "Refund" : result.action ? String(result.action) : ""
        ),
        outputResultRows: rows(result.outputRows).map(row =>
            Object.assign(row, {
                outputTypeText: outputTypeTexts[row.outputType] || row.outputType || "",
                canOpen: capabilities[printCapabilities[row.outputType]] === true && !!row.outputId,
                outputParameters: Object.assign(paymentParameters(organizationPartyId, retained.paymentId), {
                    outputId: row.outputId,
                    outputType: row.outputType
                })
            })
        )
    }
    return review
}

// The review a PaymentDetail/Review screen shows, every part present: a review that does not exist, expired or is
// another user's has reviewFound false. Refuses a review of another payment and a user without the permission.
function reviewContext(parameters) {
    const scope = access(parameters)
    const paymentId = parameters.paymentId || parameters.recordId || ""
    const kind = parameters.previewKind || "state"
    if (!reviewServices[kind]) throw new Error("Payment review is not available")
    let retained = null
    if (parameters.previewId && scope.organizationPartyId) {
        try {
            retained = policy.probe(native + reviewServices[kind], {
                organizationPartyId: scope.organizationPartyId,
                previewId: parameters.previewId
            })
        } catch (error) {
            if (refused(error)) throw error
            ec.logger.info("Payment review " + parameters.previewId + " is not available: " + error.message)
        }
    }
    if (retained?.previewId && retained.paymentId !== paymentId)
        throw new Error("PAYMENT_REVIEW_MISMATCH: This review belongs to another payment")
    const reviewFound = !!retained?.previewId
    return {
        paymentId,
        previewId: parameters.previewId || "",
        previewKind: kind,
        reviewFound,
        paymentReview: reviewPresentation(
            reviewFound ? retained : {paymentId},
            kind,
            scope.organizationPartyId,
            parameters.financeDirection
        )
    }
}

// An internal transfer review for Payments/TransferReview, every part present.
function transferPresentation(retained, organizationPartyId) {
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
        operationKey = lib.reviewKey(retained, "trf"),
        actualIds = {transfer: result.paymentId, fee: result.feePaymentId},
        legTexts = {transfer: "Transfer", fee: "Fee", outgoing: "Outgoing", incoming: "Incoming"},
        currency = retained.currencyUomId,
        canReadLedger = retained.capabilities?.canReadLedger === true,
        blockers = array(retained.blockers),
        feePartyName = retained.feePartyId
            ? policy.lib.partyNames([retained.feePartyId])[retained.feePartyId] || retained.feePartyId
            : ""
    return Object.assign({}, policy.display(retained), {
        hasResults: complete,
        summaryAvailable,
        operationKey,
        canConfirm: retained.status === "review" && retained.canApply === true && summaryAvailable && !blockers.length,
        blockers,
        totalText: money(retained.totalAmount, currency),
        confirmation:
            "Transfer " +
            money(retained.principalAmount, currency) +
            (toDecimal(retained.feeAmount ?? 0).compare(0) > 0 ? " with a fee of " + money(retained.feeAmount, currency) : "") +
            "?",
        factRows: summaryAvailable
            ? factRows([
                  ["Amount", money(retained.principalAmount, currency)],
                  ["Fee", money(retained.feeAmount, currency)],
                  ["Total out", money(retained.totalAmount, currency)],
                  ["From", retained.maskedMethods?.from?.label],
                  ["To", retained.maskedMethods?.to?.label],
                  ["Accounting date", retained.accountingDateText],
                  ["Fee account", retained.feeGlAccountId ? retained.feeAccountLabel || retained.feeGlAccountId : null],
                  ["Fee paid to", feePartyName],
                  ["Reference", retained.referenceNumber],
                  ["Reason", retained.reason]
              ])
            : [],
        confirmParameters: {
            organizationPartyId,
            previewId: retained.previewId,
            inputFingerprint: retained.inputFingerprint,
            operationKey
        },
        plannedLegRows: rows(retained.legRows).map(row =>
            Object.assign(row, {legText: legTexts[row.leg] || row.leg, currencyUomId: row.currencyUomId || currency})
        ),
        actualLegRows: complete
            ? rows(result.legRows).map(row => {
                  const own = !!row.paymentId && row.paymentId === actualIds[row.leg]
                  return Object.assign(row, {
                      legText: legTexts[row.leg] || row.leg,
                      currencyUomId: row.currencyUomId || currency,
                      canOpen: own,
                      recordParameters: paymentParameters(organizationPartyId, own ? row.paymentId : "")
                  })
              })
            : [],
        ledgerPreviewRows: canReadLedger
            ? lib.ledgerPreviewRows(retained.ledgerPreview, currency, retained.accountingDateText, plan => legTexts[plan.leg])
            : [],
        postingResultRows: complete ? lib.postingResultRows(result.acctgTransIds, canReadLedger) : [],
        outputResultRows: complete
            ? rows(result.outputRows).map(row => {
                  const owner = row.paymentId === result.paymentId
                  return Object.assign(row, {
                      outputTypeText: outputTypeTexts[row.outputType] || row.outputType || "",
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

// The transfer review Payments/TransferReview shows, with the values to change it: a review that does not exist,
// expired or is another user's has reviewFound false. Refuses a user without transfer authority.
function transferReviewContext(parameters) {
    const scope = access(parameters)
    let retained = null
    if (parameters.previewId && scope.organizationPartyId) {
        try {
            retained = policy.probe(native + "get#InternalTransferPreview", {
                organizationPartyId: scope.organizationPartyId,
                previewId: parameters.previewId
            })
        } catch (error) {
            if (refused(error)) throw error
            ec.logger.info("Internal transfer " + parameters.previewId + " is not available: " + error.message)
        }
    }
    const reviewFound = !!retained?.previewId && retained.previewKind === "transfer"
    return {
        previewId: parameters.previewId || "",
        reviewFound,
        transferReview: transferPresentation(reviewFound ? retained : {}, scope.organizationPartyId),
        transferValue: transferValue(scope.organizationPartyId, null, reviewFound ? retained : null)
    }
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
        const method = lib.token(parameters[field], "payment method")
        input[prefix + "PaymentMethodId"] = method.id
        input[prefix + "MethodVersion"] = method.version
    }
    return input
}

function stateInput(parameters) {
    const evidence = lib.tokens(parameters.evidenceTokenList, "evidence file")
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
    const selected = lib.tokens(parameters.applicationTokenList, "application", 200)
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
        const method = lib.token(parameters[prefix + "MethodToken"], "transfer method")
        input[prefix + "PaymentMethodId"] = method.id
        input[prefix + "MethodVersion"] = method.version
    }
    return input
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
            input[prefix + "PaymentMethodId"] = lib.token(parameters[prefix + "MethodToken"], "method").id
    return input
}

// The screen contexts, and the inputs of the payment write services: each decodes the reviewed tokens of a form into
// the Mantle service's parameters and passes nothing else.
const operations = {
    list: listContext,
    detail: detailContext,
    review: reviewContext,
    transferReview: transferReviewContext,
    gatewayTransactions: gatewayTransactionsContext,
    draftInput,
    stateInput,
    unapplyInput,
    gatewayActionInput,
    transferInput,
    refundInput
}
// The review presentations are also exported for the specs that check them.
;({
    execute: (operation, parameters) => {
        if (!operations[operation]) throw new Error("Unknown payment screen operation " + operation)
        return operations[operation](parameters)
    },
    findParameters,
    reviewPresentation,
    transferPresentation,
    transferValue
})
