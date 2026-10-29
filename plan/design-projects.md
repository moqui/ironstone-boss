# IronStone BOSS — Projects design

Oct 21, 2026 — draft; the inventories' **Designed in** columns filled from it (§13); the review's answers to the
open questions folded in (§16, §17)

**IronStone Projects** is the app for project managers and services staff (initial-design's app table). This file
adds three audiences to that row: the software teams who deliver the work (developers, testers, release
managers), the consultants and contractors who log time against it, and the clients of a business that sells
project work, who sign in with a narrow view of their own projects. Its sections are Projects and the roadmap,
Work items, Requests (request intake), Code, Time (timesheets), Resources (resource scheduling), Billing (time
and materials billing), Reports and Settings.

The first audience to win is the Moqui community: people who build on Moqui and the service providers who build
and run Moqui systems for clients, who today keep Jira or Redmine beside GitHub or GitLab, a time tracker and an
invoicing tool. For them Projects is one self-hosted system for the whole delivery: requests arrive by email, a
public link or the app; work is planned on boards, in sprints, on a timeline and in releases; code is hosted by
mr-moqui with branches, commits, merge requests and CI statuses tied to the work; documentation can live in the
project's own repository; time is logged against the work, approved weekly and invoiced; and all of it is Mantle
records under one database backup that the same team can extend with Moqui screens and services.

Four decisions shape every screen:

- **One work item record, many views.** A work item is a Mantle `WorkEffort` of type `WetTask` under its
  project, and work items nest to any depth (an epic is an item with sub-items, and may hold epics), so a project
  is also its work breakdown. The list, board, calendar and tree are views of one find (the form-list `views` the
  framework has, and a new `view-tree`), the timeline and the backlog are `.qvue` screens over the same find, and
  milestones, releases, sprints and components are work efforts under the project linked to their items by
  `WorkEffortAssoc`.
- **Code is part of the work.** Repositories are mr-moqui's (`moqui.resource.GitRepository`, cloned and pushed
  over HTTPS and SSH, mr-moqui `docs/interfaces/Git-Hosting.md`), and Mantle's conventions already tie commits, branches and
  tags to work items (`mantle.work.GitServices`, mr-mantle `service/Work.gitecas.xml`). This file adds the
  browser, compare, merge requests with review, CI statuses, webhooks and branch rules, the Development tab of a
  work item, and releases tied to tags.
- **Time is money.** Time entries go against work items, in a weekly grid with a timer; a weekly timesheet is
  approved once for Projects and People; rates are versioned `RateAmount` rows; unbilled time, expenses and
  reached milestones become invoice items in a billing queue. Budgets are caps and estimates on the project.
- **Clients see their part.** A client contact can raise and follow requests through a public link or by email
  without an account, and with an account signs in to Projects alone and sees their projects' requests, shared
  work items, roadmap, published status updates and invoices, and nothing internal.

**Scope against [design-doc-guide.md](design-doc-guide.md).** This is the guide's `design-projects.md`. Two
reused screens of research-crosscut §3 have no base design yet, and Projects is the first app that needs their
full form set: **Task / work item** (§3.12) and **Request / case** (§3.11). This file designs both, as
`Shared/WorkItemDetail` (§5) and `Shared/RequestDetail` (§6) with their Per-app context tables, in the way
design-drawers-commons designs Calendar & schedules, Chatter and Approvals waiting; design-crosscut references them,
and the Commons TaskDetail and RequestDetail built in M6 become those shared screens in the Commons context
(§16). As in design-drawers-commons, the screen table carries the **Impl** column.

**Inputs.** [research-projects.md](research-projects.md) (§1–§16, its candidate inventory and open questions),
[research-crosscut.md](research-crosscut.md) §3–§6 and §8, [initial-design.md](initial-design.md) (its
**Decided** table is fixed), [style-guide.md](style-guide.md) §2–§8,
[design-drawers-commons.md](design-drawers-commons.md) (§1 the shell, §4 Approvals waiting, §7 Calendar, §8 Tasks
and requests, §9 record files, §10 Knowledge, §15 Chatter, §19 its needs), [impl-drawers-commons.md](impl-drawers-commons.md)
(what M0–M11 built), [ss-inventory.md](ss-inventory.md), [usl-inventory.md](usl-inventory.md),
[research-people.md](research-people.md) §7 (time and working schedules),
[research-customer-service.md](research-customer-service.md) §2–§4 (intake and the case detail); mr-moqui
`docs/interfaces/Git-Hosting.md` and `docs/data/Revision-Management.md`, `org.moqui.impl.GitServices` and `UserServices`; Mantle
`mantle.work.ProjectServices`, `TaskServices`, `TimeServices`, `WorkEffortServices`, `GitServices`,
`mantle.request.RequestServices`, `mantle.account.InvoiceServices`, `mantle.humanres.RateServices` and the
entities of `WorkEffortEntities.xml`, `RequestEntities.xml`, `HumanResourcesEntities.xml` and `OrderEntities.xml`;
the SimpleScreens `Project`, `Task` and `Request` trees, the git screens added to them on Oct 20
(`Project/EditRepositories`, `Project/GitCommit`, `Task/EditSource`, `MyAccount/User/GitAccess`), the Party time
and project tabs, `HumanRes/EditRateAmounts` and the project dialogs of `Accounting/Invoice/FindInvoice`.

Sections: [1 shell](#1-shell) · [2 screens](#2-screens) · [3 home](#3-home-and-quick-create) ·
[4 projects](#4-projects-and-the-roadmap) · [5 work items](#5-work-items) · [6 requests](#6-requests) ·
[7 code](#7-code) · [8 time](#8-time) · [9 resources](#9-resources) · [10 billing](#10-billing) ·
[11 reports](#11-reports) · [12 settings](#12-settings) · [13 baseline coverage](#13-baseline-coverage) ·
[14 documents and outputs](#14-documents-and-outputs) · [15 framework and data needs](#15-framework-and-data-needs) ·
[16 decided](#16-decided) · [17 open](#17-open)

---

## 1. Shell

### 1.1 Root, groups and who sees what

Root `screen/Projects.xml`, menu title "IronStone Projects", icon `sym_o_assignment`, default item `Home`,
mounted under the apps root by `MoquiConf.xml` as today. Its `always-actions` set `appRoot` and call
`mantle.party.PartyServices.setup#UserOrganizationInfo`, and it mounts `Chatter` and `RecordFiles` hidden from
`Shared/`, as it does now. The artifact group `BOSS_PROJECTS` (ADMIN only until this file) is authorized for
three new user groups:

| Group | Who | Gets |
| --- | --- | --- |
| `BOSS_PROJECT_TEAM` | Employees and contractors who do project work | Work items, requests, code, their time, the planner read-only, reports without money |
| `BOSS_PROJECT_MANAGER` | Project, delivery and resource managers, and whoever bills the work | Everything above, plus new projects, approvals, allocations, billing, rates, money columns and settings |
| `BOSS_PROJECT_CLIENT` | Client contacts with a user account | Only their projects' shared part (below); no other app |

The team and manager authz carry `MANTLE_ACTIVE_ORG` and `MANTLE_PRIVATE_CONTACT`, as every BOSS app does. The
client authz carries a new filter set, `BOSS_PROJECT_CLIENT` (§15), in place of the organization filter, with
`MANTLE_PRIVATE_CONTACT`. Both internal groups get the `SSH_GIT` permission as seed data, since git over SSH
needs it and `ALL_USERS` cannot hold it (mr-moqui `plans/Remaining-Work.md`).

In the screen table, **Roles** is `app` for all three groups, `internal` for team and managers, `managers`, or
`clients`.

**Which projects a user sees.** This is the rule `mantle.party.CommunicationServices.get#RecordLinkInfo`
already applies to work efforts (impl-drawers-commons R28) and SimpleScreens' FindTask applied to projects,
written down here and extended for work items, requests and clients:

- **Internal users** see a project whose visibility is All users or General (`WevAllUsers`, `WevGeneral`) in
  their organizations, and any project on which they hold a current `WorkEffortParty` role. A project in Work
  group, Restricted or Confidential (`WevWorkGroup`, `WevRestricted`, `WevConfidential`) is seen only by its
  parties and the ADMIN group.
- **A work item** is seen with its project, except a Restricted or Confidential item, which only its own
  parties and the project's managers (`ProjectManager`, `Manager`) see.
- **Requests**: internal users see the requests of the projects they see, the requests without a project of
  the types Projects triages (Settings/Intake), and any request they are a party to (Commons' rule).
- **Client users** see a project when their party, or an organization they are a contact (`PrtContact`) or
  employee (`PrtEmployee`) of, holds `Customer`, `ClientManager` or `ClientBilling` on it and the project allows
  client sign-in (a project setting). Inside it they see work items shared with the client (visibility All
  users or General; Work group is the internal default, §5), the milestones and releases, the status updates
  posted for the client, their organization's requests, and invoices to their organization. They never see
  Chatter notes or activities, time rates or costs, allocations, other clients, settings, or code unless a
  repository is shared with them read-only. The client group is denied Commons, Comms and the other apps
  (§16), so Projects and the public pages are their whole BOSS; since the tray's tabs are Commons and Comms
  screens, clients are told of replies, status updates and approvals by email.
  As built (impl-projects.md P10a): a client is a user with the Mantle permission `PROJECT_CLIENT` (which the
  `BOSS_PROJECT_CLIENT` group holds), whatever its other groups, so the project services know a client without an app's
  group names (`mantle.work.ProjectServices.get#ClientProjectInfo`, `get#VisibleProjectInfo` `isClient`); a contact is
  also a representative (`PrtRepresentative`, as Mantle's own demo contacts are), and client sign-in is the project's
  own `WstClientSignIn` Y with no organization default. The client's organization's requests are those of its projects
  filed by one of its organization's contacts, or with the organization or such a contact as a request party, and
  those it filed. A message is the client's when its party, or its organization or one of its contacts, is the
  message's from, to or a party to it and the message (or its thread's root) is filed on a record the client sees; a
  Comment (a note) never is. P10a makes clients read only in Projects (every IronStone write service and every Mantle
  record write denied), denies Billing until P10b opens Invoices and InvoiceDetail, and shows no time (no hours shared)
  until P10b's client states. As built in P10b: a client's own writes are `ironstone.client.ClientServices` only (the client
  package, which the IronStone service deny pattern does not name; the pattern names every write verb and is checked against
  every service file by test/ClientWrites.spec.js), each allow-remote false and checking the client's access itself before it writes with
  authorization off: Send message and Reply in Chatter (a Message to the record's internal people only: the record's
  assignees or request assignee and the project's managers, never another client, the client's own side or an outside
  party; a reply only to a message or a status update for it), raise a request in a client project with files (the public
  form's kinds and limits), add files to a request it sees while open, cancel a request it raised, and decide a milestone
  gate it is the approver of (approve, or refuse with a reason; the estimate's approval is its Estimate milestone's gate).
  Every refused control is hidden in the client states (row-selection `condition`, board and tree `move-condition`).
  A client user needs both grants (impl-projects.md F134): the `BOSS_PROJECT_CLIENT` group, which holds `PROJECT_CLIENT`
  (the project services' client cases), and the framework's `EXTERNAL_USER` permission (no record-bound chat rooms, public
  rooms only as a member, no records drive folder over the screens, DAV or SFTP, no other user's presence, never the agent
  permissions; mr-moqui P10b). Granting one without the other is a setup mistake: the demo's sheldon.acme and gob.bluth
  hold both, and a client added by hand is given both.

### 1.2 Menu

Depth two, in this order; the detail screens, the wizard, quick create and the public intake page have
`menu-include="false"`. Entries a group does not get are absent for it, not disabled.

- Home — `Projects/Home`
- Projects — `Projects/Projects`
  - Roadmap — `Projects/Projects/Roadmap`
- Work items — `Projects/WorkItems`
  - Backlog — `Projects/WorkItems/Backlog`
  - Timeline — `Projects/WorkItems/Timeline`
  - Import — `Projects/WorkItems/Import` (managers)
- Requests — `Projects/Requests`
- Code — `Projects/Code`, default `Repositories` (internal)
  - Repositories — `Projects/Code/Repositories`
  - Merge requests — `Projects/Code/MergeRequests`
  - Git access — `Projects/Code/GitAccess`
- Time — `Projects/Time`, default `MyTime` (internal)
  - My time — `Projects/Time/MyTime`
  - Timesheets — `Projects/Time/Timesheets`
  - Time entries — `Projects/Time/TimeEntries`
- Resources — `Projects/Resources`, default `TeamPlanner` (internal)
  - Team planner — `Projects/Resources/TeamPlanner`
  - Allocations — `Projects/Resources/Allocations`
- Billing — `Projects/Billing`, default `Unbilled` (managers; clients get Invoices only)
  - Unbilled — `Projects/Billing/Unbilled`
  - Invoices — `Projects/Billing/Invoices`
  - Rates — `Projects/Billing/Rates`
- Reports — `Projects/Reports` (internal), default the index: Time, Work items, Sprints, Portfolio, Progress, Profitability
  (managers), Utilization (managers)
- Settings — `Projects/Settings` (managers): Work item types, Workflows, Labels, Templates, Time, Billing,
  Code, Intake

The placeholders of today become these entries: `Projects/Projects` ("Projects & milestones"),
`Projects/WorkItems`, `Projects/Intake` (now Requests), `Projects/Resources`, `Projects/Billing` and
`Projects/Settings`; the first port's `Projects/Timesheets`, My Account's time entry list, becomes My time and
Time entries.

**Landing** (`Projects/Home`, §3), by group: for the team, my work items, reviews waiting on me, my hours this
week against my working hours and the running timer; for managers, also the projects at risk, milestones due,
approvals, allocation requests and unbilled work; for clients, their projects' status, their open requests and
invoices due.

### 1.3 The records

What Projects reads and writes, so the screen sections can name records without explaining them each time.
New records and fields are marked (new) and specified in §15.

| Concept | Record | Notes |
| --- | --- | --- |
| Project | `WorkEffort` of type `WetProject` | The key is its `workEffortId`, one to eight letters or digits (`mantle.work.ProjectServices.create#Project`), upper case; work items are numbered `<KEY>-<n>` from 1 (§16). Sub-projects by `parentWorkEffortId`: a program is a project with sub-projects. Purpose is the project's kind (`WepPrProdDev`, `WepPrOrgMgmt` and the other `WepPr*`, plus the new `WepPrClient`, a client project). Status on the `Default` flow. Health (new `healthEnumId`), settings (new `WorkEffortSetting`), template flag (new `isTemplate`) |
| Work item | `WorkEffort` of type `WetTask`, `rootWorkEffortId` the project | Type is its purpose (§5); sub-items by `parentWorkEffortId`; status on the project's flow (`Default`, or the new `WorkEffortDevelopment` with In Review and In Testing); resolution `Wer*`; priority 1–9 shown in Commons' bands; estimate, remaining and actual hours (`estimatedWorkTime`, `remainingWorkTime`, `actualWorkTime`) and story points (new `estimatedPoints`); start and due (`estimatedStartDate`, `estimatedCompletionDate`); rank (new `sequenceNum`); `visibilityEnumId` |
| People on a work item | `WorkEffortParty` in the `RgpTask` roles (`Assignee`, `Manager`, `Reporter`, `Watcher`), `OrgTeam` for a team; followers are `RecordFollower` rows | Project members hold `RgpProject` roles: `ProjectManager`, `Manager`, `Programmer`, `ProgrammerLead`, `QualityAnalyst`, `QualityLead`, `BusinessAnalyst`, `SysArchitect`, `SysAdmin`, `UiDesigner`, `ExpertUser`, `Assignee`, `DefaultAssignee`, `Watcher`, `OrgTeam`, and the client side `Customer`, `CustomerBillTo`, `ClientManager`, `ClientBilling`, `Vendor`, `VendorBillFrom` |
| Plan items | `WorkEffort`s under the project: `WetMilestone`, `WetRelease`, `WetComponent`, and the new `WetSprint` | Items join them by `WorkEffortAssoc` `WeatMilestone`, `WeatRelease`, `WeatComponent` and the new `WeatSprint`, with `workEffortId` the plan item and `toWorkEffortId` the work item, as `mantle.work.TaskServices.set#TaskMilestone` writes; a `thruDate` ends a membership, so a sprint keeps its history |
| Relations | `WorkEffortAssoc` `WeatRelatesTo` and its children `WeatDependsOn`, `WeatDuplicates`, `WeatBasedOn`, `WeatClone`, `WeatCausedBy`, `WeatIndependentOf` | `WeatDependsOn` is finish-to-start: `workEffortId` depends on (is blocked by) `toWorkEffortId`, with the new `lagDays` |
| Labels | `WorkEffortCategory` with the new `categoryTypeEnumId` `WcatLabel`, applied by `WorkEffortCategoryAppl` | The holiday categories (`HolidayUsaFed`, `HolidayUsaBank`) become `WcatHoliday` |
| Requests | `Request` with `rootWorkEffortId` the project; `RequestWorkEffort` to its work items; `RequestParty` in `RgpRequest` roles; `RequestCommEvent`, `RequestItem`, `RequestContent`, `RequestEmailMessage`, `RequestRecord` | Types `RqtBugFix`, `RqtNewFeature`, `RqtSupport`, `RqtInformation`, `RqtProposal`, `RqtQuote`, `RqtPurchase`, `RqtInventory`, `RqtContact`; statuses `ReqDraft` → `ReqSubmitted` → `ReqReviewed` → `ReqInProgress` → `ReqCompleted`, `ReqCancelled`; resolution `Rr*` |
| Code | Framework `GitRepository` (`local` on disk, `db` in the database, `remote` mirror), `GitUpdate` and `GitUpdateRef` (the push log); new `GitMergeRequest`, `GitMergeRequestReviewer`, `GitCommitStatus`, `GitBranchRule`, `GitWebhook` | Mantle links: `WorkEffortGitRepository` (project), `WorkEffortGitCommit` and `WorkEffortGitRef` (work item, or for a tag a project, milestone or release), new `WorkEffortGitMergeRequest`; review comments are `CommunicationEvent`s with the new `CommunicationEventGitAnchor` |
| Time | `TimeEntry` (party, work item, from and thru, hours, work type, rate type `RatpStandard` billable or `RatpNoCharge`, client and vendor rates, invoice links, `timesheetId`); `Timesheet` per person and week | Timesheet `TmshInProcess` → `TmshCompleted` (submitted) → `TmshApproved`, with the new Return and Reopen transitions; rates are `RateAmount` with purpose `RaprClient` (billing) or `RaprVendor` (pay) |
| Capacity and allocation | Working hours are `WetAvailable` work efforts (Commons Preferences writes them); leave is `WetTimeOff`, holidays `WepHoliday` events; new `WorkEffortAllocation` | Capacity is computed (§9); People's working-schedule record feeds it when it exists |
| Money | Caps `totalTimeAllowed` and `totalClientCostAllowed`; actuals from `mantle.work.ProjectServices.get#ProjectStats`; material estimates `WorkEffortProduct`; `OrderItemWorkEffort` (with the new `invoicePercent`), `AgreementItemWorkEffort`, `SalesOpportunityWorkEffort`; `WorkEffortInvoice`, `WorkEffortBilling` | Invoices are made by `mantle.account.InvoiceServices.create#ProjectInvoiceItems` (which calls `create#TimeEntryInvoiceItems`), `create#WorkerInvoiceItems` and the new `create#MilestoneInvoiceItems` |
| Status updates | New `WorkEffortUpdate` with a `CommunicationEvent` of the new type `StatusUpdate` | The project's `healthEnumId` follows the latest |
| Documents | A `WikiSpace` named in the project's settings, on database files or in the project's repository under `git://<repositoryId>/docs` (the home page `docs/<SPACE>.md`, the pages under `docs/<SPACE>/`); `WikiPageWorkEffort` for pages linked from other spaces and for a release's published notes | Knowledge's editor, history and review work on both storages (design-drawers-commons §10) |
| Discussion | Chatter (`WorkEffortCommEvent`, `RequestCommEvent`, `CommunicationEventRecord`), the record-bound chat room of Comms | Log note is internal; Send message reaches the parties, client users included |

### 1.4 Shell providers and keys

`<shell-providers>` in `Projects.xml`, aggregated by the shell for users who may open the app
(design-drawers-commons §1.5):

- **Quick create:** Work item (`Projects/QuickCreate?kind=workItem`, `sym_o_add_task`), Log time (`kind=time`,
  `sym_o_more_time`), Project (`kind=project`, managers, `sym_o_create_new_folder`). Commons keeps its Task kind
  for a personal task with no project.
- **Today source:** `mantle.work.ProjectServices.get#ProjectTodayItems` (new): the running timer with Stop,
  merge requests waiting for my review, my timesheet to submit (from the last working day of the week, and any
  older one not submitted), and new requests in the projects I triage. Work items due reach Today already
  through `WorkEffortParty`. As built (impl-projects.md P6b): the items' kinds are `timer` (Stop in the Today panel,
  `mantle.work.TimesheetServices.stop#Timer`), `review`, `timesheet` (an older week overdue; it opens the week in My time) and
  `triage` (Submitted with no assignee, in the projects whose triage assignee is the user, or that name none and the user
  manages); the older weeks are those of the last eight with time and still In-Process.
- **Palette actions:** New work item, New project, Log time, Start timer (on the work item in context), New
  merge request (opens Compare), My time.
- **Palette types and links:** `MantleProject`, `MantleTask` and `MantleRequest` results open ProjectDetail,
  WorkItemDetail and RequestDetail for a user who has Projects; Commons' palette mapping gains these links
  (§15). A work item key typed in the palette (`PROJ-12`) goes to it through `mantle.GeneralServices.lookup#ById`.
- **Palette source:** a **Code** group, `mantle.work.GitServices.search#Code` (new): repositories by name and
  merge requests by number (`!12`, the `!` prefix) or title, among those the user may view.
- **Notification topics:** the topics of §15 "Notification topics".
- **Key scope** `projects`, on only in this app: `g w` work items, `g b` backlog, `g r` requests, `g o` code,
  `g t` my time, and `c` creates a work item (the global "create in the current app"); the global `g c`
  (Contacts) and `g k` (Tasks) are not shadowed. On WorkItemDetail `a` assign to me, `s` the status menu, `t`
  start or stop the timer, `b` create a branch, `m` comment; on MyTime `[` and `]` the previous and next week and
  `t` the timer; on MergeRequestChanges `n` and `p` the next and previous file and `r` review.

## 2. Screens

One row per screen, grouped by area in the order of the menu. **Impl** is `xml` or `qvue`, with the phase of
impl-projects.md that built it (every row is built as of P11; "terminal P11" marks a `.qvue` screen whose terminal twin
gained its changes in P11, "terminal read only" one whose twin shows its data only). **Scope**: `parity`
replaces a SimpleScreens, My Account or MarbleERP screen or form; `new` is in the first release without a
baseline; `later` is designed and built after it. Context `inherits` means the screen sits in a detail's tab and
its record is the detail's.

### Home and quick create

| Screen | Path | Archetype | Impl | Purpose | Main record | Reused | Roles | Scope | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Home | `Projects/Home` | landing | xml (built P2; clients P10b) | The group's view: my work, reviews and hours; projects at risk, approvals and unbilled work for managers; status, requests and invoices for clients | — | own; Dashboard widgets, crosscut §3.16 | app | new | none |
| QuickCreate | `Projects/QuickCreate` | dialog | xml (built P2; QuickTime P6a) | Quick-create forms for a work item, a time entry and a project, prefilled from the screen context | `WorkEffort`, `TimeEntry` | own | internal | new | none |

### Projects and the roadmap

| Screen | Path | Archetype | Impl | Purpose | Main record | Reused | Roles | Scope | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Projects | `Projects/Projects` | list | xml (built P2) | Find projects: saved finds, health, progress and budget, sub-projects; list, board and timeline views | `WorkEffort` (`WetProject`) | own | app | parity | `WorkEffort rows`; list find parameters |
| NewProject | `Projects/Projects/NewProject` | wizard | xml (built P2) | A project from a blank start or a template: basics, team, modules and code, money, review | `WorkEffort` | own | managers | parity | none |
| ProjectDetail | `Projects/Projects/ProjectDetail` | detail | xml (built P2) | The project hub: header with status, health and key numbers; a tab per module | `WorkEffort` (`WetProject`) | own | app | parity | `WorkEffort workEffortId` |
| ProjectOverview | `Projects/Projects/ProjectDetail/Overview` | detail | xml (built P2) | Status updates, next milestones, work summary, hours and budget, members, repositories, description; Chatter | `WorkEffort` | own | app | parity | inherits |
| ProjectWorkItems | `Projects/Projects/ProjectDetail/WorkItems` | list | xml (built P2) | The project's work items | `WorkEffort` (`WetTask`) | WorkItems (§5) with the project fixed | app | parity | inherits; `WorkEffort rows` |
| ProjectBacklog | `Projects/Projects/ProjectDetail/Backlog` | board | qvue (built P4a; terminal P11) | The project's backlog and sprints | `WorkEffort` | Backlog (§5) with the project fixed | internal | new | inherits |
| ProjectTimeline | `Projects/Projects/ProjectDetail/Plan/Timeline` | calendar | qvue (built P4c; terminal P11) | The project's work on a timeline with dependencies | `WorkEffort` | Timeline (§5) with the project fixed | app | new | inherits |
| ProjectCalendar | `Projects/Projects/ProjectDetail/Plan/Calendar` | calendar | qvue (built P4c; terminal read only) | The project's meetings, milestones, releases, sprints and due work on the calendar | `WorkEffort` | Calendar & schedules, design-drawers-commons §7 | internal | new | inherits; range |
| ProjectRoadmap | `Projects/Projects/ProjectDetail/Roadmap` | list | xml (built P4b) | The project's milestones, releases and sprints | `WorkEffort` | Roadmap (§4) with the project fixed | app | parity | inherits |
| ProjectRequests | `Projects/Projects/ProjectDetail/Requests` | list | xml (built P5) | The project's requests and its intake addresses | `Request` | Requests (§6) with the project fixed | app | parity | inherits; `Request rows` |
| ProjectCode | `Projects/Projects/ProjectDetail/Code` | detail | xml (built P3b1) | The project's repositories, tags, open merge requests and recent commits | `WorkEffortGitRepository` | own | internal; clients when shared | parity | inherits |
| ProjectDocs | `Projects/Projects/ProjectDetail/Docs` | editor | qvue (built P4b; terminal P11) | The project's documentation space, and pages linked from other spaces | `WikiPage` | Knowledge, design-drawers-commons §10, with the space fixed (Commons/Knowledge.xml mounted as the tab, P4b) | internal | new | inherits; `WikiPage` `wikiSpaceId` and `pagePath` |
| ProjectTeam | `Projects/Projects/ProjectDetail/Team` | detail | xml (built P2; allocations P7) | Members and roles, teams, client contacts, allocations | `WorkEffortParty` | own | internal | parity | inherits |
| ProjectTime | `Projects/Projects/ProjectDetail/Time` | list | xml (built P6b; clients Hours P10b) | The project's time with totals by person and work type | `TimeEntry` | TimeEntries (§8) with the project fixed | internal | parity | inherits; `TimeEntry rows` |
| ProjectMoney | `Projects/Projects/ProjectDetail/Money` | detail | xml (built P8b) | Budget and actuals, rates, unbilled work, milestone billing, invoices, expenses, the order and agreement behind it | `WorkEffort`, `TimeEntry`, `Invoice` | own | managers | parity | inherits |
| ProjectFiles | `Projects/Projects/ProjectDetail/Files` | panel | xml (built P2) | The project's files | `WorkEffortContent` | RecordFiles, design-drawers-commons §9 | internal | parity | inherits |
| ProjectSettings | `Projects/Projects/ProjectDetail/Settings` | settings | xml (built P2) | General, modules, work items, intake, code, billing, client access, template, close | `WorkEffort`, `WorkEffortSetting` (new) | own | managers | parity | inherits |
| Roadmap | `Projects/Projects/Roadmap` | list | xml (built P4b) | Milestones and releases across projects with progress; list and calendar views | `WorkEffort` (`WetMilestone`, `WetRelease`) | own | app | parity | `WorkEffort rows`; list find parameters |
| MilestoneDetail | `Projects/Projects/MilestoneDetail` | detail | xml (built P4b; gate and billing P8b) | A milestone: dates, gate approval, work items by state, progress, billing share, deliverables | `WorkEffort` (`WetMilestone`) | own | app | parity | `WorkEffort workEffortId` |
| ReleaseDetail | `Projects/Projects/ReleaseDetail` | detail | xml (built P4b) | A release: version, tag, work items, merge requests, release notes and publishing | `WorkEffort` (`WetRelease`) | own | app | new | `WorkEffort workEffortId` |

### Work items

| Screen | Path | Archetype | Impl | Purpose | Main record | Reused | Roles | Scope | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| WorkItems | `Projects/WorkItems` | list | xml (built P2) | Work items across projects or in one: smart lists and saved finds, quick add, bulk changes; list, board, calendar and tree views; a peek pane | `WorkEffort` (`WetTask`) | own | app | parity | `WorkEffort rows`; list find parameters |
| WorkItemDetail | `Projects/WorkItems/WorkItemDetail` | detail | xml (built P2) | One work item: its place in the tree, fields, sub-item tree, links, development, time, files, Chatter | `WorkEffort` (`WetTask`) | Task / work item, crosscut §3.12, designed here (`Shared/WorkItemDetail`) | app | parity | `WorkEffort workEffortId` |
| Backlog | `Projects/WorkItems/Backlog` | board | qvue (built P4a; terminal P11) | Rank the backlog, plan sprints, start and complete them | `WorkEffort` (`WetTask`, `WetSprint`) | own | internal | new | `WorkEffort workEffortId` (the project); `WorkEffort rows` |
| SprintDetail | `Projects/WorkItems/SprintDetail` | detail | xml (built P4a) | A sprint: goal and dates, its items, burndown, scope changes | `WorkEffort` (`WetSprint`) | own | internal | new | `WorkEffort workEffortId` |
| Timeline | `Projects/WorkItems/Timeline` | calendar | qvue (built P4c; terminal P11) | Work items as bars with dependencies, milestones and sprints, over the work item find; projects in portfolio mode | `WorkEffort` | own | app | new | list find parameters |
| WorkItemImport | `Projects/WorkItems/Import` | wizard | xml (built P4c) | Import work items from CSV with Jira, Redmine and GitHub presets | `WorkEffort` | own | managers | new | none |

### Requests

| Screen | Path | Archetype | Impl | Purpose | Main record | Reused | Roles | Scope | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Requests | `Projects/Requests` | list | xml (built P5) | Triage and track requests: new, assigned, accepted, in progress; convert to work | `Request` | own | app | parity | `Request rows`; list find parameters |
| RequestDetail | `Projects/Requests/RequestDetail` | detail | xml (built P5) | One request: header, conversation, its work, items, people, files | `Request` | Request / case, crosscut §3.11, designed here (`Shared/RequestDetail`) | app | parity | `Request requestId` |
| RequestIntake | `screen/RequestIntake.xml` (served at `/r/<token>`; as built in P5 a screen of its own beside PublicShare and Unsubscribe, not under the Projects root, whose authorization a visitor has not) | task | qvue (built P5) | The public request form of a project | `Request` | own | anonymous by token | new | none |

### Code

| Screen | Path | Archetype | Impl | Purpose | Main record | Reused | Roles | Scope | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Repositories | `Projects/Code/Repositories` | list | xml (built P3b1) | The repositories I may view: create, link, mirror, import, clone URLs; the archived ones apart | `GitRepository` | own | internal | parity | `GitRepository rows` |
| RepositoryDetail | `Projects/Code/RepositoryDetail` | detail | xml (built P3b1) | One repository: header with clone and New merge request; tabs | `GitRepository` | own | internal | new | `GitRepository repositoryId` |
| RepositoryFiles | `Projects/Code/RepositoryDetail/Files` | detail | xml (built P3b1) | Browse files at a branch, tag or commit; read a file; the README | `GitRepository` | own | internal | new | inherits; ref, path |
| RepositoryCommits | `Projects/Code/RepositoryDetail/Commits` | list | xml (built P3b1) | The log of a ref or a path with linked work items and CI state | `GitRepository` | own | internal | new | inherits; ref, path |
| RepositoryBranches | `Projects/Code/RepositoryDetail/Branches` | list | xml (built P3b1) | Branches with ahead and behind, their work item and merge request; new and delete | `GitRepository` | own | internal | new | inherits |
| RepositoryTags | `Projects/Code/RepositoryDetail/Tags` | list | xml (built P3b1) | Tags with their release, milestone or project; new and delete | `GitRepository` | own | internal | parity | inherits |
| RepositoryMergeRequests | `Projects/Code/RepositoryDetail/MergeRequests` | list | xml (built P3b2) | The repository's merge requests | `GitMergeRequest` (new) | MergeRequests (§7) with the repository fixed | internal | new | inherits |
| RepositoryActivity | `Projects/Code/RepositoryDetail/Activity` | list | xml (built P3b1) | The push log: who changed which refs, and the rules that ran | `GitUpdate` | own | internal | new | inherits |
| RepositorySettings | `Projects/Code/RepositoryDetail/Settings` | settings | xml (built P3b1) | Description, default branch and merge method, projects, branch rules, webhooks, large files, storage, mirror, export and import, archive | `GitRepository` | own | managers and the repository's maintainers | new | inherits |
| Compare | `Projects/Code/Compare` | detail | xml (built P3b1) | Compare two refs and open a merge request from them | `GitRepository` | own | internal | new | `GitRepository repositoryId`; refs |
| CommitDetail | `Projects/Code/CommitDetail` | detail | xml (built P3b1) | One commit: message, people, parents, linked work items, CI, the files and their diffs | `GitRepository` (a commit) | own | internal | parity | `GitRepository repositoryId`; commit |
| MergeRequests | `Projects/Code/MergeRequests` | list | xml (built P3b2) | Merge requests across repositories: waiting for my review, mine, open, merged | `GitMergeRequest` (new) | own | internal | new | `GitMergeRequest rows`; list find parameters |
| MergeRequestDetail | `Projects/Code/MergeRequestDetail` | detail | xml (built P3b2) | One merge request: description, work items, reviewers, checks, merge; commits; discussion | `GitMergeRequest` | own | internal | new | `GitMergeRequest mergeRequestId` |
| MergeRequestChanges | `Projects/Code/MergeRequestDetail/Changes` | split | qvue (built P3b2; terminal P11) | The diff with line comments, threads and the review | `GitMergeRequest` | own | internal | new | inherits; file path |
| GitAccess | `Projects/Code/GitAccess` | settings | xml (built P3b1) | My SSH keys and access tokens, and how to clone | `UserSshKey`, `UserLoginKey` | own | internal | parity | none |

### Time

| Screen | Path | Archetype | Impl | Purpose | Main record | Reused | Roles | Scope | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MyTime | `Projects/Time/MyTime` | list | qvue (built P6a; terminal P11) | My week: a grid of work items by day, the timer, submit; a day view on a phone | `TimeEntry`, `Timesheet` | own | internal | new | `Timesheet timesheetId` |
| Timesheets | `Projects/Time/Timesheets` | list | xml (built P6a) | Weekly timesheets to submit, approve or return; missing time | `Timesheet` | own; Approvals waiting, design-drawers-commons §4 (Projects' own list) | internal | new | `Timesheet rows`; list find parameters |
| TimesheetDetail | `Projects/Time/TimesheetDetail` | detail | xml (built P6a) | One person's week: entries by day and project, flags, approve or return | `Timesheet` | own | internal | new | `Timesheet timesheetId` |
| TimeEntries | `Projects/Time/TimeEntries` | list | xml (built P6b) | All time I may see, with rates and invoice state; edit, bulk changes, team time, import | `TimeEntry` | own | internal | parity | `TimeEntry rows`; list find parameters |

### Resources

| Screen | Path | Archetype | Impl | Purpose | Main record | Reused | Roles | Scope | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TeamPlanner | `Projects/Resources/TeamPlanner` | calendar | qvue (built P7; terminal P11) | People by week: capacity, allocations by project, assigned work, leave; drag to plan | `WorkEffortAllocation` (new) | own | internal (changes: managers) | new | list find parameters |
| Allocations | `Projects/Resources/Allocations` | list | xml (built P7) | Allocation requests and placeholders: staff, approve, reject | `WorkEffortAllocation` (new) | own | internal | new | `WorkEffortAllocation rows` |
| PersonDetail | `Projects/Resources/PersonDetail` | 360 | xml (built P7) | A person as Projects sees them: allocations, work, time, capacity, skills | `Party` (`Person`) | Employee 360, crosscut §3.4 | internal | new | `Party partyId` |

### Billing

| Screen | Path | Archetype | Impl | Purpose | Main record | Reused | Roles | Scope | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Unbilled | `Projects/Billing/Unbilled` | list | xml (built P8a) | The billing queue: unbilled time and expenses by project, milestones due for invoicing, contractor time to bill | `TimeEntry`, `WorkEffort` | own | managers | parity | list find parameters |
| Invoices | `Projects/Billing/Invoices` | list | xml (built P8a; clients P10b) | Client, contractor and expense invoices of projects | `Invoice` | own | managers; clients (theirs) | new | `Invoice rows` |
| InvoiceDetail | `Projects/Billing/InvoiceDetail` | detail | xml (built P8a; clients P10b) | One invoice with the time and milestones behind its lines | `Invoice` | Invoice detail, crosscut §3 | managers; clients (read) | new | `Invoice invoiceId` |
| OrderDetail | `Projects/Billing/OrderDetail` | detail | xml (built P8b) | The sales order a project fulfils, with its lines' work and milestone shares | `OrderHeader` | Order detail, crosscut §3.6 | managers | new | `OrderHeader orderId` |
| Rates | `Projects/Billing/Rates` | list | xml (built P8a) | Client billing and worker pay rates by project, person, position and work type | `RateAmount` | own | managers | parity | `RateAmount rows` |

### Reports

| Screen | Path | Archetype | Impl | Purpose | Main record | Reused | Roles | Scope | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Reports | `Projects/Reports` | settings | xml (built P9) | The report index | — | own | internal | new | none |
| TimeReport | `Projects/Reports/Time` | report | xml (built P9) | Hours and amounts by up to three criteria and a period | `mantle.work.ProjectReportServices.get#TimeReport` (new) | own | internal | new | report parameters |
| WorkItemReport | `Projects/Reports/WorkItems` | report | xml (built P9) | Counts by status and type, created against resolved, overdue, cycle time | `mantle.work.ProjectReportServices.get#WorkItemSummary` (new) | own | internal | new | report parameters |
| SprintReport | `Projects/Reports/Sprints` | report | xml (built P9) | Burndown and velocity | `mantle.work.ProjectReportServices.get#SprintBurndown`, `get#SprintVelocity` (new) | own | internal | new | report parameters |
| PortfolioReport | `Projects/Reports/Portfolio` | report | xml (built P9) | Every project's status, health, progress, schedule and budget | `mantle.work.ProjectReportServices.get#PortfolioStatus` (new) | own | internal | new | report parameters |
| ProfitabilityReport | `Projects/Reports/Profitability` | report | xml (built P9) | Budget, cost, billable, billed and margin by project | `mantle.work.ProjectReportServices.get#ProjectProfitability` (new) | own | managers | new | report parameters |
| UtilizationReport | `Projects/Reports/Utilization` | report | xml (built P9) | Capacity, logged and billable hours by person and week | `mantle.work.ProjectReportServices.get#Utilization` (new) | own | managers | new | report parameters |
| ProgressReport | `Projects/Reports/Progress` | report | xml (built P9) | Estimated, actual and remaining work by milestone, and by top-level item down the work item tree | `mantle.work.ProjectServices.get#ProjectMilestoneSummary`, `get#WorkEffortChildStats`; as built (P9) through `mantle.work.ProjectReportServices.get#ProgressBreakdown` | own | internal | parity | report parameters |

### Settings

| Screen | Path | Archetype | Impl | Purpose | Main record | Reused | Roles | Scope | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Settings | `Projects/Settings` | settings | xml (built P2) | The settings index | — | own | managers | new | none |
| WorkItemTypes | `Projects/Settings/WorkItemTypes` | settings | xml (built P2) | Which work item types are offered, their order and icons | `Enumeration` (`WorkEffortPurpose`), `PartySetting` | own | managers | new | none |
| Workflows | `Projects/Settings/Workflows` | settings | xml (built P2) | Status flows for projects and work items, their transitions and statuses | `StatusFlow`, `StatusFlowTransition`, `StatusItem` | own | managers | new | none |
| Labels | `Projects/Settings/Labels` | settings | xml (built P2) | Work item labels | `WorkEffortCategory` | own | managers | new | none |
| Templates | `Projects/Settings/Templates` | settings | xml (built P2) | Project templates: list, new, save a project as a template | `WorkEffort` (`isTemplate`, new) | own | managers | new | none |
| TimeSettings | `Projects/Settings/Time` | settings | xml (built P6b) | Work types, the timesheet week, approvers, required fields, reminders | `Enumeration` (`WorkType`), `PartySetting` | own | managers | new | none |
| BillingSettings | `Projects/Settings/Billing` | settings | xml (built P8a) | Billing defaults, invoice grouping and time detail, contractor billing | `PartySetting` | own | managers | new | none |
| CodeSettings | `Projects/Settings/Code` | settings | xml (built P3b1) | Repository defaults, commit conventions, default branch rules, merge request automation, SSH access | `PartySetting`, `UserGroupPermission` | own | managers | new | none |
| IntakeSettings | `Projects/Settings/Intake` | settings | xml (built P5) | Request types and categories, triage, email intake addresses, the public form | `PartySetting`, `RequestCategory` | own | managers | new | none |

Dropped from the research's candidate inventory, with the reason in §16: a separate portfolio or program screen
(a view of the Projects list and the Timeline's portfolio mode), a separate board screen (a view of WorkItems),
separate phase records (milestones with a start date and a gate), a budgets screen (ProjectMoney and the
Profitability report), and a separate project expenses screen (ProjectMoney's Expenses box; capture is People's).

## 3. Home and quick create

### Home

- **Layout:** landing (style-guide §3.1) whose blocks depend on the user's group; a timer strip across the top
  while the user's timer runs (the work item, the elapsed time, Stop), which is what a consultant sees first.
- **Sections and tabs:**
  - Counters, team: My open work items, Due this week, Overdue, Reviews waiting on me, Hours this week (of my
    working hours, with the timesheet's status in the card's title; it opens My time). Managers add: Projects at risk (health At risk or Off
    track, or a budget or schedule warning from `mantle.work.ProjectServices.get#ProjectStats`), Milestones in 14
    days, Timesheets to approve,
    Allocation requests, Unbilled (amount; built in impl-projects.md P8a for managers who manage money, the billable time not
    invoiced in the projects they see, opening Billing's Unbilled; hidden when the projects bill in more than one currency). Clients get instead: Open requests, Waiting for your reply, Milestones in
    30 days, Invoices due.
  - My work (internal): My work items (ten, by due date then priority, each with its project, status chip and the
    Start timer action), Reviews waiting on me (merge requests), Recently changed in my projects.
  - Projects: the projects I am on (managers: that I manage) with health chip, status, progress, next milestone and
    open items; clients: their projects with the latest update posted for them.
  - Managers: Approvals (timesheets, allocation requests, milestone gates, each linking to its list); charts Hours by
    project over the last four weeks and Unbilled by client.
  - Clients: Recent replies on my requests; Waiting for your approval (milestone gates addressed to them). As built
    (impl-projects.md P10b, `ironstone.client.ClientServices.get#ClientHome`, each part on its own): the counters Open
    requests, Waiting for your reply (the team's messages to the client with no later message from the client's side in the
    thread), Waiting for your approval, Milestones in 30 days and Invoices due (sent, unpaid, `get#ClientInvoices`); the
    gates it approves, its projects with the latest update posted for it, its open requests, the team's recent messages
    (on any record it sees, not only requests), milestones soon and invoices due; New request.
  - Shortcuts: New work item, Log time, Start timer (on the last work item I logged), My time, New project
    (managers), New request (clients and team).
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `TimerStrip` | display | The running timer | work item key and title, project, started, elapsed; Stop | `m-elapsed` (new) for the ticking time | `mantle.work.TimeServices.store#TimeEntry` (stop sets `thruDate`) | OpenProject menu timer; ERPNext timer |
| `Counters` | display | The group's numbers | as above | `dashboard` of `number-card`s, each a link to the filtered list | `mantle.work.ProjectServices.get#ProjectHomeCounts` (new) | ERPNext Projects workspace number cards; OpenProject My page |
| `MyWorkItems` | list | My next work | key, title, project, status chip, priority, due; Start timer | `skip-header`, ten rows | `WorkEffortAndParty` (`entity`) | SimpleScreens `MyAccount/User/Task/MyTasks` `MyTasks`; Redmine My page "issues assigned to me" |
| `ReviewsWaiting` | list | Merge requests where I am a requested reviewer | `!num`, title, repository, author, CI state, updated (five, with All merge requests to the Waiting chip) | | `org.moqui.impl.GitReviewServices.find#MergeRequests` (new) with `waitingForUserId`; the counter from `get#ProjectHomeCounts` `reviewsWaiting`; both left out when the build has no git hosting | GitLab "Review requests" (outside the research set) |
| `RecentChanges` | list | What moved in my projects | item, change (status, assignee, comment), by, when | | `mantle.work.ProjectServices.get#ProjectActivity` (new) | Redmine and OpenProject activity |
| `MyProjects` | list | Projects I am on or manage, or a client's | key, name, health chip, status, progress, next milestone, open items | `q-linear-progress` by `render-mode` | `WorkEffortAndParty` (`entity`); `mantle.work.ProjectServices.get#ProjectStats` | ERPNext project summary; OpenProject project list |
| `Approvals` | list | Waiting on me as a manager | kind (timesheet, allocation, gate), who, what, since | links to the owning list | the approval topics of §15 through `NotificationMessageUser` (`entity`) | design-drawers-commons §4 `Approvals` |
| `HoursByProject`, `UnbilledByClient` | display | Two charts with their tables | hours by project and week; unbilled amount by client | `m-chart` by `render-mode`; as built (impl-projects.md P9) below Projects I manage, for managers: hours stacked by project over the last four weeks (the time they may see) and, for those who manage money, unbilled by client as bars (left out when the projects bill in more than one currency), each table in a dialog with a link to the Time report or Unbilled | `get#TimeReport` (new); `mantle.work.ProjectServices.get#UnbilledSummary` (new) | ERPNext Timesheet Working Hours card |
| `ClientReplies` | list | Messages on my requests from the team | request, from, snippet, when | | `RequestCommEvent` with `CommunicationEvent` (`entity`) | Odoo portal; Frappe Helpdesk customer view |

- **States:** a user with no projects sees a first-run card ("Create a project", "Import work items", "Connect a
  repository"); a manager with no approvals sees no Approvals block.
- **Devices:** phone (one column; the timer strip stays first).
- **Source:** research §1 (OpenProject's three surfaces, Redmine My page, ERPNext workspace), §12; style-guide §3.1.
- **Needs:** `m-elapsed`; Project home and Today services; Code review store; Project activity; Reports services.

### QuickCreate

- **Layout:** dialog, as `Commons/QuickCreate` (design-drawers-commons §4): one form by `kind`, the context link
  as a chip, six or fewer fields, "More options" opening the full screen with the values carried over.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `QuickWorkItem` | dialog | A work item in a project | project (from context, else the last used), type, title, assignee (default unassigned; "me" one click), priority, due, sprint (when the project uses sprints) | `focus-field` on title; type as a `q-btn-toggle` of the project's offered types | `mantle.work.TaskServices.create#Task`; `mantle.work.TaskServices.set#TaskSprint` (new); the context link through `mantle.work.WorkEffortServices.link#WorkEffortRecord` | `FindTask` `NewTaskForm`; Commons `QuickTask`; OpenProject inline create |
| `QuickTime` | dialog | Log time | work item (context, else my recent), date (today), hours, billable, work type, comment (from and to are in MyTime's `EntryForm`, which More options opens) | hours rounded to the policy's smallest entry | `mantle.work.TimeServices.store#TimeEntry` (through `ironstone.projects.TimeServices.save#TimeEntry`) | `EditTimeEntries` `AddTaskTime`; `PartyTimeEntries/EditTimeEntry` `AddTimeForm` |
| `QuickProject` | dialog | A project in one step | name, key, client, template, manager (me) | key suggested from the name, upper case | `mantle.work.ProjectServices.create#Project`, or `clone#Project` from the template | `FindProject` `NewProject`; Odoo quick create project |

- **Source:** design-drawers-commons §1.5 and §4 QuickCreate.
- **Needs:** Shell providers (Projects' `quick-create` kinds); Sprints.

## 4. Projects and the roadmap

A project is a `WetProject` work effort whose key is its id: one to eight letters or digits, upper case,
chosen when it is made, because commit messages, branch names and tags name its work items by it (`PROJ-12`). Its
status follows the `Default` flow (In Planning, Approved, In Progress, On Hold, Complete, Closed, Cancelled); its
**health** is a separate judgment (On track, At risk, Off track) set by the latest status update; and its
**modules** decide which tabs it has: Work items and Overview always, and Backlog (sprints), Requests, Code, Docs,
Time, Money and Client access as switched on in its settings, as Redmine's per-project modules do. A program is a
project with sub-projects (`parentWorkEffortId`); there is no separate portfolio record.

### Projects

- **Layout:** list. Chips: Active (Approved and In Progress, default), Mine, Planned, On hold, At risk (open, with
  the health At risk or Off track or numbers that warn by `get#ProjectStats`, as Home's counter),
  Completed, Closed, All. New project opens NewProject; Quick project is in quick create. Sub-projects show
  indented under their program when "Show sub-projects" is on, with the program's row summing their numbers.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `ProjectFind` | find | Narrow the list | text, status, health, client, manager, member (me), purpose, program, due period | `date-period`; client `drop-down` `server-search` | | `FindProject` `ListProjects` header fields; OpenProject project filters; Redmine project query |
| `ProjectList` | list | The projects | key, name (link), client, manager avatar, status chip, health chip, % complete, next milestone, open and overdue items, hours actual of budget, budget used % (managers), updated | `saved-finds`, `select-columns`, CSV and XLSX; progress as `q-linear-progress` | `WorkEffort` (`entity`); `mantle.work.ProjectServices.get#ProjectStats` per row | `FindProject` `ListProjects`; OpenProject project list; AureusERP project cards |
| `ProjectBulk` | list, bulk | On selected projects | set manager, put on hold, close | | `mantle.work.ProjectServices.update#Project` | Dolibarr mass close |

- **Actions:** New project; bulk as above (managers); row: open, follow.
- **Views:** list; board by status (In Planning, Approved, In Progress, On Hold, Complete), a drag moving the
  project through its flow (`update#Project`); timeline, which opens Timeline in portfolio mode with the same
  find (as built, P4c: a Timeline button with the chip and the text).
- **States:** clients see their projects and no money columns; a project template never shows here (Settings
  holds them).
- **Source:** research §1–§2 (OpenProject global projects index, Redmine projects, Dolibarr project list, Odoo
  project kanban); baseline `Project/FindProject`.
- **Needs:** Project health; Template flag; `view-board` group fields.

### NewProject

- **Layout:** wizard (`subscreens-panel type="wizard"`): Start, Team, Modules and code, Money, Review. After Start
  the project exists In Planning, so leaving the wizard keeps a draft project (style-guide §3.10). Opened from
  Projects, from a request's Convert to project (name, client, description and the request's link carried
  over), and from a sales order's Create project (Sales; the order line carried over).
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `ProjectStart` | wizard step | What and for whom | template (blank or one of Settings/Templates, with what it brings), name, key, purpose, client, manager (me), start, target date, visibility (all internal users, members only), program | key suggested from the name (the first letters of its words) when left empty; template as cards by `render-mode` | `create#Project`; from a template `mantle.work.ProjectServices.clone#Project` (`deepClone`, ids prefixed with the new key, dates moved to the start date) | `FindProject` `NewProject`; `EditProject` `CloneProject`; OpenProject creation wizard and templates; ERPNext project template |
| `ProjectTeamStep` | wizard step, editable rows | Who works on it | person or team, role (`RgpProject`), hours per week, from, thru | person `server-search`; role defaults from the template's members | `mantle.work.WorkEffortServices.add#WorkEffortParty`; `mantle.work.ResourceServices.create#Allocation` (new) | `Project/EditUsers` `AddUserAssignForm`; OpenProject members; Odoo project roles |
| `ProjectModulesStep` | wizard step | How it works | modules (Backlog and sprints, Requests, Code, Docs, Time, Money, Client access), estimate in hours or points, work item flow (`Default` or `WorkEffortDevelopment`), repository (none, new on disk, new in the database, link one, mirror a URL for admins), documentation (none, in the repository, in the database) | checks for modules; repository as a `radio` with its fields shown by `visible-when` | `mantle.work.ProjectServices.store#ProjectSetting` (new); `mantle.work.GitServices.create#ProjectRepository`, `add#ProjectRepository`; `org.moqui.impl.WikiServices.create#WikiSpace` | Redmine project modules; OpenProject project modules and repository settings |
| `ProjectMoneyStep` | wizard step | How it is paid for (Money on) | billing basis (time and materials, fixed price, milestones, not billed), hours budget (`totalTimeAllowed`), client budget (`totalClientCostAllowed`), the order line it fulfils, project client rates (person, position class or work type, rate) | order line `server-search` over open sales order items of the client | `update#Project`; `mantle.humanres.RateServices.create#RateAmount`; `OrderItemWorkEffort` (`entity`) | `EditProject` `EditProject` budget fields; Odoo service product tracking; ERPNext project costing |
| `ProjectReview` | wizard step, read | The summary | everything chosen | | | style-guide §3.10 review step |

- **As built (P8b):** the order line is a box of the Money step for those who manage money: Link an order line (the lines of the
  client's sales orders not cancelled, rejected or completed; `link#ProjectOrderItem`) and Unlink; milestones take their shares of it
  on MilestoneDetail.
- **Actions:** Next, Back, Create (the one primary of the last step); "Create now" from Start for a quick project
  that takes the template's or the defaults for the rest.
- **Source:** research §2 (OpenProject wizard, templates and copy; Odoo quick create, templates and stages;
  ERPNext and Dolibarr clone); baseline `FindProject` `NewProject`, `EditProject` `CloneProject`.
- **Needs:** Project settings; Template flag; Allocations; Wiki space in a repository; Wizard panel (exists).

### ProjectDetail

- **Layout:** detail. Title row: the key as a `text-mono` chip, the name (`h5`), the `status-bar` of the project's
  flow, the health chip with the date of the last update, the client chip and the manager's avatar. Below it a row
  of `number-card`s in `size="sm"`: Open items, Overdue, Next milestone (date and name), Hours (actual of budget or
  estimate), and for managers Budget used and Unbilled. The primary action follows the status: Approve (In
  Planning), Begin (Approved), Post update (In Progress), Resume (On Hold), Close (Complete), Re-open (Closed,
  Cancelled); the `status-bar` shows the stages read only and the other moves of the flow are in the menu. Secondary
  menu: the other moves (Hold, Complete, Cancel), Follow, Clone (`CloneProject`), Save as template, Print status
  report (a sibling screen `Projects/Projects/StatusReport` in `html-print`); Post update stays beside the primary
  outside In Progress; New work item is the Work items tab's and the shell's quick create, which takes the project
  from the screen context; Log time comes with Time.
- **Sections and tabs:** `subscreens-panel type="tab"`: Overview, Work items, Backlog, Plan (Timeline and Calendar
  as a toggle), Roadmap, Requests, Code, Docs, Team, Time, Money, Files, Settings. A module that is off has no tab;
  a tab is left out until its phase builds it, while ProjectSettings already keeps the modules (`WstModules`: backlog,
  requests, code, docs, time, money, client).
  Clients see Overview, Work items, Plan (Timeline only), Roadmap and Requests, plus Time when the project shares
  hours with the client and Code when a repository is shared with them.
- **Navigation:** from Projects, Home, the palette, a work item's project link, a notification. Every tab is a
  screen of its own whose context is the project, so quick create, Chatter and Assist link to the project from any
  tab.
- **States:** a template shows a banner ("Template: changes here shape new projects"); a closed project is
  read-only with Re-open for managers.
- **Source:** research §3 (OpenProject overview and modules, Redmine overview and project menu, Odoo project form,
  Dolibarr project tabs); baseline `Project/ProjectSummary` (`ActiveProjectSection`, `ViewProject`).
- **Needs:** `status-bar` and `number-card` (exist); Project health; Project settings; Client access.

### ProjectOverview

- **Layout:** detail tab with two columns of boxes; Chatter as the right column from 1440 px and below the boxes on a
  narrower screen (the tabs are subscreens, so a width-dependent Chatter tab is not offered).
  Left: Status, Next milestones and releases, Work items, Breakdown, Time and budget. Right: Description, Members,
  Repositories, Recent activity.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `StatusBox` | display | The latest status update | health chip, date, author, summary, progress; earlier updates as a short list | | `WorkEffortUpdate` (new, `entity`) | Odoo project updates; OpenProject project status |
| `PostUpdate` | dialog | A periodic status update | health (On track, At risk, Off track), progress %, summary (markdown), shown to the client | `text-area editor-type="md"` | `mantle.work.ProjectServices.post#ProjectUpdate` (new): the `StatusUpdate` message on the project's Chatter, the `WorkEffortUpdate` row and the project's `healthEnumId` | Odoo `project.update` form |
| `NextMilestones` | list | The next three milestones and releases | name, type, due, status chip, progress | `q-linear-progress` | `WorkEffort` (`entity`) with `mantle.work.ProjectServices.get#ProjectMilestoneSummary` | `ProjectSummary` `MilestoneList`; Odoo next milestone |
| `WorkCounts` | display | Work items by status | a chip per status with its count, each a link to the Work items tab filtered; a donut | `m-chart` | `get#ProjectStats` (`taskCountByStatusMap`) | `ProjectSummary` status counts; Redmine overview per tracker |
| `TopLevelProgress` | list | The breakdown at a glance: the top-level items with their subtrees' roll-ups | item (link), status chip, estimate, actual plus remaining against it as a bar (warning past the estimate, danger past the hours budget), done of total items; a row opens the Work items tab in Tree view expanded at it | `q-linear-progress` | `get#WorkEffortChildStats` with the project | `ProjectProgressReport` `ChildStatsListDays`; `ProjectSummary` `TaskTree` |
| `TimeBudget` | display | Hours and money against the caps (managers) | estimated, actual, remaining hours, hours budget, client budget used %, profit; the warning or danger flag | progress bars | `get#ProjectStats` | `ProjectSummary` `ActiveProjectSection`; OpenProject budget widgets |
| `Description` | single | The project's description | description | `text-area editor-type="md"`, edited in place by managers | `update#Project` | `EditProject` `EditProject` |
| `Members` | list | Who is on it | avatar, name, role | `m-avatar` | `WorkEffortParty` (`entity`) | `ProjectSummary` `ViewUserAssignForm` |
| `RepositoriesBox` | list | Its repositories | repository, default branch, last push, clone | copy buttons for the clone URLs | `org.moqui.impl.GitServices.get#GitCloneUrls`; `WorkEffortGitRepository` (`entity`) | `ProjectSummary` `ViewGitRepositoryList` |
| `RecentActivity` | list | The last changes across its work items | item, what changed, by, when | load more | `get#ProjectActivity` (new) | Redmine project activity; OpenProject activity |
| `Chatter` | component | The project's timeline | | `chatter` | Shared/Chatter (design-drawers-commons §15) | Odoo chatter |

- **States:** clients see Status (the updates posted for them), Next milestones, Work counts of the items shared
  with them, Description; no Time and budget, Repositories or Recent activity, and Chatter
  shows them messages only (§15 "Chatter for client users"). As built (impl-projects.md P10b, on the safe side): no Members
  box (the team's people are internal), the Breakdown's hours only when the project shares its hours, Recent activity as
  `get#ProjectActivity` answers a client (status changes and updates for it), Repositories only those shared with it; the
  title row has no More menu (Follow, Clone, Save as template, Print status report) and the Hours card shows only when the
  project shares hours.
- **Source:** research §3 BOSS implications (header facts, health, timeline, next milestone, budget against actual,
  overdue, activity); baseline `ProjectSummary`.
- **Needs:** Project health; Project activity; `chatter` (exists); Chatter for client users.

### ProjectWorkItems (Context passed)

WorkItems (§5) mounted in the project's tab with `rootWorkEffortId` fixed: its finds, saved finds, views, quick
add and bulk actions work as on the menu's screen, the project column is hidden, new items go into the project,
and the saved finds the project's members share are offered first. Clients see the items shared with them, with
no bulk actions and no estimate columns.

### ProjectBacklog, ProjectTimeline and ProjectCalendar (Context passed)

Backlog and Timeline (§5) with the project fixed. The Backlog tab is always there (a tab cannot be hidden by a condition,
impl-projects.md F24): with the Backlog and sprints module off it ranks the backlog only, with Plan in sprints for the
managers (built in P4a by mounting `WorkItems/Backlog` in ProjectDetail). **Plan** is one tab with a toggle between ProjectTimeline and
ProjectCalendar. ProjectCalendar is the Commons Calendar component (design-drawers-commons §7) in its project
mode, filtered to the project's events (meetings linked to the project through `WorkEffortRecord`, which quick
create's link chip writes), its milestones, releases and sprints, and its work items by due date. Projects' row
of that design's Calendar & schedules table, as it is used here:

| App | Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- | --- |
| Projects | the grid in day, week, month and agenda views; no calendar rail | the project's events, milestones, releases, sprints and work items due | create a meeting linked to the project; drag a milestone or a work item's due date | the plan and its meetings |

Services beyond the Commons version: `mantle.work.EventServices.get#FullCalendarData` with the new
`rootWorkEffortId` filter, and `mantle.work.TaskServices.get#FullCalendarData` for the due work items.

As built (P4c): ProjectDetail's Plan tab (`ProjectDetail/Plan.xml`, menu index 4) holds `Plan/Timeline` (WorkItems/Timeline mounted,
the default) and `Plan/Calendar`; the toggle between them is a Timeline | Calendar button toggle in each component's header (a tab's
subscreens have no second row of tabs). `Plan/Calendar.xml` serves Commons' `Calendar.qvue`, which has a project mode (its
`calendarSetup` answers the project): no rail and no search, its requests carry the project as `workEffortId` and an event's id as
`eventWorkEffortId` (impl-projects.md F43's pattern). The data is `ironstone.projects.PlanningServices.get#ProjectCalendarEvents`: the meetings
linked to the project from `get#FullCalendarData` `rootWorkEffortId` (only the linked events: all of them for a party of the
project, else only the user's own), the sprints over their days, the milestones and releases on their due days (over their days a
phase filled every day of a month; a phase's start is a day of its own), and the work items by due day through
`ironstone.projects.WorkItemServices.find#WorkItems` rather than `TaskServices.get#FullCalendarData`, so a Restricted item stays with those
who see it. A milestone, release or work item the user may change drags to other days (`move#ProjectCalendarItem`: a work item's
due day; a milestone or release by as many days, its start with it); New meeting
makes the event and links it (`link#WorkEffortRecord`) for the project's team. The terminal shows an agenda of the next four weeks.

### ProjectRoadmap (Context passed)

Roadmap (below) with the project fixed, plus the project's sprints (planned, active and closed) as a third kind chip
(Sprints), each opening its SprintDetail. As built (P4b): `Projects/Roadmap.xml` mounted as the tab, the project fixed by
ProjectDetail's `projectTabId`; the tab order is Overview 1, Work items 2, Backlog 3, Plan 4, Roadmap 5, Requests 6, Code 7,
Docs 8, Team 9, Time 10, Money 11, Files 12, Settings 13.

### ProjectRequests (Context passed)

Requests (§6) with the project fixed. Managers see an Intake box above the list: the project's email address
(the mail account and plus tag that file mail into it), the public form's link with Copy, Rotate and Turn off, and
the triage assignee, each edited in ProjectSettings. As built (P5): `Projects/Requests/List.xml` mounted as tab 6, the project
fixed by ProjectDetail's `projectTabId`; Copy is the link in a read-only field that selects itself (templates have no clipboard
helper), with Open beside Rotate and Turn off.

### ProjectCode

- **Layout:** detail tab with boxes: Repositories, Merge requests (open), Recent commits, Tags. Shown when Code is on.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `ProjectRepositories` | list | The linked repositories | repository (link to RepositoryDetail), description, storage, default branch, head commit, last change, clone URLs; Unlink | copy buttons; Unlink confirms ("the links of its commits stay") | `WorkEffortGitRepository` and `GitRepository` (`entity`); `get#GitCloneUrls`; `mantle.work.GitServices.remove#ProjectRepository` | `Project/EditRepositories` `RepositoryList` |
| `NewRepository` | dialog | Make one for the project | repository id (default the key in lower case), description, storage (on disk for code, in the database), content (large files in Git LFS) | storage as `radio` | `create#ProjectRepository` | `EditRepositories` `CreateRepositoryForm` |
| `LinkRepository` | dialog | Link an existing one | repository | `drop-down` of the repositories the user may view | `add#ProjectRepository` | `EditRepositories` `AddRepositoryForm` |
| `OpenMergeRequests` | list | Its open merge requests | `!num`, title, repository, author, reviewers, CI | | `find#MergeRequests` (new) with the project's repositories | GitLab project merge requests |
| `RecentCommits` | list | The default branches' last commits | repository, commit, summary, author, date, linked items | | `org.moqui.impl.GitServices.get#GitLog` per repository, ten each | Redmine repository revisions |
| `ProjectTags` | list | Tags linked to the project, its milestones and releases | repository, tag, commit, linked by, when; Remove | | `WorkEffortGitRef` (`entity`); `mantle.work.GitServices.remove#WorkEffortRef` | `EditRepositories` `ProjectRefList`; `ProjectSummary` `ViewGitTagList` |

- **Navigation:** a repository opens RepositoryDetail; a merge request MergeRequestDetail; a commit CommitDetail.
- **States:** a tab cannot be left out by a condition (impl-projects.md F24), so with the Code module off the tab says
  so (Settings for managers) and still lists any linked repository; without git hosting in the build it says that.
  When the project shares its repositories with the client, client users see Repositories (with the
  HTTPS clone URL, cloning read only with their user name and password: no SSH and no Git access, so no access token),
  Recent commits, Open merge requests and Tags, read only; when it shares none, the tab says the project's code is not
  shared with them. As built (impl-projects.md P10b) they also open the read-only Code screens of those repositories
  (§7, "Clients").
- **Source:** research §16 and mr-moqui `docs/interfaces/Git-Hosting.md` "Projects and tasks"; baseline `Project/EditRepositories`.
- **Needs:** Code review store; Repository list with access.

### ProjectDocs (Context passed)

The Knowledge editor (design-drawers-commons §10) with the space fixed to the project's documentation space,
named in its settings (`WstDocsWikiSpace`). The space is made in NewProject or here ("Set up documentation"):
in the project's repository, rooted at `git://<repositoryId>/docs` so pages are Markdown files beside the code,
committed on each save and readable in any clone, or on database files. Below the tree, **Linked pages** lists
the pages of other spaces linked to the project (`WikiPageWorkEffort`), with Link page and Unlink. Projects' row
of the Knowledge per-app table:

| App | Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- | --- |
| Projects | the tree, the page, history and compare, review | the project's space; linked pages of other spaces | all of Commons'; link and unlink a page of another space | documentation that travels with the code |

Services beyond the Commons version: `org.moqui.impl.WikiServices.create#WikiSpace` with `rootPageDirectory`;
`WikiPageWorkEffort` (`entity`), which covers `Project/EditWikiPages` `AddWpweForm` and `DeleteWpweForm`.

As built (P4b): the tab is Commons `Knowledge.xml` mounted in ProjectDetail; `Knowledge.qvue` has a project mode (its setup
answers the project's space through `ironstone.projects.ProjectServices.get#ProjectDocs`): the side pane names the space and its
storage instead of the space choice and has Linked pages (Link a page of another space, Unlink) in place of Recent and the
Commons links; a page of another space opens in Commons Knowledge. A project with no space shows "Set up documentation" to
those who manage it: in a repository of the project the user may update (not a mirror), or on database files
(`mantle.work.ProjectServices.create#ProjectDocsSpace`, also NewProject's documentation choice). The space's home page is
`docs/<SPACE>.md` and its pages are under `docs/<SPACE>/` (the wiki's page files sit under a directory named as the home page,
impl-projects.md F7), each save a commit on the default branch that a branch rule does not refuse. The space is members only
(`restrictView`) unless the project is All users or General, changed by members only (`restrictUpdate`), and its
`WikiSpaceUser` rows follow the project's internal members (`sync#ProjectDocsSpaceUsers`, by a rule on `WorkEffortParty`;
ProjectManager and Manager administer it), so a repository's docs are never readable by those the project hides them from.
The terminal (impl-projects.md P11): ProjectDetail mounts Commons' `KnowledgeTui` beside the tab in a project mode: the
project's space only, its linked pages, the page with the pages under it, links that stay in the tab, and Set up
documentation on database files for a manager of a project without a space; editing is the browser's.

### ProjectTeam

- **Layout:** detail tab with boxes: Members, Teams, Client contacts, Allocations.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `TeamMembers` | list, editable rows | Members and their roles | person, role, from, thru, expectation, position class, status, notifications | person `server-search`; thru and status edited in place | `WorkEffortParty` (`entity`); `add#WorkEffortParty`, `mantle.work.WorkEffortServices.remove#WorkEffortParty` | `Project/EditUsers` `AddUserAssignForm`, `UpdateUserAssignForm`; `Party/PartyProjects` `AddUserAssignForm`, `UpdateUserAssignForm` |
| `TeamGroups` | list | Teams on the project (`OrgTeam`) | team, from, thru | | `add#WorkEffortParty` with `OrgTeam`; `mantle.work.ProjectServices.get#ProjectTeams` | `Task/EditUsers` `AddTeamAssignForm` |
| `ClientContacts` | list | The client side | person, role (`Customer`, `ClientManager`, `ClientBilling`), email, may sign in | the sign-in column links to Admin's user account for those who have one | `WorkEffortParty` (`entity`) | `create#Project` client roles; Dolibarr project contacts |
| `ProjectAllocations` | list | Who is planned on it | person or role, from, thru, hours per week, status chip | Request allocation dialog | `mantle.work.ResourceServices.create#Allocation` (new) | OpenProject resource allocations |

- **Source:** research §9 (OpenProject members and staffing, Redmine members), §3; baseline `Project/EditUsers`,
  `Party/PartyProjects`.
- **Needs:** Allocations.

### ProjectTime (Context passed)

TimeEntries (§8) with the project fixed, with a totals box above the list (hours by person and by work type,
billable against not billable) and the managers' Update rates action
(`mantle.work.TimeServices.resetAndGet#ProjectTimeEntryRates`), which covers `Project/ProjectTimeEntries`.
Clients see it only when the project shares hours with the client, as hours by week and work item with no rates,
amounts or people's names beyond the team's.

As built (impl-projects.md P6b): `Time/TimeEntries.xml` mounted as tab 10, the project fixed by `projectTabId` (F43's fallback in
its transitions), the list opening on All. The box "Time on the project" (`ironstone.projects.TimeServices.get#ProjectTime`) sums every
entry of the find, not only the page: hours against the project's estimate (`estimatedWorkTime`, rolled up), billable against
not, the client amount and worker cost for those who manage money, and the hours by person, by work item against each item's
estimate (the 15 with the most) and by work type. Update rates is for a manager of the project who manages money. The tab is
always there (F24).

### ProjectMoney

- **Layout:** detail tab with boxes: Budget and actuals, Rates, Unbilled, Milestone billing, Invoices, Expenses,
  Commercial (the order, agreement and opportunity behind the project). Managers only; shown when Money is on.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `BudgetActuals` | single | Caps against actuals | hours budget, client budget, billing basis; estimated, actual and remaining hours; actual cost, actual client cost, profit, budget remaining and used %; the flags | caps edited in place | `get#ProjectStats`; `update#Project` | `EditProject` `EditProject` (Hours Budget, Cost Budget); `ActiveProjectSection`; ERPNext project costing |
| `ProjectRates` | list | Rates scoped to this project | purpose, person or position class or work type, rate, from, thru | Add rate dialog | `RateAmount` (`entity`); `create#RateAmount`, `mantle.humanres.RateServices.update#RateAmount` | `HumanRes/EditRateAmounts` `CreateRateAmount`, `EditRateAmounts` |
| `UnbilledBox` | display | What is waiting to be billed | unbilled hours and amount, expenses, reached milestones; Create invoice | opens Unbilled's dialog for the project | `mantle.work.ProjectServices.get#UnbilledSummary` (new) | Odoo project profitability; ERPNext billing |
| `MilestoneBilling` | list | Order line shares released by milestones | milestone, order line, share %, amount, milestone status, invoiced | Invoice milestone when complete | `OrderItemWorkEffort` (`entity`, with the new `invoicePercent`); `mantle.account.InvoiceServices.create#MilestoneInvoiceItems` (new) | Odoo milestone billing (`sale_line_id`, `quantity_percentage`) |
| `ProjectInvoices` | list | Invoices of the project | invoice, type, to or from, date, total, status | links to InvoiceDetail | `WorkEffortInvoice`, `TimeEntry.invoiceId` (`entity`) | `ProjectTimeEntries` invoice links; Odoo embedded invoices |
| `ProjectExpenses` | list | Expense invoices on the project | person, date, description, amount, status, billed | read only; capture is People's | `WorkEffortInvoice` with the expense invoices (`entity`) | `MyAccount/Expense/FindExpenseInvoice` `InvoiceList` |
| `Commercial` | list | What the project fulfils, and purchases made for it | sales order lines, agreement items, the opportunity, purchase order lines; link and unlink | line `server-search` | `OrderItemWorkEffort`, `AgreementItemWorkEffort`, `SalesOpportunityWorkEffort` (`entity`) | research §11 sales handoff, §14 purchasing links; Odoo `sale_project`, `project_purchase` |
| `MaterialEstimates` | list, editable rows | Materials and licenses the project needs | product, estimated quantity, estimated cost, status | Add product dialog | `mantle.work.WorkEffortServices.add#WorkEffortProduct`; `WorkEffortProduct` (`entity`) | OpenProject material budget items |

- **Actions:** Create invoice (Unbilled's dialog for the project); Print estimate (`html-print`: the work breakdown from
  the top-level items down to a chosen depth, each line with its roll-up hours and amount at the client rates, the
  milestones, and the total); Send estimate for approval: the estimate is saved as a file of
  the project's first milestone, **Estimate** (made when missing, with a gate whose approver is the project's
  `ClientManager`, else its `Customer` contact), and the gate's approval is requested, so the client approves the
  estimate in MilestoneDetail as any gate and no other approval record is needed.
- **As built (impl-projects.md P8b):** `ProjectDetail/Money.xml` (tab 11, always there as F24 says) over
  `ironstone.projects.BillingServices.get#ProjectMoney` and `mantle.work.ProjectServices.get#ProjectMoneySummary`; for those who manage money
  (`check#Money`), others see that it is theirs. Number cards (value at client rates, budget used, invoiced, unbilled, milestone shares
  due); Budget and actuals (the billing basis and caps against hours, value at client rates, cost at the workers' rates and profit, from
  the project's rolled-up `actualCost`/`actualClientCost`; Edit is `save#ProjectMoney`); Unbilled (Create invoice is Unbilled's dialog,
  mounted as a subscreen of the tab, now with the milestone shares due); Commercial is the order lines only (Link an order line over the
  client's open sales orders, Unlink; `mantle.work.ProjectServices.link#ProjectOrderItem`); Milestone billing; Invoices; Expenses; Rates
  read only with All rates. The agreement, opportunity and purchase lines of Commercial and `MaterialEstimates` are later. Print estimate
  is `Projects/Projects/EstimatePrint` (html-print of `get#ProjectEstimate`: the breakdown to a depth of 1 to 4, each line's roll-up
  hours at the project's standard client rate, the order lines, the milestones, the total). Send estimate for approval is
  `mantle.work.ProjectServices.send#EstimateForApproval` as designed; the estimate is not emailed (the gate's notice goes to the
  approver's users, and a client contact has none until P10), and its approval also moves the project from In Planning to Approved and
  its open or proposed sales orders to Approved (sending makes an open order a quote, OrderProposed).
- **Source:** research §10 (OpenProject budgets, Odoo analytic and invoicing policies, ERPNext costing), §11;
  baseline `EditProject` budget fields and `ProjectTimeEntries`.
- **Needs:** Milestone billing share; Billing services; Milestone approval (the estimate).

### ProjectFiles (Context passed)

The `record-files` element over the project (design-drawers-commons §9 RecordFiles, no per-app context): the
`WorkEffortContent` files under the Records drive's `work/<KEY>` folder. Internal users only.

### ProjectSettings

- **Layout:** settings page of boxes: General, Modules, Work items, Intake, Code, Billing, Client access,
  Template, Close and delete.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `ProjectGeneral` | single | The project's record | name, purpose, priority, visibility, status flow, client, vendor, program, start and target dates, description | client and vendor `server-search`; status through the flow | `update#Project` | `EditProject` `EditProject` |
| `ProjectModules` | single | Tabs on or off | Backlog and sprints, Requests, Code, Docs, Time, Money, Client access | | `store#ProjectSetting` (new) | Redmine project modules |
| `ProjectWorkItemSettings` | single | How work items behave | types offered, work item flow, estimate unit (hours, points), several active sprints (off; for teams sharing a project), new items shared with the client (yes, no), Fixes keywords complete items (on), a request completes when its work does (on) | | `store#ProjectSetting` | OpenProject per-project work-package settings; Redmine trackers per project |
| `ProjectComponents` | list, editable rows | Components | name, lead (their default assignee for new items of it), description | | `mantle.work.ProjectServices.create#Component` (new); `WorkEffort` (`entity`) | Redmine issue categories; Jira components |
| `ProjectIntake` | single | How requests arrive | mail account and plus tag, public form on and its link (rotate), triage assignee, default request type, new requests become (requests, work items for internal senders) | | `store#ProjectSetting`; `mantle.request.RequestServices.create#IntakeToken` (new) | Odoo project email alias; Redmine mail handler |
| `ProjectCodeSettings` | single | Code conventions | branch name pattern (`<KEY>-<n>-<words>`), merge request opened moves items to In Review, merged moves them to Complete, require a work item in commits to protected branches | | `store#ProjectSetting` | Git-Hosting "Projects and tasks" |
| `ProjectBilling` | single | How it is billed | billing basis, invoice grouping (per entry, per worker, one line), time detail attached to invoices, hours shared with the client | | `store#ProjectSetting`; `update#Project` | `FindInvoice` `ProjectInvoice` grouping |
| `ClientAccess` | single | What clients see | client sign-in on, repositories shared read-only | | `store#ProjectSetting` | Odoo project sharing; Redmine roles |
| `TemplateBox` | single | Template | save as template (a copy kept as a template), this project is a template | | `clone#Project` with `isTemplate`; `update#Project` | OpenProject templated projects |
| `CloseProject` | single | End or remove | close, cancel, delete an empty project | each confirms naming the project; delete only with no time, invoices or commits linked | `update#Project`; `mantle.work.WorkEffortServices.delete#WorkEffort` with `deleteChildWorkEfforts` | OpenProject archive and delete; Redmine close |

- **Source:** research §13 (OpenProject per-project settings, Redmine project settings tabs), §2; baseline
  `EditProject`.
- **Needs:** Project settings; Releases and components; Template flag; Email intake; Public request form; Client
  access.

### Roadmap

- **Layout:** list of milestones and releases across the projects the user sees, grouped by project with each
  plan item's progress, as Redmine's roadmap shows versions. Chips: Upcoming (default), Overdue, Awaiting
  approval, Completed, All; Milestones, Releases. New milestone and New release open dialogs.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `RoadmapFind` | find | Narrow | project, type, status, due period, text | `date-period` | | `EditMilestones` list; Redmine roadmap filter |
| `RoadmapList` | list, editable rows | The plan items | id, name (link to its detail), project, type chip, start, due, status chip, progress (done of total items, hours), reached or released date, billing share | dates and status edited in place; progress as `q-linear-progress` | `mantle.work.ProjectServices.update#Milestone`; `get#ProjectMilestoneSummary` | `EditMilestones` `MilestoneList`; `ProjectSummary` `MilestoneList`; Redmine roadmap; Odoo milestones |
| `NewMilestone` | dialog | A milestone | project, id (`<KEY>-MS-<n>` suggested), name, start (when it marks a phase), due, status | | `mantle.work.ProjectServices.create#Milestone` | `EditMilestones` `CreateMilestoneForm` |
| `NewRelease` | dialog | A release | project, version (its name, as `1.4.0`), start, planned date, description | | `mantle.work.ProjectServices.create#Release` (new) | Redmine version form; OpenProject version form |

- **Views:** list; calendar by due date (`view-calendar`, range-find); timeline, which opens Timeline in plan mode.
- **States:** clients see their projects' plan items, read only.
- **As built (P4b):** `ironstone.projects.PlanningServices.find#RoadmapItems` (up to 500, not paged, so the calendar has every row and
  no range-find); the list is sorted by project and then due date with a project column (list grouping is §16 later); a second
  row of kind chips (All kinds, Milestones, Releases; Sprints in a project's tab); due and status edited in place by the
  project's team (`update#PlanItemField`; the status along the `Default` flow); progress is done of the items (cancelled left
  out) with the hours, from `mantle.work.ProjectServices.get#PlanItemSummary`; Awaiting approval (P8b) is a chip between Overdue
  and Completed (milestones whose gate's request waits), and the status cell shows a Gate or Awaiting approval chip; the billing share
  column is left to the milestone and the Money tab, since the roadmap is the team's and money is not. The timeline view (P4c) is a Timeline button that opens the Timeline in plan mode on the same list and
  project (in a project's tab, its Plan tab's Timeline in plan mode). New milestone and New release are for the project's
  team (not only managers).
- **Source:** research §7 (OpenProject versions and phases, Redmine roadmap, Odoo milestones); baseline
  `Project/EditMilestones`.
- **Needs:** Releases and components; Milestone approval.

### MilestoneDetail

- **Layout:** detail. Title row: name, project chip, `status-bar` (the `Default` flow), start and due, a gate chip
  when approval is required. Boxes: Progress, Work items, Deliverables, Billing, Gate; Chatter as the right column
  from 1440 px. A milestone with a start date is drawn as a phase (a bar) on the Timeline; without one it is a
  diamond.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `MilestoneHeader` | single | The milestone | name, start, due, status, description | status through the flow | `update#Milestone` | `EditMilestones` `MilestoneList` |
| `MilestoneProgress` | display | Hours and items | estimated, actual and remaining hours and days, % complete, items done of total | | `get#ProjectMilestoneSummary` | `ProjectProgressReport` `MilestoneStatsList` |
| `MilestoneItems` | list, editable rows | Its work items by state | priority, type, key and title, status, due, estimate, actual; chips Not started, In progress, Done | status and estimate edited in place; Add items (a search) and Remove | `mantle.work.TaskServices.update#Task`, `set#TaskMilestone` | `MilestoneSummary` `InactiveTaskList`, `ActiveTaskList`, `DoneTaskList` |
| `Deliverables` | list, editable rows | What it hands over | deliverable name, type, description, accepted | | `Deliverable` and `WorkEffortDeliverableProd` (`entity`) | Dolibarr project elements; services delivery practice |
| `MilestoneGate` | single | Approval to complete | requires approval, approver (a manager or a client contact), requested, decided, by, note | Request approval; the approver decides here (a client contact always here) or from the tray's Approvals | `mantle.work.ProjectServices.request#MilestoneApproval` (new); `approve#MilestoneApproval` and `refuse#MilestoneApproval` (new) through the topic `MilestoneApproval` | OpenProject phase gates |
| `MilestoneBillingShare` | list | The order line shares it releases | order line, share %, amount, invoiced | | `OrderItemWorkEffort` (`entity`); `create#MilestoneInvoiceItems` (new) | Odoo milestone billing |

- **Actions:** the next status (Complete asks for approval when the gate requires it); Request approval; Invoice
  milestone (managers, when complete); Move unfinished items (to another milestone).
- **As built (P4b):** the title row, Progress as number cards (items done, percent, hours or points done, due), Work items
  with the chips All, Not started, In progress, Done (no in-place edits: a row opens the work item), Add items (a search of
  the project's items, `search#PlanItemCandidates`) and Remove, Chatter; the moves for the project's team with Complete
  labelled Reach; Move unfinished items to another open milestone or out of any.
- **As built (P8b):** the gate is the milestone's `WstApprovalRequired` and `WstApproverParty` (a current party of the project: its
  managers and client contacts are offered) with a `WorkEffortApproval` record per request (Requested, Approved, Refused, Cancelled;
  requested and decided by, when, the note). A gated milestone not approved has no Reach: its primary is Ask for approval (the team),
  and while a request waits, Approve (which reaches it) and Refuse (a reason required) for the approver's own user or, recording it
  for them, one who manages the project (`MILESTONE_APPROVE`, the Projects managers); until client users sign in (P10) the manager
  records the client's decision, marked so. As built (impl-projects.md P10b): a client contact who is the approver approves or
  refuses here (`ironstone.client.ClientServices.decide#ClientGate`, recorded as its own), opens the estimate file only as the
  approver, and has no other control (no gate settings, deliverable acceptance, billing or moves). `update#Milestone` refuses Complete or Closed before the approval. Withdraw the request is
  in More. A Gate chip in the title row. The Billing box (money holders) lists the shares with Add share (percent of a line or a fixed
  amount; the lines are the project's, from its Money tab) and Invoice milestone when due. The Deliverables box: added by the team,
  accepted by those who decide the gate (`WorkEffortDeliverableProd` gained `sequenceNum`, `acceptedDate`, `acceptedByUserId`; seed
  `DeliverableType`).
- **Source:** research §7 (milestones, phases and gates); baseline `Project/MilestoneSummary`.
- **Needs:** Milestone approval; Milestone billing share; `chatter`.

### ReleaseDetail

- **Layout:** detail. Title row: version, project chip, `status-bar` (In Planning, In Progress, Complete as
  released, Closed), planned and released dates, the linked tag. Boxes: Work items, Merge requests, Tag, Release
  notes; Chatter as the right column from 1440 px.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `ReleaseHeader` | single | The release | version, planned date, description, status | | `mantle.work.ProjectServices.update#Milestone` (it updates any plan item) | Redmine version form |
| `ReleaseItems` | list | What it carries | type, key and title, status, assignee; grouped as Features, Fixes, Other | Remove; Add items | `mantle.work.TaskServices.set#TaskRelease` (new) | Redmine version detail related issues; OpenProject version page |
| `ReleaseMergeRequests` | list | Merged and open merge requests of its items | `!num`, title, status, merged | | `WorkEffortGitMergeRequest` (new, `entity`) | GitLab milestone merge requests |
| `ReleaseTag` | single | The tag that marks it | repository, tag, commit; Create tag at a ref, Link an existing tag | ref `drop-down` from `org.moqui.impl.GitServices.get#GitRefs` | `org.moqui.impl.GitServices.create#GitRef` (new); `mantle.work.GitServices.add#WorkEffortRef` | `EditSource` `AddRefForm` |
| `ReleaseNotes` | single | Notes for the release | notes (markdown); Generate draft, Publish to docs, Commit to the repository's `CHANGELOG.md`, Email followers | `text-area editor-type="md"` | `mantle.work.ProjectServices.generate#ReleaseNotes` and `publish#ReleaseNotes` (new); `org.moqui.impl.GitServices.commit#GitFiles` | Redmine and OpenProject version wiki page; changelog practice |

- **Actions:** Release (primary when In Progress: confirms; completes the release with its date, creates the tag
  when asked, moves unfinished items to the next release or to none, and publishes the notes); Generate draft.
- **States:** clients see the version, dates, the shared items and the published notes. As built (impl-projects.md P10b):
  `get#ReleaseNotesInfo` answers a client the notes only once published (never the generated draft, which names every item);
  a merge request names only the items the user sees (`ironstone.projects.CodeServices.get#VisibleWorkEfforts`).
- **As built (P4b):** the work items in one list with a Kind column (Features, Fixes, Other) rather than grouped (list grouping
  is later); the merge requests and tags only of repositories the user may view (`get#ReleaseCode`); Create tag (an annotated
  tag, by default `v` and the version, at a ref given or the default branch) and Link a tag; the notes are kept as the
  release's `WorkEffortContent` of the new type `WectReleaseNotes`, shown as a generated draft until saved, edited in the
  markdown editor (Save notes), Generate draft replaces them, Publish publishes the saved notes to the docs space (the page
  `Releases/<version>`, linked to the release by `WikiPageWorkEffort`), a `CHANGELOG.md` commit and the followers (the topic
  `ReleasePublished`, which emails by the user's preference) — Email followers is that notice; the Release dialog moves the
  items not done to another open release or out of any, makes the tag, publishes and tells the followers.
- **Source:** research §7 (versions and roadmap); mr-moqui Git-Hosting tag conventions.
- **Needs:** Releases and components; Git refs (create a tag); Release notes; Release tags by version.

## 5. Work items

A work item is a `WetTask` work effort whose `rootWorkEffortId` is its project; its key is its id, `<KEY>-<n>`.
Projects calls it a work item and Commons a task (research-crosscut §6); it is the same record and the same detail
screen.

**Types** are the work effort's purpose, as in SimpleScreens. Settings/WorkItemTypes chooses which are offered and
a project narrows them; each has one icon used in lists, cards, the backlog and the timeline:

| Purpose | Label (the purpose's description) | Icon | Offered by default |
| --- | --- | --- | --- |
| `WepTask` | Task | `sym_o_task_alt` | yes |
| `WepFix` | Bug Fix | `sym_o_bug_report` | yes |
| `WepNewFeature` | New Feature | `sym_o_new_releases` | yes |
| `WepFeatureEnhance` | Feature Enhancement | `sym_o_trending_up` | yes |
| `WepFeatureTest` | Feature Test | `sym_o_science` | yes |
| `WepDocument` | Document | `sym_o_description` | yes |
| `WepSupport`, `WepResearch`, `WepDeployment`, `WepDevelopment` | Support, Research, Deployment, Development | `sym_o_support_agent`, `sym_o_travel_explore`, `sym_o_rocket_launch`, `sym_o_code` | yes |
| `WepToDo`, `WepCommunication` | To Do, Communication | `sym_o_check_box`, `sym_o_forum` | no (activities use them, design-drawers-commons §15) |
| `WepPlaceholder` | Placeholder | `sym_o_crop_free` | no (left out of progress, as `MilestoneSummary` does) |

**The work item tree.** Work items nest to any depth by `parentWorkEffortId`, as the baseline's task tree (SimpleScreens
`ProjectSummary`, and HiveMind's before it) has them. An **epic** is any work item with sub-items, and an epic's
sub-items may be epics of their own, so a project is a work breakdown: epic, feature, story, task for a software
team, or deliverable, work package, task for a services estimate. The tree stays inside one project (a parent is in
the same project, never the item itself or one of its descendants, and a move to another project takes the subtree
along), and any type may be a parent. The items with no parent are the project's **top-level items**, the roots of the
tree and the rows of the Progress report. A parent keeps its own estimate, remaining and actual hours and points for
the work not broken down further (coordination, review), and everywhere an item's numbers are shown beside its
subtree's **roll-up**: its own plus all its descendants', cancelled items left out, as
`mantle.work.ProjectServices.get#WorkEffortChildStats` already sums them. An hours budget (`totalTimeAllowed`) is set
on a top-level item, as the baseline does, and covers its whole subtree (the roll-up sums budgets, so one deeper
down would count twice). Start and due of a parent are its own; the Timeline draws the span of its subtree
around them. Ranks (`sequenceNum`) order the children of one parent, so a tree reads in the order it was planned.
**Status** follows the work item's flow, else its project's, else `Default` (as
SimpleScreens `EditTask` resolves it). Two flows are offered: `Default` (In Planning, Approved, In Progress, On
Hold, Complete, Closed, Cancelled) and the new `WorkEffortDevelopment`, which adds In Review and In Testing between
In Progress and Complete for software teams. Complete and Cancelled ask for a resolution (`WerCompleted`,
`WerWontComplete`, `WerDuplicate`, `WerCannotReproduce`, `WerInsufficient`, `WerIncomplete`). **Priority** is
1–9, shown in Commons' bands (high 1–3, normal 4–6, low 7–9) with the number kept. **Estimates** are hours by
default, or story points when the project estimates in points; remaining and actual hours come from time entries
(`mantle.work.TaskServices.update#TaskFromTime`). **Visibility** decides who beyond the team sees an item:
General shares it with the project's client, Work group keeps it internal (the default unless the project says
otherwise), Restricted keeps it to its parties and the project's managers.

### WorkItems

- **Layout:** list. A chip row of smart lists: Open (default), Assigned to me, Reported by me, Watching, Unassigned,
  Due this week, Overdue, Recently changed, Done; then the saved finds pinned for this app, the user's and those
  shared with the user's groups, among them the seeded Open bugs, Blocked, In review and Current sprint. A search
  line (text over the `MantleTask` index then the database, as `FindTask` does; a key jumps to the item). A
  quick-add row at the top of the table: type, title, assignee, project (when not fixed), and the sprint when the
  Current sprint chip is on; Enter adds and stays. Sums of estimate, remaining and actual below the rows.
  **Peek**, a toggle beside the view switch (kept per user): a row's click opens its WorkItemDetail in a wide pane
  on the right of a `container-split`, the list narrowing to its first columns and keeping its selection, find and
  scroll; the up and down keys move the pane through the rows, Open full goes to the detail, and
  Escape closes the pane. The selected key is in the URL, so a peeked item is a link. Below 1280 px Peek is off and
  a row opens the detail.
  **Tree**, the fourth view (below), shows the same find as the work item tree with roll-ups.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `WorkItemFind` | find | Beyond the chips | text, key, project, type, status, resolution, priority band, assignee, reporter, team, milestone, release, sprint, component, label, parent, under (an item, at any depth), top-level only, due and updated periods, estimate range, visibility, recurring | `date-period`; `allow-multiple` on type, status and assignee | | `FindTask` `SearchOptions` and `ListTasks` header; Redmine issue query filters; OpenProject work-package filters |
| `WorkItemList` | list | The work items | type icon, key (link), title (with a repeat mark when it recurs), status chip, priority, assignees, due, estimate, project, parent, top-level item, sprint, milestone, release, component, labels, remaining, actual, updated | `saved-finds`, `select-columns`, CSV and XLSX; `row-selection`; due and priority edited in place; `show-total` on the hours | `WorkEffortAndParty` (`entity`); `mantle.work.TaskServices.update#Task` | `FindTask` `ListTasks`; Redmine issue list; OpenProject work-package table |
| `QuickAddWorkItem` | list, first row | Add without leaving | type, title, assignee, project, sprint | a form row at the top of the card, as Commons Tasks | `create#Task`; `set#TaskSprint` (new) | `FindTask` `NewTaskForm`; Commons `NewTask`; OpenProject inline create |
| `WorkItemTree` | list, `view-tree` | The work item tree | as `WorkItemList`, plus for a parent its subtree's roll-up: estimate, remaining, actual, hours budget, % done (estimate less remaining over estimate), done of total items | `view-tree` (new) on `parentWorkEffortId`: indent, expand and collapse (children fetched on open), Expand to level 1, 2 or 3 and Expand all; estimate, remaining and hours budget edited in place; drag to reorder or re-parent; Add sub-item (+) on a row's hover | `mantle.work.ProjectServices.get#WorkItemTree` (new); `update#Task`; `mantle.work.TaskServices.move#Task` (new) | SimpleScreens and HiveMind `ProjectSummary` `TaskTree`; OpenProject hierarchy mode; Redmine subtasks; MS Project outline |
| `WorkItemBulk` | list, bulk | On the selected items | assign, unassign, status, move to project, move under an item (or to the top level), milestone, release, sprint or component, priority, due, add or remove a label, visibility, link to a request, delete (managers, items with no time or links) | each a dialog; each item in its own transaction, the failures counted and named | `mantle.work.WorkEffortServices.add#WorkEffortParty`, `remove#WorkEffortParty`; `update#Task`; `set#TaskMilestone`, `set#TaskRelease`, `set#TaskSprint`, `mantle.work.TaskServices.set#TaskComponent` (new); `WorkEffortCategoryAppl`, `RequestWorkEffort` (`entity`); `delete#WorkEffort` | `FindTask` `AssignTaskSelected`, `UnAssignTaskSelected`, `UpdateTaskSelected`; Redmine bulk edit |

- **Actions:** New work item (quick add, or QuickCreate for more fields); bulk as above; per row: open, start the
  timer, done.
- **Views:** list; board, grouped by status by default (the flow's columns, a drag moving the item through its
  flow and refused moves going back with the flow's message), and by assignee, sprint, milestone, release or
  priority from the board's group choice, a drag setting that field; calendar by due date (range-find, a drag
  moving the due date); **tree**, the work breakdown: every matched item under its ancestors, an ancestor the find
  leaves out shown in muted text so no item loses its place (OpenProject's hierarchy mode), the roots the top-level
  items (and across projects, the projects, each with its roll-up). A drag between rows reorders siblings
  (`sequenceNum`); a drop on a row makes it the parent; Tab and Shift+Tab on the focused row indent it under the
  sibling above or outdent it to its grandparent; Enter in the quick-add row adds a sibling of the focused row and
  Ctrl+Enter a child of it. With the estimate cells edited in place and the roll-ups recomputed as each changes, a
  breakdown estimate is built here line by line before any work starts. The view chosen is kept per user and
  screen, so a project's Work items tab can open as its tree. The Timeline item in the view switch opens Timeline
  with the same find.
- **States:** "No work items match" with Clear filters; a project with none says "No work items yet" with the
  quick-add row focused. Clients see the items shared with them, with no bulk actions, no quick add (they raise
  requests instead) and no estimate or time columns; in the tree an item not shared with them is left out and its
  shared children are shown under its nearest shared ancestor.
- **Devices:** phone (the table scrolls in its card; the quick-add row stays; no Peek; the tree shows the key, title,
  status and roll-up estimate, indented at most four levels, with deeper levels opened one at a time).
- **Source:** research §4 (OpenProject query model and split view, Redmine compact columns and filters, Odoo task
  views), §5 (boards as views with a column action); Ever Gauzy quick look for Peek; baseline `Task/FindTask`, and
  the task tree of `Project/ProjectSummary` (and HiveMind's) for Tree; Commons Tasks for the chips and quick add.
- **Needs:** List views (exist); `view-board` group fields; `view-board` all rows; `view-tree`; Work item tree; Peek
  pane; Sprints; Labels; Rank; Recurring work items.

### WorkItemDetail (`Shared/WorkItemDetail`)

The base design of the Task / work item screen (research-crosscut §3.12). One file, `screen/Shared/WorkItemDetail.xml`,
mounted by Projects at `Projects/WorkItems/WorkItemDetail` and by Commons at `Commons/Tasks/TaskDetail`, and later by
Customer Service, Sales and People; the including app's context (Per-app context below) chooses the tabs, fields and
actions.

- **Layout:** detail. Above the title, the item's path as breadcrumbs: the project, then each ancestor from the
  top-level item down (key and title, each a link), so where an item sits in the breakdown is always shown. Title row:
  the type icon, the key as a `text-mono` chip with copy, the title (`h5`, edited in place), the `status-bar` of the item's flow with Hold and Cancel beside it, and the next status as the primary
  action. A facts row under it: assignees, due (overdue in warning), priority, estimate (for a parent, its own and
  "with sub-items", the roll-up), sprint, milestone, release.
  Secondary menu: Assign to me, Start or stop the timer, Log time, Create branch (opens the Development tab, whose
  Branches box has the dialog; Create merge request is a branch row's New merge request there, for a branch ahead of the
  default), Repeat, Watch or Unwatch, Move to project, Clone, Convert to request, Print,
  Delete (the owner or a manager, for an item with no time, sub-items, comments or links).
- **Recurring work items:** periodic work (a monthly report, a quarterly filing, a weekly backup check, a yearly
  renewal) repeats by a rule on the item, Commons' RRULE (`WorkEffortRecurrence`, design-drawers-commons §7). One
  item is open at a time: when it is completed, or cancelled (Cancel on a recurring item asks: skip this one, or stop
  repeating), the next is made as a copy of it
  (type, title, description, project, parent, assignees and team, watchers, priority, labels, component, estimate
  and visibility; not its sprint, time, comments or files) with its start and due from the rule, counted from the
  item's due date (on schedule) or from the day it was completed, as the rule says. The rule stays on the first item,
  the series, and each next item is linked from it by `WorkEffortAssoc` `WeatRecurrenceInstance`; "Stop repeating"
  ends the rule. A recurring item shows the rule in words under the facts row ("Every month on the 1st; next made
  on completion").
- **Sections and tabs:**
  - Overview: Description (markdown); Details (type, priority, assignees and team, reporter, project, parent,
    milestone, release, sprint, component, labels, start, due, estimate, remaining, actual, % complete, visibility,
    repeat, resolution once closed; for a parent the roll-up of estimate, remaining and actual beside its own); Requests (the requests it serves); Linked records (record cards); People.
  - Sub-items: the item's subtree as a tree, to any depth, with each row's roll-up, the subtree's totals and progress
    above, and a quick-add row; a sub-item may be added under any row of it.
  - Links: relations by kind.
  - Development (after Links, when the item's project has the Code module on or a repository linked; its records are read
    only while the tab is open): branches, merge requests, commits, tags, CI. Create branch is the Branches box's dialog
    (More's Create branch opens the tab), and a branch ahead of the default with no open merge request has New merge
    request (Compare with the branch) on its row.
  - Time: the entries, the timer, Log time.
  - Files: `record-files`.
  - Chatter: the right column of Overview from 1440 px, a tab below; Projects opens it on Log note and shows time
    entries in the timeline.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `WorkItemHeader` | single | Title and status | title, status, resolution | title `editable`; `status-bar`; a resolution dialog on Complete and Cancel | `update#Task` | `TaskSummary` inline status and resolution; `EditTask` `EditTask` |
| `WorkItemDescription` | single | The description | description | `text-area editor-type="md"`, `markdown-view` when read | `update#Task` | `TaskSummary` TaskDescription |
| `WorkItemFields` | single | The details | type, priority, project, parent, milestone, release, sprint, component, labels, start, due, estimate (hours or points), remaining, visibility, hours budget (top-level items, for the subtree) | each field `editable` in place; project, parent and plan items `drop-down` `server-search` scoped to the project (`mantle.work.ProjectServices.get#ProjectMilestones`, `get#ProjectTasks`), the parent's search leaving out the item and its descendants | `update#Task`; `move#Task` (new) for the parent; `set#TaskMilestone`; `set#TaskRelease`, `set#TaskSprint`, `set#TaskComponent` (new); `WorkEffortCategoryAppl` (`entity`) | `EditTask` `EditTask`; OpenProject work-package form; Redmine issue attributes |
| `WorkItemRecurrence` | dialog | Repeat the item | frequency, interval, by weekday or month day, ends never, after n or on a date, count from (the due date, the completion date); Stop repeating | the RRULE editor of Commons' `Recurrence` form by `render-mode` | `mantle.work.TaskServices.set#TaskRecurrence` (new) | Commons EventDetail `Recurrence`; Odoo recurring tasks; Todoist and Microsoft To Do repeats |
| `WorkItemPeople` | list, editable rows | Who is on it | person or team, role (`RgpTask`), from, thru, expectation, position class, status, notifications | Add person (the project's people first, `mantle.work.ProjectServices.get#ProjectParties`), Add team dialogs | `add#WorkEffortParty`, `mantle.work.WorkEffortServices.replace#WorkEffortParty`; `WorkEffortParty` (`entity`) | `Task/EditUsers` `AddUserAssignForm`, `AddTeamAssignForm`, `UpdateAssignForm`; `Party/PartyTasks` `AddUserAssignForm`, `UpdateUserAssignForm` |
| `WorkItemRequests` | list | The requests it serves | request (link), name, type, status; Unlink | Link request (a search) | `RequestWorkEffort` (`entity`) | `Task/EditRequests` `AddRweForm`, `DeleteRweForm` |
| `LinkedRecords` | list | Records it is on (orders, parties, pages) | record card, linked by, when; Unlink | `m-record-card` | `mantle.work.WorkEffortServices.link#WorkEffortRecord`, `unlink#WorkEffortRecord`; `WikiPageWorkEffort` (`entity`) | Commons EventDetail `LinkedRecords`; `Task/EditWikiPages` |
| `SubItems` | list, `view-tree` | The subtree | type, key, title, status chip, assignee, due, estimate, remaining, actual; for a parent row its roll-up and done of total | `WorkItemTree` with this item as the root: expand and collapse, drag to reorder or re-parent within the subtree, indent and outdent, estimates edited in place | `get#WorkItemTree` (new); `move#Task` (new); `update#Task` | `TaskSummary` Child Tasks; `ProjectSummary` `TaskTree`; Odoo sub-tasks |
| `NewSubItem` | list, first row | Add a child | parent (this item, or the focused row of the subtree), type, title, assignee, estimate | Enter adds and stays | `create#Task` with `parentWorkEffortId` | `TaskSummary` `NewChildTaskForm` |
| `WorkItemLinks` | list | Relations | kind (blocks, blocked by, relates to, duplicates, duplicated by, causes, caused by, clones, cloned by, based on), item (key, title, status), lag days for a dependency | Add link dialog: kind, project, item `server-search` | `WorkEffortAssoc` (`entity`) | `Task/EditRelated` `AddRelatedToForm`, `AddRelatedFromForm`, `DeleteRelatedToForm`, `DeleteRelatedFromForm`; OpenProject relations |
| `Branches` | list | Linked branches | repository, branch, head, ahead and behind the default, merge request, CI; Unlink | Create branch dialog: repository, from (the default branch), name (`<KEY>-<n>-<words of the title>`), and the checkout command to copy | `mantle.work.GitServices.create#TaskBranch` (new); `add#WorkEffortRef`, `remove#WorkEffortRef`; `org.moqui.impl.GitServices.get#GitCompare` (new) for ahead and behind | `Task/EditSource` `TaskRefList`, `AddRefForm`; GitLab "Create branch" on an issue |
| `Commits` | list | Linked commits | repository, commit (link), summary, author, date, on (branch), linked by; Unlink | Add commit dialog: repository, commit id or prefix | `mantle.work.GitServices.add#TaskCommit`, `remove#TaskCommit` | `Task/EditSource` `TaskCommitList`, `AddCommitForm`; `TaskSummary` Commits |
| `WorkItemMergeRequests` | list | Its merge requests | `!num`, title, status, approvals, CI, merged | | `WorkEffortGitMergeRequest` (new, `entity`) | GitLab issue's related merge requests |
| `WorkItemTime` | list | Time on it | date, person, hours, work type, billable, comment, client and vendor rate and amount (managers), invoice; Edit, Delete (own uninvoiced; managers any uninvoiced). As built (impl-projects.md P6b): the user's own entries (P2) and below them, in Projects, All time (`ironstone.projects.TimeServices.get#ItemTime`: everyone's on the item, the latest 100, the week's status, the amounts for those who manage money, a link to Time entries for the edits) | totals estimated, actual and remaining above | `store#TimeEntry`, `mantle.work.TimeServices.delete#TimeEntry` | `Task/EditTimeEntries` `TimeEntryList`; `MyAccount/User/TimeEntries` `TimeEntryList` |
| `LogTime` | dialog | Add time, or stop the timer with its details | person (managers), date, from and to or hours, break, billable, work type, position class, comment, remaining work | from and to `date-time`; remaining defaults to remaining less these hours | `mantle.work.TaskServices.add#TaskTime` | `EditTimeEntries` `AddTaskTime`; `PartyTimeEntries/EditTimeEntry` `AddTimeForm` |
| `Timer` | single | Start or stop | started, elapsed, comment | `m-elapsed` (new) | `mantle.work.TimeServices.create#TimeEntryClockIn`; `store#TimeEntry` | `TaskSummary` `ClockInForm`; `EditTimeEntries` `ClockInForm` |
| `Chatter`, `RecordFiles` | component | Timeline and files | | `chatter`, `record-files` | Shared/Chatter, Shared/RecordFiles | `TaskSummary` `AddCommentForm`, `NewContentForm`, `UpdateContentForm`; `TaskCommentReply` and `TaskCommentUpdate` `ReplyCommentForm` |

- **Actions:** the next status (primary); Assign to me; timer; Log time; Create branch; Create merge request (opens
  Compare with the branch); Repeat and Stop repeating (`set#TaskRecurrence`); Watch; Move to project (`update#Task`
  with `rootWorkEffortId`, which takes its plan items off and takes its subtree with it); Move under (`move#Task`);
  Clone (`mantle.work.WorkEffortServices.clone#WorkEffort`, with its sub-items by `deepClone` when asked); Convert to request (Commons'); Delete
  (`delete#WorkEffort`, confirms).
- **Navigation:** from WorkItems, the board, the tree, Backlog, Timeline, a notification, the palette, a commit or
  merge request, a request's Work tab, Today; up the breadcrumbs to an ancestor. A key in Chatter or a commit message renders as a record card.
- **States:** a user who may see but not change the item sees the same layout without the edits and actions;
  "not available" for an item the user may not see (R5, R28). In WorkItems' Peek pane it renders compact: the
  title row and facts row, then the description, the sub-items and Chatter one under the other (a tab would load the
  whole page, not the pane), with Open full in the title row.
- **Devices:** phone (tabs scroll; Chatter is a tab; the timer is in the secondary menu).
- **Source:** research §4 (OpenProject full view and relations, Redmine issue detail, Odoo task form and recurring
  tasks); baseline
  `Task/TaskSummary` and its tabs `EditTask`, `EditUsers`, `EditRelated`, `EditRequests`, `EditTimeEntries`,
  `EditSource`; Commons TaskDetail as built (M6).
- **Needs:** Shared work item and request detail; Sprints; Releases and components; Labels; Rank; Dependency lag;
  Git refs; Task branches; Code review store; Merge request links; `m-elapsed`; Time in Chatter; Project settings
  (the flow, estimate unit, branch pattern); Development status flow; Story points; Recurring work items; Peek pane;
  `view-tree`; Work item tree; Client access; Chatter for client users.

**Per-app context (Task / work item).**

| App | Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- | --- |
| Projects | Overview with every field, Sub-items, Links, Development, Time (everyone's, rates for managers), Files, Chatter | items of the projects the user sees | all of the above | planning and delivery |
| Projects, client users | Overview (type, status, priority, due, assignee's name, description), Sub-items (the shared ones), Chatter as messages (the Messages tab); as built (impl-projects.md P10b) no Links, Development, Time or Files tab and no More menu | items shared with the client in their projects | comment (Send message to the team, Reply) | progress of what they asked for |
| Commons | Overview without the planning fields, Sub-tasks (the same tree), Time (mine, clock in), Files, Chatter | tasks I am on, own or watch | complete, reassign, set due, repeat, clone, convert to request, add to Today, delete own | my next step (design-drawers-commons §8) |
| Customer Service | Overview, Chatter, Files | follow-ups of cases, and work items linked to a case (design-customer-service) | complete, reassign, set due; open in Projects | the case it serves |
| Sales | Overview, Chatter | follow-ups on opportunities, quotes and orders (design-sales) | complete, reassign, set due | the deal |
| People | Overview, Sub-tasks as a checklist | onboarding and offboarding items (design-people) | complete, reassign | the employee |

### Backlog

- **Layout:** board as `.qvue`, the planning view of one project: a toolbar (the project when not fixed, filters for
  assignee, type, label, component, epic (under an item, at any depth) and text, New sprint), the **Backlog** pane (the project's open items in no
  open sprint, in rank order, with quick add at the top) and the **Sprints** pane (the active sprint, then the
  planned ones, each collapsible with its dates, goal, item count and the sum of estimates against its capacity,
  and Start or Complete). Rows drag within a pane to re-rank and between panes to plan; a selection drags as one.
  Below 1024 px the panes stack, sprints first. It uses `m-avatar`, `m-dialog` with `m-form` and the `m-*` inputs,
  `q-list` and `q-expansion-item`, with HTML5 drag as `Gallery/Board.qvue` does. As built (impl-projects.md P4a): the
  backlog's items are the **leaves** of the work breakdown (open items with no sub-items, cancelled ones aside; a parent's
  estimate is its children's, and it is completed from the tree), while a sprint holds items at any depth; a row's menu does the same moves as a drag (top, bottom, to a
  sprint, back to the backlog) for phones and the keyboard; quick add puts the new item at the top of the backlog; the
  filters narrow the rows of both panes but not a sprint's total. The project's team ranks, plans, makes, starts and
  completes sprints; Plan in sprints is its managers'. The terminal has `BacklogTui` (impl-projects.md P11): the lists, Move
  (items to the backlog or a sprint, at the top, the bottom or after an item), New, Start and Complete sprint, and Plan in
  sprints; dragging is the browser's.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `BacklogList` | component | The ranked backlog | rank handle, type icon, key, title, epic (its top-level item, as a chip that filters by it), estimate, assignee, labels, release | drag; quick add | `mantle.work.TaskServices.set#TaskBacklogRank` (new; one order over the project, §15 Rank); `create#Task` | OpenProject backlogs; Jira backlog (familiar shape) |
| `SprintLists` | component | Each sprint's items | as the backlog, plus status chip; totals against capacity | drag in and out | `set#TaskSprint` (new) | OpenProject sprints; Ever Gauzy sprint view |
| `SprintForm` | dialog | Make or edit a sprint | name, goal, start, end (two weeks after the last sprint by default, on weekdays), capacity in hours or points | | `mantle.work.ProjectServices.create#Sprint`, `update#Sprint`, `get#SprintDefaults` (new) | OpenProject sprint settings |
| `StartSprint` | dialog | Begin the sprint | dates, goal; refused while another sprint is active unless the project allows several, then it names them | | `mantle.work.ProjectServices.start#Sprint` (new) | Jira start sprint |
| `CompleteSprint` | dialog | End the sprint | done and not done counts; not done items go to the next sprint, a new sprint or the backlog | | `mantle.work.ProjectServices.complete#Sprint` (new: `carryTo` next, new or backlog, or `carryToSprintId`) | Jira complete sprint |

- **States:** a project without sprints shows the backlog only, with "Plan in sprints" turning the module on for
  managers; one sprint is active at a time per project unless the project allows several (ProjectSettings, for teams
  sharing a project), when the Sprints pane lists each active one first.
- **Source:** research §5 (OpenProject backlogs and sprints, burndown; Ever Gauzy sprint view).
- **Needs:** Sprints; Rank; `.qvue` TUI texts.

### SprintDetail

- **Layout:** detail. Title row: sprint name, project chip, `status-bar` (In Planning as planned, In Progress as
  active, Complete as closed), dates, goal. Number cards: Committed, Completed, Remaining, Days left. Boxes:
  Burndown, Items, Scope changes; Chatter as the right column from 1440 px (the retrospective).
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `SprintHeader` | single | The sprint | name, goal, start, end, capacity | | `update#Sprint` (new) | OpenProject sprint |
| `Burndown` | display | Remaining work by day against the ideal line | day, remaining hours or points, ideal | `m-chart` line with its table | `mantle.work.ProjectReportServices.get#SprintBurndown` (new) | OpenProject burndown; Odoo burndown chart |
| `SprintItems` | list | Its items | as WorkItems; a completed sprint marks the items carried over | board view by status | WorkItems' services | OpenProject sprint list |
| `ScopeChanges` | list | Items added or removed after the start | item, added or removed, size, when, by | | `get#SprintBurndown` `scopeChangeList`: the `WeatSprint` from and thru dates, and for "by" the audit rows `set#TaskSprint` writes | Jira sprint report |

- **Actions:** Start, Complete (as Backlog), Edit, Print (`html-print`, the sprint report).
- **Source:** research §5; Jira sprint report (familiar shape).
- **Needs:** Sprints; Reports services.

### Timeline

- **Layout:** calendar archetype as `.qvue` (style-guide §3.7, `view-timeline` until it exists). A toolbar (zoom
  weeks, months or quarters; Today; Auto-schedule; group by the tree (the default in a project with nested items),
  milestone or assignee; the work item find), a left grid (key, title, assignee, start, due; in the tree grouping
  indented with expand and collapse, as the Tree view) and the chart: bars from start to due, a parent as a summary
  bar spanning its own dates and its subtree's (bracket ends, the roll-up's progress inside, collapsing to that bar), a due-only item as a short
  bar, milestones as diamonds (a milestone with a start date as a phase bar), releases as flags, sprints as bands
  across the top, today as a line, weekends and holidays shaded, and dependencies as arrows drawn over the bars.
  A drag moves or resizes a bar; with Auto-schedule on, the items that depend on it move by business days (holidays
  and weekends skipped). A drag from a bar's end to another bar makes a dependency. A click opens WorkItemDetail.
  **Portfolio mode**, opened from the Projects list, draws projects as bars with their milestones and releases.
  The bars are positioned elements and the arrows an SVG overlay, drawn by the component as `Calendar.qvue` draws
  its grid; no Gantt library is vendored.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `TimelineFind` | find | What is drawn | as `WorkItemFind`; zoom and grouping | | | OpenProject Gantt queries; Redmine Gantt filters |
| `TimelineChart` | component | The bars and arrows | start, due, status color, progress, dependencies with lag; a parent's summary bar over its subtree's span | drag and resize (a summary bar moves its subtree with it); arrows; expand and collapse in the tree grouping | `update#Task`; `WorkEffortAssoc` (`entity`); `mantle.work.EventServices.get#FutureBusinessDay`; `mantle.work.ProjectServices.get#TimelineData` (new) | OpenProject table timeline; Redmine Gantt; Frappe Gantt (ERPNext) |
| `DependencyForm` | dialog | Edit a dependency | from, to, lag days | | `WorkEffortAssoc` (`entity`) | OpenProject precedes and follows with lag |

- **States:** an item with no dates is listed in the grid with "No dates" and drawn when given a due date; clients
  see the Timeline of their projects read-only.
- **Source:** research §6 (OpenProject timeline and Gantt module, Redmine Gantt, Dolibarr Gantt, Frappe Gantt), §7.
- **As built (P4c):** `WorkItems/Timeline.xml` and `Timeline.qvue`, also the Timeline of ProjectDetail's Plan tab; three modes in a
  toggle: Work items (the find: text, assignee, type, sprint, milestone; all statuses but cancelled; up to 500 items with their
  ancestors), Milestones (plan mode, the Roadmap's view: milestones, releases and, in a project, sprints as bars; one without a
  start a diamond or flag) and Projects (portfolio, from the Projects list: each project from its start to its due, else its
  items' span, with its open milestones and releases as markers). Group by the tree (the default), milestone, assignee or none;
  zoom weeks (weekends shaded), months or quarters; Today scrolls to it; the zoom, grouping and Auto-schedule are remembered in
  the browser. The left grid stays in place as the chart scrolls sideways; at 390 px it is key and title only. A drag moves a bar
  (`shiftDays`, so a due-only item and a parent with no dates of its own move too; a summary bar takes its subtree), its ends
  resize it; Alt+Left and Alt+Right move a focused bar by a day. Auto-schedule only moves dependents later, never earlier, and
  not done ones (each on its own, a failure named). A drag from a bar's round end to another bar makes that one wait for it;
  the toolbar's Dependency opens DependencyForm for phones and the keyboard; a click on an arrow opens it with the lag and Remove.
  A dependency that closes a loop, joins an item to its own ancestor or descendant, or has a negative lag is refused; one whose
  item starts before the next weekday after the other's due plus the lag is drawn in the warning color. Holidays are the
  `WepHoliday` days of the projects' organizations. The terminal has `TimelineTui` (impl-projects.md P11): the rows, Move
  dates (dates or a shift, sub-items and dependents when asked), Add and Remove dependency; dragging bars is the browser's.
  Services: `ironstone.projects.PlanningServices` `get#Timeline`, `move#TimelineItem`, `save#` and `remove#TimelineDependency`; Mantle
  `TaskServices` `add#`, `remove#TaskDependency` and `set#TaskDates`, `ProjectServices.get#TimelineData` (§15). WorkItemDetail's
  Links make dependencies through `add#TaskDependency` too.
- **Needs:** Timeline data; Dependency lag; `view-timeline` (later); `.qvue` TUI texts.

### WorkItemImport

- **Layout:** wizard, the shape of Commons' ContactImport: Source, Mapping, Options, Preview, Result. An import of
  more than 100 rows runs as a job with live progress, as contact imports do.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `ImportSource` | wizard step | The file | file (CSV), preset (Jira, Redmine, GitHub issues, generic), target project | `file` | `mantle.work.WorkItemImportServices.parse#WorkItemFile` (new) | Commons `ContactImport` source step |
| `ImportMapping` | wizard step | Columns to fields | each column to: original key, title, type, status, priority, assignee, reporter, created, due, estimate, description, parent key, labels, milestone or version, sprint, component; value maps for type, status and priority | a mapping table by `render-mode`; the preset fills it | `parse#WorkItemFile` | Commons `ContactImport` mapping step |
| `ImportOptions` | wizard step | How | create missing milestones, releases, components and labels; people matched by email or user name, else left unassigned; the original key kept as `sourceReferenceId`; rows already imported are updated or skipped | | | Jira and Redmine CSV importers |
| `ImportPreview` | wizard step, read | Check | the first 50 rows as they will be made; problems by row | | `mantle.work.WorkItemImportServices.preview#WorkItems` (new) | Commons `ContactImport` preview |
| `ImportResult` | display | What happened | made, updated, skipped, failed with the reason by row; a link to the items | job progress on a topic | `mantle.work.WorkItemImportServices.import#WorkItems` (new, as a job) | Commons `ContactImport` result |

- **Source:** research §16 (the audience moving from Jira and Redmine); Commons ContactImport as the pattern.
- **As built (P4c):** `WorkItems/Import.xml` and its steps in `Import/`, the draft in the user's own folder
  (`ironstone.projects.WorkItemImportServices`, as ContactImport's). Source takes the project (one the manager works in). Mapping is a
  field to a column rather than a column to a field (an export with a hundred columns would be a hundred fields): the targets
  are those above plus the original id (Jira's Issue id, which its Parent column names), start, resolved, story points and the
  epic (the parent when no parent is given); a column the file repeats (Jira's Labels, Sprint, Fix Version/s) is one column whose
  values are all taken (labels each, the sprint the last, the earlier sprints the ones it was carried over from); the estimate in
  hours or seconds (Jira's Original Estimate); value maps for up to 20 types, 20 statuses and 10 priorities, guessed from the
  words, the statuses those of the project's flow. Created is the reporter's `fromDate` (a work item has no created date). People
  are matched by user name, email or full name (one match only). Options: make missing milestones, releases, components, sprints
  and labels, and skip or update rows already imported. A sprint the file shows as past (an item carried over from it) is
  completed after its items are in it (its rows written directly, as `set#TaskSprint` refuses a complete sprint). Result: made,
  updated, skipped and failed by row with the reasons, the failed rows as a CSV download, the warnings, what was made, and links to
  the project's work items and Timeline; more than 100 rows run as a job with progress on the topic `workItemImportProgress`
  (Commons' ImportProgress component, which takes the topic). The Redmine and GitHub presets are header guesses from their
  exports and want checking against real files.
- **Needs:** Work item import services.

## 6. Requests

A request is what someone asks for before it is planned work: a bug report, a feature request, a question, a
proposal, a support problem that needs development. Projects triages the requests of its projects and the
project-type requests that have no project yet (by default `RqtBugFix`, `RqtNewFeature` and `RqtProposal`;
Settings/Intake chooses), turns them into work by an explicit conversion with links rather than a copy (a request
keeps its conversation and requester; its work items carry the plan), and follows the work back to the
requester. Requests arrive from the app and quick create, by email to a project's address, through a project's
public form, from a chat message (Comms), and from Customer Service when a case needs development (the same
`Request`, given a project or a linked work item). Customer Service keeps queues, SLAs and case channels; Commons
keeps the user's own slice.

### Requests

- **Layout:** list. Chips: New (Submitted and unassigned, default for managers), Assigned to me, To review
  (Submitted), Accepted (Reviewed), In progress, Mine (filed by me), Closed, All. New request opens a dialog.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `RequestFind` | find | Narrow | text, id, project, type, category, status, resolution, priority, customer, party and role, assignee, request date and due periods | `date-period`; type with Not | | `FindRequest` `ListRequests` header fields |
| `RequestList` | list | The requests | id, name (link), type, project, customer, priority, status chip, assignee, due, work (done of total linked items), updated | `saved-finds`, `select-columns`, CSV; `row-selection` | `Request` with `RequestParty` (`entity`) | `FindRequest` `ListRequests`; Commons `Requests` |
| `NewRequest` | dialog | Raise one | project, type, customer, name, description, priority, due, assignee (empty is unassigned, for triage), store, facility | type default from the project | `mantle.request.RequestServices.create#Request` | `FindRequest` `NewRequestForm`; Commons `NewRequest` |
| `RequestBulk` | list, bulk | Triage several | assign, set project, set priority, accept (Reviewed), start, cancel with a reason, make a work item from each, link to a work item | dialogs | `mantle.request.RequestServices.update#Request`, `replace#RequestParty`; `create#Task` with `requestId` | Redmine bulk edit; Frappe Helpdesk bulk actions |

- **Views:** list; board by status (the request flow's columns: Submitted, Reviewed, In Progress, Completed), a drag
  moving the request through its flow.
- **States:** clients see their organization's requests in their projects and the ones they filed, can raise one
  (project, type, name, description, files) and have no bulk actions. As built (impl-projects.md P10b): the chips All, Mine,
  In progress and Closed; New request takes the project, what is needed, the type (the project's offered types), priority,
  details and one file (more on the request's Files tab); no row selection and no board moves.
- **Devices:** phone.
- **Source:** research §11 (intake mechanisms, request to work); baseline `Request/FindRequest`; MarbleERP's request
  counts by status.
- **Needs:** Intake settings; `view-board` all rows; Client access.
- **As built (P5):** `Projects/Requests/List.xml` on `ironstone.projects.ProjectRequestServices.find#ProjectRequests`; the team's
  default list is Assigned to me (the managers' New), the project's tab opens on All; a Channel column (app, email, form) and
  find; NewRequest takes the project's triage assignee when none is given; the bulk changes run each request in a transaction of
  its own (failures counted and named).

### RequestDetail (`Shared/RequestDetail`)

The base design of the Request / case screen (research-crosscut §3.11). One file, `screen/Shared/RequestDetail.xml`,
mounted by Projects at `Projects/Requests/RequestDetail` and by Commons at `Commons/Requests/RequestDetail`, and later
by Customer Service as its case detail and by Purchasing, Maintenance, Sales and Warehouse; the including app's context
chooses the tabs and actions.

- **Layout:** detail. Title row: id, name (`h5`), type chip, the `status-bar` of the request flow (Draft, Submitted,
  Reviewed, In Progress, Completed; Cancelled), with the next step as the primary action: Submit (a draft), Accept
  (Submitted to Reviewed), Start (to In Progress), Complete (asks for a resolution and offers a message to the
  requester). A facts row: customer, project, priority, due (`responseRequiredDate`), assignee, filed by, request
  date, channel (app, email, form, chat). Secondary menu: Make work item, Link work item, Convert to project,
  Assign, Set project, Create purchase order (item-bearing types, for users who have Purchasing), Print, Cancel
  (asks for a reason, `RrRejected` or `RrDuplicate`).
- **Sections and tabs:**
  - Overview: the header form, the description, People (`RequestParty`), Linked records.
  - Conversation: Chatter. For a request with an outside customer it opens on Send message, so a reply goes by
    email to the requester and the answer threads back in; Log note stays internal.
  - Work: the linked work items with status and progress; make one, link one, unlink.
  - Items: `RequestItem` rows, shown for purchase, quote and inventory requests or when it has items.
  - Files: `record-files`.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `RequestHeader` | single | The request | name, type, category, priority, customer, project, store, facility, assignee, due, resolution, description | customer and assignee `server-search`; description `text-area editor-type="md"` | `update#Request` | `Request/EditRequest` `EditRequest`; `MyAccount/User/Request/EditRequest` `EditRequest` |
| `ResolveRequest` | dialog | Complete or cancel | resolution (`RrFixed`, `RrCompleted`, `RrWontFix`, `RrDuplicate`, `RrCantReproduce`, `RrInsufficient`, `RrRejected`), message to the requester | the message goes as Chatter's Send message | `update#Request`; `mantle.party.CommunicationServices.send#EmailDraft` or `create#Message` | `EditRequest` status links; Frappe Helpdesk resolve |
| `RequestPeople` | list, editable rows | Who is on it | party, role (`RgpRequest`), from, thru, notifications | Add party dialog | `RequestParty` (`entity`); `mantle.request.RequestServices.replace#RequestParty` | `EditRequest` `AddPartyForm`, `UpdatePartyForm`; `Request/EditUsers` `AddUserForm`, `UpdateUserForm`; `Party/PartyRequests` `AddUserForm`, `UpdateUserForm`; `MyAccount` `EditRequest` `UpdatePartyForm` |
| `RequestWork` | list | Its work items | key, title, project, type, status, due, estimate, actual; Unlink | progress of done items | `RequestWorkEffort` (`entity`) | `Request/EditTasks` `UpdateRweForm`; `EditRequest` `RequestTaskList` |
| `MakeWorkItem` | dialog | A work item from the request | project, milestone, parent, assignee, title (the request's name), type (`RqtBugFix` gives `WepFix`, `RqtNewFeature` `WepNewFeature`, else `WepTask`), priority, due (the request's due), estimate, description | | `create#Task` with `requestId` | `Request/EditTasks` `NewTaskForm` |
| `LinkWorkItem` | dialog | Link an existing item | project, work item | item `server-search` | `RequestWorkEffort` (`entity`) | `Request/EditTasks` `AddRweForm` |
| `ConvertToProject` | dialog | The request becomes a project | opens NewProject with the name, client and description; on create the request's project is set and it moves to In Progress | | `mantle.request.RequestServices.convert#RequestToProject` (new) | research §11 (Request to project, `Request.rootWorkEffortId`) |
| `RequestItems` | list, editable rows | Items asked for | required by, product, quantity, maximum amount, supplier, description; Delete | Add item first row; Create purchase order | `RequestItem` (`entity`); `mantle.order.OrderServices.create#PurchaseRequestOrder` | `Request/EditRequestItems` `NewRequestItemForm`, `RequestItemListForm` |
| `LinkedRecords` | list | Records it is about | record card, linked by, when | `m-record-card` | `mantle.request.RequestServices.link#RequestRecord`, `unlink#RequestRecord`; `WikiPageRequest` (`entity`) | Commons RequestDetail (M6) |
| `Chatter`, `RecordFiles` | component | Conversation and files | | `chatter`, `record-files` | Shared/Chatter (`mantle.request.RequestServices.add#RequestComment`, `update#RequestComment`, `delete#RequestComment`); Shared/RecordFiles (`mantle.request.RequestServices.create#RequestContent`, `update#RequestContent`) | `EditRequest` `AddCommentForm`, `NewNoteForm`, `UpdateNoteForm`, `NewContentForm`, `UpdateContentForm`; `RequestCommentReply` and `RequestCommentUpdate` `ReplyCommentForm` |

- **Actions:** as the title row; per work item: open, unlink. When the project's setting is on, a request moves to
  In Progress when its first work item starts and to Completed (resolution `RrFixed` for a bug, else
  `RrCompleted`) when its last one completes, and its followers are told
  (`mantle.request.RequestServices.complete#RequestFromWork`, new). As built (P5): run by an entity rule on a work item's status
  (any path that moves it, not only `update#Task`); a cancelled item counts as neither done nor open, and at least one must be
  done; making or linking a work item accepts a Submitted request (Reviewed); the followers and the Reporter's and Assignee's
  users are told on the new topic `RequestUpdate`. Resolve's message is a note on the conversation; the requester hears through
  Chatter's Send message (Conversation opens on it for an outside customer).
- **States:** a draft is edited only by its requester; clients see Overview read-only after submit, the
  Conversation as messages, and Work as the status of the shared items. As built (impl-projects.md P10b): a client writes in
  the Conversation (Send message to the team, Reply) and never a note (no Comment button), adds files on the Files tab
  while the request is open (no remove, versions or records drive), cancels a request it raised (the status-bar's only
  move for it), and sees the people without contact links.
- **Devices:** phone.
- **Source:** research §11 (OpenProject and Redmine intake, Odoo alias, ERPNext issue and project, Dolibarr
  project tickets); research-customer-service §3 (the case detail, for the parts Customer Service adds); baseline
  `Request/EditRequest`, `EditTasks`, `EditRequestItems`, `EditUsers`; Commons RequestDetail as built (M6).
- **Needs:** Shared work item and request detail; Request conversion and status from work; Client access;
  Chatter for client users.

**Per-app context (Request / case).**

| App | Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- | --- |
| Projects | Overview, Conversation, Work, Items, Files | requests of the projects the user sees, and the unassigned project-type requests | triage (accept, assign, set project, priority, due), make or link work items, convert to project, complete with a resolution, cancel | turning requests into planned work |
| Projects, client users | Overview (read-only after submit), Conversation as messages, Work as the status of shared items | their organization's requests in their projects, and the ones they filed | raise, comment, add files, cancel their own | where their request stands |
| Commons | Overview, Conversation, Tasks, Files | requests I raised, am assigned to or watch | comment, submit a draft, cancel my own, reassign when I am the assignee, attach (design-drawers-commons §8) | status and the conversation |
| Customer Service | Overview with customer/SLA, Conversation email-first, Work, linked order/return, Files; [case design](design-customer-service.md) | support cases and server-derived customer/queue scope | triage, reply, pause/reopen, explicit resolution; escalate by linking work | the customer and the clock |
| Purchasing | Overview, Items, source demand/PO progress, Conversation; [purchasing design](design-purchasing.md) | `RqtPurchase`; proposed purchase-RFQ type only in its sourcing context | revision-bound request approval and source conversion, subject to procurement policy | requirements and committed supply |
| Warehouse | Overview, Items, source movement/transfer progress, Conversation; [warehouse design](design-warehouse.md) | `RqtInventory` and authorized facilities | internal-stock request approval and fulfillment through stock workflows | requested and physically fulfilled quantities |
| Maintenance, Sales | Overview, Items, Conversation (their design files) | maintenance and customer `RqtQuote` | their flows | their records |

**Oct 27 core-design extension (proposed, not an implementation claim).**
[design-crosscut §3.11](design-crosscut.md#311-requestdetail) preserves this base definition and
registers the new app contexts. Linked-work completion becomes request-type-aware: Projects
keeps its existing rule, Customer Service requires an agent's resolution, and procurement/stock
requests follow their actual source documents. A linked development task finishing cannot
silently resolve a support case or mark materials supplied. The shared service extension must
cover automatic hooks as well as screen actions; generic request links/intake/visibility already
exist and are reused. The proposed service-only CaseServiceFacts, CaseSlaAction,
CaseReplyAction and CaseServiceLinks panels are specified once in that crosscut extension;
they do not change Projects' default tabs or grant service/financial authority.

Oct 28, 2026: a Service-category Request created or closed from Projects keeps the Customer
Service case rules, because Request create and status ECA rules give it its CaseProfile, queue
and SLA ([design-crosscut §3.11](design-crosscut.md#311-requestdetail), D23).

Oct 28, 2026: the RequestItems *Create purchase order* action opens Purchasing RequestSourcing,
shown only to a buyer, and refuses quantity that is already sourced; no context calls
`create#PurchaseRequestOrder` directly ([design-crosscut §3.11](design-crosscut.md#311-requestdetail), R-PUR-01).

Oct 28, 2026: on a service case this RequestDetail hides Complete and Cancel, so the case is resolved
only through Customer Service's case transitions. The external Customer Service row for
ServicePortal/CustomerCase (customer contacts: status label, conversation as outward messages,
approved files and customer-visible links; reply, add files, reopen, cancel own) is in
[design-crosscut §3.11](design-crosscut.md#311-requestdetail) (R-XC-13, D23).

### RequestIntake

- **Layout:** task archetype as `.qvue` in the public shell at `/r/<token>` (a `token-route` named `r` in BOSS's
  `MoquiConf.xml`, as `s` and `u` are), one per project when its public form is on. The project's name and a short
  text; the form; after submit, the confirmation with the request number and "reply to the email we sent to add
  more". No header, drawers or session.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `IntakeForm` | single | Ask for something | name, email, organization, type (the project's offered request types), subject, description, files (at most five, size per the settings), the CAPTCHA when one is configured | `file`; plain text description | `mantle.request.RequestServices.create#IntakeRequest` (new; through `create#ContactRequestReCaptcha` or `create#ContactRequest`, with the project, the files as `RequestContent` and a confirmation email from the project's intake account) | `RequestServices.create#ContactRequest`; ERPNext issue web form; Dolibarr public ticket page |

As built (P5): first and last name (Mantle's contact request needs both); the organization is kept as a `RequestNote`, not a
party; the channel is `salesChannelEnumId` `ScWeb` (email `ScEmail`, the app none). Every field is checked on the server; files
are pictures, PDF, text, office documents and archives (never html, svg or scripts), their names cleaned; a hidden honeypot
field; at most 30 requests an hour from a project's form and 5 from one address, and the web protection's `request-form` rate
limit on `/r/*/submit`. The route's answer and the submit's carry nothing internal (the project's name, the types, the file
limits; the request's number). The CAPTCHA is reCAPTCHA with the `reCAPTCHA.site.key` and `reCAPTCHA.secret.key` preferences.

- **States:** an unknown, rotated or turned-off token shows "This form is not available"; a submit refused by the
  CAPTCHA or the web protection keeps the values.
- **Devices:** phone.
- **Source:** research §11 and §16 (intake is fragmented; ERPNext's forms need a login); Mantle's contact request
  services; the public shell of design-drawers-commons (R16).
- **Needs:** Public request form.

## 7. Code

mr-moqui hosts each project's repositories: `local` repositories on disk for code, `db` repositories in the
database with the backup, and `remote` mirrors of a repository hosted elsewhere, cloned, fetched and pushed over
HTTPS and the built-in SSH server, with Git LFS for large files (mr-moqui `docs/interfaces/Git-Hosting.md`). Access is by
repository: the parties of a project a repository is linked to may view, push new and fast-forward refs
(`mantle.work.GitServices.check#GitRepositoryAuthz`); this design gives the project's leads (`ProjectManager`,
`Manager`, `ProgrammerLead`, `SysArchitect`) the delete right too (force pushes, deleting branches and tags) and
lets a project share its repositories read-only with its client contacts (§15). People clone with their Moqui user
name and an SSH key or an access token (Git access).

Mantle's gitECA rules tie the code to the work in any repository linked to a project, on pushes, mirror fetches,
imports and commits made through Moqui. This design keeps them and adds the last two rows:

| In a repository linked to a project | Effect |
| --- | --- |
| A work item key as a word of a commit message (`PROJ-12`), or a `Task: PROJ-12` trailer | the commit is linked to the item (`WorkEffortGitCommit`) |
| `Fixes PROJ-12` (also Closes, Resolves) | the item is completed and resolved when the commit reaches the default branch, where its flow allows |
| A branch named `PROJ-12` or `PROJ-12-login-fix` | the branch is linked to the item (`WorkEffortGitRef`) |
| A tag named `<id>` or `<id>/<anything>` (`PROJ/v1.2.0`, `PROJ-MS-3/rc1`) | the tag is linked to that project, milestone, release or item |
| A tag named as a release's version (`1.4.0` or `v1.4.0`) (new) | the tag is linked to the release |
| A merge request whose source branch or text names `PROJ-12` (new) | the merge request is linked to the item; `Closes PROJ-12` in its description completes the item when it merges |

What is new here: the browser (files, commits, branches, tags, push log), compare, merge requests with review
and line comments, merging in the browser, CI statuses posted by outside CI, webhooks that start it, branch
rules, and archiving a repository. The framework keeps all of it Mantle-free (§15 "Git hosting" and "Code
review"); Mantle links it to the work, and the screens are here.

**Merge methods.** A merge commit and fast-forward come first; squash, rebase and dismissing approvals when the
source moves follow as the second step of the merge work. Each repository has a default method (merge commit or
squash, RepositorySettings), and the person merging may choose another the branch rules allow.

**Clients** (impl-projects.md P10b). A client contact views a repository only when one of its client projects shares its
repositories (`WstShareRepositories`): `check#GitRepositoryAuthz` gives it the view right and nothing more, decided by the
repository's own records (impl-projects.md F23, F119), so the git server and the screens agree. It opens Repositories (those
repositories only, one chip, no action), RepositoryDetail with Files (with Raw and Download), Commits, Branches, Tags and Merge
requests, CommitDetail, and MergeRequests and MergeRequestDetail with its Commits and Changes, all read only: of the work
items only those shared with it; no reviewers, review notes or line comments (the team's review, Comments as a note), no
checks' descriptions or links, no Chatter on a merge request, no Link, Unlink, New branch, New tag, New merge request, merge,
review or comment. Compare (it opens a merge request), Git access, a repository's Activity (the push log names the team's
accounts) and Settings are refused it; Clone shows HTTPS with its user name and password. The palette's Code group finds
nothing for a client. Code is in a client's menu even when nothing is shared with it (a menu entry cannot be left out by a
condition), with an empty list.

**Not in Projects.** Searching code and editing repository files in the browser belong to the coming developer
tools, a separate app for development work; Projects' palette finds repositories and merge requests only, and
files are read here and changed in a clone.

### Repositories

- **Layout:** list of the repositories the user may view. Chips: Mine (of my projects, default), All, Mirrors,
  Archived; an archived repository is left out of the others and of the palette, and shows an Archived chip.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `RepositoryList` | list | The repositories | repository (link), description, projects, storage (Disk, Database, Mirror), default branch, last change, open merge requests, clone URLs | copy buttons | `org.moqui.impl.GitServices.find#GitRepositories` (new, with the view check); `get#GitCloneUrls` | `Project/EditRepositories` `RepositoryList` |
| `NewRepository` | dialog | A repository | project (optional for admins), id, description, storage, content (large files in LFS), import from a URL (database storage) | | `create#ProjectRepository`; `org.moqui.impl.GitServices.import#GitRepository` | `EditRepositories` `CreateRepositoryForm` |
| `LinkRepository` | dialog | Link one to a project | repository, project | | `add#ProjectRepository` | `EditRepositories` `AddRepositoryForm` |
| `MirrorRepository` | dialog | A read-only mirror of a repository hosted elsewhere (admins) | id, remote URL, user name and access token, fetch every n minutes, project | | `moqui.resource.GitRepository` (`entity`, kind `remote`); `org.moqui.impl.GitServices.init#GitRepository`; `add#ProjectRepository` | Git-Hosting `remote` kind; the tools Git Repositories screen |

- **Source:** mr-moqui Git-Hosting; baseline `Project/EditRepositories`.
- **Needs:** Repository list with access.

### RepositoryDetail

- **Layout:** detail. Title row: the repository id (`h5`), description, a storage chip, the default branch, the
  linked projects as chips; Clone (a menu with the HTTPS and SSH URLs to copy and "Set up an SSH key", which opens
  Git access); New merge request (primary, opening Compare). Tabs (`subscreens-panel type="tab"`): Files, Commits,
  Branches, Tags, Merge requests, Activity, Settings (maintainers).
- **Source:** GitLab and GitHub repository pages (familiar shapes); Redmine repository browser.
- **Needs:** Repository list with access.

### RepositoryFiles

- **Layout:** detail tab. A ref picker (branches, tags, or a commit id), the path as breadcrumbs, the entries of
  the directory with each one's last commit, and the directory's README rendered below. A file shows as text with
  line numbers and highlighting, an image, or a download for a binary or a file kept in LFS; its actions are
  History (Commits with the path), Raw (inline for an image or a PDF only; any other type downloads, so a pushed
  page or SVG never runs in the app's origin), Download and Copy permalink (the path at the commit).
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `RefPicker` | find | Which ref and path | ref, path | `drop-down` from `get#GitRefs` | `org.moqui.impl.GitServices.get#GitRefs` | Redmine repository revision picker |
| `TreeList` | list | A directory | name (link), type icon, last commit summary (link), date, size | | `org.moqui.impl.GitServices.get#GitTree` (new) | Redmine repository browser |
| `FileView` | display | A file | path, size, last commit; text, image or download | `code-view` (new); the image through a transition that streams the blob | `org.moqui.impl.GitServices.get#GitBlob` | Redmine repository entry |
| `Readme` | display | The directory's README | rendered markdown | `markdown-view` | `get#GitBlob` | GitHub README (familiar shape) |

- **Needs:** Git tree; `code-view`.

### RepositoryCommits

- **Layout:** list tab; the ref and path from the picker; Older and Newer by page.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `CommitList` | list | The log | author avatar (the user when the commit has a Moqui user), summary (link to CommitDetail), short id (copy), author, date, linked work items, CI state | paged by the last commit id | `get#GitLog`; `WorkEffortGitCommit` (`entity`); `org.moqui.impl.GitServices.get#GitCommitStatuses` (new) | `Task/EditSource` `TaskCommitList`; Redmine revisions |

### RepositoryBranches

- **Layout:** list tab; the default branch first.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `BranchList` | list | Branches | name, last commit summary, author, date, ahead and behind the default, work item, merge request, CI; New merge request, Compare, Delete | ahead and behind for the 20 most recently changed branches; Delete confirms and needs the delete right; the default branch has no Delete | `get#GitRefs`; `get#GitCompare` (new); `WorkEffortGitRef` (`entity`); `org.moqui.impl.GitServices.delete#GitRef` (new) | GitLab branches (familiar shape) |
| `NewBranch` | dialog | A branch | name, from (a ref) | | `org.moqui.impl.GitServices.create#GitRef` (new) | GitLab new branch |

- **Needs:** Git refs; Compare.

### RepositoryTags

- **Layout:** list tab, newest first.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `TagList` | list | Tags | name, commit (link), date, tagger and message (annotated), linked release, milestone or project; Link, Delete | Delete confirms and needs the delete right | `get#GitRefs`; `WorkEffortGitRef` (`entity`); `delete#GitRef` (new); `add#WorkEffortRef`, `remove#WorkEffortRef` | `EditRepositories` `ProjectRefList`; `ProjectSummary` `ViewGitTagList` |
| `NewTag` | dialog | A tag | name, at (a ref), message (an annotated tag) | | `create#GitRef` (new) | GitLab new tag |

### RepositoryMergeRequests (Context passed)

MergeRequests (below) with the repository fixed: RepositoryDetail mounts `Code/MergeRequests.xml` as its Merge requests tab
(a `subscreens-item`), which sees the repository the detail's `always-actions` read; the repository column is left out and the
find stays in it.

### RepositoryActivity

- **Layout:** list tab, the push log newest first.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `PushLog` | list | Every push, fetch, import and write | when, user, source (push, fetch, import, write), transport, refs changed (ref, change, old and new commit), new commits, rules state (done, failed with its error); Run again (maintainers) | | `org.moqui.impl.GitServices.find#GitUpdates` (new); `org.moqui.impl.GitServices.process#GitUpdate` | the tools screen's push log (Git-Hosting "gitECA rules") |

### RepositorySettings

- **Layout:** settings page of boxes; its maintainers (the delete right: the leads of its projects) and administrators
  change it; others see who does, as the tab cannot be left out by a condition (impl-projects.md F24).
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `RepositoryGeneral` | single | The repository | description, default branch, default merge method (merge commit, squash) | | `org.moqui.impl.GitServices.update#GitRepository` (new, with the delete right) | the tools Git Repositories screen; GitLab merge method setting |
| `RepositoryProjects` | list | Projects it is linked to | project, since; Add, Remove | | `add#ProjectRepository`, `remove#ProjectRepository`; `mantle.work.GitServices.get#RepositoryProjects` | `EditRepositories` |
| `BranchRules` | list, editable rows | Protected branches | ref pattern, force push, delete, merge request required, approvals required, dismiss approvals when the source moves, checks required, merge methods allowed, who may push directly | | `org.moqui.impl.GitServices.store#GitBranchRule`, `delete#GitBranchRule` (new) | GitLab protected branches (familiar shape) |
| `Webhooks` | list, editable rows | Calls to outside CI and tools | URL, events (push, tag, merge request), secret, active, last delivery and its status; Test | recent deliveries in a dialog | `org.moqui.impl.GitServices.store#GitWebhook`, `test#GitWebhook`, `find#GitWebhookDeliveries` (new) | Gitea and GitLab webhooks (familiar shapes) |
| `LargeFiles` | single | Git LFS patterns | patterns (images, video, audio, PDFs and archives by default) | | `org.moqui.impl.GitServices.setup#GitLfs` | Git-Hosting "Large files" |
| `Storage` | display | A database repository's storage (admins) | objects, stored bytes, last collection and its result; Collect (a dry run first), Check | | `org.moqui.impl.GitServices.gc#GitRepositories`, `fsck#GitRepository` | the tools screen's collection and check |
| `Mirror` | single | A mirror's source (admins) | remote URL, user name, access token, fetch interval, last fetch and its error; Fetch now | | `GitRepository` (`entity`); `org.moqui.impl.GitServices.fetch#GitRepository` | Git-Hosting `remote` kind |
| `ExportImport` | single | Move a database repository (admins) | export as a bare repository on the host (path); import a branch from a URL, which replaces the branch | import confirms naming the branch | `org.moqui.impl.GitServices.export#GitRepository`, `import#GitRepository` | Revision-Management "Services" |
| `ArchiveRepository` | single | Retire it | Archive (read-only: pushes, merges and writes refused, its open merge requests closed; hidden from the lists but Archived); Unarchive | Archive confirms naming the repository | `org.moqui.impl.GitServices.archive#GitRepository`, `unarchive#GitRepository` (new) | GitHub and GitLab archive (familiar shapes) |

- **States:** an archived repository shows a `q-banner` ("Archived: read only") on every tab, and its Settings
  only the Archive box and, for admins, Export. Deleting a repository is not here: an administrator deletes one
  in the tools Git Repositories screen, after an export.
- **Needs:** Branch rules; Webhooks; Repository settings service; Repository archive.

### Compare

- **Layout:** detail. The repository, the base (the target, the default branch unless chosen) and the compare
  (the source) ref pickers with a swap; a summary line (commits, files, insertions and deletions, and "Able to
  merge" or "Conflicts in n files"); the New merge request form; below it the commits and each file's diff, every
  diff shown up to 25 files and opened one at a time past that, as `GitCommit` does.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `CompareRefs` | find | What to compare | base, compare | | | GitHub compare (familiar shape) |
| `NewMergeRequest` | single | Open a merge request | title (the linked work item's title, else the first commit's summary), description (lists the linked items and adds `Closes <key>` lines), reviewers (default the project's leads), draft, complete linked items on merge (from the project), delete the branch after merge | reviewers `allow-multiple` `server-search` over the users who may view the repository | `org.moqui.impl.GitReviewServices.create#MergeRequest` (new); `mantle.work.GitServices.link#MergeRequestItems` (new) | GitLab new merge request; GitHub pull request form |
| `CompareCommits` | list | Commits in the source and not in the base | summary, author, date, linked items | | `get#GitCompare` (new) | GitHub compare |
| `CompareDiffs` | display | Each file's diff | path, change, insertions, deletions, the diff | the `moqui-diff` table by `render-mode` | `get#GitCompare` (new) | `Project/GitCommit` diff boxes |

- **States:** with a merge request of the same branches open, a note links it in place of the form; the form is for a
  branch ahead of the base, for those who may push, in a repository not archived.
- **Source:** GitHub compare and GitLab new merge request (familiar shapes, outside the research set).
- **Needs:** Compare; Code review store.

### CommitDetail

- **Layout:** detail. Title row: the summary (`h5`), the short id (copy), Browse files at this commit. Header box:
  body, author and committer (avatars when they are users), dates, parents (links), linked work items as cards
  with Link to work item and Unlink, CI statuses by context. Then "n files changed, insertions, deletions" and
  the diffs (all up to 25 files, past that a file list opening each).
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `CommitHeader` | display | The commit | summary, body, author, committer, dates, parents, id | | `org.moqui.impl.GitServices.get#GitCommit` | `Project/GitCommit` header box |
| `CommitWorkItems` | list | Linked items | key, title, status, linked by; Unlink | Link to work item dialog | `WorkEffortGitCommit` (`entity`); `add#TaskCommit`, `remove#TaskCommit` | `GitCommit` linked work efforts; `EditSource` `AddCommitForm` |
| `CommitStatuses` | list | CI | context, state chip, description, link to the run | | `get#GitCommitStatuses` (new) | GitHub commit status (familiar shape) |
| `CommitDiffs` | display | The changes | path, change, insertions, deletions, diff | `moqui-diff` table | `org.moqui.impl.GitServices.get#GitCommitDiff` | `Project/GitCommit` diffs |

- **Source:** baseline `Project/GitCommit`; Redmine changeset.
- **Needs:** Commit statuses.

### MergeRequests

- **Layout:** list. Chips: Waiting for my review (default when there are any, else Open), Mine (my open and draft ones),
  Open (open and draft), Draft, Merged, Closed, All, each with its count; the find narrows every chip. New merge request
  opens Compare (of the one repository the user may view, else a dialog to choose it).
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `MergeRequestFind` | find | Narrow | text in the title, repository, project (its repositories), author, reviewer (the people who write or review merge requests the user may view), target branch; the status is the chips' | `header-dialog` | | GitLab merge request filters |
| `MergeRequestList` | list | The merge requests | `!num` and title (link) with source to target, status, repository, author, reviewers with their state, CI state, comments (with replies), linked items, updated | `saved-finds` | `ironstone.projects.CodeServices.find#MergeRequests` over `org.moqui.impl.GitReviewServices.find#MergeRequests` (new) | GitLab merge requests list (familiar shape) |

- **Needs:** Code review store.

### MergeRequestDetail

- **Layout:** detail. Title row: `!num` and the title (`h5`), the `status-bar` of the merge request flow (Draft,
  Open, Merged; Closed), source and target chips, author, opened. Tabs: Overview, Commits, Changes. Overview holds
  the description, the linked work items, the reviewers, and the **merge box**: the checks (the head commit's CI
  statuses by context), the approvals (given of required, each reviewer's state), mergeability (able to merge, or
  the conflicting files, or "the target moved; checking"), the merge method (the repository's default; a merge
  commit, fast-forward when possible, squash or rebase, as the branch rules allow; squash shows the commit message to
  edit) and Delete source branch; Merge is the primary action when the branch rules are met and otherwise the
  box says what is missing. A draft's primary action is Mark ready; a requested reviewer's is Review, which opens
  Changes with the review dialog. Chatter is the right column of Overview from 1440 px and below the boxes narrower
  (no Chatter tab, as ProjectDetail); line comments appear in it with their file and line (their subject). Secondary
  menu: Edit, Add reviewers, Review (the same dialog, for the terminal too), Mark as draft, Close or Reopen, Checkout
  commands (shown to copy by hand: there is no clipboard helper yet).
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `MergeRequestHeader` | single | The merge request | title, description, target branch, draft | description `text-area editor-type="md"` | `org.moqui.impl.GitReviewServices.update#MergeRequest` (new) | GitLab merge request edit |
| `MergeRequestItems` | list | Linked work items | key, title, status, assignee; Link, Unlink | | `WorkEffortGitMergeRequest` (new, `entity`) | GitLab "closes issues" |
| `Reviewers` | list | Who reviews | reviewer, state (requested, approved, changes requested, commented), at commit, when; Add, Remove | | `org.moqui.impl.GitReviewServices.set#MergeRequestReviewers` (new) | GitLab reviewers and approvals |
| `MergeBox` | single | Merge | checks, approvals (with those dismissed by a later push), mergeability, method, squash commit message, delete source branch | method as a `q-btn-dropdown` on Merge; Merge confirms naming the target | `org.moqui.impl.GitReviewServices.merge#MergeRequest` (new) | GitLab merge widget; GitHub merge box |
| `SubmitReview` | dialog | A review | approve, request changes or comment; summary | | `org.moqui.impl.GitReviewServices.submit#MergeRequestReview` (new) | GitHub review submit |
| `MergeRequestCommits` | list | Its commits | summary, author, date, CI | | `get#GitCompare` (new) | GitLab merge request commits |

- **Actions:** Merge or Mark ready or Review (primary by state); Edit; Add reviewers; Close and Reopen
  (`org.moqui.impl.GitReviewServices.close#MergeRequest`, `reopen#MergeRequest`, new); on merge the linked items
  move as the project says (Complete, or left to `Fixes` keywords) and the source branch goes when asked.
- **States:** merged and closed merge requests are read-only; a user without push rights on the target sees no
  merge box actions.
- **Source:** GitLab merge request and GitHub pull request pages (familiar shapes); research §4 (OpenProject
  relations) and §16 for the work item links.
- **Needs:** Code review store; Merge; Commit statuses; Branch rules; `chatter`.

### MergeRequestChanges

- **Layout:** split as `.qvue`: the changed files as a tree on the side (each with insertions, deletions, comment
  count and a viewed mark kept in the browser), and the diffs in the main pane, unified, with a side-by-side
  toggle. A line shows "+" on hover to start a comment; a thread shows under its line with replies, Resolve, and
  "outdated" when a later push changed the line; a thread whose line is no longer in the diff shows at the top of its
  file. Submit review opens the review dialog. Comments are markdown (`m-text-area` with `editor-type="md"`, shown by
  `m-markdown`), as `create#ReviewComment` stores them (`text/markdown`); with `m-avatar` and `m-dialog`. The diff's
  lines are text, never html, so nothing pushed runs in the app's origin (impl-projects.md F32). Keys: j and k the next
  and previous file, v viewed. The terminal (`ChangesTui`, impl-projects.md P11) lists the files, one file's diff (numbered old and new
  lines as text), the threads, and Comment on a line, Reply and Resolve or Reopen; the review is MergeRequestDetail's dialog.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `FileTree` | component | Changed files | path, change, insertions, deletions, open threads, viewed (kept in the browser per head commit) | `q-tree` | `org.moqui.impl.GitReviewServices.get#MergeRequestDiff` (new) through `ironstone.projects.CodeServices.get#MergeRequestChanges` | GitLab file browser in changes |
| `DiffView` | component | The diffs with threads | old and new line numbers, the line, threads; unified or side by side (kept in the browser) | per-line comment start | `get#MergeRequestDiff` (new) hunks of numbered lines; `mantle.work.GitServices.get#ReviewThreads` | GitLab changes tab; GitHub files changed |
| `LineComment` | single | A comment on a line or a reply | body (markdown) | `m-text-area` `editor-type="md"` | `mantle.work.GitServices.create#ReviewComment` (new: a `Comment` filed on the merge request with its anchor, or a reply) through `ironstone.projects.CodeServices.comment#MergeRequest` | Chatter `LogNote` |
| `ResolveThread` | single | Resolve or reopen a thread | resolved | | `mantle.work.GitServices.resolve#ReviewThread` (new: the thread's first comment to `CeResolved` and back) | GitLab resolve thread |

- **Devices:** desktop and tablet only.
- **Source:** GitLab merge request changes and GitHub files changed (familiar shapes).
- **Needs:** Code review store; Review anchors; `.qvue` TUI texts.

### GitAccess

- **Layout:** settings page with three boxes: SSH keys, Access tokens, How to clone. Commons/Settings/Account
  links here ("Git access") for a user who has Projects; for one who does not, Account hosts the Access tokens box
  itself, since tokens also serve the REST API. How to clone says that git over HTTPS also takes an app password
  of Commons/Settings/Sync (mr-moqui `docs/interfaces/Git-Hosting.md`).
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `SshKeys` | list | My SSH keys | description, SHA-256 fingerprint, added; Remove | Remove confirms | `UserSshKey` (`entity`); `org.moqui.impl.UserServices.delete#UserSshKey` | `MyAccount/User/GitAccess` `SshKeyList` |
| `AddSshKey` | dialog | Add one | public key, description | | `org.moqui.impl.UserServices.create#UserSshKey` | `GitAccess` `AddSshKeyForm` |
| `AccessTokens` | list | My tokens | description, created, expires; Revoke | Revoke confirms | `UserLoginKey` (`entity`); `org.moqui.impl.UserServices.revoke#UserAccessToken` | `GitAccess` `AccessTokenList` |
| `NewAccessToken` | dialog | Make one | for (description), expires in days (90) | the token shown once with Copy | `org.moqui.impl.UserServices.create#UserAccessToken` | `GitAccess` `CreateAccessTokenForm` |
| `CloneHelp` | display | How to clone and commit | the SSH host and port, `git config user.email` set to the account's address so commits show as mine, whether I have SSH access | | `get#GitCloneUrls`; `ec.user.hasPermission('SSH_GIT')` | Git-Hosting "Clone URLs" and "Logging in" |

- **States:** without `SSH_GIT` the SSH box says to ask an administrator and that HTTPS with a token works now. Commons'
  Account has a Git and API access box: the link here for a user who may open Projects, else the access tokens list
  with New access token and Revoke. Keys and tokens need no git hosting; the clone addresses do.
- **Source:** baseline `MyAccount/User/GitAccess`; Git-Hosting.
- **Needs:** User groups and SSH access.

## 8. Time

A time entry is a `TimeEntry` against a work item: who, when (from and thru, or a day and hours), how long, the
work type (Settings/Time; the `WorkType` enumeration gains services work types such as Development, Design,
Testing, Meeting, Support and Project management), whether it is billable (rate type `RatpStandard`, or
`RatpNoCharge` for time the client does not pay; the other rate types are People's), a comment, and the client
and vendor rates `store#TimeEntry` finds from `RateAmount`. The timer is an entry with a start and no end
(`create#TimeEntryClockIn`); one runs per person, and starting another stops the first. Each person has one
**timesheet** a week (`Timesheet`, made on the first entry of the week, with no status, read as In-Process, so its
making writes no status audit row): only the person submits it (In-Process to Completed), an approver approves it
(to Approved) or returns it with a reason (back to In-Process, a new transition; the reason is the timesheet's
`comments` and a Chatter note on it), and an approver can reopen an approved one until any of its entries is
invoiced. Nobody approves their own week. Entries on a submitted or approved timesheet are locked (their time,
item, person, work type and comment; their rates may still change). The approvers are the timesheet policy's:
the managers of the projects the week's time is on (the default), the person's line managers (`PrtManager`), or
any holder of `TIMESHEET_APPROVE` (the Projects managers); ADMIN may decide any. A week's days are those of the
viewer's time zone (impl-projects.md F65). The approval is one approval for Projects and People: People shows the same timesheets with
its pay context (research-projects open question, §16).

### MyTime

- **Layout:** list as `.qvue`, the week of one person (me; a manager may open someone else's). A header: the week
  with previous, next and this week; the timesheet's status chip with the return reason when returned; the week's
  total against my working hours; Submit (primary when the week is not submitted). The timer bar: the running
  entry's work item, elapsed time and comment with Stop, or Start on a chosen item. The grid: a row per work item
  with time this week or pinned by me, a column per day with the hours (my working days shaded by the hours I
  should work, holidays and leave marked), row and day totals, a day below its hours in warning once past. A cell
  with one entry edits it in place; an empty cell makes an entry for that day; a cell with several opens the day's
  entries. Add row (a search over my assigned and recent items), Copy last week's rows; a cell's menu button opens its
  entry in full (comment, billable, work type, from and to) rather than a popover. An approver viewing a submitted
  week has Approve and Return there too. On a phone, Day mode: the day's entries as a list with start and stop, the timer as
  a large button, and Add.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `WeekGrid` | component | The week | work item, project, hours by day, totals | `m-text-line` cells with keyboard moves between them | `store#TimeEntry`, `delete#TimeEntry`; `mantle.work.TimesheetServices.get#PartyWeek` (new) | Ever Gauzy weekly timesheet; Dolibarr per-week input; OpenProject My work |
| `TimerBar` | component | The running timer | work item, started, elapsed, comment | elapsed ticks in the component | `create#TimeEntryClockIn`; `store#TimeEntry` | OpenProject timer; ERPNext timer |
| `EntryForm` | dialog | One entry in full | work item, date, from and to or hours, break, billable, work type, comment | | `store#TimeEntry` | `PartyTimeEntries/EditTimeEntry` `AddTimeForm` |
| `SubmitWeek` | single | Submit the timesheet | the week's total, days below their hours (asks to confirm) | | `mantle.work.TimesheetServices.submit#Timesheet` (new) | ERPNext timesheet submit; Ever Gauzy approvals |
| `InvoiceMyTime` | dialog | A contractor bills their own time (shown to workers paid by invoice) | project, through date, add to my open invoice to the vendor or a new one | open invoice `drop-down` of my incoming invoices | `create#ProjectInvoiceItems` with `ratePurposeEnumId` `RaprVendor` and `workerPartyId` me | `MyAccount/Expense/FindExpenseInvoice` `WorkerInvoice`; `EditExpenseInvoice` `WorkerInvoice` |

- **States:** an approved week is read-only with "Approved by … on …"; a returned week shows the reason in a
  `q-banner`; a week of someone else is read-only unless the viewer is their approver.
- **Devices:** phone (Day mode). The terminal (`MyTimeTui`, impl-projects.md P11): the week by day with its entries, the
  timer (Start on an item, Stop), Log time (an entry in full), an entry's Edit (TimeEntries' dialog) and Delete, and Submit,
  Approve, Return and Reopen; typing in the grid's cells, Add row and Copy last week's rows are the browser's.
- **Source:** research §8 (OpenProject time entries and timer, Ever Gauzy weekly and daily grids, Dolibarr per-week
  input, ERPNext timer, Redmine required fields); the first port's `Projects/Timesheets` and My Account's time
  list.
- **Needs:** Timesheet services; Capacity; `.qvue` TUI texts.

### Timesheets

- **Layout:** list. Chips: To approve (default for approvers: submitted timesheets of the people I approve),
  Mine, Returned, Missing (people whose last week has no submitted timesheet), Approved, All.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `TimesheetFind` | find | Narrow | person, team, week period, status | `date-period` | | Ever Gauzy approvals filters |
| `TimesheetList` | list | The timesheets | person (avatar), week, status chip, hours, billable hours, working hours, difference, submitted, approver | `row-selection` | `Timesheet` (`entity`); `mantle.work.TimesheetServices.get#TimesheetSummary` (new) | Ever Gauzy timesheet approvals; ERPNext timesheet list |
| `TimesheetBulk` | list, bulk | Decide several | approve, return with a reason | return asks for the reason | `mantle.work.TimesheetServices.approve#Timesheet`, `return#Timesheet` (new) | Ever Gauzy bulk approve |
| `RemindMissing` | list, bulk | Nudge | remind the selected people | | `mantle.work.TimesheetServices.send#MissingTimeReminders` (new) | Odoo timesheet reminders |

- **Source:** research §8 (approval on the period in every reference), research-people §7; style-guide §3.2.
- **Needs:** Timesheet services; Notification topics.

**Context passed (Approvals waiting).** Projects' row of design-drawers-commons §4's table, as this file decides
it: timesheets, allocation requests and milestone gates are decided in Projects' own lists (Timesheets' To approve,
Allocations' Requested, MilestoneDetail's gate) and in the tray panel's Approvals group, through the same services
named on their topics (`TimesheetApproval`, `AllocationRequest`, `MilestoneApproval`), so a decision in either place
is the same decision.

| App | Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- | --- |
| Projects | Timesheets (To approve), Allocations (Requested), MilestoneDetail (gate) | the three topics, addressed to me | approve, return or refuse with a reason, bulk approve timesheets | the week's hours and the plan |

### TimesheetDetail

- **Layout:** detail. Title row: the person, the week, the `status-bar` (In-Process, Completed as submitted,
  Approved). Number cards: Hours, Billable, Working hours, Difference. Boxes: Entries by day, By project, Flags;
  Chatter as the right column from 1440 px, where a return's reason and the answers live.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `EntriesByDay` | list | The week's entries | day, from, to, work item, project, hours, work type, billable, comment | grouped by day with day totals | `TimeEntry` (`entity`) | Ever Gauzy daily timesheet; ERPNext time logs |
| `ByProject` | list | Totals | project, work item, hours, billable | | `get#TimesheetSummary` (new) | Redmine spent time by criteria |
| `Flags` | list | What an approver should look at | entries without a comment where one is required, days over 12 hours, entries on non-working days, entries on closed items | | `get#TimesheetSummary` (new) | Ever Teams weekly limit |
| `Decision` | single | Approve, return, reopen | reason (return, reopen) | | `approve#Timesheet`, `return#Timesheet`, `mantle.work.TimesheetServices.reopen#Timesheet` (new) | Ever Gauzy approve and reject |

- **Actions:** Approve (primary for its approver), Return, Reopen, Submit (its owner), Print (`html-print`).
- **Source:** research §8; research-people §7 (pay-relevant hours).
- **Needs:** Timesheet services; Generic record links (Chatter on a `Timesheet`).

### TimeEntries

- **Layout:** list of every entry the user may see (team: their own; managers: their projects' and their
  reports'). Chips: This week, Last week, This month, Unbilled, Not on a work item. Actions above the list: Log time,
  Log team time, Import.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `TimeEntryFind` | find | Narrow | person, project, work item, client, work type, billable, client invoiced, worker invoiced, timesheet status, date period | `date-period` | | `ProjectTimeEntries` `TimeEntryListForm` header; `PartyTimeEntries` `TimeEntryList` header |
| `TimeEntryList` | list | The entries | date, from, to, person, project, work item, hours, break, work type, billable, client rate and amount, vendor rate and amount, client invoice, worker invoice, timesheet status, comment | `saved-finds`, `select-columns`, CSV and XLSX; `row-selection`; rates and amounts for managers; a row is editable only with no invoice and an open timesheet | `TimeEntry` with `WorkEffort` (`entity`); `mantle.work.TimeServices.get#TimeEntryAmount` | `ProjectTimeEntries` `TimeEntryListForm`; `PartyTimeEntries` `TimeEntryList`; `MyAccount/User/TimeEntries` `TimeEntryList` |
| `EditTimeEntry` | dialog | One entry | as `EntryForm`, plus person (managers), position class, piece count, and the rates (client and vendor hour rates and their rate amounts, modified flag) for users with `TIME_ENTRY_RATE` | rates in a `field-accordion` | `store#TimeEntry`; `mantle.work.TimeServices.get#TimeEntryRate`; `create#TimeEntryClockIn` (clock in for someone) | `PartyTimeEntries/EditTimeEntry` `AddTimeForm`; `PartyTimeEntries` `ClockInForm` (clock in for someone) |
| `TimeEntryBulk` | list, bulk | Fix several | move to a work item, set work type, billable or not, update rates, delete (uninvoiced, open timesheets) | | `store#TimeEntry`; `mantle.work.TimeServices.resetAndGet#TimeEntryRates`; `delete#TimeEntry` | `PartyTimeEntries` Auto Update Rates; Redmine bulk edit of time entries |
| `TeamTime` | dialog | A crew's time on one piece of work | work item, date, from, to, team, and hours or a break per member | members from the team | `mantle.work.TimeServices.store#TimeEntryWorkEffort`, `store#WorkEffortPartyTime`; `get#TeamTimesheetInfo` | `template/work/TeamTimesheet.xsl-fo.ftl` data; the team services |
| `ImportTime` | dialog | Time from a file | format (Time entries CSV, the default; Mantle time detail), file, client and default date (time detail); a preview of the first rows with problems by row | `file`; the Time entries CSV's columns linked as a template to download | `mantle.work.TimeServices.import#TimeEntryCsv` (new); `mantle.work.TimeServices.upload#TimeDetailFile`, `import#TimeDetailFile` | Mantle time detail import; Toggl, Harvest and Clockify detailed CSV exports |

- **Import format.** The first release reads one common CSV, **Time entries**, with a header row: date, person (email
  or user name), work item key or project key, hours or start and end times, work type, billable (yes or no) and
  comment; the shape the detailed exports of Toggl, Harvest and Clockify reduce to with a column rename. Rows go in
  each on its own, the failures named by row; an entry that would land on a submitted timesheet is refused. Presets
  for those three tools' own columns come after the first release, as the work item import has. As built (P6b): the headers
  are matched by their words (date, day, start date; email, person, user name, user; work item, key, task, issue, then project;
  hours, duration; start, end; work type, activity, type; billable; comment, description, notes), the delimiter the header
  line's commonest of comma, semicolon and tab; a person by user name or email, else a full name with one match; hours as a
  decimal or h:mm[:ss], rounded to the policy's smallest entry with a warning; rows with hours only stack from 9:00 on the
  person's day; a row whose person already has an entry on the item starting at that moment is skipped, so a file imported
  again adds nothing; a row fails for a date not yyyy-MM-dd, a person or item not found or not visible, a week the user may
  not change or one submitted, a future day the policy refuses, or a work item the policy requires. More than 200 rows run as
  a job with progress on the topic `timeImportProgress`.
- **States:** an invoiced entry shows its invoice and no edit; an entry on a submitted timesheet says so.
- **As built (impl-projects.md P6b):** `Time/TimeEntries.xml` over `mantle.work.TimeServices.find#TimeEntries` (through
  `ironstone.projects.TimeServices.find#TimeEntryRows`). Who sees a person's time: the person, the managers of the projects it is on (its
  entries on the project and its items), the person's line managers (`PrtManager`), ADMIN, and under an `any` policy the holders
  of `TIMESHEET_APPROVE`; one who sees an entry changes it only as its week allows (the person or an approver while it is open).
  Who manages money: the holders of `TIME_ENTRY_RATE`, granted to `BOSS_PROJECT_MANAGER` (and ADMIN): only for them do the rates
  and amounts reach the rows. The chips have no counts (each is a period find); the week's status per row is Open, Returned,
  Submitted, Approved, Invoiced or Running. EditTimeEntry is `TimeEntries/EditEntry.xml` (a dynamic dialog; its work item is
  chosen from the user's assigned and recent items, a move to another is the bulk Move, which searches); its rates are a box of
  their own, set by hand (`hasModifiedRates`) or found again, also on a submitted week's entry. The bulk changes take each entry
  on its own: nothing changes an invoiced or running entry; a submitted or approved week's entries change only in their money
  (billable and rates), and only by those who manage money; the rest needs an entry the user may change. ImportTime is a wizard,
  `Time/Import.xml` (Source, Preview, Import), not a dialog, the shape of WorkItemImport; the Mantle time detail format is not
  offered there (Mantle's own screens keep it). Log team time (`TeamTime`) is not built yet (impl-projects.md §7).
  Clients (impl-projects.md P10b): TimeEntries and the whole Time section stay refused, and ProjectDetail's Time tab with them; a client
  of a project that shares its hours (`WstShareHours`) gets its own tab, Hours (`ProjectDetail/ClientHours.xml`, mounted by a
  `SubscreensItem` row for the client group only, over `ironstone.projects.TimeServices.get#ClientHours`): the hours by week and work item, with the
  totals by item, of the entries the team stands behind (ended, billable, on an approved week or a client invoice) on the items shared with
  the client; never who, a rate, an amount, a comment or the timesheet. A project that does not share its hours says so and reads nothing.
  The `TimeEntry` filter stays `_NA_`: no generic find reads time for a client; WorkItemDetail's All time answers a client nothing.
- **Source:** research §8 (Redmine time entries list and bulk edit, Odoo timesheet list); baseline
  `Project/ProjectTimeEntries`, `Party/PartyTimeEntries`, `MyAccount/User/TimeEntries`.
- **Needs:** Timesheet services (the lock); Time import.

## 9. Resources

A person's **capacity** is their working hours (the weekly `WetAvailable` work effort Commons Preferences writes,
or the organization's default week when they have none) less leave (`WetTimeOff` events, and People's approved
leave once it exists) and holidays (`WepHoliday` events of their organization), by week. An **allocation** is a
plan, not a task: N hours a week of a person, or of an unnamed role to be staffed, on a project (or a work item)
from one date to another, requested and then allocated (new `WorkEffortAllocation`, §15), as OpenProject's
resource management separates it from assignments and time. **Assigned work** is the remaining hours of the open
work items assigned to the person, spread over the working days up to each one's due date. A week is overbooked
when allocations or assigned work pass capacity. People's working-schedule record, when it exists, replaces the
`WetAvailable` source behind `mantle.work.ResourceServices.get#PartyCapacity` and nothing else changes.

As built (impl-projects.md P7): a person with no `WetAvailable` hours has the timesheet policy's week (`dh` on `wd`), and
`TimesheetServices.get#WeekDays` takes the person, so MyTime's and Timesheets' working hours are their capacity. Leave is
`WetTimeOff` events the person is on (an all-day one the whole day). An allocation's hours fall on the person's working days in
proportion to each day's hours (a placeholder on the policy's week); leave and holidays do not lower an allocation, which is how
a week becomes overbooked. Assigned work with no due date is not spread (PersonDetail says how many hours). A placeholder names a
project role (`roleTypeId`, `RgpProject`) and a skill rather than a position class (few `EmplPositionClass` records exist); the
person who staffs it joins the project in that role. A project's managers request allocations; the holders of the new
permission `ALLOCATION_APPROVE` (the Projects managers and ADMIN) approve, reject, change and staff them, and allocate at once
unless they ask for approval.

### TeamPlanner

- **Layout:** calendar archetype as `.qvue`, people by weeks. A toolbar: the range (8, 12 or 26 weeks from a
  date), filters (team, role, skill, project), By person or By project. Rows: people grouped by role (as built: by
  their most held project role; the team is a filter), with the unstaffed placeholder requests on top; under each
  person their allocations as bars (as built: the bars are what a drag moves, by days). Each week cell: the capacity as a frame, the allocations stacked by
  project in the chart series colors, the assigned work as a line, leave and holidays marked, an overbooked week in
  warning (negative past 120%). A drag moves or stretches an allocation; a click on an empty week opens New
  allocation; a click on an allocation shows it with Edit, Staff, Approve and Reject; a person's name opens
  PersonDetail. By project turns the rows into projects with their people under them. Team members see it
  read-only.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `PlannerFind` | find | What is shown | range, team, role, skill, project | | | OpenProject team planner view select |
| `PlannerGrid` | component | People by week | capacity, allocations, assigned work, leave | drag and resize | `mantle.work.ResourceServices.get#TeamPlan` (new), `update#Allocation` (new) | OpenProject team planner; Ever Teams weekly limit |
| `AllocationForm` | dialog | An allocation | project or work item, person or role (as built: a project role) and skill, from, thru, hours per week or a percent of capacity, note | person `server-search` showing their free hours in the range | `create#Allocation`, `update#Allocation` (new) | OpenProject resource allocation |

- **Terminal:** `TeamPlannerTui` (impl-projects.md P11): the placeholders, people by week with capacity, the allocations,
  Move (a shift by days or new days) and, for an approver, Decide (approve, reject, cancel); requesting and staffing are
  Allocations', which the terminal renders as plain screens.
- **Source:** research §9 (OpenProject team planner and resource management); research-people §7.
- **Needs:** Allocations; Capacity; `.qvue` TUI texts.

### Allocations

- **Layout:** list. Chips: Requested (to review, default for managers), Unstaffed, Mine, Allocated, All. As built:
  Mine is the user's allocations and those the user requested, and the default for those who do not approve.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `AllocationList` | list | Allocations | project, person or role chip, from, thru, hours per week, status chip, requested by, reviewed by, note | `row-selection` | `WorkEffortAllocation` (new, `entity`) | OpenProject resource allocations |
| `StaffAllocation` | dialog | Name the person for a placeholder | candidates with the role or skill: free hours in the range, current projects, cost rate | candidates as a list by `render-mode` | `mantle.work.ResourceServices.find#StaffingCandidates`, `staff#Allocation` (new) | OpenProject staffing with the overbooking warning |
| `AllocationDecision` | list, bulk | Approve or reject | reason for a rejection | | `mantle.work.ResourceServices.approve#Allocation`, `reject#Allocation` (new) | OpenProject allocation states |

- **Needs:** Allocations; Capacity.

### PersonDetail (Context passed)

The Employee 360 (research-crosscut §3.4), designed in design-crosscut with People's version first; Projects mounts
it at `Projects/Resources/PersonDetail` with this row, and until the shared screen exists PersonDetail is a Projects
screen with these tabs:

| App | Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- | --- |
| Projects | Overview (the directory card, position, manager, skills from `PartySkill`, working hours), Allocations, Work items (assigned, open), Time (entries and timesheets), Capacity (weeks) | the person's projects, work and time that the viewer may see | request or edit an allocation; open a timesheet | availability and load |

Services beyond the base: `get#PartyCapacity`, `get#TeamPlan` (new); the time and work lists of §5 and §8 with
the person fixed.

## 10. Billing

Projects bills three ways, as the references converge (research §10): **time and materials** (billable hours at
the client rates, and expenses, by `create#ProjectInvoiceItems`), **milestones** (a reached milestone releases a
share of the order line behind it, new) and **fixed price by schedule** (the order's own invoicing, Sales' and
Accounting's). A project not billed has Money off. Contractors who bill the business for their time are paid from
the same entries at the vendor rates (`create#WorkerInvoiceItems`). The invoice itself, its approval, sending,
tax and payments, is the shared Invoice detail (Accounting's version first), which Projects mounts so a services
business running only Projects can review and send what it bills. Retainers and prepaid hours (n hours a month
drawn down by billable time) are not designed here; they are left to People, with its pay work (§16).

### Unbilled

- **Layout:** list, the billing queue. Chips: Client billing (default), Milestones due, Contractor time.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `UnbilledList` | list | By project | project, client, billing basis, unbilled hours, unbilled amount, unbilled expenses, reached milestones not billed, last invoiced, open draft invoice | Create invoice and Review time per row | `get#UnbilledSummary` (new) | Odoo invoicing by delivered timesheets; ERPNext timesheet billing summary |
| `CreateProjectInvoice` | dialog | Invoice a project's time and expenses | project, through date, add to an open draft (or new), grouping (per entry, per worker, one line) | draft `drop-down` of the client's open invoices for the project | `mantle.account.InvoiceServices.create#ProjectInvoiceItems` | `Accounting/Invoice/FindInvoice` `ProjectInvoice`; `MyAccount/Expense/FindExpenseInvoice` `WorkerInvoice` |
| `MilestonesDue` | list | Milestones complete and not billed | milestone, project, order line, share, amount, completed; Invoice | | `create#MilestoneInvoiceItems` (new) | Odoo delivered milestones |
| `ContractorTime` | list | Workers' unbilled time | worker, employer or vendor, hours, amount at vendor rates, through; Create worker invoice | | `get#UnbilledSummary` (new) with `RaprVendor` | `PartyTimeEntries` `WorkerInvoice` |
| `CreateWorkerInvoice` | dialog | A worker's invoice to the vendor | worker, vendor, project (optional), through date, add to an open invoice | | `mantle.account.InvoiceServices.create#WorkerInvoiceItems`; `create#ProjectInvoiceItems` with `ratePurposeEnumId` `RaprVendor` | `FindInvoice` `ProjectWorkerInvoice`; `PartyTimeEntries` `WorkerInvoice`; `MyAccount/Expense/EditExpenseInvoice` `WorkerInvoice` |

- **Actions:** per row Create invoice and Review time (TimeEntries with the project and Unbilled); after an invoice
  is made a notification links to it.
- **As built (impl-projects.md P8a):** `Billing/Unbilled.xml` over `ironstone.projects.BillingServices.find#UnbilledRows` and
  `mantle.work.ProjectServices.get#UnbilledSummary`, for those who manage money (TIME_ENTRY_RATE or ADMIN). Unbilled time is a
  billable entry (rate type not No Charge) on no client invoice that has ended; only the approved part (its timesheet Approved)
  is ready to invoice, so the number cards are Unbilled, Ready to invoice, Hours and Projects, and the chips All unbilled and
  Ready to invoice (Milestones due and Contractor time come with P8b). A row adds what waits for approval (submitted, open),
  entries without a rate, and why a project may not be invoiced (no client, no vendor, nothing approved, an approved entry
  without a rate). `CreateProjectInvoice` is `Unbilled/CreateInvoice.xml`: each approved entry ticked (one without a rate is
  not and is refused), an open draft of the project to the same client or a new invoice, the lines (per entry, per worker, one
  line; the project's WstInvoiceGrouping), the payment terms (the organization's default) and the date; none ticked is an
  error, never "all"; the invoice made, InvoiceDetail opens. The invoice is `create#ProjectInvoiceItems` with `approvedOnly`,
  `billableOnly` and the selection, in one transaction. No notification is sent: the screen opens the invoice.
  P8b: the Milestones due chip lists the shares due (reached, approved when gated, not billed) with Invoice (added to the project's
  open draft when it has one); a project with only shares due is listed under Client billing too, its row says how many; the dialog
  ticks the shares due beside the time, and the shares go on the invoice first (`create#MilestoneInvoiceItems`), then the time.
  Contractor time stays later (§7 of impl-projects.md).
- **Source:** research §10 (Odoo `sale_timesheet` policies, ERPNext timesheet billing, Dolibarr billable time);
  baseline project invoice dialogs of `FindInvoice` and `ProjectTimeEntries`.
- **Needs:** Billing services; Milestone billing share.

### Invoices

- **Layout:** list of the invoices of projects: client invoices made from project time, milestones or expenses,
  worker invoices, and expense invoices on a project. Chips: Drafts, Sent, Overdue, Paid, Worker invoices, All.
  Clients see their organization's invoices only.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `ProjectInvoiceFind` | find | Narrow | project, client, type, status, date and due periods | | | `FindInvoice` `MainOptions` |
| `ProjectInvoiceList` | list | Invoices | invoice (link), type, project, from, to, date, due, total, unpaid, status chip | CSV | `Invoice` with `WorkEffortInvoice` and the billed time entries (`entity`) | `FindInvoice` `InvoiceList`; `FindExpenseInvoice` `InvoiceList` |

As built (impl-projects.md P8a): `Billing/Invoices.xml` over `ironstone.projects.BillingServices.find#InvoiceRows`: the invoices of the
projects the user sees, by `WorkEffortInvoice` (which `create#ProjectInvoiceItems` now writes for a client invoice) and the billed
time (`TimeEntry.invoiceId`, a client invoice; `vendorInvoiceId`, a worker's); an invoice linked to the project to someone other
than its client is an expense invoice. The chips add **To send** (Finalized: approved and not sent) between Drafts and Sent, so an
approved invoice is in one chip; All is the default and includes cancelled invoices.
Clients (impl-projects.md P10b): Billing opens on Invoices for a client (Unbilled, Rates and OrderDetail stay refused it), which lists
only the client invoices of its client projects addressed to its organization or itself and sent to it (Sent, Acknowledged, Payment
Received: never a draft, an approved invoice not sent yet or a cancelled one), with the chips Sent, Overdue, Paid and All
(`ironstone.projects.BillingServices.get#ClientInvoices`); never a worker's or an expense invoice, another client's, or one of a project of its
organization without client sign-in.

### InvoiceDetail (Context passed)

The core-app definition is now [design-crosscut §3.16](design-crosscut.md#316-invoicedetail).
Its Accounting/source/period guards extend the common screen while retaining the Projects
time/milestone forms and client restrictions described below. The following built behavior is
the compatibility baseline; proposed extensions do not imply it has already changed.

Oct 28, 2026: Projects `ironstone.projects.BillingServices.update#InvoiceStatus` calls
`ironstone.accounting.InvoiceServices.change#InvoiceState`, the one invoice state guard, and the
Projects UI is unchanged ([design-crosscut §3.16](design-crosscut.md#316-invoicedetail), D6).

Oct 28, 2026: Projects `BillingServices.send#Invoice` sends through Accounting's proposed
`ironstone.accounting.InvoiceServices.send#Invoice`, which renders the version, issues the
InvoicePay link and records each recipient's outcome ([design-crosscut §3.16](design-crosscut.md#316-invoicedetail), R-SB-15).

Oct 28, 2026: ledger lines gain proposed facility and cost-centre dimensions in the first release
(Accounting AC-22, [design-crosscut §8](design-crosscut.md#8-decided)). Projects invoices and time
postings pass the cost centre a project names, when it has one; nothing in the Projects UI changes
until a project carries a cost centre.

The Invoice detail, a research-crosscut §3 reused screen added at this file's review (Accounting, Projects, Sales,
Purchasing, Customer Service), designed in design-crosscut with Accounting's version first; Projects mounts it at
`Projects/Billing/InvoiceDetail` with this row:

| App | Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- | --- |
| Projects | Overview (header and lines), Time (the entries behind each line, `TimeEntry.invoiceId`, and the milestones), Payments, Chatter | invoices of projects the user manages | approve, send (email with the PDF and the time detail), print, cancel a draft (`mantle.account.InvoiceServices.cancel#Invoice`, which frees its time entries) | the work behind each line |
| Projects, client users | Overview, Payments, the time detail when the project shares hours | invoices to their organization | download the PDF | what they owe and for what |

As built (impl-projects.md P8a): `screen/Shared/InvoiceDetail.xml` mounted at `Projects/Billing/InvoiceDetail`, the Projects context
only until design-crosscut (an Accounting root will choose its own by `appRoot`). One page, not tabs: the title row (kind, client,
the read-only status-bar of the receivable flow, overdue), Approve (In-Process to Finalized, posted when the organization keeps a
ledger), Send (a dialog: the client's EmailBilling address, else its billing contact's or its own primary; approves a draft first,
then Sent; the email carries the printed invoice and the lines, the PDF attached when the server makes one), Print, and More with
the PDF, Edit (a draft: date, payment terms with the due date following, the client's reference, description, message), Resume
changes (Finalized) and Cancel (In-Process or Finalized: its time is unbilled again); the boxes Details, Projects, Payments (read
only), Lines (each with the count and hours of its time; Remove on a draft frees that time) and Time (every entry billed: line, day,
who, work item, hours, rate, amount, comment; CSV); Chatter. The print is `Billing/InvoicePrint.xml` (html-print, PDF under `/fop`),
with the time detail when the project's WstTimeDetail is not N. Worker and expense invoices are read only here; Accounting's
version adds payments, adjustments and the ledger. P8b: a milestone line says which milestone it bills, when it was reached and its
share of which order line, and a Milestones box lists them; removing it makes the share due again.
Clients (impl-projects.md P10b): the same page read only for a client's own invoice (`get#InvoiceAccess` clientView; any change asks
need change, which a client never passes, and the write services are denied it): the details, projects, lines, the milestones (no order
link), the payments, Print and the PDF (`InvoicePrint`, its time detail as the client's); no Chatter, no move, no address to send to. The
time of a line is shown only for a project that shares its hours, as day, work item (a shared item by name, any other as "Other work")
and hours: never who, a rate, an amount or a comment, though the invoice's own line amounts are the client's.

### OrderDetail (Context passed)

The common definition and app action sets are now
[design-crosscut §3.6](design-crosscut.md#36-orderdetail); the Projects estimate and source-link
behavior below remains its existing context.

The Order detail (research-crosscut §3.6), designed in design-crosscut; Projects mounts it at
`Projects/Billing/OrderDetail` for the sales order a project fulfils:

| App | Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- | --- |
| Projects | Overview, Items (each line's work efforts and milestone shares, `OrderItemWorkEffort`), Invoices | sales orders linked to the user's projects | link a line to the project or a milestone, set a milestone's share, create a project from a line | what the project delivers and bills |

As built (impl-projects.md P8b): `screen/Shared/OrderDetail.xml` mounted at `Projects/Billing/OrderDetail`, one page: for one who manages
money and sees a project its lines are linked to. The title row (order, customer, the read-only status-bar Open, Quote proposed, Placed,
Approved, Completed, the estimate's state), Send estimate for approval (one project the user manages, the order open or proposed) and
Print estimate; number cards; Details, Projects, Invoices (by `OrderItemBilling`), Lines (projects, shares, billed), Milestone shares.
Links and shares are made where they live: the project's Money tab links a line, MilestoneDetail sets a share; Create project from a
line waits for Sales.

### Rates

- **Layout:** list. Chips: Client billing (`RaprClient`), Worker pay (`RaprVendor`).
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `RateFind` | find | Narrow | purpose, rate type, project, person, position class, work type, effective on | | | `HumanRes/EditRateAmounts` `EditRateAmounts` header fields |
| `RateList` | list, editable rows | The rates | purpose, rate type, project, person, position class, work type, from, thru, amount, currency | from, thru and amount edited in place | `mantle.humanres.RateServices.update#RateAmount` | `EditRateAmounts` `EditRateAmounts`; OpenProject hourly rates with history |
| `NewRate` | dialog | A rate | purpose, rate type, project, person, position class, work type, from, thru, amount, currency | | `create#RateAmount` | `EditRateAmounts` `CreateRateAmount` |
| `WhichRate` | dialog | Which rate applies | person, project, work item, work type, date; the client and vendor rate found and why | | `mantle.work.TimeServices.find#RateAmount` | ERPNext activity costs |

- **States:** `update#RateAmount` changes only dates and amount, so a change of scope ends the rate (thru) and adds
  a new one; the list says so on such an edit.
- **As built (impl-projects.md P8a):** `Billing/Rates.xml` over `ironstone.projects.BillingServices` `find#RateRows`, `store#Rate`, `end#Rate`,
  `get#WhichRate`: the rates on the projects the user sees or on none; current and coming by default, ended ones on asking or on an
  effective day. The edit is a row dialog (from, thru, amount), not in-place cells. Which rate is a dialog whose answer shows above
  the list (the client and worker rate found by `mantle.work.TimeServices.find#RateAmount` and what each is scoped to). The seeded
  no-charge client rate (no project, no person) is listed but not changed or ended. A rate changes only time logged in its dates;
  the rates already found for time not invoiced are found again by ProjectTime's Update rates.
- **Source:** research §10 (versioned rate cards), research open question on rate cards; baseline
  `HumanRes/EditRateAmounts`.

## 11. Reports

Each report is the report archetype (style-guide §3.12): parameters in the URL so a report is bookmarkable and can
be a saved find, number cards, a chart through `m-chart` with its table behind it, CSV and XLSX, and `html-print`.
Cross-project dashboards beyond these are Insights'. The measures are defined here because the references use
several (research §12): **utilization** is hours logged over capacity; **billable utilization** is billable hours
over capacity; **cost** is hours at vendor rates plus expenses; **billable value** is billable hours at client rates
plus billable expenses; **margin** is billable value less cost; **budget used** is actual client cost over the
client budget.

### Reports

- **Layout:** settings-style index (style-guide §3.9) of cards: Time, Work items, Sprints, Portfolio,
  Profitability (managers), Utilization (managers), Progress; each with a sentence and the user's saved reports
  of it.
- **Forms:** none beyond the cards' links.

### TimeReport

- **Layout:** report. Rows by up to three criteria in order, columns by period, totals at both ends.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `TimeReportParams` | single | The parameters | date range, period (week, month), criteria (project, top-level item, parent, work item, person, work type, client, billable) in order, filters for each (an item filter takes its subtree) | `field-row-big`; criteria as three `drop-down`s | | Redmine spent-time report criteria |
| `TimeReportTable` | list | The result | the criteria, a column per period, hours, billable hours, amounts (managers) | CSV and XLSX; `m-chart` stacked bars by the first criterion | `mantle.work.ProjectReportServices.get#TimeReport` (new) | Redmine `timelog/report`; Odoo timesheet pivot |

### WorkItemReport

- **Layout:** report. Cards Open, Created, Resolved, Overdue; charts created against resolved by week and open by
  status and type; the table below.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `WorkItemReportParams` | single | The parameters | projects, date range, type, group by (assignee, priority, component, status) | | | Redmine issue report |
| `WorkItemSummary` | list | Counts | the group, a column per status, total, overdue, average cycle time (In Progress to Complete, from the audit log of `statusId`) | `m-chart` | `mantle.work.ProjectReportServices.get#WorkItemSummary` (new) | Redmine issue report details; OpenProject work-package summary; Odoo task analysis |

### SprintReport

- **Layout:** report. One sprint's burndown, or the velocity of the project's last sprints.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `SprintReportParams` | single | The parameters | project, sprint, or the last n sprints | | | OpenProject sprint reports |
| `Velocity` | list | Committed against completed | sprint, committed, added, completed, carried over (points or hours) | `m-chart` bars; a burndown line for one sprint | `mantle.work.ProjectReportServices.get#SprintBurndown`, `get#SprintVelocity` (new) | OpenProject burndown; Jira velocity (familiar shape) |

### PortfolioReport

- **Layout:** report. A row per project.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `PortfolioParams` | single | The parameters | status, manager, client, program | | | OpenProject project list filters |
| `PortfolioTable` | list | The portfolio | project, status, health, % complete, target date against the forecast (the latest due date of its open items), open and overdue items, hours of budget, budget used | CSV and XLSX | `mantle.work.ProjectReportServices.get#PortfolioStatus` (new), over `get#ProjectStats` | OpenProject portfolio overview; ERPNext Project Summary report |

### ProfitabilityReport

- **Layout:** report, managers. A row per project, totals by client.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `ProfitabilityParams` | single | The parameters | period, client, project, billing basis | | | Odoo project profitability |
| `ProfitabilityTable` | list | The money | project, budget, cost, billable value, billed, unbilled, margin, margin % | CSV and XLSX; `m-chart` | `mantle.work.ProjectReportServices.get#ProjectProfitability` (new) | Odoo project profitability; ERPNext project costing |

### UtilizationReport

- **Layout:** report, managers. A row per person and week.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `UtilizationParams` | single | The parameters | period, team, person | | | Ever Teams weekly limit report |
| `UtilizationTable` | list | The load | person, week, capacity, logged, billable, utilization, billable utilization, allocated | CSV and XLSX; `m-chart` | `mantle.work.ProjectReportServices.get#Utilization` (new) | Frappe HR employee hours utilization; Ever Teams weekly limit |

### ProgressReport

- **Layout:** report, the baseline's Progress tab with a project parameter and a **from** parameter (an item of the
  project; the report then breaks that item's subtree down instead of the whole project, so an epic has its own
  report). The breakdown table is a tree: its rows are the top-level items (or the from item's children), each
  expandable to its children's rows to any depth, every row its subtree's totals; Expand to level n sets the depth
  printed and exported. A chart of estimated against actual plus remaining by top-level item sits above it.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `MilestoneStats` | list | By milestone | start, milestone, estimated, actual and remaining hours and days, act/est and act+rem/est % | | `get#ProjectMilestoneSummary` | `ProjectProgressReport` `MilestoneStatsList` |
| `TopLevelStats` | list, `view-tree` | By top-level item, and down the tree | priority, item, actual, remaining and estimated hours and days, hours budget, act/est, act+rem/est, act/bgt and act+rem/bgt %; days at the hours per day given (8) | `view-tree`, a row's children fetched on open by `get#WorkEffortChildStats` with that row's item; CSV, XLSX and `html-print` at the expanded depth, indented | `mantle.work.ProjectServices.get#WorkEffortChildStats` (`timePerDay`) | `ProjectProgressReport` `ChildStatsListDays`; HiveMind and SimpleScreens estimate breakdowns |

**Needs (all reports):** Reports services; `m-chart` (exists); Print documents.

**As built (impl-projects.md P9).** `Projects/Reports` holds the index (`Reports/Index`, the cards; Profitability and Utilization only for
managers, who alone may open them through `BOSS_PROJECTS_MANAGERS`) and a screen per report in the menu. Each report keeps its parameters
in the URL (a GET form), shows number cards, its charts (`ironstone.projects.ReportServices.get#ChartConfig`: the series in the brand order, a
terminal chart twin) with the tables behind them (CSV and XLSX), and Print opens the same URL in `html-print`. Every report reads only the
projects the user sees, time by the rule of TimeEntries (the user's own and their reports', that of the projects they manage, everyone's
for ADMIN) and money only for those who manage it (ADMIN, `TIME_ENTRY_RATE`). The measures as computed: the value of time is the entry's
own client hour rate, else its `RateAmount`'s (F86), its cost the same of the worker's rate, each to the cent per entry; billable is any
rate type but no charge; the billable expenses are the project's expense invoices (billed through to the client as
`create#ProjectInvoiceItems` bills them), so they add to both cost and billable value; billed is the project's client invoices by
invoice date; margin is billable value less cost (the billing basis Billed: billed less cost). Utilization counts all of a person's
logged time, on any project, as the team planner does (a person's load is whole), over the capacity of `get#PartyCapacity`; weeks to
come have none. The work item report's created date is an item's first status audit row (Mantle's `WorkEffort` has no created date),
its resolved date the first reaching Complete or Closed, its cycle time from first In Progress; its table counts the items of the
scope by their status now, its cards and chart the period. The time report shows up to fourteen period columns (the totals count the
whole range). The portfolio's forecast is the latest due date of a project's open items, late when after the project's target date;
at risk is health At risk or Off track, a warning of `get#ProjectStats` or late. Saved reports on the index's cards are later; a bookmark
keeps a report's parameters.

## 12. Settings

App-wide settings belong to the owning organization (`PartySetting` rows of new `PartySettingType`s, the way Mantle
keeps an organization's preferences); a project's own choices are `WorkEffortSetting` rows (new), edited in
ProjectSettings. Global configuration defines and a project chooses among it, as OpenProject and Redmine split them
(research §13).

### Settings

- **Layout:** settings index (style-guide §3.9): cards for Work item types, Workflows, Labels, Templates, Time,
  Billing, Code and Intake, each with a sentence and its links; links to Commons' notification settings and to
  Admin's user groups, where people are put in the three Projects groups.

### WorkItemTypes

- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `TypeList` | list, editable rows | Types offered | purpose, label, icon, offered, sequence | icon from a fixed list of symbols | `PartySetting` `ProjWorkItemTypes` (new type, `entity`): a JSON object with `offered` (the types in order, a comma list) and `icons` (only those not the standard one); with no setting Task, Bug Fix, New Feature, Feature Enhancement, Document and Support | OpenProject types; Redmine trackers |
| `NewType` | dialog | A type of the organization's own | label, icon | | `Enumeration` of `WorkEffortPurpose` with `parentEnumId` `WetTask` (`entity`), id `WepOrg` and a number, offered at the end | Redmine new tracker |

### Workflows

- **Layout:** settings page: the flows used by projects and work items, each as a transition matrix; the statuses
  of type `WorkEffort` with their colors; a link to the Tools Status Flows screen for other status types.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `FlowList` | list | Flows | flow, description, used by n projects | | `StatusFlow` (`entity`) | OpenProject workflows |
| `FlowMatrix` | list, editable rows | Transitions | from status, to status, transition name, user group allowed | | `StatusFlowTransition` (`entity`) | Redmine workflow matrix |
| `StatusList` | list, editable rows | Statuses | status, description, sequence, color | color from the brand set | `StatusItem` (`entity`) with `statusColor` | style-guide §5.2 color map; OpenProject statuses |

### Labels

- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `LabelList` | list, editable rows | Labels | label, color name (from the brand set), used by n items | | `WorkEffortCategory` with `categoryTypeEnumId` `WcatLabel` (new field, `entity`) | Odoo tags; Gameplan labels |
| `MergeLabels` | dialog | Merge two | from, into | | `WorkEffortCategoryAppl` (`entity`) | Redmine category reassign |

### Templates

- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `TemplateList` | list | Templates | name (opens it as a project with the template banner), key, items, milestones, members, used by | | `WorkEffort` with `isTemplate` (new, `entity`) | OpenProject templated projects; ERPNext project template |
| `NewTemplate` | dialog | A template | from scratch or from a project, name, key | | `create#Project`; `clone#Project` with `isTemplate` | `EditProject` `CloneProject` |

### TimeSettings

- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `WorkTypes` | list, editable rows | Work types | work type, description, sequence | | `Enumeration` of `WorkType` (`entity`) | Redmine time entry activities; OpenProject activities |
| `TimesheetPolicy` | single | How time is kept | the week's first day, approvers (line manager, the projects' managers, any manager), lock on submit, required work item and comment, smallest entry (0.25 h), future entries allowed, the hours of a working day and the working days (the working hours until Capacity), the missing-time reminder's day and hour | | `PartySetting` `ProjTimesheetPolicy` with short keys to fit its 255 characters (`ws`, `ap`, `lk`, `ri`, `rc`, `mh`, `fu`, `dh`, `wd`, `rd`, `rh`; impl-projects.md F9), through `mantle.work.TimesheetServices.get#` and `store#TimesheetPolicy` | Redmine required time entry fields; Odoo timesheet reminders |

As built (impl-projects.md P6b): `Settings/Time.xml`. The work types offered are the organization's PartySetting `ProjWorkTypes`
(new type; a JSON object whose `offered` is the WorkType enumIds in order, through `mantle.work.TimesheetServices.get#` and
`store#WorkTypes`; with no setting the eight services types), not the Enumeration's sequence, so the WorkTypes list is Offer or
Stop offering, Up and Down, and Rename for the organization's own (NewWorkType makes `WktpOrg<n>`); MyTime, QuickTime,
TimeEntries' dialog and bulk change read it. The smallest entry is a choice of 0.1, 0.25, 0.5 and 1 hour.

### BillingSettings

- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `BillingDefaults` | single | Defaults for new projects | billing basis, invoice grouping, time detail on invoices, worker invoicing (monthly, by project), hours shared with clients | | `PartySetting` (`entity`) | Dolibarr project admin; ERPNext projects settings |

As built (impl-projects.md P8a): `Settings/Billing.xml`, the organization's `ProjBillingDefaults` JSON (`billingBasis`,
`invoiceGrouping` PerEntry, PerWorker or OneLine, `timeDetail`, `shareHours`, `settlementTermId`, `workerInvoicing` Monthly or
ByProject) through `ironstone.projects.BillingServices` `get#` and `store#BillingSettings`, for the Projects managers who manage money. Added
the payment terms of a new invoice (a SettlementTerm; empty uses the organization's accounting terms). The time detail is the new
project setting type `WstTimeDetail` (its organization default `timeDetail`), as the billing basis, grouping and shared hours are.

### CodeSettings

- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `RepositoryDefaults` | single | New repositories | storage for project repositories, default branch name, default merge method (merge commit), branch rules (default branch protected from force pushes and deletes; merge requests required off; approvals 1; approvals kept when the source moves) | `create#ProjectRepository` applies them; no default webhook, as each needs its own secret, kept encrypted on the repository | `ironstone.projects.CodeServices.store#RepositoryDefaults` (`PartySetting` `ProjRepositoryDefaults`, short keys within its 255 characters) | Git-Hosting; GitLab defaults |
| `Conventions` | single | Commit and branch conventions | Fixes keywords on, branch name pattern, merge request moves (opened to In Review, merged to Complete) | requiring a work item key in commits to protected branches is later (a pre-receive rule) | `store#Conventions` (`PartySetting` `ProjConventions`) | Git-Hosting "Projects and tasks" |
| `SshAccess` | list | Who may use SSH | user group, holds `SSH_GIT`; Grant, Revoke | ADMIN's grant does not change here | `set#SshAccess` (`UserGroupPermission`) | Git-Hosting "Logging in" |

### IntakeSettings

- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `IntakeTypes` | single | What Projects triages | request types offered, types triaged without a project, default triage assignee | | `PartySetting` (`entity`) | Redmine trackers |
| `RequestCategories` | list, editable rows | Categories | category, parent, responsible party | | `RequestCategory` (`entity`) | Redmine issue categories; Frappe Helpdesk ticket types |
| `EmailIntake` | list, editable rows | Addresses that make requests | mail account, plus tag, project, makes (requests, or work items for internal senders) | each row writes its Comms rule | `org.moqui.impl.EmailClientServices.create#EmailRule`, `update#EmailRule`, `delete#EmailRule` with the new `createRequest` action | Odoo project alias; Redmine mail handler; Dolibarr email collector |
| `PublicForm` | single | The public request form | CAPTCHA on, files allowed and their size, the confirmation email's template | | `PartySetting` (`entity`) | Mantle contact request with reCAPTCHA |

As built (P5): `ironstone.projects.ProjectRequestServices`. The types are the organization's `ProjIntake` (`offered`, `triaged`,
`defaultType`, `triagePartyId`; a project may set its own default type, `WstRequestType`, and triage assignee); the email intake
is a list of the projects with an address and an Add an address dialog, each row's rule written as the manager (who must
manage the account; a plus tag belongs to one project); the public form is `ProjPublicForm` (CAPTCHA, files, at most how many
and how large, a confirmation on or off: the confirmation's template is later). A project's own intake (its address, its form on
and its link rotated, its triage assignee and default type) is ProjectSettings' Intake box.

## 13. Baseline coverage

Where each baseline form and Mantle service of the project, task, request, time and rate functions lands. The
inventories' **Designed in** columns were filled from this section and the form summaries on Oct 21, 2026
(design-doc-guide §9), and the git forms and services added to SimpleScreens and Mantle on Oct 20
(`Project/EditRepositories`, `Project/GitCommit`, `Task/EditSource`, `MyAccount/User/GitAccess`;
`mantle.work.GitServices`) were added to ss-inventory and usl-inventory with them.

### 13.1 SimpleScreens and My Account forms

| Baseline screen | Forms | BOSS screen (form) |
| --- | --- | --- |
| `Project/FindProject` | `NewProject`, `ListProjects` | `Projects/Projects/NewProject` (`ProjectStart`), `Projects/QuickCreate` (`QuickProject`); `Projects/Projects` (`ProjectFind`, `ProjectList`) |
| `Project/ProjectSummary` | `ViewProject`, `MilestoneList`, `ViewWpweForm`, `ViewUserAssignForm`; `ViewGitRepositoryList`, `ViewGitTagList` (Oct 20) | `Projects/Projects/ProjectDetail` and its Overview (`StatusBox`, `NextMilestones`, `WorkCounts`, `TopLevelProgress`, `Members`, `RepositoriesBox`); the `TaskTree` tree to `ProjectDetail/WorkItems` in Tree view (`WorkItemTree`); `ProjectDetail/Docs` (linked pages); `ProjectDetail/Code` (`ProjectTags`) |
| `Project/EditProject` | `EditProject`, `CloneProject` | `ProjectDetail/Settings` (`ProjectGeneral`, `TemplateBox`), `ProjectDetail/Money` (`BudgetActuals`), Overview (`Description`); `ProjectDetail` (Clone); `NewProject` (`ProjectStart` from a template) |
| `Project/EditMilestones` | `CreateMilestoneForm`, `MilestoneList` | `Projects/Projects/Roadmap` (`NewMilestone`, `RoadmapList`); `Projects/Projects/MilestoneDetail` (`MilestoneHeader`) |
| `Project/MilestoneSummary` | `InactiveTaskList`, `ActiveTaskList`, `DoneTaskList` | `MilestoneDetail` (`MilestoneItems`) |
| `Project/ProjectProgressReport` | `ChildStatsListDays`, `MilestoneStatsList` | `Projects/Reports/Progress` (`TopLevelStats`, now a tree to any depth, `MilestoneStats`); ProjectOverview (`TopLevelProgress`); `MilestoneDetail` (`MilestoneProgress`) |
| `Project/EditUsers` | `AddUserAssignForm`, `UpdateUserAssignForm` | `ProjectDetail/Team` (`TeamMembers`); `NewProject` (`ProjectTeamStep`) |
| `Project/EditWikiPages` | `AddWpweForm`, `DeleteWpweForm` | `ProjectDetail/Docs` (linked pages) |
| `Project/ProjectTimeEntries` | `TimeEntryListForm`; the project invoice section | `ProjectDetail/Time` and `Projects/Time/TimeEntries` (`TimeEntryList`); `Projects/Billing/Unbilled` (`CreateProjectInvoice`, `CreateWorkerInvoice`) |
| `Project/EditRepositories` (Oct 20) | `AddRepositoryForm`, `CreateRepositoryForm`, `RepositoryList`, `ProjectRefList` | `ProjectDetail/Code` (`LinkRepository`, `NewRepository`, `ProjectRepositories`, `ProjectTags`); `Projects/Code/Repositories` |
| `Project/GitCommit` (Oct 20) | no forms | `Projects/Code/CommitDetail` |
| `Task/FindTask` | `SearchOptions`, `NewTaskForm`, `ListTasks`, `AssignTaskSelected`, `UnAssignTaskSelected`, `UpdateTaskSelected` | `Projects/WorkItems` (`WorkItemFind`, `QuickAddWorkItem`, `WorkItemList`, `WorkItemBulk`), `Projects/QuickCreate` (`QuickWorkItem`); Commons Tasks already |
| `Task/TaskSummary` | `ClockInForm`, `AddCommentForm`, `NewChildTaskForm`, `NewContentForm`, `UpdateContentForm` | `Projects/WorkItems/WorkItemDetail` (`Timer`, `NewSubItem`; the child task list as the `SubItems` tree), with Shared/Chatter and Shared/RecordFiles |
| `Task/TaskSummary/TaskCommentReply`, `TaskCommentUpdate` | `ReplyCommentForm` (both) | Shared/Chatter on WorkItemDetail |
| `Task/EditTask` | `EditTask` | `WorkItemDetail` (`WorkItemHeader`, `WorkItemFields`, `WorkItemDescription`) |
| `Task/EditTimeEntries` | `ClockInForm`, `AddTaskTime`, `TimeEntryList` | `WorkItemDetail` (`Timer`, `LogTime`, `WorkItemTime`) |
| `Task/EditUsers` | `AddUserAssignForm`, `AddTeamAssignForm`, `UpdateAssignForm` | `WorkItemDetail` (`WorkItemPeople`) |
| `Task/EditRelated` | `AddRelatedToForm`, `AddRelatedFromForm`, `DeleteRelatedToForm`, `DeleteRelatedFromForm` | `WorkItemDetail` (`WorkItemLinks`) |
| `Task/EditRequests` | `AddRweForm`, `DeleteRweForm` | `WorkItemDetail` (`WorkItemRequests`) |
| `Task/EditWikiPages` | `AddWpweForm`, `DeleteWpweForm` | Commons Knowledge already; `WorkItemDetail` (`LinkedRecords`) |
| `Task/EditSource` (Oct 20) | `AddCommitForm`, `AddRefForm`, `TaskCommitList`, `TaskRefList` | `WorkItemDetail` (`Commits`, `Branches`); `CommitDetail` (`CommitWorkItems`) |
| `Request/FindRequest` | `NewRequestForm`, `ListRequests` | `Projects/Requests` (`NewRequest`, `RequestFind`, `RequestList`) |
| `Request/EditRequest` | `EditRequest`, `AddCommentForm`, `AddPartyForm`, `UpdatePartyForm`, `NewNoteForm`, `UpdateNoteForm`, `NewContentForm`, `UpdateContentForm`, `RequestTaskList` | `Projects/Requests/RequestDetail` (`RequestHeader`, `ResolveRequest`, `RequestPeople`, `RequestWork`), with Shared/Chatter and Shared/RecordFiles |
| `Request/EditRequest/RequestCommentReply`, `RequestCommentUpdate` | `ReplyCommentForm` (both) | Shared/Chatter on RequestDetail |
| `Request/EditRequestItems` | `NewRequestItemForm`, `RequestItemListForm` | `RequestDetail` (`RequestItems`) |
| `Request/EditTasks` | `AddRweForm`, `NewTaskForm`, `UpdateRweForm` | `RequestDetail` (`LinkWorkItem`, `MakeWorkItem`, `RequestWork`) |
| `Request/EditUsers` | `AddUserForm`, `UpdateUserForm` | `RequestDetail` (`RequestPeople`) |
| `Request/EditWikiPages` | `AddWprForm`, `DeleteWprForm` | Commons Knowledge already; `RequestDetail` (`LinkedRecords`) |
| `Party/PartyProjects` | `AddUserAssignForm`, `UpdateUserAssignForm` | `ProjectDetail/Team` (`TeamMembers`); `Projects/Resources/PersonDetail` |
| `Party/PartyTasks` | `AddUserAssignForm`, `UpdateUserAssignForm` | `WorkItemDetail` (`WorkItemPeople`); `PersonDetail` (Work items) |
| `Party/PartyRequests` | `AddUserForm`, `UpdateUserForm` | `RequestDetail` (`RequestPeople`) |
| `Party/PartyTimeEntries` | `ClockInForm`, `WorkerInvoice`, `TimeEntryList` | `Projects/Time/TimeEntries` (`EditTimeEntry` clock in for someone, `TimeEntryList`); `Projects/Billing/Unbilled` (`CreateWorkerInvoice`); `PersonDetail` (Time) |
| `Party/PartyTimeEntries/EditTimeEntry` | `AddTimeForm` | `TimeEntries` (`EditTimeEntry`); `MyTime` (`EntryForm`); `WorkItemDetail` (`LogTime`) |
| `HumanRes/EditRateAmounts` | `CreateRateAmount`, `EditRateAmounts` | `Projects/Billing/Rates` (`NewRate`, `RateList`); `ProjectDetail/Money` (`ProjectRates`) |
| `Accounting/Invoice/FindInvoice` | `ProjectInvoice`, `ProjectWorkerInvoice`, `WorkerInvoice` | `Projects/Billing/Unbilled` (`CreateProjectInvoice`, `CreateWorkerInvoice`); Accounting keeps its own invoice list |
| `MyAccount/User/TimeEntries` | `TimeEntryList` | Commons TaskDetail already; `Projects/Time/MyTime`, `Projects/Time/TimeEntries`, `WorkItemDetail` (`WorkItemTime`) |
| `MyAccount/Expense/FindExpenseInvoice`, `EditExpenseInvoice` | `WorkerInvoice` (both) | `Projects/Time/MyTime` (`InvoiceMyTime`); the other expense forms are People's (design-drawers-commons §20) |
| `MyAccount/User/GitAccess` (Oct 20) | `CreateAccessTokenForm`, `AccessTokenList`, `AddSshKeyForm`, `SshKeyList` | `Projects/Code/GitAccess` (`NewAccessToken`, `AccessTokens`, `AddSshKey`, `SshKeys`) |
| `template/work/TeamTimesheet.xsl-fo.ftl` | a print with no screen | `TimeEntries` (`TeamTime`) and the team timesheet print (§14) |
| MarbleERP `marble.xml`, `marble/dashboard.xml` | the Project, Task and Request mounts; request counts by status | the Projects app; `Projects/Home` and the Requests chips |

`ProjectSummary`'s task tree is carried as the Tree view of WorkItems (and of the project's Work items tab), with
roll-ups the baseline tree did not show; HiveMind's `ProjectSummary` has the same tree. Not carried: its
status-history box (Chatter's changes), and the baseline's broken links (`ProjectSummary`'s `findTask`, `EditProject`'s
`editClient`, `PartyTimeEntries`' `editFacility`). `WorkEffortNote` and `RequestNote` rows are read in Chatter and no
longer written, as design-drawers-commons decided.

### 13.2 Mantle services

| Service file | Called by Projects' screens | Not called by a screen, and why |
| --- | --- | --- |
| `mantle.work.ProjectServices` | `create#Project`, `clone#Project`, `update#Project`, `get#ProjectStats`, `get#ProjectMilestoneSummary`, `get#WorkEffortChildStats`, `get#ProjectParties`, `get#ProjectTeams`, `get#ProjectTasks`, `get#ProjectMilestones`, `create#Milestone`, `update#Milestone` (all twelve) | — |
| `mantle.work.TaskServices` | `create#Task`, `update#Task`, `set#TaskMilestone`, `add#TaskTime`, `get#FullCalendarData`; `create#SimpleTask` stays Commons' | `set#TaskDefaults`, `update#TaskFromTime`, `update#ProjectTimeFromTask` run from EECAs; `add#TaskComment`, `update#TaskComment`, `delete#TaskComment` are replaced by Chatter's `log#RecordNote` (as in Commons) |
| `mantle.work.TimeServices` | `store#TimeEntry`, `create#TimeEntryClockIn`, `delete#TimeEntry`, `store#TimeEntryWorkEffort`, `store#WorkEffortPartyTime`, `get#TeamTimesheetInfo`, `get#TimeEntryAmount`, `resetAndGet#TimeEntryRates`, `resetAndGet#ProjectTimeEntryRates`, `get#TimeEntryRate`, `find#RateAmount`, `upload#TimeDetailFile`, `import#TimeDetailFile` | `delete#TimeEntries` (through `delete#WorkEffort`), `find#TimeEntryRateAmount`, `get#TimeEntryFacility`, `import#TimeDetailRecord` (inside others); `get#TimeEntryRiskClassInfo`, `upload#TimeSummaryFile`, `import#TimeSummaryFile`, `import#TimeSummaryRecord` are payroll and staffing imports, People's |
| `mantle.work.WorkEffortServices` | `clone#WorkEffort`, `delete#WorkEffort`, `add#WorkEffortParty`, `remove#WorkEffortParty`, `replace#WorkEffortParty`, `link#WorkEffortRecord`, `unlink#WorkEffortRecord`, `add#WorkEffortProduct`, `create#WorkEffortContent`, `update#WorkEffortContent` (through RecordFiles) | `get#WorkEffortStartEnd`, `get#WorkEffortContentLocation`, `save#WorkEffortContentFile` (inside others); `get#UserTodayItems`, `snooze#UserTodayItem` are Commons' |
| `mantle.work.GitServices` | `create#ProjectRepository`, `add#ProjectRepository`, `remove#ProjectRepository`, `get#RepositoryProjects`, `add#TaskCommit`, `remove#TaskCommit`, `add#WorkEffortRef`, `remove#WorkEffortRef` | `find#TaskReferences`, `store#TaskCommit`, `store#WorkEffortRef`, `link#CommitReferences`, `link#RefByName`, `close#RefLinks`, `apply#CommitKeywords`, `complete#TaskFromCommit` run from the gitECA rules; `check#GitRepositoryAuthz` is the authz service |
| `mantle.work.EventServices` | `get#FullCalendarData` (ProjectCalendar), `get#FutureBusinessDay` (Timeline) | `get#NextBusinessDay` (inside `get#FutureBusinessDay`); the rest are Commons' |
| `mantle.request.RequestServices` | `create#Request`, `update#Request`, `replace#RequestParty`, `link#RequestRecord`, `unlink#RequestRecord`, `create#ContactRequest`, `create#ContactRequestReCaptcha` (through `create#IntakeRequest`), `create#RequestContent`, `update#RequestContent` (through RecordFiles), `add#RequestComment`, `update#RequestComment`, `delete#RequestComment` (through Chatter) | `check#RequestComment`, `get#RequestContentLocation`, `save#RequestContentFile` (inside others); `get#UserTodayRequests` is Commons' |
| `mantle.account.InvoiceServices` | `create#ProjectInvoiceItems`, `create#WorkerInvoiceItems`, `cancel#Invoice` (through the invoice detail) | `create#TimeEntryInvoiceItems` and `create#InvoiceBillThroughItems` (inside `create#ProjectInvoiceItems`); `create#ProjectExpenseInvoice` is People's expense capture |
| `mantle.humanres.RateServices` | `create#RateAmount`, `update#RateAmount` | — |
| `mantle.other.BudgetServices` | — | period and GL budgets stay Accounting's (§16) |
| `mantle.ledger.OtherAutoPostServices` | — | `post#WorkEffortCost` is an empty stub; project cost is computed, not posted (§16) |
| `mantle.order.OrderServices` | `create#PurchaseRequestOrder` (a request's items) | — |

## 14. Documents and outputs

| Output | Kind | From screen | Derived from |
| --- | --- | --- | --- |
| Project status report (health, latest update, milestones, work counts, hours and budget) | `html-print` | ProjectDetail | Odoo project update; OpenProject overview |
| Project estimate (the work breakdown to a chosen depth, each line's roll-up hours at the client rates, and the milestones) | `html-print`, email; a file of the Estimate milestone sent for the client's approval | ProjectMoney, MilestoneDetail | Dolibarr proposal from a project; services practice |
| Release notes | wiki page, `CHANGELOG.md` commit, email | ReleaseDetail | Redmine and OpenProject version pages; changelog practice |
| Sprint report (burndown, completed and carried over) | `html-print` | SprintDetail | OpenProject sprint reports |
| Timesheet (a person's week) | `html-print` (as built, P9: `Time/TimesheetPrint`, the entries by day, by project, the flags, signature lines) | TimesheetDetail | ERPNext timesheet print |
| Team timesheet (a crew's time on one piece of work) | `html-print` (as built, P9: `Time/TeamTimesheet`, TimeEntries' Print of its find by day with the hours by person and signatures, no rates) | TimeEntries | `template/work/TeamTimesheet.xsl-fo.ftl` (`get#TeamTimesheetInfo`) |
| Client invoice with its time detail | PDF, email | InvoiceDetail | Accounting's invoice print, with the time entries behind each line appended |
| Work items export | CSV, XLSX (the tree view exports a level column and the parent key) | WorkItems | `FindTask` `TaskList.csv` |
| Progress breakdown | CSV, XLSX, `html-print` at the expanded depth (as built, P9: Expand to level n is a parameter, the list's rows are the tree to that depth) | ProgressReport | `ProjectProgressReport` |
| Time export and the reports | CSV, XLSX, `html-print` | TimeEntries, Reports | Redmine spent-time CSV |
| Work item import (Jira, Redmine, GitHub, generic CSV) | import | WorkItemImport | Commons ContactImport |
| Time import (the Time entries CSV; the Mantle detail CSV); Toggl, Harvest and Clockify presets after the first release | import | TimeEntries | Mantle `import#TimeDetailFile`; those tools' detailed CSV exports |
| Request confirmation, replies and resolution | email | RequestIntake, email intake, RequestDetail | Frappe Helpdesk; Redmine mail handler |
| Notifications: assignment, review requested, CI failed, timesheet returned, missing time, approvals, status updates | notification, email by preference | §15 "Notification topics" | design-drawers-commons §18 |
| Webhook deliveries (push, tag, merge request events) | HTTP POST of JSON with an HMAC-SHA256 signature | RepositorySettings | Gitea and GitLab webhooks |
| Commit statuses from CI | REST in (GitHub's status shape) | CommitDetail, MergeRequestDetail | GitHub commit status API |
| Repository export (a bare repository on the host) | export | RepositorySettings | `export#GitRepository` |

## 15. Framework and data needs

What mr-moqui, Mantle and BOSS must gain for the screens above. Rows that style-guide §8 or design-drawers-commons
§19 already hold keep their names and are not repeated (list views, `status-bar`, `number-card`, `dashboard`,
`container-split`, the wizard panel, `chatter`, `record-files`, `markdown-view`, `m-rich-text`, `m-avatar`, record
cards, generic record links, token routes and the public shell, shell providers and screen context, all built).
Kinds are those of design-doc-guide §8. Entity filters do not apply to `moqui.*` entities, so every framework git
record is read through a service that checks the repository's rights (R21).

### Shell, providers and client access

| Need | Kind | Proposed as | Used by | Stub spec |
| --- | --- | --- | --- | --- |
| Shell providers (Projects) | XML Screen element (exists) + service type | `<shell-providers>` in `Projects.xml` as §1.4: the quick-create kinds, `<today-source>` `get#ProjectTodayItems`, the palette actions, `<palette-source>` `search#Code` with the `!` prefix, the notification topics, the `projects` key scope | Home, QuickCreate, every screen | design-drawers-commons §1.5 |
| Project home and Today services | service type | `mantle.work.ProjectServices.get#ProjectHomeCounts` (the counters of the user's group) and `get#ProjectTodayItems` (the running timer, reviews waiting, a timesheet to submit, requests to triage); each part failure-tolerant. As built: the counts in P2 to P6a, the Today source in P6b (§1.4) | Home, the Today tab | as `get#UserTodayItems` sources |
| Palette and notification links | BOSS service | Commons' palette type mapping (`PaletteServices`, where `MantleProject` has no detail link today) and the notification record links (`CommonsServices`) open a project, work item or request under Projects for a user who has the app, else under Commons | palette, tray, notification center | |
| `m-elapsed` | Vue component | `<m-elapsed :from="…" />`: the time since a timestamp as `h:mm`, ticking each minute | Home's timer strip, WorkItemDetail's timer, the Today panel's timer item | used through `render-mode` in XML screens |
| Git access in Commons | BOSS screen | Commons/Settings/Account gains a Git access link to `Projects/Code/GitAccess` for a user who may open it, and else the `AccessTokens` and `NewAccessToken` forms of GitAccess, included from one form file | GitAccess, Commons Account | design-drawers-commons Account |
| Client access | data model + seed data + shell item | The `BOSS_PROJECT_CLIENT` group and an entity filter set of that name on `WorkEffort` (projects where the user's party or organization holds a client role and client sign-in is on, and their work items with General or All users visibility), `Request` (their organization's in those projects, or filed by them), `Invoice` (to their organization), `TimeEntry` (only on projects that share hours) and `WorkEffortParty` (of those records), reading the client's project and organization ids that `mantle.work.ProjectServices.setup#ClientProjectInfo` puts in the user context from the Projects root's `always-actions` (a filter cannot express a role on the record; impl-projects F2); `get#RecordLinkInfo` gains the same client rule for Chatter, record files and chat; Commons' and Comms' `ALL_USERS` authz becomes `AUTHZT_ALLOW` with an `AUTHZT_DENY` for the client group (check that mr-moqui keeps Java's order, ALWAYS over DENY over ALLOW); the shell leaves out a tray tab, quick-create kind or palette group whose screen the user may not open. As built (impl-projects.md P10a): the Mantle permission `PROJECT_CLIENT` marks a client for the services; `get#ClientProjectInfo` (projects, organizations, contacts, sharing, status updates posted for the client, the parties a client may know of) and `setup#ClientProjectInfo`; `get#VisibleProjectInfo` answers a client its client projects with `itemVisibilityIds`; `CommunicationServices.get#ClientRecordVisibility` is the one client rule of `get#RecordLinkInfo` (work efforts, requests and messages only, no other record type), `get#RecordTimeline` (messages for the client and status changes only), `filter#ClientAudience` (the follower and mention notices) and Chatter's attachments; record files only of a request; the filter set also covers `Party` (the parties a client may know of), `CommunicationEvent` (no Comment; from or to the client's parties, or a status update posted for it), `WorkEffortUpdate`, `WorkEffortSetting` (the settings that decide a client's view only), `Payment`, `OrderPart`, and denies `RateAmount`, `TimeEntry`, `Timesheet`, `WorkEffortAllocation`, `OrderItemWorkEffort`, `WorkEffortBilling`, `WorkEffortInvoice`, `WorkEffortNote`, `RequestNote` and `WorkEffortContent`; the group `BOSS_PROJECTS_INTERNAL` denies the client the internal screens by location (wherever they are mounted), every IronStone write service and the edit forms' searches, and `BOSS_PROJECTS_CLIENT_WRITES` every Mantle record write; `ClientIsolation.spec.js` walks every screen file | the client-visible screens (§1.1) | a spec proves a client user never reads another client's project, an internal note, a rate or a cost through a screen, Chatter, record files, search or the palette |
| Chatter for client users | service type + Vue component | `Shared/Chatter` takes the audience from the app context: for a client user `mantle.party.CommunicationServices.get#RecordTimeline` returns messages and status changes only (no notes, activities, files of notes or other audit rows), and the compose bar offers only Send message, to the record's internal parties. As built (P10a): the timeline and Chatter's data answer a client the messages for it (§1.1) and status changes, no followers, parties or files of a work effort, and no note's attachment; composing is P10b's (a client writes nothing in P10a). As built (P10b): Send message to the record's internal people and Reply to a message or status update for it (`ironstone.client.ClientServices` send# and reply#ChatterMessage); no followers, notes, activities, Email…, unlink, Inbox thread or chat room links; the terminal twin offers Message to the team | ProjectOverview, WorkItemDetail, RequestDetail | design-drawers-commons §15 |
| Project visibility in finds | service type | `mantle.work.ProjectServices.get#VisibleProjectInfo`: the projects the user holds a current role on and the organizations whose All users and General projects they see, as a condition every Projects find and list service applies (no entity filter covers `WorkEffort`, `Request` or `TimeEntry`; impl-projects F1); a Restricted or Confidential item only for its parties and the project's managers | every list of work efforts, requests and time | a spec proves a Work group project stays out of a non-member's lists, counts, search and palette |
| User groups and SSH access | seed data | `BOSS_PROJECT_TEAM`, `BOSS_PROJECT_MANAGER`, `BOSS_PROJECT_CLIENT` with their `BOSS_PROJECTS` authz; `UserGroupPermission` `SSH_GIT` for the team and manager groups | §1.1, GitAccess | `SSH_GIT` cannot be granted to `ALL_USERS` |

### Lists, views and components

| Need | Kind | Proposed as | Used by | Stub spec |
| --- | --- | --- | --- | --- |
| `view-board` group fields | XML Form element | `view-board` `group-fields` (a comma list, the first the default) offered as a Group by choice in the board's toolbar; a move posts the field's name and the new value to the transition | WorkItems, Projects, Requests | `group-field` stays for a board of one grouping |
| `view-board` all rows | XML Form element | `view-board` `all-rows="true"`: while the board shows, it asks the form request for the find without paging, up to `max-rows` (500 by default), as `view-calendar`'s `range-find` does | WorkItems (a sprint's board), Requests | impl-drawers-commons §8 "Decided" on range-find |
| `view-timeline` | XML Form element | later: `view-timeline` with start, end, title, group and dependency fields; until then the Timeline `.qvue` | Timeline | style-guide §8 "List views" |
| `code-view` | XML Screen element + Vue component | `<code-view text language line-numbers highlight-lines/>` rendering `m-code`: highlight.js (BSD-3-Clause) through `libs/refresh.mjs` with its manifest and License-Review rows, for Java, Groovy, XML, JavaScript, TypeScript, Rust, Kotlin, Python, SQL, YAML, JSON, Markdown, CSS, HTML and shell; `pre` in the html and tui modes | RepositoryFiles | style-guide §8.1 checklist |
| `.qvue` TUI texts | render mode | Backlog, Timeline, MyTime, TeamPlanner, MergeRequestChanges and RequestIntake are browser-only first; each gets its `tui` text later (style-guide §4.8), MyTime first, since people log time from a terminal. As built: each `.qvue` screen's twin is a hidden plain-XML screen in a dynamic container (P4a to P7 read only); P11 gave MyTime's (the timer, Log time, an entry's Edit and Delete, Submit, Approve, Return, Reopen), Backlog's, Timeline's, TeamPlanner's (Move and Decide) and MergeRequestChanges' (the diff, line comments) their changes, and the Docs tab its project mode; the project Calendar's stays read only, RequestIntake is a public page with a short text | those screens | the lint's TUI worklist |
| Print documents | render mode | `html-print` templates for the project status report, the project estimate, the sprint report, a timesheet, the team timesheet and release notes | §14 | style-guide §8 "Print documents" |
| `view-tree` | XML Form element | A form-list view beside `view-board` and `view-calendar`: `<view-tree parent-field="parentWorkEffortId" children-transition="…" rollup-fields="…" ancestor-transition="…"/>`: rows indented under their parents with expand and collapse, children fetched on open through the transition (with the list's find), the ancestors a find leaves out fetched and shown muted, expand to level n and all, the `rollup-fields` shown for a parent row beside its own, drag to reorder (posting the new previous sibling) or re-parent (posting the new parent), Tab and Shift+Tab to indent and outdent, editable fields as the list's; in the html mode a nested table and in the tui mode an indented outline with `+` and `-` markers | WorkItems (`WorkItemTree`), WorkItemDetail (`SubItems`), ProgressReport (`TopLevelStats`), Timeline's grid | style-guide §3.15 (look and behavior) and §8 "List views"; the `tree` element (`m-tree-top`) is a single-column tree, not a list |
| List grouping | XML Form element | later: `form-list` `group-by` with group header rows, counts and sums | WorkItems, TimeEntries | Redmine and OpenProject grouping |
| Peek pane | XML Form element + XML Screen element | `form-list` `peek-url` (a transition to the row's detail screen with its id): a Peek toggle by the view switch that wraps the list in a `container-split` with the side on the right (`side="right"`, a resizable width, 55% by default), loading the row's screen with `peek=true` so it renders compact; the selected id in the URL; up and down move the selection; off below 1280 px | WorkItems (ProjectWorkItems), WorkItemDetail | style-guide §3.8; OpenProject split view |
| Board WIP limits | XML Form element + data model | later: a per-project limit per status column, shown in the column header and in warning when passed | WorkItems board, SprintDetail | |
| Timeline baselines | service type + data model | later: a snapshot of a project's start and due dates, drawn as thin bars under the current ones | Timeline | OpenProject baseline comparison |

### Git hosting (framework)

| Need | Kind | Proposed as | Used by | Stub spec |
| --- | --- | --- | --- | --- |
| Repository list with access | service type | `org.moqui.impl.GitServices.find#GitRepositories` (the repositories the user may view by the `AT_GIT_REPOSITORY` check, with kind, branch, last change, paged) and `find#GitUpdates` (a repository's push log with its refs, for its viewers) | Repositories, RepositoryActivity, ProjectCode, palette | |
| Git tree | service type | `get#GitTree(repositoryId, revision, path)`: the entries (name, type, size, object id, LFS pointer) with each one's last commit from the branch's path index | RepositoryFiles | the browse functions have no tree listing |
| Git refs | service type | `create#GitRef(repositoryId, refName, revision, message)` (a branch, or a tag, annotated when a message is given) and `delete#GitRef`, with the create and delete rights, the branch rules, and the gitECA events of source `write` so Mantle's links follow | RepositoryBranches, RepositoryTags, ReleaseDetail, `create#TaskBranch` | |
| Compare | service type | `get#GitCompare(repositoryId, base, head, withDiffs)`: the merge base, the commits in head and not in base, ahead and behind, the files with stats, and each file's diff as the `moqui-diff` html and as hunks of numbered lines for review | Compare, MergeRequestDetail, MergeRequestChanges, RepositoryBranches, WorkItemDetail | the `hunks` of `getVersionDiff` |
| Merge | service type | gix's `merge` feature on; `merge#GitRefs(repositoryId, source, target, method, message)`: first a fast-forward or a merge commit by the user, then squash (one commit of the source's changes with the message given, its author the merge request's) and rebase (the source's commits replayed on the target, committed by the user), each refused on a conflict; a trial merge gives the mergeability and the conflicting paths; the branch rules and the gitECA events run as for a push, and a squashed or rebased merge links the new commits to the source's work items | MergeRequestDetail | merge commit and fast-forward first |
| Repository archive | data model + service type | `GitRepository.archivedDate` and `defaultMergeMethodEnumId` (`GmmMerge`, `GmmSquash`; with `GmmFastForward` and `GmmRebase` the values of `GitMergeRequest.mergeMethodEnumId`); `archive#GitRepository` and `unarchive#GitRepository` with the delete right: an archived repository refuses pushes, ref writes and merges in the git server, its open merge requests close, and `find#GitRepositories` leaves it out unless asked | Repositories, RepositorySettings, palette | GitHub archive |
| Commit statuses | data model + service type | `moqui.resource.GitCommitStatus` {repositoryId, commitId, context, state (pending, success, failure, error), targetUrl, description, createdByUserId, createdDate}; `org.moqui.impl.GitServices.create#GitCommitStatus`, `get#GitCommitStatuses`; REST `POST /rest/s1/moqui/git/{repositoryId}/commits/{commitId}/statuses` with an access token and the push right, GitHub's status shape | CommitDetail, MergeRequestDetail, RepositoryCommits, WorkItemDetail | outside CI posts to it unchanged |
| Webhooks | data model + service type | `moqui.resource.GitWebhook` {webhookId, repositoryId, url, secret (encrypted), events, active}; a delivery is a SystemMessage per event (push, tag, merge request) with an HMAC-SHA256 signature header, retries and a delivery log; `store#GitWebhook`, `test#GitWebhook`, `find#GitWebhookDeliveries`; sent by a framework post-receive rule | RepositorySettings | starts Woodpecker, Jenkins, Drone or a runner relay |
| Branch rules | data model + service type | `moqui.resource.GitBranchRule` {repositoryId, refPattern, allowForcePush, allowDelete, requireMergeRequest, requiredApprovals, dismissStaleApprovals (a new head of the source sets its approvals back to requested), requiredStatusContexts, allowedMergeMethods, pushUserGroupId}, enforced by the git server before a pushed ref moves (built in, so no component can skip it); writes through Moqui by users with the update right (wiki saves, release notes) pass and are logged; `store#GitBranchRule`, `delete#GitBranchRule` | RepositorySettings, MergeRequestDetail | |
| Repository settings service | service type | `update#GitRepository` (description, default branch, default merge method) with the delete right | RepositorySettings | the tools screen edits rows directly |

### Code review (framework and Mantle)

| Need | Kind | Proposed as | Used by | Stub spec |
| --- | --- | --- | --- | --- |
| Code review store | data model + service type | Framework `moqui.resource.GitMergeRequest` {mergeRequestId, repositoryId, mergeRequestNum (per repository from 1), title, description, sourceRef, targetRef, statusId (`GmrDraft`, `GmrOpen`, `GmrMerged`, `GmrClosed`, with a flow), authorUserId, createdDate, lastUpdatedDate, headCommitId, baseCommitId, mergeableEnumId, conflictPaths, mergeMethodEnumId, deleteSourceBranch, mergedDate, mergedByUserId, mergeCommitId, closedDate} and `GitMergeRequestReviewer` {mergeRequestId, userId, statusId (`GmrrRequested`, `GmrrApproved`, `GmrrChangesRequested`, `GmrrCommented`), reviewedCommitId, reviewedDate}; `org.moqui.impl.GitReviewServices` `create#MergeRequest`, `update#MergeRequest`, `set#MergeRequestReviewers`, `submit#MergeRequestReview`, `close#MergeRequest`, `reopen#MergeRequest`, `merge#MergeRequest`, `find#MergeRequests`, `get#MergeRequestDiff`, and `refresh#MergeRequests` (a framework rule on ref-update: a source's new head, mergeability again, merged when the target holds the head). As built (impl-projects.md P11, F132): only a user who may push (update on the repository) approves, a viewer comments or requests changes, and the approvals counted toward a branch rule are those of users who may push now, each decided as its reviewer (`get#MergeRequestApprovals`, the same count `merge#MergeRequest` makes) | MergeRequests, MergeRequestDetail, MergeRequestChanges, Compare, Home | Mantle-free, as `WikiPageReview` is |
| Merge request links | data model + service type | Mantle `mantle.work.effort.WorkEffortGitMergeRequest` {workEffortId, mergeRequestId, repositoryId, linkSourceEnumId (`WglsMergeRequestBranch`, `WglsMergeRequestText`, `WglsExplicit`), completeOnMerge, linkedByUserId, linkedDate}; `mantle.work.GitServices.link#MergeRequestItems` (the source branch's item and the keys in the title and description, by `find#TaskReferences`; completeOnMerge from a `Closes` keyword, the NewMergeRequest choice, else the project's `WstMergeRequestMoves`; a text key taken out drops its link), `move#MergeRequestItemsToReview` (opened or ready, with `WstMergeRequestMoves`), `complete#MergeRequestItems` (merged: the completeOnMerge items, where their flow allows), `add#`, `remove#MergeRequestItem` and `get#MergeRequestItems` (for MergeRequestDetail), dispatched by `handle#MergeRequestEvent` from the SECAs of `WorkGit.secas.xml` on the framework's `queue#MergeRequestEvent`, `merge#MergeRequest` and `set#MergeRequestReviewers` (merge request events are not git events, so not gitECA rules; impl-projects.md P3b) | WorkItemDetail, ReleaseDetail, MergeRequestDetail | |
| Review anchors | data model + service type | Mantle `mantle.party.communication.CommunicationEventGitAnchor` {communicationEventId, mergeRequestId, repositoryId, commitId, path, oldLine, newLine, lineText, outdated}, the comment a `Comment` linked to the merge request by `CommunicationEventRecord`; `mantle.work.GitServices.create#ReviewComment` (a line comment or a reply, telling the author and reviewers), `store#ReviewAnchor`, `resolve#ReviewThread` (the first comment to `CeResolved` and back to `CeSent` by a direct change, as the Default flow has neither move from a sent comment), `get#ReviewThreads`, `refresh#ReviewAnchors` (outdated on a new head that changed the line); `get#RecordLinkInfo` knows `moqui.resource.GitMergeRequest` and `GitRepository` (visible to whoever may view the repository) | MergeRequestChanges, Chatter on a merge request | |
| Code in the palette | service type | `mantle.work.GitServices.search#Code(text, limit)`: repositories and merge requests the user may view, as results (Mantle has no screen links); BOSS's `ironstone.projects.CodeServices.search#CodePalette` makes them palette rows | palette | |
| Repository access by role | service type | `check#GitRepositoryAuthz` gives the delete right to the project's leads (`ProjectManager`, `Manager`, `ProgrammerLead`, `SysArchitect`) and only view, when the project shares its repositories, to its client contacts (`Customer`, `CustomerBillTo`, `ClientManager`, `ClientBilling`); the framework decides `AT_GIT_REPOSITORY` by the repository's own records, not an app root's inheritable grant (impl-projects.md F23) | §7 | was: every active party got view, create and update |
| Task branches | service type | `mantle.work.GitServices.create#TaskBranch(workEffortId, repositoryId, fromRef, branchName)`: the name from the project's pattern (`get#TaskBranchName`: `<id>`, `<KEY>`, `<key>`, `<n>`, `<words>`, `<type>`; `<id>-<words>` by default), `create#GitRef`, the link | WorkItemDetail | |
| Release tags by version | service type | `link#RefByName` also links a tag named as a release's version, or `v` and the version, in the projects linked to the repository | ReleaseDetail | |

### Work model (Mantle and BOSS)

| Need | Kind | Proposed as | Used by | Stub spec |
| --- | --- | --- | --- | --- |
| Shared work item and request detail | BOSS screens | `Shared/WorkItemDetail.xml` and `Shared/RequestDetail.xml`, made from the Commons M6 screens and their `ironstone.commons.TaskServices` and `RequestServices`, with the app context (tabs, fields, actions) set by the including app; Commons mounts them at its present paths | WorkItemDetail, RequestDetail, Commons | design-doc-guide §10 |
| Sprints | data model + service type + seed data | `WorkEffortType` `WetSprint` and `WorkEffortAssocType` `WeatSprint` (sprint to item; a carry-over ends one membership and starts the next); `mantle.work.ProjectServices.create#Sprint`, `update#Sprint`, `get#SprintDefaults`, `start#Sprint`, `complete#Sprint`; `mantle.work.TaskServices.set#TaskSprint` as `set#TaskMilestone`. As built (P4a): id `<KEY>-SP-<n>`; In Planning, In Progress, Complete; the goal is the description; the capacity is `estimatedPoints` in a points project, `totalTimeAllowed` in an hours one; done is Complete or Closed (a cancelled item is neither done nor carried); a carried item's membership ends at the sprint's `actualCompletionDate`; a change in a sprint in progress writes an `EntityAuditLog` row (`WorkEffortAssoc`, `pkPrimaryValue` the sprint, `pkSecondaryValue` the item, `fromDate` added or `thruDate` removed) with the user | Backlog, SprintDetail, WorkItems, QuickCreate | |
| Releases and components | service type | `create#Release`, `create#Component` as `create#Milestone` (ids `<KEY>-REL-<n>`, `<KEY>-CMP-<n>`, milestones `<KEY>-MS-<n>`); `set#TaskRelease`, `set#TaskComponent` as `set#TaskMilestone`. As built (P4b): `get#PlanItemDefaults` and `create#PlanItem` under the three (an id given is refused when taken; a release's version is its own in the project); `create#Milestone` takes no id or a description now; `update#Milestone` takes the description and `clearFields`, checks the version and the dates, and sets `actualCompletionDate` on Complete or Closed; `get#PlanItemSummary` (items by state, hours, points, of milestones, releases, sprints and components) | Roadmap, ReleaseDetail, ProjectSettings, WorkItemDetail | the types and assoc types exist |
| Rank | data model + service type | `WorkEffort.sequenceNum` (number-integer, gaps of 1000); `set#TaskRank(workEffortId, previousSiblingId)`, renumbering a run when a gap closes; in the tree a rank orders the children of one parent. As built (P4a): the Backlog's `set#TaskBacklogRank(workEffortId, previousWorkEffortId or nextWorkEffortId)` treats the ranks as one order over the project's items at every depth, renumbering the whole project when a gap closes, so the tree's order of siblings is that order narrowed to them | Backlog, the tree, sub-items, board card order | |
| Work item tree | service type | `mantle.work.ProjectServices.get#WorkItemTree(find parameters, parentWorkEffortId or top, withAncestors)`: one level of the tree in rank order with each row's roll-up (its subtree's estimate, remaining, actual, budget, item and done counts, cancelled left out, as `get#WorkEffortChildStats` sums), a has-children flag, and for a find the ancestors of the matches so each sits in its place; `mantle.work.TaskServices.move#Task(workEffortId, parentWorkEffortId, previousSiblingId)`: the parent in the same project, refused when it is the item or one of its descendants, the rank set among the new siblings, the change in the audit log; `update#Task` with a new `rootWorkEffortId` moves the subtree and refuses a parent left in another project | WorkItems, WorkItemDetail, Backlog's epic filter, Timeline, ProjectOverview | `get#WorkEffortChildStats` reads one level of children per call today |
| Story points | data model | `WorkEffort.estimatedPoints` (number-decimal); a sprint's capacity in the project's unit | WorkItemDetail, Backlog, SprintReport | |
| Dependency lag | data model + service type | `WorkEffortAssoc.lagDays` (number-decimal, working days) on `WeatDependsOn`, whose direction is fixed: `workEffortId` depends on `toWorkEffortId`. As built (P4c): `mantle.work.TaskServices.add#TaskDependency` (a loop, an ancestor or descendant, a negative lag refused; one already there takes the new lag) and `remove#TaskDependency`; `set#TaskDates` (start and due days, or `shiftDays`; `moveSubtree`; `autoSchedule` moves the dependents later by business days, keeping their length, through `get#FutureBusinessDay` with the project's organization's holidays) | Timeline, WorkItemDetail | |
| Development status flow | seed data | `StatusItem`s `WeInReview` (sequence 6) and `WeInTesting` (7) of type `WorkEffort`; `StatusFlow` `WorkEffortDevelopment` with Approved, In Progress, In Review, In Testing, Complete and Closed and the moves back; `complete#TaskFromCommit` and `ironstone.commons.TaskServices.set#TaskStatus` accept it | WorkItems, WorkItemDetail, Backlog | |
| Labels | data model + seed data | `WorkEffortCategory.categoryTypeEnumId` (new `WorkEffortCategoryType`: `WcatLabel`, `WcatHoliday`) and `colorName` (a brand color name); the holiday categories take `WcatHoliday` | WorkItems, Labels, WorkItemDetail | |
| Project health | data model + service type + seed data | `WorkEffort.healthEnumId` (new `WorkEffortHealth`: `WehOnTrack`, `WehAtRisk`, `WehOffTrack`); `mantle.work.effort.WorkEffortUpdate` {workEffortId, communicationEventId, updateDate, healthEnumId, percentComplete, clientVisible}; `CommunicationEventType` `StatusUpdate`; `post#ProjectUpdate`; topic `ProjectStatusUpdate` | ProjectOverview, Projects, Home, PortfolioReport | |
| Project settings | data model + service type | `mantle.work.effort.WorkEffortSetting` {workEffortId, settingTypeEnumId, settingValue} with `WorkEffortSettingType` (`WstModules`, `WstEstimateUnit`, `WstWorkItemTypes`, `WstSeveralSprints`, `WstShareNewItems`, `WstKeywordComplete`, `WstRequestFromWork`, `WstIntakeAccount`, `WstIntakePlusTag`, `WstIntakeToken`, `WstTriageParty`, `WstBranchPattern`, `WstMergeRequestMoves`, `WstBillingBasis`, `WstInvoiceGrouping`, `WstShareHours`, `WstClientSignIn`, `WstShareRepositories`, `WstDocsWikiSpace`, `WstApprovalRequired`, `WstApproverParty`); `store#ProjectSetting`, `mantle.work.ProjectServices.get#ProjectSettings` (the project's, else the organization's `PartySetting`) | ProjectSettings, NewProject, every screen that reads a module | as `PartySetting` and `ProductStoreSetting` |
| App settings | seed data | `PartySettingType`s `ProjWorkItemTypes`, `ProjTimesheetPolicy`, `ProjBillingDefaults`, `ProjRepositoryDefaults`, `ProjConventions`, `ProjIntake`, `ProjPublicForm` | the Settings pages | |
| Template flag | data model | `WorkEffort.isTemplate` (text-indicator): left out of every list, count, report and search but Templates and NewProject's choice; `clone#Project` clears it on the copy unless asked to make a template, copies the base's `WorkEffortSetting` rows (not `WstIntakeToken` or `WstDocsWikiSpace`), and links a project made from a template to it by `WorkEffortAssoc` `WeatBasedOn`, which Templates counts as its uses; `create#ProjectTemplate`, `get#ProjectTemplates` | Templates, NewProject, Projects | |
| Work item keys from 1 | service type | `create#Project` and `clone#Project` start the project's sequence (`Project_<KEY>`) at 1 with a bank of 1, so new projects number `PROJ-1`, `PROJ-2` without gaps; existing projects keep theirs | every screen | today the numbers start at 100000 in banks of 10 |
| Client project purpose | seed data | `Enumeration` `WepPrClient` ("Client Project") under `WetProject` | NewProject, ProjectSettings | |
| Milestone approval | service type + seed data | `request#MilestoneApproval`, `approve#MilestoneApproval`, `refuse#MilestoneApproval` (the requirement and the approver in the milestone's `WorkEffortSetting`); topic `MilestoneApproval` naming the two decision services; `mantle.work.ProjectServices.send#EstimateForApproval` (the estimate's `html-print` saved as a `WorkEffortContent` file of the project's Estimate milestone, made first when missing with its gate and the client approver, then `request#MilestoneApproval`). As built (P8b): the requests are `mantle.work.effort.WorkEffortApproval` (Requested, Approved, Refused, Cancelled; `recordedFor` when a manager records the approver's decision); `get#MilestoneApprovalAccess`, `store#MilestoneGate`, `cancel#MilestoneApproval`; the approval reaches the milestone (`update#Milestone` refuses it before); permission `MILESTONE_APPROVE`; topics `MilestoneApproval` (decision services `approve#`, `refuse#MilestoneApprovalNotice`) and `MilestoneDecision`; the Estimate milestone is the project's `WstEstimateMilestone`, the file content type `WectEstimate`; its approval moves the project from In Planning to Approved and its open or proposed orders to Approved | MilestoneDetail, ProjectMoney, the tray's Approvals | |
| Recurring work items | data model + service type | `WorkEffortRecurrence` (built for Calendar) gains `recurFromCompletion` (text-indicator: count the next dates from the completion day rather than the due date); `mantle.work.TaskServices.set#TaskRecurrence(workEffortId, rrule, recurFromCompletion)` (an empty rule stops it) and `make#NextRecurringTask`, a SECA on the task's move to Complete, or to Cancelled when skipped: the copy of §5, start and due from the rule through the ICalendar tool's expansion, linked from the series by `WeatRecurrenceInstance` with its date; nothing is made past the rule's end | WorkItemDetail, WorkItems, Commons TaskDetail | Odoo recurring tasks |
| Release notes | service type | `generate#ReleaseNotes` (markdown of the release's items by type with their keys, and its merged merge requests) and `publish#ReleaseNotes` (a page of the project's docs space, a `CHANGELOG.md` commit through `commit#GitFiles`, an email to its followers). As built (P4b): the draft has the release's description, its done items as Features, Fixes and Other, and its merged merge requests of repositories the user may view (the open items are counted, not listed); `store#` and `get#ReleaseNotes` keep them as a `WorkEffortContent` `WectReleaseNotes`; `publish#ReleaseNotes` goes each way on its own (a failure is a warning naming it): the page `Releases/<version>` (Releases made when missing), the version's section at the top of `CHANGELOG.md` (replaced when there), and the topic `ReleasePublished` to the followers of the release and the project; `release#Release` completes it (unfinished items to the next open release or none, a tag, the notes) | ReleaseDetail | |
| Project activity | service type | `mantle.work.ProjectServices.get#ProjectActivity`: the status changes (audit log), comments, commits and merges of the project's items, newest first, paged | ProjectOverview, Home | |
| Time in Chatter | service type | `get#RecordTimeline` gains a time-entry source for a work item (who logged how long, with the comment). As built (P6b): `mantle.work.TimeServices.get#TimeEntryTimeline`, registered as a `RecordTimelineSource` `ServiceRegister` (`TimeEntryTimeline`, Mantle seed): entries of kind `time` (the hours and work type as the title, the comment as the body, no rates, a running timer left out), shown in every list but a filtered one; Chatter labels them Time logged | WorkItemDetail | design-drawers-commons §15, Projects' row |
| Calendar project filter | service type | `mantle.work.EventServices.get#FullCalendarData` takes `rootWorkEffortId`: the project's events (by `WorkEffortRecord`), milestones, releases and sprints. As built (P4c): only the linked events, all of them for a current party of the project (or ADMIN), else those the user owns or is on; the milestones, releases, sprints and work items are read by the caller (`ironstone.projects.PlanningServices.get#ProjectCalendarEvents`) | ProjectCalendar | |
| Timeline data | service type | `mantle.work.ProjectServices.get#TimelineData`: the find's items with start, due, progress, plan items and dependencies, and for each parent its subtree's span and roll-up progress; business days through `get#FutureBusinessDay`. As built (P4c): `workEffortIds` with their ancestors (`get#WorkItemTree`, so only items the user sees), `spanStartDay` and `spanDueDay` (cancelled items aside), progress 100 when done, else the roll-up's estimate less remaining, else the done of the sub-items; the dependencies between them with `violated`; the projects' milestones, releases and sprints with their progress (`get#PlanItemSummary`) | Timeline | |
| Work item import services | service type | `mantle.work.WorkItemImportServices` `parse#WorkItemFile`, `preview#WorkItems`, `import#WorkItems` (a job with progress on a topic; the original key in `sourceReferenceId`; Jira, Redmine and GitHub CSV presets). As built (P4c): also `read#WorkItemRows` (the CSV and the mapping, a script) and `plan#WorkItemRows` (what each row does in the project); `import#WorkItems` makes the missing plan items and labels, then each row in its own transaction (`import#WorkItemRow`), then the parents (`move#Task`), then completes the past sprints it made; the BOSS step runs it as a job past 100 rows | WorkItemImport | as `ContactImportServices` |
| Wiki space in a repository | service type | `create#WikiSpace` with `rootPageDirectory` `git://<repositoryId>/docs` in a code repository: check that a space rooted in a subdirectory works and that its saves (commits by the user on the default branch) pass the branch rules as writes. Checked (P4b, impl-projects.md F7): it works with no framework change (a moqui-core test, Revision-Management "Wiki spaces on git"); the home page is `docs/<SPACE>.md` and the pages under `docs/<SPACE>/`; `mantle.work.ProjectServices.create#ProjectDocsSpace` makes it (members, visibility, users following the project's members) | ProjectDocs, NewProject | Revision-Management "Wiki spaces on git" |

### Time, capacity and money (Mantle)

| Need | Kind | Proposed as | Used by | Stub spec |
| --- | --- | --- | --- | --- |
| Timesheet services | service type + seed data | `mantle.work.TimesheetServices` (built in impl-projects.md P6a): `get#TimesheetPolicy` and `store#TimesheetPolicy`, `get#WeekRange`, `get#WeekDays` (the policy's working hours less the organization's holidays), `get#PartyWeek` (the week's rows by item and day, totals, working hours, timesheet and access), `get#PartyTimesheet` (find or make a person's timesheet for a week; `store#TimeEntry` and `create#TimeEntryClockIn` set `timesheetId` through `TimeServices.check#TimeEntryTimesheet`), `get#TimesheetApprovers`, `get#TimesheetAccess`, `submit#Timesheet` (the person only), `approve#Timesheet`, `return#Timesheet`, `reopen#Timesheet`, `get#TimesheetSummary` (totals and flags), `find#Timesheets` (the lists and their counts), `get#TimeKeepers`, `send#MissingTimeReminders` (the hourly job `send_MissingTimeReminders` sends on each policy's day and hour, once a week each), and the timer `get#`, `start#`, `stop#` (under a minute discarded), `update#Timer`; transitions `TmshCompleted` to `TmshInProcess` (Return) and `TmshApproved` to `TmshInProcess` (Reopen); `store#TimeEntry` and `delete#TimeEntry` refuse an entry on a submitted or approved timesheet; permission `TIMESHEET_APPROVE`; topics `TimesheetApproval` (with the approve and return services), `TimesheetReturned`, `TimesheetApproved`, `TimesheetMissing`; `get#RecordLinkInfo` shows a timesheet to its person and approvers | MyTime, Timesheets, TimesheetDetail, TimeEntries | People uses the same |
| Time import | service type | `mantle.work.TimeServices.import#TimeEntryCsv(file, preview)`: the Time entries CSV of §8 (date, person, work item or project key, hours or start and end, work type, billable, comment), people by email or user name, each row through `store#TimeEntry` on its own with the failures by row; a preview returns the first rows and their problems. As built (P6b): the file as an upload, text or a location; `partyId` the person of rows with none; counts of create, skip and fail; `progressUserId` for a job's progress; see §8 ImportTime | TimeEntries | Toggl, Harvest and Clockify presets after the first release |
| Work types | seed data | `Enumeration`s of `WorkType` for services work: `WktpDevelopment`, `WktpDesign`, `WktpTesting`, `WktpMeeting`, `WktpSupport`, `WktpProjectMgmt`, `WktpConsulting`, `WktpTravel`. As built (P6b): the organization's choice in PartySetting `ProjWorkTypes` (§12 TimeSettings) | the time forms, rates | the seeded types are labor and office |
| Capacity | service type | `mantle.work.ResourceServices.get#PartyCapacity(partyId, fromDate, thruDate)`: weekly working hours from `WetAvailable` (else the organization's default week) less `WetTimeOff` and `WepHoliday`, by week. As built (P7): `partyIdList`, days with their base, holiday, leave and capacity and the weeks' sums; the default week is the timesheet policy's `dh` and `wd`; `TimesheetServices.get#WeekDays(partyId)` reads it; `get#AllocationWeeks` spreads an allocation over a capacity's days | TeamPlanner, PersonDetail, MyTime, UtilizationReport | People's schedule record replaces the source later |
| Allocations | data model + service type + seed data | `mantle.work.effort.WorkEffortAllocation` {workEffortAllocationId, workEffortId, partyId (empty for a placeholder), emplPositionClassId, skillTypeEnumId, fromDate, thruDate, hoursPerWeek, statusId (`WealRequested`, `WealAllocated`, `WealRejected`, `WealCancelled`, with a flow), requestedByUserId, reviewedByUserId, comments}; `create#Allocation`, `update#Allocation`, `staff#Allocation`, `approve#Allocation`, `reject#Allocation`, `find#StaffingCandidates`, `get#TeamPlan`; topics `AllocationRequest` (approval) and `AllocationDecision`. As built (P7): also `rootWorkEffortId` (the project), `roleTypeId` (the project role a placeholder fills), `allocationPercent`, `requestedDate`, `reviewedDate` and `reviewComments` (a rejection's reason); `fromDate` and `thruDate` are days; `cancel#Allocation`, `find#Allocations` (the lists and counts), `get#AllocationAccess`; permission `ALLOCATION_APPROVE`; `get#TeamPlan` gives each week's capacity, allocated, requested, assigned and logged hours, the load and the utilization, which `get#Utilization` (P9) can build on | TeamPlanner, Allocations, ProjectTeam, NewProject | answers the research's question (§16) |
| Milestone billing share | data model + service type | `OrderItemWorkEffort.invoicePercent` (number-decimal); `mantle.account.InvoiceServices.create#MilestoneInvoiceItems(workEffortId, invoiceId)`: an item per linked order line for its share once the milestone is complete, recorded in `WorkEffortBilling` with the percentage. As built (P8b): also `invoiceAmount` (a fixed share); `store#MilestoneShare` (the shares of a line at most its total), `get#MilestoneBilling` (shares billed, due or waiting, and the lines), `link#ProjectOrderItem`; a share is due when its milestone is Complete or Closed and its gate approved; the item takes the line's sales item type (else `ItemServiceProduct`) and product, and `OrderItemBilling` records the part of the line's quantity; `delete#InvoiceItem` deletes the `WorkEffortBilling` and a cancelled invoice zeroes it, so the share is due again | MilestoneDetail, ProjectMoney, Unbilled | |
| Billing services | service type | `mantle.work.ProjectServices.get#UnbilledSummary` (by project, and with `RaprVendor` by worker: unbilled hours and amounts, expenses, reached milestones, open drafts); the time detail appended to a client invoice's print. As built (P8a): `get#UnbilledSummary` by project for those who manage money (billable time not invoiced, the approved part ready, what waits, entries without a rate, expenses not billed through, the last invoice and the drafts; BigDecimal amounts rounded per entry as an invoice of a line per entry totals them; by client for the chart); `mantle.account.InvoiceServices` `create#ProjectInvoiceItems` and `create#TimeEntryInvoiceItems` take `timeEntryIdList`, `approvedOnly` and `billableOnly` (and the first `includeExpenses`, `settlementTermId`), lock the entries for update and link the project by `WorkEffortInvoice`; `get#InvoiceTimeDetail` (the time behind an invoice's lines); `delete#InvoiceItem` frees the line's time as `cancel#Invoice` frees an invoice's; `get#ProjectHomeCounts` fills `unbilledAmount`. As built (P8b): `get#UnbilledSummary` adds each project's milestone shares due (and lists a project with only those); `get#ProjectMoneySummary` (caps against actuals, invoices, expenses, order lines, shares); `get#ProjectEstimate`. The worker (`RaprVendor`) summary is later | Unbilled, ProjectMoney, Home | |
| Reports services | service type | `mantle.work.ProjectReportServices`: `get#TimeReport`, `get#WorkItemSummary`, `get#SprintBurndown` (from the `WeatSprint` dates and the audit log of `remainingWorkTime`, `estimatedWorkTime`, `estimatedPoints` and `statusId`; built in P4a with the committed, added, removed, completed, carried-over and remaining sizes, days left, the scope changes and each item's outcome; an hours project sizes items by their estimate and burns down their remaining hours), `get#SprintVelocity` (P4a), `get#PortfolioStatus`, `get#ProjectProfitability`, `get#Utilization`, with the measures of §11. As built (P9): also `get#ReportScope` (the projects, time and money the user may read), `get#ProgressBreakdown` (the milestones and the item tree to a depth over `get#WorkEffortChildStats`, no money without the right); `get#TimeReport` (criteria and periods, value at the client rates for money holders), `get#WorkItemSummary`, `get#PortfolioStatus`, `get#ProjectProfitability` (money holders only) and `get#Utilization` (over `get#TeamPlan`); `get#ProjectStats`' danger of actual and remaining past the estimate only when there is an estimate (impl-projects.md F70) | Reports, SprintDetail, Home | |

### Requests and intake (Mantle and BOSS)

| Need | Kind | Proposed as | Used by | Stub spec |
| --- | --- | --- | --- | --- |
| Request conversion and status from work | service type | `mantle.request.RequestServices.convert#RequestToProject` (sets `rootWorkEffortId`, In Progress) and `complete#RequestFromWork` (a SECA on `update#Task`: the first linked item started moves the request to In Progress, the last completed to Completed with `RrFixed` or `RrCompleted`, when the project says so) | RequestDetail | |
| Email intake | framework hook + Mantle service + seed data | the Comms rule actions `createRequest` and `createWorkItem` (Remaining-Work: "the createTask and createRequest rule actions are for an app"), through a framework hook `run#EmailRules` does not have yet: an action it does not know runs the service an app names for it (an `EmailRuleAction` enumeration whose `optionValue` is the service; impl-projects F6): a request in the project the rule or the plus tag names, the message linked by `RequestEmailMessage` and `RequestCommEvent`, the sender as the requester (a contact made in the organization's book when unknown); a reply to the request's mail threads into its conversation; the confirmation email. As built (P5): the framework runs the service an `EmailRuleAction` enumeration names (enumCode the action, optionValue the service) with emailMessageId, emailAccountId, emailRuleId, ruleOwnerUserId and the value, authorization off, in a transaction of its own; Mantle seeds `createRequest` (`RequestServices.create#RequestFromEmail`) and `createWorkItem` (`create#WorkItemFromEmail`). A project is taken only when its intake account is the message's or the rule's owner is on it; a reply (In-Reply-To, References, thread) joins its request; the message is the request's `RequestEmailMessage` and its Email `CommunicationEvent` by `RequestCommEvent`; files copied as `RequestContent`. The intake address of a project is its `WstIntakeAccount` and `WstIntakePlusTag` and the rule written by the manager, who must manage the account | IntakeSettings, ProjectSettings | Odoo alias, Redmine mail handler |
| Public request form | BOSS screen + service type | the `r` token route in `MoquiConf.xml`; `mantle.request.RequestServices.check#IntakeToken` (the route's token service), `create#IntakeToken`, `create#IntakeRequest` (through `create#ContactRequestReCaptcha` with a CAPTCHA configured, else `create#ContactRequest`; files as `RequestContent`; the confirmation) | RequestIntake, ProjectSettings | the public shell (design-drawers-commons R16) |
| Intake settings | seed data | the organization's intake `PartySetting`s and the request types Projects triages | Requests, IntakeSettings | |
| Request visibility | Mantle service | As built (P5): `get#RecordLinkInfo` sees a request of a project the user sees (`get#VisibleProjectInfo`), and one with no project of a type the user's organization triages (its `ProjIntake`), so Chatter and the record files follow the Projects lists | Requests, RequestDetail | |

### Search and notifications

| Need | Kind | Proposed as | Used by | Stub spec |
| --- | --- | --- | --- | --- |
| Notification topics | seed data | `WorkItemAssigned` (Notifications inbox), `MergeRequestReview` (review requested), `MergeRequestUpdate` (new commits, approvals, comments, merged; Updates), `CommitStatusFailed` (the head's author and the merge request's), `TimesheetApproval` (approval), `TimesheetReturned`, `TimesheetApproved` (Updates; added in P6a), `TimesheetMissing` (reminder), `AllocationRequest` (approval), `AllocationDecision`, `MilestoneApproval` (approval), `ProjectStatusUpdate` (Updates), `RequestTriage` (a new request in a project I triage), `RequestUpdate` (a request moved by its work, to its followers; Updates; added in P5), `ReleasePublished` (Updates); each with title and link templates into Projects' screens | the screens above, the tray | design-drawers-commons §19 "Notification fields and approvals" |
| Search documents | seed data | `MantleTask` gains sprint, release, component and labels; `MantleProject` and `MantleRequest` link to Projects' screens; the `MantleTask` and `MantleRequest` topics' links (seeded by mr-marble with `/vapps/my/…`) map to Projects for its users | WorkItems search, palette | |

## 16. Decided

| Decision | Notes |
| --- | --- |
| Projects is project-management first with ERP handoffs, and serves software teams, consultants and clients beside managers and services staff | Research's bottom line; the brief for this file: win Moqui users and service providers from Jira and Redmine |
| This file designs the Task / work item (crosscut §3.12) and Request / case (crosscut §3.11) base screens as `Shared/WorkItemDetail` and `Shared/RequestDetail`; Commons' TaskDetail and RequestDetail become them in the Commons context | Projects is the first app with their full form sets; design-crosscut references them as it does the three design-drawers-commons designs, and design-doc-guide §1 says so; Customer Service adds its case parts through its Per-app context row |
| One work item record, one find, many views: list, board, calendar and tree through the form-list views (the tree a new `view-tree`); the timeline and the backlog as `.qvue` screens over the same find | Research §4–§6 (OpenProject's query model, boards and Gantt as views); style-guide §3.6 "the board is a view of the list" |
| Boards group by status by default and may group by a planning field (assignee, sprint, milestone, release, priority) | OpenProject's action boards; style-guide §3.6 widened at this file's review: a board may group by a planning field where an app's design says so |
| Work item types are task purposes; an epic is any item with sub-items, and work items nest to any depth (epics of epics) within one project, with a Tree view, a sub-item tree, roll-ups of estimate, remaining and actual, and the Progress report by top-level item down the tree | SimpleScreens and Mantle model types as purposes; the task tree of SimpleScreens, MarbleERP and HiveMind served estimate breakdowns and the report by top-level item, and services work needs the same |
| Status, health and board column stay three things; two work item flows, `Default` and the new `WorkEffortDevelopment` with In Review and In Testing | Research §4 and §13 (status per flow, health apart, no second stage field) |
| Plan items are work efforts under the project: milestones, releases, components and the new sprints, joined to items by `WorkEffortAssoc` | Mantle's own model for the first three; memberships end with `thruDate`, which keeps a sprint's history |
| Phases are milestones with a start date; a gate is a milestone's approval; no phase record | Answers research's question on phases: dates, status and Chatter come with the milestone |
| A new `WorkEffortAllocation` record, not hours on `WorkEffortParty` | Answers research's allocation question: `WorkEffortParty` has the party in its key and no hours, and a placeholder has no party |
| The milestone billing share is `OrderItemWorkEffort.invoicePercent` | Answers research's question: one milestone can release shares of several lines and one line can be split over milestones |
| One approval on the weekly `Timesheet`, shared by Projects and People; Return and Reopen transitions are added; submitted entries are locked | Answers research's timesheet question; every reference approves the period |
| Email to a project makes a request by default; a project may let internal senders make work items directly | Answers research's alias question; a request keeps the sender and the conversation |
| Project budgets are caps and estimates (`totalTimeAllowed`, `totalClientCostAllowed`, item estimates, `WorkEffortProduct`); a link to `mantle.other.budget` and GL posting of project cost (`post#WorkEffortCost`, an empty stub) are later and Accounting's | Answers research's budget question; `get#ProjectStats` already computes the actuals |
| One Rates screen with purpose chips: Projects edits client rates and the pay rates of project work; People includes it for employment pay | Answers research's rate-card question; `RateAmount` is one versioned table; WhichRate shows the lookup |
| Billable is the rate type (`RatpStandard` or `RatpNoCharge`); no billable flag is added | Research's data finding |
| Capacity comes from Commons' `WetAvailable` working hours, leave and holidays until People's schedule record exists | Keeps the planner working now; one service to change later |
| Code hosting, review, statuses, webhooks and branch rules are framework records and services, Mantle-free; Mantle links them to work; BOSS draws them | As `WikiPageReview` and the drives are framework; initial-design's "framework does protocols, BOSS does UI and data mapping" |
| Merge requests in the first release with merge commits and fast-forward; squash and rebase as per-merge methods, a default method per repository (merge commit or squash) and a branch rule to dismiss approvals when the source moves come next; branches of one repository only, no forks | A team cannot leave GitHub or GitLab without review; squash is a common team rule; forks are not the audience's workflow |
| Branch rules are enforced by the git server; writes through Moqui with the update right pass | Protection must not depend on a component's rule; wiki saves and release notes commit as their users |
| CI stays outside: webhooks start it and statuses come back over REST in GitHub's shape | No pipeline engine in Moqui; existing CI integrations work with little change |
| Repository rights follow project roles: leads may force-push and delete; client contacts read only when the project shares its repositories | Extends `check#GitRepositoryAuthz` |
| Git access (SSH keys, access tokens) is a Projects/Code screen; Commons/Settings/Account links to it for users who have Projects and hosts the access tokens box for those who do not | Where developers clone; tokens also serve the REST API |
| A release links its tag by version name as well as by id, and publishes notes to the docs, `CHANGELOG.md` and email | Teams tag `v1.4.0`, not `PROJ-REL-3` |
| Project documentation may live in the project's repository (`git://<repositoryId>/docs`) | The framework's wiki works on git; docs travel with the code and can be edited in the browser or in a clone |
| Clients sign in to Projects only, under the `BOSS_PROJECT_CLIENT` filter set, and see shared items, their requests, published updates and invoices; Chatter shows them messages only; the public form and email serve clients without accounts | The feature service providers are asked for first; Redmine's client roles are the bar; client, customer, supplier and other portals across apps come later and can reuse this filter set and these screens |
| Work item visibility: General shares with the client, Work group is internal (the default), Restricted is for the item's parties and the project's managers | Reuses `WorkEffortVisibility` rather than a new flag |
| A project's key is one to eight upper-case letters or digits; new projects number items from 1 without gaps | Keys are typed in commit messages and branch names |
| App-wide settings are the organization's `PartySetting`s; a project's choices are `WorkEffortSetting` rows; modules switch tabs per project | OpenProject and Redmine split global definition from per-project choice |
| Health comes from status updates (`WorkEffortUpdate`); budget and schedule warnings are computed by `get#ProjectStats` and shown beside it | Odoo's updates; OpenProject's health kept apart from status |
| Templates are projects flagged `isTemplate`; a project is made from one by `clone#Project` | OpenProject's cheapest model; the baseline's clone already copies the tree |
| Projects triages project-type requests without a project; Customer Service keeps cases; Commons the user's own | Research §11; design-drawers-commons §8 |
| A request becomes work by conversion with links, and can follow its work's status | Research §11 BOSS implications |
| No project mailbox; a project's Chatter and its record chat room are its discussion places | Answers design-drawers-commons §20's question for projects; a forum can be a later setting |
| Approvals of timesheets, allocations and milestone gates are decided in Projects' lists and in the tray through the same services | design-drawers-commons §4; design-crosscut decides whether apps include the Approvals form |
| The Invoice detail becomes a research-crosscut §3 reused screen (Accounting, Projects, Sales, Purchasing, Customer Service), designed in design-crosscut with Accounting's version first; it and the Order detail are mounted in Projects with its context | Stand-alone rule: a services business running only Projects can send what it bills; invoices are reused across apps |
| One timer per person, shown in Home, the work item and the Today tab | OpenProject's menu timer; the baseline's clock-in |
| Utilization, billable utilization, cost, billable value, margin and budget used are defined once, in §11, and every report and card uses those definitions | Research §12: the references define them several ways |
| Story points are optional per project; hours are the default estimate | Service providers bill hours; agile teams plan in points |
| Work item import with Jira, Redmine and GitHub presets is in the first release | The audience is moving from those tools |
| No custom fields on work items in the first release; labels, components and types cover most uses | Proper customization comes with the visual developer tools under way, and perhaps a general form extension mechanism that attaches custom fields to any entity by its primary key, rather than a field mechanism for work items alone |
| WorkItems has a Peek pane: WorkItemDetail, compact, in a wide right pane of `container-split` beside the list | OpenProject's split view and Ever Gauzy's quick look; a triager reads items without leaving the list |
| Recurring work items are in the first release: a rule (`WorkEffortRecurrence`) on the item, the next made when one completes, counted from the due date or the completion day | Periodic work (reports, filings, checks, renewals) for many business roles, in Projects and in Commons' tasks |
| One active sprint per project by default; a project setting allows several | Teams sharing a project |
| A client approves the project estimate through the gate of the project's first milestone, Estimate | No new approval record; the gate already notifies, records the decision and serves client contacts |
| A repository is archived (read-only, hidden) from RepositorySettings; deleting one is an administrator's tools action after an export | Commits, links and merge requests stay readable; a mistaken delete cannot be undone |
| Time import starts with one common CSV, Time entries, beside Mantle's detail CSV; Toggl, Harvest and Clockify presets follow the first release | One documented format covers moving in; presets are conveniences |
| Code search and editing repository files in the browser are not Projects'; they belong to the coming developer tools, a separate app for development work | Projects reads code and ties it to work; changing code is a clone's or the developer app's |
| Retainers and prepaid hours are not designed here; they are left to People, with its pay work | Decided at review; Projects' Unbilled still bills such time at the client rates |
| Later: WIP limits on board columns (a per-project limit per status) and Timeline baselines (a snapshot of start and due dates drawn under the bars) | Decided at review; neither blocks the first release |
| Until the shared Employee 360 exists, PersonDetail is a Projects screen with the tabs of §9; design-crosscut designs the base with People's version first | PersonDetail should not wait on People |
| The detail time import and team time stay; the summary staffing import and risk classes are People's | Payroll concerns |
| Expense capture is People's; Projects shows and bills project expenses; contractors bill their own time from My time | design-drawers-commons §20 moved My Account's expenses to People |
| Dropped from the candidate inventory: a portfolio screen (a Projects view and the Timeline's portfolio mode), a board screen (a WorkItems view), phase records (milestones), a budgets screen (ProjectMoney and Profitability), a project expenses screen (ProjectMoney) | Research §16 candidate inventory |
| Not carried from the baseline: the status-history box and the broken links (§13); the task tree is carried as the Tree view | Chatter shows the status changes |
| ss-inventory and usl-inventory carry this file's **Designed in** values and the rows of the Oct 20 git forms and `mantle.work.GitServices` | Filled Oct 21, 2026 from §13 and the form summaries |

## 17. Open

None. The review of Oct 21, 2026 answered every question this file left open; each answer is in §16 and in the
sections it changes (WorkItems' Peek pane, recurring work items in §5, merge methods and archiving in §7, the time
import format in §8, the Invoice detail in §10, Git access in Commons, the estimate's approval in ProjectMoney).
