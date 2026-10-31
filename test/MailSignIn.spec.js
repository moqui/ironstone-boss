// Sign-in with Google or Microsoft for a mail account (screen/Comms/Settings/MailAccounts/SignIn.xml and SignIn.qvue, the
// wizard's Connect step and the account page; service/ironstone/comms/MailSettingsServices.xml get#OAuthChoice, start#MailSignIn,
// mr-moqui docs/interfaces/Mail-OAuth.md), with no network. Not set up (the seeded Google and Microsoft have no
// client here): Connect offers no button and says an administrator can set the sign-in up, the password path is as before,
// and a sign-in is refused. Set up (a provider of this spec's own, with its client on the EmailOAuthProvider row and a
// reserved domain): Connect shows the button; startSignIn answers the provider's address with PKCE, state and nonce and makes
// no account (the framework makes it, paused with the year's sync window, when the sign-in succeeds); an account made to sign
// in later (save#AccountConnection) is paused with the year's window as with a password; signInStatus answers only this
// user's sign-in; a code the provider's token endpoint does not take (nothing listens there) ends the sign-in with an error
// the status tells, and makes no account. The
// account page: a new sign-in for an account that needs one, Signs in with and Sign out for one signed in (its token is never
// in a page), sign in instead of a password, and a password that switches the account back. POP: the framework's sign-in
// (start#OAuthSignIn storeProtocol pop3) asks for the POP scope and makes the account on the provider's POP server only when it
// succeeds; a provider with no POP server here is not offered POP. Another user reaches none of it.
// Run: ./moq test mr-boss --spec MailSignIn
const webroot = "component://webroot/screen/webroot.xml"
const comms = "component://mr-boss/screen/Comms.xml"
const SETTINGS = "org.moqui.comms.MailSettingsServices"
const BASE = "Settings/MailAccounts"
const PROVIDER = "EopBossSpec"
const DOMAIN = "boss-oauth.example"
const CLIENT = "boss-spec-client"
const SECRET = "boss-spec-secret"
const TOKEN = "boss-spec-refresh-token"
const made = {}

function render(path, parameters) {
    const str = ec.screen.makeTest().rootScreen(webroot).renderMode("qvt").withStaticData().render(`apps/Comms/${BASE}/${path}`, Object.assign({ lastStandalone: "true" }, parameters || {}), null)
    const output = String(str.output || "")
    ec.message.clearErrors()
    return { status: str.status, errors: str.errorMessages.join(" | "), output, broken: /Error rendering|Exception in render/.test(output) }
}
function transition(path, parameters, method) {
    const str = ec.screen.makeTest().rootScreen(comms).render(`${BASE}/${path}`, parameters || {}, method || null)
    const output = String(str.output || "")
    let json = null
    try { json = JSON.parse(output) } catch (err) { json = null }
    ec.message.clearErrors()
    return { status: str.status, errors: (json && json.errors) || str.errorMessages.join(" | "), json: json || {}, output }
}
const post = (path, parameters) => transition(path, parameters, "post")
const get = (path, parameters) => transition(path, parameters, null)
function sys(run) {
    const wasDisabled = ec.artifactExecution.disableAuthz()
    try { return run() } finally { if (!wasDisabled) ec.artifactExecution.enableAuthz() }
}
const accountOf = (address) => sys(() => {
    const rows = Array.from(ec.entity.find("moqui.basic.email.EmailAccount").condition("ownerUserId", "EX_JOHN_DOE").condition("emailAddress", address)
        .orderBy("-emailAccountId").list())
    return rows.length ? rows[0] : null
})
// a row made or changed with these fields (the others kept)
function store(entityName, fields) {
    const row = ec.entity.makeValue(entityName)
    row.setFields(fields, true, null, null)
    row.createOrUpdate()
}
const accountById = (id) => sys(() => ec.entity.find("moqui.basic.email.EmailAccount").condition("emailAccountId", id).one())
const serverOf = (account) => sys(() => ec.entity.find("moqui.basic.email.EmailServer").condition("emailServerId", account.emailServerId).one())
const queryOf = (url) => {
    const out = {}
    for (const pair of String(url || "").split("?")[1].split("&")) {
        const at = pair.indexOf("=")
        out[decodeURIComponent(pair.substring(0, at))] = decodeURIComponent(pair.substring(at + 1).replace(/\+/g, " "))
    }
    return out
}
const gmail = { emailAddress: "jane.roe@gmail.com", displayName: "Jane Roe", accountKindEnumId: "EakExternal", storeKind: "imap", storeSecurity: "ssl",
    storeHost: "imap.gmail.com", storePort: "993", smtpHost: "smtp.gmail.com", smtpPort: "465", smtpSecurity: "ssl", mailUsername: "jane.roe@gmail.com", source: "provider" }
const local = { storeKind: "imap", storeSecurity: "ssl", storeHost: "127.0.0.1", storePort: "1", smtpHost: "127.0.0.1", smtpPort: "1", smtpSecurity: "none" }

spec({
    requires: ["imap"],
    stepwise: true,
    setupSpec() { login("john.doe") },
    cleanupSpec() {
        login("john.doe")
        sys(() => {
            const ours = Array.from(ec.entity.find("moqui.basic.email.EmailAccount").condition("ownerUserId", "EX_JOHN_DOE").list())
                    .filter((account) => String(account.emailAddress || "").endsWith(`@${DOMAIN}`))
            for (const account of ours) {
                call("org.moqui.impl.EmailClientServices.delete#EmailAccount", { emailAccountId: account.emailAccountId, deleteLocalCopies: true })
                ec.message.clearErrors()
            }
            ec.entity.find("moqui.basic.email.EmailOAuthProvider").condition("oauthProviderEnumId", PROVIDER).deleteAll()
            ec.entity.find("moqui.basic.Enumeration").condition("enumId", PROVIDER).deleteAll()
        })
    },
})

feature("not set up: Gmail's Connect has no sign-in button and says an administrator can set it up; a sign-in is refused and makes nothing", {
    when() {
        const choice = sys(() => call(`${SETTINGS}.get#OAuthChoice`, { emailAddress: "jane.roe@gmail.com" })).choice
        const connect = render("Add/Connect", gmail)
        const start = post("SignIn/startSignIn", { mode: "wizard", emailAddress: "jane.roe@gmail.com", displayName: "Jane Roe", accountKindEnumId: "EakExternal" })
        return { choice, connect, start, account: accountOf("jane.roe@gmail.com") }
    },
    then({ choice, connect, start, account }) {
        choice.oauthProviderEnumId == "EopGoogle"
        choice.providerLabel == "Google"
        !choice.configured
        connect.errors == ""
        !connect.broken
        !connect.output.includes('id="MailSignIn"')
        connect.output.includes("Sign-in with Google, which needs no app password, is not set up on this server: an administrator can set it up")
        // the password path as before
        connect.output.includes("Make a Google app password")
        connect.output.includes("App password")
        start.errors.includes("Sign-in with Google is not set up on this server")
        account == null
    },
})

feature("set up: Connect shows the button; startSignIn answers the provider's address with PKCE, state and nonce and makes no account until the sign-in succeeds", {
    when() {
        sys(() => {
            store("moqui.basic.Enumeration", { enumId: PROVIDER, enumTypeId: "EmailOAuthProvider", description: "Spec Mail" })
            store("moqui.basic.email.EmailOAuthProvider", { oauthProviderEnumId: PROVIDER, clientId: CLIENT, clientSecret: SECRET,
                authorizeUrl: `https://login.${DOMAIN}/authorize`, tokenUrl: "http://127.0.0.1:1/token", scope: `openid email https://mail.${DOMAIN}/`,
                mailScope: `https://mail.${DOMAIN}/`, issuer: `https://login.${DOMAIN}`, addressClaims: "email", addressDomains: DOMAIN,
                storeHost: "127.0.0.1", storePort: "1", storeProtocol: "imap", smtpHost: "127.0.0.1", smtpPort: "1", smtpSsl: "N", smtpStartTls: "N" })
        })
        const choice = sys(() => call(`${SETTINGS}.get#OAuthChoice`, { emailAddress: `pat@${DOMAIN}` })).choice
        // a reserved domain: the guesses, no lookup
        const connect = render("Add/Connect", { emailAddress: `pat@${DOMAIN}`, displayName: "Pat Doe", accountKindEnumId: "EakExternal", storeKind: "imap", storeSecurity: "ssl",
            storeHost: `imap.${DOMAIN}`, storePort: "993", smtpHost: `smtp.${DOMAIN}`, smtpPort: "587", smtpSecurity: "starttls", mailUsername: `pat@${DOMAIN}`, source: "guess" })
        const component = sys(() => {
            const str = ec.screen.makeTest().rootScreen(comms).renderMode("qvue").render(`${BASE}/SignIn`, { lastStandalone: "-2" }, null)
            ec.message.clearErrors()
            return { status: str.status, output: String(str.output || "") }
        })
        const started = post("SignIn/startSignIn", { mode: "wizard", emailAddress: `pat@${DOMAIN}`, displayName: "Pat Doe", accountKindEnumId: "EakExternal",
            oauthProviderEnumId: PROVIDER })
        made.signInId = started.json.signInId
        const notYet = accountOf(`pat@${DOMAIN}`)
        const pending = get("SignIn/signInStatus", { signInId: made.signInId })
        // an account made to sign in with the provider later (as the wizard's POP account, or one whose sign-in is to come)
        made.accountId = sys(() => call(`${SETTINGS}.save#AccountConnection`, { emailAddress: `pat@${DOMAIN}`, displayName: "Pat Doe", accountKindEnumId: "EakExternal",
            authTypeEnumId: "EatOAuth2", oauthProviderEnumId: PROVIDER })).emailAccountId
        const account = made.accountId ? accountById(made.accountId) : null
        const server = account ? serverOf(account) : null
        const identity = made.accountId ? sys(() => ec.entity.find("moqui.basic.email.EmailIdentity").condition("emailAccountId", made.accountId).one()) : null
        return { choice, connect, component, started, query: started.json.authUrl ? queryOf(started.json.authUrl) : {}, notYet, account, server, identity, pending }
    },
    then({ choice, connect, component, started, query, notYet, account, server, identity, pending }) {
        choice.oauthProviderEnumId == "EopBossSpec"
        choice.providerLabel == "Spec Mail"
        choice.configured
        connect.errors == ""
        !connect.broken
        connect.output.includes('id="MailSignIn"')
        connect.output.includes("/Comms/Settings/MailAccounts/SignIn")
        connect.output.includes("mode=wizard")
        connect.output.includes("Sign in with your Spec Mail account in the window that opens")
        connect.output.includes("Or use a password or an app password instead")
        component.status == 200
        component.output.includes("module.exports")
        component.output.includes("BossMailSignIn")
        component.output.includes("moqui.oauthPopup")
        started.errors == ""
        started.json.authUrl.startsWith("https://login.boss-oauth.example/authorize?")
        query.response_type == "code"
        query.client_id == "boss-spec-client"
        query.redirect_uri.endsWith("/emailOAuth/callback")
        query.code_challenge_method == "S256"
        query.code_challenge.length == 43
        query.state.length > 20
        query.nonce.length > 20
        query.login_hint == "pat@boss-oauth.example"
        query.scope == "openid email https://mail.boss-oauth.example/"
        started.json.signInId.length > 10
        !started.json.created
        started.json.emailAccountId == null
        !started.output.includes("boss-spec-secret")
        // no account before the sign-in succeeds
        notYet == null
        // one made to sign in later, as with a password: paused until Finish, the year's sync window, the name given
        account.statusId == "EasPaused"
        account.syncWindowDays == 365
        account.accountKindEnumId == "EakExternal"
        account.accountName == "pat@boss-oauth.example"
        identity.displayName == "Pat Doe"
        server.authTypeEnumId == "EatOAuth2"
        server.oauthProviderEnumId == "EopBossSpec"
        server.mailPassword == null
        server.oauthRefreshToken == null
        server.storeHost == "127.0.0.1"
        pending.errors == ""
        pending.json.status == "pending"
        pending.json.expectedAddress == "pat@boss-oauth.example"
    },
})

feature("the status is this user's only; another user starts or reads nothing of john.doe's", {
    when() {
        login("joe.developer")
        try {
            const status = get("SignIn/signInStatus", { signInId: made.signInId })
            const start = post("SignIn/startSignIn", { mode: "account", emailAccountId: made.accountId })
            return { status, start }
        } finally { login("john.doe") }
    },
    then({ status, start }) {
        status.json.status == "error"
        status.json.errorCode == "unknown"
        status.json.emailAccountId == null
        start.errors.includes("not found")
        accountById(made.accountId) != null
    },
})

feature("a code the provider does not take ends the sign-in with an error, which the status tells, and stores no token", {
    when() {
        const state = queryOf(post("SignIn/startSignIn", { mode: "account", emailAccountId: made.accountId }).json.authUrl || "x?state=").state
        // the popup's callback: the token endpoint is not there
        const completed = sys(() => call("org.moqui.impl.EmailClientServices.complete#OAuthSignIn", { state: state, code: "spec-code" }))
        ec.message.clearErrors()
        const signInId = completed.signInId
        const status = signInId ? get("SignIn/signInStatus", { signInId }) : { json: {} }
        const replay = sys(() => call("org.moqui.impl.EmailClientServices.complete#OAuthSignIn", { state: state, code: "spec-code" }))
        ec.message.clearErrors()
        const server = serverOf(accountById(made.accountId))
        // a new account's sign-in whose code is not taken makes no account
        const fresh = queryOf(post("SignIn/startSignIn", { mode: "wizard", emailAddress: `ned@${DOMAIN}`, displayName: "Ned Doe", accountKindEnumId: "EakExternal",
            oauthProviderEnumId: PROVIDER }).json.authUrl || "x?state=").state
        const freshDone = sys(() => call("org.moqui.impl.EmailClientServices.complete#OAuthSignIn", { state: fresh, code: "spec-code" }))
        ec.message.clearErrors()
        return { completed, status, replay, server, freshDone, ned: accountOf(`ned@${DOMAIN}`) }
    },
    then({ completed, status, replay, server, freshDone, ned }) {
        freshDone.status == "error"
        ned == null
        completed.status == "error"
        completed.errorCode != "invalidState"
        status.json.status == "error"
        status.json.errorCode == completed.errorCode
        replay.errorCode == "invalidState"
        server.oauthRefreshToken == null
    },
})

feature("the account page: a new sign-in for an account that needs one; signed in it says so, with Sign out, and never shows the token", {
    when() {
        // an account whose sign-in is still to come
        made.samId = sys(() => call(`${SETTINGS}.save#AccountConnection`, { emailAddress: `sam@${DOMAIN}`, displayName: "Sam Doe", accountKindEnumId: "EakExternal",
            authTypeEnumId: "EatOAuth2", oauthProviderEnumId: PROVIDER })).emailAccountId
        const needs = render("Account", { emailAccountId: made.samId })
        // as complete#OAuthSignIn leaves it: the token stored, the account in use
        sys(() => {
            const account = accountById(made.samId)
            store("moqui.basic.email.EmailServer", { emailServerId: account.emailServerId, oauthRefreshToken: TOKEN, oauthSignInDate: new Date(), mailUsername: `sam@${DOMAIN}` })
            store("moqui.basic.email.EmailAccount", { emailAccountId: made.samId, statusId: "EasActive", lastSyncDate: new Date() })
        })
        const signedIn = render("Account", { emailAccountId: made.samId })
        const signedOut = post("Account/signOut", { emailAccountId: made.samId })
        const after = accountById(made.samId)
        const server = serverOf(after)
        const fix = render("Account", { emailAccountId: made.samId, fix: "Y" })
        const list = render("List", {})
        return { needs, signedIn, signedOut, after, server, fix, list }
    },
    then({ needs, signedIn, signedOut, after, server, fix, list }) {
        needs.errors == ""
        !needs.broken
        needs.output.includes("This account signs in with Spec Mail and is not signed in yet")
        needs.output.includes('id="AccountSignIn"')
        needs.output.includes("mode=account")
        signedIn.errors == ""
        signedIn.output.includes("Signs in with Spec Mail as sam@boss-oauth.example since")
        signedIn.output.includes("Sign out")
        !signedIn.output.includes('id="AccountSignIn"')
        !signedIn.output.includes("boss-spec-refresh-token")
        signedOut.errors == ""
        after.statusId == "EasAuthFailed"
        server.oauthRefreshToken == null
        server.authTypeEnumId == "EatOAuth2"
        fix.output.includes('id="AccountSignIn"')
        fix.output.includes("The sign-in with Spec Mail ended")
        list.output.includes("Sign-in failed")
        list.output.includes("The sign-in with the provider ended")
    },
})

feature("a password account at the provider may sign in instead; a password saved for a provider's account makes it sign in with the password", {
    when() {
        const saved = post("Add/Connect/saveConnection", Object.assign({ emailAddress: `lee@${DOMAIN}`, displayName: "Lee Doe", accountKindEnumId: "EakExternal",
            mailUsername: `lee@${DOMAIN}`, mailPassword: "lee-app-pass" }, local))
        const lee = accountOf(`lee@${DOMAIN}`)
        sys(() => store("moqui.basic.email.EmailAccount", { emailAccountId: lee.emailAccountId, statusId: "EasActive", lastSyncDate: new Date() }))
        const offer = render("Account", { emailAccountId: lee.emailAccountId })
        const password = post("Account/savePassword", { emailAccountId: made.samId, emailAddress: `sam@${DOMAIN}`, mailPassword: "sam-app-pass" })
        const sam = serverOf(accountById(made.samId))
        return { saved, offer, password, sam, lee: serverOf(lee) }
    },
    then({ saved, offer, password, sam, lee }) {
        saved.errors == ""
        lee.authTypeEnumId == "EatPassword"
        offer.errors == ""
        offer.output.includes('id="AccountSignInOffer"')
        offer.output.includes("Sign in with Spec Mail instead of a password")
        password.errors == ""
        sam.authTypeEnumId == "EatPassword"
        sam.mailPassword == "sam-app-pass"
    },
})

feature("POP with the provider's sign-in: offered only where the provider has a POP server; the framework's sign-in asks for the POP scope and makes the account only when it succeeds", {
    when() {
        const connectParams = { emailAddress: `pop@${DOMAIN}`, displayName: "Pop Doe", accountKindEnumId: "EakExternal", storeKind: "pop", storeSecurity: "ssl",
            storeHost: `pop.${DOMAIN}`, storePort: "995", smtpHost: `smtp.${DOMAIN}`, smtpPort: "587", smtpSecurity: "starttls", mailUsername: `pop@${DOMAIN}`, source: "guess" }
        const popStart = () => post("SignIn/startSignIn", { mode: "wizard", emailAddress: `pop@${DOMAIN}`, displayName: "Pop Doe", accountKindEnumId: "EakExternal",
            oauthProviderEnumId: PROVIDER, storeKind: "pop" })
        // no POP server: not offered, and a POP sign-in is refused
        const noPopConnect = render("Add/Connect", connectParams)
        const noPop = popStart()
        sys(() => store("moqui.basic.email.EmailOAuthProvider", { oauthProviderEnumId: PROVIDER, popScope: `https://mail.${DOMAIN}/pop`,
            popHost: "127.0.0.1", popPort: "2", popProtocol: "pop3" }))
        const connect = render("Add/Connect", connectParams)
        const started = popStart()
        const query = started.json.authUrl ? queryOf(started.json.authUrl) : {}
        const notYet = accountOf(`pop@${DOMAIN}`)
        // the provider does not take the code: no account
        const failed = sys(() => call("org.moqui.impl.EmailClientServices.complete#OAuthSignIn", { state: query.state, code: "spec-code" }))
        ec.message.clearErrors()
        // an account to sign in later, on the provider's POP server (its row's popHost), and moved to IMAP when the wizard's choice changes
        const popId = sys(() => call(`${SETTINGS}.save#AccountConnection`, { emailAddress: `pop2@${DOMAIN}`, displayName: "Pop Two", accountKindEnumId: "EakExternal",
            authTypeEnumId: "EatOAuth2", oauthProviderEnumId: PROVIDER, storeKind: "pop" })).emailAccountId
        const server = popId ? serverOf(accountById(popId)) : null
        const again = post("SignIn/startSignIn", { mode: "wizard", emailAccountId: popId, emailAddress: `pop2@${DOMAIN}`,
            accountKindEnumId: "EakExternal", oauthProviderEnumId: PROVIDER, storeKind: "imap" })
        const imap = popId ? serverOf(accountById(popId)) : null
        const component = sys(() => {
            const str = ec.screen.makeTest().rootScreen(comms).renderMode("qvue").render(`${BASE}/SignIn`, { lastStandalone: "-2" }, null)
            ec.message.clearErrors()
            return String(str.output || "")
        })
        return { noPopConnect, noPop, connect, started, query, notYet, failed, after: accountOf(`pop@${DOMAIN}`), server, again, imap, component }
    },
    then({ noPopConnect, noPop, connect, started, query, notYet, failed, after, server, again, imap, component }) {
        noPopConnect.errors == ""
        noPopConnect.output.includes("offerPop=N")
        noPop.errors.includes("has no POP server set up here")
        connect.errors == ""
        connect.output.includes("offerPop=Y")
        connect.output.includes("storeKind=pop")
        component.includes("POP (downloads the Inbox only)")
        !component.includes("dropSignIn")
        started.errors == ""
        started.json.emailAccountId == null
        query.scope.includes("https://mail.boss-oauth.example/pop")
        notYet == null
        failed.status == "error"
        after == null
        server.storeHost == "127.0.0.1"
        server.storePort == "2"
        server.storeProtocol == "pop3"
        server.authTypeEnumId == "EatOAuth2"
        again.errors == ""
        imap.storeProtocol == "imap"
        imap.storePort == "1"
    },
})
