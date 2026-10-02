# U24.1 Local Bridge Service (Read-Only Market Data Relay)

## Why This Exists
A static site on **GitHub Pages** cannot directly fetch live NSE option-chain streams due to CORS, anti-bot protections, and exchange data licensing. Furthermore, API credentials must **never** be committed to GitHub or embedded in a public frontend bundle.

The **Local Bridge** (`server.mjs`) runs on your own machine (`http://127.0.0.1:8787`), holds your daily read-only market-data token in volatile RAM only, subscribes to your broker/vendor market-data stream (Upstox, Dhan, Zerodha Kite Connect, Angel One SmartAPI, Fyers, TrueData), and fans out normalized quotes (`Bid`, `Ask`, `LTP`, `OI`, `Volume`, `Exchange Timestamp`, `Receive Timestamp`, `Quote Age`) to the UI.

## Strict Non-Execution Guarantee
- Request **market-data / read-only scopes only**.
- This service contains **zero** order-placement, order-modification, or order-cancellation code (verified by `tests/safety_no_order_code.test.ts` in CI).

## How to Run
```bash
npm run bridge
```
Then open the **API Keys & Live Bridge Vault** tab inside the web application to connect or paste your session token.
