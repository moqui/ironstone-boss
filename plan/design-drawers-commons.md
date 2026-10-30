# IronStone BOSS — Header, drawers, Commons & Comms design

Oct 18, 2026 — reviewed; mailboxes added after review (§12); terminology pass (tray panel,
contact book, `EmailClientServices`, meeting room); drives and revision storage after mr-moqui's
git and version-diff work (§9, §10, §19); implementation review against mr-moqui and Mantle, its findings
(R1–R27) and the build plan in [impl-drawers-commons.md](impl-drawers-commons.md)

The suite chrome every IronStone app runs in (the header, the Assist drawer, the tray panel
and the palette), and the two shared apps that feed it: **IronStone Commons** (contacts,
calendar and schedules, tasks and requests assigned, files, notes and knowledge, account and
preferences) and **IronStone Comms** (email, chat, calls, Chatter on every record, consent).
The audience is everyone who signs in: in a large organization every employee has Commons and
Comms beside their role apps; in a small business or a home they may be the whole system. The
design therefore borrows the patterns people already know from Gmail, Outlook, Google Calendar,
Google Drive, OneDrive, Google Contacts, Slack and Teams as much as from the open-source
references the research catalogued, and aims at the level of polish that lets someone use the
Comms Inbox as their only email client.

Three decisions shape every screen here: all screens are client-rendered and server-static;
each screen is written in XML widgets or as a `.qvue` component, decided per screen in the
**Impl** column of §3 (an email client, a chat room, a calendar grid, a files browser and a
co-editing editor are `.qvue`, the rest XML); and everything, files included, lives in Postgres
under one backup by default: a drive or a wiki space kept on disk (a `local` git repository, §9
and §10) is a choice made when it is created, and a file-system root is a deployment option.

**Scope against [design-doc-guide.md](design-doc-guide.md).** This one file is the guide's
`design-drawers-commons.md`: the suite shell, Commons and Comms together. It designs the header
and drawers in more depth than style-guide §2, because the Assist port in mr-moqui (Phase 13 of
`plans/Remaining-Work.md`) is partly driven by it, and its screen table carries the guide's
**Impl** column (`xml` or `qvue`), decided per screen.

**Inputs.** [research-drawers-commons.md](research-drawers-commons.md) (§1–§5 header and drawers,
§6–§8 Comms, §9–§13 Commons, §14 settings, §15 extension points, §16 cross-app surfaces,
§17 baseline, §18 gaps), [research-crosscut.md](research-crosscut.md) §3–§6 and §8,
[initial-design.md](initial-design.md) (its **Decided** table is fixed),
[style-guide.md](style-guide.md) §2–§8,
[ss-inventory.md](ss-inventory.md), [usl-inventory.md](usl-inventory.md), the Mantle entities in
`mr-mantle/entity/`, the framework entities in `base-component/framework/entity/`, the
Java Assist panel (`moqui/runtime/.../webroot/js/assist/`) and its tools
(`moqui/framework/.../impl/llm/tools/`), and mr-moqui's `plans/Remaining-Work.md`.

Sections: [1 suite shell](#1-the-suite-shell-header-and-drawers) · [2 app shells](#2-app-shells-commons-and-comms) ·
[3 screens](#3-screens) · [4 header and drawer screens](#4-header-and-drawer-screens) · [5 Commons Home and search](#5-commons-home-and-search) ·
[6 contacts](#6-contacts) · [7 calendar](#7-calendar-and-schedules) · [8 tasks and requests](#8-tasks-and-requests) ·
[9 files](#9-files) · [10 notes and knowledge](#10-notes-and-knowledge) · [11 Commons settings](#11-commons-settings-and-account) ·
[12 Comms Home, Inbox and email](#12-comms-home-inbox-and-email) · [13 chat](#13-chat) · [14 calls](#14-calls) ·
[15 Chatter](#15-chatter-and-activities) · [16 consent](#16-consent-and-unsubscribe) · [17 Comms settings](#17-comms-settings) ·
[18 documents and outputs](#18-documents-and-outputs) · [19 framework and data needs](#19-framework-and-data-needs) ·
[20 decided](#20-decided) · [21 open](#21-open)

---

## 1. The suite shell: header and drawers

Style-guide §2 fixes the frame: a `q-layout` with the header, the left app drawer, the canvas,
a right-aligned panel inside the canvas, a right Assist drawer and the footer. This section
decides what goes in it, who builds each piece, and how the pieces talk. Two names from
style-guide §2 are used throughout: the **Assist drawer** is a framework shell item, a right
`q-drawer`; the **tray panel** (§2.4) is a framework frame inside the canvas whose three tabs
are BOSS screens.

### 1.1 Regions and ownership

| Region | Built by | Content from | In Assist's reach |
| --- | --- | --- | --- |
| Header bar | Framework (`m-qapps-root`) | Labels, theme, app-registered providers (§1.2) | No |
| App drawer (left) | Framework | The current app's menu, pinned saved finds, Settings and Home | No |
| Canvas | Framework frame | The screen, from the app | Yes |
| Tray panel | Framework frame (open state, tab, scroll, Esc) | Three BOSS screens: `Commons/Panel/Today`, `Comms/Panel/Chat`, `Commons/Panel/Notifications`, named by theme values | Yes |
| Dialogs opened from the canvas, the quick-create dialog, the palette | Framework frame | BOSS screens (`Commons/QuickCreate`); palette results from providers | Dialogs and quick create yes; the palette no |
| Assist drawer | Framework | The Assist conversation, canvas and tasks | It is Assist |
| Live call mini-window | Framework slot (`q-page-sticky`) | Comms `Comms/Calls/LiveCall` | Read yes; its controls post, so no clicks |
| Footer | Theme | Footer items | No |

**What Assist may reach (answers the initial-design open item).** `screen_use` acts on the
canvas DOM and nothing else: the screen, dialogs opened from it, the tray panel's three tabs
when open, the quick-create dialog and the live-call window. The header bar, the app drawer,
the account menu, the palette, the theme plugins and the Assist drawer itself are outside. Two
consequences: Assist cannot open the tray panel or the palette, and does not need to, because
every tray tab is a server-static screen whose data is on `<path>/actions`, which
Assist reads through its `request` tool, and the palette's providers (§1.5) are the same catalog
Assist's `browse` tool indexes; and Assist cannot press a quick action (mark done, approve,
join), which are posts, matching the read-only rule of initial-design. The implementation is a
list of root element ids the framework exposes as `assistReach`, not a layout change.

### 1.2 The header, left to right, and who feeds each element

| Element | Behavior | Fed by |
| --- | --- | --- |
| Menu toggle, launcher, app title, breadcrumbs | As style-guide §2.2 | Framework, menu data |
| Search | Opens the palette; Ctrl+K or Cmd+K | Providers of every app (§1.5); Commons and Comms register the ones in §1.5 |
| Quick create `+` | A `q-menu` of kinds; each opens `Commons/QuickCreate?kind=…` (or Comms' composer) in a dialog, prefilled from the screen context | `<shell-providers><quick-create>` of Commons (task, event, note, contact, request, and activity when a record is in context), Comms (email, chat message, call) and any app |
| Today | Badge: tasks and activities due today plus overdue; opens the tray panel on Today | `shellCounts.today` from `mantle.party.PartyServices.get#ShellCounts` (new, §19), which the framework finds through the theme value `STRT_SHELL_COUNTS_SERVICE`, over the notification WebSocket topic `shellCounts`; the screen `Commons/Panel/Today` |
| Chat | Badge: unread rooms and mentions; presence dot; opens the tray panel on Chat | `shellCounts.chat`; the screen `Comms/Panel/Chat` |
| Mail | Badge: unread email across the user's mail accounts (§12); a link to `Comms/Inbox` (the theme value `STRT_MAIL_SCREEN`), not a panel (initial-design: "async things get a count") | `shellCounts.email` |
| Messages | Badge: unread internal messages and the mailbox posts delivered to the Inbox (§12), each counted once per user; a link to the Internal account of `Comms/Inbox` (`STRT_MESSAGES_SCREEN`). Below 600 px Mail and Messages are one button with the summed badge, linking to the mail screen | `shellCounts.messages` |
| Notifications | Badge: unread notifications of the **Notifications** inbox plus approvals waiting; the automatic **Updates** inbox (record-update feeds, system messages, job reports; chosen per topic, `NotificationTopic.inboxEnumId`) has no badge and is read in the Notifications tab and center; opens the tray panel on Notifications | `shellCounts.notifications` (`shellCounts.updates` for the Updates count shown in the tab); the screen `Commons/Panel/Notifications` |
| Documentation `?` | As today | Framework |
| Theme plugins | As today; the My Account counters widget retires | Theme data |
| Account | Avatar with presence dot; menu: name and user name, **status** (online, away, do not disturb, invisible, custom text with clear-at), Preferences (`Commons/Settings/Preferences`), Account (`Commons/Settings/Account`) (both `<account-menu-item>` providers of Commons), dark mode, the `STRT_HEADER_ACCOUNT_COMP` plugins, re-login, log out | Framework; `UserStatus` (§1.8) |
| Assist | Toggles the Assist drawer; Ctrl+Shift+A; shown once the Phase 13 port lands (§1.3) | Framework |

The theme values that name the BOSS screens for the framework frames are seeded by BOSS in
`data/BossSetupData.xml`: `STRT_TRAY_TODAY`, `STRT_TRAY_CHAT`, `STRT_TRAY_NOTIFICATIONS`,
`STRT_QUICK_CREATE`, `STRT_MAIL_SCREEN` and `STRT_MESSAGES_SCREEN` (the Mail and Messages counts' links, `Comms/Inbox` and
its Internal account), `STRT_CHATTER_SCREEN`,
`STRT_RECORD_FILES_SCREEN` (these two are how
the `chatter` and `record-files` elements of style-guide §8 find their Mantle-aware screens,
§15 and §9; each holds a subscreen name, `Chatter` or `RecordFiles`, that every BOSS app root
mounts hidden from `Shared/`, so the element loads it under the current app with that app's authz and
filters) and `STRT_SHELL_COUNTS_SERVICE` (the service the shell calls for its badge counts,
`get#ShellCounts`). BOSS seeds them on the `DEFAULT_QUASAR` theme and any other Quasar theme it
ships. A deployment without BOSS, or a user on another theme, gets no tray panel, badges, quick
create or Chatter, since each element hides when its theme value or providers are empty, and keeps
the launcher, the palette's Recent, Screens, Saved finds and Actions groups and the icons; the
framework stays Mantle-free.

### 1.3 The Assist drawer

Assist is the framework's port of the Java Assist panel into a right `q-drawer` (320–720 px,
resizable, full screen below 600 px). This design does not build it; it says what the port
must keep and what BOSS needs from it. The port is mr-moqui's Phase 13, deferred on purpose
(`plans/Remaining-Work.md`); until it lands the shell reserves the drawer's slot without a toggle,
builds the screen context (§1.6) and the reach list (§1.1) as its inputs, and the BOSS skills and
agent members below wait for it.

**Kept from the Java panel** (`js/assist/Assist.qvue`, `README_SANDBOX.txt`, the `llm/tools`):
the conversation pane with streaming turns and the conversation list (`LlmConversation`,
profile `assist`); the canvas written by `write_ui` (OpenUI Lang rendered by the vendored
OpenUI `lang-core`; `vue-sfc` in the sandboxed iframe with its one message channel; `form`
legacy) with its action buttons rendered by the page, never by generated code; "Adjust this
screen" (revise the canvas from feedback); the server tools `browse` (the screen catalog),
`request`, `run_service`, `find_basic`, `find_skill`, `pin`, `enter_sim` and the client tool
`screen_use` with its seven actions (`navigate`, `snapshot`, `fill`, `set_selection`,
`submit_find`, `click_nav`, `watch`) and its hard rule that a mutation is never submitted (a
control that posts is refused; a save stays a user click); skills from `component://*/skill/*.md`;
the A2A server (the Java framework's `plans/A2A-Server.md`) so a remote agent reaches the same loop.

**What BOSS asks of the port.**

- **Screen context as input.** Every turn carries the root's `screenContext` (§1.6): path and
  parameters, the record (entity and id), the selection, the filters, and the forms with their
  field names. `snapshot` then returns the forms by name and the record, not a DOM dump.
- **Canvas placement.** A `write_ui` canvas renders inside the drawer, which widens to its
  maximum while a canvas is shown; an "Open in page" control moves it into the canvas region
  with the current screen hidden behind a back button, as the Java panel's page slot did. On a
  phone the drawer is the page.
- **Running tasks.** A third pane lists the user's running and yielded conversations and A2A
  tasks (`A2ATask` with `A2ATaskStatus`), each with its state and a resume action; a yielded
  `write_ui` shows as "waiting for you".
- **The reach list** of §1.1, read from the root.
- **Agents in Comms.** Later, an Assist profile or an A2A remote agent can be a member of a chat
  room (§13) and answers when mentioned; the port exposes a server-side entry point that takes
  a room message as a user turn and posts the reply as the agent member.
- **BOSS skills.** Commons and Comms ship skills (`component://mr-boss/skill/*.md`) for
  the things Assist is asked most: find a message, draft a reply, summarize a thread, find a
  time for a meeting, file an email on a record, make a task from a message. A skill that
  writes yields a `write_ui` confirm; the user clicks.

### 1.4 The tray panel

One panel, 400 px at the right of the canvas from 600 px and the full width below, with three
tabs whose contents are the Panel-archetype screens of §4. The framework frame keeps the open
state, the active tab and each tab's scroll position across navigation, closes on Esc or its
close button, and loads each tab's screen by path once (the screens are server-static, so a
tab is a cached component fetching `/actions`). A tab's counts and lists refresh on the
`shellCounts` WebSocket topic and on a per-tab topic (`todayItems`, `chatRoom:<id>`,
`notifications`), with the Java client's five-minute poll kept as a fallback when the socket
is down. Every item links to its record in the canvas; nothing in the tray opens a second
panel; a quick action posts, shows its result as a notification and refreshes the tab. "Open in
Commons" / "Open in Comms" on each tab goes to the full screen.

### 1.5 The palette and quick create

**Palette.** A `q-dialog` at the top with one input and grouped results; Enter opens the first
result, Ctrl+Enter opens it in a new tab. Groups, in order: **Recent** (the last 25 screens,
shown before typing), **Records** (the search index through `mantle.search.UniversalSearchServices.search#Universal`,
grouped by document type, with the organization limit it applies), **People** (Commons:
`mantle.party.PartyServices.search#Party` over the directory and the user's contact books),
**Messages and rooms** (Comms: mail threads by subject and sender, mailboxes and chat rooms by
name), **Pages
and files** (Commons: wiki pages, files and drives by name), **Events** (upcoming events by name),
**Actions** (the `<palette-action>` providers of the apps the user may open: "Compose email",
"New event", "Create sales order", "Receive shipment"), **Screens** (by menu title), **Saved
finds** (`moqui.screen.form.FormListFind` the user may run). An id pattern goes straight to
`mantle.GeneralServices.lookup#ById`, as QuickLookup does. Prefixes narrow a search: `>` actions,
`@` people, `#` rooms, `:` screens; otherwise everything is searched (the groups the client has, Screens, Saved finds and
Actions, before the ones the server answers, so rows do not move; Commons' id pattern is
`\S*\d\S*|[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+`) and the groups are capped at
five rows each with "more" opening the owning app's list with the text as its find. The palette
retires `Base/QuickSearch`, `Base/Search` and `Base/QuickLookup`; the full search page survives
as `Commons/Search` only as the "more" target for Records. Every group but Recent, Screens,
Saved finds and Actions is a `<palette-source>` provider (§19 "Shell providers"): a service that
takes the text, a limit and the document types and returns rows of title, subtitle, icon and link.
Commons registers Records (`search#Universal` over the `<palette-type>` document types of the apps
the user may open, with per-user conditions on the task, event, request and communication event
documents, §19 "Search DataDocuments"), People, Pages and files, Events and the id lookup; Comms
registers Messages and rooms. A source that fails is logged and its group left out.

**Quick create.** The `+` menu lists the kinds registered by the apps the user may open, with
the current app's kinds first; each kind names a screen and parameters. Commons registers task,
event, note, contact and request, and activity while a record is in context (all
`Commons/QuickCreate?kind=…`, §4); Comms registers email
(the composer, §12), chat message (a people picker that opens the room in the tray panel) and
call. Prefill from the screen context: a record in context becomes the link chip (the task,
event, note or request is linked to it, §1.6); a party in context (a customer, supplier, contact
or employee screen) becomes the contact's organization or the request's customer; a product in
context is noted in the description. On a phone the menu is the same and each dialog is
maximized.

### 1.6 Screen context

The `<context>` screen element of style-guide §8 is the contract between every screen and the
shell. A screen sets `record-entity`, `record-id` and `title` for the record it shows,
`selection-form` for the list whose selected rows are the selection, and the root adds the path,
the parameters, the active find fields of the screen's lists, and the forms with their field
names. Screens are server-static, so the element's expressions are bound on the client over the
screen's actions data rather than expanded in the server render, and the root collects the active
screen's context each time its data loads. Readers and what they take:

| Reader | Takes | For |
| --- | --- | --- |
| Quick create | record, party, product | The link chip and prefills (§1.5) |
| Chatter (§15) | record | Which timeline to show; where a sent email or logged note is filed |
| Today tab | record | "Add an activity on this record" |
| Assist | everything | `snapshot`, `fill`, `watch`; the turn's context |
| Record files (§9) | record | The record's folder |
| Compose (§12) | record, party | "Also file on <record>" and the default recipient |

A record link made from the context is written to the record's own join when one exists
(`mantle.order.OrderCommunicationEvent`, `mantle.request.RequestCommEvent`,
`mantle.work.effort.WorkEffortCommEvent`, `mantle.party.communication.WikiPageCommunicationEvent`,
`mantle.request.RequestWorkEffort`, `mantle.work.effort.WikiPageWorkEffort`) and otherwise to
the generic links this design adds (`CommunicationEventRecord`, `WorkEffortRecord`, §19), which
answers research-crosscut §8's generic-link question for Chatter and activities. A party's own
link is the communication event's from and to party and its `CommunicationEventParty` rows, as
`mantle.party.CommunicationServices.find#PartyCommunicationEvents` reads them.

### 1.7 Keyboard

A suite-wide key map is a framework shell item (§19 "Keymap registry"): the shell registers the
global keys, each screen registers its scope when it mounts, the `?` key opens an overlay
listing the keys active now, and `Commons/Settings/Preferences` lets the user change any binding
(stored as the `KEYMAP` user preference). Global keys: Ctrl+K palette, Ctrl+Shift+A Assist,
Esc closes the top-most dialog, menu or drawer, `?` help, `g` then a letter for the go-to set
(`g i` Inbox, `g c` Contacts, `g k` Tasks, `g l` Calendar, `g f` Files, `g n` Notes, `g h` the
app's Home; Gmail's chords where it has them, so the Inbox scope's `g t` Sent, `g s`, `g d` and
`g a` shadow nothing global) and `c` compose or create in the current app. An app's `<keymap>` scope other than
`global` is on only while that app is the current one. A screen's scope
wins over the global set while it has focus, and a text input swallows single letters. Inside a
rich-text editor (Compose, the
Knowledge and Notes editor) Ctrl+K inserts a link, as Gmail and Google Docs do, and the palette
is the header Search button; the chat composer keeps Ctrl+K for the palette, as Slack does. The
Inbox (§12) and Chat (§13) carry the full
sets people expect from Gmail and Slack, with the gaps closed (moving focus between panes,
ranged selection, jump to a folder or label by typing its name, "archive and open next" as a
preference).

### 1.8 Presence and status

A `UserStatus` record (new, framework, §19): online, away, do not disturb, invisible, or a custom
text with an emoji and a clear-at time, plus an automatic "in a call" and auto-away after the
idle minutes in Comms settings. It is set from the account menu, published on the WebSocket topic
`userStatus`, and shown as a dot on every avatar the suite draws (chat, Chatter authors, contact
rows, attendee lists). Do not disturb silences toasts and chat sounds; the notifications are
still recorded and the badges still count.

## 2. App shells: Commons and Comms

Both roots are mounted under the apps root by `MoquiConf.xml` and authorized for `ALL_USERS`:
everyone who signs in has them; a deployment narrows that with its own authz. They replace the
current `boss.xml` root and the `Base/User` copies of My Account (design-doc-guide §10). Each
root's `always-actions` set `appRoot` and call `mantle.party.PartyServices.setup#UserOrganizationInfo`
as `boss.xml` does today.

### 2.1 Commons

Root `screen/Commons.xml`, menu title "IronStone Commons", icon `sym_o_hub`, default item
`Home`. Menu to depth two (the panel screens, `QuickCreate`, `Search` and the detail screens
have `menu-include="false"`):

- Home — `Commons/Home`
- Contacts — `Commons/Contacts`
  - Import — `Commons/Contacts/Import`
  - Duplicates — `Commons/Contacts/Duplicates`
- Calendar — `Commons/Calendar`
  - Rooms and equipment — `Commons/Calendar/Schedules`
- Tasks — `Commons/Tasks`
- Requests — `Commons/Requests`
- Files — `Commons/Files`
  - Drives — `Commons/Files/Drives`
  - Shares — `Commons/Files/Shares`
- Knowledge — `Commons/Knowledge`
  - Spaces — `Commons/Knowledge/Spaces`
  - Review — `Commons/Knowledge/Review`
- Notes — `Commons/Notes`
- Notifications — `Commons/Notifications`
- Settings — `Commons/Settings` (Account, Preferences, Notifications, Contact books, Calendars, Sync)

Landing (`Commons/Home`, §5): the Today strip, five counters, my work lists (tasks this week,
requests assigned, upcoming events), recent pages and files, shortcuts, and a first-run setup
card.

### 2.2 Comms

Root `screen/Comms.xml`, menu title "IronStone Comms", icon `sym_o_forum`, default item `Inbox`
(the landing `Home` is in the menu but a mail app opens on its inbox). Menu:

- Home — `Comms/Home`
- Inbox — `Comms/Inbox` (mail accounts, and the Internal account with its mailboxes)
- Chat — `Comms/Chat`
- Calls — `Comms/Calls`
- Consent — `Comms/Consent` (marketing and admin roles)
- Settings — `Comms/Settings` (Mail accounts, Identities and signatures, Rules, Out of office, Text blocks, Chat, Calls)

Landing (`Comms/Home`, §12): unread by account, flagged and snoozed due, mentions, missed calls,
outbox failures, needs-reply and follow-ups-due lists, mailboxes and rooms with unread,
upcoming meetings with Join, shortcuts.
Mail domains, relay, DKIM, the gateway's trusted addresses, the SMTP listener and the other
protocol servers are Admin's screens (research-crosscut §4), read-only links from Comms
settings.

## 3. Screens

One row per screen, grouped by area. **Impl** is `xml` (XML screen and form widgets) or `qvue`
(a Vue component file served as a screen, style-guide §4.8). **Scope**: `parity` replaces a My
Account, Party, Wiki or search screen; `new` is in the first BOSS release without a baseline;
`later` is designed and built after it.

### Header and drawers

| Screen | Path | Archetype | Impl | Purpose | Main record | Reused | Roles | Scope | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TodayPanel | `Commons/Panel/Today` | panel | xml | Overdue, due today and later today across tasks, activities, events, approvals and app sources, with quick actions | `WorkEffort` | own | app | new | none |
| ChatPanel | `Comms/Panel/Chat` | panel | qvue | Rooms and direct messages with unread counts; a room opens in the panel | `ChatRoom` (new) | own; shares the room component of Chat | app | new | `ChatRoom roomId` |
| NotificationsPanel | `Commons/Panel/Notifications` | panel | xml | Unread and recent notifications by reason and app; approvals waiting with Approve and Refuse inline | `NotificationMessage` | own | app | new | none |
| QuickCreate | `Commons/QuickCreate` | dialog | xml | The quick-create forms for task, activity, event, note, contact and request, prefilled from the screen context | `WorkEffort`, `Party`, `Request`, `WikiPage` | own | app | new | none |
| Notifications | `Commons/Notifications` | list | xml | The notification center: filters by reason, app, read state and date; the approvals inbox; mark read | `NotificationMessage` | Approvals waiting, crosscut §3.15, designed here | app | parity | list find parameters |
| LiveCall | `Comms/Calls/LiveCall` | panel | qvue | The call mini-window shown on any screen during a call | `CallSession` (new) | own | app | later | `CallSession callSessionId` |

### IronStone Commons

| Screen | Path | Archetype | Impl | Purpose | Main record | Reused | Roles | Scope | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Home | `Commons/Home` | landing | xml | Today, counters, my work, recent pages and files, shortcuts, first-run setup | — | own | app | new | none |
| Search | `Commons/Search` | list | xml | The full record search, the palette's "more" target for Records, with document-type filters | `mantle.search.UniversalSearchServices.search#Universal` | own | app | parity | list find parameters |
| Contacts | `Commons/Contacts` | split | xml | The directory and the user's contact books: a side list with search, scopes and groups; the contact record in the main pane | `Party` | side own; main pane is Contact / party record, crosscut §3.1 | app | parity | `Party partyId`; `Party rows` |
| ContactDetail | `Commons/Contacts/ContactDetail` | detail | xml | The contact record | `Party` | Contact / party record, crosscut §3.1 | app | parity | `Party partyId` |
| ContactImport | `Commons/Contacts/Import` | wizard | xml | vCard and CSV import with mapping, duplicate policy, preview and result | `Party` | own | app | new | none |
| Duplicates | `Commons/Contacts/Duplicates` | list | xml | Candidate duplicates with compare and merge | `Party` | own | contact admins | parity | `Party rows` |
| Calendar | `Commons/Calendar` | calendar | qvue | Day, work week, week, month and agenda over my, shared and subscribed calendars; quick create; drag to move | `WorkEffort` (`WetEvent`) | Calendar & schedules, crosscut §3.13, designed here | app | parity | `WorkEffort workEffortId`; filters: calendars, range |
| EventDetail | `Commons/Calendar/EventDetail` | detail | xml | One event: when, repeat, reminders, where, meeting rooms and equipment, attendees and RSVP, details, attachments, Chatter | `WorkEffort` | own; Events, included by Marketing | app | parity | `WorkEffort workEffortId` |
| Schedules | `Commons/Calendar/Schedules` | calendar | qvue | Meeting room and equipment schedules by resource with a Book action | `WorkEffort`, `Facility`, `Asset` | Calendar & schedules, crosscut §3.13, designed here; Maintenance includes it with scheduling admin | app | new | `Facility facilityId` or `Asset assetId`; range |
| ResourceDetail | `Commons/Calendar/Schedules/ResourceDetail` | detail | xml | A bookable meeting room or piece of equipment as a user sees it: what and where it is, its schedule, Book | `Facility`, `Asset` | Facility & equipment record, crosscut §3.10 | app | new | `Facility facilityId` or `Asset assetId` |
| Tasks | `Commons/Tasks` | list | xml | My tasks in smart lists with list, board and calendar views and a quick-add row | `WorkEffort` (`WetTask`) | own | app | parity | `WorkEffort rows`; list find parameters |
| TaskDetail | `Commons/Tasks/TaskDetail` | detail | xml | The task | `WorkEffort` | Task / work item, crosscut §3.12 | app | parity | `WorkEffort workEffortId` |
| Requests | `Commons/Requests` | list | xml | Requests I raised, am assigned to or watch | `Request` | own | app | parity | list find parameters |
| RequestDetail | `Commons/Requests/RequestDetail` | detail | xml | The request | `Request` | Request / case, crosscut §3.11 | app | parity | `Request requestId` |
| Files | `Commons/Files` | split | qvue | Drives (My files, folder drives, version-controlled drives, mirrors) with their folders, recent, favorites, shared with me, records and trash; detail sidebar with sharing, versions and compare, comments and activity; upload and preview | `ResourceDrive` (new) and its files by location (`dbresource://` or `git://`) | own | app | new | `ResourceDrive driveId`; the selected files by path; filters: path, type, tag |
| Drives | `Commons/Files/Drives` | list | xml | The drives I belong to: create a folder or version-controlled drive, members, storage, quota, export, archive; mirrors of a git URL for admins | `ResourceDrive` (new) | own | app; mirrors: admins | new | `ResourceDrive driveId` |
| Shares | `Commons/Files/Shares` | list | xml | Outgoing shares and links with expiry and revoke; incoming shares to accept | `ResourceShare` (new) | own | app | new | list find parameters |
| PublicShare | `Commons/Files/Public` (served at `/s/<token>`) | split | qvue | The anonymous page of a shared file or folder: view, download, file drop | `ResourceShare` and the shared file or folder | own | anonymous by token | new | none |
| Knowledge | `Commons/Knowledge` | editor | qvue | Spaces, page tree and the page: read, co-edit, history and compare, comments, review and publish, links to records | `WikiPage` | own; Knowledge base articles, included by Customer Service | app | parity | `WikiPage wikiPageId` |
| Spaces | `Commons/Knowledge/Spaces` | list | xml | Wiki spaces: create (on database files or version-controlled), clone, members, visibility, public URL, export | `WikiSpace` | own | space admins | parity | `WikiSpace wikiSpaceId` |
| Review | `Commons/Knowledge/Review` | list | xml | Pages with a version awaiting review | `WikiPageReview` (new) | own | reviewers | new | list find parameters |
| Notes | `Commons/Notes` | editor | qvue | Personal notes: the same editor over the user's private space, a flat list, tags and pins | `WikiPage` | own | app | new | `WikiPage wikiPageId` |
| Settings | `Commons/Settings` | settings | xml | The settings index | — | own | app | new | none |
| Account | `Commons/Settings/Account` | settings | xml | Name, user name, email, contact info, password, two-factor, locale, time zone | `UserAccount` | own | app | parity | none |
| Preferences | `Commons/Settings/Preferences` | settings | xml | Appearance and density, start app, key map, mail and calendar defaults | `UserPreference` | own | app | new | none |
| NotificationSettings | `Commons/Settings/Notifications` | settings | xml | Per-topic in-app, email and digest subscriptions | `NotificationTopicUser` | own | app | parity | none |
| ContactBooks | `Commons/Settings/ContactBooks` | settings | xml | Contact books and groups, sharing, CardDAV addresses | `ContactBook` (new) | own | app | new | none |
| Calendars | `Commons/Settings/Calendars` | settings | xml | My calendars, colors, sharing, external subscriptions, publish links, working hours | `Calendar` (new) | own | app | new | none |
| Sync | `Commons/Settings/Sync` | settings | xml | Device setup for CalDAV, CardDAV, WebDAV and SFTP with app passwords (built Oct 21, 2026) | `UserAppPassword` (new) | own | app | new | none |

### IronStone Comms

| Screen | Path | Archetype | Impl | Purpose | Main record | Reused | Roles | Scope | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Home | `Comms/Home` | landing | xml | Unread by account, flagged and snoozed, mentions, missed calls, outbox failures; needs-reply and follow-ups; meetings with Join | — | own | app | new | none |
| Inbox | `Comms/Inbox` | split | qvue | Unified and per-account mail with folders and labels, thread list and reading pane, search, keyboard first; internal messages as the Internal account, with its mailboxes (shared lists and forums) | `EmailMessage`, `CommunicationEvent` | own | app | parity | `EmailMessage emailMessageId`; `CommunicationEvent communicationEventId`; `ContactList contactListId` (a mailbox); `EmailMessage rows`; filters: account, folder, mailbox, search |
| Compose | `Comms/Inbox/Compose` | editor | qvue | The composer as a dock, a dialog or a page: identities, recipients, rich text, attachments from Files, text blocks, schedule send, undo send | `EmailMessage` (draft) | own; email sending included by Marketing and Customer Service | app | parity | `EmailMessage emailMessageId` |
| MessageDetail | `Comms/Inbox/MessageDetail` | detail | xml | One message by id for deep links, Chatter, print and audit: headers, body, attachments, record links, delivery status, resend | `EmailMessage` | own | app | parity | `EmailMessage emailMessageId` |
| Chat | `Comms/Chat` | split | qvue | Rooms and direct messages; the room view with threads, mentions, reactions, attachments, record cards and message actions; room settings | `ChatRoom` | own | app | new | `ChatRoom roomId` |
| Calls | `Comms/Calls` | list | xml | Call history, call links and upcoming meetings with Join | `CallSession` | own | app | later | list find parameters |
| Call | `Comms/Calls/Call` (guests at `/call/<token>`) | task | qvue | The lobby and the call view; guest join by link | `CallSession` | own | app; guests by link | later | `CallSession callSessionId` |
| Consent | `Comms/Consent` | list | xml | Contacts' consent and list subscriptions with history; per-contact edit; export | `PartyConsent` (new), `ContactListParty` | own; included by Marketing | marketing, admins | new | `Party rows` |
| Unsubscribe | `Comms/Unsubscribe` (served at `/u/<token>`) | task | xml | The public unsubscribe and preferences page from a list email, with one-click support | `ContactListParty` | own | anonymous by token | new | none |
| Settings | `Comms/Settings` | settings | xml | The settings index | — | own | app | new | none |
| MailAccounts | `Comms/Settings/MailAccounts` | settings | xml | Accounts with status and last sync; the add-account wizard; folders, sync window, members of a shared account | `EmailAccount` (new) | own | app | new | `EmailAccount emailAccountId` |
| Identities | `Comms/Settings/Identities` | settings | xml | Identities and signatures per account, reply-to, defaults | `EmailIdentity` (new) | own | app | new | none |
| Rules | `Comms/Settings/Rules` | settings | xml | Server-side mail rules: ordered, conditions and actions, run on existing mail | `EmailRule` (new) | own | app | new | none |
| OutOfOffice | `Comms/Settings/OutOfOffice` | settings | xml | Automatic replies per account with a date range and internal and external texts | `EmailOutOfOffice` (new) | own | app | new | none |
| TextBlocks | `Comms/Settings/TextBlocks` | settings | xml | Personal and shared canned text with shortcuts | `EmailTextBlock` (new) | own | app | new | none |
| ChatSettings | `Comms/Settings/Chat` | settings | xml | Notification level defaults, sounds, Enter to send, previews, auto-away | `UserPreference` | own | app | new | none |
| CallSettings | `Comms/Settings/Calls` | settings | xml | Devices, ringtone, join defaults | `UserPreference` and browser storage | own | app | later | none |

### Shared (lent to every app)

| Screen | Path | Archetype | Impl | Purpose | Main record | Reused | Roles | Scope | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Chatter | `Shared/Chatter` (mounted hidden as `<App>/Chatter` in every app root) | panel | qvue | The timeline beside every record: messages and notes, scheduled activities, attachments, followers, changes; send email, log a note, schedule an activity from the record | `CommunicationEvent`, `WorkEffort` | Chatter & activities, crosscut §3.14, designed here | app | parity | inherits the host record |
| RecordFiles | `Shared/RecordFiles` (mounted hidden as `<App>/RecordFiles` in every app root) | panel | qvue | The Files component scoped to a record: list, upload, preview, share, link an existing file | `DbResource` and the record's `*Content` | Files on records, designed here | app | parity | inherits the host record |

Dropped from the research's candidate inventory, with the reason in §20: a separate Outbox
screen (a folder view of the Inbox), a separate Events area (the event record is `EventDetail`
under Calendar), a Comms-side Chatter screen (one component, `Shared/Chatter`), and time
entries, scheduled finds and expenses from My Account (they move to Projects, Insights and
People).

## 4. Header and drawer screens

### TodayPanel

- **Layout:** panel. A header line with the day ("Tuesday, Oct 20") and "3 approvals waiting"
  linking to the Notifications tab; captions **Overdue** (warning), **Due today**, **Later
  today**, then one caption per app source ("From Sales: 2 quotes to send"). The quick-add line
  sits under Due today. The gallery's `Gallery/Panel.xml` is the rendered reference.
- **Sections:** each item is a dense row: an icon by kind (task, call, email, to-do, meeting,
  event, approval), the title, the time or "overdue since Mon", the record it is on as a caption
  (`Order SO10023 · Acme Co.`), and two flat quick actions.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `TodayItems` | list | The items of the day, grouped | kind, title, due time, record, assignee when not me | `q-list dense` by `render-mode`; flat icon buttons per row | `mantle.work.WorkEffortServices.get#UserTodayItems` (new, §19) over `WorkEffortAndParty` and the `<today-source>` providers | SimpleScreens `MyAccount/User/Task/MyTasks` `MyTasks`; Odoo activity menu (overdue, today, planned by model); Nextcloud Tasks and Deck dashboard widgets |
| `QuickAdd` | single | Add a task due today in one line | name; due (default today); the context link chip | `focus-field` on name; Enter submits | `mantle.work.TaskServices.create#SimpleTask` with `assignToPartyId` me | Nextcloud Tasks inline create; Microsoft To Do "My Day" |

- **Actions:** Mark done (`mantle.work.TaskServices.update#Task` to `WeComplete`; for an event
  "Done" is hidden), Snooze to tomorrow 09:00 in the user's time zone (hides the item from my
  Today only: the new `snoozedThruDate` on my `WorkEffortParty` row, `entity`; the due date and
  everyone else's view stay as they are), Reschedule (a date picker that changes the due date,
  `update#Task` `estimatedCompletionDate`, shown only when I may update the task), Join (an event
  with a call link opens `Comms/Calls/Call`), Open (the record in the canvas). Approvals link to
  the Notifications tab. "Add activity on this record" appears when the screen context has a
  record and opens `QuickCreate?kind=activity`.
- **States:** "Nothing due today" with the quick-add line; an app source that fails is logged
  and shown as "Sales items unavailable", the rest renders (failure tolerance).
- **Devices:** phone.
- **Source:** research §4, §5 (Odoo activity menu), initial-design "Today"; replaces the four
  counts of `ssstatic/lib/MyAccountNav.qvue`.
- **Needs:** Tray panel frame; Shell providers (`today-source`); Today and timeline services
  (`get#UserTodayItems`); Per-user snooze; `shellCounts` topic and `get#ShellCounts`; Screen
  context.

### ChatPanel

- **Layout:** panel as `.qvue`; one pane with two modes, as Signal Desktop's left pane: the room
  list, and a room opened in place with a back arrow and "Open in Comms". The room view is the
  same component as `Comms/Chat` (§13) at 400 px: timeline, composer, no right sidebar.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `RoomList` | list | Rooms and direct messages, unread and mentions first | avatar with presence, name, last message snippet, time, unread badge | `q-virtual-scroll` | `org.moqui.impl.ChatServices.find#Rooms` (new) | Nextcloud Talk LeftSidebar; Odoo messaging menu; Slack sidebar |
| `RoomView` | component | The room component of §13 | as §13 | as §13 | as §13 | §13 `Timeline` and `Composer` |
| `NewMessage` | single | Start a direct message or find a room | people or room picker with server search | `drop-down` `server-search` over `search#Party` and rooms | `ChatServices.create#Room` (new, direct type) | Talk NewConversationDialog |

- **Actions:** open room, new message, start call (opens `Comms/Calls/Call` for the room, later),
  mark all read.
- **Devices:** phone.
- **Source:** research §6 (Nextcloud Talk, Signal Desktop, Odoo Discuss chat hub); style-guide §2.4.
- **Needs:** Chat store; Chat services; Presence and status; Tray panel frame.

### NotificationsPanel

- **Layout:** panel. A two-way toggle at the top, **Notifications** and **Updates** (the automatic inbox, with its
  unread count), then filter chips (reason: mention, assignment, approval, date alert, reminder,
  comment, system; app) above three captions: **Approvals waiting** (Notifications only), **Unread**, **Earlier**
  (the last seven days read). "Mark all read" (of the inbox shown) and "Notification settings" at the top right.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `NotificationList` | list | Unread first, then recent | title, actor, record, app, reason, time | `q-list dense`; unread dot; the reason as an icon | `moqui.security.user.NotificationMessageUser` for the user (`entity`); mark viewed sets `viewedDate` | SimpleScreens `MyAccount/User/Notifications` `NotificationList`; OpenProject notification center; Odoo messaging menu |
| `Approvals` | list | Everything waiting on me, with the two decisions inline | what, who asked, amount or summary, waiting since | Approve and Refuse as flat buttons with `confirmation` on Refuse | the topic's `approveServiceName` / `refuseServiceName` (new fields on `NotificationTopic`, §19) with the message's record fields | Ever Gauzy approval requests; OpenProject reasons |

- **Actions:** open (marks viewed), mark read, approve, refuse (asks for a reason when the
  topic requires it), "Open in Commons" to `Commons/Notifications`.
- **States:** "You are caught up" when nothing is unread; a notification whose record is gone
  opens the list screen with a notification (style-guide §6).
- **Devices:** phone.
- **Source:** research §5 (OpenProject center, Odoo systray, Ever Gauzy approvals); initial-design
  rule "mentions, assignments, approvals waiting".
- **Needs:** Notification fields and approvals (the `NotificationMessage` reason, record and
  actor fields; the `NotificationTopic` approve and refuse services); Shell providers
  (`notification-topic`); Shell and notification topics (the `notifications` WebSocket topic the
  framework already sends).

### QuickCreate

- **Layout:** dialog (maximized on a phone) with one form chosen by `kind`; the context link
  shown as a chip above the fields ("Linked to Order SO10023 · remove"); six or fewer fields;
  a "More options" text link opens the full record screen with the values carried over. The
  `activity` kind is offered only while the screen context has a record, since an activity is
  always on one.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `QuickTask` | dialog | A task for me or someone | name, due date, assignee (default me), priority, link chip | `focus-field` name | `mantle.work.TaskServices.create#SimpleTask`; the link through the record's join or `WorkEffortRecord` | `MyTasks` `NewTaskForm`; Nextcloud TaskCreateDialog |
| `QuickActivity` | dialog | A scheduled next action on the record in context (Chatter's activity) | type (call, email, to-do, meeting), summary, due (start and end for a meeting), assignee | type as a `q-btn-toggle` by `render-mode` | `create#SimpleTask` with `purposeEnumId` `WepPhoneCall`, `WepEmail` or `WepToDo`; a meeting is `mantle.work.EventServices.create#Event` with `purposeEnumId` `WepMeeting`, a `WetEvent` on the calendar, as Odoo's meeting activity opens the calendar | Odoo schedule activity |
| `QuickEvent` | dialog | An event | name, start, end or duration, all day, calendar, attendees, meeting room, link chip | `date-time` pair; attendees `drop-down` `allow-multiple` `server-search` | `mantle.work.EventServices.create#Event`; `mantle.work.WorkEffortServices.add#WorkEffortParty` | `MyCalendar` `NewEventForm`; Nextcloud NewEventDialog; Zimbra ApptQuickAdd |
| `QuickNote` | dialog | With a record in context, a note on its Chatter; without one, a personal note | title, text (markdown) | `text-area editor-type="md"` | with a record: `mantle.party.CommunicationServices.create#Message` with `communicationEventTypeId` `Comment` and the record link; without: `org.moqui.impl.WikiServices.update#WikiPage` in the user's notes space, made on first use by `org.moqui.impl.WikiServices.ensure#UserNotesSpace` (new, §19) | Odoo "Log note"; Google Keep quick capture |
| `QuickContact` | dialog | A person or an organization | type, name, email, phone, organization (default from context), contact book | type toggle; organization `server-search` | `mantle.party.PartyServices.create#Person` or `create#Organization`; `mantle.party.ContactServices.create#EmailAddress`, `create#TelecomNumber`; `PartyRelationship` `PrtContact` to the organization; `ContactBookParty` (new) | `FindParty` `CreatePersonForm`, `CreateOrganizationForm`, `CreateContactForm`; Zimbra ContactQuickAddDialog |
| `QuickRequest` | dialog | A request | name, type (`RqtSupport`, `RqtInformation`, `RqtPurchase`, …), priority, customer from context, description | | `mantle.request.RequestServices.create#Request`; the link through `RequestWorkEffort` or the generic link | `MyRequests` `NewRequestForm` |

- **Actions:** Create (one primary) and Cancel; after Create a notification with "Open" links to
  the record; the dialog closes and the host screen's Chatter reloads.
- **Source:** research §3 (Zimbra op registry, Nextcloud create-from-context); style-guide §2.4.
- **Needs:** Shell providers (`quick-create`); Quick create frame; Screen context; Generic
  record links.

### Notifications

- **Layout:** list; OpenProject's notification center shape: a left rail with the two inboxes, **Notifications** and
  the automatic **Updates** (record-update feeds, system messages, job reports), each with its unread count, then the
  chips of reasons and apps with counts, the list, and a reading pane opening the record beside it from 1440 px.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `NotificationFind` | find | Narrow the list | reason, app, read state, date period, text | `date-period` | | OpenProject by-reason and by-project filters |
| `Approvals` | list | The approvals inbox, always first | what, requester, amount or summary, waiting since, policy | Approve and Refuse inline; bulk approve with `multi` | topic approve and refuse services | Ever Gauzy approvals; People, Purchasing, Sales and Accounting keep their own lists |
| `Notifications` | list | Everything else | title, actor, record, app, reason, received, viewed | unread rows `text-weight-medium`; bulk mark read | `entity` on `NotificationMessageUser` | `Notifications` `NotificationList` |

- **Actions:** open, mark read, mark all read, approve, refuse, "Notification settings".
- **Source:** research §5 and §18 open question (one center that also serves as the approvals
  inbox); baseline `Notifications.xml`.
- **Needs:** as NotificationsPanel.

**Per-app context (Approvals waiting).**

| App | Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- | --- |
| Commons | the tray panel's Approvals group and the center's `Approvals` list | the topics with approve and refuse services that are addressed to me | approve, refuse, bulk approve, open | everything waiting on me |
| People, Projects, Purchasing, Sales, Accounting | their own approval lists over their records (design-<app>); whether they include the `Approvals` form filtered to their topics is decided in design-crosscut §3.15 | the app's topics | as the app's list | the app's policy |

**Oct 27 core-design extension (proposed).**
[design-crosscut §3.15](design-crosscut.md#315-approvals-waiting) decides that Purchasing and
Accounting include this same approval-provider/form contract with their topic filters, alongside
their domain worklists. Customer Service exception approvals use it where policy requires one.
Both the tray and app surface call the same revision-bound source action; a notification is not
another document state machine. The six core designs reuse the existing shell, context, Chatter,
files, record links and calendar services instead of reopening their implementation.

Oct 28, 2026: the NotificationTopic seed gains the purchase approval topics
`PurchaseRequestApproval`, `PurchaseAwardApproval` and `PurchaseOrderApproval`, approved and
refused by `ironstone.purchasing.ApprovalServices.approve#PurchaseSource` and `refuse#PurchaseSource`,
and the other core apps' approval topics that crosscut §3.15 lists
([design-crosscut §3.15](design-crosscut.md#315-approvals-waiting), D8).

### LiveCall

- **Layout:** panel as `.qvue` in the framework's `q-page-sticky` slot, 320 × 180, draggable;
  the active speaker or shared screen, call time, mute, camera, leave; a click returns to
  `Comms/Calls/Call`. Rendered only while a `CallSession` of the user is live.
- **Source:** research §7 (Talk FloatingCallOverlay, Signal CallingPip); Teams and Meet
  picture-in-picture.
- **Needs:** WebRTC; Call store and services.

## 5. Commons Home and search

### Home

- **Layout:** landing. A greeting line, the Today strip (the same `TodayItems` data as the
  panel, horizontal on desktop), a row of five counters, two columns of lists, a shortcuts and
  recents column. A first-run card ("Set up: add a mail account · import contacts · connect a
  calendar · install on your phone") shows until each item is done or dismissed, which is what a
  small business or a household sees first.
- **Sections and tabs:**
  - Counters: Due today, Overdue, Events today, Unread notifications, Requests assigned; each a
    `number-card` linking to the filtered list.
  - My work: Tasks this week (`Commons/Tasks` smart list), Requests assigned, Upcoming events
    (7 days, with Join).
  - Recents: Recent pages (five), Recent files (five, with preview on hover), Shared with me
    (7 days).
  - Shortcuts: New task, New event, New note, New contact, Upload a file, Compose email.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `TodayStrip` | list | Today's items in a row | as `TodayItems` | `skip-header`, `paginate="false"` | `get#UserTodayItems` | §4 TodayPanel |
| `TasksThisWeek` | list | Open tasks due within 7 days | name, due, priority, record | `skip-header` | `WorkEffortAndParty` (`entity`) | `MyTasks` `MyTasks` |
| `RequestsAssigned` | list | Open requests where I am assigned | id, name, status chip, priority, customer | | `Request` with `RequestParty` (`entity`) | `MyRequests` `ListRequests` |
| `UpcomingEvents` | list | Events of the next 7 days | when, name, where, Join | | `mantle.work.EventServices.get#FullCalendarData` with `partyId` me | `MyCalendar` |
| `RecentPages`, `RecentFiles`, `SharedWithMe` | list | Recents | name, space or folder, modified, by | | `WikiPage` with `WikiPageHistory` (`entity`); `org.moqui.impl.FileServices.find#Recent` (new) | Nextcloud dashboard widgets; Google Drive Recent |
| `SetupCard` | single | First-run checklist | the four setup items with Done or Dismiss | | `UserPreference` `COMMONS_SETUP` (`org.moqui.impl.UserServices.set#Preference`) | Nextcloud first-run; Outlook setup |

- **Source:** research §4 (Nextcloud dashboard, OpenProject and Redmine My page); style-guide §3.1.
- **Needs:** `number-card`; Today and timeline services (`get#UserTodayItems`); File services.

### Search

- **Layout:** list. The palette (§1.5) is where people search; this page exists only as the
  target of the palette's "more" for the Records group, with the typed text as its find, and for
  a deep link to a search. Results are grouped by document type with the counts as chips.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `SearchFind` | find | The query | text, document type | document types as chips with counts | | `Base/Search` `SearchOptions` |
| `SearchResults` | list | The hits | type, title, the matched snippet, the link to the record under its app | | `mantle.search.UniversalSearchServices.search#Universal` with the organization limit it applies | `Base/Search` `SearchResults` |

- **Source:** research §2 and §17 (BOSS search and lookup); replaces `Base/Search`.
- **Needs:** Search DataDocuments; Palette.

## 6. Contacts

The Commons contact area is the contact-book shape of Google Contacts and Nextcloud Contacts over
the Mantle party model: every contact is a `Party` (`Person` or `Organization`); the
**Directory** is the parties that hold a business role (customer, supplier, employee, contact,
account) and is what every other app shows; a **contact book** (`ContactBook`, new, §19) is a
named collection a user owns or an organization shares, whose members are parties, with
**groups** (labels) inside it; a **personal contact** is a party that belongs only to a
personal book and holds no role, hidden from the directory and from the duplicate scan unless
its owner links it to a directory party. Each book is served as a CardDAV address book, the
protocol's name for it (§11 Sync).

Hidden has to hold everywhere, not just in Contacts: other apps find parties through
`find#Party`, `search#Party`, `lookup#ById`, party drop-downs and the MantleParty search
document. A personal contact therefore carries its owner on the party itself, the new
`Party.privateOwnerUserId` (§19 "Personal contact visibility"; `ownerPartyId` stays the owning
organization the org filters use), and a party passes only when that field is empty or is the
current user. mr-moqui applies entity filters only from the authorization that admitted the screen
or service, and not where authorization is disabled or the search index answers, so the condition
goes in two places: a second entity filter on `mantle.party.Party` in the `MANTLE_USER_ORG` and
`MANTLE_ACTIVE_ORG` filter sets of `MantleSetupData.xml`, so it holds wherever the organization
filter does (every BOSS app's authz carries one), and an explicit condition in `find#Party`,
`search#Party` (an indexed field of the MantleParty document and a term of its query),
`lookup#ById`, the duplicate services and the party drop-down transitions. "Link to a directory
party" clears it.

### Contacts

- **Layout:** split (`container-split`, side 320 px; stacked below 1024 px). Side: a search line
  (name, email, phone, organization), a scope selector (Directory · My contacts · each contact
  book · Recently contacted · Not in a group), group chips, an alphabet jump, the rows. Main:
  `ContactDetail`. The URL holds `partyId`; the side list keeps its scroll and selection.
- **Sections and tabs:** the side list only; the main pane is the reused record.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `ContactFind` | find | Narrow the side list | text, scope (directory, book), group, role, has email, has phone, organization | scope as a `drop-down` with the user's books | | `FindParty` `OuterSearchForm`; Nextcloud RootNavigation groups |
| `ContactRows` | list | The rows | avatar, name, organization and title, primary email, primary phone, presence for users | `q-virtual-scroll` rows by `render-mode`; `row-selection` with bulk actions | `mantle.party.PartyServices.find#Party` (directory), `ContactBookParty` join (books), `search#Party` for the text | `FindParty` `PartyListForm`; Nextcloud ContactsList; Zimbra ContactSplitView; Google Contacts |
| `BatchActions` | list, bulk | Act on selected contacts | add to group, add to book, remove from book, export vCard, export CSV, merge (exactly two), delete (contact admins) | | `mantle.party.ContactBookServices.add#ContactBookParties` (new); `mantle.party.ContactImportServices.export#Contacts` (new); `mantle.party.DuplicateServices.merge#Parties` | Nextcloud Batch and Merging; Google Contacts labels and merge |

- **Actions:** New contact (opens `QuickCreate?kind=contact`, then the record), Import, Find
  duplicates; row: open, email (Compose with the primary email), call (Call), chat (direct
  room), star (favorite group).
- **Navigation:** from the launcher, the palette's People group, Chatter author links, the
  Compose contact hover card ("Open contact"), the 360s' Contacts tab (which opens the same
  record under their own app path).
- **Views:** list; org chart (`later`, a `.qvue` over `PartyRelationship` `PrtManager` and
  `PrtOrgRollup`).
- **States:** "No contacts yet · Import or add one" on an empty personal book; a directory
  party the user may not view is absent, not greyed.
- **Devices:** phone (stacked; a row opens the record full screen with a back button).
- **Source:** research §10 (Nextcloud Contacts, Zimbra address book), §17 Party screens,
  §18 "Contacts are admin-shaped"; Google Contacts and Outlook People.
- **Needs:** `container-split`; Contact books; Personal contact visibility; Presence and status.

### ContactDetail (Context passed)

The Contact / party record is designed in `design-crosscut.md` §3.1; Commons' row of its
per-app table:

| App | Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- | --- |
| Commons | Overview (names, contact info with purposes `EmailPrimary`, `PhoneMobile`, …, addresses, organization and title, relationships, books and groups, notes; for an employee a read-only directory card with position, department, manager, location and working hours, the Employee 360 itself staying People's), Activity (Chatter), Calendar (shared events with this party), Tasks, Requests, Files, Consent (read, with "Edit in Comms Consent") | none; a personal contact shows a "Private · in <book>" banner | edit in place, email, call, chat, new event, new task, add to group or book, star, merge with…, export vCard, print, "Link to a directory party" for a personal contact, delete (owner of a personal contact; contact admins for the directory) | contact info, relationships, communication history |

Services the Commons version calls beyond the crosscut's: `mantle.party.ContactServices.get#PartyContactInfo`,
`store#PartyContactInfo`, `store#PartyContactMech`, `delete#PartyContactMech`,
`mantle.party.PartyServices.update#PartyDetail`, `create#PartyContent` (the avatar, `PcntFaceImage`),
`mantle.party.ContactBookServices.*` (new). Baseline forms covered: `EditParty` `EditPersonForm`,
`EditOrganizationForm`, `PostalPurposeForm`, `PhonePurposeForm`, `EmailPurposeForm`, `WebPurposeForm`,
`OtherPurposeForm`, `OtherCreateForm`, `OtherUpdateForm`, `NewNoteForm`, `UpdateNoteForm`, `NewContentForm`, `UpdateContentForm`,
`PartyRelated` `NewToRelForm`, `NewFromRelForm`, `ToRelationshipForm`, `FromRelationshipForm`,
`Party/UpdateContactInfo` `UpdateContactInfo`; `ExpiredPostal` and `ExpiredContactOther` become
an "Expired" toggle on the contact info box.

### ContactImport

- **Layout:** wizard (`subscreens-panel type="wizard"`; until it exists, boxes with Next): Source
  → Mapping → Options → Preview → Import.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `ImportSource` | wizard step | Choose the file and its kind | file (vCard `.vcf`, CSV; presets for Google Contacts and Outlook CSV), character set | `file` | `mantle.party.ContactImportServices.parse#ContactFile` (new): returns columns and sample rows | Nextcloud SettingsImportContacts; Zimbra import page; Google Contacts import |
| `ImportMapping` | wizard step | Map columns to fields | one row per column: target field (name parts, organization, title, email with purpose, phone with purpose, address parts, birthday, notes, group) | editable rows; "auto-map" by header name | | new (the reference apps map vCard only) |
| `ImportOptions` | wizard step | Where and how | target book, groups to add, duplicate policy (skip, update, create), as personal or directory contacts | | the `import#Contacts` parameters | new |
| `ImportPreview` | list | What will happen | row, action (create, update, skip as duplicate of …), matched party, problems | | `mantle.party.ContactImportServices.preview#Contacts` (new): parses with the mapping and matches each row by email, phone and name (`find#PartyDuplicates` takes only an existing `partyId`, so it cannot serve rows that are not parties yet) | new |
| `ImportResult` | wizard step | Progress and outcome | created, updated, skipped, failed with reasons; download the failures as CSV | `q-linear-progress` by `render-mode` | `mantle.party.ContactImportServices.import#Contacts` (new), run as a job for large files | new |

`ImportMapping`, `ImportOptions`, `ImportPreview` and `ImportResult` are `new`; their highlighted
fields are the full field lists.

- **Source:** research §10 and §18 (no CSV import in the references); Google and Outlook CSV
  formats as the common case.
- **Needs:** Wizard panel; Contact book, import and export services; Contact books.

### Duplicates

- **Layout:** list; pairs grouped by the matching reason (same email, same phone, similar name
  and address); a Compare dialog with both records side by side and a field-level choice.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `DuplicateFind` | find | Scope | book or directory, reason, minimum score | | `mantle.party.DuplicateServices.check#AllPartyDuplicates` (run), `find#PartyDuplicates` | `FindDuplicates` `DupPartyList` |
| `DuplicatePairs` | list | The candidates | the two parties, reason, score | Compare and merge; Not a duplicate | `mantle.party.DuplicateServices.merge#Parties`; `find#PartyHasDuplicates` | same; Google Contacts "Merge & fix"; Nextcloud Merging |

- **Source:** research §17 services; baseline `FindDuplicates`.
- **Needs:** Personal contact visibility (the scan skips personal contacts); Contact book, import
  and export services (`merge#Parties` extended to the party rows it leaves behind today).

## 7. Calendar and schedules

Events are `WorkEffort` rows of type `WetEvent`; attendees are `WorkEffortParty` (status
`WeptOffered` is an invitation, `WeptAssigned` accepted, `WeptDeclined` declined, and the new
`WeptTentative`), meeting rooms are `WorkEffortFacility` (a `Facility` of type `FcTpRoom` or another
bookable type), equipment is `WorkEffortAssetAssign` (an `Asset`, `AstTpEquipment`), whose
status flow `WeaaRequested` → `WeaaAssigned` / `WeaaRequestDenied` is the booking approval. A
**calendar** is the new `Calendar` collection (§19) that owns events through
`CalendarWorkEffort`; a user's default calendar is created on first use; shared calendars are
`CalendarShare` rows; external feeds are `CalendarSubscription`. The grid shows the events of
the calendars toggled on plus every event where the user is a `WorkEffortParty` (an invitation,
an event another app scheduled with them), as `MyCalendar` does today, so an event needs no
`CalendarWorkEffort` row to appear. Recurrence is an RFC 5545
RRULE on `WorkEffortRecurrence` with exceptions as instance `WorkEffort`s linked by
`WorkEffortAssoc` `WeatRecurrenceInstance`; reminders are `WorkEffortReminder` delivered as
notifications on the topic `WorkEffortReminder`. Working hours are recurring `WorkEffort`s of
the existing type `WetAvailable`.

### Calendar

- **Layout:** calendar archetype as `.qvue` until `view-calendar` exists. A left rail (mini
  month, My calendars with color toggles, Shared with me, Subscriptions, "Rooms and equipment"
  link, Tasks toggle), the grid, and a header (Today, previous and next, the range title, the
  view switch, a search line, "Find a time"). A click on an empty slot or a drag opens the quick
  popover; "More options" opens `EventDetail`. Drag moves an event, the edge resizes it; both
  confirm when attendees exist ("Notify attendees?"). A click on an event opens a popover with
  the details and the RSVP buttons. The keys follow Google Calendar: `t` today, `d` `w` `m` `a`
  views, `n` `p`, `c` create, `/` search.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `CalendarFilters` | find | What the grid shows | calendars, show declined, show tasks, time zone | color toggles in the rail | `mantle.work.EventServices.get#FullCalendarData` extended with `calendarIdList` and RRULE expansion (§19); `mantle.work.TaskServices.get#FullCalendarData` for tasks | `MyCalendar`; Nextcloud CalendarList |
| `EventQuick` | dialog | Create in the popover | name, date and time or all day, calendar, meeting room, attendees, repeat (preset), reminder (preset), context link chip | `date-time` pair; attendees `server-search` | `mantle.work.EventServices.create#Event`; `mantle.work.WorkEffortServices.add#WorkEffortParty`; `WorkEffortFacility` `entity` | `MyCalendar` `NewEventForm`; Nextcloud EditSimple; Google Calendar quick add |
| `EventPopover` | single, read | The summary of an event with RSVP | when, where, organizer, attendees and their answers, join link | Accept, Tentative, Decline | `mantle.work.EventServices.respond#EventInvitation` (new) | Nextcloud and Google event popovers |
| `FindTime` | dialog | A free slot for a set of people and a meeting room | attendees, meeting room, duration, range, working hours only | a free/busy grid by `render-mode` with suggested slots | `mantle.work.EventServices.get#FreeBusy` (new) over `WorkEffortAndParty`, `WetAvailable` hours and resource bookings | Nextcloud FreeBusy; Zimbra schedule assistant; Google "Find a time"; Outlook scheduling assistant |

- **Actions:** New event, Find a time, print the range (`html-print`), export the calendar
  (ICS), subscribe (URL), share (opens Settings/Calendars).
- **Views:** day, work week, week, month, agenda (list); the same component in resource mode is
  `Schedules`; year `later`.
- **States:** no calendar yet creates the default one; an unreachable subscription shows its
  last fetch and a warning chip in the rail.
- **Devices:** phone (day and agenda views; a tap creates with the quick form maximized).
- **Source:** research §9 (Nextcloud Calendar, Zimbra calendar, Frappe suite calendar), §17
  `MyCalendar` and `get#FullCalendarData`; Google Calendar and Outlook as the familiar shape.
- **Needs:** List views (`view-calendar`, later); Calendar collections; Recurrence; Reminders;
  Calendar services (`get#FreeBusy`, `respond#EventInvitation`); iCalendar, vCard and iMIP tool;
  CalDAV and CardDAV servers.

### EventDetail

- **Layout:** detail. Title row: name, the calendar's color chip, a status chip (`WeInPlanning`
  planned, `WeApproved` confirmed, `WeCancelled`), the organizer's primary action **Save** or
  **Send invitations** when attendees changed, an attendee's primary action is the RSVP; secondary
  menu: Duplicate, Add a call link, Export ICS, Print, Cancel event. Boxes on one page (three
  rows), Chatter as the right column.
- **Sections and tabs:**
  - When: start, end, all day, time zone, repeat (RRULE editor), reminders.
  - Where: location text, meeting room (with availability), video call (a Comms call link),
    equipment.
  - People: attendees with role, RSVP answer, must respond, availability; Find a time.
  - Details: description (markdown), visibility (`WevAllUsers`, `WevWorkGroup`, `WevRestricted`),
    calendar, attachments (`record-files`), linked records.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `EventHeader` | single | The event | name, start, end, all day, time zone, calendar, visibility, location, description | `date-time`; `text-area editor-type="md"` | `WorkEffort` `entity` update (no `update#Event` exists; `create#Event` for a new one) | `EventDetail` `UpdateEvent`; Nextcloud EditFull |
| `Recurrence` | single | The rule | frequency, interval, by weekday or month day, ends never, after n or on a date; "this event only / this and following / all" on edit | an RRULE editor by `render-mode` | `WorkEffortRecurrence` (new) | Nextcloud Repeat; Google Calendar custom recurrence |
| `Reminders` | list, editable rows | When to remind | offset (minutes, hours, days before), method (notification, email) | | `WorkEffortReminder` (new) | Nextcloud Alarm; Zimbra reminders |
| `Attendees` | list, editable rows | Who | party or external email, role (`Assignee`, optional), RSVP status, must respond (`mustRsvp`), availability (`availabilityEnumId`) | party `server-search`; an external email creates a contact in the organizer's book | `mantle.work.WorkEffortServices.add#WorkEffortParty`, `remove#WorkEffortParty`, `replace#WorkEffortParty`; `mantle.work.EventServices.send#EventInvitations` (new): notifications to users, iMIP mail to external addresses | `EventDetail` `AddPartyAssignForm`, `UpdateAssignForm`; Nextcloud Invitees |
| `Rooms` | list, editable rows | Where it happens: meeting rooms | facility (bookable), status | availability beside the picker | `WorkEffortFacility` `entity` with the new `statusId`; `mantle.work.EventServices.book#Resource` (new) applies the policy | Nextcloud Resources; Outlook room finder |
| `Equipment` | list, editable rows | What it needs | asset, status (`WeaaRequested`, `WeaaAssigned`, `WeaaRequestDenied`), comments | | `WorkEffortAssetAssign` `entity`; `book#Resource` | `EventDetail` `AddEquipment`, `EquipmentList` |
| `LinkedRecords` | list | Where this event belongs | record type, record id and title, linked on, by; remove | add by `lookup#ById` | `mantle.request.RequestWorkEffort`, `WorkEffortAssoc`, `WorkEffortRecord` (new) | new; these are the full fields |

- **Actions:** Save; Send invitations (confirms; sends to new or changed attendees only);
  RSVP accept, tentative, decline with a message; Duplicate (`mantle.work.WorkEffortServices.clone#WorkEffort`);
  Delete this / this and following / all for a recurring event (confirms, notifies attendees);
  Add a call link (creates a record-bound chat room for the event and a `CallLink` on it, §14);
  Export ICS; Print.
- **Navigation:** from the Calendar, the Today panel, a notification, Chatter ("meeting
  scheduled"), the Marketing event screens (which include this screen).
- **States:** an attendee without edit rights sees the layout read-only with the RSVP buttons;
  a denied meeting-room booking shows "Request denied" with the policy's reason.
- **Source:** research §9; baseline `EventDetail` (`UpdateEvent`, `NewNoteForm`, `UpdateNoteForm`
  → Chatter, `AddPartyAssignForm`, `UpdateAssignForm`, `AddEquipment`, `EquipmentList`).
- **Needs:** Recurrence; Reminders; RSVP and booking statuses (`WeptTentative`,
  `WorkEffortFacility.statusId`); Calendar services (`send#EventInvitations`, `book#Resource`);
  iCalendar, vCard and iMIP tool; `record-files`; `chatter`.

**Per-app context (Events).**

| App | Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- | --- |
| Commons | all boxes, Chatter | none | all above | attendees, meeting rooms, reminders |
| Marketing | all, plus Registration, Tickets, Communication schedule (design-marketing) | events of a campaign | publish, open registration | audience and sends |
| Projects | When, People, Details; plan links | events of a project | save | milestones and plan |
| People | When, People (read) | leave and shift events (`WetTimeOff`, shifts) | none | who is out |

### Schedules

- **Layout:** the Calendar component in resource mode: one row per resource (meeting rooms by
  facility, equipment by type), columns by hour (day) or day (week), grouped by site; filters by
  facility type, capacity, equipment type and site; a booking shows its status color (requested
  warning, assigned primary, denied negative). A click on an empty cell opens the Booking dialog;
  a resource's name opens `ResourceDetail`.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `ScheduleFilters` | find | Which resources and when | site, type (meeting rooms, equipment), capacity at least, range | | `mantle.work.EventServices.get#FullCalendarData` with `facilityIdList` and `assetIdList` | SimpleScreens `Facility/FacilityCalendar`, `Asset/AssetCalendar` |
| `Booking` | dialog | Book a meeting room or equipment | resource, start, end, purpose (becomes the event name), attendees, notes, context link | | `mantle.work.EventServices.create#Event` (takes `assetId`); `WorkEffortFacility` `entity`; `book#Resource` sets `WeaaRequested` or `WeaaAssigned` by policy | SimpleScreens `AssetCalendar` `NewEventForm`; Nextcloud RoomAvailabilityModal; Outlook room booking |

- **Actions:** Book, open the event, cancel my booking; "Scheduling admin" links to Maintenance
  for users who have it.
- **Source:** research §9 and §16; initial-design "Facility and equipment schedules live in
  Commons, admin in Maintenance".
- **Needs:** Calendar services (`book#Resource`); RSVP and booking statuses
  (`WorkEffortFacility.statusId`).

### ResourceDetail (Context passed)

The Facility & equipment record is designed in `design-crosscut.md` §3.10; Commons mounts it
read-only at `Commons/Calendar/Schedules/ResourceDetail` for the bookable resources. Commons'
row of its per-app table:

| App | Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- | --- |
| Commons | Overview (name, type, site and location, capacity, features, image, the booking policy in words), Schedule (this resource's week in the Schedules component), My bookings of it | bookable facilities (`FcTpRoom` and the other bookable types) and equipment (`AstTpEquipment`) | book, cancel my booking; "Open in Maintenance" for users who have it | availability |

Services the Commons version calls beyond the crosscut's: `mantle.work.EventServices.get#FullCalendarData`
with `facilityId` or `assetId`, `create#Event` and `book#Resource` (new) through the Booking
dialog.

**Per-app context (Calendar & schedules).**

| App | Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- | --- |
| Commons | my, shared and subscribed calendars; resources | none | create, book, RSVP | my time and bookings |
| Maintenance | resources with policy, approval and blackout windows (design-maintenance) | facilities and equipment | approve, deny, block | availability rules |
| Projects | plan view by project calendar | a project's events and milestones | create | timeline |
| People | leave and shift view by team | `WetTimeOff` and shifts | read; request leave in People | who is out |

## 8. Tasks and requests

Commons shows the user's own slice of two reused records. The screens that create and manage
them in bulk are Projects' (work items, boards, plans) and Customer Service's (cases, queues).

### Tasks

- **Layout:** list. Smart lists as a chip row above the table (Today, Next 7 days, Overdue,
  Assigned to me, Created by me, Watching, Done), as Nextcloud Tasks collections and Microsoft
  To Do's My Day and Planned; a quick-add row at the top of the table; the done checkbox in the
  first column; inline edit of due date and priority.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `TaskFind` | find | Beyond the smart lists | text, status, purpose, due period, project (root work effort), linked record | `date-period` | | SimpleScreens `Task/FindTask` `SearchOptions` |
| `Tasks` | list, editable rows | My tasks | done (status), name, due, priority, project, linked record, assignees, estimated and remaining time | `editable` on due and priority; status chip | `WorkEffortAndParty` (`entity`); `mantle.work.TaskServices.update#Task` | `MyTasks` `MyTasks`; `FindTask` `ListTasks` |
| `NewTask` | list, first row | Quick add | name, due | `first-row-field`; Enter adds and stays | `mantle.work.TaskServices.create#SimpleTask` | `MyTasks` `NewTaskForm`; `FindTask` `NewTaskForm` |
| `BulkActions` | list, bulk | On selected rows | complete, reassign, set due, set priority, move to project | | `update#Task`; `mantle.work.WorkEffortServices.replace#WorkEffortParty` | `FindTask` `AssignTaskSelected`, `UnAssignTaskSelected`, `UpdateTaskSelected` |

- **Actions:** New task (quick add or `QuickCreate`), bulk actions; row: open, complete, add
  to today.
- **Views:** list; board by status (`WeInPlanning`, `WeInProgress`, `WeOnHold`, `WeComplete`)
  through `view-board`; calendar by due date through `view-calendar`; until those exist the
  board and calendar switches open the Projects board and the Commons Calendar with the tasks
  toggle on.
- **Devices:** phone (the table scrolls; the quick-add row stays).
- **Source:** research §11 (Nextcloud Tasks, Deck, Zimbra tasks), §17 `MyTasks`; Microsoft To Do
  and Google Tasks.
- **Needs:** List views; Screen context.

### TaskDetail (Context passed)

| App | Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- | --- |
| Commons | Overview (name, status bar, due, priority, assignees, description, linked records), Sub-tasks, Time (my entries, clock in), Files, Chatter | tasks I am assigned to, created or watch | complete, reassign, set due, clone, convert to request, add to today, delete own | due and assignees; the project planning fields of Projects (estimates, milestone, billing) are hidden |

Services: `mantle.work.TaskServices.update#Task`, `add#TaskComment` (a Chatter comment),
`add#TaskTime`, `mantle.work.TimeServices.create#TimeEntryClockIn`, `mantle.work.WorkEffortServices.clone#WorkEffort`,
`create#WorkEffortContent` and `save#WorkEffortContentFile` through RecordFiles. Baseline forms
covered: `TaskDetail` `UpdateEvent`, `TimeEntries` `TimeEntryList` (the Time tab), `Task/TaskSummary`
`ClockInForm`, `AddCommentForm`, `NewChildTaskForm`, `NewContentForm`, `UpdateContentForm`,
`TaskCommentReply` and `TaskCommentUpdate` `ReplyCommentForm` (Chatter).

### Requests

- **Layout:** list; chips Raised by me, Assigned to me, Watching, Closed.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `RequestFind` | find | Narrow | text, type, status, priority, date period | | | `MyRequests`; `Request/FindRequest` |
| `Requests` | list | My requests | id, name, type, status chip (`ReqSubmitted`, `ReqReviewed`, `ReqInProgress`, `ReqCompleted`, `ReqCancelled`), priority, customer, assigned, updated | | `Request` with `RequestParty` (`entity`) | `MyRequests` `ListRequests`; `FindRequest` `ListRequests` |
| `NewRequest` | dialog | Raise one | as `QuickRequest` | | `mantle.request.RequestServices.create#Request` | `MyRequests` `NewRequestForm` |

- **Source:** research §17 `MyRequests`; initial-design "Requests assigned".

### RequestDetail (Context passed)

| App | Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- | --- |
| Commons | Overview, Conversation (Chatter: comments post through `add#RequestComment`, which writes a `Comment` communication event joined by `RequestCommEvent`), Tasks, Files | requests I raised, am assigned to or watch | comment, submit a draft, cancel my own, reassign when I am the assignee, attach | status and the conversation; no queue, SLA or category widgets (Customer Service) |

Services: `mantle.request.RequestServices.update#Request`, `add#RequestComment`, `update#RequestComment`,
`delete#RequestComment`, `replace#RequestParty`, `create#RequestContent`, `save#RequestContentFile`.
Baseline forms covered: `MyAccount` `EditRequest` `EditRequest`, `UpdatePartyForm`,
`RequestCommentReply` and `RequestCommentUpdate` `ReplyCommentForm`; `Request/EditRequest`
`AddCommentForm`, `NewNoteForm`, `UpdateNoteForm`, `NewContentForm`, `UpdateContentForm`,
`RequestTaskList`.

Oct 28, 2026: on a service case (a Service-category Request) this mount hides Complete and Cancel,
so the case is resolved only through Customer Service's case transitions and keeps its SLA rules
([design-crosscut §3.11](design-crosscut.md#311-requestdetail), R-XC-13, D23).

## 9. Files

Files is Google Drive and Nextcloud Files over the framework's resource locations, in
**drives**. A drive (`moqui.resource.ResourceDrive`, §19) is a root location with an owner,
members, a quota and a storage chosen when it is created:

- **My files**: each user's personal drive, made on first use, on the database-backed resource
  tree: every file and folder is a `moqui.resource.DbResource` with its bytes in `DbResourceFile`
  and its past versions in `DbResourceFileHistory`. Its root is under the `moqui.drive.root`
  preference (`dbresource://drive` by default); a deployment that wants personal files on disk
  or in object storage points that at another resource location, and the screens do not change.
- **Folder drives**: shared drives on the same tree, under the same root, with the same per-file
  versions.
- **Version-controlled drives**: `git://<repositoryId>/` over a `moqui.resource.GitRepository`
  made with the drive, kept in the database (kind `db`, the default: objects and refs in
  `GitObject` and `GitRef`) or on disk (kind `local`: a bare repository that can be cloned and
  pushed to with the git command line on the host). Every change is a commit by the user, and a
  file's versions are the commits that changed it.
- **Mirrors**: a read-only drive an admin adds over a remote git URL (kind `remote`), fetched on
  its interval by the `fetch_AllGitRepositories_frequent` job.
- **Records**: a system drive over the record attachments, in the layout Mantle already writes:
  each `save#*ContentFile` service stores a record's file at
  `dbresource://mantle/content/<type>/<id>/content_<contentId>/<file>` (the root is the
  `mantle.content.root` preference) and the record's `*Content` row (`PartyContent`,
  `WorkEffortContent`, `RequestContent`, `OrderContent`, …) points at it. The browser's
  **Records** section is a view over those type folders, named by record type, and the
  `record-files` element is the same component scoped to one record; no file moves. The type
  folders are not uniform (`CommunicationEvent/` is capitalised, an asset maintenance record's files
  sit under `asset/<assetId>/maintenance/`, and a facility has none), so BOSS seeds the map from
  folder to record entity and id field rather than deriving it from the name.

Every storage but a disk drive is in the database, so a Postgres backup holds everything. On the
database tree a replaced text version is kept as a reverse line delta against the next one (whole
for a binary file, for every 20th version and when the delta would be over half the text), so
keeping every version of an edited document costs little. Every storage answers the same version
API of the resource facade (mr-moqui `docs/data/Revision-Management.md`): the version history, the
text of a version, a `location#version` read and a server-side line diff of two versions
(`getVersionDiff`, with a `moqui-diff` HTML table), so Versions, compare and restore look the
same on every drive. The drive metadata (members, shares, public links, favorites, tags, trash;
§19) is keyed by drive and path for every storage, since a file in a version-controlled drive has
no row of its own. WebDAV serves each drive the user may open to desktop clients and the virtual
SFTP server serves it to scripts (§11 Sync, §19; both `later`, with Sync, so Files ships without
them); a write to a version-controlled drive through
either is a commit. A disk drive can also be cloned on the host, and a database drive exported
as a bare repository (`export#GitRepository`).

### Files

- **Layout:** split as `.qvue` (the browser needs drag and drop, a virtual grid and a preview
  overlay). Left rail: My files, Drives (each drive I belong to, a version-controlled one marked
  with a history icon and a mirror with a lock, and "Manage drives" to `Commons/Files/Drives`),
  Recent, Favorites, Shared with me, Shared by me, Records (a tree by entity: Orders, Parties,
  Requests, Tasks, …), Tags, Trash, and the open drive's quota bar. Main: a breadcrumb bar from
  the drive with **Upload** and **New** (folder, text or markdown note, document through the
  Office app later), a grid or list toggle, sort, and filter chips (type, modified, tag, modified
  by); the rows; a detail sidebar on the right with tabs Details, Sharing, Versions, Activity. A
  file click opens the preview overlay (image, PDF, video and audio, text and markdown, `.eml`,
  office through WOPI later) with previous and next. The keys: arrows move, Enter opens, Space
  previews, Delete trashes, Ctrl+A selects all, F2 renames, `/` searches.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `FileFind` | find | Search and filters | text (name and extracted text), type, modified period, tag, modified by, drive, in this folder | | `org.moqui.impl.FileServices.find#Resources` (new) and the search index | Nextcloud in-folder search and filters; Google Drive filter chips |
| `FileList` | list | The folder | name with icon or thumbnail, size, modified, modified by (the current version's user; the drive is the owner, as in Google shared drives), shared chip, favorite star | `q-virtual-scroll`; drag rows to a folder; `row-selection` | `FileServices.list#Folder` (new): size from `DbResourceFile.fileSize` or the git object, modified and modified by on a version-controlled drive from the Git path index | Nextcloud FilesListVirtual; Frappe Drive ListView and GridView |
| `Upload` | single | Upload files or a folder | files (multiple), destination, version note (optional) | `file` with drop zone; a progress tracker; conflict dialog (replace, keep both, skip) | `FileServices.upload#Resource` (new), the files of one upload as one change set (one commit on a version-controlled drive); the drive's storage keeps the replaced version (a history row or a commit) | Nextcloud uploader and conflict dialog; Zimbra upload conflict |
| `NewFolder`, `Rename` | dialog | Name a new folder, or rename a file or folder | name | | `FileServices.create#Folder`, `rename#Resource` (new) | Nextcloud NewNodeDialog |
| `Move` | dialog | Move or copy the selection | destination (drive and folder tree) | `tree` | `FileServices.move#Resource`, `copy#Resource` (new): within a drive one move (one commit); across drives a copy and a trash, the history staying with the source drive | Nextcloud move-copy; Frappe MoveDialog |
| `Share` | dialog | Share with people or by link | sharee (user, group, party, email), permission (view, edit, upload only), expiry, password, note; links: label, permission, expiry, password | sharee `server-search` | `FileServices.share#Resource`, `revoke#Share` (new) over `ResourceShare` | Nextcloud SharingTab and SharingDetailsTab; Google Drive share dialog |
| `Details` | single, read | Metadata and tags | type, size, created, modified, modified by, drive and its storage, location, the current version (a commit id on a version-controlled drive), tags (editable) | | `entity`; the version API; `ResourceTag` (new) | Nextcloud sidebar; Drive details pane |
| `Versions` | list | History and compare | version (`01`, `02`, … on the database tree, the first 10 digits of the commit id on a version-controlled drive), date, by, note; view, compare with the previous or the current version, restore, download | compare (text files) shows the `moqui-diff` table by `render-mode` in a dialog | `FileServices.get#Versions` and `get#VersionDiff` (new) over the version API (`getVersionHistory`, `getText(version)`, `getVersionDiff`); view by `location#version`; `FileServices.restore#Version` (new) writes the version as the newest one | Nextcloud files_versions; Zimbra briefcase revisions; `Gallery/Editor.xml` history and compare |
| `Comments` | component | Chatter comments on the file | | the `chatter` element in comments-only mode | `mantle.party.CommunicationServices.create#Message` type `Comment` with `CommunicationEventRecord` | Nextcloud comments tab |
| `Activity` | list | What happened to the file | action, by, when | | `FileServices.get#Activity` (new) from the audit log and share rows, and on a version-controlled drive the commits under the file or folder (Git path index) | Nextcloud activity tab; Drive activity |
| `BulkActions` | list, bulk | On the selection | download as zip, move, copy, share, tag, favorite, delete | | as above, a move or delete of the selection as one change set; `FileServices.download#Zip` (new) | Nextcloud file list actions |

- **Actions:** Upload, New; row: preview, download, share, rename, move, favorite, versions,
  compare, copy link, delete (to trash); Trash: restore, delete forever, empty trash (confirms).
  Trash is the same on every drive (`ResourceTrash`, §19): on the database tree a deleted item
  moves into the drive's hidden trash folder with its history, and restore moves it back; on a
  version-controlled drive the delete is one commit for the item and everything under it, and
  restore writes back the version from before that commit as a new one, while delete forever
  removes the trash row and leaves the file in the drive's history. A version carries the note
  written with it (Upload, a Knowledge Save) rather than a label added later, since a commit
  cannot be relabeled.
- **Navigation:** from the launcher, the palette's Pages and files group, a record's Files tab
  ("Open in Files"), a share notification, a Chatter attachment, the Compose "attach from Files"
  picker (which is this screen's list in a dialog).
- **Views:** list and grid; Recent, Favorites, Shared with me and Trash are the same list with a
  fixed filter.
- **States:** an empty folder shows the drop zone and New; an over-quota upload fails with the
  quota named; a folder the user may not open is absent; a mirror is read-only (Upload, New,
  rename, move and delete are absent) with a banner of its last fetch (`lastFetchDate`) and any
  error (`lastFetchError`), and Fetch now (`org.moqui.impl.GitServices.fetch#GitRepository`) for
  admins; compare is absent for a binary file.
- **Devices:** phone (list only; upload from the camera roll; preview full screen).
- **Source:** research §12 (Nextcloud Files, Zimbra briefcase, Frappe Drive), §17 `DbResource`,
  §18 "No Files app"; Google Drive and OneDrive; mr-moqui `docs/data/Revision-Management.md`.
- **Needs:** Drives; File metadata model; File services; Change sets; Version notes; Git path
  index; Search DataDocuments (`MoquiDriveFile`); Extracted text for search (later); WebDAV
  server (later, with Sync); `chatter`.

### Drives

- **Layout:** list of the drives I belong to with **New drive** and, for admins, **Add mirror**;
  a row opens the drive in Files and its menu opens the drive's settings and members. Each
  storage in the New drive dialog has one line on what it means: Folder ("each file keeps its
  own versions"), Version-controlled in the database ("every change is a commit; in the
  backup"; the default when version control is wanted), Version-controlled on disk ("a git
  repository on the server that can be cloned").
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `DriveList` | list | The drives I may open | name, storage, members, used of quota, last change, my permission | storage as an icon | `ResourceDrive`, `ResourceDriveMember` (`entity`) | Google Drive shared drives; Nextcloud team folders |
| `NewDrive` | dialog | A shared drive | name, description, storage (Folder, Version-controlled in the database, Version-controlled on disk), members, quota | storage as a `radio` with the explanation lines; members `drop-down` `allow-multiple` `server-search` | `org.moqui.impl.FileServices.create#Drive` (new): a folder drive gets its root on the database tree; a version-controlled one gets a `GitRepository` of kind `db` or `local` and `org.moqui.impl.GitServices.init#GitRepository` | Google Drive new shared drive |
| `NewMirror` | dialog | Admins: a read-only drive over a git URL | name, HTTPS URL, branch, username, access token, fetch interval, members | token as `password` | `create#Drive` with kind `remote`, then `GitServices.fetch#GitRepository` | Gitea and GitLab pull mirrors |
| `DriveSettings` | single | One drive | name, description, quota, storage (read only); for a version-controlled drive the repository, branch and head commit, and for a disk drive the path to clone from; for a mirror the URL, interval, last fetch and error | | `FileServices.update#Drive`, `archive#Drive`, `export#Drive` (new: `GitServices.export#GitRepository` for a version-controlled drive, a zip for a folder drive); `GitServices.fetch#GitRepository` for a mirror | Google Drive shared drive settings |
| `DriveMembers` | list, editable rows | Who may open the drive | user or group, permission (view, edit, manage) | | `FileServices.add#DriveMember`, `remove#DriveMember` (new) over `ResourceDriveMember` | Google Drive manage members; Nextcloud team folder members |

- **Actions:** New drive, Add mirror (admins), open, settings, members, export, archive
  (confirms; an archived drive is read-only and leaves the rail). My files and Records are
  listed without members or archive.
- **States:** a mirror whose last fetch failed shows the error on its row; a drive at its quota
  shows the bar as a warning.
- **Source:** research §12 (Nextcloud Files); Google Drive shared drives; mr-moqui
  `docs/data/Revision-Management.md` (repository kinds, fetch, export).
- **Needs:** Drives; File services.

### Shares

- **Layout:** list; tabs Outgoing, Links, Incoming.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `OutgoingShares` | list | What I shared with people | item, with whom, permission, expiry, shared on | bulk revoke | `ResourceShare` (`entity`); `FileServices.revoke#Share` | Nextcloud shares views; Zimbra sharing page |
| `Links` | list | Public links | item, label, permission, expiry, password set, opened count, link | copy link, revoke | same | Nextcloud SharingLinkList |
| `IncomingShares` | list | Shared with me | item, from, permission, received; accept or decline when pending | | `FileServices.accept#Share`, `decline#Share` (new) | Nextcloud pending shares |

- **Source:** research §12.

### PublicShare

- **Layout:** split as `.qvue`, served to an anonymous visitor at `/s/<token>` (a webroot
  mount outside the apps root): the sharer's name and note, a password prompt when set, then a
  file (preview and download) or a folder (list, download all as zip) and, for an upload-only
  link, a file-drop form with the uploader's name. Expired or revoked shows a short page.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `SharePassword` | single | Unlock | password | | `FileServices.open#PublicShare` (new) | Nextcloud public share auth |
| `PublicList` | list | The shared folder | name, size, modified | read-only; no sidebar | `FileServices.list#PublicShare` (new) | Nextcloud publicShare view |
| `FileDrop` | single | Upload into the folder | files, your name | `file` multiple | `FileServices.upload#PublicShare` (new) | Nextcloud file drop with nickname |

- **Source:** research §12 (public share pages, file request); Google Drive and OneDrive link
  sharing.
- **Needs:** Anonymous token routes; File services.

### RecordFiles (`Shared/RecordFiles`)

- **Layout:** panel as `.qvue`, embedded by the `record-files` element through the
  `STRT_RECORD_FILES_SCREEN` theme value with `recordEntity` and `recordId` parameters: a drop
  zone, the file rows (name, size, by, when, type chip from the record's content type
  enumeration such as `PcntInternal`), preview on click, and the actions upload, link an
  existing file (the Files picker), share, download, remove. A box in a detail from 1440 px, a
  tab below. It loads as its own request under the host's app root (`<App>/RecordFiles`), so it
  first finds the record under the user's filters, and renders nothing (logged once) and refuses
  writes when the record is not visible.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `RecordFileList` | list | The record's files | name, type, description, by, when | preview; `row-selection` for download | the record's `*Content` join (`entity`) and its content folder | `EditParty` `NewContentForm`, `UpdateContentForm`; `TaskSummary` `NewContentForm`; `EditRequest` `NewContentForm`; wiki `UploadAttachment` |
| `RecordUpload` | single | Add files | files, type, description | `file` with drop zone | the record's `create#<Record>Content` and `save#<Record>ContentFile` pair, which Mantle has for 13 record types: Agreement, AssetMaintenance, CommunicationEvent, Invoice, Order, Party, Payment, PaymentMethod, Product, ProductCategory, Request, Shipment and WorkEffort (for example `mantle.party.PartyServices.create#PartyContent` and `save#PartyContentFile`); otherwise `FileServices.upload#Resource` plus the join | same; Nextcloud Deck attachments; Odoo chatter attachments |

- **Per-app context:** none. Every app gets the same component; the type chip and the type
  picker come from the record's own content-type enumeration (`PcntInternal` and the other
  `PartyContentType` values for a party, the order, invoice or shipment types for those), and
  the host screen's authorization decides who may upload and remove.
- **Source:** research §12 and §16 "Files on records"; crosscut §3 `*Content` joins.
- **Needs:** `record-files`; File services.

Oct 28, 2026: each record that hosts Files has its own `*Content` entity registered in
`get#RecordLinkInfo`; `ReturnContent` and `AssetContent` are added for returns and equipment
([design-crosscut §3.14](design-crosscut.md#314-chatter-and-recordfiles), D25).

## 10. Notes and knowledge

The framework wiki (`WikiSpace`, `WikiPage`, `WikiPageHistory`, `WikiPageCategory`,
`WikiPageCategoryMember`, `WikiPageAlias`, `WikiPageUser`, `WikiSpaceUser`) is the store for
knowledge pages and personal notes alike. A **space** is a knowledge base, a team wiki, a
project's pages or a customer-facing help center (its `publicPageUrl` set); a user's **notes**
are the pages of a private space created on first use with `restrictView` and
`restrictUpdate` set. A space's pages are files under its root location, and its storage is
chosen when the space is created, as a drive's is (§9): database files
(`dbresource://WikiSpace`, the default, and always for a notes space) or a version-controlled
space in a git repository (`git://<repositoryId>`, in the database or on disk), where each save
is a commit. The wiki services read and write pages only through the resource facade's version
API, so history, compare, publish and `#version` views work the same on both (mr-moqui
`docs/data/Revision-Management.md`); on database files a past text version is a reverse line delta,
so frequent saves cost little. Pages are edited in the co-editing editor (Tiptap over Yjs with
the `yrs` sync server; initial-design) whose document is the decided CRDT-plus-snapshot store;
the rendered markdown snapshot is the page file, and its versions (history rows or commits) are
what history, compare, search, print and the published version read, while `WikiPageHistory`
records who saved each version and the page's moves. Until the editor lands, the page body is a
`text-area editor-type="md"`, which is the baseline's behavior with a preview.

### Knowledge

- **Layout:** editor as `.qvue`. A side pane (`container-split` side at 280 px): the space
  picker, a search line, the page tree with drag reorder and a New page button, Favorites and
  Recently edited; the main pane: a title row (title, path breadcrumb, status chip Draft,
  Published, In review, the presence avatars, the save state "Saved · Saving · Offline"), the
  editor or the rendered page, an outline on the right from 1440 px, and under the page
  Backlinks, Comments and Attachments. Actions on the title row: Edit or Done, Publish this
  version, Request review, History, and a menu (rename or move, clone, link to a record, export
  PDF or markdown, print, delete). The keys: `e` edit, Ctrl+S save a named version, `/` slash
  commands, Ctrl+K link. The gallery's `Gallery/Editor.xml` is the rendered reference for the
  page, History, compare, restore and publish, with a space on each storage (`EXAMPLE` on
  database files, `EXGIT` in a database git repository).
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `PageTree` | component | The space's pages | title, children | `tree` with drag; a drop sets the page's `parentWikiPageId` and `sequenceNum` | `org.moqui.impl.WikiServices.get#WikiSpacePages`, `get#WikiPageChildren`, `update#WikiPage` (parent and sequence) | SimpleScreens Wiki `wiki` tree; Nextcloud Collectives PageList; Frappe WikiTree |
| `PageHeader` | single | Title and placement | title, page path, parent, categories, visibility | | `org.moqui.impl.WikiServices.update#WikiPage`; `WikiPageCategoryMember` (`entity`) | `wiki` `AddPageForm`, `AddCategory`, `CategoriesForm`; `EditWikiPage` `EditPageForm` |
| `Editor` | component | The body | page text; on Save a version note | `m-coedit` (§19); fallback `text-area editor-type="md"` | `update#WikiPage` writes the snapshot as a new version with a `WikiPageHistory` row: on database files on idle and on Save, a reverse delta each; in a version-controlled space on Save and when the editing session closes, one commit each with the note as its message (Version notes) | Nextcloud Text; Frappe WikiEditor slash commands; Notion and Confluence editing |
| `History` | dialog | Versions and compare | version (`01`, … or the first 10 digits of a commit id), date, by, note, moved from; view; compare two; restore; set published | the `moqui-diff` table of `getVersionDiff` by `render-mode` (`text type="html,qvt"`); no diff library in the browser | the page reference's `getVersionHistory()` from `org.moqui.impl.WikiServices.get#WikiPageInfo`, with `WikiPageHistory` (`entity`) for who and the moves; compare by `getVersionDiff(lhs, rhs)`; view an old version by `location#versionName`; restore writes `getText(versionName)` through `update#WikiPage` as the newest version; `org.moqui.impl.WikiServices.set#PublishedVersion` | SimpleScreens `WikiCompare`; `Gallery/Editor.xml`; Redmine and OpenProject history and diff |
| `ReviewRequest` | dialog | Ask for review before publishing | reviewer, note, version | | `WikiPageReview` (new, §19) and a notification on topic `WikiPageReview` | Frappe Wiki contributions; Ever Gauzy Docs review |
| `Comments` | component | Chatter comments on the page | | the `chatter` element, comments only | `mantle.party.CommunicationServices.add#WikiPageComment` (`WikiPageCommunicationEvent`; extended to return the new `communicationEventId`) | `wiki` `AddCommentForm`, `WikiCommentReply` `ReplyCommentForm`; Collectives comments |
| `Attachments` | component | Files on the page | | `record-files` | `org.moqui.impl.WikiServices.upload#WikiPageAttachment`, `get#WikiPageAttachment`, `delete#WikiPageAttachment` | `wiki` `UploadAttachment` |
| `LinkRecord` | dialog | Link the page to a request or task | record by id or search | `lookup#ById` | `mantle.request.WikiPageRequest`, `mantle.work.effort.WikiPageWorkEffort` (`entity`) | SimpleScreens `Request/EditWikiPages` `AddWprForm`, `DeleteWprForm` and `Task/EditWikiPages` `AddWpweForm`, `DeleteWpweForm`; OpenProject wikis tab |
| `Backlinks` | list, read | Pages that link here | page, space | | `org.moqui.impl.WikiServices.get#WikiPageBacklinks` (new) over the links `update#WikiPage` indexes from the snapshot on save, with `WikiPageAlias` for moved pages | Collectives backlinks |

- **Actions:** New page, Edit, Save version, Publish (`set#PublishedVersion`), Request review,
  Clone (`clone#WikiPage`, replacing the `wiki` `ClonePage` form), Move, Delete
  (`delete#WikiPage`, confirms), Export PDF (`html-print` of the rendered snapshot) and markdown,
  Print.
- **Navigation:** from the launcher, the palette's Pages and files group, a case's Knowledge tab
  (Customer Service), a task or request's linked pages, a chat record card, a public help-center
  URL (`publicPageUrl`, anonymous read).
- **States:** a reader without update rights sees the rendered page with Edit absent; an
  offline editor keeps editing against IndexedDB and shows "Offline"; a page under review shows
  the chip and who holds it.
- **Devices:** phone (read; edit of short pages).
- **Source:** research §13 (Nextcloud Text and Collectives, Frappe Wiki, Gameplan, Ever Gauzy
  Docs, OpenProject and Redmine wiki, Moqui WorkManagement wiki), §17 Wiki app; initial-design
  "Native co-editing".
- **Needs:** `m-coedit` and the `yrs` server; `container-split`; Notes space and knowledge
  review (`WikiPageReview`, backlinks); `chatter`; `record-files`; Print documents (page PDF).

**Per-app context (Knowledge base articles).**

| App | Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- | --- |
| Commons | all | none | all | authoring |
| Customer Service | search results and the rendered page in a case's Knowledge tab | the help-center spaces | link to case, suggest an edit (opens a review request), send to customer (Compose with the public URL) | finding and sending |

### Spaces

- **Layout:** list with a create dialog and a settings detail per space.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `Spaces` | list | The spaces I may see | id, description, pages count, visibility, public URL | | `org.moqui.impl.WikiServices.get#UserWikiSpaces` | `WikiSpaces` `WikiSpaceList` |
| `NewSpace` | dialog | Create or clone | id, description, storage (Database files, the default; Version-controlled in the database; Version-controlled on disk; for admins, a read-only mirror of a git URL), from space (clone), restrict view and update | storage as a `radio` with the explanation lines of New drive (§9) | `org.moqui.impl.WikiServices.create#WikiSpace`, `clone#WikiSpace`, with `repositoryKind` for a version-controlled space (Wiki git storage, §19), which makes the `GitRepository` and roots the space at `git://<repositoryId>` | `WikiSpaces` `NewSpace`; `EditWikiSpace` `CloneSpace`; `Gallery/Editor.xml` `createGitSpace` |
| `SpaceSettings` | single | A space | description, root page, storage (read only; for a version-controlled space the repository, branch and head commit), public page URL, public attachment URL, allow any HTML, theme, restrict view and update | | `WikiSpace` (`entity`); Export (`org.moqui.impl.GitServices.export#GitRepository`) for a version-controlled space | `EditWikiSpace` `EditSpace` |
| `SpaceMembers` | list, editable rows | Who may read and write | user or group, permission | | `WikiSpaceUser`, `WikiPageUser` (`entity`) | Collectives members; Confluence space permissions |

- **Source:** research §13 and §17.
- **Needs:** Wiki git storage.

### Review

- **Layout:** list; a row opens the page's History dialog on the compare of the requested
  version against the published one (`getVersionDiff` from the published version to the
  requested one, whose name is a version name or a commit id).
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `ReviewQueue` | list | Pages waiting on me or on anyone | page, space, requested by, version, since, reviewer | Approve (publishes) and Request changes (a comment back) inline | `WikiPageReview` (new); `set#PublishedVersion`; `add#WikiPageComment` | Ever Gauzy Docs review queue; Frappe Wiki ContributionReview |

- **Source:** research §13.

### Notes

- **Layout:** the Knowledge editor over the user's notes space (always on database files) with a
  flat side list instead of a tree (sorted by modified, with a search line, tags from categories,
  and pinned notes first), a quick "New note" that starts typing at once, and "Move to a space"
  to promote a note to shared knowledge (it keeps its history). Notes never show the review and
  publish actions.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `NoteList` | list | My notes, pinned first, then by modified | title, snippet, modified, tags, pinned | search line; pin toggle (pinned is the reserved category `Pinned`) | `org.moqui.impl.WikiServices.get#WikiSpacePages` over my notes space | Nextcloud Notes list; Google Keep pinned notes |
| `Editor` | component | The note body | page text | as Knowledge `Editor` | `org.moqui.impl.WikiServices.update#WikiPage` | Knowledge `Editor` |
| `Tags` | component | Tags as chips | category names | chips with a create line | `WikiPageCategoryMember` (`entity`) | `wiki` `AddCategory`, `CategoriesForm`; Nextcloud Notes categories |
| `MoveToSpace` | dialog | Promote a note to shared knowledge | space, parent page | | `org.moqui.impl.WikiServices.move#WikiPage` (new: moves a page with its history, categories and attachments to another space; into a version-controlled space the history is replayed oldest version first, one commit each with a note naming the original date and author, §21) | Ever Gauzy Docs move dialog; OpenProject wiki move |

- **Source:** research §13 (Nextcloud Notes, Gameplan My Pages); Google Keep and OneNote.
- **Needs:** as Knowledge; Notes space and knowledge review (the notes `WikiSpace` per user
  created on first use, `move#WikiPage`).

## 11. Commons settings and account

### Settings

- **Layout:** settings index: cards Account, Preferences, Notifications, Contact books,
  Calendars, Sync; Comms settings are linked from a last card, Admin's settings index links here.

### Account

- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `Account` | single | Who I am | full name, user name, email, locale, time zone, avatar | avatar upload (`PartyContent` `PcntFaceImage`) | `org.moqui.impl.UserServices.update#UserAccount`; `mantle.party.PartyServices.create#PartyContent` | `MyAccount` `Account` `EditUser` |
| `ContactInfo` | single | My addresses and numbers | postal, phone, email with purposes | | `mantle.party.ContactServices.store#PartyContactInfo` | `MyAccount` `ContactInfo`, `UpdateContactInfo` `ShippingInfo` |
| `ChangePassword` | single | Change my password | old, new, repeat | | `org.moqui.impl.UserServices.update#Password` | `Account` `ChangePasswordForm` |
| `TwoFactor` | list | My second factors | type, description, enabled, last used | add dialogs per type; TOTP shows the QR | `org.moqui.impl.UserServices.get#UserAuthcFactorInfo`, `create#UserAuthcFactorTotp` and `setup#UserAuthcFactorTotp`, `create#UserAuthcFactorEmail`, `create#UserAuthcFactorSms`, `create#SingleUseAuthcFactor`, `invalidate#UserAuthcFactorEntry`, `send#AuthcCodeUserAccountEmail` | `Account` `UserAuthcFactorList`, `CreateUserAuthcFactorTotp`, `CreateUserAuthcFactorSingleUse`, `CreateUserAuthcFactorEmail`, `CreateUserAuthcFactorSms`, `SecondFactorSendForm` |
| `Sessions` | list | Where I am signed in | device, since, last seen; sign out | | `moqui.server.Visit` (`entity`) | Nextcloud and Google account security |
| `GitAccess` | single, or list | Git and API access | a Git access link to `Projects/Code/GitAccess` for a user who has Projects; otherwise my access tokens (description, created, expires; Revoke) and New access token, shown once | the token forms included from Projects' GitAccess | `org.moqui.impl.UserServices.create#UserAccessToken`, `revoke#UserAccessToken`; `UserLoginKey` (`entity`) | design-projects GitAccess; `MyAccount/User/GitAccess` `AccessTokenList`, `CreateAccessTokenForm` |

### Preferences

- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `Appearance` | single | Look | dark mode (`QUASAR_DARK`), left drawer (`QUASAR_LEFT_OPEN`), density, start app | | `org.moqui.impl.UserServices.set#Preference` | the account menu toggles today |
| `Keymap` | list, editable rows | Every binding | scope, action, keys, default; reset | a key capture field by `render-mode` | `set#Preference` `KEYMAP` (JSON) | Zimbra shortcuts page; Gmail keyboard settings |
| `MailDefaults` | single | How mail behaves | reading pane (right, bottom, off), conversation view, mark read after n seconds, archive opens next, undo send seconds, default account, signature placement, swipe actions on a phone | | `set#Preference` | Gmail and Outlook settings; Nextcloud Mail settings |
| `CalendarDefaults` | single | How the calendar opens and new events start | week starts on, working hours (`WetAvailable`), default duration, default reminder, show week numbers, time zone for the grid | | `set#Preference`; `WorkEffort` `WetAvailable` rows | Nextcloud Calendar settings; Google Calendar |
| `Sounds` | single | Notification, chat and call sounds | notification sound, chat sound, call ringtone | | `set#Preference` | Zimbra notifications page |

### NotificationSettings

- **Forms:** `NotificationTopics` (list, editable rows: topic, description, in app, email,
  daily digest; `NotificationTopicUser` `entity` with the new `digest` flag) — derived from
  `Notifications` `NotificationTopicList`, OpenProject notification settings. Topics are the
  union of the framework's and the `<notification-topic>` providers of the apps the user may
  open.

### ContactBooks

- **Forms:** `Books` (list: name, kind personal or shared, contacts, groups, shared with;
  `ContactBook` new), `NewBook` (dialog), `Groups` (list, editable rows per book), `BookShare`
  (dialog: user or group, permission), `CardDavInfo` (display: the book's CardDAV address for a
  device). Services: `mantle.party.ContactBookServices.*` (new). Derived from Nextcloud contacts
  settings, Zimbra address-book dialogs.
- **Needs:** Contact books; Contact book, import and export services; CalDAV and CardDAV
  servers.

### Calendars

- **Forms:** `Calendars` (list: name, color, kind, owner, shared with, default; `Calendar` new),
  `NewCalendar` (dialog), `CalendarShare` (dialog: user, group or party; view or edit;
  publish link with optional password), `Subscriptions` (list, editable rows: name, URL, refresh
  interval, color, last fetched, status; `CalendarSubscription` new; Google and Microsoft 365
  through OAuth as a kind, `later`), `WorkingHours` (the `WetAvailable` editor shared with
  Preferences), `CalDavInfo` (display). Services: `mantle.work.CalendarServices.*` (new).
  Derived from Nextcloud EditCalendarModal and subscriptions, Zimbra calendar dialogs.
- **Needs:** Calendar collections; Calendar services; OAuth client and token store (Google and
  Microsoft subscriptions, later); CalDAV and CardDAV servers.

### Sync

- **Forms:** `Devices` (list: app password name, created, last used; revoke), `NewAppPassword`
  (dialog: name; shows the password once), `SetupGuides` (display: the CalDAV, CardDAV and WebDAV
  URLs and the steps for iOS, Android, macOS, Windows, Thunderbird). Services: `UserAppPassword`
  (`entity`; new, §19). Derived from Nextcloud security settings and the DAV setup pages.
- **Scope:** `later`, with the protocol servers.
- **Needs:** App passwords; CalDAV and CardDAV servers; WebDAV server; Virtual SFTP server.

## 12. Comms Home, Inbox and email

The Inbox is a full mail client, good enough to be someone's only one. Its model: a **mail
account** (`EmailAccount`, new, §19) is an **external account** the framework polls over IMAP
or POP (password or OAuth for Google and Microsoft 365), a **hosted account** at a hosted domain
delivered by the SMTP listener behind the edge gateway (initial-design), a **shared account**
with members (orders@, support@), or the user's **Internal account** (below); the connection
details stay on `moqui.basic.email.EmailServer`. Messages are `moqui.basic.email.EmailMessage`
rows (headers, HTML and text bodies, `messageId`, threading by `rootEmailMessageId` and
`parentEmailMessageId`), extended with the account, folder, remote uid, flags, snooze and
schedule fields; folders are `EmailFolder`, labels `EmailLabel`, attachments
`EmailMessageAttachment` stored as `DbResource` files. Sending is
`org.moqui.impl.EmailServices.send#EmailMessage` through the account's server, direct or
relayed. A message becomes a business record only when it is linked: the receiver creates a
`CommunicationEvent` (type `Email`, `emailMessageId` set) when a sender or recipient matches a
party with a known email and the account's filing policy allows it, and the user links any
message to a record from the Inbox or Chatter, which is what the 360s and Chatter show. The
filing policy is per account (`EmailAccount.recordFilingEnumId`, §19): a shared or hosted
business account files every match; a personal external account, such as someone's own Gmail,
files only what its owner links, so private mail never lands on a customer's record. Full-text
search is a `DataDocument` over `EmailMessage` in the search index.

**The Internal account.** Every user has one, an `EmailAccount` of kind `internal` made on
first use, with no server and no `EmailMessage` rows. It shows internal messages
(`CommunicationEvent` type `Message` and `Comment` addressed to me) in the same client, as
initial-design asked, so one keyboard and one reading pane serve both. Each recipient's read,
flag, archive, snooze and label state lives on that recipient's `CommunicationEventParty` row
(§19 "Internal message state"), so one message to five people has five independent states. A
party has one row per message: the key includes `roleTypeId`, so the role is chosen by priority
(to, then cc, then mailbox delivery), and a state change updates every row the party has on the
message. The
Inbox lists both stores through `mantle.party.CommunicationServices.find#InboxThreads` (new),
which merges the framework's mail with the internal threads by date.

**Mailboxes.** Under the Internal account are the user's mailboxes, the asynchronous
counterpart of a chat room (§13): a shared list or forum with members, where everyone reads the
same threads. A mailbox is a Mantle `ContactList` of the new type `MAILBOX` (§19 "Mailboxes"),
the list model Marketing sends with, and its members are `ContactListParty` rows with a role
(owner, moderator, member) and a delivery: **Inbox** puts each post in the member's Unified and
Internal Inbox and the header count, as a mailing list does; **Mailbox only** keeps the posts
under the mailbox with an unread count, as a forum does. A mailbox is public (any user reads
and joins) or private (members only; a join request waits as `CLPT_PENDING` until an owner
accepts), and its posting policy is members, moderators only (announcements) or any user (a
help mailbox such as "Ask IT", where a poster sees only their own threads). A post is one
`CommunicationEvent` of type `Message` with `contactListId` set, threaded by `rootCommEventId`
and `parentCommEventId`, its subject the topic. Posting writes a `CommunicationEventParty` row
for each member and each participant of the thread, so per-member state works as it does for
a message to named recipients, and someone who joins later sees the earlier threads as read.
Reply goes to the mailbox; Reply to sender answers the sender only, as an internal message off
the mailbox; an `@` mention adds the person as cc; a
moderator closes a thread by setting its first post to `CeResolved`. Mailbox posts stay off
party timelines and reach a record's Chatter only when linked to it. An email address for a
mailbox was left `later` by this design. It is now fully designed in
[IronStoa PASS Forum §12](../../mr-pass/plan/design-forum.md#12-read-state-notifications-and-email), using existing
mail ingestion and ContactListCommStatus plus separate delivery preferences, reply tokens and
outbox/receipt records. Forum email opt-out changes delivery, not membership or paid access.

**PASS extension (Oct 27, 2026).** [Forum §13.4](../../mr-pass/plan/design-forum.md#134-comms-and-customer-service)
defines the Comms additions: shared moderation queue/actions, forum metadata, independent
accepted-answer/closed state and the same posting gate in Comms, web, API and inbound email.
[Forum §12.1](../../mr-pass/plan/design-forum.md#121-tracking-and-participant-scale) keeps per-message state for
internal recipients and introduces per-thread markers for public users, including conversions;
public recipients no longer receive a row for every message, in any MAILBOX list, including
unbound internal/private lists. Existing unbound mailboxes retain their access semantics. Internet publication requires an explicit site/category binding and
policy; `isPublic` alone does not publish a mailbox. These are designed extensions, not claims
that today's Mailbox implementation already performs them.

### Home

- **Layout:** landing.
- **Sections:** counters Unread (one chip per account), Flagged, Snoozed due today, Mentions,
  Missed calls, Outbox problems; lists Needs reply (threads where the last message is to me and
  unanswered for a day, Outlook's suggested replies without the AI), Follow-ups due
  (activities `WepEmail` and `WepPhoneCall`), Upcoming meetings with Join, Mailboxes with
  unread, Rooms with unread; shortcuts Compose, New room, Start a call, and Add a mail account
  until one exists.
- **Forms:** `UnreadByAccount` (number cards from `get#ShellCounts`), `NeedsReply` (list;
  `mantle.party.CommunicationServices.find#InboxThreads` with the needs-reply filter),
  `FollowUps` (`WorkEffortAndParty`), `Meetings` (`get#FullCalendarData`), `MailboxesUnread`
  (`mantle.marketing.ContactListServices.find#ContactLists`, new, with my unread counts),
  `RoomsUnread` (`ChatServices.find#Rooms`). Derived from Frappe suite AllInboxes
  (`UnreadByAccount`), Outlook My Day (`NeedsReply`, `FollowUps`, `Meetings`), the Gameplan
  AppRail's unread badges (`MailboxesUnread`) and the Nextcloud Talk home (`RoomsUnread`).
- **Source:** research §4 (Nextcloud Mail dashboard widgets, Nextcloud Talk home), §8 Frappe suite
  AllInboxes; Outlook's My Day pane.

### Inbox

- **Layout:** split as `.qvue` with three regions and a composer dock:
  - **Rail** (240 px, collapsible to icons): Compose; views Unified inbox, Flagged, Snoozed,
    Scheduled, Drafts, Sent, Archive, Spam, Trash, Outbox; then each account with its folders
    and unread counts, its labels, and the Internal account (Received, Sent, Comments on my
    records, then my mailboxes with unread counts, Browse mailboxes and New mailbox); saved
    searches; a quota line per account.
  - **List** (the thread list; messages mode by preference): dense rows with sender or
    recipients, subject, snippet, date, flags, labels, attachment icon and a snoozed-until or
    scheduled-for chip; hover quick actions archive, delete, read or unread, snooze; a checkbox
    column with shift-range selection and a select-all with "all N in this view"; grouped by
    date (Today, Yesterday, This week, …); a virtual list that pages as it scrolls. In a
    mailbox the list has the mailbox header above it (`MailboxHeader`) and each row shows the
    reply count and a Closed chip.
  - **Reading pane** right, bottom or off (Zimbra's three layouts; the preference in
    Preferences, a toggle in the toolbar): the thread with older messages collapsed, "expand
    all", a per-message action bar (reply, reply all, forward, flag, snooze, move, label, mark
    unread from here, print, view source, block sender, unsubscribe, report spam, create task or
    request or event, link to a record; in a mailbox Reply goes to the mailbox, Reply to sender
    sits beside it, and moderators have Close thread), the sender's contact card on hover (the
    party when known, "Add to contacts" when not), remote images blocked until "show images" or
    the sender is trusted, an attachments strip (preview, download, save to Files, open in
    Office later), an iMIP card for invitations (Accept, Tentative, Decline, add to calendar), a
    linked-records strip ("On Order SO10023 · Case 1182"), and the Assist actions Summarize and
    Draft a reply (which open the Assist drawer with the thread as context).
  - **Composer dock** (Compose, below) at the bottom right; several drafts minimized side by side.
  - **Search:** one line with operators (`from:`, `to:`, `subject:`, `has:attachment`, `label:`,
    `in:`, `before:`, `after:`, `is:unread`, `is:flagged`, `larger:`) and an advanced popover with
    the same fields; results are a view with the query shown as chips; Save search makes a rail
    entry.
  - **Keyboard** (Gmail-compatible defaults, complete, editable): `j` `k` move, `o` or Enter
    open, `u` back, `e` archive, `#` delete, `r` `a` `f` reply, reply all, forward, `s` flag, `b`
    snooze, `l` label, `v` move, Shift+I and Shift+U read and unread, `x` select, `*` `a` and `*` `n`
    select all and none, Shift+J and Shift+K ranged select, `n` `p` next and previous message in
    the thread, `c` compose, `/` search, `z` undo, `g` `i` `g` `s` `g` `t` `g` `d` `g` `a` go to inbox,
    flagged, sent, drafts, all mail, `g` then typing jumps to any folder or label by name,
    Ctrl+Left and Ctrl+Right move focus between rail, list and pane, `]` and `[` archive and open
    next or previous, `Enter` on a selection opens the first, `?` the overlay. "Archive opens next"
    and "mark read after n seconds" are preferences.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `MailFind` | find | The search line and advanced popover | text with operators, account, folder, mailbox, label, from, to, subject, has attachment, date period, unread, flagged, size | operator chips; `date-period` | `mantle.party.CommunicationServices.find#InboxThreads` (new), which calls `org.moqui.impl.EmailClientServices.find#Messages` (new) over `EmailMessage` and the search index and reads the internal threads | Nextcloud Mail SearchMessages; Zimbra search toolbar and saved searches; Gmail operators |
| `ThreadList` | list | The rows of the view | participants, subject, snippet, date, flags, labels, attachment, snooze or schedule chip, unread; in a mailbox the reply count and Closed | `q-virtual-scroll`; hover actions; `row-selection` with range | `find#InboxThreads`, grouped by `rootEmailMessageId` for mail and `rootCommEventId` for internal messages | `MyAccount` `FindMessage` `MessageList` (the Internal account); Nextcloud EnvelopeList; Zimbra ConvListView; Gameplan DiscussionList; Redmine boards; Gmail and Outlook lists |
| `ThreadView` | component | The reading pane | per message: from, to, cc, date, body, attachments, status (`ES_SENT`, `ES_RECEIVED`, `ES_VIEWED`, `ES_BOUNCED`), linked records; the mailbox of a post | sanitized HTML in an isolated frame (`m-html-view`, §19); quoted text collapsed | `EmailClientServices.get#Thread` (new) for mail; `mantle.party.CommunicationServices.get#InternalThread` (new) for internal messages and posts; `set#MessageFlags` or `set#InternalMessageState` (new) marks read; `mantle.party.CommunicationServices.close#ListThread` (new: sets the first post to `CeResolved`, for moderators) | `MyAccount` `MessageThread`, `SingleMessage`; Nextcloud Thread and Message; Zimbra ConvView2; Gameplan DiscussionView; Redmine messages |
| `Snooze` | dialog | Hide until | later today, tomorrow, this weekend, next week, pick a date and time | | `EmailClientServices.snooze#Messages` (new) for mail, `set#InternalMessageState` for internal messages; a job returns them | Nextcloud snooze; Gmail snooze |
| `MoveTo` | dialog | Move the selection (mail only; internal messages have labels, not folders) | folder with type-ahead across accounts | | `EmailClientServices.move#Messages` (new; IMAP MOVE for external accounts) | Zimbra ChooseFolderDialog; Gmail move to |
| `Labels` | dialog | Apply labels | labels with a create line | | `EmailClientServices.apply#Labels` (new) for mail, `set#InternalMessageState` for internal messages | Nextcloud TagModal; Gmail labels |
| `LinkToRecord` | dialog | File the thread on a record | party, order, request, task, project by id or search | `lookup#ById`, `search#Universal` | `mantle.party.CommunicationServices.link#CommunicationEventRecord` (new): creates or finds the `CommunicationEvent` for the message and writes the record join | Odoo "log on document"; HubSpot and Salesforce email logging |
| `CreateFromMessage` | dialog | A task, request or event from the message | name from the subject, description from the body, party from the sender, due | the `QuickCreate` forms with prefill | `create#SimpleTask`, `create#Request`, `create#Event` plus the message link | Zimbra `CREATE_TASK` and `CREATE_APPT`; Nextcloud create from Talk; Outlook drag to tasks |
| `ImipCard` | single | Answer an invitation | accept, tentative, decline; add to calendar | | `mantle.work.EventServices.respond#EventInvitation` with the parsed iCalendar; `create#Event` for an external organizer | Nextcloud Imip; Gmail and Outlook invitation cards |
| `ContactCard` | single, read | Who this is | name, organization, email, phone, presence, recent threads, Open contact or Add to contacts | | `mantle.party.ContactServices.get#PartyContactInfo`; `search#Party` by email | Nextcloud DisplayContactDetails; Outlook people card |
| `BulkActions` | list, bulk | On the selection | archive, delete, read, unread, flag, move, label, snooze, spam, link to record | | the services above, by store | Gmail and Outlook bulk bars |
| `MailboxHeader` | component | The open mailbox | name, description, member avatars and count, public or private, my delivery, Join, Request to join or Leave, settings | | `mantle.marketing.ContactListServices.join#ContactList`, `leave#ContactList`, `set#ContactListPartyDelivery` (new) | Gameplan Space header; Google Groups group header; Slack channel header |
| `BrowseMailboxes` | dialog | Find a mailbox to join | search; public mailboxes and my private ones: name, description, members, last post, joined | | `ContactListServices.find#ContactLists` (new) with type `MAILBOX`; `join#ContactList` | Slack channel browser; Google Groups directory; Talk open conversations |
| `NewMailbox` | dialog | A mailbox | name, description, public or private, posting policy, default delivery, members | members `server-search` over users | `ContactListServices.create#ContactList` (new) with type `MAILBOX`; `add#ContactListParty` (new) | Gameplan NewSpaceDialog; Frappe suite MailingListsView; Google Groups create group |
| `MailboxSettings` | dialog | Sectioned settings | name, description; public or private; posting policy; default delivery; my delivery; archive; delete while it has no posts (owner) | | `ContactListServices.update#ContactList`, `set#ContactListPartyDelivery` | §13 `RoomSettings`; Talk ConversationSettingsDialog; Google Groups settings; Microsoft 365 group settings |
| `MailboxMembers` | list, editable rows | Who is in it | name, role (owner, moderator, member), delivery, joined; pending requests with Accept and Decline (`CLPT_REJECTED`); add, remove | | `ContactListServices.add#ContactListParty` (also accepts a pending request), `remove#ContactListParty` (new) over `ContactListParty` | §13 `Members`; Talk Participants; Google Groups members |

- **Actions:** Compose (`c`); Sync now; the per-message bar above; Unsubscribe uses the
  `List-Unsubscribe` header (one-click POST when `List-Unsubscribe-Post` is present, else the
  mailto or URL); Report spam moves to Spam and tells the gateway when it supports learning;
  Block sender adds a rule; Print and View source open `MessageDetail`.
- **Navigation:** from the launcher, the header Inbox count, the palette's Messages and rooms
  group, a Chatter message ("Open thread"), a notification of new mail or a mailbox post (when the
  topic is on), a 360's Emails tab (which opens the thread under its app path), a mailbox from
  the palette's Messages and rooms group or Comms Home.
- **Views:** Unified, per account and folder, label, Flagged, Snoozed, Scheduled, Drafts, Sent,
  Archive, Spam, Trash, Outbox (queued, scheduled and failed sends with retry and the delivery
  error), Internal, each mailbox, search results; thread or message mode; reading pane right,
  bottom or off.
- **States:** no account: a setup card (Add account) with the Internal account still usable;
  first sync: skeleton rows and "Syncing 1,204 of 8,000"; an account whose credentials failed
  shows a warning chip in the rail with "Fix"; a shared account member without send rights sees
  no Compose from it; a message that is still only on the server (POP without body) loads on
  open; a public mailbox I have not joined shows its threads read-only with Join, and a private
  one only its header with Request to join; in a help mailbox I post to without being a member I
  see only my own threads; a closed thread shows Closed and no reply box; an archived mailbox
  is read-only and leaves the rail.
- **Devices:** phone: the rail is a drawer, the list is the screen, a thread opens full
  screen, swipe left and right run the two preferred actions, compose is full screen.
- **Source:** research §8 (Nextcloud Mail, Zimbra mail, Frappe suite mail and mailing lists),
  §13 (Gameplan Discussions, OpenProject forums, Redmine boards), §17 Messages screens and
  `EmailMessage`, §18 "No mail client"; Gmail and Outlook on the web for the shape people
  expect, Google Groups and Microsoft 365 group mailboxes for mailboxes; the author's Gmail
  keyboard complaints for the gaps closed above.
- **Needs:** Mail account model; Email client services; Internal message state; Mailboxes; IMAP and
  POP poller with incremental sync; SMTP send through the account; SMTP listener behind the
  gateway; OAuth client and token store; `m-html-view`; Keymap registry; Search DataDocuments
  (`MoquiEmailMessage`, `MantleCommunicationEvent`); Snooze and scheduled-send jobs; iCalendar,
  vCard and iMIP tool; Today and timeline services (`link#CommunicationEventRecord`); Record
  cards; Presence and status.

### Compose

- **Layout:** editor as `.qvue`: a dock card at the bottom right (Gmail), with minimize,
  pop out to a dialog (900 px) and full page (`Comms/Inbox/Compose?emailMessageId=` for a
  draft, `mailto:` handling and the quick-create entry); several docks side by side. Fields:
  From (an identity of an account; the Internal account for internal messages), To, Cc, Bcc
  (chips with autocomplete over parties' email addresses, recent correspondents, contact groups
  that expand, and users and mailboxes for internal; the Internal identity takes users and
  mailboxes, an email identity takes addresses; a mailbox chip does not expand, because the
  mailbox delivers to its members, and a message to two mailboxes is posted in each), Subject,
  the body (`m-rich-text`, §19: paragraphs, bold and italic, lists, links, inline images, quotes,
  code, a plain-text toggle), the signature of the identity (above or below the quote by
  preference), attachments (drop, pick, or Attach
  from Files, which inserts a share link above a size limit), text blocks (`/` opens the
  picker), a "File on <record>" chip when opened from a record or Chatter, and the send row:
  **Send** (Ctrl+Enter), Schedule send (presets and a picker), Send and archive, Discard; Undo
  send holds the message in Outbox for the preferred seconds (5 to 30) with an Undo toast.
  Drafts autosave every few seconds to the account's Drafts folder as `ES_DRAFT`. Reply and
  forward inherit the thread (`parentEmailMessageId`, `In-Reply-To`), the quote and the
  attachments of a forward; a reply to an internal message is an internal message, a reply to
  a mailbox post goes to the mailbox, and Reply to sender answers the sender only, off the mailbox.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `Compose` | single | The message | from identity, to, cc, bcc, subject, body, attachments, record link, schedule | recipient chips with `server-search`; `m-rich-text`; `file` drop | `org.moqui.impl.EmailClientServices.save#Draft`, `send#Draft` (new; the latter calls `org.moqui.impl.EmailServices.send#EmailMessage`), and with a record chip `mantle.party.CommunicationServices.send#EmailDraft` (new: `send#Draft`, then the `CommunicationEvent` with `emailMessageId` and the record join, which the framework service cannot write); internal: `mantle.party.CommunicationServices.create#Message` (extended: to and cc lists and `contactListId`; writes the `CommunicationEventParty` rows), `reply#CommunicationEvent` (extended: keeps the parent's type, which today always becomes `Comment`, and the mailbox, or answers the sender only) | `EditMessage` `MessageForm`, `ReplyMessageForm`; `FindMessage` `CreateMessage`; Nextcloud Composer; Zimbra ComposeView; Frappe ComposeDock; Gmail compose |
| `AttachFromFiles` | dialog | Pick from Files | the Files list in a dialog | | `FileServices.list#Folder` | Nextcloud filePicker; Google Drive attach |
| `TextBlockPicker` | dialog | Insert canned text | search, personal and shared blocks | | `EmailTextBlock` (`entity`) | Nextcloud text blocks; Outlook quick parts |
| `ScheduleSend` | dialog | When to send | tomorrow morning, Monday morning, pick | | `send#Draft` with `scheduledSendDate`; the scheduler job sends | Nextcloud and Gmail schedule send |

- **Actions:** Send, Schedule, Send and archive, Save draft, Discard (confirms when not empty),
  Pop out, Minimize; a bounced send shows in Outbox with the error and Retry.
- **Source:** research §8; baseline `EditMessage`; Gmail and Outlook compose.
- **Needs:** Email client services; Internal message state; Mailboxes; `m-rich-text`; File
  services; Snooze and scheduled-send jobs (scheduled send and the undo-send hold in Outbox).

**Per-app context (email sending).**

| App | Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- | --- |
| Comms | the composer | none | all | personal mail |
| Customer Service | the composer from a case with the case's party and record chip; text blocks of the support group; the case id in the subject | the case | send, send and resolve | canned replies |
| Marketing | the composer is not used; campaign sends use `EmailTemplate` and `ContactList` (design-marketing); consent (§16) gates recipients | | | |
| Accounting, Sales, Purchasing | the composer from a record with the document attached (invoice, quote, purchase order PDF) | the record | send | the attachment |

### MessageDetail

- **Layout:** detail as XML: a header card (from, to, cc, bcc, date, message id, account and
  folder, status chip from the `EmailMessage` flow, type `EMT_*` for system mail, template,
  server), the body (`m-html-view`), attachments, linked records and communication events, and
  the raw headers and source in a collapsed box. For mail the system sent (notifications, order
  and invoice emails, authentication codes) this is where Admin and Accounting see what went out.
- **Forms:** `MessageHeader` (single, read), `Attachments` (list), `LinkedRecords` (list:
  `CommunicationEvent` rows by `emailMessageId` and their joins), `Source` (display); services
  `EmailClientServices.get#Thread` for the one message and the actions below. Derived from
  `PartyEmails` `EmailMessageList` (its resend), `MyAccount` `SingleMessage`, the tools
  component's email message screens and Zimbra "show original".
- **Actions:** Open in Inbox, Reply (Compose), Resend (`org.moqui.impl.EmailServices.send#EmailMessage`,
  for `ES_BOUNCED` and system mail; confirms), Download `.eml`, Print (`html-print`), Link to
  record.
- **Source:** research §17 `PartyEmails` `EmailMessageList`; the tools component's email
  message screens; Zimbra "show original".

## 13. Chat

Chat is Slack and Teams inside the suite, over the framework's Matrix-style store
(initial-design): a **room** (`ChatRoom`, new, §19) is a direct message, a private or public
group, or a room bound to a record (a case, a project, an order), with **members**
(`ChatRoomMember`: users, and later agents) and an append-only **timeline** of events
(`ChatEvent`: message, edit, reaction, redaction, membership, pin, call, poll), which is also
what the WebSocket pushes and what the search index reads. Chat messages are not
`CommunicationEvent` rows (the research's open question): a message becomes one only when a
user links it to a record or turns it into a task, request or event, and a record-bound room's
recent messages appear in that record's Chatter through the same component. Presence, typing
and read markers ride the notification WebSocket. A room is for talk now; its asynchronous
counterpart is a **mailbox** in the Inbox (§12), a shared list or forum whose threads wait to be
answered, and the two stay separate stores.

### Chat

- **Layout:** split as `.qvue`: a rail (search, filter chips Unread, Mentions, Direct, Rooms,
  Records; pinned rooms; the rooms with unread and mention badges, presence dots and a draft
  pen; New: direct message, room, join a public room), the room (header with name, topic,
  members, presence, Call, search in room, pin, settings; a day-grouped virtual timeline with
  sender grouping, the unread divider, read markers, typing indicators and jump to latest;
  message parts: text with mentions, link previews, file and image previews, record cards (an
  id such as `SO10023` or a pasted BOSS link renders a card through `lookup#ById`), system
  rows), a thread panel on the right when a thread is open, and the composer (`m-rich-text`
  light: `@` mentions, emoji, attachments by drop or picker, `/` commands such as `/task`,
  `/remind`, `/call`; Enter sends by preference). A right sidebar with tabs Members, Pinned,
  Files, Threads and, for a record-bound room, Record. The keys: Alt+Up and Alt+Down rooms,
  Alt+Shift+Up and Down unread rooms, Esc marks read and clears the thread, Up edits my last
  message, Ctrl+K opens the palette whose `#` prefix is the room switcher.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `RoomFind` | find | The rail | text, filter chips | | `org.moqui.impl.ChatServices.find#Rooms` (new) | Talk LeftSidebar; Signal left pane; Slack sidebar |
| `RoomList` | list | Rooms | avatar and presence, name, last message, time, unread and mention badges, pinned | `q-virtual-scroll` | same | same |
| `Timeline` | list | The room's events | sender, time, body, reactions, thread count, edited, pinned | virtual list with day headers; reactions picker; message action bar; record cards | `ChatServices.get#Timeline` (new; paged by event id); `mantle.GeneralServices.lookup#ById` for the record cards | Talk MessagesList; Signal Timeline; Odoo Discuss |
| `Composer` | single | A message | body, attachments, reply to | `m-rich-text` light; drop zone | `ChatServices.send#Message`, `edit#Message`, `redact#Message`, `react#Message`, `upload#Attachment` (new) | Talk NewMessage; Signal CompositionArea; Slack composer |
| `NewDirect` | dialog | A direct message | people (one or several) | `server-search` over users and the directory | `ChatServices.create#Room` type direct | Talk and Signal new chat |
| `NewRoom` | dialog | A room | name, topic, type (private, public, record-bound with the record), members | | `create#Room` | Talk NewConversationDialog; Slack create channel |
| `RoomSettings` | dialog | Sectioned settings | name, topic, avatar; visibility and who may join; notifications level for me (all, mentions, none); members and roles (owner, moderator, member, agent); retention; record binding; leave, archive, delete (owner) | | `ChatServices.update#Room`, `set#MemberRole`, `set#Notification` (new) | Talk ConversationSettingsDialog; Signal conversation details; Slack channel details |
| `MessageActions` | component | Per message | reply in thread, react, edit, delete, copy link, pin, forward, remind me (an activity `WepToDo`), create task, request or event, link to record, mark unread from here | | `create#SimpleTask`, `create#Request`, `create#Event` with the message text; `link#CommunicationEventRecord` | Talk MessageButtonsBar; Nextcloud create task from Talk; Slack message menu |
| `Members` | list | Who is here | name, presence, role; add, remove, change role | | `ChatServices.add#Member`, `remove#Member` | Talk Participants |
| `Poll` | dialog | A poll in the room (the composer's poll button or `/poll`), shown as a card to vote on | question, 2 to 10 options, anonymous, multiple, closes | | `ChatServices.create#Poll`, `vote#Poll`, `close#Poll` (new) | Talk PollCard; Gameplan polls |

- **Actions:** New direct message, New room, Join; room: call, search, pin, mark read, mute,
  leave; message: the action bar.
- **Navigation:** from the launcher, the header Chat badge and tray tab, the palette's
  `#` prefix, a mention notification, a record's Chatter ("Open room"), a Contact record
  ("Chat").
- **States:** no rooms: "Start a conversation" with the people picker; a public room not joined
  shows its timeline read-only with Join; a message the sender deleted shows "message removed";
  offline: a banner says so, the composer queues each message in the page's outbox and its row
  shows "Sending…", "Waiting" or "Not sent" (Retry, Delete) until it goes; no files go up offline.
- **Devices:** phone: the rail is the screen, a room opens full screen; push notifications
  through the PWA later.
- **Source:** research §6 (Nextcloud Talk, Signal Desktop, Odoo Discuss, Zimbra IM), §18 "No chat";
  Slack and Teams for the shape people expect.
- **Needs:** Chat store (polls included); Chat services; Presence and status; `m-rich-text`; Search
  DataDocuments (`MoquiChatEvent`); Record cards; Assist drawer (agent members, later).

## 14. Calls

Calls and video meetings run on WebRTC built into mr-moqui (initial-design): the framework
provides the signaling over the notification WebSocket, the STUN and TURN configuration, and a
`CallSession` record (new, §19) per call with its participants; a finished call writes a
`CommunicationEvent` of the new type `Call` (duration, participants, the room, and the record
when the room is bound to one) so it appears in Chatter and in call history. A **call link**
(`CallLink`) is the meeting front door: a URL anyone with the link may open, with a lobby that
a member of the call's chat room admits guests from; a meeting is a calendar event (a
`WetEvent` with purpose `WepMeeting`) with a call link.

### Calls

- **Layout:** list with tabs History, Call links, Upcoming meetings.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `CallHistory` | list | My calls | direction, with whom or room, started, duration, missed chip, recording (later) | Call back inline | `org.moqui.impl.CallServices.find#Calls` (new) over `CallSession` | Signal CallsList; Zimbra voice call history; Teams calls |
| `CallLinks` | list | Meeting links I made | name, link, expiry, who may join (members, anyone with the link, lobby), used | create, copy, revoke | `CallServices.create#CallLink`, `revoke#CallLink` (new) | Signal call links; Meet and Teams meeting links |
| `UpcomingMeetings` | list | Events with a call link | when, name, organizer, Join | | `get#FullCalendarData` filtered to `WepMeeting` with a link | Talk upcoming meetings; Frappe Meet home |

- **Actions:** New call (a people picker; opens Call), New call link, Call back, Join.
- **Source:** research §7.

### Call

- **Layout:** task archetype as `.qvue` (one thing at a time, large controls): the **lobby**
  (camera preview, microphone and speaker pickers with a level meter, blur background later, a
  name field for guests, Join; a guest waits for admission), then the **call view** (grid or
  speaker view, tiles with name and mute state, the bottom bar: mute, camera, share screen,
  raise hand, reactions, participants, chat (the room's timeline in a side panel), settings,
  Leave; the call time and a recording chip later; an "admit" prompt for guests in the lobby).
  Leaving a call while navigating shrinks it to the mini-window (§4 LiveCall). Full screen below
  1024 px.
- **Forms:** `Lobby` (single: devices, name), `CallControls` (component), `Participants` (list
  with mute and remove for moderators), `InCallChat` (the Chat composer and timeline), `AdmitGuest`
  (dialog). Derived from Talk CallView, MediaSettings and lobby, Signal's lobby and call screen,
  and Frappe Meet's side panels.
- **Services:** `org.moqui.impl.CallServices.start#Call`, `join#Call`, `leave#Call`,
  `admit#Guest` (new); signaling messages over the WebSocket.
- **States:** no camera or microphone permission: the lobby explains and offers audio only;
  a call that cannot connect (no TURN path) names it and offers retry.
- **Devices:** phone (single tile, bottom bar).
- **Source:** research §7 (Talk CallView and MediaSettings, Signal lobby and call screen,
  Frappe Meet); Google Meet and Teams join flow.
- **Needs:** WebRTC; Call store and services; `CommunicationEventType` `Call`; Anonymous token
  routes (guest join); Call recording (later).

## 15. Chatter and activities

Chatter is Odoo's timeline beside every record, built once as `Shared/Chatter` and embedded by
the framework's `chatter` element through the `STRT_CHATTER_SCREEN` theme value with
`recordEntity` and `recordId`. Every BOSS app root mounts it hidden as `<App>/Chatter`, and the
element loads it there as its own request, so the app's authz and filters apply; the host screen's
authorization is not in that request, so Chatter first finds the record under the user's filters,
and renders nothing (logged once) and refuses writes when the record is not visible. It reads and writes three kinds of rows: **messages** and
**notes** are `CommunicationEvent`s (email in and out with `emailMessageId`, internal `Message`,
internal `Comment` as the note, `Call`, `Phone`, `FaceToFace`), joined to the record by its own
join entity or the generic `CommunicationEventRecord`; **activities** are `WorkEffort`s
with the purposes `WepPhoneCall`, `WepEmail` and `WepToDo` (tasks) or `WepMeeting` (an event),
joined by the record's join or `WorkEffortRecord`, and they roll up into the Today panel;
**followers** are `RecordFollower` rows (user, record, which kinds notify). The timeline also
shows status changes from the entity audit log (the `enable-audit-log` fields of the record),
files added (`RecordFiles`), and the recent messages of a chat room bound to the record.

Two existing stores are read as well. The baseline's note forms wrote per-record note entities
(`PartyNote`, `WorkEffortNote`, `RequestNote`; Mantle also has `OrderNote` and `FacilityNote`),
and Mantle's own services still write some of them; the timeline shows those rows as notes.
**Log note** always writes a `Comment` communication event, because a comment can carry
mentions, attachments and replies and a `*Note` row cannot, so the `*Note` entities are read and
no longer written from the UI. For a party, the messages are the communication events it is
from or to, or a to or cc recipient of, read through
`mantle.party.CommunicationServices.find#PartyCommunicationEvents` (extended to the recipient
rows of §19 "Internal message state"); posts in a mailbox are left out, since they belong to the
mailbox's members, and reach a record only when linked to it.

### Chatter (`Shared/Chatter`)

- **Layout:** panel as `.qvue`; the right column of a detail or 360 from 1440 px, a tab below.
  Top: the compose bar with three tabs **Send message** (email to the record's parties, or an
  internal message to users), **Log note** (internal), **Schedule activity**; a followers line
  (avatars, count, Follow or Unfollow, Add followers); the **planned activities** block (each
  with type icon, summary, due with overdue in warning, assignee, Mark done, Edit, Cancel); the
  attachments strip (the record's files, Add); then the timeline newest first with filter chips
  All, Messages, Notes, Activities, Changes and a search line; each entry: avatar, author, kind
  icon, time, body (collapsed quotes), attachments, delivery status for email (sent, received,
  viewed, bounced in negative), and the actions reply, forward, open thread, link elsewhere,
  react (chat-bound rooms).
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `SendMessage` | single | Email or internal message from the record | to (the record's parties' emails preselected, users for internal), subject with the record id, body, attachments (the record's files offered), "also post as note" | opens the Compose dock prefilled for email; inline for internal | email: `mantle.party.CommunicationServices.send#EmailDraft` (§12), which sends and writes the record join; internal: `mantle.party.CommunicationServices.create#Message`, `reply#CommunicationEvent`; both write the record join | `MessageThread` and `SingleMessage` `ReplyMessageForm`; Odoo chatter send message; Twenty emails widget |
| `LogNote` | single | An internal note | body (markdown), mentions | `m-rich-text` light | `create#Message` with `communicationEventTypeId` `Comment` and the record join; a mention notifies on topic `ChatterMention` | `EditParty` `NewNoteForm`; `EditRequest` and `TaskSummary` `AddCommentForm`; Odoo log note |
| `ScheduleActivity` | single | A next action | type, summary, due, assignee (default me), note | type toggle | `mantle.work.TaskServices.create#SimpleTask` with the purpose and `assignToPartyId`, or `create#Event` with `WepMeeting` for a meeting (§4 `QuickActivity`); `WorkEffortRecord` or the record's join (`RequestWorkEffort`) | Odoo schedule activity and activity plans |
| `Activities` | list | Planned on this record | type, summary, due, assignee | Mark done opens `MarkDone`; Edit inline | `WorkEffortAndParty` with the record join (`entity`) | Odoo activity list |
| `MarkDone` | dialog | Close an activity with feedback | feedback note, schedule next (type, due) | | `update#Task` to `WeComplete`; the feedback becomes a `Comment`; `create#SimpleTask` for the next | Odoo mark as done popover |
| `Followers` | list | Who is notified | user, which kinds (messages, notes, activities, changes) | add by `server-search` | `RecordFollower` (new) | Odoo followers and subtypes |
| `Timeline` | list | The history | kind, author, time, body, status, attachments | virtual list; `q-timeline` by `render-mode` | `mantle.party.CommunicationServices.get#RecordTimeline` (new): unions the comm events through the joins (for a party through `mantle.party.CommunicationServices.find#PartyCommunicationEvents`), the record's `*Note` rows, the activities done, the audit log rows, the file additions and the bound room's events | `MyAccount` `MessageThread`; `PartyEmails` `EmailMessageList`; Odoo chatter; Nextcloud Activity tab; Twenty timeline |

- **Actions:** send, log, schedule, follow, add followers, add file; per entry: reply, forward,
  open thread (Inbox or Chat), unlink, react.
- **States:** empty: the compose bar and "No messages yet"; a role that may read the record but
  not message sees the timeline without the compose bar; a record type with no join and no
  generic link configured shows no Chatter (the element renders nothing and logs once).
- **Devices:** phone (a tab on the detail).
- **Source:** research §5 (Odoo chatter, activities, followers), §1 Twenty record widgets, §16
  "Chatter & activities"; initial-design's Chatter row, "Maps onto CommunicationEvent + content".
- **Needs:** `chatter`; Generic record links (with `RecordFollower`); Today and timeline
  services (`get#RecordTimeline`, `link#CommunicationEventRecord`); `m-rich-text`; Shell and
  notification topics (`ChatterMention`); Email client services; Record cards.

**Per-app context (Chatter & activities).** Every record screen gets the full component; the
including screen fixes the defaults:

| App | Default compose tab | Extras | Hidden |
| --- | --- | --- | --- |
| Sales, Marketing | Schedule activity | activity plans (call, email, meeting sequences) later | — |
| Customer Service | Send message (email to the customer) | text blocks of the support group; "send and resolve" | — |
| Accounting | Send message with the invoice or statement attached | — | activities |
| Purchasing | Send message to the supplier | — | — |
| Warehouse, Manufacturing, Maintenance | Log note | — | Send message (notes and activities only) |
| Projects | Log note | time logged entries in the timeline | — |
| People | Log note (visible to HR roles) | — | Send message for non-HR roles |
| Commons, Comms | as the record: contacts default to Send message, files and pages to Log note | — | — |

Oct 28, 2026: each Chatter host has its own `*Content` entity, with `ReturnContent` and
`AssetContent` added, and Accounting shows activities on Customer360, Supplier360 and Collections,
hiding them only on InvoiceDetail and the ledger mounts
([design-crosscut §3.14](design-crosscut.md#314-chatter-and-recordfiles), D25).

## 16. Consent and unsubscribe

Consent lives on the data Mantle already has, with a history record added: whether a contact
may be solicited at an address is `PartyContactMech.allowSolicitation`; list membership and
unsubscription are `ContactListParty` statuses (`CLPT_PENDING`, `CLPT_ACCEPTED`,
`CLPT_UNSUBS_PENDING`, `CLPT_UNSUBSCRIBED`, …); and the new `PartyConsent` (§19) records each
grant and withdrawal with its purpose (marketing email, SMS, phone, data processing), source
(form, import, email link, staff), date and evidence text, which is what a larger organization
needs to show. Marketing's audience screens include the same screen; Customer 360 shows the
contact's state read-only. Consent shows the list types that send outside the organization;
a mailbox (`ContactList` type `MAILBOX`, §12) is membership, not consent, and appears here only
once it has external members by email. [Forum §12.4](../../mr-pass/plan/design-forum.md#124-consent-and-opt-out)
now designs this extension: forum delivery opt-out is independent of mailbox membership and
does not use the membership-changing unsubscribe action unchanged.

### Consent

- **Layout:** list with a per-contact edit dialog.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `ConsentFind` | find | Narrow | text, list, status, purpose, changed period, allow solicitation | | | Frappe suite screener; Odoo blacklist |
| `Consents` | list | Contacts and their state | party, email or phone, allow solicitation, list subscriptions as chips, purposes granted, last change and source | bulk: unsubscribe from a list, export CSV | `PartyContactMech`, `ContactListParty`, `PartyConsent` (`entity`) | Mantle `ContactListParty` statuses; Mailchimp and HubSpot subscription status |
| `EditConsent` | dialog | One contact | per address: allow solicitation with reason; per list: subscribe or unsubscribe with source note; per purpose: granted or withdrawn with evidence | | `mantle.party.ContactServices.store#PartyContactMech`; `mantle.party.ConsentServices.store#PartyConsent`, `unsubscribe#ContactListParty` (new) | GDPR consent record patterns |
| `ConsentHistory` | list | The audit | when, what changed, purpose, source, evidence, by | | `PartyConsent` (`entity`) | new; these are the full fields |

- **Source:** research §8 and §18 (consent has data but no screen), crosscut §4 "Email/SMS
  sending, consent, unsubscribe".
- **Needs:** Consent.

**Per-app context (Consent).**

| App | Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- | --- |
| Comms | all contacts | none | edit, bulk, export | the record |
| Marketing | the audience of a list or campaign (design-marketing) | the list | subscribe, unsubscribe, import with consent source | list health |
| Customer Service, Sales | the Consent box on Customer 360, read-only with a link | the party | — | — |

### Unsubscribe

- **Layout:** task archetype, anonymous, at `/u/<token>` (the token names the
  `ContactListParty` and the message): the organization's name, "You are subscribed to …",
  options Unsubscribe from this list, Unsubscribe from all marketing email, Update preferences
  (the lists with checkboxes), one primary Confirm, and a done page. A POST to the same URL
  with `List-Unsubscribe=One-Click` (RFC 8058) unsubscribes without a page. Every change writes
  `CLPT_UNSUBSCRIBED` (or `CLPT_UNSUBS_PENDING` when the list requires confirmation) and a
  `PartyConsent` withdrawal with source "email link".
- **Forms:** `UnsubscribeChoice` (single: this list, all marketing email, update preferences),
  `Preferences` (list, editable rows: list, subscribed). Derived from the Mailchimp unsubscribe
  page and Google Groups subscription settings.
- **Services:** `mantle.party.ConsentServices.unsubscribe#ContactListParty` (new).
- **Source:** Mantle `ContactListParty` flow; Mailchimp and Google Groups unsubscribe pages;
  Gmail's list-unsubscribe handling on the receiving side.
- **Needs:** Anonymous token routes; Consent; `List-Unsubscribe` on list mail (Marketing's sends
  and the framework's `send#EmailTemplate`).

## 17. Comms settings

### Settings

- **Layout:** settings index: Mail accounts, Identities and signatures, Rules, Out of office,
  Text blocks, Chat, Calls; a last card links to Admin's mail domains, relay and gateway pages
  and to Commons Preferences for the mail reading defaults and the key map.

### MailAccounts

- **Layout:** settings page with the accounts list and an **Add account** wizard.
- **Forms:**

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `Accounts` | list | My and shared accounts | name, address, kind (internal, hosted, external, shared), status, last sync, unread, members; the Internal account listed first and not removable | row: pause, sync now, edit, remove | `EmailAccount` (`entity`); `org.moqui.impl.EmailClientServices.sync#EmailAccount` (new) | Nextcloud Mail navigation accounts; Frappe suite mail dashboard accounts |
| `AccountKind` | wizard step | What to add | Hosted account at a hosted domain; External (IMAP or POP and SMTP); Google; Microsoft 365; Shared account | | | Nextcloud Setup; Outlook add account |
| `AccountCredentials` | wizard step | How to connect | address, name; autodiscover by domain; manual IMAP or POP host, port, TLS, SMTP host, port, TLS, user, password; OAuth sign-in popup for Google and Microsoft | `password`; the OAuth popup (framework) | `EmailClientServices.discover#EmailServer`, `create#EmailAccount` (new) over `EmailServer` | Nextcloud AccountForm and OAuth; Thunderbird autoconfig |
| `AccountTest` | wizard step | Prove it works | connect, list folders, send a test message | `q-linear-progress` | `EmailClientServices.test#EmailAccount` (new) | Zimbra AccountTestDialog |
| `AccountOptions` | wizard step | How to sync | folders to sync, sync window (30 days, 1 year, all), folder mapping for Sent, Drafts, Trash, Junk (shown as Spam) and Archive, filing policy (file mail with known contacts on their records, or only what I link; the default by kind, §12), color, default identity and signature, members for a shared account | | `create#EmailAccount`; `EmailAccountUser` (new) | Nextcloud account settings; Outlook shared mailbox |
| `AccountEdit` | single | The same options after creation, plus remove (keep or delete local copies), reauthorize | as `AccountCredentials` and `AccountOptions` | | `update#EmailAccount`, `delete#EmailAccount` (new) | `AccountCredentials` and `AccountOptions` above; Nextcloud account settings |

- **Source:** research §8 (Nextcloud setup and settings, Frappe exchanges), initial-design
  "Email supports both modes".
- **Needs:** Mail account model; IMAP and POP poller with incremental sync; SMTP listener
  behind the gateway; OAuth client and token store; Autodiscover.

### Identities

- **Forms:** `Identities` (list, editable rows per account: address or alias, display name,
  reply-to, default; an internal domain's aliases come from Admin), `Signature` (single:
  `m-rich-text`, placement, use for replies). Services: `EmailIdentity` (`entity`). Derived
  from Nextcloud AliasSettings and SignatureSettings, Zimbra signatures page, Gmail "Send mail
  as".

### Rules

- **Forms:** `Rules` (list: order, name, account, enabled, matched count; drag to reorder; Run
  on existing), `RuleEditor` (dialog: name, account or all, match any or all of the conditions;
  `Conditions` as editable rows: field (from, to, subject, body, has attachment, list id, size,
  any header), operator (contains, is, matches, starts with), value; `Actions` as editable rows:
  move to folder, add label, mark read, flag, forward to, delete, mark spam, create task or
  request for, stop processing). Rules run on the server when the poller or the listener stores a
  message, and on demand over a folder. Services: `EmailRule` (`entity`),
  `EmailClientServices.run#EmailRules` (new). Derived from Nextcloud sieve filter builder, Zimbra
  filter rules, Gmail filters, Outlook rules and sweep.

### OutOfOffice

- **Forms:** `OutOfOffice` (single per account: enabled, from and thru, subject, body for
  everyone, a different body for internal senders, reply once per sender per n days, also decline
  meetings later). Services: `EmailOutOfOffice` (`entity`); the receiver sends the reply.
  Derived from Nextcloud OutOfOfficeForm, Zimbra vacation, Outlook automatic replies.

### TextBlocks

- **Forms:** `TextBlocks` (list: title, shortcut, shared with group, used), `TextBlockEditor`
  (dialog: title, shortcut, body with `m-rich-text`, personal or shared with a user group).
  Services: `EmailTextBlock` (`entity`). Derived from Nextcloud text blocks, Zimbra and Outlook
  quick parts, Gmail templates.

### ChatSettings

- **Forms:** `ChatPreferences` (single: default notification level, sounds, Enter sends,
  show message previews in notifications, auto-away after minutes, show read receipts, typing
  indicators). Services: `set#Preference`. Derived from Talk and Signal settings.

### CallSettings

- **Forms:** `CallPreferences` (single: preferred camera, microphone and speaker (kept in the
  browser, since they are per device), ringtone, join muted, camera off on join, background
  blur default). Services: `org.moqui.impl.UserServices.set#Preference` for everything but the
  devices. Derived from Talk MediaSettings, Signal calls settings, Teams devices.

## 18. Documents and outputs

| Output | Kind | From screen | Derived from |
| --- | --- | --- | --- |
| Event invitation, update and cancellation with an `.ics` part (iMIP) | email | EventDetail, Calendar | Nextcloud and Zimbra iMIP; RFC 5546 |
| Event reminder | notification, email | reminders job | Zimbra reminders |
| Share notification ("Jane shared a folder with you") with the link | email, notification | Files Share dialog | Nextcloud sharebymail |
| Notification digest (daily per topic preference) | email | notifications job | Nextcloud Activity digest; OpenProject reminders |
| Mention notification (chat, Chatter) | notification, email by preference | Chat, Chatter | Odoo and Slack mentions |
| Out-of-office reply | email | receiver | Nextcloud and Outlook |
| Contact export (vCard 4.0, CSV in the Google Contacts column set) | export | Contacts, ContactBooks | Nextcloud and Zimbra export |
| Contact import (vCard, CSV with mapping) | import | ContactImport | §6 |
| Calendar export and subscribe (`.ics`, the CalDAV and public URL) | export | Calendar, Calendars | Nextcloud publish and subscribe |
| Calendar import (`.ics` file into a calendar) | import | Calendars | Nextcloud import |
| Printed calendar (day, week, month, agenda) | `html-print` | Calendar | Zimbra CalPrintDialog; Outlook print styles |
| Printed contact or contact book | `html-print` | ContactDetail, Contacts | Zimbra print |
| Message print and `.eml` download; `.mbox` export of a folder | `html-print`, export | MessageDetail, Inbox | Zimbra show original; Gmail export |
| Message import (`.eml`, `.mbox` into a folder) | import | MailAccounts | Thunderbird import |
| Wiki page PDF and markdown export; space export as HTML | `html-print`, export | Knowledge | Redmine and Collectives export |
| Drive or version-controlled space export as a bare git repository (`export#GitRepository`); a folder drive as a zip | export | Drives, SpaceSettings | git bare clone; Google Drive download of a shared drive |
| File download, folder as zip, public link | export | Files, PublicShare | Nextcloud and Drive |
| Consent export (CSV) | export | Consent | Marketing suppression lists |
| Unsubscribe confirmation | email | Unsubscribe | Mailchimp |
| Call summary (participants, duration) in Chatter | record | Call | Twenty call recordings widget (summary only, no recording) |

## 19. Framework and data needs

What mr-moqui and Mantle must gain for the screens above. Items that style-guide §8 already
lists keep its name and add what this file learned; the rest are new. The crosscut design
rolls this table up with the other files'. Kinds are those of design-doc-guide §8. Entity
filters do not apply to `moqui.*` entities and Mantle has none on `ContactList`, so the visibility
of mail accounts and folders, chat rooms, drives, shares and mailboxes is checked in their services
from the owner and member rows, and screens read those records through the services, not with a
bare `entity-find`.

### Shell and chrome

| Need | Kind | Proposed as | Used by | Stub spec |
| --- | --- | --- | --- | --- |
| Shell elements (style-guide §8) | shell item | `m-qapps-root`: launcher, search button, quick create, Today, Chat, Mail and Messages counts, Notifications, Assist toggle; badges from a `shellCounts` object | all | the elements of §1.2; the account menu gains status and the Preferences and Account links; the counts come from the service named by the theme value `STRT_SHELL_COUNTS_SERVICE`, empty when it is not set |
| Tray panel frame (style-guide §2.4) | shell item | A right panel in the canvas; tabs from `STRT_TRAY_TODAY`, `STRT_TRAY_CHAT`, `STRT_TRAY_NOTIFICATIONS`; open state, tab and scroll kept in the root; Esc closes; full width below 600 px; a per-tab WebSocket topic refreshes it | §4 panels | §1.4 |
| Shell providers | XML Screen element | `<shell-providers>` in an app root: `<quick-create label icon screen parameter-map>`, `<today-source service>`, `<palette-action label icon screen>`, `<palette-type doc-type>`, `<palette-source group service prefix id-pattern sequence>` (a palette group: the service takes `text`, `limit` and `docTypes` and returns rows of title, subtitle, icon and link), `<notification-topic topic>`, `<keymap scope>`, `<account-menu-item label icon screen sequence>`; a `<quick-create>` with no `screen` opens `STRT_QUICK_CREATE` with its `kind`; aggregated by a `shellData` webroot transition, fetched once per page load, for the apps the user may open, with their menu titles to depth two (the palette's Screens group), the shell theme values and the first counts; menu data stays per path, and an app root that fails is logged and left out | every app | §1.2, §1.5 |
| Screen context | XML Screen element | `<context record-entity record-id title selection-form/>`; the root exposes `screenContext` {path, parameters, record, selection, filters, forms}, bound on the client over the screen's actions data since screens are server-static | every detail, 360, list | §1.6 |
| Assist drawer | shell item | The Phase 13 port of the Java panel into a right `q-drawer` with the inputs of §1.3: screen context, canvas placement, running tasks, the reach list `assistReach`, agent entry point for chat rooms | all | §1.3; until the port the slot is reserved without a toggle, and the screen context and `assistReach` come first |
| Palette | shell item | `q-dialog` with the groups of §1.5, prefixes, Recent, Ctrl+K; the groups beyond Recent, Screens, Saved finds and Actions from the `<palette-source>` providers | all | §1.5 |
| Quick create frame | shell item | The `+` menu from the providers; opens `STRT_QUICK_CREATE` (`Commons/QuickCreate`) or a provider's screen in an `m-dialog` with the context as parameters | all | §1.5 |
| `shellCounts` topic and `get#ShellCounts` | service type + shell item | `mantle.party.PartyServices.get#ShellCounts` (today, overdue, chat unread and mentions, email (unread external mail), messages (unread internal messages and Inbox-delivered mailbox posts), notifications (the Notifications inbox plus approvals), approvals, updates (the Updates inbox); written over the new state rather than extending `get#UserNoticeCounts`, which counts declined events and completed tasks and reads messages by `toPartyId` only) and the framework service `org.moqui.impl.ShellServices.publish#ShellCounts`, which calls the service named by `STRT_SHELL_COUNTS_SERVICE` in the user's qapps theme and sends a non-persisted notification on the WebSocket topic `shellCounts`, coalesced per user; the EECAs and SECAs on the entities those counts read call it | header badges, Home counters | BOSS seeds `STRT_SHELL_COUNTS_SERVICE` with this service's name, so the framework calls it without depending on Mantle |
| Shell and notification topics | seed data, shell item | `NotificationTopic` seed rows `ChatterMention`, `ChatMention`, `WorkEffortReminder`, `WikiPageReview`, `FileShare` and `NewMail` (mail, internal messages and the mailbox posts delivered to the Inbox) with their title and link templates and receive defaults; the WebSocket topics `shellCounts`, `todayItems`, `notifications` (exists), `userStatus`, `chatRoom:<id>` and `chatUser:<id>`, each named once here with its payload | panels, Chatter, Chat, Knowledge, Files, Inbox | §1.4 |
| Presence and status | shell item + data model | `moqui.security.UserStatus` {userId, statusEnumId (online, away, dnd, invisible), statusText, emoji, clearAtDate, lastActiveDate, inCall}; topic `userStatus`; auto-away from client idle; shown by an `m-avatar` wrapper that draws the dot | account menu, Chat, Chatter, Contacts | §1.8 |
| Keymap registry | shell item | `moqui.keymap`: global bindings, `registerScope(scope, bindings)` from a screen or `.qvue`, the `?` overlay, user overrides from the `KEYMAP` preference, conflict resolution by scope; the Inbox and Chat sets of §12 and §13 as the first scopes | Inbox, Chat, Calendar, Files, Knowledge, all | §1.7 |
| `number-card` | XML Screen element | as style-guide §8 | Commons Home, Comms Home | style-guide §8 |
| `container-split` | XML Screen element | as style-guide §8 | Contacts, Knowledge | style-guide §8 |
| Wizard panel | XML Screen element | style-guide §8 "Wizard and stack panels" | ContactImport, MailAccounts | style-guide §8 |
| List views | XML Form element | as style-guide §8 (`view-board`, `view-calendar`) | Tasks, Calendar | style-guide §8 |
| `status-bar` | XML Screen element | as style-guide §8 | TaskDetail, RequestDetail (crosscut) | style-guide §8 |
| `chatter` | XML Screen element | style-guide §8, embedding the subscreen of the current app root named by `STRT_CHATTER_SCREEN` (`Chatter`, which every BOSS app root mounts from `Shared/`) with `recordEntity` and `recordId`, so the framework stays Mantle-free and the app's authz applies; nothing when the theme value is empty | every record screen; EventDetail, Files, Knowledge | style-guide §8; §15 |
| `record-files` | XML Screen element | style-guide §8 "Record files", embedding the subscreen named by `STRT_RECORD_FILES_SCREEN` (`RecordFiles`) the same way | every record screen; EventDetail, Knowledge | style-guide §8; §9 |
| Material Symbols | icon set | as style-guide §8 | every screen | style-guide §8 |
| Anonymous token routes | shell item | Webroot mounts `/s/<token>` (public share), `/u/<token>` (unsubscribe), `/call/<token>` (guest join) that render a named screen in a public shell (Vue, Quasar, the theme and the `m-*` components, no header, drawers or session; a qvt or `.qvue` screen today runs only inside `m-qapps-root`) with the token checked by a service before any data | PublicShare, Unsubscribe, Call | |
| App passwords | data model + tool | `moqui.security.UserAppPassword` {userId, name, passwordHash, createdDate, lastUsedDate, revokedDate}: a per-user password for DAV and SFTP clients, accepted by the protocol servers and not by the web login | Sync | |
| PWA manifest and push | shell item | A manifest and service worker so Comms installs on a phone; web push for chat and mail notifications | Chat, Inbox, Today | later |

### Components and render

| Need | Kind | Proposed as | Used by | Stub spec |
| --- | --- | --- | --- | --- |
| `m-rich-text` | Vue component | Tiptap in a wrapper with the `m-*` model contract: formatting, lists, links, images, mentions (`@` over a search URL), code, quotes, a plain-text toggle; a `light` mode for chat and notes; the same editor gains Yjs collaboration as `m-coedit` | Compose, Chat composer, Chatter, Identities, TextBlocks | `text-area editor-type="html"` (q-editor) is the fallback |
| `m-coedit` and the `yrs` server | Vue component + tool | `m-rich-text` with `@tiptap/extension-collaboration` over a `yrs` sync server in mr-moqui on the notification WebSocket; the document store `moqui.resource.CollabDocument` (CRDT state, rendered snapshot, metadata, compaction), per initial-design | Knowledge, Notes | style-guide §8 "Co-editing editor" |
| `m-html-view` | Vue component | Sanitized HTML (DOMPurify, the Assist port vendors it) rendered in a sandboxed iframe with a CSP, remote images blocked until allowed, links opened outside, dark-mode aware | Inbox, MessageDetail, Chatter | |
| `m-avatar` | Vue component | A `q-avatar` from a party's `PcntFaceImage` or initials, with the presence dot | everywhere | |
| Record cards | Vue component | `m-record-card`: a compact card for an entity and id (type icon, title, status chip, one or two key fields, the link under the viewer's app) from `mantle.GeneralServices.lookup#ById` (extended to requests and communication events, which it does not return today) and the record's title | Chat, Chatter, Inbox linked-records strip | an id such as `SO10023` or a pasted BOSS link in a message renders one |
| Print documents | render mode | `html-print` templates for the calendar range, a contact, a message, a wiki page | §18 | style-guide §8 |
| Search DataDocuments | seed data | `MoquiEmailMessage` (subject, bodies, addresses, labels, account, folder), `MoquiChatEvent` (room, sender, body), `MoquiDriveFile` (drive, path, name, type, modified by, tags, extracted text later; indexed by `FileServices` on each write, move and trash and by the fetch job for a mirror's changed paths, since a file in a version-controlled drive has no row to feed a document), plus the existing party, work effort and wiki documents in the `mantle` index with per-user filters (`search#Universal` today leaves the communication event and the Project, Task, Event and Request documents out whenever an organization filter is on; it gains per-user conditions instead: a task, event or request the user is a party to or whose organization is one of the user's, a communication event the user is from, to or a recipient of); the existing `MantleCommunicationEvent` gains `contactListId`, and its per-user filter shows a message to its named recipients and a mailbox post to those who may read the mailbox (any user for a public one, members for a private one) | palette, Inbox search, Chat search, Files search | the universal search's organization and user limits apply |

### Mail

| Need | Kind | Proposed as | Used by | Stub spec |
| --- | --- | --- | --- | --- |
| Mail account model | data model | Framework entities `moqui.basic.email.EmailAccount` {owner user or party, kind internal (automatic, one per user, made on first use, no server: internal messages and mailboxes, §12), hosted, external or shared, emailServerId, address, name, color, syncWindow, recordFilingEnumId (file every party match, or only what the user links; defaults by kind, §12), status, lastSyncDate}, `EmailAccountUser` (shared members and rights), `EmailIdentity`, `EmailFolder` {account, name, path, kind, remote uid validity and modseq, counts}, `EmailLabel`, `EmailMessageLabel`, `EmailMessageAttachment` {message, DbResource location, name, size, mime, contentId}, `EmailRule`, `EmailOutOfOffice`, `EmailTextBlock`, `EmailSearch`; `EmailMessage` gains `emailAccountId`, `emailFolderId`, `remoteUid`, `isRead`, `isFlagged`, `isAnswered`, `hasAttachment`, `snippet`, `size`, `snoozedThruDate`, `scheduledSendDate`; `EmailServer` gains `authTypeEnumId` and an OAuth token reference | Inbox, Compose, Comms settings | |
| Email client services | service type | `org.moqui.impl.EmailClientServices`: `find#Messages`, `get#Thread`, `set#MessageFlags`, `move#Messages`, `apply#Labels`, `snooze#Messages`, `trash#Messages`, `report#Spam`, `unsubscribe#Message`, `save#Draft`, `send#Draft`, `discover#EmailServer`, `create#EmailAccount`, `test#EmailAccount`, `update#EmailAccount`, `delete#EmailAccount`, `sync#EmailAccount`, `run#EmailRules`; Rust where they touch the protocol, XML actions otherwise; they cover `EmailMessage` only, and the Inbox combines them with internal messages through `mantle.party.CommunicationServices.find#InboxThreads` ("Mailboxes" below) | Inbox, Compose, settings | |
| IMAP and POP poller with incremental sync | protocol client | Per-account sync in Rust: folder list, UIDVALIDITY and CONDSTORE or QRESYNC when offered, flags both ways, MOVE and COPY, APPEND of sent mail, IDLE or a short interval; POP as fetch-only; new beside `poll#EmailServer`, which reads one folder by sequence number with no UIDs, folder list, flag sync or APPEND; a blocking `imap` session on a worker thread per account, with IDLE on the Inbox; runs the rules and makes the `CommunicationEvent` for a party match when the account's filing policy says so | Inbox | initial-design "Protocol layer" |
| SMTP send through the account | protocol client | `send#EmailMessage` chooses the account's server, direct or relay, DKIM left to the gateway; delivery status back on the message (`ES_SENT`, `ES_BOUNCED` from DSN) | Compose, Chatter, system mail | exists for templates; per-account routing is new |
| SMTP listener behind the gateway | protocol server | Accept from the gateway's addresses only, trust its `Authentication-Results`, route by address to hosted and shared accounts, run rules, store `EmailMessage` and the `CommunicationEvent` when a party matches | hosted and shared accounts | initial-design "SMTP gateway reference setup"; `Remaining-Work` "Embedded SMTP server: no code" |
| OAuth client and token store | tool | Authorization-code flow with PKCE in a popup for Google and Microsoft, refresh tokens encrypted, used by the poller and SMTP (XOAUTH2) and later by calendar and contact sync | MailAccounts, Calendars | |
| Autodiscover | tool | Thunderbird autoconfig, Microsoft autodiscover and DNS SRV lookup by domain | MailAccounts | |
| Snooze and scheduled-send jobs | service type | `ServiceJob`s that return snoozed messages at `snoozedThruDate` and send drafts at `scheduledSendDate`; Undo send is a short hold in the Outbox before `send#Draft` | Inbox, Compose | |
| iCalendar, vCard and iMIP tool | tool | Parse and write `.ics` (events, RRULE, VALARM, attendees) and `.vcf` 3.0 and 4.0; iMIP REQUEST, REPLY and CANCEL mail; used by the Inbox card, EventDetail, Calendar export, Contacts import and export, CalDAV and CardDAV | Calendar, Contacts, Inbox | |
| `List-Unsubscribe` on list mail | tool | Headers on every `ContactList` send, the one-click POST endpoint | Unsubscribe, Marketing | RFC 8058 |

### Chat and calls

| Need | Kind | Proposed as | Used by | Stub spec |
| --- | --- | --- | --- | --- |
| Chat store | data model | Framework entities `moqui.chat.ChatRoom` {type, name, topic, avatar, visibility, recordEntityName, recordId, retentionDays}, `ChatRoomMember` {userId or agent reference, role, joinedDate, lastReadEventId, notificationLevel, pinned}, `ChatEvent` {room, eventSeq, type, senderUserId, contentJson, replyToEventId, threadRootEventId, editsEventId, sentDate}, `ChatAttachment` (DbResource), and later `ChatPoll` and `ChatPollVote` | Chat, ChatPanel, Chatter | initial-design "Matrix-style persistence" |
| Chat services | service type + protocol server | `org.moqui.impl.ChatServices`: `find#Rooms`, `create#Room`, `update#Room`, `add#Member`, `remove#Member`, `set#MemberRole`, `set#Notification`, `get#Timeline`, `send#Message`, `edit#Message`, `redact#Message`, `react#Message`, `pin#Message`, `mark#Read`, `upload#Attachment`, `create#Poll`, `vote#Poll`; typing, read markers and new events on WebSocket topics `chatRoom:<id>` and `chatUser:<id>`; an agent entry point for the Assist port | Chat | |
| WebRTC | protocol server | Signaling over the notification WebSocket (offer, answer, ICE), STUN and TURN from configuration (coturn documented), mesh for small calls and an SFU later | Calls, Call, LiveCall | initial-design "WebRTC built into mr-moqui" |
| Call store and services | data model + service type | `moqui.chat.CallSession` {chatRoomId, startedDate, endedDate, startedBy}, `CallParticipant`, `CallLink` {token, name, expiry, policy}; `org.moqui.impl.CallServices` `start#Call`, `join#Call`, `leave#Call`, `admit#Guest`, `create#CallLink`, `revoke#CallLink`, `find#Calls`; a finished call writes the `Call` communication event | Calls, Call, LiveCall | |
| `CommunicationEventType` `Call` | seed data | `Call` (voice or video call in BOSS) beside `Phone` (a logged external call) | Chatter, call history | |
| Call recording | tool | Recording a call to a `DbResource` file with consent shown to every participant | Call | later |

### Commons data and services

| Need | Kind | Proposed as | Used by | Stub spec |
| --- | --- | --- | --- | --- |
| Contact books | data model | Mantle `mantle.party.contact.ContactBook` {ownerPartyId or shared, name, color, visibility}, `ContactBookParty` {book, party, fromDate, isFavorite}, `ContactBookGroup`, `ContactBookGroupParty`, `ContactBookShare` {book, user or group, permission}; a personal contact is a party in a personal book only | Contacts, ContactBooks, QuickContact | §6 |
| Personal contact visibility | data model + seed data | `mantle.party.Party` gains `privateOwnerUserId`, set for a personal contact and cleared when it is linked to the directory; a second `EntityFilter` on `mantle.party.Party` in the `MANTLE_USER_ORG` and `MANTLE_ACTIVE_ORG` filter sets passes a party when that field is empty or is the current user, so it holds wherever the organization filter does; `find#Party`, `search#Party` (an indexed field of the MantleParty document), `lookup#ById`, the duplicate services (`check#AllPartyDuplicates` skips personal contacts) and the party drop-down transitions apply the same condition explicitly, since entity filters come only from the authorization that admitted the artifact | Contacts, Duplicates, every app's party finds | §6 |
| Contact book, import and export services | service type | `mantle.party.ContactBookServices` (`create#ContactBook`, `share#ContactBook`, `add#ContactBookParties`, `remove#ContactBookParties`, `create#ContactBookGroup`, …), `mantle.party.ContactImportServices` (`parse#ContactFile`, `preview#Contacts` matching rows by email, phone and name, `import#Contacts` as a job, `export#Contacts` vCard and CSV); `mantle.party.DuplicateServices.merge#Parties` extended to move `WorkEffortParty`, `RequestParty`, `CommunicationEventParty`, `ContactListParty` and the new party rows (`ContactBookParty`, `ContactBookGroupParty`, `PartyConsent`, shares), which it leaves behind today | Contacts, ContactImport, Duplicates | |
| Calendar collections | data model | Mantle `mantle.work.calendar.Calendar` {ownerPartyId, name, color, kind personal, shared, resource or subscription, timeZone, isDefault}, `CalendarWorkEffort` {calendar, workEffort}, `CalendarShare` {calendar, user, group or party, permission, publishToken, password}, `CalendarSubscription` {calendar, url or provider, refreshMinutes, lastFetchDate, status} | Calendar, Calendars, EventDetail | §7 |
| Recurrence | data model + seed data | `mantle.work.effort.WorkEffortRecurrence` {workEffortId, rrule, exdates, rdates}; instance overrides as `WorkEffort`s linked by the new `WorkEffortAssoc` type `WeatRecurrenceInstance` with the instance date; the existing `recurStartCron`, `recurLimit`, `recurEndDate` stay for jobs | Calendar, EventDetail, Tasks | |
| Reminders | data model + service type | `mantle.work.effort.WorkEffortReminder` {workEffortId, partyId, offsetMinutes, methodEnumId notification or email}; a job that sends on topic `WorkEffortReminder` with snooze | EventDetail, Tasks, Today | |
| RSVP and booking statuses | seed data + data model | `StatusItem` `WeptTentative` in `WorkEffortParty`; `WorkEffortFacility` gains `statusId` with the `WorkEffortAssetAssign` flow (`WeaaRequested`, `WeaaAssigned`, `WeaaRequestDenied`) or its own | EventDetail, Schedules | |
| Calendar services | service type | `mantle.work.EventServices`: `get#FullCalendarData` extended with `calendarIdList`, RRULE expansion, all-day handling, the meeting rooms of `WorkEffortFacility` (it reads `WorkEffort.facilityId` today), `recurLimit`, and declined invitations left out unless asked; the `WorkEffortPartyAsset` view, whose asset status and dates are aliased to the party member, fixed; new `get#FreeBusy`, `send#EventInvitations`, `respond#EventInvitation`, `book#Resource`; `mantle.work.CalendarServices` (`create#Calendar`, `share#Calendar`, `subscribe#Calendar`, `fetch#CalendarSubscription` as a job, `export#Calendar`) | Calendar, EventDetail, Schedules, Calendars | |
| Today and timeline services | service type | `mantle.work.WorkEffortServices.get#UserTodayItems` (tasks, activities and events of the user by overdue, today and later, skipping what the user snoozed, plus the `<today-source>` providers' items); `mantle.party.CommunicationServices.get#RecordTimeline` (the joins or generic links, a party's communication events through `find#PartyCommunicationEvents`, extended to the to and cc recipient rows and leaving out mailbox posts, the record's `*Note` rows, activities, audit log, files, the bound room), `link#CommunicationEventRecord`; `send#EmailDraft` (§12) | TodayPanel, Home, Chatter, Inbox, Compose | §15 |
| Per-user snooze | data model | `mantle.work.effort.WorkEffortParty` gains `snoozedThruDate`: hides the task or activity from that party's Today until then without changing the work effort's dates | TodayPanel, Home | |
| Generic record links | data model | Mantle `mantle.party.communication.CommunicationEventRecord` {communicationEventId, recordEntityName, recordId}, `mantle.work.effort.WorkEffortRecord` {workEffortId, recordEntityName, recordId}, `mantle.party.communication.RecordFollower` {recordEntityName, recordId, userId, kinds}; the per-type joins stay and are read too | Chatter, QuickCreate, Inbox, Chat | answers crosscut §8 |
| Internal message state | data model | Every internal recipient of a `Message` (to and cc, and for a mailbox post each member and each participant of the thread) gets a `mantle.party.communication.CommunicationEventParty` row (its `roleTypeId`, part of the key, tells to, cc and mailbox delivery apart, so a party gets one row per message with the role chosen by priority, to, then cc, then mailbox delivery; those role types are seed data to add), which gains `readDate` (empty is unread; the existing `statusId` keeps its `Cep*` flow of sent, received, assigned and resolved), `isFlagged`, `archivedDate` and `snoozedThruDate`; labels are a new `CommunicationEventPartyLabel` {communicationEventId, partyId, roleTypeId, emailLabelId} to the user's Internal-account `EmailLabel`; `mantle.party.CommunicationServices.find#InboxThreads` reads this and merges it with the framework's `find#Messages`, so the framework never reads a Mantle entity | Inbox (Internal account and mailboxes), Comms Home | §12 |
| Mailboxes | data model + service type | A mailbox is a Mantle `mantle.marketing.contact.ContactList` of the new type `MAILBOX` (an `Enumeration` of `ContactListType` beside `MARKETING`, `NEWSLETTER` and `ANNOUNCEMENT`), using `contactListName`, `description`, `isPublic`, `ownerPartyId` (the organization) and `contactMechTypeEnumId` (empty while internal only); `ContactList` gains `postingEnumId` (new enumeration: members, moderators, any user), `defaultDeliveryEnumId` and `archivedDate`; `ContactListParty` gains `roleTypeId` outside the key (new role types `ListOwner` and `ListModerator`; empty is a member) and `deliveryEnumId` (new enumeration: Inbox, Mailbox only; digest later), with `CLPT_ACCEPTED` for a member, `CLPT_PENDING` for a join request or invitation, `CLPT_REJECTED` when declined and `thruDate` set on leaving; posts use the existing `CommunicationEvent.contactListId`. Services: `mantle.marketing.ContactListServices` (new, general so that Marketing uses them too): `create#ContactList`, `update#ContactList`, `find#ContactLists` (by type, with my membership and unread counts), `join#ContactList` (a member of a public list, a pending request for a private one), `leave#ContactList`, `add#ContactListParty` (also accepts a request), `remove#ContactListParty`, `set#ContactListPartyDelivery`; in `mantle.party.CommunicationServices`: `find#InboxThreads`, `get#InternalThread`, `set#InternalMessageState` (read, flag, archive, snooze and labels on my rows) and `close#ListThread` (new), and `create#Message` (extended: to and cc lists and `contactListId`; checks the posting policy and writes the recipient rows), `reply#CommunicationEvent` (extended: keeps the parent's type, which today always becomes `Comment`, and the list and its participants, or answers the sender only) and `find#PartyCommunicationEvents` (extended, §15). Later, the email bridge: `contactMechTypeEnumId` email, members' `preferredContactMechId`, `ContactListCommStatus` per address (its `messageId` matches the replies) and the §16 unsubscribe | Inbox, Compose, Comms Home, palette | §12 |
| Consent | data model + service type | Mantle `mantle.party.PartyConsent` {partyId, contactMechId, purposeEnumId, statusId granted or withdrawn, consentDate, sourceEnumId, evidenceText, userId}; `mantle.party.ConsentServices` `store#PartyConsent`, `unsubscribe#ContactListParty` | Consent, Unsubscribe, Marketing | |
| Notification fields and approvals | data model | `moqui.security.user.NotificationMessage` gains `reasonEnumId` (mention, assignment, approval, dateAlert, reminder, comment, system), `recordEntityName`, `recordId`, `actorUserId`, `appName`; `NotificationTopic` gains `approveServiceName`, `refuseServiceName`, `digestDefault` and `inboxEnumId` (NotificationInbox: Notifications, the default, actionable and in the badge; Updates, the automatic inbox of record-update feeds such as Mantle's MantleTask, MantleEvent, MantleRequest and MantleCommunicationEvent topics, system messages and job reports); `NotificationTopicUser` gains `digest`; the approve and refuse services receive `recordEntityName`, `recordId`, the message's `messageJson` map and, for a refuse, `reason`; a daily digest job | NotificationsPanel, Notifications, settings | answers the research open question |
| Notes space and knowledge review | data model + service type | `moqui.resource.wiki.WikiPageReview` {wikiPageId, versionName (a version name or a commit id), requestedByUserId, reviewerUserId, statusId, note, requestedDate, decidedDate}; `org.moqui.impl.WikiServices.ensure#UserNotesSpace`, which creates a user's private notes `WikiSpace` on database files on first use; `WikiServices.update#WikiPage` writing the snapshot of a `CollabDocument` and indexing the snapshot's page links in a new `WikiPageLink` {wikiPageId, toWikiPageId}; `get#WikiPageBacklinks` over it; `move#WikiPage` to another space with history, categories and attachments (into a version-controlled space by replaying the versions) | Knowledge, Review, Notes | |

### Files

| Need | Kind | Proposed as | Used by | Stub spec |
| --- | --- | --- | --- | --- |
| Drives | data model | `moqui.resource.ResourceDrive` {driveId, driveName, description, driveKindEnumId (personal, shared, mirror, records), rootLocation, repositoryId, ownerUserId, quotaBytes, archivedDate}, `ResourceDriveMember` {driveId, userId or userGroupId, permissionEnumId (view, edit, manage), fromDate, thruDate}; the storage is the root's scheme and, for `git://`, the `GitRepository` kind (`db`, `local`, `remote`); personal and folder drive roots under the `moqui.drive.root` preference (`dbresource://drive` by default); BOSS seeds the Records drive over `mantle.content.root` with its map from type folder to record entity (§9), so the framework stays Mantle-free | Files, Drives, Shares, RecordFiles | §9 |
| File metadata model | data model | Keyed by drive and path for every storage, since a file in a version-controlled drive has no row of its own: `moqui.resource.ResourceShare` {driveId, path, user, group, party or link token, permission, expiry, passwordHash, note, createdBy, openedCount}, `ResourceFavorite` {driveId, path, userId}, `ResourceTag`, `ResourceTagMember` {driveId, path, tag}, `ResourceTrash` {driveId, path, trashedDate, trashedByUserId, isDirectory, versionName (on a version-controlled drive the version before the delete), trashLocation (on the database tree the hidden trash folder it moved to)}; `FileServices` moves the rows with a move or rename; `DbResourceFile` gains `fileSize`, written with each write, so a folder list does not read every file to size it; the record content folders the Mantle `save#*ContentFile` services already write under `mantle.content.root` (`dbresource://mantle/content/<type>/<id>/…`) are the Records drive, mapped by type folder to record type | Files, Shares, PublicShare, RecordFiles | §9 |
| File services | service type | `org.moqui.impl.FileServices`: `create#Drive`, `update#Drive`, `archive#Drive`, `add#DriveMember`, `remove#DriveMember`, `export#Drive`, `list#Folder`, `find#Resources`, `find#Recent`, `upload#Resource`, `create#Folder`, `rename#Resource`, `move#Resource`, `copy#Resource`, `trash#Resource`, `restore#Resource`, `get#Versions`, `get#VersionDiff`, `restore#Version`, `share#Resource`, `revoke#Share`, `accept#Share`, `decline#Share`, `open#PublicShare`, `list#PublicShare`, `upload#PublicShare`, `download#Zip`, `get#Activity`; all by drive and path over the resource facade, so every storage takes the same calls; the version services wrap the version API (`getVersionHistory`, `getText(version)`, `getVersionDiff`); a move or rename carries the metadata rows, a move across drives is a copy and a trash, and an action on several files is one change set; previews (image thumbnails, PDF first page) by a Rust tool | Files, Drives, RecordFiles, Compose, Home | |
| Change sets | tool | A resource facade change set over one root: several writes, deletes and moves and a message, applied as one commit on a `git://` root (the git provider now commits each call alone, with a message of its own such as `Update <path>`) and as the plain writes on a `dbresource://` root; a directory delete in a change set takes the files under it, where a lone delete of a git directory that still has files is refused | Files upload, move, trash and bulk actions; WebDAV `MOVE` and `DELETE` of a folder | mr-moqui `resource/git/mod.rs` |
| Version notes | tool + data model | A note written with a version: the commit message on git (read back from the commit), `DbResourceFile.versionNote` on the database tree (moved into the `DbResourceFileHistory` row when the version is replaced); the facade's `ResourceVersion` and the script version object gain `note` | Files Upload and Versions, Knowledge Save and History | |
| Git path index | tool | Per path on a branch: the last commit that changed it (the date and user for the Files list, where `stat` now answers the head commit's time for every file) and its size, cached by head commit, which also serves the per-file history walk (the history cache of mr-moqui's Remaining-Work); history that follows a move (exact, since a move keeps the blob id; a moved file's history now starts at the move); the log of commits under a path, for Activity | Files list and Activity, Knowledge History after a move | mr-moqui `resource/git/ops.rs` `history` |
| Wiki git storage | service type | `org.moqui.impl.WikiServices.create#WikiSpace` and `clone#WikiSpace` take `repositoryKind` (`db` or `local`, or `remote` with a URL for admins): they create the `GitRepository`, run `GitServices.init#GitRepository` and set `rootPageDirectory` to `git://<repositoryId>` | Spaces | mr-moqui `docs/data/Revision-Management.md` "Wiki spaces on git" |
| WebDAV server | protocol server | Each drive the user may open, with the drive member rights, locks, and `PROPFIND` of the share and tag properties; a write to a version-controlled drive is a commit by the user, a folder `MOVE` or `DELETE` one change set; a mirror is read-only | Sync, desktop clients | initial-design "Protocol layer"; later, with Sync |
| Virtual SFTP server | protocol server | The same drives over the russh host with app passwords | Sync, scripts | the Java virtual SFTP; `moqui-host/src/ssh/` has the cluster sender |
| CalDAV and CardDAV servers | protocol server | Calendars (`Calendar` and `WorkEffort` events, `WetTask` as VTODO) and contact books (`ContactBook` and parties as vCards, each a CardDAV address book) for phones and desktop clients, with app passwords | Sync | initial-design "Calendar / contacts" |
| Extracted text for search | tool | Text extraction from PDF and office files into the `MoquiDriveFile` document | Files search | later |

## 20. Decided

| Decision | Notes |
| --- | --- |
| One file for the shell, Commons and Comms; an **Impl** column | Replaced the guide's `design-commons.md` and `design-comms.md`; the guide's §1, §4, §6, §7 and §9 carry the change and the conventions this review added |
| Every screen is client-rendered and server-static; `.qvue` for Inbox, Compose, Chat, ChatPanel, Calendar, Schedules, Files, PublicShare, Knowledge, Notes, Chatter, RecordFiles, Call and LiveCall; XML for the rest | The `.qvue` screens are the ones whose interaction does not fit the XML widgets (style-guide §4.8); each names the `m-*` components it still uses |
| The Assist drawer belongs to the framework; the tray panel is BOSS content in a framework frame | The tray panel is style-guide §2.4's; its tabs and the quick-create, Chatter and record-files screens are named by theme values so the framework stays Mantle-free |
| What Assist may reach: the canvas, dialogs from it, the tray panel's tabs, the quick-create dialog and the live-call window; not the header, app drawer, palette, account menu, theme plugins or itself | Answers the initial-design and research open item; Assist reads the tray panel's data through `request` on the panel screens' `/actions` and its tools catalog is the palette's providers |
| Assist's `write_ui` canvas renders in the drawer and can be opened into the page | Keeps the Java panel's page-slot behavior as an option rather than the default |
| Screen context is the one plumbing for quick create, Chatter, Today, record files and Assist | style-guide §8 "Screen context"; a record link made from it uses the record's own join when one exists, else the generic links |
| Approvals: the tray panel's Notifications tab, the `Commons/Notifications` center, and the source apps' own lists | Answers the research and crosscut §8 approvals questions; approve and refuse call services named on the `NotificationTopic`; this file designs Approvals waiting (crosscut §3.15) and design-crosscut decides whether the source apps include its form; the center lives in Commons rather than as a shell screen outside the apps, since approvals and reminders are things to do and Commons is where the user's own work lives |
| The framework reaches BOSS's Mantle-aware pieces only through theme values: the three tray tabs, quick create, Chatter, record files and the shell counts service (`STRT_SHELL_COUNTS_SERVICE`) | Keeps the framework Mantle-free; a deployment without BOSS shows no badges rather than failing |
| `NotificationMessage` gains reason, record, actor and app fields rather than conventions inside `messageJson` | Filters and the record link need columns; `messageJson` stays for the payload |
| Notification digest: a daily email per topic preference (`NotificationTopicUser.digest`), mentions always immediate | As Nextcloud Activity does; §18 output and §19 "Notification fields and approvals" |
| Badges and the tray panel refresh over WebSocket topics (`shellCounts`, per-tab topics), with a five-minute poll as the fallback | Replaces the My Account widget's polling |
| Separate header counts for Mail (external email), Messages (internal messages and mailbox posts) and Notifications; notifications in two inboxes chosen per topic (`NotificationTopic.inboxEnumId`): Notifications (actionable, the badge) and the automatic Updates (record-update feeds, system messages, job reports; no badge, read in the Notifications tab and center) | Decided Oct 19, 2026 after M2's counts: one Inbox count mixed two very different streams, and Mantle's record-update notifications (28 unviewed for the demo user) would have buried mentions and approvals |
| A suite key map with Gmail-compatible mail defaults, Slack-compatible chat defaults, a `?` overlay and user overrides | The Inbox and Chat scopes close the gaps named in §1.7 and §12; inside a rich-text editor Ctrl+K is "insert link" and the palette is the Search button; compatible sets rather than a BOSS set so no one relearns |
| Today's Snooze hides an item for the user only (`WorkEffortParty.snoozedThruDate`); Reschedule, a separate action, changes the due date | Snoozing a shared project task must not move its date for everyone; Microsoft To Do's My Day keeps the same split |
| QuickSearch, Search and QuickLookup retire into the palette; `Commons/Search` remains only as the "more" page for records | `Base/QuickSearch`, `Base/Search`, `Base/QuickLookup` and `template/SearchTransitions.xml` go when the palette lands |
| Commons and Comms are authorized for `ALL_USERS` | A deployment narrows with its own authz; role-limited screens (Duplicates, Spaces, Review, Consent) check their own groups |
| Contact books are new `ContactBook` records; groups are labels inside a book; a personal contact is a `Party` in a personal book with no role, hidden from the directory and the duplicate scan, and from every other user everywhere through `Party.privateOwnerUserId`, a filter in the organization filter sets and explicit conditions in the party finds, search and lookups (§6) | Answers the research question; CardDAV maps one book to one address book; "Link to a directory party" merges a personal contact into the directory when wanted |
| Calendars are a new `Calendar` collection over `WorkEffort` events, with `CalendarShare` and `CalendarSubscription`; recurrence is an RRULE on `WorkEffortRecurrence` with instance overrides by `WorkEffortAssoc` `WeatRecurrenceInstance`; reminders are `WorkEffortReminder`; working hours are `WetAvailable` work efforts; the grid shows the toggled calendars plus every event where the user is a `WorkEffortParty` | Answers the research question; nothing is added to `WorkEffort` itself except through the new child entities; an event another app schedules with a user shows without a `CalendarWorkEffort` row |
| RSVP uses `WorkEffortParty` statuses (`WeptOffered`, `WeptAssigned`, `WeptDeclined`, new `WeptTentative`); meeting-room booking uses `WorkEffortFacility` with a new status; equipment uses `WorkEffortAssetAssign` statuses; policies and approval live in Maintenance | initial-design's split; without a policy a booking is assigned at once; Maintenance's policies are opt-in per resource |
| Files run on drives (`ResourceDrive`): My files and folder drives on the database tree (`DbResource`, per-file versions in `DbResourceFileHistory`), version-controlled drives on a git repository in the database or on disk, and read-only mirrors of a git URL that only admins add; shares, favorites, tags and trash are keyed by drive and path for every storage; record attachments stay where the Mantle `save#*ContentFile` services put them (`dbresource://mantle/content/<type>/<id>/…`) with their `*Content` rows, and that tree is the Records drive; WebDAV, SFTP, CalDAV and CardDAV are framework servers over the same data | Answers the research question; everything but a disk drive in Postgres under one backup, the database being the default for version control and a disk drive the choice for a team that wants to clone it with git; a git file has no row, so the metadata cannot hang off `DbResource`; a mirror fetches from outside on a schedule, so it is an admin's to add; a file-system root is configuration |
| Personal notes are the pages of a private `WikiSpace` per user, on database files; knowledge base, team wiki and help center are spaces; review is `WikiPageReview` over the existing published version; co-editing is Tiptap over Yjs with `yrs`, with a markdown text area until it lands | initial-design "Notes and knowledge live in Commons"; future PASS Blog/Publishing owns public/editorial publication screens, with Marketing and Commons authoring contexts over the same WikiBlog/WikiPage services ([Forum §13.3](../../mr-pass/plan/design-forum.md#133-future-blogpublishing)); Tiptap rather than BlockNote because the same core serves the composer and chat as `m-rich-text`, and Nextcloud Text and Frappe Wiki are Tiptap references |
| A Knowledge space chooses its storage when created, as a drive does: database files by default, or a git repository in the database or on disk; a notes space is always on database files | The wiki services use only the version API, so the screens do not change with the storage; notes are personal and edited often, where the database tree's deltas are cheapest |
| Compare is the server's line diff everywhere (`getVersionDiff` and its `moqui-diff` table, for wiki pages, review and text files); no diff library in the browser | One diff for both storages, escaped and styled in light and dark; SimpleScreens' `WikiCompare` and `Gallery/Editor.xml` already use it, where the Java screens ran jsdiff from a CDN |
| Chat messages are a separate Matrix-style store (`ChatRoom`, `ChatRoomMember`, `ChatEvent`); a message becomes a `CommunicationEvent` only when linked to a record or turned into one; a record-bound room shows in Chatter | Answers the research question; search indexes chat events directly |
| Mail is `EmailMessage` plus the new account, folder, label, attachment and rule entities in the framework; a `CommunicationEvent` is created when a party matches and the account's filing policy allows it, or when the user links; internal messages are the Internal account of the same Inbox, an automatic `EmailAccount` of kind `internal` per user, which the Inbox lists through `mantle.party.CommunicationServices.find#InboxThreads` | Answers initial-design "Internal comm events: same inbox UI as email"; the receiver's party matching sets `emailMessageId` as the order, invoice and shipment services already do; the merge service is Mantle's so that the framework's mail services never read a Mantle entity |
| Filing mail on records is a per-account policy (`EmailAccount.recordFilingEnumId`): business, shared and hosted accounts file every party match; a personal external account files only what its owner links | Someone using Comms as their own mail client must not see their personal Gmail on a customer's 360 |
| Internal messages keep a per-recipient state on `CommunicationEventParty` (`readDate`, `isFlagged`, `archivedDate`, `snoozedThruDate`, labels through `CommunicationEventPartyLabel`); a mailbox post writes a row for each member and each participant of the thread, and someone who joins later sees the earlier threads as read | One message to several users needs independent read, flag and archive state; `CommunicationEvent.statusId` is one value for everyone |
| Mailboxes, the asynchronous counterpart of chat rooms, are Mantle `ContactList` rows of the new type `MAILBOX`: members are `ContactListParty` rows with a role and a delivery (Inbox or Mailbox only), posts are `CommunicationEvent`s with the existing `contactListId`, threaded by `rootCommEventId`; closing a thread sets its first post to `CeResolved`; the Internal account (an Open item before) stays, with the mailboxes under it | `ContactList` is the list model Mantle already has, unused by any service yet, and the same model serves Marketing's mass distribution; the later email bridge reuses its per-address delivery (`ContactListCommStatus`) and unsubscribe. Not `ChatRoom` (the framework's synchronous `ChatEvent` store) and not a shared `EmailAccount` (real addresses and `EmailMessage`). Whether a project or a case gets a mailbox is for design-projects and design-customer-service |
| Account terms: external, hosted (at a hosted domain), shared and Internal accounts; "mailbox" means only the shared list or forum under the Internal account | Hosted and shared accounts were "internal mailbox" and "shared mailbox", which the new mailboxes would have made ambiguous; the framework's mail services are `org.moqui.impl.EmailClientServices`, beside the existing `EmailServices`, so the word is free |
| Log note writes a `Comment` communication event; the timeline also reads the baseline's `PartyNote`, `WorkEffortNote`, `RequestNote`, `OrderNote` and `FacilityNote` rows, and a party's own communication events through `find#PartyCommunicationEvents` | Existing notes stay visible with no migration; comments carry mentions, attachments and replies that note rows cannot |
| Message purposes (`CommunicationEventPurpose`) are not shown in Comms; labels file mail and record links tie it to business | `EditMessage` `AddPurposeForm` and `PurposesForm` are not carried forward; services may still set a purpose, and Customer Service may show it on case messages |
| Commons mounts the Facility & equipment record read-only as `ResourceDetail`, and shows an employee's directory card on the contact record | Answers research-crosscut §3's "Commons (schedules and booking)" and Employee 360's "Commons (directory card)"; Maintenance and People keep the full records |
| The composer is one component used from the Inbox, quick create, Chatter and the business records; Marketing's campaign sends do not use it | §12 per-app context |
| Calls are WebRTC in mr-moqui with `CallSession` and `CallLink`; a finished call is a `CommunicationEvent` of the new type `Call`; meetings are `WepMeeting` events with a call link | initial-design "WebRTC built into mr-moqui" |
| Consent is edited on `PartyContactMech.allowSolicitation` and `ContactListParty`, with `PartyConsent` as the history; one screen for Comms and Marketing; a public unsubscribe page with one-click support | Answers the research question |
| Chatter is one component with a generic record link (`CommunicationEventRecord`, `WorkEffortRecord`, `RecordFollower`) beside the existing per-type joins | Answers crosscut §8 "Generic record links"; the design-crosscut file references §15 rather than redesigning it |
| A meeting activity is a `WetEvent` with purpose `WepMeeting` (`create#Event`); call, email and to-do activities are `WetTask`s (`create#SimpleTask`) | Odoo's meeting activity opens the calendar; one record serves the calendar, Chatter and the Today panel |
| Dropped from the candidate inventory: a separate Outbox screen (a folder view), a separate Events area (`EventDetail` under Calendar), a Comms Chatter screen (one component), the My Account Time entries (Projects' My timesheet and the Task Time tab), Scheduled finds (Insights' saved reports) and Expense (People and Accounting), the org chart (`later`) | The My Account forms they held are covered as noted in §8 and §11 or carried by those files; the Expense and Scheduled finds forms, and the Wiki blog forms that go to Marketing, stay blank in ss-inventory until design-people, design-accounting, design-insights and design-marketing fill them |
| `Comms/Settings/Calls`, Calls, Call and LiveCall are `later` (`Commons/Settings/Sync` was too, built Oct 21, 2026); everything else in the tables is `parity` or `new` | Calls and DAV sync wait on their protocol work. `parity` marks a screen that replaces a My Account, Party, Wiki or search screen or form (Notifications, Inbox, Compose, MessageDetail, Chatter and RecordFiles among them); `new` marks one with no baseline |
| The shell aggregates the app roots' providers in one `shellData` transition per page load; the palette groups beyond Recent, Screens, Saved finds and Actions are `<palette-source>` providers | Menu data stays per path; the framework still never calls Mantle, since Commons and Comms register the services (§1.5, §19) |
| Chatter and record files are mounted hidden in every BOSS app root (`<App>/Chatter`, `<App>/RecordFiles`) from `Shared/`, and check the record's visibility themselves | Each loads as its own request, so the host screen's authorization is not in it; mounting under the app keeps that app's authz and filters (§9, §15) |
| Personal-contact privacy is a second filter in the organization filter sets plus explicit conditions in the party finds, search and lookups | mr-moqui has no filter applied to every user: entity filters come only from the authorization that admitted the artifact (§6) |
| The badge counts are pushed by `org.moqui.impl.ShellServices.publish#ShellCounts`, coalesced per user, from EECAs and SECAs | One owner for the `shellCounts` topic; the framework finds Mantle's counts service through the theme value (§19) |
| The anonymous pages (`/s/`, `/u/`, `/call/`) run in a public shell without the header, drawers or session | A qvt or `.qvue` screen runs only inside `m-qapps-root` today (§19 "Anonymous token routes") |
| Files ships without WebDAV; WebDAV and SFTP over drives come with Sync | Sync and the DAV servers are `later` (§9, §11) |
| Mail accounts connect with a password first (a Gmail app password included), OAuth after | A personal Gmail account on an unverified OAuth app gets short-lived refresh tokens (§21) |
| A survey builder in Commons (Oct 28, 2026; crosscut §8) | Commons owns one survey builder over framework DbForm and FormResponse, which Customer Service, Marketing and People mount. This reverses the earlier Open recommendation that surveys stay in Marketing. Its screens are designed in a later Commons pass; until then Customer Service's FeedbackForms and FeedbackFormDetail ([design-customer-service §9](design-customer-service.md#9-settings)) carry the form summaries. |

## 21. Open

Each with the answer the author would give.

- **Personal contacts as parties.** A personal contact pollutes nothing visible, but it is a
  row in `Party` with no role, and a deployment with strict data-protection rules may prefer a
  separate vCard store per user. Recommended: keep them as parties in personal books (one
  search, one merge path, one CardDAV backend), hidden from everyone else by the
  `privateOwnerUserId` entity filter (§6), and add a retention job that purges personal books of
  users who are disabled.
- **Mail body storage at scale.** `EmailMessage.body` and `bodyText` are `text-very-long`
  columns; a user with ten years of mail has tens of gigabytes in one table. Recommended: keep
  bodies in the table (one backup, full-text in the index), attachments in `DbResource`, and add
  an archive policy per account (older than n years moved to a cold table or exported to
  `.mbox` in Files) before the first large deployment.
- **OAuth for Google and Microsoft in the first release.** The author's own use needs a Gmail
  account polled over IMAP with OAuth. Recommended: first release, with the client in the
  framework so calendar and contact import reuse it; Google and Microsoft 365 calendar
  subscriptions stay `later` (§11 Calendars). A deployment registers its own Google OAuth
  client; Google's documentation says an external app left in Testing status gets refresh tokens
  that expire after seven days, and Gmail's IMAP scope is restricted, so publishing the app needs
  Google's verification (check both when the client is built). So the first release connects with
  a password first, a Gmail app password with 2-Step Verification included, and adds OAuth after,
  with MailAccounts showing when a sign-in is due.
- **An IMAP or JMAP server so other mail clients can read BOSS mail accounts.** Recommended:
  later, JMAP first if ever (Frappe suite talks JMAP to Stalwart); initial-design already limits
  it to "only if users point mail clients at BOSS".
- **Encryption (S/MIME, PGP).** Recommended: later; Nextcloud Mail's Mailvelope and S/MIME code
  is the reference when it comes.
- **Chat federation.** Matrix-style is internal persistence, not the Matrix protocol.
  Recommended: no federation in the first release; keep the event model close enough to Matrix
  that a bridge is possible.
- **Phone installation.** A PWA manifest and web push are framework work. Recommended: in the
  release that ships Chat, since chat without a phone notification is half a chat.
- **Where the Office app (WOPI) opens from.** The Files preview and New menu assume it.
  Recommended: Office's design file names the `Commons/Files` hooks it needs (open with, new
  document from template) and this file gains them at review.
- **The Assist key.** Ctrl+Shift+A is, as far as this review knows, bound by Chrome (tab search)
  and Firefox (add-ons), and browsers keep some keys from pages. Recommended: check the default
  against the browser-reserved keys of Chrome, Firefox, Safari and Edge when the Keymap registry
  is built; it is editable either way.
- **A personal "Me" page** (research-crosscut §8, People and Commons). Recommended: no separate
  page; `Commons/Settings/Account` is the account, People's employee self-service is People's,
  and Commons Home shows a shortcut to it for users who have it.
- **Git access from desktops.** Cloning or pulling a version-controlled drive over HTTPS needs a
  git server in mr-moqui, and gitoxide has no push yet. Recommended: later; until then a disk
  drive is cloned on the host, a database drive is exported (`export#GitRepository`), and
  desktop clients use WebDAV. Push and an in-process SSH transport are follow-ups in mr-moqui's
  `plans/Remaining-Work.md`.
- **Moving a note into a version-controlled space.** The notes space is on database files, so
  `move#WikiPage` cannot carry its history rows into a git repository. Recommended: replay the
  versions oldest first, one commit each with a note naming the original date and author;
  moving only the current text would lose the history the Notes screen promises to keep.
- **Snapshot cadence in a version-controlled space.** A commit for every idle snapshot would
  make a log of fragments. Recommended: on git, commit on Save and when an editing session
  closes (§10 `Editor`); database files keep the idle versions, which are cheap deltas.
