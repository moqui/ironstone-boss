# Products implementation

The Products build covers catalog masters and Product360, taxonomy and features, selected variants, dated sales and supplier prices, stock policy, manufacturing methods, standard estimates, documents and translations, units, packaging, identifiers and labels, durable imports, catalog checks, and authorized outputs.

Business rules and record guards are native Mantle services. BOSS owns app capabilities, screen context and forms. Mantle boots and tests without BOSS, checks shared Moqui permissions, and has no BOSS group or `ironstone.*` references. BOSS group permission assignments are in `data/BossSetupData.xml`.

The P8/P9 review decisions are implemented:

- BOM inspection retains the full tree. Planning requirements and buildable quantity stop at stocked, non-phantom subassemblies; phantoms include their routing. `fullBlowThrough` retains the alternative for authorized callers.
- Cost roll-up uses approved subassembly estimates or computes them in low-level order. By-products use allocation shares, falling back to quantities. Overhead applies to material plus conversion once per level, the BOM base quantity defines the lot, and the total is rounded once.
- Standard estimates are dated records with audited amounts. Approval alone makes no stock or ledger posting. Customer order lines snapshot a standard only when the customer is not an internal organization.
- Accounting revaluation changes on-hand `Asset.acquireCost` forward and splits a partly issued asset. It never reposts historical movements. One balanced accounting transaction records the on-hand difference with asset links and the revaluation offset account type. It rejects negative stock, future dates and dates before the last posted movement. `PartyAcctgPreference.inventoryRevaluationEnabled` defaults off; native authorization, mappings and fiscal-period checks still apply when enabled.

Imports stage actor-private CSV and keep mapping, preview and row outcomes durably. Apply rechecks inputs, commits independent rows separately, keeps product-plus-identifiers atomic, skips completed rows on retry and provides results/error CSV. A source is limited to 2 MiB and 5,000 rows. Price changes use the native price writer; a validated import sends one aggregate result notice.

Effective price outputs use `mantle.product.PriceServices.get#EffectivePriceList`. The selected published list, date, quantity, quantity unit and counterparties define the output. Missing prices remain blank; an independent resolution failure is named and does not stop other rows. Products outside the user's owner scope never enter the rows or document. The screen exports CSV/XLSX and opens matching printable HTML/PDF. One output accepts up to 1,000 products; filter by product IDs for a larger catalog.

Other app contexts are extension work described in [ProductsSharedScreens.md](ProductsSharedScreens.md). Configurable products, change notices, and the deferred owner-app workflows remain outside this build.

Validation on Oct 29, 2026:

- BOSS: **1,025/1,025** features, including authorization enabled/disabled, full screen rendering, terminal twins and the extended server-static compatibility pass.
- Standalone Mantle: **804 passed, 17 skipped, four baseline failures**, reproduced before these changes: InboxThreads, MantleSearch, WorkTimeEntries and WorkTimesheets. All Products features pass.
- Native pricing/output focus: **14/14**; final output browser walks cover HTML/PDF/CSV/XLSX, source restrictions, all required widths and themes. Saved XLSX contents were inspected for owner isolation.
- Screen expression lint: **zero parse failures**. The existing 125 idiom/hazard findings are unchanged.

The `plan/` completion and inventory edits are deliberately uncommitted, as requested by the user.
