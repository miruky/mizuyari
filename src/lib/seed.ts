// 初回起動時に入れる見本の鉢。状態が一通り見えるよう、実行日を基準に
// 水やり日を散らして作る。世話のログにも数回ぶんの履歴を入れておく。

import { addDays, todayISO } from './schedule';
import type { CareEvent, LightLevel, Plant } from './plant';

interface Sketch {
  id: string;
  name: string;
  species: string;
  spot: string;
  light: LightLevel;
  notes: string;
  waterEvery: number;
  wateredAgo: number;
  repotEveryMonths: number;
  repottedAgo: number;
}

const SKETCHES: Sketch[] = [
  {
    id: 'seed-pachira',
    name: 'パキラ',
    species: 'パキラ・グラブラ',
    spot: 'リビング窓際',
    light: 'bright',
    notes: '幹がふっくらしている間は乾かし気味で。',
    waterEvery: 7,
    wateredAgo: 8,
    repotEveryMonths: 24,
    repottedAgo: 700,
  },
  {
    id: 'seed-monstera',
    name: 'モンステラ',
    species: 'モンステラ・デリシオサ',
    spot: 'リビング',
    light: 'bright',
    notes: '気根が伸びたら支柱に留める。',
    waterEvery: 7,
    wateredAgo: 7,
    repotEveryMonths: 18,
    repottedAgo: 200,
  },
  {
    id: 'seed-pothos',
    name: 'ポトス',
    species: '斑入りポトス',
    spot: '玄関',
    light: 'shade',
    notes: '斑を保つにはやや明るめが良い。',
    waterEvery: 5,
    wateredAgo: 4,
    repotEveryMonths: 12,
    repottedAgo: 100,
  },
  {
    id: 'seed-sansevieria',
    name: 'サンスベリア',
    species: 'サンスベリア・ローレンチ',
    spot: '寝室',
    light: 'sunny',
    notes: '冬はほとんど水やりしない。',
    waterEvery: 21,
    wateredAgo: 10,
    repotEveryMonths: 24,
    repottedAgo: 300,
  },
];

function seedHistory(today: string, s: Sketch): CareEvent[] {
  const water: CareEvent[] = [
    { kind: 'water', date: addDays(today, -s.wateredAgo) },
    { kind: 'water', date: addDays(today, -s.wateredAgo - s.waterEvery) },
    { kind: 'water', date: addDays(today, -s.wateredAgo - s.waterEvery * 2) },
  ];
  const repot: CareEvent[] = [{ kind: 'repot', date: addDays(today, -s.repottedAgo) }];
  // 新しい順に並べる
  return [...water, ...repot].sort((a, b) => b.date.localeCompare(a.date));
}

export function seedPlants(now: number): Plant[] {
  const today = todayISO(now);
  return SKETCHES.map((s) => ({
    id: s.id,
    name: s.name,
    species: s.species,
    spot: s.spot,
    light: s.light,
    notes: s.notes,
    photo: '',
    waterEvery: s.waterEvery,
    wateredAt: addDays(today, -s.wateredAgo),
    repotEveryMonths: s.repotEveryMonths,
    repottedAt: addDays(today, -s.repottedAgo),
    history: seedHistory(today, s),
  }));
}
