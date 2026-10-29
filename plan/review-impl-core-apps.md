# IronStone BOSS — Core-app implementation plan review

Oct 28, 2026 — review findings, before fixes

This reviews the six core-app implementation plans, written Oct 28 and built in this order: [Products](impl-products.md) (being built), [Accounting](impl-accounting.md), [Warehouse](impl-warehouse.md), [Manufacturing](impl-manufacturing.md), [Purchasing](impl-purchasing.md) and [Customer Service](impl-customer-service.md). Each plan was checked against:
- active Moqui code: mr-mantle, mr-marble, the framework, mr-boss as built, mr-pass, and Moqui Java's mantle-usl, SimpleScreens and MarbleERP for features not yet ported;
- the reference apps its `research-*.md` points to, in `3p_other/`;
- the other five plans;
- the shared rules of [impl-drawers-commons.md](impl-drawers-commons.md) §4.

The designs were reviewed in [review-core-apps.md](review-core-apps.md). This review covers the plans: whether each phase can be built as written, whether the plans agree with each other and with the code already built, and what small changes would save work.

**How it was done.**
- A script checked links, citations, screen names, name resolution, headers and the F# resolutions, and built an index of the 607 cross-plan citations (§7).
- One reviewer per plan then checked:
  - its claims against the code;
  - its key flows against two or three reference apps;
  - phase quality and order;
  - the shared rules;
  - easy wins.
- Two more reviewers read across the plans: one for the contracts between them (who builds what, for whom, and when, with a matrix of about 110 rows), and one for the conventions.
- Three verifiers then tried to refute every blocker and major. They refuted none, downgraded 12, corrected 6 more and merged 9 duplicates (§8).
- Twelve minors and easy wins were re-checked by hand, and all held.

For Products, the decision was to review only the unbuilt phases (P9–P14), plus the contracts the later plans rely on, checked against what P1–P8 actually built. Nothing here edits impl-products.md.

**How to read it.**
- §1: counts.
- §2: the patterns behind most findings.
- §3: the decisions that are yours, each with a recommendation.
- §4: every blocker and major, one line each.
- §5: the easy wins.
- §6: a verdict on each plan.
- §7: the mechanical checks.
- §8: downgrades and duplicates.
- Every finding, with evidence (`path:line`), proposed fix and size, is in the per-plan files: [products](review-impl-core-apps/products.md), [accounting](review-impl-core-apps/accounting.md), [warehouse](review-impl-core-apps/warehouse.md), [manufacturing](review-impl-core-apps/manufacturing.md), [purchasing](review-impl-core-apps/purchasing.md), [customer-service](review-impl-core-apps/customer-service.md) and [crosscut](review-impl-core-apps/crosscut.md). The crosscut file holds the cross-plan findings (`I-XC-*`) and the contract matrix. Each file ends with the verifiers' notes on its blockers and majors.

**What happens next.**
- You strike the findings you don't want, and answer §3.
- The fix pass applies the rest:
  - One editor per plan, for Accounting, Warehouse, Manufacturing, Purchasing and Customer Service, each editing only its own plan and the sections of its own design that a finding changes.
  - Then one editor for the shared files: design-crosscut, impl-drawers-commons §4 and the inventories.
  - The mechanical script runs again.
- Products findings go to the build session as a list. **P9 (standard costs) is in progress in the working trees now.** I-PRD-05 (revaluation), I-PRD-06 (roll-up rules), I-PRD-03 (explosion depth), I-PRD-07 (intercompany `standardCost`) and I-PRD-02 (Mantle checking BOSS group names) all bear on the code being written, so they are worth handing over before P9 is committed.


## 1. Counts

After verification. Duplicates are counted once, under the finding kept.

| File | Blocker | Major | Minor | Nit | Total |
| --- | --- | --- | --- | --- | --- |
| Products (P9–P14 and as built) | 0 | 6 | 16 | 2 | 24 |
| Accounting | 0 | 7 | 20 | 3 | 30 |
| Warehouse | 1 | 1 | 17 | 1 | 20 |
| Manufacturing | 0 | 5 | 19 | 2 | 26 |
| Purchasing | 1 | 4 | 14 | 1 | 20 |
| Customer Service | 0 | 4 | 17 | 8 | 29 |
| Crosscut: contracts and conventions | 0 | 5 | 27 | 13 | 45 |
| **All** | **2** | **32** | **130** | **30** | **194** |

The reviewers listed 120 IDs as easy wins: S-sized, low-risk changes that should go in now (§5). Verification refuted nothing.


## 2. What the findings have in common

Research coverage and plan structure are good. Every link and every one of the 607 cross-plan citations resolves, and every F# has a resolution. Most findings come from these sources:

1. **The later plans are behind the code.** Products moved fast, and the other five plans were written against the plan, not the commits.
   - The org-filter commit `f4c1781` removed BossSetupData's commented "not yet implemented" block. Every app root and `BOSS_<APP>_ADMIN` group is now live, but all five later plans still say their P1 takes the authz "out of the commented block" (I-XC-58, with the per-plan edits I-ACC-09, I-WH-10, I-MFG-26, I-PUR-08 and I-CS-05).
   - Products P7 and P8 built several things that later plans still call new: `abcClassEnumId`/`AbcClass`, `maximumStock`, `reorderMethodEnumId`, `resolve#WarehousePolicy`, `expiryBlock`, `find#Routings`, `store#WorkCenterRate`, and WorkCenter's calendar, efficiency and OEE fields (I-XC-10, I-PRD-10, I-WH-11, I-MFG-08, I-PUR-21).
   - impl-products' own log says "P4 next", with P4–P8 committed (I-PRD-08).
2. **Mantle automation the plans touch but don't fully pin down.** Both blockers and most Accounting and Warehouse majors come from here. The design review found the SECAs; this one found what they do in the corners:
   - `orderRevision` moves on every note, file, party and status change, but not on a price or quantity change (I-PUR-01).
   - The pack invoice locks `AssetIssuance.invoiceId` (I-WH-01).
   - `unpost#AcctgTrans` and two live SECAs delete posted entries in a locked period (I-ACC-01).
   - Reversals keep the original date (I-ACC-02).
   - The return-receipt SECAs stay active under D11's flag (I-XC-05).
   - An issue update reposts and merges its quantities (I-WH-04).
   - `close#FinancialTimePeriod` is force-new (I-ACC-06).
3. **The Mantle/BOSS boundary is stated three ways.**
   - Products' committed Mantle policy scripts check BOSS group names (I-PRD-02).
   - Three Mantle services that Warehouse plans call `ironstone.*` services (I-XC-06).
   - Accounting's rule says Mantle "never names BOSS", and Customer Service's says it "never calls BOSS".

   One rule is needed (§3, Q2).
4. **The shared-screen seam isn't built yet.** Products' shared screens take `appRoot` from every root, but:
   - three services refuse any context but Products;
   - Product360's read needs the Products launcher group;
   - eleven links are hard-coded to `//Products/...`;
   - the Connections tab is gated on other apps' groups.

   Five plans assume adding their context is "an addition, not a rewrite" (I-PRD-01, I-MFG-01).
5. **Demo data and flags collide.** Accounting turns the Mantle rule flags on for "BOSS's demo organization". Every later walk, and Mantle's own flow specs, run on `ORG_ZIZI_RETAIL`, which inherits its preferences from `ORG_ZIZI_CORP` (I-XC-03). No released method or approved estimate exists as demo data, and a release can't be seeded as XML, because its values are read back from the audit log (I-PRD-04).
6. **Contracts needed before their builder.**
   - RequestDetail's Items tab is needed by Warehouse P15 but built in Purchasing P10 (I-XC-07).
   - `BOSS_PURCHASING_BUYER` is checked in Accounting P6 but seeded in Manufacturing P14 (I-XC-04).
   - The service-acceptance match rule has three conditional owners and no definite one (I-XC-08).
   - Warehouse's subcontract dispatch needs runs a later phase builds (I-WH-09).
7. **Policies stored but never enforced.**
   - Warehouse's over-receipt and over-shipment tolerances (I-WH-06).
   - Manufacturing's over-consumption tolerance (I-MFG-03).
   - The negative-stock rule for production issues (I-WH-05).
   - The provisional-cost mark (I-MFG-06).

   All three reference ERPs enforce the first two.
8. **Cost flows with a missing step.**
   - Revaluation that doesn't change the cost later moves use (I-PRD-05).
   - By-products valued at the main product's standard (I-MFG-04).
   - A cancelled run's WIP left with nowhere to go (I-MFG-05).
   - The outside-processing accrual never cleared (I-MFG-07).
   - No drop-ship COGS or PO completion (I-PUR-05).
   - The issuance repost valued at current cost (I-ACC-04).
9. **Six copies of the shared rules have drifted.**
   - The Done rule names different specs in each plan.
   - TuiRender's root list covers four apps, so four plans' terminal twins are never rendered in a test (I-XC-50).
   - The flag rule is read three ways (I-XC-56).
   - impl-drawers-commons §4 still names the removed `gallery-shots.mjs` (I-XC-53).
   - §4 says `OrderHeader.orderRevision` is audit-logged, and it isn't (I-XC-52).


## 3. Decisions for you

Each comes from one or more reviewers, with their recommendation. The per-plan files have the rest of the per-plan questions.

| # | Decision | Recommendation | Findings |
| --- | --- | --- | --- |
| Q1 | Which demo organization has the Mantle rule flags on? | A BOSS demo organization outside `ORG_ZIZI_CORP`'s rollup, with its own accounting preference, warehouse and store. BOSS demo data turns D2, D3, D11 and the hold guard on there, and the Accounting, Warehouse and Manufacturing demos and walks use it. `ORG_ZIZI_RETAIL` and ZIRET_WH stay as Mantle's specs expect | I-XC-03 (= I-WH-07) |
| Q2 | How strict is the Mantle/BOSS boundary? | **Decided Oct 28 (your call): a hard rule.** mr-mantle has no dependency on mr-boss: no calls, no BOSS screens or settings, no BOSS group names. Mantle checks Moqui permissions that BOSS grants to its groups. Business logic that isn't specific to one screen and fits Mantle goes in Mantle. Both rules are in impl-drawers-commons §4, and the five later plans are being updated to them | I-PRD-02 (= I-XC-02), I-XC-06, I-WH-08 |
| Q3 | When do Products' shared screens get the context seam? | Now, as a Products commit before P14: appRoot-aware services, links through `appRoot` or the record-link service, the Connections tab gated by capability. Manufacturing then extends one pattern | I-PRD-01, I-MFG-01 |
| Q4 | How does the purchase revision work? | A separate audit-logged counter, changed only by place and `apply#PurchaseRevision`. It changes no Mantle behaviour. Customer Service's `expectedOrderRevision` has the same problem | I-PUR-01 |
| Q5 | How does reopening a package work? | Amend Accounting P17's `release#ShipmentDraftInvoice` before Accounting is built: cancel the whole in-process pack invoice, clear `AssetIssuance.invoiceId` and return the shipment to ShipPicked (Un-pack). This is the verifier's smaller fix | I-WH-01 |
| Q6 | What date does a reversal take once locks exist? | The first open date after the lock, keeping the link to the original (as Odoo does). Refuse only under a hard lock or a closed period | I-ACC-02 |
| Q7 | Does revaluation change forward cost? | **Decided Oct 28 (your call): yes.** `post#Revaluation` sets `acquireCost` on the on-hand assets from its date, without reposting history, behind its own flag, with a GL entry for on-hand × delta (as ERPNext and Odoo do) | I-PRD-05 |
| Q8 | How deep does the BOM explosion go? | **Decided Oct 28 (your call).** Requirements and buildable quantity stop at non-phantom sub-assemblies (Odoo). The tree still shows every level, and costing goes level by level | I-PRD-03 |
| Q9 | Should Projects' requests be left out of the case rules? | Yes: leave out a request filed into a project unless its category is a service queue. Correct D23's list to "Projects NewRequest with no project". Run the rule after commit and on a Customer party (I-CS-02) | I-CS-01, I-CS-02 |
| Q10 | What happens when a run with postings is cancelled? | Refuse cancel once any fact exists (ERPNext). Offer "Finish with approved loss", and close through P15 (the verifier notes Mantle has Cancelled → Closed if you prefer to keep cancel) | I-MFG-05 |
| Q11 | Where does the close residual go without an approved standard? | To the output, by the landed-cost split, under a standard-or-actual basis on ProductionAllocationPolicy. Variance stays the rule for standard-costed runs. This changes design-accounting's decided rule 3 | I-MFG-06 |
| Q12 | What is the drop-ship cost path? | The bill lines post to COGS, and the drop-ship facility holds no valued stock (Odoo). Split P7 into a Mantle port and a BOSS phase. The branch is about 600 lines of Groovy-era services, with defects to fix | I-PUR-03, I-PUR-04, I-PUR-05 |
| Q13 | Where do the shared core-app rules live? | In a new "Core apps" part of impl-drawers-commons §4: Done, the flag rule, preview-then-post, restricted values and owner contracts. Each plan keeps only its exceptions | I-XC-54, I-XC-56, I-XC-57, I-XC-63 |
| Q14 | Do terminal twins come per phase or at Finish? | Per phase, with TuiRender in Done. Finish keeps only the server-static pass | I-XC-50 |
| Q15 | Which phases should be split? | Products P9 and P11; Accounting P6, P10, P17 and P18 (and show P2a/P2b in the table); Purchasing P7; Customer Service P2 (and reorder its end: Support app, then Feedback, then Reports). No merges | I-PRD-15, I-ACC-14, I-PUR-03, I-CS-08 |
| Q16 | Who builds PASS's anonymous token operation and the bound invitation? | Accounting P18, as part of settling how a PASS app registers. Issue invitations from Customer360 and Supplier360 through a Mantle service that checks the issuer's access. Purchasing P16 and Customer Service P15 reuse both | I-ACC-08, I-CS-04, I-CS-21 |
| Q17 | One approval-decision record or several? | Make Purchasing P3's decision record generic in Mantle before it is built. Customer Service P9 and P10 reuse it, and only the warranty decision keeps its own record | customer-service.md, question 2 |


## 4. Blockers and majors

| ID | Sev | Plan | Where | Finding, in one line |
| --- | --- | --- | --- | --- |
| I-WH-01 | blocker | Warehouse | P12 | Reopen package can't work: the pack invoice also locks `AssetIssuance.invoiceId`, a ShipPacked shipment can't be packed again, and repacking makes a second invoice (Q5) |
| I-PUR-01 | blocker | Purchasing | §2, P3, P4 | Approvals, sends and links key on `orderRevision`, which Mantle bumps on notes, files and status but not on price or quantity (Q4) |
| I-PRD-01 | major | Products | §2; P2, P5–P8 as built | The shared screens' context seam isn't there yet: Products-only services, launcher-gated reads, hard-coded links (Q3; I-XC-01 merged) |
| I-PRD-02 | major | Products | P5–P8 as built | Mantle policy scripts check BOSS group names, so other apps' groups are refused (Q2; I-XC-02 merged) |
| I-PRD-03 | major | Products | P8; P9 | The explosion's requirements ignore sub-assembly stock (Q8) |
| I-PRD-04 | major | Products | P8; P9; P14 | No released method in demo data, and a release can't be seeded as XML: it needs a demo setup service |
| I-PRD-05 | major | Products | P9 (AC-07) | Value-only revaluation strands its amount in the inventory account (Q7) |
| I-PRD-06 | major | Products | P9 | The roll-up's usable-when misses by-product share, lot size and setup division, cycle rounding and efficiency |
| I-ACC-01 | major | Accounting | P2a | The posting guard doesn't cover unposting: two live SECAs delete posted entries in a locked period |
| I-ACC-02 | major | Accounting | P2a | Automatic reversals keep their original date after a lock (Q6) |
| I-ACC-03 | major | Accounting | P2a | No named, side-effect-free posting check, and no closing-entry exemption (I-WH-02 merged) |
| I-ACC-04 | major | Accounting | P2a; P13 | An issuance repost values at current cost, double-counting after a landed cost or revaluation |
| I-ACC-05 | major | Accounting | §2; P4; P5 | The single-currency refusal sits on invoices only, so foreign payments and receipts still post |
| I-ACC-06 | major | Accounting | P11 | `close#FinancialTimePeriod` is force-new, so the atomic close can't hold |
| I-ACC-08 | major | Accounting | P18 | PASS invitations carry no grant and only site owners issue them, so binding to a customer or supplier is new Mantle code (Q16) |
| I-WH-04 | major | Warehouse | P5; P12; P16b | Issue services merge into one AssetIssuance and repost on update, so per-operation fields merge and reopen triggers reposts |
| I-MFG-01 | major | Manufacturing | P2 | Products P8's method layer refuses the Manufacturing context (the method-screen case of Q3) |
| I-MFG-02 | major | Manufacturing | P2 | Operation templates don't fit P8's routing model. Use `WeatBasedOn` |
| I-MFG-04 | major | Manufacturing | P7 | By-products would be valued at the main product's standard. Use P8's `allocationShare` |
| I-MFG-06 | major | Manufacturing | P15 | Provisional or actual-cost runs send the whole residual to variance (Q11; a design question) |
| I-MFG-07 | major | Manufacturing | P14; P15 | The outside-processing accrual is never cleared. Map the service product with ProductGlAccount |
| I-PUR-03 | major | Purchasing | P7 | The drop-ship branch has defects the port must fix: `approve#Order` as the customer, the sales store on the PO, the sales price, copied addresses and content, a remote call in the transaction |
| I-PUR-04 | major | Purchasing | P7 | Each re-approval makes another PO, and `finalize` matches lines by renumbered IDs |
| I-PUR-05 | major | Purchasing | P7 | No drop-ship COGS, no PO shipment, no completion (Q12) |
| I-PUR-07 | major | Purchasing | P11; P12 | Quote tiers have nowhere to live before publishing |
| I-CS-01 | major | Customer Service | P2 | The case rule turns Projects' support requests into cases (Q9; downgraded from blocker) |
| I-CS-02 | major | Customer Service | P2; P4 | The D23 rule fires before `create#Request` adds the Customer party |
| I-CS-03 | major | Customer Service | P4 | `store#WorkingHours` overwrites a schedule in place, so SLA episodes would recompute against today's hours |
| I-CS-04 | major | Customer Service | P13; P15 | PASS admits only opt-out as an anonymous POST, so feedback, RMA and anonymous forms fail remotely (Q16) |
| I-XC-03 | major | Crosscut | Accounting §4; all demos | The flag-on demo organization collides with Mantle's flow specs (Q1; I-WH-07 merged) |
| I-XC-05 | major | Crosscut | Accounting P17 | The return-receipt SECAs stay active under D11's flag (I-ACC-07 merged) |
| I-XC-06 | major | Crosscut | Warehouse P7, P8, P16b | Three planned Mantle services call `ironstone.*` services (Q2) |
| I-XC-07 | major | Crosscut | Warehouse P15; Purchasing P10 | RequestDetail's Items tab is needed two apps before its builder (I-PUR-06 merged) |
| I-XC-08 | major | Crosscut | Manufacturing P14; Purchasing P6 | No plan definitely builds the service-acceptance match rule. Pin it to Manufacturing P14 (I-PUR-02 merged) |


## 5. Easy wins

Each of these is S-sized, and most are a line or two in a plan. The IDs are in the per-plan files.

**Stale facts, fixed in the plans before anyone builds on them.**
- The root authz is live since `f4c1781`: one P1 access line for all five plans (I-XC-58 and the per-plan rows).
- Mark Products' built fields, services and `expiryBlock` as existing, and shrink the phases that planned them: Warehouse P3, Manufacturing P2/P3 and Purchasing P14 (I-XC-10, I-WH-11, I-MFG-08, I-PUR-21).
- impl-drawers-commons §4:
  - replace `gallery-shots.mjs` with `moqui test-client <component> --serve --spec GalleryShots` (I-XC-53);
  - correct the `orderRevision` sentence and complete the audit-logged list (I-XC-52).
- Fix Customer Service P13's usable-when ("next version is a clone") to the dated-form decision (I-XC-51, I-CS-18).
- Write Manufacturing's bare P16a/P16b as "Warehouse P16a/P16b", and "built" as "builds" where the phase is future (I-XC-64, I-MFG-25, I-MFG-26).
- Drop the AppStructure floor number from Accounting F3 and Purchasing F16 (I-ACC-09, I-PUR-22).

**Reuse what exists.**
- Products P12 reuses P4's `ProductCatalogOperation`, whose entity already says so (I-PRD-22).
- Accounting reuses `run#PostedAmountSummary` and `get#AccountLedgerInfo` (I-ACC-12).
- Customer Service builds business time on `get#FreeBusy`, shared with Manufacturing P12 (I-CS-12).
- Manufacturing links an operation to its template with `WeatBasedOn` (I-MFG-02).
- Manufacturing reserves pegged output with `reserve#AssetForOrderItem` (I-MFG-14).
- Purchasing publishes quote prices through Products' `store#SupplierPrice` (I-PUR-18).
- Customer Service checks the framework's Chat record rooms and `signal#Typing` instead of the Dev AIDE presence (I-CS-13).
- `get#ScannedIdGeneral` calls `resolve#ScannedProduct` (I-PRD-18).

**One-line rules that close a gap.**
- Accounting P2a also refuses a non-base-currency post (I-ACC-05).
- Accounting P17 conditions all three return SECAs on D11's flag (I-XC-05).
- Products P9 sets `OrderItem.standardCost` only when the customer is not internal (I-PRD-07).
- Warehouse: no guarded production issue past on-hand (I-WH-05), and enforce `lotRequired` and `serialRequired` at receipt (I-WH-15).
- Each P1 adds its root to TuiRender and the client deny pattern (I-XC-50, I-XC-55).

**Moves that fix the order.**
- Seed `BOSS_PURCHASING_BUYER` in Accounting P1 (I-XC-04).
- Move the base RequestItems tab to Warehouse P15 (I-XC-07).
- Pin the service-acceptance rule to Manufacturing P14 (I-XC-08).
- Move the subcontract dispatch into Warehouse P16 (I-WH-09).
- Build Products P13 (catalog checks) before P12 (import) (I-PRD-23).
- Name the credit-status read in Accounting P10 (I-CS-09).


## 6. Verdict on each plan

- **Products (P9–P14):** sound and well logged. Its value here is as the first builder. P9 needs the revaluation semantics (Q7), the roll-up rules (I-PRD-06) and the intercompany guard (I-PRD-07) before it is committed. Q2 and Q3 are cheapest to settle now, while only Products' code exists. Split P9 and P11. Build P13 before P12.
- **Accounting:** the most detailed plan, and the posting guard is the right idea. But P2a has to cover unposting, reversal dates, the direct-or-automatic distinction and currency on every posting path (I-ACC-01 to I-ACC-05), or locks and the one-currency rule leak. Keep about 21 phases. Split P6, P10, P17 and P18, and keep P20 last, with each new money record carrying its currency from the start (I-ACC-27).
- **Warehouse:** good order (the stock ledger first). One blocker, which is really Accounting P17's contract (Q5), and a cluster of AssetIssuance mechanics (I-WH-04). Most other findings are stored-but-unread policies and stale P7 names. Settle the demo organization before P1 (Q1).
- **Manufacturing:** solid on what it builds on, except the method context (I-MFG-01). The cost-flow gaps (I-MFG-04 to I-MFG-07) are each S-sized but need two decisions (Q10, Q11). Many easy wins come from what P8 already built.
- **Purchasing:** the drop-ship port is smaller than feared (about 600 lines) but defective, and P7 should be split (Q12). The revision counter is a blocker with a clean fix (Q4). Most other findings are ordering, now resolved by moving pieces to their first user.
- **Customer Service:** well shaped. The case rules need to run after commit and leave out Projects' requests (Q9). The PASS anonymous-POST gap belongs with Accounting P18 (Q16). It has the most easy wins (16), mostly reuse.
- **Across the plans:** the contracts mostly line up. The matrix found four ordering problems and one contract without a builder, all S-sized moves. The conventions have drifted in six copies, and one shared "Core apps" section ends that (Q13).


## 7. Mechanical checks

The script and its full output are in the review's scratch folder. They can be copied into the repo for the fix pass's re-run.
- **Links and anchors:** 0 broken.
- **Citations:** all section, F#, phase, need, D# and R- citations resolve, except Manufacturing's seven bare P16a/P16b, which mean Warehouse's phases.
- **Screens:** one forward miss, Manufacturing's CostingPolicies (an Accounting screen that Manufacturing builds, by Accounting §4). In the other direction, Manufacturing's eight reports are named only in P16's body, and Purchasing's SupplierBillUpload appears as Accounting P18's "BillUpload".
- **Names:**
  - one real "new but already exists" (Products P7's AbcClass and reorder fields);
  - eight wording-only "written as existing" names, including `ExternalAccessCapability`, `check#AccessToken`, `SupplierPortalServices` and `SupportCaseServices.*`.
- **Headers:** match their §6 ranges. Products' log lags its commits.
- **Findings:** no F# without a resolution. Only Products F33 has no phase home. §5 in every plan holds only the catch-all row.


## 8. Verification

Three verifiers checked all 51 blockers and majors adversarially: 36 confirmed, 15 partly right, none refuted.

**Downgraded:**
- I-CS-01, blocker → major: D23 lists Projects NewRequest among case sources, so you need to confirm the exclusion.
- Major → minor:
  - I-WH-03: the design already names `expiryBlock` as the gate's flag.
  - I-WH-05: design §18 keeps the facility rule; the gap is production issues.
  - I-WH-06: receipt steps are read in P7.
  - I-WH-08: P1 answers who calls the check.
  - I-WH-09: an ordering issue with no rework.
  - I-PRD-07: F31 already limits it to sales lines.
  - I-MFG-03: one guard check.
  - I-MFG-05: Mantle has Cancelled → Closed.
  - I-XC-04: one data row.
  - I-XC-50: Projects has its own ProjectsTui spec.
  - I-XC-51: stale wording.

**Corrected but kept:**
- I-PRD-01: the screens do read `appRoot`.
- I-PRD-02: the facility admin is `BOSS_WAREHOUSE_FACILITY_ADMIN`.
- I-PRD-03: the full tree is what the design asks for; the risk is in what reads it.
- I-WH-04: wrong about P11, right about P12 and repeat packs.
- I-MFG-06: a design question.
- I-ACC-03: kept only as merged with I-WH-02.

**Merged duplicates (the kept ID first):**
- I-PRD-01 ← I-XC-01
- I-PRD-02 ← I-XC-02
- I-XC-58 ← I-PRD-09, I-XC-09
- I-XC-05 ← I-ACC-07
- I-XC-03 ← I-WH-07
- I-ACC-03 ← I-WH-02
- I-XC-08 ← I-PUR-02
- I-XC-07 ← I-PUR-06

Close relatives kept apart: I-WH-04 and I-ACC-04 (both amend P2a's repost), and I-MFG-04 and I-PRD-06 (the receipt and the standard).
