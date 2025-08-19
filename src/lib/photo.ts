// 鉢の写真。利用者が写真URLを設定していればそれを、無ければ鉢のidから
// 観葉植物のフリー写真(Unsplash)を安定して割り当てる。バイナリは持たず
// ホットリンクし、寸法を指定してレイアウトのずれを防ぐ。

const POOL = [
  '1485955900006-10f4d324d411',
  '1416879595882-3373a0480b5b',
  '1463320726281-696a485928c7',
  '1517191434949-5e90cd67d2b6',
  '1459156212016-c812468e2115',
  '1602923668104-8f9e03e77e62',
  '1466692476868-aef1dfb1e735',
  '1512428813834-c702c7702b78',
  '1493957988430-a5f2e15f39a3',
  '1591958911259-bee2173bdccc',
] as const;

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function unsplash(id: string, w: number, h: number): string {
  return `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&crop=entropy&q=80`;
}

/** 正方形のサムネイルURL。photoが設定されていればそれを優先する */
export function plantPhoto(plant: { id: string; photo: string }, size: number): string {
  const custom = plant.photo.trim();
  if (custom !== '') return custom;
  const picked = POOL[hash(plant.id) % POOL.length] ?? POOL[0];
  return unsplash(picked, size, size);
}

/** 表紙の横長写真 */
export function heroPhoto(w: number, h: number): string {
  return unsplash('1545241047-6083a3684587', w, h);
}
