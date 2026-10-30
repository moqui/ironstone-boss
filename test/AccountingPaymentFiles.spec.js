// Shared Files must preserve native payment authority even for known content keys and artifact-off requests.
const helper = ec.resource.script("component://mr-boss/test/AccountingSpecLib.js"),
    native = "mantle.account.PaymentServices.",
    files = "ironstone.shared.RecordFilesServices.",
    paymentId = "BOSS_ACCT_PAY_CHECK",
    organizationPartyId = helper.ids.organizationPartyId,
    record = {recordEntityName: "mantle.account.payment.Payment", recordId: paymentId}
function output(type) {
    return helper.call(native + "get#PaymentOutput", {organizationPartyId, paymentId, outputType: type})
}
function content(type) {
    const issued = output(type)
    return ec.entity
        .find("mantle.account.payment.PaymentIssuedOutput")
        .condition("paymentOutputId", issued.outputId)
        .disableAuthz()
        .one()
}
function domainCall(name, parameters) {
    return ec.service.sync().name(name).parameters(parameters).disableAuthz().throwOnError(true).call()
}
function mountedDownload(contentKey) {
    const result = ec.screen.makeTest().rootScreen("component://mr-boss/screen/Accounting.xml").render(
            "RecordFiles/download",
            {
                organizationPartyId,
                recordEntity: record.recordEntityName,
                recordId: paymentId,
                contentKey
            },
            "get"
        ),
        body = String(result.output || ""),
        errors = Array.from(result.errorMessages || []).join("\n") + " " + body
    ec.message.clearErrors()
    return {
        readable: result.status === 200 && body.startsWith("%PDF-"),
        refused: errors.includes("PERMISSION_DENIED") && !body.startsWith("%PDF-")
    }
}
function refused(name, parameters) {
    ec.message.pushErrors()
    try {
        ec.service.sync().name(name).parameters(parameters).disableAuthz().requireNewTransaction(true).throwOnError(true).call()
        return ""
    } catch (error) {
        return String(error.message)
    } finally {
        ec.message.clearErrors()
        ec.message.popErrors()
    }
}
spec({
    setup() {
        login("john.doe")
        ec.artifactExecution.disableAuthz()
        helper.selectOrganization(organizationPartyId)
    }
})
feature("payment Files filters issued checks before its count and requested limit", {
    when() {
        const treasury = helper.asUser("finance.treasury", () =>
            domainCall(files + "get#RecordFiles", Object.assign({}, record, {limit: 1}))
        )
        const reader = helper.asUser("finance.read", () =>
            domainCall(files + "get#RecordFiles", Object.assign({}, record, {limit: 1}))
        )
        return {treasury, reader}
    },
    then({treasury, reader}) {
        treasury.visible == true
        treasury.fileCount == 3
        treasury.fileList.length == 1
        reader.fileCount == 2
        reader.fileList.length == 1
        reader.fileList.every(row => !row.fileName.includes("-check.pdf") && row.isImmutable && !row.canRemove)
        reader.canUpload == false
        reader.extraList == []
        reader.fileList.every(row => row.drivePath == null)
    }
})
feature("authorized payment Files work without an active selection and refuse a valid different selected organization", {
    when() {
        const withoutSelection = helper.asUser("finance.admin", () => {
            helper.selectOrganization(null)
            return domainCall(files + "get#RecordFiles", record)
        })
        const otherSelection = helper.asUser("finance.admin", () => {
            helper.selectOrganization(helper.ids.foreignOrganizationPartyId)
            return refused(files + "get#RecordFiles", record)
        })
        return {withoutSelection, otherSelection}
    },
    then({withoutSelection, otherSelection}) {
        withoutSelection.visible == true
        withoutSelection.fileCount == 3
        !!otherSelection
    }
})
feature("a known issued-check content key requires treasury authority with artifact authorization on and off", {
    where: [{enabled: true}, {enabled: false}],
    when({enabled}) {
        const check = content("check"),
            contentKey = JSON.stringify({paymentContentId: check.paymentContentId})
        return {
            allowed: helper.asUser(
                "finance.treasury",
                () =>
                    enabled
                        ? mountedDownload(contentKey).readable
                        : domainCall(files + "get#RecordFile", Object.assign({}, record, {contentKey})).contentType
                              .catalogCanChange === false,
                enabled
            ),
            refused: helper.asUser(
                "finance.read",
                () =>
                    enabled
                        ? mountedDownload(contentKey).refused
                        : refused(files + "get#RecordFile", Object.assign({}, record, {contentKey})).includes(
                              "PERMISSION_DENIED"
                          ),
                enabled
            )
        }
    },
    then({allowed, refused}) {
        allowed == true
        refused == true
    }
})
feature("a receipt remains readable to an accounting reader while issued files cannot be removed by their creator", {
    when() {
        const receipt = content("receipt"),
            contentKey = JSON.stringify({paymentContentId: receipt.paymentContentId})
        return {
            read: helper.asUser("finance.read", () =>
                domainCall(files + "get#RecordFile", Object.assign({}, record, {contentKey}))
            ),
            refused: helper.refusal(files + "remove#RecordFile", Object.assign({}, record, {contentKey})),
            issued: output("receipt")
        }
    },
    then({read, refused, issued}) {
        read.fileName.includes("-receipt.pdf")
        !!refused
        !issued.approvedHtml.includes("000123456789")
        !issued.approvedHtml.includes("000000000")
        issued.summary.maskedMethodLabel.includes("6789")
    }
})
feature("ordinary supporting files retain authorized upload read and removal through the same shared services", {
    when() {
        const result = helper.asUser("finance.treasury", () =>
            domainCall(
                files + "upload#RecordFile",
                Object.assign({}, record, {
                    contentFile: uploadedFile("Payment-support-note.txt", "Supporting payment note"),
                    description: "Supporting note"
                })
            )
        )
        const listed = helper.asUser("finance.treasury", () => domainCall(files + "get#RecordFiles", record)),
            added = listed.fileList.find(row => row.fileName === "Payment-support-note.txt")
        if (!added) throw new Error("The authorized supporting file was not listed")
        const read = helper.asUser("finance.read", () =>
                domainCall(files + "get#RecordFile", Object.assign({}, record, {contentKey: added.contentKey}))
            ),
            removed = helper.asUser("finance.treasury", () =>
                domainCall(files + "remove#RecordFile", Object.assign({}, record, {contentKey: added.contentKey}))
            )
        return {result, added, read, removed, after: domainCall(files + "get#RecordFiles", record)}
    },
    then({result, added, read, removed, after}) {
        result.createdList.length == 1
        result.failedList == []
        added.isImmutable == false
        added.canRemove == true
        read.fileName == "Payment-support-note.txt"
        !!removed.message
        !after.fileList.some(row => row.fileName === "Payment-support-note.txt")
        after.fileCount == 3
    }
})
feature("an unrelated record cannot publish an issued payment archive through its content pointer", {
    when() {
        const check = content("check"),
            unrelated = {recordEntityName: "mantle.party.Party", recordId: helper.ids.customerPartyId},
            contentId = "BOSS_ACCT_PAY_ALIAS",
            ordinaryId = "BOSS_ACCT_PAY_ALIAS_OK",
            location = "dbresource://mantle/content/party/" + helper.ids.customerPartyId + "/content_" + ordinaryId + "/Note.txt",
            alias = String(check.contentLocation)
                .replace("dbresource://", "dbresource:/")
                .replace("mantle/content/", "mantle//content//")
        ec.resource.getLocationReference(location).putText("An ordinary party attachment")
        for (const [partyContentId, contentLocation, offset] of [
            [ordinaryId, location, 0],
            [contentId, alias, 1000]
        ])
            helper.call("create#mantle.party.PartyContent", {
                partyContentId,
                partyId: helper.ids.customerPartyId,
                contentLocation,
                contentDate: new Date(Number(ec.user.nowTimestamp) + offset),
                userId: ec.user.userId,
                description: "Attachment boundary proof"
            })
        try {
            return {
                listed: domainCall(files + "get#RecordFiles", Object.assign({}, unrelated, {limit: 1})),
                privateRead: refused(
                    files + "get#RecordFile",
                    Object.assign({}, unrelated, {contentKey: JSON.stringify({partyContentId: contentId})})
                ),
                ordinaryRead: helper.call(
                    files + "get#RecordFile",
                    Object.assign({}, unrelated, {contentKey: JSON.stringify({partyContentId: ordinaryId})})
                ),
                ordinaryId
            }
        } finally {
            for (const partyContentId of [contentId, ordinaryId])
                helper.call("delete#mantle.party.PartyContent", {partyContentId})
            ec.resource.getLocationReference(location).delete()
        }
    },
    then({listed, privateRead, ordinaryRead, ordinaryId}) {
        listed.fileList.length == 1
        listed.fileList[0].contentKey.includes(ordinaryId)
        !JSON.stringify(listed).includes('BOSS_ACCT_PAY_ALIAS"')
        privateRead.includes("PAYMENT_ARCHIVE_PRIVATE")
        ordinaryRead.fileName == "Note.txt"
    }
})
