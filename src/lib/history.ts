// 世話の記録と取り消し。鉢の wateredAt / repottedAt を正本としつつ、
// 同じ操作を history に積む。誤タップは undoLastCare で1つ前の日付へ戻せる。

import { MAX_HISTORY, type CareEvent, type CareKind, type Plant } from './plant';

const FIELD: Record<CareKind, 'wateredAt' | 'repottedAt'> = {
  water: 'wateredAt',
  repot: 'repottedAt',
};

/** 世話を記録する。該当の日付を更新し、ログ先頭に追加する(新しい順) */
export function recordCare(plant: Plant, kind: CareKind, date: string): Plant {
  const history = [{ kind, date }, ...plant.history].slice(0, MAX_HISTORY);
  return { ...plant, [FIELD[kind]]: date, history };
}

/** 直近の同種の記録を取り消す。日付は一つ前の記録へ戻す。戻す先が無ければ日付は据え置く */
export function undoLastCare(plant: Plant, kind: CareKind): Plant {
  const idx = plant.history.findIndex((e) => e.kind === kind);
  if (idx === -1) return plant;
  const history = plant.history.filter((_, i) => i !== idx);
  const prev = history.find((e) => e.kind === kind);
  if (!prev) return { ...plant, history };
  return { ...plant, [FIELD[kind]]: prev.date, history };
}

/** 指定した種類の記録を新しい順に最大limit件返す */
export function recentCare(plant: Plant, kind: CareKind, limit: number): CareEvent[] {
  const out: CareEvent[] = [];
  for (const e of plant.history) {
    if (e.kind === kind) out.push(e);
    if (out.length >= limit) break;
  }
  return out;
}

/** 同種の記録が取り消せる(=戻せる相手がいる)か */
export function canUndo(plant: Plant, kind: CareKind): boolean {
  return plant.history.filter((e) => e.kind === kind).length >= 2;
}
