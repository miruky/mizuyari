// 画面の描画。1画面構成で、状態が変わるたびに全体を描き直す。
// テキスト入力はchangeイベント(確定時)で反映するので、再描画で入力が途切れない。
// 鉢は常に「次の水やりが近い順」で保持し、表示の並びと配列の添字を一致させる。

import {
  MAX_REPOT_MONTHS,
  MAX_WATER_DAYS,
  newPlantId,
  type Plant,
  type PlantStore,
} from './lib/plant';
import {
  formatDateJa,
  needsRepot,
  needsWater,
  nextRepotting,
  nextWatering,
  sortByNextWatering,
  WATER_STATUS_LABELS,
  waterStatus,
} from './lib/schedule';
import { icons } from './icons';

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

export interface AppDeps {
  root: HTMLElement;
  store: PlantStore;
  initialPlants: Plant[];
  today: string;
}

export function createApp({ root, store, initialPlants, today }: AppDeps): void {
  let plants = sortByNextWatering(initialPlants);

  function commit(): void {
    plants = sortByNextWatering(plants);
    store.save(plants);
    render();
  }

  function header(): string {
    const thirsty = plants.filter((p) => needsWater(p, today)).length;
    const repot = plants.filter((p) => needsRepot(p, today)).length;
    const badges = [
      thirsty > 0 ? `<span class="attention-badge">水やり ${thirsty}鉢</span>` : '',
      repot > 0 ? `<span class="repot-badge">植え替え ${repot}鉢</span>` : '',
    ]
      .filter((b) => b !== '')
      .join('');
    return `
      <header class="site-header">
        <div class="site-header-inner">
          <span class="brand">${icons.logo}<span>mizuyari</span></span>
          <div class="badges">${badges || '<span class="attention-none">今日の世話はありません</span>'}</div>
        </div>
      </header>`;
  }

  function plantCard(plant: Plant, index: number): string {
    const status = waterStatus(plant, today);
    const repotDue = needsRepot(plant, today);
    return `
      <li class="card status-${status}" style="--i:${index}">
        <div class="card-head">
          <input class="plant-name" id="p-${index}-name" data-plant="${index}:name"
            value="${esc(plant.name)}" aria-label="名前" />
          <button type="button" class="icon-button" id="p-${index}-del" data-del="${index}"
            aria-label="${esc(plant.name)}を削除">${icons.trash}</button>
        </div>
        <div class="card-meta">
          <input id="p-${index}-species" data-plant="${index}:species" value="${esc(plant.species)}"
            placeholder="品種" aria-label="品種" />
          <input id="p-${index}-spot" data-plant="${index}:spot" value="${esc(plant.spot)}"
            placeholder="置き場所" aria-label="置き場所" />
        </div>
        <div class="care water">
          <div class="care-row">
            <span class="care-icon">${icons.drop}</span>
            <span class="care-next">次は <strong>${formatDateJa(nextWatering(plant))}</strong></span>
            <span class="status-badge">${WATER_STATUS_LABELS[status]}</span>
          </div>
          <div class="care-detail">
            <label>前回
              <input type="date" id="p-${index}-wateredAt" data-plant="${index}:wateredAt"
                value="${esc(plant.wateredAt)}" aria-label="前回の水やり日" /></label>
            <label>間隔
              <input type="number" id="p-${index}-waterEvery" data-plant="${index}:waterEvery"
                min="1" max="${MAX_WATER_DAYS}" value="${plant.waterEvery}" aria-label="水やりの間隔(日)" />日ごと</label>
            <button type="button" class="button primary small" id="p-${index}-water" data-water="${index}">
              ${icons.drop}<span>水やりした</span></button>
          </div>
        </div>
        <div class="care repot ${repotDue ? 'repot-due' : ''}">
          <div class="care-row">
            <span class="care-icon">${icons.pot}</span>
            <span class="care-next">植え替えは <strong>${formatDateJa(nextRepotting(plant))}</strong>ごろ</span>
            ${repotDue ? '<span class="status-badge">時期が来ています</span>' : ''}
          </div>
          <div class="care-detail">
            <label>前回
              <input type="date" id="p-${index}-repottedAt" data-plant="${index}:repottedAt"
                value="${esc(plant.repottedAt)}" aria-label="前回の植え替え日" /></label>
            <label>間隔
              <input type="number" id="p-${index}-repotEveryMonths" data-plant="${index}:repotEveryMonths"
                min="1" max="${MAX_REPOT_MONTHS}" value="${plant.repotEveryMonths}" aria-label="植え替えの間隔(月)" />か月ごと</label>
            <button type="button" class="button small" id="p-${index}-repot" data-repot="${index}">
              ${icons.pot}<span>植え替えした</span></button>
          </div>
        </div>
      </li>`;
  }

  function bindEvents(): void {
    for (const el of root.querySelectorAll<HTMLInputElement>('[data-plant]')) {
      el.addEventListener('change', () => {
        const [idxRaw, field] = (el.dataset.plant ?? '').split(':');
        const plant = plants[Number(idxRaw)];
        if (!plant) return;
        if (field === 'name') {
          if (el.value.trim() !== '') plant.name = el.value.trim();
        } else if (field === 'species') {
          plant.species = el.value.trim();
        } else if (field === 'spot') {
          plant.spot = el.value.trim();
        } else if (field === 'wateredAt' || field === 'repottedAt') {
          if (/^\d{4}-\d{2}-\d{2}$/.test(el.value)) plant[field] = el.value;
        } else if (field === 'waterEvery') {
          const v = Number(el.value);
          if (Number.isInteger(v) && v >= 1 && v <= MAX_WATER_DAYS) plant.waterEvery = v;
        } else if (field === 'repotEveryMonths') {
          const v = Number(el.value);
          if (Number.isInteger(v) && v >= 1 && v <= MAX_REPOT_MONTHS) plant.repotEveryMonths = v;
        }
        commit();
      });
    }

    for (const el of root.querySelectorAll<HTMLElement>('[data-water]')) {
      el.addEventListener('click', () => {
        const plant = plants[Number(el.dataset.water)];
        if (!plant) return;
        plant.wateredAt = today;
        commit();
      });
    }
    for (const el of root.querySelectorAll<HTMLElement>('[data-repot]')) {
      el.addEventListener('click', () => {
        const plant = plants[Number(el.dataset.repot)];
        if (!plant) return;
        plant.repottedAt = today;
        commit();
      });
    }
    for (const el of root.querySelectorAll<HTMLElement>('[data-del]')) {
      el.addEventListener('click', () => {
        plants.splice(Number(el.dataset.del), 1);
        commit();
      });
    }

    root.querySelector<HTMLFormElement>('#add-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget as HTMLFormElement);
      const read = (key: string): string => String(fd.get(key) ?? '').trim();
      const name = read('name');
      if (name === '') return;
      const waterEvery = Number(read('waterEvery') || '7');
      plants.push({
        id: newPlantId(),
        name,
        species: read('species'),
        spot: read('spot'),
        waterEvery:
          Number.isInteger(waterEvery) && waterEvery >= 1 && waterEvery <= MAX_WATER_DAYS
            ? waterEvery
            : 7,
        wateredAt: today,
        repotEveryMonths: 12,
        repottedAt: today,
      });
      commit();
      root.querySelector<HTMLInputElement>('#add-name')?.focus();
    });
  }

  function render(): void {
    const activeId = document.activeElement instanceof HTMLElement ? document.activeElement.id : '';
    const cards = plants.map((p, i) => plantCard(p, i)).join('');
    root.innerHTML = `
      ${header()}
      <main class="site-main">
        <section class="view">
          ${
            plants.length === 0
              ? '<p class="empty">鉢がまだありません。下のフォームから追加してください。</p>'
              : `<ul class="cards">${cards}</ul>`
          }
          <section class="panel">
            <h2>鉢を追加</h2>
            <form class="add-form" id="add-form">
              <input name="name" id="add-name" placeholder="名前(例: パキラ)" required aria-label="名前" />
              <input name="species" id="add-species" placeholder="品種" aria-label="品種" />
              <input name="spot" id="add-spot" placeholder="置き場所" aria-label="置き場所" />
              <label class="interval-field">間隔
                <input name="waterEvery" id="add-waterEvery" type="number" min="1" max="${MAX_WATER_DAYS}"
                  value="7" aria-label="水やりの間隔(日)" />日ごと</label>
              <button type="submit" class="icon-button accent" id="add-submit" aria-label="鉢を追加">${icons.plus}</button>
            </form>
            <p class="hint">追加した鉢は今日水やり・植え替えしたものとして始まります。植え替えの間隔は12か月で始まるので、鉢に合わせて調整してください。</p>
          </section>
        </section>
      </main>
      <footer class="site-footer">
        <p>mizuyari — 水やりの手帳。データはこの端末のブラウザにだけ保存されます。</p>
      </footer>`;
    bindEvents();
    if (activeId !== '') document.getElementById(activeId)?.focus();
  }

  render();
}
