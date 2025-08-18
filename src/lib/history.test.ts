import { describe, expect, it } from 'vitest';
import type { Plant } from './plant';
import { canUndo, recentCare, recordCare, undoLastCare } from './history';

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
