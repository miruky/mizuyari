import './style.css';
import { createApp, type ThemeController, type ViewPrefs } from './app';
import { createStore } from './lib/plant';
import { seedPlants } from './lib/seed';
import { todayISO } from './lib/schedule';
import { isFilterKey, isSortKey } from './lib/filter';
import { isThemePref, nextTheme, resolveTheme, THEME_KEY, type ThemePref } from './lib/theme';
import { countUp, leadEntrance, setupScroll } from './motion';

const root = document.getElementById('app');
if (!root) throw new Error('#app が見つかりません');

const store = createStore(localStorage);
const now = Date.now();

// 初回起動だけ見本の鉢を入れて保存する。一度でも保存があれば
// (全件削除して空にした場合も含めて)その状態を尊重する。
let plants = store.load();
if (plants === null) {
  plants = seedPlants(now);
  store.save(plants);
}

// テーマ。描画前の解決は index.html 先頭スクリプトが済ませているので、
// ここでは pref の保持と、systemのときのOS変更追従だけを受け持つ。
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

function readTheme(): ThemePref {
  const raw = localStorage.getItem(THEME_KEY);
  return isThemePref(raw) ? raw : 'system';
}

function applyTheme(pref: ThemePref): void {
  document.documentElement.dataset.theme = resolveTheme(pref, darkQuery.matches);
}

const theme: ThemeController = {
  get: readTheme,
  cycle() {
    const next = nextTheme(readTheme());
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
    return next;
  },
};

darkQuery.addEventListener('change', () => {
  if (readTheme() === 'system') applyTheme('system');
});

// 表示の絞り込み・並べ替えの保持
const VIEW_KEY = 'mizuyari.view.v1';

function readView(): ViewPrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(VIEW_KEY) ?? '{}') as Record<string, unknown>;
    return {
      sort: isSortKey(raw.sort) ? raw.sort : 'next',
      filter: isFilterKey(raw.filter) ? raw.filter : 'all',
    };
  } catch {
    return { sort: 'next', filter: 'all' };
  }
}

function saveView(view: ViewPrefs): void {
  localStorage.setItem(VIEW_KEY, JSON.stringify(view));
}

let firstPaint = true;

createApp({
  root,
  store,
  initialPlants: plants,
  today: todayISO(now),
  view: readView(),
  saveView,
  theme,
  onRender(animate) {
    if (firstPaint) {
      firstPaint = false;
      leadEntrance(root);
      const count = root.querySelector<HTMLElement>('.count[data-count]');
      if (count) countUp(count, Number(count.dataset.count));
    }
    setupScroll(root, animate);
  },
});
