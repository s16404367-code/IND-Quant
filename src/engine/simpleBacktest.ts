/**
 * SIMPLE, HONEST BACKTEST on real end-of-day prices (education only).
 *
 * Rules that keep it fair:
 *  • No peeking: a signal is decided on day t's CLOSE and the trade happens at day t+1's OPEN.
 *  • Costs on every buy and sell: ₹20 brokerage + 0.15% (≈ STT 0.1% + exchange, SEBI, stamp, GST) — ASSUMPTION.
 *  • Whole shares only for stocks (an index cannot be bought directly, so index tests use fractional units).
 *  • An open position at the end is valued at the last close (selling costs not yet paid).
 * This tests the UNDERLYING price idea, not options. Past results do not predict future results.
 */
export interface PriceBar {
  d: string;
  c: number;
  o?: number | null;
}

export type IdeaId = 'BUY_HOLD' | 'TREND_20' | 'DIP_BUY' | 'CROSS_20_50';

export interface IdeaInfo {
  id: IdeaId;
  name: string;
  short: string;
  rule: string;
}

export const IDEAS: IdeaInfo[] = [
  {
    id: 'BUY_HOLD',
    name: 'Buy and hold',
    short: 'Buy on day one, never sell',
    rule: 'Buy on the first day and simply hold until today. This is the yardstick every other idea must beat.',
  },
  {
    id: 'TREND_20',
    name: 'Follow the trend',
    short: 'Hold while price is above its 20-day average',
    rule: 'Buy when the closing price rises above its 20-day average price. Sell when it falls below.',
  },
  {
    id: 'DIP_BUY',
    name: 'Buy the dip',
    short: 'Buy after a 3% fall, sell 10 days later',
    rule: 'Buy the day after the price falls 3% or more in a single day. Sell 10 trading days later.',
  },
  {
    id: 'CROSS_20_50',
    name: 'Moving-average cross',
    short: 'Hold while 20-day average is above 50-day',
    rule: 'Hold while the 20-day average price is above the 50-day average price, otherwise stay in cash.',
  },
];

export const COST_FLAT_RUPEES = 20;
export const COST_PCT = 0.0015;

export interface BtTrade {
  entryDate: string;
  entryPrice: number;
  exitDate: string | null;
  exitPrice: number | null;
  units: number;
  netPnl: number;
  returnPct: number;
  open: boolean;
}

export interface BtResult {
  idea: IdeaId;
  startDate: string;
  endDate: string;
  days: number;
  startCapital: number;
  finalValue: number;
  totalReturnPct: number;
  maxDrawdownPct: number;
  trades: BtTrade[];
  wins: number;
  losses: number;
  costsPaid: number;
  daysInvestedPct: number;
  equity: number[];
  dates: string[];
  fractional: boolean;
  cannotAfford: boolean;
}

const sma = (arr: number[], end: number, n: number) => {
  if (end + 1 < n) return null;
  let s = 0;
  for (let i = end - n + 1; i <= end; i++) s += arr[i];
  return s / n;
};
const cost = (value: number) => COST_FLAT_RUPEES + COST_PCT * value;

export function runSimpleBacktest(history: PriceBar[], idea: IdeaId, capital: number, fractional: boolean): BtResult | null {
  const bars = history.filter((b) => Number.isFinite(b.c) && b.c > 0);
  if (bars.length < 30 || capital <= 0) return null;
  const closes = bars.map((b) => b.c);
  const openOf = (i: number) => (bars[i].o && bars[i].o! > 0 ? bars[i].o! : bars[i].c);

  let cash = capital;
  let units = 0;
  let pending: 'BUY' | 'SELL' | null = idea === 'BUY_HOLD' ? 'BUY' : null;
  let heldBars = 0;
  let entry: { date: string; price: number; units: number; costIn: number } | null = null;
  let costsPaid = 0;
  let investedDays = 0;
  let cannotAfford = false;
  const trades: BtTrade[] = [];
  const equity: number[] = [];

  for (let t = 0; t < bars.length; t++) {
    // 1) execute yesterday's decision at today's open
    if (pending === 'BUY' && units === 0) {
      const px = openOf(t);
      const budget = cash - COST_FLAT_RUPEES;
      const raw = budget / (px * (1 + COST_PCT));
      const u = fractional ? raw : Math.floor(raw);
      if (u > 0) {
        const c = cost(u * px);
        cash -= u * px + c;
        costsPaid += c;
        units = u;
        heldBars = 0;
        entry = { date: bars[t].d, price: px, units: u, costIn: c };
      } else {
        cannotAfford = true;
      }
    } else if (pending === 'SELL' && units > 0 && entry) {
      const px = openOf(t);
      const c = cost(units * px);
      cash += units * px - c;
      costsPaid += c;
      const pnl = (px - entry.price) * units - entry.costIn - c;
      trades.push({
        entryDate: entry.date,
        entryPrice: entry.price,
        exitDate: bars[t].d,
        exitPrice: px,
        units,
        netPnl: pnl,
        returnPct: (pnl / (entry.price * units)) * 100,
        open: false,
      });
      units = 0;
      entry = null;
    }
    pending = null;

    // 2) value the account at today's close
    equity.push(cash + units * closes[t]);
    if (units > 0) {
      investedDays++;
      heldBars++;
    }

    // 3) decide using ONLY prices up to today's close
    if (idea === 'TREND_20') {
      const m = sma(closes, t, 20);
      if (m !== null) {
        if (units === 0 && closes[t] > m) pending = 'BUY';
        else if (units > 0 && closes[t] < m) pending = 'SELL';
      }
    } else if (idea === 'DIP_BUY') {
      if (units === 0 && t > 0 && closes[t] / closes[t - 1] - 1 <= -0.03) pending = 'BUY';
      else if (units > 0 && heldBars >= 10) pending = 'SELL';
    } else if (idea === 'CROSS_20_50') {
      const f = sma(closes, t, 20);
      const s = sma(closes, t, 50);
      if (f !== null && s !== null) {
        if (units === 0 && f > s) pending = 'BUY';
        else if (units > 0 && f < s) pending = 'SELL';
      }
    }
  }

  const last = bars.length - 1;
  if (units > 0 && entry) {
    const pnl = (closes[last] - entry.price) * units - entry.costIn;
    trades.push({
      entryDate: entry.date,
      entryPrice: entry.price,
      exitDate: null,
      exitPrice: closes[last],
      units,
      netPnl: pnl,
      returnPct: (pnl / (entry.price * units)) * 100,
      open: true,
    });
  }

  let peak = equity[0];
  let maxDd = 0;
  for (const v of equity) {
    peak = Math.max(peak, v);
    maxDd = Math.min(maxDd, v / peak - 1);
  }
  const finalValue = equity[last];
  return {
    idea,
    startDate: bars[0].d,
    endDate: bars[last].d,
    days: bars.length,
    startCapital: capital,
    finalValue,
    totalReturnPct: (finalValue / capital - 1) * 100,
    maxDrawdownPct: maxDd * 100,
    trades,
    wins: trades.filter((x) => x.netPnl > 0).length,
    losses: trades.filter((x) => x.netPnl <= 0).length,
    costsPaid,
    daysInvestedPct: (investedDays / bars.length) * 100,
    equity,
    dates: bars.map((b) => b.d),
    fractional,
    cannotAfford: cannotAfford && trades.length === 0,
  };
}
