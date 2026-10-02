import React, { useMemo, useState } from 'react';
import { ShieldAlert, Scale, FileText, Lock, Database, AlertTriangle, CheckCircle2, X, Printer } from 'lucide-react';
import { getLegalDocuments, LegalDocument } from '../../legal/legalContent';
import { SITE_CONFIG } from '../../config/siteConfig';

export const LEGAL_DOCS: LegalDocument[] = getLegalDocuments(SITE_CONFIG);
export type LegalDocId = LegalDocument['id'];

const CONSENT_KEY = 'indquant.legalConsent';

export interface ConsentRecord {
  version: string;
  acceptedAtIso: string;
  items: string[];
}

export function readConsent(): ConsentRecord | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const rec = JSON.parse(raw) as ConsentRecord;
    return rec.version === SITE_CONFIG.legalVersion ? rec : null;
  } catch {
    return null;
  }
}

function writeConsent(rec: ConsentRecord) {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(rec));
  } catch {
    /* private mode — consent kept for this session only */
  }
}

const ICONS: Record<LegalDocId, React.ComponentType<{ className?: string }>> = {
  disclaimer: ShieldAlert,
  risk: AlertTriangle,
  terms: Scale,
  privacy: Lock,
  sources: Database,
};

export const LegalDocView: React.FC<{ doc: LegalDocument }> = ({ doc }) => (
  <article className="space-y-4">
    <header>
      <h2 className="text-xl font-bold text-white">{doc.title}</h2>
      <p className="text-sm text-slate-400 mt-1">{doc.summary}</p>
      <p className="text-[11px] text-slate-500 mt-1 font-mono">
        Version {SITE_CONFIG.legalVersion} · Effective {SITE_CONFIG.legalEffectiveDate}
      </p>
    </header>
    {doc.sections.map((s) => (
      <section key={s.heading} className="space-y-2">
        <h3 className="text-sm font-bold text-slate-100">{s.heading}</h3>
        {s.bullets && (
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-300 leading-relaxed">
            {s.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        )}
        {s.paras?.map((p, i) => (
          <p key={i} className="text-sm text-slate-300 leading-relaxed">
            {p}
          </p>
        ))}
      </section>
    ))}
  </article>
);

/** Full-page Legal Center (also used inside the modal). */
export const LegalCenter: React.FC<{ initial?: LegalDocId; onClose?: () => void; asModal?: boolean }> = ({
  initial = 'disclaimer',
  onClose,
  asModal,
}) => {
  const [active, setActive] = useState<LegalDocId>(initial);
  const doc = LEGAL_DOCS.find((d) => d.id === active) ?? LEGAL_DOCS[0];
  const consent = useMemo(readConsent, []);

  const body = (
    <div className={`grid grid-cols-1 md:grid-cols-[240px_1fr] gap-0 ${asModal ? 'h-full' : ''}`}>
      <aside className="border-b md:border-b-0 md:border-r border-slate-800 p-3 bg-slate-950/40">
        <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold px-2 mb-2">Legal Center</div>
        <nav className="flex md:flex-col gap-1 overflow-x-auto">
          {LEGAL_DOCS.map((d) => {
            const Icon = ICONS[d.id];
            return (
              <button
                key={d.id}
                onClick={() => setActive(d.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap text-left transition ${
                  active === d.id ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {d.short}
              </button>
            );
          })}
        </nav>
        {consent && (
          <div className="hidden md:block mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-300">
            <CheckCircle2 className="w-4 h-4 inline mr-1" />
            You accepted version {consent.version} on {new Date(consent.acceptedAtIso).toLocaleString('en-IN')}.
          </div>
        )}
      </aside>
      <div className={`p-5 sm:p-7 ${asModal ? 'overflow-y-auto max-h-[70vh]' : ''}`}>
        <LegalDocView doc={doc} />
        <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
          <span>
            Not legal advice. The site owner should have these documents reviewed by a qualified lawyer before public or
            commercial use.
          </span>
          <button onClick={() => window.print()} className="no-print flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-700 text-slate-300 hover:bg-slate-800">
            <Printer className="w-3.5 h-3.5" /> Print / Save PDF
          </button>
        </div>
      </div>
    </div>
  );

  if (!asModal) return <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">{body}</div>;

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in" onMouseDown={onClose}>
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden" onMouseDown={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 z-10 p-1.5 rounded-lg hover:bg-slate-800 text-slate-400" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
        {body}
      </div>
    </div>
  );
};

const CONSENT_ITEMS = [
  { id: 'age', text: 'I am 18 years of age or older.' },
  {
    id: 'education',
    text: 'I understand this website is an educational research tool only. It is NOT investment advice, and its owner is NOT registered with SEBI as an Investment Adviser, Research Analyst or broker.',
  },
  {
    id: 'risk',
    text: 'I have read the Risk Disclosure. I understand that about 9 out of 10 individual F&O traders lose money and that I can lose all (or more than) the money I trade with.',
  },
  {
    id: 'responsibility',
    text: 'I will make my own decisions and verify all data with my broker. I alone am responsible for any trade I place, and the owner is not liable for any loss.',
  },
  { id: 'terms', text: 'I accept the Terms of Use and the Privacy Policy.' },
];

/** First-visit consent gate. Blocks the app until every box is ticked. */
export const ConsentGate: React.FC<{ onAccept: () => void }> = ({ onAccept }) => {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [reading, setReading] = useState<LegalDocId | null>(null);
  const [declined, setDeclined] = useState(false);
  const all = CONSENT_ITEMS.every((c) => checked[c.id]);

  if (reading) return <LegalCenter asModal initial={reading} onClose={() => setReading(null)} />;

  return (
    <div className="fixed inset-0 z-[65] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in my-auto">
        <div className="brand-chip px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-8 h-8" />
            <div>
              <div className="text-[11px] uppercase tracking-widest font-semibold opacity-90">Before you continue</div>
              <h2 className="text-xl sm:text-2xl font-bold" style={{ color: '#fff' }}>
                Please read &amp; accept
              </h2>
            </div>
          </div>
        </div>

        {declined ? (
          <div className="p-6 space-y-4">
            <p className="text-sm text-slate-300">
              You chose not to accept. You can close this tab now. Nothing has been stored, and no data was collected.
            </p>
            <button onClick={() => setDeclined(false)} className="px-4 py-2 rounded-xl border border-slate-700 text-slate-200 text-sm hover:bg-slate-800">
              Go back
            </button>
          </div>
        ) : (
          <div className="p-5 sm:p-6 space-y-4">
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-sm text-rose-200 leading-relaxed">
              <strong>Education only — not a trading service.</strong> {SITE_CONFIG.siteName} shows calculations on public,
              end-of-day NSE data. It never places orders, never asks for broker logins or API keys, and gives no buy/sell
              recommendations.
            </div>

            <div className="space-y-2.5">
              {CONSENT_ITEMS.map((c) => (
                <label
                  key={c.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    checked[c.id] ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 w-5 h-5 accent-indigo-600 shrink-0"
                    checked={!!checked[c.id]}
                    onChange={(e) => setChecked((p) => ({ ...p, [c.id]: e.target.checked }))}
                  />
                  <span className="text-sm text-slate-200 leading-relaxed">{c.text}</span>
                </label>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <span className="text-slate-400 mr-1 self-center">Read in full:</span>
              {LEGAL_DOCS.map((d) => (
                <button key={d.id} onClick={() => setReading(d.id)} className="px-2.5 py-1 rounded-lg border border-slate-700 text-indigo-300 hover:bg-slate-800 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" /> {d.short}
                </button>
              ))}
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-800">
              <button onClick={() => setDeclined(true)} className="px-4 py-2.5 rounded-xl text-sm text-slate-400 hover:text-slate-200">
                I do not agree
              </button>
              <button
                disabled={!all}
                onClick={() => {
                  writeConsent({ version: SITE_CONFIG.legalVersion, acceptedAtIso: new Date().toISOString(), items: CONSENT_ITEMS.map((c) => c.id) });
                  onAccept();
                }}
                className={`px-6 py-3 rounded-xl text-sm font-bold transition ${
                  all ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg' : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                {all ? 'I agree — open the research lab' : `Tick all ${CONSENT_ITEMS.length} boxes to continue`}
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Your acceptance (version {SITE_CONFIG.legalVersion} and time) is saved only in this browser so you are not asked
              again. It is never sent anywhere.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
