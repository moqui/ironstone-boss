# IronStone BOSS — Manufacturing design

Oct 27, 2026 — draft

IronStone Manufacturing serves production planners, method engineers, supervisors and shop-floor operators. It covers simple production runs and routed work orders, controlled BOMs and routings, material and quantity capture, quality, work centers, shared supply planning, production scheduling and cost evidence. A small manufacturer can use the app on its own with the same shared product, stock, party and accounting contracts that larger deployments use across the suite.

**Inputs.** [research-manufacturing.md](research-manufacturing.md) §1–§14; [design-crosscut.md](design-crosscut.md); [design-products.md](design-products.md); [design-warehouse.md](design-warehouse.md); [design-purchasing.md](design-purchasing.md); [design-accounting.md](design-accounting.md); [design-projects.md](design-projects.md); [design-drawers-commons.md](design-drawers-commons.md); [initial-design.md](initial-design.md), [design-doc-guide.md](design-doc-guide.md), [style-guide.md](style-guide.md), [ss-inventory.md](ss-inventory.md) and [usl-inventory.md](usl-inventory.md). Source verification uses active `mr-mantle` and `mr-marble` XML, rather than the earlier checkout names in research. Reference paths below are local files under `~/work/moquiwork/3p_other`, inspected for concrete interaction and transaction patterns.

**Sections.** [1 shell](#1-shell) · [2 screens](#2-screens) · [3 work orders](#3-work-orders) · [4 shop floor](#4-shop-floor) · [5 BOMs and routings](#5-boms-and-routings) · [6 work centers and quality](#6-work-centers-and-quality) · [7 planning and outside processing](#7-planning-and-outside-processing) · [8 batches and settings](#8-batches-and-settings) · [9 reports](#9-reports) · [10 coverage](#10-coverage-and-validation) · [11 outputs](#11-documents-and-outputs) · [12 needs](#12-framework-and-data-needs) · [13 decided](#13-decided) · [14 open](#14-open)

## 1. Shell

### 1.1 Root, access and conventions

Root `screen/Manufacturing.xml`, mounted as `Manufacturing`, uses the existing `BOSS_MANUFACTURING` grant and `sym_o_precision_manufacturing`. Root/section placeholders exist; they are not implemented production workflows. The current root calls `mantle.party.PartyServices.setup#UserOrganizationInfo` and sets app context. Commons owns the shell, palette, quick create, tray, Chatter, files, approvals and calendar; Projects owns requests, work items and person time/timesheets. This app contributes production context and providers to those facilities.

Proposed capabilities distinguish production reader, planner, scheduler, method engineer, method approver, operator, supervisor, quality inspector, quality verifier, cost estimator and production/resource administrator. Existing financial, stock and party permissions are composed with them. Every service checks actual organization, facility, record, operation and action authority. `appRoot=Manufacturing`, assigned-operator context or a hidden cost column is not authorization. Operators can issue/receive only within their explicit stock scope; an assignment is not an implicit inventory grant. The common record mounts work without requiring another app's root grant when the user has the underlying permissions.

XML is the default implementation. All lists use saved finds, server paging and row identity; bulk mutation returns a named outcome for every independent record. Dirty forms retain input after errors. Values unavailable by permission are omitted, not represented as zero. Stock and financial mutations are atomic per logical transaction; retries carry a persisted operation key and read the prior result before reapplying. Errors identify the run, operation, source line and failed check without leaking inaccessible record details.

### 1.2 Menu

- Home — `Home`
- Work orders — `WorkOrders`
  - New work order — `NewWorkOrder`; record routes — `WorkOrderDetail`, `SplitWorkOrder`; supported disassembly — `Disassembly`
- Shop floor — `ShopFloor`
  - Operator work — `OperationExecution`; instructions — `Instructions`; assembly viewer and wall display — `later`
- BOMs — `Boms`
  - Method record — `BomDetail`; where used — `WhereUsed`
- Routings — `Routings`
  - Routing record — `RoutingDetail`; operation catalogue — `OperationTemplates`
- Work centers — `WorkCenters`
  - Equipment — `Equipment`; calendar — `ResourceCalendar`
- Quality — `Inspections`
  - Templates — `InspectionTemplates`; scrap/loss — `ScrapLoss`; downtime — `Downtime`; nonconformance and gauges — `later`
- Planning — `SupplyPlanning`
  - Schedule — `ProductionSchedule`; capacity — `Capacity`; forecast, master and finite schedules — `later`
- Subcontracting — `SubcontractOperations`
  - Outside-processing record — `SubcontractDetail`; customer-material work — `later`
- Batches — `Batches` (`later`)
  - Batch record — `BatchDetail`
- Reports — `Reports`
  - Status, materials, operation performance, loss, quality, cost, BOM variance and planning
- Settings — `ProductionSettings`
  - Reason codes — `ReasonCodes`; approvals — `Approvals`

Record routes are contextual, not extra menu depth. Home shows open/WIP/late/component-short/completed-this-month counts, assigned work, due operations and shortages. Quick create offers a draft work order, downtime report or linked request according to capability. Palette searches run/product/method IDs and scoped equipment; Today contributes assigned due operations and actionable quality/planning exceptions. Notifications carry record/revision links and avoid repeating unchanged blocks.

### 1.3 Verified foundation and boundaries

| Current source | Verified behavior and design consequence |
| --- | --- |
| [ManufacturingServices.xml](../../mr-mantle/service/mantle/work/ManufacturingServices.xml) | Active `create#ProductionRun`, display/produce-consume queries, assembly issue/unissue/breakdown and pick information exist. Create sets production purpose and draft status and builds simple consume/produce rows. `get#ProductBomDetail` is single-level and does not implement versioned scrap/effectivity explosion. These services are a foundation, not an implemented production scheduler or controlled release workflow. |
| [WorkEffortEntities.xml](../../mr-mantle/entity/WorkEffortEntities.xml) | Active WorkEffort, WorkEffortProduct, assignments, asset/skill needs, TimeEntry, ProductionEstimate and joins exist. WorkEffortProduct has product/fromDate identity and estimatedQuantity/estimatedCost, but no independent same-product operation line or quantity UOM. WorkEffort's `estimatedCost` field is commented out; do not write to it. |
| [ProductDefinitionEntities.xml](../../mr-mantle/entity/ProductDefinitionEntities.xml) | Active ProductAssoc `PatMfgBom` is the baseline material relationship with quantity, scrapFactor, instruction, routingWorkEffortId and effectivity. It has no released BOM header/version or quantityUomId; packaging-unit extension is proposed in crosscut. It cannot be stretched into immutable repeated-line production history merely by adding one foreign key. |
| [FacilityEntities.xml](../../mr-mantle/entity/FacilityEntities.xml) | Active Facility and `FcTpLine` identity are reused. Existing `capacity` is people capacity, not throughput. Production resource capacity needs the proposed extension. |
| [AssetServices.xml](../../mr-mantle/service/mantle/product/AssetServices.xml) and [AssetAutoPostServices.xml](../../mr-mantle/service/mantle/ledger/AssetAutoPostServices.xml) | Active issue-to-work-effort, receipt and ledger hooks provide stock/WIP integration. Shared wrappers must add request identity, line linkage, authorization and reviewed correction behavior; raw services alone do not prove all release/period/quality guarantees. Screens never directly invoke ledger EECA hooks as a second posting. |
| [TimesheetServices.xml](../../mr-mantle/service/mantle/work/TimesheetServices.xml) and [TimeServices.xml](../../mr-mantle/service/mantle/work/TimeServices.xml) | Current timer and weekly-timesheet policy/access/approval/locking services already exist. Use these. Legacy store#TimeEntryWorkEffort creates/updates a WorkEffort and requires client/time inputs; it is not a ready production timer wrapper. |
| [Projects design](design-projects.md) and [Commons design](design-drawers-commons.md) plus current shared screens | RequestWorkEffort/WorkEffortRecord links, request intake, calendar/work hours, approvals, time and files are existing facilities to extend narrowly. No new Manufacturing task/case/calendar subsystem is assumed. |

**Status truth.** Production state labels use active WorkEffort status IDs, but the new production guards and operation event/state machine remain proposed. New quality, planning, BOM/revision, downtime, loss, machine-time and production-snapshot records below are proposed additions. ProductStandardCost/ProductStandardCostComponent are the agreed new estimate model in `mantle.product.cost`; commented-out historical costing definitions are not enabled by this document. Actual asset valuation and GL changes remain Accounting-owned.

## 2. Screens

All paths are under the BOSS app root; these are proposed screen routes, not claims that XML files already exist. `parity` preserves a baseline capability and may still require the shared safety extensions. A `later` row is designed here but excluded from the first release. A mixed-capability screen explicitly identifies its later extension in its section.

| Screen | Path | Archetype | Impl | Purpose | Main record | Reused | Roles | Scope | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Home | `Manufacturing/Home` | landing | xml | Show production work that needs attention. | authorized production summary | own | app | new | authorized production summary |
| WorkOrders | `Manufacturing/WorkOrders` | list | xml | Find simple runs and routed work orders. | mantle.work.effort.WorkEffort | own | app | parity | mantle.work.effort.WorkEffort |
| NewWorkOrder | `Manufacturing/WorkOrders/NewWorkOrder` | wizard | xml | Create a draft run from an approved product method or manually. | mantle.work.effort.WorkEffort | own | planner | parity | mantle.work.effort.WorkEffort |
| WorkOrderDetail | `Manufacturing/WorkOrders/WorkOrderDetail` | detail | xml | Control the production lifecycle and its cross-app evidence. | mantle.work.effort.WorkEffort | own | app; transitions planner/supervisor | parity | mantle.work.effort.WorkEffort |
| Overview | `Manufacturing/WorkOrders/WorkOrderDetail/Overview` | detail | xml | Maintain draft dates, assignments and equipment. | mantle.work.effort.WorkEffort | own | app | parity | mantle.work.effort.WorkEffort |
| Components | `Manufacturing/WorkOrders/WorkOrderDetail/Components` | detail | xml | Compare planned materials, availability and actual issues. | proposed ProductionMaterialSnapshot | own | app | parity | proposed ProductionMaterialSnapshot |
| MaterialIssueReceipt | `Manufacturing/WorkOrders/WorkOrderDetail/Materials` | task | xml | Open the canonical MaterialIssueReceipt in production context. | AssetIssuance / AssetReceipt | MaterialIssueReceipt, [crosscut §3.9](design-crosscut.md#39-materialissuereceipt) | app | parity | AssetIssuance / AssetReceipt |
| Operations | `Manufacturing/WorkOrders/WorkOrderDetail/Operations` | list | xml | Track released operation instances and dependencies. | WorkEffort children + proposed ProductionOperationSnapshot | own | operator/planner | new | WorkEffort children + proposed ProductionOperationSnapshot |
| Quantities | `Manufacturing/WorkOrders/WorkOrderDetail/Quantities` | detail | xml | Reconcile partial output, remaining work, scrap and rework. | WorkEffortProduct + proposed ProductionQuantityEvent | own | app | parity | WorkEffortProduct + proposed ProductionQuantityEvent |
| SplitWorkOrder | `Manufacturing/WorkOrders/WorkOrderDetail/SplitWorkOrder` | wizard | xml | Split uncompleted demand or create a linked backorder. | WorkEffort + RequirementSupply (proposed) | own | planner/supervisor | new | WorkEffort + RequirementSupply (proposed) |
| ProductionTime | `Manufacturing/WorkOrders/WorkOrderDetail/Time` | list | xml | Open the canonical ProductionTime in production context. | mantle.work.time.TimeEntry | TimeEntries, [Projects time](design-projects.md) | app | parity | mantle.work.time.TimeEntry |
| ByProducts | `Manufacturing/WorkOrders/WorkOrderDetail/ByProducts` | detail | xml | Plan and receive traceable secondary outputs. | proposed ProductBomItem / ProductionMaterialSnapshot | own | app | new | proposed ProductBomItem / ProductionMaterialSnapshot |
| QualityGates | `Manufacturing/WorkOrders/WorkOrderDetail/Quality` | list | xml | Expose required inspections and blocking decisions. | mantle.product.quality.QualityInspection (proposed) | own | app | new | mantle.product.quality.QualityInspection (proposed) |
| ProductionCosts | `Manufacturing/WorkOrders/WorkOrderDetail/Costs` | report | xml | Explain estimate, actual WIP and completion variance. | proposed ProductionCostEvent / ProductionCostAllocation + ledger evidence | own | cost estimator; actual values finance | new | proposed ProductionCostEvent / ProductionCostAllocation + ledger evidence |
| ProductionCostClose | `Manufacturing/WorkOrders/WorkOrderDetail/ProductionCostClose` | task | xml | Review and post authorized WIP/output allocation and variance. | proposed ProductionCostEvent / ProductionCostAllocation | Accounting §10; [crosscut §3.24](design-crosscut.md#324-production-cost-close) | financial readers; GL/finance approver | new | organization, run and source revision |
| Chatter | `Manufacturing/WorkOrders/WorkOrderDetail/Chatter` | panel | xml | Open the canonical Chatter in production context. | WorkEffort record context | Chatter, [crosscut §3.14](design-crosscut.md#314-chatter-and-recordfiles) | app | parity | WorkEffort record context |
| RecordFiles | `Manufacturing/WorkOrders/WorkOrderDetail/Files` | list | xml | Open the canonical RecordFiles in production context. | WorkEffort content context | RecordFiles, [crosscut §3.14](design-crosscut.md#314-chatter-and-recordfiles) | app | new | WorkEffort content context |
| ShopFloor | `Manufacturing/ShopFloor` | board | qvue | Present a plant queue and focused operator work. | WorkEffort operation/run selection | own | operator/supervisor | new | WorkEffort operation/run selection |
| OperationExecution | `Manufacturing/ShopFloor/OperationExecution` | task | xml | Execute one operation or simple run with explicit reconciliation. | WorkEffort + ProductionOperationSnapshot (proposed) | own | operator | new | WorkEffort + ProductionOperationSnapshot (proposed) |
| Instructions | `Manufacturing/ShopFloor/Instructions` | task | xml | Read and acknowledge the released instruction version. | proposed ProductionInstructionVersion | own | operator | new | proposed ProductionInstructionVersion |
| AssemblyViewer | `Manufacturing/ShopFloor/AssemblyViewer` | task | qvue | Explore assembly geometry alongside approved textual steps. | proposed ProductionInstructionVersion | own | operator | later | proposed ProductionInstructionVersion |
| WallDisplay | `Manufacturing/ShopFloor/WallDisplay` | board | qvue | Show authorized station status without personal or cost data. | production queue projection | own | plant display | later | production queue projection |
| Boms | `Manufacturing/Boms` | list | xml | Find manufacturing methods and effective revisions. | mantle.product.bom.ProductBom / ProductBomVersion (proposed) | own | app; edits method engineer | parity | mantle.product.bom.ProductBom / ProductBomVersion (proposed) |
| BomDetail | `Manufacturing/Boms/BomDetail` | detail | xml | Maintain versioned components, operations and outputs. | mantle.product.bom.ProductBomVersion (proposed) | own | method engineer; release method approver | parity | mantle.product.bom.ProductBomVersion (proposed) |
| BomExplosion | `Manufacturing/Boms/BomDetail/BomExplosion` | report | xml | Explain multi-level quantity and cost requirements. | proposed versioned BOM explosion | own | app | new | proposed versioned BOM explosion |
| BomCompare | `Manufacturing/Boms/BomDetail/BomCompare` | report | xml | Compare revisions without rewriting released work. | ProductBomVersion / RoutingVersion (proposed) | own | app | new | ProductBomVersion / RoutingVersion (proposed) |
| WhereUsed | `Manufacturing/Boms/WhereUsed` | report | xml | Trace a component into affected current and historical methods. | ProductAssoc + ProductBomItem (proposed) | own | app | parity | ProductAssoc + ProductBomItem (proposed) |
| Routings | `Manufacturing/Routings` | list | xml | Find reusable routing templates and versions. | mantle.work.effort.WorkEffort (WepRouting) | own | method engineer | new | mantle.work.effort.WorkEffort (WepRouting) |
| RoutingDetail | `Manufacturing/Routings/RoutingDetail` | detail | xml | Define operation sequence, resources and instructions. | WorkEffort WepRouting + RoutingVersion (proposed) | own | method engineer | new | WorkEffort WepRouting + RoutingVersion (proposed) |
| OperationTemplates | `Manufacturing/Routings/OperationTemplates` | list | xml | Maintain reusable operations and approved instruction versions. | WorkEffort WepRoutingTask | own | method engineer | new | WorkEffort WepRoutingTask |
| Product360 | `Manufacturing/Products/Product360` | 360 | xml | Open the canonical Product360 in production context. | mantle.product.Product | Product360, [crosscut §3.5](design-crosscut.md#35-product360) | app | parity | mantle.product.Product |
| WorkCenters | `Manufacturing/WorkCenters` | list | xml | Find plant resources and capacity exceptions. | mantle.facility.Facility + WorkCenter (proposed) | own | planner/resource administrator | new | mantle.facility.Facility + WorkCenter (proposed) |
| FacilityDetail | `Manufacturing/WorkCenters/FacilityDetail` | detail | xml | Open the canonical FacilityDetail in production context. | mantle.facility.Facility | FacilityDetail, [crosscut §3.10](design-crosscut.md#310-facilitydetail-and-equipmentdetail) | app | parity | mantle.facility.Facility |
| Equipment | `Manufacturing/WorkCenters/Equipment` | list | xml | Find production equipment and active restrictions. | mantle.product.asset.Asset | own | app | parity | mantle.product.asset.Asset |
| EquipmentDetail | `Manufacturing/WorkCenters/Equipment/EquipmentDetail` | detail | xml | Open the canonical EquipmentDetail in production context. | mantle.product.asset.Asset | EquipmentDetail, [crosscut §3.10](design-crosscut.md#310-facilitydetail-and-equipmentdetail) | app | parity | mantle.product.asset.Asset |
| ResourceCalendar | `Manufacturing/WorkCenters/Calendar` | calendar | xml | Open the canonical ResourceCalendar in production context. | WorkEffort / Calendar context | Calendar, [crosscut §3.13](design-crosscut.md#313-calendar-and-schedules) | app | new | WorkEffort / Calendar context |
| Inspections | `Manufacturing/Quality/Inspections` | list | xml | Find in-process, final and reinspection work. | mantle.product.quality.QualityInspection (proposed) | own | app | new | mantle.product.quality.QualityInspection (proposed) |
| QualityInspection | `Manufacturing/Quality/QualityInspection` | task | xml | Open the canonical QualityInspection in production context. | mantle.product.quality.QualityInspection (proposed) | QualityInspection, [crosscut §3.19](design-crosscut.md#319-qualityinspection-and-inspectiontemplates) | app | new | mantle.product.quality.QualityInspection (proposed) |
| InspectionTemplates | `Manufacturing/Quality/InspectionTemplates` | settings | xml | Open the canonical InspectionTemplates in production context. | InspectionTemplate / InspectionTemplateItem (proposed) | InspectionTemplates, [crosscut §3.19](design-crosscut.md#319-qualityinspection-and-inspectiontemplates) | app | new | InspectionTemplate / InspectionTemplateItem (proposed) |
| ScrapLoss | `Manufacturing/Quality/ScrapLoss` | list | xml | Record and review scrap, process loss and rework. | mantle.work.production.ProductionLoss (proposed) | own | app | new | mantle.work.production.ProductionLoss (proposed) |
| Downtime | `Manufacturing/Quality/Downtime` | list | xml | Capture reason-coded production stops and recovery. | mantle.work.production.ProductionDowntime (proposed) | own | app | new | mantle.work.production.ProductionDowntime (proposed) |
| Nonconformances | `Manufacturing/Quality/Nonconformances` | list | xml | Manage findings and corrective action without duplicating cases. | Request + proposed QualityNonconformance | own | quality specialist | later | Request + proposed QualityNonconformance |
| Gauges | `Manufacturing/Quality/Gauges` | list | xml | Track inspection instruments and calibration evidence. | Asset + proposed GaugeCalibration | own | quality specialist | later | Asset + proposed GaugeCalibration |
| RequestDetail | `Manufacturing/Quality/RequestDetail` | detail | xml | Open the canonical RequestDetail in production context. | mantle.request.Request | RequestDetail, [crosscut §3.11](design-crosscut.md#311-requestdetail) | app | new | mantle.request.Request |
| WorkItemDetail | `Manufacturing/Quality/WorkItemDetail` | detail | xml | Open the canonical WorkItemDetail in production context. | mantle.work.effort.WorkEffort | WorkItemDetail, [crosscut §3.12](design-crosscut.md#312-workitemdetail) | app | new | mantle.work.effort.WorkEffort |
| SupplyPlanning | `Manufacturing/Planning/SupplyPlanning` | split | xml | Open the canonical SupplyPlanning in production context. | PlanningRun / PlanningSuggestion / RequirementSupply (proposed) | SupplyPlanning, [crosscut §3.20](design-crosscut.md#320-supplyplanning) | app | new | PlanningRun / PlanningSuggestion / RequirementSupply (proposed) |
| InventoryAvailability | `Manufacturing/Planning/InventoryAvailability` | list | xml | Open the canonical InventoryAvailability in production context. | Asset / reservations / projected inventory | InventoryAvailability, [crosscut §3.7](design-crosscut.md#37-inventoryavailability) | app | parity | Asset / reservations / projected inventory |
| ProductionSchedule | `Manufacturing/Planning/ProductionSchedule` | calendar | qvue | Schedule operation slots against resources and calendars. | WorkEffort operations + WorkCenter capacity (proposed) | own | scheduler | new | WorkEffort operations + WorkCenter capacity (proposed) |
| Capacity | `Manufacturing/Planning/Capacity` | report | xml | Explain capacity and scheduling overloads. | proposed WorkCenter load projection | own | app | new | proposed WorkCenter load projection |
| DemandForecasts | `Manufacturing/Planning/DemandForecasts` | editor | xml | Version forecast demand before using it in a shared plan. | proposed ProductionForecast | own | planner | later | proposed ProductionForecast |
| MasterSchedule | `Manufacturing/Planning/MasterSchedule` | editor | xml | Approve target production by item and period. | proposed ProductionMasterSchedule | own | planner | later | proposed ProductionMasterSchedule |
| FiniteSchedule | `Manufacturing/Planning/FiniteSchedule` | wizard | xml | Review an optimization proposal before changing scheduled work. | proposed ProductionScheduleProposal | own | scheduler | later | proposed ProductionScheduleProposal |
| SubcontractOperations | `Manufacturing/Subcontracting` | list | xml | Track outside processing and supplied components. | WorkEffort operation + OrderItemWorkEffort | own | planner; buyer for procurement actions | new | WorkEffort operation + OrderItemWorkEffort |
| SubcontractDetail | `Manufacturing/Subcontracting/SubcontractDetail` | detail | xml | Coordinate materials, purchased work and accepted output. | WorkEffort + proposed ProductionSubcontract | own | planner; buyer/finance scoped actions | new | WorkEffort + proposed ProductionSubcontract |
| Supplier360 | `Manufacturing/Subcontracting/Supplier360` | 360 | xml | Open the canonical Supplier360 in production context. | mantle.party.Party | Supplier360, [crosscut §3.3](design-crosscut.md#33-supplier360) | app | new | mantle.party.Party |
| OrderDetail | `Manufacturing/Subcontracting/OrderDetail` | detail | xml | Open the canonical OrderDetail in production context. | mantle.order.OrderHeader | OrderDetail, [crosscut §3.6](design-crosscut.md#36-orderdetail) | app | parity | mantle.order.OrderHeader |
| ShipmentDetail | `Manufacturing/Subcontracting/ShipmentDetail` | detail | xml | Open the canonical ShipmentDetail in production context. | mantle.shipment.Shipment | ShipmentDetail, [crosscut §3.8](design-crosscut.md#38-shipmentdetail) | app | parity | mantle.shipment.Shipment |
| CustomerMaterialJobs | `Manufacturing/Subcontracting/CustomerMaterialJobs` | list | xml | Manage inward processing of customer-owned material. | WorkEffort + proposed ProductionSubcontract | own | planner | later | WorkEffort + proposed ProductionSubcontract |
| Batches | `Manufacturing/Batches` | list | xml | Group compatible operations for shared setup. | mantle.work.production.ProductionBatch (proposed) | own | planner/supervisor | later | mantle.work.production.ProductionBatch (proposed) |
| BatchDetail | `Manufacturing/Batches/BatchDetail` | detail | xml | Release, execute and dissolve a setup-sharing group. | mantle.work.production.ProductionBatch (proposed) | own | planner/supervisor | later | mantle.work.production.ProductionBatch (proposed) |
| Disassembly | `Manufacturing/WorkOrders/Disassembly` | task | xml | Reverse supported pick assemblies and design general disassembly separately. | WorkEffort + Asset genealogy | own | supervisor; finance for cost correction | parity | WorkEffort + Asset genealogy |
| ProductionSettings | `Manufacturing/Settings` | settings | xml | Set controlled organization and plant production defaults. | proposed ProductionPolicy | own | production administrator | new | proposed ProductionPolicy |
| ReasonCodes | `Manufacturing/Settings/ReasonCodes` | settings | xml | Maintain meaningful loss, downtime and amendment reasons. | proposed production reason enums/policy | own | production administrator | new | proposed production reason enums/policy |
| Approvals | `Manufacturing/Approvals` | list | xml | Open the canonical Approvals in production context. | approval context | Approvals, [crosscut §3.15](design-crosscut.md#315-approvals-waiting) | app | new | approval context |
| Reports | `Manufacturing/Reports` | landing | xml | Open production reports with consistent filters. | production reporting context | own | app | new | production reporting context |
| WorkOrderStatusReport | `Manufacturing/Reports/WorkOrderStatusReport` | report | xml | Open, late and completed production. | proposed get#ProductionStatusReport | own | app | new | proposed get#ProductionStatusReport |
| MaterialReport | `Manufacturing/Reports/MaterialReport` | report | xml | Requirements, issues, unused returns and output genealogy. | proposed get#ProductionMaterialReport | own | app | new | proposed get#ProductionMaterialReport |
| OperationPerformanceReport | `Manufacturing/Reports/OperationPerformanceReport` | report | xml | Operation time, capacity, OEE and downtime. | proposed get#OperationPerformanceReport | own | app | new | proposed get#OperationPerformanceReport |
| LossReport | `Manufacturing/Reports/LossReport` | report | xml | Scrap, process loss and rework by cause. | proposed get#ProductionLossReport | own | app | new | proposed get#ProductionLossReport |
| QualityReport | `Manufacturing/Reports/QualityReport` | report | xml | Inspection results, trends and quality holds. | proposed get#ProductionQualityReport | own | app | new | proposed get#ProductionQualityReport |
| ProductionCostReport | `Manufacturing/Reports/ProductionCostReport` | report | xml | Expected versus actual and WIP reconciliation. | proposed get#ProductionCostReport | own | cost/finance for value columns | new | proposed get#ProductionCostReport |
| BomVarianceReport | `Manufacturing/Reports/BomVarianceReport` | report | xml | Released method versus actual consumption and output. | proposed get#BomVarianceReport | own | cost/finance for value columns | new | proposed get#BomVarianceReport |
| PlanningReport | `Manufacturing/Reports/PlanningReport` | report | xml | Demand coverage and planning exception explanations. | proposed get#ProductionPlanningReport | own | app | new | proposed get#ProductionPlanningReport |

## 3. Work orders

### Home

**Layout.** landing; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Summary | display | Open, WIP, late, short and completed this month | organization, plant, date range, counts, freshness | linked counters | `mantle.work.ProductionServices.get#ProductionDashboard` (proposed) | ERPNext Manufacturing workspace; research §1 |
| Queue | list | Due work and shortages | work order, product, due, work center, status, shortage | saved find links | `mantle.work.ProductionServices.find#ProductionOrders` (proposed) | FindRun.xml RunList; ERPNext workspace |

**Actions.** New work order opens NewWorkOrder; shortages open Components or SupplyPlanning with the same organization, plant and as-of date. Counts include only authorized records; missing projection is “Unavailable” with source age, never zero shortage.

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

**Views.** List is parity. New board groups by status or center; calendar places planned start/end. Until common XML board exists, list grouping is the usable first release path; movement calls the same permissioned transition, never a generic status update. Saved Ready, Late, Blocked, Mine and By product share find parameters. Bulk action confirms release or cancellation and returns each run ID plus success, blocked or failed reason; one failure does not hide others.

**Source.** research §1, §4; [FindRun](../../mr-marble/screen/SimpleScreens/Manufacturing/Run/FindRun.xml); Odoo `odoo/addons/mrp/views/mrp_production_views.xml`.

**Needs.** M1, M2, M10.

### NewWorkOrder

**Layout.** wizard; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Identity | wizard step | Choose product, site and demand | organization, product, quantity, UOM, plant, due, requirement/source order | product lookup; conversion explanation | none | FindRun.xml NewRunForm |
| Method | wizard step | Choose simple or routed production | BOM/version, routing/version, source warehouse, output location, optional assignments | version selectors; warnings | `mantle.product.BomServices.get#BomExplosion` (proposed) | Odoo MO BOM selection; ERPNext Work Order |
| Review | wizard step | Confirm demand and draft only | converted quantity, component shortages, method revision, supply links | read-only reconciliation | `mantle.work.ProductionServices.create#ProductionOrder` (proposed); internally `mantle.work.ManufacturingServices.create#ProductionRun` | FindRun.xml NewRunForm |

**Actions.** Create produces `WepProductionRun`, `WetEvent`, `WeInPlanning`; the new coordinator scopes organization/facility and registers demand provenance. Simple runs have no synthetic operation. SupplyPlanning invokes this same create contract; conversion does not release. A missing BOM allows explicit manual material lines under production-editor authority. Duplicate request identity returns the existing draft.

**States.** Invalid variants, expired versions, cyclic BOM or missing conversion prevent Create. A shortage permits draft creation with a blocking release finding unless policy authorizes staged release.

**Source.** research §4; [create#ProductionRun](../../mr-mantle/service/mantle/work/ManufacturingServices.xml); ERPNext `erpnext/manufacturing/doctype/work_order/work_order.json`.

**Needs.** M1, M2, M3, M4, M10.

### WorkOrderDetail

**Layout.** detail; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Header | display | Show committed identity and lifecycle | workEffortId, product, revision, status, planned/good/remaining, quality gate | status bar | `mantle.work.ManufacturingServices.get#ProductionRunDisplayInfo`; `mantle.work.ProductionServices.get#ProductionOrder` (proposed) | EditRun.xml UpdateRun |
| Lifecycle | dialog | Release, start, hold, complete, close or cancel | workEffortId, expectedRevision, action, reason, operationKey, effectiveDate | impact preview | `mantle.work.ProductionServices.transition#ProductionOrder` (proposed); `mantle.work.ProductionServices.release#ProductionOrder` (proposed) | Odoo MO confirmation/completion; Dolibarr cancellation |

**Sections and tabs.** Overview, Components, Materials, Operations (routed only), Quantities, Time, By-products, Quality, Costs and Notes/files are the routes below. Header links Product360, source OrderDetail, FacilityDetail and financial evidence; finance links disappear without financial read authority.

**Actions.** Release freezes the complete method and cost estimate references. Start requires release and applicable safety/quality/material checks. Hold records a reason without silently pausing the person timer. Complete requires a good/remaining/loss reconciliation, required verified inspections, settled operations and material disposition; Close additionally requires cost review and financial handoff acceptance. Cancellation of an unposted draft is simple; any posted stock/time/cost creates a reviewed reversal or residual-close plan, never deletion. Clone creates a new draft through create#ProductionOrder; it never clones postings or live timers.

**States.** Run labels map to existing `WeInPlanning` Draft, `WeApproved` Released, `WeInProgress` Running, `WeOnHold` Paused, `WeComplete` Completed, `WeClosed` Closed, `WeCancelled` Cancelled. New transition guards must respect the existing status-flow graph and provide explicit reopen/correction services where a generic transition is absent. App access alone grants no transition.

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
| Substitute | dialog | Request a traceable alternate | original line, alternative product, converted quantity, factor, reason, approver | side-by-side specification/availability | `mantle.work.ProductionServices.substitute#ProductionMaterial` (proposed) | Odoo component substitution; ERPNext alternate item |

**Actions.** Issue and Return open MaterialIssueReceipt against the selected stable snapshot line. Required includes approved scrap allowance; actual scrap is separate and never silently offsets an issue. Substitute requires an allowed alternative, compatible UOM/specification, revision check and supervisor approval; after release it creates an amendment with original requirement and actual item, preserving genealogy/cost differences. A rejected or quarantine lot cannot be chosen. Postponed material or a pick shortfall creates an exception/planning handoff, not untracked negative stock.

**Source.** research §2, §4, §5; [RunProducts](../../mr-marble/screen/SimpleScreens/Manufacturing/Run/RunProducts.xml); [ManufacturingServices](../../mr-mantle/service/mantle/work/ManufacturingServices.xml).

**Needs.** M1, M2, M4, M10.

### MaterialIssueReceipt

**Context passed.** Mount at `Manufacturing/WorkOrders/WorkOrderDetail/Materials`, and open from ShopFloor/OperationExecution with `appRoot=Manufacturing`, organization, run, operation, immutable material/output line ID, snapshot revision, action mode, source/destination facility and permitted lot/serial policy. Show required, issued, unused returned, good received and loss separately. Modes issue, unused-material return, finished receipt and reversal share the canonical stock transaction, operation identity, authorization and Accounting handoff. Compact operator presentation changes no service semantics. Baselines: RunProducts IssueAssetForm/ReceiveAssetForm; RunConsumed IssueAssetForm/ConsumeAssetForm/IssuedAssetForm; RunProduced ReceiveAssetForm/ReceivedAssetForm; ConsumeAsset/ConsumeProduct ConsumeAssetForm; ProduceAsset ReceiveAssetForm. The service direct-use coverage belongs to the canonical definition; no production-only stock service is invented here.

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

**Actions.** Physical output awaiting inspection is shown as produced-held, outside accepted good and available stock. Good output becomes accepted stock only after required disposition; quantity reporting and stock receipt share one posting orchestration when coupled, with the operation identity preventing duplication. A rework quantity references a distinct rework order/operation and cannot count twice as good output. Scrap of an actual asset references its lot and disposition transaction; process loss has no fictional asset receipt. Partial completion leaves the run open and offers explicit Backorder or Finish remainder with approved loss. Overproduction above policy needs supervisor approval.

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

**Actions.** Confirm is supervisor/planner only and atomic for one source run plus descendants. Preserve original receipts, times and WIP on their run; only explicitly unconsumed allocation moves. Backorder creates residual demand with the same immutable method revision unless a separately approved change is requested. RequirementSupply allocated quantity sums remain conserved; retry returns the existing split IDs. A batch of several source runs yields independent named results.

**Source.** research §4; Odoo `odoo/addons/mrp/wizard/mrp_production_split.py` and `mrp_production_backorder.py`.

**Needs.** M1, M2, M4, M10.

### ProductionTime

**Context passed.** Mount the existing Projects time-entry/timesheet surface filtered to the run and authorized operation children; pass organization, employee, workEffortId and cost visibility separately. Start/stop use current TimesheetServices.get#Timer/start#Timer/stop#Timer; one person has one timer suite-wide. A clock-in with another active timer offers explicit switch with stop/start confirmation. Approved/locked time is immutable until the existing timesheet return/reopen flow. Machine runtime is a separate production event, never a second employee timer. Add production work-type and run/operation context to existing records; no duplicate production timesheet.

### ByProducts

**Layout.** detail; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ByProducts | list, editable rows | Maintain draft coproduct plans and inspect actuals | product, quantity/UOM, operation, valuation allocation, received, loss | sum-of-allocation check | `mantle.work.ProductionServices.store#ProductionOutput` (proposed); `mantle.work.ProductionServices.get#ProductionQuantities` (proposed) | Odoo mrp_bom byproduct lines |
| AllocationReview | display | Explain expected cost distribution | estimate revision, allocation method, percentages/amounts, residual | restricted currency fields | `mantle.work.ProductionServices.get#ProductionCosts` (proposed) | Carbon job estimates versus actuals |

**Actions.** Receive opens MaterialIssueReceipt with output line and lot/serial requirements. Material byproducts are good secondary stock, while scrap is explicitly disposed; do not convert one into the other solely to force cost balance. Released allocation changes require Accounting policy approval and a new cost event, never retroactive edits of receipts.

**Source.** research §2, §4, §9; Odoo `odoo/addons/mrp/views/mrp_bom_views.xml`.

**Needs.** M1, M2, M3, M4, M8.

### QualityGates

**Layout.** list; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Gates | list | Show in-process/final gates per snapshot | operation, template/version, sample, lifecycle, result, hold, disposition | status text; canonical record links | entity query through proposed quality read contract | ERPNext Work Order/Job Card inspections; Carbon MES inspections |

**Actions.** Create/Open inspection uses QualityInspection; change to a released template never changes an existing gate. Failed inspection holds affected material/output and downstream operations; reinspection or approved rework keeps the failed result in history. A supervisor cannot use Complete to bypass a required verifier or disposition permission.

**Source.** research §8; ERPNext `erpnext/manufacturing/doctype/job_card/job_card.json`; Carbon `apps/mes/app/components/JobOperation/JobOperation.tsx`.

**Needs.** M1, M4, M6.

### ProductionCosts

**Layout.** report; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Costs | list | Reconcile cost components and linked source postings | material, labor, machine, overhead, outside processing, scrap, WIP, output allocation | currency; source document drill-down | `mantle.work.ProductionServices.get#ProductionCosts` (proposed) | Carbon JobEstimatesVsActuals.tsx |
| CloseReview | dialog | Resolve pending cost and accounting exceptions | run, cost snapshot, unposted entries, variance reasons, accounting date, revision | closed-period warning | `mantle.work.ProductionServices.review#ProductionCosts` (proposed) | ERPNext Work Order Stock Entries; Carbon estimates/actuals |

**Actions.** Cost estimator sees frozen standard estimates; finance-role users see actual value and GL links. Manufacturing review#ProductionCosts requests/reviews cost close only; [Accounting ProductionCostClose](design-accounting.md#productioncostclose) owns `ironstone.accounting.ProductionCostServices.preview#CostClose` and `post#CostClose` (proposed), actual valuation corrections and period policy. A late invoice or timesheet cost creates a linked variance/adjustment requiring an open accounting date. The design does not rewrite a closed-period issue or inflate finished stock to hide variance.

**Source.** research §9; Carbon `apps/erp/app/modules/production/ui/Jobs/JobEstimatesVsActuals.tsx`; [AssetAutoPostServices](../../mr-mantle/service/mantle/ledger/AssetAutoPostServices.xml).

**Needs.** M1, M4, M8.

### ProductionCostClose

**Context passed.** From ProductionCosts, fix workEffortId, organization and source revision
on the [Accounting-owned shared task](design-accounting.md#productioncostclose). Operational
users request review; financial readers and GL/finance approvers receive their permitted
cost evidence and preview/approve/post actions. The mount checks those capabilities without
requiring the Accounting launcher grant. All allocations, WIP and variance postings use the
single canonical service and period/retry rules; no Manufacturing cost-post endpoint is added.

### Chatter

**Context passed.** Mount canonical Chatter for the run/operation, preserving WorkEffortNote from EditRun NewNoteForm/UpdateNoteForm and the implemented request/work-item links. Show internal notes and explicit outward publication controls; no production note becomes supplier/customer-visible by app context. Timeline includes release/amendment, stock, quality and financial handoffs with access-filtered links.

### RecordFiles

**Context passed.** Mount Commons RecordFiles for run, operation, product/method snapshot and production instruction version; mutable shared files and the immutable instruction used for release are labeled distinctly. Operator access permits approved instructions and attach-evidence, not arbitrary confidential drawings or cost documents. Retain file authorization on each download.

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

**Devices.** Handheld supports keyboard-wedge/barcode scan, 48 px touch targets, 18 px input text, visible focused scan field, sound plus text acknowledgment and no mandatory side drawer. Scanning identifies a job/lot; it never silently posts stock. Online-first: after a timeout, resolve operationKey status before offering Retry; offline reads are timestamped, posting is disabled, and unsent entry remains local to the user session. Kiosk identity is an authenticated person, with lock/sign-out and no shared supervisor credential.

**Source.** research §5; ERPNext `erpnext/manufacturing/page/shop_floor/shop_floor.py`; Carbon `apps/mes/app/components/JobOperation/JobOperation.tsx`.

**Needs.** M1, M2, M4, M7.

### OperationExecution

**Layout.** task; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Work | display | Present approved work and blocking checks | run/operation, product, center, snapshot, planned/good/remaining, readiness | step list; elapsed timer | `mantle.work.ProductionServices.get#ProductionOperation` (proposed); `mantle.work.TimesheetServices.get#Timer` | ERPNext Job Card; Carbon MES JobOperation |
| PersonTimer | single | Start, stop or switch the existing person timer | workEffortId, work type, timestamp, current timer, reason | m-elapsed; explicit switch confirmation | `mantle.work.TimesheetServices.start#Timer`; `mantle.work.TimesheetServices.stop#Timer`; `mantle.work.TimesheetServices.update#Timer` | current Projects MyTime/TimeEntries |
| MachineRuntime | dialog | Record machine run separately from labor | operation, asset/center, from, thru, duration, mode, reason, operationKey | date-time; elapsed display | `mantle.work.ProductionServices.record#MachineRuntime` (proposed) | Carbon MES machine operation events |
| CompleteStep | dialog | Reconcile quantity and required evidence | good, pending, processLoss, scrap, rework, inspection IDs, reason, operationKey | quantity+unit; issue/receipt links | `mantle.work.ProductionServices.complete#ProductionOperation` (proposed) | ERPNext Job Card completion; Carbon MES quantity transaction |

**Actions.** Start checks dependencies, operator authorization/skills, active equipment restrictions and the configured material/inspection gate. Pause records reason and offers an explicit timer stop; it may open Downtime. Finish stops only the confirmed person timer and atomically commits the operation event and any coupled material/output posting; independent machine events may remain running only by explicit policy. Materials, instructions and inspections use the canonical mounts. A failed stock/GL transaction leaves no successful completion event.

**Devices.** XML task screen has one primary action, large touch controls and scan input at phone width; terminal form renders every field/action in ordered steps. Operator can complete a simple run with no routed operations through the same task mode. Errors name the blocked predecessor, material line or inspection and preserve entered values.

**Source.** research §5; ERPNext `erpnext/manufacturing/doctype/job_card/job_card.json`; Carbon `apps/mes/app/components/JobOperation/JobOperation.tsx`; [TimesheetServices](../../mr-mantle/service/mantle/work/TimesheetServices.xml).

**Needs.** M1, M2, M4, M6, M7.

### Instructions

**Layout.** task; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Steps | display | Show ordered instructions and required evidence | version, operation, step, text/image/file, hazards, required acknowledgment | approved file viewer; step navigation | `mantle.work.ProductionServices.get#ProductionInstructions` (proposed) | Carbon MES operation steps; ERPNext operation description |
| Evidence | single | Record step acknowledgment or measured input | operation, instructionVersionId, stepId, actor, value/unit, file reference, operationKey | file attachment; checkbox/signature acknowledgment | `mantle.work.ProductionServices.record#InstructionStep` (proposed) | Carbon MES operation steps |

**Actions.** Next verifies required prior inputs; attachment upload uses Commons storage and permissions. Quality characteristics link to the canonical inspection instead of creating competing measurements. A changed master instruction offers a revision warning; an active run continues its released version until approved amendment. Terminal displays ordered text plus authorized file URLs/filenames and accepts the same acknowledgment and values. Handheld supports one step at a time with visible run/operation identity.

**Source.** research §2, §5; Carbon `apps/mes/app/components/JobOperation/JobOperation.tsx`.

**Needs.** M1, M4, M7.

### AssemblyViewer

**Layout.** task; custom regions and terminal behavior described below.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Assembly | component | Show selected parts and step visibility | model/file version, step, part, annotation, viewpoint | 3D canvas; m-* step controls | `mantle.work.ProductionServices.get#ProductionInstructions` (proposed) | Carbon MES model/assembly instruction viewer |
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

### Boms

**Layout.** list; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Find | find | Select effective product structures | product, variant, organization, type, status, effective date, revision | product lookup | none | Catalog Product EditAssocs; Odoo BOM list |
| Boms | list | Show published and draft methods | BOM ID, product, base quantity/UOM, version, status, routing, effective window | version badge | `mantle.product.BomServices.find#Boms` (proposed) | Odoo mrp_bom list; ERPNext BOM list |
| NewBom | dialog | Create a draft product method | productId, organization, base quantity/UOM, BOM type, name | product lookup | `mantle.product.BomServices.store#Bom` (proposed) | Odoo mrp_bom form |

**Actions.** Open, clone revision, import legacy associations and where-used. Existing `PatMfgBom` lines are shown as legacy/current-model input with explicit validation before first release; a list does not imply revision control already exists. Product360 BOM tab mounts BomDetail and related editors from this file. Products retains product identity and permissions.

**Source.** research §2; [ProductAssoc](../../mr-mantle/entity/ProductDefinitionEntities.xml); Odoo `odoo/addons/mrp/views/mrp_bom_views.xml`.

**Needs.** M1, M3.

### BomDetail

**Physical definition and mounts.** Proposed `screen/Shared/BomDetail.xml` is owned by this design and mounted at `Manufacturing/Boms/BomDetail` and Product360's BOM tab with product/organization/version fixed. Supporting `Shared/BomExplosion.xml`, `Shared/BomCompare.xml` and `Shared/WhereUsed.xml` are also defined here; app routes in the registry are their Manufacturing mounts. Opening these from Products requires method/record capability, not the Manufacturing app-root grant.

**Layout.** detail; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Version | single | Maintain editable revision header | BOM/version, product, base quantity/UOM, status, effectivity, phantom, routingVersionId | status bar; version lookup | `mantle.product.BomServices.store#BomVersion` (proposed) | Odoo BOM form; ERPNext BOM |
| Components | list, editable rows | Define consumption with stable line identity | itemId, product/variant, quantity/UOM, scrapFactor, consuming operation, instruction, alternative rule | product lookup; unit conversion | `mantle.product.BomServices.store#BomItem` (proposed) | Catalog/Product/EditAssocs AddAssocToForm/AssocToListForm; Odoo BOM lines |
| Outputs | list, editable rows | Define byproducts and expected allocation | itemId, role, product, quantity/UOM, operation, cost allocation | allocation totals | `mantle.product.BomServices.store#BomItem` (proposed) | Odoo BOM byproducts |
| ValidateRelease | dialog | Validate and publish one immutable version | versionId, expectedRevision, effective window, reason, validation findings | dependency/loop and overlap findings | `mantle.product.BomServices.validate#BomVersion` (proposed); `mantle.product.BomServices.release#BomVersion` (proposed) | Carbon make-method version status; Odoo BOM checks |

**Sections and tabs.** Header, Components, Operations (RoutingDetail mount with a fixed routing version), By-products, Instructions, Cost estimate, Where used and Revision history. Copy operations from another method creates draft copies with source identity; it never modifies the source or active runs.

**Actions.** Publish requires an acyclic explosion, valid item/unit conversions, nonoverlapping effectivity for the chosen organization/product/variant/method key, valid consuming operations and an allocation policy. Released versions are immutable; correction creates a new revision. A newly released BOM warns affected open runs but never silently replaces their snapshot. Existing Product360 generic association editors must route manufacturing lines here and cannot bypass release guards. Phantom BOM is an explicit version property; it expands materials at release without artificial stock receipt. `PtPickAssembly` remains a separate pick-kit behavior.

**Navigation.** Cost estimate opens Products CostRollup for this exact version; prices use the shared resolver and supplier price scope. No BOM edit revalues current stock.

**Source.** research §2; [ProductAssoc](../../mr-mantle/entity/ProductDefinitionEntities.xml); Odoo `odoo/addons/mrp/views/mrp_bom_views.xml`; ERPNext `erpnext/manufacturing/doctype/bom/bom.json`.

**Needs.** M1, M3, M4, M8.

### BomExplosion

**Layout.** report; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Parameters | single | Select the exact expansion context | versionId, target quantity/UOM, asOfDate, organization, plant, variant, include costs | date; quantity with unit | `mantle.product.BomServices.get#BomExplosion` (proposed); legacy comparison `mantle.work.ManufacturingServices.get#ProductBomDetail` | ERPNext exploded BOM; Dolibarr net needs |
| Explosion | list | Show provenance for every expanded requirement | path, depth, product, gross/net, scrap allowance, unit conversion, chosen version, cost basis | indented rows; parent paths | `mantle.product.BomServices.get#BomExplosion` (proposed) | ERPNext BOM exploded items; Odoo structure report |

**Actions.** Export and open component Product360 or SupplyPlanning; explosion is explanatory and creates no supply. Circular path, missing version/conversion or excessive recursion returns named branch findings and marks the whole total incomplete; invalid branches cannot be released or converted. Independent roots in a report may continue, each explicitly successful/failed. Legacy get#ProductBomDetail is single-level and ignores effective dates/scrap; it is shown only for migration comparison, not used as the new recursive calculator.

**Source.** research §2, §6; [ManufacturingServices](../../mr-mantle/service/mantle/work/ManufacturingServices.xml); ERPNext `erpnext/manufacturing/doctype/bom/bom.json`; Dolibarr `htdocs/bom/bom_net_needs.php`.

**Needs.** M1, M3, M8, M10.

### BomCompare

**Layout.** report; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Compare | single | Choose two explicit revisions | leftVersionId, rightVersionId, quantity/UOM, include costs | version lookups | `mantle.product.BomServices.compare#BomVersions` (proposed) | ERPNext BOM comparison tool; Carbon versioned make method |
| Changes | list | Explain adds/removes and semantic changes | item/operation identity, changed field, before, after, impacted runs | change labels; row drill-down | `mantle.product.BomServices.compare#BomVersions` (proposed) | ERPNext BOM comparison |

**Actions.** Create draft revision, export change list or request a released-run amendment. Differences use stable line/operation identifiers; deleted-and-readded lines retain provenance. Impact list excludes confidential runs rather than exposing their quantities.

**Source.** research §2; ERPNext `erpnext/manufacturing/doctype/bom/bom.json`.

**Needs.** M1, M3, M4.

### WhereUsed

**Layout.** report; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Find | find | Select component and effectivity | productId, variant, asOfDate, organization, include archived | product lookup | none | Catalog/Product/EditAssocs AssocFromListForm |
| Parents | list | Show direct and transitive usage paths | parent product, BOM/version, item path, quantity/UOM, effective dates, released-run count | indented paths | `mantle.product.BomServices.get#BomWhereUsed` (proposed) | EditAssocs.xml AssocFromListForm; Odoo BOM structure |

**Actions.** Open parent method, affected runs or change review. Historical query reads the released version and snapshot; deleting a current catalog association cannot remove past usage evidence.

**Source.** research §2; [EditAssocs](../../mr-marble/screen/SimpleScreens/Catalog/Product/EditAssocs.xml).

**Needs.** M1, M3, M4.

### Routings

**Layout.** list; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Find | find | Filter routing templates | name, product, center, status, effective date | authorized lookup | none | ERPNext Routing |
| Routings | list | Open templates and revision history | routing ID, version, status, operations, effectivity | version link | `mantle.work.RoutingServices.find#Routings` (proposed) | ERPNext routing/routing.json |
| NewRouting | dialog | Create a draft routing | name, organization, description, effectiveFrom | text; date | `mantle.work.RoutingServices.store#RoutingVersion` (proposed) | ERPNext Routing |

**Source.** research §3; [WorkEffort model](../../mr-mantle/entity/WorkEffortEntities.xml); ERPNext `erpnext/manufacturing/doctype/routing/routing.json`.

**Needs.** M1, M3, M5.

### RoutingDetail

**Physical definition and mounts.** Proposed `screen/Shared/RoutingDetail.xml` is owned here and mounted at `Manufacturing/Routings/RoutingDetail`, BomDetail Operations and Product360 BOM/routing context. The same version-aware forms and services serve every mount; no parallel Products routing editor is introduced.

**Layout.** detail; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Header | single | Maintain routing version metadata | routingId, revision, status, organization, effective dates | version status | `mantle.work.RoutingServices.store#RoutingVersion` (proposed) | ERPNext Routing; Odoo operation form |
| Operations | list, editable rows | Maintain ordered operation templates | operation template, sequence, predecessors, center/alternate, setup/run time, batch quantity, skill | duration+unit; predecessor lookup | `mantle.work.RoutingServices.store#RoutingOperation` (proposed) | Odoo mrp_workorder/routing; ERPNext routing operations |
| Resources | list, editable rows | Declare equipment, skill and outside-process needs | operationId, asset/type, skill, quantity, supplier, service product, lead time | authorized resource lookup | `mantle.work.RoutingServices.store#RoutingResource` (proposed) | WorkEffortAssetNeeded/SkillStandard; Carbon Bill of Process |
| Release | dialog | Publish an immutable routing version | routingVersionId, expectedRevision, reason, validation findings | dependency validation | `mantle.work.RoutingServices.release#RoutingVersion` (proposed) | Carbon make-method version release |

**Actions.** Copy operations from another version with explicit duplicate/replace choices; validate cycles and consuming-material references before publish. Existing routing model remains WorkEffort `WepRouting`, operation templates `WepRoutingTask`, `WeatRoutingComp` sequence and `WeptRouting` product link. Proposed RoutingVersion and version membership make those templates immutable per release; executable children use `parentWorkEffortId` and `WeatDependsOn`. Cost/hour is effective-dated work-center policy, separate from person time rates. Equipment needed and skill standards use current entities, with actual assignments on the run.

**Source.** research §3; [WorkEffortEntities](../../mr-mantle/entity/WorkEffortEntities.xml); ERPNext `erpnext/manufacturing/doctype/routing/routing.json`; Odoo `odoo/addons/mrp/views/mrp_workorder_views.xml`.

**Needs.** M1, M3, M4, M5.

### OperationTemplates

**Layout.** list; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Templates | list | Find process definitions | name, center type, skill, default time, instruction version, inspection template | saved filters | entity read; `mantle.work.RoutingServices.find#OperationTemplates` (proposed) | ERPNext Operation; Odoo operations |
| EditTemplate | dialog | Maintain one operation definition | name, setup/run standards, time UOM, base quantity/UOM, center requirement, description, quality template | duration; template lookup | `mantle.work.RoutingServices.store#OperationTemplate` (proposed) | ERPNext operation/operation.json |
| InstructionVersion | dialog | Publish controlled step content | templateId, version, sequence, text/contentRef, required evidence, effective dates | Commons file/markdown capabilities | `mantle.work.RoutingServices.store#InstructionVersion` (proposed) | Carbon operation steps |

**Actions.** Archive blocks new use while preserving released methods. Copy never updates consuming released versions. Versioned instructions store immutable content reference/checksum and quality-template version; Commons owns authoring/file machinery and access. An instruction variant with no rendered graphical asset still has usable text.

**Source.** research §3, §5; ERPNext `erpnext/manufacturing/doctype/operation/operation.json`.

**Needs.** M1, M3, M4.

### Product360

**Context passed.** Show Overview, Identifiers/units, BOM & routing, Availability, Documents and cost estimates when authorized. Fix manufacturing-capable products by lookup default, not an access grant; pass productId/variantId, organization, plant and as-of date. BOM tab mounts this file’s BomDetail/RoutingDetail/BomExplosion/WhereUsed with exact version IDs. Actions draft method, compare, roll up estimate and new work order require their own grants. Catalog master, price resolver and standard-cost estimate remain Products-owned; generic association edit cannot alter released methods.

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

**Context passed.** Pass `appRoot=Manufacturing`, facilityId, organization, plant and production role. Show identity, WorkCenter extension, production calendar, equipment, capacities by product/UOM, efficiency, effective cost/hour, alternatives, offline intervals, load, downtime and maintenance links. Identity/locations use shared facility actions; production attributes require resource-administrator grant; cost fields require cost grant. Calendar and approvals retain Commons ownership. Offline changes warn or reschedule affected operations with an explicit preview; they do not mutate posted labor or machine events.

### Equipment

**Layout.** list; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Find | find | Narrow equipment within authorized sites | plant, facility, asset type, status, serial, qualification | asset scan/search | none | EditRun.xml EquipmentList; Odoo work-center equipment |
| Equipment | list | Show assigned machines and maintenance state | assetId, serial, center, assigned operation, availability, next service | shared record links | entity query over Asset/WorkEffortAssetAssign | EditRun.xml AddEquipment/EquipmentList |

**Actions.** Open EquipmentDetail; report downtime or create a linked maintenance Request through the shared intake. This app does not recreate Maintenance work-order screens.

**Source.** research §3, §5; [EditRun](../../mr-marble/screen/SimpleScreens/Manufacturing/Run/EditRun.xml).

**Needs.** M1, M5.

### EquipmentDetail

**Context passed.** Pass equipment assetId, facility/plant, assigned operation and read/write capabilities. Show production assignments, qualifications, downtime, maintenance history and documents; allow authorized assignment and request-maintenance. Acquisition/depreciation and valuation remain Accounting actions. A read-only operator sees safe-use instructions and blocked state without procurement or asset book value.

### ResourceCalendar

**Context passed.** Use the implemented Commons calendar with plant/work-center resources, work-hour/holiday sources, operation dates and offline bookings. ProductionSchedule performs finite-slot feasibility checks and commits through the production scheduler; this mount does not turn a generic calendar edit into release or capacity authority. Pin authorized resources and preserve timezone, start/end and recurrence semantics; exact operating capacity belongs to WorkCenter.

### Inspections

**Layout.** list; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Find | find | Select quality work | plant, run, operation, product, lot, due, lifecycle, result | date period; authorized lookups | none | ERPNext Quality Inspection; Carbon quality worklist |
| Inspections | list | Show inspection identity and operational hold | inspectionId, template/version, sample quantity, due, verifier, result, disposition | shared record links | entity query under canonical quality authorization | ERPNext Quality Inspection list |

**Actions.** Create/Open uses QualityInspection. Queue assignments do not grant verifier authority. The inspection lifecycle and acceptance result are distinct; a verified failure can still await approved scrap/rework/return disposition. A template version update never alters a signed historical reading.

**Source.** research §8; ERPNext `erpnext/stock/doctype/quality_inspection/quality_inspection.json`.

**Needs.** M1, M6.

### QualityInspection

**Context passed.** Pass run/operation, product, asset lot/serial, released template version, sample plan, source/output quantity and production gate. Show readings, required evidence, result, verifier and disposition; operator mode has sequential large controls and scanner fields. Create/read/submit may be operator actions; verify and dispose require separate grants. A failed final inspection keeps finished stock unavailable; in-process failure blocks dependent operations. Same lifecycle/records/templates as receiving and returns, including reinspection linkage and atomic disposition; no separate Manufacturing result schema.

### InspectionTemplates

**Context passed.** Pass manufacturing template context and authorized organization. Add in-process/final applicability, sampling basis and method/operation attachment; use the canonical template fields, reading types, units and versioning. Editing requires quality-administrator authority; publishing does not replace templates already pinned to a released run.

### ScrapLoss

**Layout.** list; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Find | find | Filter production losses | run, operation, center, product, reason, date, disposition | date period; product lookup | none | Odoo stock.scrap; ERPNext process loss |
| Losses | list | Show losses and their source/correction chain | lossId, product/lot, quantity/UOM, type, reason, cost effect, status | source evidence links | `mantle.work.ProductionServices.find#ProductionLosses` (proposed) | Odoo scrap list; Carbon quantity transactions |
| RecordLoss | dialog | Propose one explicit loss or rework disposition | run/operation, material/output line, product, asset/lot, quantity/UOM, loss type, reason, disposition, operationKey | scan; quantity+unit | `mantle.work.ProductionServices.record#ProductionLoss` (proposed) | Odoo scrap wizard; ERPNext Job Card process loss |

**Actions.** Record loss is not a negative good receipt. Asset scrap uses the canonical stock/disposition transaction, reason, authorization and financial handoff. Process loss without stock records quantity reconciliation only. Rework produces a linked new operation/order and retains genealogy. Approve, reverse and correct require supervisor/finance grants according to value/period. Handheld can record quantity/reason; cost fields remain hidden.

**Source.** research §8–§9; Odoo `odoo/addons/mrp/views/mrp_production_views.xml`; ERPNext `erpnext/manufacturing/doctype/job_card/job_card.json`.

**Needs.** M1, M2, M4, M6, M8.

### Downtime

**Layout.** list; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Downtime | list | Show current and historical stops | center, optional asset, run/operation, reason, from/thru, duration, maintenance link | duration; open interval | `mantle.work.ProductionServices.find#ProductionDowntime` (proposed) | ERPNext Downtime Entry |
| ReportStop | dialog | Open or close a downtime interval | facilityId, optional assetId, run/operation, from, thru, reason, note, operationKey | phone datetime; reason lookup | `mantle.work.ProductionServices.store#ProductionDowntime` (proposed) | ERPNext downtime_entry/downtime_entry.json |
| Maintenance | dialog | Create one linked maintenance intake request | downtimeId, equipment, problem, urgency, attachment references | shared request intake | `mantle.work.ProductionServices.request#ProductionMaintenance` (proposed); existing Request intake adapter | ERPNext Downtime Entry; current Projects request links |

**Actions.** No-material, no-operator, waiting-quality and equipment-fault are reasons on the same interval model; only equipment-fault may suggest Maintenance. Closing downtime does not automatically resolve the Request or start a person timer. Overlapping machine stops are unioned for OEE; person time remains separate. A correction keeps original interval and actor history. Operators may report their station; supervisors may correct and approve.

**Source.** research §8; ERPNext `erpnext/manufacturing/doctype/downtime_entry/downtime_entry.json`.

**Needs.** M1, M4, M5, M6, M7.

### Nonconformances

**Layout.** list; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Find | find | Filter quality findings | organization, source inspection, product/lot, severity, owner, status | inspection lookup | none | Carbon issues/nonconformance worklist |
| Findings | list | Show containment and corrective-action state | NCR ID, Request ID, source, severity, containment, owner, due, verified | shared Request links | `mantle.work.ProductionServices.find#ProductionNonconformances` (proposed) | Carbon quality Issues |
| CreateFinding | dialog | Create an auditable quality finding | inspectionId, run/operation, product/lot, description, severity, immediate containment, owner | record links; file references | `mantle.work.ProductionServices.create#ProductionNonconformance` (proposed) | Carbon issue form |

**Actions.** Corrective/preventive action is a linked Projects-owned Request with Work Items and evidence, not a new case lifecycle. Quality extension tracks cause, containment, effectiveness due/result, risk assessment and disposition links. Containment uses canonical holds. Closing the Request alone cannot release held inventory; the canonical disposition remains required.

**Source.** research §8, §14; Carbon `apps/erp/app/modules/quality/quality.models.ts` (issues, required actions, risk and calibration); current [Request model](../../mr-mantle/entity/RequestEntities.xml).

**Needs.** M1, M6.

### Gauges

**Layout.** list; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Gauges | list | Show calibration validity | assetId, serial, type, location, validFrom/thru, calibration status | expiry warning | entity query over proposed calibration extension | Carbon gauge/calibration patterns |
| Calibration | dialog | Record independently reviewed calibration | assetId, certificate file, calibratedAt, expiresAt, reference standard, result, verifier | Commons files; date | `mantle.work.ProductionServices.store#GaugeCalibration` (proposed) | Carbon gauge/calibration form |

**Actions.** Link gauge to inspection readings and block required use when expired/out-of-tolerance. Recalibration leaves historical certificates intact and creates a review list of affected inspections. EquipmentDetail owns gauge identity; Commons owns certificates; QualityInspection records the instrument/version used. No metrology compliance is implied without a reviewed deployment-specific procedure.

**Source.** research §8, §14 (gauge calibration); Carbon `apps/erp/app/modules/quality/quality.models.ts` gauge/calibration validators.

**Needs.** M1, M6.

### RequestDetail

**Context passed.** Mount Projects-owned RequestDetail for maintenance intake and quality corrective action. Pass existing RequestWorkEffort link to run/operation plus facility/equipment/source inspection; production scopes are defaults only. Preserve existing assignment, intake, client visibility and case lifecycle. Manufacturing adds source context and actions to return to downtime/quality, while release of a stock hold remains the quality disposition service.

### WorkItemDetail

**Context passed.** Open Projects-owned corrective-action/maintenance tasks with parent Request, run/operation and source quality evidence. This is for follow-up work, not an alternative editor for an executable production operation. Existing time, approvals and file controls remain in force.

## 7. Planning and outside processing

### SupplyPlanning

**Context passed.** Show shared buy/make/transfer recommendations, item/week demand and supply provenance, source age, reservations, inspections and net remaining demand. Pass organization, plant, date horizon and make emphasis; include buy/transfer alternatives rather than hiding them. Make conversion invokes ProductionServices.create#ProductionOrder and creates a draft WeInPlanning run with RequirementSupply links, chosen BOM/routing versions, UOM and date provenance. It does not auto-release. Existing supply and prior conversion identities are checked under lock so a Purchasing and Manufacturing user cannot both satisfy the same remaining demand. Forecast/firm demand remains distinguished. Authorized users can use this mount without Purchasing or Warehouse app grants; required record/action permissions still apply.

### InventoryAvailability

**Context passed.** Pass component or output product/variant, organization, plant, date, required quantity/UOM and run/operation. Show on hand, available, reserved, allocated, held, incoming, projected and source age with shared definitions. Default usable lots and source locations but show held quantities separately; planning cannot consume held stock. Reservation/stock actions need explicit capability. A stale/unavailable projection blocks trusted conversion or requires a defined fresh revalidation, rather than being treated as zero demand or infinite stock.

### ProductionSchedule

**Layout.** calendar; custom regions and terminal behavior described below.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Find | single | Choose plant resources and horizon | organization, plant, centers, date range, timezone, include tentative | date period; resource lookup | `mantle.work.ProductionPlanningServices.get#ProductionSchedule` (proposed) | Odoo work-order planning; Carbon schedule |
| Timeline | component | Compare ordered operations and capacity | operation, center, start/end, predecessors, offline slots, load, locked flag | custom timeline; m-* toolbar | `mantle.work.ProductionPlanningServices.get#ProductionSchedule` (proposed) | Carbon finite schedule visualization |
| Move | dialog | Preview and commit one scheduling change | operation ID, target center, start/end, expectedRevision, reason, conflict override | typed datetime alternative | `mantle.work.ProductionPlanningServices.schedule#ProductionOperation` (proposed) | Odoo work-order scheduling |

**Layout.** qvue resource timeline with selected-operation detail. Drag is a preview only; commit validates calendar, skills/equipment, capacity, predecessors, quantity and version. Existing actual work pins completed portions. A conflict override requires supervisor authority and explicit exception; it does not change physical capacity.

**Terminal.** Resource/date grouped table and a Move form with target center and start/end provide every mutation. Commands Preview, Apply, Unschedule and Show conflicts mirror browser actions; keyboard users never need dragging. Read-only roles have table/filter only.

**Boundary.** Shared SupplyPlanning decides how much/where buy, make or transfer; this screen decides authorized dates/resources for production operations. Multi-order finite optimization is a later explicit proposal, not a claim about the current framework.

**Source.** research §3, §6; Odoo `odoo/addons/mrp/views/mrp_workorder_views.xml`; Carbon `packages/planning/src/scheduling/run-schedule.ts`.

**Needs.** M1, M4, M5, M10.

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

**Actions.** Open SubcontractDetail, supplier, PO, shipment or quality record. New outside processing creates a purchasing requirement linked to the operation; buyer approval and order placement remain Purchasing-owned. Authorization to view a run does not grant vendor price or PO amendment rights.

**Source.** research §7; Odoo `odoo/addons/mrp_subcontracting/views/mrp_bom_views.xml`; Carbon production outside processing.

**Needs.** M1, M2, M4, M8, M10.

### SubcontractDetail

**Layout.** detail; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Agreement | single | Maintain draft outside-process requirements | operation, supplier, service product, quoted price basis, lead time, component ownership, external location | supplier/price explanation | `mantle.work.ProductionServices.store#ProductionSubcontract` (proposed) | Carbon outside processing operation; ERPNext subcontracting order |
| Materials | list | Track sent, at-vendor, consumed and returned stock | material line, product, owner, quantity/UOM, vendor location, shipment, return | stock/genealogy links | `mantle.work.ProductionServices.get#SubcontractMaterials` (proposed) | ERPNext supplied items; Odoo resupply subcontractor |
| Acceptance | display | Reconcile service receipt and production result | PO line, received service, output lot, inspection/disposition, service accepted, billed, remaining | match exception links | `mantle.work.ProductionServices.get#SubcontractStatus` (proposed) | ERPNext subcontracting receipt |

**Actions.** Request purchase routes through the shared planning/requirement contract. Send components uses Warehouse transfer/shipment with ownership retained; a vendor facility is not a sale. Receive finished work uses Warehouse receipt/QualityInspection and the same production snapshot; physical acceptance and bill matching retain separate evidence. Short delivery, rejected output or unused material return leave explicit residuals. Cancellation after dispatch requires a material return and supplier charge disposition; cannot delete the operation. Price resolution is the one shared resolver with internal buying organization and external supplier contexts.

**Procurement and cost handoff.** The service PO line references `OrderItemWorkEffort` for the operation plus the same RequirementSupply demand link; preserve orderId/orderItemSeqId, operationWorkEffortId, service quantity/UOM, pricing basis and expected acceptance evidence. Component shipment changes custody/location while retaining company ownership. Accepted physical output is received exactly once under the production output line and operation key, even when Warehouse records the supplier delivery. Service acceptance references that output/inspection evidence for matching; a service receipt or AP bill never posts another finished-goods receipt. Outside service estimate/accrual enters operation WIP once, and the matched vendor invoice replaces/adjusts the accrual through Accounting with linked variance, not an additional full charge. Evidence uses proposed `mantle.work.production.ProductionCostEvent` and `ProductionCostAllocation`; Accounting ProductionCostClose owns financial preview/post while Manufacturing reviews only. Failed/partial output retains unmatched service quantity and explicit supplier claim/rework decisions.

**External access.** The researched Odoo My Productions portal maps to Purchasing-owned supplier order/acknowledgment pages, with a subcontract context showing only that supplier's service lines, supplied-component custody, due dates and approved dispatch/inspection evidence. Supplier confirmations are claims for internal review, never stock receipts or quality verification. A standalone Manufacturing deployment may enable the same shared external contract; it does not expose the internal WorkOrderDetail or create another portal account scheme. The customer-owned inward progress view remains later with CustomerMaterialJobs.

**Source.** research §7; Odoo `odoo/addons/mrp_subcontracting/views/mrp_bom_views.xml` and `subcontracting_portal_templates.xml`; ERPNext `erpnext/subcontracting/doctype/subcontracting_order/subcontracting_order.json` and `subcontracting_receipt/subcontracting_receipt.json`.

**Needs.** M1, M2, M4, M6, M8, M10.

### Supplier360

**Context passed.** Pass external supplierPartyId and internal organization with subcontract context. Show identity, capabilities, approved product/operation qualifications, open outside work and performance; prices, agreements and financial balance appear only with corresponding grants. Buyer-owned edits link to the shared supplier record with explicit authorization.

### OrderDetail

**Context passed.** Mount one canonical record for source sales-order provenance and subcontract purchase orders. Pass orderId, run/operation, organization and order direction; do not infer direction from app name. Manufacturing sees relevant items, supply links, dates, receipt/inspection status and authorized pricing. Manufacturing can request changes through linked intake; buy-side approval/place/cancel and sales promises require their separate role/capability. Standalone Manufacturing can use the permitted shared read mount without buying an app-root grant.

### ShipmentDetail

**Context passed.** Pass operation and material provenance, origin/destination vendor facility, ownership, PO and source run. Show components dispatched, unused returns and output received. Logistics actions use Warehouse capability checks, supported quantity/UOM conversion and lot/serial policies; a shipment status change cannot independently declare production good output.

### CustomerMaterialJobs

**Layout.** list; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Jobs | list | Find customer material work and return obligations | customer, source order, product, owner, quantity, run, due, remaining return | ownership badge | `mantle.work.ProductionServices.find#CustomerMaterialJobs` (proposed) | ERPNext inward subcontracting |
| CreateJob | dialog | Create draft service work with custody rules | customerPartyId, serviceOrderId, customerMaterialProduct, quantity/UOM, receiving facility, BOM/routing version, return obligation | order/product lookups | `mantle.work.ProductionServices.create#CustomerMaterialJob` (proposed) | ERPNext inward subcontracting order |

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
| Members | list, editable rows | Maintain members before execution | operation ID, quantity, priority, planned date, method/version, cost share | compatibility checks | `mantle.work.ProductionServices.store#ProductionBatch` (proposed) | Carbon batches |
| Release | dialog | Release a compatible schedule group | batchId, expectedRevision, center, setup allocation method, reason | member preview | `mantle.work.ProductionServices.release#ProductionBatch` (proposed) | Carbon batch release |
| Unbatch | dialog | Remove pending members or dissolve group | member IDs, reason, allocation consequences | impact preview | `mantle.work.ProductionServices.dissolve#ProductionBatch` (proposed) | Carbon batch ungroup/dissolve |

**Actions.** Group setup/runtime is allocated by an explicitly frozen basis, while each run posts its own material, quantity and cost transaction. Completion returns per-member outcome; a failed member remains visible and retryable and does not roll back unrelated successful members. Members with physical postings cannot be erased or reassigned by dissolve. Shared setup correction references every affected allocation.

**Source.** research §5, §14; Carbon `apps/erp/app/modules/production/ui/Batches/BatchBuilder.tsx` and `BatchReleaseModal.tsx`.

**Needs.** M1, M2, M4, M8, M9.

### Disassembly

**Layout.** task; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Assembly | single | Select an eligible existing assembly | assembly assetId, source workEffortId, quantity, destination, reason | asset/lot lookup | `mantle.work.ManufacturingServices.get#ConsumedAssetRemaining`; `mantle.work.ManufacturingServices.get#ProducedProductComplete` | Mantle assembly breakdown services |
| Preview | list | Show original material quantities and reversibility | source issuance, component asset, remaining, proposed return, hold | genealogy drill-down | `mantle.work.ManufacturingServices.get#ConsumedAssetRemaining` | Mantle getConsumedAssetRemaining |
| Confirm | dialog | Apply a guarded supported assembly reversal | workEffortId, assetId, quantity, revision, reason, operationKey | explicit reversal warning | `mantle.work.ProductionServices.reverse#SupportedAssembly` (proposed); validated internal `mantle.work.ManufacturingServices.breakDown#Assembly` | Mantle breakDown#Assembly |

**Actions.** Parity is restricted to the supported pick-assembly path and original genealogy; do not advertise arbitrary manufacturing unbuild. Proposed guard checks owner, closed-period policy, remaining quantities, inspection holds and prior reversals. It invokes existing breakdown/unissue internals in one transaction only after proving the legacy path is suitable. General disassembly of altered, sold or untraceable production is `later`, modeled as a new versioned method and linked cost allocation, not an unconstrained negative production run.

**Source.** research §4, §14; [ManufacturingServices](../../mr-mantle/service/mantle/work/ManufacturingServices.xml).

**Needs.** M1, M2, M4, M8.

### ProductionSettings

**Layout.** settings; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Consumption | single | Define material and output policy | organization/plant, manual/backflush, issue point, overconsume/overproduce tolerances, substitute approval, quality defaults | explicit units/tolerances | `mantle.work.ProductionServices.store#ProductionPolicy` (proposed) | ERPNext Manufacturing Settings; Odoo manufacturing settings |
| TimeAndCost | single | Define required time evidence and estimate review | time-log enforcement, machine runtime, work type, overhead basis, auto-estimate refresh, close approval | existing work-type lookup | `mantle.work.ProductionServices.store#ProductionPolicy` (proposed) | ERPNext Manufacturing Settings |
| Planning | single | Set scheduling and planning defaults | horizon, time fence, shortage release policy, calendar, lead-time basis, freshness limit | date duration; Commons calendar | `mantle.work.ProductionServices.store#ProductionPolicy` (proposed) | ERPNext Manufacturing Settings/Production Plan |

**Actions.** Save validates policy against permissions/accounting configuration and creates an effective-dated version; running work retains its released policy. “Auto-update BOM cost” means propose a new standard estimate for review, never automatically revalue stock or alter a released run. Backflush requires exact snapshot quantities and compatible lot/serial assignment; any insufficient/held stock aborts that atomic completion and offers explicit issue. All settings have organization defaults plus explicit plant override, with inherited values visible.

**Source.** research §11; ERPNext `erpnext/manufacturing/doctype/manufacturing_settings/manufacturing_settings.json`.

**Needs.** M1, M4, M5, M8, M10.

### ReasonCodes

**Layout.** settings; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Reasons | list, editable rows | Maintain effective reason codes and approval requirements | code, label, category, equipmentFault, plannedStop, approval threshold, effective dates, active | translated labels; no-delete referenced code | `mantle.work.ProductionServices.store#ProductionReasons` (proposed) | ERPNext downtime stop reasons; Odoo productivity losses |

**Actions.** Deactivate rather than delete referenced reasons. Changes to OEE categorization apply prospectively by version; historical metrics preserve the classification in the recorded event. Equipment-fault suggests maintenance intake but other reasons remain ordinary production loss.

**Source.** research §8, §11; ERPNext `erpnext/manufacturing/doctype/downtime_entry/downtime_entry.json`.

**Needs.** M1, M6.

### Approvals

**Context passed.** Contribute method release when separation is configured, substitutions, exceptional loss, overproduction, schedule override and cost-close review through implemented Commons approval facilities. Pass immutable subject revision, organization, source run and proposed action; decision must revalidate stale subjects before executing. Approver role is checked independently from manufacturing app membership; approval never bypasses an accounting closed period.

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
| Parameters | single | Select report scope | template/version, product, operation, lot, date, result | date period; authorized lookups | `mantle.work.ProductionReportServices.get#ProductionQualityReport` (proposed) | ERPNext Quality Inspection; Carbon quality reports |
| Results | list | Explain totals with drill-down evidence | sample count, readings, failure rate, holds, reinspection, disposition time | totals; canonical record links | `mantle.work.ProductionReportServices.get#ProductionQualityReport` (proposed) | ERPNext Quality Inspection; Carbon quality reports |

**Actions.** Refresh and export the same filtered data; open the source run, material event, inspection or accounting record with its own access check. Totals declare unit/currency and do not add incompatible units. Independent query partitions return named failures and an incomplete total, while no posting happens from the report.

**Source.** research §9–§10; ERPNext Quality Inspection; Carbon quality reports.

**Needs.** M1, M6.

### ProductionCostReport

**Layout.** report; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Parameters | single | Select report scope | organization, plant, run, completion period, estimate version, currency | date period; authorized lookups | `mantle.work.ProductionReportServices.get#ProductionCostReport` (proposed) | Carbon JobEstimatesVsActuals.tsx |
| Results | list | Explain totals with drill-down evidence | material/labor/machine/overhead/outside cost, WIP, output allocation, variance, GL links | totals; canonical record links | `mantle.work.ProductionReportServices.get#ProductionCostReport` (proposed) | Carbon JobEstimatesVsActuals.tsx |

**Actions.** Refresh and export the same filtered data; open the source run, material event, inspection or accounting record with its own access check. Totals declare unit/currency and do not add incompatible units. Independent query partitions return named failures and an incomplete total, while no posting happens from the report.

**Source.** research §9–§10; Carbon JobEstimatesVsActuals.tsx.

**Needs.** M1, M4, M8.

### BomVarianceReport

**Layout.** report; standard XML widgets, shared shell context and action hierarchy.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Parameters | single | Select report scope | BOM/version, run, product, operation, date, quantity basis | date period; authorized lookups | `mantle.work.ProductionReportServices.get#BomVarianceReport` (proposed) | ERPNext BOM/production variance patterns |
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
| §2 BOMs, scrap/operation assignment, explosion, version/compare, byproducts, costs and where-used | Boms/BomDetail/WhereUsed (`parity` baseline association replacement); BomExplosion/BomCompare/RoutingDetail/ByProducts (`new`); cost rollup is the Products-owned screen mounted from the method version. Product360 is defined once in crosscut. |
| §3 routings, operations, work centers, skills/equipment, instructions | Routings/RoutingDetail/OperationTemplates/WorkCenters/Capacity (`new`); shared FacilityDetail/EquipmentDetail/Calendar; approved instructions and operator step capture (`new`), AssemblyViewer (`later`). |
| §4 work-order find/detail, all tabs, change quantity, split/backorder, cancellation and clone | WorkOrders/WorkOrderDetail/Overview/Components/Quantities (`parity` plus guarded new lifecycle); new operations/byproducts/quality/costs; shared Materials, Time, Chatter/files; ChangeQuantity form and SplitWorkOrder wizard (`new`). Disassembly retains supported assembly parity, general unbuild is explicitly later. |
| §5 manager/operator kiosk, scanners, keyboard, timer, materials, QC, reconciliation, downtime/maintenance | ShopFloor/OperationExecution/Instructions/Downtime (`new`) and shared stock/quality/request/equipment/time; WallDisplay and 3D AssemblyViewer (`later`). No browser-only execution operation is required. |
| §6 net needs, demand/supply per week, create make/buy/transfer, capacity timeline | Canonical SupplyPlanning (`new`) and InventoryAvailability (`parity`), ProductionSchedule/Capacity/PlanningReport (`new`). DemandForecasts/MasterSchedule/FiniteSchedule (`later`), with firm-demand and duplicate-supply prevention contracts now fixed. |
| §7 outward and inward subcontracting | SubcontractOperations/SubcontractDetail plus canonical supplier/order/shipment/material/quality views (`new` outward); CustomerMaterialJobs (`later` inward) with ownership/custody accounting prerequisite. |
| §8 quality templates/gates, scrap, process loss, OEE/downtime, nonconformance/CAPA, gauges, risks/documents | Inspections/QualityGates/ScrapLoss/Downtime and shared quality/templates (`new`); Nonconformances/Gauges (`later`) link existing Request/WorkItem and Commons controlled files, with risk and effectiveness evidence. No orphan quality workflow duplicates Projects. |
| §9 costing and variance | ProductionCosts, ByProducts, ProductionCostReport/BomVarianceReport (`new`); Products estimate revisions and Accounting WIP/valuation/period contracts, with restricted financial columns. |
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
| EditRun: NewNoteForm, UpdateNoteForm | Shared/Chatter; Manufacturing/WorkOrders/WorkOrderDetail/Chatter |
| EditRun: AddEquipment, EquipmentList | Manufacturing/WorkOrders/WorkOrderDetail/Overview; Manufacturing/WorkCenters/Equipment |
| EditRun: AddPartyAssignForm, UpdateAssignForm | Manufacturing/WorkOrders/WorkOrderDetail/Overview |
| RunProducts: AddProduceForm, ProduceList | Manufacturing/WorkOrders/WorkOrderDetail/Quantities |
| RunProducts: AddConsumeForm, ConsumeList | Manufacturing/WorkOrders/WorkOrderDetail/Components |
| RunProducts: ReceiveAssetForm, IssueAssetForm | Shared/MaterialIssueReceipt; Manufacturing/WorkOrders/WorkOrderDetail/Materials |
| RunConsumed: IssueAssetForm, ConsumeAssetForm, IssuedAssetForm | Shared/MaterialIssueReceipt; Manufacturing/WorkOrders/WorkOrderDetail/Materials |
| RunProduced: ReceiveAssetForm, ReceivedAssetForm | Shared/MaterialIssueReceipt; Manufacturing/WorkOrders/WorkOrderDetail/Materials |
| ConsumeAsset: ConsumeAssetForm; ConsumeProduct: ConsumeAssetForm; ProduceAsset: ReceiveAssetForm | Shared/MaterialIssueReceipt; Manufacturing/WorkOrders/WorkOrderDetail/Materials |
| Catalog EditAssocs: AddAssocToForm, AssocToListForm, AssocFromListForm | Manufacturing/Boms/BomDetail; Manufacturing/Boms/WhereUsed (manufacturing associations only; other catalog associations remain Products) |

The existing directly queried services named in forms are eligible for additive service mappings. Internally invoked create/issue/receipt/unissue/ledger hooks are documented dependencies but are not falsely claimed as new direct form calls. Generic entity creates/updates remain subject to the proposed domain transition guard. The legacy direct quantity setter is deliberately excluded from new Designed-in mappings because its automatic completion/recalculation is unsafe for released work.

### 10.3 End-to-end acceptance review

| Scenario and exception | Required review result |
| --- | --- |
| Product variant → supplier price → RFQ/PO → partial receipt/failed inspection → bill/payment | BOM component stores exact variant and stock UOM; supplier pack conversion and price-resolver explanation are shared Products/Purchasing rules. Only accepted/disposed receipt becomes production availability. Failed inspection remains held and cannot be reserved/issued. Partial supply preserves remaining demand and match evidence; Manufacturing cannot clear AP holds or approve payment. |
| Shortage → buy/make/transfer → partial production → finished stock → GL | One PlanningRun and remaining RequirementSupply allocation prevents duplicate conversions. Make creates a draft with chosen method versions; explicit release freezes its snapshot. Issue links material line/lot, person time links operation and machine time stays separate. Partial good receipt, process loss, scrap and unused return reconcile independently. WIP/output/variance traces stock and accounting postings; missing configuration or closed period leaves a named exception, no half-posted stock/GL pair. |
| Order reservation → pick shortfall → substitute/replan → shipment/invoice/payment | Source OrderItemWorkEffort/provenance remains visible. Shortfall changes neither promised dates nor production target silently. Substitution checks approved method/UOM/specification and revision; it cannot substitute an arbitrary material because availability is positive. Finished lot becomes reservable only after release from quality. Sales, logistics and finance keep their action authorities. |
| Customer return → inspection → rework or scrap → credit/refund; supplier return | Returned stock retains RMA/source invoice identity and disposition hold. Approved rework creates linked production demand and a new frozen snapshot; it cannot mutate the original closed order/run. Scrap/rework stock and costs have reviewed disposition; credit/refund and supplier claims remain Accounting/Purchasing-owned. Customer-owned stock follows the later custody contract, never company inventory by default. |
| Physical count while production issues/receives | Shared count cutoff/movement reconciliation includes production movement identities and locations. Posting rechecks intervening issues/receipts/reservations and requires variance review; production does not bypass count locks with raw Asset update. A failed count item is named; a successful independent item remains posted once. |
| Intake → assignment → pause/reopen → resolution and CSAT | Downtime/quality intake uses existing Request links and scoped assignment; Customer Service owns SLA/CSAT and Projects owns RequestDetail. Production state/quality hold is independent of case resolution. A reopened case can create a new production action without reopening stock or a closed accounting period automatically. |
| Released BOM/routing changes; missing/expired instruction or gauge | New revision does not alter the released run. Comparison shows affected work; amendments freeze a successor snapshot and preserve already-executed facts. No raw ProductAssoc or generic WorkEffort edit bypasses this. Expired required calibration or missing approved instruction blocks the affected step with a named reason. |
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
| Production traveler/pick sheet | `html-print` with optional configured PDF export | WorkOrderDetail | Existing [RunPickDocument](../../mr-marble/screen/SimpleScreens/Manufacturing/Run/RunPickDocument.xml) and `mantle.work.ManufacturingServices.get#ProductionRunPickInfo`; add snapshot revision, operation sequence, material/lot requirements and QR/barcode identity. |
| Operator instructions and quality checklist | `html-print` | Instructions / QualityInspection | Frozen approved instruction/template versions; current Commons files and shared quality schema. Text instructions always printable; 3D viewer has part/step text and drawing references. |
| Finished/secondary product and WIP labels | `html-print`, configured label printer later if needed | MaterialIssueReceipt / ByProducts | Shared Warehouse label contract; product, quantity/UOM, lot/serial, owner/facility, run/operation and inspection hold state. No label claims acceptance before disposition. |
| BOM/routing, exploded needs and revision comparison | `html-print`, CSV export | BomDetail / BomExplosion / BomCompare | Odoo structure report; ERPNext BOM explosion/comparison; exact versions and conversion/cost basis. |
| Quality certificate, loss and calibration evidence | `html-print` / attachment | QualityInspection / ScrapLoss / Gauges | Shared quality and Commons files; include verified result and instrument/template version; external certificate visibility explicit. |
| Outside-processing dispatch/return instructions | `html-print` | SubcontractDetail / ShipmentDetail | Shared Warehouse shipment documents; component owner, quantities, lot/serial and PO/operation links. Supplier-visible instructions exclude unauthorized internal cost. |
| Reports and plan snapshots | CSV and `html-print` | Reports, Capacity, SupplyPlanning, ProductionSchedule | Same authorized filters/columns as screen, with source age, unit/currency, missing partitions and plan version. |
| BOM/routing migration/import preview | CSV import + preview/results | Boms / RoutingDetail | Existing ProductAssoc/WorkEffort templates plus published import schema; stable external line IDs, effective versions, quantity/UOM and operation mapping. Each independent BOM version is one atomic unit; bad versions named and skipped while others continue. Publish remains explicit. |
| Release, shortage, quality-block and schedule-change notices | Existing Commons notification/approval | WorkOrderDetail / QualityGates / ProductionSchedule | Existing shell providers and access-filtered links. Explicit supplier/customer communications go through shared Comms review/send, not implicit stock actions. |

## 12. Framework and data needs

This is the local specification for the coordinator's deduplicated [crosscut needs](design-crosscut.md#7-framework-and-data-needs). M1/M2/M6/M10 refer to canonical cross-app capabilities; no parallel implementation is intended. All families below are proposed unless explicitly marked current in §1.3. Names are design contracts, not inactive XML being quietly treated as live.

| Need | Kind | Proposed as | Used by | Stub spec |
| --- | --- | --- | --- | --- |
| M1 — Context, grants and shell contributions | shell item / seed data | Existing Commons context/providers extended with production record types, action grants and plant/operator context | All screens | Server derives allowed actions from record/org/facility grants; each provider filters counts and links; method release, stock action, verifier and financial roles independent. One named result per independent batch item; safe error IDs without inaccessible details. |
| M2 — Atomic production/stock handoff | service type / data model | Shared MaterialIssueReceipt contract plus `mantle.work.ProductionServices` guards | Work orders, ShopFloor, subcontracting, disassembly | Persist operation identity, request hash and outcome before response; same key/same payload returns prior result, conflicting payload fails. One logical stock/financial event is all-or-nothing with its run/line link; dependent postings use canonical ledger hooks once. Independent runs/items continue with IDs, error category and retryability. Cancellation is a reviewed reversal/residual plan. |
| M3 — Versioned methods | data model / service type | `mantle.product.bom.ProductBom`, `ProductBomVersion`, `ProductBomItem`; `mantle.work.production.RoutingVersion`, `RoutingVersionOperation`; `mantle.product.BomServices`, `mantle.work.RoutingServices` | BOM/routing editors, Product360, planning, release | ProductBom identifies product/org/method; version has base quantity/UOM, status, effectivity, phantom, routingVersion, approval and predecessor. Item has stable itemId, versionId, role consume/byproduct, product/variant, quantity/UOM, scrapFactor, consuming operation, instruction and substitution rule. Never reuse ProductAssoc's composite PK as version-line identity. Existing associations/templates import through explicit compatibility mapping. Release forbids cycles, ambiguous overlapping effective selection and invalid conversions/dependencies; publish immutable versions. |
| M4 — Released run snapshots and guarded lifecycle | data model / service type | `mantle.work.production.ProductionRunSnapshot`, `ProductionMaterialSnapshot`, `ProductionOperationSnapshot`, `ProductionQuantityEvent`, `ProductionInstructionVersion`; `mantle.work.ProductionServices` | All execution, split, method changes, time/cost evidence | SnapshotId/run/revision records BOM+route+policy versions, demand IDs, approval/time. MaterialSnapshotId links snapshot, source BOM item, operationSnapshotId, product/variant, role, quantity/UOM and exact stock conversion, scrap/substitute rules. OperationSnapshotId links child WorkEffort, routing operation/version, sequence/dependencies, center, setup/run standards, instruction/template versions. Postings reference immutable line IDs. Amendments create successor snapshots and remap only unexecuted work; preserve original fact links. |
| M5 — Production resource capacity | data model / service type | `mantle.work.production.WorkCenter`, `WorkCenterCapacity`, `WorkCenterRate`, `WorkCenterAlternate`; `mantle.work.ProductionPlanningServices` | FacilityDetail, WorkCenters, RoutingDetail, schedule/load | Key WorkCenter by facilityId with plant, calendar, efficiency, OEE target and scheduling policy. Capacity: product/type, quantity/UOM per duration or parallel slots, effective dates. Rate: currency/hour, cost component, effective dates and approval. Alternatives carry capability/qualification. Existing Facility.capacity remains people capacity; Commons owns work hours/holidays/bookings. Load validation locks changed operations, rechecks resources and respects actual/frozen work. |
| M6 — Quality, loss and downtime evidence | data model / service type / seed data | Canonical InspectionTemplate/Item, QualityInspection/Reading and QualityServices; production `ProductionLoss`, `ProductionDowntime`, later `mantle.product.quality.QualityNonconformance`, `GaugeCalibration` | Quality, operations, resource views, reports | Quality uses canonical lifecycle/result/disposition and retained template/reading versions. Loss: lossId, run/operation, snapshot line, product/asset/lot, quantity/UOM, scrap/process-loss/rework type, reason, disposition, source posting/correction and approval. Downtime: ID, facility, optional asset/run/operation, start/end, reason classification, actor, maintenance Request and correction chain; same model for non-equipment causes. Calibration stores certificate validity and affected-reading references; NCR links Projects Request/WorkItem. |
| M7 — Operator execution and person/machine time | Vue component / service type / data model | ShopFloor.qvue with `tui` twin; `MachineRuntimeEvent`, instruction step acknowledgments; existing TimesheetServices | ShopFloor, OperationExecution, Instructions, AssemblyViewer, WallDisplay | Explicit station scope/identity, scan parser, 48px controls, 18px input, keyboard path, retained entry, operation-key outcome reconciliation. Person timers/TimeEntry and weekly locks remain Projects-owned; machine runtime key is equipment/operation interval and cannot masquerade as labor. Every custom canvas/board has text/table/command equivalents and standard `m-*` input controls. |
| M8 — Cost evidence and controlled close | data model / service type | `mantle.work.production.ProductionCostEvent`, `ProductionCostAllocation` in the Accounting handoff; Products ProductStandardCost/Component; production cost read/review services | ByProducts, Costs, losses, subcontracting, reports | Freeze estimate ID/version and material/labor/machine/overhead/outside bases. Actual event references asset issue/receipt, TimeEntry/rate version, machine event, AP line or GL correction. WIP and output allocation sums reconcile per currency. Accounting owns actual valuation, variance journals and period checks; no direct edit of WorkEffort.estimatedCost (commented) or silent revaluation. Late facts create linked open-period adjustments. |
| M9 — Production batches | data model / service type | ProductionBatch, ProductionBatchMember, ProductionBatchAllocation | Batches, BatchDetail, finite schedule | Batch groups compatible operation IDs and setup basis; no new production-order identity or merged genealogy. Membership/version checks and group schedule are atomic; each member posts stock/cost atomically and returns independent outcome. Dissolution cannot erase started/posted work. |
| M10 — Planning and reporting projections | service type / data model | Shared PlanningRun/PlanningSuggestion/RequirementSupply and SupplyPlanningServices; `mantle.work.ProductionPlanningServices`, `ProductionReportServices`; later forecast/master/schedule-proposal entities | Home, SupplyPlanning, scheduling, all reports | Shared netting includes units, inspection holds, reservations, supply provenance and freshness; exactly one converted supply per remaining demand allocation. Make conversion calls create#ProductionOrder for a draft, never release. Scheduling is Manufacturing's resource/date concern. Reports return scoped totals, as-of, omitted partitions and units; later forecast consumption avoids double counting firm orders. |

### 12.1 Proposed service contracts

`mantle.product.BomServices` owns `find#Boms`, `store#Bom`, `store#BomVersion`, `store#BomItem`, `validate#BomVersion`, `release#BomVersion`, `get#BomExplosion`, `compare#BomVersions` and `get#BomWhereUsed`. Store calls accept stable identity plus expectedRevision; release returns immutable version and validation findings. Explosion/compare return provenance paths, chosen versions, quantities/conversions and completeness; they create no supply.

`mantle.work.RoutingServices` owns template/version/resource/instruction/work-center editing named in §5–§6: `find#Routings`, `store#RoutingVersion`, `store#RoutingOperation`, `store#RoutingResource`, `release#RoutingVersion`, `find#OperationTemplates`, `store#OperationTemplate`, `store#InstructionVersion`, `store#WorkCenter`. Inputs are the form's scoped identifiers/fields and expected revision; outputs are saved ID/revision or named validation findings. Work-center financial rates require separate cost authority.

`mantle.work.ProductionServices` owns the read, create, release, controlled-change, operation-event, split, loss/downtime, subcontract, batch and policy calls named in forms. Mutations require actual organization, run/operation or source identity, expectedRevision, reason when altering released work and operationKey for transactional actions; outputs carry committed event/stock/accounting IDs, resulting revision/status, warnings and retry outcome. `create#ProductionOrder` wraps current create#ProductionRun in one scoped draft/provenance transaction. `release#ProductionOrder` freezes method/policy/estimate and creates operation children, without rewriting current posted facts. `transition#ProductionOrder` validates phase-specific constraints; `record#ProductionQuantity`/`complete#ProductionOperation` reconcile input/output and quality; `change#ProductionQuantity`/`split#ProductionOrder` preserve executed work and remaining-demand conservation. `batch#ProductionAction` returns `{workEffortId, action, outcome, errorCode, message, retryable, operationKey}` per independent run, continuing after failure.

Read services return authorized records, source age and completeness; they do not acquire stock or imply release. Proposed maintenance/NCR calls use the existing Request intake/link services with production context rather than implementing a new case model. Proposed `reverse#SupportedAssembly` is a reviewed adapter over the supported legacy assembly reversal only; direct use is blocked until current stock/ledger reversal semantics are demonstrated safe for that case.

`mantle.work.ProductionPlanningServices` owns schedule/load and later forecast/master/finite proposal calls in §7. All commit calls check proposal/version and affected-resource concurrency; no solver writes directly to WorkEffort. `mantle.work.ProductionReportServices` owns the eight read-only report contracts in §9; parameters and columns are their public service shape. Canonical SupplyPlanningServices remains the only demand/supply conversion owner.

### 12.2 Reconciliation and transaction rules

For a run, target quantity is not the amount of component issue. Display target, accepted good, produced-held, pending, process loss, scrap and rework separately, in explicit compatible units. For each primary output line, target = accepted good + produced-held + remaining-to-produce + approved terminal output loss, subject to an explicitly approved target amendment or overproduction delta. Rework-in-progress is identified within the unresolved/held quantity and never added again as good; component scrap does not enter an output-unit equation. A rejected held output moves from held into an approved rework or terminal-loss disposition, preserving the physical event. A configured terminal reconciliation defines which residual quantities close the target; rework transferred out is not simultaneously finished good. Material comparison is required material versus net issued minus unused return; actual asset scrap and process loss are not an implicit reduction of required material. A finished receipt must reference an output line and input genealogy where tracked. Lot/serial uniqueness and owner/location constraints are enforced at posting time.

Backflush is a deliberate atomic stock action using the frozen method and selected actual lots; a scan or quantity entry alone cannot consent to an unknown substitution or negative stock. Verification alone releases no quality-held inventory. For this phase, coupled quantity/stock/financial posting succeeds completely or leaves the transaction unposted with a named exception. Validate and extend the existing automatic ledger hooks to satisfy this atomic boundary. A durable deferred-posting mode is a later proposal requiring an explicit Accounting contract; it is not an alternative first-release behavior.

## 13. Decided

| Decision | Notes |
| --- | --- |
| Simple runs remain first class | No routing is required. Run-level materials, quantities, person time, quality and costs remain usable; operation tabs are absent with an explanatory label. |
| One production run is one work order | `WepProductionRun` is the header. Batches are later separate setup groups with preserved run/operation identities and independent posting results. |
| Shared netting, Manufacturing scheduling | SupplyPlanning owns buy/make/transfer demand provenance and duplicate-supply prevention. Manufacturing owns resource/date scheduling; finite optimization, forecast and master schedule are later. |
| Completion is explicit reconciliation | Good, pending, process loss, scrap and rework never overwrite one another. Issue quantity is not completion authority. Existing set#ProducedProductQuantity is not a direct BOSS released-run endpoint. |
| One quality model and screen | Warehouse receipt, Manufacturing in-process/final and returns use the same record/template/lifecycle/disposition. Operator presentation adapts the existing fields without inventing another result model. |
| One reason-coded downtime record | No-material, no-operator, waiting-quality and equipment fault share interval/correction semantics; maintenance intake is an optional linked consequence only for relevant reasons. |
| Work-center extension over Facility | Resource throughput, calendars, efficiency, rates and alternatives use the production extension. Existing Facility.capacity remains people capacity and shared facility identity remains canonical. |
| Phantom BOM differs from pick kit | Phantom is a controlled BOM-version property. PtPickAssembly remains existing pick-time assembly behavior and is not reused as the phantom flag. |
| Immutable release, controlled amendment | BOM, routing, instructions, quality template, policy, unit conversions and estimate basis are frozen. New revisions warn but never rewrite in-flight or historic work. |
| Stock and financial authority stay shared | Shared issue/receipt/disposition and Accounting handoff preserve lot/serial, ownership, WIP, valuation, GL and period rules. Production does not call ledger hooks independently or bypass a hold. |
| Existing time and cases remain owned | Projects timer/timesheet, Request and WorkItem remain the shared facilities. Machine runtime is separate; production context extensions do not create replacement apps. |
| Core outside processing now; advanced scope later | Outward component custody and purchased operation/quality receipt are new first-release designs; inward customer-owned processing, batches, NCR/CAPA/gauges, finite forecasting/MPS and 3D are later with explicit screens and needs. |
| Parity forms are carried forward | All 23 Manufacturing forms map to their redesigned or canonical host. Notes use Shared/Chatter; material forms use Shared/MaterialIssueReceipt. Catalog manufacturing association forms gain additive BOM/where-used mappings. |
| Documentation is not implementation | Every proposed family/entity remains new work. Old commented cost definitions and incomplete legacy orchestration are not reported as implemented, and application builds are not part of this pass. |

## 14. Open

These are deployment/product review items with recommended answers; they do not leave ownership or cross-app contracts contradictory.

| Review item | Recommended answer and reason |
| --- | --- |
| Minimum release material gate | Require valid method, unit/quality/resource configuration and an explicit shortage review; allow staged release with supervisor approval while blocking the affected operation's actual issue/start as configured. Many shops release work before every component arrives, but a shortage must remain visible and actionable. |
| Valuation/overhead and co-product allocation policies | Accounting selects supported valuation policy and effective overhead/rate/secondary-output allocation basis per organization; begin with a frozen explicit percentage or quantity-normalized rule and reject unbalanced allocation. The designer cannot infer a business's accounting policy. |
| Auto-completion with no formal inspection | Default to explicit final reconciliation even when quality gates are optional. A later organization opt-in may combine it with final receipt, using the same atomic service and audit evidence. |
| Skill certification and safety acknowledgment strictness | Make required certification and approved instructions blocking when configured; keep a visible advisory mode for deployments without qualification data. Production's authorization cannot infer employee competence from assignment alone. |
| Nonconformance and calibration first-release demand | Keep the designed later phase unless a pilot has regulated/contractual traceability needs; then bring the exact extension forward without changing Request or quality-screen ownership. |
| Released-run amendment policy | Default to no method change after any material/time/output fact; permit controlled amendment of only remaining work with method approver and production supervisor review. A business that needs strict regulated release should require a linked new run instead. |
| Later deferred cost posting | Retain atomic stock plus configured financial posting for this phase. Consider deferred mode only as a later Accounting extension with durable source identity, explicit pending/failed status, recovery and cost-close blocking; never report pending work as GL success. |
