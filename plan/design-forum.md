# Forum — summary plan

Oct 27, 2026 — summary before the design; no separate research file for this app.

A public-facing discussion forum in the style of Discourse, built on the same data as the
internal mailboxes of the Comms app, so that internal users read and answer forum topics from
their Inbox and outside users get a forum site. Targets: a community forum such as
forum.moqui.org, and business forums for customer, supplier, partner or member support.

Reference: Discourse, local clone at `~/work/moquiwork/3p_other/discourse` (pointers below).

## 1. What exists to build on

**Mailboxes are the forum data model, and they are implemented.** design-drawers-commons §12
("Mailboxes") and §19 decided that a mailbox is a shared list or forum: a Mantle `ContactList`
of type `MAILBOX`, members are `ContactListParty` rows with a role (`ListOwner`,
`ListModerator`, member) and a delivery (Inbox, or Mailbox only "as a forum does"), and posts
are `CommunicationEvent`s of type `Message` with `contactListId`, threaded by `rootCommEventId`
and `parentCommEventId`. In mr-mantle today:

- `entity/MarketingEntities.xml` — `ContactList.postingEnumId` (`ClpMembers`, `ClpModerators`,
  `ClpAnyUser`), the `MAILBOX` type, `defaultDeliveryEnumId`, `archivedDate`
- `service/mantle/marketing/ContactListServices.xml` — `get#ContactListAccess` (canReadAll,
  canReadOwn, canPost, canModerate), `create/update/find#ContactList(s)`, `join`/`leave`,
  `add`/`remove`/`decline#ContactListParty`, `set#ContactListPartyDelivery`, and the email
  sends `send#ContactListEmail` / `send#ContactListPartyEmail`
- `service/mantle/party/CommunicationServices.xml` — `create#Message` (posting policy, recipient
  rows), `get#InternalThread`, `set#InternalMessageState`, `close#ListThread` (first post to
  `CeResolved`), `find#InboxThreads`
- `service/mantle/search/UniversalSearchServices.xml` — mailbox posts in search, by access

**Comms in mr-boss** shows mailboxes inside the Internal account of `Comms/Inbox`
(`screen/Comms/Inbox/Mail.qvue`, `Compose`, `MessageDetail`; `service/ironstone/comms/InboxServices.xml`,
`ComposeServices.xml`, `CommsHomeServices.xml`): `MailboxHeader`, `BrowseMailboxes`,
`NewMailbox`, `MailboxSettings`, `MailboxMembers` (design-drawers-commons §12 table).

**Public pages in mr-boss** set the pattern for unauthenticated screens: `token-route`s in
`MoquiConf.xml` (`/s` PublicShare, `/u` Unsubscribe, `/cal` PublishedCalendar, `/r`
RequestIntake), screens with `require-authentication="false"` in the framework's public shell
(`base-component/webroot/screen/webroot/PublicShell.xml`), every call re-checking access in a
service. Consent and unsubscribe (§16) cover forum email notifications.

**Framework:** login, second factor, SSO (`webroot/sso.xml`), the tiptap editor, the sanitized
HTML view (`m-html-view`), the search index, notifications and the email relay. There is no
self-service sign-up today.

## 2. Component: separate, recommended

A new component (working name `mr-forum`) that depends on mr-mantle only, with no dependency in
either direction between it and mr-boss. A forum site is often run on its own (forum.moqui.org
needs no ERP), and the shared data in mr-mantle is what lets the two meet: a BOSS user sees
the same lists as mailboxes in Comms, a forum user sees them as categories.

What would be replicated or moved, and where:

| Piece | Today | For the forum |
| --- | --- | --- |
| Thread and access logic | mr-mantle | reused as is; forum-only additions go to mr-mantle too (below), not to mr-forum, so Comms can show them |
| Thread list / reading pane UI | `Comms/Inbox/Mail.qvue` (inbox-shaped, keyboard-first) | new screens; a topic list and a topic page are a different layout, so little is duplicated |
| Compose / editor | `Comms/Inbox/Compose` over framework tiptap | a forum composer over the same framework editor (markdown-ish, quotes, mentions, uploads) |
| Mailbox admin dialogs | Comms `NewMailbox`, `MailboxSettings`, `MailboxMembers` | forum admin screens for categories; the services are shared, the screens are small |
| Public shell, auth | framework | reused; sign-up added to the framework (§4) |
| Moderation queue | none | new: in mr-forum for forum staff, and a view of it in mr-boss Comms for internal moderators |

Putting it in mr-boss instead would save the admin screens but tie a community site to the
whole BOSS suite and its authz; the separate component costs a few small screens.

**Authz:** decided: an internal user is a member of at least one `UserGroup` besides the
automatic `ALL_USERS`; a public user is in `ALL_USERS` only. The forum app needs no special
authz and no `UserGroup` of its own: its screens and services are authorized for `ALL_USERS`
(post, react, flag, edit own), with anonymous read of public categories (read-only, rate
limited) beside that. Who moderates a category comes from the list roles (`ListOwner`,
`ListModerator`) and the access checks in `get#ContactListAccess`, not from a user group. A
public user with no other group never reaches BOSS screens, so the same server runs both apps.

## 3. Data mapping (Discourse → Mantle)

| Discourse | Mantle | Status |
| --- | --- | --- |
| Category (`app/models/category.rb`), subcategory | `ContactList` type `MAILBOX`; a parent list and a forum-site grouping are new | grouping and parent new |
| Category permissions, groups (`category_group.rb`, `group.rb`) | `isPublic`, `postingEnumId`, `ContactListParty` roles; party groups or org membership for customer/supplier forums | business-scoped access new |
| Topic | root `CommunicationEvent` (subject = title) | exists |
| Post, reply-to | `CommunicationEvent` with `parentCommEventId` | exists |
| Watching / tracking / muted (`category_user.rb`, topic_user) | `ContactListParty.deliveryEnumId` (Inbox, Mailbox only); per-topic watch level new | partial |
| Read state | per-message `CommunicationEventParty` rows for internal users; a per-topic last-read marker for public users | rows exist; marker new (§6) |
| Solved (`plugins/discourse-solved`) | `close#ListThread` / `CeResolved`; an accepted-answer post new | partial |
| Likes and reactions (`post_action.rb`, `plugins/discourse-reactions`) | new, shared with chat reactions if those exist | new |
| Tags (`tag.rb`) | new, or reuse a Mantle classification | new |
| Edit history (`post_revision.rb`) | new | new |
| Bookmarks (`bookmark.rb`) | Inbox flag state, or new | partial |
| Topic to support case | Customer Service request from a topic (design-customer-service intake) | new link |

## 4. Public sign-up

An option per forum site: closed (invite or admin-created only), invite links
(`app/models/invite.rb`, `invite_redeemer.rb`), open sign-up with email verification, and
optional approval of new accounts (Discourse `must_approve_users`). External login through the
framework's SSO. For business forums, sign-up can require a matching email domain or an
invitation tied to a customer or supplier organization, which sets the user's party
relationship and so the categories they see. Self-registration belongs in the framework (it
is useful beyond the forum); the forum supplies settings and the landing pages.

## 5. Safety and moderation (the Discourse model)

Manual:

- Flags on posts with reasons (`post_action_type.rb`, `reviewable_flagged_post.rb`), hidden
  automatically past a threshold
- One review queue for flagged posts, queued posts and new users (`app/models/reviewable*.rb`),
  with claim, notes and history; shown in mr-forum and in Comms for internal moderators
- Silence and suspend with reasons and an audit log (`user_history.rb`); staff notes on a user
  (`plugins/discourse-user-notes`)
- Moderator actions on topics: close, pin, move, split/merge, unlist, slow mode, timers
  (`topic_timer.rb`)

Automated:

- Trust levels earned from activity (`lib/trust_level.rb`, `lib/promotion.rb`,
  `trust_level3_requirements.rb`) that lift new-user limits: links, images, mentions, posts
  per day, flagging weight
- Rate limits (`lib/rate_limiter.rb`), and new-user first posts queued for approval
  (`lib/new_post_manager.rb`, `reviewable_queued_post.rb`)
- Watched words that block, censor, require approval or flag (`watched_word.rb`)
- Screened emails, IPs and URLs at sign-up and posting (`screened_*.rb`), spam handling
  (`lib/spam_handler.rb`)
- Automated classification of spam and toxicity into the review queue
  (`plugins/discourse-ai`), here through the Assist / LLM tooling

The moderation data (flags, review items, trust level, silence/suspend) goes in mr-mantle
beside the list model, so internal mailboxes get the same tools.

## 6. Read tracking (decided)

Two levels, chosen by the kind of user (§2 Authz), in every type of mailbox, internal or
public:

- **Internal users: per-message tracking.** Every internal member or participant keeps a
  `CommunicationEventParty` row per message, as mailboxes do today, so a CSR or anyone else
  internal can check on each message (who has read it, flags, state) in public forum categories
  as well as internal mailboxes.
- **Public users: per-thread last read.** A lighter, more forum-like marker, one row per user
  per topic holding the last message read (Discourse `topic_users.last_read_post_number`), from
  which unread and new counts are derived. No per-message rows are written for public users,
  so a public category with thousands of members stays cheap.

Posting writes per-message rows only for the internal recipients; a public user's mention or
reply notification goes through notifications and the marker, not a row.

## 7. Open questions for the design

- Anonymous read: whether it runs through the same `get#ContactListAccess` with no party, and
  caching or server-static rendering of public topic pages for search engines
- Email in and out (posting by email, mailing-list mode), which §12 left `later` and which
  reuses `ContactListCommStatus` and §16 unsubscribe
- One forum site per server, or several sites (and themes) on one server
- Render modes: vue/qvue for the public site; whether a tui forum client is worth it
- Name of the component and the forum-site grouping entity
