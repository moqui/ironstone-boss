// The contact import wizard (screen/Commons/Contacts/Import.xml and its steps; design-drawers-commons.md §6 ContactImport; impl M4): step
// by step as the wizard's Next posts each step's form, for a Google Contacts CSV (test/files/contacts-google.csv: two new people and Mary
// Doe, already john.doe's personal contact, skipped as a duplicate) and a vCard (test/files/contacts.vcf: Ada Lovelace new, Robin Fischer
// updated with the card's phone), and a CSV with a row that fails, whose failures download as CSV. Between the steps the draft is in
// john.doe's own folder of the resource store (dbresource://ironstone/ContactImport/EX_JOHN_DOE/<importId>/), which another user's
// wizard never reads. Authorization stays on, as for a browser request.
// Run: ./moq test mr-boss --spec ContactImport
const webroot = "component://webroot/screen/webroot.xml"
const commons = "component://mr-boss/screen/Commons.xml"
const demo = "component://mr-boss/test/files"

function render(path, parameters) {
    const str = ec.screen.makeTest().rootScreen(webroot).renderMode("qvt").withStaticData().render(path, Object.assign({ lastStandalone: "true" }, parameters || {}), null)
    const output = String(str.output || "")
    ec.message.clearErrors()
    return { status: str.status, errors: str.errorMessages.join(" | "), output, broken: /Error rendering|Exception in render/.test(output) }
}
function post(path, parameters) {
    const str = ec.screen.makeTest().rootScreen(commons).render(path, parameters || {}, "post")
    const output = String(str.output || "")
    ec.message.clearErrors()
    return { status: str.status, errors: str.errorMessages.join(" | "), output }
}
function sys(run) {
    const wasDisabled = ec.artifactExecution.disableAuthz()
    try { return run() } finally { if (!wasDisabled) ec.artifactExecution.enableAuthz() }
}
const current = (entityName, fields) => sys(() => Array.from(ec.entity.find(entityName).condition(fields)
        .condition(ec.entity.conditionFactory.makeConditionDate("fromDate", "thruDate", null)).list()))
// the newest import of the user (an import id is the time it started and a random number)
function newestImport(userId) {
    const folder = ec.resource.getLocationReference(`dbresource://ironstone/ContactImport/${userId}`)
    const ids = sys(() => Array.from(folder.getDirectoryEntries() || []).map((entry) => entry.getFileName())).filter((name) => /^\d+-\d+$/.test(name))
    ids.sort((a, b) => Number(a.split("-")[0]) - Number(b.split("-")[0]))
    return ids.length ? ids[ids.length - 1] : null
}
const draftOf = (userId, importId) => JSON.parse(sys(() => ec.resource.getLocationReference(`dbresource://ironstone/ContactImport/${userId}/${importId}/draft.json`).getText()) || "{}")
// the mapping step's fields as the wizard posts them: each column's target, as the step shows it
function mappingFields(importId, change) {
    const draft = draftOf("EX_JOHN_DOE", importId)
    const parsed = sys(() => call("mantle.party.ContactImportServices.parse#ContactFile", {
        fileLocation: `dbresource://ironstone/ContactImport/EX_JOHN_DOE/${importId}/source.${draft.fileExt}`,
        fileName: `source.${draft.fileExt}`, presetId: draft.fileKind === "csv" ? draft.presetId : null, sampleSize: 1 }))
    const fields = { importId }
    Array.from(parsed.columnList || []).forEach((column, index) => {
        const target = change && Object.prototype.hasOwnProperty.call(change, column.columnName) ? change[column.columnName] : (draft.columnMapping || {})[column.columnName]
        fields["col_" + index] = target || ""
    })
    return fields
}
const personByEmail = (email) => sys(() => {
    const info = ec.entity.find("mantle.party.contact.PartyContactMechInfo").condition("infoString", email).condition("contactMechTypeEnumId", "CmtEmailAddress").list()
    return Array.from(info).map((row) => ec.entity.find("mantle.party.PartyDetail").condition("partyId", row.partyId).one())
})
let googleId, vcardId, badId

spec({
    stepwise: true,
    setupSpec() { login("john.doe") },
})

feature("the wizard shows its five steps, Source first", {
    when() {
        // the wizard's own screen, as its root
        const str = sys(() => ec.screen.makeTest().rootScreen("component://mr-boss/screen/Commons/Contacts/Import.xml").renderMode("qvt").withStaticData().render("", {}, null))
        const shown = { status: str.status, errors: str.errorMessages.join(" | "), output: String(str.output || ""), broken: /Error rendering|Exception in render/.test(String(str.output || "")) }
        ec.message.clearErrors()
        return { shown, source: render("apps/Commons/Contacts/Import/Source", {}) }
    },
    then({ shown, source }) {
        shown.status == 200
        shown.errors == ""
        !shown.broken
        shown.output.includes("m-subscreens-wizard")
        shown.output.includes('finish-text="Import"')
        source.output.includes("Google Contacts CSV")
        source.output.includes("Outlook CSV")
        source.output.includes("vCard")
        source.output.includes("Character set")
    },
})

feature("Google CSV, step 1: the file is kept in john.doe's import folder and parsed as the Google preset", {
    when() {
        const text = ec.resource.getLocationReference(`${demo}/contacts-google.csv`).getText()
        const empty = post("Contacts/Import/Source/saveSource", { presetId: "", characterSet: "UTF-8" })
        const saved = post("Contacts/Import/Source/saveSource", { contactFile: uploadedFile("contacts-google.csv", text, "text/csv"), presetId: "", characterSet: "UTF-8" })
        googleId = newestImport("EX_JOHN_DOE")
        return { empty, saved, draft: draftOf("EX_JOHN_DOE", googleId), source: render("apps/Commons/Contacts/Import/Source", { importId: googleId }) }
    },
    then({ empty, saved, draft, source }) {
        empty.errors.includes("Choose a vCard or CSV file")
        saved.errors == ""
        googleId != null
        draft.fileName == "contacts-google.csv"
        draft.fileKind == "csv"
        draft.presetId == "google"
        draft.rowCount == 3
        draft.columnMapping["E-mail 1 - Value"] == "email1"
        draft.columnMapping["Labels"] == "groups"
        // the server-static step composes "Now: <file> (<rows> contacts, CSV)" in the browser from the draft's data
        source.output.includes("Now: ")
        source.output.includes("contacts-google.csv")
    },
})

feature("Google CSV, step 2: the mapping shows each column with its first values and the preset's target; Next saves it", {
    when() {
        const shown = render("apps/Commons/Contacts/Import/Mapping", { importId: googleId })
        // leave the notes out
        const saved = post("Contacts/Import/Mapping/saveMapping", mappingFields(googleId, { "Notes": "" }))
        const draft = draftOf("EX_JOHN_DOE", googleId)
        const auto = post("Contacts/Import/Mapping/autoMap", { importId: googleId })
        const back = draftOf("EX_JOHN_DOE", googleId)
        post("Contacts/Import/Mapping/saveMapping", mappingFields(googleId, { "Notes": "" }))
        return { shown, saved, draft, auto, back }
    },
    then({ shown, saved, draft, auto, back }) {
        shown.errors == ""
        !shown.broken
        shown.output.includes("E-mail 1 - Value · grace.hopper@navy.example, mary.doe@example.com")
        shown.output.includes("Google Contacts CSV")
        shown.output.includes("Auto-map")
        saved.errors == ""
        draft.status == "mapped"
        draft.columnMapping["Notes"] == null
        draft.columnMapping["First Name"] == "firstName"
        auto.errors == ""
        back.columnMapping["Notes"] == "notes"
    },
})

feature("Google CSV, step 3: the options (john.doe's book, a new group, skip duplicates) are kept", {
    when() {
        const shown = render("apps/Commons/Contacts/Import/Options", { importId: googleId })
        const saved = post("Contacts/Import/Options/saveOptions", { importId: googleId, asPersonal: "Y", contactBookId: "BOSS_DEMO_BOOK_JD",
            groupNames: "Imported", duplicatePolicy: "skip", useFileGroups: "Y" })
        return { shown, saved, draft: draftOf("EX_JOHN_DOE", googleId) }
    },
    then({ shown, saved, draft }) {
        shown.errors == ""
        shown.output.includes("My personal contacts (only I see them)")
        shown.output.includes("Skip it")
        saved.errors == ""
        draft.options.contactBookId == "BOSS_DEMO_BOOK_JD"
        draft.options.duplicatePolicy == "skip"
        draft.options.asPersonal == true
        draft.options.groupNames == "Imported"
    },
})

feature("Google CSV, step 4: the preview creates Grace and Alan and skips Mary as a duplicate by email, writing nothing", {
    when() {
        const shown = render("apps/Commons/Contacts/Import/Preview", { importId: googleId })
        const confirmed = post("Contacts/Import/Preview/confirmPreview", { importId: googleId })
        return { shown, confirmed, grace: personByEmail("grace.hopper@navy.example") }
    },
    then({ shown, confirmed, grace }) {
        shown.errors == ""
        !shown.broken
        shown.output.includes("3 rows: 2 to create, 0 to update, 1 to skip, 0 with problems")
        shown.output.includes("Mary Doe · same email")
        shown.output.includes("Grace Hopper")
        confirmed.errors == ""
        grace.length == 0
    },
})

feature("Google CSV, step 5: Import creates two personal contacts in the book with the file's and the new groups, Mary skipped", {
    when() {
        const ready = render("apps/Commons/Contacts/Import/Result", { importId: googleId })
        const ran = post("Contacts/Import/Result/runImport", { importId: googleId })
        const result = render("apps/Commons/Contacts/Import/Result", { importId: googleId, done: "Y" })
        const grace = personByEmail("grace.hopper@navy.example")[0]
        const groups = sys(() => Array.from(ec.entity.find("mantle.party.contact.ContactBookGroup").condition("contactBookId", "BOSS_DEMO_BOOK_JD").list()))
        const graceGroups = grace ? sys(() => Array.from(ec.entity.find("mantle.party.contact.ContactBookGroupParty").condition("partyId", grace.partyId).list()))
                .map((row) => (groups.find((group) => group.contactBookGroupId === row.contactBookGroupId) || {}).groupName) : []
        return { ready, ran, result, grace, graceGroups, draft: draftOf("EX_JOHN_DOE", googleId),
            graceInBook: grace ? current("mantle.party.contact.ContactBookParty", { partyId: grace.partyId, contactBookId: "BOSS_DEMO_BOOK_JD" }).length : 0,
            maryPhones: current("mantle.party.contact.PartyContactMechTelecomNumber", { partyId: "BOSS_DEMO_PC_MARY" }).map((row) => row.contactNumber) }
    },
    then({ ready, ran, result, grace, graceGroups, draft, graceInBook, maryPhones }) {
        ready.output.includes("Ready to import")
        ready.output.includes("3 rows of contacts-google.csv as your personal contacts into My Contacts, duplicates skipped.")
        ran.errors == ""
        draft.status == "done"
        draft.result.createdCount == 2
        draft.result.skippedCount == 1
        draft.result.failedCount == 0
        result.output.includes("Imported")
        result.output.includes("q-linear-progress")
        result.output.includes("Open My Contacts")
        grace.privateOwnerUserId == "EX_JOHN_DOE"
        grace.firstName == "Grace"
        graceInBook == 1
        graceGroups.includes("Friends")
        graceGroups.includes("Imported")
        !maryPhones.includes("010-0199")
    },
})

feature("vCard: step by step with the update policy, Ada Lovelace is created and Robin Fischer gets the card's phone", {
    when() {
        const text = ec.resource.getLocationReference(`${demo}/contacts.vcf`).getText()
        const saved = post("Contacts/Import/Source/saveSource", { contactFile: uploadedFile("contacts.vcf", text, "text/vcard"), presetId: "vcard", characterSet: "UTF-8" })
        vcardId = newestImport("EX_JOHN_DOE")
        const parsedDraft = draftOf("EX_JOHN_DOE", vcardId)
        const mapping = render("apps/Commons/Contacts/Import/Mapping", { importId: vcardId })
        const mapped = post("Contacts/Import/Mapping/saveMapping", mappingFields(vcardId))
        const options = post("Contacts/Import/Options/saveOptions", { importId: vcardId, asPersonal: "Y", contactBookId: "BOSS_DEMO_BOOK_JD", duplicatePolicy: "update", useFileGroups: "N" })
        const preview = render("apps/Commons/Contacts/Import/Preview", { importId: vcardId })
        post("Contacts/Import/Preview/confirmPreview", { importId: vcardId })
        const ran = post("Contacts/Import/Result/runImport", { importId: vcardId })
        return { saved, parsedDraft, mapping, mapped, options, preview, ran, draft: draftOf("EX_JOHN_DOE", vcardId),
            ada: personByEmail("ada@engine.example")[0],
            robinPhones: current("mantle.party.contact.PartyContactMechTelecomNumber", { partyId: "BOSS_DEMO_PC_ROBIN" }).map((row) => row.contactNumber),
            robinCount: personByEmail("robin.fischer@example.org").length }
    },
    then({ saved, parsedDraft, mapping, mapped, options, preview, ran, draft, ada, robinPhones, robinCount }) {
        saved.errors == ""
        parsedDraft.fileKind == "vcard"
        parsedDraft.rowCount == 2
        mapping.errors == ""
        mapping.output.includes("vCard")
        mapped.errors == ""
        options.errors == ""
        preview.output.includes("2 rows: 1 to create, 1 to update, 0 to skip")
        preview.output.includes("Robin Fischer · same email")
        ran.errors == ""
        draft.result.createdCount == 1
        draft.result.updatedCount == 1
        ada.firstName == "Ada"
        ada.lastName == "Lovelace"
        ada.privateOwnerUserId == "EX_JOHN_DOE"
        robinPhones.length == 2
        robinCount == 1
    },
})

feature("a row that fails is listed with its reason, the others are imported, and the failures download as CSV", {
    when() {
        const text = "First Name,Last Name,E-mail Address\r\nLinus,Pauling,linus@chem.example\r\nBad,Email,not an email address\r\n"
        post("Contacts/Import/Source/saveSource", { contactFile: uploadedFile("people.csv", text, "text/csv"), presetId: "outlook", characterSet: "WINDOWS-1252" })
        badId = newestImport("EX_JOHN_DOE")
        post("Contacts/Import/Mapping/saveMapping", mappingFields(badId))
        post("Contacts/Import/Options/saveOptions", { importId: badId, asPersonal: "Y", duplicatePolicy: "skip" })
        const ran = post("Contacts/Import/Result/runImport", { importId: badId })
        const result = render("apps/Commons/Contacts/Import/Result", { importId: badId })
        const failures = post("Contacts/Import/Result/failuresCsv", { importId: badId })
        return { ran, result, failures, draft: draftOf("EX_JOHN_DOE", badId), linus: personByEmail("linus@chem.example")[0] }
    },
    then({ ran, result, failures, draft, linus }) {
        ran.errors == ""
        draft.presetId == "outlook"
        draft.characterSet == "WINDOWS-1252"
        draft.result.createdCount == 1
        draft.result.failedCount == 1
        draft.result.failureList[0].rowNumber == 2
        result.output.includes("Rows that failed")
        result.output.includes("Download the failures (CSV)")
        failures.output.startsWith("Row,Error,")
        failures.output.includes("not an email address")
        linus.firstName == "Linus"
    },
})

feature("the generic preset maps by header words, and the ISO-8859-1 choice keeps plain text as it is", {
    when() {
        // a spec's upload is text (UTF-8), so only plain ASCII goes through the single-byte decoding here
        const text = "Name,Email\r\nRene Descartes,rene@cogito.example\r\n"
        post("Contacts/Import/Source/saveSource", { contactFile: uploadedFile("latin.csv", text, "text/csv"), presetId: "generic", characterSet: "ISO-8859-1" })
        const id = newestImport("EX_JOHN_DOE")
        return { draft: draftOf("EX_JOHN_DOE", id),
            source: sys(() => ec.resource.getLocationReference(`dbresource://ironstone/ContactImport/EX_JOHN_DOE/${id}/source.csv`).getText()) }
    },
    then({ draft, source }) {
        draft.presetId == "generic"
        draft.columnMapping["Name"] == "fullName"
        draft.columnMapping["Email"] == "email1"
        source.includes("Rene Descartes,rene@cogito.example")
    },
})

// A file of more than 100 rows (or background) is imported as a job: runImport answers at once with the draft running, the
// user hears how far it is on the topic contactImportProgress (every 25 rows and at the end; the notification capture listens
// as the server's socket does), and the draft ends done. The Result step shows the progress while it runs.
feature("a large import runs as a job: the draft runs, progress every 25 rows and at the end, then the result", {
    when() {
        const lines = ["First Name,Last Name,E-mail Address"]
        // named to sort after the demo contacts, so the Contacts list spec still finds them on its first page in a full run
        for (let n = 1; n <= 30; n++) lines.push(`Zz Batch${n},Jobspec,batch${n}@jobs.example`)
        post("Contacts/Import/Source/saveSource", { contactFile: uploadedFile("batch.csv", lines.join("\r\n") + "\r\n", "text/csv"), presetId: "outlook", characterSet: "UTF-8" })
        const id = newestImport("EX_JOHN_DOE")
        post("Contacts/Import/Mapping/saveMapping", mappingFields(id))
        post("Contacts/Import/Options/saveOptions", { importId: id, asPersonal: "Y", duplicatePolicy: "skip" })
        const capture = ec.factory.getTool("NotificationCapture")
        capture.enable()
        capture.clear()
        try {
            const ran = post("Contacts/Import/Result/runImport", { importId: id, background: "Y" })
            ec.factory.waitWorkerPoolEmpty(600)
            const messages = capture.getMessages("contactImportProgress").filter((row) => row.message && row.message.progressKey === id)
            return { ran, messages, draft: draftOf("EX_JOHN_DOE", id), again: sys(() => call("ironstone.commons.ContactServices.run#Import", { importId: id, background: true })),
                people: sys(() => ec.entity.find("mantle.party.PartyDetail").condition("lastName", "Jobspec").count()) }
        } finally {
            capture.disable()
            capture.clear()
        }
    },
    then({ ran, messages, draft, again, people }) {
        ran.errors == ""
        draft.status == "done"
        draft.result.createdCount == 30
        draft.error == null
        people == 30
        messages.length == 2
        messages[0].userIds == ["EX_JOHN_DOE"]
        messages[0].message.done == 25
        messages[0].message.total == 30
        !messages[0].message.finished
        messages[1].message.finished == true
        messages[1].message.createdCount == 30
        // run again once done: the result, not a second import
        !again.running
        again.result.createdCount == 30
    },
})

feature("while an import runs the step shows its progress; one that stopped says why and offers to run it again", {
    when() {
        const text = "First Name,Last Name,E-mail Address\r\nStop,Jobspec,stop@jobs.example\r\n"
        post("Contacts/Import/Source/saveSource", { contactFile: uploadedFile("stop.csv", text, "text/csv"), presetId: "outlook", characterSet: "UTF-8" })
        const id = newestImport("EX_JOHN_DOE")
        post("Contacts/Import/Mapping/saveMapping", mappingFields(id))
        post("Contacts/Import/Options/saveOptions", { importId: id, asPersonal: "Y", duplicatePolicy: "skip" })
        sys(() => call("ironstone.commons.ContactServices.store#ImportDraft", { importId: id, fields: { status: "running" } }))
        const running = render("apps/Commons/Contacts/Import/Result", { importId: id })
        // the progress screen is a qvue component, loaded by the step's dynamic-container
        const progress = ec.screen.makeTest().rootScreen(webroot).renderMode("qvue").render("apps/Commons/Contacts/ImportProgress", { importId: id, total: "1" }, null)
        const notAgain = sys(() => call("ironstone.commons.ContactServices.run#Import", { importId: id }))
        // the source file gone: the run stops before the rows, and the draft says why rather than running
        sys(() => call("ironstone.commons.ContactServices.store#ImportDraft", { importId: id, fields: { status: "options" } }))
        sys(() => ec.resource.getLocationReference(`dbresource://ironstone/ContactImport/EX_JOHN_DOE/${id}/source.csv`).delete())
        let errors = ""
        try { sys(() => call("ironstone.commons.ContactServices.run#ImportNow", { importId: id })) } catch (err) { errors = String(err && err.message ? err.message : err) }
        ec.message.clearErrors()
        const draft = draftOf("EX_JOHN_DOE", id)
        sys(() => call("ironstone.commons.ContactServices.store#ImportDraft", { importId: id, fields: { status: "failed" } }))
        const stopped = render("apps/Commons/Contacts/Import/Result", { importId: id })
        return { running, progress, notAgain, errors, draft, stopped }
    },
    then({ running, progress, notAgain, errors, draft, stopped }) {
        running.errors == ""
        running.output.includes("Importing")
        running.output.includes("/Commons/Contacts/ImportProgress")
        !running.output.includes("ImportRun")
        progress.status == 200
        notAgain.running == true
        errors.includes("The contact file is empty")
        draft.status == "failed"
        draft.error != null
        stopped.output.includes("The last run stopped")
        stopped.output.includes("ImportRun")
    },
})

feature("another user's wizard never opens john.doe's import", {
    when() {
        login("joe.developer")
        try {
            const preview = render("apps/Commons/Contacts/Import/Preview", { importId: googleId })
            const ran = post("Contacts/Import/Result/runImport", { importId: googleId })
            const failures = post("Contacts/Import/Result/failuresCsv", { importId: badId })
            const traversal = render("apps/Commons/Contacts/Import/Preview", { importId: `../EX_JOHN_DOE/${googleId}` })
            return { preview, ran, failures, traversal }
        } finally { login("john.doe") }
    },
    then({ preview, ran, failures, traversal }) {
        preview.output.includes("Start with the file.")
        !preview.output.includes("Grace Hopper")
        ran.errors.includes("This import is not available")
        !failures.output.includes("not an email address")
        traversal.output.includes("Start with the file.")
    },
})
