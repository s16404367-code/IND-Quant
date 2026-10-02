export const NEWS_FEEDS: Array<{ source: string; category: string; url: string; kind?: string }>;
export function parsePubDate(s: string | null | undefined): string | null;
export function parseFeed(xml: string, feed: { source: string; category: string; kind?: string }): Array<{ title: string; link: string; source: string; category: string; publishedIso: string | null }>;
export function makeSymbolMatcher(stocks: Array<{ symbol: string; name: string; type?: string }>): (title: string) => string[];
export const istDay: (iso: string) => string;
export function refreshNewsArchive(opts: { root: string; stocks: Array<{ symbol: string; name: string; type?: string }>; seedFile?: string; log?: (...a: unknown[]) => void }): Promise<unknown>;
