import { describe, expect, it } from 'vitest';
import type { Plant } from './plant';
import { canUndo, recentCare, recordCare, undoLastCare, waterDuePlants } from './history';

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
    history: [{ kind: 'water', date: '2026-06-01' }],
    ...over,
  };
}

describe('recordCare', () => {
  it('日付を更新し、ログの先頭に積む', () => {
    const next = recordCare(plant({}), 'water', '2026-06-13');
    expect(next.wateredAt).toBe('2026-06-13');
    expect(next.history[0]).toEqual({ kind: 'water', date: '2026-06-13' });
  });

  it('元の鉢を書き換えない', () => {
    const p = plant({});
    recordCare(p, 'repot', '2026-06-13');
    expect(p.repottedAt).toBe('2026-01-01');
    expect(p.history).toHaveLength(1);
  });
});

describe('undoLastCare', () => {
  it('直近の記録を消し、日付を一つ前へ戻す', () => {
    const recorded = recordCare(plant({}), 'water', '2026-06-13');
    const undone = undoLastCare(recorded, 'water');
    expect(undone.wateredAt).toBe('2026-06-01');
    expect(undone.history).toEqual([{ kind: 'water', date: '2026-06-01' }]);
  });

  it('戻す相手が無ければ記録だけ消し日付は据え置く', () => {
    const undone = undoLastCare(plant({}), 'water');
    expect(undone.wateredAt).toBe('2026-06-01');
    expect(undone.history).toEqual([]);
  });

  it('記録が無ければ何もしない', () => {
    const p = plant({ history: [] });
    expect(undoLastCare(p, 'repot')).toBe(p);
  });
});

describe('waterDuePlants', () => {
  const TODAY = '2026-06-13';

  it('水やりが必要な鉢だけまとめて記録する', () => {
    const due = plant({ id: 'a', wateredAt: '2026-06-01', waterEvery: 7 });
    const ok = plant({ id: 'b', wateredAt: '2026-06-12', waterEvery: 7 });
    const { plants, count } = waterDuePlants([due, ok], TODAY);
    expect(count).toBe(1);
    expect(plants[0]?.wateredAt).toBe('2026-06-13');
    expect(plants[1]?.wateredAt).toBe('2026-06-12');
    expect(plants[0]?.history[0]).toEqual({ kind: 'water', date: '2026-06-13' });
  });

  it('対象が無ければ件数0で日付も変えない', () => {
    const ok = plant({ wateredAt: '2026-06-12', waterEvery: 7 });
    const { plants, count } = waterDuePlants([ok], TODAY);
    expect(count).toBe(0);
    expect(plants[0]?.wateredAt).toBe('2026-06-12');
  });

  it('元の配列を書き換えない', () => {
    const due = plant({ wateredAt: '2026-06-01', waterEvery: 7 });
    waterDuePlants([due], TODAY);
    expect(due.wateredAt).toBe('2026-06-01');
  });
});

describe('recentCare / canUndo', () => {
  it('同種を新しい順に最大件数返す', () => {
    const p = plant({
      history: [
        { kind: 'water', date: '2026-06-13' },
        { kind: 'repot', date: '2026-06-10' },
        { kind: 'water', date: '2026-06-06' },
        { kind: 'water', date: '2026-05-30' },
      ],
    });
    expect(recentCare(p, 'water', 2)).toEqual([
      { kind: 'water', date: '2026-06-13' },
      { kind: 'water', date: '2026-06-06' },
    ]);
    expect(canUndo(p, 'water')).toBe(true);
    expect(canUndo(p, 'repot')).toBe(false);
  });
});
