const helper = ec.resource.script("component://mr-boss/test/AccountingSpecLib.js")
const {ids} = helper
const invoiceTabs = helper.invoiceTabs
const customerTabs = helper.customerTabs
const destinations = [
    {path: "Receivables/Invoices", text: "Invoices"},
    {path: "Receivables/Invoices", text: "Invoices", parameters: {view: "pivot"}},
    {path: "Receivables/Invoices", text: "Invoices", parameters: {view: "graph"}},
    {path: "Receivables/Invoices", text: "Invoices", parameters: {view: "calendar"}},
    {path: "Receivables/BillingQueue", text: "Billing queue"},
    {path: "Receivables/Statements", text: "Customer statements"},
    {path: "Receivables/StatementPrint", text: "Customer statement"},
    {path: "Receivables/InvoiceBatch", text: "Review selected invoices", parameters: {invoiceIdList: [ids.invoiceId]}},
    ...invoiceTabs.map(([tab, text]) => ({
        path: "Receivables/InvoiceDetail/" + tab,
        text,
        parameters: {recordId: ids.invoiceId, lastStandalone: "true"}
    })),
    ...customerTabs.map(([tab, text]) => ({
        path: "Receivables/Customer360/" + tab,
        text,
        parameters: {customerPartyId: ids.customerPartyId, lastStandalone: "true"}
    }))
]

feature("receivables and customer screens render their real content in browser and terminal", {
    when() {
        return helper.asUser("finance.admin", () => {
            const failures = []
            for (const destination of destinations) {
                for (const mode of ["qvt", "tui"]) {
                    const result = helper.page(destination.path, destination.parameters || {}, mode)
                    if (result.status !== 200 || result.errors.length || !result.output.includes(destination.text)) {
                        failures.push(destination.path + " " + mode + ": " + result.status + " " + result.errors.join(" | "))
                    }
                    if (mode === "tui") {
                        try {
                            JSON.parse(result.output)
                        } catch (error) {
                            failures.push(destination.path + " invalid TUI document: " + error.message)
                        }
                    }
                    ec.message.clearErrors()
                }
            }
            return {failures}
        })
    },
    then({failures}) {
        failures == []
    }
})

feature("a reader sees the same invoice lines without the AR editing controls", {
    when() {
        const parameters = {recordId: ids.invoiceId}
        return {
            ar: helper.asUser("finance.ar", () => helper.page("Receivables/InvoiceDetail/Items", parameters, "html")),
            reader: helper.asUser("finance.read", () => helper.page("Receivables/InvoiceDetail/Items", parameters, "html"))
        }
    },
    then({ar, reader}) {
        ar.status == 200
        reader.status == 200
        ar.errors == []
        reader.errors == []
        ar.output.includes("Add line")
        !reader.output.includes("Add line")
        ar.output.includes("Accounting demo services")
        reader.output.includes("Accounting demo services")
    }
})

feature("optional invoice supporting files offer their reviewed versions and default to no selection", {
    when() {
        const parameters = {recordId: ids.finalizedInvoiceId}
        return {
            sender: helper.asUser("finance.ar", () => ({
                context: helper.call("ironstone.accounting.ReceivableServices.get#InvoiceContext", {
                    organizationPartyId: ids.organizationPartyId,
                    invoiceId: ids.finalizedInvoiceId
                }),
                page: helper.page("Receivables/InvoiceDetail", parameters, "html")
            })),
            reader: helper.asUser("finance.read", () => helper.page("Receivables/InvoiceDetail", parameters, "html"))
        }
    },
    then({sender, reader}) {
        sender.context.invoiceSendValue.reviewedAttachmentList == []
        sender.context.receivable.attachmentRows.some(
            row => row.invoiceContentId === "BOSS_ACCT_AR_SUPPORT" && row.fileName === "Scope.txt" && !!row.attachmentVersion
        )
        sender.page.status == 200
        sender.page.errors == []
        sender.page.output.includes("Supporting files")
        sender.page.output.includes("The invoice PDF is included")
        reader.status == 200
        reader.errors == []
        !reader.output.includes("Supporting files")
    }
})

feature("customer aging and latest receipt presentation uses the authorized currency summaries", {
    when() {
        return helper.asUser("finance.read", () => {
            const context = helper.call("ironstone.accounting.ReceivableServices.get#CustomerContext", {
                organizationPartyId: ids.organizationPartyId,
                customerPartyId: ids.customerPartyId
            })
            const rows = context.customerDetail.summaryRows
            const failures = []
            if (!rows.length) failures.push("The fixture requires an issued customer invoice summary")
            for (const mode of ["qvt", "tui"]) {
                const money = helper.page("Receivables/Customer360/Money", {customerPartyId: ids.customerPartyId}, mode)
                const header = helper.page("Receivables/Customer360", {customerPartyId: ids.customerPartyId}, mode)
                for (const title of ["Receivables aging", "Current", "1–30 days", "31–60 days", "61–90 days", "Over 90 days"])
                    if (!money.output.includes(title)) failures.push(mode + " missing " + title)
                if (!header.output.includes("Last payment amount")) failures.push(mode + " missing latest payment amount")
                if (money.status !== 200 || money.errors.length || header.status !== 200 || header.errors.length)
                    failures.push(mode + " failed rendering a customer summary")
            }
            const headerHtml = helper.page("Receivables/Customer360", {customerPartyId: ids.customerPartyId}, "html")
            for (const row of rows) {
                if (row.lastPaymentAmount == null) {
                    if (!headerHtml.output.includes("No payment received")) failures.push("Missing empty receipt state")
                } else if (!headerHtml.output.includes(ec.l10n.formatCurrency(row.lastPaymentAmount, row.currencyUomId)))
                    failures.push("Missing authorized latest receipt amount")
            }
            if (headerHtml.status !== 200 || headerHtml.errors.length) failures.push("Latest receipt HTML failed rendering")
            return {failures}
        })
    },
    then({failures}) {
        failures == []
    }
})

feature("customer contact renders the billing address and telephone rather than blank subtype rows", {
    when() {
        return helper.asUser("finance.ar", () => {
            const failures = []
            for (const mode of ["html", "qvt", "tui"]) {
                const result = helper.page("Receivables/Customer360/Contact", {customerPartyId: ids.customerPartyId}, mode)
                if (result.status !== 200 || result.errors.length) failures.push(mode + " contact rendering failed")
                for (const value of ["1350 E. Flamingo Rd.", "1234", "Las Vegas", "Nevada", "89119-5263", "1 702 123-4567"])
                    if (!result.output.includes(value)) failures.push(mode + " missing contact value " + value)
            }
            return {failures}
        })
    },
    then({failures}) {
        failures == []
    }
})

feature("unavailable invoice and customer records render a usable state in both render modes", {
    when() {
        return helper.asUser("finance.ar", () => {
            const failures = []
            for (const [path, parameters, text] of [
                ["Receivables/InvoiceDetail", {recordId: "ACCOUNTING_NOT_AVAILABLE"}, "Invoice not available"],
                ["Receivables/Customer360", {customerPartyId: "ACCOUNTING_NOT_AVAILABLE"}, "Customer not available"]
            ]) {
                for (const mode of ["qvt", "tui"]) {
                    const result = helper.page(path, parameters, mode)
                    if (result.status !== 200 || result.errors.length || !result.output.includes(text))
                        failures.push(path + " " + mode + ": " + result.status + " " + result.errors.join(" | "))
                    ec.message.clearErrors()
                }
            }
            return {failures}
        })
    },
    then({failures}) {
        failures == []
    }
})

feature("batch review names an unavailable invoice without losing the other invoice or retaining its errors", {
    when() {
        return helper.asUser("finance.ar", () => {
            const result = helper.call("ironstone.accounting.ReceivableServices.get#InvoiceBatchContext", {
                organizationPartyId: ids.organizationPartyId,
                invoiceIdList: [ids.invoiceId, "ACCOUNTING_NOT_AVAILABLE"]
            })
            return {result, errors: ec.message.hasError()}
        })
    },
    then({result, errors}) {
        errors == false
        result.batchRows.length == 2
        result.batchRows[0].invoiceId == ids.invoiceId
        result.batchRows[0].available == true
        result.batchRows[1].available == false
        result.batchRows[1].reviewError.includes("not available")
    }
})

feature("customer context checks the organization even with artifact authorization disabled", {
    when() {
        return helper.asUser(
            "finance.ar",
            () => ({
                own: helper.call("ironstone.accounting.ReceivableServices.get#CustomerContext", {
                    organizationPartyId: ids.organizationPartyId,
                    customerPartyId: ids.customerPartyId
                }),
                foreign: helper.refusal("ironstone.accounting.ReceivableServices.get#CustomerContext", {
                    organizationPartyId: ids.foreignOrganizationPartyId,
                    customerPartyId: ids.customerPartyId
                })
            }),
            false
        )
    },
    then({own, foreign}) {
        own.customerFound == true
        own.customerDetail.customerPartyId == ids.customerPartyId
        own.customerDetail.paymentMethods == []
        own.customerDetail.taxRegistrations == []
        foreign.includes("organization")
    }
})

feature("worker billing amounts require payable view and a reader gets no billing edit actions", {
    when() {
        const parameters = {organizationPartyId: ids.organizationPartyId, direction: "payable"}
        return {
            ar: helper.asUser("finance.ar", () => ({
                customer: helper.call("ironstone.accounting.ReceivableServices.get#BillingQueue", {
                    organizationPartyId: ids.organizationPartyId,
                    direction: "receivable"
                }),
                workerRefusal: helper.refusal("ironstone.accounting.ReceivableServices.get#BillingQueue", parameters)
            })),
            reader: helper.asUser("finance.read", () =>
                helper.call("ironstone.accounting.ReceivableServices.get#BillingQueue", parameters)
            )
        }
    },
    then({ar, reader}) {
        ar.customer.direction == "receivable"
        !ar.customer.billingDirectionOptions.some(option => option.value === "payable")
        ar.workerRefusal.includes("PAYABLE_VIEW")
        reader.direction == "payable"
        reader.billingCanCreate == false
        reader.billingDirectionOptions.some(option => option.value === "payable")
    }
})

feature("a customer statement shows the open balance on its screen and its print", {
    when() {
        return helper.asUser("finance.ar", () => {
            const selection = {customerPartyId: ids.customerPartyId, includeZeroBalance: "Y"}
            const statements = helper.call("mantle.account.CollectionServices.get#Statements", {
                organizationPartyId: ids.organizationPartyId,
                customerPartyIdList: [ids.customerPartyId],
                includeZeroBalance: true
            })
            const balances = Array.from(statements.statementRows || []).map(
                row => "Balance due " + ec.l10n.formatCurrency(row.closingBalance, row.currencyUomId)
            )
            const screen = helper.page("Receivables/Statements", Object.assign({showStatements: "Y"}, selection), "html")
            const print = helper.page("Receivables/StatementPrint", selection, "html")
            return {balances, screen, print}
        })
    },
    then({balances, screen, print}) {
        balances.length > 0
        screen.status == 200
        screen.errors == []
        screen.output.includes("Statement preview")
        screen.output.includes("Print statements")
        print.status == 200
        print.errors == []
        balances.every(caption => screen.output.includes(caption) && print.output.includes(caption))
    }
})
