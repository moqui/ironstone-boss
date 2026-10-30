// Screen context for receivables. Mantle's services own every financial read and change and their authorization; this
// adds the screen's labels, links and paging names.
const policy = ec.resource.script("component://mr-mantle/service/mantle/ledger/AccountingPolicy.js")
const nativeInvoice = "mantle.account.InvoiceServices."
const array = value => Array.from(value || [])
const money = (value, currency) => (value == null ? "" : ec.l10n.formatCurrency(value, currency))
const plainRows = value => array(value).map(policy.display)
const emailStatus = statusId =>
    ({ES_SENT: "Sent", ES_READY: "Queued for delivery", ES_SCHEDULED: "Queued for delivery"})[statusId] || "Failed"
// The color of an invoice status chip (style guide §5.2): draft grey, in progress primary, sent info, paid positive,
// ended negative.
const statusColors = {
    InvoiceInProcess: "grey-7",
    InvoiceIncoming: "grey-7",
    InvoiceReceived: "grey-7",
    InvoiceApproved: "primary",
    InvoiceFinalized: "primary",
    InvoiceSent: "info",
    InvoiceAcked: "info",
    InvoicePmtRecvd: "positive",
    InvoicePmtSent: "positive",
    InvoiceCancelled: "negative",
    InvoiceWriteOff: "negative"
}
const statusColor = statusId => statusColors[statusId] || "grey-7"

// A user without the view permission is refused; a record that does not exist or is not visible is only not found.
const refused = error => String(error.message).includes("PERMISSION_DENIED")

function access(parameters) {
    if (parameters.appRoot && parameters.appRoot !== "Accounting") throw new Error("Receivables context is not available")
    return policy.scope(parameters)
}

// The invoice for its detail screen, with every list and flag present: an invoice that does not exist or is not visible
// to the user has recordFound false and empty parts, so a screen shows its "not available" state.
function invoiceContext(parameters) {
    const scope = access(parameters)
    const invoiceId = parameters.invoiceId || parameters.recordId
    const request = {organizationPartyId: scope.organizationPartyId, invoiceId}
    let output = {}
    if (invoiceId) {
        try {
            output = policy.probe(nativeInvoice + "get#InvoiceFinanceDetail", request)
        } catch (error) {
            if (refused(error)) throw error
            ec.logger.info("Invoice " + invoiceId + " is not available: " + error.message)
        }
    }
    const invoice = policy.display(output.invoice || {})
    const totals = output.totals || {}
    const capabilities = output.capabilities || {}
    const currency = invoice.currencyUomId
    const organizationPartyId = invoice.organizationPartyId
    const customerPartyId = invoice.fromPartyId === organizationPartyId ? invoice.toPartyId : invoice.fromPartyId
    const issuedFiles = plainRows(output.contentRows).filter(row => row.issued)
    const receivable = Object.assign({}, invoice, {
        title: invoice.description || invoiceId,
        customerPartyId,
        customerName: invoice.fromPartyId === organizationPartyId ? invoice.toName : invoice.fromName,
        recipientsText: output.sendTo,
        lines: plainRows(output.lines),
        payments: plainRows(output.paymentRows).map(row =>
            Object.assign(row, {
                counterpartInvoiceId: row.paymentId ? null : row.invoiceId === invoiceId ? row.toInvoiceId : row.invoiceId
            })
        ),
        sources: plainRows(output.sourceRows),
        orders: plainRows(output.sourceRows).filter(row => !!row.orderId),
        shipments: plainRows(output.shipmentRows),
        ledger: plainRows(output.ledgerRows),
        content: plainRows(output.contentRows),
        attachmentRows: plainRows(output.contentRows).filter(row => row.attachable && row.attachmentVersion),
        attachmentDiscoveryIncomplete: !!output.attachmentDiscoveryIncomplete,
        canAttach: !!output.attachmentDiscoveryIncomplete || plainRows(output.contentRows).some(row => row.attachable),
        history: plainRows(output.auditRows),
        deliveryRecipients: plainRows(output.deliveryRows).map(row => ({
            recipient: row.toAddresses,
            createdDateText: row.sentDateText,
            statusDescription: emailStatus(row.statusId),
            errorMessage: row.statusId === "ES_SENT" || row.statusId === "ES_READY" ? "" : "Not sent",
            emailMessageId: row.emailMessageId,
            sentFilesText: issuedFiles.map(file => file.contentLocation.split("/").pop()).join(", ")
        })),
        budgets: plainRows(output.budgetRows),
        budgetAvailable: !!output.budgetAvailable,
        budgetUnavailableReason: output.budgetUnavailableReason,
        totals,
        totalText: money(totals.invoiceTotal, currency),
        appliedText: money(totals.appliedPaymentsTotal, currency),
        unpaidText: money(totals.unpaidTotal, currency),
        canEdit: !!capabilities.canDraftEdit,
        canApprove: !!capabilities.canApprove,
        canFinalize: !!capabilities.canFinalize,
        canSend: !!capabilities.canSend,
        canCredit: !!capabilities.canCredit,
        canReverse: !!capabilities.canReverse,
        canApply: !!capabilities.canApply,
        canCancel: !!capabilities.canCancel,
        canResume: !!capabilities.canResume,
        isDraft: invoice.statusId === "InvoiceInProcess",
        statusColor: statusColor(invoice.statusId)
    })
    return {
        receivable,
        recordFound: !!invoice.invoiceId,
        invoiceId,
        organizationPartyId,
        invoiceHeaderValue: Object.assign({}, invoice, {invoiceId, invoiceDate: invoice.invoiceDateValue}),
        invoiceSendValue: {invoiceId, toAddresses: output.sendTo, note: "", reviewedAttachmentList: []},
        invoiceOperationKey: "invoice-" + ec.user.randomString(24)
    }
}

function invoices(parameters) {
    const scope = access(parameters)
    const output = policy.call(
        nativeInvoice + "find#Receivables",
        Object.assign({}, parameters, {organizationPartyId: scope.organizationPartyId})
    )
    const customerOf = row =>
        row.fromPartyId === scope.organizationPartyId
            ? {customerPartyId: row.toPartyId, customerName: row.toName}
            : {customerPartyId: row.fromPartyId, customerName: row.fromName}
    const routeParameters = row => ({organizationPartyId: scope.organizationPartyId, recordId: row.invoiceId})
    // each row with its customer, link, status color and the due day the calendar view places it on
    const records = plainRows(output.records).map(row =>
        Object.assign(row, customerOf(row), {
            routeParameters: routeParameters(row),
            statusColor: statusColor(row.statusId),
            dueDay: row.dueDateText ? row.dueDateText.slice(0, 10) : null,
            dueAllDay: "Y"
        })
    )
    const selectedQueue = parameters.queue || "all"
    let summaryGroups = [],
        summaryErrors = [],
        summaryComplete = true
    if (["table", "chart"].includes(parameters.summary)) {
        const summary = policy.call(
            nativeInvoice + "get#ReceivableSummary",
            Object.assign({}, parameters, {organizationPartyId: scope.organizationPartyId})
        )
        summaryComplete = summary.complete
        summaryErrors = array(summary.errors)
        const groups = {}
        for (const row of plainRows(summary.summaryRows)) {
            if (!groups[row.currencyUomId]) groups[row.currencyUomId] = []
            groups[row.currencyUomId].push(row)
        }
        summaryGroups = Object.entries(groups).map(([currencyUomId, rows]) => {
            const statuses = Array.from(new Set(rows.map(row => row.statusDescription)))
            const customers = Array.from(new Set(rows.map(row => row.customerName || row.customerPartyId)))
            const valueAt = (customer, status) =>
                rows
                    .filter(row => (row.customerName || row.customerPartyId) === customer && row.statusDescription === status)
                    .reduce((total, row) => total.add(row.unpaidTotal), toDecimal(0))
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
                    visualization: parameters.summary === "chart" ? "bar" : "table",
                    stacked: true
                }
            }
        })
    }
    return Object.assign({}, output, {
        records,
        summaryGroups,
        summaryErrors,
        summaryComplete,
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
            parameters: Object.assign({}, parameters, {queue: key, pageIndex: 0, summary: null})
        })),
        invoiceListCapabilities: scope.capabilities
    })
}

function billingQueue(parameters) {
    const scope = access(parameters)
    const direction = parameters.direction || "receivable"
    const output = policy.call(
        nativeInvoice + "find#ApprovedTimeBilling",
        Object.assign({}, parameters, {organizationPartyId: scope.organizationPartyId})
    )
    const paging = {}
    for (const name of ["Count", "PageSize", "PageIndex", "PageMaxIndex", "PageRangeLow", "PageRangeHigh"])
        paging["billingRows" + name] = output["records" + name]
    return Object.assign({}, output, paging, {
        billingRows: plainRows(output.records).map(row => Object.assign(row, {amount: row.approvedAmount})),
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

// A contact as one line: the email, the phone with its extension, or the address.
function contactValue(row) {
    if (row.infoString) return row.infoString
    if (row.contactNumber)
        return (
            [row.countryCode, row.areaCode, row.contactNumber].filter(Boolean).join(" ") +
            (row.extension ? " ext. " + row.extension : "")
        )
    return [
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
}
// The customer for Customer360, with every list present: a customer that does not exist or that the user may not read has
// customerFound false and empty lists, so the screen shows its "not available" state.
function customerContext(parameters) {
    const scope = access(parameters)
    const customerPartyId = parameters.customerPartyId
    let output = {}
    if (customerPartyId) {
        try {
            output = policy.probe("mantle.account.CustomerFinanceServices.get#CustomerFinance", {
                organizationPartyId: scope.organizationPartyId,
                customerPartyId
            })
        } catch (error) {
            if (refused(error)) throw error
            ec.logger.info("Customer " + customerPartyId + " is not available: " + error.message)
        }
    }
    const customer = output.customer || {}
    const allowed = output.capabilities || {}
    const kinds = {CmtEmailAddress: "Email", CmtTelecomNumber: "Phone", CmtPostalAddress: "Address"}
    const customerDetail = Object.assign({}, customer, {
        customerPartyId,
        customerName:
            customer.organizationName || [customer.firstName, customer.lastName].filter(Boolean).join(" ") || customerPartyId,
        contacts: plainRows(output.contacts).map(row =>
            Object.assign(row, {kindLabel: kinds[row.contactMechTypeEnumId] || "Contact", value: contactValue(row)})
        ),
        sendTo: output.sendTo,
        orders: plainRows(output.orders).map(row => Object.assign(row, {grandTotal: row.partTotal})),
        invoices: plainRows(output.invoices),
        payments: plainRows(output.payments).map(row => Object.assign(row, {currencyUomId: row.amountUomId})),
        agreements: plainRows(output.agreements),
        paymentMethods: plainRows(output.paymentMethods),
        identifications: plainRows(output.identifications),
        taxRegistrations: plainRows(output.taxRegistrations),
        // the key numbers of the header, one set for each currency
        summaryRows: plainRows(output.summaryRows).map(row =>
            Object.assign(row, {
                openReceivableText: money(row.openReceivable, row.currencyUomId),
                overdueText: money(row.overdue, row.currencyUomId),
                billedThisYearText: money(row.billedThisYear, row.currencyUomId),
                lastPaymentText:
                    row.lastPaymentAmount == null ? "No payment received" : money(row.lastPaymentAmount, row.currencyUomId)
            })
        ),
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

function batchResult(scope, operationKey) {
    if (!operationKey) return {found: false, results: []}
    return policy.call(nativeInvoice + "get#InvoiceBatchResult", {organizationPartyId: scope.organizationPartyId, operationKey})
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
        let result = {recordFound: false}
        try {
            result = invoiceContext(Object.assign({}, parameters, {invoiceId, organizationPartyId: scope.organizationPartyId}))
        } catch (error) {
            ec.logger.error("Invoice batch " + invoiceId + ": " + error.message)
        }
        batchRows.push(
            result.recordFound
                ? Object.assign({}, result.receivable, {available: true})
                : {invoiceId, available: false, reviewError: "This invoice is not available"}
        )
    }
    const batchResults = array(batchResult(scope, parameters.operationKey).results).flatMap(row => {
        const recipients = array(row.result?.recipientResults)
        if (!recipients.length)
            return [
                {
                    invoiceId: row.invoiceId,
                    success: row.success,
                    hasPrint: !!row.result?.contentLocation,
                    outcome: row.success ? "Completed" : "Failed",
                    errorMessage: row.errorMessage || ""
                }
            ]
        return recipients.map(recipient => ({
            invoiceId: row.invoiceId,
            recipient: recipient.recipient,
            success: recipient.status !== "failed",
            hasPrint: false,
            outcome: {sent: "Sent", queued: "Queued for delivery"}[recipient.status] || "Failed",
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
    const result = array(batchResult(scope, parameters.operationKey).results).find(
        row => row.invoiceId === parameters.invoiceId && row.success
    )
    if (!result?.result?.contentLocation) throw new Error("The invoice output is not available")
    return {fileLocation: result.result.contentLocation, fileName: "Invoice-" + parameters.invoiceId + ".pdf"}
}

const operations = {invoiceContext, invoices, billingQueue, customerContext, batchContext, batchOutput}
;({
    execute: (operation, parameters) => {
        if (!operations[operation]) throw new Error("Unknown receivables screen operation " + operation)
        return operations[operation](parameters)
    }
})
