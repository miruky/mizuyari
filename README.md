# mizuyari

[![CI](https://github.com/miruky/mizuyari/actions/workflows/ci.yml/badge.svg)](https://github.com/miruky/mizuyari/actions/workflows/ci.yml)
[![Deploy](https://github.com/miruky/mizuyari/actions/workflows/deploy.yml/badge.svg)](https://github.com/miruky/mizuyari/actions/workflows/deploy.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**観葉植物の水やりと植え替えを鉢ごとの周期で管理し、今日やるべき世話が一目で分かるアプリ。**

公開ページ: https://miruky.github.io/mizuyari/

## 概要

mizuyariは家の鉢植えの世話を記録する手帳である。鉢ごとに水やりの間隔(日)と植え替えの間隔(月)を決めておくと、前回の世話の日から次の予定日が計算され、鉢のカードが「次の水やりが近い順」に並ぶ。やるべき世話が来た鉢は色つきのバッジで示され、「水やりした」を押すだけで記録が今日に更新される。

データはブラウザのlocalStorageに保存され、サーバーには何も送らない。

### なぜ作ったのか

水やりの失敗は「忘れる」よりも「むしろやりすぎる」ことが多く、どちらの原因も「前回いつやったか覚えていない」ことにある。汎用のリマインダーは完了で消えてしまい、サンスベリアは3週間・ポトスは5日のような鉢ごとの周期や、年単位の植え替えまでは追いづらい。鉢の一覧そのものが世話の予定表になっている形にしたかった。

## アーキテクチャ

![構成図](docs/architecture.svg)

UI層はフレームワークなしのTypeScriptで、鉢のカード一覧を状態が変わるたびに描き直す。予定日の計算と状態判定は「今日」を引数に取る純粋なモジュールで、DOMに依存せずそのまま単体テストできる。

## 技術スタック

| カテゴリ             | 技術                           |
| :------------------- | :----------------------------- |
| 言語                 | TypeScript 5(strict)           |
| ビルド               | Vite 6                         |
| テスト               | Vitest                         |
| リンタ・フォーマッタ | ESLint 9 / Prettier            |
| CI / 配信            | GitHub Actions / GitHub Pages  |
| 永続化               | localStorage(外部サービスなし) |

## 使い方

### 水やりの状態

次の水やり日(前回+間隔)と今日の差で、鉢のカードに状態が付く。

| 状態       | 条件              |
| :--------- | :---------------- |
| 遅れている | 予定日を過ぎた    |
| 今日       | 予定日が今日      |
| もうすぐ   | 予定日まで2日以内 |
| 予定どおり | 予定日まで3日以上 |

「水やりした」を押すと前回の日付が今日になり、次の予定が間隔ぶん先に進む。日付や間隔は鉢のカードの上で直接編集できるので、「昨日あげたのに記録し忘れた」も前回の日付を直すだけでよい。

### 植え替え

植え替えは月単位の周期で管理する(目安として12〜24か月)。予定はあくまで「ごろ」であり、時期が来るとカードに表示される。月末の繰り上がり(1月31日の3か月後は4月30日)も正しく計算する。

### 制約

- 通知は送らない。状態は画面を開いたときに見える形で示すだけにしている。
- 間隔は鉢ごとに一定で、季節による調整(夏は短く・冬は長く)は手で間隔を変えて運用する。
- データは端末のブラウザに保存されるため、端末をまたいだ同期はできない。

## プロジェクト構成

- `index.html` — エントリポイント
- `src/main.ts` — 起動。ストアの初期化と初回の見本データ投入
- `src/app.ts` — 鉢カード一覧の描画とイベント処理
- `src/icons.ts` — 線画SVGアイコン
- `src/style.css` — デザイントークンとスタイル(ライト・ダーク対応)
- `src/lib/plant.ts` — 鉢の型・検証・永続化
- `src/lib/schedule.ts` — 予定日の計算と状態判定(日付計算込み)
- `src/lib/seed.ts` — 初回起動時の見本データ
- `docs/architecture.svg` — 構成図
- `.github/workflows/` — CI(lint・テスト・ビルド)とPagesデプロイ

## はじめ方

### 前提条件

- Node.js 22以上

### セットアップ

```bash
git clone https://github.com/miruky/mizuyari.git
cd mizuyari
npm install
npm run dev
```

### テストの実行

```bash
npm test
```

### Lintの実行

```bash
npm run lint
```

### ビルド

```bash
npm run build
```

GitHub Pagesではリポジトリ名のサブパスで配信されるため、デプロイ時は環境変数 `MIZUYARI_BASE=/mizuyari/` でViteの `base` を切り替える(`.github/workflows/deploy.yml` 参照)。

## 設計方針

- **一覧が予定表を兼ねる** — 鉢は常に次の水やりが近い順に並び、上から順に世話をすればよい。専用の予定画面を作らず、台帳そのものに緊急度を織り込んだ。
- **記録は1タップ、訂正は1操作** — 日々の操作は「水やりした」を押すだけにし、記録漏れの訂正は前回の日付を直すだけで済むようにした。記録の正確さより継続のしやすさを取っている。
- **「今日」を引数に取る純粋関数** — 予定日の計算と状態判定は現在時刻を内部で参照せず引数で受け取る。月末の丸めや状態の境界(当日・2日前)をテストで固定できる。
- **入力は寛容に、保存は厳密に** — 保存データの復元は型ガードで検証し、壊れた要素だけを読み飛ばす。間隔の入力は範囲外を黙って捨てて直前の値を保つ。

## ライセンス

[MIT](LICENSE)
