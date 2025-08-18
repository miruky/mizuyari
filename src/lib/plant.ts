// 鉢植えの型・検証・永続化。1鉢ごとに水やりと植え替えの周期を持ち、
// 世話の記録(history)・置き場所の日当たり・自由メモ・写真URLを添える。
// 保存データの復元は欠けたフィールドを既定値で補い、古い形式とも往復できる。

export type CareKind = 'water' | 'repot';

export interface CareEvent {
  kind: CareKind;
  /** 世話をした日(YYYY-MM-DD) */
  date: string;
}

export type LightLevel = 'sunny' | 'bright' | 'shade';

export const LIGHT_LABELS: Record<LightLevel, string> = {
  sunny: '日なた',
  bright: '明るい日陰',
  shade: '日陰',
};

const LIGHT_LEVELS: readonly LightLevel[] = ['sunny', 'bright', 'shade'];

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
  /** 置き場所の日当たり */
  light: LightLevel;
  /** 自由メモ(水のやり方・葉の様子など) */
  notes: string;
  /** 鉢の写真URL。空なら名前から自動生成した写真を使う */
  photo: string;
  /** 世話のログ。新しい順 */
  history: CareEvent[];
}

export const MAX_WATER_DAYS = 60;
export const MAX_REPOT_MONTHS = 48;
export const MAX_HISTORY = 60;

export function newPlantId(): string {
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function normalizeHistory(value: unknown): CareEvent[] {
  if (!Array.isArray(value)) return [];
  const out: CareEvent[] = [];
  for (const item of value) {
    if (typeof item !== 'object' || item === null) continue;
    const e = item as Record<string, unknown>;
    if (
      (e.kind === 'water' || e.kind === 'repot') &&
      typeof e.date === 'string' &&
      DATE_RE.test(e.date)
    ) {
      out.push({ kind: e.kind, date: e.date });
    }
  }
  return out.slice(0, MAX_HISTORY);
}

/** 不明な値を鉢に整える。核となる項目が欠けていればnull、任意項目は既定で補う */
export function normalizePlant(value: unknown): Plant | null {
  if (typeof value !== 'object' || value === null) return null;
  const p = value as Record<string, unknown>;
  const core =
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
    DATE_RE.test(p.repottedAt);
  if (!core) return null;
  return {
    id: p.id as string,
    name: p.name as string,
    species: p.species as string,
    spot: p.spot as string,
    waterEvery: p.waterEvery as number,
    wateredAt: p.wateredAt as string,
    repotEveryMonths: p.repotEveryMonths as number,
    repottedAt: p.repottedAt as string,
    light: LIGHT_LEVELS.includes(p.light as LightLevel) ? (p.light as LightLevel) : 'bright',
    notes: typeof p.notes === 'string' ? p.notes : '',
    photo: typeof p.photo === 'string' ? p.photo : '',
    history: normalizeHistory(p.history),
  };
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
  return parsed.map(normalizePlant).filter((p): p is Plant => p !== null);
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

interface Backup {
  app: 'mizuyari';
  version: 1;
  exportedAt: string;
  plants: Plant[];
}

/** バックアップ用のJSON文字列を作る */
export function exportBackup(plants: Plant[], exportedAt: string): string {
  const backup: Backup = { app: 'mizuyari', version: 1, exportedAt, plants };
  return JSON.stringify(backup, null, 2);
}

/** バックアップJSONまたは鉢の配列を読み込む。読めなければnull(=失敗)、空配列は有効 */
export function importBackup(json: string): Plant[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  const raw = Array.isArray(parsed)
    ? parsed
    : typeof parsed === 'object' &&
        parsed !== null &&
        Array.isArray((parsed as Record<string, unknown>).plants)
      ? ((parsed as Record<string, unknown>).plants as unknown[])
      : null;
  if (raw === null) return null;
  return raw.map(normalizePlant).filter((p): p is Plant => p !== null);
}
