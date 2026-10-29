const CAT = "ironstone.products.CategoryServices.",
    F = "ironstone.products.FeatureServices.",
    C = "ironstone.products.CatalogServices."
const time = Date.now()
function as(user, body) {
    login(user)
    const was = ec.artifactExecution.disableAuthz()
    try {
        return body()
    } finally {
        ec.message.clearErrors()
        if (!was) ec.artifactExecution.enableAuthz()
        login("john.doe")
    }
}
function invoke(name, p) {
    try {
        const out = call(name, p) || {},
            error = ec.message.getErrorsString()
        ec.message.clearErrors()
        return Object.assign({}, out, {error})
    } catch (e) {
        ec.message.clearErrors()
        return {error: String(e.message || e)}
    }
}
const category = id =>
    invoke(CAT + "store#Category", {
        productCategoryId: id,
        categoryName: id,
        productCategoryTypeEnumId: "PctCatalog",
        ownerPartyId: "ORG_ZIZI_SERVICES",
        createOnly: true
    })
const newFeature = id =>
    invoke(F + "store#Feature", {
        productFeatureId: id,
        description: id,
        productFeatureTypeEnumId: "PftColor",
        ownerPartyId: "ORG_ZIZI_SERVICES",
        createOnly: true
    })
spec({
    setupSpec() {
        login("john.doe")
        ec.user.setEffectiveTime(time)
    }
})
feature(
    "multi-parent occurrences remain distinct, branch counts deduplicate members, and moving one dated edge preserves the other",
    {
        when() {
            return as("catalog.edit", () => {
                for (const id of ["P3_A", "P3_B", "P3_C", "P3_CHILD"]) category(id)
                for (const parent of ["P3_A", "P3_B"])
                    call(CAT + "store#CategoryParent", {
                        productCategoryId: "P3_CHILD",
                        parentProductCategoryId: parent,
                        fromDate: time - 10000
                    })
                for (const productCategoryId of ["P3_A", "P3_CHILD"])
                    call(CAT + "store#CategoryRow", {
                        rowKind: "member",
                        productCategoryId,
                        productId: "BOSS_PRD_OWN",
                        fromDate: time - 9000
                    })
                const before = call(CAT + "find#Categories", {allCategories: true}).categoryRows
                const selected = before.find(
                    row => row.productCategoryId === "P3_CHILD" && row.originalParentProductCategoryId === "P3_A"
                )
                const moved = invoke(CAT + "move#CategoryParent", {
                    productCategoryId: selected.productCategoryId,
                    occurrenceId: selected.occurrenceId,
                    originalParentProductCategoryId: selected.originalParentProductCategoryId,
                    fromDate: selected.fromDate,
                    parentProductCategoryId: "P3_C"
                })
                const after = call(CAT + "get#CategoryDetail", {productCategoryId: "P3_CHILD"}).detail
                const cycle = invoke(CAT + "store#CategoryParent", {
                    productCategoryId: "P3_C",
                    parentProductCategoryId: "P3_CHILD",
                    fromDate: time
                })
                return {before, moved, after, cycle}
            })
        },
        then({before, moved, after, cycle}) {
            const occurrences = before.filter(row => row.productCategoryId === "P3_CHILD")
            occurrences.length == 2
            occurrences[0].occurrenceId != occurrences[1].occurrenceId
            before.find(row => row.productCategoryId === "P3_A").branchProductCount == 1
            moved.error == ""
            after.parents.some(row => row.parentProductCategoryId === "P3_A" && Number(row.thruDate) == time)
            after.parents.some(row => row.parentProductCategoryId === "P3_B" && row.thruDate == null)
            after.parents.some(row => row.parentProductCategoryId === "P3_C" && row.thruDate == null)
            cycle.error.includes("cycle")
        }
    }
)
feature("cycles are checked across effective overlaps, while disjoint reciprocal edges are allowed", {
    when() {
        return as("catalog.edit", () => {
            category("P3_DATE_A")
            category("P3_DATE_B")
            const first = invoke(CAT + "store#CategoryParent", {
                productCategoryId: "P3_DATE_A",
                parentProductCategoryId: "P3_DATE_B",
                fromDate: time - 10000,
                thruDate: time - 5000
            })
            const disjoint = invoke(CAT + "store#CategoryParent", {
                productCategoryId: "P3_DATE_B",
                parentProductCategoryId: "P3_DATE_A",
                fromDate: time - 4000,
                thruDate: time - 1000
            })
            const overlap = invoke(CAT + "store#CategoryParent", {
                productCategoryId: "P3_DATE_B",
                parentProductCategoryId: "P3_DATE_A",
                fromDate: time - 6000,
                thruDate: time - 5000
            })
            return {first, disjoint, overlap}
        })
    },
    then({first, disjoint, overlap}) {
        first.error == ""
        disjoint.error == ""
        overlap.error.includes("cycle")
    }
})
feature("feature groups have an owner boundary and shared group writes remain administrator-only", {
    when() {
        const own = as("catalog.edit", () =>
            invoke(F + "store#FeatureGroup", {
                productFeatureGroupId: "P3_GROUP",
                description: "Owned feature group",
                ownerPartyId: "ORG_ZIZI_SERVICES",
                createOnly: true
            })
        )
        const fixtures = as("john.doe", () => ({
            shared: invoke(F + "store#FeatureGroup", {
                productFeatureGroupId: "P3_SHARED_GROUP",
                description: "Shared feature group",
                ownerPartyId: "_NA_",
                createOnly: true
            }),
            other: invoke(F + "store#FeatureGroup", {
                productFeatureGroupId: "P3_OTHER_GROUP",
                description: "Other feature group",
                ownerPartyId: "ORG_ZIZI_RETAIL",
                createOnly: true
            })
        }))
        const editor = as("catalog.edit", () => ({
            list: call(F + "find#FeatureGroups").rows,
            shared: invoke(F + "store#FeatureGroup", {productFeatureGroupId: "P3_SHARED_GROUP", description: "Refused"}),
            other: invoke(F + "get#FeatureGroupDetail", {productFeatureGroupId: "P3_OTHER_GROUP"})
        }))
        return {own, fixtures, editor}
    },
    then({own, fixtures, editor}) {
        own.error == ""
        fixtures.shared.error == ""
        fixtures.other.error == ""
        editor.list.some(row => row.productFeatureGroupId === "P3_GROUP")
        editor.list.some(row => row.productFeatureGroupId === "P3_SHARED_GROUP")
        !editor.list.some(row => row.productFeatureGroupId === "P3_OTHER_GROUP")
        editor.shared.error != ""
        editor.other.error != ""
    }
})
feature("a feature pair cannot be repurposed for another product, and preview reports dependency and incompatible selections", {
    when() {
        return as("catalog.edit", () => {
            for (const id of ["P3_F_A", "P3_F_B", "P3_F_C"]) newFeature(id)
            const dependency = invoke(F + "store#FeatureInteraction", {
                productFeatureId: "P3_F_A",
                toProductFeatureId: "P3_F_B",
                iactnTypeEnumId: "PfitDependency"
            })
            const scoped = invoke(F + "store#FeatureInteraction", {
                productFeatureId: "P3_F_A",
                toProductFeatureId: "P3_F_B",
                iactnTypeEnumId: "PfitCompatible",
                productId: "BOSS_PRD_OWN"
            })
            const incompatible = invoke(F + "store#FeatureInteraction", {
                productFeatureId: "P3_F_B",
                toProductFeatureId: "P3_F_C",
                iactnTypeEnumId: "PfitIncompatible"
            })
            const missing = call(F + "preview#FeatureInteractions", {productId: "BOSS_PRD_OWN", productFeatureIds: ["P3_F_A"]})
            const conflict = call(F + "preview#FeatureInteractions", {
                productId: "BOSS_PRD_OWN",
                productFeatureIds: ["P3_F_A", "P3_F_B", "P3_F_C"]
            })
            const valid = call(F + "preview#FeatureInteractions", {
                productId: "BOSS_PRD_OWN",
                productFeatureIds: ["P3_F_A", "P3_F_B"]
            })
            return {dependency, scoped, incompatible, missing, conflict, valid}
        })
    },
    then({dependency, scoped, incompatible, missing, conflict, valid}) {
        dependency.error == ""
        scoped.error.includes("P3_F_A")
        scoped.error.includes("another product scope")
        incompatible.error == ""
        missing.valid == false
        missing.issues[0].toProductFeatureId == "P3_F_B"
        conflict.valid == false
        valid.valid == true
    }
})
feature("active distinguishing feature meaning is fixed while a description can be renamed", {
    when() {
        as("john.doe", () =>
            call("create#mantle.product.feature.ProductFeatureAppl", {
                productId: "BOSS_PRD_OWN",
                productFeatureId: "P3_F_A",
                fromDate: time - 1000,
                applTypeEnumId: "PfatDistinguishing"
            })
        )
        return as("catalog.edit", () => ({
            meaning: invoke(F + "store#Feature", {productFeatureId: "P3_F_A", abbrev: "NEW"}),
            description: invoke(F + "store#Feature", {productFeatureId: "P3_F_A", description: "Renamed color"}),
            deleted: invoke(F + "delete#UnusedFeature", {productFeatureId: "P3_F_A"})
        }))
    },
    then({meaning, description, deleted}) {
        meaning.error.includes("identifies")
        description.error == ""
        deleted.error.includes("used")
    }
})
feature("readers cannot mutate taxonomy, forged child owners are refused and source links remain scoped", {
    when() {
        return as("catalog.reader", () => ({
            create: category("P3_READER_DENIED"),
            edge: invoke(CAT + "store#CategoryParent", {productCategoryId: "P3_CHILD", parentProductCategoryId: "P3_A"}),
            feature: invoke(F + "store#Feature", {productFeatureId: "P3_F_A", description: "Denied"})
        }))
    },
    then({create, edge, feature}) {
        create.error != ""
        edge.error != ""
        feature.error != ""
    }
})

feature("legacy feature groups with a null owner read as shared and refuse editor mutations", {
    when() {
        as("john.doe", () => {
            call("store#mantle.product.feature.ProductFeatureGroup", {
                productFeatureGroupId: "P3_LEGACY_GROUP",
                description: "Legacy group",
                ownerPartyId: "_NA_"
            })
            call("update#mantle.product.feature.ProductFeatureGroup", {
                productFeatureGroupId: "P3_LEGACY_GROUP",
                ownerPartyId: null
            })
        })
        return as("catalog.edit", () => ({
            detail: invoke(F + "get#FeatureGroupDetail", {productFeatureGroupId: "P3_LEGACY_GROUP"}),
            edit: invoke(F + "store#FeatureGroup", {productFeatureGroupId: "P3_LEGACY_GROUP", description: "Denied"})
        }))
    },
    then({detail, edit}) {
        detail.error == ""
        detail.detail.master.ownerPartyId == "_NA_"
        detail.detail.canEdit == false
        edit.error != ""
    }
})
feature("create-and-apply is atomic and checks the product independently of the new feature owner", {
    when() {
        const results = as("catalog.edit", () => ({
            created: invoke(F + "store#Feature", {
                createOnly: true,
                productFeatureId: "P3_APPLIED",
                description: "Applied value",
                productFeatureTypeEnumId: "PftOther",
                ownerPartyId: "ORG_ZIZI_SERVICES",
                productId: "BOSS_PRD_OWN",
                applTypeEnumId: "PfatStandard"
            }),
            refused: invoke(F + "store#Feature", {
                createOnly: true,
                productFeatureId: "P3_NO_OTHER",
                description: "Denied value",
                productFeatureTypeEnumId: "PftOther",
                ownerPartyId: "ORG_ZIZI_SERVICES",
                productId: "BOSS_PRD_OTHER"
            }),
            identity: invoke(F + "store#Feature", {
                createOnly: true,
                productFeatureId: "P3_NO_IDENTITY",
                description: "Denied identity",
                productFeatureTypeEnumId: "PftOther",
                ownerPartyId: "ORG_ZIZI_SERVICES",
                productId: "BOSS_PRD_OWN",
                applTypeEnumId: "PfatDistinguishing"
            }),
            detail: call(C + "get#ProductDetail", {productId: "BOSS_PRD_OWN"}).detail
        }))
        const absent = as("john.doe", () =>
            ["P3_NO_OTHER", "P3_NO_IDENTITY"].map(
                productFeatureId =>
                    ec.entity.find("mantle.product.feature.ProductFeature").condition({productFeatureId}).one() == null
            )
        )
        return Object.assign(results, {absent})
    },
    then({created, refused, identity, detail, absent}) {
        created.error == ""
        refused.error != ""
        identity.error.includes("Distinguishing")
        detail.featureRows.some(row => row.productFeatureId === "P3_APPLIED")
        absent == [true, true]
    }
})
feature("a keyboard sibling move creates an ordering gap without changing a second parent edge", {
    when() {
        return as("catalog.edit", () => {
            for (const id of ["P3_ORDER_PARENT", "P3_ORDER_OTHER", "P3_ORDER_X", "P3_ORDER_Y", "P3_ORDER_Z"]) category(id)
            for (const id of ["P3_ORDER_X", "P3_ORDER_Y", "P3_ORDER_Z"])
                call(CAT + "store#CategoryParent", {
                    productCategoryId: id,
                    parentProductCategoryId: "P3_ORDER_PARENT",
                    fromDate: time - 1000,
                    sequenceNum: 1
                })
            call(CAT + "store#CategoryParent", {
                productCategoryId: "P3_ORDER_Z",
                parentProductCategoryId: "P3_ORDER_OTHER",
                fromDate: time - 1000,
                sequenceNum: 7
            })
            const root = call(CAT + "find#Categories", {text: "P3_ORDER_PARENT"}).categoryRows[0]
            const children = call(CAT + "find#Categories", {parentOccurrenceId: root.occurrenceId}).categoryRows
            const selected = children.find(row => row.productCategoryId === "P3_ORDER_Z"),
                previous = children.find(row => row.productCategoryId === "P3_ORDER_X")
            const moved = invoke(CAT + "move#CategoryParent", {
                productCategoryId: selected.productCategoryId,
                occurrenceId: selected.occurrenceId,
                originalParentProductCategoryId: "P3_ORDER_PARENT",
                fromDate: selected.fromDate,
                parentOccurrenceId: root.occurrenceId,
                previousSiblingId: previous.occurrenceId
            })
            const ordered = call(CAT + "find#Categories", {parentOccurrenceId: root.occurrenceId}).categoryRows.map(
                row => row.productCategoryId
            )
            const other = call(CAT + "get#CategoryDetail", {productCategoryId: "P3_ORDER_Z"}).detail.parents.find(
                row => row.parentProductCategoryId === "P3_ORDER_OTHER"
            )
            return {moved, ordered, other}
        })
    },
    then({moved, ordered, other}) {
        moved.error == ""
        ordered == ["P3_ORDER_X", "P3_ORDER_Z", "P3_ORDER_Y"]
        other.sequenceNum == 7
        other.thruDate == null
    }
})
