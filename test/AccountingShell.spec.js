const root = "component://webroot/screen/webroot.xml"
// An Accounting page as html (or another render mode), for the BOSS_ACCT_ORG demo records.
function page(path, parameters = {}, renderMode = "html") {
    const values = Object.assign({organizationPartyId: "BOSS_ACCT_ORG"}, parameters)
    // qvt: the screen as the shell fetches it, a fragment of the last standalone screen, with its form-lists' data
    const result =
        renderMode == "qvt"
            ? ec.screen
                  .makeTest()
                  .rootScreen("component://mr-boss/screen/Accounting.xml")
                  .renderMode("qvt")
                  .withStaticData()
                  .render(path, Object.assign({lastStandalone: "-2"}, values), null)
            : ec.screen
                  .makeTest()
                  .rootScreen(root)
                  .renderMode(renderMode)
                  .render("apps/Accounting/" + path, values, null)
    // a widget that fails renders its error into the output, not into errorMessages
    const output = String(result.output || "")
    const failed = output.match(/(Error rendering|Exception in render)[^\n<]*/g) || []
    return {status: result.status, output, errorMessages: result.errorMessages.concat(failed), header: result.header}
}
function finance(user, run) {
    login(user)
    const disabled = ec.artifactExecution.authzDisabled()
    ec.artifactExecution.enableAuthz()
    try {
        return run()
    } finally {
        ec.message.clearErrors()
        if (disabled) ec.artifactExecution.disableAuthz()
        login("john.doe")
    }
}
const roles = [
    {
        role: "ar",
        sections: ["Receivables", "Payments"],
        create: ["accountingNewInvoice"]
    },
    {
        role: "ap",
        sections: ["Payables", "Payments"],
        create: ["accountingNewBill"]
    },
    {role: "match", sections: [], create: []},
    {
        role: "treasury",
        sections: ["Payments"],
        create: ["accountingNewPayment"]
    },
    {
        role: "gl",
        sections: ["Receivables", "Payables", "Payments", "GeneralLedger", "PeriodClose", "Reports"],
        create: ["accountingNewEntry"]
    },
    {role: "tax", sections: [], create: []},
    {
        role: "read",
        sections: ["Receivables", "Payables", "Payments", "GeneralLedger", "Reports"],
        create: []
    },
    {
        role: "approve",
        sections: ["Receivables", "Payables", "Payments", "GeneralLedger", "PeriodClose", "Reports"],
        create: []
    },
    {
        role: "admin",
        sections: ["Receivables", "Payables", "Payments", "GeneralLedger", "PeriodClose", "Reports", "Settings"],
        create: ["accountingNewInvoice", "accountingNewBill", "accountingNewPayment", "accountingNewEntry"]
    }
]
feature("Accounting menu and quick create follow the #role grants", {
    where: roles,
    when({role}) {
        return finance("finance." + role, () => {
            const menu = ec.screen.makeTest().rootScreen(root).render("menuData/apps/Accounting/Home", {}, null)
            const shell = ec.screen.makeTest().rootScreen(root).render("shellData", {}, null)
            return {
                names: JSON.parse(menu.output)
                    .find(level => level.name === "Accounting")
                    .subscreens.filter(item => item.menuInclude)
                    .map(item => item.name),
                providers: JSON.parse(shell.output).apps.find(app => app.name === "Accounting").providers
            }
        })
    },
    then({names, providers, sections, create}) {
        names == ["Home", ...sections]
        providers.quickCreate.map(item => item.kind) == create
        providers.paletteTypes == ["MantleInvoice", "MantlePayment", "MantleGlAccount", "MantleAcctgTrans"]
        providers.keymaps[0].scope == "accounting"
    }
})
feature("Accounting reader palette and record links preserve authorized finance destinations", {
    when() {
        return finance("finance.read", () => {
            const invoke = (name, p) => ec.service.sync().name(name).parameters(p).call()
            return {
                palette: invoke("ironstone.accounting.AccessServices.search#Records", {text: "BOSS_ACCT", limit: 20}),
                invoice: invoke("ironstone.commons.PaletteServices.get#RecordLink", {
                    docType: "MantleInvoice",
                    id: "BOSS_ACCT_INVOICE"
                }),
                bill: invoke("ironstone.commons.PaletteServices.get#RecordLink", {
                    docType: "MantleInvoice",
                    id: "BOSS_ACCT_BILL"
                }),
                payment: invoke("ironstone.commons.PaletteServices.get#RecordLink", {
                    docType: "MantlePayment",
                    id: "BOSS_ACCT_PAYMENT"
                }),
                journal: invoke("ironstone.commons.PaletteServices.get#RecordLink", {
                    docType: "MantleAcctgTrans",
                    id: "BOSS_ACCT_ENTRY"
                })
            }
        })
    },
    then({palette, invoice, bill, payment, journal}) {
        palette.rows.length > 0
        invoice.url.includes("Accounting/Receivables/InvoiceDetail")
        bill.url.includes("Accounting/Payables/BillDetail")
        payment.url.includes("Accounting/Payments/PaymentDetail")
        journal.url.includes("Accounting/GeneralLedger/JournalEntryDetail")
    }
})
feature("posting-default server choices use installed native enumeration contracts", {
    when() {
        return finance("finance.admin", () => {
            const missing = []
            for (const type of [
                "ItemType",
                "GlAccountType",
                "AcctgTransType",
                "InvoiceType",
                "PaymentType",
                "PaymentInstrument",
                "FinancialAccountTransReason",
                "InventoryVarianceReason",
                "AssetType",
                "AssetClass"
            ]) {
                const result = ec.service
                    .sync()
                    .name("ironstone.accounting.AccessServices.get#Choices")
                    .parameters({
                        organizationPartyId: "BOSS_ACCT_ORG",
                        choice: "enum:" + type
                    })
                    .call()
                if (!result.options.length) missing.push(type)
            }
            return {missing}
        })
    },
    then({missing}) {
        missing == []
    }
})
feature("existing unassigned chart accounts are searchable by code without financial balances", {
    when() {
        return finance("finance.admin", () =>
            ec.service
                .sync()
                .name("ironstone.accounting.AccessServices.get#Choices")
                .parameters({
                    organizationPartyId: "BOSS_ACCT_ORG",
                    choice: "unassignedAccounts",
                    term: "909900001"
                })
                .call()
        )
    },
    then({options}) {
        options.some(row => row.value == "BOSS_ACCOUNTING_EXPENSE")
        !JSON.stringify(options).includes("postedBalance")
    }
})
feature("the shared choices transition preserves account search terms", {
    when() {
        return finance("finance.admin", () => {
            const r = ec.screen.makeTest().rootScreen("component://mr-boss/screen/Accounting.xml").render(
                "GeneralLedger/ChartOfAccounts/choices",
                {
                    organizationPartyId: "BOSS_ACCT_ORG",
                    choice: "unassignedAccounts",
                    term: "909900001"
                },
                "post"
            )
            return {status: r.status, output: r.output}
        })
    },
    then({status, output}) {
        status == 200
        JSON.parse(output).some(row => row.value == "BOSS_ACCOUNTING_EXPENSE")
    }
})

feature("ledger mutation controls follow the GL posting permission", {
    where: [
        {role: "read", shown: false},
        {role: "gl", shown: true}
    ],
    when({role, shown}) {
        return finance("finance." + role, () => {
            const failures = []
            for (const [path, recordId, controls] of [
                ["JournalBatches", null, ["New journal batch"]],
                ["JournalTemplates", null, ["New journal template"]],
                ["JournalEntryDetail", "BOSS_ACCT_ENTRY", ["Review posting", "Add line", "Delete draft"]],
                ["JournalEntryDetail", "BOSS_ACCT_POSTED", ["Reverse entry", "Correct description"]]
            ]) {
                const result = page("GeneralLedger/" + path, {recordId})
                if (result.errorMessages.length) failures.push(path + ": " + result.errorMessages.join("; "))
                for (const text of controls)
                    if (String(result.output).includes(text) !== shown) failures.push(path + " " + (recordId || "") + ": " + text)
            }
            return {failures}
        })
    },
    then({failures}) {
        failures.join("\n") == ""
    }
})

feature("a journal entry the user cannot read shows Not available", {
    when() {
        return finance("finance.gl", () => page("GeneralLedger/JournalEntryDetail", {recordId: "NO_SUCH_ENTRY"}))
    },
    then({status, output, errorMessages}) {
        status == 200
        errorMessages.length == 0
        output.includes("Not available")
        output.includes("Back to journal entries")
    }
})
feature("ledger and approval roles can follow authorized source document links", {
    where: [{role: "gl"}, {role: "approve"}],
    when({role}) {
        return finance("finance." + role, () => {
            const failures = []
            for (const [path, id] of [
                ["Receivables/InvoiceDetail", "BOSS_ACCT_INVOICE"],
                ["Payables/BillDetail", "BOSS_ACCT_BILL"],
                ["Payments/PaymentDetail", "BOSS_ACCT_PAYMENT"]
            ]) {
                const result = ec.screen.makeTest().rootScreen("component://mr-boss/screen/Accounting.xml").render(
                    path,
                    {
                        organizationPartyId: "BOSS_ACCT_ORG",
                        recordId: id
                    },
                    null
                )
                if (result.status !== 200 || result.errorMessages.length) failures.push(path)
            }
            return {failures}
        })
    },
    then({failures}) {
        failures == []
    }
})

feature("the organization picker selects an organization on Home and Settings", {
    where: [{path: "Home"}, {path: "Settings/Settings"}, {path: "Settings/PostingDefaults"}],
    when({path}) {
        return finance("finance.admin", () => {
            const result = ec.screen
                .makeTest()
                .rootScreen("component://mr-boss/screen/Accounting.xml")
                .render(path + "/selectOrganization", {organizationPartyId: "BOSS_ACCT_ORG"}, "post")
            return {
                status: result.status,
                errors: result.errorMessages.join("\n"),
                active: ec.user.getPreference("ACTIVE_ORGANIZATION")
            }
        })
    },
    then({status, errors, active}) {
        errors == ""
        status == 302
        active == "BOSS_ACCT_ORG"
    }
})

feature("deleting a draft returns to the unfiltered journal list", {
    when() {
        return finance("finance.gl", () => {
            const draft = ec.service
                .sync()
                .name("mantle.ledger.JournalServices.store#DraftEntry")
                .parameters({organizationPartyId: "BOSS_ACCT_ORG", description: "Draft to delete"})
                .call()
            const recordId = draft.recordId || draft.acctgTransId
            const lastUpdatedStamp = ec.entity
                .find("mantle.ledger.transaction.AcctgTrans")
                .condition("acctgTransId", recordId)
                .disableAuthz()
                .one().lastUpdatedStamp
            const result = ec.screen
                .makeTest()
                .rootScreen(root)
                .render(
                    "apps/Accounting/GeneralLedger/JournalEntryDetail/delete",
                    {organizationPartyId: "BOSS_ACCT_ORG", recordId, lastUpdatedStamp, changeReason: "Not needed"},
                    "post"
                )
            return {
                recordId,
                errors: result.errorMessages.join("\n"),
                location: String(result.header("Location") || ""),
                remaining: ec.entity
                    .find("mantle.ledger.transaction.AcctgTrans")
                    .condition("acctgTransId", recordId)
                    .disableAuthz()
                    .count()
            }
        })
    },
    then({recordId, errors, location, remaining}) {
        errors == ""
        remaining == 0
        location.includes("GeneralLedger/JournalEntries")
        !location.includes(recordId)
    }
})

feature("choices search names in the query, ignoring case, beyond the first page", {
    when() {
        const any = entity => ec.entity.find(entity).disableAuthz()
        const account = any("mantle.ledger.account.GlAccountAndOrganization")
            .condition("organizationPartyId", "BOSS_ACCT_ORG")
            .condition("accountName", "like", "%Cash%")
            .one()
        const users = Array.from(any("moqui.security.UserAccount").orderBy("userFullName").list())
        const lastUser = users[users.length - 1]
        const journal = any("mantle.ledger.transaction.AcctgTrans")
            .condition("organizationPartyId", "BOSS_ACCT_ORG")
            .condition("description", "is-not-null", null)
            .one()
        const choose = (choice, term) =>
            ec.service
                .sync()
                .name("ironstone.accounting.AccessServices.get#Choices")
                .parameters({organizationPartyId: "BOSS_ACCT_ORG", choice, term})
                .call()
                .options.map(row => row.value)
        return finance("finance.admin", () => ({
            userCount: users.length,
            account: account.glAccountId,
            accounts: choose("accounts", account.accountName.toLowerCase()),
            user: lastUser.userId,
            users: choose("users", String(lastUser.userFullName || lastUser.username).toLowerCase()),
            journal: journal.acctgTransId,
            journals: choose("journals", journal.description.toUpperCase()),
            // a selected value outside the matches is labelled by its own read
            selectedAccount: ec.service
                .sync()
                .name("ironstone.accounting.AccessServices.get#Choices")
                .parameters({
                    organizationPartyId: "BOSS_ACCT_ORG",
                    choice: "accounts",
                    term: "no such account",
                    selected: account.glAccountId
                })
                .call()
                .options.map(row => row.value)
        }))
    },
    then({userCount, account, accounts, user, users, journal, journals, selectedAccount}) {
        selectedAccount.includes(account)
        userCount > 30
        accounts.includes(account)
        users.includes(user)
        journals.includes(journal)
    }
})

feature("an unknown choice is refused", {
    when() {
        return finance("finance.admin", () => {
            try {
                ec.service
                    .sync()
                    .name("ironstone.accounting.AccessServices.get#Choices")
                    .parameters({organizationPartyId: "BOSS_ACCT_ORG", choice: "everything"})
                    .call()
                return {error: ec.message.getErrorsString()}
            } catch (error) {
                return {error: String(error.message)}
            }
        })
    },
    then({error}) {
        error.includes("Unknown accounting choice")
    }
})

feature("report drill-downs keep the report's account filter, and an account keeps none of its own", {
    when() {
        // an account of the demo's posted entry, so the ledger report has lines for it
        const accountId = ec.entity
            .find("mantle.ledger.transaction.AcctgTransEntry")
            .condition("acctgTransId", "BOSS_ACCT_POSTED")
            .disableAuthz()
            .list()[0].glAccountId
        return finance("finance.gl", () => {
            const html = (path, parameters) =>
                ec.screen
                    .makeTest()
                    .rootScreen(root)
                    .renderMode("html")
                    .render("apps/Accounting/" + path, Object.assign({organizationPartyId: "BOSS_ACCT_ORG"}, parameters), null)
            const ledger = html("Reports/GeneralLedger", {glAccountId: accountId})
            const unfiltered = html("GeneralLedger/AccountDetail", {recordId: accountId, reportReturn: "TrialBalance"})
            const filtered = html("GeneralLedger/AccountDetail", {
                recordId: accountId,
                glAccountId: accountId,
                reportReturn: "GeneralLedger"
            })
            const backLink = output => (String(output || "").match(/href="([^"]*Reports\/[A-Za-z]+\?[^"]*)"/) || [])[1] || ""
            return {
                accountId,
                errors: [ledger, unfiltered, filtered].flatMap(result => result.errorMessages).join("\n"),
                drillDown: (String(ledger.output).match(/href="[^"]*AccountDetail\?[^"]*"/) || [""])[0],
                unfilteredBack: backLink(unfiltered.output),
                filteredBack: backLink(filtered.output)
            }
        })
    },
    then({accountId, errors, drillDown, unfilteredBack, filteredBack}) {
        errors == ""
        drillDown.includes("glAccountId=" + accountId)
        unfilteredBack.includes("Reports/TrialBalance")
        !unfilteredBack.includes("glAccountId=")
        filteredBack.includes("glAccountId=" + accountId)
    }
})

feature("an account shows its facts to a reader and its editors to a GL user", {
    where: [
        {role: "read", edit: false},
        {role: "gl", edit: true}
    ],
    when({role}) {
        return finance("finance." + role, () => page("GeneralLedger/AccountDetail", {recordId: "111100000"}))
    },
    then({edit, output, errorMessages}) {
        errorMessages.length == 0
        output.includes("Open account ledger")
        output.includes("Assigned from")
        output.includes("Edit account") == edit
        output.includes("Assignment and dimensions") == edit
    }
})

feature("reviewing a selection shows each entry's state and posts only from the review", {
    when() {
        return finance("finance.gl", () => {
            const review = ec.screen
                .makeTest()
                .rootScreen(root)
                .render(
                    "apps/Accounting/GeneralLedger/JournalEntries/reviewSelection",
                    {organizationPartyId: "BOSS_ACCT_ORG", acctgTransIds: ["BOSS_ACCT_ENTRY"]},
                    "post"
                )
            const previewId = (String(review.header("Location") || "").match(/previewId=([^&]+)/) || [])[1]
            const withReview = previewId ? page("GeneralLedger/JournalEntries", {previewId: decodeURIComponent(previewId)}) : null
            const withoutReview = page("GeneralLedger/JournalBatches")
            return {
                errors: review.errorMessages.concat(withReview?.errorMessages || [], withoutReview.errorMessages).join("\n"),
                previewId,
                reviewed: String(withReview?.output || ""),
                unreviewed: String(withoutReview.output || "")
            }
        })
    },
    then({errors, previewId, reviewed, unreviewed}) {
        errors == ""
        previewId != null
        reviewed.includes("Batch review:")
        reviewed.includes("BOSS_ACCT_ENTRY")
        !unreviewed.includes("Batch review:")
        !unreviewed.includes("Posting reason")
    }
})

feature("documents list and show their counterparty, amount and status by name", {
    where: [
        {role: "ar", list: "Receivables/Invoices", detail: "Receivables/InvoiceDetail", recordId: "BOSS_ACCT_INVOICE"},
        {role: "ap", list: "Payables/Bills", detail: "Payables/BillDetail", recordId: "BOSS_ACCT_BILL"},
        {role: "treasury", list: "Payments/Payments", detail: "Payments/PaymentDetail", recordId: "BOSS_ACCT_PAY_DRAFT"}
    ],
    when({role, list, detail, recordId}) {
        return finance("finance." + role, () => {
            let record = ec.service
                .sync()
                .name("mantle.ledger.AccountingServices.get#Record")
                .parameters({
                    kind: {ar: "invoices", ap: "bills", treasury: "payments"}[role],
                    recordId,
                    organizationPartyId: "BOSS_ACCT_ORG"
                })
                .call().record
            if (role === "treasury") {
                const payment = ec.service
                    .sync()
                    .name("mantle.account.PaymentServices.get#PaymentFinanceDetail")
                    .parameters({organizationPartyId: "BOSS_ACCT_ORG", paymentId: recordId})
                    .call().payment
                record = {
                    statusText: payment.statusDescription,
                    counterpartyName: payment.partyName,
                    description: payment.paymentId
                }
            }
            // list values in the html render; the header's status chip in the qvt render, which has no html twin
            const listPage = page(list)
            const detailPage = page(detail, {recordId}, "qvt")
            return {
                record,
                errors: listPage.errorMessages.concat(detailPage.errorMessages).join("\n"),
                listOutput: String(listPage.output),
                detailOutput: String(detailPage.output)
            }
        })
    },
    then({recordId, record, errors, listOutput, detailOutput}) {
        errors == ""
        record.statusText.length > 0
        record.counterpartyName.length > 0
        listOutput.includes(record.counterpartyName)
        listOutput.includes(record.description || recordId)
        detailOutput.includes(recordId)
        detailOutput.includes(record.statusText)
        !detailOutput.includes("Not available")
        !detailOutput.includes("phase")
    }
})

feature("a new draft document opens its detail", {
    when() {
        return finance("finance.ar", () => {
            const party = ec.entity
                .find("mantle.party.PartyDetail")
                .condition("partyTypeEnumId", "PtyOrganization")
                .condition("partyId", "not-equals", "BOSS_ACCT_ORG")
                .disableAuthz()
                .list()[0]
            const result = ec.screen.makeTest().rootScreen(root).render(
                "apps/Accounting/QuickCreate/NewInvoice/createDraft",
                {
                    kind: "invoices",
                    organizationPartyId: "BOSS_ACCT_ORG",
                    otherPartyId: party.partyId,
                    description: "Spec draft invoice"
                },
                "post"
            )
            return {errors: result.errorMessages.join("\n"), location: String(result.header("Location") || "")}
        })
    },
    then({errors, location}) {
        errors == ""
        location.includes("Receivables/InvoiceDetail")
        location.includes("recordId=")
    }
})

feature("Home shows the counts the user may read as links, and shortcuts to what the user may create", {
    where: [
        {role: "gl", counts: true, shortcuts: ["New journal entry", "Trial balance"], absent: ["New invoice"]},
        {role: "ar", counts: false, shortcuts: ["New invoice"], absent: ["New journal entry", "Draft entries"]}
    ],
    when({role}) {
        return finance("finance." + role, () => page("Home", {}, "qvt"))
    },
    then({counts, shortcuts, absent, output, errorMessages}) {
        errorMessages.length == 0
        output.includes("Draft entries") == counts
        shortcuts.every(text => output.includes(text))
        absent.every(text => !output.includes(text))
        !output.includes("phase")
    }
})

feature("every Accounting choice answers, with a selected value outside its page", {
    when() {
        const used = [
            "accounts",
            "accountParents",
            "unassignedAccounts",
            "drafts",
            "journals",
            "batches",
            "templates",
            "locks",
            "periods",
            "products",
            "categories",
            "assets",
            "financialTypes",
            "roles",
            "accountCategories",
            "accountGroups",
            "facilities",
            "costCenters",
            "terms",
            "timeUnits",
            "currencies",
            "users",
            "groups",
            "organizations",
            "allOrganizations",
            "parties",
            "enum:GlAccountClass",
            "enum:GlAccountType",
            "enum:InvoiceType",
            "enum:ItemType",
            "enum:AcctgTransType",
            "enum:PaymentType",
            "enum:PaymentInstrument",
            "enum:InvoiceSequence",
            "enum:AssetType",
            "enum:AssetClass",
            "enum:FinancialAccountTransReason",
            "enum:InventoryVarianceReason"
        ]
        return finance("finance.admin", () => {
            const failures = []
            for (const choice of used) {
                ec.message.pushErrors()
                try {
                    ec.service
                        .sync()
                        .name("ironstone.accounting.AccessServices.get#Choices")
                        .parameters({organizationPartyId: "BOSS_ACCT_ORG", choice, selected: "NO_SUCH_VALUE"})
                        .requireNewTransaction(true)
                        .call()
                    if (ec.message.hasError()) failures.push(choice + ": " + ec.message.getErrorsString())
                } catch (error) {
                    failures.push(choice + ": " + error.message)
                } finally {
                    ec.message.clearErrors()
                    ec.message.popErrors()
                }
            }
            return {failures}
        })
    },
    then({failures}) {
        failures.join("\n") == ""
    }
})

feature("every settings screen renders for a finance admin with its organization's values", {
    where: [
        {path: "Settings/Settings", texts: ["Accounting settings"]},
        {path: "Settings/AccountingPreferences", texts: ["Save preferences", "Fiscal year starts in", "Preview the copy"]},
        {path: "Settings/PostingDefaults", texts: ["Add mapping", "Mappings of"]},
        {
            path: "Settings/PostingDefaults",
            parameters: {mappingKind: "asset"},
            texts: ["Asset type", "Work in process account"],
            absent: ["Item type"]
        },
        {
            path: "Settings/PostingDefaults",
            parameters: {mappingKind: "item"},
            texts: ["Item type", "Direction"],
            absent: ["Work in process account"]
        },
        {path: "Settings/PaymentTerms", texts: ["New due term"]},
        {path: "Settings/Currencies", texts: ["Add exchange rate", "Import rates", "Currency units"]},
        {path: "Settings/PaymentMethods", texts: ["New payment method"]},
        {path: "Settings/DocumentSettings", texts: ["Save document settings", "Invoice preview"]}
    ],
    when({path, parameters, texts, absent}) {
        const {output, errorMessages} = finance("finance.admin", () => page(path, parameters || {}))
        return {
            errors: errorMessages.join("\n"),
            missing: texts.filter(text => !output.includes(text)).join(", "),
            unexpected: (absent || []).filter(text => output.includes(text)).join(", "),
            organizationShown: !output.includes("Choose an organization to")
        }
    },
    then({errors, missing, unexpected, organizationShown}) {
        errors == ""
        missing == ""
        unexpected == ""
        organizationShown
    }
})

feature("an unpaginated list with rows does not say it has no results", {
    when() {
        return finance("finance.gl", () => page("GeneralLedger/JournalEntryDetail", {recordId: "BOSS_ACCT_POSTED"}, "qvt"))
    },
    then({output, errorMessages}) {
        errorMessages.length == 0
        output.includes("Posted office expense")
        !output.includes("No results found")
    }
})
