// UIで使う線画アイコン。24pxグリッド・stroke=currentColorで統一し、
// 隣に必ずテキストラベルを置く前提ですべて装飾(aria-hidden)とする。

const svg = (body: string): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ` +
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
  undo: svg('<path d="M9 7 4.5 11.5 9 16"/><path d="M4.5 11.5H14a5.5 5.5 0 0 1 0 11h-3"/>'),
  sun: svg(
    '<circle cx="12" cy="12" r="4"/>' +
      '<path d="M12 2.5v2.5M12 19v2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12H5M19 12h2.5M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8"/>',
  ),
  moon: svg('<path d="M20 14.5A8 8 0 0 1 9.5 4 7.5 7.5 0 1 0 20 14.5z"/>'),
  monitor: svg(
    '<rect x="3" y="4.5" width="18" height="12" rx="2"/><path d="M8.5 20.5h7M12 16.5v4"/>',
  ),
  leaf: svg(
    '<path d="M4 19c0-8 6-13 16-13 0 10-5 15-13 15a6 6 0 0 1-3-2z"/><path d="M8.5 15.5C11 12 14 10 18 8.5"/>',
  ),
  clock: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  download: svg('<path d="M12 4v11"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M5 19.5h14"/>'),
  upload: svg('<path d="M12 20V9"/><path d="m7.5 13.5 4.5-4.5 4.5 4.5"/><path d="M5 4.5h14"/>'),
  sliders: svg(
    '<path d="M5 7h9M18 7h1"/><path d="M5 12h2M11 12h8"/><path d="M5 17h11M19 17h0.5"/>' +
      '<circle cx="16" cy="7" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="18" cy="17" r="2"/>',
  ),
  close: svg('<path d="M6 6 18 18"/><path d="M18 6 6 18"/>'),
  chevron: svg('<path d="m8 10 4 4 4-4"/>'),
  search: svg('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>'),
} as const;
