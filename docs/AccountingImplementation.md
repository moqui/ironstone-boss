# Accounting P0–P3

The Accounting app uses permission-derived native services in mr-mantle. BOSS owns its access context, routes,
choices, Home and forms. It adds no financial pass-through service. Later workflow sections are hidden until their
implemented destinations exist. The full invoice/bill/payment workflows remain P4–P5; close execution is P11,
activation P19, and foreign-currency posting/provider refresh P20.

## Routes and users

| Area | Implemented destinations |
| --- | --- |
| Foundation | Home; Receivables/Invoices and InvoiceDetail; Payables/Bills and BillDetail; Payments/Payments and PaymentDetail; QuickCreate/NewInvoice, NewBill, NewPayment and NewEntry |
| Ledger | GeneralLedger/ChartOfAccounts, AccountDetail, JournalEntries, JournalEntryDetail, TransactionEntries, JournalBatches and JournalTemplates |
| Periods | PeriodClose/Periods and PeriodLocks |
| Reports | Reports/Reports, TrialBalance and GeneralLedger |
| Settings | Settings/Settings, AccountingPreferences, PostingDefaults, PaymentTerms, Currencies, PaymentMethods and DocumentSettings |

All routes are under `/qapps/Accounting`. Record routes take `recordId`; reads, mutations, search choices, exports,
record links and files validate their organizations and records on the server. Report navigation and print URLs
retain organization, date/period, currency and dimension filters. Safe response maps render dates explicitly through the user locale, and document views include currency-aware totals. Lists use mobile columns; reports offer saved
finds, comparison dates, CSV/XLSX and html-print.

Demo users are `finance.ar`, `finance.ap`, `finance.match`, `finance.treasury`, `finance.gl`, `finance.tax`,
`finance.read`, `finance.approve` and `finance.admin` (demo password `moqui`). The reader has no other business
launcher. Their composed grants are in BossAccountingSetupData; no finance role gets GL_POST_CLOSED, raw REST
mutation authorization, unpost, unrestricted posted rewrites or bulk historical repost authorization. Organization
membership follows Mantle's existing direct-child organization rule; active scope narrows it. Administration can
select an internal organization, and private-contact filters still apply.

Deterministic fixtures use ORG_ZIZI_CORP and BOSS_ACCT_INVOICE/BILL/PAYMENT/ENTRY/POSTED. The organization explicitly
enables the guard, required dimensions and forward issuance adjustment. Native defaults remain N. A demo item and
unassigned expense account support the setup repair walk; the revaluation offset maps to BOSS_INVENTORY_REVALUATION.

## Native contracts

| Native service family | Responsibility |
| --- | --- |
| AccountingServices / AccountingPolicy | Capabilities, scope, record and child checks, safe account projections, lists, draft documents |
| JournalServices | Draft headers/lines, genuine draft-line moves, description-only posted correction with reason, previews, reviewed posting/reversal, independent batches and versioned templates |
| LedgerServices / PostingGuard | Native posting choke point, organization/source/account/date/currency/balance checks, fiscal parents, typed locks, required/supplied dimensions and operation identity |
| CloseServices | Audited organization lock dates; named user/group, scope, transaction and expiry exceptions to a specific soft lock |
| AccountServices | Account metadata, assignments/dates/dimension requirements, classifications and fiscal-period generation |
| FinanceReportServices | Currency-separated trial balance/ledger, stored closed-period summaries, live open-period entries and comparison calculations |
| SetupServices | Readiness, posted-basis protection, mapping validation/repair, clone conflict preview/concurrency, due terms and masked method metadata |
| CurrencyServices | Explicit dated manual rates and independent CSV rows with persisted source/import results |
| JournalContentServices | Authorized journal evidence upload and RecordFiles ownership |

New financial services check permissions and organization scope even when artifact authorization is disabled.
Journal previews expire after ten minutes; their fingerprints include authoritative source headers, transaction and
lines, accounts/assignments, relevant configuration, periods, locks and exceptions. Posting rechecks under lock.
External operation keys are at most 40 characters, matching the existing PostingOperation schema; internal batch
and source keys are deterministic bounded hashes. Identical retries return the recorded result; changed reuse is
refused. A reversal links its original only after successful posting, and a failed reversal rolls back atomically.

`verifyOnly` performs reads only: no period creation, transaction updates, summary updates or operation records.
Direct financial failures are refused with stable reason codes and preview findings. Adopted operational stock and
financial-account failures stay unposted in the configured error journal with a recorded failure; missing mappings
never produce AtrSuccess. Legacy callers keep their defaults. Forward issuance adjustments are opt-in and preserve
historical posted movements, including dates already protected by a hard lock.

Each batch transaction validates and posts in its own transaction. Named failures do not stop independent items;
partially successful batches remain open. Published template versions are immutable, and an effective publication
instantiates an independent draft with its source version. Required dimensions are per organization/account;
supplied facilities and cost centres are checked even when they are optional. New journal, template and draft payment amounts round to their currency.

## Configuration boundaries

PostingDefaults covers account assignments, GL types, item types/directions, invoice types, payment types,
instruments, asset/type/class, financial account type/reason, variance, product, category and party defaults. For
invoice product lines the existing resolver checks category, product and asset-type profit/receipt accounts before
item defaults. Organization configuration includes its accounting parents. Missing generic item defaults are
identified using that resolver, alongside missing GL types and the scoped error journal. ChartOfAccounts can
assign an existing global chart account; account reads never include another organization's balances.

Preferences and clone application refuse routine changes to the currency, fiscal or costing basis of posted
history. Clone previews preserve destination conflicts, name mappings incompatible with the destination, and reject stale inputs. Mantle's invoice/order numbering
fields remain authoritative; issued identities are not rewritten. Terms are due-only. Currency rates are dated,
positive and source-labelled; malformed independent CSV rows are retained as failures while valid rows commit.

PaymentGatewayOrganization records are provisioned outside finance forms in Admin. Only active organization
bindings are offered for a new method binding. Finance sees gateway IDs/descriptions and masked identifiers, never
credentials or executable service names. The demo organization permits TEST_APPROVE and TEST_DECLINE. Approved
standard document layouts have representative long previews; the shared HTML viewer retains its script sandbox.
PASS runtime changes and a durable pending-provider fixture remain P18, as documented in mr-pass/design-forum.

## Verification

Tests run through Moqui's JavaScript runners, without Node as a test dependency. The development binary was rebuilt
before browser verification. Full suite results and baseline comparison are recorded here after the final run:

- Full BOSS: 1,038 features — 1,033 passed, zero failed, five skipped.
- Full standalone Mantle: 863 features — 842 passed, four unchanged baseline failures, 17 skipped.
- Focused native controls, reports, the original 18-check ledger baseline, standard costs/revaluation and Projects billing: 82/82 passed with Chrome configured.
- The full BOSS suite includes Accounting access, roles, isolation, AppStructure, ClientWrites, QVT/TUI routes and a dedicated timestamp/calendar-date projection regression.
- Accounting browser walks and viewport/theme captures: 188/188 passed (31 destinations × six width/theme combinations, plus posting/reversal and setup repair).
- XML: 46 Accounting screens (including the app root) validate. Screen lint writes to `/tmp/accounting-screen-lint.txt`, with zero parse failures and the existing 125 flagged sites; no new Accounting hazard. Screen sources are never lint output targets.

The four standalone Mantle failures reproduce on archived unchanged commit b48e696c: InboxThreads, MantleSearch,
WorkTimeEntries and WorkTimesheets. They are recorded independently of Accounting's passing tests. Standalone
Mantle excludes BOSS demo adoption; running legacy low-level posting specs against an adopted demo organization
would test a different policy. No ADMIN posting exemption was introduced.

Reproduce the native run with MOQUI_RUNTIME pointing to a temporary runtime whose component directory contains
only mr-mantle (and whose base-component/conf point to the workspace runtime), then:

```sh
pdf_chromium_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' ./moq test --nobuild mr-mantle
pdf_chromium_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' ./moq test --nobuild mr-boss
./moq test-client --nobuild mr-boss --serve --spec AccountingShots,AccountingLedgerWalk,AccountingSettingsWalk --out /tmp/accounting-browser
target/develop/moqui lint --screens /tmp/accounting-screen-lint.txt
```

The screenshot spec covers 31 destinations at 390, 1280 and 1440 pixels in light/dark. Browser walks post/reverse a
balanced journal, assign an existing expense account, repair an invoice item default, create a due term, import
valid/invalid rate rows, and save numbering preferences. Keep deterministic fixtures declared in the data file:
the client runner's snapshot key includes entity/data files and the binary, rather than service implementation text.

The existing remote-choice widget also retains selected values when parent forms rerender and a later search
page omits the selected row. Dependency changes still clear the choice. QvtKeys has a real-browser regression
for that contract (3/3 features passed); no new widget was introduced.
