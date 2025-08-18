// 鉢植えの型・検証・永続化。1鉢ごとに水やりと植え替えの周期を持つ。

export interface Plant {
  id: string;
  name: string;
  /** 品種や呼び名(「パキラ」「斑入りポトス」) */
  species: string;
  /** 置き場所(「リビング窓際」) */
  spot: string;
  /** 水やりの間隔(日) */
  waterEvery: number;
  /** 最後に水やりした日(YYYY-MM-DD) */
  wateredAt: string;
  /** 植え替えの間隔(月) */
  repotEveryMonths: number;
  /** 最後に植え替えた日(YYYY-MM-DD) */
  repottedAt: string;
}

export const MAX_WATER_DAYS = 60;
export const MAX_REPOT_MONTHS = 48;

export function newPlantId(): string {
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isPlant(value: unknown): value is Plant {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    p.name !== '' &&
    typeof p.species === 'string' &&
    typeof p.spot === 'string' &&
    typeof p.waterEvery === 'number' &&
    Number.isInteger(p.waterEvery) &&
    p.waterEvery >= 1 &&
    p.waterEvery <= MAX_WATER_DAYS &&
    typeof p.wateredAt === 'string' &&
    DATE_RE.test(p.wateredAt) &&
    typeof p.repotEveryMonths === 'number' &&
    Number.isInteger(p.repotEveryMonths) &&
    p.repotEveryMonths >= 1 &&
    p.repotEveryMonths <= MAX_REPOT_MONTHS &&
    typeof p.repottedAt === 'string' &&
    DATE_RE.test(p.repottedAt)
  );
}

/** JSON文字列から復元する。形の崩れた要素は読み飛ばす */
export function deserializePlants(json: string): Plant[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(isPlant);
}

export function serializePlants(plants: Plant[]): string {
  return JSON.stringify(plants);
}

export interface PlantStore {
  load(): Plant[] | null;
  save(plants: Plant[]): void;
}

const STORAGE_KEY = 'mizuyari.plants.v1';

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function createStore(storage: StorageLike): PlantStore {
  return {
    // 「保存されていない」(null)と「全件削除した」(空配列)を区別する
    load() {
      const raw = storage.getItem(STORAGE_KEY);
      return raw === null ? null : deserializePlants(raw);
    },
    save(plants) {
      storage.setItem(STORAGE_KEY, serializePlants(plants));
    },
  };
}
