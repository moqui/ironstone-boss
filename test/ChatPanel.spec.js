// The tray's Chat tab (screen/Comms/Panel/Chat.xml and ChatPanel.qvue; impl-drawers-commons.md M10, design-drawers-commons.md
// §4 ChatPanel): the shell names it without an extension (STRT_TRAY_CHAT Comms/Panel/Chat) and the + menu's Chat message opens
// it, each loading it in its best client mode, qvue, its only one; it answers its component, which refreshes in place when the
// tray asks (shellRefresh) and loads the room view from Comms/Chat (chat-room); the light room list it asks
// for (chatData with a limit) has john.doe's rooms with their counts; New message finds the direct room there is or makes
// one; Mark all read clears every count. On the chat demo (data/BossChatDemoData.xml), loaded again here.
// Run: ./moq test mr-boss --spec ChatPanel
const webroot = "component://webroot/screen/webroot.xml"
const comms = "component://mr-boss/screen/Comms.xml"

function transition(name, parameters, method) {
    const str = ec.screen.makeTest().rootScreen(comms).render(`Chat/${name}`, parameters || {}, method || null)
    let json = null
    try { json = JSON.parse(str.output) } catch (err) { json = null }
    ec.message.clearErrors()
    return { status: str.status, errors: str.errorMessages.join(" | "), json: json || {} }
}
function sys(run) {
    const wasDisabled = ec.artifactExecution.disableAuthz()
    try { return run() } finally { if (!wasDisabled) ec.artifactExecution.enableAuthz() }
}
const roomOf = (answer, id) => (answer.json.roomList || []).find((room) => room.chatRoomId === id) || null

spec({
    setupSpec() {
        login("john.doe")
        sys(() => call("ironstone.comms.ChatDemoServices.load#ChatDemo", {}))
    },
})

feature("the shell names the tab and the + menu kind without an extension; the screen answers its component, in qvue only", {
    when() {
        const str = ec.screen.makeTest().rootScreen(webroot).render("shellData", {}, null)
        let shell = null
        try { shell = JSON.parse(str.output) } catch (err) { shell = null }
        const comp = ec.screen.makeTest().rootScreen(comms).renderMode("qvue").render("Panel/Chat", { lastStandalone: "-2" }, null)
        const qvt = ec.screen.makeTest().rootScreen(comms).renderMode("qvt").withStaticData().render("Panel/Chat", { lastStandalone: "-2" }, null)
        ec.message.clearErrors()
        const commsApp = ((shell || {}).apps || []).find((app) => app.name === "Comms") || {}
        return { trayChat: shell && shell.shell ? shell.shell.trayChat : null,
            kind: ((commsApp.providers || {}).quickCreate || []).find((item) => item.kind === "chatMessage") || {},
            comp: { status: comp.status, output: String(comp.output || "") }, qvt: { status: qvt.status } }
    },
    then({ trayChat, kind, comp, qvt }) {
        trayChat == "/qapps/Comms/Panel/Chat"
        kind.url == "/qapps/Comms/Panel/Chat"
        comp.status == 200
        comp.output.includes("ChatPanel")
        // the room view is Comms/Chat's, loaded when a room opens
        comp.output.includes("this.base + '.qvue'")
        !comp.output.includes("Placeholder:")
        // the tray's refresh keeps an open room: the component refreshes its rooms itself
        comp.output.includes("shellRefresh()")
        !comp.output.includes("containerReload")
        qvt.status != 200
    },
})

feature("the light room list has john's rooms with their counts; New message finds the direct room or makes one; Mark all read", {
    when() {
        const light = transition("chatData", { limit: 3 })
        const full = transition("chatData", { limit: 40 })
        const existing = transition("createDirect", { userIds: "ORG_ZIZI_JD" }, "post")
        const view = transition("roomView", { chatRoomId: existing.json.chatRoomId, limit: 30 })
        const all = transition("markAllRead", {}, "post")
        return { light, full, existing, view, all, after: transition("chatData", { limit: 40 }) }
    },
    then({ light, full, existing, view, all, after }) {
        light.status == 200
        light.json.roomList.length == 3
        roomOf(full, "BOSS_DEMO_CHAT_TEAM").mentionCount == 1
        roomOf(full, "BOSS_DEMO_CHAT_JOE").unreadCount == 2
        full.json.unreadTotal >= 4
        existing.json.chatRoomId == "BOSS_DEMO_CHAT_JOE"
        existing.json.created == false
        view.json.room.displayName == "Joe Developer"
        view.json.timeline.eventList.length >= 7
        all.json.roomCount >= 2
        after.json.unreadTotal == 0
        after.json.roomList.every((room) => room.unreadCount === 0)
    },
})
