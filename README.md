# FinCalcHub Marketing

## Free Financial, Business, Marketing, and Productivity Calculators

FinCalcHub is a free, browser-based suite of 15 calculators for business metrics, personal-finance estimates, tax, cryptocurrency-to-fiat pricing, and everyday maths. No account is needed, and most formulas run locally in the browser.

🌐 **Website:** https://www.fincalchub.xyz

---

## Calculators

### Business and marketing
- ROAS Planner (ROAS and break-even ROAS)
- A/B Split-Test Calculator
- SaaS CAC & LTV Calculator
- E-Commerce Per-Unit Profit Calculator
- Profit Margin Calculator
- Invoice Calculator
- Freelancer Hourly Rate Calculator

### Financial
- Compound Interest Calculator
- SIP Investment Planner
- Savings Goal Calculator
- Retirement Planning Calculator
- Income Tax Calculator

### Crypto
- Bitcoin, Ethereum and Solana converter to 30 fiat currencies, using CoinGecko reference prices (cached or fallback values may appear when live data is unavailable)

### Everyday
- Simple Calculator
- Scientific Calculator

The Simple and Scientific calculators sit inside the main calculator experience and keep working offline.

---

## Direct calculator pages

Each main calculator has its own page with the formula, a worked example and FAQs:

| Calculator | URL |
|---|---|
| ROAS Calculator | `https://www.fincalchub.xyz/roas-calculator.html` |
| A/B Test Calculator | `https://www.fincalchub.xyz/ab-test-significance-calculator.html` |
| CAC & LTV Calculator | `https://www.fincalchub.xyz/saas-cac-ltv-calculator.html` |
| Freelance Hourly Rate | `https://www.fincalchub.xyz/freelance-hourly-rate-calculator.html` |
| Ecommerce Profit | `https://www.fincalchub.xyz/ecommerce-profit-calculator.html` |
| Profit Margin | `https://www.fincalchub.xyz/profit-margin-calculator.html` |
| Compound Interest | `https://www.fincalchub.xyz/compound-interest-calculator.html` |
| SIP Calculator | `https://www.fincalchub.xyz/sip-calculator.html` |
| Retirement Calculator | `https://www.fincalchub.xyz/retirement-calculator.html` |
| Savings Goal Calculator | `https://www.fincalchub.xyz/savings-goal-calculator.html` |
| Freelance Earnings | `https://www.fincalchub.xyz/freelance-earnings-calculator.html` |
| Crypto to Fiat Converter | `https://www.fincalchub.xyz/crypto-to-fiat-converter.html` |

Short links such as `/roas-calculator` redirect to the `.html` page. On the homepage, hash links such as `https://www.fincalchub.xyz/#tax` still open the matching tab. Share links place calculator values in the URL fragment after `#`; they are not encrypted.

---

## Project files

| File | Purpose |
|---|---|
| `*.html` | Homepage, 12 calculator pages, guides, FAQ, about, privacy and terms |
| `sitemap.xml` | All indexable URLs with their last-modified dates |
| `llms.txt` | Plain-text site summary for AI assistants |
| `manifest.json` | PWA manifest, including shortcuts to popular calculators |
| `sw.js` | Service worker (network-first app shell, offline fallback) |
| `middleware.ts` | Adds a per-response Content-Security-Policy to HTML pages |
| `vercel.json` / `_headers.txt` | Redirects and response headers |
| `xlsx.mini.min.js` | Local SheetJS build used for XLSX export |

---

## Deploying updates

1. Upload the changed files and deploy.
2. In `sw.js`, raise `CACHE_VERSION` (for example `fch-shell-v15` → `fch-shell-v16`). On activation the worker deletes every older cache, takes control, and reloads open tabs once for returning visitors, so nobody keeps seeing an old version.
3. HTML pages are served with `Cache-Control: private, no-store`, so browsers never keep an old copy. The sitemap, robots, llms and manifest files are revalidated on every request.
4. **Content-Security-Policy:** `middleware.ts` allows inline scripts only if their SHA-256 hash is on its list. If you edit any inline `<script>` in an HTML page, add that script's new hash, or the browser will block it. Pages that are not listed in the `matcher` get no CSP header.
5. When you add a page, add it to `sitemap.xml` and to the `matcher` in `middleware.ts`.

---

## Features

- **Responsive design:** desktop, laptop, tablet and phone.
- **Exports:** PDF, CSV and XLSX are generated in the browser.
- **Offline:** the app shell and the Simple/Scientific calculators work offline; other calculators and information pages need a connection.
- **Currency display:** the site-wide selector uses preset conversion factors. It is not a live foreign-exchange feed.

## Disclaimer

Results are estimates based on the values and simplified formulas you enter. They are not financial, investment, tax, accounting or legal advice. The income tax calculator uses fixed built-in bands and does not select a jurisdiction or tax year, so verify any figure against official rules.
