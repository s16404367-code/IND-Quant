import React, { useMemo, useState } from 'react';
import { fmtCompact, fmtDate, fmtNum } from '../../data/marketData';

/** Small inline sparkline (no axes). */
export const Sparkline: React.FC<{ values: number[]; width?: number; height?: number; className?: string }> = ({
  values,
  width = 120,
  height = 36,
  className,
}) => {
  if (!values || values.length < 2) return <div style={{ width, height }} />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * width, height - 3 - ((v - min) / span) * (height - 6)]);
  const up = values[values.length - 1] >= values[0];
  const stroke = up ? '#10b981' : '#f43f5e';
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden>
      <path d={`${d} L${width},${height} L0,${height} Z`} fill={stroke} opacity={0.12} />
      <path d={d} fill="none" stroke={stroke} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

/** Price history area chart with hover read-out. */
export const PriceChart: React.FC<{
  points: Array<{ d: string; c: number }>;
  height?: number;
  label?: string;
}> = ({ points, height = 220, label }) => {
  const [hover, setHover] = useState<number | null>(null);
  const W = 800;
  const H = height;
  const padL = 56;
  const padR = 12;
  const padT = 14;
  const padB = 26;
  const { path, area, ticks, xy, min, max } = useMemo(() => {
    const vals = points.map((p) => p.c);
    const mn = Math.min(...vals);
    const mx = Math.max(...vals);
    const pad = (mx - mn) * 0.08 || mx * 0.01 || 1;
    const lo = mn - pad;
    const hi = mx + pad;
    const xyLocal = points.map((p, i) => [
      padL + (i / Math.max(1, points.length - 1)) * (W - padL - padR),
      padT + (1 - (p.c - lo) / (hi - lo)) * (H - padT - padB),
    ]);
    const pth = xyLocal.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const ar = `${pth} L${xyLocal[xyLocal.length - 1]?.[0] ?? padL},${H - padB} L${padL},${H - padB} Z`;
    const tks = Array.from({ length: 4 }, (_, i) => lo + ((hi - lo) * i) / 3);
    return { path: pth, area: ar, ticks: tks.map((t) => ({ v: t, y: padT + (1 - (t - lo) / (hi - lo)) * (H - padT - padB) })), xy: xyLocal, min: lo, max: hi };
  }, [points, H]);

  if (points.length < 2) {
    return <div className="text-sm text-slate-400 p-6 text-center">Not enough history to draw a chart.</div>;
  }
  const up = points[points.length - 1].c >= points[0].c;
  const color = up ? '#10b981' : '#f43f5e';
  const hv = hover !== null ? points[hover] : null;
  const gid = `g${Math.round(min)}${Math.round(max)}${points.length}`;

  return (
    <div className="relative w-full">
      {label && <div className="text-xs text-slate-400 mb-1">{label}</div>}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto select-none"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * W;
          const i = Math.round(((x - padL) / (W - padL - padR)) * (points.length - 1));
          setHover(Math.max(0, Math.min(points.length - 1, i)));
        }}
        role="img"
        aria-label={`Price chart from ${points[0].d} to ${points[points.length - 1].d}`}
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={t.y} y2={t.y} stroke="currentColor" className="text-slate-800" strokeDasharray="3 4" />
            <text x={padL - 8} y={t.y + 4} textAnchor="end" fontSize="11" className="fill-slate-500">
              {fmtNum(t.v, t.v > 1000 ? 0 : 1)}
            </text>
          </g>
        ))}
        {[0, Math.floor(points.length / 2), points.length - 1].map((i) => (
          <text key={i} x={xy[i][0]} y={H - 6} textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'} fontSize="11" className="fill-slate-500">
            {fmtDate(points[i].d)}
          </text>
        ))}
        <path d={area} fill={`url(#${gid})`} />
        <path d={path} fill="none" stroke={color} strokeWidth={2.2} strokeLinejoin="round" />
        {hv && hover !== null && (
          <g>
            <line x1={xy[hover][0]} x2={xy[hover][0]} y1={padT} y2={H - padB} stroke={color} strokeOpacity={0.5} />
            <circle cx={xy[hover][0]} cy={xy[hover][1]} r={4.5} fill={color} stroke="white" strokeWidth={1.5} />
          </g>
        )}
      </svg>
      {hv && (
        <div className="absolute top-1 right-2 text-xs px-2 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-200 font-mono">
          {fmtDate(hv.d)} · ₹{fmtNum(hv.c)}
        </div>
      )}
    </div>
  );
};

/** Open-interest by strike: calls (red) vs puts (green), spot marker. */
export const OiByStrikeChart: React.FC<{
  rows: Array<{ k: number; ceOi: number; peOi: number }>;
  spot: number;
  height?: number;
}> = ({ rows, spot, height = 230 }) => {
  const [hover, setHover] = useState<number | null>(null);
  if (!rows.length) return <div className="text-sm text-slate-400 p-6 text-center">No open-interest data.</div>;
  const W = 800;
  const H = height;
  const padB = 30;
  const padT = 10;
  const maxOi = Math.max(1, ...rows.map((r) => Math.max(r.ceOi, r.peOi)));
  const slot = (W - 20) / rows.length;
  const bw = Math.max(2, slot * 0.36);
  const kMin = rows[0].k;
  const kMax = rows[rows.length - 1].k;
  const spotX = 10 + ((spot - kMin) / Math.max(1, kMax - kMin)) * (W - 20 - slot) + slot / 2;
  const labelEvery = Math.max(1, Math.ceil(rows.length / 9));
  const hv = hover !== null ? rows[hover] : null;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" onMouseLeave={() => setHover(null)} role="img" aria-label="Open interest by strike">
        {rows.map((r, i) => {
          const x = 10 + i * slot;
          const hc = (r.ceOi / maxOi) * (H - padB - padT);
          const hp = (r.peOi / maxOi) * (H - padB - padT);
          return (
            <g key={r.k} onMouseEnter={() => setHover(i)}>
              <rect x={x} y={padT} width={slot} height={H - padB - padT} fill="transparent" />
              <rect x={x + slot / 2 - bw} y={H - padB - hc} width={bw} height={hc} rx={1.5} fill="#f43f5e" opacity={hover === i ? 1 : 0.8} />
              <rect x={x + slot / 2} y={H - padB - hp} width={bw} height={hp} rx={1.5} fill="#10b981" opacity={hover === i ? 1 : 0.8} />
              {i % labelEvery === 0 && (
                <text x={x + slot / 2} y={H - 10} textAnchor="middle" fontSize="11" className="fill-slate-500">
                  {r.k}
                </text>
              )}
            </g>
          );
        })}
        <line x1={spotX} x2={spotX} y1={padT} y2={H - padB} stroke="#6366f1" strokeWidth={2} strokeDasharray="5 4" />
        <text x={spotX + 4} y={padT + 12} fontSize="11" fill="#6366f1" fontWeight={700}>
          Spot {fmtNum(spot, 0)}
        </text>
      </svg>
      <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-rose-500 inline-block" /> Call OI (CE)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> Put OI (PE)</span>
        {hv && (
          <span className="ml-auto font-mono text-slate-300">
            Strike {hv.k}: CE {fmtCompact(hv.ceOi)} · PE {fmtCompact(hv.peOi)}
          </span>
        )}
      </div>
    </div>
  );
};
