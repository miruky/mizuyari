import { describe, expect, it } from 'vitest';
import type { Plant } from './plant';
import { arrange, isFilterKey, isSortKey } from './filter';

function plant(over: Partial<Plant>): Plant {
  return {
    id: 'x',
    name: '鉢',
    species: '',
    spot: '',
    waterEvery: 7,
    wateredAt: '2026-06-08',
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

// 並び順を照合順序に左右されないよう、置き場所は五十音のひらがなにする。
const PLANTS = [
  plant({ name: 'ゆとり', spot: 'しんしつ', wateredAt: '2026-06-12', waterEvery: 7 }),
  plant({ name: 'いそぎ', spot: 'げんかん', wateredAt: '2026-06-01', waterEvery: 7 }),
  plant({ name: 'あした', spot: 'りびんぐ', wateredAt: '2026-06-06', waterEvery: 7 }),
  plant({ name: 'うえかえ', spot: 'げんかん', wateredAt: '2026-06-12', repottedAt: '2025-01-01' }),
];

describe('arrange', () => {
  it('予定が近い順に並べる(既定)', () => {
    expect(arrange(PLANTS, TODAY, 'next', 'all').map((p) => p.name)).toEqual([
      'いそぎ',
      'あした',
      'うえかえ',
      'ゆとり',
    ]);
  });

  it('名前順に並べる', () => {
    expect(arrange(PLANTS, TODAY, 'name', 'all').map((p) => p.name)).toEqual([
      'あした',
      'いそぎ',
      'うえかえ',
      'ゆとり',
    ]);
  });

  it('置き場所順に並べ、同じ場所は名前順', () => {
    expect(arrange(PLANTS, TODAY, 'spot', 'all').map((p) => p.name)).toEqual([
      'いそぎ',
      'うえかえ',
      'ゆとり',
      'あした',
    ]);
  });

  it('水やり・植え替えで絞り込む', () => {
    expect(arrange(PLANTS, TODAY, 'next', 'water').map((p) => p.name)).toEqual([
      'いそぎ',
      'あした',
    ]);
    expect(arrange(PLANTS, TODAY, 'next', 'repot').map((p) => p.name)).toEqual(['うえかえ']);
  });

  it('元の配列は変更しない', () => {
    const copy = [...PLANTS];
    arrange(PLANTS, TODAY, 'name', 'all');
    expect(PLANTS).toEqual(copy);
  });
});

describe('isSortKey / isFilterKey', () => {
  it('既知のキーだけ受け付ける', () => {
    expect(isSortKey('name')).toBe(true);
    expect(isSortKey('foo')).toBe(false);
    expect(isFilterKey('water')).toBe(true);
    expect(isFilterKey('foo')).toBe(false);
  });
});
