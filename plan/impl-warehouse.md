# IronStone BOSS — Warehouse implementation

Oct 28, 2026 — plan; P0 partly done (F1–F32, found while writing it); five open questions decided (§4)

How [design-warehouse.md](design-warehouse.md) gets built, in phases from the foundation to the reports, each ending
tested and usable. This file is kept at a high level, as [impl-products.md](impl-products.md) and
[impl-accounting.md](impl-accounting.md) are: each phase names its scope by the design's sections and §17 needs rather
than restating them, and the design stays the place for screen and record detail. During the build this file is the
log: phase status and what each built, the decisions made, open questions, findings against the code, and what is
deferred.

Today `screen/Warehouse/` holds seven placeholders, and the root mounts only Chatter and RecordFiles. The
`BOSS_WAREHOUSE` authz is in BossSetupData's commented not-yet-implemented block (F1). None of the design's proposed
services, entities, fields or status items exist in Mantle or BOSS beyond what Products and Accounting build first.
Warehouse is built after both (§4), so these are there to extend:
- from Products: Product360, Supplier360 and InventoryAvailability; `store#ProductFacilityPolicy` and the TrackingPolicy
  records (its P7); the kit components (P2); the released BOM and routing versions (P8) and approved standard costs
  (P9); `resolve#ScannedProduct`, packaging, the GS1 parse and the barcodes (P11);
- from Accounting: ShipmentDetail, ReturnDetail, EquipmentDetail and InventoryValuation; the posting guard in
  `post#AcctgTrans`; `receive#ReturnItems`, `release#ShipmentDraftInvoice` and `queue#MatchReevaluation`; the conditioned
  SECAs.

**Inputs.**
- Designs:
  - [design-warehouse.md](design-warehouse.md)
  - [design-crosscut.md](design-crosscut.md) §1.3 (the automation register), §1.4, §3.3, §3.5–§3.11, §3.16, §3.18,
    §3.19, §3.25, §3.26, §4.3, §4.4, §6 and §7.1
  - [design-manufacturing.md](design-manufacturing.md): MaterialIssueReceipt, SubcontractDetail, and M2 of §12
  - [design-purchasing.md](design-purchasing.md): PUR-RECEIPT (`accept#ServiceItem`), ClosePurchaseOrders and
    PUR-RETURN
  - [design-products.md](design-products.md): PRD-PACKAGING, the kit components and `resolve#ScannedProduct`
  - [design-accounting.md](design-accounting.md): InventoryValuation, AC-02 and AC-07
  - [design-customer-service.md](design-customer-service.md): StockAtDate and Returns
- Plans:
  - [impl-products.md](impl-products.md): the pattern; P7, which builds Warehouse's facility and tracking policy and
    `Shared/InventoryAvailability`; the groups its P1 seeds; the BOSS client screenshot spec (its F23).
  - [impl-accounting.md](impl-accounting.md): the shared screens and the Warehouse contract it builds, its posting and
    adoption rules, and its findings that recur here (F4, F5, F25, F27).
  - [impl-projects.md](impl-projects.md): OrderDetail, InvoiceDetail and RequestDetail.
- The design review: [review-core-apps.md](review-core-apps.md) (D1–D28) and
  [review-core-apps/warehouse.md](review-core-apps/warehouse.md), which explain the design's D- and R- IDs.
- Guides and rules: [design-doc-guide.md](design-doc-guide.md), [style-guide.md](style-guide.md) §8 (the §8.1 element
  checklist and the §8.2 handheld density), and [impl-drawers-commons.md](impl-drawers-commons.md) §4 (the shared rules).
- Inventories: [ss-inventory.md](ss-inventory.md) and [usl-inventory.md](usl-inventory.md).
- mr-moqui: `plans/Remaining-Work.md` and `docs/Testing.md`.

Framework paths are under the mr-moqui checkout (`crates/`, `runtime/base-component/`), Mantle paths under
`runtime/component/mr-mantle/`.

Sections: [1 scope](#1-scope-and-order) · [2 rules](#2-ground-rules) · [3 phases](#3-phases) ·
[4 decisions](#4-decisions) · [5 open](#5-open-questions) · [6 findings](#6-findings) · [7 later](#7-later) ·
[8 verification](#8-verification)

---

## 1. Scope and order

- **Repositories.** Each is its own git repo:
  - `mr-moqui` (`crates/`, `runtime/base-component`)
  - `runtime/component/mr-mantle`
  - `runtime/component/mr-boss`

  `runtime/component/mr-marble` is read only, for the baseline Asset, Facility, Shipment, Shipping, Return and
  BasicHandheld screens that design §15.1 maps.
- **Scope.**
  - Every `parity` and `new` row of design §2, and the §17 needs they use, except SupplyPlanning and WH-PLAN, which
    wait for CX-PLANNING (§4).
  - The parts of other apps' needs that Warehouse depends on (§4):
    - crosscut CX-QUALITY: the shared inspection records, `mantle.product.QualityServices`, and
      `Shared/QualityInspection` and `Shared/InspectionTemplates`;
    - Manufacturing's production runs and their snapshots (part of M4): `create#ProductionOrder`,
      `release#ProductionOrder`, and the run, material and operation snapshot records;
    - Manufacturing's production stock guards (M2): `issue#ProductionMaterial`, `return#UnusedMaterial`,
      `receive#ProductionOutput` and `receive#SubcontractOutput`, with the CX-PRODUCTION movement fields;
    - Purchasing's `accept#ServiceItem` over `ServiceAcceptance`, `close#PurchaseRemainders`, and
      `find#ReturnableReceipts` with its receipt link.
  - The shared screens no app has built, with the Warehouse context only: FacilityDetail, MaterialIssueReceipt,
    QualityInspection, InspectionTemplates and StockAtDate (F29).
  - Warehouse's context on shared screens other apps built:
    - Products' Product360, Supplier360 and InventoryAvailability;
    - Accounting's ShipmentDetail (six mounts), ReturnDetail, EquipmentDetail and InventoryValuation;
    - Projects' OrderDetail, InvoiceDetail and RequestDetail.
  - §7 holds the `later` rows and needs, supply planning (CX-PLANNING, with the SupplyPlanning mount), and the rest of
    the other apps' needs.
- **Order** (decided Oct 28, 2026), the stock ledger first:
  1. the foundation;
  2. facilities and locations, then policies;
  3. inventory and traceability, then the posting guard with moves, then adjustments, scrap and repack;
  4. receiving, inspection, then putaway;
  5. counts;
  6. picking, packing, then shipping;
  7. returns;
  8. transfers and requests;
  9. production runs and stock;
  10. reports;
  11. the finish.

  Each task phase brings its handheld mount, on the scan input and handheld density that P5 adds.

## 2. Ground rules

- **The Commons rules hold.** These are impl-drawers-commons §4:
  - failure tolerance;
  - the Mantle-free framework;
  - the new XML element checklist of style-guide §8.1;
  - libraries through `libs/refresh.mjs`, and crates against `deny.toml`;
  - the `.qvue` gallery pattern;
  - demo data;
  - builds and commits.

  Screenshots come from the BOSS `test/client` spec that Products adds (impl-products §2).
- **Stock rows through services.** Under `MANTLE_ACTIVE_ORG` nothing filters Facility, Asset, AssetDetail or
  PhysicalInventory, and nothing filters by facility (F2). Warehouse reads and writes them only through services:
  `ironstone.warehouse.AccessServices` checks the user's organizations, the facility and owner, and the capability, then
  the Mantle service runs.
  - `entity` in a design form summary means that guarded path, never a bare entity form (the design's service
    notation).
  - Grants are checked in the services, so they hold for exports, search, the palette, handheld mounts and shared
    mounts. The `BOSS_WAREHOUSE_*` groups get no artifact authorization for the raw Mantle stock services or their REST
    paths (F3).
- **One posting guard.** Every stock mutation is a `mantle.shipment.WarehouseTaskServices` entry point or another
  proposed guard of the design, never the Mantle primitive alone (WH-POST). Each takes an operation identity and
  answers the first result on a retry, rechecks capability, facility, status, expiry, policy and the open period, and
  writes its dependent movements atomically. A batch names each failure and goes on. The operation record is the one
  CX-POSTING record Accounting decides at its P2 (impl-accounting §5); the period check is Accounting's AC-06 guard
  inside `post#AcctgTrans`.
- **Held stock stays held.** `move#Asset` and `receive#Asset` apply the destination location type's `autoStatusId`
  (F8). So the guard refuses a move that would change a quarantined asset's status: only `dispose#Inspection` releases
  it (P8).
- **Restricted values stay on the server.** A service leaves out of its answer any cost, value or invoice amount the
  user may not read. Financial read is Accounting's `BOSS_ACCOUNTING_READ`, not a Warehouse grant (design §1). Blind
  count quantities never reach a counter, and nothing is fetched and then hidden.
- **Shared screens.** Warehouse builds these with the Warehouse context only:
  - `Shared/FacilityDetail` and `Shared/MaterialIssueReceipt`;
  - `Shared/QualityInspection` and `Shared/InspectionTemplates`;
  - `Shared/StockAtDate`.

  It adds its context to the shared screens of §1. Each takes `appRoot` and server-derived capabilities, on
  `Shared/RequestDetail`'s pattern.
- **Owner contracts.** A contract built here for another app follows that app's design: its package, its record and
  service names, its Shared screen and its capability groups. A change found while building it is written into the
  owner's design. The owner's own screens stay with the owner.
- **Mantle rule changes keep Mantle's default.** A new refusal in a Mantle service, such as the expiry gate (F12),
  applies to an organization that has adopted BOSS's rules, through the setting Accounting decides (impl-accounting §5).
  Each ships with a test of its condition and of its unchanged default.
- **Mantle callers stay compatible.** Existing callers of these keep working:
  - `record#PhysicalInventoryQuantity`, which stays an immediate posting (design §15.2);
  - `receive#ShipmentProduct`, `receive#EntireShipment`, `move#Asset` and `reserve#AssetForOrderItem`;
  - `create#ShipmentLoadsForOrders`, whose current result stays as it is;
  - `complete#ShipmentPack`, with its label parameters;
  - the SECAs that design §15.2 keeps.

  Mantle's stock specs pass unchanged (F28), with the flow specs' SECA invoices (impl-accounting F27).
- **Done for a phase** means all of these:
  - impl-projects §2 "Done":
    - cargo tests for the touched crates, with goldens reviewed;
    - the new Mantle specs passing under `./moq test mr-mantle`;
    - `./moq test mr-boss` passing, with AppStructure covering the new screens and Warehouse in its non-placeholder
      list;
    - `moqui lint --screens` clean for BOSS with the Debug binary;
    - screenshots light and dark at 390, 1280 and 1440 px, and the handheld mounts at 390;
    - the inventories' **Implemented in** columns;
  - the `WarehouseAccess` spec extended to the phase's services and mounts;
  - the phase's walk in §8;
  - its row and **Built** note here.

## 3. Phases

| Phase | Repos | Screens | Status |
| --- | --- | --- | --- |
| P0 Checks | all (read) | — | partly done Oct 28 (§6 F1–F32) |
| P1 Foundation | Mantle, BOSS | the Warehouse root and menu, Home | — |
| P2 Facilities and locations | Mantle, BOSS | Facilities, FacilityDetail, EquipmentDetail | — |
| P3 Policies | Mantle, BOSS | Settings, StockPolicies, ReservationPolicies, AssetPools | — |
| P4 Inventory and traceability | Mantle, BOSS | Availability, Product360, Assets, AssetDetail, Movements, Lots, Containers, ContainerDetail, Traceability | — |
| P5 Posting guard and moves | mr-moqui, Mantle, BOSS | Move, HandheldHome, HandheldMove | — |
| P6 Adjustments, scrap and repack | Mantle, BOSS | Adjustments, Repack | — |
| P7 Receiving | Mantle, BOSS | Receipts, ReceiptDetail, Receive, Supplier360, HandheldReceive | — |
| P8 Inspection | Mantle, BOSS | Inspections, QualityInspection, InspectionTemplates | — |
| P9 Putaway | Mantle, BOSS | Putaway, PutawayRules, HandheldPutaway | — |
| P10 Counts | Mantle, BOSS | Counts, CountDetail, CountEntry, CountReview, CountVariance, HandheldCount | — |
| P11 Picking | Mantle, BOSS | Shipments, ShipmentDetail, OrderDetail, Picklists, PicklistDetail, CreatePicklists, Pick, PickLocationMoves, HandheldPick, HandheldPickFace | — |
| P12 Packing | Mantle, BOSS | Pack, BoxTypes, MaterialIssueReceipt (kits), HandheldPack | — |
| P13 Shipping, labels and printers | Mantle, BOSS | Ship, PackageTracking, Carriers, Printers, InvoiceDetail | — |
| P14 Returns | Mantle, BOSS | Returns, ReturnDetail, ReturnReceipt, SupplierReturnShipment | — |
| P15 Transfers and requests | Mantle, BOSS | Transfers, TransferShipmentDetail, SubcontractShipmentDetail, StockRequests, RequestDetail | — |
| P16 Production runs and stock | Mantle, BOSS | MaterialIssueReceipt (work efforts), SubcontractShipmentDetail's output receipt | — |
| P17 Reports | Mantle, BOSS | Reports, StockAtDate, OperationsHistory, InventoryValuation | — |
| P18 Finish | BOSS | — | — |

### P0 — Checks

Verify the design's riskiest assumptions against the code before building. Each result is a row in §6 and, where it
changes the design, an edit there. F1–F32 were found on Oct 28 while writing this plan. The design edits that F9, F10
and F13 call for, and those of the Oct 28 decisions in §4, are made when P0 closes. Still to check:

- **An empty organization list.** What the Facility filter answers for a user in no organization whose authz has the
  filter: no facility, or every one (§4).
- **REST and baseline writes.** Which BOSS groups would reach the Mantle REST stock mutators of F3, and which raw writes
  the mr-marble Asset and Shipment screens make.
- **A transfer's receipt totals** (F10): whether the ShipmentItemDetail view multiplies receipts on a shipment that also
  has issuances. A Mantle spec settles it before P7 and P15.
- **Quarantine and reservations** (F13): what `AssetStatusNotAvailableReservations` does to an order's reservation when
  reserved stock is quarantined, before P8's dispositions.
- **Scrap posting** (F5, F21): whether Accounting's P13 scrap account is read by the variance poster, or scrap posts as
  shrinkage (§5).
- **Kit cost:** whether `produce#AvailableAssemblies` takes an acquireCost for the kit receipt, or P12's guard sets it.
- **Today sources:** which records "assigned pick, putaway, count and inspection work" are: WorkEffortParty on
  WepShipmentShip loads, and the count and inspection assignees.
- **Open work on a location:** which records stop a location from closing (design Facilities): stock, reservations,
  open count lines and open picks.
- **The other apps' state.** Which of Products P3, P7 and P11, and Accounting P2, P6, P7, P12, P13, P17 and P19, are
  built when the phases that use them start.

### P1 — Foundation

- **Access** (design §1, crosscut CX-ACCESS).
  - The groups of design §1, with `BOSS_WAREHOUSE` as the root user group. `BOSS_WAREHOUSE_STOCK_PLANNER` and
    `BOSS_WAREHOUSE_MANAGER` exist from Products P1, and `BOSS_ACCOUNTING_READ` from Accounting P1.
  - The root's authz comes out of BossSetupData's commented block (F1), with `MANTLE_ACTIVE_ORG` and the service checks
    of §2 (F2).
  - Facility scope as Moqui has it (§4). A BOSS filter set holds Mantle's Facility filter, `ownerPartyId` in
    `filterOrgIds`: the active organization, or else every organization the user belongs to. The Warehouse groups'
    authz carries it beside `MANTLE_ACTIVE_ORG`, so other entities filter as before. A user whose Warehouse authz has
    no organization filter works in every facility of every organization.
  - `ironstone.warehouse.AccessServices`: the user's organizations, the facilities they may work in (read through
    that filter), and their capabilities. Every later Warehouse service and shared mount calls it. A supplied facility,
    asset, shipment, count or return is checked against it, and stock rows are scoped by their facility.
  - No artifact authorization for the raw stock services or their REST paths (F3).
- **The Warehouse root.**
  - The menu of design §1: the placeholders renamed, and Inspection, Counts, Transfers, Picking, Handheld and Reports
    added (F1). Each area shows for its groups only.
  - The facility selector, kept as a user preference that never widens authorization.
  - `<shell-providers>` (WH-SHELL): the palette types and quick create grow phase by phase, as their records are built,
    and so do the Today sources and notification topics.
  - The `warehouse` key scope.
  - `get#RecordLinkInfo` opens shipments, assets, lots, containers, counts and returns under Warehouse for its users.
- **Home** (design §3): QueueFilters and OperationQueues, with the counts of later phases null; MyWork with no sources
  yet; ScanOrPack over `get#ScannedIdGeneral`, as a lookup only.
- **Warehouse demo data.**
  - `BossWarehouseDemoData.xml` builds on Mantle's ZIRET_WH (F27). It adds quarantine, staging and morgue locations,
    and a second warehouse for transfers. It adds a lot-tracked and a serialized product with lots and expiry dates, and
    stock in each status, as the phases need them.
  - `BossUsersDemoData.xml` gains a user per capability, and a warehouse reader with no other launcher.
- **Specs.**
  - `WarehouseShell`: the menu per group, the palette, record links, quick create.
  - `WarehouseAccess`: started, covering facility scope and groups through the services, and the refused REST paths.
- **Usable when:** the menu renders for each group, and quick create offers only what the group may create. A reader
  sees their organization's facilities, stock and shipments but not another organization's, in lists, the palette and
  record links. A forged facility or asset ID is refused.

### P2 — Facilities and locations

- **Screens** (design §12):
  - Facilities: FacilityList as a tree by parent, and NewFacility. A parent cycle is refused.
  - `Shared/FacilityDetail` (crosscut §3.10) with the Warehouse context:
    - Overview and contact, Children, and Schedules on the existing Commons definition;
    - Locations and types: locations with capacity and pick sequence, and each location type's `autoStatusId` (F8);
    - Products: ProductFacility and ProductFacilityLocation through Products P7's `store#ProductFacilityPolicy`;
    - Files and Chatter, on the existing Facility host.

    P3 adds Policies, P12 Box types and P13 Printers.
  - EquipmentDetail: Accounting's `Shared/EquipmentDetail` with the Warehouse row of crosscut §3.10: identity,
    assignments, availability and the maintenance summary. Its Files tab comes with P4's AssetContent.
- **WH-POLICY, the location part:** the shipping-dock location type (F8).
- A location with stock or open work is not closed (P0 names the open work). Relocate (P5) is how it is emptied.
- **Usable when:**
  - a facility admin builds a facility with an area, receiving, quarantine, staging and pick locations and their
    statuses;
  - a cycle is refused;
  - closing a location that holds stock is refused, naming the stock;
  - an operator reads the facility but cannot edit it.

### P3 — Policies

- **WH-POLICY, the rest.** Products P7 built the tracking records and `store#TrackingPolicy`. Here:
  - the operation policy: receipt and delivery steps 1–3 (design StockPolicies), default locations, over-receipt and
    over-shipment tolerances defaulting to zero, the backorder choice, blind counts and auto-print, through
    `store#OperationPolicy`;
  - the facility reservation default without a store, through `store#ReservationPolicy`;
  - `resolve#WarehousePolicy` and its trace: organization, facility, store override, product exception;
  - versions with effective dates and audit. A change applies at posting and rewrites no history.
- **Screens** (design §14):
  - Settings;
  - StockPolicies: OperationPolicy, TrackingPolicy, ProductTrackingExceptions (the records Product360/Stock shows) and
    PolicyPreview;
  - ReservationPolicies: FacilityReservation, StoreReservation through a field-scoped ProductStore service, and
    ReservationCheck's preview. Its repair posts under P5's guard;
  - AssetPools: PoolList, PoolHeader, PoolParties and PoolStores, with a preview of the open reservations a change
    affects;
  - FacilityDetail's Policies tab.
- **Usable when:**
  - a warehouse manager sets a facility to two-step receipt, a product to lot required, and a facility reservation
    default with no store;
  - PolicyPreview names the source of each value, and a store override wins for that store's orders only;
  - an operator reads the effective policy but cannot save it.

### P4 — Inventory and traceability

- **Screens** (design §6), all reading through AccessServices (F2):
  - Assets: AssetFind and AssetList, grouped by product, lot, location or owner;
  - AssetDetail: AssetHeader with the metadata allowlist over `update#Asset`, Reservations, AssetLedger and AssetAudit;
  - Movements: MovementFind and MovementList with each source and correction chain, and export;
  - Lots: LotList, LotStock, and LotMetadata for a new lot. Correcting a posted lot is P6;
  - Containers (ContainerList, NewContainer), and ContainerDetail's header and contents. Its moves are P5.
  - Availability: Products' `Shared/InventoryAvailability` with the Warehouse row of crosscut §3.7. That is Summary,
    Locations/lots, Reservations, Projection, Policy and the Movements tab (D28), with holds and transit apart.
  - Product360: Products' `Shared/Product360` with the Warehouse row of crosscut §3.5. That is Summary, Identifiers,
    Dimensions/units, Stock/locations, Documents and History, master read-only. The Replenishment tab (D28) shows the
    facility levels; its planning suggestions are §7.
- **WH-RECORD-HOSTS, the asset part:** `mantle.product.asset.AssetContent`, registered in `get#RecordLinkInfo`, for
  Files and Chatter on AssetDetail and EquipmentDetail (F22).
- **WH-TRACE:** `mantle.product.TraceabilityServices.get#Traceability`, bounded and cycle-safe, with pages of nodes and
  edges, Unknown provenance for a gap, and fields filtered by permission. Traceability shows it as a list and a tree,
  on Products P3's `view-tree` occurrence keys (F26).
- **Palette:** lots, assets and containers.
- **Usable when:**
  - an operator finds a lot's assets across locations and follows one asset's ledger to its receipt;
  - a Traceability walk from a received lot reaches its shipment, and a missing link shows Unknown;
  - a reader without financial read sees no cost in lists, exports or Traceability;
  - a metadata edit is audited, and no quantity, location or cost edit is offered.

### P5 — Posting guard and moves

- **Framework** (style-guide §8.1 checklist; F24).
  - `scan-input` (WH-SCAN): keyboard-wedge and manual input, a resolver, the allowed identity types, an ambiguity
    chooser, explicit confirmation and deduplicated scan intent, in qvt, html and tui, with the gallery's Views.
    Products P11's GS1 parse reads the codes. html and tui fall back to a text input with the same resolver.
  - `density="handheld"` on a screen (WH-HANDHELD, style-guide §8.2): 48 px controls, 18 px text, no drawer, a reduced
    header (§5).
- **WH-POST.**
  - The entry-point pattern of §2 in `mantle.shipment.WarehouseTaskServices`, on the CX-POSTING record.
  - CX-POSTING's `enteredQuantity`, `enteredQuantityUomId` and `appliedConversionFactor` on AssetReceipt, AssetIssuance
    and ShipmentItemSource (F7).
  - The held-stock rule of §2 (F8), and container attachment that never moves stock (F9).
  - `attach#AssetToContainer`, `detach#AssetFromContainer` and `move#Container`.
- **WH-EXPIRY, the gate:** expired stock is refused at reservation and issue, while quarantine, return and disposal
  still work; near-expiry warnings show the date (F12; §5).
- **Screens:**
  - Move (design §8): MoveSelect, MoveContents, MoveConfirm and RecentMoves. Reserved stock keeps its reservation or the
    move is refused, and a cross-facility move opens Transfers (P15). Move takes a run context, which Manufacturing's
    Stage action uses later.
  - Relocate on Assets and Availability, a result per row.
  - ContainerDetail's AddOrRemoveAsset and MoveContainer.
  - ReservationPolicies' ReservationCheck repair.
  - HandheldHome (design §13), and HandheldMove. Home's ScanOrPack takes `scan-input`.
- **Usable when:**
  - a mover scans an asset and a bin and moves part of it, and a retry with the same operation answers the first
    move;
  - a move of quarantined stock into a pick bin is refused;
  - a relocation of five assets with one invalid names it and moves the other four;
  - a container moves with all its contents or not at all;
  - at handheld density on a phone, the task keeps scan focus and 48 px controls.

### P6 — Adjustments, scrap and repack

- **Adjustments** (design §6): AdjustmentScope for an exact bucket (None differs from Any) and Adjustment, a delta or a
  count with a before-and-after preview. Both go through the guard to `record#PhysicalInventoryQuantity` or
  `record#PhysicalInventoryChange`. A movement after the preview invalidates it, a closed period fails, and a repeated
  operation answers the first adjustment.
- **WH-SCRAP:** `scrap#Asset`, `PhysicalInventory.scrapIndicator`, and the InVrScrap and InVrExpired reasons (F6). It
  may move the stock to a morgue location first. Scrap posts to Accounting's scrap account or as shrinkage (F5; §5).
  AssetDetail, Move and the Lots expiry list open it.
- **WH-EXPIRY, the corrections:** `correct#LotMetadata`, with old and new values, reason and actor. Extending an expiry
  needs the quality manager and releases no quarantine.
- **Repack** (design §8): RepackSource and RepackConfirm over `repack#Asset`, in an organization-owned WepAssembling
  WorkEffort.
  - The issue and the receipt net to zero through the existing GL SECAs.
  - The lot carries over. The receipt links to its source issuance through CX-PRODUCTION's
    `AssetReceipt.sourceAssetIssuanceId`, added here.
  - The pack direction is Products' PRD-PACKAGING, and a scan resolves through `resolve#ScannedProduct` (Products
    P11).
- **Usable when:**
  - an adjuster previews and posts a count of one lot bucket with a reason;
  - a backdated adjustment into a closed period is refused;
  - a scrapped expired lot posts once and is left out of Counts;
  - unpacking 2 cases into 24 units carries the lot and the unit cost and nets to zero in the ledger;
  - a retry posts nothing twice.

### P7 — Receiving

- **WH-POST, the receipt entry points:**
  - `ensure#PurchaseReceipt`: one open receipt per PO part.
  - `adjust#ExpectedReceipt`: Purchasing's revision call, refused with ReceiptInProgress while a receive holds the
    source.
  - `close#ReceiptRemainder`. Close calls Purchasing's `close#PurchaseRemainders`. Backorder calls
    `ensure#PurchaseReceipt` and `update#ShipmentItem`. Only then does it call `deliver#Shipment`.
- **Purchasing's contract** (§4, design-purchasing ClosePurchaseOrders):
  `ironstone.purchasing.OrderServices.close#PurchaseRemainders`. Per item, the remainder is the quantity less what was
  cancelled and received (accepted and rejected). It records that through `cancel#OrderItem` with an explicit
  cancelQuantity, releases the Requirement allocation, calls Accounting's `release#Commitment` where the PO has a
  commitment (impl-accounting P15), and completes the order when nothing is open. Purchasing's ClosePurchaseOrders
  screen stays Purchasing's.
  - `generate#TrackingIdentities`, with the TrackingPolicy pattern and a uniqueness preview.
  - The receive guard over `receive#ShipmentProduct`. It keeps the entered unit and converts a PO line's unit. A pack
    scan resolves through `resolve#ScannedProduct`.
  - AdHocReceipt over `receive#Asset`.
- **Receipt steps** (P3): step 1 posts to the product's default location until P9's rules, step 2 to receiving, step 3
  to quarantine (P8).
- **Screens** (design §4):
  - Receipts: ReceiptFind, ReceiptList (list, board and calendar), NewReceipt. A return opens the shipment its approval
    created; a transfer's leg comes with P15.
  - ReceiptDetail: Accounting's `Shared/ShipmentDetail` with crosscut §3.8's receipt row, and `close#ReceiptRemainder`.
  - Receive: ReceiveSource, ReceiveLine, GenerateTracking, AdHocReceipt and ReceiveRemaining. "Receive all as expected"
    needs explicit confirmation.
  - Supplier360: Products' `Shared/Supplier360` with the Warehouse row of crosscut §3.3: Contact, Orders, Receipts,
    Returns, rejections, Files and Chatter.
  - HandheldReceive.
- **Around the receipt:** the incoming bill SECA runs only for a self-billing supplier, as Accounting conditioned it in
  its P6, and the AssetReceipt EECA queues match re-evaluation (its P7).
- **Outputs and shell:** the receipt and rejected-goods receipt; the receipt exception notification; the shipment
  palette type; quick create receipt.
- **Usable when** (design §19, short receipt):
  - a receiver receives part of a PO part with one rejected unit and a generated lot range;
  - they close the remainder with a reason, or backorder it;
  - the bill is created only for a self-billing supplier, for the accepted quantity;
  - a second NewReceipt for the part opens the same receipt;
  - a double submit answers the first receipt, and a serial count that does not match is refused.

### P8 — Inspection

These are crosscut CX-QUALITY (§4), built to crosscut §3.19 and WH-QUALITY.

- **Records:** `mantle.product.quality.InspectionTemplate` and `InspectionTemplateItem` (versioned; a published
  revision is immutable), `QualityInspection`, `InspectionReading` and `QualityInspectionContent`. The one disposition
  vocabulary is seeded: Release, Quarantine, Rework or repair, Return to customer, Return to supplier, Scrap, Use as is.
- **`mantle.product.QualityServices`:**
  - `store#InspectionTemplate`, `create#Inspection`, `save#InspectionReading`, `submit#Inspection` and
    `verify#Inspection`, which a separate role runs;
  - `dispose#Inspection`. Release first reserves stock that has customer demand to its order item, then sets
    AstAvailable. Scrap goes through P6's `scrap#Asset`. Each disposition queues match re-evaluation;
  - `get#SourceInspectionStatus`: held, match-eligible and rejected. It replaces the reading Accounting used before
    CX-QUALITY existed (F31).
- **On receipt:** when TrackingPolicy or a published template applies, Receive posts the accepted quantity as
  AstQuarantine into a quarantine location and creates the inspection in the same operation.
- **Screens:**
  - Inspections: InspectionFind and InspectionList. Moving a board card assigns work only, and a bulk reassignment
    names each result.
  - `Shared/QualityInspection` (Header, Readings, Result, Disposition, History) and `Shared/InspectionTemplates`
    (Templates, Characteristics, Sampling, Applicability, Revision history), with the Warehouse context.
- **Outputs and shell:** the inspection evidence and disposition certificate; the Today source and the
  inspection-decision notification.
- **Usable when** (design §19, receipt to partial inspection):
  - a receipt that needs inspection lands in quarantine, and its held quantity shows to matching;
  - an inspector saves readings and submits;
  - a quality manager releases part, which is reserved first to the waiting order, and scraps the rest;
  - an inspector cannot verify, and a published template revision cannot be edited.

### P9 — Putaway

- **WH-PUTAWAY:**
  - `mantle.facility.PutawayRule`, with storage-type applicability;
  - `mantle.facility.PutawayServices.store#PutawayRule`;
  - `resolve#Destination`. It tries the ProductFacilityLocation default first, within the rules, and checks compatible
    units, owner, status and capacity with incoming reservations. It explains each chosen and rejected destination;
  - `get#Capacity`, which the resolver uses. The Capacity screen is §7.
- **Screens** (design §4, §12):
  - Putaway: PutawayQueue by age and pick sequence, and Destination. A destination other than the suggestion needs a
    reason, and quarantined stock moves only within quarantine.
  - PutawayRules: RuleList and RuleTest.
  - HandheldPutaway.
- Receive's step 1 now posts to the resolved destination.
- **Outputs and shell:** the putaway sheet, and the Today source for putaway work.
- **Usable when:**
  - a two-step receipt queues its stock in receiving;
  - Putaway suggests the rule's bin, and explains another bin's refusal for capacity;
  - when no bin fits, the stock stays in staging with the reason named.

### P10 — Counts

- **WH-COUNT, the records.** The PhysicalInventory and PhysicalInventoryCount fields of the design's need, and the
  status transitions of the four PI statuses (F4).
- **The count schedule** (§4), as count-schedule rows of WarehousePolicy, `mantle.facility.CountSchedule`:
  - scope: organization, facility, location type, area or location, product category, and ABC class;
  - kind:
    - periodic, every N days (Odoo's location frequency);
    - annual, on a month and day (Odoo's company count date);
    - zero confirmation, when a location's stock reaches zero (OCA's stock_cycle_count);
  - the count mode (full, cycle or spot), the blind default and the assignee, with effective dates.

  `FacilityLocation.lastCountDate` and `ProductFacility.lastCountDate` are written by `post#Count`.
  `ProductFacility.abcClassEnumId` (A, B, C) is set by hand through `store#ProductFacilityPolicy`.
  `find#DueCounts` gives each location, or product at a facility, its next date: the last count plus the frequency,
  or the annual date, whichever is earlier, as Odoo does. Ad hoc dues are the short-pick recount (P11) and Request a
  count. That is Odoo's wizard: on selected Assets or Availability rows it opens NewCount with that scope, a date, an
  assignee and the blind flag.
- **`mantle.product.InventoryCountServices`:**
  - `create#`, `update#` and `start#Count`, which snapshots the scope;
  - `record#CountLine`, which saves an observation only;
  - `submit#`, `review#` and `recount#Count`, and `resolve#CountConflict`;
  - `post#Count`. It sums the approved deltas per asset for the variance SECA (F5) and locks disjoint buckets. It
    records each line's outcome, and a retry skips the successes;
  - `find#DueCounts`.
- **Screens** (design §7, §14):
  - Counts, with the Due saved find, CountDetail and CountEntry. CountEntry has a desktop grid and one line at a time
    on a handheld, and the server withholds blind quantities.
  - The count schedule under StockPolicies, and Request a count on Assets and Availability.
  - CountReview: VarianceReview, ResolveConflict and PostCount. Its valuation basis shows with financial read only.
  - CountVariance, under Reports with a link from Counts.
  - HandheldCount.
- **Outputs and shell:**
  - the blind count sheet and the reviewed variance sheet;
  - the count-entry CSV import and its row-result CSV;
  - due counts on Home, as a notification and as a Today source.
- **Usable when** (crosscut §6, count with moving stock):
  - a pick-face location type counted every 30 days, the facility's annual date and a location that just reached zero
    each show as due, with the earlier date winning;
  - a blind count snapshots its scope, a move during counting is found, and a recount resolves it;
  - the approved lines post, an uncounted line stays unchanged, a failed line is named, and a retry posts nothing
    twice;
  - a counter never receives an expected quantity.

### P11 — Picking

- **WH-PICK:**
  - `ShipmentWorkServices.preview#ShipmentLoadsForOrders`;
  - `create#ShipmentLoadsForOrders` with a result per group and a retry identity, its current result unchanged;
  - `WarehouseTaskServices.record#ShortPick`, writing the new `mantle.shipment.ShipmentPickException` and a recount;
  - `finish#Pick` and `reverse#Pick`;
  - `find#PickFaceReplenishment`, the first reader of the pick-face levels (F19);
  - the flag on a ShipmentItemSource whose balance was cancelled through `cancel#OrderItem` and
    `reduce#AssetReservation`. Customer Service's `apply#OrderChange` uses the same path later.
- **Screens** (design §9, §10):
  - Shipments: ShipmentFind with drop shipments read-only under the type filter, ShipmentList, NewOutgoing.
  - ShipmentDetail: Accounting's `Shared/ShipmentDetail` with crosscut §3.8's outbound row.
  - OrderDetail: Projects' `Shared/OrderDetail` with the Warehouse row of crosscut §3.6, money with financial read
    only. A held order gets no new shipment.
  - Picklists, and PicklistDetail with LoadHeader, LoadShipments, LoadPeople, LoadEquipment and LoadCompletion.
    `binLocationNumber` is on both the shipment and its source (F18).
  - CreatePicklists: selection, preview and create.
  - Pick: PickLines, PickScan, ShortPick, FinishPick and PutBack.
  - PickLocationMoves: PickFaceNeeds, QuickPickMove and BelowMinimum.
  - HandheldPick and HandheldPickFace.
- **Outputs and shell:** the picklist and the combined pick and pack sheets; the Today source for assigned picks; the
  short-pick notification; the picklist palette type.
- **Usable when** (crosscut §6, sales order fulfillment, Warehouse's part):
  - a wave from three ready orders previews one excluded order and creates two loads, each with its result;
  - a picker picks one line and short-picks another. It shows Short and opens a recount, and on-hand is unchanged;
  - a cancelled balance shows in Put back, and nothing moves until the picker confirms;
  - a pick face below its minimum lists its bulk source and is replenished.

### P12 — Packing

- **Pack** (design §10): PackScan, PackageEditor, PackageContents, PackOptions, PackAssembly and CompletePack.
  - CompletePack calls `complete#ShipmentPack` with getLabels and getReturnLabels false (F17). The pack SECA creates
    the sales invoice, which BOSS keeps.
  - ReopenPackage calls Accounting's `release#ShipmentDraftInvoice` first (impl-accounting P17), then
    `unpack#ShipmentItemIssuance` (F11; §5). The same steps put back a reduced line that is already packed.
- **`Shared/MaterialIssueReceipt`** (crosscut §3.9) with the Warehouse context, first with the shipment-assembly source.
  PackAssembly runs `produce#AvailableAssemblies` through the guard. The kit receipt carries the issued component cost
  ÷ kit quantity, from Products P2's kit components, so no WIP remains. P16 adds the work-effort source.
- **BoxTypes** (design §12): BoxTypeList and CarrierBoxCodes. FacilityDetail gains its Box types tab (FacilityPackaging).
- **HandheldPack.**
- **Outputs:** the packing slip, the package contents and inserts.
- **Usable when** (design §19, multiple packages and the reopened package):
  - a shipment packs into two boxes with their weights;
  - complete pack creates the sales invoice and requests no label;
  - a package is reopened while its invoice is in process, and a reduced line is put back;
  - a package whose invoice is final stays closed;
  - the DEMO_PA kit packs at its components' cost and leaves no WIP.

### P13 — Shipping, labels and printers

- **WH-LABEL:**
  - `WarehouseTaskServices.get#ShipmentRates`. It calls the configured implementations of the `get#ShippingRate` and
    `get#ShippingRatesBulk` interfaces, and a local-rules provider over the `get#OrderShippingRateLocal` logic (F14);
  - durable provider-request records for label request, tracking and refund. After a timeout, the provider is asked
    before any retry;
  - a test shipping gateway for the specs, with rates, labels, a timeout and a refund (F14; §5);
  - FacilityPrinter's `copies`, `fromDate` and `thruDate`, and the PtpLotLabel, PtpLocationLabel and PtpCountDocuments
    purposes (F15);
  - `mantle.facility.PrintServices.dispatch#Document` and `get#PrinterCapabilities`, over the framework's
    `print#Document` and NetworkPrinter (F16);
  - PDF labels only, through Products P11's barcodes. ZPL, with FacilityPrinter's `labelFormatEnumId`, is §7 (§4).
- **WH-POST, shipping:** `record#PackageDelivery`. Dispatch requires tracking totals, inspection release and unexpired
  lots.
- **Screens** (design §10, §12):
  - Ship: ShipmentAddress, RateOptions, Labels, ManualCarrier and ShipConfirm.
  - PackageTracking: TrackingFind, TrackingList and RecordDelivery.
  - Carriers: CarrierMethods, GatewayBindings with credentials masked, and CarrierTest.
  - Printers: PrinterIndex and PrinterTest. FacilityDetail gains its Printers tab (FacilityPrinters).
  - InvoiceDetail: `Shared/InvoiceDetail` with the Warehouse row of crosscut §3.16, read and print only, with financial
    read.
- **Labels and outputs:** location, lot, serial, container and box labels from FacilityDetail, Lots, Containers and
  BoxTypes; carrier labels, return labels and manifests.
- **Usable when** (design §19, label timeout and retry):
  - a two-package shipment is rated by local rules and by the test gateway;
  - a label timeout asks the provider before retrying and buys no second label;
  - a method with no gateway ships with a manual tracking code and cost;
  - a label refund reverses no shipment;
  - a print failure leaves the posted result and offers a reprint.

### P14 — Returns

- **WH-RETURN.**
  - ReturnReceipt runs Accounting P17's `receive#ReturnItems`. Quarantine and inspection are P8's.
  - `ship#SupplierReturn` sets ReturnShipped.
  - A supplier return issues the specific quarantined asset through `issue#AnyAssetForShipmentItemSource`, under
    disposition authority. Purchasing's `find#ReturnableReceipts` gives the returnable receipts and lots.
- **Purchasing's contract** (§4, PUR-RETURN): `ironstone.purchasing.ReturnServices.find#ReturnableReceipts`, with
  PUR-RETURN's link from a ReturnItem to the AssetReceipt and asset it returns (F32). Eligibility is the accepted plus
  quarantined quantity less earlier supplier returns, locked per receipt and lot. Warehouse's NewReturn uses it for a
  supplier return; Purchasing's NewSupplierReturn and `create#ReplacementOrder` stay Purchasing's.
  - `request#ReturnLabel`, for Customer Service's "Issue return label".
- **WH-RECORD-HOSTS, the return part:** `mantle.order.return.ReturnContent`, registered in `get#RecordLinkInfo`.
- **Screens** (design §11):
  - Returns: ReturnFind, ReturnList, and NewReturn over `create#Return` and `create#ReturnFromOrder`. Authorization is a
    separate right, and `receive#ReturnWithoutShipment` is not offered.
  - ReturnDetail: Accounting's `Shared/ReturnDetail` with the Warehouse row of crosscut §3.18: Overview, Eligible items,
    Shipments/receipts, Inspection/disposition, Settlement (read only), Files and Chatter.
  - ReturnReceipt and SupplierReturnShipment: `Shared/ShipmentDetail` with their crosscut §3.8 rows.
- **Outputs:** the RMA receiving slip and the supplier-return slip.
- **Usable when** (crosscut §6, customer and supplier returns; design §19, the return in two boxes):
  - part of an RMA is received in one box with one unit rejected at the dock, and the rest in a second box;
  - receipt settles nothing; inspection restocks one unit and scraps another;
  - a supplier return of a rejected lot issues the quarantined asset and ships, setting ReturnShipped;
  - a Warehouse user cannot settle.

### P15 — Transfers and requests

- **Transfers** (design §8): TransferFind with the "custody at supplier" filter, TransferList with each leg's progress,
  and NewTransfer over `create#Shipment` with ShpTpTransfer.
  - TransferShipmentDetail: `Shared/ShipmentDetail` with crosscut §3.8's transfer row and its Transit pane. The origin
    picks and ships; the destination receives, inspects and puts away.
  - The guard copies the source issuance's acquireCost and owner into the destination receipt. Accounting's P19
    readiness checks `transferGlAccountId` (F21).
- **WH-REQUEST:**
  - RqtInventory validation on `create#Request`;
  - `RequestServices.get#InventoryRequestProgress`;
  - `WarehouseTaskServices.allocate#InventoryRequest`: a transfer, or a guarded move within one facility;
  - the Requirement link through the existing RequirementRequestItem (F22). RequirementSupply waits for CX-PLANNING
    (§7).
- **Screens:**
  - StockRequests: StockRequestFind, StockRequestList and NewStockRequest;
  - RequestDetail: Projects' `Shared/RequestDetail` with the InventoryRequestProgress panel of crosscut §3.11;
  - quick create transfer and stock request.
- **WH-SUBCONTRACT, the dispatch:**
  - the Custodian FacilityParty role (F22), and an organization-owned vendor-custody facility in the demo;
  - SubcontractShipmentDetail: `Shared/ShipmentDetail` with crosscut §3.8's subcontract row. Components go by
    `move#Asset` or a ShpTpTransfer, with the run, operation and service PO item fixed (OrderItemWorkEffort exists,
    F22). Unused components come back the same way. The output receipt is P16.
- **Outputs:** the transfer sheet.
- **Usable when** (design §19, transfer in transit):
  - a transfer ships at the origin, shows in transit and not usable at the destination, and is received in two parts
    at the origin's cost and owner;
  - a stock request is approved, allocated by transfer, and shows requested, allocated, transferred and received;
  - components dispatched to a vendor-custody facility stay the organization's and show under custody at supplier.

### P16 — Production runs and stock

These are Manufacturing's contracts (§4), built to design-manufacturing NewWorkOrder, WorkOrderDetail,
MaterialIssueReceipt and SubcontractDetail, and M2 and M4 of its §12; and Purchasing's service acceptance, built to
design-purchasing PUR-RECEIPT. They use Products P8's released BOM and routing versions and P9's approved standard
costs. Built in two parts: P16a the runs and their snapshots, then P16b the stock guards.

- **P16a, the runs (part of M4).**
  - Records:
    - `mantle.work.production.ProductionRunSnapshot`: the run, its revision, the BOM, routing and policy versions,
      the frozen standard cost (`productStandardCostId` and `versionSeqId`) and the demand IDs;
    - `ProductionMaterialSnapshot`: the immutable material and output lines, each with its source BOM item, role,
      product, quantity and unit, exact stock conversion, and operation;
    - `ProductionOperationSnapshot`: each operation child with its routing operation, sequence and work center.
  - `mantle.work.ProductionServices`:
    - `create#ProductionOrder`, to design-manufacturing §12's contract. It calls `create#ProductionRun` without the
      legacy consume and produce products, so no `PatMfgBom` row is read or written. It sets the run's
      `ownerPartyId` to the organization, writes the draft lines and `WeptConsume`/`WeptProduce` rows from the
      selected versions, and calls `check#ProductUsable` with usage Produce;
    - `release#ProductionOrder`: it freezes the snapshot and revalidates superseded versions. It creates the operation
      children with their owner, and rewrites the WorkEffortProduct rows from the snapshot;
    - `get#ProductionOrder`, the read MaterialIssueReceipt shows.
  - The seeded `WeApproved`→`WeInPlanning` transition, for an unrelease while no stock fact exists.
  - Manufacturing's WorkOrders, NewWorkOrder and WorkOrderDetail screens stay Manufacturing's. A demo service creates
    and releases the runs the walks need.
- **P16b, the stock guards (M2).**
  - CX-PRODUCTION's fields: `AssetIssuance.productionMaterialLineId`, `AssetReceipt.productionOutputLineId`, and
    `operationWorkEffortId` on both (F7), each a snapshot line or operation. `sourceAssetIssuanceId` came with P6.
  - `mantle.work.ProductionServices`:
    - `issue#ProductionMaterial`: a new AssetIssuance per operation key and material line. It refuses an asset that
      is not AstAvailable, or whose owner is not the run's owner;
    - `return#UnusedMaterial`: a new receipt fact at the original acquireCost. It never calls
      `cancel#AssetIssuance`;
    - `receive#ProductionOutput`: acquireCost is the snapshot's frozen standard unit cost. With no approved standard
      it is the issued cost to date ÷ quantity, marked provisional. Output is AstQuarantine when an inspection applies,
      with GenerateTracking (P7);
    - `receive#SubcontractOutput`. In one transaction it issues the snapshot components from the vendor-custody
      facility, receives the output with the run's workEffortId and no transfer shipment, and calls
      `accept#ServiceItem`.
  - Purchasing: `ironstone.purchasing.ReceiptServices.accept#ServiceItem`, over
    `mantle.order.purchase.ServiceAcceptance`.
- **Screens:**
  - `Shared/MaterialIssueReceipt` gains the work-effort source: Source, Material lines, Tracking, Posted
    issues/receipts, Unused returns and Files;
  - SubcontractShipmentDetail's Output receipt pane.
- **Usable when** (design §19, subcontract output):
  - a run for DEMO_1_1 is created from Products P8's released version and released, with snapshot lines and its
    frozen standard; a later version leaves the released run's lines as they were;
  - two components are issued to a run in two operations as two issuances, and a retried issue answers the first;
  - one unused component returns as a new receipt at its cost;
  - output is received into quarantine with generated serials, at the snapshot's standard cost;
  - subcontract output is received from the vendor-custody facility: its components are issued and the service line is
    accepted once;
  - a quarantined component is refused.

### P17 — Reports

- **WH-REPORT:** `mantle.product.InventoryReportServices.get#InventoryAtDate`, beside the existing
  `get#InventoryProjectedInfo` (F23). It reads the AssetDetail ledger by effective date, with facility, location, lot
  and owner scope, and flags history that is incomplete.
- **Screens** (design §14):
  - Reports;
  - StockAtDate: `Shared/StockAtDate` (crosscut §3.26). Customer Service mounts it later;
  - OperationsHistory;
  - InventoryValuation: Accounting's `Shared/InventoryValuation`, with the Warehouse row of crosscut §3.25. It shows
    values with financial read, and revaluation stays in Accounting's context.
- **Exports:** stock at date, and quantities, movements, history and lineage, each with its screen's filters.
- **Home complete:** every card and MyWork source of design §3.
- **Usable when:**
  - stock at a past date for a lot shows its opening, receipts, issues, adjustments and closing, and flags history from
    before the demo's first movement as incomplete;
  - OperationsHistory never adds incompatible units;
  - a Warehouse user without financial read is refused InventoryValuation's values, and the quantity reports are
    complete.

### P18 — Finish

- The terminal twins, and the server-static pass.
- The design §19 acceptance review and crosscut §6 standalone operation. A Warehouse user with no other launcher, and an
  organization with no ProductStore, run receive to ship. That user is refused cost, settlement and other
  organizations' facilities, through URLs, shared contexts, handheld mounts, exports, the palette and search.
- The §16 outputs not built earlier.
- The inventories' **Implemented in** columns, the design's Impl column, and Remaining-Work.

## 4. Decisions

These are made before and during the build. Each one that changes the design is also written into
design-warehouse.md, or into the owner's design.

| Date | Decision | Notes |
| --- | --- | --- |
| Oct 28, 2026 | Warehouse is built after Accounting. It adds its context to Accounting's ShipmentDetail, ReturnDetail, EquipmentDetail and InventoryValuation, and uses Accounting's `receive#ReturnItems`, `release#ShipmentDraftInvoice`, `queue#MatchReevaluation`, posting guard and conditioned SECAs | The user's call. The alternative was Warehouse first, building those screens, with impl-accounting changed to extend them |
| Oct 28, 2026 | Phase order: the stock ledger first. That is the foundation, facilities and policy, and inventory with the posting guard; then receiving, inspection, putaway, counts, picking, packing, shipping, returns, transfers and requests, production stock and reports | The user's call. The alternatives were the outbound flow first, and the inbound flow first |
| Oct 28, 2026 | Warehouse builds the parts of other needs it depends on: crosscut CX-QUALITY with its two shared screens (P8); Manufacturing's production stock guards with the CX-PRODUCTION fields (P16); Purchasing's `accept#ServiceItem` (P16). These keep the owner's names, packages and Shared screens. Supply planning (CX-PLANNING) waits for its owner, so SupplyPlanning and RequirementSupply are §7 | The user's call, as Products and Accounting decided for theirs |
| Oct 28, 2026 | The shared screens Warehouse builds first carry the Warehouse context only. Another app's context is added when that app is built | Follows from the above, as in Products and Accounting |
| Oct 28, 2026 | Each task phase brings its handheld mount, on P5's `scan-input` and `density="handheld"` | The plan's choice: a handheld phase at the end would test each task twice |
| Oct 28, 2026 | Facility scope follows Moqui's organization filters. A user works in the facilities their organizations own (`Facility.ownerPartyId`): the active organization's when one is set, or else those of every organization they belong to (`filterOrgIds`, with direct child organizations). A user whose Warehouse authz has no organization filter works in every facility of every organization. Facilities owned by a third party that hold the organization's stock are §7 | The user's call. Vendor-custody facilities are organization-owned, so they are in scope (F2) |
| Oct 28, 2026 | Warehouse builds Purchasing's `close#PurchaseRemainders` (P7) and `find#ReturnableReceipts` with its receipt link (P14), as Purchasing's contracts. Purchasing is built later | The user's call, since both are small. Each is one service, over `cancel#OrderItem` or receipt and return reads |
| Oct 28, 2026 | The cycle-count schedule is flexible (P10): CountSchedule rows of WarehousePolicy by facility, location type, area or location, product category or ABC class, each periodic every N days, annual on a date, or zero confirmation. Last count dates are kept on FacilityLocation and ProductFacility; the next date is the earlier of the periodic and annual dates; the short-pick recount and Request a count are ad hoc dues. Accuracy- and movement-based frequencies, and computed ABC classes, are §7 | The user's call, from the common options. Odoo: a location's frequency in days with last and next dates, the company's annual count date, and Request a count with a date and assignee. OCA's stock_cycle_count for Odoo (not in the checkouts): periodic, zero-confirmation, accuracy and turnover rules. SAP and NetSuite: ABC classes with a frequency per class. ERPNext has no schedule; its counts are Stock Reconciliation entries. Carbon scopes counts by storage unit, item type, storage type and tags, with no schedule. Ever Gauzy has full, cycle, spot and recount modes |
| Oct 28, 2026 | Labels are PDF only in the first release; ZPL, with FacilityPrinter's format field, is §7 | The user's call. The design's §19 recommendation, without its ZPL option |
| Oct 28, 2026 | Warehouse also builds Manufacturing's production runs and their snapshots (P16a): `create#ProductionOrder`, `release#ProductionOrder` and the run, material and operation snapshot records of M4. The guards key the snapshot lines, and output takes the frozen standard cost. Manufacturing's screens, and the rest of M4 and of M2, stay Manufacturing's | The user's call, to the existing design. It removes the stand-in line keys that P16 would otherwise need |

## 5. Open questions

| Question | Decides | Notes |
| --- | --- | --- |
| `BOSS_WAREHOUSE` as the root user group beside the artifact group of that name | at P1 start | Products kept both (impl-products §4) |
| `scan-input`: a new form field element, or a mode of `text-line`; and its resolver contract (F24) | at P5 start | style-guide §8.1 checklist |
| `density="handheld"` against the shell's density preference: the screen's attribute wins on its screens (F24) | at P5 start | Manufacturing uses the same attribute |
| The expiry gate inside Mantle's reservation and issue, for an organization on BOSS's rules, or in the guards only (F12) | at P5 start | The adoption setting is Accounting's |
| Scrap's account: Accounting's P13 scrap account, if the variance poster reads it, or shrinkage (F5, F21) | at P6 start | P0 checks the poster |
| The ABC classes: their enumeration, and whether a class is per product or per product at a facility (`ProductFacility`, as P10 assumes) | at P10 start | Set by hand first; computed classes are §7 |
| Reopening a package whose invoice Mantle finalized at pack (F11) | before P12 | Accounting's answer to its F25 (impl-accounting §5, before its P17) |
| A test shipping gateway, since Mantle has none (F14) | at P13 start | It needs rates, labels, a timeout and a refund |

The design's other §19 items are `later` there and in §7.

## 6. Findings

Design assumptions found wrong or unstated in the code, with the resolution. Where a resolution changes the design, it
is written there too.

| # | Finding | Resolution |
| --- | --- | --- |
| F1 | P0: `screen/Warehouse/` has seven placeholders: Home, Inventory, Locations ("Locations & facility setup"), Receiving, Returns ("Returns receiving"), Settings and Shipping. There are no Inspection, Counts, Transfers, Picking, Handheld or Reports areas; the root mounts only Chatter and RecordFiles and has no `<shell-providers>`. The `BOSS_WAREHOUSE` authz is in BossSetupData's commented block. Products P1 seeds the `BOSS_WAREHOUSE_STOCK_PLANNER` and `BOSS_WAREHOUSE_MANAGER` groups | P1 |
| F2 | P0: `MANTLE_USER_ORG` filters Facility by `ownerPartyId`; `MANTLE_ACTIVE_ORG`'s Facility filter is commented out. Neither set filters Asset, AssetDetail or PhysicalInventory, and nothing filters by facility. Shipment (from or to party) and ReturnHeader (vendor or customer) are filtered in both. `filterOrgIds` is the active organization, or else every organization the user belongs to with direct child organizations | Stock rows through services (§2); facility scope through Mantle's Facility filter (§4, P1) |
| F3 | P0: Mantle REST posts `record#PhysicalInventoryQuantity`, `record#PhysicalInventoryChange`, `receive#Asset`, `issue#Asset`, `move#AssetReservation`, `receive#ShipmentProduct` and `receive#EntireShipment` with no BOSS guard | P1 grants the Warehouse groups no REST stock path; P0 checks the rest |
| F4 | P0: `record#PhysicalInventoryQuantity` given a count line writes the line's `quantityOnHand` and posts the delta at once; with no `physicalInventoryId` it creates one already PIComplete. PhysicalInventoryCount has no status, counter, reason or snapshot. Nothing in Mantle or Marble creates count lines. The four PI statuses have no transitions, and only PIComplete is used. Only AssetReservationMisc tests counts | P10's records and services; the immediate service stays for its callers |
| F5 | P0: `post#PhysicalInventoryVariance` (SECA `AssetDetailPhysicalVarianceGlPost`) posts once per asset per PhysicalInventory, and answers a message for a second delta, which never reaches the GL. It values the delta at the asset's acquireCost; a null cost is AtrNoAcquireCost and posts nothing. It picks the found or shrinkage account by the delta's sign. It never reads `varianceReasonEnumId`, and `VarianceReasonGlAccount` is unused | P10's per-asset sums (design CountReview); a scrap PhysicalInventory per operation (P6); scrap's account is a §5 question |
| F6 | P0: the variance reasons are InVrLost, InVrStolen, InVrFound, InVrDamaged, InVrIntegration, InVrSample, InVrMisShipOrdered and InVrMisShipShipped; there is no InVrScrap or InVrExpired | P6 seeds them |
| F7 | P0: AssetReceipt has `quantityAccepted`, `quantityRejected` and `rejectionReasonEnumId`. None of the CX-POSTING or CX-PRODUCTION fields exist on AssetReceipt, AssetIssuance or ShipmentItemSource | P5 (entered quantity), P6 (`sourceAssetIssuanceId`), P16 (the production lines) |
| F8 | P0: the location types are FltPick, FltBulk, FltReceiving, FltStaging, FltQuarantine and FltMorgue. There is no shipping-dock type; FcTpDock is a facility type. FacilityLocationType's per-facility `autoStatusId` is applied by `receive#Asset` and `move#Asset`. ZIRET_WH maps receiving to AstOnHold, quarantine to AstQuarantine and morgue to AstMorgue, and so a plain move of quarantined stock into a pick bin makes it AstAvailable | The held-stock rule (§2, P5); P2 adds the dock type; P1's demo adds the locations |
| F9 | P0: the EECA `AssetLocationFromContainer` copies a container's facility and location onto an asset whose `containerId` is set, so attaching an asset that is elsewhere moves it outside `move#Asset`. `ContainerAssetLocation` moves every asset of a container whose location changes | `attach#AssetToContainer` refuses an asset away from its container (P5); `move#Container` moves the contents through the guard. Written into design ContainerDetail |
| F10 | P0: `receive#EntireShipment` accepts each ShipmentItemDetail row's quantity less what was accepted and rejected, sets nothing short, then delivers the shipment. The view joins receipts and issuances on shipment and product, so a transfer's receipt totals may be multiplied (not yet tested) | P0 checks it with a spec; Finish never uses it for a short receipt (design). Written into design §15.2 if it holds |
| F11 | P0: `unpack#ShipmentItemIssuance` refuses an issuance whose source is on an invoice, and the pack SECA finalizes the invoice at pack (impl-accounting F25) | A §5 question; ReopenPackage follows Accounting's answer (P12) |
| F12 | P0: `reserve#AssetForOrderItem` reads the CustomerSingleLot and CustomerNewerInventory party settings and the last issued lot's expiry, and a store's reservation order can sort by end of life. Expired stock is never excluded | P5's gate, keeping Mantle's default (§2, §5) |
| F13 | P0: the 16 SECAs of design §15.2 exist under those names, all SECAs; the two emails run on commit. Not in the design: `AssetStatusNotAvailableReservations`, which checks reservations when an asset leaves AstAvailable, and the asset EECAs of F9. `ReturnApprovedProcess` runs `create#ReturnShipment` and then `process#ReturnItemResponses` | Written into design §15.2; P0 checks what quarantine does to a reservation before P8 |
| F14 | P0: `CarrierServices.get#ShipmentRates` is commented out. The active interfaces are `get#ShippingRatesBulk`, `get#ShippingRate`, the label request, refund and track services and `validate#ShippingPostalAddress`. The only implementation is `get#OrderShippingRateLocal` (NA_LOCAL, ShGtwyLocal). Neither Mantle nor the framework has a carrier integration, and CarrierServices.spec stubs the labels | P13's adapter and local-rules provider; a test gateway is a §5 question |
| F15 | P0: FacilityPrinter has only `facilityId`, `printerPurposeEnumId` and `networkPrinterId`. The purposes are PtpContainerLabel, PtpPackageLabel, PtpPickingDocuments, PtpPackingDocuments and PtpShipmentDocuments | P13 |
| F16 | P0: `print#Document` is a Rust service behind the moqui-host `print` feature, in the enterprise and maximal builds only; without it a call answers "not installed". NetworkPrinter exists, with Mantle's `assetId`. There is no ZPL. The framework draws Code 128 as SVG only, with no GS1 parse; Products P11 adds the rest | P13 over Products P11, PDF only (§4) |
| F17 | P0: `complete#ShipmentPack` takes getLabels and getReturnLabels (default false), a carrier and method, `networkPrinterId` and `makeDefaultPrinter` | CompletePack passes false for both (P12) |
| F18 | P0: `binLocationNumber` is on Shipment and on ShipmentItemSource, and the source's value wins | LoadShipments edits the right one (P11) |
| F19 | P0: ProductFacilityLocation's `minimumStock` and `moveQuantity`, and ProductFacility's `minimumStock` and `reorderQuantity`, are read by no service; Marble only edits them | `find#PickFaceReplenishment` is the first reader (P11); Products P7 is the one writer |
| F20 | P0: Lot has no `productId`, and is unique by manufacturer and lot number. FacilityLocation has `capacity` and `capacityUomId`, but no count schedule | Lots open Product360 from an asset (design); P10's count schedule (§4) |
| F21 | P0: `AssetTypeGlAccount.transferGlAccountId` exists; there is no scrap account in Mantle | Transfers need the account (P15, Accounting P19); Accounting P13 adds the scrap account |
| F22 | P0: none of AssetContent, ReturnContent, RequirementSupply, PlanningRun, PutawayRule, WarehousePolicy, ShipmentPickException, DeliveryStop, InspectionTemplate or QualityInspection exists. RequirementRequestItem and OrderItemWorkEffort do. FacilityParty is generic, and there is no Custodian role | Each record in its phase; RequirementSupply is §7 |
| F23 | P0: `get#InventoryProjectedInfo` is in `mantle.product.InventoryReportServices`, not AssetServices | `get#InventoryAtDate` joins it there (P17) |
| F24 | P0: the framework has no scan widget; drop-down search already recognizes a scanner's fast keystrokes ending in Enter or Tab. There is no screen density attribute: density is the shell's comfortable or compact user preference | P5's framework work; §5 questions |
| F25 | P0: the form-list views are board, calendar and tree; there is no pivot or graph | Pivot and graph views stay §7 |
| F26 | P0: `view-tree` keys a row by its first key field (impl-products F9) | Traceability's tree uses Products P3's occurrence keys (P4) |
| F27 | P0: Mantle's only demo warehouse is ZIRET_WH, owned by ORG_ZIZI_RETAIL, with pick and bulk locations and one receiving location | P1's demo adds the rest; P15's the vendor-custody facility |
| F28 | P0: the Mantle specs over stock: ShipmentReturnMisc, ShipmentPick, ShipmentLoads, CarrierServices, AssetReservationMisc, AssetReservationMultipleThreads, OrderToCashBasicFlow, OrderProcureToPayBasicFlow, ReturnToResponseBasicFlow, ManufacturingServices, InvoiceOrderApply, ContactAndFacilityServices and OrderToCashTime | They pass unchanged (§2) |
| F29 | P0: BOSS has `Shared/OrderDetail`, `InvoiceDetail` and `RequestDetail` (Projects) and `Product360` (Products). Products adds Supplier360 and InventoryAvailability, and Accounting ShipmentDetail, ReturnDetail, EquipmentDetail and InventoryValuation (impl-accounting F4). No plan builds FacilityDetail, MaterialIssueReceipt, QualityInspection, InspectionTemplates or StockAtDate | Warehouse builds them (§2) |
| F30 | P0: Delivery has no status and no driver; ShipmentRouteSegment links to it | WH-TRIP is §7 |
| F31 | P0: Accounting reads "open inspection" with a stand-in before CX-QUALITY exists (impl-accounting P0) | P8's `get#SourceInspectionStatus` replaces it |
| F32 | P0: ReturnItem has an order item but no AssetReceipt, asset or lot, so nothing says which receipt a supplier return sends back | P14 adds PUR-RETURN's receipt link with `find#ReturnableReceipts` |

## 7. Later

Designed, not in this build:

- **The design's `later` rows:**
  - TraceabilityGraph (WH-GRAPH);
  - DeliveryTrips and DeliveryTripDetail (WH-TRIP);
  - Capacity;
  - ExternalStockSync (WH-SYNC);
  - automatic waves (WH-WAVE).
- **Other design items:**
  - the Age column and age buckets on Availability;
  - pivot and graph views (WH-REPORT; F25);
  - CSV mass moves;
  - camera scanning;
  - ZPL labels, with FacilityPrinter's `labelFormatEnumId` and label-printer capability;
  - facilities owned by a third party that hold the organization's stock;
  - count schedules by accuracy or by movement, and ABC classes computed from value or movement;
  - the §19 items: a production pick mode with `AssetReservation.workEffortId`, held quantity as supply in planning,
    and owner-stock portals and storage fees.
- **Supply planning (CX-PLANNING, with WH-PLAN):**
  - PlanningRun, PlanningSuggestion and RequirementSupply, `run#SupplyPlan` and `store#PlanSchedule`;
  - the SupplyPlanning mount and its transfer conversion;
  - RequestDetail's buy and make requirements with their RequirementSupply links;
  - the suggestions on Product360's Replenishment tab.
- **Other apps' contexts:**
  - Customer Service: StockAtDate, QualityInspection and ReturnReceipt;
  - Manufacturing: FacilityDetail, MaterialIssueReceipt, QualityInspection and InspectionTemplates;
  - Purchasing: Inspections and QualityInspection.
- **Other apps' callers:**
  - Purchasing: PrepareReceipt (`ensure#PurchaseReceipt`) and `apply#PurchaseRevision` (`adjust#ExpectedReceipt`);
  - Customer Service: `authorize#Return`, `apply#OrderChange` (the substitute on a short pick, and the cancelled
    balance) and "Issue return label";
  - Manufacturing: the Components Stage action (Move) and ReceiveOutput's GenerateTracking.
- **The rest of the other apps' needs:**
  - Manufacturing:
    - the rest of M4: amendments (`amend#ProductionOrder`), `ProductionQuantityEvent`, instruction versions, and the
      lifecycle beyond release (`transition#ProductionOrder`, with its hold transition);
    - the cost events of the guards (`record#ProductionCostEvent`, M8);
    - `record#ProductionLoss`, `request#SubcontractService` and SubcontractDetail;
    - its WorkOrders, NewWorkOrder and WorkOrderDetail screens;
  - Purchasing: the service PO, ClosePurchaseOrders, NewSupplierReturn, `create#ReplacementOrder`, and the rest of
    PUR-RECEIPT and PUR-RETURN;
  - CX-QUALITY's later NCR, CAPA and gauges.

## 8. Verification

- **Per phase,** the "Done" rule of §2 and the phase's "usable when".
- **End to end,** run `./moq run`, sign in as `john.doe` and as each demo warehouse user, and walk each built phase's
  "usable when" in order.
- **Design §19's acceptance review and crosscut §6,** scenario by phase:

| Scenario | Phase |
| --- | --- |
| Purchase receipt, partial inspection, putaway | P7, P8, P9 |
| Short receipt closed or backordered before delivery | P7 |
| Reservation, shortage, recount | P11 (the short pick), P10 (the recount) |
| Pick and pack into several packages, label timeout and retry, ship | P11, P12, P13 |
| Reopen a package after pack | P12, on Accounting P17 |
| Customer and supplier returns, partly received and settled, one in two boxes | P14; settlement is Accounting's P17 |
| Subcontract dispatch and output receipt | P15, P16 |
| Repack | P6 |
| Transfer in transit | P15 |
| Blind count with a concurrent receipt or issue, and failed independent lines | P10 |
| Lot expiry change | P6 (the correction), P5 (the gate) |
| Invalid serial or unit | P7 |
| Mixed owners and pools | P3 (pools), P5 (moves) |
| Unauthorized financial fields | `WarehouseAccess` in every phase; P18 |
| Closed-period correction | P6 |
| Standalone Warehouse, with no ProductStore and no other app's grant | P18 (`WarehouseAccess` in every phase) |
| Crosscut sales order fulfillment | P11–P13; the substitute through Customer Service is §7 |
| Crosscut count with moving stock | P10 |

- **Screenshots** through the BOSS client spec of §2, light and dark, and the handheld mounts at phone width.
