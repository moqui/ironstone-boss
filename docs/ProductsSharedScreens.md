# Shared catalog screens

`ironstone.products.CatalogServices.get#SharedContext` is the app boundary for catalog mounts. It derives capabilities and organization scope from the actual user and supplies route aliases, raw-output bases, and Product360 tabs. Request-supplied capability maps and tab lists do not grant access. Only the Products branch is implemented; other roots fail closed.

To add an app context:

1. Add its authorized branch in `service/ironstone/products/SharedContext.js`, using the app's actual access policy and native permissions. Return its supported Product360 tab names and override route aliases where its screen paths differ.
2. Mount the needed Shared screens under that app and pass `appRoot` through its links and forms. Shared controllers preserve the route through nested catalog calls with a scope local to each invocation.
3. Grant the owning Mantle permissions to that app's groups. Mantle services independently check permissions, organization membership, and record ownership; the routing branch cannot replace those checks.
4. Extend `test/ProductsSharedContext.spec.js` with the new branch's allowed and denied reads, writes, links, and exports, with artifact authorization enabled and disabled.

Product360 derives its tab list on the server. Physical tabs and separately mounted Stock, Prices, Suppliers, BOM, Costs, and Packaging screens use the same list when nested under Product360. Relative navigation stays within the mount; cross-screen catalog links use `sharedLinks`. Downloads use `printBase` rather than a launcher literal.

Connections checks actual root authorizations directly, independently of inherited screen authorization and disabled artifact authorization. It then checks entity and native parent-record visibility. It does not infer access from another app's group name. An app whose root has no grant contributes no transaction identifiers.
