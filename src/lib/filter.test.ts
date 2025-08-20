import { describe, expect, it } from 'vitest';
import type { Plant } from './plant';
import { arrange, isFilterKey, isSortKey, matchesQuery } from './filter';

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

describe('matchesQuery', () => {
  it('空語句はすべて通す', () => {
    expect(matchesQuery(plant({ name: 'パキラ' }), '')).toBe(true);
    expect(matchesQuery(plant({ name: 'パキラ' }), '   ')).toBe(true);
  });

  it('名前・品種・置き場所・メモのいずれかに部分一致', () => {
    const p = plant({ name: 'パキラ', species: 'グラブラ', spot: '窓際', notes: '乾かし気味' });
    expect(matchesQuery(p, 'グラ')).toBe(true);
    expect(matchesQuery(p, '窓')).toBe(true);
    expect(matchesQuery(p, '乾かし')).toBe(true);
    expect(matchesQuery(p, 'モンステラ')).toBe(false);
  });

  it('英字は大小を無視する', () => {
    expect(matchesQuery(plant({ species: 'Pothos' }), 'pothos')).toBe(true);
    expect(matchesQuery(plant({ species: 'Pothos' }), 'POTH')).toBe(true);
  });
});

describe('arrange + query', () => {
  it('語句で絞ってから並べ替える', () => {
    const list = [
      plant({ name: 'パキラ', spot: 'まどぎわ' }),
      plant({ name: 'ポトス', spot: 'げんかん' }),
      plant({ name: 'サンスベリア', spot: 'まどぎわ' }),
    ];
    expect(arrange(list, TODAY, 'name', 'all', 'まどぎわ').map((p) => p.name)).toEqual([
      'サンスベリア',
      'パキラ',
    ]);
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
