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
function findParameters(value) {
    if (!value) return {}
    if (typeof value !== "string" || value.length > 8192) throw new Error("Payment filters are not available")
    const decoded = JSON.parse(value)
    return Object.fromEntries(
        [...filterNames, "pageIndex", "pageSize"].filter(key => decoded[key] != null).map(key => [key, decoded[key]])
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
    if (!["state", "unapply"].includes(previewKind)) throw new Error("Payment review is not available")
    const retained = parameters.previewId
        ? policy.call(native + (previewKind === "unapply" ? "get#PaymentUnapplyPreview" : "get#PaymentStatePreview"), {
              organizationPartyId: scope.organizationPartyId,
              previewId: parameters.previewId
          })
        : null
    if (retained && retained.paymentId !== paymentId)
        throw new Error("PAYMENT_REVIEW_MISMATCH: This review belongs to another payment")
    const review = reviewPresentation(retained, payment.currencyUomId)
    if (review) {
        Object.assign(review.confirmParameters, {
            organizationPartyId: scope.organizationPartyId,
            paymentId,
            previewKind,
            findJson: parameters.findJson || ""
        })
        review.previewKind = previewKind
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
        for (const row of review.outputResultRows)
            row.outputParameters = {
                organizationPartyId: scope.organizationPartyId,
                paymentId,
                outputId: row.outputId,
                outputType: row.outputType
            }
    }
    const primaryAction = review
        ? null
        : ["validate", "deliver", "confirm"].find(action => cap["can" + action[0].toUpperCase() + action.slice(1)] === true) ||
          null
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
                ["canEditDraft", "canEdit", "canCancel", "canVoid", "canPrintReceipt", "canPrintDetail", "canPrintCheck"].some(
                    name => cap[name] === true
                ),
            canReadLedger: cap.canReadLedger === true,
            canSettle: payment.financeDirection === "receivable" && scope.capabilities.arRead && scope.capabilities.arEdit,
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
    reviewedSelection,
    draftInput,
    stateInput,
    unapplyInput,
    reviewPresentation,
    execute: (operation, parameters) => {
        if (operation === "list") return listContext(parameters)
        if (operation === "detail") return detailContext(parameters)
        throw new Error("Unknown payment screen operation")
    }
})
