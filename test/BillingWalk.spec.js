// The usable-when walk of IronStone Projects P8a (impl-projects.md P8; design-projects.md §10 Rates, Unbilled, Invoices, InvoiceDetail,
// §14 the client invoice with its time detail) through the screens' transitions, with authorization on: in a project of its own (BWK,
// john.doe its manager, joe.developer a programmer, a client of its own, Ziziwork Services its vendor), in the week of June 7, 2027,
// john.doe adds the project's client rate on Rates; joe logs the week and submits it; Unbilled lists the project with nothing ready
// until john.doe approves the week; then the time is ready, the invoice dialog offers each approved entry, and Create invoice makes a
// client invoice of it with its time detail; the time is no longer unbilled (Unbilled, the project's time); InvoiceDetail shows the
// lines and the time behind them, john.doe approves the invoice and sends it to the client, and the printed invoice carries the time
// detail; joe may not open Billing. The project and the invoice are cancelled after, so the other specs' lists keep their records.
// Run: ./moq test mr-boss --spec BillingWalk
const webroot = "component://webroot/screen/webroot.xml"
const PROJECT = "BWK"
// a moment of a day of June 2027, in the session's time zone
const at = (day, hour, minute) => Number(String(ec.l10n.parseTimestamp(`2027-06-${String(day).padStart(2, "0")} ${String(hour).padStart(2, "0")}:${String(minute || 0).padStart(2, "0")}:00.000`,
        "yyyy-MM-dd HH:mm:ss.SSS")))
const NOW = at(16, 10)
const made = {}

function render(path, parameters, mode) {
    const str = ec.screen.makeTest().rootScreen(webroot).renderMode(mode || "qvt").withStaticData().render(path,
            Object.assign({ lastStandalone: "true" }, parameters || {}), null)
    const output = String(str.output || "")
    ec.message.clearErrors()
    return { status: str.status, errors: str.errorMessages.join(" | "), output, broken: /Error rendering|Exception in render/.test(output) }
}
function post(path, parameters) {
    const str = ec.screen.makeTest().rootScreen(webroot).render("apps/Projects/" + path, parameters || {}, "post")
    const output = String(str.output || "")
    ec.message.clearErrors()
    let parsed = null
    try { parsed = JSON.parse(output) } catch (err) { parsed = null }
    return { status: str.status, errors: str.errorMessages.join(" | "), output, json: parsed }
}
function sys(run) {
    const wasDisabled = ec.artifactExecution.disableAuthz()
    try { return run() } finally { if (!wasDisabled) ec.artifactExecution.enableAuthz() }
}
function as(username, run) {
    login(username)
    ec.user.setEffectiveTime(NOW)
    try { return run() } finally { login("john.doe"); ec.user.setEffectiveTime(NOW) }
}
const one = (entityName, fields) => sys(() => ec.entity.find(entityName).condition(fields).one())
const entries = () => sys(() => Array.from(ec.entity.find("mantle.work.time.TimeEntry").condition("workEffortId", "in", [PROJECT, made.task]).orderBy("fromDate").list()))
const dec = (value) => value == null ? null : String(toDecimal(value).setScale(2, "HALF_UP"))

spec({
    stepwise: true,
    setupSpec() {
        login("john.doe")
        ec.artifactExecution.enableAuthz()
        ec.user.setEffectiveTime(NOW)
        sys(() => {
            call("mantle.work.ProjectServices.create#Project", { workEffortId: PROJECT, workEffortName: "Billing walk", visibilityEnumId: "WevWorkGroup" })
            call("update#mantle.work.effort.WorkEffort", { workEffortId: PROJECT, statusId: "WeInProgress", ownerPartyId: "ORG_ZIZI_SERVICES" })
            if (!ec.entity.find("mantle.party.Party").condition("partyId", "BWK_CLIENT").count()) {
                call("create#mantle.party.Party", { partyId: "BWK_CLIENT", partyTypeEnumId: "PtyOrganization" })
                call("create#mantle.party.Organization", { partyId: "BWK_CLIENT", organizationName: "Walk Client Bakery" })
                call("create#mantle.party.PartyRole", { partyId: "BWK_CLIENT", roleTypeId: "Customer" })
                call("create#mantle.party.contact.ContactMech", { contactMechId: "BWK_CLIENT_BE", contactMechTypeEnumId: "CmtEmailAddress", infoString: "billing@walk-bakery.example" })
                call("create#mantle.party.contact.PartyContactMech", { partyId: "BWK_CLIENT", contactMechId: "BWK_CLIENT_BE", contactMechPurposeId: "EmailBilling",
                    fromDate: "2026-01-01 00:00:00" })
            }
            for (const [partyId, roleTypeId] of [["EX_JOHN_DOE", "ProjectManager"], ["ORG_ZIZI_JD", "Programmer"], ["ORG_ZIZI_SERVICES", "Vendor"], ["BWK_CLIENT", "Customer"]])
                call("create#mantle.work.effort.WorkEffortParty", { workEffortId: PROJECT, partyId, roleTypeId, fromDate: "2027-05-01 00:00:00", statusId: "WeptAssigned" })
            made.task = call("mantle.work.TaskServices.create#Task", { rootWorkEffortId: PROJECT, workEffortName: "Client portal login" }).workEffortId
        })
    },
    cleanupSpec() {
        sys(() => {
            for (const link of ec.entity.find("mantle.work.effort.WorkEffortInvoice").condition("workEffortId", PROJECT).list()) {
                const invoice = ec.entity.find("mantle.account.invoice.Invoice").condition("invoiceId", link.invoiceId).one()
                if (invoice && invoice.statusId !== "InvoiceCancelled") call("update#mantle.account.invoice.Invoice", { invoiceId: invoice.invoiceId, statusId: "InvoiceCancelled" })
            }
            for (const rate of ec.entity.find("mantle.humanres.rate.RateAmount").condition("workEffortId", PROJECT).list()) { rate.thruDate = rate.fromDate; rate.update() }
            const project = ec.entity.find("mantle.work.effort.WorkEffort").condition("workEffortId", PROJECT).one()
            if (project) { project.statusId = "WeCancelled"; project.update() }
        })
        ec.user.setEffectiveTime(null)
    },
})

feature("john.doe adds the project's client rate on Rates, from June 2027: 150 an hour; Rates lists it and Which rate finds it for joe's time", {
    when() {
        const saved = post("Billing/Rates/saveRate", { ratePurposeEnumId: "RaprClient", newRateTypeEnumId: "RatpStandard", rateWorkEffortId: PROJECT, fromDate: "2027-06-01",
            rateAmount: "150", rateCurrencyUomId: "USD" })
        made.rateId = sys(() => Array.from(ec.entity.find("mantle.humanres.rate.RateAmount").condition("workEffortId", PROJECT).list())[0]?.rateAmountId)
        const rates = render("apps/Projects/Billing/Rates", { rootWorkEffortId: PROJECT })
        const which = render("apps/Projects/Billing/Rates", { whichPartyId: "ORG_ZIZI_JD", whichWorkEffortId: made.task, whichDate: "2027-06-08" })
        return { saved, rates, which }
    },
    then({ saved, rates, which }) {
        saved.errors == ""
        made.rateId != null
        rates.status == 200 && !rates.broken
        rates.output.includes("Billing walk")
        rates.output.includes("150.00")
        which.output.includes("Which rate")
        which.output.includes("$150.00 / h")
    },
})

feature("joe logs his week and submits it: Unbilled lists the project, its time waiting for approval and nothing ready to invoice", {
    when() {
        as("joe.developer", () => sys(() => {
            for (const [day, hours, comments] of [[7, 6, "Login screen"], [8, 7.5, "Password reset"], [9, 3, "Review fixes"]])
                call("mantle.work.TimeServices.store#TimeEntry", { partyId: "ORG_ZIZI_JD", workEffortId: made.task, fromDate: at(day, 9), thruDate: at(day, 9) + hours * 3600000,
                    hours, comments, rateTypeEnumId: "RatpStandard", workTypeEnumId: "WktpDevelopment" })
            call("mantle.work.TimeServices.store#TimeEntry", { partyId: "ORG_ZIZI_JD", workEffortId: made.task, fromDate: at(10, 9), thruDate: at(10, 10), hours: 1,
                comments: "Onboarding", rateTypeEnumId: "RatpNoCharge" })
            made.sheet = entries()[0].timesheetId
            call("mantle.work.TimesheetServices.submit#Timesheet", { timesheetId: made.sheet })
        }))
        const unbilled = render("apps/Projects/Billing/Unbilled", { rootWorkEffortId: PROJECT })
        const ready = render("apps/Projects/Billing/Unbilled", { list: "ready", rootWorkEffortId: PROJECT })
        return { unbilled, ready, rows: entries() }
    },
    then({ unbilled, ready, rows }) {
        rows.length == 4
        unbilled.status == 200 && !unbilled.broken
        unbilled.output.includes("Billing walk")
        unbilled.output.includes("Walk Client Bakery")
        // 6 + 7.5 + 3 h at 150; the no-charge hour is not billable
        unbilled.output.includes("$2,475.00")
        unbilled.output.includes("16.5 h submitted")
        unbilled.output.includes("No approved time yet")
        ready.output.includes("No unbilled time matches")
    },
})

feature("john.doe approves the week; the time is ready and the invoice dialog offers each approved billable entry, all ticked", {
    when() {
        sys(() => call("mantle.work.TimesheetServices.approve#Timesheet", { timesheetId: made.sheet }))
        const ready = render("apps/Projects/Billing/Unbilled", { list: "ready", rootWorkEffortId: PROJECT })
        const dialog = render("apps/Projects/Billing/Unbilled/CreateInvoice", { workEffortId: PROJECT })
        const draft = sys(() => call("ironstone.projects.BillingServices.get#InvoiceDraft", { workEffortId: PROJECT }).draft)
        return { ready, dialog, draft }
    },
    then({ ready, dialog, draft }) {
        ready.output.includes("Billing walk")
        ready.output.includes("Create invoice")
        dialog.status == 200 && !dialog.broken
        dialog.output.includes("Password reset")
        !dialog.output.includes("Onboarding")
        draft.canInvoice == true
        draft.entryOptions.length == 3
        draft.selectedIds.length == 3
        draft.readyAmountText == "$2,475.00"
    },
})

feature("Create invoice makes a draft client invoice of the approved time, a line per entry, with its time detail; the time is no longer unbilled", {
    when() {
        const ids = entries().filter((row) => row.rateTypeEnumId !== "RatpNoCharge").map((row) => row.timeEntryId)
        const created = post("Billing/Unbilled/CreateInvoice/createInvoice", { workEffortId: PROJECT, timeEntryIds: ids, entryGrouping: "entry", settlementTermId: "Net30",
            invoiceDate: "2027-06-16" })
        made.invoiceId = sys(() => Array.from(ec.entity.find("mantle.work.effort.WorkEffortInvoice").condition("workEffortId", PROJECT).list())[0]?.invoiceId)
        const invoice = one("mantle.account.invoice.Invoice", { invoiceId: made.invoiceId })
        const unbilled = render("apps/Projects/Billing/Unbilled", { rootWorkEffortId: PROJECT })
        const projectTime = render("apps/Projects/Projects/ProjectDetail/Time", { workEffortId: PROJECT, list: "unbilled" })
        const list = render("apps/Projects/Billing/Invoices", { list: "drafts", rootWorkEffortId: PROJECT })
        return { created, invoice, rows: entries(), unbilled, projectTime, list }
    },
    then({ created, invoice, rows, unbilled, projectTime, list }) {
        created.errors == ""
        made.invoiceId != null
        invoice.statusId == "InvoiceInProcess"
        invoice.toPartyId == "BWK_CLIENT" && invoice.fromPartyId == "ORG_ZIZI_SERVICES"
        dec(invoice.invoiceTotal) == "2475.00"
        invoice.settlementTermId == "Net30"
        rows.filter((row) => row.invoiceId === made.invoiceId).length == 3
        rows.find((row) => row.rateTypeEnumId === "RatpNoCharge").invoiceId == null
        unbilled.output.includes("No unbilled time matches")
        !projectTime.output.includes("Password reset")
        list.output.includes(made.invoiceId)
        list.output.includes("Drafts · 1")
    },
})

feature("InvoiceDetail shows the lines and the time behind them; john.doe approves the invoice, sends it to the client, and the print has the time detail", {
    when() {
        const detail = render("apps/Projects/Billing/InvoiceDetail", { invoiceId: made.invoiceId })
        const approved = post("Billing/InvoiceDetail/changeStatus", { invoiceId: made.invoiceId, action: "approve" })
        const afterApprove = one("mantle.account.invoice.Invoice", { invoiceId: made.invoiceId }).statusId
        const sent = post("Billing/InvoiceDetail/sendInvoice", { invoiceId: made.invoiceId, toAddresses: "billing@walk-bakery.example", note: "Thank you for June." })
        const afterSend = one("mantle.account.invoice.Invoice", { invoiceId: made.invoiceId }).statusId
        const email = sys(() => Array.from(ec.entity.find("moqui.basic.email.EmailMessage").condition("emailTemplateId", "BOSS_PROJECT_INVOICE").orderBy("-sentDate").list())[0])
        const print = render("apps/Projects/Billing/InvoicePrint", { invoiceId: made.invoiceId }, "html-print")
        const sentList = render("apps/Projects/Billing/Invoices", { list: "sent", rootWorkEffortId: PROJECT })
        // the issued PDF is the Projects print with the time detail, which send#Invoice renders from its location: the key
        // of the issued file is the hash of that print, not of Mantle's plain one
        const issueKey = (html) => ec.user.singleUseCodeHash(html).replace(/[^A-Za-z0-9]/g, "").slice(0, 24)
        const vendorPartyId = one("mantle.account.invoice.Invoice", { invoiceId: made.invoiceId }).fromPartyId
        const projectsPrint = sys(() => ec.screen.render({ rootScreen: "component://mr-boss/screen/Projects/Billing/InvoicePrint.xml",
            renderMode: "html-print", parameters: { invoiceId: made.invoiceId, organizationPartyId: vendorPartyId } }).text)
        const plainPrint = sys(() => ec.service.sync().name("mantle.account.InvoiceServices.get#InvoiceOutput")
            .parameters({ invoiceId: made.invoiceId, organizationPartyId: vendorPartyId }).call().printHtml)
        const issuedLocations = sys(() => Array.from(ec.entity.find("mantle.account.invoice.InvoiceContent")
            .condition("invoiceId", made.invoiceId).condition("contentTypeEnumId", "IctInvoiceDocument").list())
            .map((row) => String(row.contentLocation)))
        const issued = { projectsKey: issueKey(projectsPrint), plainKey: issueKey(plainPrint), locations: issuedLocations,
            timeDetail: projectsPrint.includes("Time detail") }
        return { detail, approved, afterApprove, sent, afterSend, email, print, sentList, issued }
    },
    then({ detail, approved, afterApprove, sent, afterSend, email, print, sentList, issued }) {
        detail.status == 200 && !detail.broken
        detail.output.includes("Client invoice")
        detail.output.includes("Password reset")
        detail.output.includes("$1,125.00")
        detail.output.includes("billing@walk-bakery.example")
        approved.errors == ""
        afterApprove == "InvoiceFinalized"
        sent.errors == ""
        afterSend == "InvoiceSent"
        email != null
        String(email.subject).includes(made.invoiceId)
        String(email.toAddresses).includes("billing@walk-bakery.example")
        String(email.body).includes("Thank you for June.")
        print.output.includes("Time detail")
        print.output.includes("Login screen")
        print.output.includes("$2,475.00")
        sentList.output.includes(made.invoiceId)
        issued.timeDetail
        issued.locations.length == 1
        issued.locations[0].includes("/" + issued.projectsKey + "/")
        !issued.locations[0].includes("/" + issued.plainKey + "/")
    },
})

feature("joe may not open Billing: Unbilled, the invoice and its print are refused or not available to him", {
    when() {
        return as("joe.developer", () => ({
            unbilled: render("apps/Projects/Billing/Unbilled", {}),
            detail: render("apps/Projects/Billing/InvoiceDetail", { invoiceId: made.invoiceId }),
            draft: sys(() => {
                try { call("ironstone.projects.BillingServices.get#InvoiceDraft", { workEffortId: PROJECT }) } catch (err) { const thrown = String(err.message); ec.message.clearErrors(); return thrown }
                const errors = ec.message.getErrorsString() || ""
                ec.message.clearErrors()
                return errors
            }),
        }))
    },
    then({ unbilled, detail, draft }) {
        unbilled.status != 200 || !unbilled.output.includes("Billing walk")
        detail.status != 200 || !detail.output.includes("Password reset")
        draft.includes("Only those who manage money")
    },
})
