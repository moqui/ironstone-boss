// Commons Files (screen/Commons/Files.xml and Files.qvue, Drives, DriveSettings, service/ironstone/commons/DriveServices.xml,
// impl-drawers-commons.md M8): the browser's JSON transitions under the Commons app root as john.doe on the files demo
// (data/BossFilesDemoData.xml): the rail, folders with their versions, tags and favorites; new folders and text files,
// rename, move and copy; uploads with the replace, keep both and skip answers; versions, compare and restore; the trash;
// search, tags, favorites and recent; downloads and zips; the drives screens; the records drive, which shows only the
// records a user may see; and another user (joe.developer) refused on john.doe's private files. Commons Home's recent
// files and Compose's Attach from Files too.
// Run: ./moq test mr-boss --spec Files
const commons = "component://mr-boss/screen/Commons.xml"
const comms = "component://mr-boss/screen/Comms.xml"
const FILES = "org.moqui.impl.FileServices"
let personalDriveId

function render(root, path, parameters, method) {
    const str = ec.screen.makeTest().rootScreen(root).render(path, parameters || {}, method || null)
    let json = null
    try { json = JSON.parse(str.output) } catch (err) { json = null }
    const errors = (json && !Array.isArray(json) && json.errors) || str.errorMessages.join(" | ")
    ec.message.clearErrors()
    return { status: str.status, errors: errors || "", json: json || {}, output: String(str.output || "") }
}
const get = (name, parameters) => render(commons, `Files/${name}`, parameters, null)
const post = (name, parameters) => render(commons, `Files/${name}`, parameters, "post")
function sys(run) {
    const wasDisabled = ec.artifactExecution.disableAuthz()
    try { return run() } finally { if (!wasDisabled) ec.artifactExecution.enableAuthz() }
}
const names = (answer) => (answer.json.fileList || []).map((row) => row.name)
const row = (answer, name) => (answer.json.fileList || []).find((item) => item.name === name)
const message = (answer) => ((answer.json.messageInfos || [])[0] || {}).message || ""

spec({
    setupSpec() {
        sys(() => call("ironstone.commons.FilesDemoServices.load#FilesDemo", {}))
        login("john.doe")
        personalDriveId = sys(() => call(`${FILES}.ensure#PersonalDrive`, {})).driveId
    },
    cleanupSpec() { login("john.doe") },
})

feature("the rail: My files first, the shared drives, Records, the tags and the shares waiting; the open drive's storage on request", {
    when() {
        return { rail: get("filesData"), team: get("usage", { driveId: "BOSS_DEMO_TEAM" }), records: get("usage", { driveId: "BOSS_RECORDS" }) }
    },
    then({ rail, team, records }) {
        const { status, errors, json } = rail
        status == 200
        errors == ""
        json.personalDriveId == personalDriveId
        json.driveList[0].isPersonal
        json.driveList.some((drive) => drive.driveId === "BOSS_DEMO_TEAM" && drive.quotaBytes == 52428800)
        json.driveList.every((drive) => drive.usedBytes == null)
        team.json.usage.usedBytes > 0
        team.json.usage.quotaBytes == 52428800
        team.json.usage.usedPercent != null
        records.json.usage == null
        json.recordsDriveId == "BOSS_RECORDS"
        json.tagList.map((tag) => tag.tagName).includes("Work")
        json.pendingShareCount >= 1
    },
})

feature("the website drive is git in the database", {
    requires: ["git"],
    when() { return get("filesData") },
    then({ status, errors, json }) {
        status == 200
        errors == ""
        json.driveList.some((drive) => drive.driveId === "BOSS_DEMO_WEB" && drive.storage === "git-db")
    },
})

feature("a folder lists its files: folders first, versions with notes, tags, favorites, shared", {
    when() {
        return { top: get("folder", { driveId: personalDriveId, path: "" }), documents: get("folder", { driveId: personalDriveId, path: "Documents" }),
            projects: get("folder", { driveId: personalDriveId, path: "Projects" }) }
    },
    then({ top, documents, projects }) {
        top.status == 200
        names(top).slice(0, 3) == ["Documents", "Pictures", "Projects"]
        top.json.folder.canWrite
        top.json.breadcrumbList.length == 1
        names(documents) == ["Budget 2027.csv", "Meeting notes.md", "Welcome.txt"]
        row(documents, "Budget 2027.csv").favorite
        row(documents, "Budget 2027.csv").tags.map((tag) => tag.tagName) == ["Work"]
        row(documents, "Budget 2027.csv").shared
        row(documents, "Budget 2027.csv").fileType == "spreadsheet"
        row(documents, "Meeting notes.md").versionNote == "Dates confirmed with Bob"
        row(documents, "Meeting notes.md").modifiedByName == "John Doe"
        row(projects, "Office move").shared
        row(projects, "Office move").favorite
        row(projects, "Office move").icon == "sym_o_folder"
    },
})

feature("a new folder and a text file, renamed, moved, copied into another drive", {
    when() {
        const made = post("newFolder", { driveId: personalDriveId, path: "", name: "Spec folder" })
        const text = post("saveText", { driveId: personalDriveId, path: "", name: "spec note.md", text: "# Spec\n\nFirst line\n" })
        const twice = post("saveText", { driveId: personalDriveId, path: "", name: "spec note.md", text: "again" })
        const renamed = post("rename", { driveId: personalDriveId, path: "spec note.md", newName: "renamed note.md" })
        const moved = post("moveCopy", { mode: "move", driveId: personalDriveId, pathListJson: JSON.stringify(["renamed note.md"]), toPath: "Spec folder" })
        const copied = post("moveCopy", { mode: "copy", driveId: personalDriveId, pathListJson: JSON.stringify(["Spec folder/renamed note.md"]),
            toDriveId: "BOSS_DEMO_TEAM", toPath: "" })
        const edited = post("saveText", { driveId: personalDriveId, path: "Spec folder/renamed note.md", text: "# Spec\n\nSecond line\n", versionNote: "Edited", replace: "true" })
        return { made, text, twice, renamed, moved, copied, edited, folder: get("folder", { driveId: personalDriveId, path: "Spec folder" }),
            team: get("folder", { driveId: "BOSS_DEMO_TEAM", path: "" }), body: get("text", { driveId: personalDriveId, path: "Spec folder/renamed note.md" }) }
    },
    allowMessageErrors: true,
    then({ made, text, twice, renamed, moved, copied, edited, folder, team, body }) {
        made.status == 200
        message(made) == "Folder Spec folder made"
        text.json.newPath == "spec note.md"
        twice.status == 500
        twice.errors.includes("Something by that name is already there")
        renamed.json.newPath == "renamed note.md"
        message(moved) == "Moved 1 of 1"
        message(copied) == "Copied 1 of 1"
        edited.status == 200
        names(folder) == ["renamed note.md"]
        row(folder, "renamed note.md").versionNote == "Edited"
        names(team).includes("renamed note.md")
        body.json.text == "# Spec\n\nSecond line\n"
    },
})

feature("an upload: a new file, then replace (a version with its note), keep both, skip", {
    when() {
        const first = post("upload", { driveId: personalDriveId, path: "Spec folder", contentFile: uploadedFile("plan.txt", "one\n") })
        const check = post("uploadCheck", { driveId: personalDriveId, path: "Spec folder", nameListJson: JSON.stringify(["plan.txt", "other.txt"]) })
        const replaced = post("upload", { driveId: personalDriveId, path: "Spec folder", conflictPolicy: "replace", versionNote: "The second plan",
            contentFile: uploadedFile("plan.txt", "two\n") })
        const both = post("upload", { driveId: personalDriveId, path: "Spec folder", conflictPolicy: "keepBoth", contentFile: uploadedFile("plan.txt", "three\n") })
        const skipped = post("upload", { driveId: personalDriveId, path: "Spec folder", conflictPolicy: "skip",
            contentFile: [uploadedFile("plan.txt", "four\n"), uploadedFile("new.txt", "new\n")] })
        const folderUpload = post("upload", { driveId: personalDriveId, path: "Spec folder", contentFile: [uploadedFile("a.txt", "a"), uploadedFile("b.txt", "b")],
            relativePath: ["Sub/a.txt", "Sub/deeper/b.txt"] })
        return { first, check, replaced, both, skipped, folderUpload, versions: get("versions", { driveId: personalDriveId, path: "Spec folder/plan.txt" }),
            folder: get("folder", { driveId: personalDriveId, path: "Spec folder" }), deeper: get("folder", { driveId: personalDriveId, path: "Spec folder/Sub/deeper" }) }
    },
    then({ first, check, replaced, both, skipped, folderUpload, versions, folder, deeper }) {
        message(first) == "Uploaded plan.txt"
        check.json.conflictList.map((item) => item.name) == ["plan.txt"]
        replaced.json.uploadedList[0].outcome == "replaced"
        both.json.uploadedList[0].outcome == "renamed"
        both.json.uploadedList[0].name == "plan (2).txt"
        skipped.json.uploadedList.map((item) => item.outcome) == ["skipped", "created"]
        message(skipped) == "Upload: 1 added, 1 skipped"
        folderUpload.json.uploadedList.map((item) => item.path) == ["Spec folder/Sub/a.txt", "Spec folder/Sub/deeper/b.txt"]
        versions.json.versionList.map((version) => version.note) == ["The second plan", null]
        names(folder) == ["Sub", "new.txt", "plan (2).txt", "plan.txt", "renamed note.md"]
        names(deeper) == ["b.txt"]
    },
})

feature("versions: compare two, restore one as the newest, download a past one", {
    when() {
        const versions = get("versions", { driveId: personalDriveId, path: "Documents/Meeting notes.md" })
        const list = versions.json.versionList || []
        const diff = get("diff", { driveId: personalDriveId, path: "Documents/Meeting notes.md", fromVersion: list[2].versionName, toVersion: list[1].versionName })
        const old = ec.screen.makeTest().rootScreen(commons).render("Files/download", { driveId: personalDriveId, path: "Documents/Meeting notes.md",
            versionName: list[2].versionName }, null)
        const restored = post("restoreVersion", { driveId: personalDriveId, path: "Documents/Meeting notes.md", versionName: list[2].versionName })
        const after = get("versions", { driveId: personalDriveId, path: "Documents/Meeting notes.md" })
        const activity = get("activity", { driveId: personalDriveId, path: "Documents/Meeting notes.md" })
        return { list, diff, old, restored, after, activity }
    },
    then({ list, diff, old, restored, after, activity }) {
        list.map((version) => version.note) == ["Dates confirmed with Bob", "Added the action items", "First notes"]
        list[0].isCurrent
        list[0].userName == "John Doe"
        diff.json.diff.stats.insertions > 0
        diff.json.diff.html.includes("moqui-diff")
        old.status == 200
        String(old.output).startsWith("# Weekly team meeting\n\n- The calendar rollout\n- The open requests\n")
        // the past version downloads under the file's own name, kept by no shared cache
        String(old.header("Content-Disposition")).includes("Meeting%20notes.md")
        String(old.header("Cache-Control")).includes("no-store")
        !String(old.output).includes("Action items")
        message(restored) == "Restored as the newest version"
        after.json.versionList.length == 4
        after.json.versionList[0].note.startsWith("Restored version")
        activity.json.activityList.filter((entry) => entry.action === "version").length == 4
    },
})

feature("the trash: trashed items list there, restore one, delete one for good, empty it", {
    when() {
        const trashed = post("trash", { driveId: personalDriveId, pathListJson: JSON.stringify(["Spec folder/new.txt", "Spec folder/plan (2).txt"]) })
        const trash = get("rows", { view: "trash", driveId: personalDriveId })
        const entry = (name) => (trash.json.fileList || []).find((item) => item.name === name)
        const restored = post("restore", { trashId: entry("new.txt").trashId })
        const forever = post("deleteForever", { trashId: entry("plan (2).txt").trashId })
        const before = get("rows", { view: "trash", driveId: personalDriveId })
        const emptied = post("emptyTrash", { driveId: personalDriveId })
        return { trashed, trash, restored, forever, before, emptied, after: get("rows", { view: "trash", driveId: personalDriveId }),
            folder: get("folder", { driveId: personalDriveId, path: "Spec folder" }) }
    },
    then({ trashed, trash, restored, forever, before, emptied, after, folder }) {
        message(trashed) == "2 items moved to the trash"
        names(trash).includes("new.txt")
        names(trash).includes("Old draft.txt")
        names(trash).includes("Scratch")
        message(restored) == "new.txt restored"
        message(forever) == "Deleted for good"
        !names(before).includes("plan (2).txt")
        !names(before).includes("new.txt")
        emptied.json.deletedCount >= 2
        names(after) == []
        names(folder).includes("new.txt")
        !names(folder).includes("plan (2).txt")
    },
})

feature("search by name, a tag, favorites and recent across the drives", {
    when() {
        return { search: get("rows", { view: "search", text: "budget" }), inFolder: get("rows", { view: "search", text: "plan", driveId: personalDriveId, path: "Projects" }),
            tag: get("rows", { view: "tag", tagId: sys(() => ec.entity.find("moqui.resource.ResourceTag").condition("tagName", "Important").one().tagId) }),
            favorites: get("rows", { view: "favorites" }), recent: get("rows", { view: "recent" }), shared: get("rows", { view: "shared" }),
            sharedByMe: get("rows", { view: "sharedByMe" }) }
    },
    then({ search, inFolder, tag, favorites, recent, shared, sharedByMe }) {
        names(search) == ["Budget 2027.csv"]
        search.json.fileList[0].driveName == "My files"
        search.json.fileList[0].folderPath == "Documents"
        names(inFolder) == ["Plan.md"]
        names(tag) == ["Meeting notes.md"]
        names(favorites).includes("Budget 2027.csv")
        names(favorites).includes("Office move")
        names(recent).includes("Meeting notes.md")
        shared.json.fileList.some((item) => item.name === "Ideas.md" && item.pending && item.fromName === "Joe Developer")
        sharedByMe.json.fileList.some((item) => item.name === "Budget 2027.csv" && item.withText === "Joe Developer")
        sharedByMe.json.fileList.some((item) => item.isLink && item.linkLabel === "Photos for the family" && item.hasPassword)
    },
})

feature("downloads: a file as it is, a picture inline, a folder and a selection as zips", {
    when() {
        const test = (parameters, name) => ec.screen.makeTest().rootScreen(commons).render(name || "Files/download", parameters, null)
        return { text: test({ driveId: personalDriveId, path: "Documents/Welcome.txt" }), picture: test({ driveId: personalDriveId, path: "Pictures/beach.png", inline: "true" }),
            folder: test({ driveId: personalDriveId, path: "Pictures" }),
            selection: test({ driveId: personalDriveId, pathListJson: JSON.stringify(["Documents/Welcome.txt", "Pictures/beach.png"]) }, "Files/downloadZip"),
            thumb: test({ driveId: personalDriveId, path: "Pictures/beach.png", size: "64" }, "Files/thumb"),
            preview: get("preview", { driveId: personalDriveId, path: "Documents/Welcome.txt" }) }
    },
    then({ text, picture, folder, selection, thumb, preview }) {
        text.status == 200
        String(text.output).startsWith("Welcome to My files.")
        picture.status == 200
        String(picture.header("Content-Disposition")).startsWith("inline")
        String(text.header("Content-Disposition")).includes("Welcome.txt")
        folder.status == 200
        String(folder.output).startsWith("PK")
        String(folder.header("Content-Disposition")).includes("Pictures.zip")
        selection.status == 200
        String(selection.output).startsWith("PK")
        String(selection.header("Content-Disposition")).includes(".zip")
        thumb.status == 200
        preview.json.kind == "text"
        preview.json.text.startsWith("Welcome to My files.")
    },
})

feature("joe.developer is refused on john.doe's private files, and reaches the folder john shared with him", {
    allowMessageErrors: true,
    when() {
        login("joe.developer")
        // the drive's access is one rule for a folder, a file and a write (the framework's FileServices): one read, a download, one write
        const out = { folder: get("folder", { driveId: personalDriveId, path: "Documents" }),
            download: render(commons, "Files/download", { driveId: personalDriveId, path: "Documents/Welcome.txt" }),
            trash: post("trash", { driveId: personalDriveId, pathListJson: JSON.stringify(["Documents/Welcome.txt"]) }),
            search: get("rows", { view: "search", text: "welcome" }),
            shared: get("folder", { driveId: personalDriveId, path: "Projects/Office move" }),
            sharedFile: get("detail", { driveId: personalDriveId, path: "Projects/Office move/Plan.md" }),
            team: get("folder", { driveId: "BOSS_DEMO_TEAM", path: "" }),
            teamWrite: post("newFolder", { driveId: "BOSS_DEMO_TEAM", path: "", name: "Joe was here" }) }
        login("bob.developer")
        out.bobWrite = post("newFolder", { driveId: "BOSS_DEMO_TEAM", path: "", name: "Bob was here" })
        out.bobRead = get("folder", { driveId: "BOSS_DEMO_TEAM", path: "" })
        login("john.doe")
        out.stillThere = get("folder", { driveId: personalDriveId, path: "Documents" })
        return out
    },
    then(v) {
        v.folder.status == 500
        v.folder.errors.includes("Folder not found")
        v.download.json.fileList === undefined
        !String(v.download.output).includes("Welcome to My files")
        v.trash.json.trashList[0].outcome == "failed"
        v.trash.json.trashList[0].error == "not found"
        v.search.json.fileList.length == 0
        v.shared.status == 200
        names(v.shared).includes("Plan.md")
        v.shared.json.folder.canWrite
        v.shared.json.breadcrumbList[0].name == "Shared with me"
        v.sharedFile.status == 200
        v.sharedFile.json.item.canWrite
        v.sharedFile.json.access.viaShareId != null
        v.team.status == 200
        v.teamWrite.status == 200
        v.bobWrite.status == 500
        v.bobWrite.errors.includes("You may not change this folder")
        v.bobRead.status == 200
        names(v.stillThere).includes("Welcome.txt")
    },
})

feature("the records drive shows each user the records they may see, by kind, with the records' files", {
    allowMessageErrors: true,
    when() {
        // a private contact of john.doe's with a file: joe.developer may not see the record, so not its folder
        sys(() => {
            if (!ec.entity.find("mantle.party.Party").condition("partyId", "BOSS_TEST_DRIVE_PRIVATE").count())
                call("create#mantle.party.Party", { partyId: "BOSS_TEST_DRIVE_PRIVATE", partyTypeEnumId: "PtyPerson", privateOwnerUserId: "EX_JOHN_DOE" })
            ec.resource.getLocationReference("dbresource://mantle/content/party/BOSS_TEST_DRIVE_PRIVATE/content_X1/secret.txt").putText("secret")
        })
        const out = { top: get("folder", { driveId: "BOSS_RECORDS", path: "" }), requests: get("folder", { driveId: "BOSS_RECORDS", path: "request" }),
            request: get("folder", { driveId: "BOSS_RECORDS", path: "request/BOSS_DEMO_REQUEST" }),
            unmapped: get("folder", { driveId: "BOSS_RECORDS", path: "employment" }),
            parties: get("folder", { driveId: "BOSS_RECORDS", path: "party" }),
            privateFile: get("detail", { driveId: "BOSS_RECORDS", path: "party/BOSS_TEST_DRIVE_PRIVATE/content_X1/secret.txt" }),
            requestFile: get("detail", { driveId: "BOSS_RECORDS", path: "request/BOSS_DEMO_REQUEST/content_BOSS_DEMO_RC_OPTIONS/calendar-options.txt" }),
            requestDownload: render(commons, "Files/download", { driveId: "BOSS_RECORDS",
                path: "request/BOSS_DEMO_REQUEST/content_BOSS_DEMO_RC_OPTIONS/calendar-options.txt" }),
            write: post("newFolder", { driveId: "BOSS_RECORDS", path: "request/BOSS_DEMO_REQUEST", name: "x" }) }
        login("joe.developer")
        out.joeParties = get("folder", { driveId: "BOSS_RECORDS", path: "party" })
        out.joePrivate = get("folder", { driveId: "BOSS_RECORDS", path: "party/BOSS_TEST_DRIVE_PRIVATE" })
        out.joeFile = render(commons, "Files/download", { driveId: "BOSS_RECORDS", path: "party/BOSS_TEST_DRIVE_PRIVATE/content_X1/secret.txt" })
        out.joeZip = render(commons, "Files/downloadZip", { driveId: "BOSS_RECORDS", pathListJson: JSON.stringify(["party"]) })
        out.joeSearch = get("rows", { view: "search", text: "secret" })
        login("john.doe")
        return out
    },
    then(v) {
        names(v.top).includes("Requests")
        names(v.top).includes("Messages")
        v.top.json.fileList.find((item) => item.name === "Requests").path == "request"
        v.requests.json.fileList.some((item) => item.recordId === "BOSS_DEMO_REQUEST" && item.recordTitle === "Set up the shared team calendar")
        v.request.json.record.recordId == "BOSS_DEMO_REQUEST"
        v.request.json.breadcrumbList[2].name == "Set up the shared team calendar"
        row(v.request, "calendar-options.txt").description == "The three calendar options compared"
        row(v.request, "calendar-options.txt").contentTypeLabel == "Internal"
        row(v.request, "calendar-options.txt").contentFolder == "request/BOSS_DEMO_REQUEST/content_BOSS_DEMO_RC_OPTIONS"
        names(v.request).includes("signed-quote.txt")
        v.unmapped.status == 500
        v.parties.json.fileList.some((item) => item.recordId === "BOSS_TEST_DRIVE_PRIVATE")
        v.requests.json.hiddenCount == 0
        v.privateFile.status == 200
        v.privateFile.json.record.recordId == "BOSS_TEST_DRIVE_PRIVATE"
        v.requestFile.json.record.title == "Set up the shared team calendar"
        v.requestFile.json.record.url.startsWith("/qapps/Commons/Requests/RequestDetail")
        v.requestFile.json.access.canShare == false
        v.requestDownload.status == 200
        v.write.status == 500
        !v.joeParties.json.fileList.some((item) => item.recordId === "BOSS_TEST_DRIVE_PRIVATE")
        v.joePrivate.status == 500
        v.joePrivate.errors.includes("Folder not found")
        !String(v.joeFile.output).includes("secret")
        !String(v.joeZip.output).includes("secret.txt")
        v.joeSearch.json.fileList.length == 0
    },
})

feature("the drives: a new folder drive with members, its settings, a member added, archived and back", {
    when() {
        const created = render(commons, "Files/Drives/createDrive", { driveName: "Spec drive", storage: "folder", quotaMb: "5", memberUserIds: "ORG_ZIZI_JD",
            memberPermissionEnumId: "RdpView" }, "post")
        const drive = sys(() => ec.entity.find("moqui.resource.ResourceDrive").condition("driveName", "Spec drive").one())
        const added = render(commons, "Files/DriveSettings/addMember", { driveId: drive.driveId, memberValue: "user:ORG_ZIZI_BD", permissionEnumId: "RdpEdit" }, "post")
        const settings = sys(() => call("ironstone.commons.DriveServices.get#DriveSettings", { driveId: drive.driveId }))
        const archived = render(commons, "Files/DriveSettings/archiveDrive", { driveId: drive.driveId, archived: "true" }, "post")
        const rail = get("filesData")
        const back = render(commons, "Files/DriveSettings/archiveDrive", { driveId: drive.driveId, archived: "false" }, "post")
        const drivesPage = ec.screen.makeTest().rootScreen(commons).renderMode("qvt").withStaticData().render("Files/Drives", { lastStandalone: "-2" }, null)
        const settingsPage = ec.screen.makeTest().rootScreen(commons).renderMode("qvt").withStaticData().render("Files/DriveSettings", { driveId: drive.driveId, lastStandalone: "-2" }, null)
        const exported = ec.screen.makeTest().rootScreen(commons).render("Files/DriveSettings/exportZip", { driveId: "BOSS_DEMO_TEAM" }, null)
        ec.message.clearErrors()
        return { created, drive, added, settings, archived, rail, back, drivesPage, settingsPage, exported }
    },
    then({ created, drive, added, settings, archived, rail, back, drivesPage, settingsPage, exported }) {
        exported.status == 200
        String(exported.output).startsWith("PK")
        String(exported.header("Content-Disposition")).includes("Team.zip")
        created.errors == ""
        drive.quotaBytes == 5242880
        drive.ownerUserId == "EX_JOHN_DOE"
        settings.memberList.map((member) => member.name + ":" + member.permissionEnumId).sort() == ["Bob Developer:RdpEdit", "Joe Developer:RdpView"]
        archived.errors == ""
        added.errors == ""
        !rail.json.driveList.some((item) => item.driveId === drive.driveId)
        back.errors == ""
        drivesPage.status == 200
        drivesPage.errorMessages.length == 0
        drivesPage.output.includes("Spec drive")
        drivesPage.output.includes("Team")
        settingsPage.status == 200
        settingsPage.errorMessages.length == 0
        settingsPage.output.includes("Bob Developer")
    },
})

feature("Commons Home lists the recent files; the palette finds files", {
    when() {
        const home = ec.screen.makeTest().rootScreen(commons).renderMode("qvt").withStaticData().render("Home", { lastStandalone: "-2" }, null)
        ec.message.clearErrors()
        return { home, palette: sys(() => call("ironstone.commons.DriveServices.search#PaletteFiles", { text: "meeting", limit: 5 })) }
    },
    then({ home, palette }) {
        home.status == 200
        home.output.includes("Recent files")
        home.output.includes("Meeting notes.md")
        palette.rows[0].title == "Meeting notes.md"
        palette.rows[0].url.startsWith("/qapps/Commons/Files?drive=")
    },
})

feature("Compose: Attach from Files copies the file onto an email draft or an internal message, and a link for one too large", {
    when() {
        const capture = ec.factory.getTool("MailCapture")
        const accountId = sys(() => call("org.moqui.impl.EmailClientServices.create#EmailAccount", { accountKindEnumId: "EakHosted", emailAddress: "john.files@ziziwork.example",
            accountName: "Files", smtpHost: "127.0.0.1", smtpPort: "1", smtpStartTls: "N" })).emailAccountId
        const identity = "identity:" + sys(() => ec.entity.find("moqui.basic.email.EmailIdentity").condition("emailAccountId", accountId).one().emailIdentityId)
        const draft = render(comms, "Inbox/Compose/saveDraft", { fromValue: identity, toJson: JSON.stringify([{ value: "bob@example.com", label: "bob@example.com" }]),
            subject: "The budget" }, "post")
        const emailMessageId = draft.json.emailMessageId
        const items = JSON.stringify([{ driveId: personalDriveId, path: "Documents/Budget 2027.csv" }])
        const email = render(comms, "Inbox/Compose/attachFromFiles", { emailMessageId, itemsJson: items }, "post")
        const internal = render(comms, "Inbox/Compose/attachFromFiles", { itemsJson: items }, "post")
        const big = sys(() => call("ironstone.comms.ComposeServices.attach#DriveFiles", { itemList: [{ driveId: personalDriveId, path: "Pictures/beach.png" }], maxAttachBytes: 10 }))
        const rows = sys(() => Array.from(ec.entity.find("moqui.basic.email.EmailMessageAttachment").condition("emailMessageId", emailMessageId).list()))
        const picker = render(comms, "Inbox/Compose/pickerFolder", { driveId: personalDriveId, path: "Documents" })
        capture.reset()
        return { email, internal, big, rows, picker }
    },
    then({ email, internal, big, rows, picker }) {
        email.status == 200
        email.json.attachmentList.map((file) => file.name) == ["Budget 2027.csv"]
        rows[0].attachmentLocation.startsWith("dbresource://email/")
        sys(() => ec.resource.getLocationReference(rows[0].attachmentLocation).getText()).startsWith("month,income")
        internal.json.uploadList[0].name == "Budget 2027.csv"
        internal.json.uploadList[0].location.startsWith("dbresource://ironstone/compose/EX_JOHN_DOE/")
        big.linkList.map((link) => link.name) == ["beach.png"]
        big.failedList.length == 0
        big.linkList[0].linkPath.startsWith("/s/")
        names(picker).includes("Budget 2027.csv")
    },
})

feature("Attach from Files refuses a file the user may not open", {
    allowMessageErrors: true,
    when() {
        login("joe.developer")
        const out = sys(() => call("ironstone.comms.ComposeServices.attach#DriveFiles", { itemList: [{ driveId: personalDriveId, path: "Documents/Welcome.txt" }] }))
        login("john.doe")
        return out
    },
    then(out) {
        out.uploadList.length == 0
        out.failedList[0].name == "Welcome.txt"
    },
})

// the bytes of a file under test/files, uploaded to a folder of My files as the demo loads its pictures
function uploadFixture(folder, name) {
    const stream = ec.resource.getLocationReference(`component://mr-boss/test/files/${name}`).openStream()
    let bytes
    try { bytes = stream.readAllBytes() } finally { if (stream && stream.close) stream.close() }
    return sys(() => call(`${FILES}.upload#Resource`, { driveId: personalDriveId, path: folder, fileList: [bytes], relativePathList: [name],
        conflictPolicy: "replace" }))
}

feature("a spreadsheet previews as its first rows with a tab per sheet", {
    requires: ["xlsx"],
    when() {
        uploadFixture("Spec previews", "Move costs.xlsx")
        const path = "Spec previews/Move costs.xlsx"
        return { first: get("preview", { driveId: personalDriveId, path }), again: get("preview", { driveId: personalDriveId, path }),
            notes: get("preview", { driveId: personalDriveId, path, sheetName: "Notes" }),
            folder: get("folder", { driveId: personalDriveId, path: "Spec previews" }) }
    },
    then({ first, again, notes, folder }) {
        first.status == 200
        first.errors == ""
        first.json.kind == "spreadsheet"
        first.json.sheetNames == ["Costs", "Notes"]
        first.json.sheetName == "Costs"
        first.json.rows[0] == ["Item", "Cost"]
        first.json.rows[1] == ["Movers", 1200]
        first.json.rows[2] == ["Boxes", 85.5]
        first.json.truncated == false
        again.json.rows == first.json.rows
        notes.json.sheetName == "Notes"
        notes.json.rows == [["Book the movers by Friday"]]
        row(folder, "Move costs.xlsx").fileType == "spreadsheet"
    },
})

feature("a PDF previews as its first page with the page count when there is a PDF engine, and as kind pdf without one", {
    when() {
        uploadFixture("Spec previews", "Movers quote.pdf")
        const path = "Spec previews/Movers quote.pdf"
        const preview = get("preview", { driveId: personalDriveId, path, size: "320" })
        const thumb = ec.screen.makeTest().rootScreen(commons).render("Files/thumb", { driveId: personalDriveId, path, size: "320" }, null)
        return { preview, thumb, mimeIsImage: String(thumb.header("Content-Type") || "").startsWith("image/png"), again: get("preview", { driveId: personalDriveId, path, size: "320" }) }
    },
    then({ preview, thumb, mimeIsImage, again }) {
        preview.status == 200
        preview.errors == ""
        preview.json.kind == "pdf"
        preview.json.hasImage ? preview.json.pages == 1 : preview.json.pages == null
        mimeIsImage == preview.json.hasImage
        again.json.hasImage == preview.json.hasImage
    },
})
