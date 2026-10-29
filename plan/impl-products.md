# IronStone BOSS — Products implementation

Oct 29, 2026 — P0–P14 built and validated

How [design-products.md](design-products.md) gets built, in phases from the foundation to the catalog checks, each
ending tested and usable. This file is kept at a high level, as [impl-projects.md](impl-projects.md) was: each phase
names its scope by the design's sections and §14 needs rather than restating them, and the design stays the place for
screen and record detail. During the build this file is the log: phase status and what each built, the decisions made,
open questions, findings against the code, and what is deferred.

At the start, `screen/Products/` held placeholders only (Home, Products, Categories, Features, Pricing, Suppliers,
Documents, Settings), and the `BOSS_PRODUCTS` authz was commented out. At that point none of the design's proposed
services, entities, fields or status items existed in Mantle or BOSS. P1–P14 are now built below. Products is the first core ERP app built, so Warehouse, Manufacturing, Accounting and Purchasing are
placeholders too.

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
  - Mantle stands without BOSS (added Oct 28, a hard rule; §4);
  - business logic leans to Mantle (added Oct 28; §4);
  - the new XML element checklist of style-guide §8.1;
  - libraries through `libs/refresh.mjs`, and crates against `deny.toml`;
  - the `.qvue` gallery pattern;
  - parties by role;
  - changes by effective date and the audit log (added Oct 28, from P4 on; §4);
  - demo data;
  - builds and commits.

  Screenshots come from a BOSS `test/client` spec on the pattern of example's `GalleryShots.spec.js`, run with
  `moqui test-client mr-boss --serve` (F23).
- **Catalog rows through services.** No entity filter covers a product's prices, associations, parties, content or
  identifiers (F1). Products reads and writes them only through services: `ironstone.products.CatalogServices` checks
  the product's owner and the Products grant, then the Mantle store service runs (below).
  - `entity` in a design form summary means that guarded path, never a bare entity form (design §14).
  - Grants are checked in the services, so they hold for imports, exports, search, the palette and shared mounts.
- **Mantle checks for itself** (Oct 28; §4). A Mantle service Products builds checks its Moqui permission through
  `mantle/product/ProductAccess.js`, and the organization itself (`get#CatalogOwnerScope`, by party relationship). No
  Mantle service, script, data file or spec names a BOSS group, service, screen or setting. A Products screen or shared
  mount calls the Mantle service after `ironstone.products.CatalogServices`' check. A new service adds no same-named
  `ironstone` pass-through; the ones P8 and P9 built (`MethodServices`, `AssetBookServices`' revaluation) keep only
  the access check and the call. BossSetupData grants the permissions to BOSS groups with `UserGroupPermission` rows.
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
- **Owner contracts.** A contract built here for another app follows that app's design: its record and service names,
  its Shared screen, and the permissions its services check. Its rules are Mantle services in the package of the records
  they change; its BOSS part keeps only the owner app's access check, screen context and settings forms (Oct 28; §4).
  A change found while building it is written into the owner's design. The owner's own screens stay with the owner.
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
| P0 Checks | all (read) | — | checked Oct 28 (§6 F1–F33); review merge b00c2c7 |
| P1 Foundation | mr-moqui, Mantle, BOSS | the Products root and menu | built Oct 28; mr-moqui f9641cda, Mantle 6d548a3e; BOSS f1c2a37 |
| P2 Products and Product360 | Mantle, BOSS | Home, Products, Product360 and its catalog tabs, Settings | built Oct 28; Mantle 54e6619a; BOSS 0a06b7d |
| P3 Categories and features | mr-moqui, Mantle, BOSS | Categories, CategoryDetail, Features, FeatureDetail, FeatureGroups, FeatureGroupDetail, FeatureInteractions | built Oct 28; mr-moqui df8d2474, Mantle dddc0594; BOSS 774752a |
| P4 Variants | Mantle, BOSS | VariantBuilder, VariantSettings | built Oct 28; Mantle 2727c0ae; BOSS 86c6f09 |
| P5 Prices and price lists | Mantle, BOSS | Prices, PriceHistory, PriceLists, PriceListDetail, PriceExplain, PricingSettings | built Oct 28; Mantle 4d146af1 (P5a), d7663ecb (P5b); BOSS 0c78c9e (P5a), 776a73f (P5b) |
| P6 Supplier prices | Mantle, BOSS | SupplierPrices, Supplier360 | built Oct 28; Mantle 0e886690; BOSS ec0f17a |
| P7 Stock and facility policy | Mantle, BOSS | InventoryAvailability (Product360's Stock tab) | built Oct 28; Mantle 0716de75; BOSS c413cdd |
| P8 Methods | Mantle, BOSS | BillOfMaterialsDetail, BillOfMaterialsExplosion, BillOfMaterialsCompare, WhereUsed, RoutingDetail | built Oct 28; Mantle 4422dd44; BOSS 8e946df |
| P9 Standard costs | Mantle, BOSS | StandardCosts, CostRollup, CostHistory | built Oct 28; Mantle 5a18970e; BOSS 2a4abd6 |
| P10 Documents and translations | Mantle, BOSS | Documents, DocumentDetail, CategoryContent, Translations | built Oct 29; Mantle 83a1b96d; BOSS 100a56e |
| P11 Units, packaging and labels | mr-moqui, Mantle, BOSS | Units, Packaging, Labels, IdentificationTypes | built Oct 29; Mantle 11e998b7; BOSS ea046d5; framework prerequisites below |
| P12 Import | Mantle, BOSS | ProductImport | built Oct 29; Mantle f5d4a419; BOSS cc1d5b6 |
| P13 Catalog checks | Mantle, BOSS | CatalogChecks | built Oct 29 before P12; Mantle 6f070c9f; BOSS 042c2e3 |
| P14 Finish | Mantle, BOSS, mr-moqui docs | — | built Oct 29; Mantle 82a0e9ad; BOSS 366f9d1; mr-moqui bd1eca3c |
| R Review | Mantle, BOSS | all Products screens | reviewed and revised Oct 29 (R0–R6 below); Mantle c75836c3–2eac1b16, BOSS 82b0d3b–c51070d |

### P0 — Checks

Checked Oct 28 against the current framework, Mantle and read-only Marble source. F1–F25 remain the baseline;
F26–F33 below close the remaining checks. The documentation-only review branch was integrated as `b00c2c7` after
checking its diff contained only the ten review documents; P0 findings/defaults committed in `6387ea2`. No executable changes in this phase. Validation: source
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

**Built Oct 28 (P1).** Framework `f9641cda`, Mantle `6d548a3e`; BOSS f1c2a37. Composable Products grants plus the owner apps' grants; active-org root filters; trusted Mantle
`get#CatalogOwnerScope` and BOSS capability/record/find guards; a guarded read list and minimal product/category record
routes (P2/P3 expand them); exact-ID palette, catalog links and key scope; ten independent demo accounts; shared and
owned isolation fixtures. Catalog record-file/room callbacks enforce owner scope even with authorization disabled.
Catalog files also require catalog-editor authority for uploads, removal, new versions, restore and copies from Files,
regardless of which shared mount calls them. Legacy Mantle flow fixtures keep their owners and prices. The BOSS client write deny includes Products and the existing
Moderation `claim` verb; AppStructure/TuiRender include Products and the new Shared screen is classified in ClientIsolation.

P1 validation evidence:
- ProductsAccess and ProductsShell: all ten capability menus, real membership checks despite forged
  user context, shared writes refused, and hidden-owner identifiers/links refused. The final focused guard run also covers
  shared-file uploads through both Products and Commons: 68/68 features across ProductsAccess, ProductsShell, RecordFiles,
  ClientChatDrive and Chatter.
- Browser: 66/66 ProductsShots cases passed (all menu sections plus both record routes), light/dark at 390, 1280 and 1440;
  screenshots inspected, including the
  section/list/detail route and correct pagination. Artifacts `/tmp/products-p1-menu-browser`.
- BOSS full run before the heap prerequisite: 646/648 passed; ServerStatic and TuiRender hit the 64 MiB script heap.
  Both passed in a fresh process (3/3 features). The final full run, including the additional file-write regression,
  passes **649/649** (74 specs); artifacts `/tmp/products-p1-final` and `/tmp/products-p1-final.log`. Clean baseline BOSS also exhausts the heap, alongside pre-existing
  AppStructure/Moderation-deny failures; the two fixture gaps are corrected here.
- Mantle full run and a clean exported baseline each give exactly 690 passed, 2 failed, 9 skipped (701 features):
  InboxThreads expects an IBX team post absent from its account view; MantleSearch's full-suite facet total is zero
  against 83 results. The isolated baseline InboxThreads failure also reproduces. No existing Mantle specs changed.
- XML checks for new paths and service lint pass; BOSS screen lint is clean. Existing component-wide schema warnings
  are outside the Products paths. A pre-existing unused-parentheses Rust warning remains in archive_host.rs.
- Core Rust: 2,104 passed, 3 ignored; two unrelated locale-catalog tests fail because this checkout has no
  `runtime/component/mr-l10n/data/es`/`zh`. All 30 runtime tests, including real-allocation cache pressure and OOM recovery, pass.
- The framework prerequisite reclaims compiled caches at heap pressure before entering a script, keeps the existing
  hard limit, preserves live values, and does not replay scripts. Heap accounting is checked periodically to avoid walking
  the heap for every field expression.

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

**Built Oct 28 (P2).** Mantle `54e6619a`; BOSS `0a06b7d`. Mantle product statuses/flow, audited lifecycle fields and nullable sales/purchase flags;
private usage, identifier and dated-kit validators; checks on both order-entry paths, including increases of an existing
cart line. Existing orders remain unchanged. Kit availability retains zero as the minimum across all components.
Organization catalog settings are immutable structured revisions, with optimistic revision checks and an organization lock.

BOSS now has the catalog home, authorized structured/text find with an explicit unavailable-index fallback, curated saved
finds and a lifecycle/type board, draft creation and unused-draft deletion, and bulk category/feature actions over fixed IDs
with isolated transactions and named per-product outcomes. Shared Product360 has Summary, feature applications and variant
read, categories, primary/scoped identifiers, modern dimensions with legacy dimensions read only, typed content and record
files, substitutes in both directions, parties, kit components, restricted connections, audit history, and equipment meters
and maintenance. Kit/equipment navigation applies only to the corresponding product kinds. The selected-section clone
preserves modern/scoped data, remaps maintenance meters and independently copies document resources; external identifiers
must be reassigned. Document resource selection uses an authorized drive/path and makes an independent copy; arbitrary
server locations are refused. Settings, text/party-code palette search, and editor-only quick create use the same guards.

The later-phase cards remain unavailable rather than zero: price coverage in P5 and incomplete-catalog checks in P13.
New feature masters arrive in P3, variant generation in P4, stock/facility policy in P7, and revision-aware content,
translations and the document workspace in P10. P2's content editing uses the existing Mantle content services.
The shared connections projection requires the relevant existing app capability and parent-record visibility; it grants
no transaction access to a catalog-only user. Supplier-only item codes are omitted without supplier-price read authority and excluded from the public product search document; authorized supplier-code discovery uses a separate guarded query.

P2 validation evidence:
- Debug framework build succeeds against the pulled Dev AIDE changes; no framework source changes in this phase.
- BOSS full suite: **696/696** features (76 specs). Final targeted checks after the content/visibility hardening cover
  ProductsAccess, ProductsCatalog, ProductsScreens, ProductsShell, AppStructure and TuiRender; **85/85** pass (six specs), plus the 9/9 catalog service checks with the authorized drive-copy and public-index privacy cases.
- Mantle full suite: **693 passed, 2 baseline failures, 9 skipped** (704 features, 79 specs). The same InboxThreads account-view
  fixture and MantleSearch facet-total failures documented in P1 remain; all three new lifecycle/kit tests and the unchanged
  order-to-cash/procure-to-pay flows pass.
- Browser: 144/144 final screen captures, light/dark at 390, 1280 and 1440 px, in `/tmp/products-p2-browser-complete`.
  The real editor walkthrough creates, activates, assigns an identifier/customer code and finds by that code (1/1),
  `/tmp/products-p2-walk`. Representative phone/dark and desktop kit screenshots inspected. The final date/navigation polish adds 6/6 kit captures in `/tmp/products-p2-browser-dates` and 46/46 catalog/render checks in `/tmp/products-p2-dates`.
- Source XML checks: 13 touched paths, zero errors or warnings. BOSS screen expression lint has zero parse failures;
  shared tab mounts are explicitly included in AppStructure and TuiRender. Inventories updated for the actual P2 paths.
- The current framework loader also logs and skips the pre-existing `data/demo/contacts-google.csv` input because its
  contact-import header is not an entity/service name; it does not stop either suite.

### P3 — Categories and features

- **Framework:** verify `view-tree` occurrence keys through its existing `key-fields` protocol: the occurrence first,
  followed by the record and original dated-edge keys. In qvt, html and tui. Add optional `confirm-move` to qvt, shown
  in the gallery's Views, with explicit Move/Add-parent forms for terminal parity (F38).
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

**Built Oct 28 (P3).** Guarded category, feature and feature-group masters and relationship services; category
list/outline, record tabs, feature and group lists/details, interaction editing and preview; Category/Feature shell quick
create; scoped record links; Product360 tags and ProductFind tag filtering. Category identifiers use preview then an explicit
unique store. Category content stays P10.

The category outline uses a path occurrence ID alongside the real category ID and original parent/from-date edge key.
A move closes only that dated edge and creates its replacement; another parent stays. A catalog-wide graph lock protects
concurrent graph changes; cycle checks intersect effective intervals, overlapping duplicate parent edges are refused, and
branch membership counts use sets. Current edges can be ended; never-effective future edges can be removed. The selected
Move dialog provides terminal write parity. Browser drag/keyboard moves can opt into `confirm-move`, showing item and both
parents before posting; declining posts nothing. Existing trees keep their previous behavior.

Feature groups now have an audited owner, with existing null owners treated as shared alongside `_NA_`; the org filters,
record callbacks and links cover them. Shared master writes remain framework ADMIN only. Relationships are guarded by
the record they change: a parent edge belongs to its child category, a group membership to its group, a category default
to its category, and a feature application to its product. Referenced records must be readable. Distinguishing feature
meaning cannot change on active/used variants, but descriptions may be renamed. Feature meaning changes, applications and
activation share a lock. Create-and-apply uses one transaction and independently checks the product.

Private Mantle feature-interaction writers retain the pair key: a rule cannot be moved to another product scope, and a
reverse duplicate is refused. New dependencies are checked against applicable global/product-specific incompatible rules
through the dependency chain. Preview reports missing requirements and incompatible selections; inaccessible feature
references are omitted from the caller's result. Expiration and preview are included in the external client's deny pattern.

P3 validation evidence:
- BOSS final full suite: **764/764** features (78 specs); commit IDs are recorded below. New taxonomy service tests cover two parents, one-edge
  moves, effective-date cycles, deduplicated counts, owner isolation, shared/null-owner groups, feature meaning and atomic
  create/apply. AppStructure and TuiRender explicitly render every new detail tab with demo IDs.
- Mantle full suite: **695 passed, 2 baseline failures, 9 skipped** (706 features, 80 specs), including the two new
  feature-policy cases. InboxThreads and MantleSearch remain the same P1/P2 baseline failures.
- Core: **2,111 passed, 2 baseline locale failures, 3 ignored** with `--test-threads=1`. The parallel run additionally hit
  an existing shared temporary-service XML fixture race; that scheduler test passes alone and in the serial suite.
  The two missing `mr-l10n` catalogs remain outside this phase. All 38 server-static tests, both view renderer checks,
  the precompiled-component check and 21 offline list-view client cases pass. The two view goldens change only by adding
  the opt-in confirmation setting.
- Debug binary rebuilt successfully; source XML checks and screen lint checked. The new tree setting is documented in the
  XSD and webroot JS guide and demonstrated in Gallery/Views. HTML and TUI outlines preserve both occurrences.
- Browser: **126/126** final captures, light/dark at 390, 1280 and 1440 px, `/tmp/products-p3-browser-final`;
  **1/1** real editor walk, `/tmp/products-p3-walk-final2`, including an edge move that preserves another parent, cancellation
  at a keyboard-move confirmation, feature creation and group membership. Phone category outline/new-feature and desktop
  records inspected. The list count is placements, with the distinct-category count stated separately.

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

**Built Oct 28 (P4).** Mantle `2727c0ae`; BOSS `86c6f09`. Validation evidence was kept by the build session.

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
  - `OrderItem.priceListId` and `priceRuleId`, stored by `create#OrderItem` and `add#OrderProductQuantity`. Lists and
    rules are effective-dated rows with their key fields audit-logged, and a change ends a rule and starts another, so
    the stored rule pins what applied (impl-drawers-commons §4); no rule version field.
  - `Shared/PriceLists`, `PriceListDetail` and `PriceExplain`, with the Products row of their per-app table.
  - PricingSettings.
  - The effective price list print.
- **Usable when:** §12.3 #4, except the standard estimate as a base and the margin, which come in P9.

**Built Oct 28 (P5a, P5b).** P5a: Mantle `4d146af1`, BOSS `0c78c9e`; P5b: Mantle `d7663ecb`, BOSS `776a73f`. Validation
evidence was kept by the build session.

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

**Built Oct 28 (P6).** Mantle `0e886690`; BOSS `ec0f17a`. Validation evidence was kept by the build session.

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

**Built Oct 28 (P7).** Mantle `0716de75`; BOSS `c413cdd`. Validation evidence was kept by the build session.

### P8 — Methods

These are Manufacturing's contracts (§4), built to design-manufacturing §5 and §12, under the shared rule as §4 decides:
a BOM or routing "version" is its state as of a date, and a release is the decision that stamps it.

- **CX-METHOD (M3).**
  - Records:
    - `mantle.product.bom.ProductBom`, with its audit-logged method fields, and `ProductBomContent`;
    - `ProductBomItem`, effective-dated, with a stable `bomItemId`, `applicabilityFeatureIds` and audit-logged key
      fields;
    - the release decision, a record of its own (approver, time, reason and the lines it stamped);
    - routings: Mantle's `WepRouting` and `WepRoutingTask` WorkEfforts on dated `WeatRoutingComp` rows, their
      standards audit-logged.
  - `mantle.product.BomServices`: `find#Boms`, `store#Bom`, `store#BomItem`, `validate#BomDraft`,
    `release#BomDraft`, `get#BomExplosion` (an as-of date), `compare#BomDates` (two dates) and `get#BomWhereUsed`.
  - `mantle.work.RoutingServices`: `store#Routing`, `store#RoutingOperation`, `store#RoutingResource` and
    `release#RoutingDraft`.
  - The import of a manufactured product's `PatMfgBom` rows into draft lines. Kits are skipped.
- **CX-WORKCENTER (M5),** only the part the roll-up needs: `WorkCenter` and `WorkCenterRate`, `store#WorkCenter` and
  `get#OperationCostBasis`. Capacity, alternates and load stay Manufacturing's.
- **Screens.** The Shared screens of Manufacturing §5 (BillOfMaterialsDetail, BillOfMaterialsExplosion,
  BillOfMaterialsCompare, WhereUsed, RoutingDetail), with the Products context, mounted as Product360's BOM tab
  (design §3). Their cost columns wait for P9.
- **Usable when:**
  - a method engineer without the Manufacturing launcher imports DEMO_1_1's legacy BOM into a draft, adds a routing
    with a work-center rate, releases both, explodes them, changes a line and releases again, and compares the two
    release dates;
  - WhereUsed lists the DEMO_PA kit read only, and the kit is never offered as a BOM (§12.3 #10, second half).

**Built Oct 28 (P8).** Mantle `4422dd44`; BOSS `8e946df`. Validation evidence was kept by the build session.

### P9 — Standard costs

- **PRD-COST.**
  - `mantle.product.cost.ProductStandardCost`, keyed by `productStandardCostId` and effective-dated by organization
    and product (`fromDate`, `thruDate`), with its amounts audit-logged, and `ProductStandardCostComponent`. Approval
    starts the estimate's row and ends the one before it; no `versionSeqId` (impl-drawers-commons §4). The approved
    estimate's PDF is stored with it.
  - `mantle.product.CostServices`, checking `PRODUCT_COST_VIEW`, `PRODUCT_COST_ESTIMATE` and `PRODUCT_COST_APPROVE`,
    and `ACCOUNTING_VIEW` for finance values, through `CostPolicy.js`:
    - `find#ProductStandardCosts`;
    - `store#ProductStandardCost` and `store#StandardCostComponent`;
    - `approve#ProductStandardCost`;
    - `preview#ProductCostRollup`, the one cost calculator, and `save#ProductCostRollup`;
    - `get#ProductCostHistory`.
  - The audited self-approval setting (design §16).
- **The explosion and the roll-up** (§4, Q8).
  - P8's `get#BomExplosion` changes. The tree still shows every level, but requirements and buildable quantity stop at
    non-phantom sub-assemblies, so their on-hand counts. Phantoms are blown through with their routing. A
    `fullBlowThrough` parameter keeps the full blow-through for callers that want it.
  - The roll-up goes level by level: a non-phantom sub-assembly costs at its approved estimate, or is rolled in the
    same run in low-level-code order.
  - Its rules (F40). By-products follow `allocationShare`, else quantity, as Manufacturing P15 does. Overhead percent
    applies to material plus conversion, single level. The costing lot size is the BOM's `baseQuantity`, and setup is
    divided by it. Operation cycles round up, and work-center efficiency applies. Components keep `currency-precise`,
    and the total is rounded once.
- **Screens and outputs.**
  - Design §7: StandardCosts, CostRollup and CostHistory.
  - Product360's Costs tab.
  - BillOfMaterialsExplosion's cost columns.
  - Margin on Prices, Product360 Prices and PriceExplain, for a user with both price and cost read.
  - The approved estimate as a price-list base.
  - `OrderItem.standardCost` set from the approved estimate on sales lines, only when the customer is not an
    `OrgInternal` party (F41). The spec covers an intercompany order.
  - The cost estimate print.
- **Accounting's contract** (§4, AC-07 and Q7).
  - `mantle.ledger.AssetBookServices.preview#Revaluation` and `post#Revaluation`: new Mantle services behind their own
    flag, off by default and tested in both states; the post checks `ACCOUNTING_GL_POST`. `post#Revaluation` changes
    forward cost. It sets `Asset.acquireCost` on the on-hand assets from the effective date, without reposting history,
    and splits a partly issued asset. It posts one AcctgTrans for on-hand × delta, with asset links, in an open period,
    against a new seeded revaluation offset GL account type mapped with Accounting P2's mappings. It refuses negative
    on-hand, a date before the product's last posted movement and a future date, and never calls
    `update#ProductAcquireCost`.
  - The ValuationAdjustment and PostRevaluation dialogs of `Shared/InventoryValuation`, which StandardCosts' Request
    revaluation opens. They call the Mantle services; `ironstone.accounting.AssetBookServices` keeps only their screen
    context, `get#RevaluationContext`.

  The rest of InventoryValuation stays Accounting's.
- **Mantle without BOSS** (§2; §4, Q2).
  - The BOSS group names P5–P8 put in Mantle become permissions, checked through `ProductAccess.js`:
    `WarehousePolicy.js` checks `STOCK_POLICY_PLAN` and `STOCK_POLICY_MANAGE`; `MethodPolicy.js` the `METHOD_*` ones;
    `PricePolicy.js`, `PriceResolver.js` and `PriceLists.js` `PRICE_*`, `SUPPLIER_PRICE_*` and `PRODUCT_CATALOG_ADMIN`;
    cost reads `PRODUCT_COST_VIEW` and `ACCOUNTING_VIEW`. P9's `CostPolicy.js` uses them from the start.
  - P1's catalog record scope in `mantle.party.CommunicationServices` no longer names `BOSS_PRODUCTS`: as built, it
    applies the owner scope to every signed-in user. `PRODUCT_CATALOG_VIEW` is seeded and granted for catalog reads.
  - Mantle's specs that put users in BOSS groups (`ProductMethods`, `WarehousePolicy`, `ProductStandardCosts`) make
    spec-local groups holding the permissions, so `./moq test mr-mantle` needs no mr-boss data.
  - BossSetupData grants the permissions with `UserGroupPermission` rows to the Products groups and to the other apps'
    groups P1 seeded, each `_ADMIN` group holding what its app's groups hold.
  - P11 builds `resolve#ScannedProduct` in Mantle, which Warehouse's Mantle guards call.
- **Usable when** (§12.3 #5):
  - changing an approved estimate leaves asset values and the ledger as they were until a GL user posts a revaluation,
    which then changes the forward cost;
  - P8's version rolls up level by level, with scrap and routing costs;
  - a BOM with a by-product takes the by-product's share off the main product's cost;
  - a changed input invalidates the preview;
  - an incomplete estimate cannot be approved;
  - an estimate's drafter cannot approve it unless the setting allows;
  - `./moq test mr-mantle` passes with no BOSS group named in Mantle.

**Built Oct 28 (P9).** Mantle `5a18970e`; BOSS `2a4abd6`. The explosion's planning boundary (Q8) and the permission
conversion are in it: Mantle names no BOSS group or `ironstone` service, and BOSS's `AssetBookServices` revaluation
services only call Mantle's. Validation evidence was kept by the build session.

### P10 — Documents and translations

- **PRD-CONTENT.**
  - Revision guards on Mantle's product and category content update services, with F15's `contentLocation` fix.
  - Translation review against the source version.
  - `mantle.product.ContentServices` (new): `store#`, `upload#` and `restore#CatalogContent`, `store#CatalogTranslation`,
    and their reads. `ironstone.products.DocumentServices` keeps the screens' context and calls Mantle.
- **Screens and outputs.**
  - Design §9: Documents (list and cards), DocumentDetail and Translations.
  - Design §5: CategoryContent, as CategoryDetail's Content tab.
  - The product datasheet print.
- **Usable when** (§12.3 #6, for documents):
  - a multi-file upload names each failure and keeps the rest;
  - two editors of one text get a conflict, with both versions kept;
  - a source edit flags its translations for review.

**Built Oct 29 (P10).** Mantle `83a1b96d`; BOSS `100a56e`. Typed content and translation revisions, conflict drafts, guarded uploads/restores and product datasheets; source changes mark translations for review. The native services run without BOSS. Browser editing, retained conflicts, translation review and datasheet HTML/PDF were validated.

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
  - `ProductAssoc.quantityUomId`, `store#ProductPackaging` and `mantle.product.ProductServices.resolve#ScannedProduct`.
  - Design §10 Packaging.
  - Product360's packaging pane (§4, confirmed before implementation).
- **PRD-IDENTIFIERS policy:** IdentificationTypes, with `mantle.product.ProductServices.validate#ProductIdentifier`
  beside `store#ProductIdentifier`.
- **PRD-LABELS:** Labels, with `prepare#ProductLabels` and `render#ProductLabels`.
- **Usable when:** §12.3 #7 and #11.

**Built Oct 29 (P11).** Mantle `11e998b7`; BOSS `ea046d5`; framework `944b3cf0`, `67a1b2f5`, `373fc8e6`. Shared barcode/GS1 tooling, dimensional non-currency units, dated packs, validated identifiers, explicit internal assignment and durable existing-code labels. Packs and labels make no stock movement. BOSS **989/989**; browser scans, dated successors, PDF/print output and unit authority validated. Standalone Mantle has four reproduced baseline failures (InboxThreads, MantleSearch, WorkTimeEntries, WorkTimesheets).

### P12 — Import

- **PRD-IMPORT.**
  - The import run and row records are Mantle's `ProductCatalogOperation` and `ProductCatalogOperationItem`, which P4
    built for this, not a BOSS `entity/` file (F19; review I-PRD-22).
  - `mantle.product.ProductImportServices` (new): `stage#`, `validate#`, `apply#` and `get#CatalogImport`.
    `ironstone.products.ImportServices` keeps only the wizard's `map#CatalogImport` and its reads.
  - Each row goes through the domain service of P2–P6, for products, identifiers, category memberships, features,
    prices and supplier prices.
- **ProductImport:** the wizard, the error CSV, resume, and the completion and failure notices.
- **Usable when** (§12.3 #6, for imports): mixed valid and invalid rows apply the valid ones, and a resumed retry
  writes nothing twice.

**Built Oct 29 (P12).** Mantle `f5d4a419`; BOSS `cc1d5b6`. Actor-private staged CSV, typed mapping and preview, native validators, atomic dependent rows and independent apply/retry, stale checks, downloadable results and one aggregate notice. Native catalog writers moved out of BOSS; overlapping staged price tiers are rejected before writes. BOSS **1009/1009**; standalone Mantle **800 passed, four baseline failures, 17 skipped**; eight browser cases cover real multipart upload, mapping, mixed outcomes, resume and required screenshots.

### P13 — Catalog checks

- **PRD-VALIDATION:** `mantle.product.CatalogCheckServices.validate#Catalog` (new), with design §11's checks, each
  record on its own.
- **CatalogChecks** and Home's incomplete card.
- Activation and import call the same checks.
- **Usable when:** each issue planted in the demo is reported with its evidence, and a record that cannot be read does
  not stop the others.

**Built Oct 29 (P13, before P12).** Mantle `6f070c9f`; BOSS `042c2e3`. Native catalog readiness checks, source permissions and per-record failure tolerance; activation/import reuse them. BOSS **999/999**, eight native check cases and seven browser cases passed. Categories without products are also checked for cycles.

**Shared context seam before P14 (I-PRD-01).** BOSS `d82ed0b`: one server-derived app context supplies capabilities, owner scope, route aliases and Product360 tabs. Unsupported roots fail closed; nested reads retain request-local routing. Connections checks actual root authorizations and native record visibility without naming another app's groups. Validation: 75 screen/output cases, 165 domain cases (one expected error-text assertion updated and the supplier suite rerun **27/27**), 31 context/access cases and 13 browser workflows; no screen parse failures. Other app branches remain §7 work. See `docs/ProductsSharedScreens.md`.

### P14 — Finish

- The terminal twins, and the server-static pass.
- The §12.3 #8 walk. A Products user with no other launcher is refused cost, finance, stock posting and other
  organizations' records, through URLs, shared contexts, imports, exports and search.
- The §13 outputs not built earlier.
- The inventories' **Implemented in** columns, the design's Impl column, and Remaining-Work.

**Built Oct 29 (P14).** Mantle `82a0e9ad`; BOSS `366f9d1`; mr-moqui docs `bd1eca3c`. Supplier CSV/XLSX and authorized trace export controls; a native resolved effective-price output with explicit list/date/quantity/counterparty scope, blank unavailable prices, per-product failure tolerance and matching HTML/PDF/CSV/XLSX. One report is bounded to 1,000 selected/authorized products and asks for a narrower selection above that limit. The Products-only HTTP walk refuses Accounting, Warehouse, Manufacturing and Purchasing roots and restricted outputs; native/internal probes also refuse cost, posting, unsupported contexts and foreign owners with artifact authorization on and off.

P14 validation: BOSS **1025/1025** (100 specs), including the extended Products server-static compatibility report and terminal twins; standalone Mantle **804 passed, four reproduced baseline failures, 17 skipped** (825 features); native pricing/output focus **14/14**; 11 final browser list/import/output cases plus the saved XLSX export case. The output UI was inspected at 390/1280/1440 in light/dark; the XLSX archive contains the authorized product and resolved price and excludes the foreign product. Screen expression lint has **zero parse failures** (125 existing idiom/hazard sites unchanged). Baseline Mantle failures: InboxThreads, MantleSearch, WorkTimeEntries and WorkTimesheets. `docs/ProductsImplementation.md` records the shipped boundaries. The `plan/` edits remain uncommitted at the user's request.

### R — Review (Oct 29)

A review of the built app against this plan, design-products and style-guide, with the Projects app as the reference
for the archetypes, found about fifteen bugs (two in access checks), screens that missed the style guide's record
headers, row actions, phone columns, buttons and status display, minified service scripts with repeated parameter
lists, whole-table reads per request, and logic that belonged in Mantle. Each part was committed with both suites
passing (BOSS 992 passed, 21 skipped; Mantle with only the InboxThreads and MantleSearch baseline failures).

- **R0 Formatting** (Mantle c75836c3, 2eac1b16; BOSS 82b0d3b, f69d245). Prettier over the Products scripts and specs
  in Mantle's style (4 spaces, double quotes, no semicolons, width 130); one XML declaration, the CC0 header and one
  element per line in the Products screens, service blocks and setup data, each checked equal by canonical XML.
- **R1 Bugs** (Mantle 62a4817f; BOSS 877814c). Catalog capabilities come from the permissions Mantle checks, not
  BOSS group names; price notices pick recipients by permission and lock nothing global; PricePolicy refuses with a
  reason code instead of callers testing its wording; bulk results survive the redirect as messages; product
  drop-downs search the whole catalog (they stopped at 200); Product360 tabs in design order; screen children in XSD
  order; `target-window`; JSON tui text; standard times hidden without cost read; smaller fixes in the commit.
- **R2 Structure and reads** (Mantle dccc9cdd, 57d0e559; BOSS 25a2a16, 1dd6ab5, 65c44ad, 78d0c9c). Each shared
  parameter set is one `type="interface"` service (BOSS service definitions 4,435 lines to 832, Mantle's 2,092 to
  802); `ProductsLib.js` replaces the copied script helpers; Prices, Suppliers, Pricing, Inventory, Methods and Costs
  rewritten with named functions; lists decorate only the page shown and read by condition instead of whole tables;
  connections are read by their tab alone; the price-list and pricing-settings pass-throughs are gone.
- **R3 Logic to Mantle** (Mantle 400c6ca4; BOSS 41b8a32). Catalog and variant settings (`CatalogSettings.js`, get#
  and store# in ProductServices), reviewed bulk price changes (`PriceChanges.js`, preview#, apply# and get#
  PriceChanges, rounded to the currency) and stock totals (`get#ProductStockTotals`) are Mantle services with their
  own specs; the cost roll-up answers per-path totals.
- **R4/R5 Screens** (BOSS 9bc9314, 0e77b38, fc9c9ca, 6882952, 22b485d, 46866ba, 3d24e34, c51070d). Home is a landing
  with number cards and an empty state; record headers on Product360, categories, features, groups, Supplier360 and
  price lists; row actions in their rows; phone columns on 78 lists; names instead of IDs, amounts in their
  currency, states as chips; one route per screen (`Products/CatalogChecks` keeps readers' access); numbered import
  steps; one primary at a time; confirmations and danger styling on status changes and ends.
- **R6** this record, the design's routes and service names, and the inventories.

Not done in the review, and listed in §7: the method, routing and document detail headers; the stock tab across all
facilities; bulk price as a Products list selection action; Connections links into other apps' lists; locale
choices on Translations; consolidating the twelve `*Shots` client specs.

## 4. Decisions

These are made before and during the build. Each one that changes the design is also written into design-products.md,
or into the owner's design.

| Date | Decision | Notes |
| --- | --- | --- |
| Oct 28, 2026 | Phase order: the catalog first; then the other apps' contracts that Product360 and the roll-up need; then documents, units, import and checks | The user's call |
| Oct 28, 2026 | Products builds the parts of other apps' needs it depends on: Warehouse's `store#ProductFacilityPolicy` and TrackingPolicy (P7); Manufacturing's versioned methods, with the five shared method screens and `get#OperationCostBasis` (P8); Accounting's `preview#` and `post#Revaluation`, with their two dialogs (P9). These keep the owner's names, packages and Shared screens, the packages being Mantle's since the Q2 row below. The rest of each need, and the owner's own screens, stay with the owner | The user's call. The alternative was tabs that wait for their apps |
| Oct 28, 2026 | The shared screens Products builds first carry the Products context only. Another app's context is added when that app is built, as InvoiceDetail and OrderDetail were in Projects | Follows from the above |
| Oct 28, 2026 | The shared rules of impl-drawers-commons §4 apply from P4 on: parties by role, and changes by effective date and the audit log. Price lists and rules (P5b) and standard costs (P9) are effective-dated rows with audit-logged key fields, with no version fields; ProductParty, ProductPrice's dates and P5a's audit log already follow them. What was built before (P2's settings) and the methods (P8) are decided below | The user's call, in the Purchasing plan review (impl-purchasing §4) |
| Oct 28, 2026 | The organization filters of impl-drawers-commons §4 apply to every BOSS root, in one commit after P5 (BossSetupData is in P5's working tree): Commons' and Comms' `ALL_USERS`, Projects' groups and Products' groups move to `MANTLE_USER_ORG`; `BOSS_PRODUCTS_ADMIN` (Catalog administrator) becomes the Products admin group, with `MANTLE_ACTIVE_ORG` and `MANTLE_PRIVATE_CONTACT` on the root; `BOSS_MANUFACTURING_ADMIN` becomes Manufacturing's admin group and the work-center group P8 uses is `BOSS_MANUFACTURING_RESOURCE_ADMIN`; Mantle's three product filters admit `_NA_`. The built apps' specs run with it; crosscut §1.4 was corrected in the Oct 28 design sweep | The user's call (§5 review), reversing the first confirmed decision below. The alternatives were the core apps only, and a separate `_APP_ADMIN` name. Built Oct 28 after P5: Mantle `1ef146bf`; BOSS `f4c1781` |
| Oct 28, 2026 | P2's catalog settings move to the shared form before P9, as their own commit after P5. `ProductCatalogSetting` becomes effective-dated rows by organization with typed, audit-logged fields and a change reason, as P4's `ProductVariantSetting`; `get#` and `store#CatalogSettings` keep their parameters, and the optimistic check compares the current row's from date. P9's self-approval, P12's defaults and P13's required fields read the dated row | The user's call (§5 review). The alternatives were the move at P14 and keeping the JSON revisions. Nothing seeds them, so nothing migrates. Built Oct 28 after P5: Mantle `5d984d31`; BOSS `165ae8d` |
| Oct 28, 2026 | The methods (P8) follow the shared rule with line records of their own. A `ProductBom` header (product, organization and method; the Chatter and Files host) has audit-logged method fields: base quantity and unit, phantom, routing, lead and preparation days. Its `ProductBomItem` lines have a stable `bomItemId`, are effective-dated, and audit-log their key fields: role, product, quantity and unit, scrap, consuming operation and applicability. Routings are Mantle's `WepRouting` templates and `WepRoutingTask` operations, on dated `WeatRoutingComp` rows, with audit-logged standards. A release is an approval decision that stamps the draft lines' from date and the replaced lines' thru date; an explosion reads one date and a comparison two. `ProductBomVersion`, `ProductBomVersionContent`, `RoutingVersion` and `RoutingVersionOperation` are dropped, and `PatMfgBom` stays for kits only (D15) | The user's call (§5 review). ProductAssoc's key cannot hold a component twice, a unit, a draft or a line an issuance references, so the lines are records with an identity (the shared rule's exception). The alternatives were `PatMfgBom` rows with sequence and unit added to the key, and the designed version records. Warehouse P16a's runs follow (impl-warehouse §4); design-manufacturing M3 and M4 and crosscut §3.23 were corrected in the Oct 28 design sweep |
| Oct 28, 2026 | Mantle stands without BOSS, and business logic leans to Mantle (impl-drawers-commons §4). No Mantle service, SECA, EECA, script, data file or spec calls `ironstone.*`, reads a BOSS screen, entity or setting, or names a BOSS group or enumeration; Mantle checks Moqui permissions, which BOSS grants to its groups with `UserGroupPermission` rows, and offers a flag, a hook in data or a topic where it needs BOSS. Logic not specific to one screen goes in the Mantle package of the records it changes; an `ironstone.products` service keeps the access check, screen reads and shapes, settings forms and the call. What moves: in `mantle.product` and `mantle.facility`, P5–P8's policy scripts check permissions, and P9's cost policy does from the start; in `mantle.party`, P1's catalog record scope; in `mantle.ledger`, Accounting's revaluation (`AssetBookServices`), with BOSS keeping the dialogs' context; Mantle's specs make their own groups; P11's `resolve#ScannedProduct` and `validate#ProductIdentifier` are `mantle.product.ProductServices`; P12's import is `mantle.product.ProductImportServices` over P4's `ProductCatalogOperation` records, with BOSS keeping the wizard's mapping; P13's `validate#Catalog` is `mantle.product.CatalogCheckServices`. The permissions, seeded in Mantle's `ProductAccessData.xml` and granted in BossSetupData by P9 to the Products groups and the other apps' groups P1 seeded: `PRODUCT_CATALOG_VIEW` (new), `PRODUCT_CATALOG_ADMIN`, `PRICE_VIEW`, `PRICE_EDIT`, `SUPPLIER_PRICE_VIEW`, `SUPPLIER_PRICE_EDIT`, `PRODUCT_COST_VIEW`, `PRODUCT_COST_ESTIMATE`, `PRODUCT_COST_APPROVE`, `METHOD_VIEW`, `METHOD_EDIT`, `METHOD_APPROVE`, `METHOD_RESOURCES`, `METHOD_COST_EDIT`, `METHOD_COST_APPROVE`, `STOCK_POLICY_PLAN`, `STOCK_POLICY_MANAGE`, `ACCOUNTING_VIEW` and `ACCOUNTING_GL_POST` | The user's call (plan review Q2, `review-impl-core-apps.md`; I-PRD-02). A hard rule: mr-mantle is deployed without mr-boss. The owner designs' names follow in the design sweep |
| Oct 28, 2026 | Revaluation changes forward cost (P9, AC-07). `mantle.ledger.AssetBookServices.post#Revaluation` sets `Asset.acquireCost` on the on-hand assets from the effective date, without reposting history, splitting a partly issued asset, and posts one AcctgTrans for on-hand × delta, with asset links, against a new seeded revaluation offset GL account type mapped with Accounting P2's mappings. It is a new Mantle service behind its own flag, off by default, tested in both states. It refuses negative on-hand, a date before the product's last posted movement and a future date, and never calls `update#ProductAcquireCost`. This replaces "value only" | The user's call (plan review Q7, `review-impl-core-apps.md`; I-PRD-05). ERPNext and Odoo work this way. design-accounting's InventoryValuation follows in the design sweep |
| Oct 28, 2026 | Explosion depth. P9 changes P8's `get#BomExplosion`: the tree still shows every level; requirements and buildable quantity stop at non-phantom sub-assemblies, so their on-hand counts, and phantoms are blown through with their routing; a parameter keeps the full blow-through for callers that want it. P9's roll-up goes level by level: a non-phantom sub-assembly costs at its approved estimate, or is rolled in the same run in low-level-code order. Manufacturing P5's producible-now reads the stopped requirements, and P13's planning nets sub-assembly stock level by level | The user's call (plan review Q8, `review-impl-core-apps.md`; I-PRD-03). Odoo works this way. impl-manufacturing P5 and P13 build on it |

Decisions confirmed with the user before implementation:

- Keep `BOSS_PRODUCTS` as the root user group and artifact group; they are different entities.
- Root filter `MANTLE_ACTIVE_ORG`; services independently verify membership/owner/capability, including when no org is active.
  Revised in §4: the groups take `MANTLE_USER_ORG`, and `BOSS_PRODUCTS_ADMIN` `MANTLE_ACTIVE_ORG`.
  Shared `_NA_` records are readable; shared master writes require framework `ADMIN`.
- Structured Mantle settings records, not serialized 255-character `PartySetting` values. P2 built them as versioned
  revisions; §4 moves them to effective-dated rows before P9.
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
| Further issues discovered during implementation | the affected phase | Record findings and decisions here; the open questions of the plan as written, P2's settings and the methods among them, are decided in §4 |

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
| F5 | P0: no ProductPrice store service exists. Rows are written by entity-auto in mr-marble `EditPrices.xml`, by `mantle.rest.xml` entity CRUD and by `clone#Product` | `store#ProductPrice` (P5a); the REST path is decided in §4 |
| F6 | P0: `create#VariantProducts` makes every combination of the selectable features, answers nothing and reads no `ProductFeatureIactn`. `create#VariantProduct`'s existing-variant check ignores dates and application type. `get#VariantProductsInfo` is a stub (TODO). `find#ProductFeatureGroups` reads an undeclared `productFeatureGroupIdSet` and does not deduplicate | P4 |
| F7 | P0: `find#ProductByIdValue` answers no product when several identifiers match, and searches no party item codes and no `ProductOtherIdentification` | The palette's text find (P2) and `resolve#ScannedProduct` (P11) |
| F8 | P0: the `MantleProduct` document has no status, product parties or party item codes, and indexes the old `ProductDimension`. Scripts can ask `ec.search.isAvailable()`, but nothing reports index lag | P2 extends the document; staleness is decided in §4 (the fallback reports unavailability; no lag reporting) |
| F9 | P0: `view-tree` keys a row by its first key field and shows that key under one parent | P3 verifies separate path occurrence IDs through existing key-fields; record/dated-edge keys follow the occurrence (F38) |
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
| F22 | P0: crosscut §1.4 names `BOSS_PRODUCTS` as the root user group, but BossSetupData already uses it as an artifact group (with `BOSS_PRODUCTS_ADMIN` as an artifact authz id) | Decided in §4: both, and the admin group revised with the organization filters |
| F23 | P0: `example/test/gallery-shots.mjs` was removed (67df2c1e, Oct 26) for `moqui test-client example --serve --spec GalleryShots`, which shoots 1280 in light and some screens at 390 and in dark | A BOSS client spec on that pattern (§2) |
| F24 | P0: `OrderItem.standardCost` exists and is audit-logged; its description is purchase accounting cost | P0 checks it before P9 sets it on sales lines |
| F25 | P0: the review the design cites (`review-core-apps.md`, with its R- IDs and §4.1 steps) is only on branch `review-core-apps` (0e53a04) | Integrated in b00c2c7 |
| F26 | P0: `get#OrderProductPrice` derives parties from OrderPart/store; `check#OrderPreApprove` calls the type resolver for sales min/max; Marble QuickItems omits vendor; procure-to-pay directly passes external vendor/internal buyer and expects 9.00/8.00 | P5b infers legacy direction from party roles and preserves default public sales lookup; regression specs unchanged |
| F27 | P0: REST has raw price GET/POST/PATCH/DELETE, and Marble Catalog uses entity-auto writes; clone also copies raw prices | REST uses guarded services in P5; Products clone goes through the domain writers; Marble source stays read only |
| F28 | P0: PartySetting.settingValue is text-medium (255); structured defaults also need versions | Add Mantle catalog settings records in P2; no field widening |
| F29 | P0: view-tree keys by the first key field; existing children/ancestor/move protocols assume record identity | Add optional occurrence/parent-occurrence fields with legacy defaults, keeping category edge identity in move payloads (P3) |
| F30 | P0: barcode.rs has a reusable linear SVG renderer; script API exposes code128Svg. qrcodegen 1.8.0 declares MIT and datamatrix 0.3.3 Apache-2.0 OR MIT (both allowed by deny.toml) | Add linear encoders, QR/DataMatrix wrappers and shared GS1 parsing in P11; run dependency gate; no printer-driver subsystem |
| F31 | P0: OrderItem.standardCost is consumed by AssetServices receipt acquisition and CarrierServices; no sales-cost meaning exists | Preserve purchase semantics; approved estimates populate sales snapshots only (P9) |
| F32 | P0: ProductFacility/Location already own reorder/location fields, with no tracking fields; proposed BOM versions, WorkCenter/Rate and AssetBookEvent do not exist. LedgerServices.post#AcctgTrans checks fiscal periods | P7 uses WarehousePolicy tracking records; P8 uses new immutable versions beside legacy templates; P9 requires configured accounts/open periods and revaluation events that change forward cost without reposting (§4, Q7), never receipt rewrites |
| F33 | P0: Commons tasks already support assigned WetTask rows and generic WorkEffortRecord links | Catalog-review activities are assigned tasks linked to catalog records; no parallel activity model |
| F34 | P1: the full BOSS run (also on clean baseline sources) exhausts the 64 MiB script heap; a render catches allocation errors before the existing outer recovery clears compiled caches | Reclaim compiled caches under heap pressure before script entry, keep the hard limit and live values, and never retry side-effectful scripts. Add a real-allocation regression and rerun core/BOSS suites |
| F35 | P2: the existing add-to-cart service updates a matching line without calling create#OrderItem; guarding the create path alone leaves an obsolete-product bypass | Guard add#OrderProductQuantity before price resolution and either create/update path; keep explicit zero-quantity removal ahead of the guard |
| F36 | P2: get#AvailableInventory requires a facility/store scope, and its kit minimum used zero as an uninitialized sentinel | Product360 totals only authorized facilities; keep an explicit first-component flag so later stock cannot overwrite a zero minimum |
| F37 | P2: ProductOtherIdentification and ProductUomDimension are outside the legacy delete/clone coverage; equipment maintenance refers to meter IDs | Clean modern children before guarded unused-draft deletion, copy scoped identities safely, and remap cloned maintenance meters |
| F38 | P3: view-tree already accepts an occurrence as the first key field, with record/edge fields following it | Use the existing qvt/html/tui identity protocol, prove two placements and a one-edge move, and add only optional browser move confirmation |
| F39 | P3: ProductFeatureGroup had no owner, though groups must obey the catalog owner boundary | Add audited ownerPartyId, retain null/_NA_ legacy groups as shared, extend org filters and record callbacks, and keep shared writes ADMIN-only |
| F40 | P9 review (I-PRD-06, `review-impl-core-apps/products.md`): the roll-up's rules were unstated. P8's `BmirByproduct` lines carry `allocationShare`; `PccOverheadPercent` has no base; `get#OperationCostBasis` charges the full setup to the quantity asked, uses fractional batches and ignores `WorkCenter.efficiencyPercent`; rounding (per component or on the total) is unstated | P9's roll-up rules: by-products follow `allocationShare`, else quantity (Manufacturing P15); overhead percent on material plus conversion, single level; the costing lot size is the BOM's `baseQuantity`, with setup divided by it; cycles round up and efficiency applies; the total is rounded once. A by-product BOM is in the usable-when |
| F41 | P9 review (I-PRD-07, `review-impl-core-apps/products.md`): Mantle's receipt takes `OrderItem.standardCost` as the new asset's `acquireCost`, and an intercompany order (vendor and customer both internal) is a sale and a purchase, so a sales standard would become the buyer's receipt cost | P9 sets the sales `standardCost` only when the customer is not an `OrgInternal` party; its spec covers an intercompany order |
| F42 | Review: `ec.user.context` lives for one request, so the bulk results stored there before a redirect were always empty | Messages, which the render saves across the redirect |
| F43 | Review: a `container-dialog` inside a `button-menu` in a form-list cell does not open from its menu item (probably closed with the menu; not investigated in the framework, nor checked in a header) | Row actions are inline dialogs (Schedule, Correct, End); menus in rows hold links only |
| F44 | Review: `always-actions` of a parent run for a standalone tab render (the terminal, a reloaded tab), its `actions` do not, so Product360's detail reads stay in always-actions | The costly reads moved to the tabs that show them (connections, stock) |
| F45 | Review: ProductsCostWalk and ProductsToolsWalk fail on this machine at the P14 commits too (the labels walk needs Chromium for its PDF) | Not changed by the review; to be rerun where Chromium is installed |

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
- **From the review (R):** the BillOfMaterialsDetail, RoutingDetail and DocumentDetail header cards; the stock tab
  across all authorized facilities with incoming quantities and lot links; BulkPrice offered as a row-selection action
  of the Products list; Connections links into each type's list once Sales, Purchasing and Accounting have them;
  locale choices on Translations; one table-driven client shots spec.
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

P1 committed after validation: framework `f9641cda`, Mantle `6d548a3e`, BOSS `f1c2a37`.

P2 committed after validation: Mantle `54e6619a`, BOSS `0a06b7d`.

P3 committed after validation: framework `df8d2474`, Mantle `dddc0594`, BOSS `774752a`.

P4 committed after validation: Mantle `2727c0ae`, BOSS `86c6f09`.

P5a committed after validation: Mantle `4d146af1`, BOSS `0c78c9e`.

P5b committed after validation: Mantle `d7663ecb`, BOSS `776a73f`.

The §4 organization filters and dated catalog settings, after P5: Mantle `1ef146bf` and `5d984d31`, BOSS `f4c1781` and
`165ae8d`.

P6 committed after validation: Mantle `0e886690`, BOSS `ec0f17a`.

P7 committed after validation: Mantle `0716de75`, BOSS `c413cdd`.

P8 committed after validation: Mantle `4422dd44`, BOSS `8e946df`.

P9 committed after validation: Mantle `5a18970e`, BOSS `2a4abd6`.

P10 committed after validation: Mantle `83a1b96d`, BOSS `100a56e`.

P11 committed after validation: framework `944b3cf0`, `67a1b2f5`, `373fc8e6`; Mantle `11e998b7`, BOSS `ea046d5`.

P13 committed before P12 after validation: Mantle `6f070c9f`, BOSS `042c2e3`.

P12 committed after validation: Mantle `f5d4a419`, BOSS `cc1d5b6`.

Shared app context seam committed before P14: BOSS `d82ed0b`.

P14 committed after validation: Mantle `82a0e9ad`, BOSS `366f9d1`; Remaining-Work `bd1eca3c`.
