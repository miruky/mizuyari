import { describe, expect, it } from 'vitest';
import {
  createStore,
  deserializePlants,
  exportBackup,
  importBackup,
  normalizePlant,
  serializePlants,
  type Plant,
} from './plant';
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
    light: 'bright',
    notes: '',
    photo: '',
    history: [],
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

describe('normalizePlant', () => {
  it('任意フィールドが欠けた古い形式を既定値で補う', () => {
    const old = {
      id: 'a',
      name: 'ガジュマル',
      species: '',
      spot: '',
      waterEvery: 7,
      wateredAt: '2026-06-01',
      repotEveryMonths: 12,
      repottedAt: '2026-01-01',
    };
    expect(normalizePlant(old)).toEqual(
      plant({ id: 'a', name: 'ガジュマル', light: 'bright', notes: '', photo: '', history: [] }),
    );
  });

  it('不正なlightや壊れたhistory要素を捨てる', () => {
    const p = normalizePlant({
      ...plant({ id: 'b' }),
      light: 'むちゃくちゃ',
      history: [
        { kind: 'water', date: '2026-06-01' },
        { kind: 'mist', date: '2026-06-02' },
        { kind: 'repot', date: 'おととい' },
        { date: '2026-06-03' },
      ],
    });
    expect(p?.light).toBe('bright');
    expect(p?.history).toEqual([{ kind: 'water', date: '2026-06-01' }]);
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

describe('exportBackup / importBackup', () => {
  it('書き出したバックアップを読み戻せる', () => {
    const plants = seedPlants(Date.UTC(2026, 5, 13));
    const json = exportBackup(plants, '2026-06-13T10:00:00');
    expect(importBackup(json)).toEqual(plants);
  });

  it('鉢の配列だけのJSONも受け付ける', () => {
    const plants = seedPlants(Date.UTC(2026, 5, 13));
    expect(importBackup(serializePlants(plants))).toEqual(plants);
  });

  it('読めないJSONはnull、形の崩れた鉢は読み飛ばす', () => {
    expect(importBackup('{')).toBeNull();
    expect(importBackup('42')).toBeNull();
    expect(importBackup('{"plants":[{"name":""}]}')).toEqual([]);
  });
});
