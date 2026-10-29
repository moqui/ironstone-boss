// The IronStone app structure (MoquiConf.xml and screen/): every app root renders its default screen, and every
// placeholder screen under the roots and in screen/Shared renders in qvt without errors; at each of those paths the shell's
// menu data builds, which also defines the sibling and default screens the menu lists. Placeholders are found by their
// "Placeholder:" label. Every other screen under the Commons, Comms, Insights and Projects roots and in screen/Shared (the
// screens built there, the ones moved from the first SimpleScreens port and Projects' section screens over its placeholders)
// renders the same way, on the demo records of data/BossDemoData.xml and data/BossMailDemoData.xml, and shows them; a .qvue screen (render-modes vue,qvue: Shared/Chatter,
// Shared/RecordFiles, Comms/Inbox/Mail, Comms/Inbox/Compose, Comms/Chat, Comms/Panel/Chat, Comms/Settings/Rules,
// Comms/Settings/MailAccounts/SignIn, Commons/Knowledge, Commons/Notes and Commons/Files, which the shell loads in their best
// client mode) renders in qvue, its component.
// Run: ./moq test mr-boss
const base = "component://mr-boss/screen"
const apps = ["Commons", "Comms", "Sales", "Marketing", "CustomerService", "Commerce", "Products", "Purchasing", "Warehouse",
    "Manufacturing", "Maintenance", "Accounting", "People", "Projects", "Insights", "Admin"]
let placeholders, screens

// the menu data the shell fetches for a path under the apps root, as an error text or null
function menuError(path) {
    const str = ec.screen.makeTest().rootScreen("component://webroot/screen/webroot.xml").render(`menuData/apps/${path}`, {}, null)
    if (str.status == 200 && str.errorMessages.length == 0 && str.output.startsWith("[")) return null
    return `menu of ${path}: status ${str.status}, ${str.errorMessages.join(" | ") || str.output.substring(0, 200)}`
}

// a screen file whose text has a placeholder label
function isPlaceholder(location) {
    return ec.resource.getLocationReference(location).getText().includes('<label text="Placeholder:')
}

// [root screen location, path under it] of every screen file under the roots of appList and in screen/Shared that
// matches(location)
function findScreenFiles(appList, matches) {
    const found = []
    for (const app of appList) {
        const files = []
        ec.resource.getLocationReference(`${base}/${app}.xml`).walkChildTree(files, null)
        for (const file of files) {
            // the walk's paths start with the root's own name: Commons, Commons/Home, …
            if (file.path !== app && file.location.endsWith(".xml") && matches(file.location))
                found.push([`${base}/${app}.xml`, file.path.substring(app.length + 1), file.location])
        }
    }
    for (const fileRef of ec.resource.getLocationReference(`${base}/Shared`).getDirectoryEntries())
        if (fileRef.location.endsWith(".xml") && matches(fileRef.location)) found.push([fileRef.location, "", fileRef.location])
    return found
}

// what a screen shows of the demo records (data/BossDemoData.xml), by app and path, with the id parameters of a screen
// that opens on one
const demoRecords = {
    "Shared/ProductImport/": {text:"Product import"},
    "Shared/CatalogChecks/": {parameters:{runChecks:true,productIds:"BOSS_CHK_EMPTY",checkIds:"requiredFields"},text:"Catalog checks"},
    "Shared/Units/": {text:"Units and conversions"},
    "Shared/Packaging/": {parameters:{baseProductId:"BOSS_PRD_OWN"},text:"Product packaging"},
    "Shared/Labels/": {text:"Product labels"},
    "Shared/IdentificationTypes/": {parameters:{organizationPartyId:"ORG_ZIZI_SERVICES"},text:"Identification types"},
    "Shared/Documents/": {parameters:{productId:"BOSS_PRD_OWN"},text:"Catalog documents"},
    "Shared/DocumentDetail/": {parameters:{productId:"BOSS_PRD_OWN",productContentId:"BOSS_CONTENT_SAMPLE"},text:"Document detail"},
    "Shared/CategoryContent/": {parameters:{productCategoryId:"BOSS_PRD_CAT"},text:"Catalog documents"},
    "Shared/Translations/": {parameters:{productId:"BOSS_PRD_OWN"},text:"Catalog translations"},
    "Products/Documents": {text:"Catalog documents"},
    "Products/Translations": {text:"Catalog translations"},
    "Products/Categories/CategoryDetail/Content": {parameters:{productCategoryId:"BOSS_PRD_CAT"},text:"m-subscreens-active"},
    "Shared/StandardCosts/": {parameters:{productId:"BOSS_PRD_OWN",productStandardCostId:"BOSS_COST_SAMPLE"},text:"Standard costs"},
    "Shared/CostRollup/": {parameters:{productId:"BOSS_PRD_OWN"},text:"Cost roll-up"},
    "Shared/CostHistory/": {parameters:{productId:"BOSS_PRD_OWN"},text:"Cost history"},
    "Shared/InventoryValuation/": {parameters:{productId:"BOSS_PRD_OWN",productStandardCostId:"BOSS_COST_SAMPLE"},text:"Inventory revaluation"},
    "Products/InventoryValuation": {parameters:{productId:"BOSS_PRD_OWN",productStandardCostId:"BOSS_COST_SAMPLE"},text:"Inventory revaluation"},
    "Products/Prices/StandardCosts": {text:"m-subscreens-active"},
    "Products/Prices/CostRollup": {text:"m-subscreens-active"},
    "Products/Prices/CostHistory": {text:"m-subscreens-active"},
    "Shared/BillOfMaterialsDetail/": {parameters:{productId:"DEMO_1_1",organizationPartyId:"ORG_ZIZI_RETAIL"},text:"Method header"},
    "Shared/BillOfMaterialsExplosion/": {parameters:{productId:"DEMO_1_1",organizationPartyId:"ORG_ZIZI_RETAIL"},text:"BOM explosion"},
    "Shared/BillOfMaterialsCompare/": {parameters:{productId:"DEMO_1_1",organizationPartyId:"ORG_ZIZI_RETAIL"},text:"Compare method dates"},
    "Shared/WhereUsed/": {parameters:{productId:"DEMO_1_1",organizationPartyId:"ORG_ZIZI_RETAIL"},text:"Where used"},
    "Shared/RoutingDetail/": {parameters:{productId:"DEMO_1_1",organizationPartyId:"ORG_ZIZI_RETAIL"},text:"Routing standards"},
    "Shared/InventoryAvailability/": {parameters:{productId:"BOSS_PRD_OWN",facilityId:"BOSS_PRD_WH"},text:"Current inventory"},
    "Shared/SupplierPrices/": {parameters:{organizationPartyId:"ORG_ZIZI_SERVICES"},text:"Supplier offers"},
    "Shared/Supplier360/": {parameters:{vendorPartyId:"BOSS_PRD_SUPPLIER",organizationPartyId:"ORG_ZIZI_SERVICES"},text:"Services Supply"},
    "Products/SupplierPrices": {text:"Supplier offers"},
    "Products/Suppliers": {text:"Supplier offers"},
    "Shared/PriceLists/": {text:"Find price lists"},
    "Shared/PriceListDetail/": {parameters:{priceListId:"BOSS_PRICE_LIST"},text:"Services catalog policy"},
    "Shared/PriceExplain/": {parameters:{productId:"BOSS_PRD_OWN",organizationPartyId:"ORG_ZIZI_SERVICES"},text:"Resolved price"},
    "Products/Prices/PriceLists": {text:"m-subscreens-active"},
    "Products/Prices/PriceLists/PriceListDetail": {parameters:{priceListId:"BOSS_PRICE_LIST"},text:"Services catalog policy"},
    "Products/Prices/PriceExplain": {parameters:{productId:"BOSS_PRD_OWN",organizationPartyId:"ORG_ZIZI_SERVICES"},text:"m-subscreens-active"},
    "Products/Settings/PricingSettings": {parameters:{organizationPartyId:"ORG_ZIZI_SERVICES"},text:"Organization pricing defaults"},
    "Insights/Dashboard": {parameters: {definitionId: "mantle-sales", from: "now-1y", thru: "now"}},
    "Products/Products/VariantBuilder": {parameters: {productId: "BOSS_PRD_VIRT"}, text: "Build variants"},
    "Products/Products/VariantBuilderTui": {parameters: {productId: "BOSS_PRD_VIRT"}, text: "Variant setup"},
    "Products/Settings/VariantSettings": {parameters: {organizationPartyId: "ORG_ZIZI_SERVICES"}, text: "Variant policy"},
    "Products/Prices/List": {parameters: {productId: "BOSS_PRD_OWN"}, text: "Price scope"},
    "Products/Prices/PriceHistory": {parameters: {productId: "BOSS_PRD_OWN"}, text: "Price changes"},
    "Products/Products/BulkPrice": {parameters: {productIds: "BOSS_PRD_OWN"}, text: "Price change setup"},
    "Products/Home": {text: "Your catalog"},
    "Products/Products": {parameters: {text: "catalog sample"}, text: "Services catalog sample"},
    "Products/Products/List": {parameters: {text: "catalog sample"}, text: "Services catalog sample"},
    "Products/Categories/CategoryDetail": {parameters: {productCategoryId: "BOSS_PRD_CAT"}, text: "Services catalog"},
    "Shared/Product360/": {parameters: {productId: "BOSS_PRD_OWN"}, text: "Services catalog sample"},
    // M2: Today, notifications, quick create, Home and the settings (the demo of service/ironstone/commons/DemoServices.xml), on text
    // that does not depend on the time of day the data was loaded
    "Commons/Home": { text: "Get started" },
    "Commons/Panel/Today": { text: "1 approval waiting" },
    "Commons/Panel/Notifications": { text: "Approve the shared calendar subscription: USD 120.00 a year" },
    "Commons/Notifications": { text: "Approve the shared calendar subscription: USD 120.00 a year" },
    "Commons/QuickCreate": { parameters: { kind: "task" }, text: "Assignee" },
    "Commons/Settings/Index": { text: "Comms settings" },
    "Commons/Settings/Notifications": { text: "Purchase Approval (demo)" },
    "Commons/Settings/Preferences": { text: "Keyboard shortcuts" },
    "Commons/Settings/Account": { text: "john.doe" },
    "Commons/Calendar/EventDetail": { parameters: { workEffortId: "BOSS_DEMO_EVENT" }, text: "Weekly team meeting" },
    // M7: the calendar's resource detail (under the .qvue Schedules, which writes no subscreen here: test/Schedules.spec.js
    // checks its content) and settings (the demo of data/BossCalendarDemoData.xml)
    "Commons/Calendar/Schedules/ResourceDetail": { parameters: { resourceType: "room", resourceId: "BOSS_DEMO_ROOM_MAPLE" } },
    "Commons/Settings/Calendars": { text: "Holidays (demo feed)" },
    // M6: Tasks and Requests, each a list (the default subscreen) and a detail
    "Commons/Requests": { text: "Set up the shared team calendar" },
    "Commons/Requests/List": { text: "Printer on the second floor jams" },
    "Commons/Requests/RequestDetail": { parameters: { requestId: "BOSS_DEMO_REQUEST" }, text: "Set up the shared team calendar" },
    // M4: Contacts (the split and the record), Compare, Duplicates, the import wizard's steps (no import yet) and the contact books
    "Commons/Contacts/List": { text: "Mary Doe" },
    "Commons/Contacts/ContactDetail": { parameters: { partyId: "ORG_ACME_BA" }, text: "Bob Acme" },
    "Commons/Contacts/Compare": { parameters: { partyId: "BOSS_DEMO_DUP_A", otherPartyId: "BOSS_DEMO_DUP_B" }, text: "Side by side" },
    "Commons/Contacts/Duplicates": { text: "Same email" },
    "Commons/Contacts/Import": { text: "Import contacts" },
    // the steps render inside the wizard's panel, which the client fills: here only that they render (test/ContactImport.spec.js
    // walks them)
    "Commons/Contacts/Import/Source": {},
    "Commons/Contacts/Import/Mapping": {},
    "Commons/Contacts/Import/Options": {},
    "Commons/Contacts/Import/Preview": {},
    "Commons/Contacts/Import/Result": {},
    "Commons/Settings/ContactBooks": { text: "Team Contacts" },
    "Commons/Tasks": { text: "Review the open support requests" },
    "Commons/Tasks/List": { text: "Plan the office move" },
    // the shared work item detail (Commons mounts it at Tasks/TaskDetail, Projects at WorkItems/WorkItemDetail), here in the
    // Commons context
    "Shared/WorkItemDetail/": { parameters: { workEffortId: "BOSS_DEMO_TASK" }, text: "Review the open support requests" },
    // P5: the shared request detail, here in the Commons context (no app root)
    "Shared/RequestDetail/": { parameters: { requestId: "BOSS_DEMO_REQUEST" }, text: "Set up the shared team calendar" },
    // M9: Knowledge and Notes (.qvue screens: their components) and Knowledge's Spaces, SpaceDetail and Review on the knowledge
    // demo (data/BossKnowledgeDemoData.xml; test/Knowledge.spec.js, KnowledgeReview.spec.js and Notes.spec.js call their transitions)
    "Commons/Knowledge": { text: "BossKnowledge" },
    "Commons/Notes": { text: "BossNotes" },
    "Commons/Knowledge/Spaces": { text: "Team handbook" },
    "Commons/Knowledge/SpaceDetail": { parameters: { wikiSpaceId: "BOSSKB" }, text: "Policies/Security" },
    "Commons/Knowledge/Review": { text: "Release process" },
    // M8: Files (a .qvue screen: its component), the drives with one drive's settings and members, the shares (the files demo of
    // data/BossFilesDemoData.xml)
    "Commons/Files": { text: "BossFiles" },
    "Commons/Files/Drives": { text: "Team" },
    "Commons/Files/DriveSettings": { parameters: { driveId: "BOSS_DEMO_TEAM" }, text: "Joe Developer" },
    "Commons/Files/Shares": { text: "Photos for the family" },
    // M5: the Inbox (the default subscreen Inbox/Mail, a .qvue screen like Compose) and MessageDetail on a message of the mail
    // demo (data/BossMailDemoData.xml) that no spec changes
    "Comms/Inbox": { text: "Inbox" },
    // M10: Chat and the tray's Chat tab (.qvue screens: their components, the room view in Chat's), and the chat settings
    "Comms/Chat": { text: "BossChatRoom" },
    "Comms/Panel/Chat": { text: "BossChatPanel" },
    "Comms/Settings/Chat": { text: "Do not disturb hours" },
    "Comms/Inbox/MessageDetail": { parameters: { emailMessageId: "BOSS_DEMO_MAIL_INVOICE" }, text: "Invoice INV-1042 is due on the 30th" },
    // M5: Comms Home and the mail settings (the demo of load#MailSettingsDemo: the shared Support account whose sign-in failed,
    // rules, an automatic reply, text blocks); the list, the account's page and the wizard's steps are a level deeper, inside
    // MailAccounts' panel, which the client fills (test/MailAccounts.spec.js renders and walks them)
    "Comms/Home": { text: "Needs reply" },
    "Comms/Settings/Index": { text: "Identities and signatures" },
    "Comms/Settings/MailAccounts/Account": { parameters: { emailAccountId: "BOSS_DEMO_MAIL_SUPPORT" } },
    "Comms/Settings/Identities": { text: "Ziziwork Support" },
    "Comms/Settings/OutOfOffice": { text: "Away until Monday" },
    "Comms/Settings/TextBlocks": { text: "Directions to the office" },
    // M11: the consent registry and one contact's consent (data/BossConsentDemoData.xml); the public page /u/<token> is
    // test/Unsubscribe.spec.js's
    "Comms/Consent": { text: "Alex Rivera" },
    "Comms/Consent/List": { text: "Alex Rivera" },
    "Comms/Consent/Contact": { parameters: { partyId: "BOSS_DEMO_CON_ALEX" }, text: "alex.rivera@example.com" },
    "Insights/ReportBuilder/Datasets": { text: "BOSS_DEMO_PRODUCTS" },
    "Insights/ReportBuilder/DatasetDetail": { parameters: { dataDocumentId: "BOSS_DEMO_PRODUCTS" }, text: "Products" },
    "Insights/ReportBuilder/DatasetDetail/FieldList": { parameters: { dataDocumentId: "BOSS_DEMO_PRODUCTS" }, text: "productName" },
    "Insights/ReportBuilder/DatasetView": { parameters: { dataDocumentId: "BOSS_DEMO_PRODUCTS" }, text: "Demo Product One-One" },
    "Insights/ScheduledReports": { text: "Open tasks by priority" },
    "Insights/ScheduledReports/ScheduledReportDetail": { parameters: { screenScheduledId: "BOSS_DEMO_MY_TASKS" }, text: "Open tasks" },
    // Projects P1: the sections show their default placeholder (design-projects.md §1.2), and the first port's time entry list
    // (Time/TimeEntries) john.doe's time
    // Projects P2: Home, the project list (the default of Projects), the NewProject wizard and its steps (the fragment is the
    // wizard's level: test/NewProject.spec.js renders the steps), ProjectDetail and its tabs on IRON (the fragment is the detail's
    // level, its header: test/ProjectDetail.spec.js renders the tabs), the status report, and the settings pages
    "Projects/Home": { text: "My open items" },
    // Projects P9: the report index and each report on the demo (the support desk's time, IRON's sprints and breakdown)
    "Projects/Reports": { text: "Profitability report" },
    "Projects/Reports/Index": { text: "Utilization report" },
    "Projects/Reports/Time": { text: "IronStone support desk (SUPP)" },
    "Projects/Reports/WorkItems": { text: "Work item report" },
    "Projects/Reports/Sprints": { parameters: { rootWorkEffortId: "IRON" }, text: "Sprint 1" },
    "Projects/Reports/Portfolio": { text: "IronStone support desk" },
    "Projects/Reports/Progress": { parameters: { rootWorkEffortId: "IRON" }, text: "General availability" },
    "Projects/Reports/Profitability": { text: "Brightwater Dental Group" },
    "Projects/Reports/Utilization": { text: "Joe Developer" },
    "Projects/Projects": { text: "Acme customer portal" },
    "Projects/Projects/List": { parameters: { list: "all" }, text: "Hiring plan 2027" },
    "Projects/Projects/NewProject": { text: "New project" },
    "Projects/Projects/NewProject/Start": { text: "New project" },
    "Projects/Projects/NewProject/Team": { text: "New project" },
    "Projects/Projects/NewProject/Modules": { text: "New project" },
    "Projects/Projects/NewProject/Money": { text: "New project" },
    "Projects/Projects/NewProject/Review": { text: "New project" },
    "Projects/Projects/ProjectDetail": { parameters: { workEffortId: "IRON" }, text: "ProjectStatusBar" },
    "Projects/Projects/ProjectDetail/Overview": { parameters: { workEffortId: "IRON" }, text: "ProjectStatusBar" },
    "Projects/Projects/ProjectDetail/Team": { parameters: { workEffortId: "IRON" }, text: "ProjectStatusBar" },
    "Projects/Projects/ProjectDetail/Files": { parameters: { workEffortId: "IRON" }, text: "ProjectStatusBar" },
    "Projects/Projects/ProjectDetail/Settings": { parameters: { workEffortId: "IRON" }, text: "ProjectStatusBar" },
    "Projects/Projects/StatusReport": { parameters: { workEffortId: "IRON" }, text: "Open the printable status report" },
    // P4b: the roadmap, a milestone and a release (data/BossProjectsDemoData.xml)
    "Projects/Projects/Roadmap": { text: "General availability" },
    "Projects/Projects/MilestoneDetail": { parameters: { workEffortId: "IRON-MS-1" }, text: "MilestoneStatusBar" },
    "Projects/Projects/ReleaseDetail": { parameters: { workEffortId: "IRON-REL-2" }, text: "ReleaseStatusBar" },
    "Projects/Settings": { text: "Projects settings" },
    "Projects/Settings/Index": { text: "Projects settings" },
    "Projects/Settings/WorkItemTypes": { text: "Bug Fix" },
    "Projects/Settings/Workflows": { text: "In Review" },
    "Projects/Settings/Labels": { text: "Services" },
    "Projects/Settings/Templates": { text: "Client web site" },
    // Projects P2: the work items, their list the default of WorkItems, and the quick-create forms
    "Projects/WorkItems": { text: "Expand and collapse rows" },
    "Projects/WorkItems/List": { parameters: { rootWorkEffortId: "IRON", list: "all" }, text: "Write the getting started guide" },
    "Projects/QuickCreate": { parameters: { kind: "workItem" }, text: "QuickWorkItem" },
    "Projects/QuickProject": { text: "From template" },
    // P5: Requests (the triage list) and its detail, the project's intake settings
    "Projects/Requests": { parameters: { list: "all" }, text: "users to a spreadsheet" },
    "Projects/Requests/List": { parameters: { list: "all" }, text: "Bring over the tickets of the old tracker" },
    "Projects/Requests/RequestDetail": { parameters: { requestId: "BOSS_DEMO_PREQ_ACME1" }, text: "RequestStatusBar" },
    "Projects/Settings/Intake": { text: "support+iron@ziziwork.example" },
    // Projects P3b1: the code screens on the code demo (service/ironstone/projects/CodeDemoServices.xml), a RepositoryDetail tab by its
    // header (the shell loads the tab after it); without git hosting in the build (codeText given) each says so instead
    "Projects/Code": { codeText: "acme-portal" },
    "Projects/Code/Repositories": { parameters: { list: "all" }, codeText: "IronStone Projects, the app" },
    "Projects/Code/RepositoryDetail": { parameters: { repositoryId: "iron" }, codeText: "IronStone Projects, the app" },
    "Projects/Code/RepositoryDetail/Files": { parameters: { repositoryId: "iron" }, codeText: "IronStone Projects, the app" },
    "Projects/Code/RepositoryDetail/Commits": { parameters: { repositoryId: "iron" }, codeText: "IronStone Projects, the app" },
    "Projects/Code/RepositoryDetail/Branches": { parameters: { repositoryId: "iron" }, codeText: "IronStone Projects, the app" },
    "Projects/Code/RepositoryDetail/Tags": { parameters: { repositoryId: "iron" }, codeText: "IronStone Projects, the app" },
    "Projects/Code/RepositoryDetail/MergeRequests": { parameters: { repositoryId: "iron", list: "all" }, codeText: "Expand and collapse rows (IRON-3)" },
    "Projects/Code/RepositoryDetail/Activity": { parameters: { repositoryId: "iron" }, codeText: "IronStone Projects, the app" },
    "Projects/Code/RepositoryDetail/Settings": { parameters: { repositoryId: "iron" }, codeText: "IronStone Projects, the app" },
    "Projects/Code/Compare": { parameters: { repositoryId: "iron", head: "IRON-3-expand-collapse" }, codeText: "Able to merge" },
    "Projects/Code/CommitDetail": { parameters: { repositoryId: "iron", commitId: "main" }, codeText: "IRON-3 Expand and collapse rows" },
    "Projects/Code/GitAccess": { text: "How to clone" },
    // Projects P3b2: the merge requests, the demo's !1 (its id is looked up in setupSpec), a tab by its header
    "Projects/Code/MergeRequests": { parameters: { list: "all" }, codeText: "Expand and collapse rows (IRON-3)" },
    "Projects/Code/MergeRequestDetail": { mergeRequest: true, codeText: "Expand and collapse rows (IRON-3)" },
    "Projects/Code/MergeRequestDetail/Overview": { mergeRequest: true, codeText: "Expand and collapse rows (IRON-3)" },
    "Projects/Code/MergeRequestDetail/Commits": { mergeRequest: true, codeText: "Expand and collapse rows (IRON-3)" },
    // a .qvue tab: its component with git hosting; without it (lite) MergeRequestDetail says so and the tab answers nothing
    "Projects/Code/MergeRequestDetail/Changes": { mergeRequest: true, codeOnlyQvue: true },
    "Projects/Code/MergeRequestDetail/ChangesTui": { mergeRequest: true, codeText: "Expand and collapse rows (IRON-3)" },
    "Projects/Settings/Code": { text: "Repository defaults" },
    "Projects/Projects/ProjectDetail/Code": { parameters: { workEffortId: "IRON" }, text: "ProjectStatusBar" },
    // Projects P4a: the Backlog (a .qvue, its component; also ProjectDetail's Backlog tab), its terminal twin, SprintDetail on the active
    // sprint and the sprint report
    "Projects/WorkItems/Backlog": { parameters: { rootWorkEffortId: "IRON" } },
    "Projects/WorkItems/BacklogTui": { parameters: { rootWorkEffortId: "IRON" }, text: "Approve submitted time" },
    "Projects/WorkItems/SprintDetail": { parameters: { workEffortId: "IRON-SP-2" }, text: "The tree view and the timer." },
    "Projects/WorkItems/SprintReport": { parameters: { workEffortId: "IRON-SP-1" }, text: "Open the printable sprint report" },
    // Projects P4c: the Timeline (a .qvue, its component; also the Timeline of ProjectDetail's Plan tab, which test/TimelineWalk.spec.js
    // renders) and its terminal twin, the Plan tab and its Calendar (Commons' Calendar.qvue in its project mode), the work item import
    // wizard's steps (no import yet; test/TimelineWalk.spec.js walks them) and its progress
    "Projects/WorkItems/Timeline": { parameters: { rootWorkEffortId: "IRON" } },
    "Projects/WorkItems/TimelineTui": { parameters: { rootWorkEffortId: "IRON" }, text: "Weekly timesheet grid" },
    "Projects/Projects/ProjectDetail/Plan": { parameters: { workEffortId: "IRON" }, text: "ProjectStatusBar" },
    "Projects/Projects/ProjectDetail/Plan/Calendar": { parameters: { workEffortId: "IRON" } },
    "Projects/Projects/ProjectDetail/Plan/CalendarTui": { parameters: { workEffortId: "IRON", date: "2026-10-26" }, text: "ProjectStatusBar" },
    "Projects/WorkItems/Import": { text: "Import work items" },
    "Projects/WorkItems/Import/Source": {},
    "Projects/WorkItems/Import/Mapping": {},
    "Projects/WorkItems/Import/Options": {},
    "Projects/WorkItems/Import/Preview": {},
    "Projects/WorkItems/Import/Result": {},
    "Projects/WorkItems/ImportProgress": {},
    // Projects P6a: Time opens on My time (a .qvue: its component; in qvt it says so), its terminal twin on john.doe's week with his
    // running timer, the timesheets (To approve: Joe's submitted week) and one timesheet (Joe's, looked up in setupSpec)
    "Projects/Time": { text: "My time opens in the browser app" },
    "Projects/Time/MyTime": {},
    "Projects/Time/MyTimeTui": { text: "Triage of the new tickets" },
    "Projects/Time/Timesheets": { parameters: { list: "toApprove" }, text: "Joe Developer" },
    "Projects/Time/TimesheetDetail": { timesheet: true, text: "Upgraded the client servers" },
    // Projects P9: the timesheet's print and the team timesheet (the demo's support desk time)
    "Projects/Time/TimesheetPrint": { timesheet: true, text: "Open the printable timesheet" },
    "Projects/Time/TeamTimesheet": { parameters: { itemId: "SUPP-1" }, text: "Open the printable team timesheet" },
    // Projects P7: Resources opens on the team planner (a .qvue: its component; in qvt it says so), its terminal twin on the demo's
    // allocations, Allocations (All: the demo's on IRON, ACME and SUPP), its dialogs (a new allocation; staffing the demo's placeholder,
    // looked up in setupSpec) by the list they open over, and PersonDetail on Joe Developer with its tabs by its header (the shell loads
    // a tab after it; test/Resources.spec.js renders the tabs themselves)
    "Projects/Resources": { text: "The team planner opens in the browser app" },
    "Projects/Resources/TeamPlanner": {},
    "Projects/Resources/TeamPlannerTui": { text: "Joe Developer" },
    "Projects/Resources/Allocations": { parameters: { list: "all" }, text: "Acme customer portal" },
    "Projects/Resources/Allocations/EditAllocation": { text: "Acme customer portal" },
    "Projects/Resources/Allocations/Staff": { placeholder: true, text: "Acme customer portal" },
    "Projects/Resources/PersonDetail": { parameters: { partyId: "ORG_ZIZI_JD" }, text: "Joe Developer" },
    "Projects/Resources/PersonDetail/Overview": { parameters: { partyId: "ORG_ZIZI_JD" }, text: "Joe Developer" },
    "Projects/Resources/PersonDetail/Allocations": { parameters: { partyId: "ORG_ZIZI_JD" }, text: "Joe Developer" },
    "Projects/Resources/PersonDetail/WorkItems": { parameters: { partyId: "ORG_ZIZI_JD" }, text: "Joe Developer" },
    "Projects/Resources/PersonDetail/Time": { parameters: { partyId: "ORG_ZIZI_JD" }, text: "Joe Developer" },
    "Projects/Resources/PersonDetail/Capacity": { parameters: { partyId: "ORG_ZIZI_JD" }, text: "Joe Developer" },
    // Projects P8a: Billing opens on Unbilled (the demo's support desk time, its client Brightwater), the invoice dialog on SUPP (its approved
    // week is on the demo's invoice, so it says why there is nothing to invoice), the invoices, the demo's draft invoice (looked up in
    // setupSpec) in the shared detail and in print, the rates and the billing settings
    "Projects/Billing": { text: "IronStone support desk" },
    "Projects/Billing/Unbilled": { text: "IronStone support desk" },
    "Projects/Billing/Unbilled/CreateInvoice": { parameters: { workEffortId: "SUPP" }, text: "Brightwater Dental Group" },
    "Projects/Billing/Invoices": { parameters: { list: "all" }, text: "Brightwater Dental Group" },
    "Projects/Billing/InvoicePrint": { invoice: true, text: "Open the printable invoice" },
    "Projects/Billing/Rates": { text: "IronStone support desk" },
    "Shared/InvoiceDetail/": { invoice: true, text: "Brightwater Dental Group" },
    "Projects/Settings/Billing": { text: "Billing defaults" },
    // Projects P8b: the Money tab on ACME (by the header of ProjectDetail, as the shell loads the tab after it: test/MilestoneBillingWalk.spec.js
    // renders the tab itself), the estimate print, the shared order detail on Acme's order (data/BossProjectsDemoDataTimeBilling.xml)
    "Projects/Projects/ProjectDetail/Money": { parameters: { workEffortId: "ACME" }, text: "ProjectStatusBar" },
    // the client's Hours tab (impl-projects.md P10b): the header still renders here (the shell's -2 level); the tab itself is
    // refused to an internal user (P11, F133: test/ClientBilling.spec.js and test/ProjectsTui.spec.js)
    "Projects/Projects/ProjectDetail/ClientHours": { parameters: { workEffortId: "ACME" }, text: "ProjectStatusBar" },
    "Projects/Projects/EstimatePrint": { parameters: { workEffortId: "ACME" }, text: "Open the printable estimate" },
    "Shared/OrderDetail/": { parameters: { orderId: "BOSS_DEMO_ACME_SO" }, text: "Customer portal, fixed fee" },
    // Projects P6b: Time entries (All: the demo's support desk time John Doe manages, on SUPP-2 so the time the specs before this
    // one log does not push it past the first page), the entry dialog (a new entry), the time import wizard's steps (no import yet;
    // test/TimeEntries.spec.js walks them) and its progress, and the time settings
    "Projects/Time/TimeEntries": { parameters: { list: "all", itemId: "SUPP-2" }, text: "Upgraded the client servers" },
    "Projects/Time/TimeEntries/EditEntry": { text: "Log time" },
    "Projects/Time/Import": { text: "Import time" },
    "Projects/Time/Import/Source": {},
    "Projects/Time/Import/Preview": {},
    "Projects/Time/Import/Result": {},
    "Projects/Time/ImportProgress": {},
    "Projects/Settings/Time": { text: "Timesheet policy" },
}

spec({
    setupSpec() {
        login("john.doe")
        placeholders = findScreenFiles(apps, isPlaceholder)
        screens = findScreenFiles(["Commons", "Comms", "Insights", "Projects", "Products"], (location) => !isPlaceholder(location))
        for (const tab of ["Summary", "Features", "Categories", "Identifiers", "Dimensions", "Documents", "Associations", "Parties", "Connections", "History", "KitComponents", "Equipment"]) {
            const path = 'Products/Product360/' + tab
            screens.push([`${base}/Products.xml`, path, `${base}/Shared/Product360/${tab}.xml`])
            demoRecords['Products/' + path] = {parameters: {productId: tab === 'KitComponents' ? 'DEMO_PA' : tab === 'Equipment' ? 'EQUIP_1' : 'BOSS_PRD_OWN'}}
        }
        demoRecords['Products/Categories/CategoryDetail']={parameters:{productCategoryId:'BOSS_PRD_CAT'}}
        demoRecords['Products/Categories/CategoryDetail/Summary']={parameters:{productCategoryId:'BOSS_PRD_CAT'}}
        demoRecords['Products/Categories/CategoryDetail/Parents']={parameters:{productCategoryId:'BOSS_PRD_CAT'}}
        demoRecords['Products/Categories/CategoryDetail/Products']={parameters:{productCategoryId:'BOSS_PRD_CAT'}}
        demoRecords['Products/Categories/CategoryDetail/FeatureDefaults']={parameters:{productCategoryId:'BOSS_PRD_CAT'}}
        demoRecords['Products/Categories/CategoryDetail/Identifiers']={parameters:{productCategoryId:'BOSS_PRD_CAT'}}
        demoRecords['Products/Features/FeatureDetail']={parameters:{productFeatureId:'BOSS_PRD_FEATURE'}}
        demoRecords['Products/Features/FeatureDetail/Summary']={parameters:{productFeatureId:'BOSS_PRD_FEATURE'}}
        demoRecords['Products/Features/FeatureDetail/Groups']={parameters:{productFeatureId:'BOSS_PRD_FEATURE'}}
        demoRecords['Products/Features/FeatureDetail/Products']={parameters:{productFeatureId:'BOSS_PRD_FEATURE'}}
        demoRecords['Products/Features/FeatureDetail/Interactions']={parameters:{productFeatureId:'BOSS_PRD_FEATURE'}}
        demoRecords['Products/Features/FeatureGroups/FeatureGroupDetail']={parameters:{productFeatureGroupId:'BOSS_PRD_GROUP'}}
        demoRecords['Products/Features/FeatureGroups/FeatureGroupDetail/Summary']={parameters:{productFeatureGroupId:'BOSS_PRD_GROUP'}}
        demoRecords['Products/Features/FeatureGroups/FeatureGroupDetail/Features']={parameters:{productFeatureGroupId:'BOSS_PRD_GROUP'}}
        demoRecords['Products/Features/FeatureGroups/FeatureGroupDetail/Categories']={parameters:{productFeatureGroupId:'BOSS_PRD_GROUP'}}
        // the code screens show the demo's repositories with git hosting in the build, else that it is not
        const wasDisabled = ec.artifactExecution.disableAuthz()
        let codeHosting
        try { codeHosting = !!call("ironstone.projects.CodeServices.get#CodeHosting", {}).available } finally { if (!wasDisabled) ec.artifactExecution.enableAuthz() }
        for (const demo of Object.values(demoRecords)) if (demo.codeText) demo.text = codeHosting ? demo.codeText : "Code hosting is not in this build"
        // without git hosting such a tab answers nothing (its MergeRequestDetail says hosting is not in this build): no error is enough
        for (const demo of Object.values(demoRecords)) if (demo.codeOnlyQvue && !codeHosting) demo.noComponent = true
        // the demo's merge request !1 of iron (a sequenced id)
        const mergeRequest = ec.entity.find("moqui.resource.GitMergeRequest").condition({ repositoryId: "iron", mergeRequestNum: 1 }).disableAuthz().one()
        for (const demo of Object.values(demoRecords)) if (demo.mergeRequest) demo.parameters = { mergeRequestId: mergeRequest ? mergeRequest.mergeRequestId : "_NA_" }
        // the time demo's submitted week of Joe Developer (a sequenced id)
        const sheet = Array.from(ec.entity.find("mantle.work.time.Timesheet").condition({ partyId: "ORG_ZIZI_JD", statusId: "TmshCompleted" }).disableAuthz().list())[0]
        for (const demo of Object.values(demoRecords)) if (demo.timesheet) demo.parameters = { timesheetId: sheet ? sheet.timesheetId : "_NA_" }
        // the resource demo's placeholder UI designer on ACME (a sequenced id)
        const placeholder = Array.from(ec.entity.find("mantle.work.effort.WorkEffortAllocation").condition({ rootWorkEffortId: "ACME" })
                .condition("partyId", "is-null", null).disableAuthz().list())[0]
        for (const demo of Object.values(demoRecords)) if (demo.placeholder) demo.parameters = { workEffortAllocationId: placeholder ? placeholder.workEffortAllocationId : "_NA_" }
        // the billing demo's draft invoice of SUPP (a sequenced id)
        const invoiceLink = Array.from(ec.entity.find("mantle.work.effort.WorkEffortInvoice").condition({ workEffortId: "SUPP" }).disableAuthz().list())[0]
        for (const demo of Object.values(demoRecords)) if (demo.invoice) demo.parameters = { invoiceId: invoiceLink ? invoiceLink.invoiceId : "_NA_" }
    },
    setup() { ec.artifactExecution.disableAuthz() },
    cleanup() { ec.artifactExecution.enableAuthz() },
})

feature("app root #app renders its default screen and its menu", {
    where: apps.map((app) => ({ app })),
    expect({ app }) {
        const str = ec.screen.makeTest().rootScreen(`${base}/${app}.xml`).renderMode("qvt").withStaticData().render("", {}, null)
        str.status == 200
        str.errorMessages.length == 0
        !/Error rendering|Exception in render/.test(str.output)
        menuError(app) == null
    },
})

feature("every placeholder screen renders in qvt without errors, with its menu", {
    when() {
        const failures = []
        for (const [root, path] of placeholders) {
            // the screen as the shell fetches it: a fragment of the last standalone screen, not the root placeholder
            const str = ec.screen.makeTest().rootScreen(root).renderMode("qvt").withStaticData().render(path, { lastStandalone: "-2" }, null)
            const where = `${root.substring(base.length + 1)} ${path}`.trim()
            if (str.status != 200 || str.errorMessages.length > 0 || !str.output.includes("Placeholder:")
                    || /Error rendering|Exception in render/.test(str.output))
                failures.push(`${where}: status ${str.status}, ${str.errorMessages.join(" | ") || "no placeholder text"}`)
            ec.message.clearErrors()
            // a Shared screen is not mounted, so it has no menu of its own
            const app = root.substring(base.length + 1).replace(/\.xml$/, "")
            const menu = apps.includes(app) ? menuError(`${app}/${path}`) : null
            if (menu) failures.push(menu)
            ec.message.clearErrors()
        }
        if (failures.length) log.warn(`Placeholder failures:\n${failures.join("\n")}`)
        return { failures }
    },
    then({ failures }) {
        // fewer as the milestones replace them (129 after M4, 114 after M10 and the Comms mail settings, 110 after M9's
        // Knowledge and Notes, 104 after M8's Files and Shares and the public page moved out of Commons; Projects P1 adds the
        // placeholders of its menu, 25 more, which its phases replace: 102 after P7's Team planner and Allocations, 98 after P8a's billing, 97 after P9's reports; Products P2 replaces Settings; P6 replaces SupplierPrices)
        placeholders.length >= 80
        failures.join("\n") == ""
    },
})

feature("every other Commons, Comms, Insights, Projects and Shared screen renders in qvt (a .qvue screen in qvue) without errors, with its menu", {
    when() {
        const failures = []
        for (const [root, path, location] of screens) {
            const app = root.substring(base.length + 1).replace(/\.xml$/, "")
            const demo = demoRecords[`${app}/${path}`] || {}
            const parameters = Object.assign({ lastStandalone: "-2" }, demo.parameters)
            // a .qvue screen (render-modes "vue,qvue", with qvt and html after them for Inbox/Mail, a default subscreen whose
            // parents' levels the shell loads in qvt) answers its component in the qvue render mode
            const qvue = /render-modes="vue,qvue[",]/.test(ec.resource.getLocationReference(location).getText())
            const str = ec.screen.makeTest().rootScreen(root).renderMode(qvue ? "qvue" : "qvt").withStaticData().render(path, parameters, null)
            const where = `${root.substring(base.length + 1)} ${path}`.trim()
            const output = str.output || ""
            if (str.status != 200 || str.errorMessages.length > 0 || /Error rendering|Exception in render/.test(output))
                failures.push(`${where}: status ${str.status}, ${str.errorMessages.join(" | ") || output.substring(0, 200)}`)
            else if (qvue && !demo.noComponent && !output.includes("module.exports")) failures.push(`${where}: no component in qvue`)
            else if (demo.text && !output.includes(demo.text)) failures.push(`${where}: no "${demo.text}": ${output.substring(0, 300)}`)
            ec.message.clearErrors()
            const menu = apps.includes(app) ? menuError(`${app}/${path}`) : null
            if (menu) failures.push(menu)
            ec.message.clearErrors()
        }
        if (failures.length) log.warn(`Screen failures:\n${failures.join("\n")}`)
        return { failures }
    },
    then({ failures }) {
        screens.length > 15
        failures.join("\n") == ""
    },
})
