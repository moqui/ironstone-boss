suite(
    [
        "AccountingShots",
        "AccountingLedgerWalk",
        "AccountingSettingsWalk",
        "AccountingReceivablesWalk",
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
                "AccountingAccess",
                "AccountingShell",
                "AccountingScreens",
                "AccountingReceivables",
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
