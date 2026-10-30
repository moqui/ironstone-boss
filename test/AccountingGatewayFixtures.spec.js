// Post-load gateway states use the real native services; the safe provider and all methods are committed demo data.
const gatewayHelper = ec.resource.script("component://mr-mantle/test/AccountingPaymentGatewayFixtures.js")
const gatewayApp = ec.resource.script("component://mr-boss/test/AccountingSpecLib.js")
const gatewayOrg = gatewayApp.ids.organizationPartyId,
    gatewayId = "BOSS_ACCT_GW_TEST"
const gatewayIds = ["DRAFT", "AUTHORIZED", "PARTIAL", "PENDING", "UNCERTAIN", "RECOVER"].map(suffix => "BOSS_ACCT_GW_" + suffix)
const gatewayFailures = []
function attempt(paymentId, action) {
    return gatewayHelper.lib
        .find("mantle.account.payment.PaymentGatewayAttempt", {
            organizationPartyId: gatewayOrg,
            paymentId,
            action
        })
        .orderBy("-createdDate,attemptId")
        .limit(1)
        .one()
}
function executeAction(paymentId, action, amount = null) {
    const old = attempt(paymentId, action)
    if (old) return gatewayHelper.native("get#PaymentGatewayAttempt", {organizationPartyId: gatewayOrg, attemptId: old.attemptId})
    const detail = gatewayHelper.native("get#PaymentFinanceDetail", {organizationPartyId: gatewayOrg, paymentId}),
        review = gatewayHelper.native("preview#PaymentGatewayAction", {
            organizationPartyId: gatewayOrg,
            paymentId,
            sourceVersion: detail.sourceVersion,
            action,
            amount,
            effectiveDate: detail.payment.effectiveDateValue,
            reason: "Demonstration provider operation",
            referenceNumber: paymentId
        })
    return gatewayHelper.execute(review, "boss-gw-" + gatewayHelper.lib.hash({paymentId, action}).slice(0, 30))
}
function prepareFinancialState(suffix) {
    const paymentId = "BOSS_ACCT_GW_" + suffix,
        control = gatewayHelper.lib.one("mantle.account.payment.PaymentGatewayTestControl", {paymentGatewayConfigId: gatewayId}),
        saved = gatewayHelper.lib.map(control)
    try {
        gatewayHelper.call("update#mantle.account.payment.PaymentGatewayTestControl", {
            paymentGatewayConfigId: gatewayId,
            outcomesJson: JSON.stringify({
                authorize: "accepted",
                capture: suffix === "PENDING" ? "pending" : suffix === "UNCERTAIN" ? "accepted-timeout" : "accepted"
            })
        })
        executeAction(paymentId, "authorize")
        if (["PARTIAL", "PENDING", "UNCERTAIN"].includes(suffix)) executeAction(paymentId, "capture", "20")
        if (suffix === "RECOVER" && !attempt(paymentId, "capture")) {
            const detail = gatewayHelper.native("get#PaymentFinanceDetail", {organizationPartyId: gatewayOrg, paymentId})
            gatewayHelper.acceptedUnposted({
                organizationPartyId: gatewayOrg,
                paymentId,
                paymentGatewayConfigId: gatewayId,
                effectiveDate: detail.payment.effectiveDateValue,
                amount: "20",
                username: "finance.treasury",
                policyUsername: "john.doe",
                operationKey: "boss-gw-recover-" + gatewayHelper.lib.hash(paymentId).slice(0, 20)
            })
        }
    } finally {
        gatewayHelper.call("update#mantle.account.payment.PaymentGatewayTestControl", {
            paymentGatewayConfigId: gatewayId,
            outcomesJson: saved.outcomesJson || "{}"
        })
    }
}
spec({
    setupSpec() {
        login("finance.treasury")
        ec.artifactExecution.disableAuthz()
        assert(ec.factory.waitWorkerPoolEmpty(50), "Committed gateway demonstration setup must finish")
        for (const suffix of ["AUTHORIZED", "PARTIAL", "PENDING", "UNCERTAIN", "RECOVER"]) {
            ec.message.pushErrors()
            try {
                prepareFinancialState(suffix)
            } catch (error) {
                ec.logger.error("Gateway fixture " + suffix + ": " + error.message)
                gatewayFailures.push({paymentId: "BOSS_ACCT_GW_" + suffix, error: error.message})
            } finally {
                ec.message.clearErrors()
                ec.message.popErrors()
            }
        }
        gatewayHelper.call("update#mantle.account.payment.PaymentGatewayTestControl", {
            paymentGatewayConfigId: gatewayId,
            lookupOutcomesJson: JSON.stringify({capture: "accepted"})
        })
    },
    setup() {
        login("john.doe")
        ec.artifactExecution.disableAuthz()
    }
})

feature("committed gateway drafts and independent financial fixture results remain real native records", {
    when() {
        const rows = gatewayIds.map(paymentId =>
                gatewayHelper.native("get#PaymentFinanceDetail", {organizationPartyId: gatewayOrg, paymentId})
            ),
            authorized = attempt("BOSS_ACCT_GW_AUTHORIZED", "authorize"),
            partial = attempt("BOSS_ACCT_GW_PARTIAL", "capture"),
            pending = attempt("BOSS_ACCT_GW_PENDING", "capture"),
            uncertain = attempt("BOSS_ACCT_GW_UNCERTAIN", "capture"),
            recovery = attempt("BOSS_ACCT_GW_RECOVER", "capture")
        return {rows, failures: gatewayFailures, authorized, partial, pending, uncertain, recovery}
    },
    then({rows, failures, authorized, partial, pending, uncertain, recovery}) {
        failures.length == 0
        rows.length == 6
        rows.every(row => row.payment.lifecycleManaged === "Y")
        rows[0].capabilities.canGatewayAuthorize == true
        authorized.financialState == "completed"
        partial.financialState == "completed"
        partial.cashPaymentId != null
        pending.providerState == "pending"
        pending.financialState != "completed"
        uncertain.providerState == "uncertain"
        uncertain.financialState != "completed"
        recovery.providerState == "accepted"
        recovery.financialState == "accepted_unposted"
    }
})

feature("real gateway states and retained reviews render through the Accounting mount without exposing Treasury controls to AR", {
    when() {
        const failures = [],
            rendered = [],
            retained = gatewayApp.asUser("finance.treasury", () => {
                const paymentId = "BOSS_ACCT_GW_AUTHORIZED",
                    detail = gatewayHelper.native("get#PaymentFinanceDetail", {organizationPartyId: gatewayOrg, paymentId})
                return gatewayHelper.native("preview#PaymentGatewayAction", {
                    organizationPartyId: gatewayOrg,
                    paymentId,
                    sourceVersion: detail.sourceVersion,
                    action: "capture",
                    amount: "20",
                    effectiveDate: detail.payment.effectiveDateValue,
                    reason: "Render the reviewed capture"
                })
            }),
            recovery = gatewayApp.asUser("finance.treasury", () => {
                const row = gatewayHelper.native("get#PaymentGatewayAttempt", {
                    organizationPartyId: gatewayOrg,
                    attemptId: attempt("BOSS_ACCT_GW_RECOVER", "capture").attemptId
                })
                return gatewayHelper.native("preview#PaymentGatewayRecovery", {
                    organizationPartyId: gatewayOrg,
                    attemptId: row.attemptId,
                    attemptVersion: row.attemptVersion,
                    reason: "Render financial recovery"
                })
            })
        const pages = [
            ...gatewayIds.map(paymentId => ({path: "Payments/PaymentDetail", parameters: {paymentId}, text: paymentId})),
            {
                path: "Payments/PaymentDetail/Gateway",
                parameters: {paymentId: retained.paymentId, previewId: retained.previewId, previewKind: "gatewayAction"},
                text: "Reviewed action amount"
            },
            {
                path: "Payments/PaymentDetail/Gateway",
                parameters: {paymentId: recovery.paymentId, previewId: recovery.previewId, previewKind: "gatewayRecovery"},
                text: "Reviewed cash posting"
            },
            {
                path: "Payments/GatewayTransactions",
                parameters: {attemptId: attempt("BOSS_ACCT_GW_PENDING", "capture").attemptId},
                text: "Check provider status"
            },
            {
                path: "Payments/GatewayTransactions",
                parameters: {attemptId: attempt("BOSS_ACCT_GW_RECOVER", "capture").attemptId},
                text: "Review cash posting"
            }
        ]
        for (const mode of ["qvt", "tui", "html"])
            for (const page of pages) {
                const result = gatewayApp.asUser("finance.treasury", () => gatewayApp.page(page.path, page.parameters, mode))
                if (result.status !== 200 || result.errors.length || !result.output.includes(page.text))
                    failures.push(
                        mode +
                            " " +
                            page.path +
                            " " +
                            JSON.stringify(page.parameters) +
                            ": " +
                            result.errors.join(" | ") +
                            " missing " +
                            page.text
                    )
                if (mode === "tui") {
                    try {
                        JSON.parse(result.output)
                    } catch (error) {
                        failures.push("Invalid gateway TUI: " + error.message)
                    }
                }
                if (
                    page.parameters.previewId &&
                    (mode === "tui"
                        ? /"name"\s*:\s*"PaymentStateEffects"/.test(result.output)
                        : /\bid="PaymentStateEffects[^"]*_table"/.test(result.output))
                )
                    failures.push(mode + " retained gateway review shows an empty generic state-effects table")
                rendered.push({mode, path: page.path, output: result.output})
            }
        const treasury = gatewayApp.asUser("finance.treasury", () =>
                gatewayApp.page("Payments/PaymentDetail", {paymentId: "BOSS_ACCT_GW_AUTHORIZED"})
            ),
            ar = gatewayApp.asUser("finance.ar", () =>
                gatewayApp.page("Payments/PaymentDetail", {paymentId: "BOSS_ACCT_GW_AUTHORIZED"})
            ),
            arInvestigation = gatewayApp.asUser("finance.ar", () => gatewayApp.page("Payments/GatewayTransactions"))
        return {failures, treasury, ar, arInvestigation, count: rendered.length}
    },
    then({failures, treasury, ar, arInvestigation, count}) {
        failures == []
        count == 30
        treasury.output.includes("Capture payment")
        !ar.output.includes("Capture payment")
        !ar.output.includes("Release authorization")
        ar.output.includes("BOSS_ACCT_GW_AUTHORIZED")
        arInvestigation.output.includes("Treasury access is required")
    }
})

feature("gateway choices resolve selected binding and provider labels outside a filtered page", {
    when() {
        return gatewayApp.asUser("finance.treasury", () => {
            const parameters = {organizationPartyId: gatewayOrg, paymentId: "BOSS_ACCT_GW_DRAFT", action: "authorize"},
                binding = gatewayHelper
                    .native("find#PaymentGatewayBindings", parameters)
                    .rows.find(row => row.paymentGatewayConfigId === gatewayId),
                token = gatewayId + "~" + binding.bindingVersion,
                service = "ironstone.accounting.AccessServices.get#Choices",
                common = {...parameters, term: "no-gateway-description-matches-this-search"}
            return {
                token,
                bindings: gatewayApp.call(service, {...common, choice: "reviewedPaymentGatewayBindings", selected: token}),
                providers: gatewayApp.call(service, {...common, choice: "paymentGatewayProviders", selected: gatewayId})
            }
        })
    },
    then({token, bindings, providers}) {
        bindings.options.some(row => row.value === token && row.label.includes("Demonstration"))
        providers.options.some(row => row.value === gatewayId && row.label.includes("Demonstration"))
        !JSON.stringify({bindings, providers}).includes("invoke#ReviewedOperation")
        !JSON.stringify({bindings, providers}).includes("native-fixture/")
    }
})
