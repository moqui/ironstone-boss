# IronStone BOSS — Projects implementation

Oct 22, 2026 — built: P0 through P11 done; what remains is §7 Later and the open findings of §6. Oct 28, 2026
addendum (§9): the client portal as a PASS app in mr-pass, planned

How [design-projects.md](design-projects.md) gets built, in phases from the foundation to client access, each ending
tested and usable. This file is kept at a high level: each phase names its scope by the design's sections and §15 rows
rather than restating them, and the design stays the place for screen and record detail. During the build this file is
the log: phase status and what each built, the decisions made, open questions, findings against the code, and what is
deferred. Today `screen/Projects/` holds placeholders only (Home, Projects, WorkItems, Intake, Timesheets, Resources,
Billing, Settings). (That was the start; every phase below is now built.)

**Inputs.** [design-projects.md](design-projects.md), [design-doc-guide.md](design-doc-guide.md),
[style-guide.md](style-guide.md) §8, [impl-drawers-commons.md](impl-drawers-commons.md) §4 (the shared rules),
[ss-inventory.md](ss-inventory.md), [usl-inventory.md](usl-inventory.md); mr-moqui `plans/Remaining-Work.md`,
`docs/interfaces/Git-Hosting.md`, `docs/data/Revision-Management.md` and `docs/Build-Test.md`. Code paths are under `mr-moqui-base/` unless
they name a component.

Sections: [1 scope](#1-scope-and-order) · [2 rules](#2-ground-rules) · [3 phases](#3-phases) ·
[4 decisions](#4-decisions) · [5 open](#5-open-questions) · [6 findings](#6-findings) · [7 later](#7-later) ·
[8 verification](#8-verification) · [9 client portal](#9-addendum-the-client-portal-in-mr-pass)

---

## 1. Scope and order

- **Repositories.** Each its own git repo: `mr-moqui-base` (`crates/`, `runtime/base-component`),
  `runtime/component/mr-mantle`, `runtime/component/mr-mantle` and `runtime/component/mr-boss`.
- **Scope.** Every `parity` and `new` row of design §2 and the §15 needs they use. The `later` needs of §15 and §16 are
  in §7.
- **Order** (decided Oct 21, 2026): the foundation, projects and work items, then Code early (the differentiator for the
  Moqui community, and the soonest way to run Projects for its own development), then planning, requests, time,
  resources, billing, reports, and client access last.

## 2. Ground rules

- **The Commons rules hold:** impl-drawers-commons §4 (failure tolerance, the Mantle-free framework, the new XML element
  checklist of style-guide §8.1, libraries through `libs/refresh.mjs` and crates against `deny.toml`, the `.qvue`
  gallery pattern, demo data, builds and commits).
- **Git records through services.** Entity filters do not apply to `moqui.*` entities, so screens read repositories,
  merge requests, statuses, rules and webhooks only through services that check the repository's rights.
- **Clients in mind from the start.** Client access is finished in P10, but each client-visible screen (design §1.1) is
  written so its client state is an addition, not a rewrite: no money or internal fields read without a group check.
- **Shared screens.** `Shared/WorkItemDetail` and `Shared/RequestDetail` replace Commons' TaskDetail and RequestDetail;
  Commons keeps its paths and its specs keep passing.
- **Done for a phase:** impl-drawers-commons §4 "Done" (cargo tests for touched crates with goldens reviewed, the new
  Mantle specs under `./moq test mr-mantle`, `./moq test mr-boss` with AppStructure covering the new screens,
  `moqui lint --screens` clean for BOSS, the `test/client` walks passing, the inventories'
  **Implemented in** columns), the phase's walk in §8, and its row and **Built** note here.

## 3. Phases

| Phase | Repos | Screens | Status |
| --- | --- | --- | --- |
| P0 Checks | all (read) | — | done Oct 21 (§6 F1–F7) |
| P1 Foundation | mr-moqui, Mantle, BOSS | the Projects root and menu | done Oct 21 |
| P2 Projects and work items | Mantle, BOSS (mr-moqui) | Home, QuickCreate, Projects, NewProject, ProjectDetail and its Overview, Work items, Team, Files and Settings tabs, WorkItems, WorkItemDetail, WorkItemTypes, Workflows, Labels, Templates | done Oct 22 |
| P3a Code: framework | mr-moqui | — | done Oct 21 |
| P3b Code: Mantle and BOSS | Mantle, BOSS | every §7 screen, ProjectCode, CodeSettings | done Oct 22 |
| P4 Planning | Mantle, BOSS (mr-moqui) | Backlog, SprintDetail, Timeline, WorkItemImport, Roadmap, MilestoneDetail, ReleaseDetail, ProjectBacklog, ProjectTimeline, ProjectCalendar, ProjectRoadmap, ProjectDocs | done Oct 22 |
| P5 Requests | Mantle, BOSS | Requests, RequestDetail, RequestIntake, ProjectRequests, IntakeSettings | done Oct 22 |
| P6 Time | Mantle, BOSS | MyTime, Timesheets, TimesheetDetail, TimeEntries, ProjectTime, TimeSettings | done Oct 22 |
| P7 Resources | Mantle, BOSS | TeamPlanner, Allocations, PersonDetail | done Oct 22 |
| P8 Billing and money | Mantle, BOSS | Unbilled, Invoices, InvoiceDetail, OrderDetail, Rates, ProjectMoney, BillingSettings | done Oct 22 |
| P9 Reports and outputs | Mantle, BOSS | Reports and its seven reports | done Oct 22 |
| P10 Client access | mr-moqui, Mantle, BOSS | the client states of §1.1's screens | done Oct 22 |
| P11 Finish | BOSS | — | done Oct 22 |

### P0 — Checks

Verify the design's riskiest assumptions against the code before building, each result a row in §6 and, where it
changes the design, an edit there:

- entity filter sets on `WorkEffort` and `Request` (R28 found neither has one) and the order of `AUTHZT_ALWAYS`,
  `AUTHZT_DENY` and `AUTHZT_ALLOW` in mr-moqui (§15 Client access);
- the `Project_<KEY>` sequence banks in `create#Project` and `clone#Project` (§15 Work item keys from 1);
- `get#WorkEffortChildStats` per-level reads, as the base of `get#WorkItemTree`;
- gix's `merge` feature and what squash and rebase need (§15 Merge);
- a wiki space rooted at `git://<repositoryId>/docs` (§15 Wiki space in a repository);
- the Comms rule action hook for `createRequest` and `createWorkItem` (§15 Email intake);
- the existing `view-board` and `view-calendar` code paths `view-tree`, `group-fields` and the peek pane build on.

Done Oct 21, 2026: F1–F7. The design's §15 Shell, Client access and Email intake rows took F1, F2 and F6. The view
paths are left to P1, which reads them as it builds.

### P1 — Foundation

- Data model and seed: design §15 Work model (sprints, rank, points, lag, development flow, labels, health and status
  updates, project settings, app settings, template flag, keys from 1, client project purpose), the work types of Time,
  the three user groups and `SSH_GIT` (§1.1).
- The Projects root: groups, menu with the placeholders renamed to §1.2, `<shell-providers>` and the `projects` key scope
  (§1.4), palette and notification link mapping.
- Framework list pieces of §15 "Lists, views and components" that P2 needs: `view-tree`, `view-board` `group-fields` and
  `all-rows`, the peek pane, `m-elapsed`.
- Projects demo data (projects with a tree of work items, members, a client).
- Usable when: the Projects menu renders for each internal group, and the gallery shows the new list pieces.

**Built, Mantle and BOSS** (Oct 21, 2026):
- Mantle udm: the §15 Work model fields, types, statuses, the `WorkEffortDevelopment` flow, `WorkEffortSetting`,
  `WorkEffortUpdate`, `StatusUpdate`, the `Proj*` PartySettingTypes, `WepPrClient` and the `Wktp*` work types; the
  holiday categories are `WcatHoliday`.
- Mantle usl: `init#ProjectSequence` (keys from 1; `clone#Project` goes on after the highest number it copies and takes
  `isTemplate`), tasks and cloned tasks take a bank of 1; `get#VisibleProjectInfo` (F1); `store#ProjectSetting` and
  `get#ProjectSettings`; `test/WorkProjectFoundation.spec.js`.
- BOSS: the three groups (managers ALWAYS, team ALLOW and denied the managers' screens through
  `BOSS_PROJECTS_MANAGERS`, the client group without authz until P10), `SSH_GIT`; the §1.2 menu as placeholders, the
  `<shell-providers>` and `projects` key scope; `get#RecordLink` opens projects and project tasks and requests under
  Projects for its users; `BossProjectsDemoData.xml` (IRON, a product project on the development flow with a work item
  tree; ACME, a client project; HIRE, a Work group project) and `BossUsersDemoData.xml` (john.doe a manager, joe and bob
  developers); AppStructure covers Projects, `test/ProjectsShell.spec.js`.
**Built, framework** (Oct 21, 2026, mr-moqui efc1d587): `view-board` `group-fields` and `all-rows` with `max-rows`;
`view-tree` (`m-list-tree`, with the added `child-count-field`; html a nested table, tui an outline with + and -);
`form-list` `peek-url`; `m-elapsed`; the gallery's Views (board by status or type, a work-breakdown tree, peek into the
new ExampleDetail). moqui-core 1548 passed, moqui-tui 139, node 187, `./moq test example` 83.

- Tests: mr-mantle 559 of 564 features passed, 3 skipped, 2 failed (`ContactListSend` site address, `InboxThreads`
  operators) the same with the changes stashed; mr-boss 400 of 412 passed, 12 skipped (git, xlsx and imap are
  not in the lite build); `moqui lint --screens` clean.

### P2 — Projects and work items

- Design §3 Home (the team's blocks) and QuickCreate; §4 Projects, NewProject, ProjectDetail with Overview, Work items,
  Team, Files and Settings; §5 WorkItems with its four views, peek and bulk changes, and `Shared/WorkItemDetail` (Commons
  TaskDetail becomes it); recurring work items; status updates and health; project activity; §12 WorkItemTypes,
  Workflows, Labels and Templates.
- Topics `WorkItemAssigned` and `ProjectStatusUpdate`; the `MantleProject` and `MantleTask` search and palette links.
- Usable when: a manager makes a project from a template, the team adds and nests work items, works them through the
  development flow in each view and the peek pane, and posts a status update that sets the health.

**Built, work items half** (Oct 22, 2026; the projects half, Home and the Settings pages follow):
- Mantle udm: `WorkEffort.parentWorkEffortId` in the audit log on update (`move#Task` logs a move from the top level,
  which an update audit leaves out; on create too would shift the audit rows WorkPlanToCashBasicFlow checks);
  `WorkEffortCategoryAppl` relationships (`workEffort`, `category`); `MantleTask` gains the plan items' names
  (`assocFromName`) and the labels (`categoryId`, `category`).
- Mantle usl: `ProjectServices.get#WorkItemTree` (a level, or ids with their ancestors; roll-ups from one read of each
  project; visibility of F1); `TaskServices.move#Task`, `set#TaskRank`, `get#TaskStatusFlow`, `set#TaskStatus` (F11, the
  framework's message for a refused move), `set#TaskPlanItem` with `set#TaskRelease` and `set#TaskComponent`,
  `add#TaskLabel`, `remove#TaskLabel`, `set#TaskRecurrence`, `make#NextRecurringTask` (SECA on Complete and Cancelled),
  `notify#TaskAssigned` (SECA on an Assignee row; topic `WorkItemAssigned`); `update#Task` moves a subtree to another
  project; `test/WorkProjectItems.spec.js`.
- BOSS: `Shared/WorkItemDetail` (Commons mounts it at `Commons/Tasks/TaskDetail`, Projects at `WorkItems/WorkItemDetail`;
  compact with `peek=true`), `Projects/WorkItems/List` (smart lists, find, saved finds, quick add, bulk, the four views,
  peek), `Projects/QuickCreate` (QuickWorkItem; QuickTime says it comes with P6) and the managers' `Projects/QuickProject`
  (F8, F10); `ironstone.projects.WorkItemServices`; `ironstone.commons.TaskServices` take an `app` (projects: the project's visibility
  and team); the topic's link and two seeded saved finds; ACME-6 repeats weekly in the demo; specs `WorkItems`,
  `WorkItemDetail`, AppStructure, ProjectsShell and TuiRender updated.

**Built, projects half** (Oct 22, 2026):
- Step 0 baseline on the Debug package after P3a's merge: mr-boss 436/436, mr-mantle the two known failures,
  example 86/86, moqui-core lib 1564; the gallery TUI snapshots regenerated (P3a's enumerations widened the List).
  gate3 fails two tests that today's ScreenWeb parity commits outdated, not Projects: the `display String` class on a
  display field, and the static Cache-Control `max-age=86400, must-revalidate, public` (f9ee72a7 and nearby).
- Mantle usl: `clone#Project` copies the base's settings (not the intake token or docs space), links a copy of a
  template `WeatBasedOn`, and takes the copy's visibility, owner, purpose, parent and description (F19);
  `post#ProjectUpdate` (StatusUpdate on Chatter, `WorkEffortUpdate`, the health, topic `ProjectStatusUpdate` to the
  internal members); `get#ProjectActivity` (audit-log status changes, comments and updates, commits; each source on its
  own); `get#ProjectHomeCounts` (later phases' counters null); `get#ProjectTemplates`, `create#ProjectTemplate`;
  `TaskServices` `create#`, `update#`, `delete#Label`, `merge#Labels`; `test/WorkProjectHub.spec.js`.
- BOSS: `ironstone.projects.ProjectServices` (access by `get#ProjectAccess` view, update or manage; the find with board, bulk and
  status; header, overview, team, settings, NewProject steps, rates, Home, the app settings); screens `Projects/List`,
  `ProjectDetail` (Overview, Work items mounting `WorkItems/List`, Team, Files, Settings), `NewProject` (Start, Team,
  Modules, Money, Review), `StatusReport` (print), Home, Settings Index, WorkItemTypes, Workflows, Labels, Templates;
  QuickWorkItem and quick add offer the project's types; QuickProject links to NewProject; demo `ACMEAPP` (sub-project),
  `TPLWEB` (template), an IRON status update, modules; specs `Projects`, `ProjectDetail`, `NewProject`, `ProjectsHome`,
  `ProjectsSettings`. Final runs: mr-boss 461/461, mr-mantle the two known failures, lint clean, screenshots light
  and dark at 390, 1280 and 1440.

### P3a — Code: framework

- Design §15 Git hosting and the framework rows of Code review: repository list and push log, tree, refs, compare,
  merge (merge commit and fast-forward, then squash and rebase), archive, commit statuses with the REST endpoint,
  webhooks, branch rules enforced by the git server, the merge request store and its services; `code-view` with
  highlight.js.
- Usable when: cargo and spec tests cover each service, including a push refused by a branch rule and a merge refused on
  a conflict.

**Built** (Oct 21, 2026, mr-moqui 642a517a and d643ada2, merged with P1 as 3fc6e56d): gix's `merge` feature (gix-merge,
gix-imara-diff; licenses checked) and `resource/git` `merge.rs` (all four methods and trial merges over any store,
db repositories included), `rules.rs` (branch rules in the git server and the ref services), `hosting.rs` (tree with
last commits, compare, ref writes and annotated tags); archived repositories refuse pushes, ref writes, merges and
`git://` writes; the entities `GitCommitStatus`, `GitWebhook`, `GitBranchRule`, `GitMergeRequest`,
`GitMergeRequestReviewer` and the `GitRepository` fields; 19 Rust services and the JS ones in `GitServices.xml`, the new
`GitReviewServices.xml` and `framework/service/Git.gitecas.xml` (merge requests follow branches, webhooks follow
pushes); the commit status REST endpoint in the tools `moqui` resource; webhooks signed `X-Hub-Signature-256`,
internal addresses refused unless `git-server` `webhook-private-network`, retried by their own job; `code-view` and
`m-code` (highlight.js, Kotlin added). docs/interfaces/Git-Hosting.md "Hosting through Moqui". Tests: moqui-core 1563 passed (the
one failure needs mr-marble, absent from a worktree), the new merge, rules, webhook and hosting integration
tests, `GitHosting.spec.js` 3 of 3, node 191 of 191.

### P3b — Code: Mantle and BOSS

- Design §15 Code review (the Mantle rows): merge request links, review anchors, repository rights by project role,
  task branches, release tags by version, `search#Code`.
- Design §7: every Code screen, ProjectCode, the Development tab of WorkItemDetail, GitAccess with the Commons Account
  link, CodeSettings, and Home's reviews waiting. Topics `MergeRequestReview`, `MergeRequestUpdate`,
  `CommitStatusFailed`.
- Usable when: a developer makes a branch from a work item, pushes, opens a merge request, a reviewer comments on a
  line and approves, a CI status posts, the merge closes the item.
- Built in two halves (Oct 22): P3b1 the Mantle rows, the repository screens, Compare, CommitDetail, GitAccess,
  CodeSettings and ProjectCode; P3b2 MergeRequests, MergeRequestDetail, MergeRequestChanges, the Development tab and
  Home's reviews waiting.

**Built, P3b1** (Oct 22, 2026):
- Framework: `authorize_own` decides `AT_GIT_REPOSITORY` from the repository's own records (F23); git update events put
  the caller's user back (F26); a parameter or result named `context` stays out of SECA and rule frames (F25); the lite
  build reports the git_hosting services as not built in (F30); docs/interfaces/Git-Hosting.md Access.
- Mantle udm: `WorkEffortGitMergeRequest`, `CommunicationEventGitAnchor`, link sources `WglsReleaseVersion`,
  `WglsMergeRequestBranch`, `WglsMergeRequestText`.
- Mantle usl `GitServices`: rights by project role in `check#GitRepositoryAuthz`, repository defaults, merge request
  item links and completion, review comments, anchors and threads (`refresh#ReviewAnchors` on synchronize), task
  branches, release tags by version, `search#Code`, merge request and failed-check notices; `WorkGit.secas.xml`;
  `get#RecordLinkInfo` knows GitMergeRequest and GitRepository; topics `MergeRequestReview`, `MergeRequestUpdate`,
  `CommitStatusFailed`; `test/WorkGitReview.spec.js`.
- BOSS: `ironstone.projects.CodeServices` and `CodeDemoServices`; Repositories, RepositoryDetail (Files, Commits, Branches, Tags,
  a Merge requests note for P3b2, Activity, Settings), Compare, CommitDetail, GitAccess with the Commons Account box,
  Settings/Code, ProjectDetail's Code tab and Settings Code box; the `!` Code palette source; "Code hosting is not in this
  build" on the lite build; demo `BossProjectsDemoDataCode.xml` (repositories `iron` and more, merge request !1, a failed
  check on IRON-7-timer); `test/Code.spec.js`. Review fix: Raw shows only images and PDFs inline (F32).
- Runs (Debug): mr-boss 469/469, mr-mantle 594/596 (ContactListSend and its stepwise skip; InboxThreads passed),
  moqui-core lib 1565, example 86/86, SimpleScreens GitScreens 8/8; moqui-host `it` fails
  `system_sync::system_messages_and_entity_syncs_run_over_rest` with or without these changes (not Projects).

**Built, P3b2** (Oct 22, 2026, after the framework merged the LLM/Assist work as 76cfc8c5):
- Mantle usl: `get#ProjectHomeCounts` fills `reviewsWaiting` (null without git).
- BOSS: `ironstone.projects.CodeServices` merge request find (chips with counts), access, detail, changes, edits, reviewers,
  review, close and reopen, merge, item links, comments, and the Development tab's `get#WorkItemDevelopment` and
  `create#WorkItemBranch`; `Code/MergeRequests` (Waiting for my review, Mine, Open, Draft, Merged, Closed, All; mounted
  as RepositoryDetail's tab with the repository fixed); `MergeRequestDetail` (Overview with the merge box, items,
  reviewers and Chatter; Commits; Changes as `Changes.qvue` with file tree, unified and side-by-side diff, threads,
  resolve, outdated marks, viewed marks, the review dialog, j/k/v; `ChangesTui.xml` read only); Compare opens into
  MergeRequestDetail; WorkItemDetail's Development tab (branches with ahead and behind, checks, New merge request,
  Create branch; merge requests, commits, tags); Home's Reviews waiting counter and block; demo !1 with a review
  thread; specs `MergeRequests` and `CodeReviewWalk` (the usable-when walk, authorization on, through the screens'
  transitions).
- Runs (Debug): mr-boss 482/482, mr-mantle 594/596 (ContactListSend), lint clean with the Debug binary.

### P4 — Planning

- Sprints and rank services; design §5 Backlog, SprintDetail, Timeline (`.qvue`) and WorkItemImport; §4 Roadmap,
  MilestoneDetail, ReleaseDetail with release notes, and the project's Backlog, Plan (Timeline and Calendar), Roadmap
  and Docs tabs.
- Usable when: a team ranks the backlog, runs a sprint to completion with a carry-over, sees it on the timeline with
  dependencies, imports a Jira CSV, and publishes a release's notes to the docs space in the repository.
- Built in three parts (Oct 22): P4a sprints, Backlog, SprintDetail and the project's Backlog tab; P4b Roadmap,
  MilestoneDetail, ReleaseDetail with release notes and the project's Roadmap and Docs tabs (F7 checked first); P4c
  Timeline, the project's Plan tab (Timeline and Calendar) and WorkItemImport.

**Built, P4a** (Oct 22, 2026):
- Mantle usl: `ProjectServices` `get#SprintDefaults`, `create#`, `update#`, `start#` and `complete#Sprint` (carry to the
  next sprint, a new one or the backlog); `TaskServices` `set#TaskSprint` (scope changes of a running sprint in the
  audit log) and `set#TaskBacklogRank` (the project-wide order); new `ProjectReportServices` `get#SprintBurndown` and
  `get#SprintVelocity`; `test/WorkProjectSprints.spec.js`.
- BOSS: `ironstone.projects.PlanningServices`; `WorkItems/Backlog.qvue` (ranked leaf backlog and sprint lists, drag or a row menu
  to rank and plan, sprint dialogs) with `BacklogTui.xml` (read only), `SprintDetail` (burndown, items, scope changes)
  and `SprintReport` (print, with velocity); ProjectDetail's Backlog tab; the sprint on WorkItems (find with `current`,
  column, board group, bulk, quick add), WorkItemDetail and QuickWorkItem; the Current sprint saved find; demo IRON
  sprints 1 (complete, a carry-over), 2 (active) and 3 (planned); `test/SprintWalk.spec.js` (the walk: rank, plan,
  start, complete with a carry-over).
- Runs (Debug): mr-boss 488/488, mr-mantle 600/602 (ContactListSend), lint clean.

**Built, P4b** (Oct 22, 2026):
- F7 checked: a wiki space rooted at `git://<repositoryId>/docs` works with no framework change (a moqui-core test with
  a code repository and a merge-request-required branch rule; `git://` writes pass the rules and are logged); the home
  page is `docs/<SPACE>.md`, its pages under `docs/<SPACE>/`. docs/data/Revision-Management.md says so.
- Mantle udm: content type `WectReleaseNotes`. Mantle usl `ProjectServices`: `get#PlanItemDefaults`, `create#PlanItem`
  (`KEY-MS-n`, `KEY-REL-n`, `KEY-CMP-n`), `create#Release`, `create#Component`, `update#Milestone` (description,
  clearFields, unique version, date order, actual completion), `get#PlanItemSummary`, release notes (`generate#`, `get#`,
  `store#`, `publish#ReleaseNotes`), `release#Release`, `create#ProjectDocsSpace`, `sync#ProjectDocsSpaceUsers` (a
  WorkEffortParty rule); topic `ReleasePublished`; `test/WorkProjectReleases.spec.js`.
- BOSS: `PlanningServices` roadmap, plan item detail, items, release code, tag, notes and release; `ProjectServices`
  project docs; Roadmap, MilestoneDetail, ReleaseDetail; ProjectDetail's Roadmap and Docs tabs (Commons Knowledge in a
  project mode); NewProject's documentation in the repository; demo IRON-MS-2, IRON-REL-2 and IRON's docs space in
  `iron`; `test/ReleaseWalk.spec.js` (the walk: notes generated and published to the docs space in the repository).
- Runs (Debug): mr-boss 494/494, mr-mantle 607/609 (ContactListSend), moqui-core lib 1691, example 86/86, lint
  clean.

**Built, P4c** (Oct 22, 2026):
- Framework: a `.qvue` `<style>` is kept once per page by a length-and-hash key, never put in a selector (F53).
- Mantle usl: `TaskServices` `add#TaskDependency` (self, ancestor, descendant and loops refused; lag), `remove#`,
  `set#TaskDates` (shift, sub-items, auto-schedule of dependents by business days with the organization's holidays, each
  on its own); `ProjectServices.get#TimelineData`; `EventServices.get#FullCalendarData` by project; new
  `WorkItemImportServices` (read, parse, plan, preview, import; Jira, Redmine, GitHub and generic presets; a second pass
  for parents and epics; plan items and labels made; past sprints completed after their items; a row per transaction, a
  failed row named; progress topic); `test/WorkProjectPlan.spec.js`.
- BOSS: `WorkItems/Timeline.qvue` (items, plan and portfolio modes; dependencies with broken ones marked; drag to move
  and resize) with `TimelineTui.xml`; ProjectDetail's Plan tab (Timeline, Calendar with `CalendarTui`); Commons
  Calendar's project mode; the Import wizard (Source, Mapping, Options, Preview, Result, progress); Timeline buttons on
  Roadmap and Projects; `add#WorkItemLink` dependencies through Mantle; demo dates and dependencies on IRON (one
  broken); `test/TimelineWalk.spec.js` with `test/files/jira-work-items.csv`.
- Runs (Debug): mr-boss 502/502, mr-mantle 617/619 (ContactListSend), example 86/86, moqui-core lib 1691, node
  190/190, lint clean.

### P5 — Requests

- Design §6: `Shared/RequestDetail` (Commons RequestDetail becomes it), Requests, ProjectRequests, conversion and status
  from work, email intake through the Comms rule actions, the public form at `/r/<token>`, IntakeSettings; topic
  `RequestTriage`.
- Usable when: a request arriving by email and one from the public form are triaged, converted to work, and completed
  when the work is.

**Built** (Oct 22, 2026):
- Framework (F6): `run#EmailRules` runs the service an `EmailRuleAction` enumeration names (its own transaction, authz
  off, may stop processing; a failure is logged and named, the rule's other actions go on; an unknown action is still
  skipped); seed `EmailRuleAction` type; a moqui-core test.
- Mantle udm: setting types `WstRequestType`, `WstRequestTypes`. Mantle usl `RequestServices`: intake settings and tokens,
  `create#IntakeRequest` (the public form), `create#RequestFromEmail` and `create#WorkItemFromEmail` (the rule actions
  `ErActCreateRequest`, `ErActCreateWorkItem`; replies join their request), triage notices after commit, work items from
  a request, `complete#RequestFromWork` (an entity rule on the work's status), `convert#RequestToProject`; topics
  `RequestTriage` and `RequestUpdate`; `get#RecordLinkInfo` for requests by project; `test/WorkProjectRequests.spec.js`.
- BOSS: `Shared/RequestDetail` (Commons and Projects mount it); Projects/Requests (triage); ProjectDetail's Requests tab
  and Intake box; Settings/Intake; the public form `screen/RequestIntake` at `/r/<token>` (honeypot, per-project and
  per-address limits, the `request-form` web-protection rate limit, reCAPTCHA by preference, uploads limited by type,
  nothing internal answered); `ProjectRequestServices`, `RequestDemoServices`; demo requests on IRON by email and form;
  specs `ProjectRequests`, `RequestWalk` (the usable-when walk).
- Runs (Debug): mr-boss 521/521, mr-mantle 630/632 (ContactListSend), example 86/86, moqui-core lib 1692, gate3
  8/10 (the known two; the token route passes), lint clean.

### P6 — Time

- Design §8: the timesheet services and transitions, MyTime (`.qvue`, with the timer), Timesheets, TimesheetDetail,
  TimeEntries, ProjectTime, time import and TimeSettings; the Today source; time in Chatter; the timesheet topics and
  the missing-time job.
- Usable when: a consultant times work and fills a week in MyTime, submits it, and a manager returns, then approves it.
- Built in two parts (Oct 22): P6a timesheets, MyTime with the timer, approval, Home's time and the missing-time job;
  P6b TimeEntries, ProjectTime, time import, TimeSettings, the Today source and time in Chatter.

**Built, P6a** (Oct 22, 2026):
- Mantle udm: Timesheet transitions Return (Completed to In-Process) and Reopen (Approved to In-Process). Mantle usl: new
  `TimesheetServices` (policy with short keys, weeks less holidays, the person's timesheet, approvers, access, submit,
  approve, return, reopen with tray decisions and notices, summary, `find#Timesheets`, time keepers,
  `send#MissingTimeReminders`, the timer: one per person, server side); `TimeServices` put each entry on its week's
  timesheet and keep the lock; Home's hours, expected hours and timesheets to approve; `get#RecordLinkInfo` for
  timesheets; topics TimesheetApproval, TimesheetReturned, TimesheetApproved, TimesheetMissing; permission
  TIMESHEET_APPROVE; the hourly reminder job; `test/WorkTimesheets.spec.js`.
- BOSS: `ironstone.projects.TimeServices`, `TimeDemoServices`; `Time/MyTime.qvue` (the week by item and day, the timer, submit,
  approve and return for approvers) with `MyTimeTui` (read only), Timesheets (chips, bulk Approve, Return, Remind),
  TimesheetDetail; QuickTime; Home's timer strip, My hours and Approve time counters and Approvals block; Start and
  Stop timer on WorkItemDetail; demo project SUPP with submitted, approved and returned weeks and a running timer;
  `test/TimeWalk.spec.js` (the walk with authorization on).
- Runs (Debug): mr-boss 527/527, mr-mantle 638/640 (ContactListSend), lint clean.

**Built, P6b** (Oct 22, 2026):
- Mantle udm: setting type `ProjWorkTypes`. Mantle usl: `get#`/`store#WorkTypes`; `TimeServices` `find#TimeEntries`
  (who sees time; rates for money managers; unbilled and invoiced filters with totals), `import#TimeEntryCsv`,
  `get#TimeEntryTimeline` (a RecordTimelineSource, kind time, no rates); `get#ProjectTodayItems`;
  `test/WorkTimeEntries.spec.js`.
- BOSS: Time/TimeEntries (find, edit dialog, bulk within the lock, each entry on its own), ProjectDetail's Time tab,
  WorkItemDetail's all-time box, the time import wizard (Source, Preview, Result; generic CSV; re-import adds nothing;
  over 200 rows as a job), Settings/Time (the policy and work types offered), the Today source (timer with Stop, reviews,
  weeks to submit, requests to triage), time in Chatter; TIME_ENTRY_RATE for managers; `test/TimeEntries.spec.js`.
- Runs (Debug): mr-boss 533/533, mr-mantle 643/645 (ContactListSend), lint clean.

### P7 — Resources

- Design §9: capacity, allocations, TeamPlanner (`.qvue`), Allocations, PersonDetail; allocations in ProjectTeam and
  NewProject's team step; the allocation topics.
- Usable when: a manager requests a placeholder, staffs it from the candidates, and the planner shows capacity against
  the allocations.

**Built** (Oct 22, 2026):
- Mantle udm: `WorkEffortAllocation` (a person or a placeholder role with a skill on a project for days at hours or
  percent; Requested, Allocated, Rejected, Cancelled). Mantle usl: new `ResourceServices` (capacity from WetAvailable
  hours else the policy week, less holidays and WetTimeOff leave; allocation access, create, update, staff, approve,
  reject, cancel with notices and tray decisions; `find#Allocations`, `get#TeamPlan` per person and week,
  `find#StaffingCandidates` ranked by fit, skill, role and free hours); `get#WeekDays(partyId)` now gives capacity;
  Home's allocation requests; permission ALLOCATION_APPROVE; topics AllocationRequest and AllocationDecision;
  `test/WorkResources.spec.js`.
- BOSS: `ironstone.projects.ResourceServices`, `ResourceDemoServices`; Resources/TeamPlanner (`.qvue`, people by week with
  capacity against allocations, overbooked weeks marked, bars dragged by days, requests hatched; `TeamPlannerTui` read
  only), Allocations (with Edit and Staff), PersonDetail (Overview, Allocations, Work items, Time, Capacity);
  ProjectDetail Team's Allocations box; NewProject Team's hours a week; Home's counter and approvals; demo people,
  skills, leave, allocations (Joe over-allocated, a placeholder request); specs `Resources`, `ResourceWalk` (the
  usable-when walk with authorization on).
- Runs (Debug, with the F77 fix): mr-boss 541/541, mr-mantle 648/650 (ContactListSend), moqui-core lib 1754,
  tui_screens ok, lint clean. TimeEntries.spec now asserts authorization is on after the Today panel (F77).

### P8 — Billing and money

- Design §10: Rates, Unbilled, Invoices, InvoiceDetail, OrderDetail, BillingSettings; §4 ProjectMoney; the milestone
  billing share, milestone approval and the estimate sent for approval; Home's unbilled.
- Usable when: approved time and a completed milestone become a client invoice with its time detail.
- Built in two parts (Oct 22): P8a rates, Unbilled, Invoices, InvoiceDetail, BillingSettings and Home's Unbilled; P8b
  ProjectMoney, OrderDetail, the milestone billing share, gate and approval, and the estimate sent for approval.

**Built, P8a** (Oct 22, 2026):
- Mantle udm: setting type `WstTimeDetail`. Mantle usl `InvoiceServices`: `create#TimeEntryInvoiceItems` takes
  `timeEntryIdList`, `approvedOnly` and `billableOnly` (defaults keep Mantle's behaviour) and locks its entries for
  update; `create#ProjectInvoiceItems` passes them, takes expenses and settlement terms and writes `WorkEffortInvoice`;
  `delete#InvoiceItem` frees its time; `get#InvoiceTimeDetail`; `ProjectServices.get#UnbilledSummary` (money holders
  only; exact amounts per entry, totals by client) and Home's unbilled amount; `test/WorkProjectBilling.spec.js`.
- BOSS: `ironstone.projects.BillingServices` (`check#Money`: TIME_ENTRY_RATE or ADMIN) and `BillingDemoServices`; Billing/Unbilled
  with the invoice dialog (approved entries only, each ticked), Invoices (with To send), `Shared/InvoiceDetail`
  (approve and post, send by email with the PDF, cancel, edit, remove a line; payments read only), InvoicePrint
  (html-print and PDF), Rates (with Which rate), Settings/Billing; Home's Unbilled counter and ProjectDetail's Unbilled
  card; email template `BOSS_PROJECT_INVOICE`; demo client Brightwater Dental Group for SUPP, rates, a draft invoice of
  Joe's approved week; specs `Billing` and `BillingWalk` (the walk with authorization on).
- Runs (Debug): mr-boss 552/552, mr-mantle 655/657 (ContactListSend), lint clean.

**Built, P8b** (Oct 22, 2026):
- Mantle udm: `OrderItemWorkEffort.invoicePercent` and `invoiceAmount`; `WorkEffortApproval` (Requested, Approved,
  Refused, Cancelled); deliverable order and acceptance on `WorkEffortDeliverableProd`, `DeliverableType` seed; setting
  `WstEstimateMilestone`, content type `WectEstimate`. Mantle usl: milestone gate and approval (request, approve, refuse,
  cancel with notices and tray decisions; `update#Milestone` refuses completing a gated milestone not approved),
  `get#ProjectEstimate` and `send#EstimateForApproval`, milestone shares and `link#ProjectOrderItem`,
  `get#ProjectMoneySummary`, milestones due in `get#UnbilledSummary`; `InvoiceServices.create#MilestoneInvoiceItems`
  (WorkEffortBilling, OrderItemBilling, WorkEffortInvoice) and `delete#InvoiceItem` freeing it; permission
  MILESTONE_APPROVE; topics MilestoneApproval and MilestoneDecision; `test/WorkProjectMilestones.spec.js`.
- BOSS: ProjectDetail's Money tab (budget against actuals, unbilled, invoices, order lines, shares), `Shared/OrderDetail`,
  EstimatePrint; MilestoneDetail's Gate, Billing and Deliverables with Ask for approval, Approve, Refuse, Withdraw and
  Invoice milestone; the Roadmap's Awaiting approval; Unbilled's Milestones due and milestone shares in the invoice
  dialog; InvoiceDetail's milestone lines; NewProject Money's order line; demo Acme order with two milestone shares (one
  due, one awaiting approval); `test/MilestoneBillingWalk.spec.js` (P8's walk: approved time and an approved milestone
  on one invoice with its time detail; an estimate sent and approved).
- Runs (Debug): mr-boss 560/560, mr-mantle 665/667 (ContactListSend), lint clean.

### P9 — Reports and outputs

- Design §11 report services and screens, Home's manager charts; the §14 print documents and exports not built in an
  earlier phase.
- Usable when: each report renders on the demo data and its measures match §11's definitions.

**Built** (Oct 22, 2026):
- Mantle usl `ProjectReportServices`: `get#ReportScope` (projects, time and money the user may read), `get#TimeReport`,
  `get#WorkItemSummary`, `get#PortfolioStatus`, `get#ProjectProfitability` (money holders only), `get#Utilization` (over
  `get#TeamPlan`, billable hours), `get#ProgressBreakdown` (Restricted items out, money stripped), each part on its own;
  F70 fixed (over the estimate only with an estimate); F86 fixed (`find#TimeEntries` amounts from the RateAmount);
  `test/WorkProjectReports.spec.js`.
- BOSS: Reports index and Time, WorkItems, Sprints (velocity), Portfolio, Progress, Profitability and Utilization
  (parameters, number cards, `m-chart` with a terminal twin, tables with CSV and XLSX, print); `ironstone.projects.ReportServices`
  (chart config, options); Home's Hours by project and Unbilled by client charts; TimesheetPrint and TeamTimesheet
  prints; Profitability and Utilization for managers only; demo ACME time; `test/Reports.spec.js` (every report on the
  demo in qvt, html-print and tui, measures recomputed, joe sees no money).
- Runs (Debug): mr-boss 567/567, mr-mantle 673/675 (ContactListSend), lint clean.

### P10 — Client access

- Design §1.1 and §15 Client access: the `BOSS_PROJECT_CLIENT` filter set and group, Commons and Comms denied to it,
  Chatter's client audience, the client states of the client-visible screens, Home for clients.
- Usable when: the isolation spec passes (a client user never reads another client's project, an internal note, a rate
  or a cost through a screen, Chatter, record files, search or the palette) and a client sees only Projects.
- Built in two parts (Oct 22): P10a the access foundation and the isolation spec; P10b the client states and layouts,
  the client's own writes, billing for clients, shared repositories, and closing F121.

**Built, P10a** (Oct 22, 2026):
- Framework: the entity filter's fail-closed log names the entity and reason.
- Mantle usl: permission PROJECT_CLIENT (a client, whatever its other groups); `get#`/`setup#ClientProjectInfo` (a
  client's projects: `WstClientSignIn` Y and the user's party, or an organization they are a contact, employee or
  representative of, holds a customer role); client cases in `get#VisibleProjectInfo`, `get#WorkItemTree`,
  `get#ProjectActivity`, `get#ProjectStats`, `get#RecordLinkInfo` (first), `get#RecordTimeline`; `get#ClientRecordVisibility`,
  `filter#ClientAudience` for notices; repository rights for clients (F119); F85 and F111 fixed;
  `test/WorkProjectClients.spec.js`.
- BOSS: Commons and Comms ALL_USERS grants now ALLOW with DENY rows for clients (F3); `BOSS_PROJECTS_CLIENT` (ALLOW on
  Projects with the `BOSS_PROJECT_CLIENT` and `MANTLE_PRIVATE_CONTACT` filter sets), `BOSS_PROJECTS_INTERNAL` (DENY by
  location and service patterns for every internal section, tab, write service and search), `BOSS_PROJECTS_CLIENT_WRITES`
  (DENY writes on `mantle.*`); the filter set `BOSS_PROJECT_CLIENT` (each list defaults to `_NA_`, no missing aliases:
  fails closed; cost and time entities denied); client cases in the BOSS access, work item, Chatter, files, palette and
  code services; a minimal client Home; demo clients sheldon.acme (ACME) and gob.bluth (new project BLUTH); specs
  `ClientIsolation` (every allowed screen and a sample of denied ones, Chatter, files, search, palette) and
  `ClientAccessInternal` (internal users' Commons and Comms identical before and after the ALLOW flip).
- Runs (Debug): mr-boss 582/582, mr-mantle 682/684 (ContactListSend), moqui-core lib 1772 (an LLM members test
  failed once under load and passes alone), tui_screens ok, gate3 the known two, lint clean.

**Built, P10b** (Oct 22, 2026):
- Framework: permission `EXTERNAL_USER` (an app grants it to its outside users): no record-bound rooms, no public room
  but as a member, no records drive folder (screens, DAV, SFTP), no other user's presence, never the agent permissions
  (Assist, chat agents, AI tasks, A2A, MCP, the LLM gateway; `ec.llm` refused); a read failure counts as external. Lists:
  `row-selection` `condition` and `view-board`/`view-tree` `move-condition` (XSD, qvt, static, tui, goldens).
- Mantle usl: the client rule of `get#RecordLinkInfo` applies with authorization off too (F128); the review services
  refuse clients (F126); `get#ProjectClientContacts`, `send#ProjectUpdateEmail`, `send#EstimateEmail` (templates
  MANTLE_PROJECT_UPDATE, MANTLE_PROJECT_ESTIMATE); spec features added.
- BOSS: `ironstone.client.ClientServices` (the client's only writes, not remote, each re-checking access: Chatter send
  and reply to internal people only, raise a request with files, files on an open request, cancel their own request, the
  gate decision as its approver, which is how an estimate is approved); client states of Home (counters, gates, projects,
  requests, replies, milestones, invoices due), ProjectDetail, Overview, WorkItems, WorkItemDetail, Requests,
  RequestDetail, MilestoneDetail, ReleaseDetail (refused controls hidden; hours only when shared); the ClientHours tab;
  Billing/Invoices and InvoiceDetail read only for sent invoices to the client; shared repositories read only (no
  Compare, GitAccess, Activity or Settings; no review threads or CI statuses); `BOSS_PROJECTS_INTERNAL`'s write verbs
  completed (F124) with a spec that checks every service file; specs `ClientWalk`, `ClientWrites`, `ClientBilling`,
  `ClientCode`, `ClientChatDrive`, `ClientIsolation` extended.
- Runs (Debug): mr-boss 620/620, mr-mantle 685/687 (ContactListSend), example 86/86, moqui-core lib 1777/1778 (a
  chat preview test while a server ran; passes alone; the LLM members tests pass alone), tui_screens ok, gate3 the known
  two, node 262/262, lint clean. Host `collab::dav_routes_and_coediting_over_the_socket` fails at HEAD before P10b too
  (F136).

### P11 — Finish

- The `tui` texts of the `.qvue` screens (MyTime first), the server-static pass, the inventories' **Implemented in**
  columns, the design's Impl column, and Remaining-Work.

**Built** (Oct 22, 2026):
- Terminal twins with their changes as dialogs over the same services: MyTimeTui (timer, log, edit, delete, submit,
  approve, return, reopen), BacklogTui (move, sprints), TimelineTui (move dates, dependencies), TeamPlannerTui (move,
  decide), ChangesTui (a file's diff, line comments, replies, resolve), the Docs tab's KnowledgeTui project mode; the
  tab twins say not available for a project the user cannot see (F151); `test/ProjectsTui.spec.js`; a live check with
  `moqui tui --agent`.
- Server-static: seven more screens `qvt` (QuickCreate, QuickProject, Reports, Reports/Index, Settings,
  Settings/Billing, Settings/Time); ServerStatic.spec covers Projects.
- Framework: F132 (only a user who may push approves; approvals counted by each approver's push right at counting time;
  `get#MergeRequestApprovals`; `as_user` in `crate::user`), F133 (a SubscreensItem's group checked for the first screen of
  a lastStandalone render and on a transition's path); the example GitHosting spec's reviewer granted push (F139).
- Lite: git availability checks and Mantle review lookups in their own transaction (F140), so Home, Today, GitAccess and
  the Code screens hold without git.
- Docs: design-projects.md's Impl column and §1.1 (F134); ss-inventory and usl-inventory Implemented in; mr-moqui
  Remaining-Work's IronStone and Git hosting rows; docs/interfaces/Git-Hosting.md.
- Final runs, Debug: mr-boss 627/627, mr-mantle 685/687 (ContactListSend), example 86/86, moqui-core lib 1778,
  tui_screens ok, gate3 8/10 (the known two), node 230/230 (P10b reported 262; no JS changed since, F149), lint clean.
  Lite: mr-boss 575 passed, 1 failed (NewProject Money after a git-only step, also at HEAD, F141), 18 skipped.

## 4. Decisions

Made during the build; each one that changes the design is also written into design-projects.md.

| Date | Decision | Notes |
| --- | --- | --- |
| Oct 21, 2026 | Phase order: Code (P3) right after projects and work items | The user's call |
| Oct 21, 2026 | InvoiceDetail and OrderDetail are built in P8 for what Projects needs now, as `Shared/` screens, and expanded when design-crosscut and Accounting need more | The user's call (it was an open question) |
| Oct 21, 2026 | Each phase is built by a subagent, reviewed, then committed per repo | The user's call |
| Oct 21, 2026 | A project with no visibility is seen only by its parties; a project belongs to an organization by `ownerPartyId` or the organization's current role on it (`create#Project` makes the internal organization Vendor) | P1 |
| Oct 21, 2026 | A project setting falls back to the organization: the setting type's `optionValue` names the `Proj*` PartySetting, its `enumCode` the key in that setting's JSON object | P1 |
| Oct 21, 2026 | Managers' authz is ALWAYS, so the team's deny of the managers' screens never reaches a user in both groups | P1 |
| Oct 21, 2026 | The tree's top level is the list's page; a row whose parent is on the page nests under it and missing parents come muted from `ancestor-transition`, so a find of the top level and a find of every match both work. A move posts the key fields, the parent field and `previousSiblingId`, then the list loads again (P2's `move#Task` takes those names) | P1 framework |
| Oct 21, 2026 | Rows fetched later in a tree show their fields' text, not the list's cells (no inline edits) outside server-static screens | P1 framework |
| Oct 21, 2026 | The peek pane is a split layout of its own around the views, not `container-split`, so the list keeps its scroll and edits when Peek toggles; the pane loads the screen's `/apps` path | P1 framework |
| Oct 21, 2026 | Board group-by: `column-order`, `status-type-id` and `parameter-name` apply to the default field only; another status field gets its own columns and flow hints | P1 framework |
| Oct 21, 2026 | gix-merge is called through an adapter over the framework's git store, not a gix Repository, so db repositories merge too; no `.gitattributes` merge drivers. `GmmMerge` always makes a merge commit; a rebase replays the source's non-merge commits and drops those the target already has | P3a |
| Oct 21, 2026 | Branch rule patterns: one starting `refs/` matches the full ref, any other a branch name; `*` matches across `/`; every matching rule applies; making a ref counts as a push; only `merge#MergeRequest` passes "merge request required" | P3a |
| Oct 21, 2026 | Ref writes through Moqui are `GitUpdate`s of source `write` and run the pre-push rules, so every `git://` write (wiki saves, drive files) now makes a `GitUpdate` row and a pool job, as it already did with Mantle | P3a |
| Oct 21, 2026 | Webhook headers `X-Moqui-Event`, `X-Moqui-Delivery`, `X-Hub-Signature-256`; the body close to GitHub's; backoff doubling from a minute, given up after 8 | P3a |
| Oct 21, 2026 | Merge requests: added `get#MergeRequest` (what blocks the merge, what the user may do), `check#MergeRequest`, `queue#MergeRequestEvent`; a draft cannot merge, an author cannot approve their own, one open request per source and target, numbers max+1 under a unique index | P3a |
| Oct 21, 2026 | `code-view` takes `file-name` for the language by extension; the language is never guessed | P3a |
| Oct 21, 2026 | "May open Projects" for links reads `ArtifactAuthzCheckView` (allow and no deny on the root), since `isPermitted` under the Commons root's inheritable ALWAYS answers true for everyone | P1 |
| Oct 22, 2026 | The shared WorkItemDetail picks its context by the app root's `appRoot`; `ironstone.commons.TaskServices` take `app` (commons or projects): in Projects an item of a project the user sees is visible and the project's team changes it, in Commons the owner and assignees as before | P2 |
| Oct 22, 2026 | `set#TaskRank` and `move#Task` take `previousSiblingId` (the tree's name, P1) rather than the design's `afterWorkEffortId` | P2 |
| Oct 22, 2026 | The + menu's Project kind is a screen of its own, `Projects/QuickProject`, in `BOSS_PROJECTS_MANAGERS`, so the team is not offered it (F8) | P2 |
| Oct 22, 2026 | ProjectDetail's later tabs (Backlog, Plan, Roadmap, Requests, Code, Docs, Time, Money) are added by their phases; the Modules box already stores which are on | P2 |
| Oct 22, 2026 | Overview's Chatter is a column from 1440 px, below the boxes narrower; no Chatter tab | P2 |
| Oct 22, 2026 | ProjectDetail's status-bar is read-only and the moves are buttons, primary by status (Approve, Begin, Resume, Close, Re-open; In Progress: Post update) | P2 |
| Oct 22, 2026 | A project is managed by its ProjectManager or Manager parties, a Projects manager who sees it, or ADMIN; status-update notices go to internal members only until P10 | P2 |
| Oct 22, 2026 | ProjectDetail's menu leaves out New work item (the tab and the shell's + cover it) and Log time (P6) | P2 |
| Oct 22, 2026 | Merge request rules are SECAs (`WorkGit.secas.xml` on `queue#MergeRequestEvent`, `merge#MergeRequest`, `set#MergeRequestReviewers`, through `handle#MergeRequestEvent`), not gitECA rules: they are not git events | P3b1 |
| Oct 22, 2026 | A linked item completes on merge when the description says Closes <key>, the author ticks it on Compare, or the project's WstMergeRequestMoves is on | P3b1 |
| Oct 22, 2026 | Repository rights: internal members view, create and update; leads (ProjectManager, Manager, ProgrammerLead, SysArchitect) also delete; client contacts view only when the project shares its repositories (their own party's roles; P10 adds client organizations' contacts) | P3b1 |
| Oct 22, 2026 | CodeSettings: no default webhooks (each needs its own secret); managers grant or revoke SSH_GIT per group, never ADMIN | P3b1 |
| Oct 22, 2026 | The Code tab is always on ProjectDetail and says when the module is off (F24) | P3b1 |
| Oct 22, 2026 | Line comments are markdown (`m-text-area`, shown with `m-markdown`), as `create#ReviewComment` stores; diff lines are always text, never html | P3b2 |
| Oct 22, 2026 | MergeRequests' Open chip includes drafts; no updated-period find; the merge box has one message field seeded by the repository's method; Review is also in More for the terminal | P3b2 |
| Oct 22, 2026 | The backlog is the open leaf items in no open sprint; rank is one order over the project (`set#TaskBacklogRank` takes the gap's middle, renumbers the project when it closes) | P4a |
| Oct 22, 2026 | A sprint is `<KEY>-SP-n`, capacity `estimatedPoints` or `totalTimeAllowed` by the project's unit; done is Complete or Closed, Cancelled is neither done nor carried; the burndown steps on weekdays in the user's time zone | P4a |
| Oct 22, 2026 | The team ranks, plans, starts and completes sprints; only managers turn on Plan in sprints | P4a |
| Oct 22, 2026 | ProjectDetail tab order: Overview 1, Work items 2, Backlog 3, Code 4, Team 5, Files 8, Settings 9; Plan, Roadmap and Requests go before Code | P4a |
| Oct 22, 2026 | ProjectDetail tab order: Overview 1, Work items 2, Backlog 3, Plan 4, Roadmap 5, Requests 6, Code 7, Docs 8, Team 9, Time 10, Money 11, Files 12, Settings 13 | P4b |
| Oct 22, 2026 | A project's docs space is members-only unless the project is All users or General; its users follow the project's internal members (managers administer). In a General project every internal user reads the docs in the repository's `docs/` though only members view the repository (F46) | P4b; the user may want the docs space to follow the repository's rights instead |
| Oct 22, 2026 | Release notes are the release's `WectReleaseNotes` file; publish goes three ways, each on its own: the docs page `Releases/<version>`, the version's section of `CHANGELOG.md`, the ReleasePublished notice (email by preference) | P4b |
| Oct 22, 2026 | The Roadmap is a flat list by project and due date with kind chips; the team (not only managers) makes milestones and releases | P4b |
| Oct 22, 2026 | The Timeline is a `.qvue` with its own styles, no Gantt library; auto-schedule only moves dependents later and never moves done items | P4c |
| Oct 22, 2026 | The import maps each field to a column (exports have a hundred columns); the created date goes on the Reporter's `fromDate` | P4c |
| Oct 22, 2026 | The project calendar shows milestones and releases on their due day (a phase's start as a chip) and sprints over their days; its work items come from `find#WorkItems` so Restricted ones stay hidden | P4c |
| Oct 22, 2026 | The public form is `screen/RequestIntake.xml` behind the token route, not under Projects (a visitor has no Projects authz) | P5 |
| Oct 22, 2026 | A request follows its work by an entity rule on the work's status, only when the project's `WstRequestFromWork` is Y or unset with the Requests module on; Cancelled is neither done nor open | P5 |
| Oct 22, 2026 | Email files into a project only when the project's intake account received it or the rule's owner holds a role on the project; else the request has no project | P5 |
| Oct 22, 2026 | F9: `ProjTimesheetPolicy` uses short keys (ws, ap, lk, ri, rc, mh, fu, dh, wd, rd, rh) under 255 characters; dh and wd give working hours until P7's capacity | P6a |
| Oct 22, 2026 | Only the person submits their week; nobody approves their own; approvers are the week's project managers (default), line managers, or TIMESHEET_APPROVE holders by policy; the lock leaves rates changeable for P8 | P6a |
| Oct 22, 2026 | One timer per person (starting another stops the first; under a minute is discarded); a running timer blocks submitting its week | P6a |
| Oct 22, 2026 | Time is seen by the person, the managers of its projects, their line managers, ADMIN and (policy any) TIMESHEET_APPROVE holders; rates and amounts only by TIME_ENTRY_RATE holders (managers) and ADMIN; a submitted or approved week's entries change only in money, by them; nothing changes an invoiced or running entry | P6b |
| Oct 22, 2026 | The offered work types are the organization's `ProjWorkTypes` setting, read by MyTime, QuickTime, the entry dialog and bulk | P6b |
| Oct 22, 2026 | Placeholders name a project role and a skill (few EmplPositionClass records exist); a project's managers request allocations; ALLOCATION_APPROVE holders (Projects managers, ADMIN) approve, change and staff; the team sees the planner read only | P7 |
| Oct 22, 2026 | An allocation's hours spread over the person's working days by each day's hours; leave and holidays do not lower it; a week is overbooked when the larger of allocated and assigned exceeds capacity | P7 |
| Oct 22, 2026 | Only approved time is invoiced: Unbilled shows all billable uninvoiced time, marks the approved part ready, and the dialog invoices only ticked approved entries; an entry without a client rate cannot be invoiced | P8a |
| Oct 22, 2026 | InvoiceDetail in Projects is one page: Approve finalizes and posts when the organization keeps a ledger; Send approves a draft and emails the client's billing address; Cancel and Remove a line free their time; worker and expense invoices read only; payments are Accounting's | P8a |
| Oct 22, 2026 | A gate's requests and decisions are `WorkEffortApproval` rows (the settings still name the requirement and approver); approving reaches the milestone; until P10 a project manager (MILESTONE_APPROVE or ADMIN) records the client's decision, marked `recordedFor` | P8b |
| Oct 22, 2026 | Sending the estimate makes the order a quote (Proposed); approval moves the project In Planning to Approved and its orders through Placed to Approved; estimate hours priced at the project's standard client rate | P8b |
| Oct 22, 2026 | No billing share on the Roadmap (it is the team's; money is not) | P8b |
| Oct 22, 2026 | Reports' time follows `find#TimeEntries`' visibility within visible projects; utilization counts a person's time on any project (their whole load); expenses add to cost and billable value alike; a work item's created date is its first status audit row | P9 |
| Oct 22, 2026 | A client is any user with PROJECT_CLIENT (held by BOSS_PROJECT_CLIENT); client sign-in is per project (`WstClientSignIn`, no organization default); P10a clients are read only; a user should be in either the client group or an internal one (a manager's ALWAYS still wins on screens) | P10a |
| Oct 22, 2026 | A message is for the client when it is not a Comment and the client's party or organization (or a contact of it) is its from, to or CC, on a record the client sees | P10a |
| Oct 22, 2026 | F100: a manager's recorded decision stays, marked `recordedFor`; the client approver's own decision is the normal path once they sign in | P10a |
| Oct 22, 2026 | A client's writes are only `ironstone.client.ClientServices` (a package the deny pattern does not reach, each service re-checking access), not ALLOW rows (a DENY beats an ALLOW); clients do not accept deliverables; a client sees an invoice only once sent and release notes only once published | P10b |
| Oct 22, 2026 | Terminal twins change through dialogs (Backlog and Timeline reload their container, the others return to their screen); a terminal Move takes one item | P11 |
| Oct 22, 2026 | F132: an approval counts only while its reviewer may push, checked as that user when counted; F133 also refuses transitions under a group-limited screen (past Java) | P11 |
| Oct 22, 2026 | A recurring item counted from completion takes the completion day at the due date's time of day (UTC days) and the rule without its COUNT, which counts the items made | P2 |

## 5. Open questions

| Question | Decides | Notes |
| --- | --- | --- |
| How much of the framework list pieces P1 builds versus P2 building each when first needed | at P1 start | Settled: P1 built them all |

People's working-schedule record and Employee 360 do not exist; design §16 already settles that capacity reads
`WetAvailable` and PersonDetail is a Projects screen, so P7 does not wait.

## 6. Findings

Design assumptions found wrong in the code, with the resolution (written into the design where it changes it).

| # | Finding | Resolution |
| --- | --- | --- |
| F1 | P0: no entity filter covers `WorkEffort`, `Request`, `TimeEntry` or `WorkEffortParty` (the Mantle filter sets cover Invoice, Payment, OrderPart, Party, Product and the like), so design §1.1's "which projects a user sees" is enforced today only by `get#RecordLinkInfo` for one record, not by any find | A Mantle service gives the visible projects as a condition (`mantle.work.ProjectServices.get#VisibleProjectInfo`: the user's project ids by role and the organizations whose All users and General projects they see), and every Projects find and list service applies it; a spec proves a Work group project stays out of a non-member's lists. Design §15 Shell row added. P1 |
| F2 | P0: entity filters are evaluated against the user context (as `filterOrgIds` from `setup#UserOrganizationInfo`); a filter cannot say "the user's party holds a role on it" | The client filter set reads context values a Mantle setup service puts there (`setup#ClientProjectInfo`: the client's project ids and organization ids), called from the Projects root's `always-actions` beside `setup#UserOrganizationInfo`. Design §15 Client access row updated. P10 |
| F3 | P0: the authz order matches Java (`authz.rs`: ALWAYS returns at once, a DENY beats an ALLOW in any order); `BOSS_COMMONS_ALL_USERS` and `BOSS_COMMS_ALL_USERS` are `AUTHZT_ALWAYS`, so a client deny needs them to become `AUTHZT_ALLOW` as the design says | As designed; P10 checks that nothing relied on ALWAYS (an ALLOW does not pass an inheritable deny below it) |
| F4 | P0: work item ids come from `sequencedIdPrimary("Project_<KEY>", null, 10)` in `create#Task`; no `SequenceValueItem` row is made for a project | As designed: `create#Project` and `clone#Project` seed the sequence at 1 and `create#Task` takes a bank of 1. P1 |
| F5 | P0: gix is built without its `merge` feature and the framework has no merge code | P3a turns the feature on (checked against `deny.toml`) |
| F6 | P0: `run#EmailRules` accepts `createTask` and `createRequest` but logs and skips any action it does not know; there is no hook for an app to supply one | P5: the framework calls a service an app names for an action (by an `EmailRuleAction` enumeration whose `optionValue` is the service), so Mantle and BOSS add `createRequest` and `createWorkItem` without the framework knowing Mantle. Design §15 Email intake row updated |
| F8 | P1: the shell filters quick-create kinds and palette actions by screen only, and all kinds share `Projects/QuickCreate`, so the team is offered New project | P2: kind `project` refused for non-managers, or its own managers-only screen |
| F9 | P1: `PartySetting.settingValue` is text-medium (255), tight for JSON app settings such as ProjRepositoryDefaults or ProjTimesheetPolicy | Widen it, or split the settings, when those settings pages are built (P3b, P6) |
| F10 | P1: `create#Project` sets no visibility, which reads as members only | P2: NewProject and QuickProject default to General |
| F11 | P1: a task's flow may be on the task or its project (the demo sets both) | P2: `set#TaskStatus` reads the task's `statusFlowId`, else its project's |
| F12 | P1: Mantle's demo joe and bob are `PrtEmployee` toward `OrgEmployer`, so `get#PartyOrganizationInfo` gives them no organization and they see General projects only where they are members | Left alone (Commons' filters depend on it); revisit if P2's lists need it |
| F13 | P1: any request with `pageSize` saves it as the user's page size (`screen.user.page.size`) | All-rows boards and tree levels ask with `pageNoLimit` and cut in the browser (500 for a board, 200 a level with Show more); the server still answers every row, so P2's tree transitions should answer one level only |
| F14 | P3a: the test factories load no gitECA rules, entity seed data or status flows, so the git tests install `Git.gitecas.xml` and seed what they need; under load the in-memory test database can fail the second write of a `GitUpdate` when a pool job overlaps it (avoided for refused changes; the push path has the same pattern) | Watch for flakes in the git tests |
| F15 | P2: the framework checks a status change against every flow (any `StatusFlowTransition` from the old status to the new), so a task's own flow is checked only by `mantle.work.TaskServices.set#TaskStatus`; a direct `update#Task` with a status passes any flow's move | Every Projects and Commons status change goes through `set#TaskStatus` |
| F16 | P2: a screen has no way to bind its own keys (the `keymap` element is an app root's), so WorkItemDetail's `a`, `s` and `m` (§1.4) are not bound | A framework screen-level key binding, later |
| F17 | P2: `find#WorkItems` reads the ids of the user's roles and, for Unassigned, of every assigned open item of the visible projects, as IN lists (as F1's `get#VisibleProjectInfo`) | A subquery or view with the §7 item on `get#VisibleProjectInfo` |
| F18 | P2: a wizard step or detail tab loaded on its own (`lastStandalone`) runs without its parent screen's `actions` | The project or draft comes from `always-actions` (a cheap `get#ProjectAccess` with need none), or each step loads it; later tabs follow the pattern |
| F19 | P2: `clone#Project` dropped visibility, owner, purpose, parent and description, so QuickProject from a template never set General | Fixed in Mantle |
| F20 | P2: `button-menu` takes only `link`, `label` and dialogs (no `section-iterate` or `render-mode`) | A menu of computed items is one conditional link per possible item |
| F21 | P2: the framework's status flow check refuses a spec putting a status back through `update#` | Specs restore status with an entity value update |
| F22 | P2: project estimates roll up from their items (Mantle ECA), so the demo ACME shows Over the estimate (109 h of 105 h) | Left as demo data that shows the warning |
| F23 | P3b1 (security): an app root's inheritable ALLOW granted every repository check inside its screens and services, so any BOSS team member could view or push any repository through the Code screens | Framework `authorize_own`: `AT_GIT_REPOSITORY` decided by the repository's own records, as the git server does |
| F24 | P3b1: a subscreen tab cannot be hidden by a condition (`disable-when` is commented out in the XSD; `menu-include` is static) | The tab is always there and says why it is empty; a framework condition on tabs, later |
| F25 | P3b1: a service parameter named `context` (`create#GitCommitStatus`) broke every SECA on the service; `${context}` in a notification template is the context map | Framework rule frames skip it; the failed-check field is `checkContext` |
| F26 | P3b1 (security): calling `process#GitUpdate` or `process#PendingGitUpdates` directly left the caller signed in as the update's user for the rest of the request | Framework puts the caller back |
| F27 | P3b1: `moqui load` and the test copy shut down with git pool events running (a GitUpdate stuck at running until the next start); a GitUpdate in its own transaction fails on a repository made in an uncommitted one; the loader runs a data file in one transaction | Demo repositories in their own file, `BossProjectsDemoDataCode.xml`; Code.spec puts stuck updates back to pending. The loader waiting for the pool, later |
| F28 | P3b1: `compare` is a read-only host global in the script runtime | Not used as a variable name |
| F29 | P3b1: a `git://path#version` read needs a commit that changed the file | Raw reads the file's last commit up to the one asked |
| F30 | P3b1: the lite build had no feature entry for the git_hosting services, so they failed to load | Framework `FEATURE_LOCATIONS` entry |
| F31 | P3b1: `GitRepository.headCommitId` is the head of the last branch written, not the default branch's | ProjectCode reads the default branch's log |
| F32 | P3b1 review (security): Raw sent any pushed file inline by its name's type, so an `.html` or `.svg` file ran in the app's origin for whoever opened it | Raw is inline only for images and PDFs (the record files' rule); anything else downloads. The framework's `sendResourceResponse` could refuse active types inline everywhere, later |
| F33 | P3b2: the lite binary's `lint --screens` flags `code-view` as unknown (git is not built in) | Lint with the Debug binary |
| F34 | P3b2: the screen lint's gstring check flagged a template literal in a script, likely reading a `/"/g` regex as a string's start | Worked around with concatenation; check the lint later |
| F35 | P3b2: Chatter's header shows a `moqui.*` record by type and id ("Merge request 100000") | A label for framework records in Chatter, later |
| F36 | P3b2: a team user calling `org.moqui.impl.GitServices` outside a screen is refused (only the app root's ALLOW grants the services) | As intended; specs stand in for a push with authorization off |
| F37 | P4a: the screen lint's gstring check loses its place on any odd quote in a script (an apostrophe in a `//` comment, the `/"/g` regex of the `enc` helpers), then flags a double-quoted attribute with `$root` (extends F34) | Worked around; the lint should skip comments and regex literals |
| F38 | P4a: a `paginate="false"` form-list with a header row shows No results found unless the screen sets `${listName}Count` | Set in SprintDetail; the framework could fall back to the list's size |
| F39 | P4a: in `.qvue`, a `q-item-section` does not bound its inner row's width | `width:100%` on the row and `display:block` on the ellipsis link |
| F40 | P4a: the tree's `set#TaskRank` numbers one parent's children 1000, 2000..., which can tie with other parents' items in the project order | The backlog breaks ties by key; its next drag renumbers the project |
| F41 | P4a: loading data writes status audit rows at load time | The demo carries past audit rows; the burndown reads a first row with no old value as the earlier value too |
| F42 | P4a: a form-list field whose conditional-field is `<ignored/>` seems to keep its column (not isolated) | Shown as a note in another column; check later |
| F43 | P4a: a screen mounted in ProjectDetail opened by one who cannot see the project has no `projectTabId` | Transitions fall back to `workEffortId` so the answer is not available; later tabs do the same |
| F44 | P4b: F7 resolved, no framework change; the layout is `docs/<SPACE>.md` and `docs/<SPACE>/...` | Design §15 row updated |
| F45 | P4b: `get#WikiSpacePages` lists a directory only when its parent page file exists | `publish#ReleaseNotes` makes the Releases page first |
| F46 | P4b (security): wiki rights are the wiki's own and ignore repository rights, so a docs space in a code repository could show docs to those who may not view the repository | The space is restricted and its users synced from the project's members (decision above) |
| F47 | P4b: a release's description is too short for its notes | Content type `WectReleaseNotes` |
| F48 | P4b: commits added to the demo repository after IRON-3 change what CommitDetail shows for main, which two specs check | The demo's docs commits come before IRON-3 |
| F49 | P4b: the screen lint applies Groovy's split rules to JS, flagging `split('\|')` | Worked around with `indexOf`; the lint should know JS (with F37) |
| F50 | P4b: a `container-dialog` `type="primary"` button is tonal, not filled | The Release action and the sprint dialogs are not filled; a framework fix later |
| F51 | P4b: `get#ProjectMilestoneSummary` is milestones only | `get#PlanItemSummary` for every plan item kind |
| F52 | P4b: AppStructure walks screen files only, so tabs mounted from other locations (Roadmap, Docs in ProjectDetail) are not covered | ReleaseWalk renders them |
| F53 | P4c (framework): `addStyle` built a selector from a `.qvue` style's first 40 characters; a line break or quote threw and lost the style | Keyed by length and hash, compared as an attribute value |
| F54 | P4c: dating demo IRON items pushed an undated task off Commons Tasks' first page | Tasks.spec searches for it; IRON-13 and 14 left undated |
| F55 | P4c: a find's children come back in no fixed order | `set#TaskDates` orders by id; specs sort |
| F56 | P4c: a running server does not reload a changed service file (screens and `.qvue` it does) | Restart after a service change |
| F57 | P5: a failing app service marks the shared transaction rollback-only, which would undo the whole rules run | App actions run in their own transaction |
| F58 | P5: the loader's one transaction per file (F27) hides the demo's settings and rule from the rule action | The demo writes each in its own transaction |
| F59 | P5: the lint's quote tracking again (F37) | Worked around |
| F60 | P5: the lint calls a Boolean named `...Set` an empty-collection hazard | Renamed |
| F61 | P5: a request's Chatter needs `get#RecordLinkInfo` to know project visibility | Added in Mantle; BOSS specs check it as joe |
| F62 | P5: `create#ContactRequest` adds a public thank-you message to the submit's JSON | Allowed and checked to carry nothing else |
| F63 | P5: gallery-shots' `--dark` toggles only `#apps-root`, so it fails on public-shell pages | A scratch copy took the dark shots; the script could emulate the color scheme |
| F64 | P5: the ProjectRequests tab still shows an empty Project column (as F42) | Check with F42 |
| F65 | P6a: script l10n has no time-zone argument, so week boundaries are the viewer's; a timesheet made in another's session can overlap by hours | Found by the week's middle; a time-zone-aware format and parse in the framework, later |
| F66 | P6a: a service error in a GET JSON transition marks rollback-only and breaks the answer | Check access first and answer not available without an error |
| F67 | P6a: Mantle's timesheet status words (In-Process, Completed) are not the screens' (Open, Submitted) | A status-bar label override or renamed descriptions, later |
| F68 | P6a: a UserGroupMember dated at a spec's future effective time is not active for authz (the real clock) | Specs date such rows in the past |
| F69 | P6a: `find#Timesheets` checks each candidate's access one by one; Home calls it twice | A join by managed projects at scale (with F17) |
| F70 | P6a: any project with time but no estimate, or past its estimate, reads At risk | Demo time on SUPP; revisit the rule with P9's reports |
| F71 | P6a: Chatter labels a timesheet by id (as F35) | With F35 |
| F72 | P6b: demo bob is joe's line manager, so bob sees joe's time read only | Specs follow it |
| F73 | P6b: a screen-test result has errors but no info messages | Bulk counts checked by calling the service |
| F74 | P6b: a `hide` column's title stays in the static qvt output | Specs check row data |
| F75 | P6b: the lint's quote tracking again (F37) | Worked around |
| F76 | P6b: the lint calls a property ending in `Items` a collection (F60) | Renamed |
| F77 | P6b (security): after a spec renders a Commons screen (root authz ALWAYS), authorization stays disabled in that execution context | Not ALWAYS: `ExecutionContext::script_disable_authz` held a guard even when authorization was already off, so a script's `wasDisabled = disableAuthz() ... if (!wasDisabled) enableAuthz()` under framework code that had disabled it (the shell counts service behind `getShellData` on Commons Home and Today) left the rest of that execution context without authorization or entity filters. Within one request only (each request, TUI send and job gets a fresh context), but exploitable there (the Today panel's sources ran unchecked). Fixed in mr-moqui e29d336f with tests; TimeEntries.spec's re-enable loop to be removed |
| F78 | P6b: `find#TimeEntries` and the timesheet status filter use IN lists up to 20000 ids (F17, F69) | A subquery or view at scale |
| F79 | P7 (bug): a `date` field reaches a script as epoch millis of its UTC midnight, so `String(d).substring(0,10)` gave digits; since P6a `get#WeekDays` never marked a holiday and since P4c the Timeline never shaded one | Fixed in both with a UTC conversion; the same pattern remains in CalendarDavServices.xml 88-89, Mantle EventServices.xml 1150, BOSS EventServices.xml 398 and CalendarServices.xml 911, to check |
| F80 | P7: ProjectsShell's record-link feature passed only because of the F77 leak | It calls the palette service as its screens' app root grants it (as F36) |
| F81 | P7: AppStructure renders a tab with `lastStandalone -2`, showing the parent's header (with F52) | Resources.spec renders PersonDetail's tabs |
| F82 | P7: `EmplPositionClass` has almost no seed records | Placeholders use project roles |
| F83 | P7: Mantle seeds no SkillType enumerations | The BOSS demo seeds `BossSk*`; a skills settings page, later |
| F84 | P7: `get#TeamPlan` makes two calendar reads per person and caps at 300 people | Batch at scale (F17, F69) |
| F85 | P7: allocation request notices go to every ALLOCATION_APPROVE holder without checking they see the project | Filter by project visibility, with P10 |
| F86 | P8a: new time entries get only `rateAmountId`, never `clientHourRate`, so `find#TimeEntries` amounts read empty | Billing reads the RateAmount, as `get#TimeEntryAmount` does; `find#TimeEntries` should too |
| F87 | P8a: `create#TimeEntryInvoiceItems` billed every uninvoiced entry, unapproved, no-charge and running ones | Flags added; Mantle's default kept |
| F88 | P8a: `create#ProjectInvoiceItems` never wrote `WorkEffortInvoice` | Fixed |
| F89 | P8a: `delete#InvoiceItem` left time entries pointing at the deleted line | Fixed |
| F90 | P8a: the invoice description lost the project name | Fixed |
| F91 | P8a: a rate's currency is never checked against the invoice's; mixed currencies give a null total and hide Home's counter | Later, with multi-currency billing |
| F92 | P8a: changing a rate's amount reprices uninvoiced time using it | Documented on Rates |
| F93 | P8a: `get#InvoiceProjects` reads up to 20000 rows per call | A view or subquery at scale (F17, F78) |
| F94 | P8a: `lastStandalone=true` renders without ProjectDetail's header (F81) | Specs check `get#ProjectHeader` |
| F95 | P8a: a `header-field` title becomes the column title | Header-only find fields |
| F96 | P8a: Mantle's per-worker line text includes the party's pseudo-id | Left as Mantle's |
| F97 | P8b: a Proposed order cannot go straight to Approved | Approval steps through Placed |
| F98 | P8b: Mantle had no deliverable types or acceptance | Added |
| F99 | P8b: `create#ProjectInvoiceItems` errors when it bills nothing | Milestones invoiced first, time added to that invoice |
| F100 | P8b (security, for P10): MILESTONE_APPROVE lets a Projects manager record a client's gate decision on any project they see (marked `recordedFor`) | P10 decides whether recording for a client stays once clients sign in |
| F101 | P8b: the estimate is not emailed; the gate's notice reaches only users, and a client contact has none before P10 | With P10 |
| F102 | P8b: the Money tab shows the parent header in AppStructure (F81) | The walk renders the tab |
| F103 | P8b: a running server keeps old service definitions (F56) | Restart |
| F104 | P9: in a spec's `then`, `a \|\| b` evaluates as a boolean | Compute such values outside the assertion |
| F105 | P9: Home's at-risk counter has no schedule warning (Portfolio has late) | Later |
| F106 | P9: F86 fixed in `find#TimeEntries` rows and totals | Done |
| F107 | P9: a `hide` column's title still appears in the select-columns dialog, leaking money headings | Titles empty when hidden; the framework should leave hidden columns out of the dialog |
| F108 | P9: `show-csv-button` and `show-xlsx-button` show no Export menu without `select-columns` or a header dialog | Framework, later |
| F109 | P9: form-list fields are fixed, so period and status columns are capped (14, 12) | Totals cover the whole range; the screen says so |
| F110 | P9: the lint calls `hasRows` a collection (F60, F76) | Renamed |
| F111 | P9: `get#SprintVelocity` puts the active sprint first, and it and `get#ProjectSprints` check no project visibility | The Sprints screen accepts visible projects only; check callers in P10 |
| F112 | P9: secondary report tables have no phone column sets | Later |
| F113 | P9: the Time report's 14 parameters wrap over three rows at 1280 px | Later |
| F114 | P10a (security): `get#RecordLinkInfo` treated a user without an organization filter set as seeing every work effort, request, order and message; a client would have seen everything through Chatter, files and chat | The client rule runs first |
| F115 | P10a (security): Chatter's attachment transition checked only that the event was on the record, so a note's attachment was reachable by id | Fixed |
| F116 | P10a (security): RecordFiles would serve a visible work item's drive folder to a client | Client files limited to requests |
| F117 | P10a (security): follower and mention notices would send a note's text to a client | `filter#ClientAudience` |
| F118 | P10a (security): party searches listed every organization and person, other clients included | Party scope filter, searches denied |
| F119 | P10a (security): `check#GitRepositoryAuthz` gave view, create and update to any non-client role, so a client contact added as Watcher could push | A client only views, its own shared repositories |
| F120 | P10a: the `ProjectTaskCounts` view has no `visibilityEnumId` alias and fails closed under client filters | `get#ProjectStats` counts a client's items one by one |
| F121 | P10a (security, open): record-bound chat rooms and the records drive (DAV/SFTP through DriveDeviceServices, ALL_USERS ALWAYS) decide by `get#RecordLinkInfo`, which shows a client its shared items; mitigated (no app password, no Comms Chat); webroot chat store shows presence; Assist reachability unchecked | P10b closes it |
| F122 | P10a: a qvue screen tested in qvt answers "render mode not supported" before authorization | Specs render qvue screens in qvue to see the refusal |
| F123 | P10a: client screens still show refused controls and internal members and hours | P10b's client states |
| F124 | P10b (security): the client deny pattern missed write verbs | Completed; a spec checks every service file |
| F125 | P10b (security): `get#ItemTime` gave a client everyone's entries on a shared item | Fixed |
| F126 | P10b (security): `create#ReviewComment`/`store#ReviewAnchor` write with authz off, so a viewer client could comment; `get#ReviewThreads` gave review notes to any viewer | Review services refuse clients |
| F127 | P10b (security): Code services named Restricted and unshared items on branches, commits and release merge requests | `get#VisibleWorkEfforts` |
| F128 | P10b (security): `get#RecordLinkInfo` skipped the client rule with authorization off (webroot chat transitions) | Fixed; F121 closed |
| F129 | P10b (security): public rooms joinable and mentionable for clients, `userStatuses` gave any presence, agents acted in rooms with clients and any poster decided their cards, `ec.llm` and AI tasks had no per-user check | Fixed for EXTERNAL_USER |
| F130 | P10b (security): the release-notes draft showed to anyone who could see the release | Published notes only for clients |
| F131 | P10b (security): InvoiceDetail's writes relied on the access default view | They ask for change |
| F132 | P10b (security, open, framework): `submit#MergeRequestReview` lets any viewer review and a viewer's approval counts toward branch-rule approvals | Count approvals only from users with the push right |
| F133 | P10b (security, open, framework): a SubscreensItem's `userGroupId` is not checked for the first screen of a lastStandalone render | Framework, later (ClientHours shows an internal user nothing) |
| F134 | P10b: client email needs EXTERNAL_USER and PROJECT_CLIENT granted together | §1.1 to say both |
| F135 | P10b: reloading seed into an old DB keeps the P10a rows, so clients stay refused Billing there (fails closed) | Fresh load |
| F136 | P10b: host `collab::dav_routes_and_coediting_over_the_socket` fails at HEAD (WikiServices update#WikiPage not authorized), before P10b | Not Projects; to look at |
| F137 | P10b: a spec `then` line starting with `(` joins the previous line (ASI) | Compute in `when` |
| F138 | P11: F133's check covers transitions, which Java checks for neither | Deliberate |
| F139 | P11: the example GitHosting spec's reviewer counted only through the F132 hole | Reviewer granted push |
| F140 | P11 (lite): a service not built in marks the caller's transaction rollback-only | Callers check in their own transaction; a framework "not built" error that does not poison, or an availability check, later |
| F141 | P11 (lite, open): NewProject.spec's Money feature depends on a git-only step | Split the feature |
| F142 | P11: the terminal agent's `set` leaves a multi-select empty | Framework, later |
| F143 | P11: `hidden-form-link` has no `background-reload-id` | Framework, later |
| F144 | P11: a cell's `hidden-form-link` is not in the terminal's row-actions menu | Framework, later |
| F145 | P11: a server-static index template holds every user's conditional parts behind client conditions (names only, no data) | Specs read html for what a user is offered |
| F146 | P11: the static check of Projects Home and Overview reports an unclosed element; Billing's fails in the wrapped `ec` | Stay server merges; look later |
| F147 | P11: most Projects XML screens read their list in conditions, so only seven are server-static clean (as Commons) | As is |
| F148 | P11: an allocation date via `ec.l10n.format` reads a day early in the spec's zone (F79) | Spec compares millis |
| F149 | P11: node runs 230 tests; P10b reported 262 | Check the count |
| F150 | P11: an empty terminal list shows its own empty text beside MyTime's | Cosmetic |
| F151 | P11 (fixed): the terminal Docs tab pointed at a missing screen; the tab twins showed another project for an unseen one | Fixed |
| F7 | P0: a wiki space under an existing repository is documented for a repository root (`rootPageDirectory: "git://docs"`, or `rootPageLocation` `git://<repositoryId>/<SPACE>.md`), not for a subdirectory such as `git://<repositoryId>/docs` | Checked in P4 as the design's §15 row says, before ProjectDocs is built |

## 7. Later

Designed, not in this build:

- `view-timeline` (the Timeline stays a `.qvue`), list grouping (`form-list` `group-by`), board WIP limits, Timeline
  baselines (design §15, §16).
- Time import presets for Toggl, Harvest and Clockify (§16).
- A link to `mantle.other.budget` and GL posting of project cost (`post#WorkEffortCost`), Accounting's (§16).
- Code search and editing repository files in the browser: the developer tools app (§16). Forks (§16).
- Custom fields on work items, with the visual developer tools (§16).
- A project forum setting (§16).
- The client mode and the public request form (`screen/RequestIntake.xml` at `/r/<token>`, P5) move to mr-pass as
  the Client app, since public-facing applications go there and internal ones stay in mr-boss (decided Oct 28, 2026;
  impl-customer-service §4). The addendum, §9, plans it.
- `get#VisibleProjectInfo` returns id lists for an IN condition; an organization with thousands of projects wants a
  subquery or a view instead.
- A sequence refill with a bank of 1 can skip one number across a server restart.
- Git (P3a): revision expressions such as `main~1`; checking a reviewer's view right when added; forks; a webhook for a
  new branch lists the last 20 commits rather than only the new ones. Merge request notifications are P3b.
- The tree view (P1): sorting siblings by a column, CSV and XLSX level and outline columns, an indented `html-print`,
  the add-sub-item button on a row, Enter and Ctrl+Enter in the quick-add row, the drop line at the landing depth, the
  focused row's guide line in the primary color, a confirmation before Expand all passes 500 rows (it stops with a
  message), and in the tui tree fetched levels, ancestors, moves and the totals row.

- Projects Home (P2): the timer strip, reviews waiting, approvals, Unbilled and the charts wait for their phases; the
  counts service answers null for them. Projects' timeline view link (P4). A copy button for clone URLs (templates have
  no clipboard helper). QuickWorkItem's types do not reload when the project changes in the form.

- Code (P3b1): requiring a work item key in commits to protected branches (a pre-receive rule); copy buttons for clone
  URLs; the palette's New merge request (Compare needs a repository); the Code screens' client states (P10); the
  current LFS patterns on Files; specs for mirrors, storage and export; TUI checks of the Code screens.

- Code (P3b2): MergeRequests' updated-period find; a link from a line comment in Chatter into Changes; @mentions in line
  comments; the terminal diff for Changes (P11); the Development tab's Unlink on phones; a screenshot of side-by-side.

- Planning (P4a): the Backlog's moves and dialogs in the terminal (P11); Reports/Sprints with velocity (P9); holidays in
  the burndown; capacity from availability (P7); QuickWorkItem's sprint list shown when empty.

- Planning (P4b): MilestoneDetail's gate, billing share and deliverables, and the Roadmap's Awaiting approval (P8); in-place
  edits of MilestoneDetail's items; the Docs tab's project mode in the terminal; a Components box in Settings; a record
  of the CHANGELOG commit; drag on the Roadmap calendar; client views (P10).

- Planning (P4c): Timeline moves in the terminal (P11); rescheduling a moved subtree's dependents; the Redmine and GitHub
  presets checked against real exports; month labels kept in view; portfolio moves; client states (P10).

- Requests (P5): Home's requests counter and the Today source; a Projects quick-create Request kind; the confirmation
  email's template; request items and purchase orders; sending the resolution by email; request categories; client
  states (P10); terminal triage dialogs; a spec of form uploads.

- Time (P6a): Start timer on the last item from Home; MyTime's global pins; leave and capacity in working hours (P7); a
  TimesheetDetail print view; clock-in for another and InvoiceMyTime; time in the terminal (P11); reminders in each
  person's time zone.

- Time (P6b): TeamTime; import presets for Toggl, Harvest and Clockify (§16); item search in the entry dialog; chip
  counts on TimeEntries; clock-in for another; time edits in the terminal (P11); ProjectTime's client states (P10);
  imported rows stacked after a day's existing entries.

- Resources (P7): planner changes in the terminal (P11); request again after a rejection; allocations on one work item
  in the screens; a leave marker in MyTime; a skills settings page; the planner grouped by team; sprint capacity from
  availability; people's own leave records; a screen test of the tray's decisions.

- Billing (P8a): Unbilled's Contractor time and Milestones due (P8b); the project's Billing box in settings; payments and
  adjustments (Accounting); the invoice email in Chatter; client states (P10); TUI checks.

- Billing (P8b): Unbilled's Contractor time and the worker summary; emailing the estimate; agreements, opportunities,
  purchase lines and MaterialEstimates on Money; a project from an order line (Sales); milestone gates in Home's
  Approvals block; TUI checks.

- Reports (P9): saved reports on the index; Home's schedule warning; phone columns for secondary tables; indented tree
  exports (with the tree items above); TUI checks beyond rendering.

- Client access (P10b): `view-calendar` move-condition; clients accepting deliverables; hiding the Code and Hours tabs
  when nothing is shared; cloning for a client with a second factor; an HTTP-level DAV/SFTP test as a client; a link in
  the estimate email; clients' presence to internal users.

- Finish (P11): terminal drags, MyTime cell typing, Add row and Copy last week; Backlog quick add, filters and multi-move;
  the Timeline's plan and portfolio modes and the Calendar twin read only; TeamPlanner request, staff and By project in
  the terminal; Changes side by side, viewed marks and review in the terminal; Docs editing and repository setup in the
  terminal; framework F140, F142, F143, F144, F146; F141.

## 8. Verification

- **Per phase,** the "Done" rule of §2 and the phase's "usable when".
- **End to end,** `./moq run`, signed in as `john.doe` (and the demo client user from P10), walking each built phase's
  "usable when" in order.
- **Client walks** with `moqui test-client mr-boss --serve` (mr-moqui `docs/dev/Client-Testing.md`).

## 9. Addendum: the client portal in mr-pass

Oct 28, 2026 — planned, not built; C0 partly done (F152–F158, found while writing it)

Public-facing applications go in mr-pass and internal ones stay in mr-boss (decided Oct 28, 2026;
impl-customer-service §4). P10 gave clients the client states of BOSS's Projects screens. This addendum gives them a
PASS app instead, **Client**, the client portal, on the pattern of Accounting's Billing and Supplier apps
(impl-accounting P18) and Customer Service's Support app (impl-customer-service P13, P15), and then retires the client
mode in BOSS. The rules it serves are design-projects §1.1's and what P10 built; the app's page design is written when
C0 closes, as `mr-pass/plan/design-client.md`, and design-projects §1.1, §6 RequestIntake and §15 then point to it.

**Inputs.** design-projects §1.1, §4 (ProjectDetail, MilestoneDetail, ReleaseDetail), §5 WorkItemDetail, §6
(Requests, RequestDetail, RequestIntake), §10 Billing and §15 Client access; P5, P8b and P10 here, with F114–F137;
`mr-pass/plan/design-forum.md` §1, §4, §5 and §13.1; impl-accounting §2 and P18, and impl-customer-service §2 and
F41–F43, for the PASS pattern.

### 9.1 Scope and order

- **Repositories:** `runtime/component/mr-mantle`; `runtime/component/mr-pass`, the app; `runtime/component/mr-boss`,
  for the invitations, the old form's redirect and C7. Framework work only if C5 needs a git read the framework lacks.
- **Scope:** everything a P10 client can do, in the Client app:
  - Home: counters, gates waiting, projects, requests, replies, milestones and invoices due;
  - the client's projects: the overview, the status updates posted for the client, shared work items, milestones,
    and releases with their published notes;
  - a shared work item with the messages for the client, and the hours when the project shares them;
  - requests: raise one with files, add files while it is open, cancel one it raised, and read it with its outward
    messages;
  - send a message, and reply, to the record's internal people;
  - decide a milestone gate as its approver, which is how an estimate is approved;
  - sent invoices, read only, paid through Accounting's Billing app once it is built;
  - shared repositories, read only;
  - the project's public request form, today RequestIntake at `/r/<token>`.

  Then BOSS's client mode is retired (C7).
- **Order** (proposed): checks; the foundation; projects and work; requests and messages; gates, estimates and
  invoices; shared repositories; the public request form; retiring BOSS's client mode. When to build it is §9.5's.

### 9.2 Ground rules

- **PASS's pattern** (impl-accounting §2, impl-customer-service §2): PASS's shell and app mounts; HTML with qvue at
  390 px and on the desktop, with no terminal UI; public accounts with only `ALL_USERS`, so no `BOSS_PROJECT_CLIENT`
  group; pages call only Mantle services through `pass.Facade.call#Operation` (`Schema.js`, `Routes.js`, Mantle's
  PassApi), so a remote PASS frontend works too; PASS's request contract, its media staging and scanning, and bearer
  links as pages taking their tokens.
- **One client rule, in Mantle.** Design-projects §1.1's rule, as Mantle's `get#ClientProjectInfo`,
  `get#VisibleProjectInfo`, `get#ClientRecordVisibility` and `filter#ClientAudience` apply it, is the only rule. A
  Client app operation applies it to its caller always, without the `PROJECT_CLIENT` permission BOSS's client mode
  reads (F153).
- **What the app calls is Mantle's** (impl-customer-service F41). `mantle.work.ClientPortalServices` holds the
  client's reads and the writes `ironstone.client.ClientServices` holds today (F152); the BOSS services call the Mantle
  ones until C7 removes them.
- **Nothing internal leaves.** P10's isolation holds for every operation: no Chatter note or activity, rate, cost,
  allocation, other client, internal member, setting, unshared item or unpublished note. A refused action is absent
  from the projection's capabilities, as P10b hid refused controls.
- **Done for a phase:** §2's Done for the Mantle and BOSS parts; `./moq test mr-pass mr-mantle mr-boss` with the app's
  specs, among them `ClientPortalAccess`, which carries ClientIsolation's cases over to the operations; the remote
  pair on PASS's RemoteFixtures pattern; `moqui test-client mr-pass --serve` on ForumHttp's and RemoteHttp's pattern;
  lint clean for PASS; WorkProjectClients and the BOSS Client specs
  passing until C7 changes them; the phase's walk, and its row and **Built** note here.

### 9.3 Phases

| Phase | Repos | Pages | Status |
| --- | --- | --- | --- |
| C0 Checks | all (read) | — | partly done Oct 28 (§9.6 F152–F158) |
| C1 Foundation | Mantle, mr-pass, BOSS | the Client app root, Home | — |
| C2 Projects and work | Mantle, mr-pass | Projects, ProjectDetail, WorkItemDetail, MilestoneDetail, ReleaseDetail, Hours | — |
| C3 Requests and messages | Mantle, mr-pass, BOSS | Requests, RequestDetail, NewRequest | — |
| C4 Gates, estimates and invoices | Mantle, mr-pass, BOSS | MilestoneDetail's decision, Estimate, Invoices, InvoiceDetail | — |
| C5 Shared repositories | Mantle, mr-pass (mr-moqui, C0) | Code, a repository's files, history and releases | — |
| C6 The public request form | Mantle, mr-pass, BOSS | RequestForm | — |
| C7 Retiring BOSS's client mode | Mantle, BOSS | — | — |

#### C0 — Checks

Each result is a row in §9.6 and, where it changes the design, an edit there. Still to check:

- **PASS app registration.** What Accounting P18 settled for its Billing and Supplier apps, and Customer Service's
  Support app if built (impl-customer-service F43). If neither is built yet, C1 settles it as they would.
- **The client rule's services.** Which read `PROJECT_CLIENT` or the user's groups, and how a PASS public account's
  party reaches them (F153).
- **A client's account through the move** (F154, §9.5): what a client keeps (its party, messages, files and
  decisions) and how PASS classifies an account that still holds `BOSS_PROJECT_CLIENT`.
- **Client links** (F155): every email, notice and print a client gets, and the page each should open.
- **Client files** (F156): whether a client's file list of a visible request includes RqCntInternal content.
- **Shared repositories.** Which framework git reads a Mantle projection can serve to a remote frontend (tree, file,
  log, tags) and their size limits, for C5.
- **The public form.** RequestIntake's checks (honeypot, CAPTCHA, the per-project and per-address limits) in a PASS
  page, and a redirect from `/r/<token>` on BOSS's host to the project's site (C6).
- **Demo.** sheldon.acme (ACME) and gob.bluth (BLUTH), and the demo PASS site the other apps add.

#### C1 — Foundation

- **The app:** `screen/Client.xml` under PASS's `Pass.xml`, the `client` app of `PublicSiteApp` mounted at `/client`,
  its target the organization whose projects it serves; its navigation, readiness and operator configuration as
  Accounting P18's apps have them.
- **Access:** `mantle.work.ClientPortalServices.get#ClientContext`, the caller's party, its client organizations and
  its client projects by the one rule; every operation starts with it.
- **Invitations:** ProjectDetail's client contacts in BOSS gain Invite to the client portal, for project managers: a
  PASS invitation bound to the Client app and the client organization. Redeeming it gives site membership and the
  contact relationship the rule reads (`PrtContact` or `PrtRepresentative`). Domain matching never makes a client.
- **Home:** as P10b's client Home: gates waiting, open requests, unread replies, milestones due and projects; invoices
  due come with C4.
- **Demo:** the demo PASS site gains the Client mount, with sheldon.acme and gob.bluth invited.
- **Specs:** `ClientPortalAccess`, started.
- **Usable when:** sheldon.acme signs in on the PASS site and sees ACME's projects only, and gob.bluth BLUTH's only; a
  forged project ID is concealed (404); an anonymous visitor is asked to sign in; the same through a remote frontend.

#### C2 — Projects and work

- **Mantle reads**, as projections with capabilities, revisions and cursors: `find#ClientProjects`,
  `get#ClientProject` (overview, counts and the status updates for the client), `find#ClientWorkItems` (shared items
  only, as a tree), `get#ClientWorkItem` (with the messages for the client, through `filter#ClientAudience`),
  `get#ClientMilestone`, `get#ClientRelease` (published notes only) and `find#ClientTime` (only when the project shares
  hours, and only the entries a client may see, F125).
- **Pages:** Projects, ProjectDetail (Overview, Work items, Roadmap, and Hours when shared), WorkItemDetail,
  MilestoneDetail and ReleaseDetail.
- **Usable when:** ACME's client sees the shared work items but not a Work group or Restricted one, the status updates
  but not a note, hours only with sharing on, and a release's notes only once published.

#### C3 — Requests and messages

- **Mantle writes**, the cores of `ironstone.client.ClientServices` (F152): `send#ClientMessage` and
  `reply#ClientMessage` (to the record's internal people only: its assignees and the project's managers, never another
  client or an outside party), `raise#ClientRequest` (the public form's kinds and limits), `add#ClientRequestFiles`
  (while open, through PASS's media staging and scanning into RequestContent) and `cancel#ClientRequest` (one it
  raised); and the reads `find#ClientRequests` and `get#ClientRequest` (outward messages and client-visible files only,
  F156). BOSS's ClientServices call them until C7.
- **Links:** a reply's notice and `send#ProjectUpdateEmail` link to the Client app's page on the project's site (F155);
  `filter#ClientAudience` is unchanged.
- **Pages:** Requests, RequestDetail and NewRequest.
- **Usable when:** the client raises a request with two files, one refused by scanning and named, then adds a file and
  cancels it; a reply reaches the item's assignees and the managers, not another client; a note's text is in no notice.

#### C4 — Gates, estimates and invoices

- **Gates:** `decide#ClientGate` in Mantle: approve, or refuse with a reason, as a `WorkEffortApproval`; the estimate is
  approved through its Estimate milestone's gate; a manager's decision `recordedFor` the client stays (P8b, F100).
  `send#EstimateEmail` links to the Client app's MilestoneDetail and to the estimate as sent, its stored PDF (F155).
- **Invoices:** `find#ClientInvoices` and `get#ClientInvoice`: invoices sent to the client's organization, read only.
  Pay opens Accounting's Billing app (impl-accounting P18) when it is built; until then there is no pay action.
- **Pages:** MilestoneDetail's decision, Estimate, Invoices and InvoiceDetail; Home's invoices due.
- **Usable when:** ACME's approver approves the estimate from the email's link, and the project and its orders move as
  P8b's walk says; a contact who is not the approver sees the gate without the decision; a draft invoice never shows,
  and a sent one shows read only, with Pay once Billing exists.

#### C5 — Shared repositories

- **Mantle reads**, for a repository the project shares with the client (F119): `find#ClientRepositories`,
  `get#ClientRepositoryTree`, `get#ClientRepositoryFile`, `find#ClientCommits` and `find#ClientReleaseTags`, over the
  framework's git reads, naming no Restricted or unshared item (F127). No compare, review threads, CI statuses, access
  or settings, as P10b.
- **Pages:** Code, with a repository's files, history and releases.
- **Usable when:** ACME's client browses a shared repository's files and history; an unshared repository is concealed;
  a commit that names a Restricted item shows it unnamed.

#### C6 — The public request form

- RequestIntake becomes the Client app's RequestForm page, anonymous, taking the project's token through
  `check#IntakeToken`: P5's form, honeypot, CAPTCHA, limits and file rules, with the files through PASS's media;
  `create#IntakeRequest` is unchanged.
- `/r/<token>` on BOSS's host redirects to the page on the project's site, so the links already sent keep working;
  `screen/RequestIntake.xml` and the `r` token route then leave BOSS.
- A Customer Service queue's form is its Support app's (impl-customer-service P15), on the same token service.
- **Usable when:** an old link redirects and its submit makes the request; an unknown, rotated or turned-off token says
  the form is not available; ProjectRequests and RequestWalk pass against the new page.

#### C7 — Retiring BOSS's client mode

- Each client user moves to a PASS account for its party, as §9.5 decides, invited and told by email.
- In BOSS: `BOSS_PROJECT_CLIENT`'s memberships end and the `BOSS_PROJECTS_CLIENT` authz goes; the client states of
  Home, ProjectDetail, Overview, WorkItems, WorkItemDetail, Requests, RequestDetail, MilestoneDetail, ReleaseDetail,
  ClientHours, Billing's client view and the shared repositories are removed; `ironstone.client.ClientServices` is
  removed once its Mantle cores serve the app (C3, C4). The `BOSS_PROJECTS_INTERNAL` deny patterns and
  `EXTERNAL_USER` stay, refusing anyone left with a client grant.
- Specs: ClientWalk, ClientWrites, ClientBilling, ClientCode, ClientChatDrive and ClientIsolation become "a client
  account reaches no BOSS screen or service", their cases carried by `ClientPortalAccess`; WorkProjectClients is
  unchanged.
- design-projects §1.1 and §15 describe the Client app.
- **Usable when:** sheldon.acme walks all of P10's client walk in the Client app; at BOSS's sign-in the same account
  reaches nothing; internal users' Projects is unchanged.

### 9.4 Decisions

| Date | Decision | Notes |
| --- | --- | --- |
| Oct 28, 2026 | Project clients get a PASS app, Client, in mr-pass, on the pattern of the Billing, Supplier and Support apps | The user's call (Oct 28): public-facing applications in mr-pass, internal ones in mr-boss |
| Oct 28, 2026 | Once the app does everything P10 gave clients, BOSS's client mode is retired (C7) | The plan's choice, following the user's rule; until then both work |
| Oct 28, 2026 | The app is named Client, mounted at `/client` | The plan's choice |
| Oct 28, 2026 | Mantle holds the client's services, `mantle.work.ClientPortalServices`, with the writes `ironstone.client.ClientServices` holds today | Follows from PASS's pattern (impl-customer-service F41) |
| Oct 28, 2026 | The public request form joins the Client app (C6), with the old links redirected | The plan's choice; it was §7's later move |

### 9.5 Open questions

| Question | Decides | Notes |
| --- | --- | --- |
| When to build the addendum | before C1 | Recommended: after Accounting P18, so the app follows the registration P18 settles and Pay opens its Billing app. It needs nothing from Warehouse, Manufacturing, Purchasing or Customer Service. Built earlier, C1 settles the registration itself and C4 leaves Pay out |
| A client's account through the move (F154) | before C7 | Recommended: the same UserAccount with its BOSS group ended, so the party, its messages and its decisions stay one identity; a new account only for a client who wants a separate sign-in |

### 9.6 Findings

| # | Finding | Resolution |
| --- | --- | --- |
| F152 | C0: a client's only writes are BOSS services, `ironstone.client.ClientServices` (`send#` and `reply#ChatterMessage`, `raise#` and `cancel#ClientRequest`, `store#ClientRequestFiles`, `upload#ClientRequestFile`, `decide#ClientGate`), with `get#ClientHome` and the write checks; a PASS page cannot call them | C3 and C4 move their cores into Mantle; C7 removes them |
| F153 | C0: Mantle knows a client by the `PROJECT_CLIENT` permission (`get#VisibleProjectInfo`'s `isClient`), which the BOSS group grants; a PASS public account holds no permission | The Client app's operations apply the rule to their caller always (§9.2) |
| F154 | C0: PASS counts an enabled account with any group beside `ALL_USERS` as internal (design-forum §5.1), so a client still in `BOSS_PROJECT_CLIENT` would be internal for PASS's and Comms' receipts and recipients | C7 ends the group; §9.5 |
| F155 | C0: what a client is sent links into BOSS: the estimate's print and milestone URLs (`/apps/Projects/Projects/EstimatePrint`, `/qapps/Projects/Projects/MilestoneDetail`, built in ironstone.projects BillingServices), and the project update and estimate emails | C3 and C4 link to the Client app's pages |
| F156 | C0: a client's file list of a visible request may include RqCntInternal content (impl-customer-service F18) | C0 confirms; C3 lists client-visible files only |
| F157 | C0: RequestIntake is a BOSS public page, `screen/RequestIntake.xml` at `/r/<token>` (a `<token-route>` in BOSS's `MoquiConf.xml`), its token the project's `WstIntakeToken` | C6 |
| F158 | C0: the demo clients sheldon.acme and gob.bluth hold `BOSS_PROJECT_CLIENT` and `EXTERNAL_USER` (F134) | C1 invites them to the app; C7 ends their BOSS grants |

### 9.7 Later

- §7's client items, where they still apply, in the app: clients accepting deliverables, and their presence to
  internal users. The others end with BOSS's client mode (C7), and the estimate email's link is C4's.
- The app's terminal pages, when PASS gains a terminal UI.
- Calendars, DAV and SFTP for clients, which PASS does not offer.

### 9.8 Verification

- **Per phase,** §9.2's Done and the phase's "usable when".
- **End to end,** the demo PASS site as sheldon.acme and gob.bluth, locally and through a remote frontend, walking
  each built phase's "usable when" in order; after C7, P10's client walk as the same steps in the app.
