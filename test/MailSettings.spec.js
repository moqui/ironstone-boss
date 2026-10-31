// The Comms mail settings besides the accounts (screen/Comms/Settings: Index, Identities, Rules with Rules.qvue, OutOfOffice,
// TextBlocks; the Mail box of Commons Preferences; service/ironstone/comms/MailSettingsServices.xml; design-drawers-commons.md §17, §11
// MailDefaults): on the demo of data/BossMailDemoData.xml (load#MailSettingsDemo: the shared Support account whose sign-in failed,
// john.doe's rules, automatic reply and text blocks) and on an account of this spec's own (127.0.0.1 port 1, nothing listens) with
// an imported message, so the rules run on mail no other spec reads; its automatic reply to contacts goes (MailCapture) to
// john.doe's personal contact and not to a stranger, by the contact hook BossSetupData sets (Mantle's filter#ContactAddresses);
// the more domains of people inside are kept with the reply.
// Each signature, reply and text block is cleaned as safe HTML.
// joe.developer may not change john.doe's identities, rules, automatic reply or text blocks; he sees the shared text block and,
// as a member who sends from Support, its identity without changing it. Authorization stays on, as for a browser request.
// Run: ./moq test mr-boss --spec MailSettings
const webroot = "component://webroot/screen/webroot.xml"
const comms = "component://mr-boss/screen/Comms.xml"
const commons = "component://mr-boss/screen/Commons.xml"
const DEMO = "BOSS_DEMO_MAIL_ACCT"
const SUPPORT = "BOSS_DEMO_MAIL_SUPPORT"

function render(path, parameters) {
    const str = ec.screen.makeTest().rootScreen(webroot).renderMode("qvt").withStaticData().render(`apps/${path}`, Object.assign({ lastStandalone: "true" }, parameters || {}), null)
    const output = String(str.output || "")
    ec.message.clearErrors()
    return { status: str.status, errors: str.errorMessages.join(" | "), output, broken: /Error rendering|Exception in render/.test(output) }
}
function post(root, path, parameters) {
    const str = ec.screen.makeTest().rootScreen(root).render(path, parameters || {}, "post")
    const output = String(str.output || "")
    ec.message.clearErrors()
    return { status: str.status, errors: str.errorMessages.join(" | "), output }
}
function json(path, parameters, method) {
    const str = ec.screen.makeTest().rootScreen(comms).render(path, parameters || {}, method || null)
    let parsed = null
    try { parsed = JSON.parse(str.output) } catch (err) { parsed = null }
    const errors = (parsed && parsed.errors) || str.errorMessages.join(" | ")
    ec.message.clearErrors()
    return { status: str.status, errors: errors || "", json: parsed || {} }
}
const settings = (path, parameters) => post(comms, `Settings/${path}`, parameters)
const rules = (name, parameters, method) => json(`Settings/Rules/${name}`, parameters, method || "post")
function sys(run) {
    const wasDisabled = ec.artifactExecution.disableAuthz()
    try { return run() } finally { if (!wasDisabled) ec.artifactExecution.enableAuthz() }
}
const rows = (entityName, fields) => sys(() => Array.from(ec.entity.find(entityName).condition(fields).list()))
const one = (entityName, fields) => sys(() => ec.entity.find(entityName).condition(fields).one())
const fmt = (millis) => ec.l10n.format(new Date(millis), "yyyy-MM-dd HH:mm")
let ownId, ownInbox, ownArchive, identityId, ruleId, blockId, blockId2, textBlockId

spec({
    stepwise: true,

    setupSpec() {
        sys(() => { call("ironstone.comms.MailDemoServices.load#MailDemo", {}); call("ironstone.comms.MailDemoServices.load#MailSettingsDemo", {}) })
        login("john.doe")
    },
    cleanupSpec() {
        login("john.doe")
        if (ownId) sys(() => call("org.moqui.impl.EmailClientServices.delete#EmailAccount", { emailAccountId: ownId, deleteLocalCopies: true }))
        sys(() => call("ironstone.comms.MailDemoServices.load#MailSettingsDemo", {}))
        for (const key of ["MAIL_READING_PANE", "MAIL_MARK_READ_SECONDS", "MAIL_UNDO_SECONDS", "MAIL_ARCHIVE_NEXT", "MAIL_REMOTE_IMAGES",
                "MAIL_CONVERSATION", "MAIL_DEFAULT_ACCOUNT", "MAIL_SIGNATURE_PLACEMENT", "MAIL_SWIPE_LEFT", "MAIL_SWIPE_RIGHT"]) ec.user.setPreference(key, null)
    },
})

feature("the settings index has a card per group and says an account needs attention; Comms Settings opens on it", {
    when() {
        const index = render("Comms/Settings/Index", {})
        // the path of Comms Settings itself shows the index
        const root = render("Comms/Settings", {}).output
        return { index, root }
    },
    then({ index, root }) {
        index.errors == ""
        !index.broken
        ["Mail accounts", "Identities and signatures", "Rules", "Out of office", "Text blocks", "Chat settings", "Reading and keys"].every((text) => index.output.includes(text))
        // the demo's Support account needs attention; in a full run other specs' accounts may too
        /\b(1 needs|\d+ need) your attention/.test(index.output)
        root.includes("Identities and signatures")
    },
})

// The two inbox messages the rules read. This feature writes them as entity rows. The import feature, which
// requires imap, replaces them with the same messages read from the .eml text.
function seedInboxMessage(subject, fromName, fromAddress, messageId, messageDate) {
    const message = ec.entity.makeValue("moqui.basic.email.EmailMessage")
    message.setSequencedIdPrimary()
    message.setFields({ emailAccountId: ownId, emailFolderId: ownInbox, statusId: "ES_RECEIVED", subject, fromName, fromAddress,
        toAddresses: "rules@acme.example", body: "<p>Hello</p>", bodyText: "Hello", contentType: "text/html", messageDate, receivedDate: messageDate,
        isRead: "N", messageId, snippet: "Hello" }, true, null, null)
    message.create()
}

feature("an account of this spec's own, for the rules to run on", {
    when() {
        const made = sys(() => call("org.moqui.comms.MailSettingsServices.save#AccountConnection", { emailAddress: "rules@acme.example", accountKindEnumId: "EakExternal",
            storeHost: "127.0.0.1", storePort: "1", smtpHost: "127.0.0.1", smtpPort: "1", smtpSecurity: "none", mailPassword: "x" }))
        ownId = made.emailAccountId
        ownInbox = one("moqui.basic.email.EmailFolder", { emailAccountId: ownId, folderKindEnumId: "EfkInbox" }).emailFolderId
        ownArchive = one("moqui.basic.email.EmailFolder", { emailAccountId: ownId, folderKindEnumId: "EfkArchive" }).emailFolderId
        sys(() => {
            seedInboxMessage("Invoice 7 is due", "Billing", "billing@vendor.example", "<inv-7@acme.example>", new Date("2026-10-12T10:01:00Z"))
            seedInboxMessage("Hello", "Ada", "ada@vendor.example", "<hello-1@acme.example>", new Date("2026-10-12T10:00:00Z"))
        })
        return { count: rows("moqui.basic.email.EmailMessage", { emailAccountId: ownId }).length }
    },
    then({ count }) {
        ownId != null
        count == 2
    },
})

feature("two messages imported into that account's Inbox", {
    requires: ["imap"],
    when() {
        sys(() => ec.entity.find("moqui.basic.email.EmailMessage").condition("emailAccountId", ownId).deleteAll())
        const eml = (id, subject, from) => `From: ${from}\r\nTo: rules@acme.example\r\nSubject: ${subject}\r\nMessage-ID: <${id}@acme.example>\r\nDate: Mon, 12 Oct 2026 10:00:00 +0000\r\n\r\nHello.\r\n`
        const imported = sys(() => call("org.moqui.impl.EmailClientServices.import#EmailMessages", { emailFolderId: ownInbox,
            messageText: eml("inv-7", "Invoice 7 is due", "Billing <billing@vendor.example>") + "\r\n" }))
        sys(() => call("org.moqui.impl.EmailClientServices.import#EmailMessages", { emailFolderId: ownInbox, messageText: eml("hello-1", "Hello", "Ada <ada@vendor.example>") }))
        return { imported, count: rows("moqui.basic.email.EmailMessage", { emailAccountId: ownId }).length }
    },
    then({ imported, count }) {
        imported.importedCount == 1
        count == 2
    },
})

feature("identities: listed per account; add one with a signature cleaned of scripts, make it default, change it, delete it", {
    when() {
        const shown = render("Comms/Settings/Identities", {})
        const bad = settings("Identities/storeIdentity", { emailAccountId: ownId, emailAddress: "not-an-address", displayName: "X" })
        const added = settings("Identities/storeIdentity", { emailAccountId: ownId, emailAddress: "sales@acme.example", displayName: "Acme Sales",
            replyToAddress: "team@acme.example", signatureHtml: '<p>Acme Sales</p><script>alert(1)</script><p onclick="x()">Call us</p>',
            signaturePlacementEnumId: "EspAboveQuote", useForReplies: "Y", isDefault: "Y" })
        const identity = rows("moqui.basic.email.EmailIdentity", { emailAccountId: ownId }).find((row) => row.emailAddress == "sales@acme.example")
        identityId = identity ? identity.emailIdentityId : null
        const defaults = rows("moqui.basic.email.EmailIdentity", { emailAccountId: ownId }).filter((row) => row.isDefault == "Y").map((row) => row.emailAddress)
        const changed = settings("Identities/storeIdentity", { emailIdentityId: identityId, emailAddress: "sales@acme.example", displayName: "Acme Sales Team",
            replyToAddress: "", signatureHtml: "<p>The sales team</p>", signaturePlacementEnumId: "EspBelowQuote" })
        const after = one("moqui.basic.email.EmailIdentity", { emailIdentityId: identityId })
        const backDefault = settings("Identities/makeDefault", { emailIdentityId: rows("moqui.basic.email.EmailIdentity", { emailAccountId: ownId })
            .find((row) => row.emailAddress == "rules@acme.example").emailIdentityId })
        const deleted = settings("Identities/deleteIdentity", { emailIdentityId: identityId })
        const left = rows("moqui.basic.email.EmailIdentity", { emailAccountId: ownId }).map((row) => row.emailAddress)
        return { shown, bad, added, identity, defaults, changed, after, backDefault, deleted, left }
    },
    then({ shown, bad, added, identity, defaults, changed, after, backDefault, deleted, left }) {
        shown.errors == ""
        !shown.broken
        shown.output.includes("John Doe &lt;john.doe@moqui.org&gt;") || shown.output.includes("John Doe <john.doe@moqui.org>")
        shown.output.includes("Ziziwork Support")
        shown.output.includes("Add an identity")
        bad.errors.includes("Enter the address to send as")
        added.errors == ""
        identity.signatureHtml.includes("Acme Sales")
        !identity.signatureHtml.includes("script")
        !identity.signatureHtml.includes("onclick")
        identity.signaturePlacementEnumId == "EspAboveQuote"
        identity.replyToAddress == "team@acme.example"
        defaults == ["sales@acme.example"]
        changed.errors == ""
        after.displayName == "Acme Sales Team"
        after.replyToAddress == null
        after.useForReplies == "N"
        after.signaturePlacementEnumId == "EspBelowQuote"
        backDefault.errors == ""
        deleted.errors == ""
        left == ["rules@acme.example"]
    },
})

feature("rules: the demo's in words with the blocked sender apart; a new rule saved, reordered, turned off, run on a folder; blocking and unblocking", {
    when() {
        const page = render("Comms/Settings/Rules", {})
        const qvue = sys(() => {
            const str = ec.screen.makeTest().rootScreen(comms).renderMode("qvue").render("Settings/Rules", {}, null)
            ec.message.clearErrors()
            return String(str.output || "")
        })
        const data = rules("rulesData", {}, "get")
        const saved = rules("saveRule", { ruleName: "Invoices to Archive", emailAccountId: ownId, matchAllEnumId: "ErmAll",
            conditionsJson: JSON.stringify([{ field: "subject", operator: "contains", value: "invoice" }]),
            actionsJson: JSON.stringify([{ action: "moveToFolder", value: ownArchive }, { action: "addLabel", value: "Invoices" }]), enabled: "Y", stopProcessing: "Y" })
        ruleId = saved.json.emailRuleId
        const order = () => rules("rulesData", {}, "get").json.ruleList.map((rule) => rule.ruleName)
        const before = order()
        const ids = rules("rulesData", {}, "get").json.ruleList.map((rule) => rule.emailRuleId)
        const reordered = rules("reorderRules", { emailRuleIdsJson: JSON.stringify([ruleId].concat(ids.filter((id) => id != ruleId))) })
        const afterOrder = order()
        const off = rules("setEnabled", { emailRuleId: ruleId, enabled: "N" })
        const offRule = one("moqui.basic.email.EmailRule", { emailRuleId: ruleId })
        rules("setEnabled", { emailRuleId: ruleId, enabled: "Y" })
        // the editor's Test: what the conditions match in the folder's newest mail, nothing done to it
        const tested = rules("testRule", { emailFolderId: ownInbox, matchAllEnumId: "ErmAll",
            conditionsJson: JSON.stringify([{ field: "subject", operator: "contains", value: "invoice" }]) })
        const testedEdit = rules("testRule", { emailRuleId: ruleId, emailFolderId: ownInbox, conditionsJson: JSON.stringify([{ field: "from", operator: "contains", value: "ada@" }]) })
        const untouched = rows("moqui.basic.email.EmailMessage", { emailAccountId: ownId }).find((row) => row.subject == "Invoice 7 is due").emailFolderId
        const matchedBefore = one("moqui.basic.email.EmailRule", { emailRuleId: ruleId }).matchedCount || 0
        const run = rules("runRules", { emailFolderId: ownInbox })
        const invoice = rows("moqui.basic.email.EmailMessage", { emailAccountId: ownId }).find((row) => row.subject == "Invoice 7 is due")
        const hello = rows("moqui.basic.email.EmailMessage", { emailAccountId: ownId }).find((row) => row.subject == "Hello")
        const label = rows("moqui.basic.email.EmailLabel", { emailAccountId: ownId }).find((row) => row.labelName == "Invoices")
        const blocked = rules("blockAddress", { emailAddress: "Spammer <spam@junk.example>", emailAccountId: ownId })
        blockId = blocked.json.emailRuleId
        const withBlock = rules("rulesData", {}, "get").json
        const unblocked = rules("deleteRule", { emailRuleId: blockId })
        const withoutBlock = rules("rulesData", {}, "get").json
        return { page, qvue, data: data.json, saved, before, reordered, afterOrder, off, offRule, run, invoice, hello, label, blocked, withBlock, unblocked, withoutBlock,
            tested, testedEdit, untouched, matchedBefore }
    },
    then({ page, qvue, data, saved, before, reordered, afterOrder, off, offRule, run, invoice, hello, label, blocked, withBlock, unblocked, withoutBlock,
            tested, testedEdit, untouched, matchedBefore }) {
        tested.errors == ""
        tested.json.matchedCount == 1
        tested.json.testedCount == 2
        tested.json.matchList[0].subject == "Invoice 7 is due"
        tested.json.matchList[0].fromText.includes("billing@vendor.example")
        tested.json.resultText.includes("nothing was done")
        // each match opens its thread in the Inbox: the folder tried with the thread open
        tested.json.matchList[0].store == "email"
        tested.json.matchList[0].emailAccountId == ownId
        tested.json.matchList[0].emailFolderId == ownInbox
        // the invoice is its thread's root
        tested.json.matchList[0].threadId == invoice.emailMessageId
        tested.json.matchList[0].threadKey == "email:" + invoice.emailMessageId
        tested.json.matchList[0].inboxUrl == `/qapps/Comms/Inbox?account=${ownId}&folder=${ownInbox}&thread=${encodeURIComponent(tested.json.matchList[0].threadKey)}`
        qvue.includes("match.inboxUrl")
        testedEdit.json.matchList.map((match) => match.subject) == ["Hello"]
        untouched == ownInbox
        matchedBefore == 0
        qvue.includes("testRule")
        // a .qvue screen only: the shell loads it in qvue (its best client mode), and a .qvt of it is not found
        page.status != 200
        qvue.includes("module.exports")
        qvue.includes("Blocked senders")
        // john.doe's own account's rules (the Support account's intake rule of Projects, impl-projects.md P5, is beside them)
        const own = data.ruleList.filter((rule) => !rule.ruleName.startsWith("Intake:"))
        own.map((rule) => rule.ruleName) == ["Receipts", "Newsletters", "Flag mail from Acme"]
        own[0].conditionText == 'Subject contains "receipt" or From starts with "billing@"'
        own[0].actionText == "Move to Receipts, Mark read"
        own[1].actionText == "Label Newsletters"
        own[2].enabled == false
        data.ruleList.some((rule) => rule.ruleName == "Intake: IronStone Projects" && rule.actionText == "Make a request")
        data.blockedList.map((sender) => sender.emailAddress) == ["offers@deals.example"]
        data.accountList.some((account) => account.emailAccountId == ownId && account.folderList.some((folder) => folder.value == ownArchive))
        saved.errors == ""
        before[before.length - 1] == "Invoices to Archive"
        reordered.errors == ""
        afterOrder[0] == "Invoices to Archive"
        off.errors == ""
        offRule.enabled == "N"
        run.errors == ""
        run.json.matchedCount == 1
        invoice.emailFolderId == ownArchive
        hello.emailFolderId == ownInbox
        label != null
        blocked.errors == ""
        withBlock.blockedList.some((sender) => sender.emailAddress == "spam@junk.example")
        !withBlock.ruleList.some((rule) => rule.emailRuleId == blockId)
        unblocked.errors == ""
        !withoutBlock.blockedList.some((sender) => sender.emailAddress == "spam@junk.example")
    },
})

feature("out of office: the demo's reply shows off; turned on for three days it is on now, the Inbox says so; on every account at once; off again", {
    when() {
        const shown = render("Comms/Settings/OutOfOffice", { emailAccountId: DEMO })
        // the page is server-static: its account chips ("Support · off") are composed in the browser from this data
        const shownChips = JSON.parse(ec.screen.makeTest().rootScreen(webroot).render("apps/Comms/Settings/OutOfOffice/actions", { emailAccountId: DEMO }, null).output || "{}").oooAccounts || []
        const now = Date.now()
        const on = settings("OutOfOffice/storeReply", { emailAccountId: DEMO, enabled: "Y", fromDate: fmt(now - 3600000), thruDate: fmt(now + 3 * 86400000),
            subject: "Away", bodyHtml: '<p>Away until Thursday.</p><img src="x" onerror="alert(1)">', internalBodyHtml: "", replyOncePerDays: "2" })
        const stored = one("moqui.basic.email.EmailOutOfOffice", { emailAccountId: DEMO })
        const shownOn = render("Comms/Settings/OutOfOffice", { emailAccountId: DEMO })
        const inbox = json("Inbox/Mail/inboxData", {}, null)
        const all = settings("OutOfOffice/storeReply", { emailAccountId: DEMO, enabled: "Y", bodyHtml: "<p>Away.</p>", applyToAll: "Y" })
        const supportReply = one("moqui.basic.email.EmailOutOfOffice", { emailAccountId: SUPPORT })
        const ownReply = one("moqui.basic.email.EmailOutOfOffice", { emailAccountId: ownId })
        for (const id of [DEMO, SUPPORT, ownId]) settings("OutOfOffice/turnOff", { emailAccountId: id })
        const afterOff = rows("moqui.basic.email.EmailOutOfOffice", {}).filter((row) => [DEMO, SUPPORT, ownId].includes(row.emailAccountId) && row.enabled == "Y")
        // who gets it: people inside only; contacts are the hook's (BossSetupData's STRT_EMAIL_CONTACT_SERVICE), so no note says otherwise
        const inside = settings("OutOfOffice/storeReply", { emailAccountId: DEMO, enabled: "Y", fromDate: fmt(now - 3600000), thruDate: fmt(now + 3 * 86400000),
            subject: "Away", bodyHtml: "<p>Away until Thursday.</p>", replyOncePerDays: "2", replyAudienceEnumId: "EraInternal",
            internalDomains: "Partner.example.org, @ally.example.com" })
        const insideRow = one("moqui.basic.email.EmailOutOfOffice", { emailAccountId: DEMO })
        const shownInside = render("Comms/Settings/OutOfOffice", { emailAccountId: DEMO })
        settings("OutOfOffice/turnOff", { emailAccountId: DEMO })
        const offKeepsAudience = one("moqui.basic.email.EmailOutOfOffice", { emailAccountId: DEMO })
        return { shown, shownChips, on, stored, shownOn, inbox: inbox.json, all, supportReply, ownReply, afterOff, inside, insideRow,
            shownInside, offKeepsAudience }
    },
    then({ shown, shownChips, on, stored, shownOn, inbox, all, supportReply, ownReply, afterOff, inside, insideRow, shownInside,
            offKeepsAudience }) {
        shown.output.includes("Reply to")
        shown.output.includes("Only people inside the organization")
        stored.replyAudienceEnumId == "EraEveryone"
        inside.errors == ""
        insideRow.replyAudienceEnumId == "EraInternal"
        // more domains of people inside: kept in lower case; turning off keeps them
        insideRow.internalDomains == "partner.example.org,ally.example.com"
        shownInside.output.includes("Other domains inside the organization")
        shownInside.output.includes("partner.example.org, ally.example.com")
        offKeepsAudience.internalDomains == "partner.example.org,ally.example.com"
        !shownInside.output.includes("counts as a contact")
        shownInside.output.includes("Your contacts are the people your address book knows")
        offKeepsAudience.enabled == "N"
        offKeepsAudience.replyAudienceEnumId == "EraInternal"
        shown.errors == ""
        !shown.broken
        shown.output.includes("Away until Monday")
        shown.output.includes("Off.")
        shownChips.some((chip) => chip.accountName === "Support" && chip.stateText === "off")
        on.errors == ""
        stored.enabled == "Y"
        stored.replyOncePerDays == 2
        stored.internalBodyHtml == null
        !stored.bodyHtml.includes("onerror")
        shownOn.output.includes("On now, until")
        inbox.outOfOfficeList.some((item) => item.emailAccountId == "BOSS_DEMO_MAIL_ACCT")
        all.errors == ""
        supportReply.enabled == "Y"
        ownReply.enabled == "Y"
        afterOff.length == 0
    },
})

feature("out of office to contacts and people inside: Mary, john.doe's personal contact, gets the automatic reply; a stranger does not", {
    when() {
        const capture = ec.factory.getTool("MailCapture")
        capture.enable()
        try {
            capture.clear()
            const now = Date.now()
            sys(() => call("org.moqui.impl.EmailClientServices.store#EmailOutOfOffice", { emailAccountId: ownId, enabled: true, fromDate: new Date(now - 3600000),
                subject: "Away", bodyHtml: "<p>Away this week, back Monday.</p>", replyOncePerDays: 4, replyAudienceEnumId: "EraContacts" }))
            // two messages to the account just now: from Mary (her address in another case) and from a stranger
            const ids = sys(() => [["Mary.Doe@Example.com", "Lunch on Friday?"], ["stranger@nowhere.example", "A business offer"]].map(([fromAddress, subject]) => {
                const message = ec.entity.makeValue("moqui.basic.email.EmailMessage")
                message.setSequencedIdPrimary()
                message.setFields({ emailAccountId: ownId, emailFolderId: ownInbox, statusId: "ES_RECEIVED", subject, fromAddress, toAddresses: "rules@acme.example",
                    body: "<p>Hello</p>", bodyText: "Hello", contentType: "text/html", messageDate: new Date(now - 60000), receivedDate: new Date(now - 60000),
                    isRead: "N", messageId: `<ooo-${fromAddress.toLowerCase()}-${now}@test.example>` }, true, null, null)
                message.create()
                return message.emailMessageId
            }))
            // the hook, as the framework asks it for the account's owner
            const hook = sys(() => call("org.moqui.impl.EmailClientServices.filter#ContactAddresses", { userId: "EX_JOHN_DOE",
                emailAddressList: ["mary.doe@example.com", "stranger@nowhere.example"] }))
            const out = sys(() => call("org.moqui.impl.EmailClientServices.send#OutOfOfficeReplies", { emailAccountId: ownId, emailMessageIdList: ids }))
            return { hook, out, captured: Array.from(capture.getMessages()), sent: rows("moqui.basic.email.EmailOutOfOfficeSent", { emailAccountId: ownId }) }
        } finally {
            capture.reset()
            sys(() => call("org.moqui.impl.EmailClientServices.store#EmailOutOfOffice", { emailAccountId: ownId, enabled: false, bodyHtml: "<p>Away.</p>",
                replyAudienceEnumId: "EraContacts" }))
        }
    },
    then({ hook, out, captured, sent }) {
        hook.hookService == "mantle.party.ContactBookServices.filter#ContactAddresses"
        !hook.hookFailed
        hook.contactAddressList == ["mary.doe@example.com"]
        out.sentCount == 1
        out.skippedCount == 1
        captured.length == 1
        captured[0].toList.length == 1
        captured[0].toList[0].includes("Mary.Doe@Example.com")
        captured[0].subject == "Away"
        captured[0].body.includes("Away this week, back Monday.")
        sent.map((row) => row.toAddress) == ["mary.doe@example.com"]
    },
})

feature("text blocks: the demo's own and shared ones with a search; one added with its shortcut, changed and deleted", {
    when() {
        const shown = render("Comms/Settings/TextBlocks", {})
        const found = render("Comms/Settings/TextBlocks", { searchText: "directions" })
        const added = settings("TextBlocks/storeTextBlock", { title: "Opening hours", shortcut: "/hours", bodyHtml: "<p>9 to 5</p><script>x()</script>",
            userGroupId: "BOSS_DEMO_OFFICE" })
        const block = rows("moqui.basic.email.EmailTextBlock", { ownerUserId: "EX_JOHN_DOE" }).find((row) => row.title == "Opening hours")
        textBlockId = block ? block.emailTextBlockId : null
        const changed = settings("TextBlocks/storeTextBlock", { emailTextBlockId: textBlockId, title: "Opening hours", shortcut: "hours", bodyHtml: "<p>8 to 6</p>", userGroupId: "" })
        const after = one("moqui.basic.email.EmailTextBlock", { emailTextBlockId: textBlockId })
        const deleted = settings("TextBlocks/deleteTextBlock", { emailTextBlockId: textBlockId })
        return { shown, found, added, block, changed, after, deleted, gone: one("moqui.basic.email.EmailTextBlock", { emailTextBlockId: textBlockId }) }
    },
    then({ shown, found, added, block, changed, after, deleted, gone }) {
        shown.errors == ""
        !shown.broken
        shown.output.includes("Directions to the office")
        shown.output.includes("Meeting follow-up")
        shown.output.includes("Shared with Office team")
        shown.output.includes("/directions")
        found.output.includes("Directions to the office")
        !found.output.includes("Meeting follow-up")
        added.errors == ""
        block.shortcut == "hours"
        block.userGroupId == "BOSS_DEMO_OFFICE"
        !block.bodyHtml.includes("script")
        changed.errors == ""
        after.userGroupId == null
        after.bodyHtml == "<p>8 to 6</p>"
        deleted.errors == ""
        gone == null
    },
})

feature("the Mail box of Preferences saves what the Inbox and Compose read", {
    when() {
        const shown = render("Commons/Settings/Preferences", {})
        const saved = post(commons, "Settings/Preferences/saveMailDefaults", { readingPane: "bottom", markReadSeconds: "5", undoSeconds: "20", remoteImages: "always" })
        const inbox = json("Inbox/Mail/inboxData", {}, null)
        const more = post(commons, "Settings/Preferences/saveMailDefaults", { conversationView: "messages", defaultAccountId: DEMO, signaturePlacement: "below",
            swipeLeft: "trash", swipeRight: "flag" })
        const inboxAfter = json("Inbox/Mail/inboxData", {}, null)
        const listed = json("Inbox/Mail/threads", { view: "inbox" }, null)
        const compose = json("Inbox/Compose/composeData", {}, null)
        // Preferences is server-static: the form's values are its data, mailDefaultsOut.mailDefaults
        const again = (JSON.parse(ec.screen.makeTest().rootScreen(webroot).render("apps/Commons/Settings/Preferences/actions", {}, null).output || "{}").mailDefaultsOut || {}).mailDefaults || {}
        const from = (compose.json.compose && compose.json.compose.identityList || []).find((item) => item.value == (compose.json.compose || {}).fromValue)
        return { shown, saved, prefs: inbox.json.prefs, more, after: inboxAfter.json.prefs, listed: listed.json,
            compose: compose.json, from, again }
    },
    then({ shown, saved, prefs, more, after, listed, compose, from, again }) {
        shown.errors == ""
        !shown.broken
        shown.output.includes("Reading pane")
        shown.output.includes("Undo send")
        shown.output.includes("Pictures in mail")
        shown.output.includes("Conversation view")
        shown.output.includes("Default account")
        shown.output.includes("Above the quote")
        shown.output.includes("Swipe left")
        saved.errors == ""
        prefs.readingPane == "bottom"
        prefs.markReadSeconds == 5
        prefs.undoSeconds == 20
        prefs.archiveOpensNext == false
        prefs.remoteImages == "always"
        prefs.conversationView == "threads"
        prefs.signaturePlacement == "above"
        prefs.swipeLeft == "archive"
        prefs.swipeRight == "read"
        more.errors == ""
        after.conversationView == "messages"
        after.defaultAccountId == DEMO
        after.signaturePlacement == "below"
        after.swipeLeft == "trash"
        after.swipeRight == "flag"
        after.readingPane == "bottom"
        listed.conversationView == "messages"
        compose.compose.signaturePlacement == "below"
        from.emailAccountId == DEMO
        again.readingPane == "bottom"
        again.conversationView == "messages"
        again.signaturePlacement == "below"
    },
})

feature("joe.developer changes none of john.doe's settings; he sees the shared text block and Support's identity without changing them", {
    when() {
        login("joe.developer")
        const identities = render("Comms/Settings/Identities", {})
        const changeSupport = settings("Identities/storeIdentity", { emailIdentityId: "BOSS_DEMO_MAIL_S_IDENT", emailAddress: "support@ziziwork.example", displayName: "Joe's support" })
        const ruleChange = rules("saveRule", { emailRuleId: "BOSS_DEMO_MAIL_R_RECEIPTS", ruleName: "Mine" })
        const blocks = render("Comms/Settings/TextBlocks", {})
        const shareAdmin = settings("TextBlocks/storeTextBlock", { title: "Mine", userGroupId: "ADMIN" })
        login("john.doe")
        return { identities, changeSupport, ruleChange, blocks, shareAdmin,
            receipts: one("moqui.basic.email.EmailRule", { emailRuleId: "BOSS_DEMO_MAIL_R_RECEIPTS" }), support: one("moqui.basic.email.EmailIdentity", { emailIdentityId: "BOSS_DEMO_MAIL_S_IDENT" }) }
    },
    then({ identities, changeSupport, ruleChange, blocks, shareAdmin, receipts, support }) {
        identities.errors == ""
        identities.output.includes("Ziziwork Support")
        identities.output.includes("managed by its owner")
        !identities.output.includes("john.doe@moqui.org")
        changeSupport.errors.includes("You may not change")
        ruleChange.errors.includes("You may not change")
        blocks.output.includes("Meeting follow-up")
        blocks.output.includes("From John Doe, shared with Office team")
        !blocks.output.includes("Directions to the office")
        shareAdmin.errors.includes("You are not in user group")
        receipts.ruleName == "Receipts"
        support.displayName == "Ziziwork Support"
    },
})
