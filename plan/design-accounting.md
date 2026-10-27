# IronStone BOSS — Accounting design

Oct 27, 2026 — draft

IronStone Accounting serves finance teams, bookkeepers, collections staff and treasury. Its
sections are Receivables, Payables, Payments, Banking, General ledger, Period close, Fixed assets,
Tax, Budgets, Reports and Settings. It completes invoice-to-cash and procure-to-pay and makes
stock, production and service transactions traceable to their financial effects. A small
business can use Accounting alone, including its contextual customer, supplier, product,
order, shipment, asset and return screens.

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
[10 assets](#10-fixed-assets) · [11 tax](#11-tax) · [12 budgets](#12-budgets) ·
[13 reports](#13-reports) · [14 records](#14-related-records) · [15 settings](#15-settings) ·
[16 coverage](#16-baseline-coverage) · [17 outputs](#17-documents-and-outputs) ·
[18 needs](#18-framework-and-data-needs) · [19 decided](#19-decided) · [20 open](#20-open)

## 1. Shell

Root `screen/Accounting.xml`, mounted as `Accounting`, uses `BOSS_ACCOUNTING` and icon
`sym_o_account_balance`. The root already exists with placeholder sections; this file specifies
their replacement. It retains `mantle.party.PartyServices.setup#UserOrganizationInfo`, the
shared Chatter/RecordFiles mounts and existing shell. Selecting an organization changes all
queries and new-document defaults; supplied IDs are still checked against authenticated scope.

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

Posting authority never follows from a visible tab. All invoice, payment, settlement, stock-value
and period mutations use guarded service adapters with current permission, status, balance,
lock-date and idempotency checks. The existing Mantle services remain reusable primitives; the
new guards are requirements, not assertions about their current enforcement. Posted amounts
are corrected by linked reversing/adjusting entries. Partial payment and overdue are derived
conditions from applications and due dates, not free-edit status choices.

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
- Payables — `Bills`, `PayablesWorkbench`, `PaymentRuns`, `ExpensePosting`.
- Payments — `Payments`, `GatewayTransactions`.
- Banking — `BankAccounts`, `StatementImport`, `Reconciliations`, `UnmatchedTransactions`,
  `FinancialAccounts`.
- General ledger — `ChartOfAccounts`, `JournalEntries`, `TransactionEntries`, `JournalBatches`,
  `JournalTemplates`.
- Period close — `Periods`, `PeriodLocks`, `PeriodRuns`; `Leases`, `RevenueRecognition` and
  `Intercompany` appear when their later capabilities are enabled.
- Fixed assets — `FixedAssets`, `AssetClasses`, `InventoryValuation`.
- Tax — `TaxAuthorities`, `TaxRates`, `TaxStatements`; later `ElectronicInvoices`.
- Budgets — `Budgets`, `BudgetControls`, `BudgetVariance`.
- Reports — `Reports` with the named report screens of §13.
- Approvals — shared `Approvals` with finance filters.
- Settings — `Settings`, `Setup`, `AccountingPreferences`, `PostingDefaults`, `PaymentTerms`,
  `Currencies`, `PaymentMethods`, `CollectionPolicies`, `BankRules`, `DocumentSettings`.

Home contains AR due/overdue, AP due, cash by bank/currency, unmatched statement and unposted
counts; AR/AP aging; GL/subledger tie-out; bills/payment runs needing review; collection
activities due; and setup blockers. Every number links to the same authorized filtered rows.
Base-currency totals show their conversion date/rate basis; document-currency totals are grouped,
not summed across currencies without conversion.

### 1.3 Shell providers, rendering and scope

Palette providers find invoices, payments, parties, accounts and journal entries within the
current organization's permissions. Quick create contributes invoice, bill, payment and draft
journal entry. Today contributes collection follow-ups and due finance approvals; notification
topics carry bill holds, payment-run failures, statement import results, close blockers and
recurring-generation failures. Source documents remain authoritative; badges link to them.
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

## 2. Screens

One row per screen. Reused rows are fully defined by their canonical owner and have only a
context block here. The screen table's short record names resolve to Mantle unless marked
proposed; framework currency units are `moqui.basic.Uom` and `moqui.basic.UomConversion`.

### Home

| Screen | Path | Archetype | Impl | Purpose | Main record | Reused | Roles | Scope | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Home | `Accounting/Home` | landing | xml | Show cash, due work and ledger health. | `Authorized accounting aggregates` | own | app | new | organizationPartyId; asOfDate |

### Receivables

| Screen | Path | Archetype | Impl | Purpose | Main record | Reused | Roles | Scope | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Invoices | `Accounting/Receivables/Invoices` | list | xml | Find customer invoices and credit memos. | `Invoice` | own | app | parity | Invoice rows; find parameters |
| InvoiceDetail | `Accounting/Receivables/InvoiceDetail` | detail | xml | Review, finalize, send and settle a customer invoice. | `Invoice invoiceId` | InvoiceDetail, crosscut §3.16 | app | parity | Invoice invoiceId |
| ReceivablesWorkbench | `Accounting/Receivables/ReceivablesWorkbench` | split | xml | Allocate receipts and credits to customer open items. | `Invoice and PaymentApplication` | own | AR; treasury | new | Invoice and PaymentApplication |
| Collections | `Accounting/Receivables/Collections` | list | xml | Prioritize overdue customers and promises. | `WorkEffort; proposed CollectionPromise` | own | AR | new | WorkEffort; proposed CollectionPromise rows; find parameters |
| Dunning | `Accounting/Receivables/Dunning` | list | xml | Review reminder runs and letters before sending. | `Proposed DunningRun and DunningNotice` | own | AR | new | Proposed DunningRun and DunningNotice rows; find parameters |
| Statements | `Accounting/Receivables/Statements` | wizard | xml | Generate and send customer statements. | `Invoice statement projection` | own | AR | parity | Invoice statement projection |
| RecurringInvoices | `Accounting/Receivables/RecurringInvoices` | list | xml | Manage recurring AR and AP schedules. | `Proposed InvoiceSchedule` | own | AR; AP | new | Proposed InvoiceSchedule rows; find parameters |
| Customer360 | `Accounting/Receivables/Customer360` | 360 | xml | Show financial customer context. | `Party partyId` | Customer360, crosscut §3.2 | app | parity | Party partyId |
| InvoicePay | `Accounting/External/InvoicePay` | detail | xml | Let the authorized customer view and pay a sent invoice. | `Invoice invoiceId` | own | customer capability | new | Invoice invoiceId; external customer scope |
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
| Supplier360 | `Accounting/Payables/Supplier360` | 360 | xml | Show supplier financial context. | `Party partyId` | Supplier360, crosscut §3.3 | app | parity | Party partyId |
| SupplierBillUpload | `Accounting/External/SupplierBillUpload` | wizard | xml | Accept supplier bill files against the supplier’s own orders. | `Proposed supplier submission; Invoice` | own | supplier capability | new | Proposed supplier submission; Invoice |

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
| GlAccountDetail | `Accounting/GeneralLedger/GlAccountDetail` | detail | xml | Edit one account and its organization mappings. | `GlAccount glAccountId` | own | GL | parity | GlAccount glAccountId |
| JournalEntries | `Accounting/GeneralLedger/JournalEntries` | list | xml | Find draft and posted ledger transactions. | `AcctgTrans` | own | GL | parity | AcctgTrans rows; find parameters |
| JournalEntryDetail | `Accounting/GeneralLedger/JournalEntryDetail` | detail | xml | Balance, post and reverse one accounting transaction. | `AcctgTrans acctgTransId` | own | GL | parity | AcctgTrans acctgTransId |
| TransactionEntries | `Accounting/GeneralLedger/TransactionEntries` | list | xml | Search ledger lines across transactions. | `AcctgTransEntry` | own | GL | parity | AcctgTransEntry rows; find parameters |
| JournalBatches | `Accounting/GeneralLedger/JournalBatches` | list | xml | Group transactions into Mantle posting batches. | `GlJournal` | own | GL | parity | GlJournal rows; find parameters |
| JournalTemplates | `Accounting/GeneralLedger/JournalTemplates` | editor | xml | Maintain reusable manual-entry templates. | `Proposed AcctgTransTemplate` | own | GL | new | Proposed AcctgTransTemplate |

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
| Intercompany | `Accounting/PeriodClose/Intercompany` | wizard | xml | Design balanced transactions and consolidation adjustments across organizations. | `Proposed IntercompanyBatch` | own | multi-organization finance approver | later | Proposed IntercompanyBatch |

### Fixed assets

| Screen | Path | Archetype | Impl | Purpose | Main record | Reused | Roles | Scope | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FixedAssets | `Accounting/FixedAssets/FixedAssets` | list | xml | Find financial books on the common asset register. | `Asset` | own | GL | parity | Asset rows; find parameters |
| EquipmentDetail | `Accounting/FixedAssets/EquipmentDetail` | detail | xml | Maintain book information on the shared asset record. | `Asset assetId` | EquipmentDetail, crosscut §3.10 | app | parity | Asset assetId |
| AssetClasses | `Accounting/FixedAssets/AssetClasses` | settings | xml | Set book defaults by asset class. | `Proposed FixedAssetClass` | own | finance admin | new | Proposed FixedAssetClass |
| DepreciationRunDetail | `Accounting/FixedAssets/DepreciationRunDetail` | wizard | xml | Preview, post and reverse depreciation by period. | `Proposed AccountingPeriodRun runId` | own | finance approver | new | Proposed AccountingPeriodRun runId |
| InventoryValuation | `Accounting/FixedAssets/InventoryValuation` | report | xml | Tie inventory and production value to stock and ledger. | `ironstone.accounting.ReportServices.run#InventoryValuation` | own | GL | parity | organization/date/currency filters; selected source rows |
| ProductionCostClose | `Accounting/FixedAssets/ProductionCostClose` | task | xml | Review and post production WIP/output allocation and variances. | proposed ProductionCostEvent; ProductionCostAllocation | own | GL; finance approver | new | organization, production run, source revision and accounting date |

### Tax

| Screen | Path | Archetype | Impl | Purpose | Main record | Reused | Roles | Scope | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TaxAuthorities | `Accounting/Tax/TaxAuthorities` | list | xml | Maintain common tax jurisdictions and party/category assignments. | `TaxAuthority` | own | tax admin | new | TaxAuthority rows; find parameters |
| TaxRates | `Accounting/Tax/TaxRates` | editor | xml | Maintain effective local rates behind the tax gateway. | `Proposed corrected TaxAuthorityRate` | own | tax admin | new | Proposed corrected TaxAuthorityRate |
| TaxStatements | `Accounting/Tax/TaxStatements` | list | xml | Prepare, review and export tax statement records. | `TaxStatement` | own | tax | new | TaxStatement rows; find parameters |
| TaxStatementDetail | `Accounting/Tax/TaxStatementDetail` | detail | xml | Review tax totals, source lines and output validation. | `TaxStatement taxStatementId` | own | tax | new | TaxStatement taxStatementId |
| ElectronicInvoices | `Accounting/Tax/ElectronicInvoices` | list | xml | Track inbound/outbound electronic-invoice processing. | `InvoiceSystemMessage; proposed InvoiceExchange` | own | tax; AP; AR | later | InvoiceSystemMessage; proposed InvoiceExchange rows; find parameters |

### Budgets

| Screen | Path | Archetype | Impl | Purpose | Main record | Reused | Roles | Scope | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Budgets | `Accounting/Budgets/Budgets` | list | xml | Find GL budgets and revisions. | `Budget` | own | GL | parity | Budget rows; find parameters |
| BudgetDetail | `Accounting/Budgets/BudgetDetail` | editor | xml | Edit account-by-period budgets and review changes. | `Budget budgetId` | own | GL; finance approver | parity | Budget budgetId |
| BudgetControls | `Accounting/Budgets/BudgetControls` | settings | xml | Set warning/stop rules for commitments and expenses. | `Proposed BudgetControlPolicy` | own | finance admin | new | Proposed BudgetControlPolicy |

### Reports

| Screen | Path | Archetype | Impl | Purpose | Main record | Reused | Roles | Scope | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Reports | `Accounting/Reports/Reports` | landing | xml | Choose financial and operational financial reports. | `Report catalog` | own | app | parity | Report catalog |
| TrialBalance | `Accounting/Reports/TrialBalance` | report | xml | Trial balance with opening/debit/credit/ending balances. | `mantle.ledger.LedgerServices.get#OrganizationFiscalTimePeriods` | own | report reader | parity | organization/date/currency filters; selected source rows |
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
| Currencies | `Accounting/Settings/Currencies` | settings | xml | Maintain currencies and dated exchange-rate inputs. | `Uom and UomConversion` | own | finance admin | parity | Uom and UomConversionDated |
| PaymentMethods | `Accounting/Settings/PaymentMethods` | settings | xml | Configure allowed instruments and scoped gateway bindings. | `PaymentMethod and PaymentGatewayConfig` | own | finance admin; treasury | parity | PaymentMethod and PaymentGatewayConfig |
| CollectionPolicies | `Accounting/Settings/CollectionPolicies` | settings | xml | Configure dunning levels and credit policies. | `Proposed DunningLevel and CustomerCreditPolicy` | own | finance admin | new | Proposed DunningLevel and CustomerCreditPolicy |
| BankRules | `Accounting/Settings/BankRules` | settings | xml | Configure auditable matching suggestions. | `Proposed BankMatchRule` | own | finance admin; treasury | new | Proposed BankMatchRule |
| DocumentSettings | `Accounting/Settings/DocumentSettings` | settings | xml | Choose document templates and numbering. | `PartyAcctgPreference; template resources` | own | finance admin | new | PartyAcctgPreference; template resources |

## 3. Home

### Home

**Layout:** landing.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| AccountingSummary | display | Choose organization and read setup health | organization, as-of date, base currency, last successful refresh | — | proposed `ironstone.accounting.HomeServices.get#Summary` | Accounting/dashboard OrgInternalForm; Carbon invoicing dashboard |
| MoneyCards | component | Open the filtered work queue behind each number | AR due/overdue, AP due, bank balances, unmatched lines, unposted documents | dashboard; number cards | proposed `ironstone.accounting.HomeServices.get#Summary` | Carbon AR/AP aging and subledger tie-out |
| MyFinanceWork | list | Work assigned to the current finance user | bill approvals, failed batches, close blockers, collection activities | — | proposed `ironstone.accounting.HomeServices.get#Work` | Odoo journal cards; existing approvals/Today providers |

**Actions:** Open each number with its organization/date filters. Quick create invoice, bill, payment or journal entry checks the relevant capability. An unconfigured organization gets Setup as primary.

**States:** A failed aggregate is unavailable, never zero. Show cached result with its timestamp while retrying; an inaccessible account contributes no names or amounts.

**Navigation:** The home entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §1 and §17; Carbon `apps/erp/app/modules/accounting/ui/Activation/ReadinessChecklist.tsx`; SimpleScreens Accounting/dashboard.

**Needs:** AC-01; AC-12; AC-18.

## 4. Receivables

### Invoices

**Layout:** list.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| InvoiceFind | find | Select an AR queue | customer, status, dates, due range, currency, invoice type | — | — | Accounting/Invoice/FindInvoice MainOptions |
| InvoiceList | list | Read balances and source links | invoice, customer, date, due, total, unapplied/paid, unpaid, status | — | entity | Accounting/Invoice/FindInvoice InvoiceList; AgingSummaryList |
| CreateReceivable | dialog | Create an invoice or customer credit | customer, organization, type, currency, date, due/terms, reference | — | mantle.account.InvoiceServices.create#Invoice | Accounting/Invoice/FindInvoice NewReceivableForm; NewCustCreditForm |
| InvoiceBatch | list, bulk | Review and send selected eligible documents | selection, template, recipient preview, result per invoice | — | proposed `ironstone.accounting.InvoiceServices.process#Batch` | Odoo account_move_send batch wizard |

**Actions:** Tabs Draft, Unpaid, Overdue, Credits, All use derived balances. New opens InvoiceDetail. Send/print/export are selected-row operations; each invoice failure is named and the rest continue.

**Views:** List, pivot and graph over the same filtered dataset; calendar by dueDate. No drag-to-paid action.

**Navigation:** The receivables entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §4, §13, §17; Odoo `odoo/addons/account/wizard/account_move_send_wizard.py`.

**Needs:** AC-02; AC-18.

### InvoiceDetail (Context passed)

**Context passed.** Mount `Accounting/Receivables/InvoiceDetail` using InvoiceDetail, crosscut §3.16. Mount `Shared/InvoiceDetail` with receivables direction and organization fixed. Tabs: Overview, Items/taxes, Payments/credits, Orders, Shipments, Budget details, GL, Files, Chatter, History. Finance writers edit drafts; authorized posters finalize/post, reverse or credit; collectors send and apply eligible receipts. Preserve Projects time/milestone links and its narrower client view. Actions use the shared contract, including `mantle.account.InvoiceServices.get#InvoiceDisplayInfo`, `create#InvoiceCreditMemo`, `reverse#Invoice`, `mantle.account.PaymentServices.apply#InvoiceToInvoice` and the guarded invoice transition adapter.

**Needs:** AC-02; AC-08; AC-11.

### ReceivablesWorkbench

**Layout:** split.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| OpenItemFind | find | Fix party and accounting scope | organization, customer, currency, as-of date, due bucket | — | — | Carbon ARAP workbench |
| OpenItems | list | Compare available and outstanding balances | invoice/payment/credit id, date, due, original, remaining, selected amount | two lists; row selection | proposed `ironstone.accounting.SettlementServices.find#OpenItems` | Accounting/Invoice/EditInvoice UnpaidInvoiceList; UnappliedPaymentList |
| Allocation | list, editable rows | Preview an application set | source credit/payment, target invoice, applied amount, currency, difference reason | — | mantle.account.PaymentServices.apply#InvoicePayment; mantle.account.PaymentServices.apply#InvoiceToInvoice; mantle.account.PaymentServices.apply#PaymentToPayment; mantle.account.PaymentServices.unapply#PaymentApplication | Accounting/Payment/EditPayment PaymentApplicationList; Carbon payment applications |

**Actions:** Preview then confirm allocation atomically per party/currency set. Lock balances and re-read before applying; stale previews refresh. Discount/write-off/FX requires the proposed settlement adapter and explicit accounts, never a silently reduced balance.

**Navigation:** The receivables entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §5, §7, §13; Carbon invoicing ARAP workbench; baseline payment applications.

**Needs:** AC-02; AC-12.

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

**Actions:** Generate preview, inspect a letter, confirm Send. Idempotency is per customer/invoice-set/level/run; one recipient failure does not restart successful sends. Fees and interest are later, require a separate reviewed invoice/adjustment, and are never implicit email side effects.

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
| ScheduleEdit | dialog | Set the billing cadence and source | template invoice/subscription, organization, cadence, interval, start/end, due terms, auto-send | — | proposed `ironstone.accounting.RecurringServices.store#Schedule` | ERPNext Subscription; Akaunting recurring form |
| GeneratePreview | dialog | Preview the next billing period | schedule, period, invoice date, proration, amount, tax result | — | proposed `ironstone.accounting.RecurringServices.preview#Period` | ERPNext Subscription generation |

**Actions:** Preview, generate draft, pause/resume and inspect last result. Generation key is schedule+period; source changes create a revised schedule for future periods. Default produces drafts; opt-in auto-send still requires successful tax/credit/period validation.

**Navigation:** The receivables entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §4, §6; ERPNext Subscription; existing InvoiceTemplate and Subscription records.

**Needs:** AC-09; AC-08.

### Customer360 (Context passed)

**Context passed.** Mount `Accounting/Receivables/Customer360` using Customer360, crosscut §3.2. Fix customer and organization. Tabs: contact overview, Receivables/aging, Payments, Credit, Statements, Orders, Cases/returns links, Chatter. Show credit limit/currency/overdue threshold and its source policy; finance credit managers edit policy and release an order hold with a reason. Customer Service readers get allowed balances/hold reason, not bank credentials. Collections uses the same activities and promises as Collections. Source: Party/FinancialInfo and research §13.

**Needs:** AC-10; AC-11; AC-12.

### InvoicePay

**Physical definition.** Proposed `screen/Shared/InvoicePay.xml` is owned here. The Accounting
external route and future customer account mounts use the same record-scoped page and service
contract; the internal Accounting launcher grant is not a customer-access requirement.

**Layout:** detail.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| PublicInvoice | display | Show the customer-approved document | number, issue/due date, lines, tax, total, paid, due | — | proposed `ironstone.accounting.PortalServices.get#Invoice` | Akaunting signed invoice portal; Projects client invoice view |
| PayInvoice | single | Start hosted or tokenized payment | invoice, amount due, allowed payment method, payer confirmation, request identity | — | proposed `ironstone.accounting.PortalServices.start#InvoicePayment` | Odoo payment portal; Frappe payments checkout |
| PaymentResult | display | Show confirmed payment or pending gateway result | attempt id, amount, gateway state, receipt, next action | — | proposed `ironstone.accounting.PortalServices.get#PaymentResult` | Frappe payments success/failed/cancel pages |

**Actions:** The external route is separate from the internal Accounting app grant. A record-scoped token or authenticated customer relationship grants view; a gateway-confirmed result grants payment settlement. Redirect return parameters never mark paid. Keep pending visible and let retry resume the existing attempt.

**States:** Expired/revoked/foreign token returns unavailable without disclosing invoice existence. No Chatter, cost, internal time rates, bank secrets or unrelated party navigation.

**Navigation:** Open from the sent invoice link or an authenticated customer's permitted invoice
list. Return to that external origin or show the submission/payment receipt. Source links expose
only explicitly permitted customer records; this page does not open internal Accounting navigation.

**Source:** research §4, §7 and §16; Projects client isolation contract; crosscut §5.

**Needs:** AC-02; AC-18.

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
| BillUpload | dialog | Capture source files for review | supplier, file, reference, document date | — | proposed `ironstone.accounting.InvoiceServices.import#Bill` | Odoo bill uploader; Carbon purchase invoice extraction |

**Actions:** Incoming, Review, Held, Approved, Due, Credits tabs. Upload creates a draft and preserves the original; extraction suggestions require review. Detect supplier/reference duplicates in organization scope. Approve only after matching policy passes or recorded release.

**Navigation:** The payables entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §6; ERPNext Purchase Invoice; baseline FindInvoice.

**Needs:** AC-02; AC-03; AC-18.

### BillDetail (Context passed)

**Context passed.** Mount `Accounting/Payables/BillDetail` using InvoiceDetail, crosscut §3.16. Mount Shared/InvoiceDetail with payable direction. Tabs: Overview, Items/taxes, Match, Payments, Orders, Shipments, Budget details, GL, source document, Chatter, History. Incoming → Received → Approved → Payment Sent retains Mantle status IDs. Separate invoice hold from approval state and show reason/release date. Payment never bypasses hold. Match opens InvoiceMatch; supplier return credit links ReturnDetail. Only finance approvers release holds and approve; Purchasing can propose corrections and view matching. Source: research §6 and Accounting/EditInvoice.

**Needs:** AC-02; AC-03; AC-08.

### InvoiceMatch (Context passed)

**Context passed.** Mount `Accounting/Payables/InvoiceMatch` using InvoiceMatch, crosscut §3.22. Fix invoice and organization. Display bill lines alongside PO and accepted receipt quantities, prior billed/credited quantities, price/UOM/currency/tax and tolerance. Accounting confirms matching and releases exceptions with reason; buyers can explain or correct source purchasing records. Retain quantity allocation by source line, and rerun validation on source changes. Mount also from BillDetail. No match action fabricates receipt or changes stock. Source: Odoo purchase_bill_line_match and ERPNext Purchase Invoice links.

**Needs:** AC-03.

### PayablesWorkbench

**Layout:** split.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| PayableScope | find | Choose payment consideration scope | supplier, organization, due-through, currency, bank, hold | — | — | Carbon ARAP workbench |
| PayableItems | list | Compare invoices and available credits | bill, due, discount date, match, hold, unpaid, available credit | — | proposed `ironstone.accounting.SettlementServices.find#OpenItems` | Carbon payable workbench; baseline EditPayment UnpaidInvoiceList |
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
| Selection | wizard step | Select due approved bills | supplier, invoice, due, discount, outstanding, amount, excluded reason | — | proposed `ironstone.accounting.PaymentRunServices.select#Bills` | ERPNext Payment Order references |
| Review | wizard step | Approve exact proposal totals | bank, pay date, instrument, grouping, selected items, fees, expected total | — | proposed `ironstone.accounting.PaymentRunServices.approve#Run` | ERPNext Payment Order; Odoo register payment |
| Execute | wizard step | Create durable payments and outputs | run, payment ids, check numbers, file, result per supplier/payment | — | proposed `ironstone.accounting.PaymentRunServices.execute#Run`; mantle.account.PaymentServices.assign#BankAccountCheckNumber; mantle.account.NachaServices.generate#NachaFile; mantle.account.PositivePayServices.generate#PositivePayFile | Accounting/Payment/BulkPaymentCheck PaymentList; PaymentListAssignRef; PaymentListActions |
| BankReturns | dialog | Import bank rejects and inspect them | file, payment reference, bank code, status, reason | — | mantle.account.NachaServices.import#NachaReturn | Mantle NachaServices import; Dolibarr rejection queue |

**Actions:** Select → Review → Approve → Execute → Results. Approval freezes selection, amounts, bank and date; edits invalidate approval. Re-read bill/hold/credit status under lock at execution. One supplier/payment unit fails independently; successful instructions retain their identities and files. Regeneration downloads the existing file; resend and void/reissue are distinct audited actions.

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

**Needs:** AC-02; AC-04.

### Supplier360 (Context passed)

**Context passed.** Mount `Accounting/Payables/Supplier360` using Supplier360, crosscut §3.3. Fix supplier and organization. Tabs: Overview/contact, Bills/open items, Payments, Returns/credits, Terms, Purchase orders/receipts, Chatter. Show held and unmatched totals separately from payable balances. Finance users edit payment/settlement terms and authorized bank details, with audit and masked display; supplier price edits require sourcing authority. Existing party financial forms feed open items.

**Needs:** AC-02; AC-03; AC-12.

### SupplierBillUpload

**Physical definition.** Proposed `screen/Shared/SupplierBillUpload.xml` is owned here and
mounted at the Accounting external route and `Purchasing/Portal/SupplierBillUpload`. Verified
supplier/organization scope and source revision govern both; neither requires an internal app grant.

**Layout:** wizard.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| SupplierSubmission | wizard step | Choose own order and upload evidence | supplier capability, PO, supplier invoice reference, date, currency, amount, file | — | proposed `ironstone.accounting.PortalServices.submit#SupplierBill` | Dolibarr supplier document portal; Odoo vendor bill capture |
| SubmissionReceipt | display | Confirm receipt without approval | submission id, received time, draft invoice reference, processing state | — | proposed `ironstone.accounting.PortalServices.get#Submission` | Odoo inbound bill capture |

**Actions:** Authorize supplier relationship/record-scoped invitation before showing PO choices. Duplicate uploads/reference repeats return the earlier submission. Accepted file creates Incoming bill for AP review, never an approved payable.

**Navigation:** Open from a verified supplier invitation or the supplier's permitted PO page.
Back returns to that external page, and the receipt shows only this submission's permitted status.
Internal AP users separately open the resulting incoming bill from their own authorized worklist.

**Source:** research §6 and §16; crosscut §5.

**Needs:** AC-02; AC-18.

## 6. Payments

### Payments

**Layout:** list.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| PaymentFind | find | Choose direction and state | organization, party, instrument, date, status, unapplied, currency | — | — | Accounting/Payment/FindPayment |
| PaymentList | list | Show cash and application state | payment, direction, party, amount, applied, unapplied, status, reference | — | entity | Accounting/Payment/FindPayment PaymentList |
| NewPayment | dialog | Enter a receipt or disbursement | direction, party, organization, date, amount, currency, payment method, reference | — | mantle.account.PaymentServices.create#Payment | Accounting/Payment/FindPayment NewInPaymentForm; NewOutPaymentForm |

**Actions:** Tabs Incoming, Outgoing, To validate, Unapplied, Refunds, All. New opens PaymentDetail. Validate requires treasury capability; no list edit can set a settled state without payment evidence.

**Navigation:** The payments entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §7; baseline FindPayment; Dolibarr tovalidate.

**Needs:** AC-02.

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

**Actions:** Confirm delivered/cleared evidence through guarded transition adapter, post via mantle.ledger.PaymentAutoPostServices.post#Payment, reverse through mantle.ledger.PaymentAutoPostServices.revert#PaymentPost, void via mantle.account.PaymentServices.void#Payment. Posted corrections preserve original links. Refund check locks original refundable balance; partial refunds cumulative. Payment-date changes call mantle.account.PaymentServices.set#PaymentDate under lock/period controls.

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
| StatementTransactions | list, editable rows | Review imported or manual bank lines | FIT id, value date, amount, description, matched payment/GL, no-reconcile | — | mantle.account.ReconciliationServices.create#PaymentMethodTrans; mantle.account.ReconciliationServices.update#PaymentMethodTrans | Party PaymentMethodTrans add/update/list |
| BankFiles | list | Manage checks and bank exchange files | file type, period, produced date, status, checks, bank acknowledgement | — | mantle.account.PaymentMethodServices.update#PaymentMethodFileComplete; mantle.account.PaymentMethodServices.cancel#PaymentMethodFile; mantle.account.PaymentMethodServices.produce#PaymentMethodFileSystemMessage | Party payment method files/checks |

**Actions:** Import statement, start ReconciliationDetail, open UnmatchedTransactions and print statement. No-reconcile needs a reason and does not create a balancing entry. Canceling a transmission does not reverse already executed payments.

**Navigation:** The banking entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §8; baseline Party payment method transactions/files.

**Needs:** AC-05; AC-04.

### StatementImport

**Layout:** wizard.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| StatementFile | wizard step | Identify bank and format | bank, format BAI2/OFX/CSV, file, statement period | — | mantle.account.BaiServices.upload#BaiVersion2; mantle.account.OfxServices.upload#OfxVersion1; proposed `ironstone.accounting.BankServices.preview#CsvStatement` | Party PaymentMethodTrans uploads; ERPNext bank_statement_import |
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

**Actions:** Open GlAccountDetail; import charts through Setup mapping/review. Reparent validates no cycle and preserves historical account identity; posting accounts with transactions are deactivated, not deleted.

**Views:** Tree and list over one find.

**Navigation:** The general ledger entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §2; Carbon chart tree; baseline GlAccountTree.

**Needs:** AC-01; AC-18.

### GlAccountDetail

**Layout:** detail.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| AccountHeader | single | Edit account metadata | code, name, parent, class, type, posting flags | — | entity; mantle.ledger.LedgerServices.set#GlAccountFlags | Accounting/GlAccount/EditGlAccount EditGlAccountForm |
| OrganizationAccounts | list, editable rows | Assign accounts and configuration per organization | organization, account, from/thru, balance | — | entity | Accounting/GlAccount/EditGlAccount NewGlAccountOrgForm; GlAccountOrgList |
| AccountGroups | list, editable rows | Assign report categories/groups | category, group, account, effective dates | — | entity | Mantle GlAccountCategory/GlAccountGroup; Odoo account tags |

**Actions:** Save metadata, open AccountLedger with fixed account, view usages before disabling. Changes to account meaning cannot rewrite posted transactions.

**Navigation:** The general ledger entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §2 and §17; baseline EditGlAccount.

**Needs:** AC-01.

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
| TransactionHeader | single | Edit draft header | date, type, organization, currency, description, journal, source | — | mantle.ledger.LedgerServices.update#AcctgTrans | Accounting/Transaction/EditTransaction UpdateAcctgTrans |
| TransactionLines | list, editable rows | Edit balanced debit/credit lines | account, debit/credit, amount, currency, party, product, facility, description | — | mantle.ledger.LedgerServices.create#AcctgTransEntry; mantle.ledger.LedgerServices.update#AcctgTransEntry; mantle.ledger.LedgerServices.delete#AcctgTransEntry; mantle.ledger.LedgerServices.calculate#AcctgTransTrialBalance | Accounting/Transaction/EditTransaction AddEntryForm; EntryListForm |
| MoveDraftLine | dialog | Move a draft entry to another draft transaction | entry, destination transaction, reason | — | mantle.ledger.LedgerServices.move#AcctgTransEntry | Accounting/Transaction/MoveEntry ReceiveForm |
| PostingAction | dialog | Post or reverse with a dated reason | transaction, posting/reversal date, reason, period validation | — | mantle.ledger.LedgerServices.post#AcctgTrans; mantle.ledger.LedgerServices.post#ReverseAcctgTrans; mantle.ledger.LedgerServices.delete#AcctgTrans | Accounting/Transaction/EditTransaction post/reverse/delete transitions; ERPNext immutable ledger |
| EntryAudit | list, read | Show original and correction trail | actor, date, field, before/after, reverse links | — | entity | Accounting/Transaction/EditTransaction AuditLogList |

**Actions:** Post requires balanced lines, complete accounts, open period and authorized organization. Delete only drafts. Posted entries are read-only; correction creates linked reversal and a new draft. The old UpdateAcctgTransPosted and unpost shortcuts are deliberately not exposed for financial changes; metadata corrections use an audited limited adapter.

**Sections and tabs:** Header, balanced lines with totals, source documents, audit. Existing account/party/product/facility/work-effort links are the initial dimensions; adding a second generic analytical dimension system is deferred.

**Navigation:** The general ledger entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §3 and §9; baseline EditTransaction and MoveEntry.

**Needs:** AC-06; AC-02.

### TransactionEntries

**Layout:** list.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| EntryFind | find | Choose account and source dimensions | organization, date, account, party, product, facility, posted | — | — | Accounting/Transaction/FindTransactionEntry |
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

**Layout:** editor.

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

**Navigation:** The period close entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §9; Carbon periods UI; baseline close services.

**Needs:** AC-06; AC-12.

### PeriodLocks

**Layout:** settings.

**Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| PostingLocks | list, editable rows | Set effective lock dates | organization, scope all/sales/purchases/tax, lock-through date, hard flag, reason | — | proposed `ironstone.accounting.CloseServices.store#Lock` | Odoo company lock dates; ERPNext Accounting Period |
| LockExceptions | list, editable rows | Authorize a narrow temporary exception | lock, user/group, allowed document/scope, expires, reason, approver | — | proposed `ironstone.accounting.CloseServices.grant#Exception` | Odoo ir.lock.exception |

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

**Needs:** AC-16; AC-06.

### Leases

**Physical definition.** Proposed `screen/Shared/Leases.xml` is owned here; Accounting's
Leases route and Purchasing's later LeaseOverview mount the same record/schedule. Purchasing
fixes supplier/asset/organization and is read-only without separate lease-finance capabilities.

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

## 10. Fixed assets

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

**Context passed.** Mount `Accounting/FixedAssets/EquipmentDetail` using EquipmentDetail, crosscut §3.10. Fix asset and organization; emphasize Books, Depreciation, acquisition/source, GL, Files and maintenance overview. Accounting may capitalize, adjust, dispose/sell and reverse through proposed fixed-asset services; Maintenance/Manufacturing/Warehouse contexts show permitted net-book summaries without these actions. Asset classes supply defaults, not mutable historical policy. Disposal revalidates active usage/stock links, records proceeds and writes linked GL entries; it does not delete the asset.

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
| ValuationRows | list, read | Show source cost and ledger differences | product/asset, quantity, unit cost, value, inventory GL, WIP, variance | — | proposed `ironstone.accounting.ReportServices.run#InventoryValuation` | Accounting/Reports/AssetValuation AssetValuationSummary |
| ValuationAdjustment | dialog | Preview a deliberate stock revaluation | scope, effective date, new standard basis, reason, affected quantity | — | proposed `ironstone.accounting.AssetBookServices.preview#Revaluation` | ERPNext Item Standard Cost and stock revaluation |

**Actions:** Drill into AssetReceipt/AssetIssuance and ledger sources. Revalue requires a reviewed run and financial authority; cost edits in Products never alter posted values automatically. Quantity remains owned by stock postings.

**Navigation:** The fixed assets entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §15–§17; crosscut §4.1; Accounting AssetValuation.

**Needs:** AC-07; AC-12.

### ProductionCostClose

**Physical definition.** Proposed `screen/Shared/ProductionCostClose.xml`, owned here, is
mounted at the Accounting route above and within Manufacturing's run context. Both mounts
apply the same financial capability, organization, period and source-revision checks.

**Layout.** Task, XML; run identity and operational/quality status above cost evidence, output
allocation and proposed ledger entries. InventoryValuation, close-check exceptions and
Manufacturing's ProductionCosts link here. Terminal users review the same tables and numbered
Preview/Approve/Post actions; narrow layouts stack the three panes.

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| CostCloseScope | single | Select the run and posting basis | organizationPartyId, workEffortId, accountingDate, allocationPolicyId/version, reason; source/estimate version read-only | run lookup, period warning | proposed `ironstone.accounting.ProductionCostServices.preview#CostClose` | Manufacturing ProductionCosts; Carbon JobEstimatesVsActuals; new close controls specified here |
| CostEvidence | list, read | Reconcile actual facts and prior allocations | event ID/type, source ID/line, operation/snapshot line, quantity/UOM, currency, frozen rate, amount, prior allocated amount, remaining amount, hold/error and GL links | authorized source drill-down | same preview result | existing AssetReceipt/AssetIssuance and Accounting valuation report; proposed crosscut cost evidence |
| OutputAllocation | list, editable draft | Review distribution and residual variance | output snapshot line, asset/receipt, accepted/held quantity, allocation basis/weight, proposed amount, residual variance and reason; no quantity editing | decimal/currency totals | same preview result; recalculation through `preview#CostClose` | Carbon estimates versus actuals; new allocation controls specified here |
| PostCostClose | dialog | Commit the reviewed balanced allocation | previewId/version, operationKey, accountingDate, approvalDecisionId when required, reason; server totals and ledger proposal read-only | explicit confirmation; resulting source/GL links | proposed `ironstone.accounting.ProductionCostServices.post#CostClose` | existing ledger posting controls; new atomic production allocation |

The fields listed above are the complete business-input contract for these new controls; record
identity, authenticated actor, timestamps and operation outcomes are server-managed. Preview
accepts explicit output weights only where the organization's effective policy permits them.
The server recalculates decimal totals, locks remaining cost events and output allocations,
rejects stale evidence, and validates each source, currency, period and approval. Allocations,
WIP release, variance and resulting ledger links commit once as one run-level financial event;
an independent batch of runs reports named failures and continues. Operational completion does
not imply cost close, and unresolved required stock/quality/financial facts block final close.

Subcontract service acceptance links to the already recorded production output and inspection.
Company-owned material at a supplier remains company-owned stock/WIP. The processing accrual
enters WIP once; the supplier bill clears or adjusts it, and never adds the full charge a second
time or receives output stock again. Late bills, time corrections or scrap facts create linked
open-period allocations/variances; they do not rewrite a closed period or historic issue cost.

**Actions and permissions.** Manufacturing can request review. Financial readers inspect
authorized evidence; GL/finance approvers preview, approve and post according to separation
policy. A same-app shared link checks financial capability rather than Manufacturing launcher
membership. Posted allocations have linked reversal/adjustment actions through the same guards.
**Source.** [Manufacturing costs](design-manufacturing.md#productioncosts),
[crosscut costing](design-crosscut.md#41-product-identity-units-pricing-and-cost), existing
AssetAutoPostServices and the Carbon JobEstimatesVsActuals reference cited in Manufacturing.
**Needs.** AC-07; AC-06; shared CX-COST/CX-POSTING.

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

**Layout:** editor.

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

**Actions:** Preview and export; unsupported jurisdiction/format is explicitly unavailable. Correct through source documents and create a new statement revision. Delete only unissued drafts through mantle.other.TaxServices.delete#TaxStatement; no silent mutation of filed evidence.

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

**Layout:** editor.

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

**Actions:** A proposal explains the relevant budget and remaining balance; approval/conversion rechecks under lock. An override requires finance authority and a recorded reason. Commitments are released by cancellation/conversion links, not double-counted alongside actual expense.

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
| TrialBalanceRows | list, read | Trial balance with opening/debit/credit/ending balances. | account, beginning, debits, credits, ending | — | mantle.ledger.LedgerServices.get#OrganizationFiscalTimePeriods | Accounting/TimePeriod/ViewPeriodGlAccounts PeriodGlAccountList |

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
| AgingRows | list, read | Age receivables/payables and inspect individual invoices. | party, current, bucket amounts, currency, total, due date | — | proposed `ironstone.accounting.ReportServices.run#Aging` | Accounting/Invoice/Aging ReportOptions; InvoiceAgingList; Accounting/Reports/ArAgingSummary; InvoiceAgingDetail |

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
| BudgetVarianceRows | list, read | Compare approved budget, commitment and actual. | account, period, approved, committed, actual, remaining, variance | — | mantle.other.BudgetReportServices.run#BudgetExpenseReport; mantle.other.BudgetReportServices.run#BudgetExpenseDetailReport | Accounting/Budget/BudgetReport GlAccountBudgetList |

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
| SalesAnalysisRows | list, read | Analyze sales order/invoice and source reconciliation. | product/customer group, ordered, issued, invoiced, returns, value | — | proposed `ironstone.accounting.ReportServices.run#SalesAnalysis` | Accounting/Reports/SalesSummary SummaryOptions; TopProductList; SalesOrderSummaryList; TopCustomerClassList; SalesInvoiceSummaryList; SalesAnalysis SalesAnalysis; SalesInvoiceAnalysis SalesInvoiceAnalysis; InvoiceItemSummary InvoiceItemSummary; OrderItemSummary OrderItemSummary; OrderIssuedInvoiced OrderIssuedInvoiced |

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

**Context passed.** Mount `Accounting/Records/OrderDetail` using OrderDetail, crosscut §3.6. Fix organization; show Overview, Items, Invoices/payments, Shipments, Credits/returns, Chatter. Finance may create eligible partial or entire-order-part invoices through `mantle.account.InvoiceServices.create#EntireOrderPartInvoice` and apply existing invoices; purchasing/order changes stay with their permission sets. Do not require Sales/Purchasing launcher grants to view an authorized source order. Preserve Projects estimates/milestone shares.

**Needs:** AC-02; AC-03.

### ShipmentDetail (Context passed)

**Context passed.** Mount `Accounting/Records/ShipmentDetail` using ShipmentDetail, crosscut §3.8. Fix organization; tabs Items/source orders, Receipts/issuances, Invoices, Costs and tracking. Finance reads physical facts and creates invoices through `mantle.account.InvoiceServices.create#SalesShipmentInvoices` or `create#PurchaseShipmentInvoices`; it does not edit received quantities to force matching. Landed-cost allocation is an explicit proposed financial adjustment linked to receipt lines, retained in AC-07.

**Needs:** AC-02; AC-03; AC-07.

### Product360 (Context passed)

**Context passed.** Mount `Accounting/Records/Product360` using Product360, crosscut §3.5. Show Summary, Costs/history, valuation sources and GL mappings; inventory quantities and BOM costs are read projections. Finance controls valuation/revaluation; catalog administrators control standard estimates. `ProductGlAccount` mappings use organization scope. No price/standard-cost edit rewrites receipt cost or posted ledger value.

**Needs:** AC-07; AC-12.

### ReturnDetail (Context passed)

**Context passed.** Mount `Accounting/Records/ReturnDetail` using ReturnDetail, crosscut §3.18. Show authorization, received/disposed quantity, previous credits/refunds, original invoice/payment and ReturnItemBilling. Accounting issues credit/refund only for eligible quantity/amount under shared cumulative locks; supplier returns create the corresponding payable credit. Physical receipt remains Warehouse action. Use existing `mantle.order.ReturnServices.process#ReturnItemResponses` behind the proposed guarded return settlement adapter.

**Needs:** AC-02; AC-03.

### Approvals (Context passed)

**Context passed.** Mount `Accounting/Approvals` using Approvals waiting, crosscut §3.15. Mount the Commons approvals screen with bill, payment-run, credit-hold release, budget and close requests filtered to the current organization and actual approver. Open the source preview before deciding. Decisions call the source service and are recorded there; the notification item is not the authoritative approval.

**Needs:** AC-02; AC-04; AC-06; AC-14; AC-18.

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
| Readiness | wizard step | Resolve missing setup and reconcile sources | account mappings, periods, tax method, bank methods, open-item tie-out, blockers | — | proposed `ironstone.accounting.SetupServices.check#Readiness` | Carbon Activation/ReadinessChecklist |
| Activate | wizard step | Commit approved opening state once | run version, organization, opening date, totals, approval | — | proposed `ironstone.accounting.SetupServices.activate#Accounting` | Carbon ApplyCarbonButton |

**Actions:** Save draft, rerun preview, confirm activation. Opening entries and subledger import identities prevent a repeated activation. Mapping/import errors are reviewable by row; activation waits for a balanced reviewed set. Operational documents may remain drafts until setup permits posting.

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
| PostingMappings | list, editable rows | Set defaults by business type | organization, mapping kind, type/item/instrument/asset/reason, account, effective scope | — | entity | Accounting/OrgSettings TypeDefaults; ItemTypes; InvoiceTypes; PaymentTypes; PaymentInstruments; AssetTypes; FinAcctTypes; FinAcctReasons; GlAccounts |
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
| SettlementTerms | list, editable rows | Set due/discount terms | name, due days/date basis, discount date/rate, description, effective dates | — | entity | Mantle SettlementTerm; Carbon PaymentTerms |

**Actions:** Save term for future documents; invoices retain adopted terms and explicit due date. Recompute an existing draft only after confirmation; issued invoice changes are audited.

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

**Navigation:** The settings entry and Home queues link here; source identifiers open their Accounting detail mount or an authorized shared record. Back preserves find filters.

**Source:** research §14; Carbon exchange rates; framework unit conversion records.

**Needs:** AC-16.

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

**Actions:** Preview impact on open orders and pending notices; new policy does not retroactively mark documents paid/approved. Customer-specific limits are edited on Customer360. Fees/interest remain opt-in later policy requiring separate posting.

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

## 16. Baseline coverage

### 16.1 Candidate inventory and baseline forms

Every research candidate area is represented in §2: recurring bills share RecurringInvoices; customer credits and supplier debit notes are contextual InvoiceDetail/BillDetail records; fixed-asset disposal/revaluation lives on EquipmentDetail and the period-run preview; customer/supplier agreements contribute terms without duplicating agreement authoring. Advanced leases, recognition, FX/deferrals, intercompany/consolidation and electronic invoices are explicit later screens.

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
| Accounting/EditGlAccount | `EditGlAccountForm`, `NewGlAccountOrgForm`, `GlAccountOrgList` | `Accounting/GeneralLedger/GlAccountDetail` |
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
| Accounting/AssetValuation | `AssetValuationSummary` | `Accounting/FixedAssets/InventoryValuation` |
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
| Party/PaymentMethodTrans | `AutoMatchReconcileForm`, `ManRecForm` | `Accounting/Banking/ReconciliationDetail` |
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

### 16.3 Acceptance walkthroughs

- **Procure-to-pay:** bill against partial accepted receipt; reject excess/duplicate quantities,
  compare converted units/currency and prior credits; explain tolerance; hold blocks approval
  and payment; authorized release is recorded; supplier bank change invalidates payment approval.
- **Invoice-to-cash:** customer invoice, partial receipt, available credit, discount/write-off,
  currency difference, remaining overdue balance and statement; retries do not double-apply.
- **Return-to-refund:** receive part of an RMA, credit only eligible uncredited quantity, refund
  within the original paid balance, reverse with source links; supplier return creates the
  payable credit with unchanged physical facts.
- **Production-to-GL:** issue/return material, partial output, scrap and labor post through their
  source movements; ProductStandardCost changes leave history intact; deliberate revaluation
  has a preview and ledger links; reconcile inventory/WIP/GL by organization and period.
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
| Invoice, credit memo, supplier bill/debit note | `html-print`, PDF through existing renderer | InvoiceDetail / BillDetail | Baseline Accounting/Invoice/PrintInvoice; Projects invoice output |
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
| AC-01 Organization scope and activation | service type | `ironstone.accounting.AccessServices`, `SetupServices`; proposed `mantle.ledger.config.AccountingSetupRun`; seeded capability groups | Every screen; Setup; settings | Resolve allowed organizations and finance capabilities; readiness over chart/defaults/periods/tax/bank; versioned preview of opening GL/subledgers and one activation identity. `clone#Preferences` previews conflicts. |
| AC-02 Financial document and settlement controls | service type | `InvoiceServices`, `SettlementServices`, `ReturnSettlementServices`, `PortalServices` in `ironstone.accounting`; extend relevant Mantle mutators with shared checks | Invoice/bill/payment/return/shared mounts | Guard state transitions, mutable fields, source eligibility, duplicate supplier reference, balance locks, period and idempotency. `apply#Settlement` previews/application records include authorized discount/write-off/FX with accounts. `settle#Return` guards cumulative received/credited/refunded quantities and existing ReturnItemBilling. Preserve Projects access and billing links. |
| AC-03 Three-way match and holds | data model | Proposed `mantle.account.invoice.InvoiceMatch`, `InvoiceMatchLine`, `InvoiceHold`; `ironstone.accounting.MatchServices` | InvoiceMatch; Bills; Purchasing shared match context | Persist source snapshot/version, allocation of invoice line to PO and accepted receipt, UOM/currency bases, quantities/prices/tax, tolerance result and recorded exception release. `evaluate#InvoiceMatch`, `apply#InvoiceMatch`, `release#InvoiceHold` revalidate under lock; holds are separate from Invoice status. |
| AC-04 Payment runs | data model | Proposed `mantle.account.payment.PaymentRun`, `PaymentRunItem`; `PaymentRunServices` | PaymentRuns / PaymentRunDetail | Header organization/bank/currency/date/instrument/status/version; item invoice/remaining/selected/payment/file/result. Approval freezes proposal; execution rechecks hold/bank/version and creates one payment instruction identity. Existing check/NACHA/Positive Pay outputs consume those payments; no duplicate sends. |
| AC-05 Bank statement sessions and matching rules | data model | Proposed `mantle.account.method.BankReconciliation`, `BankReconciliationLine`, `BankMatchRule`, `StatementImport`; `BankServices` | Banking | Session owns statement period/opening/closing/snapshot and links existing PaymentMethodTrans; no replacement bank ledger. Match rules suggest first; finalization requires zero difference and resolved import failures. Record exclusions/reopen reasons. FIT/source-row keys deduplicate imports. |
| AC-06 Posting locks and close controls | data model | Proposed `mantle.ledger.config.AccountingLock`, `AccountingLockException`, `AccountingCloseRun`; `CloseServices`; shared posting guard | All postings; PeriodClose | Typed organization lock-through dates, approved expiring soft exceptions, immutable hard close. Guard direct and source-triggered posting, adjustments, refunds, reversals. Close snapshots checks/balances and atomically commits with existing period close; reversal retains original. |
| AC-07 Asset books, valuation and reviewed depreciation | data model / service type | Proposed `mantle.product.asset.FixedAssetClass`, shared `mantle.ledger.transaction.AccountingPeriodRun`/result; `AssetBookServices`; `ProductionCostServices` over canonical ProductionCostEvent/ProductionCostAllocation | Assets; close; Products/Manufacturing/Warehouse | Preserve Asset/AssetDepreciation; class defaults versioned. Preview per asset-period then post each once. Capitalization/disposal/revaluation use linked ledger entries. Consume proposed `mantle.product.cost.ProductStandardCost` / `ProductStandardCostComponent` from Products as estimates; Accounting alone posts revaluation/landed-cost allocations. ProductionCostClose previews and posts WIP/output allocation and variance once; crosscut CX-COST owns the evidence model, with subcontract accrual clearing and linked late adjustments. |
| AC-08 Working local tax and statements | data model | Corrected active `mantle.other.tax.TaxAuthorityRate`; extend `mantle.other.TaxServices.calculate#SalesTaxLocal` and `calculate#InvoiceSalesTax`; `ironstone.accounting.TaxServices` | Tax; all invoices/orders | Effective rules by authority/category/code/jurisdiction, inclusion/compound basis, priority and rate; retain calculation version and line results. Existing gateway interface continues; organization fallback supports non-store invoices. Fix old commented relationships. Tax error blocks affected finalization; tax exemption/zero is explicit, not fallback on failure. |
| AC-09 Recurring billing | data model | Proposed `mantle.account.invoice.InvoiceSchedule`, `InvoiceScheduleOccurrence`; `RecurringServices` and ServiceJob | RecurringInvoices | Template or Subscription source, party/direction/currency, cadence/dates, next period, opt-in send policy. Unique schedule-period generation, per-occurrence result; drafts by default, no repeat after job retry. |
| AC-10 Collections and dunning | data model | Proposed `mantle.account.invoice.CollectionPromise`, `DunningLevel`, `DunningRun`, `DunningNotice`; `CollectionServices` | Collections / Dunning / Statements / Customer360 | Reuse WorkEffort activities and record links; add amount/currency/date/qualifying invoice/payment links for promises. Exclude disputes; preview recipient/content; deduplicate notices by run/level/document set. Later fee/interest creates reviewed financial documents. |
| AC-11 Customer credit policy | data model | Proposed `mantle.account.billing.CustomerCreditPolicy`, `CreditHoldDecision`; `CreditServices` | Customer360; orders; invoice controls | Policy per organization/customer/currency, amount limit and overdue threshold, Warn/Hold, effective dates; do not overload BillingAccount.accountLimit for all customers. Explain exposure (open orders + unpaid invoices minus non-duplicated credits), check on commitment, and record authorized hold/release reason. |
| AC-12 Finance report adapters and drill-down | service type | `ironstone.accounting.ReportServices`, `HomeServices`; existing LedgerReportServices and authorized form-list views | Home; Reports; shared 360s | Add partner ledger, as-of aging, source tie-out, multi-period columns and drill-down preserving organization/date/currency. Reuse current report result queries for compatibility; return incomplete/error metadata. Per-app aggregates are providers, not a second Insights dashboard model. |
| AC-13 Entry templates and batch validation | data model | Proposed `mantle.ledger.transaction.AcctgTransTemplate`, `AcctgTransTemplateEntry`; `JournalServices` | JournalTemplates / JournalBatches | Versioned accounts/amount parameters; instantiate a balanced draft with source version. `validate#Batch` validates current constituent entries; proposed `post#Batch` uses atomic per-transaction posts and named partial results rather than the current fail-fast post#GlJournal loop. Commented GlJournalTrialBalance is not called. |
| AC-14 Budget revisions and commitments | service type | `ironstone.accounting.BudgetServices`; proposed `BudgetControlPolicy` and source-linked commitment records alongside existing BudgetRevision/Review | Budgets; Purchasing; expenses | Keep GL-account/period budget; immutable approved revisions. Warn/Stop by request/PO/expense stage, lock remaining amount at approval, convert/release commitments without double counting actuals; record override. |
| AC-15 Electronic invoice exchange | data model | Proposed `mantle.account.invoice.InvoiceExchange`; `ExchangeServices` over InvoiceSystemMessage and framework protocol adapters | ElectronicInvoices; inbound bills | Versioned payload/format/provider/status and external reference, validation/acknowledgement history, idempotent submit/poll, correction by revision. Jurisdiction/provider adapters are later, separately validated. Missing X12 component not assumed. |
| AC-16 Rates, revaluation and deferral | service type | `CurrencyServices`, `PeriodRunServices`; proposed deferral schedule/result alongside AccountingPeriodRun | Currencies / AdvancedPeriodRun | Use active UomConversion effective dates and persist exact rate/source; reviewed external-rate fetch. Approved FX/deferral preview posts once with source allocation and optional dated reversal. Financial calculation uses decimals; no silent float-rounding drift. |
| AC-17 Advanced finance models | data model | Proposed `AccountingLease`, `RevenueSchedule`, `IntercompanyBatch` and versioned schedule/entry children; `LeaseServices`, `RecognitionServices`, `IntercompanyServices` | Later leases, recognition and intercompany | Lease terms/rate/policy and liability/amortization schedule; obligation-based recognition allocations; paired organization entries with both permissions/periods. Shared AccountingPeriodRun stores posted results. Consolidation/report adjustments leave local books intact. |
| AC-18 Providers, output and import review | shell item | Accounting palette/quick-create/Today/approval providers; `DocumentServices` and import adapters using existing render/delivery primitives | All named shell sources and outputs | Names/record context from §1.3; localized print templates; approved scheduled sends; batch status and row error downloads. Inspect current framework upload/print capabilities before adding widgets. No new general protocol client belongs in BOSS. |

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
shortcut for rewriting historical issue/receipt cost. The exact standard/actual/COGS policy
selected for an organization is shown in setup and every valuation preview.

## 19. Decided

| Decision | Notes |
| --- | --- |
| Full research scope, phased | First release includes parity plus tax, matching, payment-run, close and credit controls needed for complete business flows. Advanced FX/deferrals, leases, recognition, intercompany/consolidation and e-invoicing are designed as later screens. |
| Mantle journal semantics retained | GlJournal is a posting batch. Sales/purchase/cash/bank views use document types, transaction types and bank accounts; no second Odoo-style book record is introduced. |
| Shared invoice/online payment | Crosscut owns internal InvoiceDetail with AP/AR/Projects contexts. Accounting owns one InvoicePay page that Commerce can mount; common external capabilities replace separate portal implementations. |
| Shared settings access | Authorized finance users edit common tax, terms and method records here; store bindings can be included in Commerce; executable gateway settings/secrets remain Admin-restricted. |
| Local rates plus external gateways | Refine and activate a corrected TaxAuthorityRate model and implement local/invoice tax; external gateway interface remains supported. The legacy commented definition and stubs are not working functionality. |
| Customer credit model | CustomerCreditPolicy per customer/organization/currency, edited on Customer360; order hold appears on OrderDetail and Approvals. BillingAccount retains its narrower account-limit meaning. |
| Collections model | Existing activities on the customer plus small promise/dunning records; no second case system. Disputes can link existing Requests. |
| Reconciliation model | Session over PaymentMethodTrans; preserve existing import/match services and record reopened statement history. GlReconciliation is not the bank replacement. |
| Posting locks | New typed lock/exception records supplement TimePeriod.isClosed. No soft exception bypasses a hard closed period. |
| Fixed-asset ownership | One Asset record, financial Book tab and Accounting list. Other apps receive permitted summaries; capitalization, disposal, value adjustment and depreciation require finance capabilities. |
| Posted transaction corrections | Baseline unrestricted UpdateAcctgTransPosted/unpost amount editing is replaced by immutable posted view, audited metadata correction, and linked reversal/new entry. Draft deletion and movement remain. |
| Invoice balances | Partly paid/overdue are derived; gateway return URLs or manual status editing never settle an invoice. Existing AR/AP status IDs are preserved behind guarded transitions. |
| Stock and financial facts remain distinct | Invoice/match screens do not create fictional receipt quantities; return receipt and credit/refund have separate recorded outcomes. |
| Payroll/time and expenses | People/Projects capture and approve; Accounting codes, posts and pays approved source invoices. Existing time locks and Project billing context are preserved. |
| No duplicate master models | Party contacts, ProductPrice, Asset, invoice/payment applications, WorkEffort activities and UomConversion are reused; proposed needs are limited to missing workflows and controls. |
| Current service truth wins | Commented GlJournalTrialBalance is excluded despite its inventory row. Tax-rate/cost comments are proposals to refine. Actual active names are checked before implementation. |
| Baseline forms covered | §16 maps all Accounting forms including report variants and lower-volume financial-account/bank controls; no unexplained parity deletion. Generic report options consolidate old launch forms into their named report. |
| Documents remain drafts | This is a reviewed-for-consistency design draft, with additive Designed-in mappings only; no implementation status claim. |

## 20. Open

- **Country/book policy packs.** Recommended: activate local jurisdiction and accounting-policy
  adapters separately, each with versioned output and acceptance cases. The generic authority,
  statement and exchange screens remain as designed; no country-specific compliance claim is
  made by the base app.
- **Advanced finance implementation order.** Recommended: FX revaluation and simple deferrals
  before leases, recognition and intercompany/consolidation; retain the common reviewed
  AccountingPeriodRun contract so these later areas do not fork posting controls.
- **Statement formats beyond BAI2/OFX/CSV.** Recommended: add a bank-specific adapter only when a
  deployment needs it, preserving import identity and line-level error reporting. Live feeds
  are integrations, not a prerequisite for the designed bank workflows.
