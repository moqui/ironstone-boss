# IronStone BOSS — Manufacturing design

Oct 28, 2026 — draft; reviewed against research-manufacturing.md, the reference apps and the other core designs ([review-core-apps.md](review-core-apps.md)); the released BOM is now the only manufacturing method, each stock and cost posting has a named service and owner, and the `Bom*` screens use full words; then brought in line with the plans' decisions ([impl-manufacturing.md](impl-manufacturing.md), [impl-products.md](impl-products.md), [impl-warehouse.md](impl-warehouse.md) and [impl-accounting.md](impl-accounting.md) §4): dated methods and instructions, the run's own lines, the root and its organization filters, and the decided §14 items

IronStone Manufacturing serves production planners, method engineers, supervisors and shop-floor operators. It covers simple production runs and routed work orders, controlled BOMs and routings, material and quantity capture, quality, work centers, shared supply planning, production scheduling and cost evidence. A small manufacturer can use the app on its own with the same shared product, stock, party and accounting contracts that larger deployments use across the suite.

**Inputs.** [research-manufacturing.md](research-manufacturing.md) §1–§14; [design-crosscut.md](design-crosscut.md); [design-products.md](design-products.md); [design-warehouse.md](design-warehouse.md); [design-purchasing.md](design-purchasing.md); [design-accounting.md](design-accounting.md); [design-projects.md](design-projects.md); [design-drawers-commons.md](design-drawers-commons.md); [initial-design.md](initial-design.md), [design-doc-guide.md](design-doc-guide.md), [style-guide.md](style-guide.md), [ss-inventory.md](ss-inventory.md) and [usl-inventory.md](usl-inventory.md). Source verification uses active `mr-mantle` and `mr-marble` XML, rather than the earlier checkout names in research. Reference paths below are local files under `~/work/moquiwork/3p_other`, inspected for concrete interaction and transaction patterns.

**Sections.** [1 shell](#1-shell) · [2 screens](#2-screens) · [3 work orders](#3-work-orders) · [4 shop floor](#4-shop-floor) · [5 BOMs and routings](#5-boms-and-routings) · [6 work centers and quality](#6-work-centers-and-quality) · [7 planning and outside processing](#7-planning-and-outside-processing) · [8 batches and settings](#8-batches-and-settings) · [9 reports](#9-reports) · [10 coverage](#10-coverage-and-validation) · [11 outputs](#11-documents-and-outputs) · [12 needs](#12-framework-and-data-needs) · [13 decided](#13-decided) · [14 open](#14-open)

## 1. Shell

### 1.1 Root, access and conventions

Root `screen/Manufacturing.xml`, mounted as `Manufacturing`, uses `BOSS_MANUFACTURING` as its root user group and artifact group, and `sym_o_precision_manufacturing`. Root/section placeholders exist; they are not implemented production workflows. The current root calls `mantle.party.PartyServices.setup#UserOrganizationInfo` and sets app context. Commons owns the shell, palette, quick create, tray, Chatter, files, approvals and calendar; Projects owns requests, work items and person time/timesheets. This app contributes production context and providers to those facilities.

Proposed capabilities distinguish production reader, planner, scheduler, method engineer, method approver, operator, supervisor, quality inspector, quality verifier, quality administrator, cost estimator, production/resource administrator and plant display. Existing financial, stock and party permissions are composed with them. The buyer capability is a Purchasing grant, and the financial reader and GL/finance approver capabilities are Accounting grants; Manufacturing screens compose them and define no copies. Every service checks actual organization, facility, record, operation and action authority. `appRoot=Manufacturing`, assigned-operator context or a hidden cost column is not authorization. Operators can issue/receive only within their explicit stock scope; an assignment is not an implicit inventory grant. The common record mounts work without requiring another app's root grant when the user has the underlying permissions.

Each capability is one proposed user group in the crosscut §1 capability table (D22):

| Capability | Proposed group | Actions |
| --- | --- | --- |
| production reader | `BOSS_MANUFACTURING_READ` | Read runs, methods, schedules and reports, without money columns |
| planner | `BOSS_MANUFACTURING_PLAN` | Create, release, unrelease, split and change runs; start a planning run and convert make suggestions |
| scheduler | `BOSS_MANUFACTURING_SCHEDULE` | Move operations and commit schedule changes |
| method engineer | `BOSS_MANUFACTURING_METHOD` | Edit draft BOM lines and routing operations, operation templates and instructions |
| method approver | `BOSS_MANUFACTURING_METHOD_APPROVE` | Release BOM and routing drafts; approve amendments |
| operator | `BOSS_MANUFACTURING_OPERATE` | Execute assigned operations; record quantities, machine time, downtime and loss |
| supervisor | `BOSS_MANUFACTURING_SUPERVISE` | Start, hold, complete and cancel runs; approve substitutes, overproduction, loss and staged release |
| quality inspector | `BOSS_MANUFACTURING_QUALITY_INSPECT` | Create, record and submit production inspections |
| quality verifier | `BOSS_MANUFACTURING_QUALITY_VERIFY` | Verify inspections; dispose held output together with the stock disposition role |
| quality administrator | `BOSS_MANUFACTURING_QUALITY_ADMIN` | Edit and publish inspection templates in production context |
| cost estimator | `BOSS_MANUFACTURING_COST` | Read frozen estimates and cost evidence; request cost review |
| production/resource administrator | `BOSS_MANUFACTURING_RESOURCE_ADMIN` | Maintain work centers, production settings and reason codes |
| plant display | `BOSS_MANUFACTURING_DISPLAY` | Read one plant's WallDisplay and nothing else |

These groups take the organization filters of [impl-drawers-commons](impl-drawers-commons.md) §4 (`MANTLE_USER_ORG`), so a user works within their own organizations. `BOSS_MANUFACTURING_ADMIN` is the app's admin group, with all authz on the root and `MANTLE_ACTIVE_ORG`: every organization until one is made active, and every plant. Plant scope is Warehouse's facility scope, `MANTLE_USER_ORG`'s Facility filter (`ownerPartyId` in `filterOrgIds`), for production facilities too. No entity filter covers WorkEffort, so runs, operations and routings are read and written only through the services, which check the organization themselves (impl-manufacturing §2, F3). Stock actions also need the Warehouse stock capability for the facility. Money columns need Accounting's financial reader group (proposed `BOSS_ACCOUNTING_READ`, Accounting §1.1).

XML is the default implementation. All lists use saved finds, server paging and row identity; bulk mutation returns a named outcome for every independent record. Dirty forms retain input after errors. Values unavailable by permission are omitted, not represented as zero. Stock and financial mutations are atomic per logical transaction; retries carry an operation key on Accounting's one CX-POSTING operation record (keyed by `operationKey`, with the request hash and links to what it made), and read the prior result before reapplying; a different request under the same key is refused (impl-accounting §4). A change to an existing Mantle service, such as the production approver rule in `get#TimesheetApprovers`, sits behind its own ProductionPolicy flag, off by default, so Mantle's default is unchanged (impl-manufacturing §2, impl-accounting §4). Errors identify the run, operation, source line and failed check without leaking inaccessible record details.

### 1.2 Menu

- Home — `Home`
- Work orders — `WorkOrders`
  - New work order — `NewWorkOrder`; record routes — `WorkOrderDetail`, `SplitWorkOrder`; supported disassembly — `Disassembly`
- Shop floor — `ShopFloor`
  - Operator work — `OperationExecution`; instructions — `Instructions`; assembly viewer — `AssemblyViewer` and wall display — `WallDisplay` (`later`)
- BOMs — `BillsOfMaterials`
  - Method record — `BillOfMaterialsDetail`, with its explosion — `BillOfMaterialsExplosion` and compare — `BillOfMaterialsCompare`; where used — `WhereUsed`
- Routings — `Routings`
  - Routing record — `RoutingDetail`; operation catalogue — `OperationTemplates`
- Work centers — `WorkCenters`
  - Equipment — `Equipment`; calendar — `ResourceCalendar`
- Quality — `Inspections`
  - Templates — `InspectionTemplates`; scrap/loss — `ScrapLoss`; downtime — `Downtime`; nonconformances — `Nonconformances` and gauges — `Gauges` (`later`)
- Planning — `SupplyPlanning`
  - Availability — `InventoryAvailability`; schedule — `ProductionSchedule`; capacity — `Capacity`; forecast, master and finite schedules — `later`
- Subcontracting — `SubcontractOperations`
  - Outside-processing record — `SubcontractDetail`; customer-material work — `CustomerMaterialJobs` (`later`)
- Batches — `Batches` (`later`)
  - Batch record — `BatchDetail`
- Settings — `ProductionSettings`
  - Reason codes — `ReasonCodes`
- Approvals — `Approvals`
- Reports — `Reports`
  - Status — `WorkOrderStatusReport`; materials — `MaterialReport`; operation performance — `OperationPerformanceReport`; loss — `LossReport`; quality — `QualityReport`; cost — `ProductionCostReport`; BOM variance — `BillOfMaterialsVarianceReport`; planning — `PlanningReport`

Record routes are contextual, not extra menu depth. Approvals is a top-level entry because it is a work queue, not a setting; its path stays `Manufacturing/Approvals`. Home shows open/WIP/late/component-short/completed-this-month counts, assigned work, due operations and shortages. Quick create offers a draft work order, downtime report or linked request according to capability. Palette searches run/product/method IDs and scoped equipment; Today contributes assigned due operations and actionable quality/planning exceptions. Notifications carry record/revision links and avoid repeating unchanged blocks.

### 1.3 Verified foundation and boundaries

| Current source | Verified behavior and design consequence |
| --- | --- |
| [ManufacturingServices.xml](../../mr-mantle/service/mantle/work/ManufacturingServices.xml) | Active `create#ProductionRun`, display/produce-consume queries, assembly issue/unissue/breakdown and pick information exist. Create sets production purpose and draft status and builds simple consume/produce rows. With `produceProductId` it writes `WeptConsume` rows from legacy single-level `PatMfgBom` through `get#ProductBomDetail`, and it does not set `WorkEffort.ownerPartyId`; BOSS calls it only inside `create#ProductionOrder`, without `produceProductId` or `consumeProductId` (D15). `get#ProductBomDetail` is single-level and does not implement the dated scrap/effectivity explosion of M3. These services are a foundation, not an implemented production scheduler or controlled release workflow. |
| [WorkEffortEntities.xml](../../mr-mantle/entity/WorkEffortEntities.xml) | Active WorkEffort, WorkEffortProduct, assignments, asset/skill needs, TimeEntry, ProductionEstimate and joins exist. WorkEffortProduct has product/fromDate identity and estimatedQuantity/estimatedCost, but no independent same-product operation line or quantity UOM. WorkEffort's `estimatedCost` field is commented out; do not write to it. BOSS leaves ProductionEstimate unused (§13). |
| [ProductDefinitionEntities.xml](../../mr-mantle/entity/ProductDefinitionEntities.xml) | Active ProductAssoc `PatMfgBom` is the baseline material relationship with quantity, scrapFactor, instruction, routingWorkEffortId and effectivity. It has no BOM header, stable line identity or quantityUomId; packaging-unit extension is proposed in crosscut. It cannot be stretched into immutable repeated-line production history merely by adding one foreign key. BOSS keeps `PatMfgBom` only for the components of `PtPickAssembly` kits (D15). |
| [FacilityEntities.xml](../../mr-mantle/entity/FacilityEntities.xml) | Active Facility and `FcTpLine` identity are reused. Existing `capacity` is people capacity, not throughput. Production resource capacity needs the proposed extension. |
| [AssetServices.xml](../../mr-mantle/service/mantle/product/AssetServices.xml) and [AssetAutoPostServices.xml](../../mr-mantle/service/mantle/ledger/AssetAutoPostServices.xml) | Active issue-to-work-effort, receipt and ledger hooks provide stock/WIP integration. Shared wrappers must add request identity, line linkage, authorization and reviewed correction behavior; raw services alone do not prove all release/period/quality guarantees. Screens never directly invoke ledger EECA hooks as a second posting. The hooks are the SECAs `AssetIssuanceGlPost` (an issue posts Dr WIP, Cr Inventory when the work effort owner is the asset owner, otherwise Dr COGS), `AssetIssuanceGlRePost` (any update of an issuance unposts, deletes and reposts the transaction) and `AssetReceiptGlPost` (a receipt with a work effort posts Dr Inventory, Cr WIP at `Asset.acquireCost`, and nothing when that cost is missing); §13 says which are kept. |
| [TimesheetServices.xml](../../mr-mantle/service/mantle/work/TimesheetServices.xml) and [TimeServices.xml](../../mr-mantle/service/mantle/work/TimeServices.xml) | Current timer and weekly-timesheet policy/access/approval/locking services already exist. Use these. Legacy store#TimeEntryWorkEffort creates/updates a WorkEffort and requires client/time inputs; it is not a ready production timer wrapper. |
| [Projects design](design-projects.md) and [Commons design](design-drawers-commons.md) plus current shared screens | RequestWorkEffort/WorkEffortRecord links, request intake, calendar/work hours, approvals, time and files are existing facilities to extend narrowly. No new Manufacturing task/case/calendar subsystem is assumed. |

**Status truth.** Production state labels use active WorkEffort status IDs, but the new production guards and operation event/state machine remain proposed. New quality, planning, BOM line, run line, downtime, loss and machine-time records below are proposed additions. Under the shared effective-date rule (impl-drawers-commons §4) there are no version or snapshot records: a method "version" in this design is the BOM and routing as of a release date, and a released run is its own `ProductionRunLine` rows with its release time (impl-manufacturing §4). ProductStandardCost/ProductStandardCostComponent are the agreed new estimate model in `mantle.product.cost`; commented-out historical costing definitions are not enabled by this document. Actual asset valuation and GL changes remain Accounting-owned.

## 2. Screens

All paths are under the BOSS app root; these are proposed screen routes, not claims that XML files already exist. `parity` preserves a baseline capability and may still require the shared safety extensions. A `later` row is designed here but excluded from the first release. A mixed-capability screen explicitly identifies its later extension in its section.

| Screen | Path | Archetype | Impl | Purpose | Main record | Reused | Roles | Scope | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Home | `Manufacturing/Home` | landing | xml | Show production work that needs attention. | authorized production summary | own | app | new | organization, plant and date filters |
| WorkOrders | `Manufacturing/WorkOrders` | list | xml | Find simple runs and routed work orders. | mantle.work.effort.WorkEffort | own | app | parity | WorkEffort rows; list find parameters |
| NewWorkOrder | `Manufacturing/WorkOrders/NewWorkOrder` | wizard | xml | Create a draft run from an approved product method or manually. | mantle.work.effort.WorkEffort | own | planner | parity | draft parameters: productId, facilityId, requirementId |
| WorkOrderDetail | `Manufacturing/WorkOrders/WorkOrderDetail` | detail | xml | Control the production lifecycle and its cross-app evidence. | mantle.work.effort.WorkEffort | own | app; transitions planner/supervisor | parity | WorkEffort workEffortId |
| Overview | `Manufacturing/WorkOrders/WorkOrderDetail/Overview` | detail | xml | Maintain draft dates, assignments and equipment. | mantle.work.effort.WorkEffort | own | app | parity | WorkEffort workEffortId |
| Components | `Manufacturing/WorkOrders/WorkOrderDetail/Components` | detail | xml | Compare planned materials, availability and actual issues. | proposed ProductionRunLine | own | app | parity | WorkEffort workEffortId; material line selection |
| MaterialIssueReceipt | `Manufacturing/WorkOrders/WorkOrderDetail/MaterialIssueReceipt` | task | xml | Open the canonical MaterialIssueReceipt in production context. | AssetIssuance / AssetReceipt | MaterialIssueReceipt, [crosscut §3.9](design-crosscut.md#39-materialissuereceipt) | app | parity | work effort, operation and movement source |
| Operations | `Manufacturing/WorkOrders/WorkOrderDetail/Operations` | list | xml | Track released operation instances and dependencies. | WorkEffort operation children (routing operation, sequence, work center) | own | operator/planner | new | WorkEffort workEffortId; operation rows |
| Quantities | `Manufacturing/WorkOrders/WorkOrderDetail/Quantities` | detail | xml | Reconcile partial output, remaining work, scrap and rework. | WorkEffortProduct + proposed ProductionQuantityEvent | own | app | parity | WorkEffort workEffortId |
| SplitWorkOrder | `Manufacturing/WorkOrders/WorkOrderDetail/SplitWorkOrder` | wizard | xml | Split uncompleted demand or create a linked backorder. | WorkEffort + RequirementSupply (proposed) | own | planner/supervisor | new | WorkEffort workEffortId |
| Disassembly | `Manufacturing/WorkOrders/Disassembly` | task | xml | Reverse a supported pick assembly; general unbuild is an Open item. | WorkEffort + Asset genealogy | own | supervisor; finance for cost correction | new | Asset assetId; WorkEffort workEffortId |
| ProductionTime | `Manufacturing/WorkOrders/WorkOrderDetail/Time` | list | xml | Open the canonical ProductionTime in production context. | mantle.work.time.TimeEntry | TimeEntries, [Projects time](design-projects.md) | app | new | WorkEffort workEffortId; TimeEntry rows |
| ByProducts | `Manufacturing/WorkOrders/WorkOrderDetail/ByProducts` | detail | xml | Plan and receive traceable secondary outputs. | proposed ProductBomItem / ProductionRunLine | own | app | new | WorkEffort workEffortId |
| QualityGates | `Manufacturing/WorkOrders/WorkOrderDetail/Quality` | list | xml | Expose required inspections and blocking decisions. | mantle.product.quality.QualityInspection (proposed) | own | app | new | WorkEffort workEffortId; inspection rows |
| ProductionCosts | `Manufacturing/WorkOrders/WorkOrderDetail/ProductionCosts` | report | xml | Explain estimate, actual WIP and completion variance. | proposed ProductionCostEvent / ProductionCostAllocation + ledger evidence | own | cost estimator; actual values finance | new | WorkEffort workEffortId |
| ProductionCostClose | `Manufacturing/WorkOrders/WorkOrderDetail/ProductionCostClose` | task | xml | Review and post authorized WIP/output allocation and variance. | proposed ProductionCostEvent / ProductionCostAllocation | Accounting §10; [crosscut §3.24](design-crosscut.md#324-production-cost-close) | financial readers; GL/finance approver | new | organization, run, source revision and accounting date |
| Chatter | `Manufacturing/Chatter` | panel | qvue | Open the canonical Chatter in production context. | canonical host record (WorkEffort, ProductBom, Facility) | Chatter, [crosscut §3.14](design-crosscut.md#314-chatter-and-recordfiles) | app | parity | host entity and canonical key |
| RecordFiles | `Manufacturing/RecordFiles` | panel | qvue | Open the canonical RecordFiles in production context. | canonical host record (WorkEffort, ProductBom, Facility) | RecordFiles, [crosscut §3.14](design-crosscut.md#314-chatter-and-recordfiles) | app | new | host entity and canonical key |
| ShopFloor | `Manufacturing/ShopFloor` | board | qvue | Present a plant queue and focused operator work. | WorkEffort operation/run selection | own | operator/supervisor | new | plant and work-center filters; selected operation |
| OperationExecution | `Manufacturing/ShopFloor/OperationExecution` | task | xml | Execute one operation or simple run with explicit reconciliation. | WorkEffort operation + ProductionRunLine (proposed) | own | operator | new | WorkEffort workEffortId (operation); run line |
| Instructions | `Manufacturing/ShopFloor/Instructions` | task | xml | Read and acknowledge the instruction as of the run's release time. | WorkEffortContent (instruction type, dated) | own | operator | new | WorkEffort workEffortId (operation); instruction workEffortContentId |
| AssemblyViewer | `Manufacturing/ShopFloor/AssemblyViewer` | task | qvue | Explore assembly geometry alongside approved textual steps. | WorkEffortContent (instruction type, dated) | own | operator | later | WorkEffort workEffortId (operation); instruction workEffortContentId |
| WallDisplay | `Manufacturing/ShopFloor/WallDisplay` | board | qvue | Show authorized station status without personal or cost data. | production queue projection | own | plant display | later | plant and work-center filters |
| BillsOfMaterials | `Manufacturing/BillsOfMaterials` | list | xml | Find manufacturing methods and effective revisions. | mantle.product.bom.ProductBom / ProductBomItem (proposed) | own | app; edits method engineer | parity | ProductBom rows; list find parameters |
| BillOfMaterialsDetail | `Manufacturing/BillsOfMaterials/BillOfMaterialsDetail` | detail | xml | Maintain dated components, operations and outputs. | mantle.product.bom.ProductBom + ProductBomItem (proposed) | own | method engineer; release method approver | parity | ProductBom productBomId; as-of date |
| BillOfMaterialsExplosion | `Manufacturing/BillsOfMaterials/BillOfMaterialsDetail/BillOfMaterialsExplosion` | report | xml | Explain multi-level quantity requirements, with Products' cost roll-up beside them. | proposed dated BOM explosion | own | app | new | BOM, quantity/UOM and as-of date |
| BillOfMaterialsCompare | `Manufacturing/BillsOfMaterials/BillOfMaterialsDetail/BillOfMaterialsCompare` | report | xml | Compare revisions without rewriting released work. | ProductBomItem lines and WeatRoutingComp rows at two dates (proposed) | own | app | new | BOM, two dates and comparison quantity |
| WhereUsed | `Manufacturing/BillsOfMaterials/WhereUsed` | report | xml | Trace a component into affected current and historical methods. | ProductAssoc + ProductBomItem (proposed) | own | app | parity | component, organization and effectivity |
| Routings | `Manufacturing/Routings` | list | xml | Find reusable routing templates and their releases. | mantle.work.effort.WorkEffort (WepRouting) | own | method engineer | new | WorkEffort rows (WepRouting); list find parameters |
| RoutingDetail | `Manufacturing/Routings/RoutingDetail` | detail | xml | Define operation sequence, resources and instructions. | WorkEffort WepRouting + dated WeatRoutingComp rows | own | method engineer | new | routing, as-of date and selected operation |
| OperationTemplates | `Manufacturing/Routings/OperationTemplates` | list | xml | Maintain reusable operations and their published instructions. | WorkEffort WepRoutingTask + WorkEffortContent | own | method engineer | new | WorkEffort rows (WepRoutingTask); list find parameters |
| Product360 | `Manufacturing/Products/Product360` | 360 | xml | Open the canonical Product360 in production context. | mantle.product.Product | Product360, [crosscut §3.5](design-crosscut.md#35-product360) | app | parity | Product productId |
| WorkCenters | `Manufacturing/WorkCenters` | list | xml | Find plant resources and capacity exceptions. | mantle.facility.Facility + WorkCenter (proposed) | own | planner/resource administrator | new | Facility rows; list find parameters |
| FacilityDetail | `Manufacturing/WorkCenters/FacilityDetail` | detail | xml | Open the canonical FacilityDetail in production context. | mantle.facility.Facility | FacilityDetail, [crosscut §3.10](design-crosscut.md#310-facilitydetail-and-equipmentdetail) | app | parity | Facility facilityId |
| Equipment | `Manufacturing/WorkCenters/Equipment` | list | xml | Find production equipment and active restrictions. | mantle.product.asset.Asset | own | app | parity | Asset rows; list find parameters |
| EquipmentDetail | `Manufacturing/WorkCenters/Equipment/EquipmentDetail` | detail | xml | Open the canonical EquipmentDetail in production context. | mantle.product.asset.Asset | EquipmentDetail, [crosscut §3.10](design-crosscut.md#310-facilitydetail-and-equipmentdetail) | app | parity | Asset assetId |
| ResourceCalendar | `Manufacturing/WorkCenters/Calendar` | calendar | qvue | Open the canonical ResourceCalendar in production context. | WorkEffort / Calendar context | Calendar, [crosscut §3.13](design-crosscut.md#313-calendar-and-schedules) | app | new | calendar/resource and date range |
| Inspections | `Manufacturing/Quality/Inspections` | list | xml | Find in-process, final and reinspection work. | mantle.product.quality.QualityInspection (proposed) | own | app | new | QualityInspection rows; list find parameters |
| QualityInspection | `Manufacturing/Quality/QualityInspection` | task | xml | Open the canonical QualityInspection in production context. | mantle.product.quality.QualityInspection (proposed) | QualityInspection, [crosscut §3.19](design-crosscut.md#319-qualityinspection-and-inspectiontemplates) | app | new | inspection and source identity |
| InspectionTemplates | `Manufacturing/Quality/InspectionTemplates` | settings | xml | Open the canonical InspectionTemplates in production context. | InspectionTemplate / InspectionTemplateItem (proposed) | InspectionTemplates, [crosscut §3.19](design-crosscut.md#319-qualityinspection-and-inspectiontemplates) | app | new | template and as-of date |
| ScrapLoss | `Manufacturing/Quality/ScrapLoss` | list | xml | Record and review scrap, process loss and rework. | mantle.work.production.ProductionLoss (proposed) | own | app | new | ProductionLoss rows; list find parameters |
| Downtime | `Manufacturing/Quality/Downtime` | list | xml | Capture reason-coded production stops and recovery. | mantle.work.production.ProductionDowntime (proposed) | own | app | new | ProductionDowntime rows; list find parameters |
| Nonconformances | `Manufacturing/Quality/Nonconformances` | list | xml | Manage findings and corrective action without duplicating cases. | Request + proposed QualityNonconformance | own | quality inspector/verifier; quality administrator for setup | later | QualityNonconformance rows; list find parameters |
| Gauges | `Manufacturing/Quality/Gauges` | list | xml | Track inspection instruments and calibration evidence. | Asset + proposed GaugeCalibration | own | quality inspector/verifier; quality administrator for calibration records | later | Asset rows; list find parameters |
| RequestDetail | `Manufacturing/Quality/RequestDetail` | detail | xml | Open the canonical RequestDetail in production context. | mantle.request.Request | RequestDetail, [crosscut §3.11](design-crosscut.md#311-requestdetail) | app | new | Request requestId |
| WorkItemDetail | `Manufacturing/Quality/WorkItemDetail` | detail | xml | Open the canonical WorkItemDetail in production context. | mantle.work.effort.WorkEffort | WorkItemDetail, [crosscut §3.12](design-crosscut.md#312-workitemdetail) | app | new | WorkEffort workEffortId |
| SupplyPlanning | `Manufacturing/Planning/SupplyPlanning` | split | xml | Open the canonical SupplyPlanning in production context. | PlanningRun / PlanningSuggestion / RequirementSupply (proposed) | SupplyPlanning, [crosscut §3.20](design-crosscut.md#320-supplyplanning) | app | new | run, facilities and selected requirements |
| InventoryAvailability | `Manufacturing/Planning/InventoryAvailability` | list | xml | Open the canonical InventoryAvailability in production context. | Asset / reservations / projected inventory | InventoryAvailability, [crosscut §3.7](design-crosscut.md#37-inventoryavailability) | app | parity | product/facility/lot filters; asset selection |
| ProductionSchedule | `Manufacturing/Planning/ProductionSchedule` | calendar | qvue | Schedule operation slots against resources and calendars. | WorkEffort operations + WorkCenter capacity (proposed) | own | scheduler | new | plant, work centers and date range; selected operation |
| Capacity | `Manufacturing/Planning/Capacity` | report | xml | Explain capacity and scheduling overloads. | proposed WorkCenter load projection | own | app | new | report parameters |
| DemandForecasts | `Manufacturing/Planning/DemandForecasts` | editor | xml | Version forecast demand before using it in a shared plan. | proposed ProductionForecast | own | planner | later | ProductionForecast forecast and version |
| MasterSchedule | `Manufacturing/Planning/MasterSchedule` | editor | xml | Approve target production by item and period. | proposed ProductionMasterSchedule | own | planner | later | ProductionMasterSchedule schedule and version |
| FiniteSchedule | `Manufacturing/Planning/FiniteSchedule` | wizard | xml | Review an optimization proposal before changing scheduled work. | proposed ProductionScheduleProposal | own | scheduler | later | ProductionScheduleProposal proposal |
| SubcontractOperations | `Manufacturing/Subcontracting/SubcontractOperations` | list | xml | Track outside processing and supplied components. | WorkEffort operation + OrderItemWorkEffort | own | planner; buyer for procurement actions | new | WorkEffort rows (operations); list find parameters |
| SubcontractDetail | `Manufacturing/Subcontracting/SubcontractDetail` | detail | xml | Coordinate materials, purchased work and accepted output. | WorkEffort + proposed ProductionSubcontract | own | planner; buyer/finance scoped actions | new | WorkEffort workEffortId (operation) |
| Supplier360 | `Manufacturing/Subcontracting/Supplier360` | 360 | xml | Open the canonical Supplier360 in production context. | mantle.party.Party | Supplier360, [crosscut §3.3](design-crosscut.md#33-supplier360) | app | new | Party partyId |
| OrderDetail | `Manufacturing/Subcontracting/OrderDetail` | detail | xml | Open the canonical OrderDetail in production context. | mantle.order.OrderHeader | OrderDetail, [crosscut §3.6](design-crosscut.md#36-orderdetail) | app | parity | OrderHeader orderId; part and item selection |
| ShipmentDetail | `Manufacturing/Subcontracting/ShipmentDetail` | detail | xml | Open the canonical ShipmentDetail in production context. | mantle.shipment.Shipment | ShipmentDetail, [crosscut §3.8](design-crosscut.md#38-shipmentdetail) | app | parity | Shipment shipmentId |
| CustomerMaterialJobs | `Manufacturing/Subcontracting/CustomerMaterialJobs` | list | xml | Manage inward processing of customer-owned material. | WorkEffort + proposed ProductionSubcontract | own | planner | later | WorkEffort rows; list find parameters |
| Batches | `Manufacturing/Batches` | list | xml | Group compatible operations for shared setup. | mantle.work.production.ProductionBatch (proposed) | own | planner/supervisor | later | ProductionBatch rows; list find parameters |
| BatchDetail | `Manufacturing/Batches/BatchDetail` | detail | xml | Release, execute and dissolve a setup-sharing group. | mantle.work.production.ProductionBatch (proposed) | own | planner/supervisor | later | ProductionBatch batchId |
| ProductionSettings | `Manufacturing/Settings` | settings | xml | Set controlled organization and plant production defaults. | proposed ProductionPolicy | own | production/resource administrator | new | organization and plant |
| ReasonCodes | `Manufacturing/Settings/ReasonCodes` | settings | xml | Maintain meaningful loss, downtime and amendment reasons. | proposed production reason enums/policy | own | production/resource administrator | new | reason rows |
| Approvals | `Manufacturing/Approvals` | list | xml | Open the canonical Approvals in production context. | approval context | Approvals, [crosscut §3.15](design-crosscut.md#315-approvals-waiting) | app | new | topic and recipient filters |
| Reports | `Manufacturing/Reports` | landing | xml | Open production reports with consistent filters. | production reporting context | own | app | new | none |
| WorkOrderStatusReport | `Manufacturing/Reports/WorkOrderStatusReport` | report | xml | Open, late and completed production. | proposed get#ProductionStatusReport | own | app | new | report parameters |
| MaterialReport | `Manufacturing/Reports/MaterialReport` | report | xml | Requirements, issues, unused returns and output genealogy. | proposed get#ProductionMaterialReport | own | app | new | report parameters |
| OperationPerformanceReport | `Manufacturing/Reports/OperationPerformanceReport` | report | xml | Operation time, capacity, OEE and downtime. | proposed get#OperationPerformanceReport | own | app | new | report parameters |
| LossReport | `Manufacturing/Reports/LossReport` | report | xml | Scrap, process loss and rework by cause. | proposed get#ProductionLossReport | own | app | new | report parameters |
| QualityReport | `Manufacturing/Reports/QualityReport` | report | xml | Inspection results, trends and quality holds. | proposed get#ProductionQualityReport | own | app | new | report parameters |
| ProductionCostReport | `Manufacturing/Reports/ProductionCostReport` | report | xml | Expected versus actual and WIP reconciliation. | proposed get#ProductionCostReport | own | cost/finance for value columns | new | report parameters |
| BillOfMaterialsVarianceReport | `Manufacturing/Reports/BillOfMaterialsVarianceReport` | report | xml | Released method versus actual consumption and output. | proposed get#BomVarianceReport | own | cost/finance for value columns | new | report parameters |
| PlanningReport | `Manufacturing/Reports/PlanningReport` | report | xml | Demand coverage and planning exception explanations. | proposed get#ProductionPlanningReport | own | app | new | report parameters |

## 3. Work orders

### Home

**Layout.** landing; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Summary | display | Open, WIP, late, short and completed this month | organization, plant, date range, counts, freshness | linked counters | `mantle.work.ProductionServices.get#ProductionDashboard` (proposed) | ERPNext Manufacturing workspace; research §1 |
| Queue | list | Due work and shortages | work order, product, due, work center, status, shortage | saved find links | `mantle.work.ProductionServices.find#ProductionOrders` (proposed) | FindRun.xml RunList; ERPNext workspace |
| Kpis | display | Show production measures with drill-down | OEE, utilization, on-time completion, scrap rate, WIP value, period, plant | number and chart elements; each opens its report with the same filters | `mantle.work.ProductionReportServices.get#OperationPerformanceReport` (proposed); `mantle.work.ProductionReportServices.get#ProductionStatusReport` (proposed); `mantle.work.ProductionReportServices.get#ProductionLossReport` (proposed); `mantle.work.ProductionReportServices.get#ProductionCostReport` (proposed) | research §12 dashboard widgets; ERPNext Manufacturing workspace charts |

**Actions.** New work order opens NewWorkOrder; shortages open Components or SupplyPlanning with the same organization, plant and as-of date. Counts include only authorized records; missing projection is “Unavailable” with source age, never zero shortage. Kpis are dashboard widget providers (crosscut §3.17) over the report services; WIP value shows only with Accounting's financial reader capability.

**Navigation.** Today contributes assigned overdue operations, blocked quality gates and planner exceptions; it does not create a second notification inbox.

**Source.** research §1; [FindRun](../../mr-marble/screen/SimpleScreens/Manufacturing/Run/FindRun.xml).

**Needs.** M1, M2, M10.

### WorkOrders

**Layout.** list; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Find | find | Narrow production work | organization, plant, product, status, assignee, date, short-only | date period; authorized product lookup | none | FindRun.xml RunList |
| WorkOrders | list | Compare and open orders | ID, product, planned/good/remaining, due, center, status, quality hold | saved finds; quantity+unit | `mantle.work.ProductionServices.find#ProductionOrders` (proposed) | FindRun.xml RunList; Odoo MO list |
| Selection | list, bulk | Release or hold independent runs | selected workEffortIds, expected revisions, reason | result per run | `mantle.work.ProductionServices.batch#ProductionAction` (proposed) | Odoo MO batch actions |

**Views.** List is parity. The first release also offers `view-board`, grouped by `statusId` or `facilityId`, and `view-calendar`, placing each run from estimatedStartDate to estimatedCompletionDate. A board move calls proposed `mantle.work.ProductionServices.transition#ProductionOrder`, the same permissioned transition as the Lifecycle dialog, never a generic status update. Saved Ready, Late, Blocked, Mine and By product share find parameters. Bulk action confirms release or cancellation and returns each run ID plus success, blocked or failed reason; one failure does not hide others.

**Source.** research §1, §4; [FindRun](../../mr-marble/screen/SimpleScreens/Manufacturing/Run/FindRun.xml); Odoo `odoo/addons/mrp/views/mrp_production_views.xml`.

**Needs.** M1, M2, M10.

### NewWorkOrder

**Layout.** wizard; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Identity | wizard step | Choose product, site and demand | organization, product, quantity, UOM, plant, due, requirement/source order | product lookup; conversion explanation | none | FindRun.xml NewRunForm |
| Method | wizard step | Choose simple or routed production | BOM, routing, method date, source warehouse, output location, optional assignments | BOM and routing lookups; warnings | `mantle.product.BomServices.get#BomExplosion` (proposed) | Odoo MO BOM selection; ERPNext Work Order |
| Review | wizard step | Confirm demand and draft only | converted quantity, component shortages, producible now, method revision, supply links | read-only reconciliation; producible-now column | `mantle.work.ProductionServices.create#ProductionOrder` (proposed); `mantle.product.AssetServices.get#AvailableInventory` | FindRun.xml NewRunForm; Odoo BOM structure producible quantity |

**Actions.** Create produces `WepProductionRun`, `WetEvent`, `WeInPlanning`; the new coordinator scopes organization/facility and registers demand provenance. Simple runs have no synthetic operation. `create#ProductionOrder` sets `WorkEffort.ownerPartyId` to the organization on the run, and release sets it on each operation child; without it the issue hook books component issues to COGS (R-SA-03). It calls the existing `mantle.work.ManufacturingServices.create#ProductionRun` internally, without `produceProductId` or `consumeProductId`, so no legacy `PatMfgBom` consume rows are written (D15, R-MFG-01). It then writes the run's draft `ProductionRunLine` material and output lines from the selected BOM and routing as of the method date, and the `WorkEffortProduct` `WeptConsume` and `WeptProduce` rows that planning reads (R-SA-05). It calls proposed `mantle.product.ProductServices.check#ProductUsable` (Products) with usage Produce and refuses a product that is not usable (D19). The Review step's producible-now column is the quantity buildable from usable stock per plant, computed from `get#AvailableInventory` over the explosion (R-MFG-30). SupplyPlanning invokes this same create contract; conversion does not release. A missing BOM allows explicit manual material lines under production-editor authority. Duplicate request identity returns the existing draft.

**States.** Invalid variants, a BOM with no released lines at the method date, cyclic BOM or missing conversion prevent Create. A shortage permits draft creation with a blocking release finding unless policy authorizes staged release.

**Source.** research §4; [create#ProductionRun](../../mr-mantle/service/mantle/work/ManufacturingServices.xml); ERPNext `erpnext/manufacturing/doctype/work_order/work_order.json`.

**Needs.** M1, M2, M3, M4, M10.

### WorkOrderDetail

**Layout.** detail; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Header | display | Show committed identity and lifecycle | workEffortId, product, revision, status, planned/good/remaining, quality gate | status bar | `mantle.work.ManufacturingServices.get#ProductionRunDisplayInfo`; `mantle.work.ProductionServices.get#ProductionOrder` (proposed) | EditRun.xml UpdateRun |
| Lifecycle | dialog | Release, unrelease, start, hold, complete or cancel | workEffortId, expectedRevision, action, reason, operationKey, effectiveDate | impact preview | `mantle.work.ProductionServices.transition#ProductionOrder` (proposed); `mantle.work.ProductionServices.release#ProductionOrder` (proposed) | Odoo MO confirmation/completion; Dolibarr cancellation |

**Sections and tabs.** Overview, Components, Materials, Operations (routed only), Quantities, Time, By-products, Quality, Costs and Notes/files are the routes below. The Notes/files tab embeds the `chatter` and `record-files` elements with recordEntity WorkEffort; they load the hidden `Manufacturing/Chatter` and `Manufacturing/RecordFiles` subscreens. Header links Product360, source OrderDetail, FacilityDetail and financial evidence; finance links disappear without financial read authority.

**Actions.** Release freezes the run's lines and stamps its release time and frozen standard cost, audit-logged fields of the run; the method, policy and estimate are read as of that time. Release calls `check#ProductUsable` again and revalidates the draft's lines against the BOM and routing. With no later release of either since the draft's method date, the lines are kept. A later release returns a finding and offers a re-explosion as of now, which rewrites the draft lines and the `WeptConsume`/`WeptProduce` rows (R-SA-12). Release then rewrites those rows from the frozen lines (R-SA-05). Start requires release and applicable safety/quality/material checks. Hold records a reason without silently pausing the person timer. Complete requires a good/remaining/loss reconciliation, required verified inspections, settled operations and material disposition. A ProductionPolicy flag, off by default, lets the final output receipt reconcile and complete in the same atomic service with the same evidence (§13). Close is not a Manufacturing action: Accounting's proposed `ironstone.accounting.ProductionCostServices.post#CostClose` calls `transition#ProductionOrder` (Close) in the same transaction as the cost posting (D12, R-SA-11). After close, a late cost event is accepted only as an adjustment event, which a later proposed `ironstone.accounting.ProductionCostServices.preview#CostClose` picks up in adjustment mode. Cancellation of an unposted draft is simple; any posted stock/time/cost creates a reviewed reversal or residual-close plan, never deletion. Clone creates a new draft through create#ProductionOrder; it never clones postings or live timers.

**States.** Run labels map to existing `WeInPlanning` Draft, `WeApproved` Released, `WeInProgress` Running, `WeOnHold` Paused, `WeComplete` Completed, `WeClosed` Closed, `WeCancelled` Cancelled. New transition guards must respect the existing status-flow graph and provide explicit reopen/correction services where a generic transition is absent. Hold before start needs a seeded `WeApproved`→`WeOnHold` transition, its resume as released a seeded `WeOnHold`→`WeApproved`, and unrelease a seeded `WeApproved`→`WeInPlanning` transition (M4 seed data); unrelease is allowed only while no stock, time or quantity fact exists. The guards refuse the generic `WeInPlanning`→`WeComplete` transition, and, once cost is posted, `WeComplete`→`WeInProgress` and `WeClosed`→`WeInPlanning` (R-MFG-11, R-SA-11). App access alone grants no transition.

**Source.** research §4; [EditRun](../../mr-marble/screen/SimpleScreens/Manufacturing/Run/EditRun.xml); [WorkEffort model](../../mr-mantle/entity/WorkEffortEntities.xml); Dolibarr `htdocs/mrp/mo_production.php`.

**Needs.** M1, M2, M4, M8.

### Overview

**Layout.** detail; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| UpdateRun | single | Maintain editable header fields | name, priority, estimated dates, facility, description, expectedRevision | date-time; authorized facility | `mantle.work.ProductionServices.store#ProductionOrder` (proposed) | EditRun.xml UpdateRun |
| Equipment | list, editable rows | Assign equipment within center capability | assetId, from/thru dates, allocation, status | asset lookup | `mantle.work.ProductionServices.store#ProductionEquipment` (proposed) | EditRun.xml AddEquipment; EquipmentList |
| People | list, editable rows | Assign qualified operators/supervisor | partyId, roleTypeId, from/thru dates, allocation | party lookup | `mantle.work.WorkEffortServices.add#WorkEffortParty`; `mantle.work.WorkEffortServices.remove#WorkEffortParty`; guarded assignment transition | EditRun.xml AddPartyAssignForm; UpdateAssignForm |

**Actions.** Draft dates and equipment may be edited; after release an approved schedule change records a revision without changing the frozen method. Qualification, overlap and blocked-equipment checks run server-side. Assignment does not confer stock, cost or release permissions.

**Navigation.** Equipment opens the canonical EquipmentDetail; person entries link the existing Commons/Projects person context.

**Source.** research §3–§4; [EditRun](../../mr-marble/screen/SimpleScreens/Manufacturing/Run/EditRun.xml).

**Needs.** M1, M2, M4, M5.

### Components

**Layout.** detail; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Components | list | Show remaining demand per stable line | line ID, operation, product, required/issued/returned/remaining, UOM, shortage | availability drill-down | `mantle.work.ManufacturingServices.get#ProductionRunProduceConsumeDetail`; `mantle.work.ProductionServices.get#ProductionMaterials` (proposed) | RunProducts.xml ConsumeList |
| AddMaterial | dialog | Add manual material while draft | productId, operation, quantity, UOM, source facility, instruction | product lookup | `mantle.work.ProductionServices.store#ProductionMaterial` (proposed) | RunProducts.xml AddConsumeForm |
| Substitute | dialog | Request a traceable alternate | original line, alternative product (from the BOM item's substitution rule), converted quantity, factor, reason, approver | side-by-side specification/availability | `mantle.work.ProductionServices.substitute#ProductionMaterial` (proposed) | Odoo component substitution; ERPNext alternate item |

**Actions.** Issue and Return open MaterialIssueReceipt against the selected stable run line; they post through proposed `mantle.work.ProductionServices.issue#ProductionMaterial` and `mantle.work.ProductionServices.return#UnusedMaterial` (MaterialIssueReceipt). Stage opens Warehouse Transfers/Move, or a `ShpTpTransfer` between facilities, with the run and its products fixed; it moves stock line-side through `mantle.product.AssetServices.move#Asset` under the Warehouse posting guard. Issue then posts from wherever the stock is; there is no WIP stock location (R-MFG-03, §13). Required includes approved scrap allowance; actual scrap is separate and never silently offsets an issue. Substitute requires an allowed alternative, compatible UOM/specification, revision check and supervisor approval; after release it creates an amendment with original requirement and actual item, preserving genealogy/cost differences, through proposed `mantle.work.ProductionServices.amend#ProductionOrder` (R-MFG-36). Candidates come from the BOM item's substitution rule; Products `PatEquivalent` rows are candidates only when that rule allows equivalents (R-PRD-31). `substitute#ProductionMaterial` adds a `WeptConsume` row for the substitute and reduces the original's, so planning does not count the demand twice and the issue of the substitute is accepted (R-SA-05). A rejected or quarantine lot cannot be chosen: the issue guard checks the asset's `statusId`, because `issue#AssetToWorkEffort` does not. Postponed material or a pick shortfall creates an exception/planning handoff, not untracked negative stock.

**Source.** research §2, §4, §5; [RunProducts](../../mr-marble/screen/SimpleScreens/Manufacturing/Run/RunProducts.xml); [ManufacturingServices](../../mr-mantle/service/mantle/work/ManufacturingServices.xml).

**Needs.** M1, M2, M4, M10.

### MaterialIssueReceipt

**Context passed.** Mount at `Manufacturing/WorkOrders/WorkOrderDetail/MaterialIssueReceipt`, and open from ShopFloor/OperationExecution with `appRoot=Manufacturing`, organization, run, operation, frozen material/output run line ID, run revision, action mode, source/destination facility and permitted lot/serial policy. Crosscut row (§3.9): tabs Job, Issue, Receive, Return-unused and History; filters fixed to the released run/operation and production facility; actions issue, receive output, return unused and preview backflush, with corrections as linked reversals; emphasis on completion and material reconciliation. Show required, issued, unused returned, good received and loss separately. Modes issue, return unused, receive output and preview backflush share the canonical stock transaction, operation identity, authorization and Accounting handoff; a correction is a linked reversal, not a mode (R-MFG-19). Compact operator presentation changes no service semantics. Baselines: RunProducts IssueAssetForm/ReceiveAssetForm; RunConsumed IssueAssetForm/ConsumeAssetForm/IssuedAssetForm; RunProduced ReceiveAssetForm/ReceivedAssetForm; ConsumeAsset/ConsumeProduct ConsumeAssetForm; ProduceAsset ReceiveAssetForm. The service direct-use coverage belongs to the canonical definition. The stock primitives stay the canonical ones; Manufacturing owns the production guards that wrap them (M2):

- **Issue** calls proposed `mantle.work.ProductionServices.issue#ProductionMaterial` over `mantle.product.AssetServices.issue#AssetToWorkEffort`. It always creates a new AssetIssuance per operation key and material line and never adds to an earlier issuance (D13). It refuses an asset whose `statusId` is not `AstAvailable`, and an asset whose owner is not the run owner (R-SA-03).
- **Return unused** calls proposed `mantle.work.ProductionServices.return#UnusedMaterial`. It posts a new receipt fact through `mantle.product.AssetServices.receive#Asset`: into the original asset, or into a new asset at the chosen destination with the original `acquireCost`, with workEffortId = the run and proposed `AssetReceipt.sourceAssetIssuanceId`. The receipt hook then posts Dr Inventory, Cr WIP in the open period at the original cost (D13, R-SA-02).
- **Receive output** calls proposed `mantle.work.ProductionServices.receive#ProductionOutput` over `receive#Asset`. It passes `acquireCost` = the run's frozen standard unit cost (its effective-dated `productStandardCostId`, an audit-logged run field; R-PRD-29). With no approved standard it passes cost to date ÷ quantity and marks the receipt provisional; it never receives output without a cost (D12, R-SA-01). Output that needs inspection is received with `statusId` `AstQuarantine` (R-MFG-24). The GenerateTracking dialog, backed by proposed `mantle.shipment.WarehouseTaskServices.generate#TrackingIdentities` (Warehouse), proposes lot or serial numbers from the product's tracking policy before receipt, one per unit for a serialized product, with a uniqueness preview (R-MFG-29).
- **Preview backflush** shows the run lines' quantities and the lots it would issue; Confirm runs the same issue guard.
- **Corrections** are linked reversals: a new issue or receipt fact that references the original. After posting, BOSS never calls `cancel#AssetIssuance` or updates a production AssetIssuance, because the `AssetIssuanceGlRePost` hook would unpost and delete the posted transaction (R-SA-02).

Every stock movement carries the run's workEffortId; operation children never carry stock (R-SA-07). The line and operation go in proposed `AssetIssuance.productionMaterialLineId`, `AssetReceipt.productionOutputLineId` and `operationWorkEffortId` on both, each a `ProductionRunLine` or operation child (M4). The entered quantity and unit are kept in proposed `enteredQuantity`, `enteredQuantityUomId` and `appliedConversionFactor` on AssetIssuance and AssetReceipt; the stock unit is `Product.amountUomId` (R-SA-06). The existing `AssetIssuanceGlPost` and `AssetReceiptGlPost` hooks post each fact once, and Manufacturing never posts it again (D1).

### Operations

**Layout.** list; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Operations | list | Show readiness and actual progress | sequence, operation, center, predecessors, planned/actual dates, good/loss, status | readiness reason | `mantle.work.ProductionServices.get#ProductionOperations` (proposed) | Odoo mrp_workorder list; ERPNext Work Order operations |
| Reschedule | dialog | Move an unstarted operation explicitly | operationWorkEffortId, center, start/end, expectedRevision, reason | capacity conflict preview | `mantle.work.ProductionPlanningServices.schedule#ProductionOperation` (proposed) | Odoo work-order scheduling |

**Actions.** Open OperationExecution, instructions, MaterialIssueReceipt or QualityInspection. Unreleased draft operations derive from the chosen routing; release creates child WorkEfforts and immutable references. Dependency cycles are forbidden. In-flight operations may be paused or reworked, not reordered behind completed work. A simple run displays “No routing” and keeps run-level quantities/time, rather than manufacturing a fake operation.

**Source.** research §3–§5; Odoo `odoo/addons/mrp/views/mrp_workorder_views.xml`; ERPNext `erpnext/manufacturing/doctype/work_order/work_order.json`.

**Needs.** M1, M2, M4, M5.

### Quantities

**Layout.** detail; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| OutputPlan | list | List planned output and actual accepted receipts | product, planned, good, remaining, process loss, scrap, rework, UOM | reconciliation totals | `mantle.work.ManufacturingServices.get#ProductionRunProduceConsumeDetail`; `mantle.work.ManufacturingServices.get#ProducedProductComplete`; `mantle.work.ProductionServices.get#ProductionQuantities` (proposed) | RunProducts.xml ProduceList |
| AddOutput | dialog | Add output to draft plan | product, quantity, UOM, receipt facility, quality template | product lookup | `mantle.work.ProductionServices.store#ProductionOutput` (proposed) | RunProducts.xml AddProduceForm |
| Reconcile | dialog | Record a quantity event and disposition | run/operation, good, pending, processLoss, scrap, rework, reason, operationKey | good/remaining/loss arithmetic preview | `mantle.work.ProductionServices.record#ProductionQuantity` (proposed) | ERPNext Job Card completed/pending/process-loss controls |
| ChangeQuantity | dialog | Change authorized target without rewriting history | target quantity/UOM, existing completions, delta demand, reason, expectedRevision | impact preview | `mantle.work.ProductionServices.change#ProductionQuantity` (proposed) | Odoo change production quantity wizard |

**Actions.** Physical output awaiting inspection is shown as produced-held, outside accepted good and available stock. Produced-held output is received with `statusId` `AstQuarantine`. Held quantity is the quantity on hand of the source's assets in `AstQuarantine`, `AstOnHold` or `AstDefective`, because a quarantined asset still has full available-to-promise (R-MFG-24). Receive opens MaterialIssueReceipt in receive-output mode; its GenerateTracking dialog proposes lot and serial numbers (R-MFG-29). Good output becomes accepted stock only after required disposition; quantity reporting and stock receipt share one posting orchestration when coupled, with the operation identity preventing duplication. A rework quantity references a distinct rework order/operation and cannot count twice as good output. Scrap of an actual asset references its lot and disposition transaction; process loss has no fictional asset receipt. Scrap takes one of three paths (R-MFG-20). Scrap of issued components is a proposed `mantle.work.ProductionServices.record#ProductionLoss` with a scrap cost event and no stock movement, because the stock is already in WIP. Scrap of received output while the run is open is a `record#ProductionLoss` that issues the output asset back to the run, so the loss reaches production variance at cost close rather than a Warehouse scrap or shrinkage account. Process loss is a quantity event only. Free stock outside a run is scrapped in Warehouse through proposed `mantle.shipment.WarehouseTaskServices.scrap#Asset`. Partial completion leaves the run open and offers explicit Backorder or Finish remainder with approved loss. Overproduction above policy needs supervisor approval. `change#ProductionQuantity` adjusts the `WeptConsume`/`WeptProduce` rows to the new target (R-SA-05).

**States.** `set#ProducedProductQuantity` currently recreates consumes and auto-completes the run. It is an unsafe direct BOSS transition for released runs and is not the designed completion service. Posted quantities are corrected by linked events/reversals; a smaller target cannot erase completed, reserved or consumed facts.

**Source.** research §4, §5, §8; [RunProducts](../../mr-marble/screen/SimpleScreens/Manufacturing/Run/RunProducts.xml); ERPNext `erpnext/manufacturing/doctype/job_card/job_card.json`.

**Needs.** M1, M2, M4, M6, M8.

### SplitWorkOrder

**Layout.** wizard; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Allocation | wizard step | Allocate only remaining demand | source run/revision, split/backorder mode, quantity, due, plant, reason | quantity+unit | none | Odoo split/backorder wizards |
| Disposition | wizard step | Keep or reassign material and operations | remaining operation quantities, reservations, issued WIP, output links | per-line choices | `mantle.work.ProductionServices.preview#ProductionSplit` (proposed) | Odoo split production wizard |
| Confirm | wizard step | Create linked runs once | preview hash, operationKey, reviewed warnings | diff summary | `mantle.work.ProductionServices.split#ProductionOrder` (proposed) | Odoo split/backorder wizards |

**Actions.** Confirm is supervisor/planner only and atomic for one source run plus descendants. Preserve original receipts, times and WIP on their run; only explicitly unconsumed allocation moves. Backorder creates residual demand with the same immutable method revision unless a separately approved change is requested. RequirementSupply allocated quantity sums remain conserved; retry returns the existing split IDs. A batch of several source runs yields independent named results. Merging compatible drafts is `later`: drafts with the same product, method, method date and facility may merge into one run before release, never after any fact (R-MFG-40).

**Source.** research §4; Odoo `odoo/addons/mrp/wizard/mrp_production_split.py` and `mrp_production_backorder.py`.

**Needs.** M1, M2, M4, M10.

### Disassembly

**Layout.** task; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Assembly | single | Select an eligible existing assembly | assembly assetId, source workEffortId, quantity, destination, reason | asset/lot lookup | `mantle.work.ManufacturingServices.get#ConsumedAssetRemaining`; `mantle.work.ManufacturingServices.get#ProducedProductComplete` | new |
| Preview | list | Show original material quantities and reversibility | source issuance, component asset, remaining, proposed return, hold | genealogy drill-down | `mantle.work.ManufacturingServices.get#ConsumedAssetRemaining` | new |
| Confirm | dialog | Apply a guarded supported assembly reversal | workEffortId, assetId, quantity, revision, reason, operationKey | explicit reversal warning | `mantle.work.ProductionServices.reverse#SupportedAssembly` (proposed) | new |

There is no baseline form, so the full field lists follow the parameters of `breakDown#Assembly` and `get#ConsumedAssetRemaining`:

- **Assembly:** assetId (lookup limited to assets whose `acquireWorkEffortId` is a pick-assembly effort of a `PtPickAssembly` product), workEffortId (read-only, from the asset), quantity to break down (default the asset's quantity on hand), break-down date (default now; must be in an open period), destination facility and location for the returned components, reason (from ReasonCodes) and note.
- **Preview:** component productId, source assetIssuanceId, component assetId and lot, issued quantity, quantity used in assemblies, returnable quantity, proposed return quantity, unit, hold or status, and a finding per line.
- **Confirm:** workEffortId, assetId, quantity, expectedRevision, reason, operationKey and a confirmation of the reversal warning.

**Actions.** The first release supports only the reversal of a `PtPickAssembly` pick assembly with its original genealogy; do not advertise arbitrary manufacturing unbuild. Proposed guard checks owner, closed-period policy, remaining quantities, inspection holds and prior reversals. `reverse#SupportedAssembly` calls the existing `mantle.work.ManufacturingServices.breakDown#Assembly` internally, in one transaction, only after proving the legacy path is suitable. `breakDown#Assembly` unissues by current `PatMfgBom` quantities and cancels issuances, which fires the `AssetIssuanceGlRePost` hook (§13); Accounting AC-06's `repost#AssetIssuance` posts those as a dated reversing delta. It lowers the kit receipt through `update#AssetAndReceipt`, whose `repost#Asset` would unpost, delete and re-post; that reduction is a dated reversing delta in an open period too. The guard checks the current `PatMfgBom` quantities against the quantities actually issued and refuses a difference (§13). General unbuild of produced output is an Open item (§14), designed to post new receipt facts rather than cancel issuances. General disassembly of altered, sold or untraceable production is `later`, modeled as a new method and linked cost allocation, not an unconstrained negative production run.

**Source.** research §4, §14; [ManufacturingServices](../../mr-mantle/service/mantle/work/ManufacturingServices.xml).

**Needs.** M1, M2, M4, M8.

### ProductionTime

**Context passed.** Mount the existing Projects time-entry/timesheet surface filtered to the run and authorized operation children; pass organization, employee, workEffortId and cost visibility separately. Start/stop use current TimesheetServices.get#Timer/start#Timer/stop#Timer; one person has one timer suite-wide. A clock-in with another active timer offers explicit switch with stop/start confirmation. Approved/locked time is immutable until the existing timesheet return/reopen flow. Machine runtime is a separate production event, never a second employee timer. Add production work-type and run/operation context to existing records; no duplicate production timesheet. The production work types are proposed `WorkType` seeds `WktpProductionSetup`, `WktpProductionRun` and `WktpProductionRework` (M7).

**Approval and labor cost.** `mantle.work.TimesheetServices.get#TimesheetApprovers` routes by the managers of project roots, and a production run is not a project. A proposed production rule lets the run's supervisor (its `WorkEffortParty` assignment) or the person's line manager approve time on a production run (R-MFG-22). It sits behind its own ProductionPolicy flag, off by default, so Mantle's default routing is unchanged (§1.1). When a timesheet is approved, a proposed hook on `mantle.work.TimesheetServices.approve#Timesheet` (the Projects timesheet flow) calls proposed `mantle.work.ProductionServices.record#ProductionCostEvent` for each entry whose work effort is under a `WepProductionRun`. The event freezes hours × `TimeEntry.vendorHourRate`, with `vendorRateAmountId` as the rate identity. Reopening the timesheet writes a reversal event, and a rate change after approval writes a delta event. Accounting's `preview#CostClose` blocks while any entry on the run is on an unapproved timesheet (R-SA-09, D12).

### ByProducts

**Layout.** detail; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ByProducts | list, editable rows | Maintain draft coproduct plans and inspect actuals | product, quantity/UOM, operation, valuation allocation, received, loss | sum-of-allocation check | `mantle.work.ProductionServices.store#ProductionOutput` (proposed); `mantle.work.ProductionServices.get#ProductionQuantities` (proposed) | Odoo mrp_bom byproduct lines |
| AllocationReview | display | Explain expected cost distribution | estimate revision, allocation method, percentages/amounts, residual | restricted currency fields | `mantle.work.ProductionServices.get#ProductionCosts` (proposed) | Carbon job estimates versus actuals |

**Actions.** Receive opens MaterialIssueReceipt with output line and lot/serial requirements. Material byproducts are good secondary stock, while scrap is explicitly disposed; do not convert one into the other solely to force cost balance. Released allocation changes require Accounting policy approval and a new cost event, never retroactive edits of receipts. The co-product allocation method comes from Accounting's costing policy at `Accounting/Settings/CostingPolicies` (D12).

**Source.** research §2, §4, §9; Odoo `odoo/addons/mrp/views/mrp_bom_views.xml`.

**Needs.** M1, M2, M3, M4, M8.

### QualityGates

**Layout.** list; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Gates | list | Show in-process/final gates per released run | operation, template as of release, sample, lifecycle, result, hold, disposition | status text; canonical record links | `mantle.product.QualityServices.get#SourceInspectionStatus` (proposed; crosscut §3.19) | ERPNext Work Order/Job Card inspections; Carbon MES inspections |

**Actions.** Create/Open inspection uses QualityInspection; each released operation keeps its template as of its release time, so a template change never changes an existing gate. `get#SourceInspectionStatus` returns required, pending, passed or failed for a source type, ID and line; the Start and Complete guards call the same service. Failed inspection holds affected material/output and downstream operations; reinspection or approved rework keeps the failed result in history. A supervisor cannot use Complete to bypass a required verifier or disposition permission.

**Source.** research §8; ERPNext `erpnext/manufacturing/doctype/job_card/job_card.json`; Carbon `apps/mes/app/components/JobOperation/JobOperation.tsx`.

**Needs.** M1, M4, M6.

### ProductionCosts

**Layout.** report; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Costs | list | Reconcile cost components and linked source postings | material, labor, machine, overhead, outside processing, scrap, WIP, output allocation | currency; source document drill-down | `mantle.work.ProductionServices.get#ProductionCosts` (proposed) | Carbon JobEstimatesVsActuals.tsx |
| CloseReview | dialog | Resolve pending cost and accounting exceptions | run, frozen estimate, unposted entries, unvalued machine runtime, variance reasons, accounting date, revision | closed-period warning | `mantle.work.ProductionServices.review#ProductionCosts` (proposed) | ERPNext Work Order Stock Entries; Carbon estimates/actuals |

**Actions.** Cost estimator sees frozen standard estimates; finance-role users see actual value and GL links. Manufacturing review#ProductionCosts requests/reviews cost close only; [Accounting ProductionCostClose](design-accounting.md#productioncostclose) owns `ironstone.accounting.ProductionCostServices.preview#CostClose` and `post#CostClose` (proposed), actual valuation corrections and period policy. A late invoice or timesheet cost creates a linked variance/adjustment requiring an open accounting date. The design does not rewrite a closed-period issue or inflate finished stock to hide variance. `post#CostClose` posts, in one run-level transaction, the absorption entry for the events not yet in the GL (Dr WIP; Cr applied labor, applied machine and overhead, and outside-processing accrual), the co-product reallocation and the residual WIP to production variance. It never posts an issue or a receipt again, because the existing hooks already did (D12, R-SA-01). Accounting proposes the GL account types `GatLaborApplied`, `GatOverheadApplied`, `GatOutsideProcessAccrued` and `GatProductionVariance` in its AC-07 seed. `post#CostClose` also closes the run (WorkOrderDetail).

**Cost events.** Every cost fact is written by proposed `mantle.work.ProductionServices.record#ProductionCostEvent`, inside the posting transaction that causes it, with a unique source, component and revision key (D12, R-MFG-02). Material events come from the issue, return and output guards and reference the hook transactions; they never post again. Labor events come from the timesheet-approval hook at the time entry's rate (ProductionTime). Machine events come from proposed `mantle.work.ProductionServices.record#MachineRuntime` when an interval closes; runtime with no effective WorkCenterRate is recorded unvalued and listed for review (§13). The outside-processing accrual comes from service acceptance inside proposed `mantle.work.ProductionServices.receive#SubcontractOutput`, and the price variance from the bill match (R-XC-08). Overhead is not an event: Accounting's `preview#CostClose` computes it from the costing policy (R-SA-18). `review#ProductionCosts` sets the run's proposed cost-review status, an audit-logged field of the run. The run then appears in Accounting's proposed `ironstone.accounting.ProductionCostServices.find#CostCloseQueue`, which feeds Accounting Home and CloseChecks, and a Commons notification with the workEffortId and source revision goes to Accounting.

**Source.** research §9; Carbon `apps/erp/app/modules/production/ui/Jobs/JobEstimatesVsActuals.tsx`; [AssetAutoPostServices](../../mr-mantle/service/mantle/ledger/AssetAutoPostServices.xml).

**Needs.** M1, M4, M8.

### ProductionCostClose

**Context passed.** From ProductionCosts, fix workEffortId, organization and source revision
on the [Accounting-owned shared task](design-accounting.md#productioncostclose). Operational
users request review; financial readers and GL/finance approvers receive their permitted
cost evidence and preview/approve/post actions. The mount checks those capabilities without
requiring the Accounting launcher grant. All allocations, WIP and variance postings use the
single canonical service and period/retry rules; no Manufacturing cost-post endpoint is added.
Crosscut row (§3.24): the same task opened from ProductionCosts, with operational status visible;
filters fixed to the run and the authenticated organization; actions request review, with financial
actions only under the same finance capabilities; emphasis on complete run-to-ledger evidence. `post#CostClose` closes the run in the same transaction (D12). The allocation
and overhead policy lives at `Accounting/Settings/CostingPolicies` (proposed
`ironstone.accounting.ProductionCostServices.store#AllocationPolicy`); Manufacturing has no overhead setting.
The task stays Accounting's contract, built with Manufacturing's cost events, output receipt and run close
(impl-accounting §4); its close refuses a run that still has unvalued machine runtime (§13).

### Chatter

**Context passed.** The hidden `Manufacturing/Chatter` subscreen is loaded by the `chatter` element that WorkOrderDetail's Notes/files tab, BillOfMaterialsDetail and FacilityDetail embed (R-MFG-13, R-MFG-28). Crosscut row (§3.14): panes messages, activities and internal notes; host fixed to the run, operation, BOM or work-center facility; actions post internal notes, with outward publication only by explicit control; emphasis on production handoffs in the timeline. Mount canonical Chatter for the run/operation, preserving WorkEffortNote from EditRun NewNoteForm/UpdateNoteForm and the implemented request/work-item links. Show internal notes and explicit outward publication controls; no production note becomes supplier/customer-visible by app context. Timeline includes release/amendment, stock, quality and financial handoffs with access-filtered links.

### RecordFiles

**Context passed.** The hidden `Manufacturing/RecordFiles` subscreen is loaded by the `record-files` element. Crosscut row (§3.14): pane files; host fixed to one of the hosts below; actions attach evidence, with operators seeing approved instructions only; emphasis on controlled versus mutable files. Each host has a single-field key and a content entity (D25): run and operation (`WorkEffortContent`, workEffortId); routing and operation template, which are WorkEffort records too (`WorkEffortContent`); BOM (proposed `mantle.product.bom.ProductBomContent`, productBomId, M3); and work-center facility (`FacilityContent`, facilityId). A run's lines and a published instruction have no Files tab of their own: a published instruction is a dated `WorkEffortContent` row of an instruction type on its operation template, its file immutable with a checksum, so its files belong to that template. Mutable shared files and the immutable instruction used for release are labeled distinctly. Operator access permits approved instructions and attach-evidence, not arbitrary confidential drawings or cost documents. Retain file authorization on each download.

## 4. Shop floor

### ShopFloor

**Layout.** board; custom regions and terminal behavior described below.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Station | single | Choose authorized operator and station | organization, plant, center, operator, shift, ready-only | scan field; station session | `mantle.work.ProductionServices.get#ShopFloorQueue` (proposed) | ERPNext Shop Floor; Carbon MES station navigation |
| Queue | component | Show pending/running/paused/completed operations | run, operation, product, due, ready/block reason, timer state | cards; m-button; m-form widgets | `mantle.work.ProductionServices.get#ShopFloorQueue` (proposed); `mantle.work.TimesheetServices.get#Timer` | Carbon MES JobOperation; ERPNext Shop Floor |
| Actions | component | Open execution without losing station context | operationWorkEffortId, expectedRevision | large primary action; scan confirmation | navigation to OperationExecution / shared stock / quality | metasfresh mobile manufacturing jobs |

**Layout.** qvue manager board above a single selected work card, using existing `m-*` fields, buttons, dialogs and elapsed-time component. The custom part is station focus, queue refresh and one-hand navigation. Colors supplement readable status words. Manager mode shows center queues; operator mode limits assignments/skills and centers.

**Terminal.** The `.qvue` screen includes a `tui` text twin: numbered queue rows with ready/block reason, selected work summary and commands Open, Refresh, Scan, Start, Pause, Materials, Inspection, Complete and Sign out. Commands call the same transitions as browser actions; no drag gesture is required. A scan enters the same token parser as the visible input.

**Devices.** Handheld supports keyboard-wedge/barcode scan, 48 px touch targets, 18 px input text, visible focused scan field, sound plus text acknowledgment and no mandatory side drawer. Scanning identifies a job/lot; it never silently posts stock. Online-first: after a timeout, resolve operationKey status before offering Retry; offline reads are timestamped, posting is disabled, and unsent entry remains local to the user session. Kiosk identity is an authenticated person, with lock/sign-out and no shared supervisor credential. A quick operator switch on a shared station is an Open item (§14).

**Source.** research §5; ERPNext `erpnext/manufacturing/page/shop_floor/shop_floor.py`; Carbon `apps/mes/app/components/JobOperation/JobOperation.tsx`.

**Needs.** M1, M2, M4, M7.

### OperationExecution

**Layout.** task; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Work | display | Present approved work and blocking checks | run/operation, product, center, run revision and release time, planned/good/remaining, readiness | step list; elapsed timer | `mantle.work.ProductionServices.get#ProductionOperation` (proposed); `mantle.work.TimesheetServices.get#Timer` | ERPNext Job Card; Carbon MES JobOperation |
| PersonTimer | single | Start, stop or switch the existing person timer | workEffortId, work type, timestamp, current timer, reason | m-elapsed; explicit switch confirmation | `mantle.work.TimesheetServices.start#Timer`; `mantle.work.TimesheetServices.stop#Timer`; `mantle.work.TimesheetServices.update#Timer` | current Projects MyTime/TimeEntries |
| MachineRuntime | dialog | Record machine run separately from labor | operation, asset/center, from, thru, duration, mode, reason, operationKey | date-time; elapsed display | `mantle.work.ProductionServices.record#MachineRuntime` (proposed) | Carbon MES machine operation events |
| CompleteStep | dialog | Reconcile quantity and required evidence | good, pending, processLoss, scrap, rework, inspection IDs, reason, operationKey | quantity+unit; issue/receipt links | `mantle.work.ProductionServices.complete#ProductionOperation` (proposed) | ERPNext Job Card completion; Carbon MES quantity transaction |

**Actions.** Start checks dependencies, operator authorization/skills, active equipment restrictions and the configured material/inspection gate. An operation template's required skills or required acknowledgment block Start, with a supervisor override and its reason recorded; with none configured the check is a visible advisory (§13). Pause records reason and offers an explicit timer stop; it may open Downtime. Finish stops only the confirmed person timer and atomically commits the operation event and any coupled material/output posting; independent machine events may remain running only by explicit policy. Finish writes `TimeEntry.pieceCount` = the good quantity when the piece-rate policy applies (R-MFG-28). `record#MachineRuntime` writes the machine cost event through `record#ProductionCostEvent` when the interval closes, at the work center's effective `WorkCenterRate` (R-SA-18). With no effective rate it records the hours with no value, marked unvalued and listed in the cost exceptions and the cost-close queue; a review writes the event once a rate is effective on its date (§13). Materials, instructions and inspections use the canonical mounts. A failed stock/GL transaction leaves no successful completion event.

**Devices.** XML task screen has one primary action, large touch controls and scan input at phone width; terminal form renders every field/action in ordered steps. Operator can complete a simple run with no routed operations through the same task mode. Errors name the blocked predecessor, material line or inspection and preserve entered values.

**Source.** research §5; ERPNext `erpnext/manufacturing/doctype/job_card/job_card.json`; Carbon `apps/mes/app/components/JobOperation/JobOperation.tsx`; [TimesheetServices](../../mr-mantle/service/mantle/work/TimesheetServices.xml).

**Needs.** M1, M2, M4, M6, M7.

### Instructions

**Layout.** task; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Steps | display | Show ordered instructions and required evidence | instruction as of release, operation, step, text/image/file, hazards, required acknowledgment | approved file viewer; step navigation | `mantle.work.ProductionServices.get#ProductionInstructions` (proposed) | Carbon MES operation steps; ERPNext operation description |
| Evidence | single | Record step acknowledgment or measured input | operation, workEffortContentId (the instruction row), stepId, actor, value/unit, file reference, operationKey | file attachment; checkbox/signature acknowledgment | `mantle.work.ProductionServices.record#InstructionStep` (proposed) | Carbon MES operation steps |

**Actions.** Next verifies required prior inputs; attachment upload uses Commons storage and permissions. Quality characteristics link to the canonical inspection instead of creating competing measurements. An acknowledgment is a record of its own: who, when and which `WorkEffortContent` row. A newly published instruction offers a revision warning; an active run's operation keeps the instruction as of its release time until an approved amendment. Terminal displays ordered text plus authorized file URLs/filenames and accepts the same acknowledgment and values. Handheld supports one step at a time with visible run/operation identity.

**Source.** research §2, §5; Carbon `apps/mes/app/components/JobOperation/JobOperation.tsx`.

**Needs.** M1, M4, M7.

### AssemblyViewer

**Layout.** task; custom regions and terminal behavior described below.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Assembly | component | Show selected parts and step visibility | model file as of release, step, part, annotation, viewpoint | 3D canvas; m-* step controls | `mantle.work.ProductionServices.get#ProductionInstructions` (proposed) | Carbon MES model/assembly instruction viewer |
| StepActions | component | Acknowledge work through the same instruction contract | stepId, actor, evidence, operationKey | same controls as Instructions | `mantle.work.ProductionServices.record#InstructionStep` (proposed) | Instructions screen |

**Layout.** qvue canvas plus step text and part list. The model is optional evidence; every safety-critical instruction has text.

**Terminal.** Ordered part tree, part identifiers, textual annotations, approved drawing link and the same acknowledgment form replace the canvas. No camera orientation or graphical selection is required to complete a step. Handheld falls back to Instructions on resource-limited devices.

**Source.** research §5, §14 (3D instructions); Carbon MES `apps/mes/app/components/JobOperation/JobOperation.tsx`.

**Needs.** M1, M4, M7.

### WallDisplay

**Layout.** board; custom regions and terminal behavior described below.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Board | component | Show line progress and blocks | plant, center, run, product, state, due, progress, data age | large status cards | `mantle.work.ProductionServices.get#ShopFloorQueue` (proposed) | ERPNext Shop Floor manager board |

**Layout.** qvue read-only rotating center groups with explicit stale/offline banner. A display role is restricted to a plant and cannot inherit operator write authority.

**Terminal.** Plain auto-refresh table by center with explicit last refresh time; Refresh and Filter are the only actions. No operator names, supplier prices or customer details appear unless separately authorized.

**Source.** research §1, §5; ERPNext `erpnext/manufacturing/page/shop_floor/shop_floor.py`.

**Needs.** M1, M7.

## 5. BOMs and routings

### BillsOfMaterials

**Layout.** list; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Find | find | Select effective product structures | product, variant, organization, type, status, effective date, revision | product lookup | none | Catalog Product EditAssocs; Odoo BOM list |
| BillsOfMaterials | list | Show released and draft methods | BOM ID, product, base quantity/UOM, last release date, draft lines, routing | release badge | `mantle.product.BomServices.find#Boms` (proposed) | Odoo mrp_bom list; ERPNext BOM list |
| NewBillOfMaterials | dialog | Create a draft product method | productId, organization, base quantity/UOM, BOM type, name | product lookup | `mantle.product.BomServices.store#Bom` (proposed) | Odoo mrp_bom form |

**Actions.** Open, clone revision, import legacy associations and where-used. Import reads the existing `PatMfgBom` rows of a manufactured product into draft lines, with explicit validation before their first release; release never writes `PatMfgBom` back (D15). `PtPickAssembly` kit products are excluded from this list and from the import: their components stay `PatMfgBom` rows, edited in Products' Product360 Kit components pane through proposed `mantle.product.ProductServices.store#KitComponent` (D15, R-PRD-10). A list does not imply revision control already exists. Product360's BOM tab mounts BillOfMaterialsDetail and related editors from this file. Products retains product identity and permissions.

**Source.** research §2; [ProductAssoc](../../mr-mantle/entity/ProductDefinitionEntities.xml); Odoo `odoo/addons/mrp/views/mrp_bom_views.xml`.

**Needs.** M1, M3.

### BillOfMaterialsDetail

**Physical definition and mounts.** Proposed `screen/Shared/BillOfMaterialsDetail.xml` is owned by this design and mounted at `Manufacturing/BillsOfMaterials/BillOfMaterialsDetail` and Product360's BOM tab with product/organization/BOM fixed. Supporting `Shared/BillOfMaterialsExplosion.xml`, `Shared/BillOfMaterialsCompare.xml` and `Shared/WhereUsed.xml` are also defined here; app routes in the registry are their Manufacturing mounts. Product360 mounts four of these screens (BillOfMaterialsDetail, BillOfMaterialsExplosion, WhereUsed and RoutingDetail), plus BillOfMaterialsCompare when Products needs compare (R-XC-24). Opening these from Products requires method/record capability, not the Manufacturing app-root grant. Products builds them with its context, over the M3 records and services (impl-products P8); Manufacturing adds its context.

**Layout.** detail; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Header | single | Maintain the method's audit-logged fields | productBomId, product, organization, base quantity/UOM, phantom, routing, leadTimeDays, prepareDays, expectedRevision | routing lookup | `mantle.product.BomServices.store#Bom` (proposed) | Odoo BOM form; ERPNext BOM |
| Components | list, editable rows | Define consumption with stable line identity | bomItemId, product/variant, quantity/UOM, scrapFactor, consuming operation, applicability, instruction, substitution rule, from/thru | product lookup; unit conversion | `mantle.product.BomServices.store#BomItem` (proposed) | Catalog/Product/EditAssocs AddAssocToForm/AssocToListForm; Odoo BOM lines |
| Outputs | list, editable rows | Define byproducts and expected allocation | bomItemId, role, product, quantity/UOM, operation, cost allocation, from/thru | allocation totals | `mantle.product.BomServices.store#BomItem` (proposed) | Odoo BOM byproducts |
| Notes | component | Discuss the method and attach its evidence | messages, internal notes, files | embedded `chatter` and `record-files`, recordEntity ProductBom | existing Commons §15 and §9 services | Commons Chatter and RecordFiles |
| ValidateRelease | dialog | Validate the draft lines and release them | productBomId, expectedRevision, release date, reason, validation findings | dependency/loop and overlap findings | `mantle.product.BomServices.validate#BomDraft` (proposed); `mantle.product.BomServices.release#BomDraft` (proposed) | Carbon make-method version status; Odoo BOM checks |

**Sections and tabs.** Header, Components, Operations (RoutingDetail mount with the BOM's routing fixed), By-products, Instructions, Cost estimate, Where used, Revision history and Notes (Chatter and files, R-MFG-28). Copy operations from another method creates draft copies with source identity; it never modifies the source or active runs.

**Actions.** Release requires an acyclic explosion, valid item/unit conversions, nonoverlapping effectivity for the chosen organization/product/variant/method key, valid consuming operations and an allocation policy. A release is an approval decision, a record of its own (approver, time, reason and the lines it stamped), that stamps the draft lines' from date and the replaced lines' thru date. Released lines are never edited; a correction is a draft of new lines that a later release stamps. A newly released BOM warns affected open runs but never silently replaces their lines. Product360's generic association editor cannot write `PatMfgBom` for a manufactured product; manufacturing lines are edited here and cannot bypass release guards (D15). Phantom BOM is an explicit, audit-logged method field of the header; it expands materials at release without artificial stock receipt. `PtPickAssembly` remains a separate pick-kit behavior: its kit components are Products' Kit components pane and are excluded from this screen (D15). The header's proposed `leadTimeDays` and `prepareDays`, audit-logged method fields, give SupplyPlanning its release dates; ProductionSettings chooses whether they are entered or derived from the routing standards (R-MFG-31).

**Navigation.** Cost estimate opens Products CostRollup for this BOM as of the selected date; prices use the shared resolver and supplier price scope. Work-center rates and standard times reach Products through proposed `mantle.work.RoutingServices.get#OperationCostBasis`, which returns the effective WorkCenterRate × standards (R-MFG-25). No BOM edit revalues current stock.

**Source.** research §2; [ProductAssoc](../../mr-mantle/entity/ProductDefinitionEntities.xml); Odoo `odoo/addons/mrp/views/mrp_bom_views.xml`; ERPNext `erpnext/manufacturing/doctype/bom/bom.json`.

**Needs.** M1, M3, M4, M8.

### BillOfMaterialsExplosion

**Layout.** report; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Parameters | single | Select the exact expansion context | productBomId, target quantity/UOM, asOfDate, organization, plant, variant, include costs | date; quantity with unit | `mantle.product.BomServices.get#BomExplosion` (proposed); legacy comparison `mantle.work.ManufacturingServices.get#ProductBomDetail` | ERPNext exploded BOM; Dolibarr net needs |
| Explosion | list | Show provenance for every expanded requirement | path, depth, product, gross/net, scrap allowance, unit conversion, chosen BOM, producible now, cost columns | `view-tree` indented rows; parent paths | `mantle.product.BomServices.get#BomExplosion` (proposed); `mantle.product.CostServices.preview#ProductCostRollup` (proposed, Products) for cost columns; `mantle.product.AssetServices.get#AvailableInventory` for producible now | ERPNext BOM exploded items; Odoo structure report |

**Actions.** Export and open component Product360 or SupplyPlanning; explosion is explanatory and creates no supply. `get#BomExplosion` returns quantities, scrap, conversions and operation standards only. The cost columns, shown with cost read authority, are Products' `preview#ProductCostRollup` output, so there is one cost calculator (R-MFG-25). The producible-now column is the quantity buildable from usable stock per plant (R-MFG-30). Circular path, a component BOM with no released lines at the date, missing conversion or excessive recursion returns named branch findings and marks the whole total incomplete; invalid branches cannot be released or converted. Independent roots in a report may continue, each explicitly successful/failed. Legacy get#ProductBomDetail is single-level and ignores effective dates/scrap; it is shown only for migration comparison, not used as the new recursive calculator.

**Source.** research §2, §6; [ManufacturingServices](../../mr-mantle/service/mantle/work/ManufacturingServices.xml); ERPNext `erpnext/manufacturing/doctype/bom/bom.json`; Dolibarr `htdocs/bom/bom_net_needs.php`.

**Needs.** M1, M3, M8, M10.

### BillOfMaterialsCompare

**Layout.** report; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Compare | single | Choose two explicit dates | productBomId, left date, right date, quantity/UOM, include costs | release-date choosers | `mantle.product.BomServices.compare#BomDates` (proposed) | ERPNext BOM comparison tool; Carbon versioned make method |
| Changes | list | Explain adds/removes and semantic changes | bomItemId/operation identity, changed field, before, after, impacted runs | change labels; row drill-down | `mantle.product.BomServices.compare#BomDates` (proposed) | ERPNext BOM comparison |

**Actions.** Create draft lines, export change list or request a released-run amendment through proposed `amend#ProductionOrder`, under the amendment policy (§13). `later`: when Products ChangeNotices is enabled, the amendment action opens Products ChangeNoticeDetail (R-MFG-32). Differences use stable line/operation identifiers; deleted-and-readded lines retain provenance. Impact list excludes confidential runs rather than exposing their quantities.

**Source.** research §2; ERPNext `erpnext/manufacturing/doctype/bom/bom.json`.

**Needs.** M1, M3, M4.

### WhereUsed

**Layout.** report; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Find | find | Select component and effectivity | productId, variant, asOfDate, organization, include archived | product lookup | none | Catalog/Product/EditAssocs AssocFromListForm |
| Parents | list | Show direct and transitive usage paths | parent product, BOM, item path, quantity/UOM, effective dates, released-run count | `view-tree` indented paths | `mantle.product.BomServices.get#BomWhereUsed` (proposed) | EditAssocs.xml AssocFromListForm; Odoo BOM structure |

**Actions.** Open parent method, affected runs or change review. Historical query reads the BOM lines as of its date and the released runs' own lines; deleting a current catalog association cannot remove past usage evidence. Kit usage (`PatMfgBom` rows of `PtPickAssembly` products) is listed read-only, with a link to Products' Kit components pane. `later`: a bulk action, Draft replacement revisions, creates draft lines in the selected methods with the component replaced, through `store#BomItem`, and returns a result per method (R-MFG-32).

**Source.** research §2; [EditAssocs](../../mr-marble/screen/SimpleScreens/Catalog/Product/EditAssocs.xml).

**Needs.** M1, M3, M4.

### Routings

**Layout.** list; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Find | find | Filter routing templates | name, product, center, status, effective date | authorized lookup | none | ERPNext Routing |
| Routings | list | Open templates and revision history | routing ID, last release date, status, operations, draft operations | revision history link | `mantle.work.RoutingServices.find#Routings` (proposed) | ERPNext routing/routing.json |
| NewRouting | dialog | Create a draft routing | name, organization, description | text | `mantle.work.RoutingServices.store#Routing` (proposed) | ERPNext Routing |

**Source.** research §3; [WorkEffort model](../../mr-mantle/entity/WorkEffortEntities.xml); ERPNext `erpnext/manufacturing/doctype/routing/routing.json`.

**Needs.** M1, M3, M5.

### RoutingDetail

**Physical definition and mounts.** Proposed `screen/Shared/RoutingDetail.xml` is owned here and mounted at `Manufacturing/Routings/RoutingDetail`, BillOfMaterialsDetail Operations and Product360 BOM/routing context. The same date-aware forms and services serve every mount; no parallel Products routing editor is introduced.

**Layout.** detail; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Header | single | Maintain routing metadata | routing workEffortId, revision, status, organization, last release date | release status | `mantle.work.RoutingServices.store#Routing` (proposed) | ERPNext Routing; Odoo operation form |
| Operations | list, editable rows | Maintain ordered operation templates | operation template, sequence, predecessors, center/alternate, setup/run time, batch quantity, skill, from/thru | duration+unit; predecessor lookup | `mantle.work.RoutingServices.store#RoutingOperation` (proposed) | Odoo mrp_workorder/routing; ERPNext routing operations |
| Resources | list, editable rows | Declare equipment, skill and outside-process needs | operationId, asset/type, skill, quantity, supplier, service product, lead time | authorized resource lookup | `mantle.work.RoutingServices.store#RoutingResource` (proposed) | WorkEffortAssetNeeded/SkillStandard; Carbon Bill of Process |
| Release | dialog | Release the draft operations | routing workEffortId, expectedRevision, release date, reason, validation findings | dependency validation | `mantle.work.RoutingServices.release#RoutingDraft` (proposed) | Carbon make-method version release |

**Actions.** Copy operations from another routing with explicit duplicate/replace choices; validate cycles and consuming-material references before release. The routing model remains WorkEffort `WepRouting`, operation templates `WepRoutingTask`, `WeatRoutingComp` sequence and `WeptRouting` product link. The `WeatRoutingComp` rows are dated and their standards audit-logged; a release is an approval decision that stamps the draft rows' from date and the replaced rows' thru date, as a BOM release does, so a routing as of a date is its rows then. Executable children use `parentWorkEffortId` and `WeatDependsOn`, and each carries its routing operation, sequence and work center, audit-logged. Cost/hour is effective-dated work-center policy, separate from person time rates. Equipment needed and skill standards use current entities, with actual assignments on the run.

**Source.** research §3; [WorkEffortEntities](../../mr-mantle/entity/WorkEffortEntities.xml); ERPNext `erpnext/manufacturing/doctype/routing/routing.json`; Odoo `odoo/addons/mrp/views/mrp_workorder_views.xml`.

**Needs.** M1, M3, M4, M5.

### OperationTemplates

**Layout.** list; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Templates | list | Find process definitions | name, center type, skill, default time, published instruction, inspection template | saved filters | entity read; `mantle.work.RoutingServices.find#OperationTemplates` (proposed) | ERPNext Operation; Odoo operations |
| EditTemplate | dialog | Maintain one operation definition | name, setup/run standards, time UOM, base quantity/UOM, center requirement, description, required evidence, quality template | duration; template lookup | `mantle.work.RoutingServices.store#OperationTemplate` (proposed) | ERPNext operation/operation.json |
| InstructionVersion | dialog | Publish controlled step content | templateId, instruction content type, sequence, text/contentRef, checksum, from/thru | Commons file/markdown capabilities | `mantle.work.RoutingServices.store#OperationInstruction` (proposed) | Carbon operation steps |

**Actions.** Archive blocks new use while preserving released methods. Copy never updates released routings that use the template. A published instruction is a `WorkEffortContent` row of an instruction content type on the template, its file stored immutably with a checksum; `WorkEffortContent` gains audit-logged `fromDate` and `thruDate`, so a publish ends the previous row and starts the next. The required evidence and the quality template are audit-logged template fields, and a run's operation shows the instruction and template as of its release time. Commons owns authoring/file machinery and access. An instruction variant with no rendered graphical asset still has usable text.

**Source.** research §3, §5; ERPNext `erpnext/manufacturing/doctype/operation/operation.json`.

**Needs.** M1, M3, M4.

### Product360

**Context passed.** Show the crosscut §3.5 tabs Summary, Identifiers, Dimensions & units, BOM/where-used, routing, Costs, Stock and Documents, with cost estimates when authorized (R-MFG-37). Fix manufacturing-capable products by lookup default, not an access grant; pass productId/variantId, organization, plant and as-of date. BOM tab mounts this file’s BillOfMaterialsDetail/RoutingDetail/BillOfMaterialsExplosion/WhereUsed with the exact BOM and as-of date, and BillOfMaterialsCompare when Products needs compare (R-XC-24). An Open runs link opens WorkOrders with the product fixed. The Kit components pane of a `PtPickAssembly` product is Products-owned and does not open these editors (D15). Actions draft method, compare, roll up estimate and new work order require their own grants. Catalog master, price resolver and standard-cost estimate remain Products-owned; generic association edit cannot alter released methods.

## 6. Work centers and quality

### WorkCenters

**Layout.** list; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Find | find | Filter production resources | organization, plant, center type, active, offline, capable product | facility lookup | none | ERPNext Workstation; Odoo Work Center |
| Centers | list | Compare capacity, queue and availability | facilityId, name, parent plant, parallel capacity, utilization, next available, offline reason | capacity with unit; stale state | `mantle.work.ProductionPlanningServices.get#WorkCenterLoad` (proposed) | Odoo mrp_workcenter views |
| NewCenter | dialog | Create production extension on a facility | facilityId or new FcTpLine, parent plant, name, capacity basis, calendarId | existing facility lookup | `mantle.work.RoutingServices.store#WorkCenter` (proposed) | ERPNext Workstation |

**Actions.** Open FacilityDetail, load, production schedule, downtime or equipment. Capacity is an explicit quantity per duration/product or parallel slots; existing Facility.capacity is a number of people and is not reinterpreted as machine throughput. Equipment assignments and offline intervals affect feasible work but do not themselves authorize maintenance operations.

**Source.** research §3; [FacilityEntities](../../mr-mantle/entity/FacilityEntities.xml); Odoo `odoo/addons/mrp/views/mrp_workcenter_views.xml`.

**Needs.** M1, M5, M10.

### FacilityDetail

**Context passed.** Pass `appRoot=Manufacturing`, facilityId, organization, plant and production role. Show identity, WorkCenter extension, production calendar, equipment, capacities by product/UOM, efficiency, effective cost/hour, alternatives, offline intervals, load, downtime and maintenance links. Identity/locations use shared facility actions; production attributes require resource-administrator grant; cost fields require cost grant. Calendar and approvals retain Commons ownership. Offline changes warn or reschedule affected operations with an explicit preview; they do not mutate posted labor or machine events. The mount embeds `chatter` and `record-files` on the Facility (`FacilityContent`) in Manufacturing context (R-MFG-28).

### Equipment

**Layout.** list; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Find | find | Narrow equipment within authorized sites | plant, facility, asset type, status, serial, qualification | asset scan/search | none | EditRun.xml EquipmentList; Odoo work-center equipment |
| Equipment | list | Show assigned machines and maintenance state | assetId, serial, center, assigned operation, availability, next service | shared record links | entity query over Asset/WorkEffortAssetAssign | EditRun.xml AddEquipment/EquipmentList |

**Actions.** Open EquipmentDetail; report downtime or request maintenance through proposed `mantle.work.ProductionServices.request#ProductionMaintenance` (Downtime), which creates an AssetMaintenance and, when wanted, a linked Request. This app does not recreate Maintenance work-order screens.

**Source.** research §3, §5; [EditRun](../../mr-marble/screen/SimpleScreens/Manufacturing/Run/EditRun.xml).

**Needs.** M1, M5.

### EquipmentDetail

**Context passed.** Pass equipment assetId, facility/plant, assigned operation and read/write capabilities. Show production assignments, qualifications, downtime, maintenance history and documents; allow authorized assignment and request-maintenance. The canonical EquipmentDetail has no request-maintenance action yet; it gains one, calling `request#ProductionMaintenance`, with the Manufacturing context (§13). Acquisition/depreciation and valuation remain Accounting actions. A read-only operator sees safe-use instructions and blocked state without procurement or asset book value.

### ResourceCalendar

**Context passed.** Commons row (Commons §7, crosscut §3.13): panes plant and work-center resources, operation slots and offline bookings; filters fixed to authorized plants and work centers; actions read only, with schedule changes only through ProductionSchedule; emphasis on production capacity. The mount is the `qvue` Commons Calendar. Use the implemented Commons calendar with plant/work-center resources, work-hour/holiday sources, operation dates and offline bookings. ProductionSchedule performs finite-slot feasibility checks and commits through the production scheduler; this mount does not turn a generic calendar edit into release or capacity authority. Pin authorized resources and preserve timezone, start/end and recurrence semantics; exact operating capacity belongs to WorkCenter.

### Inspections

**Layout.** list; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Find | find | Select quality work | plant, run, operation, product, lot, due, lifecycle, result | date period; authorized lookups | none | ERPNext Quality Inspection; Carbon quality worklist |
| Inspections | list | Show inspection identity and operational hold | inspectionId, template, sample quantity, due, verifier, result, disposition | shared record links | entity query under canonical quality authorization | ERPNext Quality Inspection list |

**Actions.** Create/Open uses QualityInspection. Queue assignments do not grant verifier authority. The inspection lifecycle and acceptance result are distinct; a verified failure can still await approved scrap/rework/return disposition. A template change, a new effective-dated item row, never alters a signed historical reading.

**Source.** research §8; ERPNext `erpnext/stock/doctype/quality_inspection/quality_inspection.json`.

**Needs.** M1, M6.

### QualityInspection

**Context passed.** Pass run/operation, product, asset lot/serial, the template as of release, sample plan, source/output quantity and production gate. Show readings, required evidence, result, verifier and disposition; operator mode has sequential large controls and scanner fields. Create/read/submit may be operator actions; verify and dispose require separate grants. A failed final inspection keeps finished stock unavailable; in-process failure blocks dependent operations. Same lifecycle/records/templates as receiving and returns, including reinspection linkage and atomic disposition; no separate Manufacturing result schema. Held output is `AstQuarantine` until `mantle.product.QualityServices.dispose#Inspection` (proposed) releases it (R-MFG-24). Release sets `AstAvailable`, which runs the existing `AssetStatusAvailableReservations` SECA (kept). Output of a run with customer demand provenance (RequirementSupply or `OrderItemWorkEffort`) is first reserved to that order item through `mantle.product.AssetServices.reserve#AssetForOrderItem`, in the same disposition transaction (R-SA-10).

### InspectionTemplates

**Context passed.** Pass manufacturing template context and authorized organization. Add in-process/final applicability, sampling basis and method/operation attachment; use the canonical template fields, reading types, units and effective-dated items. Editing requires the quality administrator capability; publishing does not change the items a released run's operation reads as of its release time.

### ScrapLoss

**Layout.** list; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Find | find | Filter production losses | run, operation, center, product, reason, date, disposition | date period; product lookup | none | Odoo stock.scrap; ERPNext process loss |
| Losses | list | Show losses and their source/correction chain | lossId, product/lot, quantity/UOM, type, reason, cost effect, status | source evidence links | `mantle.work.ProductionServices.find#ProductionLosses` (proposed) | Odoo scrap list; Carbon quantity transactions |
| RecordLoss | dialog | Propose one explicit loss or rework disposition | run/operation, material/output line, product, asset/lot, quantity/UOM, loss type, reason, disposition, operationKey | scan; quantity+unit | `mantle.work.ProductionServices.record#ProductionLoss` (proposed) | Odoo scrap wizard; ERPNext Job Card process loss |

**Actions.** Record loss is not a negative good receipt. Asset scrap uses the canonical stock/disposition transaction, reason, authorization and financial handoff, by one of three paths (R-MFG-20). Scrap of issued components is a `record#ProductionLoss` with a scrap cost event and no stock movement, since the stock is already in WIP. Scrap of received or held output of an open run is a `record#ProductionLoss` that issues the output asset back to the run, so the loss reaches production variance at cost close; it is not a Warehouse adjustment, whose variance hook would book it outside the run, to the scrap reason's account or to shrinkage (impl-warehouse §4). When an inspection disposes held output of an open run as scrap, the disposition uses the same loss path. Free stock outside a run is scrapped in Warehouse Adjustments (proposed `mantle.shipment.WarehouseTaskServices.scrap#Asset`). Process loss without stock records quantity reconciliation only. Rework produces a linked new operation/order and retains genealogy. Approve, reverse and correct require supervisor/finance grants according to value/period. Handheld can record quantity/reason; cost fields remain hidden.

**Source.** research §8–§9; Odoo `odoo/addons/mrp/views/mrp_production_views.xml`; ERPNext `erpnext/manufacturing/doctype/job_card/job_card.json`.

**Needs.** M1, M2, M4, M6, M8.

### Downtime

**Layout.** list; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Downtime | list | Show current and historical stops | center, optional asset, run/operation, reason, from/thru, duration, maintenance link | duration; open interval | `mantle.work.ProductionServices.find#ProductionDowntime` (proposed) | ERPNext Downtime Entry |
| ReportStop | dialog | Open or close a downtime interval | facilityId, optional assetId, run/operation, from, thru, reason, note, operationKey | phone datetime; reason lookup | `mantle.work.ProductionServices.store#ProductionDowntime` (proposed) | ERPNext downtime_entry/downtime_entry.json |
| Maintenance | dialog | Request corrective maintenance for the equipment | downtimeId, equipment, problem, urgency, attachment references, create intake request | shared request intake | `mantle.work.ProductionServices.request#ProductionMaintenance` (proposed); `mantle.product.EquipmentServices.create#AssetMaintenance`; `mantle.request.RequestServices.create#Request`; `mantle.request.RequestServices.link#RequestRecord` | ERPNext Downtime Entry; current Projects request links |

**Actions.** No-material, no-operator, waiting-quality and equipment-fault are reasons on the same interval model; only equipment-fault may suggest Maintenance. `request#ProductionMaintenance` creates an AssetMaintenance for the asset, with status `AsMntCreated` and a proposed corrective maintenance type seed `MntTpCorrective`, through `EquipmentServices.create#AssetMaintenance` (D24, R-MFG-06). When the plant wants an intake and triage trail, it also creates a Request of the proposed type `RqtMaintenance` and links it to the downtime and the asset through `RequestServices.link#RequestRecord`. The later Maintenance app adopts these AssetMaintenance records. Closing downtime does not automatically resolve the Request, complete the AssetMaintenance or start a person timer. Overlapping machine stops are unioned for OEE; person time remains separate. A correction keeps original interval and actor history. Operators may report their station; supervisors may correct and approve.

**Source.** research §8; ERPNext `erpnext/manufacturing/doctype/downtime_entry/downtime_entry.json`.

**Needs.** M1, M4, M5, M6, M7.

### Nonconformances

**Layout.** list; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Find | find | Filter quality findings | organization, source inspection, product/lot, severity, owner, status | inspection lookup | none | Carbon issues/nonconformance worklist |
| Findings | list | Show containment and corrective-action state | NCR ID, Request ID, source, severity, containment, owner, due, verified | shared Request links | `mantle.product.QualityServices.find#Nonconformances` (proposed) | Carbon quality Issues |
| CreateFinding | dialog | Create an auditable quality finding | inspectionId, run/operation, product/lot, description, severity, immediate containment, owner | record links; file references | `mantle.product.QualityServices.create#Nonconformance` (proposed) | Carbon issue form |

**Actions.** Corrective/preventive action is a linked Projects-owned Request with Work Items and evidence, not a new case lifecycle. Quality extension tracks cause, containment, effectiveness due/result, risk assessment and disposition links. Containment uses canonical holds. Closing the Request alone cannot release held inventory; the canonical disposition remains required. The services and the proposed `mantle.product.quality.QualityNonconformance` record belong to the shared quality model (crosscut §3.19), so Warehouse and Purchasing use the same records; this screen fixes a production context filter only (R-MFG-07).

**Source.** research §8, §14; Carbon `apps/erp/app/modules/quality/quality.models.ts` (issues, required actions, risk and calibration); current [Request model](../../mr-mantle/entity/RequestEntities.xml).

**Needs.** M1, M6.

### Gauges

**Layout.** list; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Gauges | list | Show calibration validity | assetId, serial, type, location, validFrom/thru, calibration status | expiry warning | entity query over proposed calibration extension | Carbon gauge/calibration patterns |
| Calibration | dialog | Record independently reviewed calibration | assetId, certificate file, calibratedAt, expiresAt, reference standard, result, verifier | Commons files; date | `mantle.product.QualityServices.store#GaugeCalibration` (proposed) | Carbon gauge/calibration form |

**Actions.** Link gauge to inspection readings and block required use when expired/out-of-tolerance. Recalibration leaves historical certificates intact and creates a review list of affected inspections. EquipmentDetail owns gauge identity; Commons owns certificates; QualityInspection records the instrument/version used. No metrology compliance is implied without a reviewed deployment-specific procedure. Calibration records are the shared quality model's proposed `mantle.product.quality.GaugeCalibration` (R-MFG-07).

**Source.** research §8, §14 (gauge calibration); Carbon `apps/erp/app/modules/quality/quality.models.ts` gauge/calibration validators.

**Needs.** M1, M6.

### RequestDetail

**Context passed.** Projects row (Projects §6, crosscut §3.11): panes Overview, Items, linked run/operation and Conversation; filters fixed to downtime and quality requests of authorized plants; actions triage and link production work, with explicit resolution; emphasis on production impact. Mount Projects-owned RequestDetail for maintenance intake (Requests of the proposed type `RqtMaintenance`) and quality corrective action. Pass existing RequestWorkEffort link to run/operation plus facility/equipment/source inspection; production scopes are defaults only. Preserve existing assignment, intake, client visibility and case lifecycle. Manufacturing adds source context and actions to return to downtime/quality, while release of a stock hold remains the quality disposition service.

### WorkItemDetail

**Context passed.** Projects row (Projects §5, crosscut §3.12): panes Overview, linked run/operation, source evidence, Time and Files; filters fixed to corrective-action and maintenance tasks of authorized plants; actions update and complete the task, with no production transition; emphasis on follow-up of production findings. Open Projects-owned corrective-action/maintenance tasks with parent Request, run/operation and source quality evidence. This is for follow-up work, not an alternative editor for an executable production operation. Existing time, approvals and file controls remain in force.

## 7. Planning and outside processing

### SupplyPlanning

**Context passed.** Show shared buy/make/transfer recommendations, item/week demand and supply provenance, source age, reservations, inspections and net remaining demand. Pass organization, plant, date horizon and make emphasis; include buy/transfer alternatives rather than hiding them. Make conversion invokes `mantle.work.ProductionServices.create#ProductionOrder` (proposed) and creates a draft WeInPlanning run with RequirementSupply links, the BOM and routing as of the plan date, UOM and date provenance. ConvertSuggestions carries the method date, defaulting to the plan date (R-MFG-23). The make supply link is proposed RequirementSupply plus the existing `mantle.request.requirement.WorkRequirementFulfillment` with type `WrfDelivers`, kept for Mantle compatibility. Conversion does not auto-release. Existing supply and prior conversion identities are checked under lock so a Purchasing and Manufacturing user cannot both satisfy the same remaining demand. Forecast/firm demand remains distinguished. Authorized users can use this mount without Purchasing or Warehouse app grants; required record/action permissions still apply. Any authorized planner on this mount can start a planning run through proposed `mantle.product.SupplyPlanningServices.run#SupplyPlan` and edit the one planning schedule of the organization through proposed `mantle.product.SupplyPlanningServices.store#PlanSchedule` (R-XC-09, R-XC-39). Manufacturing converts make suggestions; Purchasing converts buy suggestions and Warehouse transfer suggestions (D20). Manufacturing builds CX-PLANNING and this shared screen, and also converts an outside-processing requirement to a draft service PO line, for a `BOSS_PURCHASING_BUYER` holder on this mount (§13). A requirement's organization is a RequirementParty in the OrgInternal role, not a new field (impl-drawers-commons §4). Make suggestions are PlanningSuggestion rows; Mantle's ProductionEstimate stays unused (R-MFG-27). Release dates use the BOM's lead time and preparation days (R-MFG-31). Planning nets the `WorkEffortProduct` `WeptConsume`/`WeptProduce` rows of every run not completed, drafts included, through `mantle.product.InventoryReportServices.get#InventoryProjectedInfo`; production keeps those rows current (§12.1). Held receipts and output show as a pending-release supply line with the inspection's due date, excluded from netting by default; the plan schedule's organization option nets held quantity whose inspection is due within the lead time (§13, R-SA-17).

### InventoryAvailability

**Context passed.** Pass component or output product/variant, organization, plant, date, required quantity/UOM and run/operation. Show on hand, available, reserved, allocated, held, incoming, projected and source age with shared definitions. Default usable lots and source locations but show held quantities separately; planning cannot consume held stock. Held is computed by status (`AstQuarantine`, `AstOnHold`, `AstDefective`), not from available-to-promise (R-MFG-24). Component reservation for a released run is `later` (§14). Reservation/stock actions need explicit capability. A stale/unavailable projection blocks trusted conversion or requires a defined fresh revalidation, rather than being treated as zero demand or infinite stock.

### ProductionSchedule

**Layout.** calendar; custom regions and terminal behavior described below.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Find | single | Choose plant resources and horizon | organization, plant, centers, date range, timezone, include tentative | date period; resource lookup | `mantle.work.ProductionPlanningServices.get#ProductionSchedule` (proposed) | Odoo work-order planning; Carbon schedule |
| Timeline | component | Compare ordered operations and capacity | operation, center, start/end, predecessors, offline slots, load, locked flag | resource timeline component (M11); m-* toolbar | `mantle.work.ProductionPlanningServices.get#ProductionSchedule` (proposed) | Carbon finite schedule visualization |
| Move | dialog | Preview and commit one scheduling change | operation ID, target center, start/end, expectedRevision, reason, conflict override | typed datetime alternative | `mantle.work.ProductionPlanningServices.schedule#ProductionOperation` (proposed) | Odoo work-order scheduling |

**Layout.** qvue resource timeline with selected-operation detail. The timeline extends the built Projects WorkItems Timeline component with resource lanes, offline shading and a preview-only drag (M11, R-MFG-26). Drag is a preview only; commit validates calendar, skills/equipment, capacity, predecessors, quantity and version. Existing actual work pins completed portions. A conflict override requires supervisor authority and explicit exception; it does not change physical capacity.

**Terminal.** Resource/date grouped table and a Move form with target center and start/end provide every mutation. Commands Preview, Apply, Unschedule and Show conflicts mirror browser actions; keyboard users never need dragging. Read-only roles have table/filter only.

**Boundary.** Shared SupplyPlanning decides how much/where buy, make or transfer; this screen decides authorized dates/resources for production operations. Multi-order finite optimization is a later explicit proposal, not a claim about the current framework.

**Source.** research §3, §6; Odoo `odoo/addons/mrp/views/mrp_workorder_views.xml`; Carbon `packages/planning/src/scheduling/run-schedule.ts`; [Projects Timeline](design-projects.md).

**Needs.** M1, M4, M5, M10, M11.

### Capacity

**Layout.** report; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Parameters | single | Select load basis | organization, centers, horizon, time bucket, include tentative, calendar version | date period | `mantle.work.ProductionPlanningServices.get#WorkCenterLoad` (proposed) | Odoo work-center load; ERPNext Workstation utilization |
| Load | list | Show available and committed resource capacity | center, period, nominal, downtime, calendar-adjusted, booked, available, overload | quantity/time units; drill-down | `mantle.work.ProductionPlanningServices.get#WorkCenterLoad` (proposed) | Odoo Work Center capacity views |

**Actions.** Open ProductionSchedule, offline intervals or responsible work order. Utilization is not OEE: report formula, denominator, timezone and missing-data state. Human headcount and machine throughput are separate columns when both constrain work.

**Source.** research §3, §6; Odoo `odoo/addons/mrp/views/mrp_workcenter_views.xml`.

**Needs.** M1, M5, M10.

### DemandForecasts

**Layout.** editor; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Forecast | single | Set scope and forecast assumptions | organization, product group, plant, horizon, bucket, method, version, source dataset | date period; source revision | `mantle.work.ProductionPlanningServices.store#DemandForecast` (proposed) | ERPNext Sales Forecast |
| Buckets | list, editable rows | Review forecast quantities and confidence | product, period, quantity/UOM, source estimate, override, reason, confidence | editable numeric cells | `mantle.work.ProductionPlanningServices.store#DemandForecast` (proposed) | ERPNext Sales Forecast items |
| Publish | dialog | Publish approved forecast version | forecastId/version, approver, reason, effectiveFrom | approval link | `mantle.work.ProductionPlanningServices.publish#DemandForecast` (proposed) | ERPNext forecast submit |

**Actions.** Import/estimate yields per-product/period findings, not silently missing rows. Published forecast contributes distinctly tagged optional demand to SupplyPlanning; consumption against actual orders follows a specified policy and cannot duplicate firm demand. Forecast publication creates no work order or purchase order.

**Source.** research §6, §14; ERPNext `erpnext/manufacturing/doctype/sales_forecast/sales_forecast.json`.

**Needs.** M1, M10.

### MasterSchedule

**Layout.** editor; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Schedule | single | Define plan version and frozen horizon | organization, plant, horizon, bucket, forecastVersion, freezeDate | date period | `mantle.work.ProductionPlanningServices.store#MasterSchedule` (proposed) | ERPNext Master Production Schedule |
| Targets | list, editable rows | Compare firm demand, forecast and production targets | product, period, firm/forecast, inventory, target, capacity warning | editable target; drill-down | `mantle.work.ProductionPlanningServices.store#MasterSchedule` (proposed) | ERPNext master_production_schedule.json |
| Publish | dialog | Send approved target demand to shared planning | scheduleVersion, changed targets, reason, approval, operationKey | impact preview | `mantle.work.ProductionPlanningServices.publish#MasterSchedule` (proposed) | ERPNext MPS |

**Actions.** Publish generates provenance-tagged planning demand, not a second supply ledger. Changes inside the frozen fence require explicit approval and reconciliation of existing firm supply; no automatic cancellation of released runs.

**Source.** research §6; ERPNext `erpnext/manufacturing/doctype/master_production_schedule/master_production_schedule.json`.

**Needs.** M1, M10.

### FiniteSchedule

**Layout.** wizard; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Constraints | wizard step | Select work and optimization policy | plant, horizon, priority, tardiness/setup weights, alternate centers, locked jobs | constraint list | none | Carbon planning run-schedule.ts |
| Proposal | wizard step | Review feasible changes and unscheduled reasons | operation, current/proposed center/dates, conflict, missing capacity, score | list; ProductionSchedule preview | `mantle.work.ProductionPlanningServices.propose#FiniteSchedule` (proposed) | Carbon finite scheduler |
| Apply | wizard step | Commit reviewed independent scheduling groups | proposalId, selected groups, expected revisions, reason, operationKey | per-group result | `mantle.work.ProductionPlanningServices.apply#FiniteSchedule` (proposed) | Carbon finite scheduler |

**Actions.** Freeze completed/in-progress work and external commitments. Each dependent operation group commits atomically after revalidation; independent groups yield named success/stale/conflict/failed results and continue. One failed group does not erase the preview or other results. A solver output is never directly written over live dates. The usable terminal path is the same XML wizard and tabular proposal.

**Source.** research §6, §14; Carbon `packages/planning/src/scheduling/run-schedule.ts`.

**Needs.** M1, M4, M5, M10.

### SubcontractOperations

**Layout.** list; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Find | find | Narrow outside processing | supplier, plant, run, due, PO status, material location, exception | supplier lookup | none | Carbon Outside Processing; Odoo subcontracting |
| Operations | list | Show procurement and production progress | run/operation, supplier, service product, PO, sent/received/accepted, due, hold | shared order/shipment links | `mantle.work.ProductionServices.find#SubcontractOperations` (proposed) | Carbon outside-processing worklist |

**Actions.** Open SubcontractDetail, supplier, PO, shipment or quality record. New outside processing calls proposed `mantle.work.ProductionServices.request#SubcontractService` (operationWorkEffortId, service productId, quantity and UOM, supplierPartyId, required date, operationKey). It creates a `Requirement` of type `RqTpProduct` for the service product, so SupplyPlanning converts it as a buy, with a RequirementSupply demand link to the operation (R-MFG-05). Buyer approval and order placement remain Purchasing-owned. Authorization to view a run does not grant vendor price or PO amendment rights.

**Source.** research §7; Odoo `odoo/addons/mrp_subcontracting/views/mrp_bom_views.xml`; Carbon production outside processing.

**Needs.** M1, M2, M4, M8, M10.

### SubcontractDetail

**Layout.** detail; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Agreement | single | Maintain draft outside-process requirements | operation, supplier, service product, quoted price basis, lead time, component ownership, external location | supplier/price explanation | `mantle.work.ProductionServices.store#ProductionSubcontract` (proposed) | Carbon outside processing operation; ERPNext subcontracting order |
| Materials | list | Track sent, at-vendor, consumed and returned stock | material line, product, owner, quantity/UOM, vendor location, shipment, return | stock/genealogy links | `mantle.work.ProductionServices.get#SubcontractMaterials` (proposed) | ERPNext supplied items; Odoo resupply subcontractor |
| Acceptance | display | Reconcile service receipt and production result | PO line, received service, output lot, inspection/disposition, service accepted (Purchasing's proposed ServiceAcceptance), billed, remaining | match exception links | `mantle.work.ProductionServices.get#SubcontractStatus` (proposed) | ERPNext subcontracting receipt |

**Owners.** Manufacturing creates the subcontract requirement and this record, and owns `request#SubcontractService` and `receive#SubcontractOutput`. Purchasing places the service PO and records service acceptance. Warehouse dispatches and returns components at its proposed `Warehouse/Transfers/SubcontractShipmentDetail` and runs the output receipt. QualityInspection gates release. Accounting allocates the AP charge (D14, R-XC-07).

**Actions.** Request purchase calls `request#SubcontractService`; the buyer converts it in SupplyPlanning, which writes `OrderItemWorkEffort` and RequirementSupply on the service PO line. Send components opens Warehouse's SubcontractShipmentDetail with the operation and PO item fixed (R-WH-08). The vendor-custody facility is owned by the organization (`Facility.ownerPartyId` = the organization), with the supplier as a `FacilityParty` in a proposed custodian role, so a receipt there keeps company ownership (R-SA-08). Warehouse dispatches by `move#Asset`, which carries the cost and owner with no GL entry, or by a `ShpTpTransfer` shipment whose posting guard copies the source cost and owner to the vendor receipt; that path needs `AssetTypeGlAccount.transferGlAccountId` in setup. A vendor facility is not a sale. Receive finished work calls proposed `mantle.work.ProductionServices.receive#SubcontractOutput`, which Warehouse runs from SubcontractShipmentDetail or MaterialIssueReceipt. In one transaction it issues the run's material lines from the vendor-custody facility to the run (backflush, or supplier-reported actuals after review); receives the output with the run's workEffortId and no transfer shipment, in `AstQuarantine` when an inspection applies, at the run's frozen standard cost; calls Purchasing's proposed `ironstone.purchasing.ReceiptServices.accept#ServiceItem` with the receipt and inspection evidence; and writes the cost events (R-SA-13). The output is never received on the service PO line, which would value it at the PO price, credit unreceived inventory and mark the PO received. A logistics document, when wanted, is a `ShpTpIncoming` shipment. The service line gets no bill from the `ShipmentIncomingDeliveredCreateInvoices` SECA; the supplier's bill comes through Accounting's proposed `ironstone.accounting.InvoiceServices.import#Bill` (D14). Physical acceptance and bill matching retain separate evidence. Short delivery, rejected output or unused material return leave explicit residuals; unused components come back through SubcontractShipmentDetail by the same move or transfer. Cancellation after dispatch requires a material return and supplier charge disposition; cannot delete the operation. Price resolution is the one shared resolver with internal buying organization and external supplier contexts.

**Procurement and cost handoff.** The service PO line references `OrderItemWorkEffort` for the operation plus the same RequirementSupply demand link; preserve orderId/orderItemSeqId, operationWorkEffortId, service quantity/UOM, pricing basis and expected acceptance evidence. Component shipment changes custody/location while retaining company ownership. Accepted physical output is received exactly once under the production output line and operation key, even when Warehouse records the supplier delivery. Service acceptance references that output/inspection evidence for matching; a service receipt or AP bill never posts another finished-goods receipt. Outside service estimate/accrual enters operation WIP once, and the matched vendor invoice replaces/adjusts the accrual through Accounting with linked variance, not an additional full charge. Service acceptance writes the accrual event and the bill match writes the price-variance event (R-XC-08). Evidence uses proposed `mantle.work.production.ProductionCostEvent` and `ProductionCostAllocation`; Accounting ProductionCostClose owns financial preview/post while Manufacturing reviews only. Failed/partial output retains unmatched service quantity and explicit supplier claim/rework decisions.

**External access.** The researched Odoo My Productions portal maps to Purchasing-owned supplier order/acknowledgment pages, with a subcontract context showing only that supplier's service lines, supplied-component custody, due dates and approved dispatch/inspection evidence. Supplier confirmations are claims for internal review, never stock receipts or quality verification. A standalone Manufacturing deployment may enable the same shared external contract; it does not expose the internal WorkOrderDetail or create another portal account scheme. The customer-owned inward progress view remains later with CustomerMaterialJobs.

**Source.** research §7; Odoo `odoo/addons/mrp_subcontracting/views/mrp_bom_views.xml` and `subcontracting_portal_templates.xml`; ERPNext `erpnext/subcontracting/doctype/subcontracting_order/subcontracting_order.json` and `subcontracting_receipt/subcontracting_receipt.json`.

**Needs.** M1, M2, M4, M6, M8, M10.

### Supplier360

**Context passed.** Pass external supplierPartyId and internal organization with subcontract context. Crosscut row (§3.3): tabs Contact, Orders (subcontract), Receipts, Performance and Files; filters fixed to the supplier and organization and to subcontract POs; actions read, with buyer actions by grant; emphasis on outside processing (R-MFG-21). Prices, agreements and financial balance appear only with corresponding grants. The canonical screen has no pane for approved product/operation qualifications or open outside work; its subcontract orders pane is built with the Manufacturing context (§13). Buyer-owned edits link to the shared supplier record with explicit authorization.

### OrderDetail

**Context passed.** Crosscut row (§3.6): tabs Header, Items with production and subcontract links, Fulfillment and History; filters fixed to source sales orders and subcontract POs linked to visible runs; actions read and request change through intake, with no place or approve; emphasis on provenance and due dates. Mount one canonical record for source sales-order provenance and subcontract purchase orders. Pass orderId, run/operation, organization and order direction; do not infer direction from app name. Manufacturing sees relevant items, supply links, dates, receipt/inspection status and authorized pricing; the Items tab gains a sales order's supplying runs and a service PO's run and operation (§13). Manufacturing can request changes through linked intake; buy-side approval/place/cancel and sales promises require their separate role/capability. Standalone Manufacturing can use the permitted shared read mount without buying an app-root grant.

### ShipmentDetail

**Context passed.** Crosscut row (§3.8): tabs Items, sources (run/operation), vendor facility and ownership; filters fixed to the run/operation and supplier facility; actions dispatch and return by stock role, with no production good-output posting; emphasis on custody (R-MFG-04). Dispatch and return happen at Warehouse's SubcontractShipmentDetail; this mount reads them. Pass operation and material provenance, origin/destination vendor facility, ownership, PO and source run. Show components dispatched, unused returns and output received. Logistics actions use Warehouse capability checks, supported quantity/UOM conversion and lot/serial policies; a shipment status change cannot independently declare production good output.

### CustomerMaterialJobs

**Layout.** list; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Jobs | list | Find customer material work and return obligations | customer, source order, product, owner, quantity, run, due, remaining return | ownership badge | `mantle.work.ProductionServices.find#CustomerMaterialJobs` (proposed) | ERPNext inward subcontracting |
| CreateJob | dialog | Create draft service work with custody rules | customerPartyId, serviceOrderId, customerMaterialProduct, quantity/UOM, receiving facility, BOM/routing and method date, return obligation | order/product lookups | `mantle.work.ProductionServices.create#CustomerMaterialJob` (proposed) | ERPNext inward subcontracting order |

**Actions.** Open WorkOrderDetail with customer-ownership context. Receiving, issue and return preserve legal owner separate from facility; Customer360/OrderDetail show only authorized parties/orders. Customer material is excluded from company-owned inventory valuation, while internal labor/overhead remains service-job cost per Accounting policy. This later release is blocked on reviewed ownership/custody accounting and customer return documents; ordinary outside processing must not assume this is implemented.

**Source.** research §7, §14 (inward processing); ERPNext `erpnext/subcontracting/doctype/subcontracting_inward_order/subcontracting_inward_order.json`.

**Needs.** M1, M2, M4, M8.

## 8. Batches and settings

### Batches

**Layout.** list; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Batches | list | Find planned and active groups | batchId, center, setup family, member count, quantity, due, status | status filter | `mantle.work.ProductionServices.find#ProductionBatches` (proposed) | Carbon production Batches |
| NewBatch | dialog | Propose compatible members | center, setup family, selected operation IDs, schedule date, reason | compatibility findings | `mantle.work.ProductionServices.store#ProductionBatch` (proposed) | Carbon batch creation |

**Actions.** Create/open group. A run remains one production order; batching does not merge lots, demand, accounting or work-order identifiers. Planner sees reasons why incompatible tooling, method, ownership, quality or UOM blocks membership.

**Source.** research §5, §14; Carbon `apps/erp/app/modules/production/ui/Batches/BatchBuilder.tsx` and `BatchReleaseModal.tsx`.

**Needs.** M1, M4, M5, M9.

### BatchDetail

**Layout.** detail; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Members | list, editable rows | Maintain members before execution | operation ID, quantity, priority, planned date, method and method date, cost share | compatibility checks | `mantle.work.ProductionServices.store#ProductionBatch` (proposed) | Carbon batches |
| Release | dialog | Release a compatible schedule group | batchId, expectedRevision, center, setup allocation method, reason | member preview | `mantle.work.ProductionServices.release#ProductionBatch` (proposed) | Carbon batch release |
| Unbatch | dialog | Remove pending members or dissolve group | member IDs, reason, allocation consequences | impact preview | `mantle.work.ProductionServices.dissolve#ProductionBatch` (proposed) | Carbon batch ungroup/dissolve |

**Actions.** Group setup/runtime is allocated by an explicitly frozen basis, while each run posts its own material, quantity and cost transaction. Completion returns per-member outcome; a failed member remains visible and retryable and does not roll back unrelated successful members. Members with physical postings cannot be erased or reassigned by dissolve. Shared setup correction references every affected allocation.

**Source.** research §5, §14; Carbon `apps/erp/app/modules/production/ui/Batches/BatchBuilder.tsx` and `BatchReleaseModal.tsx`.

**Needs.** M1, M2, M4, M8, M9.

### ProductionSettings

**Layout.** settings; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Consumption | single | Define material and output policy | organization/plant, manual/backflush, issue point, overconsume/overproduce tolerances, substitute approval, quality defaults, completion on final receipt, strict release | explicit units/tolerances | `mantle.work.ProductionServices.store#ProductionPolicy` (proposed) | ERPNext Manufacturing Settings; Odoo manufacturing settings |
| TimeAndCost | single | Define required time evidence and estimate review | time-log enforcement, machine runtime, work type, production approver rule, costing policy (read-only link), auto-estimate refresh, close approval | existing work-type lookup | `mantle.work.ProductionServices.store#ProductionPolicy` (proposed) | ERPNext Manufacturing Settings |
| Planning | single | Set scheduling and planning defaults | horizon, time fence, shortage release policy, calendar, lead-time basis (entered or derived from routing standards), freshness limit | date duration; Commons calendar | `mantle.work.ProductionServices.store#ProductionPolicy` (proposed) | ERPNext Manufacturing Settings/Production Plan |

**Actions.** Save validates policy against permissions/accounting configuration, ends the current effective-dated ProductionPolicy row and starts the next, with its key fields audit-logged; a released run keeps the row of its release time. The flags for completion on final receipt, strict release and the production approver rule are off by default (§13). “Auto-update BOM cost” means propose a new standard estimate for review, never automatically revalue stock or alter a released run. Backflush requires the run lines' exact quantities and compatible lot/serial assignment; any insufficient/held stock aborts that atomic completion and offers explicit issue. All settings have organization defaults plus explicit plant override, with inherited values visible. The overhead basis and the co-product allocation method live only in Accounting's `Accounting/Settings/CostingPolicies` (proposed `ProductionCostServices.store#AllocationPolicy`); TimeAndCost keeps the time-evidence settings and links to that policy read-only (D12, R-SA-18). The shortage release policy defaults to all components usable, with staged release by supervisor approval (§13).

**Source.** research §11; ERPNext `erpnext/manufacturing/doctype/manufacturing_settings/manufacturing_settings.json`.

**Needs.** M1, M4, M5, M8, M10.

### ReasonCodes

**Layout.** settings; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Reasons | list, editable rows | Maintain effective reason codes and approval requirements | code, label, category, equipmentFault, plannedStop, approval threshold, effective dates, active | translated labels; no-delete referenced code | `mantle.work.ProductionServices.store#ProductionReasons` (proposed) | ERPNext downtime stop reasons; Odoo productivity losses |

**Actions.** Deactivate rather than delete referenced reasons. Reason codes are effective-dated rows with audit-logged key fields, so changes to OEE categorization apply prospectively by row; historical metrics preserve the classification in the recorded event. Equipment-fault suggests maintenance intake but other reasons remain ordinary production loss.

**Source.** research §8, §11; ERPNext `erpnext/manufacturing/doctype/downtime_entry/downtime_entry.json`.

**Needs.** M1, M6.

### Approvals

**Context passed.** Crosscut row (§3.15): panes method release, amendment and scrap approvals; filters fixed to the app's approval topic list, which the mount passes to Commons Notifications (`get#UserNotifications` takes a list of topics; impl-accounting §4), and the plant; actions approve through the source service; emphasis on release readiness. Contribute method release when separation is configured, amendments, substitutions, exceptional loss, overproduction and schedule override as production approval topics through implemented Commons approval facilities. Cost review does not go through Approvals: `review#ProductionCosts` queues the run for Accounting (ProductionCosts). Pass immutable subject revision, organization, source run and proposed action; decision must revalidate stale subjects before executing. Approver role is checked independently from manufacturing app membership; approval never bypasses an accounting closed period.

## 9. Reports

### Reports

**Layout.** landing; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Reports | list | Choose operational, quality and costing reports | report name, description, saved filter, role, freshness | report links | entity/static authorized report catalogue | ERPNext Manufacturing workspace reports |

**Actions.** Each report retains plant, organization, date and unit/currency conventions; reports export only authorized columns/rows. Operational quantities remain useful without Accounting access, while money columns are omitted. Every report includes as-of time and a named incomplete-data warning rather than an invented zero.

**Source.** research §9–§10; ERPNext Manufacturing workspace.

**Needs.** M1, M10.

### WorkOrderStatusReport

**Layout.** report; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Parameters | single | Select report scope | statuses, due dates, product, center, assignee | date period; authorized lookups | `mantle.work.ProductionReportServices.get#ProductionStatusReport` (proposed) | Odoo MO reporting; FindRun RunList |
| Results | list | Explain totals with drill-down evidence | run, target, good, remaining, delay, block reason | totals; canonical record links | `mantle.work.ProductionReportServices.get#ProductionStatusReport` (proposed) | Odoo MO reporting; FindRun RunList |

**Actions.** Refresh and export the same filtered data; open the source run, material event, inspection or accounting record with its own access check. Totals declare unit/currency and do not add incompatible units. Independent query partitions return named failures and an incomplete total, while no posting happens from the report.

**Source.** research §9–§10; Odoo MO reporting; FindRun RunList.

**Needs.** M1, M4.

### MaterialReport

**Layout.** report; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Parameters | single | Select report scope | run, product, lot/serial, plant, date, movement type | date period; authorized lookups | `mantle.work.ProductionReportServices.get#ProductionMaterialReport` (proposed) | RunConsumed IssuedAssetForm; RunProduced ReceivedAssetForm |
| Results | list | Explain totals with drill-down evidence | required, issued, returned, good received, held, source/destination, lineage | totals; canonical record links | `mantle.work.ProductionReportServices.get#ProductionMaterialReport` (proposed) | RunConsumed IssuedAssetForm; RunProduced ReceivedAssetForm |

**Actions.** Refresh and export the same filtered data; open the source run, material event, inspection or accounting record with its own access check. Totals declare unit/currency and do not add incompatible units. Independent query partitions return named failures and an incomplete total, while no posting happens from the report.

**Source.** research §9–§10; RunConsumed IssuedAssetForm; RunProduced ReceivedAssetForm.

**Needs.** M1, M2, M4.

### OperationPerformanceReport

**Layout.** report; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Parameters | single | Select report scope | center, operation, shift, date, product, reason | date period; authorized lookups | `mantle.work.ProductionReportServices.get#OperationPerformanceReport` (proposed) | Odoo productivity/OEE; ERPNext job-card reports |
| Results | list | Explain totals with drill-down evidence | planned/actual setup/run, labor/machine, availability, performance, quality, OEE, downtime | totals; canonical record links | `mantle.work.ProductionReportServices.get#OperationPerformanceReport` (proposed) | Odoo productivity/OEE; ERPNext job-card reports |

**Actions.** Refresh and export the same filtered data; open the source run, material event, inspection or accounting record with its own access check. Totals declare unit/currency and do not add incompatible units. Independent query partitions return named failures and an incomplete total, while no posting happens from the report. OEE exposes availability × performance × quality, scheduled production time and excluded planned downtime; missing standards/readings produce “Not calculable,” not zero. Overlapping downtime is unioned and reworked good units are not counted twice.

**Source.** research §9–§10; Odoo productivity/OEE; ERPNext job-card reports.

**Needs.** M1, M5, M6, M7.

### LossReport

**Layout.** report; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Parameters | single | Select report scope | plant, product, operation, reason, date, disposition | date period; authorized lookups | `mantle.work.ProductionReportServices.get#ProductionLossReport` (proposed) | Odoo scrap; Carbon quality quantities |
| Results | list | Explain totals with drill-down evidence | good/scrap/processLoss/rework quantities, rate, restricted cost, trend | totals; canonical record links | `mantle.work.ProductionReportServices.get#ProductionLossReport` (proposed) | Odoo scrap; Carbon quality quantities |

**Actions.** Refresh and export the same filtered data; open the source run, material event, inspection or accounting record with its own access check. Totals declare unit/currency and do not add incompatible units. Independent query partitions return named failures and an incomplete total, while no posting happens from the report.

**Source.** research §9–§10; Odoo scrap; Carbon quality quantities.

**Needs.** M1, M4, M6, M8.

### QualityReport

**Layout.** report; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Parameters | single | Select report scope | template, product, operation, lot, date, result | date period; authorized lookups | `mantle.work.ProductionReportServices.get#ProductionQualityReport` (proposed) | ERPNext Quality Inspection; Carbon quality reports |
| Results | list | Explain totals with drill-down evidence | sample count, readings, failure rate, holds, reinspection, disposition time | totals; canonical record links | `mantle.work.ProductionReportServices.get#ProductionQualityReport` (proposed) | ERPNext Quality Inspection; Carbon quality reports |

**Actions.** Refresh and export the same filtered data; open the source run, material event, inspection or accounting record with its own access check. Totals declare unit/currency and do not add incompatible units. Independent query partitions return named failures and an incomplete total, while no posting happens from the report.

**Source.** research §9–§10; ERPNext Quality Inspection; Carbon quality reports.

**Needs.** M1, M6.

### ProductionCostReport

**Layout.** report; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Parameters | single | Select report scope | organization, plant, run, completion period, standard estimate, currency | date period; authorized lookups | `mantle.work.ProductionReportServices.get#ProductionCostReport` (proposed) | Carbon JobEstimatesVsActuals.tsx |
| Results | list | Explain totals with drill-down evidence | material/labor/machine/overhead/outside cost, WIP, output allocation, variance, GL links | totals; canonical record links | `mantle.work.ProductionReportServices.get#ProductionCostReport` (proposed) | Carbon JobEstimatesVsActuals.tsx |

**Actions.** Refresh and export the same filtered data; open the source run, material event, inspection or accounting record with its own access check. Totals declare unit/currency and do not add incompatible units. Independent query partitions return named failures and an incomplete total, while no posting happens from the report.

**Source.** research §9–§10; Carbon JobEstimatesVsActuals.tsx.

**Needs.** M1, M4, M8.

### BillOfMaterialsVarianceReport

**Layout.** report; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Parameters | single | Select report scope | BOM and release date, run, product, operation, date, quantity basis | date period; authorized lookups | `mantle.work.ProductionReportServices.get#BomVarianceReport` (proposed) | ERPNext BOM/production variance patterns |
| Results | list | Explain totals with drill-down evidence | planned/actual material, substitutes, yield, time, cost variance, source event | totals; canonical record links | `mantle.work.ProductionReportServices.get#BomVarianceReport` (proposed) | ERPNext BOM/production variance patterns |

**Actions.** Refresh and export the same filtered data; open the source run, material event, inspection or accounting record with its own access check. Totals declare unit/currency and do not add incompatible units. Independent query partitions return named failures and an incomplete total, while no posting happens from the report.

**Source.** research §9–§10; ERPNext BOM/production variance patterns.

**Needs.** M1, M3, M4, M8.

### PlanningReport

**Layout.** report; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Parameters | single | Select report scope | planningRunId, plant, product, time bucket, demand class | date period; authorized lookups | `mantle.work.ProductionReportServices.get#ProductionPlanningReport` (proposed) | ERPNext MRP/production plan; Dolibarr net needs |
| Results | list | Explain totals with drill-down evidence | required, reserved, usable, incoming, suggested/converted, provenance, stale source | totals; canonical record links | `mantle.work.ProductionReportServices.get#ProductionPlanningReport` (proposed) | ERPNext MRP/production plan; Dolibarr net needs |

**Actions.** Refresh and export the same filtered data; open the source run, material event, inspection or accounting record with its own access check. Totals declare unit/currency and do not add incompatible units. Independent query partitions return named failures and an incomplete total, while no posting happens from the report.

**Source.** research §9–§10; ERPNext MRP/production plan; Dolibarr net needs.

**Needs.** M1, M10.

## 10. Coverage and validation

### 10.1 Research coverage

| Research area/candidate | Designed coverage and phase |
| --- | --- |
| §1 landing, KPIs, queues and shortages | Home (`new`), WorkOrders (`parity`, new grouped/board/calendar presentations), Components and shared SupplyPlanning. Counts deep-link using identical authorization and filters. |
| §2 BOMs, scrap/operation assignment, explosion, version/compare, byproducts, costs and where-used | BillsOfMaterials/BillOfMaterialsDetail/WhereUsed (`parity` baseline association replacement); BillOfMaterialsExplosion/BillOfMaterialsCompare/RoutingDetail/ByProducts (`new`); cost rollup is the Products-owned screen mounted from the method as of a date. Product360 is defined once in crosscut. |
| §3 routings, operations, work centers, skills/equipment, instructions | Routings/RoutingDetail/OperationTemplates/WorkCenters/Capacity (`new`); shared FacilityDetail/EquipmentDetail/Calendar; approved instructions and operator step capture (`new`), AssemblyViewer (`later`). |
| §4 work-order find/detail, all tabs, change quantity, split/backorder, cancellation and clone | WorkOrders/WorkOrderDetail/Overview/Components/Quantities (`parity` plus guarded new lifecycle); new operations/byproducts/quality/costs; shared Materials, Time, Chatter/files; ChangeQuantity form and SplitWorkOrder wizard (`new`). Disassembly supports the pick-assembly reversal (`new`); general unbuild of produced output is an Open item. |
| §5 manager/operator kiosk, scanners, keyboard, timer, materials, QC, reconciliation, downtime/maintenance | ShopFloor/OperationExecution/Instructions/Downtime (`new`) and shared stock/quality/request/equipment/time; WallDisplay and 3D AssemblyViewer (`later`). No browser-only execution operation is required. |
| §6 net needs, demand/supply per week, create make/buy/transfer, capacity timeline | Canonical SupplyPlanning (`new`) and InventoryAvailability (`parity`), ProductionSchedule/Capacity/PlanningReport (`new`). DemandForecasts/MasterSchedule/FiniteSchedule (`later`), with firm-demand and duplicate-supply prevention contracts now fixed. |
| §7 outward and inward subcontracting | SubcontractOperations/SubcontractDetail plus canonical supplier/order/shipment/material/quality views (`new` outward); CustomerMaterialJobs (`later` inward) with ownership/custody accounting prerequisite. |
| §8 quality templates/gates, scrap, process loss, OEE/downtime, nonconformance/CAPA, gauges, risks/documents | Inspections/QualityGates/ScrapLoss/Downtime and shared quality/templates (`new`); Nonconformances/Gauges (`later`) link existing Request/WorkItem and Commons controlled files, with risk and effectiveness evidence. No orphan quality workflow duplicates Projects. |
| §9 costing and variance | ProductionCosts, ByProducts, ProductionCostReport/BillOfMaterialsVarianceReport (`new`); Products estimate revisions and Accounting WIP/valuation/period contracts, with restricted financial columns. |
| §10 reports and analytics | Eight named report routes consolidate the research variants using explicit parameters: status/late, material/genealogy, time/load/OEE, scrap/process loss, quality, estimate/actual/WIP, BOM variance, planning. Report names and measures remain individually reachable; consolidation is not deferral. |
| §11 settings and operation/reason catalogues | ProductionSettings/ReasonCodes/OperationTemplates and shared templates/resource configuration (`new`), including consumption/backflush, tolerances, time logging, forecast horizon and estimate-refresh policy. |
| §12 shared surfaces | Product, inventory, material, facility/equipment, supplier/order/shipment, quality, planning, requests/work items, calendar, Chatter/files, approvals and time use Context passed blocks only. Invoice/GL evidence links canonical Accounting contexts instead of creating a Manufacturing invoice editor. |
| §13 baseline and §14 gaps/further candidates | All 23 Manufacturing forms mapped below; active/incomplete/commented/proposed boundaries in §1.3. Batches/BatchDetail and advanced quality/planning/inward material/3D are designed `later`. Eight research open questions are decided in §13. |

### 10.2 Baseline form coverage

Paths here are additive Designed-in mappings; they do not replace existing mappings or imply implementation. The source module is `mr-marble/screen/SimpleScreens/Manufacturing/Run`. Notes use canonical Shared/Chatter and stock forms use canonical Shared/MaterialIssueReceipt plus the host context.

| Source screen and forms | Designed destinations |
| --- | --- |
| FindRun: NewRunForm | Manufacturing/WorkOrders/NewWorkOrder |
| FindRun: RunList | Manufacturing/WorkOrders; Manufacturing/Home |
| EditRun: UpdateRun | Manufacturing/WorkOrders/WorkOrderDetail; Manufacturing/WorkOrders/WorkOrderDetail/Overview |
| EditRun: NewNoteForm, UpdateNoteForm | Shared/Chatter; Manufacturing/Chatter; Manufacturing/WorkOrders/WorkOrderDetail |
| EditRun: AddEquipment, EquipmentList | Manufacturing/WorkOrders/WorkOrderDetail/Overview; Manufacturing/WorkCenters/Equipment |
| EditRun: AddPartyAssignForm, UpdateAssignForm | Manufacturing/WorkOrders/WorkOrderDetail/Overview |
| RunProducts: AddProduceForm, ProduceList | Manufacturing/WorkOrders/WorkOrderDetail/Quantities |
| RunProducts: AddConsumeForm, ConsumeList | Manufacturing/WorkOrders/WorkOrderDetail/Components |
| RunProducts: ReceiveAssetForm, IssueAssetForm | Shared/MaterialIssueReceipt; Manufacturing/WorkOrders/WorkOrderDetail/MaterialIssueReceipt |
| RunConsumed: IssueAssetForm, ConsumeAssetForm, IssuedAssetForm | Shared/MaterialIssueReceipt; Manufacturing/WorkOrders/WorkOrderDetail/MaterialIssueReceipt |
| RunProduced: ReceiveAssetForm, ReceivedAssetForm | Shared/MaterialIssueReceipt; Manufacturing/WorkOrders/WorkOrderDetail/MaterialIssueReceipt |
| ConsumeAsset: ConsumeAssetForm; ConsumeProduct: ConsumeAssetForm; ProduceAsset: ReceiveAssetForm | Shared/MaterialIssueReceipt; Manufacturing/WorkOrders/WorkOrderDetail/MaterialIssueReceipt |
| Catalog EditAssocs: AddAssocToForm, AssocToListForm, AssocFromListForm | Manufacturing/BillsOfMaterials/BillOfMaterialsDetail; Manufacturing/BillsOfMaterials/WhereUsed (manufacturing associations of products that are not kits; kit components go to Products' Kit components pane, and other catalog associations remain Products) |

The existing directly queried services named in forms are eligible for additive service mappings. Internally invoked create/issue/receipt/unissue/ledger hooks are documented dependencies but are not falsely claimed as new direct form calls. Generic entity creates/updates remain subject to the proposed domain transition guard. The legacy direct quantity setter is deliberately excluded from new Designed-in mappings because its automatic completion/recalculation is unsafe for released work. `create#ProductionRun` and `breakDown#Assembly` are internal calls of `create#ProductionOrder` and `reverse#SupportedAssembly`, not form calls (R-MFG-17).

### 10.3 End-to-end acceptance review

| Scenario and exception | Required review result |
| --- | --- |
| Product variant → supplier price → RFQ/PO → partial receipt/failed inspection → bill/payment | BOM component stores exact variant and stock UOM; supplier pack conversion and price-resolver explanation are shared Products/Purchasing rules. Only accepted/disposed receipt becomes production availability. Failed inspection remains held and cannot be reserved/issued. Partial supply preserves remaining demand and match evidence; Manufacturing cannot clear AP holds or approve payment. |
| Shortage → buy/make/transfer → partial production → finished stock → GL | One PlanningRun and remaining RequirementSupply allocation prevents duplicate conversions. Make creates a draft with the method as of the plan date; explicit release freezes its lines. Issue links material line/lot, person time links operation and machine time stays separate. Partial good receipt, process loss, scrap and unused return reconcile independently. WIP/output/variance traces stock and accounting postings; a missing account or closed period sends the automatic GL post to the error journal with the failed guard named, never a silent success (impl-accounting §4). |
| Order reservation → pick shortfall → substitute/replan → shipment/invoice/payment | Source OrderItemWorkEffort/provenance remains visible. Shortfall changes neither promised dates nor production target silently. Substitution checks approved method/UOM/specification and revision; it cannot substitute an arbitrary material because availability is positive. Finished lot becomes reservable only after release from quality. Sales, logistics and finance keep their action authorities. |
| Customer return → inspection → rework or scrap → credit/refund; supplier return | Returned stock retains RMA/source invoice identity and disposition hold. Approved rework creates linked production demand and a new run with its own frozen lines; it cannot mutate the original closed order/run. Scrap/rework stock and costs have reviewed disposition; credit/refund and supplier claims remain Accounting/Purchasing-owned. Customer-owned stock follows the later custody contract, never company inventory by default. |
| Physical count while production issues/receives | Shared count cutoff/movement reconciliation includes production movement identities and locations. Posting rechecks intervening issues/receipts/reservations and requires variance review; production does not bypass count locks with raw Asset update. A failed count item is named; a successful independent item remains posted once. |
| Intake → assignment → pause/reopen → resolution and CSAT | Downtime/quality intake uses existing Request links and scoped assignment; Customer Service owns SLA/CSAT and Projects owns RequestDetail. Production state/quality hold is independent of case resolution. A reopened case can create a new production action without reopening stock or a closed accounting period automatically. |
| Released BOM/routing changes; missing/expired instruction or gauge | New revision does not alter the released run. Comparison shows affected work; an amendment is an audit-logged change to the run's remaining lines and operations and preserves already-executed facts. No raw ProductAssoc or generic WorkEffort edit bypasses this. Expired required calibration or missing approved instruction blocks the affected step with a named reason. |
| Cancellation, partial completion, batch failure and retry | Cancel draft directly; after postings, review linked reversals/residual closure and open-period accounting date. Split preserves posted material/time and sums residual demand correctly. Batch completion returns run/operation ID, outcome and retry token for every independent member, continuing after individual failures. Each stock/financial posting plus its event is atomic and idempotent; retry after uncertain response reads committed outcome. |
| Unauthorized action and standalone app | Direct URL/service requests apply the same organization/facility/capability checks as UI actions. App context never elevates privilege. A standalone production user can use authorized shared product/availability/material views without other app grants, while unavailable optional Purchasing/Accounting workflows produce an explicit handoff/configuration task rather than fake completion. |

### 10.4 Source and Markdown verification

This documentation pass verifies active XML service/entity/status names, direct baseline form names, local reference-file existence, relative links/anchors and screen/form table structure. It does not claim that the proposed services exist or that the described workflows have passed runtime tests. Application builds are unnecessary for this documentation-only change. During implementation, the acceptance rows above are the transaction and authorization tests, especially stale-revision, concurrent conversion, partial failure and uncertain-retry cases.

Concrete local references inspected:

| File under `~/work/moquiwork/3p_other` | Pattern taken |
| --- | --- |
| [Odoo mrp_bom_views.xml](../../../../../3p_other/odoo/odoo/addons/mrp/views/mrp_bom_views.xml) | BOM quantity/UOM, consuming operation, components, operations and byproducts in one method. |
| [Odoo mrp_production_views.xml](../../../../../3p_other/odoo/odoo/addons/mrp/views/mrp_production_views.xml) | Manufacturing-order list, quantity/progress and scrap controls. |
| [Odoo mrp_workorder_views.xml](../../../../../3p_other/odoo/odoo/addons/mrp/views/mrp_workorder_views.xml) | Operation states, quantities, resource scheduling and expected/actual duration. |
| [Odoo mrp_workcenter_views.xml](../../../../../3p_other/odoo/odoo/addons/mrp/views/mrp_workcenter_views.xml) | Product capacity and performance/OEE resource views. |
| [Odoo production split](../../../../../3p_other/odoo/odoo/addons/mrp/wizard/mrp_production_split.py) and [backorder](../../../../../3p_other/odoo/odoo/addons/mrp/wizard/mrp_production_backorder.py) | Explicit partial/split/backorder intent rather than changing targets silently. |
| [ERPNext job_card.json](../../../../../3p_other/frappe/erpnext/erpnext/manufacturing/doctype/job_card/job_card.json) | One operation per job card, time logs, completed/pending/process-loss reconciliation and quality links. |
| [ERPNext downtime_entry.json](../../../../../3p_other/frappe/erpnext/erpnext/manufacturing/doctype/downtime_entry/downtime_entry.json) | Reason-coded start/end downtime, distinct from work time. |
| [ERPNext production_plan.json](../../../../../3p_other/frappe/erpnext/erpnext/manufacturing/doctype/production_plan/production_plan.json) and [master schedule](../../../../../3p_other/frappe/erpnext/erpnext/manufacturing/doctype/master_production_schedule/master_production_schedule.json) | Material demand, planned supply and explicit higher-level schedule documents. |
| [Carbon MES JobOperation.tsx](../../../../../3p_other/carbon/apps/mes/app/components/JobOperation/JobOperation.tsx) | Focused operation execution, instructions, machine/person work and quantity transactions. |
| [Carbon JobEstimatesVsActuals.tsx](../../../../../3p_other/carbon/apps/erp/app/modules/production/ui/Jobs/JobEstimatesVsActuals.tsx) | Cost/time comparison with component detail rather than one unexplained variance total. |
| [Carbon quality.models.ts](../../../../../3p_other/carbon/apps/erp/app/modules/quality/quality.models.ts) | Gauge/certificate validity, calibration attempts, issue actions and risk fields inform later quality extensions. |
| [ERPNext subcontracting order](../../../../../3p_other/frappe/erpnext/erpnext/subcontracting/doctype/subcontracting_order/subcontracting_order.json) and [receipt](../../../../../3p_other/frappe/erpnext/erpnext/subcontracting/doctype/subcontracting_receipt/subcontracting_receipt.json) | Purchased work and supplied material/output evidence remain distinct. |
| [Carbon run-schedule.ts](../../../../../3p_other/carbon/packages/planning/src/scheduling/run-schedule.ts) | Separate finite scheduling with released operation/batch constraints; informs later proposal/apply design. |
| [Dolibarr mo_production.php](../../../../../3p_other/dolibarr/htdocs/mrp/mo_production.php) | Explicit material consume/output produce page and cancellation consequences; simple no-routing work remains first class. |

## 11. Documents and outputs

| Output | Kind | From screen | Derived from |
| --- | --- | --- | --- |
| Production traveler/pick sheet | `html-print` with optional configured PDF export | WorkOrderDetail | Existing [RunPickDocument](../../mr-marble/screen/SimpleScreens/Manufacturing/Run/RunPickDocument.xml) and `mantle.work.ManufacturingServices.get#ProductionRunPickInfo`; add the run revision and release time, operation sequence, material/lot requirements and QR/barcode identity. |
| Operator instructions and quality checklist | `html-print` | Instructions / QualityInspection | The published instruction and template as of the run's release time; current Commons files and shared quality schema. Text instructions always printable; 3D viewer has part/step text and drawing references. |
| Finished/secondary product and WIP labels | `html-print`, configured label printer later if needed | MaterialIssueReceipt / ByProducts | Shared Warehouse label contract; product, quantity/UOM, lot/serial, owner/facility, run/operation and inspection hold state. No label claims acceptance before disposition. |
| BOM/routing, exploded needs and revision comparison | `html-print`, CSV export | BillOfMaterialsDetail / BillOfMaterialsExplosion / BillOfMaterialsCompare | Odoo structure report; ERPNext BOM explosion/comparison; the exact BOM and dates, and conversion/cost basis. |
| Quality certificate, loss and calibration evidence | `html-print` / attachment | QualityInspection / ScrapLoss / Gauges | Shared quality and Commons files; include verified result, instrument and the template as of the inspection; external certificate visibility explicit. |
| Outside-processing dispatch/return instructions | `html-print` | SubcontractDetail / ShipmentDetail | Shared Warehouse shipment documents; component owner, quantities, lot/serial and PO/operation links. Supplier-visible instructions exclude unauthorized internal cost. |
| Reports and plan snapshots | CSV and `html-print` | Reports, Capacity, SupplyPlanning, ProductionSchedule | Same authorized filters/columns as screen, with source age, unit/currency, missing partitions and plan version. |
| BOM/routing migration/import preview | CSV import + preview/results | BillsOfMaterials / RoutingDetail | Existing ProductAssoc/WorkEffort templates plus published import schema, excluding `PtPickAssembly` kit rows (D15); stable external line IDs, effective dates, quantity/UOM and operation mapping. Each independent BOM imports as one atomic unit of draft lines; bad ones named and skipped while others continue. Release remains explicit. |
| Release, shortage, quality-block and schedule-change notices | Existing Commons notification/approval | WorkOrderDetail / QualityGates / ProductionSchedule | Existing shell providers and access-filtered links. Explicit supplier/customer communications go through shared Comms review/send, not implicit stock actions. |

## 12. Framework and data needs

This is the local specification for the coordinator's deduplicated [crosscut needs](design-crosscut.md#7-framework-and-data-needs). M1/M2/M6/M10 refer to canonical cross-app capabilities; no parallel implementation is intended. M1's shell part folds into CX-SHELL and its access part into CX-ACCESS. M6 folds two ways: inspection into CX-QUALITY, and loss and downtime into CX-PRODUCTION. M10's scheduling and report services (`ProductionPlanningServices`, `ProductionReportServices`) stay a local work item beside CX-PLANNING, which Manufacturing builds (§13). Products builds M3, with `WorkCenter`, `WorkCenterRate` and `get#OperationCostBasis` of M5 (impl-products P8); Warehouse builds M4's runs and lines and M2's stock guards (impl-warehouse P16); Accounting's ProductionCostClose of M8 is built with Manufacturing (impl-accounting §4). M11 is local. All families below are proposed unless explicitly marked current in §1.3. Names are design contracts, not inactive XML being quietly treated as live.

| Need | Kind | Proposed as | Used by | Stub spec |
| --- | --- | --- | --- | --- |
| M1 — Context, grants and shell contributions | shell item / seed data | Existing Commons context/providers extended with production record types, action grants (the §1.1 groups under the `BOSS_MANUFACTURING` root, with their organization filters) and plant/operator context | All screens | Server derives allowed actions from record/org/facility grants; each provider filters counts and links; method release, stock action, verifier and financial roles independent. One named result per independent batch item; safe error IDs without inaccessible details. |
| M2 — Atomic production/stock handoff | service type / data model | Shared MaterialIssueReceipt contract plus the `mantle.work.ProductionServices` guards `issue#ProductionMaterial`, `return#UnusedMaterial`, `receive#ProductionOutput`, `receive#SubcontractOutput` and `record#ProductionLoss` | Work orders, ShopFloor, subcontracting, disassembly | Persist operation identity, request hash and outcome on Accounting's CX-POSTING operation record before response; same key/same payload returns prior result, conflicting payload fails. One logical stock/financial event is all-or-nothing with its run/line link; dependent postings use canonical ledger hooks once. Independent runs/items continue with IDs, error category and retryability. Cancellation is a reviewed reversal/residual plan. Issue never adds to an earlier issuance; return unused posts a new receipt fact; output receipt passes the run's frozen standard cost; after posting, BOSS never cancels or updates a production AssetIssuance (D13). Guards check the asset `statusId` and that the asset owner is the run owner. Changing `AssetIssuanceGlRePost` to post a dated reversing delta is Accounting AC-06 and CX-POSTING work. |
| M3 — Dated methods | data model / service type | `mantle.product.bom.ProductBom` with `ProductBomItem` and proposed `mantle.product.bom.ProductBomContent`, and the release decision record; routings as Mantle's `WepRouting` and `WepRoutingTask` WorkEfforts on dated `WeatRoutingComp` rows; `mantle.product.BomServices`, `mantle.work.RoutingServices` | BOM/routing editors, Product360, planning, release | ProductBom identifies product/org/method, with a single-field key and its content entity for Chatter and Files (D25), and audit-logged method fields: base quantity/UOM, phantom, routing, `leadTimeDays` and `prepareDays` (R-MFG-31). ProductBomItem lines are effective-dated, have a stable bomItemId, and audit-log their key fields: role consume/byproduct, product/variant, quantity/UOM, scrapFactor, consuming operation and applicability (`applicabilityFeatureIds`); a line also has its instruction and substitution rule. Never reuse ProductAssoc's composite PK as line identity. A routing's operations are dated `WeatRoutingComp` rows with audit-logged standards. A release is an approval decision, a record of its own (approver, time, reason and the lines it stamped), that stamps the draft lines' fromDate and the replaced lines' thruDate; released lines are never edited. A method "version" is the method as of a release date: an explosion reads one date and a comparison two. Existing associations/templates import into draft lines through explicit compatibility mapping. Release forbids cycles, ambiguous overlapping effective lines and invalid conversions/dependencies. Release never writes `PatMfgBom`; `PatMfgBom` stays only for `PtPickAssembly` kit components, which Products edits (D15). `RoutingServices.get#OperationCostBasis` returns the effective WorkCenterRate × standards for Products' roll-up (R-MFG-25). Line applicability is decided (§13); operation applicability is an Open item (§14). Products builds M3 (impl-products P8). |
| M4 — Run lines and guarded lifecycle | data model / service type / seed data | `mantle.work.production.ProductionRunLine`, `ProductionQuantityEvent`; audit-logged run fields (revision, release time, frozen standard cost, demand links, cost-review status) and operation-child fields (routing operation, sequence, work center); `mantle.work.ProductionServices`; proposed fields `AssetIssuance.productionMaterialLineId`, `AssetReceipt.productionOutputLineId`, `operationWorkEffortId`, `enteredQuantity`, `enteredQuantityUomId` and `appliedConversionFactor` (on AssetIssuance and AssetReceipt) and `AssetReceipt.sourceAssetIssuanceId`; seed `WeApproved`→`WeOnHold`, `WeOnHold`→`WeApproved` and `WeApproved`→`WeInPlanning` transitions | All execution, split, method changes, time/cost evidence | The run's revision counter, release time (which reads the BOM, routing and ProductionPolicy as of that time), frozen standard cost (its effective-dated `productStandardCostId`) and demand links are audit-logged fields of the run. ProductionRunLine is the run's material and output lines by role, each with a stable line ID, its source bomItemId, product/variant, quantity/UOM and exact stock conversion, scrap/substitute rules and operation; key fields are audit-logged, and the lines are written at create and frozen at release. They are records of their own because issuances and receipts reference them (the shared rule's exception, impl-drawers-commons §4). Each operation child WorkEffort carries its routing operation, sequence/dependencies and work center, audit-logged, and reads its setup/run standards, instruction and template as of the release time. Postings reference the line IDs. An amendment is an audit-logged change to the remaining lines and operations that remaps only unexecuted work and preserves original fact links. Stock movements carry the run's workEffortId, and the proposed fields hold the line and operation (R-SA-07) and the entered quantity, unit and factor (R-SA-06; Warehouse adds the same three on ShipmentItemSource, CX-POSTING). `WorkEffortProduct` `WeptConsume`/`WeptProduce` rows are the projection-facing aggregate per product in the stock unit: `create#ProductionOrder` writes them from the BOM and routing as of the chosen date, release and amendment rewrite them from the run lines, and `substitute#ProductionMaterial` and `change#ProductionQuantity` adjust them; the run lines stay the execution identity (R-SA-05). The run and every operation child have `ownerPartyId` = the organization (R-SA-03). The run carries the proposed cost-review status, an audit-logged field (R-MFG-02). Warehouse builds the runs and their lines with `create#` and `release#ProductionOrder` (impl-warehouse P16a). |
| M5 — Production resource capacity | data model / service type | `mantle.work.production.WorkCenter`, `WorkCenterCapacity`, `WorkCenterRate`, `WorkCenterAlternate`; `mantle.work.ProductionPlanningServices` | FacilityDetail, WorkCenters, RoutingDetail, schedule/load | Key WorkCenter by facilityId with plant, calendar, efficiency, OEE target and scheduling policy. Capacity: product/type, quantity/UOM per duration or parallel slots, effective dates. Rate: currency/hour, cost component, effective dates and approval. Alternatives carry capability/qualification. Existing Facility.capacity remains people capacity; Commons owns work hours/holidays/bookings. Load validation locks changed operations, rechecks resources and respects actual/frozen work. |
| M6 — Quality, loss and downtime evidence | data model / service type / seed data | Canonical InspectionTemplate/Item, QualityInspection/Reading and QualityServices; production `ProductionLoss`, `ProductionDowntime`, later `mantle.product.quality.QualityNonconformance`, `GaugeCalibration` with `mantle.product.QualityServices.find#Nonconformances`, `create#Nonconformance` and `store#GaugeCalibration`; existing `mantle.product.maintenance.AssetMaintenance`; seed request type `RqtMaintenance` and maintenance type `MntTpCorrective` | Quality, operations, resource views, reports | Quality uses canonical lifecycle/result/disposition, with effective-dated template items read as of each inspection. Loss: lossId, run/operation, run line, product/asset/lot, quantity/UOM, scrap/process-loss/rework type, reason, disposition, source posting/correction and approval. Downtime: ID, facility, optional asset/run/operation, start/end, reason classification, actor, maintenance Request and correction chain; same model for non-equipment causes. Calibration stores certificate validity and affected-reading references; NCR links Projects Request/WorkItem. Gates read `QualityServices.get#SourceInspectionStatus`. A downtime's maintenance link is an AssetMaintenance (D24), with an optional linked Request. |
| M7 — Operator execution and person/machine time | Vue component / service type / data model / seed data | ShopFloor.qvue with `tui` twin; `MachineRuntimeEvent`, instruction step acknowledgments (a record of their own: who, when, which `WorkEffortContent` row); existing TimesheetServices; seed `WorkType` `WktpProductionSetup`, `WktpProductionRun` and `WktpProductionRework`; proposed production timesheet approver rule (run supervisor or line manager), behind its ProductionPolicy flag | ShopFloor, OperationExecution, Instructions, AssemblyViewer, WallDisplay | Explicit station scope/identity, scan parser, 48px controls, 18px input, keyboard path, retained entry, operation-key outcome reconciliation. Person timers/TimeEntry and weekly locks remain Projects-owned; machine runtime key is equipment/operation interval and cannot masquerade as labor. Every custom canvas/board has text/table/command equivalents and standard `m-*` input controls. Finish writes `TimeEntry.pieceCount` under the piece-rate policy. Required skills or acknowledgment block Start when configured (§13). |
| M8 — Cost evidence and controlled close | data model / service type | `mantle.work.production.ProductionCostEvent`, `ProductionCostAllocation` in the Accounting handoff; Products ProductStandardCost/Component; `mantle.work.ProductionServices.record#ProductionCostEvent` (the only event writer), `get#ProductionCosts` and `review#ProductionCosts`; Accounting `ironstone.accounting.ProductionCostServices.find#CostCloseQueue`, `preview#CostClose`, `post#CostClose` and `store#AllocationPolicy` | ByProducts, Costs, losses, subcontracting, reports | Freeze the estimate's effective-dated `productStandardCostId` and material/labor/machine/overhead/outside bases. Actual event references asset issue/receipt, TimeEntry/rate identity, machine event, AP line or GL correction. WIP and output allocation sums reconcile per currency. Accounting owns actual valuation, variance journals and period checks; no direct edit of WorkEffort.estimatedCost (commented) or silent revaluation. Late facts create linked open-period adjustments. The event writer's callers are the issue, return and output guards, the timesheet-approval hook (labor at the time entry's rate), `record#MachineRuntime`, service acceptance (outside-processing accrual) and the bill match (price variance); unvalued machine runtime waits for a rate and blocks the close (§13). Output receipts carry the run's frozen standard cost (R-SA-01). `post#CostClose` posts absorption and variance once and closes the run; later events are adjustments (R-SA-11). The GL account types are Accounting AC-07's. `ProductionAllocationPolicy` holds effective-dated allocation rows with audit-logged key fields, and a cost close keeps the row it applied. |
| M9 — Production batches | data model / service type | ProductionBatch, ProductionBatchMember, ProductionBatchAllocation | Batches, BatchDetail, finite schedule | Batch groups compatible operation IDs and setup basis; no new production-order identity or merged genealogy. Membership/revision checks and group schedule are atomic; each member posts stock/cost atomically and returns independent outcome. Dissolution cannot erase started/posted work. |
| M10 — Planning and reporting projections | service type / data model | Shared PlanningRun/PlanningSuggestion/RequirementSupply and SupplyPlanningServices; `mantle.work.ProductionPlanningServices`, `ProductionReportServices`; later forecast/master/schedule-proposal entities | Home, SupplyPlanning, scheduling, all reports | Shared netting includes units, inspection holds, reservations, supply provenance and freshness; exactly one converted supply per remaining demand allocation. Make conversion calls create#ProductionOrder for a draft, never release. Scheduling is Manufacturing's resource/date concern. Reports return scoped totals, as-of, omitted partitions and units; later forecast consumption avoids double counting firm orders. Production maintains the `WeptConsume`/`WeptProduce` rows that `get#InventoryProjectedInfo` nets (R-SA-05). ConvertSuggestions carries the method date (R-MFG-23). Make suggestions are PlanningSuggestion rows, not ProductionEstimate. Held quantity is a pending-release line left out of netting by default (§13). Manufacturing builds the shared part, CX-PLANNING (§13). |
| M11 — Resource timeline component | Vue component | Extend the built Projects WorkItems Timeline `.qvue` component ([design-projects](design-projects.md) §5) with resource lanes | ProductionSchedule | Lanes per work center or asset; operation bars with predecessors; offline intervals shaded; a drag shows a preview and never commits, and the commit goes through the Move form; the terminal path is the same resource/date table. |

### 12.1 Proposed service contracts

`mantle.product.BomServices` owns `find#Boms`, `store#Bom`, `store#BomItem`, `validate#BomDraft`, `release#BomDraft`, `get#BomExplosion` (one as-of date), `compare#BomDates` (two dates) and `get#BomWhereUsed`. Store calls accept stable identity plus expectedRevision; release returns the release decision, the lines it stamped and validation findings. Explosion/compare return provenance paths, the chosen BOMs and dates, quantities/conversions and completeness; they create no supply.

`mantle.work.RoutingServices` owns routing/resource/instruction/work-center editing named in §5–§6: `find#Routings`, `store#Routing`, `store#RoutingOperation`, `store#RoutingResource`, `release#RoutingDraft`, `find#OperationTemplates`, `store#OperationTemplate`, `store#OperationInstruction` (a dated `WorkEffortContent` row on the template), `store#WorkCenter`. It also owns `get#OperationCostBasis`, the read of effective WorkCenterRate × operation standards that Products' cost roll-up calls (R-MFG-25). Inputs are the form's scoped identifiers/fields and expected revision; outputs are saved ID/revision or named validation findings. Work-center financial rates require separate cost authority.

`mantle.work.ProductionServices` owns the read, create, release, controlled-change, operation-event, split, loss/downtime, subcontract, batch and policy calls named in forms. Mutations require actual organization, run/operation or source identity, expectedRevision, reason when altering released work and operationKey for transactional actions; outputs carry committed event/stock/accounting IDs, resulting revision/status, warnings and retry outcome. `create#ProductionOrder` creates one scoped draft with its provenance in one transaction (contract below). `release#ProductionOrder` freezes the run's lines, stamps the release time (the method, policy and estimate as of it) and creates operation children, without rewriting current posted facts; it calls `check#ProductUsable`, revalidates against a later release of the method (R-SA-12), sets `ownerPartyId` on each operation child and rewrites the `WeptConsume`/`WeptProduce` rows from the lines. `transition#ProductionOrder` validates phase-specific constraints; `record#ProductionQuantity`/`complete#ProductionOperation` reconcile input/output and quality; `change#ProductionQuantity`/`split#ProductionOrder` preserve executed work and remaining-demand conservation. `batch#ProductionAction` returns `{workEffortId, action, outcome, errorCode, message, retryable, operationKey}` per independent run, continuing after failure.

`create#ProductionOrder` contract (R-MFG-23, R-SA-03, R-SA-05). In: organizationPartyId, productId, quantity, quantityUomId, facilityId, originFacilityId, estimatedCompletionDate, productBomId (optional), routingWorkEffortId (optional), the method date (optional), planningSuggestionId or requirementId, sourceOrderId and orderItemSeqId, operationKey. Out: workEffortId, existing (true when the request identity already made a draft) and findings. The BOM and routing are read as of the method date, now by default. It calls `mantle.product.ProductServices.check#ProductUsable` (proposed, Products), calls `create#ProductionRun` without `produceProductId` or `consumeProductId`, sets `WorkEffort.ownerPartyId` to the organization, and writes the draft `ProductionRunLine` rows and the `WeptConsume`/`WeptProduce` aggregates from the BOM and routing as of that date.

`amend#ProductionOrder` (R-MFG-36). In: workEffortId, expectedRevision, a target method date or line changes, reason, approvalDecisionId, operationKey. Out: the run's new revision and remap findings. It is an audit-logged change to the run's remaining lines and operations: it remaps only unexecuted work, preserves the original fact links and rewrites the `WeptConsume`/`WeptProduce` rows. It follows the amendment policy (§13), and ProductionPolicy's strict-release flag refuses it.

The stock guards are `issue#ProductionMaterial` (no merge into an earlier issuance; status and owner checks; run workEffortId; line ID), `return#UnusedMaterial` (a new receipt fact with `sourceAssetIssuanceId`), `receive#ProductionOutput` (the run's frozen standard cost as `acquireCost`), `receive#SubcontractOutput` (consume at the vendor facility, receive output, call `accept#ServiceItem`, write cost events) and `record#ProductionLoss` (scrap inside a run). `record#ProductionCostEvent` is internal: it writes one event per unique source, component and revision key inside the posting transaction that causes it. `request#SubcontractService` creates the outside-processing Requirement. `request#ProductionMaintenance` creates an AssetMaintenance and, when asked, a linked Request.

Read services return authorized records, source age and completeness; they do not acquire stock or imply release. Proposed maintenance calls use `EquipmentServices.create#AssetMaintenance` and the existing Request create and link services, rather than a new case model; nonconformance and calibration calls are the shared `mantle.product.QualityServices` (R-MFG-07). Proposed `reverse#SupportedAssembly` is a reviewed adapter over the supported legacy assembly reversal only. `breakDown#Assembly` cancels issuances and so fires the `AssetIssuanceGlRePost` hook, which AC-06 makes a dated reversing delta, and the kit receipt's reduction is a dated reversing delta in an open period too; the guard refuses a kit whose current `PatMfgBom` quantities differ from those issued (§13, R-SA-02).

`mantle.work.ProductionPlanningServices` owns schedule/load and later forecast/master/finite proposal calls in §7. All commit calls check proposal/version and affected-resource concurrency; no solver writes directly to WorkEffort. `mantle.work.ProductionReportServices` owns the eight read-only report contracts in §9; parameters and columns are their public service shape. Canonical SupplyPlanningServices remains the only demand/supply conversion owner.

### 12.2 Reconciliation and transaction rules

For a run, target quantity is not the amount of component issue. Display target, accepted good, produced-held, pending, process loss, scrap and rework separately, in explicit compatible units. For each primary output line, target = accepted good + produced-held + remaining-to-produce + approved terminal output loss, subject to an explicitly approved target amendment or overproduction delta. Rework-in-progress is identified within the unresolved/held quantity and never added again as good; component scrap does not enter an output-unit equation. A rejected held output moves from held into an approved rework or terminal-loss disposition, preserving the physical event. A configured terminal reconciliation defines which residual quantities close the target; rework transferred out is not simultaneously finished good. Material comparison is required material versus net issued minus unused return; actual asset scrap and process loss are not an implicit reduction of required material. A finished receipt must reference an output line and input genealogy where tracked. Lot/serial uniqueness and owner/location constraints are enforced at posting time.

Backflush is a deliberate atomic stock action using the frozen method and selected actual lots; a scan or quantity entry alone cannot consent to an unknown substitution or negative stock. Verification alone releases no quality-held inventory. For this phase, coupled quantity/stock posting succeeds completely or leaves the transaction unposted with a named exception. A posting-guard failure of its automatic GL post sends that post to the error journal with the failed guard named, which Accounting's error-journal list and Today show and its period close refuses; an auto-poster that finds no account records a failure, never success (impl-accounting §4). Material issues and output receipts post only through the existing hooks (`AssetIssuanceGlPost`, `AssetReceiptGlPost`), and every output and return receipt passes `acquireCost`; labor, machine, overhead and outside processing reach the GL through Accounting's `post#CostClose` absorption entry (D12). A durable deferred-posting mode is a later proposal requiring an explicit Accounting contract; it is not an alternative first-release behavior.

## 13. Decided

| Decision | Notes |
| --- | --- |
| Simple runs remain first class | No routing is required. Run-level materials, quantities, person time, quality and costs remain usable; operation tabs are absent with an explanatory label. |
| One production run is one work order | `WepProductionRun` is the header. Batches are later separate setup groups with preserved run/operation identities and independent posting results. |
| Shared netting, Manufacturing scheduling | SupplyPlanning owns buy/make/transfer demand provenance and duplicate-supply prevention. Manufacturing owns resource/date scheduling; finite optimization, forecast and master schedule are later. |
| Completion is explicit reconciliation | Good, pending, process loss, scrap and rework never overwrite one another. Issue quantity is not completion authority. Existing set#ProducedProductQuantity is not a direct BOSS released-run endpoint. |
| One quality model and screen | Warehouse receipt, Manufacturing in-process/final and returns use the same record/template/lifecycle/disposition. Operator presentation adapts the existing fields without inventing another result model. |
| One reason-coded downtime record | No-material, no-operator, waiting-quality and equipment fault share interval/correction semantics; maintenance intake is an optional linked consequence only for relevant reasons, and that consequence is an AssetMaintenance (D24). |
| Work-center extension over Facility | Resource throughput, calendars, efficiency, rates and alternatives use the production extension. Existing Facility.capacity remains people capacity and shared facility identity remains canonical. |
| Phantom BOM differs from pick kit | Phantom is an audit-logged method field of the BOM header. PtPickAssembly remains existing pick-time assembly behavior and is not reused as the phantom flag. Kit components of a `PtPickAssembly` product stay `PatMfgBom` rows that Products edits (BOM source of truth, below). |
| Immutable release, controlled amendment | A run's lines are frozen at release, and its BOM, routing, instructions, quality template, policy, unit conversions and estimate basis are read as of its release time. New releases warn but never rewrite in-flight or historic work. |
| Stock and financial authority stay shared | Shared issue/receipt/disposition and Accounting handoff preserve lot/serial, ownership, WIP, valuation, GL and period rules. Production does not call ledger hooks independently or bypass a hold. |
| Existing time and cases remain owned | Projects timer/timesheet, Request and WorkItem remain the shared facilities. Machine runtime is separate; production context extensions do not create replacement apps. |
| Core outside processing now; advanced scope later | Outward component custody and purchased operation/quality receipt are new first-release designs; inward customer-owned processing, batches, NCR/CAPA/gauges, finite forecasting/MPS and 3D are later with explicit screens and needs. |
| Parity forms are carried forward | All 23 Manufacturing forms map to their redesigned or canonical host. Notes use Shared/Chatter; material forms use Shared/MaterialIssueReceipt. Catalog manufacturing association forms gain additive BOM/where-used mappings for products that are not kits. |
| BOM source of truth (D15, R-MFG-01) | (1) For a manufactured product, a `ProductBom` with its released `ProductBomItem` lines is the only method source, and release never writes `PatMfgBom`. (2) `PtPickAssembly` kit components stay `PatMfgBom` rows, edited in Products' Product360 Kit components pane through proposed `mantle.product.ProductServices.store#KitComponent` with the cycle guard, and are excluded from BillOfMaterialsDetail. (3) `create#ProductionOrder` calls `create#ProductionRun` without `produceProductId` or `consumeProductId` and then writes the material lines from the BOM as of the chosen date; release freezes them as the run's `ProductionRunLine` rows. (4) `get#ProductBomDetail` remains only for kits and migration comparison. (5) `create#ProductionOrder` writes the `WeptConsume`/`WeptProduce` aggregates (R-SA-05). Warehouse costs kit assembly in its posting guard (R-SA-04). |
| Existing SECAs on production paths (D1) | `AssetIssuanceGlPost` (an issue posts Dr WIP, Cr Inventory) is kept; it books WIP only because the run owner is the organization (R-SA-03). `AssetIssuanceGlRePost` (an update of an issuance unposts, deletes and reposts) is replaced: Accounting AC-06 changes it to post a dated reversing delta (crosscut §1.3). Production never triggers it anyway, because BOSS never updates or cancels a posted production issuance. `AssetReceiptGlPost` (a receipt with a work effort posts Dr Inventory, Cr WIP) is kept, and every output and return receipt passes `acquireCost`. `AssetDetailPhysicalVarianceGlPost` (variance by the scrap reason's account, then by sign; impl-warehouse §4) is not used for scrap inside a run (R-MFG-20). `AssetStatusAvailableReservations` (auto-reserve on `AstAvailable`) is kept, with the pegged order item reserved first (R-SA-10). `ShipmentIncomingDeliveredCreateInvoices` never runs for subcontract output, which is not received on a purchase shipment (D14). The crosscut §1.3 register lists them. |
| Production cost to the GL (D12) | Manufacturing writes every cost event through `record#ProductionCostEvent` inside the posting that causes it. Labor events are written when a timesheet is approved, at the time entry's rate. The run's `ownerPartyId` is the organization. Output receipt carries the run's frozen standard cost. Accounting owns the allocation policy (`Accounting/Settings/CostingPolicies`) and the posting rule beside the existing issue and receipt hooks, so WIP is relieved once. Accounting's `post#CostClose` also closes the run (R-MFG-02, R-SA-01, R-SA-03, R-SA-09, R-SA-11, R-SA-18). |
| Allocation, overhead and co-product policy (D12, R-MFG-34) | Moved from Open. Accounting owns the policy at `Accounting/Settings/CostingPolicies` (proposed `ProductionCostServices.store#AllocationPolicy`); ProductionSettings only links to it. The default (impl-manufacturing §4): overhead at a rate per work-center hour, from WorkCenterRate's overhead component, times the run's actual setup and run hours; co-products by quantity normalized to a common unit. CostingPolicies also offers fixed shares on the BOM's output lines and relative sales value for co-products, and a percentage of direct labor or none for overhead. Crosscut §9 and Accounting's design take the default when the cost close is built. |
| Material returns and issues (D13) | Unused material comes back through `return#UnusedMaterial`, which posts a new receipt fact and never calls `cancel#AssetIssuance`. Issues never merge into an earlier issuance. Each movement records the run's workEffortId, the operation and the run line ID (R-SA-02, R-SA-07, R-MFG-19). |
| Subcontract owners (D14) | Manufacturing owns `request#SubcontractService` and `receive#SubcontractOutput`. Purchasing owns the service PO and `accept#ServiceItem`. Warehouse owns dispatch and return at `Warehouse/Transfers/SubcontractShipmentDetail`, from a vendor facility the organization owns, so stock stays the company's. Accounting allocates the charge. Service lines get no receipt-SECA bill (R-XC-07, R-MFG-04, R-MFG-05, R-SA-08, R-SA-13). |
| WIP is a GL and state concept (R-MFG-03) | There is no WIP stock location. Physical line-side staging is a Warehouse move, opened from Components Stage, and issue posts from wherever the stock is. Component reservation and a production pick mode are later (§14). |
| Downtime maintenance uses AssetMaintenance (D24, R-MFG-06) | `request#ProductionMaintenance` creates an AssetMaintenance through `EquipmentServices.create#AssetMaintenance`; a Request of the proposed type `RqtMaintenance` is an optional intake trail. The later Maintenance app adopts these records. |
| Held output and scrap (R-MFG-20, R-MFG-24, D21) | Output that needs inspection is received in `AstQuarantine`, and held means the quantity on hand in `AstQuarantine`, `AstOnHold` or `AstDefective`. Gates read `QualityServices.get#SourceInspectionStatus`. Scrap of issued components and of output inside an open run goes through `record#ProductionLoss`; free stock is scrapped in Warehouse; process loss is a quantity event only. |
| Product usability (D19) | `create#ProductionOrder` and `release#ProductionOrder` call Products' proposed `ProductServices.check#ProductUsable` with usage Produce. Products names the lifecycle status IDs. |
| Capability groups (D22) | The §1.1 capabilities map to proposed `BOSS_MANUFACTURING_<CAPABILITY>` groups in the crosscut §1 table. Buyer and finance capabilities are Purchasing and Accounting groups that Manufacturing screens compose. `BOSS_MANUFACTURING` is the root user group and artifact group; its groups take `MANTLE_USER_ORG`, whose Facility filter is the plant scope, and `BOSS_MANUFACTURING_ADMIN` is the admin group, with all authz on the root and `MANTLE_ACTIVE_ORG`. The production and resource administrator is `BOSS_MANUFACTURING_RESOURCE_ADMIN` (impl-manufacturing §4). |
| Chatter and Files hosts (D25) | Each host has a single-field key and a content entity: WorkEffort (`WorkEffortContent`) for runs, operations, routings and operation templates; ProductBom (proposed `ProductBomContent`); Facility (`FacilityContent`). A run's lines and a published instruction have no Files tab of their own. |
| Screen names (D27, R-MFG-10) | `Boms` is `BillsOfMaterials`, and the `Bom*` screens are `BillOfMaterialsDetail`, `BillOfMaterialsExplosion`, `BillOfMaterialsCompare` and `BillOfMaterialsVarianceReport`, with the files `Shared/BillOfMaterialsDetail.xml`, `Shared/BillOfMaterialsExplosion.xml` and `Shared/BillOfMaterialsCompare.xml`. The menu title keeps "BOMs", and Mantle names (`ProductBom*`, `BomServices`, `get#ProductBomDetail`) keep "Bom". The ProductionCosts, MaterialIssueReceipt and SubcontractOperations paths now end in the screen name (R-MFG-38). |
| ProductionServices beside ManufacturingServices (R-MFG-35) | The existing `mantle.work.ManufacturingServices` keeps the legacy run, assembly and display services unchanged, so kits and migration still call them. The new guarded lifecycle, execution, stock-guard and cost-event verbs live in proposed `mantle.work.ProductionServices`, which calls ManufacturingServices internally. `RoutingServices`, `ProductionPlanningServices`, `ProductionReportServices` and `mantle.product.BomServices` are new files too. |
| ProductionEstimate stays unused (R-MFG-27) | Make suggestions are `PlanningSuggestion` rows (crosscut §3.20); BOSS does not use Mantle's ProductionEstimate. |
| Merged research candidates (R-MFG-18) | Cost roll-up is Products' CostRollup, opened from the method. The change-quantity and backorder wizards are the Quantities ChangeQuantity dialog and the SplitWorkOrder backorder mode. Downtime and scrap reasons are ReasonCodes. Component shortages are a Home queue column with links to Components and SupplyPlanning. The ERPNext report variants are the eight report screens of §9, which are ordinary find screens with saved parameters rather than a separate report engine. |
| Minimum release material gate | Moved from Open. Release requires a valid method and configuration and, by default, all components usable. A supervisor may approve a staged release, which keeps the shortage visible and blocks the affected operation's issue and start; the ProductionSettings shortage release policy chooses. This mirrors Odoo's all-available or as-soon-as-possible choice. |
| Dated methods (impl-products §4, impl-manufacturing §4) | A `ProductBom` header (product, organization and method; the Chatter and Files host through `ProductBomContent`) has audit-logged method fields: base quantity and unit, phantom, routing, lead and preparation days. Its `ProductBomItem` lines are effective-dated, with a stable `bomItemId` and audit-logged key fields. Routings are Mantle's `WepRouting` and `WepRoutingTask` WorkEfforts on dated `WeatRoutingComp` rows, with audit-logged standards. A release is an approval decision that stamps the draft lines' from date and the replaced lines' thru date; an explosion reads one date and a comparison two. `ProductBomVersion`, `ProductBomVersionContent`, `RoutingVersion` and `RoutingVersionOperation` are dropped; `PatMfgBom` stays for kits only (D15). Products builds them (impl-products P8). |
| Runs have their own lines (impl-warehouse §4, impl-manufacturing §4) | A run's material and output lines are `ProductionRunLine` records by role, with a stable ID, source `bomItemId`, product, quantity and unit, exact stock conversion and operation, written at create and frozen at release; they stay records because issuances and receipts reference them. The run's revision, release time and frozen standard are audit-logged run fields, and its operation children carry their routing operation, sequence and work center. An amendment is an audit-logged change to the remaining lines. A method "version" is the method as of a release date, and a run's release is its lines and release time. `ProductionRunSnapshot`, `ProductionMaterialSnapshot` and `ProductionOperationSnapshot` are dropped. Warehouse builds them (impl-warehouse P16a). |
| Dated instructions (impl-manufacturing §4) | A published instruction is a `WorkEffortContent` row of an instruction content type on the operation template, its file stored immutably with a checksum. `WorkEffortContent` gains audit-logged `fromDate` and `thruDate`, so a publish ends the previous row and starts the next. The required evidence and the quality template are audit-logged fields of the operation template, and a run's operation shows the instruction as of its release time. An operator's acknowledgment stays a record of its own (who, when, which content row). `ProductionInstructionVersion` is dropped. |
| Policies and reasons by effective date (impl-manufacturing §4) | ProductionPolicy, the reason codes and Accounting's `ProductionAllocationPolicy` are effective-dated rows with audit-logged key fields; a run keeps the policy row of its release time, and a cost close the allocation row it applied. A requirement's organization is a RequirementParty in the OrgInternal role (impl-drawers-commons §4). |
| Accounting's shared posting rules (impl-accounting §4) | Each Mantle rule change sits behind its own flag, off by default; Manufacturing's, such as the production approver rule in `get#TimesheetApprovers`, are ProductionPolicy fields. Every operation key is on the one CX-POSTING operation record. A posting-guard failure of an automatic production post goes to the error journal with the guard named; a finance user's direct post is refused. Approvals filters Commons Notifications by the app's approval topic list. Scrap outside a run posts by its reason (impl-warehouse §4). |
| Completion with no formal inspection (impl-manufacturing §4) | Moved from Open. Explicit final reconciliation by default. A ProductionPolicy flag, off by default, lets the final output receipt reconcile and complete in the same atomic service with the same evidence. |
| Released-run amendment policy (R-MFG-36, impl-manufacturing §4) | Moved from Open. No method change after any material, time or output fact by default; a controlled amendment of the remaining lines and operations, reviewed by the method approver and the production supervisor, through `amend#ProductionOrder` (§12.1), and linked to a change notice when Products ChangeNotices is on (R-MFG-32). A ProductionPolicy flag for strict release refuses amendments and needs a linked new run. |
| Kit disassembly ships (impl-manufacturing §4) | `reverse#SupportedAssembly` over `breakDown#Assembly` is in the first release, for a `PtPickAssembly` kit only. Its issuance cancels post AC-06's dated reversing delta, and the kit receipt's reduction is a dated reversing delta in an open period, in place of `repost#Asset`'s unpost, delete and re-post. The guard checks the current `PatMfgBom` quantities against those actually issued and refuses a difference. General unbuild of produced output stays later (§14). |
| Skill certification and safety acknowledgment (impl-manufacturing §4) | Moved from Open. An operation template's required skills (`mantle.work.effort.WorkEffortSkillStandard` against `mantle.humanres.ability.PartySkill`) or required acknowledgment block Start, with a supervisor override and its reason recorded; with none configured the check is a visible advisory. Production's authorization cannot infer employee competence from assignment alone. |
| Unvalued machine runtime (impl-manufacturing §4) | Machine runtime with no effective WorkCenterRate is recorded with its hours and no value, marked unvalued, and listed in the cost exceptions and the cost-close queue. A review writes its cost event once a rate is effective on its date, and ProductionCostClose refuses to close a run that still has one. |
| Panes the canonical screens lack (R-MFG-21, impl-manufacturing §4) | Moved from Open. Each is built with the Manufacturing context and written into crosscut when built: EquipmentDetail's Request maintenance action, calling `request#ProductionMaintenance`; Supplier360's subcontract orders; and OrderDetail's production links, a sales order's supplying runs and a service PO's run and operation. A SupplierQualifications list for approved product/operation qualifications stays later, with Purchasing's SupplierProfile family. |
| Held quantity in planning (D21, R-SA-17, impl-manufacturing §4) | Moved from Open. Held receipts and output are a pending-release supply line with the inspection's due date, left out of netting by default; the plan schedule's organization option nets held quantity whose inspection is due within the lead time. |
| Manufacturing builds CX-PLANNING (impl-manufacturing §4) | PlanningRun, PlanningSuggestion and RequirementSupply, `run#SupplyPlan`, `get#SupplyPlan`, `store#PlanSchedule` and `convert#PlanningSuggestions`, and `Shared/SupplyPlanning` with the Manufacturing context. It converts make suggestions, and outside-processing requirements to draft service PO lines for `BOSS_PURCHASING_BUYER` on the Manufacturing mount, which crosscut §3.20's Manufacturing row gains. Purchasing adds its mount and buy conversion, and Warehouse its mount and transfer conversion, when each is built. |
| Variant-conditional BOM lines (R-MFG-09, impl-products §4) | Moved from Open. `ProductBomItem` has optional `applicabilityFeatureIds` (a ProductFeature set), an audit-logged key field, so the line identity stays the same. `get#BomExplosion` evaluates it against the selected variant's features and writes only the matching lines to the run. The editor UI is `later`, and Products PRD-CONFIGURATION supplies the variant's features. Operation applicability stays Open (§14). |
| Documentation is not implementation | Every proposed family/entity remains new work. Old commented cost definitions and incomplete legacy orchestration are not reported as implemented, and application builds are not part of this pass. |

## 14. Open

These are deployment/product review items with recommended answers; they do not leave ownership or cross-app contracts contradictory.

| Review item | Recommended answer and reason |
| --- | --- |
| Nonconformance and calibration first-release demand | Keep the designed later phase unless a pilot has regulated/contractual traceability needs; then bring the exact extension forward without changing Request or quality-screen ownership. The services already move to the shared `mantle.product.QualityServices` (R-MFG-07), so a pilot does not pull in a production-only model. |
| Later deferred cost posting (also in crosscut §9) | Retain atomic stock plus configured financial posting for this phase. Consider deferred mode only as a later Accounting extension with durable source identity, explicit pending/failed status, recovery and cost-close blocking; never report pending work as GL success. |
| Component reservation and production picking (also in crosscut §9) | Later. Warehouse Picking gains a production pick mode over the released run's lines; it moves stock to a staging location for the run, and MaterialIssueReceipt issues from staging. Reservation needs proposed `AssetReservation.workEffortId` plus the run line ID (CX-PRODUCTION); it reserves on release when the policy says so and releases on issue or cancel. The first release stages by a Warehouse move (§13) (R-MFG-03, R-WH-09). |
| General unbuild of produced output | Later. Extend Disassembly with Unbuild from source run: select a received output asset by `Asset.acquireWorkEffortId`; the preview uses that run's `ProductionRunLine` material lines and actual AssetIssuance rows. Confirm calls proposed `mantle.work.ProductionServices.unbuild#ProductionOutput`, which issues the output to a linked unbuild run and receives the components at their original issuance cost as new receipt facts, with a cost event reversal; it never cancels issuances. `breakDown#Assembly` stays only for `PtPickAssembly`. Odoo, AureusERP, Dolibarr and ERPNext all have unbuild (R-MFG-08). |
| Variant-conditional routing operations | Give a routing's operations the same optional `applicabilityFeatureIds` as the BOM lines (§13), so one routing serves every variant and the run's operation children are only the matching ones. The plans add it to the BOM lines only (R-MFG-09). |
| Shared-station operator switch | Later, behind a framework authentication review: a badge scan plus PIN as a step-up on an authenticated station session, with no shared supervisor credential (R-MFG-33). |
