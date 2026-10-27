# mr-marble form inventory

Per-form inventory of the mr-marble component, for tracking form-level feature parity in IronStone BOSS.

- Source: `runtime/component/mr-marble/screen/` (current working tree).
- Form: every `<form-single>` and `<form-list>` element, including forms nested in dialogs, sections and includes.
- The **Designed in** column is filled when a design file is reviewed with the IronStone screen path(s) whose forms cover it (`—` when deliberately not carried forward, with the reason in that design's Decided table); the **Implemented in** column is filled during implementation with the screen and form that exist. See [design-doc-guide.md](design-doc-guide.md) §9.
- **Implemented in** was filled on Oct 19, 2026 from the drawers-commons build, by the path of the built screen that carries each form of its **Designed in** cell: a designed screen built as a parent with subscreens is its default subscreen (`Commons/Tasks/List`, `Commons/Requests/List`, `Commons/Contacts/List`, `Comms/Inbox/Mail`); the contact record (`template/ContactRecord.xml`) is on both `Commons/Contacts/ContactDetail` and the main pane of `Commons/Contacts/List`; a space's settings are on `Commons/Knowledge/SpaceDetail`, and a page's attachments are Knowledge's own, not record files; a `—` row stays `—`. Filled: the 101 rows designed with a path (wiki `ClonePage` since Oct 19, Knowledge's Duplicate page), and the 5 `—` rows. The update note and comment forms the design gives to `Shared/Chatter` (`UpdateNoteForm`, the `…CommentUpdate` `ReplyCommentForm`) are Chatter's edit of a note in place (since Oct 19). Rows that other design files are to fill stay blank.
- **Designed in** for [design-projects.md](design-projects.md) was filled on Oct 21, 2026 from that design's §13.1 and the **Derived from** cells of its form summaries, each screen by the path the design gives it: a project's tab is a subscreen of `Projects/Projects/ProjectDetail`, and a screen the design mounts in a tab with the project fixed (WorkItems, Requests, TimeEntries) is listed by its own path. Paths are added after what an earlier design wrote. The rows of the git forms added to SimpleScreens on Oct 20 came with it: `Project/EditRepositories`, `ProjectSummary`'s `ViewGitRepositoryList` and `ViewGitTagList`, `Task/EditSource` and `MyAccount/User/GitAccess` (`Project/GitCommit` has no forms); their **Implemented in** is blank. The My Account expense forms other than the worker invoice stay blank for design-people.
- **Implemented in** for [design-projects.md](design-projects.md) was filled on Oct 22, 2026 at the end of the Projects build (impl-projects.md P11), by the path of the built screen that carries each form of its Projects **Designed in** paths, after what Commons wrote: a section designed as one screen is its default subscreen (`Projects/Projects/List`, `Projects/WorkItems/List`, `Projects/Requests/List`), the project form of QuickCreate is `Projects/QuickProject` (impl-projects.md F8), a tab mounted from another screen keeps the tab's path (`Projects/Projects/ProjectDetail/Time`, `…/Docs`), and the shared screens keep their Projects mount (`Projects/WorkItems/WorkItemDetail`, `Projects/Requests/RequestDetail`). Twelve rows stay blank for the parts impl-projects.md §7 leaves for later: the worker and contractor invoices (My Account's `WorkerInvoice` and Unbilled's worker forms), a manager's clock-in for another person (`PartyTimeEntries` `ClockInForm`), request items (`EditRequestItems`), and wiki pages linked to a work item or a request (`EditWikiPages` on WorkItemDetail and RequestDetail; the Docs tab links pages to a project).
- **Designed in** for the six core app drafts and [design-crosscut.md](design-crosscut.md) was extended on Oct 27, 2026 from their form/service coverage review. New mappings are additive to Commons and Projects; **Implemented in** is unchanged. Proposed services and definitions inside XML comments are not counted as active existing services.

- **PASS design follow-up (Oct 27, 2026):** [design-forum.md](../../mr-pass/plan/design-forum.md) designs new public Forum screens over existing Mailbox services; there are no SimpleScreens Forum forms to map. WikiBlogs/EditWikiBlog remain future Blog/Publishing baselines, with full screen design deferred. Their Designed in and Implemented in cells remain unchanged; shared content ownership is described in Forum §13.3.

## MyAccount (49 forms)

| Screen XML | Form | Designed in | Implemented in |
| --- | --- | --- | --- |
| EditExpenseInvoice | WorkerInvoice | Projects/Time/MyTime |  |
| EditExpenseInvoice | EditInvoice |  |  |
| EditExpenseInvoiceItems | CreateInvoiceItem |  |  |
| EditExpenseInvoiceItems | EditInvoiceItems |  |  |
| FindExpenseInvoice | CreateInvoice |  |  |
| FindExpenseInvoice | WorkerInvoice | Projects/Time/MyTime |  |
| FindExpenseInvoice | InvoiceList |  |  |
| Account | ChangePasswordForm | Commons/Settings/Account | Commons/Settings/Account |
| Account | SecondFactorSendForm | Commons/Settings/Account | Commons/Settings/Account |
| Account | EditUser | Commons/Settings/Account | Commons/Settings/Account |
| Account | CreateUserAuthcFactorTotp | Commons/Settings/Account | Commons/Settings/Account |
| Account | CreateUserAuthcFactorSingleUse | Commons/Settings/Account | Commons/Settings/Account |
| Account | CreateUserAuthcFactorEmail | Commons/Settings/Account | Commons/Settings/Account |
| Account | CreateUserAuthcFactorSms | Commons/Settings/Account | Commons/Settings/Account |
| Account | UserAuthcFactorList | Commons/Settings/Account | Commons/Settings/Account |
| EventDetail | UpdateEvent | Commons/Calendar/EventDetail | Commons/Calendar/EventDetail |
| EventDetail | NewNoteForm | Commons/Calendar/EventDetail; Shared/Chatter | Commons/Calendar/EventDetail; Shared/Chatter |
| EventDetail | UpdateNoteForm | Commons/Calendar/EventDetail; Shared/Chatter | Commons/Calendar/EventDetail; Shared/Chatter |
| EventDetail | AddPartyAssignForm | Commons/Calendar/EventDetail | Commons/Calendar/EventDetail |
| EventDetail | UpdateAssignForm | Commons/Calendar/EventDetail | Commons/Calendar/EventDetail |
| EventDetail | AddEquipment | Commons/Calendar/EventDetail | Commons/Calendar/EventDetail |
| EventDetail | EquipmentList | Commons/Calendar/EventDetail | Commons/Calendar/EventDetail |
| MyCalendar | NewEventForm | Commons/Calendar; Commons/QuickCreate | Commons/Calendar; Commons/QuickCreate |
| UpdateContactInfo | ShippingInfo | Commons/Settings/Account | Commons/Settings/Account |
| GitAccess | CreateAccessTokenForm | Projects/Code/GitAccess | Projects/Code/GitAccess |
| GitAccess | AccessTokenList | Projects/Code/GitAccess | Projects/Code/GitAccess |
| GitAccess | AddSshKeyForm | Projects/Code/GitAccess | Projects/Code/GitAccess |
| GitAccess | SshKeyList | Projects/Code/GitAccess | Projects/Code/GitAccess |
| EditMessage | ReplyMessageForm | Comms/Inbox/Compose | Comms/Inbox/Compose |
| EditMessage | MessageForm | Comms/Inbox/Compose | Comms/Inbox/Compose |
| EditMessage | AddPurposeForm | — | — |
| EditMessage | PurposesForm | — | — |
| FindMessage | CreateMessage | Comms/Inbox/Compose | Comms/Inbox/Compose |
| FindMessage | MessageList | Comms/Inbox | Comms/Inbox/Mail |
| SingleMessage | ReplyMessageForm | Comms/Inbox/Compose; Shared/Chatter | Comms/Inbox/Compose; Shared/Chatter |
| Notifications | NotificationTopicList | Commons/Settings/Notifications | Commons/Settings/Notifications |
| Notifications | NotificationList | Commons/Notifications; Commons/Panel/Notifications | Commons/Notifications; Commons/Panel/Notifications |
| EditRequest | EditRequest | Commons/Requests/RequestDetail; Projects/Requests/RequestDetail; ServicePortal/CustomerCase | Commons/Requests/RequestDetail; Projects/Requests/RequestDetail |
| EditRequest | UpdatePartyForm | Commons/Requests/RequestDetail; Projects/Requests/RequestDetail; ServicePortal/CustomerCase | Commons/Requests/RequestDetail; Projects/Requests/RequestDetail |
| RequestCommentReply | ReplyCommentForm | Commons/Requests/RequestDetail; Shared/Chatter; ServicePortal/CustomerCase | Commons/Requests/RequestDetail; Shared/Chatter |
| RequestCommentUpdate | ReplyCommentForm | Commons/Requests/RequestDetail; Shared/Chatter; ServicePortal/CustomerCase | Commons/Requests/RequestDetail; Shared/Chatter |
| MyRequests | NewRequestForm | Commons/Requests; Commons/QuickCreate; ServicePortal/NewCustomerCase | Commons/Requests/List; Commons/QuickCreate |
| MyRequests | ListRequests | Commons/Home; Commons/Requests; ServicePortal/MyCases | Commons/Home; Commons/Requests/List |
| ScheduledFinds | ScreenScheduledList |  |  |
| EditScheduledFind | EditScreenScheduled |  |  |
| MyTasks | NewTaskForm | Commons/Tasks; Commons/QuickCreate | Commons/Tasks/List; Commons/QuickCreate |
| MyTasks | MyTasks | Commons/Panel/Today; Commons/Home; Commons/Tasks; Projects/Home | Commons/Panel/Today; Commons/Home; Commons/Tasks/List; Projects/Home |
| TaskDetail | UpdateEvent | Commons/Tasks/TaskDetail | Commons/Tasks/TaskDetail |
| TimeEntries | TimeEntryList | Commons/Tasks/TaskDetail; Projects/WorkItems/WorkItemDetail; Projects/Time/MyTime; Projects/Time/TimeEntries | Commons/Tasks/TaskDetail; Projects/WorkItems/WorkItemDetail; Projects/Time/MyTime; Projects/Time/TimeEntries |

## Accounting (166 forms)

| Screen XML | Form | Designed in | Implemented in |
| --- | --- | --- | --- |
| BudgetAccountsEntry | GlAccountBudgetList | Accounting/Budgets/BudgetDetail |  |
| BudgetReport | GlAccountBudgetList | Accounting/Reports/BudgetVariance |  |
| EditBudget | UpdateBudgetForm | Accounting/Budgets/BudgetDetail |  |
| EditBudgetItems | AddItemForm | Accounting/Budgets/BudgetDetail |  |
| EditBudgetItems | BudgetItemList | Accounting/Budgets/BudgetDetail |  |
| FindBudget | NewBudgetForm | Accounting/Budgets/Budgets |  |
| FindBudget | BudgetList | Accounting/Budgets/Budgets |  |
| EditFinancialAccount | StatementForm | Accounting/Banking/FinancialAccountDetail |  |
| EditFinancialAccount | UpdateFinancialAccountForm | Accounting/Banking/FinancialAccountDetail |  |
| FinancialAccountTrans | AdjustFinancialAccount | Accounting/Banking/FinancialAccountDetail |  |
| FinancialAccountTrans | TransactionList | Accounting/Banking/FinancialAccountDetail |  |
| FindFinancialAccount | NewFinancialAccountForm | Accounting/Banking/FinancialAccounts |  |
| FindFinancialAccount | FinancialAccountList | Accounting/Banking/FinancialAccounts |  |
| FindJournal | CreateGlJournal | Accounting/GeneralLedger/JournalBatches |  |
| FindJournal | TransactionList | Accounting/GeneralLedger/JournalBatches |  |
| EditGlAccount | EditGlAccountForm | Accounting/GeneralLedger/GlAccountDetail |  |
| EditGlAccount | NewGlAccountOrgForm | Accounting/GeneralLedger/GlAccountDetail |  |
| EditGlAccount | GlAccountOrgList | Accounting/GeneralLedger/GlAccountDetail |  |
| FindGlAccount | NewGlAccountForm | Accounting/GeneralLedger/ChartOfAccounts |  |
| FindGlAccount | GlAccountListForm | Accounting/GeneralLedger/ChartOfAccounts |  |
| Aging | ReportOptions | Accounting/Reports/Aging |  |
| Aging | InvoiceAgingList | Accounting/Reports/Aging |  |
| EditInvoice | AdjustInvoice | Accounting/Receivables/InvoiceDetail; Accounting/Payables/BillDetail; Shared/InvoiceDetail |  |
| EditInvoice | OutSystemMessageList | Purchasing/Bills/InvoiceDetail; Accounting/Receivables/InvoiceDetail; Accounting/Payables/BillDetail; Shared/InvoiceDetail |  |
| EditInvoice | AuditLogList | Purchasing/Bills/InvoiceDetail; Accounting/Receivables/InvoiceDetail; Accounting/Payables/BillDetail; Shared/InvoiceDetail |  |
| EditInvoice | EditInvoice | Purchasing/Bills/InvoiceDetail; Accounting/Receivables/InvoiceDetail; Accounting/Payables/BillDetail; Shared/InvoiceDetail |  |
| EditInvoice | NewContentForm | Purchasing/Bills/InvoiceDetail; Accounting/Receivables/InvoiceDetail; Accounting/Payables/BillDetail; Shared/InvoiceDetail |  |
| EditInvoice | UpdateContentForm | Purchasing/Bills/InvoiceDetail; Accounting/Receivables/InvoiceDetail; Accounting/Payables/BillDetail; Shared/InvoiceDetail |  |
| EditInvoice | SendPastDueEmailForm | Accounting/Receivables/InvoiceDetail; Accounting/Receivables/Dunning; Shared/InvoiceDetail |  |
| EditInvoice | SendFinalizedEmailForm | Accounting/Receivables/InvoiceDetail; Accounting/Payables/BillDetail; Shared/InvoiceDetail |  |
| EditInvoice | EmailMessageList | Purchasing/Bills/InvoiceDetail; Accounting/Receivables/InvoiceDetail; Accounting/Payables/BillDetail; Shared/InvoiceDetail |  |
| EditInvoice | NewCreditMemoForm | Accounting/Receivables/InvoiceDetail; Accounting/Payables/BillDetail; Shared/InvoiceDetail |  |
| EditInvoice | RecordPaymentForm | Accounting/Receivables/InvoiceDetail; Accounting/Payables/BillDetail; Shared/InvoiceDetail |  |
| EditInvoice | PaymentApplicationList | Purchasing/Bills/InvoiceDetail; Accounting/Receivables/InvoiceDetail; Accounting/Payables/BillDetail; Shared/InvoiceDetail |  |
| EditInvoice | OrderPromisedPaymentList | Purchasing/Bills/InvoiceDetail; Accounting/Receivables/InvoiceDetail; Accounting/Payables/BillDetail; Shared/InvoiceDetail |  |
| EditInvoice | UnappliedPaymentList | Accounting/Receivables/InvoiceDetail; Accounting/Payables/BillDetail; Shared/InvoiceDetail |  |
| EditInvoice | UnpaidInvoiceList | Accounting/Receivables/InvoiceDetail; Accounting/Payables/BillDetail; Shared/InvoiceDetail |  |
| EditInvoice | InvoiceTxList | Purchasing/Bills/InvoiceDetail; Accounting/Receivables/InvoiceDetail; Accounting/Payables/BillDetail; Shared/InvoiceDetail |  |
| EditInvoice | InvoiceGlaList | Purchasing/Bills/InvoiceDetail; Accounting/Receivables/InvoiceDetail; Accounting/Payables/BillDetail; Shared/InvoiceDetail |  |
| EditInvoiceItemDetails | AddDetailForm | Purchasing/Bills/InvoiceDetail; Accounting/Receivables/InvoiceDetail; Accounting/Payables/BillDetail; Shared/InvoiceDetail |  |
| EditInvoiceItemDetails | AssetItemDetailList | Purchasing/Bills/InvoiceDetail; Accounting/Receivables/InvoiceDetail; Accounting/Payables/BillDetail; Shared/InvoiceDetail |  |
| EditInvoiceItemDetails | FacilityItemDetailList | Purchasing/Bills/InvoiceDetail; Accounting/Receivables/InvoiceDetail; Accounting/Payables/BillDetail; Shared/InvoiceDetail |  |
| EditInvoiceItemDetails | ItemDetailList | Purchasing/Bills/InvoiceDetail; Accounting/Receivables/InvoiceDetail; Accounting/Payables/BillDetail; Shared/InvoiceDetail |  |
| EditInvoiceItemOrders | ApplyToOrder | Purchasing/Bills/InvoiceMatch; Accounting/Receivables/InvoiceDetail; Accounting/Payables/BillDetail; Shared/InvoiceDetail |  |
| EditInvoiceItemOrders | ApplyItemToOrder | Purchasing/Bills/InvoiceMatch; Accounting/Receivables/InvoiceDetail; Accounting/Payables/BillDetail; Shared/InvoiceDetail |  |
| EditInvoiceItemOrders | ItemBillingList | Purchasing/Bills/InvoiceMatch; Accounting/Receivables/InvoiceDetail; Accounting/Payables/BillDetail; Shared/InvoiceDetail |  |
| EditInvoiceItemShipments | ApplyToShipment | Purchasing/Bills/InvoiceMatch; Accounting/Receivables/InvoiceDetail; Accounting/Payables/BillDetail; Shared/InvoiceDetail |  |
| EditInvoiceItemShipments | ApplyItemToShipment | Purchasing/Bills/InvoiceMatch; Accounting/Receivables/InvoiceDetail; Accounting/Payables/BillDetail; Shared/InvoiceDetail |  |
| EditInvoiceItemShipments | ItemSourceList | Purchasing/Bills/InvoiceMatch; Accounting/Receivables/InvoiceDetail; Accounting/Payables/BillDetail; Shared/InvoiceDetail |  |
| EditInvoiceItems | CreateInvoiceItem | Purchasing/Bills/InvoiceDetail; Accounting/Receivables/InvoiceDetail; Accounting/Payables/BillDetail; Shared/InvoiceDetail |  |
| EditInvoiceItems | EditInvoiceItems | Purchasing/Bills/InvoiceDetail; Accounting/Receivables/InvoiceDetail; Accounting/Payables/BillDetail; Shared/InvoiceDetail |  |
| FindInvoice | NewPayableForm | Accounting/Payables/Bills |  |
| FindInvoice | NewReceivableForm | Accounting/Receivables/Invoices |  |
| FindInvoice | NewCustCreditForm | Accounting/Receivables/Invoices |  |
| FindInvoice | NewSupCreditForm | Accounting/Payables/Bills |  |
| FindInvoice | ProjectInvoice | Projects/Billing/Unbilled; Accounting/Receivables/BillingQueue | Projects/Billing/Unbilled |
| FindInvoice | ProjectWorkerInvoice | Projects/Billing/Unbilled; Accounting/Receivables/BillingQueue |  |
| FindInvoice | WorkerInvoice | Projects/Billing/Unbilled; Accounting/Receivables/BillingQueue |  |
| FindInvoice | CustomerStatementForm | Accounting/Receivables/Statements |  |
| FindInvoice | MainOptions | Accounting/Receivables/Invoices; Accounting/Payables/Bills |  |
| FindInvoice | InvoiceList | Purchasing/Bills; Accounting/Receivables/Invoices; Accounting/Payables/Bills |  |
| FindInvoice | AgingSummaryList | Accounting/Receivables/Invoices; Accounting/Payables/Bills |  |
| AcctgPreference | EditPapForm | Accounting/Settings/AccountingPreferences |  |
| AcctgPreference | CloneAcctgSettingsForm | Accounting/Settings/AccountingPreferences |  |
| AssetTypes | AddConfigForm | Accounting/Settings/PostingDefaults |  |
| AssetTypes | AllConfigList | Accounting/Settings/PostingDefaults |  |
| FinAcctReasons | AllTypesList | Accounting/Settings/PostingDefaults |  |
| FinAcctTypes | AllTypesList | Accounting/Settings/PostingDefaults |  |
| GlAccounts | NewGlAccountOrgForm | Accounting/Settings/PostingDefaults |  |
| GlAccounts | GlAccountOrgList | Accounting/Settings/PostingDefaults |  |
| InvoiceTypes | AddConfigForm | Accounting/Settings/PostingDefaults |  |
| InvoiceTypes | MissingConfigForm | Accounting/Settings/PostingDefaults |  |
| InvoiceTypes | AllConfigList | Accounting/Settings/PostingDefaults |  |
| ItemTypes | AddConfigForm | Accounting/Settings/PostingDefaults |  |
| ItemTypes | MissingConfigForm | Accounting/Settings/PostingDefaults |  |
| ItemTypes | AllConfigList | Accounting/Settings/PostingDefaults |  |
| PaymentInstruments | AllEnumList | Accounting/Settings/PostingDefaults |  |
| PaymentTypes | AddConfigForm | Accounting/Settings/PostingDefaults |  |
| PaymentTypes | MissingConfigForm | Accounting/Settings/PostingDefaults |  |
| PaymentTypes | AllConfigList | Accounting/Settings/PostingDefaults |  |
| TypeDefaults | AllEnumList | Accounting/Settings/PostingDefaults |  |
| BulkPaymentCheck | PaymentList | Accounting/Payables/PaymentRunDetail |  |
| BulkPaymentCheck | PaymentListAssignRef | Accounting/Payables/PaymentRunDetail |  |
| BulkPaymentCheck | PaymentListActions | Accounting/Payables/PaymentRunDetail |  |
| EditPayment | RefundPaymentForm | Accounting/Payments/PaymentDetail |  |
| EditPayment | AuditLogList | Accounting/Payments/PaymentDetail |  |
| EditPayment | EditPayment | Accounting/Payments/PaymentDetail |  |
| EditPayment | GatewayAuthorizeForm | Accounting/Payments/PaymentDetail |  |
| EditPayment | GatewayCaptureForm | Accounting/Payments/PaymentDetail |  |
| EditPayment | GatewayRefundForm | Accounting/Payments/PaymentDetail |  |
| EditPayment | SetRefundForForm | Accounting/Payments/PaymentDetail |  |
| EditPayment | GatewayRefundForForm | Accounting/Payments/PaymentDetail |  |
| EditPayment | RefundPaymentList | Accounting/Payments/PaymentDetail |  |
| EditPayment | PaymentApplicationList | Accounting/Payments/PaymentDetail |  |
| EditPayment | UnpaidInvoiceList | Accounting/Payments/PaymentDetail |  |
| EditPayment | UnappliedPaymentList | Accounting/Payments/PaymentDetail |  |
| EditPayment | PaymentTxList | Accounting/Payments/PaymentDetail |  |
| EditPayment | InvoiceGlaList | Accounting/Payments/PaymentDetail |  |
| EditPayment | NewContentForm | Accounting/Payments/PaymentDetail |  |
| EditPayment | UpdateContentForm | Accounting/Payments/PaymentDetail |  |
| EditPayment | GatewayResponseList | Accounting/Payments/PaymentDetail |  |
| FindPayment | NewInPaymentForm | Accounting/Payments/Payments |  |
| FindPayment | NewOutPaymentForm | Accounting/Payments/Payments |  |
| FindPayment | PaymentList | Accounting/Payments/Payments |  |
| AccountBalance | AccountBalanceHistory | Accounting/Reports/AccountBalance |  |
| AccountLedger | AccountLedger | Accounting/Reports/GeneralLedger |  |
| ArAgingSummary | ReportOptions | Accounting/Reports/Aging |  |
| ArAgingSummary | InvoiceAgingList | Accounting/Reports/Aging |  |
| AssetOnHand | AssetOnHandSummary | Warehouse/Inventory/Availability; Accounting/Reports/StockTransactions |  |
| AssetOnHandSummary | FieldDescriptions | Warehouse/Inventory/Availability; Accounting/Reports/StockTransactions |  |
| AssetOnHandSummary | AssetOnHandSummary | Warehouse/Inventory/Availability; Accounting/Reports/StockTransactions |  |
| AssetReceiptTransaction | AssetReceiptTxList | Warehouse/Reports/OperationsHistory; Accounting/Reports/StockTransactions |  |
| AssetStatusByReceipt | FieldDescriptions | Warehouse/Reports/OperationsHistory; Accounting/Reports/StockTransactions |  |
| AssetStatusByReceipt | AssetOnHandSummary | Warehouse/Reports/OperationsHistory; Accounting/Reports/StockTransactions |  |
| AssetValuation | AssetValuationSummary | Accounting/FixedAssets/InventoryValuation; Shared/InventoryValuation; Warehouse/Reports/InventoryValuation |  |
| InvoiceAgingDetail | ReportOptions | Accounting/Reports/Aging |  |
| InvoiceAgingDetail | InvoiceAgingList | Accounting/Reports/Aging |  |
| InvoiceItemSummary | InvoiceItemSummary | Accounting/Reports/SalesAnalysis |  |
| InvoiceReconciliation | ReportOptions | Accounting/Reports/InvoiceReconciliation |  |
| InvoiceReconciliation | InvoiceVsGlList | Accounting/Reports/InvoiceReconciliation |  |
| InvoiceReconciliation | PaymentVsGlList | Accounting/Reports/InvoiceReconciliation |  |
| InvoiceReconciliation | NotPostedTxList | Accounting/Reports/InvoiceReconciliation |  |
| InvoiceReconciliation | CreditNeqDebitTxList | Accounting/Reports/InvoiceReconciliation |  |
| InvoiceReconciliation | NoInvoiceTxList | Accounting/Reports/InvoiceReconciliation |  |
| InvoiceReconciliation | ApplicationFutureInvoiceList | Accounting/Reports/InvoiceReconciliation |  |
| OrderIssuedInvoiced | OrderIssuedInvoiced | Accounting/Reports/SalesAnalysis |  |
| OrderItemSummary | OrderItemSummary | Accounting/Reports/SalesAnalysis |  |
| PostedAmountSummary | ResultListForm | Accounting/Reports/PostedSummary |  |
| PostedBalanceSummary | ResultList | Accounting/Reports/PostedSummary |  |
| ReportList | BalanceSheetForm | Accounting/Reports/BalanceSheet |  |
| ReportList | IncomeStatementForm | Accounting/Reports/IncomeStatement |  |
| ReportList | CashFlowStatementForm | Accounting/Reports/CashFlow |  |
| ReportList | RetainedEarningsStatementForm | Accounting/Reports/RetainedEarnings |  |
| ReportList | FinancialRatiosForm | Accounting/Reports/FinancialRatios |  |
| ReportList | CustomerStatementForm | Accounting/Receivables/Statements |  |
| ReportList | AccountLedgerForm | Accounting/Reports/GeneralLedger |  |
| ReportList | AccountBalanceForm | Accounting/Reports/AccountBalance |  |
| ReportList | PostedAmountSummaryForm | Accounting/Reports/PostedSummary |  |
| ReportList | PostedBalanceSummaryForm | Accounting/Reports/PostedSummary |  |
| SalesAnalysis | SalesAnalysis | Accounting/Reports/SalesAnalysis |  |
| SalesInvoiceAnalysis | SalesInvoiceAnalysis | Accounting/Reports/SalesAnalysis |  |
| SalesSummary | SummaryOptions | Accounting/Reports/SalesAnalysis |  |
| SalesSummary | TopProductList | Accounting/Reports/SalesAnalysis |  |
| SalesSummary | SalesOrderSummaryList | Accounting/Reports/SalesAnalysis |  |
| SalesSummary | TopCustomerClassList | Accounting/Reports/SalesAnalysis |  |
| SalesSummary | SalesInvoiceSummaryList | Accounting/Reports/SalesAnalysis |  |
| ShipmentPackageSummary | ShipmentPackageSummary | Warehouse/Reports/OperationsHistory; Accounting/Reports/StockTransactions |  |
| EditTimePeriod | CreateNextPeriod | Accounting/PeriodClose/Periods |  |
| EditTimePeriod | CreatePreviousPeriod | Accounting/PeriodClose/Periods |  |
| EditTimePeriod | ViewTimePeriod | Accounting/PeriodClose/Periods |  |
| EditTimePeriod | CreateChild | Accounting/PeriodClose/Periods |  |
| EditTimePeriod | TimePeriodList | Accounting/PeriodClose/Periods |  |
| FindTimePeriod | CreatePeriod | Accounting/PeriodClose/Periods |  |
| FindTimePeriod | TimePeriodList | Accounting/PeriodClose/Periods |  |
| ViewPeriodGlAccounts | ClosingTransForm | Accounting/PeriodClose/PeriodCloseDetail |  |
| ViewPeriodGlAccounts | PeriodGlAccountList | Accounting/PeriodClose/PeriodCloseDetail |  |
| EditTransaction | UpdateAcctgTrans | Accounting/GeneralLedger/JournalEntryDetail |  |
| EditTransaction | UpdateAcctgTransPosted | Accounting/GeneralLedger/JournalEntryDetail |  |
| EditTransaction | AddEntryForm | Accounting/GeneralLedger/JournalEntryDetail |  |
| EditTransaction | EntryListForm | Accounting/GeneralLedger/JournalEntryDetail |  |
| EditTransaction | AuditLogList | Accounting/GeneralLedger/JournalEntryDetail |  |
| MoveEntry | ReceiveForm | Accounting/GeneralLedger/JournalEntryDetail |  |
| FindTransaction | CreateAcctgTrans | Accounting/GeneralLedger/JournalEntries |  |
| FindTransaction | TransactionList | Accounting/GeneralLedger/JournalEntries |  |
| FindTransactionEntry | TransactionEntryList | Accounting/GeneralLedger/TransactionEntries |  |
| OrgInternalSummary | OrgInternalForm | Accounting/Home |  |

## Asset (65 forms)

| Screen XML | Form | Designed in | Implemented in |
| --- | --- | --- | --- |
| AssetCalendar | NewEventForm | Commons/Calendar/Schedules | Commons/Calendar/Schedules |
| AssetDetail | UpdateAssetAcquireCost |  |  |
| AssetDetail | AuditLogList | Warehouse/Inventory/AssetDetail |  |
| AssetDetail | EditAsset | Warehouse/Inventory/AssetDetail |  |
| AssetDetail | ReservationsListForm | Warehouse/Inventory/AssetDetail |  |
| AssetDetail | AssetDetailList | Warehouse/Inventory/AssetDetail |  |
| AssetDetail | AssetDepreciationList | Accounting/FixedAssets/EquipmentDetail; Accounting/FixedAssets/DepreciationRunDetail |  |
| EditAssetMaintenance | UpdateMaintenanceForm |  |  |
| EditAssetMaintenance | NewContentForm |  |  |
| EditAssetMaintenance | UpdateContentForm |  |  |
| FindAssetMaintenance | AddPlannedMaintenance |  |  |
| FindAssetMaintenance | AddOtherMaintenance |  |  |
| FindAssetMaintenance | ProductMaintenanceList |  |  |
| FindAssetMaintenance | MaintenanceListForm |  |  |
| AssetMeters | NewMeterForm |  |  |
| AssetMeters | MeterListForm |  |  |
| AssetParties | AddUserForm |  |  |
| AssetParties | UpdateUserForm |  |  |
| AssetRegistrations | NewRegistrationForm |  |  |
| AssetRegistrations | RegistrationsForm |  |  |
| DetailHistory | AssetDetailList | Warehouse/Inventory/Movements; Warehouse/Inventory/AssetDetail |  |
| FindAsset | UpdateProductCost |  |  |
| FindAsset | CreateEquipment |  |  |
| FindAsset | ListAssets | Warehouse/Inventory/Assets |  |
| FindSummary | ReceiveAssetForm | Warehouse/Receiving/Receive; Warehouse/Inventory/MaterialIssueReceipt |  |
| FindSummary | PhysicalManualChange | Warehouse/Inventory/Adjustments |  |
| FindSummary | AssetSummary | Warehouse/Inventory/Availability |  |
| PhysicalChange | RecordChange | Warehouse/Inventory/Adjustments |  |
| PhysicalQuantity | RecordQuantity | Warehouse/Inventory/Adjustments |  |
| MoveAsset | AssetInfoForm | Warehouse/Transfers/Move |  |
| MoveAsset | ScanMoveAssetForm | Warehouse/Transfers/Move |  |
| MoveAsset | EnterMoveAssetForm | Warehouse/Transfers/Move |  |
| SelectAsset | ScanAssetForm | Warehouse/Transfers/Move |  |
| SelectAsset | ActiveFacilityForm | Warehouse/Transfers/Move |  |
| SelectAsset | SelectAssetForm | Warehouse/Transfers/Move |  |
| SelectAsset | SelectLocationForm | Warehouse/Transfers/Move |  |
| SelectAsset | ScanMoveAssetForm | Warehouse/Transfers/Move |  |
| SelectAsset | EnterMoveAssetForm | Warehouse/Transfers/Move |  |
| SelectAsset | ContainerAssetList | Warehouse/Transfers/Move |  |
| SelectAsset | LocationAssetList | Warehouse/Transfers/Move |  |
| SelectAsset | ProductNoLocAssetList | Warehouse/Transfers/Move |  |
| SelectAsset | RecentMoveForm | Warehouse/Transfers/Move |  |
| SelectAsset | RecentContainerMoveForm | Warehouse/Transfers/Move |  |
| EditAssetPool | UpdateAssetPoolForm | Warehouse/Settings/AssetPools |  |
| EditAssetPool | AddPartyForm | Warehouse/Settings/AssetPools |  |
| EditAssetPool | PartyListForm | Warehouse/Settings/AssetPools |  |
| EditAssetPool | AddStoreForm | Warehouse/Settings/AssetPools |  |
| EditAssetPool | StoreListForm | Warehouse/Settings/AssetPools |  |
| FindAssetPool | CreateAssetPoolForm | Warehouse/Settings/AssetPools |  |
| FindAssetPool | AssetPoolList | Warehouse/Settings/AssetPools |  |
| EditContainer | PickScanForm | Warehouse/Inventory/ContainerDetail |  |
| EditContainer | UpdateContainerForm | Warehouse/Inventory/ContainerDetail |  |
| EditContainer | AddAssetForm | Warehouse/Inventory/ContainerDetail |  |
| EditContainer | AssetListForm | Warehouse/Inventory/ContainerDetail |  |
| FindContainer | CreateContainerForm | Warehouse/Inventory/Containers |  |
| FindContainer | ContainerList | Warehouse/Inventory/Containers |  |
| MoveContainer | ContainerInfoForm | Warehouse/Inventory/ContainerDetail; Warehouse/Transfers/Move |  |
| MoveContainer | AssetListForm | Warehouse/Inventory/ContainerDetail; Warehouse/Transfers/Move |  |
| MoveContainer | ScanMoveContainerForm | Warehouse/Inventory/ContainerDetail; Warehouse/Transfers/Move |  |
| MoveContainer | EnterMoveContainerForm | Warehouse/Inventory/ContainerDetail; Warehouse/Transfers/Move |  |
| EditLots | CreateLot | Warehouse/Inventory/Lots |  |
| EditLots | LotList | Warehouse/Inventory/Lots |  |
| EditPhysicalInventory | UpdateMasterEntityValue | Warehouse/Counts/CountDetail |  |
| EditPhysicalInventory | AssetDetailList | Warehouse/Counts/CountDetail; Warehouse/Counts/CountReview; Warehouse/Reports/CountVariance |  |
| FindPhysicalInventory | PhysicalInventoryList | Warehouse/Counts/Counts |  |

## Catalog (80 forms)

| Screen XML | Form | Designed in | Implemented in |
| --- | --- | --- | --- |
| Category/Content/ContentDetail | UpdateContentForm | Products/Categories/CategoryDetail/Content |  |
| Category/Content/ContentDetail | UpdateTextForm | Products/Categories/CategoryDetail/Content |  |
| Category/Content/ContentList | NewContentForm | Products/Categories/CategoryDetail/Content |  |
| Category/Content/ContentList | NewLocationForm | Products/Categories/CategoryDetail/Content |  |
| Category/Content/ContentList | NewTextForm | Products/Categories/CategoryDetail/Content |  |
| Category/Content/ContentList | ContentList | Products/Categories/CategoryDetail/Content |  |
| EditCategory | EditCategoryForm | Products/Categories/CategoryDetail |  |
| EditCategory | AddChild | Products/Categories/CategoryDetail |  |
| EditCategory | ChildCategoriesForm | Products/Categories/CategoryDetail |  |
| EditCategory | GenerateCategoryIdent | Products/Categories/CategoryDetail |  |
| EditCategory | AddCategoryIdentForm | Products/Categories/CategoryDetail |  |
| EditCategory | CategoryIdentForm | Products/Categories/CategoryDetail |  |
| EditCategory | ParentCategoriesForm | Products/Categories/CategoryDetail |  |
| EditCategory | AddFeatureGroupForm | Products/Categories/CategoryDetail |  |
| EditCategory | FeatureGroupsForm | Products/Categories/CategoryDetail |  |
| EditProducts | AddProductForm | Products/Categories/CategoryDetail |  |
| EditProducts | ProductsForm | Products/Categories/CategoryDetail |  |
| FindCategory | NewCategoryForm | Products/Categories |  |
| FindCategory | CategoriesForm | Products/Categories |  |
| EditFeature | NewFeatureForm | Products/Features |  |
| EditFeature | EditFeatureForm | Products/Features/FeatureDetail |  |
| EditFeature | AddFeatureGroupForm | Products/Features/FeatureDetail |  |
| EditFeature | FeatureGroupsForm | Products/Features/FeatureDetail |  |
| EditFeature | AddProductForm | Products/Features/FeatureDetail |  |
| EditFeature | ProductsForm | Products/Features/FeatureDetail |  |
| FindFeature | NewFeatureForm | Products/Features |  |
| FindFeature | FeaturesForm | Products/Features |  |
| EditFeatureGroup | EditFeatureGroupForm | Products/Features/FeatureGroups/FeatureGroupDetail |  |
| EditFeatureGroup | AddCategoryForm | Products/Features/FeatureGroups/FeatureGroupDetail |  |
| EditFeatureGroup | CategoriesForm | Products/Features/FeatureGroups/FeatureGroupDetail |  |
| EditFeatureGroup | AddFeatureForm | Products/Features/FeatureGroups/FeatureGroupDetail |  |
| EditFeatureGroup | FeaturesForm | Products/Features/FeatureGroups/FeatureGroupDetail |  |
| FindFeatureGroup | NewFeatureGroupForm | Products/Features/FeatureGroups |  |
| FindFeatureGroup | FeatureGroupsForm | Products/Features/FeatureGroups |  |
| Product/Content/ContentDetail | UpdateContentForm | Products/Documents/DocumentDetail; Products/Products/Product360; Shared/Product360 |  |
| Product/Content/ContentDetail | UpdateTextForm | Products/Documents/DocumentDetail; Products/Products/Product360; Shared/Product360 |  |
| Product/Content/ContentList | NewContentForm | Products/Documents; Products/Products/Product360; Shared/Product360 |  |
| Product/Content/ContentList | NewLocationForm | Products/Documents; Products/Products/Product360; Shared/Product360 |  |
| Product/Content/ContentList | NewTextForm | Products/Documents; Products/Products/Product360; Shared/Product360 |  |
| Product/Content/ContentList | ContentList | Products/Documents; Products/Products/Product360; Shared/Product360 |  |
| EditAssocs | AddAssocToForm | Products/Products/Product360; Manufacturing/Boms/BomDetail; Shared/Product360 |  |
| EditAssocs | AssocToListForm | Products/Products/Product360; Manufacturing/Boms/BomDetail; Shared/Product360 |  |
| EditAssocs | AssocFromListForm | Products/Products/Product360; Manufacturing/Boms/WhereUsed; Shared/Product360 |  |
| EditAssocs | CreateVariantsForm | Products/Products/VariantBuilder; Shared/Product360 |  |
| EditAssocs | AllSelectableFeaturesForm | Products/Products/VariantBuilder; Shared/Product360 |  |
| EditCategories | AddCategoryForm | Products/Products/Product360; Shared/Product360 |  |
| EditCategories | CategoriesForm | Products/Products/Product360; Shared/Product360 |  |
| EditPrices | NewPriceForm | Products/Pricing/Prices; Products/Products/Product360; Products/Suppliers; Purchasing/Suppliers/SupplierPrices; Shared/Product360; Shared/SupplierPrices |  |
| EditPrices | PricesForm | Products/Pricing/Prices; Products/Products/Product360; Products/Suppliers; Purchasing/Suppliers/SupplierPrices; Shared/Product360; Shared/SupplierPrices |  |
| EditProduct | CloneProductForm | Products/Products/Product360; Shared/Product360 |  |
| EditProduct | EditProductForm | Products/Products/Product360; Shared/Product360 |  |
| EditProduct | AddIdentificationForm | Products/Products/Product360; Shared/Product360 |  |
| EditProduct | IdentificationsForm | Products/Products/Product360; Shared/Product360 |  |
| EditProduct | GenerateOtherIdentification | Products/Products/Product360; Shared/Product360 |  |
| EditProduct | AddOtherIdentificationForm | Products/Products/Product360; Shared/Product360 |  |
| EditProduct | OtherIdentificationsForm | Products/Products/Product360; Shared/Product360 |  |
| EditProduct | NewFeatureForm | Products/Products/Product360; Shared/Product360 |  |
| EditProduct | AddFeatureForm | Products/Products/Product360; Shared/Product360 |  |
| EditProduct | FeaturesForm | Products/Products/Product360; Shared/Product360 |  |
| EditProduct | AddDimensionForm | Products/Products/Product360; Shared/Product360 |  |
| EditProduct | DimensionsForm | Products/Products/Product360; Shared/Product360 |  |
| EditProduct | AddUomDimensionForm | Products/Products/Product360; Shared/Product360 |  |
| EditProduct | UomDimensionsForm | Products/Products/Product360; Shared/Product360 |  |
| EditProduct | CreateProductLocation | Products/Products/Product360; Shared/Product360 |  |
| EditProduct | ProductLocationList | Products/Products/Product360; Shared/Product360 |  |
| EditProduct | CreateProductMeter | Products/Products/Product360; Shared/Product360 |  |
| EditProduct | ProductMeterList | Products/Products/Product360; Shared/Product360 |  |
| EditProduct | CreateProductMaintenance | Products/Products/Product360; Shared/Product360 |  |
| EditProduct | ProductMaintenanceList | Products/Products/Product360; Shared/Product360 |  |
| FindProduct | NewProductForm | Products/Products |  |
| FindProduct | ProductsForm | Products/Products |  |
| Search | AddCategoryForm | Products/Products |  |
| Search | RemoveCategoryForm | Products/Products |  |
| Search | AddFeatureForm | Products/Products |  |
| Search | RemoveFeatureForm | Products/Products |  |
| Search | ProductsForm | Products/Products |  |
| Search | AddCategoryFormSelection | Products/Products |  |
| Search | RemoveCategoryFormSelection | Products/Products |  |
| Search | AddFeatureFormSelection | Products/Products |  |
| Search | RemoveFeatureFormSelection | Products/Products |  |

## Customer (7 forms)

| Screen XML | Form | Designed in | Implemented in |
| --- | --- | --- | --- |
| CustomerData | CustomerDataList | CustomerService/Customers/Customer360 |  |
| FindCustomer | CreatePersonForm | CustomerService/Customers/Customer360 |  |
| FindCustomer | CreateOrganizationForm | CustomerService/Customers/Customer360 |  |
| FindCustomer | CreateAccountForm | CustomerService/Customers/Customer360 |  |
| FindCustomer | CreateContactForm | CustomerService/Customers/ContactDetail |  |
| FindCustomer | OuterSearchForm | CustomerService/Customers |  |
| FindCustomer | CustomerListForm | CustomerService/Customers |  |

## Facility (18 forms)

| Screen XML | Form | Designed in | Implemented in |
| --- | --- | --- | --- |
| BoxTypes | CreateBoxType | Warehouse/Locations/BoxTypes |  |
| BoxTypes | BoxTypeList | Warehouse/Locations/BoxTypes |  |
| CarrierShipMethods | CreateCarrierShipmentMethod | Warehouse/Locations/Carriers |  |
| CarrierShipMethods | CarrierShipmentMethodList | Warehouse/Locations/Carriers |  |
| EditFacility | EditFacilityForm | Warehouse/Locations/FacilityDetail; Shared/FacilityDetail |  |
| EditFacility | ChildListForm | Warehouse/Locations/FacilityDetail; Shared/FacilityDetail |  |
| EditFacility | NewNoteForm | Warehouse/Locations/FacilityDetail; Shared/Chatter; Shared/FacilityDetail |  |
| EditFacility | UpdateNoteForm | Warehouse/Locations/FacilityDetail; Shared/Chatter; Shared/FacilityDetail |  |
| EditFacility | AddBoxTypeForm | Warehouse/Locations/FacilityDetail; Warehouse/Locations/BoxTypes; Shared/FacilityDetail |  |
| EditFacility | BoxTypesForm | Warehouse/Locations/FacilityDetail; Warehouse/Locations/BoxTypes; Shared/FacilityDetail |  |
| EditFacility | AddLocationTypeForm | Warehouse/Locations/FacilityDetail; Shared/FacilityDetail |  |
| EditFacility | LocationTypesForm | Warehouse/Locations/FacilityDetail; Shared/FacilityDetail |  |
| EditFacilityLocations | NewLocationForm | Warehouse/Locations/FacilityDetail; Shared/FacilityDetail |  |
| EditFacilityLocations | LocationsForm | Warehouse/Locations/FacilityDetail; Shared/FacilityDetail |  |
| EditFacilityProducts | AddProductForm | Warehouse/Locations/FacilityDetail; Warehouse/Inventory/Product360; Purchasing/Replenishment/ReorderRules; Shared/FacilityDetail |  |
| EditFacilityProducts | ProductList | Warehouse/Locations/FacilityDetail; Warehouse/Inventory/Product360; Purchasing/Replenishment/ReorderRules; Shared/FacilityDetail |  |
| FindFacility | NewFacilityForm | Warehouse/Locations/Facilities |  |
| FindFacility | FacilityListForm | Warehouse/Locations/Facilities |  |

## Gateway (6 forms)

| Screen XML | Form | Designed in | Implemented in |
| --- | --- | --- | --- |
| EditPaymentGateway | EditPaymentGatewayForm |  |  |
| FindPaymentGateway | NewPaymentGatewayForm |  |  |
| FindPaymentGateway | PaymentGatewaysForm |  |  |
| EditShippingGateway | EditShippingGatewayForm |  |  |
| FindShippingGateway | NewShippingGatewayForm |  |  |
| FindShippingGateway | ShippingGatewaysForm |  |  |

## HumanRes (2 forms)

| Screen XML | Form | Designed in | Implemented in |
| --- | --- | --- | --- |
| EditRateAmounts | CreateRateAmount | Projects/Projects/ProjectDetail/Money; Projects/Billing/Rates | Projects/Projects/ProjectDetail/Money; Projects/Billing/Rates |
| EditRateAmounts | EditRateAmounts | Projects/Projects/ProjectDetail/Money; Projects/Billing/Rates | Projects/Projects/ProjectDetail/Money; Projects/Billing/Rates |

## Manufacturing (23 forms)

| Screen XML | Form | Designed in | Implemented in |
| --- | --- | --- | --- |
| EditRun | UpdateRun | Manufacturing/WorkOrders/WorkOrderDetail; Manufacturing/WorkOrders/WorkOrderDetail/Overview |  |
| EditRun | NewNoteForm | Shared/Chatter; Manufacturing/WorkOrders/WorkOrderDetail/Chatter |  |
| EditRun | UpdateNoteForm | Shared/Chatter; Manufacturing/WorkOrders/WorkOrderDetail/Chatter |  |
| EditRun | AddEquipment | Manufacturing/WorkOrders/WorkOrderDetail/Overview; Manufacturing/WorkCenters/Equipment |  |
| EditRun | EquipmentList | Manufacturing/WorkOrders/WorkOrderDetail/Overview; Manufacturing/WorkCenters/Equipment |  |
| EditRun | AddPartyAssignForm | Manufacturing/WorkOrders/WorkOrderDetail/Overview |  |
| EditRun | UpdateAssignForm | Manufacturing/WorkOrders/WorkOrderDetail/Overview |  |
| FindRun | NewRunForm | Manufacturing/WorkOrders/NewWorkOrder |  |
| FindRun | RunList | Manufacturing/WorkOrders; Manufacturing/Home |  |
| RunConsumed | IssueAssetForm | Shared/MaterialIssueReceipt; Manufacturing/WorkOrders/WorkOrderDetail/Materials |  |
| RunConsumed | ConsumeAssetForm | Shared/MaterialIssueReceipt; Manufacturing/WorkOrders/WorkOrderDetail/Materials |  |
| RunConsumed | IssuedAssetForm | Shared/MaterialIssueReceipt; Manufacturing/WorkOrders/WorkOrderDetail/Materials |  |
| RunProduced | ReceiveAssetForm | Shared/MaterialIssueReceipt; Manufacturing/WorkOrders/WorkOrderDetail/Materials |  |
| RunProduced | ReceivedAssetForm | Shared/MaterialIssueReceipt; Manufacturing/WorkOrders/WorkOrderDetail/Materials |  |
| RunProducts | AddProduceForm | Manufacturing/WorkOrders/WorkOrderDetail/Quantities |  |
| RunProducts | ReceiveAssetForm | Shared/MaterialIssueReceipt; Manufacturing/WorkOrders/WorkOrderDetail/Materials |  |
| RunProducts | ProduceList | Manufacturing/WorkOrders/WorkOrderDetail/Quantities |  |
| RunProducts | AddConsumeForm | Manufacturing/WorkOrders/WorkOrderDetail/Components |  |
| RunProducts | IssueAssetForm | Shared/MaterialIssueReceipt; Manufacturing/WorkOrders/WorkOrderDetail/Materials |  |
| RunProducts | ConsumeList | Manufacturing/WorkOrders/WorkOrderDetail/Components |  |
| ConsumeAsset | ConsumeAssetForm | Shared/MaterialIssueReceipt; Manufacturing/WorkOrders/WorkOrderDetail/Materials |  |
| ConsumeProduct | ConsumeAssetForm | Shared/MaterialIssueReceipt; Manufacturing/WorkOrders/WorkOrderDetail/Materials |  |
| ProduceAsset | ReceiveAssetForm | Shared/MaterialIssueReceipt; Manufacturing/WorkOrders/WorkOrderDetail/Materials |  |

## Order (43 forms)

| Screen XML | Form | Designed in | Implemented in |
| --- | --- | --- | --- |
| FindOrder | CreateSalesOrder |  |  |
| FindOrder | ApproveOrdersForm | Purchasing/Orders/PurchaseOrders |  |
| FindOrder | CloseOrdersForm | Purchasing/Orders/PurchaseOrders |  |
| FindOrder | CreatePurchaseOrder | Purchasing/Orders/PurchaseOrders |  |
| FindOrder | OrderList | Purchasing/Orders/PurchaseOrders; CustomerService/Orders |  |
| OrderDetail | CloseOrderPartItems | Purchasing/Orders/OrderDetail; Shared/OrderDetail |  |
| OrderDetail | AddPartForm | Purchasing/Orders/OrderDetail; Shared/OrderDetail |  |
| OrderDetail | RecurOptions | Purchasing/Orders/OrderDetail; Shared/OrderDetail |  |
| OrderDetail | AuditLogList | Purchasing/Orders/OrderDetail; CustomerService/Orders/OrderDetail; Shared/OrderDetail |  |
| OrderDetail | HeaderForm | Purchasing/Orders/OrderDetail; CustomerService/Orders/OrderDetail; Shared/OrderDetail |  |
| OrderDetail | AddPromoCode | Shared/OrderDetail |  |
| OrderDetail | AddPartyPromoCode | Shared/OrderDetail |  |
| OrderDetail | OrderPromoCodeList | Shared/OrderDetail |  |
| OrderDetail | ItemLimitForm | Purchasing/Orders/OrderDetail; Shared/OrderDetail |  |
| OrderDetail | NewNoteForm | Purchasing/Orders/OrderDetail; Shared/OrderDetail |  |
| OrderDetail | UpdateNoteForm | Purchasing/Orders/OrderDetail; Shared/OrderDetail |  |
| OrderDetail | NewContentForm | Purchasing/Orders/OrderDetail; Shared/OrderDetail |  |
| OrderDetail | UpdateContentForm | Purchasing/Orders/OrderDetail; Shared/OrderDetail |  |
| OrderDetail | SendPlacedEmailForm | Purchasing/Orders/OrderDetail; CustomerService/Orders/OrderDetail; Shared/OrderDetail |  |
| OrderDetail | EmailMessageList | Purchasing/Orders/OrderDetail; CustomerService/Orders/OrderDetail; Shared/OrderDetail |  |
| OrderDetail | SystemMessageList | Purchasing/Orders/OrderDetail; Shared/OrderDetail |  |
| OrderDetail | ChildOrderList | Purchasing/Orders/OrderDetail; Shared/OrderDetail |  |
| OrderDetail | AddOrderPartToShipmentForm | Purchasing/Orders/OrderDetail; Shared/OrderDetail |  |
| OrderDetail | EditPartForm | Purchasing/Orders/OrderDetail; Shared/OrderDetail |  |
| OrderDetail | EditPartNonEdForm | Purchasing/Orders/OrderDetail; Shared/OrderDetail |  |
| OrderDetail | CreateOrderPartParty | Purchasing/Orders/OrderDetail; Shared/OrderDetail |  |
| OrderDetail | CloseOrderPartItems | Purchasing/Orders/OrderDetail; Shared/OrderDetail |  |
| OrderDetail | AddPaymentForm | Shared/OrderDetail |  |
| OrderDetail | UpdatePaymentForm | Shared/OrderDetail |  |
| OrderDetail | GatewayAuthorizeForm | Shared/OrderDetail |  |
| OrderDetail | GatewayResponseList | Shared/OrderDetail |  |
| OrderDetail | SetOrderInfoForm | Purchasing/Orders/OrderDetail; Shared/OrderDetail |  |
| OrderDetail | AddProductItemForm | Purchasing/Orders/OrderDetail; Shared/OrderDetail |  |
| OrderDetail | AddOtherItemForm | Purchasing/Orders/OrderDetail; Shared/OrderDetail |  |
| OrderDetail | OrderItems | Purchasing/Orders/OrderDetail; CustomerService/Orders/OrderDetail; Shared/OrderDetail |  |
| EditItem | EditOrderItem | Purchasing/Orders/OrderDetail; Shared/OrderDetail |  |
| ItemReserve | ReserveItem | Shared/OrderDetail |  |
| ReturnItem | ReturnItem | CustomerService/Returns/NewReturn; CustomerService/Returns/ReturnDetail; Shared/ReturnDetail |  |
| OrderItems | AddProductItemForm | Purchasing/Orders/OrderDetail; Shared/OrderDetail |  |
| OrderItems | AddOtherItemForm | Purchasing/Orders/OrderDetail; Shared/OrderDetail |  |
| OrderItems | OrderItems | Purchasing/Orders/OrderDetail; Shared/OrderDetail |  |
| QuickItems | QuickItemOptions | Shared/OrderDetail |  |
| QuickItems | QuickItemList | Shared/OrderDetail |  |

## Party (105 forms)

| Screen XML | Form | Designed in | Implemented in |
| --- | --- | --- | --- |
| EditParty | CreateUserAccount |  |  |
| EditParty | ConvertToPersonForm |  |  |
| EditParty | ConvertToOrganizationForm |  |  |
| EditParty | EditOrganizationForm | Commons/Contacts/ContactDetail; Purchasing/Suppliers/Supplier360; Shared/Customer360; Shared/Supplier360 | Commons/Contacts/ContactDetail; Commons/Contacts/List |
| EditParty | EditPersonForm | Commons/Contacts/ContactDetail; Purchasing/Suppliers/Supplier360; Shared/Customer360; Shared/Supplier360 | Commons/Contacts/ContactDetail; Commons/Contacts/List |
| EditParty | AddDirectRoleForm | Purchasing/Suppliers/Supplier360; Shared/Customer360; Shared/Supplier360 |  |
| EditParty | AddOtherRoleForm | Purchasing/Suppliers/Supplier360; Shared/Customer360; Shared/Supplier360 |  |
| EditParty | RolesForm | Purchasing/Suppliers/Supplier360; Shared/Customer360; Shared/Supplier360 |  |
| EditParty | SetClassificationForm | Purchasing/Suppliers/Supplier360; Shared/Customer360; Shared/Supplier360 |  |
| EditParty | ClassificationsForm | Purchasing/Suppliers/Supplier360; Shared/Customer360; Shared/Supplier360 |  |
| EditParty | AddIdentificationForm | Purchasing/Suppliers/Supplier360 |  |
| EditParty | IdentificationsForm | Purchasing/Suppliers/Supplier360 |  |
| EditParty | AddSettingForm |  |  |
| EditParty | AddSettingTextForm |  |  |
| EditParty | SettingsForm |  |  |
| EditParty | UpdateUserAccount |  |  |
| EditParty | AddGroupForm |  |  |
| EditParty | GroupsForm |  |  |
| EditParty | NewToRelForm | Shared/Customer360; Shared/Supplier360 |  |
| EditParty | UserOrgRelList | Shared/Customer360; Shared/Supplier360 |  |
| EditParty | AddSalesAccount | Shared/Customer360; Shared/Supplier360 |  |
| EditParty | AccountRelList | Shared/Customer360; Shared/Supplier360 |  |
| EditParty | AddContactAssignForm | Purchasing/Suppliers/Supplier360; Shared/Customer360; Shared/Supplier360 |  |
| EditParty | CreateContactForm | Purchasing/Suppliers/Supplier360; Shared/Customer360; Shared/Supplier360 |  |
| EditParty | ContactRelList | Purchasing/Suppliers/Supplier360; Shared/Customer360; Shared/Supplier360 |  |
| EditParty | AddParentAccount | Shared/Customer360; Shared/Supplier360 |  |
| EditParty | ParentAccountRelList | Shared/Customer360; Shared/Supplier360 |  |
| EditParty | AddChildAccount | Shared/Customer360; Shared/Supplier360 |  |
| EditParty | ChildAccountRelList | Shared/Customer360; Shared/Supplier360 |  |
| EditParty | NewNoteForm | Commons/Contacts/ContactDetail; Shared/Chatter; Purchasing/Suppliers/Supplier360 | Commons/Contacts/ContactDetail; Commons/Contacts/List; Shared/Chatter |
| EditParty | UpdateNoteForm | Commons/Contacts/ContactDetail; Shared/Chatter; Purchasing/Suppliers/Supplier360 | Commons/Contacts/ContactDetail; Commons/Contacts/List; Shared/Chatter |
| EditParty | OtherCreateForm | Commons/Contacts/ContactDetail; Purchasing/Suppliers/Supplier360 | Commons/Contacts/ContactDetail; Commons/Contacts/List |
| EditParty | PhonePurposeForm | Commons/Contacts/ContactDetail; Purchasing/Suppliers/Supplier360 | Commons/Contacts/ContactDetail; Commons/Contacts/List |
| EditParty | EmailPurposeForm | Commons/Contacts/ContactDetail; Purchasing/Suppliers/Supplier360 | Commons/Contacts/ContactDetail; Commons/Contacts/List |
| EditParty | WebPurposeForm | Commons/Contacts/ContactDetail; Purchasing/Suppliers/Supplier360 | Commons/Contacts/ContactDetail; Commons/Contacts/List |
| EditParty | OtherUpdateForm | Commons/Contacts/ContactDetail; Purchasing/Suppliers/Supplier360 | Commons/Contacts/ContactDetail; Commons/Contacts/List |
| EditParty | OtherPurposeForm | Commons/Contacts/ContactDetail; Purchasing/Suppliers/Supplier360 | Commons/Contacts/ContactDetail; Commons/Contacts/List |
| EditParty | PostalPurposeForm | Commons/Contacts/ContactDetail; Purchasing/Suppliers/Supplier360 | Commons/Contacts/ContactDetail; Commons/Contacts/List |
| EditParty | FinancialAccountList | Accounting/Banking/FinancialAccounts |  |
| EditParty | NewContentForm | Commons/Contacts/ContactDetail; Shared/RecordFiles; Purchasing/Suppliers/Supplier360 | Commons/Contacts/ContactDetail; Commons/Contacts/List; Shared/RecordFiles |
| EditParty | UpdateContentForm | Commons/Contacts/ContactDetail; Shared/RecordFiles; Purchasing/Suppliers/Supplier360 | Commons/Contacts/ContactDetail; Commons/Contacts/List; Shared/RecordFiles |
| ExpiredContactOther | PcmListForm | Commons/Contacts/ContactDetail | Commons/Contacts/ContactDetail; Commons/Contacts/List |
| ExpiredContactOther | PcmTelecomListForm | Commons/Contacts/ContactDetail | Commons/Contacts/ContactDetail; Commons/Contacts/List |
| ExpiredPostal | PcmListForm | Commons/Contacts/ContactDetail | Commons/Contacts/ContactDetail; Commons/Contacts/List |
| FindDuplicates | DupPartyList | Commons/Contacts/Duplicates | Commons/Contacts/Duplicates |
| UpdateContactInfo | UpdateContactInfo | Commons/Contacts/ContactDetail | Commons/Contacts/ContactDetail; Commons/Contacts/List |
| UpdatePaymentMethodInfo | PaymentMethodInfoForm | Accounting/Settings/PaymentMethods |  |
| FinancialInfo | UnpaidInvoiceList | Accounting/Receivables/Customer360; Shared/Customer360 |  |
| FinancialInfo | PaymentList | Accounting/Receivables/Customer360; Shared/Customer360 |  |
| FinancialInfo | OrderList | Accounting/Receivables/Customer360; Shared/Customer360 |  |
| FinancialInfo | UnpaidPayablesList | Purchasing/Suppliers/Supplier360; Accounting/Payables/Supplier360; Shared/Supplier360 |  |
| FinancialInfo | OutgoingPaymentList | Purchasing/Suppliers/Supplier360; Accounting/Payables/Supplier360; Shared/Supplier360 |  |
| FinancialInfo | PurchaseOrderList | Purchasing/Suppliers/Supplier360; Accounting/Payables/Supplier360; Shared/Supplier360 |  |
| FinancialInfo | PaidInvoiceList | Accounting/Receivables/Customer360; Shared/Customer360 |  |
| FinancialInfo | PaidPayablesList | Purchasing/Suppliers/Supplier360; Accounting/Payables/Supplier360; Shared/Supplier360 |  |
| FindParty | CreatePersonForm | Commons/QuickCreate | Commons/QuickCreate |
| FindParty | CreatePersonCustForm |  |  |
| FindParty | CreateEmployeeForm |  |  |
| FindParty | CreateOrganizationForm | Commons/QuickCreate | Commons/QuickCreate |
| FindParty | CreateAccountForm |  |  |
| FindParty | CreateContactForm | Commons/QuickCreate | Commons/QuickCreate |
| FindParty | OuterSearchForm | Commons/Contacts | Commons/Contacts/List |
| FindParty | PartyListForm | Commons/Contacts | Commons/Contacts/List |
| EditAgreement | EditAgreement | Purchasing/Agreements/AgreementDetail |  |
| EditAgreement | AddSettlementTerm | Purchasing/Agreements/AgreementDetail |  |
| EditAgreement | AddOtherTerm | Purchasing/Agreements/AgreementDetail |  |
| EditAgreement | AgreementTermList | Purchasing/Agreements/AgreementDetail |  |
| EditAgreement | AddAgreementItem | Purchasing/Agreements/AgreementDetail |  |
| EditAgreement | AgreementItemList | Purchasing/Agreements/AgreementDetail |  |
| EditAgreement | NewContentForm | Purchasing/Agreements/AgreementDetail |  |
| EditAgreement | UpdateContentForm | Purchasing/Agreements/AgreementDetail |  |
| FindAgreement | NewAgreement | Purchasing/Agreements |  |
| FindAgreement | AgreementList | Purchasing/Agreements |  |
| PartyEmails | EmailMessageList | Comms/Inbox/MessageDetail; Shared/Chatter | Comms/Inbox/MessageDetail; Shared/Chatter |
| PartyProjects | AddUserAssignForm | Projects/Projects/ProjectDetail/Team; Projects/Resources/PersonDetail | Projects/Projects/ProjectDetail/Team; Projects/Resources/PersonDetail |
| PartyProjects | UpdateUserAssignForm | Projects/Projects/ProjectDetail/Team; Projects/Resources/PersonDetail | Projects/Projects/ProjectDetail/Team; Projects/Resources/PersonDetail |
| PartyRelated | NewToRelForm | Commons/Contacts/ContactDetail | Commons/Contacts/ContactDetail; Commons/Contacts/List |
| PartyRelated | NewFromRelForm | Commons/Contacts/ContactDetail | Commons/Contacts/ContactDetail; Commons/Contacts/List |
| PartyRelated | ToRelationshipForm | Commons/Contacts/ContactDetail | Commons/Contacts/ContactDetail; Commons/Contacts/List |
| PartyRelated | FromRelationshipForm | Commons/Contacts/ContactDetail | Commons/Contacts/ContactDetail; Commons/Contacts/List |
| PartyRequests | AddUserForm | Projects/Requests/RequestDetail | Projects/Requests/RequestDetail |
| PartyRequests | UpdateUserForm | Projects/Requests/RequestDetail | Projects/Requests/RequestDetail |
| PartyTasks | AddUserAssignForm | Projects/WorkItems/WorkItemDetail; Projects/Resources/PersonDetail | Projects/WorkItems/WorkItemDetail; Projects/Resources/PersonDetail |
| PartyTasks | UpdateUserAssignForm | Projects/WorkItems/WorkItemDetail; Projects/Resources/PersonDetail | Projects/WorkItems/WorkItemDetail; Projects/Resources/PersonDetail |
| PartyTimeEntries | ClockInForm | Projects/Time/TimeEntries |  |
| PartyTimeEntries | WorkerInvoice | Projects/Billing/Unbilled |  |
| PartyTimeEntries | TimeEntryList | Projects/Time/TimeEntries; Projects/Resources/PersonDetail | Projects/Time/TimeEntries; Projects/Resources/PersonDetail |
| EditTimeEntry | AddTimeForm | Projects/QuickCreate; Projects/WorkItems/WorkItemDetail; Projects/Time/MyTime; Projects/Time/TimeEntries | Projects/QuickCreate; Projects/WorkItems/WorkItemDetail; Projects/Time/MyTime; Projects/Time/TimeEntries |
| EditPaymentMethod | PaymentMethodInfoForm | Accounting/Banking/BankAccountDetail; Accounting/Settings/PaymentMethods |  |
| EditPaymentMethod | NewContentForm | Accounting/Banking/BankAccountDetail; Accounting/Settings/PaymentMethods |  |
| EditPaymentMethod | UpdateContentForm | Accounting/Banking/BankAccountDetail; Accounting/Settings/PaymentMethods |  |
| EditPaymentMethod | UpdateBankAccountMutable | Accounting/Banking/BankAccountDetail; Accounting/Settings/PaymentMethods |  |
| EditPaymentMethod | UpdatePaymentMethodMutable | Accounting/Banking/BankAccountDetail; Accounting/Settings/PaymentMethods |  |
| PaymentGatewayResponses | GatewayResponseList | Accounting/Payments/GatewayTransactions |  |
| PaymentMethodChecks | CheckList | Accounting/Banking/BankAccountDetail; Accounting/Payables/PaymentRunDetail |  |
| PaymentMethodFiles | GenerateNachaFile | Accounting/Banking/BankAccountDetail; Accounting/Payables/PaymentRunDetail |  |
| PaymentMethodFiles | GeneratePosPayFile | Accounting/Banking/BankAccountDetail; Accounting/Payables/PaymentRunDetail |  |
| PaymentMethodFiles | FileList | Accounting/Banking/BankAccountDetail; Accounting/Payables/PaymentRunDetail |  |
| PaymentMethodTrans | AddTransForm | Accounting/Banking/BankAccountDetail; Accounting/Banking/ReconciliationDetail |  |
| PaymentMethodTrans | UploadOfxV1Form | Accounting/Banking/StatementImport |  |
| PaymentMethodTrans | UploadBaiV2Form | Accounting/Banking/StatementImport |  |
| PaymentMethodTrans | AutoMatchReconcileForm | Accounting/Banking/ReconciliationDetail |  |
| PaymentMethodTrans | TransList | Accounting/Banking/BankAccountDetail; Accounting/Banking/ReconciliationDetail |  |
| PaymentMethodTrans | ManRecForm | Accounting/Banking/ReconciliationDetail |  |
| CreatePayment | CreatePaymentForm | Accounting/Payments/Payments |  |

## ProductStore (34 forms)

| Screen XML | Form | Designed in | Implemented in |
| --- | --- | --- | --- |
| EditProductStore | CloneProductStoreForm |  |  |
| EditProductStore | EditStoreForm |  |  |
| EditProductStore | NewShippingOptionForm |  |  |
| EditProductStore | ShipOptionsForm |  |  |
| EditProductStore | NewShippingGatewayForm |  |  |
| EditProductStore | ShippingGatewaysForm |  |  |
| EditProductStore | NewPaymentGatewayForm |  |  |
| EditProductStore | PaymentGatewayForm |  |  |
| EditProductStore | NewStoreDataDocumentForm |  |  |
| EditProductStore | StoreDataDocumentForm |  |  |
| FindProductStore | NewStoreForm |  |  |
| FindProductStore | StoresForm |  |  |
| FindProductStoreCategory | NewStoreCategoryForm |  |  |
| FindProductStoreCategory | StoreCategoriesForm |  |  |
| FindProductStoreEmails | NewStoreEmailForm |  |  |
| FindProductStoreEmails | StoreEmailsForm |  |  |
| FindProductStoreFacility | NewStoreFacilityForm |  |  |
| FindProductStoreFacility | StoreFacilityFormList |  |  |
| FindProductStoreParty | NewStorePartyForm |  |  |
| FindProductStoreParty | StorePartyFormList |  |  |
| FindProductStoreSettings | SelectStoreSettingForm |  |  |
| FindProductStoreSettings | NewStoreSettingForm |  |  |
| FindProductStoreSettings | StoreSettingsForm |  |  |
| EditPromotion | EditPromotionForm |  |  |
| EditPromotion | PromoParameterForm |  |  |
| EditPromotion | AddProductForm |  |  |
| EditPromotion | ProductsForm |  |  |
| FindPromotion | NewPromotionForm |  |  |
| FindPromotion | PromotionsForm |  |  |
| EditPromoCode | EditPromoCodeForm |  |  |
| EditPromoCode | NewPromoCodePartyForm |  |  |
| EditPromoCode | PromoCodePartyForm |  |  |
| FindPromoCode | NewPromoCodeForm |  |  |
| FindPromoCode | PromoCodeForm |  |  |

## Project (26 forms)

| Screen XML | Form | Designed in | Implemented in |
| --- | --- | --- | --- |
| EditMilestones | CreateMilestoneForm | Projects/Projects/Roadmap | Projects/Projects/Roadmap |
| EditMilestones | MilestoneList | Projects/Projects/Roadmap; Projects/Projects/MilestoneDetail | Projects/Projects/Roadmap; Projects/Projects/MilestoneDetail |
| EditProject | CloneProject | Projects/Projects/NewProject; Projects/Projects/ProjectDetail; Projects/Projects/ProjectDetail/Settings; Projects/Settings/Templates | Projects/Projects/NewProject; Projects/Projects/ProjectDetail; Projects/Projects/ProjectDetail/Settings; Projects/Settings/Templates |
| EditProject | EditProject | Projects/Projects/ProjectDetail/Overview; Projects/Projects/ProjectDetail/Money; Projects/Projects/ProjectDetail/Settings | Projects/Projects/ProjectDetail/Overview; Projects/Projects/ProjectDetail/Money; Projects/Projects/ProjectDetail/Settings |
| EditRepositories | AddRepositoryForm | Projects/Projects/ProjectDetail/Code; Projects/Code/Repositories | Projects/Projects/ProjectDetail/Code; Projects/Code/Repositories |
| EditRepositories | CreateRepositoryForm | Projects/Projects/ProjectDetail/Code; Projects/Code/Repositories | Projects/Projects/ProjectDetail/Code; Projects/Code/Repositories |
| EditRepositories | RepositoryList | Projects/Projects/ProjectDetail/Code; Projects/Code/Repositories | Projects/Projects/ProjectDetail/Code; Projects/Code/Repositories |
| EditRepositories | ProjectRefList | Projects/Projects/ProjectDetail/Code; Projects/Code/RepositoryDetail/Tags | Projects/Projects/ProjectDetail/Code; Projects/Code/RepositoryDetail/Tags |
| EditUsers | AddUserAssignForm | Projects/Projects/NewProject; Projects/Projects/ProjectDetail/Team | Projects/Projects/NewProject; Projects/Projects/ProjectDetail/Team |
| EditUsers | UpdateUserAssignForm | Projects/Projects/ProjectDetail/Team | Projects/Projects/ProjectDetail/Team |
| EditWikiPages | AddWpweForm | Projects/Projects/ProjectDetail/Docs | Projects/Projects/ProjectDetail/Docs |
| EditWikiPages | DeleteWpweForm | Projects/Projects/ProjectDetail/Docs | Projects/Projects/ProjectDetail/Docs |
| FindProject | NewProject | Projects/QuickCreate; Projects/Projects/NewProject | Projects/QuickProject; Projects/Projects/NewProject |
| FindProject | ListProjects | Projects/Projects | Projects/Projects/List |
| MilestoneSummary | InactiveTaskList | Projects/Projects/MilestoneDetail | Projects/Projects/MilestoneDetail |
| MilestoneSummary | ActiveTaskList | Projects/Projects/MilestoneDetail | Projects/Projects/MilestoneDetail |
| MilestoneSummary | DoneTaskList | Projects/Projects/MilestoneDetail | Projects/Projects/MilestoneDetail |
| ProjectProgressReport | ChildStatsListDays | Projects/Reports/Progress; Projects/Projects/ProjectDetail/Overview | Projects/Reports/Progress; Projects/Projects/ProjectDetail/Overview |
| ProjectProgressReport | MilestoneStatsList | Projects/Projects/MilestoneDetail; Projects/Reports/Progress | Projects/Projects/MilestoneDetail; Projects/Reports/Progress |
| ProjectSummary | ViewProject | Projects/Projects/ProjectDetail; Projects/Projects/ProjectDetail/Overview | Projects/Projects/ProjectDetail; Projects/Projects/ProjectDetail/Overview |
| ProjectSummary | MilestoneList | Projects/Projects/ProjectDetail/Overview; Projects/Projects/Roadmap | Projects/Projects/ProjectDetail/Overview; Projects/Projects/Roadmap |
| ProjectSummary | ViewWpweForm | Projects/Projects/ProjectDetail/Docs | Projects/Projects/ProjectDetail/Docs |
| ProjectSummary | ViewUserAssignForm | Projects/Projects/ProjectDetail/Overview | Projects/Projects/ProjectDetail/Overview |
| ProjectSummary | ViewGitRepositoryList | Projects/Projects/ProjectDetail/Overview | Projects/Projects/ProjectDetail/Overview |
| ProjectSummary | ViewGitTagList | Projects/Projects/ProjectDetail/Code; Projects/Code/RepositoryDetail/Tags | Projects/Projects/ProjectDetail/Code; Projects/Code/RepositoryDetail/Tags |
| ProjectTimeEntries | TimeEntryListForm | Projects/Projects/ProjectDetail/Time; Projects/Time/TimeEntries | Projects/Projects/ProjectDetail/Time; Projects/Time/TimeEntries |

## Request (22 forms)

| Screen XML | Form | Designed in | Implemented in |
| --- | --- | --- | --- |
| EditRequest | EditRequest | Projects/Requests/RequestDetail; Purchasing/Requests/RequestDetail; CustomerService/Cases/CaseDetail | Projects/Requests/RequestDetail |
| EditRequest | AddCommentForm | Commons/Requests/RequestDetail; Projects/Requests/RequestDetail; Shared/Chatter; Purchasing/Requests/RequestDetail; CustomerService/Cases/CaseDetail | Commons/Requests/RequestDetail; Shared/Chatter; Projects/Requests/RequestDetail |
| EditRequest | AddPartyForm | Projects/Requests/RequestDetail; Purchasing/Requests/RequestDetail; CustomerService/Cases/CaseDetail | Projects/Requests/RequestDetail |
| EditRequest | UpdatePartyForm | Projects/Requests/RequestDetail; Purchasing/Requests/RequestDetail; CustomerService/Cases/CaseDetail | Projects/Requests/RequestDetail |
| EditRequest | NewNoteForm | Commons/Requests/RequestDetail; Projects/Requests/RequestDetail; Shared/Chatter; Purchasing/Requests/RequestDetail; CustomerService/Cases/CaseDetail | Commons/Requests/RequestDetail; Shared/Chatter; Projects/Requests/RequestDetail |
| EditRequest | UpdateNoteForm | Commons/Requests/RequestDetail; Projects/Requests/RequestDetail; Shared/Chatter; Purchasing/Requests/RequestDetail; CustomerService/Cases/CaseDetail | Commons/Requests/RequestDetail; Shared/Chatter; Projects/Requests/RequestDetail |
| EditRequest | NewContentForm | Commons/Requests/RequestDetail; Projects/Requests/RequestDetail; Shared/RecordFiles; Purchasing/Requests/RequestDetail; CustomerService/Cases/CaseDetail | Commons/Requests/RequestDetail; Shared/RecordFiles; Projects/Requests/RequestDetail |
| EditRequest | UpdateContentForm | Commons/Requests/RequestDetail; Projects/Requests/RequestDetail; Shared/RecordFiles; Purchasing/Requests/RequestDetail; CustomerService/Cases/CaseDetail | Commons/Requests/RequestDetail; Shared/RecordFiles; Projects/Requests/RequestDetail |
| EditRequest | RequestTaskList | Commons/Requests/RequestDetail; Projects/Requests/RequestDetail; Purchasing/Requests/RequestDetail; CustomerService/Cases/CaseDetail | Commons/Requests/RequestDetail; Projects/Requests/RequestDetail |
| RequestCommentReply | ReplyCommentForm | Projects/Requests/RequestDetail; Shared/Chatter; Purchasing/Requests/RequestDetail; CustomerService/Cases/CaseDetail | Projects/Requests/RequestDetail |
| RequestCommentUpdate | ReplyCommentForm | Projects/Requests/RequestDetail; Shared/Chatter; Purchasing/Requests/RequestDetail; CustomerService/Cases/CaseDetail | Projects/Requests/RequestDetail |
| EditRequestItems | NewRequestItemForm | Projects/Requests/RequestDetail; Purchasing/Requests/RequestDetail; CustomerService/Cases/CaseDetail |  |
| EditRequestItems | RequestItemListForm | Projects/Requests/RequestDetail; Purchasing/Requests/RequestDetail; CustomerService/Cases/CaseDetail |  |
| EditTasks | AddRweForm | Projects/Requests/RequestDetail; Purchasing/Requests/RequestDetail; CustomerService/Cases/CaseDetail | Projects/Requests/RequestDetail |
| EditTasks | NewTaskForm | Projects/Requests/RequestDetail; Purchasing/Requests/RequestDetail; CustomerService/Cases/CaseDetail | Projects/Requests/RequestDetail |
| EditTasks | UpdateRweForm | Projects/Requests/RequestDetail; Purchasing/Requests/RequestDetail; CustomerService/Cases/CaseDetail | Projects/Requests/RequestDetail |
| EditUsers | AddUserForm | Projects/Requests/RequestDetail; Purchasing/Requests/RequestDetail; CustomerService/Cases/CaseDetail | Projects/Requests/RequestDetail |
| EditUsers | UpdateUserForm | Projects/Requests/RequestDetail; Purchasing/Requests/RequestDetail; CustomerService/Cases/CaseDetail | Projects/Requests/RequestDetail |
| EditWikiPages | AddWprForm | Commons/Knowledge; Projects/Requests/RequestDetail; Purchasing/Requests/RequestDetail; CustomerService/Cases/CaseDetail; CustomerService/Knowledge | Commons/Knowledge |
| EditWikiPages | DeleteWprForm | Commons/Knowledge; Projects/Requests/RequestDetail; Purchasing/Requests/RequestDetail; CustomerService/Cases/CaseDetail; CustomerService/Knowledge | Commons/Knowledge |
| FindRequest | NewRequestForm | Projects/Requests; Purchasing/Requests; CustomerService/Cases/NewCase | Projects/Requests/List |
| FindRequest | ListRequests | Commons/Requests; Projects/Requests; Purchasing/Requests; CustomerService/Cases; CustomerService/Home | Commons/Requests/List; Projects/Requests/List |

## Return (8 forms)

| Screen XML | Form | Designed in | Implemented in |
| --- | --- | --- | --- |
| AddOrderItems | LookBackDaysForm | Warehouse/Returns/ReturnDetail; Purchasing/Returns/ReturnDetail; CustomerService/Returns/NewReturn; ServicePortal/RequestReturn; Shared/ReturnDetail |  |
| AddOrderItems | AddOrderItemToReturn | Warehouse/Returns/ReturnDetail; Purchasing/Returns/ReturnDetail; CustomerService/Returns/NewReturn; ServicePortal/RequestReturn; Shared/ReturnDetail |  |
| EditReturn | AuditLogList | Warehouse/Returns/ReturnDetail; Purchasing/Returns/ReturnDetail; CustomerService/Returns/ReturnDetail; Shared/ReturnDetail |  |
| EditReturn | UpdateReturn | Warehouse/Returns/ReturnDetail; Purchasing/Returns/ReturnDetail; CustomerService/Returns/ReturnDetail; Shared/ReturnDetail |  |
| EditReturnItems | ReturnItemList | Warehouse/Returns/ReturnDetail; Purchasing/Returns/ReturnDetail; CustomerService/Returns/ReturnDetail; Shared/ReturnDetail |  |
| FindReturn | CreateReturn | Warehouse/Returns/Returns; CustomerService/Returns/NewReturn |  |
| FindReturn | CreateSupplierReturn | Warehouse/Returns/Returns; Purchasing/Returns |  |
| FindReturn | ReturnHeaderList | Warehouse/Returns/Returns; Purchasing/Returns; CustomerService/Returns; ServicePortal/MyReturns |  |

## Shipment (46 forms)

| Screen XML | Form | Designed in | Implemented in |
| --- | --- | --- | --- |
| FindShipment | NewOutgoingShipment | Warehouse/Shipping/Shipments |  |
| FindShipment | NewIncomingShipment | Warehouse/Receiving/Receipts |  |
| FindShipment | NewTransferShipment | Warehouse/Transfers/Transfers |  |
| FindShipment | ShipmentList | Warehouse/Receiving/Receipts; Warehouse/Shipping/Shipments; Warehouse/Transfers/Transfers; Purchasing/Receiving/Receipts |  |
| PackageTracking | EtaPackageList | Warehouse/Shipping/PackageTracking |  |
| ShipmentDetail | AuditLogList | Warehouse/Receiving/ReceiptDetail; Warehouse/Shipping/ShipmentDetail; Purchasing/Receiving/ShipmentDetail; Shared/ShipmentDetail |  |
| ShipmentDetail | EditShipment | Warehouse/Receiving/ReceiptDetail; Warehouse/Shipping/ShipmentDetail; Purchasing/Receiving/ShipmentDetail; Shared/ShipmentDetail |  |
| ShipmentDetail | ItemLimitForm | Warehouse/Receiving/ReceiptDetail; Warehouse/Shipping/ShipmentDetail; Purchasing/Receiving/ShipmentDetail; Shared/ShipmentDetail |  |
| ShipmentDetail | PackScanForm | Warehouse/Shipping/Pack; Warehouse/Handheld/Pack; Shared/ShipmentDetail |  |
| ShipmentDetail | PickScanForm | Warehouse/Picking/Pick; Warehouse/Handheld/Pick; Shared/ShipmentDetail |  |
| ShipmentDetail | ShipmentOrderPaymentList | Warehouse/Receiving/ReceiptDetail; Warehouse/Shipping/ShipmentDetail; Purchasing/Receiving/ShipmentDetail; Shared/ShipmentDetail |  |
| ShipmentDetail | ShipmentInvoicePaymentList | Warehouse/Receiving/ReceiptDetail; Warehouse/Shipping/ShipmentDetail; Purchasing/Receiving/ShipmentDetail; Shared/ShipmentDetail |  |
| ShipmentDetail | AddParty | Warehouse/Receiving/ReceiptDetail; Warehouse/Shipping/ShipmentDetail; Purchasing/Receiving/ShipmentDetail; Shared/ShipmentDetail |  |
| ShipmentDetail | RolesForm | Warehouse/Receiving/ReceiptDetail; Warehouse/Shipping/ShipmentDetail; Purchasing/Receiving/ShipmentDetail; Shared/ShipmentDetail |  |
| ShipmentDetail | NewContentForm | Warehouse/Receiving/ReceiptDetail; Warehouse/Shipping/ShipmentDetail; Shared/RecordFiles; Purchasing/Receiving/ShipmentDetail; Shared/ShipmentDetail |  |
| ShipmentDetail | UpdateContentForm | Warehouse/Receiving/ReceiptDetail; Warehouse/Shipping/ShipmentDetail; Shared/RecordFiles; Purchasing/Receiving/ShipmentDetail; Shared/ShipmentDetail |  |
| ShipmentDetail | SendPlacedEmailForm | Warehouse/Receiving/ReceiptDetail; Warehouse/Shipping/ShipmentDetail; Purchasing/Receiving/ShipmentDetail; Shared/ShipmentDetail |  |
| ShipmentDetail | EmailMessageList | Warehouse/Receiving/ReceiptDetail; Warehouse/Shipping/ShipmentDetail; Purchasing/Receiving/ShipmentDetail; Shared/ShipmentDetail |  |
| ShipmentDetail | ProduceAssembliesForm | Warehouse/Inventory/MaterialIssueReceipt; Warehouse/Shipping/Pack; Shared/ShipmentDetail |  |
| ShipmentDetail | AssemblyProduceProducts | Warehouse/Inventory/MaterialIssueReceipt; Warehouse/Shipping/Pack; Shared/ShipmentDetail |  |
| ShipmentDetail | AssemblyConsumeProducts | Warehouse/Inventory/MaterialIssueReceipt; Warehouse/Shipping/Pack; Shared/ShipmentDetail |  |
| ShipmentDetail | AddItemForm | Warehouse/Receiving/ReceiptDetail; Warehouse/Shipping/ShipmentDetail; Purchasing/Receiving/ShipmentDetail; Shared/ShipmentDetail |  |
| ItemReserve | ReserveItem | Warehouse/Shipping/ShipmentDetail; Shared/ShipmentDetail |  |
| ReceiveItem | ReceiveForm | Warehouse/Receiving/Receive; Warehouse/Handheld/Receive; Purchasing/Receiving/ShipmentDetail; Shared/ShipmentDetail |  |
| UpdateItemAsset | UpdateForm | Warehouse/Shipping/ShipmentDetail; Shared/ShipmentDetail |  |
| ShipmentItems | AssemblyPackUnusedComponents | Warehouse/Shipping/ShipmentDetail; Warehouse/Shipping/Pack; Shared/ShipmentDetail |  |
| ShipmentItems | SetPackedForm | Warehouse/Shipping/ShipmentDetail; Warehouse/Shipping/Pack; Shared/ShipmentDetail |  |
| ShipmentItems | SetDeliveredForm | Warehouse/Shipping/PackageTracking; Warehouse/Shipping/ShipmentDetail; Shared/ShipmentDetail |  |
| ShipmentItems | AddItemForm | Warehouse/Shipping/ShipmentDetail; Warehouse/Shipping/Pack; Purchasing/Receiving/ShipmentDetail; Shared/ShipmentDetail |  |
| ShipmentItems | ItemsOptionsForm | Warehouse/Shipping/ShipmentDetail; Warehouse/Shipping/Pack; Purchasing/Receiving/ShipmentDetail; Shared/ShipmentDetail |  |
| ShipmentItems | PackItemForm | Warehouse/Shipping/ShipmentDetail; Warehouse/Shipping/Pack; Shared/ShipmentDetail |  |
| ShipmentItems | PackComponentsForm | Warehouse/Shipping/ShipmentDetail; Warehouse/Shipping/Pack; Shared/ShipmentDetail |  |
| ShipmentItems | UpdateItemForm | Warehouse/Shipping/ShipmentDetail; Warehouse/Shipping/Pack; Purchasing/Receiving/ShipmentDetail; Shared/ShipmentDetail |  |
| ShipmentItems | AddItemToPackageForm | Warehouse/Shipping/ShipmentDetail; Warehouse/Shipping/Pack; Shared/ShipmentDetail |  |
| ShipmentItems | ItemSourceIssuanceList | Warehouse/Shipping/ShipmentDetail; Warehouse/Shipping/Pack; Shared/ShipmentDetail |  |
| ShipmentItems | PaComponentPackForm | Warehouse/Shipping/ShipmentDetail; Warehouse/Shipping/Pack; Shared/ShipmentDetail |  |
| ShipmentItems | ItemAssetIssuanceList | Warehouse/Shipping/ShipmentDetail; Warehouse/Shipping/Pack; Shared/ShipmentDetail |  |
| ShipmentItems | ItemSourceReceiptList | Warehouse/Receiving/ReceiptDetail; Warehouse/Returns/ReturnReceipt; Purchasing/Receiving/ShipmentDetail; Shared/ShipmentDetail |  |
| ShipmentItems | ItemAssetReceiptList | Warehouse/Receiving/ReceiptDetail; Warehouse/Returns/ReturnReceipt; Purchasing/Receiving/ShipmentDetail; Shared/ShipmentDetail |  |
| ShipmentPackages | SetShippedForm | Warehouse/Shipping/Ship; Warehouse/Shipping/ShipmentDetail; Shared/ShipmentDetail |  |
| ShipmentPackages | PrintAllShipmentLabels | Warehouse/Shipping/Ship; Warehouse/Shipping/ShipmentDetail; Shared/ShipmentDetail |  |
| ShipmentPackages | PackageOptionsForm | Warehouse/Shipping/ShipmentDetail; Warehouse/Shipping/Pack; Warehouse/Shipping/Ship; Shared/ShipmentDetail |  |
| ShipmentPackages | UpdatePackageForm | Warehouse/Shipping/ShipmentDetail; Warehouse/Shipping/Pack; Warehouse/Shipping/Ship; Shared/ShipmentDetail |  |
| ShipmentPackages | RequestRetLabel | Warehouse/Shipping/Ship; Warehouse/Shipping/ShipmentDetail; Shared/ShipmentDetail |  |
| ShipmentPackages | PrintShipmentLabel | Warehouse/Shipping/Ship; Warehouse/Shipping/ShipmentDetail; Shared/ShipmentDetail |  |
| ShipmentPackages | ShipmentPackageContentList | Warehouse/Shipping/ShipmentDetail; Warehouse/Shipping/Pack; Warehouse/Shipping/Ship; Shared/ShipmentDetail |  |

## Shipping (34 forms)

| Screen XML | Form | Designed in | Implemented in |
| --- | --- | --- | --- |
| PackItems | ItemsOptionsForm | Warehouse/Shipping/Pack; Warehouse/Handheld/Pack |  |
| PackItems | PackItemForm | Warehouse/Shipping/Pack; Warehouse/Handheld/Pack |  |
| PackItems | UpdateItemForm | Warehouse/Shipping/Pack; Warehouse/Handheld/Pack |  |
| PackItems | AddItemToPackageForm | Warehouse/Shipping/Pack; Warehouse/Handheld/Pack |  |
| PackItems | ItemSourceIssuanceList | Warehouse/Shipping/Pack; Warehouse/Handheld/Pack |  |
| PackItems | ItemAssetIssuanceList | Warehouse/Shipping/Pack; Warehouse/Handheld/Pack |  |
| PackPackages | PackageOptionsForm | Warehouse/Shipping/Pack; Warehouse/Shipping/Ship |  |
| PackPackages | UpdatePackageForm | Warehouse/Shipping/Pack; Warehouse/Shipping/Ship |  |
| PackPackages | RequestRetLabel | Warehouse/Shipping/Pack; Warehouse/Shipping/Ship |  |
| PackPackages | PrintShipmentLabel | Warehouse/Shipping/Pack; Warehouse/Shipping/Ship |  |
| PackPackages | ShipmentPackageContentList | Warehouse/Shipping/Pack; Warehouse/Shipping/Ship |  |
| PackSummary | PrintAllShipmentLabels | Warehouse/Shipping/Pack; Warehouse/Shipping/Ship; Warehouse/Handheld/Pack |  |
| PackSummary | SetShippedForm | Warehouse/Shipping/Pack; Warehouse/Shipping/Ship; Warehouse/Handheld/Pack |  |
| PackSummary | PackScanForm | Warehouse/Shipping/Pack; Warehouse/Shipping/Ship; Warehouse/Handheld/Pack |  |
| PackSummary | ClosePackageForm | Warehouse/Shipping/Pack; Warehouse/Shipping/Ship; Warehouse/Handheld/Pack |  |
| PackSummary | ShipmentPackageContentList | Warehouse/Shipping/Pack; Warehouse/Shipping/Ship; Warehouse/Handheld/Pack |  |
| PackCompleted | AssemblyPackUnusedComponents | Warehouse/Shipping/Pack |  |
| PackCompleted | PackCompletedForm | Warehouse/Shipping/Pack |  |
| PickLocationMoves | PickMoveList | Warehouse/Picking/PickLocationMoves |  |
| QuickMove | ScanMoveAssetForm | Warehouse/Picking/PickLocationMoves |  |
| AddOrder | AddOrderList | Warehouse/Picking/PicklistDetail |  |
| AddShipment | AddShipmentList | Warehouse/Picking/PicklistDetail |  |
| BulkPicklist | CreatePicklistsForm | Warehouse/Picking/CreatePicklists |  |
| BulkPicklist | AddOrderList | Warehouse/Picking/CreatePicklists |  |
| FindPicklist | NewPicklist | Warehouse/Picking/Picklists |  |
| FindPicklist | PicklistList | Warehouse/Picking/Picklists |  |
| PicklistDetail | UpdateShipmentLoad | Warehouse/Picking/PicklistDetail |  |
| PicklistDetail | ListShipments | Warehouse/Picking/PicklistDetail |  |
| PicklistDetail | AddPartyAssignForm | Warehouse/Picking/PicklistDetail |  |
| PicklistDetail | UpdateAssignForm | Warehouse/Picking/PicklistDetail |  |
| PicklistDetail | AddAsset | Warehouse/Picking/PicklistDetail |  |
| PicklistDetail | UpdateAssetAssign | Warehouse/Picking/PicklistDetail |  |
| dashboard | PackShipmentForm | Warehouse/Shipping/Pack; Warehouse/Handheld/Pack |  |
| dashboard | FacilitySummary | Warehouse/Home |  |

## SimpleReport (9 forms)

| Screen XML | Form | Designed in | Implemented in |
| --- | --- | --- | --- |
| EditReport | EditDataDocument |  |  |
| FieldList | AddCondition |  |  |
| FieldList | ConditionList |  |  |
| FieldList | FieldList |  |  |
| FindReport | CreateDataDocument |  |  |
| FindReport | DataDocumentList |  |  |
| QuickViewReport | DataDocumentList |  |  |
| ViewReport | ExportDocuments |  |  |
| ViewReport | DataViewList |  |  |

## Supplier (4 forms)

| Screen XML | Form | Designed in | Implemented in |
| --- | --- | --- | --- |
| FindSupplier | CreatePersonForm | Purchasing/Suppliers |  |
| FindSupplier | CreateOrganizationForm | Purchasing/Suppliers |  |
| FindSupplier | OuterSearchForm | Purchasing/Suppliers |  |
| FindSupplier | SupplierListForm | Purchasing/Suppliers |  |

## Survey (14 forms)

| Screen XML | Form | Designed in | Implemented in |
| --- | --- | --- | --- |
| EditSurvey | EditSurveyForm | CustomerService/Settings/FeedbackFormDetail |  |
| EditSurvey | NewUserGroupForm | CustomerService/Settings/FeedbackFormDetail |  |
| EditSurvey | UserGroupForm | CustomerService/Settings/FeedbackFormDetail |  |
| Fields | NewDbFormFieldForm | CustomerService/Settings/FeedbackFormDetail |  |
| Fields | SurveyPreview | CustomerService/Settings/FeedbackFormDetail |  |
| Fields | DbFormFieldList | CustomerService/Settings/FeedbackFormDetail |  |
| Fields | NewFieldOptionForm | CustomerService/Settings/FeedbackFormDetail |  |
| Fields | FieldOptionForm | CustomerService/Settings/FeedbackFormDetail |  |
| FindSurvey | NewSurveyForm | CustomerService/Settings/FeedbackForms |  |
| FindSurvey | SurveyList | CustomerService/Settings/FeedbackForms |  |
| ResponseDetails | ResponseDetailsForm | CustomerService/Reports/ResponseDetail |  |
| ResponseStats | TextDbFormFieldResponseCountList | CustomerService/Reports/CsatResults |  |
| ResponseStats | FieldOptionForm | CustomerService/Reports/CsatResults |  |
| Responses | ResponseListForm | CustomerService/Reports/CsatResults |  |

## Task (32 forms)

| Screen XML | Form | Designed in | Implemented in |
| --- | --- | --- | --- |
| EditRelated | AddRelatedToForm | Projects/WorkItems/WorkItemDetail | Projects/WorkItems/WorkItemDetail |
| EditRelated | AddRelatedFromForm | Projects/WorkItems/WorkItemDetail | Projects/WorkItems/WorkItemDetail |
| EditRelated | DeleteRelatedToForm | Projects/WorkItems/WorkItemDetail | Projects/WorkItems/WorkItemDetail |
| EditRelated | DeleteRelatedFromForm | Projects/WorkItems/WorkItemDetail | Projects/WorkItems/WorkItemDetail |
| EditRequests | AddRweForm | Projects/WorkItems/WorkItemDetail | Projects/WorkItems/WorkItemDetail |
| EditRequests | DeleteRweForm | Projects/WorkItems/WorkItemDetail | Projects/WorkItems/WorkItemDetail |
| EditSource | AddCommitForm | Projects/WorkItems/WorkItemDetail; Projects/Code/CommitDetail | Projects/WorkItems/WorkItemDetail; Projects/Code/CommitDetail |
| EditSource | AddRefForm | Projects/Projects/ReleaseDetail; Projects/WorkItems/WorkItemDetail | Projects/Projects/ReleaseDetail; Projects/WorkItems/WorkItemDetail |
| EditSource | TaskCommitList | Projects/WorkItems/WorkItemDetail; Projects/Code/RepositoryDetail/Commits | Projects/WorkItems/WorkItemDetail; Projects/Code/RepositoryDetail/Commits |
| EditSource | TaskRefList | Projects/WorkItems/WorkItemDetail | Projects/WorkItems/WorkItemDetail |
| EditTask | EditTask | Projects/WorkItems/WorkItemDetail | Projects/WorkItems/WorkItemDetail |
| EditTimeEntries | ClockInForm | Projects/WorkItems/WorkItemDetail | Projects/WorkItems/WorkItemDetail |
| EditTimeEntries | AddTaskTime | Projects/QuickCreate; Projects/WorkItems/WorkItemDetail | Projects/QuickCreate; Projects/WorkItems/WorkItemDetail |
| EditTimeEntries | TimeEntryList | Projects/WorkItems/WorkItemDetail | Projects/WorkItems/WorkItemDetail |
| EditUsers | AddUserAssignForm | Projects/WorkItems/WorkItemDetail | Projects/WorkItems/WorkItemDetail |
| EditUsers | AddTeamAssignForm | Projects/Projects/ProjectDetail/Team; Projects/WorkItems/WorkItemDetail | Projects/Projects/ProjectDetail/Team; Projects/WorkItems/WorkItemDetail |
| EditUsers | UpdateAssignForm | Projects/WorkItems/WorkItemDetail | Projects/WorkItems/WorkItemDetail |
| EditWikiPages | AddWpweForm | Commons/Knowledge; Projects/WorkItems/WorkItemDetail | Commons/Knowledge |
| EditWikiPages | DeleteWpweForm | Commons/Knowledge; Projects/WorkItems/WorkItemDetail | Commons/Knowledge |
| FindTask | SearchOptions | Commons/Tasks; Projects/WorkItems | Commons/Tasks/List; Projects/WorkItems/List |
| FindTask | NewTaskForm | Commons/Tasks; Projects/QuickCreate; Projects/WorkItems | Commons/Tasks/List; Projects/QuickCreate; Projects/WorkItems/List |
| FindTask | ListTasks | Commons/Tasks; Projects/WorkItems | Commons/Tasks/List; Projects/WorkItems/List |
| FindTask | AssignTaskSelected | Commons/Tasks; Projects/WorkItems | Commons/Tasks/List; Projects/WorkItems/List |
| FindTask | UnAssignTaskSelected | Commons/Tasks; Projects/WorkItems | Commons/Tasks/List; Projects/WorkItems/List |
| FindTask | UpdateTaskSelected | Commons/Tasks; Projects/WorkItems | Commons/Tasks/List; Projects/WorkItems/List |
| TaskSummary | ClockInForm | Commons/Tasks/TaskDetail; Projects/WorkItems/WorkItemDetail | Commons/Tasks/TaskDetail; Projects/WorkItems/WorkItemDetail |
| TaskSummary | AddCommentForm | Commons/Tasks/TaskDetail; Projects/WorkItems/WorkItemDetail; Shared/Chatter | Commons/Tasks/TaskDetail; Shared/Chatter; Projects/WorkItems/WorkItemDetail |
| TaskSummary | NewChildTaskForm | Commons/Tasks/TaskDetail; Projects/WorkItems/WorkItemDetail | Commons/Tasks/TaskDetail; Projects/WorkItems/WorkItemDetail |
| TaskSummary | NewContentForm | Commons/Tasks/TaskDetail; Projects/WorkItems/WorkItemDetail; Shared/RecordFiles | Commons/Tasks/TaskDetail; Shared/RecordFiles; Projects/WorkItems/WorkItemDetail |
| TaskSummary | UpdateContentForm | Commons/Tasks/TaskDetail; Projects/WorkItems/WorkItemDetail; Shared/RecordFiles | Commons/Tasks/TaskDetail; Shared/RecordFiles; Projects/WorkItems/WorkItemDetail |
| TaskCommentReply | ReplyCommentForm | Commons/Tasks/TaskDetail; Projects/WorkItems/WorkItemDetail; Shared/Chatter | Commons/Tasks/TaskDetail; Shared/Chatter; Projects/WorkItems/WorkItemDetail |
| TaskCommentUpdate | ReplyCommentForm | Commons/Tasks/TaskDetail; Projects/WorkItems/WorkItemDetail; Shared/Chatter | Commons/Tasks/TaskDetail; Shared/Chatter; Projects/WorkItems/WorkItemDetail |

## Vendor (10 forms)

| Screen XML | Form | Designed in | Implemented in |
| --- | --- | --- | --- |
| EditUsers | AddUserRelationshipForm |  |  |
| EditUsers | UpdateUserRelForm |  |  |
| EditVendor | PaymentInfo |  |  |
| EditVendor | SetVendorRepForm |  |  |
| EditVendor | BillingInfo |  |  |
| EditVendor | EditVendor |  |  |
| EditVendor | RoleList |  |  |
| FindVendor | FindVendor |  |  |
| FindVendor | CreateVendor |  |  |
| FindVendor | VendorList |  |  |

## Wiki (18 forms)

| Screen XML | Form | Designed in | Implemented in |
| --- | --- | --- | --- |
| EditWikiBlog | EditBlogForm |  |  |
| EditWikiBlog | AddCategory |  |  |
| EditWikiBlog | CategoriesForm |  |  |
| EditWikiPage | EditPageForm | Commons/Knowledge | Commons/Knowledge |
| EditWikiSpace | CloneSpace | Commons/Knowledge/Spaces | Commons/Knowledge/Spaces |
| EditWikiSpace | EditSpace | Commons/Knowledge/Spaces | Commons/Knowledge/SpaceDetail |
| WikiBlogs | AddBlogPage |  |  |
| WikiBlogs | AddBlogText |  |  |
| WikiBlogs | WikiBlogList |  |  |
| WikiSpaces | NewSpace | Commons/Knowledge/Spaces | Commons/Knowledge/Spaces |
| WikiSpaces | WikiSpaceList | Commons/Knowledge/Spaces | Commons/Knowledge/Spaces |
| wiki | AddPageForm | Commons/Knowledge | Commons/Knowledge |
| wiki | ClonePage | Commons/Knowledge | Commons/Knowledge |
| wiki | AddCommentForm | Commons/Knowledge; Shared/Chatter | Commons/Knowledge; Shared/Chatter |
| wiki | UploadAttachment | Commons/Knowledge; Shared/RecordFiles | Commons/Knowledge |
| wiki | AddCategory | Commons/Knowledge; Commons/Notes | Commons/Knowledge; Commons/Notes |
| wiki | CategoriesForm | Commons/Knowledge; Commons/Notes | Commons/Knowledge; Commons/Notes |
| WikiCommentReply | ReplyCommentForm | Commons/Knowledge; Shared/Chatter | Commons/Knowledge; Shared/Chatter |

## BasicHandheld (Warehouse handheld) (16 forms)

| Screen XML | Form | Designed in | Implemented in |
| --- | --- | --- | --- |
| ReceiveAsset | ScanAssetForm | Warehouse/Handheld/Receive |  |
| ReceiveAsset | ActiveFacilityForm | Warehouse/Handheld/Receive |  |
| ReceiveAsset | ReceiveAssetForm | Warehouse/Handheld/Receive |  |
| SelectAsset | ScanAssetForm | Warehouse/Handheld/Move |  |
| SelectAsset | ActiveFacilityForm | Warehouse/Handheld/Move |  |
| SelectAsset | ScanMoveAssetForm | Warehouse/Handheld/Move |  |
| SelectAsset | ContainerAssetList | Warehouse/Handheld/Move |  |
| SelectAsset | LocationAssetList | Warehouse/Handheld/Move |  |
| SelectAsset | ProductNoLocAssetList | Warehouse/Handheld/Move |  |
| SelectAsset | RecentMoveForm | Warehouse/Handheld/Move |  |
| SelectAsset | RecentContainerMoveForm | Warehouse/Handheld/Move |  |
| PickLocationMoves | ActiveFacilityForm | Warehouse/Picking/PickLocationMoves |  |
| PickLocationMoves | PickMoveList | Warehouse/Picking/PickLocationMoves |  |
| dashboard | ActiveFacilityForm | Warehouse/Handheld/Home |  |
| dashboard | ScanAssetForm | Warehouse/Handheld/Home |  |
| dashboard | PackShipmentForm | Warehouse/Handheld/Home |  |

## Shared root screens (5 forms)

| Screen XML | Form | Designed in | Implemented in |
| --- | --- | --- | --- |
| Search | SearchOptions | Commons/Search | Commons/Search |
| Search | SearchResults | Commons/Search | Commons/Search |
| QuickSearch | SearchOptions | — | — |
| QuickSearch | SearchResults | — | — |
| QuickLookup | QuickLookupForm | — | — |
