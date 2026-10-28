# IronStone BOSS — Manufacturing implementation

Oct 28, 2026 — plan; P0 partly done (F1–F21, found while writing it); the phase order, supply planning, held quantity
and the shared party-role and effective-date rules decided (§4)

How [design-manufacturing.md](design-manufacturing.md) gets built, in phases from the foundation to the reports, each
ending tested and usable. This file is kept at a high level, as [impl-products.md](impl-products.md),
[impl-accounting.md](impl-accounting.md) and [impl-warehouse.md](impl-warehouse.md) are: each phase names its scope by
the design's sections and §12 needs rather than restating them, and the design stays the place for screen and record
detail. During the build this file is the log: phase status and what each built, the decisions made, open questions,
findings against the code, and what is deferred.

Today `screen/Manufacturing/` holds six placeholders, and the root mounts only Chatter and RecordFiles. The
`BOSS_MANUFACTURING` authz is in BossSetupData's commented not-yet-implemented block (F1). None of the design's proposed
services, entities, fields or status items exist in Mantle or BOSS beyond what Products, Accounting and Warehouse build
first. Manufacturing is built after all three and before Purchasing (§4), so these are there to extend:
- from Products: the four Manufacturing groups its P1 seeds; `check#ProductUsable` and the kit components (P2);
  Product360, Supplier360 and InventoryAvailability; the versioned methods of M3, `WorkCenter`, `WorkCenterRate`,
  `get#OperationCostBasis` and the five shared method screens with the Products context (P8); approved standard costs
  and CostRollup (P9); the barcodes, GS1 parse and labels (P11);
- from Accounting: the AC-06 guard in `post#AcctgTrans` and `repost#AssetIssuance`'s dated reversing delta (P2a); the
  CX-POSTING operation record (P2); EquipmentDetail and ShipmentDetail; InventoryValuation; the production GL account
  types and the scrap account (P13); Setup's WIP account check (P19);
- from Warehouse: facility scope and `AccessServices` (P1); FacilityDetail (P2); the posting guard, `scan-input`,
  `density="handheld"` and Move with a run context (P5); `scrap#Asset` and `AssetReceipt.sourceAssetIssuanceId` (P6);
  `generate#TrackingIdentities` (P7); crosscut CX-QUALITY with QualityInspection and InspectionTemplates (P8); the
  vendor-custody facility and SubcontractShipmentDetail (P15); and Manufacturing's own contracts it builds (P16): the
  runs and their snapshots (`create#ProductionOrder`, `release#ProductionOrder`), the stock guards
  (`issue#ProductionMaterial`, `return#UnusedMaterial`, `receive#ProductionOutput`, `receive#SubcontractOutput`) and
  `Shared/MaterialIssueReceipt`'s work-effort source;
- from Projects: the timers, timesheets and their approval, the WorkItems Timeline, RequestDetail, WorkItemDetail and
  OrderDetail.

**Inputs.**
- Designs:
  - [design-manufacturing.md](design-manufacturing.md)
  - [design-crosscut.md](design-crosscut.md) §1.3 (the automation register), §1.4, §3.3, §3.5–§3.15, §3.17, §3.19,
    §3.20, §3.23, §3.24, §4.1–§4.3, §6 and §7.1
  - [design-products.md](design-products.md): PRD-COST, the kit components and `check#ProductUsable`
  - [design-warehouse.md](design-warehouse.md): MaterialIssueReceipt, SubcontractShipmentDetail, WH-POST and
    WH-HANDHELD
  - [design-accounting.md](design-accounting.md): ProductionCostClose, CostingPolicies, AC-06 and AC-07
  - [design-purchasing.md](design-purchasing.md): SupplyPlanning, and PUR-RECEIPT's `accept#ServiceItem`
  - [design-projects.md](design-projects.md): §5 Timeline, and time and timesheets
- Plans:
  - [impl-products.md](impl-products.md): the pattern; P8, which builds the methods, the five shared method screens
    and the costing part of the work centers; P9's standard costs; the groups its P1 seeds; the BOSS client screenshot
    spec (its F23).
  - [impl-accounting.md](impl-accounting.md): the posting guard and the dated issuance reversal (P2a), the production
    GL account types (P13), and its decision that ProductionCostClose and CostingPolicies are built with Manufacturing.
  - [impl-warehouse.md](impl-warehouse.md): P16, which builds the runs, their snapshots and the stock guards; P5's scan
    input and handheld density; P8's shared quality model; P15's subcontract dispatch.
  - [impl-projects.md](impl-projects.md): the time, timesheet, Timeline, RequestDetail, WorkItemDetail and OrderDetail
    it built.
- The design review: [review-core-apps.md](review-core-apps.md) (D1–D28, and the §4.1 plan, make, stock and cost
  steps), [review-core-apps/manufacturing.md](review-core-apps/manufacturing.md) and
  [review-core-apps/seam-make.md](review-core-apps/seam-make.md), which explain the design's D-, R-MFG- and R-SA- IDs.
- Guides and rules: [design-doc-guide.md](design-doc-guide.md), [style-guide.md](style-guide.md) §8 (the §8.1 element
  checklist and the §8.2 handheld density), and [impl-drawers-commons.md](impl-drawers-commons.md) §4 (the shared rules).
- Inventories: [ss-inventory.md](ss-inventory.md) (its Manufacturing section, 23 forms) and
  [usl-inventory.md](usl-inventory.md).
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

  `runtime/component/mr-marble` is read only, for the baseline `SimpleScreens/Manufacturing/Run` screens and the
  Catalog association forms that design §10.2 maps.
- **Scope.**
  - Every `parity` and `new` row of design §2, and the §12 needs they use: M1–M8, M10 and M11. M9 (batches) is
    `later`.
  - The parts of other apps' needs that Manufacturing depends on (§4):
    - Accounting's ProductionCostClose and CostingPolicies: `ironstone.accounting.ProductionCostServices`,
      `ProductionAllocationPolicy`, and the ProductionCostReview notice (impl-accounting §4);
    - Projects' side of the labor cost: the production approver rule in `get#TimesheetApprovers`, and the hook on
      `approve#Timesheet` that calls `record#ProductionCostEvent`;
    - crosscut CX-PLANNING (§4): PlanningRun, PlanningSuggestion and RequirementSupply,
      `mantle.product.SupplyPlanningServices` with the make conversion and the buy conversion of an outside-processing
      requirement, and `Shared/SupplyPlanning`. Purchasing's and Warehouse's mounts, and their other buy and transfer
      conversions, stay theirs.
  - The shared screens no app has built: `Shared/ProductionCostClose`, with the Accounting and Manufacturing contexts,
    and `Shared/SupplyPlanning` with the Manufacturing context.
  - Manufacturing's context on shared screens other apps built:
    - Products' Product360, Supplier360 and InventoryAvailability, and the five method screens (BillOfMaterialsDetail,
      BillOfMaterialsExplosion, BillOfMaterialsCompare, WhereUsed and RoutingDetail);
    - Warehouse's FacilityDetail, MaterialIssueReceipt, QualityInspection and InspectionTemplates;
    - Accounting's EquipmentDetail and ShipmentDetail;
    - Projects' OrderDetail, RequestDetail and WorkItemDetail;
    - Commons' Calendar, Approvals, Chatter and RecordFiles.
  - §7 holds the `later` rows and needs, and the rest of the other apps' needs.
- **Order** (decided Oct 28, 2026), the method and the run first, then what happens to a run, then what plans and
  closes it:
  1. the foundation;
  2. methods, then work centers and equipment, then the production policy and reasons;
  3. work orders: the runs and their lifecycle, then their materials and stock;
  4. cost evidence, so every later fact writes its cost event as it is built;
  5. quantities, by-products and loss, then quality;
  6. controlled changes: substitutes, amendments, splits and disassembly;
  7. the shop floor and time, then downtime;
  8. scheduling and capacity;
  9. supply planning, then subcontracting;
  10. the cost close;
  11. reports;
  12. the finish.

  The operator phases (P5, P7, P10, P11) bring their handheld mounts, on Warehouse P5's `scan-input` and
  `density="handheld"`.

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

  Screenshots come from the BOSS `test/client` spec that Products adds (impl-products §2).
- **Production rows through services.** No entity filter covers WorkEffort, so nothing scopes a run, operation or
  routing by organization (F3). Manufacturing reads and writes them only through services:
  `ironstone.manufacturing.AccessServices` checks the user's organizations, the plant facility (through Warehouse's
  facility scope), the run's owner and the capability, then the `mantle.work.ProductionServices`, `BomServices` or
  `RoutingServices` verb runs.
  - `entity` in a design form summary means that guarded path, never a bare entity form (design §1.1).
  - Grants are checked in the services, so they hold for exports, search, the palette, the shop floor, handheld mounts
    and shared mounts. `appRoot=Manufacturing`, an assignment or a hidden column is never authorization (design §1.1).
  - A stock action also needs Warehouse's stock capability for the facility; an operator's assignment grants none.
- **One guarded path for each production fact.**
  - Stock moves only through the guards Warehouse P16 built and WH-POST. BOSS never calls
    `set#ProducedProductQuantity`, `create#ProductionRun` with a produce or consume product, `cancel#AssetIssuance` on a
    posted production issuance, or a generic WorkEffort status update (design §13, D13; F8, F9).
  - Every lifecycle change is `transition#ProductionOrder`, from the Lifecycle dialog, the board, a bulk action, the
    shop floor and the cost close alike.
  - Each mutation takes the expected revision and an operation key on Accounting's CX-POSTING record, and a retry
    answers the first result (design §1.1, M2).
  - Released work is immutable. A method, policy or estimate change reaches a released run only through
    `amend#ProductionOrder`, as a successor snapshot (M4).
- **One cost event writer.** `record#ProductionCostEvent` writes every cost fact inside the posting transaction that
  causes it, keyed by source, component and revision. Issues and receipts post through the existing hooks once; labor,
  machine, overhead and outside processing reach the GL only through `post#CostClose` (D12, §12.2).
- **Restricted values stay on the server.** A service leaves out any cost, rate, value, supplier price or person's
  rate the user may not read. Money columns need Accounting's `BOSS_ACCOUNTING_READ`; frozen estimates need
  `BOSS_MANUFACTURING_COST`. Nothing is fetched and then hidden, and a value withheld is omitted, never zero (design
  §1.1).
- **Shared screens.** Manufacturing builds `Shared/ProductionCostClose` with the Accounting and Manufacturing contexts,
  and `Shared/SupplyPlanning` with the Manufacturing context. It adds its context to the shared screens
  of §1. Each takes `appRoot` and server-derived capabilities, on `Shared/RequestDetail`'s pattern.
- **Owner contracts.** A contract built here for another app follows that app's design: its package, its record and
  service names, its Shared screen and its capability groups. A change found while building it is written into the
  owner's design. The owner's own screens stay with the owner.
- **Mantle rule changes keep Mantle's default.** A change to an existing Mantle service, such as the production approver
  rule in `get#TimesheetApprovers`, applies to an organization that has adopted BOSS's rules, through the setting
  Accounting decides (impl-accounting §5). Each ships with a test of its condition and of its unchanged default.
- **Mantle callers stay compatible.** Existing callers of these keep working:
  - `mantle.work.ManufacturingServices`, unchanged (R-MFG-35): `create#ProductionRun`, `get#ProductBomDetail` for kits
    and migration comparison, `breakDown#Assembly` and the display and pick queries;
  - `produce#AvailableAssemblies` and the kit components;
  - the Projects timers and the timesheet approval flow.

  Mantle's ManufacturingServices spec passes unchanged (F20), and so do the specs of Products P8, Warehouse P16 and
  Projects' time.
- **Done for a phase** means all of these:
  - impl-projects §2 "Done":
    - cargo tests for the touched crates, with goldens reviewed;
    - the new Mantle specs passing under `./moq test mr-mantle`;
    - `./moq test mr-boss` passing, with AppStructure covering the new screens and Manufacturing in its
      non-placeholder list;
    - `moqui lint --screens` clean for BOSS with the Debug binary;
    - screenshots light and dark at 390, 1280 and 1440 px, and the handheld mounts at 390;
    - the inventories' **Implemented in** columns;
  - the `ManufacturingAccess` spec extended to the phase's services and mounts;
  - the phase's walk in §8;
  - its row and **Built** note here.

## 3. Phases

| Phase | Repos | Screens | Status |
| --- | --- | --- | --- |
| P0 Checks | all (read) | — | partly done Oct 28 (§6 F1–F21) |
| P1 Foundation | Mantle, BOSS | the Manufacturing root and menu, Home | — |
| P2 Methods | Mantle, BOSS | BillsOfMaterials, the five method screens, Routings, OperationTemplates, Product360, Approvals | — |
| P3 Work centers and equipment | Mantle, BOSS | WorkCenters, FacilityDetail, Equipment, EquipmentDetail, ResourceCalendar | — |
| P4 Policy and reasons | Mantle, BOSS | ProductionSettings, ReasonCodes | — |
| P5 Work orders | Mantle, BOSS | WorkOrders, NewWorkOrder, WorkOrderDetail, Overview, Operations, Components, MaterialIssueReceipt, InventoryAvailability | — |
| P6 Cost evidence | Mantle, BOSS | ProductionCosts | — |
| P7 Quantities, by-products and loss | Mantle, BOSS | Quantities, ByProducts, ScrapLoss | — |
| P8 Quality | Mantle, BOSS | QualityGates, Inspections, QualityInspection, InspectionTemplates | — |
| P9 Controlled changes | Mantle, BOSS | Components' Substitute, SplitWorkOrder, Disassembly, BillOfMaterialsCompare's amendment | — |
| P10 Shop floor and time | Mantle, BOSS | ShopFloor, OperationExecution, Instructions, ProductionTime | — |
| P11 Downtime and maintenance | Mantle, BOSS | Downtime, EquipmentDetail's request, RequestDetail, WorkItemDetail | — |
| P12 Scheduling and capacity | Mantle, BOSS | ProductionSchedule, Capacity, Operations' Reschedule | — |
| P13 Supply planning | Mantle, BOSS | SupplyPlanning | — |
| P14 Subcontracting | Mantle, BOSS | SubcontractOperations, SubcontractDetail, Supplier360, OrderDetail, ShipmentDetail | — |
| P15 Cost close | Mantle, BOSS | ProductionCostClose (both mounts), CostingPolicies | — |
| P16 Reports | Mantle, BOSS | Reports and its eight reports, Home's Kpis | — |
| P17 Finish | BOSS | — | — |

### P0 — Checks

Verify the design's riskiest assumptions against the code before building. Each result is a row in §6 and, where it
changes the design, an edit there. F1–F21 were found on Oct 28 while writing this plan. Still to check:

- **The other apps' state.** Which of Products P8, P9 and P11, Accounting P2, P12, P13 and P19, and Warehouse P2, P5–P8,
  P15 and P16 are built when the phases that use them start, and what each left in its §7 for Manufacturing.
- **Warehouse P16's runs.** Where `create#ProductionOrder` keeps a draft's material and output lines before release
  (WorkEffortProduct only, or a draft snapshot); what `release#ProductionOrder` stores as the policy version before P4's
  ProductionPolicy exists; and how P16b's guards key the operation identity.
- **P16b's issue guard** (F12): whether it refuses an asset that is not AstAvailable, and an issue beyond quantity on
  hand at a facility that allows one (ZIRET_WH does), so a shortfall is an exception and never untracked negative
  stock (design Components).
- **Disassembly's two reposts** (F15): whether Accounting P2a's `repost#AssetIssuance` delta makes the issuance cancels
  of `breakDown#Assembly` safe, and what its `update#AssetAndReceipt` → `repost#Asset` does to the kit receipt's posted
  transaction in an open and a closed period (design Disassembly; §5).
- **The timesheet hook point.** How `approve#Timesheet`, its return and reopen, and a rate change can call
  `record#ProductionCostEvent` without changing Projects' behavior; when `TimeEntry.vendorHourRate` is set; and whether
  the production approver rule is only the run as the operations' root with the supervisor in a Manager role (F17).
- **Other paths to a run's status.** Which BOSS groups reach `update#WorkEffort`, `add#WorkEffortProduct` or the
  Mantle REST paths for a WepProductionRun, for example through Projects' work-item services (F9, F10).
- **Commons approvals and Today.** The notification-topic approval contract (impl-accounting F43) for the production
  topics, and the Today provider for assigned operations.

### P1 — Foundation

- **Access** (design §1.1, crosscut §1.4 and CX-ACCESS).
  - The groups of design §1.1. `BOSS_MANUFACTURING_READ`, `_METHOD`, `_METHOD_APPROVE` and `_ADMIN` exist from
    Products P1; their descriptions become the design's (F2). The new ones are `_PLAN`, `_SCHEDULE`, `_OPERATE`,
    `_SUPERVISE`, `_QUALITY_INSPECT`, `_QUALITY_VERIFY`, `_QUALITY_ADMIN`, `_COST` and `_DISPLAY`, with
    `BOSS_MANUFACTURING` as the root user group (§5).
  - The root's authz comes out of BossSetupData's commented block (F1), with `MANTLE_ACTIVE_ORG` and Warehouse's
    facility filter set (impl-warehouse P1).
  - `ironstone.manufacturing.AccessServices`: the user's organizations, the plants they may work in, their capabilities,
    and a run's or method's owner and facility. Every later Manufacturing service and shared mount calls it. A supplied
    run, operation, method, work center or asset is checked against it (F3).
  - No artifact authorization for the raw ManufacturingServices verbs or their REST paths, nor for `update#WorkEffort`
    on a run (F9, F10).
- **The Manufacturing root.**
  - The menu of design §1.2: the six placeholders renamed, and Routings, WorkCenters, Quality, Subcontracting,
    Approvals and Reports added (F1). Batches is `later` and left out. Each area shows for its groups only.
  - The plant selector, kept as a user preference that never widens authorization.
  - `<shell-providers>` (M1, CX-SHELL): the palette types (runs, product and method IDs, scoped equipment), quick
    create, the Today sources and the notification topics grow phase by phase, as their records are built.
  - The `manufacturing` key scope.
  - `get#RecordLinkInfo` opens runs, BOM versions, routings and work centers under Manufacturing for its users.
- **Home** (design §3): Summary and Queue, with the counts of later phases null; Kpis comes with P16.
- **Manufacturing demo data.**
  - `BossManufacturingDemoData.xml` builds on Products P8's released methods for DEMO_1_1, Warehouse P16's demo runs,
    ZIRET_WH and the EQUIP_AB4 assembly robots (F19). It adds two line work centers (FcTpLine) whose parent is
    ZIRET_WH, so a run on a line nets against the warehouse (F16); skill types, operators' PartySkill rows and the
    operation templates' skill standards (F18); and a second organization's plant for isolation, as the phases need
    them. Each demo run has the organization as its owner (F14).
  - `BossUsersDemoData.xml` gains a user per capability, a production reader with no other launcher, and a plant
    display user.
- **Specs.**
  - `ManufacturingShell`: the menu per group, the palette, record links, quick create.
  - `ManufacturingAccess`: started, covering organization and plant scope and the groups through the services.
- **Usable when:** the menu renders for each group, and quick create offers only what the group may create. A reader
  sees their organization's runs and methods but not another organization's, in lists, the palette and record links. A
  forged run, facility or asset ID is refused.

### P2 — Methods

The rest of M3 and CX-METHOD (design §5, crosscut §3.23), over Products P8's records and services.

- **`mantle.work.RoutingServices`, the rest:** `find#Routings`, `find#OperationTemplates`, `store#OperationTemplate` (a
  WepRoutingTask with its standards, center requirement and quality template), and `store#InstructionVersion` over
  `ProductionInstructionVersion`: the step content reference and checksum, the required evidence and the quality
  template version, immutable once published (M4). Copy operations from another version makes draft copies with
  their source identity.
- **Screens:**
  - BillsOfMaterials: Find, the list over `find#Boms` with kits left out (D15), and NewBillOfMaterials. Clone revision,
    and the legacy import Products P8 built.
  - The Manufacturing context on the five shared method screens: BillOfMaterialsDetail with its Header, Components,
    Operations (the RoutingDetail mount), By-products, Instructions, Cost estimate (Products' CostRollup for this
    version), Where used, Revision history and Notes tabs, and ValidateRelease; BillOfMaterialsExplosion;
    BillOfMaterialsCompare (its amendment action is P9); WhereUsed, with kit usage read only; RoutingDetail.
  - Routings: Find, the list, NewRouting.
  - OperationTemplates: Templates, EditTemplate and InstructionVersion. Archive blocks new use only.
  - Product360: Products' `Shared/Product360` with the Manufacturing row of crosscut §3.5. The BOM tab mounts the method
    screens; cost estimates show only with cost read (R-MFG-37).
  - Approvals: the Commons Notifications mount at `Manufacturing/Approvals` (crosscut §3.15), filtered as Accounting P6
    decides (impl-accounting F43), with method release as its first topic when the organization separates drafting
    from release. Later phases add their topics.
- **Chatter and files** on the BOM version (ProductBomVersionContent, from Products P8), the routing and the operation
  template (WorkEffortContent), registered in `get#RecordLinkInfo`.
- **Outputs** (design §11): the BOM and routing print, the explosion and compare as print and CSV, and the BOM and
  routing CSV import with its preview. Each version imports atomically, a bad one is named and skipped, kit rows are
  left out, and release stays explicit.
- **Palette:** BOMs and routings.
- **Usable when:**
  - a method engineer builds a routing from two operation templates, one with a published instruction version, and a
    BOM version for DEMO_1_1 whose component is consumed at the second operation;
  - validation names a cycle and an overlapping effective window; the engineer cannot release, and the approver
    releases;
  - a released version cannot be edited, and Clone revision makes a draft;
  - WhereUsed shows the component's parents, and DEMO_PA's kit read only with its link to the Kit components pane;
  - an import of two versions with one bad unit applies the good one and names the other.

### P3 — Work centers and equipment

The rest of M5 and CX-WORKCENTER (design §6), over Products P8's `WorkCenter` and `WorkCenterRate`.

- **Records:** `WorkCenterCapacity` (by product or type, quantity and unit per duration, or parallel slots, dated) and
  `WorkCenterAlternate`, with the WorkCenter fields P8 left out: plant, calendar, efficiency, OEE target and scheduling
  policy. Facility.capacity stays people capacity.
- **Services:** `store#WorkCenter` extended; `mantle.work.ProductionPlanningServices.get#WorkCenterLoad`, first from
  capacity and released operations only; P12 adds the calendar, downtime and the schedule.
- **Screens** (design §6):
  - WorkCenters: Find, Centers and NewCenter, on an existing facility or a new FcTpLine;
  - FacilityDetail: Warehouse's `Shared/FacilityDetail` with the Manufacturing context: the WorkCenter extension,
    calendar, equipment, capacities, efficiency, the rate with cost read only, alternates, and Chatter and files;
  - Equipment: Find and the list over Asset and WorkEffortAssetAssign;
  - EquipmentDetail: Accounting's `Shared/EquipmentDetail` with the Manufacturing row of crosscut §3.10: assignments,
    qualifications, maintenance history and documents, and safe-use instructions for a read-only operator. Its
    downtime and request maintenance come with P11;
  - ResourceCalendar: Commons Calendar with the plant and work-center resources, read only.
- **Usable when:**
  - a resource administrator makes a facility a line work center with two parallel slots, a capacity per hour for
    DEMO_1_1 and a dated rate, and a rate needs cost authority;
  - the facility's people capacity is unchanged;
  - an operator reads the center without its rate, and the calendar shows its work hours and holidays.

### P4 — Policy and reasons

- **Records:** `mantle.work.production.ProductionPolicy`, effective-dated rows with their key fields audit-logged
  (impl-drawers-commons §4), with an organization default
  and an explicit plant override (design ProductionSettings): consumption (manual or backflush, issue point,
  over-consumption and overproduction tolerances, substitute approval, quality defaults), time and cost (time-log
  enforcement, machine runtime, work type, piece rate, estimate refresh), and planning (horizon, time fence, shortage
  release policy, calendar, lead-time basis, freshness limit). The production reason codes (design ReasonCodes), with
  category, equipment fault, planned stop and approval threshold, effective-dated. A run keeps the policy row it was
  released under.
- **Services:** `store#ProductionPolicy`, `get#ProductionPolicy` with the source of each value, and
  `store#ProductionReasons`.
- **Screens:** ProductionSettings (Consumption, TimeAndCost with a read-only link to CostingPolicies, Planning) and
  ReasonCodes. The shortage release policy defaults to all components usable, with staged release by supervisor
  approval (design §13).
- **Usable when:**
  - an administrator sets an organization default and a plant override of the overproduction tolerance, and the
    resolved policy names each value's source;
  - a referenced reason can be deactivated, not deleted;
  - a policy change reaches no released run (checked in P5).

### P5 — Work orders

Design §3 WorkOrders, NewWorkOrder, WorkOrderDetail, Overview, Operations, Components and MaterialIssueReceipt, and the
parts of M1, M2 and M4 Warehouse P16 left. Built in two parts: P5a the runs and their lifecycle, then P5b their
materials and stock.

- **P5a, the runs.**
  - `mantle.work.ProductionServices`:
    - `find#ProductionOrders`, `store#ProductionOrder` (the draft header) and `store#ProductionEquipment`;
    - people through the existing `add#` and `remove#WorkEffortParty`, behind a guarded assignment;
    - `transition#ProductionOrder`: release through P16a's `release#ProductionOrder`, which now freezes the P4 policy
      version; unrelease while no fact exists; start; hold and resume; cancel of an unposted draft. Complete needs P7's
      reconciliation and close is P15's. Each guard checks its design state, refuses the generic `WeInPlanning` →
      `WeComplete` and `WeClosed` transitions, and needs its own capability (R-MFG-11);
    - the release gate: a valid method, `check#ProductUsable`, a superseded version found with a re-explosion offered,
      and the shortage policy, with staged release by supervisor approval (design §13);
    - `batch#ProductionAction`, a result per run;
    - `get#ProductionOperations`, with readiness and its reason.
  - The seeded `WeApproved` → `WeOnHold` transition, and `WeOnHold` → `WeApproved` so a hold before start resumes as
    released rather than started (F9). The framework accepts every flow's transitions on any WorkEffort, so the guard
    is the only path.
  - **Screens:**
    - WorkOrders: Find, the list, Selection, `view-board` by status or facility whose move calls
      `transition#ProductionOrder`, `view-calendar` over the estimated dates, and the saved finds Ready, Late, Blocked,
      Mine and By product;
    - NewWorkOrder: Identity, Method and Review, with the producible-now column over `get#BomExplosion` and
      `get#AvailableInventory` (R-MFG-30);
    - WorkOrderDetail: Header, the Lifecycle dialog with its impact preview, Overview, Operations (no Reschedule until
      P12) and Notes and files;
    - Product360's Open runs link.
  - **Outputs:** the production traveler and pick sheet (design §11), with the snapshot revision, operation sequence,
    material and lot needs and a QR identity from Products P11; the release notice.
  - **Shell:** the run palette type; quick create draft work order.
- **P5b, materials and stock.**
  - `get#ProductionMaterials`, and `store#ProductionMaterial` for manual draft lines under the planner's authority.
  - Components: the list and AddMaterial. Stage opens Warehouse's Move with the run fixed; there is no WIP location
    (R-MFG-03). Substitute is P9.
  - MaterialIssueReceipt: Warehouse's `Shared/MaterialIssueReceipt` with the Manufacturing row of crosscut §3.9, over
    P16b's guards: issue, return unused, receive output and preview backflush. Backflush follows the policy and issues
    exact snapshot quantities from chosen lots, or none. A held asset or a shortfall is refused, even at a facility
    that allows issue beyond quantity on hand (F12).
  - InventoryAvailability: Products' `Shared/InventoryAvailability` with the Manufacturing row of crosscut §3.7, at
    `Manufacturing/Planning/InventoryAvailability`; held quantity by status, apart (R-MFG-24).
  - The shortage notice and Home's shortage queue.
- **Usable when** (design §10.3, cancellation and retry):
  - a planner creates a draft run for DEMO_1_1 from the released version and releases it, and the snapshot keeps its
    policy version after P4's policy changes;
  - a second run with a short component is refused release until a supervisor approves a staged release, and the
    short line's issue stays blocked;
  - a board move to Released runs the same guard, and a bulk release of three runs names the blocked one;
  - a released run is held before start and resumes as released; an unrelease after an issue is refused; an unposted
    draft is cancelled;
  - two components are issued at two operations through the Manufacturing mount, an operator without the facility's
    stock capability is refused, and a backflush preview shows its lots and issues once.

### P6 — Cost evidence

M8's evidence, before the phases whose facts write it (design §3 ProductionCosts; crosscut §4.1 CX-COST; review §4.1
steps 19 and 20).

- **Records:** `mantle.work.production.ProductionCostEvent` (unique by source, component and revision) and
  `ProductionCostAllocation`; the cost-review status on the run snapshot.
- **`mantle.work.ProductionServices`:**
  - `record#ProductionCostEvent`, internal, called inside the transaction that causes the fact. Here its callers are
    P16b's issue, return-unused and output guards, and the material part of `receive#SubcontractOutput`. Each material
    event references the hook's transaction and posts nothing again. An output or return receipt without
    `acquireCost` would post nothing (F13), so the guard refuses it. Later phases add loss (P7), labor and machine
    (P10), and outside processing (P14);
  - `get#ProductionCosts` and `review#ProductionCosts`, which sets the review status and notifies Accounting. The queue
    that reads it is P15's.
- **Screens:** ProductionCosts: Costs and CloseReview. The frozen estimate shows with `BOSS_MANUFACTURING_COST`, actual
  values and ledger links with `BOSS_ACCOUNTING_READ`.
- **Usable when:**
  - two issues, a return of one unused component and an output receipt each write one event linked to the hook's
    transaction, and a retried issue writes none;
  - a cost estimator sees the frozen estimate and no actuals, and a financial reader sees both;
  - a review request notifies Accounting with the run and source revision.

### P7 — Quantities, by-products and loss

Design §3 Quantities and ByProducts, §6 ScrapLoss and §12.2; M2, M4, M6 and M8.

- **Records:** `ProductionQuantityEvent` and `mantle.work.production.ProductionLoss`.
- **`mantle.work.ProductionServices`:**
  - `get#ProductionQuantities` and `store#ProductionOutput` (draft outputs and by-products);
  - `record#ProductionQuantity`: good, pending, process loss, scrap and rework, in one orchestration with the output
    receipt when they are coupled;
  - `change#ProductionQuantity`: a target delta that rewrites the WeptConsume and WeptProduce rows and cannot go below
    the facts;
  - `record#ProductionLoss` by its three paths (R-MFG-20): issued components (a scrap cost event, no stock), received or
    held output of an open run (the asset issued back to the run), and process loss (a quantity only). Free stock is
    scrapped in Warehouse;
  - `find#ProductionLosses`;
  - complete in `transition#ProductionOrder`: the reconciliation of §12.2, the settled operations and material
    disposition. Partial completion offers Finish remainder with approved loss; Backorder is P9's.
- **Screens:** Quantities (OutputPlan, AddOutput, Reconcile, ChangeQuantity), ByProducts (with AllocationReview's
  estimate; its actual allocation is P15's), and ScrapLoss (Find, Losses, RecordLoss).
- **Approvals:** exceptional loss and overproduction above the policy.
- **Outputs:** finished, secondary and WIP labels on Products P11's label contract; no label claims acceptance before
  disposition.
- **Usable when** (design §10.3, partial production):
  - a run for 10 receives 6 good, records 1 process loss and the scrap of an issued component (a cost event and no stock
    movement), and shows 3 remaining;
  - scrapping a received output asset of the open run issues it back to the run, not to shrinkage;
  - a target cut below the good quantity is refused, and a cut to 9 writes a delta;
  - overproduction above the tolerance waits for a supervisor;
  - a by-product is received as its own stock;
  - complete is refused until the quantities reconcile, then succeeds; a retry posts nothing twice.

### P8 — Quality

Design §3 QualityGates and §6 Inspections, QualityInspection and InspectionTemplates; M6's inspection part, over
Warehouse P8's CX-QUALITY.

- **Gates:** `get#SourceInspectionStatus` answers for the run, operation and output-line sources; the start and
  complete guards and dependent operations read it. Each released operation keeps its template version.
- **Templates:** in-process and final applicability, the sampling basis, and the method or operation they attach to.
- **Held output:** P16b receives it AstQuarantine and creates the inspection in the same operation.
  `dispose#Inspection` releases it, reserving it first to a pegged order item (R-SA-10); a scrap disposition of an open
  run's output takes P7's loss path.
- **Screens:** QualityGates; Inspections in the production context; QualityInspection and InspectionTemplates
  (Warehouse's shared screens) with the Manufacturing context, the operator mode with sequential controls and the scan
  field.
- **Outputs:** the quality checklist and the quality certificate; the quality-block notice.
- **Usable when** (design §10.3, quality hold):
  - output of a run whose final template applies is received held, and complete is refused while it is pending;
  - an inspector records and submits, cannot verify, and a verifier verifies;
  - a disposition releases five units and scraps one through the loss path; held quantity never counts as good;
  - an in-process failure blocks the dependent operation's start, naming the inspection;
  - a template revision leaves the released run's gate as it was.

### P9 — Controlled changes

Design §3 Components' Substitute, SplitWorkOrder, Disassembly and WorkOrderDetail's cancellation and clone, §5
BillOfMaterialsCompare's amendment action; M4.

- **`mantle.work.ProductionServices`:**
  - `substitute#ProductionMaterial`: a candidate from the BOM item's substitution rule (Products' PatEquivalent rows
    only when the rule allows), with supervisor approval. It adds a WeptConsume row and reduces the original's; after
    release it is an amendment;
  - `amend#ProductionOrder` (design §12.1): a successor snapshot that remaps only unexecuted work and keeps the original
    facts' links, under the amendment policy (§5);
  - `preview#ProductionSplit` and `split#ProductionOrder`, split and backorder, conserving remaining demand;
  - cancellation after postings as a reviewed reversal or residual plan; clone through `create#ProductionOrder`;
  - `reverse#SupportedAssembly` over `breakDown#Assembly`, for a PtPickAssembly kit only, once P0 confirms both reposts
    are safe (F15, §5). `breakDown#Assembly` unissues by the kit's current PatMfgBom quantities, so the guard checks
    them against the quantities actually issued and refuses a difference.
- **Screens:** Components' Substitute; SplitWorkOrder (Allocation, Disposition, Confirm); Disassembly (Assembly,
  Preview, Confirm); BillOfMaterialsCompare's Request amendment.
- **Approvals:** substitution and amendment.
- **Usable when** (design §10.3, released method change):
  - an approved substitute is issued, the original's demand drops, and an arbitrary product is refused;
  - after the first operation, an amendment to a new BOM version remaps the remaining operations only, and the issued
    facts keep their lines;
  - a split moves 4 of 10 remaining to a backorder on the same method revision, and a retry answers the same IDs;
  - a DEMO_PA kit assembly is reversed with dated reversing entries in an open period, and a kit unit already sold is
    refused.

### P10 — Shop floor and time

Design §4 ShopFloor, OperationExecution and Instructions, §3 ProductionTime; M7, and review §4.1 steps 17 and 18.

- **Records and seeds:** `MachineRuntimeEvent`, the instruction step acknowledgment, and the WorkType seeds
  `WktpProductionSetup`, `WktpProductionRun` and `WktpProductionRework` (F18).
- **`mantle.work.ProductionServices`:**
  - `get#ShopFloorQueue`, `get#ProductionOperation`, `get#ProductionInstructions` and `record#InstructionStep`;
  - `complete#ProductionOperation`: the operation event and any coupled material and output posting atomically, and
    `TimeEntry.pieceCount` under the piece-rate policy (R-MFG-28);
  - `record#MachineRuntime`, whose closed interval writes the machine cost event at the effective WorkCenterRate.
- **Projects' side** (§4):
  - the production approver rule in `get#TimesheetApprovers`: the run's supervisor or the person's line manager
    (R-MFG-22). Its project rule already takes an item's root, or the item itself, as the project, so the operations
    carry the run as their root and the supervisor's assignment counts as a manager's (F17);
  - the hook on `approve#Timesheet`: a labor event per entry under a WepProductionRun, at hours × `vendorHourRate`
    with `vendorRateAmountId`. Reopening writes a reversal, and a rate change after approval a delta (R-SA-09).
- **Screens:**
  - ShopFloor: the `.qvue` manager board and operator card (Station, Queue, Actions) with its `tui` twin;
  - OperationExecution (Work, PersonTimer, MachineRuntime, CompleteStep) and Instructions (Steps, Evidence), at
    `density="handheld"` with `scan-input`;
  - ProductionTime: the Projects time surface filtered to the run and its operations.
- **Checks:** start checks the predecessors, the operator's authorization and skills (strictness, §5), equipment
  restrictions and the configured material and inspection gates.
- **Shell and outputs:** Today's assigned due operations; the operator instructions print.
- **Usable when** (design §4):
  - an operator at phone width scans an operation, starts it with the person timer (switching from another timer with
    a confirmation), acknowledges a required instruction step, records machine runtime apart from labor, and completes
    5 good and 1 scrap with the coupled output receipt;
  - completion before a predecessor is refused, naming it, and keeps what was entered; a timed-out retry answers the
    first result;
  - the run's supervisor approves the operator's timesheet, which writes the labor event; reopening it writes the
    reversal;
  - the same flow completes in the terminal twin.

### P11 — Downtime and maintenance

Design §6 Downtime, Equipment, RequestDetail and WorkItemDetail; M6's downtime part; D24.

- **Records and seeds:** `mantle.work.production.ProductionDowntime`, with its correction chain; the request type
  `RqtMaintenance` and the maintenance type `MntTpCorrective` (F18).
- **`mantle.work.ProductionServices`:** `store#ProductionDowntime` (open, close, correct), `find#ProductionDowntime`,
  and `request#ProductionMaintenance`: an AssetMaintenance through `EquipmentServices.create#AssetMaintenance`, and
  when wanted a Request linked to the downtime and the asset through `link#RequestRecord`.
- **Screens:** Downtime (the list, ReportStop, Maintenance); OperationExecution's Pause opens it; EquipmentDetail's
  Request maintenance action and downtime (design §14's missing pane; §5); RequestDetail and WorkItemDetail, Projects'
  shared screens, with the Manufacturing context.
- **Shell:** quick create downtime report.
- **Usable when:**
  - an operator reports an equipment fault on a line with a maintenance request, which makes an AssetMaintenance and a
    linked Request;
  - closing the downtime leaves the request and maintenance open and starts no timer;
  - a no-material stop suggests no maintenance;
  - a supervisor's correction keeps the original interval and actor.

### P12 — Scheduling and capacity

Design §7 ProductionSchedule and Capacity, §3 Operations' Reschedule; M5, the scheduling part of M10, and M11.

- **`mantle.work.ProductionPlanningServices`:** `get#ProductionSchedule`; `schedule#ProductionOperation`, a preview,
  then a commit that rechecks calendar, skills and equipment, capacity, predecessors, quantity and version, with a
  conflict override only by a supervisor; and `get#WorkCenterLoad` completed with the calendar, downtime and bookings.
- **M11:** the Projects WorkItems Timeline component extended with resource lanes, offline shading and a preview-only
  drag, whose commit is the Move form (F4). Projects' own Timeline keeps its behavior and specs.
- **Screens:** ProductionSchedule, the `.qvue` timeline with its `tui` twin (Preview, Apply, Unschedule, Show
  conflicts); Capacity (Parameters, Load); Operations' Reschedule; FacilityDetail's offline change with its preview.
- **Approvals and outputs:** the schedule override topic; the schedule-change notice; the plan snapshot print and CSV.
- **Usable when:**
  - a scheduler drags an operation to the second line, sees the conflict in the preview, and commits through the Move
    form;
  - an override needs a supervisor and changes no capacity;
  - an offline interval on a line previews the operations it moves;
  - Capacity shows nominal, calendar-adjusted, downtime, booked and available hours, and names missing data;
  - the terminal twin makes the same move.

### P13 — Supply planning

Crosscut CX-PLANNING and §3.20, with design §7 SupplyPlanning (§4). These are a shared contract: crosscut's record
and service names, and `Shared/SupplyPlanning`, which Purchasing mounts when it is built and Warehouse from its §7.

- **Records:** `mantle.request.requirement.PlanningRun`, `PlanningSuggestion` and `RequirementSupply`. A
  requirement's organization (R-SA-15) is a RequirementParty in the OrgInternal role, not a new field
  (impl-drawers-commons §4); `Requirement.quantityUomId` (crosscut §3.20).
- **`mantle.product.SupplyPlanningServices`:**
  - `run#SupplyPlan`: one current run per organization and facility set; it nets `get#InventoryProjectedInfo`, drafts'
    WeptConsume and WeptProduce rows included, by the run's line and its parent warehouse, with kit assemblies told
    apart from production (F16); it explodes make demand through `get#BomExplosion`, dates releases from the
    version's lead and preparation days (R-MFG-31), shows held receipts and output as a pending-release line with
    the inspection's due date, left out of netting (§4), and calls `check#ProductUsable`;
  - `get#SupplyPlan` and `store#PlanSchedule`, the one schedule. The schedule carries the organization's option to
    net held quantity whose inspection is due within the lead time (§4); off by default;
  - `convert#PlanningSuggestions`: make through `create#ProductionOrder` with the method version, the RequirementSupply
    link and WorkRequirementFulfillment `WrfDelivers`, under lock and operation identity, a result per group. P14 adds
    the outside-processing buy conversion; ordinary buy and transfer suggestions are shown with their links, and their
    conversion waits for Purchasing and Warehouse (§7).
- **Screens:** `Shared/SupplyPlanning` (PlanParameters, PlanSuggestions, DemandSupply, PlanSchedule,
  ConvertSuggestions) with the Manufacturing row of crosscut §3.20, at `Manufacturing/Planning/SupplyPlanning`. Home's
  shortages open it with the same organization, plant and date.
- **Usable when** (design §10.3, shortage to finished stock):
  - a sales demand for DEMO_1_1 yields a make suggestion and a buy suggestion for its component;
  - converting the make suggestion creates a draft run with its RequirementSupply and version, and a second conversion
    of the same demand answers the existing run;
  - a stale run is refused conversion until recalculated, and an obsolete product is an exception.

### P14 — Subcontracting

Design §7 SubcontractOperations, SubcontractDetail, Supplier360, OrderDetail and ShipmentDetail; crosscut
CX-SUBCONTRACT; review §4.1 steps 26–31.

- **Records:** `ProductionSubcontract`.
- **`mantle.work.ProductionServices`:** `request#SubcontractService` (an `RqTpProduct` Requirement for the service
  product, with a RequirementSupply demand link to the operation), `store#ProductionSubcontract`,
  `get#SubcontractMaterials`, `get#SubcontractStatus` and `find#SubcontractOperations`. P16b's
  `receive#SubcontractOutput` gains the outside-processing accrual event at service acceptance; the bill match writes
  the price-variance event through Accounting's match.
- **The outside-processing buy conversion** (§4), in P13's `convert#PlanningSuggestions`, to design-purchasing's
  Subcontracting and SupplyPlanning rules (R-PUR-22): a draft PO per supplier group, with the service OrderItem at the
  requirement's quantity and unit and the supplier price from Products' resolver, its `OrderItemWorkEffort` to the
  operation (`requiredWork` Y), and a RequirementSupply row. Conversion never places or approves the PO; that stays
  Purchasing's, and until Purchasing is built the walk's demo service places it.
  - The action needs `BOSS_PURCHASING_BUYER`, seeded here without Purchasing's launcher, as Products P1 seeded the
    other apps' groups. It shows on the Manufacturing mount to a holder of that group, which crosscut §3.20's
    Manufacturing row gains.
- **Screens:**
  - SubcontractOperations and SubcontractDetail (Agreement, Materials, Acceptance);
  - Supplier360: Products' screen with the Manufacturing row of crosscut §3.3, its subcontract orders filtered (design
    §14's pane; §5);
  - OrderDetail: Projects' screen with the Manufacturing row of crosscut §3.6, its items showing production and
    subcontract links;
  - ShipmentDetail: Accounting's screen with the Manufacturing row of crosscut §3.8, read only.
- **Outputs:** the dispatch and return instructions.
- **Usable when** (Warehouse's subcontract walk, from the Manufacturing side):
  - a planner requests outside processing for an operation, and a buyer's conversion on the Manufacturing mount makes a
    draft service PO line with OrderItemWorkEffort and RequirementSupply; the planner cannot convert it, and a second
    conversion answers the same line;
  - components dispatched to the vendor-custody facility stay the organization's;
  - the output receipt issues the components, holds the output, accepts the service line once and writes the accrual
    event once; the supplier's bill writes the price variance;
  - a run reader without the buyer grant sees no PO price.

### P15 — Cost close

Accounting's contracts (§4), built to design-accounting ProductionCostClose and AC-07 and crosscut §3.24; review §4.1
steps 20–23.

- **Records:** `ProductionAllocationPolicy`, effective-dated rows with their key fields audit-logged; a cost close
  keeps the row it applied.
- **`ironstone.accounting.ProductionCostServices`:**
  - `store#AllocationPolicy`: the overhead basis and the co-product method (§5's default rule);
  - `find#CostCloseQueue`, the runs P6's review request queued;
  - `preview#CostClose`: the absorption of the events not yet in the GL (Dr WIP; Cr applied labor, applied machine and
    overhead, and the outside-processing accrual), overhead from the policy, the co-product reallocation, and the
    residual WIP to variance. It blocks while an entry on the run is on an unapproved timesheet, and needs an open
    period;
  - `post#CostClose`: one run-level transaction that calls `transition#ProductionOrder` (Close). After close a late
    event is an adjustment, which `preview#CostClose` picks up in adjustment mode (R-SA-11).
- **Screens:** `Shared/ProductionCostClose`, mounted at `Accounting/Inventory/ProductionCostClose` and
  `Manufacturing/WorkOrders/WorkOrderDetail/ProductionCostClose`, the second needing the finance groups and not the
  Accounting launcher;
  CostingPolicies at `Accounting/Settings/CostingPolicies`; ByProducts' actual allocation; the queue on Accounting Home
  and CloseChecks; the ProductionCostReview notice.
- **Usable when** (design-accounting §16.3 production-to-GL, the cost close):
  - a completed run with material, labor, machine and outside-processing events previews its absorption, co-product
    split and variance, and posts once, closing the run in the same transaction;
  - a retry answers the first post, and a closed period is refused;
  - a labor event after close is previewed as an adjustment;
  - a cost estimator can request review but not preview or post.

### P16 — Reports

Design §9; the reporting part of M10.

- **`mantle.work.ProductionReportServices`:** the eight report services of design §9, and `get#ProductionDashboard`.
  Each returns its scope, as-of time, units and currency, and the partitions it could not read; money columns need
  financial read. OEE is availability × performance × quality, with downtime unioned and reworked units counted once,
  and "Not calculable" where data is missing.
- **Screens:** Reports, and WorkOrderStatusReport, MaterialReport, OperationPerformanceReport, LossReport,
  QualityReport, ProductionCostReport, BillOfMaterialsVarianceReport and PlanningReport (over P13's runs). Home
  complete, its Kpis as dashboard widget providers (crosscut §3.17) opening their reports with the same filters.
- **Exports:** each report as CSV with its screen's filters and columns.
- **Usable when:**
  - OEE for a line shows its three factors from P10's events and P11's downtime;
  - a reader without financial read gets the quantities and no money columns, on screen and in the export;
  - a failed partition is named and the total marked incomplete, never zero.

### P17 — Finish

- The terminal twins, and the server-static pass.
- The design §10.3 acceptance review and crosscut §6 standalone operation. A Manufacturing user with no other launcher
  plans, makes and receives through the shared mounts. That user is refused cost, finance, other organizations' runs and
  stock actions without the stock capability, through URLs, shared contexts, the shop floor, exports, the palette and
  search.
- The §11 outputs not built earlier.
- The inventories' **Implemented in** columns, the design's Impl column, and Remaining-Work.

## 4. Decisions

These are made before and during the build. Each one that changes the design is also written into
design-manufacturing.md, or into the owner's design.

Decided in the other apps' plans, and binding here:

| Date | Decision | Notes |
| --- | --- | --- |
| Oct 28, 2026 | Products builds Manufacturing's versioned methods (M3), `WorkCenter`, `WorkCenterRate` and `get#OperationCostBasis`, with the five shared method screens in the Products context (impl-products P8). Capacity, alternates and load, and Manufacturing's own method screens, stay Manufacturing's | The user's call, in impl-products §4 |
| Oct 28, 2026 | Accounting builds ProductionCostClose and CostingPolicies with Manufacturing's cost events, output receipt and run close. Its P13 seeds the production GL account types and the scrap account, and its P19 readiness checks the WIP and transfer accounts | The user's call, in impl-accounting §4. Here: P15 |
| Oct 28, 2026 | Warehouse builds crosscut CX-QUALITY (its P8), and Manufacturing's runs and snapshots (`create#ProductionOrder`, `release#ProductionOrder` and the snapshot records) and stock guards with the CX-PRODUCTION fields (its P16). The rest of M4 and M2, and Manufacturing's screens, stay Manufacturing's | The user's call, in impl-warehouse §4 |
| Oct 28, 2026 | The shared screens an app builds first carry its context only; another app's context is added when that app is built | As in each plan |

Made for this plan:

| Date | Decision | Notes |
| --- | --- | --- |
| Oct 28, 2026 | Manufacturing is built after Products, Accounting and Warehouse, and before Purchasing. It extends what those three built for it, and Purchasing later adds its context and conversions to what Manufacturing builds: SupplyPlanning and the outside-processing PO lines | The user's call. The three plans assume the first; [impl-purchasing.md](impl-purchasing.md) now follows it |
| Oct 28, 2026 | The shared rules of impl-drawers-commons §4 apply: parties by role, and changes by effective date and the audit log. Here: ProductionPolicy, the reason codes and ProductionAllocationPolicy are effective-dated rows with audit-logged key fields, and a requirement's organization is a RequirementParty role. Whether the methods and runs follow it too is §5's question | The user's call, in the Purchasing plan review (impl-purchasing §4) |
| Oct 28, 2026 | Held quantity in planning (design §14, crosscut §9): a pending-release line with the inspection's due date, left out of netting by default; the plan schedule's organization option nets held quantity whose inspection is due within the lead time (P13) | The user's call, in the Purchasing plan review (impl-purchasing §4, answer 12); the design's recommendation |
| Oct 28, 2026 | Phase order: methods, work centers and the production policy first; then the runs and their materials; cost evidence early, so each later fact writes its event as it is built; then quantities and quality, controlled changes, the shop floor and downtime, scheduling, supply planning, subcontracting, the cost close and reports | The user's call. The alternative was the run first (P5 before P2–P4), on Products P8's methods and a default policy |
| Oct 28, 2026 | Manufacturing builds crosscut CX-PLANNING (P13): PlanningRun, PlanningSuggestion and RequirementSupply, `run#SupplyPlan`, `get#SupplyPlan`, `store#PlanSchedule` and `convert#PlanningSuggestions`, and `Shared/SupplyPlanning` with the Manufacturing context. It converts make suggestions (P13) and outside-processing requirements to draft service PO lines (P14), the second for `BOSS_PURCHASING_BUYER` on the Manufacturing mount, which crosscut §3.20's Manufacturing row gains. Purchasing adds its mount and buy conversion when it is built, and Warehouse its mount and transfer conversion from its §7 | The user's call. The alternative was to wait for Purchasing, with SupplyPlanning, make conversion and the service PO conversion in §7. Warehouse had left CX-PLANNING for its owner (impl-warehouse §4) |

## 5. Open questions

| Question | Decides | Notes |
| --- | --- | --- |
| `BOSS_MANUFACTURING` as the root user group beside the artifact group of that name | at P1 start | Products kept both (impl-products §4) |
| Plant scope: Warehouse's facility filter (`Facility.ownerPartyId` in `filterOrgIds`) for production facilities too | at P1 start | Follows impl-warehouse §4 |
| Where a draft's material and output lines live before release (Warehouse P16a's choice) | at P5 start | P0 checks |
| Auto-completion without a formal inspection: explicit final reconciliation by default (design §14) | at P7 start | |
| Released-run amendment policy: no method change after any fact by default, with a controlled amendment of remaining work by method approver and supervisor (design §14) | at P9 start | |
| Disassembly enabled once Accounting P2a's dated issuance reversal is in and the kit receipt's repost is safe, with the guard checking quantities actually issued (F15) | at P9 start | Design Disassembly keeps it blocked until then; otherwise it is §7 with general unbuild |
| Skill certification and safety acknowledgment: blocking when configured, advisory otherwise, over PartySkill and WorkEffortSkillStandard (design §14) | at P10 start | |
| Machine runtime with no effective WorkCenterRate: refused, or recorded without value and listed for review | at P10 start | |
| The panes the canonical screens lack (design §14): EquipmentDetail's Request maintenance (P11), Supplier360's subcontract orders (P14), OrderDetail's production links (P5, P14) | at each phase's start | Each goes into crosscut when accepted |
| Methods and runs under the shared effective-date rule (impl-drawers-commons §4): BOM and routing versions as effective-dated Mantle rows (PatMfgBom ProductAssoc, routing WorkEffort templates) with the audit log, and a run's own WorkEffortProduct rows and operation children as its frozen copy, in place of M3's version records and M4's snapshot records | before P2 | Asked in impl-products §5 (before its P8) and impl-warehouse §5 (before its P16); Manufacturing follows both answers |
| The default overhead and co-product allocation rule (crosscut §9; Accounting's Open list) | at P15 start | The review recommends quantity-normalized co-product allocation and a work-center-hour overhead rate |

The design's other §14 items are `later` there and in §7.

## 6. Findings

Design assumptions found wrong or unstated in the code, with the resolution. Where a resolution changes the design, it
is written there too.

| # | Finding | Resolution |
| --- | --- | --- |
| F1 | P0: `screen/Manufacturing/` has six placeholders: Home, WorkOrders, ShopFloor, BillsOfMaterials, Planning and Settings. There are no Routings, WorkCenters, Quality, Subcontracting, Approvals or Reports areas; the root mounts only Chatter and RecordFiles and has no `<shell-providers>`. The `BOSS_MANUFACTURING` authz is in BossSetupData's commented block | P1 |
| F2 | P0: Products P1 seeds `BOSS_MANUFACTURING_READ` as "Method reader" and `BOSS_MANUFACTURING_ADMIN` as "Work-center administrator", beside `_METHOD` and `_METHOD_APPROVE`. The design's groups are production reader and production/resource administrator, and nine more are unseeded | P1 corrects the descriptions and seeds the rest |
| F3 | P0: neither `MANTLE_USER_ORG` nor `MANTLE_ACTIVE_ORG` filters WorkEffort, WorkEffortProduct, Asset or AssetIssuance; Facility's filter is in `MANTLE_USER_ORG` only (impl-warehouse F2) | Production rows through services (§2); plant scope through Warehouse's facility filter (P1) |
| F4 | P0: the Projects WorkItems `Timeline.qvue` lanes are sprints and milestones; a drag commits the move at once (`moveBar`); there are no resource lanes or offline shading | P12 extends it with a preview-only resource mode (M11), leaving Projects' behavior as it is |
| F5 | P0: the form XSD has `view-board`, `view-calendar` and `view-tree`, and the screen XSD `dashboard` and `number-card` (R-MFG-12) | WorkOrders' board and calendar (P5); the explosion and where-used trees; Home's Kpis (P16) |
| F6 | P0: BOSS has no `Shared/ProductionCostClose` or `Shared/SupplyPlanning`; impl-accounting §7 and impl-warehouse §7 each leave theirs for later | P15 builds the first, and P13 the second (§4) |
| F7 | P0: `create#ProductionRun` sets WetEvent, WepProductionRun, WeInPlanning and hours, requires a facility, and never sets `ownerPartyId` (Marble's NewRunForm and the spec pass none). With a produce product it writes WeptConsume rows from `get#ProductBomDetail`, which is single level and reads PatMfgBom with no date filter, so expired lines count | Warehouse P16a calls it with neither product (D15); P0 confirms. Legacy BOM reads stay for kits and migration comparison only |
| F8 | P0: `set#ProducedProductQuantity` always resets the run's status: WeComplete when every estimate is produced, otherwise WeInProgress, so on a draft or released run it starts the run. Its `recreate#ConsumeProductsFromProduce` deletes every WeptConsume row and rebuilds them from the WorkEffortProductAssoc view, which joins ProductAssoc of any type, not only PatMfgBom | Never called by BOSS (§2); `change#ProductionQuantity` (P7) is the target change |
| F9 | P0: the Default WorkEffort flow has no WeApproved → WeOnHold or WeApproved → WeInPlanning, and allows WeInPlanning → WeComplete, WeComplete → WeInProgress and WeClosed → WeInPlanning; WorkEffortOther adds → WeClosed from every open status. The framework's status check (`moqui-core` `service/call.rs` `check_status`) matches StatusFlowTransition by from and to only, ignoring `statusFlowId`, and skips a record with no status, so any `update#WorkEffort` accepts all three flows' transitions. Nothing leads from WeOnHold back to WeApproved, so a hold before start could only resume by starting | `transition#ProductionOrder` is the only path to a run's status (§2, P5); Warehouse P16a seeds WeApproved → WeInPlanning, and P5 WeApproved → WeOnHold and WeOnHold → WeApproved, the last written into the design; P1 grants no raw update |
| F10 | P0: Mantle REST has `workEfforts` PATCH as an entity update, PUT `add#WorkEffortProduct`, POST `create#ProductionRun`, and the run display, produce-consume and pick reads. Marble's `updateRun` calls plain `update#WorkEffort` | P1 grants the Manufacturing groups no REST run path; P0 checks the other groups |
| F11 | P0: WorkEffortProduct is keyed by run, product and from date, with no unit, so it cannot hold two lines of one product. WorkEffort's `estimatedCost` is commented out; `ownerPartyId`, `actualCost` and the setup times exist. ProductionEstimate exists and is unused | Snapshot lines are the execution identity and the Wept rows a per-product aggregate in the stock unit (design M4); no write to `estimatedCost`; ProductionEstimate stays unused (R-MFG-27) |
| F12 | P0: `issue#AssetToWorkEffort` does not check the asset's status; it checks available to promise, and quantity on hand unless the facility's `assetAllowIssueOverQoh` is Y, which it is for ZIRET_WH. `issue#AnyAssetToWorkEffort` picks AstAvailable assets only | The production issue guard checks status and quantity itself (P0 confirms Warehouse P16b; P5b) |
| F13 | P0: `receive#Asset` takes `acquireCost` from its parameter, else the order item's standard cost or price, so production output without one has none (a TODO names the work effort's cost). The owner defaults to the order's customer, then the work effort's owner, then the facility's; the status to AstAvailable, overridden by the location type's `autoStatusId`. `post#AssetReceipt` with a null cost records AtrNoAcquireCost and posts nothing; a zero cost posts zero | Output and return receipts always pass `acquireCost` (design D12); P6's guard refuses one without it |
| F14 | P0: an issuance posts to WIP only when the work effort's `ownerPartyId` equals the asset's, otherwise to COGS; a receipt with a work effort credits WIP whatever the owner. A run with no owner, as Marble and the spec make them, books issues to COGS and output against WIP | `create#ProductionOrder` sets the owner (Warehouse P16a) and release sets it on the operations; stock carries the run's ID, never an operation's (R-SA-03, R-SA-07). P5 checks the demo runs |
| F15 | P0: `breakDown#Assembly` lowers the kit receipt through `update#AssetAndReceipt`, which calls `repost#Asset` (unpost, delete and re-post) when quantity or cost changes. `unissue#AssemblyComponents` unissues by the kit's current, date-filtered PatMfgBom quantities, and `unissue#Component` cancels the run's issuances in ID order through `cancel#AssetIssuance`, an update that fires AssetIssuanceGlRePost | Disassembly waits for P0's check of both reposts (§5, P9) |
| F16 | P0: `get#InventoryProjectedInfo` reads production demand and supply from the MantleInventoryRunConsume and RunProduce documents: WorkEffortProduct rows of any purpose (pick assemblies too) on work efforts not Complete, Closed or Cancelled, so drafts count. Its facility is the run's facility's parent, meaning a run sits on a line under its warehouse; a run placed on the warehouse itself is missed. It needs search | P1's demo lines sit under ZIRET_WH, and NewWorkOrder puts a run on a line (P5); P13 nets by line and warehouse and tells kits apart |
| F17 | P0: `get#TimesheetApprovers` follows ProjTimesheetPolicy: by default the ProjectManager or Manager WorkEffortParty rows of each entry's project, where the project is the item if a WetProject, else its root, else the item itself; `line` uses the PrtManager relationship; `any` the TIMESHEET_APPROVE holders. `approve#Timesheet` needs an approver other than the owner on a completed sheet. The timers take a work type and a rate type | P10: operations carry the run as root and the supervisor's assignment counts as a manager's; the production rule is written into the design if it reduces to that |
| F18 | P0: the WorkTypes are management, labor, office, breaks, development, design, testing, meeting, support, project management, consulting and travel (the demo adds programming); no production work type. SkillType is seeded with no values. There is no RqtMaintenance request type; the maintenance types are vehicle, HVAC and cleaning, with no corrective type. AsMntCreated exists, and `create#AssetMaintenance` sets no status | P10 seeds the three work types; P1's demo the skill types; P11 RqtMaintenance and MntTpCorrective, and `request#ProductionMaintenance` passes AsMntCreated |
| F19 | P0: Mantle's demo has no production run, routing, line, work center, product maintenance or asset maintenance. ZIRET_WH (owner ORG_ZIZI_RETAIL) is the only facility. PatMfgBom rows exist for DEMO_1_1 and DEMO_3_1 (DEMO_SA_1, DEMO_SA_2, DEMO_RM_1) and DEMO_PA, the only PtPickAssembly kit (DEMO_1_1, DEMO_2_1). EQUIP_AB4 "Assembly Bot 4000" has two assets at ZIRET_WH | P1's demo builds on them |
| F20 | P0: Mantle's `ManufacturingServices.spec.js` (seven features) creates an ownerless run with a produce product, sets the produced quantity, issues, unissues, cancels and breaks down an assembly; it asserts no GL, transition or exact consume quantity. OrderToCashBasicFlow packs DEMO_PA through the pick-assembly services | Both pass unchanged, since ManufacturingServices keeps its behavior (§2) |
| F21 | P0: Marble's Manufacturing has 12 screen files and 23 forms (16 single, 7 list), matching ss-inventory; RunPickDocument is the print. `addRunProduct` calls `add#WorkEffortProduct` | Each maps to design §10.2's destination (P5, P7, P17) |

## 7. Later

Designed, not in this build:

- **The design's `later` rows:**
  - AssemblyViewer and WallDisplay (the `BOSS_MANUFACTURING_DISPLAY` group is seeded in P1, with nothing to open);
  - Nonconformances and Gauges, with crosscut CX-QUALITY's NCR, CAPA and calibration;
  - DemandForecasts, MasterSchedule and FiniteSchedule;
  - CustomerMaterialJobs (inward processing);
  - Batches and BatchDetail (M9).
- **Other design items:**
  - merging compatible drafts (R-MFG-40);
  - WhereUsed's Draft replacement revisions, and the ChangeNotices link from compare (R-MFG-32);
  - the variant-applicability editor (Products P8 adds `applicabilityFeatureIds`, which the explosion reads);
  - the design §14 items: component reservation and a production pick mode with `AssetReservation.workEffortId`,
    general unbuild of produced output, a shared-station operator switch, and deferred cost posting;
  - Disassembly, if §5 does not enable it in P9.
- **The rest of supply planning (CX-PLANNING):** Purchasing's mount and its conversion of ordinary buy suggestions to
  POs or purchase requests, Warehouse's mount and its transfer conversion, and RequestDetail's buy and make
  requirements with their RequirementSupply links (impl-warehouse §7).
- **Other apps' contexts:** Purchasing, Warehouse and Customer Service on the shared screens Manufacturing builds first
  (ProductionCostClose, SupplyPlanning), beyond Accounting's on ProductionCostClose.
- **Other apps' callers:** Purchasing placing and approving the service PO, and its supplier portal's subcontract view
  (design SubcontractDetail, External access); the Maintenance app adopting the AssetMaintenance records.

## 8. Verification

- **Per phase,** the "Done" rule of §2 and the phase's "usable when".
- **End to end,** run `./moq run`, sign in as `john.doe` and as each demo production user, and walk each built phase's
  "usable when" in order.
- **Design §10.3's acceptance review and crosscut §6,** scenario by phase:

| Scenario | Phase |
| --- | --- |
| Product variant to supplier price, partial receipt and failed inspection | P5b and P8 (held stock is never issued); the receipt, bill and payment are Purchasing's, Warehouse's and Accounting's |
| Shortage to buy, make or transfer, partial production, finished stock and GL | P13 (conversion), P5 (release and issue), P7 (partial output, loss and returns), P6 and P15 (cost and GL) |
| Order reservation, pick shortfall, substitute or replan | P9 (substitute), P8 (pegged reservation at release); shipment and invoice are Warehouse's and Accounting's |
| Customer return, inspection, rework or scrap | P7 (rework and scrap), P8 (disposition); credit and refund are Accounting's |
| Physical count while production issues and receives | P5b's movements under Warehouse's count cutoff (its P10) |
| Intake, assignment, reopen and resolution | P11 (downtime and quality requests); SLA and CSAT are Customer Service's |
| Released BOM or routing changes; missing instruction | P9 (amendment), P10 (the instruction gate); the gauge is §7 |
| Cancellation, partial completion and retry | P5 (cancel and retry), P7 (partial), P9 (split); batches are §7 |
| Unauthorized action and standalone app | `ManufacturingAccess` in every phase; P17 |
| Subcontract dispatch and output receipt | P14, on Warehouse P15 and P16 |
| Production cost close (design-accounting §16.3 production-to-GL) | P15 |

- **Screenshots** through the BOSS client spec of §2, light and dark, and the handheld mounts at phone width.
