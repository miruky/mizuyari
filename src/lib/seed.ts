// 初回起動時に入れる見本の鉢。状態が一通り見えるよう、実行日を基準に
// 水やり日を散らして作る。

import { addDays, todayISO } from './schedule';
import type { Plant } from './plant';

export function seedPlants(now: number): Plant[] {
  const today = todayISO(now);
  return [
    {
      id: 'seed-pachira',
      name: 'パキラ',
      species: 'パキラ・グラブラ',
      spot: 'リビング窓際',
      waterEvery: 7,
      wateredAt: addDays(today, -8),
      repotEveryMonths: 24,
      repottedAt: addDays(today, -700),
    },
    {
      id: 'seed-monstera',
      name: 'モンステラ',
      species: 'モンステラ・デリシオサ',
      spot: 'リビング',
      waterEvery: 7,
      wateredAt: addDays(today, -7),
      repotEveryMonths: 18,
      repottedAt: addDays(today, -200),
    },
    {
      id: 'seed-pothos',
      name: 'ポトス',
      species: '斑入りポトス',
      spot: '玄関',
      waterEvery: 5,
      wateredAt: addDays(today, -4),
      repotEveryMonths: 12,
      repottedAt: addDays(today, -100),
    },
    {
      id: 'seed-sansevieria',
      name: 'サンスベリア',
      species: 'サンスベリア・ローレンチ',
      spot: '寝室',
      waterEvery: 21,
      wateredAt: addDays(today, -10),
      repotEveryMonths: 24,
      repottedAt: addDays(today, -300),
    },
  ];
}
