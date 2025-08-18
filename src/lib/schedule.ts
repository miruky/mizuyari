// 水やり・植え替えの予定計算。日付はYYYY-MM-DDの文字列で受け取り、
// 「今日」を引数に取る純粋関数にしてテストしやすくする。

import type { Plant } from './plant';

const DAY_MS = 24 * 60 * 60 * 1000;

function toUTC(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const [, y, mo, d] = m;
  return Date.UTC(Number(y), Number(mo) - 1, Number(d));
}

function fromUTC(utc: number): string {
  const d = new Date(utc);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISO(now: number): string {
  const d = new Date(now);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(iso: string, days: number): string {
  const utc = toUTC(iso);
  if (utc === null) return iso;
  return fromUTC(utc + days * DAY_MS);
}

/** 月単位の加算。月末を超える日付は月末に丸める(1/31の3か月後は4/30) */
export function addMonths(iso: string, months: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const [, yRaw, moRaw, dRaw] = m;
  const y = Number(yRaw);
  const mo = Number(moRaw) - 1 + months;
  const d = Number(dRaw);
  const lastDay = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
  return fromUTC(Date.UTC(y, mo, Math.min(d, lastDay)));
}

/** fromからtoまでの日数。toが過去なら負 */
export function daysBetween(fromISO: string, toISO: string): number | null {
  const from = toUTC(fromISO);
  const to = toUTC(toISO);
  if (from === null || to === null) return null;
  return Math.round((to - from) / DAY_MS);
}

export function nextWatering(plant: Plant): string {
  return addDays(plant.wateredAt, plant.waterEvery);
}

export function nextRepotting(plant: Plant): string {
  return addMonths(plant.repottedAt, plant.repotEveryMonths);
}

export type WaterStatus = 'overdue' | 'due' | 'soon' | 'ok';

export const WATER_STATUS_LABELS: Record<WaterStatus, string> = {
  overdue: '遅れている',
  due: '今日',
  soon: 'もうすぐ',
  ok: '予定どおり',
};

/** 水やりの状態。予定日を過ぎたらoverdue、当日はdue、2日以内はsoon */
export function waterStatus(plant: Plant, today: string): WaterStatus {
  const left = daysBetween(today, nextWatering(plant));
  if (left === null) return 'ok';
  if (left < 0) return 'overdue';
  if (left === 0) return 'due';
  if (left <= 2) return 'soon';
  return 'ok';
}

/** 水やりが今日以前に来ている(=やるべき)かどうか */
export function needsWater(plant: Plant, today: string): boolean {
  const status = waterStatus(plant, today);
  return status === 'overdue' || status === 'due';
}

/** 植え替えの予定日が来ているかどうか */
export function needsRepot(plant: Plant, today: string): boolean {
  const left = daysBetween(today, nextRepotting(plant));
  return left !== null && left <= 0;
}

/** 次の水やりが近い順。同じ日なら名前順 */
export function sortByNextWatering(plants: Plant[]): Plant[] {
  return [...plants].sort(
    (a, b) => nextWatering(a).localeCompare(nextWatering(b)) || a.name.localeCompare(b.name, 'ja'),
  );
}

/** 「6月13日(土)」形式。不正な形はそのまま返す */
export function formatDateJa(iso: string): string {
  const utc = toUTC(iso);
  if (utc === null) return iso;
  const d = new Date(utc);
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'] as const;
  return `${d.getUTCMonth() + 1}月${d.getUTCDate()}日(${weekdays[d.getUTCDay()]})`;
}
