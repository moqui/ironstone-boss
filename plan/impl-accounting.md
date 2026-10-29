# IronStone BOSS — Accounting implementation

Oct 28, 2026 — plan; P0 partly done (F1–F46, found while writing it); the shared party-role and effective-date
rules applied (§4); the customer and supplier pages as PASS apps in mr-pass (§4); its open questions decided (§4);
Mantle without BOSS, and forward-cost revaluation (§4)

How [design-accounting.md](design-accounting.md) gets built, in phases from the foundation to base-currency
posting, each ending tested and usable. This file is kept at a high level, as [impl-products.md](impl-products.md)
and [impl-projects.md](impl-projects.md) are: each phase names its scope by the design's sections and §18 needs
rather than restating them, and the design stays the place for screen and record detail. During the build this
file is the log: phase status and what each built, the decisions made, open questions, findings against the
code, and what is deferred.

Today `screen/Accounting/` holds nine placeholders, and the root has only the Chatter and RecordFiles mounts.
The `BOSS_ACCOUNTING` authz is in BossSetupData's commented not-yet-implemented block (F1). None of the design's
proposed services, entities, fields or status items exist yet in Mantle or BOSS. Two shared screens it reuses
exist, with the Projects context only: `Shared/InvoiceDetail` and `Shared/OrderDetail` (F2). Accounting is built
after Products (§4), so Product360, Supplier360, ProductStandardCost, and the revaluation services and dialogs
of Products P2, P6 and P9 are there to extend.

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
- mr-moqui: `plans/Remaining-Work.md` and `docs/Testing.md`.

Framework paths are under the mr-moqui checkout (`crates/`, `runtime/base-component/`), Mantle paths under
`runtime/component/mr-mantle/`, PASS paths under `runtime/component/mr-pass/`.

Sections: [1 scope](#1-scope-and-order) · [2 rules](#2-ground-rules) · [3 phases](#3-phases) ·
[4 decisions](#4-decisions) · [5 open](#5-open-questions) · [6 findings](#6-findings) · [7 later](#7-later) ·
[8 verification](#8-verification)

---

## 1. Scope and order

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
| P1 Foundation | Mantle, BOSS | the Accounting root and menu, Home | — |
| P2 Ledger and posting guard | Mantle, BOSS | ChartOfAccounts, AccountDetail, JournalEntries, JournalEntryDetail, TransactionEntries, JournalBatches, JournalTemplates, Periods, PeriodLocks, TrialBalance, GeneralLedger | — |
| P3 Settings | Mantle, BOSS | Settings, AccountingPreferences, PostingDefaults, PaymentTerms, Currencies, PaymentMethods, DocumentSettings | — |
| P4 Receivables | Mantle, BOSS | Invoices, InvoiceDetail, BillingQueue, Statements, Customer360 | — |
| P5 Payments and settlement | Mantle, BOSS | Payments, PaymentDetail, GatewayTransactions, ReceivablesWorkbench | — |
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
closes. Still to check:

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
