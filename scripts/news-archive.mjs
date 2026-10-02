/**
 * NEWS ARCHIVE: unlimited, never-deleted headline archive (headline + link + source only).
 * ---------------------------------------------------------------------------------------
 * Each RSS feed only lists its most recent stories (for example, ET lists its latest 50).
 * So the "Refresh news" GitHub workflow checks every feed EVERY HOUR. It ADDS every new
 * headline to a permanent archive, and never deletes anything:
 *
 *   data-snapshot/news/latest.json           newest 2 days (loaded on every page view)
 *   data-snapshot/news/index.json            list of all archived days + counts
 *   data-snapshot/news/days/YYYY-MM-DD.json  every headline of that day (IST), forever
 *
 * Copyright: only the headline, the link and the publisher name are stored. Visitors click
 * through to the publisher's own site to read the article.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

/** category: MARKETS | COMPANIES | ECONOMY | FILINGS | REGULATOR | IPO | COMMODITIES */
export const NEWS_FEEDS = [
  // Economic Times
  { source: 'Economic Times — Markets', category: 'MARKETS', url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms' },
  { source: 'Economic Times — Stocks', category: 'MARKETS', url: 'https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms' },
  { source: 'Economic Times — Stock news', category: 'COMPANIES', url: 'https://economictimes.indiatimes.com/markets/stocks/news/rssfeeds/2146843.cms' },
  { source: 'Economic Times — Companies', category: 'COMPANIES', url: 'https://economictimes.indiatimes.com/news/company/corporate-trends/rssfeeds/2143429.cms' },
  { source: 'Economic Times — Industry', category: 'COMPANIES', url: 'https://economictimes.indiatimes.com/industry/rssfeeds/13352306.cms' },
  { source: 'Economic Times — Economy', category: 'ECONOMY', url: 'https://economictimes.indiatimes.com/news/economy/rssfeeds/1373380680.cms' },
  { source: 'Economic Times — IPOs', category: 'IPO', url: 'https://economictimes.indiatimes.com/markets/ipos/fpos/rssfeeds/14655708.cms' },
  { source: 'Economic Times — Commodities', category: 'COMMODITIES', url: 'https://economictimes.indiatimes.com/markets/commodities/rssfeeds/1808152121.cms' },
  // Mint
  { source: 'Mint — Markets', category: 'MARKETS', url: 'https://www.livemint.com/rss/markets' },
  { source: 'Mint — Companies', category: 'COMPANIES', url: 'https://www.livemint.com/rss/companies' },
  { source: 'Mint — Economy', category: 'ECONOMY', url: 'https://www.livemint.com/rss/economy' },
  { source: 'Mint — Money', category: 'MARKETS', url: 'https://www.livemint.com/rss/money' },
  // Business Standard
  { source: 'Business Standard — Markets', category: 'MARKETS', url: 'https://www.business-standard.com/rss/markets-106.rss' },
  { source: 'Business Standard — Market news', category: 'MARKETS', url: 'https://www.business-standard.com/rss/markets/news-10601.rss' },
  { source: 'Business Standard — Companies', category: 'COMPANIES', url: 'https://www.business-standard.com/rss/companies-101.rss' },
  { source: 'Business Standard — Economy', category: 'ECONOMY', url: 'https://www.business-standard.com/rss/economy-102.rss' },
  // BusinessLine / The Hindu
  { source: 'BusinessLine — Markets', category: 'MARKETS', url: 'https://www.thehindubusinessline.com/markets/feeder/default.rss' },
  { source: 'BusinessLine — Stock markets', category: 'MARKETS', url: 'https://www.thehindubusinessline.com/markets/stock-markets/feeder/default.rss' },
  { source: 'BusinessLine — Companies', category: 'COMPANIES', url: 'https://www.thehindubusinessline.com/companies/feeder/default.rss' },
  { source: 'BusinessLine — Economy', category: 'ECONOMY', url: 'https://www.thehindubusinessline.com/economy/feeder/default.rss' },
  { source: 'The Hindu — Markets', category: 'MARKETS', url: 'https://www.thehindu.com/business/markets/feeder/default.rss' },
  { source: 'The Hindu — Business', category: 'COMPANIES', url: 'https://www.thehindu.com/business/feeder/default.rss' },
  // CNBC-TV18, NDTV Profit, Business Today, Moneycontrol
  { source: 'CNBC-TV18 — Markets', category: 'MARKETS', url: 'https://www.cnbctv18.com/commonfeeds/v1/cne/rss/market.xml' },
  { source: 'CNBC-TV18 — Business', category: 'COMPANIES', url: 'https://www.cnbctv18.com/commonfeeds/v1/cne/rss/business.xml' },
  { source: 'NDTV Profit', category: 'MARKETS', url: 'https://feeds.feedburner.com/ndtvprofit-latest' },
  { source: 'Business Today', category: 'ECONOMY', url: 'https://www.businesstoday.in/rssfeeds/?id=225346' },
  { source: 'Moneycontrol — Latest', category: 'MARKETS', url: 'https://www.moneycontrol.com/rss/latestnews.xml' },
  { source: 'Moneycontrol — Buzzing stocks', category: 'COMPANIES', url: 'https://www.moneycontrol.com/rss/buzzingstocks.xml' },
  { source: 'Moneycontrol — Results', category: 'COMPANIES', url: 'https://www.moneycontrol.com/rss/results.xml' },
  { source: 'Moneycontrol — Business', category: 'COMPANIES', url: 'https://www.moneycontrol.com/rss/business.xml' },
  { source: 'Moneycontrol — Market reports', category: 'MARKETS', url: 'https://www.moneycontrol.com/rss/marketreports.xml' },
  { source: 'Moneycontrol — Economy', category: 'ECONOMY', url: 'https://www.moneycontrol.com/rss/economy.xml' },
  // Official sources
  { source: 'NSE — Company announcements', category: 'FILINGS', url: 'https://nsearchives.nseindia.com/content/RSS/Online_announcements.xml', kind: 'NSE_FILINGS' },
  { source: 'NSE — Financial results', category: 'FILINGS', url: 'https://nsearchives.nseindia.com/content/RSS/Financial_Results.xml', kind: 'NSE_FILINGS' },
  { source: 'NSE — Board meetings', category: 'FILINGS', url: 'https://nsearchives.nseindia.com/content/RSS/Board_Meetings.xml', kind: 'NSE_FILINGS' },
  { source: 'NSE — Corporate actions', category: 'FILINGS', url: 'https://nsearchives.nseindia.com/content/RSS/Corporate_action.xml', kind: 'NSE_FILINGS' },
  { source: 'SEBI — Press releases & orders', category: 'REGULATOR', url: 'https://www.sebi.gov.in/sebirss.xml' },
  { source: 'RBI — Press releases', category: 'REGULATOR', url: 'https://www.rbi.org.in/pressreleases_rss.xml' },
];

const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

/** Parses RSS dates. Also handles NSE's "02-Oct-2026 22:15:57" format, which is in IST. */
export function parsePubDate(s) {
  if (!s) return null;
  const t = String(s).trim();
  const m = t.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    const mon = MONTHS[m[2].toLowerCase()];
    if (mon === undefined) return null;
    const utc = Date.UTC(+m[3], mon, +m[1], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0)) - 5.5 * 3600 * 1000;
    return new Date(utc).toISOString();
  }
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function decode(s) {
  return String(s ?? '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseFeed(xml, feed) {
  const items = [];
  const re = /<item[\s>][\s\S]*?<\/item>/g;
  let m;
  while ((m = re.exec(xml))) {
    const block = m[0];
    const pick = (tag) => {
      const mm = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
      return mm ? decode(mm[1]) : '';
    };
    let title = pick('title');
    let link = pick('link');
    if (!link) link = pick('guid');
    if (!title || !/^https?:\/\//.test(link)) continue;
    if (feed.kind === 'NSE_FILINGS') {
      const desc = pick('description');
      const subject = (desc.split('|SUBJECT:')[1] || desc.replace(/^.*?has informed the Exchange (about|regarding)\s*/i, '')).trim();
      title = subject ? `${title.replace(/\s+Limited$/i, '')}: ${subject}` : title;
    }
    items.push({
      title: title.slice(0, 300),
      link: link.trim(),
      source: feed.source,
      category: feed.category,
      publishedIso: parsePubDate(pick('pubDate') || pick('dc:date') || pick('updated')),
    });
  }
  return items;
}

const GENERIC_WORDS = new Set([
  'life', 'general', 'national', 'indian', 'india', 'bharat', 'hindustan', 'state', 'union', 'central', 'new', 'great',
  'power', 'oil', 'steel', 'bank', 'gas', 'housing', 'rural', 'small', 'industrial', 'max', 'one', 'global', 'of', 'and',
  'finance', 'financial', 'capital', 'industries', 'services', 'energy', 'motors', 'tech', 'technologies', 'insura', 'ins',
]);

/** Names that headlines actually use (NSE's short names are abbreviated, e.g. "Life Insura of"). */
const ALIASES = {
  RELIANCE: ['reliance industries', 'ril'], TCS: ['tcs', 'tata consultancy'], INFY: ['infosys'], HDFCBANK: ['hdfc bank'],
  ICICIBANK: ['icici bank'], SBIN: ['sbi', 'state bank of india'], LICI: ['lic', 'life insurance corporation'],
  BANKINDIA: ['(?<!(state|central|union|reserve) )bank of india'], AXISBANK: ['axis bank'], KOTAKBANK: ['kotak mahindra bank', 'kotak bank'],
  ICICIPRULI: ['icici prudential life', 'icici pru life'], ICICIGI: ['icici lombard'], HDFCLIFE: ['hdfc life'], SBILIFE: ['sbi life'],
  LT: ['l&t', 'larsen'], 'M&M': ['m&m', 'mahindra & mahindra', 'mahindra and mahindra'], BAJFINANCE: ['bajaj finance'],
  BAJAJFINSV: ['bajaj finserv'], 'BAJAJ-AUTO': ['bajaj auto'], ITC: ['itc'], HINDUNILVR: ['hul', 'hindustan unilever'],
  BHARTIARTL: ['airtel', 'bharti airtel'], MARUTI: ['maruti'], TATASTEEL: ['tata steel'], TATAPOWER: ['tata power'],
  TMPV: ['tata motors'], TATAMOTORS: ['tata motors'], SUNPHARMA: ['sun pharma'], HCLTECH: ['hcltech', 'hcl tech'], WIPRO: ['wipro'],
  TECHM: ['tech mahindra'], ADANIENT: ['adani enterprises'], ADANIPORTS: ['adani ports'], ADANIGREEN: ['adani green'],
  ADANIPOWER: ['adani power'], NTPC: ['ntpc'], ONGC: ['ongc'], POWERGRID: ['power grid'], COALINDIA: ['coal india'],
  IOC: ['indian oil', 'ioc'], BPCL: ['bpcl', 'bharat petroleum'], HINDPETRO: ['hpcl', 'hindustan petroleum'], GAIL: ['gail'],
  HAL: ['hal', 'hindustan aeronautics'], BEL: ['bel', 'bharat electronics'], ULTRACEMCO: ['ultratech'], ASIANPAINT: ['asian paints'],
  TITAN: ['titan'], NESTLEIND: ['nestle india', 'nestle'], JSWSTEEL: ['jsw steel'], HINDALCO: ['hindalco'], VEDL: ['vedanta'],
  DRREDDY: ["dr reddy's", 'dr reddy'], CIPLA: ['cipla'], ETERNAL: ['eternal', 'zomato'], PAYTM: ['paytm'], NYKAA: ['nykaa'],
  IRCTC: ['irctc'], DMART: ['dmart', 'avenue supermarts'], PNB: ['pnb', 'punjab national bank'], BANKBARODA: ['bank of baroda'],
  CANBK: ['canara bank'], UNIONBANK: ['union bank'], INDUSINDBK: ['indusind'], YESBANK: ['yes bank'], IDEA: ['vodafone idea'],
  EICHERMOT: ['eicher', 'royal enfield'], HEROMOTOCO: ['hero motocorp'], TVSMOTOR: ['tvs motor'], DIVISLAB: ["divi's", 'divis lab'],
  APOLLOHOSP: ['apollo hospitals'], GRASIM: ['grasim'], SHRIRAMFIN: ['shriram finance'], TRENT: ['trent'], JIOFIN: ['jio financial'],
  DLF: ['dlf'], SAIL: ['sail'], NMDC: ['nmdc'], IRFC: ['irfc'], RVNL: ['rvnl'], ABB: ['abb india'], SIEMENS: ['siemens'],
  HAVELLS: ['havells'], PIDILITIND: ['pidilite'], BRITANNIA: ['britannia'], DABUR: ['dabur'], MARICO: ['marico'],
  GODREJCP: ['godrej consumer'], TATACONSUM: ['tata consumer'], LTIM: ['ltimindtree'], PERSISTENT: ['persistent systems'],
  COFORGE: ['coforge'], MPHASIS: ['mphasis'], INDIGO: ['indigo', 'interglobe'], ZYDUSLIFE: ['zydus'], LUPIN: ['lupin'],
  AUROPHARMA: ['aurobindo'], TORNTPHARM: ['torrent pharma'], MUTHOOTFIN: ['muthoot'], CHOLAFIN: ['cholamandalam'],
};

const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Builds a function that tags a headline with the F&O symbols it mentions (whole-word keyword match). */
export function makeSymbolMatcher(stocks) {
  const index = stocks
    .filter((s) => s.type !== 'INDEX')
    .map(({ symbol, name }) => {
      const words = String(name || '').toLowerCase().split(' ').filter(Boolean);
      const patterns = [];
      // Name-based key: first two words, unless they are generic / abbreviated
      const two = words.slice(0, 2);
      const useful = two.filter((w) => !GENERIC_WORDS.has(w) && w.length >= 3);
      if (two.length === 2 && useful.length >= 1 && !GENERIC_WORDS.has(two[0])) patterns.push(esc(two.join(' ')));
      else if (words.length === 1 && words[0].length >= 5 && !GENERIC_WORDS.has(words[0])) patterns.push(esc(words[0]));
      for (const a of ALIASES[symbol] ?? []) patterns.push(a.startsWith('(?<!') ? a : esc(a));
      const nameRe = patterns.length ? new RegExp(`(?<![a-z0-9&])(${patterns.join('|')})(?![a-z0-9&])`, 'i') : null;
      // Ticker in capitals, e.g. "RELIANCE", "HDFCBANK" (3+ letters)
      const symRe = symbol.length >= 3 ? new RegExp(`(?<![A-Za-z0-9])${esc(symbol)}(?![A-Za-z0-9])`) : null;
      return { symbol, nameRe, symRe };
    });
  return (title) => {
    const out = new Set();
    for (const { symbol, nameRe, symRe } of index) {
      if ((symRe && symRe.test(title)) || (nameRe && nameRe.test(title))) out.add(symbol);
    }
    if (/\b(nifty|sensex)\b/i.test(title) && !/bank nifty|nifty bank/i.test(title)) out.add('NIFTY');
    if (/bank nifty|nifty bank|banknifty/i.test(title)) out.add('BANKNIFTY');
    return [...out].slice(0, 8);
  };
}

export const istDay = (iso) => new Date(Date.parse(iso) + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
const keyOf = (n) => n.link;
const titleKey = (n) => n.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

async function getText(url) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20000);
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: '*/*' }, signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch {
      clearTimeout(t);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return null;
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

async function writeJson(file, data) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(data));
}

const sortDesc = (a, b) => ((b.publishedIso || '') > (a.publishedIso || '') ? 1 : (b.publishedIso || '') < (a.publishedIso || '') ? -1 : 0);

/**
 * Fetches every feed, adds new headlines to the permanent archive and rewrites latest.json + index.json.
 * @param {{root:string, stocks:{symbol:string,name:string,type?:string}[], seedFile?:string, log?:Function}} opts
 */
export async function refreshNewsArchive({ root, stocks, seedFile, log = console.log }) {
  const dir = path.join(root, 'data-snapshot', 'news');
  const daysDir = path.join(dir, 'days');
  await mkdir(daysDir, { recursive: true });
  const nowIso = new Date().toISOString();
  const match = makeSymbolMatcher(stocks);

  // 1) fetch all feeds (6 at a time)
  const status = [];
  const fetched = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      while (next < NEWS_FEEDS.length) {
        const feed = NEWS_FEEDS[next++];
        const xml = await getText(feed.url);
        if (!xml) {
          status.push({ id: `RSS:${feed.source}`, ok: false, category: feed.category });
          continue;
        }
        let items = parseFeed(xml, feed).map((n) => ({ ...n, symbols: match(n.title) }));
        // Company filings: keep only those of F&O companies (thousands of tiny companies file daily)
        if (feed.kind === 'NSE_FILINGS') items = items.filter((n) => n.symbols.length > 0);
        fetched.push(...items);
        status.push({ id: `RSS:${feed.source}`, ok: true, items: items.length, category: feed.category });
      }
    })
  );
  status.sort((a, b) => a.id.localeCompare(b.id));

  // Seed the archive once from an older news.json (so nothing collected before is lost)
  const index = await readJson(path.join(dir, 'index.json'), { days: [] });
  if (seedFile && index.days.length === 0 && existsSync(seedFile)) {
    const seed = await readJson(seedFile, { items: [] });
    fetched.push(...(seed.items || []).map((n) => ({ category: 'MARKETS', ...n, symbols: match(n.title) })));
  }

  // 2) group by IST day and merge into the day files
  const now = Date.now();
  const byDay = new Map();
  for (const n of fetched) {
    let iso = n.publishedIso;
    if (!iso || Date.parse(iso) > now + 6 * 3600 * 1000) iso = nowIso; // missing / future dates -> fetch time
    const item = { ...n, publishedIso: iso };
    const d = istDay(iso);
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d).push(item);
  }
  const counts = new Map(index.days.map((d) => [d.date, d.count]));
  let added = 0;
  for (const [day, items] of byDay) {
    const file = path.join(daysDir, `${day}.json`);
    const existing = await readJson(file, { date: day, items: [] });
    const links = new Set(existing.items.map(keyOf));
    const titles = new Set(existing.items.map(titleKey));
    let changed = false;
    for (const n of items) {
      if (links.has(keyOf(n)) || titles.has(titleKey(n))) continue;
      links.add(keyOf(n));
      titles.add(titleKey(n));
      existing.items.push(n);
      added++;
      changed = true;
    }
    if (changed || !existsSync(file)) {
      existing.items.sort(sortDesc);
      await writeJson(file, existing);
    }
    counts.set(day, existing.items.length);
  }

  // 3) index + latest (newest 2 archived days)
  const days = [...counts.entries()].map(([date, count]) => ({ date, count })).sort((a, b) => (a.date < b.date ? 1 : -1));
  const total = days.reduce((s, d) => s + d.count, 0);
  const newIndex = { updatedAtIso: nowIso, total, firstDay: days[days.length - 1]?.date ?? null, days };
  await writeJson(path.join(dir, 'index.json'), newIndex);

  const latestDays = days.slice(0, 2);
  const latestItems = [];
  for (const d of latestDays) {
    const f = await readJson(path.join(daysDir, `${d.date}.json`), { items: [] });
    latestItems.push(...f.items);
  }
  latestItems.sort(sortDesc);
  const latest = {
    fetchedAtIso: nowIso,
    note: 'Headlines and links only. Copyright belongs to each publisher. Click through to read the original article.',
    coversDays: latestDays.map((d) => d.date),
    archive: { total, days: days.length, firstDay: newIndex.firstDay },
    sources: status,
    items: latestItems,
  };
  await writeJson(path.join(dir, 'latest.json'), latest);
  log(`  ✓ news: ${fetched.length} fetched from ${status.filter((s) => s.ok).length}/${NEWS_FEEDS.length} feeds, ${added} NEW added; archive = ${total} headlines over ${days.length} day(s)`);
  return { latest, status, added };
}
