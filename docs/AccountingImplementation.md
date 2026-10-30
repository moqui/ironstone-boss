# Accounting implementation

The Accounting app uses permission-derived native services in mr-mantle. BOSS owns its access context, routes,
choices, Home and forms. It adds no financial pass-through service. Later workflow sections are hidden until their
implemented destinations exist. Receivables P4, settlement P5a and payment lifecycle P5b1 are implemented and reviewed.
Gateway/refunds/transfers remain P5;
payable intake remains P6. The current execution stops after P5 with a recorded checkpoint. Close execution is P11,
activation P19, and foreign-currency posting/provider refresh P20.

## Routes and users

| Area | Implemented destinations |
| --- | --- |
| Foundation | Home; Receivables/Invoices and InvoiceDetail; Payables/Bills and BillDetail; Payments/Payments and PaymentDetail; QuickCreate/NewInvoice, NewBill, NewPayment and NewEntry |
| Receivables | Invoices list/calendar/pivot/graph; shared InvoiceDetail with ten tabs; BillingQueue; InvoiceBatch; Statements and retained StatementPrint; InvoicePrint; shared Customer360 Contact, Orders, Money, Agreements, FinanceDetails and Files |
| Settlement and payments | ReceivablesWorkbench; native payment drafts and reviewed state/application correction; PaymentDetail Overview, Applications, Gateway, Refunds, GeneralLedger, Files and History; scoped GatewayTransactions evidence and issued PaymentPrint receipt/detail/check |
| Ledger | GeneralLedger/ChartOfAccounts, AccountDetail, JournalEntries, JournalEntryDetail, TransactionEntries, JournalBatches and JournalTemplates |
| Periods | PeriodClose/Periods and PeriodLocks |
| Reports | Reports/Reports, TrialBalance and GeneralLedger |
| Settings | Settings/Settings, AccountingPreferences, PostingDefaults, PaymentTerms, Currencies, PaymentMethods and DocumentSettings |

All routes are under `/qapps/Accounting`. Record routes take `recordId`; reads, mutations, search choices, exports,
record links and files validate their organizations and records on the server. Report navigation and print URLs
retain organization, date/period, currency and dimension filters. Mantle's record reads return display text: dates in
the user's zone (`AccountingPolicy.display`), party, status and counterparty names, and a document's date, amount and
currency. Shared screen parts are in `template/AccountingParts.xml` (choices, the organization picker, find, batch
review, report options) and `template/AccountingDocuments.xml` (the invoice, bill and payment list, detail and draft).

Demo users are `finance.ar`, `finance.ap`, `finance.match`, `finance.treasury`, `finance.gl`, `finance.tax`,
`finance.read`, `finance.approve` and `finance.admin` (demo password `moqui`). The reader has no other business
launcher. Reads come from view permissions: `ACCOUNTING_VIEW` for every kind, `RECEIVABLE_VIEW`, `PAYABLE_VIEW` and
`PAYMENT_VIEW` for their kinds. An edit permission alone opens no reads, so Projects' managers, who hold
`RECEIVABLE_EDIT` for billing, do not read Accounting's records. Their composed grants are in BossAccountingSetupData; no finance role gets GL_POST_CLOSED, raw REST
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
| InvoiceServices / InvoiceWorkflow | Authorized state changes and draft edits, native source billing, financial-side credit identity and application, currency refusal and complete bounded read models |
| InvoiceDelivery / CollectionServices | Frozen PDFs and statements, authorized sender accounts, per-recipient durable results, duplicate suppression and exact operation retries |
| CustomerFinanceServices | Organization-scoped customer context with explicit field projections and permission-gated, masked finance records |

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

- Full BOSS: 1,070 features — 1,065 passed, zero failed, five skipped.
- Full standalone Mantle: 865 features — 844 passed, four unchanged baseline failures, 17 skipped.
- The full BOSS suite includes Accounting access (with paired positive and negative cases), roles, isolation,
  AppStructure, every screen in qvt and tui, and rendered-content checks of the ledger, document, report and settings
  screens.
- Accounting browser walks and viewport/theme captures: 230/230 (three users, 31 destinations × six width/theme
  combinations, plus posting/reversal and setup repair).
- XML: 46 Accounting screens (including the app root) validate. Screen lint (to a report file) has zero parse failures and the existing 125 flagged sites; no new Accounting hazard. Screen sources are never lint output targets.

The four standalone Mantle failures reproduce on archived unchanged commit b48e696c: InboxThreads, MantleSearch,
WorkTimeEntries and WorkTimesheets. They are recorded independently of Accounting's passing tests. Standalone
Mantle excludes BOSS demo adoption; running legacy low-level posting specs against an adopted demo organization
would test a different policy. No ADMIN posting exemption was introduced.

Reproduce the native run with `MOQUI_RUNTIME` pointing to a runtime whose `component` directory holds only mr-mantle
and whose `base-component` and `conf` link to the workspace's; the BOSS demo adopts the guard for ORG_ZIZI_CORP, which
the legacy Mantle specs do not expect. The PDF specs need Chromium ([Testing](../../../../docs/Testing.md)).

```sh
./moq test --nobuild mr-mantle
./moq test --nobuild mr-boss
./moq test-client --nobuild mr-boss --serve --spec AccountingShots,AccountingLedgerWalk,AccountingSettingsWalk --out <screenshot-dir>
target/develop/moqui lint --screens <report-file>
```

The screenshot spec covers 31 destinations at 390, 1280 and 1440 pixels in light/dark. Browser walks post/reverse a
balanced journal, assign an existing expense account, repair an invoice item default, create a due term, import
valid/invalid rate rows, and save numbering preferences. Keep deterministic fixtures declared in the data file:
the client runner's snapshot key includes entity/data files and the binary, rather than service implementation text.

The existing remote-choice widget also retains selected values when parent forms rerender and a later search
page omits the selected row. Dependency changes still clear the choice. QvtKeys has a real-browser regression
for that contract (3/3 features passed); no new widget was introduced.

## P4 integration contracts

The native assignment owns InvoiceWorkflowEntities, InvoiceWorkflow/Lib, ApprovedTimeBilling, InvoiceDelivery,
CustomerFinance, Statements, their service declarations/SECA and standalone specs. The application assignment owns
ReceivableServices/Receivables, the receivables template, invoice/customer tabs and the phase's walks. The coordinator
owns common policy/posting helpers, Projects adapters and shared mounts, grants, choices, demo fixtures and this
record. The independent reviewer owns central route/access/render/screenshot coverage and AccountingBookDates.
Each assignment and returned correction was inspected before coordinator acceptance. P4 gates are recorded in impl-accounting.md.

`change#InvoiceState` takes organization/invoice, action, current stamp or source fingerprint, optional operation key
and change reason. It re-reads under organization/invoice locks and returns state, stamp and source version. Issued
source postings must succeed before finalization commits. Credit operations retain the original financial side and
source revenue accounts even though legacy credit parties reverse. The Unpaid queue uses positive recorded balances
before pagination. Draft updates invalidate approvals; self approval is explicit organization policy.

`send#Invoice` takes the reviewed source identity, recipients and operation key. Its prepare transaction records
intent and exact PDF before finalization; independent recipient transactions use the existing authorized mail
client. Queued Outbox instructions retain one message identity. A repeated source/recipient is claimed once unless
an authorized resend was requested. The existing store notice skips the manually prepared version. Projects keeps
its project/client access boundary, template and detailed print; only its financial mutation calls move to Mantle.

New invoice dates capture the creator's calendar day in SQL DATE accountingDate. Adopted original postings persist
the same day at actual post, so summaries, single/bulk rebuilds, unpost/repost and reports agree across user zones.
A later reversal captures its own effective day. No posted legacy transaction is backfilled on adoption, and the raw
source timestamps are preserved. Legacy ledger input services cannot supply the derived accountingDate field.

There is no InvoiceItemBudget entity in this Mantle checkout. The invoice Budget tab honestly identifies unavailable
evidence until P15 adds commitments; existing payment budget allocations are not relabelled as invoice commitments.
Fixtures include a separate finalized receivable, a store-backed draft and approved project time belonging to the
Accounting organization. No mail or PDF is sent/generated while loading these fixtures.

The send dialog offers explicit supporting-file choices carrying their reviewed content versions. Native preparation
rechecks ownership/version/size under lock and archives exact bytes; the app never replaces a submitted version by
a fresh discovery. Durable PDFs and supporting copies are outside the mutable Records invoice folder. InvoiceContent
identity/removal/replacement guards and equivalent-URI checks apply independently of artifact authorization. The
shared Files widget respects immutable rows and native per-side edit authority; ordinary live support can change
without changing issued evidence. Issued documents remain readable through their content key.

P4 implementation/review commits: Mantle `876732f6`, `93e8fed3`; BOSS `b933118`, `907a816`.

P4 final full gates: BOSS 1,110 passed/0 failed/5 skipped; standalone Mantle 903 passed/4 established baseline failures/
17 skipped, including all 59 new native features. Final changed-surface browser and seven receivables walks 34/34;
review follow-up reran all seven walks (7/7) and Send/issued Files/prints (15/15). All route/width/theme screenshots and
returned corrections were visually reviewed. Send retains its exact reviewed financial fingerprint and selected file
versions across a legacy asynchronous status-only notice; draft/header/item/state actions retain timestamp checks.
Paired native regressions refuse changed financial content before durable output or mail. Shared Files rows pass
contrast checks in both themes after animations finish. Screen lint remains at 121 baseline
flagged sites with zero parse failures. Output finishing items F76/F77 and the remaining P5–P21 phases stay explicit
in the implementation plan.

## P5a reviewed settlement

The settlement portion is implemented and independently accepted. Payment lifecycle, gateway/refund and transfer
work remain P5b, followed by P6–P21.

P5a implementation commits: Mantle `a79012de`; BOSS `737c439`.

`PaymentServices.find#OpenItems` reads current invoice, credit and payment balances, with independent paging for four
typed lists and selected-row lookup outside search pages. Its document-through date selects eligible documents; it is
not historical Aging. `preview#Settlement` retains an owner-scoped ten-minute review with every source/target revision,
fixed book day, original posting evidence and policy. `apply#Settlement` confirms only that retained review and a
maximum-40-character operation key. Exact completed retries return their recorded result. Native auto-application
uses the same reviewed writer and oldest-due/date/ID order.

One operation locks the organization, documents, applications and original postings, checks aggregate consumption and
signed ledger backing, and posts the whole allocation/explicit-account adjustment set atomically. A direct receipt
already posted to its invoice can only restore its full available balance to that original invoice without additional
GL. Genuine unapplied cash still supports partial receipts and splits. Shared invariants guard legacy/raw writers,
backing posting changes and application deletion as well as the new services. Existing undated postings retain their
UTC timestamp basis; new SQL book days remain stable across viewers' zones. Earlier application dates refuse.

The separately adopted `settlementApplicationGuardEnabled` defaults N and is required for the new financial writer;
`paymentAutoApplicationEnabled` independently defaults N. Existing history is never backfilled. Default-off application
fields and audit behavior remain covered. Financial read authority and matching AR/AP edit authority are checked
without artifact authorization; PAYMENT_EDIT alone cannot allocate trade documents. Restricted bank/gateway data and
unauthorized ledger projections are omitted.

The Receivables workbench retains mixed/split draft rows, their original choice revisions, filters, adjustments and
review/result identity. A customer/currency/date change explicitly starts a new selection. It shows incomplete or
unavailable reads honestly. Read-only Treasury access does not grant AR editing. Dedicated settlement demo records
leave Projects and P4 customer/time fixtures intact.

Server gates: BOSS 1,122 passed/0 failed/5 skipped; standalone Mantle 999 passed/4 established baseline failures/
17 skipped. All 95 new settlement/application/posting cases pass, including real concurrency, rollback, actual
October/November movement, retained legacy dates, retry identity and raw-write refusals. The full gate also exposed
the existing variant-policy clock race, fixed separately in Mantle `8f8c06ad` with explicit backdating refusal covered.
ClientBilling's deliberately nonposted legacy fixtures explicitly use default-off behavior and restore the inherited
flag in cleanup; production guards remain intact. Screen lint has zero parse failures and the same 121 flagged sites.

Final browser gate: 37/37 passed without skips, including all four settlement walks. Independent review covered all
30 route/dialog/reader/settings screenshots, 12 retained-review/applied screenshots and six print regressions at the
required widths/themes. The mixed receipt/credit, split receipt, stale review, write-off correction, saved-result retry
and reader walks are complete. The test-only default theme fixture uses local styles/font fallback so external font
DNS cannot stall the browser. Computed preview submission bypasses saved failed-form fields, and selection links
explicitly clear retained review IDs without refreshing selected revisions.

XML artifacts are well-formed; the new entities, EECAs, services and workbench validate against the local schemas.
The system validator requires a disposable schema copy removing two existing unnecessary dollar escapes. The
preferences screen's existing box-header schema mismatch is reproduced at P4 HEAD; runtime/TUI/browser rendering
remains covered. No repository schema was changed for this verification.

## Payment lifecycle P5b1 acceptance

Implementation commits: Mantle `ea31a0aa`; BOSS `59a4060`. The coordinator and independent reviewer accepted both
assignments after the final full suites, seven walks and visual review.

Native payment reads and drafts retain actual currency, SQL day, source/method revisions and masked identities.
Validate, manual delivery, settlement confirmation, cancellation, void and selected application release use retained
reviews and exact operation keys. Ordinary application reversal restores only the selected money. Direct-to-invoice
cash correction requires the whole direct set and creates its exact unapplied replacement; void reverses applications
before cash. Original closed history refuses, and same-key concurrency returns the same actual records.

Receipt/detail/check issuance is atomic with delivery. Check numbers are reserved once; outputs and selected evidence
are immutable at the actual resource/file/history/blob layer. Generic drive/search/share and cross-record pointers
cannot expose the private archive. Treasury-only checks are omitted before shared Files count/paging, including with
artifact authorization disabled. Supporting files keep their authorized upload/read/remove behavior.

PaymentValidation uses native event-bound durable publication with independently authorized recipients, stable retry
identity, guarded approve/refuse and retirement after edits/decisions. BOSS provides its record link and presentation.
The lifecycle and content guards remain native; no BOSS financial writer was introduced.

Full server gates: BOSS 1,145 passed/0 failed/5 skipped (1,150 features, 110 specs); standalone Mantle 1,074 passed/
the same four baseline failures/17 skipped (1,095 features, 117 specs). The 75 new native cases include original-day
corrections, permission pairs, raw writes, actual concurrency, exact retry, immutable bytes and notification workers.
First-reference archive races pass with the shared lock; removing that lock alone makes both cases fail through
actual corruption. The original runtime guard was restored exactly after this disposable control.

Changed XML validates; screen lint scans 1,124 files/24,666 sites with zero parse failures and the same 121 flagged
sites. Framework resource-exclusion checks pass 4/4. PDF initialization is installed during data loading; develop build,
host lint and lint-min pass. The host's component-template /tmp path and search `crim~` failures reproduce without the
PDF change. Framework commits are `e9ee50fb` and `d7235859`.

All 144 original route/dialog/theme captures, 84 refreshed form/role captures and actual check-frame bounds have
passed independent visual review. Receipt and application review/completed states also retain actual native results.
Final payment walks pass 7/7 without skips, including same-revision input/evidence preservation, a successful own edit
receiving a fresh review version, and unchanged refusal after another page edits the record. The consuming getter runs
only after a successful native save; failed saves and native revision validation remain intact. All 24 retained review/
completed variants and unapplication/void results passed independent visual review. Three unchanged print features
also pass. Gateway/provider refunds and transfers remain
unavailable until the separately reviewed P5b2/P5b3 deliveries. Execution pauses after P5, before P6.

## Reviewed provider operations P5b2a

Native implementation commit: Mantle `5c24c2fa`. Native, app and coordinator assignments passed independent review
and final coordinator acceptance; bounded app commits are recorded in the implementation plan.

Mantle owns retained authorization/capture/release reviews, durable provider attempts and reservations, exact lookup
and financial-only recovery. BOSS presents explicit SQL day/amount/currency, immutable selected identity tokens,
separate provider/local outcomes and actual cash-child/output links. Parent authorization amounts never appear as
delivered cash or available settlement balances. Treasury investigation stays scoped and paged; AR cannot see its
provider controls or evidence. Unsupported adapters remain unavailable; gateway adoption defaults off and requires
settlement controls.

The final full BOSS gate passes 1,162/0/5 (1,167 features, 112 specs), including unchanged Projects, Products and legacy
flows. Standalone Mantle has 1,139
passes, only its same four reproduced baseline failures and 17 skips (1,160 features, 130 specs); all 65 new cases pass.
Thirty actual gateway state/review/attempt renders pass in QVT/TUI/HTML, including error-content detection, Treasury
versus AR controls and selected choices outside the filtered page. All six financial walks pass without skips,
including actual partial cash/output ownership, remaining release, pending/uncertain lookup and original-day recovery.
All 72 route/dialog/theme screenshot cases pass at 390/1280/1440. Those captures, 24 retained review/result variants
and actual receipt passed independent visual review. The corrected phone table fits its 359 px container, actual
amounts and both outcome chips remain visible, and 18 selected-attempt block-link hit checks pass before normal clicks.
Empty generic Change grids are omitted while actual B1 effects remain. Final browser acceptance is 78/78 without skips.

Financial fixture corruption/cleanup now uses transactional generic writes so the new shared Payment locks cover
it. Assertions and default-off business flows are retained. The first ClientBilling cleanup abort explained all seven
later health/hours/timer failures; the corrected full run passes. Two isolated fresh-load Code assertions also
reproduce at accepted P5b1 commits, while the final full BOSS run passes all eight Code cases; no Accounting exception
or Git reset was added. Changed XML validates apart from the already reproduced preferences box schema mismatch.
Screen lint scans 1,124 files/24,858 sites with zero parse failures and the same 121 flagged sites. New native XML uses canonical four-space
formatting; unrelated legacy service formatting is retained. No Node test dependency was introduced.
