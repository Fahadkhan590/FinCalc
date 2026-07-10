# Implementation Plan: FinCalcHub Enhancements

## Overview

All changes are made directly to two existing HTML files — no build step, no npm. Every task modifies inline HTML or the inline `<script>` block in `index.html` and/or `tools.html`. Both files target 13 tools each (index.html already has 13; tools.html must have same 13 tools as index.html has. Tasks are ordered so each one builds on the previous and the app remains functional after each step.

## Tasks

 Fix tools.html and update "13 tools" references to "13 tools"

  - In `tools.html`, remove the two tab `<button>` elements: `id="tab-mortgage"` (calling `switchTab('mortgage')`) and `id="tab-cpm"` (calling `switchTab('cpm')`)
  - Remove the entire `<div id="mortgage" class="tab-content ...">` block (Mortgage & Loan Estimator) and the entire `<div id="cpm" class="tab-content ...">` block (CPM & ROI Calculator)
  - In the inline `<script>` block of `tools.html`, delete the `calcMort()` function and the `calcCPM()` function entirely
  - In `recalcAll()`, remove the `'calcMort'` and `'calcCPM'` entries from the function array
  - In `switchTab()`, verify no hard-coded references to `'mortgage'` or `'cpm'` remain; remove any such references
  - Update the `<title>` tag from "All 13 Professional Tools…" to "All 13 Professional Tools…"
  - Update the `<meta name="description">` content update references to "13 tools", and accurately describe the tools
  - Update the visible header subtitle `<p>` element from "All 13 Tools · fincalchub.xyz" to "All 13 Tools · fincalchub.xyz"
  - Review `sitemap.xml` and update any description or metadata referencing `tools.html` that still says "13 tools" to say "13 tools"
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_

- [x] 1. Add jsPDF CDN script tag and scaffold the PDF export function

  - Add `<script src="https://unpkg.com/jspdf@latest/dist/jspdf.umd.min.js"></script>` to both `index.html` and `tools.html` immediately before the closing `</body>` tag's existing inline `<script>` block
  - In the inline `<script>` block of both files, implement the `exportToolToPDF(toolName, emoji, inputs, outputs)` function that: checks `window.jspdf` availability, creates a `jsPDF` doc, writes the bold header (emoji + tool name left-aligned, timestamp right-aligned), draws a horizontal rule, renders a two-column body layout ("Input Variables" left at x=15, "Financial Outputs" right at x=110), and appends the privacy footer notice on each page
  - If `window.jspdf` is undefined, the function must call `alert('PDF export unavailable — please check your internet connection.')` and return early
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.9_

  - [ ]* 1.1 Write property test for PDF contains all required sections
    - **Property 4: PDF contains all required sections for any tool**
    - For any toolName, emoji, inputs object, and outputs object, call `exportToolToPDF` with a mocked jsPDF and verify the doc text contains: emoji, toolName, a timestamp pattern `YYYY-MM-DD HH:MM`, "Input Variables", "Financial Outputs", and the privacy footer string
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6**

- [x] 2. Add "📄 Download PDF Report" button to every tool container in both files

  - NOTE: The single PDF button has been REPLACED by the three-button export group from Task 21. The three-button groups (PDF + CSV + XLSX) are already present on all 13 existing tools in `index.html`. This task is complete.
  - For each of the 13 tool `<div id="...">` blocks in `index.html`, the three-button export group calling `downloadPDF('toolname')`, `downloadCSV('toolname')`, `downloadXLSX('toolname')` is already in place
  - Repeat for each of the 12 tool blocks in `tools.html`
  - The `downloadPDF(toolId)` dispatcher function reads the current input/output DOM values for the given toolId, packages them into `inputs` and `outputs` objects via `gatherToolData()`, and calls `exportToolToPDF`
  - _Requirements: 2.7, 2.8_

  - [ ]* 2.1 Write property test verifying every tool has a PDF download button
    - **Property 4 (structural): every tool container has a PDF download button**
    - Parse each HTML file as DOM, query all tool container divs, verify each has a descendant button whose text contains "Download PDF Report"
    - **Validates: Requirements 2.7, 2.8**

- [ ] 3. Implement LocalStorage history — save, render, and clear functions

  - In both files' inline `<script>` blocks, implement:
    - `historyKey(toolName)` → `'fch_history_' + toolName`
    - `saveHistory(toolName, inputs, outputs)` → reads existing array from localStorage (try/catch), unshifts new entry `{ts, inputs, outputs}`, trims to 5, writes back
    - `renderHistory(toolName)` → reads array, clears `#history-list` inner HTML, renders each entry as a small card with timestamp, key outputs, wrapped in a `<div>`
    - `clearToolHistory()` → removes the localStorage key for the active tool, re-renders empty state with message "No history yet"
  - Call `saveHistory` at the end of each existing `calcXxx()` function, passing the tool name and a snapshot of relevant inputs/outputs
  - Call `renderHistory(activeToolName)` inside `switchTab()` to refresh the drawer when switching tabs
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [ ]* 3.1 Write property test for FIFO cap (Property 1)
    - **Property 1: History FIFO cap at 5 entries**
    - For any tool name and N = fc.integer({min:6, max:20}) saves, verify stored array length is 5 and the first entry saved is absent
    - **Validates: Requirements 1.1, 1.2, 1.3**

  - [ ]* 3.2 Write property test for history round-trip (Property 2)
    - **Property 2: History round-trip persistence**
    - For any valid `HistoryEntry` object, save it, read back the key, verify the parsed entry matches on `ts`, `inputs`, `outputs`
    - **Validates: Requirements 1.1, 1.6**

  - [ ]* 3.3 Write property test for clear history (Property 3)
    - **Property 3: Clear history removes all entries**
    - For any N >= 1 entries, call `clearToolHistory()`, verify localStorage key is absent and DOM list has 0 children
    - **Validates: Requirements 1.4**

- [~] 4. Add History Drawer HTML to both files' sidebars

  - In `index.html`, insert the history drawer `<div id="history-drawer">` block as the first child of the `<aside>` sidebar element, above the existing "System Info" box
  - The drawer HTML must include: title "🕐 Recent Calculations", "Clear" button calling `clearToolHistory()`, and `<div id="history-list">` for entry rendering
  - Repeat the same sidebar addition in `tools.html`
  - On `DOMContentLoaded`, call `renderHistory` for the default active tool (crypto)
  - _Requirements: 1.2, 1.5, 1.6_

- [~] 5. Checkpoint — Ensure PDF export and history work end-to-end
  - Open both HTML files in a browser (file:// or local server), run a calculation on any tool, verify a history entry appears in the drawer, click "📄 Download PDF Report" and verify a PDF downloads with correct content, click "Clear" and verify the drawer empties. Ask the user if questions arise.

- [ ] 6. Upgrade SaaS tool — add ARPU display and Churn-Based LTV

  - In the SaaS tool's result grid in both `index.html` and `tools.html`, add a new result card: `<div class="result-card ..."><p>ARPU</p><p id="saas-arpu">—</p></div>`
  - Rename the existing LTV output element's label to "LTV (Lifespan)"
  - Add a second LTV output element labelled "LTV (Churn)" with id `saas-ltv-churn`
  - Modify `calcSaaS()` in both files to:
    - Compute `const arpu = mrr;` and set `#saas-arpu`
    - Compute `const ltvChurn = churn > 0 ? arpu / (churn / 100) : Infinity;`
    - Display "∞" when `ltvChurn === Infinity`, otherwise format normally
    - Use `Math.max(ltv, isFinite(ltvChurn) ? ltvChurn : ltv)` for the LTV:CAC denominator
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 6.1 Write property test for SaaS Churn-Based LTV formula (Property 5)
    - **Property 5: SaaS Churn-Based LTV formula correctness**
    - For any ARPU > 0 and Churn > 0, verify displayed `ltvChurn` equals `ARPU / (Churn / 100)` within 0.01 tolerance
    - **Validates: Requirements 3.2**

- [ ] 7. Upgrade E-Commerce tool — add CAC, ARPU, Churn Rate inputs and LTV/LTV:CAC outputs

  - In the E-Com tool's input grid in both files, add three new `<div>` input fields: CAC (`id="ec-cac"`), ARPU (`id="ec-arpu"`), Churn Rate (`id="ec-churn"`) — each following the existing input field pattern with `oninput="calcEC()"` and appropriate labels with `.cur` currency spans where monetary
  - Below the existing results grid, add two new output cards: LTV (`id="ec-ltv"`) and LTV:CAC (`id="ec-ltvc"`)
  - Modify `calcEC()` in both files to read the three new inputs and:
    - If ARPU and Churn are valid and Churn > 0: `ltv = arpu / (churn / 100)`, `ltvc = cac > 0 ? ltv / cac : '—'`
    - If Churn = 0: display "∞" for both LTV and LTV:CAC
    - If ARPU or Churn missing: display "—" without error
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 7.1 Write property test for E-Com LTV formula (Property 6)
    - **Property 6: E-Com LTV formula correctness**
    - For any ARPU > 0 and Churn > 0, verify displayed LTV = ARPU / (Churn / 100) within tolerance
    - **Validates: Requirements 4.2**

  - [ ]* 7.2 Write property test for E-Com LTV:CAC ratio (Property 7)
    - **Property 7: E-Com LTV:CAC ratio correctness**
    - For any LTV > 0 and CAC > 0, verify displayed ratio = LTV / CAC within tolerance
    - **Validates: Requirements 4.3**

- [ ] 8. Upgrade Income Tax tool — add Tax Year/Region dropdown

  - In the Income Tax tool HTML in both files, insert a `<div>` containing a `<select id="tax-region" onchange="calcTax()">` with the four required options (`pk2526`, `pk2425`, `in2526`, `us2024`) as the first input element, above the monthly income field
  - In the inline `<script>` of both files, define `const TAX_SLABS` object containing:
    - `pk2526`: existing salaried + business bracket arrays extracted from the current `calcTax()` logic
    - `pk2425`: FY2024-25 salaried brackets (0/5/15/25/30/35%) and corresponding business brackets
    - `in2526`: `null`
    - `us2024`: `null`
  - Refactor `calcTax()` to read `document.getElementById('tax-region').value`, look up the slab set, and if null display all outputs as "—" with a "Coming soon" inline notice; otherwise compute using the selected slab array
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [ ]* 8.1 Write property test for FY2024-25 tax slab computation (Property 8)
    - **Property 8: Tax slab computation for FY2024-25**
    - For any annual income value (fc.integer({min:0, max:10_000_000})), verify `calcTaxFromSlabs(income, TAX_SLABS.pk2425.s)` matches manually computed expected value using the defined bracket rules
    - **Validates: Requirements 5.4**

- [~] 9. Checkpoint — Ensure calculator upgrades work correctly
  - Verify SaaS tool shows ARPU and both LTV values, E-Com tool shows LTV/LTV:CAC with new inputs, Tax tool dropdown changes calculation output. Ask the user if questions arise.

- [ ] 10. Add Formula Accordions to all tool containers in both files

  - For each of the 13 tools in `index.html` and 13 tools in `tools.html`, insert a `<details>` accordion element immediately after the `.tool-desc` div (or after the PDF button if step 2 is complete)
  - The `<summary>` must read "📐 View Mathematical Formula"
  - The `<details>` body must contain a styled `<code>` block with the tool's primary formula
  - Formulas to use for each tool:
    - Crypto: `Fiat Value = Crypto Amount × Live Rate`
    - Compound Interest: `A = P(1 + r/n)^(nt) + PMT × [(1+r/n)^(nt) - 1] / (r/n)`
    - SIP: `M = PMT × [(1 + r)^n - 1] / r × (1 + r)`
    - Income Tax: `Tax = Base + Rate × (Income - Threshold)` (progressive slabs)
    - Savings Goal: `PMT = (Goal - PV×(1+r)^n) × r / [(1+r)^n - 1]`
    - Retirement: `Corpus = ME × [1 - (1+rr)^(-n)] / rr` (inflation-adjusted)
    - Profit Margin: `Margin = (Revenue - Cost) / Revenue × 100 | Markup = (Revenue - Cost) / Cost × 100`
    - Freelancer Rate: `Hourly = Annual Revenue / Total Billable Hours`
    - SaaS: `CAC = Spend / Customers | LTV = ARPU / Churn Rate`
    - E-Com: `Net Profit = Price - Cost - Shipping - Platform Fee - Gateway Fee - Ad Spend`
  - No JavaScript needed — pure HTML `<details>` toggle
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ]* 10.1 Write property test for accordion presence (Property 9)
    - **Property 9: Formula accordion present for every tool**
    - Parse HTML files as DOM, for each tool container verify exactly one `<details>` exists with a `<summary>` text containing "View Mathematical Formula"
    - **Validates: Requirements 6.1, 6.2**

  - [ ]* 10.2 Write property test for accordion closed by default (Property 13)
    - **Property 13: Formula accordion closed by default**
    - For every `<details>` element added, verify the `open` attribute is absent on page load
    - **Validates: Requirements 6.5**

- [~] 11. Add Privacy Badge to both files

  - Insert the fixed-position `<div id="privacy-badge">` element in both `index.html` and `tools.html` immediately before the existing floating action buttons `<div class="fixed bottom-4 right-4 ...">` block
  - Style with: `position:fixed; bottom:0; left:0; right:0; z-index:45; background:rgba(15,23,42,0.96); border-top:1px solid rgba(51,65,85,0.5); padding:8px 16px; text-align:center; font-size:11px; color:#94a3b8`
  - Text: "🔒 100% Secure & Private. All calculations happen inside your browser's RAM. Your data never leaves this device."
  - Add `padding-bottom: 40px` to the `<main>` element in both files so the badge does not cover bottom content
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [ ] 12. Update tool h2 headings to include emoji prefixes

  - In both files, audit every tool's `<h2>` element and prepend the emoji for any heading that is missing it:
    - `index.html`: "Compound Interest Calculator" → "📈 Compound Interest Calculator", "SIP Investment Planner" → "💰 SIP Investment Planner", "Income Tax Calculator" → "🏛️ Income Tax Calculator", "Savings Goal Calculator" → "🎯 Savings Goal Calculator", "Retirement Planning Calculator" → "🏖️ Retirement Planning Calculator", "Profit Margin Calculator" → "💹 Profit Margin Calculator"
    - `tools.html`: same audit for any missing emojis in the 13 tools (Mortgage and CPM/ROI have already been removed in Task 0)
    - Already-correct headings (e.g., "💼 Freelancer...", "🚀 SaaS...", "🛒 E-Commerce...") are left unchanged
    - The Crypto tool heading should read "₿ Real-Time Crypto & Fiat Converter"
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ]* 12.1 Write property test for emoji headers (Property 11)
    - **Property 11: All tool h2 headings contain an emoji prefix**
    - Parse each HTML file as DOM, for every tool container verify the first `<h2>` text's first character has a Unicode code point > 0x00FF
    - **Validates: Requirements 8.1, 8.3**

- [ ] 13. Fix responsive grid classes on all tool input containers

  - In both files, audit every `<div class="grid ...">` element inside a tool container
  - Any grid that uses only `grid-cols-2` (no `sm:` prefix and no `grid-cols-1` base) must be updated to `grid-cols-1 sm:grid-cols-2`
  - Any grid that uses only `grid-cols-3` must be updated to `grid-cols-1 sm:grid-cols-3`
  - Tools confirmed to need fixing in `index.html`: Profit Margin (currently `grid-cols-2`), E-Com (verify base class)
  - All existing grids that already use `grid-cols-1 sm:grid-cols-2` or `grid-cols-1 sm:grid-cols-3` are left unchanged
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ]* 13.1 Write property test for responsive grid classes (Property 12)
    - **Property 12: All input grids have a mobile-first base class**
    - Parse each HTML file as DOM, for every `.grid` element inside a tool container, verify `classList` includes `grid-cols-1` and at least one class matching `/^sm:grid-cols-\d+$/`
    - **Validates: Requirements 9.1, 9.2, 9.3**

- [~] 14. Final checkpoint — Full cross-browser verification
  - Open both `index.html` and `tools.html` in a browser. Verify: history saves and persists on reload, PDF downloads for at least 3 different tools, SaaS shows ARPU and both LTV values, E-Com shows LTV/LTV:CAC, Tax dropdown switches slabs, all accordions toggle open/close, privacy badge is visible and not obscuring inputs, all h2 headings have emojis, all input grids stack on mobile viewport. Ask the user if questions arise.

- [ ] 15. Implement Smart Scenario Comparison (What-If Mode)

  - Add a "⚖️ Compare Scenarios" toggle `<button>` to every Tool_Container in both `index.html` and `tools.html`, placed immediately above the input grid for each tool
  - When clicked, the button toggles a boolean `compareMode` flag per tool; use a `data-tool` attribute on each button to scope the state
  - When `compareMode` is true, clone the tool's input grid into a second column (wrapped in a `flex` or `grid-cols-2` container), giving the second column's inputs new IDs suffixed with `_b` (e.g., `ci-p_b`)
  - Both columns calculate independently: call the tool's `calcXxx()` function for each column's inputs on every `input` event, storing each result separately
  - Render the first result card with a blue border/background tint (`border-blue-500/40 bg-blue-500/10`) and the second with an orange tint (`border-orange-500/40 bg-orange-500/10`)
  - Below the two result cards, render a delta row showing: absolute difference (`|result_a - result_b|`) and percentage difference (`|result_a - result_b| / result_a × 100`) formatted as `Δ Rs X,XXX (12.5%)`
  - When `compareMode` is toggled off, remove the second column and delta row and restore the single-column layout
  - No external libraries; use only vanilla JS and inline HTML cloning
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [ ]* 15.1 Write property test for scenario comparison delta row
    - **Property 13: Scenario comparison delta is mathematically correct**
    - *For any* two numeric result values A and B, the displayed absolute delta must equal `|A - B|` and the percentage delta must equal `|A - B| / A × 100` within floating-point tolerance
    - **Validates: Requirements 11.4**

- [~] 16. Add Live Financial News Ticker strip

  - In both `index.html` and `tools.html`, insert a ticker `<div id="news-ticker">` element immediately after the tab bar `<div>` and before the `<main>` element
  - Style the ticker as a full-width strip with `overflow: hidden`, dark background (`bg-slate-800/60`), and a single inner `<div class="ticker-inner">` that holds all headline `<a>` elements in a single line
  - Add a CSS `@keyframes tickerScroll` rule (inside the existing inline `<style>` block) that translates the inner div from `translateX(0)` to `translateX(-50%)` with a 30-second linear cycle; apply `animation: tickerScroll 30s linear infinite` to the `.ticker-inner` element
  - On `DOMContentLoaded`, fetch headlines from a free RSS-to-JSON endpoint (e.g., `https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Ffeeds.finance.yahoo.com%2Frss%2F2.0%2Fheadline`); on success, build `<a>` elements from the returned items (title + link), duplicating the list once to create a seamless loop
  - If the fetch fails or returns no items, populate the ticker with exactly 5 hardcoded financial tip strings as fallback `<span>` elements (no links)
  - Each `<a>` headline must open in `target="_blank" rel="noopener"` and be separated from the next by a `·` bullet spacer span
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

- [ ] 17. Implement Shareable Calculation URL (Deep Linking)

  - In both files, add a "🔗 Share This Calculation" `<button>` immediately below the primary result card for each tool; give each button the class `share-btn` and a `data-tool` attribute matching the tool ID
  - Implement a `buildShareURL(toolId)` function that reads all `<input>` and `<select>` elements within the tool's container, creates a `URLSearchParams` object with `tool=<toolId>` plus one param per input (`id=value`), and returns `location.origin + location.pathname + '?' + params.toString()`
  - Implement a `copyShareURL(toolId)` function that calls `buildShareURL`, then attempts `navigator.clipboard.writeText(url)`; on success, temporarily changes the button text to "✅ Link copied!" for 2 seconds before restoring the original label; on failure (clipboard unavailable), renders the URL in a temporary read-only `<input>` element adjacent to the button
  - On `DOMContentLoaded`, read `URLSearchParams` from `location.search`; if a `tool` param exists, call `switchTab(tool)`, then for each remaining param whose name matches an input `id` inside that tool's container, set the input's value; after all inputs are set, call the tool's `calcXxx()` function to run the calculation
  - Uses only `URLSearchParams` and `navigator.clipboard`; no external libraries
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_

  - [ ]* 17.1 Write property test for Deep Link URL round-trip
    - **Property 14: Deep link URL encodes and restores all inputs**
    - *For any* tool and any set of valid input values, building a share URL and then parsing its query parameters should restore every input field value to within floating-point tolerance
    - **Validates: Requirements 13.2, 13.4**

- [ ] 18. Implement Animated Results and Micro-Interactions

  - In both files, add the reusable `animateValue(elementId, fromVal, toVal, duration)` utility function to the inline `<script>` block; the function must use `requestAnimationFrame` to linearly interpolate from `fromVal` to `toVal` over `duration` milliseconds, updating the element's `textContent` on each frame with the interpolated number formatted to 0 decimal places (using the existing `fmt()` helper where applicable)
  - Modify each `calcXxx()` function in both files so that, instead of directly setting the primary output element's textContent/innerHTML, it calls `animateValue()` for the main numeric result (the element inside `.result-card` with class `font-bold` and `text-emerald-400` or similar); pass 0 as `fromVal` and the computed value as `toVal` with `duration=600`
  - Add a CSS rule (inside the existing inline `<style>` blocks) for a `@keyframes resultGlow` animation that applies `box-shadow: 0 0 18px rgba(16,185,129,0.45)` at 0% and 100% and `box-shadow: 0 0 0 transparent` at 50%; add a `.result-flash` class that applies this animation over 600ms; after calling `animateValue()`, also temporarily add the `result-flash` class to the result card element and remove it after 700ms
  - Add a CSS rule for a `@keyframes tabRipple` animation (scale from 1 to 1.08 and back); add `.tab-ripple` class applying the animation over 200ms; in `switchTab()`, add `tab-ripple` to the clicked tab button and remove it after 250ms via `setTimeout`
  - Uses only `requestAnimationFrame` and CSS; no external animation libraries
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

  - [ ]* 18.1 Write property test for animateValue interpolation
    - **Property 15: animateValue produces correct intermediate values**
    - *For any* `fromVal`, `toVal`, and a mocked RAF at elapsed time T within `[0, duration]`, the element's numeric content should equal `fromVal + (toVal - fromVal) * (T / duration)` within tolerance
    - **Validates: Requirements 14.1**

- [~] 19. Implement Embeddable Widget Mode

  - In both files, add a synchronous `<script>` block inside `<head>` (before any CSS or other scripts) that reads `new URLSearchParams(location.search).get('widget')`; if the value is `'1'`, immediately add the class `widget-mode` to `<html>` and inject `<meta name="robots" content="noindex">` into `<head>` using `document.write` or `document.head.appendChild` before the parser continues
  - Add a CSS rule block in the first inline `<style>` in `<head>`: `.widget-mode header, .widget-mode footer, .widget-mode aside, .widget-mode #privacy-badge, .widget-mode .tabs-scroll { display: none !important; }` and `.widget-mode main { padding: 0; }` to strip all chrome
  - On `DOMContentLoaded`, if `widget-mode` class is present on `<html>`, additionally read the `tool` URL param and call `switchTab(tool)` if present; otherwise the default active tool (Crypto) remains shown
  - The widget-mode detection script must run synchronously in `<head>` — do NOT defer it or place it in `DOMContentLoaded` — to prevent any layout flash
  - No external libraries required; uses only standard DOM APIs and `URLSearchParams`
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

- [~] 20. Final checkpoint — Verify all new features
  - Open both `index.html` and `tools.html` in a browser. Verify: tools.html shows exactly 13 tools (no Mortgage, no CPM/ROI), Scenario Comparison toggle works on at least 2 tools, news ticker scrolls and shows fallback if API unavailable, share URL round-trips correctly (copy URL, open in new tab, inputs repopulate), result animations play on calculation update, widget mode (`?widget=1`) hides all chrome and shows only the active tool. Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property/unit tests and can be skipped for a faster MVP delivery
- Both `index.html` and `tools.html` must receive identical or equivalent changes for every module
- The jsPDF CDN tag must be added before the existing inline `<script>` block so `window.jspdf` is available when the page script runs
- All existing calculator logic (`calcCI`, `calcSIP`, `calcTax`, `calcSaaS`, `calcEC`, etc.) must remain untouched except for the specific additions described in tasks 6, 7, and 8
- Property tests reference the design document: `// Feature: fincalchub-enhancements, Property N: <text>`
- Task 0 must be completed before Tasks 12 and 13 (emoji headers and grid fixes) so that those tasks only audit the 13 remaining tools in tools.html

- [x] 21. Add CSV and XLSX export to both files

  - Add `<script defer src="https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js"></script>` to both `index.html` and `tools.html` immediately after the existing jsPDF `<script>` tag
  - Implement `exportToolToCSV(toolName, inputs, outputs)` in both files' inline `<script>` blocks: creates a CSV string with two labeled sections (inputs first, then outputs), each as two-column key/value rows, with a header comment line `# {toolName} Export - {timestamp}`, and triggers download via `<a download>` link
  - Implement `exportToolToXLSX(toolName, inputs, outputs)` in both files: checks `window.XLSX` availability, creates a workbook with sheet "Inputs" (two columns: Field, Value, one row per input) and sheet "Outputs" (same), writes the file with `XLSX.writeFile`
  - Replace the existing single "📄 Download PDF Report" button on every Tool_Container with a three-button export group: `[📄 PDF] [📊 CSV] [📗 XLSX]` — style using `flex gap-2 mt-4`, each button using `flex-1 py-2 px-3 rounded-xl font-semibold text-xs text-white` with distinct gradient colors (PDF: indigo-to-purple, CSV: emerald-to-cyan, XLSX: amber-to-orange)
  - Add `downloadCSV(toolId)` and `downloadXLSX(toolId)` dispatcher functions following the same read-inputs/read-outputs pattern as `downloadPDF(toolId)`
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6_

- [x] 22. Fix GTM inline init block — wrap in window.addEventListener('load', ...) in both files

  - In `index.html`, locate the existing inline `<script>` block immediately after the `<script src="https://www.googletagmanager.com/gtag/js?id=G-4LEKFYK37L" defer>` tag and wrap the entire body of that inline script (`window.dataLayer = ...`, `function gtag(){...}`, `gtag('js', ...)`, `gtag('config', ...)`) inside `window.addEventListener('load', function() { ... });`
  - In `tools.html`, add the same GTM script pair that `index.html` has: first add `<script src="https://www.googletagmanager.com/gtag/js?id=G-4LEKFYK37L" defer></script>`, then add the inline `<script>window.addEventListener('load', function(){ window.dataLayer=window.dataLayer||[]; function gtag(){dataLayer.push(arguments);} gtag('js',new Date()); gtag('config','G-4LEKFYK37L'); });</script>` immediately after it, positioned in the `<head>` block
  - Verify the `defer` attribute remains on the external GTM script `src` tag in both files
  - _Requirements: 17.1, 17.2, 17.3, 17.4_

- [x] 23. Apply all 6 accessibility contrast tweaks in both index.html and tools.html

  - NOTE: The key contrast fixes (body `text-slate-50`, system info strip `bg-slate-950/80`, installHint `text-slate-300`) are confirmed done in `index.html`. Some tweaks may still be pending in `tools.html` — verify and apply as needed.

  - Tweak 1: In both files, find all `<p>` elements with class `text-slate-500` that are inside the live CoinGecko ticker or market data section (identifiable by `mt-3 text-center` and `text-[10px]`) and change `text-slate-500` to `text-slate-300`
  - Tweak 2: In both files, find the Crypto Converter's secondary description card `<div>` with class containing `bg-slate-900/40 rounded-xl sm:rounded-2xl p-4 border border-slate-700/40` and change `bg-slate-900/40` to `bg-slate-900/80`
  - Tweak 3: In both files, locate the opening `<body>` tag and change `text-slate-100` to `text-slate-50` in its class attribute
  - Tweak 4: In both files, find inline status `<p>` elements with class `text-[10px] text-slate-500` (without `mt-3 text-center`) and change `text-slate-500` to `text-slate-400`
  - Tweak 5: In both files, find the system info strip container `<div class="px-4 py-2 bg-slate-900/40">` and change `bg-slate-900/40` to `bg-slate-950/80`
  - Tweak 6: In both files, find `<p class="text-[10px] text-slate-500" id="installHint">` and change `text-slate-500` to `text-slate-300`
  - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6_

- [~] 24. Update manifest.json and verify PWA link tags

  - In `manifest.json`, add a second icon entry with `"sizes": "192x192"` alongside the existing entry (use the same SVG data URI and `"purpose": "any maskable"`)
  - Add `"prefer_related_applications": false` as a top-level key to `manifest.json`
  - In both `index.html` and `tools.html`, update `<link rel="manifest" href="manifest.json">` to `<link rel="manifest" href="/manifest.json">` (add leading slash)
  - _Requirements: 19.1, 19.2, 19.3_

- [~] 25. Rebuild index.html tab bar to add 3 new tool buttons in correct order

  - In `index.html`, locate the tab bar `<div class="flex gap-1.5 ...">` that contains the existing 13 tab buttons
  - After the `id="tab-crypto"` button and before the `id="tab-compound"` button, insert three new tab buttons:
    - `id="tab-roas"` calling `switchTab('roas')` with emoji `📊` and label `RoAS`
    - `id="tab-invoice"` calling `switchTab('invoice')` with emoji `📝` and label `Invoice`
    - `id="tab-abtest"` calling `switchTab('abtest')` with emoji `💥` and label `A/B Test`
  - Each new button must use the exact same Tailwind class string as the existing inactive tab buttons: `tab-btn flex-shrink-0 min-w-[95px] px-3 py-2.5 rounded-xl font-semibold transition text-xs sm:text-sm text-slate-400 hover:text-white flex items-center justify-center gap-1.5`
  - In the existing `switchTab()` function, add `'roas'`, `'invoice'`, and `'abtest'` to the tool ID array/list used for tab switching
  - In the existing `recalcAll()` function, add three new guarded calls at the end: `if (typeof calcRoAS === 'function') calcRoAS();`, `if (typeof calcInvoice === 'function') calcInvoice();`, `if (typeof calcABTest === 'function') calcABTest();`
  - _Requirements: 20.1, 20.2, 20.3, 20.4_

- [ ] 26. Implement RoAS Planner tool — HTML block + calcRoAS() function in index.html

  - In `index.html`, insert a new `<div id="roas" class="tab-content">` block immediately after the closing `</div>` of the Crypto tool block and before the opening `<div id="compound"` block
  - The block must follow the existing tool HTML pattern: outer `<div id="roas" class="tab-content p-4 sm:p-6">`, `<h2>` heading with `📊` emoji prefix, `.tool-desc` description paragraph with the exact subtext from Requirement 20.5, input grid using `grid-cols-1 sm:grid-cols-2`, result output grid, formula accordion, and three-button export group
  - Input fields (each with `oninput="calcRoAS()"`): `id="roas-spend"` (Total Ad Spend, default 10000), `id="roas-revenue"` (Total Revenue Generated, default 35000), `id="roas-cogs"` (COGS, default 8000), `id="roas-budget"` (Daily Campaign Budget, default 500), `id="roas-days"` (Days Elapsed, default 7)
  - Output elements: `id="roas-result"` (RoAS), `id="roas-net-profit"` (Net Profit), `id="roas-margin"` (Net Margin %), `id="roas-breakeven"` (Break-Even RoAS), `id="roas-spend-to-date"` (Spend to Date), `id="roas-pacing"` (Pacing Status)
  - In the inline `<script>` block, implement `calcRoAS()` per the design: guard `if (spend === 0)` sets all outputs to "—"; otherwise compute RoAS, netProfit, margin, breakEven, spendToDate, pacing with color class; use existing `cs()` and `fmt()` helpers for monetary formatting
  - Pacing logic: if `spend > spendToDate` → "⚠️ Over Budget" (text-rose-400); within 10% → "✅ On Track" (text-emerald-400); else → "📉 Under Pacing" (text-amber-400)
  - Formula accordion summary: "📐 View Mathematical Formula"; code block: `RoAS = Revenue ÷ Ad Spend | Break-Even RoAS = (Spend + COGS) ÷ Spend | Net Margin = Net Profit ÷ Revenue × 100 | Spend to Date = Daily Budget × Days Elapsed`
  - Add `saveHistory('roas', {...inputs}, {...outputs})` call at end of `calcRoAS()`
  - _Requirements: 20.5, 21.1, 21.2, 21.3, 21.4, 21.5_

  - [ ]* 26.1 Write property test for RoAS formula correctness (Property 13)
    - **Property 13: RoAS formula correctness**
    - For any spend > 0 and revenue > 0, verify `calcRoAS()` output RoAS = `revenue / spend` to 2dp, and breakEven = `(spend + cogs) / spend` to 2dp
    - **Validates: Requirements 21.2**

- [ ] 27. Implement Invoice Tracker tool — HTML block + calcInvoice() function in index.html

  - In `index.html`, insert a new `<div id="invoice" class="tab-content">` block immediately after the RoAS block (Task 26) and before the `<div id="compound"` block
  - The block must follow the existing tool HTML pattern with `<h2>` heading with `📝` emoji, `.tool-desc` description, `grid-cols-1 sm:grid-cols-2` input grid, output cards, formula accordion, and three-button export group
  - Input fields (each with `oninput="calcInvoice()"`): `id="inv-rate"` (Hourly Rate, default 5000), `id="inv-hours"` (Hours Billed, default 40), `id="inv-platform"` (Platform Cut %, default 15), `id="inv-tax"` (Tax Rate %, default 10), `id="inv-expenses"` (Additional Expenses, default 0), `id="inv-mtd-hours"` (MTD Hours, default 120)
  - Output elements: `id="inv-gross"`, `id="inv-platform-cut"`, `id="inv-tax-cut"`, `id="inv-net"` (primary — use a visually prominent result-card), `id="inv-eff-rate"`, `id="inv-mtd"`
  - In the inline `<script>`, implement `calcInvoice()`: guard `if (hours === 0)` sets rate-dependent outputs to "—"; compute gross, platformCut, taxCut, net, effRate, mtd; display using `cs()` and `fmt()` helpers
  - Formula accordion code block: `Gross = Rate × Hours | Net = Gross − Platform Cut − Tax − Expenses | MTD = (Net ÷ Hours) × MTD Hours`
  - Add `saveHistory('invoice', {...inputs}, {...outputs})` call at end
  - _Requirements: 20.5, 22.1, 22.2, 22.3, 22.4, 22.5_

  - [ ]* 27.1 Write property test for Invoice Net Take-Home formula correctness (Property 14)
    - **Property 14: Invoice Net Take-Home formula correctness**
    - For any rate > 0, hours > 0, platform%, tax%, expenses ≥ 0, verify net = `(rate × hours) × (1 - platform/100) × (1 - tax/100) - expenses` within tolerance
    - **Validates: Requirements 22.2**

- [ ] 28. Implement A/B Test Significance Engine — HTML block + calcABTest() function in index.html

  - In `index.html`, insert a new `<div id="abtest" class="tab-content">` block immediately after the Invoice block (Task 27) and before `<div id="compound"`
  - The block must follow the existing tool HTML pattern with `<h2>` heading with `💥` emoji, `.tool-desc` description, input grid, output section, verdict card, formula accordion, and three-button export group
  - Input grid: use two visually grouped sub-sections labelled "Variant A" and "Variant B" within a `grid-cols-1 sm:grid-cols-2` grid: `id="ab-a-visitors"` (default 1000), `id="ab-a-conv"` (default 50), `id="ab-b-visitors"` (default 1000), `id="ab-b-conv"` (default 65); all with `oninput="calcABTest()"`
  - Output cards: `id="ab-rate-a"`, `id="ab-rate-b"`, `id="ab-uplift"`, `id="ab-zscore"`, `id="ab-confidence"` (with dynamic color class)
  - Verdict element: `id="ab-verdict"` — a full-width div below the output cards with a dynamic background class (emerald tint for winner, slate for no significance)
  - In the inline `<script>`, implement `calcABTest()` per the design: guard `if (nA === 0 || nB === 0)`, compute two-proportion Z-test, map |Z| to confidence label, set verdict text and CSS class
  - Formula accordion: `Z = (p̂B − p̂A) / √[p̂(1−p̂)(1/nA + 1/nB)]` where `p̂ = (xA+xB)/(nA+nB)`
  - Add `saveHistory('abtest', {...inputs}, {...outputs})` call at end
  - _Requirements: 20.5, 23.1, 23.2, 23.3, 23.4, 23.5_

  - [ ]* 28.1 Write property test for A/B Z-Score formula correctness (Property 15)
    - **Property 15: A/B Test Z-Score formula correctness**
    - For any nA, nB > 0 and xA ≤ nA, xB ≤ nB, verify Z = `(pB - pA) / sqrt(pooled * (1 - pooled) * (1/nA + 1/nB))` within tolerance
    - **Validates: Requirements 23.2**

- [~] 29. Checkpoint — Verify all three new tools calculate correctly
  - Open `index.html` in a browser. Verify: all 13 tabs are visible in the correct order, RoAS tab shows 6 output values with default inputs (RoAS should show 3.50x, Break-Even should show 1.80x), Invoice tab shows 6 outputs (net take-home should be less than gross), A/B Test tab shows Z-score and verdict with default inputs (B should win at 95%+ confidence). Ask the user if questions arise.

- [ ] 30. Implement SessionStorage Input Persistence Engine in index.html

  - In the inline `<script>` block of `index.html`, implement `triggerAllActiveCalculators()` covering all 13 tools with `typeof` existence guards:
    ```javascript
    function triggerAllActiveCalculators() {
      ['calcRoAS','calcInvoice','calcABTest','fetchCrypto','calcCI','calcSIP',
       'calcTax','calcSavings','calcRetire','calcProfit','calcFL','calcSaaS','calcEC']
        .forEach(fn => { try { if (typeof window[fn]==='function') window[fn](); } catch(e){} });
    }
    ```
  - Add a single delegated `input` event listener on `document` (inside `DOMContentLoaded` or at script level) that fires `sessionStorage.setItem(e.target.id, e.target.value)` for any `INPUT` or `SELECT` element that has an `id`; wrap in try/catch
  - Add a matching delegated `change` event listener for `SELECT` elements to handle dropdown changes
  - In the existing `DOMContentLoaded` handler (or add one if it does not exist), append logic to:
    1. Loop `document.querySelectorAll('input[id], select[id]')` and restore each element's value from `sessionStorage.getItem(el.id)` if non-null
    2. Read `sessionStorage.getItem('fch_active_tab')` and call `switchTab(cachedTabId)` if non-null
    3. Call `triggerAllActiveCalculators()` after all restorations
  - Modify the existing `switchTab()` function directly (preferred over monkey-patching) to add `try { sessionStorage.setItem('fch_active_tab', id); } catch(ex) {}` at the top of its body
  - All sessionStorage operations must be wrapped in try/catch per Requirement 24.7
  - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.5, 24.6, 24.7, 24.8_

  - [ ]* 30.1 Write property test for sessionStorage round-trip (Property 16)
    - **Property 16: SessionStorage round-trip for all 13 tools**
    - For any set of input element IDs with assigned values, verify that firing input events stores correct sessionStorage entries, and that a restore loop correctly re-applies those values to matching elements
    - **Validates: Requirements 24.2, 24.4**

  - [ ]* 30.2 Write property test for triggerAllActiveCalculators safety (Property 17)
    - **Property 17: triggerAllActiveCalculators existence-guard safety**
    - For any arbitrary subset of calc functions being defined (0 to 13), verify that calling `triggerAllActiveCalculators()` does not throw regardless of which functions are absent
    - **Validates: Requirements 24.6**

- [~] 31. Implement PWA Install Banner in index.html

  - In `index.html`, insert the `<div id="pwa-install-banner">` HTML strip immediately after the closing `</header>` tag and before the AdSense placeholder div; set `style="display:none"` by default
  - The banner must contain: a `<span>` with text "📲 Install FinCalcHub App for instant access", an `<button id="pwa-install-btn">Install</button>` button, and a dismiss `<button>` with "✕" that sets `display:none` on the banner and clears `window.deferredPrompt`
  - In the inline `<script>`, update the existing `window.addEventListener('beforeinstallprompt', ...)` handler to also set `document.getElementById('pwa-install-banner').style.display = 'flex'` when the event fires (keep the existing `installBtn` and `installHint` logic intact)
  - Add an async click handler on `pwa-install-btn` that calls `window.deferredPrompt.prompt()`, awaits `userChoice`, hides the banner, and sets `window.deferredPrompt = null`; guard with `if (!window.deferredPrompt) return`
  - The banner must be styled with `background: rgba(99,102,241,0.15)` and `border-bottom: 1px solid rgba(99,102,241,0.3)` using inline styles (not Tailwind, to avoid CDN dependency for the banner itself)
  - _Requirements: 25.1, 25.2, 25.3, 25.4, 25.5, 25.6, 25.7_

- [~] 32. Fix CoinGecko fetchCrypto() crash recovery in index.html

  - In `index.html`'s inline `<script>`, locate the existing `fetchCrypto()` async function
  - Wrap the entire body of the function (from the `fetch(...)` call through all response-processing code) inside a `try { ... } catch (err) { ... }` block; do NOT rethrow in the catch
  - In the catch block:
    - If `Object.keys(prices).length === 0` (first-load failure with no cached data): seed `prices` from `BASE_USD_RATES` by multiplying each value by `GlobalCurrencyRates[activeCurrency] || 1`, then call `renderCrypto()`
    - If prices already has data (subsequent failure): do nothing to prices — keep existing data
    - Update the `apiStatus` badge: set its text to "Market (Cached)" and swap any `text-emerald-*` or `text-green-*` classes to `text-amber-400`; apply the same swap to the live-dot element preceding the badge
  - Verify the existing try/catch in `checkAndFetch()` (if present) is not removed
  - _Requirements: 26.1, 26.2, 26.3, 26.4, 26.5, 26.6_

- [~] 33. Update faq.html, privacy.html, and terms.html — navigation sync, manifest fix, contrast tweaks

  - For each of `faq.html`, `privacy.html`, and `terms.html`:
    - **Navigation:** Find any `<nav>` or footer link list that references calculator tools; add three new link entries for the new tools: RoAS Planner (`href="index.html"` or `href="index.html#roas"`), Invoice Tracker, and A/B Test Engine. If no tool link list exists, add a brief "New Tools:" inline mention in the footer or nav
    - **Manifest link:** Find `<link rel="manifest" href="manifest.json">` and change to `<link rel="manifest" href="/manifest.json">`
    - **Contrast tweak 1:** Find `<p` elements with `text-[10px] text-slate-500 mt-3 text-center` and change `text-slate-500` to `text-slate-300`
    - **Contrast tweak 2:** Find `<div` elements with class containing `bg-slate-900/40 rounded-xl` and change `bg-slate-900/40` to `bg-slate-900/80`
    - **Contrast tweak 3:** Find the `<body` tag's class and change `text-slate-100` to `text-slate-50`
    - **Contrast tweak 4:** Find `<p` with `text-[10px] text-slate-500` (without `mt-3 text-center`) and change to `text-slate-400`
    - **Contrast tweak 5:** Find `<div class="px-4 py-2 bg-slate-900/40"` and change to `bg-slate-950/80`
    - **Contrast tweak 6:** Find `<p class="text-[10px] text-slate-500" id="installHint"` and change to `text-slate-300`
  - Apply only tweaks that are relevant to each file — skip any that don't match
  - _Requirements: 27.1, 27.2, 27.3_

- [~] 34. Final checkpoint — Full 13-tool verification

  - Open `index.html` in a browser. Verify all 13 tabs display in the correct order. Enter values into the RoAS, Invoice, and A/B Test tools and confirm outputs are calculated correctly. Refresh the page and confirm all entered values are restored and outputs recalculate automatically. Close the tab, reopen, confirm sessionStorage is cleared and defaults are shown. Verify the PWA banner appears if opened on a supported browser. Verify the Crypto converter shows "Market (Cached)" amber status if network is blocked. Verify that faq.html, privacy.html, and terms.html load without errors and the new tool references appear in navigation. Ask the user if questions arise.

- Tasks 25–28 are `index.html`-only — the three new tools do NOT need to be added to `tools.html` (that file is kept at 13 tools)
- Task 30 (sessionStorage) is `index.html`-only — the delegated listeners must not interfere with `tools.html`
- The three new tools (roas, invoice, abtest) must call `saveHistory(...)` at the end of each calc function to integrate with the existing LocalStorage history system from Task 3
- `triggerAllActiveCalculators()` uses function-name strings to call via `window[fn]` — ensure all 13 calc function names are spelled exactly as defined (case-sensitive): `calcRoAS`, `calcInvoice`, `calcABTest`, `fetchCrypto`, `calcCI`, `calcSIP`, `calcTax`, `calcSavings`, `calcRetire`, `calcProfit`, `calcFL`, `calcSaaS`, `calcEC`
- Task 31 (PWA banner) updates the existing `beforeinstallprompt` handler — do NOT remove the existing `installBtn` and `installHint` logic; the banner is additive
- Task 32 (fetch crash recovery) wraps the existing logic in try/catch — do NOT rewrite the fetch logic, only wrap it
- Property tests 26.1, 27.1, 28.1, 30.1, 30.2 are optional and marked with `*`; they can be skipped for faster delivery


## Critical Implementation Notes for Remaining Tasks

### Task 25 (Tab Bar Rebuild)
The existing tab bar has 13 buttons. Insert the 3 new buttons AFTER `id="tab-crypto"` and BEFORE `id="tab-compound"`. Do NOT modify the Tailwind CSS classes — use identical classes to the existing inactive tab buttons.

### Task 26–28 (New Tool HTML Blocks)
Insert the three new tool `<div id="roas">`, `<div id="invoice">`, `<div id="abtest">` blocks in the main content area AFTER the closing `</div>` of the Crypto tool block and BEFORE the opening `<div id="compound"`. Each block must include:
- The three-button export group calling `downloadPDF('roas')` / `downloadCSV('roas')` / `downloadXLSX('roas')` (and equivalents for invoice/abtest)
- The TOOL_LABELS map in the `<script>` block must be extended with: `roas:'RoAS Planner', invoice:'Invoice Tracker', abtest:'A/B Test Engine'`
- `saveHistory()` call at end of each calc function

### Task 30 (SessionStorage)
The correct function names for `triggerAllActiveCalculators()` are (case-sensitive):
`calcRoAS`, `calcInvoice`, `calcABTest`, `fetchCrypto`, `calcCI`, `calcSIP`, `calcTax`, `calcSG`, `calcRT`, `calcPM`, `calcFL`, `calcSaaS`, `calcEC`
Note: savings = `calcSG`, retirement = `calcRT`, profit margin = `calcPM` (matching actual function names in the file).

### Task 32 (Fetch Crash Recovery)
The existing `fetchCrypto()` already has a try/catch. The only missing piece is seeding `prices` from fallback rates on first-load failure. The fallback rates are already defined in the `initFallbackRates()` IIFE at the top of the script — access them via the `prices` object populated by that IIFE (it already runs before fetchCrypto is ever called). This means on first-load failure, `prices` is actually already populated by `initFallbackRates()`, so the status badge update is the primary remaining fix.

### Task 33 (Subpage Updates)
`faq.html`, `privacy.html`, and `terms.html` have simple headers with just a logo and "← Home" link — no tool navigation list exists. The navigation update means: add a brief tools section to the footer of each file linking to the 3 new tools on index.html (e.g., `<a href="index.html#roas">RoAS Planner</a>`). The manifest fix (`manifest.json` → `/manifest.json`) is the most important change.

- [ ] 35. Extend TOOL_LABELS map and wire export buttons for new tools

  - In `index.html`'s inline `<script>`, locate the `TOOL_LABELS` object (currently has 13 entries)
  - Add three new entries: `roas:'RoAS Planner', invoice:'Invoice Tracker', abtest:'A/B Test Engine'`
  - After Tasks 26–28 are complete and the three tool HTML blocks exist, verify that clicking the PDF/CSV/XLSX buttons on each new tool produces a correctly labeled file download
  - _Requirements: 28.3, 28.4_

- [ ] 36. Verify tools.html parity — confirm it has exactly 13 tools and matching export buttons

  - Open `tools.html` and verify it has the same 13 tools as `index.html` (crypto, compound, sip, tax, savings, retirement, profit, freelancer, saas, ecom) — no roas/invoice/abtest (those are index.html-only)
  - Verify tools.html has the three-button export groups on all 13 tools (if Task 21 applied to tools.html)
  - If tools.html is missing the export buttons, apply the same three-button group pattern from Task 21 to tools.html
  - _Requirements: 10.1, 28.1_

- [ ] 37. Apply subpage manifest and contrast fixes across all static pages

  - For `faq.html`, `privacy.html`, and `terms.html`:
    - Change `href="manifest.json"` to `href="/manifest.json"` in `<head>`
    - Change `<body class="...text-slate-100...">` to `text-slate-50`
    - Add footer links to the 3 new tools: `<a href="index.html#roas">RoAS Planner</a>`, `<a href="index.html#invoice">Invoice Tracker</a>`, `<a href="index.html#abtest">A/B Test Engine</a>`
  - _Requirements: 27.1, 27.2, 27.3_
