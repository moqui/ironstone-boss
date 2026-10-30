const helper = ec.resource.script("component://mr-boss/test/AccountingSpecLib.js")
const screen = () => ec.resource.script("component://mr-boss/service/ironstone/accounting/Payments.js")
const native = "mantle.account.PaymentServices."
const organizationPartyId = helper.ids.organizationPartyId
const paymentId = "BOSS_ACCT_PAY_DRAFT"
const contextService = "ironstone.accounting.PaymentScreenServices.get#PaymentContext"
const request = {organizationPartyId, paymentId}
function rejected(action) {
    try {
        action()
        return ""
    } catch (error) {
        return String(error.message)
    }
}

feature("payment draft decoding retains reviewed method revisions and excludes derived financial fields", {
    when() {
        return screen().draftInput({
            organizationPartyId,
            cashDirection: "incoming",
            partyId: "customer",
            amount: "12.50",
            currencyUomId: "USD",
            effectiveDate: "2026-10-30",
            paymentInstrumentEnumId: "PiCash",
            organizationMethodToken: "cash~reviewed-cash",
            counterpartyMethodToken: "customer-method~reviewed-customer",
            operationKey: "payment-intent",
            statusId: "PmntDelivered",
            fromPartyId: "forged",
            toPartyId: "forged",
            financeDirection: "payable",
            accountingDate: "1900-01-01",
            glAccountId: "forged",
            forInvoiceId: "forged"
        })
    },
    then(input) {
        input.organizationPaymentMethodId == "cash"
        input.organizationMethodVersion == "reviewed-cash"
        input.counterpartyPaymentMethodId == "customer-method"
        input.counterpartyMethodVersion == "reviewed-customer"
        input.amount == "12.50"
        input.effectiveDate == "2026-10-30"
        !["statusId", "fromPartyId", "toPartyId", "financeDirection", "accountingDate", "glAccountId", "forInvoiceId"].some(
            key => key in input
        )
    }
})

feature("payment evidence keeps originally selected versions and rejects conflicting or unreviewed tokens", {
    when() {
        const module = screen()
        return {
            input: module.stateInput({
                organizationPartyId,
                paymentId,
                sourceVersion: "reviewed-source",
                action: "deliver",
                referenceNumber: "Bank confirmation 42",
                reason: "Receipt matched",
                evidenceTokenList: ["file-one~version-one", "file-two~version-two"]
            }),
            invalid: rejected(() => module.reviewedSelection(["file-one"])),
            conflicting: rejected(() => module.reviewedSelection(["file-one~old", "file-one~new"]))
        }
    },
    then({input, invalid, conflicting}) {
        input.evidenceContentIdList == ["file-one", "file-two"]
        input.evidenceVersions == {"file-one": "version-one", "file-two": "version-two"}
        input.sourceVersion == "reviewed-source"
        !!invalid
        conflicting.includes("different reviewed revisions")
    }
})

feature("application correction and return filters retain reviewed intent without accepting financial overrides", {
    when() {
        const module = screen()
        return {
            input: module.unapplyInput({
                organizationPartyId,
                paymentId,
                sourceVersion: "payment-reviewed",
                applicationTokenList: ["application-one~ap-reviewed"],
                reason: "Correct duplicated allocation",
                amount: "999",
                effectiveDate: "1900-01-01"
            }),
            filters: module.findParameters(
                JSON.stringify({
                    queue: "unapplied",
                    partyId: "customer",
                    currencyUomId: "USD",
                    text: "receipt",
                    pageIndex: 2,
                    organizationPartyId: "foreign",
                    paymentId: "other",
                    sourceVersion: "forged"
                })
            )
        }
    },
    then({input, filters}) {
        input.paymentApplicationIdList == ["application-one"]
        input.applicationVersions == {"application-one": "ap-reviewed"}
        input.sourceVersion == "payment-reviewed"
        !("amount" in input)
        !("effectiveDate" in input)
        filters == {queue: "unapplied", partyId: "customer", currencyUomId: "USD", text: "receipt", pageIndex: 2}
    }
})

feature("retained payment review confirmation has a stable preview-bound retry key and preserves native results", {
    when() {
        return helper.asUser("finance.treasury", () => {
            const module = screen(),
                dto = {
                    paymentId: "payment",
                    previewId: "payment-preview",
                    inputFingerprint: "fingerprint",
                    action: "deliver",
                    before: {statusId: "PmntPromised"},
                    after: {statusId: "PmntDelivered"},
                    canApply: true,
                    paymentSummary: {
                        paymentId: "payment",
                        amount: "12.50",
                        currencyUomId: "USD",
                        accountingDateText: "2026-10-30",
                        partyName: "Reviewed customer",
                        maskedMethodLabel: "Cash"
                    },
                    evidenceRows: [{fileName: "Receipt.txt", version: "reviewed"}],
                    ledgerPreview: [{amountUomId: "USD", lines: [{glAccountId: "cash", debitCreditFlag: "D", amount: "12.50"}]}]
                }
            const first = module.reviewPresentation(dto),
                second = module.reviewPresentation(dto),
                changed = module.reviewPresentation(Object.assign({}, dto, {previewId: "another-preview"})),
                completed = module.reviewPresentation(
                    Object.assign({}, dto, {
                        canApply: false,
                        operationKey: first.operationKey,
                        results: {paymentId: "payment", paymentLifecycleEventId: "event", reasonCode: "APPLIED"}
                    })
                )
            return {
                first,
                second,
                changed,
                completed,
                unavailable: module.reviewPresentation(Object.assign({}, dto, {paymentSummary: null}))
            }
        })
    },
    then({first, second, changed, completed, unavailable}) {
        first.operationKey == second.operationKey
        first.operationKey.length <= 40
        first.operationKey != changed.operationKey
        first.confirmParameters.inputFingerprint == "fingerprint"
        first.evidenceRows[0].version == "reviewed"
        first.ledgerPreview[0].currencyUomId == "USD"
        first.canConfirm == true
        first.paymentSummary.amount == "12.50"
        unavailable.canConfirm == false
        unavailable.summaryUnavailable == true
        completed.canConfirm == false
        completed.confirmParameters.operationKey == first.operationKey
        completed.results.paymentLifecycleEventId == "event"
    }
})

feature("treasury and receivable readers receive the same allowed payment identity with different controls", {
    when() {
        return {
            treasury: helper.asUser("finance.treasury", () => helper.call(contextService, request)),
            receivable: helper.asUser("finance.ar", () => helper.call(contextService, request)),
            reader: helper.asUser("finance.read", () => helper.call(contextService, request))
        }
    },
    then({treasury, receivable, reader}) {
        treasury.recordFound == true
        receivable.recordFound == true
        reader.recordFound == true
        treasury.financePayment.paymentId == receivable.financePayment.paymentId
        treasury.financePayment.canEdit == true
        receivable.financePayment.canEdit == false
        reader.financePayment.canEdit == false
        treasury.paymentHeaderValue.effectiveDate == treasury.financePayment.accountingDateText
        String(treasury.paymentHeaderValue.effectiveDate).match(/^\d{4}-\d{2}-\d{2}$/) != null
        !/"(?:accountNumber|routingNumber|cardNumber|gatewayResponse|credentials)"/.test(JSON.stringify(receivable))
    }
})

feature("payment context refuses foreign organization with the same otherwise valid payment parameters", {
    when() {
        return helper.asUser("finance.treasury", () => ({
            allowed: helper.call(contextService, request),
            refused: helper.refusal(
                contextService,
                Object.assign({}, request, {organizationPartyId: helper.ids.foreignOrganizationPartyId})
            )
        }))
    },
    then({allowed, refused}) {
        allowed.recordFound == true
        !!refused
    }
})

feature("a retained payment review cannot be presented under another valid same-organization payment", {
    when() {
        return helper.asUser("finance.treasury", () => {
            const otherPaymentId = "BOSS_ACCT_PAY_DELIVERED"
            const first = helper.call(native + "get#PaymentFinanceDetail", request)
            const other = helper.call(native + "get#PaymentFinanceDetail", {organizationPartyId, paymentId: otherPaymentId})
            const firstPreview = helper.call(native + "preview#PaymentState", {
                organizationPartyId,
                paymentId,
                sourceVersion: first.sourceVersion,
                action: "validate"
            })
            const otherPreview = helper.call(native + "preview#PaymentState", {
                organizationPartyId,
                paymentId: otherPaymentId,
                sourceVersion: other.sourceVersion,
                action: "confirm",
                settlementDate: ec.l10n.format(ec.user.nowTimestamp, "yyyy-MM-dd"),
                referenceNumber: "Context binding review",
                reason: "Read-only confirmation review"
            })
            return {
                first: helper.call(contextService, Object.assign({}, request, {previewId: firstPreview.previewId})),
                other: helper.call(contextService, {
                    organizationPartyId,
                    paymentId: otherPaymentId,
                    previewId: otherPreview.previewId
                }),
                refused: helper.refusal(contextService, Object.assign({}, request, {previewId: otherPreview.previewId}))
            }
        })
    },
    then({first, other, refused}) {
        first.recordFound == true
        other.recordFound == true
        first.paymentReview.paymentId == first.paymentId
        other.paymentReview.paymentId == other.paymentId
        first.paymentId != other.paymentId
        refused.includes("PAYMENT_REVIEW_MISMATCH")
    }
})

feature("payment list and all seven tabs render actual authorized fields in QVT and TUI", {
    when() {
        return helper.asUser("finance.treasury", () => {
            const paths = [
                ["Payments/Payments", "Payments"],
                ["Payments/PaymentDetail/Overview", "Payment overview"],
                ["Payments/PaymentDetail/Applications", "Applications and open items"],
                ["Payments/PaymentDetail/Gateway", "Gateway evidence"],
                ["Payments/PaymentDetail/Refunds", "Linked refunds"],
                ["Payments/PaymentDetail/GeneralLedger", "Payment ledger"],
                ["Payments/PaymentDetail/Files", "Payment files and issued documents"],
                ["Payments/PaymentDetail/History", "Payment history"],
                ["Payments/GatewayTransactions", "Gateway transactions"]
            ]
            return {
                renders: paths.flatMap(([path, caption]) =>
                    ["qvt", "tui"].map(mode => ({
                        caption,
                        result: helper.page(
                            path,
                            Object.assign({}, request, {lastStandalone: path.includes("PaymentDetail/") ? "true" : "-2"}),
                            mode
                        )
                    }))
                )
            }
        })
    },
    then({renders}) {
        renders.length == 18
        renders.every(row => row.result.status === 200 && !row.result.errors.length && row.result.output.includes(row.caption))
    }
})

feature("payment header pairs visible treasury actions with reader absence and read-only gateway evidence", {
    when() {
        return {
            treasury: helper.asUser("finance.treasury", () => helper.page("Payments/PaymentDetail", request)),
            reader: helper.asUser("finance.ar", () => helper.page("Payments/PaymentDetail", request))
        }
    },
    then({treasury, reader}) {
        !treasury.errors.length
        !reader.errors.length
        treasury.output.includes("Validate payment")
        treasury.output.includes("Edit draft")
        !reader.output.includes("Validate payment")
        !reader.output.includes("Edit draft")
        !reader.output.includes("Capture payment")
        !reader.output.includes("Create refund")
    }
})

feature("a missing payment renders an actionable unavailable state rather than cached request data", {
    when() {
        return helper.asUser("finance.ar", () =>
            helper.page("Payments/PaymentDetail", {
                organizationPartyId,
                paymentId: "no-such-payment",
                financePayment: {paymentId: "forged", capabilities: {canEdit: true}}
            })
        )
    },
    then(page) {
        page.status == 200
        !page.errors.length
        page.output.includes("Payment not available")
        page.output.includes("Back to payments")
        !page.output.includes("forged")
    }
})

feature("unavailable payment tabs retain their own safe state in standalone QVT and TUI renders", {
    when() {
        return helper.asUser("finance.ar", () => ({
            pages: ["Overview", "Applications", "Gateway", "Refunds", "GeneralLedger", "Files", "History"].flatMap(tab =>
                ["qvt", "tui"].map(mode =>
                    helper.page(
                        "Payments/PaymentDetail/" + tab,
                        {organizationPartyId, paymentId: "no-such-payment", lastStandalone: "true"},
                        mode
                    )
                )
            )
        }))
    },
    then({pages}) {
        pages.length == 14
        pages.every(
            page =>
                page.status === 200 &&
                !page.errors.length &&
                page.output.includes("Payment not available") &&
                page.output.includes("Back to payments")
        )
    }
})

feature("issued payment output exposes its actual amount, currency, day and masked recipient in QVT and TUI", {
    when() {
        return helper.asUser("finance.treasury", () => {
            const parameters = {organizationPartyId, paymentId: "BOSS_ACCT_PAY_DELIVERED", outputType: "receipt"}
            const output = helper.call(native + "get#PaymentOutput", parameters)
            return {
                summary: output.summary,
                amount: ec.l10n.formatCurrency(output.summary.amount, output.summary.currencyUomId),
                pages: ["qvt", "tui"].map(mode => helper.page("Payments/PaymentPrint", parameters, mode))
            }
        })
    },
    then({summary, amount, pages}) {
        pages.every(page => page.status === 200 && !page.errors.length)
        pages.every(page => page.output.includes(amount))
        pages.every(page => page.output.includes(summary.currencyUomId))
        pages.every(page => page.output.includes(summary.accountingDateText))
        pages.every(page => page.output.includes(summary.partyName))
        !!summary.maskedMethodLabel
        pages.every(page => page.output.includes(summary.maskedMethodLabel))
        pages.every(page => !/"(?:accountNumber|routingNumber|cardNumber)"/.test(page.output))
    }
})

feature("completed result projections use actual native records and preserve omitted posting and output arrays", {
    when() {
        const module = screen()
        const dto = {
            paymentId: "payment",
            previewId: "completed",
            inputFingerprint: "fingerprint",
            paymentSummary: {paymentId: "payment", currencyUomId: "USD", amount: "25"},
            applicationEffects: [{paymentApplicationId: "planned-application"}],
            ledgerPreview: [{acctgTransId: "planned-transaction"}],
            capabilities: {canReadLedger: true, canPrintReceipt: true}
        }
        const omitted = module.reviewPresentation(Object.assign({}, dto, {results: {paymentId: "payment"}}))
        const actual = module.reviewPresentation(
            Object.assign({}, dto, {
                results: {
                    paymentId: "payment",
                    action: "unapply",
                    applicationResults: [
                        {paymentApplicationId: "actual-application", amountOriginallyApplied: "25", amountApplied: "0"}
                    ],
                    acctgTransIds: ["actual-reversal"],
                    outputRows: [{outputId: "actual-output", outputType: "receipt", fileName: "Issued.pdf"}]
                }
            })
        )
        return {omitted, actual}
    },
    then({omitted, actual}) {
        omitted.applicationResultRows == []
        omitted.postingResultRows == []
        omitted.outputResultRows == []
        actual.applicationResultRows[0].paymentApplicationId == "actual-application"
        actual.applicationResultRows[0].amountApplied == "0"
        actual.postingResultRows[0].acctgTransId == "actual-reversal"
        actual.outputResultRows[0].outputId == "actual-output"
        actual.outputResultRows[0].fileName == "Issued.pdf"
        !JSON.stringify(actual.postingResultRows).includes("planned-transaction")
    }
})

feature("a completed payment owned by #user renders authorized posting references and enabled issued-file links", {
    where: [
        {user: "finance.admin", expectLedger: true, fixtureKey: "admin"},
        {user: "finance.treasury", expectLedger: false, fixtureKey: "treasury"}
    ],
    when({user, expectLedger, fixtureKey}) {
        return helper.asUser(user, () => {
            const effectiveDate = ec.l10n.format(ec.user.nowTimestamp, "yyyy-MM-dd"),
                deliverKey = "boss-pay-result-" + fixtureKey + "-deliver",
                currencyUomId = helper.call(native + "get#PaymentFinanceDetail", request).payment.currencyUomId,
                methods = helper.call(native + "find#PaymentMethods", {
                    organizationPartyId,
                    cashDirection: "incoming",
                    methodRole: "organization",
                    partyId: helper.ids.paymentPartyId,
                    currencyUomId,
                    effectiveDate,
                    selectedPaymentMethodIdList: ["BOSS_ACCT_PAY_CASH"],
                    pageSize: 1
                }),
                method = methods.selectedRows.find(row => row.paymentMethodId === "BOSS_ACCT_PAY_CASH")
            if (!method?.version) throw new Error("The native reviewed cash method is required for the issued-result fixture")
            const created = helper.call(native + "create#PaymentDraft", {
                organizationPartyId,
                cashDirection: "incoming",
                partyId: helper.ids.paymentPartyId,
                amount: "1",
                currencyUomId,
                effectiveDate,
                paymentInstrumentEnumId: "PiCash",
                organizationPaymentMethodId: method.paymentMethodId,
                organizationMethodVersion: method.version,
                referenceNumber: "Issued result reference",
                comments: "Owner-scoped issued-result render fixture",
                operationKey: "boss-pay-result-" + fixtureKey + "-create"
            })
            const validation = helper.call(native + "preview#PaymentState", {
                organizationPartyId,
                paymentId: created.paymentId,
                sourceVersion: created.sourceVersion,
                action: "validate"
            })
            helper.call(native + "change#PaymentState", {
                previewId: validation.previewId,
                inputFingerprint: validation.inputFingerprint,
                operationKey: "boss-pay-result-" + fixtureKey + "-validate"
            })
            const validated = helper.call(native + "get#PaymentFinanceDetail", {
                    organizationPartyId,
                    paymentId: created.paymentId
                }),
                preview = helper.call(native + "preview#PaymentState", {
                    organizationPartyId,
                    paymentId: created.paymentId,
                    sourceVersion: validated.sourceVersion,
                    action: "deliver",
                    referenceNumber: "Issued result reference",
                    reason: "Cash receipt verified for retained-result render proof",
                    settlementDate: effectiveDate
                }),
                applied = helper.call(native + "change#PaymentState", {
                    previewId: preview.previewId,
                    inputFingerprint: preview.inputFingerprint,
                    operationKey: deliverKey
                }),
                retained = helper.call(native + "get#PaymentStatePreview", {organizationPartyId, previewId: preview.previewId})
            const parameters = {
                    organizationPartyId,
                    paymentId: created.paymentId,
                    recordId: created.paymentId,
                    previewId: preview.previewId,
                    previewKind: "state",
                    lastStandalone: "-4"
                },
                presented = helper.call(contextService, parameters).paymentReview
            // The real app mount supplies its authorized shared links and resolves //Accounting destinations.
            const pages = ["qvt", "tui", "html"].map(mode => {
                const renderer = ec.screen.makeTest().rootScreen("component://webroot/screen/webroot.xml").renderMode(mode)
                if (mode === "qvt") renderer.withStaticData()
                const rendered = renderer.render("apps/Accounting/Payments/PaymentDetail", parameters, null),
                    output = String(rendered.output || ""),
                    links = []
                let postingGridPresent = false
                if (mode === "tui") {
                    const pending = [JSON.parse(output)]
                    while (pending.length) {
                        const value = pending.pop()
                        if (Array.isArray(value)) pending.push(...value)
                        else if (value && typeof value === "object") {
                            if (value.t === "link") links.push(value)
                            if (value.t === "formList" && value.name === "PaymentActualPostingResults") postingGridPresent = true
                            pending.push(...Object.values(value).filter(item => item && typeof item === "object"))
                        }
                    }
                } else {
                    postingGridPresent = /\bid="PaymentActualPostingResults[^"]*_table"/.test(output)
                    for (const match of output.matchAll(/<(a|m-link)\b([^>]*)>([\s\S]*?)<\/\1>/g)) {
                        const href = match[2].match(/\bhref="([^"]*)"/)
                        if (href)
                            links.push({
                                text: match[3],
                                url: href[1].replace(/&amp;/g, "&"),
                                disabled: /\baria-disabled="true"|\bclass="[^"]*\bdisabled\b/.test(match[2])
                            })
                    }
                }
                return {
                    mode,
                    status: rendered.status,
                    output,
                    links,
                    postingGridPresent,
                    errors: Array.from(rendered.errorMessages || []).concat(
                        output.match(/(?:Error rendering|Exception in render)[^\n<]*/g) || []
                    )
                }
            })
            const expectedPostingIds = Array.from(retained.results.acctgTransIds || [])
            return {
                created,
                applied,
                retained,
                presented,
                pages,
                expectLedger,
                deliverKey,
                expectedPostingIds,
                expectedPostingIdJson: JSON.stringify(expectedPostingIds)
            }
        })
    },
    then({created, applied, retained, presented, pages, expectLedger, deliverKey, expectedPostingIds, expectedPostingIdJson}) {
        applied.paymentId == created.paymentId
        retained.results.paymentId == created.paymentId
        toDecimal(retained.paymentSummary.amount).eq("1")
        retained.operationKey == deliverKey
        retained.capabilities.canReadLedger == expectLedger
        expectLedger ? retained.results.acctgTransIds.length > 0 : !("acctgTransIds" in retained.results)
        JSON.stringify(presented.postingResultRows.map(row => row.acctgTransId)) == expectedPostingIdJson
        Boolean(presented.postingResultRows.length) == expectLedger
        presented.outputResultRows.map(row => row.outputId) == retained.results.outputRows.map(row => row.outputId)
        presented.outputResultRows.length >= 2
        presented.outputResultRows.every(row => row.canOpen === true)
        pages.every(
            page =>
                page.status === 200 &&
                !page.errors.length &&
                page.output.includes("Completed results") &&
                page.output.includes("Issued files")
        )
        pages.every(page => page.postingGridPresent === expectLedger)
        pages.every(page => expectedPostingIds.every(id => page.output.includes(id)))
        pages.every(page =>
            retained.results.outputRows.every(row => page.output.includes(row.fileName) && page.output.includes(row.outputId))
        )
        pages.every(page =>
            retained.results.outputRows.every(row =>
                page.links.some(
                    link =>
                        !link.disabled &&
                        link.text.includes(row.fileName) &&
                        /\/Accounting\/Payments\/PaymentPrint(?:\?|$)/.test(link.url) &&
                        link.url.split(/[?&]/).includes("paymentId=" + created.paymentId) &&
                        link.url.split(/[?&]/).includes("outputId=" + row.outputId) &&
                        link.url.split(/[?&]/).includes("outputType=" + row.outputType)
                )
            )
        )
    }
})
