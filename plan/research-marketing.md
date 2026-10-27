# IronStone BOSS — Marketing app research

Oct 18, 2026

Reviewed against sources Oct 18, 2026; follows [research-crosscut.md](research-crosscut.md).

**Design follow-up (Oct 27, 2026).** Future **IronStoa PASS Blog/Publishing** (`mr-pass`) owns
standalone public and editorial publishing screens; Marketing retains campaign/content contexts
and Commons general wiki authoring. All use the same WikiBlog metadata, WikiPage revisions,
review and publication services. [Forum §13.3](../../mr-pass/plan/design-forum.md#133-future-blogpublishing) defines
publication grouping, approved-version scheduling, preview isolation, forum-backed discussion,
product links and subscription boundaries. It supersedes any exclusive Marketing ownership
implied below; the complete Publishing screen/form design remains future. Odoo `website_blog`,
`website_forum` and `website_sale` are shared-site integration references.

Deeper research pass on the **IronStone Marketing** app (campaigns; segments and lists;
email and newsletters; promotions and coupons; content — blogs and landing pages;
surveys; campaign analytics), cataloguing every relevant screen/page found in the
reference apps. Companion to [3p-app-reference.md](3p-app-reference.md); feeds the
Marketing row in [initial-design.md](initial-design.md). Reused screens it includes
(crosscut §3–§4): **Customer 360**, where Marketing's version emphasizes engagement; the
email/SMS sending, template, consent and unsubscribe screens of the Comms suite, here for
campaign sends and audiences; events, with registration and tickets; leads and
opportunities, with lead sources and attribution; the promotion, coupon and loyalty
program screens (also included in Commerce and Sales); and the surveys and forms builder
(also included in Customer Service for CSAT and People for scorecards and quizzes).

**Organization.** Sorted by functional area (not by app): all campaign-planning screens
together, all audience screens together, all email composition/tracking screens
together, etc. Within each area, sub-tables per reference app.

**Scope.** Business UI only: marketing homes and calendars, campaign containers and
automation, audience lists/segments and consent, email/newsletter/SMS composition,
sending, delivery and tracking, promotions/coupons/loyalty, CMS pages, blogs, landing
pages and web forms, marketing events, surveys, campaign analytics and attribution, and
marketing configuration. Sales pipeline screens are covered by
[research-sales.md](research-sales.md); storefront merchandising by
[research-commerce.md](research-commerce.md); the mail client, calendar, contacts and
file surfaces by [research-drawers-commons.md](research-drawers-commons.md). This pass
keeps only the marketing management side of those shared records.

**Path conventions.** Every backticked path resolves against the checkout for its
prefix below (research-crosscut.md §1). All checkouts are under
`/home/jonesde/work/moquiwork/`. Sub-tables headed **Frappe** mix ERPNext (`erpnext/…`),
Frappe framework (`frappe/…`) and Frappe apps (`crm/…`, `insights/…`, `lms/…`) paths;
each resolves by its row. A bare tail in a cell is relative to the directory named
earlier in the same cell.

| Prefix | Checkout | Paths start with |
| --- | --- | --- |
| **Odoo** | `3p_other/odoo` (bundle) | `odoo/addons/<addon>/…` (views in `views/`, JS/OWL in `static/src/`); user documentation `documentation/content/applications/…` |
| **ERPNext** | `3p_other/frappe/erpnext` | `erpnext/<module>/…` |
| **Frappe framework** | `3p_other/frappe/frappe` | `frappe/<area>/…` (doctypes `frappe/<area>/doctype/`, website `frappe/website/`) |
| **Frappe apps** (Frappe CRM, Frappe Insights, Frappe LMS) | `3p_other/frappe` | the app directory: `crm/frontend/src/…`, `insights/frontend/src2/…`, `lms/frontend/src/…`, LMS backend `lms/lms/lms/doctype/…` |
| **Twenty** | `3p_other/twenty` | `packages/twenty-front/src/…`, `packages/twenty-server/src/…` |
| **Nextcloud** | `3p_other/nextcloud` (bundle of app repos) | `<app>/src/…` (e.g. `forms/src/`), bundled server apps `server/apps/<app>/…` |
| **Dolibarr** | `3p_other/dolibarr` | `htdocs/<module>/…`, setup `htdocs/admin/…`, public pages `htdocs/public/…` |
| **AureusERP** | `3p_other/aureuserp` | `plugins/webkul/<plugin>/…` (Filament under `src/Filament/`) |
| **metasfresh** | `3p_other/metasfresh` | `backend/de.metas.<module>/…` (windows defined in SQL migrations), `frontend/src/…` |
| **Ever Gauzy** | `3p_other/ever-co/ever-gauzy` | `packages/plugins/<plugin>/…` |
| **Moqui components** (coarchy, resistmanagement, ridgecrest, Moqui Sales) | `3p_moqui/<component>` | `screen/…`, `service/…`, `entity/…` |
| **Moqui baseline** | `mr-moqui-base/runtime` | `component/mr-marble/screen/SimpleScreens/…`, `component/mr-mantle/entity/…`, `component/mr-mantle/service/mantle/…`, `component/mr-mantle/data/…`, `base-component/framework/{entity,service}/…`, `base-component/tools/screen/…` |

**Not used here.** Checked and found no marketing, campaign, newsletter, promotion or
survey screens: Zimbra, Carbon (`apps/erp/app/modules/` has no marketing module),
Akaunting (`modules/` is empty) and Moqui WorkManagement/WeCreate. Ever Gauzy has no
marketing screens, but its `promotion` plugin is a backend data model worth citing
(§5). The absence list is in
[§13 Gaps in the reference set](#gaps-in-the-reference-set). No source other than Odoo
covers more than a slice of the marketing surface, so the Odoo tables are deliberately
the deepest.

Sections: [1 home & calendar](#1-marketing-home-campaign-calendar--overview) ·
[2 campaigns & automation](#2-campaigns-planning--automation) ·
[3 audiences & consent](#3-segments-lists-audiences--consent) ·
[4 email, newsletters, SMS](#4-email-newsletters-sms--delivery) ·
[5 promotions & loyalty](#5-promotions-coupons-loyalty--referrals) ·
[6 content](#6-content-blogs-landing-pages-web-forms--social) ·
[7 events](#7-marketing-events--webinars) ·
[8 surveys](#8-surveys-forms--quizzes) ·
[9 analytics & attribution](#9-campaign-analytics-utm--attribution) ·
[10 configuration](#10-configuration--admin) ·
[11 cross-app surfaces](#11-cross-app-surfaces) ·
[12 Moqui baseline](#12-current-moqui-baseline-mr-marble--marbleerp--mantle) ·
[13 gaps & BOSS implications](#13-gaps--boss-implications)

---

## 1. Marketing home, campaign calendar & overview

### Odoo — menu-root hubs plus a real mailing calendar

Odoo has no single "Marketing" app. The marketing surface is a set of separate apps
(Email Marketing, SMS Marketing, Events, Surveys, Website, Marketing Card) that share
`utm.campaign` as the campaign key. Email Marketing is the de facto hub.

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Email Marketing (root menu) | Hub with Mailings, Recipients (Mailing Lists, Mailing Contacts, Dynamic Lists), Templates, Campaigns, Reporting (Mailing Analysis, Opt-Out Report) and Configuration (Settings, Campaign Stages, UTM Tags, Link Tracker, Blacklisted Email Addresses, Optout Reasons) | `odoo/addons/mass_mailing/views/mailing_menus.xml` |
| Mailings | List/kanban/calendar/form over `mailing.mailing`; default filter "My Mailings"; path `email-marketing` | `odoo/addons/mass_mailing/views/mailing_mailing_views.xml` (`mailing_mailing_action_mail`) |
| Mailings calendar | Month calendar coloured by state; scheduled date drives the calendar entry | `odoo/addons/mass_mailing/views/mailing_mailing_views.xml` (`mailing_mailing_view_calendar`) |
| Campaigns | Campaign kanban grouped by stage (quick-create), list and form; shows tags, responsible and (with CRM/Sales installed) lead and revenue counters | `odoo/addons/utm/views/utm_campaign_views.xml`; `odoo/addons/mass_mailing/views/mailing_menus.xml` |
| SMS Marketing (root menu) | Parallel hub: SMS Marketing, Mailing Lists, Mailing Contacts, Campaigns, Reporting, Configuration (blacklisted phones, link tracker) | `odoo/addons/mass_mailing_sms/views/mailing_sms_menus.xml` |
| Marketing Card → Campaigns | Share-card campaign list/kanban; no calendar | `odoo/addons/marketing_card/views/card_menus.xml`; `card_campaign_views.xml` |
| Website → Reporting | Analytics and eCommerce dashboards, Visitors, Page Views | `odoo/addons/website/views/website_views.xml`; `website_visitor_views.xml` |
| Events → Reporting | Reporting hub over event registrations (Attendees) | `odoo/addons/event/views/event_menu_views.xml`; `event/views/event_registration_views.xml` |
| Surveys | List/kanban of surveys, with Share/Results/Live Session actions | `odoo/addons/survey/views/survey_survey_views.xml` |

### Frappe — campaign links in the ERPNext workspace, generic dashboards elsewhere

| Screen/page | What it is | Key files |
| --- | --- | --- |
| CRM workspace sidebar | "Campaign" section linking Campaign, Email Campaign, SMS Center, SMS Log and Email Group, plus a Campaign Efficiency report link | `erpnext/crm/workspace/crm/crm.json` |
| CRM dashboard | Generic leads/deals dashboard, not marketing-specific | `crm/frontend/src/pages/Dashboard.vue` |
| Insights dashboard | Configurable dashboard page that can host campaign charts | `insights/frontend/src2/dashboard/DashboardPage.vue`, `DashboardBuilder.vue` |

### Twenty — no marketing home; campaigns are composed from the mail side

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Compose Campaign (command menu) | Global command that opens the campaign composer | `packages/twenty-front/src/modules/command-menu-item/engine-command/global/components/ComposeCampaignCommand.tsx` |
| Message campaign record views | Generic object index (table + list) named "All Campaigns" plus record page widgets | `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view/compute-standard-message-campaign-views.util.ts` |
| Dashboards | Generic widget/layout dashboards, no marketing dashboard | `packages/twenty-front/src/modules/dashboards/`; `packages/twenty-front/src/modules/page-layout/widgets/` |

### Nextcloud — dashboard host only

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Dashboard | Widget host (API widgets); no marketing widgets | `server/apps/dashboard/src/DashboardApp.vue`, `components/ApiDashboardWidget.vue` |

### Dolibarr — module home pages act as dashboards

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Mailing area home (`MailingArea`) | Target statistics, last mailings, quick links to all emailings | `htdocs/comm/mailing/index.php` |
| OpenSurvey list | Survey home: list, status (draft/opened/closed), expiry, new-survey wizard entry | `htdocs/opensurvey/list.php`; `htdocs/opensurvey/index.php` |
| Donations home | Donation/donor module landing page | `htdocs/don/index.php` |

### AureusERP — website dashboard with blog widgets

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Website dashboard | Stats overview plus blog widgets: `BlogChart`, `BlogStatusPieChart`, `BlogAuthorsChart`, `CategoriesPieChart`, `RecentBlogsTable`, `TopCategoriesTable` | `plugins/webkul/website/src/Filament/Admin/Pages/WebsiteDashboard.php`; `plugins/webkul/website/src/Filament/Admin/Widgets/` |

### metasfresh — campaign window, no marketing dashboard

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Marketing Campaign / Marketing Platform windows | AD window/menu entries rendered by the generic WebUI window shell; no aggregate marketing dashboard | `backend/de.metas.marketing/base/src/main/sql/postgresql/system/90-de.metas.marketing.base/5492750_sys_gh4015-app_add_basic_tables_windows_etc.sql`; `frontend/src/components/window/` |

No material: Moqui components (the coarchy and resistmanagement public sites are
marketing *surfaces*, not marketing management screens); the Moqui baseline has no
marketing menu (§12).

**BOSS implications.** No reference app has a marketing home that answers "what is
running, what is next, what is performing". Odoo comes closest with the mailings
calendar plus the campaign kanban, but they are separate menus. One option for IronStone
Marketing's landing page combines a campaign calendar (`MarketingCampaign` from/thru dates,
scheduled sends, Commons events, blog publish dates), KPI tiles (audience growth, sends,
open/click, attributed revenue) and shortcuts. The tiles are Insights widget types
(crosscut §3, Dashboard widgets) placed on Marketing's own landing page.

---

## 2. Campaigns, planning & automation

### Odoo — campaign container separate from send records

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Campaigns (`utm.campaign`) | Campaign record: title, responsible, tags, stage, colour, auto-generated flag; list + kanban grouped by stage with quick-create; opens from Email Marketing and SMS Marketing | `odoo/addons/utm/views/utm_campaign_views.xml` |
| Campaign form, CRM extension | Adds lead/opportunity count button (label switches by `use_leads`) | `odoo/addons/crm/views/utm_campaign_views.xml` |
| Campaign form, Sales extension | Adds quotation count and invoiced revenue buttons | `odoo/addons/sale/views/utm_campaign_views.xml` |
| Mailings | The send record: `mailing_type` (mail/SMS), subject, recipients, body, campaign/medium/source, A/B settings, state `draft → in_queue → sending → done` | `odoo/addons/mass_mailing/views/mailing_mailing_views.xml` |
| Mailing test wizard | Test-send dialog | `odoo/addons/mass_mailing/wizard/mailing_mailing_test_views.xml` |
| Schedule-date wizard | Send-now vs schedule-at date picker | `odoo/addons/mass_mailing/wizard/mailing_mailing_schedule_date_views.xml` |
| A/B testing | Enable per mailing; sample percentage; winner criterion; winner scheduling; variant name; "A/B Tests" and "A/B Tests to review" filters; send winner to the remaining audience | `odoo/addons/mass_mailing/views/mailing_mailing_views.xml`; `odoo/addons/mass_mailing/models/mailing.py` (`ab_testing_*`) |
| Card Campaign | Share-card campaign: design/template, recipient preview record, target URL, post suggestion, request/reward text, tags, responsible; counters for mailings, cards, clicks, opens and shares; Send/Preview | `odoo/addons/marketing_card/views/card_campaign_views.xml`; `marketing_card/models/card_campaign.py` |
| Events | Event records with stage kanban/calendar, tickets, communication, questions | `odoo/addons/event/views/event_event_views.xml`; `event_menu_views.xml` |
| Marketing automation | **Absent from this checkout**; only documentation pages remain (enterprise feature) | `documentation/content/applications/marketing/marketing_automation/` |
| Budget fields | **Absent** from `utm.campaign`, `mailing.mailing` and `card.campaign` (grep for `budget` / `cost` produces nothing in those models) | — |

A/B specifics: `ab_testing_pc` defaults to 10% of recipients; the campaign carries the
winner criterion (default "opened ratio") and the A/B schedule; a mailing is flagged as
the winner and can be sent to the rest of the audience.

### Frappe — Campaign ↔ Email Campaign ↔ schedule rows

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Campaign (Desk form) | Campaign name, naming series, `campaign_schedules` child rows, description; "View Leads" jumps to the mirrored UTM campaign | `erpnext/crm/doctype/campaign/campaign.json`, `campaign.js` |
| Campaign Email Schedule | Child row: `send_after_days`, `email_template` — a simple drip sequence | `erpnext/crm/doctype/campaign_email_schedule/campaign_email_schedule.json` |
| Email Campaign | Binds a Campaign to a recipient type (Lead / Contact / Email Group), a concrete recipient, a sender, start/end dates and status `Scheduled / In Progress / Completed / Unsubscribed` | `erpnext/crm/doctype/email_campaign/email_campaign.json` |
| Campaign Efficiency report | Report over campaign-driven leads/opportunities | `erpnext/crm/report/campaign_efficiency/` |
| Workflow Automations | Generic trigger → condition → step builder with trial run and run history, usable for drip/nurture | `crm/frontend/src/components/Settings/WorkflowAutomations/WorkflowAutomationBuilder.vue`, `WorkflowAutomationPage.vue`, `WorkflowAutomationRuns.vue` |
| Stages / A/B / budgets | Not present | — |

### Twenty — campaign composer with message-campaign records

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Message Campaign object | Fields: name, subject, body template, from address, lifecycle status (`DRAFT / SCHEDULED / SENDING / SENT / SENT_WITH_ERRORS / CANCELED`), scheduled/sent timestamps, sent/delivered/failed/bounced/complained/skipped counts, unique opens/clicks and rates, unsubscribe topic, message list, messages and recipients | `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/field-metadata/compute-message-campaign-standard-flat-field-metadata.util.ts` |
| Send Campaign side panel | Campaign composer page (details + recipients) | `packages/twenty-front/src/modules/side-panel/pages/send-campaign/components/SidePanelSendCampaignPage.tsx`, `SendCampaignForm.tsx` |
| Send Test side panel | Test-send variant page | `packages/twenty-front/src/modules/side-panel/pages/send-campaign-test/components/SidePanelSendCampaignTestPage.tsx` |
| Campaign commands | Send, send test, duplicate, cancel | `packages/twenty-front/src/modules/command-menu-item/engine-command/record/single-record/message-campaign/components/` |
| Workflow builder | Generic automation (triggers, conditions, steps, versions) | `packages/twenty-front/src/modules/workflow/` |
| Stages / A/B / budgets | Not present | — |

### Dolibarr — one-shot emailings, no campaign object

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Emailing card | Create/edit an emailing: ref, sender, subject, message, recipients, status; Test and Send actions | `htdocs/comm/mailing/card.php` |
| Emailings list | List/filter/search of past emailings | `htdocs/comm/mailing/list.php` |
| Targeting screens | Basic and advanced recipient selection (see §3) | `htdocs/comm/mailing/targetemailing.php`, `advtargetemailing.php` |
| Stages / automation / A-B / budget | Not present | — |

### metasfresh — campaign window plus an external marketing platform

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Marketing Campaign window | Campaign record with marketing platform and external record ID | `backend/de.metas.adempiere.adempiere/migration/src/main/sql/postgresql/system/10-de.metas.adempiere/5493640_sys_gh4030-marketing-campaign-window-webui.sql` |
| Marketing Platform window | Gateway configuration: client, organisation, customer number, credentials, active flag | `backend/de.metas.adempiere.adempiere/migration/src/main/sql/postgresql/system/10-de.metas.adempiere/5493510_sys_gh4030-marketing-windows-webui.sql` |
| Contact/campaign assignment processes | "Contacts of selected business partners into campaign", "Selected contacts into campaign", import/export to platform | `backend/de.metas.marketing/base/src/main/java/de/metas/marketing/base/process/` |
| Serial letters | Mail-merge letters generated from marketing contact persons | `backend/de.metas.marketing/serialletter/`; `frontend/src/components/letter/NewLetter.js` |
| Campaign as accounting dimension | `C_Campaign` carried on fact lines/summaries | `backend/de.metas.acct.base/src/main/java-gen/de/metas/acct/model/I_Fact_Acct_Summary.java` |

### Ever Gauzy — promotion campaigns with budgets (backend only)

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Campaign + budget (no UI) | `campaign` is a window and a budget with status `DRAFT / ACTIVE / INACTIVE`; `campaign_budget` is a spend or usage ceiling (`SPEND`, `USAGE`, `SPEND_BY_ATTRIBUTE`, `USAGE_BY_ATTRIBUTE`) consumed per redemption; REST/GraphQL only, no screens | `packages/plugins/promotion/README.md`; `packages/plugins/promotion/src/lib/promotion.types.ts`; `campaign/`, `campaign-budget/`, `campaign-budget-usage/` |

No material: Nextcloud, AureusERP, Moqui components. The Moqui baseline has a full
`MarketingCampaign` record but no screen for it (§12).

**BOSS implications.** The references treat a campaign as a container, not a send: Odoo's
separation of `utm.campaign` from `mailing.mailing` is the clearest model, and its
CRM/Sales counters show what a campaign record is for. The UI references omit budgets
(only Ever Gauzy's backend has a spend ceiling), but Mantle's `MarketingCampaign` already
carries `budgetedCost`, `estimatedCost`, `actualCost`, `expectedRevenue`,
`expectedResponsePercent`, `numSent`, a parent campaign and an approval status flow
(Planned → Approved → In Progress → Completed, or Cancelled), so planned vs actual can be
shown on the campaign screen without new fields. A/B testing needs explicit variant rows,
a sample percentage, a winner criterion and a "send winner to remaining" action; nothing
outside Odoo models this. Neither Frappe nor Twenty has marketing-specific automation —
they expose generic workflow builders; one option for BOSS is drip steps on its own
scheduled jobs rather than a second automation engine. Odoo's configurable campaign stages
differ from Mantle's fixed status flow; tags and UTM vocabularies kept as shared
configuration would let Sales and Marketing see the same campaign list.

---

## 3. Segments, lists, audiences & consent

### Odoo — static lists, dynamic lists and opt-out governance

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Mailing Lists | Static lists: name, public flag, recipients, mailings, bounce/opt-out/blacklist percentages; Merge action; Import Contacts | `odoo/addons/mass_mailing/views/mailing_list_views.xml` |
| Mailing Contacts | Contact records with subscription/opt-out state, list membership and import | `odoo/addons/mass_mailing/views/mailing_contact_views.xml` |
| Dynamic Lists (`mailing.filter`) | Saved audience rule: name, recipient model, domain expression, created-by; kanban cards show recipient model and mailing count | `odoo/addons/mass_mailing/views/mailing_filter_views.xml` |
| Mailing form recipients | Recipient model (any mailing model), static lists, dynamic lists or a domain; "Use Exclusion List / Exclude Blacklisted Recipients"; live recipient count | `odoo/addons/mass_mailing/views/mailing_mailing_views.xml` |
| Subscription preferences | Portal pages to manage subscriptions, blocklist and feedback | `odoo/addons/mass_mailing/views/mailing_templates_portal_management.xml`, `mailing_templates_portal_unsubscribe.xml`; `static/src/xml/mailing_portal_*` |
| Opt-out reasons | Dictionary (name, allow feedback) used by the unsubscribe form | `odoo/addons/mass_mailing/views/mailing_subscription_optout_views.xml` |
| Blacklisted email addresses | Global suppression list | `odoo/addons/mass_mailing/views/mail_blacklist_views.xml`; `odoo/addons/mail/views/mail_blacklist_views.xml` |
| SMS lists/contacts + phone blacklist | SMS equivalents of list, contacts and suppression | `odoo/addons/mass_mailing_sms/views/mailing_list_views.xml`, `odoo/addons/mass_mailing_sms/views/mailing_contact_views.xml`, `odoo/addons/mass_mailing_sms/views/mailing_sms_menus.xml` |
| Partner marketing fields | Subscription/opt-out information added to partner forms | `odoo/addons/mass_mailing/views/res_partner_views.xml` |

### Frappe — Email Group is the audience primitive

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Email Group | Subscriber list (title, subscriber count, welcome and confirmation email templates, welcome URL) | `frappe/email/doctype/email_group/email_group.json` |
| Email Group Member | Member rows with email and subscription status | `frappe/email/doctype/email_group_member/email_group_member.json` |
| Email Unsubscribe | Unsubscribe records used by the mailer | `frappe/email/doctype/email_unsubscribe/` |
| Lead/contact filters | CRM SPA filters and group-by controls, not reusable saved segments | `crm/frontend/src/components/Filter.vue`, `GroupBy.vue` |
| Segment builder | Not present | — |

### Twenty — message lists plus a suppression-aware audience preview

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Message List object | Name, description, members, campaigns; generic record list and detail | `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/field-metadata/compute-message-list-standard-flat-field-metadata.util.ts` |
| Add to Message List side panel | Adds people/records to a list from the record UI | `packages/twenty-front/src/modules/side-panel/pages/add-to-message-list/components/SidePanelAddToMessageListPage.tsx` |
| List commands | Duplicate list; add a view's records to a list | `packages/twenty-front/src/modules/command-menu-item/engine-command/record/single-record/message-list/components/DuplicateMessageListSingleRecordCommand.tsx`; `packages/twenty-front/src/modules/command-menu-item/engine-command/record/no-selection/components/AddViewToMessageListNoSelectionRecordCommand.tsx` |
| Audience preview | Returns total members and sendable count plus explicit exclusion buckets: missing email, duplicate emails, hard-suppressed, globally unsubscribed, topic-unsubscribed, tracking-refused | `packages/twenty-front/src/modules/activities/emails/hooks/useCampaignAudiencePreview.ts`; `packages/twenty-server/src/engine/core-modules/emailing-domain/dtos/campaign-audience-preview.dto.ts` (`CampaignAudiencePreviewDTO`) |
| Unsubscribers / Unsubscribe Topics | Suppression list with reason badges/filters and topic management | `packages/twenty-front/src/modules/settings/unsubscribers/components/SettingsUnsubscribersList.tsx`; `packages/twenty-front/src/modules/settings/unsubscribe-topics/components/SettingsWorkspaceUnsubscribeTopicSection.tsx` |

The preview contract stands out: before a send, the UI states how many recipients
are sendable and why the rest are excluded, rather than silently dropping them.

### Dolibarr — criteria targeting and saved advanced filters

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Target emailing | Basic recipient targeting over third parties/contacts; download selected targets as CSV | `htdocs/comm/mailing/targetemailing.php` |
| Advanced target emailing | Filters over extra fields, categories and attributes; save and delete named filter sets | `htdocs/comm/mailing/advtargetemailing.php`; `htdocs/comm/mailing/class/advtargetemailing.class.php` |
| Members list | Member audience | `htdocs/adherents/list.php`; `htdocs/adherents/index.php` |

### metasfresh — marketing contact persons with explicit consent

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Marketing Contact Person | Contact record synced to a marketing platform: address, language, attributes, platform/external ID, last sync status, deactivated flag | `backend/de.metas.marketing/base/` (model, repository, services) |
| Consent tab | Marketing-consent records attached to contact persons (per platform/purpose) | `backend/de.metas.marketing/base/src/main/sql/postgresql/system/90-de.metas.marketing.base/5492750_sys_gh4015-app_add_basic_tables_windows_etc.sql` (`Einverständnis` tabs) |
| Campaign contact view | Contacts with campaign membership, used by campaign composition | `backend/de.metas.marketing/base/src/main/sql/postgresql/ddl/views/MKTG_ContactPerson_With_Campaign_V.sql` |
| Newsletter flag | `AD_User.IsNewsletter` and a default newsletter campaign | `backend/de.metas.marketing/base/src/main/sql/postgresql/system/90-de.metas.marketing.base/5493140_sys_gh4031_NewsletterFlag_In_AD_User_DDL.sql`; `backend/de.metas.marketing/base/src/main/sql/postgresql/system/90-de.metas.marketing.base/5493080_sys_gh4031_DefaultNewsletter_In_MKTG_Campaign.sql` |

### AureusERP — partners only

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Partners/Contacts | Contact records; no segmentation UI | `plugins/webkul/contacts/src/Filament/Resources/PartnerResource.php`; `plugins/webkul/website/src/Filament/Admin/Resources/PartnerResource.php` |

### Moqui components — ridgecrest storefront subscriptions to external lists

| Screen/page | What it is | Key files |
| --- | --- | --- |
| My account → mailing lists | Customer page listing the store's mailing lists (`MailchimpList` rows by sequence) with the shopper's subscription status; subscribe/unsubscribe calls go to Mailchimp or ConvertKit | `screen/rcherbals/account/mailingLists.xml`, `mailingLists.html.ftl`; `entity/RidgecrestEntities.xml` (`MailchimpList`) |
| Newsletter sign-up | Public sign-up transition and scripts | `screen/popdynamic.xml` (`add#MailSubscription`); `screen/popstatic/js/SignUpConvertkitMailSubscription.js` |
| Subscription services | `add#MailSubscription`, `check#SubscriptionStatus`, `disable#MailSubscription`, ConvertKit tag checks; provider scripts per service | `service/ridgecrest/MarketingServices.xml`; `service/ridgecrest/mailchimp/`, `service/ridgecrest/convertkit/` |

ridgecrest does not use Mantle `ContactList`; the list and the consent live at the
external provider, as in metasfresh's CleverReach sync.

No material: Nextcloud (forms responses are not an audience list; Contacts has groups but
no marketing screens).

**BOSS implications.** The references show two audience kinds: a static list (imported,
merged, curated) and a dynamic segment (saved query over Party/ContactMech and business
records).
Odoo is the only UI reference that has both as reusable objects (Dolibarr's advanced
filters are named filter sets tied to an element such as an emailing, not curated
lists). Mantle already has both records: `ContactList` + `ContactListParty` for static
lists (with double opt-in:
`optInVerifyCode`, statuses Pending → Accepted → Unsubscribe Pending → Unsubscribed), and
`MarketSegment` with rule rows (`MarketSegmentClassification`, `MarketSegmentGeo`,
`MarketSegmentDimension`) plus explicit `MarketSegmentParty` members; no service evaluates
segment rules yet. Consent is the differentiator: metasfresh keeps an explicit consent
entity (declared/revoked dates), Odoo keeps opt-out reasons plus a global blacklist,
Twenty keeps suppression reasons plus topics, Frappe keeps unsubscribe records. Per
crosscut §4 the consent and suppression records are shared, kept with the **Comms**
suite that every app uses; Marketing includes the consent and unsubscribe screens for its
audience, reads the records when building an audience, and could show the same
exclusion-bucket preview Twenty shows before a send.

---

## 4. Email, newsletters, SMS & delivery

### Odoo — builder, template library, traces and SMS

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Template Library | Kanban/form of reusable mailings (`is_template`), "Use this" converts a template into a mailing | `odoo/addons/mass_mailing/views/mailing_mailing_views.xml` (`mailing_mailing_action_templates`) |
| Email builder | Drag-and-drop HTML body editor in an iframe, snippet palette, theme selector, mobile preview, preview text, from/reply-to, attachments | `odoo/addons/mass_mailing/views/mailing_mailing_views.xml`; `odoo/addons/mass_mailing/static/src/builder/`; `odoo/addons/mass_mailing/static/src/snippets/`; `odoo/addons/mass_mailing/static/src/themes/theme_selector/`; `odoo/addons/mass_mailing/static/src/iframe/` |
| Email themes | Over a dozen designed templates (event, blogging, coupon, magazine, promotion, newsletter, catalog, roadshow, …) | `odoo/addons/mass_mailing_themes/views/mass_mailing_themes_templates.xml` |
| Send / test / schedule | Send, Test, Schedule, Preview, Duplicate, Cancel, Retry failed; statusbar `draft → sending → done`; queue counters (scheduled/process) | `odoo/addons/mass_mailing/views/mailing_mailing_views.xml`; wizard views |
| Mailing traces | Per-recipient trace with `trace_status` Outgoing (filter "Scheduled"), Processing, Sent, Delivered, Opened, Replied, Bounced, Exception, Cancelled; "Clicked" is a filter on the `links_click_datetime` timestamp, not a status; retry failed; filters and group-bys | `odoo/addons/mass_mailing/views/mailing_trace_views.xml`; `odoo/addons/mass_mailing/models/mailing_trace.py` |
| Mailing Analysis report | Trace report with list/graph/pivot | `odoo/addons/mass_mailing/report/mailing_trace_report_views.xml` |
| Opt-Out Report | Subscription/opt-out analysis | `odoo/addons/mass_mailing/views/mailing_subscription_views.xml` (`mailing_subscription_action_report_optout`) |
| SMS Marketing | SMS mailings, lists, traces, templates; phone blacklist | `odoo/addons/mass_mailing_sms/views/mailing_mailing_views.xml`, `mailing_trace_views.xml`; `odoo/addons/sms/views/sms_template_views.xml`, `sms_sms_views.xml` |
| Transactional mail templates | Server-side email templates and scheduled messages | `odoo/addons/mail/views/mail_template_views.xml`; `mail_scheduled_message_views.xml` |
| Website newsletter capture | Newsletter block and benefits popup snippets; subscription goes to a mailing list | `odoo/addons/website_mass_mailing/static/snippets/snippets_templates.xml`; `controllers/` |
| Subscription portal | Public subscribe/unsubscribe/preferences pages with feedback | `odoo/addons/mass_mailing/views/mailing_templates_portal_unsubscribe.xml`, `mailing_templates_portal_management.xml` |

Sending configuration: `mass_mailing` settings expose campaign grouping, "split contact
name" (first/last name placeholders), blacklist buttons, periodic reports and a global
dedicated outgoing mail server (`mass_mailing_outgoing_mail_server` +
`mass_mailing_mail_server_id`) — `odoo/addons/mass_mailing/views/res_config_settings_views.xml`.

### Frappe — templates and queue, but no Newsletter UI

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Email Template (Desk) | Subject/response templates with Jinja context; list/form | `frappe/email/doctype/email_template/` |
| Email Campaign | Scheduled series of emails to Leads/Contacts/Email Groups with start/end and status | `erpnext/crm/doctype/email_campaign/email_campaign.json` |
| Campaign Email Schedule | Per-campaign delay + template rows | `erpnext/crm/doctype/campaign_email_schedule/campaign_email_schedule.json` |
| Email Queue | Outbound queue with recipient rows and newsletter-aware flags | `frappe/email/doctype/email_queue/`; `email_queue_recipient/` |
| Email Account / Email Domain | Sender accounts and domains | `frappe/email/doctype/email_account/`; `email_domain/` |
| CRM composer + template picker | Rich composer with a template selector modal | `crm/frontend/src/components/EmailEditor.vue`; `components/Modals/EmailTemplateSelectorModal.vue` |
| CRM Email Templates | List, new, edit pages | `crm/frontend/src/components/Settings/EmailTemplate/EmailTemplates.vue`, `NewEmailTemplate.vue`, `EditEmailTemplate.vue` |
| Newsletter doctype/screens | **Absent from this checkout** (docs/role/queue flag only) | `frappe/email/`; `crm/frontend/src/pages/` |

### Twenty — composer, variables, scheduling and delivery stats

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Campaign composer | Body/details/recipients; variables inserted as chips; preview | `packages/twenty-front/src/modules/activities/emails/components/CampaignComposer.tsx`, `CampaignDetailsFields.tsx`, `CampaignBodyField.tsx`; `packages/twenty-front/src/modules/activities/emails/editor/extensions/campaign-variables/` |
| Envelope/preview | Sent envelope, sent preview, send-campaign info (recipient count, opt-out/tracking caveat) | `packages/twenty-front/src/modules/activities/emails/components/CampaignEnvelopeBox.tsx`, `CampaignSentPreview.tsx`; `packages/twenty-front/src/modules/side-panel/components/SidePanelSendCampaignInfo.tsx` |
| Send/test/schedule/cancel | Hooks and GraphQL mutations | `packages/twenty-front/src/modules/activities/emails/hooks/useSendMessageCampaign.ts`, `useSendMessageCampaignTest.ts`, `useCancelMessageCampaign.ts` |
| Delivery stats | Counts/rates on the message campaign record (sent, delivered, failed, bounced, complained, skipped, unique opens/clicks) | `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/field-metadata/compute-message-campaign-standard-flat-field-metadata.util.ts` |
| Unsubscribe links | Login-free unsubscribe token, hostname and page content services; DMARC record check | `packages/twenty-server/src/engine/core-modules/emailing-domain/services/unsubscribe-token.service.ts`, `unsubscribe-content.service.ts`, `dmarc-record.service.ts` |
| Open/click tracking | Workspace-level switches | `packages/twenty-front/src/modules/settings/workspace/components/OpenTrackingSwitch.tsx`, `ClickTrackingSwitch.tsx` |
| Template library | **Not present** | — |

### Nextcloud — mail client, not a campaign sender

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Mail home / composer | Personal mail client; no bulk sending, lists or traces | `mail/src/views/Home.vue`; `mail/src/components/Composer.vue` |
| Forms confirmation email | Toggle and rate limit for respondent confirmation emails | `forms/src/FormsSettings.vue` |

### Dolibarr — HTML emailing with read pixel and unsubscribe placeholders

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Emailing card/editor | Subject, HTML body, attachments, substitution variables, test send | `htdocs/comm/mailing/card.php` |
| Read tracking + unsubscribe | `__CHECK_READ__` pixel and `__UNSUBSCRIBE__`/`__UNSUBSCRIBE_URL__` substitutions, signed per recipient; a `List-Unsubscribe` header is added when the unsubscribe URL is used | `htdocs/comm/mailing/card.php`; public pages `htdocs/public/emailing/mailing-read.php`, `mailing-unsubscribe.php` |
| Emailing log | Per-recipient send information | `htdocs/comm/mailing/info.php` |
| Email templates | Shared email templates | `htdocs/admin/mails_templates.php` |
| Sender profiles / emailing setup | Sender profiles and module options | `htdocs/admin/mails_senderprofile_list.php`; `htdocs/admin/mails_emailing.php`; `htdocs/admin/mailing.php` |
| Click tracking UI | **Not found** in `htdocs/comm/mailing` | — |

### metasfresh — compose email/letter, delegate sending

| Screen/page | What it is | Key files |
| --- | --- | --- |
| New Email | Email compose component | `frontend/src/components/email/NewEmail.js` |
| New Letter | Serial-letter compose | `frontend/src/components/letter/NewLetter.js` |
| CleverReach integration | External email-marketing sync; no in-app designer | `backend/de.metas.marketing/cleverreach/` |

No material: AureusERP; Moqui components have only transactional notification emails
(coarchy, resistmanagement) and ridgecrest's external-provider newsletters (§3). The
Moqui baseline's email records are in §12.

**BOSS implications.** Per crosscut §4, email/SMS accounts, sending, tracking and
unsubscribe are the **Comms** suite, used from every app; Marketing includes those screens
with a campaign-send emphasis: content, audience, schedule, A/B variants and the
campaign's view of the traces. The references suggest a minimum Marketing screen set of:
campaign mailing template library, composer with variables and preview/test,
send/schedule dialog with the audience preview, and the per-recipient trace list for that
send (the reused Comms trace list filtered to the send). Odoo's trace statuses
(outgoing, processing, sent, delivered, opened, replied, bounced, exception, cancelled)
plus a separate click timestamp are a good fixed set; the Moqui baseline already has
`ContactListCommStatus` (one row per list, `CommunicationEvent`, contact mech and
`messageId`) and `EmailMessage` statuses Draft, Ready, Sent, Received, Viewed, Bounced,
Cancelled. Two rules the references apply to bulk sends, which fit the shared Comms send
path: consent is re-checked at dispatch (not only at audience selection), and every
message carries an unsubscribe/preference link that resolves without login plus a
`List-Unsubscribe` header (Dolibarr, Twenty). Twenty's open/click tracking switches and
emailing-domain DNS verification are shared Comms settings that Marketing sends depend
on.

---

## 5. Promotions, coupons, loyalty & referrals

### Odoo — full promotion/loyalty model

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Discount & Loyalty | Program list/form (`path discount-loyalty`) | `odoo/addons/loyalty/views/loyalty_program_views.xml` |
| Program types | Coupons, Gift Card, Loyalty Cards, Promotions, eWallet, Discount Code, Buy X Get Y, Next Order Coupons; applies-on current/future/both; validity dates, usage limits, once-per-user, participating partners, pricelists | `odoo/addons/loyalty/models/loyalty_program.py`; `views/loyalty_program_views.xml` |
| Gift cards & eWallet | Separate program variant list/form (`path gift-cards-ewallet`) | `odoo/addons/loyalty/views/loyalty_program_views.xml`; `website_sale_loyalty/views/loyalty_program_views.xml` |
| Rules & Rewards | Rule kanban/form (discount code, minimum quantity/amount, product scope, points) and reward kanban/form (discount/product, points cost, description) | `odoo/addons/loyalty/views/loyalty_rule_views.xml`, `loyalty_reward_views.xml` |
| Communications | Per-program communication plan (email templates), excluded for current-order programs | `odoo/addons/loyalty/views/loyalty_mail_views.xml`; `loyalty_program_views.xml` |
| Coupons / loyalty cards | Coupon list/form with code, balance, partner, expiry, program, "Send"; history lines | `odoo/addons/loyalty/views/loyalty_card_views.xml`, `loyalty_history_views.xml` |
| Website/POS integration | Coupon/gift-card entry in eCommerce, POS and Sales | `odoo/addons/website_sale_loyalty/views/website_sale_templates.xml`; `pos_loyalty/`; `sale_loyalty/` |
| Referrals | No referral program in this checkout | — |

### Frappe — loyalty points, coupon codes and promotional schemes

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Loyalty Program | Program form + dashboard (rules, collection rules, redemption, conversion factor, expiry) | `erpnext/accounts/doctype/loyalty_program/loyalty_program.json`, `loyalty_program_dashboard.py` |
| Loyalty Point Entry | Point ledger | `erpnext/accounts/doctype/loyalty_point_entry/loyalty_point_entry.json` |
| Coupon Code | Coupon records | `erpnext/accounts/doctype/coupon_code/coupon_code.json` |
| Promotional Scheme | Promotional price/discount rules | `erpnext/accounts/doctype/promotional_scheme/`; `promotional_scheme_price_discount/`; `promotional_scheme_product_discount/` |
| Customer Acquisition and Loyalty report | Acquisition/loyalty reporting | `erpnext/selling/report/customer_acquisition_and_loyalty/` |
| Frappe LMS coupons | Settings list and form for course/batch coupons: code, discount type (percentage or fixed amount), expiry, usage limit, applicable items, enabled, redemption count | `lms/frontend/src/components/Settings/Coupons/Coupons.vue`, `CouponForm.vue`; `lms/lms/lms/doctype/lms_coupon/lms_coupon.json` |

### Dolibarr — price rules and partnerships, not promotions

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Price rules | Discount/price-rule configuration | `htdocs/product/admin/price_rules.php` |
| Dynamic prices | Formula/global-variable based pricing | `htdocs/product/admin/dynamic_prices.php`; `htdocs/product/dynamic_price/class/` |
| Price levels | Product/customer price levels | `htdocs/product/price.php`; `htdocs/societe/price.php` |
| Partnerships | Partner records (third party or member) with type, start/end dates, status, decline reason, and a URL whose backlink is checked (last check, error count) — the closest thing to an affiliate program in the set; no reward or referral tracking | `htdocs/partnership/partnership_list.php`, `partnership_card.php`; `htdocs/partnership/class/partnership.class.php` |

### Ever Gauzy — promotion domain (backend only)

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Promotions, actions, coupons (no UI) | Promotion types `STANDARD`, `BUY_GET`, `FREE_SHIPPING`, `BUNDLE`, `FREE_ITEM`; actions fixed, percentage, free shipping, free item, bundle price, tiered percentage on order, items or shipping; coupons with their own limits and window; conditions evaluated by the kernel rule engine, not the plugin | `packages/plugins/promotion/src/lib/promotion.types.ts`; `promotion/`, `promotion-action/`, `coupon/` |
| Redemption ledger (no UI) | `promotion_usage` rows Reserved → Registered or Reverted, so limits and budgets hold during checkout; every exclusion is returned as a notice naming why a promotion did not apply | `packages/plugins/promotion/README.md`; `packages/plugins/promotion/src/lib/promotion-usage/` |
| Gift cards (no UI) | Stored-value card with status Active/Redeemed/Expired/Canceled and an append-only transaction ledger (Issue, Redeem, Refund, Adjust, Expire) | `packages/plugins/promotion/src/lib/gift-card/`, `gift-card-transaction/` |

### AureusERP — price lists only

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Price Lists | List/create/edit/view price lists | `plugins/webkul/products/src/Filament/Resources/PriceListResource.php` |

### metasfresh — campaign pricing dimension

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Campaign pricing | `C_Campaign` carried through pricing/accounting; campaign price conditions (`C_Campaign_Price`) | `backend/de.metas.acct.base/src/main/java-gen/de/metas/acct/model/I_Fact_Acct_Summary.java`; `backend/de.metas.fresh/de.metas.fresh.base/src/main/sql/postgresql/system/70-de.metas.fresh/5727390_sys_gh18309_Add_PricingSystem_Product_Campaign_Price.sql` |

No material: Twenty, Nextcloud, Moqui components. No coupons/gift cards/loyalty/referrals
in Dolibarr/AureusERP/metasfresh UIs. The Moqui baseline has store promotion and promo
code screens (§12).

**BOSS implications.** Per crosscut §4, the promotion, coupon and loyalty **program
screens** are reused (reused: Marketing, Commerce, Sales): Marketing's version emphasizes
programs, Commerce's the store binding and checkout, and Sales' manual discounts on
quotes, while evaluation lives in the shared price resolver. That matches the references:
Odoo keeps programs (rules + rewards + codes + validity) in a pricing app with no campaign
link, and Frappe's promotional schemes and Dolibarr's price rules follow the same split,
which keeps checkout, POS and quotes consistent. The Moqui baseline already has the
program record: `ProductStorePromotion` (a registered promotion service — new-customer
discount, buy X get Y, flat discount — plus parameters, products, date window,
`requireCode` and use limits per order, customer and promotion), `ProductStorePromoCode`
(+ `ProductStorePromoCodeParty`) and `OrderPromoCode`. It has no link from a promotion to
a `MarketingCampaign`, which campaign attribution needs. Coupon codes need a lifecycle
(issued, assigned, redeemed, expired) and a holder; Ever Gauzy's reserve-then-register
usage ledger and its "every exclusion is reported" rule are a model for the resolver's
explanation. Gift cards and eWallet are liabilities and post to Accounting (Mantle
`FinancialAccount` types `GiftCard`, `GiftCertificate`). Referral programs are absent
everywhere in the reference set; Mantle's partner-managed `TrackingCode` with billable
lifetime is an affiliate-attribution basis, but a referral reward program would be a
separate program type.

---

## 6. Content: blogs, landing pages, web forms & social

### Odoo — website CMS, blog, share cards and events

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Website → Site | Homepage, Menu Editor, Content (Pages, Model Pages, System Pages), This page (Properties, Optimize SEO, HTML/CSS Editor, Edit Menu) | `odoo/addons/website/views/website_views.xml`; `website_pages_views.xml`; `website_controller_pages_views.xml` |
| Pages | Website page list/kanban with publish state, tracking and "Not SEO optimized" filters | `odoo/addons/website/views/website_pages_views.xml` |
| Page editor | In-context website builder: block palette, page properties, SEO metadata, HTML/CSS editor | `odoo/addons/website/static/src/builder/`; `views/website_views.xml` |
| Website → Configuration | Settings, Apps, Websites, Menus, Redirects, Themes/Configurator | `odoo/addons/website/views/res_config_settings_views.xml`; `website_rewrite.xml`; `website_views.xml` |
| Blog | Blogs, Tags, Tag Categories configuration | `odoo/addons/website_blog/views/website_blog_views.xml` |
| Blog Post Pages | Post list (title, author, blog, tags, published) + kanban with publish toggle; form has blog, teaser, tags, author, content, SEO meta title/description/keywords, scheduled publish (`publish_on`) | `odoo/addons/website_blog/views/website_pages_views.xml`; `website_blog_views.xml`; `models/website_blog.py` |
| Link Tracker | Short link/UTM creation from the website editor; click stats; QR download | `odoo/addons/website_links/views/link_tracker_views.xml`; `link_tracker_views.xml` |
| Marketing Card / share campaign | Card designer and preview; public share page for X, LinkedIn, WhatsApp and Pinterest; LinkedIn post composer; click/open/share counters | `odoo/addons/marketing_card/views/card_card_views.xml`, `card_frontend_templates.xml`; `static/src/interactions/linkedin_message_editor.js` |
| Events | Events, Registration Desk (barcode), Event Templates, Stages, Tags Categories, Questions, Tickets, Slots | `odoo/addons/event/views/event_menu_views.xml`; `event_event_views.xml`; `event_registration_views.xml`; `event_question_views.xml`; `event_ticket_views.xml`; `event_slot_views.xml` |
| Social posting | **Absent**; `social_media` only adds company social URLs | `odoo/addons/social_media/views/res_company_views.xml` |

### Frappe — web pages, web forms and a CRM lead-capture form builder

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Web Page | CMS page record with route, published flag, blocks; rendered by the website renderer | `frappe/website/doctype/web_page/`; `web_page_block/` |
| Web Form | Form builder record: route, document type, fields, login requirement, allow multiple/edit/delete/print/comments, introduction, success message/URL | `frappe/website/doctype/web_form/web_form.json`; `web_form_field/` |
| Web Form Request | Submitted responses | `frappe/website/doctype/web_form_request/` |
| Website Settings / Theme / Sidebar / Slideshow | Site configuration, theme, sidebar and slideshow content | `frappe/website/doctype/website_settings/`, `website_theme/`, `website_sidebar/`, `website_slideshow/` |
| CRM Forms | "Capture leads and deals from public forms": form list + builder with publish/preview/edit tabs | `crm/frontend/src/components/Settings/Forms/FormsList.vue`, `FormBuilderPanel.vue` |
| Blog Post | **No blog doctype in this checkout** | — |

### Nextcloud — wiki-style content (Collectives)

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Collectives home / collective view | Collective list and per-collective page tree | `collectives/src/views/HomeView.vue`, `CollectiveView.vue`, `PagePicker.vue` |
| Page editor / versions | Markdown editor, subpages, favorites, trash, versions, tags, templates, print view | `collectives/src/components/Page/TextEditor.vue`; `components/PageList/`; `components/PageVersion.vue`; `stores/templates.js` |
| Mail | Mail client, not a marketing CMS | `mail/src/views/Home.vue`; `mail/src/components/Composer.vue` |

### Dolibarr — website builder, portal and agenda

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Websites | Website list/editor, pages, menus, aliases, media | `htdocs/website/index.php`; `htdocs/core/modules/modWebsite.class.php` |
| Website settings/options | Global website configuration | `htdocs/admin/website.php`; `htdocs/admin/website_options.php` |
| Web portal | Customer portal controllers (orders, invoices, tickets, member card) | `htdocs/webportal/controllers/`; `htdocs/webportal/admin/setup.php` |
| Events/agenda | Agenda list/card for events and actions | `htdocs/comm/action/index.php`, `list.php`, `card.php` |

### AureusERP — pages, blogs and customer site

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Pages | CMS page list/create/edit/view | `plugins/webkul/website/src/Filament/Admin/Resources/PageResource.php` |
| Website partners | Partner pages/manage addresses/contacts | `plugins/webkul/website/src/Filament/Admin/Resources/PartnerResource.php` |
| Blog posts | Post list/create/edit/view; title, slug, sub-title, rich content, image, SEO meta title/keywords/description, category, tags | `plugins/webkul/blogs/src/Filament/Admin/Resources/PostResource/Schemas/PostForm.php`; `Pages/` |
| Blog categories/tags | Configuration cluster resources | `plugins/webkul/blogs/src/Filament/Admin/Clusters/Configurations/Resources/` |
| Customer site | Homepage, login, register, customer blog/category pages | `plugins/webkul/website/src/Filament/Customer/Pages/Homepage.php`; `Auth/Login.php`, `Auth/Register.php`; `plugins/webkul/blogs/src/Filament/Customer/Resources/` |

### Moqui components — hand-built public sites only

| Screen/page | What it is | Key files |
| --- | --- | --- |
| coarchy.com public site | Site root plus home, content, organizations, login, signup pages; header/footer templates | `screen/coarchy-com/c.xml`, `c/Home.xml`, `c/content.xml`, `c/Organizations.xml`, `c/Login.xml`, `c/SignUp.xml`; `screen/coarchy-com/includes/` |
| resistmanagement.com public site | Content, login | `screen/resistmanagement.com/content.xml`, `Login.xml` |

These are screens written by hand per site; neither has a page editor or content
records a marketer can manage. (coarchy's internal screens, `screen/coarchy/cointernal/`,
are its process-documentation app, not content management.)

No material: Twenty (no CMS), metasfresh. The Moqui baseline has wiki blog posts (§12).

**BOSS implications.** "Content" spans three different things: the public site (pages,
landing pages, forms), the blog (posts, taxonomy, authors, SEO), and internal knowledge
(Commons wiki). Odoo is the only reference that joins the first two with campaign link
tracking and email capture. The page list's SEO/tracking filters are a useful curation
view. One option is one page/route/block model shared with Commerce. Blog posts
already exist in the Moqui framework wiki: `moqui.resource.wiki.WikiBlog` (title,
author, summary, `publishDate`, `metaKeywords`, `metaDescription`, small image) over a
`WikiPage`, grouped by `WikiBlogCategory` (with a `sentDate` for when a post went out by
email), with SimpleScreens Wiki Blogs and Edit Blog screens. Crosscut §8 describes blogs
as Marketing screens over Commons wiki pages: Marketing would include blog post screens
over those records, while the wiki authoring screen is the one Commons and Customer
Service include (crosscut §4, Knowledge base articles). Social publishing is absent from
every open-source reference here — the only social surface is Odoo's share-card composer
(outbound links and a LinkedIn post form), so these sources give no basis for a social
scheduler.

---

## 7. Marketing events & webinars

### Odoo — full event management

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Events | List/kanban (by stage)/calendar/form; date range, template/type, tags, seats, stage | `odoo/addons/event/views/event_event_views.xml` |
| Tickets | Ticket types with price, seats and registration limits | `odoo/addons/event/views/event_ticket_views.xml` |
| Communication | Event mail schedulers (e.g. before/after event), template reference, per-registration mail log | `odoo/addons/event/views/event_mail_views.xml`; `event_event_views.xml` (`Communication` page) |
| Questions | Reusable registration questions, answers per registration | `odoo/addons/event/views/event_question_views.xml`, `event_registration_answer_views.xml` |
| Registration desk | Attendee list/kanban/form, barcode interface, confirm/attend/cancel actions | `odoo/addons/event/views/event_registration_views.xml` |
| Reporting | Attendees action with graph/pivot/kanban/list | `odoo/addons/event/views/event_registration_views.xml` (`action_registration`) |
| Configuration | Event Templates, Stages, Mail Schedulers, Tags Categories, Questions | `odoo/addons/event/views/event_menu_views.xml` |
| Website events | Public event pages and registration | `odoo/addons/website_event/views/event_templates_page.xml`, `event_templates_page_registration.xml`; `website_pages_views.xml` |
| Lead Generation Rules | Rules that create CRM leads from registrations: per attendee or per order, triggered when attendees are created, registered or attended, with event and attendee conditions and lead defaults; "Run Rule" | `odoo/addons/event_crm/views/event_lead_rule_views.xml`; `odoo/addons/event_crm/models/event_lead_rule.py` |
| Booths | Exhibitor booths per event with categories, renter name/email and availability filter | `odoo/addons/event_booth/views/event_booth_views.xml`, `event_booth_category_views.xml` |
| Tracks (talks, agenda) | Event talks with stages, locations, tags, agenda and proposal pages | `odoo/addons/website_event_track/views/event_track_views.xml`, `event_track_templates_agenda.xml`, `event_track_templates_proposal.xml` |

### Dolibarr — agenda events, booking and event organization

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Agenda | Event/action list and card | `htdocs/comm/action/index.php`, `list.php`, `card.php` |
| BookCal | Public booking calendars | `htdocs/bookcal/` |
| Event organization | A project flagged "organize event" carries registration price, booth price, max attendees and whether outsiders may suggest conferences or booths; conference-or-booth list/card with contacts | `htdocs/eventorganization/eventorganizationindex.php`, `conferenceorbooth_list.php`, `conferenceorbooth_card.php`; `htdocs/projet/class/project.class.php` (`price_registration`, `max_attendees`) |
| Attendees | Attendee list/card: email, name, company, subscription date, amount and linked invoice | `htdocs/eventorganization/conferenceorboothattendee_list.php`, `conferenceorboothattendee_card.php` |
| Public registration | Public attendee sign-up page and confirmation | `htdocs/public/eventorganization/attendee_new.php`, `subscriptionok.php` |

### Frappe LMS — batches and live classes (webinar shape)

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Batches | Batch list, detail and form: dates and times, seat count, paid batch with amount and currency, published, self-enrollment, confirmation email template | `lms/frontend/src/pages/Batches/Batches.vue`, `BatchDetail.vue`, `BatchForm.vue`; `lms/lms/lms/doctype/lms_batch/lms_batch.json` |
| Batch enrollment | Member, payment, **source**, confirmation-email-sent flag | `lms/lms/lms/doctype/lms_batch_enrollment/lms_batch_enrollment.json` |
| Live classes | Live class form (date, time, duration, timezone, host, Zoom or Google Meet account, linked calendar event) and attendance modal (joined at, left at, duration per participant) | `lms/frontend/src/pages/Forms/LiveClassForm.vue`; `lms/frontend/src/components/Modals/LiveClassAttendance.vue`; `lms/lms/lms/doctype/lms_live_class/lms_live_class.json`, `lms_live_class_participant/` |

No material: Frappe framework and ERPNext (no event marketing screen), Twenty, Nextcloud
(calendar is groupware, see research-drawers-commons.md), AureusERP, metasfresh, Moqui
components.

**BOSS implications.** Per crosscut §4 events are included in **Commons** (calendar
events) and Marketing (registration, tickets and the event's communication schedule), over
one calendar record (`WorkEffort` type `WetEvent`). Odoo binds those to the event
lifecycle; Dolibarr and Frappe LMS show the smaller shape (registration price, seat cap,
public sign-up, attendee list with invoice or payment, confirmation email). Mantle can
carry this without a separate event store: registrants as `WorkEffortParty` rows (statuses
Offered, Assigned, Arrived, Departed, Declined; `mustRsvp`), ticket products via
`WorkEffortProduct` and orders via `OrderItemWorkEffort`, registration questions as a
`DbForm` on the ticket product (`ProductDbForm` type Sales Required Info) answered in
`OrderItemFormResponse`, and event emails as `WorkEffortCommEvent`. Odoo's lead generation
rules and LMS's enrollment `source` are the attribution hook into Sales.

---

## 8. Surveys, forms & quizzes

### Odoo — surveys, live sessions and certifications

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Surveys | List/kanban/form; Share, See results, Test, Close/Reopen; Create/Open/Close Live Session | `odoo/addons/survey/views/survey_survey_views.xml` |
| Survey types | Survey, Live session, Assessment, Custom | `odoo/addons/survey/models/survey_survey.py` |
| Question/section editor | Inline one2many of sections and questions; add question/section; pagination (per question/section/all), random selection per section, progress display | `odoo/addons/survey/views/survey_survey_views.xml` (`Questions` page) |
| Options | Access (public link vs invited only), login requirement, attempts limit, time limit, free navigation, background image, languages | `odoo/addons/survey/views/survey_survey_views.xml` (`Options` page) |
| Scoring / certification | Scoring with/without answers, required score, certification email template, badge, report layout | `odoo/addons/survey/views/survey_survey_views.xml`; `odoo/addons/survey/views/survey_user_views.xml` |
| Live session | Session code/link, speed rating, session manager, leaderboard and charts | `odoo/addons/survey/views/survey_survey_views.xml`; `odoo/addons/survey/static/src/interactions/survey_session_manage.js`, `survey_session_leaderboard.js`, `survey_session_chart.js` |
| Results | Statistics page: questions/registered/completed/success rate/avg duration/avg score, per-question charts, print | `odoo/addons/survey/views/survey_templates_statistics.xml`; `odoo/addons/survey/static/src/interactions/survey_result.js`, `survey_result_chart.js` |
| Questions & Answers config | Questions, Suggested Values (answer options with score/correct flag), Detailed Answers, Participants | `odoo/addons/survey/views/survey_menus.xml`; `odoo/addons/survey/views/survey_question_views.xml`; `odoo/addons/survey/views/survey_user_views.xml` |
| Participant form | State, attempts, score, email/partner, answers list, resend invitation, print | `odoo/addons/survey/views/survey_user_views.xml` |

### Frappe — Web Form as a survey primitive

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Web Form | Field builder (table of `web_form_field`), route, gating (login, multiple, edit, delete, print, comments), success message/URL | `frappe/website/doctype/web_form/web_form.json`; `web_form_field/` |
| Web Form Request | Submitted responses | `frappe/website/doctype/web_form_request/` |
| CRM Forms | Lead-capture form list + builder | `crm/frontend/src/components/Settings/Forms/FormsList.vue`, `FormBuilderPanel.vue` |
| Frappe LMS quizzes | Quiz list, form and submissions: max attempts, passing percentage, total marks, shuffle, question limit, duration, proctoring, negative marking, scheduling; question types Choices, User Input, Open Ended (a People training use, not a marketing survey) | `lms/frontend/src/pages/Quizzes.vue`, `QuizSubmissions.vue`, `Forms/QuizForm.vue`; `lms/lms/lms/doctype/lms_quiz/lms_quiz.json` |
| Quiz/scoring/live sessions on Web Forms | Not present in the framework or ERPNext | — |

### Nextcloud — full forms app

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Forms list/create | Form title/description, question palette, drag-reorder, sections; question types: short/long text, multiple choice, dropdown, grid, ranking, linear scale, date, file, color | `forms/src/Forms.vue`; `forms/src/views/Create.vue`; `components/Questions/`; `components/AddQuestionMenu.vue` |
| Results | Summary and per-submission views; pagination; export to spreadsheet | `forms/src/views/Results.vue`; `components/Results/ResultsSummary.vue`, `Submission.vue`, `Answer.vue` |
| Submit | Public submission page | `forms/src/views/Submit.vue`; `forms/src/FormsSubmit.vue` |
| Sharing/QR/archive | Share links, QR dialog, archived-forms modal | `forms/src/components/SidebarTabs/SharingSidebarTab.vue`; `components/QRDialog.vue`; `components/ArchivedFormsModal.vue` |
| Admin settings | Restrict creation to groups; confirmation emails; rate limit | `forms/src/FormsSettings.vue` |

### Dolibarr — OpenSurvey

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Surveys | Survey list/home with draft/opened/closed states and expiry | `htdocs/opensurvey/index.php`, `list.php` |
| New survey wizard | Multi-step survey creation (classic vs date-based) | `htdocs/opensurvey/wizard/index.php`, `create_survey.php`, `choix_date.php`, `choix_autre.php` |
| Survey card | Edit/manage a survey; add columns, dates/hour ranges | `htdocs/opensurvey/card.php` |
| Results / export | Result table and CSV export | `htdocs/opensurvey/results.php`, `exportcsv.php` |

No material: Twenty, AureusERP, metasfresh, Moqui components. The Moqui baseline has a
working survey builder over framework `DbForm` (§12).

**BOSS implications.** Surveys are forms with response aggregates, not a separate data
model. Odoo adds scoring, certifications and live sessions; Nextcloud has the best
general-purpose question palette and a clean results summary; Frappe has the strongest
embedding/gating model (login, multiple responses, edit/print). Per crosscut §4 the
builder and its responses are one reused screen set (reused: Marketing, Customer Service
for CSAT, People for scorecards and quizzes). The engine already exists:
`moqui.screen.form.DbForm` (purpose Survey or Other), `DbFormField` (field type, required,
a Groovy display `condition`, layout sequence, print page), `DbFormFieldOption`,
`DbFormUserGroup`, and `FormResponse`/`FormResponseAnswer`, with SimpleScreens screens for
fields, a preview, responses and per-option counts. What it lacks is the public link and
gating (Frappe Web Form options), sections/pages, a response-to-party and
response-to-campaign link (today `FormResponse` holds only `userId`), and scoring and
certification; distribution would go through Comms sends.

---

## 9. Campaign analytics, UTM & attribution

### Odoo — UTM + link tracking + mailing traces + web analytics

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Campaigns / Mediums / Sources | UTM dictionaries; campaign kanban by stage; medium and source lists | `odoo/addons/utm/views/utm_campaign_views.xml`, `utm_medium_views.xml`, `utm_source_views.xml` |
| Campaign Stages / UTM Tags | Stage and tag vocabularies | `odoo/addons/utm/views/utm_stage_views.xml`, `utm_tag_views.xml` |
| Link Tracker | Short link list/form: target URL, title, code, UTM campaign/medium/source/reference, click count, QR download, "Visit Page" | `odoo/addons/link_tracker/views/link_tracker_views.xml` |
| Link Tracker statistics | Click list (link, country, date) and graph; website link builder with charts | `odoo/addons/link_tracker/views/link_tracker_views.xml`; `odoo/addons/website_links/views/website_links_graphs.xml`; `static/src/interactions/website_links_charts.js` |
| Mailing Analysis | Trace report: list/graph/pivot over delivered/opened/clicked/replied/bounced | `odoo/addons/mass_mailing/report/mailing_trace_report_views.xml` |
| Opt-Out Report | Subscription/opt-out analysis | `odoo/addons/mass_mailing/views/mailing_subscription_views.xml` |
| Website Analytics | `backend_dashboard` client action (website analytics: visitors, sales, conversion) | `odoo/addons/website/views/website_views.xml` (`backend_dashboard`, `ir_actions_server_website_analytics`); `odoo/addons/website/static/src/client_actions/website_dashboard/website_dashboard.js` |
| Visitors / Page Views | Visitor list (country, language, visits, page views, last page, connected) and page-view list/graph | `odoo/addons/website/views/website_visitor_views.xml` |
| Campaign attribution | Campaign lead/opportunity count on campaign; campaign field on leads; quotation count and invoiced revenue on campaign | `odoo/addons/crm/views/utm_campaign_views.xml`; `odoo/addons/sale/views/utm_campaign_views.xml` |
| Mailing attribution | Leads/opportunities button on each mailing; Quotations and Invoiced buttons on each mailing | `odoo/addons/mass_mailing_crm/views/mailing_mailing_views.xml`; `odoo/addons/mass_mailing_sale/views/mailing_mailing_views.xml` |
| Lead capture sources | Survey option "generate leads" with sales team and a Leads counter; website contact form creates an opportunity; event lead generation rules (§7) | `odoo/addons/survey_crm/views/survey_survey_views.xml`; `odoo/addons/website_crm/views/website_templates_contactus.xml`; `odoo/addons/event_crm/views/event_lead_rule_views.xml` |
| Event reporting | Attendee graph/pivot/kanban/list | `odoo/addons/event/views/event_registration_views.xml` |
| Survey reporting | Per-survey results statistics | `odoo/addons/survey/views/survey_templates_statistics.xml` |

### Frappe — campaign efficiency and dashboards

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Campaign Efficiency report | Campaign-driven leads/opportunities | `erpnext/crm/report/campaign_efficiency/` |
| Opportunities via Campaigns chart | Dashboard chart | `erpnext/crm/dashboard_chart/opportunities_via_campaigns/opportunities_via_campaigns.json` |
| UTM Campaign / Medium / Source | UTM records | `frappe/website/doctype/utm_campaign/`, `utm_medium/`, `utm_source/` |
| Web Page View + Website Analytics report | One row per page view: path, referrer, browser, unique flag, visitor id, and UTM source, campaign, medium, content; script report with date range and daily/weekly/monthly range | `frappe/website/doctype/web_page_view/web_page_view.json`; `frappe/website/report/website_analytics/` |
| CRM lead source | Lead source dictionary on Frappe CRM leads (no campaign field) | `crm/crm/fcrm/doctype/crm_lead_source/`; `crm/crm/fcrm/doctype/crm_lead/crm_lead.json` |
| Insights workbook/dashboard | Query → chart → dashboard builder | `insights/frontend/src2/workbook/Workbook.vue`, `WorkbookQuery.vue`, `WorkbookDashboard.vue`; `src2/dashboard/DashboardPage.vue`, `DashboardBuilder.vue` |

### Twenty — generic analytics only

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Analytics module | Chart/aggregate hooks and components | `packages/twenty-front/src/modules/analytics/` |
| Dashboards | Widget/grid dashboard pages (graph, table, iframe, rich text widgets) | `packages/twenty-front/src/modules/dashboards/`; `packages/twenty-front/src/modules/page-layout/widgets/` |
| UTM/attribution | Not present | — |

### Dolibarr — send logs and donation stats, no attribution

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Emailing log | Per-recipient send log | `htdocs/comm/mailing/info.php` |
| Donation statistics | Donation stats page | `htdocs/don/stats/index.php` |
| UTM/attribution | Not present | — |

### AureusERP — blog widgets only

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Blog charts/tables | `BlogChart`, `BlogStatusPieChart`, `BlogAuthorsChart`, `CategoriesPieChart`, `TopCategoriesTable`, `RecentBlogsTable`, `StatsOverview` | `plugins/webkul/website/src/Filament/Admin/Widgets/` |
| Analytics plugin | Model/API only; **no Filament screen** | `plugins/webkul/analytics/src/Models/Record.php`; `plugins/webkul/analytics/src/AnalyticServiceProvider.php` |

### metasfresh — campaign as an accounting dimension

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Campaign dimension | `C_Campaign` on fact lines/summaries and financial reports | `backend/de.metas.acct.base/src/main/java-gen/de/metas/acct/model/I_Fact_Acct_Summary.java`; `backend/de.metas.acct.base/src/main/java-legacy/org/compiere/acct/FactLine.java` |
| Attribution UI | Not present | — |

No material: Nextcloud (form results only), Moqui components. The Moqui baseline's
tracking records are in §12.

**BOSS implications.** Odoo is the only reference that closes the loop from campaign →
send → open/click → lead/opportunity → quotation → invoiced revenue. The evidence favors
one campaign identifier carried from Marketing through Sales, Commerce and Accounting
(Odoo's `utm.campaign` is exactly that key). In Mantle that key is `MarketingCampaign`,
already referenced by `ContactList`, `TrackingCode` and `SalesOpportunity`; `TrackingCode`
(redirect URL, campaign, type Access/Internal/External/Partner Managed, trackable and
billable lifetimes) links to web visits (`TrackingCodeVisit` over framework
`moqui.server.Visit`), orders (`TrackingCodeOrder`), returns and opportunities
(`SalesOpportunityTracking`). Per crosscut §4 leads and opportunities are included in
Sales and Marketing, with Marketing's version emphasizing lead sources and campaign
attribution. The cross-app dashboards fit Insights, with widgets placed on Marketing's
landing page. The link tracker (a `TrackingCode` with a redirect) is the shared primitive
for email, content, social posts and QR codes; UTM medium/source/tag vocabularies fit
shared configuration. Multi-touch attribution and funnels are absent from every reference
and look like Insights work rather than Marketing screens.

---

## 10. Configuration & admin

### Odoo — settings, vocabularies and suppression config

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Email Marketing → Settings | Campaign group toggle, split contact names, blacklist buttons, periodic reports, dedicated outgoing mail server | `odoo/addons/mass_mailing/views/res_config_settings_views.xml` |
| Campaign Stages / UTM Tags | Stage and tag vocabularies | `odoo/addons/mass_mailing/views/mailing_menus.xml`; `odoo/addons/utm/views/utm_stage_views.xml`, `utm_tag_views.xml` |
| Link Tracker config entry | Global link tracker | `odoo/addons/mass_mailing/views/mailing_menus.xml`; `odoo/addons/link_tracker/views/link_tracker_views.xml` |
| Blacklisted Email Addresses / Optout Reasons | Suppression list and reason dictionary | `odoo/addons/mass_mailing/views/mail_blacklist_views.xml`, `mailing_subscription_optout_views.xml` |
| SMS config | Blacklisted phone numbers, link tracker | `odoo/addons/mass_mailing_sms/views/mailing_sms_menus.xml` |
| Website config | Settings, Apps, Websites, Menus, Redirects, Themes | `odoo/addons/website/views/res_config_settings_views.xml`; `website_views.xml`; `website_rewrite.xml` |
| Event config | Event Templates, Stages, Mail Schedulers, Tags Categories, Questions | `odoo/addons/event/views/event_menu_views.xml` |
| Survey config | Questions, Suggested Values, Detailed Answers | `odoo/addons/survey/views/survey_menus.xml`; `survey_question_views.xml` |

### Frappe — site, email and UTM configuration

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Website Settings | Home page, theme/brand, top bar, banner/footer, integrations, route redirects, indexing/view-tracking switches | `frappe/website/doctype/website_settings/` |
| Email Account / Email Domain / Email Template / Email Group | Sender and audience configuration | `frappe/email/doctype/email_account/`, `email_domain/`, `email_template/`, `email_group/` |
| UTM Campaign / Medium / Source | UTM configuration records | `frappe/website/doctype/utm_campaign/`, `utm_medium/`, `utm_source/` |
| CRM email settings | Email account list/config/add/edit | `crm/frontend/src/components/Settings/EmailAccountList.vue`, `EmailConfig.vue`, `EmailAdd.vue`, `EmailEdit.vue` |

### Twenty — sending domains, suppression and tracking

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Emailing Domains | Custom sending domain, DNS records, verification, AI setup prompt | `packages/twenty-front/src/modules/settings/emailing-domains/components/SettingsEmailingDomainDnsRecords.tsx`, `SettingsEmailingDomainVerifyButton.tsx`, `SettingsEmailingDomainAiSetup.tsx` |
| Unsubscribers | Suppression list with reason badges and filters | `packages/twenty-front/src/modules/settings/unsubscribers/components/SettingsUnsubscribersList.tsx`, `SettingsUnsubscribePreview.tsx` |
| Unsubscribe Topics | CRUD for unsubscribe topics | `packages/twenty-front/src/modules/settings/unsubscribe-topics/components/SettingsWorkspaceUnsubscribeTopicSection.tsx` |
| Communications settings | Workspace communications/unsubscribe pages | `packages/twenty-front/src/pages/settings/communications/SettingsWorkspaceCommunications.tsx`, `SettingsWorkspaceUnsubscribe.tsx` |
| Tracking switches | Workspace open/click tracking toggles | `packages/twenty-front/src/modules/settings/workspace/components/OpenTrackingSwitch.tsx`, `ClickTrackingSwitch.tsx` |

### Nextcloud — forms admin only

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Forms admin settings | Restrict form creation to groups; allow confirmation emails; rate limit | `forms/src/FormsSettings.vue` |

### Dolibarr — module setup, sender profiles and templates

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Emailing setup | Emailing module options | `htdocs/admin/mailing.php`; `htdocs/admin/mails_emailing.php` |
| Email templates | Shared templates | `htdocs/admin/mails_templates.php` |
| Sender profiles | From-address profiles | `htdocs/admin/mails_senderprofile_list.php` |
| Website setup | Website options | `htdocs/admin/website.php`; `htdocs/admin/website_options.php` |

### AureusERP — website/blog configuration

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Website Configurations cluster | Website settings cluster | `plugins/webkul/website/src/Filament/Admin/Clusters/Configurations.php`; `PluginSettings.php` |
| Manage Contacts | Email/phone/social links | `plugins/webkul/website/src/Filament/Admin/Clusters/Settings/Pages/ManageContacts.php` |
| Blog tags/categories | Configuration resources | `plugins/webkul/blogs/src/Filament/Admin/Clusters/Configurations/Resources/` |

### metasfresh — marketing platform gateway

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Marketing Platform window | Gateway ID, client, organisation, customer number, password, active | `backend/de.metas.adempiere.adempiere/migration/src/main/sql/postgresql/system/10-de.metas.adempiere/5493510_sys_gh4030-marketing-windows-webui.sql` |
| Campaign sync fields | Contacts in campaigns carry platform, external record ID, last sync status/detail and uploaded/downloaded timestamps | `backend/de.metas.marketing/base/src/main/java-gen/de/metas/marketing/base/model/X_MKTG_Campaign_ContactPerson.java`; `backend/de.metas.adempiere.adempiere/migration/src/main/sql/postgresql/system/10-de.metas.adempiere/5493640_sys_gh4030-marketing-campaign-window-webui.sql` |
| CleverReach | Integration module (config + sync) | `backend/de.metas.marketing/cleverreach/` |

No material: Moqui components. Moqui baseline: store email templates per email type
(`ProductStoreEmail` → `moqui.basic.email.EmailTemplate`) in SimpleScreens Product Store
(§12); no marketing settings.

**BOSS implications.** Marketing configuration touches four scopes: sending
infrastructure (accounts, domains, DNS, dedicated server), consent/suppression (topics,
reasons, blacklist), vocabularies (tags, UTM medium/source, contact list types, tracking
code types), and channel templates (email, SMS, landing pages, forms). Per crosscut §4,
the first two are shared **Comms** settings (accounts, sending, unsubscribe, consent)
used by every app that sends; a business running only Marketing needs them, so Marketing
includes those settings screens beside its own vocabularies and campaign templates, and
the Admin settings index links to every app's settings. Where the shared sending
settings are edited is a crosscut §8 question. Sending-domain verification (Twenty) is a
hard requirement for self-hosted installs and sits with the Comms sending settings.

---

## 11. Cross-app surfaces

App lists follow research-crosscut.md §3–§4. Every row is a reused screen or shared
record that Marketing includes for its audience; Comms is a suite used from every app.

| Reused screen or link | Use in Marketing | Other apps that include it | Reference evidence |
| --- | --- | --- | --- |
| **Customer 360** | Engagement tab: campaigns touched, sends with opens/clicks, contact list memberships and segments, survey responses, event registrations, promo codes used, consent and opt-out state (from the shared consent records) | Sales; Customer Service; Accounting; Commerce | Odoo partner marketing fields (`odoo/addons/mass_mailing/views/res_partner_views.xml`); metasfresh consent tab; Twenty unsubscribers list |
| **Contact / party record** | "Add to list" and subscription state on the party | Commons; every app that shows a person or organization; Admin; People | Twenty Add to Message List side panel (`packages/twenty-front/src/modules/side-panel/pages/add-to-message-list/`) |
| **Email/SMS sending, templates, tracking, unsubscribe and consent** (Comms suite) | Campaign sends: content, templates, audience and exclusion preview, schedule, A/B variants, the send's trace list; consent and suppression for the audience | Comms is used from every app; Customer Service (case email); Admin (relay, gateway trust, protocol servers and queues) | Odoo mailings and traces; Twenty composer and audience preview; Dolibarr emailing card |
| **Promotions, coupons, loyalty** | Program screens: programs, rules, codes, redemption; evaluation in the shared price resolver (Products) | Commerce (store binding and checkout); Sales (manual discounts on quotes) | Odoo `loyalty`; ERPNext Promotional Scheme and Coupon Code; SimpleScreens Promotion screens (§12) |
| **Surveys & forms** | Builder, responses, share and gating | Customer Service (CSAT); People (interview scorecards, training quizzes) | Odoo `survey`; Nextcloud Forms; Frappe Web Form; Frappe LMS quizzes; SimpleScreens Survey (§12) |
| **Events & webinars** | Registration, tickets, attendee list, event communication schedule | Commons (calendar events) | Odoo `event`; Dolibarr event organization; Frappe LMS batches and live classes |
| **Leads & opportunities** | Lead sources, campaign attribution, lead-generation rules from events, surveys and web forms | Sales | Odoo `crm`/`sale` campaign counters, `event_crm`, `survey_crm`, `website_crm`; ERPNext Campaign Efficiency; Frappe CRM Forms |
| **Knowledge base / wiki** | Blog posts (`WikiBlog`) and blog categories as a Marketing content screen over the same wiki pages | Commons (wiki authoring); Customer Service (articles) | SimpleScreens Wiki Blogs (§12); Odoo `website_blog` |
| **Calendar & schedules** | Marketing calendar overlay: campaign windows, scheduled sends, events, blog publish dates | Commons; Maintenance; Projects; People | Odoo mailing calendar (`mailing_mailing_view_calendar`) |
| **Chatter & activities** | Chatter on the campaign record (Mantle has `MarketingCampaignNote`; no campaign comm-event join) | Every app's record screens | — |
| **Dashboard widgets** | Marketing landing KPI tiles; campaign performance and web traffic dashboards | Insights; every app's landing page | Frappe Insights; Twenty dashboards; Odoo website dashboard |
| **Per-app settings** | Marketing settings (vocabularies, campaign templates) plus the shared sending and consent settings | Every app (its own settings); Admin (settings index and system settings) | Odoo Email Marketing settings; Twenty emailing domains and unsubscribe topics |

---

## 12. Current Moqui baseline (mr-marble / MarbleERP / Mantle)

There is no Marketing app or menu. MarbleERP (`component/mr-marble/screen/marble.xml`)
mounts the SimpleScreens `ProductStore`, `Survey` and `Wiki` trees, which hold the three
marketing-adjacent pieces that exist today: store promotions and promo codes, the
`DbForm` survey builder, and wiki blog posts. Mantle defines a complete marketing data
model (campaigns, contact lists with opt-in and unsubscribe statuses, market segments,
tracking codes) that **no screen and no service uses**: a search of
`mr-moqui-base` for `MarketingCampaign`, `ContactListParty` and `TrackingCodeVisit`
finds only the entity definitions. SimpleScreens has no campaign, contact list,
segment or tracking-code screens; `MarketSegment` appears only as a drop-down on
product identifications and category identifications.

### Screens

| Screen/page | What it is | Key files |
| --- | --- | --- |
| Find Promotion | New promotion (store, ID, item description, promotion service, from date) and list (store, sequence, description, service, from/thru, delete) | `component/mr-marble/screen/SimpleScreens/ProductStore/Promotion/FindPromotion.xml` |
| Edit Promotion | Store, promotion service (a `ServiceRegister` of type Product Store Promotion), item description, sequence, from/thru, require code, use limits per order / customer / promotion, free ground shipping; parameter form; included/excluded products; order items that used the promotion | `component/mr-marble/screen/SimpleScreens/ProductStore/Promotion/EditPromotion.xml` |
| Promo codes | Find/new code (store, promotion, code, from date) with limits; edit from/thru, use limit per code and per customer, user entered, require party; parties allowed to use the code | `component/mr-marble/screen/SimpleScreens/ProductStore/Promotion/PromoCode/FindPromoCode.xml`, `EditPromoCode.xml` |
| Order promo codes | Add promo code, add party promo code, promo code list on the order | `component/mr-marble/screen/SimpleScreens/Order/OrderDetail.xml` (`AddPromoCode`, `AddPartyPromoCode`, `OrderPromoCodeList`) |
| Store emails | Email template per store and email type with from/thru, header image, detail link, web order BCC | `component/mr-marble/screen/SimpleScreens/ProductStore/FindProductStoreEmails.xml` |
| Find Survey | New survey (purpose Survey/Other, description, comments) and list of `DbForm` records | `component/mr-marble/screen/SimpleScreens/Survey/FindSurvey.xml` |
| Edit Survey | Description, comments; user groups allowed to use the form | `component/mr-marble/screen/SimpleScreens/Survey/EditSurvey.xml` |
| Fields | Add field (title, field name, field type, sequence); edit with a display condition; options per field; survey preview | `component/mr-marble/screen/SimpleScreens/Survey/Fields.xml` |
| Responses, details, stats | Response list (form, user, date), one response's answers, total responses and counts per text field and per option | `component/mr-marble/screen/SimpleScreens/Survey/Responses.xml`, `ResponseDetails.xml`, `ResponseStats.xml` |
| Wiki Blogs | Add blog post (title, publish date, author, summary, small image, wiki space, page, text) and blog list filtered by category and space, with view and public page links | `component/mr-marble/screen/SimpleScreens/Wiki/WikiBlogs.xml` |
| Edit Blog | Title, publish date, author, summary, meta keywords, meta description, image, page; blog categories | `component/mr-marble/screen/SimpleScreens/Wiki/EditWikiBlog.xml` |
| Party emails | `EmailMessage` list for a party | `component/mr-marble/screen/SimpleScreens/Party/PartyEmails.xml` |
| Financial accounts | Find/edit financial accounts, including gift card and gift certificate types | `component/mr-marble/screen/SimpleScreens/Accounting/FinancialAccount.xml` |
| Visits | Web visit list and detail (framework tools) | `base-component/tools/screen/System/Visit/VisitList.xml`, `VisitDetail.xml` |

### Data model available

| Entity / enum | What it gives Marketing | Key files |
| --- | --- | --- |
| `MarketingCampaign` (+ `MarketingCampaignNote`, `MarketingCampaignParty`) | Parent campaign, name, summary, **budgeted / estimated / actual cost** + currency, from/thru and start dates, expected response %, expected revenue, converted leads, number sent; statuses Planned, Approved, In Progress, Completed, Cancelled (`MKTG_CAMP_*`); notes; parties by role over time | `component/mr-mantle/entity/MarketingEntities.xml` |
| `ContactList`, `ContactListParty` | List type (Marketing, Newsletter, Announcement), contact mech type, campaign, public flag, single use, owner, verify-email and opt-out screen settings; members with from/thru, preferred contact mech, `optInVerifyCode` and statuses Pending Acceptance, Accepted, Rejected, In Use, Invalid, Unsubscribe Pending, Unsubscribed (`CLPT_*`) | same |
| `ContactListEmail` | Per list and email type (Subscribe Notification, Unsubscribe Verify, Unsubscribe Notification, Outgoing Email): an `EmailTemplate` and a `WikiPageCategory` — the hook for mailing blog posts in a category to a list | same |
| `ContactListCommStatus` | Per-recipient send record: list, `CommunicationEvent`, contact mech, party, unique `messageId`, status | same |
| `MarketSegment` (+ `MarketSegmentClassification`, `MarketSegmentGeo`, `MarketSegmentDimension`, `MarketSegmentParty`, `MarketInterest`) | Segment tree (type Market or Sales Segment, intra-type sequence, parent, store, owner); rules by party classification, geo and party dimension min/max; explicit members by role; product-category interest. Segments also scope `ProductParameterValue`, `ProductDbForm`, `ProductOtherIdentification`, `ProductCategoryIdent` | same; `component/mr-mantle/entity/ProductDefinitionEntities.xml` |
| `TrackingCode`, `TrackingCodeVisit`, `TrackingCodeOrder`, `TrackingCodeOrderReturn` | Code with redirect URL, campaign, type (Access, Internal, External, Partner Managed), trackable and billable lifetimes, group/subgroup; visits by source (cookie, URL parameter) over `moqui.server.Visit`; orders and returns with billable flag and affiliate referred time | `component/mr-mantle/entity/MarketingEntities.xml`; `base-component/framework/entity/ServerEntities.xml` (`Visit`, `Visitor`) |
| `SalesOpportunity.marketingCampaignId`, `SalesOpportunityTracking` | Campaign and tracking code on opportunities (record included in Sales and Marketing) | `component/mr-mantle/entity/SalesEntities.xml` |
| `CommunicationEvent.contactListId`, `PartyContactMech.allowSolicitation` | List on a message; a per-contact-mech solicitation flag — the only consent data outside list membership | `component/mr-mantle/entity/PartyEntities.xml` |
| `ProductStorePromotion` (+ `ProductStorePromoParameter`, `ProductStorePromoProduct`), `ProductStorePromoCode` (+ `ProductStorePromoCodeParty`) | Store-scoped promotion implemented by a registered service, with parameters, products (include/exclude), window, require code, use limits, free ground shipping; codes with window, limits, user-entered and require-party flags; registered services New Customer Discount, Buy X Get Y, Flat Discount | `component/mr-mantle/entity/ProductStoreEntities.xml`; `component/mr-mantle/data/MantleSetupData.xml` |
| `OrderPromoCode`; `OrderItem` promo fields; `OrderPart.disablePromotions` | Codes on an order; promo items carry `storePromotionId`, `promoCodeId`, `promoCodeText`, times used | `component/mr-mantle/entity/OrderEntities.xml` |
| `FinancialAccount` types `GiftCard`, `GiftCertificate`; `GiftCard` payment method | Stored-value balances for gift cards | `component/mr-mantle/entity/AccountingAccountEntities.xml` |
| `moqui.screen.form.DbForm` (+ `DbFormField`, `DbFormFieldOption`, `DbFormUserGroup`), `FormResponse`, `FormResponseAnswer` | Form builder: purpose (Survey, Other), fields with type, required, display condition, sequence, print layout; options; allowed groups; responses with `userId` and date, answers as text | `base-component/framework/entity/ScreenEntities.xml` |
| `ProductDbForm`, `OrderItemFormResponse` | Forms attached to a product (Sales Required Info, Sales Optional Info, Post Sale Survey; by role or segment) and answered per order item and party | `component/mr-mantle/entity/ProductDefinitionEntities.xml`, `OrderEntities.xml` |
| `moqui.resource.wiki.WikiBlog`, `WikiBlogCategory` | Blog post over a `WikiPage`: title, author, summary, publish date, meta keywords and description, small image; categories with a sent date | `base-component/framework/entity/ResourceEntities.xml` |
| `moqui.basic.email.EmailTemplate`, `EmailMessage` | Template: server, type, from/reply-to/bounce/cc/bcc, subject, body screen location, attachments; message statuses Draft, Ready, Sent, Received, Viewed, Bounced, Cancelled | `base-component/framework/entity/BasicEntities.xml` |
| `WorkEffort` (`WetEvent`), `WorkEffortParty`, `WorkEffortProduct`, `WorkEffortCommEvent`, `OrderItemWorkEffort` | Event, registrant (statuses Offered, Assigned, Arrived, Departed, Declined; `mustRsvp`), ticket product, event messages, ticket orders | `component/mr-mantle/entity/WorkEffortEntities.xml`, `OrderEntities.xml` |

### Services

| Service | Purpose | Key files |
| --- | --- | --- |
| `mantle.product.PromotionServices.apply#OrderPromotions`, `add#OrderPromoCode`, `remove#OrderPromoCode`; interface `apply#Promotion` with `apply#NewCustomerDiscount`, `apply#BuyGetDiscount`, `apply#FlatDiscount` | Promotion evaluation on orders and promo code entry | `component/mr-mantle/service/mantle/product/PromotionServices.xml` |
| `org.moqui.impl.ScreenServices.create#FormResponse`, `get#FormResponse`, `update#FormResponse`, `delete#FormResponse`, `get#FormResponseStats`, `update#DbFormField`, `delete#DbFormField` | Survey responses, stats and field maintenance | `base-component/framework/service/org/moqui/impl/ScreenServices.xml` |
| `org.moqui.impl.WikiServices.create#WikiBlog`, `update#WikiBlog` | Blog post create/update | `base-component/framework/service/org/moqui/impl/WikiServices.xml` |
| `org.moqui.impl.EmailServices.send#EmailTemplate`, `send#EmailMessage`, `poll#EmailServer` (Rust implementations) | Template send and mail polling — the Comms transport Marketing sends go through | `base-component/framework/service/org/moqui/impl/EmailServices.xml` |
| `send#OrderStoreEmail`, `send#InvoiceStoreEmail`, `send#ShipmentStoreEmail` | Transactional store emails (not marketing) | `component/mr-mantle/service/mantle/order/OrderInfoServices.xml`; `component/mr-mantle/service/mantle/account/InvoiceServices.xml`; `component/mr-mantle/service/mantle/shipment/ShipmentServices.xml` |

**Missing services:** nothing creates or progresses a `MarketingCampaign`; no
subscribe, verify, unsubscribe or import for `ContactList`; no segment membership
evaluation for `MarketSegment` rules; no tracking-code capture into `TrackingCodeVisit`
or `TrackingCodeOrder`; no campaign send that writes `ContactListCommStatus`; no
promotion-to-campaign link; no public survey page or anonymous response.

---

## 13. Gaps & BOSS implications

### Gaps in the reference set

| Area | Gap | Evidence |
| --- | --- | --- |
| Marketing home | No source has a marketing dashboard combining calendar + KPIs; Odoo has separate hubs | Odoo menu roots; Twenty/Nextcloud dashboards are generic |
| Campaign budgets | No budget/cost fields on campaigns or sends in the Odoo, Frappe, Twenty or Dolibarr UIs; Ever Gauzy has a spend/usage ceiling on promotion campaigns, backend only | grep for `budget` / `cost` in `odoo/addons/utm/models/`, `odoo/addons/mass_mailing/models/`, `odoo/addons/marketing_card/models/`; `erpnext/crm/doctype/campaign/campaign.json`; `packages/plugins/promotion/src/lib/promotion.types.ts` |
| Marketing automation | Odoo's `marketing_automation` is absent (docs only); Frappe CRM and Twenty offer generic workflow builders, not marketing drip templates; ERPNext has only fixed-delay Campaign Email Schedule rows | `documentation/content/applications/marketing/marketing_automation/`; `crm/frontend/src/components/Settings/WorkflowAutomations/`; `packages/twenty-front/src/modules/workflow/` |
| A/B testing | Only Odoo (sample %, winner criterion, winner send) | `odoo/addons/mass_mailing/models/mailing.py`; `odoo/addons/mass_mailing/models/utm_campaign.py` |
| Segment builder | Only Odoo (static lists + saved dynamic domains); Dolibarr has named advanced filters per emailing | `odoo/addons/mass_mailing/views/mailing_filter_views.xml`; `htdocs/comm/mailing/advtargetemailing.php` |
| Consent ledger | No source has a per-channel, per-purpose consent entity on the party; metasfresh is closest (consent declared/revoked), Odoo uses opt-out reasons + blacklist, Twenty suppression reasons + topics | §3 tables |
| Deliverability / bounces | No bounce processing or reputation UI beyond traces/queues/logs; Twenty checks DMARC for the sending domain | Odoo traces, Frappe queue, Dolibarr log; `packages/twenty-server/src/engine/core-modules/emailing-domain/services/dmarc-record.service.ts` |
| Social publishing/scheduling | Absent everywhere; Odoo community only stores social URLs and renders share cards | `odoo/addons/social_media/views/res_company_views.xml`; `odoo/addons/marketing_card/` |
| Referral programs | Absent everywhere; Dolibarr partnerships check partner backlinks but give no reward | `htdocs/partnership/` |
| Multi-touch attribution / funnels | Absent; Odoo ties campaigns and mailings to leads/quotes/revenue, ERPNext has a report, Frappe framework logs UTM on page views, others nothing | §9 |
| Event marketing | Full only in Odoo (tickets, questions, communication schedules, registration desk, booths, tracks, lead rules); Dolibarr event organization and Frappe LMS batches/live classes cover registration, price, seats and attendance | `odoo/addons/event/`; `htdocs/eventorganization/`; `lms/lms/lms/doctype/lms_live_class/` |
| SMS marketing | Only Odoo (full) and Dolibarr (`smsing` target in mailing) | `odoo/addons/mass_mailing_sms/`; `htdocs/comm/mailing/index.php` |
| Email templates | Twenty has no template library (duplicate a campaign instead); Dolibarr/Frappe/Odoo do | §4 |
| Blog/CMS | Frappe checkout has web pages and web forms but **no blog doctype**; Twenty/metasfresh have no CMS | `frappe/website/doctype/` |
| Survey scoring/certification | Only Odoo for surveys (Frappe LMS scores quizzes); Nextcloud/Frappe Web Form/Dolibarr are forms only | `odoo/addons/survey/`; `lms/lms/lms/doctype/lms_quiz/` |
| Campaign stages | Only Odoo has configurable campaign stages (UTM stages); ERPNext uses fixed Email Campaign statuses, others per-record status | `odoo/addons/utm/views/utm_stage_views.xml`; `erpnext/crm/doctype/email_campaign/email_campaign.json` |

**Verified absence by source.**

| Source | Verified absence | Evidence |
| --- | --- | --- |
| **Zimbra** | No marketing/campaign/newsletter screens; mail, calendar, admin console only | `3p_other/Zimbra/zm-web-client/`, `zm-admin-console/` |
| **Carbon** | No marketing/campaign/newsletter screens | `apps/erp/app/modules/` (no marketing module) |
| **Ever Gauzy** | No marketing/campaign/newsletter screens; the `promotion` plugin (campaigns with budgets, promotions, coupons, gift cards) is backend only | `packages/plugins/promotion/`; no `promotion-ui` plugin |
| **Akaunting** | No marketing modules | `modules/` is empty |
| **Moqui components** | No marketing management screens; public sites are hand-built content; ridgecrest delegates newsletters to Mailchimp/ConvertKit | `3p_moqui/coarchy/screen/`, `3p_moqui/resistmanagement/screen/`, `3p_moqui/ridgecrest/service/ridgecrest/MarketingServices.xml` |
| **Nextcloud** | No campaigns/newsletters/automation; Mail is a client; Forms/Collectives only | `mail/src/`, `forms/src/`, `collectives/src/` |
| **AureusERP** | No campaigns, email/newsletter, loyalty, coupons or surveys; analytics plugin has no UI | `plugins/webkul/` |
| **metasfresh** | No in-app email designer/newsletter workspace or attribution UI | `backend/de.metas.marketing/`; `frontend/src/components/` |
| **Odoo** | No marketing automation module, no social publishing, no campaign budgets, no referrals | addon listing; `odoo/addons/social_media/`; grep in marketing models |
| **Frappe** | No Newsletter doctype, no blog doctype, no campaign UI in the CRM SPA | `frappe/email/doctype/`; `frappe/website/doctype/`; `crm/frontend/src/pages/` |
| **Twenty** | No bespoke marketing home, no segment builder, no template library, no UTM/attribution | `packages/twenty-front/src/modules/side-panel/pages/send-campaign/`; `packages/twenty-front/src/modules/` (no marketing module) |
| **Dolibarr** | No campaign stages/automation/A-B, no coupons/gift cards/loyalty, no click tracking | `htdocs/comm/mailing/`; `htdocs/core/modules/` |

### Notable gaps in the Moqui baseline

- **No Marketing app or campaign screens.** `MarketingCampaign`, `ContactList`,
  `MarketSegment` and `TrackingCode` have no screens and no services; the campaign, list,
  segment and tracking-code screens and the services behind them are all missing.
- **No list subscription flow.** `ContactListParty` statuses, `optInVerifyCode` and the
  `ContactListEmail` templates (subscribe notification, unsubscribe verify) are modelled
  but nothing sends the verify email, accepts the code or processes an unsubscribe.
- **No campaign send.** Nothing turns a list or segment into `CommunicationEvent` /
  `EmailMessage` rows with `ContactListCommStatus`; no A/B variants; no open/click
  capture beyond the `EmailMessage` Viewed status.
- **No consent ledger.** Only `PartyContactMech.allowSolicitation` and list membership
  status; a per-channel, per-purpose consent record (shared, Comms suite) would be new.
- **No segment evaluation.** `MarketSegment` rules exist but no service computes
  membership, and there is no saved-query segment kind (Odoo dynamic list).
- **No tracking capture.** `TrackingCode` and `TrackingCodeVisit` exist but no request
  filter writes them and no redirect endpoint serves `redirectUrl`.
- **Promotions are store screens only.** Promotion and promo code screens sit under
  Product Store; no program list across stores, no promotion-to-campaign link, no code
  batch generation, no redemption history screen beyond order items on Edit Promotion,
  no loyalty points.
- **Survey builder is internal.** `DbForm` surveys have no public link, no sections, no
  scoring, and `FormResponse` records only `userId` (no party, campaign or source).
- **Blog has no publish workflow.** `WikiBlog` has a publish date and SEO fields but no
  scheduled publish or status, and `WikiBlogCategory.sentDate` is not set by any
  service.

### What each reference contributes

| Reference | Take |
| --- | --- |
| **Odoo** | Campaign as container (`utm.campaign`) separate from sends; campaign and mailing counters for leads, quotations and invoiced revenue; A/B testing; static + dynamic lists; trace statuses; template library, builder and themes; loyalty program model; surveys with scoring and live sessions; full event management with lead rules; link tracker |
| **ERPNext** | Fixed-delay drip (Campaign Email Schedule); Email Campaign status set; Campaign Efficiency report; loyalty points ledger and promotional schemes |
| **Frappe framework** | Email Group with confirmation and welcome templates; Web Form gating options; UTM fields on Web Page View with a Website Analytics report |
| **Frappe CRM / Insights / LMS** | Lead-capture form builder; lead source dictionary; Insights dashboards; LMS coupons, paid batches with seat count and enrollment source, live-class attendance |
| **Twenty** | Audience preview with exclusion buckets; unsubscribe topics and reasons; login-free unsubscribe tokens and `List-Unsubscribe` headers; sending-domain DNS and DMARC checks; campaign delivery counters |
| **Nextcloud** | Forms question palette, results summary, share link/QR, confirmation emails |
| **Dolibarr** | Signed read pixel and unsubscribe link; event organization with public attendee registration; OpenSurvey date polls; partnerships with backlink checks |
| **AureusERP** | Blog post form with SEO fields; website blog widgets |
| **metasfresh** | Explicit consent record (declared/revoked); campaign as an accounting dimension; external platform sync |
| **Ever Gauzy** | Promotion data model: budget ceilings, reserve-then-register usage ledger, gift-card ledger, "every exclusion is reported" |
| **Moqui components** | ridgecrest customer mailing-list page and external provider sync (the shape BOSS replaces with `ContactList`) |
| **Moqui baseline** | `MarketingCampaign` with budgets and approval flow; `ContactList` with opt-in statuses; `MarketSegment` rules; `TrackingCode` attribution chain; store promotions and promo codes with screens and services; `DbForm` survey builder with screens; `WikiBlog` with screens; `EmailTemplate` and `EmailMessage` |

**Notables.**

- **One campaign key across the suite.** Odoo's `utm.campaign` is referenced by mailings,
  SMS, link trackers, leads and sales orders. In BOSS that key is `MarketingCampaign`;
  every touch (email, SMS, content, event, coupon) could carry it or a `TrackingCode`
  that points to it.
- **Send records are separate from campaign records.** Odoo models one campaign with many
  mailings; ERPNext one campaign with many campaign-email schedules; Twenty one campaign
  with many messages/recipients. The references agree on this grain for A/B variants,
  retries and per-touch analytics.
- **Audience preview before send.** Twenty's `CampaignAudiencePreviewDTO` returns
  sendable plus missing-email, duplicate, hard-suppressed, globally-unsubscribed,
  topic-unsubscribed and tracking-refused counts. No other reference exposes exclusions
  this clearly; it is the strongest candidate contract for a send confirmation.
- **Receiver-side consent is first-class.** Odoo (opt-out reasons + feedback + portal),
  Twenty (unsubscribe topics + suppression reasons) and metasfresh (consent records) all
  treat unsubscribe/preference management as first-class; per crosscut §4 the consent
  records are shared through the Comms suite, used from every app that sends, rather than
  a marketing-only table.
- **Promotions are pricing, not campaigns.** Odoo's loyalty program is independent of
  `utm.campaign`; Frappe's promotional schemes and Dolibarr's price rules likewise live
  in pricing. In BOSS terms the program screens are reused (Marketing, Commerce, Sales)
  and evaluation stays in the price resolver.
- **Self-hosted sending needs domain verification.** Twenty is the only reference with a
  first-class sending-domain/DNS verification UI; it matters for Comms because many
  target businesses self-host.
- **No source builds "marketing" as one app.** Odoo splits it across several apps, Frappe
  across Desk/CRM/LMS, Dolibarr across independent modules, and metasfresh delegates
  sending to CleverReach. This suggests IronStone Marketing as a stand-alone app composed
  of reused screens over shared Commons, Comms and Sales records plus the Mantle
  marketing entities, rather than a new monolith.

### Candidate screen inventory (IronStone Marketing)

| Area | Screens |
| --- | --- |
| Landing page | Marketing calendar (campaign windows, scheduled sends, events, blog publish dates; **Calendar & schedules** (reused: Commons, Maintenance, Projects, People)); KPI tiles (list growth, sends, open/click, attributed opportunities and revenue) **(reused: Insights, every app's landing page)**; needs-attention list (campaigns awaiting approval, failed sends, A/B winners to review, promotions expiring) |
| Campaigns | Campaign list (status, dates, budget vs actual); campaign detail with tabs: summary and budget, lists and segments, sends, tracking codes, promotions, events, results; approval actions on the `MKTG_CAMP_*` flow |
| Audiences | Contact lists (members, status, import, merge); list member detail; segments (rule editor over classification, geo, dimension; explicit members; saved-query segments); audience preview with exclusion counts; consent and suppression **(reused: Comms suite, Customer Service, Admin)** |
| Campaign sends (reused: Comms suite, Customer Service, Admin) | Template library; composer with variables, preview and test; send/schedule dialog with audience preview; A/B setup; send trace list |
| Promotions (reused: Commerce, Sales) | Program list across stores; program detail (rules, parameters, products, limits, window); promo codes (single and batch, party-restricted); redemption history; store binding (the Commerce version's emphasis) |
| Content | Blog posts and categories over `WikiBlog` (over the wiki pages whose authoring screen Commons and Customer Service include); landing pages and web forms **(reused: Commerce)**; tracking links with QR |
| Events (reused: Commons) | Registration setup on the calendar event: ticket products, registration form, seats; attendee list with check-in; event email schedule |
| Leads (reused: Sales) | Lead list with source and campaign; lead-generation rules from events, surveys and web forms |
| Surveys & forms (reused: Customer Service, People) | Form/survey builder (fields, options, conditions, sections); share and gating; responses and summary; scoring |
| Analytics | Campaign performance; tracking-code clicks and visits; attributed opportunities, orders and revenue **(reused: Insights)** |
| Customer 360 engagement tab | **(reused: Sales, Customer Service, Accounting, Commerce)** campaigns, sends, opens/clicks, lists, segments, responses, registrations, promo codes, consent |
| Settings | Contact list types, tracking code types, UTM medium/source, tags, campaign templates; sending and consent settings **(reused: Comms suite, Admin)**; listed in the Admin settings index |

### Data-model findings

- **Fit as is:** `MarketingCampaign` (+ `MarketingCampaignNote`,
  `MarketingCampaignParty`), `ContactList`, `ContactListParty`, `ContactListEmail`, `ContactListCommStatus`,
  `MarketSegment` and its rule entities, `TrackingCode`, `TrackingCodeVisit`,
  `TrackingCodeOrder`, `TrackingCodeOrderReturn`, `SalesOpportunityTracking`;
  `ProductStorePromotion`, `ProductStorePromoParameter`, `ProductStorePromoProduct`,
  `ProductStorePromoCode`, `ProductStorePromoCodeParty`, `OrderPromoCode`; framework
  `DbForm`/`FormResponse`, `WikiBlog`/`WikiBlogCategory`, `EmailTemplate`/`EmailMessage`;
  `CommunicationEvent`; `WorkEffort` (`WetEvent`) with `WorkEffortParty`,
  `WorkEffortProduct`, `OrderItemWorkEffort`; `ProductDbForm`, `OrderItemFormResponse`.
- **Campaign on more records:** no campaign link exists on `ProductStorePromotion`,
  `CommunicationEvent` sends (today only via `ContactList`), events or forms; options
  are a field or a join entity, so attribution would not depend on tracking codes alone.
- **Send record:** nothing sits between `MarketingCampaign` and the per-recipient
  `ContactListCommStatus`; a candidate is a campaign send (one per mailing, with A/B
  variant, schedule, status and counters). Click events per recipient and link are also
  missing.
- **Consent (shared, Comms suite):** a candidate per-party, per-channel, per-purpose
  consent record with source, declared and revoked dates, plus suppression reasons and
  topics; `allowSolicitation` and `ContactListParty` status would remain inputs.
- **Saved-query segments:** missing; one option is a segment kind that stores a find
  (entity, conditions) next to the rule-based `MarketSegment` kind.
- **Forms:** `FormResponse` lacks party, campaign and source (options: fields or a
  join); sections, a public share token and score fields are also missing.
- **Blog:** `WikiBlog` lacks a status or scheduled-publish flag.
- **Loyalty:** a points ledger would be new (ERPNext Loyalty Point Entry, Ever Gauzy
  usage ledger as models); gift cards fit `FinancialAccount`.

### Sequencing notes

- **Cheap from the baseline:** promotion program and promo code screens (SimpleScreens
  Promotion), the survey builder (SimpleScreens Survey), blog posts over `WikiBlog`
  (Wiki Blogs, Edit Blog), and template sends through `EmailTemplate` and
  `send#EmailTemplate`. Campaigns (budget vs actual, approval flow) and contact lists
  (double opt-in statuses) have complete Mantle records but no screens or services.
- **Needs services first:** list subscribe, verify and unsubscribe (the `ContactListEmail`
  templates are modelled, nothing sends them); a campaign send that writes
  `ContactListCommStatus`; tracking capture (request filter, redirect endpoint), which
  campaign attribution on opportunities and orders depends on; segment evaluation, which
  rule-based segments depend on.
- **Needs new records first:** A/B testing and per-send counters depend on the send
  record; consent re-check at dispatch beyond list status depends on the consent record;
  promotion attribution depends on a campaign link on promotions; public survey
  attribution depends on the `FormResponse` links; scheduled blog publish depends on a
  `WikiBlog` status; loyalty points depend on a points ledger.
- **Depends on other suites or apps:** unsubscribe and consent depend on the Comms send
  path; SMS campaigns on Comms SMS sending; event ticketing on Commons calendar events
  plus ticket products and orders (`WorkEffortProduct`, `OrderItemWorkEffort`);
  landing pages on a page model shared with Commerce; dashboards beyond tracking-code
  visits on Insights; drip steps on scheduled jobs.
- **No baseline or reference basis:** survey scoring, certification and live sessions
  (Odoo only); referral programs and social publishing (absent everywhere).

### Open questions

- **Template library.** Crosscut §4 lists Comms (accounts, sending, tracking,
  unsubscribe) and Marketing (campaign sends) for sending. Is there one reused template
  library, with campaign and transactional templates as kinds, or are campaign templates
  a separate set? Where are shared templates edited (crosscut §8, "Where reused
  configuration is kept")?
- **Campaign send record.** Is the send a new entity, or a `CommunicationEvent` with a
  parent/child structure (one parent per mailing, one child per recipient) plus
  `ContactListCommStatus`?
- **Promotion scope.** Mantle promotions are per store (`productStoreId`). Do
  Marketing programs need to span stores and sales channels (including quotes), with
  Commerce binding each to stores, as crosscut §4 implies?
- **Event registration record.** `WorkEffortParty` statuses (Offered/Assigned/Arrived)
  were designed for assignments; is that enough for registrations, or do events need a
  registration entity with ticket, answers and payment?
- **Blog screens.** Blog posts are wiki pages; this file has Marketing include blog
  screens over them, with the wiki authoring screen included in Commons and Customer
  Service (initial-design lists blogs under Marketing Content; crosscut §8 describes
  Marketing screens over Commons wiki pages). Does the Marketing blog editor reuse the
  wiki page editor, or is it a separate screen over the same records?

### Checkout path quirks

- metasfresh window definitions are SQL migrations deep under
  `backend/<module>/src/main/sql/postgresql/system/<nn>-<module>/`; the campaign price
  migration is in `de.metas.fresh/de.metas.fresh.base`, not `de.metas.marketing`.
- AureusERP's analytics provider is `AnalyticServiceProvider.php` (no "s").
- coarchy.com page screens are under `screen/coarchy-com/c/`, not the site root.
- Twenty's message-campaign code is spread across `side-panel/pages/send-campaign/`,
  `activities/emails/`, `command-menu-item/…/message-campaign/` and the server
  `emailing-domain` module; there is no message-campaign module directory in
  `twenty-front` (3p-app-reference.md cites one).

**Bottom line.** The Moqui baseline already has most of the marketing data model and
three working screen groups (promotions, surveys, blog); what it lacks is the Marketing
app itself — campaign, list, segment and tracking screens, the services that run
subscriptions, sends and tracking, and the shared consent ledger (Comms suite). The
evidence points to IronStone Marketing as screens and services over those Mantle
records, with the SimpleScreens promotion, survey and blog screens as a starting point,
and sending, consent, events, leads and dashboards as reused screens over shared records
that Marketing includes for its audience.
