# IronStone BOSS — Customer Service design

Oct 28, 2026 — draft; reviewed against research-customer-service.md, the reference apps and the other core designs ([review-core-apps.md](review-core-apps.md)); saved replies are Comms text blocks, case rules run from Request ECA rules, returns split into authorize, label, receive and settle, order changes narrow to cancellation and short-pick substitution, the portal gets its own root and three screens take full-word names

This design is for support agents, order-desk staff, service managers and customer contacts. It covers case intake through resolution, order enquiries and controlled changes, customer returns, warranty coordination, knowledge and feedback. It specifies screens and proposed extensions; it does not implement them. A business can use Customer Service on its own by granting the required business capabilities to its staff.

Inputs: [research-customer-service.md](research-customer-service.md), [design-doc-guide.md](design-doc-guide.md), [ss-inventory.md](ss-inventory.md), [usl-inventory.md](usl-inventory.md), [style-guide.md](style-guide.md), [initial-design.md](initial-design.md), [design-crosscut.md](design-crosscut.md), [Commons](design-drawers-commons.md), [Projects §6](design-projects.md#6-requests), [Products](design-products.md), [Warehouse](design-warehouse.md) and [Accounting](design-accounting.md). Crosscut is authoritative for shared record screens and cross-app transactions.

Sections: [1 shell](#1-shell) · [2 screens](#2-screens) · [3 cases](#3-cases) · [4 customers-and-orders](#4-customers-and-orders) · [5 returns](#5-returns-and-warranty) · [6 availability-and-knowledge](#6-availability-and-knowledge) · [7 reports](#7-reports) · [8 customer-access](#8-customer-access) · [9 settings](#9-settings) · [10 coverage](#10-baseline-and-research-coverage) · [11 outputs](#11-documents-and-outputs) · [12 needs](#12-framework-and-data-needs) · [13 decisions](#13-decided) · [14 open](#14-open).

## 1. Shell

Existing root scaffold `CustomerService`, title **Customer Service**, icon `sym_o_support_agent`; its `BOSS_CUSTOMER_SERVICE` grant is currently commented out and must be enabled with the implemented screens. Root entry is a navigation grant, not authority to read or change every case, order, return or financial record. `mantle.party.PartyServices.setup#UserOrganizationInfo` supplies the same organization context as the existing roots. The root requires an organization; the UI displays it and preserves it through every shared-screen link.

The menu, to depth two, with the screen each entry opens. Detail screens are reached from records, not permanent menu entries.

- Home → Home
- Cases → Cases (`CustomerService/Cases/Cases`); Channels → ChannelSessions
- Customers → Customers
- Orders → Orders (`CustomerService/Orders/Orders`); Change requests → OrderChanges
- Returns → Returns (`CustomerService/Returns/Returns`); Warranty → WarrantyClaims
- Approvals → Approvals (M, R)
- Availability → InventoryAvailability, StockAtDate (the Warehouse report, mounted), Product360
- Knowledge → Knowledge; Article feedback → ArticleFeedback
- Reports → Reports, with SLA compliance → ServiceLevelCompliance, Response times → ResponseTimes, Case volumes → CaseVolumes, CSAT results → SatisfactionResults and Return analysis → ReturnAnalysis; CaseAnalytics opens from a case
- Settings → Settings, a settings landing that links Queues, AgentTeams, AssignmentRules, SLA policies → ServiceLevelPolicies, StatusCategories, CaseTypes, CaseTemplates, SavedReplies, ChannelRouting, ReturnPolicies, KnowledgeSources, FeedbackForms, ServiceDefaults and ChannelAutomation (later)
- Service portal, the separate `screen/ServicePortal.xml` root of §8 (not part of this menu): SupportHome, MyCases, MyReturns

Cases, Orders, Returns and Availability are menu groups, so their lists sit inside them (`CustomerService/Cases/Cases`), as Warehouse does with `Warehouse/Returns/Returns`. Availability matches the existing placeholder `screen/CustomerService/Availability.xml`. Cases defaults to Assigned to me; managers can choose New/unassigned as their personal default. Home is the root landing. Depth remains two; long settings lists use a settings landing and links.

Home, the landing, shows these panels, each only to the roles named:

- a KPI strip (all roles): open, overdue, unassigned, SLA compliance, first response, resolution and CSAT, each with its period, denominator, timestamp and the change against the previous period of the same length;
- My cases (A, M, D);
- Team queues (A, M);
- Returns awaiting approval (R, M);
- Approvals waiting (M, R);
- shortcuts: New case and Request return.

Role shorthand used below: **A** service agent; **M** service manager; **D** order-desk operator; **R** return authorizer; **W** stock/quality capability; **F** financial settlement capability; **K** knowledge author; **S** service administrator; **C** customer contact. These are proposed capability bundles over existing users, groups and organization membership, not separate agent accounts. Sensitive capabilities include `case.manageTeam`, `case.merge`, `order.change.approve`, `order.change.apply`, `return.authorize`, `stock.receive`, `quality.dispose`, `invoice.credit`, `payment.refund`, `case.feedback.read` and `service.configure`; services check the underlying record and organization as well as the action. Read-only tabs do not imply mutation rights. Customer membership and contact access are checked server-side for every result and action, including searches and attachments.

**Capability groups.** The letters map to the user groups of the crosscut §1 capability table (D22), so a standalone service business can configure them. A is proposed `BOSS_CUSTOMER_SERVICE_AGENT`, M `BOSS_CUSTOMER_SERVICE_MANAGER`, D `BOSS_CUSTOMER_SERVICE_ORDER_DESK`, R `BOSS_CUSTOMER_SERVICE_RETURN_AUTHORIZER`, K `BOSS_CUSTOMER_SERVICE_KNOWLEDGE` and S `BOSS_CUSTOMER_SERVICE_ADMIN`; each also grants the root `BOSS_CUSTOMER_SERVICE`. W is Warehouse's receive and inspect grants, plus its quality-manager grant to dispose. F is Accounting's `BOSS_ACCOUNTING_AR` to credit and `BOSS_ACCOUNTING_TREASURY` to refund a payment; a credit without receipt also needs `BOSS_ACCOUNTING_APPROVE`. C is the proposed portal group `BOSS_SERVICE_PORTAL` (§8). The dotted names above are the actions the services check; each is granted through one of these groups.

**Shell providers.** Register New case and Request return in Quick create; permitted cases, customers, orders and RMAs in the command palette; own due/overdue cases in Today; approvals in the existing Commons Approvals center, mounted here as Approvals; notifications for assignment, SLA warning/breach, customer reply, return decision and feedback. Use the existing Assist context, Chatter, files, presence, preferences and key-map conventions. Providers return the permitted record URL, not an app-root permission shortcut. A new case from an order, chat or message preserves a `RequestRecord` link and the original communication reference.

**Interaction contract.** XML forms are the default. Saved finds, select-columns, date-periods, accessible statuses and list/board switching follow the style guide. Every board move has an equivalent row action and confirms the same transition; bulk operations report success or a named failure per case, preserving successful independent items. Browser keyboard shortcuts supplement visible controls. Terminal users get searchable lists, numbered actions, plain-text conversation and explicit confirmations; they never need drag/drop, hover or rich-text composition. Phone layouts stack the case sidebar beneath facts and retain an explicit Send button. Stock receipt and quality actions mount the Warehouse handheld forms, with scan/manual-entry equivalence and no offline posting.

**Current-source boundary.** The active Shared RequestDetail, RequestRecord and WorkEffortRecord links, email/public intake, Chatter, client audience isolation and working-hours calendars were added after parts of the research. They are reused. The case queue/SLA policy, service-specific authorization, merge/split, saved reply actions, return policy, controlled order-change and feedback association described here are proposed. Existing `ReqDraft`, `ReqSubmitted`, `ReqReviewed`, `ReqInProgress`, `ReqCompleted`, `ReqCancelled` remain valid; `ReqWaitingCustomer` and `ReqOnHold` below are proposed seeds, not current statuses. The inventory service can report that its projection is not ready; the UI must not turn an unavailable projection into zero availability or a promise.

**Existing automation.** Several Mantle service ECA rules and one entity ECA rule already run on the paths designed here: order approval, reservation and the order emails, the return approval and receipt rules, the sales invoice at pack, the reservation of released stock, the invoice email at finalize and the request triage notice. §13 Decided lists each one and says whether this design keeps it, runs it under a condition or replaces it, for the crosscut §1.3 register (D1).

## 2. Screens

All internal paths are under `CustomerService/`. `ServicePortal/` paths are under the proposed audience root `screen/ServicePortal.xml`, outside the internal app root (D5, §8). Scope uses the guide's definitions: `parity` replaces something MarbleERP or SimpleScreens has, `new` has no baseline, and `later` is designed but built after the first release. A `parity` screen may still gain new service behavior, which its section describes. Shared rows reference their single definition; detail sections provide context only. Public pages use the common external-access contract and do not require the internal root grant.

| Screen | Path | Archetype | Impl | Purpose | Main record | Reused | Roles | Scope | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Home | CustomerService/Home | landing | xml | Work and service health | Request | own | app; panels by role (§1) | new | Request rows of own and team scope; organization |
| Cases | CustomerService/Cases/Cases | list | xml | Saved queues and triage | Request | own | A,M | parity | Request rows; list find parameters |
| NewCase | CustomerService/Cases/NewCase | wizard | xml | Intake with suggestions and template | Request | own | A,D | parity | Request requestId once created; source record when given |
| CaseDetail | CustomerService/Cases/CaseDetail | detail | xml | Resolve a support case | Request | Projects RequestDetail / CX §3.11 | A,M,D,R | parity | Request requestId |
| MergeCases | CustomerService/Cases/MergeCases | wizard | xml | Deduplicate related cases | Request | own | M | new | Request rows (the selected cases) |
| SplitCase | CustomerService/Cases/SplitCase | wizard | xml | Separate issues with evidence | Request | own | A,M | new | Request requestId (source); CommunicationEvent rows (selected messages) |
| WorkItemDetail | CustomerService/Cases/WorkItemDetail | detail | xml | Follow the work linked to a case | WorkEffort | Task / work item, Projects §5 / CX §3.12 | A,M | parity | WorkEffort workEffortId |
| ChannelSessions | CustomerService/Cases/ChannelSessions | list | xml | Call/chat history and intake | CommunicationEvent | own | A,M | new | CommunicationEvent rows; list find parameters |
| Customers | CustomerService/Customers | list | xml | Find service customers | Party | own | A,D,R | parity | Party rows; list find parameters |
| Customer360 | CustomerService/Customers/Customer360 | 360 | xml | Customer service context | Party | CX §3.2 | A,D,R | parity | Party customerPartyId |
| ContactDetail | CustomerService/Customers/ContactDetail | detail | xml | Customer contact | Party | Commons contact record / CX §3.1 | A,D | parity | Party partyId |
| Orders | CustomerService/Orders/Orders | list | xml | Quick and advanced lookup | OrderHeader | own | A,D | parity | OrderHeader rows; list find parameters |
| OrderDetail | CustomerService/Orders/OrderDetail | detail | xml | Enquiry and service actions | OrderHeader | CX §3.6 | A,D,R | parity | OrderHeader orderId |
| OrderChanges | CustomerService/Orders/OrderChanges | list | xml | Proposed changes and approvals | Request | own | D,M | new | Request rows of the proposed `RqtOrderChange` type; list find parameters |
| OrderChangeDetail | CustomerService/Orders/OrderChangeDetail | detail | xml | Compare, approve and apply | Request + proposed OrderChange | own | D,M | new | Request requestId; OrderHeader orderId, orderRevision |
| ShipmentDetail | CustomerService/Orders/ShipmentDetail | detail | xml | Tracking and delivery evidence | Shipment | CX §3.8 | A,D | parity | Shipment shipmentId |
| InvoiceDetail | CustomerService/Orders/InvoiceDetail | detail | xml | Explain bill, credit and payment | Invoice | CX §3.16 | A,D,F | parity | Invoice invoiceId |
| Returns | CustomerService/Returns/Returns | list | xml | RMA queue and exceptions | ReturnHeader | own | A,R,M | parity | ReturnHeader rows; list find parameters |
| NewReturn | CustomerService/Returns/NewReturn | wizard | xml | Select returnable source lines | ReturnHeader | own | A,R | parity | ReturnHeader returnId (draft); OrderHeader orderId |
| ReturnDetail | CustomerService/Returns/ReturnDetail | detail | xml | Authorize and follow resolution | ReturnHeader | CX §3.18 | A,R,W,F | parity | ReturnHeader returnId |
| QualityInspection | CustomerService/Returns/QualityInspection | task | xml | Inspect returned goods | proposed inspection | CX §3.19 | A,R,W | new | proposed QualityInspection inspectionId; ReturnHeader returnId |
| WarrantyClaims | CustomerService/Returns/WarrantyClaims | list | xml | Warranty claim queue | Request | own | A,M | new | Request rows of the proposed `RqtWarranty` type; list find parameters |
| WarrantyAssessment | CustomerService/Returns/WarrantyAssessment | detail | xml | Assess coverage and coordinate repair | Request + proposed WarrantyClaim | own | A,M | new | Request requestId; Asset assetId |
| Approvals | CustomerService/Approvals | list | xml | Decide order-change and return exceptions in the shared center | NotificationMessage | Notifications, Commons §4; CX §3.15 | M,R | new | NotificationMessage rows; topic and recipient filters |
| InventoryAvailability | CustomerService/Availability/InventoryAvailability | list | xml | Availability and incoming supply | Product/Asset | CX §3.7 | A,D | parity | Product productId; list find parameters |
| StockAtDate | CustomerService/Availability/StockAtDate | report | xml | Explain historical stock | proposed `mantle.product.InventoryReportServices.get#InventoryAtDate` over AssetDetail | StockAtDate, Warehouse §14; crosscut §3.26 | A,D | new | Product productId, Facility facilityId; report parameters |
| Product360 | CustomerService/Availability/Product360 | 360 | xml | Explain product/variant | Product | CX §3.5 | A,D | parity | Product productId |
| Knowledge | CustomerService/Knowledge | editor | qvue | Search, read, link and suggest edits to articles | WikiPage | Commons Knowledge | A,K | parity | WikiPage wikiPageId; WikiSpace wikiSpaceId |
| ArticleFeedback | CustomerService/Knowledge/ArticleFeedback | list | xml | Review unsuccessful answers | proposed article feedback | own | K,M | new | proposed ArticleFeedback rows; list find parameters |
| CaseToArticle | CustomerService/Knowledge/CaseToArticle | wizard | xml | Draft reusable answer | WikiPage/Request | own | A,K | new | Request requestId; WikiSpace wikiSpaceId |
| Reports | CustomerService/Reports | landing | xml | Service report catalogue | Request | own | A,M | new | none |
| ServiceLevelCompliance | CustomerService/Reports/ServiceLevelCompliance | report | xml | Breaches and policy performance | proposed SLA episodes | own | M | new | report parameters (queue, policy, period) |
| ResponseTimes | CustomerService/Reports/ResponseTimes | report | xml | First response and resolution | proposed SLA episodes | own | M | new | report parameters (team, priority, period, time basis) |
| CaseVolumes | CustomerService/Reports/CaseVolumes | report | xml | Demand, backlog and workloads | Request | own | M | new | report parameters (channel, type, team, period) |
| SatisfactionResults | CustomerService/Reports/SatisfactionResults | report | xml | Survey responses and trends | FormResponse | own | M | parity | FormResponse rows; report parameters |
| ResponseDetail | CustomerService/Reports/ResponseDetail | detail | xml | Inspect feedback | FormResponse | own | M | parity | FormResponse formResponseId |
| CaseAnalytics | CustomerService/Reports/CaseAnalytics | report | xml | Explain one case's measurements | Request/SLA events | own | A,M | new | Request requestId |
| ReturnAnalysis | CustomerService/Reports/ReturnAnalysis | report | xml | Returns by reason, product, disposition and credited amount | ReturnItem | own | M,R | new | report parameters (reason, product, disposition, period) |
| SupportHome | ServicePortal/SupportHome | landing | xml | Search first and find support | WikiPage | own | C,public | new | none (published content only) |
| MyCases | ServicePortal/MyCases | list | xml | Customer's permitted cases | Request | own | C | parity | Request rows; list find parameters |
| NewCustomerCase | ServicePortal/NewCustomerCase | wizard | xml | Customer intake | Request | NewCase (§3) | C,token | parity | Request requestId once created |
| CustomerCase | ServicePortal/CustomerCase | detail | xml | Safe case conversation | Request | Projects RequestDetail / CX §3.11 | C | parity | Request requestId |
| MyReturns | ServicePortal/MyReturns | list | xml | Customer's return requests | ReturnHeader | own | C | new | ReturnHeader rows; list find parameters |
| RequestReturn | ServicePortal/RequestReturn | wizard | xml | Ask to return eligible goods | ReturnHeader | NewReturn (§5) | C | new | ReturnHeader returnId (draft); OrderHeader orderId |
| CustomerReturn | ServicePortal/CustomerReturn | detail | xml | Authorization and return progress | ReturnHeader | CX §3.18 | C,token | new | ReturnHeader returnId |
| CustomerArticle | ServicePortal/CustomerArticle | detail | qvue | Published help and feedback | WikiPage | Commons Knowledge | C,public | parity | WikiPage wikiPageId |
| Feedback | ServicePortal/Feedback | task | xml | Submit CSAT once per invitation | FormResponse | own | invitation holder | new | none (token-scoped page) |
| Settings | CustomerService/Settings | settings | xml | Configuration index | — | own | S | new | none |
| Queues | CustomerService/Settings/Queues | settings | xml | Categories, teams and visibility | RequestCategory | own | S,M | new | RequestCategory rows |
| AgentTeams | CustomerService/Settings/AgentTeams | settings | xml | Service team participation | Party/UserAccount | own | S,M | new | Party rows (team members) |
| AssignmentRules | CustomerService/Settings/AssignmentRules | settings | xml | Deterministic routing | proposed rule | own | S | new | proposed ServiceAssignmentRule rows |
| ServiceLevelPolicies | CustomerService/Settings/ServiceLevelPolicies | settings | xml | SLA targets and calendar bindings | proposed policy | own | S | new | proposed ServiceLevelPolicy rows |
| StatusCategories | CustomerService/Settings/StatusCategories | settings | xml | Case workflow semantics | StatusItem + proposed mapping | own | S | new | proposed CaseStatusMapping rows |
| CaseTypes | CustomerService/Settings/CaseTypes | settings | xml | Offered request types | Enumeration | own | S | parity | Enumeration rows of type RequestType |
| CaseTemplates | CustomerService/Settings/CaseTemplates | settings | xml | Intake templates and dependencies | proposed template | own | S | new | proposed CaseTemplate rows |
| SavedReplies | CustomerService/Settings/SavedReplies | settings | xml | Messages and explicit actions | EmailTextBlock + proposed SavedReplyAction | own | A,S | new | EmailTextBlock rows |
| ChannelRouting | CustomerService/Settings/ChannelRouting | settings | xml | Mail/chat intake mapping | existing EmailRule (`ErActCreateRequest`) and ProjIntake PartySetting | own | S | new | EmailRule rows; organization |
| ReturnPolicies | CustomerService/Settings/ReturnPolicies | settings | xml | Return window and authority | proposed policy/ReturnReason | own | S,R | new | proposed ReturnPolicy rows |
| KnowledgeSources | CustomerService/Settings/KnowledgeSources | settings | xml | Permitted service knowledge | WikiSpace | own | S,K | new | WikiSpace rows |
| FeedbackForms | CustomerService/Settings/FeedbackForms | list | xml | Customer Service mount of the shared survey builder: feedback definitions | DbForm | own | S | parity | DbForm rows |
| FeedbackFormDetail | CustomerService/Settings/FeedbackFormDetail | detail | xml | Form fields and preview | DbForm | own | S | parity | DbForm formId |
| ServiceDefaults | CustomerService/Settings/ServiceDefaults | settings | xml | Intake and resolution defaults | proposed service policy | own | S | new | none |
| ChannelAutomation | CustomerService/Settings/ChannelAutomation | settings | xml | Scripted chat and CTI adapters | proposed channel rule | own | S | later | none |

The last row is a specified deferred surface, not a prerequisite for cases, call notes, chat-linked intake or email. Related-record links may open a permitted shared mount in this app even when the destination app root is not granted.

## 3. Cases

### Home

**Layout.** KPI strip above My cases, Team queues and Returns awaiting approval. Counts use the same access filter and saved-find definitions as Cases/Returns. Open, overdue, unassigned, SLA compliance, first response, resolution and CSAT show period, denominator and timestamp; absent SLA/feedback data is “Not configured”/“No responses”, never zero performance. Each panel shows only to the roles §1 names for it, so a K, S, F or W user lands on the KPI strip and the shortcuts their grants allow, not on a page they cannot use. Each KPI shows its change against the previous period of the same length, and a user who may see both splits My figures from Team figures (Frappe's "My Stats" and "My Organization").

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ServiceMetrics | display | Service health and drill-down | period, queue, open/overdue/unassigned, SLA %, response/resolution, CSAT count/score | shared dashboard cards; tabular terminal view | proposed `ironstone.customerservice.ReportingServices.get#ServiceDashboard` | Frappe `helpdesk/api/dashboard.py`; baseline FindRequest filters |
| MyCases | list | Next work | id, name, customer, priority, due, assignee, last customer reply | saved finds | proposed `CaseServices.find#Cases` | `Request/FindRequest` `ListRequests` |
| TeamQueues | list | Choose a queue | team, queue, open, unassigned, breached | drill-down links | proposed `CaseServices.get#QueueCounts` | Frappe `Tickets.vue` |
| AwaitingReturns | list | Approvals due | return, customer, requested, expiry, exception | existing approvals link | proposed `ReturnPolicyServices.find#ReturnApprovals` | `Return/FindReturn` `ReturnHeaderList` |
| ApprovalsWaiting | list, read | Order-change and return decisions due | topic, record, requested by, age | opens Approvals | existing Commons Notifications approvals provider, filtered to the service topics | design-drawers-commons §4 Notifications |

**Actions.** Open the filtered queue; new case; request return. Counts expose no hidden customer names. **Devices.** Phone cards collapse to labels and links. **Source.** Research §2 and §13 Home; [R1](#reference-files). **Needs.** CS-QUEUE, CS-SLA, CS-PROVIDERS.

### Cases

**Layout.** Saved views Assigned to me, New/unassigned, Waiting for customer, Needs response, SLA risk, Recently resolved and All permitted. Team and organization remain visible. Status board groups by configured case status, not raw lexicographic status ID; empty columns show counts. Board is another view of the same filtered list.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| CaseFind | find | Narrow permitted queue | text/id, customer, type, category/queue, status/category, priority band, assignee/team, channel (`Request.salesChannelEnumId`), due/created periods, tags (proposed `RequestTag`) | saved-finds, date-period, Not filters | proposed `CaseServices.find#Cases` | `Request/FindRequest` `ListRequests`; Frappe Tickets |
| CaseList | list | Triage | id/name, customer, SLA clocks, unread/customer reply, team, priority, status, channel | select-columns; row action equivalent to board move | same proposed read | same baseline |
| BulkCaseAction | dialog | Assign, set status, add reply | selected case IDs, operation, assignee/status, resolution/pause reason, reply template/text, notify, idempotency key | preview affected/forbidden rows | proposed `CaseServices.apply#CaseBatch`; shared Request update/assignment/message services | Frappe ticket bulk actions; existing Projects independent request batches |

Bulk reply previews recipients per case; no cross-customer thread or exposed address list. Each case transaction validates visibility and current status independently, returns case ID plus outcome such as `StaleCase`, `AssigneeUnavailable`, `Forbidden`, `ReplyDeliveryPending`. A queued outbound message is visibly pending; delivery failure is retried by its stable message ID, not by creating another reply. Restricted batch rows do not abort authorized independent rows or reveal hidden data. **Views.** List and board; the board groups by the configured case status category. A case tag is a proposed `mantle.request.RequestTag` row (requestId, tagEnumId of the proposed EnumerationType `RequestTag`, fromDate, thruDate), set by BulkCaseAction and by a saved reply's tag action (CS-QUEUE). **Source.** Research §3–4; [R1](#reference-files). **Needs.** CS-QUEUE, CS-SLA, CS-REPLIES, CX-REQUEST.

### NewCase

**Layout.** Three small steps: identify customer/type and search; details/template; review and submit. Search suggestions do not block submission. Agent can create for an existing permitted customer or a verified contact; creating an organization/account itself stays in the shared customer/contact forms. Public/unknown senders enter the existing intake review path, never gain organization membership automatically.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| CaseIdentity | wizard step | Identify need and customer | customer/contact, type, category, subject, source record, channel (`Request.salesChannelEnumId`), template | server-search; KB suggestions in the requester's locale first, then the space's default language | proposed `CaseServices.prepare#Case`; permitted entity reads | `Request/FindRequest` `NewRequestForm`; Frappe `TicketNew.vue` |
| CaseDescription | wizard step | Capture request | description, priority band, product/serial, order, contact email, permitted template fields, files | Markdown with plain-text terminal entry; dynamic fields from the template version (CS-FORM-ELEMENTS) | proposed `CaseServices.validate#CaseTemplate` | same baseline; Frappe template fields |
| SubmitCase | wizard step | Confirm audience and create | summary, customer-visible text, internal note (agents only), queue, assignee, consent where required, request key | explicit Submit | proposed `CaseServices.create#Case` wrapping `mantle.request.RequestServices.create#Request`, `replace#RequestParty`, `link#RequestRecord`; existing `create#IntakeRequest` for token route | existing RequestIntake and Projects request creation |

Create Request, permitted links, initial SLA episode and queue assignment atomically; attachment upload may be pending and is named separately.

**Case rules on every entry point (D23).** The proposed `create#Case` makes the CaseProfile, queue assignment and first SLA episode through proposed `CaseServices.ensure#CaseProfile`. The same service runs from a proposed Request create entity ECA rule, beside the existing `RequestTriageNotice` rule in `entity/Request.eecas.xml`, for every request type marked service-enabled in CaseTypes. So a support request made by Comms Inbox CreateFromMessage, Chat MessageActions, Commons QuickRequest, Projects NewRequest, `mantle.request.RequestServices.create#RequestFromEmail` or `create#IntakeRequest` enters a queue too, and those paths keep calling `create#Request`. The accepted intake time is `EmailMessage.receivedDate` for a request that came by mail, and `Request.requestDate` otherwise. The SLA policy version is chosen once, at intake; a later publish does not re-select it.

**Existing intake.** The current intake is not only project-bound. `get#IntakeSettings` already reads organization-level ProjIntake settings for requests with no project (offered and triaged types). `create#RequestFromEmail` makes a request with no project when the Comms mail-rule action `ErActCreateRequest` runs. Only the public form's `create#IntakeRequest` is bound to a project token (`WstIntakeToken`). Customer Service extends these in ChannelRouting and does not manufacture a project for every service case. **States.** Duplicate warning offers open existing or submit distinct; it never discloses another customer's case. It reuses CaseDetail's Recent cases read. **Source.** Research §3/9/12 and [R1](#reference-files). **Needs.** CS-QUEUE, CS-TEMPLATES, CS-SLA, CS-FORM-ELEMENTS, CX-REQUEST, CX-ACCESS.

### CaseDetail

**Context passed** to [Projects RequestDetail](design-projects.md#requestdetail-sharedrequestdetail) through [crosscut §3.11](design-crosscut.md#311-requestdetail): mount `CustomerService/Cases/CaseDetail`; requestId and organization; service request-type policy and verified customer/team scope. Tabs: Conversation first, Overview/people, linked orders/returns/shipments/invoices/articles, SLA/analytics, Work, Files; Items only when present. Customer, status, priority, queue/team and assignee remain visible beside first-response/resolution clocks. Filters distinguish external email/chat/call activity from internal notes. Use existing RequestCommEvent/RequestEmailMessage and active RequestRecord, not a parallel case record. Files are the Request's existing RequestContent.

| App | Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- | --- |
| Customer Service | Conversation (email first), Overview with customer and SLA, linked orders, returns, shipments, invoices and articles, SLA and analytics, Work, Files; Items only when present; a Recent cases pane | service-enabled request types in the user's server-derived customer, queue and team scope | reply, log note or call, saved reply, assign, change priority or queue, pause and resume, resolve, reopen, link records, make or link work, request order change, RMA or warranty assessment, link, suggest or send article, reply publicly in forum, merge or split by capability | the customer and the clock |

Action set: send/reply, log note/call, saved reply preview, assign, change priority/queue, pause/resume with reason, resolve with resolution/message, reopen, link/unlink permitted records, make/link work, request order change/RMA/warranty assessment, link/suggest article, merge/split (by capability). Request CRUD, parties, notes/files and links remain shared services; proposed `CaseServices.transition#Case`, `SlaServices.record#CaseEvent` and guarded reply actions add service behavior. Sent external replies fulfill first response; automatic acknowledgements, internal notes and failed sends do not. The UI shows awaiting delivery until the chosen channel accepts the actual response. Merge/split and order/return actions open the own screens below. Assign and the queue and priority changes go through proposed `CaseServices.update#Case`, which checks the queue's policy and the user's team before it calls `mantle.request.RequestServices.update#Request` (the crosscut CaseServiceFacts form calls it). A saved reply is inserted through the Comms composer's text-block picker and its actions are then previewed (CaseReplyAction, §9 SavedReplies).

- **Knowledge tab.** Search and read articles of the permitted spaces; link and unlink an article (`WikiPageRequest`); Suggest edit, which opens a Commons review request on the page (`WikiPageReview`); Send to customer, which opens Compose with the published URL and refuses a draft. Authoring opens Commons Knowledge for K.
- **Reply publicly in forum.** For a case escalated from a PASS forum topic, a user with forum posting rights previews the exact public body and posts it through PASS `I.publish#CaseReply`; the topic is linked to the case by `RequestRecord`. Private notes are never copied.
- **Recent cases pane.** Cases of the same customer that are open or changed in the last 90 days, and cases of the same type or product, through proposed `CaseServices.find#Cases` ([R16](#reference-files)). NewCase's duplicate warning reuses it.
- **Log time (later).** Log time through Projects time services against a linked work item (`RequestWorkEffort`); time on the case then appears in CaseAnalytics.

**Case rules from every path (D23).** For a Request with a CaseProfile, a proposed Request status entity ECA rule, beside the existing `RequestTriageNotice` rule in `entity/Request.eecas.xml`, records `SlaServices.record#CaseEvent` for every status change, whatever screen or service made it. A proposed RequestCommEvent create rule records the outward-response and customer-reply events of a message sent or received through Chatter or email. Projects RequestDetail (`ResolveRequest`, `RequestBulk`) and Commons ("cancel my own") therefore cannot skip the SLA episode, the agent-resolution rule or the one-CSAT-per-episode rule. The Projects and Commons RequestDetail contexts hide Complete and Cancel for a service case unless the user holds `case.resolve`, and route that user to CaseSlaAction. Making or linking a work item, which accepts a Submitted request as Reviewed in Projects, is recorded as a case event by the same rule.

**Existing request fields.** For a service case, `Request.responseRequiredDate` mirrors the current resolution due date. Only SlaServices writes it, and it is read-only in this context, so a case has one due date. The channel is the existing `Request.salesChannelEnumId` (`ScEmail`, `ScWeb`, `ScPhone`, plus a proposed `ScChat` seed); the CaseProfile keeps only the originating communicationEventId or emailMessageId.

A support case linked to completed work stays open until an agent confirms resolution. Extend the shared Request completion policy by request type/context; existing Projects auto-completion remains unchanged. Closing/cancelling a linked task notifies the case agent and never independently resolves the customer's complaint, closes an RMA or satisfies SLA. For Cases the existing `complete#RequestFromWork` path must consult that policy before changing status, including entity-rule invocations outside this screen: it checks the request type, Projects types complete as today, and a support case type only notifies the assignee. Service resolution can require all obligatory linked work or an explicitly authorized waiver, without conflating a resolved case with settled stock/finance. **Needs.** CS-QUEUE, CS-SLA, CS-REPLIES, CS-KNOWLEDGE, CS-CHANNELS, CX-REQUEST.

### MergeCases

**Layout.** Select target, compare scope and preserved evidence, confirm. No destructive delete. Same customer and organization are required; cross-customer “duplicates” are linked as related knowledge only. Merged source becomes non-actionable with a redirect retaining permission checks; unique messages/files are referenced without changing their original audience or timestamps.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| MergeSelection | wizard step | Choose survivor | source IDs, target ID, reason | permitted case search | proposed `CaseServices.preview#MergeCases` | Frappe `TicketMergeModal.vue` |
| MergePreview | wizard step, read | Reveal consequences | subjects, customer, queue, participants, SLA history, messages/work/links, conflicting returns/changes | comparison table (CS-FORM-ELEMENTS) | same proposed preview | same reference |
| MergeConfirm | wizard step | Preserve provenance | target, source versions, reason, notify, operation key | explicit confirmation | proposed `CaseServices.merge#Cases` | same reference |

Target retains its original clock; transferred outstanding issues keep source obligation/breach provenance rather than resetting elapsed time. Do not merge financial or stock documents. Revalidation locks all selected cases; an invalid source makes this one merge atomic and fails with its ID. Independent merges in a batch remain independent. **Source.** Research §3; [R2](#reference-files). **Needs.** CS-MERGE, CS-SLA, CS-FORM-ELEMENTS.

### SplitCase

**Layout.** Select messages/issues, preview new case and visibility, confirm. Source remains open unless separately resolved. Evidence remains traceable on the source; transfer a customer-visible message only to a case that the same customer may read.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| SplitSelection | wizard step | Select evidence | source, message IDs, included files/links, existing work | audience badges | proposed `CaseServices.preview#SplitCase` | Frappe `TicketSplitModal.vue` |
| SplitNewCase | wizard step | Describe separate issue | new subject, type, category, priority, assignee, description, source relation, notify, operation key | NewCase fields | proposed `CaseServices.split#Case` | same reference and NewCase |

Initial SLA start is the original receipt of the selected issue where determinable; otherwise manager records reason for chosen start. Creating a new case cannot erase the original breach. Files/links are re-authorized, never copied wholesale across audiences. **Source.** Research §3; [R2](#reference-files). **Needs.** CS-MERGE, CS-SLA.

### WorkItemDetail

**Context passed** to [Projects WorkItemDetail](design-projects.md#workitemdetail-sharedworkitemdetail) through [crosscut §3.12](design-crosscut.md#312-workitemdetail): mount `Shared/WorkItemDetail` at `CustomerService/Cases/WorkItemDetail`; workEffortId, the linked requestId and organization. A case opens the work it made or linked (`RequestWorkEffort`), and FeedbackFollowUp and ArticleFeedback open the follow-up tasks they create. The assignee reads the item and changes its status; finishing it notifies the case agent and never resolves the case.

| App | Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- | --- |
| Customer Service | Overview, linked case, Conversation, Files | work items linked to a case, feedback follow-up or article review the user may see | read; status change by the assignee; comment | what the customer is waiting for |

### ChannelSessions

**Layout.** Calls/chat sessions list with related case and channel state. This is a service-filtered view of Comms history, not a replacement email client or telephony system.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| SessionFind | find | Search contact history | customer, contact, channel, agent, date period, linked/unlinked | saved find | `mantle.party.CommunicationServices.find#PartyCommunicationEvents` plus proposed service audience filter | Frappe `desk/src/pages/call-logs/`; shared Comms history |
| SessionList | list | Review and link | time, direction, participant, channel, duration/outcome, case, recording permission | explicit open transcript/recording | existing communication reads | same reference |
| LogCall | dialog | Record manual call | customer/contact, occurred at, duration, direction, summary, outcome, internal/customer-visible flag, requestId | plain text | proposed `CaseServices.log#CaseCall` over communication/link services | Frappe call log; existing Chatter log note |

Create/link case from a session; play a permitted recording through Comms. A recording cannot become a public attachment merely by linking the case. Automated dialling, provider credential setup, live-agent widget and bot scripts are later ChannelAutomation, owned at the Comms boundary. Terminal opens text transcript and metadata; no audio is required to perform the core workflow. **Source.** Research §4/10; [R1](#reference-files). **Needs.** CS-CHANNELS, CX-ACCESS.

## 4. Customers and orders

### Customers

**Layout.** Customer list with compact service summary and Quick lookup. Contact email/phone lookup returns only an authorized customer relationship; search must not enumerate all parties.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| CustomerFind | find | Find a service customer | name/id, email, phone, organization/person, account reference | server-search, normalized contact search | proposed `CaseServices.find#ServiceCustomers` over Party/customer reads | `Customer/FindCustomer` `OuterSearchForm` |
| CustomerList | list | Select customer | name, primary contact, open cases/returns, recent order, permitted credit hold summary | record links | same proposed read; the credit hold reason comes from Accounting's credit read (AC-11), proposed `ironstone.accounting.CreditServices.get#CustomerCreditStatus` | `Customer/FindCustomer` `CustomerListForm`, `CustomerData` `CustomerDataList` |

Create contact/person/organization/account opens the shared Customer360/contact action with its separate permission and original baseline fields. Duplicate contact resolution precedes account invitation. **Source.** Research §5, baseline Customer. **Needs.** CX-ACCESS, CS-QUEUE.

### Customer360

**Context passed** to [crosscut §3.2](design-crosscut.md#32-customer360): mount `CustomerService/Customers/Customer360`, customerPartyId and organization. Show Overview/contacts, Cases, Returns, Orders/shipments, service agreements/coverage, service metrics/CSAT, and permitted billing summary. Default emphasis is unresolved cases, promised follow-ups, approved returns and last outward communication. Actions: new case/return/order-change request, reply, add permitted contact, link agreement or article; billing and credit decisions require F and remain Accounting-owned. Prices/costs, unrelated customer contacts and internal accounting notes are excluded unless separately authorized. Proposed CustomerCreditPolicy/CreditHoldDecision facts may explain an order hold without granting override. Service agreements use existing agreement relationships; warranty entitlement decisions are in WarrantyAssessment. The crosscut Customer360 had no service-stats form, and its Customer Service row listed neither agreements nor service metrics, so §14 Open asks for them; until crosscut has them, the two tabs are not shown. The shared Activities show here (D25). The proposed shared PaymentDetails form stays hidden from Customer Service, and PartyIdentifications and TaxRegistrations are read only (crosscut R-XC-10). A delivered-items list (product, serial or lot, ship date, order, warranty end), when crosscut adds it, links each row to a warranty claim, and shipping defaults are edited here only with party authority.

| App | Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- | --- |
| Customer Service | Overview and contacts, Cases, Returns, Orders and shipments, Activities, Files, permitted billing summary; Agreements and Service stats once crosscut adds them (§14 Open) | current customer and organization; support-visible records | new case, return or order-change request, reply, add permitted contact, link agreement or article, follow up | unresolved cases, promised follow-ups and the last outward message |

### ContactDetail

**Context passed** to [crosscut §3.1](design-crosscut.md#31-contact-record) and the Commons contact record: customer contact and permitted organization; Contact, communication, authorized roles and consent tabs. Agent may maintain contact channels under party permissions. Service access invitations and organization membership require the common external-access administrator capability; discovering an email on a case is not sufficient authority to invite it into an account. The row below is this app's row of the crosscut §3.1 table; the Commons ContactDetail table needs the same row (§14 Open).

| App | Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- | --- |
| Customer Service | Contact, communication, roles, Consent (read) | customer contacts of a permitted customer organization | maintain channels under party write; no invitation without the external-access administrator | who can be contacted and how |

### Orders

**Layout.** Quick lookup above result list; advanced find expands. Results summarize fulfillment and payment state without copying the full order editor.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| OrderLookup | find | Locate an order | order/display/external ID, customer, email, phone, product, date period | exact quick lookup then permitted fuzzy results | proposed `CaseServices.find#ServiceOrders` over OrderHeader/party/contact reads | baseline `Order/FindOrder` and shared OrderDetail; ERPNext sales order |
| OrderResults | list | Choose record | order, customer, ordered date, total/currency, order/fulfillment/payment states, next delivery | select-columns; tracking links | same proposed read; shared order display services | same baseline |

Actions open OrderDetail, new linked case or new return. Unauthorized IDs and missing IDs use the same safe result. **Source.** Research §6 and [R4](#reference-files). **Needs.** CX-ACCESS, CS-ORDER-CHANGE.

### OrderDetail

**Context passed** to [crosscut §3.6](design-crosscut.md#36-orderdetail): mount `CustomerService/Orders/OrderDetail`; organization, sales-order ID and customer scope. Tabs: Items/prices, fulfillment/reservations, shipment/tracking, invoices/payments summary, related cases/changes/returns and conversation. Actions: new linked case, create return, propose change/cancellation, resend original confirmation after recipient check. A asks; D can propose; approval/apply are separate capabilities. No implicit direct quantity/address/price edits after submission. Resend records recipient, original document version and delivery result. Reservation or substitution decisions link to Warehouse/Product contexts; application revalidates them. Credit hold facts remain Accounting's policy result. Accounting's proposed `ironstone.accounting.CreditServices.evaluate#OrderCredit` runs on `mantle.order.OrderInfoServices.check#OrderPreApprove` (the existing `OrderPlacedAutoApprove` rule calls it) and on the manual approve. A Hold result places `OrderHold` with a proposed `mantle.order.OrderHoldReason` of type Credit through proposed `mantle.order.OrderServices.hold#Order` (D7). This context shows the hold and its reason read only; only Accounting's `release#CreditHold` releases it. Reservations made at Placed stay while the order is held. Resend uses the existing placed-order email; the `OrderPlacedSendEmail` and `OrderApprovedSendEmail` rules are kept.

| App | Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- | --- |
| Customer Service | Header, Items, Fulfillment and tracking, permitted money, History, Cases, related changes and returns | customer-facing sales orders of a permitted customer | new linked case, create return, propose a change; apply an approved remainder cancellation or short-pick substitution by capability (OrderChangeDetail); resend the original confirmation | promise and resolution |

### OrderChanges

**Layout.** Queue by Requested, Needs information, Approved, Applied, Rejected, Cancelled and Stale. These are proposed proposal states, not new global Order statuses.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ChangeFind | find | Narrow changes | order/customer, requester, approver, proposal state, due period | saved find | proposed `OrderChangeServices.find#OrderChanges` | Cases queue; research §6 order-change need |
| ChangeList | list | Follow controlled requests | case, order/revision, requested fields, reason, requested/approved dates, hold/conflict | diff summary | same proposed read | same reference |

Actions open proposal/case; withdraw an unapplied own proposal; manager assigns an approver. Each withdrawal leaves history. **Source.** Research §6/13. **Needs.** CS-ORDER-CHANGE.

### OrderChangeDetail

**Layout.** Before/proposed/impacts, approval history, Apply result. All fields of this genuinely new proposal are listed below. The case owns conversation; this task owns the immutable proposal version and result, not a second case timeline.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ChangeProposal | single | Propose controlled delta | requestId (proposed type `RqtOrderChange`), orderId, organizationPartyId, expectedOrderRevision, proposalVersion, reason, requestedBy, requestedAt, changeKind (cancel remainder or substitute, applied here; price, quantity increase, ship date, address, ship method or carrier, routed to the order owner); lines: orderItemSeqId, action, proposedProductId, proposedQuantity, quantityUomId, proposedUnitPrice, currencyUomId, proposedShipDate; optional addressContactMechId, shipmentMethodEnumId, carrierPartyId, cancellationReason; customerConsentRef, attachmentRefs | permitted source-line selector; units and pricing explanation | proposed `OrderChangeServices.save#OrderChange` | new; fields grounded in OrderHeader/OrderPart/OrderItem |
| ChangeImpact | display | Reprice/recheck consequences | before/after, reservations/issued/shipped/billed quantities, substitution evidence, repricing/tax/freight, payment/credit impact, conflicts, previewVersion | diff table (CS-FORM-ELEMENTS); explicit blocked reasons | proposed `OrderChangeServices.preview#OrderChange` using canonical pricing/stock/financial contracts | Odoo sale order controls; shared OrderDetail |
| ChangeDecision | single | Approve or reject exact proposal | proposalVersion, decision, reason, approver, approvedAt, expiresAt | shared approval entry (Approvals, proposed topic `OrderChangeApproval`); no self-approval where policy requires separation | proposed `OrderChangeServices.decide#OrderChange` | Commons Approvals pattern |
| ApplyChange | single | Commit approved delta | proposalVersion, expectedOrderRevision, previewVersion, operationKey, confirmation | explicit Apply | proposed `OrderChangeServices.apply#OrderChange` over existing OrderServices and canonical reservation/accounting services | new guarded orchestration |

**Kinds applied here (D9).** Customer Service applies only two kinds of approved change. The cancel kind cancels the open remainder of a line: the proposed `apply#OrderChange` calls `mantle.order.OrderServices.cancel#OrderItem` with cancelQuantity and `mantle.product.AssetServices.reduce#AssetReservation`. The substitution kind answers a short pick: Warehouse records the short pick, `apply#OrderChange` adds the approved substitute line and cancels the short remainder, and Warehouse picks the substitute. Substitute candidates are the product's `PatEquivalent` and `PatReplacement` associations, which Products maintains on Product360. Every other kind (price, quantity increase, ship date, address, ship method, carrier) is approved here as a proposal and routed to the order owner, Sales (later), which applies it through the shared OrderDetail guard. Customer Service never applies those kinds itself.

Apply locks the source order and relevant allocations; validates approval, revision, current stock, shipped/billed/paid quantities, pricing version and permissions again. The lock is `OrderHold` with a proposed `OrderHoldReason` of type Change, placed through proposed `hold#Order` and released through proposed `release#OrderHold`, which returns the order to Approved only when no other hold reason is open (D7). Apply never uses `OrderBeingChanged`, which Mantle refuses from Placed, Approved or Sent. A shipped item becomes a return/replacement, an already billed amount goes to Accounting's InvoiceCorrection (below), and posted entries never disappear. Cancellation releases only eligible reservations/demand; it leaves fulfillment and financial reversals as explicit related work. Substitution requires compatible product/unit and customer consent and reruns pricing/availability. Closed financial period returns `ClosedPeriod` with a link to Accounting's InvoiceCorrection, not silent backdating. Failures `StaleOrder`, `StockChanged`, `AlreadyShipped`, `BillingConflict`, `ApprovalExpired`, `Forbidden` leave the order unchanged. A separate notification failure leaves Applied with delivery pending, not a second application. Terminal uses the same before/after table and confirmation.

**Receiving sides.** On apply, Warehouse re-validates the open picks of each changed or cancelled line and releases its reservations through `mantle.product.AssetServices.remove#OrderItemReservations` or `reduce#AssetReservation`; a pick in progress returns `StockChanged`. Between pack and ship the sales invoice already exists, because the kept `ShipmentOutgoingPackedCreateInvoices` rule makes it at pack, and card payment is captured. So apply first calls Accounting's proposed `ironstone.accounting.InvoiceServices.release#ShipmentDraftInvoice` for that shipment, which checks the Accounting permission inside, and, when the change reduces the order, proposed `ironstone.accounting.SettlementServices.refund#OrderPayment`; Warehouse then puts the stock back. A billed quantity or price opens InvoiceCorrection on the shared InvoiceDetail (crosscut §3.16; `mantle.account.InvoiceServices.create#InvoiceCreditMemo` or `adjust#Invoice` through the period guard), linked to the change Request by `RequestRecord`. A finalized invoice always needs InvoiceCorrection. This screen shows that link and its status.

**Source.** Research §6/13; active OrderEntities/OrderServices; [R4](#reference-files). **Needs.** CS-ORDER-CHANGE, CS-FORM-ELEMENTS, CX-ORDER-CHANGE, CX-PRICING, CX-AVAILABILITY, CX-POSTING, CX-ACCESS.

### ShipmentDetail

**Context passed** to [crosscut §3.8](design-crosscut.md#38-shipmentdetail): mount `CustomerService/Orders/ShipmentDetail`; permitted customer/order and organization. Tracking, package contents, delivery exceptions and customer-safe proof; actions copy permitted tracking link, send update and open linked case/return. No pick/pack/ship mutation from a service role alone. A W user who must receive a return does so from ReturnDetail, which carries that task; this mount offers no stock task.

| App | Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- | --- |
| Customer Service | Items, safe tracking, packages, documents and return links | shipments of a permitted customer's orders and returns | copy tracking link, send update, open linked case or return; no stock mutation | delivery resolution |

### InvoiceDetail

**Context passed** to [crosscut §3.16](design-crosscut.md#316-invoicedetail): mount `CustomerService/Orders/InvoiceDetail`; customer/order/return and organization. Read issued lines, due/balance, applied payments and credit references, excluding bank secrets and internal ledger detail. A can explain an allowed document and send a copy through Accounting's proposed `ironstone.accounting.InvoiceServices.send#Invoice`, which also issues the InvoicePay link (proposed `PortalServices.issue#InvoiceAccess`) for an invoice with no ProductStore. F follows the shared ReturnDetail settlement action for an RMA. This mount has no correction action: a non-return correction is Accounting's InvoiceCorrection, which an F user opens from the link. All posting/period/refund controls remain Accounting's; the case holds a link, never its own settlement totals.

| App | Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- | --- |
| Customer Service | Customer-safe header and lines, payment and credit status, source order or return | the customer's invoices linked to visible records | read; send copy where authorized; request credit or refund through ReturnDetail | customer resolution |

## 5. Returns and warranty

### Returns

**Layout.** Customer-return list with views Requested, Awaiting authorization, Authorized/awaiting goods, Received/awaiting disposition, Manual response (`ReturnManResp`), Settlement pending, Expiring, Cancelled and Closed. Direction is fixed to customer returns; supplier returns are linked for recovery and open the authorized Purchasing/Warehouse context.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ReturnFind | find | Find an RMA | RMA number (`displayId`), customer reference (proposed `customerReference`), order/customer, status, assignee, entry/expiry period, reason, settlement/receipt exception | saved finds | permitted ReturnHeader reads plus proposed `ReturnPolicyServices.find#ServiceReturns` | `Return/FindReturn` `ReturnHeaderList` |
| ReturnList | list | Follow promises | RMA number, customer reference, order, assignee, authorization expiry, authorized/received/accepted/credited quantities, status | distinct physical/financial chips | `mantle.order.ReturnServices.get#ReturnDisplayInfo` plus proposed policy reads | same baseline; Carbon RMA list |

Authorize and cancel are row actions on shared ReturnDetail after preview; independent selected returns may be submitted as separate transactions with named results. Never mark all returned items “done” merely because the case is resolved. A return is Received when every item is (ReturnDetail Receipt) and Completed when Accounting's proposed `settle#Return` has finished every item's response. **Source.** Research §7; [R3](#reference-files). **Needs.** CX-RETURNS, CS-RETURN-POLICY.

### NewReturn

**Layout.** Source/customer, returnable lines, reason/response and review. This wizard creates a draft; authorization is separate. An existing draft may be continued. Its fields and service calls reuse the canonical ReturnDetail forms without defining another return model.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ReturnSource | wizard step | Choose sale and destination | customer, order, lookback period, case, customer reference (proposed `customerReference`), facility, contact/shipping address | permitted order lookup | `mantle.order.ReturnServices.find#OrderOpenReturns`, `create#ReturnFromOrder`; proposed policy preflight | `Return/FindReturn` `CreateReturn`; `Return/AddOrderItems` `LookBackDaysForm` |
| ReturnableLines | wizard step | Select eligible quantity | order/item, product/variant, shipped, previously returned/credited, remaining eligible, requested qty/UOM, serial/lot if known | source-line picker; server ceilings | `find#ReturnableOrderItems`, `calculate#OrderItemReturnable`, `add#OrderItemToReturn` in ReturnServices | `Return/AddOrderItems` `AddOrderItemToReturn`; Carbon `ReturnableLinesModal.tsx` |
| ReturnRequest | wizard step | Explain desired remedy | reason, requested response, description/evidence, condition, authorization expiry preview, contact, draft return ID, operation key | response explicitly credit/refund/replace; fees disclosed | `update#ReturnItem`, `request#Return` through proposed `ReturnPolicyServices.submit#CustomerReturn` | `Return/EditReturnItems` `ReturnItemList`; Carbon RMA form |

The wrapper locks source eligibility across concurrent drafts/requests according to crosscut's reservation policy. Draft proposals may be saved with an explicit non-reserving status; authorization rechecks remaining eligibility. Multiple partial returns cannot over-return the same source units. Unreferenced goods require a manager's exception with identified customer, product/serial, ownership evidence and valuation source; customer self-service never chooses an unreferenced-return bypass. Cancellation preserves audit and releases only unconsumed authorization. **Source.** Research §7/12; [R3](#reference-files). **Needs.** CX-RETURNS, CS-RETURN-POLICY.

### ReturnDetail

**Context passed** to [crosscut §3.18](design-crosscut.md#318-returndetail): mount `CustomerService/Returns/ReturnDetail`; customer-return direction, organization, source order/case and current user's capabilities. Tabs: Authorization/Items, shipment/label/tracking, inspection/disposition, settlement summary, Files, conversation/history. Emphasize the RMA number (`ReturnHeader.displayId`) and the customer's own reference (proposed `customerReference` on the ReturnAuthorization extension, CS-RETURN-POLICY), assignee, expiry, promised remedy and quantities awaiting each stage. `ReturnHeader.externalId` and `originId` stay integration keys, which a sync may overwrite (D11). Existing `ReturnItemBilling` supplies receipt/invoice evidence; extensions add only missing allocation/provenance. Request and cancel use active ReturnServices `request#Return`, `cancel#Return`/`cancel#ReturnItem` through the policy guard; Authorize uses proposed `mantle.order.ReturnPolicyServices.authorize#Return`, which wraps `approve#Return`. Proposed return-policy extension stores assignee/expiry/fee/exception, while disposition belongs to shared QualityInspection. Files need the proposed `mantle.order.return.ReturnContent` (D25).

| App | Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- | --- |
| Customer Service | Authorization and Items, shipment, label and tracking, inspection and disposition, settlement summary, Files, conversation and history | the customer's sales returns | request, authorize, issue return label, close a remainder, cancel before any physical or financial effect, follow up; receive, dispose or settle only with W or F | resolution and customer commitment |

**Authorize (D11).** The proposed `authorize#Return` settles nothing. It forces `ReturnItem.responseImmediate` to N unless a published return policy allows advance replacement or instant credit and the actor also holds F. The existing `ReturnApprovedProcess` rule is reduced to `mantle.order.ReturnServices.create#ReturnShipment`: approval creates the expected return shipment (`ShpTpSalesReturn`) and no longer runs `process#ReturnItemResponses`, which today makes the replacement order and any immediate credit or refund at approval. An advance replacement is an explicit `settle#Return` response, with a follow-up for the goods still due back.

**Issue return label.** After authorization, R uses Issue return label, which calls proposed `mantle.shipment.WarehouseTaskServices.request#ReturnLabel` (returnId, operationId). Warehouse owns that service: it finds the return shipment that approval made, adds its package and route segment from `ReturnHeader.shipmentMethodEnumId` and `carrierPartyId`, and requests the label through the WH-LABEL carrier adapter. Customer Service owns the action and delivers the label to the customer (§11; CustomerReturn). Whether each carrier gateway accepts a label whose origin is the customer's address is not yet verified.

R authorizes the response and policy exception; W receives/inspects/disposes; F issues credit/refund/replacement financial effects. Standard A sees disposition and credit details read-only. For a standalone service business, explicit W/F capabilities enable the same shared Warehouse return-receipt task and Accounting settlement without granting Warehouse or Accounting app roots. Receipt captures product, quantity, UOM, lot/serial, receipt date and destination/inspection hold using the shared stock task; it cannot treat failed inspection as immediately sellable. Scan actions have manual-entry and terminal equivalents.

**Receipt (D11).** The receipt task is Warehouse's proposed `mantle.shipment.WarehouseTaskServices.receive#ReturnItems`, which replaces the `ShipmentDeliveredReturnReceive` and `ReturnReceivedProcess` rules. Per line it records the quantity physically received, accepted and rejected (quarantined) alike, and sets `ReturnItem.receivedQuantity` without changing `returnQuantity` or processing a response. So a second box, or units rejected at the dock, can still be received and credited against the RMA. A physical receipt without a carrier shipment uses the same task against the return shipment that already exists; `receive#ReturnWithoutShipment` is not exposed. An item reaches ReturnReceived when its received quantity equals its authorized quantity, or when R closes the remainder with a reason through proposed `ReturnPolicyServices.close#ReturnRemainder`.

**Settlement.** Financial actions invoke Accounting's proposed `ironstone.accounting.ReturnSettlementServices.preview#Return` and `settle#Return` ([crosscut §3.18](design-crosscut.md#318-returndetail) ReturnSettlement; Accounting AC-02). Accounting owns the cumulative quantity and amount caps, the result codes, the restocking-fee, tax, currency, rounding and replacement-difference preview lines, the partial-credit rules and the credit without receipt, which is `settle#Return` with receiptless set, a reason and F plus `BOSS_ACCOUNTING_APPROVE`, and creates no stock. This context shows authorized, received, accepted/rejected, previously credited/refunded, currently eligible and requested amounts separately, and the named result `settle#Return` returns. `settle#Return` sets ReturnCompleted once every item's response is complete. `ReturnManResp` means a person must decide the response; it shows in Returns' Manual response view. A return is cancelled (`ReturnCancelled`) only before any physical or financial effect. The case can be resolved with a customer-agreed remaining settlement promise, but the return remains outstanding until its physical/financial obligations finish. **Needs.** CS-RETURN-POLICY, CS-SHARED, CX-RETURNS, CX-QUALITY, CX-LABELS, CX-PORTALS.

### QualityInspection

**Context passed** to [crosscut §3.19](design-crosscut.md#319-qualityinspection-and-inspectiontemplates): mount `CustomerService/Returns/QualityInspection`; return, receipt, product/lot/serial and facility; read inspection evidence, hold, accepted/rejected quantities and disposition for A/R. Only W can inspect and dispose, with the one disposition vocabulary seeded in CX-QUALITY: Release, Quarantine, Rework or repair, Return to customer, Return to supplier, Scrap and Use as is. Rejected goods stay non-available; a customer communication action links the disposition without changing it. Screens and services recheck facility permission and version. A supplier-recovery return is a separately authorized linked return, not a new direction for the customer's RMA. Release sets the asset to `AstAvailable`, and the existing `AssetStatusAvailableReservations` rule then reserves it to waiting orders by reservation priority; a released return is not held for the returning customer. Crosscut's row has the Customer Service view come through ReturnDetail; this file keeps a separate mount and asks for that row change in §14 Open.

| App | Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- | --- |
| Customer Service | Source, readings, evidence, disposition, history | inspections of the customer's returns | read for A and R; inspect, verify and dispose only with W | reason and resolution |

### WarrantyClaims

**Layout.** Case-based list filtered to the proposed warranty request type `RqtWarranty`, grouped by Needs evidence, Assessment, Approved repair/replacement, Rejected and Customer follow-up. These claim states are independent from Request lifecycle and Return custody.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| WarrantyFind | find | Locate claims | customer, product/serial, sale, agreement, claim state, assignee | date/saved finds | proposed `WarrantyServices.find#WarrantyClaims` | ERPNext `warranty_claim.json` |
| WarrantyList | list | Coordinate promises | case, equipment, entitlement end, assessment, linked return/work, next action | work/return links | same proposed read | same reference |

New claim opens NewCase with warranty template, or starts from a row of the delivered-items list on Customer360 once crosscut adds it. **Source.** Research §7; [R5](#reference-files). **Needs.** CS-WARRANTY, CX-REQUEST.

### WarrantyAssessment

**Layout.** Evidence/coverage, decision and linked repair/custody. Customer-owned equipment never silently becomes organization-valued stock.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| WarrantyEvidence | single | Establish coverage | case/customer, product, serial/equipment, source order/invoice, purchase/coverage dates, agreement, fault, usage/condition, photos, prior claims | permitted record selectors | proposed `WarrantyServices.save#WarrantyClaim` | ERPNext warranty claim; Odoo repair |
| WarrantyDecision | single | Record entitlement result | assessed terms/version, covered/partial/rejected, reason, approver, charge estimate/currency, customer consent, next due | approval and pricing links | proposed `WarrantyServices.decide#WarrantyClaim` | same references |
| RepairLinks | list | Coordinate execution | request, existing/new workEffortId, maintenance purpose, facility/asset, custody return, required work, assignee, due, result | shared work cards; add dialog | proposed `WarrantyServices.link#WarrantyWork`; active `mantle.request.RequestServices.link#RequestRecord`, RequestWorkEffort and `mantle.work.WorkEffortServices.link#WorkEffortRecord` | existing Request Work/record links; Odoo repair |

Repair execution is a linked maintenance-purpose WorkEffort (`WepMaintenance`), not an invented stock-consuming case status. Planned materials, labor, repair quality and resulting charges follow Maintenance/Manufacturing/Warehouse/Accounting contracts; service owns coverage approval and customer communications. Replacement needs a linked order/return settlement; repair completion merely alerts the case agent. The coverage basis (a serial or lot traced to its sale, and a term from the product's `PftWarranty` feature) and chargeable repair are §14 Open items. **States.** Expired entitlement may be rejected or explicitly approved as goodwill with approver/cost owner. **Source.** Research §7/13; [R5](#reference-files). **Needs.** CS-WARRANTY, CX-REQUEST, CX-RETURNS.

### Approvals

**Context passed** to the Commons approvals center ([design-drawers-commons §4 Notifications](design-drawers-commons.md#notifications)) through [crosscut §3.15](design-crosscut.md#315-approvals-waiting): mount at `CustomerService/Approvals`, filtered to the service topics, proposed `OrderChangeApproval` (OrderChangeDetail ChangeDecision) and `ReturnExceptionApproval` (a ReturnDetail policy exception). Approve and refuse call the source action, `OrderChangeServices.decide#OrderChange` or the ReturnPolicyServices exception decision, bound to the proposal or return version; the center holds no decision of its own. The row below is this app's row of the crosscut §3.15 table.

| App | Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- | --- |
| Customer Service | the approvals list and the source record's summary | order-change and return-exception topics of the user's organization | approve or refuse through the source action, per policy | the customer promise |

**Needs.** CX-APPROVAL, CS-ORDER-CHANGE, CS-RETURN-POLICY.

## 6. Availability and knowledge

### InventoryAvailability

**Context passed** to [crosscut §3.7](design-crosscut.md#37-inventoryavailability): mount `CustomerService/Availability/InventoryAvailability`; product/variant, requested quantity/UOM/date, organization, permitted customer-serving facilities. Use active `mantle.product.AssetServices.get#AvailableInventory`, `get#AvailableInventoryMulti` and `mantle.product.InventoryReportServices.get#InventoryProjectedInfo` through the shared guarded read. Read on-hand, reserved, usable/unreserved, ATP, inspection/quality hold, incoming supply and dates with as-of/completeness. No allocation mutation; show customer promise only from canonical checked promise results. Incoming PO/production/transfer rows retain provenance and avoid double counting. An unavailable/not-ready projection shows unknown with a refresh/support action, never zero or a confident delivery promise. Public pages expose only the configured aggregate promise band, never internal suppliers, exact private stocks or costs.

| App | Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- | --- |
| Customer Service | Availability, incoming supply and the customer-safe promise projection | the customer's or order's products and customer-serving facilities | read only | promise and alternatives |

### StockAtDate

**Context passed** to Warehouse's StockAtDate report ([design-warehouse §14](design-warehouse.md#14-reports-and-settings); [crosscut §3.26](design-crosscut.md#326-stock-at-date)), which Warehouse owns with its service, proposed `mantle.product.InventoryReportServices.get#InventoryAtDate` (D24): mount at `CustomerService/Availability/StockAtDate`; product/variant, permitted customer-serving facilities, cut-off timestamp and timezone. The report reads the AssetDetail effective-date ledger and flags incomplete history; Customer Service consumes it and adds no stock balance record of its own.

| App | Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- | --- |
| Customer Service | the cut-off find and the historical quantity timeline | products and facilities that serve the user's customers; location and lot only where allowed | read and export; no quantity change, cost or promise action | what the customer could have been told then |

The two forms below are what Customer Service needs from that report. Warehouse's definition holds them; they stay here as this context's requirement until design-warehouse carries them.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| StockDateFind | find | Choose historical cut-off | product/variant, facility, location if allowed, effective timestamp/timezone, unit, lot/serial if allowed | date/time selector | proposed `mantle.product.InventoryReportServices.get#InventoryAtDate`, owned by Warehouse (WH-REPORT) | Dolibarr `htdocs/product/stock/stockatdate.php` |
| StockHistory | list, read | Explain historical quantity | opening, receipt/issue/adjustment, effective/recorded dates, closing, source link, completeness | tabular timeline | same proposed service from AssetDetail and posting history | same reference |

No quantity changes, cost display or promise action. Missing pre-migration history is labeled incomplete. Terminal uses the same rows and cut-off. Today's ATP and future promise stay on InventoryAvailability. **Source.** Research §8; [R6](#reference-files). **Needs.** CX-AVAILABILITY; extend its report contract, no separate stock balance record.

### Product360

**Context passed** to [crosscut §3.5](design-crosscut.md#35-product360): mount `CustomerService/Availability/Product360`; product/variant and organization; Overview/identifiers/units, permitted prices and explanation, Availability, customer-safe documents and warranty information. No BOM/cost/supplier prices by default. Product substitutions open the guarded order-change proposal and must be confirmed; they do not silently edit a case-linked order. That link goes beyond crosscut's read-only row, so §14 Open asks for it.

| App | Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- | --- |
| Customer Service | Summary, identifiers and units, availability, permitted price explanation, customer-safe and warranty documents | customer or order context; no cost or supplier price | read; open an order-change proposal for a substitute | identification, coverage and promises |

### Knowledge

**Context passed** to [Commons Knowledge](design-drawers-commons.md#10-notes-and-knowledge): mount `CustomerService/Knowledge`; permitted service spaces, query from case subject/product/category, requestId when linked. Actions: search and read; link and unlink an article (`WikiPageRequest`); Suggest edit, which opens a Commons review request on the page (`WikiPageReview`); Send to customer, which opens Compose with the published URL and refuses a draft. Authoring opens Commons Knowledge for K. C does not use this internal screen; customers read CustomerArticle. Suggestions prefer the requester's locale and fall back to the space's default language. `mantle.request.WikiPageRequest` preserves the case link. Existing `Request/EditWikiPages` AddWprForm/DeleteWprForm map to link/unlink actions under record permissions. Search never offers internal articles to a customer; a draft is never sent as a public link. Commons owns editor, spaces, revisions, attachments and publication. Browser wiki rich editing keeps Commons' terminal read/export and explicit edit alternative; service adds no competing wiki renderer.

| App | Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- | --- |
| Customer Service | search results and the rendered page, in Knowledge and in a case's Knowledge tab | the permitted service and help-center spaces | link to case, suggest an edit (review request), send to customer (Compose with the public URL), open ArticleFeedback | finding and sending |

### ArticleFeedback

**Layout.** Review queue of helpful/not-helpful reports with related case counts. Marking reviewed cannot silently change the published article.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| FeedbackFind | find | Prioritize improvements | space/article, score, period, review state, category | date-period | proposed `KnowledgeServices.find#ArticleFeedback` | Frappe `ArticleFeedback.vue` / article API |
| FeedbackList | list | Review evidence | article/version, helpful, comment, related case if visible, reviewer, decision | redact contact metadata by capability | same proposed read | same reference |
| FeedbackReview | dialog | Queue an improvement | feedback IDs, decision, note, assignee, due, article revision | create/link shared work item | proposed `KnowledgeServices.review#ArticleFeedback` | Frappe article feedback; Commons tasks |

Public feedback needs a per-page nonce/rate limit, no stored arbitrary HTML. Batch review logs failures per feedback ID. **Source.** Research §9/10; [R7](#reference-files). **Needs.** CS-KNOWLEDGE.

### CaseToArticle

**Layout.** Select answer, redact/preview, save draft to a permitted service space. Draft remains under Commons review/publication.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| AnswerSelection | wizard step | Choose useful resolution | case, selected outward messages/resolution, allowed attachment references | audience markers | proposed `KnowledgeServices.prepare#ArticleFromCase` | Frappe ticket-to-article pattern |
| ArticleDraft | wizard step | Write reusable answer | title, summary, body, space, category/tags, product, proposed audience, removed personal data, source case link | Commons Markdown editor and plain-text terminal input | proposed `KnowledgeServices.create#ArticleFromCase` wrapping existing wiki creation and WikiPageRequest | Commons Knowledge; Frappe `NewArticle.vue` |

Agent cannot publish a private conversation by selecting it. Preview identifies names, contact/address/order details and attachments for manual review; automated suggestions are not authorization. Attachments must be copied to an approved public article version explicitly. **Source.** Research §9/13; [R7](#reference-files). **Needs.** CS-KNOWLEDGE, CX-ACCESS.

## 7. Reports

All reports use server-side organization/queue/customer filters, current case access and an explicit as-of timestamp. Response metrics disclose sample counts, elapsed vs business time, reopen episodes and excluded cancellations. Charts always have data tables and CSV under the same permissions. No custom browser interaction is required.

### Reports

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ReportCatalogue | list, read | Choose an allowed report | name, description, scope, last run | links; favorite saved find | static screen metadata filtered by authz | research §10 operational report inventory |

**Layout/actions.** Cards or table; open the report, no background data export from the landing. **Source.** Research §10. **Needs.** CS-REPORTING.

### ServiceLevelCompliance

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| SlaFind | find | Select cohort | created/resolved period, queue/team, priority, policy/version, channel, first-response/resolution target | date-period; cohort choice | proposed `ReportingServices.get#SlaCompliance` | Frappe `helpdesk/api/dashboard.py`; ERPNext support reports |
| SlaResults | list, read | Explain success and breach | eligible/met/breached/open due, denominator, paused duration, policy/calendar version, case drill-down | stacked counts and table | same proposed service | same reference |

**States.** Cancellations excluded from success rate and shown separately; unresolved cases remain visible to avoid survivor bias. **Source.** Research §10; [R8](#reference-files). **Needs.** CS-SLA, CS-REPORTING.

### ResponseTimes

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ResponseFind | find | Select metric/cohort | period, team, priority, channel, first/next response/resolution, business/elapsed | explicit time basis | proposed `ReportingServices.get#ResponseTimes` | Frappe dashboard; ERPNext Issue Analytics |
| ResponseResults | list, read | Show distribution | count, median, p90, mean, open age, first-response and episode-resolution times | distribution plus same data table | same proposed service | same reference |

**States.** First response is an actual outward agent response accepted by channel; acknowledgement and notes excluded. Later delivery failure is visible on the event and auditable. **Source.** Research §10; [R8](#reference-files). **Needs.** CS-SLA, CS-REPORTING.

### CaseVolumes

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| VolumeFind | find | Choose demand breakdown | period, organization, team, type/category, channel, customer group, status category | grouping selector | proposed `ReportingServices.get#CaseVolumes` | Frappe dashboard; baseline FindRequest |
| VolumeResults | list, read | Separate intake and backlog | received, resolved, reopened, cancelled, merged, carried backlog, assignments | trend table/chart; drill-down | same proposed service | same reference |

**States.** Merged case counts retain intake events but do not double-count active backlog; split descendants disclose lineage. **Source.** Research §10. **Needs.** CS-REPORTING.

### SatisfactionResults

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| CsatFind | find | Select comparable feedback | period, template/version, queue/team, customer, rating, response state | explicit version filter | proposed `FeedbackServices.find#CaseResponses` | `Survey/Responses` `ResponseListForm` |
| CsatResponseList | list | Review responses | case, resolution episode, sent/responded dates, score, comment, follow-up state | case/response links, sensitive comments masked | framework FormResponse reads with case authorization | same baseline |
| CsatStats | list, read | Interpret response counts | invited/delivered/responded, response rate, score distribution, text count | table + chart; raw scale label | `org.moqui.impl.ScreenServices.get#FormResponseStats` through proposed scoped adapter | `Survey/ResponseStats` `TextDbFormFieldResponseCountList`, `FieldOptionForm` |

Default scale is 1–5; do not compare changed scales without a declared normalization. Low scores create an assigned follow-up notification, never silently reopen or alter the original answer. **Source.** Research §10/12; [R8](#reference-files). **Needs.** CS-FEEDBACK.

### ResponseDetail

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ResponseDetails | display | Inspect submitted feedback | form/version, case/episode, invitation/response dates, score, optional reason/comment, consent, permitted respondent | dynamic form read | `org.moqui.impl.ScreenServices.get#FormResponse` through proposed case access adapter | `Survey/ResponseDetails` `ResponseDetailsForm` |
| FeedbackFollowUp | dialog | Acknowledge or assign follow-up | response, assignee, due, action, note, linked case/work | shared task selector | proposed `FeedbackServices.record#FeedbackFollowUp` | Frappe TicketFeedback and shared tasks |

Responses are immutable; correction/withdrawal records replace visibility or create a superseding response with audit. The framework still has `org.moqui.impl.ScreenServices.update#FormResponse` and `delete#FormResponse`, so a guard (an authorization rule or an entity ECA rule) makes both refuse a response linked to an invitation (CS-FEEDBACK). **Source.** Research §10/12. **Needs.** CS-FEEDBACK.

### CaseAnalytics

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| CaseMetrics | display | Explain one case | request, first receipt/response, each resolution/reopen, policy/calendar snapshot, targets, pause durations, breaches, assignments, messages, feedback | event timeline with table | proposed `SlaServices.get#CaseSlaHistory` | Frappe `TicketSLA.vue`, `ticket_stats.py` |

**Layout/actions.** Clock cards followed by event history; links open original allowed messages and decisions. Events cannot be edited here. Manager correction is a reasoned adjustment event, not historical deletion. Terminal prints the same timestamps and durations. Time logged on the case's linked work shows here once Log time arrives (later). **Source.** Research §3/10; [R8](#reference-files). **Needs.** CS-SLA, CS-REPORTING.

### ReturnAnalysis

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ReturnAnalysisFind | find | Select a cohort | period, organization, reason (`ReturnItem.returnReasonEnumId`), product or category, response (`returnResponseEnumId`), disposition, customer, grouping | date-period; grouping selector | proposed `ReportingServices.get#ReturnAnalysis` | Odoo returns report (`action_stock_picking_return_report`); Carbon return reasons |
| ReturnAnalysisResults | list, read | Explain returns and their cost | group (reason, product or disposition), returns, items, quantity returned, received and accepted or rejected, received inventory status (`inventoryStatusId`), credited or refunded amount and currency (`ReturnItemBilling`), replacements, return rate against quantity shipped | table plus chart; drill-down to Returns | same proposed service | same references |

**States.** Quantities and amounts come from ReturnItem and ReturnItemBilling at the as-of time; an open return counts as requested, not as credited. Amounts in several currencies are shown per currency. **Source.** Research §7/10; [R15](#reference-files). **Needs.** CS-REPORTING.

## 8. Customer access

These pages sit under the proposed audience root `screen/ServicePortal.xml`, beside the existing `screen/RequestIntake.xml` and outside every internal app root (D5). A customer contact therefore never holds `BOSS_CUSTOMER_SERVICE` and never runs that root's organization-setup actions. `ServicePortal` is an audience root, not a new identity system; it also hosts Accounting's InvoicePay. Commons owns authentication, account/profile and contact mechanisms. Common branding/navigation may surround service pages alongside Commerce later. Anonymous readers see published help only; a token authorizes a particular intake form or feedback invitation, never arbitrary case browsing. Customer employees see only their own cases unless a verified customer administrator has granted organization-wide service visibility. Shared links enforce the same restriction; no internal staff, private notes, cost, supplier, other-customer, or ledger information leaks through search, exported files, notifications or counts.

**Access (D5).** Signed-in customer contacts are in the proposed group `BOSS_SERVICE_PORTAL`, with entity filter sets on the existing `BOSS_PROJECT_CLIENT` pattern, no internal app-root grant, and the Chatter and RecordFiles mounts limited to customer-visible content. Bearer links are MoquiConf token routes (`require-authentication="false"` screens at the screen root, each with a route rate limit): the existing `/r/<token>` intake form (RequestIntake), and the proposed `/rma/<token>` for CustomerReturn and `/fb/<token>` for Feedback. Every portal read and every token route goes through the one Mantle capability service, proposed `mantle.party.ExternalAccessServices.check#AccessCapability` and `check#AccessToken`, over the proposed `mantle.party.ExternalAccessCapability` record (record entity, id and revision, party, scope, expiry, revoked date, token digest). Customer Service's portal services only wrap it (CS-PORTAL). The Projects client checks in ChatterServices and RecordFilesServices are generalized through the same check, so non-project cases and returns are covered without loosening the Projects scope.

### SupportHome

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| HelpSearch | find | Find a published answer | query, category, product, language | accessible suggestions with list fallback; the requester's locale first, then the space's default language; most-viewed articles when there is no query | existing Knowledge search with proposed service/public audience filter | Frappe `KnowledgeBaseCustomer.vue`; ERPNext `help.html` |
| HelpResults | list, read | Answer or contact support | title, summary, category, article URL | published article links; Create case remains available | same search | same references |

**Layout/actions.** Search, categories, My cases/My returns if signed in, contact support. Failed search does not block a valid intake. **Source.** Research §9; [R7](#reference-files). **Needs.** CS-PORTAL, CS-KNOWLEDGE.

### MyCases

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| MyCaseFind | find | Narrow own support records | search, customer-visible status, date, customer account when multiple authorized | no team/agent-internal selectors | proposed `CaseServices.find#CustomerCases` over existing Request visibility pattern | `MyAccount/User/Request/MyRequests` `ListRequests` |
| MyCaseList | list | Follow own cases | case/name, visible status, created/updated, needs reply, customer reference | no bulk triage or drag actions | same proposed read | same baseline; Frappe customer ticket list |

**Actions.** Open case, new case; no colleague contact links by inference. **Source.** Research §3/9 and active Projects client slice. **Needs.** CS-PORTAL, CX-ACCESS.

### NewCustomerCase

**Context passed** to [NewCase](#newcase): `ServicePortal/NewCustomerCase`; verified customer/contact or bounded intake token, offered service types/templates, published KB suggestions, subject/description/files and customer-facing contact fields. Queue/SLA/assignee/internal priority are server defaults, not accepted hidden inputs. Unauthenticated intake records sender verification state and anti-abuse result; it grants no customer account or case read permission until verified. Use the current intake-token/confirmation primitives extended to queue destinations: the existing `/r/<token>` route, with the token held by a queue rather than a project (ChannelRouting). **States.** Outside the queue's working hours the page says when the team will next reply, from the same Commons working-hours calendar the SLA uses; the case is still accepted.

| App | Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- | --- |
| Customer Service portal | the case type and template fields offered to customers, published suggestions, files | verified contact's permitted customer accounts, or the queue named by the intake token | submit a case; nothing else | getting the request in with what the agent needs |

### CustomerCase

**Context passed** to [crosscut §3.11](design-crosscut.md#311-requestdetail) and Projects' existing client isolation: `ServicePortal/CustomerCase`, requestId and verified permitted customer/contact. Show customer label/status, submitted description, outward messages, approved shared files, allowed work status and customer-visible return/order links. Actions reply, add permitted files while open, request reopen and cancel own eligible case; no private note, bulk status, assignment, customer/party reassociation, file-version deletion or internal linked record traversal. Reopen applies the configured service episode policy after authorization. Existing project-constrained checks must be generalized for non-project support cases without loosening the current Projects scope; they go through the shared capability check of §8 Access. The page shows the same outside-working-hours notice as NewCustomerCase. The row below is the external Customer Service row for the crosscut §3.11 table and the Projects §6 table (§14 Open).

| App | Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- | --- |
| Customer Service, customer contacts | status label, conversation as outward messages, approved shared files, customer-visible order and return links | the verified contact's own cases, or the customer organization's cases when a customer administrator allows it | reply, add files while open, request reopen, cancel own eligible case | where my case stands |

### MyReturns

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| MyReturnFind | find | Find own RMAs | order/reference, customer-visible status, date period | safe customer scope | proposed `ReturnPolicyServices.find#CustomerReturns` | `Return/FindReturn` `ReturnHeaderList`; Odoo portal returns |
| MyReturnList | list | Follow authorized progress | reference, order, requested/approved/received qty, remedy, expiry, tracking | customer labels, no costs | same proposed read | same references |

**Actions.** Request return, open permitted RMA. **Source.** Research §7/9; [R4](#reference-files). **Needs.** CS-PORTAL, CS-RETURN-POLICY.

### RequestReturn

**Context passed** to [NewReturn](#newreturn): `ServicePortal/RequestReturn`; verified customer/order; only returnable products/quantities within policy, customer reasons, requested remedy, condition/evidence and collection address. Requested remedy is not an approved refund. Server selects permitted receiving facility, determines fees/window and recomputes remaining eligibility. No arbitrary customer, supplier, payment method, source invoice or unreferenced-return override is accepted from browser parameters.

| App | Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- | --- |
| Customer Service portal | the verified customer's returnable order lines, reasons, requested remedy, evidence and collection address | the customer's own orders within the return policy | request a return; nothing is authorized here | what can be returned and how |

### CustomerReturn

**Context passed** to [crosscut §3.18](design-crosscut.md#318-returndetail): `ServicePortal/CustomerReturn`, signed in or through the proposed `/rma/<token>` route; customer's RMA; show the RMA number (`displayId`) and the customer's reference, authorization decision/expiry, approved quantities/instructions/label, tracking, customer-safe inspection decision and issued credit/refund/replacement status. Customer may add requested evidence/message, download approved label, withdraw a request before physical/financial effects or ask an agent to cancel after that. The label is the one Issue return label requested on ReturnDetail (proposed `request#ReturnLabel`). Evidence files need the proposed `ReturnContent` (D25). No stock disposition, credit posting, internal investigation notes or arbitrary bank refund selection. The row below is the external Customer Service portal row of the crosscut §3.18 table.

| App | Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- | --- |
| Customer Service portal | authorization decision and expiry, approved quantities and instructions, label, tracking, customer-safe inspection decision, credit, refund or replacement status | the verified customer's own RMA, or the RMA the token names | add evidence or a message, download the label, withdraw before any physical or financial effect | what to do next |

### CustomerArticle

**Context passed** to Commons Knowledge: `ServicePortal/CustomerArticle`; published page/version in the configured public/customer space; read, helpful/not-helpful with optional comment, Create case with article reference. This is the Commons public help-center page (`publicPageUrl`) with the Customer Service feedback and Create case actions added, not a second public article route. Drafts/internal spaces/attachments are denied independently of a guessed URL. Terminal displays text and offers the same feedback and case actions.

| App | Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- | --- |
| Customer Service portal | the rendered published page | published pages of the public and customer spaces | read, rate helpful or not with a comment, create a case citing the article | answering without a case |

### Feedback

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| CaseFeedback | single | Submit the invited response | opaque invitation token, form version, required rating 1–5, optional reason, optional comment, consent if collecting additional personal data | accessible numbered choices; generated DbForm | proposed `CaseFeedbackServices.submit#CaseFeedback` wrapping `org.moqui.impl.ScreenServices.create#FormResponse` | `Survey/Responses`; Frappe `TicketFeedback.vue` |

The invitation link is the proposed `/fb/<token>` route, checked by `check#AccessToken` (§8 Access). **States.** Token binds organization/case/resolution episode/form version, expires and permits one durable response; repeat submission returns its prior result. It cannot expose the case itself. Expired/revoked/reused states disclose only safe guidance. Mail scanners visiting GET do not submit a rating. One invitation per eligible resolution episode; delivery retries reuse its ID. **Source.** Research §10; [R8](#reference-files). **Needs.** CS-FEEDBACK, CS-PORTAL.

## 9. Settings

Settings use XML forms, permission-filtered lists and explicit Save/Preview/Publish actions. Browser reordering always has sequence fields/Move up/down for terminal and keyboard users. Published policy/template versions remain available to historical cases; edits create a new version. No administrator-entered JavaScript executes in a customer's case form.

### Settings

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| SettingLinks | list, read | Find allowed settings | category, description, readiness, permission | links | static screen metadata and proposed configuration readiness read | research §10 settings inventory |

**Layout/actions.** Cards/table grouped Work routing, Customer channels, Knowledge and feedback, Returns. Link to Commons account/profile/branding and calendar settings; never duplicate passwords, theme/timezone or mail credentials. **Source.** Research §10. **Needs.** CS-SETTINGS.

### Queues

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| QueueList | list | Manage service queues | category, parent, responsible team, active, visibility, default assignee | category tree with table fallback | RequestCategory reads plus proposed `ConfigurationServices.find#ServiceQueues` | RequestCategory; Frappe teams |
| QueueEdit | single | Define routing and authority | requestCategoryId, description, parentCategoryId, responsiblePartyId; proposed organization, offered types, visibility policy, default assignment rule/SLA/template, fallback assignee, active dates | existing team selector | proposed `ConfigurationServices.save#ServiceQueue` over RequestCategory and service policy extension | same references |

A queue is a service-enabled RequestCategory with a responsible party; it is not a duplicate category tree. Saved finds are views of queues, not authorization boundaries. Disabling a queue requires destination for new intake and keeps existing cases accessible to their authorized team. **Source.** Research §3/10; RequestEntities. **Needs.** CS-QUEUE.

### AgentTeams

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| TeamMembers | list | See service participation | existing user/party, team, role, active dates, availability, assigned count | presence label and working hours | existing party/group reads plus proposed `ConfigurationServices.get#ServiceTeam` | Frappe `Settings/Agents.vue`, Teams |
| TeamParticipation | single | Configure participation | user/party, team, service capabilities within administrator's grant, active dates, assignment eligibility, max active cases, calendar reference, substitute | existing identity selector | proposed `ConfigurationServices.save#ServiceTeamMember` | same references |

No separate agent login/password/master. Presence is a hint; assignment eligibility also checks membership, workload and schedule. Removing an agent previews reassignment; historical ownership remains. **Source.** Research §10; Commons presence/users. **Needs.** CS-QUEUE, CS-ASSIGNMENT.

### AssignmentRules

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| AssignmentRuleList | list | Order rules | name, queue, priority, active dates, distribution, last result | sequence field | proposed `AssignmentServices.find#Rules` | Frappe `Settings/Assignment Rules/AssignmentRulesList.vue` |
| AssignmentRuleEdit | single | Define typed routing | queue, name, priority, active dates; conditions: allowed field/operator/value; distribution manual/round-robin/least-open; eligible team/users, working days/calendar, max load, fallback, unassign/close conditions | declarative condition builder with row-list terminal twin (CS-FORM-ELEMENTS) | proposed `AssignmentServices.save#Rule` | Frappe AssignmentRuleView/AssigneeRules |
| AssignmentPreview | display | Explain routing | example case/current version, matching rules, eligible agents, selected agent, fallback reason | dry run, no assignment | proposed `AssignmentServices.preview#Assignment` | same references |

Rule evaluation is deterministic and audited; one winning rule plus explicit fallback. Lock distribution cursor and assignment atomically; two workers cannot claim the same next slot independently. Reassignment never resets SLA. No eligible agent leaves the case visible in unassigned with a manager notification. **Source.** Research §3/10; [R9](#reference-files). **Needs.** CS-ASSIGNMENT, CS-FORM-ELEMENTS.

### ServiceLevelPolicies

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| SlaPolicyList | list | Select policy/version | name, organization, applicability, priority, calendar, effective period, draft/published | version badges | proposed `SlaServices.find#Policies` | Frappe SLA DocType |
| SlaPolicyEdit | single | Define clock rules | policy/name/version, organization, queue/type/customer/agreement conditions, precedence, effective dates, calendar/timezone; targets per priority band (ServiceDefaults): first response/resolution business minutes, warning offsets; allowed pauses, maximum pause/escalation, reopen policy | Commons calendar selector; row targets | proposed `SlaServices.save#Policy` | Frappe `hd_service_level_agreement.json` |
| SlaSimulation | display | Explain due dates | example received timestamp/priority, target policy/calendar version, closures/holidays, pause intervals, first-response/resolution deadlines, warnings | timeline plus table | proposed `SlaServices.simulate#Policy` | Frappe TicketSLA and SLA working-hours pattern |

Use existing Commons working-hours/availability and holiday definitions; edit there with calendar permissions, return here by link. Bind a policy/calendar version to each episode so later holiday edits do not silently rewrite recorded breaches. Explicit correction requires manager reason and retains the previous calculation. First-response clock begins at accepted intake, is not reset on reassignment/reopen, and completes on the first real outward response; resolution starts a new episode on reopen, preserving prior breaches and reporting total age. Customer-wait pauses resolution by default; internal operational hold does not unless the published policy explicitly permits it. Define maximum pause warning, not an automatic successful resolution. The warning and breach times are found by the scheduled scan of CS-JOBS. **Source.** Research §3/10/13; [R8](#reference-files). **Needs.** CS-SLA, CS-JOBS; the Commons calendar needs Calendar services and Recurrence (crosscut §7.3), whose working hours are `WetAvailable` work efforts.

### StatusCategories

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| CaseStatusMap | list, editable rows | Map workflow semantics | workflow, statusId, agent label, customer label, category Open/Paused/Resolved/Closed/Cancelled, permitted pause reason, ordering, terminal flag, active dates | existing StatusItem picker; distinct label preview | proposed `ConfigurationServices.save#CaseStatusMapping` | Frappe `hd_ticket_status.json` |
| CaseTransitionPolicy | single | Configure allowed moves | workflow/type, from/to status, required resolution/reason, capability, reopen window, notify, close-after interval | status flow preview and transition table | proposed `ConfigurationServices.save#CaseWorkflow` | existing StatusFlowTransition and Frappe statuses |

Default mapping: Draft/Submitted/Reviewed/InProgress → Open; proposed WaitingCustomer → Paused; proposed OnHold → Open unless policy authorizes pause; Completed → Resolved; Cancelled → Cancelled. No Closed status is added. Auto-close keeps `ReqCompleted` and sets the proposed `CaseProfile.closedDate`; after that date a customer reply makes a linked follow-up case instead of reopening, and the Closed category means Completed with a closed date. Renaming ReqCompleted across apps is not needed. `ReqCancelled` has no outgoing transition, so a cancelled case can only be followed up, never reopened. Required categories are data, never hardcoded status-name tests. Changing a mapping publishes a version; existing SLA episodes retain original interpretation. **Source.** Research §3/13; [R10](#reference-files). **Needs.** CS-SLA, CX-REQUEST.

### CaseTypes

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ServiceTypes | list, editable rows | Offer current/new request types | enumId, description, service-enabled, customer label, default queue/template/workflow, default priority band, public availability | current enumeration selector | existing Enumeration reads; proposed `ConfigurationServices.save#ServiceRequestType` | Request RequestType seeds; baseline FindRequest |

`RqtSupport`, `RqtInformation`, `RqtContact` are current reusable types. The proposed seeds `RqtOrderChange` and `RqtWarranty` are explicitly added. The service-enabled flag is what the Request create and status rules read (D23), so a type marked here gets the case rules on every entry point. Existing project/purchase/inventory types remain owned by their processes; a case can link them without forcing their lifecycle into service SLA. **Source.** Research §12/13; RequestEntities. **Needs.** CX-REQUEST, CS-TEMPLATES.

### CaseTemplates

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| TemplateList | list | Select template/version | name, type/queue, audience, effective dates, published state | version selector | proposed `TemplateServices.find#Templates` | Frappe HD Ticket Template |
| TemplateEdit | single | Define bounded intake fields | name/type/queue/audience; fields: stable key, label, datatype, required, options/allowed source, default, ordering, visibility, help, validation limits; dependency rows: source field/operator/value, target field, show/require | declarative fields; sequence buttons; typed condition builder (CS-FORM-ELEMENTS) | proposed `TemplateServices.save#Template` | Frappe ticket template/field/dependency DocTypes |
| TemplatePreview | display | Test both audiences | sample values, computed visibility/required fields, validation messages, version | desktop/phone/terminal preview | proposed `TemplateServices.validate#Template` | Frappe template preview |

No arbitrary form script. Conditions use a typed allowlist and reject cycles; server re-evaluates hidden and required fields. Keep submitted values against immutable schema version; hidden internal fields are never sent to a customer. **Source.** Research §3/10; [R11](#reference-files). **Needs.** CS-TEMPLATES, CS-FORM-ELEMENTS.

### SavedReplies

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ReplyList | list | Find reusable response | title, shortcut, scope Personal/Team/Global, team, language, active, tags | search/preview | `org.moqui.impl.EmailClientServices.find#EmailTextBlocks`, filtered to the service groups | Comms `Comms/Settings/TextBlocks` `TextBlockList`; Frappe HD Saved Reply |
| ReplyEdit | single | Define text and optional actions | title, shortcut, bodyHtml, shared-with group (`userGroupId`), language, safe variables; actions: sequence, operation, field/value, assignee/team, tag, note/reply text, suggested status | action chips with ordered row alternative | text through Comms' `ironstone.comms.MailSettingsServices.store#TextBlock`; actions through proposed `ReplyServices.save#SavedReplyAction` | Comms `TextBlocks` `EditTextBlock`; Frappe saved reply DocType and action components |
| ReplyPreview | display | Check resolved text and effects | target case/version, rendered body, recipients/audience, changes, forbidden/unavailable actions | explicit apply/send | proposed `ReplyServices.preview#SavedReply`, `apply#SavedReply` | Frappe SavedRepliesSelectorModal |

A saved reply is a Comms text block, framework `moqui.basic.email.EmailTextBlock` (D24), so the composer offers one library. Personal is a block with only `ownerUserId`; team is shared with the service team's `userGroupId`; global is shared with the root group `BOSS_CUSTOMER_SERVICE`. As in Comms, only a block's owner changes or deletes it. Customer Service adds only the proposed `SavedReplyAction` rows (emailTextBlockId, sequence, operation, field and value, assignee or team, tag, suggested status) and a language and variables extension keyed by emailTextBlockId (CS-REPLIES). Comms TextBlocks keeps listing a user's own and shared blocks; this screen lists the service groups' blocks with their actions. CaseReplyAction inserts the text through the Compose text-block picker and then previews the actions. Applying a reply never auto-sends without explicit confirmation or bypasses field/action capabilities. Unsupported variables are unresolved errors, not empty customer promises. A macro's internal case mutations are atomic per case; message delivery has durable pending/failed status. **Source.** Research §3/10; [R12](#reference-files). **Needs.** CS-REPLIES.

### ChannelRouting

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| IntakeRoutes | list | See service entry points | Comms mail rule with the `ErActCreateRequest` action and its queue, the organization's ProjIntake offered and triaged types, public-form token and its queue, forum site and category, organization, queue/type/template, active, last error | links to Comms account and existing intake-token controls | active `mantle.request.RequestServices.get#IntakeSettings`; proposed `ChannelServices.find#ServiceRoutes` | existing Projects Intake; Frappe EmailConfig |
| RouteEdit | single | Map route and acknowledgement | channel/account reference, destination queue/type/template, sender policy, auto-generated mail (ignore, or attach to an existing case only), default priority band, acknowledgement template, reply identity, notification recipients, rate limit, token expiry | no credentials here | proposed `ChannelServices.save#ServiceRoute`; existing `create#IntakeToken`, `remove#IntakeToken` extended for queue destination | existing request intake; Frappe email notifications |
| RouteTest | display | Test non-delivering resolution | sample recipient/sender/message-id/thread references, matched route, existing case, visibility/defaults, rejection | dry run | proposed `ChannelServices.preview#ServiceRoute` | Redmine mail threading; current Request email intake |

Current `create#RequestFromEmail`, `find#EmailRequest`, `file#RequestEmail`, `send#IntakeConfirmation` remain the intake foundation. Thread by verified message references before permitted ticket tokens; never trust a guessed case ID in a subject to authorize another sender. Unknown sender is held for verification/triage. Comms owns transport, credentials, spam filtering and delivery retries.

ChannelRouting extends what exists instead of adding a route table. Mail is the existing Comms EmailRule with the action `ErActCreateRequest`, whose action value gains a queue (a service RequestCategory). Organization intake is the existing ProjIntake PartySetting, with `RqtSupport` among the triaged types. Only the public form needs a new holder: a queue-level PartySetting holds its token in place of a project's `WstIntakeToken`. A Forum topic escalation route maps a PASS site and category to a queue, type and template, so PASS `I.create#CaseFromTopic` lands in a queue. Auto-generated mail (an Auto-Submitted header other than no, Precedence bulk, junk or auto_reply, or X-Autoreply) is ignored or attached to an existing case only, per route, and is never acknowledged, so an autoresponder and `send#IntakeConfirmation` cannot loop and make cases. **Source.** Research §4/10; [R13](#reference-files). **Needs.** CS-CHANNELS, CX-REQUEST, CX-ACCESS.

### ReturnPolicies

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ReturnPolicyList | list | Choose applicable policy | organization, store/customer group, product category, priority, effective period, version | overlap warning | proposed `ReturnPolicyServices.find#Policies` | Odoo return settings; Carbon RMA |
| ReturnPolicyEdit | single | Define eligibility and authority | applicability/effective dates, window from shipment/delivery, authorization validity, self-service enabled, allowed reasons/remedies, proof/condition requirements, allowed destination, exception approver, no-receipt credit eligibility, advance replacement or instant credit allowed (needs F at authorization), restock fee rule/cap, customer instructions | policy preview; canonical pricing/tax rules | proposed `ReturnPolicyServices.save#Policy` | same references |
| ReturnReasons | list, editable rows | Maintain reason vocabulary | ReturnReason enum, label/customer label, enabled audience, evidence required, suggested response/inspection, proposed zero-value exception rule | explicit disposition suggestion only | guarded ReturnReason Enumeration CRUD plus proposed policy mapping | Odoo `return_reason_views.xml`; current return enums |
| ReturnPolicyPreview | display | Explain eligibility | order/item, delivery/date/quantity, customer/product, policy/version, remaining eligibility, expiry, fees, approval requirements | same preview used by NewReturn | proposed `ReturnPolicyServices.evaluate#ReturnPolicy` | Carbon returnable-line validation |

A reason suggesting scrap or zero valuation is not authority to post it: Quality and Accounting decide with evidence. Policy selection is deterministic; no matching policy yields manual review, not an unrestricted return, and with no policy the return window is manual review too. The customer's own reference is the proposed `customerReference` on the ReturnAuthorization extension; `ReturnHeader.externalId` stays an integration key (D11). **Source.** Research §7/10/13; [R3/R4](#reference-files). **Needs.** CS-RETURN-POLICY, CX-RETURNS.

### KnowledgeSources

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ServiceKnowledgeSources | list, editable rows | Scope suggested/published help | existing space/category, audience, language, product/category mapping, search priority, allow suggestions, review team, default draft space | Knowledge links | proposed `KnowledgeServices.save#ServiceKnowledgeSource`; existing WikiSpace reads | ERPNext support search source; Frappe KB categories |

Only include sources permitted for the current audience; indexing does not widen page permission. Publishing and category editing open Commons Knowledge. Suggestions prefer sources in the requester's language and fall back to the space's default language. The sources are internal wiki spaces only; external search sources (product documents, the forum, an external knowledge API) are later. **Source.** Research §9; [R7](#reference-files). **Needs.** CS-KNOWLEDGE.

### FeedbackForms

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| FeedbackFormList | list | Choose reusable survey | formId, name, purpose, version, active/publication state, assigned policies | standard list | `moqui.screen.form.DbForm` reads with proposed purpose/version adapter | `Survey/FindSurvey` `SurveyList` |
| NewFeedbackForm | dialog | Seed or copy a form | name, purpose, source form/version, organization, initial rating scale | default 1–5 seed | guarded `create#moqui.screen.form.DbForm` through proposed `FeedbackServices.create#FeedbackForm` | `Survey/FindSurvey` `NewSurveyForm` |

These screens are the Customer Service mount of the shared survey builder; its definition moves to Commons, which owns the survey builder (decided Oct 28, 2026; crosscut §8) and which Customer Service, Marketing and People mount. The default is a required 1–5 rating and optional reason/comment. Other service surveys use the same framework fields and response model, reusable by Marketing/People; service ownership is the case invitation/response link. **Source.** Research §10/12/13; baseline Survey. **Needs.** CS-FEEDBACK.

### FeedbackFormDetail

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| FeedbackFormHeader | single | Maintain definition | name, purpose, title/help, version, allowed audience, draft/published | version/read-only published state | guarded `update#moqui.screen.form.DbForm` | `Survey/EditSurvey` `EditSurveyForm` |
| FormAccess | list | Author/read grants | userGroupId, permission, effective scope | existing user-group lookup; add dialog | guarded DbFormUserGroup CRUD | `EditSurvey` `NewUserGroupForm`, `UserGroupForm` |
| FormFields | list | Define questions | fieldName/type, title, required, sequence, defaults/help, validation limits | sequence buttons; add-field dialog | `org.moqui.impl.ScreenServices.update#DbFormField`, `delete#DbFormField`; guarded DbFormField create | `Survey/Fields` `NewDbFormFieldForm`, `DbFormFieldList` |
| FieldOptions | list | Define choices | field, option key/label, score, sequence | explicit stable score mapping; add dialog | guarded DbFormFieldOption CRUD | `Survey/Fields` `NewFieldOptionForm`, `FieldOptionForm` |
| FormPreview | display | Preview and publish | rendered fields, sample response, audience, schema version | dynamic XML form; terminal same choices | proposed `FeedbackServices.publish#FeedbackForm`; DbForm rendering | `Survey/Fields` `SurveyPreview` |

No arbitrary JavaScript or public entity auto-service access. Published versions with responses cannot be edited/deleted in place; clone and publish a new version. DbForm has no version field, so a published version is a cloned DbForm with the proposed `DbForm.versionOfFormId` and `publishedDate` (CS-FEEDBACK). This screen is the Customer Service mount of the shared survey builder, like FeedbackForms. Access to responses remains case-filtered in addition to form access. **Source.** Research §10/12; active framework ScreenServices and baseline Survey. **Needs.** CS-FEEDBACK.

### ServiceDefaults

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ServicePolicy | single | Set service-wide defaults | organization, enabled types, default queue/template/SLA, priority bands, unknown-sender/intake policy, prefer-KB, reopen window (days), auto-close delay, required resolution, support-work completion policy, retention policy reference, acknowledgement/feedback rules, fallback owner | links to shared branding/calendar/privacy settings | proposed `ConfigurationServices.save#ServiceDefaults` | Frappe General/settings API |
| FeedbackDeliveryPolicy | single | Configure invitations | eligible resolved types/queues, delay, per-episode frequency, form version, channel, token expiry, reminder cap, suppression/consent, low-score follow-up team | template preview, no transport credentials | proposed `CaseFeedbackServices.save#InvitationPolicy` | Frappe email notification/share-feedback settings |

Auto-close may follow a resolved case after a disclosed waiting period; it never fabricates a first response or resolves an open unhandled case. Customer reply before close reopens via policy. Auto-close leaves the status `ReqCompleted` and sets the proposed `CaseProfile.closedDate`; after that a reply makes a linked follow-up case (StatusCategories). The scheduled job of CS-JOBS runs it.

**Priority bands.** `Request.priority` stays the existing integer (1–9). ServicePolicy holds a seeded band map with labels and colours: 1–2 Urgent, 3–4 High, 5–6 Normal, 7–9 Low. CaseTypes gives each type a default band, and ServiceLevelPolicies targets name a band, not a number. Retention uses shared privacy/record retention; deleting a conversation cannot destroy required financial/stock audit. **Source.** Research §10; [R1/R8](#reference-files). **Needs.** CS-SETTINGS, CS-FEEDBACK, CS-JOBS, CX-REQUEST.

### ChannelAutomation

**Later.** Scope is bounded configuration for Comms-owned live chat distribution, chatbot steps and optional telephony adapters. Manual call logging, chat-to-case links and email intake above do not wait for it.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ChannelRule | single | Configure routing/scripts | channel, active dates, allowed site/customer audience, agent team, schedule, fallback queue; steps: prompt, response choices, next step, handoff, required consent | visual graph optional; ordered branch table is complete terminal behavior | proposed Comms channel orchestration, no current service claimed | Odoo im_livechat channel/chatbot; Frappe telephony settings |
| ChannelSimulation | display | Verify handoff | sample visitor/time/input, script path, eligible team, resulting case context | dry run | proposed Comms test service | same references |

Credentials and actual calls stay in Comms; no provider integration is implemented in this design pass. **Source.** Research §4/10; [R14](#reference-files). **Needs.** CS-CHANNELS (later).

## 10. Baseline and research coverage

### Current-source verification

Checked against active XML on Oct 27, 2026, not merely research descriptions. Source paths are relative to this plan directory unless absolute.

| Source | Finding and design consequence |
| --- | --- |
| [CustomerService.xml](../screen/CustomerService.xml), [BossSetupData.xml](../data/BossSetupData.xml) | Root scaffold, icon, organization setup and Chatter/files mounts exist. Customer Service's BOSS grant is inside a comment block; no new menu/screens are claimed implemented. |
| [Shared/RequestDetail.xml](../screen/Shared/RequestDetail.xml), [Projects Request services](../service/ironstone/projects/ProjectRequestServices.xml) | Current Commons/Projects contexts already provide request details, links, tasks and client restrictions. Add a service context; do not duplicate the shared screen. |
| [RequestEntities.xml](../../mr-mantle/entity/RequestEntities.xml), [RequestServices.xml](../../mr-mantle/service/mantle/request/RequestServices.xml) | Active RequestRecord, RequestCommEvent, RequestEmailMessage, RequestWorkEffort, RequestParty and WikiPageRequest; intake-token/email and linked-work completion services exist. Support needs scoped policies and non-project visibility, not another generic link/intake implementation. |
| [OrderEntities.xml](../../mr-mantle/entity/OrderEntities.xml), [ReturnServices.xml](../../mr-mantle/service/mantle/order/ReturnServices.xml) | ReturnHeader/ReturnItem/ReturnItemBilling and creation, eligibility, approval, receipt and response services exist. `externalId` and `originId` are integration keys ("ID for the return in the direct upstream system"), and `displayId` is the ID shown to customers; the customer's own reference is a proposed field. `process#ReturnItemResponses` is active but has TODOs for receipt association and refund gateway/original-payment handling; `update#ReturnItem` contains TODO status restrictions. Existence does not satisfy guarded cumulative credit, complete gateway refund or service-level authorization. Proposed settlement must close these gaps. Commented legacy invoice-adjustment blocks are not active behavior. |
| [InventoryReportServices.xml](../../mr-mantle/service/mantle/product/InventoryReportServices.xml), [AssetServices.xml](../../mr-mantle/service/mantle/product/AssetServices.xml) | Projection service is active, depends on search and explicitly reports no projected inventory when search is absent. Asset availability reads are reused; freshness/inspection semantics require the shared extension. |
| [WorkEffortEntities.xml](../../mr-mantle/entity/WorkEffortEntities.xml), [Commons Calendar](design-drawers-commons.md#7-calendar-and-schedules) | Existing WorkEffortRecord, `WetAvailable` working hours and `WepHoliday` vocabulary support shared scheduling. SLA business-time evaluation/versioning is new. |
| [ScreenEntities.xml](../../../base-component/framework/entity/ScreenEntities.xml), [ScreenServices.xml](../../../base-component/framework/service/org/moqui/impl/ScreenServices.xml) | DbForm, fields/options/user-group grants, FormResponse and get/create/stats/update-field services exist. Case/episode linkage, invitation scope and immutable published form versions are proposed service adaptations. `update#FormResponse` and `delete#FormResponse` also exist, so immutability needs an explicit guard; DbForm has no version field. |
| [Comms TextBlocks](../screen/Comms/Settings/TextBlocks.xml), [Compose](../screen/Comms/Inbox/Compose.xml), [BasicEntities.xml](../../../base-component/framework/entity/BasicEntities.xml) | Comms already stores canned text as framework `moqui.basic.email.EmailTextBlock` (owner user or shared user group, title, shortcut, bodyHtml), edited in TextBlocks and offered in the composer through `find#EmailTextBlocks`. SavedReplies reuses it and adds only action rows (D24). |
| [OrderReturn.secas.xml](../../mr-mantle/service/OrderReturn.secas.xml), [AccountingInvoice.secas.xml](../../mr-mantle/service/AccountingInvoice.secas.xml), [ProductAsset.secas.xml](../../mr-mantle/service/ProductAsset.secas.xml), [Request.eecas.xml](../../mr-mantle/entity/Request.eecas.xml) | Service and entity ECA rules already run on order approval and reservation, return approval and receipt, the sales invoice at pack, stock release and request triage. §13 Decided says which this design keeps, conditions or replaces (D1). |

### Form and service coverage

The coordinator adds these paths to **Designed in** without changing **Implemented in**. Shared-screen mappings indicate this app's permitted form context, not a second definition. The accompanying mapping includes only direct, active existing services; proposed service names are not inventory entries.

| Baseline group | Destination and treatment |
| --- | --- |
| Request/FindRequest: NewRequestForm, ListRequests | NewCase; Cases and Home (parity queue/create underlying Request, new service template/SLA behavior). |
| Request/EditRequest: EditRequest, AddPartyForm, UpdatePartyForm, RequestTaskList; EditUsers AddUserForm/UpdateUserForm | CaseDetail shared header, people and work tabs. |
| Request/EditRequest comment/note/content forms; RequestCommentReply/RequestCommentUpdate | CaseDetail through existing Chatter/RecordFiles; customer context restricts audience and file actions. |
| Request/EditTasks: AddRweForm, NewTaskForm, UpdateRweForm | CaseDetail shared Work; support task completion notifies agent. |
| Request/EditRequestItems: NewRequestItemForm, RequestItemListForm | CaseDetail conditional Items for item-bearing requests, preserving existing Projects definition. No case-local stock execution. |
| Request/EditWikiPages: AddWprForm, DeleteWprForm | Knowledge and CaseDetail article links; CaseToArticle also creates a reviewed draft. |
| Return/FindReturn: CreateReturn, ReturnHeaderList | NewReturn; Returns and MyReturns. CreateSupplierReturn belongs to Purchasing/Warehouse, linked but not duplicated here. |
| Return/AddOrderItems: LookBackDaysForm, AddOrderItemToReturn | NewReturn source/eligible-line steps. |
| Return/EditReturn: UpdateReturn, AuditLogList; EditReturnItems ReturnItemList | ReturnDetail shared authorization/items/history. |
| Customer/FindCustomer: OuterSearchForm, CustomerListForm; CustomerData CustomerDataList | Customers and shared Customer360. Person/organization/account/contact creation forms are the common Customer360/contact actions. |
| Order/FindOrder OrderList; OrderDetail HeaderForm, OrderItems, AuditLogList, SendPlacedEmailForm, EmailMessageList | Orders and shared OrderDetail lookup/read/audit/resend. Request change replaces unrestricted edit from service context; other order management remains the owning design. Order/ReturnItem ReturnItem maps to NewReturn/ReturnDetail. |
| Survey/FindSurvey: NewSurveyForm, SurveyList; EditSurvey: EditSurveyForm, NewUserGroupForm, UserGroupForm | FeedbackForms and FeedbackFormDetail, with published version/response safeguards. |
| Survey/Fields: NewDbFormFieldForm, SurveyPreview, DbFormFieldList, NewFieldOptionForm, FieldOptionForm | FeedbackFormDetail; no competing survey engine. |
| Survey/Responses ResponseListForm; ResponseStats TextDbFormFieldResponseCountList/FieldOptionForm; ResponseDetails ResponseDetailsForm | SatisfactionResults and ResponseDetail; case access supplements form access. |
| MyAccount/User/Request MyRequests and EditRequest | MyCases/NewCustomerCase/CustomerCase reuse the external restriction pattern; expand to support destinations through common access policy. |
| Active direct Mantle services | Root setup; Request create/update/replace parties, record links and intake token/settings; Return eligibility/create/request/approve/cancel and `create#ReturnShipment` through the shared guarded contract (receipt and response run only inside the Warehouse and Accounting services, D11); communication history/outward reply; shared availability reads and warranty work-record links. Exact names/paths are in form summaries and canonical shared definitions. |

### Research candidate and question disposition

| Research scope | Design destination | Classification / disposition |
| --- | --- | --- |
| §2 / §13 Home KPI, my work, queue counts, return approvals | Home; shared widgets/Approvals | new; all proposed counts have authorized drill-downs |
| §3 case list/board, bulk, detail, dynamic intake, merge/split, recent/similar cases, case tags | Cases, NewCase, CaseDetail (Recent cases pane), MergeCases, SplitCase; proposed RequestTag | parity for baseline record work; new SLA/routing/templates/merge |
| §3 status-category, queue, response clock, saved actions | StatusCategories, Queues, ServiceLevelPolicies, SavedReplies | new configuration with explicit state rules |
| §4 email, public forms, chat, phone, threading | ChannelRouting, ChannelSessions, external intake | extend existing intake/Comms; advanced scripted chatbot/CTI is later ChannelAutomation |
| §5 customer/contact, service history, orders, returns, CSAT | Customers, Customer360, ContactDetail | shared parity; new service metrics and permitted coverage links |
| §6 order lookup, quick search, customer actions, changes | Orders, shared Order/Shipment/Invoice detail, OrderChanges | parity lookup; new guarded approval/application |
| §7 customer returns, fees, expiry, replacement, standalone receipt/response, returns reporting by reason | NewReturn/ReturnDetail, ReturnPolicies, ReturnAnalysis | baseline parity plus shared new policy/settlement guards; receipt is Warehouse's `receive#ReturnItems` and settlement Accounting's `settle#Return` (D11) |
| §7 failed inspection, supplier recovery, customer-owned repair/warranty | QualityInspection, WarrantyAssessment, linked WorkEffort | new claim layer; shared stock/financial execution |
| §8 availability/incoming/facility and stock-at-date | InventoryAvailability, StockAtDate (Warehouse's report, mounted, D24), Product360 | parity current reads; new freshness/history contract |
| §9 search/read/author, suggestions, case links, suggest edit, send to customer, feedback, case-to-article, article language | Commons Knowledge context, ArticleFeedback, CaseToArticle, SupportHome, KnowledgeSources | parity wiki/editor; new audience-filtered suggestion/feedback workflow; external search sources later |
| §10 SLA/response/volume/CSAT/per-case reports | All Reports screens | new operational metrics; parity Survey forms |
| §10 settings inventory | All Settings screens | each area represented; account/profile/theme/branding in Commons, mail credentials in Comms |
| §11 reusable cross-app surfaces | Context-only sections and crosscut registry | one definition each; no duplicate shared form definitions |
| §12 baseline, §13 outdated generic-link/calendar gaps | Current-source verification above | active links/intake/calendar reused; missing policy only proposed |
| §13 question: case ↔ order/return links | RequestRecord, existing per-type joins | decided: reuse active generic link with access checks; communications through RequestCommEvent and the generic CommunicationEventRecord; CSAT through CS-FEEDBACK CaseSurveyInvitation; files through each host's content entity (D25) |
| §13 question: status categories | StatusCategories | decided: versioned per-workflow mapping, not hardcoded IDs |
| §13 question: portal ownership | §8 external pages | decided: the `screen/ServicePortal.xml` audience root, token routes and one Mantle capability service (D5); full Commerce later |
| §13 question: order change model | OrderChangeDetail | decided: linked case plus immutable proposal/approval and guarded apply; Customer Service applies only cancellation and short-pick substitution (D9) |
| §13 question: warranty/repair record | WarrantyAssessment | decided: proposed claim extension on Request; maintenance-purpose work and Return custody |
| §13 question: working-hours editor | Commons working hours + ServiceLevelPolicies reference | decided: one shared calendar; SLA policy/calendar version binding |
| §13 question: CSAT builder | FeedbackForms/FeedbackFormDetail | decided: minimal seeded rating first; all 14 baseline Survey forms retained behind S capability, as the Customer Service mount of the shared survey builder (owner: Commons, crosscut §8) |

### End-to-end review cases

| Scenario | Required outcome and failure behavior |
| --- | --- |
| Product/variant → supplier price → requisition/RFQ → PO → partial receipt/inspection → bill match/payment | Service sees only customer-safe Product/availability facts. Incoming dates remain qualified; failed inspection holds stock, not a fulfilled promise. PO/receipt/match/payment are read via permitted source links, with Purchasing/Warehouse/Accounting ownership. |
| Shortage → buy/make/transfer → issue → partial completion → finished stock/valuation | Availability exposes distinct plan/supply provenance; no case/agent creates a duplicate replenishment demand. Released-BOM changes are Manufacturing replan/reapproval events; customer promise updates derive from changed supply readiness. Only accepted finished stock increases usable supply; Accounting WIP/valuation remains separate. |
| Order → reservation → pick shortfall → packing/shipping → invoice/payment | Starts from a placed sales order (Sales pass or import). Warehouse records the short pick; service sees the shortfall, proposes a substitute, captures consent and applies it through OrderChangeDetail's substitution kind; Warehouse picks the approved substitute (D9). After pack, apply first releases the draft invoice through Accounting. Concurrent fulfillment returns StaleOrder/AlreadyShipped; substitution rechecks units/price/tax/stock and does not delete existing issued/billed history. |
| Case → RMA → partial receipt → failed inspection/disposition → credit/refund | R authorizes with no settlement at approval, W receives through `receive#ReturnItems` and holds/disposes, F settles permitted quantity/amount through `settle#Return`; partial credit and retries cannot exceed cumulative source eligibility. Receiptless credit is an explicit exception with no stock. Case resolution cannot complete return settlement. Supplier recovery is a separately linked supplier return. |
| Physical count → intervening stock movement → variance review → posting/retry | Service does not post counts; availability as-of and current promise are revalidated after Warehouse posts the movement-aware variance. A stale count cannot be used to promise stock. Posting retry returns the original result; case follow-up message may retry independently. |
| Case intake → assignment → pause/reopen → resolution → CSAT | Existing intake routes to category/team, records original receipt, deterministic assignment uses schedule, customer wait pauses only configured clock; first response never restarts. Linked work completion prompts agent. Reopen creates resolution episode with prior breach retained; one scoped feedback invitation per eligible episode, duplicate POST returns prior response. |
| Unauthorized actions, cancellations, closed period and standalone use | Context never grants access. Unapplied order changes and unreceived returns may cancel by policy; posted effects require explicit reversals. ClosedPeriod prevents financial posting and leaves source/audit intact. Standalone A+W/F invokes common services without unrelated app-root grants. |
| Independent failures | Batch results name each accessible case/return/document and outcome; continue other independent items. One merge, source return credit, reservation/application or stock/financial posting is atomic. External send/refund/label uncertainty is durable Pending and reconciled by operation key. |

### Reference files

References are local checkouts in `/Users/jonesde/work/moquiwork/3p_other`, inspected for patterns and corroborated with active BOSS/Mantle source. They are references, not dependencies or copied implementations.

| Ref | Concrete files | Pattern used |
| --- | --- | --- |
| R1 | [Tickets.vue](/Users/jonesde/work/moquiwork/3p_other/frappe/helpdesk/desk/src/pages/ticket/Tickets.vue), [TicketNew.vue](/Users/jonesde/work/moquiwork/3p_other/frappe/helpdesk/desk/src/pages/ticket/TicketNew.vue), [dashboard.py](/Users/jonesde/work/moquiwork/3p_other/frappe/helpdesk/helpdesk/api/dashboard.py) | saved case views, intake, authorized operational metrics |
| R2 | [TicketMergeModal.vue](/Users/jonesde/work/moquiwork/3p_other/frappe/helpdesk/desk/src/components/ticket/TicketMergeModal.vue), [TicketSplitModal.vue](/Users/jonesde/work/moquiwork/3p_other/frappe/helpdesk/desk/src/components/ticket/TicketSplitModal.vue) | survivor/target selection and selected-message split |
| R3 | [Carbon credit route](/Users/jonesde/work/moquiwork/3p_other/carbon/apps/erp/app/routes/x+/sales-return-order+/$id.credit.tsx), [ReturnableLinesModal.tsx](/Users/jonesde/work/moquiwork/3p_other/carbon/apps/erp/app/modules/sales/ui/SalesReturnOrders/ReturnableLinesModal.tsx) | received-minus-credited pool, row locks, source-line selection and credit permission distinct from sales view |
| R4 | [Odoo portal return controller](/Users/jonesde/work/moquiwork/3p_other/odoo/odoo/addons/sale_stock/controllers/return_order.py), [return_reason_views.xml](/Users/jonesde/work/moquiwork/3p_other/odoo/odoo/addons/sale_stock/views/return_reason_views.xml) | customer-scoped return eligibility and reasons |
| R5 | [ERPNext warranty_claim.json](/Users/jonesde/work/moquiwork/3p_other/frappe/erpnext/erpnext/support/doctype/warranty_claim/warranty_claim.json), [Odoo repair_views.xml](/Users/jonesde/work/moquiwork/3p_other/odoo/odoo/addons/repair/views/repair_views.xml) | product/serial/customer entitlement and separate repair execution |
| R6 | [Dolibarr stockatdate.php](/Users/jonesde/work/moquiwork/3p_other/dolibarr/htdocs/product/stock/stockatdate.php), [Odoo forecasted_details.xml](/Users/jonesde/work/moquiwork/3p_other/odoo/odoo/addons/stock/static/src/stock_forecasted/forecasted_details.xml) | historical cut-off and incoming/outgoing evidence |
| R7 | [KnowledgeBaseCustomer.vue](/Users/jonesde/work/moquiwork/3p_other/frappe/helpdesk/desk/src/pages/knowledge-base/KnowledgeBaseCustomer.vue), [ArticleFeedback.vue](/Users/jonesde/work/moquiwork/3p_other/frappe/helpdesk/desk/src/components/knowledge-base/ArticleFeedback.vue), [NewArticle.vue](/Users/jonesde/work/moquiwork/3p_other/frappe/helpdesk/desk/src/pages/knowledge-base/NewArticle.vue) | search-first support, helpful feedback and author flow |
| R8 | [TicketSLA.vue](/Users/jonesde/work/moquiwork/3p_other/frappe/helpdesk/desk/src/components/ticket-agent/TicketSLA.vue), [hd_service_level_agreement.json](/Users/jonesde/work/moquiwork/3p_other/frappe/helpdesk/helpdesk/helpdesk/doctype/hd_service_level_agreement/hd_service_level_agreement.json), [TicketFeedback.vue](/Users/jonesde/work/moquiwork/3p_other/frappe/helpdesk/desk/src/pages/ticket/TicketFeedback.vue) | separate clocks/actual/delay, business-hours targets and case feedback |
| R9 | [AssignmentRuleView.vue](</Users/jonesde/work/moquiwork/3p_other/frappe/helpdesk/desk/src/components/Settings/Assignment Rules/AssignmentRuleView.vue>) | rule conditions, assignees and schedule |
| R10 | [hd_ticket_status.json](/Users/jonesde/work/moquiwork/3p_other/frappe/helpdesk/helpdesk/helpdesk/doctype/hd_ticket_status/hd_ticket_status.json) | customer labels and Open/Paused/Resolved categories independent of labels |
| R11 | [hd_ticket_template.json](/Users/jonesde/work/moquiwork/3p_other/frappe/helpdesk/helpdesk/helpdesk/doctype/hd_ticket_template/hd_ticket_template.json), [TicketCustomerTemplateFields.vue](/Users/jonesde/work/moquiwork/3p_other/frappe/helpdesk/desk/src/pages/ticket/TicketCustomerTemplateFields.vue) | typed customer-facing template fields |
| R12 | [hd_saved_reply.json](/Users/jonesde/work/moquiwork/3p_other/frappe/helpdesk/helpdesk/helpdesk/doctype/hd_saved_reply/hd_saved_reply.json), [SavedRepliesSelectorModal.vue](/Users/jonesde/work/moquiwork/3p_other/frappe/helpdesk/desk/src/components/SavedRepliesSelectorModal.vue) | scoped saved text and explicit actions |
| R13 | [Redmine mail_handler.rb](/Users/jonesde/work/moquiwork/3p_other/redmine/app/models/mail_handler.rb), [current RequestIntake.xml](../screen/RequestIntake.xml) | message threading and existing bounded public intake |
| R14 | [Odoo im_livechat models](/Users/jonesde/work/moquiwork/3p_other/odoo/odoo/addons/im_livechat/models/im_livechat_channel.py) | deferred live-channel routing; separate from service case execution |
| R15 | [Odoo stock_picking_views.xml](/Users/jonesde/work/moquiwork/3p_other/odoo/odoo/addons/sale_stock/views/stock_picking_views.xml) (`action_stock_picking_return_report`), [Carbon ReturnReasons](/Users/jonesde/work/moquiwork/3p_other/carbon/apps/erp/app/modules/sales/ui/ReturnReasons/ReturnReasonForm.tsx) | returns reported by reason |
| R16 | [Frappe hd_ticket api.py](/Users/jonesde/work/moquiwork/3p_other/frappe/helpdesk/helpdesk/helpdesk/doctype/hd_ticket/api.py) (`get_recent_similar_tickets`), [TicketDetailsTab.vue](/Users/jonesde/work/moquiwork/3p_other/frappe/helpdesk/desk/src/components/ticket-agent/TicketDetailsTab.vue) | recent and similar cases beside the case |

## 11. Documents and outputs

| Output | Kind | From screen | Derived from | Contents / permission / delivery |
| --- | --- | --- | --- | --- |
| Case acknowledgement and outward reply | email | NewCase, CaseDetail | existing `send#IntakeConfirmation` and `mantle.party.CommunicationServices.send#EmailDraft`; Frappe ticket acknowledgement | verified requester, case reference, customer-safe summary/status and support link; queued/sent/failed state with original message identity; never sent for auto-generated mail |
| Case summary PDF/text | `html-print` | CaseDetail | `Request/EditRequest`; Frappe ticket print | customer-visible or internal variant explicitly labeled; authorized messages, resolution and selected links; private notes never enter customer variant |
| RMA authorization/instructions/label | email, `html-print` and carrier label | ReturnDetail, CustomerReturn | Odoo portal return label (`order_return_label`); Warehouse WH-LABEL | approved items/quantities, expiry, address, instructions, customer-safe reason/fees; the label comes from Issue return label (proposed `request#ReturnLabel` over the Warehouse WH-LABEL adapter) with operation reconciliation |
| Order-change decision/confirmation | email | OrderChangeDetail | existing placed-order email (`Order/OrderDetail` `SendPlacedEmailForm`) | exact approved/applied proposal version, order reference, price/date consequences, outstanding actions; no obsolete proposal sent as applied |
| Credit memo/refund/replacement notice | email | ReturnDetail / InvoiceDetail | Accounting's proposed `send#Invoice`; Carbon RMA credit | Accounting document/payment status and amounts; “pending” remains pending, service cannot manufacture paid status |
| SLA/volume/response/CSAT/returns CSV | CSV export | Reports | Frappe dashboard; ERPNext support reports; Odoo returns report | filters, cohort, timezone, as-of, metric basis and authorized data; export permission and audit for comments/contact data |
| Knowledge draft/public article | wiki page | CaseToArticle / Knowledge | Commons Knowledge; Frappe `NewArticle.vue` | redacted draft plus private source link; publication by authorized author/reviewer using Commons |
| CSAT invitation/receipt | email | Feedback | baseline Survey; Frappe `TicketFeedback.vue` | record-scoped expiring token on the proposed `/fb/<token>` route, published form version, episode; no case read capability embedded; idempotent submission receipt |

## 12. Framework and data needs

These are proposed additions or extensions. Crosscut owns the consolidated need registry; IDs here identify the Customer Service contribution. Reuse current record links, calendars, Chatter, files, approvals and framework forms. Proposed service shorthand in form tables is under `ironstone.customerservice` unless its full namespace is written; it is not a claim of implementation. Four shorthand families are reusable business services over proposed Mantle entities, which Warehouse and Accounting mounts also run, so they live in Mantle (crosscut §7.1): `ReturnPolicyServices` is proposed `mantle.order.ReturnPolicyServices`, `SlaServices` is proposed `mantle.request.SlaServices`, `WarrantyServices` is proposed `mantle.request.WarrantyServices`, and `CaseFeedbackServices` (the invitation and its response link) is proposed `mantle.request.CaseFeedbackServices`. CaseServices, ReportingServices, ConfigurationServices, AssignmentServices, TemplateServices, ReplyServices, ChannelServices, KnowledgeServices, OrderChangeServices and FeedbackServices stay in `ironstone.customerservice`. Proposed service entities are in the package `mantle.request.support`.

| Need | Kind | Proposed as | Used by | Stub spec |
| --- | --- | --- | --- | --- |
| CS-QUEUE | data model, service type, seed data | RequestCategory service extension and proposed `mantle.request.support.CaseProfile`; proposed `mantle.request.RequestTag` with the EnumerationType `RequestTag`; `ironstone.customerservice.CaseServices` (including `ensure#CaseProfile` and `update#Case`) / ConfigurationServices | Cases, Home, Customer360, CaseDetail | Profile PK requestId; organization, service workflow/version, queue/category, template/version, accepted intake timestamp, closedDate (auto-close), and the originating communicationEventId or emailMessageId. The channel is `Request.salesChannelEnumId`, not a profile field. A Request create entity ECA rule calls `ensure#CaseProfile` for every service-enabled type, so every entry point makes the profile, queue and first SLA episode (D23). `update#Case` changes queue, priority and assignee under the queue policy. A tag row is requestId, tagEnumId, fromDate, thruDate. Preserve existing Request priority/customer/parties and category responsible team. Filter every read by organization/customer/team; create/transition atomically with policy. |
| CS-SLA | data model, service type, seed data | proposed `mantle.request.support.ServiceLevelPolicy`, `ServiceLevelTarget`, CaseStatusMapping, CaseSlaEpisode, CaseSlaEvent; proposed `mantle.request.SlaServices` | CaseDetail, settings, reports | Immutable policy/status/calendar binding, chosen at intake; per-priority-band first-response/resolution targets; start/due/actual, pause intervals/reasons, reopen episode, warnings/breaches and corrections. A proposed Request status entity ECA rule records the proposed `record#CaseEvent` for every status change from any path, and a RequestCommEvent create rule records outward responses and customer replies from Chatter or email (D23). `Request.responseRequiredDate` mirrors the current resolution due date and only SlaServices writes it. Shared WetAvailable/holiday schedules feed business-time calculation. Event processing keyed by request/event identity; batch timer failures name case IDs and continue. |
| CS-ASSIGNMENT | data model, service type | ServiceAssignmentRule/Condition, ServiceTeamParticipation; AssignmentServices | Queues, AgentTeams, AssignmentRules | Existing user/party/team identities plus eligibility/load/calendar; ordered typed rules and atomic distribution cursor; auditable reason/fallback, no SLA reset. |
| CS-TEMPLATES | data model, service type | CaseTemplate/Field/Dependency/Value with immutable versions; TemplateServices | NewCase, CaseTemplates | Typed allowlisted fields/operators, no scripts, cycle validation, audience and server validation. Values reference template version and Request; core Request fields remain canonical. |
| CS-REPLIES | data model, service type | proposed `mantle.request.support.SavedReplyAction` rows and a language and variables extension, both keyed by emailTextBlockId of the existing framework `moqui.basic.email.EmailTextBlock`; ReplyServices | CaseDetail, Cases, SavedReplies | No new text store: the text, its owner and its shared group are the Comms text block (D24). Action rows: emailTextBlockId, sequence, operation, field and value, assignee or team, tag, suggested status. Safe variable resolution, preview recipients and permitted changes, version check, one transaction per case and durable outbound message key. |
| CS-MERGE | data model, service type | CaseRelation merge/split/follow-up lineage plus CaseServices operations | MergeCases, SplitCase, CustomerCase reopen | source/target/request, relation (merge, split or follow-up), actor/time/reason, evidence references and retained SLA obligation. Same-customer merge, lock all involved cases, preserve original audience/history and task/return identities. A reply after the reopen window or after auto-close makes a follow-up case linked by this relation. |
| CS-ORDER-CHANGE / CX-ORDER-CHANGE | data model, service type | Request-linked (`RqtOrderChange`) OrderChange/Line/Decision/Application; OrderChangeServices; proposed `mantle.order.OrderHoldReason` with `hold#Order` and `release#OrderHold` (D7) | OrderChangeDetail, OrderDetail, Approvals | Fields listed fully in §4. Versioned proposal/approval, current source locks, canonical price/reservation/posting guards, idempotent application and explicit conflicts. The lock is OrderHold with a Change reason, never `OrderBeingChanged`. Customer Service applies only the cancel and short-pick substitution kinds; other kinds route to the order owner (D9). Apply calls Accounting's proposed `release#ShipmentDraftInvoice` and `refund#OrderPayment` between pack and ship, and opens InvoiceCorrection for a billed delta; Warehouse releases reservations. |
| CS-RETURN-POLICY / CX-RETURNS | data model, service type | ReturnPolicy/Rule and ReturnAuthorization extension; proposed `mantle.order.ReturnPolicyServices` (`authorize#Return`, `close#ReturnRemainder`, policy and exception services) | Returns, NewReturn, ReturnDetail, Approvals, portal | Policy/version, assignee, expiry, exception authority, fee preview, customer promise and the customer's reference (`customerReference`); keep `externalId` and `originId` for integrations and the existing billing associations. `authorize#Return` wraps `approve#Return` and forces `responseImmediate` to N unless policy allows and the actor holds F; the `ReturnApprovedProcess` rule keeps only `create#ReturnShipment` (D11). Depends on Warehouse's `request#ReturnLabel` (WH-LABEL, CX-LABELS) and `receive#ReturnItems`, and on Accounting's proposed `preview#Return` and `settle#Return`. Return files need the proposed ReturnContent (D25). Authorization/credit ceilings rechecked under locks; stock disposition and settlement delegated to common owners. |
| CS-WARRANTY | data model, service type | Request-linked (`RqtWarranty`) WarrantyClaim/Decision; `mantle.request.WarrantyServices` | WarrantyAssessment | Sale/product/serial/equipment/agreement evidence, entitlement decision/version/approver/consent, linked maintenance work and custody return. No claim-local stock ledger or repair labor engine. The coverage basis and chargeable repair are §14 Open items. |
| CS-KNOWLEDGE | data model, service type | ServiceKnowledgeSource (with language), ArticleFeedback/Review; KnowledgeServices | Knowledge, ArticleFeedback, CaseToArticle | Existing WikiSpace/Page and WikiPageRequest; scoped suggestion search in the requester's locale first, article-version feedback, moderated/redacted draft creation; suggest edit through Commons `WikiPageReview`; public nonce/rate limit. |
| CS-FEEDBACK | data model, service type, seed data | CaseSurveyInvitation/ResponseLink/FollowUp and version policy over framework DbForm/FormResponse; `mantle.request.CaseFeedbackServices` and FeedbackServices; proposed `DbForm.versionOfFormId` and `publishedDate` | FeedbackForms, Feedback, reports | case/episode/form version, opaque token digest/expiry/revocation, delivery state, response ID, scalar rating index and consent. One durable response per invitation; immutable published version (a cloned DbForm), response authorization inherited from case. `update#FormResponse` and `delete#FormResponse` refuse a response linked to an invitation, by an authorization rule or an entity ECA rule. The invitation link is the `/fb/<token>` route. |
| CS-CHANNELS | service type, data model, seed data | Queue destinations on existing intake services; ChannelServices route extension; proposed `ScChat` sales channel seed | ChannelRouting, ChannelSessions, CaseDetail | existing intake settings/tokens/email joins reused: the `ErActCreateRequest` mail-rule action value names a queue; ProjIntake triaged types include `RqtSupport`; a queue-level PartySetting holds the public-form token. Auto-generated mail (Auto-Submitted, Precedence bulk/junk/auto_reply, X-Autoreply) is ignored or attached only and never acknowledged. Forum topic escalation route for PASS `I.create#CaseFromTopic`, and the reviewed public reply through `I.publish#CaseReply`. Organization/account/queue/type/template mapping and safe sender resolution. Comms-owned live chat/CTI/script adapter remains later. |
| CS-PORTAL / CX-PORTALS | service type, seed data | the `screen/ServicePortal.xml` audience root (D5); proposed `BOSS_SERVICE_PORTAL` group and entity filter sets; token routes `/rma/<token>` and `/fb/<token>` beside the existing `/r/<token>`; thin portal services over proposed `mantle.party.ExternalAccessServices.check#AccessCapability` and `check#AccessToken` | ServicePortal screens | verified account/contact or record/form-bound token; per-request authorization and field/file allowlists, no authorization from route or hidden fields; client status labels and safe results. The Projects client checks in ChatterServices and RecordFilesServices go through the same check. |
| CS-REPORTING | service type | proposed ReportingServices views/read models (including `get#ReturnAnalysis`) | Home, Reports | shared authorized filters, event/episode cohort definitions, as-of/currency/timezone, bounded grouping/export; no synchronous unbounded scanning from Home. |
| CS-PROVIDERS / CX-SHELL | XML Screen element, seed data | existing shell providers and service notification topics (proposed `OrderChangeApproval`, `ReturnExceptionApproval`) | all service screens | palette, Quick create, Today, dashboard, approval hooks, current record context and keyboard bindings; each result carries permitted route and source identity. |
| CS-SETTINGS | data model, service type | organization service policy and versioned publication services | Settings, ServiceDefaults | defaults and readiness validation, including the priority band map and the reopen window; migrate active cases explicitly, preserve historical versions; reference shared branding/profile/retention rather than copy them. |
| CS-JOBS | service type | ServiceJobs: SLA warning and breach scan, auto-close, feedback invitation send and reminder | ServiceLevelPolicies, ServiceDefaults, Feedback, CaseDetail | Each job reads a bounded batch; a case or invitation that fails is logged with its ID and the job goes on with the rest. Auto-close sets `CaseProfile.closedDate` and keeps `ReqCompleted`. Reruns are idempotent by case, episode and invitation. |
| CS-FORM-ELEMENTS | XML Form element | a typed condition builder with a row-list twin, and fields generated from a template version | AssignmentRules, CaseTemplates, NewCase, NewCustomerCase | The condition builder edits allowlisted field, operator and value rows, and the terminal and html modes show the same rows as a plain list. Template fields render from the stored template version's typed field rows, with server-side visibility and required checks. The before/after comparison tables of MergePreview and ChangeImpact are plain `form-list` columns and need no new element. |
| CS-SHARED (existing shared needs) | service type, data model | CX-ACCESS, CX-REQUEST, CX-AVAILABILITY, CX-QUALITY, CX-CREDIT, CX-POSTING, CX-APPROVAL, CX-PRICING, CX-LABELS | shared context sections | implement once in crosscut. Historical stock reporting is Warehouse's proposed `get#InventoryAtDate` under CX-AVAILABILITY (D24); refund orchestration stays the proposed `ironstone.accounting.ReturnSettlementServices.settle#Return`; the one disposition vocabulary is seeded in CX-QUALITY; files on returns need a ReturnContent host. |

## 13. Decided

| Decision | Notes |
| --- | --- |
| Case ownership | A case is Request. Projects keeps the shared RequestDetail definition; Customer Service supplies queue/SLA/channel/claim context. Existing links/intake/Chatter/files/client isolation are reused. |
| Linked work completion | Support resolution requires agent confirmation; shared Request type policy prevents project auto-completion handlers from resolving service cases. Existing Projects policy remains intact. `complete#RequestFromWork` checks the request type: Projects types complete as today and a support case type only notifies the assignee. |
| Case rules on every Request entry point (D23; R-CS-04, R-CS-05) | A service-enabled Request gets its CaseProfile, queue and first SLA episode from a proposed Request create entity ECA rule calling `CaseServices.ensure#CaseProfile`, and every status change and message records an SLA event through a Request status rule and a RequestCommEvent create rule. Both sit beside the existing `RequestTriageNotice` rule. Comms, Commons, Projects and the email and public intake keep calling `create#Request`. Projects and Commons RequestDetail hide Complete and Cancel on a service case unless the user holds `case.resolve`. |
| Status/SLA semantics | Versioned per-workflow category mapping, separate first-response and resolution clocks, auditable pauses and reopened episodes. Customer wait pauses resolution by default; a staff hold does not make an SLA successful. |
| Resolution and CSAT | Completed maps to Resolved; a closed case is Completed with the proposed `CaseProfile.closedDate` set by auto-close (R-CS-24), separate from cancellation, and no Closed status is added. Real outward response fulfills first response; case resolution, RMA completion and financial settlement remain distinct. Default survey is 1–5 plus optional reason/comment, one invitation per eligible resolution episode. |
| Full survey scope | Retain all baseline Survey forms using framework DbForm/FormResponse; start with seeded minimal form. Case-specific links/tokens are new, not a separate survey engine. |
| Portal (D5; R-SB-14) | One suite customer identity/access convention with service routes and shared account/profile facilities. Public knowledge, cases, returns and feedback included; full storefront/catalog/cart/checkout and vendor service desk are outside this design. The pages are under the audience root `screen/ServicePortal.xml`, outside the internal app root, with the proposed `BOSS_SERVICE_PORTAL` group and filter sets on the `BOSS_PROJECT_CLIENT` pattern. Record-bound links are MoquiConf token routes (`/r/<token>` existing; `/rma/<token>`, `/fb/<token>` proposed). One Mantle `ExternalAccessServices` capability service checks every portal read and token; Customer Service's portal services only wrap it. This settles the routing half of the former Open item on public routes; the account half stays open (§14). |
| Order changes (D9, D7; R-CS-02, R-CS-03, R-SB-07, R-SB-08, R-SB-17) | New linked Request type (proposed `RqtOrderChange`) and immutable proposal with explicit approval/application. Canonical pricing, stock, fulfillment, credit and financial rules govern apply; no unrestricted service edit of a posted order. Customer Service applies only two kinds: cancelling an open remainder and substituting on a short pick, which Warehouse executes. Price, quantity increase, date, address, ship method and carrier changes are proposals routed to the order owner (Sales, later). D9 is followed over R-CS-02's handoff scope, which would also have let Customer Service apply pre-pick address and ship-method changes. The order is locked with OrderHold and a proposed OrderHoldReason of type Change, never `OrderBeingChanged`. Between pack and ship, apply calls Accounting's `release#ShipmentDraftInvoice` and `refund#OrderPayment`; a billed delta opens Accounting's InvoiceCorrection; Warehouse releases reservations and puts stock back. Crosscut's OrderDetail row gains the substitution kind. |
| Credit holds (D7; R-SB-09) | Accounting's proposed `evaluate#OrderCredit` runs on `check#OrderPreApprove` and on the manual approve; a Hold places OrderHold with a Credit reason. Customer Service shows the hold and its reason read only, and its own Change reason never releases a Credit reason. |
| Returns | Shared ReturnHeader/Item/Billing plus policy/authorization extension. CS authorizes, Warehouse handles stock/quality, Accounting controls settlement; capabilities allow standalone operation. Partial/repeated credits/refunds share one cumulative ledger of eligibility and stable operation identity. |
| Return services (D11; R-CS-06, R-CS-08, R-SB-02, R-SB-03, R-SB-04) | Customer Service owns `mantle.order.ReturnPolicyServices.authorize#Return`, which settles nothing at approval. The label is Customer Service's Issue return label action over Warehouse's `request#ReturnLabel` adapter. Warehouse owns `receive#ReturnItems`, which replaces the receipt rules and keeps partial receipts creditable. Accounting owns `preview#Return` and `settle#Return`. `receive#ReturnWithoutShipment` is not exposed; a credit without receipt is `settle#Return` with receiptless set, a reason and F plus approve. The customer-facing number is `displayId` plus a proposed `customerReference`; `externalId` stays an integration key. |
| Settlement detail (R-CS-33; R-ACC-28) | The result codes, the fee, tax, currency, rounding and replacement-difference preview lines and the partial-credit rules belong to crosscut §3.18 ReturnSettlement and Accounting AC-02. ReturnDetail's context shows their results and does not define them. |
| Warranty | Proposed Request claim extension with entitlement evidence; customer-owned asset repair uses maintenance-purpose WorkEffort and explicit custody return. Service does not build another manufacturing or stock subsystem. |
| Working hours | Reuse Commons recurring WetAvailable schedules/holidays and editor, bind SLA policy to a retained calendar version. No service-only holiday master. |
| Assignment | Existing users/parties/teams and presence; deterministic typed rules with fallback and schedule/load checks. No separate agent master or identity. |
| Templates and saved actions | Declarative fields/dependencies/actions, server validation and preview; arbitrary scripts are not carried forward. This is the deliberate substitute for Frappe form-script settings. |
| External tools | Email, chat, calls and credentials remain Comms-owned. Scripted bot/CTI configuration is later; existing Comms channels and manual call notes support core service work now. |
| Knowledge (R-CS-12, R-CS-42) | Commons owns authoring/publication. Service adds source selection, feedback and redacted case-to-draft. Private case content is never published automatically. A case's Knowledge tab offers link, Suggest edit (a Commons review request) and Send to customer, as Commons' Customer Service row says; C reads only CustomerArticle, which is the Commons public help-center page plus feedback and Create case. Knowledge sources are internal wiki spaces only, with a language; external search sources are later, and the most-viewed articles are the default when there is no query. |
| Standalone financial/stock actions | Require W/F business capabilities and use common services without other app-root grants. Context alone never authorizes receipt, disposition, invoice credit or refund. |
| Capability groups (D22; R-CS-07) | A, M, D, R, K and S map to the proposed groups `BOSS_CUSTOMER_SERVICE_AGENT`, `_MANAGER`, `_ORDER_DESK`, `_RETURN_AUTHORIZER`, `_KNOWLEDGE` and `_ADMIN`; W is Warehouse's receive and inspect grants plus quality manager; F is `BOSS_ACCOUNTING_AR` to credit and `BOSS_ACCOUNTING_TREASURY` to refund; C is `BOSS_SERVICE_PORTAL`. The names follow the `BOSS_<APP>_<CAPABILITY>` form of the crosscut §1 table with the full app name, not the `BOSS_CS_*` names the review proposed, so no abbreviation enters a name. |
| Existing automation (D1) | For the crosscut §1.3 register. `OrderPlacedAutoApprove` and `OrderPlacedReserveAssets` are kept; credit is checked on `check#OrderPreApprove` (D7). `OrderPlacedSendEmail` and `OrderApprovedSendEmail` are kept and back the resend action. `ReturnApprovedProcess` is conditioned: it keeps `create#ReturnShipment` and no longer runs `process#ReturnItemResponses` (D11). `ShipmentDeliveredReturnReceive` and `ReturnReceivedProcess` are replaced by Warehouse's `receive#ReturnItems` (D11). `ShipmentOutgoingPackedCreateInvoices` is kept (D3); an order change between pack and ship releases its draft invoice first. `AssetStatusAvailableReservations` is kept: a released return is reserved to waiting orders by priority, and a run's output for a customer order goes first to that order (crosscut §3.19). `InvoiceFinalizedSendEmail` is conditioned by Accounting so a store invoice is not sent a second time beside `send#Invoice`. The entity ECA rule `RequestTriageNotice` is kept; the case rules of D23 sit beside it. `complete#RequestFromWork` is conditioned by request type. |
| Saved replies (D24; R-CS-01) | A saved reply is a Comms `EmailTextBlock` (personal by owner, team by the service team's group, global by the root group), so the composer has one library. Customer Service adds only SavedReplyAction rows and a language and variables extension. |
| Stock at date (D24; R-CS-40, R-WH-06) | StockAtDate is Warehouse's report with its service `get#InventoryAtDate`, mounted at `CustomerService/Availability/StockAtDate`. |
| Files on service records (D25) | Cases, order changes and warranty claims keep files on their Request (RequestContent). Returns need the proposed `ReturnContent`. Feedback invitations, article feedback, policies and templates have no Files tab. Activities show on Customer360. |
| Screen names (D27; R-CS-36) | `SlaCompliance` is ServiceLevelCompliance, `SlaPolicies` is ServiceLevelPolicies and `CsatResults` is SatisfactionResults; menu titles keep SLA and CSAT. Proposed entities use the package `mantle.request.support` and `ServiceLevelTarget` replaces the generic `PolicyTarget`. The seeds are `RqtWarranty` and `RqtOrderChange`. |
| Service namespaces (R-CS-35) | `ReturnPolicyServices`, `SlaServices`, `WarrantyServices` and `CaseFeedbackServices` are Mantle services (§12); case orchestration, reports and configuration stay in `ironstone.customerservice`. |
| Menu and paths (R-CS-26) | Cases, Orders, Returns and Availability are menu groups whose lists sit inside them; Availability holds InventoryAvailability, StockAtDate and Product360, matching the existing placeholder. |
| Scope words (R-CS-27) | Scope uses the guide's definitions. CaseDetail, CustomerCase, NewCase and NewCustomerCase are `parity`, because Request/EditRequest, MyAccount EditRequest and the two NewRequestForm baselines map to them. |
| Auto-close (R-CS-24) | Auto-close keeps `ReqCompleted`, sets the proposed `CaseProfile.closedDate`, and after that a reply makes a linked follow-up case. The SLA scan, auto-close and invitation timers are CS-JOBS. |
| Case tags (R-CS-16) | Tags are proposed `mantle.request.RequestTag` rows over an EnumerationType `RequestTag`. |
| Due date and channel (R-CS-15) | `Request.responseRequiredDate` mirrors the current resolution due date and only SlaServices writes it. The channel is `Request.salesChannelEnumId`, with a proposed `ScChat` seed. |
| Priority bands (R-CS-19) | `Request.priority` stays 1–9; ServiceDefaults maps it to Urgent, High, Normal and Low bands, CaseTypes gives each type a default band and SLA targets name bands. |
| Intake channels (R-CS-37, R-CS-20, R-CS-11) | ChannelRouting extends the Comms mail rule `ErActCreateRequest`, the organization's ProjIntake settings and a queue-level holder for the public-form token, instead of a new route table. Auto-generated mail is ignored or attached only and never acknowledged. A Forum topic escalation route and CaseDetail's Reply publicly in forum own the Customer Service side of PASS `I.create#CaseFromTopic` and `I.publish#CaseReply`. |
| Disposition words (R-CS-34) | Inspection disposition uses the one CX-QUALITY vocabulary: Release, Quarantine, Rework or repair, Return to customer, Return to supplier, Scrap, Use as is. |
| Shared mounts added (R-CS-38) | WorkItemDetail at `CustomerService/Cases/WorkItemDetail` and Approvals at `CustomerService/Approvals`, with the proposed topics `OrderChangeApproval` and `ReturnExceptionApproval`. |
| Recent cases and returns analysis (R-CS-17, R-CS-23) | CaseDetail shows Recent cases, which NewCase's duplicate warning reuses; ReturnAnalysis reports returns by reason, product, disposition and credited amount. Time logged on a case through Projects time services is later (R-CS-22). |
| Shared-screen rows (D28; R-XC-15; R-CS-09, R-CS-13, R-CS-14, R-CS-32) | Settled in crosscut §3 on Oct 28, 2026: §3.2 Customer360 has the CustomerServiceStatistics display and the ServiceAgreements form with the Customer Service tabs, §3.1 and Commons ContactDetail have the Customer Service row, §3.12 WorkItemDetail has the Customer Service row, and design-projects §6 notes the external Customer Service row. The Context passed blocks here follow those rows. |
| Survey builder owner (decided Oct 28, 2026; R-CS-41) | Commons owns one survey builder over framework DbForm and FormResponse, and Customer Service, Marketing and People mount it. FeedbackForms and FeedbackFormDetail are the Customer Service mount; until the Commons screens are designed they carry the form summaries here. Case feedback is one use of the builder: the case invitation, the response link and the version policy stay Customer Service's (CS-FEEDBACK). |
| Scope and validation | Documentation only; no application build required. Check Markdown links/tables, source names and active/commented definitions, research/inventory mappings and cross-app scenarios. |

## 14. Open

These are product-policy choices for review, not unresolved ownership or conflicting transaction contracts. Recommended defaults make the design implementable; final values should be selected during implementation/configuration. The former item "Public service routes and branding" is settled by D5 for routing and moved to §13 Portal; its account half is the item on customer accounts below.

| Review item | Recommended answer | Effect |
| --- | --- | --- |
| SLA policy precedence for overlapping agreement/customer/queue rules | Most-specific customer agreement, then customer policy, queue/type policy, organization default; reject equally ranked overlapping published rules. Bind the chosen policy version to the episode at intake, so a later publish does not re-select it | deterministic policy preview and explainable deadlines |
| Reopen window and late reply behavior | Allow customer reopen for 14 days after resolution, set as the ServiceDefaults reopen-window field rather than a constant; thereafter, or once auto-close has set the closed date, create a follow-up case linked by the proposed CaseRelation "follow-up" (CS-MERGE), not a free `RequestRecord`. `ReqCancelled` has no outgoing transition, so a cancelled case can only be followed up | keeps old metrics stable while allowing help |
| Merge obligations from differing policies | Preserve source SLA evidence and outstanding deadlines as obligations on survivor; do not retroactively select the more lenient policy | requires explicit event/read model in CS-MERGE/SLA |
| Warranty entitlement evidence hierarchy (also in crosscut §9) | Contract/agreement version first, then product warranty effective at sale, then explicit goodwill decision. The second tier needs a coverage basis that does not exist yet: add a WarrantyLookup to WarrantyAssessment that traces a serial or lot through AssetIssuance to its order, customer and ship date, takes the term from the product's `PftWarranty` ProductFeature (`numberSpecified` with `numberUomId`, in months), and computes the coverage end as the ship or delivery date plus the term, showing its source; a manual override needs a reason. Products owns editing the `PftWarranty` feature on Product360; the lookup goes into CS-WARRANTY, scope `new` | needs coordinated Maintenance terms review, no duplicate repair record |
| Chargeable repair and intervention reports (also in crosscut §9) | An out-of-warranty repair creates a linked sales quote (Sales, or the shared OrderDetail) from the WarrantyDecision charge estimate, linked by `RequestRecord`. An on-site intervention report (time, parts, customer signature) is a Maintenance work-order output on a `WepMaintenance` WorkEffort, decided with design-maintenance. Mantle basis: `WepMaintenance`, `AssetIssuance.assetMaintenanceId`, OrderHeader | repair charges get an owner without a service-local billing record |
| Return authorization validity and restock fees | Organization-configurable window; display zero fee unless an applicable published rule explicitly supplies one, and preview tax/refund impact before approval. With no matching policy, the window is manual review, as policy selection already is | prevents invented deductions and unclear customer commitments |
| Feedback privacy/retention | Keep comments private to authorized service management and customer-authorized follow-up; use shared retention policy, with de-identified aggregates when legally permitted. `update#FormResponse` and `delete#FormResponse` refuse invitation-linked rows (CS-FEEDBACK) | no public agent leaderboard or automatic comment publication |
| Customer accounts and PASS public accounts (also in crosscut §9) | Record-bound pages use token routes as decided (D5). Decide now that a signed-in customer contact is the same identity PASS public accounts will use, which crosscut §5.1 assigns to future PASS Commerce, so ServicePortal does not become a third identity surface; preserve stable service URLs when Commerce is added | one identity and access model across the support portal and the future storefront |
| Who is viewing or typing on a case (also in crosscut §9) | Add a proposed framework need, a record viewers topic on the notification WebSocket: viewer avatars on CaseDetail and a warning before Send when another agent is composing a reply to the same case (Frappe ticket viewers and typing). Commons presence stays user status only | two agents do not answer the same customer at once |
