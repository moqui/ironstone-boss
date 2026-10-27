# IronStone BOSS — Customer Service design

Oct 27, 2026 — draft

This design is for support agents, order-desk staff, service managers and customer contacts. It covers case intake through resolution, order enquiries and controlled changes, customer returns, warranty coordination, knowledge and feedback. It specifies screens and proposed extensions; it does not implement them. A business can use Customer Service on its own by granting the required business capabilities to its staff.

Inputs: [research-customer-service.md](research-customer-service.md), [design-doc-guide.md](design-doc-guide.md), [ss-inventory.md](ss-inventory.md), [usl-inventory.md](usl-inventory.md), [style-guide.md](style-guide.md), [initial-design.md](initial-design.md), [design-crosscut.md](design-crosscut.md), [Commons](design-drawers-commons.md), [Projects §6](design-projects.md#6-requests), [Products](design-products.md), [Warehouse](design-warehouse.md) and [Accounting](design-accounting.md). Crosscut is authoritative for shared record screens and cross-app transactions.

Sections: [1 shell](#1-shell) · [2 screens](#2-screens) · [3 cases](#3-cases) · [4 customers-and-orders](#4-customers-and-orders) · [5 returns](#5-returns-and-warranty) · [6 availability-and-knowledge](#6-availability-and-knowledge) · [7 reports](#7-reports) · [8 customer-access](#8-customer-access) · [9 settings](#9-settings) · [10 coverage](#10-baseline-and-research-coverage) · [11 outputs](#11-documents-and-outputs) · [12 needs](#12-framework-and-data-needs) · [13 decisions](#13-decided) · [14 open](#14-open).

## 1. Shell

Existing root scaffold `CustomerService`, title **Customer Service**, icon `sym_o_support_agent`; its `BOSS_CUSTOMER_SERVICE` grant is currently commented out and must be enabled with the implemented screens. Root entry is a navigation grant, not authority to read or change every case, order, return or financial record. `mantle.party.PartyServices.setup#UserOrganizationInfo` supplies the same organization context as the existing roots. The root requires an organization; the UI displays it and preserves it through every shared-screen link.

The navigation has Home; Cases (Cases, Channels); Customers; Orders (Orders, Change requests); Returns (Returns, Warranty); Availability; Knowledge; Reports; Settings. Detail screens are reached from records, not permanent menu entries. Cases defaults to Assigned to me; managers can choose New/unassigned as their personal default. Home is the root landing. Depth remains two; long settings lists use a settings landing and links.

Role shorthand used below: **A** service agent; **M** service manager; **D** order-desk operator; **R** return authorizer; **W** stock/quality capability; **F** financial settlement capability; **K** knowledge author; **S** service administrator; **C** customer contact. These are proposed capability bundles over existing users, groups and organization membership, not separate agent accounts. Sensitive capabilities include `case.manageTeam`, `case.merge`, `order.change.approve`, `order.change.apply`, `return.authorize`, `stock.receive`, `quality.dispose`, `invoice.credit`, `payment.refund`, `case.feedback.read` and `service.configure`; services check the underlying record and organization as well as the action. Read-only tabs do not imply mutation rights. Customer membership and contact access are checked server-side for every result and action, including searches and attachments.

**Shell providers.** Register New case and Request return in Quick create; permitted cases, customers, orders and RMAs in the command palette; own due/overdue cases in Today; approvals in the existing Commons Approvals center; notifications for assignment, SLA warning/breach, customer reply, return decision and feedback. Use the existing Assist context, Chatter, files, presence, preferences and key-map conventions. Providers return the permitted record URL, not an app-root permission shortcut. A new case from an order, chat or message preserves a `RequestRecord` link and the original communication reference.

**Interaction contract.** XML forms are the default. Saved finds, select-columns, date-periods, accessible statuses and list/board switching follow the style guide. Every board move has an equivalent row action and confirms the same transition; bulk operations report success or a named failure per case, preserving successful independent items. Browser keyboard shortcuts supplement visible controls. Terminal users get searchable lists, numbered actions, plain-text conversation and explicit confirmations; they never need drag/drop, hover or rich-text composition. Phone layouts stack the case sidebar beneath facts and retain an explicit Send button. Stock receipt and quality actions mount the Warehouse handheld forms, with scan/manual-entry equivalence and no offline posting.

**Current-source boundary.** The active Shared RequestDetail, RequestRecord and WorkEffortRecord links, email/public intake, Chatter, client audience isolation and working-hours calendars were added after parts of the research. They are reused. The case queue/SLA policy, service-specific authorization, merge/split, saved reply actions, return policy, controlled order-change and feedback association described here are proposed. Existing `ReqDraft`, `ReqSubmitted`, `ReqReviewed`, `ReqInProgress`, `ReqCompleted`, `ReqCancelled` remain valid; `ReqWaitingCustomer` and `ReqOnHold` below are proposed seeds, not current statuses. The inventory service can report that its projection is not ready; the UI must not turn an unavailable projection into zero availability or a promise.

## 2. Screens

All internal paths are under `CustomerService/`; `ServicePortal/` names the shared external route group. `parity` means baseline capability carried forward, including improved presentation; `new` needs a new service capability; `later` is a deliberately deferred research surface. Shared rows reference their single definition; detail sections provide context only. Public pages use the common external-access contract and do not require the internal root grant.

| Screen | Path | Archetype | Impl | Purpose | Main record | Reused | Roles | Scope | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Home | CustomerService/Home | landing | xml | Work and service health | Request | own | A,M,D,R | new | organization, own/team scope |
| Cases | CustomerService/Cases | list | xml | Saved queues and triage | Request | own | A,M | parity | service request types |
| NewCase | CustomerService/Cases/NewCase | wizard | xml | Intake with suggestions and template | Request | own | A,D | new | customer/record optional |
| CaseDetail | CustomerService/Cases/CaseDetail | detail | xml | Resolve a support case | Request | Projects RequestDetail / CX §3.11 | A,M,D,R | new | CustomerService case policy |
| MergeCases | CustomerService/Cases/MergeCases | wizard | xml | Deduplicate related cases | Request | own | M | new | same organization/customer |
| SplitCase | CustomerService/Cases/SplitCase | wizard | xml | Separate issues with evidence | Request | own | A,M | new | source case |
| ChannelSessions | CustomerService/Cases/ChannelSessions | list | xml | Call/chat history and intake | CommunicationEvent | own | A,M | new | permitted service channels |
| Customers | CustomerService/Customers | list | xml | Find service customers | Party | own | A,D,R | parity | organization relationships |
| Customer360 | CustomerService/Customers/Customer360 | 360 | xml | Customer service context | Party | CX §3.2 | A,D,R | parity | service tabs |
| ContactDetail | CustomerService/Customers/ContactDetail | detail | xml | Customer contact | Party | Commons contact record / CX §3.1 | A,D | parity | permitted contact |
| Orders | CustomerService/Orders | list | xml | Quick and advanced lookup | OrderHeader | own | A,D | parity | sales orders |
| OrderDetail | CustomerService/Orders/OrderDetail | detail | xml | Enquiry and service actions | OrderHeader | CX §3.6 | A,D,R | parity | customer sales order |
| OrderChanges | CustomerService/Orders/OrderChanges | list | xml | Proposed changes and approvals | Request | own | D,M | new | order-change type |
| OrderChangeDetail | CustomerService/Orders/OrderChangeDetail | task | xml | Compare, approve and apply | Request + proposed OrderChange | own | D,M | new | source order revision |
| ShipmentDetail | CustomerService/Orders/ShipmentDetail | detail | xml | Tracking and delivery evidence | Shipment | CX §3.8 | A,D | parity | tracking/read |
| InvoiceDetail | CustomerService/Orders/InvoiceDetail | detail | xml | Explain bill, credit and payment | Invoice | CX §3.16 | A,D,F | parity | permitted financial summary |
| Returns | CustomerService/Returns | list | xml | RMA queue and exceptions | ReturnHeader | own | A,R,M | parity | customer returns |
| NewReturn | CustomerService/Returns/NewReturn | wizard | xml | Select returnable source lines | ReturnHeader | own | A,R | parity | order and optional case |
| ReturnDetail | CustomerService/Returns/ReturnDetail | detail | xml | Authorize and follow resolution | ReturnHeader | CX §3.18 | A,R,W,F | parity | customer return |
| QualityInspection | CustomerService/Returns/QualityInspection | task | xml | Inspect returned goods | proposed inspection | CX §3.19 | A,W | new | read; dispose by capability |
| WarrantyClaims | CustomerService/Returns/WarrantyClaims | list | xml | Warranty claim queue | Request | own | A,M | new | warranty type |
| WarrantyAssessment | CustomerService/Returns/WarrantyAssessment | task | xml | Assess coverage and coordinate repair | Request + proposed WarrantyClaim | own | A,M | new | case/asset/sale |
| InventoryAvailability | CustomerService/InventoryAvailability | list | xml | Availability and incoming supply | Product/Asset | CX §3.7 | A,D | parity | read, allowed facilities |
| StockAtDate | CustomerService/StockAtDate | report | xml | Explain historical stock | AssetDetail | own | A,D | new | product/facility/date |
| Product360 | CustomerService/Product360 | 360 | xml | Explain product/variant | Product | CX §3.5 | A,D | parity | service tabs |
| Knowledge | CustomerService/Knowledge | editor | qvue | Search, read and maintain articles | WikiPage | Commons Knowledge | A,K,C | parity | service spaces; published for C |
| ArticleFeedback | CustomerService/Knowledge/ArticleFeedback | list | xml | Review unsuccessful answers | proposed article feedback | own | K,M | new | permitted spaces |
| CaseToArticle | CustomerService/Knowledge/CaseToArticle | wizard | xml | Draft reusable answer | WikiPage/Request | own | A,K | new | case + target space |
| Reports | CustomerService/Reports | landing | xml | Service report catalogue | Request | own | A,M | new | report permission |
| SlaCompliance | CustomerService/Reports/SlaCompliance | report | xml | Breaches and policy performance | proposed SLA episodes | own | M | new | queue/policy/period |
| ResponseTimes | CustomerService/Reports/ResponseTimes | report | xml | First response and resolution | proposed SLA episodes | own | M | new | working and elapsed time |
| CaseVolumes | CustomerService/Reports/CaseVolumes | report | xml | Demand, backlog and workloads | Request | own | M | new | channel/type/team |
| CsatResults | CustomerService/Reports/CsatResults | report | xml | Survey responses and trends | FormResponse | own | M | parity | case-linked forms |
| ResponseDetail | CustomerService/Reports/ResponseDetail | detail | xml | Inspect feedback | FormResponse | own | M | parity | case visibility/redaction |
| CaseAnalytics | CustomerService/Reports/CaseAnalytics | report | xml | Explain one case's measurements | Request/SLA events | own | A,M | new | case |
| SupportHome | ServicePortal/SupportHome | landing | xml | Search first and find support | WikiPage | own | C,public | new | published content |
| MyCases | ServicePortal/MyCases | list | xml | Customer's permitted cases | Request | own | C | parity | verified contact scope |
| NewCustomerCase | ServicePortal/NewCustomerCase | wizard | xml | Customer intake | Request | NewCase (§3) | C,token | new | offered fields only |
| CustomerCase | ServicePortal/CustomerCase | detail | xml | Safe case conversation | Request | Projects RequestDetail / CX §3.11 | C | new | external case context |
| MyReturns | ServicePortal/MyReturns | list | xml | Customer's return requests | ReturnHeader | own | C | new | permitted customer |
| RequestReturn | ServicePortal/RequestReturn | wizard | xml | Ask to return eligible goods | ReturnHeader | NewReturn (§5) | C | new | policy-limited quantities |
| CustomerReturn | ServicePortal/CustomerReturn | detail | xml | Authorization and return progress | ReturnHeader | CX §3.18 | C | new | external customer context |
| CustomerArticle | ServicePortal/CustomerArticle | detail | qvue | Published help and feedback | WikiPage | Commons Knowledge | C,public | parity | published service space |
| Feedback | ServicePortal/Feedback | task | xml | Submit CSAT once per invitation | FormResponse | own | invitation holder | new | scoped signed token |
| Settings | CustomerService/Settings | settings | xml | Configuration index | — | own | S | new | organization |
| Queues | CustomerService/Settings/Queues | settings | xml | Categories, teams and visibility | RequestCategory | own | S,M | new | organization |
| AgentTeams | CustomerService/Settings/AgentTeams | settings | xml | Service team participation | Party/UserAccount | own | S,M | new | existing identities |
| AssignmentRules | CustomerService/Settings/AssignmentRules | settings | xml | Deterministic routing | proposed rule | own | S | new | queue |
| SlaPolicies | CustomerService/Settings/SlaPolicies | settings | xml | SLA targets and calendar bindings | proposed policy | own | S | new | organization |
| StatusCategories | CustomerService/Settings/StatusCategories | settings | xml | Case workflow semantics | StatusItem + proposed mapping | own | S | new | service workflows only |
| CaseTypes | CustomerService/Settings/CaseTypes | settings | xml | Offered request types | Enumeration | own | S | parity | service type policy |
| CaseTemplates | CustomerService/Settings/CaseTemplates | settings | xml | Intake templates and dependencies | proposed template | own | S | new | type/queue |
| SavedReplies | CustomerService/Settings/SavedReplies | settings | xml | Messages and explicit actions | proposed saved reply | own | A,S | new | personal/team/global |
| ChannelRouting | CustomerService/Settings/ChannelRouting | settings | xml | Mail/chat intake mapping | existing mail settings + proposed route | own | S | new | organization/channel |
| ReturnPolicies | CustomerService/Settings/ReturnPolicies | settings | xml | Return window and authority | proposed policy/ReturnReason | own | S,R | new | customer/store |
| KnowledgeSources | CustomerService/Settings/KnowledgeSources | settings | xml | Permitted service knowledge | WikiSpace | own | S,K | new | audience |
| FeedbackForms | CustomerService/Settings/FeedbackForms | list | xml | Reusable feedback definitions | DbForm | own | S | parity | service purpose |
| FeedbackFormDetail | CustomerService/Settings/FeedbackFormDetail | editor | xml | Form fields and preview | DbForm | own | S | parity | immutable published version |
| ServiceDefaults | CustomerService/Settings/ServiceDefaults | settings | xml | Intake and resolution defaults | proposed service policy | own | S | new | organization |
| ChannelAutomation | CustomerService/Settings/ChannelAutomation | settings | xml | Scripted chat and CTI adapters | proposed channel rule | own | S | later | Comms-owned integration |

The last row is a specified deferred surface, not a prerequisite for cases, call notes, chat-linked intake or email. Related-record links may open a permitted shared mount in this app even when the destination app root is not granted.

## 3. Cases

### Home

**Layout.** KPI strip above My cases, Team queues and Returns awaiting approval. Counts use the same access filter and saved-find definitions as Cases/Returns. Open, overdue, unassigned, SLA compliance, first response, resolution and CSAT show period, denominator and timestamp; absent SLA/feedback data is “Not configured”/“No responses”, never zero performance.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ServiceMetrics | read | Service health and drill-down | period, queue, open/overdue/unassigned, SLA %, response/resolution, CSAT count/score | shared dashboard cards; tabular terminal view | proposed `ironstone.customerservice.ReportingServices.get#ServiceDashboard` | Frappe `helpdesk/api/dashboard.py`; baseline FindRequest filters |
| MyCases | list | Next work | id, name, customer, priority, due, assignee, last customer reply | saved finds | proposed `CaseServices.find#Cases` | `Request/FindRequest` `ListRequests` |
| TeamQueues | list | Choose a queue | team, queue, open, unassigned, breached | drill-down links | proposed `CaseServices.get#QueueCounts` | Frappe `Tickets.vue` |
| AwaitingReturns | list | Approvals due | return, customer, requested, expiry, exception | existing approvals link | proposed `ReturnPolicyServices.find#ReturnApprovals` | `Return/FindReturn` `ReturnHeaderList` |

**Actions.** Open the filtered queue; new case; request return. Counts expose no hidden customer names. **Devices.** Phone cards collapse to labels and links. **Source.** Research §2 and §13 Home; [R1](#reference-files). **Needs.** CS-QUEUE, CS-SLA, CS-PROVIDERS.

### Cases

**Layout.** Saved views Assigned to me, New/unassigned, Waiting for customer, Needs response, SLA risk, Recently resolved and All permitted. Team and organization remain visible. Status board groups by configured case status, not raw lexicographic status ID; empty columns show counts. Board is another view of the same filtered list.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| CaseFind | find | Narrow permitted queue | text/id, customer, type, category/queue, status/category, priority, assignee/team, channel, due/created periods, tags | saved-finds, date-period, Not filters | proposed `CaseServices.find#Cases` | `Request/FindRequest` `ListRequests`; Frappe Tickets |
| CaseList | list/board | Triage | id/name, customer, SLA clocks, unread/customer reply, team, priority, status, channel | select-columns; row action equivalent to board move | same proposed read | same baseline |
| BulkCaseAction | dialog | Assign, set status, add reply | selected case IDs, operation, assignee/status, resolution/pause reason, reply template/text, notify, idempotency key | preview affected/forbidden rows | proposed `CaseServices.apply#CaseBatch`; shared Request update/assignment/message services | Frappe ticket bulk actions; existing Projects independent request batches |

Bulk reply previews recipients per case; no cross-customer thread or exposed address list. Each case transaction validates visibility and current status independently, returns case ID plus outcome such as `StaleCase`, `AssigneeUnavailable`, `Forbidden`, `ReplyDeliveryPending`. A queued outbound message is visibly pending; delivery failure is retried by its stable message ID, not by creating another reply. Restricted batch rows do not abort authorized independent rows or reveal hidden data. **Source.** Research §3–4; [R1](#reference-files). **Needs.** CS-QUEUE, CS-SLA, CS-REPLIES, CX-REQUEST.

### NewCase

**Layout.** Three small steps: identify customer/type and search; details/template; review and submit. Search suggestions do not block submission. Agent can create for an existing permitted customer or a verified contact; creating an organization/account itself stays in the shared customer/contact forms. Public/unknown senders enter the existing intake review path, never gain organization membership automatically.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| CaseIdentity | single | Identify need and customer | customer/contact, type, category, subject, source record, channel, template | server-search; KB suggestions | proposed `CaseServices.prepare#Case`; permitted entity reads | `Request/FindRequest` `NewRequestForm`; Frappe `TicketNew.vue` |
| CaseDescription | single | Capture request | description, priority, product/serial, order, contact email, permitted template fields, files | Markdown with plain-text terminal entry; dynamic XML fields | proposed `CaseServices.validate#CaseTemplate` | same baseline; Frappe template fields |
| SubmitCase | single | Confirm audience and create | summary, customer-visible text, internal note (agents only), queue, assignee, consent where required, request key | explicit Submit | proposed `CaseServices.create#Case` wrapping `mantle.request.RequestServices.create#Request`, `replace#RequestParty`, `link#RequestRecord`; existing `create#IntakeRequest` for token route | existing RequestIntake and Projects request creation |

Create Request, permitted links, initial SLA episode and queue assignment atomically; attachment upload may be pending and is named separately. Existing public intake settings currently target projects: extend the same mechanism with a service queue/type destination; do not manufacture a project for every service case. **States.** Duplicate warning offers open existing or submit distinct; it never discloses another customer's case. **Source.** Research §3/9/12 and [R1](#reference-files). **Needs.** CS-QUEUE, CS-TEMPLATES, CS-SLA, CX-REQUEST, CX-ACCESS.

### CaseDetail

**Context passed** to [Projects RequestDetail](design-projects.md#requestdetail-sharedrequestdetail) through [crosscut §3.11](design-crosscut.md#311-requestdetail): mount `CustomerService/Cases/CaseDetail`; requestId and organization; service request-type policy and verified customer/team scope. Tabs: Conversation first, Overview/people, linked orders/returns/shipments/invoices/articles, SLA/analytics, Work, Files; Items only when present. Customer, status, priority, queue/team and assignee remain visible beside first-response/resolution clocks. Filters distinguish external email/chat/call activity from internal notes. Use existing RequestCommEvent/RequestEmailMessage and active RequestRecord, not a parallel case record.

Action set: send/reply, log note/call, saved reply preview, assign, change priority/queue, pause/resume with reason, resolve with resolution/message, reopen, link/unlink permitted records, make/link work, request order change/RMA/warranty assessment, link/suggest article, merge/split (by capability). Request CRUD, parties, notes/files and links remain shared services; proposed `CaseServices.transition#Case`, `SlaServices.record#CaseEvent` and guarded reply actions add service behavior. Sent external replies fulfill first response; automatic acknowledgements, internal notes and failed sends do not. The UI shows awaiting delivery until the chosen channel accepts the actual response. Merge/split and order/return actions open the own screens below.

A support case linked to completed work stays open until an agent confirms resolution. Extend the shared Request completion policy by request type/context; existing Projects auto-completion remains unchanged. Closing/cancelling a linked task notifies the case agent and never independently resolves the customer's complaint, closes an RMA or satisfies SLA. For Cases the existing `complete#RequestFromWork` path must consult that policy before changing status, including entity-rule invocations outside this screen. Service resolution can require all obligatory linked work or an explicitly authorized waiver, without conflating a resolved case with settled stock/finance.

### MergeCases

**Layout.** Select target, compare scope and preserved evidence, confirm. No destructive delete. Same customer and organization are required; cross-customer “duplicates” are linked as related knowledge only. Merged source becomes non-actionable with a redirect retaining permission checks; unique messages/files are referenced without changing their original audience or timestamps.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| MergeSelection | single | Choose survivor | source IDs, target ID, reason | permitted case search | proposed `CaseServices.preview#MergeCases` | Frappe `TicketMergeModal.vue` |
| MergePreview | read | Reveal consequences | subjects, customer, queue, participants, SLA history, messages/work/links, conflicting returns/changes | comparison table | same proposed preview | same reference |
| MergeConfirm | single | Preserve provenance | target, source versions, reason, notify, operation key | explicit confirmation | proposed `CaseServices.merge#Cases` | same reference |

Target retains its original clock; transferred outstanding issues keep source obligation/breach provenance rather than resetting elapsed time. Do not merge financial or stock documents. Revalidation locks all selected cases; an invalid source makes this one merge atomic and fails with its ID. Independent merges in a batch remain independent. **Source.** Research §3; [R2](#reference-files). **Needs.** CS-MERGE, CS-SLA.

### SplitCase

**Layout.** Select messages/issues, preview new case and visibility, confirm. Source remains open unless separately resolved. Evidence remains traceable on the source; transfer a customer-visible message only to a case that the same customer may read.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| SplitSelection | list | Select evidence | source, message IDs, included files/links, existing work | audience badges | proposed `CaseServices.preview#SplitCase` | Frappe `TicketSplitModal.vue` |
| SplitNewCase | single | Describe separate issue | new subject, type, category, priority, assignee, description, source relation, notify, operation key | NewCase fields | proposed `CaseServices.split#Case` | same reference and NewCase |

Initial SLA start is the original receipt of the selected issue where determinable; otherwise manager records reason for chosen start. Creating a new case cannot erase the original breach. Files/links are re-authorized, never copied wholesale across audiences. **Source.** Research §3; [R2](#reference-files). **Needs.** CS-MERGE, CS-SLA.

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
| CustomerList | list | Select customer | name, primary contact, open cases/returns, recent order, permitted credit hold summary | record links | same proposed read | `Customer/FindCustomer` `CustomerListForm`, `CustomerData` `CustomerDataList` |

Create contact/person/organization/account opens the shared Customer360/contact action with its separate permission and original baseline fields. Duplicate contact resolution precedes account invitation. **Source.** Research §5, baseline Customer. **Needs.** CX-ACCESS, CS-QUEUE.

### Customer360

**Context passed** to [crosscut §3.2](design-crosscut.md#32-customer360): mount `CustomerService/Customers/Customer360`, customerPartyId and organization. Show Overview/contacts, Cases, Returns, Orders/shipments, service agreements/coverage, service metrics/CSAT, and permitted billing summary. Default emphasis is unresolved cases, promised follow-ups, approved returns and last outward communication. Actions: new case/return/order-change request, reply, add permitted contact, link agreement or article; billing and credit decisions require F and remain Accounting-owned. Prices/costs, unrelated customer contacts and internal accounting notes are excluded unless separately authorized. Proposed CustomerCreditPolicy/CreditHoldDecision facts may explain an order hold without granting override. Service agreements use existing agreement relationships; warranty entitlement decisions are in WarrantyAssessment.

### ContactDetail

**Context passed** to [crosscut §3.1](design-crosscut.md#31-contact-record) and the Commons contact record: customer contact and permitted organization; Contact, communication, authorized roles and consent tabs. Agent may maintain contact channels under party permissions. Service access invitations and organization membership require the common external-access administrator capability; discovering an email on a case is not sufficient authority to invite it into an account.

### Orders

**Layout.** Quick lookup above result list; advanced find expands. Results summarize fulfillment and payment state without copying the full order editor.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| OrderLookup | find | Locate an order | order/display/external ID, customer, email, phone, product, date period | exact quick lookup then permitted fuzzy results | proposed `CaseServices.find#ServiceOrders` over OrderHeader/party/contact reads | baseline `Order/FindOrder` and shared OrderDetail; ERPNext sales order |
| OrderResults | list | Choose record | order, customer, ordered date, total/currency, order/fulfillment/payment states, next delivery | select-columns; tracking links | same proposed read; shared order display services | same baseline |

Actions open OrderDetail, new linked case or new return. Unauthorized IDs and missing IDs use the same safe result. **Source.** Research §6 and [R4](#reference-files). **Needs.** CX-ACCESS, CS-ORDER-CHANGE.

### OrderDetail

**Context passed** to [crosscut §3.6](design-crosscut.md#36-orderdetail): mount `CustomerService/Orders/OrderDetail`; organization, sales-order ID and customer scope. Tabs: Items/prices, fulfillment/reservations, shipment/tracking, invoices/payments summary, related cases/changes/returns and conversation. Actions: new linked case, create return, propose change/cancellation, resend original confirmation after recipient check. A asks; D can propose; approval/apply are separate capabilities. No implicit direct quantity/address/price edits after submission. Resend records recipient, original document version and delivery result. Reservation or substitution decisions link to Warehouse/Product contexts; application revalidates them. Credit hold facts remain Accounting's policy result.

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
| ChangeProposal | single + lines | Propose controlled delta | requestId, orderId, organizationPartyId, expectedOrderRevision, proposalVersion, reason, requestedBy, requestedAt, changeKind; lines: orderItemSeqId, action, proposedProductId, proposedQuantity, quantityUomId, proposedUnitPrice, currencyUomId, proposedShipDate; optional addressContactMechId, shipmentMethodEnumId, carrierPartyId, cancellationReason; customerConsentRef, attachmentRefs | permitted source-line selector; units and pricing explanation | proposed `OrderChangeServices.save#OrderChange` | new; fields grounded in OrderHeader/OrderPart/OrderItem |
| ChangeImpact | read | Reprice/recheck consequences | before/after, reservations/issued/shipped/billed quantities, substitution evidence, repricing/tax/freight, payment/credit impact, conflicts, previewVersion | diff table; explicit blocked reasons | proposed `OrderChangeServices.preview#OrderChange` using canonical pricing/stock/financial contracts | Odoo sale order controls; shared OrderDetail |
| ChangeDecision | single | Approve or reject exact proposal | proposalVersion, decision, reason, approver, approvedAt, expiresAt | shared approval entry; no self-approval where policy requires separation | proposed `OrderChangeServices.decide#OrderChange` | Commons Approvals pattern |
| ApplyChange | single | Commit approved delta | proposalVersion, expectedOrderRevision, previewVersion, operationKey, confirmation | explicit Apply | proposed `OrderChangeServices.apply#OrderChange` over existing OrderServices and canonical reservation/accounting services | new guarded orchestration |

Apply locks the source order and relevant allocations; validates approval, revision, current stock, shipped/billed/paid quantities, pricing version and permissions again. Use existing `OrderBeingChanged` only through the current Order lifecycle where legal, not a back door around shipment/invoice invariants. A shipped item becomes a return/replacement, an already billed amount needs Accounting adjustment, and posted entries never disappear. Cancellation releases only eligible reservations/demand; it leaves fulfillment and financial reversals as explicit related work. Substitution requires compatible product/unit and customer consent and reruns pricing/availability. Closed financial period returns `ClosedPeriod` with Accounting action link, not silent backdating. Failures `StaleOrder`, `StockChanged`, `AlreadyShipped`, `BillingConflict`, `ApprovalExpired`, `Forbidden` leave the order unchanged. A separate notification failure leaves Applied with delivery pending, not a second application. Terminal uses the same before/after table and confirmation.

**Source.** Research §6/13; active OrderEntities/OrderServices; [R4](#reference-files). **Needs.** CS-ORDER-CHANGE, CX-PRICING, CX-AVAILABILITY, CX-POSTING, CX-ACCESS.

### ShipmentDetail

**Context passed** to [crosscut §3.8](design-crosscut.md#38-shipmentdetail): mount `CustomerService/Orders/ShipmentDetail`; permitted customer/order and organization. Tracking, package contents, delivery exceptions and customer-safe proof; actions copy permitted tracking link, send update and open linked case/return. No pick/pack/ship mutation from a service role alone. W can open the common task with its facility capability even without a Warehouse root grant.

### InvoiceDetail

**Context passed** to [crosscut §3.16](design-crosscut.md#316-invoicedetail): mount `CustomerService/Orders/InvoiceDetail`; customer/order/return and organization. Read issued lines, due/balance, applied payments and credit references, excluding bank secrets and internal ledger detail. A can explain/send an allowed document; F follows the shared ReturnDetail settlement action for an RMA. A non-return invoice correction uses the separately authorized financial action context. All posting/period/refund controls remain Accounting's; the case holds a link, never its own settlement totals.

## 5. Returns and warranty

### Returns

**Layout.** Customer-return list with views Requested, Awaiting authorization, Authorized/awaiting goods, Received/awaiting disposition, Settlement pending, Expiring and Closed. Direction is fixed to customer returns; supplier returns are linked for recovery and open the authorized Purchasing/Warehouse context.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ReturnFind | find | Find an RMA | return/order/customer, status, assignee, entry/expiry period, reason, settlement/receipt exception | saved finds | permitted ReturnHeader reads plus proposed `ReturnPolicyServices.find#ServiceReturns` | `Return/FindReturn` `ReturnHeaderList` |
| ReturnList | list | Follow promises | return, customer reference, order, assignee, authorization expiry, authorized/received/accepted/credited quantities, status | distinct physical/financial chips | `mantle.order.ReturnServices.get#ReturnDisplayInfo` plus proposed policy reads | same baseline; Carbon RMA list |

Authorize and cancel are row actions on shared ReturnDetail after preview; independent selected returns may be submitted as separate transactions with named results. Never mark all returned items “done” merely because the case is resolved. **Source.** Research §7; [R3](#reference-files). **Needs.** CX-RETURNS, CS-RETURN-POLICY.

### NewReturn

**Layout.** Source/customer, returnable lines, reason/response and review. This wizard creates a draft; authorization is separate. An existing draft may be continued. Its fields and service calls reuse the canonical ReturnDetail forms without defining another return model.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ReturnSource | single | Choose sale and destination | customer, order, lookback period, case, customer reference, facility, contact/shipping address | permitted order lookup | `mantle.order.ReturnServices.find#OrderOpenReturns`, `create#ReturnFromOrder`; proposed policy preflight | `Return/FindReturn` `CreateReturn`; `Return/AddOrderItems` `LookBackDaysForm` |
| ReturnableLines | list | Select eligible quantity | order/item, product/variant, shipped, previously returned/credited, remaining eligible, requested qty/UOM, serial/lot if known | source-line picker; server ceilings | `find#ReturnableOrderItems`, `calculate#OrderItemReturnable`, `add#OrderItemToReturn` in ReturnServices | `Return/AddOrderItems` `AddOrderItemToReturn`; Carbon `ReturnableLinesModal.tsx` |
| ReturnRequest | single + lines | Explain desired remedy | reason, requested response, description/evidence, condition, authorization expiry preview, contact, draft return ID, operation key | response explicitly credit/refund/replace; fees disclosed | `update#ReturnItem`, `request#Return` through proposed `ReturnPolicyServices.submit#CustomerReturn` | `Return/EditReturnItems` `ReturnItemList`; Carbon RMA form |

The wrapper locks source eligibility across concurrent drafts/requests according to crosscut's reservation policy. Draft proposals may be saved with an explicit non-reserving status; authorization rechecks remaining eligibility. Multiple partial returns cannot over-return the same source units. Unreferenced goods require a manager's exception with identified customer, product/serial, ownership evidence and valuation source; customer self-service never chooses an unreferenced-return bypass. Cancellation preserves audit and releases only unconsumed authorization. **Source.** Research §7/12; [R3](#reference-files). **Needs.** CX-RETURNS, CS-RETURN-POLICY.

### ReturnDetail

**Context passed** to [crosscut §3.18](design-crosscut.md#318-returndetail): mount `CustomerService/Returns/ReturnDetail`; customer-return direction, organization, source order/case and current user's capabilities. Tabs: Authorization/Items, shipment/label/tracking, inspection/disposition, settlement summary, conversation/history. Emphasize customer reference (`ReturnHeader.externalId`/display ID as appropriate), assignee, expiry, promised remedy and quantities awaiting each stage. Existing `ReturnItemBilling` supplies receipt/invoice evidence; extensions add only missing allocation/provenance. Request/approve/cancel use active ReturnServices `request#Return`, `approve#Return`, `cancel#Return`/`cancel#ReturnItem` through the policy guard. Proposed return-policy extension stores assignee/expiry/fee/exception, while disposition belongs to shared QualityInspection.

R authorizes the response and policy exception; W receives/inspects/disposes; F issues credit/refund/replacement financial effects. Standard A sees disposition and credit details read-only. For a standalone service business, explicit W/F capabilities enable the same shared `receive#ReturnWithoutShipment`/response tasks without granting Warehouse or Accounting app roots. Receipt captures product, quantity, UOM, lot/serial, receipt date and destination/inspection hold using the shared stock task; it cannot treat failed inspection as immediately sellable. Scan actions have manual-entry and terminal equivalents.

Financial actions invoke proposed `ironstone.accounting.ReturnSettlementServices.settle#Return`, orchestrating current Return/Invoice/Payment services under locks and cumulative source quantity/amount caps. Show authorized, received, accepted/rejected, previously credited/refunded, currently eligible and requested amounts separately. Partial receipt supports partial eligible credit; no-receipt credit requires F exception and creates no stock. Inspection outcome controls stock release; credit eligibility is a separate approved policy result, so rejected goods can still merit a customer refund without becoming sellable. Restocking fees, tax, currency, rounding and replacement difference are explicit preview lines. Repeated clicks/retries use the same operation key. `CreditCapExceeded`, `ReceiptChanged`, `ClosedPeriod`, `RefundPending` and `Forbidden` leave a named result; externally pending refunds retain durable state for reconciliation, not a second refund. The case can be resolved with a customer-agreed remaining settlement promise, but the return remains outstanding until its physical/financial obligations finish.

### QualityInspection

**Context passed** to [crosscut §3.19](design-crosscut.md#319-qualityinspection-and-inspectiontemplates): mount `CustomerService/Returns/QualityInspection`; return, receipt, product/lot/serial and facility; read inspection evidence, hold, accepted/rejected quantities and disposition for A/R. Only W can inspect, release, quarantine, restock, scrap, send to repair or return-to-customer. Rejected goods stay non-available; a customer communication action links the disposition without changing it. Screens and services recheck facility permission and version. A supplier-recovery return is a separately authorized linked return, not a new direction for the customer's RMA.

### WarrantyClaims

**Layout.** Case-based list filtered to proposed warranty request type, grouped by Needs evidence, Assessment, Approved repair/replacement, Rejected and Customer follow-up. These claim states are independent from Request lifecycle and Return custody.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| WarrantyFind | find | Locate claims | customer, product/serial, sale, agreement, claim state, assignee | date/saved finds | proposed `WarrantyServices.find#WarrantyClaims` | ERPNext `warranty_claim.json` |
| WarrantyList | list | Coordinate promises | case, equipment, entitlement end, assessment, linked return/work, next action | work/return links | same proposed read | same reference |

New claim opens NewCase with warranty template. **Source.** Research §7; [R5](#reference-files). **Needs.** CS-WARRANTY, CX-REQUEST.

### WarrantyAssessment

**Layout.** Evidence/coverage, decision and linked repair/custody. Customer-owned equipment never silently becomes organization-valued stock.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| WarrantyEvidence | single | Establish coverage | case/customer, product, serial/equipment, source order/invoice, purchase/coverage dates, agreement, fault, usage/condition, photos, prior claims | permitted record selectors | proposed `WarrantyServices.save#WarrantyClaim` | ERPNext warranty claim; Odoo repair |
| WarrantyDecision | single | Record entitlement result | assessed terms/version, covered/partial/rejected, reason, approver, charge estimate/currency, customer consent, next due | approval and pricing links | proposed `WarrantyServices.decide#WarrantyClaim` | same references |
| RepairLinks | list + dialog | Coordinate execution | request, existing/new workEffortId, maintenance purpose, facility/asset, custody return, required work, assignee, due, result | shared work cards | proposed `WarrantyServices.link#WarrantyWork`; active `mantle.request.RequestServices.link#RequestRecord`, RequestWorkEffort and `mantle.work.WorkEffortServices.link#WorkEffortRecord` | existing Request Work/record links; Odoo repair |

Repair execution is a linked maintenance-purpose WorkEffort (`WepMaintenance`), not an invented stock-consuming case status. Planned materials, labor, repair quality and resulting charges follow Maintenance/Manufacturing/Warehouse/Accounting contracts; service owns coverage approval and customer communications. Replacement needs a linked order/return settlement; repair completion merely alerts the case agent. **States.** Expired entitlement may be rejected or explicitly approved as goodwill with approver/cost owner. **Source.** Research §7/13; [R5](#reference-files). **Needs.** CS-WARRANTY, CX-REQUEST, CX-RETURNS.

## 6. Availability and knowledge

### InventoryAvailability

**Context passed** to [crosscut §3.7](design-crosscut.md#37-inventoryavailability): mount `CustomerService/InventoryAvailability`; product/variant, requested quantity/UOM/date, organization, permitted customer-serving facilities. Use active `mantle.product.AssetServices.get#AvailableInventory`, `get#AvailableInventoryMulti` and `mantle.product.InventoryReportServices.get#InventoryProjectedInfo` through the shared guarded read. Read on-hand, reserved, usable/unreserved, ATP, inspection/quality hold, incoming supply and dates with as-of/completeness. No allocation mutation; show customer promise only from canonical checked promise results. Incoming PO/production/transfer rows retain provenance and avoid double counting. An unavailable/not-ready projection shows unknown with a refresh/support action, never zero or a confident delivery promise. Public pages expose only the configured aggregate promise band, never internal suppliers, exact private stocks or costs.

### StockAtDate

**Layout.** Product/facility/date report for retrospective explanations; explicitly separate historical on-hand from today's ATP and future promise.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| StockDateFind | find | Choose historical cut-off | product/variant, facility, location if allowed, effective timestamp/timezone, unit, lot/serial if allowed | date/time selector | proposed `mantle.product.InventoryReportServices.get#InventoryAtDate` coordinated with Warehouse | Dolibarr `htdocs/product/stock/stockatdate.php` |
| StockHistory | list/read | Explain historical quantity | opening, receipt/issue/adjustment, effective/recorded dates, closing, source link, completeness | tabular timeline | same proposed service from AssetDetail and posting history | same reference |

No quantity changes, cost display or promise action. Missing pre-migration history is labeled incomplete. Terminal uses the same rows and cut-off. **Source.** Research §8; [R6](#reference-files). **Needs.** CX-AVAILABILITY; extend its report contract, no separate stock balance record.

### Product360

**Context passed** to [crosscut §3.5](design-crosscut.md#35-product360): mount `CustomerService/Product360`; product/variant and organization; Overview/identifiers/units, permitted prices and explanation, Availability, customer-safe documents and warranty information. No BOM/cost/supplier prices by default. Product substitutions open the guarded order-change proposal and must be confirmed; they do not silently edit a case-linked order.

### Knowledge

**Context passed** to [Commons Knowledge](design-drawers-commons.md#10-notes-and-knowledge): mount `CustomerService/Knowledge`; permitted service spaces, query from case subject/product/category, requestId when linked; search/list/read, author/review by K, article feedback and case links. `mantle.request.WikiPageRequest` preserves the case link. Existing `Request/EditWikiPages` AddWprForm/DeleteWprForm map to link/unlink actions under record permissions. Search never offers internal articles to a customer; a draft is never sent as a public link. Commons owns editor, spaces, revisions, attachments and publication. Browser wiki rich editing keeps Commons' terminal read/export and explicit edit alternative; service adds no competing wiki renderer.

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
| AnswerSelection | list | Choose useful resolution | case, selected outward messages/resolution, allowed attachment references | audience markers | proposed `KnowledgeServices.prepare#ArticleFromCase` | Frappe ticket-to-article pattern |
| ArticleDraft | single | Write reusable answer | title, summary, body, space, category/tags, product, proposed audience, removed personal data, source case link | Commons Markdown editor and plain-text terminal input | proposed `KnowledgeServices.create#ArticleFromCase` wrapping existing wiki creation and WikiPageRequest | Commons Knowledge; Frappe `NewArticle.vue` |

Agent cannot publish a private conversation by selecting it. Preview identifies names, contact/address/order details and attachments for manual review; automated suggestions are not authorization. Attachments must be copied to an approved public article version explicitly. **Source.** Research §9/13; [R7](#reference-files). **Needs.** CS-KNOWLEDGE, CX-ACCESS.

## 7. Reports

All reports use server-side organization/queue/customer filters, current case access and an explicit as-of timestamp. Response metrics disclose sample counts, elapsed vs business time, reopen episodes and excluded cancellations. Charts always have data tables and CSV under the same permissions. No custom browser interaction is required.

### Reports

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ReportCatalogue | list/read | Choose an allowed report | name, description, scope, last run | links; favorite saved find | static screen metadata filtered by authz | research §10 operational report inventory |

**Layout/actions.** Cards or table; open the report, no background data export from the landing. **Source.** Research §10. **Needs.** CS-REPORTING.

### SlaCompliance

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| SlaFind | find | Select cohort | created/resolved period, queue/team, priority, policy/version, channel, first-response/resolution target | date-period; cohort choice | proposed `ReportingServices.get#SlaCompliance` | Frappe `helpdesk/api/dashboard.py`; ERPNext support reports |
| SlaResults | list/report | Explain success and breach | eligible/met/breached/open due, denominator, paused duration, policy/calendar version, case drill-down | stacked counts and table | same proposed service | same reference |

**States.** Cancellations excluded from success rate and shown separately; unresolved cases remain visible to avoid survivor bias. **Source.** Research §10; [R8](#reference-files). **Needs.** CS-SLA, CS-REPORTING.

### ResponseTimes

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ResponseFind | find | Select metric/cohort | period, team, priority, channel, first/next response/resolution, business/elapsed | explicit time basis | proposed `ReportingServices.get#ResponseTimes` | Frappe dashboard; ERPNext Issue Analytics |
| ResponseResults | list/report | Show distribution | count, median, p90, mean, open age, first-response and episode-resolution times | distribution plus same data table | same proposed service | same reference |

**States.** First response is an actual outward agent response accepted by channel; acknowledgement and notes excluded. Later delivery failure is visible on the event and auditable. **Source.** Research §10; [R8](#reference-files). **Needs.** CS-SLA, CS-REPORTING.

### CaseVolumes

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| VolumeFind | find | Choose demand breakdown | period, organization, team, type/category, channel, customer group, status category | grouping selector | proposed `ReportingServices.get#CaseVolumes` | Frappe dashboard; baseline FindRequest |
| VolumeResults | list/report | Separate intake and backlog | received, resolved, reopened, cancelled, merged, carried backlog, assignments | trend table/chart; drill-down | same proposed service | same reference |

**States.** Merged case counts retain intake events but do not double-count active backlog; split descendants disclose lineage. **Source.** Research §10. **Needs.** CS-REPORTING.

### CsatResults

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| CsatFind | find | Select comparable feedback | period, template/version, queue/team, customer, rating, response state | explicit version filter | proposed `FeedbackServices.find#CaseResponses` | `Survey/Responses` `ResponseListForm` |
| CsatResponseList | list | Review responses | case, resolution episode, sent/responded dates, score, comment, follow-up state | case/response links, sensitive comments masked | framework FormResponse reads with case authorization | same baseline |
| CsatStats | list/report | Interpret response counts | invited/delivered/responded, response rate, score distribution, text count | table + chart; raw scale label | `org.moqui.impl.ScreenServices.get#FormResponseStats` through proposed scoped adapter | `Survey/ResponseStats` `TextDbFormFieldResponseCountList`, `FieldOptionForm` |

Default scale is 1–5; do not compare changed scales without a declared normalization. Low scores create an assigned follow-up notification, never silently reopen or alter the original answer. **Source.** Research §10/12; [R8](#reference-files). **Needs.** CS-FEEDBACK.

### ResponseDetail

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ResponseDetails | read | Inspect submitted feedback | form/version, case/episode, invitation/response dates, score, optional reason/comment, consent, permitted respondent | dynamic form read | `org.moqui.impl.ScreenServices.get#FormResponse` through proposed case access adapter | `Survey/ResponseDetails` `ResponseDetailsForm` |
| FeedbackFollowUp | dialog | Acknowledge or assign follow-up | response, assignee, due, action, note, linked case/work | shared task selector | proposed `FeedbackServices.record#FeedbackFollowUp` | Frappe TicketFeedback and shared tasks |

Responses are immutable; correction/withdrawal records replace visibility or create a superseding response with audit. **Source.** Research §10/12. **Needs.** CS-FEEDBACK.

### CaseAnalytics

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| CaseMetrics | read | Explain one case | request, first receipt/response, each resolution/reopen, policy/calendar snapshot, targets, pause durations, breaches, assignments, messages, feedback | event timeline with table | proposed `SlaServices.get#CaseSlaHistory` | Frappe `TicketSLA.vue`, `ticket_stats.py` |

**Layout/actions.** Clock cards followed by event history; links open original allowed messages and decisions. Events cannot be edited here. Manager correction is a reasoned adjustment event, not historical deletion. Terminal prints the same timestamps and durations. **Source.** Research §3/10; [R8](#reference-files). **Needs.** CS-SLA, CS-REPORTING.

## 8. Customer access

These are routes in the shared suite account/support surface (`ServicePortal` is a proposed route group, not a new identity system). Commons owns authentication, account/profile and contact mechanisms. Common branding/navigation may surround service pages alongside Commerce later. Anonymous readers see published help only; a token authorizes a particular intake form or feedback invitation, never arbitrary case browsing. Customer employees see only their own cases unless a verified customer administrator has granted organization-wide service visibility. Shared links enforce the same restriction; no internal staff, private notes, cost, supplier, other-customer, or ledger information leaks through search, exported files, notifications or counts.

### SupportHome

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| HelpSearch | find | Find a published answer | query, category, product | accessible suggestions with list fallback | existing Knowledge search with proposed service/public audience filter | Frappe `KnowledgeBaseCustomer.vue`; ERPNext `help.html` |
| HelpResults | list/read | Answer or contact support | title, summary, category, article URL | published article links; Create case remains available | same search | same references |

**Layout/actions.** Search, categories, My cases/My returns if signed in, contact support. Failed search does not block a valid intake. **Source.** Research §9; [R7](#reference-files). **Needs.** CS-PORTAL, CS-KNOWLEDGE.

### MyCases

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| MyCaseFind | find | Narrow own support records | search, customer-visible status, date, customer account when multiple authorized | no team/agent-internal selectors | proposed `CaseServices.find#CustomerCases` over existing Request visibility pattern | `MyAccount/User/Request/MyRequests` `ListRequests` |
| MyCaseList | list | Follow own cases | case/name, visible status, created/updated, needs reply, customer reference | no bulk triage or drag actions | same proposed read | same baseline; Frappe customer ticket list |

**Actions.** Open case, new case; no colleague contact links by inference. **Source.** Research §3/9 and active Projects client slice. **Needs.** CS-PORTAL, CX-ACCESS.

### NewCustomerCase

**Context passed** to [NewCase](#newcase): `ServicePortal/NewCustomerCase`; verified customer/contact or bounded intake token, offered service types/templates, published KB suggestions, subject/description/files and customer-facing contact fields. Queue/SLA/assignee/internal priority are server defaults, not accepted hidden inputs. Unauthenticated intake records sender verification state and anti-abuse result; it grants no customer account or case read permission until verified. Use the current intake-token/confirmation primitives extended to queue destinations.

### CustomerCase

**Context passed** to [crosscut §3.11](design-crosscut.md#311-requestdetail) and Projects' existing client isolation: `ServicePortal/CustomerCase`, requestId and verified permitted customer/contact. Show customer label/status, submitted description, outward messages, approved shared files, allowed work status and customer-visible return/order links. Actions reply, add permitted files while open, request reopen and cancel own eligible case; no private note, bulk status, assignment, customer/party reassociation, file-version deletion or internal linked record traversal. Reopen applies the configured service episode policy after authorization. Existing project-constrained checks must be generalized for non-project support cases without loosening the current Projects scope.

### MyReturns

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| MyReturnFind | find | Find own RMAs | order/reference, customer-visible status, date period | safe customer scope | proposed `ReturnPolicyServices.find#CustomerReturns` | `Return/FindReturn` `ReturnHeaderList`; Odoo portal returns |
| MyReturnList | list | Follow authorized progress | reference, order, requested/approved/received qty, remedy, expiry, tracking | customer labels, no costs | same proposed read | same references |

**Actions.** Request return, open permitted RMA. **Source.** Research §7/9; [R4](#reference-files). **Needs.** CS-PORTAL, CS-RETURN-POLICY.

### RequestReturn

**Context passed** to [NewReturn](#newreturn): `ServicePortal/RequestReturn`; verified customer/order; only returnable products/quantities within policy, customer reasons, requested remedy, condition/evidence and collection address. Requested remedy is not an approved refund. Server selects permitted receiving facility, determines fees/window and recomputes remaining eligibility. No arbitrary customer, supplier, payment method, source invoice or unreferenced-return override is accepted from browser parameters.

### CustomerReturn

**Context passed** to [crosscut §3.18](design-crosscut.md#318-returndetail): `ServicePortal/CustomerReturn`; customer's RMA; show authorization decision/expiry, approved quantities/instructions/label, tracking, customer-safe inspection decision and issued credit/refund/replacement status. Customer may add requested evidence/message, download approved label, withdraw a request before physical/financial effects or ask an agent to cancel after that. No stock disposition, credit posting, internal investigation notes or arbitrary bank refund selection.

### CustomerArticle

**Context passed** to Commons Knowledge: `ServicePortal/CustomerArticle`; published page/version in the configured public/customer space; read, helpful/not-helpful with optional comment, Create case with article reference. Drafts/internal spaces/attachments are denied independently of a guessed URL. Terminal displays text and offers the same feedback and case actions.

### Feedback

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| CaseFeedback | single | Submit the invited response | opaque invitation token, form version, required rating 1–5, optional reason, optional comment, consent if collecting additional personal data | accessible numbered choices; generated DbForm | proposed `FeedbackServices.submit#CaseFeedback` wrapping `org.moqui.impl.ScreenServices.create#FormResponse` | `Survey/Responses`; Frappe `TicketFeedback.vue` |

**States.** Token binds organization/case/resolution episode/form version, expires and permits one durable response; repeat submission returns its prior result. It cannot expose the case itself. Expired/revoked/reused states disclose only safe guidance. Mail scanners visiting GET do not submit a rating. One invitation per eligible resolution episode; delivery retries reuse its ID. **Source.** Research §10; [R8](#reference-files). **Needs.** CS-FEEDBACK, CS-PORTAL.

## 9. Settings

Settings use XML forms, permission-filtered lists and explicit Save/Preview/Publish actions. Browser reordering always has sequence fields/Move up/down for terminal and keyboard users. Published policy/template versions remain available to historical cases; edits create a new version. No administrator-entered JavaScript executes in a customer's case form.

### Settings

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| SettingLinks | list/read | Find allowed settings | category, description, readiness, permission | links | static screen metadata and proposed configuration readiness read | research §10 settings inventory |

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
| AssignmentRuleEdit | single + lines | Define typed routing | queue, name, priority, active dates; conditions: allowed field/operator/value; distribution manual/round-robin/least-open; eligible team/users, working days/calendar, max load, fallback, unassign/close conditions | declarative condition builder with row-list terminal twin | proposed `AssignmentServices.save#Rule` | Frappe AssignmentRuleView/AssigneeRules |
| AssignmentPreview | single/read | Explain routing | example case/current version, matching rules, eligible agents, selected agent, fallback reason | dry run, no assignment | proposed `AssignmentServices.preview#Assignment` | same references |

Rule evaluation is deterministic and audited; one winning rule plus explicit fallback. Lock distribution cursor and assignment atomically; two workers cannot claim the same next slot independently. Reassignment never resets SLA. No eligible agent leaves the case visible in unassigned with a manager notification. **Source.** Research §3/10; [R9](#reference-files). **Needs.** CS-ASSIGNMENT.

### SlaPolicies

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| SlaPolicyList | list | Select policy/version | name, organization, applicability, priority, calendar, effective period, draft/published | version badges | proposed `SlaServices.find#Policies` | Frappe SLA DocType |
| SlaPolicyEdit | single + lines | Define clock rules | policy/name/version, organization, queue/type/customer/agreement conditions, precedence, effective dates, calendar/timezone; targets per priority: first response/resolution business minutes, warning offsets; allowed pauses, maximum pause/escalation, reopen policy | Commons calendar selector; row targets | proposed `SlaServices.save#Policy` | Frappe `hd_service_level_agreement.json` |
| SlaSimulation | single/read | Explain due dates | example received timestamp/priority, target policy/calendar version, closures/holidays, pause intervals, first-response/resolution deadlines, warnings | timeline plus table | proposed `SlaServices.simulate#Policy` | Frappe TicketSLA and SLA working-hours pattern |

Use existing Commons working-hours/availability and holiday definitions; edit there with calendar permissions, return here by link. Bind a policy/calendar version to each episode so later holiday edits do not silently rewrite recorded breaches. Explicit correction requires manager reason and retains the previous calculation. First-response clock begins at accepted intake, is not reset on reassignment/reopen, and completes on the first real outward response; resolution starts a new episode on reopen, preserving prior breaches and reporting total age. Customer-wait pauses resolution by default; internal operational hold does not unless the published policy explicitly permits it. Define maximum pause warning, not an automatic successful resolution. **Source.** Research §3/10/13; [R8](#reference-files). **Needs.** CS-SLA; existing Commons working-hours contract.

### StatusCategories

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| CaseStatusMap | list/editable | Map workflow semantics | workflow, statusId, agent label, customer label, category Open/Paused/Resolved/Closed/Cancelled, permitted pause reason, ordering, terminal flag, active dates | existing StatusItem picker; distinct label preview | proposed `ConfigurationServices.save#CaseStatusMapping` | Frappe `hd_ticket_status.json` |
| CaseTransitionPolicy | single + lines | Configure allowed moves | workflow/type, from/to status, required resolution/reason, capability, reopen window, notify, close-after interval | status flow preview and transition table | proposed `ConfigurationServices.save#CaseWorkflow` | existing StatusFlowTransition and Frappe statuses |

Default mapping: Draft/Submitted/Reviewed/InProgress → Open; proposed WaitingCustomer → Paused; proposed OnHold → Open unless policy authorizes pause; Completed → Resolved; Cancelled → Cancelled. Optional new Closed status is a case-workflow addition, not renaming ReqCompleted across apps. Required categories are data, never hardcoded status-name tests. Changing a mapping publishes a version; existing SLA episodes retain original interpretation. **Source.** Research §3/13; [R10](#reference-files). **Needs.** CS-SLA, CX-REQUEST.

### CaseTypes

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ServiceTypes | list/editable | Offer current/new request types | enumId, description, service-enabled, customer label, default queue/template/workflow, public availability | current enumeration selector | existing Enumeration reads; proposed `ConfigurationServices.save#ServiceRequestType` | Request RequestType seeds; baseline FindRequest |

`RqtSupport`, `RqtInformation`, `RqtContact` are current reusable types. Proposed order-change/warranty-specific types are explicitly added seeds. Existing project/purchase/inventory types remain owned by their processes; a case can link them without forcing their lifecycle into service SLA. **Source.** Research §12/13; RequestEntities. **Needs.** CX-REQUEST, CS-TEMPLATES.

### CaseTemplates

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| TemplateList | list | Select template/version | name, type/queue, audience, effective dates, published state | version selector | proposed `TemplateServices.find#Templates` | Frappe HD Ticket Template |
| TemplateEdit | single + lines | Define bounded intake fields | name/type/queue/audience; fields: stable key, label, datatype, required, options/allowed source, default, ordering, visibility, help, validation limits; dependency rows: source field/operator/value, target field, show/require | declarative fields; sequence buttons | proposed `TemplateServices.save#Template` | Frappe ticket template/field/dependency DocTypes |
| TemplatePreview | read/single | Test both audiences | sample values, computed visibility/required fields, validation messages, version | desktop/phone/terminal preview | proposed `TemplateServices.validate#Template` | Frappe template preview |

No arbitrary form script. Conditions use a typed allowlist and reject cycles; server re-evaluates hidden and required fields. Keep submitted values against immutable schema version; hidden internal fields are never sent to a customer. **Source.** Research §3/10; [R11](#reference-files). **Needs.** CS-TEMPLATES.

### SavedReplies

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ReplyList | list | Find reusable response | title, scope Personal/Team/Global, team, language, active, tags | search/preview | proposed `ReplyServices.find#SavedReplies` | Frappe HD Saved Reply |
| ReplyEdit | single + lines | Define text and optional actions | title, body, language, scope/team/owner, safe variables; actions: operation, field/value, assignee/team, tag, note/reply text, suggested status | action chips with ordered row alternative | proposed `ReplyServices.save#SavedReply` | Frappe saved reply DocType and action components |
| ReplyPreview | read/single | Check resolved text and effects | target case/version, rendered body, recipients/audience, changes, forbidden/unavailable actions | explicit apply/send | proposed `ReplyServices.preview#SavedReply`, `apply#SavedReply` | Frappe SavedRepliesSelectorModal |

Applying a reply never auto-sends without explicit confirmation or bypasses field/action capabilities. Unsupported variables are unresolved errors, not empty customer promises. A macro's internal case mutations are atomic per case; message delivery has durable pending/failed status. **Source.** Research §3/10; [R12](#reference-files). **Needs.** CS-REPLIES.

### ChannelRouting

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| IntakeRoutes | list | See service entry points | existing account/address/token/channel, organization, queue/type/template, active, last error | links to Comms account and existing intake-token controls | active `mantle.request.RequestServices.get#IntakeSettings`; proposed `ChannelServices.find#ServiceRoutes` | existing Projects Intake; Frappe EmailConfig |
| RouteEdit | single | Map route and acknowledgement | channel/account reference, destination queue/type/template, sender policy, default priority, acknowledgement template, reply identity, notification recipients, rate limit, token expiry | no credentials here | proposed `ChannelServices.save#ServiceRoute`; existing `create#IntakeToken`, `remove#IntakeToken` extended for queue destination | existing request intake; Frappe email notifications |
| RouteTest | single/read | Test non-delivering resolution | sample recipient/sender/message-id/thread references, matched route, existing case, visibility/defaults, rejection | dry run | proposed `ChannelServices.preview#ServiceRoute` | Redmine mail threading; current Request email intake |

Current `create#RequestFromEmail`, `find#EmailRequest`, `file#RequestEmail`, `send#IntakeConfirmation` remain the intake foundation. Thread by verified message references before permitted ticket tokens; never trust a guessed case ID in a subject to authorize another sender. Unknown sender is held for verification/triage. Comms owns transport, credentials, spam filtering and delivery retries. **Source.** Research §4/10; [R13](#reference-files). **Needs.** CS-CHANNELS, CX-REQUEST, CX-ACCESS.

### ReturnPolicies

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ReturnPolicyList | list | Choose applicable policy | organization, store/customer group, product category, priority, effective period, version | overlap warning | proposed `ReturnPolicyServices.find#Policies` | Odoo return settings; Carbon RMA |
| ReturnPolicyEdit | single + lines | Define eligibility and authority | applicability/effective dates, window from shipment/delivery, authorization validity, self-service enabled, allowed reasons/remedies, proof/condition requirements, allowed destination, exception approver, no-receipt credit eligibility, restock fee rule/cap, customer instructions | policy preview; canonical pricing/tax rules | proposed `ReturnPolicyServices.save#Policy` | same references |
| ReturnReasons | list/editable | Maintain reason vocabulary | ReturnReason enum, label/customer label, enabled audience, evidence required, suggested response/inspection, proposed zero-value exception rule | explicit disposition suggestion only | guarded ReturnReason Enumeration CRUD plus proposed policy mapping | Odoo `return_reason_views.xml`; current return enums |
| ReturnPolicyPreview | single/read | Explain eligibility | order/item, delivery/date/quantity, customer/product, policy/version, remaining eligibility, expiry, fees, approval requirements | same preview used by NewReturn | proposed `ReturnPolicyServices.evaluate#ReturnPolicy` | Carbon returnable-line validation |

A reason suggesting scrap or zero valuation is not authority to post it: Quality and Accounting decide with evidence. Policy selection is deterministic; no matching policy yields manual review, not an unrestricted return. `externalId` already exists for customer reference; do not add a redundant reference field. **Source.** Research §7/10/13; [R3/R4](#reference-files). **Needs.** CS-RETURN-POLICY, CX-RETURNS.

### KnowledgeSources

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ServiceKnowledgeSources | list/editable | Scope suggested/published help | existing space/category, audience, product/category mapping, search priority, allow suggestions, review team, default draft space | Knowledge links | proposed `KnowledgeServices.save#ServiceKnowledgeSource`; existing WikiSpace reads | ERPNext support search source; Frappe KB categories |

Only include sources permitted for the current audience; indexing does not widen page permission. Publishing and category editing open Commons Knowledge. **Source.** Research §9; [R7](#reference-files). **Needs.** CS-KNOWLEDGE.

### FeedbackForms

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| FeedbackFormList | list | Choose reusable survey | formId, name, purpose, version, active/publication state, assigned policies | standard list | `moqui.screen.form.DbForm` reads with proposed purpose/version adapter | `Survey/FindSurvey` `SurveyList` |
| NewFeedbackForm | dialog | Seed or copy a form | name, purpose, source form/version, organization, initial rating scale | default 1–5 seed | guarded `create#moqui.screen.form.DbForm` through proposed `FeedbackServices.create#FeedbackForm` | `Survey/FindSurvey` `NewSurveyForm` |

The default is a required 1–5 rating and optional reason/comment. Other service surveys use the same framework fields and response model, reusable by Marketing/People; service ownership is the case invitation/response link. **Source.** Research §10/12/13; baseline Survey. **Needs.** CS-FEEDBACK.

### FeedbackFormDetail

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| FeedbackFormHeader | single | Maintain definition | name, purpose, title/help, version, allowed audience, draft/published | version/read-only published state | guarded `update#moqui.screen.form.DbForm` | `Survey/EditSurvey` `EditSurveyForm` |
| FormAccess | list + dialog | Author/read grants | userGroupId, permission, effective scope | existing user-group lookup | guarded DbFormUserGroup CRUD | `EditSurvey` `NewUserGroupForm`, `UserGroupForm` |
| FormFields | list + dialog | Define questions | fieldName/type, title, required, sequence, defaults/help, validation limits | sequence buttons, add field | `org.moqui.impl.ScreenServices.update#DbFormField`, `delete#DbFormField`; guarded DbFormField create | `Survey/Fields` `NewDbFormFieldForm`, `DbFormFieldList` |
| FieldOptions | list + dialog | Define choices | field, option key/label, score, sequence | explicit stable score mapping | guarded DbFormFieldOption CRUD | `Survey/Fields` `NewFieldOptionForm`, `FieldOptionForm` |
| FormPreview | single/read | Preview and publish | rendered fields, sample response, audience, schema version | dynamic XML form; terminal same choices | proposed `FeedbackServices.publish#FeedbackForm`; DbForm rendering | `Survey/Fields` `SurveyPreview` |

No arbitrary JavaScript or public entity auto-service access. Published versions with responses cannot be edited/deleted in place; clone and publish a new version. Access to responses remains case-filtered in addition to form access. **Source.** Research §10/12; active framework ScreenServices and baseline Survey. **Needs.** CS-FEEDBACK.

### ServiceDefaults

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ServicePolicy | single | Set service-wide defaults | organization, enabled types, default queue/template/SLA, unknown-sender/intake policy, prefer-KB, reopen window, auto-close delay, required resolution, support-work completion policy, retention policy reference, acknowledgement/feedback rules, fallback owner | links to shared branding/calendar/privacy settings | proposed `ConfigurationServices.save#ServiceDefaults` | Frappe General/settings API |
| FeedbackDeliveryPolicy | single | Configure invitations | eligible resolved types/queues, delay, per-episode frequency, form version, channel, token expiry, reminder cap, suppression/consent, low-score follow-up team | template preview, no transport credentials | proposed `FeedbackServices.save#InvitationPolicy` | Frappe email notification/share-feedback settings |

Auto-close may follow a resolved case after a disclosed waiting period; it never fabricates a first response or resolves an open unhandled case. Customer reply before close reopens via policy. Retention uses shared privacy/record retention; deleting a conversation cannot destroy required financial/stock audit. **Source.** Research §10; [R1/R8](#reference-files). **Needs.** CS-SETTINGS, CS-FEEDBACK, CX-REQUEST.

### ChannelAutomation

**Later.** Scope is bounded configuration for Comms-owned live chat distribution, chatbot steps and optional telephony adapters. Manual call logging, chat-to-case links and email intake above do not wait for it.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ChannelRule | single + lines | Configure routing/scripts | channel, active dates, allowed site/customer audience, agent team, schedule, fallback queue; steps: prompt, response choices, next step, handoff, required consent | visual graph optional; ordered branch table is complete terminal behavior | proposed Comms channel orchestration, no current service claimed | Odoo im_livechat channel/chatbot; Frappe telephony settings |
| ChannelSimulation | single/read | Verify handoff | sample visitor/time/input, script path, eligible team, resulting case context | dry run | proposed Comms test service | same references |

Credentials and actual calls stay in Comms; no provider integration is implemented in this design pass. **Source.** Research §4/10; [R14](#reference-files). **Needs.** CS-CHANNELS (later).

## 10. Baseline and research coverage

### Current-source verification

Checked against active XML on Oct 27, 2026, not merely research descriptions. Source paths are relative to this plan directory unless absolute.

| Source | Finding and design consequence |
| --- | --- |
| [CustomerService.xml](../screen/CustomerService.xml), [BossSetupData.xml](../data/BossSetupData.xml) | Root scaffold, icon, organization setup and Chatter/files mounts exist. Customer Service's BOSS grant is inside a comment block; no new menu/screens are claimed implemented. |
| [Shared/RequestDetail.xml](../screen/Shared/RequestDetail.xml), [Projects Request services](../service/ironstone/projects/ProjectRequestServices.xml) | Current Commons/Projects contexts already provide request details, links, tasks and client restrictions. Add a service context; do not duplicate the shared screen. |
| [RequestEntities.xml](../../mr-mantle/entity/RequestEntities.xml), [RequestServices.xml](../../mr-mantle/service/mantle/request/RequestServices.xml) | Active RequestRecord, RequestCommEvent, RequestEmailMessage, RequestWorkEffort, RequestParty and WikiPageRequest; intake-token/email and linked-work completion services exist. Support needs scoped policies and non-project visibility, not another generic link/intake implementation. |
| [OrderEntities.xml](../../mr-mantle/entity/OrderEntities.xml), [ReturnServices.xml](../../mr-mantle/service/mantle/order/ReturnServices.xml) | ReturnHeader/ReturnItem/ReturnItemBilling and creation, eligibility, approval, receipt and response services exist. `externalId` already supports an external customer reference. `process#ReturnItemResponses` is active but has TODOs for receipt association and refund gateway/original-payment handling; `update#ReturnItem` contains TODO status restrictions. Existence does not satisfy guarded cumulative credit, complete gateway refund or service-level authorization. Proposed settlement must close these gaps. Commented legacy invoice-adjustment blocks are not active behavior. |
| [InventoryReportServices.xml](../../mr-mantle/service/mantle/product/InventoryReportServices.xml), [AssetServices.xml](../../mr-mantle/service/mantle/product/AssetServices.xml) | Projection service is active, depends on search and explicitly reports no projected inventory when search is absent. Asset availability reads are reused; freshness/inspection semantics require the shared extension. |
| [WorkEffortEntities.xml](../../mr-mantle/entity/WorkEffortEntities.xml), [Commons Calendar](design-drawers-commons.md#7-calendar-and-schedules) | Existing WorkEffortRecord, `WetAvailable` working hours and `WepHoliday` vocabulary support shared scheduling. SLA business-time evaluation/versioning is new. |
| [ScreenEntities.xml](../../../base-component/framework/entity/ScreenEntities.xml), [ScreenServices.xml](../../../base-component/framework/service/org/moqui/impl/ScreenServices.xml) | DbForm, fields/options/user-group grants, FormResponse and get/create/stats/update-field services exist. Case/episode linkage, invitation scope and immutable published form versions are proposed service adaptations. |

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
| Survey/Responses ResponseListForm; ResponseStats TextDbFormFieldResponseCountList/FieldOptionForm; ResponseDetails ResponseDetailsForm | CsatResults and ResponseDetail; case access supplements form access. |
| MyAccount/User/Request MyRequests and EditRequest | MyCases/NewCustomerCase/CustomerCase reuse the external restriction pattern; expand to support destinations through common access policy. |
| Active direct Mantle services | Root setup; Request create/update/replace parties, record links and intake token/settings; Return eligibility/create/request/approve/cancel/receive/response through the shared guarded contract; communication history/outward reply; shared availability reads and warranty work-record links. Exact names/paths are in form summaries and canonical shared definitions. |

### Research candidate and question disposition

| Research scope | Design destination | Classification / disposition |
| --- | --- | --- |
| §2 / §13 Home KPI, my work, queue counts, return approvals | Home; shared widgets/Approvals | new; all proposed counts have authorized drill-downs |
| §3 case list/board, bulk, detail, dynamic intake, merge/split | Cases, NewCase, CaseDetail, MergeCases, SplitCase | parity for baseline record work; new SLA/routing/templates/merge |
| §3 status-category, queue, response clock, saved actions | StatusCategories, Queues, SlaPolicies, SavedReplies | new configuration with explicit state rules |
| §4 email, public forms, chat, phone, threading | ChannelRouting, ChannelSessions, external intake | extend existing intake/Comms; advanced scripted chatbot/CTI is later ChannelAutomation |
| §5 customer/contact, service history, orders, returns, CSAT | Customers, Customer360, ContactDetail | shared parity; new service metrics and permitted coverage links |
| §6 order lookup, quick search, customer actions, changes | Orders, shared Order/Shipment/Invoice detail, OrderChanges | parity lookup; new guarded approval/application |
| §7 customer returns, fees, expiry, replacement, standalone receipt/response | NewReturn/ReturnDetail, ReturnPolicies | baseline parity plus shared new policy/settlement guards |
| §7 failed inspection, supplier recovery, customer-owned repair/warranty | QualityInspection, WarrantyAssessment, linked WorkEffort | new claim layer; shared stock/financial execution |
| §8 availability/incoming/facility and stock-at-date | InventoryAvailability, StockAtDate, Product360 | parity current reads; new freshness/history contract |
| §9 search/read/author, suggestions, case links, feedback, case-to-article | Commons Knowledge context, ArticleFeedback, CaseToArticle, SupportHome | parity wiki/editor; new audience-filtered suggestion/feedback workflow |
| §10 SLA/response/volume/CSAT/per-case reports | All Reports screens | new operational metrics; parity Survey forms |
| §10 settings inventory | All Settings screens | each area represented; account/profile/theme/branding in Commons, mail credentials in Comms |
| §11 reusable cross-app surfaces | Context-only sections and crosscut registry | one definition each; no duplicate shared form definitions |
| §12 baseline, §13 outdated generic-link/calendar gaps | Current-source verification above | active links/intake/calendar reused; missing policy only proposed |
| §13 question: case ↔ order/return links | RequestRecord, existing per-type joins | decided: reuse active generic link with access checks |
| §13 question: status categories | StatusCategories | decided: versioned per-workflow mapping, not hardcoded IDs |
| §13 question: portal ownership | §8 external pages | decided: common suite identity/navigation with service routes; full Commerce later |
| §13 question: order change model | OrderChangeDetail | decided: linked case plus immutable proposal/approval and guarded apply |
| §13 question: warranty/repair record | WarrantyAssessment | decided: proposed claim extension on Request; maintenance-purpose work and Return custody |
| §13 question: working-hours editor | Commons working hours + SlaPolicies reference | decided: one shared calendar; SLA policy/calendar version binding |
| §13 question: CSAT builder | FeedbackForms/FeedbackFormDetail | decided: minimal seeded rating first; all 14 baseline Survey forms retained behind S capability |

### End-to-end review cases

| Scenario | Required outcome and failure behavior |
| --- | --- |
| Product/variant → supplier price → requisition/RFQ → PO → partial receipt/inspection → bill match/payment | Service sees only customer-safe Product/availability facts. Incoming dates remain qualified; failed inspection holds stock, not a fulfilled promise. PO/receipt/match/payment are read via permitted source links, with Purchasing/Warehouse/Accounting ownership. |
| Shortage → buy/make/transfer → issue → partial completion → finished stock/valuation | Availability exposes distinct plan/supply provenance; no case/agent creates a duplicate replenishment demand. Released-BOM changes are Manufacturing replan/reapproval events; customer promise updates derive from changed supply readiness. Only accepted finished stock increases usable supply; Accounting WIP/valuation remains separate. |
| Order → reservation → pick shortfall → packing/shipping → invoice/payment | Service sees shortfall, requests revised promise/substitution, captures consent and uses guarded order change. Concurrent fulfillment returns StaleOrder/AlreadyShipped; substitution rechecks units/price/tax/stock and does not delete existing issued/billed history. |
| Case → RMA → partial receipt → failed inspection/disposition → credit/refund | R authorizes, W receives/holds/disposes, F settles permitted quantity/amount; partial credit and retries cannot exceed cumulative source eligibility. Receiptless credit is an explicit exception with no stock. Case resolution cannot complete return settlement. Supplier recovery is a separately linked supplier return. |
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

## 11. Documents and outputs

| Output | Source screen | Contents / permission / delivery |
| --- | --- | --- |
| Case acknowledgement and outward reply | NewCase, CaseDetail | verified requester, case reference, customer-safe summary/status and support link; queued/sent/failed state with original message identity |
| Case summary PDF/text | CaseDetail | customer-visible or internal variant explicitly labeled; authorized messages, resolution and selected links; private notes never enter customer variant |
| RMA authorization/instructions/label | ReturnDetail | approved items/quantities, expiry, address, instructions, customer-safe reason/fees; label via canonical carrier service with operation reconciliation |
| Order-change decision/confirmation | OrderChangeDetail | exact approved/applied proposal version, order reference, price/date consequences, outstanding actions; no obsolete proposal sent as applied |
| Credit memo/refund/replacement notice | ReturnDetail / InvoiceDetail | Accounting document/payment status and amounts; “pending” remains pending, service cannot manufacture paid status |
| SLA/volume/response/CSAT CSV | Reports | filters, cohort, timezone, as-of, metric basis and authorized data; export permission and audit for comments/contact data |
| Knowledge draft/public article | CaseToArticle / Knowledge | redacted draft plus private source link; publication by authorized author/reviewer using Commons |
| CSAT invitation/receipt | Feedback | record-scoped expiring token, published form version, episode; no case read capability embedded; idempotent submission receipt |

## 12. Framework and data needs

These are proposed additions or extensions. Crosscut owns the consolidated need registry; IDs here identify the Customer Service contribution. Reuse current record links, calendars, Chatter, files, approvals and framework forms. Proposed service shorthand in form tables is under `ironstone.customerservice` unless its full namespace is written; it is not a claim of implementation.

| Need | Kind | Proposed as | Used by | Stub spec |
| --- | --- | --- | --- | --- |
| CS-QUEUE | data model, service type, seed data | RequestCategory service extension and `mantle.request.service.CaseProfile`; `ironstone.customerservice.CaseServices` / ConfigurationServices | Cases, Home, Customer360 | Profile PK requestId; organization, service workflow/version, queue/category, template/version, accepted intake timestamp and channel reference. Preserve existing Request priority/customer/parties and category responsible team. Filter every read by organization/customer/team; create/transition atomically with policy. |
| CS-SLA | data model, service type, seed data | `mantle.request.service.ServiceLevelPolicy`, PolicyTarget, CaseStatusMapping, CaseSlaEpisode, CaseSlaEvent; SlaServices | CaseDetail, settings, reports | Immutable policy/status/calendar binding; per-priority first-response/resolution targets; start/due/actual, pause intervals/reasons, reopen episode, warnings/breaches and corrections. Shared WetAvailable/holiday schedules feed business-time calculation. Event processing keyed by request/event identity; batch timer failures name case IDs and continue. |
| CS-ASSIGNMENT | data model, service type | ServiceAssignmentRule/Condition, ServiceTeamParticipation; AssignmentServices | Queues, AgentTeams, AssignmentRules | Existing user/party/team identities plus eligibility/load/calendar; ordered typed rules and atomic distribution cursor; auditable reason/fallback, no SLA reset. |
| CS-TEMPLATES | data model, service type | CaseTemplate/Field/Dependency/Value with immutable versions; TemplateServices | NewCase, CaseTemplates | Typed allowlisted fields/operators, no scripts, cycle validation, audience and server validation. Values reference template version and Request; core Request fields remain canonical. |
| CS-REPLIES | data model, service type | SavedReply/Action; ReplyServices | CaseDetail, Cases, SavedReplies | Personal/team/global and language scope; safe variable resolution, preview recipients and permitted changes, version check, one transaction per case and durable outbound message key. |
| CS-MERGE | data model, service type | CaseRelation merge/split lineage plus CaseServices operations | MergeCases, SplitCase | source/target/request, relation, actor/time/reason, evidence references and retained SLA obligation. Same-customer merge, lock all involved cases, preserve original audience/history and task/return identities. |
| CS-ORDER-CHANGE / CX-ORDER-CHANGE | data model, service type | Request-linked OrderChange/Line/Decision/Application; OrderChangeServices | OrderChangeDetail, OrderDetail | Fields listed fully in §4. Versioned proposal/approval, current source locks, canonical price/reservation/posting guards, idempotent application and explicit conflicts. |
| CS-RETURN-POLICY / CX-RETURNS | data model, service type | ReturnPolicy/Rule and ReturnAuthorization extension; ReturnPolicyServices | Returns, NewReturn, ReturnDetail, portal | Policy/version, assignee, expiry, exception authority, fee preview and customer promise; retain existing externalId and billing associations. Authorization/credit ceilings rechecked under locks; stock disposition and settlement delegated to common owners. |
| CS-WARRANTY | data model, service type | Request-linked WarrantyClaim/Decision; WarrantyServices | WarrantyAssessment | Sale/product/serial/equipment/agreement evidence, entitlement decision/version/approver/consent, linked maintenance work and custody return. No claim-local stock ledger or repair labor engine. |
| CS-KNOWLEDGE | data model, service type | ServiceKnowledgeSource, ArticleFeedback/Review; KnowledgeServices | Knowledge, ArticleFeedback, CaseToArticle | Existing WikiSpace/Page and WikiPageRequest; scoped suggestion search, article-version feedback, moderated/redacted draft creation; public nonce/rate limit. |
| CS-FEEDBACK | data model, service type, seed data | CaseSurveyInvitation/ResponseLink/FollowUp and version policy over framework DbForm/FormResponse; FeedbackServices | FeedbackForms, Feedback, reports | case/episode/form version, opaque token digest/expiry/revocation, delivery state, response ID, scalar rating index and consent. One durable response per invitation; immutable published version, response authorization inherited from case. |
| CS-CHANNELS | service type, data model | Queue destinations on existing intake services; ChannelServices route extension | ChannelRouting, ChannelSessions | existing intake settings/tokens/email joins reused; organization/account/queue/type/template mapping and safe sender resolution. Comms-owned live chat/CTI/script adapter remains later. |
| CS-PORTAL / CX-PORTALS | service type, seed data | Common external-access contract extended for service contexts | ServicePortal screens | verified account/contact or record/form-bound token; per-request authorization and field/file allowlists, no authorization from route or hidden fields; client status labels and safe results. |
| CS-REPORTING | service type | ReportingServices views/read models | Home, Reports | shared authorized filters, event/episode cohort definitions, as-of/currency/timezone, bounded grouping/export; no synchronous unbounded scanning from Home. |
| CS-PROVIDERS / CX-SHELL | XML Screen element, seed data | existing shell providers and service notification topics | all service screens | palette, Quick create, Today, dashboard, approval hooks, current record context and keyboard bindings; each result carries permitted route and source identity. |
| CS-SETTINGS | data model, service type | organization service policy and versioned publication services | Settings, ServiceDefaults | defaults and readiness validation; migrate active cases explicitly, preserve historical versions; reference shared branding/profile/retention rather than copy them. |
| Existing shared needs | service type, data model | CX-ACCESS, CX-REQUEST, CX-AVAILABILITY, CX-QUALITY, CX-CREDIT, CX-POSTING, CX-APPROVAL | shared context sections | implement once in crosscut. Historical stock reporting extends common availability read contract; refund orchestration stays `ironstone.accounting.ReturnSettlementServices.settle#Return`. |

## 13. Decided

| Topic | Decision and reason |
| --- | --- |
| Case ownership | A case is Request. Projects keeps the shared RequestDetail definition; Customer Service supplies queue/SLA/channel/claim context. Existing links/intake/Chatter/files/client isolation are reused. |
| Linked work completion | Support resolution requires agent confirmation; shared Request type policy prevents project auto-completion handlers from resolving service cases. Existing Projects policy remains intact. |
| Status/SLA semantics | Versioned per-workflow category mapping, separate first-response and resolution clocks, auditable pauses and reopened episodes. Customer wait pauses resolution by default; a staff hold does not make an SLA successful. |
| Resolution and CSAT | Completed maps to Resolved; optional later Closed is separate from cancellation. Real outward response fulfills first response; case resolution, RMA completion and financial settlement remain distinct. Default survey is 1–5 plus optional reason/comment, one invitation per eligible resolution episode. |
| Full survey scope | Retain all baseline Survey forms using framework DbForm/FormResponse; start with seeded minimal form. Case-specific links/tokens are new, not a separate survey engine. |
| Portal | One suite customer identity/access convention with service routes and shared account/profile facilities. Public knowledge, cases, returns and feedback included; full storefront/catalog/cart/checkout and vendor service desk are outside this design. |
| Order changes | New linked Request type and immutable proposal with explicit approval/application. Canonical pricing, stock, fulfillment, credit and financial rules govern apply; no unrestricted service edit of a posted order. |
| Returns | Shared ReturnHeader/Item/Billing plus policy/authorization extension. CS authorizes, Warehouse handles stock/quality, Accounting controls settlement; capabilities allow standalone operation. Partial/repeated credits/refunds share one cumulative ledger of eligibility and stable operation identity. |
| Warranty | Proposed Request claim extension with entitlement evidence; customer-owned asset repair uses maintenance-purpose WorkEffort and explicit custody return. Service does not build another manufacturing or stock subsystem. |
| Working hours | Reuse Commons recurring WetAvailable schedules/holidays and editor, bind SLA policy to a retained calendar version. No service-only holiday master. |
| Assignment | Existing users/parties/teams and presence; deterministic typed rules with fallback and schedule/load checks. No separate agent master or identity. |
| Templates and saved actions | Declarative fields/dependencies/actions, server validation and preview; arbitrary scripts are not carried forward. This is the deliberate substitute for Frappe form-script settings. |
| External tools | Email, chat, calls and credentials remain Comms-owned. Scripted bot/CTI configuration is later; existing Comms channels and manual call notes support core service work now. |
| Knowledge | Commons owns authoring/publication. Service adds source selection, feedback and redacted case-to-draft. Private case content is never published automatically. |
| Standalone financial/stock actions | Require W/F business capabilities and use common services without other app-root grants. Context alone never authorizes receipt, disposition, invoice credit or refund. |
| Scope and validation | Documentation only; no application build required. Check Markdown links/tables, source names and active/commented definitions, research/inventory mappings and cross-app scenarios. |

## 14. Open

These are product-policy choices for review, not unresolved ownership or conflicting transaction contracts. Recommended defaults make the design implementable; final values should be selected during implementation/configuration.

| Review item | Recommended answer | Effect |
| --- | --- | --- |
| SLA policy precedence for overlapping agreement/customer/queue rules | Most-specific customer agreement, then customer policy, queue/type policy, organization default; reject equally ranked overlapping published rules | deterministic policy preview and explainable deadlines |
| Reopen window and late reply behavior | Allow customer reopen for 14 days after resolution; thereafter create a linked new case retaining prior history, subject to organization configuration | keeps old metrics stable while allowing help |
| Merge obligations from differing policies | Preserve source SLA evidence and outstanding deadlines as obligations on survivor; do not retroactively select the more lenient policy | requires explicit event/read model in CS-MERGE/SLA |
| Warranty entitlement evidence hierarchy | Contract/agreement version first, then product warranty effective at sale, then explicit goodwill decision | needs coordinated Maintenance terms review, no duplicate repair record |
| Return authorization validity and restock fees | Organization-configurable window; display zero fee unless an applicable published rule explicitly supplies one, and preview tax/refund impact before approval | prevents invented deductions and unclear customer commitments |
| Feedback privacy/retention | Keep comments private to authorized service management and customer-authorized follow-up; use shared retention policy, with de-identified aggregates when legally permitted | no public agent leaderboard or automatic comment publication |
| Public service routes and branding | Mount ServicePortal paths in the common suite account/support surface; preserve stable service URLs when Commerce is added | implementation decides routing integration while retaining one identity/access model |
