// Every Accounting destination at every required width in both themes, from one table: groups of a user, a screenshot
// prefix and its pages; each page names a text it shows, so a page that renders but is wrong fails.
const adminPages = [
    ["Home", "Home", "Shortcuts"],
    ["Invoices", "Receivables/Invoices", "Accounting demo customer invoice"],
    ["Invoice", "Receivables/InvoiceDetail?recordId=BOSS_ACCT_INVOICE", "Accounting demo customer invoice"],
    ["Bills", "Payables/Bills", "Accounting demo supplier bill"],
    ["Bill", "Payables/BillDetail?recordId=BOSS_ACCT_BILL", "Accounting demo supplier bill"],
    ["Payments", "Payments/Payments", "Payment customer"],
    ["Payment", "Payments/PaymentDetail?recordId=BOSS_ACCT_PAY_DRAFT", "Payment customer"],
    ["PaymentGatewayTransactions", "Payments/GatewayTransactions?paymentId=BOSS_ACCT_PAY_DELIVERED", "Gateway transactions"],
    ["PaymentPrint", "Payments/PaymentPrint?paymentId=BOSS_ACCT_PAY_DELIVERED&outputType=receipt", "BOSS_ACCT_PAY_DELIVERED"],
    [
        "PaymentDetailPrint",
        "Payments/PaymentPrint?paymentId=BOSS_ACCT_PAY_DELIVERED&outputType=detail",
        "BOSS_ACCT_PAY_DELIVERED"
    ],
    ["PaymentCheckPrint", "Payments/PaymentPrint?paymentId=BOSS_ACCT_PAY_CHECK&outputType=check", "BOSS_ACCT_PAY_CHECK"],
    ...[
        ["Overview", "Payment overview"],
        ["Applications", "Applications and open items"],
        ["Gateway", "Gateway evidence"],
        ["Refunds", "Linked refunds"],
        ["GeneralLedger", "Payment ledger"],
        ["Files", "Payment files and issued documents"],
        ["History", "Payment history"]
    ].map(([tab, text]) => [
        "PaymentTab" + tab,
        "Payments/PaymentDetail/" +
            tab +
            "?recordId=" +
            (tab === "Applications"
                ? "BOSS_ACCT_PAY_APPLIED"
                : tab === "GeneralLedger"
                  ? "BOSS_ACCT_PAY_DELIVERED"
                  : "BOSS_ACCT_PAY_DRAFT"),
        text
    ]),
    ["PaymentCreate", "Payments/Payments", "Payments", {open: "New payment", dialogText: "New payment"}],
    [
        "PaymentEdit",
        "Payments/PaymentDetail?recordId=BOSS_ACCT_PAY_DRAFT",
        "Payment customer",
        {openMore: true, open: "Edit draft", dialogText: "Edit payment BOSS_ACCT_PAY_DRAFT"}
    ],
    [
        "PaymentValidate",
        "Payments/PaymentDetail?recordId=BOSS_ACCT_PAY_EVIDENCE_DRAFT",
        "Payment customer",
        {open: "Validate payment", dialogText: "Validate payment BOSS_ACCT_PAY_EVIDENCE_DRAFT"}
    ],
    [
        "PaymentDeliver",
        "Payments/PaymentDetail?recordId=BOSS_ACCT_PAY_VALIDATED",
        "Payment customer",
        {open: "Record delivery", dialogText: "Record delivery BOSS_ACCT_PAY_VALIDATED"}
    ],
    [
        "PaymentConfirm",
        "Payments/PaymentDetail?recordId=BOSS_ACCT_PAY_DELIVERED",
        "Payment customer",
        {open: "Confirm settlement", dialogText: "Confirm settlement BOSS_ACCT_PAY_DELIVERED"}
    ],
    [
        "PaymentCancel",
        "Payments/PaymentDetail?recordId=BOSS_ACCT_PAY_DRAFT",
        "Payment customer",
        {openMore: true, open: "Cancel payment", dialogText: "Cancel payment BOSS_ACCT_PAY_DRAFT"}
    ],
    [
        "PaymentVoid",
        "Payments/PaymentDetail?recordId=BOSS_ACCT_PAY_DELIVERED",
        "Payment customer",
        {openMore: true, open: "Void payment", dialogText: "Void payment BOSS_ACCT_PAY_DELIVERED"}
    ],
    [
        "PaymentRelease",
        "Payments/PaymentDetail/Applications?recordId=BOSS_ACCT_PAY_APPLIED",
        "BOSS_ACCT_PAY_INVOICE",
        {open: "Release applications", dialogText: "Release selected applications for BOSS_ACCT_PAY_APPLIED"}
    ],
    [
        "PaymentIssuedFiles",
        "Payments/PaymentDetail/Files?recordId=BOSS_ACCT_PAY_CHECK",
        "Payment files and issued documents",
        {paymentIssuedFiles: true}
    ],
    ["Chart", "GeneralLedger/ChartOfAccounts", "Chart of accounts"],
    ["Account", "GeneralLedger/AccountDetail?recordId=111100000", "Open account ledger"],
    ["Journals", "GeneralLedger/JournalEntries", "Office expense review"],
    ["Draft", "GeneralLedger/JournalEntryDetail?recordId=BOSS_ACCT_ENTRY", "Review posting"],
    ["Posted", "GeneralLedger/JournalEntryDetail?recordId=BOSS_ACCT_POSTED", "Posted office expense"],
    ["Lines", "GeneralLedger/TransactionEntries", "Office expense review"],
    ["Batches", "GeneralLedger/JournalBatches", "New journal batch"],
    ["Templates", "GeneralLedger/JournalTemplates", "New journal template"],
    ["Periods", "PeriodClose/Periods", "Generate periods"],
    ["Locks", "PeriodClose/PeriodLocks", "Add posting lock"],
    ["Reports", "Reports/Reports", "Open trial balance"],
    ["TrialBalance", "Reports/TrialBalance", "Run report"],
    ["Ledger", "Reports/GeneralLedger", "Run report"],
    ["Settings", "Settings/Settings", "Accounting settings"],
    ["AccountingPreferences", "Settings/AccountingPreferences", "Save preferences"],
    ["PostingDefaults", "Settings/PostingDefaults", "Add mapping"],
    ["PaymentTerms", "Settings/PaymentTerms", "New due term"],
    ["Currencies", "Settings/Currencies", "Add exchange rate"],
    ["PaymentMethods", "Settings/PaymentMethods", "New payment method"],
    ["DocumentSettings", "Settings/DocumentSettings", "Invoice preview"],
    ["NewInvoice", "QuickCreate/NewInvoice", "Create draft invoice"],
    ["NewBill", "QuickCreate/NewBill", "Create draft bill"],
    ["NewPayment", "QuickCreate/NewPayment", "Create payment"],
    ["NewEntry", "QuickCreate/NewEntry", "Create draft entry"],
    ["InvoiceCalendar", "Receivables/Invoices?view=calendar", "Invoices"],
    ["InvoicePivot", "Receivables/Invoices?view=pivot", "Invoices"],
    ["InvoiceGraph", "Receivables/Invoices?view=graph", "Invoices"],
    ["BillingQueue", "Receivables/BillingQueue", "Billing queue"],
    ["Settlement", "Receivables/ReceivablesWorkbench?partyId=BOSS_ACCT_STL_CUSTOMER", "Allocate receipts and credits"],
    [
        "SettlementAllocation",
        "Receivables/ReceivablesWorkbench?partyId=BOSS_ACCT_STL_CUSTOMER",
        "Allocate receipts and credits",
        {open: "Add allocation"}
    ],
    [
        "SettlementAdjustment",
        "Receivables/ReceivablesWorkbench?partyId=BOSS_ACCT_STL_CUSTOMER",
        "Allocate receipts and credits",
        {open: "Add discount or write-off"}
    ],
    ["InvoiceBatch", "Receivables/InvoiceBatch?invoiceIdList=BOSS_ACCT_INVOICE,BOSS_ACCT_AR_FINALIZED", "BOSS_ACCT_AR_FINALIZED"],
    ["Statements", "Receivables/Statements?customerPartyId=ORG_ACME", "Reviewed statement snapshot", {statement: true}],
    [
        "StatementPrint",
        "Receivables/Statements?customerPartyId=ORG_ACME",
        "Print statements",
        {statement: true, printStatement: true}
    ],
    ["InvoicePrint", "Receivables/InvoicePrint?invoiceId=BOSS_ACCT_AR_FINALIZED", "Open the printable invoice"],
    ["InvoiceFinalized", "Receivables/InvoiceDetail?recordId=BOSS_ACCT_AR_FINALIZED", "Customer services invoice"],
    ["InvoiceIssuedFiles", "Receivables/InvoiceDetail/Files?recordId=BOSS_ACCT_AR_FINALIZED", "Files", {issuedFiles: true}],
    ["CreateReceivable", "Receivables/Invoices", "Invoices", {open: "New invoice", dialogText: "New receivable"}],
    [
        "InvoiceEdit",
        "Receivables/InvoiceDetail?recordId=BOSS_ACCT_INVOICE",
        "Accounting demo customer invoice",
        {openMore: true, open: "Edit invoice", dialogText: "Edit invoice BOSS_ACCT_INVOICE"}
    ],
    ["InvoiceAddLine", "Receivables/InvoiceDetail/Items?recordId=BOSS_ACCT_INVOICE", "Items and taxes", {open: "Add line"}],
    [
        "InvoiceSend",
        "Receivables/InvoiceDetail?recordId=BOSS_ACCT_AR_FINALIZED",
        "Customer services invoice",
        {open: "Send invoice"}
    ],
    ...[
        ["Overview", "Overview"],
        ["Items", "Items and taxes"],
        ["Payments", "Payments and credits"],
        ["Orders", "Orders"],
        ["Shipments", "Shipments"],
        ["Budget", "Budget details"],
        ["GeneralLedger", "General ledger"],
        ["Files", "Files"],
        ["Conversation", "Conversation"],
        ["History", "History"]
    ].map(([tab, text]) => [
        "InvoiceTab" + tab,
        "Receivables/InvoiceDetail/" +
            tab +
            "?recordId=" +
            (tab === "GeneralLedger" ? "BOSS_ACCT_AR_FINALIZED" : "BOSS_ACCT_INVOICE"),
        text
    ]),
    ["Customer", "Receivables/Customer360?customerPartyId=ORG_ACME", "Another Company Making Everything"],
    [
        "CustomerAddBank",
        "Receivables/Customer360/FinanceDetails?customerPartyId=ORG_ACME",
        "Finance details",
        {open: "Add bank account", dialogText: "Add customer bank account"}
    ],
    [
        "CustomerAddIdentification",
        "Receivables/Customer360/FinanceDetails?customerPartyId=ORG_ACME",
        "Finance details",
        {open: "Add identification", dialogText: "Add customer identification"}
    ],
    [
        "CustomerAddTax",
        "Receivables/Customer360/FinanceDetails?customerPartyId=ORG_ACME",
        "Finance details",
        {open: "Add tax registration", dialogText: "Add customer tax registration"}
    ],
    ...[
        ["Contact", "Contact"],
        ["Orders", "Orders"],
        ["Money", "Invoices and payments"],
        ["Agreements", "Agreements"],
        ["FinanceDetails", "Finance details"],
        ["Files", "Files"]
    ].map(([tab, text]) => ["CustomerTab" + tab, "Receivables/Customer360/" + tab + "?customerPartyId=ORG_ACME", text])
]
const groups = [
    {user: "finance.admin", prefix: "Accounting", pages: adminPages},
    {
        user: "finance.read",
        prefix: "Accounting-reader",
        pages: [
            ["Home", "Home", "Trial balance"],
            ["Settlement", "Receivables/ReceivablesWorkbench?partyId=BOSS_ACCT_STL_CUSTOMER", "Allocate receipts and credits"],
            ["Invoice", "Receivables/InvoiceDetail?recordId=BOSS_ACCT_INVOICE", "Accounting demo customer invoice"],
            ["Posted", "GeneralLedger/JournalEntryDetail?recordId=BOSS_ACCT_POSTED", "Posted office expense"],
            ["Account", "GeneralLedger/AccountDetail?recordId=111100000", "Open account ledger"],
            ["InvoiceItems", "Receivables/InvoiceDetail/Items?recordId=BOSS_ACCT_INVOICE", "Accounting demo services"],
            ["CustomerMoney", "Receivables/Customer360/Money?customerPartyId=ORG_ACME", "Invoices and payments"],
            [
                "PaymentIssuedFiles",
                "Payments/PaymentDetail/Files?recordId=BOSS_ACCT_PAY_CHECK",
                "Payment files and issued documents",
                {paymentIssuedFiles: true, hideCheck: true}
            ]
        ]
    },
    {
        user: "finance.ar",
        prefix: "Accounting-ar",
        pages: [
            ["Invoices", "Receivables/Invoices", "Accounting demo customer invoice"],
            ["Draft", "Receivables/InvoiceDetail?recordId=BOSS_ACCT_INVOICE", "Finalize invoice"],
            ["Items", "Receivables/InvoiceDetail/Items?recordId=BOSS_ACCT_INVOICE", "Accounting demo services"],
            ["Customer", "Receivables/Customer360?customerPartyId=ORG_ACME", "Another Company Making Everything"],
            ["Statement", "Receivables/Statements?customerPartyId=ORG_ACME", "Reviewed statement snapshot", {statement: true}]
        ]
    },
    {
        user: "finance.approve",
        prefix: "Accounting-approver",
        pages: [
            ["Draft", "Receivables/InvoiceDetail?recordId=BOSS_ACCT_INVOICE", "Approve invoice"],
            ["Items", "Receivables/InvoiceDetail/Items?recordId=BOSS_ACCT_INVOICE", "Accounting demo services"]
        ]
    },
    {
        user: "finance.ap",
        prefix: "Accounting-ap",
        pages: [
            ["Home", "Home", "New bill"],
            ["Bills", "Payables/Bills", "Accounting demo supplier bill"],
            ["Bill", "Payables/BillDetail?recordId=BOSS_ACCT_BILL", "Accounting demo supplier bill"]
        ]
    }
]
const widths = [390, 1280, 1440]
const cases = groups.flatMap(({user, prefix, pages}) =>
    pages.flatMap(([name, path, text, options = {}]) =>
        widths.flatMap(width => [false, true].map(dark => ({user, prefix, name, path, text, options, width, dark})))
    )
)
let pages = {}
spec({
    setupSpec() {
        for (const {user} of groups)
            for (const width of widths) {
                const page = browser.newPage({user, viewport: {width, height: 900}, timeout: 30})
                page.allowProblems(/userPhoto\?userId=/)
                page.allowProblems(/Blocked script execution in 'about:srcdoc'.*sandboxed/)
                pages[user + width] = page
            }
    }
})
feature("#prefix #name at #width dark=#dark", {
    where: cases.filter(item => !params.names || params.names.split(",").includes(item.name)),
    expect({user, prefix, name, path, text, options, width, dark}) {
        const page = pages[user + width]
        page.goto("/qapps/Accounting/" + path + (path.includes("?") ? "&" : "?") + "organizationPartyId=ORG_ZIZI_CORP").status ==
            200
        if (options.statement) {
            page.getByRole("button", {name: "Preview statements", exact: true}).click()
            page.waitForURL(/snapshotId=/)
            page.waitFor(() => document.querySelector(".q-page")?.innerText.includes("Reviewed statement snapshot"))
            if (options.printStatement) {
                const snapshotId = page.evaluate(() => new URL(location.href).searchParams.get("snapshotId"))
                const printed = page.goto(
                    "/qapps/Accounting/Receivables/StatementPrint?organizationPartyId=ORG_ZIZI_CORP&snapshotId=" +
                        encodeURIComponent(snapshotId)
                )
                assert(printed.status === 200, "The reviewed statement print route must succeed")
            }
        }
        page.waitFor(text => !!document.querySelector(".q-page")?.innerText.includes(text), {arg: text})
        if (options.issuedFiles) {
            page.waitFor(() => {
                const names = Array.from(document.querySelectorAll(".m-record-files-panel .q-item__label a")).map(link =>
                    link.textContent.trim()
                )
                return names.includes("Invoice-BOSS_ACCT_AR_FINALIZED.pdf") && names.includes("Scope.txt")
            })
            const fileRows = page.evaluate(() =>
                Array.from(document.querySelectorAll(".m-record-files-panel .q-item")).map(row => ({
                    name: row.querySelector(".q-item__label a")?.textContent.trim(),
                    actions: Array.from(row.querySelectorAll("button[aria-label]")).map(button =>
                        button.getAttribute("aria-label")
                    )
                }))
            )
            const issuedRows = fileRows.filter(row => row.name === "Invoice-BOSS_ACCT_AR_FINALIZED.pdf")
            assert(issuedRows.length > 0, "A real issued PDF must be listed")
            assert(
                issuedRows.every(
                    row =>
                        row.actions.includes("Download") && !row.actions.includes("Remove") && !row.actions.includes("Versions")
                ),
                "Issued PDFs must be downloadable without remove or version controls"
            )
            const supporting = fileRows.find(row => row.name === "Scope.txt")
            assert(
                supporting?.actions.includes("Remove") && supporting.actions.includes("Versions"),
                "The ordinary supporting file must retain its authorized remove and version controls"
            )
        }
        if (options.paymentIssuedFiles) {
            page.waitFor(() =>
                document.querySelector(".m-record-files-panel")?.innerText.includes("Payment-BOSS_ACCT_PAY_CHECK-receipt.pdf")
            )
            const fileRows = page.evaluate(() =>
                Array.from(document.querySelectorAll(".m-record-files-panel .q-item")).map(row => ({
                    name: row.querySelector(".q-item__label a")?.textContent.trim(),
                    actions: Array.from(row.querySelectorAll("button[aria-label]")).map(button =>
                        button.getAttribute("aria-label")
                    )
                }))
            )
            const issued = fileRows.filter(row => /^Payment-BOSS_ACCT_PAY_CHECK-/.test(row.name || ""))
            assert(
                issued.length === (options.hideCheck ? 2 : 3),
                "The file list must contain only the authorized issued documents"
            )
            assert(
                issued.some(row => row.name.endsWith("-check.pdf")) === !options.hideCheck,
                "Checks require treasury authority"
            )
            assert(
                issued.every(
                    row =>
                        row.actions.includes("Download") && !row.actions.includes("Remove") && !row.actions.includes("Versions")
                ),
                "Issued documents must retain immutable download-only controls"
            )
        }
        if (options.statement)
            assert(page.text().includes("BOSS_ACCT_AR_FINALIZED"), "The statement must contain the finalized invoice")
        if (options.openMore) page.locator(".m-record-actions .q-btn-dropdown").first().click()
        if (options.open) {
            page.getByRole("button", {name: options.open, exact: true}).first().click()
            page.waitFor(() => !!document.querySelector(".q-dialog"))
        }
        if (options.dialogText)
            page.waitFor(
                text => Array.from(document.querySelectorAll(".q-dialog")).some(dialog => dialog.innerText.includes(text)),
                {arg: options.dialogText}
            )
        page.settle()
        page.evaluate(dark => {
            document.querySelector("#apps-root").__vue_app__.config.globalProperties.$q.dark.set(!!dark)
            return true
        }, dark) == true
        page.waitFor(dark => document.body.classList.contains("body--dark") === dark, {arg: dark})
        if (options.issuedFiles) {
            page.settle()
            page.waitFor(
                dark => {
                    const panel = document.querySelector(".m-record-files-panel")
                    return (
                        panel &&
                        Array.from(panel.querySelectorAll(".q-list")).every(
                            list => list.classList.contains("q-list--dark") === dark
                        ) &&
                        Array.from(panel.querySelectorAll(".q-item")).every(
                            item => item.classList.contains("q-item--dark") === dark
                        )
                    )
                },
                {arg: dark}
            )
            page.waitFor(
                () =>
                    !document
                        .querySelector(".m-record-files-panel")
                        .getAnimations({subtree: true})
                        .some(animation => animation.pending || animation.playState === "running")
            )
            const contrast = page.evaluate(() => {
                const canvas = document.createElement("canvas")
                canvas.width = canvas.height = 1
                const context = canvas.getContext("2d", {willReadFrequently: true})
                const color = value => {
                    context.clearRect(0, 0, 1, 1)
                    context.fillStyle = value
                    context.fillRect(0, 0, 1, 1)
                    const pixel = context.getImageData(0, 0, 1, 1).data
                    return [pixel[0], pixel[1], pixel[2], pixel[3] / 255]
                }
                const over = (foreground, background) =>
                    foreground.slice(0, 3).map((channel, i) => channel * foreground[3] + background[i] * (1 - foreground[3]))
                const background = element => {
                    const ancestors = []
                    for (let node = element; node; node = node.parentElement) ancestors.unshift(node)
                    return ancestors.reduce(
                        (result, node) => over(color(getComputedStyle(node).backgroundColor), result),
                        [255, 255, 255]
                    )
                }
                const luminance = rgb => {
                    const linear = rgb.map(channel => {
                        const value = channel / 255
                        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
                    })
                    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722
                }
                const ratio = element => {
                    const surface = background(element)
                    const foreground = over(color(getComputedStyle(element).color), surface)
                    const a = luminance(foreground),
                        b = luminance(surface)
                    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
                }
                const panel = document.querySelector(".m-record-files-panel")
                const sample = element => ({
                    ratio: ratio(element),
                    color: getComputedStyle(element).color,
                    surface: background(element)
                })
                const captions = Array.from(panel.querySelectorAll(".q-item__label--caption"))
                    .filter(element => element.textContent.trim())
                    .map(sample)
                const actions = Array.from(
                    panel.querySelectorAll('button[aria-label="Download"],button[aria-label="Versions"]')
                ).map(sample)
                let component = panel.__vueParentComponent
                while (component && component.type?.name !== "BossRecordFiles") component = component.parent
                return {
                    captions: captions.map(sample => sample.ratio),
                    actions: actions.map(sample => sample.ratio),
                    styles: {captions, actions},
                    listClasses: Array.from(panel.querySelectorAll(".q-list")).map(list => list.className),
                    itemClasses: Array.from(panel.querySelectorAll(".q-item")).map(item => item.className),
                    rootDark: document.querySelector("#apps-root").__vue_app__.config.globalProperties.$q.dark.isActive,
                    filesDark: component?.proxy?.dark,
                    filesQuasarDark: component?.proxy?.$q.dark.isActive
                }
            })
            assert(
                contrast.captions.length >= 2 && contrast.captions.every(ratio => ratio >= 4.5),
                "Issued file metadata and descriptions must remain readable: " + JSON.stringify(contrast)
            )
            assert(
                contrast.actions.length >= 3 && contrast.actions.every(ratio => ratio >= 3),
                "File download and version controls must remain visible: " + JSON.stringify(contrast)
            )
        }
        !/Error rendering|Exception in render|not available in Accounting yet|Not available/.test(page.text())
        page.text().includes(text)
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth) == true
        if (name === "PaymentCheckPrint") {
            page.waitFor(() => !!document.querySelector(".m-html-view-frame")?.contentDocument?.querySelector(".check"))
            page.settle()
            const layout = page.evaluate(() => {
                const frame = document.querySelector(".m-html-view-frame"),
                    content = frame.contentDocument,
                    box = content.getElementById("m-hv-root"),
                    check = content.querySelector(".check").getBoundingClientRect(),
                    outer = frame.getBoundingClientRect()
                return {
                    viewport: document.documentElement.clientWidth,
                    innerWidth,
                    contentScrollWidth: content.documentElement.scrollWidth,
                    frameLeft: outer.left,
                    frameRight: outer.right,
                    frameWidth: outer.width,
                    contentWidth: content.documentElement.clientWidth,
                    rootWidth: box.clientWidth,
                    rootScrollWidth: box.scrollWidth,
                    checkLeft: check.left,
                    checkRight: check.right
                }
            })
            assert(
                layout.frameLeft >= 0 &&
                    layout.frameRight <= layout.viewport + 1 &&
                    layout.rootScrollWidth <= layout.rootWidth + 1 &&
                    layout.checkLeft >= 0 &&
                    layout.checkRight <= layout.contentWidth + 1,
                "The issued check and its border fit inside the visible document frame: " + JSON.stringify(layout)
            )
            page.screenshot(prefix + "-" + name + "-" + width + (dark ? "-dark" : "-light") + "-viewport")
        }
        page.screenshot(prefix + "-" + name + "-" + width + (dark ? "-dark" : "-light"), {fullPage: true})
    }
})

feature("finalized invoice and reviewed statement print the real documents", {
    where: widths.map(width => ({width})),
    expect({width}) {
        const page = pages["finance.admin" + width]
        page.goto(
            "/apps/Accounting/Receivables/InvoicePrint?organizationPartyId=ORG_ZIZI_CORP&invoiceId=BOSS_ACCT_AR_FINALIZED&renderMode=html-print"
        ).status == 200
        page.waitFor(() => document.body.innerText.includes("BOSS_ACCT_AR_FINALIZED"))
        page.text().includes("Customer services")
        !/Error rendering|Exception in render|Invoice not available/.test(page.text())
        page.screenshot("Accounting-invoice-print-" + width, {fullPage: true})
        page.goto("/qapps/Accounting/Receivables/Statements?organizationPartyId=ORG_ZIZI_CORP&customerPartyId=ORG_ACME").status ==
            200
        page.getByRole("button", {name: "Preview statements", exact: true}).click()
        page.waitForURL(/snapshotId=/)
        const snapshotId = page.evaluate(() => new URL(location.href).searchParams.get("snapshotId"))
        page.goto(
            "/apps/Accounting/Receivables/StatementPrint?organizationPartyId=ORG_ZIZI_CORP&snapshotId=" +
                encodeURIComponent(snapshotId) +
                "&renderMode=html-print"
        ).status == 200
        page.waitFor(() => document.body.innerText.includes("BOSS_ACCT_AR_FINALIZED"))
        page.text().includes("Customer statement")
        !/Error rendering|Exception in render|Preview a statement before printing/.test(page.text())
        page.screenshot("Accounting-statement-print-" + width, {fullPage: true})
    }
})
