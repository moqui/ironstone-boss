# IronStone BOSS — Header, drawers, Commons & Comms implementation

Oct 18, 2026 — plan; Step 0 done (the review corrections are in design-drawers-commons.md); Oct 19 — M0–M11 built,
save point (what is left in §8)

How [design-drawers-commons.md](design-drawers-commons.md) gets built: the review of that design against mr-moqui and
Mantle as they stand (findings R1–R27, each with the resolution now written into the design), the rules every step
follows, and the milestones from the shell foundation to Consent, each ending tested and usable. Today the component has
placeholder screens for all of it (commit c494089). The framework's `m-qapps-root` (`WebrootVue.qvt.js:2458`) has only a
header, a left drawer and a footer. None of the proposed XML elements are in the XSDs. Material Symbols is not
vendored, and no rich-text library or Assist code exists. Mantle has most of the records, but several of its services
do not do what the design assumed (§3).

**Inputs.** [design-drawers-commons.md](design-drawers-commons.md), [design-doc-guide.md](design-doc-guide.md),
[style-guide.md](style-guide.md) §8 and §10, [ss-inventory.md](ss-inventory.md), [usl-inventory.md](usl-inventory.md);
mr-moqui `plans/Remaining-Work.md`, `docs/Revision-Management.md`, `docs/Native-Components.md` and `docs/Testing.md`;
the code as of Oct 18, 2026. Code paths are under `mr-moqui-base/` unless they name a component.

Sections: [1 scope](#1-scope-and-order) · [2 step 0](#2-step-0) · [3 review](#3-review-findings-and-resolutions) ·
[4 rules](#4-ground-rules) · [5 milestones](#5-milestones) · [6 later](#6-later) · [7 verification](#7-verification)

---

## 1. Scope and order

- **Repositories.** Each of these is its own git repo: `mr-moqui-base` (`crates/`, `runtime/base-component`),
  `runtime/component/mr-mantle`, `runtime/component/mr-mantle` and `runtime/component/mr-boss`.
- **Scope.** Every `parity` and `new` row of design §3. The `later` rows are in §6.
- **Order** (decided Oct 18): the shell foundation (M0–M3), then Contacts, Mail, Tasks and Requests, Calendar, Files,
  Knowledge and Notes, Chat, Consent. Contacts come before mail so recipients, contact cards and "Add to contacts" have
  their data. Mail comes early because Comms should be usable as someone's own mail client as soon as possible.

## 2. Step 0

Done Oct 18, 2026, before any code:

1. This file.
2. The corrections R1–R27 written into `design-drawers-commons.md`, in the sections each one names, with the new
   decisions in its §20 and the OAuth note in its §21.
3. mr-moqui `plans/Remaining-Work.md`: the IronStone row points here.

## 3. Review findings and resolutions

Each finding was verified in the code. Each resolution is now part of the design. R28 was found during the build.

| # | Finding | Resolution |
| --- | --- | --- |
| R1 | Design §1.3: Assist depends on mr-moqui Phase 13, which is deferred. No Assist or LLM client code exists. | The shell reserves the right `q-drawer` slot, with no toggle until the port. It builds `screenContext` and `assistReach` now, as the port's inputs. BOSS skills and agent chat members wait for Phase 13. |
| R2 | §19 Shell providers: menu data is built per path (`crates/moqui-core/src/screen/menu.rs:81`). Aggregating every app root's providers there would happen on every navigation. | A new webroot transition `shellData`, fetched once per page load. It returns the launcher apps, each permitted app root's `<shell-providers>`, its menu titles to depth 2 (for the palette's Screens group), the shell theme values and the first counts. A root that fails is logged and left out. |
| R3 | §1.5 palette: the People, Messages and rooms, Pages and files, Events, Records and id-lookup groups have no provider element, and the framework cannot call Mantle. | `<palette-source group service prefix id-pattern sequence>`. Each source service takes `{text, limit, docTypes}` and returns `[{title, subtitle, icon, url}]`. Commons registers Records (`search#Universal` over the `<palette-type>` document types of the permitted apps), People, Pages and files, Events, and the id lookup (`lookup#ById`). Comms registers Messages and rooms. A failing source drops its group and is logged. |
| R4 | §1.5 Records, §5 Search: `search#Universal` drops CommunicationEvent and the Project, Task, Event and Request documents whenever an org filter is on (`mr-mantle/service/mantle/search/UniversalSearchServices.xml:65-68`). Every BOSS authz carries MANTLE_ACTIVE_ORG. | Mantle replaces the exclusion with per-user conditions. A task, event or request shows when the user is one of its parties or its organization is in `filterOrgIds`. A communication event shows when the user is its from, to or recipient party. |
| R5 | §9, §15, §19 `chatter` and `record-files`: the client fetches the theme-named screen as its own request, so the host screen's authz is not part of it, and nothing mounts `Shared/`. | Each BOSS app root mounts `Shared/Chatter.xml` and `Shared/RecordFiles.xml` as hidden subscreens `Chatter` and `RecordFiles` (design-doc-guide §10). The theme values hold that subscreen name. The elements load `<app root>/<name>?recordEntity=&recordId=`, so the app's authz and entity filters apply. Both screens first find the record under the user's filters. If it is not visible they render nothing (logged once) and refuse writes. |
| R6 | §12 Compose "File on", §15 SendMessage: the framework's `send#Draft` cannot write a Mantle record join. | A Mantle wrapper, `mantle.party.CommunicationServices.send#EmailDraft`. It calls `EmailClientServices.send#Draft`, then creates the `CommunicationEvent` with `emailMessageId` and writes the record join. Compose and Chatter call it when a record chip is set. |
| R7 | §6, §19 personal contacts: entity filters are not global. They come only from the ArtifactAuthz that authorized the artifact (`crates/moqui-core/src/user/filter.rs:33,137`) and are skipped with authz disabled. `search#Party` reads the index. | The `privateOwnerUserId` condition becomes a second EntityFilter in the existing MANTLE_USER_ORG and MANTLE_ACTIVE_ORG filter sets, so it applies wherever the org filter does. The same condition is added explicitly to `find#Party`, `search#Party` (as an index field and a query term), `lookup#ById`, DuplicateServices and the party drop-down transitions. Check whether `filter.rs` turns a null in an IN list into `IS NULL`; if not, write an or-condition. A spec proves another user never sees a personal contact through any of these paths. |
| R8 | §12 replies: `reply#CommunicationEvent` always creates a `Comment` and answers only the parent's other party (`mr-mantle/service/mantle/party/CommunicationServices.xml:69`). | It is extended to keep the parent's type (a `Message` stays a `Message`), `contactListId` and the thread's participants. `replyToSenderOnly` gives Reply to sender. |
| R9 | §7 LinkedRecords, §12 LinkToRecord, §19 Record cards: `lookup#ById` returns no request and no communication event. | It is extended with Request and CommunicationEvent. |
| R10 | §6 Duplicates and "Link to a directory party": `merge#Parties` does not move WorkEffortParty, RequestParty, CommunicationEventParty or ContactListParty. | It is extended with those and with the new party rows: ContactBookParty, ContactBookGroupParty, PartyConsent, and party shares. |
| R11 | §7: Event `get#FullCalendarData` reads `WorkEffort.facilityId` rather than `WorkEffortFacility`, shows declined invitations and ignores `recurLimit`. The `WorkEffortPartyAsset` view aliases asset status and dates to the party member (`mr-mantle/entity/WorkEffortViewEntities.xml:259-261`). | The view is fixed. The service gains the rooms from WorkEffortFacility, skips WeptDeclined unless "show declined" is on, and adds RRULE expansion and `calendarIdList`. |
| R12 | §1.2: `get#UserNoticeCounts` counts declined events and completed tasks, and reads messages by `toPartyId` only. | `get#ShellCounts` is written fresh over the new state: WorkEffortParty status and snooze, `CommunicationEventParty.readDate`, `EmailMessage.isRead`, `ChatRoomMember.lastReadEventId` and `NotificationMessageUser.viewedDate`. The old service stays until MyAccountNav retires. |
| R13 | §19 `shellCounts`: "the services that change those counts publish" has no owner, and theme values are resolved per render. | A framework service, `org.moqui.impl.ShellServices.publish#ShellCounts(userIdList)`. It resolves `STRT_SHELL_COUNTS_SERVICE` from the user's qapps theme, as `qapps.xml` does, falling back to DEFAULT_QUASAR. It sends a non-persisted NotificationMessage on topic `shellCounts`, coalesced per user (one per ~2 s). Framework and Mantle EECAs and SECAs call it. |
| R14 | §1.2: theme values are per theme. | BOSS seeds them on DEFAULT_QUASAR and on any other Quasar theme it ships. With any other theme the tray, badges and Chatter are absent, as in a deployment without BOSS. |
| R15 | §12, §19 Internal message state: the `CommunicationEventParty` key includes `roleTypeId`, so one user who is a recipient, a mailbox member and a mention could get several rows whose state diverges. | `create#Message` writes one row per party, choosing the role by priority (to, then cc, then mailbox delivery). `set#InternalMessageState` updates every row the party has on the message. |
| R16 | §9 PublicShare, §14 guest join, §16 Unsubscribe: `/s/`, `/call/` and `/u/` render outside `/qapps`, and today a `.qvue` or qvt screen runs only inside `m-qapps-root`. | A framework public shell: a Vue and Quasar page with the theme and the `m-*` components, without header, drawers or a session. It serves the anonymous token routes, and a named service checks the token before any data is read. |
| R17 | §9 Files lists the WebDAV server under Needs, while Sync and the DAV servers are `later`. | Files ships without WebDAV. The WebDAV server moves to the later Sync work, and the Files Needs line says so. |
| R18 | §1.6: screens are server-static, so `<context record-id="${orderId}">` cannot be expanded in the server render. | The element compiles to a client binding over the screen's actions data (the ScreenQvtStatic mirror). The root collects the active screen's context on each data load. |
| R19 | §21 OAuth: a deployment needs its own Google OAuth client. Google's documentation says an external app left in "Testing" gets refresh tokens that expire after 7 days. Gmail's IMAP scope is restricted, so publishing the app needs verification. Check both when M5e starts. | M5 ships password authentication first, including Gmail app passwords with 2-Step Verification, which need no Cloud project. OAuth follows in M5e. MailAccounts shows when a re-sign-in is due. |
| R20 | §19 IMAP poller: `poll#EmailServer` reads one folder by sequence-number SEARCH/FETCH (`crates/moqui-core/src/service/mail/implementation.rs:1244,1565`). It has no UIDs, folder list, flag sync, APPEND or IDLE. | `sync#EmailAccount` is new code: a blocking `imap` session on a worker thread per account, with IDLE on the Inbox. Its scope and tests are in M5d. |
| R21 | §19 generally: entity filters never apply to `moqui.*` entities (`filter.rs:71-88`), and ContactList has no filter. | Visibility of EmailAccount, folders, ChatRoom, ResourceDrive, shares, mailboxes and private ContactLists is checked in their services (owner and member rows). Screens read those records only through the services, never with a bare `entity-find`. |
| R22 | §4 QuickNote without a record writes into the user's notes space, which may not exist yet. | A framework service, `org.moqui.impl.WikiServices.ensure#UserNotesSpace`, in M2, before the Knowledge milestone. |
| R23 | §4, §19 approvals: no contract for what the approve and refuse services receive. | They get `recordEntityName`, `recordId`, the message's `messageJson` map, and `reason` for a refuse. |
| R24 | §10 Comments and §15 Chatter need the new comment's id, and `add#WikiPageComment` returns no `communicationEventId`. | It returns it. |
| R25 | §9 Records drive: the content folders are not uniform. `CommunicationEvent/` is capitalised, AssetMaintenance sits under `asset/<id>/maintenance/`, and Facility has no pair. | BOSS seeds an explicit map from folder to entity and id field. A naming rule would not cover these cases. |
| R26 | §1.2 Inbox count, §12 mailboxes delivered to the Inbox: count and unread are per row (R15). | `get#ShellCounts.messages` counts an internal message once per user: internal messages and Inbox-delivered posts on that user's rows. Changed Oct 19 (§5 M2): the header has separate Mail, Messages and Notifications counts. |
| R27 | §19: the shell changes every `/qapps` user (MarbleERP, SimpleScreens, tools). | Every new header element hides when its theme value or provider is empty. Without BOSS a deployment gains only the launcher, the palette (Recent, Screens, Saved finds, Actions) and icons. |
| R28 | Found building M3, Oct 19: Request, WorkEffort and CommunicationEvent have no entity filter, OrderHeader's is on OrderPart, and WikiPage is a `moqui.*` entity, so R5's "find the record under the user's filters" let any app user read those records' Chatter by id; universal search also found restricted wiki pages and notes. | `get#RecordLinkInfo` applies per-user rules under an organization filter (a work effort or request by its parties and organizations, a message by its parties, mailbox or the record it is filed on, an order by its parts' parties, a wiki page by the wiki's own view rule; ADMIN and explicit entity authz see all; no active organization means all the user's organizations) and offers `checkOnly`; search uses the same rules (mr-mantle b5b2e64, eed058a). |

## 4. Ground rules

- **Failure tolerance (AGENTS.md).** Every aggregator logs the failing piece by name and continues: shell data per app
  root, palette sources, Today sources, shell-count parts, timeline sources, the Inbox merge, mail sync per account,
  folder and message, rules, imports per row, and Records drive folders. Stay strict only for security: token checks,
  record visibility (R5) and private-contact filters (R7).
- **Mantle-free framework.** The framework reaches BOSS only through theme values and service names. It never reads a
  Mantle entity, and Mantle merges framework data (`find#InboxThreads`).
- **Mantle stands without BOSS** (decided Oct 28, 2026, a hard rule for every app). mr-mantle is deployed without
  mr-boss, for example with mr-marble alone, so it has no dependency on mr-boss of any kind:
  - No Mantle service, SECA, EECA, script or data file calls an `ironstone.*` service.
  - None reads a BOSS screen, entity or setting.
  - None names a BOSS user group, artifact group or enumeration.

  Mantle authorizes with Moqui permissions (`ec.user.hasPermission`, as `ORDER_APPROVE` and `PROJECT_CLIENT` do now).
  BOSS grants them to its groups with `UserGroupPermission` rows in its own data.
  - A Mantle service that another Mantle entry point calls inside its own operation runs under that entry point's
    check, not its own. For example, a receipt closes a PO remainder, and a subcontract receipt accepts the service
    line.
  - A Mantle spec makes its own users and groups holding the permissions, so `./moq test mr-mantle` needs no BOSS data. When a Mantle rule needs something
  that only BOSS provides, Mantle offers an extension point instead: a flag or setting, a hook named in data (as
  `ProductPriceModify` is), or a notice or SystemMessage topic BOSS subscribes to.
- **Business logic leans to Mantle** (decided Oct 28, 2026). Logic that is not specific to one BOSS screen, and fits
  Mantle's existing structure, is built in mr-mantle, in the package of the records it changes (`mantle.order`,
  `mantle.shipment`, `mantle.ledger`, `mantle.request` and so on). That covers status rules and transitions,
  validation, calculation, matching, posting, policies and their resolution, and jobs. An `ironstone.<app>` service
  holds only what is BOSS's own:
  - the app's capability check, from its groups;
  - a screen's reads, shapes and saved views;
  - the app's settings forms;
  - the call to the Mantle service.

  When in doubt, the logic goes in Mantle.
- **A new XML element** follows style-guide §8.1. That means the XSD, `ScreenQvt.js` with its `ScreenQvtStatic.js`
  mirror and a `ScreenHtml.js` fallback, the `ScreenSupport.js` element tables (a missing entry is an error), the
  `m-*` wrapper, a regenerated `WebrootVue.qvt.render.js`, CSS, goldens, a `docs/Qvt-Client.md` row and a gallery screen.
- **A JS library** comes in through `libs/refresh.mjs`, as an esbuild bundle like compiler-dom when it has no UMD build,
  with a MANIFEST entry and a `plans/archive/License-Review.md` row. **A Rust crate** is checked against `deny.toml`.
- **`.qvue` screens** copy the gallery pattern (`example/screen/Gallery/Board.qvue`, `Calendar.qvue`): JSON transitions
  with `ec.web.sendJsonResponse`, `moqui.request`, a watch on `$root.currentParameters`, and only `m-*` inputs
  (style-guide §4.8).
- **Parties by role** (added Oct 28, 2026, for the core apps). A party's part in a record is a row of Mantle's role
  association for that record, with a seeded RoleType and dated where the entity is: RequestParty, RequirementParty,
  OrderPartParty, OrderItemParty, AgreementParty, AgreementItemParty, InvoiceParty, ShipmentParty, FacilityParty,
  ProductParty, WorkEffortParty, BudgetParty, or a PartyRelationship between two parties. A new party field is added
  only where Mantle already keys the record by that party (OrderPart's vendor and customer, an owner, a filer) or the
  ledger summarizes by it (a cost centre), and the plan says so.
- **Organization filters** (added Oct 28, 2026, for every BOSS root). An app's ordinary user groups, and Commons' and
  Comms' `ALL_USERS`, take `MANTLE_USER_ORG` and `MANTLE_PRIVATE_CONTACT`, so a user always works within their own
  organizations: `filterOrgIds` is the active organization when one is set, or else every organization they belong to
  with its direct children. Each app has an admin group, `BOSS_<APP>_ADMIN`, with `AUTHZT_ALWAYS` and `AUTHZA_ALL` on its
  root and `MANTLE_ACTIVE_ORG` and `MANTLE_PRIVATE_CONTACT`: every organization until one is made active. Framework
  `ADMIN` keeps its rows. `MANTLE_USER_ORG`'s Product, ProductCategory and ProductFeature filters admit `_NA_`, as its
  Party filter does. Services still check organization access themselves, whatever the filter.
- **Changes by effective date and the audit log** (added Oct 28, 2026; the Moqui Java pattern):
  - Associations, settings and policies change by effective-dated rows. A change ends the current row (`thruDate`) and
    starts the next (`fromDate`); nothing is overwritten or deleted, and a read takes an as-of date, now by default.
  - The key fields of a business record (quantities, amounts, prices, dates, parties and status) have
    `enable-audit-log`, so EntityAuditLog keeps each change with its user, time and reason. Mantle already does this for
    OrderItem's product, quantity, unit amount and required date, OrderPart's parties and facility, ReturnItem,
    Shipment, Asset, Agreement and AgreementItem's quantity.
  - A revision is a point in time: a counter where Mantle has one (`OrderHeader.orderRevision`, itself audit-logged so
    each number has its time), otherwise a timestamp. A record as of a revision, or as of any date and time, is read
    back from its current rows and the audit log, as `get#OrderDisplayInfo` and `get#OrderItemDisplayInfo` read item
    history.
  - A print takes an effective date and time. A key revision (a sent PO or RFQ, an approved agreement, estimate or
    budget) also stores its rendered PDF as the record's content (OrderContent, RequestContent, AgreementContent and
    so on), stamped with that time.
  - No parallel version, revision or snapshot records for what effective-dated rows, the audit log and stored PDFs
    cover. A separate record stays only for a fact with an identity of its own, such as an approval decision, a posting
    or a count, and the plan says why.
  - Mantle's existing uses of both patterns are kept, not replaced.
- **Demo data.** BOSS adds `data/BossDemoData.xml` (type demo) per milestone so specs and screenshots have content.
- **Done for a milestone:**
  - Tests: `cargo test` for the touched crates, with goldens reviewed; the new Mantle specs in `test/suite.js` passing
    under `./moq test mr-mantle`; `./moq test mr-boss` passing, with `test/AppStructure.spec.js` extended to
    every implemented Commons and Comms screen (not only the placeholders); `moqui lint --screens` clean for BOSS.
  - Screens: screenshots of each new screen with `example/test/gallery-shots.mjs`, light and dark, at 390, 1280 and
    1440 px.
  - Paperwork: the **Implemented in** columns of `ss-inventory.md` and `usl-inventory.md` filled, and
    `Remaining-Work.md` updated. The milestone's status in §5 updated.
- **Builds and commits.** Debug incremental builds with one toolchain (the building skill); `rustfmt --edition 2021` on
  single files. Each step is a commit-ready unit per repo.

## 5. Milestones

| Milestone | Repos | Screens | Status |
| --- | --- | --- | --- |
| M0 Foundations | mr-moqui, BOSS | the moved screens | done Oct 18 |
| M1 Shell framework | mr-moqui, Mantle, BOSS | header, tray frame, palette, quick-create frame | done Oct 19 |
| M2 Today, notifications, quick create | mr-moqui, Mantle, BOSS | TodayPanel, NotificationsPanel, Notifications, QuickCreate, Commons Home, Settings, Account, Preferences, NotificationSettings | done Oct 19 |
| M3 Record links, Chatter, record files | mr-moqui, Mantle, BOSS | Chatter, RecordFiles | done Oct 19 |
| M4 Contacts | mr-moqui, Mantle, BOSS | Contacts, ContactDetail, ContactImport, Duplicates, ContactBooks | done Oct 19 |
| M5 Mail (M5a–M5f) | mr-moqui, Mantle, BOSS | Inbox, Compose, MessageDetail, Comms Home, MailAccounts, Identities, Rules, OutOfOffice, TextBlocks | done Oct 19 (M5f, the SMTP listener, is in the framework behind the `inbound-smtp` feature, off by default; the add-account wizard can make a hosted or shared account the gateway delivers, with no mail-server password) |
| M6 Tasks and requests | BOSS | Tasks, TaskDetail, Requests, RequestDetail | done Oct 19 |
| M7 Calendar and schedules | mr-moqui, Mantle, BOSS | Calendar, EventDetail, Schedules, ResourceDetail, Calendars | done Oct 19 (the Inbox iMIP card with M5) |
| M8 Files and drives | mr-moqui, BOSS | Files, Drives, Shares, PublicShare | done Oct 19 |
| M9 Knowledge and notes | mr-moqui, BOSS | Knowledge, Spaces, Review, Notes | done Oct 19 |
| M10 Chat and presence | mr-moqui, Mantle, BOSS | Chat, ChatPanel, ChatSettings | done Oct 19 |
| M11 Consent and unsubscribe | mr-moqui, Mantle, BOSS | Consent, Unsubscribe | done Oct 19 (the List-Unsubscribe headers on the wire wait for the framework) |

**Inventories.** The **Implemented in** columns of `ss-inventory.md` and `usl-inventory.md` are filled as of Oct 19 for
M0–M11 and the design gaps closed after it (each file's notes give the rules): the 101 SimpleScreens forms designed here
and the 5 `—` ones, and the Mantle services the built screens call, 102 of the 143 new in Mantle listed in **Added**
tables. Still blank: the designed services no built screen calls, either reached only inside Mantle
(`save#*ContentFile`, `find#PartyCommunicationEvents`, `create#Person`, `create#Organization`, `create#EmailAddress`,
`create#TelecomNumber`) or replaced (`search#Party` by `find#Party`, `add#TaskComment` and `add#WikiPageComment` by
Chatter's `log#RecordNote`, `remove#WorkEffortParty` by `remove#EventAttendee`) or not used (`find#PartyHasDuplicates`);
the Calls screens (`later`); and the other apps' rows.

**Design gaps closed, Oct 19.** Chatter edits a note in place (its author; marked "(edited)" through the new
`CommunicationEvent.editedDate`; only the users newly mentioned are notified) and deletes one (its author or the ADMIN
group, not while it has replies) through Mantle's new `update#RecordNote` and `delete#RecordNote`, which take a request's
comments through `update#RequestComment` and `delete#RequestComment` (now checked: the comment's join, its author, ADMIN to
delete). The contact info card puts each kind's primary first as `get#PartyContactInfo` has it. EventDetail lists its
linked records as record cards with who linked them, links one by its id or a search and takes one off. Settings/Account
uploads, changes and removes the user's photo (`create#PartyContent`, `PcntFaceImage`), which Chatter's avatars show.
Knowledge has Duplicate page (with the pages under it, here or in another space) over `get#WikiPageInfo` and
`update#WikiPage`, since the framework's `clone#WikiPage` keeps the name, copies no pages under it and writes the files at
the source's path. Framework needs: the header's account avatar (and `m-avatar` with only a `user-id`) has no way to find
the user's face image.

### M0 — Foundations (mr-moqui, BOSS)

- Screen failure tolerance (Remaining-Work, gallery findings F4 and F28). A screen with a parse or script error is
  logged and left out of the menu data, and its siblings still render. A qvt render error is logged, as html already
  does.
- Material Symbols (style-guide §5.6, §8.2). Vendor the outlined font and Quasar's `material-symbols-outlined` icon set,
  and render `imageType: icon` through `q-icon` in the drawer menu, breadcrumbs and AppList. The `sym_o_*` app icons
  then show.
- Make the screens moved from the first port (EventDetail, Requests, RequestDetail, Settings/Account, MessageDetail,
  ScheduledReportDetail) render and pass lint, with a minimal JS conversion. Each one is redesigned in its own milestone.

Done: AppStructure passes, the 8 lint failures are gone, and the icons show in the drawer.

Built Oct 18: mr-moqui 0fa00fc (failure tolerance, Material Symbols `@material-symbols/font-400` with Quasar's icon set,
loaded only when the theme has the font, `m-menu-icon`), BOSS 1fce896 (the moved screens, `data/BossDemoData.xml`,
AppStructure renders every screen with its demo record), mr-marble e26a723. An existing database needs a load for
the new theme stylesheet rows.

### M1 — Shell framework (mr-moqui; Mantle; BOSS seed and providers)

**Framework**

- STRT enumerations in `framework/entity/ScreenEntities.xml`: `STRT_TRAY_TODAY`, `STRT_TRAY_CHAT`,
  `STRT_TRAY_NOTIFICATIONS`, `STRT_QUICK_CREATE`, `STRT_CHATTER_SCREEN`, `STRT_RECORD_FILES_SCREEN` and
  `STRT_SHELL_COUNTS_SERVICE`. `webroot/screen/webroot/qapps.xml` adds them to `qvtConfig`.
- `<shell-providers>`, parsed with the screen definition. Its children are `quick-create`, `today-source`,
  `palette-action`, `palette-type`, `palette-source` (R3), `notification-topic` and `keymap`.
- The `shellData` transition (R2): `webroot.xml`, `sri.getShellData()` and a new `crates/moqui-core/src/screen/shell.rs`
  beside `menu.rs`, with an authz check per app root.
- `<context record-entity record-id title selection-form>` as a client binding (R18). The root exposes `screenContext`
  {path, parameters, record, selection, filters, forms} and `assistReach` (the root element ids).
- `m-qapps-root` (style-guide §2.2, design §1.2):
  - the launcher `q-menu` and the current app's title;
  - the Search button, the `+` menu, and the Today, Chat, Inbox and Notifications buttons with badges, each hidden
    when empty (R27);
  - the account menu gains Preferences and Account;
  - the notify-history and screen-history buttons go: history becomes the palette's Recent group, and the
    notifications become the tray panel;
  - the Assist slot is reserved (R1).
- Tray panel frame (design §1.4): 400 px, full width below 600 px. Each tab is a cached `m-dynamic-container` loaded
  once. The panel keeps its open state, tab and scroll, closes on Esc, refreshes on the `shellCounts` topic and its
  tab topic, and polls every 5 minutes when the socket is down.
- Palette (design §1.5): Recent, Screens, Saved finds (FormListFind), Actions, and the provider sources; the `>`, `@`,
  `#` and `:` prefixes; groups capped at 5 with a "more" link; Enter and Ctrl+Enter.
- Quick-create frame. The `+` menu comes from the providers, with the current app's first. It opens
  `STRT_QUICK_CREATE` or a provider's screen in `m-dynamic-dialog`, with the context as parameters.
- Keymap registry `moqui.keymap` (design §1.7): global keys, `registerScope`, the `?` overlay and `KEYMAP` preference
  overrides. The Ctrl+Shift+A check waits for Assist.
- `framework/service/org/moqui/impl/ShellServices.xml` with `publish#ShellCounts` (R13), and a client `shellCounts`
  listener.
- Gallery: `Panel.xml` runs inside the real tray, and a new gallery screen shows the providers and context.
- Tests: goldens for `context` and `shell-providers`; node tests for the keymap, palette grouping and prefixes; a
  `crates/moqui-host/tests/gate3_browser.rs` smoke that opens the palette, a tray tab and the quick-create dialog.

**Mantle**

- R4: the `search#Universal` per-user conditions.
- R9: `lookup#ById` covers requests and communication events.

**BOSS**

- Theme values in `data/BossSetupData.xml` (R14).
- `<shell-providers>` in `Commons.xml` (quick-create kinds task, event, note, contact and request; the palette sources
  of R3; notification topics) and in `Comms.xml` (email, chat message, Messages and rooms). The kinds point at
  placeholders until M2.
- Delete `template/SearchTransitions.xml`. `Commons/Search` stays as the "more" target.

Built Oct 19: mr-moqui 9644e18 (server side) and 6d7563c (client), BOSS 48c7bae, Mantle ed89ca2 and 660bf52 (search
roles and links on the work documents), all tests passing (gate3_browser runs the shell and the tray in Chromium).
What the build added or settled beyond the design, now in design §1 and §19:
- **More shell pieces:** the `STRT_INBOX_SCREEN` theme value (the Inbox count's link) and `<account-menu-item>`
  (Preferences and Account come from Commons). A quick-create kind without `screen` opens `STRT_QUICK_CREATE` with its
  `kind`.
- **Transitions:** the webroot transitions `shellSearch` (the palette sources, each run as the app root that registered
  it, so that app's authz and entity filters apply) and `shellCounts` (the counts poll while the socket is down).
- **Palette order:** Screens, Saved finds and Actions come before the provider groups, so rows do not move when the
  server answers.
- **Commons' id lookup pattern:** `\S*\d\S*|[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+`.
- **Key scopes:** a keymap scope other than `global` is on only in its own app.
- **Quick create:** a form in the dialog that submits without errors closes it (`mSubmitHide`), so a quick-create
  screen's transition answers with JSON `messageInfos` rather than a redirect.
- **Not built yet:** the `activity` kind (M3), the Messages and rooms source (M5), the presence dot and status (M10).
  The breadcrumbs still start with Applications and repeat the app title. `template/SearchTransitions.xml` stays,
  because Sales/Reports includes it.

### M2 — Today, notifications, quick create (mr-moqui, Mantle, BOSS)

**Plan change, Oct 19 (from the user):** the header has separate counts for Mail (external email, `STRT_MAIL_SCREEN`,
which replaces `STRT_INBOX_SCREEN`), Messages (internal messages and Inbox-delivered mailbox posts,
`STRT_MESSAGES_SCREEN`) and Notifications. Notifications split into two inboxes chosen per topic
(`NotificationTopic.inboxEnumId`, enumeration NotificationInbox): **Notifications** (actionable: mentions,
assignments, approvals, reminders; the badge) and the automatic **Updates** (record-update feeds such as Mantle's
MantleTask, MantleEvent, MantleRequest and MantleCommunicationEvent topics, system messages, job reports; no header
badge; a toggle in the Notifications tab and a rail entry in the center, each with its count). The counts contract is
{today, overdue, chat, email, messages, notifications, approvals, updates}. Framework: in M2 (the topic field, the inbox
filter on the notification services, the header buttons). Mantle: get#ShellCounts and count#UserNotifications by inbox,
the record-update topics seeded into Updates. BOSS: the theme values and the M2 screens.

- **Framework:**
  - New fields: `NotificationMessage.reasonEnumId`, `recordEntityName`, `recordId`, `actorUserId` and `appName`;
    `NotificationTopic.approveServiceName`, `refuseServiceName` and `digestDefault`; `NotificationTopicUser.digest`.
  - The reason enumeration, and builder and script setters for the new fields.
  - The daily digest job (the cron ServiceJob pattern of `framework/data/MoquiSetupData.xml:102`).
  - The `number-card` and `dashboard` elements.
  - `ensure#UserNotesSpace` (R22).
- **Mantle:**
  - `WorkEffortParty.snoozedThruDate`.
  - `WorkEffortServices.get#UserTodayItems`. It also calls the `today-source` providers from shell data, each one
    failure-tolerant.
  - `snooze#UserTodayItem`.
  - `PartyServices.get#ShellCounts` (R12) with its parts today, overdue, notifications and approvals; mail and chat
    are added later. EECAs call `publish#ShellCounts`.
  - Seed the NotificationTopics ChatterMention, ChatMention, WorkEffortReminder, WikiPageReview, FileShare and
    NewMail, with the approval contract of R23.
- **BOSS, all `xml`:**
  - TodayPanel and NotificationsPanel (the tray), and the Notifications center with its Approvals list.
  - QuickCreate with the task, event, note (with a record: without Chatter until M3; without one: in the notes space),
    contact (directory) and request kinds.
  - Commons Home: the Today strip, the counters, tasks this week, requests assigned, upcoming events, shortcuts and
    the setup card. The recent pages and files come in M8 and M9.
  - Settings index, Settings/Notifications, Settings/Preferences (Appearance and Keymap) and a rewrite of
    Settings/Account.
- **Specs:**
  - `mr-mantle/test/CommonsToday.spec.js`: today items with snooze, shell counts (excluding declined events and
    completed tasks), the approval services, and a failing today source.
  - BOSS screen specs.

Built Oct 19:
- **Commits:**
  - mr-moqui 95c3624: notification reasons, records, the Notifications and Updates inboxes, approvals, the digest,
    number-card and dashboard, the notes space, the Mail and Messages counts, plus time zones and view aliases as in Java.
  - Mantle 307c688 and 2c99ae4: today items, snooze, shell counts by inbox, the counts ECAs.
  - BOSS 8cefb7d: the screens, with 66 features.
- **What the build added or settled:**
  - The activity kind of quick create was built here, not in M3.
  - A note's body is the `rich-light` editor.
  - The Settings index is the default subscreen.
  - The counter titles are shortened so two cards fit a phone row.
  - Contacts made in quick create are personal unless "Directory" is chosen.
  - The tray screens are server-merged qvt, like every screen so far; a later pass marks them server-static (§6).

### M3 — Record links, Chatter, record files (mr-moqui, Mantle, BOSS)

- **Framework:**
  - The `chatter` and `record-files` elements (R5), which render nothing when their theme value is empty.
  - The Tiptap bundle in `refresh.mjs`: core, starter-kit, link, image, mention and placeholder, as an IIFE global.
  - `m-rich-text` (light and full modes, mentions over a search URL; the fallback is `text-area editor-type="html"`).
  - `m-avatar` (face image or initials; the presence dot is added in M10) and `m-record-card` (`lookup#ById`).
- **Mantle:**
  - New entities `CommunicationEventRecord`, `WorkEffortRecord` and `RecordFollower`.
  - `link#CommunicationEventRecord` and `link#WorkEffortRecord`. Each uses the record's own join when one exists:
    OrderCommunicationEvent, RequestCommEvent, WorkEffortCommEvent, WikiPageCommunicationEvent, RequestWorkEffort or
    WikiPageWorkEffort.
  - `get#RecordTimeline`: comm events, `*Note` rows, activities, the audit log and files, each source
    failure-tolerant.
  - Follow and unfollow; ChatterMention notifications.
  - `find#PartyCommunicationEvents` extended to the recipient rows and leaving out mailbox posts; R24.
- **BOSS:**
  - `Shared/Chatter.qvue` and `Shared/RecordFiles.qvue`. Until M8, RecordFiles works over the record's `*Content`
    join and its content folder. Both are mounted hidden in every app root.
  - QuickCreate gains the activity kind and the link chip; QuickNote gets its record branch.
  - Chatter and record-files go into EventDetail, TaskDetail and RequestDetail as the first hosts.
- **Specs:** `RecordLinks.spec.js` (own join versus the generic link, the timeline union, followers and mentions), and
  a record visibility check for R5.

Built Oct 19:
- **Commits:**
  - mr-moqui 7472b7b: the chatter and record-files elements, Tiptap with m-rich-text, m-avatar, m-record-card.
  - Mantle 5d22ef7 (links, timeline, followers) and b5b2e64 and eed058a (record visibility, R28).
  - BOSS b53a89d: Chatter.qvue and RecordFiles.qvue in every app root, with 95 features.
- **What the build added or settled:**
  - Send message is internal for now. "Email…" opens `Comms/Inbox/Compose` with `recordEntity`, `recordId`, `to`,
    `subject` and `replyToCommEventId`, which M5 connects to `send#EmailDraft`.
  - The timeline pages ("load more") instead of scrolling virtually.
  - Mention ids are userIds.
  - React, forward and share are left for later.
  - The record's old notes and content boxes on the M0 hosts are replaced by Chatter and record files.

### M4 — Contacts (mr-moqui, Mantle, BOSS)

- **Framework:**
  - `container-split` and the wizard panel (`subscreens-panel type="wizard"`).
  - vCard 3.0 and 4.0 parse and write: a crate checked against `deny.toml`, exposed as a tool. It is the first part of
    the iCalendar, vCard and iMIP tool.
- **Mantle:**
  - New entities `ContactBook`, `ContactBookParty`, `ContactBookGroup`, `ContactBookGroupParty` and
    `ContactBookShare` (`mantle.party.contact`).
  - `Party.privateOwnerUserId` with the R7 filter conditions.
  - `ContactBookServices` and `ContactImportServices` (parse, preview, import as a job, export as vCard or CSV).
  - The duplicate scan skips personal contacts; R10.
- **BOSS:** Contacts (split), ContactDetail (Overview, Activity, Calendar, Tasks, Requests and Files; Consent comes in
  M11), ContactImport (wizard), Duplicates and Settings/ContactBooks. CardDAV info is `later`.
- **Specs:** `ContactBooks.spec.js`, including the R7 privacy check over every path, and an import with the Google and
  Outlook CSV presets.

### M5 — Mail (mr-moqui, Mantle, BOSS; the largest milestone, in parts)

**M5a — model, Internal account and mailboxes (framework and Mantle)**

- Framework entities:
  - New: EmailAccount (kinds internal, hosted, external and shared), EmailAccountUser, EmailIdentity, EmailFolder,
    EmailLabel, EmailMessageLabel, EmailMessageAttachment, EmailRule, EmailOutOfOffice, EmailTextBlock and
    EmailSearch.
  - EmailMessage gains the account, folder, uid, flags, snippet, size, snooze and schedule fields.
  - EmailServer gains `authTypeEnumId` and a token reference.
- Mantle:
  - Internal message state on CommunicationEventParty: `readDate`, `isFlagged`, `archivedDate`, `snoozedThruDate`,
    and the role types.
  - `CommunicationEventPartyLabel`.
  - `create#Message` takes to and cc lists and `contactListId`, and applies R15; `reply#CommunicationEvent` per R8.
  - `find#InboxThreads`, a cursor merge of the two stores by date; `get#InternalThread`;
    `set#InternalMessageState`; `close#ListThread`.
  - Mailboxes:
    - `ContactList` gains `postingEnumId`, `defaultDeliveryEnumId` and `archivedDate`.
    - `ContactListParty` gains `roleTypeId` and `deliveryEnumId`.
    - New: the MAILBOX type, the enumerations and the role types `ListOwner` and `ListModerator`.
    - A new `service/mantle/marketing/ContactListServices.xml`. Private mailboxes are enforced in its services (R21).
- Specs: `InternalMessages.spec.js` and `Mailboxes.spec.js`. They cover the posting policies, private join requests,
  joining later (earlier threads show as read), the reply variants, and per-recipient state.

**M5b — the client over the Internal account (BOSS, framework components)**

- `m-html-view`: DOMPurify (already vendored) in a sandboxed iframe with a CSP. Remote images stay blocked until
  allowed, and it follows dark mode.
- The Inbox keymap scope.
- `Inbox.qvue` with its rail, thread list, reading pane (right, bottom or off), search operators, bulk actions, keyboard
  and mailbox header.
- `Compose.qvue` as a dock, dialog or page, with `m-rich-text`, recipient chips over parties, users and mailboxes, text
  blocks, and draft autosave.
- MessageDetail (`xml`) and Comms Home.
- Demo-able with no mail server.

**M5c — sending and account setup**

- Per-account SMTP routing in `send#EmailMessage`; `save#Draft` and `send#Draft`; the undo-send hold in the Outbox; the
  scheduled-send and snooze-return jobs; R6.
- The MailAccounts wizard: password authentication, Thunderbird autoconfig and SRV discovery, `test#EmailAccount`, and
  the filing policy.
- Identities, TextBlocks, OutOfOffice, and Preferences MailDefaults.
- Search documents: `MoquiEmailMessage`, and `MantleCommunicationEvent` with `contactListId` and its per-user filter.
  The header Mail count (`counts.email`) from the unread external mail.

**M5d — the IMAP and POP sync engine (Rust, R20)**

- `EmailClientServices.sync#EmailAccount` covers:
  - folders: listing with special-use mapping, UIDVALIDITY with incremental UIDs, CONDSTORE or QRESYNC when the server
    offers them;
  - messages: flags both ways, MOVE and COPY, APPEND of sent mail, IDLE on the Inbox;
  - POP as fetch-only; attachments as DbResource files.
- A party match makes a CommunicationEvent when the account's filing policy allows it.
- `run#EmailRules` and the Rules screen; `.eml` and `.mbox` import.
- Failure-tolerant per account, folder and message.
- Tests: a scripted fake IMAP server in the crate tests (no network), plus a manual run against a real account.

**M5e — OAuth client and token store**

- Authorization code with PKCE in a popup, encrypted refresh tokens, and XOAUTH2 for IMAP and SMTP, for Google and
  Microsoft 365 (R19).

**M5f — SMTP listener behind the gateway** (hosted and shared accounts)

- Mail accepted only from the gateway's addresses, with its Authentication-Results trusted, routed by address, then
  rules, then storage. This fills in the empty `inbound-smtp` feature of moqui-host.

M5 leaves two gaps, closed later: the iMIP card comes in M7 and "Attach from Files" in M8.

Built Oct 19 (M5 remainder and BOSS screens):
- **Commits:** mr-moqui 43c75ad (`m-html-view`, mail search with operators, out-of-office replies, one-click
  unsubscribe, server drafts, snoozed threads woken by new mail) and 2bbe78d (`save#Draft` attachment locations);
  Mantle 733bab7 (the search line on internal threads, the comments view, `needsReply`); BOSS 6619a1b.
- **What the build added or settled:**
  - `Comms/Inbox` wraps the subscreen `Inbox/Mail` (`Mail.qvue`), because a `.qvue` screen cannot host the
    subscreens of its own path. `Comms/Inbox` and `?view=internal` still work.
  - The iMIP card (Accept, Tentative, Decline) is built in the reading pane.
  - Internal messages have no labels or folders. Delete on an internal thread archives it.
  - "All in this view" acts on every conversation of the view, with no count. Sync shows a chip, not a progress count.
  - Not built then, since built (Oct 19, §8): the phone swipe actions, contact groups that expand in the recipients,
    Save to Files, and the bytes an account's files use in place of a quota line (mail has no quota). Still not built:
    the Assist actions.
  - `save#Draft` takes as attachments only the draft's own files and files under the account's mail folder;
    an internal caller with authorization disabled may name any.

Built Oct 19 (M5e and the settings screens):
- **Commits:** mr-moqui a59c51e (merged 032bb50), 1c4e42d (the service gaps the settings screens found), 1dff6a1 (a
  capped sync goes on at the job's next run); BOSS e413dea (Comms Home and the mail settings).
- **What the build added or settled:**
  - R19, checked: Google's IMAP and SMTP scope is restricted. An Internal Workspace app needs no review; an External
    app in Testing allows 100 users and its refresh tokens expire after 7 days; production needs the restricted-scope
    review. Microsoft needs an Entra Web app with a secret and the IMAP, POP and SMTP delegated scopes; Microsoft 365
    needs SMTP AUTH on per mailbox. A deployment's setup is in mr-moqui docs/Mail-OAuth.md.
  - The add-account wizard has five steps (Address, Connect, Test, Options, Finish) and an account page replaces the
    AccountEdit form. Known providers are resolved offline, with app-password help.
  - Out of office can reply to everyone, contacts or internal senders; "contacts" asks a hook
    (`STRT_EMAIL_CONTACT_SERVICE`), which BossSetupData sets (Oct 19) to Mantle's
    `ContactBookServices.filter#ContactAddresses`: the owner's personal contacts, own and shared books, and the directory
    of the owner's organizations, never another user's personal contact (R7).

### M6 — Tasks and requests (BOSS on existing Mantle)

- Tasks (smart lists, quick-add row, bulk actions), TaskDetail, Requests and RequestDetail, rewritten from the M0
  conversions with Chatter, record-files and the context element.
- The board and calendar switches open the Projects board and the Commons Calendar until `view-board` and
  `view-calendar` exist, as design §8 says. Done Oct 19: the Tasks list has `views="list,board,calendar"` (a board by
  status through `set#TaskStatus`, a calendar by due day through the in-place due edit, quick add on an empty day).

Built Oct 19:
- **Commit:** BOSS fd517b5. `ironstone.commons.TaskServices`, `RequestServices` and `StatusServices`, with 170 BOSS features.
- **What the build added or settled:**
  - Tasks and Requests hold only their subscreens. The default subscreen `List` is the list, as in Contacts.
  - The stage chips with the next status as the primary action are `template/StatusBar.xml`. It is a BOSS stand-in
    until the framework's `status-bar` element exists (style-guide §8.2).
  - An "All open" chip is the default. Quick add is a form row at the top of the list card, not `first-row-field`, so
    it keeps the list state and works on a phone. Priority finds by band (high, normal, low).
  - Access goes through `get#RecordLinkInfo` with `checkOnly`. The owner or an assignee changes a task. A task or request
    the user may not see is "not available".
  - Add to Today clears the user's snooze, and makes the task due today when it has no due date or a later one.
  - Convert to request makes a draft request linked by `RequestWorkEffort`, and the task stays.
  - Delete own is for the owner only, and only when the task has no time, sub-tasks, comments or files.
  - Created by me reads `ownerPartyId`, because WorkEffort has no created-by field. Watching is the Watcher role or a
    Chatter follow.
  - The requester edits their own draft request. Approved and Closed stay in the Projects app.
  - Each bulk item runs in its own transaction. A failing one is logged and counted, and the rest go on.

### M7 — Calendar and schedules (mr-moqui, Mantle, BOSS)

- **Framework:** the rest of the iCalendar tool: ICS parse and write, RRULE expansion with `jiff` time zones, VALARM,
  and iMIP REQUEST, REPLY and CANCEL.
- **Mantle:**
  - New entities: Calendar, CalendarWorkEffort, CalendarShare, CalendarSubscription, WorkEffortRecurrence and
    WorkEffortReminder, with its job. New seed values: WeatRecurrenceInstance, WeptTentative and the
    `WorkEffortFacility.statusId` flow.
  - R11.
  - `get#FreeBusy`, `send#EventInvitations`, `respond#EventInvitation` and `book#Resource`.
  - `CalendarServices`: create, share, subscribe, the fetch job, export and import.
- **BOSS:** `Calendar.qvue`, the EventDetail rewrite, `Schedules.qvue` (resource mode), ResourceDetail,
  Settings/Calendars and Preferences CalendarDefaults; the Inbox ImipCard; meetings on Comms Home.
- **Specs:** `CalendarServices.spec.js`. It covers recurrence with overrides, RSVP, free/busy, booking with and without
  a policy, reminders, and an ICS round trip.

Built Oct 19 (BOSS screens):
- **Commit:** BOSS 5c85b7a, with the Calendar, EventDetail, Schedules and CalendarSettings specs.
- **What the build added or settled:**
  - The grid, drag, resize and overlap layout are built in `Calendar.qvue`; FullCalendar is not vendored.
  - Calendar colors are user data, so events use them inline (an exception to style-guide §4.8).
  - Changing or cancelling one occurrence, this and following, or all is in `ironstone.commons.CalendarServices` until Mantle
    has services for it. Delete cancels an event (`WeCancelled`).
  - Saving the working hours in Preferences writes a weekly `WetAvailable` work effort, so `get#FreeBusy` and Find a
    time keep to them.
  - Not built then, since built (§8): publish links (`/cal/<token>`) and the room capacity filter (Oct 21). Still not
    built: the CalDAV address.

### M8 — Files and drives (mr-moqui, BOSS)

- **Framework:**
  - New entities: ResourceDrive, ResourceDriveMember, ResourceShare, ResourceFavorite, ResourceTag,
    ResourceTagMember and ResourceTrash.
  - New fields: `DbResourceFile.fileSize` and `versionNote`, and a `note` on ResourceVersion.
  - Change sets in the resource facade, built on `commit(Vec<Edit>)` in `crates/moqui-core/src/resource/git/ops.rs:232`.
  - The git path index cache.
  - `FileServices`, all verbs. Access goes through drive members (R21).
  - Previews: image thumbnails with the `image` crate; a PDF's first page through Chromium when it is present.
  - The `MoquiDriveFile` document, indexed by FileServices.
  - The public shell and the token routes (R16).
- **BOSS:**
  - The Records drive and its folder map (R25).
  - `Files.qvue`, Drives, Shares, and `PublicShare.qvue` at `/s/<token>`.
  - RecordFiles moves onto the Files component.
  - Compose gains AttachFromFiles; Home gains recent files; FileShare notifications.
- WebDAV stays later (R17).

Built Oct 19:
- **Commits:** mr-moqui 4b228a9 (merged 3833b18) and db7be4c (the gaps found by the screens); BOSS 972ebeb.
- **What the build added or settled:**
  - Two entities beyond the plan: ResourceRecent (for Recent) and ResourceDriveRecordFolder (the records drive's folder
    map, which BOSS seeds for BOSS_RECORDS over `dbresource://mantle/content`).
  - Token routes are a conf element, `<token-route name screen-location token-service title>` under the webroot
    webapp. BOSS adds `s` in its MoquiConf.xml; the public page is `screen/PublicShare.xml`.
  - A records drive applies record visibility for every caller of FileServices: a path maps to its record through the
    folder map, and the record-visibility hook (`STRT_RECORD_VISIBLE_SERVICE`, as chat's record rooms use) decides.
    Without the hook only drive managers reach record folders. The drive is read-only; uploads come from RecordFiles.
  - WikiPage attachments stay under each space, not in the Records drive.
  - Shares is three boxes (with me, by me, links), not tabs.
  - Not built: PDF previews through Chromium, extracted text for search, file comments, office previews.

### M9 — Knowledge and notes (mr-moqui, BOSS)

- **Framework:** WikiPageReview; WikiPageLink with backlinks indexed in `update#WikiPage`; `move#WikiPage`, which
  replays history into a git space; `create#WikiSpace` and `clone#WikiSpace` with `repositoryKind`; version notes on
  saves.
- **BOSS:** `Knowledge.qvue`, with the markdown `text-area` until `m-coedit` exists and the History compare over
  `getVersionDiff`; Spaces, Review and `Notes.qvue`; recent pages on Home.

Built Oct 19:
- **Commits:** mr-moqui 36ee9af (merged 5d432cf), 57a5402 (published text respects restrictions) and c2d851b (exact
  paths and the access rule on every read and write); Mantle 0844957, e848cc0 and udm 1535d11; BOSS 888aa01.
- **What the build added or settled:**
  - The wiki's access rule is `get#WikiPageAccess` (view, update, admin; ADMIN and a space's allowAdmin) and
    `get#WikiViewScope` for lists. Mantle's record visibility and universal search call them.
  - A page is addressed by its exact path. A short name no longer finds a nested page, so a new page cannot overwrite
    one elsewhere.
  - A moved or renamed page keeps an alias at its old path, so links still find it.
  - Deleting a page removes Mantle's joins first (a SECA on `delete#WikiPage`).
  - Knowledge/SpaceDetail is a screen beyond the design (settings, members, restricted pages).
  - Not built: a resizable side pane, favorites, export and print, presence; space members are users only. Page clone
    (Duplicate) came Oct 19, with the gaps above.

### M10 — Chat and presence (mr-moqui, Mantle, BOSS)

- **Framework:**
  - A new `framework/entity/ChatEntities.xml`: ChatRoom, ChatRoomMember, ChatEvent and ChatAttachment.
  - `ChatServices`.
  - Events go to members as NotificationMessages on `chatRoom:<id>` and `chatUser:<id>`, so `notws` delivers only to
    member users.
  - Typing and read markers.
  - UserStatus with the `userStatus` topic, auto-away, the `m-avatar` dot and status in the account menu.
  - The `MoquiChatEvent` document.
- **Mantle:** the chat part of shell counts; ChatMention; record-bound rooms in `get#RecordTimeline`; creating a task,
  request or event from a message.
- **BOSS:** `Chat.qvue` and `ChatPanel.qvue` (the tray tab), ChatSettings, the chat action on Contacts, and rooms on
  Comms Home.

Built Oct 19:
- **Commits:** mr-moqui 33c54e6 (merged 3d075b7); Mantle 6b2ace3 and udm 050e8fb; BOSS a095a53.
- **What the build added or settled:**
  - ChatEventMention (mention counts in one query) and `moqui.security.UserStatus` beside the planned entities.
  - Record rooms are reached through the record-visibility hook `STRT_RECORD_VISIBLE_SERVICE`, which BOSS seeds as
    `get#RecordLinkInfo`.
  - Mantle files a chat message on a record as a CommunicationEvent of the new type Chat
    (`findOrCreate#ChatCommunicationEvent`) and makes a task, request or event from one
    (`create#RecordFromChatMessage`); record timelines have a chat source.
  - The timeline pages by 50 messages rather than a virtual list.
  - Not built: polls, calls, link previews, the room's files and threads lists, forward, offline sends.

### M11 — Consent and unsubscribe (mr-moqui, Mantle, BOSS)

- **Mantle:** PartyConsent; `ConsentServices` (`store#PartyConsent`, `unsubscribe#ContactListParty`);
  `List-Unsubscribe` headers on ContactList sends and the one-click POST.
- **BOSS:** Consent; Unsubscribe in the public shell at `/u/<token>`; the Consent tab on ContactDetail.

Built Oct 19:
- **Mantle:** `ContactListServices.send#ContactListEmail` (Marketing's send: the subscribed members, consent gating them,
  one CommunicationEvent, per member a token, the email, a ContactListCommStatus with the Message-ID); `ConsentServices`
  `check#UnsubscribeToken` (the `u` route's check: a known token passes, an ended one only to say so),
  `send#UnsubscribeVerifyEmail` (the confirmation a pending unsubscribe waits for; the seed template
  MANTLE_UNSUBSCRIBE_VERIFY), `process#UnsubscribeEmail` with `MantleConsent.emecas.xml` (the List-Unsubscribe mailto), and
  `reasonText` on the unsubscribe services. List-Unsubscribe is `<…/u/<token>/oneClick>` and, with an address, a mailto.
- **BOSS:** `screen/Unsubscribe.xml` and `.qvue` at `/u/<token>` (this list, all marketing email, the lists one by one, a
  reason, Resubscribe, the confirmation link, the expired page) with the one-click POST at `/u/<token>/oneClick`;
  `Comms/Consent` (List and Contact) and `template/ConsentRecord.xml`, which the contact record's Consent tab includes;
  `ironstone.comms.ConsentServices` (contact admins only); `data/BossConsentDemoData.xml`.
- **What the build settled:**
  - The one-click URL is a transition below the page: a POST to `/u/<token>` itself renders the public shell.
  - EditConsent is a page (Comms/Consent/Contact) rather than a dialog: with the history it is longer than a dialog may be.
  - Consent is not per organization (PartyConsent has none, as §19 has it): "all marketing email" withdraws the address's
    marketing consent, which every organization's sends respect; the lists unsubscribed are the token list's organization's.
  - Framework gaps: `send#EmailTemplate` takes no extra headers (the send passes `extraHeaders`, dropped today) and
    MailCapture keeps no headers, so the headers do not go out yet; a `section-include` inside an included section does not
    find the sections nested in the one it includes (the Consent tab uses `include-screen`).

## 6. Later

Designed in design-drawers-commons.md; each of these gets its own plan. Reviewed Oct 21, 2026: what is built is marked,
with what the drawers and Commons gained for it.

- Server-static pass (agreed Oct 19): built Oct 21 (§8): 19 Commons and Comms screens are server-static, the others left
  as server merges for the reasons §8 gives.
- Calls: WebRTC with Calls, Call, LiveCall, CallSettings, CallSession and CallLink, and the `Call` comm type.
- Sync: built Oct 21 (§8, mr-moqui docs/Sync.md): CalDAV, CardDAV and WebDAV at `/dav`, SFTP to the drives, app passwords,
  Settings/Sync, and the addresses on Calendars, Contact books and a drive's settings.
- `m-coedit` with `yrs` and CollabDocument: built Oct 21 (§8; mr-moqui docs/Revision-Management.md, Co-editing); Knowledge
  and Notes edit with it.
- The Assist drawer port (Phase 13), BOSS skills and agent room members.
- PWA install and web push.
- Search: extracted text from PDF and office files. PDFs, spreadsheets and text files built Oct 21 in the framework; Commons
  Search now lists the matching files beside the records (Oct 21). Office files (docx, pptx, odt) are left.
- Calendar: Google and Microsoft 365 subscriptions over OAuth.
- Smaller items: the org chart and polls. Polls built Oct 21 in Chat (§8); the org chart is left.
- Mail: the mailbox email bridge, an IMAP or JMAP server, S/MIME and PGP, and an archive policy.
- Retention: a job for the personal books of disabled users.
- Public pages to mr-pass, since public-facing applications go there and internal ones stay in mr-boss (decided
  Oct 28, 2026; impl-customer-service §4): the shared-file page (`screen/PublicShare.xml` at `/s/<token>`, M8), the
  unsubscribe page (`screen/Unsubscribe.xml` at `/u/<token>` with its List-Unsubscribe one-click POST, M11), and the
  published calendar (`screen/PublishedCalendar.xml` at `/cal/<token>`), as pages of PASS apps. PASS already has its
  own unsubscribe page for forum mail, which the list one may join.
- Git: push and an HTTPS git server: built in the framework (mr-moqui docs/Git-Hosting.md). Oct 21: a version-controlled
  drive's repository takes the drive's members by the drive's own rule, and a drive's settings show its clone addresses with
  its WebDAV and SFTP addresses.

## 7. Verification

- **Per milestone,** as in its specs and the "Done" rule of §4.
- **End to end,** run `./moq run` and sign in as `john.doe`, then:
  - **M1–M3:** walk through the badges, the palette (Ctrl+K, each prefix, an id), each tray tab, quick create from an
    order, and Chatter on that order.
  - **M4:** import a Google Contacts CSV.
  - **M5:** add a real mail account with an app password, then read, reply, file the thread on a record and move it.
  - **M7–M11:** the calendar, files, knowledge, chat and consent flows of their screens.
- **Screenshots** with `example/test/gallery-shots.mjs` (`BASE_URL`, `USERNAME`, `PASSWORD`, `CHROME`), light and dark.
- **Non-BOSS check:** with BOSS's theme values removed, MarbleERP and the tools screens still render with the hidden
  elements (R27).

## 8. Save point, Oct 19, 2026

Every milestone M0–M11 is built and committed: mr-moqui-base e6d8504 (then the merge below), Mantle udm f443cb8 and usl 8c3b30c, BOSS eb4a3d3
(mr-marble 5330d2a). The last full `./moq test` was 1076 features, all passing, before the final follow-ups; those
were checked with their own specs only. Build notes per milestone are in §5; the framework's own list is mr-moqui
plans/Remaining-Work.md.

**Merged after the save point**
- mr-moqui `entity-modified-fields` (merged Oct 19 after the save point, at the user's call, to be watched): a found
  value's `update()` writes only the fields that changed, so two transactions changing different fields of one row no
  longer undo each other. This goes beyond Java, whose `update()` of a found value writes every field it holds
  (plans/Parity-Diffs.md, "Modified fields"). Checked with moqui-core (1306), mr-mantle with SimpleScreens (620) and
  mr-boss (378).

**Decided**
- view-calendar `range-find` stays opt-in (Tasks and the gallery Views screen set it). A calendar view paints the list's current page. With `range-find="true"`, and only while that view is showing, the client GETs `{screen}/actions/{form}` once (twice when the calendar has an end field) with `{field}_from`, `{field}_thru` and `pageNoLimit=true` for the dates on screen. Making that the default would fire the request for every form-list that has a view-calendar, including a list whose actions ignore the range or honor `pageNoLimit` without it. It does not add a request to Calendar.qvue or to the table and board.

**Built after the save point** (Oct 19–21; commits are named in each repo's log)
- Framework: the header avatar through `STRT_AVATAR_URL` (BOSS seeds it); `clone#WikiPage` with a new name, `withChildren`,
  attachments at the new path and `copyAliases`; `send#EmailTemplate` `extraHeaders` and MailCapture headers (so the
  List-Unsubscribe headers go out); a `section-include` inside an included section; the app-title menu and the breadcrumb
  sibling menus. Oct 21: the search feed's pending rows are claimed by deleting them before delivery, and a worker given
  ids also claims the record's other pending rows, so two deliveries of one record never finish out of order (the
  MailClient search flake: 2 in 30 runs before, 0 in 30 after).
- Mantle: RequestRecord (`link#RequestRecord`); `bookable` on Facility and Asset and Facility `capacity`; internal labels
  (`set#InternalMessageLabels`); `import#Contacts` sends progress (`progressUserId`, topic `contactImportProgress`).
- BOSS: everything in the Mail list of the save point (SyncProgress unregistering, MailDefaults, internal labels, the
  gateway-delivered hosted and shared accounts, bytes used, contact groups on send, Save to Files); `/cal/<token>`. Oct 21:
  Schedules "Seats at least" (`get#Resources minCapacity`); a contact import of more than 100 rows runs as a job with live
  progress (`run#ImportNow`, `Contacts/ImportProgress`), a stopped one says why and runs again; Print of a contact (a card)
  and of the Contacts find (a contact sheet) in `html-print`; avatars with the user's photo wherever a person is a user
  (attendees, assignees, requesters, shares, read receipts, Compare); `moqui lint --screens` has no BOSS flags.
- Oct 21, the four parts built in sessions of their own (mr-moqui 50677fb, f3856d8, 7c2fd51; BOSS 8671941):
  - Chat: retries answered by `clientRef` and an offline outbox, a room's Files and Threads panes, forward, polls,
    text-only link previews, read receipts by preference and `@room`.
  - Files: a PDF's first page and page count through pdf.js in the PDF engine's Chromium page, a spreadsheet's first
    rows by sheet, and extracted text for search.
  - SMTP listener: LMTP, STARTTLS with require-tls, CHUNKING and DSN.
  - OAuth: the access token stored encrypted and shared across a cluster, refreshed under the EmailServer row lock.
- Oct 21: an avatar given a user id shows that user's photo. `userPhoto` read the always-actions `userId`, which is the
  viewer's, so every such avatar showed the viewer's own photo.

**Built Oct 21, the Later items Sync and `m-coedit`** (this session; mr-moqui docs/Sync.md and docs/Revision-Management.md)
- Framework:
  - App passwords: `moqui.security.UserAppPassword`, `UserServices` `create#`, `revoke#UserAppPassword` and
    `get#UserAppPasswords`; taken by the DAV server, SFTP and git over HTTPS, never by the web login.
  - The DAV server at `/dav` (`moqui-core` `dav/`, `moqui-host` `dav_http.rs`): WebDAV over every drive the user may open,
    through the file services as the user (seed group `DriveDeviceServices`); CalDAV and CardDAV over the adapter services
    the conf's `dav-server` names; the well-known addresses; `DavServices` `get#SyncAddresses` and `serve#DavRequest`.
  - SFTP to the drives for a user without `SSH_SFTP` (`dav-server` `sftp-drives`).
  - The ICalendar tool reads and writes VTODO and writes CalDAV objects (`calendarObject`); a vCard keeps its `uid`.
  - Git: drive members reach the drive's repository by the drive's rule; `get#GitCloneUrls` follows it.
  - Co-editing: `moqui.resource.CollabDocument`, the `yrs` rooms (`collab/`), markdown to and from Tiptap's Yjs structure,
    the frames on `/notws` with the cluster topic `collab-update`, `CollabServices` `save#` and `get#CollabDocument`, and
    `m-coedit` with its provider (the Tiptap bundle gained Collaboration, CollaborationCaret and Yjs).
- Mantle: `mantle.work.CalendarDavServices` (calendars, and a Tasks collection of the user's tasks as VTODO) and
  `mantle.party.ContactDavServices` (contact books as vCard 3.0, personal books written), named in mr-mantle
  `MoquiConf.xml`, granted to all users by the seed group `MantleDavServices`; `CalendarWorkEffort.davName`,
  `ContactBookParty.davName` and `davUid`; `export#Contacts` `vcardVersion`; `test/Dav.spec.js`.
- BOSS: Commons Settings/Sync (devices and their app passwords, the password shown once, the addresses, the steps for
  iPhone and iPad, Mac, Android, Windows, Thunderbird and Linux); CalDavInfo on Calendars and CardDavInfo on Contact books
  (each one's address); "On your devices" on a drive's settings (WebDAV, SFTP, git over HTTPS and SSH); Knowledge and Notes
  edit with `m-coedit` (Save is a version with its note, Done closes the editor; the markdown text area when the shared
  editor cannot start); Commons Search lists the matching files; `test/SyncSettings.spec.js`.
- Not built: sync-collection and CalDAV scheduling, attendees a phone writes, writing a shared contact book from a phone,
  persistent WebDAV locks and dead properties, a version per co-editing session on git spaces other than on Save and close.

**Left to build** (round 2, planned Oct 21)
- Framework:
  - Built Oct 21 (Part 3):
    - Wiki: `clone#WikiPage` copies history (`copyHistory`), the published text (`usePublished`) and a `versionNote`, and
      takes file-only child pages. BOSS `copy#Page` uses it. Left: the Duplicate dialog's "Copy the published version"
      option, which `duplicatePage` would pass through.
    - Mail: `send#TestMessage` (the wizard's Test step and the account page), the index search past 2000 matches, and
      `EmailOutOfOffice.internalDomains`.
    - Chat:
      - the retention job (`clean#ChatRetention`);
      - a mentioned non-member of a record room who can see the record is notified;
      - unread and mention counts in one query each (`ChatMemberUnread`, `ChatMemberMentions`);
      - offline 20 seconds after the last socket on a node closes.
  - Still open from M5d: IMAP's plain-text fallback, POP3 STLS, folders removed on the server, and the createTask and
    createRequest rule actions.
  - Older open items still listed in Remaining-Work.md.
- BOSS:
  - Built Oct 21 (round 2):
    - TUI twins of every BOSS screen. `moqui lint --screens` lists none in its TUI worklist.
      - Inline qvt texts have `tui` twins: `[]` for wrappers; text, link and html nodes (`sri.htmlText`) for content.
      - The `.qvue` screens have a `dynamicContainer` of a hidden plain-XML twin screen (`MailTui`, `ComposeTui`,
        `ChatTui`, `RulesTui`, `FilesTui`, `KnowledgeTui`, `NotesTui`, `CalendarTui`, `SchedulesTui`, `ChatterTui`,
        `RecordFilesTui`).
      - The widgets and public pages have a short text.
      - `test/TuiRender.spec.js` renders every screen in tui with no error node.
    - `ec.screen.staticReport` (the full check with real data) and `test/ServerStatic.spec.js`, which reports every
      Commons and Comms XML screen.
    - Fixes:
      - `userPhoto` read the signed-in user's id, so every avatar showed the viewer's photo;
      - `STRT_AVATAR_URL` pointed under `/qapps`, which answers an image request with the page shell; it is now
        `/apps` (an existing database needs the BossSetupData row loaded again);
      - the Files list showed "[object Object]" after the spreadsheet preview added a second `cellText` method.
  - Server-static (Oct 21, the user's decision):
    - A service call in `always-actions` or `pre-actions` is not a side effect when the service only reads: a get, find
      or setup verb, or the new service attribute `read-only="true"`.
    - The full check gained two checks the browser showed it missed:
      - a form-list inside a `section-iterate` (`form-list-iterate`), whose one form request has no iteration entry;
      - a condition outside the form-lists that reads a form-list's list (`form-list-key`): the browser read
        `spaceList.length` of undefined on Knowledge/Spaces.
    - 19 Commons and Comms screens are marked `server-static="qvt"` and come back clean: Commons Settings, Settings/Index
      and Settings/Preferences, Panel, QuickCreate, Files/Drives, the Contacts Import steps (Source, Mapping, Options,
      Preview and the wizard), Comms Panel, Settings, Settings/Index, Settings/Chat, Settings/OutOfOffice, and
      MailAccounts/Add with its Address and Finish steps.
    - `test/ServerStatic.spec.js` fails when a marked screen is not clean.
    - The specs' qvt renders use the screen test's new `withStaticData()`: a static template also gets the text of its
      `/actions` data and its form-lists' rows. A few assertions read the JSON, since the browser composes those labels.
    - Left as server merges: screens whose empty states, dialogs or iterations read their form-lists' lists (Contacts,
      Requests, Tasks, Notifications, Files Shares and DriveSettings, Knowledge Spaces, SpaceDetail and Review, Consent,
      TextBlocks, MailAccounts Add/Options, Identities, Duplicates), EventDetail and ResourceDetail (inline texts of
      request data on some paths), and the screens with `${…Html}` texts built in actions.
    - A browser keeps a `.qvt` template for a day (`max-age=86400`), so a screen unmarked after a visit is served from the
      stale static template until then.
  - TUI client gaps the twins found:
    - a transition download link (Files, RecordFiles, EventDetail's Export .ics) is followed as a screen;
    - a parent level's twin shows above its subscreen (the Calendar agenda above EventDetail);
    - a `.json` tui location is not expanded unless `template="fancy"`, and the lint checks only inline tui texts
      for a bare `${}`.
  - Browser findings (Oct 21, the desktop app's built-in browser):
    - a server-static `.qvue` component is cached by the browser for a day (`max-age=86400`), so an edited component
      stays stale in development;
    - the qapps page sets no `body` background, so a dark host shows through a light theme;
    - Files' details pane in a narrow window opens without the selected file.
    - Verified there: a PDF's page image through the installed Chrome, an offline chat send (waiting, then posted
      once), Schedules' seats filter at 390 px, and avatar photos per user.
- Later, as §6 lists: Calls (§14), the Assist drawer (Phase 13), office-file previews, the chat link preview's picture
  (an image proxy), PDF fonts and cmaps (a license review), and the rest of §6.
