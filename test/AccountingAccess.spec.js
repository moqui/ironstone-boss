const native = (service, p = {}) =>
    ec.service
        .sync()
        .name("mantle.ledger." + service)
        .parameters(p)
        .call() || {}
function asFinance(user, enabled, run) {
    login(user)
    const disabled = ec.artifactExecution.authzDisabled()
    if (enabled) ec.artifactExecution.enableAuthz()
    else ec.artifactExecution.disableAuthz()
    try {
        return run()
    } finally {
        ec.message.clearErrors()
        if (disabled) ec.artifactExecution.disableAuthz()
        else ec.artifactExecution.enableAuthz()
        login("john.doe")
    }
}
function denied(service, p) {
    ec.message.pushErrors()
    try {
        const out = ec.service
            .sync()
            .name(service)
            .parameters(p)
            .disableAuthz()
            .requireNewTransaction(true)
            .call()
        return ec.message.hasError()
    } catch (error) {
        return true
    } finally {
        ec.message.clearErrors()
        ec.message.popErrors()
    }
}
feature(
    "Accounting reader sees own organization documents with authz enabled or disabled",
    {
        where: [{ enabled: true }, { enabled: false }],
        when({ enabled }) {
            return asFinance("finance.read", enabled, () => ({
                access: native("AccountingServices.get#Access"),
                own: native("AccountingServices.get#Record", {
                    kind: "invoices",
                    recordId: "BOSS_ACCT_INVOICE",
                }),
                other: denied("mantle.ledger.AccountingServices.get#Record", {
                    kind: "accounts",
                    recordId: "110000",
                    organizationPartyId: "ORG_ZIZI_SERVICES",
                }),
                settings: denied(
                    "mantle.ledger.SetupServices.get#Preferences",
                    { organizationPartyId: "ORG_ZIZI_CORP" },
                ),
                create: denied(
                    "mantle.ledger.JournalServices.store#DraftEntry",
                    { organizationPartyId: "ORG_ZIZI_CORP" },
                ),
            }))
        },
        then({ access, own, other, settings, create }) {
            access.capabilities.reportRead == true
            access.capabilities.glPost == false
            own.record.invoiceId == "BOSS_ACCT_INVOICE"
            other == true
            settings == true
            create == true
        },
    },
)
feature(
    "a reader has only the Accounting business launcher and no finance quick create",
    {
        when() {
            return asFinance("finance.read", true, () => {
                const rendered = ec.screen
                    .makeTest()
                    .rootScreen("component://webroot/screen/webroot.xml")
                    .render("shellData", {}, null)
                return {
                    status: rendered.status,
                    data: JSON.parse(rendered.output),
                }
            })
        },
        then({ status, data }) {
            status == 200
            data.apps.some((app) => app.name === "Accounting")
            !data.apps.some((app) =>
                ["Products", "Projects", "Warehouse", "Purchasing"].includes(
                    app.name,
                ),
            )
            data.apps.find((app) => app.name === "Accounting").providers
                .quickCreate.length == 0
        },
    },
)
feature(
    "the GL operator cannot change preferences, rates or terms even with artifact authz disabled",
    {
        when() {
            return asFinance("finance.gl", false, () => ({
                preferences: denied(
                    "mantle.ledger.SetupServices.store#Preferences",
                    {
                        organizationPartyId: "ORG_ZIZI_CORP",
                        settings: { invoiceIdPrefix: "BAD" },
                        changeReason: "Denied",
                    },
                ),
                rates: denied("mantle.ledger.CurrencyServices.store#Rate", {
                    organizationPartyId: "ORG_ZIZI_CORP",
                    uomId: "USD",
                    toUomId: "EUR",
                    conversionFactor: 1,
                    fromDate: ec.user.nowTimestamp,
                    rateSource: "test",
                    changeReason: "Denied",
                }),
                terms: denied(
                    "mantle.ledger.SetupServices.store#SettlementTerm",
                    {
                        organizationPartyId: "ORG_ZIZI_CORP",
                        description: "Denied",
                        termValue: 30,
                        termValueUomId: "TF_day",
                        changeReason: "Denied",
                    },
                ),
            }))
        },
        then({ preferences, rates, terms }) {
            preferences == true
            rates == true
            terms == true
        },
    },
)
feature(
    "Accounting root grants do not authorize Mantle REST financial mutators",
    {
        when() {
            return asFinance("finance.gl", true, () => {
                const failures = []
                for (const path of [
                    "s1/mantle/gl/trans",
                    "s1/mantle/invoices",
                    "s1/mantle/payments",
                ]) {
                    const rendered = ec.screen
                        .makeTest()
                        .rootScreen(
                            "component://webroot/screen/webroot/rest.xml",
                        )
                        .render(
                            path,
                            { organizationPartyId: "ORG_ZIZI_CORP" },
                            "post",
                        )
                    if (![401, 403].includes(rendered.status))
                        failures.push(path + ": " + rendered.status)
                    ec.message.clearErrors()
                }
                return { failures }
            })
        },
        then({ failures }) {
            failures == []
        },
    },
)
