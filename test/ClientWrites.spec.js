// Client access, the client's own writes and nothing more (impl-projects.md P10b; design-projects.md §1.1, §15 Client access and
// Chatter for client users): with authorization on, each write ironstone.client.ClientServices opens to a client contact is refused on
// another client's record and on an internal-only record, and refused to an internal user; a client's message reaches only the team
// (never another client, even one put on the project); the Mantle entity writes stay denied to a client outside those services; and
// every IronStone write service but the client's is in the client's deny pattern (BOSS_PROJECTS_INTERNAL), checked against every
// service file. sheldon.acme (Acme, ACME) and gob.bluth (Bluth Corp, BLUTH) are the clients; what a feature changes is put back.
// Run: ./moq test mr-boss --spec ClientWrites
const webroot = "component://webroot/screen/webroot.xml"
const SHELDON = "sheldon.acme"
const CLIENT = "ironstone.client.ClientServices."

function hit(path, parameters, method) {
    const str = ec.screen.makeTest().rootScreen(webroot).render("apps/" + path, parameters || {}, method || null)
    const output = String(str.output || "")
    const errors = str.errorMessages.join(" | ")
    ec.message.clearErrors()
    let json = null
    try { json = JSON.parse(output) } catch (err) { json = null }
    return { status: str.status, errors, output, json, refused: str.status == 401 || str.status == 403 || /not authorized/i.test(errors) }
}
function sys(run) {
    const wasDisabled = ec.artifactExecution.disableAuthz()
    try { return run() } finally { if (!wasDisabled) ec.artifactExecution.enableAuthz() }
}
function as(username, run) {
    login(username)
    const wasDisabled = ec.artifactExecution.authzDisabled()
    if (wasDisabled) ec.artifactExecution.enableAuthz()
    try { return run() } finally {
        if (wasDisabled) ec.artifactExecution.disableAuthz()
        login("john.doe")
    }
}
// a service call as the current user: its errors (a refusal) or its result
const service = (name, parameters) => {
    let out = {}
    let thrown = ""
    try { out = ec.service.sync().name(name).parameters(parameters || {}).call() || {} } catch (err) { thrown = String(err && err.message ? err.message : err) }
    const errors = (ec.message.getErrorsString ? ec.message.getErrorsString() : "") + thrown
    ec.message.clearErrors()
    return Object.assign({}, out, { _errors: errors || "" })
}
const refusedOut = (out) => out._errors != ""
const refusedHit = (found) => found.refused || found.errors != "" || found.json?.errors != null
const count = (entityName, fields) => sys(() => ec.entity.find(entityName).condition(fields).count())
const messageCount = () => count("mantle.party.communication.CommunicationEvent", { fromPartyId: "ORG_ACME_SA", body: "<p>ZQW-REFUSED</p>" })
    + count("mantle.party.communication.CommunicationEvent", { fromPartyId: "ORG_BLUTH_GOB", body: "<p>ZQW-REFUSED</p>" })

spec({ stepwise: false })

feature("a client's message and reply: refused on another client's record, a party, a note, off the record, and to an internal user", {
    when() {
        const before = messageCount()
        const body = "<p>ZQW-REFUSED</p>"
        // a record the client does not see is one rule (get#ClientWriteContext over get#RecordLinkInfo, whose kinds of record
        // test/ClientChatDrive.spec.js checks): another client's item, and a party
        const sheldon = as(SHELDON, () => ({
            otherClient: hit("Projects/Chatter/sendMessage", { recordEntity: "mantle.work.effort.WorkEffort", recordId: "BLUTH-1", body }, "post"),
            party: hit("Projects/Chatter/sendMessage", { recordEntity: "mantle.party.Party", recordId: "ORG_ACME", body }, "post"),
            replyToNote: hit("Projects/Chatter/reply", { recordEntity: "mantle.work.effort.WorkEffort", recordId: "ACME-1", parentCommEventId: "BOSS_DEMO_ACME_NOTE1", body }, "post"),
            replyOffRecord: hit("Projects/Chatter/reply", { recordEntity: "mantle.work.effort.WorkEffort", recordId: "ACME-4", parentCommEventId: "BOSS_DEMO_ACME_MSG1", body }, "post"),
        }))
        // an internal user is no client: the client services refuse it
        // (with authorization off, so the refusal is the service's own and not the authorization's)
        const internal = as("john.doe", () => sys(() => ({
            send: service(CLIENT + "send#ChatterMessage", { recordEntityName: "mantle.work.effort.WorkEffort", recordId: "ACME-1", body }),
            raise: service(CLIENT + "raise#ClientRequest", { rootWorkEffortId: "ACME", requestName: "ZQW-REFUSED" }),
            gate: service(CLIENT + "decide#ClientGate", { workEffortId: "ACME-MS-1", decision: "approve" }),
        })))
        return { before, after: messageCount(), sheldon, internal }
    },
    then({ before, after, sheldon, internal }) {
        Object.values(sheldon).every(refusedHit)
        Object.values(internal).every(refusedOut)
        after == before
    },
})

feature("a client's message goes to the team only: never to another client put on the project, nor to the client's own side", {
    when() {
        // Gob Bluth (a client user) and Acme's billing contact on ACME in roles that are not client roles
        sys(() => {
            for (const [partyId, roleTypeId] of [["ORG_BLUTH_GOB", "Programmer"], ["ORG_ACME_BA", "Watcher"]])
                ec.service.sync().name("create#mantle.work.effort.WorkEffortParty").parameters({ workEffortId: "ACME", partyId, roleTypeId,
                    fromDate: "2026-10-01 00:00:00" }).call()
        })
        let sent = null
        try {
            sent = as(SHELDON, () => hit("Projects/Chatter/sendMessage", { recordEntity: "mantle.work.effort.WorkEffort", recordId: "ACME",
                body: "<p>ZQW-TEAM-ONLY</p>" }, "post"))
        } finally {
            sys(() => ec.entity.find("mantle.work.effort.WorkEffortParty").condition({ workEffortId: "ACME", fromDate: "2026-10-01 00:00:00" })
                .condition("partyId", "in", ["ORG_BLUTH_GOB", "ORG_ACME_BA"]).deleteAll())
        }
        const id = sent?.json?.communicationEventId
        const recipients = id ? sys(() => Array.from(ec.entity.find("mantle.party.communication.CommunicationEventParty").condition("communicationEventId", id).list())
            .map((row) => row.partyId)) : []
        const event = id ? sys(() => ec.entity.find("mantle.party.communication.CommunicationEvent").condition("communicationEventId", id).one()?.getMap()) : null
        if (id) sys(() => {
            for (const entityName of ["mantle.party.communication.CommunicationEventParty", "mantle.work.effort.WorkEffortCommEvent",
                    "mantle.party.communication.CommunicationEventRecord"]) ec.entity.find(entityName).condition("communicationEventId", id).deleteAll()
            ec.entity.find("mantle.party.communication.CommunicationEvent").condition("communicationEventId", id).updateAll({ statusId: "CeCancelled" })
        })
        return { id, recipients, event }
    },
    then({ id, recipients, event }) {
        id != null
        event.fromPartyId == "ORG_ACME_SA"
        event.toPartyId == "EX_JOHN_DOE"
        recipients.includes("EX_JOHN_DOE")
        !recipients.includes("ORG_BLUTH_GOB")
        !recipients.includes("ORG_ACME_BA")
        !recipients.includes("ORG_ACME_SA")
        !recipients.includes("ORG_ACME")
        !recipients.includes("ORG_ZIZI_SERVICES")
    },
})

feature("a client raises a request only in its own sign-in project, adds files only to a request it sees, cancels only its own", {
    when() {
        const before = count("mantle.request.Request", { requestName: "ZQW-REFUSED" })
        const sheldon = as(SHELDON, () => ({
            raiseOther: hit("Projects/Requests/List/raiseClientRequest", { newProjectId: "BLUTH", requestName: "ZQW-REFUSED" }, "post"),
            raiseNoSignIn: hit("Projects/Requests/List/raiseClientRequest", { newProjectId: "ACMEAPP", requestName: "ZQW-REFUSED" }, "post"),
            uploadItem: hit("Projects/RecordFiles/upload", { recordEntity: "mantle.work.effort.WorkEffort", recordId: "ACME-1",
                contentFile: uploadedFile("x.txt", "x") }, "post"),
            uploadScript: hit("Projects/RecordFiles/upload", { recordEntity: "mantle.request.Request", recordId: "BOSS_DEMO_PREQ_ACME1",
                contentFile: uploadedFile("x.svg", "<svg onload='alert(1)'/>") }, "post"),
            cancelNotMine: hit("Projects/Requests/RequestDetail/changeStatus", { requestId: "BOSS_DEMO_PREQ_ACME2", toStatusId: "ReqCancelled" }, "post"),
            moveOn: hit("Projects/Requests/RequestDetail/changeStatus", { requestId: "BOSS_DEMO_PREQ_ACME1", toStatusId: "ReqCompleted" }, "post"),
        }))
        const statuses = sys(() => ["BOSS_DEMO_PREQ_ACME1", "BOSS_DEMO_PREQ_ACME2"].map((id) => ec.entity.find("mantle.request.Request").condition("requestId", id).one().statusId))
        return { before, after: count("mantle.request.Request", { requestName: "ZQW-REFUSED" }), sheldon, statuses,
            files: count("mantle.request.RequestContent", { requestId: "BOSS_DEMO_PREQ_ACME1", description: "x.svg" }) }
    },
    then({ before, after, sheldon, statuses, files }) {
        Object.values(sheldon).every(refusedHit)
        after == before
        statuses == ["ReqReviewed", "ReqSubmitted"]
        files == 0
    },
})

feature("a client decides only the gate it is the approver of, and refuses only with a reason", {
    when() {
        const approvedBefore = count("mantle.work.effort.WorkEffortApproval", { workEffortId: "ACME-MS-1", statusId: "WeaApproved" })
        // a milestone the client does not see, and an action but approve and refuse: test/ClientIsolation.spec.js
        const noReason = as(SHELDON, () => hit("Projects/Projects/MilestoneDetail/decideGate", { workEffortId: "ACME-MS-1", action: "refuse", comments: "" }, "post"))
        const notAwaiting = as(SHELDON, () => hit("Projects/Projects/MilestoneDetail/decideGate", { workEffortId: "ACME-MS-2", action: "approve" }, "post"))
        // the approver another Acme contact: Sheldon is not it
        sys(() => ec.entity.find("mantle.work.effort.WorkEffortSetting").condition({ workEffortId: "ACME-MS-1", settingTypeEnumId: "WstApproverParty" })
            .updateAll({ settingValue: "ORG_ACME_BA" }))
        let notApprover = null
        try {
            notApprover = as(SHELDON, () => ({ hit: hit("Projects/Projects/MilestoneDetail/decideGate", { workEffortId: "ACME-MS-1", action: "approve" }, "post"),
                page: ec.screen.makeTest().rootScreen(webroot).renderMode("qvt").withStaticData().render("apps/Projects/Projects/MilestoneDetail",
                    { workEffortId: "ACME-MS-1", lastStandalone: "true" }, null).output }))
        } finally {
            sys(() => ec.entity.find("mantle.work.effort.WorkEffortSetting").condition({ workEffortId: "ACME-MS-1", settingTypeEnumId: "WstApproverParty" })
                .updateAll({ settingValue: "ORG_ACME_SA" }))
        }
        return { approvedBefore, noReason, notAwaiting, notApprover,
            approvedAfter: count("mantle.work.effort.WorkEffortApproval", { workEffortId: "ACME-MS-1", statusId: "WeaApproved" }),
            refused: count("mantle.work.effort.WorkEffortApproval", { workEffortId: "ACME-MS-1", statusId: "WeaRefused" }),
            waiting: count("mantle.work.effort.WorkEffortApproval", { workEffortId: "ACME-MS-1", statusId: "WeaRequested" }) }
    },
    then({ approvedBefore, noReason, notAwaiting, notApprover, approvedAfter, refused, waiting }) {
        refusedHit(noReason)
        refusedHit(notAwaiting)
        refusedHit(notApprover.hit)
        !String(notApprover.page).includes("Refuse ")
        approvedAfter == approvedBefore
        refused == 0
        waiting == 1
    },
})

feature("outside its own services a client writes no Mantle record, even through a Mantle service", {
    when() {
        return as(SHELDON, () => ({
            event: service("create#mantle.party.communication.CommunicationEvent", { communicationEventTypeId: "Message", fromPartyId: "ORG_ACME_SA", subject: "ZQW-REFUSED" }),
            message: service("mantle.party.CommunicationServices.create#Message", { toPartyIdList: ["EX_JOHN_DOE"], subject: "ZQW-REFUSED", body: "x" }),
            workItem: service("update#mantle.work.effort.WorkEffort", { workEffortId: "ACME-1", workEffortName: "ZQW-REFUSED" }),
        }))
    },
    then(out) {
        Object.values(out).every(refusedOut)
        count("mantle.party.communication.CommunicationEvent", { subject: "ZQW-REFUSED" }) == 0
        count("mantle.work.effort.WorkEffort", { workEffortName: "ZQW-REFUSED" }) == 0
    },
})

feature("every IronStone write service is in the client's deny pattern, and only ironstone.client services are outside it", {
    when() {
        const READS = ["get", "find", "search", "check", "clean", "decorate", "describe", "list", "lookup", "match", "parse", "suggest"]
        const member = sys(() => ec.entity.find("moqui.security.ArtifactGroupMember").condition({ artifactGroupId: "BOSS_PROJECTS_INTERNAL",
            artifactTypeEnumId: "AT_SERVICE" }).list()).map((row) => row.artifactName)
        const patterns = member.map((text) => new RegExp("^(?:" + text + ")$"))
        const root = "component://mr-boss/service/ironstone"
        const notDenied = []
        const clientExtra = []
        const clientWrites = []
        const clientDenied = []
        const walk = (location, prefix) => {
            for (const ref of ec.resource.getLocationReference(location).getDirectoryEntries()) {
                const name = ref.location.substring(ref.location.lastIndexOf("/") + 1)
                if (ref.isDirectory()) { walk(ref.location, prefix + name + "."); continue }
                if (!name.endsWith(".xml")) continue
                const className = prefix + name.replace(/\.xml$/, "")
                const text = String(ref.getText())
                const clientFile = className === "client.ClientServices"
                if (className.startsWith("client.") && !clientFile) clientExtra.push(className)
                for (const match of text.matchAll(/<service verb="([A-Za-z]+)" noun="([A-Za-z]+)"([^>]*)>/g)) {
                    // an interface only declares parameters for the services that implement it; it cannot be called
                    if (/type="interface"/.test(match[3])) continue
                    const full = "ironstone." + className + "." + match[1] + "#" + match[2]
                    const denied = patterns.some((pattern) => pattern.test(full))
                    if (clientFile) {
                        if (!READS.includes(match[1])) {
                            clientWrites.push(full)
                            if (denied) clientDenied.push(full)
                        }
                        continue
                    }
                    if (!READS.includes(match[1]) && !denied) notDenied.push(full)
                }
            }
        }
        walk(root, "")
        const clientText = sys(() => String(ec.resource.getLocationReference(root + "/client/ClientServices.xml").getText()))
        const remoteOpen = (clientText.match(/<service verb="/g) || []).length - (clientText.match(/<service verb="[^"]+" noun="[^"]+" allow-remote="false"/g) || []).length
        return { notDenied, clientExtra, clientWrites, clientDenied, remoteOpen }
    },
    then({ notDenied, clientExtra, clientWrites, clientDenied, remoteOpen }) {
        notDenied == []
        clientExtra == []
        clientDenied == []
        clientWrites.length >= 6
        remoteOpen == 0
    },
})
