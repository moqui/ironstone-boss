// Screen context for receivables. Native Mantle services own every financial mutation and its authorization.
const policy = ec.resource.script("component://mr-mantle/service/mantle/ledger/AccountingPolicy.js")
const nativeInvoice = "mantle.account.InvoiceServices."
const array = value => Array.from(value || [])
const money = (value, currency) =>
    value == null ? "Unavailable" : currency ? ec.l10n.formatCurrency(value, currency) : String(value)
function displayRow(value) {
    const row = policy.display(value)
    if (row.accountingDateText) row.invoiceDateText = row.accountingDateText
    return row
}
const plainRows = value => array(value).map(displayRow)
const deliveryStatus = status =>
    ({sent: "Sent", queued: "Queued for delivery", failed: "Failed", ready: "Ready", pending: "Pending"})[status] ||
    status ||
    "Pending"

// A choice retains the version reviewed in the browser. Sending must not replace it with a fresh file hash.
function decodeReviewedAttachments(value) {
    let selected = value == null || value === "" ? [] : value
    if (typeof selected === "string") selected = selected.trim().startsWith("[") ? JSON.parse(selected) : [selected]
    if (!Array.isArray(selected)) throw new Error("ATTACHMENT_SELECTION_INVALID: Choose supporting files from the list")
    const versions = new Map()
    for (const token of selected) {
        const separator = typeof token === "string" ? token.indexOf("~") : -1
        if (separator < 1 || separator === token.length - 1)
            throw new Error("ATTACHMENT_SELECTION_INVALID: Review each supporting file before sending")
        const id = token.slice(0, separator)
        const version = token.slice(separator + 1)
        if (versions.has(id) && versions.get(id) !== version)
            throw new Error("STALE_ATTACHMENT: Review the selected supporting file again")
        versions.set(id, version)
    }
    return {attachmentContentIdList: Array.from(versions.keys()), attachmentVersions: Object.fromEntries(versions)}
}

function access(parameters) {
    if (parameters.appRoot && parameters.appRoot !== "Accounting") throw new Error("Receivables context is not available")
    return policy.scope(parameters)
}

function probeInvoice(parameters) {
    ec.message.pushErrors()
    try {
        return (
            ec.service
                .sync()
                .name(nativeInvoice + "get#InvoiceFinanceDetail")
                .parameters(parameters)
                .disableAuthz()
                .requireNewTransaction(true)
                .throwOnError(true)
                .call() || {}
        )
    } finally {
        ec.message.clearErrors()
        ec.message.popErrors()
    }
}

function invoiceContext(parameters, isolated = false) {
    const scope = access(parameters)
    const invoiceId = parameters.invoiceId || parameters.recordId
    const request = {
        organizationPartyId: scope.organizationPartyId,
        invoiceId
    }
    const output = isolated ? probeInvoice(request) : policy.call(nativeInvoice + "get#InvoiceFinanceDetail", request)
    const invoice = displayRow(output.invoice || {})
    const currency = invoice.currencyUomId || output.totals?.currencyUomId
    const totals = output.totals || {}
    const capabilities = output.capabilities || {}
    const draft = invoice.statusId === "InvoiceInProcess"
    const organizationPartyId = scope.organizationPartyId || invoice.organizationPartyId
    const customerPartyId = invoice.fromPartyId === organizationPartyId ? invoice.toPartyId : invoice.fromPartyId
    const recipientRows = array(
        policy
            .find("mantle.party.contact.PartyContactMechInfo", {
                partyId: customerPartyId,
                contactMechPurposeId: "EmailBilling"
            })
            .conditionDate("fromDate", "thruDate", null)
            .orderBy("-fromDate")
            .limit(20)
            .list()
    )
    const sendTo =
        output.sendTo ||
        invoice.sendTo ||
        Array.from(new Set(recipientRows.map(row => row.infoString).filter(Boolean))).join(", ")
    const receivable = Object.assign({}, invoice, {
        invoiceId,
        currencyUomId: currency,
        title: invoice.description || invoiceId,
        customerPartyId,
        recipientsText: sendTo,
        customerName:
            invoice.fromPartyId === organizationPartyId
                ? invoice.toName || invoice.toPartyName || customerPartyId
                : invoice.fromName || invoice.fromPartyName || customerPartyId,
        statusDescription: invoice.statusDescription || invoice.statusId || "",
        lines: plainRows(output.lines).map(row =>
            Object.assign(row, {
                lineTotal:
                    row.lineTotal ??
                    (row.quantity != null && row.amount != null ? toDecimal(row.quantity).multiply(row.amount) : null)
            })
        ),
        payments: plainRows(output.paymentRows).map(row =>
            Object.assign(row, {
                counterpartInvoiceId: row.paymentId ? null : row.invoiceId === invoiceId ? row.toInvoiceId : row.invoiceId
            })
        ),
        sources: plainRows(output.sourceRows),
        shipments: plainRows(output.shipmentRows),
        ledger: plainRows(output.ledgerRows),
        content: plainRows(output.contentRows),
        attachmentRows: plainRows(output.contentRows).filter(row => row.attachable && row.attachmentVersion),
        attachmentDiscoveryIncomplete: !!output.attachmentDiscoveryIncomplete,
        history: plainRows(output.auditRows),
        deliveries: plainRows(output.deliveryRows).map(row =>
            Object.assign(row, {
                statusDescription:
                    {
                        complete: "Sent",
                        partial: "Some recipients failed",
                        pending: "Awaiting delivery",
                        failed: "Delivery failed"
                    }[row.status] || row.status
            })
        ),
        deliveryRecipients: plainRows(output.deliveryRows).flatMap(delivery =>
            array(delivery.recipients).map(recipient => ({
                deliveryId: delivery.deliveryId,
                createdDateText: delivery.createdDateText,
                recipient: recipient.recipient,
                statusDescription: deliveryStatus(recipient.status),
                sentFilesText: [
                    delivery.issuedFileName,
                    ...array(delivery.attachments || delivery.attachmentRows).map(attachment => attachment.fileName)
                ]
                    .filter(Boolean)
                    .join(", "),
                reasonCode: recipient.reasonCode,
                errorMessage: recipient.errorMessage,
                emailMessageId: recipient.emailMessageId
            }))
        ),
        budgets: plainRows(output.budgetRows),
        budgetEvidenceAvailable: output.budgetAvailable ?? Array.isArray(output.budgetRows),
        budgetUnavailableReason: output.budgetUnavailableReason,
        totals,
        totalText: money(totals.invoiceTotal ?? output.invoiceTotal ?? invoice.invoiceTotal, currency),
        appliedText: money(totals.appliedPayments ?? totals.appliedPaymentsTotal ?? output.appliedPaymentsTotal, currency),
        unpaidText: money(totals.unpaidTotal ?? output.unpaidTotal, currency),
        canEdit: !!(capabilities.canDraftEdit ?? capabilities.canEdit ?? (scope.capabilities.arEdit && draft)),
        canApprove: !!(capabilities.canApprove ?? (scope.capabilities.approve && draft)),
        canFinalize: !!(capabilities.canFinalize ?? (scope.capabilities.arEdit && draft)),
        canSend: !!(
            capabilities.canSend ??
            (scope.capabilities.arEdit && !["InvoiceCancelled", "InvoiceWriteOff"].includes(invoice.statusId))
        ),
        canCredit: !!(capabilities.canCredit ?? (scope.capabilities.arEdit && !draft && invoice.statusId !== "InvoiceCancelled")),
        canReverse: !!(
            capabilities.canReverse ??
            (scope.capabilities.arEdit && !draft && invoice.statusId !== "InvoiceCancelled")
        ),
        canApply: !!scope.capabilities.arEdit && invoice.invoiceTypeEnumId !== "InvoiceCreditMemo" && !draft,
        canCancel: !!(
            capabilities.canCancel ??
            (scope.capabilities.arEdit &&
                !array(output.ledgerRows).some(row => row.isPosted === "Y") &&
                ["InvoiceInProcess", "InvoiceApproved", "InvoiceFinalized"].includes(invoice.statusId))
        ),
        canResume: !!(
            capabilities.canResume ??
            (scope.capabilities.arEdit &&
                !array(output.ledgerRows).some(row => row.isPosted === "Y") &&
                ["InvoiceApproved", "InvoiceFinalized"].includes(invoice.statusId))
        ),
        isDraft: draft,
        printUrl:
            "/apps/Accounting/Receivables/InvoicePrint?invoiceId=" +
            encodeURIComponent(invoiceId) +
            "&organizationPartyId=" +
            encodeURIComponent(scope.organizationPartyId || invoice.fromPartyId || ""),
        pdfUrl:
            "/fop/Accounting/Receivables/InvoicePrint?invoiceId=" +
            encodeURIComponent(invoiceId) +
            "&organizationPartyId=" +
            encodeURIComponent(scope.organizationPartyId || invoice.fromPartyId || "")
    })
    return {
        receivable,
        recordFound: !!invoice.invoiceId,
        invoiceId,
        organizationPartyId,
        invoiceHeaderValue: Object.assign({}, invoice, {
            invoiceId,
            invoiceDate: invoice.invoiceDateValue || invoice.accountingDateText || invoice.invoiceDate
        }),
        invoiceSendValue: {invoiceId, toAddresses: sendTo, note: "", reviewedAttachmentList: []},
        invoiceOperationKey: "invoice-" + ec.user.randomString(24)
    }
}

function invoices(parameters) {
    const scope = access(parameters)
    const output = policy.call(
        nativeInvoice + "find#Receivables",
        Object.assign({}, parameters, {
            organizationPartyId: scope.organizationPartyId
        })
    )
    const records = plainRows(output.records || output.rows).map(row =>
        Object.assign(row, {
            customerPartyId: row.fromPartyId === scope.organizationPartyId ? row.toPartyId : row.fromPartyId,
            customerName:
                row.customerName ||
                (row.fromPartyId === scope.organizationPartyId
                    ? row.toName || row.toPartyName
                    : row.fromName || row.fromPartyName),
            statusDescription: row.statusDescription || row.statusId,
            invoiceTotal: row.invoiceTotal ?? row.total,
            unpaidTotal: row.unpaidTotal ?? row.unpaid,
            routeParameters: {organizationPartyId: scope.organizationPartyId, recordId: row.invoiceId}
        })
    )
    const selectedQueue = parameters.queue || "all"
    let summaryGroups = [],
        summaryErrors = [],
        summaryComplete = true,
        calendarRows = records
    if (["pivot", "graph", "calendar"].includes(parameters.view)) {
        const summary = policy.call(
            nativeInvoice + "get#ReceivableSummary",
            Object.assign({}, parameters, {
                organizationPartyId: scope.organizationPartyId
            })
        )
        summaryComplete = summary.complete !== false && !summary.incomplete
        summaryErrors = array(summary.errors)
        calendarRows = plainRows(summary.calendarRows).map(row =>
            Object.assign(row, {
                dueDay: row.dueDateText ? row.dueDateText.slice(0, 10) : null,
                dueAllDay: "Y",
                customerPartyId: row.fromPartyId === scope.organizationPartyId ? row.toPartyId : row.fromPartyId,
                statusDescription: row.statusDescription || row.statusId,
                routeParameters: {organizationPartyId: scope.organizationPartyId, recordId: row.invoiceId}
            })
        )
        const groups = {}
        for (const row of plainRows(summary.summaryRows)) {
            const currency = row.currencyUomId || ""
            ;(groups[currency] || (groups[currency] = [])).push(row)
        }
        summaryGroups = Object.entries(groups).map(([currencyUomId, rows]) => {
            const statuses = Array.from(new Set(rows.map(row => row.statusDescription || row.statusId)))
            const customers = Array.from(new Set(rows.map(row => row.customerName || row.customerPartyId)))
            const valueAt = (customer, status) =>
                rows
                    .filter(
                        row =>
                            (row.customerName || row.customerPartyId) === customer &&
                            (row.statusDescription || row.statusId) === status
                    )
                    .reduce((total, row) => total.add(row.unpaidTotal || toDecimal(0)), toDecimal(0))
            return {
                currencyUomId,
                frame: {
                    fields: [
                        {name: "Customer", type: "string", role: "x-axis", values: customers},
                        ...statuses.map(status => ({
                            name: status,
                            type: "number",
                            values: customers.map(customer => valueAt(customer, status).toNumber()),
                            config: {unit: "currency:" + currencyUomId}
                        }))
                    ]
                },
                panel: {
                    title: "Open receivables · " + currencyUomId,
                    visualization: parameters.view === "graph" ? "bar" : "table",
                    stacked: true
                }
            }
        })
    }
    return Object.assign({}, output, {
        records,
        calendarRows,
        summaryGroups,
        summaryErrors,
        summaryComplete,
        view: ["list", "calendar", "pivot", "graph"].includes(parameters.view) ? parameters.view : "list",
        queue: selectedQueue,
        queueTabs: [
            ["draft", "Draft"],
            ["unpaid", "Unpaid"],
            ["overdue", "Overdue"],
            ["credits", "Credits"],
            ["all", "All"]
        ].map(([key, title]) => ({
            key,
            title,
            active: key === selectedQueue,
            parameters: Object.assign({}, parameters, {queue: key, pageIndex: 0})
        })),
        invoiceListCapabilities: scope.capabilities
    })
}

function billingQueue(parameters) {
    const scope = access(parameters)
    const direction = parameters.direction || "receivable"
    const output = policy.call(
        nativeInvoice + "find#ApprovedTimeBilling",
        Object.assign({}, parameters, {
            organizationPartyId: scope.organizationPartyId
        })
    )
    const paging = {}
    for (const name of ["PageSize", "PageIndex", "PageMaxIndex", "PageRangeLow", "PageRangeHigh"])
        paging["billingRows" + name] = output["records" + name] ?? output[name[0].toLowerCase() + name.slice(1)]
    return Object.assign({}, output, paging, {
        billingRows: plainRows(output.records || output.rows).map(row => Object.assign(row, {amount: row.approvedAmount})),
        billingRowsCount: output.recordsCount ?? output.recordCount,
        billingCapabilities: scope.capabilities,
        direction,
        billingCanCreate: direction === "payable" ? !!scope.capabilities.apEdit : !!scope.capabilities.arEdit,
        billingDirectionOptions: [
            ...(scope.capabilities.arRead || scope.capabilities.reportRead || scope.capabilities.admin
                ? [{value: "receivable", label: "Customer invoices"}]
                : []),
            ...(scope.capabilities.apRead || scope.capabilities.reportRead || scope.capabilities.admin
                ? [{value: "payable", label: "Worker bills"}]
                : [])
        ],
        billingOperationKey: parameters.operationKey || "time-" + ec.user.randomString(24)
    })
}

function customerContext(parameters) {
    const scope = access(parameters)
    const customerPartyId = parameters.customerPartyId
    const output = policy.call("mantle.account.CustomerFinanceServices.get#CustomerFinance", {
        organizationPartyId: scope.organizationPartyId,
        customerPartyId
    })
    const customer = policy.display(output.customer || {})
    const allowed = output.capabilities || {}
    const orderIds = Array.from(new Set(array(output.orders).map(row => row.orderId)))
    const orderHeaders = orderIds.length
        ? Object.fromEntries(
              array(
                  policy
                      .find("mantle.order.OrderHeader")
                      .condition("orderId", "in", orderIds)
                      .selectField("orderId")
                      .selectField("orderDate")
                      .selectField("currencyUomId")
                      .selectField("statusId")
                      .list()
              ).map(row => [row.orderId, policy.display(row)])
          )
        : {}
    const customerDetail = Object.assign({}, customer, {
        customerPartyId,
        customerName:
            customer.partyName ||
            customer.organizationName ||
            [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
            customerPartyId,
        contacts: plainRows(output.contacts).map(row =>
            Object.assign(row, {
                kindLabel: row.infoString ? "Email" : row.contactNumber ? "Phone" : row.address1 ? "Address" : "Contact",
                value:
                    row.infoString ||
                    (row.contactNumber
                        ? [row.countryCode, row.areaCode, row.contactNumber].filter(Boolean).join(" ") +
                          (row.extension ? " ext. " + row.extension : "")
                        : "") ||
                    [
                        row.address1,
                        row.address2,
                        row.unitNumber,
                        row.city,
                        row.stateProvinceGeoName || row.stateProvinceGeoId,
                        [row.postalCode, row.postalCodeExt].filter(Boolean).join("-"),
                        row.countryGeoName || row.countryGeoId
                    ]
                        .filter(Boolean)
                        .join(", ")
            })
        ),
        orders: plainRows(output.orders).map(row =>
            Object.assign({}, orderHeaders[row.orderId] || {}, row, {grandTotal: row.partTotal})
        ),
        invoices: plainRows(output.invoices),
        payments: plainRows(output.payments).map(row => Object.assign(row, {currencyUomId: row.amountUomId})),
        agreements: plainRows(output.agreements),
        paymentMethods: plainRows(output.paymentMethods),
        identifications: plainRows(output.identifications),
        taxRegistrations: plainRows(output.taxRegistrations),
        summaryRows: output.incomplete ? [] : plainRows(output.summaryRows),
        incomplete: !!output.incomplete,
        capabilities: Object.assign({}, allowed, {
            bankEdit: !!allowed.canEditPaymentMethods,
            identificationEdit: !!allowed.canEditIdentifications,
            taxEdit: !!allowed.canEditTaxRegistrations
        })
    })
    return {
        customerDetail,
        customerFound: !!customer.partyId,
        customerPartyId,
        organizationPartyId: scope.organizationPartyId,
        customerLinkParameters: {organizationPartyId: scope.organizationPartyId, customerPartyId}
    }
}

function batchContext(parameters) {
    const scope = access(parameters)
    const ids = Array.from(
        new Set(
            Array.isArray(parameters.invoiceIdList)
                ? parameters.invoiceIdList
                : String(parameters.invoiceIdList || "")
                      .split(",")
                      .map(value => value.trim())
                      .filter(Boolean)
        )
    )
    if (ids.length > 100) throw new Error("Select no more than 100 invoices")
    const batchRows = []
    for (const invoiceId of ids) {
        try {
            const result = invoiceContext(
                Object.assign({}, parameters, {invoiceId, organizationPartyId: scope.organizationPartyId}),
                true
            )
            batchRows.push(Object.assign({}, result.receivable, {available: true}))
        } catch (error) {
            ec.logger.error("Invoice batch review " + invoiceId + ": " + error.message)
            batchRows.push({invoiceId, available: false, reviewError: "Invoice is not available for this review"})
        }
    }
    const prior =
        parameters.operationKey &&
        policy.one("mantle.ledger.transaction.PostingOperation", {
            operationKey: parameters.operationKey,
            organizationPartyId: scope.organizationPartyId,
            userId: ec.user.userId,
            operationType: "InvoiceBatch"
        })
    const priorResult = prior?.resultJson ? JSON.parse(prior.resultJson) : {}
    const batchResults = array(priorResult.results).flatMap(row => {
        const recipients = array(row.result?.recipientResults)
        if (!recipients.length)
            return [
                {
                    invoiceId: row.invoiceId,
                    success: row.success,
                    hasPrint: !!row.result?.contentLocation,
                    outcome: row.success ? "Completed" : "Failed",
                    errorMessage: row.errorMessage || row.error || ""
                }
            ]
        return recipients.map(recipient => ({
            invoiceId: row.invoiceId,
            recipient: recipient.recipient,
            success: ["sent", "queued"].includes(recipient.status),
            hasPrint: false,
            outcome: deliveryStatus(recipient.status),
            errorMessage: recipient.errorMessage || "",
            emailMessageId: recipient.emailMessageId
        }))
    })
    const csvCell = (value, numeric) => {
        let text = value == null ? "" : String(value)
        if (!numeric && /^[=+@\-\t\r]/.test(text)) text = "'" + text
        return '"' + text.replace(/"/g, '""') + '"'
    }
    const csvRows = [["Invoice", "Customer", "Currency", "Invoice total", "Unpaid", "Status", "Review"]]
    for (const row of batchRows)
        csvRows.push([
            row.invoiceId,
            row.customerName,
            row.currencyUomId,
            row.totals?.invoiceTotal,
            row.totals?.unpaidTotal,
            row.statusDescription,
            row.reviewError
        ])
    const batchCsv =
        csvRows
            .map((row, at) => row.map((value, column) => csvCell(value, at > 0 && [3, 4].includes(column))).join(","))
            .join("\r\n") + "\r\n"
    return {
        batchRows,
        batchResults,
        batchCsv,
        sourceVersions: parameters.sourceVersions
            ? typeof parameters.sourceVersions === "string"
                ? JSON.parse(parameters.sourceVersions)
                : parameters.sourceVersions
            : Object.fromEntries(
                  batchRows.filter(row => row.available).map(row => [row.invoiceId, policy.ms(row.lastUpdatedStamp)])
              ),
        invoiceIdList: ids,
        batchOperationKey: parameters.operationKey || "batch-" + ec.user.randomString(24),
        batchCount: ids.length
    }
}

function batchOutput(parameters) {
    const scope = access(parameters)
    policy.call(nativeInvoice + "get#InvoiceFinanceDetail", {
        organizationPartyId: scope.organizationPartyId,
        invoiceId: parameters.invoiceId
    })
    const operation = policy.one("mantle.ledger.transaction.PostingOperation", {
        operationKey: parameters.operationKey,
        organizationPartyId: scope.organizationPartyId,
        userId: ec.user.userId,
        operationType: "InvoiceBatch"
    })
    const result =
        operation?.resultJson &&
        array(JSON.parse(operation.resultJson).results).find(row => row.invoiceId === parameters.invoiceId && row.success)
    if (!result?.result?.contentLocation) throw new Error("The reviewed invoice output is not available")
    return {fileLocation: result.result.contentLocation, fileName: "Invoice-" + parameters.invoiceId + ".pdf"}
}

const operations = {invoiceContext, invoices, billingQueue, customerContext, batchContext, batchOutput}
;({
    decodeReviewedAttachments,
    execute: (operation, parameters) => {
        if (!operations[operation]) throw new Error("Unknown receivables screen operation " + operation)
        return operations[operation](parameters)
    }
})
