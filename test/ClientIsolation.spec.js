// Client access, the isolation spec (impl-projects.md P10a; design-projects.md §1.1, §15 Client access and Chatter for client
// users): with authorization on, a client contact who signs in (sheldon.acme of Acme on ACME; gob.bluth of Bluth Corp on BLUTH,
// both in BOSS_PROJECT_CLIENT, data/BossUsersDemoData.xml) never reads another client's project, an internal note, a rate or a
// cost through any screen, Chatter, record files, search or the palette, and sees only Projects: Commons and Comms are refused.
// Every screen file under the Projects root and in screen/Shared is rendered as the client: each is either one the client may
// open (rendered with its demo record, none of the sentinels below in it) or one it is refused (a file in neither list fails
// the spec, so a new screen is classified when it is added). Writes are refused (P10a: the client is read only; P10b opens
// its own messages, requests and gate decisions). The sentinels are made in setupSpec with authorization off and removed after:
// an internal note on ACME-1, on ACME and on Acme's request, a client rate and a client budget on ACME with amounts found nowhere
// else; and the names of the other client's project and items, of the team's Work group items and of the projects the client is
// not on.
// Run: ./moq test mr-boss --spec ClientIsolation
const webroot = "component://webroot/screen/webroot.xml"
const base = "component://mr-boss/screen"
const SHELDON = "sheldon.acme"
const GOB = "gob.bluth"
const made = { notes: [] }

// what must never reach a client of Acme (and the reverse for Bluth)
const ACME_SECRETS = ["ZQX-INTERNAL-NOTE", "987.65", "987,65", "43,210", "43210", "7,777", "7777", "8,888", "8888", "24,000", "4,800", "19,200", "150.00", "135.00", "keep the sign-on estimate padded",
    "Bluth banana stand site", "Frozen banana menu page", "Price the stand", "Single sign-on with their directory", "Weekly status report to Acme",
    "Hiring plan 2027", "Expand and collapse rows", "Leave holidays out of the burndown", "Brightwater"]
const BLUTH_SECRETS = ["ZQX-INTERNAL-NOTE", "987.65", "43,210", "Acme customer portal", "Customer sign-in", "Export the portal's users",
    "Price the stand", "Hiring plan 2027", "Expand and collapse rows", "Brightwater"]
const leaksOf = (text, secrets) => secrets.filter((secret) => String(text || "").includes(secret))

function render(path, parameters, mode, standalone) {
    const all = Object.assign(standalone === false ? {} : { lastStandalone: "true" }, parameters || {})
    const str = ec.screen.makeTest().rootScreen(webroot).renderMode(mode || "qvt").withStaticData().render("apps/Projects/" + path, all, null)
    const output = String(str.output || "")
    const errors = str.errorMessages.join(" | ")
    ec.message.clearErrors()
    return { status: str.status, errors, output, refused: str.status == 401 || str.status == 403 || /not authorized/i.test(errors + output),
        broken: /Error rendering|Exception in render/.test(output) }
}
function hit(path, parameters, method) {
    // a path under the apps root, or with ../ one under the webroot (shellData, menuData)
    const full = path.startsWith("../") ? path.substring(3) : "apps/" + path
    const str = ec.screen.makeTest().rootScreen(webroot).render(full, parameters || {}, method || null)
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
// as the user, with authorization on as for a request
function as(username, run) {
    login(username)
    const wasDisabled = ec.artifactExecution.authzDisabled()
    if (wasDisabled) ec.artifactExecution.enableAuthz()
    try { return run() } finally {
        if (wasDisabled) ec.artifactExecution.disableAuthz()
        login("john.doe")
    }
}
const service = (name, parameters) => {
    const out = ec.service.sync().name(name).parameters(parameters || {}).call() || {}
    const errors = ec.message.getErrorsString ? ec.message.getErrorsString() : ""
    ec.message.clearErrors()
    return Object.assign({}, out, { _errors: errors || "" })
}

// every screen file under the Projects root ([path under it, location]) and in screen/Shared
function screenFiles() {
    const files = []
    ec.resource.getLocationReference(`${base}/Projects.xml`).walkChildTree(files, null)
    const found = files.filter((file) => file.path !== "Projects" && file.location.endsWith(".xml"))
            .map((file) => [file.path.substring("Projects".length + 1), file.location])
    for (const ref of ec.resource.getLocationReference(`${base}/Shared`).getDirectoryEntries())
        if (ref.location.endsWith(".xml")) found.push(["Shared/" + ref.location.substring(ref.location.lastIndexOf("/") + 1).replace(/\.xml$/, ""), ref.location])
    return found
}
// the screens a client opens, by path under the Projects root, with the demo record each opens on (ACME's); the Shared screens
// by the path they are mounted at
const ALLOWED = {
    "Home": {},
    "Projects": {},
    "Projects/List": {},
    "Projects/ProjectDetail": { workEffortId: "ACME" },
    "Projects/ProjectDetail/Overview": { workEffortId: "ACME" },
    "Projects/ProjectDetail/Plan": { workEffortId: "ACME" },
    "Projects/Roadmap": {},
    "Projects/MilestoneDetail": { workEffortId: "ACME-MS-1" },
    "Projects/ReleaseDetail": { workEffortId: "ACME-MS-1" },
    "WorkItems": {},
    "WorkItems/List": {},
    "WorkItems/Timeline": { rootWorkEffortId: "ACME" },
    "WorkItems/TimelineTui": { rootWorkEffortId: "ACME" },
    "Requests": {},
    "Requests/List": {},
    "Shared/WorkItemDetail": { path: "WorkItems/WorkItemDetail", workEffortId: "ACME-1" },
    "Shared/RequestDetail": { path: "Requests/RequestDetail", requestId: "BOSS_DEMO_PREQ_ACME1" },
    "Shared/Chatter": { path: "Chatter", recordEntity: "mantle.work.effort.WorkEffort", recordId: "ACME-1" },
    "Shared/ChatterTui": { tui: true },
    "Shared/RecordFiles": { path: "RecordFiles", recordEntity: "mantle.request.Request", recordId: "BOSS_DEMO_PREQ_ACME1" },
    "Shared/RecordFilesTui": { tui: true },
    // Code (P10b): the repositories a client's projects share, read only (ACME shares none here: each says not available;
    // test/ClientCode.spec.js opens them on a shared repository)
    "Code": {},
    "Code/Repositories": {},
    "Code/MergeRequests": {},
    "Code/RepositoryDetail": { repositoryId: "acme-portal" },
    "Code/RepositoryDetail/Files": { repositoryId: "acme-portal" },
    "Code/RepositoryDetail/Commits": { repositoryId: "acme-portal" },
    "Code/RepositoryDetail/Branches": { repositoryId: "acme-portal" },
    "Code/RepositoryDetail/Tags": { repositoryId: "acme-portal" },
    "Code/CommitDetail": { repositoryId: "acme-portal", commitId: "main" },
    "Code/MergeRequestDetail": { mergeRequestId: "_NA_" },
    "Code/MergeRequestDetail/Overview": { mergeRequestId: "_NA_" },
    "Code/MergeRequestDetail/Commits": { mergeRequestId: "_NA_" },
    "Code/MergeRequestDetail/Changes": { mergeRequestId: "_NA_" },
    "Code/MergeRequestDetail/ChangesTui": { mergeRequestId: "_NA_" },
    "Projects/ProjectDetail/Code": { workEffortId: "ACME" },
    // Billing (P10b): the client's own sent invoices, read only (none of Acme's in the demo: the detail says not available;
    // test/ClientBilling.spec.js opens them), and the Hours tab (ACME shares no hours in the demo)
    "Billing": {},
    "Billing/Invoices": {},
    "Billing/InvoicePrint": { invoiceId: "_NA_" },
    "Shared/InvoiceDetail": { path: "Billing/InvoiceDetail", invoiceId: "_NA_" },
    "Projects/ProjectDetail/ClientHours": { workEffortId: "ACME" },
}
// the screens mounted under another path that a client opens, and those it is refused there
const MOUNTED_ALLOWED = {
    "Projects/ProjectDetail/WorkItems": { workEffortId: "ACME" },
    "Projects/ProjectDetail/Roadmap": { workEffortId: "ACME" },
    "Projects/ProjectDetail/Requests": { workEffortId: "ACME" },
    "Projects/ProjectDetail/Plan/Timeline": { workEffortId: "ACME" },
    "Code/RepositoryDetail/MergeRequests": { repositoryId: "acme-portal" },
}
const MOUNTED_REFUSED = ["Projects/ProjectDetail/Backlog", "Projects/ProjectDetail/Docs", "Projects/ProjectDetail/Time",
    "Projects/ProjectDetail/Team", "Projects/ProjectDetail/Money", "Projects/ProjectDetail/Files", "Projects/ProjectDetail/Settings",
    "Projects/ProjectDetail/Plan/Calendar", "Billing/OrderDetail", "Projects/ProjectDetail/Money/CreateInvoice",
    "Resources/PersonDetail/EditAllocation", "Time/TimeEntries/EditEntry"]
// the screens a client is refused, by path under the Projects root (a path prefix covers its subscreens)
const REFUSED = ["Code/Compare", "Code/GitAccess", "Code/RepositoryDetail/Activity", "Code/RepositoryDetail/Settings", "Time", "Resources", "Reports", "Settings", "Billing/Unbilled", "Billing/Rates", "QuickCreate", "QuickProject", "Projects/NewProject",
    "Projects/EstimatePrint", "Projects/StatusReport", "Projects/ProjectDetail/Files", "Projects/ProjectDetail/Money",
    "Projects/ProjectDetail/Settings", "Projects/ProjectDetail/Team", "Projects/ProjectDetail/Plan/Calendar", "Projects/ProjectDetail/Plan/CalendarTui",
    "WorkItems/Backlog", "WorkItems/BacklogTui", "WorkItems/Import", "WorkItems/ImportProgress", "WorkItems/SprintDetail", "WorkItems/SprintReport",
    "Shared/OrderDetail", "Shared/Product360", "Shared/Prices", "Shared/PriceLists", "Shared/PriceListDetail", "Shared/PriceExplain", "Shared/SupplierPrices", "Shared/Supplier360", "Shared/InventoryAvailability", "Shared/BillOfMaterialsDetail", "Shared/BillOfMaterialsExplosion", "Shared/BillOfMaterialsCompare", "Shared/WhereUsed", "Shared/RoutingDetail", "Shared/StandardCosts", "Shared/CostRollup", "Shared/CostHistory", "Shared/InventoryValuation", "Shared/Documents", "Shared/DocumentDetail", "Shared/CategoryContent", "Shared/Translations", "Shared/Units", "Shared/Packaging", "Shared/Labels", "Shared/IdentificationTypes", "Shared/CatalogChecks", "Shared/ProductImport"]
const refusedPath = (path) => REFUSED.some((prefix) => path === prefix || path.startsWith(prefix + "/"))

spec({
    stepwise: false,
    setupSpec() {
        login("john.doe")
        sys(() => {
            // an internal note on an item, the project and a request of Acme's, each with the sentinel
            for (const [joinEntity, keyField, id] of [["mantle.work.effort.WorkEffortCommEvent", "workEffortId", "ACME-1"],
                    ["mantle.work.effort.WorkEffortCommEvent", "workEffortId", "ACME"], ["mantle.request.RequestCommEvent", "requestId", "BOSS_DEMO_PREQ_ACME1"]]) {
                const out = ec.service.sync().name("create#mantle.party.communication.CommunicationEvent").parameters({ communicationEventTypeId: "Comment",
                    contactMechTypeEnumId: "CmtWebForm", statusId: "CeSent", fromPartyId: "EX_JOHN_DOE", entryDate: ec.user.nowTimestamp,
                    subject: "ZQX-INTERNAL-NOTE subject", contentType: "text/html", body: "<p>ZQX-INTERNAL-NOTE: the margin on this is thin</p>" }).call()
                made.notes.push(out.communicationEventId)
                ec.service.sync().name("create#" + joinEntity).parameters({ [keyField]: id, communicationEventId: out.communicationEventId }).call()
            }
            // a note's attachment, which must not download for the client
            const attachment = ec.service.sync().name("create#mantle.party.communication.CommunicationEventContent").parameters({
                communicationEventId: made.notes[0], contentLocation: "dbresource://test/ZQX-INTERNAL-NOTE.pdf", contentDate: ec.user.nowTimestamp }).call()
            made.attachmentId = attachment.communicationEventContentId
            // a client rate and a client budget on ACME, with amounts found nowhere else
            ec.service.sync().name("create#mantle.humanres.rate.RateAmount").parameters({ rateAmountId: "BOSS_TEST_CLI_RATE", rateTypeEnumId: "RatpStandard",
                ratePurposeEnumId: "RaprClient", timePeriodUomId: "TF_hr", workEffortId: "ACME", partyId: "ORG_ZIZI_JD", fromDate: "2020-01-01 00:00:00",
                rateAmount: "987.65", rateCurrencyUomId: "USD" }).call()
            const acme = ec.entity.find("mantle.work.effort.WorkEffort").condition("workEffortId", "ACME").one()
            made.acmeBudget = acme.totalClientCostAllowed
            acme.totalClientCostAllowed = 43210.98
            acme.update()
            // and the cost of an item's time
            const item = ec.entity.find("mantle.work.effort.WorkEffort").condition("workEffortId", "ACME-1").one()
            made.itemCosts = [item.actualCost, item.actualClientCost]
            item.actualCost = 7777.77
            item.actualClientCost = 8888.88
            item.update()
            // a status update on ACME not posted for the client
            const update = ec.service.sync().name("create#mantle.party.communication.CommunicationEvent").parameters({ communicationEventTypeId: "StatusUpdate",
                statusId: "CeSent", fromPartyId: "EX_JOHN_DOE", entryDate: ec.user.nowTimestamp, subject: "ZQX-INTERNAL-NOTE update",
                contentType: "text/plain", body: "ZQX-INTERNAL-NOTE: the team's own update" }).call()
            made.notes.push(update.communicationEventId)
            ec.service.sync().name("create#mantle.work.effort.WorkEffortUpdate").parameters({ workEffortId: "ACME", communicationEventId: update.communicationEventId,
                updateDate: ec.user.nowTimestamp, healthEnumId: "WehAtRisk", clientVisible: "N" }).call()
            ec.service.sync().name("create#mantle.work.effort.WorkEffortCommEvent").parameters({ workEffortId: "ACME", communicationEventId: update.communicationEventId }).call()
        })
    },
    cleanupSpec() {
        sys(() => {
            for (const id of made.notes) {
                for (const entityName of ["mantle.work.effort.WorkEffortCommEvent", "mantle.request.RequestCommEvent", "mantle.work.effort.WorkEffortUpdate",
                        "mantle.party.communication.CommunicationEventContent"])
                    ec.entity.find(entityName).condition("communicationEventId", id).deleteAll()
                ec.entity.find("mantle.party.communication.CommunicationEvent").condition("communicationEventId", id).deleteAll()
            }
            ec.entity.find("mantle.humanres.rate.RateAmount").condition("rateAmountId", "BOSS_TEST_CLI_RATE").deleteAll()
            const acme = ec.entity.find("mantle.work.effort.WorkEffort").condition("workEffortId", "ACME").one()
            acme.totalClientCostAllowed = made.acmeBudget ?? null
            acme.update()
            const item = ec.entity.find("mantle.work.effort.WorkEffort").condition("workEffortId", "ACME-1").one()
            item.actualCost = made.itemCosts?.[0] ?? null
            item.actualClientCost = made.itemCosts?.[1] ?? null
            item.update()
        })
    },
})

feature("a client signs in to Projects alone: the shell lists no other app, and Commons and Comms are refused", {
    when() {
        return as(SHELDON, () => {
            const shell = hit("../shellData")
            const apps = (shell.json?.apps || []).map((app) => app.name)
            return { apps, commons: hit("Commons/Home"), comms: hit("Comms/Inbox"),
                commonsMenu: hit("../menuData/apps/Commons"), projectsMenu: hit("../menuData/apps/Projects"),
                quickKinds: (((shell.json?.apps || []).find((app) => app.name === "Projects")?.providers || {}).quickCreate || []).map((kind) => kind.kind),
                paletteActions: (((shell.json?.apps || []).find((app) => app.name === "Projects")?.providers || {}).paletteActions || []).map((one) => one.label) }
        })
    },
    then({ apps, commons, comms, commonsMenu, projectsMenu, quickKinds, paletteActions }) {
        apps == ["Projects"]
        commons.refused
        comms.refused
        commonsMenu.status == 403
        projectsMenu.status == 200
        // no quick-create kind or palette action of an internal screen
        quickKinds == []
        paletteActions == []
    },
})

feature("the Projects menu of a client: Home, Projects, Work items and Requests only", {
    when() {
        return as(SHELDON, () => {
            const levels = {}
            for (const path of ["Projects/WorkItems", "Projects/Projects", "Projects/Requests"]) {
                const found = hit("../menuData/apps/" + path)
                for (const level of Array.isArray(found.json) ? found.json : [])
                    levels[level.name] = (level.subscreens || []).filter((item) => item.menuInclude).map((item) => item.name)
            }
            return { levels }
        })
    },
    then({ levels }) {
        levels.Projects.filter((name) => name !== "Billing" && name !== "Code") == ["Home", "Projects", "WorkItems", "Requests"]
        // P10b: Code, the repositories the client's projects share (none shared: an empty list)
        levels.Projects.includes("Code")
        // P10b: Billing, for the client's own invoices
        levels.Projects.includes("Billing")
        levels.WorkItems == ["Timeline"]
    },
})

feature("every screen file under Projects and in Shared is either one a client opens, without a secret, or one it is refused", {
    when() {
        const files = screenFiles()
        return as(SHELDON, () => {
            const unclassified = []
            const failures = []
            let opened = 0, refused = 0
            for (const [path, location] of files) {
                const allowed = ALLOWED[path]
                if (allowed && refusedPath(path)) { failures.push(`${path}: in both lists`); continue }
                if (!allowed && !refusedPath(path)) { unclassified.push(path); continue }
                if (allowed) {
                    if (allowed.tui) continue
                    const parameters = Object.assign({}, allowed)
                    const at = parameters.path || path
                    delete parameters.path
                    const qvue = /render-modes="vue,qvue[",]/.test(ec.resource.getLocationReference(location).getText())
                    for (const [mode, standalone] of (qvue ? [["qvue", true], ["tui", true]] : [["qvt", true], ["qvt", false], ["tui", true]])) {
                        const out = render(at, parameters, mode, standalone)
                        if (out.refused || out.status != 200 || out.broken) failures.push(`${path} (${mode}${standalone ? "" : ", whole"}): status ${out.status} ${out.errors.substring(0, 200)}`)
                        const leaks = leaksOf(out.output, ACME_SECRETS)
                        if (leaks.length) failures.push(`${path} (${mode}${standalone ? "" : ", whole"}) shows ${leaks.join(", ")}`)
                    }
                    opened++
                } else {
                    // a Shared screen is refused where it is mounted (MOUNTED_REFUSED)
                    if (path.startsWith("Shared/")) { refused++; continue }
                    const qvue = /render-modes="vue,qvue[",]/.test(ec.resource.getLocationReference(location).getText())
                    const out = render(path, { workEffortId: "ACME", rootWorkEffortId: "ACME" }, qvue ? "qvue" : "qvt")
                    if (!out.refused) failures.push(`${path}: not refused (status ${out.status})`)
                    if (leaksOf(out.output, ACME_SECRETS).length) failures.push(`${path}: refused but shows ${leaksOf(out.output, ACME_SECRETS).join(", ")}`)
                    refused++
                }
            }
            for (const [path, parameters] of Object.entries(MOUNTED_ALLOWED)) {
                for (const [mode, standalone] of [["qvt", true], ["qvt", false], ["tui", true]]) {
                    const out = render(path, parameters, mode, standalone)
                    if (out.refused || out.status != 200 || out.broken) failures.push(`${path} (${mode}${standalone ? "" : ", whole"}): status ${out.status} ${out.errors.substring(0, 200)}`)
                    const leaks = leaksOf(out.output, ACME_SECRETS)
                    if (leaks.length) failures.push(`${path} (${mode}${standalone ? "" : ", whole"}) shows ${leaks.join(", ")}`)
                }
            }
            for (const path of MOUNTED_REFUSED) {
                let out = render(path, { workEffortId: "ACME" })
                if (out.status == null && /render mode qvt is not supported/.test(out.errors + out.output)) out = render(path, { workEffortId: "ACME" }, "qvue")
                if (!out.refused) failures.push(`${path}: not refused (status ${out.status})`)
            }
            if (failures.length) log.warn(`Client screen failures:\n${failures.join("\n")}`)
            if (unclassified.length) log.warn(`Screens neither allowed nor refused for clients:\n${unclassified.join("\n")}`)
            return { failures, unclassified, opened, refused }
        })
    },
    then({ failures, unclassified, opened, refused }) {
        unclassified.join(", ") == ""
        failures.join("\n") == ""
        opened >= 15
        refused >= 60
    },
})

feature("the lists show a client its own project, its shared items and its organization's requests, nothing of another client", {
    when() {
        const sheldon = as(SHELDON, () => ({
            projects: render("Projects/List", { list: "all" }), workItems: render("WorkItems/List", { list: "all" }),
            requests: render("Requests/List", { list: "all" }), roadmap: render("Projects/Roadmap", {}), home: render("Home", {}),
            timeline: hit("Projects/WorkItems/Timeline/timeline", { rootWorkEffortId: "ACME" }),
            otherTimeline: hit("Projects/WorkItems/Timeline/timeline", { rootWorkEffortId: "BLUTH" }),
            json: [hit("Projects/WorkItems/List/fieldValue", { workEffortId: "ACME-1", field: "due" }),
                hit("Projects/WorkItems/List/workItemAncestors", { ids: "ACME-2,ACME-3" }),
                hit("Projects/WorkItems/WorkItemDetail/subItemLevel", { workEffortId: "ACME-1" }),
                hit("Projects/Projects/Roadmap/fieldValue", { planWorkEffortId: "ACME-MS-1", field: "due" }),
                hit("Projects/Chatter/recordCard", { recordEntity: "mantle.work.effort.WorkEffort", recordId: "ACME-1" }),
                hit("Projects/Chatter/recordCard", { recordEntity: "mantle.work.effort.WorkEffort", recordId: "BLUTH-1" }),
                hit("Projects/Projects/List", { list: "all", renderMode: "json" })].map((one) => one.output).join("\n"),
        }))
        const gob = as(GOB, () => ({ projects: render("Projects/List", { list: "all" }), workItems: render("WorkItems/List", { list: "all" }),
            home: render("Home", {}) }))
        return { sheldon, gob }
    },
    then({ sheldon, gob }) {
        sheldon.projects.output.includes("Acme customer portal")
        !sheldon.projects.output.includes("Acme mobile app")
        leaksOf(sheldon.projects.output, ACME_SECRETS) == []
        sheldon.workItems.output.includes("Customer sign-in")
        sheldon.workItems.output.includes("Sign-in page")
        !sheldon.workItems.output.includes("ACME-3")
        !sheldon.workItems.output.includes("ACME-6")
        leaksOf(sheldon.workItems.output, ACME_SECRETS) == []
        sheldon.requests.output.includes("Export the portal's users to a spreadsheet")
        sheldon.requests.output.includes("The sign-in page is slow on phones")
        !sheldon.requests.output.includes("Bring over the tickets of the old tracker")
        leaksOf(sheldon.requests.output, ACME_SECRETS) == []
        sheldon.roadmap.output.includes("Go live")
        leaksOf(sheldon.roadmap.output, ACME_SECRETS) == []
        sheldon.home.output.includes("Your projects")
        sheldon.home.output.includes("Acme customer portal")
        leaksOf(sheldon.home.output, ACME_SECRETS) == []
        leaksOf(sheldon.timeline.output, ACME_SECRETS) == []
        !sheldon.otherTimeline.output.includes("Frozen banana")
        leaksOf(sheldon.json, ACME_SECRETS) == []
        sheldon.json.includes("Sign-in page")
        gob.projects.output.includes("Bluth banana stand site")
        gob.workItems.output.includes("Frozen banana menu page")
        !gob.workItems.output.includes("Price the stand")
        leaksOf(gob.projects.output, BLUTH_SECRETS) == []
        leaksOf(gob.workItems.output, BLUTH_SECRETS) == []
        gob.home.output.includes("Bluth banana stand site")
        leaksOf(gob.home.output, BLUTH_SECRETS) == []
    },
})

feature("a client opening another client's project, a Work group item or an internal project by its id is told it is not available", {
    when() {
        return as(SHELDON, () => ({
            bluth: render("Projects/ProjectDetail", { workEffortId: "BLUTH" }, "qvt", false),
            bluthOverview: render("Projects/ProjectDetail/Overview", { workEffortId: "BLUTH" }),
            bluthItem: render("WorkItems/WorkItemDetail", { workEffortId: "BLUTH-1" }, "qvt", false),
            workGroupItem: render("WorkItems/WorkItemDetail", { workEffortId: "ACME-3" }, "qvt", false),
            iron: render("Projects/ProjectDetail", { workEffortId: "IRON" }, "qvt", false),
            ironItem: render("WorkItems/WorkItemDetail", { workEffortId: "IRON-3" }, "qvt", false),
            ironRequest: render("Requests/RequestDetail", { requestId: "BOSS_DEMO_PREQ_IRON1" }, "qvt", false),
            ironMilestone: render("Projects/MilestoneDetail", { workEffortId: "IRON-MS-2" }, "qvt", false),
            ironRelease: render("Projects/ReleaseDetail", { workEffortId: "IRON-REL-2" }, "qvt", false),
            ironTree: hit("Projects/WorkItems/List/workItemAncestors", { workEffortId: "IRON-3" }),
            ironSubItems: hit("Projects/WorkItems/WorkItemDetail/subItemLevel", { workEffortId: "IRON-1", parentWorkEffortId: "IRON-1" }),
            acmeApp: render("Projects/ProjectDetail", { workEffortId: "ACMEAPP" }, "qvt", false),
        }))
    },
    then(out) {
        for (const [name, found] of Object.entries(out)) {
            leaksOf(found.output, ACME_SECRETS.concat(["IronStone Projects", "Acme mobile app"])) == []
        }
        !out.bluth.output.includes("Bluth")
        !out.bluthItem.output.includes("Frozen banana")
        !out.workGroupItem.output.includes("Single sign-on")
        !out.ironItem.output.includes("Expand and collapse rows")
        !out.ironRequest.output.includes("Leave holidays")
    },
})

feature("Chatter of a client: the message to it, never the note; no note attachment; nothing on another client's record", {
    when() {
        return as(SHELDON, () => {
            const timeline = hit("Projects/Chatter/timeline", { recordEntity: "mantle.work.effort.WorkEffort", recordId: "ACME-1" })
            const notesOnly = hit("Projects/Chatter/timeline", { recordEntity: "mantle.work.effort.WorkEffort", recordId: "ACME-1", kinds: "notes" })
            const project = hit("Projects/Chatter/timeline", { recordEntity: "mantle.work.effort.WorkEffort", recordId: "ACME" })
            const request = hit("Projects/Chatter/timeline", { recordEntity: "mantle.request.Request", recordId: "BOSS_DEMO_PREQ_ACME1" })
            const data = hit("Projects/Chatter/chatterData", { recordEntity: "mantle.work.effort.WorkEffort", recordId: "ACME-1" })
            const attachment = hit("Projects/Chatter/attachment", { recordEntity: "mantle.work.effort.WorkEffort", recordId: "ACME-1",
                communicationEventContentId: made.attachmentId })
            const bluth = hit("Projects/Chatter/timeline", { recordEntity: "mantle.work.effort.WorkEffort", recordId: "BLUTH-1" })
            const bluthData = hit("Projects/Chatter/chatterData", { recordEntity: "mantle.work.effort.WorkEffort", recordId: "BLUTH-1" })
            const party = hit("Projects/Chatter/chatterData", { recordEntity: "mantle.party.Party", recordId: "ORG_ZIZI_SERVICES" })
            const note = hit("Projects/Chatter/chatterData", { recordEntity: "mantle.party.communication.CommunicationEvent", recordId: made.notes[0] })
            const logNote = hit("Projects/Chatter/logNote", { recordEntity: "mantle.work.effort.WorkEffort", recordId: "ACME-1", body: "<p>hello</p>" }, "post")
            const tui = render("Chatter", { recordEntity: "mantle.work.effort.WorkEffort", recordId: "ACME-1" }, "tui")
            return { timeline, notesOnly, project, request, data, attachment, bluth, bluthData, party, note, logNote, tui }
        })
    },
    then({ timeline, notesOnly, project, request, data, attachment, bluth, bluthData, party, note, logNote, tui }) {
        timeline.output.includes("Could you send us two test accounts")
        leaksOf(timeline.output, ACME_SECRETS) == []
        notesOnly.json?.entryList == []
        leaksOf(project.output, ACME_SECRETS) == []
        project.output.includes("Sign-in is late by a week")
        leaksOf(request.output, ACME_SECRETS) == []
        data.json?.visible == true
        data.json?.forClient == true
        data.json?.canMessage == true
        data.json?.followerList == null || data.json.followerList.length == 0
        leaksOf(data.output, ACME_SECRETS) == []
        !attachment.output.includes("ZQX")
        attachment.errors.includes("not found") || attachment.json?.errors != null
        bluth.json?.entryList == null || bluth.json.entryList.length == 0
        bluthData.json?.visible != true
        party.json?.visible != true
        note.json?.visible != true
        logNote.refused || logNote.errors != ""
        leaksOf(tui.output, ACME_SECRETS) == []
    },
})

feature("record files: a client gets the files of its request, not those of a work item or project, nor another client's", {
    when() {
        return as(SHELDON, () => ({
            request: hit("Projects/RecordFiles/filesData", { recordEntity: "mantle.request.Request", recordId: "BOSS_DEMO_PREQ_ACME1" }),
            item: hit("Projects/RecordFiles/filesData", { recordEntity: "mantle.work.effort.WorkEffort", recordId: "ACME-1" }),
            project: hit("Projects/RecordFiles/filesData", { recordEntity: "mantle.work.effort.WorkEffort", recordId: "ACME" }),
            otherRequest: hit("Projects/RecordFiles/filesData", { recordEntity: "mantle.request.Request", recordId: "BOSS_DEMO_PREQ_IRON1" }),
            party: hit("Projects/RecordFiles/filesData", { recordEntity: "mantle.party.Party", recordId: "ORG_ACME" }),
            drive: hit("Projects/RecordFiles/driveDownload", { recordEntity: "mantle.work.effort.WorkEffort", recordId: "ACME", drivePath: "work/ACME/x.pdf" }),

        }))
    },
    then({ request, item, project, otherRequest, party, drive }) {
        request.json?.visible == true
        item.json?.visible != true
        project.json?.visible != true
        otherRequest.json?.visible != true
        party.json?.visible != true
        drive.status != 200 || drive.errors != "" || drive.json != null
    },
})

feature("search and the palette find nothing of another client, nor any internal record", {
    when() {
        return as(SHELDON, () => {
            const groups = {}
            for (const text of ["Bluth", "BLUTH-1", "Hiring", "HIRE", "IRON-3", "Acme", "ACME-3", "!1", "iron"]) {
                const found = hit("../shellSearch", { text, limit: "10" })
                groups[text] = found.json?.groups || []
            }
            const searches = {
                clients: hit("Projects/Projects/List/clientSearch", { term: "B" }),
                people: hit("Projects/Projects/List/peopleSearch", { term: "o" }),
                customers: hit("Projects/Requests/List/customerSearch", { term: "Bluth" }),
                records: hit("Projects/Chatter/searchRecords", { term: "Bluth" }),
                users: hit("Projects/Chatter/searchUsers", { term: "Gob" }),
                parent: hit("Projects/WorkItems/WorkItemDetail/parentSearch", { workEffortId: "ACME-1", term: "a" }),
            }
            return { groups, searches }
        })
    },
    then({ groups, searches }) {
        Object.values(groups).every((list) => list.every((group) => (group.rows || []).length == 0))
        for (const [name, found] of Object.entries(searches)) {
            leaksOf(found.output, ACME_SECRETS.concat(["Bluth Corp", "Gob Bluth"])) == []
        }
    },
})

feature("REST: a client reads no project, work item, request or party through the entity or the Mantle REST API", {
    when() {
        return as(SHELDON, () => ({
            entity: hit("../rest/e1/mantle.work.effort.WorkEffort", { workEffortId: "BLUTH" }),
            entityAcme: hit("../rest/e1/mantle.work.effort.WorkEffort/ACME"),
            requests: hit("../rest/e1/mantle.request.Request"),
            parties: hit("../rest/s1/mantle/parties", { partyId: "ORG_BLUTH" }),
            myInfo: hit("../rest/s1/mantle/my/userOrgInfo"),
        }))
    },
    then({ entity, entityAcme, requests, parties, myInfo }) {
        entity.status != 200
        entityAcme.status != 200
        requests.status != 200
        parties.status != 200
        leaksOf(entity.output + entityAcme.output + requests.output + parties.output + myInfo.output, ACME_SECRETS.concat(["Bluth Corp"])) == []
    },
})

feature("a client changes nothing but its own: IronStone writes (status, roadmap, release), a gate it does not approve and a message on a record it does not see are refused", {
    when() {
        const before = sys(() => ec.entity.find("mantle.work.effort.WorkEffort").condition("workEffortId", "ACME-1").one().getMap())
        const tries = as(SHELDON, () => ({
            // every write verb of an IronStone service is one deny (BOSS_PROJECTS_INTERNAL in data/BossSetupData.xml): one of them
            status: hit("Projects/WorkItems/WorkItemDetail/changeStatus", { workEffortId: "ACME-1", toStatusId: "WeComplete" }, "post"),
            // and the roadmap and release moves, the only calls of their services in a run without git (ReleaseWalk needs it)
            plan: hit("Projects/Projects/Roadmap/savePlanItem", { rootWorkEffortId: "ACME", workEffortTypeEnumId: "WetMilestone", workEffortName: "Client milestone" }, "post"),
            release: hit("Projects/Projects/ReleaseDetail/releaseRelease", { workEffortId: "ACME-MS-1" }, "post"),
            // P10b: a client decides only a gate it is the approver of, sends a message only on a record it sees (test/ClientWrites.spec.js)
            gate: hit("Projects/Projects/MilestoneDetail/decideGate", { workEffortId: "IRON-MS-2", action: "approve" }, "post"),
            gateSet: hit("Projects/Projects/MilestoneDetail/decideGate", { workEffortId: "ACME-MS-1", action: "gate", approvalRequired: "N" }, "post"),
            sendMessage: hit("Projects/Chatter/sendMessage", { recordEntity: "mantle.work.effort.WorkEffort", recordId: "ACME-3", body: "<p>Hi</p>" }, "post"),
        }))
        const after = sys(() => ({ item: ec.entity.find("mantle.work.effort.WorkEffort").condition("workEffortId", "ACME-1").one().getMap(),
            milestone: ec.entity.find("mantle.work.effort.WorkEffort").condition("workEffortName", "Client milestone").count(),
            gate: ec.entity.find("mantle.work.effort.WorkEffortApproval").condition("workEffortId", "ACME-MS-1").condition("statusId", "WeaApproved").count(),
            gateRequired: ec.entity.find("mantle.work.effort.WorkEffortSetting").condition({ workEffortId: "ACME-MS-1", settingTypeEnumId: "WstApprovalRequired" }).one()?.settingValue,
            messages: ec.entity.find("mantle.party.communication.CommunicationEvent").condition("fromPartyId", "ORG_ACME_SA").condition("body", "<p>Hi</p>").count() }))
        return { before, tries, after }
    },
    then({ before, tries, after }) {
        Object.values(tries).every((found) => found.refused || found.errors != "" || found.json?.errors)
        tries.status.refused
        after.item.statusId == before.statusId
        after.milestone == 0
        after.gate == 0
        after.gateRequired == "Y"
        after.messages == 0
    },
})

feature("the services answer a client its part only: visible projects, records, the timeline, activity, the tree, time and sprints", {
    when() {
        return as(SHELDON, () => {
            // a record as Chatter finds it (get#RecordLinkInfo under the client's authorization)
            const seen = (entityName, id) => hit("Projects/Chatter/chatterData", { recordEntity: entityName, recordId: id }).json?.visible === true
            const records = { acme: seen("mantle.work.effort.WorkEffort", "ACME"), acme1: seen("mantle.work.effort.WorkEffort", "ACME-1"),
                acme3: seen("mantle.work.effort.WorkEffort", "ACME-3"), milestone: seen("mantle.work.effort.WorkEffort", "ACME-MS-1"),
                bluth: seen("mantle.work.effort.WorkEffort", "BLUTH"), iron: seen("mantle.work.effort.WorkEffort", "IRON"),
                acmeapp: seen("mantle.work.effort.WorkEffort", "ACMEAPP"), request1: seen("mantle.request.Request", "BOSS_DEMO_PREQ_ACME1"),
                request2: seen("mantle.request.Request", "BOSS_DEMO_PREQ_ACME2"), ironRequest: seen("mantle.request.Request", "BOSS_DEMO_PREQ_IRON1"),
                note: seen("mantle.party.communication.CommunicationEvent", made.notes[0]),
                message: seen("mantle.party.communication.CommunicationEvent", "BOSS_DEMO_ACME_MSG1"),
                demoNote: seen("mantle.party.communication.CommunicationEvent", "BOSS_DEMO_ACME_NOTE1"),
                update: seen("mantle.party.communication.CommunicationEvent", "BOSS_DEMO_ACME_UPD1"),
                internalUpdate: seen("mantle.party.communication.CommunicationEvent", made.notes[3]),
                party: seen("mantle.party.Party", "ORG_ACME"), rate: seen("mantle.humanres.rate.RateAmount", "BOSS_TEST_CLI_RATE") }
            // the services that do not depend on the caller's authorization, as the client
            const direct = sys(() => ({
                vis: service("mantle.work.ProjectServices.get#VisibleProjectInfo"),
                activity: JSON.stringify(service("mantle.work.ProjectServices.get#ProjectActivity", { workEffortId: "ACME", pageSize: 100 }).activityList || []),
                tree: (service("mantle.work.ProjectServices.get#WorkItemTree", { rootWorkEffortId: "ACME", topLevel: true }).workItemList || []).map((row) => row.workEffortId),
                time: (service("mantle.work.TimeServices.find#TimeEntries", { rootWorkEffortId: "ACME", withRates: true }).rowList || []).length,
                sprints: (service("ironstone.projects.PlanningServices.get#ProjectSprints", { rootWorkEffortId: "IRON", includeClosed: true }).sprintList || []).length,
                access: service("ironstone.projects.ProjectServices.get#ProjectAccess", { workEffortId: "ACME", need: "none" }),
                bluthAccess: service("ironstone.projects.ProjectServices.get#ProjectAccess", { workEffortId: "BLUTH", need: "none" }),
                task: service("ironstone.commons.TaskServices.get#TaskAccess", { workEffortId: "ACME-1", app: "projects", need: "check" }),
                clientInfo: service("mantle.work.ProjectServices.get#ClientProjectInfo"),
                gitIron: service("mantle.work.GitServices.check#GitRepositoryAuthz", { userId: "ORG_ACME_SA", authzActionEnumId: "AUTHZA_VIEW",
                    artifactTypeEnumId: "AT_GIT_REPOSITORY", artifactName: "iron" }).authzTypeEnumId,
            }))
            return Object.assign({ records }, direct)
        })
    },
    then({ records, vis, activity, tree, time, sprints, access, bluthAccess, task, clientInfo, gitIron }) {
        vis.isClient == true
        vis.allProjects == false
        vis.visibleProjectIds == ["ACME"]
        vis.memberProjectIds == []
        vis.managedProjectIds == []
        records == { acme: true, acme1: true, acme3: false, milestone: true, bluth: false, iron: false, acmeapp: false, request1: true, request2: true,
            ironRequest: false, note: false, message: true, demoNote: false, update: true, internalUpdate: false, party: false, rate: false }
        leaksOf(activity, ACME_SECRETS) == []
        !activity.includes("\"kind\":\"comment\"")
        tree.length > 0
        !tree.includes("ACME-3")
        !tree.includes("ACME-6")
        time == 0
        sprints == 0
        access.canView == true
        access.canUpdate == false
        access.canManage == false
        bluthAccess.canView == false
        task.visible == true
        task.canUpdate == false
        clientInfo.clientProjectIds == ["ACME"]
        clientInfo.clientOrgIds == ["ORG_ACME"]
        clientInfo.clientContactPartyIds.includes("ORG_ACME_BA")
        !clientInfo.scopePartyIds.includes("ORG_BLUTH")
        gitIron == "AUTHZT_NONE"
    },
})

feature("notices: a client following a work item is told of a message for it, never of a note or a mention in one", {
    when() {
        const followed = sys(() => {
            ec.service.sync().name("create#mantle.party.communication.RecordFollower").parameters({ recordEntityName: "mantle.work.effort.WorkEffort",
                recordId: "ACME-1", userId: "ORG_ACME_SA", notifyMessages: "Y", notifyNotes: "Y", notifyActivities: "Y", notifyChanges: "Y" }).call()
            const note = service("mantle.party.CommunicationServices.notify#RecordFollowers", { recordEntityName: "mantle.work.effort.WorkEffort", recordId: "ACME-1",
                kind: "notes", communicationEventId: made.notes[0], subject: "ZQX", body: "ZQX-INTERNAL-NOTE" })
            const message = service("mantle.party.CommunicationServices.notify#RecordFollowers", { recordEntityName: "mantle.work.effort.WorkEffort", recordId: "ACME-1",
                kind: "messages", communicationEventId: "BOSS_DEMO_ACME_MSG1", subject: "Customer sign-in", body: "test accounts" })
            const mention = service("mantle.party.CommunicationServices.notify#RecordMention", { recordEntityName: "mantle.work.effort.WorkEffort", recordId: "ACME-1",
                communicationEventId: made.notes[0], mentionUserIds: ["ORG_ACME_SA", "ORG_ZIZI_JD"], subject: "ZQX", body: "ZQX-INTERNAL-NOTE" })
            ec.entity.find("mantle.party.communication.RecordFollower").condition({ recordEntityName: "mantle.work.effort.WorkEffort", recordId: "ACME-1",
                userId: "ORG_ACME_SA" }).deleteAll()
            return { note: Array.from(note.notifiedUserIds || []), message: Array.from(message.notifiedUserIds || []), mention: Array.from(mention.notifiedUserIds || []) }
        })
        return { followed }
    },
    then({ followed }) {
        !followed.note.includes("ORG_ACME_SA")
        followed.message.includes("ORG_ACME_SA")
        !followed.mention.includes("ORG_ACME_SA")
        followed.mention.includes("ORG_ZIZI_JD")
    },
})
