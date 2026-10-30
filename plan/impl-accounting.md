# IronStone BOSS — Accounting implementation

P0–P5 are code complete and reviewed. Work is paused at the requested checkpoint before P6. P6–P21 remain planned.
The delivery log and verification details are below and in [AccountingImplementation](../docs/AccountingImplementation.md).

How [design-accounting.md](design-accounting.md) gets built, in phases from the foundation to base-currency
posting, each ending tested and usable. This file is kept at a high level, as [impl-products.md](impl-products.md)
and [impl-projects.md](impl-projects.md) are: each phase names its scope by the design's sections and §18 needs
rather than restating them, and the design stays the place for screen and record detail. During the build this
file is the log: phase status and what each built, the decisions made, open questions, findings against the
code, and what is deferred.

Before P0, `screen/Accounting/` held nine placeholders and its root grant was inactive. P0–P3 now provide the
scoped shell and minimal document routes, guarded ledger, reports and settings. Products' existing costing and
revaluation contracts remain the integration baseline. Full document workflows and shared customer/supplier
screens follow in their later phases.

**Inputs.**
- Designs:
  - [design-accounting.md](design-accounting.md)
  - [design-crosscut.md](design-crosscut.md) §1.3 (the automation register), §1.4, §2, §3.2, §3.3, §3.5,
    §3.6, §3.8, §3.10, §3.15, §3.16, §3.18, §3.22, §3.25, §4.4, §5 and §7.1
  - [design-purchasing.md](design-purchasing.md): PUR-SUPPLIER (SupplierProfile) and PUR-MATCH
  - [design-warehouse.md](design-warehouse.md): ReturnReceipt and WH-RETURN (`receive#ReturnItems`)
  - [design-customer-service.md](design-customer-service.md): Returns, for the return-approval rule
  - [design-products.md](design-products.md): PRD-COST, with [impl-products.md](impl-products.md) P9, which
    builds Accounting's revaluation contract
  - [design-projects.md](design-projects.md) §10 Billing
  - [design-manufacturing.md](design-manufacturing.md): ProductionCosts and M8, for §7
  - `mr-pass/plan/design-forum.md` §1, §4, §5 and §13.1: PASS's shell, app mounts, authority boundary, request
    contract, identity and invitations, for P18's apps; with `mr-pass/plan/implementation-forum.md` and
    `mr-pass/docs/Deployment.md`
- The design review: [review-core-apps.md](review-core-apps.md) (D1–D28 and the §4 step owners) and
  [review-core-apps/accounting.md](review-core-apps/accounting.md), which explain the design's D- and R- IDs.
- Guides and rules: [design-doc-guide.md](design-doc-guide.md), [style-guide.md](style-guide.md) §8, and
  [impl-drawers-commons.md](impl-drawers-commons.md) §4 (the shared rules).
- [impl-products.md](impl-products.md): the pattern; its decisions on other apps' contracts and shared contexts;
  the groups its P1 seeds (`BOSS_ACCOUNTING_GL`); and the BOSS client screenshot spec it adds (its F23).
- [impl-projects.md](impl-projects.md): InvoiceDetail, OrderDetail and the billing services, and its findings
  that recur here (F91, F131).
- Inventories: [ss-inventory.md](ss-inventory.md) and [usl-inventory.md](usl-inventory.md).
- mr-moqui: `plans/Remaining-Work.md` and `docs/Build-Test.md`.

Framework paths are under the mr-moqui checkout (`crates/`, `runtime/base-component/`), Mantle paths under
`runtime/component/mr-mantle/`, PASS paths under `runtime/component/mr-pass/`.

Sections: [1 scope](#1-scope-and-order) · [2 rules](#2-ground-rules) · [3 phases](#3-phases) ·
[4 decisions](#4-decisions) · [5 open](#5-open-questions) · [6 findings](#6-findings) · [7 later](#7-later) ·
[8 verification](#8-verification)

---

## 1. Scope and order

**Current execution boundary (latest user request, Oct 30, 2026):** complete the remaining P5 work, record its
checkpoint and commits, then pause before P6. The later phase definitions remain the plan for a future continuation.

- **Repositories.** Each is its own git repo:
  - `mr-moqui` (`crates/`, `runtime/base-component`)
  - `runtime/component/mr-mantle`
  - `runtime/component/mr-boss`, the internal app
  - `runtime/component/mr-pass`, the customer and supplier pages as PASS apps (P18; §4)

  `runtime/component/mr-marble` is read only, for the baseline Accounting, Asset and Party screens that design
  §16.1 maps.
- **Scope.**
  - Every `parity` and `new` row of design §2, and the §18 needs they use: AC-01 to AC-14 and AC-18 to AC-22,
    with the first-release parts of AC-16 (dated rates) and AC-20 (transfers and deposits).
  - The parts of other apps' needs that Accounting depends on (§4):
    - crosscut CX-ORDER-HOLD: `OrderHoldReason`, `hold#Order` and `release#OrderHold`;
    - crosscut CX-PORTALS: `ExternalAccessServices`, and two PASS apps in mr-pass, Billing for customers and
      Supplier for suppliers, in place of the ServicePortal and SupplierPortal roots, with Accounting's pages only;
    - Purchasing's SupplierProfile, its finance fields only;
    - Warehouse's `receive#ReturnItems`;
    - crosscut CX-AUTOMATION: the Mantle rule changes of design §1.4.
  - The shared screens no app has built, with the Accounting context only: Customer360, ShipmentDetail,
    EquipmentDetail, ReturnDetail and InvoiceMatch. Accounting's context on Projects' InvoiceDetail and
    OrderDetail, and on Products' Product360, Supplier360 and InventoryValuation.
  - §7 holds the `later` rows and needs, ProductionCostClose and CostingPolicies, and the rest of the other
    apps' needs.
- **Order** (decided Oct 28, 2026):
  1. the foundation;
  2. the ledger and its posting guard;
  3. settings;
  4. receivables;
  5. payments and settlement;
  6. payables: bill intake, holds and approval;
  7. matching;
  8. payment runs;
  9. banking;
  10. collections, credit and recurring invoices;
  11. period close;
  12. fixed assets;
  13. inventory valuation and landed costs;
  14. tax;
  15. budgets;
  16. reports;
  17. returns and order changes;
  18. portals, as PASS apps;
  19. setup and activation;
  20. base-currency posting;
  21. the finish.

  A report that a phase's walk needs comes with that phase: TrialBalance and GeneralLedger with the ledger,
  Aging with collections, InvoiceReconciliation with close, StockTransactions with valuation, and
  BudgetVariance with budgets.

## 2. Ground rules

- **The Commons rules hold.** These are impl-drawers-commons §4:
  - failure tolerance;
  - the Mantle-free framework;
  - Mantle stands without BOSS: no Mantle code or spec calls `ironstone.*`, reads BOSS or names a BOSS group;
  - business logic leans to Mantle;
  - the new XML element checklist of style-guide §8.1;
  - libraries through `libs/refresh.mjs`, and crates against `deny.toml`;
  - the `.qvue` gallery pattern;
  - parties by role;
  - changes by effective date and the audit log;
  - demo data;
  - builds and commits.

  Screenshots come from the BOSS `test/client` spec that Products adds (impl-products §2).
- **Financial writes through Mantle services.** Every invoice, payment, settlement, stock-value and period
  mutation is a Mantle service that checks its permission, the organization, status, balance, lock date and
  operation key (design §1.1). An Accounting screen or mount calls it after `ironstone.accounting.AccessServices`
  has checked the capability group and the organization. No same-named `ironstone` pass-through is built, and
  other apps call the Mantle name.
  - A Mantle service checks its Moqui permission through Products P9's `ProductAccess.js` `has()`, and the
    organization by party relationship (`get#PartyOrganizationInfo`), never a BOSS group. BOSS grants the
    permissions to its groups (P1). A permission check goes on a new Mantle service only.
  - An `ironstone.accounting` service keeps only the capability check, a screen's reads, shapes and saved views,
    the settings forms, and the call to Mantle.
  - `entity` in a design form summary means an access-checked read or a configuration-record write, never raw
    financial state (design §1.3).
  - Permissions are checked in the Mantle services and capabilities in AccessServices, so they hold for imports,
    exports, search, the palette and shared mounts. Mantle's existing ledger and report services check no access
    (F6), and several accounting records have no entity filter (F5), so no Accounting screen calls them without
    AccessServices first, and P16's report runs add the checks in Mantle.
- **One posting choke point.** The AC-06 guard runs inside Mantle `post#AcctgTrans` (P2), so direct posting,
  every auto-post SECA and each Accounting posting service, all of them Mantle's, pass it (F9). The
  `BOSS_ACCOUNTING_*` groups get no artifact authorization for `unpost#AcctgTrans`, `update#AcctgTransPosted`, the
  `repost#*` services or the Mantle REST mutators (F11). Only the finance-admin data-repair actions reach a raw
  rewrite (design §1.1, §19).
- **Preview, then post.** A preview answers a version. The post takes that version and an operation key,
  re-reads under lock and refuses a stale preview; a retry with the same key answers the first result (design
  §18.1; F8). Both are one Mantle service pair, keyed on the CX-POSTING record (§4; F47). One financial
  transaction, application set, paired transfer or document-and-ledger posting is atomic; a bulk selection names
  each failure and goes on.
- **Restricted values stay on the server.** Bank and card numbers are masked and gateway secrets stay Admin's.
  An inaccessible account contributes no names or amounts, and a failed aggregate is unavailable, never zero
  (design §3).
- **One currency until P20.** Mantle converts no currency (F19). From P4, finalizing or posting a document whose
  currency is not the organization's base currency is refused, and Setup readiness says so (D18).
- **Shared screens.** Accounting builds these with the Accounting context only:
  - `Shared/Customer360`, `Shared/ShipmentDetail`, `Shared/EquipmentDetail`, `Shared/ReturnDetail` and
    `Shared/InvoiceMatch`.

  InvoicePay and SupplierBillUpload are not BOSS screens: they are pages of PASS apps (below).

  It adds its context to `Shared/InvoiceDetail` and `Shared/OrderDetail`, and to Products' `Shared/Product360`,
  `Shared/Supplier360` and `Shared/InventoryValuation` (F4). Each takes `appRoot` and server-derived
  capabilities, on `Shared/RequestDetail`'s pattern (F2).
- **Public pages in mr-pass, internal ones in mr-boss** (§4). The customer and supplier pages are PASS apps, on
  PASS's foundation (design-forum §1, §4, §5), as impl-customer-service §2 sets out for its Support app:
  - PASS's public shell with host and app-mount routing; server-rendered HTML with qvue enhancement, at 390 px and
    on the desktop; no terminal UI, which PASS does not have yet.
  - Public accounts hold only `ALL_USERS`. A customer or supplier contact reaches its records through Mantle's checks
    of its relationship and of `ExternalAccessCapability`, never a UserGroup, so there is no `BOSS_SERVICE_PORTAL` or
    `BOSS_SUPPLIER_PORTAL`.
  - Pages call the authority only through `pass.Facade.call#Operation`: an operation in PASS's `Schema.js`, its route
    in `Routes.js`, served to a remote frontend by Mantle's PassApi. So every service a page calls is Mantle's, and
    what it calls is Mantle's too; no `ironstone.*` service, BOSS screen or BOSS group.
  - PASS's request contract (design-forum §4.3), and its media staging and scanning for uploads.
  - A bearer link is a page of the app that takes its token, as PASS's Unsubscribe does, checked by
    `check#AccessToken`; no `<token-route>` in BOSS's `MoquiConf.xml`.
- **Owner contracts.** A contract built here for another app follows that app's design: its package, its record
  and service names, its Shared screen, and the permissions its Mantle services check. A change found while
  building it is written into the owner's design. The owner's own screens stay with the owner.
- **Mantle rule changes keep Mantle's default.** Each CX-AUTOMATION change, and each new refusal in an existing
  Mantle service, sits behind its own flag, off by default (§4), and ships with a test of its condition and of its
  unchanged default (crosscut §7.1).
- **Existing callers stay compatible.**
  - Mantle's specs pass unchanged, including the flow specs' SECA invoices, return responses and posted
    amounts (F27).
  - Projects' Billing passes unchanged: the Billing, BillingWalk, ClientBilling and MilestoneBillingWalk specs.
    Projects' `update#InvoiceStatus` calls `mantle.account.InvoiceServices.change#InvoiceState` (D6), and its
    `send#Invoice` calls that file's `send#Invoice` (F2).
- **Done for a phase** means all of these:
  - impl-projects §2 "Done":
    - cargo tests for the touched crates, with goldens reviewed;
    - the new Mantle specs passing under `./moq test mr-mantle` without mr-boss, their users in spec-local groups
      holding the permissions;
    - `./moq test mr-boss` passing, with AppStructure covering the new screens and Accounting in its
      non-placeholder list (F3);
    - `moqui lint --screens` clean for BOSS with the Debug binary;
    - screenshots light and dark at 390, 1280 and 1440 px;
    - the inventories' **Implemented in** columns;
  - the `AccountingAccess` spec extended to the phase's services and mounts;
  - for P18: `./moq test mr-pass mr-mantle mr-boss` with the apps' specs, the remote pair on PASS's RemoteFixtures
    pattern, `moqui test-client mr-pass --serve` on ForumHttp's and RemoteHttp's pattern, lint clean for PASS, and the
    apps' screenshots light and dark at 390 and 1280 px;
  - the phase's walk in §8;
  - its row and **Built** note here.

## 3. Phases

| Phase | Repos | Screens | Status |
| --- | --- | --- | --- |
| P0 Checks | all (read) | — | checked Oct 29 (§6 F48–F55); access regressions accompany P1 |
| P1 Foundation | Mantle, BOSS | root/menu, Home, minimal invoice/bill/payment lists and read-only details, draft quick create | built Oct 29; see build record below |
| P2 Ledger and posting guard | Mantle, BOSS | ChartOfAccounts, AccountDetail, JournalEntries, JournalEntryDetail, TransactionEntries, JournalBatches, JournalTemplates, Periods, PeriodLocks, TrialBalance, GeneralLedger | built Oct 29; see build record below |
| P3 Settings | Mantle, BOSS | Settings, AccountingPreferences, PostingDefaults, PaymentTerms, Currencies, PaymentMethods, DocumentSettings | built Oct 29; see build record below |
| P4 Receivables | Mantle, BOSS | Invoices, InvoiceDetail, BillingQueue, Statements, Customer360 | built and independently reviewed; verification record below |
| P5 Payments and settlement | Mantle, BOSS | Payments, PaymentDetail, GatewayTransactions, ReceivablesWorkbench | P5a settlement, P5b1 lifecycle/outputs and P5b2a gateway accepted; refunds/transfers follow |
| P6 Payables | Mantle, BOSS | Bills, BillDetail, ExpensePosting, Supplier360, OrderDetail, ShipmentDetail, Approvals | — |
| P7 Matching | Mantle, BOSS | InvoiceMatch, MatchPolicies | — |
| P8 Payment runs | Mantle, BOSS | PayablesWorkbench, PaymentRuns, PaymentRunDetail | — |
| P9 Banking | Mantle, BOSS | BankAccounts, BankAccountDetail, StatementImport, Reconciliations, ReconciliationDetail, UnmatchedTransactions, BankRules, FinancialAccounts, FinancialAccountDetail | — |
| P10 Collections, credit and recurring | Mantle, BOSS | Collections, Dunning, CollectionPolicies, RecurringInvoices, Aging | — |
| P11 Period close | Mantle, BOSS | PeriodCloseDetail, PeriodRuns, InvoiceReconciliation | — |
| P12 Fixed assets | Mantle, BOSS | FixedAssets, EquipmentDetail, AssetClasses, DepreciationRunDetail | — |
| P13 Valuation and landed costs | Mantle, BOSS | InventoryValuation, LandedCosts, Product360, StockTransactions | — |
| P14 Tax | Mantle, BOSS | TaxAuthorities, TaxRates, TaxStatements, TaxStatementDetail | — |
| P15 Budgets | Mantle, BOSS | Budgets, BudgetDetail, BudgetControls, BudgetVariance | — |
| P16 Reports | Mantle, BOSS | Reports, BalanceSheet, IncomeStatement, CashFlow, RetainedEarnings, FinancialRatios, PartnerLedger, AccountBalance, PostedSummary, SalesAnalysis | — |
| P17 Returns and order changes | Mantle, BOSS | ReturnDetail | — |
| P18 Portals | Mantle, mr-pass, BOSS | the PASS apps Billing, with InvoicePay, and Supplier, with BillUpload | — |
| P19 Setup and activation | Mantle, BOSS | Setup | — |
| P20 Base-currency posting | Mantle, BOSS | — | — |
| P21 Finish | BOSS | — | — |

### P0 — Checks

Verify the design's riskiest assumptions against the code before building. Each result is a row in §6 and,
where it changes the design, an edit there. F1–F46 were found on Oct 28 while writing this plan; the design
edits that F17, F25, F27 and F40 call for, and those of §4's decisions in design-accounting and crosscut (among
them InvoicePay and SupplierBillUpload, and the audience roots of crosscut §2, §5 and D5 with their groups in §1.4),
were made in the Oct 28 design sweep. The Billing and Supplier apps in design-forum §1 and §13 are added when P0
closes. Completed checks (findings F48–F60; verification below):

- **REST.** Which Mantle REST mutators reach invoices, payments and accounting transactions, and what the BOSS
  groups would reach through them (F6, F11).
- **Palette documents.** Whether Mantle has search documents for invoices, payments, GL accounts and journal
  entries for the palette types, or P1 adds them.
- **Inspection quantity.** What "open inspection" reads before CX-QUALITY exists (D21).
- **A gateway for InvoicePay.** Mantle's `TEST_APPROVE` gateway always approves; InvoicePay's pending and
  declined paths need a test gateway that can answer them.
- **PASS for its first apps beyond Forum** (§4). How an app registers: its `PublicSiteApp` mount and target,
  navigation, readiness and operator configuration; the facade's operation and route catalogues and Mantle's PassApi
  route table; PASS invitations with organization grants; media staging finalized into a record's content; and the
  URLs Mantle builds for a site's pages (impl-customer-service F43). Also `Pass.xml`'s content security policy
  (`form-action 'self'`, `frame-ancestors 'none'`) against the gateway's hosted page or redirect, and PASS's
  local-return-path rule for the gateway's return.
- **Products' state.** Which of Products P2, P6 and P9 are built when P6 and P13 start.

### P1 — Foundation

- **AC-01, access.**
  - The groups of design §1.1, with `BOSS_ACCOUNTING_MATCH` (crosscut §1.4), `BOSS_ACCOUNTING` as the root
    user group and `BOSS_ACCOUNTING_ADMIN` as the admin group (§4). `BOSS_ACCOUNTING_GL` exists from Products P1.
  - The root's authz comes out of BossSetupData's commented block (F1), with the organization filters of
    impl-drawers-commons §4: `MANTLE_USER_ORG` for the groups, `MANTLE_ACTIVE_ORG` for the admin group (F5).
  - `ironstone.accounting.AccessServices`: the user's organizations and capabilities. Every Accounting screen and
    shared mount calls it before the Mantle service, and a supplied organization or record is checked against it.
  - **Permissions** (§2, §4): Mantle seeds Accounting's `UserPermission` rows beside `ORDER_APPROVE` in
    `MantleSetupData.xml`, and BossSetupData grants them with `UserGroupPermission` rows. `BOSS_ACCOUNTING_ADMIN`
    holds every one below, and alone holds `ACCOUNTING_ADMIN` and `FISCAL_REOPEN`. No group gets `GL_POST_CLOSED`
    (F9).
    - `BOSS_ACCOUNTING_AR`: `RECEIVABLE_EDIT`, `CUSTOMER_CREDIT_VIEW`;
    - `BOSS_ACCOUNTING_AP`: `PAYABLE_EDIT`, `PAYABLE_IMPORT`, `INVOICE_HOLD`, `INVOICE_MATCH`, `SUPPLIER_TERMS_EDIT`;
    - `BOSS_ACCOUNTING_MATCH`: `INVOICE_MATCH`;
    - `BOSS_ACCOUNTING_TREASURY`: `PAYMENT_EDIT`, `BANK_RECONCILE`;
    - `BOSS_ACCOUNTING_GL`: `BUDGET_EDIT`, beside Products' `ACCOUNTING_VIEW`, `ACCOUNTING_GL_POST` and
      `PRODUCT_COST_VIEW`;
    - `BOSS_ACCOUNTING_TAX`: `TAX_STATEMENT_EDIT`;
    - `BOSS_ACCOUNTING_READ`: `CUSTOMER_CREDIT_VIEW`, beside Products' `ACCOUNTING_VIEW` and `PRODUCT_COST_VIEW`;
    - `BOSS_ACCOUNTING_APPROVE`: `ACCOUNTING_VIEW`, `INVOICE_APPROVE`, `INVOICE_HOLD_RELEASE`,
      `PAYMENT_RUN_APPROVE`, `FISCAL_CLOSE`, `CREDIT_HOLD_RELEASE`, `BUDGET_OVERRIDE`, `RETURN_CREDIT_APPROVE`,
      `PRODUCTION_COST_POST`;
    - Projects' `BOSS_PROJECT_MANAGER`: `RECEIVABLE_EDIT`, since its Billing calls `change#InvoiceState` and
      `send#Invoice` (§2).
  - No artifact authorization for the restricted services of §2, or for the Mantle REST ledger paths (F6).
- **The Accounting root.**
  - The menu of design §1.2: the placeholders renamed, and Payments, PeriodClose, FixedAssets, Inventory,
    Records and Approvals added (F1). Each area shows for its groups only.
  - `<shell-providers>`: palette types and sources for invoices, payments, parties, accounts and journal
    entries, and quick create of an invoice, bill, payment or draft journal entry, each checking its group.
    Today and the notification topics grow phase by phase (AC-18).
  - The `accounting` key scope.
  - `ironstone.commons.PaletteServices.get#RecordLink` opens invoices, payments and journal entries under
    Accounting.
- **Home** (design §3): AccountingSummary and MoneyCards over `ironstone.accounting.HomeServices.get#Summary`,
  with the counts of later phases null, and MyFinanceWork with no sources yet.
- **Accounting demo data.**
  - `BossAccountingDemoData.xml` builds on Mantle's `ORG_ZIZI_CORP` accounting setup, which
    `ORG_ZIZI_RETAIL` inherits (F7). Mantle seeds no accounting transactions, so a demo service runs the
    invoices, payments and postings the phases need, as Projects' demo services do.
  - `BossUsersDemoData.xml` gains a user per group (AR, AP, treasury, GL, tax, reader, approver and admin), and a
    report reader with no other launcher.
- **Specs.**
  - `AccountingShell`: the menu per group, the palette, record links, quick create.
  - `AccountingAccess`: started, covering organization scope and groups through AccessServices, and the
    permissions through the Mantle services.
- **Usable when:** the menu renders for each group, and quick create offers only what the group may create. A
  report reader sees their organization's invoices, payments and accounts but not another organization's, in
  lists, the palette and record links.

### P2 — Ledger and posting guard

Built in two parts: P2a the guard and the core screens, then P2b batches, templates, dimensions and attachments.

- **P2a.**
  - **AC-06, the guard,** inside `mantle.ledger.LedgerServices.post#AcctgTrans`, beside its period check (F9):
    - proposed `mantle.ledger.config.AccountingLock` (typed lock-through dates) and `AccountingLockException`
      (soft and expiring; never relaxing a hard lock or `TimePeriod.isClosed`);
    - the organization, and the operation identity;
    - `verifyOnly` made free of side effects (F9);
    - `mantle.ledger.CloseServices.store#Lock` and `grant#Exception` (`ACCOUNTING_ADMIN`).
  - **Mantle ledger fixes** (each keeping Mantle's default):
    - `repost#AssetIssuance` posts a dated reversing delta in an open period instead of unposting and deleting
      (R-SA-02; design §1.4's `AssetIssuanceGlRePost` row; F11);
    - `post#ReverseAcctgTrans` takes a reversal date, and marks the original reversed only when the reversal
      posts (F12);
    - fiscal periods follow the organization's fiscal-year start (F13);
    - `GlAccountOrganization` gains its from and thru dates (F14).
  - **Screens** (design §8 and §9):
    - ChartOfAccounts (tree and list) and AccountDetail;
    - JournalEntries, with bulk post and a result per transaction;
    - JournalEntryDetail: balanced lines; post, and reverse with a date and reason; delete of drafts; the move
      dialog; the audit. Posted entries are read only, and the metadata correction is
      `mantle.ledger.JournalServices.update#PostedMetadata`, audited and limited, not `update#AcctgTransPosted`
      (F11);
    - TransactionEntries;
    - Periods and PeriodLocks.
  - **Reports** (design §13): TrialBalance and GeneralLedger, with the shared report options and drill-down.
    TrialBalance reads closed periods' summaries and sums open periods' posted entries (§4; F16).
- **P2b.**
  - **AC-13:** `AcctgTransTemplate` and `AcctgTransTemplateEntry`; `mantle.ledger.JournalServices`
    `store#Template`, `store#TemplateLines`, `create#FromTemplate`, `validate#Batch` and `post#Batch`, checking
    `ACCOUNTING_GL_POST`. The batch posts each transaction on its own and names each failure, in place of
    `post#GlJournal` (F17). JournalBatches and JournalTemplates.
  - **AC-22:** `AcctgTransEntry.facilityId` and `costCenterId`, AccountDetail's RequiredDimensions on
    `GlAccountOrganization`, and the posting refusal of an entry missing a required dimension (F15). The
    source-line fields and their copy come in P6.
  - **AC-21:** `AcctgTransContent`, registered in `get#RecordLinkInfo`, for JournalEntryDetail's Files.
- **Usable when** (design §16.3 bank-to-close, its closed-period part):
  - a GL user creates, balances and posts a manual entry, then reverses it on a later date with a reason, and
    the posted entry stays read only;
  - a backdated posting into a locked or closed period is refused by a direct post, and an auto-post SECA's
    goes to the error journal with the lock named, while a soft exception lets one named user post one scope until
    it expires;
  - a batch with one unbalanced entry posts the others and names the failure.

### P3 — Settings

- **Screens** (design §15):
  - Settings: the index, with readiness;
  - AccountingPreferences, with ClonePreferences' conflict preview (`mantle.ledger.SetupServices.clone#Preferences`,
    `ACCOUNTING_ADMIN`). The COGS method is shown for what it is: Mantle posts actual cost whatever it says (F40);
  - PostingDefaults: the mappings by kind, `ProductGlAccount` and `ProductCategoryGlAccount` among them, and
    the missing-mapping queue over `get#DefaultGlAccountByType`, which also lists the transactions sent to the
    error journal for a missing account (F10). The type defaults include the revaluation offset type
    `GatInventoryRevaluation` that Products P9 seeds, mapped for the demo organization (§4; F47);
  - PaymentTerms: due terms, and from P8 the term lines (§4);
  - Currencies: currency units and dated rates, the only writer of either (D17; Products Units excludes them;
    F20);
  - PaymentMethods: masked methods and gateway bindings; secrets stay Admin's;
  - DocumentSettings: numbering, kept on `PartyAcctgPreference` where Mantle reads it, and templates, with the
    preview of `ironstone.accounting.DocumentServices`.
- **Usable when:** a finance admin sets an organization's preferences, maps an invoice item type that
  PostingDefaults listed as missing, and adds a dated rate and a due term. A GL user who is not an admin is
  refused each.

### P4 — Receivables

- **AC-02, the invoice controls.**
  - `mantle.account.InvoiceServices.change#InvoiceState`, the one invoice state guard over Mantle's status
    flow (F18): status, period, posting, hold (D6), and the single-currency refusal (D18). It checks
    `RECEIVABLE_EDIT` or `PAYABLE_EDIT` by side, and `INVOICE_APPROVE` for approval. Projects'
    `update#InvoiceStatus` calls it, so project invoices are refused too (F46).
  - `send#Invoice`, with or without a store: it renders the invoice as sent and its attachments, stores the PDF as the
    invoice's content stamped with its time (impl-drawers-commons §4), sends through `send#EmailDraft` and records the
    outcome per recipient (F21). Projects' `send#Invoice` calls it (F2). The InvoicePay link is added in P18.
  - `InvoiceFinalizedSendEmail` skips a version `send#Invoice` has sent (CX-AUTOMATION).
  - `process#InvoiceBatch`, and the duplicate-source guard. It and `send#Invoice` check `RECEIVABLE_EDIT`.
- **Screens** (design §4):
  - Invoices, with CreateReceivable and InvoiceBatch;
  - InvoiceDetail: `Shared/InvoiceDetail` with the receivables context (F2) and the tabs of design §4. Its
    credit memo is linked to the invoice and applied through `apply#InvoiceToInvoice` (F22). Projects' context
    and client view are unchanged;
  - BillingQueue, over Projects' approved time;
  - Statements, over `get#ReceivableStatementInfo`, grouped by currency (F19), and sent through
    `mantle.account.CollectionServices.send#Statements` (`RECEIVABLE_EDIT`);
  - Customer360: `Shared/Customer360` (crosscut §3.2) with the Accounting context, its Contact, Orders,
    Invoices/payments and Agreements tabs, and the PaymentDetails, PartyIdentifications and TaxRegistrations
    forms (D26), finance-gated and masked. Credit and Activities come in P10.
- **Outputs:** the invoice and credit memo print, shared with Projects' (F2); the customer statement.
- **Usable when** (§16.3 invoice-to-cash, its first part):
  - an AR user creates, finalizes and sends a customer invoice without a store, and its email outcome is
    recorded;
  - a store invoice is not sent twice;
  - a batch send with one bad address names it and sends the rest;
  - an invoice in a foreign currency cannot be finalized;
  - a project invoice approved and sent from Projects behaves as before.

### P5 — Payments and settlement

- **AC-02, settlement.**
  - `mantle.account.PaymentServices.find#OpenItems` and `apply#Settlement` (`RECEIVABLE_EDIT` or `PAYABLE_EDIT` by
    side): a preview, then one atomic application set per party and currency, under the operation key (F8). A
    discount or write-off is a posted adjustment to an explicit account, not Mantle's write-off status (F23).
  - `PaymentServices.autoApply#Payment`, an empty stub today (F24), implemented over the same `find#OpenItems`.
  - `PaymentServices.change#PaymentState`, the guarded payment status transition (validate, deliver, void;
    `PAYMENT_EDIT`), with the PaymentValidation topic.
- **AC-20, transfers:** the `PtInternalTransfer` payment type (F31), its cash-in-transit `PaymentTypeGlAccount`,
  and `PaymentServices.create#InternalTransfer` (`PAYMENT_EDIT`): two linked legs, atomic, with a fee line.
- **Screens** (design §6 and §4):
  - Payments, with its tabs, NewPayment and InternalTransfer;
  - PaymentDetail: applications, gateway actions, refunds linked to the original, evidence, and the payment
    date under the lock;
  - GatewayTransactions;
  - ReceivablesWorkbench.
- **Usable when** (§16.3 invoice-to-cash, settlement; access):
  - a partial receipt and an available credit apply to an invoice in one confirmed set, and a retry applies
    nothing twice;
  - a write-off without an account is refused;
  - a transfer between two bank accounts posts both legs through transit, or neither;
  - an AR-only user cannot capture a gateway payment or read bank numbers.

### P6 — Payables

- **Purchasing's contract** (§4, PUR-SUPPLIER; F29):
  - `mantle.party.supplier.SupplierProfile`, effective-dated by organization and supplier (`fromDate`, `thruDate`),
    with `settlementTermId` and `selfBillingIndicator` only, both audit-logged (impl-drawers-commons §4);
  - the finance fields of `mantle.party.SupplierServices.store#SupplierProfile`, which need `SUPPLIER_TERMS_EDIT`
    (its buyer fields need Purchasing's `SUPPLIER_PROFILE_EDIT`).

  The rest of the profile stays Purchasing's.
- **AC-02, bill intake** (D2):
  - `mantle.account.InvoiceServices.import#Bill`, keyed by organization, supplier and supplier reference, or by
    shipment for a self-billed draft. A repeat is refused, naming the earlier bill. It needs `PAYABLE_IMPORT`: it
    takes an upload from AP intake, and from a Purchasing buyer (`BOSS_PURCHASING_BUYER`, seeded with Manufacturing
    P14, which grants it the permission) for a bill on a PO of an organization the buyer belongs to (§4);
    Purchasing's Bills mounts it in its P6;
  - `create#InvoiceFromSource` (`PAYABLE_EDIT`), on the ordered or the accepted received basis, applying order
    payments; from the InvoiceFromSource dialog of OrderDetail and ShipmentDetail;
  - `approve#Payable` (`INVOICE_APPROVE`);
  - the due-date rule takes SupplierProfile's term for a bill, after the agreement's and before
    PartyAcctgPreference's (R-ACC-16; F28).
- **AC-03, holds:**
  - `mantle.account.invoice.InvoiceHold` and its seeded reasons;
  - `mantle.account.InvoiceServices` `hold#Invoice` (`INVOICE_HOLD`), `release#InvoiceHold`
    (`INVOICE_HOLD_RELEASE`, never by the placer) and `request#HoldRelease` (`PAYABLE_EDIT`), with
    `ironstone.accounting.MatchServices.find#BillExceptions` for the screens;
  - the hold guard inside Mantle, where a payment is applied to a payable invoice, behind its flag (§4): it
    covers `apply#Settlement`, payable `create#InvoicePayment` and `apply#InvoicePayment`, and the SECAs below.
- **CX-AUTOMATION**, each change behind its flag (§4; F27):
  - `ShipmentIncomingDeliveredCreateInvoices` runs only for a self-billing supplier, and
    `create#PurchaseShipmentInvoices` takes `acceptedOnly`, which bills accepted quantity and no leftover or
    service line (F26);
  - `PaymentApplyForInvoice` and `InvoiceApplyForPayments` leave a held bill's payment unapplied, with a named
    exception.
- **AC-22, the sources:** `OrderItem.costCenterId` and `InvoiceItem.costCenterId`, copied with the facility by
  the invoice and payment auto-post services.
- **Screens** (design §5 and §14):
  - Bills: its tabs, CreatePayable, BillUpload, and HoldInvoice on a selection;
  - BillDetail: `Shared/InvoiceDetail` with the payables context. Its Match tab comes in P7;
  - ExpensePosting;
  - Supplier360: Products' `Shared/Supplier360` gains the Accounting context. Its tabs are Bills/payments and
    Agreements/terms (the SupplierProfile terms and self-billing flag). It also gains PaymentDetails, through
    `create#BankAccount` and `update#BankAccount` behind the treasury guard (F30), PartyIdentifications and
    TaxRegistrations;
  - OrderDetail: `Shared/OrderDetail` with the Accounting context (Header, Items, Invoices/payments,
    Fulfillment, History);
  - ShipmentDetail: `Shared/ShipmentDetail` (crosscut §3.8) with the Accounting context;
  - Approvals: the Commons Notifications mount, filtered by Accounting's approval topics (§4; F43), with the BillApproval and
    BillHoldRelease topics. Later phases add theirs.
- **Usable when** (§16.3 procure-to-pay, intake and holds):
  - a receipt from a supplier that is not self-billing creates no bill, and one from a self-billing supplier bills
    accepted quantity only;
  - a second upload with the same supplier reference is refused, naming the first;
  - a bill from a PO through InvoiceFromSource takes the supplier's terms;
  - a held bill cannot be approved or paid, manually or by a payment that names it;
  - the placer cannot release the hold, and an approver's release is recorded;
  - OrderProcureToPayBasicFlow passes unchanged.

### P7 — Matching

- **AC-03, the match.**
  - `InvoiceMatch`, `InvoiceMatchLine` and `InvoiceMatchPolicy`.
  - `mantle.account.InvoiceMatchServices` `evaluate#InvoiceMatch`, `apply#InvoiceMatch` (writes or updates
    `OrderItemBilling`) and `unapply#InvoiceMatch` (reverses it), checking `INVOICE_MATCH`; `store#MatchPolicy`
    (`ACCOUNTING_ADMIN`); and `queue#MatchReevaluation`, called from the AssetReceipt and InvoiceItem EECAs, with
    its background job, all in mr-mantle.
  - Quantity under open inspection is excluded as P0 settles. Service lines wait for Purchasing's acceptance
    (§7).
  - `InvoiceMatchPolicy` as effective-dated rows with their key fields audit-logged; a match line keeps the policy
    row it applied (impl-drawers-commons §4).
  - The legacy match backfill (design-purchasing §18), `InvoiceMatchServices` `preview#LegacyMatches` and
    `apply#LegacyMatches`: it links existing bill lines to orders and receipts only from unambiguous OrderItemBilling
    and AssetReceipt evidence, names each ambiguous line as a match exception and goes on, and never matches an
    unexplained balance. AP and a buyer with the match group (`INVOICE_MATCH`) run it, from MatchPolicies here and
    from Purchasing's MatchExceptions (§4).
- **Screens:** `Shared/InvoiceMatch` (crosscut §3.22) with the Accounting context, opened from BillDetail's Match
  tab; MatchPolicies.
- **Usable when** (§16.3 procure-to-pay, matching):
  - a bill against a partial accepted receipt matches within tolerance, and excess or already-billed quantity is
    refused;
  - a price outside tolerance holds the bill, naming the rule;
  - a changed receipt marks the match stale and the job re-evaluates it;
  - no hold is released automatically.

### P8 — Payment runs

- **Payment terms** (§4): `SettlementTermLine` as effective-dated rows,
  `mantle.account.InvoiceServices.store#SettlementTerm` (`ACCOUNTING_ADMIN`), and the per-invoice
  `InvoiceDueSchedule` written at issue, which aging, the workbench, runs and `apply#Settlement` read; a discount
  taken within its date posts to the discount account.
- **AC-04.**
  - `mantle.account.payment.PaymentRun` and `PaymentRunItem`.
  - `mantle.account.PaymentRunServices` `create#Run` and `select#Bills` (`PAYABLE_EDIT`), `approve#Run`
    (`PAYMENT_RUN_APPROVE`) and `execute#Run` (`PAYMENT_EDIT`), with `ironstone.accounting.PaymentRunServices.find#Runs`
    for the screens. Execution re-reads holds, bank details and the version under lock, and gives each supplier
    payment one instruction identity.
  - The PaymentRunApproval topic.
  - A supplier's bank-detail change voids a pending approval of a run that pays them (D26), through
    `PaymentRunServices.void#RunApproval`, a SECA on `update#BankAccount`. The void keys on the supplier, since
    Mantle moves a changed bank account to a new payment method (F30).
  - A bank return that declines a payment reverses its posting and unapplies it, so the bill is open again
    (F32).
- **Screens** (design §5): PayablesWorkbench, with ApplySupplierCredit; PaymentRuns; PaymentRunDetail, with
  checks, NACHA and Positive Pay through the existing services, and bank returns through `import#NachaReturn`.
  The discount columns read the due schedule.
- **Usable when** (§16.3 procure-to-pay and batch):
  - a run selects the due approved bills and excludes a held one with its reason;
  - after approval, one supplier's payment fails and the others keep their payments and file;
  - regenerating downloads the same file;
  - a bank-detail change voids the approval;
  - a NACHA return reopens the bill it paid.

### P9 — Banking

- **AC-05.**
  - `mantle.account.method.BankReconciliation`, `BankReconciliationLine`, `BankMatchRule` and `StatementImport`.
  - `mantle.account.ReconciliationServices`, checking `BANK_RECONCILE`:
    - `preview#CsvStatement`, `review#StatementImport` and `commit#StatementImport`. A line's identity is the
      bank's FIT id where the format has one (OFX), and a source-row key otherwise (BAI2, CSV; F33);
    - `create#`, `store#` and `finish#Reconciliation`, with `ironstone.accounting.BankServices.find#Reconciliations`
      for the screens;
    - `store#Rule` and `test#Rule`. Every candidate shows; a rule applies only an exact, unambiguous match (F33).
- **AC-20, deposits:** `PaymentDeposit`, `Payment.paymentDepositId` and
  `mantle.account.PaymentServices.create#DepositSlip` (`PAYMENT_EDIT`).
- **Screens** (design §7 and §15):
  - BankAccounts;
  - BankAccountDetail, whose reconcile, unreconcile and no-reconcile row actions keep parity on their own
    (R-ACC-25), with DepositSlip;
  - StatementImport: BAI2, OFX and CSV;
  - Reconciliations and ReconciliationDetail, sequential lists on terminal;
  - UnmatchedTransactions and BankRules;
  - FinancialAccounts and FinancialAccountDetail.
- **Usable when** (§16.3 bank-to-close, the bank part; batch):
  - a statement with a duplicate and a malformed row imports the rest and lists both, and the same BAI2 file
    imported twice adds nothing the second time;
  - an ambiguous rule suggests and does not apply;
  - two sessions cannot clear one line;
  - a statement with a difference cannot be finished;
  - a deposit's one bank line reconciles once.

### P10 — Collections, credit and recurring invoices

- **CX-ORDER-HOLD** (§4; F29): `mantle.order.OrderHoldReason`, and `mantle.order.OrderServices.hold#Order` and
  `release#OrderHold`. A release returns the order to Approved only when no other reason is open; nothing uses
  `OrderBeingChanged`.
- **AC-11, credit.**
  - `CustomerCreditPolicy` and `CreditHoldDecision`.
  - `mantle.account.CreditServices` `store#Policy` and `store#Defaults` (`ACCOUNTING_ADMIN`), `evaluate#OrderCredit`,
    `release#CreditHold` (`CREDIT_HOLD_RELEASE`) and `get#CustomerCreditStatus` (`CUSTOMER_CREDIT_VIEW`), the hold
    and its reason that Customer Service reads. `evaluate#OrderCredit` runs as a SECA in mr-mantle on
    `check#OrderPreApprove`, adding a warning that stops Mantle's auto-approval (F34), and in the guard of every
    BOSS approve action.
  - The CreditHoldRelease topic, and OrderDetail's hold banner.
- **AC-10, collections.**
  - `CollectionPromise`, `DunningLevel`, `DunningRun` and `DunningNotice`.
  - `mantle.account.CollectionServices` `record#Activity`, `store#Promise`, `preview#Dunning` and `send#Dunning`
    (`RECEIVABLE_EDIT`), and `store#Level` (`ACCOUNTING_ADMIN`), with
    `ironstone.accounting.CollectionServices.find#Work` for the screens.
  - `send_SalesInvoicePastDueEmails` stays paused.
- **AC-09, recurring invoices.**
  - `InvoiceSchedule` and `InvoiceScheduleOccurrence`.
  - `mantle.account.RecurringInvoiceServices` `store#Schedule` and `preview#Period`, with its ServiceJob's
    `generate#Invoices` (`RECEIVABLE_EDIT`), and `ironstone.accounting.RecurringServices.find#Schedules` for the
    screens.
  - `create_RecurringOrders` shown with its last result (D24).
- **Screens:** Collections, Dunning, CollectionPolicies and RecurringInvoices; Customer360's Credit and
  Activities tabs; the Aging report (design §13) over `mantle.ledger.LedgerReportServices.run#Aging`, as of a
  chosen date, with Mantle's aging view fixed (F36).
- **Today and notices:** collection follow-ups, credit holds, recurring-generation failures.
- **Usable when** (§16.3 invoice-to-cash, overdue and credit; batch):
  - an order over its customer's limit is held on approval, by Mantle's auto-approval and by a BOSS approve
    alike; it keeps its reservations, and a credit manager releases it with a reason;
  - a dunning run excludes a disputed invoice, and one failed recipient does not resend the rest;
  - a retried generation of a recurring schedule makes one draft;
  - Aging for a past date buckets the same on H2 as on Postgres.

### P11 — Period close

- **AC-06, close.**
  - `AccountingCloseRun`.
  - `mantle.ledger.CloseServices.get#Checklist`: unposted documents, imbalance, unmatched bank lines, AP holds,
    missing rates, the error-journal transactions (F10), the stock and WIP tie-out, and the rows of design §9
    PeriodCloseDetail.
  - `CloseServices.close#Period` (`FISCAL_CLOSE`) commits the closing entries, `close#FinancialTimePeriod` and the
    snapshot at once. Mantle's close is fixed to count only the organization's unposted transactions, and its
    closing entries to use the organization's own net-income account (F37). `reopen#Period` (`FISCAL_REOPEN`) is
    audited and keeps the old close.
- **Project cost** (§4; F45): `mantle.ledger.OtherAutoPostServices.post#WorkEffortCost`, on project timesheet
  approval behind its flag: approved project time at the entry's cost rate to project cost, from the labor clearing
  account, keyed by time entry, with a dated reversing delta when the approval is undone or the entry changes.
  Production time is left to Manufacturing (D12). The two GL account types are seeded and mapped in
  PostingDefaults.
- **The period-run contract:** `mantle.ledger.transaction.AccountingPeriodRun` and its results, with
  `mantle.ledger.PeriodRunServices.preview#Run`, and `ironstone.accounting.PeriodRunServices.find#Runs` for the
  screens. P12's depreciation is its first kind.
- **Screens:** PeriodCloseDetail and PeriodRuns; the InvoiceReconciliation report, over
  `mantle.ledger.LedgerReportServices.run#InvoiceReconciliation`.
- **Usable when** (§16.3 bank-to-close, close):
  - close is blocked by an unposted invoice and an unreconciled statement, each named and linked;
  - once they are fixed, the period closes, and another organization's open work did not block it;
  - a backdated invoice, refund and reversal are then refused alike.

### P12 — Fixed assets

- **AC-07, the books.**
  - `mantle.product.asset.FixedAssetClass`, effective-dated rows with their key fields audit-logged, beside the
    `AssetClass` enumeration it replaces as the source of defaults (F38), and the book event types of
    `AssetBookEvent`, which Products P9 made for the revaluation (F47).
  - `mantle.ledger.AssetBookServices`, which Products P9 began with the revaluation, adds:
    - `store#Class` (`ACCOUNTING_ADMIN`), with `ironstone.accounting.AssetBookServices.find#Classes` for the
      screens beside Products' `get#RevaluationContext`;
    - `capitalize#Asset`, `adjust#AssetBook`, `dispose#Asset` and `reverse#AssetBookEvent` (`ACCOUNTING_GL_POST`);
    - `preview#Depreciation`, `get#DepreciationPreview` and `post#Depreciation` (`ACCOUNTING_GL_POST`): each
      asset-period once, over the existing calculate and post services, never
      `calculateAndPost#AllFixedAssetDepreciations`. A depreciation that does not post leaves no depreciation row
      (F38).
- **Screens:**
  - FixedAssets, AssetClasses and DepreciationRunDetail;
  - EquipmentDetail: `Shared/EquipmentDetail` (crosscut §3.10) with the Accounting context: identity, the Book
    pane with its four dialogs and AcquireCostRepair (finance admin only, in an open period; F39), source and
    history.
- **Usable when** (§16.3 bank-to-close and batch):
  - an asset is capitalized from its class, then depreciated for a period with one asset failing and the rest
    posted;
  - it is adjusted, and disposed with a gain or loss, and a book event is reversed in an open period;
  - depreciation into a closed period is refused.

### P13 — Valuation and landed costs

- **InventoryValuation** (design §10): the rest of Products' `Shared/InventoryValuation`, around its P9 dialogs,
  at `Accounting/Inventory/InventoryValuation`:
  - `mantle.product.InventoryReportServices.run#InventoryValuation` over `AssetValuationSummary`, which values
    stock at each asset's current cost, set beside the inventory and WIP account balances (F40). A revaluation
    moves both by on-hand × delta, so they still agree after one;
  - ValuationExceptions: the `AtrNoAcquireCost` and `AtrNoAcctgPreference` movements, zero-cost receipts, and
    movements whose posting went to the error journal (F40);
  - CostDataRepair: finance admin, audited, in an open period (F39).

  Warehouse's mount is §7.
- **AC-07, the revaluation from Products P9** (§4; F47): the dialogs call `mantle.ledger.AssetBookServices`
  `preview#Revaluation` and `post#Revaluation` (`ACCOUNTING_GL_POST`), behind the organization's revaluation flag,
  off by default. A post changes forward cost (§4): it sets the on-hand assets' `acquireCost` from its date,
  without reposting history, and posts one AcctgTrans for on-hand × delta against the revaluation offset account
  (P3), never calling `update#ProductAcquireCost`.
- **AC-07, landed costs:** `mantle.account.invoice.LandedCostAllocation`, and `AssetBookServices.preview#LandedCost`
  and `post#LandedCost` (`ACCOUNTING_GL_POST`). The on-hand share goes to the asset's cost and the issued share to
  COGS or variance.
- **AC-07, for Manufacturing's cost close:** the GL account types `GatLaborApplied`, `GatOverheadApplied`,
  `GatOutsideProcessAccrued` and `GatProductionVariance`, and `AssetTypeGlAccount.scrapGlAccountId` (§4).
- **Scrap by reason** (impl-warehouse §4): `post#PhysicalInventoryVariance` reads the organization's
  `VarianceReasonGlAccount` row for the variance reason, then for a scrap reason the asset type's
  `scrapGlAccountId`, and otherwise found or shrinkage by sign as before; the demo organization's InVrScrap and
  InVrExpired rows are seeded.
- **Screens:** InventoryValuation; LandedCosts, linked from BillDetail; Product360: Products' `Shared/Product360`
  with the Accounting context (Summary, Costs/history, source movements, permitted Prices, and the GL mappings pane
  of §4); the StockTransactions report, over `mantle.product.InventoryReportServices.run#StockTransactions`.
- **Usable when** (§16.3 production-to-GL, the valuation part):
  - a freight bill line allocated by weight to two receipts raises the on-hand asset's cost and sends the
    consumed share to COGS, with ledger links, and cannot be allocated twice;
  - a receipt without a cost basis shows in ValuationExceptions and in P11's checklist;
  - the valuation and the inventory account agree for the demo organization, or the difference is listed;
  - a revaluation from a changed estimate sets the on-hand cost from its date and posts on-hand × delta to the
    offset account; a later issue posts at the new cost, and the valuation and the inventory account still agree
    (Products P9);
  - with the organization's revaluation flag off, the post is refused.

### P14 — Tax

- **AC-08** (F41).
  - A corrected, active `mantle.other.tax.TaxAuthorityRate`, keyed to `TaxAuthority` by its own id.
  - `calculate#SalesTaxLocal` and `calculate#InvoiceSalesTax`, implemented, with the organization fallback for
    invoices without a store. Tax lines post to the authority's account.
  - A tax error blocks finalization in `change#InvoiceState`.
  - `mantle.other.TaxServices` `store#Rate` (`ACCOUNTING_ADMIN`), and `export#Statement` and the 1099 runs
    (`TAX_STATEMENT_EDIT`), with `ironstone.accounting.TaxServices.get#StatementDetail` for TaxStatementDetail.
- **Screens** (design §11): TaxAuthorities; TaxRates, with TaxSimulation; TaxStatements and TaxStatementDetail.
  The first release has the US 1099 data and local sales tax only (design §20).
- **Usable when:**
  - a sales invoice without a store gets its local tax lines by organization policy, with the authority, rate
    version, base and rounding stored;
  - an invoice whose tax cannot be calculated cannot be finalized;
  - a sales-tax statement for a period lists its invoice lines;
  - 1099 data is generated per vendor, with failures named.

### P15 — Budgets

- **AC-14.**
  - The Budget status items and flow, which Mantle declares no items for (F42).
  - Budget amounts audit-logged, so a revision is its time and BudgetVariance reads a budget as of one; the approved
    budget's PDF stored as its content. The organization comes from the budget's period, and other parties are
    BudgetParty rows (impl-drawers-commons §4).
  - `BudgetControlPolicy`, effective-dated rows with their key fields audit-logged, and
    `mantle.other.budget.BudgetCommitment`.
  - `mantle.other.BudgetServices` `revise#Budget` (`BUDGET_EDIT`), `store#Policy` (`ACCOUNTING_ADMIN`),
    `check#Budget` (its Stop override `BUDGET_OVERRIDE`), `reserve#Commitment`, `convert#Commitment` and
    `release#Commitment`, each idempotent per source revision, with
    `ironstone.accounting.BudgetServices.find#Exceptions` for the screens.
  - `approve#Payable` (P6) converts a PO's commitment to actual.
  - The BudgetOverride topic. Purchasing's callers are §7.
- **Screens:** Budgets, BudgetDetail and BudgetControls; the BudgetVariance report, with its committed column
  and actuals net of credits (F42).
- **Usable when:**
  - an approved budget's revision keeps the old numbers;
  - a commitment reserved and converted is not counted again as actual;
  - an over-budget expense under Stop is refused, and an override needs a reason.

### P16 — Reports

- **AC-12:** the report runs in Mantle's report files, over the existing report services and views. Each checks
  the organization and that the periods are its own, which Mantle's report services do not (F6). Each answers
  as-of, incomplete and error metadata, and drill-down keeps organization, date and currency.
  `mantle.ledger.LedgerReportServices.run#PartnerLedger` and `mantle.sales.SalesReportServices.run#SalesAnalysis`
  come here, after `LedgerReportServices.run#Aging` (P10) and `run#InvoiceReconciliation` (P11), and
  `mantle.product.InventoryReportServices.run#StockTransactions` and `run#InventoryValuation` (P13).
  `ironstone.accounting.ReportServices` keeps the Reports catalog, its quick options, and the print and export
  shapes.
  Date filters and drill-downs preserve the source's captured `accountingDate` when present, including documents
  created and approved in different time zones; later applications and forward reversals retain their own dates.
- **Screens** (design §13): Reports, the catalog with its quick options; BalanceSheet, IncomeStatement,
  CashFlow, RetainedEarnings, FinancialRatios, PartnerLedger, AccountBalance, PostedSummary and SalesAnalysis.
- **Home complete:** every card and MyFinanceWork source of design §3.
- **Usable when:**
  - each report runs for the demo organization, drills to its source, and prints and exports the same rows;
  - a reader of one organization sees no other organization's balances through any report or export, including
    SalesAnalysis' top products and customer classes (F6).

### P17 — Returns and order changes

- **Warehouse's contract** (§4, WH-RETURN): `mantle.shipment.WarehouseTaskServices.receive#ReturnItems`, checking
  `STOCK_RECEIVE`, which Warehouse grants its groups. It sets `ReturnItem.receivedQuantity` and processes no
  responses, replacing `ShipmentDeliveredReturnReceive` and `ReturnReceivedProcess` on this path. Warehouse's
  ReturnReceipt screen stays Warehouse's.
- **CX-AUTOMATION**, behind D11's flag (§4): `ReturnApprovedProcess` keeps only
  `create#ReturnShipment` (D11).
- **AC-02, returns:** `mantle.order.ReturnServices.preview#ReturnSettlement` and `settle#Return`: a credit needs
  `RECEIVABLE_EDIT` (a supplier's `PAYABLE_EDIT`), a refund `PAYMENT_EDIT`, and a receiptless credit
  `RETURN_CREDIT_APPROVE`.
  - The customer branch calls `process#ReturnItemResponses` inside the settlement.
  - The supplier branch is new code: Mantle refuses responses for a purchase return (F35).
  - Both cover the result codes of design §14, a receiptless credit with an approver, `complete#ReturnItem`, and
    `ReturnItemBilling.assetReceiptId`. Settlement queues match re-evaluation.
- **AC-02, between pack and ship** (D3, behind its flag; §4, F25): the pack SECA leaves the sales invoice
  InvoiceInProcess with no payments applied, and a ShipShipped SECA finalizes it, applying captured payments and
  sending it; `mantle.account.InvoiceServices.release#ShipmentDraftInvoice` and
  `mantle.account.PaymentServices.refund#OrderPayment` (`PAYMENT_EDIT`) serve the changes in between.
- **Screens:** ReturnDetail: `Shared/ReturnDetail` (crosscut §3.18) with the Accounting context.
- **Usable when** (§16.3 return-to-refund; invoice-to-cash, the reopened package):
  - approving an RMA creates no credit;
  - receiving part of it credits only that part, a second box later is still credited, and a refund stays
    within the original paid amount;
  - a supplier return creates the payable credit;
  - a package reopened after pack takes its lines off the shipment's invoice, which is finalized only when the
    shipment ships;
  - ReturnToResponseBasicFlow and OrderToCashBasicFlow pass unchanged.

### P18 — Portals

Accounting's customer and supplier pages, as two PASS apps in mr-pass (§2, §4), on CX-PORTALS.

- **CX-PORTALS** (§4; F29): `mantle.party.ExternalAccessCapability`, and `mantle.party.ExternalAccessServices`
  `create#AccessCapability`, `check#AccessCapability`, `revoke#AccessCapability` and `check#AccessToken`.
- **The PASS apps**, in place of crosscut §5's audience roots (F44):
  - Billing (`screen/Billing.xml`, the `billing` mount): a customer's invoices, with InvoicePay;
  - Supplier (`screen/Supplier.xml`, the `supplier` mount): a supplier's documents, with BillUpload. Purchasing P16
    adds its home, QuoteResponse and OrderAcknowledgement.

  Each is a `PublicSiteApp` with the organization as its target, under PASS's `Pass.xml`, with its navigation,
  readiness and operator configuration on Forum's pattern. They are the first PASS apps beyond Forum, so P18 settles
  how an app registers, which Purchasing P16 and Customer Service's Support app follow.
- **Links and contacts.**
  - An invoice's pay link opens InvoicePay. A PO's link opens BillUpload for that PO: AP issues its capability from
    OrderDetail through `create#AccessCapability`; Purchasing P16 adds OrderAcknowledgement to the same link, and its
    `send#PurchaseOrder` issues one capability for both. Each link is a page taking its token, checked by
    `check#AccessToken` (§2).
  - A signed-in customer or supplier contact is a PASS public account, invited through a PASS invitation bound to
    the app and to the customer or supplier; redeeming it makes the relationship Mantle checks. No UserGroup.
- **AC-02, portal services**, in Mantle so a PASS page can call them, locally or remotely:
  `mantle.account.PortalServices` `issue#InvoiceAccess`, `get#Invoice`, `start#InvoicePayment`, `get#PaymentResult`,
  `submit#SupplierBill` and `get#Submission`, each calling `check#AccessCapability` first, each an operation in
  PASS's `Schema.js` and `Routes.js` served by Mantle's PassApi. `send#Invoice` adds the pay link, the Billing page
  of the organization's site. `submit#SupplierBill` takes its files through PASS's media staging and scanning and
  makes the incoming draft through the core of `mantle.account.InvoiceServices.import#Bill` (P6), with the
  capability check in place of `PAYABLE_IMPORT`.
- **Screens:** InvoicePay (PublicInvoice, PayInvoice, PaymentResult) in Billing, the gateway's return coming back to
  a registered local path of the app; BillUpload, with SupplierBillUpload's forms, in Supplier. Both at 390 px and on
  the desktop.
- **Demo:** a PASS site for ORG_ZIZI_RETAIL with the Billing and Supplier mounts, a customer contact and a supplier
  contact as invited PASS accounts, and token fixtures for the specs.
- **Usable when** (§16.3 access, procure-to-pay):
  - a customer's link shows only that invoice, with no Chatter, cost or rates, and an expired or foreign token
    says unavailable;
  - a redirect return never marks the invoice paid, and a pending payment resumes;
  - a supplier upload creates an incoming draft, a repeat answers the first submission, and it never approves a
    bill;
  - the same pages through a remote PASS frontend with only framework, webroot and PASS installed, and Forum's
    walks unchanged.

### P19 — Setup and activation

- **AC-01, activation.**
  - `mantle.ledger.config.AccountingSetupRun`.
  - `mantle.ledger.SetupServices`, checking `ACCOUNTING_ADMIN`:
    - `preview#OpeningBalances`;
    - `import#OpenItems`: real invoices and bills with an opening flag, at their own due dates, against migration
      clearing;
    - `check#Readiness`: the rows of design §15 Setup, among them single currency, the WIP and transfer accounts,
      and the paused reminder job;
    - `activate#Accounting`, once per run version.
  - The chart templates (§4; F14): a seeded template organization from Mantle's installed chart, copied by
    `init#PartyAccountingConfiguration`.
- **Screens:** Setup. Home offers it first to an unconfigured organization.
- **Usable when** (§16.3 batch/activation):
  - a new organization's opening trial balance and open items tie before activation;
  - one bad open-item row is named and the rest kept;
  - activating twice posts once;
  - aging, dunning and a payment run work on the imported items.

### P20 — Base-currency posting

- **AC-19** (CX-FX; F19, F20):
  - the invoice and payment auto-post services and `post#AcctgTrans` convert to
    `PartyAcctgPreference.baseCurrencyUomId`;
  - the decimal rate, its date and source are stored on the transaction and the document, and
    `originalCurrencyUomId` and `originalCurrencyAmount` are filled;
  - `post#PaymentApplication` books realized FX to `GatForExGain` or `GatForExLoss`, which get their default
    mappings;
  - the single-currency refusal and its readiness row go.
- **Usable when** (§16.3 invoice-to-cash, currency): a foreign-currency invoice posts at its rate and is paid at
  another, and the difference is booked; the GL summaries hold base currency only; Setup no longer says single
  currency.

### P21 — Finish

- The terminal twins, and the server-static pass.
- The §16.3 access walk: an Accounting user of one group with no other launcher is refused the other groups'
  actions and other organizations' records, through URLs, shared mounts, imports, exports and search.
- The §17 outputs not built earlier.
- The inventories' **Implemented in** columns, the design's Impl column, and Remaining-Work.

## 4. Decisions

These are made before and during the build. Each one that changes the design is also written into
design-accounting.md, or into the owner's design.

| Date | Decision | Notes |
| --- | --- | --- |
| Oct 28, 2026 | Phase order: the ledger and its posting guard first; then settings, receivables, payments, payables, matching, payment runs, banking, collections and credit, close, assets, valuation, tax, budgets, reports, returns, portals, setup and base currency | The user's call. The alternatives were the §16.3 flows first, and tax before invoices |
| Oct 28, 2026 | Accounting builds the parts of other apps' needs it depends on: crosscut CX-ORDER-HOLD (P10); Purchasing's SupplierProfile finance fields (P6); Warehouse's `receive#ReturnItems` (P17); crosscut CX-PORTALS with the PASS Billing and Supplier apps (P18); and the CX-AUTOMATION rule changes of design §1.4, each in the phase of its path. These keep the owner's names, packages and Shared screens. The rest of each need, and the owner's own screens, stay with the owner | The user's call, as Products decided for its own. The alternative was features that wait for their owners |
| Oct 28, 2026 | ProductionCostClose and CostingPolicies are built with Manufacturing's cost events, output receipt and run close. P13 seeds their GL account types and the scrap account, and P19's readiness checks the WIP and transfer accounts | The user's call |
| Oct 28, 2026 | Accounting is built after Products. It adds its context to Products' Supplier360 (P6), Product360 and InventoryValuation (P13), and uses P9's revaluation services and dialogs | The user's call |
| Oct 28, 2026 | The shared screens Accounting builds first carry the Accounting context only. Another app's context is added when that app is built | Follows from the above, as in Products |
| Oct 28, 2026 | The shared rules of impl-drawers-commons §4 apply: parties by role, and changes by effective date and the audit log. Here: SupplierProfile, InvoiceMatchPolicy, FixedAssetClass and BudgetControlPolicy are effective-dated rows with audit-logged key fields; budget amounts are audit-logged and a budget revision is a time; a sent invoice and an approved budget store their PDFs; a budget's other parties are BudgetParty rows. Mantle's existing audit-logged invoice, payment and transaction fields are kept | The user's call, in the Purchasing plan review (impl-purchasing §4) |
| Oct 28, 2026 | `import#Bill` takes a Purchasing buyer's upload as well as AP intake's (P6) | The user's call (impl-purchasing §4, answer 4); design-purchasing §1's AP-intake row was corrected in the Oct 28 design sweep |
| Oct 28, 2026 | The legacy match backfill is Accounting's (P7), run by AP or a buyer with the match group, from either app | The user's call (impl-purchasing §4, answer 5); it settles design-purchasing §18's migration item |
| Oct 28, 2026 | The supplier bill link is Purchasing's PO link, which Accounting adds in P18 with BillUpload (F44); with the move below it is the Supplier app's page for the PO, not a `/po/<token>` route | The user's call (impl-purchasing §4, answer 14) |
| Oct 28, 2026 | Public-facing applications are in mr-pass and internal ones in mr-boss. Accounting's customer and supplier pages are PASS apps: Billing with InvoicePay, and Supplier with BillUpload, which Purchasing P16 extends; not `screen/ServicePortal.xml` and `screen/SupplierPortal.xml` in BOSS. They follow PASS's foundation (§2): public accounts with no UserGroup, Mantle services through the facade for a local or remote authority, PASS invitations, media and request contract | The user's call, Oct 28, in the Customer Service plan review (impl-customer-service §4). It reverses crosscut D5's two BOSS roots; Customer Service's pages are its own PASS app, Support |
| Oct 28, 2026 | The root: `BOSS_ACCOUNTING` as root user group and artifact group. Its groups take `MANTLE_USER_ORG` and `MANTLE_PRIVATE_CONTACT`, and `BOSS_ACCOUNTING_ADMIN`, with all authz on the root, `MANTLE_ACTIVE_ORG` and `MANTLE_PRIVATE_CONTACT` (impl-drawers-commons §4). `AccessServices` checks every supplied organization and record. The records no filter covers (F5) are read only through services that check their parent's organization, and `GlAccount` stays global (F14) | The user's call (§5 review), for every BOSS root |
| Oct 28, 2026 | Each Mantle rule change is adopted by its own flag, off by default, so plain Mantle and its flow specs keep their behavior (F27). A flag lives with its owner's settings: Accounting's (D2's receipt billing, D3's pack invoice, D11's return settlement, D18's base-currency refusal, the hold guards) are audit-logged fields of `PartyAcctgPreference`, inherited as its other fields are; another app's are fields of its effective-dated policy rows (WarehousePolicy's expiry gate, ProductionPolicy's approver rule, the buying policy's approval gate, Customer Service's ServicePolicy). The names are neutral, since Mantle stands without BOSS (the Q2 row below). BOSS's demo organization turns them on; the organizations Mantle's specs use leave them off | The user's call (§5 review). The alternatives were one adoption flag on PartyAcctgPreference, and one PartySetting type |
| Oct 28, 2026 | A posting-guard failure is split by source (F9, F10). A finance user's direct post (a manual entry, an invoice or payment post, a batch line) is refused with the reason. An automatic post from an operational event (a receipt, issue, shipment or production fact) goes to the error journal with the failed guard named; Accounting's MissingMappings and error-journal list and Today show it, and P11's close refuses a period that still holds one. An auto-poster that finds no account records a failure, not `AtrSuccess` | The user's call (§5 review). Design §15: a missing map blocks and is named, never a silent suspense. The alternatives were always refusing and always the error journal |
| Oct 28, 2026 | CX-POSTING keeps one Mantle operation record, keyed by `operationKey`, with the operation type, organization, user, time, request hash, preview version, status and links to the records it made or posted (F8). Each posting service checks and writes it in the posting's transaction: a retry with the same hash returns the stored result, and a different request under the same key is refused. Products' `ProductCatalogOperation` stays as built, for its resumable batches | The user's call (§5 review); a fact with an identity of its own under the shared rule. The alternative was an `operationKey` field on each target record. Warehouse, Manufacturing, Purchasing and Customer Service use the same record |
| Oct 28, 2026 | Lock scopes go by the transaction's source document. Sales: transactions whose invoice the organization issued (sales invoices, customer credits and returns, their adjustments). Purchases: those whose invoice it received. Tax: any transaction with an entry on a `GatTax` account, and `AttTaxDue` and `AttTaxInvoice`. All: every transaction, so payments, stock, depreciation and manual entries fall under it only. A hard lock takes no exception, and `TimePeriod.isClosed` still applies | The user's call (§5 review). Odoo's company lock dates, whose sale and purchase dates cover only those journals. The alternatives were an editable map of AcctgTrans types, and payments in the sales and purchase scopes |
| Oct 28, 2026 | Reports read closed periods' GL summary rows, which P11's close computes and stores, creating any that are missing (F16); open periods are summed from posted AcctgTransEntry rows at read time. `realTimeGlSummary` stays as each organization has it, and no report depends on it | The user's call (§5 review). The alternatives were requiring live summaries, which lock summary rows on each post, and recalculating before each report |
| Oct 28, 2026 | Exchange rates: P3 has manual dated UomConversion rates with a CSV import, each marked with its source. P20 builds `mantle.ledger.CurrencyServices.refresh#Rates` as a provider interface, a service name in a `PartyAcctgPreference` field, with the European Central Bank's daily reference rates as the shipped provider (free, no key; cross rates through EUR). A fetch proposes rates that a finance user accepts before they are active (AC-16) | The user's call (§5 review). Until P20 every document is in the base currency (D18). The alternatives were manual rates only, and the fetch at P3 |
| Oct 28, 2026 | Self-approval (design §1.1): one audit-logged `PartyAcctgPreference` field, off by default, which only `ACCOUNTING_ADMIN` sets (P1 grants it to `BOSS_ACCOUNTING_ADMIN`). It covers every Accounting approval (bills, invoices, journal entries, payment runs, write-offs), and a decision whose approver drafted the record is stamped self-approved, for the audit and the approvals report | The user's call (§5 review), as Products decided for estimates. The alternatives were a setting per document type, and none |
| Oct 28, 2026 | The payable hold guard is inside Mantle, at the one point where a payment is applied to a payable invoice, behind the hold flag. `PaymentApplyForInvoice` and `InvoiceApplyForPayments` catch its refusal and leave the payment unapplied with a named exception; `apply#Settlement`, `create#InvoicePayment`, `apply#InvoicePayment` and P8's runs meet the same check | The user's call (§5 review). Mantle reads its own InvoiceHold and never calls BOSS. The alternative was BOSS adapters with the SECAs conditioned, which leaves direct Mantle callers unguarded |
| Oct 28, 2026 | An app's Approvals list filters Commons Notifications by the approval topics it owns, passed by its mount; `get#UserNotifications` takes a list of topics (F43). Commons' own app chips stay. Purchasing (P4) and Customer Service (P9) mount theirs the same way | The user's call (§5 review). A bill approval stays in Accounting's list whichever app sent it. The alternative was the `appName` filter |
| Oct 28, 2026 | Payment terms (P8): `SettlementTermLine` (sequence, portion percent, days basis, discount percent, discount days) as effective-dated rows with audit-logged fields, saved through `store#SettlementTerm`; a per-invoice `InvoiceDueSchedule` (due date, amount, discount date, discount amount) written at issue, the invoice's own audit-logged rows, so a later term change never alters an issued invoice. Aging, PayablesWorkbench, PaymentRunDetail and `apply#Settlement` read it, and a discount taken within its date posts to the discount account, for customer receipts and supplier payments | The user's call (§5 review): design §20's recommendation, with dated rows in place of its versions. The alternatives were a single discount on SettlementTerm, and due terms only |
| Oct 28, 2026 | Accounting builds project cost posting (P11; F45): `post#WorkEffortCost` reclasses a project's approved time at the entry's cost rate, debiting project cost and crediting a labor clearing account (both GL account types seeded, mapped in PostingDefaults), with the project on the transaction. It runs on timesheet approval behind its own flag, keyed by time entry on the operation record, and posts a dated reversing delta when the approval is undone or the entry changes. Production time is excluded, since Manufacturing's labor events post it (D12) | The user's call (§5 review). impl-projects §7 handed it to Accounting. The alternative was §7, with the People app's payroll; payroll then credits the clearing account rather than wage expense, which the organization's setup decides |
| Oct 28, 2026 | Product360's Accounting context gains a GL mappings pane over `ProductGlAccount` and `ProductCategoryGlAccount` (P13), organization-scoped and edited by finance admin; PostingDefaults stays the bulk editor, and the Products context does not show it | The user's call (§5 review): design §20's recommendation. It is in crosscut §3.5 since the Oct 28 design sweep. The alternative was PostingDefaults only |
| Oct 28, 2026 | The pack invoice (F25), behind D3's flag: the pack SECA creates the sales invoice InvoiceInProcess, without applying payments, and a ShipShipped SECA finalizes it (posting it, applying captured payments and sending it). Between pack and ship, Warehouse's Reopen package and put-back and Customer Service's `apply#OrderChange` call `release#ShipmentDraftInvoice` as D3 designs; after ship, changes go through returns and credit memos. With the flag off Mantle finalizes at pack as before, so OrderToCashBasicFlow passes unchanged | The user's call (§5 review). Revenue and receivable then come at shipment. The alternative was finalizing at pack and building InvoiceCorrection for every change after it. Design-accounting §14 (D3) and crosscut §3.8 were corrected in the Oct 28 design sweep; Warehouse P12 and Customer Service P10 follow |
| Oct 28, 2026 | Chart templates (P19; F14) are seeded template organizations on Mantle's one global chart: a Party with no transactions, holding its account links, type defaults and mappings, copied into a new organization by Mantle's `init#PartyAccountingConfiguration` (`sourcePartyId`). The first release ships one template, from Mantle's installed chart; country charts whose codes conflict are §7's country packs | The user's call (§5 review), Mantle's existing setup copy. The alternatives were template records applied by a BOSS service, and account codes unique per organization |
| Oct 28, 2026 | Two apps by owner and audience, Billing for customers and Supplier for suppliers, rather than one customer app with Customer Service's Support | The plan's choice: P18 comes before Customer Service, and PASS shares accounts and navigation across a site's apps (design-forum §13.1) |
| Oct 28, 2026 | Mantle stands without BOSS, and business logic leans to Mantle. mr-mantle has no dependency on mr-boss: no Mantle service, SECA, EECA, script, data file or spec calls `ironstone.*`, reads a BOSS screen, entity or setting, or names a BOSS group; Mantle checks Moqui permissions, which BOSS grants its groups. Logic not specific to one screen goes in Mantle, in the package of its records, and an `ironstone.accounting` service keeps the capability check, a screen's reads, shapes and saved views, the settings forms and the call to Mantle (§2). So Accounting's services move: to `mantle.ledger` the close and locks, journals, setup, period runs, rates, the production cost close, and the asset books beside Products P9's revaluation; to `mantle.account` invoice states, sending, batches, intake, holds and terms (InvoiceServices), settlement, payment states, transfers, deposits and refunds (PaymentServices), statement import and reconciliation (ReconciliationServices), and the new InvoiceMatchServices, PaymentRunServices, CreditServices, CollectionServices and RecurringInvoiceServices; to `mantle.other` tax and budgets; to `mantle.order.ReturnServices` the return settlement; to `mantle.party.SupplierServices` the supplier profile; and the report runs to Mantle's ledger, inventory and sales report files. BOSS keeps AccessServices, HomeServices, DocumentServices, ReportServices' catalog and shapes, and the list reads (`find#BillExceptions`, `find#Runs`, `find#Work` and the like). P1 grants Accounting's groups the new `RECEIVABLE_EDIT`, `PAYABLE_EDIT`, `PAYABLE_IMPORT`, `INVOICE_HOLD`, `INVOICE_HOLD_RELEASE`, `INVOICE_MATCH`, `PAYMENT_EDIT`, `BANK_RECONCILE`, `PAYMENT_RUN_APPROVE`, `FISCAL_CLOSE`, `CREDIT_HOLD_RELEASE`, `CUSTOMER_CREDIT_VIEW`, `TAX_STATEMENT_EDIT`, `BUDGET_EDIT`, `BUDGET_OVERRIDE`, `RETURN_CREDIT_APPROVE`, `PRODUCTION_COST_POST`, `SUPPLIER_TERMS_EDIT` and `ACCOUNTING_ADMIN`, with Mantle's `INVOICE_APPROVE` and `FISCAL_REOPEN` and Products' `ACCOUNTING_VIEW`, `ACCOUNTING_GL_POST` and `PRODUCT_COST_VIEW`, and `RECEIVABLE_EDIT` to `BOSS_PROJECT_MANAGER` for Projects' Billing; none gets `GL_POST_CLOSED` | The user's call (plan review Q2): a hard rule for every app, in impl-drawers-commons §4. It replaces §2's guarded `ironstone.accounting` adapters. The owner designs' names follow in the design sweep |
| Oct 28, 2026 | Revaluation changes forward cost (AC-07, built by Products P9; used in P13). `mantle.ledger.AssetBookServices.post#Revaluation`, a new Mantle service behind its own flag (`PartyAcctgPreference.inventoryRevaluationEnabled`), off by default and tested in both states, sets `Asset.acquireCost` on the on-hand assets from the effective date, without reposting history, splitting a partly issued asset. It posts one AcctgTrans for on-hand × delta, with asset links, against the seeded offset type `GatInventoryRevaluation`, which P3's PostingDefaults maps. It refuses negative on-hand, a date before the product's last posted movement and a future date, and never calls `update#ProductAcquireCost`. Later issues then post at the new cost, and P13's valuation and inventory account agree after a revaluation | The user's call (plan review Q7), as ERPNext and Odoo do. It replaces "value only", which stranded the amount in the inventory account; design-accounting's AC-07 follows in the design sweep |

## 5. Open questions

| Question | Decides | Notes |
| --- | --- | --- |
| Further issues discovered during implementation | the affected phase | Record findings and decisions here; the open questions of the plan as written are decided in §4 |

The design's other §20 items are `later` there and in §7.

## 6. Findings

Design assumptions found wrong or unstated in the code, with the resolution. Where a resolution changes the
design, it is written there too.

| # | Finding | Resolution |
| --- | --- | --- |
| F1 | P0: `screen/Accounting/` has nine placeholders: Home, Receivables, Payables, Banking, GeneralLedger, Tax, Budgets, Reports and Settings. There are no Payments, PeriodClose, FixedAssets, Inventory, Records or Approvals areas, and the root has no `<shell-providers>`. The `BOSS_ACCOUNTING` authz is in BossSetupData's commented not-yet-implemented block | P1 |
| F2 | P0: `Shared/InvoiceDetail` and `Shared/OrderDetail` are mounted by Projects only and do not branch on `appRoot`. InvoiceDetail's `invoices` transition, its print and PDF URLs and its email attachment name Projects' screens. Projects' `update#InvoiceStatus` covers client invoices only; its `send#Invoice` approves a draft, sends the `BOSS_PROJECT_INVOICE` template with the PDF and marks the invoice Sent | P4 adds the context on `Shared/RequestDetail`'s pattern and a shared invoice print; Projects' services call Accounting's |
| F3 | P0: AppStructure's non-placeholder list is fixed at Commons, Comms, Insights and Projects, and its placeholder floor is 97 | P1 adds Accounting and lowers the floor |
| F4 | P0: BOSS has no Customer360, Supplier360, ShipmentDetail, ReturnDetail, EquipmentDetail, Product360, InventoryValuation or Approvals screen. Products builds Product360 (its P2), Supplier360 (P6) and InventoryValuation's two dialogs (P9) | Accounting builds the rest with its context (§2); it extends Products' |
| F5 | P0: `MANTLE_USER_ORG` and `MANTLE_ACTIVE_ORG` filter Invoice and Payment (from or to party), AcctgTrans and FinancialAccount (organization), TimePeriod, ReturnHeader, Shipment and OrderPart. Nothing filters InvoiceItem, PaymentApplication, AcctgTransEntry, GlAccount, GlAccountOrganization, PaymentMethod, PaymentMethodTrans, Budget, TaxStatement or Asset | Those are read through services that check the organization (§2); the root's filters are the organization filters (§4) |
| F6 | P0: Mantle's ledger report services check no access. `get#GlAccountClassReportInfo` filters by period only, not by organization; `get#SalesTopProduct` and `get#InvoicesByCustomerClass` take no organization; the ledger reports are on Mantle REST | P1 grants no REST ledger path; P16's report runs in Mantle check the organization and its periods |
| F7 | P0: the demo runs `init#PartyAccountingConfiguration` for `ORG_ZIZI_CORP` (with `realTimeGlSummary=Y`); `ORG_ZIZI_RETAIL` has no preference of its own and inherits through its rollup. Periods exist only for the load year and the next, and no accounting transactions are seeded | P1's demo data builds on it and runs its postings through a demo service |
| F8 | P0: the framework has no operation-key helper (only AgentRun's `clientRequestId`); payments have no idempotency key, `paymentRefNum` is not unique, and `create#InvoicePayment`'s only duplicate guard is a covered total | One operation record (§4); P5 is the first heavy user |
| F9 | P0: `post#AcctgTrans` checks the balance, `disallowPosting`, the scheduled date and every fiscal period of the date for `isClosed` (bypassed by `forcePost` with `GL_POST_CLOSED`), and diverts failures to the error journal. It checks no organization, currency or lock date, and `verifyOnly` already moves a failed transaction to the error journal | P2a adds the guard and fixes `verifyOnly`; no BOSS group gets `GL_POST_CLOSED`; a failure is refused or goes to the error journal by its source (§4) |
| F10 | P0: an auto-poster that finds no GL account sets the error journal itself, without calling `post#AcctgTrans`, and still records `AtrSuccess` on a stock movement | P3's MissingMappings and P11's checklist list the error-journal transactions; P13 lists the movements |
| F11 | P0: `update#AcctgTransPosted` checks nothing and can change a posted transaction's organization or type. `unpost#AcctgTrans` and every `repost#*` (invoices, payments, receipts, issuances, variances, assets) unpost and hard-delete the posted transaction, so each fails in a closed period. `AssetIssuanceGlRePost` runs on any AssetIssuance update | No BOSS group is granted them (P1); P2a's `update#PostedMetadata` and `repost#AssetIssuance` delta |
| F12 | P0: `post#ReverseAcctgTrans` keeps the original's transaction date, and marks the original reversed even when the reversal lands in the error journal | P2a adds a reversal date (Mantle's default unchanged) and marks only a posted reversal |
| F13 | P0: `check#NextFiscalTimePeriods` assumes a calendar fiscal year; `fiscalYearStartMonth` and `fiscalYearStartDay` are read nowhere. `get#OrganizationFiscalTimePeriods` creates periods when it finds none | P2a follows the organization's start; P19's Setup sets it |
| F14 | P0: GlAccount is global, with a unique digits-only `accountCode`. `GlAccountOrganization` has no dates or active flag. `set#GlAccountFlags` always overwrites `isDebit` and `isTemporary` | P2a adds the dates; chart templates are template organizations (§4, P19) |
| F15 | P0: `AcctgTransEntry` has `productId` and `assetId` but no facility or cost centre; `AcctgTrans.workEffortId` is never set by an auto-poster; the `COST_CENTER` GL account category type exists and is unused | P2b and P6 add the dimensions; the cost centre stays a Party (design AC-22) |
| F16 | P0: `GlAccountOrgTimePeriod` has no currency and is kept live only with `realTimeGlSummary=Y`; `recalculate#GlAccountOrgTimePeriodAmounts` fixes existing rows and creates none | Closed periods' rows and open periods' live sums (§4); P20 keeps one currency per summary |
| F17 | P0: `post#GlJournal` returns on a raised error, but a transaction diverted to the error journal raises none and is counted as posted, and `closeJournal` marks the journal posted regardless. The design says it stops at the first error | P2b's `post#Batch`; design §8 JournalBatches corrected |
| F18 | P0: there is no guarded invoice transition. Status changes are `update#Invoice` against the status flows, with `INVOICE_APPROVE` enforced by the framework; `unapply#PaymentApplication` changes an invoice's status by a direct update | P4's `mantle.account.InvoiceServices.change#InvoiceState`; unapply runs through it |
| F19 | P0: Mantle converts no currency. Every poster writes the document's currency as the transaction's, the GL summaries add currencies together, the original and local currency fields are never filled, `post#PaymentApplication` books no FX, and `GatForExGain` and `GatForExLoss` exist with no default mapping. `get#ReceivableStatementInfo` mixes currencies | P4's refusal (D18), statements by currency; P20 |
| F20 | P0: `moqui.basic.UomConversion.conversionFactor` is a float; no currency rates are seeded and Mantle reads none | P3's Currencies; P20 stores the decimal rate on the document and the transaction |
| F21 | P0: `send#InvoiceStoreEmail` needs a ProductStore and its email template, returns silently without one, and sets the invoice Sent | P4's `send#Invoice` |
| F22 | P0: `create#InvoiceCreditMemo` makes one reversed-party item, not linked to the original or applied to it; `reverse#Invoice` refuses an invoice with applications | P4 links and applies the credit memo |
| F23 | P0: Mantle's write-off status is reached only from Payment Received, which a SECA refuses while anything is unpaid; there is no payable write-off | P5's write-off is a posted adjustment to its account |
| F24 | P0: `autoApply#Payment` and `autoApplyTo#Invoice` are empty stubs (Remaining-Work lists the first) | P5 implements `autoApply#Payment` |
| F25 | P0: the pack SECA calls `create#SalesShipmentInvoices` with `applyPayments` defaulting to true, which finalizes the invoice, and so posts it, at pack. D3's `release#ShipmentDraftInvoice` assumes it is still in process | Behind D3's flag the invoice is finalized at ship (§4, P17) |
| F26 | P0: `create#PurchaseShipmentInvoices` bills each receipt's accepted quantity, then a leftover line with no asset for what was shipped and not accepted, and every non-product order line in full on the first shipment's invoice. It has no `acceptedOnly` | P6 adds `acceptedOnly` |
| F27 | P0: Mantle's flow specs assert the behaviors D2, D3 and D11 change: OrderProcureToPayBasicFlow the SECA's purchase invoice with its freight line, OrderToCashBasicFlow the pack invoice paid, ReturnToResponseBasicFlow the responses. Six specs assert posted amounts | Each change sits behind its own flag, off by default (§2, §4); the specs pass unchanged |
| F28 | P0: the due date is set by the `InvoiceSetDueDate` EECA: the invoice's term, else the newest agreement term, else PartyAcctgPreference's for a receivable only | P6 adds SupplierProfile's term for a bill |
| F29 | P0: there is no SupplierProfile, no OrderHoldReason (OrderHold is only an order status) and no external access capability; the nearest are the unsubscribe tokens and the forum's access grants | P6, P10 and P18, under the owners' names (§4) |
| F30 | P0: `update#BankAccount` copies a non-internal owner's bank account to a new payment method and expires the old one | P8's approval void keys on the supplier |
| F31 | P0: there is no internal-transfer payment type; `Payment.toPaymentMethodId` exists | P5 seeds `PtInternalTransfer` |
| F32 | P0: `import#NachaReturn` sets a delivered payment Declined; nothing reverses its posting or unapplies it | P8 |
| F33 | P0: BAI2 has no transaction id, so `upload#BaiVersion2` numbers lines from a sequence and a re-import duplicates them; OFX skips a known FIT id. `PaymentMethodTrans` has no currency or statement id. `match#PaymentMethodTransUnmatched` takes the first match. `GlReconciliation` is used by no service | P9's line identity, sessions and rules; GlReconciliation stays out (design §18.2) |
| F34 | P0: `check#OrderPreApprove` answers `approveWarnings`, which a post SECA can add to; `autoApprove#Order` approves only with no warnings and payments covering the total | P10 as designed |
| F35 | P0: `process#ReturnItemResponses` returns without responding for a purchase return (customer is an internal organization). `ReturnApprovedProcess` runs it at approval for immediate-response items. `ReturnItemBilling.assetReceiptId` is never filled | P17: the supplier branch is new code; settlement fills the receipt |
| F36 | P0: `InvoiceAgingSummary` buckets against today, with no as-of date. Its H2 expression has the opposite sign of the others, a 121-day-old invoice falls in no bucket, and its role joins can multiply sums | P10's `run#Aging` takes the as-of date; the view is fixed in Mantle |
| F37 | P0: `close#FinancialTimePeriod` counts every organization's unposted transactions and creates no closing entries; `create#PeriodCloseAcctgTrans` takes the first NET_INCOME account of the chart; `reopen#FinancialTimePeriod` ignores a closed parent | P11 |
| F38 | P0: depreciation needs a type, cost, acquired date and expected end of life; useful life is whole years between the dates; units of production is a TODO; `post#FixedAssetDepreciation` writes the depreciation row and accumulated amount even when the transaction went to the error journal; `calculateAndPost#AllFixedAssetDepreciations` dates a day early. Asset classes are an enumeration | P12 |
| F39 | P0: `update#AssetAcquireCost` calls `repost#Asset`, which deletes and re-posts every receipt, issuance and variance transaction of the asset and fails in a closed period; `update#ProductAcquireCost` loops it | Finance-admin data repair only, in an open period (P12, P13) |
| F40 | P0: `AssetValuationSummary` values on-hand quantity at each asset's current cost, not from the GL. A zero-cost receipt posts zero. `cogsMethodEnumId` is read by no service: posting is always actual cost. There is no scrap account. An issuance to a work effort another party owns posts to COGS | P13 sets the valuation beside the accounts and lists the exceptions; P3 shows the COGS method as it is; design §10 and §18.2 corrected |
| F41 | P0: `TaxAuthorityRate` is commented out, its relationship keyed by a composite that is not TaxAuthority's key. `calculate#SalesTaxLocal` only logs; `calculate#InvoiceSalesTax` is empty. Tax lines post through `ItemTypeGlAccount`; `TaxAuthorityGlAccount` is unused. `ItemVatTax` is not left out of totals. The 1099 selection is by invoice date over 600, with no eligibility flag | P14 |
| F42 | P0: Budget has no organization (its period's party is), and its status type has no items or transitions. Sub-period entry covers twelve periods. `run#BudgetExpenseReport`'s actual is posted debits of expense accounts only; the detail report is invoice-based. No budget service checks status or permission | P15 |
| F43 | P0: approvals are NotificationTopics with approve and refuse services; there is no provider registry. Commons Notifications filters by `appName` | P6's mount, filtered by topic list (§4) |
| F44 | P0: MoquiConf `<token-route>` is generic: a token service answers `valid` and a route context, and the screen gets the token. Crosscut §5 names `/pay` for InvoicePay and no route for bill upload | P18. The customer and supplier links are pages of the PASS apps taking their tokens, not `<token-route>`s (§4); the bill link is the PO's (§4) |
| F45 | P0: impl-projects §7 hands project cost posting (`post#WorkEffortCost`, an empty stub) and a link to Mantle budgets to Accounting; design-accounting names neither | P11 builds the posting (§4); the budget link is §7 |
| F46 | P0: Projects' invoices check no currency (impl-projects F91), and its approve finalizes and posts | P4's `change#InvoiceState` applies D18 to them too |
| F47 | P0, Products' state: Products P9 (mr-mantle 5a18970e, mr-boss 2a4abd6) built parts this plan proposes. `mantle.ledger.transaction.PostingOperation` is §4's CX-POSTING record (key, type, organization, user, request hash, preview fingerprint, status, result). `mantle.product.asset.AssetBookEvent` is create-only, with ledger and reversal links. `mantle.ledger.AssetBookServices` holds the revaluation, behind `PartyAcctgPreference.inventoryRevaluationEnabled`, posting `AttInventoryRevaluation` against `GatInventoryRevaluation`, read from `GlAccountTypeDefault` and mapped only for `ORG_ZIZI_SERVICES` in BOSS's Products demo. BOSS's `ironstone.accounting.AssetBookServices` passes its four services through to Mantle's, and InventoryValuation's dialogs call those | P2a and P5 post through PostingOperation; P12 adds its event types to AssetBookEvent and its services to AssetBookServices; P3 maps the offset type for Accounting's demo organization. The dialogs call Mantle directly, and BOSS keeps only `get#RevaluationContext` (Products' fix) |

| F48 | P0 Oct 29: `mantle.rest.xml` exposes invoice and payment create/update/apply/cancel/gateway operations and GL create/update/delete/post/reverse/period mutators. Accounting root authorization does not grant the REST screen. | AccountingAccess exercises REST with authorization enabled; no Accounting REST grant is added. |
| F49 | P0 Oct 29: `MantleInvoice` exists in MantleDocumentData; payment, GL account and accounting transaction documents do not. | P1 adds the three documents and access-checked palette sources. Global accounts are visible only through an authorized organization's assignment. |
| F50 | P0 Oct 29: there is no inspection quantity model or source-inspection service in Mantle. | P7 must not invent a successful zero-inspection result: CX-QUALITY is a future owner contract, with received/accepted quantity as existing evidence and an explicit unavailable inspection check. |
| F51 | P0 Oct 29: AccountConfigData installs TEST_APPROVE and TEST_DECLINE; PaymentTestServices also has card/expiry/NSF failures, but no durable pending-provider fixture. | P18 adds a deterministic pending/completion fixture; no gateway runtime change in P0–P3. |
| F52 | P0 Oct 29: PublicSiteApp has targetId, but Forum's mount writer accepts only forum/account/members/sites and does not persist targetId. Readiness and URL builders are Forum-specific. PASS uses Schema/Routes and Mantle PassRoutes allowlists; invitations bind a verified recipient, not employee groups. Media is staged/scanned before record finalization. | P18 adds Billing/Supplier mounts, typed organization targets, operation schemas, readiness, record finalizers and canonical page URL builders; its contract is recorded in mr-pass/design-forum. |
| F53 | P0 Oct 29: Pass.xml has form-action self and frame-ancestors none. Hosted gateway form posts therefore need a reviewed provider-specific policy; return URLs must remain local validated paths. | P18 retains the CSP by default and tests hosted redirect, pending and decline paths without arbitrary return URLs. |
| F54 | P0 Oct 29: Products' Product360, Supplier360, standard costs, PostingOperation and native forward revaluation exist. Its old BOSS AssetBook wrappers still exist in this checkout. | Reuse native operations and the shared posting record; extend the Accounting contexts in their assigned later phases. |
| F55 | P0 Oct 29: move#AcctgTransEntry refuses drafts and creates a correction transaction for posted entries. | P2 adds move#DraftLine; the draft editor must not expose the posted adjustment primitive. |

| F56 | P2: PostingOperation keys are existing 40-character identifiers. | Reviewed external keys are bounded at 40; derived batch/source identities use deterministic hashes that fit the existing record. No parallel operation table was introduced. |
| F57 | P2: invoice/payment missing-mapping branches bypassed post#AcctgTrans; operational posters could set AtrSuccess without a posted transaction. | Adopted direct financial posts refuse missing mappings atomically. Adopted stock/financial-account sources retain the unposted error journal and AtrPostingFailed, with a stable failure code. Legacy defaults remain unchanged. |
| F58 | P3: invoice item enums use ItemType; variance reasons use InventoryVarianceReason. Product invoice mapping resolves category before product, then asset-type and item defaults. | Server choices and mapping-precedence text use the installed native contracts; missing item defaults are checked through get#InvoiceItemGlAccount. |
| F59 | P3: PaymentGatewayConfig is global and contains executable service names. | PaymentGatewayOrganization is an audited external provisioning boundary. Finance returns only active organization-permitted gateway IDs/descriptions, and no credentials or executable fields. Existing method identifiers remain masked. |
| F60 | P3 browser verification: the remote choice widget discarded loaded options when a parent form rerendered its empty seed array, then cleared a selection outside the first search page. | The existing widget preserves the loaded selection across renders/search pages; a changed dependency still clears it. QvtKeys and the Accounting mapping-repair walk exercise the contract. |

| F61 | Review Oct 29: Home's and the Settings screens' Choose organization form posted to `selectOrganization`, which no screen had: a `transition-include` copies one named transition, and only `choices` was included | Each screen includes both; AccountingShell posts the picker on Home and Settings |
| F62 | Review: deleting a draft went back to JournalEntries with the deleted id, which the list declared as a parameter and filtered by, so the list was empty | The list declares only what it reads; a spec checks the response's Location |
| F63 | Review: Accounting's choices searched case-sensitively, ignored the term for journals, batches, templates, locks, periods, users and groups, and filtered in JavaScript after `limit`; the `parties` choice called `makeCondition(field, value)`, which this framework reads as field and operator, so the new-document Customer/Supplier drop-down always failed; Mantle's list search matched only ids | `choices` is a table of sources searching their names in the query, ignoring case; Mantle's `query` matches names and descriptions. A spec calls every choice with a selected value outside the page |
| F64 | Review: the palette's record links checked BOSS group names; finance reads were "holds any finance permission", so Projects' managers, who hold `RECEIVABLE_EDIT` to bill, could read receivables and payments | Mantle seeds `RECEIVABLE_VIEW`, `PAYABLE_VIEW` and `PAYMENT_VIEW`; a kind reads from its view permission or `ACCOUNTING_VIEW`, an edit permission alone opens nothing, and BOSS grants the views to AR, AP, treasury and admin. The palette uses the permission-derived capability. Specs in both repositories (decided with the user) |
| F65 | Review: AccountDetail overwrote the report's account filter with its own account, and the GeneralLedger report's links dropped it | Report links carry the report's options; AccountDetail's account is `recordId` |
| F66 | Review: JournalEntryDetail and AccountDetail read their record in `always-actions`, which run for every `choices` request, and failed the page for a missing record; Publish showed on a published template; a batch could be posted without its review; row dialogs had fixed ids | Records are read in `actions` with a Not available state; actions follow state; posting is from the review only; row dialog ids carry the row key |
| F67 | Review: AccountingControls' "opt-in issuance adjustments" built its hard lock date with `toISOString()`, a UTC day, so it locked today from evening on in the Americas and failed (reproduced at the committed code) | The date is formatted in the user's zone |
| F68 | Review: a widget that fails renders its error into the output, not `errorMessages`, so the status-only Accounting specs passed broken pages; negative access helpers counted any error, including validation errors, as a refusal; a "reader sees no New batch" check named a button that did not exist | Specs check rendered text and render errors, pair negative cases with positive ones, and check controls present for the users who have them |
| F69 | Review: the screens copied a 12-parameter block and 7-parameter responses, faked one page with about 60 hand-set page fields, duplicated invoice/bill/payment screens and PostingDefaults' Add and Edit forms, and loaded `Accounting.js` to format dates | `template/AccountingParts.xml` and `AccountingDocuments.xml`; services page their lists and return display text (`AccountingPolicy.display`), party and status names |
| F70 | Review: the BOSS Accounting scripts and specs used Prettier's defaults rather than the documented style, and the screens a different XML formatter and a one-line license header | Reformatted; `.prettierrc.json` at the mr-moqui root; full headers restored |
| F71 | P4: the installed generic `ItemSales` mapping points to a non-postable summary account; using it in the finalized demo caused the whole demo data file to roll back | Demo and consulting walks use the valid `ItemTimeEntry` mapping. P19 readiness must identify non-postable mappings explicitly; no global chart remapping is assumed |
| F72 | P4: legacy customer credits reverse the parties, which made them appear payable and selected purchase-side expense accounts | Native guarded credits retain their financial side and original source account allocations; common lists, links and posting lock scopes use that side |
| F73 | P4: an invoice timestamp near midnight displayed as different days to its creator and approver, changing the typed lock day | New invoices capture an audited SQL DATE `accountingDate` from the creator's chosen day. Adopted original postings persist that day; locks, summaries, rebuilds, unpost/repost, trial balance, ledger and issued output agree. A later effective reversal uses its own day. Existing posted legacy rows remain undated and retain their original timestamp semantics |
| F74 | P4: QVT prepares form metadata even when a record's section is hidden; a null invoice context still dereferenced its currency | Detail and shared contexts normalize safe empty maps after computing record availability; unavailable records are covered in QVT and TUI |
| F75 | P4 review: the design names invoice budget links, but this Mantle checkout has no InvoiceItemBudget entity or invoice-line budget keys; PaymentBudgetAllocation links payments only | Invoice Budget details reports unavailable evidence. P15 supplies the invoice commitment model; no fictitious link or financial writer is introduced in P4 |
| F76 | P4 visual review: EntityAuditLog stores new SQL DATE accountingDate changes as epoch text, which the generic invoice History values display without formatting | P21 output finishing formats typed audit date values and status/user labels; source audit evidence remains unchanged |
| F77 | P4 visual review: an unusually long invoice ID makes the 390px HTML print slightly wider than its viewport, and its Description heading can wrap mid-word | P21 output finishing refines narrow-screen print wrapping; the exported PDF and actual monetary values remain correct |
| F78 | P4 review: generic Files removal and resource-only version replacement could mutate an issued archive even when its InvoiceContent row was guarded | Durable PDFs/supporting copies live outside mutable record folders. Native content invariants protect identity/removal and equivalent DbResource aliases before writes; generic Files respects immutable rows and native per-side edit authority |
| F79 | P4 final visual review: Quasar Files list captions and neutral controls inherited light-mode colors in dark mode; a nested conditional spec branch also had bare expressions that did not assert | Shared RecordFiles passes the active theme to its list/item hosts. Actual issued rows pass unchanged text/control contrast thresholds after theme transitions finish. Client isolation branches now explicitly assert their permission and omission checks |
| F80 | P4 repeated walk: legacy sole-store fallback advances an invoice from Finalized to Sent asynchronously after its Send form reads the timestamp | Send submits the already-supported exact financial source fingerprint and selected attachment versions, without its redundant timestamp. Native eligibility, organization and revision checks remain strict; header/item/state writes retain timestamps. Regressions prove status-only advancement succeeds and changed financial fields refuse before durable output or mail |
| F81 | P5a: actor-formatted legacy document dates could allow October settlement against an undated source or target actually posted in November UTC | `AccountingPolicy.postingDay` uses persisted SQL days, otherwise the unchanged UTC ledger timestamp day. Preview evidence and locked confirmation include every original source/target posting day, including adjustment-only targets; earlier settlement refuses. Undated reversals cannot borrow an invoice's earlier SQL day |
| F82 | P5a: legacy/raw application writers can race a reviewed settlement or skip period checks when no extra application GL is needed | Separately adopted `settlementApplicationGuardEnabled` serializes organization/documents/applications/original postings before all application writers, checks balances and dates, and captures currency/day on new adopted rows. Existing history is not backfilled; default-off fields and audit behavior are covered independently |
| F83 | P5a: restoring only part of a receipt already posted directly to its invoice changes open items without a matching GL movement; overstated imported payment amounts can also exceed their actual backing | Direct restoration requires the entire available balance to its actual original invoice with consistent history. Shared signed control proof checks actual original cash against its document; genuinely unapplied cash still permits partial applications. Native and generic writers share the history/control rules |
| F84 | P5a: unpost/reverse/move and raw header/entry writes could invalidate already consumed source backing; a raw delete could disguise a positive stored application with an unsaved zero | Applied sources retain their original postings until unapplied. Raw reversal construction is guarded too. Application identity/dates are immutable, zero reactivation refuses, and deletion locks/rechecks the actual stored row, ignoring unpersisted financial changes |
| F85 | P5a: cached invoice totals and an arbitrary first-200 cutoff lose eligible open items; PostgreSQL does not accept a numeric currency scale in `ROUND` | SQL views aggregate rounded invoice lines and both application sides before filtering/counting/paging. The currency scale is an integer. Four typed lists page independently; selected revisions stay available outside a search page, without silently refreshing reviewed versions |
| F86 | P5a full gates: its original fixture prefix collided with P4; legacy ClientBilling cleanup encountered the newly inherited adoption flag and left Projects data behind; a nested role helper reset callers to system administration | P5 fixture identities are distinct. The legacy projection spec explicitly selects default-off behavior and restores the exact inherited flag in cleanup's `finally`. Nested role helpers restore their calling identity; Treasury's valid negative and AR positive use the same payload |
| F87 | P5a full gate exposed an existing variant-policy timing race: its default effective time was compared against a second, later clock read | `CatalogSettings.storeVariantSettings` captures the clock once and keeps default revisions strictly ordered, matching the catalog-policy writer. Explicit backdated input still refuses without changing policy history |
| F88 | P5a browser correction: saved error parameters for a failed preview form overrode its current computed draft after an adjustment account was corrected; the row and URL were current while both form field sets were stale | The computed-only preview action uses the existing hidden-form POST link with current `workbench.editParameters`. The browser regression inspects the actual submitted hidden draft before review and application; no global editable-form watcher, forced Vue state or reload bypass is used |
| F89 | P5a browser navigation: Back to selection inherited the current preview ID from the destination's declared parameters and rendered the old review again | Selection links explicitly clear retained preview/operation IDs, and Clear selection also clears its draft. Original selected revisions, amounts, account/reason, filters and fixed dates remain retained |
| F90 | P5b1: joined payment views do not retain the authoritative Payment stamp, and cached totals can miss actual applications | Native revisions use the base Payment and authoritative application/posting/method evidence; filtered reads use narrow scoped projections |
| F91 | P5b1: a direct legacy application can share its header invoice with unrelated receipts; reviewed cash corrections still meet the manual-posting gate | Cash-source dependencies retain their own applications. Only exact reviewed state/unapply controllers join the existing PostingGuard validation; an identical Treasury actor's unreviewed Ledger reversal still refuses |
| F92 | P5b1: content metadata alone cannot make issued bytes immutable | Native guards protect DbResource identity, files/history, blob metadata/chunks and immutable output/content links; ordinary supporting files remain mutable |
| F93 | P5b1: drive/search/public tokens and another record's content pointer could expose a private issued archive | Native URI access guards and canonical cross-record filtering protect each path; generic resource search gains optional subtree exclusions before search limits, preserving callers that omit them |
| F94 | P5b1: first archive references and deduplicated blobs can be uncommitted when a raw resource writer checks them | Issuance and existing ancestor/blob/chunk mutation share stable mantle/content locks and fresh reference reads. New unpublished upload identities avoid the suspended-parent ForceNew deadlock. Real races pass; removing the blob lock alone reproduces byte/metadata corruption |
| F95 | P5b1: a commit worker has no interactive actor context, and late publication could reopen a decided validation request | Durable event-bound publication retains the actor, checks each recipient independently, uses stable delivery identities and retires obsolete/decided requests under lock |
| F96 | P5b1: demo-data loading can issue payment documents before normal host PDF installation | The host installs the renderer during factory data loading and drains workers before its guard ends. Host lint/build pass; two host test failures reproduce with the two-line change removed |
| F97 | P5b1 browser: self-dependent dropdowns clear their selected party/method/evidence/application value | Remove all 20 self-dependencies, retain 16 real external dependencies and pass form-scoped initial selections. Browser checks inspect actual selected revision tokens before submission |
| F98 | P5b1 rendered-output proof: an isolated app root cannot resolve mounted shared links; Treasury correctly omits ledger IDs | Real admin/Treasury-owned operations render through the actual mount at the correct standalone level in QVT/TUI/HTML, asserting enabled file identities and separately authorized ledger presence/omission |
| F99 | P5b1 screenshot review: full-page Chromium capture can hide a 15px scrollbar after choosing its clip width and crop the light document's right edge | Final-theme outer/inner/root bounds and viewport companion captures prove actual check fit. Generic full-page capture correction remains tooling work; no further product-layout change is inferred from the cropped artifact |
| F100 | P5b1 browser: a successful draft edit from 21 to 22 left a previous failed delivery form's sourceVersion in session restoration; a new form instance received that old initial value | After successful native store only, the app consumes the prior saved failed-submit values through the existing errorParameters getter. Same-revision reference/reason/evidence remains retained, failed saves stay untouched, own-edit review receives its new revision, and external stale confirmation still refuses |
| F101 | P5b2 legacy provider entry could race first native adoption, including a manual instrument with an explicit configured provider; an outer rollback could otherwise erase the only evidence of old I/O | Durable per-payment admission fences commit before old provider I/O and serialize first adoption. Shipped and configured legacy leaves, wrappers, refund links, order/invoice loops and polling reload stored identity and exclude managed records. Real competing calls, native adoption and caller rollback are covered |
| F102 | P5b2 interstage reads could retain a caller's repeatable-read snapshot, and interrupted lookup replay omitted its claimed attempt version | Orchestrator-only fresh attempt reads join separate committed stages; lookup claim results retain the exact version and summary. Actual outer rollback and concurrent pre-finish lookup replay prove durable result identities |
| F103 | P5b2 credential preparation could validate an ordinary old PaymentMethod read while projecting newer locked bank/card data | Private preparation projects only freshly locked method/subtype rows, compares the hash of those same values to the retained revision, and commits before adapter I/O. Safe adapters explicitly guarantee consumption of this by-value snapshot; lookup retains original identity independently of rotated credentials |
| F104 | P5b2 source checks could miss target-only payments, accept a real APP id with altered links/currency, or inspect only a candidate's replacement source | Common guards inspect stored and candidate payment identities under stable locks, validate all APP links/currency, and preserve positive application identity with flags off. Exact negative proofs include a real initially unmanaged AP-header/adoption race. The held manual-source reparent proof is required before P5b2b enables cash holds |
| F105 | P5b2 full-suite verification exposed legacy fixture cleanup/corruption using raw financial EntityValue/deleteAll writes without a transaction; guarded source locks refused and ClientBilling cleanup left later Projects fixtures behind | Financial fixture mutations use the existing transactional generic services, retaining their original assertions and default-off business behavior. Full BOSS rerun passes 1,161/0/5; standalone Mantle passes 1,139 with only the same four reproduced baseline failures and 17 skips |
| F106 | P5b2 visual review found the phone gateway table scrolling 560 px inside a 359 px container, with the actual provider amount beyond the visible right edge | Mobile identity links wrap, the two columns retain actual amount/currency and separate compact provider/local outcomes, and full reference/code details remain on the exact selected authorized attempt. Per-row geometry checks include amounts and chip content, beyond document-width checks. Gateway reviews also omit the empty generic state-effects grid; real B1 effects still render |
| F107 | P5b2 browser retries exposed data-dependent clicks on wrapped inline attempt IDs: the locator's union-rectangle center can fall between actual text fragments and hit the surrounding form-group | Attempt links have a rectangular block target at every width; tests verify the actual single rectangle and center hit before the unchanged normal click. Generic locator hit-point selection remains test-tooling work; no forced clicks or native financial identity changes are used |

## 7. Later

Designed, not in this build:

- **The design's `later` rows:** AdvancedPeriodRun, Leases, RevenueRecognition, Intercompany and
  ElectronicInvoices, with AC-15, AC-17, and the FX revaluation and deferral parts of AC-16.
- **With Manufacturing:** ProductionCostClose and CostingPolicies: `mantle.ledger.ProductionCostServices`
  (`store#AllocationPolicy`, `ACCOUNTING_ADMIN`; `preview#CostClose`, `ACCOUNTING_GL_POST`; `post#CostClose`,
  `PRODUCTION_COST_POST`), with `ironstone.accounting.ProductionCostServices.find#CostCloseQueue` for Home's queue;
  `ProductionAllocationPolicy`; the ProductionCostReview topic, seeded in Mantle's data, on which Mantle's
  `review#ProductionCosts` notifies Accounting; Accounting's side of the production posting rule (D12); and the
  cost-close part of §16.3 production-to-GL.
- **Other design items:** payment references and the invoice QR block (AC-20); dunning fees and interest;
  percentage distribution across cost centres; the posted-entry hash; inbound direct debit; the country and book packs (cash-basis tax,
  withholding); statement formats beyond BAI2, OFX and CSV (camt.053, then MT940).
- **Other apps' contexts:** Customer Service and Sales on Customer360; Purchasing, Warehouse and Customer Service
  on ReturnDetail; Warehouse on ShipmentDetail, and its `Warehouse/Reports/InventoryValuation` mount;
  Maintenance, Manufacturing and Warehouse on EquipmentDetail; Purchasing on InvoiceMatch.
- **Other apps' callers:**
  - Purchasing: `decide#PurchaseApproval`, `close#PurchaseRemainders` and a request cancel (the budget
    commitments); `apply#PurchaseRevision` (match re-evaluation); `accept#ServiceItem` (service-line matching).
    The drop-ship delivery as match evidence is Purchasing P7's, on Moqui Java's model (impl-purchasing §4).
  - Quality: `get#SourceInspectionStatus` and `dispose#Inspection`.
  - Warehouse: Reopen package and put-back, `ship#SupplierReturn`, `post#Count`.
  - Customer Service: `authorize#Return` and `apply#OrderChange`.
  - Projects: a project's link to a Mantle budget (impl-projects §7). Its cost posting is P11's (§4).
- **The rest of the other apps' needs:** the rest of PUR-SUPPLIER (approval status, risk); CX-RETURNS' policy
  records; CX-QUALITY.

## 8. Verification

- **Per phase,** the "Done" rule of §2 and the phase's "usable when".
- **End to end,** run `./moq run`, sign in as `john.doe` and as each demo finance user, and walk each built
  phase's "usable when" in order.
- **Design §16.3**, walkthrough by phase:

| Walkthrough | Phase |
| --- | --- |
| Procure-to-pay | P6 (intake and holds), P7 (matching), P8 (bank change and payment); the supplier upload in P18 |
| Invoice-to-cash | P4 (invoice and statement), P5 (receipt, credit, write-off, retries), P10 (overdue and credit hold), P17 (package reopened after pack), P20 (currency difference) |
| Return-to-refund | P17 |
| Production-to-GL | P13 (revaluation, and the inventory, WIP and GL tie-out); the cost close in §7, with Manufacturing |
| Bank-to-close | P2 (closed periods), P9 (statements and matches), P11 (close), P12 (depreciation into a closed period) |
| Batch/activation | P8 (supplier payment), P9 (statement row), P10 (notice recipient), P12 (asset depreciation), P19 (activation) |
| Access | `AccountingAccess` in every phase; P18 (customer token); P21 (the full walk) |

- **Screenshots** through the BOSS client spec of §2, light and dark.

### P0 verification — Oct 29, 2026

Source contracts checked against this checkout. Existing AccountingActivities, LedgerMaintenance and PartyTimePeriods: **18/18 passed**, using `./moq test --nobuild mr-mantle --spec LedgerMaintenance,PartyTimePeriods,AccountingActivities` with a disposable database. P1 includes minimal scoped document lists, draft creation and read-only detail routes to fulfill its shell acceptance criteria; complete document workflows remain P4–P5.

### P1 build — Oct 29, 2026

Implemented the complete finance grant matrix and root filters, isolated demo users, permission-derived native
access, scoped lists/search/record links, draft document creation and read-only routes. Home keeps later aggregates
unavailable and names independent health/count failures. The ledger model is additive preparation for P2/P3.
`AccountingShell` exercises every role, palette source and quick-create grant; `AccountingAccess` and
`AccountingIsolation` cover service, REST, export, file and search boundaries, including disabled artifact authz.


### P2 build — Oct 29, 2026

P2a and P2b are implemented: native posting guard, dated reversal and forward adjustment, configured fiscal
calendar, chart/journal/period editors, trial balance/general ledger, independent batch results, immutable template
versions, dimensions and journal files. Reviewed retries recheck authoritative inputs under lock. No closed-period
bypass or unrestricted posted rewrite was granted. Accounting explicitly adopts the new flags on ORG_ZIZI_CORP;
standalone Mantle retains the legacy defaults. Native controls and the original 18-check ledger baseline pass.

### P3 build — Oct 29, 2026

Implemented native preferences, conflict-preview cloning, all mapping kinds, due terms, dated rates/CSV results,
masked payment methods and organization-approved gateway bindings, numbering and approved document previews.
PostingDefaults identifies missing item defaults through the native invoice resolver as well as missing GL types.
Existing chart accounts can be assigned from ChartOfAccounts. Configuration retains posted accounting meaning and
issued document identities. Installment/discount lines, provider refresh and conversion remain P8/P20.

### R — Review of P0–P3 — Oct 29, 2026

A review of the four P0–P3 commits against docs/Practices-App-Dev.md found the bugs and practice gaps F61–F70, fixed
in mr-boss and mr-mantle, and added what they taught to that document. The detail screens have the record header with
one primary action by state and a More menu, a Not available state and chips with tui twins; lists have names,
amounts and states and real pagination; the invoice, bill and payment screens share one template.

Verified Oct 30, 2026: `./moq test mr-boss` 1,065 passed, 5 skipped; standalone `./moq test mr-mantle` 844 passed with
the four baseline failures (InboxThreads, MantleSearch, WorkTimeEntries, WorkTimesheets) and 17 skipped, PDF specs with
Chromium; `test-client mr-boss` AccountingShots (three users, 31 destinations at 390, 1280 and 1440, light and dark),
AccountingLedgerWalk and AccountingSettingsWalk 230 of 230, screenshots looked at; `moqui lint --screens` 125 flagged
sites as before, none in Accounting. The framework's qvt list toolbar now counts an unpaginated list's rows instead of
saying "No results found" (mr-moqui).

Left for later:
- `AccountingPolicy.js` refuses with plain messages; reason codes (`denied(reason, message)`) and the walks' comparison
  by code wait for that conversion. Its formatting (Prettier defaults) is also still to change.
- Chips have qvt and tui texts only, so printed lists show no state.
- An invoice list fills a draft's missing total with one `get#InvoiceTotal` per row (at most a page).
- JournalTemplates turns the amount form's `parameterName_N` fields into a map in its transition.

### P0–P3 integration verification — Oct 29, 2026

See [AccountingImplementation](../docs/AccountingImplementation.md) for native contracts, routes, reproduction
commands, result counts and the baseline comparison. Every implemented XML route renders in QVT and TUI. Browser
coverage includes all 31 destinations at 390/1280/1440 pixels in light/dark, reviewed posting/reversal, and the P3
assignment/mapping/terms/rates/preferences walk. Screenshots were visually inspected. Screen lint writes to a
separate report: zero parse failures and the existing 125 flagged sites, with no new Accounting hazard.

The original AccountingActivities, LedgerMaintenance and PartyTimePeriods remain 18/18 passing. The standalone
runtime excludes BOSS demo adoption settings; BOSS explicitly opts ORG_ZIZI_CORP into the new guard and dimensions.
No ADMIN exemption, closed-period permission or unrestricted rewrite authorization was added. Full standalone
Mantle retains four pre-existing failures reproduced against archived commit b48e696c: InboxThreads, MantleSearch,
WorkTimeEntries and WorkTimesheets. They are unrelated to the new finance controls.

### Remaining-phase baseline

Before P4 changes, the clean component heads were frozen and checked with the existing develop binary and Chromium
on disposable databases. BOSS at `25478b4` reproduced 1,065 passed, zero failed and five skipped. Standalone Mantle at
`f23f8de6` reproduced 844 passed, 17 skipped and exactly the four failures above. The standalone runtime excludes
BOSS data and adoption settings. Subsequent phase results are compared to these baselines.

P4 work is split between native Mantle workflows, BOSS screens and independent review. Shared access, routes,
templates, demo data and test registries are integrated by the coordinator; no later phase starts before P4 passes
its review and acceptance gates. The implementation decisions and verification are recorded when each phase closes.

### P4 build and acceptance

Implemented native guarded invoice states/draft editing, scoped receivables and customer contexts, currency refusal,
linked credits with original revenue allocations, approved-time customer/worker billing, reviewed batches and
currency-separated statement snapshots. Projects retains its labels, BOSS_PROJECT_INVOICE identity, time-detail
print and client restrictions while financial writes use Mantle. The shared invoice/customer mounts include their
record tabs and unavailable states. Current customer aging and latest received payments are included; historical
Aging remains P10. Invoice budget evidence is honestly unavailable until P15 provides its model (F75).

Invoice sends need no store. Authorized sender accounts, frozen PDFs, optional explicitly selected supporting files,
per-recipient outcomes and queued mail identities are retained. Identical retries return stored results; changed
requests and stale file versions refuse. The ordinary store notice skips the manually prepared version. Main PDFs
and supporting copies are outside mutable Records folders; immutable invoice content and path checks prevent
remove, replacement, restore and URI-alias attacks, including with artifact authorization disabled. Ordinary live
supporting files remain versionable/removable without altering sent bytes. Supporting-file selection defaults empty,
including Projects callers.

Each assignment and its returned corrections was independently reviewed before coordinator acceptance. The native
contract was reviewed before dependent app integration. The coordinator owns shared access/posting/calendar code,
Projects adapters, mounts, grants, choices, fixtures, test registries and this record. Screen/service sources were
frozen during browser runs. Compiler and incremental caches were reused; no Node test dependency or Rust rebuild
was introduced.

Verification on disposable databases with Chromium configured as described in the repository's testing guide:

- Full BOSS: **1,110 passed, zero failed, five skipped** (1,115 features), including unchanged Projects/Products,
  AppStructure, TuiRender, rendered content and the shared Files regressions.
- Full standalone Mantle, excluding BOSS adoption data: **903 passed, exactly the four reproduced baseline failures,
  17 skipped** (924 features). All 59 added P4 features pass. The legacy audit sequence/flow fixtures remain unchanged.
- Focused shared Files/access/context regressions: **86 passed, zero failed, one existing optional skip**. Native
  archive/delivery focus: **19/19**.
- Accounting browser coverage includes all P4 destinations, modes and dialogs at 390/1280/1440, light/dark, plus AR,
  approver and reader views. The six invoice-edit cases passed their corrected selector rerun; final affected-route
  and all seven P4 walk checks passed **34/34** after attachment/archive integration. A further **9/9** verified actual
  issued-file rows at all six width/theme variants plus prints. Screenshots were inspected by
  coordinator and independent reviewer. Final review follow-up reran full BOSS and standalone Mantle, all seven walks
  (**7/7**), and Send/issued Files plus prints (**15/15**), including actual dark-row contrast after theme animations.
  The native async-status/source-fingerprint and changed-financial-content regressions pass. Earlier full route
  inventories plus the affected reruns cover unchanged
  ledger/settings walks and all new forms; no browser failure remains unresolved.
- XML schemas/parsing and formatting checked. Separate screen lint report: **zero parse failures, 121 existing flagged
  sites**, identical to the frozen baseline under the same compiler; no new lint site.

Implementation commits: `876732f6` (mr-mantle) and `b933118` (mr-boss). Accepted review follow-ups:
`93e8fed3` (mr-mantle delivery regressions) and `907a816` (mr-boss Send/Files and executable isolation checks).
P5–P21 remain subsequent deliveries; none is represented as implemented by this P4 acceptance.

### P5 assignment contracts

Reviewed before implementation by the coordinator, native author, app author and independent reviewer. P5a delivers
settlement first; P5b delivers payment lifecycle/gateway/refund/transfer controls after P5a acceptance. Later-phase
holds, due schedules and historical Aging remain P6/P8/P10 respectively.

| Owner | P5a owned files and responsibility |
| --- | --- |
| Native author | `entity/PaymentWorkflowEntities.xml`, `service/mantle/account/PaymentSettlement.js`, payment-specific `PaymentWorkflow.js`, new declarations and auto-apply dispatch in `PaymentServices.xml`; standalone `AccountingSettlementFixtures.js`, `AccountingSettlement.spec.js`, `AccountingSettlementConcurrency.spec.js` |
| App author | `Receivables/ReceivablesWorkbench.xml`, `SettlementScreenServices.xml`, `Settlements.js`, `AccountingSettlement.spec.js` and `client/AccountingSettlementWalk.spec.js`; draft decoding and presentation only |
| Reviewer | Independent contract/diff review, success/refusal/rollback traces, targeted reruns and rendered/screenshot review; central registry edits only when expressly assigned |
| Coordinator | Existing authorization/operation/posting helpers, `PostingGuard.js`, legacy posting/SECA integrations, shared mounts/templates/menus, choices, grants, fixtures, registries, documentation, final verification and commits |

The native `PaymentServices` contract is:

- `find#OpenItems`: organization, party, logical receivable/payable side, currency, eligible-through date, due/search
  and page filters; narrow invoice/credit/payment source and target rows, names, dates, original/current remaining
  amounts, revisions, capabilities and page/incomplete results. `balanceBasis: current` explicitly distinguishes the
  selection-through date from historical balances. Transfer legs are excluded from trade settlement. Optional
  `sourceKind` returns one paged kind for choices; `pageByKind`/`pageInfo` page the four normal lists independently.
  `selectedKeyList` returns scoped selected rows outside search/page/open-balance filters. New choices carry current
  versions; selected values retain the caller's original reviewed version, so label refresh never silently re-reviews
  a changed row. Page totals are labelled as page totals; a party with more than 200 open items remains paginated and
  usable. The 200-record limit applies to selected previews, not the party's full open-item population.
- `find#SettlementAdjustmentAccounts`: side, organization, effective date and search/selected IDs; only assigned,
  active, postable account IDs/codes/names. No chart balances or implicit account selection. Reuse dated assignment
  and organization-chain checks from `AccountingPolicy.account`.
- `preview#Settlement`: fixed organization/party/side/currency, selection-through and effective dates, `allocations`
  (`sourceKey`, `targetKey`, decimal amount), `adjustments` (invoice, discount/writeoff, amount, explicit account,
  reason) and `sourceVersions`. Every selected source and target, including adjustment invoices, needs its reviewed
  revision. Returns a durable owner-scoped preview ID/fingerprint, normalized rows, canonical book day, before/after
  balances, ledger preview, capabilities, blockers and expiry. Bound to 200 allocation rows, 50 adjustments and 200
  distinct selected records; incomplete scopes refuse instead of silently losing balances.
- `get#SettlementPreview`: owner/organization-scoped retained payload, status and results; expired previews stay
  readable. `apply#Settlement` takes only preview ID, fingerprint and a maximum-40-character operation key. Returns
  application/adjustment/posting identities, per-row results and remaining amounts. Identical completed retries return
  the recorded result before stale checks; changed key reuse refuses.
- `preview#PaymentAutoApplication` retains the same reviewed payload with oldest-due/date/ID allocation.
  `autoApply#Payment` requires that preview and its source payment. The individually adopted, audited
  `paymentAutoApplicationEnabled` defaults N: disabled calls write no operations, applications or audit rows. Existing
  invoice-targeted auto-application SECAs and the three legacy apply primitives retain their old behavior.

Reads require matching side VIEW, PAYMENT_VIEW, ACCOUNTING_VIEW or finance/system administration; EDIT alone never
opens the list. Preview/confirm/automatic application and account choices additionally require matching side EDIT.
PAYMENT_EDIT is no substitute. Active organization and private-counterparty checks run without artifact authorization.
Bank, gateway and ledger projections are omitted unless separately authorized.

One settlement locks the organization and sorted authoritative document/application sets, validates aggregate source
and target consumption before writing, and rechecks revisions, dates, currency, policy and account assignments. The
strict native writer uses existing PaymentApplication/GL/status models; legacy clamp/no-op responses cannot count as
reviewed success. Adjustment documents post to the explicitly selected account and apply atomically; no write-off
status or cash movement is substituted. Actual posted outcomes must match the reviewed ledger set, distinguishing a
valid already-direct AR/AP posting from a missing/error-journal posting. A direct receipt can only restore its entire
available amount to its original invoice when no additional ledger posting is needed. Capture the reviewed calendar
day once and persist it on the application before posting; later viewers and forward reversals preserve it. Every
settlement must be on or after the actual original source and target ledger days: a retained SQL day, otherwise the
unchanged UTC day of legacy ledger timestamps. Earlier applications refuse with `APPLICATION_BEFORE_SOURCE_POSTING`.

`settlementApplicationGuardEnabled` is a separate adopted rule, default N. New reviewed settlement writers require Y.
When Y, generic application writers also serialize balances, protect backing postings, and capture missing currency
and book day on new applications. This uses the posting source-day precedence, otherwise the legacy UTC timestamp
day; changing the viewing user's zone cannot change it. Existing applications and ledger history are never backfilled.
With both new flags N, legacy application fields, date/audit behavior and calls remain unchanged. A legacy main cash
posting created after its application must not post later than that application's retained day.

App acceptance includes a receipt60 plus credit25 against invoice100 in one confirmed set (remaining15), a receipt
split across invoices, explicit account/reason adjustments, retained draft/filter/review state, stale/currency/date/org
refusals and reader/AR isolation. Native acceptance also covers AP, edit-only Projects denial, exact retry/changed reuse,
rollback, default-off legacy audit and real `parallel` competing transactions for same-key replay, one shared source
and one shared target. The app's allocation draft is bounded presentation state; the native stored preview is authority.
All added routes enter AppStructure/TuiRender/content checks and the six required width/theme variants before acceptance.

P5a is accepted. Implementation commits: Mantle `a79012de`; BOSS `737c439`. The independently reviewed existing
variant-policy timing correction is Mantle `8f8c06ad`. Full BOSS: **1,122 passed, 0 failed, 5 skipped / 1,127** across
108 specs. Standalone Mantle without BOSS adoption data: **999 passed, the same 4 baseline failures, 17 skipped /
1,020** across 107 specs. The only failing specs remain InboxThreads, MantleSearch, WorkTimeEntries and WorkTimesheets.
All **95 new native cases** pass, including seven real parallel cases, application/raw posting guards, actual calendar
movements, rollback, exact retries and valid permission negatives. The additional catalog backdating regression passes.

Final client gate: **37/37 passed**, no skips. All four settlement walks pass; independent visual review accepted the
30 route/dialog/reader/settings width/theme shots, 12 retained review/applied shots and six unchanged print checks.
Native source permissions hold with artifact authorization disabled. Corrected draft submission, Back/Clear navigation
and original selected revisions are covered in the real browser. The disposable server uses the existing local font
fallback instead of an external font DNS dependency; no network failure is allowlisted. Final lint: 1,115 screens,
24,291 expression sites, zero parse failures and the unchanged 121 baseline flagged sites. New XML artifacts validate;
the local validator's two existing schema escape incompatibilities and unchanged P3 preferences box-header mismatch
are separately recorded, with the latter reproduced at P4 HEAD.

The lifecycle, unapplication, payment outputs, provider/refund and transfer portions of P5 remain the following
reviewed slices; P6–P21 have not started.

P5b's later assignment retains the same file boundaries: native payment lifecycle, gateway and transfer modules; app
Payments/detail seven tabs, GatewayTransactions and output screens; coordinator legacy/shared integration. Its contract
must be independently reviewed again before coding. Gateway attempts reserve durable provider identities before I/O,
keep uncertain/accepted evidence for reconciliation, and count pending refunds against cumulative caps. Transfers use
two explicit linked legs and exactly two atomic cash/transit transactions, with an explicit fee account; the generic
organization-to-itself poster must not produce four transactions. These are acceptance requirements, not delivered P5a
features.

### P5b1 reviewed assignment contract

Reviewed by the native author, app author, independent reviewer and coordinator before coding. Implementation starts
after P5a acceptance/commits. This slice delivers payment reads, drafts, reviewed lifecycle/unapplication and outputs;
provider actions/refunds and transfers follow as separately reviewed P5b2/P5b3 slices. They remain unavailable in this
slice, with no enabled placeholder actions.

| Owner | P5b1 owned files |
| --- | --- |
| Native author | Extend `PaymentWorkflowEntities.xml`, `PaymentWorkflow.js` and new declarations in `PaymentServices.xml`; new `PaymentLifecycle.js`, `PaymentOutput.js`, `PaymentContentGuard.js`, `PaymentContent.eecas.xml`; standalone lifecycle/output fixtures, specs and real concurrency specs |
| App author | `Payments/Payments.xml`, `Payments/PaymentDetail.xml` and its seven Overview/Applications/Gateway/Refunds/GeneralLedger/Files/History tabs, GatewayTransactions/PaymentPrint, `Payments.js`, `PaymentScreenServices.xml`, payment server specs and client walks |
| Coordinator | Shared posting/source guards, legacy SECAs, parent Payments menu/mounts, QuickCreate/NewPayment, choices/grants/topics/demo, common Files/download authority, registries/documentation, central verification and commits |
| Reviewer | Independent native contract/success/refusal/rollback review before dependent forms, code/output review and returned findings; central execution remains with coordinator |

The new `PaymentServices` contracts are:

- `find#Payments`: organization, queue (`incoming`, `outgoing`, `toValidate`, `unapplied`, `refunds`, `transfers`,
  `all`), party/instrument/status/currency/date/text filters and paging; current authoritative sums, narrow rows,
  selected IDs outside text/page (at most 200), actual page/count/completeness/error results and capabilities.
- `get#PaymentFinanceDetail`: organization/payment; whitelisted payment/source revision/totals, masked method
  identities, scoped application/refund/gateway/ledger/content/history/source projections, capabilities and reasons.
  Restricted arrays/fields are omitted. Gateway/refund/transfer mutations are unavailable until their slices.
- `find#PaymentMethods`: organization, cash direction, party/currency/date, search/selected IDs and paging; active
  owned/matching-party masked method identities and revisions, never account/routing numbers or provider credentials.
- `create#PaymentDraft` / `store#PaymentDraft`: cash direction (`incoming`/`outgoing`), party, decimal amount,
  currency, chosen effective date, instrument, organization/optional counterparty method, reference/comments and
  operation key; update also needs payment/source revision. Return payment/state/revision/day/retry identity. Callers
  cannot set raw status, from/to parties, financial side, invoice auto-application, SQL day or GL accounts.
- `preview#PaymentState`: organization/payment/source revision, action (`validate`, `deliver`, `confirm`, `cancel`,
  `void`), settlement date/reference/reason and optional selected evidence IDs/versions; retained review/fingerprint,
  exact state/date/evidence/application/posting effects, blockers and expiry. `get#PaymentStatePreview` projects that
  review under current authority. `change#PaymentState` accepts only preview/fingerprint/operation key, rechecks locked
  inputs and returns actual payment/application/posting/output results. Exact retries precede stale checks.
- `preview#PaymentUnapply`, `get#PaymentUnapplyPreview`, `unapply#ReviewedPayment`: the same retained engine with
  an explicitly selected application set, revisions and reason, followed by confirm-only identity. Side read/edit
  authority is additional to payment authority; PAYMENT_EDIT cannot substitute for AR/AP editing.
- `get#PaymentOutput`: organization/payment, output type (`receipt`, `detail`, `check`), source revision/output ID;
  approved HTML/hash/identity/name/type/day and masked metadata. No caller-supplied HTML/template/location. Check
  issuance/number reservation occurs once during reviewed delivery; reads do not allocate numbers or post money.

Reads require PAYMENT_VIEW/ACCOUNTING_VIEW/admin or matching side view for narrow trade payment data; edit alone
does not browse. Writes require PAYMENT_EDIT and broad payment read, active organization and private-record checks,
also with artifact authorization disabled. Cash direction is distinct from logical financial side; refunds inherit
their original side, and transfers remain excluded from trade settlement. New drafts require the adopted settlement
guard and capture SQL book days; legacy display/filter semantics stay unchanged, while financial checks use actual
posting days.

Validate moves Proposed to Promised. Manual delivery accepts only a non-gateway instrument, explicit human
reference/reason and all selected evidence versions; files are optional unless an actual instrument policy requires
them. Confirmation has an explicit settlement day/reference/reason and posts no second cash transaction. Cancellation
is unposted; posted void/unapplication rechecks every original day and refuses closed history. It zeroes all approved
applications before reversing their actual separate GL, then reverses cash/status atomically; direct no-extra links
must not invoke legacy per-application cash repost. No forward-unapplication schema is introduced here. The common
source guard must distinguish a cash payment's own applications from unrelated payments/credits on its header invoice.

Issued output bytes live outside mutable record folders and retain immutable native content/URI guards. Check
documents require treasury authority even through common Files/content-key downloads. Default-off legacy contracts
and audit behavior remain intact. Acceptance includes valid same-payload role pairs, source/method/date/currency/org
refusals, precise incoming/outgoing postings, confirm/cancel/void/unapply rollback, reviewed retries/staleness, real
parallel delivery/void/check-number cases, archive immutability, redacted reads/outputs/files and unchanged P5a flows.

Later P5b2 architecture uses a separate linked cash payment for each accepted partial capture, preserving posted
amounts. Its instruction model, provider identity/recovery and exclusion from legacy polling/double posting need their
own approved contract before coding; browser redirects cannot confirm financial success.

### P5b1 acceptance

The coordinator and independent reviewer accepted the native and app assignments after correcting all returned
findings. Native services own financial state, exact retries, original-day corrections, immutable issued output and
event-bound validation publication. BOSS owns contexts/forms and guarded shared Files. Gateway/refund/transfer
mutations remain unavailable until their subsequent slices.

Final standalone Mantle gate: 1,074 passed, the same four reproduced baseline failures, 17 skipped; 1,095 features in
117 specs. All 75 new native cases pass, including real first-archive/blob races and the paired direct-ledger refusal/
reviewed-native-void control. Removing only the blob synchronization in the disposable runtime reproduces both race
failures; the exact guard was restored. Final BOSS gate after the browser recovery correction: 1,145 passed, zero
failures, five skipped; 1,150 features in 110 specs, including unchanged Projects/Products regressions.

All 144 route/dialog/role captures and 84 refreshed form/role captures were visually reviewed at 390/1280/1440 in
light/dark, together with 24 retained review/completed variants and actual issued outputs. Final payment walks pass 7/7
without skips: incoming edit/validate/delivery/retry/receipt; outgoing delivery/settlement; failed-preview/own-edit
recovery; cancellation/reader restrictions; external stale confirmation; selected evidence/refusal retention; and
application release followed by void. Three unchanged invoice/statement print features also pass. Actual frame/root
bounds and viewport companions distinguish the recorded full-page capture artifact from real check overflow.

Changed XML validates. Screen lint scans 1,124 files and 24,666 expression sites with zero parse failures and the same
121 flagged sites. Framework resource exclusion specs pass 4/4. Framework search exclusion and data-load PDF fixes
are `e9ee50fb` and `d7235859`; the latter passes develop build/lint/lint-min, and both host failures reproduce without
its two-line initialization change. Implementation commits: Mantle `ea31a0aa`; BOSS `59a4060`.
F75–F77 remain their previously assigned P15/P21 work; F99 remains generic capture tooling work. P5b2/P5b3 are next;
the latest user request moves the execution checkpoint to the end of P5, before P6.

### P5b2 reviewed assignment contract

The native author, app author, independent reviewer and coordinator approved the following written interface and
integration prerequisites. Implementation starts after P5b1 acceptance and commits. Gateway instructions and recovery
come first; manual/provider refunds form a separate bounded delivery. P5b3 transfers follow their acceptance. P5 is
the final phase authorized for this execution; work pauses before P6 with a recorded checkpoint.

| Owner | Owned files and integration boundary |
| --- | --- |
| Native author | New `PaymentGatewayWorkflowEntities.xml`, its native entity guards, `PaymentGatewayWorkflow.js`, `PaymentRefunds.js`, new `PaymentServices.xml` declarations and bounded `PaymentWorkflow.js` DTO/capability additions; standalone gateway/refund fixtures, provider services, specs and real concurrency/recovery proofs |
| App author | Existing PaymentDetail Gateway/Refunds contexts, GatewayTransactions, retained review/result/recovery forms, `Payments.js`, `PaymentScreenServices.xml`, payment server specs and client walks; begin dependent forms only after the native interface is approved |
| Coordinator | Audited adoption flag, common application/source/posting/lifecycle/archive guards, legacy wrapper/poller/SECA exclusions, trusted adapter provisioning, settings/grants/jobs/choices/menus/demo, central registries/docs/builds/tests and commits |
| Reviewer | Independent contract, diff, success/refusal/rollback and rendered-output review for each assignment; return findings before acceptance |

**Adoption and authority.** `PartyAcctgPreference.paymentGatewayWorkflowEnabled` is audit logged and defaults to N;
managed gateway work also requires the adopted settlement application guard. Manual refunds require the settlement
guard. Every preview/mutator requires current broad payment read, PAYMENT_EDIT, current organization and private
record authority, including with artifact authorization disabled. Reuse the native treasury predicate; do not invent
a BOSS-specific Mantle permission or treat AR authority as treasury. Ledger results remain separately authorized.
Bank/card credentials, executable service names and raw provider bodies never enter app DTOs.

**Records.** Retained `PaymentGatewayPreview` stores owner, organization, action, payment/source/method/binding and
reservation revisions, SQL day, reviewed plans/policy, expiry and fingerprint. `PaymentGatewayInstruction` represents
authorization and its monetary ceiling. `PaymentGatewayAttempt` owns the unique organization/operation key, immutable
request hash and provider operation identity, action/parent, amount/currency, provider evidence, dispatch lease and
financial completion result. `PaymentGatewayReservation` holds authorization capacity or original cash funding for
an attempt. All new money records capture currency and source identity immediately. Native entity guards protect
identities, evidence, reservations and linked cash provenance from generic/artifact-off mutation.

The authorization parent never posts cash, enters trade settlement or becomes a delivered cash payment. Each accepted
partial capture creates exactly one uniquely linked cash Payment for its actual amount. Its original amount and
posting remain unchanged. Payment extensions identify instruction/attempt and authorization/capture/refund role.
Native projections show instruction state and actual captured/refunded totals without presenting a parent amount as
posted cash.

**Provider boundary.** Only an explicitly provisioned safe adapter is eligible. Trusted configuration supplies
reviewed operation and exact-identity lookup service names, adapter version and operation-specific guarantees for
idempotency, lookup, partial capture, release and refund. The adapter accepts immutable provider operation ID,
provider/merchant namespace, action, parent provider reference, amount/currency and approved payment/method identity.
It returns that same identity, typed accepted/declined/pending/uncertain outcome, exact amount/currency, provider
reference/timestamps and narrow codes. It cannot mutate Payment, applications or GL. Dispatch and lookup never inherit
trusted financial-finalizer admission in common guards. The finalizer never calls a provider.

Safe invocation also requires each action's explicit `reviewedMethodSnapshot: true` guarantee. The private
`prepare#PaymentGatewayDispatch` stage locks and rechecks the reviewed method/subtype revisions, including
`gatewayCimId`, and returns credential snapshots only to its immediate dispatch caller. It commits and releases
those locks before external I/O. Adapters consume those provided snapshots and original method versions rather
than rereading mutable method IDs. No CVV, arbitrary address reads, credential persistence or public credential DTO
is introduced. Exact-identity lookup uses the original operation identity and versions without requiring currently
active or unchanged funding credentials; local financial completion still validates the original reviewed methods.

Legacy interfaces have no request identity, may infer a response from a recent method transaction, and can mutate the
whole payment after a partial capture. Their behavior and existing providers remain unchanged for legacy records.
TEST_APPROVE/TEST_DECLINE's fixed reference and FinancialAccountLocal's separate financial-account posting do not
qualify them as reviewed adapters. Add a distinct deterministic provider fixture with independently committed effects,
stable request identity, authoritative lookup and pending/timeout controls. Refuse unsupported adapters before I/O;
there is no fallback to an unsafe legacy orchestrator.

**Gateway APIs.** The new native services are:

- `preview#PaymentGatewayAction`: organization, payment/source version, authorize/capture/release/refund action,
  explicit capture/refund amount, effective day/reason/reference, optional approved gateway, parent attempt, linked
  refund draft/revision and selected evidence/revisions. Authorize reviews the exact parent amount; release reviews
  remaining available authorization; refund targets the actual captured cash payment. Return retained identity,
  payment/gateway summaries, before/after, reservation/application effects, posting summary, authorized ledger plan,
  capabilities, named blockers and expiry.
- `get#PaymentGatewayActionPreview`: reproject that retained review under current authority, including recorded
  operation key/results. `execute#PaymentGatewayAction` accepts only preview ID, fingerprint and operation key of at
  most 40 characters. Return attempt/provider operation IDs, parent and actual cash/refund payment IDs, outcome,
  provider/financial state, amount/currency/SQL day, authorized actual application/GL/output IDs, named reason and retry
  identity. Exact recorded retries precede stale checks; changed reuse fails.
- `get#PaymentGatewayAttempt` is a pure scoped read and returns `attemptVersion` and the recorded provider-operation key.
  `refresh#PaymentGatewayAttempt` takes organization, attempt/`attemptVersion`
  and operation key and performs exact-identity lookup only. A nondefinitive not-found remains uncertain. It cannot
  start a new charge or refund. Same-ID replay is permitted only where the adapter guarantees idempotency or
  authoritative nonexecution; an expired lease alone never permits another external operation.
- `preview#PaymentGatewayRecovery` retains a newly reviewed financial plan for an already accepted attempt.
  It takes `attemptVersion`; the same `get#PaymentGatewayActionPreview` reads action and recovery reviews, distinguished
  by `previewKind` (`gatewayAction` or `gatewayRecovery`) and `financialOnly`. Recovery preserves the original action.
  `complete#PaymentGatewayAttempt` accepts only its preview/fingerprint/key and completes local money once. Recovery
  cannot change externally accepted amount/currency or dispatch the provider request again.
- `find#PaymentGatewayTransactions` filters authorized organization/payment/party/provider/action/outcome/day/text
  before paging, with selected attempt identities (at most 200), actual count/page/completeness/errors and narrow
  treasury-only rows. Preserve authorized legacy response visibility without exposing provider secrets.
- `find#PaymentGatewayBindings` takes organization/payment/action/effective day, text, selected IDs and paging. Treasury
  receives only gateway ID/description, `bindingVersion`, `adapterVersion`, per-action/lookup capabilities, actual page
  metadata/completeness/errors and selected rows. An ID~bindingVersion choice decodes to gateway ID and
  `gatewayBindingVersion` on preview. Native defaults are equally frozen in the retained review.
- `find#PaymentGatewayProviders` supplies the organization-wide transaction filter with scoped provider IDs and
  descriptions, selected labels and actual page metadata. It does not expose executable binding configuration.

**Durability and capacity.** Reserve and commit immutable identity/capacity before I/O; invoke the provider without
financial locks; persist its outcome durably; then atomically create/post the exact local cash, applications and
outputs. Caller rollback cannot erase dispatch/evidence. States distinguish reserved, dispatched, pending/uncertain,
declined, accepted-unposted and completed. Timeouts/crashes and accepted-but-local-posting failures retain evidence and
reservations. A changed/closed posting plan becomes accepted-unposted, never declined or permission to charge again.
Actual provider timestamps are evidence; new financial records use the explicit reviewed SQL accounting day.

Accepted capture amounts and pending/ambiguous reservations consume authorization capacity and exclude conflicting
release. Concurrent capture/release re-read the same instruction and reservation revisions under stable locks. Pending
refunds reserve both provider refundable capacity and the original cash leg's currently unapplied funding. Common
native/raw application writers and source apply/unapply/void/reversal/destruction serialize on those same holds. They
cannot spend reserved cash. A proven decline/nonexecution releases a hold; accepted local completion consumes it in
the same transaction as the exact refund application. No temporary fake positive application represents a hold.
The original cash source is native-managed before its first hold. A reviewed manual-refund reservation may adopt a
legacy manual source under the same organization-then-Payment lock, retaining its authoritative cash evidence.
Default-off unmanaged writers take sorted Payment-only locks and re-read provenance, scope and holds; a waited
source that entered the reviewed workflow refuses with a retry instead of acquiring an organization lock afterward.

**Manual refunds.** `preview#PaymentRefund` takes organization, original cash payment/revision, explicit amount/day,
reason/reference, optional linked refund draft/revision, reviewed organization/counterparty methods and evidence.
`get#PaymentRefundPreview` reprojects its retained review. `refund#ReviewedPayment` accepts only preview/fingerprint/key.
A linked draft must have exact opposing parties/currency and no prior GL/application/instruction. Native code sets
PtRefund and the original link, retaining the original financial side while reversing cash direction. Cash posting and
the payment-to-original application are atomic and verified. Refund capacity is the lesser of actual cash less
completed/held refunds and current unapplied cash less reservations. Fully allocated cash must first be legitimately
unapplied through the separately authorized P5b1 workflow. There is no hidden invoice unapplication or return-credit
orchestration. A provider-backed source must use provider refund; manual void cannot pretend that its charge was
refunded. Closed periods and unavailable mappings refuse without partial local money.

**Legacy exclusions.** Before provider I/O, deny managed authorization parents and cash children through every legacy
authorize/capture/release/refund/details entry point, including direct leaf services, order/invoice wrappers and poller
selection. Exclude instruction parents from legacy payment posting/application SECAs. Guarding only the poller or a
single high-level wrapper is insufficient. Existing unmanaged/default-off paths and tests retain their behavior.
Legacy refund creation/linking and raw refund links cannot manufacture a local refund against a native-managed
original. Legacy provider-capable instructions cannot be adopted while an old provider request may be in flight;
check their original persisted instrument and methods before applying any caller edits. New native drafts remain
eligible for the reviewed gateway workflow, and clean manual legacy sources retain reviewed adoption.

**Acceptance.** Use valid same-payload treasury positives versus AR-only/read-only/edit-without-read/private/foreign
negatives; stale source/method/binding/reservation and currency/scale/day/lock refusals; authorization60 with captures20
and40 creating two actual cash legs and no parent posting; pending/ambiguous capture/release/refund capacity; real
parallel exact retry and competing-key cases; wrong provider identity/amount/currency quarantine; accepted-then-timeout
recovery and accepted-unposted financial-only repair; partial/multiple/manual/linked refunds with exact totals and
immutable source links; refund versus legacy application contention and source-reversal refusal; zero provider calls
for managed records through legacy services/polling; redirects with zero financial authority; unchanged provider,
Projects, Products and default-off regressions. Review each bounded assignment and all returned findings before its
central full-suite/browser gate and separate repository commits.

The coordinator/native integration interface is fixed before releasing the first assignment:

- Native-owned `PaymentGatewayReservations.js` exports a read-only
  `cashHoldSummary({organizationPartyId,paymentId})` with lossless `heldAmount`, `currencyUomId`, `holdCount` and
  canonical `version`. It verifies authoritative payment/organization identity and includes every held cash
  reservation, including pending, uncertain and accepted-unposted attempts. Callers hold the existing organization
  then payment locks; reservation writers use that same order. There is no supplied exclusion or bypass flag.
- Native-owned SQL summary views in `PaymentGatewayWorkflowEntities.xml` expose held cash by payment for the
  coordinator's open-item query integration. `reservedAmount` and `availableAmount` are separate from actual accounting
  `unappliedTotal`. Search/count/page use availability before projection. Missing/failed hold evidence is unavailable,
  never a zero balance; turning off adoption does not release existing durable holds.
- The local financial finalizer is `complete#PaymentGatewayAttempt`. Common Posting/Lifecycle/Archive admissions name
  that exact service and manual `refund#ReviewedPayment` where needed. They admit no dispatch/lookup parent. The
  finalizer accepts persisted accepted attempt plus retained review identity, never caller provider evidence, and
  transitions its own cash hold to consumed inside the same locked transaction before its exact application. Failure
  rolls both back. Native internal declarations and entity guards are installed before any managed dispatch.
- Instruction capacity counts each capture attempt once: completed accepted amounts plus still-held attempts,
  including accepted-unposted, cannot exceed authorization. A held accepted amount is not added a second time.
  Conflicting release refuses while capture outcome is unresolved; no lease timeout invents available capacity.
- The first bounded assignment enables authorize/capture/release and exact lookup/financial recovery only. Gateway
  refund and manual refund remain unavailable until their separately reviewed implementation and shared cash-hold
  integration are accepted. The app receives native capability/reason fields rather than inferring availability.
- Existing B1 native draft creation supplies a gateway-instrument Proposed payment with no GL, applications or provider
  history; no separate raw creation path is added. Native detail/list capabilities include authorize/capture/release/
  refund, refresh and recover. Treasury-only `gatewayInstruction` carries instruction ID/state/currency, authorized,
  held, captured, released and capturable amounts. Capture children carry gateway role/authorization payment link and
  actual amount/applied/unapplied/reserved/available totals. Instruction/provider amounts are labeled separately from
  posted cash. Recovery's recorded operation key is the financial-confirm key; an attempt's key is its original
  provider-operation key. Neither is guessed or replaced when reopening a result.

### P5b2a build and acceptance

Implementation commits: Mantle `5c24c2fa`; BOSS `4b92e2c`.
Coordinator and independent reviewer accepted each native, shared-integration and application assignment after
returned findings were corrected. New methods/configuration are audited and default off. Safe adapter provisioning,
owner-bound action/recovery reviews, durable reserve/dispatch/evidence/complete stages, original credential snapshots,
typed outcomes, exact lookup and atomic actual cash/output ownership are implemented. Authorization parents remain
noncash. Legacy leaf/wrapper/poller entry and first adoption serialize on permanent admission fences. Common guards
protect stored/candidate sources and accepted cash with flags off. No provider ancestor receives finalizer admission.

Full standalone Mantle: 1,139 passed, the same four reproduced baseline failures, 17 skipped; 1,160 features/130 specs.
All 65 new cases pass, including real concurrency, original caller rollback, authority loss, large retained evidence,
credential-lock contention, interrupted lookup replay, unsafe legacy I/O and source/adoption races. Final safe
identity/recovery DTO assertions pass after correcting unsupported test registration/ASI syntax; none were dropped.
The earlier transient notification failure did not recur; final actual-worker cases pass without a manual publisher.

Full BOSS: 1,162 passed, zero failed, five skipped; 1,167 features/112 specs. Unchanged Projects/Products/legacy flows,
the actual transactional ClientBilling cleanup, 30 state/review/attempt QVT/TUI/HTML renders, selected choices outside
search and role pairs pass. Final focused presentation gate passes 35/35. Browser acceptance passes 78/78 without
skips: 72 route/dialog/role width/theme cases plus six real financial walks. Independent visual review accepted all
route captures, 24 retained review/result variants and issued receipt. Actual phone geometry is 359 px client/scroll,
with amounts/chip content visible; all 18 selected-attempt links have a valid single-rectangle center hit before the
unchanged normal click. The empty state-effects grid is absent from gateway reviews, with real B1 effects retained.

Changed XML parses and validates except the previously reproduced preferences box schema mismatch. Lint scans 1,124
files/24,858 sites, zero parse failures and the same 121 flagged sites. Two isolated fresh Code assertions also
reproduce at accepted B1 component commits, while both final full BOSS reruns pass all Code cases; no Git reset or
Accounting baseline exception was added. F75–F77 retain their assigned P15/P21 work; F99/F107 are generic capture/click
tooling work. The real held-manual-source reparent proof remains mandatory before P5b2b enables its cash-hold writer.

### P5b2b bounded refund assignments

The coordinator, native author, app author and independent reviewer reviewed these refinements before refund code.
Release follows P5b2a acceptance/commits. Deliver manual refunds/shared funding first (P5b2b1), then provider refunds
(P5b2b2), reviewing and committing each bounded delivery before P5b3 transfers. The execution checkpoint remains the
end of P5, before P6.

**Current execution priority.** After gateway acceptance, the user requested code completion without further
screenshot tests and similar presentation-verification work. The remaining P5 deliveries therefore prioritize complete
native/app/shared code, independent contract/diff review and focused meaningful financial server checks. Additional
screenshot/browser-walk and visual-review cycles are omitted from this execution; their broader finish work remains
P21. This changes verification effort, not the end-of-P5 stop boundary or financial authority/atomicity contracts.

**Ownership and prerequisite contract.** The native author owns new `PaymentRefundEntities.xml`, its EECAs,
`PaymentRefunds.js`/`PaymentRefundGuard.js`, native service declarations, bounded payment DTO/capability additions,
refund/draft-choice reads, and standalone fixtures/specs. Provider extensions to GatewayWorkflow/Execution/Guard/
Reservations and the explicit test adapter belong to the native author in P5b2b2. The app author owns PaymentDetail's
refund dialogs/review/results, Refunds/Gateway contexts, GatewayTransactions refund presentation, `Payments.js`,
`PaymentScreenServices.xml` and refund server/client specs. Dependent forms start after the native read/preview
contract is approved. The coordinator retains common guards, original legacy writers/SECAs, grants/choices, other-tab
transition includes, demo/central registries/docs and all execution/commits. The independent reviewer traces each
success/refusal/rollback path and rendered output before coordinator acceptance.

**Manual API and reads.** `preview#PaymentRefund` takes organization, original actual cash `paymentId`/`sourceVersion`,
amount, explicit effective day, reason/reference, optional `refundPaymentId`/`refundSourceVersion`, payment instrument,
reviewed organization/counterparty method IDs and versions, and selected evidence IDs/versions. The original ID never
means the proposed refund child. `get#PaymentRefundPreview` reads owner-bound retained `previewKind='refund'`.
`refund#ReviewedPayment` accepts only preview/fingerprint/operation key (at most 40 characters). Retain source/draft/
method/funding/policy/evidence versions; current authority and exact retry precede stale checks.

The preview uses `paymentSummary` for this action's actual amount, `refundSummary`, before/after/application effects,
posting summary, separately authorized ledger preview, evidence, capabilities, blockers, expiry/status/key/results.
Results retain original `paymentId`/`originalPaymentId`, actual `refundPaymentId`, exact payment application, actual
amount/currency/SQL day, event and authorized GL/output identities. Every output owns the refund child. New refund
records persist original/source/currency identity immediately for P20.

`get#PaymentRefundSummary` and Treasury-only detail `refundSummary` return original actual cash, completed/held refund
totals, original unapplied/reserved/available cash, provider refunded/refundable amounts where applicable, final
refundable amount, currency/version/completeness/errors/reasons. Sum authoritative records rather than bounded
`refundRows`. `canRefund` and `canGatewayRefund` are mutually exclusive. Malformed legacy refund cash/AP evidence is a
named incomplete/refusal, never an invented zero balance. `find#PaymentRefundDrafts` returns scoped eligible opposing
clean drafts before count/page plus selected rows, actual source revisions and masked labels. The coordinator's
`reviewedRefundDrafts` choice preserves selected ID~sourceVersion tokens outside the search page.

**Funding and immutable backing.** Cover incoming AR cash→outgoing customer refund and outgoing AP cash→incoming
supplier refund. Logical finance side stays inherited; cash direction reverses. Cap actual original cash less completed
and held refunds against current unapplied cash less every cash hold. Never double-count accepted-unposted provider
money. Fully allocated cash first requires separately authorized legitimate B1 unapplication. No hidden invoice
unapplication, legacy clamping refund controller or return-credit orchestration is introduced.

Manual confirmation locks organization, sorted original/draft Payments, authoritative backing/applications/holds and
current finance policy. A clean legacy manual source may adopt under the existing permanent provider-admission fence;
provider-capable or previously dispatched legacy sources refuse. Do not backfill old SQL days. Verify complete actual
cash GL/non-error/non-reversed evidence, source/draft/method revisions, currency/scale/parties, refund day at or after
original actual GL day, current fiscal/typed locks, accounts/dimensions and evidence. An old closed source may fund a
genuine open-day refund without rewriting old cash. Post exact opposite cash first, then exact refund→original payment
application/reclassification with captured currency/SQL day, immutable `PaymentRefundRecord`, event and outputs in one
transaction. Verify actual postings/accounts/DC/amounts/IDs; rollback leaves none of those local changes.

Protect completed manual/provider refund identities and their exact funding APP at entity/common boundaries even with
flags N: no raw amount→zero, reparent, deletion, source reversal or ordinary B1 unapply/void may make already-refunded
funding reusable. B1 can still unapply unrelated invoice allocations on a partially refunded original. No refund
reversal controller is invented in this delivery. Common financial admissions name only `refund#ReviewedPayment` and
the existing provider finalizer; dispatch/lookup remain nonfinancial.

**Provider identity and claims.** Refund action uses an actual completed capture cash child, deriving its immutable
capture operation/reference/merchant/currency natively. Require explicit safe-adapter `originalCaptureOnly`, partial
refund, idempotency, exact lookup and reviewed identity guarantees. No caller-selected provider reference, destination
or current replacement credential may reroute it. Rotation/expiry of the original charging credential does not block
a refund by the original capture reference or its exact lookup. Preserve original method IDs/versions as provenance;
use operation-specific reference rules instead of B2a's active charging-method validation. Current Treasury/private/
organization authority, funding and newly reviewed posting policy remain strict.

A durable `PaymentRefundDraftClaim` keyed by an optional existing draft records held/released/consumed state. B1
edit/state/delivery/cancel and manual refund check held claims, including before a gateway role exists. Provider reserve
locks original/draft identities, retains immutable attempt `refundDraftPaymentId`, and atomically reserves provider and
unapplied-cash capacity. Authoritative decline/nonexecution releases both holds and the claim; a new operation can
claim a still-clean draft only after fresh revision review. Consumed claims never recycle. Pending/uncertain/
quarantined/accepted-unposted retains all reservations and claims. Actual refund `cashPaymentId` is assigned once
inside accepted local completion, with child use/creation, verified cash/AP/reclassification, claim/hold consumption,
event/output and result in the same transaction. Rollback preserves held claims/holds and clean draft. Capture's
existing preassigned cash identity rules remain unchanged.

**Required proofs.** Same valid Treasury payload versus AR/read-only/edit-only/private/foreign refusals with artifact
authz disabled; stale original/draft/method/funding/policy/currency/scale/day refusals; both cash directions and partial/
multiple/linked drafts; exact retries and changed reuse; first-post rollback; real refund/refund and refund/native/raw/
legacy application races; legacy adoption/fence refusal; fully allocated refusal then independently authorized unapply;
flags-off immutable completed funding; held original reversal/destruction and old-unheld→new-held source reparent using
the real hold writer. Provider proofs include per-capture ceilings, both holds/claims, decline draft reuse, timeout/
mismatched identity quarantine, credential rotation/expiry positive versus reference/merchant/rerouting negatives,
authority loss, exact lookup, accepted-unposted recovery and caller rollback without repeated external operation.
App proofs cover actual refund child/output ownership, retained selected revisions/intent/results, safe missing/denied
states, current roles, and light/dark 390/1280/1440 walks and visual review. No P6 work is included.

**Provider release refinement.** P5b2b1 manual refunds are one atomic transaction and introduce no pending manual cash
reservation writer. Provider holds are available only for real completed capture cash. B2b2 therefore proves real
capture cash holds, claimed clean drafts, raw/native application capacity and release/consumption, and both original
and candidate GL source identities. A captured-source GL mutation may refuse first under permanent capture
immutability; that is recorded honestly rather than treated as an isolated manual-hold proof. Manual pending
reservations remain unavailable; any future writer must add its own first-hold/adoption contention proof. No fake
reservation/claim or noncapture provider eligibility is introduced to exercise the older wording. Native and reviewer
confirmed the app's exact refund input/DTO extension before dependent forms were released.

### P5b2b1 manual refund acceptance

Implementation commits: Mantle `cb9cc35d`; BOSS `bb8a421`.

The coordinator accepts the independently reviewed native, application and common assignments. All 21 new native
cases pass. The initial 45-case gate and final 25-case gate together cover 53 distinct native cases, all passing:
actual partial/customer/supplier/linked-draft refunds, exact retries, malformed/verified legacy history, current
authority loss and restoration, source/draft/method/evidence/policy staleness, genuine prior-closed/current-open
posting, caller rollback, flags-N immutable funding and remaining capacity, unrelated invoice unapplication and real
same-key/capacity/application/first-adoption-versus-raw-link contention. BOSS passes 24/24 across 9 refund cases and 15
unchanged payment cases, including actual Treasury/admin results and child-owned issued documents. Changed XML
validates and diff checks pass. Per the user's latest direction, no additional screenshot/browser/full-suite cycles
are required for this delivery; the earlier accepted P5b2a full-suite baseline remains recorded above.

**F108 — legacy refund history.** Valid completed legacy refunds without permanent native backing are reported using
their exact actual cash and application/reclassification evidence. New native adoption/refunds refuse with
`LEGACY_REFUND_HISTORY_REVIEW_REQUIRED`; historical sealing is unavailable until separately designed. Unposted,
reversed, mismatched or abandoned-but-financial history produces named incomplete evidence and no invented capacity.
A genuinely clean cancelled draft does not block new work. No old SQL day is backfilled.

**F109 — reviewed banking freshness.** Lifecycle/refund confirmation now verifies and uses the same fresh locked
method/subtype objects. Already posted native manual cash keeps its provenance when its bank later receives gateway
route metadata; only complete live actual cash qualifies for that narrow common-boundary exception. These fixes are
included in focused shared lifecycle/gateway regressions. Provider refunds and transfers follow; P6 has not started.

### P5b2b2 provider refund acceptance

Implementation commits: Mantle `128f6ca0`; BOSS `848ff21`.

The coordinator accepts the independently reviewed native, app and shared assignments. Refunds bind an actual
completed capture and its immutable provider operation/reference/merchant/currency. Original charging credential
rotation/expiry does not reroute or prevent reference refunds and exact lookup. Current safe-adapter guarantees are
checked again immediately before I/O. Durable provider-capacity and unapplied-cash holds, optional clean-draft claims
and exact lookup/recovery retain uncertain/accepted-unposted evidence. The shared strict money core posts actual
opposite cash and exact funding/reclassification with immutable records/events/child-owned outputs atomically.

All 13 new native cases pass. The final focused gate covers 44 distinct native cases; its sole fixture failure used a
caller-chosen PK ignored by the legacy create service, and the corrected actual-returned-ID proof passes separately.
All other 43 passed together. These include both cash directions, partial/multiple and different-amount legacy draft
conversion, current/historical claim projections, real raw/native application capacity, flags-N common boundaries,
credential rotation/expiry with deleted live evidence, timeout/exact lookup, post-accept mapping changes, joined
financial rollback after actual backing/APP/two postings/two outputs, restored holds/clean draft, exact retry and real
same-key/capacity races. BOSS passes 34/34 across four specs, including all eight new provider cases and unchanged
manual/gateway cases. Actual Treasury/admin child/output ownership, AR refusal and retained selected revisions pass
in server-rendered QVT/TUI/HTML. Changed XML validates and diff checks pass. No new browser/screenshot/full-suite
cycle was run under the user's code-completion priority.

**F110 — permanent legacy fence preparation.** The native manual refund and provider reserve controllers now receive
exact preparation-only admission for first clean legacy source/draft adoption. Provider entry recording remains
forbidden to those native controllers. Both actual first-adoption positives pass without rewriting old source days.

**F111 — retained financial policy.** Accepted refund completion compares freshly rebuilt posting plans/policy with
the immutable original review. A valid changed refund-control mapping leaves accepted-unposted money requiring a
new financial-only review; that reviewed recovery and a rollback after actual local posting pass with one provider
effect. Recovery consumes its own exact held capacity once; planned provider-refunded amounts also remain truthful.

**F112 — draft claim states.** Claims create only as held under exact reserved native attempts, release only on
definitive decline, consume only inside accepted local completion and never recycle after consumption. Reopened old
declined attempts show their own historical release after the same draft is reused; they cannot borrow another
attempt's held/consumed state. Neither provider ancestors nor browser return values gain financial admission.

### P5b3 transfer assignment contract (completed)

The native author owns `PaymentTransferEntities.xml`/EECAs, `PaymentTransfers.js`/`PaymentTransferGuard.js`, native
declarations, transfer-specific payment projections and standalone specs. The app author owns the Payments list's
InternalTransfer dialog/review/result and thin screen-service inputs, plus bounded detail presentation and server
specs. The coordinator owns the new type and default transit mappings, shared choices/grants, common lifecycle/GL
admissions, demo/registries and documentation. The reviewer approves this interface before implementation and reviews
the completed diff. No provider work overlaps transfer implementation.

`preview#InternalTransfer` takes organization, distinct source/destination organization-owned bank/cash methods with
their reviewed versions, positive principal, currency, explicit effective day, nonnegative fee, explicit fee account
when nonzero, reference and reason. `get#InternalTransferPreview` returns the owner-bound retained review.
`create#InternalTransfer` accepts only preview/fingerprint/key (maximum 40 characters); exact completed retries precede
stale checks. Account choices require current Treasury authority and return assigned active postable fee accounts,
without balances. Every service checks current read/edit/organization/private-method authority with artifact authz off.

One operation locks organization, sorted methods/subtypes and authoritative policy/mappings, then rechecks all
revisions, dates, currency/scale and account assignments. It creates a durable pair identity and exactly two linked
native-managed `PtInternalTransfer` Payments and two actual cash/transit transactions in one transaction. Principal P
and fee F produce outgoing cash P+F (debit transit P, debit explicit fee F, credit source bank P+F), and incoming cash
P (debit destination bank P, credit the same transit P). The outgoing leg has only `paymentMethodId=source`; the
incoming leg has only `toPaymentMethodId=destination`, preserving unambiguous statement matching. Both retain original
principal/currency/day and immutable pair/opposite-method provenance; cash direction derives from the native leg
identity because both parties are the organization. Distinct methods may share one cash control GL and reconcile
independently. Transit must be distinct from both cash accounts and the fee account; a nonzero fee needs a distinct
eligible expense account. The organization-to-itself legacy autoposter cannot
create another two postings. No PaymentApplication is created and trade settlement/gateway/refund paths remain
unavailable for either leg. Completed pair money, source links and exact postings remain immutable with flags N;
ordinary descriptions/reconciliation remain editable. No partial reversal controller is introduced.

Preview/results display both legs, principal/fee/total, masked methods, native before/after and separately authorized
ledger evidence, actual posting IDs and recorded retry result. Add exact native grants and reviewed method/fee-account
choices; preparation never silently updates a selected revision. Meaningful focused proofs cover both-or-neither
posting (including failure after the first actual posting), identical retries/changed reuse, simultaneous confirms,
current permission/private/foreign refusals, stale methods/policy, closed day, currency/scale, missing mappings and
fee account, no trade settlement and immutable completed cash. Application checks cover actual pair/output identities
and retained intent/results. Per the current execution priority, no new screenshot/browser cycles are required.

### P5b3 acceptance and requested checkpoint

Implementation commits: Mantle `9a13f26c`; BOSS `49f3001`.

The coordinator accepts the independently reviewed native, application and shared assignments. Treasury creates an
owner-bound native transfer review, then confirms only its preview/fingerprint/40-character operation key. Principal
P and fee F create exactly two native-managed linked Payments and two verified actual ledger transactions: source
cash P+F through transit P and explicit expense F, destination cash P through the same transit P. Distinct methods
may share one cash control account. Leg-specific method slots and cash direction preserve independent statement
matching. There is no trade application, gateway operation, refund or legacy org-self autoposter on either leg.

Permanent pair/source guards survive flags N and protect money, links, original headers/entries, reversal, unpost,
duplicate posting and candidate source reparenting. Descriptions and reconciliation remain editable. Reviewed bank
identity/subtype, organization/private authority, mappings, accounts, fiscal/typed locks and currency are rechecked
under lock; completed exact retries return the recorded pair before stale checks. Each leg owns one immutable detail
document, with principal, fee-on-outgoing-leg and leg identity; no receipt/check is issued for an internal transfer.

The final standalone Mantle gate passes **45/45** across 13 specs, including all **10 new transfer cases** plus focused
payment/manual/provider/source/fence regressions. An inert explicitly targeted native-fixture SECA proves a failure
after the first actual posted outgoing leg rolls back pair, both Payments, postings, outputs and operation; the same
review/key then succeeds. Real concurrent same-key confirms create one pair; independent reviewed transfers sharing
banks/transit both succeed. Valid negative cases cover permissions, private owners, stale banking/policy, currency,
precision, fees, mapping consistency and flags-N boundaries. BOSS passes **40/40** across four specs, including all
**eight new transfer cases**, actual Treasury/admin pair/output identities and rendered QVT/TUI/HTML links, same-payload
AR refusal, current ledger omission and canonical retained pair/key binding. Changed XML validates (nine schemas,
three data parses); the final separate screen lint report retains zero parse failures and the same 121 baseline sites (1,124 files / 25,015 expression sites).
The two final markup schema repairs are static valid dialog type and removal of an empty mobile column.

**F113 — transit assignment and fee eligibility.** The existing 258300000 transit chart account lacked a default
organization assignment. Its missing template assignment is now installed with the new PtInternalTransfer mappings;
demo setup adds only missing organization assignment/mappings. Fee 550000000 is cost of sales and correctly refuses
the expense-only contract. Focused fixtures explicitly assign/use banking expense 710000000; no account restriction
was weakened to satisfy a test. New methods/accounts/choices retain native scope and masked labels.

**F114 — transfer queue eligibility.** Transfer projection reports no unapplied trade funding, and the Unapplied SQL
query now excludes PtInternalTransfer before counting/paging while preserving ordinary null legacy types. Both real
legs remain in Transfers. The affected two core cases pass after this final read-only correction.

**Checkpoint.** P4 and every P5 slice are code complete, independently reviewed and committed in delivery order.
The user's later instruction prioritized code completion: no further screenshot/browser/full-suite sweeps were run
for manual/provider refunds or transfers. Focused financial/server checks and final XML/lint passed; prior P5b2a full
suite evidence and the four reproduced standalone Mantle baseline failures remain recorded above. No new route was
introduced by the last three slices. P21 retains the broader finish/access/visual/regression work. P6 and all later
phases are unstarted, including SupplierProfile/payable intake/holds and the framework notification topic filter.
Work stops here at the user's requested end-of-P5 checkpoint.
