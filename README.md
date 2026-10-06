# FinCalcHub Marketing

## Fifteen browser-based calculators for finance, business, and everyday math

FinCalcHub Marketing (short name: FinCalcHub) brings together 15 browser-based calculators for individuals, freelancers, marketers, investors, and business owners. The suite covers finance estimates, marketing and business metrics, cryptocurrency-to-fiat pricing, and general mathematics.

**Website:** https://www.fincalchub.xyz/

Most calculator formulas run in the browser, and no account is required. The site also uses Google Analytics and requests crypto-price data; see `privacy.html` for the data flows and storage details.

## Calculator suite

### Personal finance and tax
- Compound Interest Calculator
- SIP Investment Planner
- Savings Goal Calculator
- Retirement Planning Calculator
- Income Tax Calculator

### Business and marketing
- ROAS Planner
- A/B Split-Test Calculator
- Profit Margin Calculator
- Freelancer Hourly Rate Calculator
- SaaS CAC & LTV Calculator
- E-Commerce Per-Unit Profit Calculator
- Invoice Calculator

### Cryptocurrency and everyday math
- Crypto-to-fiat converter for Bitcoin, Ethereum, and Solana
- Simple Calculator
- Scientific Calculator

The Simple and Scientific Calculators are available from the toolbar in the main calculator experience.

## Data, assumptions, and exports

- **Crypto prices:** The converter uses CoinGecko reference prices for BTC, ETH, and SOL across 30 fiat quote currencies. Price updates are requested about every 30 seconds when available; cached or fallback values may appear and are not guaranteed to be current exchange quotes.
- **Currency selector:** The separate site-wide selector changes displayed calculator currencies using preset conversion factors. These are not live foreign-exchange rates. Changing the selector does not convert the fixed income-tax thresholds.
- **Tax estimates:** The Income Tax Calculator uses hard-coded income bands and rates. It does not select a jurisdiction or tax year; verify current official rules before relying on an estimate.
- **SaaS estimates:** LTV uses monthly net revenue per customer multiplied by the entered average customer lifespan. The visible churn-rate input is not used by the current formula.
- **E-commerce estimates:** The calculator models product cost, selling price, shipping, percentage platform/payment fees, and ad spend per unit. It does not calculate break-even unit volume or include costs that are not entered.
- **Storage and sharing:** Supported values and preferences may be kept in browser storage. A calculator share link includes the active tool and entered values in its URL fragment; the values are not encrypted.
- **Exports:** PDF and CSV files are assembled in the browser. XLSX files use the locally hosted SheetJS file `/xlsx.mini.min.js`, which is loaded before export use and also preloaded after a short delay. The CSV action loads that same local file before using the site's own CSV generator.
- **Offline use:** The cached app shell and Simple/Scientific calculators can work offline; the other calculators and information pages require a connection.

Calculations and articles are informational estimates, not financial, tax, investment, accounting, or legal advice. Real outcomes can differ from results based on simplified inputs and assumptions.

## Project pages

- Homepage and calculator suite: https://www.fincalchub.xyz/
- Calculator directory: https://www.fincalchub.xyz/tools.html
- About: https://www.fincalchub.xyz/about.html
- Blog and guides: https://www.fincalchub.xyz/blog.html
- FAQ: https://www.fincalchub.xyz/faq.html
- Privacy Policy: https://www.fincalchub.xyz/privacy.html
- Terms of Service: https://www.fincalchub.xyz/terms.html
- Sitemap: https://www.fincalchub.xyz/sitemap.xml
- Robots.txt: https://www.fincalchub.xyz/robots.txt
