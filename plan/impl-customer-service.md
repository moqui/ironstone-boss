# IronStone BOSS — Customer Service implementation

Oct 28, 2026 — plan; P0 partly done (F1–F43, found while writing it); the phase order and the open questions decided
(§4), on the shared party-role and effective-date rules (impl-drawers-commons §4); the customer pages as a PASS app in
mr-pass (§4)

How [design-customer-service.md](design-customer-service.md) gets built, in phases from the foundation to the Support
app, each ending tested and usable. This file is kept at a high level, as [impl-products.md](impl-products.md),
[impl-accounting.md](impl-accounting.md), [impl-warehouse.md](impl-warehouse.md),
[impl-manufacturing.md](impl-manufacturing.md) and [impl-purchasing.md](impl-purchasing.md) are: each phase names its
scope by the design's sections and §12 needs rather than restating them, and the design stays the place for screen and
record detail. During the build this file is the log: phase status and what each built, the decisions made, open
questions, findings against the code, and what is deferred.

Today `screen/CustomerService/` holds eight flat placeholders, and the root mounts only Chatter and RecordFiles. The
`BOSS_CUSTOMER_SERVICE` authz is in BossSetupData's commented not-yet-implemented block (F1). None of the design's
proposed services, entities, fields or status items exist in Mantle or BOSS beyond what the five apps built before it
provide. Customer Service is the last of the six core apps (§4), so these are there to extend:
- from Products: Product360 with its substitutes (PatEquivalent, PatReplacement) and `check#ProductUsable` on both
  order-entry paths (P2); `store#ProductPrice`, the resolver with its trace and `Shared/PriceExplain` (P5);
  `Shared/InventoryAvailability` (P7);
- from Accounting: the AR, treasury, approve and read groups (P1); the CX-POSTING operation record (P2);
  `Shared/Customer360`, InvoiceDetail's receivables context and `send#Invoice` (P4); `Shared/ShipmentDetail` and the
  Approvals mount (P6); CX-ORDER-HOLD's `hold#Order` and `release#OrderHold`, and `CreditServices` with
  `evaluate#OrderCredit` and Customer360's Credit tab (P10); `receive#ReturnItems`, the conditioned return SECAs,
  `preview#Return` and `settle#Return`, `release#ShipmentDraftInvoice`, `refund#OrderPayment` and `Shared/ReturnDetail`
  (P17); CX-PORTALS' `ExternalAccessServices`, the invoice's pay link, and the PASS Billing and Supplier apps, the
  first beyond Forum, which settle how a PASS app registers (P18);
- from Warehouse: the receive, inspect and quality-manager groups (P1); CX-QUALITY with `Shared/QualityInspection` and
  the disposition vocabulary (P8); `record#ShortPick` with ShipmentPickException, and the cancelled-balance flag (P11);
  ReopenPackage (P12); WH-LABEL and its test gateway (P13); ReturnReceipt, `request#ReturnLabel` and ReturnContent (P14);
  `Shared/StockAtDate` with `get#InventoryAtDate` (P17);
- from Manufacturing: the maintenance request and AssetMaintenance on EquipmentDetail (P11), beside which a warranty
  repair sits;
- from Purchasing: the approval decision pattern with its stale-revision refusal (P3, P4); supplier returns (P8), which
  a customer case links to; CX-REQUEST's type check in `complete#RequestFromWork` and RequestDetail's Items tab in
  every context (P10); agreement statuses (P13);
- from Projects: `Shared/RequestDetail`, `Shared/WorkItemDetail`, `Shared/OrderDetail`, `Shared/InvoiceDetail`,
  `complete#RequestFromWork`, and the intake settings and tokens;
- from Commons: notification topics with approve and refuse services, Notifications, Chatter, RecordFiles, Compose with
  its text-block picker, Knowledge with WikiPageReview, the working hours of Preferences, and the palette, quick-create,
  Today and record-link providers;
- from PASS (mr-pass), where the customer pages go as a new app (§4): its public shell, sites with their host and app
  mounts, public accounts and invitations, the `pass.Facade` operations with Mantle's PassApi routes for a remote
  frontend, media staging and scanning, and the forum's case services.

**Inputs.**
- Designs:
  - [design-customer-service.md](design-customer-service.md)
  - [design-crosscut.md](design-crosscut.md) §1.3 (the automation register), §1.4, §3.1, §3.2, §3.5–§3.8, §3.11,
    §3.12, §3.15, §3.16, §3.18, §3.19, §3.26, §4.4, §5, §5.1, §7.1 (CX-ACCESS, CX-REQUEST, CX-AVAILABILITY,
    CX-QUALITY, CX-CREDIT, CX-POSTING, CX-APPROVAL, CX-PRICING, CX-LABELS, CX-RETURNS, CX-ORDER-CHANGE, CX-PORTALS),
    §8 (the survey builder) and §9
  - [design-projects.md](design-projects.md) §6 Requests
  - [design-drawers-commons.md](design-drawers-commons.md) §4, §6, §7, §10 and §15
  - [design-accounting.md](design-accounting.md): AC-02, AC-11, InvoiceCorrection and the ReturnDetail settlement
  - [design-warehouse.md](design-warehouse.md): §9 (the short pick), §11 returns and §14 StockAtDate
  - [design-products.md](design-products.md): Product360 and PRD-PRICE
  - `mr-pass/plan/design-forum.md`: §1 (the public shell and app mounts), §4 (deployment, the authority boundary and
    the request contract), §5 (identity, membership and invitations), §13.1 (the shared foundation) and §13.4 (the
    forum's case escalation)
- Plans:
  - [impl-products.md](impl-products.md): the pattern; P2, P5 and P7; the BOSS client screenshot spec (its F23).
  - [impl-accounting.md](impl-accounting.md): P4, P6, P10, P17 and P18, its rule flags, operation record and pack
    invoice (§4), and its §7 list of Customer Service's contexts and callers.
  - [impl-warehouse.md](impl-warehouse.md): P8, P11, P13, P14 and P17, and its §7 list.
  - [impl-purchasing.md](impl-purchasing.md): P3, P4, P8, P10 and P13, and its §7 list.
  - [impl-manufacturing.md](impl-manufacturing.md): P11.
  - [impl-projects.md](impl-projects.md): P5 (requests and intake), P8 (OrderDetail and InvoiceDetail) and P10 (client
    access).
  - [impl-drawers-commons.md](impl-drawers-commons.md): M2 (topics), M6 (requests), M7 (calendar), M9 (knowledge).
  - `mr-pass/plan/implementation-forum.md`, `mr-pass/docs/Deployment.md` and the mr-pass README's development checks:
    what PASS built, its local and remote deployments, and how its specs run.
- The design review: [review-core-apps.md](review-core-apps.md) (D1–D28) and
  [review-core-apps/customer-service.md](review-core-apps/customer-service.md), which explain the design's D- and R- IDs.
- Guides and rules: [design-doc-guide.md](design-doc-guide.md), [style-guide.md](style-guide.md) §8, and
  [impl-drawers-commons.md](impl-drawers-commons.md) §4 (the shared rules, with the party-role and effective-date rules).
- Inventories: [ss-inventory.md](ss-inventory.md) and [usl-inventory.md](usl-inventory.md), which already carry the
  design §10 **Designed in** paths.
- mr-moqui: `plans/Remaining-Work.md` and `docs/Testing.md`.

Framework paths are under the mr-moqui checkout (`crates/`, `runtime/base-component/`), Mantle paths under
`runtime/component/mr-mantle/`, PASS paths under `runtime/component/mr-pass/`.

Sections: [1 scope](#1-scope-and-order) · [2 rules](#2-ground-rules) · [3 phases](#3-phases) ·
[4 decisions](#4-decisions) · [5 open](#5-open-questions) · [6 findings](#6-findings) · [7 later](#7-later) ·
[8 verification](#8-verification)

---

## 1. Scope and order

- **Repositories.** Each is its own git repo:
  - `mr-moqui` (`crates/`, `runtime/base-component`)
  - `runtime/component/mr-mantle`
  - `runtime/component/mr-boss`, the internal app
  - `runtime/component/mr-pass`, the customer pages as its Support app (§4)

  `runtime/component/mr-marble` is read only, for the baseline Request, Return, Customer, Order and Survey screens that
  design §10 maps. Framework work is limited to what P0 finds CS-FORM-ELEMENTS needs (P5, P7), DbForm's version fields
  (P7), and a record viewers topic if P0 finds it cheap (P5).
- **Scope.**
  - Every `parity` and `new` row of design §2, and the §12 needs they use, except ChannelAutomation.
  - The design reshaped by the shared rules (§2, §4): queues, service-level policies, status mappings, assignment
    rules, templates, return policies and defaults are effective-dated rows with their key fields audit-logged, not
    versions; a case, episode, return or invitation keeps the row it was evaluated against, and the time; a case's
    organization and people are RequestParty roles; order changes and warranty claims are their Requests, and case
    templates DbForms (§4).
  - The parts of other apps' needs that Customer Service still depends on (§4):
    - CX-REQUEST: the case rules of D23 on every Request entry point, and the support-case rule in
      `complete#RequestFromWork` beside Purchasing's type check;
    - Commons: a team's working hours, the business-time service, and the survey builder (crosscut §8);
    - Accounting: a read of a customer's credit status for CS-SHARED (AC-11; F36);
    - crosscut §3.2: Customer360's CustomerServiceStatistics, ServiceAgreements and DeliveredItems forms;
    - Mantle's forum services: a queue route for `create#CaseFromTopic` (F12).
  - Shared screens: the survey builder's two screens, with the Customer Service context only. Customer Service's
    context on the fourteen shared screens other apps built:
    - Products' Product360 and InventoryAvailability;
    - Projects' RequestDetail, WorkItemDetail, OrderDetail and InvoiceDetail;
    - Accounting's Customer360, ShipmentDetail and ReturnDetail;
    - Warehouse's QualityInspection and StockAtDate;
    - Commons' contact record (ContactDetail), Knowledge, and Notifications as Approvals (crosscut §3.15).
  - The customer pages of design §8 as a new PASS app, Support, in mr-pass (§4): its own app mount beside Forum, the
    Mantle services it calls through PASS's facade, and their routes for a remote frontend. It replaces design §8's
    `screen/ServicePortal.xml` root and its `BOSS_SERVICE_PORTAL` group for Customer Service's pages (F42).
  - The callers the other plans leave to Customer Service (their §7): `authorize#Return`, `apply#OrderChange` (the
    cancelled balance and the substitute on a short pick), Issue return label, and its CX-APPROVAL topics on
    Purchasing P4's decision pattern.
  - §7 holds the `later` rows and needs, and the rest of the other apps' needs.
- **Order** (decided Oct 28, 2026), the case spine first, then the order-side work on what the other apps built:
  1. the foundation;
  2. cases and queues, with the case rules on every entry point;
  3. customers and orders, the records a case links;
  4. service levels;
  5. assignment and saved replies;
  6. channels;
  7. case templates;
  8. merge, split and closing;
  9. returns;
  10. order changes;
  11. warranty;
  12. knowledge;
  13. feedback;
  14. reports;
  15. the Support app in mr-pass;
  16. the finish.

## 2. Ground rules

- **The Commons rules hold.** These are impl-drawers-commons §4:
  - failure tolerance;
  - the Mantle-free framework;
  - the new XML element checklist of style-guide §8.1;
  - libraries through `libs/refresh.mjs`, and crates against `deny.toml`;
  - the `.qvue` gallery pattern;
  - parties by role;
  - changes by effective date and the audit log;
  - demo data;
  - builds and commits.

  Screenshots come from the BOSS `test/client` spec that Products adds (impl-products §2), as `CustomerServiceShots`.
- **Service rows through services.** Under the organization filters (impl-drawers-commons §4), Party, OrderPart, Shipment, ReturnHeader and Invoice
  are filtered, but not Request, RequestCategory, OrderHeader, OrderItem, CommunicationEvent or the Request joins (F2).
  Customer Service reads and writes them only through services: `ironstone.customerservice.AccessServices` checks the
  organization, the customer, the queue and team, the record and the capability, then the Mantle service runs.
  - `entity` in a design form summary means that guarded path, never a bare entity form.
  - Grants are checked in the services, so they hold for exports, search, the palette, notifications and shared
    mounts. The `BOSS_CUSTOMER_SERVICE_*` groups get no artifact authorization for the raw Mantle request, return and
    order mutators or their REST paths.
- **Public pages in mr-pass, internal ones in mr-boss** (§4). The customer pages are the PASS Support app, on PASS's
  foundation (design-forum §1, §4, §5):
  - PASS's public shell and its host and app-mount routing, with Support as an app beside Forum; server-rendered HTML
    with qvue enhancement, working at 390 px. PASS has no terminal UI yet, so design §8's terminal equivalents wait
    for it (§7).
  - Public accounts hold only `ALL_USERS`; PASS roles live in its membership records. A customer contact reaches a
    customer's records through Mantle's checks of the contact's customer relationship and of
    `ExternalAccessCapability`, never through a UserGroup, so `BOSS_SERVICE_PORTAL` is not used here.
  - The app reaches the authority only through `pass.Facade.call#Operation`: each operation is in PASS's
    `Schema.js`, its route in `Routes.js`, and Mantle's PassApi servlet serves it to a remote frontend. The same pages
    work with a local Mantle or a remote authority with only framework, webroot and PASS installed. BOSS is not a PASS
    runtime dependency, so no `ironstone.*` service, BOSS screen or BOSS group is called.
  - PASS's request contract: allow-listed projections with capabilities and revisions, opaque cursors, operation IDs
    on creates, `expectedRevision` on changes, and its HTTP result kinds (design-forum §4.3).
  - A bearer link (an RMA, a feedback invitation, a queue's public form) is a page of the app that takes its token, as
    PASS's Unsubscribe does, checked by Mantle's `check#AccessToken`, not a BOSS `<token-route>`.
  - Uploads go through PASS's media staging and scanning, finalized into the record's content.
- **What Mantle runs is Mantle's** (F41). The Request rules, the jobs and the Support app call Mantle services only:
  `mantle.request.SupportCaseServices` holds the case core they need (`ensure#CaseProfile`, `assign#Case`, the
  template checks, closing) and the customer services, beside the design's Mantle families (ReturnPolicyServices,
  SlaServices, WarrantyServices, CaseFeedbackServices). `ironstone.customerservice` keeps the BOSS screens'
  orchestration, settings and reports, and calls the same Mantle services.
- **Audience on the server.** Every message, file, link, status label, count and print is customer-visible or internal
  by a server rule, never by a hidden field. A customer contact, a customer-visible print and a customer notice get
  outward messages, approved shared files and customer labels only; no internal note, internal file, staff detail,
  other customer, cost or supplier value. A service leaves out of its answer any cost, supplier price, credit fact or
  financial amount the user may not read; it is omitted or said to be withheld, never shown as zero (design §1).
- **Service records follow the shared rules** (impl-drawers-commons §4; §4 here):
  - Parties by role: a case's organization is a RequestParty in the OrgInternal role, as Purchasing's request is
    (impl-purchasing §4); its customer, contact and assignee are RequestParty rows in the Customer, Reporter and
    Assignee roles; a team member is a dated PartyRelationship from the agent to the team; a return's assignee is a dated
    ReturnParty row (F24). The fields Mantle keys by stay: Request's filer, ReturnHeader's customer and vendor. A queue's
    organization is an owner field on RequestCategory (F6), as Products P3 gave feature groups one.
  - Policies and settings are effective-dated rows with their key fields audit-logged: the queue settings, ServicePolicy,
    ServiceLevelPolicy and its targets, CaseStatusMapping, ServiceAssignmentRule, team participation, ReturnPolicy,
    ServiceKnowledgeSource and the feedback delivery policy. A draft is a row with no from date; Publish sets it and ends
    the row it replaces. A case, episode, return or invitation keeps the row it was evaluated against, and the time.
  - The audit log on the key fields a phase locks: Request's type, category, priority, due date and resolution (status
    is logged already), ReturnHeader's new fields, and the order-change and warranty fields of P10 and P11.
  - Records of their own stay where a fact has its own identity, and the phase says why: the SLA episode and its events
    (measurements, like postings), a case relation (merge, split, follow-up), the order-change and warranty decisions
    (as PurchaseApprovalDecision), the return authorization decision, article feedback, the feedback invitation, and the
    assignment cursor.
  - Prints take an effective date and time. A key revision stores its PDF on its record: the RMA authorization as
    ReturnContent, an applied order change and the order confirmation as OrderContent, a resolved case's summary as
    RequestContent when sent.
- **One case clock** (D23). A case's status changes, messages and linked work, from any screen or service, reach the
  SLA through Mantle's Request rules, not through Customer Service's screens alone. Every path that changes a case's
  status, due date or resolution outside Customer Service (F8) either records through the rule or refuses with the reason
  and a link to CaseDetail. `Request.responseRequiredDate` on a case is written by SlaServices only.
- **Revisions and operations.** Every authorization, application, decision, settlement call, bulk action, saved-reply
  apply, send and Support app submission names its source revision and an operation identity. A retry answers the first
  result, and a stale revision is refused naming the current one. The operation record is Accounting P2's
  CX-POSTING record (impl-accounting §4). A batch names each failure and goes on: cases, replies, returns,
  invitations, feedback reviews. One merge, split, authorization or application with its links commits atomically.
- **Shared screens.** Customer Service builds only the survey builder's two screens (§4). It adds its context to the
  shared screens of §1, each taking `appRoot` and server-derived capabilities on `Shared/RequestDetail`'s pattern, and
  its context adds no right a borrowed capability does not give: W and F act from Customer Service's mounts without the
  Warehouse or Accounting root, and A sees what they do read only (design §1).
- **Owner contracts.** A contract built here for another app follows that app's design: its package, its record and
  service names, its Shared screen and its capability groups. A change found while building it is written into the
  owner's design. The owner's own screens stay with the owner.
- **Mantle rule changes keep Mantle's default.** Each new rule or refusal in Mantle acts only on a case (a request in a
  service queue), a queue route or a feedback invitation, which exist only where Customer Service is configured, and
  ships with a test of its condition and of its unchanged default (crosscut §7.1). The return and pack-invoice rules
  are Accounting's, behind their flags (impl-accounting §4); Customer Service's own are ServicePolicy flags.
- **Mantle callers stay compatible.** Existing callers of these keep working:
  - `create#Request` from Comms, Chat, Commons QuickRequest, Projects NewRequest, `create#RequestFromEmail`,
    `create#IntakeRequest` and the forum's `create#CaseFromTopic`;
  - `complete#RequestFromWork` for Projects' types, and a project's intake token and mail rule;
  - `find#EmailTextBlocks` and Comms TextBlocks;
  - `create#ReturnFromOrder`, `request#Return`, `approve#Return` and `cancel#OrderItem`;
  - the framework FormResponse services for responses with no invitation;
  - PASS's Forum, Account, Members and Sites apps, its site and mount configuration, and its operation catalogue.

  Mantle's WorkProjectRequests, RecordVisibility, RecordLinks, WorkProjectClients, CommonsToday, OrderToCashBasicFlow,
  ReturnToResponseBasicFlow, ShipmentReturnMisc and WorkPlanToCashBasicFlow specs, PASS's specs (Forum, ForumAccess,
  PublicIdentity, Integrations, RemoteFixtures, and ForumHttp and RemoteHttp in the browser) and mr-marble's render
  specs pass unchanged, and so do the earlier apps' BOSS walks.
- **Done for a phase** means all of these:
  - impl-projects §2 "Done":
    - cargo tests for the touched crates, with goldens reviewed;
    - the new Mantle specs passing under `./moq test mr-mantle`;
    - `./moq test mr-boss` passing, with AppStructure and TuiRender covering the new screens and Customer Service in
      their root lists (F20);
    - `moqui lint --screens` clean for BOSS with the Debug binary;
    - screenshots light and dark at 390, 1280 and 1440 px;
    - the inventories' **Implemented in** columns;
  - the `CustomerServiceAccess` spec extended to the phase's services and mounts, and ClientIsolation and ClientWrites
    passing with the new package (F17);
  - for a phase that touches the Support app (P13, P15): `./moq test mr-pass mr-mantle mr-boss` with its specs, the
    remote pair on RemoteFixtures' pattern, `moqui test-client mr-pass --serve` on ForumHttp's and RemoteHttp's
    pattern, lint clean for PASS, and its pages' screenshots light and dark at 390 and 1280 px;
  - the phase's walk in §8;
  - its row and **Built** note here.

## 3. Phases

| Phase | Repos | Screens | Status |
| --- | --- | --- | --- |
| P0 Checks | all (read) | — | partly done Oct 28 (§6 F1–F43) |
| P1 Foundation | Mantle, BOSS | the Customer Service root and menu, Home | — |
| P2 Cases and queues | Mantle, BOSS | Cases, NewCase, CaseDetail, WorkItemDetail, Settings, Queues, AgentTeams, CaseTypes, StatusCategories, ServiceDefaults | — |
| P3 Customers and orders | Mantle, BOSS | Customers, Customer360, ContactDetail, Orders, OrderDetail, ShipmentDetail, InvoiceDetail, InventoryAvailability, StockAtDate, Product360 | — |
| P4 Service levels | Mantle, BOSS | ServiceLevelPolicies, CaseAnalytics, CaseDetail's clocks | — |
| P5 Assignment and saved replies | mr-moqui (P0), Mantle, BOSS | AssignmentRules, SavedReplies, AgentTeams' participation | — |
| P6 Channels | Mantle, BOSS | ChannelRouting, ChannelSessions | — |
| P7 Case templates | mr-moqui, Mantle, BOSS | CaseTemplates, NewCase's template step | — |
| P8 Merge, split and closing | Mantle, BOSS | MergeCases, SplitCase | — |
| P9 Returns | Mantle, BOSS | Returns, NewReturn, ReturnDetail, QualityInspection, ReturnPolicies, Approvals | — |
| P10 Order changes | Mantle, BOSS | OrderChanges, OrderChangeDetail | — |
| P11 Warranty | Mantle, BOSS | WarrantyClaims, WarrantyAssessment, Customer360's Delivered items | — |
| P12 Knowledge | Mantle, BOSS | Knowledge, ArticleFeedback, CaseToArticle, KnowledgeSources | — |
| P13 Feedback | Mantle, mr-pass, BOSS | FeedbackForms, FeedbackFormDetail, SatisfactionResults, ResponseDetail; the Support app with its Feedback page | — |
| P14 Reports | BOSS | Reports, ServiceLevelCompliance, ResponseTimes, CaseVolumes, ReturnAnalysis | — |
| P15 Support app | Mantle, mr-pass, BOSS | Support's SupportHome, MyCases, NewCustomerCase, CustomerCase, MyReturns, RequestReturn, CustomerReturn and CustomerArticle; ContactDetail's invitation | — |
| P16 Finish | BOSS | — | — |

### P0 — Checks

Verify the design's riskiest assumptions against the code before building. Each result is a row in §6 and, where it
changes the design, an edit there. F1–F43 were found on Oct 28 while writing this plan. The design edits that §4's
decisions call for (the case's organization and people as RequestParty roles, the effective-dated policies, which
requests are cases, the queue intake in place of ProjIntake's triaged types, the forum service names, the order-change,
warranty and template models, the Mantle case core, and design §14's answers, with crosscut §9's customer accounts)
are made when P0 closes. So is the Support app: design §2 and §8 point to a new `mr-pass/plan/design-support.md`
holding §8's pages on PASS's shell, identity and request contract, and design-forum §1 and §13 gain the app. Still to
check:

- **The other apps' state.** Which of Products P2, P5 and P7, Accounting P4, P6, P10, P17 and P18, Warehouse P8, P11,
  P13, P14 and P17, Manufacturing P11 and Purchasing P3, P4, P10 and P13 are built when the phases that use them start,
  and whether each built its Customer Service part as its plan says: the package of `request#ReturnLabel` (F37), the
  Change hold reason, ReturnContent in RecordFiles, the cancelled-balance flag, and the RequestDetail contexts that
  Purchasing P10, Warehouse P15 and Manufacturing P11 add (F7). Whether OrderDetail and InvoiceDetail still need a
  project link (F35). Whether Accounting P18 built the PASS Billing and Supplier apps as its plan says (F42).
- **PASS for a new app** (F43), as Accounting P18 settled it for Billing and Supplier, and what Support adds. How an
  app beyond Forum, Account, Members and Sites registers: its `PublicSiteApp`
  mount and target, navigation, readiness and operator configuration; the facade's operation and route catalogues and
  Mantle's PassApi route table; PASS invitations with organization grants, for a customer contact; media staging
  finalized into a record's content; the site pages' wiki binding, for published help articles; and the URLs Mantle
  builds for notices to a site's members.
- **Accounting's §5 answers.** The rule flags (its §4); the CX-POSTING record; the pack invoice, decided: behind D3's flag it is
  finalized at ship, so an order change between pack and ship releases it (impl-accounting §4, F26). The Approvals filter is decided: the topic list (impl-accounting §4, F14).
- **Which requests are cases** (F5, §4). Each entry point's type, category, parties and status at create, against the
  service-queue rule, and what Commons Today and the request lists show for a case.
- **The paths around a case** (F8). For each path that changes a request's status, due date or resolution, whether the
  Request status rule records it or the path must refuse a case.
- **Business time** (F13). Projects' business-day helpers (`set#TaskDates`, `get#WeekDays`), `get#NextBusinessDay`
  and Manufacturing P3's work-center calendar, for one Mantle business-time service.
- **Client content** (F18). Whether a client's file list of a visible request includes RqCntInternal content, and what
  Chatter shows a client of a request with no project.
- **Form engine** (F16, §4). Whether the dynamic form renders a DbForm in xml, html, the terminal and PASS's pages at
  390 px, for P7's templates and P13's feedback forms, and how a dependency row shows or requires a field there;
  whether an editable `form-list` with dependent options and a terminal row twin covers the condition rows of
  AssignmentRules and CaseTemplates, or CS-FORM-ELEMENTS needs a framework element under style-guide §8.1.
- **Approval handlers.** What Commons passes to a topic's approve and refuse services, against a decision bound to the
  return's or proposal's revision, as Purchasing P0 checks.
- **Reservations on a partial cancel** (F28). Run `cancel#OrderItem` with a partial quantity and read the reservations
  left, before P10 relies on `reduce#AssetReservation`.
- **Warranty repair.** Manufacturing P11's `EquipmentServices.create#AssetMaintenance` against the design's
  `WepMaintenance` work effort, for one repair record on a sold serial's Asset (F33).
- **Who is viewing** (§4). Whether the Dev AIDE presence (`set#Presence`, DevPresence) generalizes to a record topic
  at small cost; if it does, P5 builds the viewers and the warning before Send, and if not they stay in §7.
- **Demo data** (F34). What the earlier apps' demo data leaves: delivered sales orders with invoices and payments,
  returns, serialized sales, customers with contacts; and what P1 must make through services.

### P1 — Foundation

- **CX-ACCESS** (design §1, crosscut §1.4).
  - The groups of design §1: `BOSS_CUSTOMER_SERVICE_AGENT`, `_MANAGER`, `_ORDER_DESK`, `_RETURN_AUTHORIZER`,
    `_KNOWLEDGE` and `_ADMIN`, composed as Products' are, with `BOSS_CUSTOMER_SERVICE` as the root user group beside the
    artifact group of that name (§4, F3). W and F are the owners' groups (crosscut §1.4). C, the customer contact, is
    a PASS public account with no group (§2).
  - The root's authz comes out of BossSetupData's commented block (F1), with the organization filters of
    impl-drawers-commons §4 (`MANTLE_USER_ORG` for the groups, `MANTLE_ACTIVE_ORG` for `BOSS_CUSTOMER_SERVICE_ADMIN`,
    `MANTLE_PRIVATE_CONTACT` for both) and the service checks of §2.
  - `ironstone.customerservice.AccessServices`: the user's service organizations, their capabilities, own and borrowed,
    the queues and teams they work, and the customers they may serve: a Customer-role party whose owner passes the
    active or available organization filter, as Purchasing's supplier scope. Every later Customer Service service and
    shared mount calls it. A supplied organization, customer, case, order, return or invitation is checked against it.
    An agent sees the cases of their teams' queues and those assigned to them; a manager the teams they manage.
  - No artifact authorization for the raw Mantle request, return and order mutators or their REST paths. The client
    deny pattern's service pattern gains `ironstone.customerservice`, and ClientWrites its new verbs (F17).
- **The Customer Service root.**
  - The menu of design §1: Cases, Orders, Returns and Availability as menu groups holding their lists, Customers,
    Knowledge and Settings from the placeholders, and Approvals and Reports added (F1). Each area shows for its groups
    only.
  - `<shell-providers>` (CS-PROVIDERS): the palette types, quick create, Today sources and notification topics grow
    phase by phase, as their records are built.
  - The `customerservice` key scope.
  - `ironstone.commons.PaletteServices.get#RecordLink` opens cases, customers, orders, returns and warranty claims
    under Customer Service for its users; Projects and Commons keep their requests (F9).
- **Home** (design §3): ServiceMetrics over `ironstone.customerservice.ReportingServices.get#ServiceDashboard`, each
  measure of a later phase "Not configured"; the other panels arrive with their phases; panels by role.
- **Customer Service demo data.**
  - `BossCustomerServiceDemoData.xml` with ORG_ZIZI_RETAIL as the service organization and POPC_DEFAULT's products. It
    builds on Mantle's CustJqp, JoeDist and ORG_ACME customers, and through a demo service (Mantle has no seeded sales
    orders, F34) places, ships, invoices and pays orders for them: a delivered order with a serialized item, an order
    awaiting pick, and a packed order. Queues, teams, cases, returns and contacts are added as the phases need them.
  - `BossUsersDemoData.xml` gains a user per group, an agent who also holds Warehouse's receive and inspect groups, a
    return authorizer who also holds `BOSS_ACCOUNTING_AR`, and a service reader with no other launcher. P15 adds
    customer contacts.
- **Specs.**
  - `CustomerServiceShell`: the menu per group, the palette, record links, quick create.
  - `CustomerServiceAccess`: started, covering organization, customer and queue scope and the groups through the
    services, and the refused REST paths.
- **Usable when:** the menu renders for each group, and quick create offers only what the group may create. An agent
  finds their organization's customers and orders through the palette but not another organization's, and a forged
  customer or order ID is refused. A Projects client contact is refused the root and every
  `ironstone.customerservice` service.

### P2 — Cases and queues

Design §3 Home, Cases, NewCase, CaseDetail and WorkItemDetail; §9 Settings, Queues, AgentTeams, CaseTypes,
StatusCategories and ServiceDefaults; CS-QUEUE, CS-SETTINGS, CX-REQUEST.

- **CS-QUEUE, the case.**
  - A case is a request in a service queue (§4, F5). CaseTypes' service-enabled flag says which types a queue offers,
    and puts a request of that type with a Customer RequestParty and no category into the type's default queue.
  - `mantle.request.support.CaseProfile` (PK requestId): the ServicePolicy row and status mapping it was opened under,
    the template (P7), the accepted intake time, `closedDate` (P8), and the originating communicationEventId or
    emailMessageId. Its organization, customer, contact and assignee are RequestParty rows (§2); the channel is
    `Request.salesChannelEnumId`.
  - The queue: a RequestCategory with an owner field (F6) and effective-dated `ServiceQueue` rows: offered types,
    visibility, responsible team, default rule, SLA, template and fallback assignee, active dates.
  - The case rules (D23): a Request create entity ECA rule beside `RequestTriageNotice`, and the same on a move into a
    service queue, calls Mantle's `mantle.request.SupportCaseServices.ensure#CaseProfile` (F41), so Comms, Chat,
    Commons, Projects, email, the public form, the forum and the Support app keep calling `create#Request`. P4 adds the
    episode, P5 the assignment.
  - `ironstone.customerservice.CaseServices`: `prepare#Case`, `create#Case` (wrapping `create#Request`,
    `replace#RequestParty` and `link#RequestRecord` atomically with the profile), `find#Cases` with the Recent cases
    read, `get#QueueCounts`, `update#Case` (queue, priority and assignee under the queue's policy; crosscut's
    CaseServiceFacts),
    `transition#Case` (status by the mapping; required resolution; reopen), `apply#CaseBatch` with a result per case
    (`StaleCase`, `AssigneeUnavailable`, `Forbidden`), and `find#ServiceCustomers`, scoped by AccessServices and finding
    by email and phone (F30).
  - `mantle.request.RequestTag`, dated, over the EnumerationType `RequestTag`.
  - Seeds: `ReqWaitingCustomer` and `ReqOnHold` with their transitions (F4); the priority bands of ServicePolicy.
- **CS-SETTINGS:** `ironstone.customerservice.ConfigurationServices` `find#ServiceQueues`, `save#ServiceQueue`,
  `get#ServiceTeam`, `save#ServiceTeamMember`, `save#ServiceRequestType`, `save#CaseStatusMapping`,
  `save#CaseWorkflow` and `save#ServiceDefaults`, over effective-dated rows: `ServicePolicy` by organization (enabled
  types, default queue, priority bands, unknown-sender policy, reopen window, auto-close delay, required resolution,
  support-work completion), and `CaseStatusMapping` by workflow and status (agent and customer labels, category,
  pause reasons, order). The default mapping of design StatusCategories is seeded.
- **CX-REQUEST.**
  - `complete#RequestFromWork`: a case only notifies its assignee, beside Purchasing P10's type check; Projects' types
    complete as today.
  - The paths around a case (F8): Projects' and Commons' RequestDetail hide Complete and Cancel on a case for a user
    without `case.resolve` and link CaseDetail; `triage#Request`, `set#RequestStatus`, `bulk#Requests` and
    `ClientServices.cancel#ClientRequest` refuse a case's resolution or route it through `transition#Case`.
  - The audit log on Request's type, category, priority, due date and resolution.
- **Screens:**
  - Cases: CaseFind, CaseList with the saved views of design Cases (SLA risk from P4), the board by status category
    with an equivalent row action, and BulkCaseAction for assign, status and tags (reply in P5).
  - NewCase: CaseIdentity, CaseDescription and SubmitCase, with the duplicate warning over Recent cases. Template fields
    come in P7, knowledge suggestions in P12.
  - CaseDetail: Projects' `Shared/RequestDetail` with the Customer Service row of crosscut §3.11 (F7): Conversation
    first, Overview with the customer and people, linked records, Work, Files, Items when present, and the Recent cases
    pane. Reply and notes through Chatter; assign, priority and queue through `update#Case`; resolve and reopen through
    `transition#Case`; link records; make or link work. Later phases add the clocks (P4), saved replies (P5), merge and
    split (P8), the RMA, order-change and warranty actions (P9–P11) and Knowledge (P12).
  - WorkItemDetail: `Shared/WorkItemDetail` at `CustomerService/Cases/WorkItemDetail` with the row of crosscut §3.12.
  - Settings: SettingLinks with readiness; Queues (QueueList as a tree with a table, QueueEdit); AgentTeams
    (TeamMembers, with participation in P5); CaseTypes (ServiceTypes); StatusCategories (CaseStatusMap,
    CaseTransitionPolicy); ServiceDefaults (ServicePolicy; FeedbackDeliveryPolicy in P13).
  - Home: MyCases, TeamQueues and the New case shortcut.
- **Shell:** the case palette type; quick create New case; the assignment and customer-reply notification topics; the
  Today source of own due and overdue cases, in place of Commons Today's request rows for a case (F9).
- **Usable when:**
  - an agent creates a case for CustJqp in the Support queue from NewCase, sees CustJqp's other open case as a possible
    duplicate, and opens it in CaseDetail with the customer, queue and priority band;
  - a request a customer contact files through Chat into the Support queue becomes a case with its profile; an
    employee's Commons QuickRequest stays a plain request;
  - a manager moves a case to Waiting for customer on the board and by the row action, and the customer label differs
    from the agent label;
  - a bulk assignment of three cases, one of another organization, names it Forbidden and assigns the other two;
  - completing a case's linked work notifies its assignee and leaves it open; a Projects request completes from its
    work as before;
  - Commons' Resolve on a case is hidden for a user without `case.resolve`.

### P3 — Customers and orders

Design §4 and §6's Availability mounts; CS-SHARED. Customer Service's context on screens other apps built.

- **Reads.**
  - `CaseServices.find#ServiceOrders`: an exact ID, display ID or external ID first, then customer, email, phone,
    product and date; a missing and a forbidden ID give the same answer (F30).
  - Accounting's contract (§4, AC-11): a customer's credit status read in `ironstone.accounting.CreditServices`, if
    Accounting P10 has none (F36). It answers the hold and its reason only to a holder of the read.
  - Resend the original confirmation (F29): the order's confirmation PDF stored as OrderContent at placement, sent
    through `send#EmailDraft` to a checked recipient, recording the recipient, the version and the result; an order with
    none renders as of its placed revision and stores it.
- **Screens** (design §4, §6):
  - Customers: CustomerFind and CustomerList, with the hold reason read only.
  - Customer360: Accounting's `Shared/Customer360` with the Customer Service row of crosscut §3.2: Overview and
    contacts, Cases, Orders and shipments, Activities, Files, and the permitted billing summary; Shipping defaults with
    party authority. Later phases add Returns (P9), Delivered items (P11) and Service (P14, with ServiceAgreements).
    PaymentDetails stays hidden; PartyIdentifications and TaxRegistrations are read only.
  - ContactDetail: the Commons contact record with the row of crosscut §3.1. Its Support invitation comes in P15, for
    the external-access administrator only.
  - Orders: OrderLookup and OrderResults.
  - OrderDetail: Projects' `Shared/OrderDetail` with the Customer Service row of crosscut §3.6: Header, Items,
    Fulfillment and tracking, permitted money, History, Cases; new linked case and resend; the hold and its reason read
    only. Returns (P9) and changes (P10) come with their phases.
  - ShipmentDetail: Accounting's `Shared/ShipmentDetail` with the row of crosscut §3.8; copy tracking link and send an
    update; no stock action.
  - InvoiceDetail: Projects' `Shared/InvoiceDetail` with the row of crosscut §3.16; send a copy through Accounting's
    `send#Invoice`, with its pay link; no correction.
  - InventoryAvailability: Products' screen with the row of crosscut §3.7 for customer-serving facilities; a projection
    that is not ready shows unknown, never zero (F31).
  - StockAtDate: Warehouse's `Shared/StockAtDate` with the row of crosscut §3.26; design §6's StockDateFind and
    StockHistory go into design-warehouse.
  - Product360: Products' screen with the row of crosscut §3.5: no cost or supplier price.
  - CaseDetail's linked records list orders, shipments and invoices, each opening the Customer Service mount.
- **Palette:** customers by name, email and phone, and orders by ID, through the scoped reads.
- **Usable when:**
  - an agent finds CustJqp by email, opens Customer360 and sees the open case and the orders, with no payment details,
    and a held order's reason read only;
  - an order ID of another organization and a missing ID give the same answer;
  - from OrderDetail the agent links the delivered order to a case and resends its confirmation; the send records the
    recipient and the confirmation's version, and a second resend is a second record, not a re-render;
  - InventoryAvailability for a product whose projection is not ready says unknown;
  - StockAtDate answers the quantity at a past cut-off for ZIRET_WH;
  - Product360 shows no cost or supplier price, and a reader without price read sees no PriceExplain.

### P4 — Service levels

Design §3 CaseDetail's clocks, §7 CaseAnalytics, §9 ServiceLevelPolicies; CS-SLA and CS-JOBS.

- **Business time** (F13), Commons' contract:
  - a team's weekly working hours as a `WetAvailable` work effort of the team party, edited on AgentTeams by the team's
    manager through Commons' `store#WorkingHours` extended to a team;
  - `mantle.work.CalendarServices.get#BusinessTimeDue` and `get#BusinessTimeElapsed` (P0 confirms the package), to the
    minute in the schedule's time zone, less the organization's `WepHoliday` days, reusable by Projects and
    Manufacturing.
- **CS-SLA.**
  - `mantle.request.support.ServiceLevelPolicy` and `ServiceLevelTarget`, effective-dated rows by organization with
    their key fields audit-logged: conditions (queue, type, customer, agreement), precedence, calendar, targets per
    priority band, warning offsets, pauses and the reopen policy. No version record (§2).
  - `CaseSlaEpisode` and `CaseSlaEvent`, records of their own because they are measurements: the policy row and
    calendar used, start, due and actual times, pauses with reasons, breaches, and reasoned corrections that keep the
    earlier figure. A holiday edit changes no stored deadline.
  - `mantle.request.SlaServices`: `find#Policies`, `save#Policy`, `simulate#Policy`, `start#CaseEpisode` (from
    `ensure#CaseProfile`), `record#CaseEvent`, `correct#CaseSla`, `get#CaseSlaHistory` and `scan#CaseSla`.
  - The D23 rules: a Request status entity ECA rule records every status change of a case, and a RequestCommEvent create
    rule records an outward response or a customer reply. A sent external reply fulfills first response once the channel
    accepts it; an acknowledgement, a note or a failed send does not. Making or linking work is an event.
  - Policy selection at intake by §4's precedence, refusing equally ranked published overlaps; the row is bound to the
    episode, and a later publish does not re-select it.
  - `responseRequiredDate` mirrors the current resolution due date, and only SlaServices writes it on a case (F8).
  - Pause and resume with a reason, resolve, and reopen as a new resolution episode, through `transition#Case`; first
    response never restarts.
  - The agreement condition reads a service agreement type seeded here (F32).
- **CS-JOBS:** the warning and breach scan, a ServiceJob over a bounded batch, a failing case logged with its ID and the
  rest going on, idempotent by case and episode; the SLA warning and breach notification topics.
- **Screens:** ServiceLevelPolicies (SlaPolicyList, SlaPolicyEdit, SlaSimulation); CaseDetail's clocks beside the
  header and its SLA tab; CaseAnalytics (CaseMetrics); Cases' SLA risk view; Home's SLA compliance, first response and
  resolution measures; AgentTeams' working hours.
- **Usable when** (design §10, case intake to resolution):
  - a case received Friday 16:30 on a queue with a Monday-to-Friday 9:00–17:00 team and a holiday Monday is due for
    first response on Tuesday, as SlaSimulation said;
  - an internal note does not meet first response; a sent reply does; a failed send does not;
  - waiting for the customer pauses resolution, and an internal hold does not;
  - a status change made through Projects' `triage#Request` on a case records its event, and Commons' due-date edit is
    refused on it;
  - a reopen starts a new resolution episode and keeps the first breach;
  - a policy row started from a date leaves an open case on the row it began with;
  - a scan with one failing case names it and warns the rest.

### P5 — Assignment and saved replies

Design §9 AgentTeams, AssignmentRules and SavedReplies; Cases' bulk reply; CS-ASSIGNMENT, CS-REPLIES,
CS-FORM-ELEMENTS (the condition rows).

- **CS-ASSIGNMENT.**
  - Team participation: effective-dated rows by team and agent (eligibility, maximum active cases, substitute) beside
    P2's membership.
  - `mantle.request.support.ServiceAssignmentRule`, effective-dated rows with their key fields audit-logged: queue,
    priority, typed conditions (allowlisted field, operator and value), distribution (manual, round robin, least open),
    eligible team or users, schedule and maximum load, fallback. One winning rule, then the fallback.
  - The assignment cursor, a record of its own, locked with the assignment so two intakes cannot take the same slot.
  - Mantle's `SupportCaseServices.assign#Case` evaluates the rules, called from `ensure#CaseProfile` and `update#Case`
    (F41); `ironstone.customerservice.AssignmentServices` `find#Rules`, `save#Rule` and `preview#Assignment`, the
    preview through the same evaluator. Reassignment never resets the clock; no eligible agent leaves the case
    unassigned and notifies the manager. Presence is a hint; the schedule is P4's.
- **The condition rows** (CS-FORM-ELEMENTS): an editable `form-list` with a terminal twin, or the framework element P0
  calls for, under style-guide §8.1.
- **Who is viewing** (§4), only if P0 found the Dev AIDE presence generalizes at small cost: a record viewers topic on
  the notification WebSocket in the framework, CaseDetail's viewers, and a warning before Send when another agent is
  composing a reply to the same case. Commons presence stays user status only.
- **CS-REPLIES.**
  - A saved reply is a Comms text block (D24): personal by its owner, team by the team's UserGroup, which AgentTeams
    keeps in step with the membership (F3), global by the root user group.
  - `mantle.request.support.SavedReplyAction` rows and the language and variables extension, keyed by
    `emailTextBlockId`.
  - `ironstone.customerservice.ReplyServices`: `save#SavedReplyAction`, `preview#SavedReply` and `apply#SavedReply`.
    The text goes through Comms' `store#TextBlock`. An unsupported variable is an error, not an empty value. The case
    changes commit per case; the message keeps a durable pending or failed state by its message ID.
- **Screens:** AgentTeams' TeamParticipation; AssignmentRules (AssignmentRuleList, AssignmentRuleEdit,
  AssignmentPreview); SavedReplies (ReplyList, ReplyEdit, ReplyPreview); CaseDetail's CaseReplyAction, the Compose
  picker's text then the actions previewed and applied on confirmation; BulkCaseAction's reply, with recipients
  previewed per case.
- **Usable when:**
  - round robin between two eligible agents skips the one outside their hours; two concurrent intakes take two slots;
  - a rule with no eligible agent leaves the case unassigned and notifies the manager; a reassignment keeps the clock;
  - a team reply with a tag and a set-status action is previewed and applied on confirmation; a personal reply is seen
    by its owner only; Comms TextBlocks still lists the user's own and shared blocks;
  - a bulk reply to three customers' cases mails each customer on their own thread, and a failed delivery retries by its
    message ID without a second reply.

### P6 — Channels

Design §3 ChannelSessions, §9 ChannelRouting, CaseDetail's Reply publicly in forum; CS-CHANNELS.

- **CS-CHANNELS.**
  - Mail: the `ErActCreateRequest` rule value names a queue as well as a project (F10). `create#RequestFromEmail`
    files into the queue, the accepted intake time is `EmailMessage.receivedDate`, and threading follows verified
    message references before case tokens.
  - Auto-generated mail (an Auto-Submitted header other than no, Precedence bulk, junk or auto_reply, X-Autoreply) is
    ignored or attached to an existing case only, per route, and never acknowledged.
  - Organization intake goes through the queue route, not ProjIntake's triaged types (F11); the design changes.
  - The public form: a queue's form is the Support app's NewCustomerCase (P15), not BOSS's RequestIntake, which stays
    Projects' form at `/r/<token>` for a project. Here `create#IntakeToken` and `remove#IntakeToken` take a queue, the
    token held as Accounting P18's ExternalAccessCapability on the RequestCategory, and `create#IntakeRequest`'s
    limits apply per queue (F10).
  - Chat and calls: the `ScChat` seed; Chat's create files into a queue; `CaseServices.log#CaseCall`.
  - The forum (F12): a route from a PASS site and category to a queue, type and template; Mantle's
    `mantle.forum.ForumServices.create#CaseFromTopic` files a Submitted case into it with the channel, and the case's
    Reply publicly in forum previews and posts through `preview#CaseReply` and `publish#CaseReply`, for a user with
    forum posting rights. No private note is copied.
  - `ironstone.customerservice.ChannelServices`: `find#ServiceRoutes`, `save#ServiceRoute` and `preview#ServiceRoute`;
    acknowledgements through `send#IntakeConfirmation` with the route's template.
- **Screens:** ChannelRouting (IntakeRoutes, RouteEdit, RouteTest); ChannelSessions (SessionFind, SessionList, LogCall)
  over `find#PartyCommunicationEvents` with the service audience filter.
- **Usable when:**
  - mail to the support address makes a case in the Support queue, timed by its received date, with one
    acknowledgement; a reply in the thread files on the case;
  - an Auto-Submitted reply attaches to the case, sends nothing and makes no case; an unknown sender is held for review;
  - a queue's intake token can be issued and revoked, and a project's token still makes a project request through
    RequestIntake; the queue's public form is P15's;
  - a chat message becomes a case with `ScChat`; an agent logs a call on a case;
  - a forum topic escalated through PASS lands in the queue; the agent's previewed public reply posts with no private
    note.

### P7 — Case templates

Design §3 NewCase's CaseDescription, §9 CaseTemplates; CS-TEMPLATES, CS-FORM-ELEMENTS (the template fields).

- **CS-TEMPLATES** on DbForm (§4):
  - a template is a DbForm with dependency rows (source field, operator and value; target field; show or require) and
    an audience per field;
  - the framework's DbForm gains `versionOfFormId` and `publishedDate` (F16), which P13's feedback forms reuse: a
    published template with responses is not edited, and its next version is a cloned DbForm, a record of its own
    because responses answer it;
  - a case's values are a FormResponse linked to the case;
  - `ironstone.customerservice.TemplateServices`: `find#Templates`, `save#Template` and `validate#Template`; the values
    checked by Mantle's `SupportCaseServices.validate#TemplateValues`, which NewCase and the Support app share (F41).
    Conditions use a typed allowlist and refuse cycles; the server re-evaluates hidden and required fields; no scripts.
- **The template fields** (CS-FORM-ELEMENTS): rendered from the form in xml, html and the terminal, or the framework
  element P0 calls for.
- **Screens:** CaseTemplates (TemplateList, TemplateEdit, TemplatePreview for desktop, phone and terminal); NewCase's
  template step; CaseDetail's Overview with the values as submitted.
- **Usable when:**
  - a "Defective product" template requires a serial when the product is equipment, and the server refuses a submit
    without it;
  - an internal field never reaches the customer-visible variant;
  - a template changed from a date leaves an earlier case's values readable as submitted;
  - a dependency cycle is refused.

### P8 — Merge, split and closing

Design §3 MergeCases and SplitCase, §9 StatusCategories' closing and ServiceDefaults' auto-close; CS-MERGE and
CS-JOBS.

- **CS-MERGE.**
  - `mantle.request.support.CaseRelation`, a record of its own because it is lineage: source and target, merge, split or
    follow-up, actor, time, reason, evidence references and the SLA obligations carried.
  - `CaseServices`: `preview#MergeCases` and `merge#Cases` (same customer and organization; every case locked; the
    survivor's clock kept, the sources' obligations and breaches carried; a source non-actionable with a redirect);
    `preview#SplitCase` and `split#Case` (selected messages referenced within their audience; the clock from the issue's
    receipt, or a manager's reason).
- **Closing.** The reopen window from ServicePolicy (§4: 14 days); a reply after it, or after auto-close, makes a
  follow-up case linked by CaseRelation; a cancelled case is only followed up. The auto-close job (CS-JOBS),
  `SupportCaseServices.close#ResolvedCases`, sets `CaseProfile.closedDate`, keeps `ReqCompleted` and is idempotent.
- **Screens:** MergeCases (MergeSelection, MergePreview, MergeConfirm); SplitCase (SplitSelection, SplitNewCase);
  CaseDetail's lineage and a merged source's redirect.
- **Usable when:**
  - merging two of CustJqp's cases keeps both histories with their audiences, the survivor's clock and the source's
    breach; merging cases of two customers is refused;
  - a message split into a new case starts its clock at that message's receipt, and the source stays open;
  - a reply 20 days after resolution makes a linked follow-up case; one within 14 days reopens;
  - auto-close sets the closed date, and a rerun changes nothing.

### P9 — Returns

Design §5 Returns, NewReturn, ReturnDetail, QualityInspection and Approvals, §9 ReturnPolicies; CS-RETURN-POLICY,
CX-RETURNS, CX-APPROVAL. On Accounting P17's settlement and receipt and Warehouse P8 and P14 (F25).

- **CS-RETURN-POLICY**, the CX-RETURNS policy records Accounting §7 leaves here.
  - `mantle.order.return.ReturnPolicy`, effective-dated rows by organization with their key fields audit-logged:
    store or customer group, product category, window from shipment or delivery, authorization validity, self-service,
    reasons and remedies, proof, destination, exception approver, receiptless eligibility, advance replacement or
    instant credit, restock fee rule and cap, instructions; and return reason rows over the ReturnReason enums.
  - ReturnHeader's `customerReference` and authorization expiry, audit-logged; the assignee as a dated ReturnParty row
    (F24). `externalId` and `originId` stay integration keys.
  - The authorization decision, a record of its own (as PurchaseApprovalDecision): the return and its revision, the
    policy row, the actor, the time and any exception.
  - `mantle.order.ReturnPolicyServices`: `find#Policies`, `save#Policy`, `evaluate#ReturnPolicy`,
    `find#ServiceReturns`, `find#ReturnApprovals`, `submit#CustomerReturn` (over `update#ReturnItem` and
    `request#Return`), `authorize#Return` (wrapping `approve#Return`; `responseImmediate` N unless the policy allows it
    and the actor holds F; no settlement; the RMA PDF stored as ReturnContent), `close#ReturnRemainder`, and
    `decide#ReturnException`.
  - Eligibility under a lock per source order item, against shipped and invoiced quantities less earlier returns,
    including drafts; `update#ReturnItem` from BOSS goes through the same check (F21). Unreferenced goods only by a
    manager's exception. No fee without a published rule, and with no matching policy the return goes to manual review
    (§4).
  - Cancel before any effect cancels the return shipment approval made (F22); Mantle's `add#ReturnToShipment` field fix
    if Warehouse P14 has not made it (F23).
  - The `ReturnExceptionApproval` topic, with approve and refuse handlers on Purchasing P4's decision pattern.
- **Screens:**
  - Returns: ReturnFind and ReturnList with the views of design Returns; batch authorize and cancel, a result per
    return.
  - NewReturn: ReturnSource, ReturnableLines and ReturnRequest, with the policy preview.
  - ReturnDetail: Accounting's `Shared/ReturnDetail` with the Customer Service row of crosscut §3.18: authorize, Issue
    return label through Warehouse P14's `request#ReturnLabel`, close a remainder, cancel before any effect; receive
    through Warehouse's ReturnReceipt mount for W, and preview and settle through Accounting P17 for F; Files on
    ReturnContent.
  - QualityInspection: Warehouse's `Shared/QualityInspection` at `CustomerService/Returns/QualityInspection` with the
    Customer Service row: read for A and R, inspect and dispose for W (F38).
  - ReturnPolicies: ReturnPolicyList, ReturnPolicyEdit, ReturnReasons and ReturnPolicyPreview.
  - Approvals: Commons Notifications at `CustomerService/Approvals`, filtered to the service topics, the topic list
    Accounting P6 builds (impl-accounting §4; F14).
  - Home's AwaitingReturns and ApprovalsWaiting and the Request return shortcut; CaseDetail's request RMA; Customer360's
    Returns tab; OrderDetail's create return.
- **Shell:** the return palette type; quick create Request return; the return-decision notification topic.
- **Outputs:** the RMA authorization and instructions with the label, by email and `html-print`; the credit, refund or
  replacement notice through Accounting's `send#Invoice`, pending until Accounting says otherwise.
- **Usable when** (design §10, case to RMA to credit):
  - authorizing an RMA for two units of the delivered order creates the return shipment and no credit or replacement;
  - Issue return label returns the label from the test gateway, and a retry answers the same label;
  - the W agent receives one unit with a second rejected at the dock, then the last unit in a second box; inspection
    releases one unit to a waiting order and scraps another;
  - the AR return authorizer credits only what was received; a second credit beyond eligibility is refused; a
    receiptless credit needs `BOSS_ACCOUNTING_APPROVE`;
  - two drafts cannot together return more than was shipped; with no policy the return goes to manual review;
  - an agent with the A, R, W and F groups does all of this from Customer Service without the Warehouse or Accounting
    root; an agent alone sees disposition and credit read only.

### P10 — Order changes

Design §4 OrderChanges, OrderChangeDetail and OrderDetail's actions, §6 Product360's substitute; CS-ORDER-CHANGE,
CX-ORDER-CHANGE. On Accounting P10 and P17 and Warehouse P11 and P12.

- **CS-ORDER-CHANGE** on the change Request (§4):
  - the `RqtOrderChange` type; the proposal is the change Request, its lines RequestItems linked to their order items by
    RequestItemOrder (product, quantity, Purchasing P10's unit, ship date as `requiredByDate`), with the line action
    and proposed unit price RequestItem lacks; its key fields audit-logged, and its revision the time of the last
    key-field change. The design's OrderChange, OrderChangeLine and application records are not built;
  - `mantle.request.support.OrderChangeDecision`, a record of its own (as PurchaseApprovalDecision): the proposal and
    its revision, the approver, the decision, the reason, the time and the expiry;
  - `ironstone.customerservice.OrderChangeServices`: `find#OrderChanges`, `save#OrderChange`, `preview#OrderChange`
    (Products P5's resolver, availability, and the reserved, issued, shipped, billed and paid quantities),
    `decide#OrderChange` (separation by policy) and `apply#OrderChange`.
- **`apply#OrderChange`** (D9, D7):
  - the order held through Accounting P10's `hold#Order` with the Change reason and released through
    `release#OrderHold` (F27); every check repeated under the lock;
  - the cancel kind: `cancel#OrderItem` for the open remainder and `reduce#AssetReservation`, with Warehouse P11's
    cancelled-balance flag (F28);
  - the substitution kind, on Warehouse P11's ShipmentPickException: the approved substitute line (a PatEquivalent or
    PatReplacement of the product, passing `check#ProductUsable`, with the customer's consent), the short remainder
    cancelled, and Warehouse picking it;
  - after pack and before ship, `release#ShipmentDraftInvoice` and `refund#OrderPayment` with Warehouse's put-back,
    since the pack invoice is finalized only at ship (impl-accounting §4; F26); after ship the change is
    `AlreadyShipped`, and a return handles it;
  - the named failures `StaleOrder`, `StockChanged`, `AlreadyShipped`, `BillingConflict`, `ApprovalExpired`,
    `Forbidden` and `ClosedPeriod`, each leaving the order unchanged;
  - price, quantity increase, ship date, address, ship method and carrier are approved here and routed to the order
    owner, never applied here (§7).
- **Shell:** the `OrderChangeApproval` topic; OrderChanges in the palette; the order-change confirmation email.
- **Screens:** OrderChanges (ChangeFind, ChangeList); OrderChangeDetail (ChangeProposal, ChangeImpact, ChangeDecision,
  ApplyChange, with the applied change stored as OrderContent); OrderDetail's propose change; Product360's substitute;
  CaseDetail's request order change.
- **Usable when** (design §10, order to short pick):
  - a picker short-picks a line of the order awaiting pick; the agent proposes a substitute with the customer's
    consent, a manager approves, and the order desk applies it: the substitute is priced and reserved, the remainder
    cancelled, and Warehouse picks it;
  - a concurrent pick makes apply answer `StockChanged`, with the order unchanged;
  - cancelling the open remainder of a line releases its reservation and leaves the shipped part;
  - on the packed order, apply follows Accounting's pack-invoice answer, and the shipment's invoice and payment are
    right afterwards;
  - an approved price change cannot be applied here; a stale proposal names the current revision;
  - a Credit hold placed by Accounting stays when the Change hold is released.

### P11 — Warranty

Design §5 WarrantyClaims and WarrantyAssessment, crosscut §3.2 DeliveredItems; CS-WARRANTY.

- **CS-WARRANTY** on the claim's case (§4):
  - the `RqtWarranty` type; the claim is the case, its product a RequestItem, its asset, order, invoice and agreement
    RequestRecord links. The design's WarrantyClaim record is not built;
  - `mantle.request.support.WarrantyDecision`, a record of its own: the terms and their source, covered, partial,
    rejected or goodwill, the approver, and for a chargeable repair the charge estimate and the customer's consent; the
    sales quote waits for Sales (§4, §7);
  - the coverage basis, by the hierarchy of §4: the agreement first, then the product's warranty at sale, a serial or
    lot traced through AssetIssuance to its order, customer and ship
    date, the term from the product's `PftWarranty` feature, and the coverage end with its source; then goodwill. A
    manual override needs a reason. Products' contract: editing `PftWarranty` on Product360, if Products has not;
  - `mantle.request.WarrantyServices`: `find#WarrantyClaims`, `save#WarrantyClaim`, `get#WarrantyCoverage`,
    `decide#WarrantyClaim` and `link#WarrantyWork`: a maintenance-purpose work item (or Manufacturing P11's
    AssetMaintenance, as P0 settles) linked to the case and the asset; finishing it notifies the agent and resolves
    nothing.
- **Screens:** WarrantyClaims (WarrantyFind, WarrantyList); WarrantyAssessment (WarrantyEvidence, WarrantyDecision,
  RepairLinks); NewCase's warranty template; Customer360's Delivered items (crosscut §3.2 DeliveredItems), opening a
  claim from a row.
- **Usable when:**
  - a claim for the serial of the delivered order shows coverage from its ship date plus the product's 12-month term,
    with the source;
  - an expired claim is rejected, or approved as goodwill with the approver;
  - the repair work finishing notifies the agent and leaves the claim's case open; a replacement goes through a return
    (P9).

### P12 — Knowledge

Design §3 CaseDetail's Knowledge tab, §6 Knowledge, ArticleFeedback and CaseToArticle, §9 KnowledgeSources;
CS-KNOWLEDGE.

- **CS-KNOWLEDGE.**
  - `ServiceKnowledgeSource`, effective-dated rows: space, audience, language, product or category mapping, priority,
    review team and default draft space. Wiki spaces only; indexing never widens page access.
  - `ArticleFeedback`, records of their own: page and version, helpful, comment, case, review decision.
  - `ironstone.customerservice.KnowledgeServices`: `save#ServiceKnowledgeSource`, `find#ArticleSuggestions` (the
    requester's locale first, then the space's language), `find#ArticleFeedback`, `review#ArticleFeedback` (a task
    made or linked), `prepare#ArticleFromCase` and `create#ArticleFromCase` (a redacted draft with WikiPageRequest).
  - Suggest edit (F15): an editor saves a draft revision and asks for its review through `request#WikiPageReview`;
    another agent files a task on the page for the space's review team.
  - Send to customer: Compose with the published URL, the Support app's CustomerArticle once P15 builds it and the
    space's `publicPageUrl` before; a draft is refused.
- **Screens:** Knowledge, Commons Knowledge with the Customer Service row; CaseDetail's Knowledge tab; NewCase's
  suggestions; KnowledgeSources (ServiceKnowledgeSources); ArticleFeedback (FeedbackFind, FeedbackList, FeedbackReview);
  CaseToArticle (AnswerSelection, ArticleDraft).
- **Usable when:**
  - a case's subject suggests a published article in the requester's language first; the agent links it and sends it;
    sending a draft is refused;
  - CaseToArticle makes a redacted draft in the service space, unpublished;
  - a reviewed feedback makes a task and leaves the article unchanged;
  - an internal article is never suggested on a customer-visible surface.

### P13 — Feedback

Design §7 SatisfactionResults and ResponseDetail, §8 Feedback, §9 FeedbackForms, FeedbackFormDetail and
FeedbackDeliveryPolicy; CS-FEEDBACK, CS-JOBS.

- **The survey builder** (Commons', crosscut §8; §4): `Shared/SurveyForms` and `Shared/SurveyFormDetail` with the
  Customer Service context, mounted as FeedbackForms and FeedbackFormDetail. Published versions are P7's: a form with
  responses is not edited, and its next version is a cloned DbForm (F16). The rating options' key is the score.
- **CS-FEEDBACK.**
  - `mantle.request.support.CaseSurveyInvitation`, a record of its own: case, episode, form, delivery state and
    response; its token an ExternalAccessCapability (Accounting P18).
  - The delivery policy: effective-dated rows (eligible types and queues, delay, frequency, form, channel, token
    expiry, reminder cap, low-score follow-up team).
  - `mantle.request.CaseFeedbackServices`: `save#InvitationPolicy`, `create#Invitation` and `submit#CaseFeedback` (one
    durable response; a repeat answers the first); `ironstone.customerservice.FeedbackServices`: `create#FeedbackForm`,
    `publish#FeedbackForm`, `find#CaseResponses` and `record#FeedbackFollowUp`.
  - The guard: `update#FormResponse` and `delete#FormResponse` refuse a response linked to an invitation (an entity ECA
    rule or an authorization rule, as P0 settles).
  - `CaseFeedbackServices.get#Invitation` for the page: the form version and the case's customer label only, never
    the case.
  - CS-JOBS: invitation send and reminders, bounded and idempotent by invitation. The link is the Support app's
    Feedback page for the case's site.
- **The Support app in mr-pass, its first page** (§2, §4):
  - `screen/Support.xml` under PASS's `Pass.xml`, the `support` app of `PublicSiteApp` with the service organization
    as its target, mounted at `/support` by default; its navigation, readiness and operator configuration on the
    pattern of Accounting P18's Billing and Supplier apps (F43);
  - Feedback: the invitation's page, taking its token as PASS's Unsubscribe does; `check#AccessToken` checks it, a GET
    shows the form and never submits, and PASS's throttling limits the posts;
  - the operations `getCaseFeedbackInvitation` and `submitCaseFeedback` in `Schema.js` and `Routes.js`, served by
    Mantle's PassApi for a remote frontend;
  - the `SupportAccess` spec, local and remote, and the app's screenshots.
  - A low score makes an assigned follow-up notification. Comments are private to service management and the
    customer-authorized follow-up, under the shared retention policy (§4); there is no agent leaderboard.
- **Screens:** FeedbackForms (FeedbackFormList, NewFeedbackForm); FeedbackFormDetail (FeedbackFormHeader, FormAccess,
  FormFields, FieldOptions, FormPreview); ServiceDefaults' FeedbackDeliveryPolicy; the Support app's Feedback
  (CaseFeedback, at 390 px); SatisfactionResults (CsatFind, CsatResponseList, CsatStats); ResponseDetail
  (ResponseDetails, FeedbackFollowUp); Home's CSAT measure.
- **Usable when:**
  - resolving a case sends one invitation after the delay; the customer rates 2 with a comment, and a repeat answers
    the first;
  - a mail scanner's GET submits nothing; an expired, revoked or foreign token shows only guidance;
  - the low score makes a follow-up; the framework services cannot edit or delete the response;
  - a published form with responses cannot be edited, and its next version is a clone; SatisfactionResults compares
    one version at a time;
  - the same rating through a remote PASS frontend, with only framework, webroot and PASS installed, records one
    response at the authority.

### P14 — Reports

Design §7; CS-REPORTING. Reads of what the phases before recorded.

- **CS-REPORTING:** `ironstone.customerservice.ReportingServices` `get#ServiceDashboard` (complete),
  `get#SlaCompliance`, `get#ResponseTimes`, `get#CaseVolumes`, `get#ReturnAnalysis` and
  `get#CustomerServiceStatistics`: the access filters of P1, an as-of time, time zone and currency, bounded grouping and
  CSV under the same permissions with the export audited. Home reads no unbounded scan.
- **Screens:** Reports (ReportCatalogue); ServiceLevelCompliance (SlaFind, SlaResults); ResponseTimes (ResponseFind,
  ResponseResults); CaseVolumes (VolumeFind, VolumeResults); ReturnAnalysis (ReturnAnalysisFind,
  ReturnAnalysisResults); Customer360's Service tab (CustomerServiceStatistics, ServiceAgreements); Home's measures with
  the previous period and the My and Team split.
- **Usable when:**
  - compliance leaves cancellations out of the rate and shows them apart, and open cases past due stay counted;
  - response times show median and p90 in business and elapsed time with their counts;
  - a merged case counts once in the backlog;
  - ReturnAnalysis shows amounts per currency and counts an open return as requested;
  - a manager of one team sees only its queues, and the CSV has the same rows.

### P15 — Support app

The rest of the customer pages, in the PASS Support app P13 started (§2, §4), on CX-PORTALS' capability service.
Design §8; CS-PORTAL.

- **CS-PORTAL, the Mantle side** (F41). `mantle.request.SupportCaseServices` customer services, each checking the
  contact's customer relationship or `check#AccessCapability` first and answering allow-listed projections with
  capabilities and revisions: `get#SupportHome`, `find#CustomerCases`, `create#CustomerCase` (with
  `validate#TemplateValues` and the queue's defaults; nothing internal accepted from the page), `get#CustomerCase`
  (outward messages and approved shared files only), `reply#CustomerCase`, `request#CaseReopen` and
  `cancel#CustomerCase`; `mantle.order.ReturnPolicyServices` `find#CustomerReturns`, `request#CustomerReturn`,
  `get#CustomerReturn`, `add#ReturnEvidence` and `withdraw#CustomerReturn`; and the help reads and `rate#Article` over
  the Support mount's knowledge sources (P12).
- **CS-PORTAL, the PASS side.** Each of those as an operation in `Schema.js` and `Routes.js`, served by Mantle's
  PassApi to a remote frontend, and called from the app's pages through `pass.Facade.call#Operation`.
- **Customer identity** (§4). A contact is a PASS public account. An internal user with the external-access
  administrator capability invites them from ContactDetail through a PASS invitation bound to the Support app and the
  customer; redeeming it makes the contact relationship Mantle checks. A customer administrator, a role on that
  relationship, gives a contact the organization's cases. Domain matching grants site membership only, never a
  customer relationship (design-forum §5.1).
- **Links and files.** CustomerReturn takes the RMA's token and NewCustomerCase a queue's intake token (P6), as
  Feedback does, through `check#AccessToken`. Evidence and case files go through PASS's media staging and scanning
  into RequestContent or ReturnContent of a customer-visible type. The return label downloads through the facade,
  streamed by a remote frontend.
- **Help.** SupportHome and CustomerArticle read the published pages of the Support mount's knowledge spaces through
  the site pages' exact wiki binding (F15, F43), with helpful feedback under a per-page nonce and rate limit, and
  Create case citing the article.
- **Notices.** Case replies, return decisions and labels mailed to a contact link to the Support app's pages of the
  case's site, from the URLs Mantle builds for its members.
- The outside-working-hours notice from the queue team's schedule (P4).
- **Screens** (design §8), under `screen/Support/`: SupportHome (HelpSearch, HelpResults), MyCases (MyCaseFind,
  MyCaseList), NewCustomerCase, CustomerCase, MyReturns (MyReturnFind, MyReturnList), RequestReturn, CustomerReturn
  and CustomerArticle, at 390 px and on the desktop. BOSS gains ContactDetail's Invite to support and the Support
  mount's settings in ServiceDefaults (its queues, intake types and knowledge spaces).
- **Demo:** a PASS site for ORG_ZIZI_RETAIL with the Support mount, a CustJqp contact and a JoeDist administrator as
  invited PASS accounts, and token fixtures for the specs.
- **Usable when:**
  - the CustJqp contact redeems the invitation, signs in, sees their cases and replies; an internal note and an
    internal file never show; a colleague's case shows only with the administrator's organization-wide visibility;
  - the contact requests a return of the delivered order's eligible lines, and the server picks the facility and the
    window;
  - the RMA link shows the label; the contact withdraws before receipt, and after it is told to ask an agent;
  - an anonymous sender files a case through the queue's form and gets no case read until verified;
  - a forged, expired or revoked token shows nothing about the customer or the record; an anonymous reader sees
    published help only;
  - the same walk passes through a remote PASS frontend with only framework, webroot and PASS installed;
  - Forum's walks and the Projects client walks pass unchanged.

### P16 — Finish

- The terminal twins, and the server-static pass.
- The design §10 end-to-end review. A Customer Service user with no other launcher is refused cost, finance, stock
  posting and other organizations' records, through URLs, shared contexts, exports, the palette, search and
  notifications. With the W and F groups, the same user works from the shared mounts without the Warehouse or
  Accounting root. A customer contact reaches nothing in BOSS, and nothing of another customer in the Support app.
- The §11 outputs not built earlier: the case summary print, customer-visible and internal.
- The inventories' **Implemented in** columns, the design's Impl column, and Remaining-Work; the mr-pass README and
  `docs/Deployment.md` for the Support mount.

## 4. Decisions

These are made before and during the build. Each one that changes the design is also written into
design-customer-service.md, or into the owner's design.

| Date | Decision | Notes |
| --- | --- | --- |
| Oct 28, 2026 | Customer Service is built last, after Products, Accounting, Warehouse, Manufacturing and Purchasing. It adds its context and callers to what they built for it | The user's call; the five plans assume it |
| Oct 28, 2026 | The shared rules of impl-drawers-commons §4, parties by role and changes by effective date and the audit log, apply; Mantle's existing uses of both are kept | The user's call, in the Purchasing plan review (impl-purchasing §4). Applied here in §2 |
| Oct 28, 2026 | A case's organization is a RequestParty in the OrgInternal role, its customer, contact and assignee RequestParty rows; a team member is a dated PartyRelationship; a queue's organization an owner field | Follows from impl-purchasing §4 (answer 7) and the owner rule; the design's CaseProfile organization field is dropped |
| Oct 28, 2026 | Policies, settings, mappings, rules and templates are effective-dated rows with audit-logged key fields; the design's versions and "publish a version" become a row started from a date. Episodes, events, case relations, decisions, article feedback, invitations and the assignment cursor stay records of their own | The plan's choice under the rule above; each phase says why a record stays |
| Oct 28, 2026 | The root group and filter sets as Products and Purchasing: `BOSS_CUSTOMER_SERVICE` as root user group and artifact group, with service checks. Its groups take `MANTLE_USER_ORG` and `MANTLE_PRIVATE_CONTACT`, and `BOSS_CUSTOMER_SERVICE_ADMIN`, with all authz on the root, `MANTLE_ACTIVE_ORG` and `MANTLE_PRIVATE_CONTACT` (impl-drawers-commons §4). The root user group is also the global saved replies' group | Follows from impl-products §4 and impl-purchasing §4; F3. The filters revised in the core-app question review, for every BOSS root |
| Oct 28, 2026 | Customer Service builds the parts of other needs it still depends on: CX-REQUEST's case rules and the support-case rule (P2, P4); the team working hours and business time (P4, Commons' contract); the survey builder (P13, Commons'); a customer credit-status read if Accounting P10 has none (P3, Accounting's); Customer360's service and delivered-items forms (P11, P14, crosscut §3.2); the forum queue route (P6). These keep the owner's names, packages and Shared screens | The plan's choice, as the other five plans decided for theirs |
| Oct 28, 2026 | Customer Service builds one shared screen pair, the survey builder's `Shared/SurveyForms` and `Shared/SurveyFormDetail`, with its context only; the names go into design-drawers-commons when its survey pass is written. Otherwise it adds its context to the fourteen shared screens the other apps built | Commons owns the builder (crosscut §8), whose screens no plan builds |
| Oct 28, 2026 | Internal entry first: agents enter cases and returns for customers from P2 and P9; the customer pages come in P15, except the feedback page in P13 | The plan's choice, as Purchasing's; the design's internal paths are complete without the customer pages |
| Oct 28, 2026 | Public-facing applications are in mr-pass and internal ones in mr-boss. The customer pages of design §8 are a new PASS app, Support (`screen/Support.xml`, the `support` mount), not `screen/ServicePortal.xml` in BOSS; P13 starts it with Feedback, P15 builds the rest. It follows PASS's foundation: its shell and mounts, public accounts with no UserGroup (so no `BOSS_SERVICE_PORTAL`), the facade with Mantle's PassApi for local and remote authorities, PASS invitations, media and request contract (§2) | The user's call, Oct 28. It reverses crosscut D5's ServicePortal root for Customer Service's pages. The same rule moved Accounting P18's InvoicePay and BillUpload into the PASS Billing and Supplier apps and Purchasing P16's pages into Supplier (their §4); the built public pages are later moves (F42) |
| Oct 28, 2026 | What Mantle's Request rules, the jobs and the Support app call is Mantle's: `mantle.request.SupportCaseServices` holds `ensure#CaseProfile`, `assign#Case`, `validate#TemplateValues`, the closing job and the customer services; `ironstone.customerservice` keeps the BOSS screens' orchestration and calls them | The plan's choice; F41. Mantle never calls BOSS, and a PASS deployment may have no BOSS |
| Oct 28, 2026 | Customers read cases and returns through the Support app's Mantle projections, so Projects' client checks (ChatterServices, RecordFilesServices, ClientServices) are not generalized here | Follows from the Support app decision; design §8's generalization drops (F18) |
| Oct 28, 2026 | A queue's intake token is an ExternalAccessCapability on its RequestCategory, not a PartySetting | F10: PartySetting is keyed by party and type and cannot hold a token per queue |
| Oct 28, 2026 | The order confirmation resent is the stored one: its PDF kept as OrderContent at placement, as the shared rule keeps a key revision's PDF | F29: Mantle's store email re-renders the current order and needs a store email row |
| Oct 28, 2026 | Phase order as §1: the case spine first (cases, customers and orders, service levels, assignment, channels, templates, merge), then returns, order changes and warranty, then knowledge, feedback, reports and the portal | The user's call (answer 1). The alternative was the order side (returns, order changes) right after P3; the case spine gives each later phase its case |
| Oct 28, 2026 | A case is a request in a service queue: a RequestCategory with a current ServiceQueue row. CaseTypes' service-enabled flag says which types a queue offers, and puts a request of that type with a Customer RequestParty and no category into the type's default queue. `RqtSupport` alone makes no case, so an employee's Commons request stays plain (P2) | The user's call (answer 2); F5. The design's "every service-enabled type" would have made every Commons request a case |
| Oct 28, 2026 | An order change is its `RqtOrderChange` Request, its lines RequestItems linked to their order items by RequestItemOrder (product, quantity, unit from Purchasing P10, ship date as `requiredByDate`), with the line action and proposed unit price added and the key fields audit-logged, and an OrderChangeDecision record. The design's OrderChange, OrderChangeLine and application records are dropped (P10) | The user's call (answer 3); F4. One document, as Purchasing made a quote its PO |
| Oct 28, 2026 | A warranty claim is its `RqtWarranty` case: the product a RequestItem, the asset, order, invoice and agreement RequestRecord links, and a WarrantyDecision record. The design's WarrantyClaim record is dropped (P11) | The user's call (answer 4) |
| Oct 28, 2026 | A case template is a DbForm with dependency rows, and a case's values a FormResponse linked to it. The design's CaseTemplate, Field, Dependency and Value records are dropped (P7) | The user's call (answer 5); F16. One form engine with the feedback forms (D24's reuse) |
| Oct 28, 2026 | Design §14's policy items as it recommends: SLA policy by the most specific of customer agreement, customer, queue or type, and organization default, equal ranks refused, bound at intake (P4); a 14-day reopen window as a ServicePolicy field, then a follow-up case (P8); a merge keeps the sources' SLA evidence and deadlines as obligations (P8); warranty coverage by agreement, then the product's warranty at sale through the coverage lookup, then goodwill (P11); return validity set by organization, no fee without a published rule, manual review with no policy (P9); feedback comments private to service management, shared retention, invitation-linked responses immutable (P13) | The user's call (answer 6) |
| Oct 28, 2026 | A signed-in customer contact is the UserAccount of the contact's party, the identity PASS public accounts will use, so the customer pages are not a third identity surface (P15) | The user's call (answer 7); written into crosscut §9 when P0 closes. With the Support app in mr-pass the contact is a PASS public account itself |
| Oct 28, 2026 | Chargeable repair: P11 records the charge estimate and the customer's consent on the warranty decision; the sales quote waits for Sales (§7) | The user's call (answer 8) |
| Oct 28, 2026 | Who is viewing or typing on a case is later (§7), unless P0 finds the Dev AIDE presence (`set#Presence`) generalizes to a record topic at small cost; then it joins P5, beside the reply | The user's call (answer 9) |

## 5. Open questions

| Question | Decides | Notes |
| --- | --- | --- |
| Further issues discovered during implementation | the affected phase | Record findings and decisions here; the open questions of the plan as written are decided in §4 |

The design's other §14 items are decided in §4; ChannelAutomation and Log time are `later` there and in §7.

## 6. Findings

Design assumptions found wrong or unstated in the code, with the resolution. Where a resolution changes the design, it
is written there too.

| # | Finding | Resolution |
| --- | --- | --- |
| F1 | P0: `screen/CustomerService/` has eight flat placeholders: Home, Cases, Orders ("Order lookup & changes"), Returns ("Returns / RMA"), Availability ("Availability lookup"), Customers ("Customer 360"), Knowledge ("Knowledge base") and Settings. There are no Cases, Orders, Returns or Availability directories, and no Approvals or Reports; the root mounts only Chatter and RecordFiles and has no `<shell-providers>`. The `BOSS_CUSTOMER_SERVICE` authz is in BossSetupData's commented block (`ADMIN` always, with `MANTLE_ACTIVE_ORG` and `MANTLE_PRIVATE_CONTACT`). There is no `screen/ServicePortal.xml` | P1; the customer pages are the PASS Support app (§4; P13, P15) |
| F2 | P0: `MANTLE_ACTIVE_ORG` filters Party by owner and OrderPart, Shipment, ReturnHeader and Invoice by party, and nothing filters Request, RequestCategory, OrderHeader or OrderItem (impl-purchasing F2) | Service rows through services (§2) |
| F3 | P0: `BOSS_CUSTOMER_SERVICE` exists only as an artifact group. `EmailTextBlock.userGroupId` is a foreign key to UserGroup, and creating a shared block requires the author to be a member of that group | The root user group (P1); a UserGroup per service team, kept in step by AgentTeams (P5) |
| F4 | P0: Request's statuses are Draft, Submitted, Reviewed, InProgress, Completed and Cancelled; Cancelled has no outgoing transition, Completed goes only to InProgress ("Re-open"). Its types include RqtSupport, RqtInformation and RqtContact, not RqtOrderChange or RqtWarranty. The sales channels are ScWeb, ScPhone and ScEmail. There is no request tag. RequestItem and RequestItemOrder exist; RequestItem has product, quantity, required date, maximum amount and supplier | Seeds in P2, P6, P10, P11; RequestTag (P2); an order change's lines as RequestItems (§4, P10) |
| F5 | P0: RqtSupport is the default type of `create#Request`, Commons QuickRequest, Chat's create, the intake form and the forum's case | §4 (P2): a case is a request in a service queue |
| F6 | P0: RequestCategory has parent, responsible party and description, and no organization. Categories are global, and Projects' intake settings already store them (`store#RequestCategory`) | P2: an owner field, and ServiceQueue rows marking a service queue |
| F7 | P0: `Shared/RequestDetail` takes `requestId` and `tab` only; its context is Projects when `appRoot` is Projects, else Commons, with Projects and Commons links hardcoded. `Shared/WorkItemDetail` is the same. Purchasing P10, Warehouse P15 and Manufacturing P11 add their contexts first | P2 adds the Customer Service context on what they leave |
| F8 | P0: outside Customer Service a request's status, due date or resolution changes through Projects' `triage#Request` (moves and due), `update#ProjectRequest`, Commons' `set#RequestStatus`, `update#MyRequest` and the Edit dialog's "Response wanted by", `make#RequestWorkItem` (which copies the due date), `convert#RequestToProject`, `ClientServices.cancel#ClientRequest`, `bulk#Requests` and `complete#RequestFromWork`, called by the `WorkEffortRequestFromWork` rule | The status rule records every change (P4); resolution and cancel refused or routed on a case (P2); the due date written by SlaServices only (P4) |
| F9 | P0: the RequestTriage and RequestUpdate topic links open Projects' RequestDetail, `get#RecordLink` sends a request with no project to Commons, and Commons Today already lists assigned requests with a due date | P1 routes cases to Customer Service; P2's Today source replaces Commons' rows for a case |
| F10 | P0: the intake token is the `WstIntakeToken` WorkEffortSetting of a WetProject; `create#IntakeRequest` limits by project (30 an hour) and by address (5); `ErActCreateRequest`'s value is a project or empty for the plus tag. PartySetting is keyed by party and type, its value 255 characters | P6: a queue destination for the mail rule and the token, the token an ExternalAccessCapability (§4); the queue's form is the Support app's (P15) |
| F11 | P0: adding RqtSupport to ProjIntake's triaged types puts every case with no project into Projects' triage list, shows it to all of the organization's users through `get#RecordLinkInfo`, and fires Projects' triage notice | P6: organization intake through the queue route; the design changes |
| F12 | P0: the forum's case services are `mantle.forum.ForumServices.create#CaseFromTopic`, `preview#CaseReply` and `publish#CaseReply` (a matching `previewHash`), in ForumIntegration.js; the design's `I.` (IntegrationServices) does not exist. PASS's `createCaseFromTopic` operation already passes a `requestCategoryId`. A case from a topic is ReqDraft, RqtSupport, with no channel, so RequestTriageNotice does not fire, and it is linked by RequestCommEvent and PublicDiscussionLink, not RequestRecord | P6; the design's names and link change |
| F13 | P0: working hours are the user's own WetAvailable (`store#WorkingHours`); there is no team or organization schedule and no holiday editor. `get#NextBusinessDay` and `get#FutureBusinessDay` count whole days less WepHoliday; nothing computes business minutes | P4: a team schedule and a Mantle business-time service |
| F14 | P0: the approvals list is a section of Commons Notifications, filtered by `appName` only; a topic is an approval by its `approveServiceName` and `refuseServiceName`; `get#UserNotifications` accepts a topic | P9, on Accounting's filter answer (its F43) |
| F15 | P0: WikiPageReview approves a page version before publishing; it is not a suggestion. `publicPageUrl` is a WikiSpace URL template, and BOSS has no public help-centre page | P12's Suggest edit; P15's CustomerArticle |
| F16 | P0: DbForm has no version, name or title field (description and purpose only); DbFormFieldOption has no score; FormResponse is nontransactional; `update#FormResponse` and `delete#FormResponse` exist | P7: templates on DbForm (§4) and the version fields in the framework; P13: the option key as score, the guard |
| F17 | P0: no `ExternalAccessServices` exists (Accounting P18). EXTERNAL_USER is a permission. The client deny pattern's service pattern names `ironstone.(commons\|comms\|projects\|products\|shared)` and a fixed verb list, and ClientWrites walks every ironstone service file | P1 adds the package and verbs; customers never reach BOSS (§4) |
| F18 | P0: client checks are bound to projects: `get#ClientWriteContext` refuses a request with no project, Chatter's client mode comes from PROJECT_CLIENT, and `get#ClientRecordVisibility` shows a request the client filed or one of a client project. A client's file list may include RqCntInternal content (P0 confirms) | Customers read through the Support app's Mantle projections, outward messages and approved files only (§4, P15), so these stay as they are; P0 confirms the internal-content question for Projects' own clients |
| F19 | P0: the borrowed groups (`BOSS_ACCOUNTING_AR`, `_TREASURY`, `_APPROVE`, Warehouse's receive, inspect and quality manager) do not exist yet | Their owners' P1; P0 checks |
| F20 | P0: AppStructure's built-root list (Commons, Comms, Insights, Projects, Products) and TuiRender's (Commons, Comms, Insights, Products) leave out Customer Service | P1 adds it |
| F21 | P0: `find#ReturnableOrderItems` measures invoiced quantity less non-cancelled returns; nothing locks eligibility across drafts; `update#ReturnItem` can raise `returnQuantity` at any status without the ceiling | P9: eligibility under a lock, shipped and invoiced, every BOSS write checked |
| F22 | P0: `cancel#Return` cancels the items and header but not the return shipment approval made | P9 |
| F23 | P0: `add#ReturnToShipment` sets `ReturnItemBilling.shipmentId`, which is not a field | P9's Mantle fix, unless Warehouse P14 made it |
| F24 | P0: ReturnHeader has no assignee, expiry or customer reference, and Mantle has no ReturnParty. ReturnContent is a TODO, which Warehouse P14 adds; RecordFiles does not cover returns yet | P9: the fields audit-logged and a dated ReturnParty, a new role association on the rule's pattern |
| F25 | P0: approval runs `process#ReturnItemResponses`, which makes a replacement order for RrspReplace whatever `responseImmediate` says; receipt cuts `returnQuantity` to the quantity received, ignores rejected units and runs once when the shipment is Delivered. ReturnToResponseBasicFlow asserts all of it | Accounting P17's conditioned rules and `receive#ReturnItems`, behind their flags; P9 builds on them |
| F26 | P0: the invoice made at pack is finalized, posted and mailed, not a draft (impl-accounting F25); no plan builds InvoiceCorrection | Decided: finalized at ship behind D3's flag (impl-accounting §4); P10 releases it before ship |
| F27 | P0: OrderHold is an existing order status, reachable from Open, Placed, Processing and Approved but not Sent; mr-marble holds through `update#OrderStatus`; releasing to Approved fires the OrderApproved rules again (the email, deduplicated by type, reservations, subscriptions, notify) | Accounting P10's `hold#Order`; P0 checks the release; P10 |
| F28 | P0, read not run: `cancel#OrderItem` has no order-status guard and on a partial cancel relies on a rule; `reserve#AssetForOrderItem` returns before its over-reserved branch, so excess reservations may stay | P10's explicit `reduce#AssetReservation`; P0 runs it |
| F29 | P0: `send#OrderStoreEmail` renders the order as it is now, and sends nothing without a store and a ProductStoreEmail row; POPC_DEFAULT has none, and store-less orders never send | P3 resends the stored confirmation (§4) |
| F30 | P0: `find#Party` has no customer scope, so empty criteria page through every visible party; Mantle has no order find service | P2 `find#ServiceCustomers`, P3 `find#ServiceOrders` |
| F31 | P0: `get#InventoryProjectedInfo` returns an empty map with a message when search is off, sums AstAvailable assets only, has no incoming purchase supply and does not split purchase lines from demand; the ATP reads return one number | Products P7 and Warehouse P4 own the reads; P3 shows unknown, never zero |
| F32 | P0: Agreement has no statuses (Purchasing P13 adds them), no service or warranty type, and no SLA or warranty term type | P4 seeds a service agreement type for the SLA condition; P11 |
| F33 | P0: PatEquivalent and PatReplacement are seeded and edited on Product360, with no demo; PftWarranty is seeded and ProductFeature has `numberSpecified` and `numberUomId`, with no demo; WepMaintenance is seeded and unused; AssetIssuance has `assetMaintenanceId` | P10 and P11 demo data; P0 settles the repair record |
| F34 | P0: Mantle seeds no sales orders, shipments, invoices, payments or returns; they come from the spec chain (OrderToCashBasicFlow, ReturnToResponseBasicFlow). The customers are CustJqp, JoeDist, ORG_ACME and ORG_BLUTH; ZiddlemanInc is a supplier; EQUIP_AB4_1 and _2 are internally owned serials; POPC_DEFAULT belongs to ORG_ZIZI_RETAIL with ZIRET_WH and wiki space ZZW_RETAIL | P1's demo service places, ships, invoices and pays the orders |
| F35 | P0: `Shared/OrderDetail` reads through Projects' `BillingServices.get#OrderDetail`, which needs a project link, and InvoiceDetail is Projects-only; Accounting P4 and P6 and Warehouse P11 generalize them | P0 checks before P3 |
| F36 | P0: no plan builds `CreditServices.get#CustomerCreditStatus`; Accounting P10 builds the policy, holds and Customer360's Credit tab with no read service named | P3 as Accounting's contract, if still missing |
| F37 | P0: impl-warehouse P14 writes `request#ReturnLabel` bare, under Purchasing's contract; the designs name `mantle.shipment.WarehouseTaskServices.request#ReturnLabel`. `create#ReturnShipment` already makes the route segment, so the label needs a package | P0 checks; P9 calls Warehouse's |
| F38 | P0: impl-warehouse P8 defines what Release and Scrap do, not the other five dispositions, Return to customer among them | P9 writes what a customer return needs into design-warehouse |
| F39 | P0: no plan builds the survey builder, minute business time, D23's Request rules or the support-case rule in `complete#RequestFromWork`; Purchasing P10's type check covers RqtPurchase and RqtInventory | P13, P4, P2 (§4) |
| F40 | P0: Manufacturing P11 makes maintenance an AssetMaintenance through `EquipmentServices.create#AssetMaintenance`, with `RqtMaintenance` and a Request linked by `link#RequestRecord`; the design's warranty repair is a WepMaintenance work effort | P0 settles one repair record (P11) |
| F41 | P0: the design runs the case rules from Mantle's Request entity rules but names BOSS services for them (`ironstone.customerservice.CaseServices.ensure#CaseProfile`, AssignmentServices, TemplateServices). Mantle never calls BOSS, and a PASS deployment may have Mantle and no BOSS | §4: `mantle.request.SupportCaseServices` (P2, P5, P7, P8, P15); the design's §12 namespaces change |
| F42 | P0: public-facing pages are planned or built in mr-boss elsewhere. Planned: crosscut §5 and D5 put `screen/ServicePortal.xml` and `screen/SupplierPortal.xml` in BOSS with the `BOSS_SERVICE_PORTAL` and `BOSS_SUPPLIER_PORTAL` groups; impl-accounting P18 builds both roots, `ironstone.accounting.PortalServices`, InvoicePay, SupplierBillUpload and the `pay` and `/po/<token>` routes in BOSS's MoquiConf; impl-purchasing P16 builds the supplier home, QuoteResponse, OrderAcknowledgement, `ironstone.purchasing.PortalServices` and `/rfq/<token>` there; impl-manufacturing §7's subcontract view and impl-warehouse §7's owner-stock portals would follow them. Built in BOSS: Projects' RequestIntake (`/r/<token>`), Commons' PublicShare (`/s/<token>`), Unsubscribe (`/u/<token>`) and PublishedCalendar (`/cal/<token>`); Projects' clients sign in to BOSS's Projects screens | Customer Service's pages are the Support app (§4). On Oct 28 impl-accounting P18 and impl-purchasing P16 moved theirs to the PASS Billing and Supplier apps, impl-projects §9 plans the Client app for Projects' clients and its public request form, and impl-drawers-commons §6 lists Commons' built pages as later moves; the crosscut and app designs change when each plan's P0 closes |
| F43 | P0: PASS's root `Pass.xml` resolves a site from its host and mounts the Forum, Account, Members and Sites apps from `mantle.public.PublicSiteApp` (app, path prefix, enabled, target); screens call `pass.Facade.call#Operation`, whose `Schema.js` maps an operation to a Mantle service and its fields, and whose `Routes.js` gives the remote path Mantle's PassApi servlet serves at `/rest/s1/pass/v1/sites/*`. Public accounts hold only `ALL_USERS`, PASS roles are PublicSiteParty rows, invitations are PublicSiteInvitation, and site pages bind exact wiki pages (PublicSitePage). PASS has no terminal UI | The Support app on these (§2; P13, P15); P0 checks how a new app registers |

## 7. Later

Designed, not in this build:

- **The design's `later` rows:** ChannelAutomation (scripted chat, chatbot steps, telephony adapters), and Log time on a
  case through Projects' time services (R-CS-22).
- **Other design items:**
  - external knowledge sources (product documents, the forum, an external knowledge API);
  - the chargeable repair's sales quote and the on-site intervention report (design §14), with Sales and Maintenance;
  - who is viewing or typing on a case (design §14), unless P0 brings it into P5 (§4);
  - the Support app's terminal pages (design §8), when PASS gains a terminal UI;
  - full Commerce storefront accounts (crosscut §5.1).
- **Other apps' contexts:** the Sales rows of the screens Customer Service mounts; Marketing's and People's mounts of
  the survey builder.
- **Other apps' callers:** the order owner (Sales) applying the order-change kinds Customer Service only approves:
  price, quantity increase, ship date, address, ship method and carrier.
- **The rest of the other apps' needs:** crosscut's CX-AVAILABILITY projection beyond what Products P7 and Warehouse P4
  built (incoming purchase supply, held and inspection stock apart; F31); NCR and CAPA in the shared quality model.

## 8. Verification

- **Per phase,** the "Done" rule of §2 and the phase's "usable when".
- **End to end,** run `./moq run`, sign in as `john.doe` and as each demo service user, and walk each built phase's
  "usable when" in order; sign in to the demo PASS site as the demo customer contacts for the Support app's, locally
  and through a remote frontend.
- **Design §10 end-to-end review,** scenario by phase:

| Scenario | Phase |
| --- | --- |
| Product, supplier price, PO, partial receipt and inspection, bill and payment | P3 (customer-safe Product360 and availability); the rest is Purchasing's, Warehouse's and Accounting's |
| Shortage, buy, make or transfer, partial completion | P3 (availability read, with provenance as the owners built it); Manufacturing's and Purchasing's |
| Order, reservation, pick shortfall, pack, ship, invoice and payment | P10 (substitution and the change after pack), on Warehouse P11–P13 and Accounting P17 |
| Case, RMA, partial receipt, failed inspection, credit or refund | P9; a supplier return linked from the case is Purchasing P8's |
| Count with an intervening movement | Warehouse's P10; Customer Service reads availability (P3) |
| Case intake, assignment, pause and reopen, resolution, CSAT | P2, P4, P5, P6, P8 and P13; a customer's own intake and reply in the Support app, P15 |
| Unauthorized actions, cancellations, closed period and standalone use | `CustomerServiceAccess` in every phase; P9 and P10 (cancel and ClosedPeriod); P16 |
| Independent failures, atomic inner operations | Every phase: P2 (bulk), P4 (the SLA scan), P5 (bulk reply), P9 (batch authorize), P12 (feedback review), P13 (invitations) |

- **Screenshots** through the BOSS client spec of §2, light and dark, and the Support app's through PASS's client
  spec at phone and desktop widths.
