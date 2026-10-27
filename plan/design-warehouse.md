# IronStone BOSS — Warehouse design

Oct 27, 2026 — draft

IronStone Warehouse serves receiving clerks, pickers, packers, inventory controllers and warehouse
managers. Receiving, Inspection, Inventory, Counts, Transfers and requests, Picking, Packing and
shipping, Returns, Locations, Handheld, Reports and Settings form one operational app. A small
business can receive, hold, move, count, fulfill and return goods from this app alone, using the
shared records and authorized actions it mounts locally.

**Inputs.** [research-warehouse.md](research-warehouse.md) §1–§17; [design-crosscut.md](design-crosscut.md)
(the common contracts and canonical shared definitions); [design-doc-guide.md](design-doc-guide.md);
[style-guide.md](style-guide.md); [initial-design.md](initial-design.md)'s fixed decisions;
[design-drawers-commons.md](design-drawers-commons.md); [design-projects.md](design-projects.md);
[ss-inventory.md](ss-inventory.md) and [usl-inventory.md](usl-inventory.md).

**Source paths.** Moqui baseline paths below are relative to `runtime/component/mr-marble/screen/SimpleScreens/`,
except `BasicHandheld/…`, which is under `runtime/component/mr-marble/screen/`. Mantle paths are
relative to `runtime/component/mr-mantle/`. Third-party paths resolve under `~/work/moquiwork/3p_other/`
using the research prefix table: Odoo under `odoo/`, ERPNext under `frappe/erpnext/`, Carbon under `carbon/`.
The research's old `/home` checkout prefix is not required. References describe behavior; no third-party
source is copied. Inventory cells shorten baseline paths; §15 records their exact keys.

**Current baseline.** Warehouse root/section placeholders exist, but the operational screens below are designs.
The Commons shell, context, Chatter, files, request links and Projects shared RequestDetail already exist.
PhysicalInventoryCount and all four PI statuses are active. `record#PhysicalInventoryQuantity` still adjusts
stock immediately, even when given a count-line ID; this design introduces separate count entry and posting.
AssetServices already reads expiration dates for customer newer-inventory/lot selection: the research's
absolute claim otherwise is stale. A general expiry/quality posting gate is still a required extension. `CarrierServices.get#ShipmentRates`
is commented out, despite its research/inventory listing; shipment rating needs a new adapter over
the active gateway rate interfaces. `get#InventoryProjectedInfo` is an indexed projection: display its
as-of/freshness and unavailable-search state, never substitute zero demand, and revalidate against
transactional sources before supply conversion.

**Service notation.** Fully qualified existing services are verified against active XML. `entity` means
an authorized entity read or non-posting master-data create/update. Any service described as proposed,
including InventoryCountServices, WarehouseTaskServices, PutawayServices, WarehousePolicyServices,
TraceabilityServices, DeliveryServices and ExternalStockServices, is a required addition, not an existing API.
Stock/financial actions always pass the crosscut posting guard, even where a form names the existing
service it ultimately uses. New wrappers must not change that service's established semantics.

**Sections.** [1 shell](#1-shell) · [2 screens](#2-screens) · [3 home](#3-home) ·
[4 receiving](#4-receiving) · [5 inspection](#5-inspection) · [6 inventory](#6-inventory) ·
[7 counts](#7-counts) · [8 transfers](#8-transfers-and-requests) · [9 picking](#9-picking) ·
[10 shipping](#10-packing-and-shipping) · [11 returns](#11-returns) ·
[12 locations](#12-locations-and-facilities) · [13 handheld](#13-handheld) ·
[14 reports and settings](#14-reports-and-settings) · [15 coverage](#15-baseline-coverage) ·
[16 outputs](#16-documents-and-outputs) · [17 needs](#17-framework-and-data-needs) ·
[18 decided](#18-decided) · [19 open](#19-open)

## 1. Shell

Root `screen/Warehouse.xml`, launcher title **IronStone Warehouse**, icon `sym_o_warehouse`,
root group `BOSS_WAREHOUSE`. The root calls `mantle.party.PartyServices.setup#UserOrganizationInfo`
and resolves authorized facilities/owners. `app` below means Warehouse access plus record visibility.
Narrow action capabilities are proposed role grants: receive, inspect, move, count, count reviewer,
adjust, pick, pack, ship, dispatch, warehouse manager, quality manager, facility admin and integration
operator. A user may hold several; the server checks the capability and scope for every action.
Read-only users can navigate and export visible operational data; they cannot post through a URL.

Menu to depth two (detail and task paths remain hidden until opened):

- Home → Home.
- Receiving → Receipts, Putaway, Supplier360 from the selected supplier.
- Inspection → Inspections, InspectionTemplates.
- Inventory → Availability, Assets, Lots, Containers, Movements, Traceability; Product360 from a product.
- Counts → Counts, CountVariance.
- Transfers → Transfers, Move, StockRequests, SupplyPlanning.
- Picking → Picklists, CreatePicklists, PickLocationMoves.
- Shipping → Shipments, Pack, PackageTracking, DeliveryTrips (later).
- Returns → Returns.
- Locations → Facilities, PutawayRules, Capacity (later), Carriers, BoxTypes, Printers.
- Handheld → Home, Receive, Putaway, Pick, Pack, Move, Count.
- Reports → Reports, CountVariance, OperationsHistory.
- Settings → Settings, StockPolicies, ReservationPolicies, AssetPools, ExternalStockSync (later).

Home's ready/waiting/late/backorder counts open the same task lists with filters. Facility selection
persists as a user preference but never overrides authorization. Cost/value columns require financial-read
permission; selection/export endpoints apply the same field restrictions. Records expose canonical IDs,
not screen-local aliases, so Chatter and files do not split across mounts.

Shell providers: palette types for shipments, returns, lots/assets, containers, counts and picklists;
quick create for receipt, transfer, count and stock request; Today sources for assigned pick/putaway/count/
inspection work; notifications for receipt exceptions, shortage/short pick, inspection decision, failed
posting and due counts. Provider queries are organization/facility/owner scoped. F2 focuses scan only in
a handheld task; Enter resolves input, and a separate visible confirmation commits a movement. No global
shortcut silently dispatches stock. Existing shell components are reused (WH-SHELL).

## 2. Screens

Each row is a screen, including a contextual mount; one-form dialogs remain in their host's Forms table.
`parity` replaces baseline functionality, `new` is an essential first-release addition, and `later` remains
fully designed for a subsequent build. Shared section numbers refer to design-crosscut unless stated.

| Screen | Path | Archetype | Impl | Purpose | Main record | Reused | Roles | Scope | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Home | Warehouse/Home | landing | xml | Run the facility from its ready, waiting and late queues. | Shipment; PhysicalInventory; WorkEffort | own | app | new | facility and owner filters |
| Receipts | Warehouse/Receiving/Receipts | list | xml | Find incoming purchase, transfer and return shipments. | Shipment | own | app | parity | Shipment rows; incoming find parameters |
| ReceiptDetail | Warehouse/Receiving/ReceiptDetail | detail | xml | Receive against a source document with tracking and inspection. | Shipment | crosscut §3.8 | app | parity | Shipment shipmentId |
| Receive | Warehouse/Receiving/Receive | task | xml | Capture the actual goods arriving on one shipment. | ShipmentItemSource; AssetReceipt | own | receive | parity | Shipment shipmentId; current item source |
| Putaway | Warehouse/Receiving/Putaway | task | xml | Move received or staged stock into an allowed destination. | Asset; ProductFacilityLocation | own | move | new | Asset assetId; selected source location |
| Supplier360 | Warehouse/Receiving/Supplier360 | 360 | xml | See supplier contacts and receiving performance. | Party | crosscut §3.3 | app | parity | Party partyId |
| Inspections | Warehouse/Inspection/Inspections | list | xml | Work the receiving, outgoing and returns quality queue. | Proposed inspection record | own | inspect | new | inspection rows; facility/source/status filters |
| QualityInspection | Warehouse/Inspection/QualityInspection | task | xml | Record evidence and disposition for warehouse quality gates. | Proposed inspection/readings | crosscut §3.19 | app | new | inspection identity and source |
| InspectionTemplates | Warehouse/Inspection/InspectionTemplates | settings | xml | Maintain reusable versioned inspection templates. | Proposed inspection template/version | crosscut §3.19 | quality manager | new | template identity |
| Availability | Warehouse/Inventory/Availability | list | xml | Inspect stock, reservations, incoming and projected supply. | Asset and existing summary views | crosscut §3.7 | app | parity | Product/facility/location/lot and asset selection |
| MaterialIssueReceipt | Warehouse/Inventory/MaterialIssueReceipt | task | xml | Receive ad hoc stock and issue/return materials with source links. | AssetReceipt; AssetIssuance | crosscut §3.9 | receive or issue | parity | WorkEffort/source identity and asset selection |
| Product360 | Warehouse/Inventory/Product360 | 360 | xml | Inspect product storage and inventory policy. | Product | crosscut §3.5 | app | parity | Product productId |
| Assets | Warehouse/Inventory/Assets | list | xml | Find individual stock assets and serialized units. | Asset | own | app | parity | Asset rows; facility/lot/serial filters |
| AssetDetail | Warehouse/Inventory/AssetDetail | detail | xml | Follow one stock asset through reservations and movement history. | Asset | own | app | parity | Asset assetId |
| Movements | Warehouse/Inventory/Movements | list | xml | Read the stock ledger with its original business documents. | AssetDetail | own | app | parity | AssetDetail rows; date/product/facility filters |
| Adjustments | Warehouse/Inventory/Adjustments | task | xml | Post a reviewed quantity correction with a reason. | PhysicalInventory; AssetDetail | own | adjust | parity | exact stock identity and source movement |
| Lots | Warehouse/Inventory/Lots | split | xml | Maintain lot metadata beside stock and expiry history. | Lot | own | app | parity | Lot lotId; lot filters |
| Containers | Warehouse/Inventory/Containers | list | xml | Find pallets, totes and storage containers. | Container | own | app | parity | Container rows; facility/location filters |
| ContainerDetail | Warehouse/Inventory/ContainerDetail | detail | xml | Manage handling-unit contents and atomic movement. | Container | own | move | parity | Container containerId |
| Traceability | Warehouse/Inventory/Traceability | report | xml | Trace a lot or serial from receipt through production and shipment. | AssetReceipt; AssetIssuance; AssetDetail | own | app | new | asset or lot identity; direction/depth filters |
| TraceabilityGraph | Warehouse/Inventory/TraceabilityGraph | report | qvue | Explore the same lineage visually. | Traceability service result | own | app | later | same root/filter context as Traceability |
| Counts | Warehouse/Counts/Counts | list | xml | Plan and resume physical, cycle and spot counts. | PhysicalInventory | own | count | parity | PhysicalInventory rows; facility/status filters |
| CountDetail | Warehouse/Counts/CountDetail | detail | xml | Fix the count scope and follow its lifecycle. | PhysicalInventory; PhysicalInventoryCount | own | count | parity | PhysicalInventory physicalInventoryId |
| CountEntry | Warehouse/Counts/CountEntry | task | xml | Enter observed counts without changing stock. | PhysicalInventoryCount | own | count | new | PhysicalInventory physicalInventoryId; count line |
| CountReview | Warehouse/Counts/CountReview | task | xml | Resolve variance and movement conflicts before posting. | PhysicalInventoryCount; AssetDetail | own | count reviewer; adjust for post | new | PhysicalInventory physicalInventoryId; selected count lines |
| Transfers | Warehouse/Transfers/Transfers | list | xml | Track goods moving between facilities. | Shipment (ShpTpTransfer) | own | app | parity | Shipment rows; origin/destination/status filters |
| TransferShipmentDetail | Warehouse/Transfers/TransferShipmentDetail | detail | xml | Execute both legs of a facility transfer. | Shipment | crosscut §3.8 | app | parity | Shipment shipmentId |
| Move | Warehouse/Transfers/Move | task | xml | Move stock between bins within an authorized facility. | Asset; Container | own | move | parity | asset/container and source/destination locations |
| StockRequests | Warehouse/Transfers/StockRequests | list | xml | Request internal materials and track their supply. | Request (RqtInventory) | own | app | new | Request rows; requesting/destination facility filters |
| RequestDetail | Warehouse/Transfers/RequestDetail | detail | xml | Approve and fulfill an internal inventory request. | Request | crosscut §3.11; design-projects §6 | app | new | Request requestId |
| SupplyPlanning | Warehouse/Transfers/SupplyPlanning | split | xml | Review transfer and pick-face shortage suggestions. | Requirement; proposed planning run | crosscut §3.20 | app | new | planning run; Requirement selection |
| Picklists | Warehouse/Picking/Picklists | list | xml | Find and assign shipment loads and waves. | WorkEffort (WepShipmentShip) | own | pick | parity | WorkEffort rows; facility/date/assignee filters |
| PicklistDetail | Warehouse/Picking/PicklistDetail | detail | xml | Manage one load, its shipments, people and equipment. | WorkEffort; Shipment | own | pick; supervisor for assignment | parity | WorkEffort workEffortId |
| CreatePicklists | Warehouse/Picking/CreatePicklists | wizard | xml | Preview and create waves from eligible approved orders. | OrderPart; WorkEffort | own | pick supervisor | parity | selected OrderPart rows; grouping filters |
| Pick | Warehouse/Picking/Pick | task | xml | Pick an assigned shipment load with visible shortfalls. | ShipmentItemSource | own | pick | parity | WorkEffort workEffortId; ShipmentItemSource identity |
| PickLocationMoves | Warehouse/Picking/PickLocationMoves | task | xml | Move allocated stock from bulk locations to the pick face. | AssetReservation; ProductFacilityLocation | own | move | parity | reserved asset rows; facility filter |
| Shipments | Warehouse/Shipping/Shipments | list | xml | Find outgoing sales and supplier-return shipments. | Shipment | own | app | parity | Shipment rows; outgoing find parameters |
| ShipmentDetail | Warehouse/Shipping/ShipmentDetail | detail | xml | Manage outbound quantities, packages and delivery. | Shipment | crosscut §3.8 | app | parity | Shipment shipmentId |
| Pack | Warehouse/Shipping/Pack | task | xml | Pack picked stock into boxes and reconcile its contents. | ShipmentPackage; ShipmentPackageContent | own | pack | parity | Shipment shipmentId; package sequence |
| Ship | Warehouse/Shipping/Ship | task | xml | Rate, label and dispatch validated packages. | Shipment; ShipmentRouteSegment | own | ship | parity | Shipment shipmentId; route segment |
| PackageTracking | Warehouse/Shipping/PackageTracking | list | xml | Monitor packages, exceptions and actual delivery. | ShipmentPackageRouteSeg | own | app | parity | package rows; ETA/status filters |
| DeliveryTrips | Warehouse/Shipping/DeliveryTrips | list | xml | Plan one vehicle run containing multiple shipments. | Delivery | own | dispatch | later | Delivery rows; date/vehicle filters |
| DeliveryTripDetail | Warehouse/Shipping/DeliveryTripDetail | detail | xml | Sequence stops and capture departure and delivery evidence. | Delivery; ShipmentRouteSegment | own | dispatch | later | Delivery deliveryId |
| OrderDetail | Warehouse/Orders/OrderDetail | detail | xml | Fulfill orders without changing commercial terms. | OrderHeader | crosscut §3.6 | app | parity | OrderHeader orderId; part sequence |
| InvoiceDetail | Warehouse/Records/InvoiceDetail | detail | xml | Read shipment-related invoices with financial permission. | Invoice | crosscut §3.16 | financial-read | parity | Invoice invoiceId; shipment/source context |
| Returns | Warehouse/Returns/Returns | list | xml | Find authorized customer and supplier returns requiring physical work. | ReturnHeader | own | app | parity | ReturnHeader rows; direction/facility/status filters |
| ReturnDetail | Warehouse/Returns/ReturnDetail | detail | xml | Handle return quantities, disposition and linked settlement. | ReturnHeader | crosscut §3.18 | app | parity | ReturnHeader returnId |
| ReturnReceipt | Warehouse/Returns/ReturnReceipt | detail | xml | Receive customer-return goods using the common receipt task. | Shipment | crosscut §3.8 | app | parity | Shipment shipmentId; returnId |
| SupplierReturnShipment | Warehouse/Returns/SupplierReturnShipment | detail | xml | Ship goods back to a supplier. | Shipment | crosscut §3.8 | app | parity | Shipment shipmentId; returnId |
| Facilities | Warehouse/Locations/Facilities | list | xml | Find warehouses and their storage hierarchy. | Facility | own | app | parity | Facility rows; owner/type filters |
| FacilityDetail | Warehouse/Locations/FacilityDetail | detail | xml | Configure storage locations, facility policies and tools. | Facility | crosscut §3.10 | app | parity | Facility facilityId |
| EquipmentDetail | Warehouse/Locations/EquipmentDetail | detail | xml | Inspect equipment assigned to warehouse work. | Asset | crosscut §3.10 | app | parity | Asset assetId |
| PutawayRules | Warehouse/Locations/PutawayRules | settings | xml | Resolve storage destinations and explain their selection. | ProductFacilityLocation; proposed putaway rule | own | facility admin | new | rule selection; facility filters |
| Capacity | Warehouse/Locations/Capacity | report | xml | See storage occupancy and constrained destinations. | FacilityLocation; Asset summaries | own | app | later | facility/location/storage-type filters |
| Carriers | Warehouse/Locations/Carriers | settings | xml | Maintain carrier methods and operational gateway bindings. | CarrierShipmentMethod; ShippingGatewayConfig | own | shipping manager | parity | carrier/method identity |
| BoxTypes | Warehouse/Locations/BoxTypes | settings | xml | Maintain parcel sizes and their facility/carrier use. | ShipmentBoxType; FacilityBoxType; CarrierShipmentBoxType | own | shipping manager | parity | box type and facility/carrier filters |
| Printers | Warehouse/Locations/Printers | settings | xml | Bind facility print purposes to available printers. | FacilityPrinter | own | facility admin | new | Facility facilityId; printer purpose |
| HandheldHome | Warehouse/Handheld/Home | task | xml | Start scanning work with an explicit facility and operator. | active facility and work selection | own | app | parity | facilityId; current assignment |
| HandheldReceive | Warehouse/Handheld/Receive | task | xml | Run receive with handheld controls. | Shipment | this file: Receive | receive | parity | same canonical record as Receiving/Receive |
| HandheldPutaway | Warehouse/Handheld/Putaway | task | xml | Run putaway with handheld controls. | Asset | this file: Putaway | move | new | same canonical record as Receiving/Putaway |
| HandheldPick | Warehouse/Handheld/Pick | task | xml | Run pick with handheld controls. | ShipmentItemSource | this file: Pick | pick | parity | same canonical record as Picking/Pick |
| HandheldPack | Warehouse/Handheld/Pack | task | xml | Run pack with handheld controls. | ShipmentPackage | this file: Pack | pack | parity | same canonical record as Shipping/Pack |
| HandheldMove | Warehouse/Handheld/Move | task | xml | Run move with handheld controls. | Asset | this file: Move | move | parity | same canonical record as Transfers/Move |
| Count | Warehouse/Handheld/Count | task | xml | Run count with handheld controls. | PhysicalInventoryCount | this file: CountEntry | count | new | same canonical record as Counts/CountEntry |
| Reports | Warehouse/Reports | landing | xml | Open operational reports with a common facility/date scope. | authorized report providers | own | app | new | facility/date filters |
| InventoryValuation | Warehouse/Reports/InventoryValuation | report | xml | Explain permitted stock value and ledger reconciliation. | cost/stock/ledger evidence | Accounting §10; crosscut §3.25 | financial reader; revaluation by finance capability | parity | organization/facility/product/as-of |
| CountVariance | Warehouse/Reports/CountVariance | report | xml | Analyze reviewed count variances and their posted corrections. | PhysicalInventoryCount; AssetDetail | own | count reviewer | new | count/facility/date/reason filters |
| OperationsHistory | Warehouse/Reports/OperationsHistory | report | xml | Analyze receiving, shipping, delivery and rejection history. | Shipment; AssetReceipt; AssetIssuance | own | app | parity | date/facility/operation/party filters |
| Settings | Warehouse/Settings | settings | xml | Find policy sections with their effective scope. | warehouse configuration | own | app; managers edit | new | organization/facility scope |
| StockPolicies | Warehouse/Settings/StockPolicies | settings | xml | Set effective warehouse operation and validation policy. | Facility; proposed warehouse policy | own | warehouse manager | new | organization/facility policy identity |
| ReservationPolicies | Warehouse/Settings/ReservationPolicies | settings | xml | Explain and edit reservation order/timing in facility and store contexts. | ProductStore; proposed facility fallback policy | own | warehouse manager | new | facility/store policy identity |
| AssetPools | Warehouse/Settings/AssetPools | settings | xml | Maintain stock pools shared by permitted parties and stores. | AssetPool; AssetPoolParty; AssetPoolStore | own | warehouse manager | parity | AssetPool assetPoolId |
| ExternalStockSync | Warehouse/Settings/ExternalStockSync | wizard | xml | Review external fulfillment-center inventory snapshots and errors. | proposed stock sync batch; existing stock records | own | integration operator | later | integration identity, external facility, batch identity |

## 3. Home

### Home

**Layout.** landing; operation cards first, exceptions and my work next, modest KPI strip last. Quantity KPIs are visible to operators; valuation requires financial-read authority.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| QueueFilters | find | Select the operating scope | facility, owner, my work, date horizon | facility selector | — | Shipping/dashboard FacilitySummary; Odoo Inventory Overview |
| OperationQueues | list, read | Open receiving, putaway, picking, packing, shipping, returns, transfers, counts and inspection queues | operation, ready, waiting, late, backorder | number cards; counters link to saved finds | entity aggregate queries | Shipping/dashboard FacilitySummary; Odoo operation cards |
| MyWork | list, read | Resume assigned work | document, step, due, assignee, exception | status display | entity | Carbon MES picking queue |
| ScanOrPack | single | Open a known shipment, asset or location | facility, scanned code | scan-input (proposed) | `mantle.facility.FacilityServices.get#ScannedIdGeneral` | Shipping/dashboard PackShipmentForm; BasicHandheld/dashboard ScanAssetForm |

**Actions.** Open queue is primary on each card. Quick create offers receipt, transfer, count and stock request only when the underlying create permission is present. No stock mutation occurs from a KPI.

**Devices.** phone; scan entry uses the handheld layout when mounted at Handheld/Home.

**Source.** research-warehouse §1, §12; Odoo `odoo/addons/stock/views/stock_picking_type_views.xml`; baseline Shipping/dashboard.

**Needs.** WH-SHELL, WH-SCAN

## 4. Receiving

### Receipts

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ReceiptFind | find | Find expected and incomplete receipts | supplier, facility, source type, date, status, overdue | saved finds | — | Shipment/FindShipment ShipmentList |
| ReceiptList | list, read | Inspect due quantities and receipt progress | shipment, source, supplier, expected, received, rejected, due | status and related-record links | entity | Shipment/FindShipment ShipmentList |
| NewReceipt | dialog | Create from a PO, transfer or return; allow authorized ad hoc receipt | source type, source ID, facility, expected date, external reference | server lookup | `mantle.shipment.ShipmentServices.create#Shipment`, `mantle.shipment.ShipmentServices.create#OrderPartShipment` | Shipment/FindShipment NewIncomingShipment; Carbon ReceiptForm |

**Actions.** Create opens ReceiptDetail. Receive selected opens a review of each independent shipment; it never silently assumes every expected line arrived.

**Navigation.** Supplier360 and Warehouse Orders/OrderDetail retain Warehouse context.

**Views.** list, board by status, calendar by expected receipt date; drag scheduling checks permission and never changes posting status.

**Source.** research-warehouse §2; Carbon `apps/erp/app/modules/inventory/ui/Receipts/ReceiptForm/ReceiptForm.tsx`; Shipment/FindShipment.

**Needs.** WH-POST

### ReceiptDetail (Context passed)

**Context passed.** Mount `Shared/ShipmentDetail` at `Warehouse/Receiving/ReceiptDetail`; `appRoot=Warehouse`. crosscut §3.8.

| Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- |
| Overview, Items and sources, Receipts, Tracking, Inspection, Files, Chatter | incoming to an authorized facility; purchase/transfer/sales-return type | receive, inspect, backorder/close remainder, print; edit draft header/parties; cancel unposted only | accepted/rejected quantities, source quantity remaining and lot/serial identity |

### Receive

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ReceiveSource | display | Fix the document and remaining quantity | shipment, source line, product, remaining, UOM | read-only context header | `mantle.shipment.ShipmentInfoServices.get#ShipmentDisplayInfo` | Shipment/ShipmentDetail ItemLimitForm |
| ReceiveLine | single | Record accepted and rejected quantities without losing source links | accepted, rejected, reason, lot, serial, expiry, destination, owner | scan-input; tracked-quantity breakdown | `mantle.shipment.ShipmentServices.receive#ShipmentProduct` through WH-POST guard | Shipment/ShipmentDetail/ReceiveItem ReceiveForm |
| AdHocReceipt | single | Receive stock without an order when explicitly authorized | product, quantity, UOM, owner, lot/serial, facility/location, reason, cost reference | scan-input; tracking breakdown | `mantle.product.AssetServices.receive#Asset` through WH-POST guard | Asset/Asset/FindSummary ReceiveAssetForm; BasicHandheld/ReceiveAsset ReceiveAssetForm |
| ReceiveRemaining | dialog | Review complete receipt or explicit short receipt | remaining source lines, actual quantities, close or backorder choice | summary and exception list | `mantle.shipment.ShipmentServices.receive#EntireShipment` only after per-line validation; proposed guarded close/backorder action | Odoo backorder confirmation; Carbon ReceiptPostModal |

**Actions.** Receive line posts one validated line atomically, then advances. Inspect opens the shared inspection with the source fixed. Finish offers Leave open, Create remaining receipt or Close remainder with authorized reason; only the quantities actually received are posted. Serial-tracked quantities require unique serials and a matching count.

**Navigation.** ReceiptDetail → Receive → Putaway; returned stock opens the same task with return eligibility fixed.

**States.** A duplicate/uncertain submission retrieves its operation result before another receipt. Failed rows remain editable; successful rows remain locked with receipt IDs. A rejected quantity does not become usable stock.

**Devices.** handheld and phone; one product, scan, quantities, destination and confirmation, with 48 px controls and persistent focus. Keyboard entry is equivalent in terminal.

**Source.** research-warehouse §2 and §12; Shipment/ShipmentDetail/ReceiveItem; Carbon `apps/erp/app/modules/inventory/ui/Receipts/ReceiptPostModal.tsx`.

**Needs.** WH-POST, WH-SCAN, WH-QUALITY, WH-POLICY

### Putaway

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| PutawayQueue | list, read | Find stock waiting in receiving/staging | source location, product, lot, container, quantity, age | scanable queue | entity | Odoo internal-transfer work queue |
| Destination | single | Resolve and confirm the storage destination | asset/container, quantity, source, suggested destination, actual destination, rule | scan-input; rule explanation | proposed `mantle.facility.PutawayServices.resolve#Destination`; `mantle.product.AssetServices.check#ScanLocation`, `mantle.product.AssetServices.move#Asset` through WH-POST guard | Asset/Asset/MoveAsset ScanMoveAssetForm and EnterMoveAssetForm; Odoo putaway rules |

**Actions.** Confirm move is primary. A non-suggested destination requires permitted capacity/storage conditions and a reason. Inspection-held stock may move within quarantine but cannot be released by a putaway action.

**Views.** queue list ordered by age and destination pick sequence.

**Devices.** handheld and phone; scan source then destination; quantity stays visible before confirmation.

**Source.** research-warehouse §3 and §11; Odoo `odoo/addons/stock/views/product_strategy_views.xml`; baseline Asset/Asset/MoveAsset.

**Needs.** WH-PUTAWAY, WH-POST, WH-SCAN, WH-QUALITY

### Supplier360 (Context passed)

**Context passed.** Mount `Shared/Supplier360` at `Warehouse/Receiving/Supplier360`; `appRoot=Warehouse`. crosscut §3.3.

| Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- |
| Contact, Purchase orders, Receipts, Rejections, Files, Chatter | supplier role; authorized organizations/facilities | contact changes with party-write; open receipt/inspection; purchasing and AP actions require corresponding rights | inbound quantities, lateness and rejection reasons |

## 5. Inspection

### Inspections

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| InspectionFind | find | Choose quality work | facility, source type, product, lot, assignee, due, status | saved finds | — | ERPNext Quality Inspection list |
| InspectionList | list, read | Show blocked quantity and next action | inspection, source, product, sample, outcome, held quantity, due | status/hold badge | entity over proposed shared quality records | Carbon InspectionsTable |

**Actions.** Open inspection or assign inspector. Bulk reassignment is per inspection with named results; bulk acceptance is unavailable because each result needs its own readings/disposition.

**Views.** list, board by inspection status; moving a card assigns work only, never accepts a lot.

**Source.** research-warehouse §4; ERPNext `erpnext/stock/doctype/quality_inspection/quality_inspection.json`; Carbon `apps/erp/app/modules/quality/ui/Inspections/InspectionsTable.tsx`.

**Needs.** WH-QUALITY

### QualityInspection (Context passed)

**Context passed.** Mount `Shared/QualityInspection` at `Warehouse/Inspection/QualityInspection`; `appRoot=Warehouse`. crosscut §3.19.

| Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- |
| Source, Template/readings, Samples, Evidence, Disposition, History | incoming/outgoing/returns for authorized facilities | save readings; submit; verify/accept/reject under separate roles; quarantine/release through stock guard | sample evidence and quantity by disposition |

### InspectionTemplates (Context passed)

**Context passed.** Mount `Shared/InspectionTemplates` at `Warehouse/Inspection/InspectionTemplates`; `appRoot=Warehouse`. crosscut §3.19.

| Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- |
| Templates, Characteristics, Sampling, Applicability, Revision history | organization; warehouse applicability shown without hiding Manufacturing reuse | create draft, revise, publish, retire; published revisions immutable | incoming and return checks shared with in-process/final inspection |

## 6. Inventory

### Availability (Context passed)

**Context passed.** Mount `Shared/InventoryAvailability` at `Warehouse/Inventory/Availability`; `appRoot=Warehouse`. crosscut §3.7.

| Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- |
| Quantities, Reservations, Incoming, Projected, Movements | authorized facility, owner and pool; current stock status visible | open Move, Adjustments, CountDetail, MaterialIssueReceipt and source documents under action permissions | on-hand distinct from reserved/available; holds and transit separated |

### MaterialIssueReceipt (Context passed)

**Context passed.** Mount `Shared/MaterialIssueReceipt` at `Warehouse/Inventory/MaterialIssueReceipt`;
`appRoot=Warehouse`; crosscut §3.9.

| Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- |
| Source, Material lines, Tracking, Posted issues/receipts, Unused returns, Files | authorized facility; work effort, shipment assembly or explicit ad hoc receipt purpose | issue/receive/return with stock authority; pick-assembly produce/consume using existing ManufacturingServices with its source fixed | physical quantity, lot/serial, stock UOM and source identity; financial postings follow Accounting policy |

### Product360 (Context passed)

**Context passed.** Mount `Shared/Product360` at `Warehouse/Inventory/Product360`; `appRoot=Warehouse`. crosscut §3.5.

| Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- |
| Summary, Identifications, Stock, Locations, Replenishment, Documents | stockable products; selected facility optional | edit ProductFacility and ProductFacilityLocation with facility-policy role; master edits require product-write | quantities, stock UOM, default pick locations and reorder levels |

### Assets

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| AssetFind | find | Find physical inventory identity | product, asset, serial, lot, owner, pool, facility, status | server lookup | — | Asset/Asset/FindAsset ListAssets |
| AssetList | list, read | Show one asset and its quantity/location | asset, product, serial, lot, status, quantity, location | status; link to AssetDetail | entity | Asset/Asset/FindAsset ListAssets |

**Actions.** Open AssetDetail; row Move and Count route to guarded tasks. Equipment opens EquipmentDetail when its type is equipment.

**Views.** list; group by product, lot, location or owner.

**Source.** research-warehouse §5 and §10; Asset/Asset/FindAsset.

### AssetDetail

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| AssetHeader | single | Edit non-posting asset metadata | asset, description, serial, lot, owner, pool, status, location | read-only quantity and cost | `mantle.product.AssetServices.get#AssetDisplayInfo`, `mantle.product.AssetServices.update#Asset` with metadata-only field allowlist | Asset/Asset/AssetDetail EditAsset |
| Reservations | list, read | Show allocation provenance | order, item, quantity, promised date, facility | source-document links | entity | Asset/Asset/AssetDetail ReservationsListForm |
| AssetLedger | list, read | Show quantity changes and correction links | effective date, source, delta, resulting quantity, user | source links | entity | Asset/Asset/AssetDetail AssetDetailList; DetailHistory AssetDetailList |
| AssetAudit | list, read | Show metadata changes | field, prior, new, user, time | audit display | entity | Asset/Asset/AssetDetail AuditLogList |

**Actions.** Move and Record adjustment lead to tasks. No direct edit of quantity, physical location, hold release, owner transfer or acquisition cost; each uses its guarded business action. Serial/lot changes after posting require a documented correction, not relabeling history.

**Navigation.** Traceability retains the same asset/lot. Accounting valuation and EquipmentDetail links require their permissions.

**Source.** research-warehouse §5, §10, §13; Asset/Asset/AssetDetail and DetailHistory.

**Needs.** WH-POST, WH-TRACE

### Movements

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| MovementFind | find | Select a ledger slice | date range, product, facility, lot, source type, variance reason | date-period; saved finds | — | Asset/Asset/DetailHistory AssetDetailList |
| MovementList | list, read | Explain every quantity change | effective date, asset, delta, receipt/issuance/count, user, reason | linked source and correction chain | entity | Asset/Asset/DetailHistory AssetDetailList; Carbon StockMovementsTable |

**Actions.** Export and open source; Correct opens Adjustments with the original movement fixed. Posted movements cannot be deleted.

**Views.** list; pivot/graph later under WH-REPORT; group by source type, product, location or day.

**Source.** research-warehouse §5 and §13; Carbon `apps/erp/app/modules/inventory/ui/StockMovements/StockMovementsTable.tsx`.

**Needs.** WH-TRACE, WH-REPORT

### Adjustments

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| AdjustmentScope | find | Select an exact stock bucket | product, facility, location, lot, owner, pool, status, asset/serial | explicit None versus Any selectors | `mantle.product.AssetServices.get#AssetDisplayInfo` when asset fixed | Asset/Asset/FindSummary PhysicalManualChange; PhysicalQuantity RecordQuantity |
| Adjustment | single | Enter a delta or absolute count and review its effect | mode, quantity, reason, date, comment, original movement | before/after summary; decimal UOM | `mantle.product.AssetServices.record#PhysicalInventoryQuantity`, `mantle.product.AssetServices.record#PhysicalInventoryChange` through WH-POST guard | PhysicalQuantity RecordQuantity; PhysicalChange RecordChange; Carbon correction modal |

**Actions.** Preview then confirm Post. Exact scope is required; blank location/lot means None unless the user explicitly chooses an aggregate authorized scope. Zero is a count, blank is no entry. Closed-period changes fail; negative changes respect facility policy and reservations. Backdated adjustments recalculate the historical scope and show the posting effect.

**States.** Concurrent movements invalidate the preview and require a fresh review; duplicate operation returns the original adjustment.

**Source.** research-warehouse §6; AssetServices existing immediate adjustment methods; baseline Asset/Asset/FindSummary.

**Needs.** WH-POST, WH-POLICY

### Lots

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| LotList | list, read | Find batches and near-expiry stock | lot number, manufacturer, manufactured, expires, quantity | split peek; expiry indicator | entity | Asset/EditLots LotList |
| LotMetadata | single | Create a lot or correct its metadata with history | manufacturer, lot number, manufactured date, expiration date, reason | date and audit display | entity for create; proposed audited lot-correction action for posted lots | Asset/EditLots CreateLot and LotList; Carbon EditExpiryModal |
| LotStock | list, read | Locate the lot and its holds | facility, location, asset, status, quantity | InventoryAvailability link | entity | Asset/Asset/FindAsset ListAssets |

**Actions.** Create, correct metadata and print label; expiry shortening immediately affects validation. Extending expiry requires a reason and quality-manager permission; it does not itself release quarantine.

**Navigation.** Traceability opens the lot; Product360 comes from the selected asset product because Lot itself has no productId.

**Source.** research-warehouse §10; Carbon `apps/erp/app/modules/inventory/ui/Traceability/EditExpiryModal.tsx`; active Lot in ProductAssetEntities.

**Needs.** WH-EXPIRY, WH-LABEL, WH-TRACE

### Containers

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ContainerList | list, read | Find handling units | container, serial, type, facility, location | scan lookup | entity | Asset/Container/FindContainer ContainerList |
| NewContainer | dialog | Create an empty handling unit | type, serial, facility, location, description | facility/location selector | entity | Asset/Container/FindContainer CreateContainerForm |

**Actions.** Create or open ContainerDetail; bulk print selected labels.

**Source.** research-warehouse §10–§12; Asset/Container/FindContainer.

**Needs.** WH-LABEL

### ContainerDetail

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ContainerHeader | single | Edit descriptive metadata | container ID, type, serial, description | location read-only | entity | Asset/Container/EditContainer UpdateContainerForm |
| ContainerContents | list, read | Inspect included stock | asset, product, lot/serial, owner, status, quantity | stock and trace links | entity | Asset/Container/EditContainer AssetListForm; MoveContainer AssetListForm |
| AddOrRemoveAsset | dialog | Attach/detach compatible stock without moving it | container, asset, quantity, current location | scan-input | proposed validated content action; `mantle.shipment.ShipmentServices.pickMove#ProductToContainer` for a pick movement | Asset/Container/EditContainer AddAssetForm and PickScanForm |
| MoveContainer | dialog | Move all contents together | container, source, target facility/location, reason | scan-input; contents preview | proposed container-move wrapper over `mantle.product.AssetServices.move#Asset` | Asset/Container/MoveContainer ScanMoveContainerForm and EnterMoveContainerForm |

**Actions.** Move validates every content line then commits the whole container move atomically. Incompatible owners/statuses/capacity reject the move; independently selected containers return separate results. Container attachment never silently changes physical location. Outbound boxes remain ShipmentPackage records.

**Source.** research-warehouse §3 and §10; Asset/Container/EditContainer and MoveContainer; metasfresh HU move workflow.

**Needs.** WH-POST, WH-SCAN, WH-PUTAWAY, WH-LABEL

### Traceability

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| TraceFind | find | Choose the lineage root and direction | asset, lot, shipment, work effort, direction, depth | server lookup | — | Odoo traceability report |
| TraceLines | list, read | Read linked movements and transformation edges | date, event, source, product, lot/serial, quantity, linked event | tree view with cycle-safe expansion | proposed `mantle.product.TraceabilityServices.get#Traceability` | Odoo traceability walk; Carbon lineage table |

**Actions.** Expand upstream/downstream, export visible lineage, open permitted source. A missing link displays Unknown provenance and its known movement rather than inventing a lineage.

**Views.** flat list and tree; nodes are paginated with cycle/back-edge markers. Financial columns omitted without valuation permission.

**Source.** research-warehouse §10 and §13; Odoo `odoo/addons/stock/report/stock_traceability.py`; current asset receipt/issuance/detail links.

**Needs.** WH-TRACE

### TraceabilityGraph

**Layout.** qvue; toolbar above the lineage canvas, selected-node details beside it. No posting controls.

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| GraphControls | component | Choose direction/depth and isolate a branch | root, direction, depth, search, layout | graph toolbar; standard m-* inputs | proposed `mantle.product.TraceabilityServices.get#Traceability` | Carbon GraphToolbar |
| LineageGraph | component | Display events and quantity-bearing edges | event, source, product, quantity, disposition, linked edge | graph with accessible table toggle | same query as Traceability | Carbon TraceabilityGraph |

**Actions.** Select, expand, fit and open source. Graph and table share the same bounded query.

**Devices.** Terminal twin renders the Traceability tree and node details through the same transitions; browser graph layout has no independent business meaning.

**Source.** research-warehouse §10; Carbon `apps/erp/app/modules/inventory/ui/Traceability/GraphToolbar.tsx`.

**Needs.** WH-TRACE, WH-GRAPH

## 7. Counts

### Counts

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| CountFind | find | Find counts and assigned work | facility, assignee, status, date, mode | saved finds | — | Asset/PhysicalInventory/FindPhysicalInventory PhysicalInventoryList |
| CountList | list, read | See progress and named posting failures | count, facility, mode, status, counted/total, due, assignee | status/progress | entity | FindPhysicalInventory PhysicalInventoryList |
| NewCount | dialog | Create a scoped counting document | facility, location scope, products, mode, blind, assignee, planned date, comments | scope preview | proposed `mantle.product.InventoryCountServices.create#Count` | Carbon InventoryCountForm |

**Actions.** Create opens CountDetail. Clone creates a new scope without copying counted quantities or posted results.

**Views.** list, calendar by planned date.

**Source.** research-warehouse §6; Carbon `apps/erp/app/modules/inventory/ui/InventoryCount/InventoryCountForm.tsx`.

**Needs.** WH-COUNT

### CountDetail

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| CountHeader | single | Manage scope and assignments before counting | facility, scope, mode, blind, assignee, planned date, comments | status-bar | proposed InventoryCountServices update/start actions; existing `mantle.product.AssetServices.update#PhysicalInventoryDate` restricted to authorized legacy corrections | EditPhysicalInventory UpdateMasterEntityValue; Carbon InventoryCount |
| CountProgress | list, read | Show line completion without leaking blind quantities | location, product, lot/serial, counter, counted state, result | role-filtered columns | entity through proposed count read service | Carbon InventoryCountLines |
| PostedAdjustments | list, read | Show exactly what this count posted | line, variance, reason, posting result, AssetDetail link | result and retry links | entity | EditPhysicalInventory AssetDetailList |

**Actions.** Start snapshots scope and expected quantities then enters PIInProgress. Submit locks count entries and moves to PIInValidation; reviewer may request recount (back to progress with history). Post belongs to CountReview. PIComplete requires every in-scope line posted, zero-variance confirmed or explicitly skipped with reason; an unresolved failed line prevents completion.

**States.** Blind counters receive neither expected quantities nor variance/derived filters from the server until authorized review. Reviewed/posted scope is immutable.

**Source.** research-warehouse §6; active PIInPlanning, PIInProgress, PIInValidation, PIComplete; Carbon count lifecycle.

**Needs.** WH-COUNT, WH-POST

### CountEntry

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| CountLineFind | find | Select a scoped location or scanned item | location, product, lot/serial, scanned code, remaining-only | scan-input | `mantle.facility.FacilityServices.get#ScannedIdGeneral` | BasicHandheld/SelectAsset ScanAssetForm; Carbon count lines |
| CountEntryForm | single | Save the observation and counting time | line ID, observed quantity, stock UOM, count time, comment, scan identity | blank versus explicit zero; decimal quantity | proposed `mantle.product.InventoryCountServices.record#CountLine` | Carbon InventoryCountLines; Dolibarr inventory scanning |
| CountEntryList | list, editable rows | Enter several observed rows on desktop | identity, observed quantity, count time, counted/skipped, comment | blind-aware editable cells | proposed `mantle.product.InventoryCountServices.record#CountLine` | Carbon InventoryCountLines |

**Actions.** Save count never calls record#PhysicalInventoryQuantity. Skip requires a reason; unexpected stock creates a reviewed extra scope line with exact identity, not a silent widening of the aggregate. Repeated scans increment only when scan-quantity mode is explicitly enabled.

**Devices.** handheld and phone; one line with next/previous and scan, optional desktop grid. Reconnected clients reload accepted observations and do not replay increments blindly.

**Source.** research-warehouse §6 and §12; Carbon InventoryCountLines; existing PhysicalInventoryCount fields.

**Needs.** WH-COUNT, WH-SCAN

### CountReview

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| VarianceReview | list, read | Compare snapshot, count-time balance and current stock | snapshot, observed, counted at, intervening delta, approved variance, reason, result | conflict badges; source movements | proposed `mantle.product.InventoryCountServices.review#Count` | Odoo stock_inventory_conflict; Carbon InventoryCountConfirmModal |
| ResolveConflict | dialog | Choose how to reconcile stock movement during counting | line, reviewed movements, recount/carry variance, reason, reviewer | movement detail with quantity/UOM | proposed InventoryCountServices resolve action | Odoo stock_inventory_conflict |
| PostCount | list, bulk | Apply approved independent line variances | line IDs, reason, effective date, operation ID, reviewed version | posting preview and named result list | proposed `mantle.product.InventoryCountServices.post#Count` | Carbon InventoryCount post; existing immediate variance service behind the guard |

**Actions.** Default conflict action is Recount. A reviewer may carry the observed variance forward after examining all intervening movements; never overwrite current quantity with a stale absolute count. Post requires confirmation and rechecks each reviewed version under lock. Each disjoint stock bucket commits atomically; failed lines name the identity and continue with other independent buckets. Retry skips the recorded successes.

**States.** Blank lines stay uncounted. Conflicts and financial-period errors block their affected line. Different count lines targeting the same stock bucket are reconciled as one dependent group to prevent double adjustment.

**Source.** research-warehouse §6; Odoo `odoo/addons/stock/wizard/stock_inventory_conflict.xml`; Carbon `apps/erp/app/modules/inventory/ui/InventoryCount/InventoryCountConfirmModal.tsx`.

**Needs.** WH-COUNT, WH-POST

## 8. Transfers and requests

### Transfers

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| TransferList | list, read | See outstanding ship and receipt steps | shipment, origin, destination, shipped, received, due, status | two-leg progress | entity | Shipment/FindShipment ShipmentList |
| NewTransfer | dialog | Create the facility transfer and source lines | origin, destination, products, quantities, dates, reference | authorized facility selectors | `mantle.shipment.ShipmentServices.create#Shipment` with ShpTpTransfer | Shipment/FindShipment NewTransferShipment |

**Actions.** Create → TransferShipmentDetail. Shipment and receipt are separate physical events; in-transit quantity is not counted as usable at the destination.

**Source.** research-warehouse §3; Carbon WarehouseTransferHeader; baseline Shipment/FindShipment.

**Needs.** WH-POST

### TransferShipmentDetail (Context passed)

**Context passed.** Mount `Shared/ShipmentDetail` at `Warehouse/Transfers/TransferShipmentDetail`; `appRoot=Warehouse`. crosscut §3.8.

| Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- |
| Overview, Items, Origin pick/ship, Transit, Destination receive, Files, Chatter | ShpTpTransfer; explicit origin and destination facilities | reserve/pick/ship at origin; receive/inspect/putaway at destination; cancel only remaining unposted quantity | in-transit quantities and partial receipts |

### Move

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| MoveSelect | find | Scan or find exact stock | facility, scan, location, container, product, asset | scan-input | `mantle.facility.FacilityServices.get#ScannedIdGeneral`, `mantle.product.AssetServices.check#ScanLocation` | Asset/Asset/SelectAsset ScanAssetForm, SelectAssetForm and SelectLocationForm |
| MoveContents | list, read | Choose compatible stock and quantity | asset, product, lot/serial, owner, status, reserved, available | quantity and source emphasis | entity | Asset/Asset/SelectAsset ContainerAssetList, LocationAssetList and ProductNoLocAssetList |
| MoveConfirm | single | Validate and post the move | source, destination, asset/container, quantity, reason | scan-input; before/after summary | `mantle.product.AssetServices.move#Asset`, `mantle.product.AssetServices.move#Product` through WH-POST guard | Asset/Asset/MoveAsset ScanMoveAssetForm and EnterMoveAssetForm |
| RecentMoves | list, read | Confirm posted work and safe retry result | time, stock identity, from, to, quantity, operation result | result link | entity | Asset/Asset/SelectAsset RecentMoveForm and RecentContainerMoveForm |

**Actions.** Confirm move; product-level moves show the selected asset allocation first. Cross-facility movement opens Transfers rather than changing location in place. Moving reserved stock preserves reservation links or rejects the move.

**Devices.** handheld and phone; the same task is mounted under Handheld/Move.

**Source.** research-warehouse §3 and §12; baseline Asset/Asset/SelectAsset and MoveAsset.

**Needs.** WH-POST, WH-SCAN, WH-PUTAWAY

### StockRequests

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| StockRequestFind | find | Find open requests and shortages | requester, destination, due, product, status | saved finds | — | Projects Requests; ERPNext Material Request |
| StockRequestList | list, read | Show requested, approved and supplied quantities | request, requester, destination, due, fulfillment progress | linked supply documents | entity | Projects Requests; ERPNext Material Request |
| NewStockRequest | dialog | Create an internal stock request | requester, destination facility, required date, description | request item editor in RequestDetail | `mantle.request.RequestServices.create#Request`; proposed stock-context validation | Projects RequestIntake; ERPNext Material Request |

**Actions.** Create opens RequestDetail. Approval creates or links a Requirement with provenance; it does not duplicate a purchase request or directly move stock.

**Source.** research-warehouse §15 and §17; implemented Shared/RequestDetail and RequestRecord.

**Needs.** WH-REQUEST, WH-PLAN

### RequestDetail (Context passed)

**Context passed.** Mount `Shared/RequestDetail` at `Warehouse/Transfers/RequestDetail`; `appRoot=Warehouse`. crosscut §3.11; design-projects §6.

| Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- |
| Overview, Items, Supply, Conversation, Work, Files | RqtInventory; requester and destination facilities | edit/submit; approve under stock authority; allocate/transfer; create linked buy/make requirement; cancel unfulfilled remainder | requested versus supplied quantities without duplicate demand |

### SupplyPlanning (Context passed)

**Context passed.** Mount `Shared/SupplyPlanning` at `Warehouse/Transfers/SupplyPlanning`; `appRoot=Warehouse`. crosscut §3.20.

| Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- |
| Demand, Available/open supply, Suggestions, Conversion results | authorized facility; transfer and inventory-request demand emphasized | recalculate; convert authorized transfer suggestions; route buys/makes through the same requirement | one net-needs result shared with Purchasing and Manufacturing |

## 9. Picking

### Picklists

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| PicklistList | list, read | Show wave progress and exceptions | load, facility, assignee, due, shipments, picked, short, status | progress and status | entity | Shipping/Picklist/FindPicklist PicklistList |
| NewPicklist | dialog | Create a manual shipment load | facility, name, scheduled date, assignees, equipment | party/equipment lookup | `mantle.work.ShipmentWorkServices.create#ShipmentLoadShip` | Shipping/Picklist/FindPicklist NewPicklist |

**Actions.** Create manual load or open CreatePicklists for a bulk preview. Selecting a wave does not itself reserve stock.

**Views.** list, board by work status, calendar by estimated start date.

**Source.** research-warehouse §7; Shipping/Picklist/FindPicklist.

**Needs.** WH-PICK

### PicklistDetail

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| LoadHeader | single | Schedule and describe the load | name, start, end, facility, status | status-bar | entity for draft metadata; `mantle.work.ShipmentWorkServices.set#ShipmentLoadStatusFromShipments` | Shipping/Picklist/PicklistDetail UpdateShipmentLoad |
| LoadShipments | list, editable rows | Assign shipments and staging bins | shipment, bin, carrier, due, quantity, readiness | order and shipment links | `mantle.work.ShipmentWorkServices.add#ShipmentToShipmentLoad`, `mantle.work.ShipmentWorkServices.add#OrderPartToShipmentLoad`; validated detach | PicklistDetail ListShipments; AddOrder AddOrderList; AddShipment AddShipmentList |
| LoadPeople | list, editable rows | Assign operators and supervisors | party, role, from, thru, assignment status | server party lookup | entity WorkEffortParty | PicklistDetail AddPartyAssignForm and UpdateAssignForm |
| LoadEquipment | list, editable rows | Assign carts and equipment | asset, from, thru, status | equipment availability lookup | entity WorkEffortAssetAssign | PicklistDetail AddAsset and UpdateAssetAssign |
| LoadCompletion | dialog | Review incomplete shipments before finishing | picked, short, remaining, acknowledged reasons | explicit outstanding list | `mantle.work.ShipmentWorkServices.complete#ShipmentLoadShip`, `mantle.work.ShipmentWorkServices.close#ShipmentLoadShip` with WH-PICK guard | PicklistDetail complete/close; Carbon PickingListHeader |

**Actions.** Start picking opens Pick; Complete validates all member results and requires acknowledgement of unresolved material. Close does not ship or invoice documents. Print pick sheet or combined pick/pack sheets.

**Navigation.** EquipmentDetail for assigned equipment; ShipmentDetail for any member.

**Source.** research-warehouse §7; Shipping/Picklist/PicklistDetail; ShipmentWorkServices.

**Needs.** WH-PICK, WH-POST

### CreatePicklists

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| LoadSelection | wizard step | Find ready order parts | facility, carrier, method, due, priority, shipment status | saved find with availability | `mantle.work.ShipmentWorkServices.make#ShipmentLoadOrderConditions` | Shipping/Picklist/BulkPicklist CreatePicklistsForm and AddOrderList |
| LoadPreview | wizard step | Review grouping and exclusions | group, orders, items, planned bins, shortfall, assignee | proposed read-only plan preview | proposed preview action over existing selection/grouping logic | Odoo batch transfer wizard |
| LoadCreate | wizard step | Create independent load groups and report results | selected groups, parameters, operation identity | result collection | `mantle.work.ShipmentWorkServices.create#ShipmentLoadsForOrders` extended to per-group results and retry identity | Shipping/Picklist/BulkPicklist CreatePicklistsForm |

**Actions.** Preview → Create; each group names successes/failures and continues when independent. Revalidate order eligibility and reservations before creation. Automatic recurring wave rules remain later under WH-WAVE.

**Source.** research-warehouse §7; Odoo `odoo/addons/stock/wizard/stock_picking_to_batch_views.xml`; baseline BulkPicklist.

**Needs.** WH-PICK, WH-POST, WH-WAVE

### Pick

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| PickLines | list, read | Order pick work by location and bin | product, source location, destination bin/container, to pick, picked, short, lot | progress; exact reservation identity | `mantle.shipment.ShipmentInfoServices.get#ShipmentLoadPickInfo` | Shipping/Picklist/ShipmentLoadPick; Carbon PickingListLines |
| PickScan | single | Validate location and product/lot then move picked stock | scan, source location, shipment source, quantity, container, lot/serial | scan-input; tracked selector | `mantle.shipment.ShipmentServices.get#ShipmentProductByScan`, `mantle.shipment.ShipmentServices.pickMove#ShipmentProduct` through WH-POST guard | Shipment/ShipmentDetail PickScanForm |
| ShortPick | dialog | Record a short pick without inventing a stock correction | source line, missing quantity, reason, disposition, recount request | reason selector | proposed `mantle.shipment.WarehouseTaskServices.record#ShortPick` | Carbon ShortPickModal |
| FinishPick | dialog | Acknowledge incomplete material and release the next step | remaining sources, shortages, backorder decision, comments | quantity reconciliation | proposed guarded finish action around ShipmentWorkServices completion | Carbon PickingListHeader |

**Actions.** Pick is primary; Unpick reverses only unshipped pick movement and restores the same allocation. Short does not decrement on-hand: it creates an exception/recount. Reallocation or a separately reviewed adjustment resolves the mismatch. Substitution requires an authorized source-order change; scanner input cannot change the product.

**Devices.** handheld and phone; no desktop table required, one line with Pick/Short/Next and persistent quantity remaining.

**Source.** research-warehouse §7 and §12; Carbon `apps/erp/app/modules/inventory/ui/PickingLists/PickingListLines.tsx` and `ShortPickModal.tsx`.

**Needs.** WH-PICK, WH-POST, WH-SCAN, WH-EXPIRY

### PickLocationMoves

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| PickFaceNeeds | list, read | Show reservations outside pick locations | product, reservation, source, destination, current pick stock, move quantity | shortage and target location | entity; `mantle.product.AssetServices.get#AvailableInventoryMulti` | Shipping/PickLocationMoves PickMoveList |
| QuickPickMove | single | Move selected reserved stock to a valid pick location | reservation, asset, quantity, source, destination scan | scan-input | `mantle.product.AssetServices.move#ReservationsFromNonPickLocations`; `mantle.product.AssetServices.check#ScanLocation` | Shipping/PickLocationMoves/QuickMove ScanMoveAssetForm |

**Actions.** Preview allocations then Move; manual per-line moves use the same stock guard. The original reservation survives the move and capacity/expiry checks still apply.

**Devices.** handheld and phone.

**Source.** research-warehouse §7; Shipping/PickLocationMoves and QuickMove.

**Needs.** WH-POST, WH-PUTAWAY, WH-SCAN

## 10. Packing and shipping

### Shipments

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ShipmentFind | find | Find ready, late and incomplete shipments | facility, customer/supplier, carrier, date, status, backorder | saved finds | — | Shipment/FindShipment ShipmentList |
| ShipmentList | list, read | Show fulfillment readiness | shipment, source, party, scheduled, picked, packed, shipped, exception | status and progress | entity | Shipment/FindShipment ShipmentList |
| NewOutgoing | dialog | Create from an order part or authorized standalone source | source, origin facility, destination, method, date | source-document lookup | `mantle.shipment.ShipmentServices.create#OrderPartShipment`, `mantle.shipment.ShipmentServices.create#Shipment` | Shipment/FindShipment NewOutgoingShipment |

**Actions.** Open ShipmentDetail; Pack and Ship route to their task after eligibility checks. Bulk actions return per-shipment results.

**Views.** list, board by status, calendar by estimated ship date.

**Source.** research-warehouse §7–§8; Shipment/FindShipment.

**Needs.** WH-POST

### ShipmentDetail (Context passed)

**Context passed.** Mount `Shared/ShipmentDetail` at `Warehouse/Shipping/ShipmentDetail`; `appRoot=Warehouse`. crosscut §3.8.

| Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- |
| Overview, Items/sources, Reservations, Packages, Routes/tracking, Returns, Files, Chatter | outgoing shipment from authorized facility | reserve, pick, pack, ship, deliver, return, labels and print; metadata/parties before posting; quantities under guards | physical progress and source eligibility; payments only with financial-read |

### Pack

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| PackScan | single | Add the scanned product to the active package | shipment, product/lot/serial scan, quantity, package | scan-input; running quantity | `mantle.shipment.ShipmentServices.pack#ShipmentProductScan`, `mantle.shipment.ShipmentServices.pack#ShipmentProduct`, `mantle.shipment.ShipmentServices.pack#ShipmentItemSource` through WH-POST guard | Shipment/ShipmentDetail PackScanForm; Shipping/PackShipment/PackItems PackItemForm |
| PackageEditor | single | Set dimensions, weight and box type | package sequence, box type, weight, UOM, route segment | scale/manual weight input | `mantle.shipment.ShipmentServices.create#ShipmentPackage`, `mantle.shipment.ShipmentServices.update#ShipmentPackageAndRouteSeg`, `mantle.shipment.ShipmentServices.get#ShipmentPackageWeight` | ShipmentPackages UpdatePackageForm; PackSummary ClosePackageForm |
| PackageContents | list, editable rows | Review and correct unshipped contents | product, lot/serial, source, quantity, package | unpack confirmation | `mantle.shipment.ShipmentServices.add#ItemToPackage`, `mantle.shipment.ShipmentServices.update#ShipmentPackageContent`, `mantle.shipment.ShipmentServices.unpack#ShipmentItemIssuance` | ShipmentItems AddItemToPackageForm; ShipmentPackages ShipmentPackageContentList |
| PackOptions | dialog | Create package suggestions or reset an unshipped package | box rules, source lines, remaining quantity, package | preview before changing contents | `mantle.shipment.ShipmentServices.create#ShipmentAutoPackages`, `mantle.shipment.ShipmentServices.reset#ShipmentPackage`, `mantle.shipment.ShipmentServices.delete#ShipmentPackage` | ShipmentPackages PackageOptionsForm; Shipping/PackShipment/PackItems ItemsOptionsForm |
| PackAssembly | dialog | Pack a pick assembly and reconcile unused components | shipment source, assembly product, output quantity, component quantities, unused disposition | component reconciliation | `mantle.shipment.ShipmentServices.pack#ShipmentAssemblyComponent`; `mantle.work.ManufacturingServices.produce#AvailableAssemblies` through shared MaterialIssueReceipt | ShipmentDetail ProduceAssembliesForm; ShipmentItems PackComponentsForm, PaComponentPackForm and AssemblyPackUnusedComponents |
| CompletePack | dialog | Check packed quantities and release shipment to shipping | picked, packed, remaining, packages, shortfall decision | reconciliation summary | `mantle.shipment.ShipmentServices.complete#ShipmentPack` | Shipping/PackShipment/PackSummary/PackCompleted PackCompletedForm |

**Actions.** Pack scan is primary during packing; Close package then Complete pack. A completed package can be reopened before shipment with audit. Pick assemblies preserve their component/output links through shared MaterialIssueReceipt; unused components are returned or packed by the existing assembly action, not discarded. ShipmentPackage does not become a nested storage Container.

**Devices.** handheld and phone; scan, active package and quantity panel; desktop adds the contents grid.

**Source.** research-warehouse §8; baseline ShipmentItems, ShipmentPackages, Shipping/PackShipment/PackItems, PackPackages, PackSummary and PackCompleted.

**Needs.** WH-POST, WH-SCAN, WH-LABEL, WH-EXPIRY

### Ship

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ShipmentAddress | display | Confirm source/destination and carrier-ready address | addresses, contacts, incoterm, method, requested date | validation result | `mantle.shipment.CarrierServices.validate#PostalAddress`; `mantle.shipment.ShipmentInfoServices.get#ShipmentContactInfo` | ShipmentDetail EditShipment; Odoo carrier integration |
| RateOptions | list, read | Compare permitted methods and estimates | carrier, method, service, rate, currency, ETA | selectable rate list | proposed `mantle.shipment.WarehouseTaskServices.get#ShipmentRates`, `mantle.shipment.CarrierServices.get#ShippingRate` | Odoo delivery carrier; existing CarrierServices |
| Labels | list, bulk | Request, print, track or refund package labels | package, gateway state, tracking, label, charge, result | per-package status and preview | `mantle.shipment.CarrierServices.request#ShipmentLabels`, `mantle.shipment.CarrierServices.track#ShipmentLabels`, `mantle.shipment.CarrierServices.refund#ShipmentLabels`, `mantle.shipment.ShipmentServices.print#ShipmentLabels` | ShipmentPackages PrintAllShipmentLabels, RequestRetLabel and PrintShipmentLabel |
| ShipConfirm | single | Post dispatch only after final stock and tracking checks | packages, quantities, actual ship time, carrier, operation identity | final validation summary | `mantle.shipment.ShipmentServices.ship#Shipment` through WH-POST guard | ShipmentPackages SetShippedForm; PackSummary SetShippedForm |

**Actions.** Get rates, choose method, request labels, then Ship; requesting a label does not imply shipment. Provider calls run with durable request identity outside the stock transaction; timeout queries provider state before purchase retry. A per-package label failure does not duplicate successful labels, and blocks dispatch where required. Refund label does not reverse physical shipment. Dispatch requires tracking totals, inspection release and unexpired eligible lots.

**Navigation.** ShipmentDetail and PackageTracking; planned trip through DeliveryTripDetail.

**Devices.** phone; desktop/tablet recommended for rate comparison. Terminal retains full rate/label state and printable-file links.

**Source.** research-warehouse §8; Carbon ShipmentPostModal; existing CarrierServices gateway interface.

**Needs.** WH-POST, WH-LABEL, WH-EXPIRY

### PackageTracking

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| TrackingFind | find | Find due and exceptional packages | facility, carrier, tracking code, ETA, shipment, status | saved finds | — | Shipment/PackageTracking EtaPackageList |
| TrackingList | list, read | Show tracking events and label state | shipment, package, tracking, ETA, latest event, delivered | external tracking link | entity; `mantle.shipment.CarrierServices.track#ShipmentLabels` for explicit refresh | Shipment/PackageTracking EtaPackageList |
| RecordDelivery | dialog | Record permitted manual proof when no carrier event exists | shipment, package, delivered time, recipient, evidence, reason | evidence/file link | `mantle.shipment.ShipmentServices.deliver#Shipment`; proposed per-package proof action | ShipmentItems SetDeliveredForm; ERPNext Delivery Trip |

**Actions.** Refresh selected packages with per-shipment results; record delivery requires ship role and evidence. Tracking reads never silently invoke re-shipment.

**Source.** research-warehouse §8 and §13; Shipment/PackageTracking.

**Needs.** WH-LABEL, WH-POST

### DeliveryTrips

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| TripList | list, read | Find planned and active delivery runs | delivery, vehicle, driver, origin, departure, stops, progress | calendar date selector | entity | ERPNext Delivery Trip list |
| NewTrip | dialog | Create a run with its vehicle and source facility | vehicle, driver, departure, origin, reference | resource availability lookup | proposed `mantle.shipment.DeliveryServices.create#DeliveryTrip` | ERPNext Delivery Trip |

**Actions.** Create → DeliveryTripDetail; assignment does not dispatch its shipments.

**Views.** list and calendar by departure.

**Source.** research-warehouse §8; ERPNext `erpnext/stock/doctype/delivery_trip/delivery_trip.json`; active Delivery/ShipmentRouteSegment.deliveryId.

**Needs.** WH-TRIP

### DeliveryTripDetail

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| TripHeader | single | Maintain vehicle/run information | vehicle, driver, origin, start/end time, mileage, fuel | availability lookup | entity Delivery; proposed trip services | ERPNext Delivery Trip |
| TripStops | list, editable rows | Sequence shipments with load and proof state | sequence, shipment, address, quantity, estimated/actual arrival, evidence | reorder; shipment link | proposed `mantle.shipment.DeliveryServices.update#TripStop` | ERPNext delivery_stop |
| TripFinish | dialog | Reconcile delivered and undelivered stops | delivered, refused, return-to-depot, final mileage, comments | exception summary | proposed `mantle.shipment.DeliveryServices.complete#DeliveryTrip` | ERPNext Delivery Trip actions |

**Actions.** Release plan, start trip, record stop, finish. Each delivery updates its own shipment atomically; one refused stop does not roll back other completed stops. Route optimization and customer ETA messages are later optional actions on the same stop list.

**Devices.** phone for stop proof; terminal list retains all state and actions.

**Source.** research-warehouse §8; ERPNext delivery_trip and delivery_stop; existing Delivery fields.

**Needs.** WH-TRIP, WH-POST

### OrderDetail (Context passed)

**Context passed.** Mount `Shared/OrderDetail` at `Warehouse/Orders/OrderDetail`; `appRoot=Warehouse`. crosscut §3.6.

| Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- |
| Overview, Items, Availability, Shipments, Returns, Files, Chatter | eligible sales/purchase parts involving authorized facilities | reserve; create/add shipment; pick/pack/ship through tasks; open existing returns; commercial edits require order role | source-line outstanding and shipment progress |

### InvoiceDetail (Context passed)

**Context passed.** Mount `Shared/InvoiceDetail` at `Warehouse/Records/InvoiceDetail`; `appRoot=Warehouse`;
crosscut §3.16. This hidden mount is reached from ShipmentDetail/ReturnDetail financial links, so a permitted
Warehouse user need not open the Accounting app just to inspect the linked document.

| Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- |
| Header, Source lines, Receipts/shipments, Posting status; amounts/payments only with financial-read | invoice linked to an authorized shipment/return; organization and financial visibility revalidated | read and permitted print/export; no approval, posting, payment, credit or refund in the Warehouse context | invoice provenance and physical quantity reconciliation; financial mutations use an explicitly authorized specialist context |

## 11. Returns

### Returns

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ReturnFind | find | Find returned goods and pending receipts | return, customer/supplier, direction, source order, facility, status | saved finds | — | Return/FindReturn ReturnHeaderList |
| ReturnList | list, read | Show authorization and physical/financial progress separately | return, source, party, authorized, received/shipped, credited, disposition | separate progress badges | entity | Return/FindReturn ReturnHeaderList |
| NewReturn | dialog | Record a proposed return when Warehouse is the intake desk | direction, source order, party, reason, expected date | returnable-item lookup | `mantle.order.ReturnServices.create#Return`, `mantle.order.ReturnServices.create#ReturnFromOrder` | Return/FindReturn CreateReturn and CreateSupplierReturn |

**Actions.** Create opens ReturnDetail; authorization remains a separate permission. Receive only approved eligible lines; unexpected or unapproved goods may be physically quarantined through an authorized ad hoc receipt linked to a Request case, never falsely treated as authorized return receipt.

**Source.** research-warehouse §9; Return/FindReturn.

**Needs.** WH-RETURN, WH-QUALITY, WH-POST

### ReturnDetail (Context passed)

**Context passed.** Mount `Shared/ReturnDetail` at `Warehouse/Returns/ReturnDetail`; `appRoot=Warehouse`. crosscut §3.18.

| Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- |
| Overview, Eligible items, Shipments/receipts, Inspection/disposition, Financial progress, Files, Chatter | customer or supplier return; authorized organization | create return shipment; receive/dispose or pick/ship supplier return; authorization/credit require their separate rights | actual arrived/shipped stock and reasons; financial values permission-filtered |

### ReturnReceipt (Context passed)

**Context passed.** Mount `Shared/ShipmentDetail` at `Warehouse/Returns/ReturnReceipt`; `appRoot=Warehouse`. crosscut §3.8.

| Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- |
| Overview, Return items, Tracking, Receipts, Inspection/disposition, Files | ShpTpSalesReturn; ReturnItem source fixed | receive actual serials/lots; quarantine; inspect and release; link credit status read-only | eligible returned quantity and provenance |

### SupplierReturnShipment (Context passed)

**Context passed.** Mount `Shared/ShipmentDetail` at `Warehouse/Returns/SupplierReturnShipment`; `appRoot=Warehouse`. crosscut §3.8.

| Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- |
| Overview, Return items, Pick/pack, Carrier/tracking, Files | ShpTpPurchaseReturn; authorized ReturnItem source fixed | pick eligible return stock, pack, ship, labels; financial debit handled in Accounting context | outbound supplier-return chain |

## 12. Locations and facilities

### Facilities

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| FacilityList | list, read | Browse facilities by parent | facility, name, type, parent, owner, active | tree list | `mantle.facility.FacilityServices.get#FacilitiesByOwner` | Facility/FindFacility FacilityListForm |
| NewFacility | dialog | Create a warehouse or related operational facility | name, type, owner, parent, dates | server party/facility lookup | `mantle.facility.FacilityServices.create#Facility` | Facility/FindFacility NewFacilityForm |

**Actions.** Create/open FacilityDetail. Parent changes reject cycles; closing a location with stock or open work requires an explicit relocation plan.

**Views.** list and tree by parentFacilityId.

**Source.** research-warehouse §11; Facility/FindFacility.

### FacilityDetail (Context passed)

**Context passed.** Mount `Shared/FacilityDetail` at `Warehouse/Locations/FacilityDetail`; `appRoot=Warehouse`. crosscut §3.10.

| Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- |
| Overview/contact, Children, Locations/types, Products, Box types, Printers, Policies, Schedules, Files, Chatter | authorized warehouse/facility | edit locations/capacity/pick sequence, ProductFacility/Location policies, box/printer assignments under facility-admin; operational users read | storage identity and capacity; no machine-throughput reuse |

### EquipmentDetail (Context passed)

**Context passed.** Mount `Shared/EquipmentDetail` at `Warehouse/Locations/EquipmentDetail`; `appRoot=Warehouse`. crosscut §3.10.

| Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- |
| Identity, Assignments, Availability, Maintenance summary, Files | equipment visible at an authorized facility | assign to load with equipment authority; maintenance execution follows Maintenance definition; financial book read requires financial role | cart/forklift availability and assignments |

### PutawayRules

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| RuleList | list, editable rows | Set ordered destination rules | facility, incoming type, product/category, storage type, destination, priority, capacity UOM, effective dates | server lookups; priority reorder | proposed `mantle.facility.PutawayServices.store#PutawayRule` | Odoo stock_putaway_list; ERPNext Putaway Rule |
| RuleTest | single | Preview the destination for a stock identity and quantity | facility, product, lot/serial, quantity, stock UOM, container, source | explanation panel | proposed `mantle.facility.PutawayServices.resolve#Destination` | Carbon StorageRuleForm; Odoo putaway rules |

**Actions.** Save draft/activate, reorder and test. ProductFacilityLocation defaults are tried within applicable explicit constraints; all rules enforce compatible UOM, owner/status and destination capacity. No valid destination leaves the task in staging with a named reason; it never silently overflows a location.

**Source.** research-warehouse §3 and §11; Odoo product_strategy_views.xml; ERPNext putaway_rule.

**Needs.** WH-PUTAWAY

### Capacity

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| CapacityFind | find | Choose storage scope and unit | facility, location type, product/category, capacity UOM | unit selector | — | ERPNext Warehouse Capacity Summary |
| CapacityList | list, read | Compare occupied, reserved incoming and remaining capacity | location, capacity, occupied, inbound commitment, remaining, unit | progress and overflow warnings | proposed PutawayServices capacity query | ERPNext Warehouse Capacity Summary |

**Actions.** Open Location in FacilityDetail or Putaway queue. Unit-incompatible stock shows Unmeasured with its identity and prevents claiming spare capacity.

**Source.** research-warehouse §11; ERPNext `erpnext/stock/page/warehouse_capacity_summary/`.

**Needs.** WH-PUTAWAY

### Carriers

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| CarrierMethods | list, editable rows | Configure operational services | carrier, method, description, sequence, gateway binding | party/method selector | entity CarrierShipmentMethod | Facility/CarrierShipMethods CreateCarrierShipmentMethod and CarrierShipmentMethodList |
| GatewayBindings | list, read | Inspect permitted rate/label provider settings | provider, methods, boxes, supported actions, test/live | masked credential references | entity | Odoo delivery carrier; current ShippingGateway records |
| CarrierTest | dialog | Validate addresses/rates against a test shipment | shipment, provider, method, test mode | explicit test indicator | `mantle.shipment.CarrierServices.validate#PostalAddress`, proposed `mantle.shipment.WarehouseTaskServices.get#ShipmentRates` | Odoo carrier configuration |

**Actions.** Save method/binding, test rate/address; credentials are edited only through Admin authority. Commerce may mount these same records while separately binding ProductStoreShipOption; a store grant is not required for carrier setup.

**Source.** research-warehouse §8, §11, §14; Facility/CarrierShipMethods; existing CarrierServices.

**Needs.** WH-LABEL

### BoxTypes

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| BoxTypeList | list, editable rows | Maintain available parcels | type, description, dimensions/UOM, max weight, packaging product, active | UOM lookups | entity | Facility/BoxTypes BoxTypeList and CreateBoxType |
| BoxAssignments | list, editable rows | Bind parcel types to facilities and carrier codes | box type, facility, carrier, gateway code, preferred | lookup | entity FacilityBoxType and CarrierShipmentBoxType | Facility/EditFacility AddBoxTypeForm and BoxTypesForm |

**Actions.** Save and print a dimensional reference. A used type is retired, not removed from historic packages. Product packaging conversion remains Products-owned.

**Source.** research-warehouse §8 and §11; Facility/BoxTypes and PrintBoxTypes.

**Needs.** WH-LABEL

### Printers

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| PrinterAssignments | list, editable rows | Choose destinations for labels and documents | facility, purpose, printer, format, copies, enabled | printer lookup; PDF/ZPL capability | entity FacilityPrinter; proposed print capability query | Carbon StorageUnitsTable printer modal |
| PrinterTest | dialog | Send a marked sample to the selected destination | assignment, sample type, format, copies | preview then confirm | proposed print dispatch; existing `mantle.shipment.ShipmentServices.print#ShipmentLabels` for shipment labels | Carbon printing PrintButton |

**Actions.** Save/test; a print failure leaves the already posted stock result intact and offers reprint of the same document, never repost.

**Source.** research-warehouse §11–§12; FacilityPrinter in FacilityEntities; Carbon printing package.

**Needs.** WH-LABEL

## 13. Handheld

### HandheldHome

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ActiveFacility | single | Choose the authorized working facility | facility, device station, operator display | facility selector | `mantle.facility.FacilityServices.get#FacilitiesByOwner` | BasicHandheld/dashboard ActiveFacilityForm |
| ScanAnything | single | Resolve a task or physical identity | scanned code | scan-input | `mantle.facility.FacilityServices.get#ScannedIdGeneral` | BasicHandheld/dashboard ScanAssetForm |
| TaskQueue | list, read | Resume assigned or available tasks | type, document, due, current step, progress | large action rows | entity | Carbon MES picking queue |
| PackShipment | single | Open the pack station for a known shipment | shipment scan | scan-input | entity lookup | BasicHandheld/dashboard PackShipmentForm |

**Actions.** Receive, Put away, Pick, Pack, Move and Count open the contextual mounts below. Session change clears task inputs but preserves accepted server operations. Switching facility is blocked until pending input is saved or discarded.

**Devices.** handheld and phone; no drawer, 48 px controls and 18 px text. USB/Bluetooth keyboard wedge and manual input are the required baseline; camera capture is optional later.

**Source.** research-warehouse §12; BasicHandheld/Warehouse/dashboard; Carbon MES shell.

**Needs.** WH-SCAN, WH-SHELL

### HandheldReceive (Context passed)

**Context passed.** Mount `Warehouse/Receiving/Receive` at `Warehouse/Handheld/Receive`; `appRoot=Warehouse`. this file: Receive.

| Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- |
| current task, scan, quantity, result | active authorized facility; handheld=true | receive using the same transition and posting identity | one task and persistent scan focus |

### HandheldPutaway (Context passed)

**Context passed.** Mount `Warehouse/Receiving/Putaway` at `Warehouse/Handheld/Putaway`; `appRoot=Warehouse`. this file: Putaway.

| Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- |
| current task, scan, quantity, result | active authorized facility; handheld=true | move using the same transition and posting identity | one task and persistent scan focus |

### HandheldPick (Context passed)

**Context passed.** Mount `Warehouse/Picking/Pick` at `Warehouse/Handheld/Pick`; `appRoot=Warehouse`. this file: Pick.

| Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- |
| current task, scan, quantity, result | active authorized facility; handheld=true | pick using the same transition and posting identity | one task and persistent scan focus |

### HandheldPack (Context passed)

**Context passed.** Mount `Warehouse/Shipping/Pack` at `Warehouse/Handheld/Pack`; `appRoot=Warehouse`. this file: Pack.

| Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- |
| current task, scan, quantity, result | active authorized facility; handheld=true | pack using the same transition and posting identity | one task and persistent scan focus |

### HandheldMove (Context passed)

**Context passed.** Mount `Warehouse/Transfers/Move` at `Warehouse/Handheld/Move`; `appRoot=Warehouse`. this file: Move.

| Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- |
| current task, scan, quantity, result | active authorized facility; handheld=true | move using the same transition and posting identity | one task and persistent scan focus |

### Count (Context passed)

**Context passed.** Mount `Warehouse/Counts/CountEntry` at `Warehouse/Handheld/Count`; `appRoot=Warehouse`. this file: CountEntry.

| Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- |
| current task, scan, quantity, result | active authorized facility; handheld=true | count using the same transition and posting identity | one task and persistent scan focus |

## 14. Reports and settings

### Reports

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ReportIndex | list, read | List saved operational views and monetary links | report, purpose, date basis, latest run | descriptive links | entity/saved finds | ERPNext Stock workspace report cards |

**Actions.** Stock by location → InventoryAvailability; movements → Movements; availability/forecast → InventoryAvailability Projected; traceability → Traceability; count variance → CountVariance; history → OperationsHistory. Valuation opens the Accounting-owned InventoryValuation in this app with financial-read capability; opening the Accounting app is optional. Quantity reports remain complete without financial access.

**Source.** research-warehouse §13; ERPNext Stock workspace.

**Needs.** WH-REPORT

### InventoryValuation (Context passed)

**Context passed.** Mount the [Accounting-owned report](design-accounting.md#inventoryvaluation)
at `Warehouse/Reports/InventoryValuation`, fixing authorized organization/facility and optional
product/lot/as-of filters. Financial-read exposes source cost, inventory/WIP/GL and variance;
revaluation controls require separate financial mutation authority. The report uses Accounting's
same forms and services, with no Accounting launcher grant required. Unauthorized users receive
quantity-only operational reports without monetary values or hidden financial payloads.

### CountVariance

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| VarianceFind | find | Choose reviewed counts | facility, count date, counter, product, variance reason | date-period | — | Carbon InventoryCountHistory |
| VarianceReport | list, read | Compare observed and adjusted quantities | count, product, snapshot, observed, approved delta, posted delta, reason | drill-down; export | proposed InventoryCountServices review query; entity posted history | EditPhysicalInventory AssetDetailList; Carbon InventoryCountHistory |

**Actions.** Open CountReview; export excludes values hidden from the role. No quantities from active blind counts are returned to counters.

**Views.** list; pivot/graph later under WH-REPORT.

**Source.** research-warehouse §6 and §13; Carbon InventoryCountHistory; baseline EditPhysicalInventory.

**Needs.** WH-COUNT, WH-REPORT

### OperationsHistory

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| HistoryFind | find | Select a document/movement date basis | operation, date basis, range, facility, party, product, carrier | date-period; saved finds | — | Accounting/Reports AssetReceiptTransaction; ShipmentPackageSummary |
| HistoryReport | list, read | Explain operation quantities and lead time | source, expected/actual dates, accepted, rejected, picked, shipped, delivered | linked documents; UOM-aware totals | entity | Accounting/Reports AssetReceiptTransaction and AssetStatusByReceipt; ShipmentPackageSummary |

**Actions.** Drill to ReceiptDetail, ShipmentDetail, ReturnDetail and source movements; totals never add incompatible units.

**Views.** list; later pivot/graph by facility, carrier, supplier, product and period.

**Source.** research-warehouse §13; baseline Accounting reports and shipment histories.

**Needs.** WH-REPORT

### Settings

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| SettingsIndex | list, read | Show policy, configuration and integration entry points | section, owner scope, effective value summary, required role | navigation links | entity | AureusERP inventory settings clusters |

**Actions.** Open StockPolicies, ReservationPolicies, AssetPools, facility setup, inspection templates, carriers, printers or ExternalStockSync. Read-only users see effective operational policy, not secret credentials.

**Source.** research-warehouse §14; AureusERP inventories settings.

**Needs.** WH-POLICY

### StockPolicies

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| OperationPolicy | single | Configure receipt, dispatch and count controls | receipt/delivery steps, default locations, over-receipt/ship tolerance, backorder choice, blind count, auto-print | scope inheritance and source | proposed `mantle.facility.WarehousePolicyServices.store#OperationPolicy` | Odoo operation type settings; ERPNext Stock Settings |
| TrackingPolicy | single | Set tracking and expiry requirements | lot creation, serial required, near-expiry days, expiry block, minimum shelf life | effective-source display | proposed WarehousePolicyServices tracking policy action | Carbon inventory settings; ERPNext Stock Settings |
| PolicyPreview | display | Explain effective policy for a source document | organization, facility, store override, product exceptions, permission limits | read-only resolution trace | proposed WarehousePolicyServices resolve action | Odoo per-operation defaults |

**Actions.** Save new effective version with audit. Over-receipt and over-shipment tolerances default to zero; an approved exception never exceeds the source contract without the corresponding authorized source change. Expired stock blocks sale/production issue; move to quarantine, return to supplier and disposal remain possible under explicit disposition authority. Near-expiry warnings show dates. An override cannot bypass quality hold, statutory/organization prohibition or financial-period locks. Policy changes apply at posting revalidation and never rewrite history.

**Source.** research-warehouse §14; Carbon `apps/erp/app/routes/x+/settings+/inventory.tsx`; active facility policy fields.

**Needs.** WH-POLICY, WH-EXPIRY, WH-POST

### ReservationPolicies

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| FacilityReservation | single | Provide defaults without requiring a store | facility, reservation order, automatic timing, partial allocation, require stock | effective-source badge | proposed WarehousePolicyServices reservation action | ProductStore reservation fields; Odoo operation reservation method |
| StoreReservation | single | Edit a permitted store override over the same records Commerce uses | store, inventory facility, reservationOrderEnumId, reservationAutoEnumId, requireInventory | store lookup scoped to organization | entity ProductStore through field-scoped service | existing ProductStore configuration |
| ReservationCheck | dialog | Review and repair eligible reservation discrepancies | facility, product scope, affected orders, preview results | named result list | `mantle.product.AssetServices.check#FacilityReservations` guarded and previewed | existing AssetServices reservation checks |

**Actions.** Save facility default or explicit store override. Store policy wins only for that store order; show source on operational screens. Re-reserving open demand is a separate preview/confirm action; the setting change alone does not displace stock.

**Source.** research-warehouse §14 and open questions; active ProductStore reservation enums.

**Needs.** WH-POLICY, WH-POST

### AssetPools

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| PoolList | list, read | Find pools | pool, name, owner, members | split selection | `mantle.product.AssetServices.get#AssetPools` | Asset/AssetPool/FindAssetPool AssetPoolList |
| PoolHeader | single | Create/edit a pool | ID, name, description, active dates | standard fields | entity | FindAssetPool CreateAssetPoolForm; EditAssetPool UpdateAssetPoolForm |
| PoolParties | list, editable rows | Authorize parties to consume pool stock | party, role, dates | party lookup | entity AssetPoolParty | EditAssetPool AddPartyForm and PartyListForm |
| PoolStores | list, editable rows | Associate stores with the pool | store, dates | store lookup | entity AssetPoolStore | EditAssetPool AddStoreForm and StoreListForm |

**Actions.** Save changes, validate no historic allocations are rewritten, then separately preview affected open reservations. Membership is not permission to read unrelated owner data.

**Source.** research-warehouse §16; baseline Asset/AssetPool.

**Needs.** WH-POLICY

### ExternalStockSync

**Forms.**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| SyncSource | wizard step | Select configured provider and upload/fetch snapshot | provider binding, facility, owner, as-of, external batch ID, file | file upload; credential-free binding | proposed `mantle.product.ExternalStockServices.import#StockSnapshot` in preview mode | ridgecrest InventoryFileImporter |
| SyncMapping | wizard step | Resolve external product/location codes | external code, product, location, lot, owner, quantity, UOM | mapping grid and per-row errors | proposed ExternalStockServices map/validate actions | ridgecrest VdcServices import inventory; product import patterns |
| SyncReview | wizard step | Review mapped deltas without overwriting local movements | external as-of, local movement since, expected delta, conflicts, posting policy | conflict review | proposed ExternalStockServices review action | Odoo count conflict; count-review contract |
| SyncResults | wizard step | Apply approved independent rows and retain retry results | batch, row, operation identity, outcome, source adjustment | result download | proposed ExternalStockServices apply action over guarded quantity services | ridgecrest InventoryFileImporter processing/done |

**Actions.** Preview then apply; recognize an already consumed provider batch/row, continue past invalid independent rows with named errors, and reconcile local movements after the snapshot. Provider order/settlement feeds declare which feed owns stock issuance so two feeds cannot issue it twice. Admin owns protocol credentials and jobs; Warehouse owns quantity exceptions and review.

**Source.** research-warehouse §6 and §17; ridgecrest `screen/rcadmin/InventoryFileImporter.xml` and `service/ridgecrest/vdc/VdcServices.xml`.

**Needs.** WH-SYNC, WH-COUNT, WH-POST

## 15. Baseline coverage

### 15.1 Forms

The exact inventory keys below make the handoff reviewable. Names are the inventory's **Screen XML**
and **Form** cells, not invented filenames. Every named target is in §2, except Shared/Chatter and
Shared/RecordFiles, whose canonical definitions remain Commons-owned. Reused targets receive the
Warehouse context and the corresponding shared form, not a copied implementation.

| Inventory area | Screen XML | Forms | Designed in |
| --- | --- | --- | --- |
| Accounting | AssetOnHand | `AssetOnHandSummary` | Warehouse/Inventory/Availability |
| Accounting | AssetOnHandSummary | `FieldDescriptions`, `AssetOnHandSummary` | Warehouse/Inventory/Availability |
| Accounting | AssetReceiptTransaction | `AssetReceiptTxList` | Warehouse/Reports/OperationsHistory |
| Accounting | AssetStatusByReceipt | `FieldDescriptions`, `AssetOnHandSummary` | Warehouse/Reports/OperationsHistory |
| Accounting | ShipmentPackageSummary | `ShipmentPackageSummary` | Warehouse/Reports/OperationsHistory |
| Asset | AssetDetail | `AuditLogList`, `EditAsset`, `ReservationsListForm`, `AssetDetailList` | Warehouse/Inventory/AssetDetail |
| Asset | DetailHistory | `AssetDetailList` | Warehouse/Inventory/Movements; Warehouse/Inventory/AssetDetail |
| Asset | FindAsset | `ListAssets` | Warehouse/Inventory/Assets |
| Asset | FindSummary | `ReceiveAssetForm` | Warehouse/Receiving/Receive; Warehouse/Inventory/MaterialIssueReceipt |
| Asset | FindSummary | `PhysicalManualChange` | Warehouse/Inventory/Adjustments |
| Asset | FindSummary | `AssetSummary` | Warehouse/Inventory/Availability |
| Asset | PhysicalChange | `RecordChange` | Warehouse/Inventory/Adjustments |
| Asset | PhysicalQuantity | `RecordQuantity` | Warehouse/Inventory/Adjustments |
| Asset | MoveAsset | `AssetInfoForm`, `ScanMoveAssetForm`, `EnterMoveAssetForm` | Warehouse/Transfers/Move |
| Asset | SelectAsset | `ScanAssetForm`, `ActiveFacilityForm`, `SelectAssetForm`, `SelectLocationForm`, `ScanMoveAssetForm`, `EnterMoveAssetForm`, `ContainerAssetList`, `LocationAssetList`, `ProductNoLocAssetList`, `RecentMoveForm`, `RecentContainerMoveForm` | Warehouse/Transfers/Move |
| Asset | EditAssetPool | `UpdateAssetPoolForm`, `AddPartyForm`, `PartyListForm`, `AddStoreForm`, `StoreListForm` | Warehouse/Settings/AssetPools |
| Asset | FindAssetPool | `CreateAssetPoolForm`, `AssetPoolList` | Warehouse/Settings/AssetPools |
| Asset | EditContainer | `PickScanForm`, `UpdateContainerForm`, `AddAssetForm`, `AssetListForm` | Warehouse/Inventory/ContainerDetail |
| Asset | FindContainer | `CreateContainerForm`, `ContainerList` | Warehouse/Inventory/Containers |
| Asset | MoveContainer | `ContainerInfoForm`, `AssetListForm`, `ScanMoveContainerForm`, `EnterMoveContainerForm` | Warehouse/Inventory/ContainerDetail; Warehouse/Transfers/Move |
| Asset | EditLots | `CreateLot`, `LotList` | Warehouse/Inventory/Lots |
| Asset | EditPhysicalInventory | `UpdateMasterEntityValue` | Warehouse/Counts/CountDetail |
| Asset | EditPhysicalInventory | `AssetDetailList` | Warehouse/Counts/CountDetail; Warehouse/Counts/CountReview; Warehouse/Reports/CountVariance |
| Asset | FindPhysicalInventory | `PhysicalInventoryList` | Warehouse/Counts/Counts |
| Facility | BoxTypes | `CreateBoxType`, `BoxTypeList` | Warehouse/Locations/BoxTypes |
| Facility | CarrierShipMethods | `CreateCarrierShipmentMethod`, `CarrierShipmentMethodList` | Warehouse/Locations/Carriers |
| Facility | EditFacility | `EditFacilityForm`, `ChildListForm`, `AddLocationTypeForm`, `LocationTypesForm` | Warehouse/Locations/FacilityDetail |
| Facility | EditFacility | `NewNoteForm`, `UpdateNoteForm` | Warehouse/Locations/FacilityDetail; Shared/Chatter |
| Facility | EditFacility | `AddBoxTypeForm`, `BoxTypesForm` | Warehouse/Locations/FacilityDetail; Warehouse/Locations/BoxTypes |
| Facility | EditFacilityLocations | `NewLocationForm`, `LocationsForm` | Warehouse/Locations/FacilityDetail |
| Facility | EditFacilityProducts | `AddProductForm`, `ProductList` | Warehouse/Locations/FacilityDetail; Warehouse/Inventory/Product360 |
| Facility | FindFacility | `NewFacilityForm`, `FacilityListForm` | Warehouse/Locations/Facilities |
| Return | AddOrderItems | `LookBackDaysForm`, `AddOrderItemToReturn` | Warehouse/Returns/ReturnDetail |
| Return | EditReturn | `AuditLogList`, `UpdateReturn` | Warehouse/Returns/ReturnDetail |
| Return | EditReturnItems | `ReturnItemList` | Warehouse/Returns/ReturnDetail |
| Return | FindReturn | `CreateReturn`, `CreateSupplierReturn`, `ReturnHeaderList` | Warehouse/Returns/Returns |
| Shipment | FindShipment | `NewOutgoingShipment` | Warehouse/Shipping/Shipments |
| Shipment | FindShipment | `NewIncomingShipment` | Warehouse/Receiving/Receipts |
| Shipment | FindShipment | `NewTransferShipment` | Warehouse/Transfers/Transfers |
| Shipment | FindShipment | `ShipmentList` | Warehouse/Receiving/Receipts; Warehouse/Shipping/Shipments; Warehouse/Transfers/Transfers |
| Shipment | PackageTracking | `EtaPackageList` | Warehouse/Shipping/PackageTracking |
| Shipment | ShipmentDetail | `AuditLogList`, `EditShipment`, `ItemLimitForm`, `ShipmentOrderPaymentList`, `ShipmentInvoicePaymentList`, `AddParty`, `RolesForm`, `SendPlacedEmailForm`, `EmailMessageList`, `AddItemForm` | Warehouse/Receiving/ReceiptDetail; Warehouse/Shipping/ShipmentDetail |
| Shipment | ShipmentDetail | `PackScanForm` | Warehouse/Shipping/Pack; Warehouse/Handheld/Pack |
| Shipment | ShipmentDetail | `PickScanForm` | Warehouse/Picking/Pick; Warehouse/Handheld/Pick |
| Shipment | ShipmentDetail | `NewContentForm`, `UpdateContentForm` | Warehouse/Receiving/ReceiptDetail; Warehouse/Shipping/ShipmentDetail; Shared/RecordFiles |
| Shipment | ShipmentDetail | `ProduceAssembliesForm`, `AssemblyProduceProducts`, `AssemblyConsumeProducts` | Warehouse/Inventory/MaterialIssueReceipt; Warehouse/Shipping/Pack |
| Shipment | ItemReserve | `ReserveItem` | Warehouse/Shipping/ShipmentDetail |
| Shipment | ReceiveItem | `ReceiveForm` | Warehouse/Receiving/Receive; Warehouse/Handheld/Receive |
| Shipment | UpdateItemAsset | `UpdateForm` | Warehouse/Shipping/ShipmentDetail |
| Shipment | ShipmentItems | `AssemblyPackUnusedComponents`, `SetPackedForm`, `AddItemForm`, `ItemsOptionsForm`, `PackItemForm`, `PackComponentsForm`, `UpdateItemForm`, `AddItemToPackageForm`, `ItemSourceIssuanceList`, `PaComponentPackForm`, `ItemAssetIssuanceList` | Warehouse/Shipping/ShipmentDetail; Warehouse/Shipping/Pack |
| Shipment | ShipmentItems | `SetDeliveredForm` | Warehouse/Shipping/PackageTracking; Warehouse/Shipping/ShipmentDetail |
| Shipment | ShipmentItems | `ItemSourceReceiptList`, `ItemAssetReceiptList` | Warehouse/Receiving/ReceiptDetail; Warehouse/Returns/ReturnReceipt |
| Shipment | ShipmentPackages | `SetShippedForm`, `PrintAllShipmentLabels`, `RequestRetLabel`, `PrintShipmentLabel` | Warehouse/Shipping/Ship; Warehouse/Shipping/ShipmentDetail |
| Shipment | ShipmentPackages | `PackageOptionsForm`, `UpdatePackageForm`, `ShipmentPackageContentList` | Warehouse/Shipping/ShipmentDetail; Warehouse/Shipping/Pack; Warehouse/Shipping/Ship |
| Shipping | PackItems | `ItemsOptionsForm`, `PackItemForm`, `UpdateItemForm`, `AddItemToPackageForm`, `ItemSourceIssuanceList`, `ItemAssetIssuanceList` | Warehouse/Shipping/Pack; Warehouse/Handheld/Pack |
| Shipping | PackPackages | `PackageOptionsForm`, `UpdatePackageForm`, `RequestRetLabel`, `PrintShipmentLabel`, `ShipmentPackageContentList` | Warehouse/Shipping/Pack; Warehouse/Shipping/Ship |
| Shipping | PackSummary | `PrintAllShipmentLabels`, `SetShippedForm`, `PackScanForm`, `ClosePackageForm`, `ShipmentPackageContentList` | Warehouse/Shipping/Pack; Warehouse/Shipping/Ship; Warehouse/Handheld/Pack |
| Shipping | PackCompleted | `AssemblyPackUnusedComponents`, `PackCompletedForm` | Warehouse/Shipping/Pack |
| Shipping | PickLocationMoves | `PickMoveList` | Warehouse/Picking/PickLocationMoves |
| Shipping | QuickMove | `ScanMoveAssetForm` | Warehouse/Picking/PickLocationMoves |
| Shipping | AddOrder | `AddOrderList` | Warehouse/Picking/PicklistDetail |
| Shipping | AddShipment | `AddShipmentList` | Warehouse/Picking/PicklistDetail |
| Shipping | BulkPicklist | `CreatePicklistsForm`, `AddOrderList` | Warehouse/Picking/CreatePicklists |
| Shipping | FindPicklist | `NewPicklist`, `PicklistList` | Warehouse/Picking/Picklists |
| Shipping | PicklistDetail | `UpdateShipmentLoad`, `ListShipments`, `AddPartyAssignForm`, `UpdateAssignForm`, `AddAsset`, `UpdateAssetAssign` | Warehouse/Picking/PicklistDetail |
| Shipping | dashboard | `PackShipmentForm` | Warehouse/Shipping/Pack; Warehouse/Handheld/Pack |
| Shipping | dashboard | `FacilitySummary` | Warehouse/Home |
| BasicHandheld (Warehouse handheld) | ReceiveAsset | `ScanAssetForm`, `ActiveFacilityForm`, `ReceiveAssetForm` | Warehouse/Handheld/Receive |
| BasicHandheld (Warehouse handheld) | SelectAsset | `ScanAssetForm`, `ActiveFacilityForm`, `ScanMoveAssetForm`, `ContainerAssetList`, `LocationAssetList`, `ProductNoLocAssetList`, `RecentMoveForm`, `RecentContainerMoveForm` | Warehouse/Handheld/Move |
| BasicHandheld (Warehouse handheld) | PickLocationMoves | `ActiveFacilityForm`, `PickMoveList` | Warehouse/Picking/PickLocationMoves |
| BasicHandheld (Warehouse handheld) | dashboard | `ActiveFacilityForm`, `ScanAssetForm`, `PackShipmentForm` | Warehouse/Handheld/Home |

Asset maintenance plans/history, meters, registrations and custodian management remain for Maintenance;
this app shows their authorized summary on EquipmentDetail. Asset acquisition-cost changes, depreciation
and product-cost edits belong to Accounting/Products. `AssetCalendar/NewEventForm` remains on the existing
Commons schedules definition. No such unowned baseline form is falsely marked complete here. Equipment
creation is covered by the shared facility/equipment design and its owning specialist contexts, rather
than a stock-adjustment form.

### 15.2 Services and source validation

The Forms tables name the screen-facing existing services or a proposed wrapper and its baseline.
Shared ShipmentDetail additionally preserves `update#ShipmentAndRouteSegment`, `create#ShipmentItem`,
`update#ShipmentItem`, `cancel#Shipment`, `send#ShipmentStoreEmail`, and the ShipmentInfoServices display/
shipping-option queries; source reservation actions use `reserve#AssetsForOrder`, `reserve#AssetForOrderItem`
and `reduce#AssetReservation`. Shared ReturnDetail uses the existing ReturnServices creation, returnable-item,
update, authorization and shipment/receipt methods under its action permissions. Their exact per-mount
coverage is carried into usl-inventory, without marking internal helper calls as screen APIs.

Source checks on Oct 27 distinguish active services from comments/interfaces. `CarrierServices.get#ShipmentRates`
is commented out and is not a working service. The new shipment-rate adapter calls configured providers
implementing the active `get#ShippingRatesBulk`/`get#ShippingRate` interfaces; it does not call a bare interface
as a concrete provider. The existing order bulk-rate action is useful for order context but assumes store
configuration, so it is not a sufficient standalone Warehouse adapter. `record#PhysicalInventoryQuantity`
remains an immediate posting service. All new count methods are separately specified in WH-COUNT.

## 16. Documents and outputs

| Output | Kind | From screen | Derived from |
| --- | --- | --- | --- |
| Receipt and rejected-goods receipt | html-print/PDF; receipt confirmation email | ReceiptDetail, Receive | Shipment display/receipt data; ERPNext Purchase Receipt |
| Putaway and transfer sheet | html-print/PDF | Putaway, TransferShipmentDetail | ShipmentPick and source/destination move data |
| Picklist and combined pick/pack sheets | html-print/PDF | PicklistDetail | Shipping/Picklist/ShipmentLoadPick and ShipmentLoadPickAndPack; `ShipmentInfoServices.get#ShipmentLoadPickInfo` |
| Packing slip, package contents and inserts | html-print/PDF | Pack, ShipmentDetail | ShipmentPack, ShipmentByPackage, ShipmentInsert; `ShipmentInfoServices.get#ShipmentPickPackInfo` |
| Carrier labels, return labels and manifests | provider file/PDF/ZPL; html-print manifest | Ship, DeliveryTripDetail | ShipmentServices.print#ShipmentLabels; carrier gateway label result; ERPNext Delivery Trip |
| Location, lot/serial, container and box labels | PDF/ZPL | FacilityDetail, Lots, Containers, BoxTypes | Facility/PrintBoxTypes; Carbon and Odoo label layouts |
| Blind count sheet and reviewed variance sheet | html-print/PDF | CountDetail, CountReview | Odoo stockinventory; Carbon count review; server omits blind quantities |
| Inspection evidence and disposition certificate | html-print/PDF | QualityInspection | Shared quality template/version/readings |
| RMA receiving and supplier-return slip | html-print/PDF | ReturnDetail, ReturnReceipt | Return source items and Shipment display data; Odoo return slip |
| Quantity, movements, history and lineage export | CSV/XLSX | InventoryAvailability, Movements, OperationsHistory, Traceability | Same authorized query and filters as each screen; no hidden financial/blind-count fields |
| Count-entry import and result report | CSV with preview; row-result CSV | CountEntry, CountReview | Exact count-line identity and observation fields; WH-COUNT validation |
| External stock snapshot mapping/errors | CSV upload and result download | ExternalStockSync | ridgecrest inventory import; WH-SYNC operation identities |
| Exception notifications | existing shell notifications; configured email | Receive, Pick, CountReview, QualityInspection, Ship | Commons notification providers and existing shipment email templates |

Document generation/printing failure is reported separately from the already committed stock operation.
Reprint uses its original document/version. Print methods never act as a posting endpoint.

## 17. Framework and data needs

The following IDs are stable for the crosscut roll-up. Existing shell/widgets/records are inputs;
only the stated extensions are new. Every proposed data write is a service-authorized business action.

| Need | Kind | Proposed as | Used by | Stub spec |
| --- | --- | --- | --- | --- |
| WH-SHELL — Warehouse providers | shell item | Warehouse quick-create, palette, Today and notification providers using existing shell contracts | Home, HandheldHome and all record screens | Authorized facility/owner queries; record identity and task context; no new shell widget. |
| WH-POST — Guarded stock operations | service type | Proposed `mantle.shipment.WarehouseTaskServices` entry points around existing shipment/asset services, shared with crosscut stock-operation contract | Receive, Putaway, Move, Adjustments, Pick, Pack, Ship, returns | Operation ID, exact source identity, version, quantities/UOM, posted-result lookup; atomic dependent stock/document writes and reversals; independent batch result collection; recheck permission, source capacity, quality, expiry and posting period. Label purchase has a durable provider request and recovery state. |
| WH-SCAN — Scan and tracking input | XML Form element | Proposed `scan-input` using existing facility/asset/shipment resolvers; optional camera adapter later | Handheld mounts and all task screens | Keyboard-wedge/manual input first; context-specific allowed identity types, ambiguity chooser, explicit quantity confirmation, deduplicated scan intent; GS1 parser and barcode nomenclature configuration added as a shared framework service, not regexes in screens. HTML/tui fallback is text input with the same resolver. |
| WH-COUNT — Count snapshots and review/post | data model | Extend active PhysicalInventory/PhysicalInventoryCount; proposed `mantle.product.InventoryCountServices` | Counts, CountDetail, CountEntry, CountReview, CountVariance | Header adds mode, scope, blind flag, assignees, started/reviewed timestamps and scope version. Line adds exact owner/pool/status/container/asset-or-serial identity where applicable, stock UOM, snapshot quantity/time/version, observed quantity/time, entry state, review reason/reviewer, approved delta and posting operation/result/AssetDetail links. Existing quantityOnHand carries the observation. Preserve PI status IDs. |
| WH-COUNT services | service type | Proposed `create#Count`, `update#Count`, `start#Count`, `record#CountLine`, `submit#Count`, `review#Count`, `resolve#CountConflict`, `recount#Count`, `post#Count` in InventoryCountServices | Counts family | Start freezes scope; record only saves observation; server enforces blind read restrictions; review reconciles post-snapshot movements; post locks disjoint stock buckets, revalidates reviewed versions, records per-line outcomes and calls immediate variance services only for approved deltas. Import uses the same line validation and named partial errors. |
| WH-PUTAWAY — Storage destinations and capacity | data model | Proposed `mantle.facility.PutawayRule` and storage-type applicability; `mantle.facility.PutawayServices` | Putaway, Move, PutawayRules, Capacity, ContainerDetail | Existing ProductFacilityLocation remains product default. Rule fields: ruleId, owner organization, facility, input location/type, product/category/storage type, target location/type, priority, from/thru, active and capacity constraints. `store#PutawayRule`, `resolve#Destination`, `get#Capacity` explain chosen/rejected destinations and use compatible units with incoming reservations; never repurpose Facility people capacity. |
| WH-QUALITY — Shared inspections | data model | Crosscut §3.19 `mantle.product.quality.InspectionTemplate`, InspectionTemplateItem, QualityInspection, InspectionReading and `mantle.product.QualityServices` | Inspection, Receive, Putaway, Ship, returns | Warehouse contributes source receipt/item, accepted/rejected/held quantities and disposition destinations; published template version and immutable verification evidence; use shared `store#InspectionTemplate`, `create#Inspection`, `save#InspectionReading`, `submit#Inspection`, `verify#Inspection`, `dispose#Inspection`. NCR/CAPA/gauges are later extensions, not a duplicate Warehouse model. |
| WH-EXPIRY — Eligibility and expiry history | service type | Extend shared stock eligibility with effective warehouse expiry policy and audited lot corrections | Lots, Receive, Pick, Ship, Move | Current FEFO/newer-inventory selection does not provide the whole posting gate. Check expiry/remaining shelf life at allocation and issue; track corrections with old/new/reason/actor. Block expired allocation/issue; explicit quarantine/return/disposal actions still work. |
| WH-PICK — Load and short-pick workflow | service type | Extend ShipmentWorkServices plus proposed WarehouseTaskServices `record#ShortPick`, `finish#Pick`, `reverse#Pick` and bulk preview | Picklists, PicklistDetail, CreatePicklists, Pick | Retain WepShipmentShip, Shipment.shipWorkEffortId, binLocationNumber and ShipmentItemSource.quantityPicked/quantityNotHandled. Add audited reason/resolution and operation IDs; expose line states derived from quantities. A short pick creates an exception/recount, never an automatic stock decrement. |
| WH-WAVE — Automatic batching | service type | Later wave-policy fields in operation policy and preview/scheduled generation over ShipmentWorkServices | CreatePicklists, StockPolicies | Group by facility/carrier/destination/date with limits, assignees and pick path. Preview exclusions and reserve before release; one independent load result per group. Manual load/bulk creation remains first release. |
| WH-TRACE — Traceability queries | service type | Proposed `mantle.product.TraceabilityServices.get#Traceability` | Traceability, AssetDetail, Lots, Movements | Bounded cycle-safe traversal of AssetReceipt/Issuance/Detail and production source/output links; paginated nodes/edges, quantity/UOM, event time, source URL, provenance gaps and permission-filtered fields. No new stock balance or ledger table. |
| WH-GRAPH — Lineage visualization | Vue component | Later TraceabilityGraph.qvue and terminal twin | TraceabilityGraph | Graph/selection details over WH-TRACE; terminal renders tree/table and the same node actions; accessible keyboard selection. |
| WH-LABEL — Rating, labels and printing | tool | Proposed shipment-rate adapter and durable provider-operation results; shared PDF/ZPL label generation/dispatch | Ship, Pack, PackageTracking, Carriers, BoxTypes, Printers, Lots, Containers | `WarehouseTaskServices.get#ShipmentRates` assembles shipment/package data and dispatches configured active rate interfaces; `CarrierServices.get#ShipmentRates` remains commented. Reuse existing label request/track/refund/print APIs. Printer capability and delivery result are distinct from stock success; provider failures permit safe reprint/status lookup. |
| WH-POLICY — Effective operational policy | data model | Proposed `mantle.facility.WarehousePolicy` and `mantle.facility.WarehousePolicyServices` | StockPolicies, ReservationPolicies, AssetPools, FacilityDetail | Organization/facility defaults plus explicit ProductStore reservation overrides; version/effective dates and resolver explanation. `store#OperationPolicy`, `store#TrackingPolicy`, `store#ReservationPolicy`, `resolve#WarehousePolicy`; existing Facility flags and ProductFacility policy remain authoritative for their fields. Add shipping-dock location enum; map autoStatusId consistently. |
| WH-REQUEST — Internal stock context | service type | Extend existing RequestDetail and RequestServices stock-request actions | StockRequests, RequestDetail | RqtInventory item destination/UOM/required date and supplied quantities; approve/cancel with audit; link Requirement and fulfillment documents via current request joins/RequestRecord. Never clone the request just to show it in Purchasing. |
| WH-PLAN — Common supply planning | service type | Crosscut §3.20 PlanningRun, PlanningSuggestion, RequirementSupply and `mantle.product.SupplyPlanningServices` | SupplyPlanning, StockRequests | Transfer context of the same `run#SupplyPlan`, `get#SupplyPlan`, `convert#PlanningSuggestions`; provenance and idempotent conversion. Freshness/as-of and unavailable projection are visible, with transactional revalidation at conversion. |
| WH-RETURN — Return eligibility and disposition | service type | Crosscut §3.18 guards over existing ReturnServices and ShipmentServices | Returns, ReturnDetail, ReturnReceipt, SupplierReturnShipment | Preserve source order/return/shipment/serial links, lock cumulative eligibility, separate authorized/physical/financial progress; disposition through shared quality. No parallel RMA table. |
| WH-TRIP — Delivery stops | data model | Later `mantle.shipment.DeliveryStop` linked to existing Delivery and ShipmentRouteSegment; proposed DeliveryServices | DeliveryTrips, DeliveryTripDetail | Stop ID/sequence, shipment/route, address, planned/actual arrival, result, recipient/evidence, return-to-depot link; create/update/complete trip methods, driver assignment through existing party/work links. Stops complete independently, each source shipment atomically. |
| WH-REPORT — Operational aggregates | service type | Authorized operational queries over current entities; later pivot/graph list view dependency | Reports, Movements, CountVariance, OperationsHistory | Same filters and organization/owner permissions as detail; explicit date basis and compatible-UOM totals; no materialized truth tables. Reuse existing views; proposed framework pivot/graph support follows style-guide §8 if needed. |
| WH-SYNC — External stock snapshots | data model | Later `mantle.product.asset.ExternalStockBatch`/ExternalStockRow and ExternalStockServices | ExternalStockSync | Provider/batch/row idempotency, source as-of, mapping, owner/facility/UOM, raw quantity, reviewed delta, conflict/error, operation/result link; import/map/review/apply methods. Admin owns credentials/protocol jobs, Warehouse owns review; independent failures continue and issued-stock ownership is explicit per feed. |

For new records without baseline fields (PutawayRule, WarehousePolicy, DeliveryStop, ExternalStockBatch/Row),
the stub's field list plus identifiers, organization scope and create/update audit metadata is the complete
minimum field set for the forms in this design. Implementation derives normal validation from each field's
record/UOM/source relationships; it must not infer additional business authority from a caller parameter.

## 18. Decided

| Decision | Notes |
| --- | --- |
| Queue-first landing and complete candidate coverage | Research Home → Home; Receiving → Receipts/ReceiptDetail/Receive/Putaway/Supplier360; Inspection → Inspections/shared inspection/templates; Inventory → Availability/Product360/Assets/AssetDetail/Movements/Adjustments/Lots/Containers/Traceability; Counts → Counts/CountDetail/CountEntry/CountReview; Transfers/requests → Transfers/TransferShipmentDetail/Move/StockRequests/RequestDetail/SupplyPlanning; Picking → Picklists/PicklistDetail/CreatePicklists/Pick/PickLocationMoves; Packing/shipping → Shipments/Pack/Ship/PackageTracking/OrderDetail; Returns → Returns/ReturnDetail/ReturnReceipt/SupplierReturnShipment; Locations → Facilities/FacilityDetail/EquipmentDetail/PutawayRules/Carriers/BoxTypes/Printers; Handheld → explicit contextual task mounts; Reports and Settings → §14. Every candidate is present or consolidated into these named screens. |
| Reuse one stock and document model | Asset/AssetDetail are balance and history; Shipment represents receipt, dispatch and transfer; ReturnHeader/ReturnItem represent RMA; WorkEffort WepShipmentShip is the picklist/wave. No replacement warehouse/bin/stock-balance/return tables. |
| Full inspection record, shared with Manufacturing/Purchasing | Research inspection-scope question resolved by WH-QUALITY: templates, samples/readings, inspector/verifier, outcome and disposition. Rejected quantity alone is insufficient evidence. Warehouse managers with quality authority edit the shared templates locally. |
| Further quality functions are later | NCR/CAPA, quality document control and gauge calibration extend shared quality; no separate Warehouse quality module. Their work/result links remain visible from QualityInspection. Full operator measurement overlays follow the shared Manufacturing context. |
| Count-post is a separate service | Research count question resolved: entry stores observations, review resolves movement conflicts, post calls existing variance logic. No deferred-mode change to record#PhysicalInventoryQuantity. Blank is uncounted, zero is explicit, and blind quantities are withheld server-side. |
| Reservation defaults work without a store | Research setting-ownership question resolved: Warehouse/Commerce edit the same permitted ProductStore reservation fields; Warehouse also supplies facility defaults. An explicit store override wins for its orders and its source is visible. Existing facility negative-issue/owner rules still apply. |
| Internal requests are the existing shared RequestDetail | Research request question resolved: RqtInventory context with items/destination and approval; one Requirement links buy/make/transfer supply. Purchasing may fulfill a buy requirement without creating a duplicate request. |
| External fulfillment sync has two responsibilities | Research 3PL question resolved: Warehouse's later ExternalStockSync owns mapping/conflicts/results; Admin owns provider credentials/jobs. Both access the same integration/batch state. No direct unreviewed absolute overwrite of local stock. |
| Short picks are exceptions, not automatic corrections | QuantityNotHandled records a physical shortfall; recount or an authorized independent adjustment resolves stock truth. Partial/backorder decisions preserve outstanding order demand. |
| Task screens have explicit handheld mounts | Receive/Putaway/Pick/Pack/Move/Count are the same records, services and operation IDs with handheld presentation. Online-first; keyboard wedge/manual input baseline; camera optional. No offline posting queue is implied. |
| Shipping and receiving gates share stock eligibility | Tracking totals, expiry, quality hold, source quantity, UOM, permissions and period rules are enforced at posting. Existing FEFO/newer-lot lookup is retained, not mistaken for a complete gate. |
| Physical completion and financial completion remain distinct | Warehouse receives/ships/disposes; Accounting values/posts/credits/refunds. Standalone mounts expose only actions the user is authorized to perform, with no requirement for an unrelated launcher grant. |
| Advanced features stay designed as later | TraceabilityGraph, Capacity workbench, automatic wave rules, DeliveryTrips/DeliveryTripDetail, ExternalStockSync and pivot/graph reporting follow first-release operational parity. First release still has ledger/tree traceability, destination capacity enforcement, manual waves and shared core quality. |
| Reference-only extras are bounded | 3PL storage-fee subscriptions/customer stock portal, arbitrary push/pull route engines and carrier route optimization are not separate first-release Warehouse screens; owner stock is already visible by owner, fee/portal work remains Commerce/Accounting, multi-step receipts/deliveries are explicit policy-driven queues, and later trips accept manually ordered stops. |
| Posted data is corrected, not erased | Existing baseline direct status/quantity editing is replaced by named guarded actions. Label refunds, document reprints and tracking refresh never imply stock reversal. Independent batch failures name the item and continue; dependent movements remain atomic. |
| Research and inventory staleness is explicit | Current capability notes above correct the expiry and commented shipment-rate claims. A stale inventory row does not make a service callable; proposed API work is clearly labeled. |

## 19. Open

No unresolved cross-app choice is required to implement the core screen structure. Review these deployment
choices against the first adopter; defaults below are the design until changed explicitly:

- **Barcode devices and printers.** Recommend keyboard-wedge scanning and PDF labels first, with ZPL for an
  explicitly configured printer. Camera scanning is later; both use the same resolver/confirmation contract.
- **Automatic wave policy thresholds.** Recommend manual reviewed groups in the first release and no
  scheduled automatic release. Later limits/grouping are tenant policy, previewed by CreatePicklists.
- **Owner-stock services beyond inventory.** Recommend a separate later Commerce/Accounting design for
  customer stock portals and storage-fee billing; preserve owner identity and movement provenance now.

Acceptance review covers purchase receipt → partial inspection → putaway; reservation → shortage → recount;
pick/pack → multiple packages → label timeout/retry → ship; customer and supplier returns with partial
physical/financial completion; transfer in transit; blind count with concurrent receipt/issue and failed
independent lines; lot expiry change; invalid serial/UOM; mixed owners/pools; unauthorized financial fields;
closed-period correction; and standalone Warehouse operation without a ProductStore or other app grant.
All Markdown/source checks are documentation checks; this pass does not build application screens or run
runtime tests.
