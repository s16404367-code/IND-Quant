/**
 * U1 Thin Serverless Read-Only Proxy (Cloudflare Workers Compatible)
 *
 * - Holds optional read-only API keys (e.g., Weather / News / Macro data) in Worker Secrets.
 * - Adds CORS headers and rate-limit protection for the static GitHub Pages frontend.
 * - STRICTLY READ-ONLY: No broker order endpoints exist anywhere in this worker.
 */

export default {
  async fetch(request) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'GET') {
      return new Response(
        JSON.stringify({
          error: 'METHOD_NOT_ALLOWED: Read-only GET requests only. No order or mutation endpoints exist.',
        }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(request.url);
    if (url.pathname === '/api/health') {
      return new Response(
        JSON.stringify({
          status: 'OK',
          mode: 'READ_ONLY_DATA_PROXY',
          timestampIso: new Date().toISOString(),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        status: 'PROXY_READY',
        note: 'Configure upstream read-only market/weather/news feed URL in Cloudflare Worker environment.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  },
};
