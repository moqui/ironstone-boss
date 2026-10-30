// Projects retains its project/client boundary; the native invoice workflow owns financial state and delivery.
function call(name, parameters) {
    const out = ec.service.sync().name(name).parameters(parameters).call() || {}
    if (ec.message.hasError()) throw new Error(ec.message.getErrorsString())
    return out
}

function invoiceAccess(invoiceId) {
    const access = call("ironstone.projects.BillingServices.get#InvoiceAccess", {invoiceId, need: "change"})
    if (access.kind !== "client") throw new Error(ec.l10n.localize("Only a client invoice is changed here"))
    return access
}

function operationKey(action, invoice, extra = null) {
    const identity = [invoice.invoiceId, action, String(invoice.lastUpdatedStamp), extra]
    return "project-invoice-" + ec.user.singleUseCodeHash(JSON.stringify(identity)).slice(0, 24)
}

function changeStatus(parameters) {
    const access = invoiceAccess(parameters.invoiceId)
    const messages = {
        approve: "Invoice approved",
        resume: "Invoice open to changes again",
        cancel: "Invoice cancelled; its time is unbilled again"
    }
    if (!messages[parameters.action]) throw new Error(ec.l10n.localize("Unknown action"))
    // Projects calls finalization "Approve". It does not grant the separate finance approval permission.
    call("mantle.account.InvoiceServices.change#InvoiceState", {
        invoiceId: parameters.invoiceId,
        organizationPartyId: access.invoice.fromPartyId,
        action: parameters.action === "approve" ? "finalize" : parameters.action,
        lastUpdatedStamp: access.invoice.lastUpdatedStamp,
        operationKey: operationKey(parameters.action, access.invoice),
        changeReason: "Project invoice " + parameters.action
    })
    return {message: ec.l10n.localize(messages[parameters.action])}
}

function send(parameters) {
    const access = invoiceAccess(parameters.invoiceId)
    const print = call("ironstone.projects.BillingServices.get#InvoicePrint", {invoiceId: parameters.invoiceId, forEmail: true})
    // These display overrides come only from the authorized server projection, never from the request context.
    const result = call("mantle.account.InvoiceServices.send#Invoice", {
        invoiceId: parameters.invoiceId,
        organizationPartyId: access.invoice.fromPartyId,
        lastUpdatedStamp: access.invoice.lastUpdatedStamp,
        operationKey: operationKey("send", access.invoice, [
            parameters.toAddresses,
            parameters.note,
            parameters.attachmentContentIdList || [],
            parameters.attachmentVersions || {}
        ]),
        emailTemplateId: "BOSS_PROJECT_INVOICE",
        toAddresses: parameters.toAddresses,
        note: parameters.note,
        attachmentContentIdList: parameters.attachmentContentIdList || [],
        attachmentVersions: parameters.attachmentVersions || {},
        printHtml: print.printHtml,
        summaryText: print.summaryText
    })
    const recipients = result.recipientResults || []
    const emailMessageId = result.emailMessageId || recipients.find(row => row.emailMessageId)?.emailMessageId || null
    const failures = recipients.filter(row => row.status === "failed")
    const queued = recipients.some(row => ["queued", "pending"].includes(row.status))
    return {
        emailMessageId,
        message: failures.length
            ? ec.resource.expand("Invoice ${invoiceId}: ${count} recipients could not be sent", "", {
                  invoiceId: parameters.invoiceId,
                  count: failures.length
              })
            : ec.resource.expand(
                  queued
                      ? "Invoice ${invoiceId} sent to ${to}; the email waits in the Outbox"
                      : "Invoice ${invoiceId} sent to ${to}",
                  "",
                  {
                      invoiceId: parameters.invoiceId,
                      to: parameters.toAddresses
                  }
              )
    }
}

function saveHeader(parameters) {
    const access = invoiceAccess(parameters.invoiceId)
    let invoiceDate = null
    if (parameters.invoiceDate) {
        invoiceDate = ec.l10n.parseTimestamp(
            String(parameters.invoiceDate).slice(0, 10) + " 00:00:00.000",
            "yyyy-MM-dd HH:mm:ss.SSS"
        )
        if (invoiceDate == null) throw new Error(ec.l10n.localize("The invoice date is yyyy-MM-dd"))
    }
    const fields = {
        invoiceId: parameters.invoiceId,
        organizationPartyId: access.invoice.fromPartyId,
        lastUpdatedStamp: access.invoice.lastUpdatedStamp,
        settlementTermId: parameters.settlementTermId || null,
        referenceNumber: parameters.referenceNumber || null,
        description: parameters.description || null,
        invoiceMessage: parameters.invoiceMessage || null
    }
    if (invoiceDate != null) fields.invoiceDate = invoiceDate
    call("mantle.account.InvoiceServices.store#InvoiceDraft", fields)
    return {message: ec.l10n.localize("Invoice saved")}
}

function removeLine(parameters) {
    const access = invoiceAccess(parameters.invoiceId)
    const line = ec.entity
        .find("mantle.account.invoice.InvoiceItem")
        .condition({invoiceId: parameters.invoiceId, invoiceItemSeqId: parameters.invoiceItemSeqId})
        .disableAuthz()
        .one()
    if (!line) throw new Error(ec.l10n.localize("Invoice line is not available"))
    call("mantle.account.InvoiceServices.delete#InvoiceDraftItem", {
        invoiceId: parameters.invoiceId,
        organizationPartyId: access.invoice.fromPartyId,
        invoiceItemSeqId: parameters.invoiceItemSeqId,
        lastUpdatedStamp: line.lastUpdatedStamp
    })
    return {message: ec.l10n.localize("Line removed; its time or milestone share is unbilled again")}
}

const operations = {changeStatus, send, saveHeader, removeLine}
;({
    execute: (operation, parameters) => {
        if (!operations[operation]) throw new Error("Unknown project invoice operation " + operation)
        return operations[operation](parameters)
    }
})
