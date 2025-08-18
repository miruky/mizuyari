import { describe, expect, it } from 'vitest';
import type { Plant } from './plant';
import {
  addDays,
  addMonths,
  daysBetween,
  daysUntilWater,
  formatDateJa,
  needsRepot,
  needsWater,
  nextRepotting,
  nextWatering,
  relativeDays,
  sortByNextWatering,
  summarize,
  waterProgress,
  waterStatus,
} from './schedule';

function plant(over: Partial<Plant>): Plant {
  return {
    id: 'x',
    name: '鉢',
    species: '',
    spot: '',
    waterEvery: 7,
    wateredAt: '2026-06-01',
    repotEveryMonths: 12,
    repottedAt: '2026-01-01',
    light: 'bright',
    notes: '',
    photo: '',
    history: [],
    ...over,
  };
}

const TODAY = '2026-06-13';

describe('日付計算', () => {
  it('addDaysは月またぎ・年またぎを繰り上げる', () => {
    expect(addDays('2026-06-28', 5)).toBe('2026-07-03');
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2026-06-13', -10)).toBe('2026-06-03');
  });

  it('addMonthsは月末を超える日付を月末に丸める', () => {
    expect(addMonths('2026-01-31', 3)).toBe('2026-04-30');
    expect(addMonths('2026-01-15', 12)).toBe('2027-01-15');
    expect(addMonths('2025-12-31', 2)).toBe('2026-02-28');
  });

  it('daysBetweenは過去を負で返し、不正な日付はnull', () => {
    expect(daysBetween('2026-06-13', '2026-06-20')).toBe(7);
    expect(daysBetween('2026-06-13', '2026-06-10')).toBe(-3);
    expect(daysBetween('六月十三日', TODAY)).toBeNull();
  });
});

describe('waterStatus / needsWater', () => {
  it('予定日を過ぎたら遅れ、当日は今日、2日以内はもうすぐ', () => {
    expect(waterStatus(plant({ wateredAt: '2026-06-01', waterEvery: 7 }), TODAY)).toBe('overdue');
    expect(waterStatus(plant({ wateredAt: '2026-06-06', waterEvery: 7 }), TODAY)).toBe('due');
    expect(waterStatus(plant({ wateredAt: '2026-06-08', waterEvery: 7 }), TODAY)).toBe('soon');
    expect(waterStatus(plant({ wateredAt: '2026-06-12', waterEvery: 7 }), TODAY)).toBe('ok');
  });

  it('遅れと当日だけがやるべき扱い', () => {
    expect(needsWater(plant({ wateredAt: '2026-06-01' }), TODAY)).toBe(true);
    expect(needsWater(plant({ wateredAt: '2026-06-06' }), TODAY)).toBe(true);
    expect(needsWater(plant({ wateredAt: '2026-06-08' }), TODAY)).toBe(false);
  });
});

describe('nextWatering / nextRepotting / needsRepot', () => {
  it('次の予定日を周期から出す', () => {
    expect(nextWatering(plant({ wateredAt: '2026-06-06', waterEvery: 7 }))).toBe('2026-06-13');
    expect(nextRepotting(plant({ repottedAt: '2025-06-13', repotEveryMonths: 12 }))).toBe(
      '2026-06-13',
    );
  });

  it('植え替え予定日が来たらneedsRepot', () => {
    expect(needsRepot(plant({ repottedAt: '2025-06-01', repotEveryMonths: 12 }), TODAY)).toBe(true);
    expect(needsRepot(plant({ repottedAt: '2026-06-01', repotEveryMonths: 12 }), TODAY)).toBe(
      false,
    );
  });
});

describe('sortByNextWatering', () => {
  it('次の水やりが近い順、同日は名前順', () => {
    const plants = [
      plant({ name: 'ゆとり', wateredAt: '2026-06-12', waterEvery: 7 }),
      plant({ name: 'いそぎ', wateredAt: '2026-06-01', waterEvery: 7 }),
      plant({ name: 'あした', wateredAt: '2026-06-07', waterEvery: 7 }),
      plant({ name: 'あさって', wateredAt: '2026-06-07', waterEvery: 7 }),
    ];
    expect(sortByNextWatering(plants).map((p) => p.name)).toEqual([
      'いそぎ',
      'あさって',
      'あした',
      'ゆとり',
    ]);
  });
});

describe('formatDateJa', () => {
  it('曜日つきの日本語表記にする', () => {
    expect(formatDateJa('2026-06-13')).toBe('6月13日(土)');
    expect(formatDateJa('2027-01-01')).toBe('1月1日(金)');
    expect(formatDateJa('未定')).toBe('未定');
  });
});

describe('daysUntilWater / waterProgress', () => {
  it('残り日数と周期の経過割合を返す', () => {
    const p = plant({ wateredAt: '2026-06-06', waterEvery: 10 });
    expect(daysUntilWater(p, '2026-06-13')).toBe(3);
    expect(waterProgress(p, '2026-06-13')).toBeCloseTo(0.7);
  });

  it('やった直後は0、超過しても0未満にはしない', () => {
    expect(waterProgress(plant({ wateredAt: '2026-06-13' }), '2026-06-13')).toBe(0);
    expect(waterProgress(plant({ wateredAt: '2026-06-20' }), '2026-06-13')).toBe(0);
  });
});

describe('summarize', () => {
  it('水やり・もうすぐ・植え替えを数える', () => {
    const plants = [
      plant({ wateredAt: '2026-06-01', waterEvery: 7 }), // 次06-08 overdue
      plant({ wateredAt: '2026-06-06', waterEvery: 7 }), // 次06-13 due
      plant({ wateredAt: '2026-06-08', waterEvery: 7 }), // 次06-15 soon
      plant({
        wateredAt: '2026-06-12',
        waterEvery: 7,
        repottedAt: '2025-06-01',
        repotEveryMonths: 12,
      }),
    ];
    expect(summarize(plants, '2026-06-13')).toEqual({ thirsty: 2, soon: 1, repot: 1, total: 4 });
  });
});

describe('relativeDays', () => {
  it('残り日数を人が読む形にする', () => {
    expect(relativeDays(0)).toBe('今日');
    expect(relativeDays(1)).toBe('明日');
    expect(relativeDays(5)).toBe('あと5日');
    expect(relativeDays(-1)).toBe('昨日まで');
    expect(relativeDays(-3)).toBe('3日すぎ');
  });
});
