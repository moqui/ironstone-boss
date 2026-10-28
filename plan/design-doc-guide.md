# IronStone BOSS — Design document guide

Oct 18, 2026

What a BOSS design file contains, how deep it goes, and how the set of design files fits
together. The research files (`research-*.md`, framed by [research-crosscut.md](research-crosscut.md))
record findings and options; the design files decide. [initial-design.md](initial-design.md)'s
**Decided** table is fixed input. The look of the screens, the shell every screen runs in, the
widget vocabulary and the Quasar references are in the companion [style-guide.md](style-guide.md);
this file is about what to write, that one is about what it should look like.

Sections: [1 file set](#1-the-design-file-set) · [2 depth](#2-level-of-detail) ·
[3 skeleton](#3-design-file-skeleton) · [4 screen table](#4-the-screen-table) ·
[5 screen section](#5-the-screen-section) · [6 form summary](#6-the-form-summary) ·
[7 reused screens](#7-reused-screens) · [8 framework and data needs](#8-framework-and-data-needs) ·
[9 traceability](#9-traceability-and-the-inventories) · [10 names](#10-names-paths-and-terms) ·
[11 process](#11-process-and-review)

---

## 1. The design file set

One file per app, one for the suite shell with Commons and Comms, and one crosscut file that
holds what the others share. The crosscut file is written first, because the app files
reference its reused screens rather than designing them; the shell, Commons and Comms file is
written beside it, because Chatter, record files and the tray panel are its screens.

| File | Covers | Main inputs |
| --- | --- | --- |
| `design-crosscut.md` | The reused screens of research-crosscut §3 (Contact / party record, Customer 360, Supplier 360, Employee 360, Product 360, Order detail, Inventory availability, Shipment detail, Material issue / receipt, Facility & equipment record, Request / case, Task / work item, Calendar & schedules, Chatter & activities, Approvals waiting, Dashboard widgets, Invoice detail), except the three that `design-drawers-commons.md` designs and this file only references (Calendar & schedules in its §7, Chatter & activities in §15, Approvals waiting in §4) and the two that `design-projects.md` designs and this file only references (Task / work item in its §5, Request / case in §6); cross-app decisions answering research-crosscut §8; the roll-up of every file's framework and data needs | research-crosscut §3–§5, §8; the shell design in style-guide §2 |
| `design-sales.md`, `design-marketing.md`, `design-customer-service.md`, `design-commerce.md`, `design-products.md`, `design-purchasing.md`, `design-warehouse.md`, `design-manufacturing.md`, `design-maintenance.md`, `design-accounting.md`, `design-people.md`, `design-projects.md`, `design-insights.md`, `design-admin.md` | One IronStone app each: its shell, menu, landing page, own screens, and the context it passes to each reused screen | The matching `research-<app>.md`, its candidate screen inventory and open questions; [ss-inventory.md](ss-inventory.md) and [usl-inventory.md](usl-inventory.md) |
| `design-drawers-commons.md` | The suite shell (the header, the Assist drawer, the tray panel, the palette, quick create, screen context, key map, presence), the Commons and Comms apps, and the screens they lend to every other app (Chatter and activities, record files, Calendar & schedules, Events, Knowledge base articles, the approvals center, email and chat from a record, consent) | research-drawers-commons §1–§18; style-guide §2 and §8; the Java Assist panel and its tools |

The shell's look is style-guide §2; its behavior, providers and content screens are decided
once in `design-drawers-commons.md` §1 and are not repeated in any other design file. There the
Assist drawer is a framework shell item and the tray panel (style-guide §2.4) is a framework
frame whose tabs are Commons and Comms screens. An app file that needs
something from the shell (a quick-create item, a Today source, a palette provider, a
notification topic, a key-map scope) lists it in its screen table and its framework needs, and
the crosscut file collects them.

The Oct 27 core-app pass also registers domain-owned reusable screens in `design-crosscut.md`:
Products §§7–8 own the full PriceLists, PriceListDetail, PriceExplain and SupplierPrices definitions;
Manufacturing owns the BOM/routing editors mounted in Product360, and Accounting owns the
ProductionCostClose task mounted in Manufacturing and InventoryValuation report mounted in
Warehouse. Crosscut defines their common
contracts and links to those definitions; consuming apps provide context instead of duplicating
forms. This follows the same single-definition rule as the existing Projects and Commons owners.

### Public companion designs

[IronStoa PASS — Forum design](../../mr-pass/plan/design-forum.md) follows the screen/form, verified-source and
needs conventions in this guide, with a public-site shell and site/list roles instead of a BOSS
launcher group. It lives in the `mr-pass/plan/` directory, alongside the public suite's future app designs.
Its shared foundation supports future PASS Commerce and Blog/Publishing designs; it does not
replace the staff-facing BOSS Commerce or Marketing designs. PASS screen paths in the inventories
are prefixed `PASS:` to distinguish the component. Proposed services stay in the design until
they exist; future publishing baselines are not marked implemented or fully designed in advance.

## 2. Level of detail

- **Screens and forms are the unit.** Every screen of every app is in its file's screen table.
  Every form on a screen is in the screen's form summary. Nothing finer is required.
- **Forms are summaries.** A form summary names the form, its kind, its purpose, the fields that
  matter, any widget that is not the default, the services it calls, and what it derives from
  (§6). Complete field lists are decided during implementation from the baseline form, the
  service's parameters and the reference pattern. A form gets a full field list in the design
  only when it has no baseline form and no reference to derive from.
- **Designs decide.** Write "Sales includes the Order detail with the quote action set", not
  "one option is". Options that are still open go to the **Open** list at the end of the file,
  each with the choice the author would make and why.
- **Verified names.** Mantle entity, service and status names are verified against
  `mr-mantle` as the research files did. Reference apps are named as in
  research-crosscut §6.
- **Existing automation.** A Mantle service ECA (SECA) or entity ECA that already runs on a
  designed path is named where the path is designed, with whether the design keeps it, runs it
  only under a condition, or replaces it. The register is crosscut §1.3. A design that ignores
  one changes nothing: the rule still runs.

## 3. Design file skeleton

Front matter, in this order: title `# IronStone BOSS — <App> design`; a dated status line
(`Oct 20, 2026 — draft` / `— reviewed`); one paragraph naming the audience from
initial-design's app table and the sections the app has; **Inputs** (the research file, the
crosscut design, the inventories); a **Sections** nav line.

Body, numbered `## N.` sections:

| Section | Contents |
| --- | --- |
| `## 1. Shell` | Root screen path and its authz group; app icon (style-guide §5); the menu tree to depth 2 as a nested list, each entry naming its screen; the landing page's content as a short list (counters, my-work lists, shortcuts, charts) |
| `## 2. Screens` | The screen table of §4, one row per screen, grouped by area in the order of the app's menu |
| `## 3. <Area>` … | One section per menu area, holding a screen section (§5) for every screen in that area that this file designs; a reused screen gets only a **Context passed** block (§7) |
| `## N-3. Documents and outputs` | Print documents (`html-print` render mode), emails sent, exports and imports, as a table `Output \| Kind \| From screen \| Derived from` |
| `## N-2. Framework and data needs` | §8: what the Rust framework and Mantle must gain for this app |
| `## N-1. Decided` | Table `Decision \| Notes`, including each research open question this file answers |
| `## N. Open` | Questions this file leaves for review, each with a recommended answer |

## 4. The screen table

One row per screen. Columns:

| Column | Contents |
| --- | --- |
| **Screen** | The screen's name, unique within the design file and used for its section heading; the file name is the last segment of **Path** (§10), and the two differ only when the path segment alone would repeat (`TodayPanel` at `Commons/Panel/Today`) |
| **Path** | Its path under the app, `Sales/Orders/OrderDetail`; a reused screen gives the app path it is mounted at |
| **Archetype** | One of the archetypes of style-guide §3: landing, list, detail, 360, task, board, calendar, split, settings, wizard, dialog, report, editor, panel, tree list |
| **Impl** | `xml` (screen and form XML widgets) or `qvue` (a Vue component file served as a screen, style-guide §4.8). Decided per screen, because it fixes the widget set the screen may use; `qvue` only when the interaction does not fit the XML widgets (a mail client, a chat room, a calendar grid, a files browser, a co-editing editor, a board until `view-board` exists) |
| **Purpose** | One sentence |
| **Main record** | The Mantle entity the screen is about, or the service for a report |
| **Reused** | `own`, or the reused screen's name with the crosscut section (`Order detail, crosscut §3.6`) |
| **Roles** | The user groups or roles that see it, when narrower than the app's group; `app` otherwise |
| **Scope** | `parity` (replaces something MarbleERP or SimpleScreens has), `new` (in the first BOSS release without a baseline), or `later` (designed, built after the first release) |
| **Context** | What the screen exposes to the shell: the record (`OrderHeader orderId`), the selection (`OrderItem rows`), the filters (`list find parameters`), or `none`. Assist, Chatter, quick create and the tray panel read this (style-guide §2.5; design-drawers-commons §1.6) |

A dialog that only edits one form is a form on its parent screen, not a row. A dialog that
holds its own subscreens or several forms is a row with archetype `dialog`.

## 5. The screen section

`### <Screen name>` under its area, with these lines or short tables, in this order; omit a
line that has nothing to say beyond the archetype's default.

| Line | Contents |
| --- | --- |
| **Layout** | The archetype and only the deviations from it: "detail; Chatter as a tab, not a column, because the item list needs the width"; for a `qvue` screen, the regions the component draws and the `m-*` components it still uses |
| **Sections and tabs** | The boxes, tabs or panes, each with the forms or lists it holds, as a nested list |
| **Forms** | The form summary table of §6 |
| **Actions** | Primary actions (one or two), secondary, row actions, bulk actions; each with its transition or service, whether it confirms, and the status or role it needs |
| **Navigation** | Where users arrive from and where the screen links to; for a link into another app's version of a screen, say which app's version and why |
| **Views** | For a list: the view modes it offers (list, board, calendar, pivot, graph) and the field that groups the board or places the calendar entry |
| **States** | Empty, loading, error and permission-limited behavior when it differs from the archetype's default; what a read-only role sees |
| **Devices** | Only when the screen is phone-capable or handheld (style-guide §7) |
| **Source** | The research section, the reference pattern (`Odoo chatter`, `Frappe Helpdesk ticket agent view`), and the baseline screens it replaces (SimpleScreens paths as in ss-inventory) |
| **Needs** | The framework and data needs this screen depends on, each a name that appears in the file's §N-2 table |

## 6. The form summary

One table per screen, one row per form:

| Form | Kind | Purpose | Highlighted fields | Widgets of note | Services | Derived from |
| --- | --- | --- | --- | --- | --- | --- |
| `OrderItems` | list, editable rows | The lines of the order | product, quantity, unit price, status; totals row | product lookup with server search and availability beside it; inline quantity edit | `mantle.order.OrderServices.update#OrderItem`, `delete#OrderItem` | SimpleScreens `Order/OrderDetail` `OrderItems`; Odoo sale order lines |

- **Kind:** `single`, `list`, `list, editable rows`, `dialog` (a form-single in a container-dialog), `find` (the header find of a list), `wizard step`, `component` (a region of a `.qvue` screen that is not a form: a tree, an editor, a timeline, an embedded `chatter` or `record-files`), `list, bulk` (the bulk-action bar over a list's selection), `list, first row` (a quick-add row at the top of a list), `display` (a read-only single); the qualifier `, read` marks a read-only form of any kind.
- **Highlighted fields:** the identifiers, statuses, amounts and lookups that define the form, usually eight or fewer. Not the full list.
- **Widgets of note:** only a widget that is not the default for its field type (style-guide §4): a lookup with server search, a date-period, an editable cell, a file upload, a markdown editor, a status bar.
- **Services:** the `verb#Noun` services from usl-inventory the form submits to or loads from; `entity` when it is a plain entity create or update. A `find` form names none, since it narrows the list form it sits above. Name a service in full (`mantle.party.PartyServices.search#Party`) the first time it appears in a file; usl-inventory is filled from these names.
- **Derived from:** the baseline form as `<Screen XML> <Form>` from ss-inventory, and or a reference pattern named as in research-crosscut §6; `new` when neither applies, in which case the row is followed by the full field list.

## 7. Reused screens

A reused screen is designed once, in `design-crosscut.md`, the domain-owner file registered
there (§1), or, for the screens Commons and Comms lend, `design-drawers-commons.md`, with a full screen section (§5), followed by a
**Per-app context** table:

| App | Tabs or panes shown | Filters fixed | Action set | Emphasis |
| --- | --- | --- | --- | --- |
| Sales | Overview, Items, Shipments, Invoices, Chatter | sales orders only | place, approve, hold, cancel, clone, send quote | pricing and promise dates |
| Warehouse | Overview, Items, Shipments | orders with open shipments | pick, pack, ship | locations and quantities |

An app file includes a reused screen as one row of its screen table and a **Context passed**
block under its area, with the app's row of that table and the mount path. It does not
redesign the screen. When an app needs something the base design lacks, the app file puts the
need in its **Open** list and the crosscut file gains it when accepted, so the screen stays
one screen. The mechanism, per initial-design, is one screen with context parameters (app,
role, allowed actions); crosscut §8's granularity question is answered in `design-crosscut.md`
per screen, with Order detail and Customer 360 first.

## 8. Framework and data needs

The Rust framework is the platform, and these apps will need things it does not have yet. When
a design calls for a widget, a screen element, a shell item, a tool, a protocol client or
server, a service type, an integration, or a data-model change that is not in mr-moqui or
Mantle today, the design says so explicitly rather than assuming it. Each design file has a
`## N-2. Framework and data needs` table:

| Need | Kind | Proposed as | Used by | Stub spec |
| --- | --- | --- | --- | --- |
| Board view on a list | XML Form element | `form-list` `views` attribute with `view-board` child (style-guide §8) | Pipeline, Work items, Cases | group by a status or enum field; a card per row with named fields; drag between columns calls a transition |
| IMAP account poller | Protocol client | mr-moqui tool, per initial-design "Protocol layer" | Comms Inbox, account setup | per-account poll into `CommunicationEvent` with the mailbox folder as a field |
| Request to work effort link exposed for Chatter | Data model | `mantle.request.RequestWorkEffort` already exists; generic record link is new | Chatter on every record | a `RecordLink` entity or one join entity per record type (crosscut §8) |

Rules:

- **Kinds:** `XML Screen element`, `XML Form element`, `Vue component`, `shell item`, `tool`,
  `protocol client`, `protocol server`, `service type`, `render mode`, `data model`, `seed data`.
- **Widgets that several screens would use become XML elements.** Propose the element or
  attribute name, and expect the implementation to touch the XSD, the qvt macros and their
  static mirror, the `m-*` wrapper, the goldens and the README, as style-guide §8 lists. The
  html render mode gets at least a plain fallback.
- **A highly custom screen becomes a `.qvue` screen.** When a screen does not fit the XML widgets
  (a board with drag and drop, a chat room, a calendar grid, a co-editing editor), design it as a
  Vue component file served as a screen, using Quasar components and the Moqui `m-*` components
  directly, within the style guide's rules. Say so in the screen's **Impl** column and describe
  its regions in the **Layout** line.
- **Lower-level needs are called for, not assumed.** Mail, calendar, contacts, files, chat, calls,
  office and sync protocols belong to mr-moqui (initial-design "Protocol layer"); a Comms or
  Commons screen that depends on one names the client or server it needs and what the screen
  reads and writes through it. The same goes for tools (PDF generation, barcode printing,
  payment or shipping gateways, search indexes) and service types.
- **Data needs** name the Mantle entity or field to add or enable (several are commented out in
  `mr-mantle` as future reference) and the seed data (enumerations, status flows) a screen
  expects.
- **The crosscut file rolls them up.** `design-crosscut.md` ends with one table of every need
  from every file, de-duplicated, with the files that need it. That table is the framework and
  data work list for BOSS, and its items are what mr-moqui's `plans/Remaining-Work.md` links to.

## 9. Traceability and the inventories

Every screen section carries a **Source** line (§5) and every form row a **Derived from** cell
(§6), so a reader can go from a design to the research section, the reference pattern and the
baseline it replaces.

The two inventory files track coverage in both directions:

- [ss-inventory.md](ss-inventory.md) lists every mr-marble form. Its **Designed in** column
  is filled when a design file is reviewed: the BOSS screen path, several separated by `;`, or
  `—` with the reason in that design's **Decided** table when the form is deliberately not carried
  forward. Its **Implemented in** column is filled during implementation with the screen and form
  that exist.
- [usl-inventory.md](usl-inventory.md) lists every mr-mantle service. Its **Designed in** column
  names the BOSS screens whose form summaries call the service; **Implemented in** is filled during
  implementation. A service no screen calls stays blank, which is also useful to know.

Conventions for both columns: a form that a note or comment form becomes is `Shared/Chatter`, and
a content form `Shared/RecordFiles`, with the host screen beside it when the design lists the
form under the host; a baseline form whose function moves to a shell item (the palette) is `—`
with the reason in **Decided**; a baseline form a design hands to another app's file (My Account
expenses to People) stays blank for that file to fill, and the handing file names it in
**Decided**. A reviewer fills each cell with all the screens of the design under review, adding to
what an earlier file wrote, never replacing it.

A design file is not reviewed until its forms' services are in usl-inventory's Designed column
and the baseline forms it replaces are in ss-inventory's.

## 10. Names, paths and terms

- **App directories:** `screen/<App>/…` with the app name in one word as initial-design spells it
  (`Sales`, `CustomerService`, `Commerce`, …), each with its root `screen/<App>.xml` mounted under
  the apps root by `MoquiConf.xml`. The current `boss.xml` root and `Base/` screens are the port of
  the old My Account and are replaced by Commons and Comms.
- **Shared screens:** `screen/Shared/<Screen>.xml` for a reused screen, included by each app
  through a `subscreens-item` with a `location`, so each app's path to it is its own and the
  file is one. The app's context is set in the including app's `always-actions` or in the
  `subscreens-item` parameters.
- **Screen names:** a list is the plural noun (`Orders`, `Cases`, `WorkItems`); a record screen is
  the noun plus `Detail` (`OrderDetail`, `CaseDetail`); a 360 is the noun plus `360`
  (`Customer360`); settings live under `<App>/Settings/`; reports under `<App>/Reports/`. `Find`
  and `Edit` prefixes from SimpleScreens are not used for list and detail screens. The screen
  path is the URL, so names are full words, stable and never abbreviated. That includes
  industry acronyms: `BillsOfMaterials`, `QuoteRequests`, `ServiceLevelPolicies`,
  `SatisfactionResults`. Menu titles, labels and Mantle names keep the acronym where users say
  it ("BOMs", "RFQs", "SLA policies").
- **Menu titles** use the BOSS terms of research-crosscut §6 (Case, Work item, Activity, Today
  panel, Landing page, Maintenance work order, Production run).
- **Design file names** are `design-<app>.md` in kebab case without dates; dates go in the status
  line, as in mr-moqui's plans README.

## 11. Process and review

**Order.** `design-drawers-commons.md` and `design-crosscut.md` first, the one for the shell,
Chatter, record files and the tray panel, the other for the reused business screens and the
shell providers; then the apps whose screens are mostly reused ones (Customer Service, Sales,
Purchasing, Warehouse, Accounting), then the rest; Insights and Admin last, since they index the
others. The crosscut roll-up of needs is updated as each file lands.

**Review checklist for a design file:**

1. Every screen in the research file's candidate screen inventory is a row in the screen table,
   or is named in **Decided** as dropped or merged, with the reason.
2. Every reused screen is referenced, not redesigned, and has a **Context passed** block.
3. Every row has an archetype from style-guide §3, an **Impl** value and a **Scope** value.
4. Every form summary has services and a **Derived from**; every `new` form has its field list.
5. Every **Needs** line points at a row of the file's framework and data needs table, and that
   table is merged into the crosscut roll-up.
6. The inventories' **Designed in** columns are filled for this file's forms and services.
7. Every open question of the research file is answered in **Decided** or carried into **Open**
   with a recommendation.
8. The screens' **Context** cells are filled, so the shell work in style-guide §8 has its inputs.
9. Every Mantle SECA or entity ECA on a designed path is named, kept, conditioned or replaced,
   and listed in the crosscut §1.3 register (§2).

**Done.** The design pass is complete when the 16 files exist and pass this checklist, the
crosscut roll-up is reviewed as the framework and data work list, and the archetype gallery
(style-guide §10) renders every archetype the screen tables use.
