# IronStone BOSS — Style, widget and shell guide

Oct 18, 2026

How BOSS screens look and behave, the shell every screen runs in, the widgets a design may
use, and where to read more. BOSS uses the Moqui `qvt` render mode and Quasar as they are:
when Quasar or mr-moqui changes, BOSS changes with it, and when a theme changes the brand
colors, every BOSS screen follows. This guide therefore names what the framework does today,
the rules for using it, and in §8 the changes the framework needs for BOSS. The companion
[design-doc-guide.md](design-doc-guide.md) says what a design file contains.

Versions this guide is written against: Vue 3.5.44, Quasar 2.35.1 (the vendored build and the
clone at `~/work/moquiwork/3p_other/quasar` are the same version), Material Icons 1.13.14
today, Material Symbols after the change in §8. The mr-moqui files it describes are listed in
§9 with the Quasar files.

Sections: [1 principles](#1-principles) · [2 shell](#2-the-shell-what-every-screen-runs-in) ·
[3 archetypes](#3-screen-archetypes) · [4 widgets](#4-widget-guide) ·
[5 color, type, icons](#5-color-typography-density-and-icons) · [6 states and behavior](#6-states-feedback-and-behavior) ·
[7 devices](#7-devices-and-breakpoints) · [8 framework changes](#8-framework-changes) ·
[9 references](#9-references) · [10 gallery](#10-the-archetype-gallery)

---

## 1. Principles

1. **Use Quasar and Moqui as they are.** A screen is XML screen and form elements rendered by the
   qvt macros into the `m-*` wrappers and Quasar components. BOSS does not fork, restyle or
   wrap Quasar; it chooses among what Quasar offers. When a Quasar version changes a look, BOSS
   takes the new look.
2. **The theme owns color.** Screens use the eight brand colors by their semantic names
   (`primary`, `secondary`, `accent`, `positive`, `negative`, `warning`, `info`, `dark`) and the
   grey scale. No hex values, no `style` colors, no per-app hue, no CSS in a screen file. A theme
   changes the brand through `STRT_QUASAR_CONFIG`, and every screen must read well in light and
   dark.
3. **XML widgets first.** A screen is written with the elements of §4. Raw Quasar markup appears
   only inside a `render-mode` `text type="qvt"` block or a `.qvue` screen, only from the allowed
   list in §4.8, and never for inputs. A piece of raw markup that a second screen wants is a
   candidate for a new XML element (§8). Custom presentation does not carry across render modes:
   a screen that goes custom for the browser also gets a `tui` text for the terminal (§4.8).
4. **One action hierarchy.** Primary, tonal, flat and text link, as §4.6 defines; one primary per
   form or dialog; destructive actions confirm.
5. **Dense, consistent spacing.** Dense fields, 28 px list rows, Quasar's spacing scale only
   (§5.4). Density is a framework setting, not a per-screen choice.
6. **Every screen states its context.** The record, selection and filters it shows (design-doc-guide
   §4) so the shell's palette, quick create, Chatter, Today and Assist can act on it.
7. **Desktop first, phone where it matters.** Every screen works from 1024 px with the Assist drawer
   open; the archetypes §7 names also work at phone width.
8. **Text through l10n, icons with names.** All visible text is localizable; icon-only buttons have
   tooltips; a status is a word with a color, never a color alone.

## 2. The shell: what every screen runs in

The shell is the `m-qapps-root` component of `WebrootVue.qvt.js`: a `q-layout` with view
`hHh LpR fFf`, a `q-header`, a left `q-drawer` holding the screen menu, the page, and a
`q-footer`. This section keeps that frame and adds the pieces initial-design's "Header tray and
Assist" asks for. §2.8 lists what is new against today's shell; the implementation items are in
§8.

### 2.1 Regions

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ ≡ [logo▾] IronStone Sales › Orders › SO10023   [Search ⌘K] [+] [Today] [Chat] [Mail] [Msgs] [Notif] [?] [Account] [Assist] │  header
├──────────────┬──────────────────────────────────────────────────┬──────────┬──────────┤
│ app drawer   │ canvas (the screen)                              │ tray     │ Assist   │
│ menu tree    │                                                  │ panel    │ drawer   │
│ saved finds  │                                                  │ (Today / │          │
│              │                                                  │ Chat /   │          │
│ Settings     │                                                  │ Notif.)  │          │
│ Home         │                                   [live call ▣]  │          │          │
├──────────────┴──────────────────────────────────────────────────┴──────────┴──────────┤
│ footer: theme items                                                                   │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

| Region | Component | Size and behavior | Owner | In Assist's reach |
| --- | --- | --- | --- | --- |
| Header | `q-header` bordered, `q-toolbar dense`, neutral surface (`bg-white text-dark`, `bg-dark` in dark mode; dev and test deployments tint it) | Fixed; 50 px | Framework | No |
| App drawer | left `q-drawer`, bordered, 260 px, `show-if-above`, breakpoint 1023 | Open beside the page from 1024 px; an overlay below; the user's `QUASAR_LEFT_OPEN` preference | Framework, content from the app's menu | No |
| Canvas | `q-page-container` > `q-page q-pa-sm` > `m-subscreens-active` | The screen; window scroll | The app | Yes |
| Tray panel | A right-aligned panel inside the canvas, 400 px, full width below 600 px | Opens over the canvas from the Today, Chat and Notifications buttons; one panel, tabbed; closes on Esc or its close button; stays across navigation until closed | Framework frame, BOSS screens as content | Yes |
| Assist drawer | right `q-drawer`, 420 px, resizable, bordered | Toggled from the rightmost header button; stays across navigation; pushes the canvas from 1440 px, overlays below | Framework | It is Assist; not a target |
| Live call mini-window | `q-page-sticky` bottom right, 320 × 180 | Only during a call; drag to move; click to return to the call screen | Comms | Yes |
| Footer | `q-footer` bordered, `text-caption` | Theme footer items | Theme | No |

The canvas is the DOM Assist's `screen_use` reads and navigates; the header and the Assist
drawer are outside it, as initial-design decided. The tray panel renders inside the canvas so
Assist can read a Today item or a notification. Which header elements Assist may reach is
still open in initial-design; this layout makes the answer a list of ids rather than a layout
change.

### 2.2 The header, left to right

| Element | Kind | Owner | Behavior |
| --- | --- | --- | --- |
| Menu toggle | flat round button | Framework | Opens and closes the app drawer |
| App launcher | the theme logo as a button with a drop-down | Framework | A `q-menu` grid of the apps the user may open (the `/apps` menu items), each a tonal button with the app icon of §5.6; the current app marked; "All applications" at the bottom opens the AppList screen |
| App title | `q-btn` flat, `text-subtitle1 text-weight-medium`, or `q-toolbar-title shrink` when it has no menu | Framework, from the app root's menu title | The current app's name, "IronStone Sales"; in an app it opens a menu of the app root's subscreens (the top-level screens). The theme title is shown on the AppList only |
| Breadcrumbs | `q-breadcrumbs`, hidden below 600 px | Framework | The screen path from the app root; a crumb with subscreens opens a `q-menu` of its siblings |
| Search | flat button with label "Search" and a keyboard hint, icon only below 1024 px | Framework | Opens the palette (§2.4); Ctrl+K or Cmd+K anywhere |
| Quick create | flat round `+` | Framework; items from app providers | A `q-menu` of record kinds (task, event, note, contact, request, and what the current app registers); each opens that record's create form in a dialog, prefilled from the screen context (link to the current record, current customer, current product) |
| Today | flat round button with a badge | Framework; content from Commons | Badge: tasks and activities due today plus overdue; opens the tray panel on Today |
| Chat | flat round button with a badge | Framework; content from Comms | Badge: unread chat messages and mentions; opens the tray panel on Chat; presence dot on the icon |
| Mail | flat round button with a badge | Comms | Unread email of the user's mail accounts; a link into the Comms Inbox, not a panel, per initial-design's rule (synchronous or time-bound gets a panel, asynchronous gets a count) |
| Messages | flat round button with a badge | Comms | Unread internal messages and the mailbox posts delivered to the Inbox; a link to the Inbox's Internal account. Below 600 px Mail and Messages are one button with the summed badge |
| Notifications | flat round bell with a badge | Framework; topics from every app | Badge: unread notifications of the Notifications inbox and approvals waiting (the automatic Updates inbox has no badge; design-drawers-commons §1.2); opens the tray panel on Notifications |
| Documentation | flat round `?`, only when the screen has documents | Framework | As today: the screen's documents in dialogs |
| Theme plugins | the `STRT_HEADER_NAVBAR_COMP` components | Theme | As today; a deployment's own header widgets. The My Account counters widget retires, replaced by the badges above |
| Account | flat round avatar or initials | Framework | A `q-menu` list: name and user name, presence and status message, Preferences (opens Commons account screen), dark mode toggle, re-login, the `STRT_HEADER_ACCOUNT_COMP` components, Log out |
| Assist | flat round button, rightmost, highlighted when open | Framework | Toggles the Assist drawer |

Screen history leaves the header: the palette's "Recent" group lists the last 25 screens, and
the browser's history still works. The loading bar runs along the top of the header while the
root's `loading` count is above zero.

### 2.3 The app drawer

The drawer holds the current app's menu as nested `q-expansion-item`s (`m-menu-nav-item`),
dense, with the app's icons on the first level, the active path open and `text-primary`. Below
the tree, under a separator, the user's pinned saved finds for this app (already part of the
menu data as `savedFinds`), then the app's **Settings** and **Home** entries at the bottom. Depth
is two levels of menu under the app root; deeper screens are reached from their parent, not
from the drawer. Menu titles are the BOSS terms of research-crosscut §6.

Because apps are separate roots under the apps screen, the drawer always shows one app. Moving
between apps is the launcher, the palette or a cross-app link; a reused screen included by two
apps is reached under each app's own path with that app's drawer.

### 2.4 The tray panel and the palette

The tray panel is the Commons and Comms presence in every app: one panel, three tabs, each a
BOSS screen the framework loads by path, so it is designed and built like any other screen with
the `panel` archetype (§3.14). It is 400 px wide at the right of the canvas, the full width
below 600 px, and keeps its tab and scroll position across navigation.

| Tab | Content | Quick actions |
| --- | --- | --- |
| Today | Overdue, then due today, then later today: tasks, activities (call, email, to-do, meeting) and events, grouped by hour; a "my open approvals" count linking to Notifications; items registered by the current app (open RFQs for Sales, late shipments for Warehouse) | Mark done, snooze to tomorrow, join (event), open the record |
| Chat | Rooms and direct messages with unread counts; a room opens inside the panel; "Open in Comms" for the full screen | New message, start call |
| Notifications | Unread first, then read; filters by reason (mention, assignment, approval, date alert, reminder, system) and by app; **Approvals waiting** as its own group with Approve and Refuse inline | Mark read, open, approve, refuse; "Notification settings" link |

Quick create is a menu, not a tab. The palette is a `q-dialog` anchored at the top with an input
and grouped results: records (the search index, as QuickSearch does today), saved finds, actions
registered by apps ("Create sales order", "Receive shipment"), screens by title, and Recent.
Enter opens the first result; typing an id goes to that record as QuickLookup does.

**What a screen designer can count on.** The header, the app drawer, the palette and quick
create are always there. The tray panel can open over the right 400 px of any screen at any
time, and the Assist drawer can take 420 px, so a screen must work in the width that leaves
(§7). Quick create prefills from the screen's context, so a record screen's context line
(design-doc-guide §4) is what makes "New task" on an order link the task to the order. Items
a screen wants in Today, the palette, quick create or Notifications are providers the app
registers (§8), not header markup the screen writes.

### 2.5 The Assist drawer and screen context

Assist is a right `q-drawer`, resizable from 320 to 720 px, with the conversation, its canvas
controls and the running-tasks feed, as the Java Assist panel had and research-drawers-commons
§18 describes. It reads the screen context the root exposes: the current path and parameters,
the record (entity and id), the selected rows, the active filters, and the forms on the screen
with their field names. The same object feeds Chatter (which record to show messages for),
quick create (what to link), and the Today panel's "add to today" action. The framework
change that defines the context element and the root's context object is in §8; a screen's
part is its **Context** cell.

### 2.6 Feedback

- **Notifications:** `$q.notify` at top right, as today: positive 1.5 s for a successful submit
  (the form's `submit-message` or "Submit successful"), info 5 s, negative 15 s with a close
  button for errors; validation errors also mark their fields.
- **Loading:** the Quasar loading bar at the top; a list that is fetching shows the table with
  `q-inner-loading`; a dialog that is loading shows a `q-skeleton`.
- **Confirmation:** a `data-confirm` on a button or link asks before acting; the text names the
  object ("Cancel order SO10023?").
- **Unsaved changes:** a submit is `outline` until a field changes, then `unelevated primary`
  (kept from the Java client); changed fields get the blue tint.
- **Server messages** from a transition appear as notifications; a screen does not render its
  own message banners except for a persistent state (an order on hold shows a `q-banner` in its
  header card).

### 2.7 Ownership and plugin slots

Three kinds of header content, which answers the ownership question initial-design raises:

| Kind | Examples | How it gets there |
| --- | --- | --- |
| System-owned shell elements | menu toggle, launcher, title, breadcrumbs, search, quick create, Today, Chat, Notifications, account, Assist | Written in `m-qapps-root`; configured by labels and the theme |
| App-registered providers | quick-create items, Today sources, palette actions and result types, notification topics, inbox counts | Declared by an app root screen (§8 "shell providers"); the framework aggregates and shows them in the system-owned elements |
| Theme plugins | `STRT_HEADER_NAVBAR_COMP`, `STRT_HEADER_ACCOUNT_COMP`, footer items, logo, brand config | Theme data, as today |

BOSS writes no header markup. The tray panel's three screens, the panel content of a quick
create dialog and the palette's providers are BOSS's, and run inside frames the framework owns.

### 2.8 Changes from today's shell

| Today | This design |
| --- | --- |
| Logo links to `/apps` | Logo opens the launcher menu |
| Theme title in the header | Current app name; theme title on AppList only |
| Notifications button shows the client-side notify history | Notifications tab of the tray panel over `NotificationMessage` with approvals |
| Screen history button | Palette "Recent" group |
| My Account counters as a theme nav plugin | Today, Chat and Inbox badges as shell elements |
| No search in the header; QuickSearch is a screen | Search button and Ctrl+K palette with providers |
| No quick create | `+` menu with context prefill |
| No right drawer | Assist drawer; tray panel in the canvas |
| Account menu: name, plugins, dark mode, re-login, logout | Adds presence and status, Preferences link |
| Material Icons | Material Symbols outlined (§5.6) |

## 3. Screen archetypes

A design names an archetype and its deviations. Each archetype is one wireframe, one XML
skeleton and the rules that go with it; the gallery (§10) renders each with real widgets. The
skeletons name the elements of §4; `…` stands for the forms of the screen.

### 3.1 Landing

The home of an app; also an app's area home when an area is large. Stands on its own for a user
who has only this app.

```
┌ counters: number cards in a row (4–6) ───────────────────────────┐
│ [Open orders 42] [Quotes to send 7] [Late shipments 3] [Due today 5] │
├ my work ──────────────────────┬ shortcuts and charts ─────────────┤
│ Assigned to me (list, 10)     │ New order · New quote · Receive   │
│ Activities due (list)         │ Sales this month (chart)          │
│ Approvals waiting (list)      │ Pipeline by stage (chart)         │
└───────────────────────────────┴───────────────────────────────────┘
```

- Skeleton: `container-row` with `row-col` columns; counters as `number-card` (§8) linking to the
  filtered list; lists as `form-list` with `skip-header`, `paginate="false"` and ten rows; charts
  by `render-mode` `m-chart`; shortcuts as tonal links.
- Rules: every counter and list is a link into a list screen with that filter applied; lists on
  a landing never have header finds; the first row of counters is the role's view of the
  business, not system statistics. User-arranged landings come with Insights' dashboard
  widgets later; the landing is designed as the default arrangement.
- Phone: one column; counters wrap two per row.

### 3.2 List

A find and list screen over one record type; the entry to every detail.

```
┌ Orders                               [+ New order]  [Find options] [Columns] [Saved finds] │
│ ⌕ customer   status ▾   date period ▾   [list|board|calendar|pivot|graph]   ⬇ export ▾    │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ ☐ Order     Customer        Date       Status      Total      ⋮                            │
│ ☐ SO10023   Acme Co.        10/18/26   Approved    1,240.00   Ship · Invoice               │
│ …                                                                                           │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ 1–20 of 412   ‹ 1 2 3 … 21 ›   20 ▾                                                        │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

- Skeleton: `form-list` with its `header-field`s in Find Options (`header-dialog="true"` moves
  every header field there; a list cannot mix inline and dialog finds) and, when two or three
  filters are used constantly, a small find `form-single` with `field-row-big` above the list
  posting to `.`; `saved-finds="true"`, `select-columns="true"`, `paginate`, `show-page-size`, the
  export buttons (one dropdown); per-row actions as text links in a field, two at most; bulk
  actions as `multi="true"` with `row-selection` and its `action` children, which appear in the
  header's Row Actions menu; a `container-dialog` for New when creation is a short form, a link
  to a wizard or detail otherwise. The link in the first column is a text link to the detail.
- Rules: the identifier column first, status as a colored chip, amounts right-aligned, dates in
  the user's format; at most two inline row actions; bulk actions appear in the nav row only when
  rows are selected; `views` (§8) names the alternative views, and the board's group field is a
  status or enumeration; the default view is list.
- Phone: the list uses its `columns type="mobile"` set (§4.4), two columns, the record link in
  the first. Horizontal scroll is what remains when a series (one column per period or status) is
  still wider than the phone. The first column stays visible. Filters collapse into Find Options.

### 3.3 Detail

One record with its parts and actions. Most screens of most apps.

```
← Orders
┌ SO10023                                          Created › Approved › Shipped › Completed │
│ Sales order · Acme Co. · placed Oct 2                              [Approve] [Hold]       │
│ ───────────────────────────────────────────────────────────────────────────────────────── │
│ TOTAL       SHIP BY     OWNER                                  [Edit] [Send] [More ▾]     │
│ 12,400.00   Oct 28      (AL) Ann Lee                                                      │
└───────────────────────────────────────────────────────────────────────────────────────────┘
├ Overview │ Items │ Shipments │ Invoices │ Payments │ History ──────────────────────┬ Chatter ───┤
│ ┌ Header (box) ──────────────┐ ┌ Customer (box) ────────────────┐                  │ ✎ message  │
│ │ fields…                    │ │ fields…                        │                  │ ⏱ activity │
│ └────────────────────────────┘ └────────────────────────────────┘                  │ ─────────  │
│ ┌ Items (list, editable rows) ────────────────────────────────────────────────────┐│ timeline…  │
│ └─────────────────────────────────────────────────────────────────────────────────┘│            │
└────────────────────────────────────────────────────────────────────────────────────┴────────────┘
```

- Skeleton: the way back (a back link, or the path) above a header card, `container style="m-record-header"`,
  of two rows. The top row (`row items-start q-col-gutter-x-md q-col-gutter-y-sm`): the identity in
  `col-12 col-md m-record-title` (the identifier or name as `label type="h5"` with no margin classes, the caption
  under it) and the `status-bar` (§8) in `col-12 col-md-auto m-record-status`, which from 1024 px puts its stages
  on one line and its buttons under them, at the right. The foot (`row items-center … m-record-foot`, under a faint
  divider): the facts or chips in `col-12 col-md`, the actions in `col-12 col-md-auto row items-center
  m-record-actions` (the primary action as a `submit` or `link`, secondary ones in a `button-menu`). A record
  with no status puts its actions in the top row's right column and has a foot only for facts. Then
  `subscreens-panel type="tab"` for the parts, or `container-box`es on one page when there are three or fewer;
  `chatter` (§8) as the right column from 1440 px and as the last tab below. Nothing of the body sits loose on
  the page: a description or a list goes in a box.
- Rules: one primary action, chosen by status (Approve when created, Ship when approved); every
  status change confirms; the header card shows what every role needs (identifier, status, who,
  when, total); an `include-screen` or `section-include` for parts shared with other details
  (addresses, payments); read-only roles see the same layout with the actions and the inline
  edits gone, never a different screen.
- Phone: tabs scroll; boxes stack; Chatter is a tab.

### 3.4 360

A detail for a party or product seen through the current app's role, per research-crosscut §3.

```
┌ ● Acme Co.  Customer since 2019  ·  AR balance 12,400  ·  Open orders 3  ·  Open cases 1  ·  Last contact 2 d │
│   [Call] [Email] [New order] [New case]                                                         ⋮  │
├ Overview │ Contacts │ Opportunities │ Quotes │ Orders │ Agreements │ Cases │ Invoices │ Activities ┤
│ …                                                                                          │ Chatter │
```

- Skeleton: as Detail with a header card holding identity (avatar from the party's content),
  classification chips and four to six key numbers as `number-card`s in `size="sm"`; the tab
  set comes from the including app's context (design-doc-guide §7); Chatter spans every tab.
- Rules: key numbers are links into the matching list with the party filter; the primary
  actions are the app's (Sales: new order; Customer Service: new case); the Contact tab reuses
  the Contact record; Files is the Files component scoped to the party.

### 3.5 Task

A screen for doing one operational job quickly: receive, put away, pick, pack, count, issue
material, clock in. Large controls, one thing at a time, scanner friendly.

```
┌ Pick · Wave W-118 · 12 of 40 lines ────────────────────────────┐
│  Location  A-03-12                                             │
│  Product   WIDGET-RED-L   Blue widget, large                   │
│  Pick      [    4    ] of 4            ⌨ scan or type          │
│  [ Confirm ]            [ Short ] [ Skip ]                     │
├ Remaining lines (list) ─────────────────────────────────────────┤
```

- Skeleton: a `form-single` with `field-row-big`, a focused `text-line` for the scan input with
  `focus-field`, large `submit`s; `dynamic-container` for the step that reloads after each
  confirm; a compact `form-list` of what remains.
- Rules: one primary per step, Enter submits, the next scan field is focused after submit, errors
  are spoken in a word ("Short", "Wrong location") not a sentence; works at 360 px and with the
  handheld density of §7; never a tab set.

### 3.6 Board

A list shown as columns by status or stage with cards; pipeline, work items, cases.

```
┌ Pipeline  [list|board|calendar]   ⌕   owner ▾   [+ New opportunity] ────────────────────────┐
│ Qualify (12)      │ Propose (7)       │ Negotiate (3)     │ Won (24)          │ Lost (9)     │
│ ┌ Acme expansion ┐│ ┌ Beta pilot     ┐│                   │                   │              │
│ │ 120,000 · J.D. ││ │ 45,000 · M.S.  ││                   │                   │              │
│ │ ⏱ call tomorrow││ └────────────────┘│                   │                   │              │
```

- Skeleton: a `form-list` with `view-board` (§8): `group-field`, card title field, two to four
  card fields, a badge field; drag between columns calls the status transition. Until §8 lands,
  a `.qvue` screen with the same data.
- Rules: the board is a view of the list, never a separate screen, so filters and saved finds
  apply; a column's count and sum in its header; a card opens the detail; a board column maps
  to a status flow stage, not an arbitrary field, except that a board may also group by a
  planning field (assignee, sprint, milestone, release) where an app's design says so, a drag
  then setting that field (design-projects WorkItems).

### 3.7 Calendar and timeline

Events, schedules, shifts and plans on a time grid.

- Skeleton: `form-list` with `view-calendar` (§8): start, end and title fields, a color field
  mapped to a semantic color; day, week, month and list modes; drag to move or resize calls a
  transition. A plan or Gantt is `view-timeline` later. Until §8 lands, a `.qvue` screen.
- Rules: the same list filters select what is shown; a click opens the quick-create dialog with
  the time prefilled; resource calendars (rooms, equipment, people) are the same view grouped by
  resource.

### 3.8 Split

A master list beside a detail pane: inbox, contacts, files, chat rooms, knowledge pages.

```
┌ ⌕ contacts          [+] │ Jane Doe                                [Edit] [Call] [Email] ⋮ │
│ ● Acme Co.              │ Sales manager · Acme Co.                                       │
│   Jane Doe   ◂          │ ┌ Contact info ─────┐ ┌ Relationships ──────┐                  │
│   John Roe              │ └───────────────────┘ └─────────────────────┘                  │
│ ● Beta Inc.             │ Chatter…                                                       │
```

- Skeleton: `container-split` (§8) with a side of 320 px holding a `form-list` with a header
  find on the name (not `skip-header`, which removes the header fields too), and a main pane that
  is a `dynamic-container` loading the selected record's detail or a reused record screen. Until
  `container-split` exists, a `container-row` of two `row-col`s (3 and 9 columns from `lg`, 4 and
  8 from `md`) stacks below 1024 px; `container-panel` keeps its fixed side width and overflows a
  phone.
- Rules: the side list keeps its position and selection while the detail changes; the URL holds
  the selected id so the detail is bookmarkable, and the side list's `search-form-inputs` names
  that id in `skip-fields` so the selection does not filter the list; a paginated list does not
  fit a 320 px pane (its nav row wraps), so the side list is limited and narrowed by its find;
  below 1024 px the panes stack and the detail shows a back button.

### 3.9 Settings

An app's settings index and its pages.

- Index: a `container-row` of `container-box` cards, one per settings group, each with a short
  description and the links into its pages; Admin's settings index links to every app's index.
- Page: `form-single` forms in `container-box`es and small `form-list`s for enumerations and
  types, with `auto-fields-entity` allowed for plain configuration records.
- Rules: a setting that several apps share (payment gateways, carriers, mail domains) is edited
  on one page and read-only elsewhere with a link to it; a dangerous setting confirms.

### 3.10 Wizard

Multi-step creation or setup: order entry for a new customer, import mapping, store setup,
onboarding.

- Skeleton: `subscreens-panel type="wizard"` (§8, rendered as a `q-stepper` with a `form-single`
  per step); until then, a detail with boxes and a Next primary. Steps are screens, so the URL
  holds the step.
- Rules: a step validates before Next; Back never loses entered values; the last step is a
  review with a single primary; a wizard that can be abandoned saves a draft record.

### 3.11 Dialog

Create and edit forms opened from a list or a detail without leaving it.

- Skeleton: `container-dialog` with a `form-single`; `width` 600 for a single-column form, 900 for
  two columns; the form's `background-submit="true"` with `background-reload-id` (the list behind
  refreshes) or `background-hide-id` (the dialog closes), and `background-message` for the toast;
  the transition answers `url="."`, which the client reads as JSON with the messages, or
  `type="none"`, which carries no message; `dynamic-dialog` when the body is another screen. For a
  screenshot or a test, `?_openDialog=<dialog id>` opens a dialog on load.
- Rules: one primary and Cancel; a dialog never opens another dialog; a form longer than one
  screen height is a detail or a wizard, not a dialog; dialogs are maximized below 600 px.

### 3.12 Report

Parameters, result tables and charts, exports; Insights dashboards.

```
┌ Sales summary   interval ▾  thru date ▾  customer ⌕  product ⌕   [Run]   ⬇ ─────────────────┐
│ [Orders 1,204] [Net sales 310,400] [New customers 12%] [Paid 88%]                            │
│ ┌ chart ────────────────────────────┐ ┌ chart ────────────────────────────┐                  │
│ ┌ table ──────────────────────────────────────────────────────────────────┐                  │
```

- Skeleton: a `form-single` of parameters with `field-row-big`, number cards, `m-chart` through
  `render-mode`, `form-list` tables with `show-csv-button` and `show-xlsx-button`; `html-print`
  render mode for the printable version.
- Rules: parameters are in the URL so a report is bookmarkable and schedulable as a saved find;
  chart colors come from the brand palette in a fixed order (§5.1); every chart has a table
  behind it or a download.

### 3.13 Editor

A document the user writes: wiki page, note, knowledge article, email template, long description.

- Skeleton: a `.qvue` screen with the co-editing component (§8) over `yrs`, the page tree in a
  `container-split` side, title and status in a title row; `text-area editor-type="md"` for a
  short description inside a form.
- Rules: autosave with a visible state ("Saved", "Saving", "Offline"); history, compare and
  review as actions, not tabs; the rendered page is the same component read-only.

### 3.14 Panel

The content of a tray panel tab or a quick-create dialog: narrow, scannable, actionable.

- Skeleton: a screen with `q-list dense` items by `render-mode` or `form-list` with `skip-header`,
  grouped by a caption, each item with its one or two quick actions as flat icon buttons; a
  quick-create dialog is a `form-single` of six or fewer fields with the context link shown as a
  chip.
- Rules: 400 px wide; nothing opens a second panel; every item links to its record in the canvas;
  counts refresh through the notification WebSocket, not polling. The tray is 400 px inside a wide viewport, so a panel
  screen lays itself out for that width and uses no viewport breakpoint columns (`col-md-*` and the like), which follow
  the window and not the panel.

### 3.15 Tree list

A list whose rows nest under a parent row, with the columns of a list and the totals of each
branch: a work breakdown, a chart of accounts with balances, a bill of materials, facility
locations with stock, an org structure with headcount. It is a view of the List archetype
(`views="list,tree"`), not a screen archetype of its own, so a design's screen table keeps
`list`; it is used rarely, and when it is used it carries the screen, so it is held to this
section closely.

```
┌ Work items  [list|board|calendar|tree]   ⌕   Expand ▾ (1 · 2 · 3 · all)   [+ New] ─────────────────┐
│ Item                                     Status        Est.   Total est.   Total act.   Done      │
│ ▾ PROJ-1  Customer portal                In Progress    4.0        86.0         52.5    11/19     │
│ │ ▾ PROJ-4  Sign-in and accounts         In Progress    2.0        30.0         28.0     6/8      │
│ │ │   PROJ-9   Password reset            Complete       6.0         6.0          7.5              │
│ │ │ ▸ PROJ-11  Two-factor                Approved       0.0        14.0          0.0     0/3      │
│ │ ▸ PROJ-5  Order history                In Planning    1.0        52.0         24.5     5/10     │
│ ▸ PROJ-2  Data migration                 Approved       8.0        40.0          0.0     0/6      │
├────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Total (2 top-level items)                                         126.0         52.5    11/25     │
└────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

- Skeleton: a `form-list` with `views` including `tree` and a `view-tree` (§8):
  `parent-field`, the transition that returns one level's rows (`children-transition`, called
  with the list's find and the parent id), `rollup-fields` (the fields a parent row totals over
  its branch, computed by the service, never summed in the browser), and the `transition` a drag
  posts to. It renders through the same `div` table and cell renderers as the list (§4.4), so
  the columns, widths, inline edits, chips and formats are the list's, and switching views keeps
  the columns in place. The tree is drawn in the first column; there is no separate tree pane
  beside a table. Quasar's `q-tree` is not used for it: it has no columns (the `tree` element of
  §4.2 is for a single-column navigation tree such as wiki pages or folders).
- Look:
  - Indent 20 px a level in the first column only; every other column stays aligned to its
    header at every depth. A chevron (`sym_o_chevron_right`, turned 90° when open, 150 ms) sits
    in a 24 px gutter before the label; a leaf has the empty gutter so labels at one depth line
    up. Thin guide lines (`$separator-color`, 1 px) run down from an open parent to its last
    child, as in the wireframe, so a long branch can be followed by eye.
  - Past six levels the indent stops growing and the row shows its level as a small muted
    number before the label; on a phone the indent is 12 px and stops at four levels.
  - A parent's label is medium weight (500); a leaf's is regular. Roll-up columns are headed
    "Total …" and placed right of the row's own columns; a parent's total is in the normal text
    color and a leaf's, which only repeats its own value, is muted (`.m-muted`). A collapsed
    parent still shows its totals: that is what the view is for.
  - A row shown only to place a matching descendant (an ancestor the find leaves out) is muted
    in every cell, has no inline edits or row actions, and keeps its chevron.
  - Selection, hover and the focused row are the list's styles; the focused row also shows its
    branch's guide line in `primary` so where it sits is visible in a deep tree.
- Behavior:
  - Children load on open, with one skeleton row (`q-skeleton`, 28 px) while they come, and an
    error row with Retry if they fail; the other branches stay usable. A level of more than 200
    rows ends in a "Show 200 more" row; the top level pages as a list does.
  - Expand to level 1, 2, 3 and Expand all are in the toolbar; Expand all asks first past 500
    rows. Which rows are open is kept per user and screen (browser storage, so a lost store just
    reopens to level 1); the level chosen is in the URL, so a link opens the same depth.
  - A find keeps the tree: matching rows appear under their ancestors, with the branches that
    hold a match opened. Sorting by a column sorts siblings within each parent and never
    flattens the tree; the list view is the flat view.
  - Drag (where the screen allows it): a line between rows to reorder, indented to the depth the
    row will land at, moving left and right with the pointer to choose an outdent; a row tinted
    `primary` (10%) to drop into it as the last child; a collapsed row hovered for 600 ms opens.
    A drop the service will refuse (a row into its own branch) shows the not-allowed cursor and
    no indicator. After a drop the row stays focused and briefly flashes, and the old and new
    parents' totals refresh from the response.
  - Keyboard, as the WAI-ARIA treegrid pattern: up and down move between visible rows, right
    opens a row or moves to its first child, left closes it or moves to its parent, Home and End
    go to the first and last visible row, Enter opens the record, F2 edits the focused cell; where
    re-parenting is allowed, Tab indents the row under the sibling above and Shift+Tab outdents it,
    and Alt+up and Alt+down move it among its siblings. The table has `role="treegrid"`, each row
    `aria-level`, `aria-expanded` (parents), `aria-setsize` and `aria-posinset`.
  - The totals row sums the top-level rows only, so nothing is counted twice; a total over a
    branch whose rows were not all loaded comes from the service, never from the loaded rows.
- Exports and other modes: CSV and XLSX carry a level column and the parent's id, and the XLSX
  sets row outline levels so a spreadsheet can fold the same branches; `html-print` prints the
  tree to the level open on screen, indented, with each parent's totals on its row. The html
  render mode is a nested table with the same indents; the tui mode an indented outline with
  `+` and `-` before each parent and the totals right-aligned.
- Rules: offer a tree only where the hierarchy is the user's question (what does this branch
  cost, where does this item sit); otherwise give the list a parent column and filter. The
  first column is the record link with its id and name, as in a list. A roll-up the user can
  edit is not offered: the row's own value is the editable field and its total follows.

## 4. Widget guide

What each XML element renders as in `qvt` today, and when to use it. The macros are
`framework/template/screen/ScreenQvt.js` with the static mirror `ScreenQvtStatic.js`; the
wrappers are the `m-*` components of `webroot/screen/webroot/js/WebrootVue.qvt.js`, documented in
`docs/ui/Qvt-Client.md`. The field wrappers add `dense outlined stack-label hide-bottom-space` themselves.

### 4.1 Containers and layout

| Element | Renders as | Use for |
| --- | --- | --- |
| `container` | `div` with the `style` classes | Grouping; Quasar flex rows and columns through classes (`row q-col-gutter-sm`, `col-12 col-md-6`) |
| `container-row` + `row-col` | Quasar `row` and `col-*` | Responsive columns of boxes and forms |
| `container-box` (+ `box-header`, `box-toolbar`, `box-body`, `box-body-nopad`) | `m-container-box`: `q-card flat bordered`, title `text-subtitle1 text-weight-medium`, toolbar slot, collapse toggle, `type` as a left accent border (`primary`, `info`, `warning`, `success`, `danger`) | The sections of a detail or settings page. Do not nest boxes |
| `container-panel` (+ `panel-header`, `panel-left`, `panel-center`, `panel-right`, `panel-footer`) | Fixed-width side columns (`size`, default 180 px) around a center, as table cells; they do not stack below 600 px, the page overflows | A filter rail on a desktop-only screen; prefer rows and columns for anything a phone shows |
| `container-dialog` | `m-container-dialog`: a tonal button (`button-text`, `icon`) opening `m-dialog` (`q-dialog` with a `q-card`, title row, close, scrolling body, `width`, `condition`; maximized below 600 px) | Create and edit forms off a list or detail (§3.11) |
| `dynamic-container` / `dynamic-dialog` | `m-dynamic-container` / `m-dynamic-dialog`: loads a screen by its transition URL into a `div` or a dialog; reloaded or hidden by id from a form's `background-reload-id` and `background-hide-id` (the `submit-reload-id` and `submit-hide-id` props of `m-form`) | Partial refresh after a dialog form; the main pane of a split; a task step that reloads after each submit (the container's transition names `.` with a parameter the screen uses to render only the step) |
| `section` / `section-iterate` / `section-include` | Conditional markup, a repeat, an include from another screen file | Shared fragments (an address block) and repeated groups |
| `include-screen` | Another screen rendered inline | A reused screen inside an app's screen when a subscreen is not wanted |
| `render-mode` with `text type="qvt"` | Raw template text; `${}` in it is expanded without HTML encoding, so attribute JSON and user text go through `WebUtilities.encodeHtml` | Charts (`m-chart`), diagrams (`m-mermaid`) and the allowed raw markup of §4.8 |

### 4.2 Navigation

| Element | Renders as | Use for |
| --- | --- | --- |
| `subscreens-panel type="tab"` | `m-subscreens-tabs` (`q-tabs dense no-caps narrow-indicator inline-label`, separator) then the active subscreen | The parts of a detail, a 360 or a settings area |
| `subscreens-panel type="popup"` | The active subscreen only; siblings are in the breadcrumb menu and the app drawer | App and area roots |
| `subscreens-panel type="stack"` / `"wizard"` | Not supported today (writes a placeholder); wizard planned in §8 | Multi-step flows |
| `subscreens-item` | A menu entry: `menu-title`, `menu-index`, `menu-include`, `menu-image` with `menu-image-type="icon"`, `location` | Every subscreen; `location` is how a reused `Shared/` screen is mounted |
| `button-menu` + `menu-item` | `q-btn-dropdown` (tonal) with a `q-list` of items | Secondary actions on a title row (Hold, Cancel, Clone) |
| `tree` (+ `tree-node`, `tree-sub-node`) | `m-tree-top` / `m-tree-item`, nodes fetched on open | A single-column navigation tree: wiki pages, folders, categories; rows with columns and totals are a list's `view-tree` (§3.15) |
| `link` (screen link) | See §4.6 | Navigation and actions |

### 4.3 Form layout (`form-single`)

| Element | Renders as | Use for |
| --- | --- | --- |
| `field` + `default-field` / `conditional-field` | One labeled field (`title`, `tooltip`); conditions pick the widget | Every field |
| `field-layout` > `field-row` | Columns with `q-col-gutter-sm`: `col-xs-12 col-sm-6` for two `field-ref`s, `col-sm-4` for three, `col-sm-3` for four; they stack below 600 px | Two to four fields side by side |
| `field-row-big` | An inline row, `items-center`, wrapping | Find forms, action rows, the scan row of a task screen |
| `field-group` (`box="true"`) | `m-container-box` with the group title | Grouping a long form |
| `field-accordion` | `q-list bordered` of `q-expansion-item`s | Rarely used groups below the main ones |
| `fields-not-referenced` | The rest of the fields | After an explicit layout |
| `auto-fields-entity` / `auto-fields-service` | Fields from the definition | Settings and admin records; not for designed forms |
| `submit` / `reset` | Primary button (`outline` until a field changes, then `unelevated primary`) / flat button | One submit per form |
| `widget-template` (+ `widget-template-include`) | A reusable widget definition | Repeated lookups: party, product, facility |
| `depends-on`, `visible-when` | Reload options when another field changes; show a field conditionally | Dependent drop-downs; optional sections |

### 4.4 Lists (`form-list`)

The list is a `div` table in a bordered card with `q-table--dense q-table--flat
q-table--horizontal-separator`, 28 px rows, 12 px medium headers.

| Feature | Attribute or element | Renders as |
| --- | --- | --- |
| Header find | `header-field` per column | Find widgets in the header row; `header-dialog="true"` moves them to the Find Options dialog |
| Saved finds | `saved-finds="true"` | Saved Finds dialog; pinned finds in the app drawer |
| Column picker | `select-columns="true"` | Columns dialog with drag ordering (`m-form-column-config`) |
| Paging | `paginate`, `show-page-size`, `show-all-button` | `q-pagination`, a page-size dropdown and a range caption in the nav row |
| Exports | `show-csv-button`, `show-xlsx-button`, `show-text-button` | One download dropdown; print is in it |
| Selection and bulk | `multi="true"` with `row-selection` and its `action` children (`button-text`, `button-icon`, `dialog`, `id-field`, `list-mode`) | `q-checkbox` per row with shift range; the actions in the header's Row Actions menu, each a form posting the selected ids |
| Per-row actions | `link`s in a field of the row | Text links in the cell; two at most, more go in a `button-menu`. `row-actions` is not UI: it is the block of actions run for each row (derived fields) |
| Create and totals rows | `first-row-field`, `second-row-field`, `last-row-field` with their transitions | A create row above the rows; totals below |
| Column groups | `columns` > `column` > `field-ref` (the older `form-list-column` is the same shape) | The untyped `columns` is the desktop default: related fields stacked, about six to eight columns. `columns type="mobile"` is the phone and the narrow terminal (below 600 px, or below 80 terminal columns): two columns, the record link first and the status, due, or amount beside it. `select-columns` keeps every other field under Do Not Display. A list with `view-tree` keeps the record link alone in the first column, because the tree shows the first field of each column and the roll-ups as their own columns; on a phone the key, the title, and the status are each their own column. A series, one column per period or status, is not stacked. CSV and XLSX follow the untyped set, one spreadsheet column per field |
| Inline edit | `editable` on a field, `editable-load` | `m-editable`, a `q-popup-edit` on click |
| Sort | column header links | Arrows on the title line; the active one `text-primary` |
| Alternative views | `views` + `view-board`, `view-calendar`, `view-tree` | §8; the tree view §3.15 |

Rules: a list's first column is the text link to the record; a status is a chip; numbers are
right-aligned with the user's format; at most two inline row actions; a list on a landing has
`skip-header` and no paging; a list that is edited in place uses editable rows rather than a
dialog per row.

### 4.5 Fields

| Element | Renders as | Use for |
| --- | --- | --- |
| `text-line` | `m-text-line`, `q-input`; `mask`, `size`, `maxlength`, `input-type`, `format`; `ac-transition` turns it into a drop-down with server search; `default-transition` fills a default | Text and numbers |
| `text-area` | `m-text-area`; `editor-type="md"` adds a Marked preview; `"html"` is `q-editor` | Notes and descriptions (`md`); email bodies (`html`) |
| `drop-down` | `m-drop-down`, `q-select`; `entity-options`, `list-options`, `option`, `dynamic-options` with `depends-on`; `allow-empty`, `allow-multiple` (chips), `combo-box`, `server-search`, `submit-on-select`; a Not toggle in find forms | Enumerations, statuses, lookups by id with search |
| `lookup` | A text line (legacy) | Not for new screens; use `drop-down` with `dynamic-options` |
| `date-time` | `m-date-time`: masked input with `q-date` and `q-time` in a popup; `type` date, time or date-time; `min`, `max` | Dates and times |
| `date-period` | `m-date-period`: period and offset, or from and thru, with a mode toggle | The date filter of a list |
| `date-find`, `range-find`, `text-find` | From and thru pairs; `m-text-find` with an operator menu (operator, Not, ignore case) | Find forms |
| `check` / `radio` | `m-check` / `m-radio`: one `q-checkbox` or an inline `q-option-group` in a borderless field | Flags; small fixed choices |
| `file` | `m-file`, `q-file` with chips | Uploads |
| `display` / `display-entity` | `m-display`: text, or a read-only field with a label (`label-wrapper`); `value-url` loads it; `format`, `currency-unit-field`; `also-hidden` posts the value | Read-only values; id to description |
| `hidden`, `ignored`, `password` | As named | |
| `label`, `image`, `link` in a field | Text, image, link | Units, pictures, actions in a row |
| `editable` | Click to edit in place, `q-popup-edit` | Cells and detail values that change often |

A `display` value never looks like an input, a group of checkboxes is never boxed like an input,
and a field inside a field adds no spacing: the wrappers handle these.

### 4.6 Links and buttons

One hierarchy, from the webroot js README and the style plan, applied by the macros:

| Role | Where | Quasar |
| --- | --- | --- |
| Primary | A form's `submit`; Sign in; the one main action of a title row as a `link` with `btn-type="primary"` | `unelevated no-caps color="primary"`; a form submit is `outline` until a field changed |
| Secondary (tonal) | `link` outside a list cell; transition links; `button-menu`; dialog buttons; Find Options, Columns, Saved Finds | `unelevated no-caps dense class="m-btn-tonal"`, with `text-<color>` from `btn-type` (danger is `negative`, success `positive`, warning, info) |
| Tertiary (flat) | `reset`; page size; the export menu; icon buttons; dialog close; row-action tools; a `container-dialog` or `dynamic-dialog` button inside a list cell | `flat dense`, `round` when icon only, always with a `q-tooltip` |
| Text link | A `link` with the default `link-type` inside a list cell; `link-type="anchor"` anywhere | `m-link` with `m-link-text`; `anchor-button` keeps a button in a cell |

Rules: one primary per form, dialog or title row; a destructive action is tonal with
`btn-type="danger"` and a `confirmation`; `outline` is reserved for the unchanged submit; no
caps; icons on buttons are `size="sm"`; a row has text links, not buttons. The `icon` of a
`link`, `submit`, `button-menu`, `container-dialog` or `dynamic-dialog` is a Material Icons
name (`icon="add"`, later `sym_o_add`) or a Font Awesome class (`fa fa-plus`).

### 4.7 Text and labels

| Element | Renders as | Use for |
| --- | --- | --- |
| `label` with `type` | `h1`–`h6`, `p`, `span`, `strong`, and `text-*` classes through `style` | Titles and captions; `h5` for a record title, `h6` for a section outside a box |
| `image` | `img`; the `invertible` class inverts it in dark mode, which suits monochrome images only | Logos, product images, avatars |
| `render-mode` `text type="qvt"` with `m-chart` | Chart.js 4, loaded on first use | Charts (§5.1 for colors) |
| `render-mode` `text type="qvt"` with `m-mermaid` | Mermaid 11 | Flow maps and diagrams |

### 4.8 Raw Quasar: allowed and not

Inside `render-mode` `text type="qvt"` and in a `.qvue` screen:

- **Allowed:** `q-card`, `q-card-section`, `q-list` and `q-item`, `q-chip`, `q-badge`, `q-avatar`,
  `q-banner`, `q-timeline`, `q-stepper`, `q-splitter`, `q-tabs` and `q-tab-panels`,
  `q-expansion-item`, `q-skeleton`, `q-separator`, `q-space`, `q-btn` in the roles of §4.6,
  `q-btn-dropdown`, `q-btn-toggle`, `q-menu`, `q-tooltip`, `q-icon`, `q-linear-progress` and `q-circular-progress`,
  `q-inner-loading`, `q-scroll-area`, `q-virtual-scroll`, `q-table` for a client-side table in a
  `.qvue`, `q-dialog` through `m-dialog`, the flex, spacing, typography and color classes.
- **Not allowed:** `q-input`, `q-select`, `q-date`, `q-time`, `q-field`, `q-file`, `q-form`,
  `q-checkbox`, `q-radio`, `q-toggle` as data inputs; use the `m-*` wrappers, which carry the
  model, the remote options, the dependencies and the change tint, and inside a `.qvue` the
  `m-form` and the same wrappers. Hex colors, inline `style` colors and `<style>` blocks in a
  screen; `q-layout`, `q-header`, `q-drawer`, `q-footer` (the shell's).
- **A second use is a widget.** When two screens want the same raw markup, propose the XML element
  in the design's needs table (§8).

**A `.qvue` screen** (the gallery's Board and Calendar are the examples): the screen XML says
`render-modes="vue,qvue" server-static="vue,qvue"` and its widgets are one
`<render-mode><text type="qvue" location="component://…/Name.qvue" template="false"/></render-mode>`;
`template="false"` keeps the server from expanding `${}` inside the component's JavaScript. The
file is `<template>…</template><script>module.exports = {…}</script>` with optional `<style>`. Data
comes from the screen's own transitions (`ec.web.sendJsonResponse`), called with `moqui.request`
at `this.$root.basePath + '/' + this.$root.currentPathList.join('/') + '/<transition>'`; answers
go through `moqui.notifyMessages(json.messageInfos, json.errors)`. The caption box is
`m-container-box`; forms are `m-form` with the `m-*` wrappers; a dialog that closes after its
form submits uses `submit-hide-id` and registers itself with `this.$root.addContainer(id, this)`
and a `hide()` method. The component is cached as server-static, so a screen whose state is in
the URL watches `$root.currentParameters` (deep) and reloads its data; navigation is
`this.$root.setUrl(path)`.

**The terminal twin.** A screen that goes custom in one render mode is implemented again for
each other mode it should work in. For the terminal (the `tui` render mode, planned in mr-moqui
`plans/archive/Screen-TUI-Impl.md`, §2.9 there) that means:

- **A raw `qvt` text** gets a `text type="tui"` in the same `render-mode` element: a fragment of
  the TUI screen model, as JSON. A chart names the `chart` component with the same data expression
  the qvt text uses.
- **A `.qvue` screen** adds `tui` to its `render-modes` (`vue,qvue,tui`) and gets a
  `<text type="tui" location="component://…/Name.tui.json" template="false"/>` beside its `qvue`
  text. The file is usually one `component` node with its props, naming a terminal component that
  BOSS registers from its crate behind a `tui` feature.
- **Data stays shared.** The component calls the same transitions as the `.qvue` file, so only the
  presentation is written twice. The gallery's `Board.tui.json` and `Calendar.tui.json` are the
  examples.
- **Expansions are JSON.** In a `tui` text, every `${}` is written as `${JSON.stringify(value)}`.
  A bare expansion is a JSON injection, as a bare one in qvt text is an HTML injection, and the
  lint flags it.

Until a screen has its `tui` text, the terminal shows a placeholder with a link to open the screen
in the browser, and `moqui lint` lists the screen. A plain XML screen needs no terminal work: the
`tui` macros render its widgets.

### 4.9 Actions, scripts and transitions

- Expressions and scripts are JavaScript: `a || b`, not Groovy's `?:`; the lint flags Groovy idioms.
- A script writes to the screen context by bare assignment (`total = 3`) or through `context`
  (`context.total = 3`, and `context.get`, `put`, `remove` as in Java); `var`, `let` and `const`
  stay in the script.
- Entity values in scripts: a number-decimal is a decimal object (`v.toNumber()`; `Number(v)`
  throws), a date-time is a timestamp object whose `String()` is epoch milliseconds
  (`ec.l10n.format(v, 'yyyy-MM-dd HH:mm')`), and an empty array stored in the context reads back
  as null, so conditions over lists are null-safe.
- `<message type="info">text with ${expansions}</message>`: the text is the element content.
- A transition a form posts in the background answers `<default-response url="."/>` (the client
  gets JSON with the messages and reloads or hides the container it was told to) or `type="none"`
  with the message on the form's `background-message`; a `none` response carries no messages, as
  in Java.
- `entity-find limit` and `offset` take a literal or a `${}` expression; an empty or non-numeric
  result applies no limit and is logged at debug.
- A `tree-node`'s label or link needs an `id` (`id="${entry.enumTypeId}"`) or its sub-nodes get
  an empty `treeNodeId`.
- One broken screen under a root breaks every sibling today (the shell's menu data loads all of
  them and the error is not logged), so check the server answer of a sibling when a whole app
  stops rendering; the failure-tolerance fix is in §8.

## 5. Color, typography, density and icons

### 5.1 Brand colors and their meaning

Quasar's defaults (`ui/src/css/variables.sass`) are `primary` #1976D2, `secondary` #26A69A,
`accent` #9C27B0, `positive` #21BA45, `negative` #C10015, `info` #31CCEC, `warning` #F2C037,
`dark` #1d1d1d with `dark-page` #121212. mr-moqui's shell sets `info` to #1e7b8e for contrast
and a theme may replace any of them through `STRT_QUASAR_CONFIG` (`{"brand": {...}}`), which
the shell merges over its defaults. Screens use the names, never the values:

| Name | Use for | Not for |
| --- | --- | --- |
| `primary` | Actions, the active tab or menu entry, links, sort arrows, the selected board card, "in progress" statuses | Decoration, large fills |
| `secondary` | A second series in a chart; a secondary accent on a 360 header | Buttons |
| `accent` | Marketing and highlight uses, rarely | Statuses |
| `positive` | Success, completed and paid statuses, upward good deltas, the Approve action text | "Active" |
| `negative` | Errors, cancelled and rejected statuses, destructive action text, downward bad deltas | Warnings |
| `warning` | Needs attention: on hold, overdue, exceptions, unsaved external state | Errors |
| `info` | Informational statuses (sent, received, scheduled), help banners | Success |
| grey scale (`grey-1` … `grey-10`) | Draft and proposed statuses (`grey-6`), captions, disabled, borders | Semantic meaning |

Chart series take `primary`, `secondary`, `accent`, `info`, `warning`, `positive`, `negative` in
that order, then the `*-8` shades of blue, teal, purple, orange and green from the palette, read
from the brand CSS variables at render time so a theme change recolors charts. A chart never
encodes meaning by color alone; the legend and the table carry it.

### 5.2 Status display

A status is a `q-chip dense square` with the status description, tinted like a tonal button
(the `m-tonal` class of §8) in the color of its meaning:

| Meaning | Color | Examples |
| --- | --- | --- |
| Draft, proposed, created | grey | Created, Proposed, Draft, Requested |
| In progress, active | primary | Approved, In progress, Picking, Open |
| Waiting on something | warning | On hold, Pending approval, Overdue, Backordered |
| Done well | positive | Completed, Paid, Shipped, Delivered, Won |
| Ended badly | negative | Cancelled, Rejected, Void, Lost, Failed |
| Informational | info | Sent, Received, Scheduled, Invoiced |

The mapping lives with the status items (a `StatusItem` to color map seeded with BOSS data,
over the status flows the Tools app shows), so the `status-bar` and the chips agree. In a list
the chip replaces the status text; in a detail the `status-bar` shows the flow with the current
stage filled and the next stage as the primary action.

### 5.3 Typography

The body is 14 px Roboto at line height 1.5 (`$body-font-size` in `variables.sass`). The
shell's style sheet trims Quasar's heading scale:

| Class or tag | Size | Use |
| --- | --- | --- |
| `h4`, `text-h4` | 1.4 rem | A landing's greeting line |
| `h5`, `text-h5` | 1.2 rem | A record title on a detail or 360 |
| `h6`, `text-h6` | 1.0 rem | A dialog title; a section title outside a box |
| `text-subtitle1 text-weight-medium` | 1 rem | A box title (the macro writes it) |
| `text-subtitle2` | .875 rem | A group caption inside a box; a panel group heading |
| body, `text-body2` | .875 rem | Fields, table cells |
| `text-caption` with the muted class (§8) | .75 rem | Meta data: who, when, ids under a title |
| `text-overline` | .75 rem spaced caps | A number card's label |

`text-weight-medium` marks the active or important; bold is for totals. Numbers in tables and
cards use the user's locale through `ec.l10n.format` and are right-aligned; `text-mono` for
identifiers that are scanned or compared (lot numbers, tracking numbers, GL account codes).

### 5.4 Spacing and density

Quasar's scale only: `xs` 4 px, `sm` 8 px, `md` 16 px, `lg` 24 px, `xl` 48 px, as `q-pa-*`,
`q-ma-*`, `q-gutter-*` and `q-col-gutter-*`. The framework's defaults are the page at `q-pa-sm`,
a field box at `q-pa-xs`, `q-col-gutter-sm` between field columns, box sections at 8 px, list
rows at 28 px, dense fields at 40 px. A screen adds spacing only between its own blocks
(`q-mb-md` between a title row and the tabs) and never changes a widget's internal padding.

### 5.5 Elevation and borders

Flat and bordered: cards, boxes, lists and the drawer are `flat bordered` with Quasar's
separator color (`rgba(0,0,0,.12)` light, `rgba(255,255,255,.28)` dark). Shadows appear only on
things that float: menus, dialogs, the live-call window, a dragged board card. A box's accent
is a 3 px left border in its semantic color, never a colored header.

The page is a shade darker than the surfaces on it, in both themes: in light the page is `#f4f5f7` and the
header, drawer, cards, boxes, dialogs and an outlined field on the page are white; in dark the page is Quasar's
`--q-dark-page` (`#121212`) and the surfaces `--q-dark` (`#1d1d1d`). A detail's header card (§3.3) is such a
surface.

### 5.6 Icons

BOSS uses **Material Symbols, outlined**, through Quasar's `material-symbols-outlined` icon set:
icon names are written `sym_o_<name>` (`sym_o_receipt_long`), weight 400, no fill. The
framework vendors the font and sets the icon set (§8.2, built Oct 18, 2026), and the `icon`
attributes of links, buttons, menus and dialogs and `menu-image-type="icon"` take these
names. Font Awesome 4 stays loaded for the baseline's
`fa fa-*` menu images and is not used in new screens. Rules: an icon-only button has a tooltip;
an icon beside a label is `size="sm"`; a status has a word, not only an icon; every app and
every quick-create kind has one icon, used in the launcher, the drawer, the palette and the
breadcrumbs:

| App or item | Icon |
| --- | --- |
| Sales | `sym_o_handshake` |
| Marketing | `sym_o_campaign` |
| Customer Service | `sym_o_support_agent` |
| Commerce | `sym_o_storefront` |
| Products | `sym_o_inventory_2` |
| Purchasing | `sym_o_shopping_cart` |
| Warehouse | `sym_o_warehouse` |
| Manufacturing | `sym_o_precision_manufacturing` |
| Maintenance | `sym_o_build` |
| Accounting | `sym_o_account_balance` |
| People | `sym_o_groups` |
| Projects | `sym_o_assignment` |
| Insights | `sym_o_insights` |
| Admin | `sym_o_admin_panel_settings` |
| Commons | `sym_o_hub` |
| Comms | `sym_o_forum` |
| Assist | `sym_o_assistant` |
| Today, Chat, Notifications, Inbox, Search, Quick create | `sym_o_today`, `sym_o_chat`, `sym_o_notifications`, `sym_o_mail`, `sym_o_search`, `sym_o_add` |
| Task, Event, Note, Contact, Request | `sym_o_task_alt`, `sym_o_event`, `sym_o_sticky_note_2`, `sym_o_person`, `sym_o_support` |

## 6. States, feedback and behavior

| Situation | Behavior |
| --- | --- |
| Empty list | The table header stays; one row reads "No <things> match" with a Clear filters text link when filters are set, or "No <things> yet" with the New action when none exist; a landing list says "Nothing assigned to you" |
| Loading | Loading bar in the header; a list keeps its last rows dimmed under `q-inner-loading`; a panel shows skeleton rows; a dialog shows skeleton fields |
| Error from a transition | A negative notification with the message; the form keeps its values; a field error marks the field |
| Permission limited | The same screen with actions and inline edits removed; a tab the role may not see is absent, not disabled; a record the user may not open shows a short "not available" screen with the way back |
| Record not found | The list screen with a notification, not a blank detail |
| Confirmations | Every status change that is hard to undo, every delete, every send to a customer or supplier; the text names the record |
| Success | The form's `submit-message`; a created record navigates to its detail; a dialog closes and its list reloads |
| Unsaved changes | Submit outline until changed; changed fields tinted; leaving a changed form asks |
| Keyboard | Ctrl+K or Cmd+K palette; Esc closes the top-most dialog, menu or panel; Enter submits the focused form; `focus-field` on the first input of a create dialog and of every task-screen step |
| Localization | All text through `ec.l10n`; dates, numbers and currency through the format helpers; no sentences built from fragments; icon-only buttons carry a localized tooltip |
| Accessibility | Labels bound to inputs (the wrappers do this); tooltips on icon buttons; focus visible; color never the only signal; tables with header cells |
| Printing | `html-print` render mode for documents; the shell hides the drawers and header in print |

## 7. Devices and breakpoints

Quasar's breakpoints (`variables.sass`): `xs` below 600 px, `sm` 600–1023, `md` 1024–1439,
`lg` 1440–1919, `xl` from 1920. The app drawer is beside the page from `md`; the Assist drawer
pushes the canvas from `lg` and overlays below; the tray panel is 400 px from `sm` and full
width at `xs`.

| Target | Widths | What must work |
| --- | --- | --- |
| Desktop | `md` and up, with the Assist drawer open | Every screen. Design at 1024 px with 420 px taken by Assist, so a detail's two-column layout collapses to one gracefully |
| Tablet | `sm` | List, Detail, 360 (tabs scroll), Split (stacked), Task, Panel, Landing |
| Phone | `xs` | Landing, Task, Panel (Today, Chat, Notifications), Split in stacked form, the Chatter column as a tab, the quick-create dialog, Calendar day view, Comms chat and inbox; a List on its `columns type="mobile"` set (§4.4), with horizontal scroll only for a series that is still wider than the phone |
| Handheld | `xs` with the handheld density (§8) | Warehouse and Manufacturing Task screens: 48 px controls, 18 px text, scan field focus, no drawer |
| Terminal | The `tui` render mode: one column below 120 canvas columns, two from 120 (mr-moqui `plans/archive/Screen-TUI-Impl.md` §1.3) | Every XML screen with no design work; a raw `qvt` text or a `.qvue` screen once it has its `tui` text (§4.8) |

A design marks a screen `phone` or `handheld` in its **Devices** line only when it is in one
of these rows; everything else is desktop and tablet. The terminal needs no mark: a screen works
there when it is plain XML, or once its custom parts have their `tui` texts.

## 8. Framework changes

What mr-moqui must gain for the designs to be written against it. Each item is a stub spec; the
design files' needs tables (design-doc-guide §8) refer to these by name and add to them. The
crosscut design's roll-up is the work list.

### 8.1 Adding an XML element: the checklist

1. The XSD: `framework/xsd/xml-screen-3.xsd` or `xml-form-3.xsd`, with documentation.
2. The qvt macro in `framework/template/screen/ScreenQvt.js` and its mirror in
   `ScreenQvtStatic.js`; a plain fallback in `ScreenHtml.js` for the html render mode; the `tui`
   macro in `ScreenTui.js`, a node of the TUI screen model, and its terminal widget in
   `crates/moqui-tui` when the element needs one (once the `tui` mode is built).
3. The `m-*` wrapper in `webroot/screen/webroot/js/WebrootVue.qvt.js` when the element needs a
   component; regenerate the precompiled `WebrootVue.qvt.render.js`
   (`UPDATE_GOLDEN=1 cargo test -p moqui-core --lib client_components_are_precompiled`).
4. Styles, if any, as `m-*` classes in `webroot/screen/webroot/css/WebrootVue.qvt.css`.
5. Goldens: `UPDATE_GOLDEN=1 cargo test -p moqui-core --lib screen::tests::qvt`, review the diff
   under `crates/moqui-core/src/script/testdata/screen/qvt/render/`; the node tests of the
   client; the Gate 3 browser smoke when behavior changed; the `tui` render goldens and terminal
   snapshots once that mode exists.
6. A row in `docs/ui/Qvt-Client.md`'s component table; a gallery screen (§10) that shows it.

A new custom screen (a `.qvue`, or a raw `qvt` text) is not an XML element, but it has a checklist
item too: its `tui` text (§4.8), or an entry in the design's needs table saying it is browser-only
for now.

### 8.2 The items

| Item | Kind | Proposed as | Stub spec | Used by |
| --- | --- | --- | --- | --- |
| Material Symbols | Icon set | Built Oct 18, 2026: the outlined font at weight 400 (npm `@material-symbols/font-400`, Apache-2.0) through `libs/refresh.mjs` with a manifest and license-review line; Quasar's `icon-set/material-symbols-outlined.umd.prod.js`, set as the icon set when the app is created; `menu-image-type="icon"` renders a Quasar icon name through `q-icon` (`m-menu-icon`, and the app list) and keeps `fa fa-*` as a class | §5.6 | Every screen, the shell |
| Shell: launcher, search button, quick create, Today, Chat, Mail and Messages counts, Notifications, Assist toggle | Shell item | Built Oct 19, 2026, except the Assist toggle (Phase 13), the presence dot and status (Comms chat): `m-qapps-root` changes of §2.2; badges fed by a `shellCounts` object the notification WebSocket updates | §2.2, §2.8 | All |
| Tray panel | Shell item | Built Oct 19, 2026 (`m-shell-tray`): A right panel in the canvas with tabs whose content screens are theme values (`STRT_TRAY_TODAY`, `STRT_TRAY_CHAT`, `STRT_TRAY_NOTIFICATIONS`) so BOSS supplies them; open state and tab kept in the root; Esc closes | §2.4 | Commons, Comms, every app through providers |
| Shell providers | XML Screen element | Built Oct 19, 2026, with `<palette-source>` and `<account-menu-item>` (design-drawers-commons §19): `<shell-providers>` in an app root screen with `<quick-create label icon screen parameter-map>`, `<today-source service>`, `<palette-action label screen>`, `<palette-type doc-type>`, `<notification-topic>`; the menu data aggregates them for the apps the user may open | §2.7 | Every app |
| Screen context | XML Screen element | Built Oct 19, 2026 (`m-screen-context`): `<context record-entity="…" record-id="${id}" title="${…}" selection-form="…"/>`; the root exposes `screenContext` {path, parameters, record, selection, filters, forms}; quick create, Chatter, Today and Assist read it | §2.5 | Every detail, 360, list |
| Assist drawer | Shell item | Right `q-drawer`, resizable; the port of the Java Assist panel (`js/assist`) into it, with `screen_use` over the canvas; the context above is its input | §2.5 | All |
| Palette | Shell item | Built Oct 19, 2026 (`m-shell-palette`, the `shellSearch` transition): `q-dialog` with grouped results from the search index, saved finds, provider actions, screen titles and recent screens; Ctrl+K | §2.4 | All |
| Presence and status | Shell item + data | Built Oct 19, 2026 (`moqui.chat` presence, `m-avatar` user-id dot, the account menu's status with presets; `moqui.security.UserStatus` and the `userStatus` topic): A user status (online, away, do not disturb, custom text) in the account menu and on avatars; a `UserStatus` record and a WebSocket topic | §2.2 | Comms chat, Commons contacts |
| `number-card` | XML Screen element | Built Oct 19, 2026 (with `<dashboard>`): `<number-card title value delta delta-good="up|down" icon link size>` as a `q-card flat bordered` with `text-overline` label and `text-h5` value; a `<dashboard>` container that lays cards and widgets in a responsive grid and later allows user arrangement | §3.1, §3.4, §3.12 | Landings, 360s, Insights |
| `status-bar` | XML Screen element | Built Oct 19, 2026 (`m-status-bar`; colors from `StatusItem.statusColor`, else the word map of `org.moqui.impl.StatusServices.get#StatusColors`): `<status-bar status-id="${statusId}" status-type-id="…" transition="…"/>`: the status flow as a row of stage chips, current filled, next as the primary action calling the transition; colors from the status color map | §3.3, §5.2 | Every detail |
| `m-tonal` status chip | Style | Built Oct 18, 2026: `class="m-tonal text-positive"` on a `q-chip` or `q-badge`. Still to do: a `display` field with `status="true"` that renders the chip from the status color map | §5.2 | Lists, details |
| Muted text class | Style | Built Oct 18, 2026: `.m-muted` is `grey-7` in light and `grey-5` in dark | §5.3 | Captions everywhere |
| `chatter` | XML Screen element + data | Built Oct 19, 2026 (the element names the theme's `STRT_CHATTER_SCREEN`; BOSS supplies `Shared/Chatter.qvue`): `<chatter record-entity record-id/>`: messages and notes, scheduled activities, attachments, followers, as a column or tab; needs a generic record link for `CommunicationEvent`, `WorkEffort` and content (crosscut §8, "Generic record links") or a join entity per record type | §3.3 | Every record screen |
| List views | XML Form element | Built Oct 19, 2026 (`m-list-views`; `view-board` and `view-calendar` with drag through a transition; html shows the list): `form-list` `views="list,board,calendar"` with `<view-board group-field card-title-field card-fields badge-field transition>` and `<view-calendar start-field end-field title-field color-field transition>`; `view-board` `group-fields` and `all-rows` (built Oct 21, 2026); `<view-tree parent-field children-transition ancestor-transition rollup-fields child-count-field transition key-fields>` (built Oct 21, 2026, `m-list-tree`: one level fetched per open, the find's unmatched ancestors muted, drag and Tab to reorder or re-parent, the treegrid keys, a nested table in html and an outline in tui; outline levels in XLSX left, impl-projects §7) and `form-list` `peek-url` (§3.8); later `view-pivot`, `view-graph`, `view-timeline`; the view is a client switch over the same rows and filters | §3.2, §3.6, §3.7, §3.15 | Pipeline, work items, cases, schedules |
| `container-split` | XML Screen element | Built Oct 19, 2026: `<container-split side-width="320" min-main="480">` with `<split-side>` and `<split-main>`; `q-splitter` from `md`, stacked with a back button below; the selected id in the URL | §3.8 | Inbox, contacts, files, chat, knowledge |
| Wizard and stack panels | XML Screen element | Built Oct 19, 2026: `subscreens-panel type="wizard"` as a `q-stepper` with one subscreen per step, validation before Next; `type="stack"` as a breadcrumb stack | §3.10 | Order entry, imports, setup |
| Handheld density | Screen attribute | `density="handheld"` on an app root or screen: 48 px controls, 18 px text, no drawer, header reduced to title and account | §3.5, §7 | Warehouse, Manufacturing |
| Record files | XML Screen element | Built Oct 19, 2026 (the element names `STRT_RECORD_FILES_SCREEN`; BOSS's `Shared/RecordFiles.qvue` over FileServices and the Records drive): `<record-files record-entity record-id/>`: the Files component scoped to a record (upload, list, preview, share) | §3.3, §3.4 | Every record screen; Commons Files |
| Co-editing editor | Vue component + tool | `m-coedit` (Tiptap over Yjs) with a `yrs` sync server in mr-moqui over the notification WebSocket; a document type holding CRDT state and a rendered snapshot (initial-design) | §3.13 | Commons wiki, notes, knowledge |
| Board, calendar and chat as `.qvue` screens | Render mode | Already supported (`qvue`); the designs name the screens that use it until the XML views exist | §3.6, §3.7, Comms | As named |
| Print documents | Render mode | `html-print` exists; BOSS needs templates per document and a `print` action on details; QZ Tray for label printers is present | §3.12, design-doc-guide §3 | Quotes, invoices, pick lists, labels |
| Protocol clients and servers | Tool | Partly built Oct 19, 2026 (IMAP and POP sync, SMTP send through the account, Google and Microsoft sign-in with XOAUTH2; the SMTP listener behind the gateway and the DAV servers are later): SMTP send, SMTP listener behind a gateway, IMAP and POP pollers, CalDAV and CardDAV servers, WebDAV, virtual SFTP, WOPI host, WebRTC, Matrix-style chat persistence (initial-design "Protocol layer"); each named by the Comms or Commons design that first needs it | Comms, Commons | As named |

## 9. References

**mr-moqui** (paths under `mr-moqui-base/`):

| What | File |
| --- | --- |
| The qvt client and the `m-*` components, button hierarchy, shell description | mr-moqui `docs/ui/Qvt-Client.md` |
| The components and the shell root | `runtime/base-component/webroot/screen/webroot/js/WebrootVue.qvt.js` |
| The style sheet over Quasar | `runtime/base-component/webroot/screen/webroot/css/WebrootVue.qvt.css` |
| The macros that write qvt from screen XML, and the static mirror | `runtime/base-component/framework/template/screen/ScreenQvt.js`, `ScreenQvtStatic.js` |
| The page shell and its settings | `runtime/base-component/webroot/screen/webroot/qapps.xml`, `includes/WebrootVue.qvt.html.fancy` |
| Theme resources: style sheets, logo, footer, `STRT_QUASAR_CONFIG`, header plugin slots | `runtime/base-component/webroot/data/WebrootQuasarThemeData.xml` |
| Vendored libraries, versions and how to upgrade | `runtime/base-component/webroot/screen/webroot/README.md`, `libs/refresh.mjs`, `libs/MANIFEST.json` |
| The screen and form XML vocabulary | `runtime/base-component/framework/xsd/xml-screen-3.xsd`, `xml-form-3.xsd` |
| The style decisions this guide continues | `plans/archive/QvtStylePlan.txt` |
| Render goldens and the browser smoke | `crates/moqui-core/src/script/testdata/screen/qvt/render/`, `crates/moqui-host/tests/gate3_browser.rs` |
| Status flows (for §5.2) | `runtime/base-component/tools/screen/Tools/StatusFlows.xml` |
| The terminal render mode: design, widget map, keys, the `tui` text and components (planned) | `plans/archive/Screen-TUI-Impl.md`; later `framework/template/screen/ScreenTui.js`, `crates/moqui-tui`, `docs/ui/TUI.md` |

**Quasar 2.35.1** (paths under `~/work/moquiwork/3p_other/quasar/`):

| Topic | Source | Docs |
| --- | --- | --- |
| Brand colors, the full palette, type scale, spacing, breakpoints | `ui/src/css/variables.sass` | `docs/src/pages/style/color-palette/color-palette.md`, `style/theme-builder/theme-builder.md`, `style/sass-scss-variables/sass-scss-variables.md` |
| Color CSS variables and `text-*` / `bg-*` classes | `ui/src/css/core/colors.sass` | as above |
| Dark mode | `ui/src/css/core/dark.sass`, `ui/src/plugins/dark/` | `docs/src/pages/style/dark-mode.md`, `quasar-plugins/dark.md` |
| Typography | `ui/src/css/core/typography.sass` | `docs/src/pages/style/typography/typography.md` |
| Spacing and flex grid | `ui/src/css/core/flex.sass`, `ui/src/css/flex-addon.sass` | `docs/src/pages/style/spacing.md`, `style/breakpoints.md`, `layout/grid/introduction-to-flexbox.md`, `row.md`, `column.md`, `gutter.md`, `flexbox-patterns.md` |
| Elevation, helpers, visibility, positioning | `ui/src/css/core/elevation.sass`, `helpers.sass`, `visibility.sass`, `positioning.sass`, `size.sass` | `docs/src/pages/style/shadows.md`, `other-helper-classes.md`, `visibility.md`, `positioning.md`, `body-classes.md` |
| Layout: header, drawers, page, footer, sticky | `ui/src/components/layout/QLayout.js`, `header/`, `drawer/`, `page/`, `footer/`, `page-sticky/` | `docs/src/pages/layout/layout/layout.md`, `drawer.md`, `header-and-footer.md`, `page.md`, `page-sticky.md` |
| Any component: props, slots, events | `ui/src/components/<name>/Q<Name>.js` and the API in `Q<Name>.json` beside it (`table/QTable.json`, `select/QSelect.json`, …) | `docs/src/pages/vue-components/<name>.md`; worked examples in `docs/src/examples/Q<Name>/*.vue` |
| Plugins: Notify, Dialog, LoadingBar, Loading, Screen | `ui/src/plugins/notify/`, `dialog/`, `loading-bar/`, `loading/`, `screen/` | `docs/src/pages/quasar-plugins/notify.md`, `dialog.md`, `loading-bar.md`, `loading.md`; `options/screen-plugin.md`, `options/the-q-object.md` |
| Icon sets, Material Symbols | `ui/icon-set/material-symbols-outlined.js`, `ui/src/components/icon/QIcon.js` | `docs/src/pages/options/quasar-icon-sets.md`, `options/installing-icon-libraries.md` |
| Brand configuration API | `ui/src/Brand.json` | `docs/src/pages/style/color-palette/color-palette.md` |

## 10. The archetype gallery

The archetypes of §3 and the widgets of §4 are rendered as real screens in the framework's
example component, `runtime/dev-component/example/`, so a design decision is checked against
the actual render mode in light and dark, at the breakpoints of §7, and so a new XML element
has a screen that shows it. It is a dev component (since Oct 29, 2026): `./moq run` loads it,
and the gallery is at `/qapps/gallery`.

Built Oct 18, 2026:

| Screen | Shows |
| --- | --- |
| `example/screen/Gallery.xml` | The gallery root, mounted under the apps root by the example `MoquiConf.xml`; ADMIN authorization in `example/data/ExampleSecurityData.xml` |
| `Gallery/Landing.xml`, `List.xml`, `Detail.xml`, `Record360.xml`, `Task.xml`, `Split.xml`, `Settings.xml`, `Wizard.xml`, `Dialog.xml`, `Report.xml`, `Panel.xml` | One archetype each over framework data (`moqui.basic.Enumeration`, `Geo`, `StatusItem`, `moqui.security.UserAccount`, `moqui.server.ArtifactHitBin`) or inline lists built in the screen actions; every widget of §4 appears at least once |
| `Gallery/Board.xml` + `Board.qvue`, `Gallery/Calendar.xml` + `Calendar.qvue` | The `.qvue` path of §4.8 for the custom archetypes: a drag-and-drop board and a month grid over the screen's own transitions |
| `Gallery/Tree.xml` (`view-tree` is shown in `Gallery/Views.xml` since Oct 21, 2026; a screen of its own is left) | §3.15 over an inline three- to seven-level breakdown built in the screen actions, with own and total hours, a muted ancestor from a find, a branch of more than 200 rows, drag and keyboard re-parenting through a transition that refuses a drop into a row's own branch, and the CSV, XLSX and print outputs. The Views screenshot in `example/test/client/GalleryShots.spec.js` shows the tree; List and Detail are also shot in the dark and at phone width. |
| `Gallery/Widgets.xml` | Every field widget, button role, label type, list feature, container type, tree, editable and image side by side, as the fixture for style changes |
| `example/test/Gallery.spec.js` | Renders every gallery screen in its render mode through the screen test API (`./moq test example`) |
| `example/test/client/GalleryShots.spec.js` | Screenshots of the gallery screens in the `/qapps` shell (`moqui test-client example --serve --spec GalleryShots`): light at 1280, List and Detail in the dark and at phone width, and the Assist drawer on List when Assist is available |

Each gallery screen starts with an info box naming the §3 section it renders and the §8 items it
stands in for with a fallback. Dialogs open for a screenshot with `?_openDialog=<dialog id>`.
