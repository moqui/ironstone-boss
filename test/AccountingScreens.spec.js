// Every Accounting screen renders in the browser and terminal using actual demo records.
const root = "component://mr-boss/screen/Accounting.xml"
const parameters = path =>
    Object.assign(
        {organizationPartyId: "ORG_ZIZI_CORP", lastStandalone: "-2"},
        {
            "Receivables/InvoiceDetail": {recordId: "BOSS_ACCT_INVOICE"},
            "Payables/BillDetail": {recordId: "BOSS_ACCT_BILL"},
            "Payments/PaymentDetail": {recordId: "BOSS_ACCT_PAYMENT"},
            "GeneralLedger/JournalEntryDetail": {recordId: "BOSS_ACCT_ENTRY"}
        }[path] || {}
    )
spec({
    setup() {
        login("john.doe")
        ec.artifactExecution.disableAuthz()
    }
})
feature("all implemented Accounting screens render in qvt and tui", {
    when() {
        const files = [],
            failures = []
        ec.resource.getLocationReference(root).walkChildTree(files, null)
        const account = ec.entity
            .find("mantle.ledger.account.GlAccountAndOrganization")
            .condition("organizationPartyId", "ORG_ZIZI_CORP")
            .one()
        for (const file of files) {
            if (!file.location.endsWith(".xml") || file.path === "Accounting") continue
            const path = file.path.substring("Accounting/".length)
            for (const mode of ["qvt", "tui"]) {
                const p = parameters(path)
                if (path === "GeneralLedger/AccountDetail") p.recordId = account.glAccountId
                const rendered = ec.screen.makeTest().rootScreen(root).renderMode(mode).render(path, p, null)
                // a widget that fails renders its error into the output, not into errorMessages
                if (
                    rendered.status !== 200 ||
                    rendered.errorMessages.length ||
                    /Error rendering|Exception in render/.test(String(rendered.output))
                )
                    failures.push(path + " " + mode + ": " + rendered.status + " " + rendered.errorMessages.join(" | "))
                if (mode === "tui") {
                    try {
                        JSON.parse(rendered.output)
                    } catch (error) {
                        failures.push(path + " invalid TUI JSON: " + String(rendered.output).slice(0, 100))
                    }
                }
                ec.message.clearErrors()
            }
        }
        return {failures}
    },
    then({failures}) {
        failures == []
    }
})
