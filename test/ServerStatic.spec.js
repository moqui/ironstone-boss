// Server-static qvt for the Commons, Comms and Projects screens (README "Significant redesigns" 3, mr-moqui plans/archive/QvtServerStatic.md):
// ec.screen.staticReport runs the static half and the full check (an html render with the real actions and the wrapped ec) on
// each plain XML screen with the demo record AppStructure uses, as john.doe. A screen marked server-static="qvt" must come back
// clean; the list of the others and why is logged, for impl-drawers-commons.md §8 and impl-projects.md P11.
// Run: ./moq test mr-boss --spec ServerStatic
const base = "component://mr-boss/screen"
let screens

// [root screen location, path under it, location] of the plain XML screens (not .qvue, not placeholders) under the roots
function findScreenFiles(appList) {
    const found = []
    for (const app of appList) {
        const files = []
        ec.resource.getLocationReference(`${base}/${app}.xml`).walkChildTree(files, null)
        for (const file of files) {
            if (file.path === app || !file.location.endsWith(".xml")) continue
            const text = ec.resource.getLocationReference(file.location).getText()
            if (/render-modes="[^"]*qvue/.test(text) || text.includes('<label text="Placeholder:')) continue
            found.push([`${base}/${app}.xml`, file.path.substring(app.length + 1), file.location, /server-static="[^"]*\bqvt\b/.test(text)])
        }
    }
    return found
}

// the id parameters of the screens that open on one demo record (as AppStructure's demoRecords)
const demoParameters = {
    "Products/Products/VariantBuilder": {productId:"BOSS_PRD_VIRT"},
    "Products/Products/VariantBuilderTui": {productId:"BOSS_PRD_VIRT"},
    "Products/Products/BulkPrice": {productIds:"BOSS_PRD_OWN"},
    "Products/Categories/CategoryDetail": {productCategoryId:"BOSS_PRD_CAT"},
    "Products/Features/FeatureDetail": {productFeatureId:"BOSS_PRD_FEATURE"},
    "Products/Features/FeatureGroups/FeatureGroupDetail": {productFeatureGroupId:"BOSS_PRD_GROUP"},
    "Products/Prices/PriceLists/PriceListDetail": {priceListId:"BOSS_PRICE_LIST"},
    "Products/Prices/PriceExplain": {productId:"BOSS_PRD_OWN",organizationPartyId:"ORG_ZIZI_SERVICES"},
    "Products/Settings/PricingSettings": {organizationPartyId:"ORG_ZIZI_SERVICES"},

    "Commons/QuickCreate": { kind: "task" },
    "Commons/Calendar/EventDetail": { workEffortId: "BOSS_DEMO_EVENT" },
    "Commons/Calendar/Schedules/ResourceDetail": { resourceType: "room", resourceId: "BOSS_DEMO_ROOM_MAPLE" },
    "Commons/Requests/RequestDetail": { requestId: "BOSS_DEMO_REQUEST" },
    "Commons/Tasks/TaskDetail": { workEffortId: "BOSS_DEMO_TASK_PLAN" },
    "Commons/Contacts/ContactDetail": { partyId: "ORG_ACME_BA" },
    "Commons/Contacts/Compare": { partyId: "BOSS_DEMO_DUP_A", otherPartyId: "BOSS_DEMO_DUP_B" },
    "Commons/Knowledge/SpaceDetail": { wikiSpaceId: "BOSSKB" },
    "Commons/Files/DriveSettings": { driveId: "BOSS_DEMO_TEAM" },
    "Comms/Inbox/MessageDetail": { emailMessageId: "BOSS_DEMO_MAIL_INVOICE" },
    "Comms/Settings/MailAccounts/Account": { emailAccountId: "BOSS_DEMO_MAIL_SUPPORT" },
    "Comms/Consent/Contact": { partyId: "BOSS_DEMO_CON_ALEX" },
    // Projects (impl-projects.md P11): the demo records AppStructure and ProjectsTui use
    "Projects/Reports/Sprints": { rootWorkEffortId: "IRON" },
    "Projects/Reports/Progress": { rootWorkEffortId: "IRON" },
    "Projects/Projects/List": { list: "all" },
    "Projects/Projects/ProjectDetail": { workEffortId: "IRON" },
    "Projects/Projects/ProjectDetail/Overview": { workEffortId: "IRON" },
    "Projects/Projects/ProjectDetail/Team": { workEffortId: "IRON" },
    "Projects/Projects/ProjectDetail/Files": { workEffortId: "IRON" },
    "Projects/Projects/ProjectDetail/Settings": { workEffortId: "IRON" },
    "Projects/Projects/ProjectDetail/Code": { workEffortId: "IRON" },
    "Projects/Projects/ProjectDetail/Plan": { workEffortId: "IRON" },
    "Projects/Projects/ProjectDetail/Plan/CalendarTui": { workEffortId: "IRON", date: "2026-10-26" },
    "Projects/Projects/ProjectDetail/Money": { workEffortId: "ACME" },
    "Projects/Projects/StatusReport": { workEffortId: "IRON" },
    "Projects/Projects/EstimatePrint": { workEffortId: "ACME" },
    "Projects/Projects/MilestoneDetail": { workEffortId: "IRON-MS-1" },
    "Projects/Projects/ReleaseDetail": { workEffortId: "IRON-REL-2" },
    "Projects/WorkItems/List": { rootWorkEffortId: "IRON", list: "all" },
    "Projects/QuickCreate": { kind: "workItem" },
    "Projects/Requests": { list: "all" },
    "Projects/Requests/List": { list: "all" },
    "Projects/Requests/RequestDetail": { requestId: "BOSS_DEMO_PREQ_ACME1" },
    "Projects/Code/Repositories": { list: "all" },
    "Projects/Code/RepositoryDetail": { repositoryId: "iron" },
    "Projects/Code/RepositoryDetail/Files": { repositoryId: "iron" },
    "Projects/Code/RepositoryDetail/Commits": { repositoryId: "iron" },
    "Projects/Code/RepositoryDetail/Branches": { repositoryId: "iron" },
    "Projects/Code/RepositoryDetail/Tags": { repositoryId: "iron" },
    "Projects/Code/RepositoryDetail/MergeRequests": { repositoryId: "iron", list: "all" },
    "Projects/Code/RepositoryDetail/Activity": { repositoryId: "iron" },
    "Projects/Code/RepositoryDetail/Settings": { repositoryId: "iron" },
    "Projects/Code/Compare": { repositoryId: "iron", head: "IRON-3-expand-collapse" },
    "Projects/Code/CommitDetail": { repositoryId: "iron", commitId: "main" },
    "Projects/Code/MergeRequests": { list: "all" },
    "Projects/WorkItems/BacklogTui": { rootWorkEffortId: "IRON" },
    "Projects/WorkItems/SprintDetail": { workEffortId: "IRON-SP-2" },
    "Projects/WorkItems/SprintReport": { workEffortId: "IRON-SP-1" },
    "Projects/WorkItems/TimelineTui": { rootWorkEffortId: "IRON" },
    "Projects/Time/Timesheets": { list: "toApprove" },
    "Projects/Time/TeamTimesheet": { itemId: "SUPP-1" },
    "Projects/Time/TimeEntries": { list: "all" },
    "Projects/Resources/Allocations": { list: "all" },
    "Projects/Resources/PersonDetail": { partyId: "ORG_ZIZI_JD" },
    "Projects/Resources/PersonDetail/Overview": { partyId: "ORG_ZIZI_JD" },
    "Projects/Resources/PersonDetail/Allocations": { partyId: "ORG_ZIZI_JD" },
    "Projects/Resources/PersonDetail/WorkItems": { partyId: "ORG_ZIZI_JD" },
    "Projects/Resources/PersonDetail/Time": { partyId: "ORG_ZIZI_JD" },
    "Projects/Resources/PersonDetail/Capacity": { partyId: "ORG_ZIZI_JD" },
    "Projects/Billing/Unbilled/CreateInvoice": { workEffortId: "SUPP" },
    "Projects/Billing/Invoices": { list: "all" },
}

spec({
    setupSpec() {
        login("john.doe")
        screens = findScreenFiles(["Commons", "Comms", "Projects", "Products"])
    },
})

feature("the full check of every Commons, Comms, Projects and Products XML screen; each one marked server-static is clean", {
    when() {
        const rows = []
        for (const [root, path, location, marked] of screens) {
            const app = root.substring(base.length + 1).replace(/\.xml$/, "")
            let report
            try {
                report = ec.screen.staticReport({ rootScreen: root, screenPath: path, parameters: demoParameters[`${app}/${path}`] || (app === "Products" ? (Object.entries(demoParameters).filter(([key]) => `${app}/${path}`.startsWith(key+"/")).sort((a,b)=>b[0].length-a[0].length)[0]?.[1] || Object.assign({productId:"BOSS_PRD_OWN",organizationPartyId:"ORG_ZIZI_SERVICES"},path.includes("InventoryValuation")?{productStandardCostId:"BOSS_COST_SAMPLE"}:{})) : {}) })
            } catch (err) {
                report = { verdict: "error", violations: [], reasons: [String(err && err.message ? err.message : err)] }
            }
            ec.message.clearErrors()
            // the app roots' always-actions organization setup is on every screen: listed once in the summary, not per screen
            const orgSetup = report.violations.some((violation) => violation.detail.includes("setup#UserOrganizationInfo"))
            const why = report.reasons.concat(report.violations.filter((violation) => !violation.detail.includes("setup#UserOrganizationInfo"))
                .map((violation) => `[${violation.kind}] ${violation.element} ${violation.detail}`))
            if (orgSetup && why.length == 0) why.push("only the root's always-actions setup#UserOrganizationInfo")
            rows.push({ key: `${app}/${path}`, marked, verdict: report.verdict, why })
        }
        log.warn("Server-static report:\n" + rows.map((row) => `${row.marked ? "M " : "  "}${row.verdict.padEnd(22)} ${row.key}`
            + (row.verdict === "clean" ? "" : "\n        " + row.why.slice(0, 6).join("\n        "))).join("\n"))
        return { rows }
    },
    then({ rows }) {
        rows.length > 40
        rows.filter((row) => row.marked && row.verdict !== "clean").map((row) => `${row.key}: ${row.verdict} ${row.why.join("; ")}`).join("\n") == ""
    },
})
