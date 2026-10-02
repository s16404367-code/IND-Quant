# IND-QUANT V4.1 — Indian Options Research & Risk Lab

> **Education only — not investment advice.** The owner of this project is **not registered with SEBI** as an
> Investment Adviser or Research Analyst. The site **never places orders** and never asks for broker logins,
> passwords or API keys. SEBI studies found that **9 out of 10 individual F&O traders made net losses**
> (about 93% over FY22–FY24 and about 91% in FY25). You alone are responsible for your decisions.
> Read the full [Disclaimer](LEGAL/DISCLAIMER.md), [Risk Disclosure](LEGAL/RISK_DISCLOSURE.md),
> [Terms of Use](LEGAL/TERMS_OF_USE.md), [Privacy Policy](LEGAL/PRIVACY_POLICY.md) and
> [Data Sources](LEGAL/DATA_SOURCES.md).

---

## What changed in V4.1

| Area | V4.0 | V4.1 |
|---|---|---|
| **Data** | Built-in sample prices (NIFTY 24,820, RELIANCE 2,945…), plus an "API Keys Vault" for users to paste keys | **Fetched automatically, with no keys.** Uses official NSE end-of-day archive files (F&O and cash bhavcopy, index closes, lot sizes, ban list) for **all ~219 F&O underlyings**, plus 250 days of history. A GitHub Action refreshes it after every trading day |
| **News** | Made-up sample headlines | Real publisher RSS headlines, shown as **headline + link only** with attribution, plus a Google News link-out for each stock |
| **Weather** | Synthetic | Live **Open-Meteo** data, called from the browser (keyless, CORS-enabled) and credited under CC BY 4.0. A build-time snapshot is the fallback |
| **API Keys Vault** | Asked users for broker/news/weather/AI keys | **Removed.** Replaced by **Data Sources & Privacy**: source status, honest limits, local-data export/erase, and settings |
| **Stock selection** | Small dropdown with 8 symbols | **Big search box** at the top. Press **Ctrl+K** or **/**, type a name or symbol, or filter Indices/Stocks. Recent picks are remembered |
| **Legal** | One modal disclaimer | **5 full documents** (Disclaimer, Risk Disclosure, Terms of Use, Privacy Policy, Data Sources). Users must tick a 5-item, versioned consent gate before using the site. There is a printable **Legal Center**, a persistent risk strip, and footer links. Markdown copies are in `LEGAL/` |
| **Design** | Dark terminal with 8 dense tabs | New light **"Daylight"** theme (default) with a **"Midnight"** dark toggle. Sidebar navigation with plain-English labels, a beginner Home page (chart, key numbers, market pulse, OI chart, news, weather) and a mobile layout |
| **Safety** | Verdict could say "TRADE CANDIDATE" for every symbol | End-of-day data is capped at **WATCH (research only)**. The model shows **NO TRADE** when data is missing, the stock is in the ban list, one lot is not affordable, or a discipline lock is on. Every state is labelled "not a recommendation" |
| **Fixes** | SVI surface fit was wrong (about 45% vs 13% IV), the "observed" IV was a synthetic formula, and decision-snapshot parameters were broken | SVI is now fitted by constrained least squares to IVs solved from real strike prices. Snapshots are fixed. Sample data is clearly labelled "ILLUSTRATIVE" |

## ⚠️ Before you publish (owner checklist)

1. **Edit `site-config.json`** (repository root; read at runtime, so no rebuild is needed; defaults live in `src/config/siteConfig.ts`):
   - `ownerDisplayName`: your name or project name.
   - `contactEmail`: an email for legal and privacy requests (strongly recommended under the DPDP Act).
   - `jurisdictionCity`: for example `'Guntur, Andhra Pradesh'`.
   - If you later change any legal wording, bump `legalVersion`. Users will then be asked to accept again.
2. Run `npm run legal` to regenerate `LEGAL/*.md`.
3. **Have a qualified Indian lawyer review the legal texts.** They are a careful, good-faith template. They are not legal advice, and no disclaimer can fully protect you. The strongest protections are the ones built into the product:
   - no personalised buy/sell calls;
   - no paid tips;
   - no order placement;
   - no collection of personal data;
   - honest labelling of every number.
4. **Do not** add paid subscriptions, Telegram/WhatsApp "calls", or personalised recommendations. Doing that can make the activity a regulated **Research Analyst / Investment Adviser** service under SEBI rules.
5. Open-Meteo's free tier is for **non-commercial** use. If you ever monetise the site, buy their commercial plan or remove the weather panel. Also check NSE's terms for commercial redistribution of its data.

## How the data works (no keys, ever)

```
GitHub Action (weekdays 18:30 & 21:00 IST)
   └─ node scripts/fetch-market-data.mjs
        ├─ nsearchives.nseindia.com  → F&O bhavcopy, CM bhavcopy, index closes, lot sizes, F&O ban list
        ├─ publisher RSS feeds       → headline + link + source only
        └─ api.open-meteo.com        → weather snapshot (the browser also fetches it live)
   └─ writes public/data/*.json  →  vite build  →  GitHub Pages (same origin, no CORS, no keys)
```

* **End-of-day only.** Prices are the **previous trading day's close**. They are not live. NSE end-of-day files have no bid/ask, so bid/ask are **estimated** from the closing price (and labelled as such).
* **Holidays.** On exchange holidays (for example 2 Oct, Gandhi Jayanti) the newest data is from the last trading day. The script automatically walks back to the latest available file.
* **Freeze quantities** are not published in a machine-readable keyless file. Where the curated table has no value, the site says **"verify with broker"**.
* If NSE is unreachable during a refresh, the last snapshot is kept and the site keeps working.

## Quick start

```bash
npm install
npm run data      # optional: refresh public/data from NSE (about 1 minute) and re-pack data-snapshot/public-data.zip
npm test          # 42 tests: quant engines, costs, no-hindsight sentinel, legal docs, safety caps, no-key UI
npm run dev       # http://localhost:5173
npm run build     # static bundle in dist/  (also copy to docs/ if Pages serves /docs)
```

### Deploy on GitHub Pages (either setting works)

| Settings → Pages → Source | What visitors get |
|---|---|
| **Deploy from a branch** (main, `/ root`) | `index.html` detects that it is being served raw and loads the ready-built `site/app.js` + `site/app.css`. Data comes from `data-snapshot/public-data.zip`; the newest committed copy is read from `raw.githubusercontent.com`, so the daily data refresh reaches visitors immediately. |
| **GitHub Actions** | The workflow builds and deploys `dist/` (content-hashed file names). |

The workflow (`.github/workflows/ci-and-pages.yml`) runs on every push and every weekday evening. It:
fetches NSE data → runs the tests → builds → commits `data-snapshot/` + `site/` back (`[skip ci]`) → deploys
via Actions **only if** Pages is set to GitHub Actions.

### Staying up to date (no stale pages)

* Every build gets a unique **build id** (`version.json`). The data has a `generatedAtIso` stamp (`data-snapshot/meta.json`).
* The app checks both every 5 minutes, and whenever the tab becomes visible. If anything is newer, it shows a
  banner and **auto-refreshes** after 30 s (immediately if the tab is in the background). This can be switched off
  under Data & Sources → Settings.
* The header **Refresh** button clears Cache Storage and any service worker, drops the in-memory data, and reloads
  with a cache-busting URL.

## Project map

| Path | What it is |
|---|---|
| `src/App.tsx` | App shell: consent gate, risk strip, sticky top bar with the **stock picker**, sidebar, pages and footer |
| `src/components/OverviewTab.tsx` | Beginner Home page |
| `src/components/shell/` | `StockPicker`, `Legal` (consent gate + Legal Center), `NewsWeather`, `Charts` |
| `src/components/DataPrivacyAndAuditTab.tsx` | Data sources, privacy controls, settings and audits (replaces the API Keys Vault) |
| `src/components/*Tab.tsx` | Research pages: Trade Check, Option Chain, Models, Strategies, Portfolio Risk, Practice, Context |
| `src/data/marketData.ts` | Keyless data loaders, chain analytics (ATM IV, PCR, max pain, expected move) and the snapshot builder |
| `src/engine/` | Quant engines from V4.0: rules, pricing (51 models), SVI, VaR/ES, costs, ledger, backtests, discipline |
| `src/legal/legalContent.js` | **Single source of truth** for all legal text (used by the site and by `LEGAL/*.md`) |
| `site-config.json` | Owner name, email, jurisdiction and legal version: **edit this** (read at runtime) |
| `site/` | Ready-built app (auto-generated by `npm run build`). Used when Pages = "Deploy from a branch" |
| `src/components/shell/UpdateChecker.tsx` | Refresh button, update detection, auto-refresh banner |
| `scripts/fetch-market-data.mjs` | Keyless NSE / RSS / Open-Meteo fetcher |
| `services/` | Optional legacy companion services from V4.0. The website does **not** need or use them |

## What is still sample data (and labelled so)

* **Portfolio Risk** uses a demo portfolio.
* **Practice & Backtest** replays an illustrative 15-Jul-2025 session.
* The **news-impact template**, **global context** and **event calendar** on the News page are examples.

Each of these pages shows a violet "ILLUSTRATIVE" notice. The fixtures live in `src/engine/verifiedHistoricalFixtures.ts`.

---
_Model outputs are calculations, not predictions or advice. Past or simulated performance does not indicate future results._
