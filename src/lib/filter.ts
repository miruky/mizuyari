// 一覧の絞り込みと並べ替え。表示の都合だけを扱う純粋関数にしておく。

import type { Plant } from './plant';
import { needsRepot, needsWater, sortByNextWatering } from './schedule';

export type SortKey = 'next' | 'name' | 'spot';
export type FilterKey = 'all' | 'water' | 'repot';

export const SORT_LABELS: Record<SortKey, string> = {
  next: '予定が近い順',
  name: '名前順',
  spot: '置き場所順',
};

export const FILTER_LABELS: Record<FilterKey, string> = {
  all: 'すべて',
  water: '水やり',
  repot: '植え替え',
};

export function isSortKey(v: unknown): v is SortKey {
  return v === 'next' || v === 'name' || v === 'spot';
}

export function isFilterKey(v: unknown): v is FilterKey {
  return v === 'all' || v === 'water' || v === 'repot';
}

/** 検索語が鉢に当たるか。名前・品種・置き場所・メモを対象に、大小無視で部分一致 */
export function matchesQuery(plant: Plant, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q === '') return true;
  return [plant.name, plant.species, plant.spot, plant.notes].some((s) =>
    s.toLowerCase().includes(q),
  );
}

/** 絞り込んでから並べ替える。元の配列は変更しない。queryは語句での絞り込み */
export function arrange(
  plants: Plant[],
  today: string,
  sort: SortKey,
  filter: FilterKey,
  query = '',
): Plant[] {
  const filtered = plants.filter((p) => {
    if (!matchesQuery(p, query)) return false;
    if (filter === 'water') return needsWater(p, today);
    if (filter === 'repot') return needsRepot(p, today);
    return true;
  });
  if (sort === 'name') {
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  }
  if (sort === 'spot') {
    return [...filtered].sort(
      (a, b) => a.spot.localeCompare(b.spot, 'ja') || a.name.localeCompare(b.name, 'ja'),
    );
  }
  return sortByNextWatering(filtered);
}
