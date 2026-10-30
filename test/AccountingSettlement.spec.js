const helper = ec.resource.script("component://mr-boss/test/AccountingSpecLib.js")
const screen = () => ec.resource.script("component://mr-boss/service/ironstone/accounting/Settlements.js")
const scope = {
    organizationPartyId: helper.ids.organizationPartyId,
    partyId: helper.ids.customerPartyId,
    direction: "receivable",
    currencyUomId: "USD",
    asOfDate: "2026-10-30",
    effectiveDate: "2026-10-30"
}
const request = (draft, extra = {}) => Object.assign({}, scope, {draftJson: JSON.stringify(draft)}, extra)
const customerPartyId = "BOSS_ACCT_STL_CUSTOMER"
const currentScope = () =>
    Object.assign({}, scope, {
        partyId: customerPartyId,
        asOfDate: ec.l10n.format(ec.user.nowTimestamp, "yyyy-MM-dd"),
        effectiveDate: ec.l10n.format(ec.user.nowTimestamp, "yyyy-MM-dd")
    })
function fixtureDraft() {
    const selectedScope = currentScope()
    const found = helper.call("mantle.account.PaymentServices.find#OpenItems", selectedScope)
    const invoice = found.invoiceRows.find(row => row.sourceId === "BOSS_ACCT_STL_INV100")
    const payment = found.paymentRows.find(row => row.sourceId === "BOSS_ACCT_STL_RECEIPT60")
    const credit = found.creditRows.find(row => row.sourceId === "BOSS_ACCT_STL_CREDIT25")
    if (!invoice || !payment || !credit)
        throw new Error("The dedicated settlement fixtures require invoice100, receipt60 and credit25")
    const token = row => row.sourceKey + "~" + row.version
    return {
        scope: selectedScope,
        allocations: [
            {sourceToken: token(payment), targetToken: token(invoice), amount: "60"},
            {sourceToken: token(credit), targetToken: token(invoice), amount: "25"}
        ],
        adjustments: []
    }
}
const mixedDraft = () => ({
    scope,
    allocations: [
        {sourceToken: "payment:receipt~receipt-reviewed", targetToken: "invoice:invoice~invoice-reviewed", amount: "60"},
        {sourceToken: "credit:credit~credit-reviewed", targetToken: "invoice:invoice~invoice-reviewed", amount: "25"}
    ],
    adjustments: []
})
const refused = action => {
    try {
        action()
        return ""
    } catch (error) {
        return String(error.message)
    }
}

feature("mixed and split allocation drafts preserve every original reviewed source and target revision", {
    when() {
        const module = screen()
        const draft = mixedDraft()
        draft.allocations.push({
            sourceToken: "payment:receipt~receipt-reviewed",
            targetToken: "invoice:second~second-reviewed",
            amount: "10"
        })
        draft.adjustments.push({
            targetToken: "invoice:invoice~invoice-reviewed",
            kind: "discount",
            amount: "5",
            glAccountId: "explicit-account",
            reason: "Agreed discount"
        })
        return module.selection(module.parseDraft(JSON.stringify(draft)))
    },
    then({allocations, adjustments, sourceVersions}) {
        allocations.length == 3
        allocations[0] == {sourceKey: "payment:receipt", targetKey: "invoice:invoice", amount: "60"}
        allocations[1] == {sourceKey: "credit:credit", targetKey: "invoice:invoice", amount: "25"}
        allocations[2] == {sourceKey: "payment:receipt", targetKey: "invoice:second", amount: "10"}
        adjustments ==
            [{invoiceId: "invoice", kind: "discount", amount: "5", glAccountId: "explicit-account", reason: "Agreed discount"}]
        sourceVersions ==
            {
                "payment:receipt": "receipt-reviewed",
                "credit:credit": "credit-reviewed",
                "invoice:invoice": "invoice-reviewed",
                "invoice:second": "second-reviewed"
            }
    }
})

feature("editing and removing a presentation row preserves its other reviewed rows and performs no financial write", {
    when() {
        return helper.asUser("finance.ar", () => {
            const module = screen()
            const changed = module.editDraft(
                request(mixedDraft(), {
                    draftAction: "updateAllocation",
                    rowId: "allocation-0",
                    sourceToken: "payment:receipt~receipt-reviewed",
                    targetToken: "invoice:invoice~invoice-reviewed",
                    amount: "40"
                })
            )
            const removed = module.editDraft(
                Object.assign({}, scope, changed, {draftAction: "removeAllocation", rowId: "allocation-0"})
            )
            return {changed: module.parseDraft(changed.draftJson), removed: module.parseDraft(removed.draftJson)}
        })
    },
    then({changed, removed}) {
        changed.allocations.length == 2
        changed.allocations[0].amount == "40"
        changed.allocations[0].sourceToken == "payment:receipt~receipt-reviewed"
        changed.allocations[1].amount == "25"
        removed.allocations.length == 1
        removed.allocations[0].sourceToken == "credit:credit~credit-reviewed"
        removed.scope == scope
    }
})

feature("a retained native review reconstructs its frozen draft and calendar days without refreshing revisions", {
    when() {
        const dto = {
            organizationPartyId: scope.organizationPartyId,
            partyId: scope.partyId,
            direction: "receivable",
            currencyUomId: "USD",
            effectiveDate: 1793329200000,
            accountingDateText: "2026-10-30",
            selectionThroughDateText: "2026-10-29",
            selectionThroughDate: 1793314800000,
            sourceVersions: {"payment:receipt": "old-payment-version", "invoice:invoice": "old-invoice-version"},
            allocationRows: [{sourceKey: "payment:receipt", targetKey: "invoice:invoice", amount: "60"}],
            adjustmentRows: [
                {
                    invoiceId: "invoice",
                    kind: "writeoff",
                    amount: "5",
                    glAccountId: "explicit-account",
                    reason: "Review retained reason"
                }
            ]
        }
        const draft = screen().retainedDraft(dto)
        return {draft, selected: screen().selection(draft)}
    },
    then({draft, selected}) {
        draft.scope.asOfDate == "2026-10-29"
        draft.scope.effectiveDate == "2026-10-30"
        draft.allocations[0].sourceToken == "payment:receipt~old-payment-version"
        draft.adjustments[0].targetToken == "invoice:invoice~old-invoice-version"
        selected.sourceVersions == {"payment:receipt": "old-payment-version", "invoice:invoice": "old-invoice-version"}
        selected.adjustments[0].glAccountId == "explicit-account"
        selected.adjustments[0].reason == "Review retained reason"
    }
})

feature("malformed, conflicting and excessive draft selections cannot replace reviewed source revisions", {
    when() {
        const module = screen()
        const conflicting = mixedDraft()
        conflicting.allocations[1].targetToken = "invoice:invoice~fresh-unreviewed"
        const excessive = mixedDraft()
        excessive.allocations = Array.from({length: 201}, () => excessive.allocations[0])
        return {
            missing: refused(() => module.itemToken("invoice:one")),
            malformed: refused(() => module.itemToken("invoice:%XX~reviewed")),
            wrongKind: refused(() => module.itemToken("bank:private~reviewed")),
            conflicting: refused(() => module.selection(conflicting)),
            excessive: refused(() => module.parseDraft(JSON.stringify(excessive))),
            scopeChange: helper.asUser("finance.ar", () =>
                refused(() => module.preparePreview(request(mixedDraft(), {currencyUomId: "EUR"})))
            ),
            readerEdit: helper.asUser("finance.read", () =>
                refused(() => module.editDraft(request(mixedDraft(), {draftAction: "removeAllocation", rowId: "allocation-0"})))
            )
        }
    },
    then({missing, malformed, wrongKind, conflicting, excessive, scopeChange, readerEdit}) {
        !!missing
        !!malformed
        !!wrongKind
        conflicting.includes("different reviewed revisions")
        excessive.includes("200 allocations")
        scopeChange.includes("another customer, currency or date")
        readerEdit.includes("Receivable editing authority")
    }
})

feature("the settlement workbench renders current scoped balances and hides allocation editing from readers", {
    when() {
        const parameters = {partyId: customerPartyId, currencyUomId: "USD"}
        return {
            ar: helper.asUser("finance.ar", () => helper.page("Receivables/ReceivablesWorkbench", parameters, "html")),
            reader: helper.asUser("finance.read", () => helper.page("Receivables/ReceivablesWorkbench", parameters, "html")),
            renders: helper.asUser("finance.read", () =>
                ["qvt", "tui"].map(mode => ({mode, result: helper.page("Receivables/ReceivablesWorkbench", parameters, mode)}))
            )
        }
    },
    then({ar, reader, renders}) {
        ar.status == 200
        ar.errors == []
        reader.status == 200
        reader.errors == []
        ar.output.includes("Add allocation")
        ar.output.includes("Add discount or write-off")
        !reader.output.includes("Add allocation")
        !reader.output.includes("Add discount or write-off")
        ar.output.includes("Available receipts and credits")
        reader.output.includes("Balances are current")
        renders.every(
            row =>
                row.result.status === 200 &&
                !row.result.errors.length &&
                row.result.output.includes("Allocate receipts and credits")
        )
        !!JSON.parse(renders.find(row => row.mode === "tui").result.output)
        !/accountNumber|routingNumber|cardNumber|accessCode|gatewayResponse/.test(reader.output)
    }
})

feature("search and due filtering retain the draft while explicit customer or date changes start a new selection", {
    when() {
        return helper.asUser("finance.ar", () => {
            const draft = fixtureDraft()
            const original = screen().selection(draft)
            const retained = helper.call(
                "ironstone.accounting.SettlementScreenServices.get#WorkbenchContext",
                Object.assign({}, draft.scope, {
                    draftJson: JSON.stringify(draft),
                    text: "not-a-document-match",
                    dueBucket: "overdue",
                    filterSubmit: "Y"
                })
            )
            const changed = helper.call(
                "ironstone.accounting.SettlementScreenServices.get#WorkbenchContext",
                Object.assign({}, draft.scope, {
                    draftJson: JSON.stringify(draft),
                    partyId: helper.ids.customerPartyId,
                    filterSubmit: "Y"
                })
            )
            return {original, retained, changed, retainedSelection: screen().selection(screen().parseDraft(retained.draftJson))}
        })
    },
    then({original, retained, changed, retainedSelection}) {
        retained.draftAllocations.length == 2
        retainedSelection == original
        retained.text == "not-a-document-match"
        retained.dueBucket == "overdue"
        retained.workbench.selectionReset == false
        changed.workbench.selectionReset == true
        changed.draftAllocations == []
        changed.draftAdjustments == []
    }
})

feature("the retained native review owns mixed amounts and versions even when client draft fields change", {
    when() {
        return helper.asUser("finance.ar", () => {
            const draft = fixtureDraft()
            const original = screen().selection(draft)
            const preview = helper.call(
                "mantle.account.PaymentServices.preview#Settlement",
                Object.assign({}, draft.scope, original)
            )
            const tampered = JSON.parse(JSON.stringify(draft))
            tampered.allocations[0].amount = "999999"
            const parameters = Object.assign({}, draft.scope, {previewId: preview.previewId, draftJson: JSON.stringify(tampered)})
            const context = helper.call("ironstone.accounting.SettlementScreenServices.get#WorkbenchContext", parameters)
            const reloaded = helper.call(
                "ironstone.accounting.SettlementScreenServices.get#WorkbenchContext",
                Object.assign({}, parameters, {operationKey: "different-client-key"})
            )
            const refusal = helper.refusal("mantle.account.PaymentServices.apply#Settlement", {
                previewId: preview.previewId,
                inputFingerprint: preview.inputFingerprint + "-changed",
                operationKey: context.settlementReview.operationKey
            })
            const afterRefusal = helper.call("ironstone.accounting.SettlementScreenServices.get#WorkbenchContext", parameters)
            const nextPreview = helper.call(
                "mantle.account.PaymentServices.preview#Settlement",
                Object.assign({}, draft.scope, original, {
                    allocations: original.allocations.map((row, index) =>
                        Object.assign({}, row, index === 0 ? {amount: "59"} : {})
                    )
                })
            )
            const nextContext = helper.call(
                "ironstone.accounting.SettlementScreenServices.get#WorkbenchContext",
                Object.assign({}, draft.scope, {previewId: nextPreview.previewId})
            )
            const outputs = ["html", "qvt", "tui"].map(mode => ({
                mode,
                result: helper.page("Receivables/ReceivablesWorkbench", parameters, mode)
            }))
            return {
                preview,
                context,
                reloaded,
                afterRefusal,
                nextContext,
                refusal,
                original,
                retained: screen().selection(screen().parseDraft(context.draftJson)),
                outputs
            }
        })
    },
    then({preview, context, reloaded, afterRefusal, nextContext, refusal, original, retained, outputs}) {
        !!preview.previewId
        !!preview.inputFingerprint
        context.workbench.hasReview == true
        context.workbench.hasResults == false
        context.settlementReview.operationKey.startsWith("settle-")
        context.settlementReview.operationKey.length <= 40
        reloaded.settlementReview.operationKey == context.settlementReview.operationKey
        refusal.includes("STALE_PREVIEW")
        afterRefusal.settlementReview.operationKey == context.settlementReview.operationKey
        afterRefusal.settlementReview.inputFingerprint == context.settlementReview.inputFingerprint
        nextContext.settlementReview.operationKey != context.settlementReview.operationKey
        retained.sourceVersions == original.sourceVersions
        retained.allocations.every(
            (row, index) =>
                row.sourceKey === original.allocations[index].sourceKey &&
                row.targetKey === original.allocations[index].targetKey &&
                toDecimal(row.amount).eq(original.allocations[index].amount)
        )
        toDecimal(context.settlementReview.allocationRows[0].amount).eq("60")
        toDecimal(context.settlementReview.allocationRows[1].amount).eq("25")
        toDecimal(
            context.settlementReview.balanceRows.find(row => row.sourceKey === "invoice:BOSS_ACCT_STL_INV100").afterRemaining
        ).eq("15")
        outputs.every(
            row =>
                row.result.status === 200 &&
                !row.result.errors.length &&
                row.result.output.includes("Reviewed settlement") &&
                row.result.output.includes("Confirm settlement")
        )
        outputs.every(row => !row.result.output.includes("$999,999.00"))
        outputs.find(row => row.mode === "html").result.output.includes("$15.00")
    }
})

feature("an unavailable review renders safely without a confirm action or exposing a foreign organization", {
    when() {
        return helper.asUser("finance.read", () => ({
            renders: ["qvt", "tui"].map(mode =>
                helper.page(
                    "Receivables/ReceivablesWorkbench",
                    {partyId: helper.ids.customerPartyId, currencyUomId: "USD", previewId: "SETTLEMENT_NOT_AVAILABLE"},
                    mode
                )
            ),
            foreign: helper.refusal("ironstone.accounting.SettlementScreenServices.get#WorkbenchContext", {
                organizationPartyId: helper.ids.foreignOrganizationPartyId,
                partyId: helper.ids.customerPartyId,
                currencyUomId: "USD"
            })
        }))
    },
    then({renders, foreign}) {
        renders.every(row => row.status === 200 && !row.errors.length && row.output.includes("Settlement review not available"))
        renders.every(row => !row.output.includes("Confirm settlement"))
        foreign.includes("organization")
    }
})
