// Comms Moderation (screen/Comms/Moderation.xml with Queue and Review, service/ironstone/comms/ModerationServices.xml;
// mr-pass design-forum.md §13.4): an internal list moderator works the forum's review queue for a bound category and
// approves a held first post through the same Mantle decision the public forum uses; an internal user who moderates
// nothing sees a note and the forum refuses the decision; a public account that moderates a public site has no scopes
// here. Authorization stays on for the screens.
// Run: ./moq test mr-boss mr-mantle --spec CommsModeration
const webroot = 'component://webroot/screen/webroot.xml'
const S = 'mantle.public.SiteServices.',
    F = 'mantle.forum.ForumServices.',
    B = 'ironstone.comms.ModerationServices.'
const op = () => ec.user.randomString(32)
const party = {}
let siteId, categoryId, rootId, reviewId
function sys(work) {
    const old = ec.artifactExecution.disableAuthz()
    try {
        return work()
    } finally {
        if (!old) ec.artifactExecution.enableAuthz()
    }
}
function as(username, work) {
    if (username.startsWith('boss.mod.')) login(username, 'moqui1!!')
    else login(username)
    try {
        return work()
    } finally {
        login('john.doe')
    }
}
/* The Comms services as the signed-in user: the forum decides who may by that party, not by artifact authorization,
   which the screens below exercise. */
const boss = (verb, params) => sys(() => call(B + verb, params))
function errorOf(name, params) {
    try {
        sys(() => call(name, params))
    } catch (e) {
        ec.message.clearErrors()
        return String(e.message)
    }
    return null
}
function render(path, parameters) {
    const str = ec.screen
        .makeTest()
        .rootScreen(webroot)
        .renderMode('qvt')
        .withStaticData()
        .render(
            path,
            Object.assign({ lastStandalone: 'true' }, parameters || {}),
            null,
        )
    const output = String(str.output || '')
    ec.message.clearErrors()
    return {
        errors: str.errorMessages.join(' | '),
        output,
        broken: /Error rendering|Exception in render/.test(output),
    }
}
const run = (name, input) => call(name, { input }).result
const at = Date.now()
spec({
    stepwise: true,
    setupSpec() {
        login('john.doe')
    },
    cleanup() {
        login('john.doe')
    },
})
feature("a public member's first post in a bound category waits in the queue", {
    when() {
        party.owner = ec.user.userAccount.partyId
        siteId = run(S + 'create#Site', {
            name: 'Comms moderation',
            ownerPartyId: party.owner,
        }).siteId
        run(S + 'update#Site', {
            siteId,
            state: 'published',
            expectedRevision: 1,
        })
        categoryId = run(F + 'store#Category', {
            siteId,
            name: 'Help desk',
            operationId: op(),
        }).contactListId
        run(F + 'set#CategoryAccess', {
            siteId,
            contactListId: categoryId,
            visibility: 'public',
            publicationState: 'published',
            expectedRevision: 1,
            confirm: true,
        })
        sys(() => {
            for (const [name, group] of [
                ['ivy', 'BOSS_PROJECT_TEAM'],
                ['pat', null],
                ['max', null],
            ]) {
                party[name] = call('mantle.party.PartyServices.create#Person', {
                    firstName: name,
                    lastName: 'Moderation',
                }).partyId
                call('mantle.party.PartyServices.create#PartyUserAccount', {
                    partyId: party[name],
                    username: 'boss.mod.' + name,
                    emailAddress: name + '.mod@example.test',
                    newPassword: 'moqui1!!',
                    newPasswordVerify: 'moqui1!!',
                })
                const userId = ec.entity
                    .find('moqui.security.UserAccount')
                    .condition('username', 'boss.mod.' + name)
                    .one().userId
                if (group)
                    call('create#moqui.security.UserGroupMember', {
                        userGroupId: group,
                        userId,
                        fromDate: at - 1000,
                    })
                call('create#mantle.public.PublicSiteParty', {
                    siteId,
                    partyId: party[name],
                    state: 'active',
                    // Max moderates the public site, as a public account.
                    role: name === 'max' ? 'moderator' : 'member',
                    joinedAt: at,
                    revision: 1,
                })
                call('create#mantle.public.PublicSiteProfile', {
                    siteId,
                    partyId: party[name],
                    handle: name,
                    displayName: name,
                    discoverability: 'members',
                    revision: 1,
                })
            }
            // Ivy is an internal list moderator of the bound category; Pat is a plain public member.
            call('create#mantle.marketing.contact.ContactListParty', {
                contactListId: categoryId,
                partyId: party.ivy,
                roleTypeId: 'ListModerator',
                statusId: 'CLPT_ACCEPTED',
                fromDate: at - 1000,
            })
            call('create#mantle.marketing.contact.ContactListParty', {
                contactListId: categoryId,
                partyId: party.pat,
                statusId: 'CLPT_ACCEPTED',
                fromDate: at - 1000,
            })
        })
        const posted = as('boss.mod.pat', () =>
            run(F + 'publish#Post', {
                siteId,
                contactListId: categoryId,
                title: 'First question here',
                body: '<p>How do I reset it?</p>',
                operationId: op(),
            }),
        )
        rootId = posted.rootCommEventId
        return { posted }
    },
    then({ posted }) {
        posted.state === 'pending'
    },
})
feature(
    'an internal list moderator sees the item in Comms and approves it through the forum',
    {
        when() {
            const scopes = as('boss.mod.ivy', () => boss('find#Scopes'))
            const scope = scopes.scopeList[0]?.key
            const queue = as(
                'boss.mod.ivy',
                () => boss('find#Reviews', { scope }).reviewList,
            )
            reviewId = queue.find((r) => r.targetId === rootId)?.reviewId
            const page = as('boss.mod.ivy', () =>
                render('apps/Comms/Moderation/Queue', { scope }),
            )
            const detail = as('boss.mod.ivy', () =>
                render('apps/Comms/Moderation/Review', {
                    siteId,
                    reviewId,
                    scope,
                }),
            )
            const review = as('boss.mod.ivy', () =>
                boss('get#Review', { siteId, reviewId }),
            )
            as('boss.mod.ivy', () =>
                boss('decide#Review', {
                    siteId,
                    reviewId,
                    expectedRevision: Number(review.review.revision),
                    decision: 'approved',
                    reason: 'Fine first post',
                }),
            )
            const state = sys(
                () =>
                    ec.entity
                        .find('mantle.forum.ForumPostState')
                        .condition('communicationEventId', rootId)
                        .one().visibility,
            )
            const audit = sys(() =>
                Array.from(
                    ec.entity
                        .find('mantle.forum.ForumModerationAction')
                        .condition({ siteId, staffPartyId: party.ivy })
                        .list(),
                ),
            )
            return { scopes, scope, queue, page, detail, review, state, audit }
        },
        then({ scopes, scope, queue, page, detail, review, state, audit }) {
            scopes.internal
            scope === siteId + '|' + categoryId
            queue.some(
                (r) =>
                    r.targetId === rootId && r.title === 'First question here',
            )
            !page.broken && page.output.includes('First question here')
            !detail.broken && detail.output.includes('How do I reset it?')
            review.post.title === 'First question here'
            state === 'approved'
            audit.length > 0
        },
    },
)
feature(
    'an internal user who moderates nothing, and a public moderator, have no Comms moderation',
    {
        when() {
            const joe = as('joe.developer', () => boss('find#Scopes'))
            const joePage = as('joe.developer', () =>
                render('apps/Comms/Moderation/Queue', {}),
            )
            const joeDecides = as('joe.developer', () =>
                errorOf(B + 'decide#Review', {
                    siteId,
                    reviewId,
                    expectedRevision: 1,
                    decision: 'rejected',
                    reason: 'No',
                }),
            )
            const max = as('boss.mod.max', () => boss('find#Scopes'))
            return { joe, joePage, joeDecides, max }
        },
        then({ joe, joePage, joeDecides, max }) {
            joe.internal && joe.scopeList.length === 0
            joePage.output.includes('You moderate no forum site or category')
            joeDecides != null
            !max.internal && max.scopeList.length === 0
        },
    },
)
