import './style.css';
import { createApp } from './app';
import { createStore } from './lib/plant';
import { seedPlants } from './lib/seed';
import { todayISO } from './lib/schedule';

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

createApp({ root, store, initialPlants: plants, today: todayISO(now) });
