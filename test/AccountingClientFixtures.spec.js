// Browser fixtures persist in the disposable --serve database after server specs finish.
// Use the theme's existing local font fallback instead of depending on external DNS or a Google stylesheet.
spec({
    setupSpec() {
        login("john.doe")
    }
})
feature("Accounting browser fixtures use local theme resources without an external font dependency", {
    when() {
        const key = {screenThemeId: "DEFAULT_QUASAR", resourceTypeEnumId: "STRT_STYLESHEET", sequenceNum: 5}
        const disabled = ec.artifactExecution.disableAuthz()
        try {
            const row = ec.entity.find("moqui.screen.ScreenThemeResource").condition(key).one()
            assert(row, "The browser fixture needs the default Quasar font resource")
            assert(
                !row.resourceValue ||
                    row.resourceValue === "https://fonts.googleapis.com/css?family=Roboto:100,300,400,500,700,900",
                "Only the known external default font resource may be disabled by this fixture"
            )
            if (row.resourceValue) call("update#moqui.screen.ScreenThemeResource", {...key, resourceValue: ""})
            return {
                resource: ec.entity.find("moqui.screen.ScreenThemeResource").condition(key).one(),
                localStyles: Array.from(
                    ec.entity
                        .find("moqui.screen.ScreenThemeResource")
                        .condition({screenThemeId: key.screenThemeId, resourceTypeEnumId: key.resourceTypeEnumId})
                        .list()
                )
                    .filter(item => String(item.resourceValue || "").startsWith("/libs/"))
                    .map(item => item.resourceValue)
            }
        } finally {
            if (!disabled) ec.artifactExecution.enableAuthz()
        }
    },
    then({resource, localStyles}) {
        !resource.resourceValue
        localStyles.includes("/libs/quasar/quasar.prod.css")
        localStyles.includes("/libs/material-symbols/outlined.css")
        localStyles.includes("/libs/material-icons/material-icons.css")
    }
})
