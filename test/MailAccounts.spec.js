// The mail accounts of Comms Settings (screen/Comms/Settings/MailAccounts: List, the Add wizard and Account;
// service/ironstone/comms/MailSettingsServices.xml; design-drawers-commons.md §17 MailAccounts; impl-drawers-commons.md M5c): the wizard
// step by step as its Next posts each step's form, with no network: the providers IronStone knows (Gmail, Outlook.com, iCloud,
// Proton) and a reserved domain (acme.example) are answered without a lookup, and the servers are 127.0.0.1 port 1, where
// nothing listens, so the test fails at once with what to try. Then the list (status, Fix, Continue setup), the account's page
// (sign in again, servers, options, members, pause and resume, a test message through MailCapture, import of an .eml), the
// outgoing server's own sign-in (tried before it is saved, so on port 1 it is refused and nothing of the save is kept), personal
// and shared by the framework's rules, the folders a manager maps and stops syncing, and remove (keeping or deleting the mail
// here) with the removed accounts the owner deletes later. Another user (joe.developer) reaches none of john.doe's accounts; a member who does not manage one sees
// it but changes nothing. Authorization stays on, as for a browser request; a password is never in a page.
// Run: ./moq test mr-boss --spec MailAccounts
const webroot = "component://webroot/screen/webroot.xml"
const comms = "component://mr-boss/screen/Comms.xml"
const SETTINGS = "org.moqui.comms.MailSettingsServices"
const BASE = "Settings/MailAccounts"
const PASSWORD = "s3cret-app-pass"

function render(path, parameters) {
    const str = ec.screen.makeTest().rootScreen(webroot).renderMode("qvt").withStaticData().render(`apps/Comms/${BASE}/${path}`, Object.assign({ lastStandalone: "true" }, parameters || {}), null)
    const output = String(str.output || "")
    ec.message.clearErrors()
    return { status: str.status, errors: str.errorMessages.join(" | "), output, broken: /Error rendering|Exception in render/.test(output) }
}
function post(path, parameters) {
    const str = ec.screen.makeTest().rootScreen(comms).render(`${BASE}/${path}`, parameters || {}, "post")
    const output = String(str.output || "")
    ec.message.clearErrors()
    return { status: str.status, errors: str.errorMessages.join(" | "), output }
}
// a JSON transition (the Removed screen's)
function json(path, parameters, method) {
    const str = ec.screen.makeTest().rootScreen(comms).render(`${BASE}/${path}`, parameters || {}, method || null)
    let parsed = null
    try { parsed = JSON.parse(str.output) } catch (err) { parsed = null }
    ec.message.clearErrors()
    return { status: str.status, errors: (parsed && parsed.errors) || str.errorMessages.join(" | "), json: parsed || {} }
}
function sys(run) {
    const wasDisabled = ec.artifactExecution.disableAuthz()
    try { return run() } finally { if (!wasDisabled) ec.artifactExecution.enableAuthz() }
}
const accountOf = (address) => sys(() => {
    const rows = Array.from(ec.entity.find("moqui.basic.email.EmailAccount").condition("ownerUserId", "EX_JOHN_DOE").condition("emailAddress", address)
        .orderBy("-emailAccountId").list())
    return rows.length ? rows[0] : null
})
const serverOf = (account) => sys(() => ec.entity.find("moqui.basic.email.EmailServer").condition("emailServerId", account.emailServerId).one())
const local = { storeKind: "imap", storeSecurity: "ssl", storeHost: "127.0.0.1", storePort: "1", smtpHost: "127.0.0.1", smtpPort: "1", smtpSecurity: "none" }
let personalId, sharedId

spec({
    stepwise: true,
    setupSpec() { login("john.doe") },
    cleanupSpec() { login("john.doe") },
})

feature("the wizard has five steps, Address first; the list and the account's page render", {
    when() {
        const wizard = sys(() => {
            const str = ec.screen.makeTest().rootScreen("component://basic-comms/screen/BasicComms/Settings/MailAccounts/Add.xml").renderMode("qvt").withStaticData().render("", {}, null)
            const output = String(str.output || "")
            ec.message.clearErrors()
            return { status: str.status, errors: str.errorMessages.join(" | "), output }
        })
        return { wizard, address: render("Add/Address", {}), connect: render("Add/Connect", {}), list: render("List", {}),
            demo: render("Account", { emailAccountId: "BOSS_DEMO_MAIL_ACCT" }) }
    },
    then({ wizard, address, connect, list, demo }) {
        wizard.status == 200
        wizard.errors == ""
        wizard.output.includes("m-subscreens-wizard")
        wizard.output.includes('finish-text="Start syncing"')
        address.errors == ""
        !address.broken
        address.output.includes("Whose mail is it?")
        address.output.includes("Shared: a team address")
        address.output.includes("Shared, delivered here")
        address.output.includes("Hosted here")
        connect.output.includes("Start with your email address")
        list.errors == ""
        !list.broken
        list.output.includes("Internal messages")
        list.output.includes("Local only")
        demo.errors == ""
        demo.output.includes("john.doe@moqui.org")
        demo.output.includes("Clients")
    },
})

feature("the servers of a known provider and of a reserved domain come without a lookup; a bad address and Proton Mail are refused", {
    when() {
        const suggest = (address) => sys(() => call(`${SETTINGS}.suggest#MailServer`, { emailAddress: address }).suggestion)
        const started = Date.now()
        const gmail = suggest("jane.roe@gmail.com"), outlook = suggest("jane.roe@hotmail.com"), icloud = suggest("jane@me.com"), acme = suggest("pat@acme.example")
        const elapsed = Date.now() - started
        const bad = post("Add/Address/findServers", { emailAddress: "not an address", accountKindEnumId: "EakExternal" })
        const proton = post("Add/Address/findServers", { emailAddress: "jane@proton.me", accountKindEnumId: "EakExternal" })
        const found = post("Add/Address/findServers", { emailAddress: "jane.roe@gmail.com", displayName: "Jane Roe", accountKindEnumId: "EakExternal" })
        return { gmail, outlook, icloud, acme, elapsed, bad, proton, found }
    },
    then({ gmail, outlook, icloud, acme, elapsed, bad, proton, found }) {
        gmail.source == "provider"
        gmail.providerName == "Gmail"
        gmail.storeHost == "imap.gmail.com"
        gmail.storePort == "993"
        gmail.storeSecurity == "ssl"
        gmail.smtpHost == "smtp.gmail.com"
        gmail.smtpPort == "465"
        gmail.smtpSecurity == "ssl"
        gmail.appPassword
        gmail.helpUrl == "https://myaccount.google.com/apppasswords"
        gmail.helpText.includes("2-Step Verification")
        outlook.storeHost == "outlook.office365.com"
        outlook.smtpHost == "smtp-mail.outlook.com"
        outlook.smtpSecurity == "starttls"
        outlook.helpText.includes("Microsoft sign-in")
        icloud.storeHost == "imap.mail.me.com"
        icloud.smtpPort == "587"
        acme.source == "guess"
        acme.storeHost == "imap.acme.example"
        acme.smtpHost == "smtp.acme.example"
        acme.sourceText.includes("guesses")
        elapsed < 2000
        bad.errors.includes("Enter your whole email address")
        proton.errors.includes("Proton Mail Bridge")
        found.errors == ""
    },
})

feature("Connect shows the provider's app-password help and the servers; Next with a password makes the account, paused", {
    when() {
        const shown = render("Add/Connect", { emailAddress: "jane.roe@gmail.com", displayName: "Jane Roe", accountKindEnumId: "EakExternal",
            storeKind: "imap", storeSecurity: "ssl", storeHost: "imap.gmail.com", storePort: "993", smtpHost: "smtp.gmail.com", smtpPort: "465",
            smtpSecurity: "ssl", mailUsername: "jane.roe@gmail.com", source: "provider" })
        const parameters = Object.assign({ emailAddress: "pat@acme.example", displayName: "Pat Doe", accountKindEnumId: "EakExternal",
            mailUsername: "pat@acme.example" }, local)
        const saved = post("Add/Connect/saveConnection", Object.assign({}, parameters, { mailPassword: PASSWORD }))
        const account = accountOf("pat@acme.example")
        personalId = account ? account.emailAccountId : null
        const server = account ? serverOf(account) : null
        const identity = personalId ? sys(() => ec.entity.find("moqui.basic.email.EmailIdentity").condition("emailAccountId", personalId).one()) : null
        // back to Connect: the account's own settings, the password never shown
        const back = render("Add/Connect", { emailAccountId: personalId })
        return { shown, saved, account, server, identity, back }
    },
    then({ shown, saved, account, server, identity, back }) {
        shown.errors == ""
        !shown.broken
        shown.output.includes("Make a Google app password")
        shown.output.includes("https://myaccount.google.com/apppasswords")
        shown.output.includes("App password")
        shown.output.includes("imap.gmail.com")
        shown.output.includes("We know the server settings of your provider")
        saved.errors == ""
        account != null
        account.statusId == "EasPaused"
        account.accountKindEnumId == "EakExternal"
        account.recordFilingEnumId == "ErfLinkedOnly"
        account.syncWindowDays == 365
        server.storeHost == "127.0.0.1"
        server.storeProtocol == "imaps"
        server.smtpSsl == "N"
        server.smtpStartTls == "N"
        server.mailUsername == "pat@acme.example"
        server.mailPassword == PASSWORD
        identity.displayName == "Pat Doe"
        back.errors == ""
        back.output.includes("Saved. Leave it empty to keep it")
        back.output.includes("127.0.0.1")
        !back.output.includes(PASSWORD)
    },
})

feature("Test fails at once on a server that is not there, with what to try; Next needs Continue anyway", {
    when() {
        const shown = render("Add/Test", { emailAccountId: personalId })
        const tested = sys(() => call(`${SETTINGS}.test#MailAccount`, { emailAccountId: personalId }))
        const refused = post("Add/Test/confirmTest", { emailAccountId: personalId, testPassed: "N" })
        const anyway = post("Add/Test/confirmTest", { emailAccountId: personalId, testPassed: "N", continueAnyway: "Y" })
        return { shown, tested, refused, anyway }
    },
    then({ shown, tested, refused, anyway }) {
        shown.errors == ""
        !shown.broken
        shown.output.includes("It did not work yet")
        shown.output.includes("Sending mail (SMTP)")
        shown.output.includes("Receiving mail: signing in")
        shown.output.includes("Continue anyway")
        tested.success == false
        tested.stepList.length == 2
        tested.stepList.every((step) => !step.ok && step.hint)
        tested.stepList.some((step) => step.hint.includes("Nothing answers on that port"))
        tested.adviceText.includes("Go back to fix what failed")
        refused.errors.includes("The test did not pass")
        anyway.errors == ""
    },
})

feature("Options saves the name, the sync window and the filing; a personal account has no members", {
    when() {
        const shown = render("Add/Options", { emailAccountId: personalId })
        // the step is server-static: whether the members fields show is its data, isShared, which the browser reads
        const shownData = JSON.parse(ec.screen.makeTest().rootScreen(webroot).render(`apps/Comms/${BASE}/Add/Options/actions`, { emailAccountId: personalId }, null).output || "{}")
        const saved = post("Add/Options/saveOptions", { emailAccountId: personalId, accountName: "Acme", syncWindowDays: "90", recordFilingEnumId: "ErfAllMatches" })
        const members = post("Add/Options/saveOptions", { emailAccountId: personalId, memberUserIds: "ORG_ZIZI_JD" })
        const all = post("Add/Options/saveOptions", { emailAccountId: personalId, syncWindowDays: "all" })
        const account = accountOf("pat@acme.example")
        post("Add/Options/saveOptions", { emailAccountId: personalId, syncWindowDays: "90" })
        return { shown, shownData, saved, members, all, account, after: accountOf("pat@acme.example") }
    },
    then({ shown, shownData, saved, members, all, account, after }) {
        shown.errors == ""
        shown.output.includes("Only what I link")
        shown.output.includes("Every message with a known contact")
        shownData.isShared === false
        saved.errors == ""
        members.errors.includes("Only a shared account has members")
        all.errors == ""
        account.accountName == "Acme"
        account.recordFilingEnumId == "ErfAllMatches"
        account.syncWindowDays == null
        after.syncWindowDays == 90
    },
})

feature("Finish makes the account active and starts its first sync; its page says so, with the way to the Inbox", {
    when() {
        const review = render("Add/Finish", { emailAccountId: personalId })
        const finished = post("Add/Finish/finishSetup", { emailAccountId: personalId })
        const account = accountOf("pat@acme.example")
        const page = render("Account", { emailAccountId: personalId, setup: "done" })
        return { review, finished, account, page }
    },
    then({ review, finished, account, page }) {
        review.errors == ""
        review.output.includes("IMAP 127.0.0.1:1")
        review.output.includes("the last 3 months")
        finished.errors == ""
        // the sync on a worker fails at once on port 1 (EasError) or has not run yet
        ["EasActive", "EasError"].includes(account.statusId)
        page.errors == ""
        page.output.includes("Your account is set up")
        page.output.includes("Open the Inbox")
        !page.output.includes(PASSWORD)
    },
})

feature("a shared account: the wizard back with another kind changes the account's kind, members are added, and the list says to continue its setup", {
    when() {
        const parameters = Object.assign({ emailAddress: "support@acme.example", displayName: "Acme Support", mailPassword: PASSWORD }, local)
        post("Add/Connect/saveConnection", Object.assign({ accountKindEnumId: "EakExternal" }, parameters))
        const first = accountOf("support@acme.example")
        // back to Address, now shared: the same account takes the kind (update#EmailAccount), its filing policy the kind's
        const again = post("Add/Connect/saveConnection", Object.assign({ emailAccountId: first.emailAccountId, accountKindEnumId: "EakShared" }, parameters))
        const account = accountOf("support@acme.example")
        sharedId = account.emailAccountId
        const firstGone = sys(() => ec.entity.find("moqui.basic.email.EmailAccount").condition("emailAccountId", first.emailAccountId).count()) == 0
        const options = render("Add/Options", { emailAccountId: sharedId })
        const added = post("Add/Options/saveOptions", { emailAccountId: sharedId, memberUserIds: "ORG_ZIZI_JD", memberPermissionEnumId: "EapSend" })
        const memberRows = sys(() => Array.from(ec.entity.find("moqui.basic.email.EmailAccountUser").condition("emailAccountId", sharedId).list()))
        const list = render("List", {})
        return { again, first, account, firstGone, options, added, memberRows, list }
    },
    then({ again, first, account, firstGone, options, added, memberRows, list }) {
        again.errors == ""
        account.accountKindEnumId == "EakShared"
        account.recordFilingEnumId == "ErfAllMatches"
        account.statusId == "EasPaused"
        account.emailAccountId == first.emailAccountId
        !firstGone
        options.output.includes("Add people who share it")
        added.errors == ""
        memberRows.length == 1
        memberRows[0].userId == "ORG_ZIZI_JD"
        memberRows[0].permissionEnumId == "EapSend"
        list.errors == ""
        list.output.includes("Setup not finished")
        list.output.includes("Continue setup")
        list.output.includes("support@acme.example")
        list.output.includes("Members: Joe Developer")
        // its card listens for the sync's progress
        list.output.includes("CardSyncProgress")
        list.output.includes("/Comms/Settings/MailAccounts/SyncProgress")
    },
})

feature("a sign-in that failed: the list offers Fix, the page asks for the password again, saves it and tests at once", {
    when() {
        sys(() => ec.entity.find("moqui.basic.email.EmailAccount").condition("emailAccountId", sharedId).updateAll({ statusId: "EasAuthFailed",
            lastSyncDate: new Date(), lastSyncError: "IMAP 127.0.0.1:1: Authentication failed" }))
        const list = render("List", {})
        const page = render("Account", { emailAccountId: sharedId, fix: "Y" })
        const saved = post("Account/savePassword", { emailAccountId: sharedId, emailAddress: "support@acme.example", mailPassword: "new-app-pass" })
        const server = serverOf(accountOf("support@acme.example"))
        const tested = render("Account", { emailAccountId: sharedId, runTest: "Y" })
        return { list, page, saved, server, tested }
    },
    then({ list, page, saved, server, tested }) {
        list.output.includes("Sign-in failed")
        list.output.includes("Fix the sign-in")
        page.errors == ""
        page.output.includes("Sign in again")
        page.output.includes("Authentication failed")
        page.output.includes("Save and test")
        saved.errors == ""
        server.mailPassword == "new-app-pass"
        tested.errors == ""
        tested.output.includes("The connection did not work")
        !tested.output.includes("new-app-pass")
    },
})

feature("the account's page: pause and resume, servers, and members", {
    when() {
        sys(() => ec.entity.find("moqui.basic.email.EmailAccount").condition("emailAccountId", personalId).updateAll({ statusId: "EasActive",
            lastSyncDate: new Date(), lastSyncError: null }))
        const paused = post("Account/pause", { emailAccountId: personalId })
        const pausedStatus = accountOf("pat@acme.example").statusId
        const resumed = post("Account/resume", { emailAccountId: personalId })
        const resumedStatus = accountOf("pat@acme.example").statusId
        const servers = post("Account/saveServers", Object.assign({ emailAccountId: personalId, emailAddress: "pat@acme.example", accountKindEnumId: "EakExternal",
            mailUsername: "pat" }, local, { storeKind: "pop", storeSecurity: "ssl" }))
        const server = serverOf(accountOf("pat@acme.example"))
        const permission = post("Account/setMemberPermission", { emailAccountId: sharedId, userId: "ORG_ZIZI_JD", permissionEnumId: "EapRead" })
        const memberRow = sys(() => ec.entity.find("moqui.basic.email.EmailAccountUser").condition("emailAccountId", sharedId).condition("userId", "ORG_ZIZI_JD").list()[0])
        const page = render("Account", { emailAccountId: sharedId })
        return { paused, pausedStatus, resumed, resumedStatus, servers, server, permission, memberRow, page }
    },
    then({ paused, pausedStatus, resumed, resumedStatus, servers, server, permission, memberRow, page }) {
        paused.errors == ""
        pausedStatus == "EasPaused"
        resumed.errors == ""
        resumedStatus == "EasActive"
        servers.errors == ""
        server.storeProtocol == "pop3s"
        server.mailUsername == "pat"
        server.mailPassword == PASSWORD
        permission.errors == ""
        memberRow.permissionEnumId == "EapRead"
        page.output.includes("Shared with")
        page.output.includes("Joe Developer")
        page.output.includes("Remove the account")
    },
})

feature("Send a test message: to the account's own address (MailCapture), saying when the sync brings it back; a send that fails says why and leaves nothing in the Outbox", {
    when() {
        const capture = ec.factory.getTool("MailCapture")
        let sent, captured, posted, failed
        try {
            capture.enable()
            capture.clear()
            sent = sys(() => call(`${SETTINGS}.send#AccountTestMessage`, { emailAccountId: personalId }))
            captured = Array.from(capture.getMessages())
            posted = post("Account/sendTestMessage", { emailAccountId: personalId })
            // nothing listens on the outgoing server's port 1
            capture.disable()
            failed = sys(() => call(`${SETTINGS}.send#AccountTestMessage`, { emailAccountId: personalId }))
        } finally { capture.reset() }
        const waiting = sys(() => ec.entity.find("moqui.basic.email.EmailMessage").condition("emailAccountId", personalId).condition("statusId", "ES_READY").count())
        // the test messages sent go, so the import below counts only its own
        sys(() => {
            const ids = Array.from(ec.entity.find("moqui.basic.email.EmailMessage").condition("emailAccountId", personalId).condition("statusId", "ES_SENT").list())
                .map((row) => row.emailMessageId)
            if (ids.length) {
                ec.entity.find("moqui.basic.email.EmailRemoteChange").condition("emailMessageId", "in", ids).deleteAll()
                ec.entity.find("moqui.basic.email.EmailMessage").condition("emailMessageId", "in", ids).deleteAll()
            }
        })
        const page = render("Account", { emailAccountId: personalId })
        const wizard = render("Add/Test", { emailAccountId: personalId })
        return { sent, captured, posted, failed, waiting, page, wizard }
    },
    then({ sent, captured, posted, failed, waiting, page, wizard }) {
        sent.sent == true
        sent.resultText.includes("Test message sent to pat@acme.example")
        sent.resultText.includes("The next sync brings it to the Inbox")
        captured.length == 1
        Array.from(captured[0].toList).includes("pat@acme.example")
        captured[0].subject.startsWith("[Test]")
        posted.errors == ""
        failed.sent == false
        failed.resultText.includes("The test message was not sent")
        waiting == 0
        page.errors == ""
        page.output.includes("Send a test message")
        // the wizard offers it once the test passed; here it did not
        wizard.errors == ""
        !wizard.output.includes("Send a test message")
    },
})

feature("an .eml imported once into a folder", {
    requires: ["imap"],
    when() {
        const inbox = sys(() => ec.entity.find("moqui.basic.email.EmailFolder").condition("emailAccountId", personalId).condition("folderKindEnumId", "EfkInbox").one())
        const eml = "From: Ada <ada@acme.example>\r\nTo: pat@acme.example\r\nSubject: Imported hello\r\nMessage-ID: <imported-1@acme.example>\r\nDate: Mon, 12 Oct 2026 10:00:00 +0000\r\n\r\nHello from an eml file.\r\n"
        const imported = post("Account/importMail", { emailAccountId: personalId, emailFolderId: inbox.emailFolderId, mailFile: uploadedFile("hello.eml", eml, "message/rfc822") })
        const again = post("Account/importMail", { emailAccountId: personalId, emailFolderId: inbox.emailFolderId, mailFile: uploadedFile("hello.eml", eml, "message/rfc822") })
        const messages = sys(() => Array.from(ec.entity.find("moqui.basic.email.EmailMessage").condition("emailAccountId", personalId).list()))
        return { imported, again, messages }
    },
    then({ imported, again, messages }) {
        imported.errors == ""
        again.errors == ""
        messages.length == 1
        messages[0].subject == "Imported hello"
    },
})

feature("the outgoing server's own sign-in: tried before it is saved and refused when the server does not take it; emptied, SMTP signs in as the incoming again", {
    when() {
        const base = Object.assign({ emailAccountId: personalId, emailAddress: "pat@acme.example", mailUsername: "pat" }, local, { storeKind: "pop", storeSecurity: "ssl" })
        const refused = post("Account/saveServers", Object.assign({}, base, { mailUsername: "pat2", smtpUsername: "pat-out", smtpPassword: "out-pass" }))
        const afterRefused = serverOf(accountOf("pat@acme.example"))
        const smtpOnly = sys(() => call(`${SETTINGS}.test#MailAccount`, { emailAccountId: personalId, testStore: false, smtpUsername: "pat-out", smtpPassword: "out-pass" }))
        // one stored apart, as when a server took it: the page says so, the same user with no password keeps it, an empty user takes it back
        sys(() => call("org.moqui.impl.EmailClientServices.update#EmailAccount", { emailAccountId: personalId, smtpUsername: "pat-out", smtpPassword: "out-pass" }))
        const page = render("Account", { emailAccountId: personalId })
        const kept = post("Account/saveServers", Object.assign({}, base, { smtpUsername: "pat-out", smtpPassword: "" }))
        const afterKept = serverOf(accountOf("pat@acme.example"))
        const cleared = post("Account/saveServers", Object.assign({}, base, { smtpUsername: "" }))
        const afterCleared = serverOf(accountOf("pat@acme.example"))
        // the wizard: the user the lookup found prefilled
        const connect = render("Add/Connect", Object.assign({ emailAddress: "jo@acme.example", accountKindEnumId: "EakExternal", mailUsername: "jo@acme.example",
            smtpUsername: "jo-smtp@acme.example", source: "autoconfig" }, local))
        return { refused, afterRefused, smtpOnly, page, kept, afterKept, cleared, afterCleared, connect }
    },
    then(v) {
        v.refused.errors.includes("The outgoing server did not take this sign-in")
        v.refused.errors.includes("127.0.0.1:1")
        // nothing of the refused save is kept
        v.afterRefused.mailUsername == "pat"
        v.afterRefused.smtpUsername == null
        v.smtpOnly.stepList.map((step) => step.step) == ["smtp"]
        v.page.errors == ""
        v.page.output.includes("Outgoing user name")
        v.page.output.includes("pat-out")
        v.page.output.includes("The outgoing server signs in as its own user")
        !v.page.output.includes("out-pass")
        v.kept.errors == ""
        v.afterKept.smtpUsername == "pat-out"
        v.afterKept.smtpPassword == "out-pass"
        v.cleared.errors == ""
        v.afterCleared.smtpUsername == null
        v.afterCleared.smtpPassword == null
        v.connect.errors == ""
        v.connect.output.includes("jo-smtp@acme.example")
        v.connect.output.includes("signs in as another user: check it and enter its password")
    },
})

feature("personal or shared on the account's page and in the wizard: made shared and back; a shared one with a member stays shared", {
    when() {
        const options = { emailAccountId: personalId, accountName: "Acme", syncWindowDays: "90" }
        const page = render("Account", { emailAccountId: personalId })
        const toShared = post("Account/saveOptions", Object.assign({ accountKindEnumId: "EakShared", recordFilingEnumId: accountOf("pat@acme.example").recordFilingEnumId }, options))
        const asShared = accountOf("pat@acme.example")
        const sharedPage = render("Account", { emailAccountId: personalId })
        const back = post("Account/saveOptions", Object.assign({ accountKindEnumId: "EakExternal", recordFilingEnumId: asShared.recordFilingEnumId }, options))
        const asPersonal = accountOf("pat@acme.example")
        const refused = post("Account/saveOptions", { emailAccountId: sharedId, accountName: "support@acme.example", accountKindEnumId: "EakExternal" })
        const stillShared = sys(() => ec.entity.find("moqui.basic.email.EmailAccount").condition("emailAccountId", sharedId).one())
        const wizard = render("Add/Options", { emailAccountId: sharedId })
        const supportPage = render("Account", { emailAccountId: sharedId })
        return { page, toShared, asShared, sharedPage, back, asPersonal, refused, stillShared, wizard, supportPage }
    },
    then(v) {
        v.page.output.includes("Whose mail is it?")
        v.page.output.includes("Personal: my own address")
        v.toShared.errors == ""
        v.asShared.accountKindEnumId == "EakShared"
        v.asShared.accountName == "Acme"
        v.sharedPage.output.includes("Nobody shares it yet")
        v.back.errors == ""
        v.asPersonal.accountKindEnumId == "EakExternal"
        v.refused.errors.includes("remove them first")
        v.stillShared.accountKindEnumId == "EakShared"
        v.wizard.output.includes("Whose mail is it?")
        v.wizard.output.includes("Add people who share it")
        v.supportPage.output.includes("To make it personal again, remove the people who share it first")
    },
})

feature("folders: a manager makes a server folder the Archive (the empty one kept only here goes) and stops syncing another; the Inbox stays synced", {
    when() {
        const ids = sys(() => {
            const make = (path) => {
                const row = ec.entity.makeValue("moqui.basic.email.EmailFolder")
                row.setSequencedIdPrimary()
                row.setFields({ emailAccountId: personalId, folderName: path, folderPath: path, folderKindEnumId: "EfkOther", subscribed: "Y" }, true, null, null)
                row.create()
                return row.emailFolderId
            }
            return { old: make("Old Mail"), lists: make("Lists") }
        })
        const folder = (id) => sys(() => ec.entity.find("moqui.basic.email.EmailFolder").condition("emailFolderId", id).one())
        const kindOf = (kind) => sys(() => Array.from(ec.entity.find("moqui.basic.email.EmailFolder").condition("emailAccountId", personalId).condition("folderKindEnumId", kind).list()))
        const placeholder = kindOf("EfkArchive")[0]
        const inbox = kindOf("EfkInbox")[0]
        const page = render("Account", { emailAccountId: personalId })
        const archive = post("Account/saveFolder", { emailAccountId: personalId, emailFolderId: ids.old, folderKindEnumId: "EfkArchive" })
        const unsynced = post("Account/saveFolder", { emailAccountId: personalId, emailFolderId: ids.lists, subscribed: "N" })
        const inboxOff = post("Account/saveFolder", { emailAccountId: personalId, emailFolderId: inbox.emailFolderId, subscribed: "N" })
        const after = render("Account", { emailAccountId: personalId })
        return { page, archive, unsynced, inboxOff, after, old: folder(ids.old), lists: folder(ids.lists), placeholderLeft: folder(placeholder.emailFolderId),
            inboxAfter: folder(inbox.emailFolderId), archives: kindOf("EfkArchive") }
    },
    then(v) {
        v.page.errors == ""
        v.page.output.includes("Use as")
        v.page.output.includes("Old Mail")
        v.page.output.includes("A folder of its own")
        v.archive.errors == ""
        v.old.folderKindEnumId == "EfkArchive"
        v.old.kindByUser == "Y"
        v.placeholderLeft == null
        v.archives.length == 1
        v.unsynced.errors == ""
        v.lists.subscribed == "N"
        v.inboxOff.errors.includes("The Inbox is always synced")
        v.inboxAfter.subscribed != "N"
        v.after.output.includes("Not synced")
    },
})

feature("another user reaches none of john.doe's accounts; a member who only reads sees the shared one and may leave it", {
    when() {
        login("joe.developer")
        const page = render("Account", { emailAccountId: personalId })
        const connect = post("Add/Connect/saveConnection", Object.assign({ emailAccountId: personalId, emailAddress: "pat@acme.example", accountKindEnumId: "EakExternal",
            mailPassword: "stolen" }, local))
        const list = render("List", {})
        const shared = render("Account", { emailAccountId: sharedId })
        const sharedServers = post("Account/saveServers", Object.assign({ emailAccountId: sharedId, emailAddress: "support@acme.example", accountKindEnumId: "EakShared" }, local))
        login("john.doe")
        const account = accountOf("pat@acme.example")
        const server = serverOf(account)
        return { page, connect, list, shared, sharedServers, account, server }
    },
    then({ page, connect, list, shared, sharedServers, account, server }) {
        page.output.includes("not found")
        !page.output.includes("pat@acme.example")
        connect.errors.includes("not found")
        !list.output.includes("pat@acme.example")
        list.output.includes("support@acme.example")
        shared.errors == ""
        shared.output.includes("Leave this account")
        !shared.output.includes("Sign-in and servers")
        !shared.output.includes("Remove the account")
        sharedServers.errors.includes("You may not change")
        account.accountName == "Acme"
        account.statusId == "EasActive"
        server.mailPassword == PASSWORD
    },
})

feature("remove: keeping the mail here takes the account out of the lists; deleting removes it and its mail here", {
    when() {
        const kept = post("Account/removeAccount", { emailAccountId: sharedId, deleteLocalCopies: "N" })
        const keptRow = sys(() => ec.entity.find("moqui.basic.email.EmailAccount").condition("emailAccountId", sharedId).one())
        const deleted = post("Account/removeAccount", { emailAccountId: personalId, deleteLocalCopies: "Y" })
        const deletedCount = sys(() => ec.entity.find("moqui.basic.email.EmailAccount").condition("emailAccountId", personalId).count())
        const messageCount = sys(() => ec.entity.find("moqui.basic.email.EmailMessage").condition("emailAccountId", personalId).count())
        const list = render("List", {})
        return { kept, keptRow, deleted, deletedCount, messageCount, list }
    },
    then({ kept, keptRow, deleted, deletedCount, messageCount, list }) {
        kept.errors == ""
        keptRow.statusId == "EasRemoved"
        deleted.errors == ""
        deletedCount == 0
        messageCount == 0
        !list.output.includes("pat@acme.example")
        // the one removed with its mail kept is no card, only in the Removed accounts its owner sees
        !list.output.includes("support@acme.example")
        list.output.includes("RemovedMailAccounts")
    },
})

feature("removed accounts: listed to their owner with the mail kept, deleted with it on a yes; nobody else sees or deletes one, nor an account in use", {
    when() {
        const component = sys(() => {
            const str = ec.screen.makeTest().rootScreen(comms).renderMode("qvue").render(`${BASE}/Removed`, { lastStandalone: "-2" }, null)
            ec.message.clearErrors()
            return String(str.output || "")
        })
        const listed = json("Removed/removedData")
        login("joe.developer")
        const joeListed = json("Removed/removedData")
        login("john.doe")
        const inUse = json("Removed/deleteRemoved", { emailAccountId: "BOSS_DEMO_MAIL_ACCT" }, "post")
        const deleted = json("Removed/deleteRemoved", { emailAccountId: sharedId }, "post")
        const left = sys(() => ec.entity.find("moqui.basic.email.EmailAccount").condition("emailAccountId", sharedId).count())
        const demo = sys(() => ec.entity.find("moqui.basic.email.EmailAccount").condition("emailAccountId", "BOSS_DEMO_MAIL_ACCT").one())
        return { component, listed, joeListed, inUse, deleted, left, demo, after: json("Removed/removedData", {}), list: render("List", {}) }
    },
    then(v) {
        v.component.includes("module.exports")
        v.component.includes("Delete with its mail")
        v.listed.errors == ""
        v.listed.json.removedList.some((account) => account.emailAccountId == sharedId && account.emailAddress == "support@acme.example")
        !v.joeListed.json.removedList.some((account) => account.emailAccountId == sharedId)
        v.inUse.errors.includes("not found")
        v.demo.statusId != "EasRemoved"
        v.deleted.errors == ""
        v.deleted.json.messageInfos[0].message.includes("deleted with its mail")
        v.left == 0
        !v.after.json.removedList.some((account) => account.emailAccountId == sharedId)
        v.list.errors == ""
    },
})

feature("a hosted address and a shared address the gateway delivers need no mail server or password", {
    when() {
        // Proton is refused only when the servers are looked up; delivered here does not look them up
        const proton = post("Add/Address/findServers", { emailAddress: "ada@proton.me", displayName: "Ada", accountKindEnumId: "EakHosted" })
        const sharedFind = post("Add/Address/findServers", { emailAddress: "orders@acme.example", displayName: "Orders", accountKindEnumId: "EakSharedHere" })
        const connect = render("Add/Connect", { emailAddress: "ada@hosted.example", displayName: "Ada Host", accountKindEnumId: "EakHosted", delivery: "gateway" })
        const personal = post("Add/Connect/saveConnection", { emailAddress: "ada@hosted.example", displayName: "Ada Host", accountKindEnumId: "EakExternal", gatewayDelivery: "Y" })
        const saved = post("Add/Connect/saveConnection", { emailAddress: "ada@hosted.example", displayName: "Ada Host", accountKindEnumId: "EakHosted", gatewayDelivery: "Y" })
        const account = accountOf("ada@hosted.example")
        const hostedId = account ? account.emailAccountId : null
        const identity = hostedId ? sys(() => ec.entity.find("moqui.basic.email.EmailIdentity").condition("emailAccountId", hostedId).one()) : null
        const sharedSaved = post("Add/Connect/saveConnection", { emailAddress: "orders@acme.example", displayName: "Orders", accountKindEnumId: "EakShared", gatewayDelivery: "Y" })
        const shared = accountOf("orders@acme.example")
        const back = render("Add/Connect", { emailAccountId: hostedId })
        const test = render("Add/Test", { emailAccountId: hostedId })
        const confirmed = post("Add/Test/confirmTest", { emailAccountId: hostedId, testPassed: "Y" })
        const options = render("Add/Options", { emailAccountId: hostedId })
        const named = post("Add/Options/saveOptions", { emailAccountId: hostedId, accountName: "Ada", accountKindEnumId: "EakHosted", syncWindowDays: "365" })
        const review = render("Add/Finish", { emailAccountId: hostedId })
        const finished = post("Add/Finish/finishSetup", { emailAccountId: hostedId })
        const after = accountOf("ada@hosted.example")
        const page = render("Account", { emailAccountId: hostedId, setup: "done" })
        const list = render("List", {})
        return { proton, sharedFind, connect, personal, saved, account, identity, sharedSaved, shared, back, test, confirmed, options, named, review, finished, after, page, list }
    },
    then(v) {
        v.proton.errors == ""
        !v.proton.errors.includes("Proton")
        v.sharedFind.errors == ""
        v.connect.errors == ""
        !v.connect.broken
        v.connect.output.includes("sales+news@example.com")
        v.connect.output.includes("mail gateway")
        !v.connect.output.includes("Incoming server")
        !v.connect.output.includes("App password")
        v.personal.errors.includes("hosted or a shared")
        v.saved.errors == ""
        v.account != null
        v.account.accountKindEnumId == "EakHosted"
        v.account.statusId == "EasPaused"
        v.account.emailServerId == null
        v.account.recordFilingEnumId == "ErfAllMatches"
        v.identity.displayName == "Ada Host"
        v.sharedSaved.errors == ""
        v.shared.accountKindEnumId == "EakShared"
        v.shared.emailServerId == null
        v.shared.statusId == "EasPaused"
        v.shared.recordFilingEnumId == "ErfAllMatches"
        v.back.errors == ""
        v.back.output.includes("sales+news@example.com")
        !v.back.output.includes("Incoming server")
        v.test.errors == ""
        !v.test.broken
        v.test.output.includes("Nothing to sign in to")
        v.test.output.includes("sales+news@example.com")
        !v.test.output.includes("It did not work yet")
        v.confirmed.errors == ""
        v.options.errors == ""
        v.options.output.includes("Hosted here")
        v.named.errors == ""
        v.review.errors == ""
        v.review.output.includes("Hosted")
        v.review.output.includes("The mail gateway delivers it here")
        v.review.output.includes("sales+news@example.com")
        v.finished.errors == ""
        v.after.statusId == "EasActive"
        v.after.accountName == "Ada"
        v.after.emailServerId == null
        v.page.errors == ""
        v.page.output.includes("The account is on")
        v.page.output.includes("How mail arrives")
        !v.page.output.includes("Enter the servers to sync it")
        v.list.errors == ""
        v.list.output.includes("ada@hosted.example")
        v.list.output.includes("Delivered here")
        v.list.output.includes("orders@acme.example")
        v.list.output.includes("Setup not finished")
    },
})
