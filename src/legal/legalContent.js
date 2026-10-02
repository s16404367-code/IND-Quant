/**
 * LEGAL CONTENT — single source of truth.
 * Used by the in-app Legal Center AND by `scripts/export-legal-md.mjs`, which writes the
 * same text to /LEGAL/*.md in the repository.
 *
 * NOTE TO THE SITE OWNER: this text is a carefully written starting point, not a substitute
 * for advice from a qualified Indian lawyer. Have it reviewed before any public or commercial use.
 *
 * Plain ES module (not TypeScript) so it can be imported by Node scripts without a build step.
 */

/**
 * @param {{ownerDisplayName: string, contactEmail: string, jurisdictionCity: string, legalEffectiveDate: string, siteName: string, legalVersion: string}} cfg
 */
export function getLegalDocuments(cfg) {
  const OWNER = cfg.ownerDisplayName || 'the owner of this website';
  const SITE = cfg.siteName || 'this website';
  const COURTS = cfg.jurisdictionCity
    ? `the courts at ${cfg.jurisdictionCity}, India`
    : 'the courts of competent jurisdiction in India';
  const CONTACT = cfg.contactEmail
    ? `Questions about these documents can be sent to ${cfg.contactEmail}.`
    : 'This is a free personal project; there is no customer-support service.';

  return [
    {
      id: 'disclaimer',
      title: 'Important Disclaimer',
      short: 'Disclaimer',
      summary: 'Education and research only. Not investment advice. You decide; you are responsible.',
      sections: [
        {
          heading: '1. Education and research only',
          paras: [
            `${SITE} is a free, personal, experimental software project for learning about option pricing, volatility and portfolio risk. It is an educational and research tool. It is NOT a trading platform, NOT a broker, NOT an exchange, and NOT an investment-advisory or research-analyst service.`,
          ],
        },
        {
          heading: '2. Not investment, tax or legal advice',
          paras: [
            'Nothing on this website is a recommendation, solicitation or offer to buy, sell or hold any security, derivative or other financial product. Labels such as "TRADE CANDIDATE", "WATCH", "NO TRADE", "EXECUTABLE", "verdict", "target", "stop" or "ticket" are the mechanical output of mathematical filters applied to public data. They are shown to demonstrate how the models work. They are not personal advice and do not take into account your finances, objectives or risk tolerance.',
          ],
        },
        {
          heading: '3. Not registered with SEBI',
          paras: [
            `${OWNER} is not registered with the Securities and Exchange Board of India (SEBI) as an Investment Adviser (SEBI (Investment Advisers) Regulations, 2013), a Research Analyst (SEBI (Research Analysts) Regulations, 2014), a stock broker, a portfolio manager or in any other capacity. Before you make any investment or trading decision, consult a SEBI-registered intermediary or adviser.`,
          ],
        },
        {
          heading: '4. No order execution, no broker connection',
          paras: [
            'This website never places, modifies or routes orders. It does not connect to any broker, does not ask for your broker login, password, PIN, OTP or API keys, and contains no order-placement code. If anyone asks you for such details claiming to represent this website, it is a scam.',
          ],
        },
        {
          heading: '5. Data may be delayed, incomplete or wrong',
          paras: [
            'Market data shown is end-of-day (previous close) data downloaded from public sources. It is not live and not real-time. Bid/ask prices are not available in the source and are estimated for cost modelling only. Data can be late, incomplete or incorrect. Always check prices, lot sizes, margins, charges and taxes with your broker and the exchange before acting.',
          ],
        },
        {
          heading: '6. Models can be wrong',
          paras: [
            'All models (Black-Scholes, Heston, SVI, VaR/ES, probability engines, backtests, replays and others) are simplifications. They rely on assumptions that often fail, especially during gaps, illiquidity, news events or regime changes. No model can predict markets. Past or simulated results do not guarantee future results.',
          ],
        },
        {
          heading: '7. Your responsibility; no liability',
          paras: [
            `You alone are responsible for your decisions and their results. To the fullest extent permitted by law, ${OWNER} and any contributors are not liable for any loss or damage of any kind (including trading losses, lost profits or data loss) arising from the use of, or inability to use, this website, its code or its data.`,
          ],
        },
        {
          heading: '8. No affiliation',
          paras: [
            'This project is independent. It is not affiliated with, endorsed by or sponsored by the National Stock Exchange of India (NSE), BSE, SEBI, any broker, any news publisher, Open-Meteo, BlackRock or any other company named on this website. All trademarks belong to their respective owners and are used only to identify data sources or for descriptive purposes.',
          ],
        },
      ],
    },
    {
      id: 'risk',
      title: 'Risk Disclosure — Futures & Options',
      short: 'Risk Disclosure',
      summary: 'About 9 out of 10 individual F&O traders in India lost money, according to SEBI studies.',
      sections: [
        {
          heading: '1. What SEBI\u2019s studies found',
          bullets: [
            'SEBI study (September 2024): 93% of more than 1 crore individual traders in the equity F&O segment incurred net losses between FY22 and FY24, with aggregate losses of about ₹1.8 lakh crore (including transaction costs).',
            'SEBI study (July 2025): about 91% of individual traders in the equity derivatives segment incurred net losses in FY25; their aggregate net loss was about ₹1,05,603 crore after transaction costs.',
            'SEBI-mandated risk disclosure: "9 out of 10 individual traders in the equity Futures & Options segment incurred net losses." Loss-makers additionally spent a significant share of their losses on transaction costs.',
          ],
          paras: ['Source: SEBI press releases and studies. Verify the latest figures on www.sebi.gov.in.'],
        },
        {
          heading: '2. Key risks of options and futures',
          bullets: [
            'Leverage: a small market move can cause a large loss relative to the money you put in.',
            'Option buyers can lose the entire premium paid. Options can and often do expire worthless.',
            'Option sellers (writers) and futures traders can lose more than the margin deposited; losses on uncovered (naked) short options are theoretically unlimited.',
            'Time decay, volatility changes, gaps at market open, illiquidity, wide bid/ask spreads, freeze limits and physical settlement of stock derivatives can cause losses even when your view on direction is right.',
            'Margin requirements can increase suddenly (e.g. on expiry day or during volatility), forcing you to add money or exit at a loss.',
            'Brokerage, STT, exchange charges, GST, SEBI fees and stamp duty reduce returns and can turn a gross profit into a net loss.',
            'Securities in the F&O ban period cannot take fresh positions; positions may be hard to exit.',
          ],
        },
        {
          heading: '3. Hypothetical and simulated performance',
          paras: [
            'Backtests, historical replays, the ₹10,000 demo, paper trades, probability estimates and "what-if" results are HYPOTHETICAL. They are prepared with the benefit of hindsight in model design, do not involve real money, and cannot fully account for real-world factors such as slippage, liquidity, emotions and the ability to withstand losses. Hypothetical results have inherent limitations; real results will differ and may be much worse.',
          ],
        },
        {
          heading: '4. Suitability',
          paras: [
            'F&O trading is not suitable for most people. Trade only with money you can afford to lose completely, only after understanding the product, and preferably after taking advice from a SEBI-registered Investment Adviser.',
          ],
        },
      ],
    },
    {
      id: 'terms',
      title: 'Terms of Use',
      short: 'Terms of Use',
      summary: 'The rules for using this website. By using it you agree to these terms.',
      sections: [
        {
          heading: '1. Acceptance',
          paras: [
            `By accessing or using ${SITE} ("the Website") you agree to these Terms of Use, the Important Disclaimer, the Risk Disclosure and the Privacy Policy (together, "the Terms"). If you do not agree, do not use the Website. Effective date: ${cfg.legalEffectiveDate}. Version: ${cfg.legalVersion}.`,
          ],
        },
        {
          heading: '2. Eligibility',
          paras: [
            'You must be at least 18 years old and legally able to enter into a binding contract under the Indian Contract Act, 1872. If you use the Website on behalf of an organisation, you confirm that you are authorised to accept these Terms for it.',
          ],
        },
        {
          heading: '3. What the Website is — and is not',
          paras: [
            'The Website is a free educational and research tool that performs calculations on publicly available data. It does not provide investment advice, research reports, recommendations, tips, portfolio management, brokerage or any regulated financial service. There is no adviser–client, fiduciary or any other professional relationship between you and the Owner.',
          ],
        },
        {
          heading: '4. Your decisions',
          paras: [
            'Any decision to trade or invest is made solely by you, at your own risk, through your own SEBI-registered broker. You agree to independently verify all information (prices, lot sizes, expiries, margins, charges, taxes, corporate actions and ban lists) with the exchange and your broker before acting.',
          ],
        },
        {
          heading: '5. Data and third-party content',
          paras: [
            'Market data is downloaded from public NSE archive files; headlines link to third-party publishers; weather comes from Open-Meteo. These belong to their respective owners and are governed by their own terms. The Owner does not control, verify or guarantee third-party data or content, and links do not imply endorsement. Data is end-of-day and may be delayed, incomplete or inaccurate.',
          ],
        },
        {
          heading: '6. Illustrative sample data',
          paras: [
            'Some screens (historical replay, sample news-impact templates, demo portfolio, test vectors) use illustrative or synthetic sample data to demonstrate features. Such data is labelled and is not an actual market record, filing or news report.',
          ],
        },
        {
          heading: '7. Acceptable use — you must not',
          bullets: [
            'use the Website or its outputs to provide paid or unpaid investment advice, tips or "calls" to others, or present its outputs as recommendations of the Owner;',
            'redistribute, resell or commercially exploit data obtained through the Website in breach of the data owners\u2019 terms;',
            'use the Website for market manipulation, fraud, or any unlawful purpose, or in breach of SEBI regulations;',
            'attempt to disrupt, overload, reverse-engineer for malicious purposes, or gain unauthorised access to the Website or its hosting;',
            'impersonate the Owner or claim an affiliation with the Owner, NSE, BSE or SEBI.',
          ],
        },
        {
          heading: '8. No warranty',
          paras: [
            'The Website, its software and data are provided "AS IS" and "AS AVAILABLE", without warranties of any kind, express or implied, including accuracy, completeness, timeliness, merchantability, fitness for a particular purpose and non-infringement. The Website may be unavailable, changed or discontinued at any time without notice.',
          ],
        },
        {
          heading: '9. Limitation of liability',
          paras: [
            `To the maximum extent permitted by applicable law, ${OWNER}, contributors and anyone involved in the Website shall not be liable for any direct, indirect, incidental, special, consequential or punitive damages, or any loss of profits, trading losses, loss of capital, loss of data or goodwill, arising out of or relating to your use of (or inability to use) the Website, even if advised of the possibility of such damages. Because the Website is provided free of charge, where liability cannot be excluded it is limited to ₹0 (nil) or the lowest amount permitted by law.`,
          ],
        },
        {
          heading: '10. Indemnity',
          paras: [
            `You agree to indemnify and hold harmless ${OWNER} and contributors from any claims, losses, liabilities, penalties and expenses (including reasonable legal fees) arising from your use of the Website, your trading decisions, or your breach of these Terms or of any law or third-party right.`,
          ],
        },
        {
          heading: '11. Intellectual property',
          paras: [
            'The Website\u2019s own source code and text are owned by the Owner and licensed as stated in the repository. Exchange data, news headlines, trademarks and logos belong to their respective owners. Nothing in these Terms transfers any ownership to you.',
          ],
        },
        {
          heading: '12. Tax information',
          paras: [
            'Any tax-related calculation (F&O turnover, ITR schedules, audit thresholds) is a general illustration based on the Owner\u2019s understanding at a point in time. It is not tax advice. Tax law changes; consult a qualified Chartered Accountant.',
          ],
        },
        {
          heading: '13. Privacy',
          paras: ['Your use of the Website is also governed by the Privacy Policy.'],
        },
        {
          heading: '14. Changes',
          paras: [
            'The Owner may update these Terms at any time. The version and effective date are shown at the top. When the legal version changes, you will be asked to accept the updated Terms again. Continued use after a change means you accept the updated Terms.',
          ],
        },
        {
          heading: '15. Severability and waiver',
          paras: [
            'If any provision is found unenforceable, the remaining provisions remain in full effect. Failure to enforce a provision is not a waiver of it.',
          ],
        },
        {
          heading: '16. Governing law and jurisdiction',
          paras: [
            `These Terms are governed by the laws of India. Subject to applicable law, any dispute arising out of or in connection with the Website or these Terms shall be subject to the exclusive jurisdiction of ${COURTS}.`,
          ],
        },
        {
          heading: '17. Contact',
          paras: [CONTACT],
        },
      ],
    },
    {
      id: 'privacy',
      title: 'Privacy Policy',
      short: 'Privacy Policy',
      summary: 'No accounts, no cookies, no tracking. Your settings stay in your own browser.',
      sections: [
        {
          heading: '1. Summary',
          bullets: [
            'No sign-up, no account, no login, no payment.',
            'No cookies, no analytics, no advertising trackers.',
            'The Owner has no server that receives your data — the Website is a set of static files hosted on GitHub Pages.',
            'The Website never asks for broker credentials, API keys, passwords, PAN, Aadhaar or bank details.',
          ],
        },
        {
          heading: '2. What is stored on your device',
          paras: [
            'The following is saved only in your own browser\u2019s local storage, on your device: your acceptance of these legal terms (version and time), your display preferences (theme, selected stock, capital tier), and any demo journal entries you type. It is never uploaded by the Website. You can delete it at any time with the "Erase my local data" button in Data & Privacy, or by clearing site data in your browser.',
          ],
        },
        {
          heading: '3. Network requests your browser makes',
          bullets: [
            'GitHub Pages (hosting): loading the Website and its data files. GitHub may log your IP address and browser details under the GitHub Privacy Statement.',
            'Open-Meteo (api.open-meteo.com): to show current weather, your browser requests forecasts for fixed city coordinates. Your IP address is visible to Open-Meteo. Your own location is NOT requested or sent.',
            'Links you click (news articles, NSE, SEBI): open third-party websites governed by their own privacy policies.',
          ],
        },
        {
          heading: '4. Data the Website processes',
          paras: [
            'Market data, headlines and weather are public, non-personal data downloaded on a schedule by an automated build job — not from your browser and not using your identity.',
          ],
        },
        {
          heading: '5. Digital Personal Data Protection Act, 2023',
          paras: [
            'The Website is designed so that the Owner does not collect or process your personal data. If you contact the Owner by e-mail, your e-mail address and message will be used only to reply and will not be shared or sold.',
          ],
        },
        {
          heading: '6. Children',
          paras: ['The Website is not intended for anyone under 18.'],
        },
        {
          heading: '7. Changes',
          paras: ['If this policy changes, the legal version number changes and you will be asked to accept again.'],
        },
      ],
    },
    {
      id: 'sources',
      title: 'Data Sources & Attribution',
      short: 'Data Sources',
      summary: 'Where every number comes from — no API keys, all public downloads.',
      sections: [
        {
          heading: '1. National Stock Exchange of India (NSE) — public archive files',
          paras: [
            'F&O bhavcopy (option chains, futures, open interest, settlement prices, lot sizes), cash-market bhavcopy (stock closing prices), index closing values (incl. India VIX, P/E, P/B), F&O market-lot file and F&O ban list, downloaded from nsearchives.nseindia.com once per trading day after market close. End-of-day only; no bid/ask; no intraday data. Data © National Stock Exchange of India Ltd. Used for personal, non-commercial, educational research. NSE\u2019s website terms apply; if you deploy this project publicly or commercially, verify whether a data licence from NSE is required.',
          ],
        },
        {
          heading: '2. News headlines — public RSS feeds',
          paras: [
            'Headlines are read from the public RSS feeds of The Economic Times, Mint, Business Standard, The Hindu BusinessLine, NDTV Profit and Moneycontrol. Only the headline, time, source name and link are shown; the full article stays on the publisher\u2019s website. All rights belong to the respective publishers. Matching of headlines to stocks is automatic keyword matching and can be wrong.',
          ],
        },
        {
          heading: '3. Weather — Open-Meteo',
          paras: ['Weather data by Open-Meteo.com, licensed under CC BY 4.0. Fetched live in your browser with a fallback snapshot. Free for non-commercial use.'],
        },
        {
          heading: '4. Assumptions shown in the app',
          bullets: [
            'Risk-free rate: 6.75% (assumption, 91-day T-bill proxy).',
            'Bid/ask spread: estimated from traded volume, because the EOD file has no quotes.',
            'Implied volatility: computed by the Black-Scholes model from the closing prices.',
            'Freeze quantity for stocks not in the curated table: not available — verify with your broker.',
          ],
        },
        {
          heading: '5. Illustrative sample datasets',
          paras: [
            'The 15-Jul-2025 replay, the 11-dimension news-impact examples, the demo portfolio and the U25 cost test vectors are illustrative samples used to demonstrate features. They are not actual market records, company filings or news.',
          ],
        },
      ],
    },
  ];
}
