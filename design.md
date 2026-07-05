# Design Document: FinCalcHub Enhancements

## Overview

This document describes the technical design for four enhancement modules added to the existing FinCalcHub single-file HTML application. The app runs entirely in the browser — no server, no build step, no npm. All new features must be implemented as vanilla JavaScript injected into `index.html` and `tools.html`, using CDN libraries where needed and browser APIs (localStorage, DOM) everywhere else.

The four modules are:
1. LocalStorage History Drawer + Universal jsPDF Export
2. Core Calculator Upgrades (SaaS ARPU, E-Com LTV/CAC, Tax Region Dropdown)
3. Trust & Transparency UI (Formula Accordions, Privacy Badge)
4. Look & Feel (Emoji headers, responsive grids)

---

## Architecture

The existing app uses a flat, tab-based single-page architecture: all 10 (index.html) or 12 (tools.html) tools live in hidden `<div class="tab-content">` panels, toggled visible via CSS class changes. All JavaScript is inlined in a single `<script>` block before `</body>`.

New enhancements follow the same pattern:
- HTML additions are inserted inline within the relevant tool `<div>` blocks
- New JavaScript is appended to the existing inline `<script>` block
- jsPDF is loaded via a `<script src="...">` CDN tag added before the existing `<script>` block
- LocalStorage reads/writes are wrapped in try/catch for graceful degradation
- No new files are created; both `index.html` and `tools.html` are modified independently

```
Browser
  ├── index.html (10 tools)
  │     ├── <style> Tailwind v4 inlined
  │     ├── <script src="jsPDF CDN">
  │     ├── Tool HTML (with accordions, PDF buttons, history drawer)
  │     ├── Privacy Badge HTML
  │     └── <script> all JS (existing + new history/PDF/upgrade logic)
  └── tools.html (12 tools) — same structure
```

---

## Components and Interfaces

### 1. History Drawer Component

**HTML Structure** (added to the `<aside>` sidebar in both files):
```html
<div id="history-drawer" class="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-4">
  <div class="flex items-center justify-between mb-3">
    <h3 class="text-sm font-bold">🕐 Recent Calculations</h3>
    <button onclick="clearToolHistory()" class="text-xs text-rose-400 hover:text-rose-300">Clear</button>
  </div>
  <div id="history-list" class="space-y-2 text-xs text-slate-300"></div>
</div>
```

**JavaScript API:**
```javascript
// Save a history entry for the active tool
function saveHistory(toolName, inputs, outputs) { ... }

// Load and render history for a given tool
function renderHistory(toolName) { ... }

// Clear all history for the active tool
function clearToolHistory() { ... }

// Storage key format
function historyKey(toolName) { return `fch_history_${toolName}`; }
```

**Data model per History_Entry (stored as JSON array):**
```javascript
{
  ts: "2025-01-15 14:32",   // ISO-like timestamp string
  inputs: { label: value }, // key-value snapshot
  outputs: { label: value } // key-value snapshot
}
```

**Max entries:** 5 per tool. On each save, if length >= 5, `array.shift()` removes oldest before `array.push()`.

---

### 2. PDF Export Component

**CDN tag** (added before the closing `</body>` script block in both files):
```html
<script src="https://unpkg.com/jspdf@latest/dist/jspdf.umd.min.js"></script>
```

**JavaScript API:**
```javascript
function exportToolToPDF(toolName, emoji, inputs, outputs) {
  if (!window.jspdf) {
    alert('PDF export unavailable — please check your internet connection.');
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  // Header: bold tool name with emoji (left), timestamp (right)
  // Two-column body: Inputs (left), Outputs (right)
  // Footer on every page: privacy notice
  doc.save(`${toolName}-report.pdf`);
}
```

**PDF Layout:**
- Page margins: 15mm all sides
- Header: 16pt bold text left; 10pt timestamp right; horizontal rule below
- Two columns at x=15 (inputs) and x=110 (outputs), starting y=35
- Each row: label in slate-gray, value in black bold, 8pt line height
- Footer at y=280: 8pt italic, centered privacy notice text

---

### 3. SaaS Tool Upgrade

**New output cards added to the existing SaaS result grid:**
- "ARPU" card: value = `saas-mrr` input value (ARPU = MRR per customer for a SaaS)
- "LTV (Lifespan)" card: existing `nr * life` formula, renamed
- "LTV (Churn)" card: value = `ARPU / (churn/100)` or "∞" when churn = 0

**Updated `calcSaaS()` function additions:**
```javascript
const arpu = mrr; // ARPU = MRR per customer
const ltvChurn = churn > 0 ? arpu / (churn / 100) : Infinity;
const ltvBest = Math.max(ltv, isFinite(ltvChurn) ? ltvChurn : ltv);
// LTV:CAC uses ltvBest
```

---

### 4. E-Commerce Tool Upgrade

**Three new input fields added to the existing `ec` grid:**
```html
<div><label>CAC (per unit)</label><input type="number" id="ec-cac" .../></div>
<div><label>ARPU (Avg Revenue/Order)</label><input type="number" id="ec-arpu" .../></div>
<div><label>Churn Rate (%)</label><input type="number" id="ec-churn" .../></div>
```

**New output cards added below existing results:**
- "LTV" card: `ARPU / (Churn/100)` or "∞" or "—"
- "LTV:CAC" card: `LTV / CAC` or "∞" or "—"

---

### 5. Income Tax Tool Upgrade

**New dropdown added as first input in the tax tool:**
```html
<select id="tax-region" onchange="calcTax()">
  <option value="pk2526">Pakistan FY2025-26 (Current)</option>
  <option value="pk2425">Pakistan FY2024-25</option>
  <option value="in2526">India FY2025-26 (Placeholder)</option>
  <option value="us2024">US Federal 2024 (Placeholder)</option>
</select>
```

**Tax slab sets object:**
```javascript
const TAX_SLABS = {
  pk2526: { s: [...], b: [...] },  // existing FY25-26 brackets
  pk2425: { s: [...], b: [...] },  // FY24-25 brackets
  in2526: null,  // placeholder
  us2024: null   // placeholder
};
```

**FY2024-25 Pakistan Salaried Slabs:**
- Up to 600,000: 0%
- 600,001 – 1,200,000: 5% of excess over 600,000
- 1,200,001 – 2,400,000: 30,000 + 15% of excess over 1,200,000
- 2,400,001 – 3,600,000: 210,000 + 25% of excess over 2,400,000
- 3,600,001 – 6,000,000: 510,000 + 30% of excess over 3,600,000
- Above 6,000,000: 1,230,000 + 35% of excess over 6,000,000

When a null/placeholder region is selected, all output fields show "—" and a "Coming soon" span is shown inline.

---

### 6. Formula Accordions

One `<details>` element added below the `.tool-desc` block of every tool. Example:

```html
<details class="mt-3 bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
  <summary class="cursor-pointer text-sm font-semibold text-indigo-300 select-none">
    📐 View Mathematical Formula
  </summary>
  <div class="mt-3">
    <code class="block bg-slate-900/80 text-emerald-300 font-mono text-xs p-3 rounded-lg whitespace-pre-wrap">
A = P(1 + r/n)^(nt) + PMT × [(1 + r/n)^(nt) − 1] / (r/n)
    </code>
  </div>
</details>
```

Formulas for all 22 tools (10 + 12) are defined statically in HTML. No JavaScript required.

---

### 7. Privacy Badge

One fixed `<div>` inserted in both files, just before `</body>`:

```html
<div id="privacy-badge" style="position:fixed;bottom:0;left:0;right:0;z-index:45;
  background:rgba(15,23,42,0.96);border-top:1px solid rgba(51,65,85,0.5);
  padding:8px 16px;text-align:center;font-size:11px;color:#94a3b8;">
  🔒 100% Secure &amp; Private. All calculations happen inside your browser's RAM.
  Your data never leaves this device.
</div>
```

Positioned below the floating action buttons (z-index 50) but above the page footer. Additional bottom padding is added to `<main>` to prevent the badge from covering content.

---

## Data Models

### History Entry
```typescript
interface HistoryEntry {
  ts: string;        // "YYYY-MM-DD HH:MM"
  inputs: Record<string, string>;   // { "Principal": "100,000", ... }
  outputs: Record<string, string>;  // { "Future Value": "259,374", ... }
}

// Stored as: localStorage.getItem("fch_history_compound") => JSON array of HistoryEntry[]
```

### Tax Slab
```typescript
interface TaxSlab {
  min: number;
  max: number | null;  // null = no upper bound
  base: number;        // fixed tax amount at this bracket's floor
  rate: number;        // marginal rate as decimal (e.g. 0.15)
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: History FIFO cap at 5 entries

*For any* tool name and any sequence of N > 5 history saves, the stored array for that tool SHALL contain exactly 5 entries and the oldest entry from the original 5 SHALL NOT be present.

**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: History round-trip persistence

*For any* valid History_Entry saved to LocalStorage, reading the same key back and JSON-parsing it SHALL produce an array containing an entry with matching `ts`, `inputs`, and `outputs` values.

**Validates: Requirements 1.1, 1.6**

### Property 3: Clear history removes all entries

*For any* tool name with N >= 1 history entries, calling `clearToolHistory()` SHALL result in the LocalStorage key being absent or empty, and the history list DOM element showing zero entry children.

**Validates: Requirements 1.4**

### Property 4: PDF contains all required sections for any tool

*For any* tool name, emoji, inputs object, and outputs object passed to `exportToolToPDF`, the generated PDF document text SHALL contain the tool emoji, tool name, a timestamp matching the pattern `YYYY-MM-DD HH:MM`, the string "Input Variables", the string "Financial Outputs", and the privacy footer notice.

**Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6**

### Property 5: SaaS Churn-Based LTV formula correctness

*For any* ARPU value > 0 and Churn Rate > 0, the displayed "LTV (Churn)" value SHALL equal `ARPU / (Churn / 100)` within floating-point rounding tolerance.

**Validates: Requirements 3.2**

### Property 6: E-Com LTV formula correctness

*For any* ARPU value > 0 and Churn Rate > 0, the displayed E-Com LTV value SHALL equal `ARPU / (Churn / 100)` within floating-point rounding tolerance.

**Validates: Requirements 4.2**

### Property 7: E-Com LTV:CAC ratio correctness

*For any* computed LTV > 0 and CAC > 0, the displayed LTV:CAC ratio SHALL equal `LTV / CAC` within floating-point rounding tolerance.

**Validates: Requirements 4.3**

### Property 8: Tax slab computation for FY2024-25

*For any* annual income value, computing tax with the FY2024-25 Pakistan salaried slab set SHALL produce a result equal to the manually computed bracket-by-bracket sum using the defined FY2024-25 thresholds and rates.

**Validates: Requirements 5.4**

### Property 9: Formula accordion present for every tool

*For any* tool container `<div>` in the DOM, there SHALL exist exactly one `<details>` descendant element whose `<summary>` text contains "View Mathematical Formula".

**Validates: Requirements 6.1, 6.2**

### Property 10: Formula accordion closed by default

*For any* `<details>` accordion element added by this feature, the element SHALL NOT have the `open` attribute on initial page load.

**Validates: Requirements 6.5**

### Property 11: All tool h2 headings contain an emoji prefix

*For any* tool container `<div>` in the DOM, the first `<h2>` descendant's text content SHALL start with an emoji character (Unicode code point > U+00FF).

**Validates: Requirements 8.1, 8.3**

### Property 12: All input grids have a mobile-first base class

*For any* `<div class="grid ...">` element inside a tool container, the class list SHALL include `grid-cols-1` as the base column count and at least one `sm:grid-cols-N` responsive override.

**Validates: Requirements 9.1, 9.2, 9.3**

---

## Error Handling

| Scenario | Handling |
|---|---|
| LocalStorage unavailable (private browsing, quota exceeded) | try/catch around all read/write ops; history silently disabled; tool continues normally |
| jsPDF CDN fails to load | `typeof window.jspdf === 'undefined'` check in click handler; shows `alert()` with descriptive message |
| Churn Rate = 0 in LTV formula (division by zero) | Display "∞" string; do not perform the division |
| Missing ARPU or Churn inputs in E-Com | Guard with `if (!arpu || !churn)` before computing; display "—" |
| Placeholder tax region selected | `if (!TAX_SLABS[region])` early return; set all output fields to "—" |
| Invalid numeric input to any calc function | Existing `parseFloat(...) || 0` pattern preserved throughout |

---

## Testing Strategy

This feature involves UI rendering, DOM structure, localStorage persistence, formula logic, and CDN integration. PBT is appropriate for the formula logic and structural properties.

**Property-Based Testing** (using [fast-check](https://github.com/dubzzz/fast-check) in a test harness):
- Each correctness property above becomes one property test
- Minimum 100 iterations per property
- Tag format: `// Feature: fincalchub-enhancements, Property N: <property text>`
- Formula tests (Properties 5, 6, 7, 8) are pure functions — no DOM required
- Structural tests (Properties 9, 10, 11, 12) parse the HTML file as a DOM and query elements

**Unit / Example-Based Tests:**
- Tax region dropdown: verify 4 options in correct order (Requirement 5.2)
- Privacy badge: verify text content and fixed positioning (Requirements 7.1, 7.2)
- PDF footer notice: verify exact string in generated doc (Requirement 2.6)
- History tab-switch: load two tools' histories, switch tab, verify correct entries shown (Requirement 1.5)
- jsPDF CDN failure: mock `window.jspdf = undefined`, verify error alert fires (Requirement 2.9)

**Integration / Smoke Tests:**
- jsPDF available after page load: verify `window.jspdf` is defined (Requirement 2.1)
- Each tool's "Download PDF Report" button exists in DOM (Requirement 2.8)

---

## CSV/XLSX Export Component

### Overview

Extends the existing single-PDF-button pattern to a three-button export group (PDF, CSV, XLSX). SheetJS is loaded from CDN alongside jsPDF. Both export functions follow the same dispatcher pattern as `downloadPDF`.

### CDN Tag

Added immediately after the existing jsPDF `<script>` tag in both files:

```html
<script defer src="https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js"></script>
```

### JavaScript API

```javascript
// CSV export — pure browser, no library required
function exportToolToCSV(toolName, inputs, outputs) {
  const ts = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const lines = [`# ${toolName} Export - ${ts}`, '# Inputs', 'Field,Value'];
  Object.entries(inputs).forEach(([k, v]) => lines.push(`"${k}","${v}"`));
  lines.push('', '# Outputs', 'Field,Value');
  Object.entries(outputs).forEach(([k, v]) => lines.push(`"${k}","${v}"`));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: `${toolName}-data.csv`
  });
  a.click();
  URL.revokeObjectURL(a.href);
}

// XLSX export — requires SheetJS (window.XLSX)
function exportToolToXLSX(toolName, inputs, outputs) {
  if (!window.XLSX) {
    alert('Export unavailable — please check your internet connection.');
    return;
  }
  const toRows = obj => [['Field', 'Value'], ...Object.entries(obj)];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(toRows(inputs)), 'Inputs');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(toRows(outputs)), 'Outputs');
  XLSX.writeFile(wb, `${toolName}-data.xlsx`);
}
```

### Button Group HTML (replaces the single PDF button)

```html
<div class="flex gap-2 mt-4">
  <button onclick="downloadPDF('toolid')"
    class="flex-1 py-2 px-3 rounded-xl font-semibold text-xs text-white
           bg-gradient-to-r from-indigo-500 to-purple-600
           hover:from-indigo-600 hover:to-purple-700 transition cursor-pointer">
    📄 PDF
  </button>
  <button onclick="downloadCSV('toolid')"
    class="flex-1 py-2 px-3 rounded-xl font-semibold text-xs text-white
           bg-gradient-to-r from-emerald-500 to-cyan-500
           hover:from-emerald-600 hover:to-cyan-600 transition cursor-pointer">
    📊 CSV
  </button>
  <button onclick="downloadXLSX('toolid')"
    class="flex-1 py-2 px-3 rounded-xl font-semibold text-xs text-white
           bg-gradient-to-r from-amber-500 to-orange-500
           hover:from-amber-600 hover:to-orange-600 transition cursor-pointer">
    📗 XLSX
  </button>
</div>
```

### Dispatcher Functions

```javascript
function downloadCSV(toolId) {
  const { inputs, outputs } = gatherToolData(toolId); // same helper as downloadPDF
  exportToolToCSV(toolId, inputs, outputs);
}

function downloadXLSX(toolId) {
  if (!window.XLSX) {
    alert('Export unavailable — please check your internet connection.');
    return;
  }
  const { inputs, outputs } = gatherToolData(toolId);
  exportToolToXLSX(toolId, inputs, outputs);
}
```

---

## GTM Lazy-Load Pattern

### Problem

`index.html` runs the gtag inline init block synchronously, which causes the Google Tag Manager JS fetch to participate in the critical render path and is flagged by PageSpeed Insights. `tools.html` has no GTM at all.

### Solution

Wrap the inline init block in a `window.addEventListener('load', ...)` callback so it runs only after the `load` event fires (all resources parsed and sub-resources fetched). The external CDN script tag keeps its `defer` attribute, ensuring it does not block HTML parsing.

### Pattern Applied to Both Files

```html
<!-- External GTM script — defer keeps it non-blocking -->
<script src="https://www.googletagmanager.com/gtag/js?id=G-4LEKFYK37L" defer></script>

<!-- Inline init — wrapped in load event so it doesn't run during parse -->
<script>
  window.addEventListener('load', function () {
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    gtag('js', new Date());
    gtag('config', 'G-4LEKFYK37L');
  });
</script>
```

### Why This Works

- `defer` on the external script: parsed after HTML but executes before `DOMContentLoaded`; non-blocking
- `window.addEventListener('load', ...)`: init code runs only after the entire page (images, stylesheets) has loaded
- Combined effect: analytics initialization is deferred entirely out of the critical render path

---

## Accessibility Contrast Map

### Background

PageSpeed / WCAG 2.1 AA requires a minimum contrast ratio of 4.5:1 for normal text and 3:1 for large text against its background. Several existing Tailwind utility classes produce insufficient contrast on the dark slate background.

### Changes Required in Both Files

| Element | Current Class | Replacement | Reason |
|---|---|---|---|
| CoinGecko ticker attribution `<p>` | `text-slate-500` | `text-slate-300` | slate-500 on slate-900 bg fails 4.5:1 |
| Crypto Converter secondary card `<div>` | `bg-slate-900/40` | `bg-slate-900/80` | Low opacity creates near-transparent bg, harming layered contrast |
| `<body>` tag | `text-slate-100` | `text-slate-50` | Slight bump to ensure global text meets AA on mid-tone backgrounds |
| Inline real-time status `<p>` (no `mt-3 text-center`) | `text-slate-500` | `text-slate-400` | Insufficient luminance ratio |
| System info strip `<div>` | `bg-slate-900/40` | `bg-slate-950/80` | Increases background opacity for better text separation |
| Install hint `<p id="installHint">` | `text-slate-500` | `text-slate-300` | Same low-contrast issue as ticker attribution |

### Implementation Notes

- All six changes are pure class string replacements — no structural HTML changes
- Changes must be applied identically in both `index.html` and `tools.html`
- WCAG full compliance requires manual testing with assistive technologies; these changes address the mechanically detectable contrast failures

---

## PWA Manifest Updates

### Problem

1. Both HTML files reference `href="manifest.json"` (relative path). When the app is served from a path other than the root (e.g., a subdirectory), the relative reference breaks. The PWA spec recommends an absolute root-relative path.
2. `manifest.json` contains only one icon entry covering both sizes with a combined `"sizes": "192x192 512x512"` attribute. Some browsers and OS installers require a dedicated `192x192` entry.
3. `manifest.json` lacks `"prefer_related_applications": false`, which some browsers use to decide whether to show the "Add to Home Screen" prompt.

### Changes

**`index.html` and `tools.html` `<head>` change:**
```html
<!-- Before -->
<link rel="manifest" href="manifest.json">
<!-- After -->
<link rel="manifest" href="/manifest.json">
```

**`manifest.json` icon array (add dedicated 192x192 entry):**
```json
"icons": [
  {
    "src": "<existing SVG data URI>",
    "sizes": "192x192",
    "type": "image/svg+xml",
    "purpose": "any maskable"
  },
  {
    "src": "<existing SVG data URI>",
    "sizes": "512x512",
    "type": "image/svg+xml",
    "purpose": "any maskable"
  }
]
```

**`manifest.json` top-level addition:**
```json
"prefer_related_applications": false
```


---

## Tab Bar Reconstruction — 13 Tools

The existing 10-tool tab bar in `index.html` is extended to 13 by inserting three new tab buttons at positions 2, 3, and 4 (after Crypto, before Compound). The new tool IDs are `roas`, `invoice`, and `abtest`.

**Tab button HTML pattern for new tools (inserted after `id="tab-crypto"`):**
```html
<button onclick="switchTab('roas')" id="tab-roas"
  class="tab-btn flex-shrink-0 min-w-[95px] px-3 py-2.5 rounded-xl font-semibold transition text-xs sm:text-sm text-slate-400 hover:text-white flex items-center justify-center gap-1.5">
  <span>📊</span><span>RoAS</span>
</button>
<button onclick="switchTab('invoice')" id="tab-invoice"
  class="tab-btn flex-shrink-0 min-w-[95px] px-3 py-2.5 rounded-xl font-semibold transition text-xs sm:text-sm text-slate-400 hover:text-white flex items-center justify-center gap-1.5">
  <span>📝</span><span>Invoice</span>
</button>
<button onclick="switchTab('abtest')" id="tab-abtest"
  class="tab-btn flex-shrink-0 min-w-[95px] px-3 py-2.5 rounded-xl font-semibold transition text-xs sm:text-sm text-slate-400 hover:text-white flex items-center justify-center gap-1.5">
  <span>💥</span><span>A/B Test</span>
</button>
```

**`switchTab()` additions:** Add `'roas'`, `'invoice'`, `'abtest'` to the tool ID list used by `switchTab()`.

**`recalcAll()` additions:** Add `if (typeof calcRoAS === 'function') calcRoAS();`, `if (typeof calcInvoice === 'function') calcInvoice();`, `if (typeof calcABTest === 'function') calcABTest();` to the `recalcAll()` function.

---

## RoAS Planner Tool — `calcRoAS()`

**HTML structure** — new `<div id="roas" class="tab-content">` block inserted after the Crypto tool block and before the Compound tool block.

**Input grid** (`grid-cols-1 sm:grid-cols-2`):
- `id="roas-spend"` — Total Ad Spend, default 10000, monetary label with `.cur` span
- `id="roas-revenue"` — Total Revenue Generated, default 35000, monetary
- `id="roas-cogs"` — Cost of Goods Sold (COGS), default 8000, monetary
- `id="roas-budget"` — Daily Campaign Budget, default 500, monetary
- `id="roas-days"` — Days Elapsed in Campaign, default 7, integer

**Output cards** (`grid-cols-2 sm:grid-cols-3`):
- `id="roas-result"` — RoAS (e.g. "3.50x")
- `id="roas-net-profit"` — Net Profit
- `id="roas-margin"` — Net Profit Margin %
- `id="roas-breakeven"` — Break-Even RoAS (e.g. "1.80x")
- `id="roas-spend-to-date"` — Spend to Date
- `id="roas-pacing"` — Pacing Status (text badge with color: red for Over Budget, green for On Track, amber for Under Pacing)

**JavaScript `calcRoAS()` function:**
```javascript
function calcRoAS() {
  const spend = parseFloat(document.getElementById('roas-spend').value) || 0;
  const revenue = parseFloat(document.getElementById('roas-revenue').value) || 0;
  const cogs = parseFloat(document.getElementById('roas-cogs').value) || 0;
  const budget = parseFloat(document.getElementById('roas-budget').value) || 0;
  const days = parseFloat(document.getElementById('roas-days').value) || 0;

  if (spend === 0) {
    ['roas-result','roas-net-profit','roas-margin','roas-breakeven','roas-spend-to-date','roas-pacing']
      .forEach(id => { const el = document.getElementById(id); if (el) el.textContent = '—'; });
    return;
  }

  const roas = revenue / spend;
  const netProfit = revenue - spend - cogs;
  const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  const breakEven = (spend + cogs) / spend;
  const spendToDate = budget * days;

  let pacingText, pacingColor;
  if (spend > spendToDate) {
    pacingText = '⚠️ Over Budget'; pacingColor = 'text-rose-400';
  } else if (Math.abs(spend - spendToDate) / (spendToDate || 1) <= 0.10) {
    pacingText = '✅ On Track'; pacingColor = 'text-emerald-400';
  } else {
    pacingText = '📉 Under Pacing'; pacingColor = 'text-amber-400';
  }

  document.getElementById('roas-result').textContent = roas.toFixed(2) + 'x';
  document.getElementById('roas-net-profit').textContent = cs() + fmt(netProfit, 2);
  document.getElementById('roas-margin').textContent = margin.toFixed(2) + '%';
  document.getElementById('roas-breakeven').textContent = breakEven.toFixed(2) + 'x';
  document.getElementById('roas-spend-to-date').textContent = cs() + fmt(spendToDate, 2);
  const pacingEl = document.getElementById('roas-pacing');
  pacingEl.textContent = pacingText;
  pacingEl.className = 'font-bold text-lg ' + pacingColor;
}
```

**Formula accordion content:**
```
RoAS = Revenue ÷ Ad Spend
Break-Even RoAS = (Spend + COGS) ÷ Spend
Net Margin = Net Profit ÷ Revenue × 100
Spend to Date = Daily Budget × Days Elapsed
```

---

## Invoice Tracker Tool — `calcInvoice()`

**HTML structure** — new `<div id="invoice" class="tab-content">` block inserted after the RoAS block.

**Input grid** (`grid-cols-1 sm:grid-cols-2`):
- `id="inv-rate"` — Hourly Rate, default 5000, monetary
- `id="inv-hours"` — Hours Billed This Period, default 40, decimal
- `id="inv-platform"` — Platform / Agency Cut (%), default 15, percentage
- `id="inv-tax"` — Tax Rate (%), default 10, percentage
- `id="inv-expenses"` — Additional Expenses, default 0, monetary
- `id="inv-mtd-hours"` — Hours Billed Month-to-Date, default 120, decimal

**Output cards** (`grid-cols-2 sm:grid-cols-3`):
- `id="inv-gross"` — Gross Invoice Total
- `id="inv-platform-cut"` — Platform Deduction
- `id="inv-tax-cut"` — Tax Deduction
- `id="inv-net"` — Net Take-Home (primary, largest card)
- `id="inv-eff-rate"` — Effective Net Rate / Hour
- `id="inv-mtd"` — MTD Earnings (Projected Net)

**JavaScript `calcInvoice()` function:**
```javascript
function calcInvoice() {
  const rate = parseFloat(document.getElementById('inv-rate').value) || 0;
  const hours = parseFloat(document.getElementById('inv-hours').value) || 0;
  const platform = parseFloat(document.getElementById('inv-platform').value) || 0;
  const tax = parseFloat(document.getElementById('inv-tax').value) || 0;
  const expenses = parseFloat(document.getElementById('inv-expenses').value) || 0;
  const mtdHours = parseFloat(document.getElementById('inv-mtd-hours').value) || 0;

  if (hours === 0) {
    ['inv-gross','inv-platform-cut','inv-tax-cut','inv-net','inv-eff-rate','inv-mtd']
      .forEach(id => { const el = document.getElementById(id); if (el) el.textContent = '—'; });
    return;
  }

  const gross = rate * hours;
  const platformCut = gross * (platform / 100);
  const taxCut = (gross - platformCut) * (tax / 100);
  const net = gross - platformCut - taxCut - expenses;
  const effRate = net / hours;
  const mtd = effRate * mtdHours;

  document.getElementById('inv-gross').textContent = cs() + fmt(gross, 2);
  document.getElementById('inv-platform-cut').textContent = cs() + fmt(platformCut, 2);
  document.getElementById('inv-tax-cut').textContent = cs() + fmt(taxCut, 2);
  document.getElementById('inv-net').textContent = cs() + fmt(net, 2);
  document.getElementById('inv-eff-rate').textContent = cs() + fmt(effRate, 2) + '/hr';
  document.getElementById('inv-mtd').textContent = cs() + fmt(mtd, 2);
}
```

**Formula accordion content:**
```
Gross = Rate × Hours
Platform Deduction = Gross × (Platform% ÷ 100)
Tax Deduction = (Gross - Platform Deduction) × (Tax% ÷ 100)
Net = Gross - Platform Deduction - Tax Deduction - Expenses
MTD = (Net ÷ Hours) × MTD Hours
```

---

## A/B Split-Test Significance Engine — `calcABTest()`

**HTML structure** — new `<div id="abtest" class="tab-content">` block inserted after the Invoice block.

**Input grid** (`grid-cols-1 sm:grid-cols-2`) — split into two labelled groups (Variant A, Variant B):
- `id="ab-a-visitors"` — Variant A Visitors, default 1000, integer
- `id="ab-a-conv"` — Variant A Conversions, default 50, integer
- `id="ab-b-visitors"` — Variant B Visitors, default 1000, integer
- `id="ab-b-conv"` — Variant B Conversions, default 65, integer

**Output cards:**
- `id="ab-rate-a"` — Conversion Rate A (%)
- `id="ab-rate-b"` — Conversion Rate B (%)
- `id="ab-uplift"` — Relative Uplift (%)
- `id="ab-zscore"` — Z-Score
- `id="ab-confidence"` — Confidence Level
- `id="ab-verdict"` — Verdict alert card (full-width, colored background based on result: emerald for a clear winner, slate for no significance)

**JavaScript `calcABTest()` function:**
```javascript
function calcABTest() {
  const nA = parseFloat(document.getElementById('ab-a-visitors').value) || 0;
  const xA = parseFloat(document.getElementById('ab-a-conv').value) || 0;
  const nB = parseFloat(document.getElementById('ab-b-visitors').value) || 0;
  const xB = parseFloat(document.getElementById('ab-b-conv').value) || 0;

  if (nA === 0 || nB === 0) {
    ['ab-rate-a','ab-rate-b','ab-uplift','ab-zscore','ab-confidence']
      .forEach(id => { const el = document.getElementById(id); if (el) el.textContent = '—'; });
    const v = document.getElementById('ab-verdict');
    if (v) v.textContent = 'Enter visitor data to see verdict';
    return;
  }

  const pA = xA / nA;
  const pB = xB / nB;
  const rateA = pA * 100;
  const rateB = pB * 100;
  const uplift = rateA > 0 ? ((rateB - rateA) / rateA) * 100 : 0;
  const pooledP = (xA + xB) / (nA + nB);
  const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / nA + 1 / nB));
  const z = se > 0 ? (pB - pA) / se : 0;
  const absZ = Math.abs(z);

  let confidence, confidenceClass;
  if (absZ >= 2.576) { confidence = '99%'; confidenceClass = 'text-emerald-400'; }
  else if (absZ >= 1.96) { confidence = '95%'; confidenceClass = 'text-emerald-400'; }
  else if (absZ >= 1.645) { confidence = '90%'; confidenceClass = 'text-amber-400'; }
  else { confidence = '< 90% (Not Significant)'; confidenceClass = 'text-slate-400'; }

  let verdictText, verdictClass;
  if (absZ >= 1.96 && z > 0) {
    verdictText = '🏆 Variant B Wins';
    verdictClass = 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300';
  } else if (absZ >= 1.96 && z < 0) {
    verdictText = '🏆 Variant A Wins';
    verdictClass = 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300';
  } else {
    verdictText = '⚖️ No Significant Difference — collect more data';
    verdictClass = 'bg-slate-800/60 border border-slate-700/40 text-slate-400';
  }

  document.getElementById('ab-rate-a').textContent = rateA.toFixed(2) + '%';
  document.getElementById('ab-rate-b').textContent = rateB.toFixed(2) + '%';
  document.getElementById('ab-uplift').textContent = (uplift >= 0 ? '+' : '') + uplift.toFixed(2) + '%';
  document.getElementById('ab-zscore').textContent = z.toFixed(3);
  const confEl = document.getElementById('ab-confidence');
  confEl.textContent = confidence;
  confEl.className = 'font-bold text-lg ' + confidenceClass;
  const verdictEl = document.getElementById('ab-verdict');
  verdictEl.textContent = verdictText;
  verdictEl.className = 'mt-4 p-4 rounded-xl text-center font-bold text-sm ' + verdictClass;
}
```

**Formula accordion content:**
```
Pooled p̂ = (xA + xB) / (nA + nB)
SE = √[p̂(1−p̂)(1/nA + 1/nB)]
Z = (p̂B − p̂A) / SE
Confidence: |Z| ≥ 2.576 → 99% | ≥ 1.96 → 95% | ≥ 1.645 → 90%
```

---

## SessionStorage Input Persistence Engine

**Architecture:** A single delegated `input`/`change` event listener on `document` captures all tool input changes. On `DOMContentLoaded`, a restore loop reads cached values and then calls `triggerAllActiveCalculators()`.

**JavaScript implementation pattern:**
```javascript
// === SESSION PERSISTENCE ENGINE ===

function triggerAllActiveCalculators() {
  const calcFns = [
    'calcRoAS','calcInvoice','calcABTest',
    'fetchCrypto','calcCI','calcSIP','calcTax',
    'calcSavings','calcRetire','calcProfit',
    'calcFL','calcSaaS','calcEC'
  ];
  calcFns.forEach(fn => { try { if (typeof window[fn] === 'function') window[fn](); } catch(e) {} });
}

// Delegated listener — fires on any input/select change inside a tool container
document.addEventListener('input', function(e) {
  try {
    if (e.target.id && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) {
      sessionStorage.setItem(e.target.id, e.target.value);
    }
  } catch(ex) {}
});
document.addEventListener('change', function(e) {
  try {
    if (e.target.id && e.target.tagName === 'SELECT') {
      sessionStorage.setItem(e.target.id, e.target.value);
    }
  } catch(ex) {}
});

// On DOMContentLoaded: restore all cached input values, then restore active tab, then recalculate
document.addEventListener('DOMContentLoaded', function() {
  try {
    document.querySelectorAll('input[id], select[id]').forEach(el => {
      const cached = sessionStorage.getItem(el.id);
      if (cached !== null) el.value = cached;
    });
    const cachedTab = sessionStorage.getItem('fch_active_tab');
    if (cachedTab) switchTab(cachedTab);
    triggerAllActiveCalculators();
  } catch(ex) {}
});

// Patch switchTab to persist active tab
const _origSwitchTab = switchTab;
switchTab = function(id) {
  _origSwitchTab(id);
  try { sessionStorage.setItem('fch_active_tab', id); } catch(ex) {}
};
```

**Note:** The `switchTab` monkey-patch runs at script initialization. If `switchTab` is defined after this block, it must be placed after the function definition. Alternatively, modify `switchTab` directly to include the `sessionStorage.setItem` call inline.

**Scope:** `index.html` only — `sessionStorage` persistence does NOT apply to `tools.html` (content-only pages do not use these IDs).

---

## PWA Install Banner Component

**HTML structure** (inserted immediately below the `<header>` element, hidden by default):
```html
<div id="pwa-install-banner"
  style="display:none;align-items:center;justify-content:space-between;gap:12px;
    padding:10px 16px;background:rgba(99,102,241,0.15);
    border-bottom:1px solid rgba(99,102,241,0.3);font-size:13px;flex-wrap:wrap;">
  <span>📲 Install FinCalcHub App for instant access</span>
  <div style="display:flex;gap:8px;align-items:center;">
    <button id="pwa-install-btn"
      style="padding:6px 16px;background:linear-gradient(135deg,#6366f1,#8b5cf6);
        color:white;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-size:12px;">
      Install
    </button>
    <button onclick="document.getElementById('pwa-install-banner').style.display='none';window.deferredPrompt=null;"
      style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:18px;line-height:1;">✕</button>
  </div>
</div>
```

**JavaScript pattern:**
```javascript
// Existing deferredPrompt capture — update to show banner
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  window.deferredPrompt = e;
  const banner = document.getElementById('pwa-install-banner');
  if (banner) banner.style.display = 'flex';
  // Keep legacy installBtn visible if present
  const b = document.getElementById('installBtn');
  if (b) b.classList.remove('hidden');
});

document.getElementById('pwa-install-btn').addEventListener('click', async () => {
  if (!window.deferredPrompt) return;
  window.deferredPrompt.prompt();
  const choice = await window.deferredPrompt.userChoice;
  document.getElementById('pwa-install-banner').style.display = 'none';
  window.deferredPrompt = null;
});
```

---

## CoinGecko Fetch Crash Recovery

**Modified `fetchCrypto()` pattern:**
```javascript
async function fetchCrypto() {
  const st = document.getElementById('apiStatus');
  try {
    // ... existing fetch and response processing logic ...
    // On success: set green Live status indicator (existing code)
  } catch (err) {
    // Graceful fallback
    if (Object.keys(prices).length === 0) {
      // First load failure — seed from BASE_USD_RATES
      const mult = GlobalCurrencyRates[activeCurrency] || 1;
      Object.keys(BASE_USD_RATES).forEach(sym => {
        prices[sym] = BASE_USD_RATES[sym] * mult;
      });
      renderCrypto();
    }
    // Update status badge to amber "Cached" state
    if (st) {
      st.textContent = 'Market (Cached)';
      st.className = st.className.replace(/text-emerald-\d+/g, 'text-amber-400')
                                 .replace(/text-green-\d+/g, 'text-amber-400');
      const dot = st.previousElementSibling;
      if (dot) dot.className = dot.className.replace(/bg-emerald-\d+/g, 'bg-amber-400')
                                             .replace(/bg-green-\d+/g, 'bg-amber-400');
    }
    // Do NOT rethrow — swallow the error
  }
}
```

---

## Content Page Navigation Sync (faq, privacy, terms)

**Scope of changes for each of faq.html, privacy.html, terms.html:**

1. **Navigation links / tool references:** Find any header or footer navigation section that lists tools and add entries for the 3 new tools (RoAS Planner → `index.html#roas`, Invoice Tracker → `index.html#invoice`, A/B Test → `index.html#abtest`). If no explicit tool list exists, add the 3 new tools as `<a href="index.html">` links with descriptive text in the existing nav/footer structure.

2. **PWA manifest link:** Change `href="manifest.json"` → `href="/manifest.json"` in `<head>`.

3. **Accessibility contrast tweaks:** Apply the same 6 class-swap rules from Requirement 18 wherever the patterns appear in these files:
   - `text-slate-500` → `text-slate-300` (CoinGecko attribution p elements)
   - `bg-slate-900/40` → `bg-slate-900/80` (secondary card divs)
   - `text-slate-100` → `text-slate-50` on `<body>`
   - `text-slate-500` → `text-slate-400` (inline status p elements without mt-3 text-center)
   - `bg-slate-900/40` → `bg-slate-950/80` (system info strip)
   - `text-slate-500` on `id="installHint"` → `text-slate-300`

---

## New Correctness Properties

### Property 13: RoAS formula correctness

*For any* Ad Spend > 0 and Revenue > 0, the displayed RoAS value SHALL equal `Revenue / Ad Spend` to 2 decimal places, and Break-Even RoAS SHALL equal `(Ad Spend + COGS) / Ad Spend` to 2 decimal places.

**Validates: Requirements 21.2**

### Property 14: Invoice Net Take-Home formula correctness

*For any* Rate > 0, Hours > 0, Platform%, Tax%, and Expenses ≥ 0, the displayed Net Take-Home SHALL equal `(Rate × Hours) × (1 - Platform%/100) × (1 - Tax%/100) - Expenses` within floating-point tolerance.

**Validates: Requirements 22.2**

### Property 15: A/B Test Z-Score formula correctness

*For any* nA > 0, nB > 0, xA ≥ 0, xB ≥ 0 (with xA ≤ nA and xB ≤ nB), the displayed Z-Score SHALL equal `(pB - pA) / sqrt(pooledP × (1 - pooledP) × (1/nA + 1/nB))` where `pooledP = (xA+xB)/(nA+nB)` within floating-point tolerance.

**Validates: Requirements 23.2**

### Property 16: SessionStorage round-trip for all 13 tools

*For any* set of input values assigned to tool input IDs, setting those values and firing input events SHALL result in sessionStorage entries for each ID; restoring from sessionStorage on a subsequent DOMContentLoaded SHALL reproduce each input's value exactly.

**Validates: Requirements 24.2, 24.4**

### Property 17: triggerAllActiveCalculators existence-guard safety

*For any* subset of the 13 calc functions being defined (simulating a page that only has some tools), calling `triggerAllActiveCalculators()` SHALL NOT throw an error regardless of which calc functions are absent.

**Validates: Requirements 24.6**

---

## Updated Error Handling

The following scenarios extend the Error Handling table above:

| Scenario | Handling |
|---|---|
| RoAS Ad Spend = 0 | Guard `if (spend === 0)` early return; all outputs set to "—" |
| Invoice Hours Billed = 0 | Guard `if (hours === 0)` early return; rate-dependent outputs set to "—" |
| A/B Test visitor count = 0 | Guard `if (nA === 0 \|\| nB === 0)` early return; stats outputs set to "—" |
| A/B Test SE = 0 (identical distributions) | Guard `se > 0` before division; Z = 0 displayed |
| sessionStorage unavailable | try/catch around all reads/writes; persistence silently disabled |
| fetchCrypto network failure | try/catch swallows error; fallback to BASE_USD_RATES seed; amber status badge |
| deferredPrompt already consumed | `if (!window.deferredPrompt) return` guard in install button click handler |
