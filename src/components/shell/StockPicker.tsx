import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, ChevronDown, Star, Ban, TrendingUp, TrendingDown, Landmark, Building2 } from 'lucide-react';
import { fmtNum, UniverseItem } from '../../data/marketData';

interface Props {
  universe: UniverseItem[];
  selected: string;
  onSelect: (symbol: string) => void;
  loading?: boolean;
}

const RECENT_KEY = 'indquant.recentSymbols';

/** Any component can open the stock picker with: window.dispatchEvent(new Event(OPEN_PICKER_EVENT)) */
export const OPEN_PICKER_EVENT = 'indquant:open-stock-picker';
export function openStockPicker() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(OPEN_PICKER_EVENT));
}

function readRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').slice(0, 8);
  } catch {
    return [];
  }
}

export const StockPickerButton: React.FC<Props & { compact?: boolean }> = ({ universe, selected, onSelect, loading, compact }) => {
  const [open, setOpen] = useState(false);
  const item = universe.find((u) => u.symbol === selected);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === '/' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_PICKER_EVENT, onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_PICKER_EVENT, onOpen);
    };
  }, []);

  const up = (item?.changePct ?? 0) >= 0;
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`focus-ring group flex items-center gap-3 rounded-2xl border-2 border-indigo-500/50 bg-slate-900 hover:border-indigo-400 hover:bg-slate-800/60 transition text-left shadow-sm ${
          compact ? 'px-3 py-1.5' : 'px-4 py-2.5'
        }`}
        aria-label="Select stock or index"
        title="Select stock or index (Ctrl+K)"
      >
        <span className="flex items-center justify-center w-9 h-9 rounded-xl brand-chip text-white shrink-0">
          <Search className="w-4.5 h-4.5" />
        </span>
        <span className="min-w-0">
          <span className="block text-[11px] uppercase tracking-wider text-indigo-300 font-semibold">
            {loading ? 'Loading list…' : 'Select stock / index'}
          </span>
          <span className="flex items-baseline gap-2">
            <span className="text-base font-bold text-white truncate">{selected}</span>
            {item?.spot != null && (
              <span className="text-sm font-mono text-slate-300">₹{fmtNum(item.spot)}</span>
            )}
            {item?.changePct != null && (
              <span className={`text-xs font-semibold ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
                {up ? '▲' : '▼'} {Math.abs(item.changePct).toFixed(2)}%
              </span>
            )}
          </span>
        </span>
        <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white ml-1 shrink-0" />
      </button>
      {open && (
        <StockPickerModal
          universe={universe}
          selected={selected}
          onClose={() => setOpen(false)}
          onSelect={(s) => {
            onSelect(s);
            setOpen(false);
          }}
        />
      )}
    </>
  );
};

const StockPickerModal: React.FC<{
  universe: UniverseItem[];
  selected: string;
  onClose: () => void;
  onSelect: (s: string) => void;
}> = ({ universe, selected, onClose, onSelect }) => {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'INDEX' | 'STOCK'>('ALL');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const recent = useMemo(readRecent, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => {
    const term = q.trim().toUpperCase();
    let list = universe.filter((u) => filter === 'ALL' || u.type === filter);
    if (term) {
      list = list
        .map((u) => {
          const sym = u.symbol.toUpperCase();
          const name = u.name.toUpperCase();
          let score = -1;
          if (sym === term) score = 100;
          else if (sym.startsWith(term)) score = 80;
          else if (name.startsWith(term)) score = 60;
          else if (sym.includes(term)) score = 40;
          else if (name.includes(term)) score = 30;
          return { u, score };
        })
        .filter((x) => x.score >= 0)
        .sort((a, b) => b.score - a.score)
        .map((x) => x.u);
    }
    return list;
  }, [q, filter, universe]);

  useEffect(() => setCursor(0), [q, filter]);
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${cursor}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const choose = (s: string) => {
    try {
      const next = [s, ...readRecent().filter((x) => x !== s)].slice(0, 8);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    onSelect(s);
  };

  const counts = {
    ALL: universe.length,
    INDEX: universe.filter((u) => u.type === 'INDEX').length,
    STOCK: universe.filter((u) => u.type === 'STOCK').length,
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-3 sm:p-8 bg-slate-950/70 backdrop-blur-sm animate-in" onMouseDown={onClose}>
      <div
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Choose a stock or index"
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800">
          <Search className="w-5 h-5 text-indigo-400" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setCursor((c) => Math.min(results.length - 1, c + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setCursor((c) => Math.max(0, c - 1));
              } else if (e.key === 'Enter' && results[cursor]) {
                choose(results[cursor].symbol);
              } else if (e.key === 'Escape') onClose();
            }}
            placeholder="Type a name or symbol — e.g. Reliance, HDFCBANK, NIFTY, Tata…"
            className="flex-1 bg-transparent text-base text-white placeholder:text-slate-500 focus:outline-none"
          />
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-slate-800 bg-slate-950/40">
          {(['ALL', 'INDEX', 'STOCK'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
                filter === f ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600'
              }`}
            >
              {f === 'ALL' ? 'All' : f === 'INDEX' ? 'Indices' : 'Stocks'} ({counts[f]})
            </button>
          ))}
          {recent.length > 0 && !q && (
            <div className="flex flex-wrap items-center gap-1.5 ml-auto">
              <Star className="w-3.5 h-3.5 text-amber-400" />
              {recent.slice(0, 5).map((s) => (
                <button key={s} onClick={() => choose(s)} className="px-2 py-0.5 rounded-md text-xs font-mono bg-slate-800 text-slate-200 hover:bg-slate-700">
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <div ref={listRef} className="max-h-[60vh] overflow-y-auto">
          {results.length === 0 && (
            <div className="p-8 text-center text-sm text-slate-400">
              No F&amp;O underlying matches “{q}”. Only NSE stocks and indices that have options are listed.
            </div>
          )}
          {results.map((u, i) => {
            const isSel = u.symbol === selected;
            const up = (u.changePct ?? 0) >= 0;
            return (
              <button
                key={u.symbol}
                data-idx={i}
                onMouseEnter={() => setCursor(i)}
                onClick={() => choose(u.symbol)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left border-b border-slate-800/60 transition ${
                  i === cursor ? 'bg-indigo-500/10' : ''
                } ${isSel ? 'ring-1 ring-inset ring-indigo-500/60' : ''}`}
              >
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${u.type === 'INDEX' ? 'bg-violet-500/15 text-violet-300' : 'bg-sky-500/15 text-sky-300'}`}>
                  {u.type === 'INDEX' ? <Landmark className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{u.symbol}</span>
                    {u.inBanList && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                        <Ban className="w-3 h-3" /> F&amp;O BAN
                      </span>
                    )}
                  </span>
                  <span className="block text-xs text-slate-400 truncate">{u.name}</span>
                </span>
                <span className="text-right shrink-0">
                  <span className="block text-sm font-mono text-slate-200">{u.spot != null ? `₹${fmtNum(u.spot)}` : '—'}</span>
                  <span className={`text-xs font-semibold flex items-center justify-end gap-0.5 ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {u.changePct != null ? (
                      <>
                        {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {u.changePct > 0 ? '+' : ''}
                        {u.changePct.toFixed(2)}%
                      </>
                    ) : (
                      '—'
                    )}
                  </span>
                </span>
                <span className="hidden sm:block text-right shrink-0 w-20">
                  <span className="block text-[10px] uppercase text-slate-500">Lot size</span>
                  <span className="text-xs font-mono text-slate-300">{u.lotSize ?? '—'}</span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="px-4 py-2 text-[11px] text-slate-500 border-t border-slate-800 flex flex-wrap justify-between gap-2">
          <span>↑ ↓ to move · Enter to select · Esc to close · Ctrl+K opens this anywhere</span>
          <span>Prices = NSE previous close (end-of-day)</span>
        </div>
      </div>
    </div>
  );
};
