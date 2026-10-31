// Comms Settings, Chat (screen/Comms/Settings/Chat.xml; service/ironstone/comms/ChatServices.xml get#ChatPrefs, store#ChatPrefs,
// store#StatusPreset, use#StatusPreset, apply#NotifyDefault and apply#DndHours; impl-drawers-commons.md M10,
// design-drawers-commons.md §17 ChatSettings): the page renders john.doe's preferences; Save keeps the notification default,
// the message previews of notifications (CHAT_NOTIFY_PREVIEW, which the framework's notify#Mention reads), sounds, Enter,
// read receipts, typing and the away minutes (which the framework's presence reads); the do not disturb hours are both given
// or neither, and the job puts a user in them on do not disturb and back; the status presets are added, used (the user's
// status) and removed, kept as the JSON list the account menu's status dialog reads (WebrootChat.js statusPresets); Apply to
// my rooms sets the default level on every room but the direct ones.
// Run: ./moq test mr-boss --spec ChatSettings
const comms = "component://mr-boss/screen/Comms.xml"
const DND_USER = "BOSS_TEST_CHAT_DND"

function render(path, parameters, method) {
    const str = ec.screen.makeTest().rootScreen(comms).renderMode("qvt").withStaticData().render(path, Object.assign({ lastStandalone: "-2" }, parameters || {}), method || null)
    const output = String(str.output || "")
    ec.message.clearErrors()
    return { status: str.status, errors: str.errorMessages.join(" | "), output }
}
const post = (name, parameters) => render(`Settings/Chat/${name}`, parameters, "post")
function sys(run) {
    const wasDisabled = ec.artifactExecution.disableAuthz()
    try { return run() } finally { if (!wasDisabled) ec.artifactExecution.enableAuthz() }
}
const one = (entityName, fields) => sys(() => ec.entity.find(entityName).condition(fields).one())
const pref = (key) => ec.user.getPreference(key)
const utc = (millis) => new Date(millis).toISOString().slice(11, 16)
function setPref(userId, key, value) {
    sys(() => {
        const row = ec.entity.makeValue("moqui.security.UserPreference")
        row.setFields({ userId: userId, preferenceKey: key, preferenceValue: value }, true, null, null)
        row.createOrUpdate()
    })
}

spec({
    setupSpec() {
        login("john.doe")
        sys(() => call("ironstone.comms.ChatDemoServices.load#ChatDemo", {}))
        sys(() => {
            if (ec.entity.find("moqui.security.UserAccount").condition("userId", DND_USER).count() == 0) {
                const row = ec.entity.makeValue("moqui.security.UserAccount")
                row.setFields({ userId: DND_USER, username: "boss.test.chat.dnd", userFullName: "Dnd Spec", timeZone: "UTC" }, true, null, null)
                row.create()
            }
        })
    },
    cleanupSpec() {
        login("john.doe")
        for (const key of ["CHAT_NOTIFY_DEFAULT", "CHAT_NOTIFY_PREVIEW", "CHAT_DND_FROM", "CHAT_DND_TO", "CHAT_STATUS_PRESETS"]) ec.user.setPreference(key, "")
        ec.user.setPreference("CHAT_SOUNDS", "Y")
        ec.user.setPreference("CHAT_ENTER_SENDS", "Y")
        ec.user.setPreference("CHAT_LINK_PREVIEWS", "Y")
        sys(() => ec.entity.find("moqui.security.UserPreference").condition("userId", DND_USER).deleteAll())
    },
})

feature("the page renders the preferences, the do not disturb hours and the status presets", {
    when() { return render("Settings/Chat") },
    then({ status, errors, output }) {
        status == 200
        errors == ""
        output.includes("Notifications and composing")
        output.includes("Do not disturb hours")
        output.includes("Status presets")
        output.includes("In a meeting")
        output.includes("Show message previews in notifications")
        output.includes("Show a preview of the links I send")
    },
})

feature("Save keeps the preferences, which get#ChatPrefs and the Chat screens read", {
    when() {
        const before = sys(() => call("org.moqui.comms.ChatScreenServices.get#ChatPrefs", {})).prefs.notifyPreview
        const saved = post("savePreferences", { notifyDefault: "mentions", notifyPreview: "", sounds: "", enterSends: "N", readReceipts: "Y", typing: "", linkPreviews: "",
            autoAwayMinutes: "15" })
        const preview = pref("CHAT_NOTIFY_PREVIEW")
        const bad = post("savePreferences", { notifyDefault: "loud", autoAwayMinutes: "15" })
        return { before, saved, preview, bad, prefs: sys(() => call("org.moqui.comms.ChatScreenServices.get#ChatPrefs", {})).prefs, away: pref("CHAT_AUTO_AWAY_MINUTES"),
            presence: sys(() => call("org.moqui.impl.ChatServices.get#UserStatuses", { userIdList: ["EX_JOHN_DOE"] })).myStatus }
    },
    allowMessageErrors: true,
    then({ before, saved, preview, bad, prefs, away, presence }) {
        before == true
        saved.errors == ""
        preview == "N"
        prefs.notifyPreview == false
        prefs.notifyDefault == "mentions"
        prefs.sounds == false
        prefs.enterSends == false
        prefs.readReceipts == true
        prefs.typing == false
        prefs.linkPreviews == false
        prefs.autoAwayMinutes == 15
        away == "15"
        presence.autoAwayMinutes == 15
        bad.errors.includes("Choose all, mentions or nothing")
    },
})

feature("Apply to my rooms puts the default level on every room but the direct ones", {
    when() {
        ec.user.setPreference("CHAT_NOTIFY_DEFAULT", "none")
        const applied = post("applyNotifyDefault", {})
        const level = (chatRoomId) => one("moqui.chat.ChatRoomMember", { chatRoomId, userId: "EX_JOHN_DOE" }).notificationLevelEnumId
        return { applied, team: level("BOSS_DEMO_CHAT_TEAM"), general: level("BOSS_DEMO_CHAT_GENERAL"), direct: level("BOSS_DEMO_CHAT_JOE") }
    },
    then({ applied, team, general, direct }) {
        applied.errors == ""
        team == "CnlNone"
        general == "CnlNone"
        direct == "CnlAll"
    },
})

feature("the do not disturb hours: both or neither, not the same time; the job puts a user in them on do not disturb and back", {
    when() {
        const same = post("saveDndHours", { dndFrom: "09:00", dndTo: "09:00" })
        const saved = post("saveDndHours", { dndFrom: "22:00", dndTo: "07:00" })
        const kept = [pref("CHAT_DND_FROM"), pref("CHAT_DND_TO")]
        const page = render("Settings/Chat")
        const cleared = post("clearDndHours", {})
        const clearedPrefs = [pref("CHAT_DND_FROM") || "", pref("CHAT_DND_TO") || ""]
        // a user in UTC whose hours hold now, then hours that do not
        const now = Number(ec.user.nowTimestamp)
        setPref(DND_USER, "CHAT_DND_FROM", utc(now - 3600000))
        setPref(DND_USER, "CHAT_DND_TO", utc(now + 3600000))
        const inside = sys(() => call("org.moqui.comms.ChatScreenServices.apply#DndHours", {}))
        const during = one("moqui.security.UserStatus", { userId: DND_USER })
        const auto = one("moqui.security.UserPreference", { userId: DND_USER, preferenceKey: "CHAT_DND_AUTO" })
        const again = sys(() => call("org.moqui.comms.ChatScreenServices.apply#DndHours", {}))
        setPref(DND_USER, "CHAT_DND_FROM", utc(now + 2 * 3600000))
        setPref(DND_USER, "CHAT_DND_TO", utc(now + 3 * 3600000))
        const outside = sys(() => call("org.moqui.comms.ChatScreenServices.apply#DndHours", {}))
        const after = one("moqui.security.UserStatus", { userId: DND_USER })
        return { same, saved, kept, page, cleared, clearedPrefs, inside, during, auto, again, outside, after }
    },
    allowMessageErrors: true,
    then(v) {
        v.same.errors.includes("end when they start")
        v.saved.errors == ""
        v.kept == ["22:00", "07:00"]
        v.page.output.includes("Every day from 22:00 to 07:00")
        v.cleared.errors == ""
        v.clearedPrefs == ["", ""]
        v.inside.dndCount >= 1
        v.during.statusEnumId == "UpsDnd"
        v.auto.preferenceValue == "Y"
        // already on do not disturb: nothing again
        v.again.dndCount == 0
        v.outside.backCount >= 1
        v.after.statusEnumId == "UpsOnline"
    },
})

feature("status presets: added, used for my status, removed", {
    when() {
        const added = post("addPreset", { emoji: "🎧", text: "Focus time", clearAfter: "60" })
        const empty = post("addPreset", { emoji: "", text: "" })
        const presets = sys(() => call("org.moqui.comms.ChatScreenServices.get#ChatPrefs", {})).prefs.statusPresets
        const index = presets.findIndex((preset) => preset.text === "Focus time")
        const used = post("usePreset", { index })
        const status = one("moqui.security.UserStatus", { userId: "EX_JOHN_DOE" })
        const today = presets.findIndex((preset) => preset.clearAfter === "today")
        post("usePreset", { index: today })
        const todayStatus = one("moqui.security.UserStatus", { userId: "EX_JOHN_DOE" })
        const kept = JSON.parse(pref("CHAT_STATUS_PRESETS") || "null")
        const removed = post("removePreset", { index })
        sys(() => call("org.moqui.impl.ChatServices.set#UserStatus", { clearStatus: true }))
        return { added, empty, presets, index, used, status, todayStatus, removed, kept,
            after: sys(() => call("org.moqui.comms.ChatScreenServices.get#ChatPrefs", {})).prefs.statusPresets, now: Number(ec.user.nowTimestamp) }
    },
    allowMessageErrors: true,
    then(v) {
        v.added.errors == ""
        v.empty.errors.includes("A status needs a text or an emoji")
        v.index >= 0
        v.presets[v.index].emoji == "🎧"
        v.used.errors == ""
        v.status.statusText == "Focus time"
        v.status.emoji == "🎧"
        Number(v.status.clearAtDate) > v.now + 50 * 60000
        Number(v.status.clearAtDate) < v.now + 70 * 60000
        // clears at the end of the user's day: within a day from now
        Number(v.todayStatus.clearAtDate) > v.now
        Number(v.todayStatus.clearAtDate) <= v.now + 24 * 3600000
        v.removed.errors == ""
        !v.after.some((preset) => preset.text === "Focus time")
        // the preference is the list the account menu's status dialog reads: {emoji, text, clearAfter} with clearAfter minutes, today, week or 0
        Array.isArray(v.kept)
        v.kept.some((preset) => preset.text === "Focus time" && preset.emoji === "🎧" && preset.clearAfter === "60")
        v.kept.every((preset) => Object.keys(preset).sort().join(",") === "clearAfter,emoji,text" && ["0", "30", "60", "240", "today", "week"].includes(preset.clearAfter))
    },
})
