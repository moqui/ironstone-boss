// Every Accounting route renders real fixtures, including shared mounts and reviewed statement snapshots.
const root = "component://mr-boss/screen/Accounting.xml"
const helper = ec.resource.script("component://mr-boss/test/AccountingSpecLib.js")

spec({
    setup() {
        login("john.doe")
        ec.artifactExecution.disableAuthz()
    }
})
feature("all implemented Accounting screens render their fixture content in qvt and tui", {
    when() {
        const files = [],
            failures = []
        const fixtures = helper.routeFixtures()
        ec.resource.getLocationReference(root).walkChildTree(files, null)
        const paths = new Set(
            files
                .filter(file => file.location.endsWith(".xml") && file.path !== "Accounting")
                .map(file => file.path.substring("Accounting/".length))
        )
        // Shared Customer360 is mounted by screen location, so a filesystem walk alone misses it and its tabs.
        for (const path of Object.keys(fixtures)) paths.add(path)
        for (const path of paths) {
            const fixture = fixtures[path]
            for (const mode of ["qvt", "tui"]) {
                const renderer = ec.screen.makeTest().rootScreen(root).renderMode(mode)
                if (mode === "qvt") renderer.withStaticData()
                const rendered = renderer.render(
                    path,
                    Object.assign(
                        {organizationPartyId: helper.ids.organizationPartyId, lastStandalone: "-2"},
                        fixture?.parameters || {}
                    ),
                    null
                )
                const output = String(rendered.output || "")
                if (
                    rendered.status !== 200 ||
                    rendered.errorMessages.length ||
                    /Error rendering|Exception in render/.test(output)
                )
                    failures.push(path + " " + mode + ": " + rendered.status + " " + rendered.errorMessages.join(" | "))
                if (fixture && !output.includes(fixture.text))
                    failures.push(path + " " + mode + ": no " + JSON.stringify(fixture.text))
                if (fixture && /(?:Invoice|Customer|Payment) (?:not available|is unavailable)/.test(output))
                    failures.push(path + " " + mode + ": fixture record is unavailable")
                if (mode === "tui") {
                    try {
                        JSON.parse(output)
                    } catch (error) {
                        failures.push(path + " invalid TUI JSON: " + output.slice(0, 100))
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

feature("issued payment documents render their actual frozen receipt in html and print", {
    when() {
        const failures = []
        for (const mode of ["html", "html-print"]) {
            const result = helper.page(
                "Payments/PaymentPrint",
                {
                    paymentId: helper.ids.paymentDeliveredId,
                    outputType: "receipt"
                },
                mode
            )
            if (
                result.status !== 200 ||
                result.errors.length ||
                !result.output.includes(helper.ids.paymentDeliveredId) ||
                result.output.includes("This payment document is not available")
            )
                failures.push(mode + ": issued receipt missing or render failed")
        }
        return {failures}
    },
    then({failures}) {
        failures == []
    }
})

feature("invoice and reviewed statement print outputs contain the actual finalized document", {
    when() {
        const fixtures = helper.routeFixtures()
        const failures = []
        for (const path of ["Receivables/InvoicePrint", "Receivables/StatementPrint"]) {
            for (const mode of ["html", "html-print"]) {
                const rendered = helper.page(path, fixtures[path].parameters, mode)
                if (rendered.status !== 200 || rendered.errors.length || !rendered.output.includes(helper.ids.finalizedInvoiceId))
                    failures.push(path + " " + mode + ": finalized invoice missing or render failed")
                if (
                    rendered.output.includes("Preview a statement before printing") ||
                    rendered.output.includes("Invoice not available")
                )
                    failures.push(path + " " + mode + ": empty or unavailable print")
            }
        }
        return {failures}
    },
    then({failures}) {
        failures == []
    }
})
