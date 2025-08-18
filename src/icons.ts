// UIで使う線画アイコン。24pxグリッド・stroke=currentColorで統一し、
// 隣に必ずテキストラベルを置く前提ですべて装飾(aria-hidden)とする。

const svg = (body: string): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ` +
  `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;

export const icons = {
  logo: svg(
    '<path d="M7.5 14.5h9l-1 6.5h-7z"/>' +
      '<path d="M12 14.5V9.5"/>' +
      '<path d="M12 9.5C12 6 9.5 4 6.5 4c0 3.5 2.5 5.5 5.5 5.5z"/>' +
      '<path d="M12 9.5C12 6 14.5 4 17.5 4c0 3.5-2.5 5.5-5.5 5.5z"/>',
  ),
  drop: svg('<path d="M12 3.5c-3 3.8-4.5 6.2-4.5 8.5a4.5 4.5 0 0 0 9 0c0-2.3-1.5-4.7-4.5-8.5z"/>'),
  pot: svg('<path d="M5 8.5h14l-1 4.5a6 6 0 0 1-12 0z"/><path d="M8 4.5c1.5 1.5 6.5 1.5 8 0"/>'),
  plus: svg('<path d="M12 5v14"/><path d="M5 12h14"/>'),
  trash: svg(
    '<path d="M4 7h16"/>' +
      '<path d="M9.5 7V5A1.5 1.5 0 0 1 11 3.5h2A1.5 1.5 0 0 1 14.5 5v2"/>' +
      '<path d="m6.5 7 .7 11.2a2 2 0 0 0 2 1.8h5.6a2 2 0 0 0 2-1.8L17.5 7"/>' +
      '<path d="M10 11v5.5"/><path d="M14 11v5.5"/>',
  ),
  check: svg('<path d="m5 13 4.5 4.5L19 7"/>'),
} as const;
