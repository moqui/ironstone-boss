# IronStone BOSS — Products design

Oct 28, 2026 — draft; reviewed against research-products.md, the reference apps and the other core designs ([review-core-apps.md](review-core-apps.md)); kits, the Product360 BOM mounts, the lifecycle check, named price writes, pack-scan resolution and the unit-administrator gate added; the organization filters, dated catalog settings, effective-dated methods and standard costs of impl-products §4 applied

IronStone Products is the catalog manager's app: product masters and variants, categories,
features, prices and cost estimates, supplier catalogs, documents, units and barcodes. It gives
a small business a complete catalog workspace and gives a larger business one product identity
used by purchasing, production, stock, sales and finance. Product360 is the shared record;
this file designs catalog worklists and editors and the Products context of that record.

**Inputs.** [research-products.md](research-products.md) §1–§14,
[design-crosscut.md](design-crosscut.md) §1, §3.3, §3.5, §3.7, §3.17, §3.21, §3.23, §4.1 and §4.2,
[initial-design.md](initial-design.md), [design-doc-guide.md](design-doc-guide.md),
[style-guide.md](style-guide.md), [design-drawers-commons.md](design-drawers-commons.md),
[ss-inventory.md](ss-inventory.md) and [usl-inventory.md](usl-inventory.md).
Source checks below use the current `mr-mantle` and `mr-marble` checkout, not the old
`mr-moqui-base` path in the research. External reference paths are relative to
`~/work/moquiwork/3p_other/<checkout>`; they identify behavior to learn from, not code to copy.

**Sections.** [1 shell](#1-shell) · [2 screens](#2-screens) · [3 home and products](#3-home-and-products) ·
[4 variants and configuration](#4-variants-and-configuration) · [5 categories](#5-categories) ·
[6 features](#6-features) · [7 pricing and costs](#7-pricing-and-costs) · [8 suppliers](#8-suppliers) ·
[9 documents](#9-documents) · [10 units and barcodes](#10-units-and-barcodes) ·
[11 settings](#11-settings) · [12 coverage](#12-baseline-coverage-and-validation) ·
[13 outputs](#13-documents-and-outputs) · [14 needs](#14-framework-and-data-needs) ·
[15 decided](#15-decided) · [16 implementation decisions](#16-implementation-decisions-oct-28-2026)

## 1. Shell

### 1.1 Root, permissions and presentation

Root `screen/Products.xml`, mounted as `Products`, uses `BOSS_PRODUCTS` and
`sym_o_inventory_2`. The existing root and section placeholders are the starting point;
their presence does not mean these designs are implemented. The root calls the existing
`mantle.party.PartyServices.setup#UserOrganizationInfo` and exposes `appRoot=Products`.
`BOSS_PRODUCTS` is both the root user group and the artifact group; they are different
entities. The organization filters are impl-drawers-commons §4's (crosscut §1.4): Products'
ordinary groups take `MANTLE_USER_ORG` and `MANTLE_PRIVATE_CONTACT`, and `BOSS_PRODUCTS_ADMIN`
(catalog administrator) is the Products admin group, with all authz on the root and
`MANTLE_ACTIVE_ORG` and `MANTLE_PRIVATE_CONTACT`: every organization until one is made active.
`MANTLE_USER_ORG`'s Product, ProductCategory and ProductFeature filters admit `_NA_`, so shared
masters stay readable. Services still check organization access themselves, whatever the
filter (impl-products §4).

`app` in the screen table means catalog read access. Proposed action grants separate
**catalog editor**, **price editor**, **supplier-price editor**, **cost estimator**, and
**catalog administrator**. A catalog editor can maintain descriptive data without seeing
supplier costs or changing prices. A cost estimator maintains standard estimates but cannot
revalue inventory or post GL entries. A catalog administrator maintains organization defaults
and taxonomy; finance retains posting-policy authority. Grants compose on a user and are
checked in services, including imports and shared mounts. Global master data is not silently
made organization-private: use existing owner fields for owned catalogs, show `_NA_` shared
records explicitly, and require authority over an owner before writing its records.

The table below is the one list of Products grants; the screen table's Roles column uses only
these names. Each grant maps to one proposed capability group in the crosscut §1 capability
table (D22). A Roles cell such as `app; catalog editor writes` means every catalog reader sees
the screen and only the named grant may change it.

| Grant | Proposed capability group | What it allows |
| --- | --- | --- |
| catalog reader (`app`) | `BOSS_PRODUCTS` (the app group) | Read the catalog, categories, features, documents, units and packaging of permitted owners |
| catalog editor | `BOSS_PRODUCTS_CATALOG_EDIT` | Maintain master data, categories, features, content, identifiers, associations, packaging, kit components and product parties; run lifecycle transitions and imports of those kinds |
| price reader | `BOSS_PRODUCTS_PRICE_READ` | Read sales-direction prices, price lists and rules, and the full PriceExplain trace |
| price editor | `BOSS_PRODUCTS_PRICE_EDIT` | Create, schedule and end sales-direction prices; maintain and publish price lists and rules |
| supplier-price reader | `BOSS_PRODUCTS_SUPPLIER_PRICE_READ` | Read purchase-direction prices (supplier offers) |
| supplier-price editor | `BOSS_PRODUCTS_SUPPLIER_PRICE_EDIT` | Create, schedule, end and import supplier offers |
| cost reader | `BOSS_PRODUCTS_COST_READ` | Read standard estimates and operational cost history; with price reader, see margin |
| cost estimator | `BOSS_PRODUCTS_COST_ESTIMATE` | Draft standard estimates and cost roll-ups; request a revaluation |
| standard-cost approver | `BOSS_PRODUCTS_COST_APPROVE` | Approve a standard estimate |
| catalog administrator | `BOSS_PRODUCTS_ADMIN` | Maintain organization catalog, variant, pricing and identifier settings, taxonomy roots and catalog checks; as the Products admin group, all authz on the root (above) |
| unit administrator | the framework `ADMIN` group (system administrators), not a Products group | Write `moqui.basic.Uom` and `UomConversion` rows other than currencies, because those rows are global |

Product/facility stock policy is not a Products grant. It uses Warehouse's facility-policy
capability (its group in crosscut §1). The method screens use Manufacturing's groups: method
readers `BOSS_MANUFACTURING_READ`, editors `BOSS_MANUFACTURING_METHOD` and release approvers
`BOSS_MANUFACTURING_METHOD_APPROVE`; work centers and their rates use
`BOSS_MANUFACTURING_RESOURCE_ADMIN`, not Manufacturing's admin group `BOSS_MANUFACTURING_ADMIN`
(crosscut §1.4, impl-products §4). Currency units and exchange rates are not editable in
Products at all; Accounting's Currencies screen owns them (D17). The standard-cost approver is
granted separately from the cost estimator; the drafter of an estimate approves it only with
that grant and the audited self-approval setting of CatalogSettings, off by default (§16,
impl-products §4).

All screens follow the style guide's density, semantic theme colors and action hierarchy.
Most are XML. VariantBuilder is the sole custom matrix screen; its terminal twin is specified
in §4. Editors preserve unsaved changes during validation errors. Inaccessible prices/costs
are omitted, not shown as zero. An empty catalog offers Create product and Import; a failed
query offers Retry and retains the last filter without presenting stale totals as current.

### 1.2 Menu

- Home — `Home`
- Products — `Products`
  - Product record — `Product360` (record route, not a fixed menu entry)
  - Import — `ProductImport`
  - Configurations — `Configurations` (`later`)
  - Change notices — `ChangeNotices` (`later`)
- Categories — `Categories`
  - Category record — `CategoryDetail`
- Features — `Features`
  - Feature groups — `FeatureGroups`
  - Interactions — `FeatureInteractions`
- Pricing & costs — `Prices`
  - Price lists — `PriceLists`
  - Explain price — `PriceExplain`
  - Price history — `PriceHistory`
  - Standard costs — `StandardCosts`
  - Cost roll-up — `CostRollup`
  - Cost history — `CostHistory`
- Supplier prices — `SupplierPrices`
  - Supplier record — `Supplier360`
- Documents — `Documents`
  - Translations — `Translations`
- Units & barcodes — `Units`
  - Packaging — `Packaging`
  - Labels — `Labels`
- Settings — `Settings`
  - Variants — `VariantSettings`
  - Pricing — `PricingSettings`
  - Identification types — `IdentificationTypes`
  - Catalog checks — `CatalogChecks`

Landing content is active SKU and variant counts, products missing a current price, products
approaching discontinuation, incomplete required catalog data, recently changed products and
shortcuts to creation/import. Every count drills into the corresponding saved list filter;
cost values are excluded from public catalog KPIs. The shortcuts are Products, Categories,
Features, Price lists, Supplier prices and Import, beside Create product. The cards and
shortcuts are dashboard widgets in the sense of crosscut §3.17, not a separate dashboard model.

### 1.3 Shell providers

The palette finds product IDs, names, typed identifiers, authorized supplier item codes and
customer or manufacturer item codes (`ProductParty` `otherPartyItemId`);
the root provider uses `mantle.product.ProductServices.find#ProductByIdValue` for exact/scanned
IDs and a proposed authorized catalog find for text. Quick create offers Product, Category
and Feature using the same forms as their list screens. Today lists assigned catalog-review
activities through Commons; notifications cover import completion/failures, approved price
changes and expiring prices. These are providers, not separate screens. Keys use shell search,
create and list navigation; the matrix registers a local key scope only while focused.
Needs: **PRD-SHELL**, **PRD-ACCESS**.

## 2. Screens

Paths are proposed BOSS routes; a detail's tab is listed only when it is itself a mounted
screen. Single-form dialogs remain forms of their parent. `new` means first release without
a baseline, `later` remains fully designed. Main records marked *proposed* do not exist yet.

| Screen | Path | Archetype | Impl | Purpose | Main record | Reused | Roles | Scope | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Home | `Products/Home` | landing | xml | Catalog work and data-quality overview; replaces the Catalog dashboard | Authorized catalog aggregates | own | app | parity | organization and filters |
| Products | `Products/Products` | list | xml | Find, create and bulk-maintain products | `Product`, `ProductFindView` | own | app; catalog editor writes | parity | `Product` rows and filters |
| Product360 | `Products/Products/Product360` | 360 | xml | Full catalog context of the product | `Product` | Product360, crosscut §3.5 | app | parity | `Product productId` |
| InventoryAvailability | `Products/Products/Product360/Stock` | list | xml | Read stock and maintain permitted product/facility policy; `Stock` is the Product360 tab path | `Asset`, `ProductFacility` | InventoryAvailability, crosscut §3.7 | app; facility-policy capability writes policy | parity | product and facility filters |
| BillOfMaterialsDetail | `Products/Products/Product360/BillOfMaterialsDetail` | detail | xml | Read the product's effective-dated BOM; edit and release with method capability | proposed `ProductBom`, `ProductBomItem` | BillOfMaterialsDetail, crosscut §3.23 | method readers; edit and release with method capability | parity | proposed `ProductBom` product, organization and as-of date |
| BillOfMaterialsExplosion | `Products/Products/Product360/BillOfMaterialsDetail/BillOfMaterialsExplosion` | report | xml | Explain the method's multi-level component requirements as of one date | proposed `ProductBom`, `ProductBomItem` | BillOfMaterialsExplosion, crosscut §3.23 | method readers | new | as-of date and quantity/UOM |
| BillOfMaterialsCompare | `Products/Products/Product360/BillOfMaterialsDetail/BillOfMaterialsCompare` | report | xml | Compare the product's method at two dates | proposed `ProductBom`, `ProductBomItem` | BillOfMaterialsCompare, crosscut §3.23 | method readers | new | two dates and comparison quantity |
| WhereUsed | `Products/Products/Product360/WhereUsed` | report | xml | Trace the product as a component through effective-dated methods | proposed `ProductBomItem` | WhereUsed, crosscut §3.23 | method readers | parity | component, organization and effectivity |
| RoutingDetail | `Products/Products/Product360/RoutingDetail` | detail | xml | Read the product's routing as of a date; edit and release with method capability | `WorkEffort` `WepRouting` and `WepRoutingTask` on dated `WeatRoutingComp` rows | RoutingDetail, crosscut §3.23 | method readers; method editors write | new | routing, as-of date and selected operation |
| ProductImport | `Products/Products/ProductImport` | wizard | xml | Validate and apply catalog imports with row outcomes | Proposed import run | own | catalog editor | new | run and selected rows |
| VariantBuilder | `Products/Products/VariantBuilder` | wizard | qvue | Preview and create chosen feature combinations | `Product`, `ProductFeatureAppl` | own | catalog editor | parity | virtual product and selected combinations |
| Configurations | `Products/Products/Configurations` | list | xml | Find versioned configurable-product definitions | Proposed product configuration | own | catalog editor | later | definitions and filters |
| ConfigurationDetail | `Products/Products/Configurations/ConfigurationDetail` | editor | xml | Define questions, options and valid combinations | Proposed product configuration/version | own | catalog editor | later | configuration/version |
| ChangeNotices | `Products/Products/ChangeNotices` | list | xml | Track engineering changes and impact | Proposed product change notice | own | catalog editor | later | notices and filters |
| ChangeNoticeDetail | `Products/Products/ChangeNotices/ChangeNoticeDetail` | detail | xml | Review and release a catalog change set | Proposed product change notice | own | catalog editor | later | notice and affected products |
| Categories | `Products/Categories` | list | xml | Browse taxonomy as list or multi-parent outline | `ProductCategory`, `ProductCategoryRollup` | own | app | parity | category rows and filters |
| CategoryDetail | `Products/Categories/CategoryDetail` | detail | xml | Maintain category links, members and feature defaults | `ProductCategory` | own | app; catalog editor writes | parity | `ProductCategory productCategoryId` |
| CategoryContent | `Products/Categories/CategoryDetail/Content` | editor | xml | Maintain localized category documents and text; `Content` is the CategoryDetail tab path | `ProductCategoryContent` | own | catalog editor | parity | category and content row |
| Features | `Products/Features` | list | xml | Find and create typed feature values | `ProductFeature` | own | app | parity | features and filters |
| FeatureDetail | `Products/Features/FeatureDetail` | detail | xml | Edit a feature and its group/product uses | `ProductFeature` | own | app; catalog editor writes | parity | feature |
| FeatureGroups | `Products/Features/FeatureGroups` | list | xml | Find reusable sets of feature values | `ProductFeatureGroup` | own | app | parity | groups and filters |
| FeatureGroupDetail | `Products/Features/FeatureGroups/FeatureGroupDetail` | detail | xml | Maintain dated feature and category membership | `ProductFeatureGroup` | own | app; catalog editor writes | parity | group |
| FeatureInteractions | `Products/Features/FeatureInteractions` | list | xml | Maintain dependency and incompatibility rules | `ProductFeatureIactn` | own | catalog editor | new | interaction rows and product scope |
| Prices | `Products/Pricing/Prices` | list | xml | Maintain effective-dated base price rows | `ProductPrice` | own | price reader; price editor writes; purchase-direction rows need the supplier-price grants | parity | price rows, organization and filters |
| PriceLists | `Products/Pricing/PriceLists` | list | xml | Find scoped rule-based price lists | Proposed `ProductPriceList` | own; reused via crosscut §3.21 | price editor | new | price lists and filters |
| PriceListDetail | `Products/Pricing/PriceLists/PriceListDetail` | detail | xml | Maintain list scope and ordered price rules | Proposed `ProductPriceList`, `ProductPriceRule` | own; reused via crosscut §3.21 | price editor | new | price list and selected rules |
| PriceExplain | `Products/Pricing/PriceExplain` | report | xml | Explain the exact price for a transaction context | `PriceServices.get#ProductPrice` (extended) | own; reused via crosscut §3.21 | price reader | new | product and pricing inputs |
| PriceHistory | `Products/Pricing/PriceHistory` | report | xml | Inspect recorded price changes and transaction statistics | `EntityAuditLog`, `ProductPrice` | own | price reader | new | product, scope and period |
| StandardCosts | `Products/Pricing/StandardCosts` | list | xml | Maintain dated estimates independently of inventory valuation | Proposed `ProductStandardCost` | own | cost reader; cost estimator writes; standard-cost approver approves | new | product/organization/facility and estimates |
| CostRollup | `Products/Pricing/CostRollup` | wizard | xml | Preview and approve a BOM/routing cost estimate | Proposed `ProductStandardCost` | own | cost estimator | new | product, BOM/routing and as-of date |
| CostHistory | `Products/Pricing/CostHistory` | report | xml | Compare estimates, actual cost and valuation changes | Existing assets/details plus proposed `ProductStandardCost` rows | own | cost reader | new | product, facility, currency and period |
| SupplierPrices | `Products/Suppliers/SupplierPrices` | list | xml | Maintain the cross-supplier product-price catalog | `ProductPrice` | own; reused via crosscut §3.21 | supplier-price reader; supplier-price editor writes | parity | supplier-price rows and filters |
| Supplier360 | `Products/Suppliers/Supplier360` | 360 | xml | Supplier contact and catalog context | `Party` | Supplier360, crosscut §3.3 | supplier-price reader | new | supplier party |
| Documents | `Products/Documents` | list | xml | Find documents across products and variants | `ProductContent` | own | app | new | content rows and filters |
| DocumentDetail | `Products/Documents/DocumentDetail` | editor | xml | Edit product content metadata and text/file versions | `ProductContent` | own | catalog editor | parity | product and content row |
| Translations | `Products/Documents/Translations` | editor | xml | Fill missing localized product or category content | `ProductContent`, `ProductCategoryContent` | own | catalog editor | new | record/type/source and target locales |
| Units | `Products/Units` | list | xml | Inspect units and maintain authorized non-currency conversions | `moqui.basic.Uom`, `UomConversion` | own | app; `ADMIN` writes | new | units and conversion rows |
| Packaging | `Products/Units/Packaging` | list | xml | Maintain pack products, quantities and typed codes | `ProductAssoc` (`PatPackagingFor`) | own | catalog editor | new | pack/base products |
| Labels | `Products/Units/Labels` | wizard | xml | Preview and print product or pack identification labels | `ProductIdentification` | own | app | new | selected products and label options |
| Settings | `Products/Settings` | settings | xml | Set catalog defaults and required-data policies | Proposed effective-dated `ProductCatalogSetting` rows | own | catalog administrator | new | organization |
| VariantSettings | `Products/Settings/VariantSettings` | settings | xml | Configure permitted field copying and generation limits | Proposed effective-dated `ProductVariantSetting` rows | own | catalog administrator | new | organization and copy policy |
| PricingSettings | `Products/Settings/PricingSettings` | settings | xml | Set authorized price purposes, default list and rounding | Proposed organization pricing settings | own | catalog administrator; finance for valuation links | new | organization |
| IdentificationTypes | `Products/Settings/IdentificationTypes` | settings | xml | Configure allowed identifier types and generation rules | `Enumeration` plus proposed identifier policy | own | catalog administrator | new | identifier policy |
| CatalogChecks | `Products/Settings/CatalogChecks` | report | xml | Find incomplete or conflicting catalog data before activation | Proposed validation service | own | catalog administrator | new | organization and checks |

## 3. Home and products

### Home

**Layout.** Landing; five number cards, recent edits and my catalog activities, then shortcut
links. Counts use the same authorized filters as Products, not separate definitions of active.
The cards and the shortcut row are dashboard widgets of crosscut §3.17.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| CatalogSummary | display | Explain catalog readiness | active SKUs, variants, missing price, discontinuing soon, incomplete (CatalogChecks) | dashboard number cards | proposed `ironstone.products.CatalogServices.get#CatalogSummary` | ERPNext Stock workspace and active-item number card |
| RecentProducts | list, read | Resume work on recent masters | product, name, type, last updated (`lastUpdatedStamp`) | record link | entity read | ERPNext Item list; Catalog `FindProduct` `ProductsForm` |
| Shortcuts | display | Open the main catalog areas | Products, Categories, Features, Price lists, Supplier prices, Import | dashboard shortcut tiles | none | research Home shortcut tiles; ERPNext Stock workspace shortcuts |
| MyActivities | component | Show assigned catalog follow-ups | record, due, priority, assignee | existing Today source | existing Commons Today provider in its Products context | design-drawers-commons §4–§5 |

**Actions.** Create product opens Products' dialog; Import opens ProductImport. Cards retain
their count's as-of time; failed cards show unavailable individually while the others load.
The incomplete card counts products with an error-severity CatalogChecks issue and opens
CatalogChecks with that filter. RecentProducts shows no actor, because Product records only
`ownerPartyId` in the audit log; the actor of a change is shown in Product360 History where
an audited field changed.
**Source.** Research §1; ERPNext `erpnext/stock/workspace/stock/stock.json` and
`erpnext/stock/number_card/total_active_items/total_active_items.json`.
**Needs.** PRD-SHELL, PRD-ACCESS, PRD-LIFECYCLE.

### Products

**Layout.** List with find header, saved views and one bulk-action bar. Search and structured
find use the same row selection and action definitions; there is no separate Search Products app.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ProductFind | find | Narrow master records | keyword, ID/name, type/class, owner, category, tag, feature, identifier, party item ID, lifecycle, missing-price | server-search lookups; category AND/OR; tag multi-select | none | Catalog `FindProduct` and `Search` find fields; Dolibarr product category operator |
| Products | list | Work the filtered catalog | product, name, type, lifecycle, owner, variant parent, price coverage, modified | saved finds, including seeded curated finds; thumbnail; price columns permission-filtered | entity `ProductFindView`; existing `MantleProduct` data document in the `mantle` search index for keyword; `mantle.product.ProductServices.find#ProductByIdValue` for scanned lookup | Catalog `FindProduct` and `Search` `ProductsForm`; ERPNext curated list filters |
| NewProduct | dialog | Create the smallest valid master | ID, name, product type, asset type, owner, stock/amount UOM | type-aware field visibility | entity create behind proposed catalog validation | Catalog `FindProduct` `NewProductForm` |
| BulkCategory | list, bulk | Apply or end selected category memberships | category, from/thru, selection | lookup and affected-count confirmation | `mantle.product.ProductServices.add#ProductsToCategory`, `mantle.product.ProductServices.remove#ProductsFromCategory` | Catalog `Search` `AddCategoryForm`, `RemoveCategoryForm`, `AddCategoryFormSelection`, `RemoveCategoryFormSelection` |
| BulkFeature | list, bulk | Apply or remove selected features | feature, application type, selection | lookup and confirmation | `mantle.product.ProductServices.add#FeatureToProducts`, `mantle.product.ProductServices.remove#FeatureFromProducts` | Catalog `Search` `AddFeatureForm`, `RemoveFeatureForm`, `AddFeatureFormSelection`, `RemoveFeatureFormSelection` |
| BulkPrice | list, bulk | Stage a reviewed price update | purpose, currency, effective date, selected products | preview before write | proposed `ironstone.products.CatalogServices.preview#PriceChanges`, `ironstone.products.CatalogServices.apply#PriceChanges` | ERPNext Item Price; Prices (§7) |

**Actions.** Create is primary. Open record, clone via Product360, export current filter or
selected rows, and print labels are secondary. Lifecycle actions revalidate each product
through proposed `ironstone.products.CatalogServices.transition#ProductStatus` (PRD-LIFECYCLE);
bulk actions return success/skipped/error by product. Delete is limited to unused draft
masters and confirms using `mantle.product.ProductServices.delete#Product`; ordinary retirement
uses lifecycle/dates. Removing a feature used to identify an active variant is refused with
the affected variants, not silently cascaded. A bulk selection carries a snapshot of IDs or
an explicit saved-find selection token; a later filter edit cannot silently enlarge it.
Keyword search runs a full-text query over the existing `MantleProduct` data document in the
`mantle` search index, as the baseline Search screen does, and applies the same authorized
owner filter. Party item ID matches `ProductParty` and supplier `ProductPrice`
`otherPartyItemId` values the user may read. Seeded curated saved finds are Virtual, Variants,
Services, Stocked, Discontinued and Missing price; users add their own saved finds beside them.
**States.** When the search index is unavailable or stale, the list says so and falls back to
an ID/name match on `ProductFindView`; it never shows an empty result as "no products".
**Views.** List and board grouped by lifecycle or product type; advanced pivot/graph remains
framework work, not assumed available. **Navigation.** All record links stay in Products;
operational links choose an accessible shared context before another app's route.
**Source.** Research §2–§3, §13; Catalog `Product/FindProduct.xml`, `Search.xml`; ERPNext
`erpnext/stock/doctype/item/item_list.js`; Dolibarr `htdocs/product/list.php`.
**Needs.** PRD-ACCESS, PRD-LIFECYCLE, PRD-BULK, PRD-PRICE.

### Product360 (Context passed)

Mount `Shared/Product360` at `Products/Products/Product360`, passing `productId`, Products
emphasis and server-derived capabilities. Tabs: Summary, Variants & features, Categories,
Identifiers, Dimensions & units, Packaging, Documents, Prices, Suppliers, Costs, Associations, Parties,
Connections, History; Kit components for a `PtPickAssembly` product; Stock and BOM/where-used
are available when their records/services and the user's rights permit them. Equipment
templates expose product meters and scheduled maintenance. Commerce
merchandising is a later extension; typed store content and identifiers already remain editable
here for an authorized catalog editor. Full forms are in crosscut §3.5.

Fixed scope is the selected product, its visible owner and the user's permitted organizations.
Actions: save catalog data, clone with selected sections, lifecycle transition, build variants,
manage category/feature links, edit permitted price/supplier rows, attach content and open a
cost estimate. Stock postings, financial revaluation and production release are separate
domain actions requiring their own rights. ProductPrice rows retain both party roles: an
internal seller in `vendorPartyId` for sales pricing, an internal buyer in `customerPartyId`
for supplier pricing.

The lifecycle transition calls proposed `ironstone.products.CatalogServices.transition#ProductStatus`
with the status IDs of PRD-LIFECYCLE. Price and supplier-price rows are written through proposed
`mantle.product.PriceServices.store#ProductPrice`, `replace#ProductPrice` and
`expire#ProductPrice` (§7). The Prices tab shows margin against the approved standard estimate
only to a user who holds both price reader and cost reader; the server computes it. New
measurement dimensions are created as `ProductUomDimension` rows. Existing `ProductDimension`
rows, which Mantle marks for deprecation, are shown and migrated but not created.

The Associations tab follows these rules. Substitutes are `PatEquivalent` (interchangeable)
and `PatReplacement` (supersedes) rows. Sales and purchasing consumers, such as Customer
Service's substitute on a short pick, read them as candidates; the source document's own
action authorizes the substitution. Production substitutes come from the BOM item's
substitution rule in BillOfMaterialsDetail, and `PatEquivalent` rows are candidates there only
when that rule allows equivalents. The generic association editor refuses `PatMfgBom` (kit
components use the Kit components pane; manufacturing methods use BillOfMaterialsDetail) and
`PatPackagingFor` (Packaging, §10).

The Connections pane is the crosscut §3.5 `ProductConnections` component (R-PRD-08). It shows
authorized per-type counts and links for sales and purchase order items (`OrderItem` by order
part direction), invoices (`InvoiceItem`), shipments (`ShipmentItem`), production runs
(`WorkEffortProduct`), BOM where-used, requests (`RequestItem`) and agreements
(`AgreementItem`). The Products context shows every type the user may read and links into
that type's list with the product fixed.

**Products-owned panes.** These forms are defined here and embedded by crosscut §3.5, as
SupplierPrices is:

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| KitComponents | list, editable rows | Maintain the components of a pick-assembly kit | component product, quantity, from/thru, sequence | product lookup; shown only for `PtPickAssembly` products | proposed `mantle.product.ProductServices.store#KitComponent` over `ProductAssoc` `PatMfgBom` rows | Catalog `EditAssocs` `AddAssocToForm`, `AssocToListForm` (PatMfgBom rows); Dolibarr product composition; ERPNext Product Bundle |
| ProductParties | list, editable rows | Maintain customer, manufacturer and distributor item codes | party, role (customer, manufacturer, distributor), party item ID, party item name, from/thru | party lookup; role selector | entity `mantle.product.ProductParty` through the catalog guard (PRD-ACCESS) | ERPNext Item customer items; Dolibarr customer product reference |
| ProductTags | list, editable rows | Add and remove tags | tag category, from/thru | chips with add/remove for catalog editors | `mantle.product.ProductServices.add#ProductsToCategory`, `mantle.product.ProductServices.remove#ProductsFromCategory` over categories of the proposed `PctTag` type | Odoo product tags; AureusERP product tags |

Kit components (D15). A kit is a `PtPickAssembly` product. Its components are `PatMfgBom` rows
on pick-assembly products only, and `store#KitComponent` refuses them on any other product
type, rejects cycles and non-positive quantities, and end-dates rather than deletes a used row.
The existing `mantle.product.AssetServices.get#AvailableInventory` computes kit availability
from these rows, and Warehouse's Pack PackAssembly assembles the kit through
`mantle.work.ManufacturingServices.produce#AvailableAssemblies` with its kit-cost guard
(review-core-apps §4.1 step 33, R-SA-04). Manufacturing's BillOfMaterialsDetail excludes these
rows and its legacy-association migration skips `PtPickAssembly` products.

Tags appear as chips on the Summary tab; ProductTags is that chip editor, and catalog readers
see the chips read only (R-PRD-36).
Source: research §3–§4, §7–§10 and Catalog Product forms (§12).
**Needs.** PRD-ACCESS, PRD-LIFECYCLE, PRD-VARIANTS, PRD-PRICE, PRD-COST, PRD-PACKAGING, PRD-CONTENT, PRD-KITS.

### InventoryAvailability (Context passed)

Mount crosscut §3.7 at `Products/Products/Product360/Stock`, fixed `productId`, showing
on-hand/reserved/available/incoming/projected stock by authorized facility and links to lots
and movements. Product managers see quantities without valuation unless granted cost access.
A user with Warehouse's facility-policy capability may maintain `ProductFacility` minimum stock, reorder
quantity/days-to-ship and `ProductFacilityLocation`; this does not require a Warehouse launcher
grant and does not authorize quantity adjustments. Use `mantle.product.AssetServices.get#AvailableInventory`,
`mantle.product.InventoryReportServices.get#InventoryProjectedInfo` and the shared FacilityPolicy
form through the shared screen. Source: research §10, §12–§13; Facility `EditFacilityProducts`.
Needs: PRD-ACCESS, CX-FACILITY-POLICY, CX-AVAILABILITY.

Every `ProductFacility` and `ProductFacilityLocation` write goes through proposed
`mantle.facility.FacilityServices.store#ProductFacilityPolicy`, the one Warehouse-owned policy
contract that Purchasing ReorderRules also calls (D20, crosscut §3.7). Products writes these
rows through no entity form of its own. The Policy pane also edits Warehouse's product-level
TrackingPolicy exception (lot or serial required, shelf-life days, near-expiry days) through
proposed `mantle.facility.WarehousePolicyServices.store#TrackingPolicy` with product scope,
defined by Warehouse StockPolicies and mounted here (review-core-apps §4.1 step 13). Product gains no
tracking or shelf-life fields. Lot and serial identities are generated at receipt by
Warehouse's proposed `WarehouseTaskServices.generate#TrackingIdentities` from that policy's
pattern (review-core-apps §4.1 step 12); Products defines none.

### BillOfMaterialsDetail (Context passed)

Mount Manufacturing's canonical `Shared/BillOfMaterialsDetail.xml` (Manufacturing §5) at
`Products/Products/Product360/BillOfMaterialsDetail`, the Product360 BOM tab. Fix `productId`
and the organization; allow authorized as-of date selection. This is the
Products row of crosscut §3.23. Tabs: the same BOM and routing forms as Manufacturing, with
cost and rate fields only for a cost reader. Filters fixed: the current product and
organization. Actions: read, explode and compare for method readers; edit and release only
with Manufacturing's method capabilities. Emphasis: product structure and standard-estimate
inputs. A Manufacturing launcher grant is not needed. Products builds the five method screens
and Manufacturing's method records and services as Manufacturing's contract, with the Products
context first (impl-products §4, P8).

The methods follow the shared effective-date rule (impl-products §4). A proposed `ProductBom`
header (product, organization and method; the Chatter and Files host through
`ProductBomContent`) has audit-logged method fields: base quantity and unit, phantom, routing,
lead and preparation days. Its `ProductBomItem` lines have a stable `bomItemId`, are
effective-dated and audit-log their key fields: role, product, quantity and unit, scrap,
consuming operation and applicability. Routings are Mantle's `WepRouting` templates and
`WepRoutingTask` operations on dated `WeatRoutingComp` rows, with audit-logged standards. A
release is an approval decision, a record of its own, that stamps the draft lines' from date and
the replaced lines' thru date, so a method "version" is the method as of a release date. Writes
go through proposed `mantle.product.BomServices` (`store#Bom`, `store#BomItem`,
`validate#BomDraft`, `release#BomDraft`) and `mantle.work.RoutingServices` (`store#Routing`,
`store#RoutingOperation`, `store#RoutingResource`, `release#RoutingDraft`). A `ProductBom` with
its released lines is the only manufacturing method; `PatMfgBom` stays for kits only (D15), whose
components stay in Product360's Kit components pane and are not shown here. The Cost estimate
action opens CostRollup with this BOM and routing and the selected as-of date fixed. Source:
crosscut §3.23; Manufacturing §5. Needs: CX-METHOD, PRD-COST.

### BillOfMaterialsExplosion (Context passed)

Mount `Shared/BillOfMaterialsExplosion.xml` at
`Products/Products/Product360/BillOfMaterialsDetail/BillOfMaterialsExplosion`, with product
and organization fixed and the as-of date and quantity/UOM open. It shows the
quantities, scrap, conversions and operation standards of proposed
`mantle.product.BomServices.get#BomExplosion` as of that one date. Its cost columns show the output of CostRollup's
proposed `mantle.product.CostServices.preview#ProductCostRollup`, only to a cost reader, so
there is one cost calculator. Roll up estimate opens CostRollup with the as-of date fixed.
Needs: CX-METHOD, PRD-COST.

### BillOfMaterialsCompare (Context passed)

Mount `Shared/BillOfMaterialsCompare.xml` at
`Products/Products/Product360/BillOfMaterialsDetail/BillOfMaterialsCompare`, with product and
organization fixed and two dates chosen, usually release dates, for proposed
`mantle.product.BomServices.compare#BomDates`. It is read only in the Products context.
Needs: CX-METHOD.

### WhereUsed (Context passed)

Mount `Shared/WhereUsed.xml` at `Products/Products/Product360/WhereUsed`, with the component
fixed to this product and the organization fixed, and effectivity open, over proposed
`mantle.product.BomServices.get#BomWhereUsed`. Each parent links to
that product's Product360 BOM tab. Kit uses (`PatMfgBom` rows of `PtPickAssembly` products)
are listed read only and link to the parent's Kit components pane. It is read only in the
Products context. Needs: CX-METHOD.

### RoutingDetail (Context passed)

Mount `Shared/RoutingDetail.xml` at `Products/Products/Product360/RoutingDetail`, with the
routing of the product's method and the selected as-of date fixed. Method readers read it; only
Manufacturing's method capabilities edit and release it. Work-center rates and standard times are shown
only to a cost reader. Needs: CX-METHOD, CX-WORKCENTER.

### ProductImport

**Layout.** Wizard: upload/type → map → validate → preview → apply/results. Import kinds are
products, identifiers, category memberships, features and price rows; supplier-price import
fixes the corresponding party roles and requires supplier-price authority.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ImportUpload | wizard step | Stage the file | file, kind, organization, encoding, delimiter, update key | file upload; sample download | proposed `ironstone.products.ImportServices.stage#CatalogImport` | Akaunting generic import |
| ImportMapping | wizard step | Map columns explicitly | source column, target field, default, date/number format | editable mapping list | proposed `ironstone.products.ImportServices.map#CatalogImport` | Akaunting import sample, extended with mapping |
| ImportValidation | list, read | Review row-level errors and proposed changes | row, product key, old/new values, errors, warnings | expandable diff; filters | proposed `ironstone.products.ImportServices.validate#CatalogImport` | Akaunting per-row failure feedback |
| ImportApply | wizard step | Apply reviewed valid rows | run, selected valid rows, expected revision, update mode | affected-count confirmation | proposed `ironstone.products.ImportServices.apply#CatalogImport` | same reference; Products bulk actions |
| ImportResults | list, read | Resume or export failures | row, created/updated ID, outcome, error, retry state | download error CSV | proposed `ironstone.products.ImportServices.get#CatalogImport` | same reference |

**Actions.** Apply is available after validation and reports the exact valid-row count. Invalid
rows remain excluded with reasons; independent rows continue after a failure. Each row uses
an operation key and its normal authorized domain service. A dependent product-plus-identifiers
row is atomic; retry skips committed rows and revalidates failed rows. Existing IDs and price
date ranges are rechecked at apply time. Import never treats a missing cell as delete unless
the preview explicitly shows a permitted clear operation. **States.** Stale validation reports
changed records and returns to preview; disconnect resumes the durable run. Price and
supplier-price rows apply through proposed `mantle.product.PriceServices.store#ProductPrice`,
so an import obeys the same direction, overlap and authority checks as the screens.
**Source.** Research
§2, §14; Akaunting `resources/views/common/import/create.blade.php`, `app/Utilities/Import.php`.
**Needs.** PRD-IMPORT, PRD-ACCESS, PRD-BULK.

## 4. Variants and configuration

### VariantBuilder

**Layout.** `.qvue` wizard with selectable feature sets above a paged combination matrix, a
selected-count/collision summary and creation results. It uses existing `m-*` lookups, checks,
dialogs and messages. Two axes show the selected feature types; additional types are filters.
The same full combination key identifies a row in all views.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| VariantSetup | wizard step | Choose the source and generation policy | virtual product, feature groups, variant type, copy fields, copy categories | server-search feature groups | `mantle.product.ProductServices.find#ProductFeatureGroups`, `mantle.product.ProductServices.get#VariantProductsInfo` | Catalog `EditAssocs` `CreateVariantsForm`, `AllSelectableFeaturesForm`; ERPNext variant dialog |
| VariantPreview | component | Select valid combinations | features, existing variant, proposed SKU, allowed, reason, selected | matrix with paged list alternative | proposed `mantle.product.ProductServices.preview#VariantProducts` | ERPNext Item multiple-variant dialog; Dolibarr combinations |
| VariantCreate | wizard step | Materialize selected combinations | product, preview revision, selected feature sets, operation key | confirmed count | `mantle.product.ProductServices.create#VariantProducts` (extended) | Catalog `EditAssocs` `CreateVariantsForm` |
| VariantResults | list, read | Show created, existing and failed variants | combination, product ID, result, error | per-row retry | response from extended `create#VariantProducts` | ERPNext queued variant creation |

**Actions.** Preview is first primary; Generate selected replaces it after validation. Never
invoke the legacy all-combinations behavior implicitly from a partial selection. Existing
combinations are linked, not duplicated. Revalidate selectable features, interactions and SKU
uniqueness during creation. Each independent variant succeeds or fails separately and returns
its feature key; creating a variant and its required identity links is atomic.
**Devices.** Terminal twin is an XML setup form and paged list of feature combinations with
selection, validation and generation using the identical services; it has full write parity.
Phone uses the paged combination list rather than a horizontally scrolling matrix.
**Source.** Research §4; ERPNext `erpnext/stock/doctype/item/item.js` and
`erpnext/controllers/item_variant.py`; Dolibarr `htdocs/variants/combinations.php`;
current Mantle `ProductServices.xml` `create#VariantProducts`/`mantle.product.ProductServices.create#VariantProduct`.
**Needs.** PRD-VARIANTS, PRD-VARIANT-UI, PRD-ACCESS.

### Configurations

**Layout.** List of configurable definitions, version and use; later scope. Full SKU variants
remain the first-release model. Informational/optional features use the active feature and
parameter records without generating a SKU for each answer.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ConfigurationFind | find | Find definitions | product, owner, version state, active date | product lookup | none | Carbon configurable-part details |
| Configurations | list | Open versioned definitions | product, version, state, effective interval, uses | status chips | proposed `mantle.product.ConfigurationServices.find#ProductConfigurations` | Carbon ConfigurationParameters; Mantle commented configuration concepts |
| NewConfiguration | dialog | Start a draft version | product, name, based-on version, effective start | product lookup | proposed `mantle.product.ConfigurationServices.create#ProductConfiguration` | same |

**Actions.** Create draft, clone version and archive unused draft. Published versions are
immutable and retained for order/production references. **Source.** Research §4, §14; Carbon
`apps/erp/app/modules/items/ui/Parts/ConfigurationParameters.tsx`.
**Needs.** PRD-CONFIGURATION.

### ConfigurationDetail

**Layout.** Editor; tabs Questions, Options/components, Constraints, Preview and Uses.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ConfigurationHeader | single | Maintain draft scope | product, version, description, effective dates | read-only released header | proposed `mantle.product.ConfigurationServices.store#ProductConfiguration` | Carbon typed configuration parameters |
| Questions | list, editable rows | Define typed answers | key, group, label, type, required, default, bounds, sequence | typed default editor | proposed `mantle.product.ConfigurationServices.store#ConfigurationQuestion` | Carbon ConfigurationParameters; active `ProductParameter` concepts |
| Options | list, editable rows | Link answers to components | question, option, component product, quantity, feature, amount | product lookup | proposed `mantle.product.ConfigurationServices.store#ConfigurationOption` | commented `ProductConfigOptionProduct`; Carbon method parameters |
| Constraints | list, editable rows | Express compatible answers | left option, relation, right option, message | constrained relation selector | proposed `mantle.product.ConfigurationServices.store#ConfigurationConstraint` | `ProductFeatureIactn` dependency pattern |
| ConfigurationPreview | component | Validate a sample configuration | answers, valid/invalid reasons, components, estimated price | typed input controls | proposed `mantle.product.ConfigurationServices.evaluate#ProductConfiguration` | Carbon configurable quote/job inputs |
| ConfigurationUses | list, read | Show frozen uses | order, production order, version, configuration fingerprint | authorized record links | entity read through proposed visibility service | Carbon configurable item uses |

**Actions.** Save draft; Validate; Publish after a valid preview and cycle/dependency checks.
Generated configurable-instance SKUs are created only on an explicit order-time confirmation
through `PatConfigInstance`, reusing a canonical answer fingerprint. An order stores the
published definition version and selected answers, so later edits do not change its meaning.
The evaluator uses declarative typed comparisons; configuration rules are not arbitrary code.
**Source.** Research §4, §14; Carbon path above; Mantle `ProductParameter*` active definitions
and `ProductConfig*` commented references in `ProductDefinitionEntities.xml`.
**Needs.** PRD-CONFIGURATION, PRD-PRICE, PRD-ACCESS.

### ChangeNotices

**Layout.** List and board by review state; later scope, for businesses needing controlled
engineering changes rather than ordinary catalog edits.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ChangeNoticeFind | find | Find proposed/released changes | owner, state, product, reviewer, date | product lookup | none | Carbon change notices |
| ChangeNotices | list | Work the change queue | notice, title, state, affected count, reviewer, effective date | board by state | proposed `mantle.product.ChangeServices.find#ProductChanges` | Carbon ChangeNotice |
| NewChangeNotice | dialog | Propose a change set | title, reason, owner, affected products, reviewer | multi-product lookup | proposed `mantle.product.ChangeServices.create#ProductChange` | Carbon change notice form |

**Actions.** Create; open; withdraw a draft with reason. **Source.** Research §3, §10;
Carbon `apps/erp/app/modules/items/ui/ChangeNotice/`.
**Needs.** PRD-CHANGE, PRD-ACCESS.

### ChangeNoticeDetail

**Layout.** Detail; Summary, Differences, Impact, Review, Files/Chatter.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ChangeHeader | single | Maintain reason and planned effect | title, reason, reviewer, effective date, state | status-bar | proposed `mantle.product.ChangeServices.store#ProductChange` | Carbon change notice header |
| ChangedRecords | list | Stage versioned changes | product, old/new revision, field summary, BOM/routing references | existing diff viewer | proposed `mantle.product.ChangeServices.get#ProductChangeDiff` | Carbon diff/impact panels |
| ChangeImpact | list, read | Identify affected open operations | product, dependent BOM, open order, stock, action needed | authorized links | proposed `mantle.product.ChangeServices.get#ProductChangeImpact` | Carbon UsedIn and change impact |
| ChangeDecision | dialog | Approve, reject or release | notice, expected revision, decision, reason | confirmation on release | proposed `mantle.product.ChangeServices.decide#ProductChange` | Carbon change release; Commons approvals |

**Actions.** Submit for review, approve/reject, then release at the effective time. Release
does not rewrite released BOM or routing lines or historic order lines. Its
impact list offers an explicit operational amendment workflow where permitted. A conflict
keeps the notice pending with the changed record named. **Source.** Research §3, §10;
Carbon ChangeNotice and `Item/RevisionForm.tsx`. **Needs.** PRD-CHANGE, CX-METHOD.

## 5. Categories

### Categories

**Layout.** List with tree view; typed roots for catalog, internal, inventory and tags. Tags
are categories of a proposed `PctTag` category type.
`ProductCategoryRollup` is a graph of parent links, not a single `parentId`. A category
appearing under multiple parents has one record identity and multiple occurrence keys.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| CategoryFind | find | Select taxonomy and ownership | name/ID, type, owner, parent, as-of date | parent lookup | none | Catalog `FindCategory` |
| Categories | list | Browse and open categories | category, name, type, owner, active members | `view-tree` with occurrence keys | entity read; proposed `ironstone.products.CategoryServices.move#CategoryParent` for drag/keyboard move | Catalog `FindCategory` `CategoriesForm`; Dolibarr category tree |
| NewCategory | dialog | Create a node | name, type, owner, optional parent | parent lookup | entity create plus guarded rollup creation | Catalog `FindCategory` `NewCategoryForm` |

**Actions.** Create; open; view products in this branch. Drag moves only the selected parent
edge after confirmation showing old/new parent; Add parent creates an additional edge. The
server prevents cycles across effective-date overlaps. Counts deduplicate products appearing
through multiple paths. **Views.** List/tree; terminal tree provides the same Move/Add-parent
dialog, so pointer dragging is optional. **Source.** Research §5; Catalog `Category/FindCategory.xml`;
Dolibarr `htdocs/categories/index.php`; Odoo `odoo/addons/product/views/product_category_views.xml`.
**Needs.** PRD-TAXONOMY, PRD-ACCESS.

### CategoryDetail

**Layout.** Detail; Summary, Parents & children, Products, Feature defaults, Identifiers, Content.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Category | single | Maintain the node | ID, name, type, owner, description | enum and owner lookups | entity | Catalog `EditCategory` `EditCategoryForm` |
| AddChild | dialog | Link an existing child | child, from/thru, sequence | category lookup | proposed guarded category-rollup service | Catalog `EditCategory` `AddChild` |
| ChildCategories | list, editable rows | Edit dated child edges | child, interval, sequence | row end-date action | proposed guarded category-rollup service | Catalog `EditCategory` `ChildCategoriesForm` |
| ParentCategories | list, editable rows | Show/edit all parents | parent, interval, sequence | Add parent dialog | proposed guarded category-rollup service | Catalog `EditCategory` `ParentCategoriesForm` |
| AddCategoryProduct | dialog | Add members | product, from/thru, sequence | product lookup | entity `ProductCategoryMember` | Catalog `EditProducts` `AddProductForm` |
| CategoryProducts | list, editable rows | Maintain membership | product, dates, sequence | row end-date action | entity `ProductCategoryMember` | Catalog `EditProducts` `ProductsForm` |
| AddCategoryFeatureGroup | dialog | Define category feature defaults | group, application type, dates | group lookup | entity `ProductCategoryFeatGrpAppl` | Catalog `EditCategory` `AddFeatureGroupForm` |
| CategoryFeatureGroups | list, editable rows | Maintain defaults | group, application type, dates | row edit | entity | Catalog `EditCategory` `FeatureGroupsForm` |
| GenerateCategoryIdentifier | dialog | Suggest a localized URL slug | category, name, store, segment | generated preview | `mantle.product.StoreServices.generate#UrlSlugFromCategoryName` | Catalog `EditCategory` `GenerateCategoryIdent` |
| AddCategoryIdentifier | dialog | Add a scoped identifier | type, value, store, segment, dates | enum lookup | entity `ProductCategoryIdent` | Catalog `EditCategory` `AddCategoryIdentForm` |
| CategoryIdentifiers | list, editable rows | Edit scoped identifiers | type, value, scope, dates | uniqueness feedback | entity | Catalog `EditCategory` `CategoryIdentForm` |

**Actions.** Save is primary; add links/members through dialogs; remove unused links or end
date used relationships. Category deletion is refused while used. Store identifiers are
metadata; publishing navigation remains Commerce's responsibility. **Navigation.** Content
mount and filtered Products list preserve category and as-of context. **Source.** Research
§5, §13; Catalog `Category/EditCategory.xml`, `EditProducts.xml`.
**Needs.** PRD-TAXONOMY, PRD-ACCESS.

### CategoryContent

**Layout.** Editor with content list and selected metadata/text/preview; full-width when
editing text. It retains typed localized category content rather than reducing it to generic files.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| CategoryContentList | list | Select content | type, locale, store, effective dates, location | preview/download links | entity | Catalog `Category/Content/ContentList` `ContentList` |
| CategoryUpload | dialog | Add a file | type, locale, dates, file | upload | `mantle.product.ProductServices.create#ProductCategoryContent` | same `NewContentForm` |
| CategoryLocation | dialog | Add a resource reference | type, locale, dates, location | authorized resource picker | same create service | same `NewLocationForm` |
| CategoryText | dialog | Add localized text | type, locale, dates, text | existing editor | same create service | same `NewTextForm` |
| CategoryContentMetadata | single | Edit metadata | type, locale, effective dates, content ID | date interval | `mantle.product.ProductServices.update#ProductCategoryContent` | Catalog `Category/Content/ContentDetail` `UpdateContentForm` |
| CategoryTextEdit | single | Edit text/version | content ID, text, expected revision | existing text editor and version compare | same update service, with proposed revision check | same `UpdateTextForm` |

**Actions.** Save; upload; compare versions; end-date content. Untrusted locations are subject
to existing resource access controls and are not blindly fetched by a preview service.
**Source.** Research §5, §8, §13; Catalog category Content screens. **Needs.** PRD-CONTENT, PRD-ACCESS.

## 6. Features

### Features

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| FeatureFind | find | Find typed values | description, type, owner, code, group | group lookup | none | Catalog `FindFeature` |
| Features | list | Open/edit feature values | type, description, abbreviation, code, number/unit, owner | grouped list | entity | Catalog `FindFeature` `FeaturesForm` |
| NewFeature | dialog | Create a value | type, description, abbreviation, owner, number/unit, default amount | typed value controls | `mantle.product.ProductServices.create#ProductFeature` | Catalog `FindFeature` and `EditFeature` `NewFeatureForm` |

**Actions.** Create; open; export. No deletion of a value distinguishing a used variant.
**Source.** Research §4; Catalog `Feature/FindFeature.xml`; ERPNext Item Attribute.
**Needs.** PRD-ACCESS, PRD-VARIANTS.

### FeatureDetail

**Layout.** Detail; value, groups, products and interactions.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Feature | single | Maintain the typed value | type, description, abbreviation, number/unit, owner, sequence | decimal/unit pair | entity | Catalog `EditFeature` `EditFeatureForm` |
| AddFeatureGroup | dialog | Add a group membership | group, dates, sequence | group lookup | entity `ProductFeatureGroupAppl` | Catalog `EditFeature` `AddFeatureGroupForm` |
| FeatureGroups | list, editable rows | Maintain memberships | group, interval, sequence | inline row edit | entity | same `FeatureGroupsForm` |
| AddFeatureProduct | dialog | Apply to a product | product, application type, amount, dates | product lookup | `mantle.product.ProductServices.apply#ProductFeatures` | same `AddProductForm` |
| FeatureProducts | list, editable rows | Review/update uses | product, application type, amount, dates | product links | entity `ProductFeatureAppl` through guarded validation | same `ProductsForm` |

**Actions.** Save; add/end-date a membership; open Interactions with this feature fixed.
Changing a distinguishing value's meaning requires a new value and explicit migration;
renaming its localized description does not rewrite product identity. **Source.** Research §4,
§13; Catalog `Feature/EditFeature.xml`. **Needs.** PRD-VARIANTS, PRD-ACCESS.

### FeatureGroups

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| FeatureGroupFind | find | Find sets | ID, description, category | category lookup | none | Catalog `FindFeatureGroup` |
| FeatureGroups | list | Open sets | group, description, owner, features, category uses | count links | entity | Catalog `FindFeatureGroup` `FeatureGroupsForm` |
| NewFeatureGroup | dialog | Create a set | ID, description, owner | default fields | guarded `ProductFeatureGroup` | same `NewFeatureGroupForm` |

Feature groups carry `ownerPartyId`; legacy null and `_NA_` groups are shared. Group reads and writes follow the catalog owner/capability boundary, and shared master writes require framework ADMIN.

**Actions.** Create and open; delete only when unused. **Source.** Research §4, §13; Catalog
`FeatureGroup/FindFeatureGroup.xml`. **Needs.** PRD-ACCESS.

### FeatureGroupDetail

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| FeatureGroup | single | Edit the group | ID, description, owner | default fields | guarded entity | Catalog `EditFeatureGroup` `EditFeatureGroupForm` |
| AddGroupCategory | dialog | Apply group to category | category, application type, dates | category lookup | entity `ProductCategoryFeatGrpAppl` | same `AddCategoryForm` |
| GroupCategories | list, editable rows | Maintain category uses | category, type, dates | row edit | entity | same `CategoriesForm` |
| AddGroupFeature | dialog | Add a value | feature, dates, sequence | feature lookup | entity `ProductFeatureGroupAppl` | same `AddFeatureForm` |
| GroupFeatures | list, editable rows | Maintain values and order | feature, dates, sequence | row edit | entity | same `FeaturesForm` |

**Actions.** Save; add/end-date links. Existing variants remain valid when the selectable set
changes; preview shows which existing combinations fall outside the current set. **Source.**
Research §4, §13; Catalog `FeatureGroup/EditFeatureGroup.xml`. **Needs.** PRD-VARIANTS, PRD-ACCESS.

### FeatureInteractions

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| InteractionFind | find | Limit the rule set | feature, related feature, product, relation | feature lookups | none | Mantle feature interaction model; Odoo attribute exclusions |
| Interactions | list, editable rows | Maintain valid relationships | feature, related feature, interaction type, product, quantity, amount | relation selector | proposed `mantle.product.ProductServices.store#FeatureInteraction` | active `ProductFeatureIactn`; Odoo attribute exclusions |
| InteractionPreview | dialog | Check the effect on a product | product, selected features, affected variants, errors | preview list | proposed `mantle.product.ProductServices.preview#FeatureInteractions` | ERPNext variant validation |

**Actions.** Save with preview of affected combinations; conflicting dependencies are refused.
Existing `PfitDependency`, `PfitCompatible`, `PfitIncompatible` and `PfitComposition` semantics
are retained, with variant generation enforcing relevant dependency/incompatibility rules.
Changing rules does not erase existing variants or booked orders. The `ProductFeatureIactn` key
is the feature pair; `productId` is not part of it, so there is one rule per pair. A
product-scoped rule for a feature pair already used elsewhere is refused with the existing
rule named. Differing per-product rules for one pair need a proposed key extension
(PRD-VARIANTS). **Source.** Research §4, §14; `ProductDefinitionEntities.xml` active `ProductFeatureIactn`.
**Needs.** PRD-VARIANTS, PRD-ACCESS.

## 7. Pricing and costs

This file owns the full PriceLists, PriceListDetail and PriceExplain design. Their reusable
physical definitions are `screen/Shared/PriceLists.xml`, `Shared/PriceListDetail.xml` and
`Shared/PriceExplain.xml`, mounted at the Products routes in §2 and at other authorized app
routes. Crosscut §3.21 indexes these definitions. A consuming app passes fixed pricing scope
and server-derived capabilities; access never requires the Products launcher grant. The
per-app context table for the three price screens follows PriceExplain, and the one for
SupplierPrices follows that screen in §8; crosscut §3.21 links to them.

Every `ProductPrice` write, from Prices, Product360, SupplierPrices, imports and Purchasing's
quote publication, goes through three proposed services. `mantle.product.PriceServices.store#ProductPrice`
creates or updates a row. It validates the direction (a sales price has an internal
`vendorPartyId`; a purchase price has an external `vendorPartyId` and an internal
`customerPartyId`), refuses an overlapping row of equal precedence, refuses a product-specific
pack unit such as a case in `quantityUomId` (a case offer is a row for the pack product, D16),
and checks the grant for that direction.
`mantle.product.PriceServices.replace#ProductPrice` schedules a successor and closes the prior
interval in the same scope. `mantle.product.PriceServices.expire#ProductPrice` end-dates a row.
The existing `mantle.product.PriceServices.modify#ProductPrice` is the resolver's price-modifier
interface, used during resolution and by the list-rule extension; it is not a store service.

### Prices

**Layout.** List of effective-dated base prices. Saved views distinguish sales prices (internal
vendor) and supplier prices (internal customer); a non-null `vendorPartyId` alone never means
supplier pricing. Historical rows stay visible under an explicit as-of filter. Purchase-direction
rows appear only for a supplier-price reader and are editable only by a supplier-price editor;
a price editor alone sees sales-direction rows.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| PriceFind | find | Select a price scope | product, type/purpose, currency, supplier/customer, agreement, store, as-of | party-role-aware lookups | none | Catalog `EditPrices` find header |
| Prices | list, editable rows | Correct permitted unreferenced price data | product, scope, min quantity, amount, currency, tax inclusion, interval, margin | currency/quantity units; explain link; margin column only with price reader and cost reader | proposed `mantle.product.PriceServices.store#ProductPrice` | Catalog `EditPrices` `PricesForm`; Dolibarr product margins |
| NewPrice | dialog | Add an effective-dated price | product, type/purpose, parties, agreement/store, min quantity, quantity UOM, amount/currency, dates | context defaults | proposed `mantle.product.PriceServices.store#ProductPrice` | Catalog `EditPrices` `NewPriceForm` |
| PriceChange | dialog | Schedule a successor amount | source row, new amount, effective date, reason | before/after preview | proposed `mantle.product.PriceServices.replace#ProductPrice` | Dolibarr price history; ERPNext Item Price |

**Actions.** New price; Schedule change; end-date through `expire#ProductPrice`; Explain. A
scheduled successor closes the prior interval only within the same explicit scope; it does not alter unrelated tiers or
agreements. Overlapping rows at equal precedence are blocked or explicitly resolved in the
preview. Audit history remains available. **Source.** Research §6–§7; Catalog `Product/EditPrices.xml`;
ERPNext `erpnext/stock/doctype/item_price/item_price.json`; Odoo supplierinfo.
**Needs.** PRD-PRICE, PRD-ACCESS.

### PriceLists

**Layout.** List with purpose, owner, currency and effective state; configuration is shared
with other applicable app mounts, whose fixed scope is carried into the editor.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| PriceListFind | find | Find permitted lists | organization, purpose, currency, party/store, state, date | scope lookups | none | ERPNext Price List; Odoo pricelist |
| PriceLists | list | Open and compare lists | name, purpose, currency, scope, priority, interval, state | status chip | proposed `mantle.product.PriceServices.find#ProductPriceLists` | Odoo pricelist list; AureusERP PriceListResource |
| NewPriceList | dialog | Create or clone a draft | name, organization, purpose, currency, based-on list | currency and list lookups | proposed `mantle.product.PriceServices.store#ProductPriceList` | ERPNext Price List; AureusERP PriceListForm |

**Actions.** New; clone draft; open; retire. A list used by recorded prices is retained.
**Per-app context.** In the table after PriceExplain. Every mount uses the same resolver and
authorization rules.
**Source.** Research §6; ERPNext `erpnext/stock/doctype/price_list/price_list.json`;
Odoo `odoo/addons/product/views/product_pricelist_views.xml`.
**Needs.** PRD-PRICE.

### PriceListDetail

**Layout.** Detail with Header, Rules, Scope and Preview. A rule is a single-form dialog,
not a separate screen. Publish shows exactly which transaction contexts become eligible.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| PriceList | single | Maintain list policy | name, organization, purpose, currency, priority, state, effective dates | status-bar; currency lookup | proposed `mantle.product.PriceServices.store#ProductPriceList` | AureusERP PriceListForm; ERPNext Price List |
| PriceListScope | single | Constrain applicability | store, vendor/customer, agreement/item, party classification, country or geo group (`geoId`) | authorized lookups; geo lookup over `moqui.basic.Geo` | same proposed store service | ERPNext Pricing Rule applicability; ERPNext Price List Country; Odoo country groups |
| PriceRules | list | Review rule precedence | sequence, scope, min quantity, interval, base, adjustment, outcome | drag/keyboard reorder through transition | proposed `mantle.product.PriceServices.find#ProductPriceRules` | Odoo pricelist item grid |
| PriceRule | dialog | Edit a declarative price calculation | selector, quantity range, dates, base/list, fixed amount or adjustment, rounding, margin bounds, sequence | dependent fields; currency/unit indicators | proposed `mantle.product.PriceServices.store#ProductPriceRule` | AureusERP PriceRuleItem and Odoo pricelist item form |
| PriceListPreview | display | Test a context before publishing | product, parties, quantity/UOM, date, base, selected rule, final amount | link to PriceExplain | extended `mantle.product.PriceServices.get#ProductPrice` | ERPNext applied Pricing Rule Detail |

**Resolver decision.** Preserve the public resolver and legacy base-row behavior when no
list is selected or applicable. Add organization, quantity-UOM, list and agreement context,
and an optional explain output. An explicit authorized list wins; otherwise select the
applicable list by explicit list priority, then stable list ID. Rules are evaluated by
explicit sequence then stable rule ID, first eligible rule wins. A list or rule scoped to a
geo applies when the transaction's ship-to or bill-to country is that geo or a member of that
geo group (`GeoAssoc`). Scope and tier differences
are visible in that order rather than relying on implicit specificity. Reject duplicate
effective sequence within a list. Rules select all/product/category/feature and optionally
party classification; variant selection uses its actual product ID. A base may be a typed
price, approved standard estimate or another list. Detect list cycles on save and at evaluation;
missing base/rate/conversion is a named failure, never an implicit zero price.

Fixed price, percentage discount/markup and fixed adjustment are declarative operations.
Apply base → percentage → fixed adjustment → configured rounding → bounds; the preview
shows each step and the units used. Do not allow arbitrary executable formulas. The list
modifier runs once within `ProductPriceModify`; existing other modifiers retain sequence and
their effects appear in the explanation. Agreement ID/item matching is added before generic
base-row fallback. Pricing an order promotion remains the separate order-promotion service.
The resolver's current anonymous-view use must not expose internal explanation/cost/supplier
details: public callers receive the public price only; full trace requires authorized access.

**Actions.** Save draft; preview; publish/retire (confirm scope and effective date). Publishing
does not reprice existing order lines automatically. Changing a published rule ends its row and
starts a dated successor, its key fields audit-logged (impl-products §4); transaction pricing
records keep source row/rule IDs and computation inputs. An order line keeps the selected row in
the existing `OrderItem.productPriceId` and the list and rule in audit-logged
`OrderItem.priceListId` and `priceRuleId`, read as of the line's pricing time. The
resolver returns all three, and the existing `mantle.order.OrderServices.create#OrderItem` and
`add#OrderProductQuantity` store them. `OrderItem.standardCost` is set from the approved
standard estimate when one exists.
**Source.** Research §6; current Mantle `PriceServices.xml`; AureusERP
`plugins/webkul/products/src/Services/PriceListResolver.php` (base-list cycle guard and rule
selection), Odoo `odoo/addons/product/views/product_pricelist_item_views.xml`, ERPNext
`erpnext/accounts/doctype/pricing_rule/pricing_rule.json`.
**Needs.** PRD-PRICE, PRD-COST, PRD-ACCESS.

### PriceExplain

**Layout.** Report with transaction-context inputs, one prominent resolved amount, and a
step-by-step trace. It makes supplier and customer scope explicit before calculation.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| PriceContext | single | Reproduce transaction pricing | product, organization, parties, quantity/UOM, currency, date, list, agreement/store | server-search lookups | extended `mantle.product.PriceServices.get#ProductPrice` with `explain=true` | Catalog price fields; ERPNext Pricing Rule Detail |
| PriceResult | display | Show amount and provenance | amount, list amount, currency/UOM, tax inclusion, source row, list and rule with their effective dates, margin, warning | amount display; margin only with price reader and cost reader | same resolver response | ERPNext applied rule detail; AureusERP ResolvedPrice; Odoo product margin |
| PriceTrace | list, read | Explain inclusion and calculation | step, candidate/source, eligible/reason, input amount, change, output amount | expandable authorized details | same response | new |

**New form fields.** PriceTrace: step sequence, step kind, source entity, ID and effective dates,
eligibility flag/reason, product/virtual fallback, quantity and UOM used, currency/rate/date,
before amount, operation, operand, after amount, rounding result and warning. Restricted
source identity and amounts are omitted server-side; the screen never redacts after fetching.
**Actions.** Calculate (read-only), copy authorized explanation, open source row. The result
states whether promotions and final tax calculation are excluded. An unavailable price is
distinct from an explicitly configured zero: add availability/source flags to the resolver
result while preserving its legacy numeric fields for existing callers. Margin is the
resolved amount less the approved standard estimate, in the same currency and unit, computed on
the server. **Per-app context.** In the table below; callers may fix fields but cannot broaden
the user's permitted scope. **Source.** Research §6, §14;
current `PriceServices.xml` shows the agreement TODO and lack of explanation output.
**Needs.** PRD-PRICE, PRD-ACCESS.

**Per-app context (PriceLists, PriceListDetail and PriceExplain)**

| App | Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- | --- |
| Products | Lists, rules, preview and the full explanation | authenticated organization; optional product, party or store | maintain authorized lists and rules, preview, publish, retire and explain | catalog policy and provenance |
| Purchasing | Purchase explanation; lists and rules reached from its links | external vendor, internal buyer, product, quantity/UOM, date, agreement | explain; lists and rules only with the price-editor grant | sourcing basis without repricing existing POs |
| Customer Service / order context | Customer-safe explanation and the selected sale price | internal seller, customer and source order/item | explain, read only, unless an explicit price-exception capability is granted | customer promise; no vendor cost or competitor data |
| Sales | Reserved for the Sales design pass | internal seller, customer, agreement | — | — |
| Commerce | Reserved for the Commerce design pass | store | — | — |

### PriceHistory

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| PriceHistoryFind | find | Select recorded changes | product, scope, period, actor, currency | period control | none | Dolibarr product price log |
| PriceChanges | list, read | Explain old/new values | time, actor, row, scope, old/new price, reason | audit diff | proposed `ironstone.products.CatalogServices.get#PriceAudit` over `moqui.entity.EntityAuditLog` | `ProductPrice.price` audit logging; Dolibarr price log |
| TransactionPriceStatistics | list, read | Compare prices actually transacted | period, sales/purchase, quantity, min/max/weighted average, currency | chart plus underlying table | `mantle.product.InventoryReportServices.get#PriceHistoryInfo` | existing price-history service; Dolibarr product statistics |

**Actions.** Read/export only; changing a price opens Prices with a successor date. Audit rows
are not equivalent to order prices, so the two forms remain separately labeled. Today only
`ProductPrice.price` is audit-logged; PRD-PRICE adds `enable-audit-log` to `ProductPrice`
`fromDate`, `thruDate` and `minQuantity`, so interval and tier edits, including a successor's
end-date, reach PriceChanges. Until then PriceChanges is labeled price-amount history. **Source.**
Research §6, §10, §13; Dolibarr `htdocs/product/price.php`; Mantle InventoryReportServices.
**Needs.** PRD-PRICE, PRD-ACCESS.

### StandardCosts

**Layout.** List with an estimate-detail dialog and component grid in the selected row's
expansion. An estimate is a proposed `ProductStandardCost` row keyed by `productStandardCostId`,
effective-dated by organization and product, with its amounts audit-logged and no version field.
Approval starts the estimate's row and ends the one before it, and stores the approved estimate's
PDF with it (impl-products §4, P9).

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| StandardCostFind | find | Find estimates in context | product, organization, facility, date, currency, state | context lookups | none | ERPNext Item Standard Cost |
| StandardCosts | list | Compare effective estimates | product, from/thru, material/labor/overhead total, currency/UOM, state | expandable components | proposed `mantle.product.CostServices.find#ProductStandardCosts` | ERPNext Item Standard Cost; Carbon costing form |
| StandardCost | dialog | Maintain a draft estimate | product, organization/facility, effective interval, currency/UOM, reason, source | explicit estimate label | proposed `mantle.product.CostServices.store#ProductStandardCost` | ERPNext Item Standard Cost |
| StandardCostComponents | list, editable rows | Explain estimated cost | component type, source, quantity/unit, rate, amount | decimal/unit pairs | proposed `mantle.product.CostServices.store#StandardCostComponent` | commented cost-component concepts, refined for estimates |
| ApproveStandardCost | dialog | Approve an estimate without posting stock | estimate, effective date, approval reason | confirmation of non-posting effect | proposed `mantle.product.CostServices.approve#ProductStandardCost` | ERPNext standard-cost submission, separated from revaluation |

**Actions.** New draft, clone estimate, approve; optional Request revaluation opens Accounting's
authorized workflow with this estimate as source. Products never calls `mantle.product.AssetServices.update#ProductAcquireCost`
as a side effect of saving an estimate. Approve requires the standard-cost approver grant; the
estimate's drafter approves only when the self-approval setting allows (§1.1, §16).
Request revaluation passes `productStandardCostId` to Accounting's
InventoryValuation ValuationAdjustment, which previews and then posts through Accounting's
proposed `ironstone.accounting.AssetBookServices.post#Revaluation`; the baseline Asset
FindAsset `UpdateProductCost` correction is handed to that same form (R-PRD-14). Manufacturing's
run stores the same `productStandardCostId` at release, an audit-logged run field, and output
receipt passes that estimate's standard unit cost as `acquireCost` (R-SA-01). **Source.** Research §6, §14; ERPNext
`erpnext/stock/doctype/item_standard_cost/item_standard_cost.py`; Mantle commented cost block
explicitly says the definitions need refinement. **Needs.** PRD-COST, PRD-ACCESS.

### CostRollup

**Layout.** Wizard: select effective BOM/routing and basis → inspect calculation → approve
estimate. The result is a standard-cost draft, not a posted valuation.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| CostRollupInputs | wizard step | Fix the calculation basis | product, BOM/routing, as-of date, organization/facility, batch quantity, currency, material basis, overhead percentage | BOM and routing lookups | proposed `mantle.product.CostServices.preview#ProductCostRollup` | Carbon BOM explorer; ERPNext Item Standard Cost |
| CostRollupLines | list, read | Inspect the exploded estimate | component/path, required quantity, scrap allowance, price/rate source, amount, missing input | tree list with rollups | same proposed preview service; proposed `mantle.product.BomServices.get#BomExplosion` of the BOM and routing as of the selected date | current BOM detail; Carbon BoMExplorer; [canonical explosion](design-manufacturing.md#billofmaterialsexplosion) |
| CostRollupSave | wizard step | Save the reviewed estimate | calculation token, expected source revisions, effective date, reason | stale-source check | proposed `mantle.product.CostServices.save#ProductCostRollup` | ERPNext standard-cost record |

**Actions.** Preview; save draft; approve through StandardCosts. The material basis is one of
the approved component standard estimate, the main-supplier price (`ProductPrice` with
`SpoMain`, resolved at the batch quantity and date), the average cost (`PptAverage`) or the
last receipt cost. Labor and machine rates come from CX-WORKCENTER through Manufacturing's
proposed `mantle.work.RoutingServices.get#OperationCostBasis` (effective work-center rate times
the operation standards). Overhead is a percentage component type of PRD-COST. A missing
component price, currency rate, UOM conversion or routing rate leaves an incomplete estimate and blocks approval;
the report names all independent missing inputs. Cycles block that BOM's roll-up, while other
selected products can still complete. A changed BOM/rate invalidates the preview rather than
silently saving different values. **Source.** Research §6, §10; Carbon
`apps/erp/app/modules/items/ui/Item/BoMExplorer.tsx`; Manufacturing research BOM/costing.
**Needs.** PRD-COST, CX-METHOD, CX-COST.

### CostHistory

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| CostHistoryFind | find | Select comparable cost facts | product, organization, facility, currency, date range, basis | explicit basis selector | none | Carbon cost history |
| CostHistory | list, read | Compare distinct cost bases | date, standard estimate, actual receipt cost, valuation adjustment, quantity, source | chart with separate series and table | proposed `mantle.product.CostServices.get#ProductCostHistory` | Carbon ItemCostHistoryChart; existing `Asset`/`AssetDetail` |

**Actions.** Open source estimate, receipt or authorized accounting transaction. Totals never
combine currencies or units without a labeled conversion. Valuation adjustments are read from
Accounting's InventoryValuation postings (proposed `post#Revaluation`), keyed by the estimate's
`productStandardCostId`. Cost readers see operational facts; GL detail requires finance access. **Source.** Research §6, §10; Carbon
`apps/erp/app/modules/items/ui/Item/ItemCostHistoryChart.tsx`. **Needs.** PRD-COST, PRD-ACCESS.

## 8. Suppliers

### SupplierPrices

**Physical definition and mounts.** Proposed `screen/Shared/SupplierPrices.xml` is owned by
this section and mounted at `Products/Suppliers/SupplierPrices` and `Purchasing/Suppliers/SupplierPrices`.
Supplier360 and Product360 can fix supplier/product context on the same forms. Catalog-price
capabilities authorize edits independently of either app's launcher grant.

**Layout.** Cross-supplier price list, grouped optionally by supplier or product. Fixed internal
buyer scope makes `vendorPartyId` the supplier and `customerPartyId` the buying organization.
The screen edits the same rows shown on Product360 and Supplier360. `quantityUomId` holds a
dimensional unit (kg, each); an offer by the case or pallet is a row for the pack product, which
Warehouse converts to base units at receipt through the proposed `resolve#ScannedProduct` (D16).

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| SupplierPriceFind | find | Compare vendor offers | product, supplier, supplier code, buyer, currency, date, preferred | supplier/product lookup | none | Odoo supplierinfo list; Catalog price find |
| SupplierPrices | list, editable rows | Maintain supply facts | product, supplier item ID/name, price/currency, min quantity/increment, quantity UOM, pack size (contained quantity of a pack product), agreement/item, lead time, preference, dropship | price-break rows; cost permission | proposed `mantle.product.PriceServices.store#ProductPrice` | Catalog `EditPrices` `PricesForm`; Carbon SupplierParts |
| NewSupplierPrice | dialog | Add a supplier offer | supplier, buyer, product or pack product, supplier code, amount/currency, dates, quantity basis and UOM, agreement/item | role-aware lookups | proposed `mantle.product.PriceServices.store#ProductPrice` | Catalog `EditPrices` `NewPriceForm`; Odoo supplierinfo |
| SupplierPriceBulk | list, bulk | Apply reviewed dated updates | supplier, selected rows, effective date, adjustment, reason | preview | proposed `ironstone.products.CatalogServices.preview#PriceChanges` and `apply#PriceChanges`, which call `replace#ProductPrice` per row | Odoo supplierinfo; Products BulkPrice |

**Actions.** New offer; schedule change; import through ProductImport with fixed supplier
kind; explain selected price; open Supplier360. Supplier rating is a recorded sourcing datum,
not an automatically computed quality score. Purchasing owns performance and acceptance of a
quote into a new effective price row: its proposed
`ironstone.purchasing.SourcingServices.publish#SupplierQuotePrice` calls `store#ProductPrice`
with the quote reference recorded. **Source.** Research §7; Odoo
`odoo/addons/product/views/product_supplierinfo_views.xml`; Carbon
`apps/erp/app/modules/items/ui/Item/SupplierParts/SupplierParts.tsx`; current ProductPrice fields.
**Needs.** PRD-PRICE, PRD-IMPORT, PRD-ACCESS.

**Per-app context**

| App | Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- | --- |
| Products | All supplier offers, grouped by supplier or product | internal buyer organization; optional supplier or product | new offer, schedule change, end-date, bulk update, import and explain | complete, comparable supply facts |
| Purchasing | Offers with agreement and pack size | external vendor, internal buyer, optional product | maintain permitted offers, import, explain; quote publication through proposed `publish#SupplierQuotePrice` | sourcing basis |
| Supplier360 embed | This supplier's offers | supplier and internal buyer | add or schedule an offer, import, open Product360 | the supplier's catalog |
| Product360 embed | This product's offers and its pack products' offers | product and internal buyer | add or schedule an offer, open Supplier360 | supply options for the product |

### Supplier360 (Context passed)

Mount crosscut §3.3 at `Products/Suppliers/Supplier360`, fixed supplier and internal buyer.
Show Overview/Contacts, Products & prices, Documents and authorized sourcing links. Supplier
catalog and contact maintenance require distinct grants; AP balances, payment details and
bank accounts are hidden without finance rights. Actions are add/schedule supplier price,
import offers and open Product360. The same `ProductPrice` rows and guard services serve all
three entry points. Source: research §7, §12. Needs: PRD-PRICE, PRD-ACCESS.

## 9. Documents

### Documents

**Layout.** XML list with image thumbnails, file/type badges and preview action; the existing
RecordFiles preview is included for file viewing, not a second storage system. A product's
Documents tab uses the same typed content and links to this list with product fixed.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| DocumentFind | find | Find catalog content | product/variant, type, locale, store, feature, effective date, filename | server-search product | none | Odoo product documents |
| Documents | list | Browse typed content | product, type, locale, scope, interval, filename/preview | image/PDF preview; file badge | entity `ProductContent` | Catalog `Product/Content/ContentList` `ContentList`; Odoo document kanban |
| UploadProductContent | dialog | Attach files with domain metadata | product, type, locale, feature/store, dates, file | existing upload | `mantle.product.ProductServices.create#ProductContent` | same `NewContentForm` |
| AddProductLocation | dialog | Link an existing resource | product, type, locale, scope, location | authorized resource chooser | same create service | same `NewLocationForm` |
| AddProductText | dialog | Create typed text | product, type, locale, scope, text | existing editor | same create service | same `NewTextForm` |

**Actions.** Upload, add reference/text, preview/download, edit metadata, end-date. Multi-file
upload names failures individually and keeps successful files visible. A product/variant
inheritance indicator distinguishes the virtual product's content from a variant override.
No automatic destructive replacement of a same-name file. **Views.** List and card view over
the same rows; a card shows the thumbnail or file-type preview, type, locale and product.
**Source.** Research §8; Odoo
`odoo/addons/product/views/product_document_views.xml`; Carbon
`apps/erp/app/modules/items/ui/Item/ItemDocuments.tsx`; Catalog content list.
**Needs.** PRD-CONTENT, PRD-ACCESS.

### DocumentDetail

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ProductContentMetadata | single | Maintain type and applicability | product, type, locale, store/feature, interval, location | scope lookups | `mantle.product.ProductServices.update#ProductContent` | Catalog `Product/Content/ContentDetail` `UpdateContentForm` |
| ProductContentText | single | Edit text or replace a file version | content, text/file, expected revision | existing editor/upload | same update service with proposed revision guard | same `UpdateTextForm` |
| ContentVersions | component | Compare retained revisions | version, author, date, content diff | existing resource version compare | existing Commons resource-version facilities | Catalog `Product/Content/ContentCompare`; Commons files |

**Actions.** Save; preview; compare versions; restore as a new version with confirmation.
Concurrent edits retain both versions and show a conflict rather than overwriting silently.
**Source.** Research §8, §13; Catalog Product Content screens. **Needs.** PRD-CONTENT, PRD-ACCESS.

### Translations

**Layout.** Editor; source and target locale columns beside a filtered product/category list.
Names/descriptions are typed localized content; existing direct product/feature description
localization is displayed with its actual storage source rather than copied into another table.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| TranslationFind | find | Select untranslated content | record kind, source/target locale, content type, store, missing-only | locale selectors | none | Dolibarr product translations |
| TranslationRows | list, editable rows | Edit target content beside source | record, type, source text/version, target text, review state | multiline editor and preview | existing product/category content create/update services through proposed `ironstone.products.CatalogServices.store#CatalogTranslation` | Dolibarr `traduction.php`; active localized content fields |

**Actions.** Save selected rows; mark reviewed against source revision. Changed source text
marks the translation for review, never deletes it. Each independent translation reports its
own result. **Source.** Research §3, §5, §8; Dolibarr `htdocs/product/traduction.php`,
`htdocs/categories/traduction.php`. **Needs.** PRD-CONTENT, PRD-ACCESS.

## 10. Units and barcodes

### Units

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| UnitFind | find | Find units and conversion paths | type, ID/name, from/to unit, date | unit lookups | none | ERPNext UOM/conversion masters |
| Units | list, editable rows | Maintain authorized unit metadata | unit, type, abbreviation, description | type selector without the currency type | entity `moqui.basic.Uom` through the proposed `ADMIN`-only write guard (PRD-UOM) | framework unit entity; ERPNext UOM |
| Conversions | list, editable rows | Maintain dated conversions | from/to unit, factor, offset, interval | decimal factors and effective dates | entity `moqui.basic.UomConversion` through proposed validation | ERPNext UOM Conversion Factor |

**Actions.** Add/update permitted units; preview a conversion; end-date a conversion. Units
used by transactions are not deleted or retyped. Stock/package conversions require compatible
quantity units and zero offset; offset conversions remain valid for measurements such as
temperature. An entered quantity and its normalized stock quantity are both retained in
downstream transactions.

Units and Conversions exclude `uomTypeEnumId` `UT_CURRENCY_MEASURE` on either side of a
conversion. Currencies and exchange rates are maintained only in Accounting's Currencies
screen (D17). Because `moqui.basic.Uom` and `UomConversion` are global and not
organization-scoped, writes require the framework `ADMIN` group (system administrators), not an
organization's catalog administrator grant. Dimensional units (kg and g, each) use the global
`UomConversion` rows and may appear in a price or order line's `quantityUomId`.
Product-specific packs (a case of 12 for one product, 6 for another) are pack products in
Packaging, never a global conversion (D16). The stock unit is `Product.amountUomId`. Each
posting stores what was entered in proposed `enteredQuantity`, `enteredQuantityUomId` and
`appliedConversionFactor` (decimal) on `AssetReceipt`, `AssetIssuance` and
`ShipmentItemSource`. The Warehouse and Manufacturing posting guards write them, after PRD-UOM
validates the conversion; a PO line in `OrderItem.quantityUomId` converts at receipt.
**Source.** Research §9; framework `BasicEntities.xml`; ERPNext
`erpnext/setup/doctype/uom_conversion_factor/uom_conversion_factor.json`.
**Needs.** PRD-UOM, PRD-ACCESS.

### Packaging

**Layout.** List with pack editor dialog. A pack is a product with its own typed identifiers,
linked to the base product by `PatPackagingFor` and an explicit contained quantity/UOM.
The direction is fixed: `ProductAssoc.productId` is the pack product, `toProductId` is the
contained base product, and `quantity` with the proposed `quantityUomId` is the contained base
quantity. No Mantle service reads `PatPackagingFor` today; the proposed services below are its
only readers and writers.
`ProductAssoc.quantity` exists; `quantityUomId` is a proposed addition for this association,
not a field available today. Its value must convert to the base product's stock quantity unit.
Legacy packaging rows without it use that target/base unit only after validation. Downstream
transactions snapshot the entered unit and conversion; a base-unit change cannot reinterpret
posted stock or historical pack quantities.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| PackagingFind | find | Find packs | base product, pack product, barcode, owner, date | scanned identifier | proposed `mantle.product.ProductServices.resolve#ScannedProduct` for scan | Odoo packaging barcodes |
| Packaging | list | Review pack identity and conversion | pack/base, quantity/UOM, barcode, interval, active | base/pack record links | entity `ProductAssoc`, identifiers | Odoo product.uom; active `PatPackagingFor` |
| Package | dialog | Maintain a pack atomically | pack product, base product, quantity/UOM, identifier type/value, interval | product and unit lookups | proposed `mantle.product.ProductServices.store#ProductPackaging` | Odoo packaging form; Catalog associations/identifiers |

**Actions.** Create/link pack, edit draft, end-date. The validation rejects cycles, ambiguous
scan codes and non-positive quantities. Historical pack sizes stay attached to transactions;
changing size creates a successor relationship. A packaging relationship alone does not
perform a stock conversion. When separately stocked packs are opened or made up, Warehouse's
proposed `Warehouse/Transfers/Repack` task runs proposed
`WarehouseTaskServices.repack#Asset` inside a `WepAssembling` work effort (D16).

Proposed `mantle.product.ProductServices.resolve#ScannedProduct` is the one scan resolver that
WH-SCAN, receiving and the Labels preview call. It takes a scanned code and returns
`productId`, `packProductId`, `containedQuantity`, `quantityUomId`, the applied conversion and
an ambiguity list when the code matches more than one product or pack. It reads
`ProductIdentification` codes and `PatPackagingFor` rows, and it never guesses between
ambiguous matches. Legacy pack-content data, the `QuantityIncluded` and `PiecesIncluded`
dimension values and `ProductPrice.quantityIncluded`, is listed by CatalogChecks as migration
candidates and is never used as a conversion.
**Source.** Research §9; Odoo
`odoo/addons/product/models/product_uom.py` verifies barcode uniqueness across item and pack
codes; Mantle `ProductAssoc` and `ProductIdentification`.
**Needs.** PRD-PACKAGING, PRD-UOM, PRD-IDENTIFIERS.

### Labels

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| LabelSelection | wizard step | Choose products and counts | product/pack, identifier type, label quantity | scan/selection list | proposed `ironstone.products.LabelServices.prepare#ProductLabels` | Odoo product label layout; Dolibarr printsheet |
| LabelLayout | wizard step | Select an approved format | template, stock size, printer target, locale, include price | preview | same proposed prepare service | Odoo product.label.layout |
| LabelPreview | display | Verify the encoded result | text, encoded value, decoded product/pack, symbology, page/label count, warnings | barcode preview and print link | proposed `ironstone.products.LabelServices.render#ProductLabels`; proposed `resolve#ScannedProduct` to decode the encoded value | Odoo label templates; Dolibarr printsheet |

**Actions.** Preview then print/export; assigning a new identifier is a separate confirmed
operation through Product360. Print failure retains the selection and job outcome. Labels
encode the selected existing product/pack code; they do not invent serial/lot identities.
**Devices.** Phone can scan an item and send the approved layout to a configured printer;
terminal lists textual decoded values and exports/prints the same artifact. **Source.**
Research §9; Odoo `odoo/addons/product/wizard/product_label_layout_views.xml`;
Dolibarr `htdocs/barcode/printsheet.php`. **Needs.** PRD-LABELS, PRD-IDENTIFIERS.

## 11. Settings

### Settings

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| CatalogSettings | single | Configure an organization's catalog from a date | effective date, default owner/type/UOM/currency/category, variants/packaging/price-lists flags, required fields, ID policy, cost-estimate self-approval, change reason | visible impact summary | proposed `ironstone.products.SettingsServices.get#CatalogSettings`, `store#CatalogSettings` | AureusERP ProductSettings; ERPNext Stock Settings |

**Actions.** Save with preview of affected UI and validation rules. The settings are
effective-dated `ProductCatalogSetting` rows by organization with typed, audit-logged fields and
a change reason, as `ProductVariantSetting`: a save ends the current row and starts the next,
nothing is overwritten, and a read takes an as-of date, now by default. The optimistic check
compares the current row's from date. Cost-estimate self-approval (§7), import defaults and
CatalogChecks' required fields read the row in effect (impl-products §4). Feature flags simplify
creation and menus but do not hide existing records irretrievably or disable required service
validation. Existing transactions continue to resolve IDs and prices after a feature is hidden.
**Source.** Research §11; AureusERP `plugins/webkul/products/src/Settings/ProductSettings.php`;
ERPNext `erpnext/stock/doctype/stock_settings/stock_settings.json`.
**Needs.** PRD-SETTINGS, PRD-ACCESS.

### VariantSettings

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| VariantPolicy | single | Control safe propagation | allowed copy fields, category copy, identifier pattern, batch limit, update existing flag | field allowlist; impact preview | proposed `ironstone.products.SettingsServices.store#VariantSettings` | ERPNext Item Variant Settings |

**Actions.** Save, as an effective-dated `ProductVariantSetting` row with a change reason, as
CatalogSettings saves; preview propagation to a selected virtual product. Identity, transactional
fields and historical valuation are never copyable. Existing variant overrides remain unless
an explicit bulk preview selects their replacement. **Source.** Research §4, §11; ERPNext
`erpnext/stock/doctype/item_variant_settings/item_variant_settings.json`.
**Needs.** PRD-SETTINGS, PRD-VARIANTS.

### PricingSettings

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| PricingPolicy | single | Set defaults without a second resolver | organization, default list/currency/purpose, rounding, effective-date policy, permitted cost base | read-only finance-owned links | proposed `ironstone.products.SettingsServices.store#PricingSettings` | Odoo pricelist configuration; ERPNext Price List |

**Actions.** Save and test with PriceExplain. Currency/tax defaults are suggestions for new
records, not bulk edits to existing rows. Inventory valuation method and GL accounts remain
Accounting-controlled settings, visible as links only to permitted users. **Source.** Research
§6, §11. **Needs.** PRD-SETTINGS, PRD-PRICE, PRD-ACCESS.

### IdentificationTypes

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| IdentificationTypes | list, editable rows | Select and configure allowed typed codes | type, description, format/check digit, uniqueness scope, generation rule | sample validation | proposed `ironstone.products.SettingsServices.store#IdentifierPolicy` over existing enums and policy | Dolibarr barcode administration; active ProductIdentificationType |
| IdentifierTest | dialog | Verify a sample without assigning it | type, value, decoded product/pack, validation result | scanner-friendly input | proposed `ironstone.products.LabelServices.validate#ProductIdentifier`; existing `find#ProductByIdValue` lookup | Odoo barcode nomenclature; metasfresh GS1 lookup |

**Actions.** Save policy, test code. Seeded enum IDs remain stable; organization policy
enables/disables assignment rather than renaming existing types. A product holds one code per
type, because the `ProductIdentification` key is the product and the type. Further codes for
the same unit use `PidtOther` or `ProductOtherIdentification`; a different unit is a pack
product. The `idValue` index is not unique, so the identifier store service enforces
uniqueness within the configured scope. Product/pack code collisions
are rejected before save; scoped external supplier IDs remain qualified by supplier. Advanced
GS1 parsing is a shared framework/scanning need with Warehouse, not a Products-only parser.
**Source.** Research §9; Dolibarr `htdocs/admin/barcode.php`; Odoo
`odoo/addons/barcodes/static/src/js/barcode_parser.js`. **Needs.** PRD-IDENTIFIERS, PRD-SETTINGS.

### CatalogChecks

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| CheckSelection | single | Choose checks and scope | organization, category/product filter, as-of date, check types | multiselect | proposed `ironstone.products.CatalogServices.validate#Catalog` | new |
| CatalogIssues | list, read | Correct catalog readiness failures | product, check, severity, evidence, suggested action | record links; row retry | same validation response | ERPNext curated item filters; import validation results |

**New form fields.** CheckSelection: organization ID; product IDs or saved-find token;
optional category ID and include-descendants flag; effective timestamp; check IDs (required
fields, duplicate identifiers, missing/overlapping prices, variant uniqueness, invalid
conversions, category cycles, incomplete estimates, legacy pack-content data, kit component
cycles, case units in price `quantityUomId`); include-inactive flag; run label.
**Actions.** Run; open offending record; export. The report makes no automatic corrections
and evaluates independent records even when one cannot be read. **Source.** Research §2,
§14; ERPNext Item curated filters; current catalog validators to be extended.
**Needs.** PRD-VALIDATION, PRD-ACCESS.

## 12. Baseline coverage and validation

### 12.1 Coverage rules

The 80 Catalog forms in ss-inventory are all retained through the mappings below. Table
screen names use the inventory's exact cells; the Catalog subdirectory is disambiguated by
the source screen described in §3–§11. A mapping to Product360 refers to the canonical
crosscut form, not another design of it. Products does not claim unrelated Commerce/store,
subscription, accounting posting or maintenance execution forms.

| Baseline screen | Baseline forms | Designed screen(s) |
| --- | --- | --- |
| Category/Content/ContentDetail | UpdateContentForm; UpdateTextForm | `Products/Categories/CategoryDetail/Content` |
| Category/Content/ContentList | NewContentForm; NewLocationForm; NewTextForm; ContentList | `Products/Categories/CategoryDetail/Content` |
| EditCategory | EditCategoryForm; AddChild; ChildCategoriesForm; GenerateCategoryIdent; AddCategoryIdentForm; CategoryIdentForm; ParentCategoriesForm; AddFeatureGroupForm; FeatureGroupsForm | `Products/Categories/CategoryDetail` |
| EditProducts | AddProductForm; ProductsForm | `Products/Categories/CategoryDetail` |
| FindCategory | NewCategoryForm; CategoriesForm | `Products/Categories` |
| EditFeature | NewFeatureForm | `Products/Features` |
| EditFeature | EditFeatureForm; AddFeatureGroupForm; FeatureGroupsForm; AddProductForm; ProductsForm | `Products/Features/FeatureDetail` |
| FindFeature | NewFeatureForm; FeaturesForm | `Products/Features` |
| EditFeatureGroup | EditFeatureGroupForm; AddCategoryForm; CategoriesForm; AddFeatureForm; FeaturesForm | `Products/Features/FeatureGroups/FeatureGroupDetail` |
| FindFeatureGroup | NewFeatureGroupForm; FeatureGroupsForm | `Products/Features/FeatureGroups` |
| Product/Content/ContentDetail | UpdateContentForm; UpdateTextForm | `Products/Documents/DocumentDetail`; `Products/Products/Product360` |
| Product/Content/ContentList | NewContentForm; NewLocationForm; NewTextForm; ContentList | `Products/Documents`; `Products/Products/Product360` |
| EditAssocs | AddAssocToForm; AssocToListForm; AssocFromListForm | `Products/Products/Product360` |
| EditAssocs | CreateVariantsForm; AllSelectableFeaturesForm | `Products/Products/VariantBuilder` |
| EditCategories | AddCategoryForm; CategoriesForm | `Products/Products/Product360` |
| EditPrices | NewPriceForm; PricesForm | `Products/Pricing/Prices`; `Products/Products/Product360`; `Products/Suppliers/SupplierPrices` |
| EditProduct | CloneProductForm; EditProductForm; AddIdentificationForm; IdentificationsForm; GenerateOtherIdentification; AddOtherIdentificationForm; OtherIdentificationsForm; NewFeatureForm; AddFeatureForm; FeaturesForm; AddDimensionForm; DimensionsForm; AddUomDimensionForm; UomDimensionsForm; CreateProductLocation; ProductLocationList; CreateProductMeter; ProductMeterList; CreateProductMaintenance; ProductMaintenanceList | `Products/Products/Product360` |
| FindProduct | NewProductForm; ProductsForm | `Products/Products` |
| Search | AddCategoryForm; RemoveCategoryForm; AddFeatureForm; RemoveFeatureForm; ProductsForm; AddCategoryFormSelection; RemoveCategoryFormSelection; AddFeatureFormSelection; RemoveFeatureFormSelection | `Products/Products` |

Facility `EditFacilityProducts`'s product-policy forms (AddProductForm, ProductList) are also
represented by the Product360 Stock context (`Products/Products/Product360/Stock`;
`Shared/InventoryAvailability`); Warehouse owns that baseline coverage integration. The Asset
FindAsset `UpdateProductCost` form is handed to Accounting's InventoryValuation
ValuationAdjustment (R-PRD-14); it is not replaced by the StandardCosts estimate screen.
The ProductStore forms are handed to Commerce, Marketing and Admin as the §15 Decided row
states; Products claims none of them. Product maintenance template forms are retained on
Product360; equipment work orders and execution remain Maintenance's separate design.

### 12.2 Service coverage

Direct service use is explicit in form summaries and the shared context. Product360 uses
`mantle.product.ProductServices.clone#Product`, `create#ProductFeature`, `apply#ProductFeatures`, the product-content services
and `mantle.product.StoreServices.generate#UrlSlugFromProductName`; its stock view uses availability and
projection services. CategoryContent uses the category-content services and CategoryDetail
uses `generate#UrlSlugFromCategoryName`. VariantBuilder reads feature groups/variant info
and calls the extended `create#VariantProducts`. Products bulk actions use the four existing
category/feature add/remove services and guarded `delete#Product`; ProductTags uses the same
category add/remove services. PriceExplain uses the one resolver, and PriceHistory uses
`get#PriceHistoryInfo`. Kit components, scan resolution, price writes, lifecycle transitions
and the usability check use proposed services (§14).

No blanket mapping claims all of ProductServices or price-modifier internals. Existing services
called only inside a mapped service remain unmapped unless a screen explicitly calls them.
Proposed services are needs until implemented, not fabricated rows in usl-inventory. The
coordinator adds these mappings to Designed in while retaining all prior mappings and every
Implemented in value.

### 12.3 Acceptance scenarios

1. Create a virtual product, assign selectable features, preview a large matrix, exclude invalid
   combinations, generate selected variants, retry after interruption, and verify no duplicate
   variant or identifier. Existing booked variants remain unchanged after a feature-set edit.
2. Apply a category under two parents, move one dated parent edge, reject a cycle, and verify
   deduplicated branch counts. Bulk changes report named row failures while completing others.
3. Enter supplier prices for two buying organizations; verify buyer/supplier roles, quantity
   conversion and lead time in Product360, Supplier360 and Purchasing's shared view.
4. Compare a base price, agreement override, tier/list rule, virtual fallback and another-list
   base. Explain every step; reject cycles/missing conversions; show that promotions are
   separate and unauthorized readers cannot see supplier costs through the trace.
5. Change a standard estimate and confirm that asset valuation/GL does not change; request a
   separate authorized revaluation. Roll up a BOM and routing as of a release date with scrap/routing costs;
   changed inputs invalidate the preview and incomplete estimates cannot be approved.
6. Upload mixed valid/invalid catalog rows and documents; resume retries without duplicate
   successful writes. Two editors changing the same text receive a conflict with retained
   versions. Source-language edits flag target translations for review.
7. Scan an item and pack, reject a duplicate code, print labels, and verify that pack quantity
   conversion does not manufacture a stock movement. Existing transaction pack sizes remain fixed.
8. Run Products with no other launcher grants: core catalog, supplier prices and permitted stock
   policy are usable. Cost, finance, stock posting and other-organization records remain denied
   through direct URLs, shared contexts, imports, exports and shell search.
9. Move a product to the proposed `PrdObsolete` status; verify that a purchase order line, a
   planning suggestion, a production order and a sales order line for it are refused by the
   proposed `check#ProductUsable` with the status named, while its open orders, stock and
   returns are unchanged.
10. Define a kit of three components; verify its availability, assemble it in Warehouse Pack,
    and verify that Manufacturing's BOM list does not show it.
11. As a catalog administrator who is not in `ADMIN`, try to edit a conversion; as an `ADMIN`
    user, try to edit a currency rate in Units. Both are refused.

## 13. Documents and outputs

| Output | Kind | From screen | Derived from |
| --- | --- | --- | --- |
| Filtered product/category/feature/price/supplier list | CSV/XLSX export | List screens | Existing form-list export; same authorized rows/columns |
| Catalog and supplier import sample, validation report, results | CSV import/export | ProductImport | Akaunting sample/error report; proposed durable run |
| Product datasheet/manual | `html-print` and PDF through existing print tooling | Product360/Documents | `mantle.product.ProductServices.get#ProductManualDocumentData`; Catalog product manual |
| Effective price list | `html-print`, PDF, CSV | PriceListDetail | Odoo pricelist report; resolved prices at a stated date/quantity context |
| Price explanation | `html-print`/authorized export | PriceExplain | New trace (§7), restricted by the same source permissions |
| Cost estimate and roll-up | `html-print`/CSV | StandardCosts/CostRollup | ERPNext Item Standard Cost; explicit estimate label and effective date; the approved estimate's PDF is stored with it (impl-products P9) |
| Identifier labels | `html-print`, PDF; optional printer payload | Labels | Odoo label wizard and Dolibarr printsheet; PRD-LABELS |
| Change review packet | `html-print` | ChangeNoticeDetail | Carbon affected-item/diff/impact pattern; later |
| Completion/failure notices | Notification; optional user-subscribed email | Imports, review/approval actions | Existing Commons/Comms providers; no automatic external catalog publication |

## 14. Framework and data needs

All named additions below are proposed. Existing entity CRUD remains behind authorized
domain transitions; `entity` in a form summary does not bypass validation. The crosscut roll-up
collects these IDs with the other app needs. Source paths in this table are relative to the
`mr-mantle` component unless marked framework or BOSS.

| Need | Kind | Proposed as | Used by | Stub spec |
| --- | --- | --- | --- | --- |
| PRD-ACCESS — catalog scope and action grants | service type, seed data | BOSS `ironstone.products.CatalogServices` access/find wrappers and scoped grants; proposed capability groups `BOSS_PRODUCTS_CATALOG_EDIT`, `BOSS_PRODUCTS_PRICE_READ`, `BOSS_PRODUCTS_PRICE_EDIT`, `BOSS_PRODUCTS_SUPPLIER_PRICE_READ`, `BOSS_PRODUCTS_SUPPLIER_PRICE_EDIT`, `BOSS_PRODUCTS_COST_READ`, `BOSS_PRODUCTS_COST_ESTIMATE`, `BOSS_PRODUCTS_COST_APPROVE`, `BOSS_PRODUCTS_ADMIN`; unit writes use the framework `ADMIN` group (§1.1, crosscut §1) | All screens and shared contexts | Resolve owner/internal organization and read/edit/price/supplier-price/cost/approve/admin/unit rights server-side; apply identical filtering to counts, lookup, search, trace, margin, export and import. Purchase-direction price rows need the supplier-price grants; margin needs both price reader and cost reader. Stock policy uses Warehouse's facility-policy capability, not a Products group. Organization filters (impl-products §4): Products' ordinary groups take `MANTLE_USER_ORG` and `MANTLE_PRIVATE_CONTACT`; `BOSS_PRODUCTS_ADMIN` has all authz on the root with `MANTLE_ACTIVE_ORG` and `MANTLE_PRIVATE_CONTACT`; Mantle's `MANTLE_USER_ORG` Product, ProductCategory and ProductFeature filters admit `_NA_`; services check organization access whatever the filter. |
| PRD-SHELL — catalog providers | shell item | Products palette/quick-create/Today/notification providers | Home, root, all records | Reuse current shell contracts; exact ID lookup through `find#ProductByIdValue`, authorized text find (including `ProductParty` and supplier `otherPartyItemId` codes) and catalog KPI queries; do not add a new dashboard model. Keyword search reuses the existing `MantleProduct` search document and reports an unavailable or stale index. |
| PRD-LIFECYCLE — product lifecycle | seed data, service type, data model | Proposed Product status flow Draft → Active → Discontinued → Obsolete on existing `Product.statusId`: proposed `PrdDraft`, `PrdActive`, `PrdDiscontinued`, `PrdObsolete` items of the existing `Product` status type; proposed `ironstone.products.CatalogServices.transition#ProductStatus` and `mantle.product.ProductServices.check#ProductUsable` | Products, Product360, Home; callers of the check in Purchasing, Manufacturing, Warehouse, crosscut SupplyPlanning and Sales (later) | Transitions Draft→Active, Active→Discontinued, Discontinued→Active (reactivate) and Discontinued→Obsolete, each validated and audited. Dates remain sales/support policy; null legacy status derives Active/Discontinued from dates until an explicit migration assigns status. Discontinued can fulfill allowed remaining stock; Obsolete blocks new commercial demand and replenishment. `check#ProductUsable` (productId, usage Sell, Purchase, Replenish, Produce, Receive or Return; returns usable, reason and status) is called by sales and purchase order-item create and by the proposed `run#SupplyPlan`, `convert#PlanningSuggestions`, reorder rules, `create#ProductionOrder` and `release#ProductionOrder`. Existing document fulfillment, returns and corrections remain subject to their domain guards. Activation validates required data; retirement never deletes transactions. Add `enable-audit-log` to `Product` `statusId`, `productName` and `salesDiscontinuationDate`. |
| PRD-BULK — reviewed catalog changes | service type | Proposed catalog preview/apply services; per-item results on existing bulk services | Products, SupplierPrices, imports | Store/revalidate selected IDs and intended differences, check each authority, apply each independent product atomically and continue on named failure; return counts plus IDs/errors. |
| PRD-VARIANTS — selected variant generation | service type | `ProductServices.preview#VariantProducts` (new), `create#VariantProducts` extended; guarded feature-interaction mutations | VariantBuilder, feature screens, Product360 | Preview feature combinations, existing IDs, conflicts and copy policy; optional selectedFeatureSets preserves legacy all-combination callers. Unique canonical feature set per virtual product, idempotent retry, per-combination result. Validate `ProductFeatureIactn` rules; never repurpose lot/serial attributes as SKU features. The interaction key is the feature pair; a product-scoped rule for a pair used elsewhere is refused until a proposed key extension adds `productId`. |
| PRD-VARIANT-UI — variant matrix | Vue component | VariantBuilder qvue plus XML terminal twin | VariantBuilder | Paged two-axis matrix and additional filters; full combination key, keyboard selection and list view; same services for terminal and phone. No new global matrix widget until another screen requires it. |
| PRD-TAXONOMY — multi-parent category edits | service type, seed data | BOSS guarded category-rollup service; existing XML tree occurrence mapping; proposed `PctTag` category type | Categories, CategoryDetail, Product360 tags, ProductFind | Use rollup occurrence identity for drag/move, preserve other parents, prevent effective-date cycles, deduplicate descendant membership, add tag type without a separate tag entity. |
| PRD-PRICE — lists, rules, agreement matching and explanation | data model, service type | Proposed `mantle.product.ProductPriceList`, `ProductPriceRule`; proposed `mantle.product.PriceServices.store#ProductPrice`, `replace#ProductPrice`, `expire#ProductPrice`; extend `PriceServices` and modifier interface; proposed `OrderItem` provenance fields | Prices, PriceLists/Detail, PriceExplain, SupplierPrices, Product360, ProductImport, Purchasing quote publication | Header: ID/name, organization, purpose, currency, scope (including optional `geoId` over `moqui.basic.Geo` and its `GeoAssoc` groups), priority, state and dates. Rule: ID/list, effective dates, sequence, product/category/feature selector, optional party classification, quantity/UOM interval, dates, base type/list, operation/operands, rounding and bounds. `store#ProductPrice` validates direction, equal-precedence overlap, a dimensional `quantityUomId` and the direction's grant; `replace#` schedules a successor in the same scope; `expire#` end-dates. Add explicit agreement matching, selected-list resolution, trace, server-computed margin for price-and-cost readers, and provenance: audit-logged `OrderItem.priceListId` and `priceRuleId` beside the existing `productPriceId`, returned by the resolver and stored by `create#OrderItem`/`add#OrderProductQuantity`; `OrderItem.standardCost` set from the approved estimate when one exists. Add `enable-audit-log` to `ProductPrice` `fromDate`, `thruDate` and `minQuantity`. Keep legacy ProductPrice rows and resolver callers compatible; trace is authorized. |
| PRD-COST — effective-dated standard estimates and history | data model | Proposed refined `mantle.product.cost.ProductStandardCost`, `ProductStandardCostComponent`; `CostServices` | StandardCosts, CostRollup, CostHistory, Product360, Manufacturing run, Accounting ValuationAdjustment | Header keyed by proposed `productStandardCostId`, effective-dated by organization and product (`fromDate`, `thruDate`) with its amounts audit-logged and no `versionSeqId`; approval starts the estimate's row and ends the one before it, and stores the approved estimate's PDF (impl-products §4). It has optional facility, quantity/UOM, currency, draft/approved state, reason and BOM/routing refs; component rows retain type (material, labor, machine, overhead percentage, outside processing), source, quantity, rate and amount. Material basis is the approved component standard, the `SpoMain` supplier price through the resolver, `PptAverage` or last receipt cost; labor and machine rates come from CX-WORKCENTER. Preview recursive effective BOM/routing costs with input fingerprints; approve estimates separately from Accounting revaluation, by the standard-cost approver. The run stores the `productStandardCostId` at release as an audit-logged run field, and that estimate's standard unit cost is the output receipt's `acquireCost`. Actual/average valuation reads existing movement facts; do not enable old commented cost definitions blindly. |
| PRD-IMPORT — durable catalog import | data model | Proposed BOSS catalog import run/row results and `ImportServices` | ProductImport | Staged file/hash, mapping/version, validation result, selected rows, operation keys, target IDs and named errors; per-row atomic writes, resumable retries, permission revalidation and downloadable results. |
| PRD-CONTENT — catalog content review/version guards | service type | Extend existing product/category content services; proposed translation wrapper | Documents, CategoryContent, Translations, Product360 | Preserve typed locale/feature/store/date scopes; optimistic revision checks and source-version translation review; use existing resource versions/storage and file authorization. |
| PRD-UOM — validated quantity conversions | service type, data model | Guarded framework UOM maintenance and shared conversion validation; proposed `enteredQuantity`, `enteredQuantityUomId` and `appliedConversionFactor` on `AssetReceipt`, `AssetIssuance` and `ShipmentItemSource` (fields owned by CX-POSTING) | Units, Packaging, prices/imports; Warehouse and Manufacturing posting guards | Existing `moqui.basic.Uom`/`UomConversion`; no parallel unit system. Exclude `UT_CURRENCY_MEASURE` units and their rates on either side; require the framework `ADMIN` group for writes. Validate dimensions/types, intervals, nonzero factor and stock-specific zero offset; the stock unit is `Product.amountUomId`; historical operations retain the entered quantity, its unit and the applied decimal factor. |
| PRD-PACKAGING — pack identity and contained quantity | data model, service type | Proposed `ProductAssoc.quantityUomId`, `ProductServices.store#ProductPackaging` and `ProductServices.resolve#ScannedProduct` over associations/identifiers | Packaging, Product360, Labels, WH-SCAN, receiving | `ProductAssoc.productId` is the pack product, `toProductId` the contained base product, `quantity` plus `quantityUomId` the contained base quantity; `PatPackagingFor`, effective-dated rows, cycle checks and identifier uniqueness; validate conversion to base stock UOM. `resolve#ScannedProduct` returns productId, packProductId, containedQuantity, quantityUomId, conversion and an ambiguity list. Warehouse alone performs physical unpack/repack (`repack#Asset`). |
| PRD-KITS — kit components | service type | Proposed `mantle.product.ProductServices.store#KitComponent` over `ProductAssoc` `PatMfgBom` rows on `PtPickAssembly` products | Product360 Kit components; Warehouse Pack; Manufacturing (exclusion) | Create, update and end-date kit components on pick-assembly products only; refuse other product types, cycles and non-positive quantities; never write a manufacturing BOM. Existing `get#AvailableInventory` and `produce#AvailableAssemblies` keep reading these rows. |
| PRD-IDENTIFIERS — identifier/scanning policy | data model | Proposed organization identifier policy over existing enum types; shared parser/validation service | IdentificationTypes, Labels, Products, Warehouse | Allowed type, format/check digit, generation source and uniqueness scope; GS1 decode is shared framework functionality. One code per type per product (the `ProductIdentification` key); further codes use `PidtOther` or `ProductOtherIdentification`; the store service enforces `idValue` uniqueness. Supplier codes stay party-qualified; no silent renumbering. |
| PRD-LABELS — label preparation/rendering | tool | Proposed BOSS label services consuming framework barcode and print tooling | Labels | Approved templates, selected existing codes, quantity/UOM and locale, preview of encoded payload, render/print outcomes; identify unsupported printer/symbology explicitly. |
| PRD-SETTINGS — organization catalog defaults | data model | Proposed `mantle.product.ProductCatalogSetting` and `ProductVariantSetting` records; `ironstone.products.SettingsServices` | Settings, VariantSettings, PricingSettings | Effective-dated settings rows by organization with typed, audit-logged fields and a change reason; a change ends the current row and starts the next, a read takes an as-of date, and there are no revisions with a version sequence (impl-products §4). Field-copy allowlist; UI feature flags never grant permissions or make used records inaccessible; finance owns valuation/posting defaults. |
| PRD-VALIDATION — catalog readiness | service type | Proposed `CatalogServices.validate#Catalog` | CatalogChecks, activation, imports, Home | Return per-record issues and source evidence for selected checks, including legacy pack-content data, kit component cycles and case units in price `quantityUomId`; continue independent checks, enforce strict identity/data guards when writing. |
| PRD-CONFIGURATION — typed versioned configurations | data model | Refined `mantle.product.config` definition/version/question/option/constraint/saved-answer records and `ConfigurationServices` (later) | Configurations/Detail | Refine commented ProductConfig concepts and reuse active ProductParameter semantics; immutable published versions, typed declarative constraints, canonical answer fingerprint, explicit creation of `PatConfigInstance` product and frozen order linkage. |
| PRD-CHANGE — catalog engineering changes | data model | Proposed `mantle.product.change` notice/affected-record/review records and `ChangeServices` (later) | ChangeNotices/Detail | Draft → review → approved → released/withdrawn with reason and source versions; impacted BOM/routing/order references, conflict detection; released BOM, routing and run lines are never rewritten. |

### Current-source observations affecting implementation

- `ProductPrice` already contains supplier identifiers, min quantities, quantity increments,
  lead times, preferred supplier and dropship fields. Its party-field descriptions explicitly
  distinguish internal seller from internal buyer. No supplier-product price table is needed.
- `PriceServices.get#ProductPrice` and `mantle.product.PriceServices.get#ProductPriceByType` exist; agreement parameters are
  TODO comments and the output has no explanation trace. The modifier interface must gain
  context/trace support compatibly, not only the screen.
- `create#VariantProducts` currently builds all chosen feature-group combinations. Existing
  code is a basis for generation, not proof that selectable preview/idempotence already exists.
- Category multi-parent rollups, `ProductFeatureIactn`, localized typed content, product
  meters/maintenance templates, units and dated conversions are active. Their BOSS workflows
  need guards and presentation, not replacement models.
- `modify#ProductPrice` is `type="interface"`: the resolver's price-modifier hook, not a way to
  store a price. No price store service exists today; `store#ProductPrice` is proposed.
- `PatPackagingFor` is seeded and read by no Mantle service. `PatMfgBom` rows on `PtPickAssembly`
  products drive kit availability in `get#AvailableInventory` and kit assembly in
  `produce#AvailableAssemblies`; `create#ProductionRun` also reads `PatMfgBom` through
  `get#ProductBomDetail`, which the effective-dated BOM design stops using for manufacturing.
- The `ProductFeatureIactn` key is the feature pair, and the `ProductIdentification` key is the
  product and identifier type; its `idValue` index is not unique.
- `Product` audit-logs only `ownerPartyId`, and `ProductPrice` only `price`. The `Product`
  status type is seeded with no status items.
- `ProductConfig*` and cost-component/average-cost definitions remain in XML comments.
  `Asset.acquireCost`, asset details and `AssetStandardCost` are active but do not by themselves
  implement the effective-dated product-estimate workflow specified here.

## 15. Decided

| Decision | Notes |
| --- | --- |
| One Product360, many contexts | Crosscut §3.5 owns its forms; this file passes catalog context and provides the reference coverage. Every authorized standalone app mounts needed shared functionality. |
| One product list replaces Find and Search | Structured filters, ID/scan lookup, text search and the existing bulk category/feature operations share one selection model. Text search is ProductFind's keyword field over the existing `MantleProduct` search document, with an ID/name fallback when the index is unavailable (R-PRD-23). |
| Rules are records, not generated price rows | Answers research's price-rules question. Effective-dated lists and rules (impl-products §4) feed the existing modifier pipeline; §7 specifies deterministic ordering and cycle handling. |
| Agreement prices and segment rules coexist | Answers customer-specific-list question: a negotiated agreement uses `ProductPrice.agreementId`/item; segment/classification uses rules, all through one resolver. Promotions remain a distinct order step. |
| Refine commented cost/configuration concepts | Answers enable-versus-new question: active models are specified against current needs, standard estimates as effective-dated rows with audit-logged amounts (impl-products §4) and configurations with published versions (later); stale commented definitions are not enabled wholesale. Product estimates and financial valuation remain distinct. |
| Real variant SKUs first; dynamic configuration later | Answers apparel-scale question: selected matrix generation in the first release, preserving `PtVirtual` + `PatVariant`. Order-time creation is a later configuration capability with uniqueness and frozen answers, not a first-release implicit behavior. |
| Pack products and dated contained quantity | Answers packaging question: `PatPackagingFor` plus pack identifiers, not another packaging table or a misuse of measurement dimensions. The pack is `ProductAssoc.productId` and the base product `toProductId`. Proposed `resolve#ScannedProduct` resolves a scanned pack to its base product and normalized quantity for WH-SCAN, receiving and Labels (R-PRD-03, D16). |
| Product lifecycle with compatible dates | Answers lifecycle question: proposed status seeds distinguish incomplete master from sale/support policy; existing sales dates continue to control allowed fulfillment. |
| Product usability is checked where demand and supply start | D19, R-PRD-04. The proposed statuses are `PrdDraft`, `PrdActive`, `PrdDiscontinued` and `PrdObsolete`, changed only through `transition#ProductStatus`. Products owns proposed `mantle.product.ProductServices.check#ProductUsable`, which sales and purchase order-item create and the proposed `run#SupplyPlan`, `convert#PlanningSuggestions`, reorder rules, `create#ProductionOrder` and `release#ProductionOrder` call. Crosscut §3.20's "inactive product" exception is this check. `Product.statusId` becomes audit-logged. Separate sellable and purchasable flags are proposed nullable `Product.salesAllowed` and `purchaseAllowed`, null meaning allowed, which `check#ProductUsable` enforces for Sell and Purchase (§16, impl-products §4). |
| Product/facility policy edits are shared | Answers per-facility question: permitted Products/Warehouse/Purchasing contexts edit the same `ProductFacility` rows; authorization, not launcher membership, governs writes. Every write goes through the Warehouse-owned proposed `mantle.facility.FacilityServices.store#ProductFacilityPolicy` (D20, R-XC-09), under Warehouse's facility-policy capability. |
| Product tracking and shelf life are a Warehouse policy | R-PRD-13; review-core-apps §4.1 step 13. Product360 Stock's Policy pane edits Warehouse's product-scoped TrackingPolicy exception through proposed `WarehousePolicyServices.store#TrackingPolicy`. Product gains no tracking fields. Lot and serial generation is Warehouse's `generate#TrackingIdentities`. This settles R-PRD-13 here instead of in Open. |
| Tags are typed categories | Multi-parent taxonomy and dated membership remain; accounting posting groups, marketing segments and store navigation are distinct uses, not collapsed into tags. Tags use the proposed `PctTag` category type, shown as chips on Product360 Summary and filtered by ProductFind's tag field (R-PRD-36). |
| Full baseline retained | All 80 Catalog forms map in §12. Product meters/maintenance definitions remain Product360 equipment-template forms; physical maintenance execution is outside this file. |
| Candidate scope is complete and phased | Home, products/variants, categories, features, pricing/costs, suppliers, documents, units/barcodes and settings all have rows. Configuration and engineering change control are later; no candidate area is silently dropped. |
| BOM, inventory and financial actions retain domain authority | Product360 embeds shared availability and BOM context; detailed operation execution is Manufacturing/Warehouse, valuation posting Accounting. A standard-cost save never posts GL. |
| Merchandising compatibility, not a Commerce redesign | Typed store content/identifiers are retained; store publication, promotions, subscriptions, reviews and advanced merchandising stay with their corresponding later app designs. |
| Existing framework widgets are reused | Tree, board, dashboard, context, status-bar and ordinary editor/upload facilities already exist. Only the variant matrix requires a custom qvue surface, with terminal parity. |
| Existing automation on Products paths | D1. No active Mantle service ECA or entity ECA runs on the records Products writes: `Product`, `ProductPrice`, `ProductAssoc`, category, feature, content, identifier and `ProductParty` rows, `Uom` and `UomConversion`. Products keeps, conditions and replaces none. The order-line rules beside the price provenance write, the service ECA rules `OrderItemCreateCheckReserve` and `OrderItemUpdateCheckReserve` and the entity ECA rule `OrderItemHandleChange`, are kept unchanged by their owners; the new provenance fields do not change what they do. |
| Kits are pick-assembly products | D15, R-PRD-10. A kit is a `PtPickAssembly` product whose components are `PatMfgBom` rows, maintained only in Product360's Kit components pane through proposed `store#KitComponent`. `PatMfgBom` stays only for kits; a `ProductBom` with released, effective-dated `ProductBomItem` lines is the only manufacturing method (impl-products §4), and Manufacturing's BOM migration excludes kits. Warehouse costs kit assembly (R-SA-04). |
| BOM and routing screens are mounted, not designed | D15, R-PRD-02, R-XC-24. Product360's BOM tab mounts Manufacturing's BillOfMaterialsDetail, BillOfMaterialsExplosion, BillOfMaterialsCompare, WhereUsed and RoutingDetail with product and organization fixed (§3). Products defines no BOM form; it builds the five Shared screens and Manufacturing's method records and services as Manufacturing's contract, with the Products context first (impl-products §4, P8). |
| Methods are effective-dated (Oct 28, 2026) | impl-products §4. A proposed `ProductBom` header has audit-logged method fields and `ProductBomContent`; its `ProductBomItem` lines are effective-dated with a stable `bomItemId`; routings are Mantle's `WepRouting` and `WepRoutingTask` on dated `WeatRoutingComp` rows. A release is an approval decision that stamps the lines' dates; an explosion reads one date and a comparison two (§3). `ProductBomVersion`, `ProductBomVersionContent`, `RoutingVersion` and `RoutingVersionOperation` are dropped, and `PatMfgBom` stays for kits only (D15). |
| Units exclude currencies, and unit writes are system-wide | D17, R-PRD-01. Units and Conversions exclude `UT_CURRENCY_MEASURE` units and their rates, which only Accounting's Currencies screen maintains. Because `Uom` and `UomConversion` are global, writes need the framework `ADMIN` group, the system administrators, not a Products group (decided Oct 28, 2026). |
| Dimensional units and product-specific packs | D16, R-SA-14. Dimensional units (kg and g, each) use the global `UomConversion` rows and may appear in `quantityUomId`. Product-specific packs (case, pallet) are pack products with a `PatPackagingFor` contained quantity. A purchase in cases orders the pack product, or the base product in base units. Warehouse converts pack to base at receipt through `resolve#ScannedProduct`, or stocks the pack. `store#ProductPrice` refuses a case unit in `quantityUomId`. |
| Stock postings keep the entered quantity | D16, R-SA-06; review-core-apps §4.1 step 36. Proposed `enteredQuantity`, `enteredQuantityUomId` and `appliedConversionFactor` on `AssetReceipt`, `AssetIssuance` and `ShipmentItemSource` are CX-POSTING fields written by the Warehouse and Manufacturing posting guards. Products owns the PRD-UOM validation. The stock unit is `Product.amountUomId`. |
| Unpack and repack belong to Warehouse | D16; review-core-apps §4.1 step 35. Warehouse's proposed `Warehouse/Transfers/Repack` task runs `WarehouseTaskServices.repack#Asset` inside a `WepAssembling` work effort. A packaging relationship never moves stock. This settles R-PRD-03's request to Warehouse, so it is not an Open item. |
| One list of grants, mapped to capability groups | D22, R-PRD-15. §1.1 is the one list; each grant maps to a proposed `BOSS_PRODUCTS_*` group in crosscut §1. Edit screens carry `app; catalog editor writes`. Stock policy uses Warehouse's facility-policy capability. Accounting's standard-estimate wording should say cost estimator and standard-cost approver. |
| Organization filters and the admin group (Oct 28, 2026) | impl-products §4, impl-drawers-commons §4. `BOSS_PRODUCTS` is both the root user group and the artifact group. Products' ordinary groups take `MANTLE_USER_ORG` and `MANTLE_PRIVATE_CONTACT`; `BOSS_PRODUCTS_ADMIN` is the Products admin group, with all authz on the root and `MANTLE_ACTIVE_ORG` and `MANTLE_PRIVATE_CONTACT`; `MANTLE_USER_ORG`'s Product, ProductCategory and ProductFeature filters admit `_NA_`; services still check organization access. The work-center group of the method contract is `BOSS_MANUFACTURING_RESOURCE_ADMIN` (§1.1). |
| Catalog settings are effective-dated rows (Oct 28, 2026) | impl-products §4. `ProductCatalogSetting` rows by organization with typed, audit-logged fields and a change reason, as `ProductVariantSetting`, not revisions with a version sequence; `get#` and `store#CatalogSettings` keep their parameters, and self-approval, import defaults and required fields read the row in effect (§11). |
| Price writes are named services | R-PRD-05. Proposed `mantle.product.PriceServices.store#ProductPrice`, `replace#ProductPrice` and `expire#ProductPrice` serve Prices, Product360, SupplierPrices, imports and Purchasing's proposed `SourcingServices.publish#SupplierQuotePrice`. `modify#ProductPrice` is the resolver's modifier interface, not a store. |
| The price screens' per-app tables live here | R-PRD-06, R-XC-23. The tables after PriceExplain and SupplierPrices are the canonical per-app contexts; crosscut §3.21 links to them instead of restating them. Sales and Commerce rows are reserved for their design passes. |
| Order lines record price provenance | R-PRD-07. The existing `OrderItem.productPriceId` keeps the row; audit-logged `OrderItem.priceListId` and `priceRuleId` keep the list and rule, read as of the line's pricing time. `OrderItem.standardCost` comes from the approved estimate when one exists. |
| Margin is shown only with price and cost access | R-PRD-34. Prices, Product360 Prices and PriceExplain show margin against the approved standard estimate when the user holds price reader and cost reader; the server computes it. |
| Product parties are maintained; product geos are later | R-PRD-09. Product360's Parties pane maintains `ProductParty` codes for customers, manufacturers and distributors, and the palette and ProductFind search them. `ProductGeo` (export and sales geo restrictions) is `later`, because no first-release flow enforces it. Price-list geo scope is a separate rule scope (R-PRD-35). |
| Product360 shows connections | R-PRD-08. Crosscut §3.5 gains a `ProductConnections` component with authorized per-type counts and links; the Products context shows every type the user may read. |
| Baseline cost correction goes to Accounting | R-PRD-14. Asset FindAsset `UpdateProductCost` (`update#ProductAcquireCost`) is handed to Accounting InventoryValuation ValuationAdjustment, which posts through proposed `post#Revaluation`. Accounting maps the form there. |
| ProductStore baseline handed off | R-PRD-21. Find/EditProductStore (store, shipping options, payment and shipping gateways, data documents), FindProductStoreCategory and the store Emails, Facility, Party and Settings forms go to Commerce. Promotion and PromoCode forms go to Marketing. Gateway credentials stay with Admin (crosscut §5). Store-scoped prices and content reference stores that Commerce maintains. |
| Standard estimates are effective-dated rows | R-PRD-29, as impl-products §4 decides. The key is proposed `productStandardCostId`; an estimate is effective-dated by organization and product with its amounts audit-logged and no `versionSeqId`, and approval starts its row and ends the one before it. Request revaluation passes the key, Accounting ValuationAdjustment and the Manufacturing run store it (the run as an audit-logged field at release), and that estimate's standard unit cost is the output receipt's `acquireCost` (R-SA-01). |
| Substitutes are associations, authorized by the source document | R-PRD-31 (as amended). Sales and purchasing substitutes are `PatEquivalent` and `PatReplacement` rows read as candidates. Production substitutes come from the BOM item's substitution rule, with `PatEquivalent` candidates only when that rule allows them. |
| Documents and category content are one definition | R-PRD-32. Documents, DocumentDetail and CategoryContent are the one definition of the `ProductContent` and `ProductCategoryContent` forms. Commerce Merchandising mounts them with `productStoreId` fixed; publication stays with Commerce. |
| No per-product defaults record | R-PRD-33. The default supplier is the `SpoMain` `ProductPrice` row per internal buyer; facility and reorder defaults are `ProductFacility`; GL is Accounting's `ProductGlAccount`; the default price list is PricingSettings. |
| Product360 blocks are per-app tabs | Answers research's AureusERP ProductSchemaRegistry pattern: per-app contexts of crosscut §3.5 decide the tabs; there is no slot registry. |
| Tab paths | R-PRD-38. InventoryAvailability is mounted at the Product360 tab path `Stock` and CategoryContent at the CategoryDetail tab path `Content`; other files already cite these paths. |

## 16. Implementation decisions (Oct 28, 2026)

Confirmed for the Products implementation:

- Interactive generation defaults to 1,000 selected combinations and may be configured downward; larger selections use durable batches.
- The cost estimator drafts and the standard-cost approver approves. Self-approval is an audited organization setting on the dated CatalogSettings row, off by default, and still requires the approval grant. Accounting posting remains separate.
- Identifier generation supports manual and existing internal IDs. External GS1 company-prefix allocation remains later.
- Add nullable `Product.salesAllowed` and `purchaseAllowed`, with null allowed for legacy products. `check#ProductUsable` enforces them for Sell/Purchase; Products exposes the facets.
- On virtual-base fallback, sum matching effective `PfatSelectable` `ProductFeatureAppl.amount` extras before list rules. Record a trace step and show the result in variant preview.
- Add the read/edit ProductPackaging pane to Product360, mounting Packaging with the base product fixed.
- Label formats include Code 128, EAN-13, UPC-A, EAN-8, ITF-14, GS1-128, QR and DataMatrix. Browser/PDF and existing feature-gated IPP are the printer paths.
- ProductPrice REST keeps its URLs, routes writes through the named guarded services and maps DELETE to expiration.
- Configurations and duplicate-product merging retain their `later` scope in §15 and impl-products §7.
