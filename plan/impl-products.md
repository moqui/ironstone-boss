# IronStone BOSS — Products implementation

Oct 28, 2026 — implementation in progress; P0 checked, P1 next

How [design-products.md](design-products.md) gets built, in phases from the foundation to the catalog checks, each
ending tested and usable. This file is kept at a high level, as [impl-projects.md](impl-projects.md) was: each phase
names its scope by the design's sections and §14 needs rather than restating them, and the design stays the place for
screen and record detail. During the build this file is the log: phase status and what each built, the decisions made,
open questions, findings against the code, and what is deferred.

Today `screen/Products/` holds placeholders only (Home, Products, Categories, Features, Pricing, Suppliers, Documents,
Settings), and the `BOSS_PRODUCTS` authz is commented out. None of the design's proposed services, entities, fields or
status items exist yet in Mantle or BOSS. Products is the first core ERP app built, so Warehouse, Manufacturing,
Accounting and Purchasing are placeholders too.

**Inputs.**
- Designs:
  - [design-products.md](design-products.md)
  - [design-crosscut.md](design-crosscut.md) §1.4, §3.3, §3.5, §3.7, §3.21, §3.23 and §7.1
  - [design-warehouse.md](design-warehouse.md): StockPolicies and WH-POLICY
  - [design-manufacturing.md](design-manufacturing.md): §5, and M3 and M5 of §12
  - [design-accounting.md](design-accounting.md): InventoryValuation and AC-07
- The design review: `review-core-apps.md` and `review-core-apps/products.md`, which explain the design's R- IDs and the
  "§4.1 step" references. The documentation-only `review-core-apps` branch (0e53a04) is integrated (F25).
- Guides and rules: [design-doc-guide.md](design-doc-guide.md), [style-guide.md](style-guide.md) §8, and
  [impl-drawers-commons.md](impl-drawers-commons.md) §4 (the shared rules).
- [impl-projects.md](impl-projects.md): the pattern, and its findings that recur here (F9, F15, F17).
- Inventories: [ss-inventory.md](ss-inventory.md) and [usl-inventory.md](usl-inventory.md).
- mr-moqui: `plans/Remaining-Work.md` and `docs/Testing.md`.

Code paths are under `mr-moqui-base/` unless they name a component.

Sections: [1 scope](#1-scope-and-order) · [2 rules](#2-ground-rules) · [3 phases](#3-phases) ·
[4 decisions](#4-decisions) · [5 open](#5-open-questions) · [6 findings](#6-findings) · [7 later](#7-later) ·
[8 verification](#8-verification)

---

## 1. Scope and order

- **Repositories.** Each is its own git repo:
  - `mr-moqui-base` (`crates/`, `runtime/base-component`)
  - `runtime/component/mr-mantle`
  - `runtime/component/mr-boss`

  `runtime/component/mr-marble` is read only, for the baseline Catalog screens that ss-inventory maps.
- **Scope.**
  - Every `parity` and `new` row of design §2, and the §14 needs they use.
  - The parts of other apps' needs that Products depends on (§4):
    - Warehouse's facility and tracking policy;
    - Manufacturing's versioned methods and work-center rates;
    - Accounting's revaluation.
  - §7 holds the `later` rows and needs, and the rest of those apps' needs.
- **Order** (decided Oct 28, 2026):
  1. the foundation;
  2. products and Product360;
  3. the catalog: categories and features, then variants;
  4. prices, then supplier prices;
  5. the other apps' contracts that Product360 and the cost roll-up need: stock policy, then methods;
  6. standard costs;
  7. documents;
  8. units, with packaging and labels;
  9. import, over all of the above;
  10. catalog checks;
  11. the finish.

## 2. Ground rules

- **The Commons rules hold.** These are impl-drawers-commons §4:
  - failure tolerance;
  - the Mantle-free framework;
  - the new XML element checklist of style-guide §8.1;
  - libraries through `libs/refresh.mjs`, and crates against `deny.toml`;
  - the `.qvue` gallery pattern;
  - demo data;
  - builds and commits.

  Screenshots come from a BOSS `test/client` spec on the pattern of example's `GalleryShots.spec.js`, run with
  `moqui test-client mr-boss --serve` (F23).
- **Catalog rows through services.** No entity filter covers a product's prices, associations, parties, content or
  identifiers (F1). Products reads and writes them only through services: `ironstone.products.CatalogServices` checks
  the product's owner and the grant, then calls the Mantle store service.
  - `entity` in a design form summary means that guarded path, never a bare entity form (design §14).
  - Grants are checked in the services, so they hold for imports, exports, search, the palette and shared mounts.
- **Restricted values stay on the server.** A service leaves out of its answer any supplier price, cost, margin or trace
  source the user may not read; nothing is fetched and then hidden. An inaccessible price is omitted, not shown as zero
  (design §1.1, PriceExplain).
- **Shared screens.** Products builds these with the Products context only:
  - `Shared/Product360`, `Shared/Supplier360` and `Shared/SupplierPrices`;
  - `Shared/PriceLists`, `Shared/PriceListDetail` and `Shared/PriceExplain`;
  - `Shared/InventoryAvailability`;
  - the five method screens of Manufacturing §5.

  Each takes `appRoot` and server-derived capabilities, so another app's context is an addition, not a rewrite (as
  `Shared/WorkItemDetail` takes `app`).
- **Owner contracts.** A contract built here for another app follows that app's design: its package, its record and
  service names, its Shared screen and its capability groups. A change found while building it is written into the
  owner's design. The owner's own screens stay with the owner.
- **Mantle callers stay compatible.** Existing callers of these services keep working:
  - `get#ProductPrice`
  - `create#VariantProducts`
  - `create#OrderItem` and `add#OrderProductQuantity`
  - `delete#Product`
  - the content services

  Mantle's specs pass unchanged, including OrderProcureToPayBasicFlow's supplier prices of 9.00 and 8.00.
- **Done for a phase** means all of these:
  - impl-projects §2 "Done":
    - cargo tests for the touched crates, with goldens reviewed;
    - the new Mantle specs passing under `./moq test mr-mantle`;
    - `./moq test mr-boss` passing, with AppStructure covering the new screens and Products in its non-placeholder
      list;
    - `moqui lint --screens` clean for BOSS with the Debug binary;
    - screenshots light and dark at 390, 1280 and 1440 px;
    - the inventories' **Implemented in** columns;
  - the `ProductsAccess` spec extended to the phase's services and mounts;
  - the phase's walk in §8;
  - its row and **Built** note here.

## 3. Phases

| Phase | Repos | Screens | Status |
| --- | --- | --- | --- |
| P0 Checks | all (read) | — | checked Oct 28 (§6 F1–F33); review merge 9de723 |
| P1 Foundation | Mantle, BOSS | the Products root and menu | — |
| P2 Products and Product360 | Mantle, BOSS | Home, Products, Product360 and its catalog tabs, Settings | — |
| P3 Categories and features | mr-moqui, Mantle, BOSS | Categories, CategoryDetail, Features, FeatureDetail, FeatureGroups, FeatureGroupDetail, FeatureInteractions | — |
| P4 Variants | Mantle, BOSS | VariantBuilder, VariantSettings | — |
| P5 Prices and price lists | Mantle, BOSS | Prices, PriceHistory, PriceLists, PriceListDetail, PriceExplain, PricingSettings | — |
| P6 Supplier prices | Mantle, BOSS | SupplierPrices, Supplier360 | — |
| P7 Stock and facility policy | Mantle, BOSS | InventoryAvailability (Product360's Stock tab) | — |
| P8 Methods | Mantle, BOSS | BillOfMaterialsDetail, BillOfMaterialsExplosion, BillOfMaterialsCompare, WhereUsed, RoutingDetail | — |
| P9 Standard costs | Mantle, BOSS | StandardCosts, CostRollup, CostHistory | — |
| P10 Documents and translations | Mantle, BOSS | Documents, DocumentDetail, CategoryContent, Translations | — |
| P11 Units, packaging and labels | mr-moqui, Mantle, BOSS | Units, Packaging, Labels, IdentificationTypes | — |
| P12 Import | BOSS | ProductImport | — |
| P13 Catalog checks | BOSS | CatalogChecks | — |
| P14 Finish | BOSS | — | — |

### P0 — Checks

Checked Oct 28 against the current framework, Mantle and read-only Marble source. F1–F25 remain the baseline;
F26–F33 below close the remaining checks. The documentation-only review branch was integrated as `9de723` after
checking its diff contained only the ten review documents. No executable changes in this phase. Validation: source
cross-checks, review-document presence and `git diff --check`.

### P1 — Foundation

- **PRD-ACCESS.**
  - The user groups of design §1.1 (crosscut §1.4).
  - The other apps' groups that P7–P9 check, seeded without those apps' launchers:
    - `BOSS_WAREHOUSE_STOCK_PLANNER` and `BOSS_WAREHOUSE_MANAGER`;
    - `BOSS_MANUFACTURING_READ`, `BOSS_MANUFACTURING_METHOD`, `BOSS_MANUFACTURING_METHOD_APPROVE` and
      `BOSS_MANUFACTURING_ADMIN` (work centers);
    - `BOSS_ACCOUNTING_GL`.
  - The Products root's authz comes out of BossSetupData's not-yet-implemented block (F21).
  - `ironstone.products.CatalogServices` access: it checks the user's organizations and the product's owner, shows
    `_NA_` as shared, and allows read or write by grant. Every later Products service and shared mount calls it.
- **The Products root.**
  - The menu, with the placeholders renamed to §1.2 and Units added.
  - `<shell-providers>`: the `MantleProduct` palette type and the exact-ID palette source over `find#ProductByIdValue`.
  - The `products` key scope.
  - `get#RecordLink` opens products and categories under Products for its users.
- **Products demo data.**
  - `BossProductsDemoData.xml` builds on Mantle's `ZcaProductDemoData.xml`: the DEMO_* products, the DEMO_VAR 3 × 4
    variants, the DEMO_PA kit and the ZiddlemanInc offers. It adds owners, statuses, identifiers and product parties as
    the phases need them.
  - `BossUsersDemoData.xml` gains a user per grant, and a catalog reader with no other launcher.
- **Specs.**
  - `ProductsShell`: the menu per grant, the palette, record links.
  - `ProductsAccess`: started, covering owner scope and grants through the services.
- **Usable when:** the Products menu renders for each grant. A catalog reader sees the shared products and their own
  organization's products, but not another organization's, in lists, the palette and record links.

### P2 — Products and Product360

- **PRD-LIFECYCLE.**
  - The `PrdDraft`, `PrdActive`, `PrdDiscontinued` and `PrdObsolete` items of the `Product` status type, and their
    flow.
  - `ironstone.products.CatalogServices.transition#ProductStatus`; activation validates the required data.
  - `mantle.product.ProductServices.check#ProductUsable`, called by Mantle's `create#OrderItem` and
    `add#OrderProductQuantity` for Sell and Purchase. A null status reads as Active or Discontinued from the dates.
  - Audit log on `Product` `statusId`, `productName` and `salesDiscontinuationDate`.
- **Home** (design §3): CatalogSummary, with the counts of later phases null; RecentProducts; Shortcuts; MyActivities.
- **Products** (design §3):
  - ProductFind, with the keyword over the `MantleProduct` document, an ID and name fallback when the index is
    unavailable, and party item codes;
  - the seeded saved finds, and the board;
  - NewProduct;
  - delete of unused drafts only, through `delete#Product` (F16).
- **PRD-BULK** for BulkCategory and BulkFeature: a snapshot selection, and a result per product.
- **`Shared/Product360`** (crosscut §3.5), with the Products context and the tabs of design §3 that need no later
  phase:
  - Summary.
  - Variants & features: features, with variants listed.
  - Categories.
  - Identifiers: a store service that enforces `idValue` uniqueness, the first part of PRD-IDENTIFIERS.
  - Dimensions & units: `ProductUomDimension`, with `ProductDimension` read only.
  - Documents, through the existing content services.
  - Associations: substitutes; it refuses `PatMfgBom` and `PatPackagingFor`.
  - Parties (ProductParties).
  - Kit components, through PRD-KITS `store#KitComponent`.
  - Connections (`ProductConnections`).
  - History.
  - The equipment templates' meters and maintenance.
  - Clone with chosen sections.

  The Prices, Suppliers, Stock, BOM and Costs tabs are added by their phases.
- **Settings:** CatalogSettings (PRD-SETTINGS): defaults, required fields, ID policy.
- **PRD-SHELL:** the palette's authorized text find over names and party item codes (F7), and quick create Product.
- **Usable when:**
  - an editor creates a draft product, fills its required data and activates it, then adds identifiers and a
    customer's item code;
  - the editor defines a three-component kit, and its availability shows (§12.3 #10, first half);
  - a bulk category change on several products reports one named failure;
  - an obsolete product's sales and purchase order lines are refused with the status named, while its open orders are
    unchanged (§12.3 #9, the order lines).

### P3 — Categories and features

- **Framework:** `view-tree` occurrence keys, so one record can sit under several parents and a move names the parent
  edge. In qvt, html and tui, with the gallery's Views (F9).
- **PRD-TAXONOMY.**
  - The guarded category-rollup service and `ironstone.products.CategoryServices.move#CategoryParent`: cycles are
    refused across effective dates, and branch counts are deduplicated.
  - The `PctTag` category type, Product360's ProductTags chips, and ProductFind's tag filter.
- **Screens.**
  - Design §5: Categories and CategoryDetail. CategoryDetail's Content tab comes in P10.
  - Design §6: Features, FeatureDetail, FeatureGroups, FeatureGroupDetail and FeatureInteractions, with
    `store#FeatureInteraction` and `preview#FeatureInteractions`. There is one rule per feature pair.
  - Quick create Category and Feature.
- **Usable when:**
  - a category is placed under two parents, one dated parent edge moves, a cycle is refused, and branch counts count
    each product once (§12.3 #2);
  - a product-scoped interaction for a pair already ruled elsewhere is refused, naming that rule.

### P4 — Variants

- **PRD-VARIANTS.**
  - `mantle.product.ProductServices.preview#VariantProducts`.
  - `create#VariantProducts`, extended:
    - selected feature sets, with the legacy all-combinations call unchanged;
    - one canonical feature set per virtual product;
    - idempotent retry;
    - a result per combination;
    - interactions checked.
  - `get#VariantProductsInfo` filled in (F6).
- **PRD-VARIANT-UI.** VariantBuilder is a `.qvue` (setup, paged two-axis matrix, results) with an XML terminal twin of
  full write parity. Phones get the paged list.
- **VariantSettings:** the batch limit (default 1,000) and the copy allowlist.
- **Usable when:** §12.3 #1.

### P5 — Prices and price lists

Built in two parts: P5a the price rows, then P5b the lists, rules and resolver.

- **P5a.**
  - PRD-PRICE's three write services:
    - `mantle.product.PriceServices.store#ProductPrice`, which checks direction, equal-precedence overlap, no pack unit
      in `quantityUomId`, and the grant for the direction;
    - `replace#ProductPrice`;
    - `expire#ProductPrice`.
  - Audit log on `ProductPrice` `fromDate`, `thruDate` and `minQuantity`.
  - Design §7 screens:
    - Prices;
    - PriceHistory: PriceChanges, and TransactionPriceStatistics over `get#PriceHistoryInfo` (F14);
    - BulkPrice, with `preview#PriceChanges` and `apply#PriceChanges`.
  - Product360's Prices tab.
  - Notices of approved price changes and expiring prices.
- **P5b.**
  - The `ProductPriceList` and `ProductPriceRule` records.
  - The resolver extended:
    - organization, quantity UOM, list and agreement context;
    - the direction fix (F3);
    - the explain trace;
    - availability and source flags;
    - anonymous callers get the public price only;
    - the modifier interface gains context and the trace.
  - `OrderItem.priceListId`, `priceRuleId` and `priceRuleVersion`, stored by `create#OrderItem` and
    `add#OrderProductQuantity`.
  - `Shared/PriceLists`, `PriceListDetail` and `PriceExplain`, with the Products row of their per-app table.
  - PricingSettings.
  - The effective price list print.
- **Usable when:** §12.3 #4, except the standard estimate as a base and the margin, which come in P9.

### P6 — Supplier prices

- **Screens** (design §8):
  - `Shared/SupplierPrices`, with its Products row and its Product360 and Supplier360 embeds, and SupplierPriceBulk;
  - Product360's Suppliers tab;
  - `Shared/Supplier360` (crosscut §3.3), with the Products context: Overview and contacts, Products & prices,
    Documents. Finance details are hidden.
- **Palette:** supplier item codes.
- **Usable when:**
  - one supplier's offers to two buying organizations show their roles, quantity unit, pack size and lead time on
    Product360, Supplier360 and SupplierPrices (§12.3 #3, without Purchasing's view);
  - a price editor without the supplier-price grants sees none of them.

### P7 — Stock and facility policy

These are Warehouse's contracts (§4), built to design-warehouse StockPolicies and WH-POLICY.

- **CX-FACILITY-POLICY:** `mantle.facility.FacilityServices.store#ProductFacilityPolicy`, the one writer of
  `ProductFacility` and `ProductFacilityLocation`.
- **WH-POLICY, the tracking part:**
  - `mantle.facility.WarehousePolicy` tracking records, with organization, facility and product scope;
  - `mantle.facility.WarehousePolicyServices.store#TrackingPolicy`.

  The operation and reservation policies stay Warehouse's.
- **`Shared/InventoryAvailability`** (crosscut §3.7), mounted as Product360's Stock tab.
  - The Products row shows Summary, Projection and Policy, over `get#AvailableInventory` and
    `get#InventoryProjectedInfo`.
  - A user without cost access sees quantities without valuation.
- **Usable when:**
  - a stock planner without the Warehouse launcher sets a product's minimum stock, reorder quantity and lot-required
    exception from Product360/Stock;
  - a catalog editor is refused.

### P8 — Methods

These are Manufacturing's contracts (§4), built to design-manufacturing §5 and §12.

- **CX-METHOD (M3).**
  - Records:
    - `mantle.product.bom.ProductBom`;
    - `ProductBomVersion`, with `ProductBomVersionContent`;
    - `ProductBomItem`, with `applicabilityFeatureIds`;
    - `mantle.work.production.RoutingVersion` and `RoutingVersionOperation`.
  - `mantle.product.BomServices`: `find#Boms`, `store#Bom`, `store#BomVersion`, `store#BomItem`,
    `validate#BomVersion`, `release#BomVersion`, `get#BomExplosion`, `compare#BomVersions` and `get#BomWhereUsed`.
  - `mantle.work.RoutingServices`: `store#RoutingVersion`, `store#RoutingOperation`, `store#RoutingResource` and
    `release#RoutingVersion`.
  - The import of a manufactured product's `PatMfgBom` rows into a draft version. Kits are skipped.
- **CX-WORKCENTER (M5),** only the part the roll-up needs: `WorkCenter` and `WorkCenterRate`, `store#WorkCenter` and
  `get#OperationCostBasis`. Capacity, alternates and load stay Manufacturing's.
- **Screens.** The Shared screens of Manufacturing §5 (BillOfMaterialsDetail, BillOfMaterialsExplosion,
  BillOfMaterialsCompare, WhereUsed, RoutingDetail), with the Products context, mounted as Product360's BOM tab
  (design §3). Their cost columns wait for P9.
- **Usable when:**
  - a method engineer without the Manufacturing launcher imports DEMO_1_1's legacy BOM into a draft, adds a routing
    with a work-center rate, releases both, explodes them, and compares two versions;
  - WhereUsed lists the DEMO_PA kit read only, and the kit is never offered as a BOM (§12.3 #10, second half).

### P9 — Standard costs

- **PRD-COST.**
  - `mantle.product.cost.ProductStandardCost`, keyed by `productStandardCostId` and `versionSeqId`, and
    `ProductStandardCostComponent`.
  - `mantle.product.CostServices`:
    - `find#ProductStandardCosts`;
    - `store#ProductStandardCost` and `store#StandardCostComponent`;
    - `approve#ProductStandardCost`;
    - `preview#ProductCostRollup`, the one cost calculator, and `save#ProductCostRollup`;
    - `get#ProductCostHistory`.
  - The audited self-approval setting (design §16).
- **Screens and outputs.**
  - Design §7: StandardCosts, CostRollup and CostHistory.
  - Product360's Costs tab.
  - BillOfMaterialsExplosion's cost columns.
  - Margin on Prices, Product360 Prices and PriceExplain, for a user with both price and cost read.
  - The approved estimate as a price-list base.
  - `OrderItem.standardCost` set from the approved estimate.
  - The cost estimate print.
- **Accounting's contract** (§4, AC-07).
  - `ironstone.accounting.AssetBookServices.preview#Revaluation` and `post#Revaluation`: value only, with ledger links,
    in an open period, and never calling `update#ProductAcquireCost`.
  - The ValuationAdjustment and PostRevaluation dialogs of `Shared/InventoryValuation`, which StandardCosts' Request
    revaluation opens.

  The rest of InventoryValuation stays Accounting's.
- **Usable when** (§12.3 #5):
  - changing an approved estimate leaves asset values and the ledger as they were, until a GL user posts a revaluation
    from it;
  - P8's version rolls up with scrap and routing costs;
  - a changed input invalidates the preview;
  - an incomplete estimate cannot be approved;
  - an estimate's drafter cannot approve it unless the setting allows.

### P10 — Documents and translations

- **PRD-CONTENT.**
  - Revision guards on Mantle's product and category content update services, with F15's `contentLocation` fix.
  - Translation review against the source version.
  - `ironstone.products.CatalogServices.store#CatalogTranslation`.
- **Screens and outputs.**
  - Design §9: Documents (list and cards), DocumentDetail and Translations.
  - Design §5: CategoryContent, as CategoryDetail's Content tab.
  - The product datasheet print.
- **Usable when** (§12.3 #6, for documents):
  - a multi-file upload names each failure and keeps the rest;
  - two editors of one text get a conflict, with both versions kept;
  - a source edit flags its translations for review.

### P11 — Units, packaging and labels

- **Framework** (F18).
  - The symbologies P0 settles, in `crates/moqui-lib/src/barcode.rs` and `ec.resource` beside `code128Svg`.
  - A GS1 parse shared with Warehouse's scanning.
  - Labels through `html-print` and PDF, and to a printer where the `print` feature is built.
- **PRD-UOM** (F20).
  - Units and Conversions, written by the framework `ADMIN` group only.
  - Currency units and rates are excluded on either side.
  - Conversions are validated.
- **PRD-PACKAGING** (F12).
  - `ProductAssoc.quantityUomId`, `store#ProductPackaging` and `resolve#ScannedProduct`.
  - Design §10 Packaging.
  - Product360's packaging pane, if §5's question is answered yes.
- **PRD-IDENTIFIERS policy:** IdentificationTypes, with `ironstone.products.LabelServices.validate#ProductIdentifier`.
- **PRD-LABELS:** Labels, with `prepare#ProductLabels` and `render#ProductLabels`.
- **Usable when:** §12.3 #7 and #11.

### P12 — Import

- **PRD-IMPORT.**
  - The import run and row records, in BOSS's first `entity/` file (F19).
  - `ironstone.products.ImportServices`: `stage#`, `map#`, `validate#`, `apply#` and `get#CatalogImport`.
  - Each row goes through the domain service of P2–P6, for products, identifiers, category memberships, features,
    prices and supplier prices.
- **ProductImport:** the wizard, the error CSV, resume, and the completion and failure notices.
- **Usable when** (§12.3 #6, for imports): mixed valid and invalid rows apply the valid ones, and a resumed retry
  writes nothing twice.

### P13 — Catalog checks

- **PRD-VALIDATION:** `ironstone.products.CatalogServices.validate#Catalog`, with design §11's checks, each record on
  its own.
- **CatalogChecks** and Home's incomplete card.
- Activation and import call the same checks.
- **Usable when:** each issue planted in the demo is reported with its evidence, and a record that cannot be read does
  not stop the others.

### P14 — Finish

- The terminal twins, and the server-static pass.
- The §12.3 #8 walk. A Products user with no other launcher is refused cost, finance, stock posting and other
  organizations' records, through URLs, shared contexts, imports, exports and search.
- The §13 outputs not built earlier.
- The inventories' **Implemented in** columns, the design's Impl column, and Remaining-Work.

## 4. Decisions

These are made before and during the build. Each one that changes the design is also written into design-products.md,
or into the owner's design.

| Date | Decision | Notes |
| --- | --- | --- |
| Oct 28, 2026 | Phase order: the catalog first; then the other apps' contracts that Product360 and the roll-up need; then documents, units, import and checks | The user's call |
| Oct 28, 2026 | Products builds the parts of other apps' needs it depends on: Warehouse's `store#ProductFacilityPolicy` and TrackingPolicy (P7); Manufacturing's versioned methods, with the five shared method screens and `get#OperationCostBasis` (P8); Accounting's `preview#` and `post#Revaluation`, with their two dialogs (P9). These keep the owner's names, packages and Shared screens. The rest of each need, and the owner's own screens, stay with the owner | The user's call. The alternative was tabs that wait for their apps |
| Oct 28, 2026 | The shared screens Products builds first carry the Products context only. Another app's context is added when that app is built, as InvoiceDetail and OrderDetail were in Projects | Follows from the above |

Decisions confirmed with the user before implementation:

- Keep `BOSS_PRODUCTS` as the root user group and artifact group; they are different entities.
- Root filter `MANTLE_ACTIVE_ORG`; services independently verify membership/owner/capability, including when no org is active.
  Shared `_NA_` records are readable; shared master writes require framework `ADMIN`.
- Versioned structured Mantle settings records, not serialized 255-character `PartySetting` values.
- Add nullable `salesAllowed`/`purchaseAllowed` (legacy null means allowed), traced virtual-product feature extras, and the Product360 packaging pane.
- Interactive variants default to 1,000, configurable downward; larger runs use durable batches introduced in P4 and reused in P12.
- Self-approval is an audited organization setting, off by default; enabling it still requires cost-approval authority.
- Manual/internal identifier generation first; external GS1 allocation remains later.
- Price REST keeps its URLs, guards reads, routes POST/PATCH through validated services and DELETE through expiration.
- Search fallback reports unavailability; no framework lag reporting is added.
- Labels include Code 128, EAN-13, UPC-A, EAN-8, ITF-14, GS1-128, QR and DataMatrix, with browser/PDF and existing IPP printing.
- After each phase passes its checks, commit it separately in each affected repo and record its commit IDs here.

## 5. Open questions

| Question | Decides | Notes |
| --- | --- | --- |
| Further issues discovered during implementation | the affected phase | Record findings and decisions here; the original open choices are resolved below |

Merging duplicates (`merge#Product`, design §16) is `later`, there and in §7.

## 6. Findings

Design assumptions found wrong or unstated in the code, with the resolution. Where a resolution changes the design, it
is written there too.

| # | Finding | Resolution |
| --- | --- | --- |
| F1 | P0: no entity filter covers ProductPrice, ProductAssoc, ProductParty, ProductContent, ProductIdentification or any other child row of a product. `MANTLE_USER_ORG` filters Product, ProductCategory and ProductFeature by owner and drops `_NA_`; `MANTLE_ACTIVE_ORG` keeps `_NA_` | Catalog rows go through services (§2). The root's filter set is §5's first question |
| F2 | P0: the Zca demo's SA, RM, EQUIP and DIG products, the Popc categories and all ten features have no owner (`_NA_`), so `MANTLE_USER_ORG` hides them | The BOSS demo gives owners where a spec needs one; `_NA_` stays for shared records |
| F3 | P0: `get#ProductPriceByType` matches on no direction, `quantityUomId`, `agreementId` or `termUomId`, so a sales row with no vendor can answer a lookup that passes a supplier's `vendorPartyId`. `get#ProductPrice`'s agreement parameters are TODO comments | P5b fixes direction and adds agreement matching; P0 checks every caller |
| F4 | P0: the `ProductPriceModify` hook runs, but no rows are seeded | P5b's list modifier is its first row |
| F5 | P0: no ProductPrice store service exists. Rows are written by entity-auto in mr-marble `EditPrices.xml`, by `mantle.rest.xml` entity CRUD and by `clone#Product` | `store#ProductPrice` (P5a); the REST path is a §5 question |
| F6 | P0: `create#VariantProducts` makes every combination of the selectable features, answers nothing and reads no `ProductFeatureIactn`. `create#VariantProduct`'s existing-variant check ignores dates and application type. `get#VariantProductsInfo` is a stub (TODO). `find#ProductFeatureGroups` reads an undeclared `productFeatureGroupIdSet` and does not deduplicate | P4 |
| F7 | P0: `find#ProductByIdValue` answers no product when several identifiers match, and searches no party item codes and no `ProductOtherIdentification` | The palette's text find (P2) and `resolve#ScannedProduct` (P11) |
| F8 | P0: the `MantleProduct` document has no status, product parties or party item codes, and indexes the old `ProductDimension`. Scripts can ask `ec.search.isAvailable()`, but nothing reports index lag | P2 extends the document; staleness is a §5 question |
| F9 | P0: `view-tree` keys a row by its first key field and shows it under one parent only | P3's framework occurrence keys |
| F10 | P0: the `Product` status type has no items. Only `Product.ownerPartyId` and `ProductPrice.price` are audit-logged. `update#OrderItem`'s re-price and `recalc#OrderItemAmount` leave `productPriceId` as it was | P2 (status, Product audit), P5a (ProductPrice audit), P5b (provenance kept on a re-price) |
| F11 | P0: there is no ProductStandardCost, not even commented out (the commented block is CostComponent and ProductAverageCost). `AssetStandardCost` is active and unused | P9's new records. The design's "refine commented concepts" reads as new records |
| F12 | P0: `ProductAssoc` has no `quantityUomId`, and nothing reads `PatPackagingFor` | P11 |
| F13 | P0: `get#ProductBomDetail` reads `PatMfgBom` with no date filter | P8's import filters by date; kits keep their reader |
| F14 | P0: `get#PriceHistoryInfo` is order-line price history over the search documents, not ProductPrice history, and it needs search | PriceHistory labels it as transacted prices and says when search is unavailable (P5a) |
| F15 | P0: `create#ProductCategoryContent` writes text content when no file is given, overwriting a passed `contentLocation`. `ProductCatalogServices.spec.js` passes `productCategoryContentTypeEnumId` for `categoryContentTypeEnumId` | P10 |
| F16 | P0: `delete#Product` deletes variants and every related row with `deleteWithRelated` | Products deletes only unused drafts (P2) |
| F17 | P0: `clone#Product` copies `ProductDimension`, not `ProductUomDimension`, and no `ProductOtherIdentification` | P2's clone with sections |
| F18 | P0: the framework draws Code 128 only, as SVG (`moqui-lib` `barcode.rs`). There is no EAN/UPC, GS1 or QR (left out for licensing). The `print` feature (IPP) is only in the enterprise and maximal builds. PDF is headless Chromium | P11; P0 settles the symbologies |
| F19 | P0: the work-item and contact imports keep nothing between steps; the forum import is the only durable import model | P12's records |
| F20 | P0: the framework has entity-auto `create#` and `update#UomConversion` and `convert#Uom`, but no unit screens and no `ADMIN` guard | P11 |
| F21 | P0: the `BOSS_PRODUCTS` authz sits in BossSetupData's commented not-yet-implemented block. There is no Units placeholder, and the root has no `<shell-providers>` | P1 |
| F22 | P0: crosscut §1.4 names `BOSS_PRODUCTS` as the root user group, but BossSetupData already uses it as an artifact group (with `BOSS_PRODUCTS_ADMIN` as an artifact authz id) | A §5 question |
| F23 | P0: `example/test/gallery-shots.mjs` was removed (67df2c1e, Oct 26) for `moqui test-client example --serve --spec GalleryShots`, which shoots 1280 in light and some screens at 390 and in dark | A BOSS client spec on that pattern (§2) |
| F24 | P0: `OrderItem.standardCost` exists and is audit-logged; its description is purchase accounting cost | P0 checks it before P9 sets it on sales lines |
| F25 | P0: the review the design cites (`review-core-apps.md`, with its R- IDs and §4.1 steps) is only on branch `review-core-apps` (0e53a04) | A §5 question |
| F26 | P0: `get#OrderProductPrice` derives parties from OrderPart/store; `check#OrderPreApprove` calls the type resolver for sales min/max; Marble QuickItems omits vendor; procure-to-pay directly passes external vendor/internal buyer and expects 9.00/8.00 | P5b infers legacy direction from party roles and preserves default public sales lookup; regression specs unchanged |
| F27 | P0: REST has raw price GET/POST/PATCH/DELETE, and Marble Catalog uses entity-auto writes; clone also copies raw prices | REST uses guarded services in P5; Products clone goes through the domain writers; Marble source stays read only |
| F28 | P0: PartySetting.settingValue is text-medium (255); structured defaults also need versions | Add Mantle catalog settings records in P2; no field widening |
| F29 | P0: view-tree keys by the first key field; existing children/ancestor/move protocols assume record identity | Add optional occurrence/parent-occurrence fields with legacy defaults, keeping category edge identity in move payloads (P3) |
| F30 | P0: barcode.rs has a reusable linear SVG renderer; script API exposes code128Svg. qrcodegen 1.8.0 declares MIT and datamatrix 0.3.3 Apache-2.0 OR MIT (both allowed by deny.toml) | Add linear encoders, QR/DataMatrix wrappers and shared GS1 parsing in P11; run dependency gate; no printer-driver subsystem |
| F31 | P0: OrderItem.standardCost is consumed by AssetServices receipt acquisition and CarrierServices; no sales-cost meaning exists | Preserve purchase semantics; approved estimates populate sales snapshots only (P9) |
| F32 | P0: ProductFacility/Location already own reorder/location fields, with no tracking fields; proposed BOM versions, WorkCenter/Rate and AssetBookEvent do not exist. LedgerServices.post#AcctgTrans checks fiscal periods | P7 uses WarehousePolicy tracking records; P8 uses new immutable versions beside legacy templates; P9 requires configured accounts/open periods and value-only events, never receipt rewrites |
| F33 | P0: Commons tasks already support assigned WetTask rows and generic WorkEffortRecord links | Catalog-review activities are assigned tasks linked to catalog records; no parallel activity model |

## 7. Later

Designed, not in this build:

- **The design's `later` rows:** Configurations, ConfigurationDetail, ChangeNotices and ChangeNoticeDetail, with
  PRD-CONFIGURATION and PRD-CHANGE (design §4, §14).
- **Other design items:** `ProductGeo` (design §15), `merge#Product` (§16) and Commerce merchandising (§3).
- **Other apps' contexts:**
  - the Purchasing, Warehouse, Manufacturing, Accounting and Customer Service rows of the shared screens Products builds
    (crosscut §3.5, §3.7, §3.21, §3.23);
  - the Sales and Commerce rows of the price screens.
- **Callers of `check#ProductUsable`** that are proposed services of other apps: `run#SupplyPlan`,
  `convert#PlanningSuggestions`, reorder rules, `create#ProductionOrder` and `release#ProductionOrder`.
- **The rest of the other apps' needs.**
  - CX-POSTING: `enteredQuantity`, `enteredQuantityUomId` and `appliedConversionFactor`.
  - Warehouse: `repack#Asset`, `generate#TrackingIdentities`, and the rest of WH-POLICY.
  - Purchasing: `publish#SupplierQuotePrice`.
  - Manufacturing:
    - production's use of released versions (run snapshots, and `create#ProductionOrder` moved off
      `get#ProductBomDetail`);
    - WorkCenter capacity, alternates and load;
    - its BillsOfMaterials, Routings and OperationTemplates screens.
  - Accounting: the InventoryValuation report, and CostDataRepair.
- **Other:** a GS1 company-prefix provider (§16); pivot and graph views (design §3); a global matrix widget
  (PRD-VARIANT-UI).

## 8. Verification

- **Per phase,** the "Done" rule of §2 and the phase's "usable when".
- **End to end,** run `./moq run`, sign in as `john.doe` and as each demo catalog user, and walk each built phase's
  "usable when" in order.
- **Design §12.3**, scenario by phase:

| Scenario | Phase |
| --- | --- |
| 1 Variants from a selected matrix | P4 |
| 2 Multi-parent categories and bulk results | P3 (bulk results P2) |
| 3 Supplier prices for two buying organizations | P6 |
| 4 Price explanation | P5b; the standard estimate as a base, and the margin, in P9 |
| 5 Estimates apart from valuation, and the roll-up | P9, on P8's methods |
| 6 Imports and documents | P12, P10 |
| 7 Scans, packs and labels | P11 |
| 8 Products alone, the rest denied | P14 (ProductsAccess in every phase) |
| 9 Obsolete products refused | P2 (order lines); the other callers are in §7 |
| 10 Kits | P2 (availability, and assembly through `produce#AvailableAssemblies` until Warehouse Pack exists); P8 (never a BOM) |
| 11 Unit and currency writes refused | P11 |

- **Screenshots** through the BOSS client spec of §2, light and dark.
