// Browser QA of every Products screen from one table: each page once, light at 1280, and the first page of each group
// also at phone width and in the dark (the shell and the archetypes in both themes and at 390). A group names the user
// who sees its pages, the screenshot prefix and the window height; a page names its path and may wait for a text before
// the shot, open something first (a dialog, a row action) and check what it shows. A check returns "" or what is wrong;
// a page whose check depends on the width (phone: true) is shot at 390 too. About 116 cases, about 2 minutes, so the
// spec is slow: moqui test-client runs it only with --slow, when its screenshots are needed.
//
// UNACCEPTABLE TEST, kept here as the example not to follow. This spec used to run every page at three widths in both
// themes:
//
//     const widths = [390, 1280, 1440]
//     const cases = groups.flatMap((group, g) =>
//         group.pages.flatMap((entry, e) =>
//             widths.flatMap(width => [false, true].map(dark => ({g, e, width, dark, name: group.prefix + "-" + entry.name})))
//         )
//     )
//
// That was 535 cases and 523 seconds, about 9 minutes of a 31-minute ./moq test-all (2026-10-30), for checks (the
// status, no render error, the page's own text) that do not change with the width or the theme. No feature is worth
// that much test time. A width x theme matrix is a bug in the test: check each page once, and check at a width or in a
// theme only what changes there.
const widths = [390, 1280]
const priceRow = (page, label) =>
    page.evaluate(label => {
        const row = Array.from(document.querySelectorAll(".tr")).find(r =>
            r.querySelector('a[href*="productPriceId=BOSS_PRICE_SALES"]')
        )
        const button = row && Array.from(row.querySelectorAll("button")).find(b => b.innerText.trim().endsWith(label))
        if (!button) return false
        button.click()
        return true
    }, label)
const has = text => page => (page.text().includes(text) ? "" : "no " + JSON.stringify(text))
const fitsPhone = (page, width) =>
    width !== 390 || page.evaluate(() => document.documentElement.scrollWidth <= innerWidth) ? "" : "scrolls sideways at 390"
const product360Tabs = [
    "Summary",
    "Features",
    "Categories",
    "Identifiers",
    "Dimensions",
    "Documents",
    "Associations",
    "Parties",
    "Connections",
    "History",
    "KitComponents",
    "Equipment"
]
const groups = [
    {
        prefix: "Products",
        user: "john.doe",
        height: 900,
        pages: [
            ...product360Tabs.map(tab => ({
                name: "Tab" + tab,
                path:
                    "/qapps/Products/Products/Product360/" +
                    tab +
                    "?productId=" +
                    (tab === "KitComponents" ? "DEMO_PA" : tab === "Equipment" ? "EQUIP_1" : "BOSS_PRD_OWN")
            })),
            {name: "NewProduct", path: "/qapps/Products/Products/NewProduct"},
            {name: "Home", path: "/qapps/Products/Home"},
            {name: "Products", path: "/qapps/Products/Products?text=catalog%20sample"},
            {
                name: "Product360",
                path: "/qapps/Products/Products/Product360?productId=BOSS_PRD_OWN",
                check: has("Services catalog sample")
            },
            {
                name: "CategoryDetail",
                path: "/qapps/Products/Categories/CategoryDetail?productCategoryId=BOSS_PRD_CAT",
                check: has("Services catalog")
            },
            {name: "Categories", path: "/qapps/Products/Categories"},
            {name: "Features", path: "/qapps/Products/Features"},
            {name: "Prices", path: "/qapps/Products/Prices"},
            {name: "SupplierPrices", path: "/qapps/Products/SupplierPrices"},
            {name: "Documents", path: "/qapps/Products/Documents"},
            {name: "Units", path: "/qapps/Products/Units"},
            {name: "Settings", path: "/qapps/Products/Settings"}
        ]
    },
    {
        prefix: "Taxonomy",
        user: "john.doe",
        height: 900,
        pages: [
            {
                name: "Categories",
                path: "/qapps/Products/Categories?text=Services%20catalog",
                check: page =>
                    page.locator("[data-tree-key]").count() < 2
                        ? "no category tree"
                        : page.text().includes("No results found")
                          ? "no categories"
                          : ""
            },
            {name: "NewCategory", path: "/qapps/Products/Categories/NewCategory"},
            {
                name: "Features",
                path: "/qapps/Products/Features",
                check: page => (page.text().includes("No results found") ? "no features" : "")
            },
            {name: "NewFeature", path: "/qapps/Products/Features/NewFeature"},
            {name: "Interactions", path: "/qapps/Products/Features/FeatureInteractions"},
            {
                name: "Groups",
                path: "/qapps/Products/Features/FeatureGroups",
                check: page => (page.text().includes("No results found") ? "no groups" : "")
            },
            {name: "NewGroup", path: "/qapps/Products/Features/FeatureGroups/NewGroup"},
            ...["Summary", "Parents", "Products", "FeatureDefaults", "Identifiers"].map(tab => ({
                name: "Category" + tab,
                path: "/qapps/Products/Categories/CategoryDetail/" + tab + "?productCategoryId=BOSS_PRD_CAT"
            })),
            ...["Summary", "Groups", "Products", "Interactions"].map(tab => ({
                name: "Feature" + tab,
                path: "/qapps/Products/Features/FeatureDetail/" + tab + "?productFeatureId=BOSS_PRD_FEATURE"
            })),
            ...["Summary", "Features", "Categories"].map(tab => ({
                name: "Group" + tab,
                path: "/qapps/Products/Features/FeatureGroups/FeatureGroupDetail/" + tab + "?productFeatureGroupId=BOSS_PRD_GROUP"
            })),
            {
                name: "ProductTags",
                path: "/qapps/Products/Products/Product360/Summary?productId=BOSS_PRD_OWN",
                check: has("Ready for review")
            },
            {name: "TagFind", path: "/qapps/Products/Products?tagIds=BOSS_PRD_TAG", check: has("Services catalog sample")}
        ]
    },
    {
        prefix: "Variants",
        user: "john.doe",
        height: 1000,
        pages: [
            {
                name: "Builder",
                path: "/qapps/Products/Products/VariantBuilder?productId=BOSS_PRD_VIRT",
                // a list at phone width, the matrix wider
                phone: true,
                ready: () => !!document.querySelector("[data-feature-key]"),
                check: (page, width) =>
                    !page.text().includes("Choose combinations · 4")
                        ? "no combination count"
                        : page.locator(width === 390 ? "[data-variant-list]" : "[data-variant-matrix]").count() !== 1
                          ? "not the " + (width === 390 ? "list" : "matrix") + " at " + width
                          : ""
            },
            {
                name: "CombinationList",
                path: "/qapps/Products/Products/VariantBuilderTui?productId=BOSS_PRD_VIRT",
                check: has("BOSS_VAR_BLUE")
            },
            {name: "VariantSettings", path: "/qapps/Products/Settings/VariantSettings?organizationPartyId=ORG_ZIZI_SERVICES"},
            {
                name: "VirtualProductFeatures",
                path: "/qapps/Products/Products/Product360/Features?productId=BOSS_PRD_VIRT",
                check: has("Build variants")
            }
        ]
    },
    {
        prefix: "Prices",
        user: "john.doe",
        height: 1000,
        pages: [
            {name: "Prices", path: "/qapps/Products/Prices?productId=BOSS_PRD_OWN"},
            {
                name: "PriceHistory",
                path: "/qapps/Products/Prices/PriceHistory?productId=BOSS_PRD_OWN&organizationPartyId=ORG_ZIZI_SERVICES"
            },
            {
                name: "BulkPrice",
                path: "/qapps/Products/Products/BulkPrice?productPriceIds=BOSS_PRICE_SALES&organizationPartyId=ORG_ZIZI_SERVICES"
            },
            {
                name: "BulkPriceSelected",
                path: "/qapps/Products/Products/BulkPrice?productIds=BOSS_PRD_OWN",
                check: has("Selected products")
            },
            {name: "ProductPrices", path: "/qapps/Products/Products/Product360/Prices?productId=BOSS_PRD_OWN"},
            {
                name: "NewSalesPrice",
                path: "/qapps/Products/Prices?productId=BOSS_PRD_OWN",
                open: page => page.getByRole("button", {name: "New sales price", exact: true}).click()
            },
            {
                name: "SchedulePrice",
                path: "/qapps/Products/Prices?productId=BOSS_PRD_OWN",
                open: page => priceRow(page, "Schedule")
            },
            {name: "EndPrice", path: "/qapps/Products/Prices?productId=BOSS_PRD_OWN", open: page => priceRow(page, "End")}
        ]
    },
    {
        prefix: "PricePolicy",
        user: "john.doe",
        height: 1000,
        pages: [
            {name: "Lists", path: "/qapps/Products/Prices/PriceLists"},
            {name: "Detail", path: "/qapps/Products/Prices/PriceLists/PriceListDetail?priceListId=BOSS_PRICE_LIST"},
            {
                name: "Explain",
                path: "/qapps/Products/Prices/PriceExplain?productId=BOSS_PRD_OWN&organizationPartyId=ORG_ZIZI_SERVICES"
            },
            {name: "Settings", path: "/qapps/Products/Settings/PricingSettings?organizationPartyId=ORG_ZIZI_SERVICES"},
            {
                name: "NewList",
                path: "/qapps/Products/Prices/PriceLists",
                open: page => page.getByRole("button", {name: "New price list", exact: true}).click()
            },
            {
                name: "NewRule",
                path: "/qapps/Products/Prices/PriceLists/PriceListDetail?priceListId=BOSS_PRICE_LIST",
                open: page => page.getByRole("button", {name: "New rule", exact: true}).click()
            }
        ]
    },
    {
        prefix: "Supplier",
        user: "john.doe",
        height: 1100,
        pages: [
            {
                name: "Offers",
                path: "/qapps/Products/SupplierPrices/List?organizationPartyId=ORG_ZIZI_SERVICES&vendorPartyId=BOSS_PRD_SUPPLIER"
            },
            {
                name: "Retail",
                path: "/qapps/Products/SupplierPrices/List?organizationPartyId=ORG_ZIZI_RETAIL&vendorPartyId=BOSS_PRD_SUPPLIER"
            },
            {
                name: "Supplier",
                path: "/qapps/Products/SupplierPrices/Supplier360?organizationPartyId=ORG_ZIZI_SERVICES&vendorPartyId=BOSS_PRD_SUPPLIER"
            },
            {
                name: "Documents",
                path: "/qapps/Products/SupplierPrices/Supplier360/Documents?organizationPartyId=ORG_ZIZI_SERVICES&vendorPartyId=BOSS_PRD_SUPPLIER"
            },
            {
                name: "Product",
                path: "/qapps/Products/Products/Product360/Suppliers?organizationPartyId=ORG_ZIZI_SERVICES&productId=BOSS_PRD_OWN"
            }
        ]
    },
    {
        prefix: "Inventory",
        user: "catalog.stock.plan",
        height: 1100,
        pages: ["Summary", "Projection", "Policy"].map(tab => ({
            name: tab,
            path: "/qapps/Products/Products/Product360/Stock/" + tab + "?productId=BOSS_PRD_OWN&facilityId=BOSS_PRD_WH",
            // a stock planner without cost authority sees no valuation
            check: page => (page.text().includes("510.98") ? "shows a valuation" : "")
        }))
    },
    {
        prefix: "Method",
        user: "catalog.method",
        height: 1100,
        pages: ["Overview", "BillOfMaterialsExplosion", "BillOfMaterialsCompare", "WhereUsed", "RoutingDetail"].map(tab => ({
            name: tab,
            path: "/qapps/Products/Products/Product360/BOM/" + tab + "?productId=DEMO_1_1",
            ready: () => document.querySelector(".q-page")?.innerText.includes("Compare dates"),
            // an engineer without cost authority sees no rates
            check: page => (page.text().includes("Hourly amount") ? "shows a rate" : "")
        }))
    },
    {
        prefix: "Cost",
        user: "catalog.cost.estimate",
        height: 1100,
        pages: [
            ["StandardCosts", "Standard costs"],
            ["CostRollup", "Cost roll-up"],
            ["CostHistory", "Cost history"]
        ].map(([tab, title]) => ({
            name: tab,
            path: "/qapps/Products/Prices/" + tab + "?productId=BOSS_PRD_OWN&productStandardCostId=BOSS_COST_SAMPLE",
            wait: title
        }))
    },
    {
        prefix: "Documents",
        user: "catalog.edit",
        height: 1100,
        pages: [
            {name: "list", path: "/qapps/Products/Documents?productId=BOSS_PRD_OWN"},
            {name: "cards", path: "/qapps/Products/Documents?productId=BOSS_PRD_OWN&view=cards"},
            {name: "detail", path: "/qapps/Products/DocumentDetail?productId=BOSS_PRD_OWN&productContentId=BOSS_CONTENT_SAMPLE"},
            {name: "translations", path: "/qapps/Products/Translations?productId=BOSS_PRD_OWN"},
            {name: "category", path: "/qapps/Products/Categories/CategoryDetail/Content?productCategoryId=BOSS_PRD_CAT"}
        ]
    },
    {
        prefix: "Tools",
        user: "catalog.reader",
        height: 1100,
        pages: [
            {name: "units", path: "/qapps/Products/Units/Index?text=kilogram&uomId=WT_kg&toUomId=WT_g"},
            {name: "packaging", path: "/qapps/Products/Units/Packaging?baseProductId=BOSS_PRD_OWN&scanId=BOSS_PACK_12"},
            // label guidance and controls fit the phone width
            {name: "labels", path: "/qapps/Products/Units/Labels?operationKey=BOSS_LABEL_SAMPLE", check: fitsPhone, phone: true}
        ]
    },
    {
        prefix: "Tools",
        user: "catalog.admin",
        height: 1100,
        pages: [{name: "identifiers", path: "/qapps/Products/Settings/IdentificationTypes?organizationPartyId=ORG_ZIZI_SERVICES"}]
    },
    {
        prefix: "Catalog",
        user: "catalog.edit",
        height: 1100,
        pages: [
            {
                name: "import",
                path: "/qapps/Products/ProductImport?operationKey=BOSS_IMPORT_SAMPLE_RUN",
                wait: "Product name is required",
                check: fitsPhone,
                phone: true
            }
        ]
    }
]
// each page light at 1280; the first page of a group also at 390 and dark at 1280; a phone: true page also at 390
const variants = (entry, e) =>
    e === 0
        ? [{width: 1280, dark: false}, {width: 390, dark: false}, {width: 1280, dark: true}]
        : entry.phone
          ? [{width: 1280, dark: false}, {width: 390, dark: false}]
          : [{width: 1280, dark: false}]
// a case names its group and page by index: the table keeps the functions
const cases = groups.flatMap((group, g) =>
    group.pages.flatMap((entry, e) =>
        variants(entry, e).map(({width, dark}) => ({g, e, width, dark, name: group.prefix + "-" + entry.name}))
    )
)
// one page per user and width, signed in once before the cases
let pages = {}
const pageFor = (user, width) => pages[user + ":" + width]
spec({
    // about 2 minutes: over 30 seconds
    slow: true,
    setupSpec() {
        for (const group of groups)
            for (const width of widths) {
                const key = group.user + ":" + width
                if (pages[key]) continue
                pages[key] = browser.newPage({user: group.user, viewport: {width, height: group.height}, timeout: 30})
                // the demo accounts have no photo; the shell falls back to their initials
                pages[key].allowProblems(/userPhoto\?userId=/)
            }
    }
})
feature("Products #name at #width dark=#dark", {
    where: cases,
    expect({g, e, width, dark, name}) {
        const group = groups[g],
            entry = group.pages[e],
            page = pageFor(group.user, width)
        page.goto(entry.path).status == 200
        if (entry.wait) page.waitFor(text => document.querySelector(".q-page")?.innerText.includes(text), {arg: entry.wait})
        else
            page.waitFor(() => {
                const box = document.querySelector(".q-page")
                return !!(
                    box &&
                    box.innerText.trim().length > 20 &&
                    !document.querySelector(".q-loading-bar--visible, .q-inner-loading") &&
                    !(window.moqui && window.moqui.webrootVue && window.moqui.webrootVue.loading)
                )
            })
        if (entry.ready) page.waitFor(entry.ready)
        page.settle()
        page.evaluate(dark => {
            document.querySelector("#apps-root").__vue_app__.config.globalProperties.$q.dark.set(!!dark)
            return true
        }, dark) == true
        page.waitFor(dark => document.body.classList.contains("body--dark") === !!dark, {arg: dark})
        const opened = entry.open ? entry.open(page) !== false : true
        opened == true
        page.settle()
        page.waitFor(() =>
            document
                .getAnimations()
                .filter(a => a.effect?.getTiming().iterations !== Infinity)
                .every(a => a.playState !== "running")
        )
        !/Error rendering|Exception in render|is not written yet/.test(page.text())
        const problem = entry.check ? entry.check(page, width) : ""
        problem == ""
        page.screenshot(name + "-" + width + (dark ? "-dark" : "-light"), {fullPage: true})
    }
})
feature("an effective scoped price list prints without its editing controls", {
    expect() {
        const page = pageFor("john.doe", 1280)
        page.goto("/apps/Products/Prices/PriceLists/PriceListDetail?priceListId=BOSS_PRICE_LIST&renderMode=html-print").status ==
            200
        page.waitFor(() => document.body.innerText.includes("BOSS_PRICE_RULE"))
        !page.text().includes("Publish reviewed list")
        page.screenshot("PricePolicy-effective-print", {fullPage: true})
    }
})
