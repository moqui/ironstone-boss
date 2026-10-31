// The composer (screen/Comms/Inbox/Compose.xml and Compose.qvue, service/ironstone/comms/ComposeServices.xml, impl-drawers-commons.md
// M5b, M5c), its JSON transitions under the Comms app root as john.doe, with the framework's mail capture so a send goes with
// no mail server (docs/Build-Test.md "Mail"): what a new message, a reply, a reply all, a forward with its files and a draft start
// with; the recipient search for email and for internal messages; drafts saved and opened again; a send now, a send held for
// Undo and taken back to Drafts, a scheduled send; a send with the record chip filed on the record (send#EmailDraft, R6) and
// shown in its Chatter; internal messages: new, to a mailbox, replies (reply all and to the sender only), Undo; the text
// blocks; Discard. The sender is always the user: a fromPartyId in the request is not read, another user's identity or draft
// is refused, and a file location the composer did not store is refused.
// Run: ./moq test mr-boss --spec Compose
const comms = "component://mr-boss/screen/Comms.xml"
const commons = "component://mr-boss/screen/Commons.xml"
const MAIL = "org.moqui.impl.EmailClientServices"
const capture = ec.factory.getTool("MailCapture")
let accountId, identityValue

function transition(name, parameters, method) {
    const str = ec.screen.makeTest().rootScreen(comms).render(`Inbox/Compose/${name}`, parameters || {}, method || null)
    let json = null
    try { json = JSON.parse(str.output) } catch (err) { json = null }
    const errors = (json && !Array.isArray(json) && json.errors) || str.errorMessages.join(" | ")
    ec.message.clearErrors()
    return { status: str.status, errors: errors || "", json: json || {}, text: String(str.output || "").substring(0, 300) }
}
const get = (name, parameters) => transition(name, parameters, null)
const post = (name, parameters) => transition(name, parameters, "post")
function sys(run) {
    const wasDisabled = ec.artifactExecution.disableAuthz()
    try { return run() } finally { if (!wasDisabled) ec.artifactExecution.enableAuthz() }
}
const one = (entityName, fields) => sys(() => ec.entity.find(entityName).condition(fields).one())
const list = (entityName, fields) => sys(() => Array.from(ec.entity.find(entityName).condition(fields).list()))
const chips = (values) => JSON.stringify(values.map((value) => ({ value, label: value })))
const settle = () => ec.factory.waitWorkerPoolEmpty(100)

spec({
    setupSpec() {
        sys(() => call("ironstone.comms.MailDemoServices.load#MailDemo", {}))
        login("john.doe")
        capture.enable()
        // an account with an SMTP host, which the capture never connects to
        accountId = sys(() => call(`${MAIL}.create#EmailAccount`, { accountKindEnumId: "EakHosted", emailAddress: "john.compose@ziziwork.example", accountName: "Ziziwork",
            smtpHost: "127.0.0.1", smtpPort: "1", smtpStartTls: "N" })).emailAccountId
        identityValue = "identity:" + one("moqui.basic.email.EmailIdentity", { emailAccountId: accountId }).emailIdentityId
    },
    cleanupSpec() { capture.reset(); login("john.doe") },
})

feature("a new message starts with the user's identities and the signature; a reply, reply all and forward with the thread", {
    when() {
        return {
            fresh: get("composeData", {}), mailto: get("composeData", { to: "Ada Lovelace <ada@math.example>, bob@b.example", subject: "Hello", body: "Line one\nLine two" }),
            reply: get("composeData", { replyToEmailMessageId: "BOSS_DEMO_MAIL_ACME3" }), replyAll: get("composeData", { replyToEmailMessageId: "BOSS_DEMO_MAIL_ACME3", replyAll: "true" }),
            forward: get("composeData", { forwardEmailMessageId: "BOSS_DEMO_MAIL_ACME1" }), internal: get("composeData", { replyToCommEventId: "BOSS_DEMO_MAIL_IM3" }),
            post: get("composeData", { replyToCommEventId: "BOSS_DEMO_MAIL_POST2" }), sender: get("composeData", { replyToCommEventId: "BOSS_DEMO_MAIL_POST2", replyToSender: "true" }),
            mailbox: get("composeData", { contactListId: "BOSS_DEMO_MBX_OFFICE" }),
            record: get("composeData", { recordEntity: "mantle.request.Request", recordId: "BOSS_DEMO_REQUEST", to: "bob.acme@test.com" }),
        }
    },
    then(v) {
        v.fresh.status == 200
        v.fresh.json.compose.identityList.some((item) => item.value == "identity:BOSS_DEMO_MAIL_IDENT")
        v.fresh.json.compose.identityList.some((item) => item.value == identityValue)
        v.fresh.json.compose.identityList[v.fresh.json.compose.identityList.length - 1].value == "internal"
        v.fresh.json.compose.kind == "new"
        v.mailto.json.compose.to.map((chip) => chip.value) == ['"Ada Lovelace" <ada@math.example>', "bob@b.example"]
        v.mailto.json.compose.subject == "Hello"
        v.mailto.json.compose.body.includes("Line one<br>Line two")
        v.reply.json.compose.fromValue == "identity:BOSS_DEMO_MAIL_IDENT"
        v.reply.json.compose.to.map((chip) => chip.value) == ['"Bob Acme" <bob.acme@test.com>']
        v.reply.json.compose.subject == "Re: Quarterly order for the Ziziwork parts"
        v.reply.json.compose.quoteHtml.includes("first shipment")
        v.reply.json.compose.parentEmailMessageId == "BOSS_DEMO_MAIL_ACME3"
        v.reply.json.compose.threadId == "BOSS_DEMO_MAIL_ACME1"
        v.replyAll.json.compose.kind == "replyAll"
        v.forward.json.compose.kind == "forward"
        v.forward.json.compose.subject == "Fwd: Quarterly order for the Ziziwork parts"
        v.forward.json.compose.emailMessageId != null
        v.forward.json.compose.attachmentList.map((file) => file.name) == ["purchase-order-Q4.txt"]
        v.internal.json.compose.fromValue == "internal"
        v.internal.json.compose.to.map((chip) => chip.value) == ["party:ORG_ZIZI_JD"]
        v.internal.json.compose.to[0].locked == true
        v.internal.json.compose.parentCommEventId == "BOSS_DEMO_MAIL_IM3"
        v.post.json.compose.to.map((chip) => chip.value) == ["list:BOSS_DEMO_MBX_OFFICE"]
        v.post.json.compose.contactListId == "BOSS_DEMO_MBX_OFFICE"
        v.sender.json.compose.to.map((chip) => chip.value) == ["party:ORG_ZIZI_JD"]
        v.sender.json.compose.replyToSenderOnly == true
        v.mailbox.json.compose.fromValue == "internal"
        v.mailbox.json.compose.to[0].kind == "mailbox"
        v.record.json.compose.record.recordId == "BOSS_DEMO_REQUEST"
        v.record.json.compose.record.title == "Set up the shared team calendar"
    },
})

feature("the recipient search offers addresses for email and people and mailboxes for an internal message", {
    when() {
        return { email: post("recipients", { term: "bob", mode: "email" }), typed: post("recipients", { term: "new.person@else.example", mode: "email" }),
            internal: post("recipients", { term: "joe", mode: "internal" }), boxes: post("recipients", { term: "office", mode: "internal" }) }
    },
    then({ email, typed, internal, boxes }) {
        Array.isArray(email.json)
        email.json.some((option) => option.value == '"Bob Acme" <bob.acme@test.com>')
        typed.json.some((option) => option.value == "new.person@else.example")
        internal.json.some((option) => option.value == "party:ORG_ZIZI_JD" && option.kind == "party")
        boxes.json.some((option) => option.value == "list:BOSS_DEMO_MBX_OFFICE" && option.kind == "mailbox")
    },
})

feature("a contact group in the recipients expands to its members on send", {
    when() {
        capture.clear()
        const found = post("recipients", { term: "Family", mode: "email" })
        const sent = post("send", { fromValue: identityValue, toJson: JSON.stringify([{ value: "group:BOSS_DEMO_GRP_FAMILY", label: "Family" }]),
            subject: "Family note", body: "<p>Hello</p>", holdSeconds: "0" })
        const captured = capture.last()
        const emptyId = sys(() => call("mantle.party.ContactBookServices.create#ContactBookGroup", { contactBookId: "BOSS_DEMO_BOOK_JD", groupName: "Nobody" })).contactBookGroupId
        const empty = post("send", { fromValue: identityValue, toJson: JSON.stringify([{ value: "group:" + emptyId, label: "Nobody" }]),
            subject: "x", body: "<p>x</p>", holdSeconds: "0" })
        return { found, sent, captured, empty }
    },
    then({ found, sent, captured, empty }) {
        found.json.some((option) => option.value == "group:BOSS_DEMO_GRP_FAMILY" && option.kind == "group" && option.label.includes("Family"))
        sent.errors == ""
        sent.status == 200
        captured.toList[0].includes("mary.doe@example.com")
        !String(captured.toList).includes("group:")
        empty.errors.includes("no email addresses")
    },
})

feature("a draft saves, opens again with what it had, and is discarded", {
    when() {
        const saved = post("saveDraft", { fromValue: identityValue, toJson: chips(["ada@math.example"]), ccJson: chips(["bob@b.example"]), subject: "Draft subject",
            body: "<p>Draft body</p>" })
        const again = post("saveDraft", { emailMessageId: saved.json.emailMessageId, fromValue: identityValue, toJson: chips(["ada@math.example"]), subject: "Draft subject 2",
            body: "<p>Draft body 2</p>" })
        const opened = get("composeData", { emailMessageId: saved.json.emailMessageId })
        const discarded = post("discard", { emailMessageId: saved.json.emailMessageId })
        return { saved, again, opened, discarded, gone: one("moqui.basic.email.EmailMessage", { emailMessageId: saved.json.emailMessageId }) }
    },
    then({ saved, again, opened, discarded, gone }) {
        saved.status == 200
        saved.json.emailMessageId != null
        again.json.emailMessageId == saved.json.emailMessageId
        opened.json.compose.kind == "draft"
        opened.json.compose.fromValue == identityValue
        opened.json.compose.to.map((chip) => chip.value) == ["ada@math.example"]
        opened.json.compose.subject == "Draft subject 2"
        opened.json.compose.body == "<p>Draft body 2</p>"
        discarded.status == 200
        gone == null
    },
})

feature("an email goes now, or waits the undo hold and comes back to Drafts, or waits for its time", {
    when() {
        capture.clear()
        const now = post("send", { fromValue: identityValue, toJson: chips(['"Ada Lovelace" <ada@math.example>']), subject: "Sent now", body: "<p>Hello Ada</p>", holdSeconds: "0" })
        const captured = capture.last()
        const held = post("send", { fromValue: identityValue, toJson: chips(["ada@math.example"]), subject: "Held", body: "<p>Wait</p>", holdSeconds: "30" })
        const undone = post("cancelSend", { emailMessageId: held.json.emailMessageId })
        const heldRow = one("moqui.basic.email.EmailMessage", { emailMessageId: held.json.emailMessageId })
        const later = post("send", { fromValue: identityValue, toJson: chips(["ada@math.example"]), subject: "Later", body: "<p>Tomorrow</p>",
            scheduledSendDate: String(Date.now() + 86400000) })
        const noRecipient = post("send", { fromValue: identityValue, toJson: "[]", subject: "Nobody", body: "<p>x</p>" })
        const reply = post("send", { fromValue: "identity:BOSS_DEMO_MAIL_IDENT", parentEmailMessageId: "BOSS_DEMO_MAIL_ACME3", toJson: chips(["bob.acme@test.com"]),
            subject: "Re: Quarterly order for the Ziziwork parts", body: "<p>Yes</p>", holdSeconds: "0" })
        return { now, captured, held, undone, heldRow, later, noRecipient, reply }
    },
    then(v) {
        v.now.status == 200
        v.now.json.mode == "email"
        v.now.json.sent == true
        v.now.json.statusId == "ES_SENT"
        v.captured.subject == "Sent now"
        v.captured.toList[0].includes("ada@math.example")
        v.captured.fromAddress == "john.compose@ziziwork.example"
        v.held.json.statusId == "ES_SCHEDULED"
        v.undone.json.statusId == "ES_DRAFT"
        v.heldRow.statusId == "ES_DRAFT"
        v.later.json.statusId == "ES_SCHEDULED"
        v.later.json.scheduledSendDate > Date.now()
        v.noRecipient.errors.includes("Add a recipient")
        // the demo account has no server: the reply says so and stays a draft
        v.reply.errors.includes("no outgoing (SMTP) server")
    },
})

feature("an email with the record chip is filed on the record once sent and shows in its Chatter", {
    when() {
        capture.clear()
        const sent = post("send", { fromValue: identityValue, toJson: chips(['"Bob Acme" <bob.acme@test.com>']), subject: "About the shared calendar",
            body: "<p>Bob, the calendar is ready.</p>", recordEntity: "mantle.request.Request", recordId: "BOSS_DEMO_REQUEST", holdSeconds: "0" })
        settle()
        const event = list("mantle.party.communication.CommunicationEvent", { emailMessageId: sent.json.emailMessageId })[0] || null
        const join = event ? one("mantle.request.RequestCommEvent", { requestId: "BOSS_DEMO_REQUEST", communicationEventId: event.communicationEventId }) : null
        const timeline = ec.screen.makeTest().rootScreen(commons).render("Chatter/timeline", { recordEntity: "mantle.request.Request", recordId: "BOSS_DEMO_REQUEST",
            kinds: "messages" }, null)
        ec.message.clearErrors()
        let entries = []
        try { entries = JSON.parse(timeline.output).entryList || [] } catch (err) { entries = [] }
        const hidden = post("send", { fromValue: identityValue, toJson: chips(["bob.acme@test.com"]), subject: "x", body: "<p>x</p>",
            recordEntity: "mantle.request.Request", recordId: "BOSS_NO_SUCH_REQUEST", holdSeconds: "0" })
        return { sent, event, join, entries, hidden }
    },
    then({ sent, event, join, entries, hidden }) {
        sent.json.sent == true
        event != null
        event.communicationEventTypeId == "Email"
        event.toPartyId == "ORG_ACME_BA"
        join != null
        entries.some((entry) => entry.communicationEventId == event.communicationEventId && entry.title == "About the shared calendar")
        hidden.status != 200
        hidden.errors.includes("not found")
    },
})

feature("internal messages: new, to a mailbox, a reply all, a reply to the sender only off the mailbox, and Undo", {
    when() {
        const fresh = post("send", { fromValue: "internal", toJson: chips(["party:ORG_ZIZI_JD"]), ccJson: chips(["party:ORG_ZIZI_BD"]), subject: "Team lunch",
            body: "<p>Friday at noon?</p>", fromPartyId: "ORG_ZIZI_BD" })
        const freshEvent = one("mantle.party.communication.CommunicationEvent", { communicationEventId: fresh.json.communicationEventIdList[0] })
        const freshRows = list("mantle.party.communication.CommunicationEventParty", { communicationEventId: fresh.json.communicationEventIdList[0] })
        const posted = post("send", { fromValue: "internal", toJson: chips(["list:BOSS_DEMO_MBX_OFFICE"]), subject: "Parking", body: "<p>The garage is open.</p>" })
        const postEvent = one("mantle.party.communication.CommunicationEvent", { communicationEventId: posted.json.communicationEventIdList[0] })
        const replied = post("send", { fromValue: "internal", parentCommEventId: "BOSS_DEMO_MAIL_IM3", toJson: chips(["party:ORG_ZIZI_JD"]), subject: "Re: x", body: "<p>Done</p>" })
        const replyEvent = one("mantle.party.communication.CommunicationEvent", { communicationEventId: replied.json.communicationEventIdList[0] })
        const toSender = post("send", { fromValue: "internal", parentCommEventId: "BOSS_DEMO_MAIL_POST2", replyToSenderOnly: "true", toJson: chips(["party:ORG_ZIZI_JD"]),
            subject: "Re: The office is closed on Monday", body: "<p>Yes, the garage too.</p>" })
        const senderEvent = one("mantle.party.communication.CommunicationEvent", { communicationEventId: toSender.json.communicationEventIdList[0] })
        const inMailbox = post("send", { fromValue: "internal", parentCommEventId: "BOSS_DEMO_MAIL_POST2", toJson: chips(["list:BOSS_DEMO_MBX_OFFICE"]),
            subject: "Re: The office is closed on Monday", body: "<p>It is closed too.</p>" })
        const mailboxReply = one("mantle.party.communication.CommunicationEvent", { communicationEventId: inMailbox.json.communicationEventIdList[0] })
        const undo = post("cancelSend", { communicationEventIdsJson: JSON.stringify(fresh.json.communicationEventIdList) })
        const afterUndo = one("mantle.party.communication.CommunicationEvent", { communicationEventId: fresh.json.communicationEventIdList[0] })
        const foreignFile = post("send", { fromValue: "internal", toJson: chips(["party:ORG_ZIZI_JD"]), subject: "x", body: "<p>x</p>",
            uploadsJson: JSON.stringify([{ location: "dbresource://ironstone/compose/ORG_ZIZI_JD/abc/secret.txt", name: "secret.txt" }]) })
        return { fresh, freshEvent, freshRows, posted, postEvent, replied, replyEvent, toSender, senderEvent, inMailbox, mailboxReply, undo, afterUndo, foreignFile }
    },
    then(v) {
        v.fresh.status == 200
        v.fresh.json.mode == "internal"
        // the from party is the user's, whatever the request said
        v.freshEvent.fromPartyId == "EX_JOHN_DOE"
        v.freshEvent.contentType == "text/html"
        v.freshRows.some((row) => row.partyId == "ORG_ZIZI_JD" && row.roleTypeId == "MessageTo")
        v.freshRows.some((row) => row.partyId == "ORG_ZIZI_BD" && row.roleTypeId == "MessageCc")
        v.postEvent.contactListId == "BOSS_DEMO_MBX_OFFICE"
        v.postEvent.fromPartyId == "EX_JOHN_DOE"
        v.replyEvent.parentCommEventId == "BOSS_DEMO_MAIL_IM3"
        v.replyEvent.rootCommEventId == "BOSS_DEMO_MAIL_IM1"
        v.replyEvent.toPartyId == "ORG_ZIZI_JD"
        v.senderEvent.contactListId == null
        v.senderEvent.toPartyId == "ORG_ZIZI_JD"
        v.mailboxReply.contactListId == "BOSS_DEMO_MBX_OFFICE"
        v.undo.json.statusId == "CeCancelled"
        v.afterUndo.statusId == "CeCancelled"
        v.foreignFile.errors.includes("Attachment not found")
    },
})

feature("text blocks for the picker", {
    when() {
        sys(() => call(`${MAIL}.create#EmailTextBlock`, { title: "Thanks for your order", shortcut: "thx", bodyHtml: "<p>Thank you for your order!</p>" }))
        return { all: get("textBlocks", {}), some: get("textBlocks", { searchText: "thx" }) }
    },
    then({ all, some }) {
        all.json.textBlockList.some((block) => block.title == "Thanks for your order")
        some.json.textBlockList.length >= 1
    },
})

feature("another user may not send as john.doe: not from his identity, not his draft, not his internal message's Undo", {
    when() {
        const draft = post("saveDraft", { fromValue: identityValue, toJson: chips(["ada@math.example"]), subject: "Mine", body: "<p>Mine</p>" })
        const internal = post("send", { fromValue: "internal", toJson: chips(["party:ORG_ZIZI_BD"]), subject: "Mine too", body: "<p>x</p>" })
        login("joe.developer")
        try {
            return {
                identities: get("composeData", {}),
                send: post("send", { fromValue: identityValue, toJson: chips(["ada@math.example"]), subject: "Spoof", body: "<p>x</p>", holdSeconds: "0" }),
                discard: post("discard", { emailMessageId: draft.json.emailMessageId }),
                undo: post("cancelSend", { communicationEventIdsJson: JSON.stringify(internal.json.communicationEventIdList) }),
                privatePost: get("composeData", { contactListId: "BOSS_DEMO_MBX_LEAD" }),
                draftId: draft.json.emailMessageId,
            }
        } finally { login("john.doe") }
    },
    then(v) {
        !v.identities.json.compose.identityList.some((item) => item.value == identityValue)
        // his identity is one check for a send, a save and a send of a draft; another user's draft or message is not found
        v.send.errors.includes("Choose a mail account to send from")
        v.discard.errors.includes("not found")
        v.undo.errors.includes("not found")
        // Joe asked to join Leadership, so he sees its header, but he may not post yet
        v.privatePost.errors.includes("You may not post to mailbox Leadership")
        one("moqui.basic.email.EmailMessage", { emailMessageId: v.draftId }).statusId == "ES_DRAFT"
    },
})

feature("quick create's Email loads the composer in its one client mode, qvue, which reads its query from mScreen", {
    when() {
        const parameters = { recordEntity: "mantle.request.Request", recordId: "BOSS_DEMO_REQUEST", recordTitle: "Set up the shared team calendar", lastStandalone: "-2" }
        const str = ec.screen.makeTest().rootScreen(comms).renderMode("qvue").render("Inbox/Compose", parameters, null)
        const qvt = ec.screen.makeTest().rootScreen(comms).renderMode("qvt").withStaticData().render("Inbox/Compose", parameters, null)
        ec.message.clearErrors()
        return { output: String(str.output || ""), errors: str.errorMessages.join(" | "), qvtStatus: qvt.status }
    },
    then({ output, errors, qvtStatus }) {
        errors == ""
        output.includes("module.exports")
        output.includes("MailCompose")
        output.includes("mScreen.parameters")
        !output.includes("curUrl")
        qvtStatus != 200
    },
})
