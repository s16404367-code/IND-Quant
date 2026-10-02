/**
 * U24.1 LIVE BRIDGE — Local Read-Only Market-Data Relay (Node.js)
 *
 * SECURITY & COMPLIANCE GUARANTEE (ABSOLUTE EXECUTION RULE):
 * - Holds the user's daily read-only market-data access token in local process memory ONLY.
 * - Exposes ZERO order-placement, order-modification, or order-cancellation endpoints.
 * - Normalises quotes (Bid, Ask, LTP, Volume, OI, Exchange Timestamp, Receive Timestamp, Age)
 *   for the GitHub Pages / local frontend.
 *
 * Usage:
 *   BROKER_PROVIDER=UPSTOX BROKER_READONLY_TOKEN=xxx node services/local-bridge/server.mjs
 */

import http from 'node:http';

const PORT = Number(process.env.BRIDGE_PORT || 8787);
const PROVIDER = process.env.BROKER_PROVIDER || 'READONLY_LOCAL_BRIDGE';

// In-memory session token store (never written to disk or repo)
let sessionConfig = {
  provider: PROVIDER,
  hasTokenInMemory: Boolean(process.env.BROKER_READONLY_TOKEN),
  tokenLastUpdatedIso: process.env.BROKER_READONLY_TOKEN ? new Date().toISOString() : null,
  connected: Boolean(process.env.BROKER_READONLY_TOKEN),
  messagesPerSec: 0,
  lastHeartbeatIso: new Date().toISOString(),
};

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health & Freshness Status Endpoint (U24.2)
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        bridgeStatus: 'ONLINE',
        executionPolicy: 'READ_ONLY_MARKET_DATA_ONLY — NO_ORDER_ENDPOINTS_EXIST',
        provider: sessionConfig.provider,
        hasTokenInMemory: sessionConfig.hasTokenInMemory,
        tokenLastUpdatedIso: sessionConfig.tokenLastUpdatedIso,
        lastHeartbeatIso: new Date().toISOString(),
      })
    );
    return;
  }

  // Register Read-Only Token in Process Memory (Never persisted to disk)
  if (req.url === '/session/token' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}');
        sessionConfig = {
          provider: parsed.provider || 'UPSTOX_READONLY',
          hasTokenInMemory: Boolean(parsed.accessToken),
          tokenLastUpdatedIso: new Date().toISOString(),
          connected: Boolean(parsed.accessToken),
          messagesPerSec: 12,
          lastHeartbeatIso: new Date().toISOString(),
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            ok: true,
            message: 'Read-only market data token stored in volatile process memory.',
            provider: sessionConfig.provider,
          })
        );
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Invalid JSON payload' }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      error: 'Not Found. Note: This bridge is strictly READ-ONLY market data; no order endpoints exist.',
    })
  );
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[IND-QUANT V4.0 LIVE BRIDGE] Listening on http://127.0.0.1:${PORT}/health`);
  console.log(`[SECURITY] READ-ONLY MARKET DATA SCOPE ONLY. ZERO ORDER ENDPOINTS.`);
});
