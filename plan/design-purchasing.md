# IronStone BOSS — Purchasing design

Oct 28, 2026 — draft; reviewed against research-purchasing.md, the reference apps and the other core designs ([review-core-apps.md](review-core-apps.md)); supplier pages move to the SupplierPortal root, the RFQ screens become QuoteRequests, and the bill, match, approval, budget, receipt, return and subcontract handoffs now name one owner and service each

IronStone Purchasing serves buyers, purchasing managers and requesters: suppliers, internal
purchase requests, sourcing, purchase orders and agreements, replenishment, receiving and
supplier returns, bill exceptions and supplier performance. A small business can carry a
purchase through settlement from contextual shared records; larger organizations separate
requesting, buying, receiving, matching and payment authority.

**Inputs.** [research-purchasing.md](research-purchasing.md) §1–§13,
[initial-design.md](initial-design.md), [design-doc-guide.md](design-doc-guide.md),
[style-guide.md](style-guide.md), [design-crosscut.md](design-crosscut.md),
[design-products.md](design-products.md), [design-warehouse.md](design-warehouse.md),
[design-accounting.md](design-accounting.md), [design-projects.md](design-projects.md),
[design-drawers-commons.md](design-drawers-commons.md), [ss-inventory.md](ss-inventory.md)
and [usl-inventory.md](usl-inventory.md). Current source governs claims of implemented behavior.
All additions explicitly marked proposed are documentation, not implemented APIs.

**Sections.** [1 shell](#1-shell) · [2 screens](#2-screens) · [3 home and suppliers](#3-home-and-suppliers) ·
[4 requests](#4-purchase-requests) · [5 sourcing](#5-sourcing) · [6 orders](#6-purchase-orders) ·
[7 agreements](#7-agreements) · [8 replenishment](#8-replenishment) · [9 receiving and returns](#9-receiving-and-returns) ·
[10 bills](#10-bills-and-matching) · [11 performance](#11-performance) · [12 settings](#12-settings) ·
[13 supplier access](#13-supplier-access) · [14 validation](#14-baseline-coverage-and-validation) ·
[15 outputs](#15-documents-and-outputs) · [16 needs](#16-framework-and-data-needs) ·
[17 decided](#17-decided) · [18 open](#18-open)

**Source convention.** Baseline paths are relative to
`runtime/component/mr-marble/screen/SimpleScreens/`; Mantle paths are relative to
`runtime/component/mr-mantle/`. Third-party references start at
`~/work/moquiwork/3p_other/`. Source files were inspected locally; third-party behavior is a
reference pattern, not an assumption about BOSS availability.

## 1. Shell

Root `screen/Purchasing.xml`, path `Purchasing`, icon `sym_o_shopping_cart`, uses
`BOSS_PURCHASING` and existing `mantle.party.PartyServices.setup#UserOrganizationInfo`.
The root and placeholders exist; the root grant is currently commented out in setup data.
This design does not claim that Purchasing is implemented.

Proposed capabilities separate **requester**, **buyer**, **planner**, **purchase approver**, **receiver**,
**inspector**, **match operator**, **finance approver/payer**, **report reader** and **purchase
administrator**. `app` below means authorized purchasing read access. Requesters see their
own or assigned requests; buyers see their buying organizations and authorized suppliers;
receiver/inspector grants confer warehouse actions on the shared mounts. AP approval/payment,
bank-detail change and authorized soft-lock exception require their own financial authority; there is no bypass of a hard-closed period. A buyer's app
context cannot grant those rights or disclose another organization's prices. Every transition,
export, job and direct service call enforces record, organization, field and action access.

The capability terms of this file map to proposed groups as below. Crosscut §1 holds the one
table of capability groups for all apps (D22); this is Purchasing's part of it. Purchasing owns
the first seven. The others are borrowed: a user who holds one gets the action on the
Purchasing mount without the owning app's root grant.

| Capability | Owner | Proposed group | What it allows here |
| --- | --- | --- | --- |
| requester | Purchasing | `BOSS_PURCHASING_REQUESTER` | Create and submit own purchase requests |
| buyer | Purchasing | `BOSS_PURCHASING_BUYER` | Source, award, create and send POs, revise orders, authorize supplier returns |
| planner | Purchasing | `BOSS_PURCHASING_PLANNER` | Run SupplyPlanning, edit reorder rules and the plan schedule, convert buy suggestions |
| purchase approver | Purchasing | `BOSS_PURCHASING_APPROVE` | Decide request, award, PO and supplier approvals |
| match operator | Accounting | Accounting's `BOSS_ACCOUNTING_MATCH`, the one match group; buyers who match bills are given it, and AP includes it (D4) | Evaluate and apply bill matches; request a hold release |
| report reader | Purchasing | `BOSS_PURCHASING_READ` | Read Purchasing lists and reports |
| purchase administrator | Purchasing | `BOSS_PURCHASING_ADMIN` | Edit purchasing policies, approval policies and request purposes |
| receiver, inspector | Warehouse | Warehouse receive and inspect groups | Receive on the shared ShipmentDetail; record inspections |
| quality administrator | Warehouse (shared quality) | the shared quality-administrator group | Edit inspection template drafts |
| supplier-price editor, price reader | Products | Products supplier-price groups | Edit supplier prices; read restricted prices |
| AP intake | Accounting | `BOSS_ACCOUNTING_AP` | Create a draft bill from a PO or receipt; upload bills |
| finance approver, payer | Accounting | `BOSS_ACCOUNTING_APPROVE`, `BOSS_ACCOUNTING_TREASURY` | Release holds (AP places them), approve payables, pay, edit bank details and supplier terms |
| financial reader, lease reader | Accounting | `BOSS_ACCOUNTING_READ` | Read supplier statements, payment summaries and lease schedules |
| supplier capability | external (crosscut §5) | the SupplierPortal group or a record-bound token | Supplier pages in the SupplierPortal root only |

A contextual reader is a user who reaches a shared record through a link they may already read;
it is not a group.

- Home — `Home`
- Suppliers — `Suppliers`
  - Supplier record — `Supplier360`; Supplier prices — `SupplierPrices`; Price explanation — `PriceExplain`
  - Product record — `Product360`, opened from the palette's product lookup or from any product link
- Purchase requests — `Requests`
  - Request record — `RequestDetail`; Source selected demand — `RequestSourcing`
- Sourcing — `QuoteRequests`, titled "RFQs" in the menu
  - RFQ record — `QuoteRequestDetail`; Supplier quotes — `Quotes`; Compare — `QuoteComparison`; Award — `Award`
- Purchase orders — `PurchaseOrders`
  - Order record — `OrderDetail`; Changes — `OrderChanges`; Acknowledgements — `Acknowledgements`
- Approvals — `Approvals` (request, award, PO and supplier approvals)
- Agreements — `Agreements`
  - Agreement record — `AgreementDetail`; Lease overview — `LeaseOverview` (`later`)
- Replenishment — `SupplyPlanning`
  - Availability — `InventoryAvailability`; Reorder rules — `ReorderRules`
- Receiving — `Receipts`
  - Shipment — `ShipmentDetail`; Inspections — `Inspections`; Inspection — `QualityInspection`
- Supplier returns — `Returns`
  - Return record — `ReturnDetail`
- Bills & matching — `Bills`
  - Bill record — `InvoiceDetail`; Match exceptions — `MatchExceptions`; Match — `InvoiceMatch`
- Performance — `Scorecards`
  - Spend — `Spend`; Commitments — `Commitments`; Procurement tracker — `ProcurementTracker`
  - Purchase history — `PurchaseHistory`; Supplier statement — `SupplierStatement`
- Settings — `Settings`
  - Buying policies — `PurchasePolicy`; Approvals — `ApprovalPolicies`; Scorecard policies — `ScorecardPolicies`
  - Inspection templates — `InspectionTemplates`

The supplier pages (`SupplierPortal`, `QuoteResponse`, `OrderAcknowledgement` and
`SupplierBillUpload`) are not in this menu. They sit under the separate supplier audience root
`screen/SupplierPortal.xml` (§13; D5).

**Placeholders and path convention.** Each menu section is a directory under
`screen/Purchasing/` whose default subscreen is the section's list: `Sourcing` (list
`QuoteRequests`), `Orders` (`PurchaseOrders`), `Receiving` (`Receipts`), `Replenishment`
(`SupplyPlanning`), `Performance` (`Scorecards`). A section with one list uses the list as the
parent (`Suppliers`, `Requests`, `Agreements`, `Returns`, `Bills`, `Approvals`, `Settings`). The existing `Quotes.xml`
placeholder is renamed `Sourcing.xml`. New placeholders are `Agreements.xml`, `Receiving.xml`,
`Bills.xml`, `Products.xml` and `Approvals.xml`. The design names these files; the screen XML is
changed when Purchasing is built.

Home counts my unsourced requests, RFQs due, quotes to compare, quotes expiring within the
policy's warning days, unconverted buy suggestions (shortfalls) with the plan's freshness,
approvals waiting, unacknowledged POs, late receipts and blocked bills. Each opens the same filtered worklist;
held amounts, committed spend and paid amounts are distinct. Worklists preserve query and
selection on back navigation. Empty lists offer permitted creation; loading/failure shows no
invented zero totals; access-limited fields are omitted or explicitly unavailable. Amounts use
decimal currency arithmetic and quantities retain the order, purchase-pack and stock UOM.

All Purchasing screens use XML widgets, including comparison as a split plus lists. Desktop
supports dense keyboard-oriented work; phones stack the same sections. The terminal offers
find/list/detail, numbered row selection and explicit confirmation for every action; comparison
selects a demand line then lists offers in normalized units. No browser-only drag or hover is
required. Shared handheld receiving/inspection follows Warehouse's one-task/scan/confirm
interaction and the same posting services. Online-first operations reconcile operation IDs
before retry after a timeout; a resubmitted form never assumes the earlier transaction failed.

Shell providers add authorized PO/RFQ/supplier lookup, a product lookup that opens
Purchasing's Product360 mount, quick create for request/RFQ/PO, Today items for due
requests/quotes/acknowledgements, and proposed supplier response, late receipt and
match-exception notification topics. They reuse Commons notifications, Chatter, record files,
activities and calendars. Source-record decisions power both local Approvals and Commons'
inbox; no second generic workflow engine is introduced.

The approval topics are proposed `PurchaseRequestApproval`, `PurchaseAwardApproval`,
`PurchaseOrderApproval` and `PurchaseSupplierApproval` (D8; R-PUR-14, R-PUR-15). Each topic's
approve handler is proposed `ironstone.purchasing.ApprovalServices.approve#PurchaseSource` and
its refuse handler is proposed `ironstone.purchasing.ApprovalServices.refuse#PurchaseSource`.
Both wrap the proposed `decide#PurchaseApproval`. Commons passes recordEntityName and recordId; the message
carries `messageJson.sourceRevision`, `policyVersion` and `decisionStepId`. A handler refuses a
stale revision and names the current one. The topic seed note belongs in
design-drawers-commons §4.
Needs **PUR-ACCESS**, **PUR-SHELL**, **PUR-APPROVAL**.

## 2. Screens

Paths below are proposed mounted routes. A shared screen is defined once by its owner;
its context blocks below specify only Purchasing's filters, tabs and action set. `later` rows
are intentionally designed beyond the first release, with their dependencies stated.

| Screen | Path | Archetype | Impl | Purpose | Main record | Reused | Roles | Scope | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Home | `Purchasing/Home` | landing | xml | Prioritize buyer work | purchasing work projection | own | app | new | purchasing work projection; counter filters |
| Suppliers | `Purchasing/Suppliers` | list | xml | Find and create suppliers | Party | own | app | parity | Party rows; list find parameters; selected supplier rows |
| Supplier360 | `Purchasing/Suppliers/Supplier360` | 360 | xml | Maintain supplier and procurement context | Party partyId | Supplier360, crosscut §3.3 | app | parity | Party partyId |
| SupplierPrices | `Purchasing/Suppliers/SupplierPrices` | list | xml | Maintain effective supplier prices | ProductPrice | Products Suppliers, Products §8; crosscut §3.21 | supplier-price editor | parity | external vendor, internal buyer, optional product |
| Product360 | `Purchasing/Products/Product360` | 360 | xml | Inspect variants, specifications and source data | Product productId | Product360, crosscut §3.5 | app | parity | Product productId |
| PriceExplain | `Purchasing/Suppliers/PriceExplain` | report | xml | Explain purchase price and agreement selection | price resolver inputs | PriceExplain, crosscut §3.21 | price reader | new | product and pricing inputs |
| Requests | `Purchasing/Requests` | list | xml | Capture and prioritize internal purchase demand | Request | own | requester; buyer | parity | Request rows; list find parameters; selected request rows |
| RequestDetail | `Purchasing/Requests/RequestDetail` | detail | xml | Review purchase request and source links | Request requestId | RequestDetail, Projects §6; crosscut §3.11 | requester; buyer | parity | Request requestId |
| RequestSourcing | `Purchasing/Requests/RequestSourcing` | wizard | xml | Allocate uncovered request quantity to RFQ or PO | RequestItem selection | own | buyer | new | RequestItem selection; supplier groups |
| QuoteRequests | `Purchasing/Sourcing/QuoteRequests` | list | xml | Manage supplier solicitations | Request RqtPurchaseRfq (proposed) | own | app | new | Request rows of type RqtPurchaseRfq (proposed); list find parameters |
| QuoteRequestDetail | `Purchasing/Sourcing/QuoteRequestDetail` | detail | xml | Prepare and send a revisioned multi-supplier RFQ | Request requestId | own | buyer | new | Request requestId |
| Quotes | `Purchasing/Sourcing/Quotes` | list | xml | Find supplier responses and standalone offers | proposed SupplierQuote | own | app | new | proposed SupplierQuote rows; list find parameters |
| QuoteDetail | `Purchasing/Sourcing/QuoteDetail` | detail | xml | Enter supplier offer, tiers and terms | proposed SupplierQuote supplierQuoteId | own | buyer | new | proposed SupplierQuote supplierQuoteId |
| QuoteComparison | `Purchasing/Sourcing/QuoteComparison` | split | xml | Compare normalized price, lead time and risk | RFQ and offer selection | own | app | new | RFQ requestId and revision; selected demand line and offer rows |
| Award | `Purchasing/Sourcing/Award` | wizard | xml | Commit selected offers to draft purchase orders | proposed PurchaseAward | own | buyer | new | proposed PurchaseAward; selected allocations |
| PurchaseOrders | `Purchasing/Orders/PurchaseOrders` | list | xml | Find and create purchase orders | OrderHeader | own | app | parity | OrderHeader rows; list find parameters; selected OrderHeader/part rows |
| OrderDetail | `Purchasing/Orders/OrderDetail` | detail | xml | Manage PO, receipt and financial progress | OrderHeader orderId | OrderDetail, crosscut §3.6 | app | parity | OrderHeader orderId; part and item selection |
| OrderChanges | `Purchasing/Orders/OrderChanges` | wizard | xml | Review and authorize PO revisions | OrderHeader orderId and revision | own | buyer; purchase approver | new | OrderHeader orderId and revision |
| Acknowledgements | `Purchasing/Orders/Acknowledgements` | list | xml | Review supplier promises and overdue responses | proposed PurchaseAcknowledgement | own | app | new | proposed PurchaseAcknowledgement rows; list find parameters; selected rows |
| Approvals | `Purchasing/Approvals` | list | xml | Decide current purchase approvals | proposed PurchaseApprovalDecision (pending) | Notifications, Commons §4; crosscut §3.15 | purchase approver | new | topic and recipient filters |
| Agreements | `Purchasing/Agreements` | list | xml | Find blanket and template agreements | Agreement | own | app | parity | Agreement rows; list find parameters |
| AgreementDetail | `Purchasing/Agreements/AgreementDetail` | detail | xml | Maintain terms, caps and releases | Agreement agreementId | own | buyer; purchase approver | parity | Agreement agreementId |
| LeaseOverview | `Purchasing/Agreements/LeaseOverview` | detail | xml | View lease terms and schedules in purchase context | proposed AccountingLease | Leases, Accounting §9 | lease reader | later | supplier, asset and organization |
| SupplyPlanning | `Purchasing/Replenishment/SupplyPlanning` | split | xml | Plan buy, make and transfer demand together | Requirement; proposed PlanningRun | SupplyPlanning, crosscut §3.20 | planner; buyer | new | run, facilities and selected requirements |
| InventoryAvailability | `Purchasing/Replenishment/InventoryAvailability` | list | xml | Explain stock, holds and projected supply | Asset and projections | InventoryAvailability, crosscut §3.7 | app | parity | product/facility/lot filters; asset selection |
| ReorderRules | `Purchasing/Replenishment/ReorderRules` | settings | xml | Maintain stock policy and scheduled planning | ProductFacility | own | planner; purchase administrator | parity | ProductFacility rows; list find parameters; selected rows |
| Receipts | `Purchasing/Receiving/Receipts` | list | xml | Track expected and late supplier receipts | Shipment and open PO items | own | app | parity | Shipment and OrderItem rows; list find parameters |
| ShipmentDetail | `Purchasing/Receiving/ShipmentDetail` | detail | xml | Inspect or receive an authorized shipment | Shipment shipmentId | ShipmentDetail, crosscut §3.8 | app | parity | Shipment shipmentId |
| Inspections | `Purchasing/Receiving/Inspections` | list | xml | Track purchase quality holds and outcomes | proposed QualityInspection | own | app | new | proposed QualityInspection rows; list find parameters |
| QualityInspection | `Purchasing/Receiving/QualityInspection` | task | xml | Capture and verify supplier receipt inspection | proposed QualityInspection | QualityInspection, crosscut §3.19 | inspector; contextual reader | new | inspection and source identity |
| InspectionTemplates | `Purchasing/Receiving/InspectionTemplates` | settings | xml | Configure versioned purchase quality checks | proposed InspectionTemplate | InspectionTemplates, crosscut §3.19 | quality administrator | new | template/version |
| Returns | `Purchasing/Returns` | list | xml | Manage supplier return authorizations | ReturnHeader | own | app | parity | ReturnHeader rows; list find parameters |
| ReturnDetail | `Purchasing/Returns/ReturnDetail` | detail | xml | Authorize supplier return and monitor settlement | ReturnHeader returnId | ReturnDetail, crosscut §3.18 | app | parity | ReturnHeader returnId |
| Bills | `Purchasing/Bills` | list | xml | Find supplier bills and upload source files | Invoice | own | app | parity | Invoice rows; list find parameters |
| InvoiceDetail | `Purchasing/Bills/InvoiceDetail` | detail | xml | Review bill, sources, holds and allowed settlement | Invoice invoiceId | InvoiceDetail, crosscut §3.16 | app | parity | Invoice invoiceId |
| MatchExceptions | `Purchasing/Bills/MatchExceptions` | list | xml | Resolve missing evidence and match variances | proposed InvoiceMatch and InvoiceHold | own | buyer; match operator | new | proposed InvoiceMatch rows; list find parameters; selected invoice rows |
| InvoiceMatch | `Purchasing/Bills/InvoiceMatch` | split | xml | Match accepted receipt and PO quantities to bill | InvoiceItem; proposed InvoiceMatch | InvoiceMatch, crosscut §3.22 | match operator | new | invoice, source lines and match revision |
| Scorecards | `Purchasing/Performance/Scorecards` | list | xml | Review supplier performance and risk | proposed SupplierScorecard | own | app | new | proposed SupplierScorecard rows; list find parameters; selected supplier rows |
| ScorecardDetail | `Purchasing/Performance/ScorecardDetail` | detail | xml | Explain period scores and source evidence | proposed SupplierScorecard supplierScorecardId | own | app | new | proposed SupplierScorecard supplierScorecardId |
| Spend | `Purchasing/Performance/Spend` | report | xml | Analyze purchases by supplier, product and period | purchase spend projection | own | app | new | report options |
| Commitments | `Purchasing/Performance/Commitments` | report | xml | Review open purchase and budget commitments | OrderItem; budget commitment projection | own | app | new | report options |
| ProcurementTracker | `Purchasing/Performance/ProcurementTracker` | report | xml | Trace demand through sourcing, receiving and payment | procurement lineage projection | own | app | new | report options |
| PurchaseHistory | `Purchasing/Performance/PurchaseHistory` | report | xml | Compare historic price and delivery evidence | OrderItem and AssetReceipt | own | app | new | report options |
| SupplierStatement | `Purchasing/Performance/SupplierStatement` | report | xml | Reconcile supplier bill, credit and payment movements | Invoice and Payment applications | own | financial reader | new | report options; supplier and organization |
| Settings | `Purchasing/Settings` | settings | xml | Navigate purchase policy and shared setup | organization settings | own | purchase administrator | new | organization |
| PurchasePolicy | `Purchasing/Settings/PurchasePolicy` | settings | xml | Set buying, revision and sourcing defaults | proposed PurchasePolicy | own | purchase administrator | new | proposed PurchasePolicy organization and version |
| ApprovalPolicies | `Purchasing/Settings/ApprovalPolicies` | settings | xml | Set revision-bound approval thresholds | proposed PurchaseApprovalPolicy | own | purchase administrator; financial reader | new | proposed PurchaseApprovalPolicy rows; selected policy |
| ScorecardPolicies | `Purchasing/Settings/ScorecardPolicies` | settings | xml | Set performance measures and response rules | proposed SupplierScorecardPolicy | own | purchase administrator | new | proposed SupplierScorecardPolicy organization and version |
| SupplierPortal | `SupplierPortal/Home` | landing | xml | Show the supplier only its published documents | record-bound supplier scope | own, external root; no internal app grant | supplier capability | new | record-bound supplier scope |
| QuoteResponse | `SupplierPortal/QuoteResponse` | task | xml | Submit a supplier response to an invitation | proposed PurchaseRfqInvitation | own, external root; no internal app grant | supplier capability | new | proposed PurchaseRfqInvitation invitationId and revision |
| OrderAcknowledgement | `SupplierPortal/OrderAcknowledgement` | task | xml | Acknowledge an authorized PO revision | proposed PurchaseAcknowledgement | own, external root; no internal app grant | supplier capability | new | OrderHeader orderId and revision |
| SupplierBillUpload | `SupplierPortal/BillUpload` | wizard | xml | Submit supplier bill evidence to AP intake | Invoice submission | SupplierBillUpload, Accounting §5; crosscut §5; external root | supplier capability | new | supplier, internal buyer and eligible source PO |

The four supplier rows are mounted under `screen/SupplierPortal.xml`, not under the Purchasing
root (D5). `SupplierPortal` keeps its screen name at the path `SupplierPortal/Home`, and
`SupplierBillUpload` keeps the shared screen's name at `SupplierPortal/BillUpload`.

## 3. Home and suppliers

### Home

**Layout.** landing; counters above my-work lists. The page is useful with only Purchasing access.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| BuyerCounters | display | Summarize authorized exceptions | unsourced, quote due, quotes expiring within N days, shortfall suggestions (unconverted buy suggestions, with plan freshness), approval, unacknowledged, late, held | count links with saved filters | proposed `ironstone.purchasing.BuyerServices.get#Home` | Carbon purchasing index; Odoo purchase dashboard |
| SpendSummary | list, read | Show recent committed and billed spend without combining measures | period, committed amount, billed amount, currency, snapshot date | drill to Spend; XML table first | proposed `ironstone.purchasing.ReportServices.get#PurchaseSpend` | ERPNext Buying workspace cards/charts |
| BuyerWork | list | Prioritize assigned demand and follow-ups | document, supplier, owner, due date, amount, next action | links to contextual records | proposed `ironstone.purchasing.BuyerServices.find#BuyerWork` | ERPNext Buying workspace; Carbon buyer work queue |

**Actions and states.** Spend trends use an accessible period table initially; shared Insights chart widgets are later presentation over the same query. Counts and rows use identical authorization and filters. Quick create opens Requests, QuoteRequests or PurchaseOrders. The shortfall counter opens SupplyPlanning filtered to unconverted buy suggestions; it shows the run date, so a stale plan is not read as no shortfall. The quotes-expiring counter uses the warning days in PurchasePolicy. A refresh failure retains the dated last result with an error; no action uses cached stock/approval state.



**Source.** research §1; Carbon `carbon/apps/erp/app/routes/x+/purchasing+/_index.tsx`; Odoo `odoo/odoo/addons/purchase/static/src/views/purchase_dashboard.xml`; ERPNext `frappe/erpnext/erpnext/buying/workspace/buying/buying.json`.

**Needs.** PUR-SHELL, PUR-ACCESS.

### Suppliers

**Layout.** list with find header and create dialogs.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| SupplierFind | find | Find authorized external supplier | name, ID, classification, buyer, active/risk, country | server party lookup | none | Supplier/FindSupplier OuterSearchForm |
| SupplierList | list | Show sourcing readiness and balances where allowed | supplier, contact, buyer, approval status, currency, open PO, risk | Supplier360 links | `mantle.party.PartyServices.find#Party`; proposed `ironstone.purchasing.SupplierServices.find#Suppliers` | Supplier/FindSupplier SupplierListForm; Carbon Supplier list |
| CreateSupplierPerson | dialog | Create an individual supplier | first/last name, email, phone, external ID | existing contact widgets | `mantle.party.PartyServices.create#Person`; `mantle.party.PartyServices.ensure#PartyRole` | Supplier/FindSupplier CreatePersonForm |
| CreateSupplierOrganization | dialog | Create a business supplier | organization name, external ID, contact, classifications | duplicate search before create | `mantle.party.PartyServices.create#Organization`; `mantle.party.PartyServices.ensure#PartyRole` | Supplier/FindSupplier CreateOrganizationForm |

**Actions and states.** Create requires supplier edit permission and adds the Supplier role; duplicate candidates open existing Supplier360. When PurchasePolicy requires supplier approval, a new supplier's proposed SupplierProfile starts Pending and a PurchaseSupplierApproval notification goes to the purchase approver (R-PUR-15). Disable sourcing is a dated supplier policy, not deleting Party or silently cancelling existing POs. Bulk owner/classification changes report supplier-ID failures independently.



**Source.** research §2; baseline Supplier/FindSupplier and Party/EditParty; Carbon `carbon/apps/erp/app/modules/purchasing/ui/Supplier/SupplierForm.tsx`.

**Needs.** PUR-SUPPLIER, PUR-ACCESS.

### Supplier360

**Context passed.** Mount `Purchasing/Suppliers/Supplier360`; [crosscut §3.3](design-crosscut.md#33-supplier360). Fix external supplier and authenticated buying organization. Tabs: Overview/contact, Products/prices, RFQs/quotes, Agreements, Purchase orders, Receipts/quality, Returns, Bills/payment summary, Payment details, Identifications and tax registrations, Performance, Chatter/files. Buyers edit sourcing terms, classifications, buyer and supplier status; finance alone changes bank/payment details. Supplier profile defaults are organization-specific; global Party contact changes need Party authority. Use existing Party/FinancialInfo financial summaries only with financial read capability. Proposed SupplierProfile stores buyer, default currency/terms/incoterm, purchase block reason and effective dates.

The shared Supplier360 forms PaymentDetails, PartyIdentifications and TaxRegistrations (crosscut §3.3; D26) show here. PaymentDetails is finance-gated and masked. It writes through `mantle.account.PaymentMethodServices.create#BankAccount` and `update#BankAccount` behind the finance guard, and a change voids any pending payment-run approval for the supplier. TaxRegistrations is finance-gated; PartyIdentifications follows Party authority. Default payment terms stay on the proposed SupplierProfile, and only finance edits them, through proposed `ironstone.purchasing.SupplierServices.store#SupplierProfile` with a finance-capability check on the terms fields. Finance also sets the proposed `SupplierProfile.selfBillingIndicator`, which lets the receipt bill SECA run for that supplier (D2; §10 Bills). Buyers see both values read-only.

The proposed `SupplierProfile.approvalStatus` (proposed seed Pending, Approved, Rejected, Suspended) records supplier onboarding (R-PUR-15). Submitting a Pending supplier for approval sends a PurchaseSupplierApproval notification through the same approval handlers as purchase documents (§6 Approvals). An RFQ or PO to a supplier that is not Approved gets the Warn or Stop result set in PurchasePolicy. Suspended works like the dated purchase block and keeps its reason. Source: research §2; Carbon supplier approval; ERPNext supplier hold. Needs **PUR-SUPPLIER**, **PUR-ACCESS**, **PUR-APPROVAL**.

### SupplierPrices

**Context passed.** Mount `Purchasing/Suppliers/SupplierPrices`; [Products §8](design-products.md#8-suppliers) and crosscut §3.21. Include the Products-owned supplier-price screen at physical `Shared/SupplierPrices.xml` with supplier fixed when entered from Supplier360. Only purchase-direction ProductPrice rows: vendorPartyId is external supplier, customerPartyId is internal buying organization or a permitted generic scope. Tabs/actions: dated tiers, supplier code/name, lead time, MOQ/increment, packaging, preferred source, agreement, import. `priceUomId` is currency; quantityUomId is quantity unit. Resolver is existing `mantle.product.PriceServices.get#ProductPrice` with the shared proposed rule/trace extension. Writes are ProductPrice entity create and update through Products' proposed guarded supplier-price mutation, `mantle.product.PriceServices.store#ProductPrice` (Products §8; R-PRD-05). Existing `modify#ProductPrice` is the resolver's price-modifier interface; only the price-rule extension reuses it (R-PUR-04). No duplicate supplier-product price table.

Dimensional units such as kg or each may appear in `quantityUomId`. A product-specific pack such as a case of 12 is a pack product linked by `PatPackagingFor`, not a global UOM conversion (crosscut §4.1; R-SA-14). A purchase in cases orders the pack product, or the base product in base units; Warehouse converts pack to base at receipt. Purchasing mounts only SupplierPrices and PriceExplain. It opens PriceLists by link, for a user with the price-policy grant (R-XC-23). Source: Catalog/Product/EditPrices NewPriceForm/PricesForm. Needs **PUR-SUPPLIER**, **CX-PRICING**.

### Product360

**Context passed.** Mount `Purchasing/Products/Product360`; [crosscut §3.5](design-crosscut.md#35-product360). Fix product/variant; tabs: identity, units/barcodes/packaging, supplier prices, purchase history, availability, specifications/documents and BOM links if granted. The purchase-history and BOM tabs are additions to the crosscut row (§18 Open, context deviations). Buyer can choose an actual SKU and authorized substitute, never silently order a virtual parent. A product that Products' proposed `mantle.product.ProductServices.check#ProductUsable` refuses for buying shows the lifecycle reason and offers no order action (D19). Product master edit, BOM change and cost edit retain their separate grants. Needs **CX-PRICING**, **CX-AVAILABILITY**.

### PriceExplain

**Context passed.** Mount `Purchasing/Suppliers/PriceExplain`; [crosscut §3.21](design-crosscut.md#321-price-lists-and-explanation). Use physical `Shared/PriceExplain.xml` with Products design ownership; pass product, external vendor, internal customer, quantity/UOM, currency, effective date and optional agreement. Show rule candidates, exclusions, conversions, selected tier, minimum/increment and override reason. Access checks hide another supplier's restricted cost/quote. Existing `OrderItem.productPriceId` and `isModifiedPrice` already record the selected price row and an override, and `unitListPrice` the list price; the proposed trace adds rule and version detail (R-PUR-32). Changing a supplier-price row cannot retroactively reprice a placed PO. Needs **CX-PRICING**.

## 4. Purchase requests

### Requests

**Layout.** list with My requests, Awaiting sourcing, Due and All authorized saved filters.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| RequestFind | find | Filter internal purchase demand | request ID, requester, buyer, status, required date, facility | date-period | none | Request/FindRequest ListRequests filters |
| RequestList | list | Show requested versus sourced quantities | request, requester, facility, due, approval, sourced/remaining | status and source links | proposed `ironstone.purchasing.RequestServices.find#PurchaseRequests` | Request/FindRequest ListRequests; ERPNext Material Request |
| NewPurchaseRequest | dialog | Capture internal demand | name/purpose, project, cost centre (proposed, Accounting AC-22), facility, response date, currency, requester | product lines in RequestDetail after save | `mantle.request.RequestServices.create#Request` with RqtPurchase | Request/FindRequest NewRequestForm |

**Actions and states.** Requester creates a draft and edits own permitted requests; buyer assigns, reviews and sources. Request list follows RequestDetail access even in batch actions. Bulk submit reports request-specific failures; it does not bypass the source approval policy.



**Source.** research §3; Request/FindRequest; ERPNext `frappe/erpnext/erpnext/stock/doctype/material_request/material_request.json`.

**Needs.** PUR-REQUEST, PUR-ACCESS.

### RequestDetail

**Context passed.** Mount `Purchasing/Requests/RequestDetail`; [Projects §6](design-projects.md#6-requests) and [crosscut §3.11](design-crosscut.md#311-requestdetail). Fix requestTypeEnumId=RqtPurchase, buying organization and permitted requester/assignment scope. Tabs: Overview, Items, Sourcing progress (the crosscut §3.11 PurchaseSourcingProgress form, loaded by proposed `ironstone.purchasing.RequestServices.get#PurchaseRequestProgress`), Approval (the crosscut §3.11 PurchaseRequestApproval form), related work/users/wiki links, Chatter/files. Use existing create/update#Request, replace#RequestParty and link/unlink#RequestRecord services in mantle.request.RequestServices; item CRUD derives from Request/EditRequestItems. Purpose uses existing Request.requestCategoryId/RequestCategory; project uses existing rootWorkEffortId or an authorized record link. The commitment's budget item comes from the line's GL account (the item type mapping or existing `OrderItem.overrideGlAccountId`) plus period; cost center and project become commitment dimensions only if Accounting adds them, and existing `RequirementBudgetAllocation` may be written as a link, not as the commitment (R-PUR-07; D10). Items retain productId, quantity, requiredByDate, maximumAmount, selectedAmount and supplierPartyId; proposed quantityUomId, organization scope and revision extend the source for unit-safe approvals. Shared Request status IDs remain ReqDraft, ReqSubmitted, ReqReviewed, ReqInProgress, ReqCompleted, ReqCancelled; Reviewed is triage, not financial approval. Submit invokes revision-bound purchase decision/commitment checks; source demand only after approval when policy requires it. Request cancellation releases unsourced demand, flags linked POs for an explicit cancellation decision and preserves history. Completed means quantity is fulfilled or explicitly closed with a reason; RFQ/PO issuance alone is In Progress.

In every app context the base RequestItems "Create purchase order" action opens `Purchasing/Requests/RequestSourcing` (R-PUR-01). The action is absent for a user without the buyer capability. No context calls `mantle.order.OrderServices.create#PurchaseRequestOrder` directly, because it sources every item again on each call, fails the whole request on one missing supplier and can place and approve POs. The BOSS guard in RequestSourcing rejects `placeAndApproveOrders=true` and quantities that are already sourced. The matching edits to Projects §6 RequestItems and crosscut §3.11 belong to those files.

Approval follows the PurchaseRequestApproval topic (§1; D8). Approving an RqtPurchase item creates or links one Requirement through the existing `RequirementRequestItem`, with type RqTpProduct for a product line or RqTpInternal otherwise, status RqmtStApproved, and the proposed Requirement organizationPartyId and quantityUomId of crosscut §3.20 (R-PUR-06; R-SA-15). The same approval calls Accounting's proposed `ironstone.accounting.BudgetServices.reserve#Commitment` for the request revision (D10). Refusing leaves the request ReqSubmitted with a refused PurchaseApprovalDecision; Request has no Rejected status. Cancelling the request calls proposed `release#Commitment` for the unsourced remainder.

`complete#RequestFromWork` does nothing for RqtPurchase and the proposed RqtPurchaseRfq; their progress comes from `get#PurchaseRequestProgress` (R-XC-40). Projects linked-work completion therefore never completes a purchasing or inventory request. An RFQ request (RqtPurchaseRfq) never opens in this mount; it routes to QuoteRequestDetail (R-PUR-13). Needs **PUR-REQUEST**, **PUR-APPROVAL**, **PUR-BUDGET**.

### RequestSourcing

**Layout.** wizard: select demand, choose route/supplier, review supplier groups, results.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| SourceDemand | wizard step | Choose uncovered approved lines | request/item, required qty, previously sourced, remaining, facility, date | row selection with lineage | proposed `ironstone.purchasing.RequestServices.preview#PurchaseSourcing` | Request/EditRequestItems RequestItemListForm; ERPNext Material Request sourcing |
| SourceGroups | wizard step | Review RFQ or direct-PO allocation | supplier, route, quantity/UOM, price/override, due, agreement, source revision | editable group list; PriceExplain link | proposed `ironstone.purchasing.RequestServices.preview#PurchaseSourcing` | ERPNext Material Request Make; existing create#PurchaseRequestOrder |
| ConvertDemand | wizard step | Create one transaction per independent supplier group | operation ID, group ID, source revision, selected allocations, results | confirmation; named retry rows | proposed `ironstone.purchasing.RequestServices.convert#PurchaseSourcing` extending `mantle.order.OrderServices.create#PurchaseRequestOrder` | OrderServices.create#PurchaseRequestOrder service; Request/EditRequestItems source items; ERPNext Material Request |

**Actions and states.** Preview checks source approval, supplier block and approval status, product usability through Products' proposed `check#ProductUsable` (D19), price, UOM and budget policy through Accounting's proposed `BudgetServices.check#Budget` (D10). Commit rechecks and locks remaining RequestItem/Requirement allocations and creates the PO plus lineage atomically per supplier group. Every PO or award line created from an approved request item records proposed `RequirementSupply` against that item's Requirement and an existing `RequestItemOrder` row; the conversion lock is on the Requirement's remaining quantity, so SupplyPlanning sees the demand as covered and cannot convert it again (R-PUR-06). The service never passes `placeAndApproveOrders=true` and refuses a request item whose quantity is already sourced (R-PUR-01). Draft POs stay OrderOpen; placing and approving are separate steps. MissingSupplier on request/item A does not discard valid supplier B; results name supplier, source lines, document, success/failure and retry operation. Retry only failed groups; existing successes return their document IDs. RFQ invitations do not consume committed supply. A purchase quote can originate without an internal request; the same explicit provenance rules apply when subsequently ordered.

**Fields for new result envelope.** `operationId`, `supplierGroupId`, `supplierPartyId`, `sourceRevision`, `requestItemKeys`, `requirementIds`, `requestedQuantity`, `allocatedQuantity`, `quantityUomId`, `resultStatus`, `orderId`, `orderPartSeqId`, `rfqRequestId`, `errorCode`, `errorMessage`, `retryable`. Each group retains its own completed result; no global success label on mixed results.

**Source.** research §3, §6; active service/mantle/order/OrderServices.xml create#PurchaseRequestOrder groups by supplier but returns scalar orderId/orderPartSeqId, returns early if any supplier is missing, and does not expose per-group outcomes. It is not already the batch contract specified here.

**Needs.** PUR-REQUEST, PUR-RFQ, PUR-BUDGET.

## 5. Sourcing

### QuoteRequests

**Layout.** list with response-deadline filters and create dialog.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| QuoteRequestFind | find | Find open or historic solicitations | RFQ, buyer, supplier invited, deadline, status | date-period | none | ERPNext RFQ list |
| QuoteRequestList | list | Show solicitation progress | RFQ, revision, due, invited/responded, selected/remaining | response counters | proposed `ironstone.purchasing.SourcingServices.find#QuoteRequests` | ERPNext RFQ; Carbon Purchasing RFQ list |
| NewQuoteRequest | dialog | Create a purchase solicitation | name, buying organization, facility, currency, response deadline, source request | source lookup | proposed `ironstone.purchasing.SourcingServices.create#QuoteRequest` | ERPNext request_for_quotation; Carbon PurchasingRFQForm |

**Actions and states.** Create uses proposed RqtPurchaseRfq, never customer-facing RqtQuote. Open QuoteRequestDetail; clone drafts copies only reusable specifications/terms, not prior invitation capabilities, quote decisions or supply links.



**Source.** research §4; `frappe/erpnext/erpnext/buying/doctype/request_for_quotation/request_for_quotation.json`; `carbon/apps/erp/app/modules/purchasing/ui/PurchasingRfq/PurchasingRFQForm.tsx`.

**Needs.** PUR-RFQ, PUR-ACCESS.

### QuoteRequestDetail

**Layout.** detail with Items, Invited suppliers, Responses, Award progress and Chatter/files tabs.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| QuoteRequestHeader | single | Maintain solicitation revision | name, buyer, organization, deadline, currency, shipping/billing address, terms | status bar | proposed `ironstone.purchasing.SourcingServices.store#QuoteRequest` | ERPNext RFQ header; Request/EditRequest EditRequest |
| QuoteRequestItems | list, editable rows | Specify requested products and service lines | source demand, product/specification, qty/UOM, due, substitutes allowed | Product360 and source links | proposed `ironstone.purchasing.SourcingServices.store#QuoteRequestItem` | Request/EditRequestItems NewRequestItemForm/RequestItemListForm; Carbon RFQ lines |
| QuoteRequestSuppliers | list, editable rows | Select eligible supplier recipients | supplier, contact, send channel, deadline, response, capability expiry | contact lookup; preview | proposed `ironstone.purchasing.SourcingServices.store#QuoteInvitation` | ERPNext RFQ suppliers table |
| SendQuoteRequest | dialog | Preview and send the published revision | revision, recipients, message, selected public attachments, expiry | recipient preview; confirmation | proposed `ironstone.purchasing.SourcingServices.send#QuoteRequest` | ERPNext RFQ email/attachment controls; Carbon FinalizeRFQModal |
| QuoteRequestResponses | list, read | Review offers and awarded balance | supplier, quote, received date, validity, response status, award qty | QuoteComparison and QuoteDetail links | proposed `ironstone.purchasing.SourcingServices.get#QuoteRequest` | Carbon RFQ responses |

**Actions and states.** Draft edits are free within permission. Send freezes a published revision and supplier-specific invitation; material edits create a new revision, invalidate old unaccepted award previews, and require a new explicit send. Cancel/reopen retain prior versions and revoke or replace invitations. Request lifecycle remains existing Req* states: published solicitation is Submitted, reviewed offers Reviewed, active award fulfillment InProgress, completed/closed demand Completed. Approval decisions and supplier-response states are separate. Sending to one invalid contact yields InvitationDeliveryFailed for that invitation and continues other recipients; the result does not mark unsent invitations sent.

**Request-type policy.** RqtPurchaseRfq is excluded from Commons, Projects and Customer Service request lists and from every RequestDetail mount (R-PUR-13). Its request-type policy turns off generic triage, work-link completion and Convert to project, because Submitted here means published and Reviewed means offers reviewed. Every open of an RFQ request, from any link or the palette, routes to `Purchasing/Sourcing/QuoteRequestDetail`. The policy belongs to CX-REQUEST and PUR-RFQ.

**Data contract.** Proposed `mantle.order.purchase.PurchaseRfqInvitation` carries invitationId, requestId, rfqRevision, supplierPartyId, contactMechId, deadline, status, sentAt, responseAt and capability reference. Send creates the invitation's capability through proposed `mantle.party.ExternalAccessServices.create#AccessCapability` (record, revision, supplier, scope `QuoteResponse`, expiry) and mails a token-route link `/rfq/<token>` (crosscut §5; D5). Cancel, a new revision or the award's close step revokes it through `revoke#AccessCapability`. A proposed source-allocation relation links request items/requirements to RFQ items with quantity/UOM; invitations and quotes never reserve stock or count as incoming supply. Public documents exclude internal maximum prices, competing suppliers and private source-request notes.

**Source.** research §4; ERPNext request_for_quotation JSON/JS; Carbon PurchasingRFQForm and `carbon/apps/erp/app/routes/share+/purchasing-rfq.$id.tsx`; active Request/RequestItem source.

**Needs.** PUR-RFQ, PUR-PORTAL, PUR-SHELL.

### Quotes

**Layout.** list across RFQ responses and supplier-initiated offers.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| QuoteFind | find | Filter supplier offers | supplier, RFQ, buyer, product, valid date, state | date-period | none | ERPNext Supplier Quotation list |
| QuoteList | list | Show commercial offers | supplier, reference, currency, valid thru, lead time, RFQ, amount | QuoteDetail link | proposed `ironstone.purchasing.SourcingServices.find#SupplierQuotes` | ERPNext Supplier Quotation; Carbon SupplierQuote |
| NewSupplierQuote | dialog | Record an email/phone or unsolicited quote | supplier, internal organization, supplier reference, date, validity, currency, optional RFQ | Supplier360 lookup | proposed `ironstone.purchasing.SourcingServices.store#SupplierQuote` | ERPNext Supplier Quotation header |

**Actions and states.** Buyers may enter on behalf of a supplier with provenance/channel and evidence; received supplier submissions remain distinguishable. Expired/rejected/superseded quotes are visible history but ineligible for award without a new supplier-confirmed revision.



**Source.** research §4; `frappe/erpnext/erpnext/buying/doctype/supplier_quotation/supplier_quotation.json`.

**Needs.** PUR-RFQ, PUR-ACCESS.

### QuoteDetail

**Layout.** detail with Lines/tiers, Terms, Evidence and Award links.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| QuoteHeader | single | Maintain supplier offer evidence | supplier/reference, version, quote/valid dates, currency, terms, delivery, source channel | record files; revision badge | proposed `ironstone.purchasing.SourcingServices.store#SupplierQuote` | ERPNext Supplier Quotation header |
| QuoteLines | list, editable rows | Record offered specification and price breaks | RFQ/source line, product, supplier code, offered qty/UOM, lead days, unit price, substitute | tier child list and Product360 | proposed `ironstone.purchasing.SourcingServices.store#SupplierQuoteItem` | Carbon SupplierQuoteLinePricing; ERPNext Supplier Quotation Item |
| QuoteTerms | single | Record offer qualifications | MOQ/increment, freight estimate, tax inclusion, incoterm, payment term, warranty, notes | typed amounts/currency; public attachment selection | proposed `ironstone.purchasing.SourcingServices.store#SupplierQuote` | ERPNext quotation terms; Carbon quote details |
| QuoteAwards | list, read | Trace accepted portions | award, quantity, PO/item, remaining, cancelled/reopened | source links | proposed `ironstone.purchasing.SourcingServices.get#SupplierQuote` | Carbon SupplierQuoteToOrderDrawer |
| PublishPrice | dialog | Publish a negotiated quote price as an effective supplier price | quote item or price break, quote version, effective from/thru, agreement, quantity tier, currency | confirmation with the price row it creates or ends | proposed `ironstone.purchasing.SourcingServices.publish#SupplierQuotePrice` | ERPNext Supplier Quotation; Products §8 supplier-price store |

**Actions and states.** Validate units and supplier identity before accepting a submitted offer. Amendments create a new version; active awards retain their original terms. Buyer may reject with reason; retraction cannot delete a linked PO. PublishPrice is the only path from a quote to a supplier price (R-PUR-21). It needs the supplier-price editor capability. Proposed `publish#SupplierQuotePrice` writes the ProductPrice row through Products' proposed `mantle.product.PriceServices.store#ProductPrice`, preserves effective dates, and records the source quote and version on the row. An offer is not inventory supply or a binding PO. Quote evidence files use a proposed `SupplierQuoteContent` keyed by the single field supplierQuoteId (D25).



**Source.** research §4; local ERPNext supplier_quotation.json includes valid_till, conversion_rate, incoterm and terms; Carbon `carbon/apps/erp/app/modules/purchasing/ui/SupplierQuote/SupplierQuoteToOrderDrawer.tsx`.

**Needs.** PUR-RFQ, PUR-SUPPLIER.

### QuoteComparison

**Layout.** split: demand lines at left, normalized offers and evidence at right; no custom matrix.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| CompareBasis | single | Fix the comparison basis | RFQ revision, demand qty/UOM, display currency, FX date/rate source, delivery date | currency and UOM selectors | proposed `ironstone.purchasing.SourcingServices.compare#SupplierQuotes` | Carbon SupplierQuoteCompareDrawer; ERPNext Supplier Quotation Comparison |
| OfferComparison | list, read | Compare eligible supplier tiers | supplier, offered product, normalized price, freight/tax estimate, lead time, on-time delivery rate from scorecard evidence, validity, risk | sort with explanation; original quote drill-in | proposed `ironstone.purchasing.SourcingServices.compare#SupplierQuotes` | Carbon SupplierQuoteCompareDrawer quantity tiers |
| SelectOffer | list, editable rows | Allocate line quantities across offers | source line, quote/item/tier, selected qty, substitute approval, selection reason | explicit selection; unallocated remainder | proposed `ironstone.purchasing.SourcingServices.preview#Award` | Carbon quote compare/select-items step |

**Actions and states.** Compare committed offer unit prices and estimated landed cost separately. Original currency, quote conversion and timestamp remain visible; absent freight/FX or incompatible UOM is Unknown/Not comparable, not zero/cheapest. Ranking does not choose or approve a supplier. Substitute requires product/specification authority and requester acceptance where policy requires it; incompatible released BOM material is referred to Manufacturing change review.

**Devices.** Narrow browser and terminal select one demand item and then one offer list; fields/totals are identical. Keyboard row selection and explicit Add allocation replace matrix gestures. Allocation totals always show demanded, selected and remaining quantities.

**Source.** research §4; inspected `carbon/apps/erp/app/modules/purchasing/ui/SupplierQuote/SupplierQuoteCompareDrawer.tsx` selects quantity tiers then items; ERPNext `frappe/erpnext/erpnext/buying/report/supplier_quotation_comparison/supplier_quotation_comparison.py`.

**Needs.** PUR-RFQ, PUR-REPORTS.

### Award

**Layout.** wizard: validate selected offers, review PO groups/approvals, commit and results, close the solicitation.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| AwardPreview | wizard step | Validate a proposed award | source revision, quote versions, qty/UOM, supplier, price, due, budget decision | grouped list; stale source errors | proposed `ironstone.purchasing.SourcingServices.preview#Award` | Carbon SupplierQuoteToOrderDrawer |
| AwardCommit | wizard step | Create revision-bound purchase commitments | operation ID, supplier group, selected allocations, approver decision, PO results | confirmation; retry failed group | proposed `ironstone.purchasing.SourcingServices.commit#Award` | Carbon quote-to-order conversion; ERPNext Make Purchase Order |
| CloseSolicitation | wizard step | Close the losing side of the RFQ | remaining invitations, Not awarded mark, regret notice yes/no, message, recipients, per-recipient outcome | per-recipient preview; confirmation | proposed `ironstone.purchasing.SourcingServices.close#QuoteRequest`; `mantle.party.ExternalAccessServices.revoke#AccessCapability` | Odoo purchase_alternative warning wizard |

**Actions and states.** Commit locks remaining request/requirement demand and quote allocation, then creates PurchaseAward, draft PO/item and RequestItemOrder/RequirementSupply links atomically per supplier group. It never auto-approves or auto-sends a PO. Double-click/retry returns existing results. QuoteExpired, SourceChanged, SupplierBlocked, BudgetStop, InvalidSubstitute and DemandAlreadyCovered identify the supplier/line; independent groups continue. Cancelling an unfulfilled PO releases remaining allocation by explicit recorded close/cancel; received/billed portions stay linked. Partial awards leave the uncovered demand available to a subsequent run. An award that needs approval sends a PurchaseAwardApproval notification and stays draft until decided; refusal leaves the award draft (D8). Preview checks the budget through Accounting's proposed `check#Budget` and product usability through Products' proposed `check#ProductUsable` (D10; D19).

CloseSolicitation is the last step (R-PUR-35). It marks each invitation without an award Not awarded, revokes its capability, and optionally sends a reviewed regret notice with a per-recipient outcome. It warns when other draft POs for the same demand remain. Offers stay as history.

**Proposed model.** `mantle.order.purchase.SupplierQuote`, `SupplierQuoteItem`, `SupplierQuotePriceBreak` store commercial versions and source mappings; `PurchaseAward` stores chosen quote version/tier, demand reference, PO/item, quantity/UOM, conversion snapshot, amount, decision revision and operation identity. Canonical `RequirementSupply` tracks actual supply allocation; award rows reference it rather than counting a second supply quantity.

**Source.** research §4–§6; Carbon SupplierQuoteToOrderDrawer; active RequestItemOrder and RequirementOrderItem.

**Needs.** PUR-RFQ, PUR-REQUEST, PUR-BUDGET.

## 6. Purchase orders

### PurchaseOrders

**Layout.** list with Draft, Awaiting approval, Open, Late, Received not billed and Closed views.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| OrderFind | find | Filter purchase parts for the buying organization | PO, supplier, buyer, status, facility, date, receipt/bill progress | date-period and supplier lookup | none | Order/FindOrder OrderList filters |
| PurchaseOrderList | list | Show operational progress | PO, supplier, due, total, approved, received, billed, balance | quantity/amount columns stay distinct | proposed `ironstone.purchasing.OrderServices.find#PurchaseOrders` | Order/FindOrder OrderList |
| CreatePurchaseOrder | dialog | Start a manual or agreement release PO | external supplier, internal buyer, currency, facility, date, agreement, source | supplier and facility lookup | `mantle.order.OrderServices.create#Order` | Order/FindOrder CreatePurchaseOrder |
| ApprovePurchaseOrders | list, bulk | Approve individually eligible source revisions | selected order IDs/revisions, decisions, budget result | confirmation; per-order result | proposed `ironstone.purchasing.ApprovalServices.decide#PurchaseApproval` before `mantle.order.OrderServices.approve#Order` | Order/FindOrder ApproveOrdersForm |
| ClosePurchaseOrders | list, bulk | Close explicit remaining commitments | selected order IDs/revisions, reason, remaining qty | confirmation and per-order result | proposed `ironstone.purchasing.OrderServices.close#PurchaseRemainders` using `mantle.order.OrderServices.cancel#OrderItem` with an explicit cancelQuantity and `mantle.order.OrderServices.complete#Order` | Order/FindOrder CloseOrdersForm |
| MergeDraftPurchaseOrders | list, bulk | Merge draft POs for one supplier (`later`) | selected draft order IDs, supplier, buying organization, currency, target order, kept source links | preview of merged lines; confirmation | proposed `ironstone.purchasing.OrderServices.merge#DraftPurchaseOrders` | Odoo purchase order merge action |

**Actions and states.** Approve cannot use a stale revision or self-approval prohibited by policy. `decide#PurchaseApproval` calls Accounting's proposed `BudgetServices.convert#Commitment` to turn the request reservation into a PO commitment, or `reserve#Commitment` for a PO with no request, under lock (D10; R-XC-37). Accounting's `approve#Payable` later converts the PO commitment to actual. With no active approval policy, one step by the purchase-approver capability approves, and self-approval needs an explicit policy setting (R-PUR-14). Batch orders are independent: failed PO IDs are reported while permitted orders finish. Placing, approving and sending remain separate operations.

Close remainder is explicit and has one owner, proposed `close#PurchaseRemainders`, whichever app starts it (R-PUR-10). Warehouse's proposed `WarehouseTaskServices.close#ReceiptRemainder` delegates to it for ShpTpPurchase sources, with a reason and operationId (R-SB-11). Per item, the purchase remainder is quantity − quantityCancelled − Σ AssetReceipt (accepted + rejected), net of supplier returns per policy (R-PUR-03). The service records it on the existing `OrderItem.quantityCancelled` by calling `cancel#OrderItem` with that explicit cancelQuantity. It releases the Requirement allocation and calls `release#Commitment` for the unused budget. It sets OrderCompleted only when nothing is open. Purchase parts never call `cancel#OrderItem` or `cancel#OrderPart` without an explicit cancelQuantity, because their default measures outbound AssetIssuance and would cancel the full ordered quantity after a receipt. Delivered and invoiced quantities stay.

MergeDraftPurchaseOrders is `later` (R-PUR-35). It merges OrderOpen POs with the same supplier, buying organization and currency; lines keep their RequestItemOrder and RequirementSupply links.



**Source.** research §5; Order/FindOrder; Odoo purchase_views.xml buttons and ERPNext purchase_order.json.

**Needs.** PUR-ORDER, PUR-APPROVAL, PUR-BUDGET.

### OrderDetail

**Context passed.** Mount `Purchasing/Orders/OrderDetail`; [crosscut §3.6](design-crosscut.md#36-orderdetail). Filter purchase parts to vendor=external supplier and customer=authorized internal buyer. Tabs: Header/addresses/terms, Items, Sources (request, requirement, award), Approvals and revisions, Acknowledgements, Receipts/inspection, Bills/match, Money (finance capability), Returns, Agreements, History, Chatter/files. Buyer actions create/update draft header/parts/items, price explain, submit/place, approve with separate grant, send revision, hold, change (OrderChanges), cancel remaining, close, clone, print and match exceptions; a user with a stock role also receives from here. The tabs and actions beyond the crosscut §3.6 Purchasing row are listed in §18 Open for crosscut to adopt (R-PUR-11). Finance handles payment/application through shared InvoiceDetail with its capability. Source baseline: Order/OrderDetail, OrderItems, PrintOrder; active `mantle.order.OrderServices.create#OrderPart`, `update#OrderHeader`, `update#OrderPart`, `create#OrderItem`, `update#OrderItem`, `delete#OrderItem`, `add#OrderProductQuantity`, `place#Order`, `approve#Order`, `update#OrderStatus`, `cancel#Order`, `cancel#OrderPart`, `cancel#OrderItem`, `complete#OrderPart`, `clone#Order`; display via `mantle.order.OrderInfoServices.get#OrderDisplayInfo`. Creating or changing an item calls Products' proposed `check#ProductUsable` for buying (D19).

**Send.** Send revision calls proposed `ironstone.purchasing.OrderServices.send#PurchaseOrder` (R-PUR-02). In: orderId, orderPartSeqId, orderRevision, recipient contactMechIds, template, message, the PDF of the rendered revision and operationId. Recipients default to the vendor party's `EmailOrder` address, then `EmailPrimary`. It sends through `mantle.party.CommunicationServices.send#EmailDraft`, dedupes on order, revision and recipient, records the delivery outcome per recipient, and on success moves the part OrderApproved → OrderSent. The PO link in the mail is a `/po/<token>` token route to OrderAcknowledgement (§13). Mantle's `send#OrderStoreEmail` is not used for POs: it sends nothing when the order has no ProductStore, addresses the customer party (the internal buyer on a PO), and never re-sends an email type already sent, so a new revision would never go out.

**Statuses.** The order statuses are OrderBeingChanged, OrderOpen, OrderRequested, OrderProposed, OrderPlaced, OrderHold, OrderProcessing, OrderApproved, OrderSent, OrderCompleted, OrderRejected and OrderCancelled (R-PUR-05). Mantle allows OrderBeingChanged only from OrderOpen or OrderProposed, and has no OrderSent → OrderHold transition. Its un-approve (OrderApproved → OrderPlaced) runs the OrderPlaced SECAs again, so BOSS does not use it to unlock a PO. A buyer's hold and a revision lock both use OrderHold through proposed `mantle.order.OrderServices.hold#Order` and `release#OrderHold`, each recorded as a proposed `mantle.order.OrderHoldReason` row with type Purchase or Change (D7; R-SB-07, R-SB-08). A Sent PO first un-sends to OrderApproved ("Approve (un-send)"), then holds. `release#OrderHold` returns the order to OrderApproved only when no other open reason remains, so Purchasing cannot release Accounting's credit hold or another app's change. Refuse on approval moves OrderPlaced → OrderRejected.

**Bills and money.** "Create draft bill" opens the shared InvoiceFromSource dialog of crosscut §3.6 for a user with AP intake (`BOSS_ACCOUNTING_AP`) or finance capability (D2; R-PUR-16). It calls Accounting's proposed `ironstone.accounting.InvoiceServices.create#InvoiceFromSource`, either on the ordered basis (`mantle.account.InvoiceServices.create#EntireOrderPartInvoice`) or on the accepted, released received basis, behind Accounting's duplicate and source guard. It never calls `create#PurchaseShipmentInvoices` directly, because that service bills rejected and quarantined units. The Money tab (finance capability) offers "request supplier prepayment" (R-PUR-36). That creates an Accounting payment request linked to the order part through existing `mantle.order.OrderServices.add#OrderPartPayment`, and the match applies it when the bill arrives. The approval guard below keeps a covering prepayment from approving the PO on its own (R-SB-10).

**Service acceptance.** For a service or non-stock line, the Items tab offers RecordServiceAcceptance (R-PUR-09), for a receiver or for the requester named as acceptor. It records orderId and orderItemSeqId, accepted quantity and UOM, acceptance date, acceptor, an evidence file and operationId through proposed `ironstone.purchasing.ReceiptServices.accept#ServiceItem`, which writes proposed `mantle.order.purchase.ServiceAcceptance`. The evidence file attaches to the order through existing OrderContent. InvoiceMatch reads the acceptance under the match policy's service-acceptance rule. For a subcontract line nobody enters it by hand: Manufacturing's proposed `receive#SubcontractOutput` calls `accept#ServiceItem` with the output receipt and inspection evidence (D14; R-SA-13).

**Order context rules.** Supplier confirmation maps to existing OrderPart.otherPartyOrderId/
otherPartyOrderDate where suitable, while proposed acknowledgement history captures each
confirmed revision, item quantity and promised date. Header orderRevision exists; immutable
revision snapshots, approval invalidation and supplier acceptance history are proposed.
Editing a released PO uses OrderChanges; hiding inputs is insufficient protection. Existing
OrderPart/OrderItem required/delivery dates are retained with the original requested date for
performance measurement. Recurring releases create a new draft release and recheck agreement
caps/approval; they never repeat a past receipt, bill or payment.

A stock item names a destination facility; a non-stock/service line names its acceptance owner
and two-way/acceptance policy, and records acceptance through RecordServiceAcceptance. Buying
changed material cannot silently alter a released BOM snapshot. Tax, posting and exchange
policies remain Accounting-owned; purchase estimates are labelled estimates. Landed-cost
allocation is Accounting's `Accounting/Payables/LandedCosts` task, posted through
proposed `AssetBookServices.post#LandedCost`; Purchasing links to it from InvoiceDetail and Spend
(§17 Decided, landed costs).

**Subcontracting** (D14; R-PUR-22). Manufacturing's subcontract requirements appear in
SupplyPlanning with method outside processing. Converting one creates the service OrderItem
with an existing `OrderItemWorkEffort` row to the operation work effort (`requiredWork` Y) and a
proposed RequirementSupply row; the service quantity and UOM come from the requirement, and the
expected acceptance evidence is the output receipt and its inspection. Purchasing owns the
service PO and `accept#ServiceItem`. Warehouse dispatches and returns components at
`Warehouse/Transfers/SubcontractShipmentDetail`, to a vendor-custody facility whose
`ownerPartyId` is the organization, with the supplier as a FacilityParty (proposed role
Custodian), so the stock stays the company's and ownership does not become a purchase (R-SA-08).
Outside processing completion and the return of components are separately evidenced.
Manufacturing's proposed `receive#SubcontractOutput` receives the processed output once, under
one receipt identity shared by Manufacturing and Warehouse, consumes the components and calls
`accept#ServiceItem` (R-SA-13). The output is never received on the service
PO line, and service lines never get a receipt-SECA bill; the supplier's service invoice comes
in through `import#Bill`, adds authorized production cost and creates no second finished-stock
receipt.

**Drop-ship.** Drop-ship purchase orders are an Open item (§18). Until they are confirmed, a
drop-ship line links the customer order and the supplier-to-customer shipment and never invents
a receipt into the buyer's warehouse. Mantle's ShpTpDrop has no parent shipment type, so no
invoice SECA runs for it (R-SB-20). In the recommended design the proposed `confirm#DropShipDelivery`
calls Accounting's proposed `create#InvoiceFromSource` for both the customer invoice and the
supplier bill.

**Existing automation on the PO path** (D1; crosscut §1.3 register).

| Mantle SECA | What it does on a PO | This design |
| --- | --- | --- |
| `OrderPlacedAutoApprove` (`autoApprove#Order`) | Approves a placed order whose payments cover the total and whose `check#OrderPreApprove` returns no warning; with no ProductStore that includes a prepaid or zero-total PO | Conditioned: proposed SECA `ironstone.purchasing.ApprovalServices.check#PurchaseApprovalRequired` on `mantle.order.OrderInfoServices.check#OrderPreApprove` adds an approve warning for any purchase part whose vendor is not OrgInternal and that lacks a current PurchaseApprovalDecision for the order revision (D8; R-SB-10) |
| `OrderPlacedSendEmail`, `OrderApprovedSendEmail` (`send#OrderStoreEmail`) | Nothing; a PO has no ProductStore | Kept; the proposed `send#PurchaseOrder` sends POs |
| `OrderPlacedReserveAssets`, `OrderApprovedReserveAssets`, `OrderItemCreateCheckReserve`, `OrderItemUpdateCheckReserve` | Nothing; reservation returns early when the vendor is not an internal organization | Kept |
| `OrderPlacedAuthorizePayments` (`authorize#OrderPayments`) | Nothing; it returns without a ProductStore | Kept; a supplier prepayment is an Accounting payment request |
| `OrderApprovedNotify` | High-priority order notice | Kept |
| `OrderItemWorkEffortCheckComplete` | Completes the part when every `requiredWork` work effort is complete, closed or cancelled and the items are received | Kept; a subcontract service line completes with its operation, and matching still waits for `accept#ServiceItem` |
| `ShipmentIncomingDeliveredCreateInvoices` | Bills a delivered incoming shipment | Conditioned to self-billing suppliers (§10 Bills; D2) |
| `ReturnApprovedProcess` | Creates the ShpTpPurchaseReturn shipment; its response processing does nothing for a supplier return | Conditioned (crosscut §1.3; D11): approval only creates the return shipment, which on a supplier return is all it does (§9 ReturnDetail) |

**Needs.** PUR-ORDER, PUR-APPROVAL, PUR-BUDGET, PUR-RECEIPT, PUR-DROPSHIP.

### OrderChanges

**Layout.** wizard: propose changes, show effects, obtain current approval, publish revision.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ProposedChange | wizard step | Capture requested PO change | order/revision, item, qty/UOM, price, required date, substitute, reason | old/new values | proposed `ironstone.purchasing.OrderServices.preview#PurchaseRevision` | Odoo locked confirmed PO; Carbon PO revisions |
| RevisionEffects | display | Show operational and financial dependencies | received/billed qty, open shipment, budget delta, agreement cap, demand allocation | source links; blocked change reasons | proposed `ironstone.purchasing.OrderServices.preview#PurchaseRevision` | Carbon purchase order revision history |
| ApplyRevision | wizard step | Commit approved revision and notification obligation | operation ID, source revision, decision ID, effective date, reason, notify recipients | explicit confirm; retry status | proposed `ironstone.purchasing.OrderServices.apply#PurchaseRevision`; `mantle.order.OrderServices.increment#OrderRevision` as guarded primitive | Carbon revision approval; Odoo unlock/lock |

**Actions and states.** Refuse decreasing below received/billed/returned net constraints, changing currency/supplier on a progressed part or editing posted evidence. Price/date/spec changes invalidate affected decisions and supplier acknowledgements. A revision plus allocation/budget changes commits atomically; email delivery is a separately reported retryable obligation tied to that revision. SupplierRejectedRevision leaves the previous confirmed contract visible and requires buyer resolution; no automatic replacement of already received material.

**Lock and apply** (D7; R-PUR-05, R-SB-07). Starting a revision on a placed, processing or approved PO calls proposed `hold#Order` with an OrderHoldReason of type Change, sourced to the proposed PurchaseOrderRevision; a Sent PO first un-sends to OrderApproved. Mantle treats a held order as editable. `apply#PurchaseRevision` then, in one transaction: writes the changes, calls `increment#OrderRevision`, calls Warehouse's proposed `mantle.shipment.WarehouseTaskServices.adjust#ExpectedReceipt` to set each open ShpTpPurchase source to the new remaining quantity (R-SB-13), calls Accounting's proposed `convert#Commitment` or `release#Commitment` for the budget delta (D10), and calls Accounting's proposed `MatchServices.queue#MatchReevaluation` for the affected bills (R-SB-19). `adjust#ExpectedReceipt` refuses to go below the received quantity and returns ReceiptInProgress when a receive operation holds the source; the revision then fails with that named result. After policy approval, `release#OrderHold` returns the order to OrderApproved and the buyer resends the new revision through `send#PurchaseOrder`.

**New revision envelope fields.** `operationId`, `orderId`, `orderRevision`, `proposedRevision`, `changeRows` (part/item, field, oldValue, newValue, quantityUomId/currencyUomId), `reason`, `effectiveDate`, `approvalDecisionId`, `sourceAllocationChanges`, `notificationRecipients`, `resultStatus`, `errorCode`, `retryable`. Posted records are never rewritten by this envelope.

**Source.** research §5; Odoo `odoo/odoo/addons/purchase/views/purchase_views.xml` lock/unlock; Carbon purchase order revisions.

**Needs.** PUR-ORDER, PUR-APPROVAL, PUR-BUDGET.

### Acknowledgements

**Layout.** list with unacknowledged, changed promise and overdue filters.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| AcknowledgementList | list | Track confirmations by current PO revision | PO/revision, supplier, sent, promised date, response, late reason | drill to item history | proposed `ironstone.purchasing.OrderServices.find#Acknowledgements` | ERPNext order_confirmation_no/date; Odoo receipt reminder |
| RecordAcknowledgement | dialog | Enter supplier response received by phone/email | PO revision, supplier ref/date, lines qty/date, accepted/rejected, evidence | original request versus promise | proposed `ironstone.purchasing.OrderServices.record#Acknowledgement` | ERPNext PO confirmation fields; Carbon PO acknowledgment |
| SendReminder | list, bulk | Request confirmations from selected suppliers | PO/revision, contact, message, expected reply date | preview per supplier | proposed `ironstone.purchasing.OrderServices.send#PurchaseReminder` | Odoo receipt_reminder_email controls |

**Actions and states.** Supplier promises never change ordered quantities without OrderChanges. Buyer accepts a date change with an audit reason; original due date remains for OTD reporting. Reminders have per-recipient delivery outcomes and deduplicate on PO revision/template/reminder occurrence. Independent delivery failures do not mark all reminders sent.



**Source.** research §5; inspected ERPNext purchase_order.json and Odoo purchase_views.xml receipt reminder controls.

**Needs.** PUR-ORDER, PUR-PORTAL, PUR-SHELL.

### Approvals

**Context passed.** Mount `Purchasing/Approvals`, a top-level menu item; [Commons §4](design-drawers-commons.md#4-header-and-drawer-screens) and crosscut §3.15. This is Purchasing's row of the crosscut §3.15 table (R-XC-12): request, award, PO and supplier approvals / purchase topics and buying organization / decide against the current revision / budget commitment. Filter to the topics PurchaseRequestApproval, PurchaseAwardApproval, PurchaseOrderApproval and PurchaseSupplierApproval and the current recipient. The list rows are pending proposed PurchaseApprovalDecision steps; the notification is the delivery, not the record. Show source, amount/currency, policy tier, revision, budget result and due date. Approve and refuse call the proposed topic handlers `approve#PurchaseSource` and `refuse#PurchaseSource` (§1), never a NotificationMessage mutation; body and actions use the same source access check as the PO/request. Refusal moves a PO OrderPlaced → OrderRejected, leaves a request ReqSubmitted with the refused decision, keeps an award draft and sets a supplier's approval status Rejected. Stale or superseded requests link to the current revision without accepting a decision.

**Needs.** PUR-APPROVAL, PUR-SHELL.

## 7. Agreements

### Agreements

**Layout.** list with active, expiring, exhausted and template filters.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| AgreementFind | find | Find supplier commercial commitments | supplier, type, dates, status, currency, cap remaining | date-period | none | Party/FindAgreement AgreementList |
| AgreementList | list | Show blanket and template usage | agreement, supplier, validity, limit, released/remaining | AgreementDetail links | entity plus proposed `ironstone.purchasing.AgreementServices.get#ReleaseBalance` | Party/FindAgreement AgreementList |
| NewAgreement | dialog | Start a supplier agreement | supplier, buying organization, type, dates, currency, isTemplate | clone template without releases | proposed `ironstone.purchasing.AgreementServices.store#PurchaseAgreement` | Party/FindAgreement NewAgreement |

**Actions and states.** Create blanket contract or sourcing template explicitly; a template has no contractual balance. Agreement activation follows approval and preserves its document/version evidence. Expiry blocks new releases without cancelling previously committed POs.



**Source.** research §5; Party/FindAgreement; Odoo `odoo/odoo/addons/purchase_requisition/views/purchase_requisition_views.xml`.

**Needs.** PUR-AGREEMENT, PUR-APPROVAL.

### AgreementDetail

**Layout.** detail with Terms, Products/prices, Releases and Evidence tabs.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| AgreementHeader | single | Maintain supplier contract identity | supplier, internal organization, type, status, validity, currency, template | date-range; status bar | proposed `ironstone.purchasing.AgreementServices.store#PurchaseAgreement` | Party/EditAgreement EditAgreement |
| AgreementTerms | list, editable rows | Set settlement and other contract terms | term, description, settlement term, from/thru, document | term lookup | entity via proposed `ironstone.purchasing.AgreementServices.store#PurchaseAgreement` | Party/EditAgreement AddSettlementTerm/AddOtherTerm/AgreementTermList |
| AgreementItems | list, editable rows | Define contracted products/quantity caps | product, item type (existing AitPurchase), quantity/UOM, validity, text, proposed value cap, proposed release tolerance | PriceExplain and supplier prices link | entity via proposed `ironstone.purchasing.AgreementServices.store#AgreementItem` | Party/EditAgreement AddAgreementItem/AgreementItemList |
| AgreementReleases | list, read | Explain contractual use and open balance | PO/item, revision, ordered, cancelled, received, released value, remaining | source PO links | proposed `ironstone.purchasing.AgreementServices.get#ReleaseBalance` | ERPNext Blanket Order; Odoo agreement orders |
| ReleaseAgreement | dialog | Create a draft release within cap | agreement/version, product, quantity/UOM, need date, facility, operation ID | preview remaining balance | proposed `ironstone.purchasing.AgreementServices.release#PurchaseAgreement` | Odoo New Quotation from blanket order |
| AgreementFiles | component | Maintain agreement evidence | file, type, visibility, from/thru | Commons record-files | `mantle.party.AgreementServices.create#AgreementContent`; `mantle.party.AgreementServices.update#AgreementContent` through shared files | Party/EditAgreement NewContentForm/UpdateContentForm |

**Actions and states.** Use active mantle.party.agreement.Agreement/AgreementItem/AgreementTerm and ProductPrice.agreementId/agreementItemSeqId. AgrPurchase is proposed seed data; existing AgrProduct/AgrSales do not imply a purchase workflow. Purchase lines use the existing AgreementItemType `AitPurchase` (R-PUR-30). `Agreement.statusId` has the StatusType Agreement but no seeded status, so PUR-AGREEMENT proposes the flow AgmStDraft → AgmStActive → AgmStExpired or AgmStClosed, plus AgmStCancelled; the prefix avoids the Agr IDs already in use. AgreementItem has quantity and quantityUomId but no amount, so the value cap is the proposed `AgreementItem.amountCap`. A release over the remaining quantity or value is refused unless it is within the proposed `AgreementItem.releaseTolerancePercent`. Proposed release allocations preserve order/item/quantity/value and revision; transaction locks prevent two releases exceeding quantity/value cap. Cancel releases only their unused commitment. Material term edits create a new approved version. Rebates and retrospective settlements are later financial extensions; no mutable historical PO repricing.



**Source.** research §5, §10; active entity/PartyEntities.xml; ERPNext blanket_order; Odoo purchase_requisition_views.xml.

**Needs.** PUR-AGREEMENT, PUR-SUPPLIER, PUR-APPROVAL.

### LeaseOverview

**Context passed.** Mount `Purchasing/Agreements/LeaseOverview`; [Accounting Leases](design-accounting.md#leases). Later read/authorized setup mount of Accounting-owned lease definition and schedule. Fix supplier, asset and buying organization; show contract, installments, approval and journal links. Financial measurements/postings use Accounting lease capabilities; Purchasing holds agreement/source evidence and does not introduce a second schedule engine. Research §5 Carbon leases is accounted for by this later mount.

**Needs.** PUR-LATER, AC-17.

## 8. Replenishment

### SupplyPlanning

**Context passed.** Mount `Purchasing/Replenishment/SupplyPlanning`; [crosscut §3.20](design-crosscut.md#320-supplyplanning). Fix authorized buying organizations/facilities; default buy suggestions but show the entire buy/make/transfer demand provenance and existing supply. The shared proposed mantle.request.requirement.PlanningRun, PlanningSuggestion and RequirementSupply with proposed `mantle.product.SupplyPlanningServices.run#SupplyPlan`, `get#SupplyPlan` and `convert#PlanningSuggestions` own calculation and conversion. There is one current PlanningRun per organization and facility set. Any planner starts it from the Purchasing, Manufacturing or Warehouse mount, or the schedule set through proposed `store#PlanSchedule` starts it (D20; R-XC-39). A new run supersedes unconverted suggestions.

Purchasing converts buy suggestions; Manufacturing converts make suggestions and Warehouse transfer suggestions (D20). Buyers change supplier/date/lot size and convert eligible buy suggestions to draft PO or approved purchase requests according to policy; conversion to purchase requests is a deviation from crosscut §4.2 (§18 Open). A planner who also holds stock-planning authority may convert transfer suggestions here; they cannot masquerade as purchases (R-XC-20). Make conversion creates a draft production order in WeInPlanning; explicit Manufacturing release freezes its BOM/routing snapshot. Conversion checks product usability through Products' proposed `check#ProductUsable` (D19).

Approved purchase-request demand is already covered: its Requirement carries RequirementSupply rows from RequestSourcing or Award, and the conversion lock is on the Requirement's remaining quantity (R-PUR-06). Customer-order demand (RqTpCustomer) converted to a PO keeps the sales OrderItem in its RequirementSupply provenance, and the receipt offers to reserve the received stock for that order item through existing `mantle.product.AssetServices.reserve#AssetForOrderItem` (R-PUR-37). Manufacturing's subcontract requirements show with method outside processing; converting one writes the service OrderItem with `OrderItemWorkEffort` and RequirementSupply (§6 Order context rules; R-PUR-22). Component demand and output supply of production runs come from the WorkEffortProduct rows that Manufacturing maintains (crosscut §4.2; R-SA-05).

Freeze horizon, lead time, pack/MOQ rounding, safety stock, substitutes and demand source are visible. Existing `mantle.product.InventoryReportServices.get#InventoryProjectedInfo` uses search projections; missing/stale/truncated projection is a named planning limitation, not zero demand. Receipts held for inspection (AstQuarantine) show as a separate held quantity with the inspection status from proposed `QualityServices.get#SourceInspectionStatus`; they are not netted as supply (D21; §18 Open). Fresh transactional quantity/status/version checks guard conversion. DemandAlreadyCovered after a competing conversion leaves a named row failure and no duplicate PO. Scheduled reorder invokes this same plan and conversion policy.

**Needs.** CX-PLANNING, PUR-REORDER.

### InventoryAvailability

**Context passed.** Mount `Purchasing/Replenishment/InventoryAvailability`; [crosscut §3.7](design-crosscut.md#37-inventoryavailability). Fix product/facility from the request, PO or planning suggestion; show physical, reserved, usable/free, held/rejected and time-phased incoming/outgoing quantities with UOM and snapshot time. Purchasing can inspect sources and propose supply; stock adjustments, reservation override and quality release require their separate action grants. `mantle.product.AssetServices.get#AvailableInventory` and `get#AvailableInventoryMulti` are existing quantities primitives; the richer freshness/hold projection is proposed. A promise excludes inspection-held receipts until authorized disposition. A planner who edits a minimum or reorder quantity from here writes through the same proposed `mantle.facility.FacilityServices.store#ProductFacilityPolicy` as ReorderRules (D20).

**Needs.** CX-AVAILABILITY, CX-FACILITY-POLICY.

### ReorderRules

**Layout.** settings list; editable ProductFacility rows and schedule policy form.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ReorderFind | find | Find purchase planning rules | product/category, supplier, facility, below-minimum, snoozed | server product/facility lookups | none | Facility/EditFacilityProducts ProductList |
| ReorderRuleList | list, editable rows | Maintain minimum and order quantities | product, facility, minimumStock, reorderQuantity, daysToShip, proposed snooze/thru | base-UOM labels and plan link | proposed `mantle.facility.FacilityServices.store#ProductFacilityPolicy` | Facility/EditFacilityProducts AddProductForm/ProductList; Odoo reordering rules |
| PlanSchedule | single | Set common planning cadence and approval behavior | facilities, horizon, schedule, buyer, auto-request/preview, safety policy | preview run before enable | proposed `mantle.product.SupplyPlanningServices.store#PlanSchedule`; proposed `run#SupplyPlan` for the preview | ERPNext auto-reorder settings; Odoo automate/snooze |

**Actions and states.** Run planning and inspect suggestions before enabling a schedule. Snooze is dated and reasoned; it suppresses automatic conversion, not shortage visibility. Auto-create defaults to proposed requirements/requests; auto-approve requires explicit policy and source authorization. Duplicate jobs reuse run/conversion identities. Import/update batches name each product/facility failure independently and retain valid changes.

Every ProductFacility write, from here, Products, Warehouse or InventoryAvailability, goes through the Warehouse-owned proposed contract `store#ProductFacilityPolicy` (CX-FACILITY-POLICY), so the same validation applies everywhere (D20; R-XC-09). The plan schedule is a SupplyPlanning setting shared with the Manufacturing and Warehouse mounts, not a Purchasing schedule. The earlier proposed `PlanningServices.store#ReorderRule` and `store#ReorderSchedule` are dropped. A maximum or order-up-to level and suggested levels are an Open item (§18; R-PUR-19).



**Source.** research §6; active ProductFacility fields; Odoo `odoo/odoo/addons/stock/views/stock_orderpoint_views.xml`; ERPNext `frappe/erpnext/erpnext/stock/reorder_item.py`.

**Needs.** PUR-REORDER, CX-FACILITY-POLICY, PUR-ACCESS.

## 9. Receiving and returns

### Receipts

**Layout.** list of expected, partial, late, held and completed supplier receipts.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ReceiptFind | find | Filter inbound supplier work | supplier, PO, facility, ETA, shipment/inspection state | date-period | none | Shipment/FindShipment ShipmentList |
| ExpectedReceipts | list | Show expected and physical quantities separately | PO/item, shipment, supplier, expected, received, accepted, rejected, held | source links and UOM labels | proposed `ironstone.purchasing.ReceiptServices.find#ExpectedReceipts` | Shipment/FindShipment ShipmentList; Carbon PO receiving |
| PrepareReceipt | dialog | Expected receipt (ASN): record or update the one open inbound receipt for a PO part | PO/part, selected items/qty, facility, expected date, supplier shipment reference | source selection | proposed `mantle.shipment.WarehouseTaskServices.ensure#PurchaseReceipt` | Order/OrderDetail AddOrderPartToShipmentForm |

**Actions and states.** Open the shared ShipmentDetail for physical receipt; buyers without receiving capability see progress and request corrections. PrepareReceipt is labelled "Expected receipt (ASN)". It calls Warehouse's proposed `ensure#PurchaseReceipt`, which returns the open ShpTpPurchase shipment for the part in Input or Scheduled, or creates one, so a PO part has one open inbound receipt whichever app starts it (R-SB-12). Mantle allows that shipment only for an approved or sent part. Overreceipt requires configured allowance and specific authority. A short receipt is finished by Warehouse's proposed `close#ReceiptRemainder`: for close it calls `close#PurchaseRemainders` (§6), and for backorder it calls `ensure#PurchaseReceipt` for the remainder; only then does it deliver the shipment (R-SB-11; R-PUR-10). An unavailable projection never enables a receipt action using a stale remaining quantity.



**Source.** research §7; Shipment/FindShipment and ShipmentDetail; ERPNext Purchase Receipt; Warehouse design receiving worklists.

**Needs.** PUR-RECEIPT, PUR-ACCESS.

### ShipmentDetail

**Context passed.** Mount `Purchasing/Receiving/ShipmentDetail`; [crosscut §3.8](design-crosscut.md#38-shipmentdetail). Inbound purchase and supplier-return outbound context; tabs: source PO, expected/received items, lots/serials, inspection/putaway, packages, receipt documents, bill links and Chatter. Receiver actions use existing `mantle.shipment.ShipmentServices.receive#ShipmentProduct` through Warehouse's posting guard (WH-POST), or create outbound return shipment from ReturnDetail. When an inspection applies, the guard receives into AstQuarantine (D21). `receive#EntireShipment` accepts every unit not yet handled and then delivers the shipment, so it is offered only as "Receive all as expected" with explicit confirmation; a short receipt uses Warehouse's ReceiveRemaining and `close#ReceiptRemainder` (R-SB-11). Shipment status alone does not certify quality acceptance; expose accepted/rejected/held quantities and AssetReceipt references. Each receipt records the proposed entered quantity, entered UOM and applied conversion factor, so a PO line in `OrderItem.quantityUomId` converts at receipt without losing what was counted (crosscut §4.1; R-SA-06). Handheld uses scan product/PO/location/lot/serial, count UOM, confirm and named result with operation identity; a scanned pack barcode resolves to the base product and quantity through Products' proposed `ProductServices.resolve#ScannedProduct` (crosscut §4.1). Browser/terminal invoke the same transaction. When the PO line is pegged to a sales order item, the receipt offers to reserve the stock for it (R-PUR-37). A user with AP intake capability can open the shared InvoiceFromSource dialog here on the accepted-received basis (D2). A supplier return can be packed/shipped here only with warehouse authority; Warehouse's proposed `ship#SupplierReturn` moves it to ReturnShipped. That outbound packing is beyond the crosscut §3.8 Purchasing row (§18 Open).

**Needs.** PUR-RECEIPT, CX-POSTING, CX-QUALITY.

### Inspections

**Layout.** list of source-linked purchasing quality tasks.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| InspectionFind | find | Filter incoming quality work | supplier, PO, product, lot, template, inspection stage/result | facility and due filter | none | ERPNext Quality Inspection list |
| InspectionList | list | Prioritize receipt holds | inspection, receipt, supplier, held qty, due, owner, outcome | shared QualityInspection link | proposed `ironstone.purchasing.ReceiptServices.find#PurchaseInspections` | ERPNext Purchase Receipt quality requirement; Carbon receiving inspection |

**Actions and states.** Buyer sees hold reason and due follow-up; inspector records/verifies checks. Read-only buyer cannot release a rejected lot or relabel a completed inspection. On phone, one selected inspection opens the shared handheld task; list itself does not capture readings.



**Source.** research §7; Warehouse quality design; ERPNext stock quality inspection.

**Needs.** PUR-RECEIPT.

### QualityInspection

**Context passed.** Mount `Purchasing/Receiving/QualityInspection`; [crosscut §3.19](design-crosscut.md#319-qualityinspection-and-inspectiontemplates). Pass AssetReceipt/source shipment, supplier, product, lot/serial, PO item and template revision. Display Draft/Submitted/Verified/Disposed stage separately from accepted/rejected/partial result. Inspector records and verifies; authorized disposition releases accepted stock, returns, scraps or keeps a hold atomically. Verification itself does not release stock. Buyers can raise supplier corrective follow-up via existing Request/WorkItem links; advanced NCR/CAPA is later. Receipts that need inspection arrive in AstQuarantine through Warehouse's posting guard (D21). Proposed `mantle.product.QualityServices.get#SourceInspectionStatus` gives InvoiceMatch and SupplyPlanning the open-inspection quantity, which is excluded from bill matching and from usable supply until disposition. Failed inspection reduces match-eligible quantity and supply availability until disposition. Disposition queues a match re-evaluation for the receipt's bills (R-SB-19). Inspect, verify and dispose actions here go beyond the crosscut §3.19 Purchasing row, which is review-only (§18 Open).

**Needs.** CX-QUALITY.

### InspectionTemplates

**Context passed.** Mount `Purchasing/Receiving/InspectionTemplates`; [crosscut §3.19](design-crosscut.md#319-qualityinspection-and-inspectiontemplates). Filter templates for purchase receipts; versioned supplier/product/category applicability, sampling, limits, required readings and verifier roles. Only quality administrators edit drafts; published versions and any version already referenced by an inspection or released production snapshot are immutable. No second purchasing template entity. The screen is a settings screen with a list and an inline editor; its menu entry is under Settings.

**Needs.** CX-QUALITY.

### Returns

**Layout.** list of supplier return cases with create-from-source dialog.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ReturnFind | find | Find supplier returns | supplier, PO, receipt, return state, physical state, credit/replacement state | separate status filters | none | Return/FindReturn ReturnHeaderList |
| SupplierReturnList | list | Track return authorization and outcomes | return, supplier RMA, qty, dispatched, credited, replacement due | shared ReturnDetail link | proposed `ironstone.purchasing.ReturnServices.find#SupplierReturns` | Return/FindReturn ReturnHeaderList; Carbon Purchase Return Orders |
| NewSupplierReturn | dialog | Select eligible source quantities | supplier, PO/receipt, lot, selected lines/qty, reason, response, RMA | source eligibility preview by receipt and lot | proposed `ironstone.purchasing.ReturnServices.find#ReturnableReceipts`; `mantle.order.ReturnServices.create#ReturnFromOrder` | Return/FindReturn CreateSupplierReturn; Return/AddOrderItems |

**Actions and states.** Choose supplier return rather than customer return from source direction. Eligibility comes from proposed `find#ReturnableReceipts`: AssetReceipt accepted plus quarantined quantity, minus earlier supplier returns, locked per receipt and lot (D11; R-SB-06). Mantle's `calculate#OrderItemReturnable` is not used for supplier returns, because it counts billed quantity and a rejected lot is usually returned before the supplier bills. A return of unbilled quantity lowers the match-eligible receipt and needs no credit; Accounting's proposed `settle#Return` credits only the billed portion. Proposed receipt linkage makes a particular lot/receipt explicit. RMA expiry, attachment and supplier-approved instructions are recorded. Failed quality can create a supplier return without making rejected stock available to general picking.



**Source.** research §7; Return/FindReturn/EditReturn/EditReturnItems/AddOrderItems; active ReturnHeader.supplierRmaId, ReturnItem.returnResponseEnumId.

**Needs.** PUR-RETURN, PUR-RECEIPT.

### ReturnDetail

**Context passed.** Mount `Purchasing/Returns/ReturnDetail`; [crosscut §3.18](design-crosscut.md#318-returndetail). Pass supplier return, buying organization, receipt/lot provenance and response (credit, refund or replacement). Tabs: Authorization/RMA, source quantities, outbound shipment, replacement, credit/refund, evidence. Existing `mantle.order.ReturnServices.create#Return`, `request#Return`, `approve#Return`, `add#OrderItemToReturn`, `update#ReturnItem`, `create#ReturnShipment`, `get#ReturnDisplayInfo`, `cancel#Return` remain guarded primitives. Proposed ReturnItem→AssetReceipt allocation identifies the exact returned receipt. Outbound uses ShpTpPurchaseReturn. Buyer authorizes permitted business return and requests settlement; warehouse dispatches; Accounting settles. Physical dispatch, replacement due and financial credit/refund remain separate. Cancellation before dispatch releases allocated quantity; after dispatch use an explicit reversal/return-of-return and retain history. Closed-period correction posts in an authorized open period.

**Owners on the supplier return** (D11). Approval runs Mantle's `ReturnApprovedProcess`, which is kept: it creates the ShpTpPurchaseReturn shipment, and its `process#ReturnItemResponses` does nothing for a supplier return. Packing that shipment creates no invoice, because its sources carry a returnId and no orderId. Warehouse's proposed `WarehouseTaskServices.ship#SupplierReturn` moves the return items to ReturnShipped when the shipment ships (R-SB-05). Accounting's proposed `ironstone.accounting.ReturnSettlementServices.preview#Return` and `settle#Return` settle it on the supplier branch: per the response they create an incoming supplier credit memo (InvoiceCreditMemo, supplier to organization) or a debit note, link ReturnItemBilling to the original bill item, refuse an amount over the billed eligible value and set ReturnCompleted. A supplier's restocking fee or other charge is an explicit preview line on that credit (R-PUR-23). A replacement is proposed `ironstone.purchasing.ReturnServices.create#ReplacementOrder`: a linked PO plus `ensure#PurchaseReceipt` for its expected receipt. Settlement queues a match re-evaluation for the original bill (R-SB-19). `receive#ReturnWithoutShipment` is not exposed. Files on the return use the proposed ReturnContent (D25).

**Needs.** PUR-RETURN, AC-02.

## 10. Bills and matching

### Bills

**Layout.** list focused on purchase bill sources and operational exceptions.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| BillFind | find | Filter authorized supplier invoices | supplier, PO, receipt, bill reference, status, match/hold, due | separate financial and match filters | none | Accounting/Invoice/FindInvoice InvoiceList |
| BillList | list | Show source and payable progress | bill, supplier, currency/total, accepted receipts, variance, hold, payment summary | shared InvoiceDetail/InvoiceMatch links | proposed `ironstone.accounting.MatchServices.find#BillExceptions` plus authorized Invoice find | Accounting/Invoice/FindInvoice InvoiceList |
| UploadSupplierBill | dialog | Capture file evidence for AP review | supplier, supplier reference, date, currency, amount, file, PO | upload and duplicate preview on organization, supplier and supplier reference | proposed `ironstone.accounting.InvoiceServices.import#Bill` | Accounting Bills BillUpload; Odoo vendor bill capture |

**Actions and states.** Upload creates an incoming/draft bill for review, never an approved payable. Manual buyer upload uses the same Accounting intake service as AP; later OCR/extraction adds suggested mappings to that intake, with confidence and review, not a second engine. Accounting owns bill intake (D2; R-XC-01). Proposed `import#Bill` keys a bill by organization, supplier and supplier reference, and refuses a second bill on the same key.

**Receipt bill SECA** (D1, D2; R-SB-01). Mantle's `ShipmentIncomingDeliveredCreateInvoices` runs `mantle.account.InvoiceServices.create#PurchaseShipmentInvoices` when an incoming shipment reaches ShipDelivered. As built it bills rejected and quarantined units at the PO price. BOSS conditions it: by default a receipt creates no supplier bill. The SECA runs only for a supplier whose proposed `SupplierProfile.selfBillingIndicator` is set (evaluated-receipt settlement). For that supplier it calls `create#PurchaseShipmentInvoices` with the proposed `acceptedOnly=true`, which bills accepted, released quantity only, skips the leftover line without an asset, excludes quantity under open inspection and keys the draft by shipmentId. For a self-billed receipt, a supplier upload attaches its evidence to the existing draft instead of creating a bill, and InvoiceMatch evaluates the draft two-way (PO and accepted receipt). Service lines, including subcontract lines, never get a receipt bill; their bills come in through `import#Bill` (D14). The self-billing default and the bill basis sit in Accounting's MatchPolicies (§12).



**Source.** research §8; Accounting/Invoice/FindInvoice; active service/AccountingInvoice.secas.xml and InvoiceServices.xml; Carbon invoice extraction is a later extension to Accounting intake.

**Needs.** PUR-MATCH, PUR-ACCESS, PUR-LATER.

### InvoiceDetail

**Context passed.** Mount `Purchasing/Bills/InvoiceDetail`; [crosscut §3.16](design-crosscut.md#316-invoicedetail). Fix buying organization and supplier bill; tabs: header/items, PO/receipt sources, match/tolerances/holds, permitted payments, attachments/audit. Buyer investigates source errors; a match operator (buyer here, AP in Accounting) applies eligible allocations; only finance places and releases holds, approves the payable, posts correction or pays through shared Accounting actions (D4). An open hold blocks every payment path, not only payment runs: Accounting's settlement and payable payment guards refuse a held bill, and a payment for it stays unapplied with a named exception (R-SB-16). A supplier prepayment requested from OrderDetail applies here through the same guard. "Allocate to receipts" links a freight, duty or broker bill to Accounting's `Accounting/Payables/LandedCosts` task (§17 Decided, landed costs). No Accounting app-root grant is needed for that independently granted capability. `mantle.account.InvoiceServices.get#InvoiceDisplayInfo`, `apply#InvoiceToOrder`, `apply#InvoiceItemToOrder` and `apply#InvoiceToShipment` are existing display/link primitives under the new guard; they do not by themselves enforce a complete three-way match. Inaccessible payment instruments/tax/GL data remain masked. Source: Accounting/Invoice/EditInvoice, EditInvoiceItemOrders, EditInvoiceItemShipments.

**Needs.** PUR-MATCH.

### MatchExceptions

**Layout.** list with received-not-billed, billed-not-received, price/quantity/tax variance and held views.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| MatchFind | find | Filter match exceptions | supplier, buyer, PO, bill, facility, age, reason, tolerance policy | saved named filters | none | ERPNext purchase invoice PO/receipt controls |
| ExceptionList | list | Explain required source or financial work | bill/item, PO, receipt, eligible qty, variance, tolerance, hold owner | source links and responsibility | proposed `ironstone.accounting.MatchServices.find#BillExceptions` | Odoo bill line matching; Carbon bill line source mapping |
| ReevaluateMatch | list, bulk | Refresh changed sources without releasing holds | invoice IDs/revisions, operation ID, results | per-bill results | proposed `ironstone.accounting.MatchServices.evaluate#InvoiceMatch` | Odoo matching action |
| RequestHoldRelease | dialog | Ask finance to release a hold the buyer has resolved | invoice, hold, reason, resolution evidence, requested by | confirmation | proposed `ironstone.accounting.MatchServices.request#HoldRelease` | Accounting HoldInvoice dialog; ERPNext purchase invoice hold release |

**Actions and states.** Open InvoiceMatch to allocate. Buyer may fix an incorrect source PO through OrderChanges or ask Warehouse to correct receipt evidence; cannot fabricate a receipt to clear an exception. Re-evaluation reports SourceChanged, MissingReceipt, InspectionHold, QuantityVariance, PriceVariance, TaxVariance, DuplicateBill and ClosedPeriod against the affected invoice/item. Independent invoices continue; each financial application is atomic. A tolerance pass is not an approval or automatic hold release. Re-evaluation also runs on its own: Accounting's proposed `MatchServices.queue#MatchReevaluation` is called after a bill is taken in, a receipt is corrected, an inspection is disposed, a PO revision is applied or a supplier return is settled, and a background job evaluates the queue with named per-bill results (R-SB-19). The manual ReevaluateMatch stays for a buyer who knows a source changed. RequestHoldRelease creates an Accounting Approvals item on the proposed `BillHoldRelease` topic; a finance user releases the hold through `release#InvoiceHold` (R-PUR-20). Only finance places a hold, through `hold#Invoice`.



**Source.** research §8; Accounting bill match contract and ERPNext buying_settings.json po_required/pr_required/maintain_same_rate controls.

**Needs.** PUR-MATCH.

### InvoiceMatch

**Context passed.** Mount `Purchasing/Bills/InvoiceMatch`; [crosscut §3.22](design-crosscut.md#322-invoicematch). Fix supplier, organization, bill revision and candidate PO/AssetReceipt lines. Proposed mantle.account.invoice.InvoiceMatch/InvoiceMatchLine/InvoiceHold and the proposed ironstone.accounting.MatchServices evaluate#InvoiceMatch, apply#InvoiceMatch, find#BillExceptions, hold#Invoice, release#InvoiceHold and request#HoldRelease define the shared service contract. Compare ordered, physically received, quality-accepted/released, previously billed and remaining eligible quantities in recorded units; net returns and prior credits affect remaining eligibility. Rejected/quarantined quantity is excluded: the open-inspection quantity comes from proposed `QualityServices.get#SourceInspectionStatus` (D21). Service/non-stock lines require an explicit two-way or service-acceptance policy, not fake stock receipts; accepted service quantity comes from proposed ServiceAcceptance rows (R-PUR-09). A self-billed draft is matched two-way against the PO and the accepted receipt (D2). Apply locks candidate remaining amounts/quantities, validates organization, currency, supplier, UOM, tax/tolerance version and commits allocation plus hold evidence atomically. Financial release/approval is a separate capability and revision-bound decision.

A match operator applies matches, through proposed `ironstone.accounting.MatchServices.apply#InvoiceMatch` (D4; R-XC-02). Apply creates or updates Mantle's `OrderItemBilling` (order item, invoice item, AssetReceipt, shipment, quantity, amount) in the same transaction, because Mantle reads it for "already billed", for returnable quantity and in `apply#InvoiceItemToOrder` (R-SB-18). InvoiceMatchLine keeps the snapshot, tolerance and rule version; unapply reverses both. Tolerances, bill basis, receipt-required and same-rate rules come from Accounting's `Accounting/Settings/MatchPolicies` (§12). A buyer asks for a hold release through RequestHoldRelease (MatchExceptions); only finance places or releases a hold.

**Needs.** PUR-MATCH.

## 11. Performance

### Scorecards

**Layout.** list of suppliers by effective evaluation period and evidence completeness.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ScorecardFind | find | Filter supplier performance | supplier/class, period, buyer, score band, risk, data completeness | date-period | none | ERPNext Supplier Scorecard |
| ScorecardList | list | Show scores with counts and freshness | supplier, period, OTD, quality, price variance, response rate, score, risk | evidence denominators and drill-in | proposed `ironstone.purchasing.ReportServices.find#SupplierScorecards` | ERPNext Supplier Scorecard; Carbon supplier risk |
| EvaluateSuppliers | list, bulk | Produce a versioned period evaluation | supplier list, period, policy version, operation ID | preview and named per-supplier result | proposed `ironstone.purchasing.ReportServices.evaluate#SupplierScorecard` | ERPNext Supplier Scorecard period generation |

**Actions and states.** Low volume or unavailable evidence is Insufficient data, never a zero score silently converted to a block. Recalculation creates a new evidence/version record; previous approved decisions retain their evaluated basis. Risk actions link a follow-up and policy decision; no score alone cancels orders.



**Source.** research §9; `frappe/erpnext/erpnext/buying/doctype/supplier_scorecard/supplier_scorecard.json` weights, criteria and warn/prevent flags.

**Needs.** PUR-REPORTS, PUR-SUPPLIER.

### ScorecardDetail

**Layout.** detail with Measures, Evidence, Risks and Follow-up tabs.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ScoreMeasures | list, read | Explain weighted score | criterion, numerator, denominator, eligible count, score, weight, policy version | source row links | proposed `ironstone.purchasing.ReportServices.get#SupplierScorecard` | ERPNext Supplier Scorecard criteria/periods |
| ScoreEvidence | list, read | Audit source events and exclusions | PO/item, original/promised due, received/accepted date, qty, exception, excluded reason | time and UOM display | proposed `ironstone.purchasing.ReportServices.get#SupplierScorecard` | Odoo OTD analysis; ERPNext supplier performance |
| SupplierRisk | dialog | Record actionable risk and response | supplier, organization, severity, category, owner, effective/expiry, evidence, action/reason | existing work-item link | proposed `ironstone.purchasing.SupplierServices.store#SupplierRisk` | Carbon supplier risk evaluation |

**Actions and states.** OTD uses required/promised date policy and AssetReceipt.receivedDate, weighted by eligible ordered/received quantity; exclude cancelled remainder explicitly. Quality score uses dispositions, including rejected quantity, not shipment delivered status. Price variance compares agreed price versus billed amount in a documented UOM/FX basis. Response time starts at successful invitation delivery. Each measure exposes missing/late evidence; corrections produce a new score revision. Proposed procurement blocks are scoped, reasoned and overridable only by policy capability.



**Source.** research §9; Carbon supplier risk and ERPNext supplier_scorecard definitions.

**Needs.** PUR-REPORTS, PUR-SUPPLIER.

### Spend

**Layout.** report with options, tabular totals and source drill-in; XML list/export is the first release.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| SpendOptions | single | Set explicit report basis | organization, supplier/product/category, period, currency, committed/received/billed/paid basis | date-period; currency and measure selectors | none | Odoo purchase analysis; ERPNext Purchase Analytics |
| SpendRows | list, read | Explain totals by source | organization, supplier/product/category, period, currency, committed/received/billed/paid basis | group totals; source links | proposed `ironstone.purchasing.ReportServices.get#PurchaseSpend` | Odoo purchase analysis; ERPNext Purchase Analytics |

**Actions and states.** Select one explicitly named measure; never sum PO, receipt and bill values as if independent spend. Drill to source and disclose FX date/rate. Landed costs are actual only after allocation in Accounting's `Accounting/Payables/LandedCosts` task, which the report links to; until then they show as estimates. Exports run the identical authorized query and include filters, snapshot time and omitted-data warnings. Browser/terminal use the same rows; generic pivot/graph exploration is later through Insights, not assumed available.



**Source.** research §9; Odoo purchase analysis; ERPNext Purchase Analytics.

**Needs.** PUR-REPORTS, PUR-ACCESS.

### Commitments

**Layout.** report with options, tabular totals and source drill-in; XML list/export is the first release.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| CommitmentsOptions | single | Set explicit report basis | organization, supplier, agreement, budget dimension, due bucket, remaining ordered qty/value, released/actual | date-period; currency and measure selectors | none | ERPNext open PO report; Accounting BudgetControls |
| CommitmentsRows | list, read | Explain totals by source | organization, supplier, agreement, budget dimension, due bucket, remaining ordered qty/value, released/actual | group totals; source links | proposed `ironstone.purchasing.ReportServices.get#PurchaseCommitments` | ERPNext open PO report; Accounting BudgetControls |

**Actions and states.** Use Accounting commitment lineage and source state: request reservation converts to PO commitment and then actual without double counting. The rows read Accounting's proposed `mantle.other.budget.BudgetCommitment` (D10). Purchasing calls `reserve#Commitment` at request approval, `convert#Commitment` (request to PO) at PO approval and `release#Commitment` on cancel or close; Accounting's `approve#Payable` converts PO to actual. Warn/Stop results are visible but only finance policy can change them. Exports run the identical authorized query and include filters, snapshot time and omitted-data warnings. Browser/terminal use the same rows; generic pivot/graph exploration is later through Insights, not assumed available.



**Source.** research §9; ERPNext open PO report; Accounting BudgetControls.

**Needs.** PUR-REPORTS, PUR-ACCESS.

### ProcurementTracker

**Layout.** report with options, tabular totals and source drill-in; XML list/export is the first release.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ProcurementTrackerOptions | single | Set explicit report basis | request/item, requirement, RFQ/quote, award, PO/item, receipt, inspection, bill/match/payment | date-period; currency and measure selectors | none | ERPNext Procurement Tracker |
| ProcurementTrackerRows | list, read | Explain totals by source | request/item, requirement, RFQ/quote, award, PO/item, receipt, inspection, bill/match/payment | group totals; source links | proposed `ironstone.purchasing.ReportServices.get#ProcurementTracker` | ERPNext Procurement Tracker |

**Actions and states.** Expand source links in each purchasing mount, preserving permitted visibility. Partial receipt and split supplier/order/bill branches remain separate. Unavailable finance rows show withheld, not unpaid. Exports run the identical authorized query and include filters, snapshot time and omitted-data warnings. Browser/terminal use the same rows; generic pivot/graph exploration is later through Insights, not assumed available.



**Source.** research §9; ERPNext Procurement Tracker.

**Needs.** PUR-REPORTS, PUR-ACCESS.

### PurchaseHistory

**Layout.** report with options, tabular totals and source drill-in; XML list/export is the first release.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| PurchaseHistoryOptions | single | Set explicit report basis | product/variant, supplier, facility, date, quantity/UOM, normalized unit price, original currency, lead time | date-period; currency and measure selectors | none | Odoo purchase history; mantle InventoryReportServices.get#PriceHistoryInfo |
| PurchaseHistoryRows | list, read | Explain totals by source | product/variant, supplier, facility, date, quantity/UOM, normalized unit price, original currency, lead time | group totals; source links | proposed `ironstone.purchasing.ReportServices.get#PurchaseHistory` | Odoo purchase history; mantle InventoryReportServices.get#PriceHistoryInfo |

**Actions and states.** Filter one product/UOM basis; show quote versus ordered versus invoiced prices separately. A historical price can be proposed for a new PO only through the current resolver and approval policy. Exports run the identical authorized query and include filters, snapshot time and omitted-data warnings. Browser/terminal use the same rows; generic pivot/graph exploration is later through Insights, not assumed available.



**Source.** research §9; Odoo purchase history; mantle InventoryReportServices.get#PriceHistoryInfo.

**Needs.** PUR-REPORTS, PUR-ACCESS.

### SupplierStatement

**Layout.** report with options, tabular totals and source drill-in; XML list/export is the first release.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| SupplierStatementOptions | single | Set explicit report basis | supplier, buying organization, from/thru, currency, opening, bills/credits, applications/payments, closing | date-period; currency and measure selectors | none | Dolibarr supplier statement; Party FinancialInfo |
| SupplierStatementRows | list, read | Explain totals by source | supplier, buying organization, from/thru, currency, opening, bills/credits, applications/payments, closing | group totals; source links | proposed `ironstone.purchasing.ReportServices.get#SupplierStatement` | Dolibarr supplier statement; Party FinancialInfo |

**Actions and states.** Read-only reconciled AP activity for financial readers. No bank credentials or payment initiation; external supplier export includes only its own published document/reference and permitted remittance data. Exports run the identical authorized query and include filters, snapshot time and omitted-data warnings. Browser/terminal use the same rows; generic pivot/graph exploration is later through Insights, not assumed available.



**Source.** research §9; Dolibarr supplier statement; Party FinancialInfo.

**Needs.** PUR-REPORTS, PUR-ACCESS.

## 12. Settings

### Settings

**Layout.** settings landing linking domain and shared configuration.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| RequestPurposes | list, editable rows | Maintain purchase-request categories and routing | requestCategoryId, parentCategoryId, description, responsiblePartyId | responsible-party lookup | proposed `ironstone.purchasing.SettingsServices.store#RequestPurpose` over existing RequestCategory | ERPNext Material Request purpose/routing; existing RequestCategory fields |
| SettingsLinks | list, read | Find policy owners and effective configuration | organization, settings area, effective version, owner, access | authorized links | proposed `ironstone.purchasing.SettingsServices.get#PurchasingSettings` | ERPNext Buying Settings; Odoo purchase settings |
| SupplierClassifications | list, editable rows | Maintain the supplier category values buyers assign | partyClassificationId, parent classification, description, standard code | parent lookup | entity over existing `PartyClassification` | Carbon supplier types table; ERPNext Supplier Group |

**Actions and states.** Link PurchasePolicy, ApprovalPolicies, ScorecardPolicies, Products price lists/units, Warehouse receiving/quality, Accounting match/tax/budget policies and existing Commons user notifications. Supplier grouping uses existing PartyClassification/PartyClassificationAppl with PartyServices.set#PartyClassification/remove#PartyClassification under supplier authority. SupplierClassifications maintains the values themselves as PartyClassification rows of a proposed supplier-category classification type (seed `PcltSupplierCategory`, proposed; R-PUR-29). Match and bill policy link to Accounting's `Accounting/Settings/MatchPolicies`; settlement terms use Agreement/SettlementTerm. Integration credentials and transport configuration remain Admin-owned, not ordinary buyer form fields.



**Source.** research §10; ERPNext buying_settings.json; current Party classification and Agreement entities.

**Needs.** PUR-SETTINGS.

### PurchasePolicy

**Layout.** settings with effective policy version and preview.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| BuyingDefaults | single | Set organization-scoped defaults | organization, currency, price list, facility, buyer, settlement term, incoterm | typed shared lookups | proposed `ironstone.purchasing.SettingsServices.store#PurchasePolicy` | ERPNext Buying Settings; Odoo purchase settings |
| PurchaseControls | single | Set source/revision/acknowledgement behavior | RFQ response days, quote expiry warning days, PO lock policy, reminder days, substitution rule, recurring-release rule, supplier approval required, unapproved-supplier result Warn/Stop | version and effective date | proposed `ironstone.purchasing.SettingsServices.store#PurchasePolicy` | Odoo lock_confirmed_po and receipt reminder; ERPNext settings |
| PolicyDependencies | display | Show financial and stock policy owners | receipt requirement, overreceipt allowance, bill basis, two-way match, tolerance, same-rate rule, self-billing default, period, budget Warn/Stop | links to Accounting/Settings/MatchPolicies and the other shared owners; read-only values | proposed `ironstone.purchasing.SettingsServices.get#PurchasingSettings` | ERPNext po_required/pr_required controls; Accounting/Warehouse policy |

**Actions and states.** Administrator edits draft version, previews impacted open documents and activates from a date. Existing source documents retain applicable policy version until explicit revalidation. Purchase administrators cannot weaken match, stock or budget controls; show effective shared policy and owner link. Match policy belongs to Accounting at `Accounting/Settings/MatchPolicies`, written through proposed `MatchServices.store#MatchPolicy` over the proposed `mantle.account.invoice.InvoiceMatchPolicy`: organization, product category or product override, bill basis (ordered or received), receipt required, quantity, price and tax tolerance, same-rate action, service-acceptance rule, self-billing default, effective dates and version (D4; R-PUR-08). Disabling purchasing automation leaves manually created requests and current orders usable.



**Source.** research §10; inspected ERPNext buying_settings.json and Odoo purchase/views/purchase_views.xml.

**Needs.** PUR-SETTINGS, PUR-ORDER.

### ApprovalPolicies

**Layout.** settings list and policy detail forms.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ApprovalPolicyList | list | Find effective source approval rules | organization, source type, amount band/currency, category/facility, effective dates | version list | proposed `ironstone.purchasing.ApprovalServices.find#PurchaseApprovalPolicies` | Carbon purchasing approval settings; Odoo two-step approval |
| ApprovalPolicy | single | Define revision-bound approvers | organization, request/award/PO, threshold/currency, sequence, approver role/user, quorum, self-approval, expiry | party lookup and overlap validation | proposed `ironstone.purchasing.ApprovalServices.store#PurchaseApprovalPolicy` | Carbon purchasing approvals; Odoo approval threshold |
| ApprovalPreview | display | Explain rule and commitment decision | source revision, converted amount, selected tiers, eligible approvers, budget Warn/Stop | read-only preview with missing-policy error | proposed `ironstone.purchasing.ApprovalServices.preview#PurchaseApproval` | Carbon approval setup preview |

**Actions and states.** Policy activation requires administrator authority and rejects ambiguous bands or no eligible approver. With no active policy for an organization and source type, one approval step by the purchase-approver capability applies, and self-approval needs an explicit setting, so a one-person business can still approve (R-PUR-14). Proposed PurchaseApprovalDecision records source entity/ID/revision, policy version, approver, decision, date and reason; the business source remains authoritative. A material change invalidates decisions and resubmits notifications. Request approval does not invent ReqApproved; ReqReviewed remains reviewed. Budget checks/commitment lock at approval use Accounting AC-14 BudgetControlPolicy and its proposed `BudgetServices.check#Budget`, `reserve#Commitment`, `convert#Commitment` and `release#Commitment` (D10). Separate duty prevents buyer self-approval when required and does not imply finance payable approval.



**Source.** research §3, §5, §10; existing Request status family and Commons notification approval providers.

**Needs.** PUR-APPROVAL, PUR-BUDGET, PUR-SHELL.

### ScorecardPolicies

**Layout.** settings for versioned measures and response thresholds.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ScorePolicy | single | Set evaluation basis | organization, period, minimum sample, due-date basis, currency/FX basis, effective dates | versioned policy | proposed `ironstone.purchasing.ReportServices.store#ScorecardPolicy` | ERPNext Supplier Scorecard weighting function |
| ScoreCriteria | list, editable rows | Weight supported evidence measures | metric, weight, target/range, exclusion rule, required evidence | bounded typed criteria; no arbitrary server formula | proposed `ironstone.purchasing.ReportServices.store#ScorecardCriterion` | ERPNext Supplier Scorecard Criteria |
| ScoreActions | list, editable rows | Configure warning/review/block response | score/risk band, RFQ/PO effect, reviewer role, expiry, override reason rule | preview against prior period | proposed `ironstone.purchasing.ReportServices.store#ScorecardAction` | ERPNext warn_rfqs/warn_pos/prevent flags |

**Actions and states.** Default response is warn and assign review; blocking needs explicit approved rule, adequate data and authorized override path. Unsupported arbitrary score formulas and external risk feeds are later integrations; initial criteria are OTD, acceptance rate, price variance and response time with documented denominators.



**Source.** research §9–§10; inspected ERPNext supplier_scorecard.json.

**Needs.** PUR-REPORTS, PUR-SETTINGS.

## 13. Supplier access

These are bounded supplier pages under the common [external access contract](design-crosscut.md#5-external-access-and-shared-configuration).
They do not create a complete Commerce design. An authenticated supplier relationship or
expiring, revocable record-bound capability controls supplier, buying organization, document,
revision, operations and attachment visibility. The internal Purchasing root grant is not a
supplier grant. Invalid/revoked links reveal no supplier/document metadata; a forged route or
supplier ID cannot widen scope. Existing Projects intake tokens are project/request intake,
not general supplier access; this is an explicit extension using their isolation conventions.
Server authorization occurs before loading documents or attachments and again on submission.

**Root and routes** (D5; R-PUR-12, R-SB-14). The pages live under the supplier audience root
`screen/SupplierPortal.xml`, beside `screen/RequestIntake.xml` and the customer root
`screen/ServicePortal.xml`, not under `screen/Purchasing.xml`. The internal root runs
`setup#UserOrganizationInfo` on every request and needs the BOSS_PURCHASING grant; the supplier
root does neither. It has its own user group and entity filter set, on the pattern of the
existing BOSS_PROJECT_CLIENT group, and hidden Chatter and RecordFiles mounts whose client checks
go through the same capability service (R-XC-05). Its pages are Home (`SupplierPortal`),
`QuoteResponse`, `OrderAcknowledgement` and `BillUpload`, where Accounting's shared
SupplierBillUpload is mounted once for both apps. A signed-in supplier user reaches the list on
Home. A single-record link is a MoquiConf token route, `/rfq/<token>` for an invitation and
`/po/<token>` for a sent PO revision, with a route rate limit and a `require-authentication="false"`
screen at the root. Each token is checked by the proposed `mantle.party.ExternalAccessServices.check#AccessToken`.
Capabilities are created and revoked through proposed `create#AccessCapability` and
`revoke#AccessCapability` over the proposed `mantle.party.ExternalAccessCapability` record
(record entity, ID and revision, party, scope, expiry, revokedDate, token digest). `ironstone.purchasing.PortalServices` only wraps these
services; it keeps no token rules of its own.

### SupplierPortal

**Layout.** landing of published RFQs, POs and submitted bills in the authorized supplier scope.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| SupplierDocuments | list, read | Show permitted supplier work | document/ref, buyer organization, response due, published state, action | record-scoped links | proposed `ironstone.purchasing.PortalServices.get#SupplierHome` | ERPNext supplier portal; Carbon share RFQ |
| SupplierContact | display | Show buyer contact and access expiration | organization public name, buyer public contact, capability expiry | no internal directory | proposed `ironstone.purchasing.PortalServices.get#SupplierHome` | Carbon shared purchasing RFQ |

**Actions and states.** Authenticated portal may list documents allowed by its supplier relationship; a single-record capability shows only that record and permitted next steps. It cannot enumerate RFQs, competitors, internal requests, costs, other parties or private files. Terminal uses an authenticated scoped view; private emailed token should not be logged as a command argument.



**Source.** research §2, §4, §11; inspected `frappe/erpnext/erpnext/templates/pages/rfq.py` checks supplier RFQ membership and exposes limited portal data; Carbon share routes.

**Needs.** PUR-PORTAL.

### QuoteResponse

**Layout.** task with published specification, offer entry, preview and submit receipt.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| PublishedQuoteRequest | display | Read invited revision and permitted files | RFQ revision, product/specification, qty/UOM, required date, deadline, public terms | download links checked per file | proposed `ironstone.purchasing.PortalServices.get#QuoteInvitation` | ERPNext rfq.py get_portal_doc; Carbon share RFQ |
| SupplierOffer | list, editable rows | Enter own offered items and tiers | supplier quote ref, line, offered product/code, qty/UOM, tier price/currency, lead time, validity, terms, file | phone-friendly one-line editor | proposed `ironstone.purchasing.PortalServices.save#QuoteResponse` | ERPNext portal supplier quotation; Carbon shared supplier quote |
| SubmitResponse | dialog | Confirm immutable supplier submission | invitation/revision, response version, operation ID, consent to terms, submitted time | preview and confirm | proposed `ironstone.purchasing.PortalServices.submit#QuoteResponse` | ERPNext supplier quotation portal; Carbon share supplier quote |

**Actions and states.** Save draft is private to the supplier and authorized buyer policy; submit creates a dated quote version and notification. Late response is visibly late and accepted only if policy permits; stale/withdrawn invitation refuses mutation and offers the current invitation if separately authorized. Repeated submit returns prior receipt. The supplier cannot set approval, award, other supplier, buyer price maximum or source-demand fields.



**Source.** research §4; ERPNext templates/pages/rfq.py/rfq.html; `carbon/apps/erp/app/routes/share+/supplier-quote.$id.tsx`.

**Needs.** PUR-PORTAL, PUR-RFQ, CX-PORTALS.

### OrderAcknowledgement

**Layout.** task for one published PO revision with per-line promise.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| PublishedPurchaseOrder | display | Read sent PO and public documents | PO revision, buyer/supplier, ordered items, qty/UOM, price, due, terms | html-print link | proposed `ironstone.purchasing.PortalServices.get#PublishedPurchaseOrder` | ERPNext Purchase Order confirmation; Carbon purchase share |
| AcknowledgeOrder | single | Confirm or propose changes to current revision | supplier ref/date, accept/reject, per-line confirmed qty/date, exception reason, attachment, operation ID | old/requested date beside response | proposed `ironstone.purchasing.PortalServices.acknowledge#PurchaseOrder` | Odoo receipt date confirmation; ERPNext confirmation fields |

**Actions and states.** Submit acknowledges exact revision. Partial/rejected or changed promise routes to buyer review and does not update PO price/quantity, create stock or approve payment. An older version returns SupersededRevision and never acknowledges a newer PO implicitly. Phone and terminal show one line at a time with the same final summary. For subcontract POs, show only this supplier's service lines, company-owned component custody, due dates and approved dispatch/inspection evidence. The same supplier-facing contract can be mounted for standalone Manufacturing; supplier confirmations are claims for internal review and never post stock receipts or verify quality.



**Source.** research §5; Odoo purchase reminders; ERPNext purchase_order.json confirmation fields.

**Needs.** PUR-PORTAL, PUR-ORDER.

### SupplierBillUpload

**Context passed.** Mount `SupplierPortal/BillUpload` in the supplier root, once for Purchasing and Accounting; [Accounting §5 SupplierBillUpload](design-accounting.md#supplierbillupload) and crosscut §5. There is no second supplier URL for it. Fix supplier and buying organization from verified external scope. Show only own published eligible PO references; upload reference/date/currency/amount/source file using proposed ironstone.accounting.PortalServices.submit#SupplierBill/get#Submission. Duplicate capability submission/reference returns the original receipt. This creates incoming bill evidence for AP, never a financial approval or permission to inspect unrelated invoice/payment data. For a self-billing supplier the upload attaches its evidence to the receipt-generated draft instead of creating a second bill (D2). BOSS shares identity, attachment rules and status receipt across customer/vendor pages; no separate Purchasing invoice-intake model.

**Needs.** PUR-PORTAL, AC-02.

## 14. Baseline coverage and validation

### 14.1 Source status and reference evidence

The active XML parser/source check excludes comments. These distinctions are implementation gates,
not unresolved design alternatives:

| Source | Verified behavior | Design consequence |
| --- | --- | --- |
| `entity/RequestEntities.xml`; `service/mantle/request/RequestServices.xml` | RqtPurchase and Request/RequestItem/RequestItemOrder exist; Request item has no quantityUomId; links, intake and request-to-work services are active | Extend units/revision/organization and purchase completion policy; reuse current Projects screen and links. RqtPurchaseRfq is proposed. |
| `service/mantle/order/OrderServices.xml` create#PurchaseRequestOrder | Requires facility, groups supplier items, returns early on missing supplier, scalar outputs; no per-supplier result collection; iterates every RequestItem on each call without checking RequestItemOrder; `placeAndApproveOrders` places and approves | PUR-REQUEST extension is required before mixed-success sourcing. Do not claim the existing primitive meets that contract. No context calls it directly (R-PUR-01). |
| `service/mantle/order/OrderInfoServices.xml` send#OrderStoreEmail | Returns without sending when the order has no ProductStore; recipient defaults to the part's customer party; skips an email type already sent | POs are sent by proposed `send#PurchaseOrder` (R-PUR-02). |
| `service/mantle/order/OrderServices.xml` cancel#OrderItem, complete#Order | cancel#OrderItem defaults its quantity to what is not yet issued, from AssetIssuance; complete#Order only sets OrderCompleted | `close#PurchaseRemainders` always passes an explicit cancelQuantity (R-PUR-03). |
| `service/mantle/order/OrderServices.xml` autoApprove#Order; `service/OrderReturn.secas.xml` | OrderPlaced runs autoApprove#Order for POs too; it approves when payments cover the total and check#OrderPreApprove adds no warning | Proposed `check#PurchaseApprovalRequired` adds the warning (R-SB-10). |
| `service/mantle/product/PriceServices.xml` modify#ProductPrice | A `type="interface"` hook in the resolver pipeline, not a store service | Supplier prices are written through Products' proposed `store#ProductPrice` (R-PUR-04). |
| `entity/OrderEntities.xml` status flow | OrderBeingChanged only from OrderOpen or OrderProposed; Placed, Processing and Approved can go to Hold; no Sent → Hold; Approved → Placed reruns the OrderPlaced SECAs | Revisions and buyer holds lock with OrderHold and a proposed OrderHoldReason (R-PUR-05, R-SB-07). |
| `entity/ProductDefinitionEntities.xml`; `service/mantle/product/PriceServices.xml` | ProductPrice contains supplier code/name, lead time, quantityUomId, agreement and parties; one active resolver | Use correct purchase party direction and Products rule/trace extension; no duplicated supplier catalog engine. |
| `entity/PartyEntities.xml` | Agreement/AgreementItem/AgreementTerm active; no AgrPurchase purchase lifecycle seed | Add purchase type, version/approval and release caps; retain existing term/content primitives. |
| `entity/OrderEntities.xml` | OrderHeader.orderRevision and OrderPart supplier reference fields active | Immutable change/acknowledgement history and approval invalidation are proposed. |
| `entity/ShipmentEntities.xml`; `entity/ProductAssetEntities.xml` | Shipment/order source links and accepted/rejected AssetReceipt quantities active | Shared quality holds/disposition and receipt-specific return allocation need additions. |
| `service/mantle/account/InvoiceServices.xml`; `AccountingInvoice.secas.xml` | Active invoice source application and purchase-shipment invoice creation exist; at ShipDelivered the SECA bills accepted plus rejected quantity, with quarantined units as accepted | PUR-MATCH supplies locking/tolerances/hold controls; the receipt SECA runs only for self-billing suppliers with accepted-only billing (R-SB-01; D2). |
| `service/mantle/order/ReturnServices.xml` calculate#OrderItemReturnable; `service/mantle/shipment/ShipmentServices.xml` receive#EntireShipment | Returnable quantity is billed quantity minus returned quantity; receive#EntireShipment accepts every unhandled unit and delivers | Supplier returns use proposed `find#ReturnableReceipts` (R-SB-06); short receipts use `close#ReceiptRemainder` (R-SB-11). |
| `service/mantle/product/InventoryReportServices.xml` | Projected inventory/price history depend on indexed documents | Expose freshness/completeness; revalidate current transactional demand/supply before creation. |
| Framework `moqui.basic.UomConversion` | fromDate/thruDate already exist on conversion | Use dated UomConversion; do not invent UomConversionDated. |
| `service/mantle/shipment/CarrierServices.xml`; ledger services | get#ShipmentRates and calculate#GlJournalTrialBalance definitions are commented out although the inventory lists them | Do not label them active or use them as Purchasing dependencies. Supplier shipping rates remain an explicit shared integration need. |

Concrete local references inspected for this design include:

- `odoo/odoo/addons/purchase/views/purchase_views.xml`: confirmed-PO locks, approval buttons,
  supplier selector, receipt reminder and acknowledgement-date controls.
- `frappe/erpnext/erpnext/buying/doctype/request_for_quotation/request_for_quotation.json`:
  multi-supplier recipients, item specifications, terms, shipping/billing and attachment publishing.
- `frappe/erpnext/erpnext/buying/doctype/supplier_quotation/supplier_quotation.json`:
  supplier reference, currency/conversion, validity, quantity/price lines and terms.
- `carbon/apps/erp/app/modules/purchasing/ui/SupplierQuote/SupplierQuoteCompareDrawer.tsx`:
  compare quantity tiers then select items; BOSS uses XML split/lists for the same task.
- `frappe/erpnext/erpnext/buying/doctype/purchase_order/purchase_order.json`:
  confirmation number/date, shipping/dropship and subcontracting source fields.
- `frappe/erpnext/erpnext/buying/doctype/buying_settings/buying_settings.json`:
  PO/receipt requirements, same-rate policy, over-order/transfer and rejected-quantity controls.
- `frappe/erpnext/erpnext/buying/doctype/supplier_scorecard/supplier_scorecard.json`:
  criterion weights, score periods and explicit warning/prevention flags.
- `frappe/erpnext/erpnext/templates/pages/rfq.py`: supplier-to-RFQ membership check and limited
  response payload; BOSS additionally binds each invitation to a revision and allowed operations.

### 14.2 Research candidate and question disposition

| Research area/candidate | Screen disposition | Scope and decision |
| --- | --- | --- |
| §1 Home/work queue | Home | new; actionable counts, assigned work and links, including shortfall suggestions and quotes expiring (R-PUR-28); no proprietary dashboard dependency |
| §2 Supplier 360, supplier products/prices, documents and risks | Suppliers, Supplier360, SupplierPrices, ScorecardDetail | parity identity/prices; new profile/risk and supplier approval status (R-PUR-15); financial bank edits remain separately authorized |
| §3 Internal requisition, demand triage and convert | Requests, RequestDetail, RequestSourcing | parity request forms; new approval/provenance/batch conversion |
| §4 RFQ, supplier quotes, compare, award, vendor pages | QuoteRequests, QuoteRequestDetail, Quotes, QuoteDetail, QuoteComparison, Award, QuoteResponse | new; purchase-specific Request type and independent supplier offer records; no use of customer RqtQuote |
| §5 POs, revision/approval/lock/acknowledgement, blanket/template, leases | PurchaseOrders, OrderDetail, OrderChanges, Acknowledgements, Approvals, Agreements, AgreementDetail, LeaseOverview | parity order/agreement forms; new controls; later Accounting-owned lease schedule |
| §6 Replenishment/min-max/MRP and automation | SupplyPlanning, InventoryAvailability, ReorderRules | parity stock policy/availability; new common planning, never a second buyer-only MRP engine |
| §7 Expected receipts, inspection, supplier return, shipping | Receipts, ShipmentDetail, Inspections, QualityInspection, InspectionTemplates, Returns, ReturnDetail | parity receipt/return primitives; new shared inspection/holds and receipt allocation; advanced NCR/CAPA later shared quality extension |
| §8 Bills, PO-receipt match, PDF extraction, payables handoff | Bills, InvoiceDetail, MatchExceptions, InvoiceMatch, SupplierBillUpload | parity bills; new match/hold/intake controls; later OCR within Accounting intake; payments reused through granted shared actions |
| §9 Performance/analytics, statement, risk | Scorecards, ScorecardDetail, Spend, Commitments, ProcurementTracker, PurchaseHistory, SupplierStatement | new; evidence-based XML reports; later arbitrary analytics via Insights and external risk feeds |
| §10 Settings/classification/terms/supplier prices | Settings, PurchasePolicy, ApprovalPolicies, ScorecardPolicies, Supplier360, AgreementDetail, SupplierPrices | parity source classification/terms/prices, new effective policies; supplier categories in Settings SupplierClassifications (R-PUR-29); receipt-before-bill and same-rate rules in Accounting's MatchPolicies (R-PUR-08); shared owner controls stock/finance |
| §11 Cross-app surfaces | Shared contexts and shell providers | current Commons/Projects implementations reused; terminal/handheld and standalone use explicit |
| §12 Baseline and §13 model/sequencing/questions | §14.1, §14.3, §16–§18 | Every candidate accounted for; no absent data or framework capability represented as existing |

Research §13's six open questions are resolved in §17: purchase RFQ representation,
shared purchase request granularity, supplier portal conventions, agreement model, source
approval model and shared replenishment/MRP. The remaining review items in §18 concern policy
choices or rollout dependencies, each with a recommendation; they do not contradict shared
screen or transaction ownership.

### 14.3 Baseline form coverage

The exact additive inventory map accompanies this document's review. The following rows are
the bounded purchasing ownership/context mapping; unrelated sales promotions, gateway payment
operations and specialized customer statements remain with their corresponding app designs.
Form names are inventory names, even where several nested forms share a screen XML name.

| Baseline screen family | Forms covered / relevant boundary | Purchasing path |
| --- | --- | --- |
| Supplier/FindSupplier | CreatePersonForm, CreateOrganizationForm, OuterSearchForm, SupplierListForm | Purchasing/Suppliers |
| Party/EditParty and contact/identity, role/classification/detail forms | Supplier360 shares party identity/contact/address/roles/classifications and authorized financial summaries; bank writes require finance grant | Purchasing/Suppliers/Supplier360 |
| Catalog/Product/EditPrices | NewPriceForm, PricesForm | Purchasing/Suppliers/SupplierPrices |
| Request/FindRequest | NewRequestForm, ListRequests | Purchasing/Requests |
| Request/EditRequest; EditRequestItems; request comments/content/related work | EditRequest, AddPartyForm, UpdatePartyForm, NewRequestItemForm, RequestItemListForm; current shared notes/files/work links; sourcing extension of create#PurchaseRequestOrder | Purchasing/Requests/RequestDetail; Purchasing/Requests/RequestSourcing |
| Order/FindOrder | CreatePurchaseOrder, OrderList, ApproveOrdersForm, CloseOrdersForm | Purchasing/Orders/PurchaseOrders |
| Order/OrderDetail; OrderItems | Header/part/item creation/edit, revision/audit, close remainder, recurrence, send/evidence, source shipment links; promotional code and customer gateway forms excluded | Purchasing/Orders/OrderDetail; Purchasing/Orders/OrderChanges |
| Party/FindAgreement; EditAgreement | NewAgreement, AgreementList; EditAgreement, AddSettlementTerm, AddOtherTerm, AgreementTermList, AddAgreementItem, AgreementItemList, NewContentForm, UpdateContentForm | Purchasing/Agreements; Purchasing/Agreements/AgreementDetail |
| Facility/EditFacilityProducts | AddProductForm, ProductList | Purchasing/Replenishment/ReorderRules |
| Shipment/FindShipment, ShipmentDetail and ReceiveItem | Purchase source search, shipment/header/contents, receipt item/lot quantities and carrier/progress read context; full pack/ship parity is Warehouse-owned | Purchasing/Receiving/Receipts; Purchasing/Receiving/ShipmentDetail |
| Return/FindReturn, EditReturn, EditReturnItems, AddOrderItems | Supplier create/list/header/item/eligible source quantities through ReturnDetail | Purchasing/Returns; Purchasing/Returns/ReturnDetail |
| Accounting/Invoice/FindInvoice, EditInvoice, EditInvoiceItemOrders, EditInvoiceItemShipments | InvoiceList and bill header/items, order/receipt allocation and payment summary through shared screens; finance mutations require finance capability | Purchasing/Bills; Purchasing/Bills/InvoiceDetail; Purchasing/Bills/InvoiceMatch |

### 14.4 End-to-end acceptance

These are design acceptance scenarios to exercise during implementation. Documentation review
checks the stated ownership/contracts now; it does not claim an executable business test passed.

| Scenario | Required result / partial failure |
| --- | --- |
| Variant → supplier pack price → request/RFQ → split award → PO → partial receipt/inspection → split bill → payment | Order actual variant in dated pack conversion; freeze offer/approval revision. One supplier group can fail SupplierBlocked while another creates a draft PO. Receive 8/10 into quality hold, inspect seven accepted and one rejected; only the seven disposed/released accepted units are eligible. Price variance creates hold; match operator allocates, finance releases/approves/pays. Original source quantities and remaining 2 ordered reconcile. |
| Shortage → shared buy/make/transfer plan → partial production → stock/GL | One common requirement ledger subtracts existing PO/production/transfer allocation. Concurrent conversion yields DemandAlreadyCovered for one item. Make creates WeInPlanning draft; separate release fixes BOM. Manufacturing issue/completion costs and Accounting valuation/GL link back without treating quote/RFQ as supply. |
| Sales order reservation → pick shortfall → alternate buy/transfer → pack/ship/invoice | Shortfall leaves explicit demand/backorder; no buyer action releases reserved stock. Authorized substitute confirms product/UOM/specification and customer requirement. New supply is linked once; Warehouse and Accounting perform their own physical and financial postings. |
| Customer case → RMA → disposition → vendor return and supplier credit/replacement | Customer settlement remains Customer Service/Accounting contract; procurement may create a linked supplier return for eligible source receipt. Supplier dispatch does not complete customer refund or create a second credit. Net billed/paid/returned quantities cap settlement; supplier replacement has a separate linked PO/expected receipt. |
| Count → intervening movement → variance → posting/retry | Shared count session snapshots movement/version; an intervening receipt/issue raises a conflict and requires recount by default. Explicitly authorized movement reconciliation is an audited exception, never silent recomputation from a stale count. Buyer projected availability reflects posted adjustment, never a raw counted value. Retry returns same posting; rejected independent count lines remain named failures. |
| Case intake → assignment → SLA pause/reopen → resolution/CSAT | Purchasing supplier follow-up links existing Request/WorkItem; it does not redefine Customer Service SLA or auto-close the customer case when a PO/receipt changes. Supplier visibility never includes customer-private case notes. |
| Cancellation, failed inspection and substitution | Cancel RFQ revokes invitations but retains offers; cancel PO remainder releases only unused demand/commitment; posted receipts/bills require linked corrections. Failed inspection holds stock and match quantity. Substitute cannot mutate released BOM or existing received identity. |
| Closed period, unauthorized action and standalone use | Period-locked bill correction is refused or posted by authorized correction in an open period with lineage. Forged supplier/app/organization context is denied. A user with Purchasing plus receiving/finance capabilities completes work from shared mounts without Warehouse/Accounting root grants; without them sees request/handoff action only. |
| Named independent failures, atomic inner posting | Imports, supplier groups, RFQ emails, batch approvals and reports name each failing row/document and continue independent work. Within a stock movement, award/source allocation or invoice/credit posting, all quantity/value/source/hold effects commit or roll back together. Timeout/retry resolves operation identity before further mutation. |

### 14.5 Exact additive inventory map

Each row below adds its Purchasing path to **Designed in**; earlier paths and all **Implemented in** values remain unchanged. Shared forms remain defined by their canonical owner. Item/receipt/financial forms are contextual reuse and still require their independent action capabilities.

| Inventory section / screen | Forms | Designed in addition |
| --- | --- | --- |
| Supplier/FindSupplier | `CreatePersonForm`, `CreateOrganizationForm`, `OuterSearchForm`, `SupplierListForm` | `Purchasing/Suppliers` |
| Party/EditParty | `EditOrganizationForm`, `EditPersonForm`, `AddDirectRoleForm`, `AddOtherRoleForm`, `RolesForm`, `SetClassificationForm`, `ClassificationsForm`, `AddIdentificationForm`, `IdentificationsForm`, `AddContactAssignForm`, `CreateContactForm`, `ContactRelList`, `NewNoteForm`, `UpdateNoteForm`, `OtherCreateForm`, `PhonePurposeForm`, `EmailPurposeForm`, `WebPurposeForm`, `OtherUpdateForm`, `OtherPurposeForm`, `PostalPurposeForm`, `NewContentForm`, `UpdateContentForm` | `Purchasing/Suppliers/Supplier360` |
| Party/FinancialInfo | `UnpaidPayablesList`, `OutgoingPaymentList`, `PurchaseOrderList`, `PaidPayablesList` | `Purchasing/Suppliers/Supplier360` |
| Catalog/EditPrices | `NewPriceForm`, `PricesForm` | `Purchasing/Suppliers/SupplierPrices` |
| Request/EditRequest | `EditRequest`, `AddCommentForm`, `AddPartyForm`, `UpdatePartyForm`, `NewNoteForm`, `UpdateNoteForm`, `NewContentForm`, `UpdateContentForm`, `RequestTaskList` | `Purchasing/Requests/RequestDetail` |
| Request/RequestCommentReply | `ReplyCommentForm` | `Purchasing/Requests/RequestDetail` |
| Request/RequestCommentUpdate | `ReplyCommentForm` | `Purchasing/Requests/RequestDetail` |
| Request/EditRequestItems | `NewRequestItemForm`, `RequestItemListForm` | `Purchasing/Requests/RequestDetail` |
| Request/EditTasks | `AddRweForm`, `NewTaskForm`, `UpdateRweForm` | `Purchasing/Requests/RequestDetail` |
| Request/EditUsers | `AddUserForm`, `UpdateUserForm` | `Purchasing/Requests/RequestDetail` |
| Request/EditWikiPages | `AddWprForm`, `DeleteWprForm` | `Purchasing/Requests/RequestDetail` |
| Request/FindRequest | `NewRequestForm`, `ListRequests` | `Purchasing/Requests` |
| Order/FindOrder | `ApproveOrdersForm`, `CloseOrdersForm`, `CreatePurchaseOrder`, `OrderList` | `Purchasing/Orders/PurchaseOrders` |
| Order/OrderDetail | `CloseOrderPartItems`, `AddPartForm`, `RecurOptions`, `AuditLogList`, `HeaderForm`, `ItemLimitForm`, `NewNoteForm`, `UpdateNoteForm`, `NewContentForm`, `UpdateContentForm`, `SendPlacedEmailForm`, `EmailMessageList`, `SystemMessageList`, `ChildOrderList`, `AddOrderPartToShipmentForm`, `EditPartForm`, `EditPartNonEdForm`, `CreateOrderPartParty`, `SetOrderInfoForm`, `AddProductItemForm`, `AddOtherItemForm`, `OrderItems` | `Purchasing/Orders/OrderDetail` |
| Order/EditItem | `EditOrderItem` | `Purchasing/Orders/OrderDetail` |
| Order/OrderItems | `AddProductItemForm`, `AddOtherItemForm`, `OrderItems` | `Purchasing/Orders/OrderDetail` |
| Party/FindAgreement | `NewAgreement`, `AgreementList` | `Purchasing/Agreements` |
| Party/EditAgreement | `EditAgreement`, `AddSettlementTerm`, `AddOtherTerm`, `AgreementTermList`, `AddAgreementItem`, `AgreementItemList`, `NewContentForm`, `UpdateContentForm` | `Purchasing/Agreements/AgreementDetail` |
| Facility/EditFacilityProducts | `AddProductForm`, `ProductList` | `Purchasing/Replenishment/ReorderRules` |
| Shipment/FindShipment | `ShipmentList` | `Purchasing/Receiving/Receipts` |
| Shipment/ShipmentDetail | `AuditLogList`, `EditShipment`, `ItemLimitForm`, `ShipmentOrderPaymentList`, `ShipmentInvoicePaymentList`, `AddParty`, `RolesForm`, `NewContentForm`, `UpdateContentForm`, `SendPlacedEmailForm`, `EmailMessageList`, `AddItemForm` | `Purchasing/Receiving/ShipmentDetail` |
| Shipment/ReceiveItem | `ReceiveForm` | `Purchasing/Receiving/ShipmentDetail` |
| Shipment/ShipmentItems | `AddItemForm`, `ItemsOptionsForm`, `UpdateItemForm`, `ItemSourceReceiptList`, `ItemAssetReceiptList` | `Purchasing/Receiving/ShipmentDetail` |
| Return/FindReturn | `CreateSupplierReturn`, `ReturnHeaderList` | `Purchasing/Returns` |
| Return/EditReturn | `AuditLogList`, `UpdateReturn` | `Purchasing/Returns/ReturnDetail` |
| Return/EditReturnItems | `ReturnItemList` | `Purchasing/Returns/ReturnDetail` |
| Return/AddOrderItems | `LookBackDaysForm`, `AddOrderItemToReturn` | `Purchasing/Returns/ReturnDetail` |
| Accounting/FindInvoice | `InvoiceList` | `Purchasing/Bills` |
| Accounting/EditInvoice | `OutSystemMessageList`, `AuditLogList`, `EditInvoice`, `NewContentForm`, `UpdateContentForm`, `EmailMessageList`, `PaymentApplicationList`, `OrderPromisedPaymentList`, `InvoiceTxList`, `InvoiceGlaList` | `Purchasing/Bills/InvoiceDetail` |
| Accounting/EditInvoiceItemDetails | `AddDetailForm`, `AssetItemDetailList`, `FacilityItemDetailList`, `ItemDetailList` | `Purchasing/Bills/InvoiceDetail` |
| Accounting/EditInvoiceItems | `CreateInvoiceItem`, `EditInvoiceItems` | `Purchasing/Bills/InvoiceDetail` |
| Accounting/EditInvoiceItemOrders | `ApplyToOrder`, `ApplyItemToOrder`, `ItemBillingList` | `Purchasing/Bills/InvoiceMatch` |
| Accounting/EditInvoiceItemShipments | `ApplyToShipment`, `ApplyItemToShipment`, `ItemSourceList` | `Purchasing/Bills/InvoiceMatch` |

Existing service mappings add only direct documented calls/context primitives. Proposed services have no inventory rows yet. The purchase-shipment invoice SECA is a source behavior dependency, not a new screen call.

## 15. Documents and outputs

| Output | Kind | From screen | Derived from |
| --- | --- | --- | --- |
| RFQ and supplier invitation | html-print/PDF and reviewed email | QuoteRequestDetail | ERPNext RFQ print/message/attachment choices; Commons delivery/outbox |
| Supplier offer/award comparison | html-print and CSV export with original/normalized basis | QuoteDetail; QuoteComparison; Award | Carbon quote comparison; ERPNext supplier quotation |
| PO, revision and supplier acknowledgement | html-print/PDF and reviewed email through proposed `send#PurchaseOrder`, with a `/po/<token>` acknowledgement link | OrderDetail; OrderChanges; Acknowledgements | Order/PrintOrder; Odoo purchase report and reminder |
| Regret notice to suppliers not awarded | reviewed email, per-recipient outcome | Award CloseSolicitation | Odoo purchase_alternative warning |
| Agreement/terms and release history | html-print/PDF; authorized attachment download | AgreementDetail | Party agreement content and Odoo blanket order |
| Receiving checklist, inspection report and supplier return authorization | html-print/PDF and labels through Warehouse | ShipmentDetail; QualityInspection; ReturnDetail | Shipment/Return baseline and shared Warehouse outputs |
| Bill, match explanation and supplier statement | html-print/PDF/CSV with allowed financial fields | InvoiceDetail; InvoiceMatch; SupplierStatement | Accounting invoice print/source applications; Dolibarr supplier statement |
| Supplier price and reorder import | CSV mapping/preview/results; Products' proposed ProductImport (PRD-IMPORT) | SupplierPrices; ReorderRules | Products supplier price import; ProductFacility forms |
| Procurement, spend, commitment and scorecard reports | CSV/export and html-print with snapshot/filter metadata | Performance screens | ERPNext buying reports; Odoo purchase analysis |
| External submission receipt | browser/terminal confirmation and authorized email | QuoteResponse; OrderAcknowledgement; SupplierBillUpload | Existing intake receipt conventions; Accounting submission receipt |

Print/email uses the rendered, authorized document revision. Download URLs recheck access;
public attachment selection is explicit. Email send is a reviewed user action; automatic
reminders use an explicitly enabled policy. Independent delivery/export items keep named
failures; successful deliveries are not repeated on retry. CSV exports guard spreadsheet
formula-like text. Imports validate decimal quantities, currencies, dates, organization and
supplier identity; each row returns source line number, canonical ID and error, retaining
valid independent rows. Never publish internal quote comparison or competitor data to vendors.

## 16. Framework and data needs

Local IDs below are inputs to the coordinator's crosscut roll-up; shared stock, pricing,
quality, planning, financial and portal needs are defined there once. All new entity, field,
enum and service names below are proposed. Framework XML list/split/forms, shell context, Commons files/Chatter,
notifications, calendars and Projects links/intake already exist; no new widget is required
for the initial Purchasing screens.

| Need | Kind | Proposed as | Used by | Stub spec |
| --- | --- | --- | --- | --- |
| PUR-ACCESS | service type, seed data | Purchasing action capabilities and authorized shared adapters; the groups `BOSS_PURCHASING_REQUESTER`, `BOSS_PURCHASING_BUYER`, `BOSS_PURCHASING_PLANNER`, `BOSS_PURCHASING_APPROVE`, `BOSS_PURCHASING_READ` and `BOSS_PURCHASING_ADMIN` (§1; D22) | all screens | Per-organization/record/action/field checks for requester, buyer, planner, purchase approver, match operator, receiver, inspector and separate finance roles; shared service access independent of another app root. Borrowed capabilities map to their owner's groups in crosscut §1. |
| PUR-SHELL | shell item, seed data | Buyer providers, a product lookup provider and the NotificationTopic rows `PurchaseRequestApproval`, `PurchaseAwardApproval`, `PurchaseOrderApproval` and `PurchaseSupplierApproval` with their handlers | Home, Approvals, RFQ/PO flows, Product360 | Authorized palette/Today counts; quick create; approval, response, late receipt, match exception topics; each approval topic names `approve#PurchaseSource` and `refuse#PurchaseSource` as its approve and refuse services, and its message carries sourceRevision, policyVersion and decisionStepId; same source revision decision in inbox/local UI. |
| PUR-SUPPLIER | data model, service type, seed data | mantle.party.supplier.SupplierProfile with `selfBillingIndicator` and `approvalStatus`, and SupplierRisk; ironstone.purchasing.SupplierServices `store#SupplierProfile` | Supplier360, Suppliers, Scorecards, Bills | Profile key supplier+internal organization; buyer, currency/settlement/incoterm defaults, dated sourcing block/risk, reason, evidence. Default terms and the self-billing flag are finance-edited (D2, D26). Approval status seed Pending, Approved, Rejected, Suspended with the PurchaseSupplierApproval topic (R-PUR-15). Reuse ProductPrice, Party classifications and Products import/resolver. Do not duplicate supplier banking or catalog masters; bank, identification and tax forms are crosscut §3.3's. A SupplierQualifications record would join this family if crosscut's Open item on it (R-XC-46) is accepted. |
| PUR-REQUEST | data model, service type | Request organization/revision and RequestItem.quantityUomId; purchase-aware completion; ironstone.purchasing.RequestServices | RequestDetail, RequestSourcing | Approved source quantity provenance; approval creates or links a Requirement through `RequirementRequestItem` (R-PUR-06); preview/convert#PurchaseSourcing, per-supplier operations/results, transactional RequestItemOrder/RequirementSupply allocation; existing create#PurchaseRequestOrder needs explicit extension, and the guard rejects `placeAndApproveOrders=true` and sourced quantities (R-PUR-01); `get#PurchaseRequestProgress` for crosscut §3.11; `complete#RequestFromWork` does nothing for purchase types; purchase completion uses fulfillment facts. |
| PUR-RFQ | data model, seed data, service type | Proposed RqtPurchaseRfq and its request-type policy; mantle.order.purchase.PurchaseRfqInvitation, SupplierQuote, SupplierQuoteItem, SupplierQuotePriceBreak, SupplierQuoteContent, PurchaseAward; ironstone.purchasing.SourcingServices (`find#QuoteRequests`, `create#QuoteRequest`, `store#QuoteRequest`, `store#QuoteRequestItem`, `store#QuoteInvitation`, `send#QuoteRequest`, `get#QuoteRequest`, `close#QuoteRequest`, `publish#SupplierQuotePrice`) | QuoteRequests through Award | Versioned RFQ/items, invitation scope/delivery, supplier quote versions/tiers, partial awards and locked remaining demand; source association RFQ item→RequestItem/Requirement. Quotes are not supply; awards reference canonical RequirementSupply and PO/item. RFQ requests are excluded from generic request lists and RequestDetail mounts (R-PUR-13). Quote prices publish through Products' `store#ProductPrice` (R-PUR-21). |
| PUR-APPROVAL | data model, service type, seed data | mantle.order.purchase.PurchaseApprovalPolicy/PurchaseApprovalDecision; ironstone.purchasing.ApprovalServices (`decide#PurchaseApproval`, `approve#PurchaseSource`, `refuse#PurchaseSource`); SECA `check#PurchaseApprovalRequired` on `check#OrderPreApprove` | Requests, Award, PO, Agreements, Approvals, Supplier360 | Policy bands/roles/separation by organization and source type; revision-bound decision history, invalidation on material edit, source state gate and Commons decision handlers that reject a stale revision. Refuse: PO OrderPlaced → OrderRejected, request stays ReqSubmitted, award stays draft, supplier Rejected. With no policy, one step by the purchase-approver capability; self-approval only by explicit setting. The SECA keeps Mantle's auto-approval from approving a purchase part without a current decision (D8; R-SB-10). No duplicate generic approval lifecycle. |
| PUR-ORDER | data model, service type | mantle.order.purchase.PurchaseOrderRevision/PurchaseAcknowledgement/ServiceAcceptance; ironstone.purchasing.OrderServices (`send#PurchaseOrder`, `close#PurchaseRemainders`, `apply#PurchaseRevision`, `merge#DraftPurchaseOrders` later); uses Mantle's proposed `hold#Order`, `release#OrderHold` and OrderHoldReason | OrderDetail, OrderChanges, Acknowledgements, PurchaseOrders | Immutable original/requested/confirmed values, lock/reapproval through OrderHold with a Purchase or Change reason (D7), per-line supplier promise, changes constrained by posted quantities; idempotent revision publish and per-recipient delivery outcome; remainder close with an explicit cancelQuantity (R-PUR-03); a revision adjusts the expected receipt and queues match re-evaluation. Existing orderRevision and supplier ref fields retained. |
| PUR-AGREEMENT | data model, seed data, service type | AgrPurchase; Agreement status seed AgmStDraft, AgmStActive, AgmStExpired, AgmStClosed, AgmStCancelled; `AgreementItem.amountCap` and `releaseTolerancePercent`; agreement version/release allocation; ironstone.purchasing.AgreementServices | AgreementDetail | Explicit blanket/template, quantity/value caps and currency/UOM; purchase lines use existing AitPurchase; atomic source-linked releases refused over cap plus tolerance; expired/cancelled unused portions do not erase fulfilled history; Products price resolver uses agreement match (R-PUR-30). |
| PUR-REORDER | data model, service type | ProductFacility policy fields written through Warehouse's `mantle.facility.FacilityServices.store#ProductFacilityPolicy` (CX-FACILITY-POLICY) and the shared SupplyPlanning schedule `mantle.product.SupplyPlanningServices.store#PlanSchedule` (D20) | ReorderRules, SupplyPlanning | Effective snooze/reason, buyer/supplier preference; shared PlanningRun/PlanningSuggestion/RequirementSupply; freshness warnings and current transaction checks. Auto-request default; no separate MRP supply count. No Purchasing-owned planning service. |
| PUR-RECEIPT | service type, data model | Purchasing worklist adapters over shared shipment/quality; `ironstone.purchasing.ReceiptServices.accept#ServiceItem` over `mantle.order.purchase.ServiceAcceptance` | Receipts, Inspections, ShipmentDetail, OrderDetail | find#ExpectedReceipts/find#PurchaseInspections authorized projections; accepted/rejected/held/putaway distinction; Warehouse owns stock posting, `ensure#PurchaseReceipt` and `close#ReceiptRemainder`, and quality owns inspection stages/disposition. Service acceptance records accepted quantity/UOM, date, acceptor and evidence for matching; Manufacturing's `receive#SubcontractOutput` calls it for subcontract lines (R-PUR-09; D14). |
| PUR-RETURN | data model, service type | Shared receipt-specific ReturnItem allocation; `ironstone.purchasing.ReturnServices.find#ReturnableReceipts` and `create#ReplacementOrder`; purchasing list adapter | Returns, ReturnDetail | Source AssetReceipt/lot quantity lock; eligibility = accepted + quarantined − prior supplier returns (R-SB-06); supplier RMA/expiry/instructions; warehouse ShpTpPurchaseReturn and `ship#SupplierReturn`; Accounting `settle#Return` supplier branch with restocking fee line; replacement PO lineage; net eligibility excludes prior returns. |
| PUR-MATCH | data model, service type | Crosscut InvoiceMatch/InvoiceMatchLine/InvoiceHold, InvoiceMatchPolicy and ironstone.accounting.MatchServices | Bills, MatchExceptions, InvoiceMatch, InvoiceDetail | Accepted receipt remaining quantity lock; apply writes OrderItemBilling (R-SB-18); match policy from Accounting/Settings/MatchPolicies; financial holds by finance and `request#HoldRelease` for buyers; `queue#MatchReevaluation` triggers; receipt bill SECA only for self-billing suppliers with accepted-only billing (D2); no separate Purchasing match model. |
| PUR-BUDGET | data model, service type | Accounting AC-14 BudgetControlPolicy, `mantle.other.budget.BudgetCommitment` and `ironstone.accounting.BudgetServices.check#Budget`, `reserve#Commitment`, `convert#Commitment`, `release#Commitment` (D10) | Request/PO/award approval, OrderChanges, ClosePurchaseOrders, Commitments | Warn/Stop policy, transactional approval commitment keyed by source revision; Purchasing reserves at request approval, converts request to PO at PO approval and releases on cancel or close; Accounting converts PO to actual at payable approval. Purchasing reads/explains, finance owns rule changes. |
| PUR-REPORTS | data model, service type | mantle.party.supplier.SupplierScorecardPolicy/SupplierScorecard/SupplierScorecardMeasure; ironstone.purchasing.ReportServices | Performance | Versioned policy, evaluation period, evidence IDs/numerators/denominators, missing-data and effective risk response; authorized spend/commitment/lineage/statements. Optional indexed acceleration exposes freshness; source records remain authority. |
| PUR-SETTINGS | data model, service type, seed data | mantle.order.purchase.PurchasePolicy; ironstone.purchasing.SettingsServices; supplier-category classification type | Settings | Effective organization policy, typed shared settings and owner links; existing RequestCategory for request purposes/routing; preview impacts before activation. Supplier classification values maintained as PartyClassification rows; terms existing; financial and receiving policies retained at shared owner. |
| PUR-PORTAL | service type, seed data | The supplier root `screen/SupplierPortal.xml`, its user group and filter set, token routes `/rfq` and `/po`; ironstone.purchasing.PortalServices over Mantle's `ExternalAccessServices`; Accounting bill intake | SupplierPortal, QuoteResponse, OrderAcknowledgement, SupplierBillUpload | Expiring/revocable record+revision capability or authenticated supplier relationship; no arbitrary supplier/user parameters; file scope, replay-safe submission and rate limits; no Commerce expansion; app services hold no token rules of their own (D5). |
| PUR-LATER — Later extensions | service type, data model | Accounting OCR/lease model; shared quality NCR/CAPA; external risk/remote-order protocols | Bills, LeaseOverview, Scorecards | Later dependencies retain owning app/tool; suggested extraction needs confidence and human source matching; externally supplied risk cannot silently approve/block/post; protocol adapters need explicit idempotent outcome/reconciliation. |
| PUR-DROPSHIP | data model, service type | ironstone.purchasing.OrderServices `create#DropShipOrder` and `confirm#DropShipDelivery`; ShpTpDrop shipment linked to both orders | OrderDetail, SupplyPlanning | Open item (§18): drop-ship PO from customer-order demand whose supplier price has `canDropShip`; ship-to is the customer address; confirmation creates the ShpTpDrop shipment without a stock receipt and calls Accounting's `create#InvoiceFromSource` for the customer invoice and the supplier bill (R-PUR-17, R-SB-20). |

## 17. Decided

| Decision | Notes |
| --- | --- |
| RFQ record model (research open question 1) | Purchase-specific proposed RqtPurchaseRfq on Request/RequestItem plus supplier invitation/quote/award models. Draft PO is usable for direct buying; competitive multi-supplier sourcing is a separate record. Existing RqtQuote remains customer quote semantics. |
| Purchase request granularity (question 2) | Projects owns RequestDetail and generic links/intake. Purchasing mounts purchase context, extends unit-safe items/source completion/approvals and adds a sourcing wizard; no forked purchase case screen. |
| Supplier portal (question 3) | Common external isolation/capability conventions; bounded RFQ response, PO acknowledgement and Accounting bill submission. No separate vendor identity engine or full Commerce design. The pages sit in the supplier audience root `screen/SupplierPortal.xml`, outside the internal Purchasing root, with SupplierBillUpload mounted there once for both apps; single-record links are MoquiConf token routes checked by Mantle's proposed `ExternalAccessServices`, which the app PortalServices only wrap (D5; R-PUR-12, R-SB-14). |
| Agreement model (question 4) | Existing Agreement/AgreementItem/terms + proposed AgrPurchase and version/release allocations; ProductPrice agreement linkage/resolver reused. Blanket commitment differs from template and later lease schedule. |
| Approval model (question 5) | Source lifecycle and revision-bound domain policies/decisions, delivered via current Commons notifications. Request Reviewed is not Approved; PO approval, acceptance/match and payable approval are distinct. The topics are PurchaseRequestApproval, PurchaseAwardApproval, PurchaseOrderApproval and PurchaseSupplierApproval, handled by `approve#PurchaseSource` and `refuse#PurchaseSource`; the SECA `check#PurchaseApprovalRequired` on `check#OrderPreApprove` keeps Mantle's auto-approval from approving a PO without a current decision. With no policy, one purchase-approver step applies (D8; R-PUR-14, R-SB-10). |
| Replenishment versus MRP (question 6) | One shared buy/make/transfer Requirement planning ledger and transactional conversion; buyer filter shows buy defaults but retains cross-source demand provenance. Make conversion creates draft; explicit Manufacturing release is separate. Reorder rules write through Warehouse's proposed `store#ProductFacilityPolicy`; the one plan schedule is SupplyPlanning's proposed `store#PlanSchedule` with `run#SupplyPlan`, replacing the earlier proposed Purchasing `store#ReorderRule` and `store#ReorderSchedule`. Purchasing converts buy suggestions, Manufacturing make and Warehouse transfer (D20; R-XC-09, R-XC-39). |
| Shared record ownership | Product/customer/supplier/order/shipment/invoice/return/quality/planning screens are canonical. Commons owns shell/files/Chatter/approvals/calendar; Projects owns Request/WorkItem. App context never authorizes an action. |
| Stock and financial truth | Receiving, quality disposition, return and financial settlement are separately controlled source facts. Only released accepted quantities qualify under shared match policy; posted corrections reverse/adjust with period checks. |
| Failure boundaries | Independent suppliers, documents, imported rows and deliveries have named partial results; a stock, award allocation or financial posting is atomic and retry-safe. |
| Reference-only features and deliberate deferral | Leases use later Accounting mount; OCR uses later Accounting intake; NCR/CAPA shared quality later; custom pivot/graph/arbitrary score formulas/external risk and remote ordering later through shared tooling. Existing supplier/pricing/request/order/receipt/return/bill forms retain parity coverage; sales promotions and customer-only gateway forms are outside purchase scope. Vendor and product purchase warnings are later, as the crosscut partner-alert Open item (R-XC-45); variant-matrix PO entry is later (PRD-VARIANT-UI); supplier on-time rate beside offers is in OfferComparison (R-PUR-39). |
| Existing automation (D1) | Every Mantle SECA on a Purchasing path is named where the path is designed and goes in the crosscut §1.3 register. `OrderPlacedAutoApprove` is conditioned by `check#PurchaseApprovalRequired` (§6). `OrderPlacedSendEmail`, `OrderApprovedSendEmail`, the reservation SECAs and `OrderPlacedAuthorizePayments` are kept; they do nothing for a PO. `OrderApprovedNotify` and `OrderItemWorkEffortCheckComplete` are kept. `ShipmentIncomingDeliveredCreateInvoices` is conditioned to self-billing suppliers (§10). `ReturnApprovedProcess` is kept for the return shipment (§9). |
| Supplier bill creation (D2; R-XC-01, R-SB-01, R-PUR-16) | Settles the earlier Open item "Automatic purchase invoice creation policy". Accounting owns intake through `import#Bill`, keyed by organization, supplier and supplier reference. The receipt SECA is off by default and runs only for a supplier flagged self-billing, billing accepted quantity only and keyed by shipmentId; uploads for such a receipt attach to the existing draft. Purchasing's "Create draft bill" uses Accounting's `create#InvoiceFromSource` dialog on OrderDetail and ShipmentDetail, never raw `create#PurchaseShipmentInvoices`. |
| Matching and holds (D4; R-XC-02, R-PUR-08, R-SB-16, R-SB-18, R-SB-19) | The match-operator capability is one Accounting group, `BOSS_ACCOUNTING_MATCH`, which AP includes and which buyers who match bills are given; it applies matches through the proposed `MatchServices.apply#InvoiceMatch`, which writes OrderItemBilling. Only finance places, releases and approves; buyers request a release through `request#HoldRelease` (BillHoldRelease topic). Match policy lives at `Accounting/Settings/MatchPolicies`; Purchasing shows it read-only. Holds are enforced on every payment path. Re-evaluation is queued by `queue#MatchReevaluation` from receipt, inspection, revision and return events. |
| Order holds and revisions (D7; R-PUR-05, R-SB-07, R-SB-08) | A buyer's PO hold and a revision lock use OrderHold through Mantle's proposed `hold#Order` and `release#OrderHold`, each with an OrderHoldReason (Purchase or Change). A Sent PO un-sends to Approved first. OrderBeingChanged and un-approve are not used. One app's release cannot clear another app's hold. |
| Budget commitments (D10; R-PUR-07, R-XC-37) | Accounting AC-14 owns `BudgetCommitment` and `BudgetServices.check#Budget`, `reserve#Commitment`, `convert#Commitment` and `release#Commitment`. Purchasing reserves at request approval, converts request to PO at PO approval and releases on cancel, close or a reducing revision; Accounting's `approve#Payable` converts PO to actual. The budget item comes from the line's GL account and period; cost center and project are dimensions only if Accounting adds them. |
| Supplier returns (D11; R-SB-05, R-SB-06, R-PUR-23) | Purchasing owns eligibility (`find#ReturnableReceipts`, receipt-based) and replacements (`create#ReplacementOrder`). Warehouse's `ship#SupplierReturn` sets ReturnShipped. Accounting's `settle#Return` supplier branch creates the supplier credit or debit note, with any restocking fee as a preview line, and completes the return. `receive#ReturnWithoutShipment` is not exposed. |
| Subcontracting (D14; R-PUR-09, R-PUR-22, R-SA-08, R-SA-13) | Purchasing owns the service PO (with OrderItemWorkEffort and RequirementSupply) and `accept#ServiceItem`. Manufacturing's `receive#SubcontractOutput` calls it; the output is never received on the service PO line, and service lines get no receipt-SECA bill. Warehouse dispatches from `Warehouse/Transfers/SubcontractShipmentDetail` to a vendor-custody facility the organization owns. Accounting allocates the charge. |
| Request to PO and covered demand (R-PUR-01, R-PUR-06) | Every "Create purchase order" opens RequestSourcing; nobody calls `create#PurchaseRequestOrder` directly. Approval of a purchase request item creates or links one Requirement through RequirementRequestItem; award and PO lines record RequirementSupply against it, so SupplyPlanning never converts the same demand again. |
| Sending and closing POs (R-PUR-02, R-PUR-03, R-PUR-10, R-SB-11, R-SB-12, R-SB-13) | `send#PurchaseOrder` replaces `send#OrderStoreEmail` for POs. `close#PurchaseRemainders` is the one remainder close, with an explicit cancelQuantity, called by Warehouse's `close#ReceiptRemainder` for short receipts. Warehouse's `ensure#PurchaseReceipt` keeps one open inbound receipt per PO part, and `adjust#ExpectedReceipt` follows a PO revision. |
| RFQ request type (R-PUR-13) | RqtPurchaseRfq is excluded from generic request lists and RequestDetail mounts; generic triage, work-link completion and Convert to project are off for it, and every open routes to QuoteRequestDetail. |
| Supplier onboarding (R-PUR-15) | SupplierProfile carries a proposed approval status (Pending, Approved, Rejected, Suspended) decided through the PurchaseSupplierApproval topic; an RFQ or PO to a supplier that is not Approved gets the PurchasePolicy Warn or Stop result. |
| Product usability (D19) | RequestSourcing, Award, SupplyPlanning conversion and PO line create call Products' `check#ProductUsable` for buying. |
| Quality hold (D21) | Receipts that need inspection arrive in AstQuarantine through Warehouse's posting guard; the proposed `get#SourceInspectionStatus` feeds matching and planning, and held quantity is excluded from bill matching. Whether planning nets it as conditional supply is in §18. |
| Capability vocabulary (D22; R-PUR-24) | §1 maps every capability term of this file to one proposed group; "match operator" is the only name for the matching capability. |
| Supplier finance, identity and tax (D26; R-XC-10) | The shared Supplier360 PaymentDetails (finance-gated; a change voids a pending payment-run approval), PartyIdentifications and TaxRegistrations forms show in Purchasing's mount. Default terms and the self-billing flag stay on SupplierProfile and only finance edits them. |
| Screen names (D27; R-PUR-34) | `Rfqs` is `QuoteRequests`, `RfqDetail` is `QuoteRequestDetail` and `RfqResponse` is `QuoteResponse`, with their forms and proposed services renamed to match (for example `send#QuoteRequest`, `save#QuoteResponse`). Menu titles keep "RFQ", and the proposed Mantle names keep it (`RqtPurchaseRfq`, `PurchaseRfqInvitation`, `rfqRevision`). |
| Price-screen mounts (R-XC-23) | Purchasing mounts SupplierPrices and PriceExplain only; it opens PriceLists by link with the price-policy grant. |
| Chatter and Files hosts (D25; R-XC-05) | Purchasing's file hosts are Request, OrderHeader, Agreement, Invoice, Shipment and Party (existing content entities), the proposed SupplierQuoteContent for quotes and the proposed ReturnContent for supplier returns. Acknowledgement and service-acceptance evidence attaches to the order. PurchaseAward and the scorecard records have no Files. |
| Open items and crosscut §9 (D28; R-XC-15) | Cross-app items that stay open are marked "(also in crosscut §9)" in §18. |
| Shared-screen rows (D28; R-PUR-11, R-PUR-20) | Settled in crosscut §3 on Oct 28, 2026: the §3.6 Purchasing row has the tabs and actions §6 uses; the §3.5 Product360 row adds purchase history and BOM links; the §3.8 ShipmentDetail row adds supplier-return packing and shipping with warehouse authority; the §3.19 QualityInspection row lets holders of those capabilities inspect, verify and dispose; the §3.22 InvoiceMatch row adds `request#HoldRelease`; §4.2 converts buy suggestions to approved purchase requests; and the §3.11 RequestDetail Purchasing row has the Sourcing progress and Approval tabs. |
| Landed costs in the first release (decided Oct 28, 2026; R-PUR-18, R-ACC-10) | Accounting's `Accounting/Payables/LandedCosts` task is in the first release, over proposed `mantle.account.invoice.LandedCostAllocation` and `AssetBookServices.post#LandedCost`. Purchasing InvoiceDetail's "Allocate to receipts" link and Spend's actual landed cost are first-release too. QuoteComparison's landed cost stays an estimate, and Spend labels landed cost as estimated until the allocation posts. |
| Cost centres on purchases (decided Oct 28, 2026; Accounting AC-22) | A purchase request names its cost centre (an internal organization Party, such as a department). The proposed `OrderItem.costCenterId` carries it to each PO line, the proposed `InvoiceItem.costCenterId` to the bill line, and posting to `AcctgTransEntry.costCenterId`, with the receipt facility as the facility dimension. A GL account that requires a cost centre refuses a bill line without one, so the buyer sees the gap when creating the draft bill. |
| Research dispositions (R-PUR-33) | Research candidates map per §14.2; the Replenishment shortfall list is merged into SupplyPlanning, InventoryAvailability and ReorderRules. SimpleScreens `Vendor/*` (10 forms) is internal-organization setup handed to Admin and Accounting; Purchasing leaves those inventory cells blank. Mantle's `OrderAutoReorder` status is not used; automatic conversion creates OrderOpen drafts. Scorecards do not write `ProductPrice.supplierRatingTypeEnumId`; it stays a recorded datum on the price row (Products). |

## 18. Open

| Review item | Recommended answer | Effect until confirmed |
| --- | --- | --- |
| Default performance date basis and minimum sample | Use the committed delivery date for contractual OTD: the first supplier-acknowledged line date when an acknowledgement exists, else the PO line `OrderItem.requiredByDate`. Show the latest supplier promise separately. Count receipt events per line, not shipments. Five eligible receipts is the ScorePolicy default minimum before a weighted score can drive a block, editable per policy. | Policy defaults need business review; raw source evidence remains visible and no automatic block on insufficient data. |
| Initial purchase approval thresholds and roles (also in crosscut §9) | Ship no monetary auto-approval outside explicitly configured policy; start with a buyer/manager split and visible Warn budget policy, allowing finance to select Stop per budget. With no active policy, one step by the purchase-approver capability approves, and self-approval needs an explicit setting, so a one-person business can approve a PO (R-PUR-14). | Setup required before activating unattended conversion; manual draft creation remains available. |
| External supplier access rollout (also in crosscut §9) | The route group is fixed by D5: the SupplierPortal root, shared with Accounting's SupplierBillUpload. Deliver the authenticated supplier group and the narrow token-route invitation paths together on Mantle's one capability service; gate anonymous invitation submission behind configured expiry, rate limiting and explicit public-file selection. | This is a required portal implementation dependency, not an alternate RFQ/quote model. Internal on-behalf-of entry remains complete. |
| Legacy PO/receipt matching migration (also in crosscut §9) | Backfill source links only from unambiguous OrderItemBilling/AssetReceipt evidence, flag ambiguous rows for finance review, and prevent automatic match of unexplained balances. This matches crosscut §3.22's no fabricated receipt rule and the failure-tolerance rule: name each exception and continue. | Legacy rows may remain named match exceptions; no historical quantities silently reconstructed. |
| Advanced purchasing integrations and analytics | Defer EDI/remote supplier ordering, arbitrary scoring formulas and automatic third-party risk blocks; preserve typed connector/outcome hooks and source evidence. Inbound electronic bills arrive through Accounting's AC-15 intake, not a Purchasing adapter. | No claim of those protocols being implemented; normal email/PDF/portal/CSV processes cover the core design. |
| Drop-ship purchase orders | Add a `new` "Create drop-ship PO" to the SupplyPlanning and RequestSourcing conversions for customer-order demand (RqTpCustomer) whose supplier price has `ProductPrice.canDropShip`. Ship-to is the customer address and the source sales order item is linked. Supplier delivery confirmation, through proposed `confirm#DropShipDelivery`, creates a ShpTpDrop shipment linked to both orders with no stock receipt, counts as acceptance for matching, and calls Accounting's `create#InvoiceFromSource` for the customer invoice and the supplier bill, since no invoice SECA runs for ShpTpDrop (PUR-DROPSHIP; R-PUR-17, R-SB-20). | Drop-ship lines link the customer order and supplier shipment by hand; drop-ship invoicing is manual through InvoiceFromSource. |
| Maximum stock and suggested reorder levels (also in crosscut §9) | Add proposed `ProductFacility.maximumStock` (order-up-to level) and `reorderMethodEnumId` (fixed quantity or up to maximum), written through the same `store#ProductFacilityPolicy` (CX-FACILITY-POLICY). Add a SuggestLevels bulk action to ReorderRules: preview minimum and maximum from average daily demand × lead time + safety stock, then apply per row with named failures (R-PUR-19). | ReorderRules keeps minimumStock, reorderQuantity and daysToShip. |
| Vendor-owned consignment stock | Recommend `later`: consignment receipts carry `Asset.ownerPartyId` = the supplier, and consumption triggers the PO and bill (R-PUR-38). | Only company-owned stock in supplier custody is designed (subcontracting). |
| Held quantity as conditional supply (also in crosscut §9) | Planning shows quantity held for inspection as a separate conditional supply with the inspection due date, and does not net it by default; an organization may choose to net held quantity whose inspection is due within the lead time (D21; R-SA-17). | Held receipts are neither on hand nor incoming in the plan, so a planner may buy again; the held column makes that visible. |
