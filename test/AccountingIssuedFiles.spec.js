// Issued evidence stays exact through the same Files services that permit ordinary supporting-file changes.
const helper = () => ec.resource.script("component://mr-boss/test/AccountingSpecLib.js")
const lib = () => ec.resource.script("component://mr-mantle/service/mantle/ledger/AccountingPolicy.js")
const invoke = (name, parameters) => helper().call(name, parameters)
const files = (operation, parameters = {}) =>
    invoke("ironstone.shared.RecordFilesServices." + operation, {...record, ...parameters})
const refuse = (operation, parameters = {}) =>
    helper().refusal("ironstone.shared.RecordFilesServices." + operation, {...record, ...parameters})
const as = (user, action) => helper().asUser(user, action, false)
const bytes = location => {
    const stream = ec.resource.getLocationReference(location).getInputStream()
    try {
        return StringUtilities.base64Encode(stream.readAllBytes())
    } finally {
        stream.close()
    }
}
let record, delivery, issued, support, supportArchive, issuedBytes, supportBytes
spec({
    stepwise: true,
    setupSpec() {
        login("john.doe")
        ec.artifactExecution.disableAuthz()
        ec.factory.getTool("MailCapture").enable()
        as("finance.ar", () => {
            const made = invoke("mantle.account.InvoiceServices.create#Receivable", {
                organizationPartyId: "ORG_ZIZI_CORP",
                customerPartyId: "ORG_ACME",
                description: "Issued files integrity"
            })
            record = {recordEntityName: "mantle.account.invoice.Invoice", recordId: made.invoiceId}
            invoke("mantle.account.InvoiceServices.store#InvoiceDraftItem", {
                invoiceId: made.invoiceId,
                itemTypeEnumId: "ItemTimeEntry",
                quantity: "1",
                amount: "19"
            })
            const invoiceContentId = "BOSS_ISSUED_LIVE_SUPPORT"
            const contentLocation =
                "dbresource://mantle/content/invoice/" + made.invoiceId + "/content_" + invoiceContentId + "/Scope.txt"
            ec.resource.getLocationReference(contentLocation).putText("Original supporting scope")
            invoke("create#mantle.account.invoice.InvoiceContent", {
                invoiceContentId,
                invoiceId: made.invoiceId,
                contentLocation,
                contentTypeEnumId: "IctInvoiceDocument"
            })
            support = lib().one("mantle.account.invoice.InvoiceContent", {invoiceContentId}).getMap()
            const reviewed = invoke("mantle.account.InvoiceServices.get#InvoiceDeliveryAttachments", {invoiceId: made.invoiceId})
            const detail = invoke("mantle.account.InvoiceServices.get#InvoiceFinanceDetail", {invoiceId: made.invoiceId})
            const sent = invoke("mantle.account.InvoiceServices.send#Invoice", {
                invoiceId: made.invoiceId,
                lastUpdatedStamp: detail.invoice.lastUpdatedStamp,
                operationKey: "boss-issued-file-proof",
                toAddresses: "issued-file@example.test",
                attachmentContentIdList: [invoiceContentId],
                attachmentVersions: {[invoiceContentId]: reviewed.attachmentRows[0].attachmentVersion}
            })
            delivery = lib().one("mantle.account.invoice.InvoiceDelivery", {deliveryId: sent.deliveryId}).getMap()
            issued = lib().one("mantle.account.invoice.InvoiceContent", {invoiceContentId: delivery.invoiceContentId}).getMap()
            supportArchive = JSON.parse(delivery.sourceJson).attachmentManifest[0].attachmentLocation
            issuedBytes = bytes(delivery.contentLocation)
            supportBytes = bytes(supportArchive)
        })
    },
    cleanupSpec() {
        ec.factory.getTool("MailCapture").reset()
        login("john.doe")
    }
})

feature("issued files are read only and invoice view alone permits no Files mutations even with artifact authz disabled", {
    when() {
        const ar = as("finance.ar", () => files("get#RecordFiles"))
        const reader = as("finance.read", () => files("get#RecordFiles"))
        const parameters = {contentFile: uploadedFile("Extra.txt", "Ordinary invoice evidence"), contentTypeEnumId: "IctNote"}
        const denied = as("finance.read", () => refuse("upload#RecordFile", parameters))
        const allowed = as("finance.ar", () => files("upload#RecordFile", parameters))
        return {ar, reader, denied, allowed}
    },
    then({ar, reader, denied, allowed}) {
        ar.canUpload == true
        ar.fileList.find(row => row.contentKey.includes(issued.invoiceContentId)).canRemove == false
        !ar.fileList.find(row => row.contentKey.includes(issued.invoiceContentId)).drivePath
        ar.fileList.find(row => row.contentKey.includes(support.invoiceContentId)).canRemove == true
        reader.canUpload == false
        reader.fileList.every(row => !row.canRemove)
        denied.includes("may not add files")
        allowed.createdList.length == 1
        allowed.failedList.length == 0
    }
})

feature("generic remove and version writes cannot delete or overwrite main or supporting issued evidence", {
    when() {
        return as("finance.ar", () => {
            const remove = refuse("remove#RecordFile", {contentKey: JSON.stringify({invoiceContentId: issued.invoiceContentId})})
            const paths = [delivery.contentLocation, supportArchive].map(location =>
                location.slice("dbresource://mantle/content/".length)
            )
            const refusals = paths.map(drivePath => ({
                upload: refuse("upload#RecordFileVersion", {
                    drivePath,
                    contentFile: uploadedFile("Tampered.pdf", "Tampered bytes")
                }),
                restore: refuse("restore#RecordFileVersion", {drivePath, versionName: "1111111111111111111111111111111111111111"})
            }))
            return {
                remove,
                refusals,
                after: bytes(delivery.contentLocation),
                supportAfter: bytes(supportArchive),
                row: lib().one("mantle.account.invoice.InvoiceContent", {invoiceContentId: issued.invoiceContentId})
            }
        })
    },
    then({remove, refusals, after, supportAfter, row}) {
        remove.includes("may not remove")
        refusals.every(
            result => result.upload.includes("Not a file of this record") && result.restore.includes("Not a file of this record")
        )
        after == issuedBytes
        supportAfter == supportBytes
        row.invoiceContentId == issued.invoiceContentId
        row.contentLocation == delivery.contentLocation
    }
})

feature("ordinary supporting evidence remains versionable and removable while its sent copy stays exact", {
    when() {
        return as("finance.ar", () => {
            const drivePath = support.contentLocation.slice("dbresource://mantle/content/".length)
            files("upload#RecordFileVersion", {drivePath, contentFile: uploadedFile("Scope.txt", "Updated supporting scope")})
            const versions = files("get#RecordFileVersions", {drivePath})
            const old = versions.versionList[1]
            if (!old?.versionName) throw new Error("A real prior supporting-file version is required")
            const restored = files("restore#RecordFileVersion", {drivePath, versionName: old.versionName})
            const restoredText = ec.resource.getLocationReference(support.contentLocation).getText()
            const removed = files("remove#RecordFile", {contentKey: JSON.stringify({invoiceContentId: support.invoiceContentId})})
            return {
                versions,
                restored,
                restoredText,
                removed,
                liveExists: ec.resource.getLocationReference(support.contentLocation).getExists(),
                archive: bytes(supportArchive),
                main: bytes(delivery.contentLocation)
            }
        })
    },
    then({versions, restored, restoredText, removed, liveExists, archive, main}) {
        versions.canChange == true
        versions.versionList.length >= 2
        restored.message.toLowerCase().includes("restored")
        restoredText == "Original supporting scope"
        !!removed.message
        liveExists == false
        archive == supportBytes
        main == issuedBytes
    }
})
