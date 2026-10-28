# IronStone BOSS — Accounting design

Oct 28, 2026 — draft; reviewed against research-accounting.md, the reference apps and the other core designs ([review-core-apps.md](review-core-apps.md)); names the Mantle SECAs it keeps or conditions (§1.4) and adds bill intake and holds, match and costing policies, credit holds, budget commitments, base-currency posting (AC-19), the production posting rule and the portal roots

IronStone Accounting serves finance teams, bookkeepers, collections staff and treasury. Its
sections are Receivables, Payables, Payments, Banking, General ledger, Period close, Fixed assets,
Inventory, Tax, Budgets, Reports and Settings. It completes invoice-to-cash and procure-to-pay and makes
stock, production and service transactions traceable to their financial effects. A small
business can use Accounting alone, including its contextual customer, supplier, product,
order, shipment, asset and return screens. This file is a design draft. Its Designed-in
mappings in the inventories are additive, and it makes no claim about implementation status.

**Inputs.** [research-accounting.md](research-accounting.md) §§1–18,
[research-crosscut.md](research-crosscut.md), [design-crosscut.md](design-crosscut.md),
[initial-design.md](initial-design.md), [style-guide.md](style-guide.md),
[design-doc-guide.md](design-doc-guide.md), [design-projects.md](design-projects.md),
[design-drawers-commons.md](design-drawers-commons.md), [ss-inventory.md](ss-inventory.md),
[usl-inventory.md](usl-inventory.md), and current Mantle and SimpleScreens source.

**Source paths.** `Accounting/...`, `Party/...` and `Asset/...` baseline references mean
`runtime/component/mr-marble/screen/SimpleScreens/` paths; inventory rows use their basename.
Mantle source is `runtime/component/mr-mantle/{entity,service/mantle}/`. Third-party paths are
relative to the named checkout beneath `~/work/moquiwork/3p_other`: Odoo uses the bundle root
(`odoo/addons/...`), Carbon `carbon/`, ERPNext `frappe/erpnext/`, Akaunting `akaunting/`,
Dolibarr `dolibarr/`. Research records additional references; this design cites the chosen
pattern per screen. Reference behavior is translated into BOSS/Mantle concepts, not copied code.

**Sections.** [1 shell](#1-shell) · [2 screens](#2-screens) · [3 home](#3-home) ·
[4 receivables](#4-receivables) · [5 payables](#5-payables) · [6 payments](#6-payments) ·
[7 banking](#7-banking) · [8 GL](#8-general-ledger) · [9 close](#9-period-close) ·
[10 assets and inventory](#10-fixed-assets-and-inventory) · [11 tax](#11-tax) · [12 budgets](#12-budgets) ·
[13 reports](#13-reports) · [14 records](#14-related-records) · [15 settings](#15-settings) ·
[16 coverage](#16-baseline-coverage) · [17 outputs](#17-documents-and-outputs) ·
[18 needs](#18-framework-and-data-needs) · [19 decided](#19-decided) · [20 open](#20-open)

## 1. Shell

Root `screen/Accounting.xml`, mounted as `Accounting`, uses `BOSS_ACCOUNTING` and icon
`sym_o_account_balance`. The root already exists with placeholder sections; this file specifies
their replacement. It retains `mantle.party.PartyServices.setup#UserOrganizationInfo`, the
shared Chatter/RecordFiles mounts and existing shell. Selecting an organization changes all
queries and new-document defaults; supplied IDs are still checked against authenticated scope.

The two external pages this file owns are not under this root (D5 of
[review-core-apps.md](review-core-apps.md)). InvoicePay is mounted at `ServicePortal/InvoicePay`
under the customer root `screen/ServicePortal.xml`. SupplierBillUpload is mounted at
`SupplierPortal/BillUpload` under the supplier root `screen/SupplierPortal.xml`. Each root has its
own portal user group and entity filter set (crosscut §5). Neither needs the `BOSS_ACCOUNTING`
grant, and neither runs this root's always-actions. A single-record link is a MoquiConf token
route checked by the proposed Mantle `mantle.party.ExternalAccessServices.check#AccessToken`.

### 1.1 Roles and controls

The role labels below are proposed capabilities, not claims that all groups are seeded:
AR (receivables/collections), AP (bills), treasury (payment/bank operations), GL (journal/asset
books), tax, report reader, finance approver and finance admin. Map these to proposed
`BOSS_ACCOUNTING_AR`, `BOSS_ACCOUNTING_AP`, `BOSS_ACCOUNTING_TREASURY`,
`BOSS_ACCOUNTING_GL`, `BOSS_ACCOUNTING_TAX`, `BOSS_ACCOUNTING_READ`,
`BOSS_ACCOUNTING_APPROVE` and `BOSS_ACCOUNTING_ADMIN` business-capability groups. The root grant controls launcher access; shared services check these capabilities independently and do not require the Accounting app-root grant.
Each business mutation also requires record/organization access. One person may hold several
roles; self-approval is permitted only when the organization explicitly adopts that policy,
and the audit records it. Portal capabilities are distinct from employee app membership.

**Capability map.** The table maps each role label used in this file to its group and actions
(D22). Crosscut §1 holds the suite table of `BOSS_<APP>_<CAPABILITY>` groups; these groups are
its Accounting rows and proposed seed data for crosscut CX-ACCESS (AC-01).

| Label in this file | Group | Actions |
| --- | --- | --- |
| AR | `BOSS_ACCOUNTING_AR` | customer invoices and credits, receipt allocation, collections, dunning, statements, return credit |
| AP | `BOSS_ACCOUNTING_AP` | bills and supplier credits, bill intake, placing a bill hold, payable selection; includes the match operator |
| match operator | proposed `BOSS_ACCOUNTING_MATCH` | evaluate and apply a bill match (D4); the one match group for both apps: AP includes it, and buyers who match bills in Purchasing are given it |
| treasury | `BOSS_ACCOUNTING_TREASURY` | payments, gateway actions, refund payments, bank accounts and bank details, statements, reconciliation, internal transfers |
| GL | `BOSS_ACCOUNTING_GL` | journal entries, asset books, inventory valuation, production cost close preview |
| tax | `BOSS_ACCOUNTING_TAX` | tax statements and their outputs |
| report reader (financial-read) | `BOSS_ACCOUNTING_READ` | reports, and financial values on shared mounts |
| finance approver | `BOSS_ACCOUNTING_APPROVE` | bill approval, hold release, payment run approval, period close, cost close posting, receiptless credit |
| finance admin | `BOSS_ACCOUNTING_ADMIN` | settings, locks, setup and audited data repair |
| credit manager | AR + APPROVE | customer credit policy and credit hold release |
| tax admin | TAX + ADMIN | tax authorities and rates |
| lease and period-run approver | APPROVE + GL | advanced period runs, leases, recognition and intercompany, in each affected organization |

The terms other files use map to the same groups. Customer Service "F" is AR (the credit) plus
TREASURY (the refund payment). Warehouse "financial-read" is READ. Crosscut "financial readers"
is READ, and its "GL/finance approver" is GL plus APPROVE. Purchasing's "separate finance grant"
is APPROVE. The person who places a hold cannot release it.

Posting authority never follows from a visible tab. All invoice, payment, settlement, stock-value
and period mutations use guarded service adapters with current permission, status, balance,
lock-date and idempotency checks. The existing Mantle services remain reusable primitives; the
new guards are requirements, not assertions about their current enforcement. Posted amounts
are corrected by linked reversing/adjusting entries. Partial payment and overdue are derived
conditions from applications and due dates, not free-edit status choices.

The lock, period and idempotency guard runs inside Mantle `mantle.ledger.LedgerServices.post#AcctgTrans`.
That service is the one choke point for direct posting and for every auto-post SECA (AC-06).
Every Mantle mutator a form names below is called via the guarded transition, which adds the
AC-02 status, balance and hold checks before the primitive runs. Examples are `apply#InvoicePayment`,
`close#FinancialTimePeriod`, `deposit#FinancialAccount` and `create#PaymentMethodTrans`. The
BOSS_ACCOUNTING_* groups get no artifact authorization for `unpost#AcctgTrans`,
`update#AcctgTransPosted`, the `repost#*` services or the Mantle REST mutators. Only the
finance-admin data-repair actions (§19) reach a raw rewrite service.

A bulk selection reports success/error per independent document or supplier payment. A single
financial transaction, application set, paired transfer, or document-and-ledger posting is atomic.
Unknown provider outcomes remain pending until reconciled; retry does not create a new payment.
Crosscut §4 supplies the common receipt/matching, return/refund and costing rules.

### 1.2 Menu and landing page

The menu shows only authorized areas and their two-level entries. Detail, wizard and external
screens are reached from the listed entry screens; §2 enumerates them all.

- Home — `Home`.
- Receivables — `Invoices`, `ReceivablesWorkbench`, `Collections`, `Dunning`, `Statements`,
  `RecurringInvoices`, `BillingQueue`.
- Payables — `Bills`, `PayablesWorkbench`, `PaymentRuns`, `ExpensePosting`, `LandedCosts`.
- Payments — `Payments`, `GatewayTransactions`.
- Banking — `BankAccounts`, `StatementImport`, `Reconciliations`, `UnmatchedTransactions`,
  `FinancialAccounts`.
- General ledger — `ChartOfAccounts`, `JournalEntries`, `TransactionEntries`, `JournalBatches`,
  `JournalTemplates`.
- Period close — `Periods`, `PeriodLocks`, `PeriodRuns`; `Leases`, `RevenueRecognition` and
  `Intercompany` appear when their later capabilities are enabled.
- Fixed assets — `FixedAssets`, `AssetClasses`.
- Inventory — `InventoryValuation`, `ProductionCostClose` (paths under `Accounting/Inventory/`).
- Tax — `TaxAuthorities`, `TaxRates`, `TaxStatements`; later `ElectronicInvoices`.
- Budgets — `Budgets`, `BudgetControls`; the Budget variance entry opens `BudgetVariance` in Reports.
- Reports — `Reports` with the named report screens of §13.
- Approvals — shared `Approvals` with finance filters.
- Settings — `Settings`, `Setup`, `AccountingPreferences`, `PostingDefaults`, `PaymentTerms`,
  `Currencies`, `PaymentMethods`, `CollectionPolicies`, `BankRules`, `DocumentSettings`,
  `MatchPolicies`, `CostingPolicies`.

Home contains AR due/overdue, AP due, cash by bank/currency, unmatched statement and unposted
counts; AR/AP aging; GL/subledger tie-out; bills/payment runs needing review; bills on hold;
production runs awaiting cost close; collection activities due; and setup blockers. Every
number links to the same authorized filtered rows.
Base-currency totals show their conversion date/rate basis; document-currency totals are grouped,
not summed across currencies without conversion. Until AC-19 ships, an organization finalizes
and posts only documents in its base currency (D18).

### 1.3 Shell providers, rendering and scope

Palette providers find invoices, payments, parties, accounts and journal entries within the
current organization's permissions. Quick create contributes invoice, bill, payment and draft
journal entry. Today contributes collection follow-ups and due finance approvals; notification
topics carry bill holds, payment-run failures, statement import results, close blockers,
recurring-generation failures, credit holds and production cost review requests. The approval
topics are listed under [Approvals](#approvals-context-passed). Source documents remain authoritative; badges link to them.
Keyboard shortcuts use the shell registry and per-screen scope, never replace global keys.

All screens in this design use XML, including tree, split lists and wizards, so their ordinary
terminal rendering is retained. On terminal, split reconciliation panes become sequential
statement/candidate lists with the same selection and confirmation actions; matrix entry uses
row/period forms. A later custom rendering must add a terminal twin before replacing these.
Desktop is primary; customer invoice viewing/payment and supplier bill submission work at phone
width. Preview/post pairs retain server operation identity across navigation or interrupted requests.

`parity` covers existing baseline behavior; `new` completes the first usable finance flows;
`later` covers advanced runs, electronic invoicing and other explicitly named extensions.
New tax services and new posting guards are release prerequisites, not empty menu placeholders.
Every service prefixed `ironstone.accounting` below is **proposed**. `entity` denotes ordinary
access-controlled reads/configuration CRUD; it never authorizes raw financial-state writes.

### 1.4 Existing automation

These Mantle SECAs and ServiceJobs already run on paths this file designs (D1). Each row says
whether the design keeps it, runs it only under a condition, or replaces it. Crosscut §1.3 holds
the suite register.

| SECA or job | Runs on | This design | Where |
| --- | --- | --- | --- |
| `ShipmentIncomingDeliveredCreateInvoices` | an incoming Shipment reaching ShipDelivered; calls `mantle.account.InvoiceServices.create#PurchaseShipmentInvoices` | conditioned (D2): it runs only for a supplier whose proposed `SupplierProfile.selfBillingIndicator` is set, and then bills accepted, released quantity only (proposed `acceptedOnly` parameter); it never bills a service line | [Bills](#bills); ShipmentDetail |
| `ShipmentOutgoingPackedCreateInvoices` | an outgoing Shipment reaching ShipPacked; calls `create#SalesShipmentInvoices` | kept (D3); proposed `release#ShipmentDraftInvoice` reopens the pack invoice while it is InvoiceInProcess | OrderDetail; ShipmentDetail |
| `InvoiceFinalizedSendEmail` | an Invoice moving from InvoiceInProcess to InvoiceFinalized; calls `send#InvoiceStoreEmail` | conditioned: it skips an invoice version that proposed `send#Invoice` has already sent, so a store invoice is not sent twice | Invoices; InvoiceDetail |
| `InvoiceApplyForPayments`, `PaymentApplyForInvoice` | an Invoice approved or finalized, or a Payment delivered; apply a payment that names `forInvoiceId` | conditioned: for a payable with an open InvoiceHold the payment stays unapplied with a named exception | Bills; PaymentDetail |
| `OrderPlacedAutoApprove` | an OrderHeader reaching OrderPlaced; calls `autoApprove#Order` | conditioned (D7): proposed `CreditServices.evaluate#OrderCredit` runs as a SECA on `mantle.order.OrderInfoServices.check#OrderPreApprove` and adds an approve warning; a Hold result places an OrderHold with reason Credit | OrderDetail; Customer360 |
| `ReturnApprovedProcess` | a ReturnHeader reaching ReturnApproved; calls `create#ReturnShipment` and `process#ReturnItemResponses` | conditioned (D11): it keeps only `create#ReturnShipment`; responses are settled by the proposed `settle#Return` | ReturnDetail |
| `ShipmentDeliveredReturnReceive`, `ReturnReceivedProcess` | a return Shipment delivered; a ReturnHeader reaching ReturnReceived | replaced (D11) by Warehouse's proposed `receive#ReturnItems`, which processes no responses | ReturnDetail |
| `InvoiceGlPost`, `PaymentGlPost`, `PaymentApplicationGlPost`, `AssetReceiptGlPost`, `AssetIssuanceGlPost`, `AssetDetailPhysicalVarianceGlPost` and the other auto-post SECAs of `AccountingLedger.secas.xml` | document and stock changes | kept; each posts through `post#AcctgTrans`, where the AC-06 guard runs; AC-19 adds base-currency conversion | §1.1; AC-06 |
| `AssetIssuanceGlRePost` | any update of an AssetIssuance; calls `repost#AssetIssuance`, which unposts and deletes the posted transaction | replaced (AC-06): the repost writes a dated reversing delta in an open period; BOSS never updates or cancels a posted production issuance | ProductionCostClose |
| ServiceJob `create_RecurringOrders` | nightly; clones recurring orders and invoices those marked `recurAutoInvoice` | kept as a monitored job (D24); RecurringInvoices shows its last result | RecurringInvoices |
| ServiceJob `send_SalesInvoicePastDueEmails` | weekly; paused | kept paused; Dunning is the only scheduled reminder sender, and Setup readiness flags the job if someone unpauses it | Dunning; Setup |

## 2. Screens

One row per screen. Reused rows are fully defined by their canonical owner and have only a
context block here. The screen table's short record names resolve to Mantle unless marked
proposed; framework currency units are `moqui.basic.Uom` and `moqui.basic.UomConversion`.

### Home

| Screen | Path | Archetype | Impl | Purpose | Main record | Reused | Roles | Scope | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Home | `Accounting/Home` | landing | xml | Show cash, due work and ledger health. | `Authorized accounting aggregates` | own | app | parity | organizationPartyId; asOfDate |

### Receivables

| Screen | Path | Archetype | Impl | Purpose | Main record | Reused | Roles | Scope | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Invoices | `Accounting/Receivables/Invoices` | list | xml | Find customer invoices and credit memos. | `Invoice` | own | app | parity | Invoice rows; find parameters |
| InvoiceDetail | `Accounting/Receivables/InvoiceDetail` | detail | xml | Review, finalize, send and settle a customer invoice. | `Invoice invoiceId` | InvoiceDetail, crosscut §3.16 | app | parity | Invoice invoiceId |
| ReceivablesWorkbench | `Accounting/Receivables/ReceivablesWorkbench` | split | xml | Allocate receipts and credits to customer open items. | `Invoice and PaymentApplication` | own | AR; treasury | new | Invoice and PaymentApplication |
| Collections | `Accounting/Receivables/Collections` | list | xml | Prioritize overdue customers and promises. | `WorkEffort; proposed CollectionPromise` | own | AR | new | WorkEffort; proposed CollectionPromise rows; find parameters |
| Dunning | `Accounting/Receivables/Dunning` | list | xml | Review reminder runs and letters before sending. | `Proposed DunningRun and DunningNotice` | own | AR | new | Proposed DunningRun and DunningNotice rows; find parameters |
| Statements | `Accounting/Receivables/Statements` | wizard | xml | Generate and send customer statements. | `Invoice statement projection` | own | AR | parity | Invoice statement projection |
| RecurringInvoices | `Accounting/Receivables/RecurringInvoices` | list | xml | Manage invoice-only schedules and show recurring orders. | `Proposed InvoiceSchedule; OrderHeader recurrence` | own | AR; AP | new | Proposed InvoiceSchedule rows; recurring OrderHeader rows; find parameters |
| Customer360 | `Accounting/Receivables/Customer360` | 360 | xml | Show financial customer context. | `Party partyId` | Customer360, crosscut §3.2 | app | parity | Party partyId |
| InvoicePay | `ServicePortal/InvoicePay` | detail | xml | Let the authorized customer view and pay a sent invoice. | `Invoice invoiceId` | own, external root; no internal app grant | customer portal user or token link | new | Invoice invoiceId; external customer scope |
| BillingQueue | `Accounting/Receivables/BillingQueue` | list | xml | Bill approved project/worker time and expenses within finance access. | `TimeEntry and WorkEffort` | own | AR; AP | parity | TimeEntry and WorkEffort rows; find parameters |

### Payables

| Screen | Path | Archetype | Impl | Purpose | Main record | Reused | Roles | Scope | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Bills | `Accounting/Payables/Bills` | list | xml | Review supplier bills, credits and payment eligibility. | `Invoice` | own | AP | parity | Invoice rows; find parameters |
| BillDetail | `Accounting/Payables/BillDetail` | detail | xml | Review, match, approve and pay a supplier invoice. | `Invoice invoiceId` | InvoiceDetail, crosscut §3.16 | app | parity | Invoice invoiceId |
| InvoiceMatch | `Accounting/Payables/InvoiceMatch` | split | xml | Resolve bill/PO/receipt differences. | `Invoice invoiceId` | InvoiceMatch, crosscut §3.22 | app | new | Invoice invoiceId |
| PayablesWorkbench | `Accounting/Payables/PayablesWorkbench` | split | xml | Review supplier open items and select payments. | `Invoice and PaymentApplication` | own | AP; treasury | new | Invoice and PaymentApplication |
| PaymentRuns | `Accounting/Payables/PaymentRuns` | list | xml | Track proposed and executed supplier payment batches. | `Proposed PaymentRun` | own | treasury | new | Proposed PaymentRun rows; find parameters |
| PaymentRunDetail | `Accounting/Payables/PaymentRunDetail` | wizard | xml | Review and approve payments, then generate bank/check outputs. | `Proposed PaymentRun runId` | own | treasury; finance approver | new | Proposed PaymentRun runId |
| ExpensePosting | `Accounting/Payables/ExpensePosting` | list | xml | Post approved employee/contractor/payroll invoices. | `Invoice` | own | AP | parity | Invoice rows; find parameters |
| LandedCosts | `Accounting/Payables/LandedCosts` | task | xml | Allocate freight, duty and broker charges to the receipts they cost. | `Proposed LandedCostAllocation` | own | AP; GL | new | Proposed LandedCostAllocation; selected InvoiceItem and AssetReceipt rows |
| Supplier360 | `Accounting/Payables/Supplier360` | 360 | xml | Show supplier financial context. | `Party partyId` | Supplier360, crosscut §3.3 | app | parity | Party partyId |
| SupplierBillUpload | `SupplierPortal/BillUpload` | wizard | xml | Accept supplier bill files against the supplier’s own orders. | `Proposed supplier submission; Invoice` | own, external root; no internal app grant | supplier portal user or token link | new | Proposed supplier submission; Invoice |

### Payments

| Screen | Path | Archetype | Impl | Purpose | Main record | Reused | Roles | Scope | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Payments | `Accounting/Payments/Payments` | list | xml | Find receipts, disbursements, refunds and pending validation. | `Payment` | own | AR; AP; treasury | parity | Payment rows; find parameters |
| PaymentDetail | `Accounting/Payments/PaymentDetail` | detail | xml | Control a payment and its allocations. | `Payment paymentId` | own | treasury | parity | Payment paymentId |
| GatewayTransactions | `Accounting/Payments/GatewayTransactions` | list | xml | Investigate gateway attempts and uncertain outcomes. | `PaymentGatewayResponse` | own | treasury | parity | PaymentGatewayResponse rows; find parameters |

### Banking

| Screen | Path | Archetype | Impl | Purpose | Main record | Reused | Roles | Scope | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BankAccounts | `Accounting/Banking/BankAccounts` | list | xml | List company bank/cash methods and balances. | `PaymentMethod and BankAccount` | own | treasury | parity | PaymentMethod and BankAccount rows; find parameters |
| BankAccountDetail | `Accounting/Banking/BankAccountDetail` | detail | xml | Review statements and configure one bank account. | `PaymentMethod paymentMethodId` | own | treasury | parity | PaymentMethod paymentMethodId |
| StatementImport | `Accounting/Banking/StatementImport` | wizard | xml | Import statement files with duplicate and error review. | `PaymentMethodTrans` | own | treasury | parity | PaymentMethodTrans |
| Reconciliations | `Accounting/Banking/Reconciliations` | list | xml | Track draft and completed bank statement sessions. | `Proposed BankReconciliation` | own | treasury | new | Proposed BankReconciliation rows; find parameters |
| ReconciliationDetail | `Accounting/Banking/ReconciliationDetail` | split | xml | Match bank lines and finish a zero-difference statement. | `Proposed BankReconciliation reconciliationId` | own | treasury | new | Proposed BankReconciliation reconciliationId |
| UnmatchedTransactions | `Accounting/Banking/UnmatchedTransactions` | list | xml | Resolve bank lines that automatic matching could not place. | `PaymentMethodTrans` | own | treasury | parity | PaymentMethodTrans rows; find parameters |
| FinancialAccounts | `Accounting/Banking/FinancialAccounts` | list | xml | Find deposits, gift cards and store-credit accounts. | `FinancialAccount` | own | app | parity | FinancialAccount rows; find parameters |
| FinancialAccountDetail | `Accounting/Banking/FinancialAccountDetail` | detail | xml | Control stored-value account transactions. | `FinancialAccount finAccountId` | own | treasury | parity | FinancialAccount finAccountId |

### General ledger

| Screen | Path | Archetype | Impl | Purpose | Main record | Reused | Roles | Scope | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ChartOfAccounts | `Accounting/GeneralLedger/ChartOfAccounts` | list | xml | Maintain the account tree and organization assignments. | `GlAccount` | own | GL | parity | GlAccount rows; find parameters |
| AccountDetail | `Accounting/GeneralLedger/AccountDetail` | detail | xml | Edit one account and its organization mappings. | `GlAccount glAccountId` | own | GL | parity | GlAccount glAccountId |
| JournalEntries | `Accounting/GeneralLedger/JournalEntries` | list | xml | Find draft and posted ledger transactions. | `AcctgTrans` | own | GL | parity | AcctgTrans rows; find parameters |
| JournalEntryDetail | `Accounting/GeneralLedger/JournalEntryDetail` | detail | xml | Balance, post and reverse one accounting transaction. | `AcctgTrans acctgTransId` | own | GL | parity | AcctgTrans acctgTransId |
| TransactionEntries | `Accounting/GeneralLedger/TransactionEntries` | list | xml | Search ledger lines across transactions. | `AcctgTransEntry` | own | GL | parity | AcctgTransEntry rows; find parameters |
| JournalBatches | `Accounting/GeneralLedger/JournalBatches` | list | xml | Group transactions into Mantle posting batches. | `GlJournal` | own | GL | parity | GlJournal rows; find parameters |
| JournalTemplates | `Accounting/GeneralLedger/JournalTemplates` | detail | xml | Maintain reusable manual-entry templates. | `Proposed AcctgTransTemplate` | own | GL | new | Proposed AcctgTransTemplate |

### Period close

| Screen | Path | Archetype | Impl | Purpose | Main record | Reused | Roles | Scope | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Periods | `Accounting/PeriodClose/Periods` | list | xml | Manage fiscal years and child periods. | `TimePeriod` | own | GL | parity | TimePeriod rows; find parameters |
| PeriodCloseDetail | `Accounting/PeriodClose/PeriodCloseDetail` | wizard | xml | Resolve blockers and close a fiscal period. | `TimePeriod timePeriodId` | own | finance approver | parity | TimePeriod timePeriodId |
| PeriodLocks | `Accounting/PeriodClose/PeriodLocks` | settings | xml | Configure typed posting locks and time-limited exceptions. | `Proposed AccountingLock and AccountingLockException` | own | finance admin | new | Proposed AccountingLock and AccountingLockException |
| PeriodRuns | `Accounting/PeriodClose/PeriodRuns` | list | xml | Review scheduled depreciation, FX, deferral and later runs. | `Proposed AccountingPeriodRun` | own | GL | new | Proposed AccountingPeriodRun rows; find parameters |
| AdvancedPeriodRun | `Accounting/PeriodClose/AdvancedPeriodRun` | wizard | xml | Preview and post FX revaluation and scheduled deferrals. | `Proposed AccountingPeriodRun runId` | own | finance approver | later | Proposed AccountingPeriodRun runId |
| Leases | `Accounting/PeriodClose/Leases` | detail | xml | Design lease schedules and their period postings. | `Proposed AccountingLease` | own | finance approver | later | Proposed AccountingLease |
| RevenueRecognition | `Accounting/PeriodClose/RevenueRecognition` | detail | xml | Design contract recognition schedules linked to invoices. | `Proposed RevenueSchedule` | own | finance approver | later | Proposed RevenueSchedule |
| Intercompany | `Accounting/PeriodClose/Intercompany` | wizard | xml | Design balanced transactions and consolidation adjustments across organizations. | `Proposed IntercompanyBatch` | own | lease and period-run approver in each organization | later | Proposed IntercompanyBatch |

### Fixed assets

| Screen | Path | Archetype | Impl | Purpose | Main record | Reused | Roles | Scope | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FixedAssets | `Accounting/FixedAssets/FixedAssets` | list | xml | Find financial books on the common asset register. | `Asset` | own | GL | parity | Asset rows; find parameters |
| EquipmentDetail | `Accounting/FixedAssets/EquipmentDetail` | detail | xml | Maintain book information on the shared asset record. | `Asset assetId` | EquipmentDetail, crosscut §3.10 | app | parity | Asset assetId |
| AssetClasses | `Accounting/FixedAssets/AssetClasses` | settings | xml | Set book defaults by asset class. | `Proposed FixedAssetClass` | own | finance admin | new | Proposed FixedAssetClass |
| DepreciationRunDetail | `Accounting/FixedAssets/DepreciationRunDetail` | wizard | xml | Preview, post and reverse depreciation by period. | `Proposed AccountingPeriodRun runId` | own | finance approver | new | Proposed AccountingPeriodRun runId |

### Inventory

| Screen | Path | Archetype | Impl | Purpose | Main record | Reused | Roles | Scope | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| InventoryValuation | `Accounting/Inventory/InventoryValuation` | report | xml | Tie inventory and production value to stock and ledger. | `Asset; AssetValuationSummary view` | own | GL; report reader | parity | organization/date/currency filters; selected source rows |
| ProductionCostClose | `Accounting/Inventory/ProductionCostClose` | task | xml | Review and post production absorption, output allocation and variances. | proposed ProductionCostEvent; ProductionCostAllocation | own | GL; finance approver | new | organization, production run, source revision and accounting date |

### Tax

| Screen | Path | Archetype | Impl | Purpose | Main record | Reused | Roles | Scope | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TaxAuthorities | `Accounting/Tax/TaxAuthorities` | list | xml | Maintain common tax jurisdictions and party/category assignments. | `TaxAuthority` | own | tax admin | new | TaxAuthority rows; find parameters |
| TaxRates | `Accounting/Tax/TaxRates` | settings | xml | Maintain effective local rates behind the tax gateway. | `Proposed corrected TaxAuthorityRate` | own | tax admin | new | Proposed corrected TaxAuthorityRate |
| TaxStatements | `Accounting/Tax/TaxStatements` | list | xml | Prepare, review and export tax statement records. | `TaxStatement` | own | tax | new | TaxStatement rows; find parameters |
| TaxStatementDetail | `Accounting/Tax/TaxStatementDetail` | detail | xml | Review tax totals, source lines and output validation. | `TaxStatement taxStatementId` | own | tax | new | TaxStatement taxStatementId |
| ElectronicInvoices | `Accounting/Tax/ElectronicInvoices` | list | xml | Track inbound/outbound electronic-invoice processing. | `InvoiceSystemMessage; proposed InvoiceExchange` | own | tax; AP; AR | later | InvoiceSystemMessage; proposed InvoiceExchange rows; find parameters |

### Budgets

| Screen | Path | Archetype | Impl | Purpose | Main record | Reused | Roles | Scope | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Budgets | `Accounting/Budgets/Budgets` | list | xml | Find GL budgets and revisions. | `Budget` | own | GL | parity | Budget rows; find parameters |
| BudgetDetail | `Accounting/Budgets/BudgetDetail` | detail | xml | Edit account-by-period budgets and review changes. | `Budget budgetId` | own | GL; finance approver | parity | Budget budgetId |
| BudgetControls | `Accounting/Budgets/BudgetControls` | settings | xml | Set warning/stop rules for commitments and expenses. | `Proposed BudgetControlPolicy` | own | finance admin | new | Proposed BudgetControlPolicy |

### Reports

| Screen | Path | Archetype | Impl | Purpose | Main record | Reused | Roles | Scope | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Reports | `Accounting/Reports/Reports` | landing | xml | Choose financial and operational financial reports. | `Report catalog` | own | app | parity | Report catalog |
| TrialBalance | `Accounting/Reports/TrialBalance` | report | xml | Trial balance with opening/debit/credit/ending balances. | `GlAccountOrgTimePeriod` | own | report reader | parity | organization/date/currency filters; selected source rows |
| GeneralLedger | `Accounting/Reports/GeneralLedger` | report | xml | Read posted entries with account and source drill-down. | `mantle.ledger.LedgerReportServices.get#AccountLedgerInfo` | own | report reader | parity | organization/date/currency filters; selected source rows |
| PartnerLedger | `Accounting/Reports/PartnerLedger` | report | xml | Read customer/supplier account movements and open items. | `ironstone.accounting.ReportServices.run#PartnerLedger` | own | report reader | new | organization/date/currency filters; selected source rows |
| BalanceSheet | `Accounting/Reports/BalanceSheet` | report | xml | Compare assets, liabilities and equity. | `mantle.ledger.LedgerReportServices.run#BalanceSheet` | own | report reader | parity | organization/date/currency filters; selected source rows |
| IncomeStatement | `Accounting/Reports/IncomeStatement` | report | xml | Compare income and expense by period. | `mantle.ledger.LedgerReportServices.run#IncomeStatement` | own | report reader | parity | organization/date/currency filters; selected source rows |
| CashFlow | `Accounting/Reports/CashFlow` | report | xml | Explain cash inflows and outflows. | `mantle.ledger.LedgerReportServices.run#CashFlowStatement` | own | report reader | parity | organization/date/currency filters; selected source rows |
| RetainedEarnings | `Accounting/Reports/RetainedEarnings` | report | xml | Explain beginning balance and period movements. | `mantle.ledger.LedgerReportServices.run#RetainedEarningsStatement` | own | report reader | parity | organization/date/currency filters; selected source rows |
| FinancialRatios | `Accounting/Reports/FinancialRatios` | report | xml | Display ratios with numerator and denominator drill-down. | `mantle.ledger.LedgerReportServices.run#FinancialRatios` | own | report reader | parity | organization/date/currency filters; selected source rows |
| Aging | `Accounting/Reports/Aging` | report | xml | Age receivables/payables and inspect individual invoices. | `ironstone.accounting.ReportServices.run#Aging` | own | report reader | parity | organization/date/currency filters; selected source rows |
| InvoiceReconciliation | `Accounting/Reports/InvoiceReconciliation` | report | xml | Find subledger/GL and application integrity differences. | `ironstone.accounting.ReportServices.run#InvoiceReconciliation` | own | report reader | parity | organization/date/currency filters; selected source rows |
| BudgetVariance | `Accounting/Reports/BudgetVariance` | report | xml | Compare approved budget, commitment and actual. | `mantle.other.BudgetReportServices.run#BudgetExpenseReport` | own | report reader | parity | organization/date/currency filters; selected source rows |
| AccountBalance | `Accounting/Reports/AccountBalance` | report | xml | Compare account balance history. | `mantle.ledger.LedgerReportServices.get#PeriodSeriesSummary` | own | report reader | parity | organization/date/currency filters; selected source rows |
| PostedSummary | `Accounting/Reports/PostedSummary` | report | xml | Group posted amounts and balances. | `mantle.ledger.LedgerReportServices.run#PostedAmountSummary` | own | report reader | parity | organization/date/currency filters; selected source rows |
| SalesAnalysis | `Accounting/Reports/SalesAnalysis` | report | xml | Analyze sales order/invoice and source reconciliation. | `ironstone.accounting.ReportServices.run#SalesAnalysis` | own | report reader | parity | organization/date/currency filters; selected source rows |
| StockTransactions | `Accounting/Reports/StockTransactions` | report | xml | Read on-hand, receipt/status and package source reports. | `ironstone.accounting.ReportServices.run#StockTransactions` | own | report reader | parity | organization/date/currency filters; selected source rows |

### Related records

| Screen | Path | Archetype | Impl | Purpose | Main record | Reused | Roles | Scope | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| OrderDetail | `Accounting/Records/OrderDetail` | detail | xml | Inspect source orders and invoicing eligibility. | `OrderHeader orderId` | OrderDetail, crosscut §3.6 | app | parity | OrderHeader orderId |
| ShipmentDetail | `Accounting/Records/ShipmentDetail` | detail | xml | Inspect physical sources behind invoices and value. | `Shipment shipmentId` | ShipmentDetail, crosscut §3.8 | app | parity | Shipment shipmentId |
| Product360 | `Accounting/Records/Product360` | 360 | xml | Inspect product costs and account mappings. | `Product productId` | Product360, crosscut §3.5 | app | parity | Product productId |
| ReturnDetail | `Accounting/Records/ReturnDetail` | detail | xml | Credit or refund eligible customer/supplier returns. | `ReturnHeader returnId` | ReturnDetail, crosscut §3.18 | app | parity | ReturnHeader returnId |
| Approvals | `Accounting/Approvals` | list | xml | Review finance approval requests in the shared center. | `Source approval provider` | Approvals waiting, crosscut §3.15 | app | new | Source approval provider rows; find parameters |

### Settings

| Screen | Path | Archetype | Impl | Purpose | Main record | Reused | Roles | Scope | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Settings | `Accounting/Settings/Settings` | settings | xml | Index accounting policy and organization setup. | `PartyAcctgPreference` | own | finance admin | parity | PartyAcctgPreference |
| Setup | `Accounting/Settings/Setup` | wizard | xml | Activate one organization’s accounting with reviewed opening balances. | `PartyAcctgPreference; proposed AccountingSetupRun` | own | finance admin | new | PartyAcctgPreference; proposed AccountingSetupRun |
| AccountingPreferences | `Accounting/Settings/AccountingPreferences` | settings | xml | Maintain organization accounting defaults. | `PartyAcctgPreference` | own | finance admin | parity | PartyAcctgPreference |
| PostingDefaults | `Accounting/Settings/PostingDefaults` | settings | xml | Maintain common account mappings and missing-configuration queues. | `mantle.ledger.config records` | own | finance admin | parity | mantle.ledger.config records |
| PaymentTerms | `Accounting/Settings/PaymentTerms` | settings | xml | Maintain invoice settlement terms. | `SettlementTerm` | own | finance admin | new | SettlementTerm |
| Currencies | `Accounting/Settings/Currencies` | settings | xml | Maintain currencies and dated exchange-rate inputs. | `Uom and UomConversion` | own | finance admin | parity | Uom and UomConversion |
| PaymentMethods | `Accounting/Settings/PaymentMethods` | settings | xml | Configure allowed instruments and scoped gateway bindings. | `PaymentMethod and PaymentGatewayConfig` | own | finance admin; treasury | parity | PaymentMethod and PaymentGatewayConfig |
| CollectionPolicies | `Accounting/Settings/CollectionPolicies` | settings | xml | Configure dunning levels and credit policies. | `Proposed DunningLevel and CustomerCreditPolicy` | own | finance admin | new | Proposed DunningLevel and CustomerCreditPolicy |
| BankRules | `Accounting/Settings/BankRules` | settings | xml | Configure auditable matching suggestions. | `Proposed BankMatchRule` | own | finance admin; treasury | new | Proposed BankMatchRule |
| DocumentSettings | `Accounting/Settings/DocumentSettings` | settings | xml | Choose document templates and numbering. | `PartyAcctgPreference; template resources` | own | finance admin | new | PartyAcctgPreference; template resources |
| MatchPolicies | `Accounting/Settings/MatchPolicies` | settings | xml | Set bill-match tolerances, bill basis and the self-billing default. | `Proposed InvoiceMatchPolicy` | own | finance admin | new | Proposed InvoiceMatchPolicy |
| CostingPolicies | `Accounting/Settings/CostingPolicies` | settings | xml | Set production overhead, co-product allocation and variance accounts. | `Proposed ProductionAllocationPolicy` | own | finance admin | new | Proposed ProductionAllocationPolicy |

## 3. Home

### Home

**Layout:** landing.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| AccountingSummary | display | Choose organization and read setup health | organization, as-of date, base currency, last successful refresh | — | proposed `ironstone.accounting.HomeServices.get#Summary` | Accounting/dashboard OrgInternalForm; Carbon invoicing dashboard |
| MoneyCards | component | Open the filtered work queue behind each number | AR due/overdue, AP due, bank balances, unmatched lines, unposted documents | dashboard; number cards | proposed `ironstone.accounting.HomeServices.get#Summary` | Carbon AR/AP aging and subledger tie-out |
| MyFinanceWork | list | Work assigned to the current finance user | bill approvals, bills on hold, failed batches, close blockers, production runs awaiting cost close, collection activities | — | proposed `ironstone.accounting.HomeServices.get#Work`; proposed `ironstone.accounting.ProductionCostServices.find#CostCloseQueue` | Odoo journal cards; existing approvals/Today providers |

**Actions:** Open each number with its organization/date filters. Quick create invoice, bill, payment or journal entry checks the relevant capability. An unconfigured organization gets Setup as primary.

**States:** A failed aggregate is unavailable, never zero. Show cached result with its timestamp while retrying; an inaccessible account contributes no names or amounts.

**Navigation:** The home entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §1 and §17; Carbon `apps/erp/app/modules/accounting/ui/Activation/ReadinessChecklist.tsx`; SimpleScreens Accounting/dashboard. Home replaces the baseline `Accounting/OrgInternalSummary`, so its scope is `parity`.

**Needs:** AC-01; AC-07; AC-12; AC-18.

## 4. Receivables

### Invoices

**Layout:** list.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| InvoiceFind | find | Select an AR queue | customer, status, dates, due range, currency, invoice type | — | — | Accounting/Invoice/FindInvoice MainOptions |
| InvoiceList | list | Read balances and source links | invoice, customer, date, due, total, unapplied/paid, unpaid, status | — | entity | Accounting/Invoice/FindInvoice InvoiceList; AgingSummaryList |
| CreateReceivable | dialog | Create an invoice or customer credit | customer, organization, type, currency, date, due/terms, reference | — | mantle.account.InvoiceServices.create#Invoice | Accounting/Invoice/FindInvoice NewReceivableForm; NewCustCreditForm |
| InvoiceBatch | list, bulk | Review and send selected eligible documents | selection, template, recipient preview, result per invoice | — | proposed `ironstone.accounting.InvoiceServices.process#Batch`; proposed `ironstone.accounting.InvoiceServices.send#Invoice` | Odoo account_move_send batch wizard |

**Actions:** Tabs Draft, Unpaid, Overdue, Credits, All use derived balances. New opens InvoiceDetail. Send/print/export are selected-row operations; each invoice failure is named and the rest continue.

Send calls proposed `send#Invoice` for each invoice, with or without a ProductStore. It renders the
invoice version and its attachments. It issues the InvoicePay link through
proposed `ironstone.accounting.PortalServices.issue#InvoiceAccess`, a token route. It sends through
`mantle.party.CommunicationServices.send#EmailDraft` and records the outcome per recipient.
Projects' `ironstone.projects.BillingServices.send#Invoice` calls it for project invoices. The
Mantle SECA `InvoiceFinalizedSendEmail` skips an invoice version already sent this way (§1.4).

**Views:** List, pivot and graph over the same filtered dataset; calendar by dueDate. No drag-to-paid action.

**Navigation:** The receivables entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §4, §13, §17; Odoo `odoo/addons/account/wizard/account_move_send_wizard.py`.

**Needs:** AC-02; AC-18.

### InvoiceDetail (Context passed)

**Context passed.** Mount `Accounting/Receivables/InvoiceDetail` using InvoiceDetail, crosscut §3.16. Mount `Shared/InvoiceDetail` with receivables direction and organization fixed. Tabs: Overview, Items/taxes, Payments/credits, Orders, Shipments, Budget details, GL, Files, Chatter, History. AR edits drafts, sends and applies eligible receipts. Finalize, reverse and credit need AR, plus finance approver where the organization's policy requires approval. Preserve Projects time/milestone links and its narrower client view. Actions use the shared contract, including `mantle.account.InvoiceServices.get#InvoiceDisplayInfo`, `create#InvoiceCreditMemo`, `reverse#Invoice` and `mantle.account.PaymentServices.apply#InvoiceToInvoice`.

Every state change (approve, finalize, resume, cancel) goes through proposed `ironstone.accounting.InvoiceServices.change#InvoiceState`, the single state guard (D6). Projects' `ironstone.projects.BillingServices.update#InvoiceStatus` calls it, so the Projects labels do not change. InvoiceSend uses proposed `send#Invoice` ([Invoices](#invoices)). A finalized invoice is corrected only through the crosscut InvoiceCorrection dialog. Until AC-19 ships, finalizing an invoice whose currency differs from the organization's base currency is refused.

**Needs:** AC-02; AC-08; AC-11; AC-19.

### ReceivablesWorkbench

**Layout:** split.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| OpenItemFind | find | Fix party and accounting scope | organization, customer, currency, as-of date, due bucket | — | — | Carbon ARAP workbench |
| OpenItems | list | Compare available and outstanding balances | invoice/payment/credit id, date, due, original, remaining, selected amount | two lists; row selection | proposed `ironstone.accounting.SettlementServices.find#OpenItems` | Accounting/Invoice/EditInvoice UnpaidInvoiceList; UnappliedPaymentList |
| Allocation | list, editable rows | Preview an application set | source credit/payment, target invoice, applied amount, currency, difference reason | — | mantle.account.PaymentServices.apply#InvoicePayment; mantle.account.PaymentServices.apply#InvoiceToInvoice; mantle.account.PaymentServices.apply#PaymentToPayment; mantle.account.PaymentServices.unapply#PaymentApplication | Accounting/Payment/EditPayment PaymentApplicationList; Carbon payment applications |

**Actions:** Preview then confirm allocation atomically per party/currency set. Lock balances and re-read before applying; stale previews refresh. Discount/write-off/FX requires the proposed settlement adapter and explicit accounts, never a silently reduced balance. A realized exchange difference is booked by `mantle.ledger.PaymentAutoPostServices.post#PaymentApplication` to `GatForExGain` or `GatForExLoss` once AC-19 ships; until then every document is in the organization's base currency (D18).

**Navigation:** The receivables entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §5, §7, §13; Carbon invoicing ARAP workbench; baseline payment applications.

**Needs:** AC-02; AC-12; AC-19.

### Collections

**Layout:** list.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| CollectionFind | find | Select work by collector and due date | collector, bucket, customer, next action, dispute, promise state | — | — | Frappe Lending collection case |
| CollectionRows | list | Read the customer position and next action | customer, overdue, oldest due, agent, last contact, next action, promise | — | proposed `ironstone.accounting.CollectionServices.find#Work` | Carbon ARAP workbench; Frappe Lending collection activity |
| CollectionActivity | dialog | Record a call/email outcome and next action | customer, activity type, outcome, note, next due, assigned person | — | proposed `ironstone.accounting.CollectionServices.record#Activity` | Commons activities; Frappe Lending collection activity |
| Promise | dialog | Capture a dated payment promise | customer, organization, currency, amount, promised date, linked invoices, note | — | proposed `ironstone.accounting.CollectionServices.store#Promise` | Frappe Lending promise to pay |

**Actions:** Open Customer360, record contact, schedule follow-up, record/dispute promise, preview a reminder. Promises reconcile against qualifying payments; they never mark an invoice paid. A disputed invoice is excluded from automatic reminder runs until reviewed.

**Views:** List; board by collection state; calendar by next-action date.

**Navigation:** The receivables entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §5 and §13; Frappe Lending collection case/activities; Commons activities.

**Needs:** AC-10; AC-11.

### Dunning

**Layout:** list.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| DunningSelection | find | Choose overdue scope | organization, due-through, customer class, level, collector | — | — | ERPNext Dunning |
| NoticePreview | list | Review recipients and excluded invoices | customer, overdue, disputed/held, level, last notice, next notice, delivery | — | proposed `ironstone.accounting.CollectionServices.preview#Dunning` | ERPNext Dunning overdue payments |
| SendNotices | list, bulk | Send the approved preview and record results | run, selected notices, template, channel, send result | — | proposed `ironstone.accounting.CollectionServices.send#Dunning`; mantle.account.InvoiceServices.send#CustomerPastDueEmail | Accounting/Invoice/EditInvoice SendPastDueEmailForm; ERPNext Dunning Letter |

**Actions:** Generate preview, inspect a letter, confirm Send. Idempotency is per customer/invoice-set/level/run; one recipient failure does not restart successful sends. Fees and interest are later, require a separate reviewed invoice/adjustment, and are never implicit email side effects. Dunning runs are the only scheduled reminder sender. Mantle's weekly `send_SalesInvoicePastDueEmails` job stays paused, and Setup readiness flags it if someone unpauses it (§1.4).

**Navigation:** The receivables entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §5; ERPNext `erpnext/accounts/doctype/dunning_type/dunning_type.json`.

**Needs:** AC-10; AC-18.

### Statements

**Layout:** wizard.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| StatementOptions | wizard step | Choose period and recipients | organization, customers, as-of date, from date, currency, include zero balance | — | mantle.account.InvoiceServices.get#ReceivableStatementInfo | Accounting/Invoice/FindInvoice CustomerStatementForm; ReportList CustomerStatementForm |
| StatementPreview | display | Review totals and documents | customer, opening, invoices, payments, closing, currency | — | mantle.account.InvoiceServices.get#ReceivableStatementInfo | Accounting/Invoice/ReceivableStatement; ERPNext process_statement_of_accounts |
| StatementDelivery | wizard step | Print/download or send the reviewed set | template, recipient, attachment, batch result | — | proposed `ironstone.accounting.CollectionServices.send#Statements` | ERPNext Process Statement of Accounts |

**Actions:** Preview is mandatory before a send. Print/download uses the same as-of snapshot; sent statements retain recipient and snapshot reference. Batch failures are per recipient.

**Navigation:** The receivables entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §5, §13, §17; baseline ReceivableStatement.

**Needs:** AC-10; AC-18.

### RecurringInvoices

**Layout:** list.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ScheduleList | list | Show next due and last generation | schedule, party, direction, next date, last invoice, paused, errors | — | proposed `ironstone.accounting.RecurringServices.find#Schedules` | Akaunting recurring invoices; Dolibarr invoice templates |
| RecurringOrders | list, read | Show recurring orders and their last clone and invoice | order, customer, recurrence (`recurCronExpression`), auto-invoice (`recurAutoInvoice`), last clone, last invoice, job result | link to OrderDetail Recurrence | entity (OrderHeader); job `create_RecurringOrders` (`mantle.order.OrderServices.create#RecurringOrders`) | crosscut §3.6 OrderDetail Recurrence form |
| ScheduleEdit | dialog | Set an invoice-only billing cadence and source | template invoice/subscription, organization, cadence, interval, start/end, due terms, auto-send | — | proposed `ironstone.accounting.RecurringServices.store#Schedule` | ERPNext Subscription; Akaunting recurring form |
| GeneratePreview | dialog | Preview the next billing period | schedule, period, invoice date, proration, amount, tax result | — | proposed `ironstone.accounting.RecurringServices.preview#Period` | ERPNext Subscription generation |

**Actions:** Preview, generate draft, pause/resume and inspect last result. Generation key is schedule+period; source changes create a revised schedule for future periods. Default produces drafts; opt-in auto-send still requires successful tax/credit/period validation.

The screen lists two sources (D24). Order-based recurring billing stays on the OrderHeader
recurrence, which is edited in OrderDetail's Recurrence form; the nightly `create_RecurringOrders`
job clones and invoices those orders, and RecurringOrders shows them read-only with its last
result. Proposed InvoiceSchedule serves only invoice-only cadences: rent, retainers and recurring
supplier bills.

**Navigation:** The receivables entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §4, §6; ERPNext Subscription; existing InvoiceTemplate and Subscription records; Mantle OrderHeader recurrence.

**Needs:** AC-09; AC-08.

### Customer360 (Context passed)

**Context passed.** Mount `Accounting/Receivables/Customer360` using Customer360, crosscut §3.2. Fix customer and organization. Tabs: Contact, Orders, Invoices/payments, Credit, Agreements, Activities, Files, as the crosscut Accounting row has them. Invoices/payments holds the crosscut CustomerAging list and CustomerFinancialSummary display, and its Statement action opens Statements with the customer fixed (crosscut additions R-XC-41 and R-XC-42). Show credit limit/currency/overdue threshold and its source policy. A credit manager edits the policy in the CustomerCredit form through proposed `ironstone.accounting.CreditServices.store#Policy`, and releases a credit hold with a reason through proposed `release#CreditHold`. The shared PaymentDetails, PartyIdentifications and TaxRegistrations forms show here (D26); PaymentDetails and TaxRegistrations are finance-gated, and bank details are masked. Customer Service readers get allowed balances/hold reason, not bank credentials. Activities and promises are the same ones Collections records, and they show here (D25). Source: Party/FinancialInfo and research §13.

**Needs:** AC-10; AC-11; AC-12.

### InvoicePay

**Physical definition.** Proposed `screen/Shared/InvoicePay.xml` is owned here. It is mounted
at `ServicePortal/InvoicePay` under the customer audience root `screen/ServicePortal.xml`
(crosscut §5; D5), and a future customer account mount uses the same record-scoped page and
service contract. The internal Accounting launcher grant is not a customer-access requirement.
A single-invoice link is a MoquiConf token route (for example `/pay/<token>`) whose token service
is proposed `mantle.party.ExternalAccessServices.check#AccessToken`. InvoiceSend issues the link
through proposed `PortalServices.issue#InvoiceAccess`. The app `PortalServices` wrap the Mantle
`ExternalAccessServices` capability services and call the proposed `check#AccessCapability` first; they keep
no token or expiry rules of their own.

**Layout:** detail.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| PublicInvoice | display | Show the customer-approved document | number, issue/due date, lines, tax, total, paid, due | — | proposed `ironstone.accounting.PortalServices.get#Invoice` | Akaunting signed invoice portal; Projects client invoice view |
| PayInvoice | single | Start hosted or tokenized payment | invoice, amount due, allowed payment method, payer confirmation, request identity | — | proposed `ironstone.accounting.PortalServices.start#InvoicePayment` | Odoo payment portal; Frappe payments checkout |
| PaymentResult | display | Show confirmed payment or pending gateway result | attempt id, amount, gateway state, receipt, next action | — | proposed `ironstone.accounting.PortalServices.get#PaymentResult` | Frappe payments success/failed/cancel pages |

**Actions:** The external route is separate from the internal Accounting app grant: the ServicePortal group has no Accounting grant and runs no Accounting always-actions. A record-scoped token or authenticated customer relationship grants view; a gateway-confirmed result grants payment settlement. Redirect return parameters never mark paid. Keep pending visible and let retry resume the existing attempt.

**States:** Expired/revoked/foreign token returns unavailable without disclosing invoice existence. No Chatter, cost, internal time rates, bank secrets or unrelated party navigation.

**Navigation:** Open from the sent invoice link or an authenticated customer's permitted invoice
list. Return to that external origin or show the submission/payment receipt. Source links expose
only explicitly permitted customer records; this page does not open internal Accounting navigation.

**Source:** research §4, §7 and §16; Projects client isolation contract; crosscut §5.

**Needs:** AC-02; AC-18; CX-PORTALS.

### BillingQueue

**Layout:** list.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| UnbilledTime | list, read | Show authorized unbilled work | project, customer/worker, approved hours, expenses, rate basis, through date | — | entity; proposed `ironstone.accounting.InvoiceServices.find#Unbilled` | Projects Unbilled; Accounting/Invoice/FindInvoice ProjectInvoice; ProjectWorkerInvoice; WorkerInvoice |
| CreateTimeInvoice | dialog | Create draft customer or worker invoice | project, customer/worker, through date, existing draft, grouping, direction | — | mantle.account.InvoiceServices.create#ProjectInvoiceItems; mantle.account.InvoiceServices.create#WorkerInvoiceItems; mantle.account.InvoiceServices.create#TimeEntryInvoiceItems; mantle.account.InvoiceServices.create#ProjectExpenseInvoice | Accounting/Invoice/FindInvoice ProjectInvoice; ProjectWorkerInvoice; WorkerInvoice |

**Actions:** Create a draft and open InvoiceDetail/BillDetail. Preserve Projects approved timesheet and billing locks; an already billed entry cannot be selected twice. Accounting does not alter time approval. Mount remains available without Projects app grant when finance has the underlying project billing capability.

**Navigation:** The receivables entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §16–§17; Projects §10 and current time/invoice services.

**Needs:** AC-02.

## 5. Payables

### Bills

**Layout:** list.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| BillFind | find | Select AP work | supplier, status, receipt range, due, hold, unmatched, currency | — | — | Accounting/Invoice/FindInvoice MainOptions; Odoo bill filters |
| BillList | list | Show supplier invoices and control states | bill, supplier reference, due, total, unpaid, match, hold, approval | — | entity; proposed `ironstone.accounting.MatchServices.find#BillExceptions` | Accounting/Invoice/FindInvoice InvoiceList |
| CreatePayable | dialog | Create a bill or supplier credit | supplier, organization, type, reference, currency, date, due/terms | — | mantle.account.InvoiceServices.create#Invoice | Accounting/Invoice/FindInvoice NewPayableForm; NewSupCreditForm |
| BillUpload | dialog | Capture source files for review | supplier, file, supplier invoice reference, document date, PO | — | proposed `ironstone.accounting.InvoiceServices.import#Bill` | Odoo bill uploader; Carbon purchase invoice extraction |
| HoldInvoice | dialog | Place a hold on one bill or on the selected bills | invoice, invoice revision, hold reason, release or review date, note, operation key | applies to the list selection | proposed `ironstone.accounting.MatchServices.hold#Invoice` | ERPNext Purchase Invoice hold (`on_hold`, `release_date`, `hold_comment`) |

**Actions:** Incoming, Review, Held, Approved, Due, Credits tabs. Upload creates a draft and preserves the original; extraction suggestions require review. Detect supplier/reference duplicates in organization scope. Approve only after matching policy passes or recorded release. Create from a PO or a receipt opens the InvoiceFromSource dialog on OrderDetail or ShipmentDetail (§14).

**Bill creation (D2).** Accounting owns bill intake. By default a receipt creates no bill. The
Mantle SECA `ShipmentIncomingDeliveredCreateInvoices` runs only for a supplier whose proposed
`SupplierProfile.selfBillingIndicator` is set (finance sets it on Supplier360). For that
supplier it calls `create#PurchaseShipmentInvoices` with the proposed `acceptedOnly=true`
parameter. That bills accepted, released quantity at the PO price, skips the leftover line with no
asset, and excludes quantity under open inspection. It never bills a service line; a service or
subcontract bill comes only through the proposed `import#Bill` (D14). `import#Bill` is keyed by organization,
supplier and supplier invoice reference, or by shipmentId for a self-billed draft. A second bill
with the same key is refused and the earlier one is named. For a self-billed receipt, an upload
attaches its evidence to the existing draft instead of creating a bill. Matching evaluates a
self-billed draft two-way, against the PO and the accepted receipt.

**Holds (D4).** AP places a hold with HoldInvoice, or with Place hold on BillDetail and
InvoiceMatch, through proposed `MatchServices.hold#Invoice`. Seeded hold reasons (proposed):
match exception, AP review, supplier dispute, bank-detail change. A finance approver who did not
place the hold releases it with the proposed `release#InvoiceHold`. Purchasing asks for a release through
proposed `MatchServices.request#HoldRelease`, which posts an Approvals item (topic
`BillHoldRelease`). A hold blocks every payment path, not only payment runs. PaymentRunDetail
execution, InvoiceSettlement's proposed `apply#Settlement` and the guard around payable
`mantle.account.PaymentServices.create#InvoicePayment` and `apply#InvoicePayment` refuse a bill
with an open InvoiceHold. A payment that Mantle applies by `forInvoiceId` (the
`PaymentApplyForInvoice` SECA) stays unapplied with a named exception.

**Navigation:** The payables entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §6; ERPNext Purchase Invoice; baseline FindInvoice.

**Needs:** AC-02; AC-03; AC-18.

### BillDetail (Context passed)

**Context passed.** Mount `Accounting/Payables/BillDetail` using InvoiceDetail, crosscut §3.16. Mount Shared/InvoiceDetail with payable direction. Tabs: Overview, Items/taxes, Match, Payments, Orders, Shipments, Budget details, GL, source document, Chatter, History. Incoming → Received → Approved → Payment Sent retains Mantle status IDs. Separate invoice hold from approval state and show reason/release date. Payment never bypasses hold. Match opens InvoiceMatch; supplier return credit links ReturnDetail. A match operator (AP, or a Purchasing buyer granted the capability) applies the match through proposed `MatchServices.apply#InvoiceMatch` (D4). Place hold opens the HoldInvoice dialog (`hold#Invoice`, AP). Only a finance approver releases a hold (`release#InvoiceHold`) and approves the bill, through proposed `ironstone.accounting.InvoiceServices.approve#Payable`. Purchasing applies matching with the match-operator capability and proposes corrections. State changes go through `InvoiceServices.change#InvoiceState` (D6). Approval converts the PO's budget commitment to actual through proposed `BudgetServices.convert#Commitment` (D10). Source: research §6 and Accounting/EditInvoice.

**Needs:** AC-02; AC-03; AC-08; AC-14.

### InvoiceMatch (Context passed)

**Context passed.** Mount `Accounting/Payables/InvoiceMatch` using InvoiceMatch, crosscut §3.22. Fix invoice and organization. Display bill lines alongside PO and accepted receipt quantities, prior billed/credited quantities, price/UOM/currency/tax and tolerance. A match operator (AP or buyer) applies the match; only finance releases exceptions with a reason and approves; buyers explain or correct their purchasing records. Place hold is offered here as on BillDetail. Retain quantity allocation by source line, and rerun validation on source changes. Mount also from BillDetail. No match action fabricates receipt or changes stock. Source: Odoo purchase_bill_line_match and ERPNext Purchase Invoice links.

Apply writes or updates Mantle `OrderItemBilling` (order item, invoice item, AssetReceipt, shipment, quantity, amount) in the same transaction, so "already billed", return eligibility and `apply#InvoiceItemToOrder` read the match. InvoiceMatchLine keeps the snapshot, tolerance and rule version; unapply reverses both. Quantity held under open inspection is excluded, as read from proposed `mantle.product.QualityServices.get#SourceInspectionStatus` (D21). A service line matches against Purchasing's acceptance (proposed `ironstone.purchasing.ReceiptServices.accept#ServiceItem`), not a receipt. Tolerances, bill basis and receipt-required come from [MatchPolicies](#matchpolicies). Proposed `MatchServices.queue#MatchReevaluation` marks results stale. It runs from the AssetReceipt and InvoiceItem EECAs, from `dispose#Inspection`, from Purchasing's proposed `apply#PurchaseRevision` and from `settle#Return`. A background job evaluates the queue and names each bill's result. No hold is released automatically.

**Needs:** AC-03.

### PayablesWorkbench

**Layout:** split.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| PayableScope | find | Choose payment consideration scope | supplier, organization, due-through, currency, bank, hold | — | — | Carbon ARAP workbench |
| PayableItems | list | Compare invoices and available credits | bill, due, discount date (proposed; see Open), match, hold, unpaid, available credit | — | proposed `ironstone.accounting.SettlementServices.find#OpenItems` | Carbon payable workbench; baseline EditPayment UnpaidInvoiceList |
| ApplySupplierCredit | list, editable rows | Apply credit before scheduling cash | credit invoice, target bill, amount, difference | — | mantle.account.PaymentServices.apply#InvoiceToInvoice; mantle.account.PaymentServices.unapply#PaymentApplication | Accounting/EditInvoice PaymentApplicationList |

**Actions:** Preview allocations, apply selected credits, then add eligible balance to PaymentRunDetail. Record why held/unapproved items were excluded. Selected rows are revalidated before generating payments.

**Navigation:** The payables entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §6–§7; Carbon payable workbench.

**Needs:** AC-02; AC-04.

### PaymentRuns

**Layout:** list.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| PaymentRuns | list | List batch totals and progress | run, organization, bank, date, currency, approved total, success/failed counts | — | proposed `ironstone.accounting.PaymentRunServices.find#Runs` | ERPNext Payment Order |
| NewRun | dialog | Start a payment proposal | organization, bank, currency, due-through, pay date, payment instrument | — | proposed `ironstone.accounting.PaymentRunServices.create#Run` | ERPNext Payment Order |

**Actions:** Create opens PaymentRunDetail. Inspect completed or failed runs without regenerating successful payment instructions.

**Navigation:** The payables entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §7; ERPNext Payment Order.

**Needs:** AC-04.

### PaymentRunDetail

**Layout:** wizard.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Selection | wizard step | Select due approved bills | supplier, invoice, due, discount (proposed; see Open), outstanding, amount, excluded reason | — | proposed `ironstone.accounting.PaymentRunServices.select#Bills` | ERPNext Payment Order references |
| Review | wizard step | Approve exact proposal totals | bank, pay date, instrument, grouping, selected items, fees, expected total | — | proposed `ironstone.accounting.PaymentRunServices.approve#Run` | ERPNext Payment Order; Odoo register payment |
| Execute | wizard step | Create durable payments and outputs | run, payment ids, check numbers, file, result per supplier/payment | — | proposed `ironstone.accounting.PaymentRunServices.execute#Run`; mantle.account.PaymentServices.assign#BankAccountCheckNumber; mantle.account.NachaServices.generate#NachaFile; mantle.account.PositivePayServices.generate#PositivePayFile | Accounting/Payment/BulkPaymentCheck PaymentList; PaymentListAssignRef; PaymentListActions |
| BankReturns | dialog | Import bank rejects and inspect them | file, payment reference, bank code, status, reason | — | mantle.account.NachaServices.import#NachaReturn | Mantle NachaServices import; Dolibarr rejection queue |

**Actions:** Select → Review → Approve → Execute → Results. Approval freezes selection, amounts, bank and date; edits invalidate approval. A change to a supplier's bank details in the Supplier360 PaymentDetails form voids a pending approval of a run that pays that supplier (D26). Re-read bill/hold/credit status under lock at execution. One supplier/payment unit fails independently; successful instructions retain their identities and files. Regeneration downloads the existing file; resend and void/reissue are distinct audited actions.

**States:** Unknown gateway/bank outcome stays pending until reconciled; never imply retry is safe merely because the client timed out.

**Navigation:** The payables entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §7; ERPNext Payment Order; baseline BulkPaymentCheck and NACHA/Positive Pay.

**Needs:** AC-04; AC-02.

### ExpensePosting

**Layout:** list.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ExpenseQueue | list | Show approved claims awaiting finance review | employee/vendor, invoice type, approval, tax, total, payment status | — | entity | MyAccount/Expense invoices; Carbon reimbursements |
| ExpenseFinance | dialog | Apply finance coding and approve for payment | invoice, posting date, tax treatment, GL allocation, hold reason | — | proposed `ironstone.accounting.InvoiceServices.approve#Payable` | Accounting/EditInvoice; Carbon reimbursement post dialog |

**Actions:** Open BillDetail for coding and attachments; return for correction with a reason or approve for PaymentRuns. People/Projects retain capture/time approval. Accounting cannot silently edit submitted time, approve its own source claim or duplicate payroll generation.

**Navigation:** The payables entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §6, §16; MyAccount expense invoices; Projects Billing.

**Needs:** AC-02; AC-04; AC-22.

### LandedCosts

Accounting owns landed-cost allocation (R-ACC-10). It is in the first release (decided Oct 28,
2026; crosscut §8); Purchasing's InvoiceDetail offers "Allocate to receipts" as a link here.

**Layout:** task; charge lines on the left, target receipt lines on the right, the allocation
preview below.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ChargeLines | list | Choose the bill lines that are landed cost | bill, line, item type (`ItemShipping` and proposed duty and broker types), amount, currency, allocated, remaining | row selection | entity (InvoiceItem) | Odoo stock_landed_costs cost lines; ERPNext Landed Cost Voucher taxes and charges |
| TargetReceipts | list | Choose the receipt lines that carry the cost | shipment, AssetReceipt, product, quantity, value, weight, volume, quantity still on hand | row selection | entity (AssetReceipt, Asset) | ERPNext Landed Cost Voucher purchase receipts |
| AllocationPreview | list, read | Preview each receipt line's share | receipt line, basis (quantity, value, weight or volume), share, on-hand share, consumed share, account | decimal totals | proposed `ironstone.accounting.AssetBookServices.preview#LandedCost` | Odoo landed cost valuation adjustment lines |
| PostLandedCost | dialog | Post the reviewed allocation | previewId/version, basis, accounting date, reason, operation key | explicit confirmation | proposed `ironstone.accounting.AssetBookServices.post#LandedCost` | ERPNext Landed Cost Voucher submit |

**Actions:** Preview, then post. On post, the share for assets still on hand becomes a value-only
adjustment to their cost with ledger links, and the share already issued goes to COGS or
production variance. Each allocation is a proposed `mantle.account.invoice.LandedCostAllocation`
row (source invoice item, AssetReceipt and shipment, basis, amount, currency, posting identity).
A charge line is allocated at most once; a correction reverses and posts again in an open period.
Warehouse InventoryValuation reads the adjusted value.

**Navigation:** The payables entry and BillDetail link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §6 and §15; Odoo `odoo/addons/stock_landed_costs/`; ERPNext `erpnext/stock/doctype/landed_cost_voucher/`.

**Needs:** AC-07.

### Supplier360 (Context passed)

**Context passed.** Mount `Accounting/Payables/Supplier360` using Supplier360, crosscut §3.3. Fix supplier and organization. Tabs: Contact, Bills/payments, Agreements/terms, Orders, Receipts, Activities, as the crosscut Accounting row has them; supplier credits and return credits show inside Bills/payments. Show held and unmatched totals separately from payable balances. Supplier price edits require sourcing authority. Existing party financial forms feed open items.

Supplier default payment terms live only on the proposed `SupplierProfile.settlementTermId` (R-ACC-16). Finance edits them on Agreements/terms through Purchasing's proposed `ironstone.purchasing.SupplierServices.store#SupplierProfile`, which checks a finance capability for the terms fields. AC-02 extends the term precedence of `mantle.account.InvoiceServices.create#Invoice` to agreement term, then SupplierProfile, then PartyAcctgPreference. Finance also sets the proposed `SupplierProfile.selfBillingIndicator` there (D2). The shared PaymentDetails, PartyIdentifications and TaxRegistrations forms show here (D26). PaymentDetails writes through `mantle.account.PaymentMethodServices.create#BankAccount` and `update#BankAccount` behind the finance guard (treasury), masked and audited. A bank-detail change voids any pending payment-run approval for the supplier, and AP may place a bank-detail-change hold. Activities show here as on Customer360 (D25).

**Needs:** AC-02; AC-03; AC-12.

### SupplierBillUpload

**Physical definition.** Proposed `screen/Shared/SupplierBillUpload.xml` is owned here and
mounted once, at `SupplierPortal/BillUpload` under the supplier audience root
`screen/SupplierPortal.xml`, beside Purchasing's quote response and acknowledgement pages
(crosscut §5; D5). Verified supplier/organization scope and source revision govern it; it
requires no internal app grant and runs no app-root always-actions. A single-PO invitation is a
MoquiConf token route checked by proposed `mantle.party.ExternalAccessServices.check#AccessToken`;
the proposed `PortalServices.submit#SupplierBill` wraps the Mantle capability check.

**Layout:** wizard.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| SupplierSubmission | wizard step | Choose own order and upload evidence | supplier capability, PO, supplier invoice reference, date, currency, amount, file | — | proposed `ironstone.accounting.PortalServices.submit#SupplierBill` | Dolibarr supplier document portal; Odoo vendor bill capture |
| SubmissionReceipt | display | Confirm receipt without approval | submission id, received time, draft invoice reference, processing state | — | proposed `ironstone.accounting.PortalServices.get#Submission` | Odoo inbound bill capture |

**Actions:** Authorize supplier relationship/record-scoped invitation before showing PO choices. Duplicate uploads/reference repeats return the earlier submission. An accepted file creates an InvoiceIncoming bill for AP review through `import#Bill`, under the same key (D2). When a self-billed draft already exists for that receipt, the file attaches to the draft instead. It never creates an approved payable.

**Navigation:** Open from a verified supplier invitation or the supplier's permitted PO page.
Back returns to that external page, and the receipt shows only this submission's permitted status.
Internal AP users separately open the resulting incoming bill from their own authorized worklist.

**Source:** research §6 and §16; crosscut §5.

**Needs:** AC-02; AC-18; CX-PORTALS.

## 6. Payments

### Payments

**Layout:** list.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| PaymentFind | find | Choose direction and state | organization, party, instrument, date, status, unapplied, currency | — | — | Accounting/Payment/FindPayment |
| PaymentList | list | Show cash and application state | payment, direction, party, amount, applied, unapplied, status, reference | — | entity | Accounting/Payment/FindPayment PaymentList |
| NewPayment | dialog | Enter a receipt or disbursement | direction, party, organization, date, amount, currency, payment method, reference | — | mantle.account.PaymentServices.create#Payment | Accounting/Payment/FindPayment NewInPaymentForm; NewOutPaymentForm |
| InternalTransfer | dialog | Move money between two of the organization's bank or cash accounts | from payment method, to payment method, amount, currency, date, fee, reference | — | proposed `ironstone.accounting.BankServices.create#InternalTransfer` | Akaunting Banking Transfers; ERPNext Payment Entry "Internal Transfer"; Dolibarr bank transfer |

**Actions:** Tabs Incoming, Outgoing, To validate, Unapplied, Refunds, Transfers, All. New opens PaymentDetail. Validate requires treasury capability; no list edit can set a settled state without payment evidence. An outgoing payment applied to a bill with an open hold is refused ([Bills](#bills)).

Transfer between accounts (R-ACC-17) is offered here and on BankAccountDetail. It creates two
linked Payment records of the proposed payment type `PtInternalTransfer`: an outgoing leg on the
from account and an incoming leg on the to account, linked through `Payment.toPaymentMethodId`.
Both legs post through a cash-in-transit account that a `PaymentTypeGlAccount` row maps. Each leg
reconciles on its own bank statement. The pair commits atomically, and a fee is a separate line
to the bank-fee account.

**Navigation:** The payments entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §7; baseline FindPayment; Dolibarr tovalidate.

**Needs:** AC-02; AC-20.

### PaymentDetail

**Layout:** detail.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| PaymentHeader | single | Edit a proposed payment | party, amount, currency, date, instrument, reference, status | — | mantle.account.PaymentServices.get#PaymentDisplayInfo; mantle.account.PaymentServices.update#Payment | Accounting/Payment/EditPayment EditPayment |
| PaymentApplications | list, editable rows | Apply against invoices/payments and view remaining balance | invoice/payment, due, total, remaining, application amount, discount/write-off/FX | — | mantle.account.PaymentServices.apply#InvoicePayment; mantle.account.PaymentServices.apply#PaymentToPayment; mantle.account.PaymentServices.apply#InvoiceToInvoice; mantle.account.PaymentServices.autoApply#Payment; mantle.account.PaymentServices.unapply#PaymentApplication | Accounting/Payment/EditPayment PaymentApplicationList; UnpaidInvoiceList; UnappliedPaymentList |
| GatewayActions | dialog | Authorize, capture, release or refund | payment, requested amount, reason, operation identity | — | mantle.account.PaymentServices.authorize#Payment; mantle.account.PaymentServices.capture#Payment; mantle.account.PaymentServices.release#Payment; mantle.account.PaymentServices.refund#Payment | Accounting/Payment/EditPayment GatewayAuthorizeForm; GatewayCaptureForm; GatewayRefundForm |
| RefundLink | dialog | Create and tie a refund to original payment | original payment, refundable amount, method, date, reason | — | mantle.account.PaymentServices.create#RefundPayment; mantle.account.PaymentServices.set#PaymentRefundFor | Accounting/Payment/EditPayment RefundPaymentForm; SetRefundForForm; GatewayRefundForForm |
| PaymentEvidence | list, read | Inspect files, gateway results, ledger and audit | source payment, refunds, gateway reference, ledger, event time | — | mantle.account.PaymentServices.get#PaymentGatewayDetails; mantle.account.PaymentServices.create#PaymentContent; mantle.account.PaymentServices.update#PaymentContent | Accounting/Payment/EditPayment RefundPaymentList; GatewayResponseList; PaymentTxList; InvoiceGlaList; AuditLogList; NewContentForm; UpdateContentForm |

**Actions:** Confirm delivered/cleared evidence through guarded transition adapter, post via mantle.ledger.PaymentAutoPostServices.post#Payment, reverse through mantle.ledger.PaymentAutoPostServices.revert#PaymentPost, void via mantle.account.PaymentServices.void#Payment. Posted corrections preserve original links. Refund check locks original refundable balance; partial refunds cumulative. Payment-date changes call mantle.account.PaymentServices.set#PaymentDate under lock/period controls. For a payable, `apply#InvoicePayment` runs inside the hold guard and refuses a bill with an open InvoiceHold (D4). A refund that an order change between pack and ship needs is created by proposed `SettlementServices.refund#OrderPayment` (D3) and shows here linked to the original payment.

**Sections and tabs:** Overview, Applications/open items, Gateway, Refunds, GL, Files, History. Chatter is secondary to the allocation grid. A non-treasury reader sees masked payment-method data and no gateway actions.

**Navigation:** The payments entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §7; baseline EditPayment; Carbon PaymentApplyTable.

**Needs:** AC-02.

### GatewayTransactions

**Layout:** list.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| GatewayResponses | list, read | Show response and original payment | payment, operation, request reference, response code, time, pending state | — | mantle.account.PaymentServices.get#PaymentGatewayDetails; mantle.account.PaymentServices.poll#PaymentGatewayDetails | Accounting/Payment/EditPayment GatewayResponseList |
| GatewayReconcile | dialog | Refresh a pending provider result | payment, request reference, last attempt | — | mantle.account.PaymentServices.poll#PaymentGatewayDetails | Odoo payment transaction provider actions |

**Actions:** Inspect/poll is primary. Capture/refund goes to PaymentDetail with the same operation identity. Redact credentials and full card/bank values; avoid free-text raw response leakage.

**Navigation:** The payments entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §7; Mantle gateway response model.

**Needs:** AC-02.

## 7. Banking

### BankAccounts

**Layout:** list.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Banks | list | Show account, statement and GL position | bank, masked number, currency, GL account, ledger balance/date, available balance | — | mantle.account.PaymentMethodServices.get#PartyPaymentMethodInfoList | Party/PaymentMethod/EditPaymentMethod PaymentMethodInfoForm; Accounting OrgInternalSummary |
| CreateBank | dialog | Add an organization bank account | organization, bank name, number/token, currency, GL account, instrument | — | mantle.account.PaymentMethodServices.create#BankAccount | Party payment methods BankAccount forms |

**Actions:** Open BankAccountDetail. Bank-detail write is separate from recording a payment; change history is retained.

**Navigation:** The banking entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §8 and §17; baseline Party payment methods.

**Needs:** AC-05; AC-01.

### BankAccountDetail

**Layout:** detail.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| BankHeader | single | Maintain allowed bank details | bank, masked account, currency, GL account, balance source/date | — | mantle.account.PaymentMethodServices.get#PartyPaymentMethodInfo; mantle.account.PaymentMethodServices.update#BankAccount; mantle.account.PaymentMethodServices.update#BankAccountMutable | Party payment method bank account edit |
| StatementTransactions | list, editable rows | Review imported or manual bank lines | FIT id, value date, amount, description, matched payment/GL, no-reconcile | row actions Reconcile, Unreconcile, No reconcile | mantle.account.ReconciliationServices.create#PaymentMethodTrans; mantle.account.ReconciliationServices.update#PaymentMethodTrans; mantle.account.ReconciliationServices.reconcile#PaymentMethodTrans; mantle.account.ReconciliationServices.unreconcile#PaymentMethodTrans; mantle.account.ReconciliationServices.noReconcile#PaymentMethodTrans | Party PaymentMethodTrans add/update/list; Party/PaymentMethodTrans AutoMatchReconcileForm, ManRecForm |
| BankFiles | list | Manage checks and bank exchange files | file type, period, produced date, status, checks, bank acknowledgement | — | mantle.account.PaymentMethodServices.update#PaymentMethodFileComplete; mantle.account.PaymentMethodServices.cancel#PaymentMethodFile; mantle.account.PaymentMethodServices.produce#PaymentMethodFileSystemMessage | Party payment method files/checks |
| DepositSlip | dialog | Group selected cheque or cash receipts into one bank deposit | bank account, deposit date, deposit reference, selected receipts, total, currency | receipt selection with running total | proposed `ironstone.accounting.BankServices.create#DepositSlip` | Dolibarr cheque deposit (`htdocs/compta/paiement/cheque/`) |

**Actions:** Import statement, start ReconciliationDetail, open UnmatchedTransactions and print statement. No-reconcile needs a reason and does not create a balancing entry. Canceling a transmission does not reverse already executed payments. Transfer between accounts opens the InternalTransfer dialog of Payments with this account as the from account.

Reconcile, Unreconcile and No reconcile stay as row actions here, independent of a reconciliation
session, so the baseline manual reconciliation keeps parity even if ReconciliationDetail slips
(R-ACC-25). A deposit slip (R-ACC-33) groups receipts of one bank account and currency under one
proposed `mantle.account.payment.PaymentDeposit` (deposit, bank payment method, date, reference,
total), linked from each grouped Payment by the proposed `Payment.paymentDepositId`. The single
bank line for the deposit then reconciles once against the group.

**Navigation:** The banking entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §8; baseline Party payment method transactions/files.

**Needs:** AC-05; AC-04; AC-20.

### StatementImport

**Layout:** wizard.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| StatementFile | wizard step | Identify bank and format | bank, format BAI2/OFX/CSV (ISO 20022 camt.053 and MT940 are the next adapters), file, statement period | — | mantle.account.BaiServices.upload#BaiVersion2; mantle.account.OfxServices.upload#OfxVersion1; proposed `ironstone.accounting.BankServices.preview#CsvStatement` | Party PaymentMethodTrans uploads; ERPNext bank_statement_import |
| StatementReview | wizard step | Review mapping, balances and rejected lines | source row, FIT id, date, amount, description, duplicate, error | — | proposed `ironstone.accounting.BankServices.review#StatementImport` | ERPNext bank statement mapping and import logs |
| ImportResults | display | Show committed and rejected rows | import identity, accepted count, duplicate count, rejected rows/file | — | proposed `ironstone.accounting.BankServices.commit#StatementImport` | Akaunting generic import error report |

**Actions:** Parse/preview then commit valid rows with bank+FIT duplicate protection and stable source-row identity where no FIT exists. Independent invalid rows are logged and downloadable; do not discard valid statement data. A partially imported statement cannot be finalized as reconciled until missing rows are resolved or documented as excluded.

**Navigation:** The banking entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §8; Mantle BAI2/OFX upload services and ERPNext import.

**Needs:** AC-05; AC-18.

### Reconciliations

**Layout:** list.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ReconciliationList | list | Show period and balancing progress | bank, from/thru, opening, closing, matched, difference, status | — | proposed `ironstone.accounting.BankServices.find#Reconciliations` | Akaunting reconciliations |
| StartReconciliation | dialog | Create a statement session | bank, statement reference, period, opening balance, closing balance, attachment | — | proposed `ironstone.accounting.BankServices.create#Reconciliation` | Akaunting Reconciliations create |

**Actions:** Open existing session or start a non-overlapping statement scope. Opening balance links the last completed session or a reviewed opening balance.

**Navigation:** The banking entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §8; Akaunting `app/Http/Controllers/Banking/Reconciliations.php`.

**Needs:** AC-05.

### ReconciliationDetail

**Layout:** split.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| StatementHeader | single | Maintain draft statement controls | bank, period, opening, closing, calculated difference, attachment | — | proposed `ironstone.accounting.BankServices.store#Reconciliation` | Akaunting reconciliation form |
| StatementLines | list | Select imported bank lines | FIT id, date, amount, description, matched, exclusion reason | split left list | mantle.account.ReconciliationServices.match#PaymentMethodTransUnmatched; mantle.account.ReconciliationServices.noReconcile#PaymentMethodTrans | Party PaymentMethodTrans; Dolibarr bankentries_list |
| BookCandidates | list | Select payments/GL candidates | payment/GL id, date, reference, amount, party, matched sum | split right list | mantle.account.ReconciliationServices.reconcile#PaymentMethodTrans; mantle.account.ReconciliationServices.unreconcile#PaymentMethodTrans; mantle.account.ReconciliationServices.create#TransPayment; mantle.account.ReconciliationServices.clear#PaymentTrans | Party PaymentMethodTrans reconcile; ERPNext Bank Reconciliation Tool |
| FinishStatement | dialog | Confirm exact reconciled totals | session, opening, cleared inflow/outflow, ending, statement ending, difference | — | proposed `ironstone.accounting.BankServices.finish#Reconciliation` | Akaunting zero-difference rule |

**Actions:** Suggest then confirm matches; a rule only auto-applies exact unambiguous matches enabled by policy. Create bank fee/payment through reviewed entry dialog. Finish requires zero difference and resolved import errors. Reopen is finance-admin only with reason, preserving the completed snapshot and reversing selection state without deleting payments.

**States:** Conflicting matches show the competing record and refresh; the server locks each statement line so two sessions cannot clear it twice.

**Navigation:** The banking entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §8; Akaunting Reconciliations; existing ReconciliationServices.

**Needs:** AC-05; AC-06.

### UnmatchedTransactions

**Layout:** list.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| UnmatchedFind | find | Choose bank/date/reason | bank, period, amount, description, match reason | — | — | ERPNext Bank Reconciliation Tool |
| UnmatchedRows | list | Show unmatched lines and suggestions | bank, FIT id, amount, description, proposed party, confidence/reason | — | mantle.account.ReconciliationServices.match#PaymentMethodTransUnmatched | Party PaymentMethodTrans Match and Reconcile |

**Actions:** Open ReconciliationDetail with the line selected; no bulk clearing without reviewing matching evidence.

**Navigation:** The banking entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §8; baseline Match and Reconcile.

**Needs:** AC-05.

### FinancialAccounts

**Layout:** list.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| FinancialAccountList | list | Show account and balance | account, owner, type, currency, balance, available, status | — | entity | Accounting/FinancialAccount/FindFinancialAccount FinancialAccountList |
| NewFinancialAccount | dialog | Create a value account | owner, organization, type, currency, name, status | — | mantle.account.FinancialAccountServices.create#FinancialAccount | Accounting/FinancialAccount/FindFinancialAccount NewFinancialAccountForm |

**Actions:** Create and open FinancialAccountDetail. Separately identify stored value and company bank accounts.

**Navigation:** The banking entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §8 and §17; baseline FinancialAccount.

**Needs:** AC-02.

### FinancialAccountDetail

**Layout:** detail.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| FinancialAccountHeader | single | Maintain account metadata | owner, type, name, currency, status, from/thru | — | mantle.account.FinancialAccountServices.update#FinancialAccount | Accounting/FinancialAccount/EditFinancialAccount UpdateFinancialAccountForm |
| FinancialTransactions | list | Review movement and availability | transaction, date, type, amount, payment/invoice, balance, reversal | — | entity | Accounting/FinancialAccount/FinancialAccountTrans TransactionList |
| AccountMovement | dialog | Deposit, withdraw, transfer or adjust value | account, destination, amount, reason, date, reference | — | mantle.account.FinancialAccountServices.deposit#FinancialAccount; mantle.account.FinancialAccountServices.withdraw#FinancialAccount; mantle.account.FinancialAccountServices.transfer#FinancialAccount; mantle.account.FinancialAccountServices.adjust#FinancialAccount; mantle.account.FinancialAccountServices.reverse#FinancialAccountTrans | Accounting/FinancialAccount/FinancialAccountTrans AdjustFinancialAccount |
| ValueStatement | dialog | Print a statement | account, from/thru, format | — | mantle.account.FinancialAccountServices.get#StatementPrintInfo | Accounting/FinancialAccount/EditFinancialAccount StatementForm |

**Actions:** Confirm each movement with before/after balance; check authorization and period. Transfer is atomic across both accounts; retry cannot duplicate one leg. Refund uses its original source links.

**Navigation:** The banking entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §8 and baseline financial account services.

**Needs:** AC-02.

## 8. General ledger

### ChartOfAccounts

**Layout:** list.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| AccountFind | find | Filter chart | code, name, class, type, organization, posting allowed | — | — | Accounting/GlAccount/FindGlAccount |
| AccountTree | list | Browse hierarchy and open balances | account, code, parent, type, class, debit/credit, organization | view-tree | entity | Accounting/GlAccount/GlAccountTree; FindGlAccount GlAccountListForm |
| NewAccount | dialog | Create an account under a parent | code, name, parent, class, type, posting flag | — | mantle.ledger.LedgerServices.create#GlAccount | Accounting/GlAccount/FindGlAccount NewGlAccountForm |

**Actions:** Open AccountDetail; import charts through Setup mapping/review. Reparent validates no cycle and preserves historical account identity; posting accounts with transactions are deactivated, not deleted.

**Views:** Tree and list over one find.

**Navigation:** The general ledger entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §2; Carbon chart tree; baseline GlAccountTree.

**Needs:** AC-01; AC-18.

### AccountDetail

**Layout:** detail.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| AccountHeader | single | Edit account metadata | code, name, parent, class, type, posting flags | — | entity; mantle.ledger.LedgerServices.set#GlAccountFlags | Accounting/GlAccount/EditGlAccount EditGlAccountForm |
| OrganizationAccounts | list, editable rows | Assign accounts and configuration per organization | organization, account, from/thru, balance | — | entity | Accounting/GlAccount/EditGlAccount NewGlAccountOrgForm; GlAccountOrgList |
| AccountGroups | list, editable rows | Assign report categories/groups | category, group, account, effective dates | — | entity | Mantle GlAccountCategory/GlAccountGroup; Odoo account tags |
| RequiredDimensions | list, editable rows | Set which dimensions the account requires per organization | organization, facility required (Y/N), cost centre required (Y/N), from date | — | proposed guarded update of the required-dimension fields on `GlAccountOrganization` (AC-22) | ERPNext Accounting Dimension mandatory flags; Odoo analytic plan applicability |

**Actions:** Save metadata, open AccountLedger with fixed account, view usages before disabling. Changes to account meaning cannot rewrite posted transactions.

**Navigation:** The general ledger entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §2 and §17; baseline EditGlAccount.

**Needs:** AC-01; AC-22.

### JournalEntries

**Layout:** list.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| TransactionFind | find | Filter ledger transactions | organization, date, type, posted, journal batch, source document | — | — | Accounting/Transaction/FindTransaction |
| Transactions | list | Inspect posting and source links | transaction, date, type, source, debit, credit, posted, reversed | — | entity | Accounting/Transaction/FindTransaction TransactionList |
| NewEntry | dialog | Start a manual transaction or template copy | organization, date, type, description, currency, journal/template | — | mantle.ledger.LedgerServices.create#AcctgTrans | Accounting/Transaction/FindTransaction CreateAcctgTrans |

**Actions:** New opens JournalEntryDetail. Bulk post validates every transaction independently and reports each failure; source-generated records link back to their document.

**Navigation:** The general ledger entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §3; baseline FindTransaction.

**Needs:** AC-06; AC-13.

### JournalEntryDetail

**Layout:** detail.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| TransactionHeader | single | Edit draft header | date, type, organization, currency, description, journal, source, other party, work effort | — | mantle.ledger.LedgerServices.update#AcctgTrans | Accounting/Transaction/EditTransaction UpdateAcctgTrans |
| TransactionLines | list, editable rows | Edit balanced debit/credit lines | account, debit/credit, amount, currency, product, asset, facility and cost centre (proposed, AC-22), description | — | mantle.ledger.LedgerServices.create#AcctgTransEntry; mantle.ledger.LedgerServices.update#AcctgTransEntry; mantle.ledger.LedgerServices.delete#AcctgTransEntry; mantle.ledger.LedgerServices.calculate#AcctgTransTrialBalance | Accounting/Transaction/EditTransaction AddEntryForm; EntryListForm |
| MoveDraftLine | dialog | Move a draft entry to another draft transaction | entry, destination transaction, reason | — | mantle.ledger.LedgerServices.move#AcctgTransEntry | Accounting/Transaction/MoveEntry ReceiveForm |
| PostingAction | dialog | Post or reverse with a dated reason | transaction, posting/reversal date, reason, period validation | — | mantle.ledger.LedgerServices.post#AcctgTrans; mantle.ledger.LedgerServices.post#ReverseAcctgTrans; mantle.ledger.LedgerServices.delete#AcctgTrans | Accounting/Transaction/EditTransaction post/reverse/delete transitions; ERPNext immutable ledger |
| EntryAudit | list, read | Show original and correction trail | actor, date, field, before/after, reverse links | — | entity | Accounting/Transaction/EditTransaction AuditLogList |

**Actions:** Post requires balanced lines, complete accounts, open period and authorized organization. Delete only drafts. Posted entries are read-only; correction creates linked reversal and a new draft. The old UpdateAcctgTransPosted and unpost shortcuts are deliberately not exposed for financial changes; metadata corrections use an audited limited adapter.

**Sections and tabs:** Header, balanced lines with totals, source documents, Files, audit. The existing ledger dimensions are few (R-ACC-11); the first release adds facility and cost centre (AC-22). A line carries product and asset (`AcctgTransEntry.productId`, `AcctgTransEntry.assetId`). The header carries the other party and the work effort (`AcctgTrans.otherPartyId`, `AcctgTrans.workEffortId`). Each line also carries the proposed facility and cost centre, which its GL account may require (AC-22). Files lists attachments through the shared RecordFiles over the proposed `mantle.ledger.transaction.AcctgTransContent` (AC-21), registered in `mantle.party.CommunicationServices.get#RecordLinkInfo` (D25).

**Navigation:** The general ledger entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §3 and §9; baseline EditTransaction and MoveEntry.

**Needs:** AC-06; AC-02; AC-21; AC-22.

### TransactionEntries

**Layout:** list.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| EntryFind | find | Choose account and source dimensions | organization, date, account, product, asset, other party and work effort (from the header), posted | — | — | Accounting/Transaction/FindTransactionEntry |
| EntryRows | list, read | Read lines and their source documents | transaction, sequence, account, debit/credit, amount, currency, source | — | entity | Accounting/Transaction/FindTransactionEntry TransactionEntryList |

**Actions:** Open JournalEntryDetail or the authorized originating invoice/payment/stock document. Export preserves filter metadata and currency basis.

**Views:** List, pivot and graph; posted is the default filter.

**Navigation:** The general ledger entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §3; baseline FindTransactionEntry.

**Needs:** AC-12.

### JournalBatches

**Layout:** list.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| JournalBatchList | list | Show batches and readiness | journal, name, organization, transaction count, posted, imbalance | — | entity; proposed `ironstone.accounting.JournalServices.validate#Batch` | Accounting/FindJournal TransactionList |
| JournalBatchEdit | dialog | Create or amend an unposted batch | name, organization, date, description | — | mantle.ledger.LedgerServices.create#GlJournal; mantle.ledger.LedgerServices.update#GlJournal | Accounting/FindJournal CreateGlJournal |

**Actions:** Inspect transactions, validate, then post via proposed ironstone.accounting.JournalServices.post#Batch with confirmation and closed-period checks. Each transaction is atomic; independent constituent failures are named and the others continue. The batch remains open with a derived partial result until all eligible transactions succeed. Existing mantle.ledger.LedgerServices.post#GlJournal currently exits on the first error and must not be used unchanged for this batch behavior. GlJournal is not an Odoo sale/purchase book.

**Navigation:** The general ledger entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §2–§3; baseline FindJournal.

**Needs:** AC-06.

### JournalTemplates

**Layout:** detail.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| TemplateHeader | single | Describe a versioned template | name, organization, type, currency, description, effective dates | — | proposed `ironstone.accounting.JournalServices.store#Template` | ERPNext Journal Entry Template |
| TemplateLines | list, editable rows | Define accounts and amount parameters | sequence, account, debit/credit, fixed amount or parameter, party, dimensions | — | proposed `ironstone.accounting.JournalServices.store#TemplateLines` | ERPNext journal_entry_template accounts |
| InstantiateTemplate | dialog | Preview a balanced draft entry | template version, date, amounts, descriptions | — | proposed `ironstone.accounting.JournalServices.create#FromTemplate` | ERPNext Journal Entry get from template |

**Actions:** Publish template after balancing validation. Instantiate creates an unposted independent entry with source template/version. Templates never silently post on save.

**Navigation:** The general ledger entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §3; ERPNext `erpnext/accounts/doctype/journal_entry_template/journal_entry_template.json`.

**Needs:** AC-13.

## 9. Period close

### Periods

**Layout:** list.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| FiscalPeriods | list | Show fiscal hierarchy and close state | organization, period type, from/thru, parent, previous, closed | view-tree | mantle.ledger.LedgerServices.get#OrganizationFiscalTimePeriods | Accounting/TimePeriod/FindTimePeriod TimePeriodList |
| PeriodEdit | dialog | Create next, previous or child periods | organization, type, dates, parent, previous | — | entity; mantle.ledger.LedgerServices.check#NextFiscalTimePeriods | Accounting/TimePeriod/FindTimePeriod CreatePeriod; EditTimePeriod CreateNextPeriod; CreatePreviousPeriod; CreateChild; ViewTimePeriod; TimePeriodList |

**Actions:** Open PeriodCloseDetail; validate fiscal dates and no unintended overlap. Reopen requires finance-admin reason and invalidates the close snapshot.

**Navigation:** The period close entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §2 and §9; baseline TimePeriod.

**Needs:** AC-06.

### PeriodCloseDetail

**Layout:** wizard.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| CloseChecks | wizard step | Review source and subledger integrity | unposted docs, imbalance, unmatched bank, AP holds, missing rates, stock/WIP tie-out | — | proposed `ironstone.accounting.CloseServices.get#Checklist` | Carbon PeriodCloseUnpostedDocumentsPopover; Accounting/Reports/InvoiceReconciliation |
| PeriodBalances | list, read | Review beginning/debit/credit/ending by account | account, beginning, debit, credit, ending | — | mantle.ledger.LedgerServices.recalculate#GlAccountOrgTimePeriodAmounts | Accounting/TimePeriod/ViewPeriodGlAccounts PeriodGlAccountList |
| ClosePosting | wizard step | Preview closing entries then commit close | period, organization, retained earnings account, close date, reason | — | mantle.ledger.LedgerServices.create#PeriodCloseAcctgTrans; mantle.ledger.LedgerServices.close#FinancialTimePeriod; mantle.ledger.LedgerServices.reopen#FinancialTimePeriod | Accounting/TimePeriod/ViewPeriodGlAccounts ClosingTransForm |

**Actions:** Refresh checklist after any correction. Close locks/revalidates period and blockers, posts closing entries and records snapshot atomically; failed close leaves period open with named blockers. Reopen is audited and never erases the old close record. Deep-link to depreciation, tax and reconciliation; no automatic hidden repairs.

CloseChecks also lists these rows, each linked to the screen that resolves it:

- Production runs awaiting cost close, from proposed `ProductionCostServices.find#CostCloseQueue` (ProductionCostClose).
- Stock movements that posted nothing: AssetReceipt and AssetIssuance rows whose `acctgTransResultEnumId` is `AtrNoAcquireCost` or `AtrNoAcctgPreference`, and open WIP by run (InventoryValuation).
- Open WIP on completed `WepPickAssembly` kit efforts and `WepAssembling` repack efforts, which must be zero (Warehouse WH-POST passes the kit's acquire cost).
- Uninvoiced receipts against the `GatUninvoicedShpmntRcpts` (GRNI) clearing balance, linked to Purchasing MatchExceptions "received, not billed".
- Approved physical counts not yet posted, and count deltas that Mantle's variance posting skipped because the asset already has a transaction for that PhysicalInventory (Warehouse's proposed `post#Count`).

**Navigation:** The period close entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §9; Carbon periods UI; baseline close services.

**Needs:** AC-06; AC-07; AC-12.

### PeriodLocks

**Layout:** settings.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| PostingLocks | list, editable rows | Set effective lock dates | organization, scope all/sales/purchases/tax, lock-through date, hard flag, reason | — | proposed `ironstone.accounting.CloseServices.store#Lock` | Odoo company lock dates; ERPNext Accounting Period |
| LockExceptions | list, editable rows | Authorize a narrow temporary exception | lock, user/group, allowed document/scope, expires, reason, approver | — | proposed `ironstone.accounting.CloseServices.grant#Exception` | Odoo `account.lock_exception` |

**Actions:** A hard/all period close remains non-bypassable; exceptions only relax the specified soft lock and never TimePeriod.isClosed. Preview impacted records before save; scope and expiry are checked server-side on every posting, refund, reversal and backdated change.

**Navigation:** The period close entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §9; ERPNext accounting_period/accounting_period.json.

**Needs:** AC-06.

### PeriodRuns

**Layout:** list.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| PeriodRunList | list | Show previews, posted effects and failures | kind, organization, period, currency, total, status, source, reverse link | — | proposed `ironstone.accounting.PeriodRunServices.find#Runs` | Carbon PeriodRunDocuments |
| RunStart | dialog | Start a calculation without posting | kind, organization, period, source selection, effective date | — | proposed `ironstone.accounting.PeriodRunServices.preview#Run` | Carbon period runs |

**Actions:** Open DepreciationRunDetail or AdvancedPeriodRun. Each result retains calculation version and source IDs; recalculate invalidates approval; failed source items remain visible without masking successful independent calculations.

**Navigation:** The period close entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §15; Carbon `apps/erp/app/modules/accounting/ui/PeriodRunDocuments.tsx`.

**Needs:** AC-07; AC-16; AC-17.

### AdvancedPeriodRun

**Layout:** wizard.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| RunBasis | wizard step | Select balances/schedules and rate date | kind FX/deferral, organization, period, currencies, rate source, schedules | — | proposed `ironstone.accounting.PeriodRunServices.preview#Run` | ERPNext Exchange Rate Revaluation; Process Deferred Accounting |
| RunEntries | list, read | Review amounts and reversal schedule | source, base/foreign amount, old/new rate, gain/loss, debit/credit, reversal date | — | proposed `ironstone.accounting.PeriodRunServices.get#Preview` | ERPNext revaluation/deferred accounting |
| RunPost | wizard step | Approve and post the frozen preview | run version, posting date, reason, approval | — | proposed `ironstone.accounting.PeriodRunServices.post#Run`; proposed `ironstone.accounting.PeriodRunServices.reverse#Run` | Carbon period-run post/reverse |

**Actions:** Record exact rate/date/source. Post once per approved run version and source period; reverse via linked entries in an open period. Deferral schedules preserve source invoice allocation and remaining balance. Country/book-specific policy is configured before enabling the run type.

**Navigation:** The period close entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §15; ERPNext deferred accounting and currency revaluation.

FX revaluation needs base-currency posting first (AC-19), which is a first-release prerequisite.

**Needs:** AC-16; AC-06; AC-19.

### Leases

**Physical definition.** Proposed `screen/Shared/Leases.xml` is owned here; Accounting's
Leases route and Purchasing's later LeaseOverview mount the same record/schedule. Purchasing
fixes supplier/asset/organization and is read-only without the lease and period-run approver capability (APPROVE + GL, §1.1).

**Layout:** detail.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| LeaseTerms | single | Maintain versioned lease basis | organization, counterparty, asset, commencement/end, payment schedule, discount rate, currency, policy | — | proposed `ironstone.accounting.LeaseServices.store#Terms` | Carbon lease setup wizard |
| LeaseSchedule | list, read | Preview liability and asset amortization | period, payment, interest, principal, liability, amortization, journal links | — | proposed `ironstone.accounting.LeaseServices.calculate#Schedule` | Carbon lease schedule |
| LeaseModification | dialog | Recalculate prospectively with audit | effective date, changed payments/rate, reason | — | proposed `ironstone.accounting.LeaseServices.modify#Lease` | Carbon lease modification |

**Actions:** Approve terms, calculate schedule, then generate period-run preview; no direct schedule-row edits after posting. End/modify generates prospective revised schedule with links to prior basis.

**Navigation:** The period close entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §15 Carbon leases; no current Mantle lease workflow.

**Needs:** AC-17; AC-06.

### RevenueRecognition

**Layout:** detail.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| RecognitionBasis | single | Define an approved allocation policy | organization, contract/invoice lines, obligation, allocated amount, currency, start/end, recognition method | — | proposed `ironstone.accounting.RecognitionServices.store#Schedule` | Carbon RevenueRecognition contracts |
| RecognitionSchedule | list, read | Preview earned and deferred amounts | period, source allocation, recognized, deferred, journal links | — | proposed `ironstone.accounting.RecognitionServices.calculate#Schedule` | Carbon revenue recognition period runs |

**Actions:** Approve allocation and generate period runs; invoice credit/cancellation flags affected schedule for review. Sum recognized plus deferred remains equal to approved allocation, including explicit adjustments.

**Navigation:** The period close entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §15 Carbon revenue recognition; no current Mantle schedule workflow.

**Needs:** AC-17; AC-06.

### Intercompany

**Layout:** wizard.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| IntercompanyBasis | wizard step | Choose participating books and exchange basis | source/destination organizations, period, currency, rate, due-to/from accounts, source document | — | proposed `ironstone.accounting.IntercompanyServices.preview#Batch` | Carbon intercompany; ERPNext inter-company journal entry |
| PairedEntries | list, read | Review both sides and optional eliminations | organization, debit/credit, account, source, counterpart, elimination group | — | proposed `ironstone.accounting.IntercompanyServices.get#Preview` | Carbon intercompany batch |
| IntercompanyPost | wizard step | Commit approved paired entries | batch version, organization approvals, posting date | — | proposed `ironstone.accounting.IntercompanyServices.post#Batch` | ERPNext inter-company journal entry |

**Actions:** Require authority and open periods in every affected organization. Commit a paired transaction as one atomic unit; independent pairs may fail separately. Consolidation is a later report/adjustment view and never rewrites local books.

**Navigation:** The period close entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §12 and §15; Carbon intercompany; ERPNext consolidated reports.

**Needs:** AC-17; AC-06; AC-12.

## 10. Fixed assets and inventory

This section holds the Fixed assets menu area and the Inventory menu area (R-ACC-26).
InventoryValuation and ProductionCostClose live under `Accounting/Inventory/`, not under
`FixedAssets/`; they are designed here because they share AC-07 with the asset books.

### FixedAssets

**Layout:** list.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| AssetBookFind | find | Choose financial asset scope | organization, class/type, facility, acquired date, disposed, depreciation method | — | — | Carbon fixed assets register |
| AssetBooks | list, read | Show cost and depreciation position | asset, class, acquired, cost, accumulated depreciation, net book, location, status | — | entity | Asset/EditAsset fixed-asset fields; Carbon asset list |

**Actions:** Open EquipmentDetail on Books tab; initiate DepreciationRunDetail. Operational equipment and warehouse inventory remain distinct asset types; an item is not depreciated merely because it has an Asset row.

**Navigation:** The fixed assets entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §15; Mantle Asset/AssetDepreciation.

**Needs:** AC-07.

### EquipmentDetail (Context passed)

**Context passed.** Mount `Accounting/FixedAssets/EquipmentDetail` using EquipmentDetail, crosscut §3.10. Fix asset and organization. Panes: Equipment identity, Book, source/history, with the facility accounting context, as the crosscut Accounting row has them; the depreciation schedule and its GL links sit inside Book. Accounting capitalizes, adjusts, disposes or sells and reverses through the dialogs below; Maintenance/Manufacturing/Warehouse contexts show permitted net-book summaries without these actions. Asset classes supply defaults, not mutable historical policy. Disposal revalidates active usage/stock links, records proceeds and writes linked GL entries; it does not delete the asset.

The Book pane adds these dialogs (R-ACC-08). Mantle has no disposal service, so all four book
services are proposed. Each writes a proposed `AssetBookEvent` (AC-07) with its ledger links.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| Capitalize | dialog | Put an asset in service on the books | assetId, asset class and version, in-service date, acquire cost and currency, source invoice or receipt, depreciation method, useful life, salvage value, asset and depreciation accounts | class defaults filled in, editable before post | proposed `ironstone.accounting.AssetBookServices.capitalize#Asset` | Carbon fixed-asset capitalize route; new book controls specified here |
| AdjustBook | dialog | Change the book basis from a date forward | assetId, change in cost, change in useful life, change in salvage value, effective date, reason | before and after net book value | proposed `ironstone.accounting.AssetBookServices.adjust#AssetBook` | Carbon fixed-asset adjust-cost route |
| Dispose | dialog | Scrap or sell an asset | assetId, disposal date, scrap or sale, proceeds and currency, buyer, sales invoice, reason | gain or loss preview | proposed `ironstone.accounting.AssetBookServices.dispose#Asset` (posts cost, accumulated depreciation and gain or loss) | ERPNext `scrap_asset`; Dolibarr asset disposal; Carbon dispose and sell routes |
| ReverseBookEvent | dialog | Reverse a posted book event | book event, reversal date, reason | linked event shown | proposed `ironstone.accounting.AssetBookServices.reverse#AssetBookEvent` | ERPNext `restore_asset` |
| AcquireCostRepair | dialog | Rewrite one asset's acquire cost as audited data repair | assetId, new acquire cost, reason, open-period check result, operation key | finance admin only; warning that it rewrites posted history | `mantle.product.AssetServices.update#AssetAcquireCost` | Asset/AssetDetail UpdateAssetAcquireCost |

The listed fields are the full field lists of the four book dialogs. AcquireCostRepair is the
baseline UpdateAssetAcquireCost, kept as a finance-admin data-repair action with audit and an
open-period check (R-ACC-02); ordinary value changes use AdjustBook.

**Needs:** AC-07; AC-06.

### AssetClasses

**Layout:** settings.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| AssetClassList | list | Find reusable book policies | class, name, asset type, active, organization | — | proposed `ironstone.accounting.AssetBookServices.find#Classes` | Carbon Asset Classes |
| AssetClassForm | single | Version defaults and accounts | class, useful life, residual, book/tax method, depreciation/asset/disposal accounts | — | proposed `ironstone.accounting.AssetBookServices.store#Class` | Carbon fixed-asset class defaults |

**Actions:** Save a new effective version; already capitalized assets retain their adopted book basis. Accounts must be valid for the selected organization.

**Navigation:** The fixed assets entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §15; Carbon asset classes.

**Needs:** AC-07.

### DepreciationRunDetail

**Layout:** wizard.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| DepreciationScope | wizard step | Choose assets and period | organization, period, class, asset selection, book/tax basis | — | proposed `ironstone.accounting.AssetBookServices.preview#Depreciation`; mantle.ledger.AssetAutoPostServices.calculate#FixedAssetDepreciation | Carbon depreciation run; baseline period depreciation |
| DepreciationPreview | list, read | Review per-asset amounts and errors | asset, cost, residual, prior accumulated, period amount, ending net book, error | — | proposed `ironstone.accounting.AssetBookServices.get#DepreciationPreview` | Carbon FixedAssetDepreciationTable |
| DepreciationPost | wizard step | Post approved immutable preview | run version, period, selected eligible assets, reason | — | proposed `ironstone.accounting.AssetBookServices.post#Depreciation`; mantle.ledger.AssetAutoPostServices.post#FixedAssetDepreciation | Carbon run Post/Recalculate/Reverse; baseline calculateAndPost#AllFixedAssetDepreciations |

**Actions:** Calculate first. Every asset-period posts at most once; lock it at posting. Each independent asset reports errors without aborting the rest, but the asset depreciation row and its journal entry commit together. Reverse creates linked correcting entries and marks the run/result reversed.

**Navigation:** The fixed assets entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §15; Mantle AssetAutoPostServices; Carbon DepreciationRunTable.

**Needs:** AC-07; AC-06.

### InventoryValuation

**Physical definition.** Proposed `screen/Shared/InventoryValuation.xml`, owned here, is
mounted at the Accounting route and `Warehouse/Reports/InventoryValuation`. Warehouse fixes
its authorized facility scope; financial-read exposes values, and revaluation controls require
the separate finance mutation capability. Neither mount requires the other app's launcher grant.

**Layout:** report.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ValuationOptions | find | Choose valuation snapshot | organization, facility, product, lot, as-of date, costing method | — | — | Accounting/Reports/AssetValuation |
| ValuationRows | list, read | Show source cost and ledger differences | product/asset, quantity, unit cost, value, inventory GL, WIP, variance | — | proposed `ironstone.accounting.ReportServices.run#InventoryValuation` over the `AssetValuationSummary` view | Accounting/Reports/AssetValuation AssetValuationSummary |
| ValuationExceptions | list, read | Show stock movements that posted nothing and WIP by run | receipt or issuance, product, quantity, posting result (`AtrNoAcquireCost`, `AtrNoAcctgPreference`), production run, open WIP | links to the source movement and the run | same proposed `run#InventoryValuation` result | Mantle `acctgTransResultEnumId` on AssetReceipt and AssetIssuance |
| ValuationAdjustment | dialog | Preview a deliberate stock revaluation | scope, effective date, new standard basis, reason, affected quantity; product standard cost id and version when opened from Products | — | proposed `ironstone.accounting.AssetBookServices.preview#Revaluation` | ERPNext Item Standard Cost and stock revaluation |
| PostRevaluation | dialog | Post the reviewed revaluation | previewId/version, effective date, reason, operation key; totals read-only | explicit confirmation; resulting ledger links | proposed `ironstone.accounting.AssetBookServices.post#Revaluation` | ERPNext stock revaluation submit; new posting controls specified here |
| CostDataRepair | dialog | Rewrite a product's asset acquire costs as audited data repair | product, new acquire cost, affected assets, reason, open-period check result, operation key | finance admin only; warning that it rewrites posted history | `mantle.product.AssetServices.update#ProductAcquireCost` | Asset/FindAsset UpdateProductCost |

**Actions:** Drill into AssetReceipt/AssetIssuance and ledger sources. Revalue requires a reviewed run and financial authority; cost edits in Products never alter posted values automatically. Quantity remains owned by stock postings.

Revaluation has a preview and a post step (R-ACC-02); PostRevaluation's listed fields are its full field list. It posts value-only
adjustments with ledger links in an open period, and never calls `update#ProductAcquireCost` on
posted receipts. Products' "Request revaluation" opens ValuationAdjustment with the
`productStandardCostId` and version of the approved estimate. CostDataRepair is the baseline
UpdateProductCost, kept only as a finance-admin data-repair action with audit and an open-period
check. ValuationExceptions shows the receipts and issues that posted nothing, so a missing cost
basis or posting preference is found before close.

**Navigation:** The inventory entry, CloseChecks and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §15–§17; crosscut §4.1; Accounting AssetValuation.

**Needs:** AC-07; AC-12.

### ProductionCostClose

**Physical definition.** Proposed `screen/Shared/ProductionCostClose.xml`, owned here, is
mounted at `Accounting/Inventory/ProductionCostClose` and within Manufacturing's run context. Both mounts
apply the same financial capability, organization, period and source-revision checks.

**Layout:** task; run identity and operational/quality status above cost evidence, output
allocation and proposed ledger entries. InventoryValuation, close-check exceptions and
Manufacturing's ProductionCosts link here. Terminal users review the same tables and numbered
Preview/Approve/Post actions; narrow layouts stack the three panes.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| CostCloseScope | single | Select the run and posting basis | organizationPartyId, workEffortId, accountingDate, allocationPolicyId/version (from [CostingPolicies](#costingpolicies)), reason; source/estimate version read-only | run lookup from the cost close queue, period warning | proposed `ironstone.accounting.ProductionCostServices.preview#CostClose`; proposed `ironstone.accounting.ProductionCostServices.find#CostCloseQueue` | Manufacturing ProductionCosts; Carbon JobEstimatesVsActuals; new close controls specified here |
| CostEvidence | list, read | Reconcile actual facts and prior allocations | event ID/type, source ID/line, operation/snapshot line, quantity/UOM, currency, frozen rate, amount, prior allocated amount, remaining amount, hold/error and GL links | authorized source drill-down | same preview result | existing AssetReceipt/AssetIssuance and Accounting valuation report; proposed crosscut cost evidence |
| OutputAllocation | list, editable draft | Review distribution and residual variance | output snapshot line, asset/receipt, accepted/held quantity, allocation basis/weight, proposed amount, residual variance and reason; no quantity editing | decimal/currency totals | same preview result; recalculation through `preview#CostClose` | Carbon estimates versus actuals; new allocation controls specified here |
| PostCostClose | dialog | Commit the reviewed balanced allocation | previewId/version, operationKey, accountingDate, approvalDecisionId when required, reason; server totals and ledger proposal read-only | explicit confirmation; resulting source/GL links | proposed `ironstone.accounting.ProductionCostServices.post#CostClose` | existing ledger posting controls; new atomic production allocation |

The fields listed above are the complete business-input contract for these new controls; record
identity, authenticated actor, timestamps and operation outcomes are server-managed. Preview
accepts explicit output weights only where the organization's effective policy permits them.
The server recalculates decimal totals, locks remaining cost events and output allocations,
rejects stale evidence, and validates each source, currency, period and approval. Allocations,
the absorption and variance entries and the resulting ledger links commit once as one run-level
financial event; an independent batch of runs reports named failures and continues. Operational
completion does not imply cost close, and unresolved required stock/quality/financial facts block
final close.

**Production posting rule (D12).** Production cost reaches the GL beside Mantle's existing issue
and receipt postings, and WIP is relieved once (R-SA-01):

1. Manufacturing's proposed `ProductionServices.receive#ProductionOutput` passes `acquireCost` to
   `receive#Asset`. It is the frozen standard unit cost from the run snapshot (the
   ProductStandardCost id and version). Without an approved standard it is cost-to-date divided by
   quantity, and the receipt is marked provisional. It is never null.
2. Material issues and output receipts post only through the existing `AssetIssuanceGlPost`
   (Dr WIP) and `AssetReceiptGlPost` (Dr inventory, Cr WIP at `Asset.acquireCost`) SECAs.
3. The proposed `post#CostClose` posts, in one run-level transaction, Dr WIP and Cr three proposed
   GL account types (AC-07 seed) for the events not yet posted: proposed applied labor (`GatLaborApplied`),
   proposed applied machine and overhead (`GatOverheadApplied`) and
   proposed outside-processing accrual (`GatOutsideProcessAccrued`). It also posts the co-product reallocation, and residual WIP
   to the proposed production variance type (`GatProductionVariance`). It never posts an issue or
   a receipt again.
4. Setup readiness requires `AssetTypeGlAccount.wipAssetGlAccountId` and `transferGlAccountId`
   and a production costing basis per organization.
5. InventoryValuation and CloseChecks list stock movements whose `acctgTransResultEnumId` is
   `AtrNoAcquireCost` or `AtrNoAcctgPreference`, and open WIP by run.

The run's `WorkEffort.ownerPartyId` is the organization; Manufacturing's proposed `create#ProductionOrder`
sets it on the run and its operations (R-SA-03). The preview refuses a run whose owner is not
the organization, because Mantle would otherwise book every issue to `GatCogs`.

**Cost events.** Manufacturing's proposed `mantle.work.ProductionServices.record#ProductionCostEvent`
writes every event inside its source posting; this file's ProductionCostServices only allocate and
post. Labor events are written when a Projects timesheet is approved, at the time entry's rate
(R-SA-09). `preview#CostClose` blocks while any time entry on the run is on an unapproved
timesheet; a reopened timesheet writes a reversal event, and a rate change after approval writes a
delta event. Machine events come from Manufacturing's proposed `record#MachineRuntime` at interval close.
Overhead events are computed by `preview#CostClose` from the CostingPolicies policy; the overhead
basis lives only there (R-SA-18). Scrap of issued components or held output comes from
Manufacturing's proposed `record#ProductionLoss` and posts to the proposed `AssetTypeGlAccount.scrapGlAccountId`
or to variance as the policy says.

**Review queue and run close.** Manufacturing's proposed `review#ProductionCosts` puts the run in the queue
that proposed `find#CostCloseQueue` reads; Home MyFinanceWork and CloseChecks show it (R-ACC-09).
`post#CostClose` calls Manufacturing's proposed `transition#ProductionOrder` (Close) in the same transaction,
moving the run from WeComplete to WeClosed (R-SA-11). After close, a new cost event is accepted
only as an adjustment event, which a later `preview#CostClose` in adjustment mode picks up.
Manufacturing's guard refuses WeClosed to WeInPlanning, and WeComplete to WeInProgress, once cost is
posted.

Subcontract service acceptance links to the already recorded production output and inspection.
Company-owned material at a supplier remains company-owned stock/WIP: the vendor facility is owned
by the organization (D14). Manufacturing's proposed `receive#SubcontractOutput` consumes the
components held there, receives the output with the run's workEffortId and calls Purchasing's
proposed `accept#ServiceItem`. Acceptance writes the outside-processing accrual event, and the bill match
writes the price-variance event. The service bill comes through `import#Bill`; the receipt SECA
never bills a service line. The processing accrual
enters WIP once; the supplier bill clears or adjusts it, and never adds the full charge a second
time or receives output stock again. Late bills, time corrections or scrap facts create linked
open-period allocations/variances; they do not rewrite a closed period or historic issue cost.

**Actions:** Manufacturing can request review. Financial readers inspect
authorized evidence; GL/finance approvers preview, approve and post according to separation
policy. A same-app shared link checks financial capability rather than Manufacturing launcher
membership. Posted allocations have linked reversal/adjustment actions through the same guards.

**Source:** [Manufacturing costs](design-manufacturing.md#productioncosts),
[crosscut costing](design-crosscut.md#41-product-identity-units-pricing-and-cost), existing
AssetAutoPostServices and the Carbon JobEstimatesVsActuals reference cited in Manufacturing.

**Needs:** AC-07; AC-06; shared CX-COST/CX-POSTING.

## 11. Tax

### TaxAuthorities

**Layout:** list.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| TaxAuthorityList | list | Find configured authorities | authority, geo, party, tax-in-price, active | — | entity | Odoo account.tax; Mantle TaxAuthority |
| TaxAuthorityEdit | single | Maintain authority and account links | authority party, geo, registration format, categories, organization GL, exemptions/nexus | — | entity | Mantle TaxAuthorityCategory/Party/Assoc/GlAccount; ERPNext tax masters |

**Actions:** Save authorized configuration; inspect which local rules/stores/gateways use it. Effective-date changes preserve prior document tax snapshots.

**Navigation:** The tax entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §10; AccountingOtherEntities active tax authority records.

**Needs:** AC-08.

### TaxRates

**Layout:** settings.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| LocalTaxRules | list, editable rows | Set versioned rate and scope | authority, category/tax code, origin/destination scope, rate, taxable basis, inclusive/compound, dates, priority | — | proposed `ironstone.accounting.TaxServices.store#Rate` | Odoo account tax; ERPNext tax templates |
| TaxSimulation | dialog | Explain a sample calculation | organization, gateway, date, parties, addresses, products, amounts, exemptions | — | mantle.other.TaxServices.calculate#SalesTaxLocal (currently stub; extend before use) | Odoo tax computation; Mantle calculate#SalesTax interface |

**Actions:** Validate ambiguous overlapping rules and priority before publishing. Simulation shows item-by-item authority/rate/base/rounding/exemption. Organization default supports invoices without a store; explicit store gateway binding remains authoritative for that store. Published tax version is retained with document result.

**Navigation:** The tax entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §10; TaxAuthorityRate is commented out and requires corrected relationships, not blind enabling.

**Needs:** AC-08.

### TaxStatements

**Layout:** list.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| TaxStatementFind | find | Choose organization, period and authority | organization, year/period, authority, statement type, status | — | — | Dolibarr tax declaration workspace |
| TaxStatementList | list | Show generated statements and revisions | statement, taxpayer/payee, type, period, amount, validation, export | — | entity | Mantle TaxStatement |
| CreateTaxStatement | dialog | Generate supported statement data | organization, period/year, recipient, type | — | mantle.other.TaxServices.create#TaxStatement; mantle.other.TaxServices.create#AllVendor1099MiscStatements; mantle.other.TaxServices.create#Vendor1099MiscStatement | Mantle TaxServices; Dolibarr declaration generation |

**Actions:** Open TaxStatementDetail; generation reports failures per recipient. Existing 1099 data services provide data, not a claim that a historical template satisfies current filing rules.

**Navigation:** The tax entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §10 and §17; Mantle TaxServices.

**Needs:** AC-08; AC-18.

### TaxStatementDetail

**Layout:** detail.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| StatementTaxHeader | display | Show taxpayer and filing basis | type, taxpayer, period, authority, totals, revision | — | entity | Dolibarr tva card |
| StatementTaxLines | list, read | Drill into tax facts | invoice, date, authority/rate, taxable amount, tax, exemption, correction | — | proposed `ironstone.accounting.TaxServices.get#StatementDetail` | Dolibarr `htdocs/compta/tva/quadri_detail.php` |
| StatementOutput | dialog | Produce a supported versioned output | format/version, period, validation result, download | — | mantle.other.TaxServices.get#UsaIrs1099MiscFormData; proposed `ironstone.accounting.TaxServices.export#Statement` | Mantle 1099 form data; Dolibarr declarations |

**Actions:** Preview and export; unsupported jurisdiction/format is explicitly unavailable. Correct through source documents and create a new statement revision. Delete only unissued drafts through mantle.other.TaxServices.delete#TaxStatement; no silent mutation of filed evidence. A sales-tax return aggregates invoice `ItemSalesTax` and `ItemVatTax` lines by `InvoiceItem.taxAuthorityId` and period. Mantle's `create#TaxStatement` takes a DbForm (`formId`), so each supported return has its own DbForm. The first release ships the US 1099 data and local sales tax only (Open: Country/book policy packs).

**Navigation:** The tax entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §10; baseline TaxStatement services.

**Needs:** AC-08; AC-18.

### ElectronicInvoices

**Layout:** list.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ExchangeList | list | Show document delivery and validation state | invoice, format, provider, direction, local status, external status, last error | — | proposed `ironstone.accounting.ExchangeServices.find#Documents` | Odoo account_edi; Dolibarr community einvoicing |
| ExchangePreview | display | Inspect mapped payload and schema validation | invoice, version, XML/data preview, validation errors | — | proposed `ironstone.accounting.ExchangeServices.preview#Document` | Odoo EDI document view |
| ExchangeAction | dialog | Submit, poll or retry the same exchange | exchange id, action, provider, attempt history | — | proposed `ironstone.accounting.ExchangeServices.submit#Document`; proposed `ironstone.accounting.ExchangeServices.poll#Document` | Odoo EDI dispatch and cron |

**Actions:** Payment state and e-invoice acknowledgement are separate. Retry preserves document identity and deduplication key; a rejected document requires corrective revision rather than overwriting transmitted payload. Inbound files enter AP review.

**Navigation:** The tax entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §10; Odoo account_edi layered formats; InvoiceSystemMessage exists, missing X12 component is not assumed.

**Needs:** AC-15; AC-18.

## 12. Budgets

### Budgets

**Layout:** list.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| BudgetList | list | Show budget scope and approval | budget, organization, type, period, status, revision, total | — | entity | Accounting/Budget/FindBudget BudgetList |
| NewBudget | dialog | Create a fiscal budget | organization, type, parent budget, period, name | — | mantle.other.BudgetServices.create#Budget | Accounting/Budget/FindBudget NewBudgetForm |

**Actions:** Create/open BudgetDetail. Project cost caps remain in Projects; a GL budget does not become a project budget merely by sharing an organization.

**Navigation:** The budgets entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §11; Mantle Budget model.

**Needs:** AC-14.

### BudgetDetail

**Layout:** detail.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| BudgetHeader | single | Edit draft metadata | name, organization, period, type, status | — | entity | Accounting/Budget/EditBudget UpdateBudgetForm |
| BudgetMatrix | list, editable rows | Enter account totals by sub-period | account, period, amount, revision, distribution | — | mantle.other.BudgetServices.get#BudgetItemsAccountsSubPeriods; mantle.other.BudgetServices.store#BudgetItemsSubPeriods | Accounting/Budget/BudgetAccountsEntry GlAccountBudgetList |
| BudgetItems | list, editable rows | Maintain detail allocations | item, GL account, amount, asset/facility, description | — | mantle.other.BudgetServices.store#BudgetItem; mantle.other.BudgetServices.store#BudgetItemDetail; mantle.other.BudgetServices.store#BudgetItemDetailsSubPeriods | Accounting/Budget/EditBudgetItems AddItemForm; BudgetItemList |
| BudgetRevision | dialog | Create and approve a changed baseline | budget, base revision, change reason, delta, effective period | — | proposed `ironstone.accounting.BudgetServices.revise#Budget` | Mantle BudgetRevision/Review; ERPNext revision_of |

**Actions:** Save draft, review/approve baseline, revise after approval. Version comparison keeps old numbers; deleting an approved budget is prohibited. Period distribution validates sum matches approved total.

**Navigation:** The budgets entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §11; baseline BudgetAccountsEntry; ERPNext Budget.

**Needs:** AC-14.

### BudgetControls

**Layout:** settings.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| BudgetPolicy | list, editable rows | Choose enforcement scope | organization, budget, account/period, stage request/PO/expense, action Ignore/Warn/Stop, threshold | — | proposed `ironstone.accounting.BudgetServices.store#Policy` | ERPNext Budget Stop/Warn/Ignore |
| BudgetExceptions | list, read | Review blocked and overridden commitments | source document, budget, available, requested, decision, actor/reason | — | proposed `ironstone.accounting.BudgetServices.find#Exceptions` | ERPNext budget enforcement |
| Commitments | list, read | Show each commitment and its lineage | source entity/id/revision, stage (request, PO, expense), budget item or GL account, period, amount, currency, status (Reserved, Converted, Released, Actual), converted from, override reason | link to the source document | entity (proposed BudgetCommitment); proposed `ironstone.accounting.BudgetServices.check#Budget` | ERPNext budget against material request and purchase order |

**Actions:** A proposal explains the relevant budget and remaining balance; approval/conversion rechecks under lock. An override requires finance authority and a recorded reason. Commitments are released by cancellation/conversion links, not double-counted alongside actual expense.

**Commitment contract (D10).** Accounting owns the record and the services (R-ACC-06).
Proposed `mantle.other.budget.BudgetCommitment` holds commitmentId, budget and budget item or glAccountId,
timePeriodId, organization, source entity, id and revision, stage (request, PO or expense),
amount and currency, status (Reserved, Converted, Released or Actual), convertedFromId, and the
policy decision or override reason. Proposed `ironstone.accounting.BudgetServices` has
the proposed `check#Budget` (a read-only preview), `reserve#Commitment`, `convert#Commitment` and
proposed `release#Commitment`, each idempotent per source revision. The callers are fixed (R-XC-37):

- Purchasing's proposed `ApprovalServices.decide#PurchaseApproval` calls `check#Budget` and `reserve#Commitment` at request approval, and `convert#Commitment` (request to PO) at PO approval.
- Purchasing's proposed `close#PurchaseRemainders` and a request cancel call `release#Commitment`.
- Accounting's proposed `approve#Payable` calls `convert#Commitment` (PO to actual).

Purchasing's RequirementBudgetAllocation may link to a commitment; it is not the commitment.
BudgetVariance's committed column reads BudgetCommitment.

**Navigation:** The budgets entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §11; ERPNext budget/budget.json; shared Purchasing/Accounting contract.

**Needs:** AC-14.

## 13. Reports

Reports share organization/date/currency filters and drill-down conventions. The form-list result is the exported dataset; an expanded account tree does not change its totals. No report silently repairs the ledger. Financial comparisons use posted amounts by default; operational quantities can use a clearly labeled live basis.

### Reports

**Layout:** landing.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ReportCatalog | list | Show available reports and saved views | name, area, scope, saved view, description | — | entity/configuration | Accounting/Reports/ReportList; AureusERP Reporting cluster |
| ReportQuickOptions | dialog | Set organization and period before opening | report, organization, period/from-thru, comparison, currency | — | mantle.ledger.LedgerReportServices.get#ReportBasicInfo | Accounting/Reports/ReportList report option forms |

**Actions:** Open a report with common options; reports unavailable for a role are absent. Save a view stores filters, never a bypass of subsequent permissions.

**Navigation:** The reports entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §12 and §17; baseline ReportList.

**Needs:** AC-12.

### TrialBalance

**Layout:** report.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| TrialBalanceOptions | find | Set report basis | organization, period/from-thru, comparison, base/document currency, posted-only, detail filters | — | — | Accounting/TimePeriod/ViewPeriodGlAccounts PeriodGlAccountList |
| TrialBalanceRows | list, read | Trial balance with opening/debit/credit/ending balances. | account, beginning, debits, credits, ending | — | entity `GlAccountOrgTimePeriod`, after mantle.ledger.LedgerServices.recalculate#GlAccountOrgTimePeriodAmounts; mantle.ledger.LedgerServices.get#OrganizationFiscalTimePeriods for the period options only | Accounting/TimePeriod/ViewPeriodGlAccounts PeriodGlAccountList |

**Actions:** Run, save view, print/export and drill into the authorized source record. Preserve the report date/organization/currency basis in navigation. Comparison uses the same calculation for each period; zero denominators show unavailable, not infinity.

**Views:** List and graph where meaningful; pivot for grouped transactional reports. Statements use expandable account rows, not a second ledger.

**States:** No data, no access and calculation error are distinct. Display as-of time and incomplete/unposted-data caveats adjacent to totals.

**Navigation:** The reports entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §12–§13 and §17; Accounting/TimePeriod/ViewPeriodGlAccounts PeriodGlAccountList.

**Needs:** AC-12.

### GeneralLedger

**Layout:** report.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| GeneralLedgerOptions | find | Set report basis | organization, period/from-thru, comparison, base/document currency, posted-only, detail filters | — | — | Accounting/Reports/AccountLedger AccountLedger |
| GeneralLedgerRows | list, read | Read posted entries with account and source drill-down. | account, date, source, debit, credit, running balance | — | mantle.ledger.LedgerReportServices.get#AccountLedgerInfo | Accounting/Reports/AccountLedger AccountLedger |

**Actions:** Run, save view, print/export and drill into the authorized source record. Preserve the report date/organization/currency basis in navigation. Comparison uses the same calculation for each period; zero denominators show unavailable, not infinity.

**Views:** List and graph where meaningful; pivot for grouped transactional reports. Statements use expandable account rows, not a second ledger.

**States:** No data, no access and calculation error are distinct. Display as-of time and incomplete/unposted-data caveats adjacent to totals.

**Navigation:** The reports entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §12–§13 and §17; Accounting/Reports/AccountLedger AccountLedger.

**Needs:** AC-12.

### PartnerLedger

**Layout:** report.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| PartnerLedgerOptions | find | Set report basis | organization, period/from-thru, comparison, base/document currency, posted-only, detail filters | — | — | ERPNext customer/supplier ledger; AureusERP PartnerLedger |
| PartnerLedgerRows | list, read | Read customer/supplier account movements and open items. | party, account, date, source, debit, credit, balance | — | proposed `ironstone.accounting.ReportServices.run#PartnerLedger` | ERPNext customer/supplier ledger; AureusERP PartnerLedger |

**Actions:** Run, save view, print/export and drill into the authorized source record. Preserve the report date/organization/currency basis in navigation. Comparison uses the same calculation for each period; zero denominators show unavailable, not infinity.

**Views:** List and graph where meaningful; pivot for grouped transactional reports. Statements use expandable account rows, not a second ledger.

**States:** No data, no access and calculation error are distinct. Display as-of time and incomplete/unposted-data caveats adjacent to totals.

**Navigation:** The reports entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §12–§13 and §17; ERPNext customer/supplier ledger; AureusERP PartnerLedger.

**Needs:** AC-12.

### BalanceSheet

**Layout:** report.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| BalanceSheetOptions | find | Set report basis | organization, period/from-thru, comparison, base/document currency, posted-only, detail filters | — | — | Accounting/Reports/ReportList BalanceSheetForm |
| BalanceSheetRows | list, read | Compare assets, liabilities and equity. | account class, account, current period, comparison, change | — | mantle.ledger.LedgerReportServices.run#BalanceSheet | Accounting/Reports/ReportList BalanceSheetForm |

**Actions:** Run, save view, print/export and drill into the authorized source record. Preserve the report date/organization/currency basis in navigation. Comparison uses the same calculation for each period; zero denominators show unavailable, not infinity.

**Views:** List and graph where meaningful; pivot for grouped transactional reports. Statements use expandable account rows, not a second ledger.

**States:** No data, no access and calculation error are distinct. Display as-of time and incomplete/unposted-data caveats adjacent to totals.

**Navigation:** The reports entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §12–§13 and §17; Accounting/Reports/ReportList BalanceSheetForm.

**Needs:** AC-12.

### IncomeStatement

**Layout:** report.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| IncomeStatementOptions | find | Set report basis | organization, period/from-thru, comparison, base/document currency, posted-only, detail filters | — | — | Accounting/Reports/ReportList IncomeStatementForm |
| IncomeStatementRows | list, read | Compare income and expense by period. | income/expense group, current, comparison, variance | — | mantle.ledger.LedgerReportServices.run#IncomeStatement | Accounting/Reports/ReportList IncomeStatementForm |

**Actions:** Run, save view, print/export and drill into the authorized source record. Preserve the report date/organization/currency basis in navigation. Comparison uses the same calculation for each period; zero denominators show unavailable, not infinity.

**Views:** List and graph where meaningful; pivot for grouped transactional reports. Statements use expandable account rows, not a second ledger.

**States:** No data, no access and calculation error are distinct. Display as-of time and incomplete/unposted-data caveats adjacent to totals.

**Navigation:** The reports entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §12–§13 and §17; Accounting/Reports/ReportList IncomeStatementForm.

**Needs:** AC-12.

### CashFlow

**Layout:** report.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| CashFlowOptions | find | Set report basis | organization, period/from-thru, comparison, base/document currency, posted-only, detail filters | — | — | Accounting/Reports/ReportList CashFlowStatementForm |
| CashFlowRows | list, read | Explain cash inflows and outflows. | cash category, activity, current, comparison | — | mantle.ledger.LedgerReportServices.run#CashFlowStatement | Accounting/Reports/ReportList CashFlowStatementForm |

**Actions:** Run, save view, print/export and drill into the authorized source record. Preserve the report date/organization/currency basis in navigation. Comparison uses the same calculation for each period; zero denominators show unavailable, not infinity.

**Views:** List and graph where meaningful; pivot for grouped transactional reports. Statements use expandable account rows, not a second ledger.

**States:** No data, no access and calculation error are distinct. Display as-of time and incomplete/unposted-data caveats adjacent to totals.

**Navigation:** The reports entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §12–§13 and §17; Accounting/Reports/ReportList CashFlowStatementForm.

**Needs:** AC-12.

### RetainedEarnings

**Layout:** report.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| RetainedEarningsOptions | find | Set report basis | organization, period/from-thru, comparison, base/document currency, posted-only, detail filters | — | — | Accounting/Reports/ReportList RetainedEarningsStatementForm |
| RetainedEarningsRows | list, read | Explain beginning balance and period movements. | beginning, net income, distributions, ending | — | mantle.ledger.LedgerReportServices.run#RetainedEarningsStatement | Accounting/Reports/ReportList RetainedEarningsStatementForm |

**Actions:** Run, save view, print/export and drill into the authorized source record. Preserve the report date/organization/currency basis in navigation. Comparison uses the same calculation for each period; zero denominators show unavailable, not infinity.

**Views:** List and graph where meaningful; pivot for grouped transactional reports. Statements use expandable account rows, not a second ledger.

**States:** No data, no access and calculation error are distinct. Display as-of time and incomplete/unposted-data caveats adjacent to totals.

**Navigation:** The reports entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §12–§13 and §17; Accounting/Reports/ReportList RetainedEarningsStatementForm.

**Needs:** AC-12.

### FinancialRatios

**Layout:** report.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| FinancialRatiosOptions | find | Set report basis | organization, period/from-thru, comparison, base/document currency, posted-only, detail filters | — | — | Accounting/Reports/ReportList FinancialRatiosForm |
| FinancialRatiosRows | list, read | Display ratios with numerator and denominator drill-down. | ratio, formula, numerator, denominator, result | — | mantle.ledger.LedgerReportServices.run#FinancialRatios | Accounting/Reports/ReportList FinancialRatiosForm |

**Actions:** Run, save view, print/export and drill into the authorized source record. Preserve the report date/organization/currency basis in navigation. Comparison uses the same calculation for each period; zero denominators show unavailable, not infinity.

**Views:** List and graph where meaningful; pivot for grouped transactional reports. Statements use expandable account rows, not a second ledger.

**States:** No data, no access and calculation error are distinct. Display as-of time and incomplete/unposted-data caveats adjacent to totals.

**Navigation:** The reports entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §12–§13 and §17; Accounting/Reports/ReportList FinancialRatiosForm.

**Needs:** AC-12.

### Aging

**Layout:** report.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| AgingOptions | find | Set report basis | organization, period/from-thru, comparison, base/document currency, posted-only, detail filters | — | — | Accounting/Invoice/Aging ReportOptions; InvoiceAgingList; Accounting/Reports/ArAgingSummary; InvoiceAgingDetail |
| AgingRows | list, read | Age receivables/payables and inspect individual invoices. | party, current, bucket amounts, currency, total, due date | — | proposed `ironstone.accounting.ReportServices.run#Aging` over the `InvoiceAgingSummary` and `InvoicePaymentApplicationSummary` views | Accounting/Invoice/Aging ReportOptions; InvoiceAgingList; Accounting/Reports/ArAgingSummary; InvoiceAgingDetail |

**Actions:** Run, save view, print/export and drill into the authorized source record. Preserve the report date/organization/currency basis in navigation. Comparison uses the same calculation for each period; zero denominators show unavailable, not infinity.

**Views:** List and graph where meaningful; pivot for grouped transactional reports. Statements use expandable account rows, not a second ledger.

**States:** No data, no access and calculation error are distinct. Display as-of time and incomplete/unposted-data caveats adjacent to totals.

**Navigation:** The reports entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §12–§13 and §17; Accounting/Invoice/Aging ReportOptions; InvoiceAgingList; Accounting/Reports/ArAgingSummary; InvoiceAgingDetail.

**Needs:** AC-12.

### InvoiceReconciliation

**Layout:** report.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| InvoiceReconciliationOptions | find | Set report basis | organization, period/from-thru, comparison, base/document currency, posted-only, detail filters | — | — | Accounting/Reports/InvoiceReconciliation ReportOptions; InvoiceVsGlList; PaymentVsGlList; NotPostedTxList; CreditNeqDebitTxList; NoInvoiceTxList; ApplicationFutureInvoiceList |
| InvoiceReconciliationRows | list, read | Find subledger/GL and application integrity differences. | check, source, document total, GL total, difference, explanation | — | proposed `ironstone.accounting.ReportServices.run#InvoiceReconciliation` | Accounting/Reports/InvoiceReconciliation ReportOptions; InvoiceVsGlList; PaymentVsGlList; NotPostedTxList; CreditNeqDebitTxList; NoInvoiceTxList; ApplicationFutureInvoiceList |

**Actions:** Run, save view, print/export and drill into the authorized source record. Preserve the report date/organization/currency basis in navigation. Comparison uses the same calculation for each period; zero denominators show unavailable, not infinity.

**Views:** List and graph where meaningful; pivot for grouped transactional reports. Statements use expandable account rows, not a second ledger.

**States:** No data, no access and calculation error are distinct. Display as-of time and incomplete/unposted-data caveats adjacent to totals.

**Navigation:** The reports entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §12–§13 and §17; Accounting/Reports/InvoiceReconciliation ReportOptions; InvoiceVsGlList; PaymentVsGlList; NotPostedTxList; CreditNeqDebitTxList; NoInvoiceTxList; ApplicationFutureInvoiceList.

**Needs:** AC-12.

### BudgetVariance

**Layout:** report.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| BudgetVarianceOptions | find | Set report basis | organization, period/from-thru, comparison, base/document currency, posted-only, detail filters | — | — | Accounting/Budget/BudgetReport GlAccountBudgetList |
| BudgetVarianceRows | list, read | Compare approved budget, commitment and actual. | account, period, approved, committed (from proposed BudgetCommitment), actual, remaining, variance | — | mantle.other.BudgetReportServices.run#BudgetExpenseReport; mantle.other.BudgetReportServices.run#BudgetExpenseDetailReport | Accounting/Budget/BudgetReport GlAccountBudgetList |

**Actions:** Run, save view, print/export and drill into the authorized source record. Preserve the report date/organization/currency basis in navigation. Comparison uses the same calculation for each period; zero denominators show unavailable, not infinity.

**Views:** List and graph where meaningful; pivot for grouped transactional reports. Statements use expandable account rows, not a second ledger.

**States:** No data, no access and calculation error are distinct. Display as-of time and incomplete/unposted-data caveats adjacent to totals.

**Navigation:** The reports entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §12–§13 and §17; Accounting/Budget/BudgetReport GlAccountBudgetList.

**Needs:** AC-12; AC-14.

### AccountBalance

**Layout:** report.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| AccountBalanceOptions | find | Set report basis | organization, period/from-thru, comparison, base/document currency, posted-only, detail filters | — | — | Accounting/Reports/AccountBalance AccountBalanceHistory |
| AccountBalanceRows | list, read | Compare account balance history. | account, period, opening, ending, change | — | mantle.ledger.LedgerReportServices.get#PeriodSeriesSummary | Accounting/Reports/AccountBalance AccountBalanceHistory |

**Actions:** Run, save view, print/export and drill into the authorized source record. Preserve the report date/organization/currency basis in navigation. Comparison uses the same calculation for each period; zero denominators show unavailable, not infinity.

**Views:** List and graph where meaningful; pivot for grouped transactional reports. Statements use expandable account rows, not a second ledger.

**States:** No data, no access and calculation error are distinct. Display as-of time and incomplete/unposted-data caveats adjacent to totals.

**Navigation:** The reports entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §12–§13 and §17; Accounting/Reports/AccountBalance AccountBalanceHistory.

**Needs:** AC-12.

### PostedSummary

**Layout:** report.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| PostedSummaryOptions | find | Set report basis | organization, period/from-thru, comparison, base/document currency, posted-only, detail filters | — | — | Accounting/Reports/PostedAmountSummary ResultListForm; PostedBalanceSummary ResultList |
| PostedSummaryRows | list, read | Group posted amounts and balances. | group, account, period, debit, credit, net, balance | — | mantle.ledger.LedgerReportServices.run#PostedAmountSummary | Accounting/Reports/PostedAmountSummary ResultListForm; PostedBalanceSummary ResultList |

**Actions:** Run, save view, print/export and drill into the authorized source record. Preserve the report date/organization/currency basis in navigation. Comparison uses the same calculation for each period; zero denominators show unavailable, not infinity.

**Views:** List and graph where meaningful; pivot for grouped transactional reports. Statements use expandable account rows, not a second ledger.

**States:** No data, no access and calculation error are distinct. Display as-of time and incomplete/unposted-data caveats adjacent to totals.

**Navigation:** The reports entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §12–§13 and §17; Accounting/Reports/PostedAmountSummary ResultListForm; PostedBalanceSummary ResultList.

**Needs:** AC-12.

### SalesAnalysis

**Layout:** report.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| SalesAnalysisOptions | find | Set report basis | organization, period/from-thru, comparison, base/document currency, posted-only, detail filters | — | — | Accounting/Reports/SalesSummary SummaryOptions; TopProductList; SalesOrderSummaryList; TopCustomerClassList; SalesInvoiceSummaryList; SalesAnalysis SalesAnalysis; SalesInvoiceAnalysis SalesInvoiceAnalysis; InvoiceItemSummary InvoiceItemSummary; OrderItemSummary OrderItemSummary; OrderIssuedInvoiced OrderIssuedInvoiced |
| SalesAnalysisRows | list, read | Analyze sales order/invoice and source reconciliation. | product/customer group, ordered, issued, invoiced, returns, value | — | proposed `ironstone.accounting.ReportServices.run#SalesAnalysis` over `mantle.sales.SalesReportServices.get#SalesOrderSummary`, `get#SalesInvoiceSummary`, `get#SalesTopProduct` and `get#InvoicesByCustomerClass` | Accounting/Reports/SalesSummary SummaryOptions; TopProductList; SalesOrderSummaryList; TopCustomerClassList; SalesInvoiceSummaryList; SalesAnalysis SalesAnalysis; SalesInvoiceAnalysis SalesInvoiceAnalysis; InvoiceItemSummary InvoiceItemSummary; OrderItemSummary OrderItemSummary; OrderIssuedInvoiced OrderIssuedInvoiced |

**Actions:** Run, save view, print/export and drill into the authorized source record. Preserve the report date/organization/currency basis in navigation. Comparison uses the same calculation for each period; zero denominators show unavailable, not infinity.

**Views:** List and graph where meaningful; pivot for grouped transactional reports. Statements use expandable account rows, not a second ledger.

**States:** No data, no access and calculation error are distinct. Display as-of time and incomplete/unposted-data caveats adjacent to totals.

**Navigation:** The reports entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §12–§13 and §17; Accounting/Reports/SalesSummary SummaryOptions; TopProductList; SalesOrderSummaryList; TopCustomerClassList; SalesInvoiceSummaryList; SalesAnalysis SalesAnalysis; SalesInvoiceAnalysis SalesInvoiceAnalysis; InvoiceItemSummary InvoiceItemSummary; OrderItemSummary OrderItemSummary; OrderIssuedInvoiced OrderIssuedInvoiced.

**Needs:** AC-12.

### StockTransactions

**Layout:** report.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| StockTransactionsOptions | find | Set report basis | organization, period/from-thru, comparison, base/document currency, posted-only, detail filters | — | — | Accounting/Reports/AssetOnHand AssetOnHandSummary; AssetOnHandSummary FieldDescriptions; AssetOnHandSummary; AssetReceiptTransaction AssetReceiptTxList; AssetStatusByReceipt FieldDescriptions; AssetOnHandSummary; ShipmentPackageSummary ShipmentPackageSummary |
| StockTransactionsRows | list, read | Read on-hand, receipt/status and package source reports. | facility, product/asset, lot, receipt, quantity, value, package | — | proposed `ironstone.accounting.ReportServices.run#StockTransactions` | Accounting/Reports/AssetOnHand AssetOnHandSummary; AssetOnHandSummary FieldDescriptions; AssetOnHandSummary; AssetReceiptTransaction AssetReceiptTxList; AssetStatusByReceipt FieldDescriptions; AssetOnHandSummary; ShipmentPackageSummary ShipmentPackageSummary |

**Actions:** Run, save view, print/export and drill into the authorized source record. Preserve the report date/organization/currency basis in navigation. Comparison uses the same calculation for each period; zero denominators show unavailable, not infinity.

**Views:** List and graph where meaningful; pivot for grouped transactional reports. Statements use expandable account rows, not a second ledger.

**States:** No data, no access and calculation error are distinct. Display as-of time and incomplete/unposted-data caveats adjacent to totals.

**Navigation:** The reports entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §12–§13 and §17; Accounting/Reports/AssetOnHand AssetOnHandSummary; AssetOnHandSummary FieldDescriptions; AssetOnHandSummary; AssetReceiptTransaction AssetReceiptTxList; AssetStatusByReceipt FieldDescriptions; AssetOnHandSummary; ShipmentPackageSummary ShipmentPackageSummary.

**Needs:** AC-12.

## 14. Related records

### OrderDetail (Context passed)

**Context passed.** Mount `Accounting/Records/OrderDetail` using OrderDetail, crosscut §3.6. Fix organization; show Header, Items, Invoices/payments, Fulfillment, History, as the crosscut Accounting row has them. Purchasing/order changes stay with their permission sets. Do not require Sales/Purchasing launcher grants to view an authorized source order. Preserve Projects estimates/milestone shares.

**Invoice from source (D2).** Create invoice or bill opens the shared InvoiceFromSource dialog
(crosscut §3.6), which calls proposed `ironstone.accounting.InvoiceServices.create#InvoiceFromSource`.
Its inputs are the order part, items and quantities, a through date and a down-payment percent.
The ordered basis uses `mantle.account.InvoiceServices.create#EntireOrderPartInvoice`. The received
basis bills accepted, released quantity only and never calls raw `create#PurchaseShipmentInvoices`.
It applies existing order payments through `mantle.account.PaymentServices.apply#OrderPaymentsToInvoice`,
behind the AC-02 duplicate-source guard. Purchasing's proposed `confirm#DropShipDelivery` calls the same
service for a drop shipment: the customer invoice for the sales part and the incoming draft bill
for the purchase part, with the confirmed delivered quantity as accepted (R-SB-20).

**Holds (D7).** A hold banner shows the order's open proposed `mantle.order.OrderHoldReason` rows
(Credit, Change, Purchase) with their reasons and who placed them. Holds are placed by
proposed `mantle.order.OrderServices.hold#Order` and released by proposed `release#OrderHold`, which returns the
order to OrderApproved only when no other reason is open. A credit manager releases a Credit hold
with Release (AR + APPROVE) through proposed `CreditServices.release#CreditHold`, which writes a
CreditHoldDecision. Every BOSS approve action runs a guard that calls proposed
`CreditServices.evaluate#OrderCredit` before `mantle.order.OrderServices.approve#Order`. The same
service runs as a SECA on `check#OrderPreApprove` for Mantle's auto-approval (§1.4). Reservations
made at OrderPlaced stay while the order is held.

**Between pack and ship (D3).** The Mantle pack SECA creates the sales invoice at ShipPacked and is
kept. To reopen a package or change the order before shipment,
proposed `ironstone.accounting.InvoiceServices.release#ShipmentDraftInvoice` (shipmentId, reason,
operationId) removes the shipment's lines and OrderItemBilling from the InvoiceInProcess pack
invoice and clears `ShipmentItemSource.invoiceId`. A captured payment returns to unapplied, or
proposed `ironstone.accounting.SettlementServices.refund#OrderPayment` refunds it when the change
reduces the order. Warehouse "Reopen package", Pick/Pack put-back and Customer Service's
proposed `apply#OrderChange` call it; the accounting permission is checked inside. A finalized invoice still
needs the crosscut InvoiceCorrection dialog. This is Accounting's receiving action for Customer
Service's cancel-remainder change (D9).

**Needs:** AC-02; AC-03; AC-11.

### ShipmentDetail (Context passed)

**Context passed.** Mount `Accounting/Records/ShipmentDetail` using ShipmentDetail, crosscut §3.8. Fix organization; show Items/sources, receipt/issue facts, money and documents, as the crosscut Accounting row has them. Finance reads physical facts and opens invoice and matching; it does not edit received quantities to force matching. A sales invoice for a shipment comes from the kept pack SECA (`create#SalesShipmentInvoices`, D3). A purchase bill for a receipt comes from the InvoiceFromSource dialog on the received basis, which calls proposed `create#InvoiceFromSource` (see [OrderDetail](#orderdetail-context-passed)). The receipt SECA runs only for self-billing suppliers (§1.4). Landed-cost allocation links to [LandedCosts](#landedcosts).

**Needs:** AC-02; AC-03; AC-07.

### Product360 (Context passed)

**Context passed.** Mount `Accounting/Records/Product360` using Product360, crosscut §3.5. Show Summary, Costs/history, source movements and permitted Prices, as the crosscut Accounting row has them; inventory quantities and BOM costs are read projections. Finance controls valuation/revaluation; Products' cost estimators draft and standard-cost approvers approve standard estimates. No price/standard-cost edit rewrites receipt cost or posted ledger value. A GL mappings pane over `ProductGlAccount` and `ProductCategoryGlAccount` is not in the crosscut definition; it is the Open item "Product360 GL mappings". Until then those mappings are edited in PostingDefaults, by organization.

**Needs:** AC-07; AC-12.

### ReturnDetail (Context passed)

**Context passed.** Mount `Accounting/Records/ReturnDetail` using ReturnDetail, crosscut §3.18. Show authorization, received/disposed quantity, previous credits/refunds, original invoice/payment and ReturnItemBilling. Accounting issues credit/refund only for eligible quantity/amount under shared cumulative locks. Physical receipt remains Warehouse action. Existing `mantle.order.ReturnServices.process#ReturnItemResponses` runs only inside the settlement service below.

**Settlement (D11).** Accounting owns settlement for customer and supplier returns through
proposed `ironstone.accounting.ReturnSettlementServices.preview#Return` and `settle#Return`
(R-ACC-28). Crosscut §3.18 ReturnSettlement cites the same names.

- In: returnId, item quantity or amount, response (credit, refund or replace), refund method, previewVersion, operationKey; receiptless with a reason.
- Out: the credit invoiceId, the refund paymentId, and the result codes `CreditCapExceeded`, `ReceiptChanged`, `ClosedPeriod`, `RefundPending` and `Forbidden`.
- The preview shows the credit, its tax and rounding lines, and a restocking fee, which is an InvoiceItem on the credit memo.
- Customer Service's proposed `authorize#Return` settles nothing at approval, and Mantle's `ReturnApprovedProcess` keeps only `create#ReturnShipment` (§1.4). An advance replacement or instant credit is an explicit `settle#Return` response with a receipt-due follow-up, and it needs a published policy and the finance capability.
- Settlement reads `ReturnItem.receivedQuantity`, which Warehouse's proposed `receive#ReturnItems` writes for accepted and rejected units alike. A second box, or a unit rejected at the dock, can still be credited against the RMA.
- A receiptless credit is `settle#Return` with `receiptless=true`, a reason and finance approver. `receive#ReturnWithoutShipment` is not exposed.
- A return in `ReturnManResp` (Mantle could not respond automatically) shows its items for a manual response.
- Supplier branch: per the response it creates an incoming supplier credit memo (`InvoiceCreditMemo`, supplier to organization) or a debit note. It links ReturnItemBilling to the original bill item and refuses an amount over the billed eligible value. It credits only the billed portion; returning an unbilled quantity reduces the match-eligible receipt and needs no credit. Warehouse's proposed `ship#SupplierReturn` sets ReturnShipped, and PayablesWorkbench ApplySupplierCredit applies the credit.
- ReturnHeader reaches ReturnReceived when every authorized item is physically handled, and ReturnCompleted only when every item's response is complete; `settle#Return` completes each item it settles through `complete#ReturnItem`. Settlement progress is read from ReturnItemBilling, not a new status.
- `settle#Return` queues match re-evaluation for the affected bills (`MatchServices.queue#MatchReevaluation`).

**Needs:** AC-02; AC-03.

### Approvals (Context passed)

**Context passed.** Mount `Accounting/Approvals` using Approvals waiting, crosscut §3.15. Mount the Commons approvals screen with bill, payment-run, credit-hold release, budget and close requests filtered to the current organization and actual approver. Open the source preview before deciding. Decisions call the source service and are recorded there; the notification item is not the authoritative approval.

The Accounting topics (proposed NotificationTopic seed, AC-18) and their handlers (R-ACC-23):

| Topic | Decided through |
| --- | --- |
| `BillApproval` | proposed `InvoiceServices.approve#Payable` |
| `BillHoldRelease` | proposed `MatchServices.release#InvoiceHold`, asked for by proposed `request#HoldRelease` |
| `PaymentRunApproval` | proposed `PaymentRunServices.approve#Run` |
| `CreditHoldRelease` | proposed `CreditServices.release#CreditHold` |
| `BudgetOverride` | the BudgetControls override, recorded on the BudgetCommitment |
| `PaymentValidation` | the guarded Payment status transition |
| `ProductionCostReview` | a notification that opens ProductionCostClose from the cost close queue |

A financial topic with an amount opens the source preview; it is never approved inline from the
list. Crosscut §3.15 gets the Accounting per-app row (R-XC-12).

**Needs:** AC-02; AC-03; AC-04; AC-06; AC-11; AC-14; AC-18.

## 15. Settings

### Settings

**Layout:** settings.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| SettingsIndex | list | Open policy screens and show readiness | organization, area, missing configuration, role required | — | mantle.ledger.LedgerServices.find#PartyAcctgPreference | Accounting/OrgSettings; Carbon configure menu |

**Actions:** Open Setup or policy editor. Finance setup differs from system integration credentials; link authorized Admin configuration only when available.

**Navigation:** The settings entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §14; baseline OrgSettings.

**Needs:** AC-01.

### Setup

**Layout:** wizard.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| SetupBasis | wizard step | Choose chart and fiscal conventions | organization, base currency, fiscal-year start, chart, COGS policy, opening date | — | mantle.ledger.LedgerServices.init#PartyAccountingConfiguration | Accounting/OrgSettings/AcctgPreference; Carbon ActivationSteps |
| OpeningBalances | list, editable rows | Review trial balance and source subledgers | account, debit/credit, open AR/AP, inventory/WIP, asset book, migration clearing | — | proposed `ironstone.accounting.SetupServices.preview#OpeningBalances` | Carbon Activation/TrialBalanceEditor; InventoryCostTable; FixedAssetDepreciationTable |
| OpenItemImport | list, editable rows | Create each open customer invoice and supplier bill at cutover | party, direction, document number, document date, original due date, currency, open amount, migration clearing account, row result | file upload with per-row results | proposed `ironstone.accounting.SetupServices.import#OpenItems` | ERPNext Opening Invoice Creation Tool; Carbon Activation MigrationClearingTable |
| Readiness | wizard step | Resolve missing setup and reconcile sources | account mappings, periods, tax method, bank methods, open-item tie-out, WIP and transfer accounts, production costing basis, single-currency check, paused reminder job, blockers | — | proposed `ironstone.accounting.SetupServices.check#Readiness` | Carbon Activation/ReadinessChecklist |
| Activate | wizard step | Commit approved opening state once | run version, organization, opening date, totals, approval | — | proposed `ironstone.accounting.SetupServices.activate#Accounting` | Carbon ApplyCarbonButton |

**Actions:** Save draft, rerun preview, confirm activation. Opening entries and subledger import identities prevent a repeated activation. Mapping/import errors are reviewable by row; activation waits for a balanced reviewed set. Operational documents may remain drafts until setup permits posting.

OpenItemImport creates real Invoice records (R-ACC-30). Each is InvoiceFinalized (customer) or
InvoiceApproved (supplier), keeps its original due date, carries a proposed opening flag and
posts against the migration clearing account. Aging, dunning and payment runs therefore work on
the first day. Readiness also checks these rows:

- Single currency until AC-19: every open document and every active price is in the base currency (D18).
- `AssetTypeGlAccount.wipAssetGlAccountId` and `transferGlAccountId` are set, and the organization has a production costing basis (ProductionCostClose rule 4). Without `transferGlAccountId` a transfer issue posts to COGS.
- Mantle's `send_SalesInvoicePastDueEmails` job is still paused (§1.4).

**Navigation:** The settings entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §1 and §14; actual Carbon activation sources; Mantle initialization service.

**Needs:** AC-01; AC-18.

### AccountingPreferences

**Layout:** settings.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| AccountingPreferences | single | Edit fiscal, currency and numbering defaults | base currency, year start, COGS, default terms, numbering prefixes, GL mask, error journal | — | entity | Accounting/OrgSettings/AcctgPreference EditPapForm |
| ClonePreferences | dialog | Copy selected configuration into a new organization | source, destination, selected mapping groups, conflict preview | — | proposed `ironstone.accounting.SetupServices.clone#Preferences` | Accounting/OrgSettings/AcctgPreference CloneAcctgSettingsForm |

**Actions:** Preview clone conflicts; do not overwrite live posted-history policy. Base currency and COGS changes after activation require a migration/revaluation design, not a routine form save.

**Navigation:** The settings entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §14; baseline AcctgPreference.

**Needs:** AC-01; AC-07.

### PostingDefaults

**Layout:** settings.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| PostingMappings | list, editable rows | Set defaults by business type | organization, mapping kind, type/item/instrument/asset/reason/product/product category, account, effective scope | — | entity (including `ProductGlAccount` and `ProductCategoryGlAccount`) | Accounting/OrgSettings TypeDefaults; ItemTypes; InvoiceTypes; PaymentTypes; PaymentInstruments; AssetTypes; FinAcctTypes; FinAcctReasons; GlAccounts |
| MissingMappings | list | Find unmapped types before posting | kind, enum/type, required account, affected documents | — | mantle.ledger.LedgerServices.get#DefaultGlAccountByType | Accounting/OrgSettings MissingConfigForm and AllConfigList |

**Actions:** Show mapping precedence and affected organization. Validate account posting class/currency/organization before save. A missing map blocks the affected posting and names the missing type; it never silently sends all failures to a suspense account.

**Navigation:** The settings entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §14; Carbon AccountDefaultsForm; baseline OrgSettings.

**Needs:** AC-01; AC-07.

### PaymentTerms

**Layout:** settings.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| SettlementTerms | list, editable rows | Set due terms | name and description, term type, term value and unit (due days or date basis) | — | entity | Mantle SettlementTerm; Carbon PaymentTerms |

**Actions:** Save term for future documents; invoices retain adopted terms and explicit due date. Recompute an existing draft only after confirmation; issued invoice changes are audited.

`SettlementTerm` has only `termTypeEnumId`, `termValue` and `termValueUomId`; the seeded "2% within
10 days" exists only as description text, and Invoice has one `dueDate` (R-ACC-12). Early-payment
discounts, installments and versions are the Open item "Payment term discounts and installments";
until it is decided this form edits due terms only, and the discount columns on PayablesWorkbench
and PaymentRunDetail stay empty.

**Navigation:** The settings entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §14; active SettlementTerm.

**Needs:** AC-02.

### Currencies

**Layout:** settings.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| CurrencyList | list | Inspect currency units and rounding | currency code, description, decimals, active | — | entity | Framework Uom; baseline currency conversion |
| ExchangeRates | list, editable rows | Maintain explicit dated rates | from/to currency, from/thru, factor, source, fetched/manual | — | entity; proposed `ironstone.accounting.CurrencyServices.refresh#Rates` | Carbon ExchangeRates; ERPNext Currency Exchange |

**Actions:** Preview fetched rates before promotion when policy requires it. Documents retain the chosen rate/date/source; later rate edits affect future conversions only. Missing or ambiguous rate blocks affected posting.

Currencies is the only screen that edits currency units and their exchange rates; Products Units
excludes them (D17). Rates are `moqui.basic.UomConversion` rows, whose `conversionFactor` is a
float. Posting therefore stores the applied rate as a decimal, with its date and source, on the
transaction and the document (AC-19).

**Navigation:** The settings entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §14; Carbon exchange rates; framework unit conversion records.

**Needs:** AC-16; AC-19.

### PaymentMethods

**Layout:** settings.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| PaymentMethodList | list | Show usable organization methods | method, instrument, organization, currency, masked identifier, gateway | — | mantle.account.PaymentMethodServices.get#PartyPaymentMethodInfoList | Party payment methods; Gateway payment settings |
| PaymentMethodEdit | single | Save permitted metadata and tokenized details | owner, method type, instrument, display name, token reference, from/thru | — | mantle.account.PaymentMethodServices.store#PaymentMethodInfo; mantle.account.PaymentMethodServices.update#PaymentMethodMutable | Party payment method editor |
| GatewayBinding | list, editable rows | Bind configured gateways to methods/use cases | organization, method, gateway id, allowed operation, active | — | entity | Odoo payment provider; Mantle PaymentGatewayConfig |

**Actions:** Finance edits business bindings and masked methods. Gateway secrets, executable service names and transport credentials remain Admin-restricted; the screen links rather than exposes them. A payment method used by history is expired, not removed from that history.

**Navigation:** The settings entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §7 and §14; crosscut §5.

**Needs:** AC-02; AC-18.

### CollectionPolicies

**Layout:** settings.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| DunningLevels | list, editable rows | Set cadence and language templates | level, overdue range, cadence, channel, template, exclude disputed, effective dates | — | proposed `ironstone.accounting.CollectionServices.store#Level` | ERPNext Dunning Type; Akaunting reminder cadence |
| CreditDefaults | single | Set defaults for new customer credit policy | organization, currency, limit, overdue days, warn/hold, bypass capability | — | proposed `ironstone.accounting.CreditServices.store#Defaults` | ERPNext Customer Credit Limit |

**Actions:** Preview impact on open orders and pending notices; new policy does not retroactively mark documents paid/approved. Customer-specific limits are edited on Customer360 through proposed `CreditServices.store#Policy`. Fees/interest remain opt-in later policy requiring separate posting.

**Navigation:** The settings entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §5 and §13; ERPNext credit and dunning.

**Needs:** AC-10; AC-11.

### BankRules

**Layout:** settings.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| BankMatchRules | list, editable rows | Match descriptions and references within exact scope | bank, priority, condition, party/account suggestion, tolerance, enabled, auto-apply | — | proposed `ironstone.accounting.BankServices.store#Rule` | ERPNext Bank Transaction Rule |
| TestBankRule | dialog | Preview matches without posting | rule version, sample statement lines, candidates, ambiguity | — | proposed `ironstone.accounting.BankServices.test#Rule` | ERPNext bank transaction rules |

**Actions:** Default suggests only. Enable auto-apply solely for exact unambiguous matches; priority conflicts require review. A rule never creates unbalanced fees or ignores a statement difference.

**Navigation:** The settings entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §8 ERPNext rules; existing reconciliation services.

**Needs:** AC-05.

### DocumentSettings

**Layout:** settings.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| DocumentDefaults | single | Set numbering and document layouts | organization, document kind, prefix/sequence, template, locale, email template, footer | — | entity; proposed `ironstone.accounting.DocumentServices.validate#Template` | Akaunting invoice templates; baseline PartyAcctgPreference numbering |
| DocumentPreview | display | Preview before activation | sample invoice/payment, locale, currency, selected template | — | proposed `ironstone.accounting.DocumentServices.preview#Output` | Ever Gauzy invoice template preview |

**Actions:** Preview with representative long lines, multi-page totals and tax. Already issued document numbers are not resequenced; permitted corrections retain original identity.

**Navigation:** The settings entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §4 and §14; Ever Gauzy templates; baseline print screens.

**Needs:** AC-18.

### MatchPolicies

Accounting owns the bill-match policy (D4; R-PUR-08). Purchasing's PolicyDependencies links here
read-only, and crosscut §3.22 InvoiceMatch reads the rule version from it.

**Layout:** settings.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| MatchPolicyRules | list, editable rows | Version the match rules per organization, with product and category overrides | organization, product category or product override, bill basis (ordered or received quantity), receipt required before bill, quantity tolerance, price tolerance and tax tolerance (each a percent or an amount), same-rate action (Warn or Stop), service-acceptance policy, self-billing default for new suppliers, effective from/thru, version | effective-date overlap check | proposed `ironstone.accounting.MatchServices.store#MatchPolicy` | Odoo product bill control (ordered or received quantities); ERPNext over-billing allowance; new match controls specified here |

The listed fields are the full field list of the new form; each row is
a proposed `mantle.account.invoice.InvoiceMatchPolicy`.

**Actions:** Save a new version; it applies to bills evaluated after its effective date. An
existing match result keeps its rule version and is re-evaluated only through
`MatchServices.queue#MatchReevaluation`. The self-billing default sets the proposed
`SupplierProfile.selfBillingIndicator` of a new supplier; finance changes the indicator on
Supplier360 (D2). A product override wins over a category override, which wins over the
organization row.

**Navigation:** The settings entry, InvoiceMatch exceptions and Purchasing PolicyDependencies link here. Back preserves find filters.

**Source:** research §6; crosscut §3.22; Purchasing PolicyDependencies.

**Needs:** AC-03.

### CostingPolicies

Accounting owns the production allocation policy (D12; R-ACC-09). ProductionCostClose reads the
version effective on its accounting date. Manufacturing's ProductionSettings TimeAndCost links
here read-only; the overhead basis lives only here (R-SA-18).

**Layout:** settings.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| ProductionAllocationPolicy | list, editable rows | Version the overhead, co-product and variance policy | organization, effective from/thru, overhead basis (labor hours, machine hours or percent of material), rates and currency, by-product and co-product method (quantity, value or explicit weights), variance accounts, version | decimal rates | proposed `ironstone.accounting.ProductionCostServices.store#AllocationPolicy` | new policy controls specified here; Carbon JobEstimatesVsActuals |

The listed fields are the full field list of the new form; each row is
a proposed `mantle.work.production.ProductionAllocationPolicy`.

**Actions:** Save a new version; a posted cost close keeps the version it used. Explicit output
weights are allowed in ProductionCostClose only where the effective policy permits them.

**Navigation:** The settings entry, ProductionCostClose and Manufacturing ProductionSettings link here. Back preserves find filters.

**Source:** research §15; Manufacturing §14 Open (allocation basis, now settled here).

**Needs:** AC-07.

## 16. Baseline coverage

### 16.1 Candidate inventory and baseline forms

Every research candidate area is represented in §2: recurring bills share RecurringInvoices; customer credits and supplier debit notes are contextual InvoiceDetail/BillDetail records; fixed-asset capitalization, adjustment, disposal and reversal are the EquipmentDetail book dialogs, and stock revaluation is the InventoryValuation preview and post; customer/supplier agreements contribute terms without duplicating agreement authoring. Advanced leases, recognition, FX/deferrals, intercompany/consolidation and electronic invoices are explicit later screens.

The following maps all 166 Accounting inventory forms, plus the financial Party and asset forms this design uses. Names are exact inventory cells. It also records deliberate replacements: UpdateAcctgTransPosted is covered by the read-only posted view plus audited metadata/reversal actions, not an unrestricted amount editor. The implementation column is unchanged.

| Baseline area / screen | Forms | Designed screen(s) |
| --- | --- | --- |
| Accounting/BudgetAccountsEntry | `GlAccountBudgetList` | `Accounting/Budgets/BudgetDetail` |
| Accounting/BudgetReport | `GlAccountBudgetList` | `Accounting/Reports/BudgetVariance` |
| Accounting/EditBudget | `UpdateBudgetForm` | `Accounting/Budgets/BudgetDetail` |
| Accounting/EditBudgetItems | `AddItemForm`, `BudgetItemList` | `Accounting/Budgets/BudgetDetail` |
| Accounting/FindBudget | `NewBudgetForm`, `BudgetList` | `Accounting/Budgets/Budgets` |
| Accounting/EditFinancialAccount | `StatementForm`, `UpdateFinancialAccountForm` | `Accounting/Banking/FinancialAccountDetail` |
| Accounting/FinancialAccountTrans | `AdjustFinancialAccount`, `TransactionList` | `Accounting/Banking/FinancialAccountDetail` |
| Accounting/FindFinancialAccount | `NewFinancialAccountForm`, `FinancialAccountList` | `Accounting/Banking/FinancialAccounts` |
| Accounting/FindJournal | `CreateGlJournal`, `TransactionList` | `Accounting/GeneralLedger/JournalBatches` |
| Accounting/EditGlAccount | `EditGlAccountForm`, `NewGlAccountOrgForm`, `GlAccountOrgList` | `Accounting/GeneralLedger/AccountDetail` |
| Accounting/FindGlAccount | `NewGlAccountForm`, `GlAccountListForm` | `Accounting/GeneralLedger/ChartOfAccounts` |
| Accounting/Aging | `ReportOptions`, `InvoiceAgingList` | `Accounting/Reports/Aging` |
| Accounting/EditInvoice | `AdjustInvoice`, `OutSystemMessageList`, `AuditLogList`, `EditInvoice`, `NewContentForm`, `UpdateContentForm`, `SendFinalizedEmailForm`, `EmailMessageList`, `NewCreditMemoForm`, `RecordPaymentForm`, `PaymentApplicationList`, `OrderPromisedPaymentList`, `UnappliedPaymentList`, `UnpaidInvoiceList`, `InvoiceTxList`, `InvoiceGlaList` | `Accounting/Receivables/InvoiceDetail`; `Accounting/Payables/BillDetail` |
| Accounting/EditInvoice | `SendPastDueEmailForm` | `Accounting/Receivables/InvoiceDetail`; `Accounting/Receivables/Dunning` |
| Accounting/EditInvoiceItemDetails | `AddDetailForm`, `AssetItemDetailList`, `FacilityItemDetailList`, `ItemDetailList` | `Accounting/Receivables/InvoiceDetail`; `Accounting/Payables/BillDetail` |
| Accounting/EditInvoiceItemOrders | `ApplyToOrder`, `ApplyItemToOrder`, `ItemBillingList` | `Accounting/Receivables/InvoiceDetail`; `Accounting/Payables/BillDetail` |
| Accounting/EditInvoiceItemShipments | `ApplyToShipment`, `ApplyItemToShipment`, `ItemSourceList` | `Accounting/Receivables/InvoiceDetail`; `Accounting/Payables/BillDetail` |
| Accounting/EditInvoiceItems | `CreateInvoiceItem`, `EditInvoiceItems` | `Accounting/Receivables/InvoiceDetail`; `Accounting/Payables/BillDetail` |
| Accounting/FindInvoice | `NewPayableForm`, `NewSupCreditForm` | `Accounting/Payables/Bills` |
| Accounting/FindInvoice | `NewReceivableForm`, `NewCustCreditForm` | `Accounting/Receivables/Invoices` |
| Accounting/FindInvoice | `ProjectInvoice`, `ProjectWorkerInvoice`, `WorkerInvoice` | `Accounting/Receivables/BillingQueue` |
| Accounting/FindInvoice | `CustomerStatementForm` | `Accounting/Receivables/Statements` |
| Accounting/FindInvoice | `MainOptions`, `InvoiceList`, `AgingSummaryList` | `Accounting/Receivables/Invoices`; `Accounting/Payables/Bills` |
| Accounting/AcctgPreference | `EditPapForm`, `CloneAcctgSettingsForm` | `Accounting/Settings/AccountingPreferences` |
| Accounting/AssetTypes | `AddConfigForm`, `AllConfigList` | `Accounting/Settings/PostingDefaults` |
| Accounting/FinAcctReasons | `AllTypesList` | `Accounting/Settings/PostingDefaults` |
| Accounting/FinAcctTypes | `AllTypesList` | `Accounting/Settings/PostingDefaults` |
| Accounting/GlAccounts | `NewGlAccountOrgForm`, `GlAccountOrgList` | `Accounting/Settings/PostingDefaults` |
| Accounting/InvoiceTypes | `AddConfigForm`, `MissingConfigForm`, `AllConfigList` | `Accounting/Settings/PostingDefaults` |
| Accounting/ItemTypes | `AddConfigForm`, `MissingConfigForm`, `AllConfigList` | `Accounting/Settings/PostingDefaults` |
| Accounting/PaymentInstruments | `AllEnumList` | `Accounting/Settings/PostingDefaults` |
| Accounting/PaymentTypes | `AddConfigForm`, `MissingConfigForm`, `AllConfigList` | `Accounting/Settings/PostingDefaults` |
| Accounting/TypeDefaults | `AllEnumList` | `Accounting/Settings/PostingDefaults` |
| Accounting/BulkPaymentCheck | `PaymentList`, `PaymentListAssignRef`, `PaymentListActions` | `Accounting/Payables/PaymentRunDetail` |
| Accounting/EditPayment | `RefundPaymentForm`, `AuditLogList`, `EditPayment`, `GatewayAuthorizeForm`, `GatewayCaptureForm`, `GatewayRefundForm`, `SetRefundForForm`, `GatewayRefundForForm`, `RefundPaymentList`, `PaymentApplicationList`, `UnpaidInvoiceList`, `UnappliedPaymentList`, `PaymentTxList`, `InvoiceGlaList`, `NewContentForm`, `UpdateContentForm`, `GatewayResponseList` | `Accounting/Payments/PaymentDetail` |
| Accounting/FindPayment | `NewInPaymentForm`, `NewOutPaymentForm`, `PaymentList` | `Accounting/Payments/Payments` |
| Accounting/AccountBalance | `AccountBalanceHistory` | `Accounting/Reports/AccountBalance` |
| Accounting/AccountLedger | `AccountLedger` | `Accounting/Reports/GeneralLedger` |
| Accounting/ArAgingSummary | `ReportOptions`, `InvoiceAgingList` | `Accounting/Reports/Aging` |
| Accounting/AssetOnHand | `AssetOnHandSummary` | `Accounting/Reports/StockTransactions` |
| Accounting/AssetOnHandSummary | `FieldDescriptions`, `AssetOnHandSummary` | `Accounting/Reports/StockTransactions` |
| Accounting/AssetReceiptTransaction | `AssetReceiptTxList` | `Accounting/Reports/StockTransactions` |
| Accounting/AssetStatusByReceipt | `FieldDescriptions`, `AssetOnHandSummary` | `Accounting/Reports/StockTransactions` |
| Accounting/AssetValuation | `AssetValuationSummary` | `Accounting/Inventory/InventoryValuation` |
| Accounting/InvoiceAgingDetail | `ReportOptions`, `InvoiceAgingList` | `Accounting/Reports/Aging` |
| Accounting/InvoiceItemSummary | `InvoiceItemSummary` | `Accounting/Reports/SalesAnalysis` |
| Accounting/InvoiceReconciliation | `ReportOptions`, `InvoiceVsGlList`, `PaymentVsGlList`, `NotPostedTxList`, `CreditNeqDebitTxList`, `NoInvoiceTxList`, `ApplicationFutureInvoiceList` | `Accounting/Reports/InvoiceReconciliation` |
| Accounting/OrderIssuedInvoiced | `OrderIssuedInvoiced` | `Accounting/Reports/SalesAnalysis` |
| Accounting/OrderItemSummary | `OrderItemSummary` | `Accounting/Reports/SalesAnalysis` |
| Accounting/PostedAmountSummary | `ResultListForm` | `Accounting/Reports/PostedSummary` |
| Accounting/PostedBalanceSummary | `ResultList` | `Accounting/Reports/PostedSummary` |
| Accounting/ReportList | `BalanceSheetForm` | `Accounting/Reports/BalanceSheet` |
| Accounting/ReportList | `IncomeStatementForm` | `Accounting/Reports/IncomeStatement` |
| Accounting/ReportList | `CashFlowStatementForm` | `Accounting/Reports/CashFlow` |
| Accounting/ReportList | `RetainedEarningsStatementForm` | `Accounting/Reports/RetainedEarnings` |
| Accounting/ReportList | `FinancialRatiosForm` | `Accounting/Reports/FinancialRatios` |
| Accounting/ReportList | `CustomerStatementForm` | `Accounting/Receivables/Statements` |
| Accounting/ReportList | `AccountLedgerForm` | `Accounting/Reports/GeneralLedger` |
| Accounting/ReportList | `AccountBalanceForm` | `Accounting/Reports/AccountBalance` |
| Accounting/ReportList | `PostedAmountSummaryForm`, `PostedBalanceSummaryForm` | `Accounting/Reports/PostedSummary` |
| Accounting/SalesAnalysis | `SalesAnalysis` | `Accounting/Reports/SalesAnalysis` |
| Accounting/SalesInvoiceAnalysis | `SalesInvoiceAnalysis` | `Accounting/Reports/SalesAnalysis` |
| Accounting/SalesSummary | `SummaryOptions`, `TopProductList`, `SalesOrderSummaryList`, `TopCustomerClassList`, `SalesInvoiceSummaryList` | `Accounting/Reports/SalesAnalysis` |
| Accounting/ShipmentPackageSummary | `ShipmentPackageSummary` | `Accounting/Reports/StockTransactions` |
| Accounting/EditTimePeriod | `CreateNextPeriod`, `CreatePreviousPeriod`, `ViewTimePeriod`, `CreateChild`, `TimePeriodList` | `Accounting/PeriodClose/Periods` |
| Accounting/FindTimePeriod | `CreatePeriod`, `TimePeriodList` | `Accounting/PeriodClose/Periods` |
| Accounting/ViewPeriodGlAccounts | `ClosingTransForm`, `PeriodGlAccountList` | `Accounting/PeriodClose/PeriodCloseDetail` |
| Accounting/EditTransaction | `UpdateAcctgTrans`, `UpdateAcctgTransPosted`, `AddEntryForm`, `EntryListForm`, `AuditLogList` | `Accounting/GeneralLedger/JournalEntryDetail` |
| Accounting/MoveEntry | `ReceiveForm` | `Accounting/GeneralLedger/JournalEntryDetail` |
| Accounting/FindTransaction | `CreateAcctgTrans`, `TransactionList` | `Accounting/GeneralLedger/JournalEntries` |
| Accounting/FindTransactionEntry | `TransactionEntryList` | `Accounting/GeneralLedger/TransactionEntries` |
| Accounting/OrgInternalSummary | `OrgInternalForm` | `Accounting/Home` |
| Asset/AssetDetail | `AssetDepreciationList` | `Accounting/FixedAssets/EquipmentDetail`; `Accounting/FixedAssets/DepreciationRunDetail` |
| Asset/AssetDetail | `UpdateAssetAcquireCost` | `Accounting/FixedAssets/EquipmentDetail` (AcquireCostRepair) |
| Asset/FindAsset | `UpdateProductCost` | `Accounting/Inventory/InventoryValuation` (CostDataRepair) |
| Party/EditParty | `FinancialAccountList` | `Accounting/Banking/FinancialAccounts` |
| Party/UpdatePaymentMethodInfo | `PaymentMethodInfoForm` | `Accounting/Settings/PaymentMethods` |
| Party/FinancialInfo | `UnpaidInvoiceList`, `PaymentList`, `OrderList`, `PaidInvoiceList` | `Accounting/Receivables/Customer360` |
| Party/FinancialInfo | `UnpaidPayablesList`, `OutgoingPaymentList`, `PurchaseOrderList`, `PaidPayablesList` | `Accounting/Payables/Supplier360` |
| Party/EditPaymentMethod | `PaymentMethodInfoForm`, `NewContentForm`, `UpdateContentForm`, `UpdateBankAccountMutable`, `UpdatePaymentMethodMutable` | `Accounting/Banking/BankAccountDetail`; `Accounting/Settings/PaymentMethods` |
| Party/PaymentGatewayResponses | `GatewayResponseList` | `Accounting/Payments/GatewayTransactions` |
| Party/PaymentMethodChecks | `CheckList` | `Accounting/Banking/BankAccountDetail`; `Accounting/Payables/PaymentRunDetail` |
| Party/PaymentMethodFiles | `GenerateNachaFile`, `GeneratePosPayFile`, `FileList` | `Accounting/Banking/BankAccountDetail`; `Accounting/Payables/PaymentRunDetail` |
| Party/PaymentMethodTrans | `AddTransForm`, `TransList` | `Accounting/Banking/BankAccountDetail`; `Accounting/Banking/ReconciliationDetail` |
| Party/PaymentMethodTrans | `UploadOfxV1Form`, `UploadBaiV2Form` | `Accounting/Banking/StatementImport` |
| Party/PaymentMethodTrans | `AutoMatchReconcileForm`, `ManRecForm` | `Accounting/Banking/ReconciliationDetail`; `Accounting/Banking/BankAccountDetail` |
| Party/CreatePayment | `CreatePaymentForm` | `Accounting/Payments/Payments` |

### 16.2 Service coverage and source verification

The form summaries name directly invoked existing services. The additive service-inventory
mapping follows those names and shared-context calls; helpers only called internally by Mantle
are not assigned UI coverage merely because they exist. Proposed services do not become USL
rows until implemented. Shared InvoiceDetail and other shared mounts add their contextual calls
from crosscut, without replacing Projects mappings.

Current XML checks distinguish four cases: active entities/services; active but incomplete tax
services; commented-out TaxAuthorityRate and cost definitions; and proposed BOSS controls.
`LedgerServices.calculate#GlJournalTrialBalance` is also commented out despite appearing in the
research inventory: JournalBatches instead requires the proposed `JournalServices.validate#Batch`.
Dated currency rates use active `moqui.basic.UomConversion`, not a separate dated-rate entity.

The report adapters read existing data sources (R-ACC-27). SalesAnalysis reads
`SalesReportServices.get#SalesOrderSummary`, `get#SalesInvoiceSummary`, `get#SalesTopProduct` and
`get#InvoicesByCustomerClass`, which the baseline SalesSummary calls. Aging reads the
`InvoiceAgingSummary` and `InvoicePaymentApplicationSummary` views, and InventoryValuation reads
`AssetValuationSummary`. `mantle.account.PaymentServices.apply#OrderPaymentsToInvoice` is called by
`create#InvoiceFromSource` from OrderDetail. `mantle.ledger.AssetAutoPostServices.calculateAndPost#AllFixedAssetDepreciations`
posts without a preview, so no screen calls it; DepreciationRunDetail replaces it.
`LedgerServices.post#GlJournal` stops at the first error, so no screen calls it; JournalBatches
uses the proposed `post#Batch` instead. Both stay blank in usl-inventory on purpose (§19).

### 16.3 Acceptance walkthroughs

- **Procure-to-pay:** bill against partial accepted receipt; reject excess/duplicate quantities,
  compare converted units/currency and prior credits; explain tolerance; hold blocks approval
  and payment; authorized release is recorded; supplier bank change invalidates payment approval.
  A receipt from a supplier that is not self-billing creates no bill; a second upload with the
  same supplier reference is refused; a manual payment of a held bill is refused.
- **Invoice-to-cash:** customer invoice, partial receipt, available credit, discount/write-off,
  currency difference, remaining overdue balance and statement; retries do not double-apply.
  An order over its credit limit is held on approval and released by a credit manager with a
  reason; a package reopened after pack releases its draft invoice lines.
- **Return-to-refund:** receive part of an RMA, credit only eligible uncredited quantity, refund
  within the original paid balance, reverse with source links; supplier return creates the
  payable credit with unchanged physical facts. A second box received later is still credited;
  approval of the RMA alone creates no credit, refund or replacement.
- **Production-to-GL:** issue/return material, partial output, scrap and labor post through their
  source movements; ProductStandardCost changes leave history intact; deliberate revaluation
  has a preview and ledger links; reconcile inventory/WIP/GL by organization and period.
  Output is received at the frozen standard, cost close posts absorption and variance once, WIP
  for the run ends at zero, and the run closes in the same transaction.
- **Bank-to-close:** duplicate and malformed statement rows, ambiguous matches, missing line,
  stale concurrent match and nonzero statement difference; close blocks until resolved; a
  closed period rejects backdated invoice, refund, reversal and depreciation equally.
- **Batch/activation:** fail one statement row, notice recipient, independent supplier payment
  or asset depreciation item and retain other outcomes. Each item’s financial mutation is
  atomic. A lost response resumes by operation identity. Opening trial balance and subledgers
  tie before activation; repeated activation cannot duplicate balances.
- **Access:** an AR-only user cannot capture a gateway payment or see bank credentials; an app
  mount change cannot reveal another organization's balances; a customer token cannot read
  another invoice, internal Chatter or rates; supplier upload never approves a bill.

## 17. Documents and outputs

| Output | Kind | From screen | Derived from |
| --- | --- | --- | --- |
| Invoice, credit memo, supplier bill/debit note | `html-print`, PDF through existing renderer; sent by proposed `send#Invoice` with the InvoicePay link | InvoiceDetail / BillDetail / Invoices InvoiceBatch | Baseline Accounting/Invoice/PrintInvoice; Projects invoice output |
| Payment QR code and structured payment reference (later) | QR block in the invoice `html-print` template | InvoiceDetail | Proposed `Invoice.paymentReference` (AC-20); BankRules can match a bank line on it; Odoo `account_qr_code_sepa` and `account_qr_code_emv` |
| Customer statement and reminder letter | `html-print`, PDF, email | Statements / Dunning / Customer360 | ReceivableStatement; ERPNext dunning letter |
| Payment receipt, check and payment detail | `html-print`, PDF | PaymentDetail / PaymentRunDetail | Baseline payment detail/check print services |
| NACHA / Positive Pay, bank return results | File generation/import | PaymentRunDetail | Existing NachaServices / PositivePayServices; selected bank format only |
| Bank statement and reconciliation evidence | `html-print`, CSV, attachment | BankAccountDetail / ReconciliationDetail | PaymentMethodTrans plus proposed session snapshot |
| Financial account statement | `html-print`, PDF | FinancialAccountDetail | FinancialAccountServices.get#StatementPrintInfo |
| Journal, period-close and depreciation evidence | `html-print`, CSV | JournalEntryDetail / PeriodCloseDetail / DepreciationRunDetail | Existing ledger data plus reviewed run versions |
| Tax statement / 1099 data and validated filing format | `html-print`, configured export | TaxStatementDetail | Existing TaxServices data; versioned format adapter required |
| E-invoice payload and acknowledgement | SystemMessage / configured XML or structured format | ElectronicInvoices | InvoiceSystemMessage; later exchange adapters |
| Report snapshot | `html-print`, CSV; optional configured spreadsheet export | All report screens | Existing report result dataset with filters/currency/date included |
| Chart, balances, bank statements, bills | Import with preview and row results | Setup / StatementImport / Bills | Existing import primitives and proposed review adapters |
| Payment, tax, statement and close notices | Email / shell notification | Source screen or approved scheduled run | Commons/Comms delivery and source-specific providers |

Outputs use the same authorized result as the screen; an export is not a second unrestricted
query. Durable outputs retain organization, as-of date, currency basis and source/version IDs.
Sending is an explicit UI action or previously authorized schedule policy. Templates are
localized resources, with missing locale falling back visibly to the organization default.

## 18. Framework and data needs

All `ironstone.accounting.*Services` families named in forms are **new proposed** service
contracts. Their mutations wrap verified Mantle primitives with the controls below. Proposed
entity names specify intended ownership and relationships, not a claim that schemas exist.
Each family returns document/result identifiers plus named per-item errors for independent
batches. The shared crosscut roll-up deduplicates these needs with other apps.

| Need | Kind | Proposed as | Used by | Stub spec |
| --- | --- | --- | --- | --- |
| AC-01 Organization scope and activation | service type, seed data | `ironstone.accounting.AccessServices`, `SetupServices`; proposed `mantle.ledger.config.AccountingSetupRun`; seeded capability groups | Every screen; Setup; settings | Resolve allowed organizations and finance capabilities; readiness over chart/defaults/periods/tax/bank; versioned preview of opening GL/subledgers and one activation identity. `clone#Preferences` previews conflicts. The §1.1 capability groups and organization scope fold into crosscut CX-ACCESS; activation and AccountingSetupRun stay here (R-XC-18). Seed data: the §1.1 groups, including proposed `BOSS_ACCOUNTING_MATCH`, and built-in chart templates per country. `import#OpenItems` creates each open invoice and bill at cutover, with a proposed opening flag and per-row results. Readiness checks single currency (AC-19), the WIP and transfer accounts, the costing basis and the paused reminder job. |
| AC-02 Financial document and settlement controls | service type | `InvoiceServices`, `SettlementServices`, `ReturnSettlementServices`, `PortalServices` in `ironstone.accounting`; extend relevant Mantle mutators with shared checks | Invoice/bill/payment/return/shared mounts | Guard state transitions, mutable fields, source eligibility, duplicate supplier reference, balance locks, period and idempotency. `apply#Settlement` previews/application records include authorized discount/write-off/FX with accounts. `settle#Return`: see crosscut CX-RETURNS for its cumulative guard over received, credited and refunded quantities and existing ReturnItemBilling; this row specifies the proposed `preview#Return`, the result codes and the supplier branch (R-ACC-28, R-SB-05). Preserve Projects access and billing links. Proposed `change#InvoiceState` is the single invoice state guard (status, period, posting, hold), and Projects `BillingServices.update#InvoiceStatus` calls it (D6). `send#Invoice` sends any invoice, with or without a store, and issues the InvoicePay link through `PortalServices.issue#InvoiceAccess`; the Mantle `InvoiceFinalizedSendEmail` SECA skips an invoice version it has sent. `import#Bill` keys a bill by organization, supplier and supplier reference, or shipmentId when self-billed; `create#InvoiceFromSource` bills ordered or accepted received quantity and applies order payments (D2). `release#ShipmentDraftInvoice` and `SettlementServices.refund#OrderPayment` reopen a pack invoice between pack and ship (D3). `apply#Settlement` and a guard around payable `create#InvoicePayment` and `apply#InvoicePayment` refuse a bill with an open hold, and the `PaymentApplyForInvoice` SECA leaves such a payment unapplied (D4). Extend `create#Invoice` term precedence to agreement term, SupplierProfile, then PartyAcctgPreference (R-ACC-16). `PortalServices` wrap the Mantle `ExternalAccessServices` capability services and keep no token rules of their own (D5). |
| AC-03 Three-way match and holds | data model, service type | Proposed `mantle.account.invoice.InvoiceMatch`, `InvoiceMatchLine`, `InvoiceHold`, `InvoiceMatchPolicy`; `ironstone.accounting.MatchServices` | InvoiceMatch; Bills; BillDetail; MatchPolicies; Purchasing shared match context | Persist source snapshot/version, allocation of invoice line to PO and accepted receipt, UOM/currency bases, quantities/prices/tax, tolerance result and recorded exception release. `evaluate#InvoiceMatch`, `apply#InvoiceMatch`, `release#InvoiceHold` revalidate under lock; holds are separate from Invoice status. Proposed MatchServices services: `evaluate#InvoiceMatch`, `apply#InvoiceMatch` (writes or updates `OrderItemBilling`; unapply reverses it), proposed `find#BillExceptions`, `hold#Invoice`, `release#InvoiceHold`, proposed `request#HoldRelease`, `queue#MatchReevaluation` and `store#MatchPolicy`. Seed hold reasons: match exception, AP review, supplier dispute, bank-detail change. Quantity under open inspection is excluded (proposed `QualityServices.get#SourceInspectionStatus`). InvoiceMatch has a single-field key and no Files tab; evidence files stay on the bill. Mantle change (D2): `ShipmentIncomingDeliveredCreateInvoices` runs only for a supplier with the proposed `SupplierProfile.selfBillingIndicator`, and `create#PurchaseShipmentInvoices` gains the proposed `acceptedOnly` parameter. |
| AC-04 Payment runs | data model | Proposed `mantle.account.payment.PaymentRun`, `PaymentRunItem`; `PaymentRunServices` | PaymentRuns / PaymentRunDetail | Header organization/bank/currency/date/instrument/status/version; item invoice/remaining/selected/payment/file/result. Approval freezes proposal; execution rechecks hold/bank/version and creates one payment instruction identity. Existing check/NACHA/Positive Pay outputs consume those payments; no duplicate sends. A change to a supplier's bank details voids a pending approval of a run that pays it (D26). |
| AC-05 Bank statement sessions and matching rules | data model | Proposed `mantle.account.method.BankReconciliation`, `BankReconciliationLine`, `BankMatchRule`, `StatementImport`; `BankServices` | Banking | Session owns statement period/opening/closing/snapshot and links existing PaymentMethodTrans; no replacement bank ledger. Match rules suggest first; finalization requires zero difference and resolved import failures. Record exclusions/reopen reasons. FIT/source-row keys deduplicate imports. The import format enum and the FIT/source-row identity also fit ISO 20022 camt.053 and MT940, the next adapters. |
| AC-06 Posting locks and close controls | data model | Proposed `mantle.ledger.config.AccountingLock`, `AccountingLockException`, `AccountingCloseRun`; `CloseServices`; shared posting guard | All postings; PeriodClose | Typed organization lock-through dates, approved expiring soft exceptions, immutable hard close. Guard direct and source-triggered posting, adjustments, refunds, reversals. Close snapshots checks/balances and atomically commits with existing period close; reversal retains original. The guard runs inside `post#AcctgTrans`, the single choke point for direct and auto-post (§1.1); BOSS_ACCOUNTING_* groups get no artifact authorization for `unpost#AcctgTrans`, `update#AcctgTransPosted`, `repost#*` or the Mantle REST mutators (R-ACC-14). Mantle change (R-SA-02): `repost#AssetIssuance`, run by the `AssetIssuanceGlRePost` SECA, posts a dated reversing delta in an open period instead of unposting and deleting the original. |
| AC-07 Asset books, valuation and reviewed depreciation | data model, service type, seed data | Proposed `mantle.product.asset.FixedAssetClass`, shared `mantle.ledger.transaction.AccountingPeriodRun`/result; `AssetBookServices`; `ProductionCostServices` over canonical ProductionCostEvent/ProductionCostAllocation; proposed `mantle.product.asset.AssetBookEvent`, `mantle.account.invoice.LandedCostAllocation`, `mantle.work.production.ProductionAllocationPolicy` | Assets; Inventory; LandedCosts; CostingPolicies; close; Products/Manufacturing/Warehouse | Preserve Asset/AssetDepreciation; class defaults versioned. Preview per asset-period then post each once. Capitalization/disposal/revaluation use linked ledger entries. Consume proposed `mantle.product.cost.ProductStandardCost` / `ProductStandardCostComponent` from Products as estimates; Accounting alone posts revaluation/landed-cost allocations. ProductionCostClose previews and posts WIP/output allocation and variance once; crosscut CX-COST owns the evidence model, with subcontract accrual clearing and linked late adjustments. Proposed book services `capitalize#Asset`, `adjust#AssetBook`, `dispose#Asset` and `reverse#AssetBookEvent` each write an AssetBookEvent (asset, event type, date, amounts, accounts, reversal link) with ledger links (R-ACC-08). Proposed `post#Revaluation` posts value-only adjustments and never calls `update#ProductAcquireCost` on posted receipts (R-ACC-02). Proposed `preview#LandedCost` and `post#LandedCost` allocate charge lines to receipts (R-ACC-10). Proposed `ProductionCostServices.store#AllocationPolicy` versions the allocation policy, and `find#CostCloseQueue` lists runs put up for review. ProductionCostClose follows the production posting rule (D12): output at the frozen standard, issues and receipts only through the existing hooks, absorption and variance at cost close, and the run closed in the same transaction. Seed the proposed GL account types `GatLaborApplied`, `GatOverheadApplied`, `GatOutsideProcessAccrued` and `GatProductionVariance`, and propose `AssetTypeGlAccount.scrapGlAccountId` for scrap. |
| AC-08 Working local tax and statements | data model | Corrected active `mantle.other.tax.TaxAuthorityRate`; extend `mantle.other.TaxServices.calculate#SalesTaxLocal` and `calculate#InvoiceSalesTax`; `ironstone.accounting.TaxServices` | Tax; all invoices/orders | Effective rules by authority/category/code/jurisdiction, inclusion/compound basis, priority and rate; retain calculation version and line results. Existing gateway interface continues; organization fallback supports non-store invoices. Fix old commented relationships. Tax error blocks affected finalization; tax exemption/zero is explicit, not fallback on failure. |
| AC-09 Recurring billing | data model | Proposed `mantle.account.invoice.InvoiceSchedule`, `InvoiceScheduleOccurrence`; `RecurringServices` and ServiceJob | RecurringInvoices | Template or Subscription source, party/direction/currency, cadence/dates, next period, opt-in send policy. Unique schedule-period generation, per-occurrence result; drafts by default, no repeat after job retry. InvoiceSchedule serves only invoice-only cadences (rent, retainers, recurring supplier bills); order-based recurring billing stays on OrderHeader `recurCronExpression` and `recurAutoInvoice` with the `create_RecurringOrders` job, which RecurringInvoices monitors (D24). |
| AC-10 Collections and dunning | data model | Proposed `mantle.account.invoice.CollectionPromise`, `DunningLevel`, `DunningRun`, `DunningNotice`; `CollectionServices` | Collections / Dunning / Statements / Customer360 | Reuse WorkEffort activities and record links; add amount/currency/date/qualifying invoice/payment links for promises. Exclude disputes; preview recipient/content; deduplicate notices by run/level/document set. Later fee/interest creates reviewed financial documents. Dunning is the only scheduled reminder sender; the Mantle `send_SalesInvoicePastDueEmails` job stays paused. |
| AC-11 Customer credit policy | data model, service type | Proposed `mantle.account.billing.CustomerCreditPolicy`, `CreditHoldDecision`; `CreditServices`; `CreditServices.store#Policy`, `evaluate#OrderCredit`, `release#CreditHold`; uses proposed `mantle.order.OrderHoldReason` with `OrderServices.hold#Order` and `release#OrderHold` (crosscut §3.6) | Customer360; OrderDetail; Approvals; orders; invoice controls | Policy per organization/customer/currency, amount limit and overdue threshold, Warn/Hold, effective dates; do not overload BillingAccount.accountLimit for all customers. Explain exposure (open orders + unpaid invoices minus non-duplicated credits), check on commitment, and record authorized hold/release reason. `evaluate#OrderCredit` takes orderId, orderPartSeqId, organizationPartyId and operationKey, and returns exposure, limit, currency, rate basis, Pass/Warn/Hold and reasons. It runs as a SECA on `check#OrderPreApprove` (an approve warning) and inside the guard every BOSS approve action uses (D7). A Hold result calls the proposed `hold#Order` with reason Credit; reservations made at OrderPlaced stay. `release#CreditHold` writes a CreditHoldDecision (order part, decision, reason, approver, expiry) and calls `release#OrderHold`. |
| AC-12 Finance report adapters and drill-down | service type | `ironstone.accounting.ReportServices`, `HomeServices`; existing LedgerReportServices and authorized form-list views | Home; Reports; shared 360s | Add partner ledger, as-of aging, source tie-out, multi-period columns and drill-down preserving organization/date/currency. Reuse current report result queries for compatibility; return incomplete/error metadata. Per-app aggregates are providers, not a second Insights dashboard model. Data sources: the SalesReportServices summaries, the InvoiceAgingSummary, InvoicePaymentApplicationSummary and AssetValuationSummary views, and GlAccountOrgTimePeriod (§16.2). |
| AC-13 Entry templates and batch validation | data model | Proposed `mantle.ledger.transaction.AcctgTransTemplate`, `AcctgTransTemplateEntry`; `JournalServices` | JournalTemplates / JournalBatches | Versioned accounts/amount parameters; instantiate a balanced draft with source version. `validate#Batch` validates current constituent entries; proposed `post#Batch` uses atomic per-transaction posts and named partial results rather than the current fail-fast post#GlJournal loop. Commented GlJournalTrialBalance is not called. |
| AC-14 Budget revisions and commitments | service type, data model | `ironstone.accounting.BudgetServices` (`check#Budget`, `reserve#Commitment`, `convert#Commitment`, `release#Commitment`); proposed `BudgetControlPolicy` and `mantle.other.budget.BudgetCommitment` alongside existing BudgetRevision/Review | Budgets; Purchasing; expenses | Keep GL-account/period budget; immutable approved revisions. Warn/Stop by request/PO/expense stage, lock remaining amount at approval, convert/release commitments without double counting actuals; record override. BudgetCommitment holds the budget item or GL account, period, organization, source entity/id/revision, stage, amount and currency, status (Reserved, Converted, Released, Actual), convertedFromId and the override reason; each service is idempotent per source revision (D10). Purchasing reserves at request approval, converts request to PO at PO approval and releases on close or cancel; `approve#Payable` converts PO to actual. |
| AC-15 Electronic invoice exchange | data model | Proposed `mantle.account.invoice.InvoiceExchange`; `ExchangeServices` over InvoiceSystemMessage and framework protocol adapters | ElectronicInvoices; inbound bills | Versioned payload/format/provider/status and external reference, validation/acknowledgement history, idempotent submit/poll, correction by revision. Jurisdiction/provider adapters are later, separately validated. Missing X12 component not assumed. |
| AC-16 Rates, revaluation and deferral | service type | `CurrencyServices`, `PeriodRunServices`; proposed deferral schedule/result alongside AccountingPeriodRun | Currencies / AdvancedPeriodRun | Use active UomConversion effective dates and persist exact rate/source; reviewed external-rate fetch. Approved FX/deferral preview posts once with source allocation and optional dated reversal. Financial calculation uses decimals; no silent float-rounding drift. The applied rate is stored as a decimal on the transaction (AC-19); FX revaluation follows base-currency posting. |
| AC-17 Advanced finance models | data model | Proposed `AccountingLease`, `RevenueSchedule`, `IntercompanyBatch` and versioned schedule/entry children; `LeaseServices`, `RecognitionServices`, `IntercompanyServices` | Later leases, recognition and intercompany | Lease terms/rate/policy and liability/amortization schedule; obligation-based recognition allocations; paired organization entries with both permissions/periods. Shared AccountingPeriodRun stores posted results. Consolidation/report adjustments leave local books intact. |
| AC-18 Providers, output and import review | shell item, service type | Accounting palette/quick-create/Today/approval providers; `DocumentServices` and import adapters using existing render/delivery primitives | All named shell sources and outputs | Names/record context from §1.3; localized print templates; approved scheduled sends; batch status and row error downloads. Inspect current framework upload/print capabilities before adding widgets. No new general protocol client belongs in BOSS. Approval topics `BillApproval`, `BillHoldRelease`, `PaymentRunApproval`, `CreditHoldRelease`, `BudgetOverride` and `PaymentValidation`, and the notification `ProductionCostReview` (§14 Approvals). Folds into crosscut CX-SHELL (R-XC-18). |
| AC-19 Base-currency posting and realized FX | data model, service type | Extend `mantle.ledger.InvoiceAutoPostServices`, `mantle.ledger.PaymentAutoPostServices` and `post#AcctgTrans`; proposed applied-rate fields on Invoice and Payment | All postings; ReceivablesWorkbench; PayablesWorkbench; Currencies; AdvancedPeriodRun; Setup | Posting converts each document amount to `PartyAcctgPreference.baseCurrencyUomId`. It stores the applied decimal rate, rate date and source on the transaction, fills the existing `AcctgTrans.originalCurrencyUomId` and `AcctgTransEntry.originalCurrencyAmount`, and keeps the same rate on the Invoice or Payment. `post#PaymentApplication` books the realized difference to `GatForExGain` or `GatForExLoss`. Until this ships, the posting guard refuses to finalize or post a document whose currency differs from base, and Setup readiness shows "single currency until AC-19" (D18; R-ACC-01, which names it AC-16a). FX revaluation (AC-16) depends on it. |
| AC-20 Internal transfers, deposits and payment references | seed data, data model, service type | Proposed payment type `PtInternalTransfer` with a cash-in-transit `PaymentTypeGlAccount`; proposed `mantle.account.payment.PaymentDeposit` and `Payment.paymentDepositId`; later proposed `Invoice.paymentReference`; `ironstone.accounting.BankServices.create#InternalTransfer`, `create#DepositSlip` | Payments; BankAccountDetail; BankRules; invoice print (later) | A transfer is two linked Payments, an outgoing and an incoming leg through the transit account, committed atomically and each reconciled on its own statement (R-ACC-17). A deposit groups receipts of one bank account and currency, so the deposit's bank line reconciles once (R-ACC-33). The structured payment reference and the QR block on the invoice print are later; BankRules can match on the reference (R-ACC-34). |
| AC-21 Journal entry attachments | data model | Proposed `mantle.ledger.transaction.AcctgTransContent`, registered in `mantle.party.CommunicationServices.get#RecordLinkInfo`; folds into crosscut CX-RECORD-HOSTS | JournalEntryDetail | AcctgTrans has a single-field key, so it hosts RecordFiles once it has its own content entity (D25; R-ACC-31). |
| AC-22 Ledger dimensions | data model, service type | Proposed `AcctgTransEntry.facilityId` and `costCenterId` (an internal organization Party); a proposed required-dimension setting on `GlAccountOrganization`; proposed `OrderItem.costCenterId` and `InvoiceItem.costCenterId` | AccountDetail, JournalEntryDetail, ExpensePosting, PostingMappings; Purchasing requests and orders; Projects and People postings | Posting refuses an entry missing a dimension its account requires; the invoice and payment auto-post services copy facility and cost centre from the source line; reports filter and group by both. Percentage distribution is `later` (R-ACC-11; decided Oct 28, 2026). |

### 18.1 Financial interface details

The shared adapter contract takes authenticated organization scope, source identity and the
client operation identity; preview responses include source version, calculated effects,
blocking/warning reasons and permitted actions. Confirmation supplies the preview version,
not client-computed totals. Posting re-reads authoritative quantities/balances; on conflict it
returns a new preview requirement. The invoice matching and return settlement service names
above are shared with Purchasing/Warehouse/Customer Service, not separately implemented there.

`CustomerCreditPolicy` is keyed by organization/customer/effective version. Exposure is shown
in the policy currency with its conversion basis; fulfilled orders already invoiced are not
counted again. A missing FX rate is a blocking inability to evaluate a Hold policy. Releasing
credit hold is a recorded decision on the source order, surfaced in Customer360 and Approvals.
Mantle approves an order on two paths, and both reach the credit check (R-SB-09): `autoApprove#Order`
through the `check#OrderPreApprove` SECA, and a manual approve through the BOSS approve guard. The
hold is an OrderHold with an OrderHoldReason of Credit, so another app's hold reason is never
released by a credit decision (R-SB-08).

The local tax gateway remains swappable and supports order and invoice inputs without a
ProductStore by organization policy. A tax result stores its authority, rate/version, taxable
base, exemption reason, rounded amount and source item. `calculate#InvoiceSalesTax` writes
proper tax items; it cannot treat an unimplemented local gateway as successful zero tax.
Country-specific tax filing, statutory templates and e-invoice networks remain disabled until
their format adapters are independently validated for the selected deployment.

### 18.2 Proposed model boundaries

`PaymentMethodTrans` remains the imported statement line. `BankReconciliationLine` attaches it
to a session and records selection/review; neither `GlReconciliation` nor a new bank ledger
replaces the working import/match model. General non-bank GL reconciliation can use the existing
GlReconciliation later without forcing bank migration.

A standard-cost approval from Products records an estimate/version. A valuation change in
Accounting identifies affected live layers/assets and its effective date, previews the
adjustment, then posts value-only movements with ledger links. BOM cost roll-up is never a
shortcut for rewriting historical issue/receipt cost. The organization's COGS method
(`PartyAcctgPreference.cogsMethodEnumId`: LIFO, FIFO, average cost or inventory actual cost) and its
production costing basis are shown in setup and every valuation preview. Mantle has no standard
COGS method; the standard cost in this design is the frozen basis of a production output receipt
(ProductionCostClose), with variance posted at cost close.

## 19. Decided

| Decision | Notes |
| --- | --- |
| Full research scope, phased | First release includes parity plus tax, matching, payment-run, close and credit controls needed for complete business flows. Advanced FX/deferrals, leases, recognition, intercompany/consolidation and e-invoicing are designed as later screens. |
| Mantle journal semantics retained | GlJournal is a posting batch. Sales/purchase/cash/bank views use document types, transaction types and bank accounts; no second Odoo-style book record is introduced. |
| Shared invoice/online payment | Crosscut owns internal InvoiceDetail with AP/AR/Projects contexts. Accounting owns one InvoicePay page that Commerce can mount; common external capabilities replace separate portal implementations. The page is mounted at `ServicePortal/InvoicePay`, and SupplierBillUpload at `SupplierPortal/BillUpload`, under the two audience roots, not under the Accounting root (D5; R-ACC-03, R-SB-14). The `Accounting/External/*` rows are dropped. Single-record links are MoquiConf token routes checked by the proposed Mantle `ExternalAccessServices`, which the app PortalServices wrap. This settles the Open item on one suite route group. |
| Shared settings access | Authorized finance users edit common tax, terms and method records here; store bindings can be included in Commerce; executable gateway settings/secrets remain Admin-restricted. PaymentMethods owns PaymentMethod and PaymentGatewayConfig bindings, and Tax owns TaxAuthority and the tax gateway, in the crosscut §5 owner table (R-XC-16). |
| Local rates plus external gateways | Refine and activate a corrected TaxAuthorityRate model and implement local/invoice tax; external gateway interface remains supported. The legacy commented definition and stubs are not working functionality. |
| Customer credit model | CustomerCreditPolicy per customer/organization/currency, edited on Customer360; order hold appears on OrderDetail and Approvals. BillingAccount retains its narrower account-limit meaning. The hold is an OrderHold with a proposed OrderHoldReason of Credit, placed and released through `OrderServices.hold#Order` and `release#OrderHold` (D7; R-SB-08). `CreditServices.evaluate#OrderCredit` runs as a SECA on `check#OrderPreApprove` and in the BOSS approve guard; it does not build on `OrderBeingChanged` (R-ACC-05, R-SB-09). |
| Collections model | Existing activities on the customer plus small promise/dunning records; no second case system. Disputes can link existing Requests. |
| Reconciliation model | Session over PaymentMethodTrans; preserve existing import/match services and record reopened statement history. GlReconciliation is not the bank replacement. |
| Posting locks | New typed lock/exception records supplement TimePeriod.isClosed. No soft exception bypasses a hard closed period. |
| Fixed-asset ownership | One Asset record, financial Book tab and Accounting list. Other apps receive permitted summaries; capitalization, disposal, value adjustment and depreciation require finance capabilities. |
| Posted transaction corrections | Baseline unrestricted UpdateAcctgTransPosted/unpost amount editing is replaced by immutable posted view, audited metadata correction, and linked reversal/new entry. Draft deletion and movement remain. |
| Invoice balances | Partly paid/overdue are derived; gateway return URLs or manual status editing never settle an invoice. Existing AR/AP status IDs are preserved behind guarded transitions. |
| Stock and financial facts remain distinct | Invoice/match screens do not create fictional receipt quantities; return receipt and credit/refund have separate recorded outcomes. |
| Payroll/time and expenses | People/Projects capture and approve; Accounting codes, posts and pays approved source invoices. Existing time locks and Project billing context are preserved. |
| No duplicate master models | Party contacts, ProductPrice, Asset, invoice/payment applications, WorkEffort activities, UomConversion and the OrderHeader recurrence are reused; proposed needs are limited to missing workflows and controls. |
| Current service truth wins | Commented GlJournalTrialBalance is excluded despite its inventory row. Tax-rate/cost comments are proposals to refine. Actual active names are checked before implementation. |
| Baseline forms covered | §16 maps all Accounting forms including report variants and lower-volume financial-account/bank controls; no unexplained parity deletion. Generic report options consolidate old launch forms into their named report. Asset/FindAsset `UpdateProductCost` maps to InventoryValuation CostDataRepair and Asset/AssetDetail `UpdateAssetAcquireCost` to EquipmentDetail AcquireCostRepair (R-ACC-02). |
| Existing automation | The Mantle SECAs and ServiceJobs on the designed paths are named in §1.4, each kept, conditioned or replaced (D1). Crosscut §1.3 holds the suite register. |
| Supplier bill creation | Accounting owns bill intake (D2; R-XC-01, R-SB-01, R-ACC-07). By default a receipt creates no bill: the receipt SECA runs only for suppliers flagged self-billing, and then bills accepted, released quantity only. `import#Bill` is keyed by organization, supplier and supplier reference (shipmentId for a self-billed draft). Bills from a PO or receipt come from the InvoiceFromSource dialog on the shared OrderDetail and ShipmentDetail (`create#InvoiceFromSource`). A supplier upload attaches to an existing self-billed draft. This settles the Open items on auto-invoice policy and on invoice creation in OrderDetail and ShipmentDetail. Subcontract and service lines are billed only through `import#Bill` (D14). |
| Sales invoice at pack | The pack SECA is kept. Proposed `release#ShipmentDraftInvoice` and `refund#OrderPayment` let a package reopen, or an order change, between pack and ship (D3; R-SB-17). |
| Bill match and holds | A match operator, in the one group `BOSS_ACCOUNTING_MATCH` that AP includes and buyers who match bills are given, applies matches through `MatchServices.apply#InvoiceMatch`, which writes OrderItemBilling. Only finance places and releases holds and approves; the placer cannot release. Match policy lives at MatchPolicies. Hold checks run on every payment path, not only payment runs (D4; R-XC-02, R-ACC-04, R-SB-16, R-SB-18, R-SB-19). Quantity under open inspection is excluded from matching (D21). |
| Invoice state guard | `InvoiceServices.change#InvoiceState` is the only invoice state guard; Projects `BillingServices.update#InvoiceStatus` calls it and the Projects UI is unchanged (D6; R-XC-04). |
| Customer Service order changes | Customer Service applies only cancel-remainder and short-pick substitution. Accounting's receiving action is `release#ShipmentDraftInvoice` or InvoiceCorrection for the invoice, and `refund#OrderPayment` for captured excess (D9). |
| Budget commitments | Accounting owns the proposed `mantle.other.budget.BudgetCommitment` and proposed `BudgetServices.check#Budget`, `reserve#Commitment`, `convert#Commitment` and `release#Commitment`. Purchasing's approval reserves, the PO converts, and bill approval (`approve#Payable`) converts to actual (D10; R-ACC-06, R-XC-37). |
| Returns | Accounting owns the proposed `ReturnSettlementServices.preview#Return` and `settle#Return` for customer and supplier returns, with the result codes and the supplier credit branch. Approval settles nothing, receipt goes through Warehouse `receive#ReturnItems`, and `receive#ReturnWithoutShipment` is not exposed (D11; R-ACC-28, R-SB-02 to R-SB-06, R-XC-27, R-XC-38). |
| Production cost to the GL | ProductionCostClose follows the production posting rule: output at the frozen standard, issues and receipts only through the existing hooks, absorption and variance at `post#CostClose`, which also closes the run. Manufacturing writes every cost event; labor events follow timesheet approval. The overhead and co-product policy lives only at CostingPolicies (D12; R-SA-01, R-SA-03, R-SA-09, R-SA-11, R-SA-18, R-ACC-09). This settles the cross-app question of valuation, overhead and co-product allocation policy. |
| Subcontract charges | Components at the supplier stay company stock in an organization-owned vendor facility. Accounting allocates the charge: acceptance writes the accrual and the bill match the price variance. Service lines get no receipt-SECA bill (D14; R-SA-13). |
| Units and currencies | Accounting Currencies alone edits currency units and rates; Products Units excludes them. Posting stores the applied rate as a decimal (D17; R-ACC-21). |
| Foreign currency | Posting converts to the base currency and books realized FX on settlement (AC-19). Until AC-19 ships, finalizing or posting a document in another currency is refused, and Setup readiness says "single currency until AC-19" (D18; R-ACC-01). |
| Capability vocabulary | §1.1 maps every role label to a `BOSS_ACCOUNTING_*` group, and other apps' terms to the same groups (D22; R-ACC-15). |
| Recurring invoices | Order-based recurring billing stays on the OrderHeader recurrence and the `create_RecurringOrders` job; proposed InvoiceSchedule is only for invoice-only cadences (D24; R-ACC-13). |
| Party finance, identity and tax forms | The shared PaymentDetails, PartyIdentifications and TaxRegistrations forms show on Customer360 and Supplier360; a bank-detail change voids a pending payment-run approval. Supplier default terms live only on the proposed `SupplierProfile.settlementTermId`, which finance edits through Purchasing's `store#SupplierProfile` (D26; R-ACC-16, R-XC-10). |
| Context blocks follow the crosscut rows | The Customer360, Supplier360, OrderDetail, ShipmentDetail, EquipmentDetail and Product360 blocks use the crosscut Accounting rows' tabs (R-ACC-22, R-XC-25). Customer360's aging list, financial summary and Statement action are crosscut additions (R-XC-41, R-XC-42). Activities show on Customer360, Supplier360 and Collections (D25; R-XC-06). |
| Screen names and the Inventory area | `GlAccountDetail` is renamed `AccountDetail` at `Accounting/GeneralLedger/AccountDetail` (D27; R-ACC-37). InventoryValuation and ProductionCostClose move to `Accounting/Inventory/` (R-ACC-26). PeriodLocks, AssetClasses and BudgetControls stay in their own areas, beside the work they govern, as an exception to the `Settings/` rule of design-doc-guide §10. BudgetVariance stays in Reports. |
| Valuation corrections | InventoryValuation previews and posts revaluation (`post#Revaluation`), as value-only adjustments with ledger links. The raw rewrite services `update#ProductAcquireCost` and `update#AssetAcquireCost` are reserved to finance-admin data-repair actions with audit and an open-period check (R-ACC-02). |
| Posting guard and restricted services | The lock, period and idempotency guard runs inside `post#AcctgTrans`. `unpost#AcctgTrans`, `update#AcctgTransPosted`, `repost#*` and the Mantle REST mutators get no artifact authorization for BOSS_ACCOUNTING_* groups. `repost#AssetIssuance` posts a dated reversing delta instead of unposting (R-ACC-14; R-SA-02). |
| Merged research candidates | These candidates are merged, not separate screens: dashboard widgets into Home; credit memo and return credit into InvoiceDetail and ReturnDetail; debit notes into BillDetail and ReturnDetail; recurring bills into RecurringInvoices; payments to validate and refunds into Payments tabs and PaymentDetail; chart import into Setup; account ledger into the GeneralLedger report; the tax-on-document grid into InvoiceDetail; AR and AP aging summary and detail into Aging; payment gateways into PaymentMethods and Admin; numbering into DocumentSettings (R-ACC-27). |
| Gateway baseline forms | The six `Gateway/*` forms are handed on: EditPaymentGateway and FindPaymentGateway to Admin, EditShippingGateway and FindShippingGateway to Warehouse Carriers and Commerce. Their Designed-in cells stay blank for those files (R-ACC-27). |
| Services deliberately not called | `LedgerServices.post#GlJournal` stops at the first error and is replaced by the proposed `JournalServices.post#Batch`. `AssetAutoPostServices.calculateAndPost#AllFixedAssetDepreciations` posts without a preview and is replaced by DepreciationRunDetail. Their usl-inventory cells stay blank (R-ACC-27). |
| Reminder sender | Dunning runs are the only scheduled reminder sender. The Mantle `send_SalesInvoicePastDueEmails` job stays paused, and Setup readiness flags it (R-ACC-29). |
| Ledger dimensions | A ledger line carries product and asset; the transaction header carries the other party and the work effort. The first release adds proposed `AcctgTransEntry.facilityId` and `AcctgTransEntry.costCenterId` (decided Oct 28, 2026; AC-22; R-ACC-11). A cost centre is an internal organization Party, such as a department, independent of the GL account. AccountDetail sets, per organization, which dimensions an account requires, and posting refuses an entry that lacks one. JournalEntryDetail lines, ExpensePosting and PostingMappings carry the two dimensions; the invoice and payment auto-post services copy them from the source line. Purchases pass the cost centre from the request to the PO line, the bill line and the entry. Percentage distribution across cost centres is `later`. |
| Landed costs owner | Accounting owns landed-cost allocation at `Accounting/Payables/LandedCosts` (proposed `AssetBookServices.post#LandedCost` over a proposed LandedCostAllocation). It is in the first release (`new`, decided Oct 28, 2026) for any organization that pays freight or duty on stock purchases, because Purchasing reports landed cost as actual only after this allocation and Warehouse valuation reads it (R-ACC-10, R-PUR-18). |
| Scope labels | Home is `parity`, because it replaces OrgInternalSummary. Reconcile, unreconcile and no-reconcile stay as BankAccountDetail row actions, so manual reconciliation keeps parity while ReconciliationDetail is `new` (R-ACC-25). |
| Cash forecast | A cash forecast is left to Insights; Accounting shows cash by bank on Home and adds no forecast screen in the first release. |

## 20. Open

- **Country/book policy packs.** Recommended: activate local jurisdiction and accounting-policy
  adapters separately, each with versioned output and acceptance cases. The generic authority,
  statement and exchange screens remain as designed; no country-specific compliance claim is
  made by the base app. The first release ships the US 1099 data and local sales tax only. The
  packs name the features still missing, each `later`:
  - Cash-basis (payment-date) tax exigibility (R-ACC-18): an exigibility flag per TaxAuthority and
    organization; tax posts to a transition account and moves to payable on
    `post#PaymentApplication`; TaxStatement's basis becomes the payment date.
  - Withholding tax on supplier payments (R-ACC-19): the withheld amount as an active
    `mantle.account.payment.Deduction`, a rate on the corrected TaxAuthorityRate, and a statement
    through TaxStatement.
  - E-invoice networks and statutory filing formats, through ElectronicInvoices and AC-15.
- **Advanced finance implementation order.** Recommended: FX revaluation and simple deferrals
  before leases, recognition and intercompany/consolidation; retain the common reviewed
  AccountingPeriodRun contract so these later areas do not fork posting controls. FX revaluation
  comes only after base-currency posting and realized FX (AC-19), which are a first-release
  prerequisite (R-ACC-01).
- **Statement formats beyond BAI2/OFX/CSV.** Recommended: add a bank-specific adapter only when a
  deployment needs it, preserving import identity and line-level error reporting. Live feeds
  are integrations, not a prerequisite for the designed bank workflows. ISO 20022 camt.053, and
  then MT940, is the expected next adapter, so StatementImport's format enum and its FIT and
  source-row identity are designed for it now.
- **Default overhead and co-product allocation rule (also in crosscut §9).** Recommended: CostingPolicies
  starts with quantity-normalized co-product allocation and a work-center-hour overhead rate from
  WorkCenterRate, each a versioned policy that ProductionCostClose reads by its accounting date
  (D12; R-MFG-34). The owner is decided; only the default rule is open.
- **Payment term discounts and installments (also in crosscut §9).** Recommended: add a child
  proposed `SettlementTermLine` (sequence, portion percent, days basis, discount percent, discount
  days) with versions in place of effective dates, and persist a per-invoice proposed
  `InvoiceDueSchedule` (due date, amount, discount date, discount amount). Aging,
  PayablesWorkbench, PaymentRunDetail and `apply#Settlement` read it, and PaymentTerms saves
  through a proposed `store#SettlementTerm` instead of `entity` (R-ACC-12). Until then Invoice
  shows a single due date (R-XC-53).
- **Product360 GL mappings (also in crosscut §9).** Recommended: crosscut §3.5 adds a GL mappings
  pane over `ProductGlAccount` and `ProductCategoryGlAccount` for the Accounting context,
  organization-scoped and edited with finance admin. Until then PostingDefaults edits them
  (R-ACC-22).
- **Posted-entry hash.** Recommended: `later`. A hash chain per organization and journal type over
  posted AcctgTrans, with a verification report, after the hard lock of AC-06 (R-ACC-32).
- **Inbound direct debit.** Recommended: `later`. Mandates, a collection batch file that reuses
  the NACHA outputs, and imported rejects, on PaymentRunDetail's pattern (R-ACC-33).
