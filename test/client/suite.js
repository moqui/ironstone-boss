suite(
    [
        "AccountingShots",
        "AccountingLedgerWalk",
        "AccountingSettingsWalk",
        "AccountingReceivablesWalk",
        "AccountingSettlementWalk",
        "ProductsShots",
        "ProductsWalk",
        "ProductsTaxonomyWalk",
        "ProductsVariantWalk",
        "ProductsPriceWalk",
        "ProductsPriceListWalk",
        "ProductsCatalogSettings",
        "ProductsSupplierWalk",
        "ProductsInventoryWalk",
        "ProductsMethodWalk",
        "ProductsCostWalk",
        "ProductsDocumentWalk",
        "ProductsToolsWalk",
        "ProductsChecks",
        "ProductsImportWalk",
        "ProductsFinish"
    ],
    {
        server: {
            components: ["mr-boss"],
            specs: [
                "AccountingClientFixtures",
                "AccountingAccess",
                "AccountingShell",
                "AccountingScreens",
                "AccountingReceivables",
                "AccountingSettlement",
                "ProductsAccess",
                "ProductsShell",
                "ProductsPriceFixtures",
                "ProductsInventoryFixtures",
                "ProductsMethodFixtures",
                "ProductsCostFixtures",
                "ProductsToolsFixtures",
                "ProductsImportFixtures"
            ],
            conf: "conf/MoquiDevConf.xml"
        }
    }
)
