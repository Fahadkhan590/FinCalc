# Requirements Document

## Introduction

FinCalcHub Enhancement Project adds multiple modules of improvements to the existing pure client-side, single-file HTML financial calculator suite (`index.html` with 13 tools (10 existing + 3 new: RoAS Planner, Invoice Tracker, A/B Test Engine), `tools.html` with 10 tools). All enhancements must work without any backend, npm, or build step. The stack is vanilla JavaScript, HTML5, and inlined Tailwind CSS v4, with external libraries loaded via CDN only.

The eight modules are:
1. **Client-Side Persistence & Universal PDF Engine** — localStorage history sidebar and jsPDF export for every tool
2. **Core Calculator Upgrades** — SaaS ARPU display, E-Com LTV/CAC fields, Income Tax regional dropdown
3. **Trust & Transparency UI** — Formula accordions per tool and a sticky privacy badge
4. **Look & Feel (UI/UX)** — Emoji headers and responsive mobile grid fixes
5. **Three New High-Retention Tools (RoAS Planner, Invoice Tracker, A/B Test Engine)** — inserted at tab positions 2, 3, 4 in `index.html`
6. **SessionStorage Input Persistence Engine** — auto-save and restore all input values across page refreshes within the same browser session
7. **PWA Install Banner Refinement & Crypto Fetch Crash Recovery** — dismissible install banner on `beforeinstallprompt` and graceful fallback to cached rates on API failure
8. **Content Page Navigation Sync** — updated header navigation and PWA manifest links in `faq.html`, `privacy.html`, and `terms.html`

## Glossary

- **App**: The FinCalcHub application running in the browser (either `index.html` or `tools.html`)
- **Tool**: A single named financial calculator within the tab-based interface (e.g., "Crypto", "SaaS", "Tax")
- **Tool_Container**: The outermost `<div>` wrapping a single tool's inputs and outputs
- **History_Drawer**: The collapsible sidebar/sticky panel that displays recent calculation results
- **History_Entry**: A single saved record containing tool name, timestamp, inputs snapshot, and key output values
- **PDF_Engine**: The `exportToolToPDF` JavaScript function that generates a report via jsPDF
- **Privacy_Badge**: The fixed-position footer banner stating that all calculations run locally
- **Formula_Accordion**: The `<details>/<summary>` element placed below each tool's output section
- **Tax_Slab_Set**: The array of bracket rules used to compute income tax for a specific region and tax year
- **ARPU**: Average Revenue Per User — computed as MRR divided by number of customers
- **LTV**: Customer Lifetime Value — computed as ARPU divided by Churn Rate (churn-based) or as Net Revenue × Lifespan (lifespan-based)
- **CAC**: Customer Acquisition Cost — marketing spend divided by new customers acquired
- **MRR**: Monthly Recurring Revenue per customer
- **jsPDF**: The open-source JavaScript PDF generation library loaded from unpkg.com CDN
- **LocalStorage**: The browser's `window.localStorage` key-value store, used for persisting history
- **Scenario_Comparison**: A side-by-side "What-If" mode in which two independent sets of inputs for the same tool are calculated and displayed simultaneously in adjacent colored cards with a delta row showing the difference
- **Widget_Mode**: A compact rendering mode activated by the URL parameter `?widget=1` that hides all chrome (header, footer, sidebar, tab bar, privacy badge) and renders only the active tool in a minimal card, intended for iframe embedding by third-party sites
- **Deep_Link**: A shareable URL that encodes all current input field values of a tool as query parameters, enabling any visitor who loads the URL to have the tool auto-populated and the calculation run automatically
- **RoAS**: Return on Ad Spend — computed as Total Revenue divided by Total Ad Spend
- **Break-Even RoAS**: The minimum RoAS required to cover all costs — computed as (Ad Spend + COGS) / Ad Spend
- **Pacing Status**: A real-time campaign budget health indicator comparing actual spend against the expected spend based on daily budget × days elapsed
- **Z-Score**: A statistical measure of how many standard deviations the difference between two proportions is from zero; used to determine significance in A/B testing
- **Confidence Level**: The probability (expressed as a percentage) that the observed difference between A/B variants is not due to chance; derived from the Z-score
- **SessionStorage**: The browser's `window.sessionStorage` key-value store; identical API to localStorage but automatically cleared when the browser tab is closed
- **triggerAllActiveCalculators**: A global function that calls every tool's compute function inside a `typeof` existence guard, used on page load to recalculate outputs after sessionStorage value restoration
- **PWA_Install_Banner**: A dismissible full-width strip shown when the browser fires the `beforeinstallprompt` event, allowing users to install the app to their home screen

---

## Requirements

### Requirement 1: LocalStorage Calculation History

**User Story:** As a user, I want to see my last 5 calculation results for each tool, so that I can review or compare previous inputs without re-entering values.

#### Acceptance Criteria

1. WHEN a user completes a calculation by triggering any tool's compute function, THE App SHALL save a History_Entry to LocalStorage under a key namespaced by tool name (e.g., `fch_history_saas`).
2. THE History_Drawer SHALL display the 5 most recent History_Entry records for the currently active tool, ordered newest-first.
3. WHEN a History_Entry is saved and the stored list already contains 5 entries, THE App SHALL remove the oldest entry before appending the new one, maintaining a maximum of 5 entries per tool.
4. WHEN a user clicks the "Clear History" button inside the History_Drawer, THE App SHALL remove all History_Entry records for the active tool from LocalStorage and update the History_Drawer to show an empty state message.
5. WHEN a user switches to a different tool tab, THE History_Drawer SHALL update its displayed entries to show the history for the newly active tool.
6. WHEN the page is loaded or refreshed, THE App SHALL read existing History_Entry records from LocalStorage and populate the History_Drawer without requiring a new calculation.
7. IF LocalStorage is unavailable or throws a security exception, THEN THE App SHALL silently skip history persistence and continue operating normally.

---

### Requirement 2: Universal PDF Export

**User Story:** As a user, I want to download a formatted PDF report of any tool's current calculation, so that I can save, share, or print the results.

#### Acceptance Criteria

1. THE App SHALL load jsPDF from the CDN URL `https://unpkg.com/jspdf@latest/dist/jspdf.umd.min.js` via a `<script>` tag before the closing `</body>` tag.
2. THE App SHALL expose a function `exportToolToPDF(toolName, inputs, outputs)` that generates and triggers a browser download of a PDF file named `{toolName}-report.pdf`.
3. WHEN `exportToolToPDF` is called, THE PDF_Engine SHALL include a bold header line containing the tool emoji and tool name in the top-left corner.
4. WHEN `exportToolToPDF` is called, THE PDF_Engine SHALL include the current timestamp formatted as `YYYY-MM-DD HH:MM` in the top-right corner of the header area.
5. WHEN `exportToolToPDF` is called, THE PDF_Engine SHALL render a two-column layout with "Input Variables" on the left column and "Financial Outputs" on the right column.
6. WHEN `exportToolToPDF` is called, THE PDF_Engine SHALL include a footer line on every page stating: "Generated privately via FinCalcHub.xyz. No data was transmitted or saved on a server."
7. WHEN a user clicks the "📄 Download PDF Report" button on any Tool_Container, THE App SHALL gather the current input values and computed output values for that tool and invoke `exportToolToPDF` with the correct arguments.
8. THE App SHALL add a "📄 Download PDF Report" button to every Tool_Container in both `index.html` and `tools.html`.
9. IF jsPDF fails to load from the CDN, THEN THE App SHALL display an inline error message stating "PDF export unavailable — please check your internet connection." when the download button is clicked.

---

### Requirement 3: SaaS Tool — ARPU Display and Churn-Based LTV Path

**User Story:** As a SaaS founder, I want to see ARPU clearly displayed and have LTV calculated from ARPU / Churn Rate, so that I can evaluate my business using the industry-standard formula.

#### Acceptance Criteria

1. WHEN the SaaS tool inputs change, THE App SHALL compute ARPU as `MRR_per_customer` and display it in a dedicated output card labelled "ARPU".
2. WHEN the SaaS tool inputs change and Churn Rate is greater than 0, THE App SHALL compute a Churn-Based LTV as `ARPU / (Churn Rate / 100)` and display it alongside the existing Lifespan-Based LTV.
3. WHEN the SaaS tool inputs change and Churn Rate is 0, THE App SHALL display the Churn-Based LTV as "∞" to indicate infinite retention.
4. THE SaaS tool output section SHALL label both LTV values distinctly: "LTV (Lifespan)" for the existing formula and "LTV (Churn)" for the churn-based formula.
5. WHILE the Churn-Based LTV is displayed, THE App SHALL use the higher of the two LTV values when computing the LTV:CAC ratio in the existing ratio output field.

---

### Requirement 4: E-Commerce Tool — CAC, ARPU, Churn Rate, and LTV Fields

**User Story:** As an e-commerce operator, I want to enter CAC, ARPU, and Churn Rate in my profit calculator so that I can see LTV and the LTV:CAC ratio alongside the existing net profit output.

#### Acceptance Criteria

1. THE E-Com tool SHALL add three new input fields: "CAC (Customer Acquisition Cost, per unit)" accepting a monetary value, "ARPU (Avg Revenue per Order)" accepting a monetary value, and "Churn Rate (% repeat customers lost)" accepting a percentage.
2. WHEN the E-Com tool inputs change and both ARPU and Churn Rate are provided with Churn Rate greater than 0, THE App SHALL compute LTV as `ARPU / (Churn Rate / 100)` and display it in a dedicated output card labelled "LTV".
3. WHEN the E-Com tool inputs change and CAC is greater than 0 and LTV is computed, THE App SHALL compute LTV:CAC ratio as `LTV / CAC` and display it in a dedicated output card labelled "LTV:CAC".
4. WHEN Churn Rate is 0, THE App SHALL display LTV as "∞" and LTV:CAC as "∞".
5. IF ARPU or Churn Rate is not provided or is zero in an invalid combination, THEN THE App SHALL leave the LTV and LTV:CAC output cards showing "—" without triggering a JavaScript error.
6. THE existing Net Profit, Net Margin, and Total Costs outputs SHALL remain unchanged by the new fields.

---

### Requirement 5: Income Tax Tool — Tax Year / Region Dropdown

**User Story:** As a user in different countries or tax years, I want to select my tax year and region from a dropdown, so that the correct tax slab set is applied to my income calculation.

#### Acceptance Criteria

1. THE Income Tax tool SHALL display a "Tax Year / Region" `<select>` dropdown above the existing monthly income and category inputs, as the first visible input element of the tool.
2. THE dropdown SHALL contain exactly these four options in this order: "Pakistan FY2025-26 (Current)", "Pakistan FY2024-25", "India FY2025-26 (Placeholder)", "US Federal 2024 (Placeholder)".
3. WHEN a user selects "Pakistan FY2025-26 (Current)", THE App SHALL apply the FBR salaried and business slabs already implemented in `calcTax()` for FY2025-26.
4. WHEN a user selects "Pakistan FY2024-25", THE App SHALL apply a distinct Tax_Slab_Set for FY2024-25 Pakistan FBR brackets.
5. WHEN a user selects "India FY2025-26 (Placeholder)" or "US Federal 2024 (Placeholder)", THE App SHALL display all monetary output fields as "—" and show a tooltip or notice text "Coming soon" adjacent to those dropdown options without triggering a calculation error.
6. WHEN the dropdown value changes, THE App SHALL immediately re-run the tax calculation using the newly selected Tax_Slab_Set without requiring any other user action.
7. THE dropdown selection SHALL default to "Pakistan FY2025-26 (Current)" on page load.

---

### Requirement 6: Formula Accordion per Tool

**User Story:** As a user, I want to see the exact mathematical formula used by each tool, so that I can verify the calculation methodology and trust the results.

#### Acceptance Criteria

1. THE App SHALL add a `<details>` / `<summary>` accordion element below the output section of every tool in both `index.html` and `tools.html`.
2. THE summary label of every accordion SHALL read "📐 View Mathematical Formula".
3. THE accordion body SHALL contain the tool's primary formula displayed inside a `<code>` element styled with monospace font, dark background, and appropriate padding.
4. WHEN a user clicks the summary element, THE browser's native `<details>` toggle behavior SHALL reveal or hide the formula content without requiring any custom JavaScript.
5. THE accordion SHALL be collapsed (closed) by default on page load.
6. THE formula content SHALL be accurate for the tool's core calculation (e.g., for Compound Interest: `A = P(1 + r/n)^(nt) + PMT × [(1 + r/n)^(nt) - 1] / (r/n)`).

---

### Requirement 7: Sticky Privacy Badge

**User Story:** As a user, I want to see a persistent privacy assurance banner, so that I can trust that my financial data never leaves my device.

#### Acceptance Criteria

1. THE App SHALL render a Privacy_Badge as a fixed-position element with a high z-index (at minimum z-index: 40) that remains visible while scrolling.
2. THE Privacy_Badge SHALL be positioned as a horizontal banner near the bottom of the viewport, above the main page footer and above the existing floating action buttons.
3. THE Privacy_Badge SHALL display the text: "🔒 100% Secure & Private. All calculations happen inside your browser's RAM. Your data never leaves this device."
4. THE Privacy_Badge SHALL use a dark background color consistent with the existing slate-800/slate-900 color palette and include a visible green lock icon or emoji.
5. THE Privacy_Badge SHALL be present in both `index.html` and `tools.html`.
6. THE Privacy_Badge SHALL NOT obstruct the tab navigation bar or the main tool input/output area when the page is scrolled to the top.

---

### Requirement 8: Emoji Headers on All Tool Titles

**User Story:** As a user, I want every tool's heading to prominently display its emoji symbol, so that I can quickly identify tools visually without reading the full title.

#### Acceptance Criteria

1. THE App SHALL ensure that every tool's `<h2>` heading element contains its associated emoji symbol as a visible prefix.
2. WHERE a tool's `<h2>` already includes its emoji (e.g., "💼 Freelancer Hourly Rate Calculator"), THE App SHALL leave that heading unchanged.
3. WHERE a tool's `<h2>` is missing its emoji (e.g., "Compound Interest Calculator" without "📈"), THE App SHALL prepend the correct emoji followed by a space.
4. THE emoji prefix SHALL use the same emoji displayed on the tool's tab button for visual consistency.

---

### Requirement 9: Responsive Mobile Grid Layouts

**User Story:** As a mobile user, I want all tool input grids to stack into a single column on small screens and expand to two or three columns on larger screens, so that inputs are fully readable and tappable on any device.

#### Acceptance Criteria

1. THE App SHALL ensure all tool input `<div class="grid ...">` containers use at minimum `grid-cols-1 sm:grid-cols-2` responsive classes.
2. WHERE a tool has exactly 3 inputs per logical row (e.g., SIP: Monthly, Return, Years), THE App SHALL use `grid-cols-1 sm:grid-cols-3` for that grid.
3. WHERE a tool currently uses a non-responsive fixed `grid-cols-2` or `grid-cols-3` class without a `sm:` breakpoint prefix, THE App SHALL update the class to include the `grid-cols-1` base and the appropriate `sm:` breakpoint variant.
4. WHEN the viewport width is below 640px (the Tailwind `sm` breakpoint), THE App SHALL render all input grids as single-column layouts, ensuring each label and input field occupies its own full-width row.

---

### Requirement 10: tools.html Tool Set Parity Fix

**User Story:** As a user navigating between the main page and the tools page, I want both pages to present exactly the same set of 10 tools, so that I am not confused by tools that exist on one page but not the other.

#### Acceptance Criteria

1. THE `tools.html` file SHALL contain exactly the same 10 tools as `index.html`: Crypto, Compound Interest, SIP, Income Tax, Savings, Retirement, Profit Margin, Freelancer, SaaS, and E-Com.
2. THE `tools.html` file SHALL NOT contain the Mortgage tab button, the `<div id="mortgage">` content block, or any `calcMort()` function reference.
3. THE `tools.html` file SHALL NOT contain the CPM/ROI tab button, the `<div id="cpm">` content block, or any `calcCPM()` function reference.
4. WHEN the Mortgage and CPM/ROI content blocks are removed from `tools.html`, THE `switchTab()` and `recalcAll()` functions in `tools.html` SHALL be updated to remove any references to those two tools.
5. THE `<title>` element in `tools.html` SHALL be updated to replace any occurrence of "12" with "10" in the title text.
6. THE `<meta name="description">` tag in `tools.html` SHALL be updated so that it no longer references "12 tools", "Mortgage", or "CPM/ROI", and instead accurately describes the 10 tools present.
7. THE visible header subtitle in `tools.html` (the `<p>` element reading "All 12 Tools · fincalchub.xyz") SHALL be updated to read "All 10 Tools · fincalchub.xyz".
8. IF `sitemap.xml` contains a description or metadata entry for `tools.html` that references 12 tools, THEN THE sitemap entry SHALL be updated to reflect 10 tools.

---

### Requirement 11: Smart Scenario Comparison (What-If Mode)

**User Story:** As a user, I want to compare two sets of inputs side-by-side for any tool without switching tabs or re-entering values, so that I can evaluate two financial scenarios at a glance.

#### Acceptance Criteria

1. THE App SHALL add a "⚖️ Compare Scenarios" toggle button to every Tool_Container in both `index.html` and `tools.html`.
2. WHEN the "⚖️ Compare Scenarios" button is toggled on, THE App SHALL display a second column of input fields alongside the original inputs for the active tool.
3. WHEN both input columns are visible, THE App SHALL calculate each column's inputs independently and display their results in adjacent output cards: the first (original) column's result card styled in blue and the second column's result card styled in orange.
4. WHEN both results are displayed, THE App SHALL render a delta row beneath the result cards showing the absolute difference and the percentage difference between the two outputs.
5. WHEN the "⚖️ Compare Scenarios" button is toggled off, THE App SHALL hide the second column and the delta row, restoring the single-column layout.
6. THE Scenario_Comparison feature SHALL be implemented using only HTML and vanilla JavaScript, with no external libraries.

---

### Requirement 12: Live Financial News Ticker

**User Story:** As a user, I want to see a live scrolling financial news ticker on the page so that I can stay informed about market events while using the calculators.

#### Acceptance Criteria

1. THE App SHALL render a horizontally scrolling news ticker strip directly below the tab bar and above the main tool content area in both `index.html` and `tools.html`.
2. WHEN the page loads, THE App SHALL attempt to fetch finance-relevant headlines from a free RSS-to-JSON or news API endpoint.
3. WHEN the API response is successful, THE Ticker SHALL display the fetched headlines scrolling continuously using a CSS `@keyframes scroll` animation with a cycle duration of approximately 30 seconds.
4. IF the API request fails or returns no usable data, THEN THE App SHALL display a set of exactly 5 hardcoded financial tips as fallback ticker content, ensuring the ticker is never empty.
5. WHEN a user clicks a ticker headline item, THE App SHALL open the associated article URL in a new browser tab.
6. THE ticker animation SHALL be implemented using only CSS `@keyframes` and shall not require any JavaScript animation loop.

---

### Requirement 13: Shareable Calculation URL (Deep Linking)

**User Story:** As a user who has completed a calculation, I want to generate and copy a shareable URL that encodes all my input values, so that I can send it to others who will see the same pre-filled calculation when they open the link.

#### Acceptance Criteria

1. WHEN a user completes a calculation on any tool, THE App SHALL display a "🔗 Share This Calculation" button below the primary result card for that tool.
2. WHEN the user clicks the "🔗 Share This Calculation" button, THE App SHALL construct a Deep_Link URL using `URLSearchParams` to encode all current input field values for that tool as query parameters (e.g., `?tool=compound&p=100000&r=10&t=10`).
3. WHEN the Deep_Link URL is constructed, THE App SHALL copy it to the clipboard using `navigator.clipboard.writeText()` and display a brief confirmation message (e.g., "Link copied!") near the button.
4. WHEN a visitor loads the App with valid tool query parameters in the URL, THE App SHALL automatically switch to the specified tool, populate all input fields with the decoded parameter values, and run the calculation immediately.
5. IF `navigator.clipboard` is unavailable, THEN THE App SHALL display the generated URL in a temporary text field near the button so the user can copy it manually.
6. THE Deep_Link feature SHALL use only `URLSearchParams` and `navigator.clipboard` with no external libraries.

---

### Requirement 14: Animated Results and Micro-Interactions

**User Story:** As a user, I want the result values to animate smoothly when they update and the interface to respond with subtle visual feedback, so that the application feels polished and engaging.

#### Acceptance Criteria

1. WHEN any tool's primary output value changes (on every `calcXxx()` call), THE App SHALL animate the numeric display using a count-up effect that transitions from 0 to the computed value over a duration of 600 milliseconds using `requestAnimationFrame`.
2. WHEN a result card is updated, THE App SHALL apply a brief green glow flash animation to the result card element to confirm the update visually.
3. WHEN a tab button is clicked, THE App SHALL display a subtle ripple effect on the clicked tab button.
4. THE count-up animation SHALL be implemented as a reusable `animateValue(elementId, fromVal, toVal, duration)` utility function available globally in both files.
5. THE animated result feature SHALL be implemented using only `requestAnimationFrame` and CSS transitions, with no external animation libraries.

---

### Requirement 15: Embeddable Widget Mode

**User Story:** As a developer or blogger, I want to embed a single FinCalcHub tool in an iframe on my website by appending `?widget=1` to the URL, so that my readers can use the calculator without leaving my page.

#### Acceptance Criteria

1. WHEN the App loads and the URL contains the query parameter `?widget=1`, THE App SHALL activate Widget_Mode before first paint by detecting the parameter inside a synchronous `<script>` tag in `<head>`.
2. WHEN Widget_Mode is active, THE App SHALL hide the page header, footer, sidebar, Privacy_Badge, and tab bar, showing only the currently active tool in a minimal card.
3. WHEN Widget_Mode is active, THE App SHALL inject a `<meta name="robots" content="noindex">` tag into `<head>` to prevent widget-mode URLs from being indexed by search engines.
4. WHEN Widget_Mode is active and a `?tool=` parameter is also present in the URL, THE App SHALL display the specified tool automatically.
5. THE Widget_Mode detection SHALL occur synchronously before any DOM rendering to prevent a visible layout flash on page load.
6. THE Widget_Mode feature SHALL require no external libraries and SHALL use only standard DOM manipulation APIs.

---

### Requirement 16: CSV and XLSX Data Export

**User Story:** As a user, I want to export any tool's current calculation to CSV or Excel format so that I can analyze results in a spreadsheet.

#### Acceptance Criteria

1. THE App SHALL load SheetJS (XLSX) from CDN `https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js` via a `<script defer>` tag in both `index.html` and `tools.html`, placed immediately after the existing jsPDF `<script>` tag.
2. THE App SHALL expose `exportToolToCSV(toolName, inputs, outputs)` that creates a two-section CSV (inputs block first, outputs block second), each section as two-column key/value rows with a header comment line `# {toolName} Export - {timestamp}`, and triggers a browser download of `{toolName}-data.csv`.
3. THE App SHALL expose `exportToolToXLSX(toolName, inputs, outputs)` that uses SheetJS to create a workbook with two sheets ("Inputs" and "Outputs") — each sheet having two columns (Field, Value, one row per entry) — and triggers a browser download of `{toolName}-data.xlsx`.
4. THE App SHALL add three export buttons to every Tool_Container in both files: "📄 PDF", "📊 CSV", "📗 XLSX" — grouped in a single styled row using `flex gap-2 mt-4`, each button using `flex-1 py-2 px-3 rounded-xl font-semibold text-xs text-white` with distinct gradient colors (PDF: indigo-to-purple, CSV: emerald-to-cyan, XLSX: amber-to-orange).
5. IF SheetJS fails to load, THEN clicking the CSV or XLSX buttons SHALL display an alert stating "Export unavailable — please check your internet connection."
6. THE three-button export group SHALL replace (not supplement) the single "📄 Download PDF Report" button from Requirement 2.8 — three buttons replace the one existing button on every Tool_Container.

---

### Requirement 17: Deferred Google Analytics Initialization

**User Story:** As a site owner, I want Google Analytics to initialize after the page is fully loaded so it doesn't block critical rendering paths.

#### Acceptance Criteria

1. THE `index.html` file SHALL wrap the inline gtag initialization block (`window.dataLayer`, `function gtag`, `gtag('js')`, `gtag('config')`) inside a `window.addEventListener('load', function() { ... })` callback so it runs only after full page load.
2. THE `tools.html` file SHALL add the same Google Tag Manager script tag and deferred inline init block as `index.html` (`tools.html` currently has no GTM at all).
3. THE gtag external script `src` tag SHALL retain the `defer` attribute it already has in `index.html` and SHALL also have `defer` in `tools.html`.
4. THE change SHALL eliminate the render-blocking analytics behavior flagged by PageSpeed Insights for `/gtag/js?id=G-4LEKFYK37L`.

---

### Requirement 18: Text Accessibility Color Contrast Improvements

**User Story:** As a user with visual impairments, I need sufficient color contrast on all text elements to read the interface comfortably.

#### Acceptance Criteria

1. In both files, any `<p>` element with class `text-[10px] text-slate-500 mt-3 text-center` (CoinGecko ticker attribution row) SHALL have `text-slate-500` changed to `text-slate-300`.
2. In both files, the Crypto Converter secondary card `<div>` with class containing `bg-slate-900/40 rounded-xl sm:rounded-2xl p-4 border border-slate-700/40` SHALL have `bg-slate-900/40` changed to `bg-slate-900/80`.
3. In both files, the `<body>` tag's class attribute SHALL have `text-slate-100` changed to `text-slate-50` for higher global text contrast.
4. In both files, any inline real-time status `<p>` elements with class `text-[10px] text-slate-500` (without `mt-3 text-center`) SHALL have `text-slate-500` changed to `text-slate-400`.
5. In both files, the system info banner `<div>` with class `px-4 py-2 bg-slate-900/40` SHALL have `bg-slate-900/40` changed to `bg-slate-950/80`.
6. In both files, the install hint element `<p class="text-[10px] text-slate-500" id="installHint">` SHALL have `text-slate-500` changed to `text-slate-300`.

---

### Requirement 19: PWA Manifest Icon Link Verification

**User Story:** As a mobile user installing the app to my home screen, I want the correct branded icon to appear instead of a browser placeholder.

#### Acceptance Criteria

1. Both `index.html` and `tools.html` SHALL contain `<link rel="manifest" href="/manifest.json">` (absolute path with leading slash) in the `<head>` block — both files currently use `href="manifest.json"` (relative path) and SHALL be updated to `/manifest.json` for proper PWA root-relative resolution.
2. THE `manifest.json` SHALL contain both a `192x192` size entry and a `512x512` size entry for the branded SVG icon (currently only one combined entry exists — a separate `192x192` entry SHALL be added).
3. THE `manifest.json` SHALL include `"prefer_related_applications": false` as a top-level key to ensure the web app is offered for installation.

---

### Requirement 20: Tab Bar & Tool Directory Reconstruction (13 Tools)

**User Story:** As a user, I want all 13 tools to appear in the tab bar in a specific order so that I can navigate to any calculator quickly.

#### Acceptance Criteria

1. THE `index.html` tab bar SHALL display exactly 13 tools in this order:
   1. ₿ Crypto Converter (existing, `id="crypto"`)
   2. 📊 Daily Media Buyer RoAS Planner (NEW, `id="roas"`)
   3. 📝 Client Invoice Hours & Bench Tracker (NEW, `id="invoice"`)
   4. 💥 A/B Split-Test Significance Engine (NEW, `id="abtest"`)
   5. 📈 Compound Interest Tool (`id="compound"`)
   6. 💰 SIP Calculator (`id="sip"`)
   7. 🏛️ Income Tax Estimator (`id="tax"`)
   8. 🎯 Savings Planner (`id="savings"`)
   9. 🏖️ Retirement Suite (`id="retirement"`)
   10. 💹 Margin/Markup Tool (`id="profit"`)
   11. 💼 Freelancer Rate Calculator (`id="freelancer"`)
   12. 🚀 SaaS CAC/LTV Engine (`id="saas"`)
   13. 🛒 E-Com Profit Calculator (`id="ecom"`)
2. EACH new tool's tab button SHALL display its emoji and a short label: "RoAS" for the planner, "Invoice" for the tracker, "A/B Test" for the significance engine.
3. THE `switchTab()` function SHALL be updated to include the three new tool IDs: `roas`, `invoice`, `abtest`.
4. THE `recalcAll()` function SHALL be updated to include calls to `calcRoAS()`, `calcInvoice()`, and `calcABTest()`.
5. THE subtext/description displayed for each new tool inside its Tool_Container SHALL match exactly:
   - RoAS Planner: "Calculate real-time Return on Ad Spend (RoAS), track break-even margins, and monitor daily campaign spending vs revenue fluctuations"
   - Invoice Tracker: "Log daily billable hours, project upcoming invoice totals, and track month-to-date freelance earnings cuts cleanly"
   - A/B Test Engine: "Compare data variations across performance funnels to calculate statistical confidence and verify metric changes"

---

### Requirement 21: Daily Media Buyer RoAS Planner — Full Calculator

**User Story:** As a media buyer, I want to enter my ad spend, revenue, cost of goods, and campaign budget so that I can see my RoAS, net profit margin, break-even RoAS, and daily pacing status at a glance.

#### Acceptance Criteria

1. THE RoAS tool (`id="roas"`) SHALL have the following input fields:
   - "Total Ad Spend" (`id="roas-spend"`, monetary, default 10000)
   - "Total Revenue Generated" (`id="roas-revenue"`, monetary, default 35000)
   - "Cost of Goods Sold (COGS)" (`id="roas-cogs"`, monetary, default 8000)
   - "Daily Campaign Budget" (`id="roas-budget"`, monetary, default 500)
   - "Days Elapsed in Campaign" (`id="roas-days"`, integer, default 7)
2. WHEN inputs change, THE App SHALL compute and display:
   - "RoAS" = `Revenue / Ad Spend` (formatted to 2 decimal places with an "x" suffix, e.g. "3.50x")
   - "Net Profit" = `Revenue - Ad Spend - COGS` (monetary)
   - "Net Profit Margin %" = `Net Profit / Revenue × 100` (percentage, 2 decimal places)
   - "Break-Even RoAS" = `(Ad Spend + COGS) / Ad Spend` (formatted to 2 decimal places with "x" suffix)
   - "Spend to Date" = `Daily Budget × Days Elapsed` (monetary)
   - "Pacing Status" = compare Spend to Date vs actual Ad Spend: if actual > Spend to Date show "⚠️ Over Budget", if within 10% show "✅ On Track", else show "📉 Under Pacing"
3. WHEN Ad Spend is 0, THE App SHALL display all outputs as "—" without a JavaScript error.
4. THE tool SHALL include a `.tool-desc` description block and a formula accordion showing: `RoAS = Revenue ÷ Ad Spend | Break-Even RoAS = (Spend + COGS) ÷ Spend | Net Margin = Net Profit ÷ Revenue × 100`
5. THE tool SHALL include the three-button export group (PDF, CSV, XLSX) consistent with Requirement 16.

---

### Requirement 22: Client Invoice Hours & Bench Tracker — Full Calculator

**User Story:** As a freelancer, I want to log my billable hours, rate, platform cut, and tax rate so that I can see my gross invoice total, net take-home after cuts, and month-to-date earnings at a glance.

#### Acceptance Criteria

1. THE Invoice tool (`id="invoice"`) SHALL have the following input fields:
   - "Hourly Rate" (`id="inv-rate"`, monetary, default 5000)
   - "Hours Billed This Period" (`id="inv-hours"`, decimal, default 40)
   - "Platform / Agency Cut (%)" (`id="inv-platform"`, percentage, default 15)
   - "Tax Rate (%)" (`id="inv-tax"`, percentage, default 10)
   - "Additional Expenses (Deductions)" (`id="inv-expenses"`, monetary, default 0)
   - "Hours Billed Month-to-Date" (`id="inv-mtd-hours"`, decimal, default 120)
2. WHEN inputs change, THE App SHALL compute and display:
   - "Gross Invoice Total" = `Hourly Rate × Hours Billed` (monetary)
   - "Platform Deduction" = `Gross Invoice × (Platform Cut / 100)` (monetary)
   - "Tax Deduction" = `(Gross Invoice - Platform Deduction) × (Tax Rate / 100)` (monetary)
   - "Net Take-Home" = `Gross Invoice - Platform Deduction - Tax Deduction - Expenses` (monetary)
   - "Effective Net Rate / Hour" = `Net Take-Home / Hours Billed` (monetary per hour, 2 decimal places)
   - "MTD Earnings (Projected Net)" = `(Net Take-Home / Hours Billed) × MTD Hours` (monetary)
3. WHEN Hours Billed is 0, THE App SHALL display "—" for rate-dependent outputs without a JavaScript error.
4. THE tool SHALL include a `.tool-desc` description block and a formula accordion showing: `Gross = Rate × Hours | Net = Gross - Platform Cut - Tax - Expenses | MTD = (Net ÷ Hours) × MTD Hours`
5. THE tool SHALL include the three-button export group (PDF, CSV, XLSX).

---

### Requirement 23: A/B Split-Test Significance Engine — Full Calculator

**User Story:** As a marketer or analyst, I want to enter visitor counts and conversions for two variants so that I can see conversion rates, the Z-score, the statistical significance level, and a clear winner/loser verdict.

#### Acceptance Criteria

1. THE A/B Test tool (`id="abtest"`) SHALL have the following input fields:
   - "Variant A — Visitors" (`id="ab-a-visitors"`, integer, default 1000)
   - "Variant A — Conversions" (`id="ab-a-conv"`, integer, default 50)
   - "Variant B — Visitors" (`id="ab-b-visitors"`, integer, default 1000)
   - "Variant B — Conversions" (`id="ab-b-conv"`, integer, default 65)
2. WHEN inputs change, THE App SHALL compute and display:
   - "Conversion Rate A" = `Conversions A / Visitors A × 100` (percentage, 2 decimal places)
   - "Conversion Rate B" = `Conversions B / Visitors B × 100` (percentage, 2 decimal places)
   - "Relative Uplift" = `(Rate B - Rate A) / Rate A × 100` (percentage, 2 decimal places, prefixed with "+" if positive)
   - "Z-Score" using the two-proportion Z-test formula:
     `pooledP = (convA + convB) / (visitorsA + visitorsB)`
     `SE = sqrt(pooledP × (1 - pooledP) × (1/visitorsA + 1/visitorsB))`
     `Z = (rateB - rateA) / SE` (where rates are decimals, not percentages)
   - "Confidence Level" mapped from |Z|: ≥ 2.576 → "99%", ≥ 1.96 → "95%", ≥ 1.645 → "90%", else "< 90% (Not Significant)"
   - "Verdict" alert card: if confidence ≥ 95% and Z > 0 → "🏆 Variant B Wins", if confidence ≥ 95% and Z < 0 → "🏆 Variant A Wins", else → "⚖️ No Significant Difference — collect more data"
3. WHEN any visitor count is 0, THE App SHALL display "—" for Z-score and confidence without a JavaScript error.
4. THE tool SHALL include a `.tool-desc` description block and a formula accordion showing: `Z = (p̂B - p̂A) / √[p̂(1-p̂)(1/nA + 1/nB)]` where `p̂ = (xA+xB)/(nA+nB)`
5. THE tool SHALL include the three-button export group (PDF, CSV, XLSX).

---

### Requirement 24: SessionStorage Input Persistence Engine

**User Story:** As a user who refreshes the page or navigates between subpages, I want my entered values to be automatically restored so that I don't lose my work — but when I close the browser tab, I want a clean slate.

#### Acceptance Criteria

1. THE App SHALL use `sessionStorage` (NOT `localStorage`) for input persistence, so that data is cleared automatically when the browser tab is closed.
2. ON every `input` or `change` event fired on any `<input type="number">`, `<input type="text">`, or `<select>` element within any Tool_Container, THE App SHALL call `sessionStorage.setItem(element.id, element.value)`.
3. THE input tracking listener SHALL be registered as a single delegated event listener on the document (or on a common ancestor), not as individual `oninput` attribute overrides, to avoid conflicts with existing `oninput` handlers.
4. ON `DOMContentLoaded`, THE App SHALL loop through every `<input>` and `<select>` element in every Tool_Container; for each element with an `id`, if `sessionStorage.getItem(element.id)` returns a non-null value, THE App SHALL restore `element.value` to the cached value.
5. AFTER all input values are restored on `DOMContentLoaded`, THE App SHALL call `triggerAllActiveCalculators()` once to recompute all tool outputs based on the restored values.
6. THE `triggerAllActiveCalculators()` function SHALL call each tool's compute function inside an existence guard: `if (typeof calcRoAS === 'function') calcRoAS();` — one guard per tool, covering all 13 tools.
7. IF `sessionStorage` is unavailable or throws a security exception, THE App SHALL silently skip persistence and continue operating normally (wrap all reads/writes in try/catch).
8. THE active tab state SHALL also be persisted: on every `switchTab()` call, THE App SHALL store the active tool ID via `sessionStorage.setItem('fch_active_tab', toolId)`; on `DOMContentLoaded`, if a cached tab ID exists, THE App SHALL restore it by calling `switchTab(cachedTabId)` before `triggerAllActiveCalculators()`.

---

### Requirement 25: PWA Install Banner Refinement

**User Story:** As a mobile user, I want to see a clear, dismissible "Install FinCalcHub App" banner when the browser offers PWA installation, so that I can install the app to my home screen with one tap.

#### Acceptance Criteria

1. THE App SHALL capture the `beforeinstallprompt` event and store it in `window.deferredPrompt`.
2. WHEN `beforeinstallprompt` fires, THE App SHALL show a styled install banner strip (`id="pwa-install-banner"`) that is hidden by default (`display:none`) and becomes visible (`display:flex`) when the event fires.
3. THE banner SHALL contain: the text "📲 Install FinCalcHub App for instant access", an "Install" button (`id="pwa-install-btn"`) that triggers `window.deferredPrompt.prompt()`, and a "✕" dismiss button that hides the banner.
4. WHEN the "Install" button is clicked, THE App SHALL call `window.deferredPrompt.prompt()`, `await` the `userChoice` result, hide the banner, and set `window.deferredPrompt = null`.
5. WHEN the "✕" dismiss button is clicked, THE App SHALL hide the banner and set `window.deferredPrompt = null`.
6. THE banner SHALL be styled as a full-width strip with `background: rgba(99,102,241,0.15)`, `border-bottom: 1px solid rgba(99,102,241,0.3)`, positioned below the header (not fixed), so it doesn't obstruct content.
7. IF `deferredPrompt` is null when the install button is clicked (already used or dismissed), THE App SHALL do nothing.

---

### Requirement 26: CoinGecko API Fetch Crash Recovery

**User Story:** As a user on a restricted network or when the API is rate-limited, I want the crypto converter to gracefully fall back to cached rates instead of showing a broken "Loading..." state.

#### Acceptance Criteria

1. THE `fetchCrypto()` function SHALL wrap its entire `fetch()` call and response-processing logic inside a `try/catch` block.
2. WHEN the `fetch()` throws a `TypeError` (network failure) or any other exception, THE App SHALL NOT propagate the error to the global unhandled exception handler.
3. WHEN a fetch error occurs and the existing `prices` object has at least one entry (previously loaded data), THE App SHALL continue using the existing `prices` data without resetting it.
4. WHEN a fetch error occurs, THE App SHALL update the API status badge to display "Market (Cached) • " with a yellow/amber color indicator, distinguishable from the normal green "Live" indicator.
5. WHEN a fetch error occurs and the `prices` object is empty (first load failure), THE App SHALL populate `prices` using the existing `BASE_USD_RATES` constants multiplied by the active `GlobalCurrencyRates` multiplier for the selected currency, so the UI always shows numeric values rather than "Loading...".
6. AFTER applying the fallback data in criterion 5, THE App SHALL call the existing `renderCrypto()` (or equivalent UI update function) to push the fallback values into the display.

---

### Requirement 27: Content Page Navigation Sync (faq, privacy, terms)

**User Story:** As a user on any content page (FAQ, Privacy Policy, Terms), I want the header navigation to reflect the current 13-tool structure so that I can navigate to any tool directly.

#### Acceptance Criteria

1. THE `faq.html`, `privacy.html`, and `terms.html` files SHALL have their header navigation link lists (or tool dropdown menus, if present) updated to include links or references to all 13 tools, including the 3 new tools (RoAS Planner, Invoice Tracker, A/B Test Engine).
2. THE 6 accessibility color contrast tweaks defined in Requirement 18 SHALL also be applied to `faq.html`, `privacy.html`, and `terms.html` wherever the same CSS class patterns appear.
3. THE PWA manifest link in `faq.html`, `privacy.html`, and `terms.html` SHALL use the absolute path `/manifest.json` (not the relative `manifest.json`) consistent with Requirement 19.1.

---

### Requirement 28: Existing Implementation Preservation

**User Story:** As the project owner, I want all already-implemented features to continue working correctly as new tools are added.

#### Acceptance Criteria

1. THE App SHALL preserve the existing `gatherToolData()`, `exportToolToPDF()`, `exportToolToCSV()`, `exportToolToXLSX()` export functions and their wiring to the three-button export groups already present on all 10 existing tools.
2. THE existing jsPDF CDN tag (`https://unpkg.com/jspdf@latest/dist/jspdf.umd.min.js`) and SheetJS CDN tag (`https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js`) already present in `index.html` SHALL be preserved.
3. THE existing TOOL_LABELS map SHALL be extended with three new entries: `roas`, `invoice`, and `abtest` mapped to their display names.
4. THE three new tools' `downloadPDF`, `downloadCSV`, and `downloadXLSX` dispatcher calls SHALL use the same `gatherToolData()` pattern already established for the 10 existing tools.
5. THE existing GTM `window.addEventListener('load', ...)` wrapper already present in `index.html` SHALL be preserved.
6. THE existing accessibility contrast fixes already applied to `index.html` (`text-slate-50` on body, `bg-slate-950/80` on system info strip, `text-slate-300` on installHint) SHALL be preserved.
