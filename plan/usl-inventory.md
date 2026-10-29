# mr-mantle service inventory

Per-service inventory of the mr-mantle component, for tracking service-level feature parity in IronStone BOSS.

- Source: `runtime/component/mr-mantle/service/` (current working tree).
- Service: every `<service>` element in the service definition XML files under `service/mantle/` (including `GeneralServices.xml`).
- Test services (`PaymentTestServices.xml`, `OrderTestServices.xml`), service ECAs (`*.secas.xml`), and the REST API definition (`mantle.rest.xml`) are excluded.
- The **Designed in** column is filled when a design file is reviewed with the IronStone screen path(s) whose form summaries call the service (blank when no screen calls it); the **Implemented in** column is filled during implementation with the screens that call it. See [design-doc-guide.md](design-doc-guide.md) §9.
- **Implemented in** was filled on Oct 19, 2026 from the drawers-commons build (the Commons, Comms, `Shared`, `PublicShare` and `Unsubscribe` screens): each screen whose transitions, actions or forms call the service, directly or through the `ironstone.*` services of `service/ironstone/` (followed from one to the next, but not into Mantle's own calls, so `save#*ContentFile`, which `create#*Content` calls, stays blank). A screen that includes a `template/` record (ContactRecord, ConsentRecord) has that record's calls, so the contact record's are on both `Commons/Contacts/ContactDetail` and `Commons/Contacts/List`; a `.qvue` screen goes by its `.xml` path; a service the shell calls through a BOSS theme value names the value, and `Unsubscribe` includes its token route's check. The other apps' screens from the first port (Sales/Reports, Projects/Timesheets) are not counted.
- **Added** tables, at the end of Party, Request and Work and as the Marketing section: the services Mantle gained during that build that a built screen calls (102 of the 143 new ones; the rest are not listed yet).
- **Implemented in** of the design gaps closed on Oct 19, 2026 (Chatter edit and delete, the contact info card, EventDetail's linked records, the Account photo, Duplicate page): `update#RequestComment` and `delete#RequestComment` are reached from Chatter through Mantle's `update#RecordNote` and `delete#RecordNote` for a note on a request, and are filled with `Shared/Chatter`, which edits and deletes notes on every record (the Commons hosts, RequestDetail among them). Their **Designed in** is blank until design-drawers-commons, which names most of them in its form summaries and §19, is reviewed again.
- **Designed in** for [design-projects.md](design-projects.md) was filled on Oct 21, 2026 from the Mantle services its screen sections name (the form summaries, the actions and the Context passed blocks), each screen by the path the design gives it, after what an earlier design wrote; the `Projects` root calls `setup#UserOrganizationInfo` as the Commons and Comms roots do. Services the design names as new are not rows until Mantle has them. The 17 services of `work/GitServices.xml`, added to Mantle on Oct 20, joined the Work table (no BOSS screen calls them yet), and `link#RequestRecord` and `unlink#RequestRecord`, added after the drawers-commons save point, joined Request's Added table with the Commons screens that call them.
- **Implemented in** for [design-projects.md](design-projects.md) was filled on Oct 22, 2026 at the end of the Projects build (impl-projects.md P11), as the drawers-commons pass was: each Projects screen whose transitions, actions or forms call the service, directly or through the `ironstone.*` services (followed from one to the next, not into Mantle's own calls), after what Commons wrote. A `.qvue` screen and its terminal twin go by the `.xml` path (`Projects/Time/MyTime` for MyTimeTui too); the shared screens by their Projects mount (`Projects/WorkItems/WorkItemDetail`, `Projects/Requests/RequestDetail`, `Projects/Billing/InvoiceDetail`, `Projects/Billing/OrderDetail`); Commons' Knowledge and KnowledgeTui by the Docs tab (`Projects/Projects/ProjectDetail/Docs`); the root's always-actions as `Projects`; the public request form as `RequestIntake`. A service reached from more than twelve Projects screens (the visibility and settings reads behind the access and find services) is written as a count. 68 rows filled; the **Added in the Projects build** tables at the end of Account, Party, Request and Work hold the 112 services Mantle gained in P1–P10 that a built screen calls (their **Designed in** is blank: the design names them as new, §15).
- **Designed in** for the six core app drafts and [design-crosscut.md](design-crosscut.md) was extended on Oct 27, 2026 from their form/service coverage review. New mappings are additive to Commons and Projects; **Implemented in** is unchanged. Proposed services and definitions inside XML comments are not counted as active existing services.
- **Designed in** for the six core designs and [design-crosscut.md](design-crosscut.md) was updated on Oct 28, 2026 after their review ([review-core-apps.md](review-core-apps.md)). Paths of renamed or moved screens are replaced in place. Entries were added for existing services the reviewed designs now call from a screen (the Manufacturing MaterialIssueReceipt mount, Downtime and NewWorkOrder; Warehouse SupplierReturnShipment and Ship; Accounting InventoryValuation and SalesAnalysis; the OrderDetail approve guard's `check#OrderPreApprove`; Products VariantBuilder). `modify#ProductPrice` no longer lists SupplierPrices: it is the price resolver's modifier interface, and writes go through the proposed `store#ProductPrice` (R-PUR-04). Services that only rules or other services call (`create#PurchaseShipmentInvoices`, `create#ProductionRun`, `reserve#IncreasedAsset`, `post#AssetReceipt`, and similar) stay blank. **Implemented in** is unchanged.

- **PASS design follow-up (Oct 27, 2026):** [design-forum.md](../../mr-pass/plan/design-forum.md) adds `PASS:`-prefixed contexts for existing Mailbox/Communication services used through the proposed public facade and shared-policy extensions. Implemented in is unchanged. Proposed PASS services and future Commerce/Publishing screens are not inventory claims.

## Account (162 services)

| Service XML | Service | Designed in | Implemented in |
| --- | --- | --- | --- |
| BaiServices | upload#BaiVersion2 | Accounting/Banking/StatementImport |  |
| BaiServices | consume#Bai2SystemMessage |  |  |
| BaiServices | import#BaiVersion2 |  |  |
| FinancialAccountServices | get#StatementPrintInfo | Accounting/Banking/FinancialAccountDetail |  |
| FinancialAccountServices | create#FinancialAccount | Accounting/Banking/FinancialAccounts |  |
| FinancialAccountServices | update#FinancialAccount | Accounting/Banking/FinancialAccountDetail |  |
| FinancialAccountServices | getOrCreate#FinancialAccount |  |  |
| FinancialAccountServices | calculate#FinancialAccountTotals |  |  |
| FinancialAccountServices | adjust#FinancialAccount | Accounting/Banking/FinancialAccountDetail |  |
| FinancialAccountServices | deposit#FinancialAccount | Accounting/Banking/FinancialAccountDetail |  |
| FinancialAccountServices | withdraw#FinancialAccount | Accounting/Banking/FinancialAccountDetail |  |
| FinancialAccountServices | transfer#FinancialAccount | Accounting/Banking/FinancialAccountDetail |  |
| FinancialAccountServices | reverse#FinancialAccountTrans | Accounting/Banking/FinancialAccountDetail |  |
| FinancialAccountServices | authorize#FinancialAccount |  |  |
| FinancialAccountServices | expire#FinancialAccountAuth |  |  |
| FinancialAccountServices | disburse#FinancialAccount |  |  |
| FinancialAccountServices | replenish#FinancialAccount |  |  |
| FinancialAccountServices | checkCreate#InvoiceTransactions |  |  |
| FinancialAccountServices | checkCreate#InvoiceItemTrans |  |  |
| FinancialAccountServices | reverse#InvoiceTransactions |  |  |
| FinancialAccountServices | checkCreate#PaymentTrans |  |  |
| FinancialAccountServices | reverse#PaymentTrans |  |  |
| FinancialAccountServices | authorize#FinancialAccountPayment |  |  |
| FinancialAccountServices | capture#FinancialAccountPayment |  |  |
| FinancialAccountServices | release#FinancialAccountPayment |  |  |
| FinancialAccountServices | refund#FinancialAccountPayment |  |  |
| InvoiceServices | get#InvoiceBasicInfo |  |  |
| InvoiceServices | get#InvoiceDisplayInfo | Purchasing/Bills/InvoiceDetail; Accounting/Receivables/InvoiceDetail; Shared/Customer360; Shared/Supplier360; Shared/InvoiceDetail |  |
| InvoiceServices | get#InvoiceTotal |  |  |
| InvoiceServices | update#InvoiceTotals |  |  |
| InvoiceServices | calculate#MissingInvoiceTotals |  |  |
| InvoiceServices | get#InvoicePrintInfo |  |  |
| InvoiceServices | get#ReceivableStatementInfo | Accounting/Receivables/Statements |  |
| InvoiceServices | create#Invoice | Accounting/Receivables/Invoices; Accounting/Payables/Bills |  |
| InvoiceServices | update#Invoice | Shared/InvoiceDetail | Projects/Billing/InvoiceDetail |
| InvoiceServices | update#InvoiceClosed |  |  |
| InvoiceServices | checkSet#InvoiceDueDate |  | Projects/Billing/InvoiceDetail |
| InvoiceServices | create#InvoiceItem | Shared/InvoiceDetail |  |
| InvoiceServices | update#InvoiceItem | Shared/InvoiceDetail |  |
| InvoiceServices | update#InvoiceItemClosed |  |  |
| InvoiceServices | update#InvoiceItemAdjustment | Shared/InvoiceDetail |  |
| InvoiceServices | delete#InvoiceItem | Shared/InvoiceDetail | Projects/Billing/InvoiceDetail |
| InvoiceServices | adjust#Invoice | Shared/InvoiceDetail |  |
| InvoiceServices | create#EntireOrderPartInvoice | Accounting/Records/OrderDetail |  |
| InvoiceServices | create#SalesShipmentInvoices | Accounting/Records/ShipmentDetail |  |
| InvoiceServices | create#PurchaseShipmentInvoices |  |  |
| InvoiceServices | create#ProjectExpenseInvoice | Accounting/Receivables/BillingQueue |  |
| InvoiceServices | create#ProjectInvoiceItems | Projects/Time/MyTime; Projects/Billing/Unbilled; Accounting/Receivables/BillingQueue | Projects/Billing/Unbilled/CreateInvoice |
| InvoiceServices | create#WorkerInvoiceItems | Projects/Billing/Unbilled; Accounting/Receivables/BillingQueue |  |
| InvoiceServices | create#TimeEntryInvoiceItems | Accounting/Receivables/BillingQueue |  |
| InvoiceServices | create#InvoiceBillThroughItems |  |  |
| InvoiceServices | create#InvoiceCreditMemo | Shared/InvoiceDetail; Shared/ReturnDetail |  |
| InvoiceServices | reverse#Invoice | Shared/InvoiceDetail |  |
| InvoiceServices | cancel#Invoice | Projects/Billing/InvoiceDetail; Shared/InvoiceDetail |  |
| InvoiceServices | cancel#InvoiceAndPayments |  |  |
| InvoiceServices | unpay#Invoice |  |  |
| InvoiceServices | autoApplyTo#Invoice | Shared/InvoiceDetail |  |
| InvoiceServices | create#InvoiceItemDetail | Shared/InvoiceDetail |  |
| InvoiceServices | distribute#InvoiceItemDetail | Shared/InvoiceDetail |  |
| InvoiceServices | apply#InvoiceToOrder | Purchasing/Bills/InvoiceDetail; Shared/InvoiceDetail |  |
| InvoiceServices | apply#InvoiceItemToOrder | Purchasing/Bills/InvoiceDetail; Shared/InvoiceDetail |  |
| InvoiceServices | unapply#InvoiceItemFromOrder | Shared/InvoiceDetail |  |
| InvoiceServices | apply#InvoiceToShipment | Purchasing/Bills/InvoiceDetail; Shared/InvoiceDetail |  |
| InvoiceServices | apply#InvoiceItemToShipment | Shared/InvoiceDetail |  |
| InvoiceServices | unapply#InvoiceItemFromShipment | Shared/InvoiceDetail |  |
| InvoiceServices | check#InvoicesPaid |  |  |
| InvoiceServices | find#InvoiceProductStores |  |  |
| InvoiceServices | send#InvoiceStoreEmail | Shared/InvoiceDetail |  |
| InvoiceServices | send#SalesInvoicePastDueEmails | Shared/InvoiceDetail |  |
| InvoiceServices | send#CustomerPastDueEmail | Accounting/Receivables/Dunning |  |
| InvoiceServices | get#InvoiceContentLocation |  |  |
| InvoiceServices | create#InvoiceContent | Shared/RecordFiles; Shared/InvoiceDetail | Shared/RecordFiles |
| InvoiceServices | update#InvoiceContent | Shared/InvoiceDetail |  |
| InvoiceServices | save#InvoiceContentFile | Shared/RecordFiles |  |
| NachaServices | generate#NachaFile | Accounting/Payables/PaymentRunDetail |  |
| NachaServices | consume#NachaReturnSystemMessage |  |  |
| NachaServices | import#NachaReturn | Accounting/Payables/PaymentRunDetail |  |
| OfxServices | upload#OfxVersion1 | Accounting/Banking/StatementImport |  |
| OfxServices | consume#OfxV1SystemMessage |  |  |
| OfxServices | import#OfxVersion1 |  |  |
| PaymentMethodServices | get#PartyPaymentMethodInfo | Accounting/Banking/BankAccounts; Accounting/Banking/BankAccountDetail; Accounting/Settings/PaymentMethods |  |
| PaymentMethodServices | get#PartyPaymentMethodInfoList | Accounting/Banking/BankAccounts; Accounting/Settings/PaymentMethods |  |
| PaymentMethodServices | store#PaymentMethodInfo | Accounting/Settings/PaymentMethods |  |
| PaymentMethodServices | update#PaymentMethodMutable | Accounting/Settings/PaymentMethods |  |
| PaymentMethodServices | delete#PaymentMethod |  |  |
| PaymentMethodServices | checkDelete#PaymentPaymentMethods |  |  |
| PaymentMethodServices | expunge#PaymentMethod |  |  |
| PaymentMethodServices | create#CreditCard |  |  |
| PaymentMethodServices | update#CreditCard |  |  |
| PaymentMethodServices | create#BankAccount | Accounting/Banking/BankAccounts |  |
| PaymentMethodServices | update#BankAccount | Accounting/Banking/BankAccountDetail |  |
| PaymentMethodServices | update#BankAccountMutable | Accounting/Banking/BankAccountDetail |  |
| PaymentMethodServices | get#PaymentMethodContentLocation |  |  |
| PaymentMethodServices | create#PaymentMethodContent | Shared/RecordFiles | Shared/RecordFiles |
| PaymentMethodServices | update#PaymentMethodContent |  |  |
| PaymentMethodServices | save#PaymentMethodContentFile | Shared/RecordFiles |  |
| PaymentMethodServices | update#PaymentMethodFileComplete | Accounting/Banking/BankAccountDetail |  |
| PaymentMethodServices | cancel#PaymentMethodFile | Accounting/Banking/BankAccountDetail |  |
| PaymentMethodServices | produce#PaymentMethodFileSystemMessage | Accounting/Banking/BankAccountDetail |  |
| PaymentServices | get#PaymentDisplayInfo | Accounting/Payments/PaymentDetail; Shared/Customer360; Shared/Supplier360 |  |
| PaymentServices | get#PaymentDescription |  |  |
| PaymentServices | get#PaymentTotals |  |  |
| PaymentServices | update#PaymentTotals |  |  |
| PaymentServices | calculate#MissingPaymentTotals |  |  |
| PaymentServices | assign#BankAccountCheckNumber | Accounting/Payables/PaymentRunDetail |  |
| PaymentServices | set#PaymentDate | Accounting/Payments/PaymentDetail |  |
| PaymentServices | get#PaymentCheckInfo |  |  |
| PaymentServices | create#Payment | Accounting/Payments/Payments; Accounting/Payments/PaymentDetail |  |
| PaymentServices | set#PaymentAutoInfo |  |  |
| PaymentServices | create#InvoicePayment | Shared/InvoiceDetail |  |
| PaymentServices | create#RefundPayment | Accounting/Payments/PaymentDetail; Shared/ReturnDetail |  |
| PaymentServices | set#PaymentRefundFor | Accounting/Payments/PaymentDetail |  |
| PaymentServices | send#PromisedPayment |  |  |
| PaymentServices | check#InvoiceStatusForPayment |  |  |
| PaymentServices | update#Payment | Accounting/Payments/PaymentDetail; Shared/OrderDetail |  |
| PaymentServices | apply#InvoicePayment | Accounting/Receivables/ReceivablesWorkbench; Accounting/Payments/PaymentDetail; Shared/InvoiceDetail |  |
| PaymentServices | apply#PaymentForInvoice |  |  |
| PaymentServices | apply#InvoiceForPayments |  |  |
| PaymentServices | apply#OrderPaymentsToInvoice |  |  |
| PaymentServices | apply#PaymentToPayment | Accounting/Receivables/ReceivablesWorkbench; Accounting/Payments/PaymentDetail |  |
| PaymentServices | apply#InvoiceToInvoice | Accounting/Receivables/InvoiceDetail; Accounting/Receivables/ReceivablesWorkbench; Accounting/Payables/PayablesWorkbench; Accounting/Payments/PaymentDetail; Shared/InvoiceDetail |  |
| PaymentServices | cancel#PaymentAndInvoices |  |  |
| PaymentServices | void#Payment | Accounting/Payments/PaymentDetail |  |
| PaymentServices | unapply#PaymentApplication | Accounting/Receivables/ReceivablesWorkbench; Accounting/Payables/PayablesWorkbench; Accounting/Payments/PaymentDetail; Shared/InvoiceDetail |  |
| PaymentServices | autoApply#Payment | Accounting/Payments/PaymentDetail |  |
| PaymentServices | authorize#Payment | Accounting/Payments/PaymentDetail |  |
| PaymentServices | capture#Payment | Accounting/Payments/PaymentDetail |  |
| PaymentServices | release#Payment | Accounting/Payments/PaymentDetail |  |
| PaymentServices | refund#Payment | Accounting/Payments/PaymentDetail |  |
| PaymentServices | get#PaymentGatewayDetails | Accounting/Payments/PaymentDetail; Accounting/Payments/GatewayTransactions |  |
| PaymentServices | authorize#OrderPayments | Shared/OrderDetail |  |
| PaymentServices | authorize#StorePayment |  |  |
| PaymentServices | authorize#SinglePayment |  |  |
| PaymentServices | get#AuthorizePaymentGatewayResponse |  |  |
| PaymentServices | capture#InvoicePayments |  |  |
| PaymentServices | capture#AppliedPayment |  |  |
| PaymentServices | capture#SinglePayment |  |  |
| PaymentServices | release#SinglePayment |  |  |
| PaymentServices | refund#SinglePayment |  |  |
| PaymentServices | get#SinglePaymentGatewayDetails |  |  |
| PaymentServices | poll#PaymentGatewayDetails | Accounting/Payments/GatewayTransactions |  |
| PaymentServices | get#PaymentContentLocation |  |  |
| PaymentServices | create#PaymentContent | Shared/RecordFiles; Accounting/Payments/PaymentDetail | Shared/RecordFiles |
| PaymentServices | update#PaymentContent | Accounting/Payments/PaymentDetail |  |
| PaymentServices | save#PaymentContentFile | Shared/RecordFiles |  |
| PositivePayServices | generate#PositivePayFile | Accounting/Payables/PaymentRunDetail |  |
| PositivePayServices | send#PositivePayJob |  |  |
| PositivePayServices | generate#PositivePayInterface |  |  |
| PositivePayServices | generate#PmftBankOfAmericaAr |  |  |
| PositivePayServices | generate#PmftCityBankCnb |  |  |
| PositivePayServices | generate#PmftSunTrustCpr |  |  |
| PositivePayServices | generate#PmftWachoviaAr |  |  |
| PositivePayServices | generate#PmftWellsFargoArp |  |  |
| PositivePayServices | generate#PmftZionsBankCsv |  |  |
| ReconciliationServices | match#PaymentMethodTransUnmatched | Accounting/Banking/ReconciliationDetail; Accounting/Banking/UnmatchedTransactions |  |
| ReconciliationServices | create#PaymentMethodTrans | Accounting/Banking/BankAccountDetail |  |
| ReconciliationServices | update#PaymentMethodTrans | Accounting/Banking/BankAccountDetail |  |
| ReconciliationServices | noReconcile#PaymentMethodTrans | Accounting/Banking/ReconciliationDetail |  |
| ReconciliationServices | create#TransPayment | Accounting/Banking/ReconciliationDetail |  |
| ReconciliationServices | reconcile#PaymentMethodTrans | Accounting/Banking/ReconciliationDetail |  |
| ReconciliationServices | unreconcile#PaymentMethodTrans | Accounting/Banking/ReconciliationDetail |  |
| ReconciliationServices | clear#PaymentTrans | Accounting/Banking/ReconciliationDetail |  |

Added in the Projects build (Oct 21–22, 2026; impl-projects.md P1–P10), called by built screens:

| Service XML | Service | Designed in | Implemented in |
| --- | --- | --- | --- |
| InvoiceServices | create#MilestoneInvoiceItems |  | Projects/Billing/Unbilled; Projects/Billing/Unbilled/CreateInvoice; Projects/Projects/MilestoneDetail |
| InvoiceServices | get#InvoiceTimeDetail | Shared/InvoiceDetail | Projects/Billing/InvoiceDetail; Projects/Billing/InvoicePrint |

## Facility (15 services)

| Service XML | Service | Designed in | Implemented in |
| --- | --- | --- | --- |
| ContactServices | get#FacilityDefaultShipDest |  |  |
| ContactServices | get#FacilityDefaultShipOrigin |  |  |
| ContactServices | get#FacilityContactInfo |  |  |
| ContactServices | update#FacilityPostalAddress |  |  |
| ContactServices | update#FacilityTelecomNumber |  |  |
| ContactServices | update#FacilityContactOther |  |  |
| ContactServices | delete#FacilityContactMech |  |  |
| FacilityServices | get#Facility | Warehouse/Locations/FacilityDetail; Shared/FacilityDetail |  |
| FacilityServices | get#FacilitiesByOwner | Warehouse/Handheld/Home; Warehouse/Locations/Facilities |  |
| FacilityServices | create#Facility | Warehouse/Locations/Facilities; Shared/FacilityDetail |  |
| FacilityServices | update#Facility | Warehouse/Locations/FacilityDetail; Shared/FacilityDetail |  |
| FacilityServices | update#FacilityCertification |  |  |
| FacilityServices | create#FacilityLocation | Warehouse/Locations/FacilityDetail; Shared/FacilityDetail |  |
| FacilityServices | create#FacilityNote | Warehouse/Locations/FacilityDetail |  |
| FacilityServices | get#ScannedIdGeneral | Warehouse/Counts/CountEntry; Warehouse/Handheld/Count; Warehouse/Handheld/Home; Warehouse/Handheld/Move; Warehouse/Home; Warehouse/Transfers/Move |  |

## HumanRes (38 services)

| Service XML | Service | Designed in | Implemented in |
| --- | --- | --- | --- |
| EmploymentServices | create#Employment |  |  |
| EmploymentServices | update#Employment |  |  |
| EmploymentServices | delete#Employment |  |  |
| EmploymentServices | create#EmploymentSalary |  |  |
| EmploymentServices | check#NextPayrollTimePeriods |  |  |
| PayrollDocumentServices | get#EmploymentInfo |  |  |
| PayrollDocumentServices | get#EmploymentWageAndTaxInfo |  |  |
| PayrollDocumentServices | create#PeriodWageAndTaxRecords |  |  |
| PayrollDocumentServices | get#UsaIrsW2FormData |  |  |
| PayrollDocumentServices | generate#Efw2File |  |  |
| PayrollDocumentServices | get#UsaIrs1099MiscFormData |  |  |
| PayrollServices | get#TimePeriodEmployments |  |  |
| PayrollServices | process#TimePeriodPay |  |  |
| PayrollServices | reopen#PayrollPeriod |  |  |
| PayrollServices | approve#PeriodInvoices |  |  |
| PayrollServices | create#PeriodPayments |  |  |
| PayrollServices | set#PeriodPaymentDates |  |  |
| PayrollServices | set#PeriodPaymentRefNums |  |  |
| PayrollServices | authorize#PeriodPayments |  |  |
| PayrollServices | deliver#PeriodPayments |  |  |
| PayrollServices | process#EmploymentPay |  |  |
| PayrollServices | get#EmploymentPayAmount |  |  |
| PayrollServices | get#TimePeriodTotalPayAmount |  |  |
| PayrollServices | get#EmploymentPayDetail |  |  |
| PayrollServices | calculate#Adjustment |  |  |
| PayrollServices | calculate#PayrollAdjustment |  |  |
| PayrollServices | create#WorkersCompRate |  |  |
| PayrollServices | delete#WorkersCompRate |  |  |
| PayrollServices | update#WorkersCompRate |  |  |
| PayrollServices | create#GarnishmentDetail |  |  |
| PayrollServices | update#GarnishmentDetail |  |  |
| PayrollServices | create#PayrollAdjustmentAndDetail |  |  |
| PayrollServices | update#PayrollAdjustmentAndDetail |  |  |
| PayrollServices | delete#PayrollAdjustmentAndDetail |  |  |
| PayrollServices | create#PayrollInvoice |  |  |
| PositionServices | get#PartyEmployersAndPositionClasses |  |  |
| RateServices | create#RateAmount | Projects/Projects/NewProject; Projects/Projects/ProjectDetail/Money; Projects/Billing/Rates | Projects/Billing/Rates; Projects/Projects/NewProject/Money |
| RateServices | update#RateAmount | Projects/Projects/ProjectDetail/Money; Projects/Billing/Rates | Projects/Billing/Rates |

## Ledger (81 services)

| Service XML | Service | Designed in | Implemented in |
| --- | --- | --- | --- |
| AssetAutoPostServices | post#AssetReceipt |  |  |
| AssetAutoPostServices | repost#AssetReceipt |  |  |
| AssetAutoPostServices | post#AssetIssuance |  |  |
| AssetAutoPostServices | revert#AssetIssuanceOnCancel |  |  |
| AssetAutoPostServices | repost#AssetIssuance |  |  |
| AssetAutoPostServices | calculate#FixedAssetDepreciation | Accounting/FixedAssets/DepreciationRunDetail |  |
| AssetAutoPostServices | post#FixedAssetDepreciation | Accounting/FixedAssets/DepreciationRunDetail |  |
| AssetAutoPostServices | calculateAndPost#FixedAssetDepreciation |  |  |
| AssetAutoPostServices | calculateAndPost#AllFixedAssetDepreciations |  |  |
| AssetAutoPostServices | post#PhysicalInventoryVariance |  |  |
| AssetAutoPostServices | repost#PhysicalInventoryVariance |  |  |
| AssetAutoPostServices | get#AssetTypeGlAccount |  |  |
| AssetAutoPostServices | repost#Asset |  |  |
| InvoiceAutoPostServices | post#Invoice | Shared/InvoiceDetail |  |
| InvoiceAutoPostServices | post#InvoiceAdjustment |  |  |
| InvoiceAutoPostServices | get#InvoicePartyAcctgPreferences |  |  |
| InvoiceAutoPostServices | get#InvoiceTypeTransType |  |  |
| InvoiceAutoPostServices | get#InvoiceItemGlAccount |  |  |
| InvoiceAutoPostServices | repost#Invoice | Shared/InvoiceDetail |  |
| InvoiceAutoPostServices | repost#InvoiceAdjustment |  |  |
| InvoiceAutoPostServices | repost#AllInvoices |  |  |
| InvoiceAutoPostServices | revert#InvoicePost |  |  |
| LedgerReportServices | get#ReportBasicInfo | Accounting/Reports/Reports |  |
| LedgerReportServices | run#IncomeStatement | Accounting/Reports/IncomeStatement |  |
| LedgerReportServices | run#BalanceSheet | Accounting/Reports/BalanceSheet |  |
| LedgerReportServices | run#CashFlowStatement | Accounting/Reports/CashFlow |  |
| LedgerReportServices | run#RetainedEarningsStatement | Accounting/Reports/RetainedEarnings |  |
| LedgerReportServices | run#FinancialRatios | Accounting/Reports/FinancialRatios |  |
| LedgerReportServices | get#GlAccountClassInfoSums |  |  |
| LedgerReportServices | get#GlAccountClassReportInfo |  |  |
| LedgerReportServices | run#PostedAmountSummary | Accounting/Reports/PostedSummary |  |
| LedgerReportServices | get#PostedAmountSummarySide |  |  |
| LedgerReportServices | get#AccountLedgerInfo | Accounting/Reports/GeneralLedger |  |
| LedgerReportServices | get#PeriodSeriesSummary | Accounting/Reports/AccountBalance |  |
| LedgerReportServices | get#PeriodSeriesSummaryRows |  |  |
| LedgerServices | create#GlAccount | Accounting/GeneralLedger/ChartOfAccounts |  |
| LedgerServices | init#PartyAccountingConfiguration | Accounting/Settings/Setup |  |
| LedgerServices | find#PartyAcctgPreference | Accounting/Settings/Settings |  |
| LedgerServices | find#RootGlAccountClassEnum |  |  |
| LedgerServices | set#GlAccountFlags | Accounting/GeneralLedger/AccountDetail |  |
| LedgerServices | set#MissingGlAccountFlags |  |  |
| LedgerServices | expand#ParentOrganizationList |  |  |
| LedgerServices | expand#ChildOrganizationList |  |  |
| LedgerServices | get#DefaultGlAccountByType | Accounting/Settings/PostingDefaults |  |
| LedgerServices | create#AcctgTrans | Accounting/GeneralLedger/JournalEntries; Accounting/GeneralLedger/JournalEntryDetail |  |
| LedgerServices | update#AcctgTrans | Accounting/GeneralLedger/JournalEntryDetail |  |
| LedgerServices | update#AcctgTransPosted |  |  |
| LedgerServices | delete#AcctgTrans | Accounting/GeneralLedger/JournalEntryDetail |  |
| LedgerServices | create#AcctgTransEntry | Accounting/GeneralLedger/JournalEntryDetail |  |
| LedgerServices | update#AcctgTransEntry | Accounting/GeneralLedger/JournalEntryDetail |  |
| LedgerServices | delete#AcctgTransEntry | Accounting/GeneralLedger/JournalEntryDetail |  |
| LedgerServices | calculate#AcctgTransTrialBalance | Accounting/GeneralLedger/JournalEntryDetail |  |
| LedgerServices | post#AcctgTrans | Accounting/GeneralLedger/JournalEntryDetail |  |
| LedgerServices | unpost#AcctgTrans |  |  |
| LedgerServices | update#GlAccountOrgSummariesForTx |  |  |
| LedgerServices | post#ReverseAcctgTrans | Accounting/GeneralLedger/JournalEntryDetail |  |
| LedgerServices | move#AcctgTransEntry | Accounting/GeneralLedger/JournalEntryDetail |  |
| LedgerServices | get#OrganizationFiscalTimePeriods | Accounting/PeriodClose/Periods; Accounting/Reports/TrialBalance |  |
| LedgerServices | check#NextFiscalTimePeriods | Accounting/PeriodClose/Periods |  |
| LedgerServices | close#FinancialTimePeriod | Accounting/PeriodClose/PeriodCloseDetail |  |
| LedgerServices | recalculate#GlAccountOrgTimePeriodAmounts | Accounting/PeriodClose/PeriodCloseDetail |  |
| LedgerServices | reopen#FinancialTimePeriod | Accounting/PeriodClose/PeriodCloseDetail |  |
| LedgerServices | create#PeriodCloseAcctgTrans | Accounting/PeriodClose/PeriodCloseDetail |  |
| LedgerServices | recalculate#GlAccountOrgSummaries |  |  |
| LedgerServices | create#GlJournal | Accounting/GeneralLedger/JournalBatches |  |
| LedgerServices | update#GlJournal | Accounting/GeneralLedger/JournalBatches |  |
| LedgerServices | calculate#GlJournalTrialBalance |  |  |
| LedgerServices | post#GlJournal |  |  |
| OtherAutoPostServices | post#WorkEffortCost |  |  |
| OtherAutoPostServices | post#FinancialAccountTrans |  |  |
| OtherAutoPostServices | get#FinancialAccountGlAccount |  |  |
| OtherAutoPostServices | get#FinancialAccountTransGlAccount |  |  |
| PaymentAutoPostServices | post#Payment | Accounting/Payments/PaymentDetail |  |
| PaymentAutoPostServices | revert#PaymentPost | Accounting/Payments/PaymentDetail |  |
| PaymentAutoPostServices | get#PaymentPartyAcctgPreferences |  |  |
| PaymentAutoPostServices | create#PaymentTypeEntry |  |  |
| PaymentAutoPostServices | get#PaymentTypeGlAccount |  |  |
| PaymentAutoPostServices | get#PaymentMethodGlAccount |  |  |
| PaymentAutoPostServices | post#PaymentApplication |  |  |
| PaymentAutoPostServices | revert#PaymentApplicationPost |  |  |
| PaymentAutoPostServices | repost#PaymentAndApplications |  |  |

## Marketing (11 services, all added)

Added in the drawers-commons build (Oct 18–19, 2026), called by built screens:

| Service XML | Service | Designed in | Implemented in |
| --- | --- | --- | --- |
| ContactListServices | get#ContactListAccess | PASS: Forum/Categories/CategoryDetail; PASS: Forum/Topics/TopicDetail | Comms/Inbox/Compose; Comms/Inbox/Mail |
| ContactListServices | create#ContactList | PASS: Forum/Settings/Categories | Comms/Inbox/Mail |
| ContactListServices | update#ContactList | PASS: Forum/Settings/Categories | Comms/Inbox/Mail |
| ContactListServices | find#ContactLists |  | Comms; Comms/Inbox/Compose; Comms/Inbox/Mail |
| ContactListServices | find#ContactListParties |  | Comms/Inbox/Mail |
| ContactListServices | join#ContactList | PASS: Forum/Categories/CategoryDetail | Comms/Inbox/Mail |
| ContactListServices | leave#ContactList | PASS: Forum/Categories/CategoryDetail | Comms/Inbox/Mail |
| ContactListServices | add#ContactListParty | PASS: Forum/Settings/Members | Comms/Inbox/Mail |
| ContactListServices | remove#ContactListParty | PASS: Forum/Settings/Members | Comms/Inbox/Mail |
| ContactListServices | decline#ContactListParty | PASS: Forum/Settings/Members | Comms/Inbox/Mail |
| ContactListServices | set#ContactListPartyDelivery | PASS: Forum/Categories/CategoryDetail | Comms/Inbox/Mail |

## Order (89 services)

| Service XML | Service | Designed in | Implemented in |
| --- | --- | --- | --- |
| OrderBulkServices | store#Order |  |  |
| OrderBulkServices | change#OrderPartsStatus |  |  |
| OrderInfoServices | get#OrderDisplayInfo | Purchasing/Orders/OrderDetail; Shared/Customer360; Shared/Supplier360 |  |
| OrderInfoServices | get#OrderItemsTotalCount |  |  |
| OrderInfoServices | get#OrderItemDisplayInfo |  |  |
| OrderInfoServices | get#OrderPartBillingAddress |  |  |
| OrderInfoServices | validate#Order |  |  |
| OrderInfoServices | validate#OrderRequireManual |  |  |
| OrderInfoServices | check#OrderPreApprove | Shared/OrderDetail; Accounting/Records/OrderDetail; CustomerService/Orders/OrderDetail; Purchasing/Orders/OrderDetail |  |
| OrderInfoServices | send#OrderStoreEmail | Purchasing/Orders/OrderDetail; Shared/OrderDetail |  |
| OrderInfoServices | notify#OrderHighPriority |  |  |
| OrderServices | create#Order | Purchasing/Orders/PurchaseOrders |  |
| OrderServices | update#OrderHeader | Purchasing/Orders/OrderDetail; Shared/OrderDetail |  |
| OrderServices | create#OrderPart | Purchasing/Orders/OrderDetail; Shared/OrderDetail |  |
| OrderServices | update#OrderPart | Purchasing/Orders/OrderDetail; Shared/OrderDetail |  |
| OrderServices | get#OrderItemTotal |  |  |
| OrderServices | create#OrderItem | Purchasing/Orders/OrderDetail; Shared/OrderDetail |  |
| OrderServices | update#OrderItem | Purchasing/Orders/OrderDetail; Shared/OrderDetail |  |
| OrderServices | delete#OrderItem | Purchasing/Orders/OrderDetail; Shared/OrderDetail |  |
| OrderServices | recalc#OrderItemAmount |  |  |
| OrderServices | recalc#OrderPartItemAmounts |  |  |
| OrderServices | check#AvailableInventory |  |  |
| OrderServices | add#OrderProductQuantity | Purchasing/Orders/OrderDetail; Shared/OrderDetail |  |
| OrderServices | update#OrderProductQuantity |  |  |
| OrderServices | merge#OrderItems |  |  |
| OrderServices | set#OrderBillingShippingInfo | Shared/OrderDetail |  |
| OrderServices | add#OrderPartPayment | Shared/OrderDetail |  |
| OrderServices | create#OrderPayments50Split |  |  |
| OrderServices | change#OrderStatusInterface |  |  |
| OrderServices | update#OrderStatus | Purchasing/Orders/OrderDetail |  |
| OrderServices | propose#Order |  |  |
| OrderServices | place#Order | Purchasing/Orders/OrderDetail |  |
| OrderServices | approve#Order | Purchasing/Orders/OrderDetail; Purchasing/Orders/PurchaseOrders |  |
| OrderServices | autoApprove#OrdersDelayed |  |  |
| OrderServices | autoApprove#Order |  |  |
| OrderServices | isFulfilled#OrderPart |  |  |
| OrderServices | isFulfilled#OrderItem |  |  |
| OrderServices | checkComplete#OrderPart |  |  |
| OrderServices | checkStillComplete#Order |  |  |
| OrderServices | checkCancelComplete#Order |  |  |
| OrderServices | checkRejectedComplete#Order |  |  |
| OrderServices | complete#OrderPart | Purchasing/Orders/OrderDetail |  |
| OrderServices | complete#Order | Purchasing/Orders/PurchaseOrders |  |
| OrderServices | cancel#Order | Purchasing/Orders/OrderDetail |  |
| OrderServices | cancel#OrderPart | Purchasing/Orders/OrderDetail |  |
| OrderServices | cancel#OrderItem | Purchasing/Orders/OrderDetail |  |
| OrderServices | reject#Order |  |  |
| OrderServices | reject#OrderPart |  |  |
| OrderServices | reject#OrderItem |  |  |
| OrderServices | clone#Order | Purchasing/Orders/OrderDetail |  |
| OrderServices | update#OrderRecur | Shared/OrderDetail |  |
| OrderServices | create#RecurringOrders |  |  |
| OrderServices | create#RecurringOrder |  |  |
| OrderServices | handle#OrderItemChange |  |  |
| OrderServices | handle#OrderPartChange |  |  |
| OrderServices | handle#OrderMajorChange |  |  |
| OrderServices | update#OrderHeaderTotal |  |  |
| OrderServices | update#OrderPartTotal |  |  |
| OrderServices | increment#OrderRevision | Purchasing/Orders/OrderChanges |  |
| OrderServices | create#OrderContent | Shared/RecordFiles; Shared/OrderDetail | Shared/RecordFiles |
| OrderServices | update#OrderContent | Shared/OrderDetail |  |
| OrderServices | save#OrderContentFile | Shared/RecordFiles |  |
| OrderServices | create#PurchaseRequestOrder | Projects/Requests/RequestDetail; Purchasing/Requests/RequestSourcing |  |
| ReturnServices | get#ReturnDisplayInfo | Warehouse/Returns/ReturnDetail; Purchasing/Returns/ReturnDetail; CustomerService/Returns/ReturnDetail; CustomerService/Returns/Returns; Shared/Customer360; Shared/ReturnDetail |  |
| ReturnServices | create#Return | Warehouse/Returns/Returns; Purchasing/Returns/ReturnDetail |  |
| ReturnServices | create#ReturnFromOrder | Warehouse/Returns/Returns; Purchasing/Returns; CustomerService/Returns/NewReturn; ServicePortal/RequestReturn; Shared/ReturnDetail |  |
| ReturnServices | find#OrderOpenReturns | CustomerService/Returns/NewReturn; ServicePortal/RequestReturn |  |
| ReturnServices | find#ReturnableOrderItems | Warehouse/Returns/ReturnDetail; Purchasing/Returns; CustomerService/Returns/NewReturn; ServicePortal/RequestReturn; Shared/ReturnDetail |  |
| ReturnServices | calculate#OrderItemReturnable | Warehouse/Returns/ReturnDetail; Purchasing/Returns; CustomerService/Returns/NewReturn; ServicePortal/RequestReturn; Shared/ReturnDetail |  |
| ReturnServices | add#OrderItemToReturn | Warehouse/Returns/ReturnDetail; Purchasing/Returns/ReturnDetail; CustomerService/Returns/NewReturn; ServicePortal/RequestReturn; Shared/ReturnDetail |  |
| ReturnServices | change#ReturnStatusInterface |  |  |
| ReturnServices | update#ReturnStatus |  |  |
| ReturnServices | checkUpdate#ReturnHeaderStatus |  |  |
| ReturnServices | request#Return | Warehouse/Returns/ReturnDetail; Purchasing/Returns/ReturnDetail; CustomerService/Returns/ReturnDetail; CustomerService/Returns/NewReturn; ServicePortal/RequestReturn |  |
| ReturnServices | approve#Return | Warehouse/Returns/ReturnDetail; Purchasing/Returns/ReturnDetail; CustomerService/Returns/ReturnDetail |  |
| ReturnServices | receive#ReturnShipmentItems | Warehouse/Returns/ReturnDetail; Warehouse/Returns/ReturnReceipt; Shared/ReturnDetail |  |
| ReturnServices | receive#ReturnWithoutShipment | Warehouse/Returns/ReturnDetail; CustomerService/Returns/ReturnDetail; Shared/ReturnDetail |  |
| ReturnServices | receive#ReturnItem | Warehouse/Returns/ReturnDetail; Warehouse/Returns/ReturnReceipt |  |
| ReturnServices | complete#ReturnItem | CustomerService/Returns/ReturnDetail; Shared/ReturnDetail |  |
| ReturnServices | process#ReturnItemResponses | CustomerService/Returns/ReturnDetail; Accounting/Records/ReturnDetail; Shared/ReturnDetail |  |
| ReturnServices | cancel#Return | Warehouse/Returns/ReturnDetail; Purchasing/Returns/ReturnDetail; CustomerService/Returns/ReturnDetail |  |
| ReturnServices | cancel#ReturnItem | Warehouse/Returns/ReturnDetail; CustomerService/Returns/ReturnDetail |  |
| ReturnServices | update#ReturnItem | Warehouse/Returns/ReturnDetail; Purchasing/Returns/ReturnDetail; CustomerService/Returns/ReturnDetail; CustomerService/Returns/NewReturn; ServicePortal/RequestReturn; Shared/ReturnDetail |  |
| ReturnServices | delete#ReturnItem | Warehouse/Returns/ReturnDetail; Shared/ReturnDetail |  |
| ReturnServices | create#ReturnShipment | Warehouse/Returns/ReturnDetail; Purchasing/Returns/ReturnDetail; Shared/ReturnDetail |  |
| ReturnServices | add#ReturnToShipment | Warehouse/Returns/ReturnDetail; Shared/ReturnDetail |  |
| ReturnServices | returnAndResell#Shipment |  |  |
| ReturnServices | return#Shipment |  |  |
| ReturnServices | resell#Shipment |  |  |

## Other (22 services)

| Service XML | Service | Designed in | Implemented in |
| --- | --- | --- | --- |
| BudgetReportServices | run#BudgetExpenseReport | Accounting/Reports/BudgetVariance |  |
| BudgetReportServices | run#BudgetExpenseDetailReport | Accounting/Reports/BudgetVariance |  |
| BudgetServices | get#GlAccountAppls |  |  |
| BudgetServices | get#AssetGlAppls |  |  |
| BudgetServices | get#FacilityGlAppls |  |  |
| BudgetServices | create#Budget | Accounting/Budgets/Budgets |  |
| BudgetServices | store#BudgetItem | Accounting/Budgets/BudgetDetail |  |
| BudgetServices | get#BudgetItemsAccountsSubPeriods | Accounting/Budgets/BudgetDetail |  |
| BudgetServices | store#BudgetItemsSubPeriods | Accounting/Budgets/BudgetDetail |  |
| BudgetServices | store#BudgetItemDetail | Accounting/Budgets/BudgetDetail |  |
| BudgetServices | store#BudgetItemDetailsSubPeriods | Accounting/Budgets/BudgetDetail |  |
| TaxServices | calculate#SalesTax | Accounting/Tax/TaxRates |  |
| TaxServices | calculate#OrderSalesTax |  |  |
| TaxServices | calculate#InvoiceSalesTax | Shared/InvoiceDetail |  |
| TaxServices | calculate#SalesTaxLocal | Accounting/Tax/TaxRates |  |
| TaxServices | create#TaxStatement | Accounting/Tax/TaxStatements |  |
| TaxServices | delete#TaxStatement | Accounting/Tax/TaxStatementDetail |  |
| TaxServices | create#AllVendor1099MiscStatements | Accounting/Tax/TaxStatements |  |
| TaxServices | create#Vendor1099MiscStatement | Accounting/Tax/TaxStatements |  |
| TaxServices | get#UsaIrs1099MiscFormData | Accounting/Tax/TaxStatementDetail |  |
| TaxServices | get#RecipientTaxInfo |  |  |
| TaxServices | get#PayerTaxInfo |  |  |

## Party (86 services, 59 added)

| Service XML | Service | Designed in | Implemented in |
| --- | --- | --- | --- |
| AgreementServices | create#AgreementContent | Shared/RecordFiles; Purchasing/Agreements/AgreementDetail | Shared/RecordFiles |
| AgreementServices | update#AgreementContent | Purchasing/Agreements/AgreementDetail |  |
| AgreementServices | save#AgreementContentFile | Shared/RecordFiles |  |
| CommunicationServices | find#PartyCommunicationEvents | Shared/Chatter; CustomerService/Cases/ChannelSessions |  |
| CommunicationServices | create#Message | Commons/QuickCreate; Commons/Files; Comms/Inbox/Compose; Projects/Requests/RequestDetail; Projects/Code/MergeRequestDetail/Changes; Shared/Chatter; CustomerService/Cases/CaseDetail; Shared/RequestDetail; PASS: Forum/Compose | Comms/Inbox/Compose; Shared/Chatter |
| CommunicationServices | reply#CommunicationEvent | Comms/Inbox/Compose; Projects/Code/MergeRequestDetail/Changes; Shared/Chatter | Comms/Inbox/Compose; Shared/Chatter |
| CommunicationServices | add#WikiPageComment | Commons/Knowledge; Commons/Knowledge/Review |  |
| CommunicationServices | get#CommunicationEventContentLocation |  |  |
| CommunicationServices | create#CommunicationEventContent | Shared/RecordFiles | Shared/RecordFiles |
| CommunicationServices | update#CommunicationEventContent |  |  |
| CommunicationServices | save#CommunicationEventContentFile | Shared/RecordFiles |  |
| ContactServices | get#PartyContactInfo | Commons/Contacts/ContactDetail; Comms/Inbox | Commons/Contacts/ContactDetail; Commons/Contacts/List; Commons/Settings/Account; Comms/Inbox/Mail; Projects/Billing/InvoiceDetail; Projects/Billing/InvoicePrint |
| ContactServices | get#PartyContactInfoList |  |  |
| ContactServices | get#PartyDefaultBilling |  |  |
| ContactServices | store#PartyContactInfo | Commons/Contacts/ContactDetail; Commons/Settings/Account | Commons/Contacts/ContactDetail; Commons/Contacts/List; Commons/Settings/Account |
| ContactServices | create#PostalAddress |  |  |
| ContactServices | update#PartyPostalAddress |  |  |
| ContactServices | get#PostalAddressGeoIdSet |  |  |
| ContactServices | findOrCreate#PartyPostalAddress |  |  |
| ContactServices | clean#TelecomNumber |  |  |
| ContactServices | create#TelecomNumber | Commons/QuickCreate |  |
| ContactServices | update#PartyTelecomNumber |  |  |
| ContactServices | findOrCreate#PartyTelecomNumber |  |  |
| ContactServices | create#EmailAddress | Commons/QuickCreate |  |
| ContactServices | get#PrimaryEmailAddress |  | Commons/Settings/Account; Comms/Inbox/Compose; Projects/Billing/InvoiceDetail; Projects/Billing/InvoicePrint |
| ContactServices | findOrCreate#PartyEmailAddress |  |  |
| ContactServices | create#WebAddress |  |  |
| ContactServices | create#ContactMechOther |  |  |
| ContactServices | update#PartyContactOther |  |  |
| ContactServices | update#ContactMechMutable |  |  |
| ContactServices | store#PartyContactMech | Commons/Contacts/ContactDetail; Comms/Consent | Commons/Contacts/ContactDetail; Commons/Contacts/List |
| ContactServices | delete#PartyContactMech | Commons/Contacts/ContactDetail | Commons/Contacts/ContactDetail; Commons/Contacts/List |
| ContactServices | undelete#PartyContactMech |  |  |
| DuplicateServices | find#PartyHasDuplicates | Commons/Contacts/Duplicates |  |
| DuplicateServices | find#PartyDuplicates | Commons/Contacts/Duplicates | Commons/Contacts/Duplicates |
| DuplicateServices | find#TelecomNumbers |  |  |
| DuplicateServices | find#PostalAddresses |  |  |
| DuplicateServices | check#AllPartyDuplicates | Commons/Contacts/Duplicates | Commons/Contacts/Duplicates |
| DuplicateServices | merge#AllDuplicateParties |  |  |
| DuplicateServices | merge#Parties | Commons/Contacts; Commons/Contacts/Duplicates | Commons/Contacts/Compare |
| GooglePartyServices | get#MapsGeoCodeResults |  |  |
| GooglePartyServices | get#MapsPlaceSearchText |  |  |
| GooglePartyServices | get#MapsPlaceDetails |  |  |
| PartyServices | find#Party | Commons/Contacts; Purchasing/Suppliers | Commons; Commons/Contacts/ContactDetail; Commons/Contacts/List; Comms/Consent/List |
| PartyServices | search#Party | Commons/Contacts; Comms/Panel/Chat; Comms/Inbox |  |
| PartyServices | search#Person |  | Commons/Calendar; Commons/Calendar/EventDetail; Commons/QuickCreate; Projects/Projects/ProjectDetail/Plan/Calendar |
| PartyServices | get#UserNoticeCounts |  |  |
| PartyServices | setup#UserOrganizationInfo | Commons; Comms; Projects; Products; Warehouse; Purchasing; CustomerService; Accounting; Manufacturing | Commons; Comms; Projects; Products |
| PartyServices | get#PartyOrganizationInfo |  |  |
| PartyServices | create#Account |  |  |
| PartyServices | update#Account |  | Commons/Settings/Account |
| PartyServices | create#UserAccountPerson |  |  |
| PartyServices | create#PartyUserAccount |  |  |
| PartyServices | update#PartyUserAccount |  |  |
| PartyServices | create#Person | Commons/QuickCreate; Purchasing/Suppliers |  |
| PartyServices | create#PersonCustomer |  |  |
| PartyServices | create#PersonEmployee |  |  |
| PartyServices | create#Organization | Commons/QuickCreate; Purchasing/Suppliers |  |
| PartyServices | update#PartyDetail | Commons/Contacts/ContactDetail; Shared/Customer360; Shared/Supplier360 | Commons/Contacts/Compare; Commons/Contacts/ContactDetail; Commons/Contacts/List |
| PartyServices | convert#PartyToOrganization |  |  |
| PartyServices | convert#PartyToPerson |  |  |
| PartyServices | ensure#PartyRole | Purchasing/Suppliers |  |
| PartyServices | set#PartyClassification | Purchasing/Suppliers/Supplier360; Shared/Customer360 |  |
| PartyServices | remove#PartyClassification | Purchasing/Suppliers/Supplier360; Shared/Customer360 |  |
| PartyServices | get#PartyBadgeInfo |  |  |
| PartyServices | lookup#PartyBadge |  |  |
| PartyServices | scan#PartyBadge |  |  |
| PartyServices | get#PartyContentLocation |  |  |
| PartyServices | create#PartyContent | Commons/Contacts/ContactDetail; Commons/Settings/Account; Shared/RecordFiles | Commons/Contacts/ContactDetail; Commons/Contacts/List; Commons/Settings/Account; Shared/RecordFiles |
| PartyServices | update#PartyContent |  |  |
| PartyServices | save#PartyContentFile | Shared/RecordFiles |  |
| PartyServices | get#PartySettingValue |  |  |
| PartyServices | store#PartySetting |  |  |
| PartyServices | store#PartyRelationshipSetting |  |  |
| PartyServices | validate#PartySetting |  |  |
| PartyServices | send#DataDocumentNotifications |  |  |
| TimeServices | get#DescendantPeriods |  |  |
| TimeServices | create#TimePeriod |  |  |
| TimeServices | reset#TimePeriodNames |  |  |
| TimeServices | delete#TimePeriod |  |  |
| TimeServices | getOrCreate#TimePeriod |  |  |
| TimeServices | getOrCreate#NextTimePeriod |  |  |
| TimeServices | get#NextTimePeriod |  |  |
| TimeServices | getOrCreate#PreviousTimePeriod |  |  |
| TimeServices | get#TimePeriodInfo |  |  |
| TimeServices | find#PartyTimePeriodGroups |  |  |

Added in the drawers-commons build (Oct 18–19, 2026), called by built screens:

| Service XML | Service | Designed in | Implemented in |
| --- | --- | --- | --- |
| CommunicationServices | get#InternalThread | PASS: Forum/Topics/TopicDetail | Comms/Inbox/Compose; Comms/Inbox/Mail; Comms/Inbox/MessageDetail |
| CommunicationServices | set#InternalMessageState | PASS: Forum/Topics/TopicDetail | Comms/Inbox/Compose; Comms/Inbox/Mail |
| CommunicationServices | close#ListThread | PASS: Forum/Topics/TopicDetail | Comms/Inbox/Compose; Comms/Inbox/Mail |
| CommunicationServices | find#InboxThreads |  | Comms; Comms/Home; Comms/Inbox/Mail |
| CommunicationServices | get#InboxUnreadCounts |  | Comms/Home; Comms/Inbox/Mail |
| CommunicationServices | get#RecordLinkInfo | Shared/Chatter; Shared/RecordFiles | Commons/Calendar; Commons/Calendar/EventDetail; Commons/Files; Commons/Knowledge; Commons/Notes; Commons/QuickCreate; Commons/Requests/List; Commons/Requests/RequestDetail; Commons/Tasks/List; Commons/Tasks/TaskDetail; Comms/Chat; Comms/Inbox/Compose; Comms/Inbox/Mail; Comms/Inbox/MessageDetail; Shared/Chatter; Shared/RecordFiles; Projects: 19 screens (through the ironstone.* access and find services) |
| CommunicationServices | findOrCreate#EmailCommunicationEvent |  | Comms/Inbox/Mail |
| CommunicationServices | link#CommunicationEventRecord |  | Comms/Chat; Comms/Inbox/Compose; Comms/Inbox/Mail; Comms/Inbox/MessageDetail; Shared/Chatter |
| CommunicationServices | unlink#CommunicationEventRecord |  | Comms/Inbox/Mail; Shared/Chatter |
| CommunicationServices | send#EmailDraft | Projects/Requests/RequestDetail; CustomerService/Cases/CaseDetail; Shared/RequestDetail | Comms/Inbox/Compose |
| CommunicationServices | get#RecordTimeline |  | Shared/Chatter |
| CommunicationServices | log#RecordNote |  | Commons/QuickCreate; Shared/Chatter |
| CommunicationServices | update#RecordNote |  | Shared/Chatter |
| CommunicationServices | delete#RecordNote |  | Shared/Chatter |
| CommunicationServices | notify#RecordMention |  | Shared/Chatter |
| CommunicationServices | notify#RecordFollowers |  | Commons/Knowledge; Commons/Notes; Projects/Projects/ProjectDetail/Docs |
| CommunicationServices | follow#Record |  | Commons/Knowledge; Shared/Chatter; Projects/Projects/ProjectDetail; Projects/Projects/ProjectDetail/Docs; Projects/WorkItems/WorkItemDetail |
| CommunicationServices | unfollow#Record |  | Commons/Knowledge; Shared/Chatter; Projects/Projects/ProjectDetail; Projects/Projects/ProjectDetail/Docs; Projects/WorkItems/WorkItemDetail |
| CommunicationServices | get#RecordFollowers |  | Shared/Chatter |
| CommunicationServices | findOrCreate#ChatCommunicationEvent |  | Comms/Chat |
| CommunicationServices | create#RecordFromChatMessage |  | Comms/Chat |
| ConsentServices | store#PartyConsent |  | Commons/Contacts/ContactDetail; Commons/Contacts/List; Comms/Consent/Contact; Comms/Consent/List |
| ConsentServices | get#PartyConsentState |  | Comms/Consent/Contact |
| ConsentServices | get#PartyConsentHistory |  | Comms/Consent/Contact |
| ConsentServices | find#Consents |  | Comms/Consent/List |
| ConsentServices | subscribe#ContactListParty |  | Commons/Contacts/ContactDetail; Commons/Contacts/List; Comms/Consent/Contact |
| ConsentServices | unsubscribe#ContactListParty |  | Commons/Contacts/ContactDetail; Commons/Contacts/List; Comms/Consent/Contact; Unsubscribe |
| ConsentServices | unsubscribe#ContactListParties |  | Comms/Consent/List |
| ConsentServices | check#UnsubscribeToken |  | Unsubscribe |
| ConsentServices | resolve#UnsubscribeToken |  | Unsubscribe |
| ConsentServices | apply#UnsubscribePreferences |  | Unsubscribe |
| ContactBookServices | create#ContactBook |  | Commons/Settings/ContactBooks |
| ContactBookServices | update#ContactBook |  | Commons/Settings/ContactBooks |
| ContactBookServices | delete#ContactBook |  | Commons/Settings/ContactBooks |
| ContactBookServices | ensure#UserDefaultContactBook |  | Commons/QuickCreate |
| ContactBookServices | share#ContactBook |  | Commons/Settings/ContactBooks |
| ContactBookServices | unshare#ContactBook |  | Commons/Settings/ContactBooks |
| ContactBookServices | add#ContactBookParties |  | Commons/Contacts/ContactDetail; Commons/Contacts/List |
| ContactBookServices | remove#ContactBookParties |  | Commons/Contacts/ContactDetail; Commons/Contacts/List |
| ContactBookServices | create#ContactBookGroup |  | Commons/Settings/ContactBooks |
| ContactBookServices | update#ContactBookGroup |  | Commons/Settings/ContactBooks |
| ContactBookServices | delete#ContactBookGroup |  | Commons/Settings/ContactBooks |
| ContactBookServices | add#ContactBookGroupParties |  | Commons/Contacts/List |
| ContactBookServices | remove#ContactBookGroupParties |  | Commons/Contacts/ContactDetail; Commons/Contacts/List |
| ContactBookServices | set#ContactFavorite |  | Commons/Contacts/ContactDetail; Commons/Contacts/List |
| ContactBookServices | find#ContactBookParties |  | Commons/Contacts/List |
| ContactBookServices | get#UserContactBooks |  | Commons/Contacts/Compare; Commons/Contacts/ContactDetail; Commons/Contacts/Duplicates; Commons/Contacts/Import/Options; Commons/Contacts/Import/Result; Commons/Contacts/List; Commons/QuickCreate; Commons/Settings/ContactBooks |
| ContactBookServices | store#ContactParty |  | Commons/Calendar/EventDetail; Commons/QuickCreate |
| ContactBookServices | create#PersonalContact |  | Commons/Calendar/EventDetail; Commons/QuickCreate |
| ContactBookServices | link#PersonalContactToDirectory |  | Commons/Contacts/Compare; Commons/Contacts/ContactDetail; Commons/Contacts/List |
| ContactBookServices | delete#Contacts |  | Commons/Contacts/ContactDetail; Commons/Contacts/List |
| ContactBookServices | filter#ContactAddresses |  | Comms/Settings/OutOfOffice (theme value STRT_EMAIL_CONTACT_SERVICE) |
| ContactImportServices | read#ContactFileText |  | Commons/Contacts/Import/Source; Projects/Time/Import/Source; Projects/WorkItems/Import/Source |
| ContactImportServices | parse#ContactFile |  | Commons/Contacts/Import/Mapping; Commons/Contacts/Import/Source |
| ContactImportServices | preview#Contacts |  | Commons/Contacts/Import/Preview |
| ContactImportServices | import#Contacts |  | Commons/Contacts/Import/Result |
| ContactImportServices | export#Contacts |  | Commons/Contacts/ContactDetail; Commons/Contacts/List |
| DuplicateServices | mark#PartyNotDuplicate |  | Commons/Contacts/Compare; Commons/Contacts/Duplicates |
| PartyServices | get#ShellCounts |  | shell header (theme value STRT_SHELL_COUNTS_SERVICE) |

Added in the Projects build (Oct 21–22, 2026; impl-projects.md P1–P10), called by built screens:

| Service XML | Service | Designed in | Implemented in |
| --- | --- | --- | --- |
| CommunicationServices | get#ClientRecordVisibility |  | Projects/Home; Projects/Projects/MilestoneDetail; Projects/Requests/RequestDetail |

## Product (108 services, 7 added)

| Service XML | Service | Designed in | Implemented in |
| --- | --- | --- | --- |
| AssetServices | get#AssetDisplayInfo | Warehouse/Inventory/Adjustments; Warehouse/Inventory/AssetDetail; Shared/EquipmentDetail |  |
| AssetServices | get#AvailableInventory | Products/Products/Product360/Stock; Warehouse/Inventory/Availability; Purchasing/Replenishment/InventoryAvailability; CustomerService/Availability/InventoryAvailability; Shared/Product360; Shared/InventoryAvailability; Manufacturing/WorkOrders/NewWorkOrder; Manufacturing/BillsOfMaterials/BillOfMaterialsDetail/BillOfMaterialsExplosion | Shared/InventoryAvailability/Summary; Shared/Product360/Summary (kits) |
| AssetServices | get#AvailableForOrder | Warehouse/Inventory/Availability; Shared/InventoryAvailability |  |
| AssetServices | get#AvailableInventoryMulti | Warehouse/Inventory/Availability; Warehouse/Picking/PickLocationMoves; Purchasing/Replenishment/InventoryAvailability; CustomerService/Availability/InventoryAvailability; Shared/InventoryAvailability |  |
| AssetServices | update#Asset | Warehouse/Inventory/AssetDetail; Shared/EquipmentDetail |  |
| AssetServices | update#AssetAcquireCost | Shared/EquipmentDetail |  |
| AssetServices | update#ProductAcquireCost | Accounting/Inventory/InventoryValuation |  |
| AssetServices | update#AssetFromDetail |  |  |
| AssetServices | recalculate#AllAssetTotals |  |  |
| AssetServices | get#AssetPools | Warehouse/Settings/AssetPools |  |
| AssetServices | reserve#AssetsForOrder | Warehouse/Orders/OrderDetail; Warehouse/Shipping/ShipmentDetail; Shared/ShipmentDetail |  |
| AssetServices | checkReserve#AssetForOrderItem |  |  |
| AssetServices | reserve#AssetForOrderItem | Warehouse/Orders/OrderDetail; Warehouse/Shipping/ShipmentDetail; Shared/OrderDetail; Shared/ShipmentDetail |  |
| AssetServices | remove#OrderItemReservations | Shared/OrderDetail |  |
| AssetServices | remove#OrderReservations |  |  |
| AssetServices | reduce#AssetReservation | Warehouse/Orders/OrderDetail; Warehouse/Shipping/ShipmentDetail; Shared/ShipmentDetail |  |
| AssetServices | reReserve#Assets |  |  |
| AssetServices | reserve#IncreasedAsset |  |  |
| AssetServices | move#AssetReservation |  |  |
| AssetServices | move#ReservationsFromNonPickLocations | Warehouse/Picking/PickLocationMoves |  |
| AssetServices | check#AssetReservations |  |  |
| AssetServices | check#AssetReservationValid |  |  |
| AssetServices | check#FacilityReservations | Warehouse/Settings/ReservationPolicies |  |
| AssetServices | displace#AssetReservations |  |  |
| AssetServices | change#AssetQuantity |  |  |
| AssetServices | checkReserve#ProductAssets |  |  |
| AssetServices | issue#AssetReservation |  |  |
| AssetServices | issue#Asset |  |  |
| AssetServices | issue#AssetToWorkEffort | Warehouse/Inventory/MaterialIssueReceipt; Shared/MaterialIssueReceipt; Manufacturing/WorkOrders/WorkOrderDetail/MaterialIssueReceipt |  |
| AssetServices | issue#AnyAssetToWorkEffort | Warehouse/Inventory/MaterialIssueReceipt; Shared/MaterialIssueReceipt; Manufacturing/WorkOrders/WorkOrderDetail/MaterialIssueReceipt |  |
| AssetServices | issue#AnyAssetForShipmentItemSource | Warehouse/Returns/SupplierReturnShipment |  |
| AssetServices | move#IssuancesToNewShipment |  |  |
| AssetServices | cancel#AssetIssuance | Warehouse/Inventory/MaterialIssueReceipt; Shared/MaterialIssueReceipt |  |
| AssetServices | update#AssetIssuedDate |  |  |
| AssetServices | receive#Asset | Warehouse/Handheld/Receive; Warehouse/Inventory/MaterialIssueReceipt; Warehouse/Receiving/Receive; Shared/MaterialIssueReceipt; Manufacturing/WorkOrders/WorkOrderDetail/MaterialIssueReceipt |  |
| AssetServices | update#AssetAndReceipt |  |  |
| AssetServices | replace#AssetPartyAssignment |  |  |
| AssetServices | move#Product | Warehouse/Handheld/Move; Warehouse/Transfers/Move |  |
| AssetServices | moveVerify#Product |  |  |
| AssetServices | check#ScanLocation | Warehouse/Handheld/Move; Warehouse/Handheld/Putaway; Warehouse/Picking/PickLocationMoves; Warehouse/Receiving/Putaway; Warehouse/Transfers/Move |  |
| AssetServices | move#Asset | Warehouse/Handheld/Move; Warehouse/Handheld/Putaway; Warehouse/Inventory/ContainerDetail; Warehouse/Receiving/Putaway; Warehouse/Transfers/Move |  |
| AssetServices | record#PhysicalInventoryQuantity | Warehouse/Inventory/Adjustments |  |
| AssetServices | record#PhysicalInventoryChange | Warehouse/Inventory/Adjustments |  |
| AssetServices | create#ProductAssetAdHoc |  |  |
| AssetServices | update#PhysicalInventoryDate | Warehouse/Counts/CountDetail |  |
| EquipmentServices | create#Equipment |  |  |
| EquipmentServices | get#AssetMaintenanceNeeded |  |  |
| EquipmentServices | create#AssetMaintenance | Manufacturing/Quality/Downtime |  |
| EquipmentServices | create#AssetMaintenanceContent | Shared/RecordFiles | Shared/RecordFiles |
| EquipmentServices | update#AssetMaintenanceContent |  |  |
| EquipmentServices | save#AssetMaintenanceContentFile | Shared/RecordFiles |  |
| InventoryReportServices | get#InventoryProjectedInfo | Products/Products/Product360/Stock; Warehouse/Inventory/Availability; Purchasing/Replenishment/SupplyPlanning; CustomerService/Availability/InventoryAvailability; Shared/InventoryAvailability; Shared/SupplyPlanning | Shared/InventoryAvailability/Projection |
| InventoryReportServices | get#PriceHistoryInfo | Products/Pricing/PriceHistory | Products/Prices/PriceHistory |
| PriceServices | modify#ProductPrice | |  |
| PriceServices | get#ProductPriceByType |  |  |
| PriceServices | get#ProductPrice | Products/Pricing/PriceLists/PriceListDetail; Products/Pricing/PriceExplain; Purchasing/Suppliers/PriceExplain; Purchasing/Suppliers/SupplierPrices | Shared/PriceExplain |
| PriceServices | get#OrderProductPrice |  |  |
| ProductServices | find#ProductByIdValue | Products; Products/Products; Products/Units/Packaging; Products/Settings/IdentificationTypes | Products (guarded exact-ID palette) |
| ProductServices | clone#Product | Products/Products/Product360; Shared/Product360 |  |
| ProductServices | create#ProductFeature | Products/Features; Products/Products/Product360; Shared/Product360 |  |
| ProductServices | apply#ProductFeatures | Products/Features/FeatureDetail; Products/Products/Product360; Shared/Product360 |  |
| ProductServices | find#ProductFeatures |  |  |
| ProductServices | find#ProductFeatureGroups | Products/Products/VariantBuilder |  |
| ProductServices | find#ProductCategoryFeatures |  |  |
| ProductServices | get#ProductCategoryFeatureList |  |  |
| ProductServices | get#FeatureByIactnOrAll |  |  |
| ProductServices | find#VariantProduct |  |  |
| ProductServices | get#VariantProductsInfo | Products/Products/VariantBuilder |  |
| ProductServices | create#VariantProducts | Products/Products/VariantBuilder; Shared/Product360 | Products/Products/VariantBuilder; Products/Products/VariantBuilderTui |
| ProductServices | create#VariantProduct | Products/Products/VariantBuilder |  |
| ProductServices | delete#VariantProducts |  |  |
| ProductServices | delete#Product | Products/Products | Shared/Product360 (guarded unused-draft deletion) |
| ProductServices | add#ProductsToCategory | Products/Products |  |
| ProductServices | remove#ProductsFromCategory | Products/Products |  |
| ProductServices | add#FeatureToProducts | Products/Products |  |
| ProductServices | remove#FeatureFromProducts | Products/Products |  |
| ProductServices | create#ProductContent | Shared/RecordFiles; Products/Products/Product360; Products/Documents; Products/Documents/Translations; Shared/Product360 | Shared/RecordFiles; Shared/Product360/Documents |
| ProductServices | update#ProductContent | Products/Products/Product360; Products/Documents/DocumentDetail; Products/Documents/Translations; Shared/Product360 | Shared/Product360/Documents |
| ProductServices | save#ProductContentFile | Shared/RecordFiles |  |
| ProductServices | create#ProductCategoryContent | Shared/RecordFiles; Products/Categories/CategoryDetail/Content; Products/Documents/Translations | Shared/RecordFiles |
| ProductServices | update#ProductCategoryContent | Products/Categories/CategoryDetail/Content; Products/Documents/Translations |  |
| ProductServices | save#ProductCategoryContentFile | Shared/RecordFiles |  |
| ProductServices | get#ProductManualDocumentData | Products/Products/Product360; Products/Documents |  |
| PromotionServices | apply#Promotion |  |  |
| PromotionServices | apply#OrderPromotions | Shared/OrderDetail |  |
| PromotionServices | add#OrderPromoCode |  |  |
| PromotionServices | remove#OrderPromoCode |  |  |
| PromotionServices | apply#NewCustomerDiscount |  |  |
| PromotionServices | apply#BuyGetDiscount |  |  |
| PromotionServices | apply#FlatDiscount |  |  |
| StoreServices | create#StoreShippingOption |  |  |
| StoreServices | get#StoreShippingOptions |  |  |
| StoreServices | clone#ProductStore |  |  |
| StoreServices | format#UrlSlug | PRD-TAXONOMY | Products/Categories/CategoryDetail/Identifiers (guarded preview before store) |
| StoreServices | generate#UrlSlugFromProductName | Products/Products/Product360; Shared/Product360 |  |
| StoreServices | generate#UrlSlugFromCategoryName | Products/Categories/CategoryDetail |  |
| SubscriptionServices | init#SubscriptionResource |  |  |
| SubscriptionServices | renew#SubscriptionResourceAccess |  |  |
| SubscriptionServices | revoke#SubscriptionResourceAccess |  |  |
| SubscriptionServices | restore#SubscriptionResourceAccess |  |  |
| SubscriptionServices | destroy#SubscriptionResource |  |  |
| SubscriptionServices | fulfill#OrderSubscriptions |  |  |
| SubscriptionServices | fulfill#OrderPartSubscriptions |  |  |
| SubscriptionServices | fulfill#ProductSubscriptionResource |  |  |
| TenantSubscriptionServices | init#Tenant |  |  |
| TenantSubscriptionServices | revoke#TenantAccess |  |  |
| TenantSubscriptionServices | restore#TenantAccess |  |  |
| TenantSubscriptionServices | destroy#Tenant |  |  |

### Added in the Products build

| Service XML | Service | Designed in | Implemented in |
| --- | --- | --- | --- |
| ProductServices | get#CatalogOwnerScope | PRD-ACCESS | Products; Products/Products/List; Products/Products/Product360; Products/Categories/CategoryDetail; shared catalog record visibility |
| ProductServices | check#ProductUsable | PRD-LIFECYCLE | OrderServices create#OrderItem and add#OrderProductQuantity (through check#OrderProductUsable) |
| ProductServices | check#OrderProductUsable | PRD-LIFECYCLE | Both order entry paths; explicit sale/purchase direction |
| ProductServices | store#ProductIdentifier | PRD-IDENTIFIERS | Shared/Product360/Identifiers; internal/scoped clone IDs |
| ProductServices | store#KitComponent | PRD-KITS | Shared/Product360/KitComponents |
| ProductServices | store#FeatureInteraction | PRD-VARIANTS | Products/Features/FeatureInteractions (guarded pair/scope/conflict store) |
| ProductServices | preview#FeatureInteractions | PRD-VARIANTS | Products/Features/FeatureInteractions; FeatureDetail/Interactions |

### BOSS catalog application services (P1–P3)

| Service XML | Service | Designed in | Implemented in |
| --- | --- | --- | --- |
| ironstone.products.CatalogServices | get#CatalogAccess | PRD-ACCESS; P2 | Products owner/capability boundary |
| ironstone.products.CatalogServices | get#CatalogRecord | PRD-ACCESS; P2 | All catalog record mounts |
| ironstone.products.CatalogServices | find#Products | PRD-ACCESS; P2 | Products/Products/List |
| ironstone.products.CatalogServices | search#ProductIds | PRD-ACCESS; P2 | Products exact-ID palette |
| ironstone.products.CatalogServices | search#Catalog | PRD-ACCESS; P2 | Products text/party-code palette |
| ironstone.products.CatalogServices | store#Product | PRD-ACCESS; P2 | Products/Products/NewProduct; Shared/Product360/Summary |
| ironstone.products.CatalogServices | transition#ProductStatus | PRD-ACCESS; P2 | Shared/Product360 lifecycle actions |
| ironstone.products.CatalogServices | get#ProductDetail | PRD-ACCESS; P2 | Shared/Product360 and its catalog tabs |
| ironstone.products.CatalogServices | store#CatalogRow | PRD-ACCESS; P2 | Shared/Product360 catalog row editors |
| ironstone.products.CatalogServices | store#ProductContent | PRD-ACCESS; P2 | Shared/Product360/Documents |
| ironstone.products.CatalogServices | clone#Product | PRD-ACCESS; P2 | Shared/Product360 selected-section clone |
| ironstone.products.CatalogServices | delete#UnusedDraft | PRD-ACCESS; P2 | Shared/Product360 guarded deletion |
| ironstone.products.CatalogServices | bulk#Products | PRD-ACCESS; P2 | Products/Products/List fixed selection |
| ironstone.products.CatalogServices | get#CatalogSummary | PRD-ACCESS; P2 | Products/Home |
| ironstone.products.CatalogServices | get#CatalogOptions | PRD-ACCESS; P2 | Catalog form options |
| ironstone.products.CatalogServices | search#CatalogChoices | PRD-ACCESS; P2 | Catalog server-search lookups |
| mantle.product.ProductServices | get#CatalogSettings | PRD-SETTINGS | Products/Settings |
| mantle.product.ProductServices | store#CatalogSettings | PRD-SETTINGS | Products/Settings |

| ironstone.products.CategoryServices | find#Categories | PRD-TAXONOMY; PRD-ACCESS; P3 | Products/Categories/List |
| ironstone.products.CategoryServices | get#CategoryAncestors | PRD-TAXONOMY; PRD-ACCESS; P3 | Products/Categories/List tree ancestors |
| ironstone.products.CategoryServices | store#Category | PRD-TAXONOMY; PRD-ACCESS; P3 | Products/Categories/NewCategory; CategoryDetail/Summary |
| ironstone.products.CategoryServices | store#CategoryParent | PRD-TAXONOMY; PRD-ACCESS; P3 | Products/CategoryDetail/Parents |
| ironstone.products.CategoryServices | move#CategoryParent | PRD-TAXONOMY; PRD-ACCESS; P3 | Products/Categories/List; CategoryDetail/Parents |
| ironstone.products.CategoryServices | expire#CategoryParent | PRD-TAXONOMY; PRD-ACCESS; P3 | Products/CategoryDetail/Parents |
| ironstone.products.CategoryServices | get#CategoryDetail | PRD-TAXONOMY; PRD-ACCESS; P3 | Products/CategoryDetail tabs |
| ironstone.products.CategoryServices | store#CategoryRow | PRD-TAXONOMY; PRD-ACCESS; P3 | Products/CategoryDetail relationships/identifiers |
| ironstone.products.CategoryServices | delete#UnusedCategory | PRD-TAXONOMY; PRD-ACCESS; P3 | Products/CategoryDetail guarded deletion |
| ironstone.products.CategoryServices | preview#CategorySlug | PRD-TAXONOMY; PRD-ACCESS; P3 | Products/CategoryDetail/Identifiers |
| ironstone.products.CategoryServices | get#CategoryOptions | PRD-TAXONOMY; PRD-ACCESS; P3 | Products/Category/tag form options |
| ironstone.products.FeatureServices | find#Features | PRD-TAXONOMY; PRD-ACCESS; P3 | Products/Features/List |
| ironstone.products.FeatureServices | store#Feature | PRD-TAXONOMY; PRD-ACCESS; P3 | Products/Features/NewFeature; FeatureDetail/Summary; Product360 atomic create/apply |
| ironstone.products.FeatureServices | get#FeatureDetail | PRD-TAXONOMY; PRD-ACCESS; P3 | Products/FeatureDetail tabs |
| ironstone.products.FeatureServices | delete#UnusedFeature | PRD-TAXONOMY; PRD-ACCESS; P3 | Products/FeatureDetail guarded deletion |
| ironstone.products.FeatureServices | find#FeatureGroups | PRD-TAXONOMY; PRD-ACCESS; P3 | Products/Features/FeatureGroups/List |
| ironstone.products.FeatureServices | store#FeatureGroup | PRD-TAXONOMY; PRD-ACCESS; P3 | Products/FeatureGroups/NewGroup; FeatureGroupDetail/Summary |
| ironstone.products.FeatureServices | get#FeatureGroupDetail | PRD-TAXONOMY; PRD-ACCESS; P3 | Products/FeatureGroupDetail tabs |
| ironstone.products.FeatureServices | delete#UnusedFeatureGroup | PRD-TAXONOMY; PRD-ACCESS; P3 | Products/FeatureGroupDetail guarded deletion |
| ironstone.products.FeatureServices | store#FeatureRow | PRD-TAXONOMY; PRD-ACCESS; P3 | Products/FeatureDetail and FeatureGroupDetail relationships |
| ironstone.products.FeatureServices | find#FeatureInteractions | PRD-TAXONOMY; PRD-ACCESS; P3 | Products/FeatureInteractions |
| ironstone.products.FeatureServices | store#FeatureInteraction | PRD-TAXONOMY; PRD-ACCESS; P3 | Products/FeatureInteractions guarded writer |
| ironstone.products.FeatureServices | preview#FeatureInteractions | PRD-TAXONOMY; PRD-ACCESS; P3 | Products/FeatureInteractions preview |
| ironstone.products.FeatureServices | get#FeatureOptions | PRD-TAXONOMY; PRD-ACCESS; P3 | Products/Feature/group form options |

## Request (12 services, 3 added)

| Service XML | Service | Designed in | Implemented in |
| --- | --- | --- | --- |
| RequestServices | create#Request | Commons/QuickCreate; Commons/Requests; Comms/Inbox; Comms/Chat; Projects/Requests; Warehouse/Transfers/StockRequests; Purchasing/Requests; Purchasing/Requests/RequestDetail; CustomerService/Cases/NewCase; Manufacturing/Quality/Downtime | Commons/QuickCreate; Commons/Requests/List; Commons/Tasks/TaskDetail; Projects/Requests/List; Projects/WorkItems/WorkItemDetail |
| RequestServices | update#Request | Commons/Requests/RequestDetail; Projects/Requests; Projects/Requests/RequestDetail; Purchasing/Requests/RequestDetail; CustomerService/Cases/CaseDetail; Shared/RequestDetail | Commons/Requests/RequestDetail; Projects/Requests/List; Projects/Requests/RequestDetail |
| RequestServices | create#ContactRequest | Projects/Requests/Intake |  |
| RequestServices | create#ContactRequestReCaptcha | Projects/Requests/Intake |  |
| RequestServices | replace#RequestParty | Commons/Requests/RequestDetail; Projects/Requests; Projects/Requests/RequestDetail; Purchasing/Requests/RequestDetail; CustomerService/Cases/CaseDetail; CustomerService/Cases/NewCase; Shared/RequestDetail | Commons/Requests/RequestDetail; Projects/Requests/List; Projects/Requests/RequestDetail |
| RequestServices | add#RequestComment | Commons/Requests/RequestDetail; Projects/Requests/RequestDetail; CustomerService/Cases/CaseDetail | Commons/Requests/RequestDetail; Projects/Requests/List; Projects/Requests/RequestDetail |
| RequestServices | update#RequestComment | Commons/Requests/RequestDetail; Projects/Requests/RequestDetail; CustomerService/Cases/CaseDetail | Shared/Chatter |
| RequestServices | delete#RequestComment | Commons/Requests/RequestDetail; Projects/Requests/RequestDetail; CustomerService/Cases/CaseDetail | Shared/Chatter |
| RequestServices | get#RequestContentLocation |  |  |
| RequestServices | create#RequestContent | Commons/Requests/RequestDetail; Projects/Requests/RequestDetail; Shared/RecordFiles; CustomerService/Cases/CaseDetail | Shared/RecordFiles |
| RequestServices | update#RequestContent | Projects/Requests/RequestDetail; CustomerService/Cases/CaseDetail |  |
| RequestServices | save#RequestContentFile | Commons/Requests/RequestDetail; Shared/RecordFiles |  |

Added in the drawers-commons build (Oct 18–19, 2026), called by built screens:

| Service XML | Service | Designed in | Implemented in |
| --- | --- | --- | --- |
| RequestServices | get#UserTodayRequests |  | Commons |
| RequestServices | link#RequestRecord | Projects/Requests/RequestDetail; Purchasing/Requests/RequestDetail; CustomerService/Cases/CaseDetail; CustomerService/Cases/NewCase; CustomerService/Returns/WarrantyAssessment; Shared/RequestDetail; Manufacturing/Quality/Downtime | Commons/QuickCreate; Commons/Requests/RequestDetail; Projects/Requests/RequestDetail |
| RequestServices | unlink#RequestRecord | Projects/Requests/RequestDetail; Purchasing/Requests/RequestDetail; CustomerService/Cases/CaseDetail; Shared/RequestDetail | Commons/Requests/RequestDetail; Projects/Requests/RequestDetail |

Added in the Projects build (Oct 21–22, 2026; impl-projects.md P1–P10), called by built screens:

| Service XML | Service | Designed in | Implemented in |
| --- | --- | --- | --- |
| RequestServices | convert#RequestToProject |  | Projects/Requests/RequestDetail |
| RequestServices | create#IntakeRequest | ServicePortal/NewCustomerCase | RequestIntake |
| RequestServices | create#IntakeToken | CustomerService/Settings/ChannelRouting | Projects/Projects/ProjectDetail/Settings; Projects/Requests/List |
| RequestServices | get#IntakeSettings | CustomerService/Settings/ChannelRouting | Projects/Projects/ProjectDetail/Settings; Projects/Requests/List; Projects/Settings/Intake |
| RequestServices | make#RequestWorkItem |  | Projects/Requests/List; Projects/Requests/RequestDetail |
| RequestServices | remove#IntakeToken | CustomerService/Settings/ChannelRouting | Projects/Projects/ProjectDetail/Settings; Projects/Requests/List |

## Sales (8 services)

| Service XML | Service | Designed in | Implemented in |
| --- | --- | --- | --- |
| AccountServices | create#Account |  |  |
| AccountServices | create#Contact |  |  |
| AccountServices | add#Contact |  |  |
| AccountServices | delete#Contact |  |  |
| SalesReportServices | get#SalesOrderSummary | Accounting/Reports/SalesAnalysis |  |
| SalesReportServices | get#SalesInvoiceSummary |  |  |
| SalesReportServices | get#SalesTopProduct |  |  |
| SalesReportServices | get#InvoicesByCustomerClass |  |  |

## Search (1 service)

| Service XML | Service | Designed in | Implemented in |
| --- | --- | --- | --- |
| UniversalSearchServices | search#Universal | Commons/Search; Comms/Inbox | Commons; Commons/Knowledge; Commons/Notes; Commons/Search; Comms/Chat; Comms/Inbox/Mail; Comms/Inbox/MessageDetail; Projects/Projects/ProjectDetail/Docs; Projects/Requests/RequestDetail |

## Shipment (68 services)

| Service XML | Service | Designed in | Implemented in |
| --- | --- | --- | --- |
| CarrierServices | get#OrderShippingRate |  |  |
| CarrierServices | get#ShippingRatesBulk |  |  |
| CarrierServices | get#AutoPackageInfo |  |  |
| CarrierServices | get#ShippingRate | Warehouse/Shipping/Ship |  |
| CarrierServices | request#ShippingLabels |  |  |
| CarrierServices | refund#ShippingLabels |  |  |
| CarrierServices | track#ShippingLabels |  |  |
| CarrierServices | validate#ShippingPostalAddress |  |  |
| CarrierServices | validate#PostalAddress | Warehouse/Locations/Carriers; Warehouse/Shipping/Ship |  |
| CarrierServices | validate#PostalAddressBulk |  |  |
| CarrierServices | calculate#OrderShipping |  |  |
| CarrierServices | calculate#OrderPartShipping |  |  |
| CarrierServices | get#OrderShippingRatesBulk |  |  |
| CarrierServices | get#ShipmentRates |  |  |
| CarrierServices | request#ShipmentLabels | Warehouse/Shipping/Ship |  |
| CarrierServices | get#ShipLabelMarkup |  |  |
| CarrierServices | refund#ShipmentLabels | Warehouse/Shipping/Ship |  |
| CarrierServices | track#ShipmentLabels | Warehouse/Shipping/PackageTracking; Warehouse/Shipping/Ship |  |
| CarrierServices | get#ShipmentGatewayDetails |  |  |
| CarrierServices | remove#ShipmentLabelInfo |  |  |
| CarrierServices | remove#ShipmentReturnLabelInfo |  |  |
| CarrierServices | get#ShipmentPackageRequiresInsurance |  |  |
| CarrierServices | get#GeneralPackageRequiresInsurance |  |  |
| CarrierServices | get#OrderShippingRateLocal | Warehouse/Shipping/Ship |  |
| ShipmentInfoServices | get#ShipmentDisplayInfo | Warehouse/Handheld/Receive; Warehouse/Receiving/ReceiptDetail; Warehouse/Receiving/Receive; Warehouse/Returns/ReturnReceipt; Warehouse/Returns/SupplierReturnShipment; Warehouse/Shipping/ShipmentDetail; Warehouse/Transfers/TransferShipmentDetail; Shared/ShipmentDetail |  |
| ShipmentInfoServices | get#ShipmentContactInfo | Warehouse/Receiving/ReceiptDetail; Warehouse/Returns/ReturnReceipt; Warehouse/Returns/SupplierReturnShipment; Warehouse/Shipping/Ship; Warehouse/Shipping/ShipmentDetail; Warehouse/Transfers/TransferShipmentDetail; Shared/ShipmentDetail |  |
| ShipmentInfoServices | get#ShipmentShippingOptions | Warehouse/Receiving/ReceiptDetail; Warehouse/Returns/ReturnReceipt; Warehouse/Returns/SupplierReturnShipment; Warehouse/Shipping/ShipmentDetail; Warehouse/Transfers/TransferShipmentDetail |  |
| ShipmentInfoServices | get#ShipmentLoadPickInfo | Warehouse/Handheld/Pick; Warehouse/Picking/Pick |  |
| ShipmentInfoServices | get#ShipmentPickPackInfo |  |  |
| ShipmentServices | create#Shipment | Warehouse/Receiving/Receipts; Warehouse/Shipping/Shipments; Warehouse/Transfers/Transfers |  |
| ShipmentServices | update#ShipmentAndRouteSegment | Warehouse/Receiving/ReceiptDetail; Warehouse/Returns/ReturnReceipt; Warehouse/Returns/SupplierReturnShipment; Warehouse/Shipping/ShipmentDetail; Warehouse/Transfers/TransferShipmentDetail; Shared/ShipmentDetail |  |
| ShipmentServices | create#ShipmentItem | Warehouse/Receiving/ReceiptDetail; Warehouse/Returns/ReturnReceipt; Warehouse/Returns/SupplierReturnShipment; Warehouse/Shipping/ShipmentDetail; Warehouse/Transfers/TransferShipmentDetail; Shared/ShipmentDetail |  |
| ShipmentServices | update#ShipmentItem | Warehouse/Receiving/ReceiptDetail; Warehouse/Returns/ReturnReceipt; Warehouse/Returns/SupplierReturnShipment; Warehouse/Shipping/ShipmentDetail; Warehouse/Transfers/TransferShipmentDetail; Shared/ShipmentDetail |  |
| ShipmentServices | ensure#ShipmentItemQuantityRemaining | Shared/ShipmentDetail |  |
| ShipmentServices | create#ShipmentPackage | Warehouse/Handheld/Pack; Warehouse/Shipping/Pack; Shared/ShipmentDetail |  |
| ShipmentServices | update#ShipmentPackageAndRouteSeg | Warehouse/Handheld/Pack; Warehouse/Shipping/Pack; Shared/ShipmentDetail |  |
| ShipmentServices | delete#ShipmentPackage | Warehouse/Handheld/Pack; Warehouse/Shipping/Pack; Shared/ShipmentDetail |  |
| ShipmentServices | add#ItemToPackage | Warehouse/Handheld/Pack; Warehouse/Shipping/Pack; Shared/ShipmentDetail |  |
| ShipmentServices | update#ShipmentPackageContent | Warehouse/Handheld/Pack; Warehouse/Shipping/Pack; Shared/ShipmentDetail |  |
| ShipmentServices | reset#ShipmentPackage | Warehouse/Handheld/Pack; Warehouse/Shipping/Pack |  |
| ShipmentServices | ship#OrderPart |  |  |
| ShipmentServices | create#OrderPartShipment | Warehouse/Orders/OrderDetail; Warehouse/Receiving/Receipts; Warehouse/Shipping/Shipments; Purchasing/Receiving/Receipts; Shared/OrderDetail |  |
| ShipmentServices | add#OrderPartToShipment | Warehouse/Orders/OrderDetail; Shared/OrderDetail |  |
| ShipmentServices | pickMove#ProductToContainer | Warehouse/Inventory/ContainerDetail |  |
| ShipmentServices | pickMove#ShipmentProduct | Warehouse/Handheld/Pick; Warehouse/Picking/Pick; Shared/ShipmentDetail |  |
| ShipmentServices | get#ShipmentProductByScan | Warehouse/Handheld/Pick; Warehouse/Picking/Pick; Shared/ShipmentDetail |  |
| ShipmentServices | pack#ShipmentProductScan | Warehouse/Handheld/Pack; Warehouse/Shipping/Pack; Shared/ShipmentDetail |  |
| ShipmentServices | pack#ShipmentProduct | Warehouse/Handheld/Pack; Warehouse/Shipping/Pack |  |
| ShipmentServices | pack#ShipmentItemSource | Warehouse/Handheld/Pack; Warehouse/Shipping/Pack; Shared/ShipmentDetail |  |
| ShipmentServices | pack#ShipmentAssemblyComponent | Warehouse/Handheld/Pack; Warehouse/Shipping/Pack; Shared/ShipmentDetail; Shared/MaterialIssueReceipt |  |
| ShipmentServices | unpack#ShipmentItemIssuance | Warehouse/Handheld/Pack; Warehouse/Shipping/Pack; Shared/ShipmentDetail |  |
| ShipmentServices | create#ShipmentAutoPackages | Warehouse/Handheld/Pack; Warehouse/Shipping/Pack |  |
| ShipmentServices | receive#EntireShipment | Warehouse/Handheld/Receive; Warehouse/Receiving/ReceiptDetail; Warehouse/Receiving/Receive; Warehouse/Returns/ReturnReceipt; Warehouse/Transfers/TransferShipmentDetail; Purchasing/Receiving/ShipmentDetail; Shared/ShipmentDetail |  |
| ShipmentServices | receive#ShipmentProduct | Warehouse/Handheld/Receive; Warehouse/Receiving/ReceiptDetail; Warehouse/Receiving/Receive; Warehouse/Returns/ReturnReceipt; Warehouse/Transfers/TransferShipmentDetail; Purchasing/Receiving/ShipmentDetail; Shared/ShipmentDetail |  |
| ShipmentServices | convert#ProductBoxQuantity |  |  |
| ShipmentServices | get#ShipmentPackageWeight | Warehouse/Handheld/Pack; Warehouse/Shipping/Pack |  |
| ShipmentServices | print#ShipmentLabels | Warehouse/Locations/Printers; Warehouse/Shipping/Ship; Shared/ShipmentDetail |  |
| ShipmentServices | complete#ShipmentPack | Warehouse/Handheld/Pack; Warehouse/Shipping/Pack |  |
| ShipmentServices | pack#Shipment |  |  |
| ShipmentServices | ship#Shipment | Warehouse/Shipping/Ship |  |
| ShipmentServices | deliver#Shipment | Warehouse/Shipping/PackageTracking |  |
| ShipmentServices | checkSet#ShipmentDeliveredByPackages |  |  |
| ShipmentServices | cancel#Shipment | Warehouse/Receiving/ReceiptDetail; Warehouse/Returns/ReturnReceipt; Warehouse/Returns/SupplierReturnShipment; Warehouse/Shipping/ShipmentDetail; Warehouse/Transfers/TransferShipmentDetail |  |
| ShipmentServices | reduce#QuantitiesToHandled |  |  |
| ShipmentServices | send#ShipmentStoreEmail | Warehouse/Receiving/ReceiptDetail; Warehouse/Returns/ReturnReceipt; Warehouse/Returns/SupplierReturnShipment; Warehouse/Shipping/ShipmentDetail; Warehouse/Transfers/TransferShipmentDetail; Shared/ShipmentDetail |  |
| ShipmentServices | create#ShipmentContent | Shared/RecordFiles; Warehouse/Receiving/ReceiptDetail; Warehouse/Returns/ReturnReceipt; Warehouse/Returns/SupplierReturnShipment; Warehouse/Shipping/ShipmentDetail; Warehouse/Transfers/TransferShipmentDetail; Shared/ShipmentDetail | Shared/RecordFiles |
| ShipmentServices | update#ShipmentContent | Warehouse/Receiving/ReceiptDetail; Warehouse/Returns/ReturnReceipt; Warehouse/Returns/SupplierReturnShipment; Warehouse/Shipping/ShipmentDetail; Warehouse/Transfers/TransferShipmentDetail; Shared/ShipmentDetail |  |
| ShipmentServices | save#ShipmentContentFile | Shared/RecordFiles |  |

## Work (104 services, 31 added)

| Service XML | Service | Designed in | Implemented in |
| --- | --- | --- | --- |
| EventServices | get#FullCalendarData | Commons/Home; Commons/Calendar; Commons/Calendar/Schedules; Commons/Calendar/Schedules/ResourceDetail; Comms/Home; Comms/Calls; Projects/Projects/ProjectDetail/Plan/Calendar | Commons/Calendar; Commons/Calendar/Schedules; Commons/Calendar/Schedules/ResourceDetail; Commons/Contacts/ContactDetail; Commons/Contacts/List; Commons/Home; Comms/Home; Projects/Projects/ProjectDetail/Plan/Calendar |
| EventServices | create#Event | Commons/QuickCreate; Commons/Calendar; Commons/Calendar/EventDetail; Commons/Calendar/Schedules; Commons/Calendar/Schedules/ResourceDetail; Comms/Inbox; Comms/Chat | Commons/Calendar; Commons/Calendar/Schedules; Commons/Calendar/Schedules/ResourceDetail; Commons/QuickCreate; Shared/Chatter; Projects/Projects/ProjectDetail/Plan/Calendar |
| EventServices | get#NextBusinessDay |  |  |
| EventServices | get#FutureBusinessDay | Projects/WorkItems/Timeline |  |
| GitServices | add#ProjectRepository | Projects/Projects/NewProject; Projects/Projects/ProjectDetail/Code; Projects/Code/Repositories; Projects/Code/RepositoryDetail/Settings | Projects/Code/Repositories; Projects/Code/RepositoryDetail/Settings; Projects/Projects/NewProject/Modules; Projects/Projects/ProjectDetail/Code |
| GitServices | remove#ProjectRepository | Projects/Projects/ProjectDetail/Code; Projects/Code/RepositoryDetail/Settings | Projects/Code/RepositoryDetail/Settings; Projects/Projects/ProjectDetail/Code |
| GitServices | create#ProjectRepository | Projects/Projects/NewProject; Projects/Projects/ProjectDetail/Code; Projects/Code/Repositories | Projects/Code/Repositories; Projects/Projects/NewProject/Modules; Projects/Projects/ProjectDetail/Code |
| GitServices | get#RepositoryProjects | Projects/Code/RepositoryDetail/Settings | Projects/Code/CommitDetail; Projects/Code/Compare; Projects/Code/MergeRequestDetail; Projects/Code/MergeRequestDetail/Commits; Projects/Code/MergeRequestDetail/Overview; Projects/Code/RepositoryDetail |
| GitServices | find#TaskReferences |  |  |
| GitServices | store#TaskCommit |  |  |
| GitServices | add#TaskCommit | Projects/WorkItems/WorkItemDetail; Projects/Code/CommitDetail | Projects/Code/CommitDetail |
| GitServices | remove#TaskCommit | Projects/WorkItems/WorkItemDetail; Projects/Code/CommitDetail | Projects/Code/CommitDetail; Projects/WorkItems/WorkItemDetail |
| GitServices | link#CommitReferences |  |  |
| GitServices | store#WorkEffortRef |  | Projects/Projects/ReleaseDetail |
| GitServices | add#WorkEffortRef | Projects/Projects/ReleaseDetail; Projects/WorkItems/WorkItemDetail; Projects/Code/RepositoryDetail/Tags | Projects/Code/RepositoryDetail/Tags; Projects/Projects/ReleaseDetail |
| GitServices | remove#WorkEffortRef | Projects/Projects/ProjectDetail/Code; Projects/WorkItems/WorkItemDetail; Projects/Code/RepositoryDetail/Tags | Projects/Code/RepositoryDetail/Tags; Projects/Projects/ProjectDetail/Code; Projects/Projects/ReleaseDetail; Projects/WorkItems/WorkItemDetail |
| GitServices | link#RefByName |  |  |
| GitServices | close#RefLinks |  |  |
| GitServices | apply#CommitKeywords |  |  |
| GitServices | complete#TaskFromCommit |  |  |
| GitServices | check#GitRepositoryAuthz |  |  |
| ManufacturingServices | get#ProductionRunDisplayInfo | Manufacturing/WorkOrders/WorkOrderDetail; Shared/MaterialIssueReceipt |  |
| ManufacturingServices | create#ProductionRun |  |  |
| ManufacturingServices | create#ShipmentAssemblyWorkEffort |  |  |
| ManufacturingServices | set#ProducedProductQuantity |  |  |
| ManufacturingServices | recreate#ConsumeProductsFromProduce |  |  |
| ManufacturingServices | produce#AvailableAssemblies | Warehouse/Handheld/Pack; Warehouse/Shipping/Pack; Shared/MaterialIssueReceipt |  |
| ManufacturingServices | breakDown#Assembly |  |  |
| ManufacturingServices | unissue#AssemblyComponents |  |  |
| ManufacturingServices | unissue#Component |  |  |
| ManufacturingServices | cancel#AssemblyWorkEffort |  |  |
| ManufacturingServices | get#ConsumedAssetRemaining | Manufacturing/WorkOrders/Disassembly |  |
| ManufacturingServices | get#ProducedProductComplete | Manufacturing/WorkOrders/WorkOrderDetail/Quantities; Manufacturing/WorkOrders/Disassembly |  |
| ManufacturingServices | get#ProductionRunProduceConsumeDetail | Manufacturing/WorkOrders/WorkOrderDetail/Components; Manufacturing/WorkOrders/WorkOrderDetail/Quantities; Shared/MaterialIssueReceipt |  |
| ManufacturingServices | get#ProductBomDetail | Manufacturing/BillsOfMaterials/BillOfMaterialsDetail/BillOfMaterialsExplosion |  |
| ManufacturingServices | get#ProductionRunPickInfo | Manufacturing/WorkOrders/WorkOrderDetail |  |
| MeasurementServices | get#MeasurementUomsByMeasurementType |  |  |
| ProjectServices | clone#Project | Projects/QuickCreate; Projects/Projects/NewProject; Projects/Projects/ProjectDetail; Projects/Projects/ProjectDetail/Settings; Projects/Settings/Templates | Projects/Projects/NewProject/Start; Projects/Projects/ProjectDetail; Projects/QuickProject; Projects/Requests/RequestDetail |
| ProjectServices | create#Project | Projects/QuickCreate; Projects/Projects/NewProject; Projects/Settings/Templates | Projects/Projects/NewProject/Start; Projects/Projects/ProjectDetail; Projects/QuickProject; Projects/Requests/RequestDetail |
| ProjectServices | update#Project | Projects/Projects; Projects/Projects/NewProject; Projects/Projects/ProjectDetail/Overview; Projects/Projects/ProjectDetail/Money; Projects/Projects/ProjectDetail/Settings | Projects/Projects/ProjectDetail/Settings; Projects/Requests/RequestDetail |
| ProjectServices | get#ProjectStats | Projects/Home; Projects/Projects; Projects/Projects/ProjectDetail/Overview; Projects/Projects/ProjectDetail/Money; Projects/Reports/Portfolio | Projects/Home; Projects/Projects/List; Projects/Projects/NewProject/Review; Projects/Projects/ProjectDetail; Projects/Projects/ProjectDetail/Overview; Projects/Projects/StatusReport; Projects/WorkItems/Timeline |
| ProjectServices | get#ProjectMilestoneSummary | Projects/Projects/ProjectDetail/Overview; Projects/Projects/Roadmap; Projects/Projects/MilestoneDetail; Projects/Reports/Progress |  |
| ProjectServices | get#WorkEffortChildStats | Projects/Reports/Progress |  |
| ProjectServices | get#ProjectParties | Projects/WorkItems/WorkItemDetail |  |
| ProjectServices | get#ProjectTeams | Projects/Projects/ProjectDetail/Team |  |
| ProjectServices | get#ProjectTasks | Projects/WorkItems/WorkItemDetail |  |
| ProjectServices | get#ProjectMilestones | Projects/WorkItems/WorkItemDetail |  |
| ProjectServices | create#Milestone | Projects/Projects/Roadmap | Projects/Projects/MilestoneDetail; Projects/Projects/ReleaseDetail; Projects/Projects/Roadmap |
| ProjectServices | update#Milestone | Projects/Projects/Roadmap; Projects/Projects/MilestoneDetail; Projects/Projects/ReleaseDetail; Projects/WorkItems/Backlog; Projects/WorkItems/SprintDetail | Projects/Projects/MilestoneDetail; Projects/Projects/ReleaseDetail; Projects/Projects/Roadmap |
| ShipmentWorkServices | create#ShipmentLoadShip | Warehouse/Picking/Picklists |  |
| ShipmentWorkServices | add#ShipmentToShipmentLoad | Warehouse/Picking/PicklistDetail |  |
| ShipmentWorkServices | add#OrderPartToShipmentLoad | Warehouse/Picking/PicklistDetail |  |
| ShipmentWorkServices | make#ShipmentLoadOrderConditions | Warehouse/Picking/CreatePicklists |  |
| ShipmentWorkServices | create#ShipmentLoadsForOrders | Warehouse/Picking/CreatePicklists |  |
| ShipmentWorkServices | check#ShipmentLoadStatusChange |  |  |
| ShipmentWorkServices | set#ShipmentLoadStatusOnShipmentStatus |  |  |
| ShipmentWorkServices | setAll#ShipmentLoadStatusFromShipments |  |  |
| ShipmentWorkServices | set#ShipmentLoadStatusFromShipments | Warehouse/Picking/PicklistDetail |  |
| ShipmentWorkServices | complete#ShipmentLoadShip | Warehouse/Picking/PicklistDetail |  |
| ShipmentWorkServices | close#ShipmentLoadShip | Warehouse/Picking/PicklistDetail |  |
| TaskServices | get#FullCalendarData | Commons/Calendar; Projects/Projects/ProjectDetail/Plan/Calendar | Commons/Calendar |
| TaskServices | create#Task | Projects/QuickCreate; Projects/WorkItems; Projects/WorkItems/WorkItemDetail; Projects/WorkItems/Backlog; Projects/Requests; Projects/Requests/RequestDetail | Projects/QuickCreate; Projects/WorkItems/Backlog; Projects/WorkItems/List; Projects/WorkItems/WorkItemDetail |
| TaskServices | create#SimpleTask | Commons/Panel/Today; Commons/QuickCreate; Commons/Tasks; Comms/Inbox; Comms/Chat; Shared/Chatter | Commons/Panel/Today; Commons/QuickCreate; Commons/Requests/RequestDetail; Commons/Tasks/List; Commons/Tasks/TaskDetail; Shared/Chatter; Projects/Requests/RequestDetail; Projects/WorkItems/WorkItemDetail |
| TaskServices | update#Task | Commons/Panel/Today; Commons/Tasks; Commons/Tasks/TaskDetail; Projects/Projects/MilestoneDetail; Projects/WorkItems; Projects/WorkItems/WorkItemDetail; Projects/WorkItems/Timeline; Shared/Chatter | Commons/Panel/Today; Commons/Tasks/List; Commons/Tasks/TaskDetail; Shared/Chatter; Projects/WorkItems/List; Projects/WorkItems/SprintDetail; Projects/WorkItems/WorkItemDetail |
| TaskServices | set#TaskMilestone | Projects/Projects/MilestoneDetail; Projects/WorkItems; Projects/WorkItems/WorkItemDetail |  |
| TaskServices | set#TaskDefaults |  |  |
| TaskServices | add#TaskComment | Commons/Tasks/TaskDetail |  |
| TaskServices | update#TaskComment |  |  |
| TaskServices | delete#TaskComment |  |  |
| TaskServices | add#TaskTime | Commons/Tasks/TaskDetail; Projects/WorkItems/WorkItemDetail | Commons/Tasks/TaskDetail; Projects/WorkItems/WorkItemDetail |
| TaskServices | update#TaskFromTime |  | Commons/Tasks/TaskDetail; Projects/WorkItems/WorkItemDetail |
| TaskServices | update#ProjectTimeFromTask |  |  |
| TimeServices | store#TimeEntry | Projects/Home; Projects/QuickCreate; Projects/WorkItems/WorkItemDetail; Projects/Time/MyTime; Projects/Time/TimeEntries | Commons/Tasks/TaskDetail; Projects/QuickCreate; Projects/Time/MyTime; Projects/Time/TimeEntries; Projects/Time/TimeEntries/EditEntry |
| TimeServices | create#TimeEntryClockIn | Commons/Tasks/TaskDetail; Projects/WorkItems/WorkItemDetail; Projects/Time/MyTime; Projects/Time/TimeEntries | Commons/Tasks/TaskDetail |
| TimeServices | delete#TimeEntry | Projects/WorkItems/WorkItemDetail; Projects/Time/MyTime; Projects/Time/TimeEntries | Commons/Tasks/TaskDetail; Projects/Time/MyTime; Projects/Time/TimeEntries; Projects/Time/TimeEntries/EditEntry; Projects/WorkItems/WorkItemDetail |
| TimeServices | delete#TimeEntries |  |  |
| TimeServices | store#TimeEntryWorkEffort | Projects/Time/TimeEntries |  |
| TimeServices | store#WorkEffortPartyTime | Projects/Time/TimeEntries |  |
| TimeServices | get#TeamTimesheetInfo | Projects/Time/TimeEntries |  |
| TimeServices | get#TimeEntryAmount | Projects/Time/TimeEntries |  |
| TimeServices | resetAndGet#TimeEntryRates | Projects/Time/TimeEntries |  |
| TimeServices | resetAndGet#ProjectTimeEntryRates | Projects/Projects/ProjectDetail/Time | Projects/Time/TimeEntries |
| TimeServices | get#TimeEntryRate | Projects/Time/TimeEntries | Projects/Time/TimeEntries; Projects/Time/TimeEntries/EditEntry |
| TimeServices | get#TimeEntryFacility |  |  |
| TimeServices | get#TimeEntryRiskClassInfo |  |  |
| TimeServices | find#RateAmount | Projects/Billing/Rates | Projects/Billing/Rates |
| TimeServices | find#TimeEntryRateAmount |  |  |
| TimeServices | upload#TimeSummaryFile |  |  |
| TimeServices | import#TimeSummaryFile |  |  |
| TimeServices | import#TimeSummaryRecord |  |  |
| TimeServices | upload#TimeDetailFile | Projects/Time/TimeEntries |  |
| TimeServices | import#TimeDetailFile | Projects/Time/TimeEntries |  |
| TimeServices | import#TimeDetailRecord |  |  |
| WorkEffortServices | clone#WorkEffort | Commons/Calendar/EventDetail; Commons/Tasks/TaskDetail; Projects/WorkItems/WorkItemDetail | Commons/Calendar/EventDetail; Commons/Tasks/TaskDetail; Projects/WorkItems/WorkItemDetail |
| WorkEffortServices | delete#WorkEffort | Projects/Projects/ProjectDetail/Settings; Projects/WorkItems; Projects/WorkItems/WorkItemDetail | Commons/Tasks/TaskDetail; Projects/Projects/ProjectDetail/Settings; Projects/WorkItems/List; Projects/WorkItems/WorkItemDetail |
| WorkEffortServices | add#WorkEffortParty | Commons/QuickCreate; Commons/Calendar; Commons/Calendar/EventDetail; Projects/Projects/NewProject; Projects/Projects/ProjectDetail/Team; Projects/WorkItems; Projects/WorkItems/WorkItemDetail; Manufacturing/WorkOrders/WorkOrderDetail/Overview | Commons/Calendar; Commons/Calendar/EventDetail; Commons/QuickCreate; Commons/Tasks/TaskDetail; Projects/Projects/NewProject/Start; Projects/Projects/NewProject/Team; Projects/Projects/ProjectDetail; Projects/Projects/ProjectDetail/Plan/Calendar; Projects/Projects/ProjectDetail/Team; Projects/QuickCreate; Projects/QuickProject; Projects/Requests/RequestDetail; Projects/WorkItems/Backlog; Projects/WorkItems/List; Projects/WorkItems/WorkItemDetail |
| WorkEffortServices | remove#WorkEffortParty | Commons/Calendar/EventDetail; Projects/Projects/ProjectDetail/Team; Projects/WorkItems; Manufacturing/WorkOrders/WorkOrderDetail/Overview | Projects/Projects/NewProject/Team; Projects/Projects/ProjectDetail/Team; Projects/WorkItems/List; Projects/WorkItems/SprintDetail; Projects/WorkItems/WorkItemDetail |
| WorkEffortServices | replace#WorkEffortParty | Commons/Calendar/EventDetail; Commons/Tasks; Projects/WorkItems/WorkItemDetail | Commons/Tasks/List; Commons/Tasks/TaskDetail; Shared/Chatter; Projects/Projects/List; Projects/WorkItems/List; Projects/WorkItems/SprintDetail; Projects/WorkItems/WorkItemDetail |
| WorkEffortServices | add#WorkEffortProduct | Projects/Projects/ProjectDetail/Money |  |
| WorkEffortServices | get#WorkEffortStartEnd |  | Commons/Calendar; Commons/Calendar/EventDetail; Projects/Projects/ProjectDetail/Plan/Calendar |
| WorkEffortServices | get#WorkEffortContentLocation |  |  |
| WorkEffortServices | create#WorkEffortContent | Commons/Tasks/TaskDetail; Projects/Projects/ProjectDetail/Files; Projects/WorkItems/WorkItemDetail; Shared/RecordFiles | Shared/RecordFiles |
| WorkEffortServices | update#WorkEffortContent | Projects/Projects/ProjectDetail/Files; Projects/WorkItems/WorkItemDetail |  |
| WorkEffortServices | save#WorkEffortContentFile | Commons/Tasks/TaskDetail; Shared/RecordFiles |  |

Added in the drawers-commons build (Oct 18–19, 2026), called by built screens:

| Service XML | Service | Designed in | Implemented in |
| --- | --- | --- | --- |
| CalendarServices | check#CalendarAccess |  | Commons/Calendar; Commons/Calendar/EventDetail; Commons/Settings/Calendars; Commons/Settings/Preferences |
| CalendarServices | ensure#UserDefaultCalendar |  | Commons/Calendar; Commons/Calendar/EventDetail; Commons/Calendar/Schedules; Commons/Calendar/Schedules/ResourceDetail; Commons/QuickCreate; Shared/Chatter; Projects/Projects/ProjectDetail/Plan/Calendar |
| CalendarServices | create#Calendar |  | Commons/Settings/Calendars |
| CalendarServices | update#Calendar |  | Commons/Settings/Calendars; Commons/Settings/Preferences |
| CalendarServices | delete#Calendar |  | Commons/Settings/Calendars |
| CalendarServices | share#Calendar |  | Commons/Settings/Calendars |
| CalendarServices | unshare#Calendar |  | Commons/Settings/Calendars |
| CalendarServices | get#UserCalendars |  | Commons/Calendar; Commons/Calendar/EventDetail; Commons/QuickCreate; Commons/Settings/Calendars; Commons/Settings/Preferences; Comms/Inbox/Mail; Projects/Projects/ProjectDetail/Plan/Calendar |
| CalendarServices | add#CalendarEvent |  | Commons/Calendar/EventDetail |
| CalendarServices | remove#CalendarEvent |  | Commons/Calendar/EventDetail |
| CalendarServices | subscribe#Calendar |  | Commons/Settings/Calendars |
| CalendarServices | fetch#CalendarSubscriptions |  | Commons/Settings/Calendars |
| CalendarServices | export#Calendar |  | Commons/Calendar; Commons/Settings/Calendars |
| CalendarServices | import#Calendar |  | Commons/Settings/Calendars |
| EventServices | check#EventAccess |  | Commons/Calendar; Commons/Calendar/EventDetail; Projects/Projects/ProjectDetail/Plan/Calendar |
| EventServices | get#EventIcsMaps |  | Commons/Calendar/EventDetail |
| EventServices | store#EventRecurrence |  | Commons/Calendar; Commons/Calendar/EventDetail; Projects/Projects/ProjectDetail/Plan/Calendar |
| EventServices | update#EventOccurrence |  | Commons/Calendar; Commons/Calendar/EventDetail; Projects/Projects/ProjectDetail/Plan/Calendar |
| EventServices | cancel#EventOccurrence |  | Commons/Calendar; Commons/Calendar/EventDetail; Projects/Projects/ProjectDetail/Plan/Calendar |
| EventServices | respond#EventInvitation |  | Commons/Calendar; Commons/Calendar/EventDetail; Comms/Inbox/Mail; Projects/Projects/ProjectDetail/Plan/Calendar |
| EventServices | get#InvitationDigest |  | Commons/Calendar/EventDetail |
| EventServices | send#EventInvitations |  | Commons/Calendar; Commons/Calendar/EventDetail; Commons/QuickCreate; Projects/Projects/ProjectDetail/Plan/Calendar |
| EventServices | remove#EventAttendee |  | Commons/Calendar/EventDetail |
| EventServices | get#FreeBusy |  | Commons/Calendar; Commons/Calendar/EventDetail |
| EventServices | book#Resource |  | Commons/Calendar; Commons/Calendar/EventDetail; Commons/Calendar/Schedules; Commons/Calendar/Schedules/ResourceDetail; Projects/Projects/ProjectDetail/Plan/Calendar |
| EventServices | cancel#ResourceBooking |  | Commons/Calendar/EventDetail; Commons/Calendar/Schedules; Commons/Calendar/Schedules/ResourceDetail |
| EventServices | store#WorkEffortReminders |  | Commons/Calendar; Commons/Calendar/EventDetail; Projects/Projects/ProjectDetail/Plan/Calendar |
| WorkEffortServices | link#WorkEffortRecord | Projects/QuickCreate; Projects/WorkItems/WorkItemDetail; CustomerService/Returns/WarrantyAssessment | Commons/Calendar; Commons/Calendar/EventDetail; Commons/Panel/Today; Commons/QuickCreate; Commons/Requests/RequestDetail; Commons/Tasks/List; Commons/Tasks/TaskDetail; Shared/Chatter; Projects/Projects/ProjectDetail/Plan/Calendar; Projects/QuickCreate; Projects/Requests/RequestDetail; Projects/WorkItems/Backlog; Projects/WorkItems/List; Projects/WorkItems/WorkItemDetail |
| WorkEffortServices | unlink#WorkEffortRecord | Projects/WorkItems/WorkItemDetail | Commons/Calendar/EventDetail |
| WorkEffortServices | get#UserTodayItems |  | Commons/Home; Commons/Panel/Today |
| WorkEffortServices | snooze#UserTodayItem |  | Commons/Panel/Today; Commons/Tasks/List; Commons/Tasks/TaskDetail; Projects/WorkItems/WorkItemDetail |

Added in the Projects build (Oct 21–22, 2026; impl-projects.md P1–P10), called by built screens:

| Service XML | Service | Designed in | Implemented in |
| --- | --- | --- | --- |
| GitServices | add#MergeRequestItem |  | Projects/Code/MergeRequestDetail/Overview |
| GitServices | create#ReviewComment |  | Projects/Code/MergeRequestDetail/Changes |
| GitServices | create#TaskBranch |  | Projects/WorkItems/WorkItemDetail |
| GitServices | get#MergeRequestItems |  | Projects/Code/MergeRequestDetail; Projects/Code/MergeRequestDetail/Commits; Projects/Code/MergeRequestDetail/Overview |
| GitServices | get#RepositoryDefaults |  | Projects/Settings/Code |
| GitServices | get#ReviewThreads |  | Projects/Code/MergeRequestDetail; Projects/Code/MergeRequestDetail/Changes; Projects/Code/MergeRequestDetail/Commits; Projects/Code/MergeRequestDetail/Overview |
| GitServices | get#TaskBranchName |  | Projects/WorkItems/WorkItemDetail |
| GitServices | link#MergeRequestItems |  | Projects/Code/Compare |
| GitServices | remove#MergeRequestItem |  | Projects/Code/MergeRequestDetail/Overview |
| GitServices | resolve#ReviewThread |  | Projects/Code/MergeRequestDetail/Changes |
| GitServices | search#Code |  | Projects |
| ProjectReportServices | get#PortfolioStatus |  | Projects/Reports/Portfolio |
| ProjectReportServices | get#ProgressBreakdown |  | Projects/Reports/Progress |
| ProjectReportServices | get#ProjectProfitability |  | Projects/Reports/Profitability |
| ProjectReportServices | get#SprintBurndown |  | Projects/Reports/Sprints; Projects/WorkItems/Backlog; Projects/WorkItems/SprintDetail; Projects/WorkItems/SprintReport |
| ProjectReportServices | get#SprintVelocity |  | Projects/Reports/Sprints; Projects/WorkItems/SprintReport |
| ProjectReportServices | get#TimeReport |  | Projects/Home; Projects/Reports/Time |
| ProjectReportServices | get#Utilization |  | Projects/Reports/Utilization |
| ProjectReportServices | get#WorkItemSummary |  | Projects/Reports/WorkItems |
| ProjectServices | approve#MilestoneApproval |  | Projects/Projects/MilestoneDetail |
| ProjectServices | complete#Sprint |  | Projects/WorkItems/Backlog; Projects/WorkItems/SprintDetail |
| ProjectServices | create#ProjectDocsSpace |  | Projects/Projects/NewProject/Modules; Projects/Projects/ProjectDetail/Docs |
| ProjectServices | create#ProjectTemplate |  | Projects/Projects/ProjectDetail; Projects/Settings/Templates |
| ProjectServices | create#Release |  | Projects/Projects/MilestoneDetail; Projects/Projects/ReleaseDetail; Projects/Projects/Roadmap |
| ProjectServices | create#Sprint |  | Projects/WorkItems/Backlog; Projects/WorkItems/SprintDetail |
| ProjectServices | generate#ReleaseNotes |  | Projects/Projects/ReleaseDetail |
| ProjectServices | get#ClientProjectInfo |  | Projects: 49 screens (through the ironstone.* access and find services) |
| ProjectServices | get#MilestoneApprovalAccess |  | Projects/Billing/OrderDetail; Projects/Projects/MilestoneDetail; Projects/Projects/ProjectDetail/Money |
| ProjectServices | get#MilestoneBilling |  | Projects/Billing/OrderDetail; Projects/Projects/MilestoneDetail; Projects/Projects/NewProject/Money |
| ProjectServices | get#PlanItemSummary |  | Projects/Projects/MilestoneDetail; Projects/Projects/ProjectDetail/Plan/Calendar; Projects/Projects/ReleaseDetail; Projects/Projects/Roadmap; Projects/WorkItems/Timeline |
| ProjectServices | get#ProjectActivity |  | Projects/Home; Projects/Projects/ProjectDetail/Overview; Projects/Projects/StatusReport |
| ProjectServices | get#ProjectEstimate |  | Projects/Projects/EstimatePrint |
| ProjectServices | get#ProjectHomeCounts |  | Projects/Home |
| ProjectServices | get#ProjectMoneySummary |  | Projects/Projects/ProjectDetail/Money |
| ProjectServices | get#ProjectSettings |  | Projects: 27 screens (through the ironstone.* access and find services) |
| ProjectServices | get#ProjectTemplates |  | Projects/Projects/NewProject/Start; Projects/Settings/Templates |
| ProjectServices | get#ProjectTodayItems |  | Projects |
| ProjectServices | get#ReleaseNotes |  | Projects/Projects/ReleaseDetail |
| ProjectServices | get#SprintDefaults |  | Projects/WorkItems/Backlog |
| ProjectServices | get#TimelineData |  | Projects/WorkItems/Timeline |
| ProjectServices | get#UnbilledSummary |  | Projects/Billing/Unbilled; Projects/Billing/Unbilled/CreateInvoice; Projects/Home; Projects/Projects/NewProject/Review; Projects/Projects/ProjectDetail; Projects/Projects/StatusReport |
| ProjectServices | get#VisibleProjectInfo |  | Projects: 77 screens (through the ironstone.* access and find services) |
| ProjectServices | get#WorkItemTree |  | Projects: 16 screens (through the ironstone.* access and find services) |
| ProjectServices | link#ProjectOrderItem |  | Projects/Projects/NewProject/Money; Projects/Projects/ProjectDetail/Money |
| ProjectServices | post#ProjectUpdate |  | Projects/Projects/ProjectDetail |
| ProjectServices | publish#ReleaseNotes |  | Projects/Projects/ReleaseDetail |
| ProjectServices | refuse#MilestoneApproval |  | Projects/Projects/MilestoneDetail |
| ProjectServices | release#Release |  | Projects/Projects/ReleaseDetail |
| ProjectServices | send#EstimateForApproval |  | Projects/Billing/OrderDetail; Projects/Projects/ProjectDetail/Money |
| ProjectServices | setup#ClientProjectInfo |  | Projects |
| ProjectServices | start#Sprint |  | Projects/WorkItems/Backlog; Projects/WorkItems/SprintDetail |
| ProjectServices | store#MilestoneShare |  | Projects/Projects/MilestoneDetail |
| ProjectServices | store#ProjectSetting |  | Projects/Projects/NewProject/Modules; Projects/Projects/NewProject/Money; Projects/Projects/ProjectDetail/Money; Projects/Projects/ProjectDetail/Settings; Projects/Settings/Intake; Projects/WorkItems/Backlog |
| ProjectServices | store#ReleaseNotes |  | Projects/Projects/ReleaseDetail |
| ProjectServices | update#Sprint |  | Projects/WorkItems/Backlog; Projects/WorkItems/SprintDetail |
| ResourceServices | approve#Allocation |  | Projects/Projects/ProjectDetail/Team; Projects/Resources/Allocations; Projects/Resources/Allocations/Staff; Projects/Resources/TeamPlanner |
| ResourceServices | cancel#Allocation |  | Projects/Projects/ProjectDetail/Team; Projects/Resources/Allocations; Projects/Resources/Allocations/Staff; Projects/Resources/TeamPlanner |
| ResourceServices | create#Allocation |  | Projects/Projects/NewProject/Team; Projects/Projects/ProjectDetail/Team; Projects/Resources/Allocations/EditAllocation; Projects/Resources/TeamPlanner |
| ResourceServices | find#Allocations |  | Projects/Home; Projects/Projects/NewProject/Team; Projects/Projects/ProjectDetail/Team; Projects/Resources/Allocations; Projects/Resources/Allocations/Staff; Projects/Resources/PersonDetail/Allocations; Projects/Resources/TeamPlanner |
| ResourceServices | find#StaffingCandidates |  | Projects/Billing/Rates; Projects/Projects/ProjectDetail/Team; Projects/Resources/Allocations/EditAllocation; Projects/Resources/Allocations/Staff; Projects/Resources/TeamPlanner |
| ResourceServices | get#AllocationAccess |  | Projects/Projects/NewProject/Team; Projects/Projects/ProjectDetail/Team; Projects/Resources/Allocations/EditAllocation; Projects/Resources/Allocations/Staff; Projects/Resources/TeamPlanner |
| ResourceServices | get#TeamPlan |  | Projects/Resources/PersonDetail/Capacity; Projects/Resources/PersonDetail/Overview; Projects/Resources/TeamPlanner |
| ResourceServices | reject#Allocation |  | Projects/Projects/ProjectDetail/Team; Projects/Resources/Allocations; Projects/Resources/Allocations/Staff; Projects/Resources/TeamPlanner |
| ResourceServices | staff#Allocation |  | Projects/Projects/ProjectDetail/Team; Projects/Resources/Allocations; Projects/Resources/Allocations/Staff; Projects/Resources/TeamPlanner |
| ResourceServices | update#Allocation |  | Projects/Projects/NewProject/Team; Projects/Projects/ProjectDetail/Team; Projects/Resources/Allocations/EditAllocation; Projects/Resources/TeamPlanner |
| TaskServices | add#TaskDependency |  | Projects/WorkItems/Timeline; Projects/WorkItems/WorkItemDetail |
| TaskServices | add#TaskLabel |  | Projects/WorkItems/List; Projects/WorkItems/SprintDetail; Projects/WorkItems/WorkItemDetail |
| TaskServices | get#TaskStatusFlow |  | Projects/WorkItems/WorkItemDetail |
| TaskServices | move#Task |  | Projects/WorkItems/List; Projects/WorkItems/SprintDetail; Projects/WorkItems/WorkItemDetail |
| TaskServices | remove#TaskDependency |  | Projects/WorkItems/Timeline |
| TaskServices | remove#TaskLabel |  | Projects/WorkItems/List; Projects/WorkItems/SprintDetail; Projects/WorkItems/WorkItemDetail |
| TaskServices | set#TaskBacklogRank |  | Projects/WorkItems/Backlog |
| TaskServices | set#TaskDates |  | Projects/Projects/ProjectDetail/Plan/Calendar; Projects/WorkItems/Timeline |
| TaskServices | set#TaskPlanItem |  | Projects/Projects/MilestoneDetail; Projects/Projects/ReleaseDetail; Projects/WorkItems/List; Projects/WorkItems/SprintDetail; Projects/WorkItems/WorkItemDetail |
| TaskServices | set#TaskRank |  | Projects/QuickCreate; Projects/WorkItems/Backlog; Projects/WorkItems/List; Projects/WorkItems/WorkItemDetail |
| TaskServices | set#TaskRecurrence |  | Projects/WorkItems/List; Projects/WorkItems/SprintDetail; Projects/WorkItems/WorkItemDetail |
| TaskServices | set#TaskSprint |  | Projects/QuickCreate; Projects/WorkItems/Backlog; Projects/WorkItems/List; Projects/WorkItems/SprintDetail; Projects/WorkItems/WorkItemDetail |
| TaskServices | set#TaskStatus |  | Projects/WorkItems/List; Projects/WorkItems/SprintDetail; Projects/WorkItems/WorkItemDetail |
| TimeServices | find#TimeEntries |  | Projects/Resources/PersonDetail/Time; Projects/Time/TeamTimesheet; Projects/Time/TimeEntries; Projects/Time/TimeEntries/EditEntry |
| TimeServices | import#TimeEntryCsv |  | Projects/Time/Import/Preview; Projects/Time/Import/Result; Projects/Time/Import/Source |
| TimesheetServices | approve#Timesheet |  | Projects/Time/MyTime; Projects/Time/TimesheetDetail |
| TimesheetServices | find#Timesheets |  | Projects/Home; Projects/Resources/PersonDetail/Time; Projects/Time/Timesheets |
| TimesheetServices | get#PartyTimesheet |  | Projects/QuickCreate; Projects/Time/MyTime; Projects/Time/TimeEntries/EditEntry |
| TimesheetServices | get#PartyWeek |  | Projects/Time/MyTime |
| TimesheetServices | get#TimeKeepers |  | Projects/Billing/Rates; Projects/Projects/ProjectDetail/Team; Projects/Resources/Allocations/EditAllocation; Projects/Resources/TeamPlanner; Projects/Time/Import/Source; Projects/Time/MyTime; Projects/Time/TimeEntries; Projects/Time/TimeEntries/EditEntry |
| TimesheetServices | get#Timer | Manufacturing/ShopFloor; Manufacturing/ShopFloor/OperationExecution; Manufacturing/WorkOrders/WorkOrderDetail/Time | Projects/Home; Projects/Time/MyTime |
| TimesheetServices | get#TimesheetAccess |  | Projects/QuickCreate; Projects/Resources/PersonDetail/Time; Projects/Time/MyTime; Projects/Time/TeamTimesheet; Projects/Time/TimeEntries; Projects/Time/TimeEntries/EditEntry |
| TimesheetServices | get#TimesheetPolicy |  | Projects/Resources/PersonDetail/Time; Projects/Settings/Time; Projects/Time/MyTime; Projects/Time/TeamTimesheet; Projects/Time/TimeEntries; Projects/Time/TimeEntries/EditEntry |
| TimesheetServices | get#TimesheetSummary |  | Projects/Time/TimesheetDetail; Projects/Time/TimesheetPrint |
| TimesheetServices | get#WeekRange |  | Projects/Resources/PersonDetail/Time; Projects/Time/MyTime; Projects/Time/TeamTimesheet; Projects/Time/TimeEntries; Projects/Time/TimeEntries/EditEntry |
| TimesheetServices | get#WorkTypes |  | Projects/Billing/Rates; Projects/QuickCreate; Projects/Settings/Time; Projects/Time/MyTime; Projects/Time/TimeEntries; Projects/Time/TimeEntries/EditEntry |
| TimesheetServices | reopen#Timesheet |  | Projects/Time/MyTime; Projects/Time/TimesheetDetail |
| TimesheetServices | return#Timesheet |  | Projects/Time/MyTime; Projects/Time/TimesheetDetail |
| TimesheetServices | send#MissingTimeReminders |  | Projects/Time/Timesheets |
| TimesheetServices | start#Timer | Manufacturing/ShopFloor/OperationExecution; Manufacturing/WorkOrders/WorkOrderDetail/Time | Projects/Home; Projects/Time/MyTime; Projects/WorkItems/WorkItemDetail |
| TimesheetServices | stop#Timer | Manufacturing/ShopFloor/OperationExecution; Manufacturing/WorkOrders/WorkOrderDetail/Time | Projects/Home; Projects/Time/MyTime; Projects/WorkItems/WorkItemDetail |
| TimesheetServices | store#TimesheetPolicy |  | Projects/Settings/Time |
| TimesheetServices | store#WorkTypes |  | Projects/Settings/Time |
| TimesheetServices | submit#Timesheet |  | Projects/Time/MyTime; Projects/Time/TimesheetDetail |
| TimesheetServices | update#Timer | Manufacturing/ShopFloor/OperationExecution | Projects/Time/MyTime |
| WorkItemImportServices | import#WorkItems |  | Projects/WorkItems/Import/Result |
| WorkItemImportServices | parse#WorkItemFile |  | Projects/WorkItems/Import/Mapping; Projects/WorkItems/Import/Source |
| WorkItemImportServices | preview#WorkItems |  | Projects/WorkItems/Import/Preview |

## General (2 services)

| Service XML | Service | Designed in | Implemented in |
| --- | --- | --- | --- |
| GeneralServices | lookup#ById | Commons/Calendar/EventDetail; Commons/Knowledge; Comms/Inbox; Comms/Chat | Commons; Commons/Calendar/EventDetail; Commons/Knowledge; Commons/Notes; Comms/Chat; Comms/Inbox/Mail; Comms/Inbox/MessageDetail; Shared/Chatter; Projects/Projects/ProjectDetail/Docs; Projects/Requests/RequestDetail |
| GeneralServices | search#MantleFiltered |  |  |

### Products implementation, Oct 29, 2026

Products uses native guarded replacements for raw catalog writes, bulk assignments, content revisions and variant previews. Legacy service rows above stay blank where no BOSS screen calls that legacy API; a Designed in entry alone is not an implementation claim. Other apps' shared mounts remain later. The following public native entry points are reached by built Products screens; internal per-row workers and calls made only by another Mantle service are not claimed here.

| Service XML | Service | Designed in | Implemented in |
| --- | --- | --- | --- |
| product/CatalogRecordServices | store#Product |  | Shared/Product360; Products/Products/List; Shared/ProductImport |
| product/CatalogRecordServices | store#CatalogRow |  | Shared/Product360; Products/Products/List; Shared/ProductImport |
| product/CatalogRecordServices | ensure#CatalogAssignment |  | Shared/Product360; Products/Products/List; Shared/ProductImport |
| product/ContentServices | find#CatalogContents |  | Shared/Documents; Shared/DocumentDetail; Shared/Translations; Products/Categories/CategoryDetail/Content |
| product/ContentServices | get#CatalogContent |  | Shared/Documents; Shared/DocumentDetail; Shared/Translations; Products/Categories/CategoryDetail/Content |
| product/ContentServices | store#CatalogContent |  | Shared/Documents; Shared/DocumentDetail; Shared/Translations; Products/Categories/CategoryDetail/Content |
| product/ContentServices | upload#CatalogContents |  | Shared/Documents; Shared/DocumentDetail; Shared/Translations; Products/Categories/CategoryDetail/Content |
| product/ContentServices | restore#CatalogContent |  | Shared/Documents; Shared/DocumentDetail; Shared/Translations; Products/Categories/CategoryDetail/Content |
| product/ContentServices | find#CatalogTranslations |  | Shared/Documents; Shared/DocumentDetail; Shared/Translations; Products/Categories/CategoryDetail/Content |
| product/ContentServices | store#CatalogTranslation |  | Shared/Documents; Shared/DocumentDetail; Shared/Translations; Products/Categories/CategoryDetail/Content |
| product/ContentServices | get#CatalogContentResource |  | Shared/Documents; Shared/DocumentDetail; Shared/Translations; Products/Categories/CategoryDetail/Content |
| product/ContentServices | get#ProductDatasheet |  | Shared/Documents; Shared/DocumentDetail; Shared/Translations; Products/Categories/CategoryDetail/Content |
| product/ProductImportServices | get#CatalogImportKinds |  | Shared/ProductImport; Products/ProductImport |
| product/ProductImportServices | stage#CatalogImport |  | Shared/ProductImport; Products/ProductImport |
| product/ProductImportServices | configure#CatalogImport |  | Shared/ProductImport; Products/ProductImport |
| product/ProductImportServices | validate#CatalogImport |  | Shared/ProductImport; Products/ProductImport |
| product/ProductImportServices | apply#CatalogImport |  | Shared/ProductImport; Products/ProductImport |
| product/ProductImportServices | get#CatalogImport |  | Shared/ProductImport; Products/ProductImport |
| product/ProductImportServices | get#CatalogImportReport |  | Shared/ProductImport; Products/ProductImport |
| product/ProductImportServices | get#CatalogImportSample |  | Shared/ProductImport; Products/ProductImport |
| product/CatalogCheckServices | validate#Catalog |  | Shared/CatalogChecks; Products/CatalogChecks; Products/Home |
| product/CatalogCheckServices | get#CatalogChecks |  | Shared/CatalogChecks; Products/CatalogChecks; Products/Home |
| product/PriceServices | store#ProductPrice |  | Shared/Prices; Shared/PriceListDetail; Shared/PriceExplain; Shared/SupplierPrices |
| product/PriceServices | replace#ProductPrice |  | Shared/Prices; Shared/PriceListDetail; Shared/PriceExplain; Shared/SupplierPrices |
| product/PriceServices | expire#ProductPrice |  | Shared/Prices; Shared/PriceListDetail; Shared/PriceExplain; Shared/SupplierPrices |
| product/PriceServices | find#ProductPriceLists |  | Shared/Prices; Shared/PriceListDetail; Shared/PriceExplain; Shared/SupplierPrices |
| product/PriceServices | find#ProductPriceRules |  | Shared/Prices; Shared/PriceListDetail; Shared/PriceExplain; Shared/SupplierPrices |
| product/PriceServices | store#ProductPriceList |  | Shared/Prices; Shared/PriceListDetail; Shared/PriceExplain; Shared/SupplierPrices |
| product/PriceServices | store#ProductPriceRule |  | Shared/Prices; Shared/PriceListDetail; Shared/PriceExplain; Shared/SupplierPrices |
| product/PriceServices | get#ProductPriceListPublication |  | Shared/Prices; Shared/PriceListDetail; Shared/PriceExplain; Shared/SupplierPrices |
| product/PriceServices | publish#ProductPriceList |  | Shared/Prices; Shared/PriceListDetail; Shared/PriceExplain; Shared/SupplierPrices |
| product/PriceServices | retire#ProductPriceList |  | Shared/Prices; Shared/PriceListDetail; Shared/PriceExplain; Shared/SupplierPrices |
| product/PriceServices | get#EffectivePriceList |  | Shared/Prices; Shared/PriceListDetail; Shared/PriceExplain; Shared/SupplierPrices |
| product/ProductServices | store#ProductPackaging |  | Shared/Packaging; Shared/Product360/Packaging; Shared/Product360/Identifiers |
| product/ProductServices | find#ProductPackaging |  | Shared/Packaging; Shared/Product360/Packaging; Shared/Product360/Identifiers |
| product/ProductServices | resolve#ScannedProduct |  | Shared/Packaging; Shared/Product360/Packaging; Shared/Product360/Identifiers |
| product/ProductServices | validate#ProductIdentifier |  | Shared/Packaging; Shared/Product360/Packaging; Shared/Product360/Identifiers |
| product/LabelServices | prepare#ProductLabels |  | Shared/Labels; Products/Units/Labels |
| product/LabelServices | render#ProductLabels |  | Shared/Labels; Products/Units/Labels |
| product/LabelServices | get#ProductLabels |  | Shared/Labels; Products/Units/Labels |
| product/LabelServices | get#ProductLabelResource |  | Shared/Labels; Products/Units/Labels |
| product/LabelServices | get#ProductLabelPrint |  | Shared/Labels; Products/Units/Labels |
| product/CostServices | find#ProductStandardCosts |  | Shared/StandardCosts; Shared/CostRollup; Shared/CostHistory; Shared/PriceExplain |
| product/CostServices | get#ProductStandardCost |  | Shared/StandardCosts; Shared/CostRollup; Shared/CostHistory; Shared/PriceExplain |
| product/CostServices | store#ProductStandardCost |  | Shared/StandardCosts; Shared/CostRollup; Shared/CostHistory; Shared/PriceExplain |
| product/CostServices | store#StandardCostComponent |  | Shared/StandardCosts; Shared/CostRollup; Shared/CostHistory; Shared/PriceExplain |
| product/CostServices | clone#ProductStandardCost |  | Shared/StandardCosts; Shared/CostRollup; Shared/CostHistory; Shared/PriceExplain |
| product/CostServices | approve#ProductStandardCost |  | Shared/StandardCosts; Shared/CostRollup; Shared/CostHistory; Shared/PriceExplain |
| product/CostServices | preview#ProductCostRollup |  | Shared/StandardCosts; Shared/CostRollup; Shared/CostHistory; Shared/PriceExplain |
| product/CostServices | save#ProductCostRollup |  | Shared/StandardCosts; Shared/CostRollup; Shared/CostHistory; Shared/PriceExplain |
| product/CostServices | get#StandardCostPrint |  | Shared/StandardCosts; Shared/CostRollup; Shared/CostHistory; Shared/PriceExplain |
| product/CostServices | get#ProductMargin |  | Shared/StandardCosts; Shared/CostRollup; Shared/CostHistory; Shared/PriceExplain |
| product/BomServices | find#Boms |  | Shared/BillOfMaterialsDetail; Shared/BillOfMaterialsExplosion; Shared/BillOfMaterialsCompare; Shared/WhereUsed |
| product/BomServices | get#BomDetail |  | Shared/BillOfMaterialsDetail; Shared/BillOfMaterialsExplosion; Shared/BillOfMaterialsCompare; Shared/WhereUsed |
| product/BomServices | store#Bom |  | Shared/BillOfMaterialsDetail; Shared/BillOfMaterialsExplosion; Shared/BillOfMaterialsCompare; Shared/WhereUsed |
| product/BomServices | store#BomItem |  | Shared/BillOfMaterialsDetail; Shared/BillOfMaterialsExplosion; Shared/BillOfMaterialsCompare; Shared/WhereUsed |
| product/BomServices | validate#BomDraft |  | Shared/BillOfMaterialsDetail; Shared/BillOfMaterialsExplosion; Shared/BillOfMaterialsCompare; Shared/WhereUsed |
| product/BomServices | release#BomDraft |  | Shared/BillOfMaterialsDetail; Shared/BillOfMaterialsExplosion; Shared/BillOfMaterialsCompare; Shared/WhereUsed |
| product/BomServices | get#BomExplosion |  | Shared/BillOfMaterialsDetail; Shared/BillOfMaterialsExplosion; Shared/BillOfMaterialsCompare; Shared/WhereUsed |
| product/BomServices | compare#BomDates |  | Shared/BillOfMaterialsDetail; Shared/BillOfMaterialsExplosion; Shared/BillOfMaterialsCompare; Shared/WhereUsed |
| product/BomServices | get#BomWhereUsed |  | Shared/BillOfMaterialsDetail; Shared/BillOfMaterialsExplosion; Shared/BillOfMaterialsCompare; Shared/WhereUsed |
| product/BomServices | import#LegacyBom |  | Shared/BillOfMaterialsDetail; Shared/BillOfMaterialsExplosion; Shared/BillOfMaterialsCompare; Shared/WhereUsed |
| work/RoutingServices | find#Routings |  | Shared/RoutingDetail; Shared/BillOfMaterialsDetail |
| work/RoutingServices | get#RoutingDetail |  | Shared/RoutingDetail; Shared/BillOfMaterialsDetail |
| work/RoutingServices | store#Routing |  | Shared/RoutingDetail; Shared/BillOfMaterialsDetail |
| work/RoutingServices | store#RoutingOperation |  | Shared/RoutingDetail; Shared/BillOfMaterialsDetail |
| work/RoutingServices | store#RoutingResource |  | Shared/RoutingDetail; Shared/BillOfMaterialsDetail |
| work/RoutingServices | validate#RoutingDraft |  | Shared/RoutingDetail; Shared/BillOfMaterialsDetail |
| work/RoutingServices | release#RoutingDraft |  | Shared/RoutingDetail; Shared/BillOfMaterialsDetail |
| work/RoutingServices | store#WorkCenter |  | Shared/RoutingDetail; Shared/BillOfMaterialsDetail |
| work/RoutingServices | store#WorkCenterRate |  | Shared/RoutingDetail; Shared/BillOfMaterialsDetail |
| facility/FacilityServices | get#ProductFacilityPolicy |  | Shared/InventoryAvailability/Policy; Products/Products/Product360/Stock/Policy |
| facility/FacilityServices | store#ProductFacilityPolicy |  | Shared/InventoryAvailability/Policy; Products/Products/Product360/Stock/Policy |
| facility/WarehousePolicyServices | resolve#WarehousePolicy |  | Shared/InventoryAvailability/Policy; Products/Products/Product360/Stock/Policy |
| facility/WarehousePolicyServices | store#TrackingPolicy |  | Shared/InventoryAvailability/Policy; Products/Products/Product360/Stock/Policy |
| ledger/AssetBookServices | preview#Revaluation |  | Shared/InventoryValuation (Products mount) |
| ledger/AssetBookServices | get#RevaluationPreview |  | Shared/InventoryValuation (Products mount) |
| ledger/AssetBookServices | post#Revaluation |  | Shared/InventoryValuation (Products mount) |
| ledger/AssetBookServices | get#RevaluationContext |  | Shared/InventoryValuation (Products mount) |
| product/IdentifierServices | get#IdentifierContext |  | Shared/IdentificationTypes; Products/Settings/IdentificationTypes |
| product/IdentifierServices | store#IdentifierPolicy |  | Shared/IdentificationTypes; Products/Settings/IdentificationTypes |
| product/PriceServices | get#PricingSettings |  | Products/Settings/PricingSettings; Shared/Prices; Shared/SupplierPrices |
| product/PriceServices | store#PricingSettings |  | Products/Settings/PricingSettings; Shared/Prices; Shared/SupplierPrices |
