# Data Sources & Attribution

> Where every number comes from — no API keys, all public downloads.
>
> Version 2026-10-02.v2 · Effective 02 October 2026

## 1. National Stock Exchange of India (NSE) — public archive files

F&O bhavcopy (option chains, futures, open interest, settlement prices, lot sizes), cash-market bhavcopy (stock closing prices), index closing values (incl. India VIX, P/E, P/B), F&O market-lot file and F&O ban list, downloaded from nsearchives.nseindia.com once per trading day after market close. End-of-day only; no bid/ask; no intraday data. Data © National Stock Exchange of India Ltd. Used for personal, non-commercial, educational research. NSE’s website terms apply; if you deploy this project publicly or commercially, verify whether a data licence from NSE is required.

## 2. News headlines — public RSS feeds

Headlines are read from the public RSS feeds of The Economic Times, Mint, Business Standard, The Hindu BusinessLine, NDTV Profit and Moneycontrol. Only the headline, time, source name and link are shown; the full article stays on the publisher’s website. All rights belong to the respective publishers. Matching of headlines to stocks is automatic keyword matching and can be wrong.

## 3. Weather — Open-Meteo

Weather data by Open-Meteo.com, licensed under CC BY 4.0. Fetched live in your browser with a fallback snapshot. Free for non-commercial use.

## 4. Assumptions shown in the app

- Risk-free rate: 6.75% (assumption, 91-day T-bill proxy).
- Bid/ask spread: estimated from traded volume, because the EOD file has no quotes.
- Implied volatility: computed by the Black-Scholes model from the closing prices.
- Freeze quantity for stocks not in the curated table: not available — verify with your broker.

## 5. Illustrative sample datasets

The 15-Jul-2025 replay, the 11-dimension news-impact examples, the demo portfolio and the U25 cost test vectors are illustrative samples used to demonstrate features. They are not actual market records, company filings or news.

