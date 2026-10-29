const C = "ironstone.products.CatalogServices.",
    S = "ironstone.products.CheckServices."
function as(user, fn) {
    login(user)
    const disabled = ec.artifactExecution.disableAuthz()
    try {
        return fn()
    } finally {
        ec.message.clearErrors()
        login("john.doe")
    }
}
function invoke(n, p) {
    try {
        const out = call(n, p) || {},
            error = ec.message.getErrorsString()
        ec.message.clearErrors()
        return Object.assign({}, out, {error})
    } catch (e) {
        ec.message.clearErrors()
        return {error: String(e.message || e)}
    }
}
spec({
    cleanup() {
        ec.message.clearErrors()
        ec.artifactExecution.enableAuthz()
    }
})
feature("catalog checks at #path render in #mode with guarded readiness evidence", {
    where: ["CatalogChecks", "Settings/CatalogChecks"].flatMap(path => ["qvt", "html", "tui"].map(mode => ({path, mode}))),
    expect({path, mode}) {
        const r = as("catalog.admin", () =>
            ec.screen
                .makeTest()
                .rootScreen("component://mr-boss/screen/Products.xml")
                .renderMode(mode)
                .withStaticData()
                .render(
                    path,
                    {
                        runChecks: true,
                        productIds: "BOSS_CHK_EMPTY,BOSS_CHK_DUP_A,BOSS_PRD_PACK",
                        checkIds: "requiredFields,identifiers,legacyPacks"
                    },
                    null
                )
        )
        if (r.errorMessages.length) log.warn(r.errorMessages.join(" | "))
        r.status == 200
        r.errorMessages.length == 0
        !/Error rendering|Exception in render/.test(r.output)
    }
})
feature("Home incomplete counts and report retries use the same native checks without exposing prices to readers", {
    when() {
        return as("catalog.reader", () => ({
            home: call(C + "get#CatalogSummary", {}),
            report: call(S + "get#CheckContext", {
                runChecks: true,
                productIds: "BOSS_CHK_EMPTY,BOSS_CHK_DUP_A,BOSS_PRD_PACK,BOSS_PRD_OTHER",
                checkIds: "requiredFields,identifiers,legacyPacks"
            }),
            denied: invoke("mantle.product.CatalogCheckServices.validate#Catalog", {
                productIds: ["BOSS_PRD_OWN"],
                checkIds: ["estimates", "prices"]
            })
        }))
    },
    then({home, report, denied}) {
        home.summary.incomplete >= 1
        home.summary.missingPrice == null
        report.issueRows.some(r => r.checkId === "requiredFields")
        report.issueRows.some(r => r.checkId === "identifiers")
        report.issueRows.some(r => r.checkId === "legacyPacks")
        report.issueRows.some(r => r.productId === "BOSS_PRD_OTHER" && r.checkId === "record")
        !JSON.stringify(report).includes("Retail catalog sample")
        denied.error.includes("authority")
    }
})
feature("activation uses native readiness checks and refuses a duplicate identifier without changing status", {
    when() {
        return as("catalog.catalog.edit", () => ({
            report: call("mantle.product.CatalogCheckServices.validate#Catalog", {
                productIds: ["BOSS_CHK_DUP_A"],
                checkIds: ["identifiers"]
            }),
            attempt: invoke(C + "transition#ProductStatus", {productId: "BOSS_CHK_DUP_A", statusId: "PrdActive"}),
            after: call(C + "get#ProductDetail", {productId: "BOSS_CHK_DUP_A"})
        }))
    },
    then({report, attempt, after}) {
        report.valid == false
        attempt.error.includes("already assigned")
        after.detail.product.statusId == "PrdDraft"
    }
})
