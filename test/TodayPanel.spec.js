// TodayPanel (screen/Commons/Panel/Today.xml, impl-drawers-commons.md M2): john.doe's demo Today
// (service/ironstone/commons/DemoServices.xml load#CommonsDemo, loaded again here with the clock at 08:00 today) in its groups, the
// Requests today source of the Commons shell providers, and the quick actions: Mark done, Snooze, Reschedule and the quick-add
// line, each answering JSON messages and changing the panel. A task the user is not on cannot be changed.
// Run: ./moq test mr-boss --spec TodayPanel
const webroot = "component://webroot/screen/webroot.xml"
const commons = "component://mr-boss/screen/Commons.xml"
const requestsSource = { service: "mantle.request.RequestServices.get#UserTodayRequests", label: "Requests" }
let todayText, tomorrowText

// the panel as the tray loads it, under the apps root so the shell data has the today sources
function panel(parameters) {
    const str = ec.screen.makeTest().rootScreen(webroot).renderMode("qvt").withStaticData().render("apps/Commons/Panel/Today", Object.assign({ lastStandalone: "true" }, parameters || {}), null)
    const output = String(str.output || "")
    return { status: str.status, errors: str.errorMessages.join(" | "), output, broken: /Error rendering|Exception in render/.test(output) }
}
// a transition of the panel as its m-form posts it: the status, the errors and the JSON
function post(name, parameters) {
    const str = ec.screen.makeTest().rootScreen(commons).render(`Panel/Today/${name}`, parameters || {}, "post")
    let json = null
    try { json = JSON.parse(str.output) } catch (err) { json = null }
    ec.message.clearErrors()
    return { status: str.status, errors: str.errorMessages.join(" | "), json: json || {}, text: String(str.output || "").substring(0, 300) }
}
// a direct read or service call, outside a screen request: as internal work
function sys(run) {
    const wasDisabled = ec.artifactExecution.disableAuthz()
    try { return run() } finally { if (!wasDisabled) ec.artifactExecution.enableAuthz() }
}
const view = () => sys(() => call("ironstone.commons.CommonsServices.get#TodayView", { sourceServiceNames: [requestsSource] }))
const one = (entityName, fields) => sys(() => ec.entity.find(entityName).condition(fields).one())
const titlesOf = (found, key) => ((found.groups || []).find((group) => group.key === key) || { items: [] }).items.map((item) => item.title)
const allIds = (found) => (found.groups || []).flatMap((group) => (group.items || []).map((item) => item.workEffortId || item.requestId))

spec({
    setupSpec() {
        login("john.doe")
        // the clock at 08:00 today in john.doe's time zone, and the demo dated from it
        todayText = ec.l10n.format(ec.user.nowTimestamp, "yyyy-MM-dd")
        const pinned = Number(String(ec.l10n.parseTimestamp(todayText + " 08:00:00.000", "yyyy-MM-dd HH:mm:ss.SSS")))
        ec.user.setEffectiveTime(pinned)
        tomorrowText = ec.l10n.format(String(pinned + 24 * 3600000), "yyyy-MM-dd")
        sys(() => call("ironstone.commons.DemoServices.load#CommonsDemo", {}))
    },
})

feature("the Today view has the demo items in their groups, the Requests source and the approval waiting", {
    when() {
        const found = view()
        const sources = (found.groups || []).filter((group) => group.isSource)
        const call_ = ((found.groups.find((group) => group.key === "dueToday") || { items: [] }).items.find((item) => item.workEffortId === "BOSS_DEMO_TODAY_CALL")) || {}
        const shared = ((found.groups.find((group) => group.key === "dueToday") || { items: [] }).items.find((item) => item.workEffortId === "BOSS_DEMO_TODAY_DUE")) || {}
        const meeting = ((found.groups.find((group) => group.key === "laterToday") || { items: [] }).items.find((item) => item.workEffortId === "BOSS_DEMO_TODAY_MEETING")) || {}
        return { found, keys: found.groups.map((group) => group.key), overdue: titlesOf(found, "overdue"), dueToday: titlesOf(found, "dueToday"),
            laterToday: titlesOf(found, "laterToday"), sourceLabels: sources.map((group) => group.label),
            sourceTitles: sources.flatMap((group) => group.items.map((item) => item.title)), call_, shared, meeting }
    },
    then({ found, keys, overdue, dueToday, laterToday, sourceLabels, sourceTitles, call_, shared, meeting }) {
        keys.slice(0, 3) == ["overdue", "dueToday", "laterToday"]
        overdue.includes("Send the signed service agreement to Bob Acme")
        dueToday.includes("Call Bob Acme about who may see the shared calendar")
        dueToday.includes("Compare the calendar options for the team")
        laterToday.includes("Calendar setup review")
        sourceLabels == ["Requests"]
        sourceTitles.includes("Set up the shared team calendar")
        // the call is an activity on the demo request; the shared task names its other assignee
        call_.icon == "sym_o_call"
        call_.recordCaption.includes("BOSS_DEMO_REQUEST")
        call_.recordUrl == "/qapps/Commons/Requests/RequestDetail?requestId=BOSS_DEMO_REQUEST"
        call_.url == "/qapps/Commons/Tasks/TaskDetail?workEffortId=BOSS_DEMO_TODAY_CALL"
        call_.canComplete == true
        shared.assigneeText.includes("Joe Developer")
        meeting.icon == "sym_o_groups"
        meeting.canComplete == false
        meeting.canSnooze == true
        meeting.url == "/qapps/Commons/Calendar/EventDetail?workEffortId=BOSS_DEMO_TODAY_MEETING"
        found.approvalCount >= 1
        found.failedSources.length == 0
    },
})

feature("TodayPanel renders in qvt with the groups in order and the approvals line", {
    when() { return panel() },
    then({ status, errors, output, broken }) {
        status == 200
        errors == ""
        !broken
        output.includes("Overdue")
        output.includes("Send the signed service agreement to Bob Acme")
        output.indexOf("Send the signed service agreement") < output.indexOf("Due today")
        output.indexOf("Due today") < output.indexOf("Compare the calendar options for the team")
        output.indexOf("Compare the calendar options for the team") < output.indexOf("Later today")
        output.indexOf("Later today") < output.indexOf("Calendar setup review")
        // the Requests today source of the Commons shell providers, as its own group
        output.includes(">Requests</span>")
        output.indexOf(">Requests</span>") < output.lastIndexOf("Set up the shared team calendar")
        /\b[1-9]\d* approvals? waiting\b/.test(output)
        output.includes("Add a task for today")
        output.includes("/qapps/Commons/Requests/RequestDetail?requestId=BOSS_DEMO_REQUEST")
    },
})

feature("the quick-add line links to the record given and names it", {
    when() { return panel({ recordEntity: "mantle.request.Request", recordId: "BOSS_DEMO_REQUEST", recordTitle: "Set up the shared team calendar" }) },
    then({ status, errors, output }) {
        status == 200
        errors == ""
        output.includes("Linked to Set up the shared team calendar")
    },
})

feature("Mark done answers a message and takes the task off Today", {
    when() {
        const done = post("markDone", { workEffortId: "BOSS_DEMO_TODAY_OVERDUE" })
        const status = one("mantle.work.effort.WorkEffort", { workEffortId: "BOSS_DEMO_TODAY_OVERDUE" }).statusId
        return { done, status, ids: allIds(view()), shown: panel().output }
    },
    then({ done, status, ids, shown }) {
        done.errors == ""
        done.json.messageInfos[0].message.includes("Send the signed service agreement")
        !done.json.screenUrl
        status == "WeComplete"
        !ids.includes("BOSS_DEMO_TODAY_OVERDUE")
        // the panel again: no Overdue group left
        !shown.includes("Send the signed service agreement to Bob Acme")
        !shown.includes(">Overdue</span>")
    },
})

feature("Snooze hides the item from john.doe's Today until tomorrow 9:00", {
    when() {
        const snoozed = post("snooze", { workEffortId: "BOSS_DEMO_TODAY_MEETING" })
        const row = one("mantle.work.effort.WorkEffortParty", { workEffortId: "BOSS_DEMO_TODAY_MEETING", partyId: "EX_JOHN_DOE" })
        return { snoozed, until: ec.l10n.format(row.snoozedThruDate, "yyyy-MM-dd HH:mm"), ids: allIds(view()), shown: panel().output }
    },
    then({ snoozed, until, ids, shown }) {
        snoozed.errors == ""
        snoozed.json.messageInfos.length == 1
        until == tomorrowText + " 09:00"
        !ids.includes("BOSS_DEMO_TODAY_MEETING")
        !shown.includes("Calendar setup review")
    },
})

feature("Reschedule moves the due date to tomorrow, keeping the time", {
    when() {
        const moved = post("reschedule", { workEffortId: "BOSS_DEMO_TODAY_DUE", estimatedCompletionDate: tomorrowText })
        const due = one("mantle.work.effort.WorkEffort", { workEffortId: "BOSS_DEMO_TODAY_DUE" }).estimatedCompletionDate
        return { moved, due: ec.l10n.format(due, "yyyy-MM-dd HH:mm"), ids: allIds(view()) }
    },
    then({ moved, due, ids }) {
        moved.errors == ""
        moved.json.messageInfos.length == 1
        due == tomorrowText + " 17:00"
        !ids.includes("BOSS_DEMO_TODAY_DUE")
    },
})

feature("the quick-add line makes a task due today for john.doe, on the record given", {
    when() {
        const added = post("quickAdd", { workEffortName: "Book the room for the review", recordEntity: "mantle.request.Request", recordId: "BOSS_DEMO_REQUEST" })
        const id = added.json.workEffortId
        const linked = id && one("mantle.request.RequestWorkEffort", { workEffortId: id, requestId: "BOSS_DEMO_REQUEST" }) ? 1 : 0
        return { added, id, linked, dueToday: titlesOf(view(), "dueToday") }
    },
    then({ added, id, linked, dueToday }) {
        added.errors == ""
        id != null
        added.json.url == `/qapps/Commons/Tasks/TaskDetail?workEffortId=${id}`
        linked == 1
        dueToday.includes("Book the room for the review")
    },
})

feature("a task john.doe is not on cannot be marked done or rescheduled", {
    allowMessageErrors: true,
    when() {
        sys(() => call("create#mantle.work.effort.WorkEffort", { workEffortId: "BOSS_TEST_OTHERS_TASK", workEffortTypeEnumId: "WetTask", statusId: "WeApproved",
            workEffortName: "Someone else's task", ownerPartyId: "ORG_ZIZI_JD" }))
        const done = post("markDone", { workEffortId: "BOSS_TEST_OTHERS_TASK" })
        const moved = post("reschedule", { workEffortId: "BOSS_TEST_OTHERS_TASK", estimatedCompletionDate: tomorrowText })
        const status = one("mantle.work.effort.WorkEffort", { workEffortId: "BOSS_TEST_OTHERS_TASK" }).statusId
        return { done, moved, status }
    },
    then({ done, moved, status }) {
        done.status == 500
        done.text.includes("You may not change task BOSS_TEST_OTHERS_TASK")
        moved.status == 500
        status == "WeApproved"
    },
})

feature("the demo loaded again on a later day keeps one Assignee row per party, and a data load (no user) dates it in john.doe's zone", {
    when() {
        const pinned = Number(String(ec.user.nowTimestamp))
        const assignees = () => sys(() => Array.from(ec.entity.find("mantle.work.effort.WorkEffortParty").condition("workEffortId", "BOSS_DEMO_TODAY_DUE")
                .condition("roleTypeId", "Assignee").list())).map((row) => row.partyId).sort()
        ec.user.setEffectiveTime(pinned + 3 * 86400000)
        sys(() => call("ironstone.commons.DemoServices.load#CommonsDemo", {}))
        const later = assignees()
        // as a data load runs it: no user, the server's time zone
        logout()
        ec.user.setTimeZone("UTC")
        let loaded = null
        try {
            sys(() => call("ironstone.commons.DemoServices.load#CommonsDemo", {}))
            loaded = assignees()
        } finally {
            ec.user.setTimeZone(null)
            login("john.doe")
            ec.user.setEffectiveTime(pinned)
        }
        return { later, loaded, event: one("mantle.work.effort.WorkEffort", { workEffortId: "BOSS_DEMO_EVENT" }),
            due: one("mantle.work.effort.WorkEffort", { workEffortId: "BOSS_DEMO_TODAY_DUE" }) }
    },
    then({ later, loaded, event, due }) {
        later == ["EX_JOHN_DOE", "ORG_ZIZI_JD"]
        loaded == ["EX_JOHN_DOE", "ORG_ZIZI_JD"]
        ec.user.timeZone == "US/Central"
        ec.l10n.format(event.estimatedStartDate, "yyyy-MM-dd HH:mm") == "2026-10-21 10:00"
        ec.l10n.format(due.estimatedCompletionDate, "HH:mm") == "17:00"
    },
})
