const S = "ironstone.products.SupplierServices.",
    C = "ironstone.products.CatalogServices.",
    F = "ironstone.shared.RecordFilesServices.",
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
        as("john.doe", () => {
            call("create#mantle.party.Party", {partyId: "BOSS_P6_BUYER", partyTypeEnumId: "PtyPerson"})
            call("create#mantle.party.Person", {partyId: "BOSS_P6_BUYER", firstName: "Two", lastName: "Buyers"})
            const demo = ec.entity
                .find("moqui.security.UserAccount")
                .condition({userId: "BOSS_PRD_SUPPLIER_PRICE_READ"})
                .disableAuthz()
                .one()
            call("create#moqui.security.UserAccount", {
                userId: "BOSS_P6_BUYER",
                username: "p6.buyer",
                partyId: "BOSS_P6_BUYER",
                currentPassword: demo.currentPassword,
                passwordSalt: demo.passwordSalt,
                passwordHashType: demo.passwordHashType
            })
            for (const userGroupId of ["BOSS_PRODUCTS", "BOSS_PRODUCTS_SUPPLIER_PRICE_READ"])
                call("create#moqui.security.UserGroupMember", {
                    userId: "BOSS_P6_BUYER",
                    userGroupId,
                    fromDate: "2000-01-01T00:00:00Z"
                })
            for (const toPartyId of ["ORG_ZIZI_SERVICES", "ORG_ZIZI_RETAIL"])
                call("create#mantle.party.PartyRelationship", {
                    fromPartyId: "BOSS_P6_BUYER",
                    toPartyId,
                    toRoleTypeId: "OrgInternal",
                    relationshipTypeEnumId: "PrtAgent",
                    fromDate: "2000-01-01T00:00:00Z"
                })
            call("create#" + P + "Product", {
                productId: "BOSS_P6_CODE",
                productName: "Unremarkable material",
                ownerPartyId: "ORG_ZIZI_SERVICES"
            })
            call("create#mantle.party.Party", {
                partyId: "BOSS_P6_PRIVATE",
                partyTypeEnumId: "PtyOrganization",
                ownerPartyId: "ORG_ZIZI_SERVICES",
                privateOwnerUserId: "BOSS_PRD_PRICE_EDIT"
            })
            call("create#mantle.party.PartyRole", {partyId: "BOSS_P6_PRIVATE", roleTypeId: "Supplier"})
            call("create#" + P + "ProductPrice", {
                productPriceId: "BOSS_P6_SECRET",
                productId: "BOSS_P6_CODE",
                vendorPartyId: "BOSS_P6_PRIVATE",
                customerPartyId: "ORG_ZIZI_SERVICES",
                price: 987.34,
                priceUomId: "USD",
                priceTypeEnumId: "PptCurrent",
                otherPartyItemId: "P6-PRIVATE-CODE",
                fromDate: "2026-01-01T00:00:00Z"
            })
        })
    },
    cleanup() {
        ec.message.clearErrors()
        ec.artifactExecution.enableAuthz()
    }
})
feature("one supplier has distinct offers to two buyers, including dimensional quantities and a priced pack", {
    when() {
        return as("p6.buyer", () => ({
            services: call(S + "find#SupplierPrices", {
                organizationPartyId: "ORG_ZIZI_SERVICES",
                vendorPartyId: "BOSS_PRD_SUPPLIER",
                productId: "BOSS_PRD_OWN"
            }),
            retail: call(S + "find#SupplierPrices", {
                organizationPartyId: "ORG_ZIZI_RETAIL",
                vendorPartyId: "BOSS_PRD_SUPPLIER",
                productId: "BOSS_PRD_OWN"
            }),
            detail: call(S + "get#SupplierDetail", {organizationPartyId: "ORG_ZIZI_SERVICES", vendorPartyId: "BOSS_PRD_SUPPLIER"})
        }))
    },
    then({services, retail, detail}) {
        services.offerRows.length == 2
        services.offerRows.every(r => r.customerPartyId === "ORG_ZIZI_SERVICES" && r.vendorPartyId === "BOSS_PRD_SUPPLIER")
        services.offerRows.find(r => r.productPriceId === "BOSS_PRICE_SUPPLIER").standardLeadTimeDays == "3"
        services.offerRows.find(r => r.productId === "BOSS_PRD_PACK").packSize == "12"
        services.offerRows.find(r => r.productId === "BOSS_PRD_PACK").quantityUomId == "OTH_ea"
        retail.offerRows.length == 1
        retail.offerRows[0].price == "9"
        retail.offerRows[0].quantityIncrement == "12"
        retail.offerRows[0].standardLeadTimeDays == "7"
        detail.supplier.supplierName == "Services Supply"
        detail.contactRows.some(r => r.value === "supply@example.test")
        detail.supplier.canEditContact == false
        !JSON.stringify(detail).includes("bankAccount")
    }
})
feature("the supplier grant and buyer scope hold through services and shared mounts with authorization disabled", {
    when() {
        return {
            priceEditor: as("catalog.price.edit", () =>
                invoke(S + "find#SupplierPrices", {
                    organizationPartyId: "ORG_ZIZI_SERVICES",
                    capabilities: {supplierPriceRead: true}
                })
            ),
            wrongBuyer: as("catalog.supplier.price.read", () =>
                invoke(S + "find#SupplierPrices", {organizationPartyId: "ORG_ZIZI_RETAIL"})
            ),
            privateSupplier: as("catalog.supplier.price.read", () =>
                invoke(S + "get#SupplierDetail", {vendorPartyId: "BOSS_P6_PRIVATE"})
            ),
            client: as("sheldon.acme", () => invoke(S + "find#SupplierPrices", {})),
            context: as("catalog.supplier.price.read", () => invoke(S + "find#SupplierPrices", {appRoot: "Purchasing"}))
        }
    },
    then({priceEditor, wrongBuyer, privateSupplier, client, context}) {
        priceEditor.error.includes("Supplier-price authority")
        wrongBuyer.error.includes("buying organization")
        privateSupplier.error.includes("not available")
        client.error != ""
        context.error.includes("Shared catalog context is not available")
    }
})
feature("supplier price filters and item-code discovery never reveal a private counterpartys offers", {
    when() {
        return as("catalog.supplier.price.read", () => ({
            filtered: call(S + "find#SupplierPrices", {
                supplierItemCode: "SERV-CASE",
                preferredOrderEnumId: "SpoMain",
                priceUomId: "USD"
            }),
            secret: call(S + "find#SupplierPrices", {supplierItemCode: "P6-PRIVATE-CODE"}),
            palette: call(C + "find#Products", {text: "P6-PRIVATE-CODE"}),
            ordinary: call(C + "find#Products", {text: "SERV-SUPPLY-01"})
        }))
    },
    then({filtered, secret, palette, ordinary}) {
        filtered.offerRows.length == 1
        filtered.offerRows[0].productId == "BOSS_PRD_PACK"
        secret.offerRows.length == 0
        palette.productList.length == 0
        ordinary.productList.some(r => r.productId === "BOSS_PRD_OWN")
    }
})
feature("supplier writes keep the fixed roles, validate sourcing facts and schedule a new dated native price row", {
    when() {
        return as("catalog.supplier.price.edit", () => {
            const made = invoke(S + "store#SupplierPrice", {
                organizationPartyId: "ORG_ZIZI_SERVICES",
                productId: "BOSS_PRD_OWN",
                vendorPartyId: "BOSS_PRD_SUPPLIER",
                price: 7,
                priceUomId: "USD",
                priceTypeEnumId: "PptCurrent",
                minQuantity: 50,
                quantityUomId: "OTH_ea",
                quantityIncrement: 10,
                otherPartyItemId: "P6-TEST-50",
                standardLeadTimeDays: 2,
                preferredOrderEnumId: "SpoMain",
                canDropShip: "Y"
            })
            const changed = invoke(S + "replace#SupplierPrice", {
                organizationPartyId: "ORG_ZIZI_SERVICES",
                productPriceId: made.productPriceId,
                price: 7.5,
                effectiveDate: new Date(Date.now() + 600000).toISOString(),
                changeReason: "Supplier announced adjustment"
            })
            const refused = invoke(S + "store#SupplierPrice", {
                organizationPartyId: "ORG_ZIZI_SERVICES",
                productId: "BOSS_PRD_OWN",
                vendorPartyId: "ORG_ZIZI_SERVICES",
                price: 1,
                priceUomId: "USD",
                priceTypeEnumId: "PptCurrent"
            })
            const invalid = invoke(S + "store#SupplierPrice", {
                organizationPartyId: "ORG_ZIZI_SERVICES",
                productId: "BOSS_PRD_OWN",
                vendorPartyId: "BOSS_PRD_SUPPLIER",
                price: 7,
                priceUomId: "USD",
                priceTypeEnumId: "PptCurrent",
                minQuantity: 99,
                preferredOrderEnumId: "PptList"
            })
            const reader = as("catalog.supplier.price.read", () =>
                invoke(S + "store#SupplierPrice", {productPriceId: made.productPriceId, price: 0})
            )
            return {
                made,
                changed,
                refused,
                invalid,
                reader,
                old: ec.entity
                    .find(P + "ProductPrice")
                    .condition({productPriceId: made.productPriceId})
                    .disableAuthz()
                    .one()
            }
        })
    },
    then({made, changed, refused, invalid, reader, old}) {
        made.error == ""
        changed.error == ""
        changed.productPriceId != made.productPriceId
        old.thruDate != null
        refused.error.includes("Supplier is not available")
        invalid.error.includes("preferredOrderEnumId")
        reader.error.includes("authority")
    }
})
feature("supplier contact files require contact authority independently of pricing authority", {
    when() {
        return as("catalog.supplier.price.edit", () => ({
            detail: call(S + "get#SupplierDetail", {vendorPartyId: "BOSS_PRD_SUPPLIER"}),
            files: call(F + "get#RecordFiles", {recordEntityName: "mantle.party.Party", recordId: "BOSS_PRD_SUPPLIER"}),
            upload: invoke(F + "upload#RecordFile", {
                recordEntityName: "mantle.party.Party",
                recordId: "BOSS_PRD_SUPPLIER",
                contentFile: uploadedFile("p6-refused.txt", "Not a contact editor")
            })
        }))
    },
    then({detail, files, upload}) {
        detail.supplier.canEditContact == false
        files.canUpload == false
        upload.error.includes("may not add files")
    }
})
const paths = [
    ["Suppliers/SupplierPrices", {organizationPartyId: "ORG_ZIZI_SERVICES"}],
    ["Suppliers/Supplier360", {organizationPartyId: "ORG_ZIZI_SERVICES", vendorPartyId: "BOSS_PRD_SUPPLIER"}],
    ["SupplierPrices/List", {organizationPartyId: "ORG_ZIZI_SERVICES"}],
    ["SupplierPrices/Supplier360", {organizationPartyId: "ORG_ZIZI_SERVICES", vendorPartyId: "BOSS_PRD_SUPPLIER"}],
    ["SupplierPrices/Supplier360/Prices", {organizationPartyId: "ORG_ZIZI_SERVICES", vendorPartyId: "BOSS_PRD_SUPPLIER"}],
    ["SupplierPrices/Supplier360/Documents", {organizationPartyId: "ORG_ZIZI_SERVICES", vendorPartyId: "BOSS_PRD_SUPPLIER"}],
    ["Products/Product360/Suppliers", {productId: "BOSS_PRD_OWN", organizationPartyId: "ORG_ZIZI_SERVICES"}]
]
feature("supplier screen #path renders in #mode with the canonical guarded source", {
    where: paths.flatMap(([path, parameters]) => ["qvt", "html", "tui"].map(mode => ({path, parameters, mode}))),
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
    }
})
feature("a reviewed supplier bulk change pins its buyer and vendor and retries without creating another successor", {
    when() {
        return as("catalog.supplier.price.edit", () => {
            const source = call(S + "store#SupplierPrice", {
                    organizationPartyId: "ORG_ZIZI_SERVICES",
                    productId: "BOSS_PRD_OWN",
                    vendorPartyId: "BOSS_PRD_SUPPLIER",
                    price: 5,
                    priceUomId: "USD",
                    priceTypeEnumId: "PptCurrent",
                    minQuantity: 333,
                    quantityUomId: "OTH_ea"
                }),
                preview = call(C + "preview#PriceChanges", {
                    organizationPartyId: "ORG_ZIZI_SERVICES",
                    vendorPartyId: "BOSS_PRD_SUPPLIER",
                    direction: "purchase",
                    productPriceIds: [source.productPriceId],
                    percentChange: 10,
                    effectiveDate: new Date(Date.now() + 3600000).toISOString(),
                    changeReason: "Reviewed supplier increase"
                }),
                wrong = invoke(C + "apply#PriceChanges", {operationKey: preview.operationKey, previewToken: "wrong"}),
                applied = call(C + "apply#PriceChanges", {
                    operationKey: preview.operationKey,
                    previewToken: preview.previewToken
                }),
                retry = call(C + "apply#PriceChanges", {operationKey: preview.operationKey, previewToken: preview.previewToken}),
                successor = ec.entity
                    .find(P + "ProductPrice")
                    .condition({productPriceId: applied.results[0].successorProductPriceId})
                    .disableAuthz()
                    .one()
            return {preview, wrong, applied, retry, successor}
        })
    },
    then({preview, wrong, applied, retry, successor}) {
        preview.readyCount == 1
        wrong.error.includes("exact reviewed")
        applied.successCount == 1
        retry.successCount == 1
        applied.results[0].successorProductPriceId == retry.results[0].successorProductPriceId
        successor.price == 5.5
        successor.vendorPartyId == "BOSS_PRD_SUPPLIER"
        successor.customerPartyId == "ORG_ZIZI_SERVICES"
    }
})
