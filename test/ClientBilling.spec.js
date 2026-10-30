// Billing, hours and email for clients (impl-projects.md P10b; design-projects.md §4 ProjectTime, §10 Invoices and InvoiceDetail,
// client users): with authorization on, a client contact (sheldon.acme of Acme on ACME; gob.bluth of Bluth on BLUTH) lists and opens
// only its organization's invoices sent to it on its client projects, read only, with the time of a line only when the project
// shares its hours (day, work item, hours: never who, a rate, an amount or a comment) and its print and PDF; never a draft, an
// approved invoice not sent, another client's invoice, a worker's or an expense invoice, nor one of a project of its organization
// without client sign-in (ACMEAPP); no write of InvoiceDetail works for it. ProjectDetail's Hours tab shows a client the hours by
// week and work item of a project that shares them (WstShareHours, set on ACME here), on its shared items only, and is refused
// internal users. A status update posted for the client is emailed to its contacts (sheldon) and to no other client.
// The invoices, entries, timesheet, payments and setting are made in setupSpec with authorization off and removed after.
// Run: ./moq test mr-boss --spec ClientBilling
const webroot = "component://webroot/screen/webroot.xml"
const SHELDON = "sheldon.acme"
const GOB = "gob.bluth"
const made = { entries: [], updates: [] }
const INV = { sent: "CBT_ACME_SENT", draft: "CBT_ACME_DRAFT", finalized: "CBT_ACME_FIN", acmeApp: "CBT_ACMEAPP", worker: "CBT_WORKER",
    workerToAcme: "CBT_WORKER_ACME", expense: "CBT_EXPENSE", bluth: "CBT_BLUTH" }
// the totals of the invoices sheldon must never see, and what of his own invoice's time is not his to see
const OTHER_TOTALS = ["7,654.32", "6,543.21", "5,432.10", "4,321.09", "3,210.98", "2,109.87", "1,098.76"]
const TIME_SECRETS = ["246.81", "135.79", "ZQX-TIME-COMMENT", "Joe Developer", "Single sign-on with their directory", "9.99", "4.44", "7.07", "802.13", "237.62"]
const ACME_SECRETS = ["ZQX-INTERNAL-NOTE", "150.00", "135.00", "24,000", "Bluth banana stand site", "Frozen banana menu page", "Price the stand",
    "Hiring plan 2027", "Brightwater", "CBT_PAY_B"]
const leaksOf = (text, secrets) => secrets.filter((secret) => String(text || "").includes(secret))

function render(path, parameters, mode, standalone) {
    const all = Object.assign(standalone === false ? {} : { lastStandalone: "true" }, parameters || {})
    const str = ec.screen.makeTest().rootScreen(webroot).renderMode(mode || "qvt").withStaticData().render("apps/Projects/" + path, all, null)
    const output = String(str.output || "")
    const errors = str.errorMessages.join(" | ")
    ec.message.clearErrors()
    return { status: str.status, errors, output, refused: str.status == 401 || str.status == 403 || /not authorized|is not available/i.test(errors),
        broken: /Error rendering|Exception in render/.test(output) }
}
function hit(path, parameters, method) {
    const full = path.startsWith("../") ? path.substring(3) : "apps/Projects/" + path
    const str = ec.screen.makeTest().rootScreen(webroot).render(full, parameters || {}, method || null)
    const output = String(str.output || "")
    const errors = str.errorMessages.join(" | ")
    ec.message.clearErrors()
    let json = null
    try { json = JSON.parse(output) } catch (err) { json = null }
    return { status: str.status, errors, output, json, refused: str.status == 401 || str.status == 403 || /not authorized/i.test(errors) }
}
function sys(run) {
    const wasDisabled = ec.artifactExecution.disableAuthz()
    try { return run() } finally { if (!wasDisabled) ec.artifactExecution.enableAuthz() }
}
function as(username, run) {
    login(username)
    const wasDisabled = ec.artifactExecution.authzDisabled()
    if (wasDisabled) ec.artifactExecution.enableAuthz()
    try { return run() } finally {
        if (wasDisabled) ec.artifactExecution.disableAuthz()
        login("john.doe")
    }
}
// a service as the user signed in: authorization off, as a screen's own call is authorized by the screen (the services decide by the
// user's permission and parties, not by authorization)
const service = (name, parameters) => sys(() => {
    const out = ec.service.sync().name(name).parameters(parameters || {}).call() || {}
    const errors = ec.message.hasError() ? ec.message.getErrorsString() : ""
    ec.message.clearErrors()
    return Object.assign({}, out, { _errors: errors || "" })
})
const one = (entityName, fields) => sys(() => ec.entity.find(entityName).condition(fields).one())
const emailIds = (templateId) => sys(() => new Set(Array.from(ec.entity.find("moqui.basic.email.EmailMessage").condition("emailTemplateId", templateId).list())
        .map((email) => email.emailMessageId)))
const newEmails = (templateId, before) => sys(() => Array.from(ec.entity.find("moqui.basic.email.EmailMessage").condition("emailTemplateId", templateId).list())
        .filter((email) => !before.has(email.emailMessageId)).map((email) => ({ to: String(email.toAddresses || ""), subject: String(email.subject || ""),
            body: String(email.body || "") })))

// These raw, nonposted applications exercise the legacy client projection, not reviewed settlement.
function useLegacySettlementFixtures() {
    const preference = call("mantle.ledger.LedgerServices.find#PartyAcctgPreference", {
        organizationPartyId: "ORG_ZIZI_SERVICES"
    }).partyAcctgPreference
    if (!preference?.organizationPartyId) throw new Error("ClientBilling needs an inherited accounting preference")
    made.settlementGuard = {
        organizationPartyId: preference.organizationPartyId,
        originalFlag: preference.settlementApplicationGuardEnabled ?? null
    }
    if (made.settlementGuard.originalFlag !== "N")
        call("update#mantle.ledger.config.PartyAcctgPreference", {
            organizationPartyId: made.settlementGuard.organizationPartyId,
            settlementApplicationGuardEnabled: "N"
        })
}
function restoreSettlementGuard() {
    if (!made.settlementGuard || made.settlementGuard.originalFlag === "N") return
    ec.message.pushErrors()
    try {
        ec.service
            .sync()
            .name("update#mantle.ledger.config.PartyAcctgPreference")
            .parameters({
                organizationPartyId: made.settlementGuard.organizationPartyId,
                settlementApplicationGuardEnabled: made.settlementGuard.originalFlag
            })
            .requireNewTransaction(true)
            .throwOnError(true)
            .call()
    } finally {
        ec.message.clearErrors()
        ec.message.popErrors()
    }
}

spec({
    stepwise: false,
    setupSpec() {
        login("john.doe")
        sys(() => {
            useLegacySettlementFixtures()
            const invoice = (invoiceId, fromPartyId, toPartyId, statusId, projectId, amount, invoiceTypeEnumId) => {
                call("create#mantle.account.invoice.Invoice", { invoiceId, invoiceTypeEnumId: invoiceTypeEnumId || "InvoiceSales", fromPartyId, toPartyId,
                    statusId: "InvoiceInProcess", invoiceDate: "2026-10-10 00:00:00", currencyUomId: "USD", description: `Client billing test ${invoiceId}` })
                call("create#mantle.account.invoice.InvoiceItem", { invoiceId, invoiceItemSeqId: "01", itemTypeEnumId: "ItemTimeEntry", quantity: amount[0],
                    amount: amount[1], description: "Portal work in October" })
                if (statusId !== "InvoiceInProcess") {
                    // straight to the status (the test's invoices skip the flow)
                    const row = ec.entity.find("mantle.account.invoice.Invoice").condition("invoiceId", invoiceId).one()
                    row.statusId = statusId
                    row.update()
                }
                if (projectId) call("create#mantle.work.effort.WorkEffortInvoice", { workEffortId: projectId, invoiceId })
            }
            invoice(INV.sent, "ORG_ZIZI_SERVICES", "ORG_ACME", "InvoiceSent", "ACME", [5, "111.11"])
            invoice(INV.draft, "ORG_ZIZI_SERVICES", "ORG_ACME", "InvoiceInProcess", "ACME", [1, "7654.32"])
            invoice(INV.finalized, "ORG_ZIZI_SERVICES", "ORG_ACME", "InvoiceFinalized", "ACME", [1, "6543.21"])
            invoice(INV.acmeApp, "ORG_ZIZI_SERVICES", "ORG_ACME", "InvoiceSent", "ACMEAPP", [1, "5432.10"])
            invoice(INV.worker, "ORG_ZIZI_JD", "ORG_ZIZI_SERVICES", "InvoiceSent", null, [1, "4321.09"])
            // a worker's invoice addressed to the client's organization: a worker's still, never the client's
            invoice(INV.workerToAcme, "ORG_ZIZI_JD", "ORG_ACME", "InvoiceSent", null, [1, "3210.98"])
            invoice(INV.expense, "ORG_ZIZI_JD", "ORG_ZIZI_SERVICES", "InvoiceSent", "ACME", [1, "2109.87"])
            invoice(INV.bluth, "ORG_ZIZI_SERVICES", "ORG_BLUTH", "InvoiceSent", "BLUTH", [1, "1098.76"])
            made.brightwater = Array.from(ec.entity.find("mantle.account.invoice.Invoice").condition("toPartyId", "BOSS_DEMO_BRIGHTWATER").list()).map((row) => row.invoiceId)
            // the time: billed on sheldon's invoice (a shared item and a team item), on a worker's invoices, an approved week, a running
            // timer, an open week and a no-charge entry
            call("create#mantle.work.time.Timesheet", { timesheetId: "CBT_TS", partyId: "ORG_ZIZI_JD", fromDate: "2025-03-03 00:00:00",
                thruDate: "2025-03-10 00:00:00", statusId: "TmshApproved" })
            const entry = (workEffortId, from, hours, extra) => {
                const id = call("create#mantle.work.time.TimeEntry", Object.assign({ partyId: "ORG_ZIZI_JD", workEffortId, fromDate: from,
                    thruDate: Number(String(ec.l10n.parseTimestamp(from + ".000", "yyyy-MM-dd HH:mm:ss.SSS"))) + hours * 3600000, hours,
                    rateTypeEnumId: "RatpStandard", clientHourRate: "246.81", vendorHourRate: "135.79", comments: "ZQX-TIME-COMMENT: the margin is thin" }, extra || {})).timeEntryId
                made.entries.push(id)
                return id
            }
            entry("ACME-1", "2026-10-05 10:00:00", 3.25, { invoiceId: INV.sent, invoiceItemSeqId: "01" })
            entry("ACME-3", "2026-10-06 10:00:00", 1.75, { invoiceId: INV.sent, invoiceItemSeqId: "01" })
            entry("ACME-1", "2026-10-07 10:00:00", 2.5, { vendorInvoiceId: INV.worker, vendorInvoiceItemSeqId: "01" })
            entry("ACME-1", "2026-10-08 10:00:00", 1.5, { vendorInvoiceId: INV.workerToAcme, vendorInvoiceItemSeqId: "01" })
            entry("BLUTH-1", "2026-10-07 10:00:00", 2.22, { invoiceId: INV.bluth, invoiceItemSeqId: "01" })
            entry("ACME-2", "2025-03-04 10:00:00", 6.66, { timesheetId: "CBT_TS" })
            entry("ACME-1", "2025-03-05 10:00:00", 4.44, { timesheetId: "CBT_TS", rateTypeEnumId: "RatpNoCharge" })
            entry("ACME-3", "2025-03-05 14:00:00", 8.02, { timesheetId: "CBT_TS" })
            const running = entry("ACME-1", "2025-03-06 10:00:00", 7.07, { timesheetId: "CBT_TS" })
            const row = ec.entity.find("mantle.work.time.TimeEntry").condition("timeEntryId", running).one()
            row.thruDate = null
            row.update()
            entry("ACME-2", "2025-01-07 10:00:00", 9.99)
            // a payment on sheldon's invoice and one on Bluth's
            for (const [paymentId, fromPartyId, invoiceId, amount] of [["CBT_PAY", "ORG_ACME", INV.sent, "200.00"], ["CBT_PAY_B", "ORG_BLUTH", INV.bluth, "99.99"]]) {
                call("create#mantle.account.payment.Payment", { paymentId, paymentTypeEnumId: "PtInvoicePayment", fromPartyId, toPartyId: "ORG_ZIZI_SERVICES",
                    statusId: "PmntDelivered", effectiveDate: "2026-10-12 00:00:00", amount, amountUomId: "USD" })
                call("create#mantle.account.payment.PaymentApplication", { paymentApplicationId: paymentId + "_A", paymentId, invoiceId, amountApplied: amount,
                    appliedDate: "2026-10-12 00:00:00" })
            }
            // ACME shares its hours with the client
            call("create#mantle.work.effort.WorkEffortSetting", { workEffortId: "ACME", settingTypeEnumId: "WstShareHours", settingValue: "Y" })
            made.acmeBillingEmail = call("mantle.party.ContactServices.get#PrimaryEmailAddress", { partyId: "ORG_ACME_BA" }).emailAddress
            made.acmeHealth = ec.entity.find("mantle.work.effort.WorkEffort").condition("workEffortId", "ACME").one().healthEnumId
        })
    },
    cleanupSpec() {
        sys(() => {
            try {
                ec.entity.find("mantle.work.effort.WorkEffortSetting").condition({ workEffortId: "ACME", settingTypeEnumId: "WstShareHours" }).deleteAll()
                for (const id of ["CBT_PAY", "CBT_PAY_B"]) {
                    ec.entity.find("mantle.account.payment.PaymentApplication").condition("paymentId", id).deleteAll()
                    ec.entity.find("mantle.account.payment.Payment").condition("paymentId", id).deleteAll()
                }
                for (const id of made.entries) ec.entity.find("mantle.work.time.TimeEntry").condition("timeEntryId", id).deleteAll()
                ec.entity.find("mantle.work.time.Timesheet").condition("timesheetId", "CBT_TS").deleteAll()
                for (const invoiceId of Object.values(INV)) {
                    ec.entity.find("mantle.work.effort.WorkEffortInvoice").condition("invoiceId", invoiceId).deleteAll()
                    const invoice = ec.entity.find("mantle.account.invoice.Invoice").condition("invoiceId", invoiceId).one()
                    if (invoice) { invoice.statusId = "InvoiceCancelled"; invoice.update() }
                }
                for (const id of made.updates) {
                    for (const entityName of ["mantle.work.effort.WorkEffortCommEvent", "mantle.work.effort.WorkEffortUpdate"])
                        ec.entity.find(entityName).condition("communicationEventId", id).deleteAll()
                    ec.entity.find("mantle.party.communication.CommunicationEvent").condition("communicationEventId", id).deleteAll()
                }
                const acme = ec.entity.find("mantle.work.effort.WorkEffort").condition("workEffortId", "ACME").one()
                acme.healthEnumId = made.acmeHealth ?? null
                acme.update()
            } finally {
                restoreSettlementGuard()
            }
        })
    },
})

feature("legacy client-billing applications keep their default-off date and currency metadata", {
    when() {
        return sys(() => ({
            preference: call("mantle.ledger.LedgerServices.find#PartyAcctgPreference", {
                organizationPartyId: "ORG_ZIZI_SERVICES"
            }).partyAcctgPreference,
            applications: ["CBT_PAY_A", "CBT_PAY_B_A"].map(paymentApplicationId =>
                ec.entity
                    .find("mantle.account.payment.PaymentApplication")
                    .condition("paymentApplicationId", paymentApplicationId)
                    .one()
            )
        }))
    },
    then({preference, applications}) {
        preference.organizationPartyId == made.settlementGuard.organizationPartyId
        preference.settlementApplicationGuardEnabled == "N"
        applications.every(row => row != null && row.accountingDate == null && row.currencyUomId == null)
    }
})

feature("a client's Billing: the menu has Invoices only, Billing opens on Invoices, Unbilled, Rates and OrderDetail are refused", {
    when() {
        return as(SHELDON, () => {
            const levels = {}
            for (const path of ["Projects/Billing"]) {
                const found = hit("../menuData/apps/" + path)
                for (const level of Array.isArray(found.json) ? found.json : [])
                    levels[level.name] = (level.subscreens || []).filter((item) => item.menuInclude).map((item) => item.name)
            }
            // one refused screen here: test/ClientIsolation.spec.js renders every screen file as the client (Rates, CreateInvoice, OrderDetail)
            return { levels, billing: render("Billing", {}), unbilled: render("Billing/Unbilled", {}),
                money: service("ironstone.projects.BillingServices.check#Money", { need: "none" }) }
        })
    },
    then({ levels, billing, unbilled, money }) {
        levels.Projects.includes("Billing")
        levels.Billing == ["Invoices"]
        billing.status == 200 && !billing.broken
        billing.output.includes(INV.sent)
        unbilled.refused
        money.managesMoney == false
    },
})

feature("the team is still refused all of Billing, and john.doe's Billing still opens on Unbilled", {
    when() {
        const joe = as("joe.developer", () => ({ invoices: render("Billing/Invoices", {}) }))
        const john = as("john.doe", () => ({ billing: render("Billing", {}), list: render("Billing/Invoices", {}) }))
        return { joe, john }
    },
    then({ joe, john }) {
        joe.invoices.refused
        john.billing.status == 200
        john.billing.output.includes("All unbilled")
        john.list.output.includes(INV.draft)
        john.list.output.includes(INV.worker)
    },
})

feature("a client lists only its organization's invoices sent to it on its client projects", {
    when() {
        const sheldon = as(SHELDON, () => ({ list: render("Billing/Invoices", { list: "all" }), tui: render("Billing/Invoices", { list: "all" }, "tui"),
            sent: render("Billing/Invoices", { list: "sent" }), paid: render("Billing/Invoices", { list: "paid" }),
            rows: service("ironstone.projects.BillingServices.find#InvoiceRows", { list: "all" }),
            other: service("ironstone.projects.BillingServices.find#InvoiceRows", { list: "all", rootWorkEffortId: "BLUTH" }) }))
        const gob = as(GOB, () => ({ rows: service("ironstone.projects.BillingServices.find#InvoiceRows", { list: "all" }), list: render("Billing/Invoices", {}) }))
        return { sheldon, gob }
    },
    then({ sheldon, gob }) {
        sheldon.list.status == 200 && !sheldon.list.broken
        sheldon.rows.clientView == true
        sheldon.rows.rowList.map((row) => row.invoiceId) == [INV.sent]
        Object.keys(sheldon.rows.counts).sort() == ["all", "overdue", "paid", "sent"]
        sheldon.list.output.includes(INV.sent)
        sheldon.list.output.includes("$555.55")
        sheldon.sent.output.includes(INV.sent)
        !sheldon.list.output.includes("Worker invoices")
        !sheldon.list.output.includes("To send")
        [INV.draft, INV.finalized, INV.acmeApp, INV.worker, INV.workerToAcme, INV.expense, INV.bluth].filter((id) => sheldon.list.output.includes(id)
            || sheldon.tui.output.includes(id)) == []
        made.brightwater.filter((id) => sheldon.list.output.includes(id)) == []
        leaksOf(sheldon.list.output + sheldon.tui.output, OTHER_TOTALS.concat(ACME_SECRETS)) == []
        sheldon.other.rowList.length == 0
        gob.rows.rowList.map((row) => row.invoiceId) == [INV.bluth]
        !gob.list.output.includes(INV.sent)
    },
})

feature("a client opens its own invoice read only: lines, payments, the time of a shared project as hours only, no Chatter and no move", {
    when() {
        return as(SHELDON, () => ({ detail: render("Billing/InvoiceDetail", { invoiceId: INV.sent }), whole: render("Billing/InvoiceDetail", { invoiceId: INV.sent }, "qvt", false),
            tui: render("Billing/InvoiceDetail", { invoiceId: INV.sent }, "tui"),
            service: service("ironstone.projects.BillingServices.get#InvoiceDetail", { invoiceId: INV.sent }).detail }))
    },
    then({ detail, whole, tui, service }) {
        detail.status == 200 && !detail.broken
        detail.output.includes("Portal work in October")
        detail.output.includes("$555.55")
        detail.output.includes("CBT_PAY")
        detail.output.includes("$355.55")
        detail.output.includes("Customer sign-in")
        detail.output.includes("3.25")
        detail.output.includes("Other work")
        tui.status == 200
        leaksOf(detail.output + whole.output + tui.output, TIME_SECRETS.concat(OTHER_TOTALS, ACME_SECRETS)) == []
        !detail.output.includes("InvoiceSendDialog")
        !detail.output.includes("InvoiceEditDialog")
        !detail.output.includes("Cancel the invoice")
        !detail.output.includes("Resume changes")
        !detail.output.includes("InvoiceChatter")
        service.clientView == true
        service.canApprove == false && service.canSend == false && service.canCancel == false && service.canEdit == false && service.canResume == false
        service.sendTo == ""
        service.timeAmountText == ""
        service.entryRows.length == 2
        service.entryRows.every((row) => Object.keys(row).sort().join(",") == "dayText,hoursText,invoiceItemSeqId,itemText,itemUrl")
        service.hoursText == "5"
    },
})

feature("a client's print and PDF of its invoice: the time as hours only; any other invoice is not available in detail, print or PDF", {
    when() {
        return as(SHELDON, () => {
            const own = { print: render("Billing/InvoicePrint", { invoiceId: INV.sent }, "html-print"), fo: render("Billing/InvoicePrint", { invoiceId: INV.sent }, "xsl-fo") }
            const others = {}
            for (const id of [INV.draft, INV.finalized, INV.acmeApp, INV.worker, INV.workerToAcme, INV.expense, INV.bluth].concat(made.brightwater))
                others[id] = { detail: render("Billing/InvoiceDetail", { invoiceId: id }), print: render("Billing/InvoicePrint", { invoiceId: id }, "html-print"),
                    fo: render("Billing/InvoicePrint", { invoiceId: id }, "xsl-fo"), access: service("ironstone.projects.BillingServices.get#InvoiceAccess", { invoiceId: id, need: "none" }) }
            return { own, others }
        })
    },
    then({ own, others }) {
        own.print.status == 200
        own.print.output.includes("Time detail")
        own.print.output.includes("Customer sign-in")
        own.print.output.includes("$555.55")
        leaksOf(own.print.output + own.fo.output, TIME_SECRETS.concat(OTHER_TOTALS)) == []
        Object.entries(others).filter(([id, out]) => out.access.canView || !out.detail.output.includes("is not available")
            || !out.print.output.includes("is not available") || leaksOf(out.detail.output + out.print.output + out.fo.output, OTHER_TOTALS).length).map(([id]) => id) == []
    },
})

feature("no write of InvoiceDetail works for a client, through the screen or the services", {
    when() {
        const before = emailIds("BOSS_PROJECT_INVOICE")
        // every write of an invoice asks get#InvoiceAccess for change: one post, one service and the access itself
        const posts = as(SHELDON, () => [
            hit("Billing/InvoiceDetail/changeStatus", { invoiceId: INV.sent, action: "cancel" }, "post")])
        const calls = as(SHELDON, () => [
            service("ironstone.projects.BillingServices.update#InvoiceStatus", { invoiceId: INV.sent, action: "cancel" }),
            service("ironstone.projects.BillingServices.get#InvoiceAccess", { invoiceId: INV.sent, need: "change" })])
        return { posts, calls, invoice: one("mantle.account.invoice.Invoice", { invoiceId: INV.sent }), draft: one("mantle.account.invoice.Invoice", { invoiceId: INV.draft }),
            line: one("mantle.account.invoice.InvoiceItem", { invoiceId: INV.sent, invoiceItemSeqId: "01" }), emails: newEmails("BOSS_PROJECT_INVOICE", before) }
    },
    then({ posts, calls, invoice, draft, line, emails }) {
        posts.every((out) => out.refused || out.errors.length > 0)
        invoice.statusId == "InvoiceSent"
        draft.statusId == "InvoiceInProcess"
        String(invoice.description).includes("Client billing test")
        line != null
        emails == []
        calls.every((out) => out._errors.length > 0)
        calls[1].canView == false
    },
})

feature("ProjectDetail's Hours for a client: hours by week and work item on shared items when the project shares them, without rates or names", {
    when() {
        const tabsOf = () => {
            const menu = hit("../menuData/apps/Projects/Projects/ProjectDetail", { workEffortId: "ACME" })
            const tabs = []
            for (const level of Array.isArray(menu.json) ? menu.json : []) if (level.name === "ProjectDetail")
                for (const item of level.subscreens || []) if (item.menuInclude) tabs.push(item.name)
            return tabs
        }
        const sheldon = as(SHELDON, () => {
            const tabs = tabsOf()
            return { tabs, page: render("Projects/ProjectDetail/ClientHours", { workEffortId: "ACME" }),
                tui: render("Projects/ProjectDetail/ClientHours", { workEffortId: "ACME" }, "tui"),
                hours: service("ironstone.projects.TimeServices.get#ClientHours", { workEffortId: "ACME" }).clientHours,
                bluth: service("ironstone.projects.TimeServices.get#ClientHours", { workEffortId: "BLUTH" }).clientHours,
                time: render("Projects/ProjectDetail/Time", { workEffortId: "ACME" }), itemTime: service("ironstone.projects.TimeServices.get#ItemTime", { workEffortId: "ACME-1" }).itemTime }
        })
        const gob = as(GOB, () => ({ page: render("Projects/ProjectDetail/ClientHours", { workEffortId: "BLUTH" }),
            hours: service("ironstone.projects.TimeServices.get#ClientHours", { workEffortId: "BLUTH" }).clientHours,
            detail: render("Billing/InvoiceDetail", { invoiceId: INV.bluth }) }))
        const john = as("john.doe", () => ({ tabs: tabsOf(), page: render("Projects/ProjectDetail/ClientHours", { workEffortId: "ACME" }),
            hours: service("ironstone.projects.TimeServices.get#ClientHours", { workEffortId: "ACME" }).clientHours }))
        return { sheldon, gob, john }
    },
    then({ sheldon, gob, john }) {
        sheldon.tabs.includes("ClientHours")
        !sheldon.tabs.includes("Time")
        sheldon.page.status == 200 && !sheldon.page.broken
        sheldon.page.output.includes("Customer sign-in")
        sheldon.page.output.includes("Sign-in page")
        sheldon.page.output.includes("6.66")
        sheldon.page.output.includes("3.25")
        sheldon.page.output.includes("Week of Mar 3, 2025")
        !sheldon.page.output.includes("Week of Jan 6, 2025")
        leaksOf(sheldon.page.output + sheldon.tui.output, TIME_SECRETS.concat(ACME_SECRETS)) == []
        sheldon.hours.shared == true
        sheldon.hours.weekRows.every((row) => ["ACME-1", "ACME-2", "ACME-4", "ACME-5"].includes(row.workEffortId))
        !sheldon.hours.weekRows.some((row) => row.workEffortId == "ACME-3")
        sheldon.hours.weekRows.every((row) => Object.keys(row).sort().join(",") == "hoursText,itemText,url,weekStart,weekText,weekTotalText,workEffortId")
        sheldon.bluth.shared == false
        sheldon.bluth.weekRows == []
        sheldon.time.refused
        sheldon.itemTime == null
        gob.page.status == 200
        gob.page.output.includes("does not share its hours")
        !gob.page.output.includes("2.22")
        gob.hours.shared == false
        gob.detail.status == 200
        gob.detail.output.includes(INV.bluth)
        !gob.detail.output.includes("2.22")
        !gob.detail.output.includes("Joe Developer")
        // an internal user: the tab is not in its menu, and opened by its path it is refused (the item's group is checked for the
        // first screen of a lastStandalone render too since impl-projects.md P11, F133), reading nothing
        john.tabs.includes("Time")
        !john.tabs.includes("ClientHours")
        john.page.refused
        leaksOf(john.page.output, ["6.66", "3.25", "Week of"]) == []
        john.hours.shared == false
    },
})

feature("a status update posted for the client is emailed to Acme's contact only; one for the team is emailed to no one", {
    when() {
        const before = emailIds("MANTLE_PROJECT_UPDATE")
        const shown = as("john.doe", () => hit("Projects/ProjectDetail/postUpdate", { workEffortId: "ACME", healthEnumId: "WehOnTrack", percentComplete: "40",
            body: "Sign-in is back on track: the test accounts came.", clientVisible: "Y" }, "post"))
        const clientEmails = newEmails("MANTLE_PROJECT_UPDATE", before)
        const before2 = emailIds("MANTLE_PROJECT_UPDATE")
        const team = as("john.doe", () => hit("Projects/ProjectDetail/postUpdate", { workEffortId: "ACME", healthEnumId: "WehAtRisk",
            body: "ZQX-INTERNAL-NOTE: the margin is thin.", clientVisible: "N" }, "post"))
        const teamEmails = newEmails("MANTLE_PROJECT_UPDATE", before2)
        sys(() => {
            for (const row of ec.entity.find("mantle.work.effort.WorkEffortUpdate").condition("workEffortId", "ACME").list())
                if (!["BOSS_DEMO_ACME_UPD1"].includes(row.communicationEventId)) made.updates.push(row.communicationEventId)
        })
        return { shown, clientEmails, team, teamEmails }
    },
    then({ shown, clientEmails, team, teamEmails }) {
        shown.errors == ""
        // Acme's two contacts on ACME (its manager sheldon and its billing contact), each its own email
        clientEmails.length == 2
        clientEmails.some((email) => email.to == "sheldon.acme@test.com")
        clientEmails.every((email) => email.to == "sheldon.acme@test.com" || email.to == made.acmeBillingEmail)
        clientEmails[0].body.includes("Sign-in is back on track")
        clientEmails[0].subject.includes("Acme customer portal")
        !clientEmails.some((email) => email.to.includes("gob.bluth"))
        leaksOf(clientEmails[0].body, ["ZQX-INTERNAL-NOTE", "987.65", "150.00"]) == []
        team.errors == ""
        teamEmails == []
    },
})
