import { describe, expect, it } from 'vitest';
import { BitemporalPointInTimeStore } from '../src/engine/bitemporalStore';
import {
  HistoricalIntradayBar,
  runPoisonedFutureSentinelTest,
} from '../src/engine/backtestAndValidation';
import { HISTORICAL_REPLAY_15_JUL_2025_RECORDS } from '../src/engine/verifiedHistoricalFixtures';

describe('U21.2 & V4-48 Look-Ahead Sentinel Test (No-Hindsight Proof)', () => {
  it('guarantees BitemporalPointInTimeStore never returns records with effectiveTime > decisionTimestamp', () => {
    const store = new BitemporalPointInTimeStore<HistoricalIntradayBar>();
    store.insertBatch(HISTORICAL_REPLAY_15_JUL_2025_RECORDS);

    // Query at 11:15 IST (05:45:02 UTC) on 15-Jul-2025
    const decisionTs = '2025-07-15T05:45:02.000Z';
    const visible = store.queryAsOf(decisionTs);

    expect(visible.length).toBe(4); // 09:15, 09:45, 10:30, 11:15 bars only
    for (const r of visible) {
      expect(new Date(r.effectiveTime).getTime()).toBeLessThanOrEqual(
        new Date(decisionTs).getTime()
      );
    }

    const futureRecords = store.queryArrivedAfter(decisionTs);
    expect(futureRecords.length).toBe(3); // 12:30, 14:15, 15:20 bars strictly excluded
  });

  it('proves replay decision at 11:15 IST is 100% bit-identical when all future rows are poisoned with NaN/999999999', () => {
    const decisionTs = '2025-07-15T05:45:02.000Z';
    const sentinel = runPoisonedFutureSentinelTest(
      HISTORICAL_REPLAY_15_JUL_2025_RECORDS,
      decisionTs,
      10000
    );

    expect(sentinel.sentinelPassed).toBe(true);
    expect(sentinel.statusBanner).toBe('NO-HINDSIGHT SENTINEL PASSED (BIT-IDENTICAL)');
    expect(sentinel.cleanDecision).toEqual(sentinel.poisonedDecision);
    expect(sentinel.cleanDecision.newsAvailableAtEntry).not.toContain(
      'POISONED_FUTURE_HEADLINE_LEAK'
    );
  });
});
