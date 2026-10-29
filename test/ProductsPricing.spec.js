const C = "ironstone.products.CatalogServices.",
    M = "mantle.product.PriceServices.",
    P = "mantle.product.",
    time = Date.now()
function as(user, fn) {
    login(user)
    const was = ec.artifactExecution.disableAuthz()
    try {
        return fn()
    } finally {
        ec.message.clearErrors()
        if (!was) ec.artifactExecution.enableAuthz()
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
const create = (productId, extra = {}) =>
    invoke(
        C + "store#ProductPrice",
        Object.assign(
            {
                productId,
                vendorPartyId: "ORG_ZIZI_SERVICES",
                price: 15,
                priceUomId: "USD",
                priceTypeEnumId: "PptCurrent",
                pricePurposeEnumId: "PppPurchase",
                quantityUomId: "OTH_ea",
                fromDate: new Date(time - 100000).toISOString()
            },
            extra
        )
    )
function makeRow(entity, fields) {
    const value = ec.entity.makeValue(entity)
    for (const [key, v] of Object.entries(fields)) value[key] = v
    value.create()
}
function product(id, owner = "ORG_ZIZI_SERVICES") {
    call("create#" + P + "Product", {
        productId: id,
        productName: id,
        productTypeEnumId: "PtAsset",
        ownerPartyId: owner,
        amountUomId: "OTH_ea"
    })
}
spec({
    setupSpec() {
        login("john.doe")
        ec.user.setEffectiveTime(time)
        ec.artifactExecution.disableAuthz()
        for (const id of ["B5_VISIBLE", "B5_BULK_A", "B5_BULK_B", "B5_NONE"]) product(id)
        product("B5_HIDDEN", "ORG_ZIZI_RETAIL")
        call("create#mantle.party.Party", {partyId: "B5_SUPPLIER", partyTypeEnumId: "PtyOrganization"})
        call("create#mantle.party.PartyRole", {partyId: "B5_SUPPLIER", roleTypeId: "Supplier"})
        create("B5_VISIBLE")
        create("B5_VISIBLE", {vendorPartyId: "B5_SUPPLIER", customerPartyId: "ORG_ZIZI_SERVICES", price: 7})
        create("B5_VISIBLE", {priceTypeEnumId: "PptAverage", price: 4})
        create("B5_HIDDEN", {vendorPartyId: "ORG_ZIZI_RETAIL", price: 999})
        create("B5_BULK_A")
        create("B5_BULK_B")
        ec.artifactExecution.enableAuthz()
    }
})
feature("sales, supplier and cost values leave only their own authorized read boundary", {
    when() {
        const sales = as("catalog.price.read", () => call(C + "find#ProductPrices", {productId: "B5_VISIBLE"})),
            supplier = as("catalog.supplier.price.read", () => call(C + "find#ProductPrices", {productId: "B5_VISIBLE"})),
            reader = as("catalog.reader", () => invoke(C + "find#ProductPrices", {productId: "B5_VISIBLE"})),
            hidden = as("catalog.price.read", () => invoke(C + "find#ProductPrices", {productId: "B5_HIDDEN"}))
        return {sales, supplier, reader, hidden}
    },
    then({sales, supplier, reader, hidden}) {
        sales.priceRows.length == 1
        sales.priceRows[0].price == 15
        sales.priceRows[0].direction == "sales"
        supplier.priceRows.length == 1
        supplier.priceRows[0].price == 7
        supplier.priceRows[0].direction == "purchase"
        reader.error.includes("read authority")
        hidden.error.includes("not available")
        !JSON.stringify(sales).includes("B5_SUPPLIER")
    }
})
feature("disabling artifact checks never grants write authority for another direction or owner", {
    when() {
        const supplier = as("catalog.price.edit", () =>
                create("B5_VISIBLE", {
                    vendorPartyId: "B5_SUPPLIER",
                    customerPartyId: "ORG_ZIZI_SERVICES",
                    minQuantity: 10,
                    price: 6
                })
            ),
            other = as("catalog.price.edit", () => create("B5_HIDDEN", {vendorPartyId: "ORG_ZIZI_SERVICES"})),
            reader = as("catalog.price.read", () => create("B5_VISIBLE", {minQuantity: 20}))
        return {supplier, other, reader}
    },
    then({supplier, other, reader}) {
        supplier.error.includes("Supplier-price")
        other.error.includes("not available")
        reader.error.includes("authority")
    }
})
feature("reviewed bulk changes pin rows and stamps, keep independent successes, and retry without duplicates", {
    when() {
        return as("catalog.price.edit", () => {
            const preview = call("mantle.product.PriceServices.preview#PriceChanges", {
                productIds: ["B5_BULK_A", "B5_BULK_B", "B5_NONE"],
                organizationPartyId: "ORG_ZIZI_SERVICES",
                direction: "sales",
                priceTypeEnumId: "PptCurrent",
                priceUomId: "USD",
                percentChange: 10,
                effectiveDate: new Date(time + 60000).toISOString(),
                changeReason: "Reviewed bulk test"
            })
            const b = call(C + "find#ProductPrices", {productId: "B5_BULK_B"}).priceRows[0]
            call(C + "store#ProductPrice", {productPriceId: b.productPriceId, price: 19, changeReason: "Changed after preview"})
            const wrong = invoke("mantle.product.PriceServices.apply#PriceChanges", {
                    operationKey: preview.operationKey,
                    previewToken: "wrong"
                }),
                applied = invoke("mantle.product.PriceServices.apply#PriceChanges", {
                    operationKey: preview.operationKey,
                    previewToken: preview.previewToken
                }),
                retry = invoke("mantle.product.PriceServices.apply#PriceChanges", {
                    operationKey: preview.operationKey,
                    previewToken: preview.previewToken
                }),
                info = call("mantle.product.PriceServices.get#PriceChanges", {operationKey: preview.operationKey})
            return {preview, wrong, applied, retry, info}
        })
    },
    then({preview, wrong, applied, retry, info}) {
        preview.readyCount == 2
        preview.failedCount == 1
        preview.previewRows.find(r => r.productId === "B5_BULK_A").afterPrice == 16.5
        wrong.error.includes("exact reviewed")
        applied.successCount == 1
        applied.failedCount == 2
        retry.successCount == 1
        retry.failedCount == 2
        info.previewRows.find(r => r.productId === "B5_BULK_A").beforePrice == 15
    }
})
feature("price audit reads interval, tier and amount reasons without merging supplier history", {
    when() {
        return as("catalog.price.edit", () => {
            const source = call(C + "find#ProductPrices", {productId: "B5_VISIBLE"}).priceRows[0]
            const next = call(C + "replace#ProductPrice", {
                productPriceId: source.productPriceId,
                price: 18,
                effectiveDate: new Date(time + 120000).toISOString(),
                changeReason: "Documented successor"
            })
            const audit = call(C + "get#PriceAudit", {productId: "B5_VISIBLE"}).auditRows
            return {next, audit}
        })
    },
    then({next, audit}) {
        next.productPriceId != null
        audit.some(r => r.changedFieldName === "thruDate" && r.changeReason === "Documented successor")
        audit.every(r => r.direction === "sales")
    }
})
feature("transaction statistics require their own direction authority and reject a different organization", {
    when() {
        const purchase = as("catalog.price.read", () =>
                invoke(C + "get#TransactionPriceStatistics", {
                    productId: "B5_VISIBLE",
                    direction: "purchase",
                    organizationPartyId: "ORG_ZIZI_SERVICES",
                    priceUomId: "USD"
                })
            ),
            other = as("catalog.price.read", () =>
                invoke(C + "get#TransactionPriceStatistics", {
                    productId: "B5_VISIBLE",
                    direction: "sales",
                    organizationPartyId: "ORG_ZIZI_RETAIL",
                    priceUomId: "USD"
                })
            )
        return {purchase, other}
    },
    then({purchase, other}) {
        purchase.error.includes("direction")
        other.error.includes("organization")
    }
})
feature("transaction statistics isolate organization, direction and currency in the actual indexed order facts", {
    when() {
        as("john.doe", () => {
            product("B5_STATS")
            for (const [id, vendor, customer, currency, qty, amount] of [
                ["B5_SALE", "ORG_ZIZI_SERVICES", "B5_SUPPLIER", "USD", 2, 12],
                ["B5_BUY", "B5_SUPPLIER", "ORG_ZIZI_SERVICES", "USD", 3, 7],
                ["B5_FOREIGN", "ORG_ZIZI_RETAIL", "B5_SUPPLIER", "USD", 1, 999],
                ["B5_EURO", "ORG_ZIZI_SERVICES", "B5_SUPPLIER", "EUR", 1, 88]
            ]) {
                makeRow("mantle.order.OrderHeader", {
                    orderId: id,
                    currencyUomId: currency,
                    placedDate: new Date(time - 1000).toISOString(),
                    statusId: "OrderCompleted"
                })
                makeRow("mantle.order.OrderPart", {
                    orderId: id,
                    orderPartSeqId: "01",
                    vendorPartyId: vendor,
                    customerPartyId: customer,
                    statusId: "OrderCompleted"
                })
                makeRow("mantle.order.OrderItem", {
                    orderId: id,
                    orderPartSeqId: "01",
                    orderItemSeqId: "01",
                    productId: "B5_STATS",
                    quantity: qty,
                    unitAmount: amount
                })
                ec.search.indexDocuments(ec.entity.getDataDocuments("MantleInventoryOrderItem", {orderId: id}))
            }
        })
        const sales = as("catalog.price.read", () =>
                call(C + "get#TransactionPriceStatistics", {
                    productId: "B5_STATS",
                    organizationPartyId: "ORG_ZIZI_SERVICES",
                    direction: "sales",
                    priceUomId: "USD",
                    fromDate: new Date(time - 10000).toISOString()
                })
            ),
            purchase = as("catalog.supplier.price.read", () =>
                call(C + "get#TransactionPriceStatistics", {
                    productId: "B5_STATS",
                    organizationPartyId: "ORG_ZIZI_SERVICES",
                    direction: "purchase",
                    priceUomId: "USD",
                    fromDate: new Date(time - 10000).toISOString()
                })
            )
        return {sales, purchase}
    },
    then({sales, purchase}) {
        sales.statisticsAvailable == true
        sales.statisticsRows.length == 1
        sales.statisticsRows[0].orderQuantitySum == 2
        sales.statisticsRows[0].weightedAmountAvg == 12
        purchase.statisticsRows.length == 1
        purchase.statisticsRows[0].weightedAmountAvg == 7
        purchase.statisticsRows[0].orderQuantitySum == 3
    }
})
feature("change and expiry notices stay inside the direction grant and deduplicate the same expiry", {
    when() {
        const out = as("john.doe", () => {
            product("B5_NOTICE")
            const price = create("B5_NOTICE", {thruDate: new Date(time + 86400000).toISOString()})
            const changed = call("ironstone.products.PriceNoticeServices.notify#ProductPriceChange", {
                    productPriceId: price.productPriceId
                }),
                first = call("ironstone.products.PriceNoticeServices.send#ExpiringPriceNotices"),
                again = call("ironstone.products.PriceNoticeServices.send#ExpiringPriceNotices")
            return {changed, first, again}
        })
        const denied = as("catalog.price.edit", () => invoke("ironstone.products.PriceNoticeServices.send#ExpiringPriceNotices"))
        return {out, denied}
    },
    then({out, denied}) {
        !out.changed.sentToUserIds.includes("BOSS_PRD_READER")
        !out.changed.sentToUserIds.includes("BOSS_PRD_SUPPLIER_PRICE_READ")
        out.first.sentCount > 0
        out.again.sentCount == 0
        denied.error.includes("scheduler")
    }
})
feature("a price notice reaches a Products user who holds the price permission through any group", {
    when() {
        const groupId = "BOSS_SPEC_PRICE_VIEW_PERMISSION"
        const wasDisabled = ec.artifactExecution.disableAuthz()
        try {
            if (!ec.entity.find("moqui.security.UserGroup").condition("userGroupId", groupId).count())
                call("create#moqui.security.UserGroup", {userGroupId: groupId, description: "Price view by permission alone"})
            call("create#moqui.security.UserGroupPermission", {userGroupId: groupId, userPermissionId: "PRICE_VIEW", fromDate: 0})
            call("create#moqui.security.UserGroupMember", {userGroupId: groupId, userId: "BOSS_PRD_READER", fromDate: 0})
        } finally {
            if (!wasDisabled) ec.artifactExecution.enableAuthz()
        }
        try {
            return as("john.doe", () => {
                product("B5_NOTICE_PERMISSION")
                const price = create("B5_NOTICE_PERMISSION", {})
                // send#ProductPriceNotice refuses a recipient outside the price grant before it checks for an earlier send
                const send = recipientUserId =>
                    invoke("ironstone.products.PriceNoticeServices.send#ProductPriceNotice", {
                        productPriceId: price.productPriceId,
                        topic: "ProductPriceChanged",
                        recipientUserId
                    })
                return {
                    reader: send("BOSS_PRD_READER"),
                    editor: send("BOSS_PRD_PRICE_EDIT"),
                    supplier: send("BOSS_PRD_SUPPLIER_PRICE_READ")
                }
            })
        } finally {
            ec.artifactExecution.disableAuthz()
            ec.entity
                .find("moqui.security.UserGroupMember")
                .condition({userGroupId: groupId, userId: "BOSS_PRD_READER"})
                .deleteAll()
            ec.entity.find("moqui.security.UserGroupPermission").condition("userGroupId", groupId).deleteAll()
            if (!wasDisabled) ec.artifactExecution.enableAuthz()
        }
    },
    then({reader, editor, supplier}) {
        reader.error == ""
        editor.error == ""
        supplier.error.includes("not authorized")
    }
})
feature("the unchanged price REST URLs guard reads, validate writes and expire instead of deleting", {
    when() {
        as("john.doe", () => product("B5_REST"))
        const read = as("catalog.price.read", () =>
            screenTest("rest").render("s1/mantle/products/BOSS_PRD_OWN/prices", {}, "get")
        )
        const denied = as("catalog.reader", () => screenTest("rest").render("s1/mantle/products/BOSS_PRD_OWN/prices", {}, "get"))
        const writes = as("catalog.price.edit", () => {
            const rest = screenTest("rest"),
                created = rest.render(
                    "s1/mantle/products/B5_REST/prices",
                    {
                        moquiSessionToken: "TestSessionToken",
                        vendorPartyId: "ORG_ZIZI_SERVICES",
                        priceTypeEnumId: "PptCurrent",
                        price: 20,
                        priceUomId: "USD"
                    },
                    "post"
                )
            if (created.status !== 200) log.warn("Price REST create: " + created.output)
            const productPriceId = JSON.parse(created.output).productPriceId
            const wrong = rest.render(
                "s1/mantle/products/BOSS_PRD_OWN/prices/" + productPriceId,
                {moquiSessionToken: "TestSessionToken", price: 99, changeReason: "Wrong parent refused"},
                "patch"
            )
            ec.message.clearErrors()
            const edited = rest.render(
                "s1/mantle/products/B5_REST/prices/" + productPriceId,
                {moquiSessionToken: "TestSessionToken", price: 21, changeReason: "REST correction"},
                "patch"
            )
            const ended = rest.render(
                    "s1/mantle/products/B5_REST/prices/" + productPriceId,
                    {
                        moquiSessionToken: "TestSessionToken",
                        thruDate: new Date(time + 3600000).toISOString(),
                        changeReason: "REST expiration"
                    },
                    "delete"
                ),
                stored = ec.entity
                    .find(P + "ProductPrice")
                    .condition({productPriceId})
                    .disableAuthz()
                    .one()
            return {created, wrong, edited, ended, stored}
        })
        return {read, denied, writes}
    },
    then({read, denied, writes}) {
        read.status == 200
        read.output.includes("BOSS_PRICE_SALES")
        !read.output.includes("BOSS_PRICE_SUPPLIER")
        denied.status != 200
        !denied.output.includes("BOSS_PRICE_SUPPLIER")
        writes.created.status == 200
        writes.wrong.status != 200
        writes.edited.status == 200
        writes.ended.status == 200
        writes.stored.price == 21
        writes.stored.thruDate != null
    }
})
feature("the client restriction survives composed price-editor grants and disabled artifact authorization", {
    when() {
        as("john.doe", () =>
            call("create#moqui.security.UserGroupMember", {
                userId: "BOSS_PRD_PRICE_EDIT",
                userGroupId: "BOSS_PROJECT_CLIENT",
                fromDate: new Date(0).toISOString()
            })
        )
        let result
        try {
            result = as("catalog.price.edit", () => ({
                access: call(C + "get#CatalogAccess"),
                boss: create("B5_VISIBLE", {minQuantity: 99}),
                mantle: invoke(M + "store#ProductPrice", {
                    productId: "B5_VISIBLE",
                    vendorPartyId: "ORG_ZIZI_SERVICES",
                    priceTypeEnumId: "PptCurrent",
                    priceUomId: "USD",
                    minQuantity: 98,
                    price: 1
                })
            }))
        } finally {
            as("john.doe", () =>
                ec.entity
                    .find("moqui.security.UserGroupMember")
                    .condition({userId: "BOSS_PRD_PRICE_EDIT", userGroupId: "BOSS_PROJECT_CLIENT"})
                    .disableAuthz()
                    .deleteAll()
            )
        }
        return result
    },
    then({access, boss, mantle}) {
        access.capabilities.read == false
        access.capabilities.priceEdit == false
        boss.error.includes("authority")
        mantle.error.includes("authority")
    }
})
feature("private counterparties and legacy scope changes cannot leak historical supplier or cost amounts", {
    when() {
        const setup = as("john.doe", () => {
            product("B5_HISTORY")
            const cost = create("B5_HISTORY", {priceTypeEnumId: "PptAverage", price: 456})
            const move = invoke(C + "store#ProductPrice", {
                productPriceId: cost.productPriceId,
                priceTypeEnumId: "PptCurrent",
                changeReason: "Scope change refused"
            })
            call("update#" + P + "ProductPrice", {productPriceId: cost.productPriceId, priceTypeEnumId: "PptCurrent", price: 25})
            call("create#mantle.party.Party", {
                partyId: "B5_PRIVATE_CUSTOMER",
                partyTypeEnumId: "PtyPerson",
                ownerPartyId: "ORG_ZIZI_SERVICES",
                privateOwnerUserId: "BOSS_PRD_PRICE_EDIT"
            })
            call("create#" + P + "ProductPrice", {
                productId: "B5_HISTORY",
                vendorPartyId: "ORG_ZIZI_SERVICES",
                customerPartyId: "B5_PRIVATE_CUSTOMER",
                priceTypeEnumId: "PptCurrent",
                price: 777,
                priceUomId: "USD",
                fromDate: new Date(time - 1000).toISOString()
            })
            return {move}
        })
        const read = as("catalog.price.read", () => ({
            prices: call(C + "find#ProductPrices", {productId: "B5_HISTORY"}),
            audit: call(C + "get#PriceAudit", {productId: "B5_HISTORY"})
        }))
        return {setup, read}
    },
    then({setup, read}) {
        setup.move.error.includes("scope is fixed")
        read.prices.priceRows.length == 1
        read.prices.priceRows[0].price == 25
        read.audit.historyRestricted == true
        !JSON.stringify({
            prices: read.prices.priceRows.map(r => ({price: r.price, customerPartyId: r.customerPartyId})),
            audit: read.audit.auditRows.map(r => ({
                old: r.oldValueText,
                value: r.newValueText,
                oldDisplay: r.oldDisplay,
                display: r.newDisplay,
                reason: r.changeReason
            }))
        }).match(/456|777|B5_PRIVATE_CUSTOMER/)
    }
})

feature("audit scope follows the selected direction organization and currency for a reader of both directions", {
    when() {
        return as("john.doe", () => ({
            sales: call(C + "get#PriceAudit", {
                productId: "B5_VISIBLE",
                direction: "sales",
                organizationPartyId: "ORG_ZIZI_SERVICES",
                priceUomId: "USD"
            }).auditRows,
            purchase: call(C + "get#PriceAudit", {
                productId: "B5_VISIBLE",
                direction: "purchase",
                organizationPartyId: "ORG_ZIZI_SERVICES",
                priceUomId: "USD"
            }).auditRows,
            foreign: call(C + "get#PriceAudit", {
                productId: "B5_VISIBLE",
                direction: "sales",
                organizationPartyId: "ORG_ZIZI_RETAIL",
                priceUomId: "USD"
            }).auditRows,
            euro: call(C + "get#PriceAudit", {productId: "B5_VISIBLE", direction: "sales", priceUomId: "EUR"}).auditRows
        }))
    },
    then({sales, purchase, foreign, euro}) {
        sales.length > 0
        sales.every(r => r.direction === "sales")
        purchase.length > 0
        purchase.every(r => r.direction === "purchase")
        foreign.length == 0
        euro.length == 0
    }
})
