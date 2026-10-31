// Comms Chat (screen/Comms/Chat.xml and Chat.qvue, service/ironstone/comms/ChatServices.xml over org.moqui.impl.ChatServices;
// impl-drawers-commons.md M10, design-drawers-commons.md §13): the JSON transitions the screen calls under the Comms app root,
// as john.doe, on the chat demo (data/BossChatDemoData.xml, ChatDemoServices.load#ChatDemo, loaded again here). The rail with
// its records, unread and mention counts; a room with its members and first page; the timeline pages (before, after,
// around, a thread, the pinned messages); send, edit, react, pin and delete, a reply and a thread reply, a mention that
// notifies with the room's link; a message's /qapps link as its record card; read markers; files up and down; direct
// messages once per set of people, new rooms with the default notification level, join, leave, members, roles and the
// room's settings; a record's room through STRT_RECORD_VISIBLE_SERVICE (made on first use, read and joined by those who may
// see the record); a task or request made from a message and a message filed on a record (Mantle's chat services), the
// record's Chatter with its room's messages; the mention list (with @room), search and the palette's rooms; a send tried
// again with its clientRef, one event by its eventSeq; a room's files and threads; a forward; a poll; a sender removing
// link previews; read receipts off by preference. Joe Developer reads none of john.doe's private rooms nor their files,
// writes in them or forwards their messages. Authorization stays on, as for a browser request. john's link previews are off here,
// so a link in a message reaches no page (the framework's chat_tests.rs tests the previews with a stub of the pages).
// Run: ./moq test mr-boss --spec Chat
const comms = "component://mr-boss/screen/Comms.xml"
const JOHN = "EX_JOHN_DOE", JOE = "ORG_ZIZI_JD", BOB = "ORG_ZIZI_BD"
const ROOM = { joe: "BOSS_DEMO_CHAT_JOE", bob: "BOSS_DEMO_CHAT_BOB", general: "BOSS_DEMO_CHAT_GENERAL", team: "BOSS_DEMO_CHAT_TEAM",
    leads: "BOSS_DEMO_CHAT_LEADS", request: "BOSS_DEMO_CHAT_REQUEST", random: "BOSS_DEMO_CHAT_RANDOM" }
const made = {}

function transition(name, parameters, method) {
    const str = ec.screen.makeTest().rootScreen(comms).render(`Chat/${name}`, parameters || {}, method || null)
    let json = null
    try { json = JSON.parse(str.output) } catch (err) { json = null }
    const errors = [str.errorMessages.join(" | "), json && !Array.isArray(json) && json.errors ? String(json.errors) : ""].filter((text) => text).join(" | ")
    ec.message.clearErrors()
    return { status: str.status, errors, json: json || {}, output: String(str.output || "") }
}
const get = (name, parameters) => transition(name, parameters, null)
const post = (name, parameters) => transition(name, parameters, "post")
function sys(run) {
    const wasDisabled = ec.artifactExecution.disableAuthz()
    try { return run() } finally { if (!wasDisabled) ec.artifactExecution.enableAuthz() }
}
function as(username, run) {
    login(username)
    try { return run() } finally { login("john.doe") }
}
const one = (entityName, fields) => sys(() => ec.entity.find(entityName).condition(fields).one())
const list = (entityName, fields) => sys(() => Array.from(ec.entity.find(entityName).condition(fields).list()))
const roomOf = (answer, id) => (answer.json.roomList || []).find((room) => room.chatRoomId === id) || null
const messages = (page) => (page.eventList || []).filter((event) => event.type === "message")
const texts = (page) => messages(page).filter((event) => !event.redacted).map((event) => event.bodyText)
const seqs = (page) => (page.eventList || []).map((event) => event.eventSeq)
const anyOf = (items, test) => (items || []).some(test)
const allOf = (items, test) => (items || []).every(test)

spec({
    setupSpec() {
        login("john.doe")
        // the demo again, so this spec sees its rooms as loaded whatever ran before
        sys(() => call("ironstone.comms.ChatDemoServices.load#ChatDemo", {}))
        ec.user.setPreference("CHAT_LINK_PREVIEWS", "N")
    },
    cleanupSpec() {
        as("joe.developer", () => ec.user.setPreference("CHAT_READ_RECEIPTS", ""))
        login("john.doe")
        ec.user.setPreference("CHAT_NOTIFY_DEFAULT", "")
        ec.user.setPreference("CHAT_LINK_PREVIEWS", "")
    },
})

feature("the rail: john's rooms with their records, pinned first, with unread and mention counts", {
    when() { return { data: get("chatData"), browse: get("rooms", { joinableOnly: "true" }) } },
    then({ data, browse }) {
        data.status == 200
        data.errors == ""
        data.json.me.userId == JOHN
        data.json.prefs.enterSends == true
        data.json.prefs.statusPresets.length >= 1
        ["joe", "bob", "general", "team", "leads", "request"].every((key) => roomOf(data, ROOM[key]) != null)
        roomOf(data, ROOM.random) == null
        // Team is pinned for john
        data.json.roomList[0].chatRoomId == ROOM.team
        roomOf(data, ROOM.team).isPinned
        roomOf(data, ROOM.team).unreadCount == 2
        roomOf(data, ROOM.team).mentionCount == 1
        roomOf(data, ROOM.joe).unreadCount == 2
        roomOf(data, ROOM.joe).displayName == "Joe Developer"
        roomOf(data, ROOM.joe).otherUserId == JOE
        roomOf(data, ROOM.joe).lastMessage.snippet == "Bob cannot make it on Friday."
        roomOf(data, ROOM.bob).unreadCount == 0
        roomOf(data, ROOM.request).record.title == "Set up the shared team calendar"
        roomOf(data, ROOM.request).record.url.includes("RequestDetail?requestId=BOSS_DEMO_REQUEST")
        roomOf(data, ROOM.request).url == "/qapps/Comms/Chat?chatRoomId=BOSS_DEMO_CHAT_REQUEST"
        data.json.unreadTotal >= 4
        // Browse rooms: the public rooms john is not in
        anyOf(browse.json.roomList, (room) => room.chatRoomId === ROOM.random && room.isMember === false)
        !anyOf(browse.json.roomList, (room) => room.chatRoomId === ROOM.general)
    },
})

feature("a room opens with its members and its latest page: the picture, john's reaction, the edited reply", {
    when() { return get("roomView", { chatRoomId: ROOM.joe }) },
    then({ status, errors, json }) {
        status == 200
        errors == ""
        json.room.displayName == "Joe Developer"
        json.room.otherUserId == JOE
        json.access.canPost
        json.member.lastReadEventSeq == 7
        json.memberList.map((member) => member.userId).sort() == [JOHN, JOE]
        messages(json.timeline).length == 7
        messages(json.timeline).find((event) => event.attachments.length).attachments[0].fileName == "floor-plan.png"
        messages(json.timeline).find((event) => event.attachments.length).reactions[0].key == "👍"
        messages(json.timeline).find((event) => event.attachments.length).reactions[0].mine
        messages(json.timeline).find((event) => event.replyTo).edited
        messages(json.timeline).find((event) => event.replyTo).body.includes("by the back wall")
        messages(json.timeline).find((event) => event.replyTo).replyTo.snippet.includes("Where does the printer go")
        json.timeline.userNames[JOE] == "Joe Developer"
        json.timeline.hasMoreBefore == false
    },
})

feature("the timeline pages: before, after and around an event, a thread, the pinned messages", {
    when() {
        const latest = get("timeline", { chatRoomId: ROOM.joe, limit: 3 }).json
        return {
            latest, before: get("timeline", { chatRoomId: ROOM.joe, beforeSeq: latest.eventList[0].eventSeq, limit: 3 }).json,
            after: get("timeline", { chatRoomId: ROOM.joe, afterSeq: 2, limit: 2 }).json,
            around: get("timeline", { chatRoomId: ROOM.joe, aroundSeq: 5, limit: 4 }).json,
            general: get("timeline", { chatRoomId: ROOM.general }).json,
            thread: get("timeline", { chatRoomId: ROOM.general, threadRootEventSeq: 4 }).json,
            pinned: get("timeline", { chatRoomId: ROOM.general, pinnedOnly: "true" }).json,
        }
    },
    then({ latest, before, after, around, general, thread, pinned }) {
        latest.eventList.length == 3
        latest.hasMoreBefore
        texts(latest)[texts(latest).length - 1] == "Bob cannot make it on Friday."
        before.eventList.length == 3
        before.eventList.every((event) => event.eventSeq < latest.eventList[0].eventSeq)
        // the reaction (4) is not a row of the timeline
        seqs(after) == [3, 5]
        after.hasMoreAfter
        seqs(around).includes(5)
        // the thread's replies are not in the main timeline; the root counts them
        texts(general).includes("The office is closed on Monday for the holiday.")
        !texts(general).includes("Yes, everything is closed.")
        general.eventList.find((event) => event.eventSeq === 4).threadReplyCount == 2
        general.eventList.some((event) => event.type === "pin")
        general.eventList.some((event) => event.type === "system" && event.content.action === "created")
        general.eventList.find((event) => event.bodyText && event.bodyText.includes("coffee")).reactions[0].count == 2
        texts(thread) == ["The office is closed on Monday for the holiday.", "Does that include the warehouse?", "Yes, everything is closed."]
        thread.userNames[BOB] == "Bob Developer"
        texts(pinned).length == 1
        texts(pinned)[0].includes("Welcome to the team chat")
    },
})

feature("send, edit, react, pin and delete; a reply, a thread reply, and a mention that notifies with the room's link", {
    when() {
        const sent = post("send", { chatRoomId: ROOM.team, clientRef: "spec-1",
            body: '<p>Lunch on Thursday works, <span data-mention-id="ORG_ZIZI_JD">@Joe Developer</span>.</p>' })
        const seq = sent.json.eventSeq
        const notified = list("moqui.security.user.NotificationMessageByUser", { userId: JOE, topic: "ChatMention" })
                .filter((row) => String(row.linkText || "").includes("chatRoomId=BOSS_DEMO_CHAT_TEAM"))
        const mentionRows = list("moqui.chat.ChatEventMention", { chatRoomId: ROOM.team, eventSeq: seq }).length
        const edited = post("edit", { chatRoomId: ROOM.team, eventSeq: seq, body: "<p>Lunch on Thursday works for me.</p>" })
        const reacted = post("react", { chatRoomId: ROOM.team, eventSeq: seq, key: "👍" })
        const unreacted = post("react", { chatRoomId: ROOM.team, eventSeq: seq, key: "👍" })
        post("react", { chatRoomId: ROOM.team, eventSeq: seq, key: "🎉" })
        const pinned = post("pin", { chatRoomId: ROOM.team, eventSeq: seq })
        const wrong = post("send", { chatRoomId: ROOM.team, body: "<p>Wrong room, sorry</p>" })
        const redacted = post("redact", { chatRoomId: ROOM.team, eventSeq: wrong.json.eventSeq })
        const reply = post("send", { chatRoomId: ROOM.team, body: "<p>Thursday it is</p>", replyToEventSeq: 4 })
        const threaded = post("send", { chatRoomId: ROOM.team, body: "<p>Booked a table for four</p>", threadRootEventSeq: 4 })
        made.teamSeq = seq
        return { sent, seq, notified, mentionRows, edited, reacted, unreacted, pinned, redacted, reply, threaded, wrongSeq: wrong.json.eventSeq,
            mentionsAfterEdit: list("moqui.chat.ChatEventMention", { chatRoomId: ROOM.team, eventSeq: seq }).length,
            page: get("timeline", { chatRoomId: ROOM.team, limit: 50 }).json }
    },
    then(v) {
        v.sent.status == 200
        v.sent.errors == ""
        v.sent.json.clientRef == "spec-1"
        v.sent.json.event.mentions == [JOE]
        v.mentionRows == 1
        v.notified.length >= 1
        v.edited.errors == ""
        v.reacted.json.added == true
        v.unreacted.json.added == false
        v.pinned.errors == ""
        v.redacted.errors == ""
        // the edit took the mention out
        v.mentionsAfterEdit == 0
        v.page.eventList.find((event) => event.eventSeq === v.seq).edited
        v.page.eventList.find((event) => event.eventSeq === v.seq).bodyText == "Lunch on Thursday works for me."
        v.page.eventList.find((event) => event.eventSeq === v.seq).reactions.map((reaction) => reaction.key) == ["🎉"]
        v.page.eventList.find((event) => event.eventSeq === v.seq).pinned
        v.page.eventList.find((event) => event.eventSeq === v.wrongSeq).redacted
        v.page.eventList.find((event) => event.eventSeq === v.wrongSeq).removedLabel == "Message removed"
        v.page.eventList.find((event) => event.eventSeq === v.reply.json.eventSeq).replyTo.senderName == "Bob Developer"
        v.page.eventList.find((event) => event.eventSeq === 4).threadReplyCount == 1
        v.threaded.json.event.threadRootEventSeq == 4
    },
})

feature("a message's /qapps link is its record card", {
    when() {
        const sent = post("send", { chatRoomId: ROOM.team,
            body: '<p>See <a href="/qapps/Commons/Tasks/TaskDetail?workEffortId=BOSS_DEMO_TASK">the task</a> and <a href="https://example.com/a?orderId=X">this</a>.</p>' })
        return { sent, card: get("recordCard", { recordEntity: "mantle.work.effort.WorkEffort", recordId: "BOSS_DEMO_TASK" }) }
    },
    then({ sent, card }) {
        sent.errors == ""
        sent.json.event.records == [{ entity: "mantle.work.effort.WorkEffort", id: "BOSS_DEMO_TASK" }]
        card.json.title == "Review the open support requests"
        card.json.url == "/qapps/Commons/Tasks/TaskDetail?workEffortId=BOSS_DEMO_TASK"
    },
})

feature("read markers: mark read clears a room's count, mark unread from a message brings it back, mark all read clears all", {
    when() {
        const read = post("markRead", { chatRoomId: ROOM.joe })
        const afterRead = roomOf(get("chatData"), ROOM.joe).unreadCount
        const unread = post("markRead", { chatRoomId: ROOM.joe, eventSeq: 8, markUnread: "true" })
        const afterUnread = roomOf(get("chatData"), ROOM.joe).unreadCount
        const all = post("markAllRead", {})
        return { read, afterRead, unread, afterUnread, all, data: get("chatData") }
    },
    then({ read, afterRead, unread, afterUnread, all, data }) {
        read.json.lastReadEventSeq == 9
        afterRead == 0
        unread.json.lastReadEventSeq == 7
        afterUnread == 2
        all.json.roomCount >= 1
        data.json.unreadTotal == 0
        data.json.mentionTotal == 0
    },
})

feature("a file goes up, goes with a message and comes back as a download; a picture inline", {
    when() {
        const up = post("upload", { chatRoomId: ROOM.team, file: uploadedFile("agenda.txt", "1. Lunch\n2. Floor plan") })
        const id = (up.json.uploadList || [])[0] ? up.json.uploadList[0].chatAttachmentId : null
        const sent = post("send", { chatRoomId: ROOM.team, chatAttachmentIds: id })
        const down = ec.screen.makeTest().rootScreen(comms).render("Chat/attachment", { chatAttachmentId: id }, null)
        const picture = ec.screen.makeTest().rootScreen(comms).render("Chat/attachment", { chatAttachmentId: "BOSS_DEMO_CHAT_A_PLAN", inline: "true" }, null)
        const noFile = post("upload", { chatRoomId: ROOM.team })
        ec.message.clearErrors()
        return { up, id, sent, down: { status: down.status, output: String(down.output || "") }, picture: { status: picture.status }, noFile,
            row: one("moqui.chat.ChatAttachment", { chatAttachmentId: id }) }
    },
    allowMessageErrors: true,
    then({ up, id, sent, down, picture, noFile, row }) {
        up.errors == ""
        up.json.uploadList[0].fileName == "agenda.txt"
        up.json.failedList == []
        id != null
        sent.json.event.attachments[0].fileName == "agenda.txt"
        row.eventSeq == sent.json.eventSeq
        row.location.startsWith("dbresource://chat/BOSS_DEMO_CHAT_TEAM/")
        down.status == 200
        down.output.includes("2. Floor plan")
        picture.status == 200
        noFile.errors.includes("No file uploaded")
    },
})

feature("rooms: one direct room per set of people, a new room with the default level, members, roles, settings, join and leave", {
    when() {
        const direct = post("createDirect", { userIds: BOB })
        const group = post("createDirect", { userIds: `${JOE},${BOB}` })
        const groupAgain = post("createDirect", { userIds: `${BOB},${JOE}` })
        ec.user.setPreference("CHAT_NOTIFY_DEFAULT", "mentions")
        const room = post("createRoom", { roomTypeEnumId: "private", roomName: "BOSS test spec room", topic: "Spec", memberUserIds: JOE })
        const id = room.json.chatRoomId
        made.room = id
        const level = one("moqui.chat.ChatRoomMember", { chatRoomId: id, userId: JOHN }).notificationLevelEnumId
        const added = post("addMembers", { chatRoomId: id, userIds: BOB })
        const role = post("setRole", { chatRoomId: id, userId: BOB, roleEnumId: "CmrModerator" })
        const removed = post("removeMember", { chatRoomId: id, userId: JOE })
        const renamed = post("updateRoom", { chatRoomId: id, roomName: "BOSS test spec room 2", topic: "Renamed" })
        const pinned = post("setNotification", { chatRoomId: id, isPinned: "true", notificationLevelEnumId: "all" })
        const view = get("room", { chatRoomId: id })
        const archived = post("updateRoom", { chatRoomId: id, archived: "true" })
        const archivedSend = post("send", { chatRoomId: id, body: "<p>Too late</p>" })
        const joined = post("join", { chatRoomId: ROOM.random })
        const inRandom = one("moqui.chat.ChatRoomMember", { chatRoomId: ROOM.random, userId: JOHN })
        const left = post("leave", { chatRoomId: ROOM.random })
        const afterLeave = one("moqui.chat.ChatRoomMember", { chatRoomId: ROOM.random, userId: JOHN })
        ec.user.setPreference("CHAT_NOTIFY_DEFAULT", "")
        return { direct, group, groupAgain, room, level, added, role, removed, renamed, pinned, view, archived, archivedSend, joined, inRandom, left, afterLeave }
    },
    then(v) {
        v.direct.json.chatRoomId == ROOM.bob
        v.direct.json.created == false
        v.group.errors == ""
        v.groupAgain.json.chatRoomId == v.group.json.chatRoomId
        v.groupAgain.json.created == false
        v.room.json.created == true
        // the user's default level on a room made here
        v.level == "CnlMentions"
        v.added.json.addedUserIdList == [BOB]
        v.role.errors == ""
        v.removed.errors == ""
        v.view.json.room.roomName == "BOSS test spec room 2"
        v.view.json.room.topic == "Renamed"
        v.view.json.member.isPinned
        v.view.json.member.notificationLevelEnumId == "CnlAll"
        v.view.json.memberList.map((member) => member.userId + ":" + member.roleEnumId).sort() == [`${JOHN}:CmrOwner`, `${BOB}:CmrModerator`]
        v.archived.errors == ""
        v.archivedSend.errors.includes("archived")
        v.joined.errors == ""
        v.inRandom != null
        v.inRandom.leftDate == null
        v.left.errors == ""
        v.afterLeave.leftDate != null
    },
})

feature("a record's room through STRT_RECORD_VISIBLE_SERVICE: the one there is, or one made on first use, read and joined by those who see the record", {
    when() {
        const existing = post("recordRoom", { recordEntity: "mantle.request.Request", recordId: "BOSS_DEMO_REQUEST" })
        const task = post("recordRoom", { recordEntity: "mantle.work.effort.WorkEffort", recordId: "BOSS_DEMO_TODAY_DUE" })
        const taskAgain = post("recordRoom", { recordEntity: "mantle.work.effort.WorkEffort", recordId: "BOSS_DEMO_TODAY_DUE" })
        made.taskRoom = task.json.chatRoomId
        const joe = as("joe.developer", () => ({
            taskView: get("roomView", { chatRoomId: made.taskRoom }),
            taskJoin: post("join", { chatRoomId: made.taskRoom }),
            taskSend: post("send", { chatRoomId: made.taskRoom, body: "<p>I am on it too</p>" }),
            requestView: get("roomView", { chatRoomId: ROOM.request }),
            requestRoom: post("recordRoom", { recordEntity: "mantle.request.Request", recordId: "BOSS_DEMO_REQUEST" }),
        }))
        return { existing, task, taskAgain, joe,
            theme: one("moqui.screen.ScreenThemeResource", { screenThemeId: "DEFAULT_QUASAR", resourceTypeEnumId: "STRT_RECORD_VISIBLE_SERVICE" }),
            row: one("moqui.chat.ChatRoom", { chatRoomId: made.taskRoom }) }
    },
    allowMessageErrors: true,
    then({ existing, task, taskAgain, joe, theme, row }) {
        theme.resourceValue == "mantle.party.CommunicationServices.get#RecordLinkInfo"
        existing.json.chatRoomId == ROOM.request
        existing.json.created == false
        task.errors == ""
        task.json.chatRoomId != null
        taskAgain.json.chatRoomId == task.json.chatRoomId
        taskAgain.json.created == false
        row.roomTypeEnumId == "CrtRecord"
        row.recordId == "BOSS_DEMO_TODAY_DUE"
        row.roomName == "Compare the calendar options for the team"
        // Joe is on the task: he reads its room without being in it, and joins
        joe.taskView.errors == ""
        joe.taskView.json.access.isMember == false
        joe.taskView.json.access.canJoin == true
        joe.taskJoin.errors == ""
        joe.taskSend.errors == ""
        // the demo request is not Joe's: its room is not found, and he makes no other
        joe.requestView.errors.includes("not found")
        joe.requestRoom.errors.includes("not found")
    },
})

feature("Joe Developer reads none of john's private rooms nor their files", {
    when() {
        return as("joe.developer", () => {
            const down = ec.screen.makeTest().rootScreen(comms).render("Chat/attachment", { chatAttachmentId: "BOSS_DEMO_CHAT_A_BUDGET" }, null)
            ec.message.clearErrors()
            return {
                // a room he is not in is not found, for a read, a file or a write alike: one of each
                view: get("roomView", { chatRoomId: ROOM.leads }),
                down: { status: down.status, output: String(down.output || ""), errors: down.errorMessages.join(" | ") },
                send: post("send", { chatRoomId: ROOM.leads, body: "<p>Hi</p>" }),
                mentions: get("mentionUsers", { chatRoomId: ROOM.leads, term: "" }), search: get("search", { searchText: "budget" }),
                rooms: get("chatData"), own: get("roomView", { chatRoomId: ROOM.joe }),
                forward: post("send", { chatRoomId: ROOM.joe, forwardOfChatRoomId: ROOM.leads, forwardOfEventSeq: 2 }),
            }
        })
    },
    allowMessageErrors: true,
    then(v) {
        v.view.errors.includes("not found")
        v.down.status != 200 || v.down.errors.includes("not found")
        !v.down.output.includes("Draft budget")
        v.send.errors.includes("not found")
        v.mentions.json == []
        !anyOf(v.search.json.eventList, (hit) => hit.chatRoomId === ROOM.leads)
        roomOf(v.rooms, ROOM.leads) == null
        roomOf(v.rooms, ROOM.joe) != null
        v.own.errors == ""
        v.forward.errors.includes("not found")
    },
})

feature("a task or request made from a message, the message filed on it and on the room's record; a message filed on a record", {
    when() {
        const task = post("createFrom", { chatRoomId: ROOM.request, eventSeq: 3, kind: "task" })
        const request = post("createFrom", { chatRoomId: ROOM.joe, eventSeq: 8, kind: "request" })
        const order = post("createFrom", { chatRoomId: ROOM.joe, eventSeq: 8, kind: "order" })
        const filed = post("fileOnRecord", { chatRoomId: ROOM.joe, eventSeq: 3, recordEntityName: "mantle.work.effort.WorkEffort", recordId: "BOSS_DEMO_TASK" })
        const filedEvent = filed.json.communicationEventId
        const records = get("searchRecords", { term: "BOSS_DEMO_TASK" })
        return { task, request, order, filed, records,
            taskRow: task.json.recordId ? one("mantle.work.effort.WorkEffort", { workEffortId: task.json.recordId }) : null,
            requestRow: request.json.recordId ? one("mantle.request.Request", { requestId: request.json.recordId }) : null,
            // a work effort's own join holds it
            filedLink: filedEvent ? list("mantle.work.effort.WorkEffortCommEvent", { communicationEventId: filedEvent, workEffortId: "BOSS_DEMO_TASK" }).length : 0 }
    },
    allowMessageErrors: true,
    then(v) {
        v.task.errors == ""
        v.task.json.recordEntityName == "mantle.work.effort.WorkEffort"
        v.taskRow.workEffortName == "I can test the room bookings tomorrow."
        // the room is the demo request's: the task is linked to it
        v.task.json.roomRecordLinked == true
        v.task.json.url == "/qapps/Commons/Tasks/TaskDetail?workEffortId=" + v.task.json.recordId
        v.task.json.messageInfos[0].link == v.task.json.url
        v.request.errors == ""
        v.requestRow.requestName == "Can we move the team lunch to Thursday?"
        v.order.errors.includes("Create a task, request or event")
        v.filed.errors == ""
        v.filedLink == 1
        anyOf(v.records.json, (option) => option.value === "mantle.work.effort.WorkEffort|BOSS_DEMO_TASK")
    },
})

feature("the demo request's Chatter shows its room's messages, each a link to the room at the message", {
    when() {
        const str = ec.screen.makeTest().rootScreen("component://mr-boss/screen/Commons.xml").render("Chatter/timeline",
            { recordEntity: "mantle.request.Request", recordId: "BOSS_DEMO_REQUEST" }, null)
        let json = null
        try { json = JSON.parse(str.output) } catch (err) { json = null }
        ec.message.clearErrors()
        return { status: str.status, entries: ((json || {}).entryList || []).filter((entry) => entry.kind === "chat") }
    },
    then({ status, entries }) {
        status == 200
        entries.length >= 2
        entries.some((entry) => entry.bodyHtml && entry.bodyHtml.includes("room bookings"))
        entries.every((entry) => entry.url.startsWith("/qapps/Comms/Chat?chatRoomId=BOSS_DEMO_CHAT_REQUEST&eventSeq="))
        entries.find((entry) => entry.bodyHtml.includes("room bookings")).authorName == "Bob Developer"
        entries[0].kindLabel == "Chat"
    },
})

feature("the mention list is a room's members, and anyone in a public room; search; the palette's rooms", {
    when() {
        return {
            team: get("mentionUsers", { chatRoomId: ROOM.team, term: "jo" }).json,
            leads: get("mentionUsers", { chatRoomId: ROOM.leads, term: "" }).json,
            general: get("mentionUsers", { chatRoomId: ROOM.general, term: "" }).json,
            users: get("searchUsers", { term: "developer" }).json,
            search: get("search", { searchText: "floor plan" }).json,
            inRoom: get("search", { searchText: "coffee", chatRoomId: ROOM.general }).json,
            // as the shell calls a palette source: for the user, without a service authorization of its own
            palette: sys(() => call("org.moqui.comms.ChatScreenServices.search#PaletteRooms", { text: "Gen", limit: 5 })),
            latest: sys(() => call("org.moqui.comms.ChatScreenServices.search#PaletteRooms", { text: "#", limit: 5 })),
        }
    },
    then(v) {
        v.team.map((user) => user.id) == [JOE]
        v.team[0].label == "Joe Developer"
        v.leads.map((user) => user.id) == ["@room", BOB]
        v.general.some((user) => user.id === JOE) && v.general.some((user) => user.id === BOB)
        !v.general.some((user) => user.id === JOHN)
        v.users.some((user) => user.value === JOE && user.label === "Joe Developer")
        !v.users.some((user) => user.value === JOHN)
        anyOf(v.search.eventList, (hit) => hit.chatRoomId === ROOM.joe)
        v.inRoom.total >= 1
        anyOf(v.inRoom.eventList, (hit) => hit.snippet.includes("coffee machine"))
        allOf(v.inRoom.eventList, (hit) => hit.chatRoomId === ROOM.general)
        v.palette.rows[0].title == "General"
        v.palette.rows[0].url == "/qapps/Comms/Chat?chatRoomId=BOSS_DEMO_CHAT_GENERAL"
        v.palette.moreUrl == "/qapps/Comms/Chat"
        v.latest.rows.length >= 1
    },
})

feature("a send tried again with its clientRef answers its first message; one event read by its eventSeq", {
    when() {
        const first = post("send", { chatRoomId: ROOM.team, clientRef: "spec-retry-1", body: "<p>Only once</p>" })
        const again = post("send", { chatRoomId: ROOM.team, clientRef: "spec-retry-1", body: "<p>Only once</p>" })
        const bad = post("send", { chatRoomId: ROOM.team, clientRef: "not a ref", body: "<p>Bad ref</p>" })
        return { first, again, bad, one: get("timeline", { chatRoomId: ROOM.team, eventSeq: first.json.eventSeq }).json,
            count: list("moqui.chat.ChatEvent", { chatRoomId: ROOM.team, clientRef: "spec-retry-1" }).length }
    },
    allowMessageErrors: true,
    then(v) {
        v.first.errors == ""
        v.first.json.duplicate == false
        v.again.errors == ""
        v.again.json.duplicate == true
        v.again.json.eventSeq == v.first.json.eventSeq
        v.count == 1
        v.bad.errors.includes("clientRef")
        v.one.eventList.length == 1
        v.one.eventList[0].bodyText == "Only once"
        v.one.eventList[0].clientRef == "spec-retry-1"
    },
})

feature("a room's files, newest first, the pictures alone; its threads, the latest reply first, and mine", {
    when() {
        const up = post("upload", { chatRoomId: ROOM.joe, file: uploadedFile("minutes.txt", "Lunch moved to Thursday") })
        const sent = post("send", { chatRoomId: ROOM.joe, chatAttachmentIds: up.json.uploadList[0].chatAttachmentId })
        const all = get("files", { chatRoomId: ROOM.joe }).json
        const pictures = get("files", { chatRoomId: ROOM.joe, contentTypePrefix: "image/" }).json
        const threads = get("threads", { chatRoomId: ROOM.general }).json
        const mineBefore = get("threads", { chatRoomId: ROOM.general, mine: "true" }).json
        const root = threads.threadList.length ? threads.threadList[0].eventSeq : null
        const reply = post("send", { chatRoomId: ROOM.general, threadRootEventSeq: root, body: "<p>Thanks for the heads up</p>" })
        return { sent, all, pictures, threads, mineBefore, root, reply, mineAfter: get("threads", { chatRoomId: ROOM.general, mine: "true" }).json,
            rootEvent: get("timeline", { chatRoomId: ROOM.general, eventSeq: root }).json }
    },
    then(v) {
        v.sent.errors == ""
        v.all.fileList[0].fileName == "minutes.txt"
        v.all.fileList[0].eventSeq == v.sent.json.eventSeq
        anyOf(v.all.fileList, (file) => file.fileName === "floor-plan.png")
        v.pictures.fileList.map((file) => file.fileName) == ["floor-plan.png"]
        v.threads.threadList[0].threadReplyCount == 2
        v.threads.threadList[0].threadLastUserName == "Bob Developer"
        !anyOf(v.mineBefore.threadList, (thread) => thread.eventSeq === v.root && thread.senderUserId !== JOHN)
        v.reply.errors == ""
        anyOf(v.mineAfter.threadList, (thread) => thread.eventSeq === v.root)
        v.rootEvent.eventList[0].threadLastEventSeq == v.reply.json.eventSeq
        v.rootEvent.eventList[0].threadLastUserId == JOHN
    },
})

feature("a forward: the server quotes the message, with its sender and none of its room, into a room of mine", {
    when() {
        const source = messages(get("timeline", { chatRoomId: ROOM.joe, limit: 50 }).json)
                .find((event) => event.bodyText === "Can we move the team lunch to Thursday?")
        const forwarded = post("send", { chatRoomId: ROOM.team, body: "<p>FYI</p>", forwardOfChatRoomId: ROOM.joe, forwardOfEventSeq: source.eventSeq })
        const rooms = get("forwardRooms", { term: "" })
        return { source, forwarded, rooms, shown: get("timeline", { chatRoomId: ROOM.team, eventSeq: forwarded.json.eventSeq }).json }
    },
    then(v) {
        v.forwarded.errors == ""
        v.shown.eventList[0].forwardOf.senderName == "Joe Developer"
        v.shown.eventList[0].forwardOf.bodyText == "Can we move the team lunch to Thursday?"
        !("chatRoomId" in v.shown.eventList[0].forwardOf)
        v.shown.eventList[0].body == "<p>FYI</p>"
        anyOf(v.rooms.json, (room) => room.value === ROOM.team)
        !anyOf(v.rooms.json, (room) => room.value === ROOM.random)
    },
})

feature("a poll: votes replace the voter's, and its creator closes it", {
    when() {
        const made = post("createPoll", { chatRoomId: ROOM.team, question: "Team lunch?", optionsJson: JSON.stringify(["Pizza", "Sushi", "Tacos"]) })
        const seq = made.json.eventSeq
        const voted = post("votePoll", { chatRoomId: ROOM.team, eventSeq: seq, optionIds: "2" })
        const joe = as("joe.developer", () => ({ vote: post("votePoll", { chatRoomId: ROOM.team, eventSeq: seq, optionIds: "2" }),
            close: post("closePoll", { chatRoomId: ROOM.team, eventSeq: seq }) }))
        const closed = post("closePoll", { chatRoomId: ROOM.team, eventSeq: seq })
        return { made, voted, joe, closed, shown: get("timeline", { chatRoomId: ROOM.team, eventSeq: seq }).json }
    },
    allowMessageErrors: true,
    then(v) {
        v.made.errors == ""
        v.made.json.event.poll.options.map((option) => option.text) == ["Pizza", "Sushi", "Tacos"]
        v.voted.json.poll.options[1].mine == true
        v.joe.vote.json.poll.options[1].voteCount == 2
        // the poll rules are the framework's (chat_tests.rs): one refusal shows they reach the screen
        v.joe.close.errors.includes("creator or a moderator")
        v.closed.json.poll.closed == true
        v.shown.eventList[0].poll.voterCount == 2
        v.shown.eventList[0].poll.options[1].voterIds.length == 2
        v.shown.eventList[0].poll.mine == [2]
    },
})

feature("the sender alone removes a message's link previews; read receipts off by preference show no marker", {
    when() {
        const sent = post("send", { chatRoomId: ROOM.joe, body: "<p>Notes at https://example.com/notes</p>" })
        const seq = sent.json.eventSeq
        const byJoe = as("joe.developer", () => {
            ec.user.setPreference("CHAT_READ_RECEIPTS", "N")
            return { remove: post("removePreviews", { chatRoomId: ROOM.joe, eventSeq: seq }), read: post("markRead", { chatRoomId: ROOM.joe }) }
        })
        const removed = post("removePreviews", { chatRoomId: ROOM.joe, eventSeq: seq })
        return { sent, byJoe, removed, row: one("moqui.chat.ChatEvent", { chatRoomId: ROOM.joe, eventSeq: seq }), view: get("roomView", { chatRoomId: ROOM.joe }).json }
    },
    allowMessageErrors: true,
    then(v) {
        v.sent.errors == ""
        v.byJoe.remove.errors.includes("Only the sender")
        v.byJoe.read.errors == ""
        v.removed.errors == ""
        v.row.linkPreviewJson == '{"removed":true}'
        v.view.memberList.find((member) => member.userId === JOE).lastReadEventSeq == null
        v.view.memberList.find((member) => member.userId === JOHN).lastReadEventSeq >= v.sent.json.eventSeq
    },
})

feature("the Chat screen answers its component in qvue, its one client mode (the shell loads it so); a .qvt is not found", {
    when() {
        const vue = ec.screen.makeTest().rootScreen(comms).renderMode("qvue").render("Chat", { lastStandalone: "-2" }, null)
        const qvt = ec.screen.makeTest().rootScreen(comms).renderMode("qvt").withStaticData().render("Chat", { lastStandalone: "-2" }, null)
        ec.message.clearErrors()
        return { vue: { status: vue.status, output: String(vue.output || "") }, qvt: { status: qvt.status, errors: qvt.errorMessages.join(" | ") } }
    },
    then({ vue, qvt }) {
        vue.status == 200
        vue.output.includes("module.exports")
        vue.output.includes("ChatRoom")
        qvt.status != 200
    },
})
