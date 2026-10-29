const S = "ironstone.products.PriceListServices.",
    M = "mantle.product.PriceServices.",
    P = "mantle.product."
function as(user, fn) {
    login(user)
    ec.artifactExecution.disableAuthz()
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
    setupSpec() {
        login("john.doe")
        ec.artifactExecution.disableAuthz()
    },
    cleanup() {
        ec.message.clearErrors()
        ec.artifactExecution.enableAuthz()
    }
})
feature("shared list and explanation services enforce direction owner and trace grants without relying on artifact checks", {
    when() {
        return {
            sales: as("catalog.price.read", () => call(S + "find#ProductPriceLists", {includeHistory: true})),
            supplier: as("catalog.supplier.price.read", () => call(S + "find#ProductPriceLists", {includeHistory: true})),
            reader: as("catalog.reader", () =>
                invoke(S + "get#PriceExplanation", {
                    productId: "BOSS_PRD_OWN",
                    organizationPartyId: "ORG_ZIZI_SERVICES",
                    direction: "sales"
                })
            ),
            hidden: as("catalog.price.read", () =>
                invoke(S + "get#PriceExplanation", {
                    productId: "BOSS_PRD_OTHER",
                    organizationPartyId: "ORG_ZIZI_RETAIL",
                    direction: "sales"
                })
            ),
            explained: as("catalog.price.read", () =>
                call(S + "get#PriceExplanation", {
                    productId: "BOSS_PRD_OWN",
                    organizationPartyId: "ORG_ZIZI_SERVICES",
                    direction: "sales"
                })
            )
        }
    },
    then({sales, supplier, reader, hidden, explained}) {
        sales.priceListRows.some(r => r.priceListId === "BOSS_PRICE_LIST")
        supplier.priceListRows.length == 0
        reader.error.includes("authority")
        hidden.error.includes("not available")
        explained.priceResult.price == 13.5
        explained.priceResult.priceRuleId == "BOSS_PRICE_RULE"
        explained.traceRows.some(r => r.kind === "list-selected")
    }
})
feature("a reader cannot write rules through the shared projection or the native service", {
    when() {
        return as("catalog.price.read", () => ({
            shared: invoke(S + "store#ProductPriceRule", {
                priceListId: "BOSS_PRICE_LIST",
                sequenceNum: 20,
                selector: "all",
                baseType: "fixed",
                fixedPrice: 1,
                changeReason: "Not permitted"
            }),
            native: invoke(M + "store#ProductPriceRule", {
                priceListId: "BOSS_PRICE_LIST",
                sequenceNum: 20,
                selector: "all",
                baseType: "fixed",
                fixedPrice: 1,
                changeReason: "Not permitted"
            })
        }))
    },
    then({shared, native}) {
        shared.error.includes("not available")
        native.error.includes("not available")
    }
})
const cases = [
    ["Prices/PriceLists", {}],
    ["Prices/PriceLists/PriceListDetail", {priceListId: "BOSS_PRICE_LIST"}],
    ["Prices/PriceExplain", {productId: "BOSS_PRD_OWN", organizationPartyId: "ORG_ZIZI_SERVICES"}],
    ["Settings/PricingSettings", {organizationPartyId: "ORG_ZIZI_SERVICES"}]
]
feature("price-list screen #path renders its populated data in #mode", {
    where: cases.flatMap(([path, parameters]) => ["qvt", "html", "html-print", "tui"].map(mode => ({path, parameters, mode}))),
    expect({path, parameters, mode}) {
        const result = as("john.doe", () =>
            ec.screen
                .makeTest()
                .rootScreen("component://mr-boss/screen/Products.xml")
                .renderMode(mode)
                .withStaticData()
                .render(path, Object.assign({lastStandalone: "-2"}, parameters), null)
        )
        if (result.errorMessages.length) log.warn(result.errorMessages.join(" | "))
        result.status == 200
        result.errorMessages.length == 0
        !/Error rendering|Exception in render/.test(result.output)
        result.output.length > 100
    }
})
feature("a newly saved fixed rule renders in the shared detail projection", {
    when() {
        return as("catalog.price.edit", () => {
            const saved = call(S + "store#ProductPriceList", {
                listName: "Fixed display regression",
                organizationPartyId: "ORG_ZIZI_SERVICES",
                direction: "sales",
                priceUomId: "USD",
                changeReason: "Regression policy"
            })
            call(S + "store#ProductPriceRule", {
                priceListId: saved.priceListId,
                sequenceNum: 10,
                selector: "product",
                productId: "BOSS_PRD_OWN",
                baseType: "fixed",
                fixedPrice: "12.50",
                changeReason: "Fixed amount"
            })
            return call(S + "get#PriceListDetail", {priceListId: saved.priceListId})
        })
    },
    then({priceRuleRows}) {
        priceRuleRows.length == 1
        priceRuleRows[0].calculation.startsWith("Fixed 12.5")
    }
})
feature("a legacy cost row without parties still requires the product owner in the native resolver", {
    when() {
        as("john.doe", () =>
            call("create#" + P + "ProductPrice", {
                productPriceId: "B5B_HIDDEN_COST",
                productId: "BOSS_PRD_OTHER",
                priceTypeEnumId: "PptAverage",
                priceUomId: "USD",
                price: 867.25,
                fromDate: new Date(Date.now() - 1000).toISOString()
            })
        )
        return as("catalog.cost.read", () =>
            invoke(M + "get#ProductPriceByType", {productId: "BOSS_PRD_OTHER", priceTypeEnumId: "PptAverage"})
        )
    },
    then({price, priceAvailable}) {
        price == null
        priceAvailable == false
    }
})
feature("a Products administrator configures pricing and reads its rules while retaining owner scope", {
    when() {
        return as("catalog.admin", () => {
            const options = call(S + "get#PriceListOptions"),
                before = call("ironstone.products.SettingsServices.get#PricingSettings", {
                    organizationPartyId: "ORG_ZIZI_SERVICES"
                }),
                saved = invoke("ironstone.products.SettingsServices.store#PricingSettings", {
                    organizationPartyId: "ORG_ZIZI_SERVICES",
                    expectedFromDate: before.fromDate,
                    defaultPriceListId: "BOSS_PRICE_LIST",
                    defaultCurrencyUomId: "USD",
                    defaultPurposeEnumId: "PppPurchase",
                    allowedPurposeIds: "PppPurchase,PppRecurring",
                    changeReason: "Catalog default list"
                }),
                rules = invoke(S + "get#PriceListDetail", {priceListId: "BOSS_PRICE_LIST"})
            return {options, saved, rules}
        })
    },
    then({options, saved, rules}) {
        options.pricingOptions.lists.some(r => r.value === "BOSS_PRICE_LIST")
        saved.error == ""
        saved.settings.defaultPriceListId == "BOSS_PRICE_LIST"
        rules.priceRuleRows.some(r => r.priceRuleId === "BOSS_PRICE_RULE")
    }
})
