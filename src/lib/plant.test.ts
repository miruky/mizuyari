import { describe, expect, it } from 'vitest';
import { createStore, deserializePlants, serializePlants, type Plant } from './plant';
import { seedPlants } from './seed';

function plant(over: Partial<Plant>): Plant {
  return {
    id: 'x',
    name: 'パキラ',
    species: '',
    spot: '',
    waterEvery: 7,
    wateredAt: '2026-06-01',
    repotEveryMonths: 12,
    repottedAt: '2026-01-01',
    ...over,
  };
}

describe('deserializePlants', () => {
  it('seedPlantsと往復できる', () => {
    const plants = seedPlants(Date.UTC(2026, 5, 13));
    expect(deserializePlants(serializePlants(plants))).toEqual(plants);
  });

  it('壊れたJSON・配列でないものは空', () => {
    expect(deserializePlants('{')).toEqual([]);
    expect(deserializePlants('{"a":1}')).toEqual([]);
  });

  it('形の崩れた要素だけを読み飛ばす', () => {
    const good = plant({ id: 'ok' });
    const json = JSON.stringify([
      good,
      { ...good, name: '' },
      { ...good, waterEvery: 0 },
      { ...good, waterEvery: 7.5 },
      { ...good, wateredAt: '6/1' },
      { ...good, repotEveryMonths: 0 },
    ]);
    expect(deserializePlants(json)).toEqual([good]);
  });
});

describe('createStore', () => {
  function memoryStorage(): {
    getItem(k: string): string | null;
    setItem(k: string, v: string): void;
  } {
    const map = new Map<string, string>();
    return {
      getItem: (k) => map.get(k) ?? null,
      setItem: (k, v) => void map.set(k, v),
    };
  }

  it('保存して読み戻し、空配列とnullを区別する', () => {
    const store = createStore(memoryStorage());
    expect(store.load()).toBeNull();
    store.save([]);
    expect(store.load()).toEqual([]);
    const plants = seedPlants(Date.UTC(2026, 5, 13));
    store.save(plants);
    expect(store.load()).toEqual(plants);
  });
});
