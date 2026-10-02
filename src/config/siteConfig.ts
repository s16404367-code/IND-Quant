/**
 * SITE OWNER CONFIGURATION
 *
 * ➜ Easiest: edit /site-config.json in the repository root (on GitHub, click the file → pencil icon).
 *   The website reads that file every time it loads, so changes appear without rebuilding.
 * The values below are only the defaults used when site-config.json is missing.
 */
export interface SiteConfig {
  /** Shown as "the Owner" in legal pages. Use your name or a project name. */
  ownerDisplayName: string;
  /** Optional contact e-mail for legal / privacy questions. Leave '' to hide. */
  contactEmail: string;
  /** Governing-law city for disputes (Terms). Leave '' for "courts of competent jurisdiction in India". */
  jurisdictionCity: string;
  /** Change this whenever you change any legal detail — users will be asked to accept again. */
  legalVersion: string;
  legalEffectiveDate: string;
  siteName: string;
  siteTagline: string;
}

export const SITE_CONFIG: SiteConfig = {
  ownerDisplayName: 'the owner of this website',
  contactEmail: '',
  jurisdictionCity: '',
  legalVersion: '2026-10-02.v2',
  legalEffectiveDate: '02 October 2026',
  siteName: 'IND-QUANT',
  siteTagline: 'Indian Options Research & Risk Lab — Education Only',
};

const EDITABLE: (keyof SiteConfig)[] = ['ownerDisplayName', 'contactEmail', 'jurisdictionCity', 'legalVersion', 'legalEffectiveDate'];

/** Copies allowed string fields from a site-config.json object into SITE_CONFIG. Returns the number applied. */
export function applySiteConfig(raw: unknown): number {
  if (!raw || typeof raw !== 'object') return 0;
  let n = 0;
  for (const k of EDITABLE) {
    const v = (raw as Record<string, unknown>)[k];
    if (typeof v === 'string' && v.length <= 200) {
      SITE_CONFIG[k] = v.trim();
      n++;
    }
  }
  if (!SITE_CONFIG.ownerDisplayName) SITE_CONFIG.ownerDisplayName = 'the owner of this website';
  if (!SITE_CONFIG.legalVersion) SITE_CONFIG.legalVersion = 'unversioned';
  return n;
}

/** Loads ./site-config.json (never cached). Silently keeps defaults if missing or slow. */
export async function loadRuntimeSiteConfig(timeoutMs = 3000): Promise<void> {
  if (typeof fetch === 'undefined') return;
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = setTimeout(() => ctrl?.abort(), timeoutMs);
  try {
    const res = await fetch(`./site-config.json?t=${Date.now()}`, { cache: 'no-store', signal: ctrl?.signal });
    if (res.ok) applySiteConfig(await res.json());
  } catch {
    /* keep defaults */
  } finally {
    clearTimeout(timer);
  }
}
