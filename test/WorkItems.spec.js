// Projects WorkItems and QuickCreate (screen/Projects/WorkItems/List.xml, screen/Projects/QuickCreate.xml and QuickProject.xml,
// service/ironstone/projects/WorkItemServices.xml; design-projects.md §5 WorkItems, §3 QuickCreate; impl-projects.md P2) on the
// Projects demo (data/BossProjectsDemoData.xml: IRON on the development flow with a tree, ACME, HIRE only john.doe is on):
// the smart lists and the find, each row decorated with its roll-up; the projects a user sees (Joe Developer not HIRE,
// impl-projects.md F1); the list in qvt with its views, peek pane and saved finds; the quick-add row; the in-place edits,
// the board (status along the flow, assignee, milestone), the calendar and the tree (a level, the ancestors, a move); the
// bulk changes, each item on its own; QuickCreate's work item and the managers' QuickProject (F8, F10). The spec changes
// only the items it makes and moves back what it moves, so the demo stays for the specs after it. Authorization stays on.
// Run: ./moq test mr-boss --spec WorkItems
const webroot = "component://webroot/screen/webroot.xml"
const projectsRoot = "component://mr-boss/screen/Projects.xml"
const made = {}

function render(path, parameters) {
    const str = ec.screen.makeTest().rootScreen(webroot).renderMode("qvt").withStaticData().render(path, Object.assign({ lastStandalone: "true" }, parameters || {}), null)
    const output = String(str.output || "")
    ec.message.clearErrors()
    return { status: str.status, errors: str.errorMessages.join(" | "), output, broken: /Error rendering|Exception in render/.test(output) }
}
function post(path, parameters, method) {
    const str = ec.screen.makeTest().rootScreen(projectsRoot).render(path, parameters || {}, method || "post")
    const output = String(str.output || "")
    let json = null
    try { json = JSON.parse(output) } catch (err) { json = null }
    ec.message.clearErrors()
    return { status: str.status, errors: str.errorMessages.join(" | "), json: json || {}, output }
}
function sys(run) {
    const wasDisabled = ec.artifactExecution.disableAuthz()
    try { return run() } finally { if (!wasDisabled) ec.artifactExecution.enableAuthz() }
}
function as(username, run) {
    login(username)
    try { return run() } finally { login("john.doe") }
}
const one = (entityName, fields) => sys(() => ec.entity.find(entityName).condition(fields).one())
const all = (entityName, fields) => sys(() => Array.from(ec.entity.find(entityName).condition(fields).list()))
const current = (entityName, fields) => sys(() => Array.from(ec.entity.find(entityName).condition(fields)
        .condition(ec.entity.conditionFactory.makeConditionDate("fromDate", "thruDate", null)).list()))
const rows = (parameters) => sys(() => call("ironstone.projects.WorkItemServices.find#WorkItems", Object.assign({ pageSize: 200 }, parameters || {})))
// the demo's items (this component's data files), not those another spec made, here (BOSS_TEST names) or in another
// component's run before
const demoItems = new Set()
for (const fileRef of ec.resource.getLocationReference("component://mr-boss/data").getDirectoryEntries())
    if (fileRef.location.endsWith(".xml"))
        for (const match of String(ec.resource.getLocationText(fileRef.location) || "").matchAll(/<mantle\.work\.effort\.WorkEffort workEffortId="([^"]+)"/g))
            demoItems.add(match[1])
const idsOf = (out) => (out.rowList || []).filter((row) => demoItems.has(String(row.workEffortId))).map((row) => row.workEffortId)
const keep = (map) => JSON.stringify(map || { list: "open" })
const dayOf = (value) => value == null || value === "" ? "" : ec.l10n.format(value, "yyyy-MM-dd")

spec({
    setupSpec() { login("john.doe") },
})

feature("the smart lists and the find narrow the work items, each row with its type, status, people, plan items, labels and roll-up", {
    when() {
        return {
            open: rows({}), project: rows({ rootWorkEffortId: "IRON" }), bugs: rows({ purposeEnumId: "WepFix" }), review: rows({ statusId: "WeInReview" }),
            key: rows({ text: "iron-9" }), words: rows({ text: "timesheet" }), label: rows({ labelId: "BOSS_DEMO_LBL_UI" }), milestone: rows({ milestoneId: "IRON-MS-1" }),
            release: rows({ releaseId: "IRON-REL-1", list: "all" }), top: rows({ rootWorkEffortId: "IRON", topLevel: "Y" }),
            level: rows({ parentWorkEffortId: "IRON-2", treeOrder: true }), under: rows({ underWorkEffortId: "IRON-1", list: "all" }),
            done: rows({ list: "done" }), high: rows({ rootWorkEffortId: "IRON", priorityBand: "high" }),
            assignee: rows({ assigneePartyId: "ORG_ZIZI_BD" }), restricted: rows({ visibilityEnumId: "WevGeneral", rootWorkEffortId: "ACME" }),
        }
    },
    then(found) {
        const ids = Object.fromEntries(Object.entries(found).map(([key, out]) => [key, idsOf(out)]))
        ids.open.includes("IRON-3")
        ids.open.includes("ACME-1")
        ids.open.includes("HIRE-1")
        !ids.open.includes("IRON-5")
        found.open.counts.open >= 14
        found.open.counts.done >= 2
        ids.project.every((id) => id.startsWith("IRON-"))
        ids.bugs == ["IRON-9"]
        ids.review == ["IRON-3"]
        found.key.keyMatch == "IRON-9"
        ids.key == ["IRON-9"]
        ids.words == ["IRON-8"]
        ids.label.sort() == ["IRON-3", "IRON-4", "IRON-9"]
        ids.milestone.sort() == ["IRON-3", "IRON-4", "IRON-7", "IRON-9"]
        ids.release.sort() == ["IRON-5", "IRON-8"]
        ids.top.sort() == ["IRON-1", "IRON-10", "IRON-6", "IRON-9"]
        // a level of the tree in rank order
        ids.level == ["IRON-3", "IRON-4"]
        ids.under.sort() == ["IRON-2", "IRON-3", "IRON-4", "IRON-5"]
        ids.done.includes("IRON-5")
        ids.done.includes("ACME-2")
        ids.high.sort() == ["IRON-1", "IRON-2", "IRON-3", "IRON-6", "IRON-7", "IRON-9"]
        // Bob Developer's open items: IRON's and the support desk's of the time demo (impl-projects.md P6a)
        ids.assignee.sort() == ["IRON-7", "IRON-9", "SUPP-1", "SUPP-3"]
        ids.restricted.sort() == ["ACME-1", "ACME-4", "ACME-5"]
        // a row as the views read it
        const three = found.review.rowList[0]
        three.statusLabel == "In Review"
        three.assigneeText == "Joe Developer"
        three.assigneePartyId == "ORG_ZIZI_JD"
        three.milestoneId == "IRON-MS-1"
        three.milestoneName == "Beta"
        three.labelText == "UI"
        three.typeIcon == "sym_o_new_releases"
        three.projectName == "IronStone Projects"
        three.parentName == "Work item tree view"
        three.url == "/qapps/Projects/WorkItems/WorkItemDetail?workEffortId=IRON-3"
        three.canUpdate
        // the epic's roll-up: its subtree's 6 + 8 + 5 hours, 1 of 4 done
        const epic = found.top.rowList.find((row) => row.workEffortId === "IRON-1")
        epic.childCount == 2
        epic.totalEstimatedText == "19"
        epic.doneOfTotal == "1/4"
    },
})

feature("Employees see their member and organization-visible projects; the Work group project HIRE stays private", {
    when() {
        return { joe: as("joe.developer", () => idsOf(rows({ list: "all" }))), bob: as("bob.developer", () => idsOf(rows({ list: "all" }))),
            joeOptions: as("joe.developer", () => sys(() => call("ironstone.projects.WorkItemServices.get#ProjectOptions", {}).projectList.map((option) => option.key))) }
    },
    then({ joe, bob, joeOptions }) {
        joe.includes("IRON-3")
        joe.includes("ACME-3")
        !joe.includes("HIRE-1")
        bob.includes("IRON-9")
        bob.includes("ACME-1")
        !bob.includes("HIRE-1")
        joeOptions.includes("IRON")
        !joeOptions.includes("HIRE")
    },
})

feature("the list renders in qvt with the chips and counts, the four views, the peek pane, the find, the saved finds and the quick-add row", {
    when() {
        return { list: render("apps/Projects/WorkItems", {}), project: render("apps/Projects/WorkItems", { rootWorkEffortId: "IRON", list: "all" }),
            joe: as("joe.developer", () => render("apps/Projects/WorkItems", { list: "all" })),
            menu: ec.screen.makeTest().rootScreen(webroot).render("menuData/apps/Projects/WorkItems", {}, null).output }
    },
    then({ list, project, joe, menu }) {
        list.status == 200
        list.errors == ""
        !list.broken
        list.output.includes("Assigned to me")
        list.output.includes("Recently changed")
        list.output.includes("Add a work item")
        list.output.includes("IRON-3")
        list.output.includes("Expand and collapse rows")
        // the views, the tree's parent and roll-ups, the board's group fields, the peek pane
        list.output.includes("'parentField':'parentWorkEffortId'")
        list.output.includes("'groupField':'statusId'")
        list.output.includes("'field':'assigneePartyId'")
        list.output.includes("'field':'milestoneId'")
        list.output.includes("'rangeFind':true") || list.output.includes("rangeFind")
        list.output.includes("WorkItemDetail")
        list.output.includes("Move to project")
        project.output.includes("IRON-10")
        !project.output.includes("ACME-1")
        joe.status == 200
        !joe.output.includes("HIRE-1")
        // the seeded saved finds of the Projects groups
        menu.includes("Open bugs")
        menu.includes("In review")
    },
})

feature("the quick-add row makes a work item in a project the user is on, numbered from the project's key; one the user is not on is refused", {
    allowMessageErrors: true,
    when() {
        const added = post("WorkItems/List/quickAdd", { workEffortName: "BOSS_TEST Quick work item", projectId: "IRON", purposeEnumId: "WepFix",
            assignToPartyId: "ORG_ZIZI_JD", keep: keep() })
        const item = all("mantle.work.effort.WorkEffort", { workEffortName: "BOSS_TEST Quick work item" })[0] || null
        made.quick = item ? item.workEffortId : null
        const refused = as("joe.developer", () => post("WorkItems/List/quickAdd", { workEffortName: "BOSS_TEST Not on HIRE", projectId: "HIRE", keep: keep() }))
        return { added, item, refused, reporter: item ? current("mantle.work.effort.WorkEffortParty", { workEffortId: item.workEffortId, roleTypeId: "Reporter" }) : [],
            assignee: item ? current("mantle.work.effort.WorkEffortParty", { workEffortId: item.workEffortId, roleTypeId: "Assignee" }) : [],
            notMade: all("mantle.work.effort.WorkEffort", { workEffortName: "BOSS_TEST Not on HIRE" }).length,
            notified: item ? all("moqui.security.user.NotificationMessage", { topic: "WorkItemAssigned" }).filter((row) => String(row.messageJson).includes(item.workEffortId)).length : 0 }
    },
    then({ added, item, refused, reporter, assignee, notMade, notified }) {
        added.errors == ""
        item != null
        /^IRON-\d+$/.test(item.workEffortId)
        item.rootWorkEffortId == "IRON"
        item.parentWorkEffortId == null
        item.purposeEnumId == "WepFix"
        item.visibilityEnumId == "WevWorkGroup"
        item.ownerPartyId == "EX_JOHN_DOE"
        Number(String(item.sequenceNum)) > 4000
        reporter.length == 1
        assignee[0].partyId == "ORG_ZIZI_JD"
        notified == 1
        refused.errors.includes("You may not add work items to project HIRE")
        notMade == 0
    },
})

feature("in-place edits, the board's moves (the status along the flow, the assignee, the milestone) and the calendar's due date", {
    when() {
        const id = made.quick
        const priority = post("WorkItems/List/updateField", { workEffortId: id, field: "priority", value: "2" })
        const loaded = post("WorkItems/List/fieldValue", { workEffortId: id, field: "priority" })
        const begun = post("WorkItems/List/moveCard", { workEffortId: id, groupField: "statusId", statusId: "WeInProgress" })
        const toBob = post("WorkItems/List/moveCard", { workEffortId: id, groupField: "assigneePartyId", assigneePartyId: "ORG_ZIZI_BD" })
        const inBeta = post("WorkItems/List/moveCard", { workEffortId: id, groupField: "milestoneId", milestoneId: "IRON-MS-1" })
        const due = post("WorkItems/List/moveDue", { workEffortId: id, estimatedCompletionDate: "2026-12-01" })
        return { priority, loaded, begun, toBob, inBeta, due, item: one("mantle.work.effort.WorkEffort", { workEffortId: id }),
            assignees: current("mantle.work.effort.WorkEffortParty", { workEffortId: id, roleTypeId: "Assignee" }).map((row) => row.partyId),
            milestones: current("mantle.work.effort.WorkEffortAssoc", { toWorkEffortId: id, workEffortAssocTypeEnumId: "WeatMilestone" }).map((row) => row.workEffortId) }
    },
    then({ priority, loaded, begun, toBob, inBeta, due, item, assignees, milestones }) {
        priority.errors == ""
        priority.json.valueText == "2"
        loaded.json.value == "2"
        begun.errors == ""
        toBob.errors == ""
        inBeta.errors == ""
        due.errors == ""
        item.statusId == "WeInProgress"
        item.priority == 2
        dayOf(item.estimatedCompletionDate) == "2026-12-01"
        assignees == ["ORG_ZIZI_BD"]
        milestones == ["IRON-MS-1"]
    },
})

feature("the tree: a level through the form request, the ancestors of a match, and a move under another item and back", {
    allowMessageErrors: true,
    when() {
        const level = post("WorkItems/List/actions/WorkItemList", { parentWorkEffortId: "IRON-6", list: "all", view: "tree" }, "get")
        const ancestors = post("WorkItems/List/workItemAncestors", { ids: "IRON-2" }, "get")
        const deepAncestors = post("WorkItems/List/workItemAncestors", { ids: "IRON-3" }, "get")
        const moved = post("WorkItems/List/moveWorkItem", { workEffortId: made.quick, parentWorkEffortId: "IRON-6", previousSiblingId: "IRON-7" })
        const after = one("mantle.work.effort.WorkEffort", { workEffortId: made.quick })
        const intoOwn = post("WorkItems/List/moveWorkItem", { workEffortId: "IRON-1", parentWorkEffortId: "IRON-3" })
        const back = post("WorkItems/List/moveWorkItem", { workEffortId: made.quick, parentWorkEffortId: "", previousSiblingId: "IRON-10" })
        return { level, ancestors, deepAncestors, moved, after, intoOwn, back, backItem: one("mantle.work.effort.WorkEffort", { workEffortId: made.quick }) }
    },
    then({ level, ancestors, deepAncestors, moved, after, intoOwn, back, backItem }) {
        level.status == 200
        level.output.includes("IRON-7")
        level.output.includes("IRON-8")
        !level.output.includes("IRON-3")
        ancestors.json.workItemRows.map((row) => row.workEffortId) == ["IRON-1", "IRON-2"]
        deepAncestors.json.workItemRows.map((row) => row.workEffortId) == ["IRON-1", "IRON-2", "IRON-3"]
        deepAncestors.json.workItemRows[0].totalEstimatedText == "19"
        moved.errors == ""
        after.parentWorkEffortId == "IRON-6"
        intoOwn.errors.includes("cannot go under itself or one of its sub-items")
        back.errors == ""
        backItem.parentWorkEffortId == null
    },
})

feature("the bulk changes take each selected item on its own: one Joe may not change is skipped and named, the others are changed", {
    when() {
        const labelled = post("WorkItems/List/bulkAction", { bulk: "label", selectedIds: `${made.quick},IRON-10`, value: "BOSS_DEMO_LBL_DOCS", keep: keep() })
        const unlabelled = post("WorkItems/List/bulkAction", { bulk: "unlabel", selectedIds: "IRON-10", value: "BOSS_DEMO_LBL_DOCS", keep: keep() })
        const joePriority = as("joe.developer", () => post("WorkItems/List/bulkAction", { bulk: "priority", selectedIds: `${made.quick},HIRE-1`, value: "7", keep: keep() }))
        return { labelled, unlabelled, joePriority, quick: one("mantle.work.effort.WorkEffort", { workEffortId: made.quick }),
            hire: one("mantle.work.effort.WorkEffort", { workEffortId: "HIRE-1" }),
            quickLabels: all("mantle.work.effort.WorkEffortCategoryAppl", { workEffortId: made.quick }).map((row) => row.workEffortCategoryId),
            tenLabels: all("mantle.work.effort.WorkEffortCategoryAppl", { workEffortId: "IRON-10" }).map((row) => row.workEffortCategoryId) }
    },
    allowMessageErrors: true,
    then({ labelled, unlabelled, joePriority, quick, hire, quickLabels, tenLabels }) {
        labelled.errors == ""
        unlabelled.errors == ""
        quickLabels == ["BOSS_DEMO_LBL_DOCS"]
        tenLabels == []
        joePriority.errors == ""
        quick.priority == 7
        hire.priority == 5
    },
})

// impl-projects.md P4a: the sprint find, the quick add into a sprint, the board's sprint group and the bulk Sprint
feature("the sprints of WorkItems: the current sprint find, the quick add into a sprint, a board move to a sprint and the bulk Sprint", {
    when() {
        const currentIds = idsOf(rows({ sprintId: "current", list: "all", rootWorkEffortId: "IRON" }))
        const planned = idsOf(rows({ sprintId: "IRON-SP-3", list: "all" }))
        const page = render("apps/Projects/WorkItems/List", { rootWorkEffortId: "IRON", sprintId: "current", list: "all" })
        const added = post("WorkItems/List/quickAdd", { workEffortName: "BOSS_TEST sprint quick add", projectId: "IRON", addSprintId: "IRON-SP-2", keep: keep({ list: "all" }) })
        const item = sys(() => ec.entity.find("mantle.work.effort.WorkEffort").condition("workEffortName", "BOSS_TEST sprint quick add").one())
        const inSprint = current("mantle.work.effort.WorkEffortAssoc", { toWorkEffortId: item.workEffortId, workEffortAssocTypeEnumId: "WeatSprint" }).map((row) => row.workEffortId)
        const card = post("WorkItems/List/moveCard", { workEffortId: item.workEffortId, groupField: "sprintId", sprintId: "IRON-SP-3" })
        const afterCard = current("mantle.work.effort.WorkEffortAssoc", { toWorkEffortId: item.workEffortId, workEffortAssocTypeEnumId: "WeatSprint" }).map((row) => row.workEffortId)
        const bulk = post("WorkItems/List/bulkAction", { bulk: "sprint", selectedIds: item.workEffortId, value: "", keep: keep() })
        const afterBulk = current("mantle.work.effort.WorkEffortAssoc", { toWorkEffortId: item.workEffortId, workEffortAssocTypeEnumId: "WeatSprint" }).map((row) => row.workEffortId)
        // a complete sprint takes no items: the bulk change skips it
        post("WorkItems/List/bulkAction", { bulk: "sprint", selectedIds: item.workEffortId, value: "IRON-SP-1", keep: keep() })
        const afterClosed = current("mantle.work.effort.WorkEffortAssoc", { toWorkEffortId: item.workEffortId, workEffortAssocTypeEnumId: "WeatSprint" }).map((row) => row.workEffortId)
        // the sprint 2 audit row of the quick add: a scope change of the sprint in progress, by john.doe
        const audit = sys(() => ec.entity.find("moqui.entity.EntityAuditLog").condition({ changedEntityName: "mantle.work.effort.WorkEffortAssoc",
            pkPrimaryValue: "IRON-SP-2", pkSecondaryValue: item.workEffortId }).list()).map((row) => row.changedFieldName + " " + row.changedByUserId)
        sys(() => { item.statusId = "WeCancelled"; item.update() })
        return { currentIds, planned, page, added, inSprint, card, afterCard, bulk, afterBulk, afterClosed, audit }
    },
    allowMessageErrors: true,
    then({ currentIds, planned, page, added, inSprint, card, afterCard, bulk, afterBulk, afterClosed, audit }) {
        currentIds.sort() == ["IRON-10", "IRON-3", "IRON-7", "IRON-9"]
        planned == ["IRON-8"]
        page.status == 200
        !page.broken
        page.output.includes("Current sprint (in progress)")
        page.output.includes("Sprint 2 · Active")
        added.errors == ""
        inSprint == ["IRON-SP-2"]
        card.errors == ""
        afterCard == ["IRON-SP-3"]
        bulk.errors == ""
        afterBulk == []
        afterClosed == []
        audit.sort() == ["fromDate EX_JOHN_DOE", "thruDate EX_JOHN_DOE"]
    },
})

feature("QuickCreate's work item in the project of the screen context; QuickTime logs time (P6a); the project kind is the managers' QuickProject", {
    allowMessageErrors: true,
    when() {
        const forms = { workItem: render("apps/Projects/QuickCreate", { kind: "workItem", recordEntity: "mantle.work.effort.WorkEffort", recordId: "ACME" }),
            time: render("apps/Projects/QuickCreate", { kind: "time" }), project: render("apps/Projects/QuickProject", {}),
            teamProject: as("joe.developer", () => render("apps/Projects/QuickProject", {})) }
        const created = post("QuickCreate/createWorkItem", { rootWorkEffortId: "ACME", workEffortName: "BOSS_TEST Quick create item", purposeEnumId: "WepTask",
            assignToMe: "Y", priority: "2", estimatedCompletionDate: "2026-11-30", recordEntity: "mantle.party.Party", recordId: "ORG_ACME" })
        const item = all("mantle.work.effort.WorkEffort", { workEffortName: "BOSS_TEST Quick create item" })[0] || null
        const project = post("QuickProject/createProject", { workEffortName: "BOSS_TEST Quick project", workEffortId: "bqp", clientPartyId: "ORG_ACME" })
        const byJoe = as("joe.developer", () => sys(() => {
            try { call("ironstone.projects.WorkItemServices.create#QuickProject", { workEffortName: "BOSS_TEST Joe project", workEffortId: "BQJ" }); return null }
            catch (err) { ec.message.clearErrors(); return String(err.message) }
        }))
        return { forms, created, item, records: item ? all("mantle.work.effort.WorkEffortRecord", { workEffortId: item.workEffortId }) : [],
            assignees: item ? current("mantle.work.effort.WorkEffortParty", { workEffortId: item.workEffortId, roleTypeId: "Assignee" }).map((row) => row.partyId) : [],
            project, newProject: one("mantle.work.effort.WorkEffort", { workEffortId: "BQP" }), byJoe,
            managers: current("mantle.work.effort.WorkEffortParty", { workEffortId: "BQP", roleTypeId: "ProjectManager" }).map((row) => row.partyId),
            customers: current("mantle.work.effort.WorkEffortParty", { workEffortId: "BQP", roleTypeId: "Customer" }).map((row) => row.partyId) }
    },
    then({ forms, created, item, records, assignees, project, newProject, byJoe, managers, customers }) {
        forms.workItem.status == 200
        forms.workItem.errors == ""
        forms.workItem.output.includes("QuickWorkItem")
        forms.workItem.output.includes("Acme customer portal")
        forms.time.output.includes("QuickTime")
        forms.time.output.includes("Log time")
        forms.project.status == 200
        forms.project.output.includes("QuickProject")
        forms.teamProject.errors.includes("not authorized")
        created.errors == ""
        created.json.url.startsWith("/qapps/Projects/WorkItems/WorkItemDetail?workEffortId=ACME-")
        item.rootWorkEffortId == "ACME"
        item.priority == 2
        records.length == 1
        records[0].recordId == "ORG_ACME"
        assignees == ["EX_JOHN_DOE"]
        project.errors == ""
        newProject.workEffortName == "BOSS_TEST Quick project"
        newProject.visibilityEnumId == "WevGeneral"
        newProject.purposeEnumId == "WepPrClient"
        managers.includes("EX_JOHN_DOE")
        customers == ["ORG_ACME"]
        byJoe.includes("Only project managers make projects")
    },
})
