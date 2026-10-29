# IronStone BOSS — Purchasing implementation

Oct 28, 2026 — plan; P0 partly done (F1–F22, found while writing it); the phase order and the open questions decided
(§4), on the shared party-role and effective-date rules (impl-drawers-commons §4); the supplier pages in a PASS app in
mr-pass (§4); Purchasing's rules in Mantle, behind Moqui permissions (§4)

How [design-purchasing.md](design-purchasing.md) gets built, in phases from the foundation to the supplier portal, each
ending tested and usable. This file is kept at a high level, as [impl-products.md](impl-products.md),
[impl-accounting.md](impl-accounting.md), [impl-warehouse.md](impl-warehouse.md) and
[impl-manufacturing.md](impl-manufacturing.md) are: each phase names its scope by the design's sections and §16 needs
rather than restating them, and the design stays the place for screen and record detail. During the build this file is
the log: phase status and what each built, the decisions made, open questions, findings against the code, and what is
deferred.

Today `screen/Purchasing/` holds nine placeholders, and the root mounts only Chatter and RecordFiles. The
`BOSS_PURCHASING` authz is in BossSetupData's commented not-yet-implemented block (F1). None of the design's proposed
services, entities, fields or status items exist in Mantle or BOSS beyond what the four apps built before it provide.
Purchasing is built last (§4), so these are there to extend:
- from Products: the supplier-price groups (P1); Product360 and `check#ProductUsable` on both order-entry paths (P2);
  `store#ProductPrice`, the resolver's direction fix, agreement matching and trace, and `Shared/PriceExplain` (P5);
  `Shared/SupplierPrices`, `Shared/Supplier360` and supplier item codes (P6); `store#ProductFacilityPolicy` and
  `Shared/InventoryAvailability` (P7); pack products and `resolve#ScannedProduct` (P11); ProductImport (P12);
- from Accounting: the AP, match, approver, treasury and reader groups (P1); SupplierProfile with its finance fields,
  `import#Bill` (for AP and buyers), `create#InvoiceFromSource`, `approve#Payable`, the holds and
  `request#HoldRelease`, the conditioned receipt-bill SECA, `OrderItem.costCenterId`, and its contexts on InvoiceDetail,
  OrderDetail, Supplier360 and ShipmentDetail (P6); `Shared/InvoiceMatch`, MatchPolicies, `queue#MatchReevaluation` and
  the legacy match backfill (P7); CX-ORDER-HOLD (P10); LandedCosts (P13); BudgetCommitment and
  `mantle.other.BudgetServices` (P15);
  `settle#Return` and `Shared/ReturnDetail` (P17); CX-PORTALS, and the PASS Supplier app in mr-pass with its BillUpload
  page and the PO's link (P18);
- from Warehouse: `ensure#PurchaseReceipt`, `adjust#ExpectedReceipt`, `close#ReceiptRemainder`, the receive guard and
  Purchasing's `close#PurchaseRemainders` (P7); CX-QUALITY with `Shared/QualityInspection`, `Shared/InspectionTemplates`
  and `get#SourceInspectionStatus` (P8); `ship#SupplierReturn` and Purchasing's `find#ReturnableReceipts` with the
  receipt link (P14); the vendor-custody facility (P15); Purchasing's `accept#ServiceItem` and
  `receive#SubcontractOutput` (P16);
- from Manufacturing: CX-PLANNING, with `Shared/SupplyPlanning`, `run#SupplyPlan`, `store#PlanSchedule`, the make
  conversion and held receipts as a pending-release line (P13); the outside-processing buy conversion to draft service
  PO lines, and `BOSS_PURCHASING_BUYER` with its permissions (P14, §4);
- from Projects: `Shared/RequestDetail` (without request items, F6), `Shared/OrderDetail`, `Shared/InvoiceDetail` and
  `complete#RequestFromWork` (F5);
- from Commons: notification topics with approve and refuse services, Notifications, Chatter, RecordFiles, and the
  palette, quick-create and Today providers.

**Inputs.**
- Designs:
  - [design-purchasing.md](design-purchasing.md)
  - [design-crosscut.md](design-crosscut.md) §1.3 (the automation register), §1.4, §3.3, §3.5–§3.8, §3.11, §3.15,
    §3.16, §3.18–§3.22, §4.1, §4.2, §5, §6 and §7.1 (CX-APPROVAL, CX-SOURCING, CX-REQUEST, CX-ORDER-HOLD, CX-PORTALS)
  - [design-products.md](design-products.md): §8 Suppliers and PRD-PRICE
  - [design-accounting.md](design-accounting.md): Bills, InvoiceMatch, MatchPolicies, SupplierBillUpload, AC-02, AC-03
    and AC-14
  - [design-warehouse.md](design-warehouse.md): receiving, WH-POST and WH-RETURN
  - [design-manufacturing.md](design-manufacturing.md): SupplyPlanning and Subcontracting
  - [design-projects.md](design-projects.md) §6 Requests
  - [design-drawers-commons.md](design-drawers-commons.md) §4, for the topic seeds
  - `mr-pass/plan/design-forum.md` §1, §4, §5 and §13.1: PASS's shell, app mounts, authority boundary, request
    contract, identity and invitations, for P16's pages
- Plans:
  - [impl-products.md](impl-products.md): the pattern; P5, P6 and P7, which build the price, supplier-price and
    availability screens Purchasing mounts; the BOSS client screenshot spec (its F23).
  - [impl-accounting.md](impl-accounting.md): P6, P7, P10, P13, P15, P17 and P18 (the PASS Supplier app), and its §7
    list of Purchasing's callers.
  - [impl-warehouse.md](impl-warehouse.md): P7, P8, P14 and P16, which build Purchasing's three services, and its §7
    list of Purchasing's contexts and callers.
  - [impl-manufacturing.md](impl-manufacturing.md): P13 and P14, and its §7 list of Purchasing's mount and buy
    conversion.
  - [impl-projects.md](impl-projects.md): RequestDetail, OrderDetail and InvoiceDetail, and its P5 later list (request
    items and purchase orders).
- The design review: [review-core-apps.md](review-core-apps.md) (D1–D28) and
  [review-core-apps/purchasing.md](review-core-apps/purchasing.md), which explain the design's D- and R- IDs.
- Guides and rules: [design-doc-guide.md](design-doc-guide.md), [style-guide.md](style-guide.md) §8, and
  [impl-drawers-commons.md](impl-drawers-commons.md) §4 (the shared rules, with the party-role and effective-date rules).
- Inventories: [ss-inventory.md](ss-inventory.md) and [usl-inventory.md](usl-inventory.md), which already carry the
  design §14.5 **Designed in** paths.
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
  - `runtime/component/mr-pass`, the supplier pages in its Supplier app (P16; §4)

  Design §16 needs no new framework widget, and the supplier links are pages of PASS's Supplier app taking their
  tokens (impl-accounting P18), so no phase plans framework work; P0 confirms it. `runtime/component/mr-marble` is read
  only, for the baseline Supplier, Party, Request, Order, Agreement, Facility, Shipment, Return and Invoice screens
  that design §14.3 maps.
- **Scope.**
  - Every `parity` and `new` row of design §2, and the §16 needs they use, with PUR-DROPSHIP (§4), except PUR-LATER.
  - The design reshaped by the shared rules (§2, §4): a supplier's quote is a purchase order in Mantle's quote
    statuses; revisions, acknowledgements and agreement versions are audit-logged key fields with stored PDFs; policies
    are effective-dated rows; organizations and buyers are party roles.
  - Moqui Java's unmerged drop-ship branch, ported into mr-mantle (P7, F21).
  - The parts of other apps' needs that Purchasing still depends on (§4):
    - Projects' RequestDetail Items tab, the base RequestItems of crosscut §3.11;
    - crosscut CX-REQUEST's type check in `complete#RequestFromWork` (F5);
    - in Accounting's `evaluate#InvoiceMatch`, the service-acceptance rule unless Manufacturing P14 built it, and a
      drop-ship delivery as evidence;
    - in Warehouse's `store#ProductFacilityPolicy` (CX-FACILITY-POLICY), the snooze, the maximum stock and the reorder
      method;
    - reorder-rule rows in Products' ProductImport (design §15).
  - No shared screen of its own. Purchasing's context on the fifteen shared screens other apps built:
    - Products' Product360, Supplier360, SupplierPrices, PriceExplain and InventoryAvailability;
    - Projects' RequestDetail, OrderDetail and InvoiceDetail;
    - Accounting's ShipmentDetail, ReturnDetail and InvoiceMatch;
    - Warehouse's QualityInspection and InspectionTemplates;
    - Manufacturing's SupplyPlanning;
    - Commons' Notifications, as Approvals (crosscut §3.15);

    and its pages in the PASS Supplier app in mr-pass, which Accounting P18 starts (§4).
  - The callers the other plans leave to Purchasing (their §7): the budget commitments at request, award and PO
    approval and at a cancel; match re-evaluation from a revision; PrepareReceipt and the revision's
    `adjust#ExpectedReceipt`; the buy conversion; placing and approving the service PO; `publish#SupplierQuotePrice`.
  - §7 holds the `later` rows and needs, and the rest of the other apps' needs.
- **Order** (decided Oct 28, 2026), the procure-to-pay spine first, on what the other apps built for it:
  1. the foundation;
  2. suppliers and the buying policy;
  3. purchase orders, then approvals and budgets;
  4. receiving and inspection, then bills and matching, then drop-ship, then supplier returns;
  5. revisions and acknowledgements;
  6. purchase requests, then RFQs and quotes, then comparison and award;
  7. agreements;
  8. replenishment;
  9. performance;
  10. the supplier portal, in the PASS Supplier app;
  11. the finish.

## 2. Ground rules

- **The Commons rules hold.** These are impl-drawers-commons §4:
  - failure tolerance;
  - the Mantle-free framework;
  - Mantle stands without BOSS;
  - business logic leans to Mantle;
  - the new XML element checklist of style-guide §8.1;
  - libraries through `libs/refresh.mjs`, and crates against `deny.toml`;
  - the `.qvue` gallery pattern;
  - parties by role;
  - changes by effective date and the audit log;
  - demo data;
  - builds and commits.

  Screenshots come from the BOSS `test/client` spec that Products adds (impl-products §2), as `PurchasingShots`.
- **Rules in Mantle, screens in BOSS** (§4). Purchasing's approvals, policies, supplier profile and check, sends,
  revisions, acknowledgements, requests, sourcing, agreements and scorecards are Mantle services in the package of their
  records (`mantle.order`, `mantle.request`, `mantle.party`). Each checks its Moqui permission (§4) and the organization
  by party relationship itself, so SECAs, other apps, the PASS pages and plain Mantle callers meet the same rule.
  `ironstone.purchasing` keeps `AccessServices`, Home, the worklists' and find screens' reads, the report reads, saved
  views and the settings forms. A Purchasing screen or mount calls the Mantle service after `AccessServices`, with no
  same-named `ironstone` pass-through; other apps call the Mantle name.
- **Purchase rows through services.** Under the organization filters (impl-drawers-commons §4), OrderPart, Shipment,
  ReturnHeader, Invoice and Party are filtered, but not OrderHeader, OrderItem, Request, RequestItem, Requirement,
  Agreement, AgreementItem, ProductPrice or AssetReceipt (F2). Purchasing reads and writes them only through services:
  `ironstone.purchasing.AccessServices` checks the buying organization, the supplier, the record and the capability
  group, then the screen calls the Mantle service, which checks its permission and the organization.
  - `entity` in a design form summary means that guarded path, never a bare entity form.
  - Grants are checked in the services, so they hold for exports, search, the palette, shared mounts and the supplier
    pages. The `BOSS_PURCHASING_*` groups get no artifact authorization for the raw Mantle order, request, agreement and
    return mutators, their REST paths or `change#OrderPartsStatus` (F9).
- **Purchase documents follow the shared rules** (impl-drawers-commons §4; §4 here):
  - Parties by role: a request's organization is a RequestParty in the OrgInternal role, and a requirement's a
    RequirementParty; a supplier's buyer is a dated PartyRelationship from the buyer (Buyer) to the supplier
    (Supplier); a drop-ship customer is the PO part's `CustomerShipTo` OrderPartParty, as Moqui Java has it (P7);
    agreement signers are AgreementParty rows.
    The fields Mantle keys by stay: OrderPart's vendor and customer, Request's filer, Agreement's two parties.
  - One document from quote to PO: a supplier's quote is a purchase OrderHeader in OrderRequested and then
    OrderProposed, and an award places it (F19).
  - Revisions: the key fields a phase locks are audit-logged (F18), and `OrderHeader.orderRevision` with them. A
    revision is that counter and its time. OrderDetail, OrderChanges, QuoteDetail, RequestDetail and AgreementDetail show
    the history from the audit log, and their prints take an effective date and time. A sent PO, a published RFQ and an
    approved agreement store their PDFs as OrderContent, RequestContent and AgreementContent.
  - Policies and profiles are effective-dated rows with their key fields audit-logged: SupplierProfile,
    PurchasePolicy, PurchaseApprovalPolicy and SupplierScorecardPolicy. A document keeps the policy row it was evaluated
    against, and the time.
  - Records of their own stay where a fact has its own identity: an approval decision, a scorecard evaluation, an
    agreement release allocation.
- **One approval gate.** Where the organization's buying policy turns its flag on (impl-accounting §4), a purchase part
  reaches OrderApproved only through `mantle.order.PurchaseServices.decide#PurchaseApproval`, and Mantle's
  `autoApprove#Order` meets the warning of `check#PurchaseApprovalRequired`, a SECA in mr-mantle on
  `check#OrderPreApprove` (design §6, D8). Mantle's `approve#Order` itself is unchanged, so the flow specs' direct
  approval keeps working (F9).
- **Revisions and operations.** Every approval, conversion, award, release, revision, send, reminder and portal
  submission names its source revision and an operation identity. A retry answers the first result, and a stale
  revision is refused naming the current one. The operation record is Accounting P2's CX-POSTING record
  (impl-accounting §4). A batch names each failure and goes on: supplier groups, invitations, recipients, approvals,
  evaluations, import rows. One award, conversion or revision with its links commits atomically.
- **Restricted values stay on the server.** A service leaves out of its answer any supplier price, cost, budget,
  bank, payment or competing-quote value the user may not read. An inaccessible amount is omitted or said to be
  withheld, never shown as zero; a supplier sees its own documents only (design §13). A Mantle answer decides it by
  permission: `SUPPLIER_PRICE_VIEW`, `PRODUCT_COST_VIEW` and `ACCOUNTING_VIEW`, which their owners grant.
- **Shared screens.** Purchasing builds none. It adds its context to the shared screens of §1, each taking `appRoot` and
  server-derived capabilities on `Shared/RequestDetail`'s pattern, and its context adds no right a borrowed capability
  does not give (design §1).
- **Public pages in mr-pass, internal ones in mr-boss** (§4). The supplier pages are in the PASS Supplier app, on
  PASS's foundation (design-forum §1, §4, §5), as impl-accounting §2 sets out: PASS's shell and mounts, at 390 px and
  on the desktop with no terminal UI; a supplier contact is a PASS public account reaching its own documents through
  Mantle's checks of its supplier relationship and `ExternalAccessCapability`, with no `BOSS_SUPPLIER_PORTAL` group;
  pages call only Mantle services through `pass.Facade.call#Operation`, so the same pages work with a local or remote
  authority; PASS's request contract and media; links are pages taking their tokens, not `<token-route>`s.
- **Owner contracts.** A contract built here for another app follows that app's design: its package, its record and
  service names, its Shared screen, its permissions and its capability groups. A change found while building it is
  written into the owner's design. The owner's own screens stay with the owner.
- **Mantle rule changes keep Mantle's default.** A new refusal or condition in a Mantle service or SECA sits behind
  its own flag, off by default (impl-accounting §4), and ships with a test of its condition and of its unchanged default
  (crosscut §7.1). A new Mantle service checks its permission; an existing one gains a refusal only behind its flag. A
  new `enable-audit-log` changes no behavior and needs no setting.
- **Mantle callers stay compatible.** Existing callers of these keep working:
  - `create#PurchaseRequestOrder`, which BOSS never calls but CrmMiscServices does (F4);
  - `create#Order`, `add#OrderProductQuantity`, `place#Order` and `approve#Order`, and the quote transitions;
  - `complete#RequestFromWork` for Projects' request types;
  - `get#ProductPrice`, `create#ReturnFromOrder`, `get#OrderDisplayInfo` and the agreement content services;
  - the reservation SECA, which with P7's port makes a drop-ship PO only for a line reserved at a drop-ship facility.

  Mantle's OrderProcureToPayBasicFlow, CrmMiscServices, OrderLifecycle, OrderBulk and WorkProjectRequests specs pass
  unchanged, and so do the earlier apps' BOSS walks.
- **Done for a phase** means all of these:
  - impl-projects §2 "Done":
    - cargo tests for the touched crates, with goldens reviewed;
    - the new Mantle specs passing under `./moq test mr-mantle`, their users in spec-local groups holding the
      permissions, never a `BOSS_*` group;
    - `./moq test mr-boss` passing, with AppStructure covering the new screens and Purchasing in its non-placeholder
      list (F16);
    - `moqui lint --screens` clean for BOSS with the Debug binary;
    - screenshots light and dark at 390, 1280 and 1440 px;
    - the inventories' **Implemented in** columns;
  - the `PurchasingAccess` spec extended to the phase's services and mounts;
  - for P16: `./moq test mr-pass mr-mantle mr-boss` with the Supplier app's specs, the remote pair on PASS's
    RemoteFixtures pattern, `moqui test-client mr-pass --serve` on ForumHttp's and RemoteHttp's pattern, lint clean
    for PASS, and the pages' screenshots light and dark at 390 and 1280 px;
  - the phase's walk in §8;
  - its row and **Built** note here.

## 3. Phases

| Phase | Repos | Screens | Status |
| --- | --- | --- | --- |
| P0 Checks | all (read) | — | partly done Oct 28 (§6 F1–F22) |
| P1 Foundation | Mantle, BOSS | the Purchasing root and menu, Home | — |
| P2 Suppliers and buying policy | Mantle, BOSS | Suppliers, Supplier360, SupplierPrices, PriceExplain, Product360, Settings, PurchasePolicy | — |
| P3 Purchase orders | Mantle, BOSS | PurchaseOrders, OrderDetail | — |
| P4 Approvals and budgets | Mantle, BOSS | Approvals, ApprovalPolicies | — |
| P5 Receiving and inspection | Mantle, BOSS | Receipts, ShipmentDetail, Inspections, QualityInspection, InspectionTemplates | — |
| P6 Bills and matching | Mantle, BOSS | Bills, InvoiceDetail, MatchExceptions, InvoiceMatch | — |
| P7 Drop-ship | Mantle, BOSS | OrderDetail's drop-ship actions, PurchaseOrders' Drop-ship view | — |
| P8 Supplier returns | Mantle, BOSS | Returns, ReturnDetail | — |
| P9 Revisions and acknowledgements | Mantle, BOSS | OrderChanges, Acknowledgements | — |
| P10 Purchase requests | Mantle, BOSS | Requests, RequestDetail, RequestSourcing | — |
| P11 RFQs and supplier quotes | Mantle, BOSS | QuoteRequests, QuoteRequestDetail, Quotes, QuoteDetail | — |
| P12 Comparison and award | Mantle, BOSS | QuoteComparison, Award | — |
| P13 Agreements | Mantle, BOSS | Agreements, AgreementDetail | — |
| P14 Replenishment | Mantle, BOSS | SupplyPlanning, InventoryAvailability, ReorderRules | — |
| P15 Performance | Mantle, BOSS | Scorecards, ScorecardDetail, Spend, Commitments, ProcurementTracker, PurchaseHistory, SupplierStatement, ScorecardPolicies | — |
| P16 Supplier portal | Mantle, mr-pass, BOSS | the PASS Supplier app's SupplierHome, QuoteResponse and OrderAcknowledgement | — |
| P17 Finish | BOSS | — | — |

### P0 — Checks

Verify the design's riskiest assumptions against the code before building. Each result is a row in §6 and, where it
changes the design, an edit there. F1–F22 were found on Oct 28 while writing this plan. The design edits that §4's
decisions call for (the quote model, the audit-log revisions, the party roles, drop-ship on Moqui Java's model, the
quote tiers, the buyer's bill upload, the supplier pages in the PASS Supplier app) were made in the Oct 28 design sweep. Still to
check:

- **The other apps' state.** Which of Products P5, P6, P7, P11 and P12, Accounting P6, P7, P10, P13, P15, P17 and P18,
  Warehouse P7, P8, P14 and P16, and Manufacturing P13 and P14 are built when the phases that use them start, and
  whether each built its Purchasing part as its plan says: `close#PurchaseRemainders` (with its `release#Commitment`
  call), `find#ReturnableReceipts`, `accept#ServiceItem`, `BOSS_PURCHASING_BUYER` with its permissions (§4), the
  outside-processing conversion,
  SupplierProfile's finance fields, the buyer's `import#Bill`, the match backfill, and the PASS Supplier app with the
  PO's link and how its pages register (impl-accounting P18).
- **Service-line matching.** Whether Accounting P7 or Manufacturing P14 made `evaluate#InvoiceMatch` read
  ServiceAcceptance; if not, P6 adds it as Accounting's contract.
- **REST and bulk writes** (F9). Which BOSS groups would reach the Mantle REST order, return and request mutators and
  `change#OrderPartsStatus`, and which raw writes the mr-marble Order, Request, Agreement and Supplier screens make.
- **The rule flags.** That a buying-policy flag (impl-accounting §4) can condition `check#PurchaseApprovalRequired`,
  and what the demo organizations have.
- **The quote statuses** (F19). What Mantle's services and SECAs do with a purchase part in OrderRequested and
  OrderProposed (reservation, emails, auto-approval, totals), and whether Not awarded needs a Proposed → Rejected
  transition beside Cancel Quote.
- **Audit-log coverage** (F18). Each key field the phases lock that lacks `enable-audit-log`, and what
  `get#OrderDisplayInfo` and `get#OrderItemDisplayInfo` read back, for P9's history and the as-of print.
- **The drop-ship port** (F21). In the `dropship-moqui` branch's code: which shipment the PO gets, and its type; how
  the sales shipment's issue of a supplier-owned or shell asset at the drop-ship facility posts, so where the cost
  lands beside the supplier bill; and the branch's SECA ordering against BOSS's approval gate.
- **Purchase promotions** (F22). How Moqui Java users who take tier discounts by a promotion's auto-adjust scope it for
  a PO, which has no ProductStore.
- **Sending.** Projects' `send#Invoice` path for a rendered PDF on an EmailMessage draft, for `send#PurchaseOrder` (F13).
- **Demo data.** Mantle's ZiddlemanInc supplier, its offers to ORG_ZIZI_RETAIL, ZIRET_WH and OrderProcureToPayBasicFlow's
  fixtures, as P1's base.

### P1 — Foundation

- **PUR-ACCESS** (design §1, crosscut §1.4).
  - The groups of design §1: `BOSS_PURCHASING_REQUESTER`, `BOSS_PURCHASING_PLANNER`, `BOSS_PURCHASING_APPROVE`,
    `BOSS_PURCHASING_READ` and `BOSS_PURCHASING_ADMIN`, with `BOSS_PURCHASING` as the root user group beside the
    artifact group of that name, as in Products (§4). `BOSS_PURCHASING_BUYER` exists from Manufacturing P14; the
    borrowed groups from their owners (crosscut §1.4).
  - The root's authz comes out of BossSetupData's commented block (F1), with the organization filters of
    impl-drawers-commons §4 (`MANTLE_USER_ORG` for the groups, `MANTLE_ACTIVE_ORG` for `BOSS_PURCHASING_ADMIN`) and
    the service checks of §2.
  - The `UserGroupPermission` rows in BossSetupData for the Mantle permissions of §4: `PURCHASE_APPROVE` and
    `ORDER_APPROVE` to `BOSS_PURCHASING_APPROVE`; `STOCK_POLICY_PLAN` and `SUPPLY_PLAN_RUN` to
    `BOSS_PURCHASING_PLANNER`; `PURCHASE_ORDER_EDIT`, `SUPPLIER_PROFILE_EDIT`, `SUPPLIER_SCORECARD_EDIT`,
    `PAYABLE_IMPORT` and `RETURN_AUTHORIZE` to `BOSS_PURCHASING_BUYER`, those not granted where Manufacturing P14 seeds
    the group; all of them and `PURCHASE_POLICY_EDIT` to `BOSS_PURCHASING_ADMIN`. The requester and reader groups hold
    none. The `UserPermission` rows not seeded yet go beside `ORDER_APPROVE` in mr-mantle's MantleSetupData.
  - `ironstone.purchasing.AccessServices`: the user's buying organizations, their capabilities, own and borrowed, and
    the suppliers they may work with: any Supplier-role party whose owner passes the organization filter, that is owned
    by the active organization or, with none active, by one of the user's organizations, or shared `_NA_` (§4). Every
    Purchasing screen and shared mount calls it before the Mantle service (§2). A supplied organization, supplier,
    order, request, RFQ, quote, agreement or return is checked against it. A requester sees their own and assigned
    requests only.
  - No artifact authorization for the raw services, REST paths or bulk status change of F9.
- **The Purchasing root.**
  - The menu of design §1: the placeholders renamed, Quotes as Sourcing, and Agreements, Receiving, Bills, Approvals
    and the hidden Products added (F1), on the design's path convention. Each area shows for its groups only.
  - `<shell-providers>` (PUR-SHELL): the palette types, quick create, Today sources and notification topics grow phase
    by phase, as their records are built.
  - The `purchasing` key scope.
  - `ironstone.commons.PaletteServices.get#RecordLink` opens POs, quotes, requests, RFQs, agreements and supplier
    returns under Purchasing for its users.
- **Home** (design §3): BuyerCounters over `ironstone.purchasing.BuyerServices.get#Home`, with the counts of later phases
  null; BuyerWork over `find#BuyerWork` with no sources yet; SpendSummary unavailable until P15.
- **Purchasing demo data.**
  - `BossPurchasingDemoData.xml` builds on Mantle's ZiddlemanInc supplier, ORG_ZIZI_RETAIL as the buyer, ZIRET_WH and
    the DEMO_* offers. It adds a second and a third supplier, a supplier awaiting approval, a blocked supplier, a
    service supplier, and a drop-ship supplier with its drop-ship facility, as the phases need them, with their buyers
    as PartyRelationship rows.
  - `BossUsersDemoData.xml` gains a user per group, a buyer who also holds `BOSS_ACCOUNTING_MATCH`, a buyer with the
    Warehouse receive group, and a Purchasing reader with no other launcher.
- **Specs.**
  - `PurchasingShell`: the menu per group, the palette, record links, quick create.
  - `PurchasingAccess`: started, covering organization and supplier scope, the groups through the services and their
    permissions, and the refused REST and bulk paths.
- **Usable when:** the menu renders for each group, and quick create offers only what the group may create. A reader
  sees their organization's POs and suppliers but not another organization's, in lists, the palette and record links,
  and sees shared suppliers too. A forged order or supplier ID is refused.

### P2 — Suppliers and buying policy

- **PUR-SUPPLIER, the buyer part.** Accounting P6 built `mantle.party.supplier.SupplierProfile`, effective-dated by
  organization and supplier, with the terms and self-billing fields. Here:
  - the default currency, the incoterm, the dated purchase block with its reason, and `approvalStatus` with its seeded
    Pending, Approved, Rejected and Suspended, audit-logged. Deciding it is P4;
  - the buyer as a dated PartyRelationship from the buyer (Buyer) to the supplier (Supplier), not a profile field;
  - the buyer fields of `mantle.party.SupplierServices.store#SupplierProfile` under `SUPPLIER_PROFILE_EDIT`, beside
    Accounting's finance fields under `SUPPLIER_TERMS_EDIT`, ending the current row and starting the next;
  - `ironstone.purchasing.SupplierServices.find#Suppliers`, over the supplier scope of P1;
  - the supplier-category classification type `PcltSupplierCategory` (F11).
- **PUR-SETTINGS.**
  - `mantle.order.purchase.PurchasePolicy`, effective-dated rows by organization with their key fields audit-logged:
    the buying defaults and controls of design PurchasePolicy, among them the RFQ response days, quote-expiry warning
    days, reminder days, supplier approval required and the unapproved-supplier Warn or Stop.
  - `mantle.order.PurchaseServices.store#PurchasePolicy` under `PURCHASE_POLICY_EDIT`. A change starts a row from its
    date; a document keeps the row it was evaluated against until revalidated.
  - `ironstone.purchasing.SettingsServices` `get#PurchasingSettings` and `store#RequestPurpose`, for the forms.
- **Screens** (design §3, §12):
  - Suppliers: SupplierFind, SupplierList, CreateSupplierPerson and CreateSupplierOrganization with the duplicate search
    first. Create adds the Supplier role, owned by the active organization, and the profile starts Pending when the
    policy requires approval. Bulk buyer and classification changes answer a result per supplier.
  - Supplier360: Products' `Shared/Supplier360` with the Purchasing row of crosscut §3.3: Overview and contact,
    Products and prices, Identifications and tax registrations, Payment details (Accounting's, finance-gated and masked),
    and Chatter and files. The profile's terms and self-billing flag show read only to a buyer, and the profile's
    history comes from its rows and the audit log. Later phases add their tabs.
  - SupplierPrices and PriceExplain: Products' shared screens with their Purchasing rows of crosscut §3.21, purchase
    direction only; PriceLists opens by link for the price-policy grant (R-XC-23).
  - Product360: Products' `Shared/Product360` with the Purchasing row of crosscut §3.5: identity, units, barcodes and
    packaging, supplier prices, availability, documents and BOM links if granted. A product `check#ProductUsable`
    refuses for buying shows the reason and no order action. P15 adds Purchase history.
  - Settings: SettingsLinks, RequestPurposes over RequestCategory, and SupplierClassifications.
  - PurchasePolicy: BuyingDefaults, PurchaseControls, and PolicyDependencies with Accounting's MatchPolicies and the
    Warehouse and budget policies read only.
- **Palette:** suppliers, by name, ID and supplier item code; the product lookup opens Purchasing's Product360.
- **Usable when:**
  - a buyer creates a supplier organization, and a duplicate candidate opens the existing Supplier360 instead;
  - the buyer is assigned to the supplier from a date, and sets the profile's currency and incoterm; they are refused
    its payment terms and self-billing flag;
  - a dated purchase block shows on Supplier360 and cancels no order;
  - PriceExplain explains ZiddlemanInc's tier for ORG_ZIZI_RETAIL, and a buyer without supplier-price read sees none;
  - an administrator starts a PurchasePolicy row from a date, and the earlier row stays with its history.

### P3 — Purchase orders

- **PUR-ORDER, the order.**
  - `ironstone.purchasing.OrderServices.find#PurchaseOrders`, with received, billed and balance kept apart.
  - Create, place, update, clone and cancel through guarded calls of the Mantle order services of design OrderDetail,
    one purchase part per PO (§4, F7). Each line's product passes `check#ProductUsable` for buying (Products P2), and a
    pack is ordered as its pack product (crosscut §4.1). Each line carries its cost centre in Accounting P6's
    `OrderItem.costCenterId` (AC-22). An unapproved or blocked supplier gets the policy's Warn or Stop from
    `mantle.order.PurchaseServices.check#SupplierUsable`, beside `check#ProductUsable`.
  - The audit log (§2, F18) on the PO's key fields that Mantle does not log yet: `OrderHeader.orderRevision`, and
    OrderItem's unit, cancelled quantity, description and cost centre.
  - `mantle.order.OrderServices.send#PurchaseOrder` (R-PUR-02; `PURCHASE_ORDER_EDIT`, as for the PO verbs of later
    phases): the PO rendered as of its revision, to the vendor's `EmailOrder` address, then `EmailPrimary`, through an
    EmailMessage and `send#EmailDraft` on Projects' `send#Invoice` pattern (F13). The PDF is stored as OrderContent
    stamped with the revision and its time. It dedupes on order, revision and recipient, records each recipient's
    outcome, and moves the part OrderApproved → OrderSent.
  - The PO print takes an effective date and time, read back from the audit log (§2).
  - A buyer's hold and its release through Accounting P10's `hold#Order` and `release#OrderHold`, with a Purchase
    reason. A Sent PO un-sends to OrderApproved first (D7).
  - ClosePurchaseOrders over `mantle.order.OrderServices.close#PurchaseRemainders` (Warehouse P7), a result per order.
  - RecordServiceAcceptance over `mantle.order.OrderServices.accept#ServiceItem` (Warehouse P16), its evidence on the
    order's OrderContent.
- **PUR-APPROVAL, the default step.**
  - `mantle.order.purchase.PurchaseApprovalDecision`, a fact of its own (§2): source entity, ID and revision, the policy
    row (none yet), approver, decision, time and reason.
  - `mantle.order.PurchaseServices.decide#PurchaseApproval` with design ApprovalPolicies' no-policy rule: one step by a
    holder of `PURCHASE_APPROVE`, self-approval refused unless PurchasePolicy allows it. It then calls `approve#Order`,
    which checks `ORDER_APPROVE`.
  - `mantle.order.PurchaseServices.check#PurchaseApprovalRequired`, the SECA in mr-mantle on `check#OrderPreApprove`
    behind the buying policy's flag (§2).
- **Screens** (design §6):
  - PurchaseOrders: OrderFind, PurchaseOrderList with its saved views, CreatePurchaseOrder, ApprovePurchaseOrders and
    ClosePurchaseOrders.
  - OrderDetail: Projects' `Shared/OrderDetail` with the Purchasing row of crosscut §3.6: Header, addresses and terms,
    Items, History (the audit log and the stored PDFs), Chatter and files, and Money with finance capability. Its
    actions are place, approve, send, hold, cancel remaining, close, clone and print as of a date. Create draft bill
    opens Accounting's InvoiceFromSource dialog for AP intake. Money's request supplier prepayment goes through
    `add#OrderPartPayment` (R-PUR-36). Later phases add their tabs.
- **Outputs and shell:** the PO print and PDF; the PO palette type; quick create PO; Home's draft and unsent counts.
- **Usable when:**
  - a buyer creates a PO from ORG_ZIZI_RETAIL to ZiddlemanInc at its supplier price, and places it; a line for an
    obsolete product is refused with the reason;
  - a placed prepaid PO is not auto-approved, and its creator cannot approve it;
  - a purchase approver approves it, and send mails the PDF to the supplier's order address, stores it on the order and
    marks it Sent; a second send of the same revision mails no one twice;
  - a buyer holds and releases the PO, and an Accounting credit hold on another order stays;
  - Manufacturing P14's draft service PO is placed and approved here;
  - a PO partly received through Warehouse's Receive closes its remainder with a reason, records the cancelled quantity
    in the line's history and completes.

### P4 — Approvals and budgets

- **PUR-APPROVAL, the policies** (design ApprovalPolicies, Approvals).
  - `mantle.order.purchase.PurchaseApprovalPolicy`, effective-dated rows with their key fields audit-logged:
    organization, source type, amount band and currency, category or facility, sequence, approver role or user, quorum,
    self-approval and expiry. Activation refuses ambiguous bands and a band with no eligible approver.
  - `mantle.order.PurchaseServices` `store#PurchaseApprovalPolicy` (`PURCHASE_POLICY_EDIT`) and
    `preview#PurchaseApproval`; `decide#PurchaseApproval` with steps, quorum and separation. A decision keeps the policy
    row and the time it was evaluated. A change to an audit-logged key field of a placed source after its decision
    invalidates the decision and resubmits. `ironstone.purchasing.ApprovalServices.find#PurchaseApprovalPolicies` for
    the list.
  - The topics `PurchaseOrderApproval` and `PurchaseSupplierApproval`, seeded in mr-mantle's data with
    `mantle.order.PurchaseServices` `approve#PurchaseSource` and `refuse#PurchaseSource` (`PURCHASE_APPROVE`) as the
    framework's approve and refuse services (F23), which refuse a stale revision naming the current one. Refusal moves
    a PO OrderPlaced → OrderRejected and sets a supplier Rejected. P10 seeds `PurchaseRequestApproval` and P12
    `PurchaseAwardApproval` the same way; agreements reuse the PO topic (P13). The seeds' note goes into
    design-drawers-commons §4.
  - Supplier onboarding (R-PUR-15): submit a Pending supplier, decide it, and Suspended as a dated block with its reason.
- **PUR-BUDGET, the PO commitments** (D10), through Accounting P15's `mantle.other.BudgetServices`:
  - `check#Budget` in the approval preview, with Warn shown and Stop refused;
  - `reserve#Commitment` at the approval of a PO with no request, keyed by its revision;
  - `release#Commitment` on a cancel or a closed remainder, the latter from Mantle's `close#PurchaseRemainders`.

  P10 adds the request reservation and its conversion at PO approval.
- **Screens:**
  - Approvals: Commons Notifications filtered to Purchasing's topics and the current recipient (crosscut §3.15), its rows
    the pending decision steps (F15). Approve and refuse call the topic handlers.
  - ApprovalPolicies: ApprovalPolicyList, ApprovalPolicy and ApprovalPreview.
  - OrderDetail's Approvals tab; Supplier360's approval status and submit.
- **Shell:** Home's approvals-waiting count; the Today source for decisions due.
- **Usable when** (thresholds as design §18 recommends, §4):
  - a policy with two bands sends a PO over the first band to two approvers in sequence, and one person cannot take
    both steps where separation is set; with no policy, one purchase approver decides;
  - Approvals here and in the Commons inbox show the same decision; deciding a superseded revision is refused naming the
    current one;
  - a refused PO is Rejected;
  - a budget under Stop refuses an approval and Warn lets it through with the warning; a closed remainder releases the
    unused commitment;
  - a bulk approval of three POs with one stale names it and approves the other two;
  - a PO to a supplier awaiting approval gets the policy's Stop, and passes once the supplier is approved.

### P5 — Receiving and inspection

Purchasing's worklists and mounts over what Warehouse built (P7, P8): it posts no stock itself.

- **PUR-RECEIPT, the worklists:** `ironstone.purchasing.ReceiptServices.find#ExpectedReceipts` and
  `find#PurchaseInspections`, with expected, received, accepted, rejected and held quantities apart, and their units.
- **Screens** (design §9):
  - Receipts: ReceiptFind, ExpectedReceipts, and PrepareReceipt, labelled "Expected receipt (ASN)", over
    `ensure#PurchaseReceipt`.
  - ShipmentDetail: Accounting's `Shared/ShipmentDetail` with the Purchasing row of crosscut §3.8. A holder of
    Warehouse's receive group receives through Warehouse's guard, "Receive all as expected" with confirmation, and a
    short receipt closes or backorders through `close#ReceiptRemainder`. AP intake opens InvoiceFromSource on the
    accepted basis. A buyer without the receive group sees progress only.
  - Inspections: InspectionFind and InspectionList.
  - QualityInspection and InspectionTemplates: Warehouse's shared screens with their Purchasing rows of crosscut §3.19.
    The holders of the inspect, verify and dispose groups act; others read. InspectionTemplates is in Settings' menu.
  - OrderDetail's Receipts and inspection tab; Supplier360's Receipts and quality tab.
- **Outputs and shell:** the receiving checklist and inspection report through Warehouse's outputs; the late-receipt
  notification topic; Home's late-receipt count.
- **Usable when** (design §14.4 #1, the receipt):
  - PrepareReceipt for a PO part twice opens the same shipment;
  - a buyer with the receive group receives 8 of 10 from Purchasing's mount into quarantine, and the inspector accepts 7
    and rejects 1;
  - Receipts shows 10 ordered, 8 received, 7 accepted, 1 rejected and the held quantity until disposition;
  - a buyer without the receive group cannot receive;
  - a receipt past its due date raises the late-receipt notice.

### P6 — Bills and matching

Purchasing's mounts over Accounting's intake, holds and match (P6, P7), with the service lines and the buyer's actions.

- **Accounting's contract** (§4, PUR-MATCH), unless built (P0):
  `mantle.account.InvoiceMatchServices.evaluate#InvoiceMatch` reads ServiceAcceptance under the match policy's
  service-acceptance rule, so a service line matches against its accepted quantity (R-PUR-09).
- **Screens** (design §10):
  - Bills: BillFind, BillList over `find#BillExceptions` and an authorized invoice find, and UploadSupplierBill over
    `mantle.account.InvoiceServices.import#Bill`, which takes a buyer's upload under `PAYABLE_IMPORT` as it takes AP
    intake's (§4; impl-accounting P6).
  - InvoiceDetail: Projects' `Shared/InvoiceDetail` with the Purchasing row of crosscut §3.16. Buyers investigate; a
    match operator applies; finance holds, approves and pays through Accounting's actions. "Allocate to receipts" opens
    Accounting's LandedCosts.
  - MatchExceptions: MatchFind, ExceptionList, ReevaluateMatch over `evaluate#InvoiceMatch` with a result per bill,
    RequestHoldRelease over `request#HoldRelease`, and the legacy match backfill of Accounting P7 for a holder of the
    match group, as Accounting offers it (§4).
  - InvoiceMatch: Accounting's `Shared/InvoiceMatch` with the Purchasing row of crosscut §3.22, for
    `BOSS_ACCOUNTING_MATCH`.
  - OrderDetail's Bills and match tab; Supplier360's Bills and payment summary tab.
- **Shell:** the match-exception notification topic; Home's blocked-bills count.
- **Usable when** (design §14.4 #1, the bill):
  - a supplier bill for 8 at a higher price, uploaded by a buyer from Bills, finds only the 7 accepted units eligible
    and holds on price variance, naming the rule;
  - the buyer who holds the match group applies the 7 and requests the hold's release; finance releases and approves;
  - a buyer without that group cannot apply, and no buyer can release a hold;
  - a second upload with the same supplier reference is refused, naming the first;
  - a service line's bill matches only after its acceptance;
  - the backfill run from Purchasing links a legacy bill line with one unambiguous receipt, and names one with two.

### P7 — Drop-ship

PUR-DROPSHIP (design §18, R-PUR-17, R-SB-20), brought forward as an actively used Moqui Java feature, done the way Moqui
Java's `dropship-moqui` branch of mantle-udm and mantle-usl does it (F21; §4). That branch never merged into master, so
P7 ports it into mr-mantle and finishes it.

- **Mantle, ported from the branch:**
  - The drop-ship facility: facility type `FcTpDropShip`, owned by the supplier (`ownerPartyId`), with
    `assetAllowOtherOwner` Y, and `Facility.dropShipRemoteId` naming the SystemMessageRemote of the supplier's
    integration. The `CustomerShipFrom` and `VendorShipTo` order roles.
  - A sales line drops to a supplier by its reservation: the sales part's facility, or its store's, is the supplier's
    drop-ship facility, and `reserve#AssetsForOrder` reserves there as usual, against the supplier's stock or, with
    none, Mantle's shell asset with negative availability (F21).
  - `mantle.order.OrderServices.create#DropShipPurchaseOrder`, run beside `reserve#AssetsForOrder` in its SECA: for the
    sales lines reserved at a drop-ship facility, a PO cloned from the sales order. The link is Mantle's own fields:
    the PO's `OrderHeader.parentOrderId` is the sales order (`get#OrderDisplayInfo` lists it as a child order); each PO
    part has the facility's owner as vendor and the selling organization as customer, the end customer as a
    `CustomerShipTo` OrderPartParty and the sales part's ship-to contact mechs; notes, content and OrderItemWorkEffort
    are copied, and the lines priced by `recalc#OrderItemAmount` from the supplier's price. It then calls the
    remote's implementation of the `send#DropShipPurchaseOrderPart` interface.
  - `finalize#DropShipPurchaseOrder`, on the supplier's confirmation: the confirmed quantities and tracking code on the
    PO's shipment, shipped; then, through `parentOrderId`, the sales order's shipment found or created, packed with
    that tracking code and shipped, so Mantle's pack SECA invoices the customer.
- **Mantle's additions to the port**, where the approval gate's flag is on (§2); none calls BOSS:
  - the PO is placed and goes through P4's approval gate in `mantle.order.PurchaseServices`, where the branch approves
    it at once (Mantle's default stays for other organizations);
  - a drop-ship facility with no remote sends its PO by P3's `mantle.order.OrderServices.send#PurchaseOrder`;
  - a sales line the service passes over (no drop-ship reservation, an internal owner, two reservations) is named in
    its result, not only logged; a retry answers the first PO;
  - the buyer enters a confirmation from OrderDetail, which calls `finalize#DropShipPurchaseOrder`; the supplier's
    integration calls it itself, and P16 lets the supplier report it for the buyer's review;
  - the supplier bill comes through Accounting's intake and matches against the shipped drop-ship delivery
    (Accounting's contract in `mantle.account.InvoiceMatchServices`, §4, PUR-MATCH).
- **Routing a line to a supplier:** "Drop-ship from supplier" on a customer order line, offered where the supplier's
  price `canDropShip`, moves the line to that supplier's drop-ship facility and reserves there, in Mantle under
  `PURCHASE_ORDER_EDIT`, so the same service makes the PO. P10's RequestSourcing and P14's SupplyPlanning route customer
  demand the same way.
- **Screens:**
  - OrderDetail, in any app's context: on a customer order, each line's drop-ship state, its child PO and "Drop-ship
    from supplier" for a holder of `PURCHASE_ORDER_EDIT` (`BOSS_PURCHASING_BUYER`); on the PO, the customer, the parent
    sales order and "Confirm delivery".
  - PurchaseOrders: the Drop-ship view, with confirmation pending.
  - Supplier360's drop-ship setup: the supplier's drop-ship facility and its remote, for a purchase administrator.
- **Outputs:** the drop-ship PO print, with the customer's ship-to address and no buyer receiving address.
- **Usable when:**
  - a customer order line that reserves at ZiddlemanInc's drop-ship facility makes a PO to ZiddlemanInc whose parent is
    the sales order, shipping to the customer; a line reserved in ZIRET_WH stays with the warehouse;
  - the PO waits for P4's approval and goes out by email to a supplier with no remote;
  - confirming delivery with a tracking code ships the PO's shipment, and packs and ships the sales shipment with that
    tracking code, invoicing the customer once; a retry changes nothing;
  - "Drop-ship from supplier" on a line of a product with a drop-ship price makes the same kind of PO;
  - the buyer's warehouse stock is unchanged, and the supplier bill matches against the shipped delivery.

### P8 — Supplier returns

- **PUR-RETURN, the rest.** Warehouse P14 built `mantle.order.ReturnServices.find#ReturnableReceipts` and the receipt
  link. Here:
  - `ironstone.purchasing.ReturnServices.find#SupplierReturns`;
  - `mantle.order.ReturnServices.create#ReplacementOrder` (`PURCHASE_ORDER_EDIT`): a linked PO, and its expected
    receipt through `ensure#PurchaseReceipt`.
- **Screens** (design §9):
  - Returns: ReturnFind, SupplierReturnList, and NewSupplierReturn over `find#ReturnableReceipts` and
    `create#ReturnFromOrder`, eligible quantities by receipt and lot.
  - ReturnDetail: Accounting's `Shared/ReturnDetail` with the Purchasing row of crosscut §3.18: Authorization and RMA,
    source quantities, outbound shipment, replacement, credit or refund read only, and evidence on ReturnContent.
  - OrderDetail's Returns tab; Supplier360's Returns tab.
- **Outputs:** the supplier return authorization.
- **Usable when** (design §14.4 #4, the supplier side):
  - the rejected unit of P5 is returned with the supplier's RMA, and a second return of the same receipt and lot is
    refused past its eligible quantity;
  - Warehouse ships it and the return shows ReturnShipped; Accounting's settlement credits the billed portion only;
  - a replacement opens a linked PO with its expected receipt;
  - a return of unbilled quantity lowers the match-eligible receipt and needs no credit.

### P9 — Revisions and acknowledgements

- **PUR-ORDER, the revision**, on the audit-log rule (§2): no revision record.
  - `mantle.order.OrderServices.preview#PurchaseRevision` and `apply#PurchaseRevision` (design OrderChanges). Start
    locks with a Change hold. Apply, in one transaction, writes the changes to the audit-logged fields with the reason,
    calls `increment#OrderRevision`, Warehouse's `adjust#ExpectedReceipt` (a ReceiptInProgress fails the revision by
    name), Accounting's `convert#` or `release#Commitment` for the delta and `queue#MatchReevaluation`, all Mantle's.
    Decreases below received, billed or returned quantities are refused, and so is a supplier or currency change on a
    progressed part.
  - The approval of the new revision, then `release#OrderHold` and a resend through `send#PurchaseOrder`, which stores
    the new revision's PDF.
- **PUR-ORDER, the acknowledgement**, on the same rule: no acknowledgement record.
  - The supplier's reference and date on OrderPart's `otherPartyOrderId` and `otherPartyOrderDate`, the acknowledged
    revision and its outcome on OrderPart, and the promised date on each line, all audit-logged (F17, F18; the new
    field names at P9 start). The evidence is OrderContent in the supplier's role. Each acknowledgement's history is the
    audit log.
  - `mantle.order.OrderServices` `record#Acknowledgement` and `send#PurchaseReminder`, deduped on revision, template
    and occurrence, a result per recipient; `ironstone.purchasing.OrderServices.find#Acknowledgements` for the list.
- **Screens** (design §6):
  - OrderChanges: ProposedChange, RevisionEffects (old and new values beside the received, billed and returned
    quantities) and ApplyRevision.
  - Acknowledgements: AcknowledgementList, RecordAcknowledgement and SendReminder.
  - OrderDetail's Revisions tab (each revision's time, changes and stored PDF) and Acknowledgements tab.
- **Outputs and shell:** the revision print and email; Home's unacknowledged count; the Today source for
  acknowledgements due.
- **Usable when:**
  - a buyer lowers a partly received, sent PO's quantity: it holds with a Change reason, the effects show the received
    quantity, a cut below it is refused, the approved revision adjusts the expected receipt, re-evaluates the bill,
    releases the commitment's delta, and goes out as revision 2 with its PDF stored;
  - the PO printed as of a time before revision 2 shows revision 1's quantities;
  - a receive in progress fails the revision with ReceiptInProgress, and nothing changes;
  - a supplier's phone confirmation with a later date is recorded, and the original due date stays for OTD;
  - reminders to three suppliers with one bad address name it and mark the other two sent.

### P10 — Purchase requests

- **PUR-REQUEST.**
  - The request's organization as a RequestParty in the OrgInternal role, and the cost centre on each line, carried to
    `OrderItem.costCenterId` (§4; F3). The filer stays `Request.filedByPartyId`. `RequestItem.quantityUomId`;
    Manufacturing P13 added `Requirement.quantityUomId`.
  - The audit log on RequestItem's product, quantity, unit, required date, supplier and cost centre (F18). A request's
    revision is the time of its last change to them; a decision is refused if the request changed after it.
  - `ironstone.purchasing.RequestServices.find#PurchaseRequests`, and `mantle.request.RequestServices`:
    - `get#PurchaseRequestProgress`;
    - `preview#PurchaseSourcing` and `convert#PurchaseSourcing` (`PURCHASE_ORDER_EDIT`), on design RequestSourcing's
      result envelope. Each supplier group commits its PO, RequestItemOrder and RequirementSupply under a lock on the
      Requirement's remaining quantity. A group fails by name and the others go on; a retry repeats only the failures.
      It never passes `placeAndApproveOrders`, and it refuses quantity already sourced (R-PUR-01; F4). Customer demand
      may take P7's drop-ship route, moving the sales line to the supplier's drop-ship facility.
  - The `PurchaseRequestApproval` topic, seeded as P4's are. Approval creates or links one Requirement through
    RequirementRequestItem (RqTpProduct or RqTpInternal, RqmtStApproved), with its organization as a RequirementParty
    in the OrgInternal role (Manufacturing P13), and calls `reserve#Commitment`; refusal leaves ReqSubmitted; a cancel
    releases the unsourced demand and its commitment.
  - PO approval converts a request-sourced line's reservation with `convert#Commitment`.
- **CX-REQUEST** (§4; F5): `complete#RequestFromWork` leaves RqtPurchase alone, and RqtInventory unless Warehouse P15
  did so; progress comes from `mantle.request.RequestServices.get#PurchaseRequestProgress`.
- **Projects' contract** (§4; F6): RequestDetail's Items tab in every app's context, the base RequestItems of crosscut
  §3.11, on Marble's EditRequestItems. Its "Create purchase order" opens RequestSourcing, for the buyer group only.
- **Screens** (design §4):
  - Requests: RequestFind, RequestList with My requests, Awaiting sourcing, Due and All, and NewPurchaseRequest.
  - RequestDetail: Projects' `Shared/RequestDetail` with the Purchasing row of crosscut §3.11: Overview, Items, Sourcing
    progress, Approval, History, links, Chatter and files.
  - RequestSourcing: SourceDemand, SourceGroups and ConvertDemand, the direct PO and drop-ship routes. P11 adds the RFQ
    route.
  - OrderDetail's Sources tab.
- **Shell:** quick create request; the Today source for due requests; Home's unsourced count.
- **Usable when** (design §14.4 #1, the request):
  - a requester files a request for ORG_ZIZI_RETAIL with three lines, two with suppliers and one without; approval
    creates three requirements with the organization's role and reserves the commitment;
  - RequestSourcing makes a draft PO for each supplier and names MissingSupplier for the third; after a supplier is
    chosen, the retry makes only that PO;
  - a second conversion of the same lines is refused as already sourced;
  - approving a sourced PO converts the reservation, so the amount is not counted twice;
  - a Projects work item linked to the request completes and the request stays In Progress;
  - the Items tab shows in the Commons and Projects contexts, with "Create purchase order" for a buyer only.

### P11 — RFQs and supplier quotes

- **PUR-RFQ, the model** (§4; F19).
  - The `RqtPurchaseRfq` request type and its policy (R-PUR-13): left out of the Commons, Projects and Customer Service
    request lists and every RequestDetail mount, with triage, work-link completion and Convert to project off. Every
    open, from a link or the palette, goes to QuoteRequestDetail.
  - The RFQ is the Request and its items, audit-logged as P10's are. Sending stores the published RFQ's PDF as
    RequestContent, stamped with its time, and a material change after it needs a new send.
  - Each invited supplier's quote is a purchase OrderHeader with one part (the supplier as vendor, the buying
    organization as customer) in OrderRequested ("Request Quote"), its lines from the RFQ items with RequestItemOrder
    links. The supplier's answer moves it to OrderProposed ("Propose Quote") with prices and dates, validity in
    OrderPart's `validFromDate` and `validThruDate`, terms in `settlementTermId` and `tradeTermEnumId`, and the
    supplier's reference in `otherPartyOrderId`. Evidence is OrderContent. An unsolicited quote is a purchase order
    entered straight in OrderProposed. An amendment is an audit-logged change, and an expired quote one past its
    `validThruDate`.
  - Quantity tiers both ways (§4):
    - as purchase ProductPrice rows with their minimum quantities, valid for the quote's validity, so the resolver
      calculates a line's price at any quantity: the long-standing Moqui Java way. They are written through Products'
      `store#ProductPrice` by `publish#SupplierQuotePrice`, which stays the one path from a quote to a price row;
    - where an organization uses it, a promotion's auto-adjust: an `apply#Promotion` service that adds an `isPromo`
      child OrderItem (`parentItemSeqId`, `promoQuantity`) for the quantity difference, reapplied by
      `apply#OrderPromotions` on every change. Mantle finds promotions through the order's ProductStore, which a PO
      lacks, so P0 checks how Moqui Java scopes them for purchases (F22).
  - Quotes and requested quotes are never supply.
- **`mantle.order.SourcingServices`** (`PURCHASE_ORDER_EDIT`, but the price publish):
  - `create#QuoteRequest`, `store#QuoteRequest` and `store#QuoteRequestItem`;
  - `store#QuoteInvitation`: the supplier's quote order in OrderRequested;
  - `send#QuoteRequest`: the published RFQ to each invited supplier, InvitationDeliveryFailed for a failed contact while
    the others send. P16 adds the response link;
  - `store#SupplierQuote` for an on-behalf entry with its channel and evidence;
  - `publish#SupplierQuotePrice` (R-PUR-21; Products §7): a quoted price to an effective supplier price through
    `store#ProductPrice`, with the source order and line, under `SUPPLIER_PRICE_EDIT` only.
- **`ironstone.purchasing.SourcingServices`:** `find#QuoteRequests` and `get#QuoteRequest`; `find#SupplierQuotes` over
  the purchase orders in the quote statuses, and `get#SupplierQuote`.
- **Screens** (design §5):
  - QuoteRequests: QuoteRequestFind, QuoteRequestList and NewQuoteRequest.
  - QuoteRequestDetail: QuoteRequestHeader, QuoteRequestItems, QuoteRequestSuppliers (the quote orders),
    SendQuoteRequest, QuoteRequestResponses and History.
  - Quotes: QuoteFind, QuoteList and NewSupplierQuote.
  - QuoteDetail, over the quote order: QuoteHeader, QuoteLines with their history, QuoteTerms, QuoteAwards (filled by
    P12) and PublishPrice.
  - RequestSourcing's RFQ route; Supplier360's RFQs and quotes tab.
- **Outputs and shell:** the RFQ print and invitation email; the RFQ palette type; quick create RFQ; the Today source
  for quotes due; Home's RFQs-due and quotes-expiring counts, with PurchasePolicy's warning days.
- **Usable when:**
  - an RFQ from an approved request goes to three suppliers as three requested quotes; one bad contact is named and the
    other two are sent, and the published RFQ's PDF is on the request;
  - a material edit after sending needs a new send, and the earlier RFQ prints as of its send time;
  - a buyer enters two suppliers' prices on their quotes, with evidence; a price change shows in the line's history; an
    expired quote shows but cannot be placed;
  - publishing a quoted price makes the supplier price with its dates, and a buyer without supplier-price edit is
    refused;
  - the RFQ is in no Commons or Projects request list, and opening it from the palette shows QuoteRequestDetail.

### P12 — Comparison and award

- **PUR-RFQ, the award** (§4; F19). No award record: an award is the placed quote order with its links.
  - `mantle.order.SourcingServices.compare#SupplierQuotes`: the RFQ's quote lines in the demand's unit, through
    Products' conversions and pack products, priced at the compared quantity by the resolver's tier rows and any
    promotion child items, in a display currency at Accounting's dated rates. A missing rate, freight or unit is
    Unknown or Not comparable, never zero or cheapest; committed price and estimated landed cost stay apart.
  - `preview#Award` (validity, `check#SupplierUsable`, `check#ProductUsable`, `check#Budget`, substitutes) and
    `commit#Award`: per supplier group, it sets each chosen quote line's quantity to its allocation (audit-logged) and
    places the quote ("Place from Quote") with RequirementSupply, under lock, a result per group, never approving or
    sending. The `PurchaseAwardApproval` topic, where policy needs it, decides before the placing.
  - `close#QuoteRequest`: the remaining quotes cancelled as Not awarded (F19), their capabilities revoked once P16
    issues them, and a reviewed regret notice with a result per recipient (R-PUR-35).
- **Screens** (design §5): QuoteComparison (CompareBasis, OfferComparison, SelectOffer) and Award (AwardPreview,
  AwardCommit, CloseSolicitation). Phones and the terminal pick a demand line, then its offers.
- **Outputs:** the comparison print and CSV, with the original and normalized basis.
- **Usable when** (design §14.4 #1, the award):
  - 10 units split across two suppliers' quotes place both as draft POs with their allocated quantities; with one
    supplier blocked, its group fails by name and the other is placed;
  - a double commit answers the first result;
  - a quote in a currency without a rate shows Not comparable;
  - the third supplier's quote is cancelled as Not awarded with a regret notice, and the uncovered demand is left for
    the next run.

### P13 — Agreements

- **PUR-AGREEMENT**, on the shared rules (§2).
  - `AgrPurchase`, the Agreement status items AgmStDraft, AgmStActive, AgmStExpired, AgmStClosed and AgmStCancelled and
    their flow, and `AgreementItem.amountCap` and `releaseTolerancePercent` (F10).
  - Versions by the audit log: Mantle already logs Agreement's status, other party and dates and AgreementItem's
    quantity (F18); P13 adds the caps, tolerance and terms. AgreementItems and terms are effective-dated. An approved
    agreement stores its PDF as AgreementContent; the agreement prints as of a date. Signers and other parties are
    AgreementParty rows.
  - Release allocations, a record of their own (§2): order, line, quantity, value and the agreement's revision time.
  - `mantle.party.AgreementServices` `store#PurchaseAgreement`, `store#AgreementItem`, `get#ReleaseBalance` and
    `release#PurchaseAgreement` (`PURCHASE_ORDER_EDIT`). A release over the remaining quantity or value is refused
    beyond the tolerance, under a lock. Activation is approved as a PO is, through `decide#PurchaseApproval` on the
    PurchaseOrderApproval topic with the agreement as source (§4).
- **Screens** (design §7):
  - Agreements: AgreementFind, AgreementList and NewAgreement, a template cloned without releases.
  - AgreementDetail: AgreementHeader, AgreementTerms, AgreementItems, AgreementReleases, ReleaseAgreement, History, and
    AgreementFiles through the existing agreement content services.
  - CreatePurchaseOrder's agreement release; OrderDetail's Agreements tab; Supplier360's Agreements tab.
- **Outputs:** the agreement, terms and release history print.
- **Usable when:**
  - a blanket agreement for 100 units and a value cap is approved, its PDF stored, and releases two POs; a third over
    the cap is refused, and one within the tolerance passes;
  - two releases at once cannot exceed the cap together;
  - a changed cap shows in the agreement's history, and its print as of the approval shows the old cap;
  - an expired agreement takes no new release and its POs stay;
  - a template has no balance; PriceExplain chooses the agreement's price for its release.

### P14 — Replenishment

- **CX-PLANNING, the buy conversion** (§4). Manufacturing P13 built the run, the schedule and the make conversion, and
  P14 the outside-processing lines. Here, in `mantle.product.SupplyPlanningServices.convert#PlanningSuggestions` under
  `PURCHASE_ORDER_EDIT`: an ordinary buy suggestion to a draft PO per supplier group, to an approved purchase
  request as policy says (crosscut §4.2), or for customer demand to P7's drop-ship route (the sales line moved to the
  supplier's drop-ship facility), with RequirementSupply and `check#ProductUsable`; a competing conversion leaves
  DemandAlreadyCovered by name. Customer-order demand keeps its sales line, and the receipt on Purchasing's
  ShipmentDetail offers `reserve#AssetForOrderItem` for it (R-PUR-37). Held receipts show as Manufacturing decided (its
  §4): a pending-release line, left out of netting unless the organization's plan schedule includes held quantity due
  within the lead time.
- **Warehouse's contract** (§4, CX-FACILITY-POLICY), through `store#ProductFacilityPolicy` (`STOCK_POLICY_PLAN`),
  audit-logged:
  - the snooze, with its thru date and reason. It stops automatic conversion, not the shortage;
  - `ProductFacility.maximumStock` and `reorderMethodEnumId` (a fixed quantity, or up to the maximum), read by
    `run#SupplyPlan` (R-PUR-19).
- **Products' contract** (§4, PRD-IMPORT): reorder-rule rows as a row kind of ProductImport (design §15), each through
  `store#ProductFacilityPolicy` with its row result.
- **Screens** (design §8):
  - SupplyPlanning: Manufacturing's `Shared/SupplyPlanning` with the Purchasing row of crosscut §3.20, buy suggestions
    by default with the whole demand's provenance.
  - InventoryAvailability: Products' shared screen with the Purchasing row of crosscut §3.7.
  - ReorderRules: ReorderFind; ReorderRuleList over `store#ProductFacilityPolicy`; SuggestLevels, which previews the
    minimum and maximum from average daily demand × lead time + safety stock and applies them per row with named
    failures; and PlanSchedule over `store#PlanSchedule` (`SUPPLY_PLAN_RUN`) with a preview run.
- **Shell:** Home's shortfall count with the plan's date.
- **Usable when** (design §14.4 #2 and #3, the buy part):
  - a shortage of a purchased component shows as a buy suggestion; a buyer converts it to a draft PO, and a planner's
    second conversion is DemandAlreadyCovered;
  - an approved purchase request's demand is not suggested again;
  - a customer-order shortage converted to a PO keeps its sales line, and its receipt offers to reserve for it;
  - a planner sets a minimum and an up-to-maximum rule from ReorderRules and from InventoryAvailability through the same
    service, and the plan orders up to the maximum; SuggestLevels names one product without demand history and applies
    the rest;
  - a snoozed rule still shows its shortage.

### P15 — Performance

- **PUR-REPORTS.**
  - `mantle.party.supplier.SupplierScorecardPolicy`, effective-dated rows with their key fields audit-logged.
    `SupplierScorecard` and `SupplierScorecardMeasure`, an evaluation each, a fact of its own (§2): period, the policy
    row, evidence IDs with numerators and denominators, missing data and the risk response. A recalculation is a new
    evaluation, and the earlier one stays. `SupplierRisk`, effective-dated.
  - `mantle.party.SupplierServices`:
    - `store#ScorecardPolicy`, `store#ScorecardCriterion` and `store#ScorecardAction` (`PURCHASE_POLICY_EDIT`);
    - `evaluate#SupplierScorecard` (`SUPPLIER_SCORECARD_EDIT`), a result per supplier;
    - `store#SupplierRisk` (`SUPPLIER_PROFILE_EDIT`).
  - `ironstone.purchasing.ReportServices`:
    - `find#` and `get#SupplierScorecard`;
    - `get#PurchaseSpend`, `get#PurchaseCommitments` over BudgetCommitment, `get#ProcurementTracker`,
      `get#PurchaseHistory` and `get#SupplierStatement`. Each checks the organization and its fields, and answers its
      snapshot time and what it left out.
- **Screens** (design §11, §12): Scorecards, ScorecardDetail, Spend, Commitments, ProcurementTracker, PurchaseHistory,
  SupplierStatement (financial reader) and ScorecardPolicies. Product360's Purchase history tab; Supplier360's
  Performance tab; OfferComparison's on-time rate (R-PUR-39); ScoreActions' warning on an RFQ or PO.
- **Exports:** each report's rows with its filters, snapshot time and omitted-data warning, formula-like text guarded.
- **Home complete:** SpendSummary and every counter and BuyerWork source of design §3.
- **Usable when** (the date basis and sample as design §18 recommends, §4):
  - an evaluation of the demo suppliers scores on-time delivery from the first acknowledged line date, else the line's
    required date, and quality from dispositions; a supplier under five eligible receipts is Insufficient data and
    blocked from nothing;
  - a recalculation makes a new evaluation and keeps the earlier one;
  - Spend shows committed and billed as separate measures;
  - Commitments counts a reservation, its PO and its actual once;
  - ProcurementTracker follows P10's request through payment, and shows a buyer without finance read the payment rows
    as withheld.

### P16 — Supplier portal

These are Purchasing's pages in the PASS Supplier app Accounting P18 started in mr-pass (§2, §4), on CX-PORTALS.

- **PUR-PORTAL, the Mantle side**, so a PASS page can call it locally or remotely:
  - `mantle.order.SupplierPortalServices`, each calling `check#AccessCapability` first: `get#SupplierHome`,
    `get#QuoteInvitation`, `save#QuoteResponse`, `submit#QuoteResponse`, `get#PublishedPurchaseOrder` and
    `acknowledge#PurchaseOrder`. A quote response moves the supplier's quote order to OrderProposed, and its quantity
    tiers become price rows only when a buyer publishes them (P11); an acknowledgement writes P9's audit-logged fields.
    Both are claims for internal review, and a repeat answers its receipt.
  - What they call is Mantle's too: P9's `mantle.order.OrderServices.record#Acknowledgement` and P11's
    `mantle.order.SourcingServices.store#SupplierQuote`, since PASS reaches no BOSS service (impl-drawers-commons §4).
- **PUR-PORTAL, the PASS side.**
  - Each of those as an operation in `Schema.js` and `Routes.js`, served by Mantle's PassApi to a remote frontend.
  - The RFQ link: QuoteResponse taking its token, checked by `check#AccessToken`; and on Accounting's PO link (§4),
    OrderAcknowledgement beside BillUpload. PASS's throttling limits the posts.
  - Mantle's `send#QuoteRequest` and `send#PurchaseOrder` create the quote order's or revision's capability through
    `create#AccessCapability` and mail its link, the Supplier app's page on the buying organization's site; the PO's
    capability covers acknowledgement and bill upload. A new revision, a cancel and `close#QuoteRequest` revoke it.
  - A signed-in supplier contact is a PASS public account invited from Supplier360 through a PASS invitation bound to
    the Supplier app and the supplier; redeeming it makes the supplier relationship Mantle checks.
  - Quote and acknowledgement attachments go through PASS's media staging and scanning into OrderContent.
  - A drop-ship supplier reports delivery from the PO page, and the buyer confirms it (P7).
- **Screens** (design §13), in the Supplier app: SupplierHome (SupplierDocuments, SupplierContact), QuoteResponse
  (PublishedQuoteRequest, SupplierOffer, SubmitResponse) and OrderAcknowledgement (PublishedPurchaseOrder,
  AcknowledgeOrder), with a subcontract PO's service lines and custody, at 390 px and on the desktop. BillUpload stays
  Accounting's page. BOSS gains Supplier360's Invite to the Supplier app.
- **Shell:** the supplier-response notification topic.
- **Demo:** a supplier contact of ZiddlemanInc as an invited PASS account on the demo site's Supplier mount, and token
  fixtures for the specs.
- **Usable when** (design §13; crosscut §5):
  - an invited supplier opens the RFQ link, saves a draft, and submits; the buyer sees the quote proposed with the
    supplier's prices, and a repeated submit answers the first receipt;
  - a revoked, expired or forged token shows nothing about the supplier or the document;
  - the supplier sees no competitor, internal request, maximum price or private file;
  - acknowledging revision 2 with a later date goes to the buyer for review and changes no quantity; revision 1's link
    answers SupersededRevision; the same PO link opens BillUpload;
  - a signed-in supplier user sees only its own documents;
  - the same walk through a remote PASS frontend with only framework, webroot and PASS installed.

### P17 — Finish

- The terminal twins, and the server-static pass.
- The design §14.4 acceptance review. A Purchasing user with no other launcher is refused cost, finance, stock posting
  and other organizations' prices, through URLs, shared contexts, exports, the palette, search and the Supplier app.
  With the receive and finance groups, the same user works from the shared mounts without the Warehouse or Accounting
  root.
- The §15 outputs not built earlier.
- The inventories' **Implemented in** columns, the design's Impl column, and Remaining-Work.

## 4. Decisions

These are made before and during the build. Each one that changes the design is also written into
design-purchasing.md, or into the owner's design.

| Date | Decision | Notes |
| --- | --- | --- |
| Oct 28, 2026 | Purchasing is built last, after Products, Accounting, Warehouse and Manufacturing. It adds its context and callers to what they built for it | impl-manufacturing §4, the user's call there; the other three plans assume it |
| Oct 28, 2026 | Phase order: the procure-to-pay spine first (suppliers and policy, orders, approvals, receiving, bills, drop-ship, returns), then revisions, the sourcing upstream of the PO (requests, RFQs, award), agreements, replenishment, performance and the supplier portal | The user's call. The other apps built their side of every PO handoff, so a PO built first gives each later phase its target and the procure-to-pay walk runs by P6. The alternative was the sourcing first |
| Oct 28, 2026 | The shared rules of impl-drawers-commons §4, parties by role and changes by effective date and the audit log, apply to Purchasing and the other core apps; Mantle's existing uses of both are kept | The user's call, the Moqui Java pattern. Applied here in §2, and in the other plans |
| Oct 28, 2026 | Revisions are audit-logged key fields with `orderRevision` and its time; prints take an effective date and time; key revisions store their PDFs on the record. PurchaseOrderRevision and PurchaseAcknowledgement are dropped (P9), and policies and profiles are effective-dated rows | The user's call (answer 6) |
| Oct 28, 2026 | A supplier's quote is a purchase OrderHeader in OrderRequested and OrderProposed, and an award places it. PurchaseRfqInvitation, SupplierQuote, SupplierQuoteItem, SupplierQuoteContent and PurchaseAward are dropped (P11, P12) | The user's call (answer 6: the order "should still be an OrderHeader in the early quote statuses"), confirmed as read here. Mantle's quote transitions fit (F19) |
| Oct 28, 2026 | The root group and filter set as Products: `BOSS_PURCHASING` as root user group and artifact group, with service checks. Its groups take `MANTLE_USER_ORG` and `MANTLE_PRIVATE_CONTACT`, and `BOSS_PURCHASING_ADMIN`, with all authz on the root, `MANTLE_ACTIVE_ORG` and `MANTLE_PRIVATE_CONTACT` (impl-drawers-commons §4) | The user's call (answer 1); the filters revised in the core-app question review, for every BOSS root |
| Oct 28, 2026 | A buyer may work with any Supplier-role party whose owner passes the active or available organization filter, or shared `_NA_`; no SupplierProfile is required | The user's call (answer 2) |
| Oct 28, 2026 | Approval thresholds as design §18 recommends: no monetary auto-approval outside configured policy, a buyer and manager split, budget Warn with finance choosing Stop, and P3's no-policy step | The user's call (answer 3) |
| Oct 28, 2026 | Buyers upload supplier bills as well as AP intake, through Accounting's `import#Bill` | The user's call (answer 4); written into impl-accounting P6 |
| Oct 28, 2026 | The legacy PO and receipt match backfill is offered in both apps: Accounting's service, mounted in Purchasing's MatchExceptions (P6) | The user's call (answer 5); written into impl-accounting P7 |
| Oct 28, 2026 | The request's organization is a RequestParty in the OrgInternal role, a requirement's a RequirementParty, and the cost centre is on each line | The user's call (answer 7) |
| Oct 28, 2026 | RequestDetail's Items tab shows in every app's context | The user's call (answer 8) |
| Oct 28, 2026 | Agreement activation is approved as a PO is, on the PurchaseOrderApproval topic with the agreement as source | The user's call (answer 9) |
| Oct 28, 2026 | Drop-ship POs are built, as P7 after bills | The user's call (answer 10): an actively used Moqui Java feature with partial support in Mantle (F14) |
| Oct 28, 2026 | Drop-ship is done as Moqui Java's `dropship-moqui` branch does it: a supplier-owned `FcTpDropShip` facility, the sales line reserved there, `create#DropShipPurchaseOrder` cloning the sales order into a PO whose `parentOrderId` is the sales order with the customer as `CustomerShipTo`, and `finalize#DropShipPurchaseOrder` shipping the PO's and the sales order's shipments. ShpTpDrop and the design's `confirm#DropShipDelivery` with its two InvoiceFromSource calls are not used | The user's call: "do it the same way" (F21). P7 ports the unmerged branch and adds BOSS's approval gate, named results and email send |
| Oct 28, 2026 | Quote quantity tiers both ways: purchase ProductPrice rows with minimum quantities, priced by the resolver; and optionally a promotion's auto-adjust adding an `isPromo` child item for the quantity difference | The user's call: price rows are the long-standing way, and some use the promotion (F22) |
| Oct 28, 2026 | Maximum stock and a reorder method on ProductFacility, and SuggestLevels on ReorderRules (P14) | The user's call (answer 11) |
| Oct 28, 2026 | Held quantity in planning follows Manufacturing: a pending-release line left out of netting, with an organization option | The user's call (answer 12); decided in impl-manufacturing §4 |
| Oct 28, 2026 | The performance date basis and sample as design §18 recommends: the first acknowledged date, else the line's required date; five eligible receipts | The user's call (answer 13) |
| Oct 28, 2026 | Accounting's PO link opens BillUpload, and P16 adds OrderAcknowledgement to it; with the move below the link is the PASS Supplier app's page for the PO, not a `/po/<token>` route | The user's call (answer 14); written into impl-accounting P18 |
| Oct 28, 2026 | Purchasing builds the parts of other needs it still depends on: Projects' RequestDetail Items tab and CX-REQUEST's type check (P10); Accounting's service-acceptance match rule, unless built (P6), and the drop-ship delivery as match evidence (P7); Warehouse's `store#ProductFacilityPolicy` snooze, maximum and method, and Products' ProductImport reorder rows (P14). These keep the owner's names, packages and Shared screens | The plan's choice, as Products, Accounting, Warehouse and Manufacturing decided for theirs |
| Oct 28, 2026 | Purchasing builds no shared screen. It adds its context to the fifteen the other apps built, and its pages to the PASS Supplier app Accounting P18 starts | Follows from the above: each shared screen it mounts has another owner, built first |
| Oct 28, 2026 | Public-facing applications are in mr-pass and internal ones in mr-boss. The supplier pages are in the PASS Supplier app, not `screen/SupplierPortal.xml` in BOSS: public accounts with no UserGroup (no `BOSS_SUPPLIER_PORTAL`), Mantle's `SupplierPortalServices` through PASS's facade for a local or remote authority, PASS invitations, media and request contract (§2, P16) | The user's call, Oct 28, in the Customer Service plan review (impl-customer-service §4). It reverses crosscut D5's SupplierPortal root; Accounting P18 builds the app with BillUpload |
| Oct 28, 2026 | P3 approves with the design's no-policy rule, the decision record and the auto-approval SECA; P4 adds the policies, topics and the Approvals list | The plan's choice: no placed PO is approved without a decision from the first phase that places one |
| Oct 28, 2026 | A PO has one purchase part. Revisions, sends and acknowledgements key on the order header's revision | The plan's choice (F7); `create#PurchaseRequestOrder` already makes one order per supplier |
| Oct 28, 2026 | Internal entry first: quotes and acknowledgements are entered on the supplier's behalf from P9 and P11, and the supplier pages come in P16 | The plan's choice; design §18's "internal on-behalf-of entry remains complete" |
| Oct 28, 2026 | Mantle stands without BOSS, and business logic leans to Mantle (impl-drawers-commons §4). Purchasing's rules are Mantle services by package: approvals, the buying and approval policies, the topic handlers, the approval SECA and the supplier check in a new `mantle.order.PurchaseServices`; the PO send, revisions, acknowledgements and reminders, with Warehouse's remainder close and service acceptance, in `mantle.order.OrderServices`; RFQs, quotes, comparison and award in a new `mantle.order.SourcingServices`; returnable receipts and the replacement order in `mantle.order.ReturnServices`; request progress and sourcing in `mantle.request.RequestServices`; agreements in `mantle.party.AgreementServices`; the supplier profile, risk and scorecards in a new `mantle.party.SupplierServices`. Each checks its permission and the organization itself, and its topics are Mantle data (F23). `ironstone.purchasing` keeps `AccessServices`, Home, the worklists' and find screens' reads, the report reads and the settings forms, and its screens call the Mantle name with no pass-through. P1 grants `PURCHASE_ORDER_EDIT`, `SUPPLIER_PROFILE_EDIT`, `SUPPLIER_SCORECARD_EDIT`, `PAYABLE_IMPORT` and `RETURN_AUTHORIZE` to `BOSS_PURCHASING_BUYER`; `PURCHASE_APPROVE` and `ORDER_APPROVE` to `BOSS_PURCHASING_APPROVE`; `STOCK_POLICY_PLAN` and `SUPPLY_PLAN_RUN` to `BOSS_PURCHASING_PLANNER`; and all of them with `PURCHASE_POLICY_EDIT` to `BOSS_PURCHASING_ADMIN` | The user's call (plan review Q2). Applied in §2 and P1–P16, with one name for each contract the other plans build or use; the owner designs' names follow in the design sweep |

## 5. Open questions

| Question | Decides | Notes |
| --- | --- | --- |
| Further issues discovered during implementation | the affected phase | Record findings and decisions here; the open questions of the plan as written are decided in §4 |

The design's other §18 items, vendor consignment and the advanced integrations, are `later` there and in §7.

## 6. Findings

Design assumptions found wrong or unstated in the code, with the resolution. Where a resolution changes the design, it
is written there too.

| # | Finding | Resolution |
| --- | --- | --- |
| F1 | P0: `screen/Purchasing/` has nine placeholders: Home, Suppliers, Requests ("Purchase requests"), Quotes ("RFQs & supplier quotes"), Orders, Replenishment, Returns ("Supplier returns"), Performance ("Supplier performance") and Settings. There are no Agreements, Receiving, Bills, Products or Approvals; the root mounts only Chatter and RecordFiles and has no `<shell-providers>`. The `BOSS_PURCHASING` authz is in BossSetupData's commented block, with `BOSS_PURCHASING_ADMIN` as its artifact authz id; no Purchasing user group exists until Manufacturing P14 seeds `BOSS_PURCHASING_BUYER` | P1 |
| F2 | P0: `MANTLE_ACTIVE_ORG` filters Party by `ownerPartyId` in the active organization and `_NA_`, and OrderPart, Shipment, ReturnHeader and Invoice by party. Nothing filters OrderHeader, OrderItem, Request, RequestItem, Requirement, Agreement, AgreementItem, ProductPrice or AssetReceipt | Purchase rows through services (§2); supplier scope by the owner filter (§4, P1) |
| F3 | P0: Request has no organization or cost centre (it has facility, currency and `filedByPartyId`). RequestItem has product, quantity, required date, maximum and selected amounts and supplier, but no `quantityUomId`. Requirement has no `organizationPartyId` or `quantityUomId`. RequestParty and RequirementParty are dated role associations, and requests use RequestParty for assignees | The organization by RequestParty and RequirementParty roles (§4); the unit and the line's cost centre as fields (P10) |
| F4 | P0: `create#PurchaseRequestOrder` requires the request's facility and returns an error at the first item without a supplier. It makes one order per supplier, writes a RequestItemOrder for each item's full quantity without reading the existing ones, answers only the last order's IDs, places and approves when `placeAndApproveOrders` is set, and sets ReqInProgress. CrmMiscServices calls it | Mantle's service stays as it is; BOSS never calls it, and P10's `convert#PurchaseSourcing` is the BOSS path (R-PUR-01) |
| F5 | P0: `complete#RequestFromWork` skips completed, cancelled and draft requests but reads no request type, so linked work completing would complete a purchase request | P10's type check (CX-REQUEST, R-XC-40) |
| F6 | P0: `Shared/RequestDetail` has no request items; Projects left request items and purchase orders for later (impl-projects P5). The Commons and Projects request lists filter by type on request and leave none out | P10 builds the Items tab for every context; P11's RFQ type policy |
| F7 | P0: `OrderHeader.orderRevision` is on the header, and not audit-logged; `increment#OrderRevision` adds one under a for-update lock and checks nothing | One purchase part per PO (§4); P3 audit-logs it, and P9 guards the call |
| F8 | P0: the order status flow is as design §6 says: OrderBeingChanged only from Open or Proposed; Open, Placed, Processing and Approved go to Hold; Hold goes to Processing, Placed, Approved or Cancelled; Sent goes to Approved ("Approve (un-send)"), Processing, Completed or Cancelled, and not to Hold. OrderAutoReorder exists unused | The design holds (D7); P3 and P9 |
| F9 | P0: OrderProcureToPayBasicFlow places and approves a PO directly; OrderBulk's `change#OrderPartsStatus` and OrderLifecycle's `autoApprove#OrdersDelayed` approve orders too. Mantle REST posts orders, parts, items, part payments and returns with no BOSS guard | The approval gate is the BOSS adapter and the SECA, behind the approval gate's flag (§2); P1 grants no REST or bulk path; P0 checks the groups |
| F10 | P0: the Agreement status type has no items. AgreementType has AgrProduct, AgrSales, AgrEmployment, AgrOther, AgrCommission and AgrEula, but no AgrPurchase. AitPurchase exists. AgreementItem has quantity, unit, dates and text, but no amount | P13 |
| F11 | P0: the party classification types are Customer, EEOC, Minority, Income, Industry, Revenue, Number of Employees, SIC Code and NAICS Code; there is no supplier category | P2 seeds `PcltSupplierCategory` |
| F12 | P0: no `mantle.order.purchase` or `mantle.party.supplier` record exists. Accounting P6 adds SupplierProfile with its finance fields, and Warehouse P16 ServiceAcceptance | Under the shared rules only PurchasePolicy, PurchaseApprovalPolicy, PurchaseApprovalDecision, the release allocation and the scorecard records are new here (§2) |
| F13 | P0: `send#EmailDraft` sends an existing EmailMessage by ID, with record links and followers. `send#OrderStoreEmail` needs a ProductStore (design §14.1). Projects' `send#Invoice` sends a template with the rendered PDF (impl-accounting F2). OrderContent has a type, an item, a party and role, and a content date | P3's `send#PurchaseOrder` on that pattern, storing the PDF as OrderContent; P0 checks the attachment path |
| F14 | P0: Mantle's drop-ship pieces: ProductPrice `canDropShip` (with `standardLeadTimeDays`, `otherPartyItemId`, `quantityIncrement`, `preferredOrderEnumId` and the agreement keys); ShpTpDrop, with no parent shipment type; and `create#Order`'s Customer Bill-To from a drop-ship channel store's ProductStoreParty role. `OrderHeader.parentOrderId` is set by `clone#Order` for recurrence and listed as child orders. The `EmailOrder` contact purpose exists. Moqui Java's master has the same three pieces | P7, on F21 |
| F15 | P0: Commons' demo topic BossDemoApproval, "Purchase Approval (demo)", with `approve#DemoPurchase` and `refuse#DemoPurchase`, is Commons' demo, not a purchase source | Purchasing's Approvals filters by its own topics; the demo stays |
| F16 | P0: AppStructure's non-placeholder list is Commons, Comms, Insights, Projects and Products, each built app adding itself; its placeholder floor (94 today) counts Purchasing's nine | P1 adds Purchasing and lowers the floor |
| F17 | P0: OrderItem has `quantityUomId`, `unitListPrice`, `isModifiedPrice`, `productPriceId`, `standardCost`, `quantityCancelled`, `requiredByDate` and `overrideGlAccountId`, but no promised date, and no `costCenterId` until Accounting P6. OrderPart has `otherPartyOrderId`, `otherPartyOrderDate`, `estimatedShipDate`, `estimatedDeliveryDate`, `validFromDate`, `validThruDate`, `settlementTermId` and `tradeTermEnumId` | The acknowledgement on OrderPart and a promised date per line (P9); the quote's validity and terms on OrderPart (P11) |
| F18 | P0: the audit log covers OrderHeader's status; OrderItem's product, quantity, required date, unit amount and standard cost; OrderPart's status, vendor, customer, facility, carrier, shipment method, address and priority; Agreement's status, other party and dates; AgreementItem's quantity; and only the status of Request, RequestItem and Requirement. `get#OrderDisplayInfo` and `get#OrderItemDisplayInfo` read the order's audit history. Not covered: `orderRevision`, OrderItem's unit and cancelled quantity, OrderPart's supplier reference, validity and terms, and RequestItem's quantity, product, date and supplier | Each phase adds `enable-audit-log` to the fields it locks (P3, P9, P10, P11, P13) |
| F19 | P0: Mantle's quote flow is OrderOpen → OrderRequested ("Request Quote") → OrderProposed ("Propose Quote") → OrderPlaced ("Place from Quote"), with OrderRequested → OrderRejected ("Reject Request") and OrderProposed → OrderCancelled ("Cancel Quote") or OrderBeingChanged. The statuses read "Quote Requested by Customer" and "Quote Proposed by Vendor"; on a PO the customer is the buying organization | Supplier quotes as purchase orders in these statuses (§4, P11, P12); P0 checks the services on them and whether Not awarded needs Proposed → Rejected |
| F21 | P7: Moqui Java's drop-ship lives on the `dropship-moqui` branch of mantle-udm (Facility `dropShipRemoteId`, `FcTpDropShip`, the `CustomerShipFrom` and `VendorShipTo` roles) and mantle-usl (`send#DropShipPurchaseOrderPart`, `create#DropShipPurchaseOrder`, `finalize#DropShipPurchaseOrder`, the SECA after `reserve#AssetsForOrder`, a README setup), Aug 2024 to May 2025, never merged into master. It links by cloning the sales order: `parentOrderId`, a `CustomerShipTo` OrderPartParty and the ship-to contact mechs; lines match by product, and two lines of one product refuse to finalize. It places and approves the PO itself. Mantle's `reserve#AssetForOrderItem` with no stock creates a shell asset with negative availability, owned by the selling organization, so a drop-ship facility needs no supplier stock feed | P7 ports it into mr-mantle, with BOSS's approval gate behind its flag |
| F22 | P11: Mantle's promotions are ProductStorePromotion rows whose `apply#Promotion` services (`apply#BuyGetDiscount`, `apply#FlatDiscount` and others) add `isPromo` child OrderItems with `parentItemSeqId` and `promoQuantity`, removed and reapplied by `apply#OrderPromotions` on order changes. They are found through the order's ProductStore. The resolver picks purchase price rows by date and minimum quantity | Both tier ways in P11; P0 checks the promotion's purchase scope |
| F20 | P0: Mantle has a dated RoleType association for most records: RequestParty, RequirementParty, ProductParty, FacilityParty, WorkEffortParty and others, and undated OrderPartParty, OrderItemParty, AgreementParty, AgreementItemParty, InvoiceParty, ShipmentParty and BudgetParty. The Buyer, Supplier and OrgInternal roles exist, Buyer in the order role group. RequestContent and AgreementContent exist | The party roles of §2 |
| F23 | P0: a topic's approve and refuse services are the framework's, not Commons': NotificationTopic's `approveServiceName`, `refuseServiceName` and `refuseReasonRequired`, called by `approve#` and `refuse#NotificationMessage` as the user with recordEntityName, recordId, the messageJson map and notificationMessageId, and a refuse's reason. Mantle already seeds NotificationTopic rows in MantleSetupData | P4's, P10's and P12's topics are seeded in mr-mantle's data with the Mantle handlers, so the gate works without BOSS. `decide#PurchaseApproval` puts the source revision, the policy row and the decision step in the message map, which answers P0's handler check |

## 7. Later

Designed, not in this build:

- **The design's `later` rows:** LeaseOverview (PUR-LATER, Accounting AC-17) and MergeDraftPurchaseOrders.
- **Other design items:**
  - bill extraction (OCR) within Accounting's intake;
  - NCR and CAPA in the shared quality model;
  - pivot and graph exploration through Insights;
  - arbitrary score formulas, external risk feeds, EDI and remote supplier ordering;
  - vendor and product purchase warnings (R-XC-45), and SupplierQualifications if crosscut accepts it (R-XC-46);
  - variant-matrix PO entry (PRD-VARIANT-UI);
  - vendor-owned consignment stock (R-PUR-38);
  - rebates and retrospective settlements on agreements.
- **Other apps' contexts:** the Sales and Customer Service rows of the screens Purchasing mounts; a supplier return
  linked from a customer case (design §14.4 #4, Customer Service's side).
- **The rest of the other apps' needs:** Warehouse's transfer conversion and mount in SupplyPlanning (impl-warehouse
  §7); Customer Service's CX-APPROVAL topics, which reuse P4's decision pattern.

## 8. Verification

- **Per phase,** the "Done" rule of §2 and the phase's "usable when".
- **End to end,** run `./moq run`, sign in as `john.doe` and as each demo purchasing user, and walk each built phase's
  "usable when" in order.
- **Design §14.4**, scenario by phase:

| Scenario | Phase |
| --- | --- |
| Variant to supplier pack price, request and RFQ, split award, PO, partial receipt and inspection, split bill, payment | P2 (the pack price), P10–P12 (request, RFQ, award), P3 (the PO), P5, P6; payment is Accounting's P8 |
| Shortage, shared buy, make and transfer plan, partial production, stock and GL | P14 (the buy conversion); make is Manufacturing's P13, transfer Warehouse's §7 |
| Sales reservation, pick shortfall, alternate buy, pack, ship and invoice | P14 (the customer demand and the reservation offer); P7 (a drop-ship alternative) |
| Customer case, RMA, disposition, supplier return and credit or replacement | P8; the customer side is §7 |
| Count with an intervening movement | Warehouse's P10; Purchasing reads posted availability (P14) |
| Case intake to resolution | Customer Service's; supplier follow-ups link Requests and WorkItems (P15) |
| Cancellation, failed inspection and substitution | P3 (cancel remainder), P5 (failed inspection), P11 and P16 (a cancelled RFQ revokes), P12 (substitutes) |
| Closed period, unauthorized action and standalone use | P6 (a bill correction through Accounting); `PurchasingAccess` in every phase; P17 |
| Named independent failures, atomic inner posting | Every phase: P4 (bulk approvals), P7 (drop-ship lines), P9 (reminders), P10 (supplier groups), P11 (invitations), P15 (evaluations) |
| Drop-ship order to customer invoice and supplier bill (design §18) | P7 |
| A revision and its as-of print (§2) | P9; P11 (the RFQ), P13 (the agreement) |

- **Screenshots** through the BOSS client spec of §2, light and dark, and the Supplier app's pages through PASS's
  client spec at phone and desktop widths.
