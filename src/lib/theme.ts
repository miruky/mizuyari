// テーマの解決。pref(端末に合わせる/ライト/ダーク)と OS の prefers-color-scheme
// から実際の表示色を決める純粋関数。描画前の解決は index.html 先頭スクリプトが行う。

export type ThemePref = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_KEY = 'mizuyari.theme';

export const THEME_LABELS: Record<ThemePref, string> = {
  system: '端末に合わせる',
  light: 'ライト',
  dark: 'ダーク',
};

export function isThemePref(v: unknown): v is ThemePref {
  return v === 'system' || v === 'light' || v === 'dark';
}

/** トグルの巡回順: 端末に合わせる → ライト → ダーク → 端末に合わせる */
export function nextTheme(cur: ThemePref): ThemePref {
  if (cur === 'system') return 'light';
  if (cur === 'light') return 'dark';
  return 'system';
}

export function resolveTheme(pref: ThemePref, prefersDark: boolean): ResolvedTheme {
  if (pref === 'system') return prefersDark ? 'dark' : 'light';
  return pref;
}
