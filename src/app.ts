// 画面の描画。1画面構成で、状態が変わるたびに全体を描き直す。
// テキスト入力はchangeイベント(確定時)で反映するので、再描画で入力が途切れない。
// 鉢の並びと絞り込みは表示の状態として持ち、配列の添字ではなくidで対象を引く。

import {
  exportBackup,
  importBackup,
  LIGHT_LABELS,
  MAX_REPOT_MONTHS,
  MAX_WATER_DAYS,
  newPlantId,
  type LightLevel,
  type Plant,
  type PlantStore,
} from './lib/plant';
import {
  countCareSince,
  daysUntilRepot,
  daysUntilWater,
  formatDateJa,
  needsRepot,
  nextRepotting,
  nextWatering,
  relativeDays,
  startOfMonth,
  summarize,
  waterProgress,
  waterStatus,
  type WaterStatus,
} from './lib/schedule';
import {
  arrange,
  FILTER_LABELS,
  isFilterKey,
  isSortKey,
  SORT_LABELS,
  type FilterKey,
  type SortKey,
} from './lib/filter';
import { canUndo, recordCare, undoLastCare, waterDuePlants } from './lib/history';
import { plantPhoto } from './lib/photo';
import { icons } from './icons';
import { THEME_LABELS, type ThemePref } from './lib/theme';

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function esc(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => ESCAPES[ch] ?? ch);
}

const RING_R = 15.5;
const RING_C = 2 * Math.PI * RING_R;

const STATUS_TONE: Record<WaterStatus, string> = {
  overdue: 'danger',
  due: 'danger',
  soon: 'warn',
  ok: 'accent',
};

function progressRing(fraction: number, tone: string): string {
  const f = Math.max(0, Math.min(1, fraction));
  const dash = (RING_C * f).toFixed(1);
  return `<svg class="ring" viewBox="0 0 40 40" aria-hidden="true">
      <circle class="ring-track" cx="20" cy="20" r="${RING_R}" />
      <circle class="ring-fill tone-${tone}" cx="20" cy="20" r="${RING_R}"
        stroke-dasharray="${dash} ${RING_C.toFixed(1)}" transform="rotate(-90 20 20)" />
      <path class="ring-drop tone-${tone}" d="M20 14.5c-2.4 3-3.6 5-3.6 6.7a3.6 3.6 0 0 0 7.2 0c0-1.7-1.2-3.7-3.6-6.7z" />
    </svg>`;
}

export interface ViewPrefs {
  sort: SortKey;
  filter: FilterKey;
}

export interface ThemeController {
  get(): ThemePref;
  cycle(): ThemePref;
}

export interface AppDeps {
  root: HTMLElement;
  store: PlantStore;
  initialPlants: Plant[];
  today: string;
  view: ViewPrefs;
  saveView(view: ViewPrefs): void;
  theme: ThemeController;
  /** 描画後に呼ばれる。animate=trueなら入場演出を許す */
  onRender?: (animate: boolean) => void;
}

export function createApp(deps: AppDeps): void {
  const { root, store, today, theme } = deps;
  let plants = deps.initialPlants.slice();
  let sort = deps.view.sort;
  let filter = deps.view.filter;
  let expandedId: string | null = null;
  let adding = false;
  let menuOpen = false;
  let notice = '';
  let query = '';

  function persist(): void {
    store.save(plants);
  }

  function byId(id: string): Plant | undefined {
    return plants.find((p) => p.id === id);
  }

  function replace(id: string, next: Plant): void {
    plants = plants.map((p) => (p.id === id ? next : p));
    persist();
    render(false);
  }

  function lightSelect(name: string, value: LightLevel): string {
    const opts = (Object.keys(LIGHT_LABELS) as LightLevel[])
      .map(
        (k) =>
          `<option value="${k}"${k === value ? ' selected' : ''}>${esc(LIGHT_LABELS[k])}</option>`,
      )
      .join('');
    return `<select data-field="${name}" aria-label="日当たり">${opts}</select>`;
  }

  function themeButton(): string {
    const pref = theme.get();
    const glyph = pref === 'light' ? icons.sun : pref === 'dark' ? icons.moon : icons.monitor;
    return `<button type="button" class="ghost-button" id="theme-toggle"
        aria-label="表示テーマ: ${esc(THEME_LABELS[pref])}。切り替える">
        ${glyph}<span>${esc(THEME_LABELS[pref])}</span></button>`;
  }

  function masthead(): string {
    return `<header class="masthead">
      <div class="wrap masthead-inner">
        <div class="wordmark">
          <span class="mark">${icons.logo}</span>
          <span class="wordmark-text">
            <span class="kicker">栽培手帖</span>
            <span class="wordmark-name">mizuyari</span>
          </span>
        </div>
        ${themeButton()}
      </div>
    </header>`;
  }

  function lead(): string {
    const c = summarize(plants, today);
    const wateredThisMonth = countCareSince(plants, 'water', startOfMonth(today));
    let headline: string;
    if (c.total === 0) {
      headline = '鉢を登録すると、<br />今日の世話がここにまとまります。';
    } else if (c.thirsty > 0) {
      headline = `今日は <em class="count" data-count="${c.thirsty}">${c.thirsty}</em> 鉢に水を。`;
    } else {
      headline = '今日あげる鉢は<br />ありません。';
    }
    const cta =
      c.thirsty > 0
        ? `<div class="lead-cta">
            <button type="button" class="solid-button" id="water-all">${icons.drop}<span>${c.thirsty}鉢にまとめて水やり</span></button>
            <span class="lead-cta-hint">記録後も鉢ごとに取り消せます</span>
          </div>`
        : '';
    const sub =
      c.total === 0
        ? ''
        : `<p class="lead-sub">
            <span>もうすぐ <b class="num">${c.soon}</b></span>
            <span>植え替え <b class="num">${c.repot}</b></span>
            <span>今月の水やり <b class="num">${wateredThisMonth}</b></span>
            <span>登録 <b class="num">${c.total}</b> 鉢</span>
          </p>`;
    return `<section class="lead">
      <div class="wrap lead-inner">
        <div class="lead-copy">
          <p class="lead-date">${esc(formatDateJa(today))}</p>
          <h1 class="lead-headline">${headline}</h1>
          ${cta}
          ${sub}
        </div>
        <figure class="lead-figure">
          <img src="https://images.unsplash.com/photo-1545241047-6083a3684587?w=1100&h=1320&fit=crop&crop=entropy&q=80"
            width="1100" height="1320" alt="窓辺に並ぶ観葉植物" loading="eager" />
        </figure>
      </div>
    </section>`;
  }

  function toolbar(): string {
    if (plants.length === 0) {
      return `<div class="toolbar"><div class="wrap toolbar-inner toolbar-empty">
        <button type="button" class="solid-button" id="open-add">${icons.plus}<span>最初の鉢を登録</span></button>
      </div></div>`;
    }
    const seg = (Object.keys(FILTER_LABELS) as FilterKey[])
      .map(
        (k) =>
          `<button type="button" class="seg${k === filter ? ' is-on' : ''}" data-filter="${k}"
            aria-pressed="${k === filter}">${esc(FILTER_LABELS[k])}</button>`,
      )
      .join('');
    const sortOpts = (Object.keys(SORT_LABELS) as SortKey[])
      .map(
        (k) =>
          `<option value="${k}"${k === sort ? ' selected' : ''}>${esc(SORT_LABELS[k])}</option>`,
      )
      .join('');
    const clearBtn =
      query !== ''
        ? `<button type="button" class="search-clear" id="search-clear" aria-label="検索を消す">${icons.close}</button>`
        : '';
    return `<div class="toolbar">
      <div class="wrap toolbar-inner">
        <div class="toolbar-lead">
          <div class="search${query !== '' ? ' is-active' : ''}">
            ${icons.search}
            <input type="search" id="search" placeholder="名前・場所・メモで探す"
              value="${esc(query)}" aria-label="鉢を探す" autocomplete="off" enterkeyhint="search" />
            ${clearBtn}
          </div>
          <div class="segmented" role="group" aria-label="絞り込み">${seg}</div>
        </div>
        <div class="toolbar-right">
          <label class="field-inline">${icons.sliders}<span class="sr-only">並べ替え</span>
            <select id="sort-select" aria-label="並べ替え">${sortOpts}</select></label>
          <div class="menu-anchor">
            <button type="button" class="ghost-button" id="backup-toggle"
              aria-haspopup="true" aria-expanded="${menuOpen}" aria-label="バックアップ">
              ${icons.download}<span>バックアップ</span></button>
            ${menuOpen ? backupMenu() : ''}
          </div>
          <button type="button" class="solid-button" id="open-add">${icons.plus}<span>鉢を追加</span></button>
        </div>
      </div>
    </div>`;
  }

  function backupMenu(): string {
    return `<div class="menu" role="menu">
      <button type="button" class="menu-item" id="do-export" role="menuitem">${icons.download}<span>書き出す（JSON）</span></button>
      <button type="button" class="menu-item" id="do-import" role="menuitem">${icons.upload}<span>読み込む（JSON）</span></button>
      <input type="file" id="import-file" accept="application/json,.json" hidden />
    </div>`;
  }

  function historyList(plant: Plant): string {
    const rows = plant.history
      .slice(0, 8)
      .map((e) => {
        const label = e.kind === 'water' ? '水やり' : '植え替え';
        return `<li><span class="log-kind log-${e.kind}">${esc(label)}</span><time>${esc(formatDateJa(e.date))}</time></li>`;
      })
      .join('');
    return rows === ''
      ? '<p class="muted small">まだ記録がありません。</p>'
      : `<ol class="log">${rows}</ol>`;
  }

  function detail(plant: Plant): string {
    const undoWater = canUndo(plant, 'water')
      ? `<button type="button" class="text-button" data-undo="water" data-id="${plant.id}">${icons.undo}<span>水やりを取り消す</span></button>`
      : '';
    const undoRepot = canUndo(plant, 'repot')
      ? `<button type="button" class="text-button" data-undo="repot" data-id="${plant.id}">${icons.undo}<span>植え替えを取り消す</span></button>`
      : '';
    return `<div class="detail" id="detail-${plant.id}">
      <div class="detail-grid">
        <label class="lbl">名前<input data-field="name" value="${esc(plant.name)}" /></label>
        <label class="lbl">品種<input data-field="species" value="${esc(plant.species)}" placeholder="パキラ・グラブラ" /></label>
        <label class="lbl">置き場所<input data-field="spot" value="${esc(plant.spot)}" placeholder="リビング窓際" /></label>
        <label class="lbl">日当たり${lightSelect('light', plant.light)}</label>
        <label class="lbl">前回の水やり<input type="date" data-field="wateredAt" value="${esc(plant.wateredAt)}" /></label>
        <label class="lbl">水やりの間隔<span class="suffixed"><input type="number" min="1" max="${MAX_WATER_DAYS}" data-field="waterEvery" value="${plant.waterEvery}" />日</span></label>
        <label class="lbl">前回の植え替え<input type="date" data-field="repottedAt" value="${esc(plant.repottedAt)}" /></label>
        <label class="lbl">植え替えの間隔<span class="suffixed"><input type="number" min="1" max="${MAX_REPOT_MONTHS}" data-field="repotEveryMonths" value="${plant.repotEveryMonths}" />か月</span></label>
        <label class="lbl span-2">写真URL（空なら自動）<input data-field="photo" value="${esc(plant.photo)}" placeholder="https://…" inputmode="url" /></label>
        <label class="lbl span-2">メモ<textarea data-field="notes" rows="2" placeholder="水のやり方や葉の様子など">${esc(plant.notes)}</textarea></label>
      </div>
      <div class="detail-foot">
        <div class="detail-history">
          <p class="kicker-sm">世話の記録</p>
          ${historyList(plant)}
          <div class="undo-row">${undoWater}${undoRepot}</div>
        </div>
        <button type="button" class="danger-button" data-del="${plant.id}">${icons.trash}<span>この鉢を削除</span></button>
      </div>
    </div>`;
  }

  function entry(plant: Plant, index: number): string {
    const status = waterStatus(plant, today);
    const tone = STATUS_TONE[status];
    const wDays = daysUntilWater(plant, today) ?? 0;
    const rDue = needsRepot(plant, today);
    const rDays = daysUntilRepot(plant, today);
    const kicker = [plant.species, plant.spot, LIGHT_LABELS[plant.light]]
      .filter((s) => s !== '')
      .map(esc)
      .join(' ・ ');
    const open = expandedId === plant.id;
    return `<li class="entry${open ? ' is-open' : ''}" data-id="${plant.id}" style="--i:${index}">
      <figure class="entry-photo">
        <img src="${esc(plantPhoto(plant, 320))}" width="320" height="320" alt="" loading="lazy" />
      </figure>
      <div class="entry-main">
        <div class="entry-head">
          <p class="entry-kicker">${kicker || '&nbsp;'}</p>
          <h2 class="entry-name">${esc(plant.name)}</h2>
        </div>
        <div class="schedule">
          <div class="sched sched-water">
            ${progressRing(waterProgress(plant, today), tone)}
            <div class="sched-text">
              <span class="sched-label">次の水やり</span>
              <span class="sched-when">${esc(formatDateJa(nextWatering(plant)))}
                <span class="rel tone-${tone}">${esc(relativeDays(wDays))}</span></span>
            </div>
            <button type="button" class="act-button" data-water="${plant.id}">${icons.drop}<span>水やり</span></button>
          </div>
          <div class="sched sched-repot${rDue ? ' is-due' : ''}">
            <span class="sched-icon">${icons.pot}</span>
            <div class="sched-text">
              <span class="sched-label">植え替え</span>
              <span class="sched-when">${esc(formatDateJa(nextRepotting(plant)))}ごろ
                ${rDue ? '<span class="rel tone-warn">時期です</span>' : `<span class="rel muted">${esc(relativeDays(rDays ?? 0))}</span>`}</span>
            </div>
            <button type="button" class="act-button quiet" data-repot="${plant.id}">${icons.pot}<span>植え替え</span></button>
          </div>
        </div>
        <button type="button" class="disclosure" data-toggle="${plant.id}" aria-expanded="${open}"
          aria-controls="detail-${plant.id}">
          <span>${open ? '閉じる' : '詳細と記録'}</span>${icons.chevron}</button>
        ${open ? detail(plant) : ''}
      </div>
    </li>`;
  }

  function register(): string {
    if (plants.length === 0) {
      return `<main class="register"><div class="wrap">
        <div class="empty">
          <p class="empty-lead">鉢はまだありません。</p>
          <p class="muted">名前と水やりの間隔だけで始められます。あとから写真やメモ、植え替えの周期を足せます。</p>
        </div>
      </div></main>`;
    }
    const list = arrange(plants, today, sort, filter, query);
    let inner: string;
    if (list.length > 0) {
      inner = `<ol class="entries">${list.map((p, i) => entry(p, i)).join('')}</ol>`;
    } else if (query.trim() !== '') {
      inner = `<div class="empty">
        <p class="empty-lead">「${esc(query.trim())}」に合う鉢はありません。</p>
        <p class="muted">名前・品種・置き場所・メモから探せます。</p>
      </div>`;
    } else {
      inner = `<div class="empty"><p class="empty-lead">${esc(FILTER_LABELS[filter])}の鉢はありません。</p></div>`;
    }
    return `<main class="register"><div class="wrap">${inner}</div></main>`;
  }

  function addPanel(): string {
    if (!adding) return '';
    return `<div class="sheet" id="add-sheet">
      <div class="sheet-card" role="dialog" aria-modal="true" aria-labelledby="add-title">
        <div class="sheet-head">
          <h2 id="add-title">鉢を追加</h2>
          <button type="button" class="ghost-button icon-only" id="close-add" aria-label="閉じる">${icons.close}</button>
        </div>
        <form id="add-form" class="add-form">
          <label class="lbl span-2">名前<input name="name" id="add-name" required placeholder="パキラ" autocomplete="off" /></label>
          <label class="lbl">品種<input name="species" placeholder="パキラ・グラブラ" autocomplete="off" /></label>
          <label class="lbl">置き場所<input name="spot" placeholder="リビング窓際" autocomplete="off" /></label>
          <label class="lbl">日当たり${lightSelect('light', 'bright')}</label>
          <label class="lbl">水やりの間隔<span class="suffixed"><input name="waterEvery" type="number" min="1" max="${MAX_WATER_DAYS}" value="7" />日</span></label>
          <p class="hint span-2">追加した鉢は今日が起点になります。植え替えの間隔は12か月で始まるので、鉢に合わせて詳細から調整してください。</p>
          <div class="sheet-foot span-2">
            <button type="button" class="ghost-button" id="cancel-add">やめる</button>
            <button type="submit" class="solid-button">${icons.check}<span>追加する</span></button>
          </div>
        </form>
      </div>
    </div>`;
  }

  function noticeBar(): string {
    return notice === '' ? '' : `<div class="notice" role="status">${esc(notice)}</div>`;
  }

  function render(animate: boolean): void {
    // 全体を描き直すため、再描画後にフォーカスとテキストのカーソル位置を復元する。
    // これがないと検索などの逐次入力で毎打鍵ごとにカーソルが末尾へ飛ぶ。
    const active = document.activeElement;
    const activeId = active instanceof HTMLElement ? active.id : '';
    let caret: [number | null, number | null] | null = null;
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
      try {
        caret = [active.selectionStart, active.selectionEnd];
      } catch {
        caret = null; // number/date など選択非対応のinputは触らない
      }
    }
    root.innerHTML = `
      ${masthead()}
      ${lead()}
      ${toolbar()}
      ${register()}
      <footer class="site-footer"><div class="wrap">
        <p>水やりの手帳。データはこの端末のブラウザにだけ保存されます。</p>
      </div></footer>
      ${addPanel()}
      ${noticeBar()}`;
    bind();
    if (activeId !== '') {
      const next = document.getElementById(activeId);
      next?.focus();
      if (caret && (next instanceof HTMLInputElement || next instanceof HTMLTextAreaElement)) {
        try {
          next.setSelectionRange(caret[0], caret[1]);
        } catch {
          /* 選択非対応のinputは無視 */
        }
      }
    }
    deps.onRender?.(animate);
  }

  // --- 操作 ---

  function applyField(plant: Plant, field: string, raw: string): Plant {
    const v = raw.trim();
    switch (field) {
      case 'name':
        return v === '' ? plant : { ...plant, name: v };
      case 'species':
        return { ...plant, species: v };
      case 'spot':
        return { ...plant, spot: v };
      case 'photo':
        return { ...plant, photo: v };
      case 'notes':
        return { ...plant, notes: raw };
      case 'light':
        return v === 'sunny' || v === 'bright' || v === 'shade' ? { ...plant, light: v } : plant;
      case 'wateredAt':
      case 'repottedAt':
        return /^\d{4}-\d{2}-\d{2}$/.test(v) ? { ...plant, [field]: v } : plant;
      case 'waterEvery': {
        const n = Number(v);
        return Number.isInteger(n) && n >= 1 && n <= MAX_WATER_DAYS
          ? { ...plant, waterEvery: n }
          : plant;
      }
      case 'repotEveryMonths': {
        const n = Number(v);
        return Number.isInteger(n) && n >= 1 && n <= MAX_REPOT_MONTHS
          ? { ...plant, repotEveryMonths: n }
          : plant;
      }
      default:
        return plant;
    }
  }

  function flash(message: string, animate = false): void {
    notice = message;
    render(animate);
    window.setTimeout(() => {
      if (notice === message) {
        notice = '';
        render(false);
      }
    }, 2600);
  }

  function waterAll(): void {
    const result = waterDuePlants(plants, today);
    if (result.count === 0) return;
    plants = result.plants;
    persist();
    flash(`${result.count}鉢に水やりを記録しました。`, true);
  }

  function exportNow(): void {
    const json = exportBackup(plants, new Date().toISOString());
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mizuyari-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
    menuOpen = false;
    flash('バックアップを書き出しました。');
  }

  function importFrom(file: File): void {
    const reader = new FileReader();
    reader.onload = () => {
      const result = importBackup(String(reader.result ?? ''));
      if (result === null) {
        flash('読み込めませんでした。JSONを確認してください。');
        return;
      }
      plants = result;
      persist();
      menuOpen = false;
      flash(`${result.length}鉢を読み込みました。`);
    };
    reader.readAsText(file);
  }

  function bind(): void {
    root.querySelector('#theme-toggle')?.addEventListener('click', () => {
      theme.cycle();
      render(false);
    });

    for (const el of root.querySelectorAll<HTMLElement>('[data-filter]')) {
      el.addEventListener('click', () => {
        const key = el.dataset.filter;
        if (isFilterKey(key)) {
          filter = key;
          deps.saveView({ sort, filter });
          render(true);
        }
      });
    }

    root.querySelector<HTMLSelectElement>('#sort-select')?.addEventListener('change', (e) => {
      const key = (e.target as HTMLSelectElement).value;
      if (isSortKey(key)) {
        sort = key;
        deps.saveView({ sort, filter });
        render(true);
      }
    });

    root.querySelector<HTMLInputElement>('#search')?.addEventListener('input', (e) => {
      query = (e.target as HTMLInputElement).value;
      render(false);
    });
    root.querySelector('#search-clear')?.addEventListener('click', () => {
      query = '';
      render(false);
      root.querySelector<HTMLInputElement>('#search')?.focus();
    });

    root.querySelector('#water-all')?.addEventListener('click', waterAll);

    const openAdd = (): void => {
      adding = true;
      menuOpen = false;
      render(false);
      root.querySelector<HTMLInputElement>('#add-name')?.focus();
    };
    root.querySelector('#open-add')?.addEventListener('click', openAdd);
    root.querySelector('#close-add')?.addEventListener('click', closeAdd);
    root.querySelector('#cancel-add')?.addEventListener('click', closeAdd);
    root.querySelector('#add-sheet')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeAdd();
    });

    root.querySelector('#backup-toggle')?.addEventListener('click', () => {
      menuOpen = !menuOpen;
      render(false);
    });
    root.querySelector('#do-export')?.addEventListener('click', exportNow);
    root.querySelector('#do-import')?.addEventListener('click', () => {
      root.querySelector<HTMLInputElement>('#import-file')?.click();
    });
    root.querySelector<HTMLInputElement>('#import-file')?.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) importFrom(file);
    });

    for (const el of root.querySelectorAll<HTMLElement>('[data-toggle]')) {
      el.addEventListener('click', () => {
        const id = el.dataset.toggle ?? '';
        expandedId = expandedId === id ? null : id;
        render(false);
      });
    }

    for (const el of root.querySelectorAll<HTMLElement>('[data-water]')) {
      el.addEventListener('click', () => {
        const p = byId(el.dataset.water ?? '');
        if (p) replace(p.id, recordCare(p, 'water', today));
      });
    }
    for (const el of root.querySelectorAll<HTMLElement>('[data-repot]')) {
      el.addEventListener('click', () => {
        const p = byId(el.dataset.repot ?? '');
        if (p) replace(p.id, recordCare(p, 'repot', today));
      });
    }
    for (const el of root.querySelectorAll<HTMLElement>('[data-undo]')) {
      el.addEventListener('click', () => {
        const p = byId(el.dataset.id ?? '');
        const kind = el.dataset.undo;
        if (p && (kind === 'water' || kind === 'repot')) replace(p.id, undoLastCare(p, kind));
      });
    }
    for (const el of root.querySelectorAll<HTMLElement>('[data-del]')) {
      el.addEventListener('click', () => {
        plants = plants.filter((p) => p.id !== el.dataset.del);
        expandedId = null;
        persist();
        render(true);
      });
    }

    // 詳細欄の各フィールド(確定時に反映)
    for (const el of root.querySelectorAll<HTMLElement>('.detail [data-field]')) {
      el.addEventListener('change', () => {
        const entryEl = el.closest<HTMLElement>('.entry');
        const id = entryEl?.dataset.id ?? '';
        const p = byId(id);
        const field = (el as HTMLInputElement).dataset.field ?? '';
        if (p) replace(id, applyField(p, field, (el as HTMLInputElement).value));
      });
    }

    root.querySelector<HTMLFormElement>('#add-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget as HTMLFormElement);
      const read = (k: string): string => String(fd.get(k) ?? '').trim();
      const name = read('name');
      if (name === '') return;
      const every = Number(read('waterEvery') || '7');
      const light = read('light');
      plants.push({
        id: newPlantId(),
        name,
        species: read('species'),
        spot: read('spot'),
        light: light === 'sunny' || light === 'shade' ? light : 'bright',
        notes: '',
        photo: '',
        waterEvery: Number.isInteger(every) && every >= 1 && every <= MAX_WATER_DAYS ? every : 7,
        wateredAt: today,
        repotEveryMonths: 12,
        repottedAt: today,
        history: [
          { kind: 'water', date: today },
          { kind: 'repot', date: today },
        ],
      });
      adding = false;
      persist();
      render(true);
    });
  }

  function closeAdd(): void {
    adding = false;
    render(false);
  }

  // 画面全体のキー操作(1度だけ登録)
  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented) return;
    const target = e.target as HTMLElement | null;
    const tag = target?.tagName;
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    if (e.key === 'Escape') {
      if (target?.id === 'search' && query !== '') {
        query = '';
        render(false);
        root.querySelector<HTMLInputElement>('#search')?.focus();
      } else if (adding) {
        closeAdd();
      } else if (menuOpen) {
        menuOpen = false;
        render(false);
      } else if (expandedId !== null) {
        expandedId = null;
        render(false);
      }
      return;
    }
    if (typing) return;
    if ((e.key === 'a' || e.key === 'n') && !adding) {
      e.preventDefault();
      adding = true;
      menuOpen = false;
      render(false);
      root.querySelector<HTMLInputElement>('#add-name')?.focus();
    } else if (e.key === '/' && plants.length > 0 && !adding) {
      e.preventDefault();
      root.querySelector<HTMLInputElement>('#search')?.focus();
    } else if (e.key === 'w' && !adding) {
      e.preventDefault();
      waterAll();
    }
  });

  // メニュー外のクリックで閉じる
  document.addEventListener('click', (e) => {
    if (!menuOpen) return;
    const anchor = root.querySelector('.menu-anchor');
    if (anchor && !anchor.contains(e.target as Node)) {
      menuOpen = false;
      render(false);
    }
  });

  render(true);
}
