#!/usr/bin/env node
/**
 * KEYLESS PUBLIC WEB-DATA FETCHER (runs at build time — locally or in GitHub Actions)
 * ----------------------------------------------------------------------------------
 * No API keys, no tokens, no logins. Everything here is a plain public download:
 *
 *   1. NSE F&O end-of-day bhavcopy (UDiFF)  -> option chains, futures, lot sizes   (Tier 1 — official, EOD)
 *   2. NSE Cash-market bhavcopy (UDiFF)     -> stock closing prices + history     (Tier 1 — official, EOD)
 *   3. NSE index closing file               -> index levels, India VIX, P/E, P/B  (Tier 1 — official, EOD)
 *   4. NSE F&O market-lot file              -> lot sizes for every F&O underlying (Tier 1 — official)
 *   5. NSE F&O ban list                     -> securities in ban period           (Tier 1 — official)
 *   6. Public RSS headlines (ET, Mint, BS, BusinessLine, NDTV Profit, Moneycontrol) -> headline + link only
 *   7. Open-Meteo forecast API (CC BY 4.0)  -> weather for major Indian business cities
 *
 * Output: public/data/*.json  (served as same-origin static files by GitHub Pages — no CORS, no keys)
 *
 * The script NEVER invents numbers. If a source fails, the corresponding file is simply not
 * updated and the UI shows "DATA UNAVAILABLE" / the previous snapshot with its real date.
 *
 * Usage:  node scripts/fetch-market-data.mjs            (default 60 trading days of history)
 *         HISTORY_DAYS=30 node scripts/fetch-market-data.mjs
 */

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync, strFromU8 } from 'fflate';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '..', 'public', 'data');
const CHAIN_DIR = path.join(OUT_DIR, 'chains');
const HISTORY_DAYS = Number(process.env.HISTORY_DAYS || 250);
const MAX_OPTION_EXPIRIES = Number(process.env.MAX_OPTION_EXPIRIES || 4);
const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const NSE_ARCHIVE = 'https://nsearchives.nseindia.com';

const INDEX_NAME_MAP = {
  NIFTY: 'Nifty 50',
  BANKNIFTY: 'Nifty Bank',
  FINNIFTY: 'Nifty Financial Services',
  MIDCPNIFTY: 'Nifty Midcap Select',
  NIFTYNXT50: 'Nifty Next 50',
};

const DASHBOARD_INDICES = [
  'Nifty 50',
  'Nifty Bank',
  'Nifty Financial Services',
  'Nifty Midcap Select',
  'Nifty Next 50',
  'India VIX',
  'Nifty IT',
  'Nifty Auto',
  'Nifty Pharma',
  'Nifty FMCG',
  'Nifty Metal',
  'Nifty Energy',
  'Nifty Realty',
  'Nifty PSU Bank',
  'Nifty Midcap 100',
  'Nifty Smallcap 100',
];

const RSS_FEEDS = [
  { source: 'Economic Times — Markets', url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms' },
  { source: 'Economic Times — Stocks', url: 'https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms' },
  { source: 'Mint — Markets', url: 'https://www.livemint.com/rss/markets' },
  { source: 'Business Standard — Markets', url: 'https://www.business-standard.com/rss/markets-106.rss' },
  { source: 'BusinessLine — Markets', url: 'https://www.thehindubusinessline.com/markets/feeder/default.rss' },
  { source: 'NDTV Profit', url: 'https://feeds.feedburner.com/ndtvprofit-latest' },
  { source: 'Moneycontrol — Business', url: 'https://www.moneycontrol.com/rss/business.xml' },
];

const WEATHER_CITIES = [
  { city: 'Mumbai', lat: 19.076, lon: 72.8777, why: 'Financial capital; ports, refining (coastal), monsoon disruption risk' },
  { city: 'New Delhi', lat: 28.6139, lon: 77.209, why: 'Power demand (heatwaves), aviation fog delays (winter)' },
  { city: 'Chennai', lat: 13.0827, lon: 80.2707, why: 'Auto manufacturing hub, port, cyclone exposure' },
  { city: 'Kolkata', lat: 22.5726, lon: 88.3639, why: 'Eastern logistics hub, cyclone exposure' },
  { city: 'Bengaluru', lat: 12.9716, lon: 77.5946, why: 'IT services hub (weather impact usually not material)' },
  { city: 'Jamnagar', lat: 22.4707, lon: 70.0577, why: 'Major refining complex; cyclone exposure (Gujarat coast)' },
];

// ----------------------------------------------------------------------------------------------
// helpers
// ----------------------------------------------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchBuf(url, { retries = 2, timeoutMs = 25000 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: '*/*', 'Accept-Language': 'en-IN,en;q=0.9' },
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (res.status === 404) return null; // holiday / not yet published
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return new Uint8Array(await res.arrayBuffer());
    } catch (err) {
      clearTimeout(t);
      if (attempt === retries) {
        console.warn(`  ! failed ${url}: ${err.message}`);
        return null;
      }
      await sleep(800 * (attempt + 1));
    }
  }
  return null;
}

async function fetchText(url, opts) {
  const buf = await fetchBuf(url, opts);
  return buf ? strFromU8(buf) : null;
}

function unzipFirstCsv(buf) {
  try {
    const files = unzipSync(buf);
    const name = Object.keys(files).find((n) => n.toLowerCase().endsWith('.csv'));
    return name ? strFromU8(files[name]) : null;
  } catch {
    return null;
  }
}

function parseCsv(text) {
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim().length > 0);
  const header = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(',');
    const row = {};
    header.forEach((h, i) => (row[h] = (cells[i] ?? '').trim()));
    return row;
  });
}

const num = (v) => {
  const n = Number(String(v ?? '').replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : null;
};

function istNow() {
  return new Date(Date.now() + 5.5 * 3600 * 1000); // shift so getUTC* returns IST wall clock
}
const ymd = (d) =>
  `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
const dmy = (d) =>
  `${String(d.getUTCDate()).padStart(2, '0')}${String(d.getUTCMonth() + 1).padStart(2, '0')}${d.getUTCFullYear()}`;
const isoDate = (d) => d.toISOString().slice(0, 10);

function candidateDates(maxBack) {
  const out = [];
  const d = istNow();
  // Before ~18:00 IST today's bhavcopy is usually not published yet; still try it (404 => skipped).
  for (let i = 0; i < maxBack; i++) {
    const day = new Date(d.getTime() - i * 86400000);
    const wd = day.getUTCDay();
    if (wd === 0 || wd === 6) continue;
    out.push(day);
  }
  return out;
}

async function pool(items, size, fn) {
  const results = new Array(items.length);
  let idx = 0;
  const workers = Array.from({ length: size }, async () => {
    while (idx < items.length) {
      const my = idx++;
      results[my] = await fn(items[my], my);
      await sleep(120);
    }
  });
  await Promise.all(workers);
  return results;
}

function decodeEntities(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseRss(xml, source) {
  const items = [];
  const re = /<item[\s>][\s\S]*?<\/item>/g;
  let m;
  while ((m = re.exec(xml))) {
    const block = m[0];
    const pick = (tag) => {
      const mm = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
      return mm ? decodeEntities(mm[1]) : '';
    };
    const title = pick('title');
    let link = pick('link');
    if (!link) {
      const g = block.match(/<guid[^>]*>([\s\S]*?)<\/guid>/);
      link = g ? decodeEntities(g[1]) : '';
    }
    const pub = pick('pubDate') || pick('dc:date');
    const t = pub ? new Date(pub) : null;
    if (!title || !/^https?:\/\//.test(link)) continue;
    items.push({
      title: title.slice(0, 300),
      link,
      source,
      publishedIso: t && !Number.isNaN(t.getTime()) ? t.toISOString() : null,
    });
  }
  return items;
}

function cleanCompanyName(raw) {
  return String(raw || '')
    .replace(/\b(LIMITED|LTD\.?|LTD|INDIA|THE|CORPORATION|CORP|COMPANY|CO\.)\b/gi, ' ')
    .replace(/[^A-Za-z0-9& ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleCase(s) {
  return s
    .toLowerCase()
    .split(' ')
    .map((w) => (w.length <= 3 && /^[a-z]+$/.test(w) && ['and', 'of'].includes(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

async function writeJson(file, data) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(data));
}

// ----------------------------------------------------------------------------------------------
// main
// ----------------------------------------------------------------------------------------------
async function main() {
  const started = Date.now();
  await mkdir(CHAIN_DIR, { recursive: true });
  const sourcesStatus = [];

  // 1) Latest F&O bhavcopy -----------------------------------------------------------------
  console.log('> Locating latest NSE F&O bhavcopy...');
  let foRows = null;
  let tradeDate = null;
  for (const d of candidateDates(12)) {
    const buf = await fetchBuf(`${NSE_ARCHIVE}/content/fo/BhavCopy_NSE_FO_0_0_0_${ymd(d)}_F_0000.csv.zip`);
    if (!buf) continue;
    const csv = unzipFirstCsv(buf);
    if (!csv) continue;
    foRows = parseCsv(csv);
    tradeDate = isoDate(d);
    break;
  }
  if (!foRows) {
    console.error('X Could not download any F&O bhavcopy in the last 12 days. Keeping the previous snapshot.');
    sourcesStatus.push({ id: 'NSE_FO_BHAVCOPY', ok: false });
    if (existsSync(path.join(OUT_DIR, 'meta.json'))) process.exit(0);
    process.exit(1);
  }
  console.log(`  ✓ F&O bhavcopy for ${tradeDate}: ${foRows.length} rows`);
  sourcesStatus.push({ id: 'NSE_FO_BHAVCOPY', ok: true, asOf: tradeDate });

  // 2) Market lots + ban list --------------------------------------------------------------
  const lotsCsv = await fetchText(`${NSE_ARCHIVE}/content/fo/fo_mktlots.csv`);
  const lotMap = {};
  if (lotsCsv) {
    const lines = lotsCsv.replace(/\r/g, '').split('\n').filter(Boolean);
    const header = lines[0].split(',').map((s) => s.trim());
    for (const line of lines.slice(1)) {
      const cells = line.split(',').map((s) => s.trim());
      const sym = cells[1];
      if (!sym || sym === 'Symbol' || sym === 'SYMBOL') continue;
      const firstLot = cells.slice(2).map(num).find((v) => v && v > 0) ?? null;
      lotMap[sym] = { name: cells[0], lot: firstLot, month: header[2] };
    }
    sourcesStatus.push({ id: 'NSE_MARKET_LOTS', ok: true });
  } else sourcesStatus.push({ id: 'NSE_MARKET_LOTS', ok: false });

  const banCsv = await fetchText(`${NSE_ARCHIVE}/content/fo/fo_secban.csv`);
  const banList = [];
  let banForDate = null;
  if (banCsv) {
    const lines = banCsv.replace(/\r/g, '').split('\n').filter(Boolean);
    banForDate = (lines[0].match(/(\d{2}-[A-Z]{3}-\d{4})/) || [])[1] || null;
    for (const l of lines.slice(1)) {
      const s = l.split(',')[1]?.trim();
      if (s) banList.push(s);
    }
    sourcesStatus.push({ id: 'NSE_FO_BAN_LIST', ok: true, asOf: banForDate });
  } else sourcesStatus.push({ id: 'NSE_FO_BAN_LIST', ok: false });

  // 3) Index closes + CM bhavcopy history -------------------------------------------------
  console.log(`> Downloading ~${HISTORY_DAYS} trading days of index + stock closes...`);
  const tradeDay = new Date(`${tradeDate}T00:00:00Z`);
  const histCandidates = candidateDates(Math.ceil(HISTORY_DAYS * 1.6) + 20).filter(
    (d) => isoDate(d) <= tradeDate
  );
  const indexHistory = {}; // indexName -> [{d, c, ...}]
  const indexLatest = {};
  const daysFound = [];
  await pool(histCandidates, 4, async (d) => {
    if (daysFound.length >= HISTORY_DAYS + 3) return;
    const txt = await fetchText(`${NSE_ARCHIVE}/content/indices/ind_close_all_${dmy(d)}.csv`, { retries: 1 });
    if (!txt || !txt.startsWith('Index Name')) return;
    daysFound.push(isoDate(d));
    for (const r of parseCsv(txt)) {
      const name = r['Index Name'];
      const close = num(r['Closing Index Value']);
      if (!name || close === null) continue;
      (indexHistory[name] ||= []).push({
        d: isoDate(d),
        c: close,
        chgPct: num(r['Change(%)']),
        pe: num(r['P/E']),
        pb: num(r['P/B']),
        dy: num(r['Div Yield']),
        o: num(r['Open Index Value']),
        h: num(r['High Index Value']),
        l: num(r['Low Index Value']),
      });
    }
  });
  daysFound.sort();
  const histDays = daysFound.slice(-HISTORY_DAYS);
  for (const name of Object.keys(indexHistory)) {
    indexHistory[name] = indexHistory[name]
      .filter((p) => histDays.includes(p.d))
      .sort((a, b) => (a.d < b.d ? -1 : 1));
    indexLatest[name] = indexHistory[name][indexHistory[name].length - 1];
  }
  sourcesStatus.push({ id: 'NSE_INDEX_CLOSE', ok: histDays.length > 0, days: histDays.length });
  console.log(`  ✓ index history: ${histDays.length} trading days`);

  const stockHistory = {}; // symbol -> [{d,c}]
  const stockLatest = {}; // symbol -> row
  const foSymbols = new Set(foRows.map((r) => r.TckrSymb));
  await pool(histDays.slice().reverse(), 4, async (day) => {
    const buf = await fetchBuf(
      `${NSE_ARCHIVE}/content/cm/BhavCopy_NSE_CM_0_0_0_${day.replace(/-/g, '')}_F_0000.csv.zip`,
      { retries: 1 }
    );
    if (!buf) return;
    const csv = unzipFirstCsv(buf);
    if (!csv) return;
    for (const r of parseCsv(csv)) {
      if (r.SctySrs !== 'EQ' || !foSymbols.has(r.TckrSymb)) continue;
      const c = num(r.ClsPric);
      if (c === null) continue;
      (stockHistory[r.TckrSymb] ||= []).push({ d: day, c, o: num(r.OpnPric), h: num(r.HghPric), l: num(r.LwPric), v: num(r.TtlTradgVol) });
      if (day === tradeDate) stockLatest[r.TckrSymb] = r;
    }
  });
  for (const s of Object.keys(stockHistory)) stockHistory[s].sort((a, b) => (a.d < b.d ? -1 : 1));
  sourcesStatus.push({ id: 'NSE_CM_BHAVCOPY', ok: Object.keys(stockLatest).length > 0, asOf: tradeDate });
  console.log(`  ✓ stock history for ${Object.keys(stockHistory).length} F&O stocks`);

  // 4) Build per-underlying chains --------------------------------------------------------
  console.log('> Building option chains...');
  const bySymbol = {};
  for (const r of foRows) {
    const sym = r.TckrSymb;
    const tp = r.FinInstrmTp; // IDO STO IDF STF
    if (!['IDO', 'STO', 'IDF', 'STF'].includes(tp)) continue;
    const u = (bySymbol[sym] ||= { type: tp.startsWith('ID') ? 'INDEX' : 'STOCK', options: {}, futures: [], underlying: null, lots: new Set() });
    const expiry = r.XpryDt;
    const und = num(r.UndrlygPric);
    if (und) u.underlying = und;
    const lot = num(r.NewBrdLotQty);
    if (lot) u.lots.add(lot);
    if (tp.endsWith('F')) {
      u.futures.push({
        expiry,
        close: num(r.ClsPric),
        settle: num(r.SttlmPric),
        prevClose: num(r.PrvsClsgPric),
        oi: num(r.OpnIntrst),
        chgOi: num(r.ChngInOpnIntrst),
        volume: num(r.TtlTradgVol),
        lot,
      });
      continue;
    }
    const strike = num(r.StrkPric);
    const side = r.OptnTp === 'CE' ? 'ce' : 'pe';
    const ex = (u.options[expiry] ||= {});
    const row = (ex[strike] ||= { k: strike });
    row[side] = {
      close: num(r.ClsPric),
      settle: num(r.SttlmPric),
      prevClose: num(r.PrvsClsgPric),
      high: num(r.HghPric),
      low: num(r.LwPric),
      oi: num(r.OpnIntrst),
      chgOi: num(r.ChngInOpnIntrst),
      volume: num(r.TtlTradgVol),
    };
    row.lot = lot;
  }

  const universe = [];
  const stockNameMap = {};
  for (const [sym, u] of Object.entries(bySymbol)) {
    const expiriesAll = Object.keys(u.options).sort();
    const expiries = expiriesAll.slice(0, MAX_OPTION_EXPIRIES);
    const isIndex = u.type === 'INDEX';
    const idxName = INDEX_NAME_MAP[sym];
    const idx = idxName ? indexLatest[idxName] : null;
    const cm = stockLatest[sym];
    const spot = isIndex ? idx?.c ?? u.underlying : num(cm?.ClsPric) ?? u.underlying;
    const prevClose = isIndex
      ? idx && idx.chgPct !== null
        ? idx.c / (1 + idx.chgPct / 100)
        : null
      : num(cm?.PrvsClsgPric);
    const changePct = spot && prevClose ? ((spot - prevClose) / prevClose) * 100 : null;
    const lotInfo = lotMap[sym];
    const nameRaw = isIndex ? idxName || lotInfo?.name || sym : cm?.FinInstrmNm || lotInfo?.name || sym;
    const name = isIndex ? nameRaw : titleCase(cleanCompanyName(nameRaw)) || sym;
    stockNameMap[sym] = name;

    const chain = {};
    let totalCeOi = 0;
    let totalPeOi = 0;
    for (const e of expiries) {
      const rows = Object.values(u.options[e]).sort((a, b) => a.k - b.k);
      chain[e] = rows.map((r) => [
        r.k,
        r.ce?.close ?? null,
        r.ce?.settle ?? null,
        r.ce?.oi ?? null,
        r.ce?.chgOi ?? null,
        r.ce?.volume ?? null,
        r.pe?.close ?? null,
        r.pe?.settle ?? null,
        r.pe?.oi ?? null,
        r.pe?.chgOi ?? null,
        r.pe?.volume ?? null,
      ]);
      for (const r of rows) {
        totalCeOi += r.ce?.oi ?? 0;
        totalPeOi += r.pe?.oi ?? 0;
      }
    }
    const lotSize = lotInfo?.lot ?? (u.lots.size ? Math.min(...u.lots) : null);
    const history = isIndex
      ? (indexHistory[idxName] || []).map((p) => ({ d: p.d, c: p.c, o: p.o, h: p.h, l: p.l }))
      : stockHistory[sym] || [];
    const futs = u.futures.sort((a, b) => (a.expiry < b.expiry ? -1 : 1));

    const detail = {
      symbol: sym,
      name,
      type: u.type,
      tradeDate,
      spot,
      prevClose,
      changePct,
      underlyingFromFo: u.underlying,
      lotSize,
      lotSizeSource: lotInfo?.lot ? `NSE fo_mktlots.csv (${lotInfo.month})` : 'NSE F&O bhavcopy NewBrdLotQty',
      inBanList: banList.includes(sym),
      futures: futs,
      expiries,
      chainColumns: ['strike', 'ceClose', 'ceSettle', 'ceOi', 'ceChgOi', 'ceVol', 'peClose', 'peSettle', 'peOi', 'peChgOi', 'peVol'],
      chain,
      history,
      indexStats: isIndex && idx ? { pe: idx.pe, pb: idx.pb, divYield: idx.dy } : null,
    };
    await writeJson(path.join(CHAIN_DIR, `${sym}.json`), detail);

    universe.push({
      symbol: sym,
      name,
      type: u.type,
      spot,
      changePct: changePct === null ? null : Number(changePct.toFixed(2)),
      lotSize,
      nearExpiry: expiries[0] ?? null,
      expiries: expiries.length,
      pcr: totalCeOi > 0 ? Number((totalPeOi / totalCeOi).toFixed(2)) : null,
      futOi: futs.reduce((s, f) => s + (f.oi || 0), 0),
      inBanList: banList.includes(sym),
      contractValue: spot && lotSize ? Math.round(spot * lotSize) : null,
    });
  }

  const order = { NIFTY: 0, BANKNIFTY: 1, FINNIFTY: 2, MIDCPNIFTY: 3, NIFTYNXT50: 4 };
  universe.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'INDEX' ? -1 : 1;
    if (a.type === 'INDEX') return (order[a.symbol] ?? 9) - (order[b.symbol] ?? 9);
    return a.symbol.localeCompare(b.symbol);
  });
  await writeJson(path.join(OUT_DIR, 'universe.json'), { tradeDate, count: universe.length, items: universe });
  console.log(`  ✓ ${universe.length} underlyings written`);

  // 5) Market overview ---------------------------------------------------------------------
  const stocks = universe.filter((u) => u.type === 'STOCK' && u.changePct !== null);
  const sorted = stocks.slice().sort((a, b) => b.changePct - a.changePct);
  const market = {
    tradeDate,
    indices: DASHBOARD_INDICES.filter((n) => indexLatest[n]).map((n) => ({
      name: n,
      close: indexLatest[n].c,
      changePct: indexLatest[n].chgPct,
      pe: indexLatest[n].pe,
      history: (indexHistory[n] || []).map((p) => [p.d, p.c]),
    })),
    gainers: sorted.slice(0, 8).map(({ symbol, name, spot, changePct }) => ({ symbol, name, spot, changePct })),
    losers: sorted.slice(-8).reverse().map(({ symbol, name, spot, changePct }) => ({ symbol, name, spot, changePct })),
    advances: stocks.filter((s) => s.changePct > 0).length,
    declines: stocks.filter((s) => s.changePct < 0).length,
    banList,
    banForDate,
  };
  await writeJson(path.join(OUT_DIR, 'market.json'), market);

  // 6) News headlines (headline + link + source only) -------------------------------------
  console.log('> Fetching public RSS headlines...');
  const newsItems = [];
  for (const f of RSS_FEEDS) {
    const xml = await fetchText(f.url, { retries: 1, timeoutMs: 15000 });
    if (!xml) {
      sourcesStatus.push({ id: `RSS:${f.source}`, ok: false });
      continue;
    }
    const items = parseRss(xml, f.source);
    newsItems.push(...items);
    sourcesStatus.push({ id: `RSS:${f.source}`, ok: true, items: items.length });
  }
  const seen = new Set();
  const keywordIndex = Object.entries(stockNameMap)
    .filter(([sym]) => !INDEX_NAME_MAP[sym])
    .map(([sym, name]) => {
      const words = name.split(' ').filter(Boolean);
      const key = words.length >= 2 ? words.slice(0, 2).join(' ') : words[0] || sym;
      return { sym, key: key.length >= 4 ? key.toLowerCase() : null };
    });
  const news = newsItems
    .filter((n) => {
      const k = n.title.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .map((n) => {
      const tl = ` ${n.title.toLowerCase()} `;
      const symbols = new Set();
      for (const { sym, key } of keywordIndex) {
        if (sym.length >= 3 && new RegExp(`\\b${sym.replace(/[&]/g, '\\&')}\\b`).test(n.title)) symbols.add(sym);
        if (key && tl.includes(` ${key}`)) symbols.add(sym);
      }
      if (/\b(nifty|sensex)\b/i.test(n.title) && !/bank nifty|nifty bank/i.test(n.title)) symbols.add('NIFTY');
      if (/bank nifty|nifty bank|banknifty/i.test(n.title)) symbols.add('BANKNIFTY');
      return { ...n, symbols: [...symbols].slice(0, 6) };
    })
    .sort((a, b) => ((b.publishedIso || '') > (a.publishedIso || '') ? 1 : -1))
    .slice(0, 250);
  await writeJson(path.join(OUT_DIR, 'news.json'), {
    fetchedAtIso: new Date().toISOString(),
    note: 'Headlines and links only. Copyright belongs to each publisher. Click through to read the original article.',
    items: news,
  });
  console.log(`  ✓ ${news.length} headlines`);

  // 7) Weather snapshot ---------------------------------------------------------------------
  console.log('> Fetching Open-Meteo weather snapshot...');
  const weather = [];
  for (const c of WEATHER_CITIES) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&timezone=Asia%2FKolkata&forecast_days=3`;
    const txt = await fetchText(url, { retries: 1, timeoutMs: 15000 });
    if (!txt) continue;
    try {
      weather.push({ ...c, data: JSON.parse(txt) });
    } catch {
      /* ignore */
    }
  }
  sourcesStatus.push({ id: 'OPEN_METEO', ok: weather.length > 0 });
  await writeJson(path.join(OUT_DIR, 'weather.json'), { fetchedAtIso: new Date().toISOString(), cities: weather });

  // 8) Meta ------------------------------------------------------------------------------------
  const meta = {
    schemaVersion: 1,
    tradeDate,
    generatedAtIso: new Date().toISOString(),
    historyDays: histDays.length,
    historyFrom: histDays[0] ?? null,
    historyTo: histDays[histDays.length - 1] ?? null,
    underlyings: universe.length,
    dataNature: 'END_OF_DAY_OFFICIAL_NSE_ARCHIVES — NOT LIVE, NOT REAL-TIME, NO BID/ASK',
    sources: sourcesStatus,
    tookSeconds: Math.round((Date.now() - started) / 1000),
  };
  await writeJson(path.join(OUT_DIR, 'meta.json'), meta);
  console.log(`\n✓ Done in ${meta.tookSeconds}s — trade date ${tradeDate}, ${universe.length} underlyings.`);
}

main().catch((err) => {
  console.error('X fetch-market-data failed:', err);
  // Do not fail the deployment: previously committed snapshot (if any) remains valid with its real date.
  process.exit(existsSync(path.join(OUT_DIR, 'meta.json')) ? 0 : 1);
});
