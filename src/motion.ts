// 入場とスクロール連動の演出。GSAP/ScrollTrigger をバニラで使う。
// 画面は状態変化のたびに作り直すので、スクロール連動は毎回古いトリガを捨てて
// 現在のノードに張り直す。prefers-reduced-motion では一切動かさず、内容は常に
// 見える状態を保つ(CSSで初期非表示にはせず、GSAP側で必要なときだけ隠してから出す)。

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const EASE = 'power2.out';

function prefersReduced(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** 表紙の入場。日付・見出し・補足・写真を順に立ち上げる(初回のみ) */
export function leadEntrance(root: HTMLElement): void {
  if (prefersReduced()) return;
  const targets = root.querySelectorAll('.lead-date, .lead-headline, .lead-sub, .lead-figure');
  if (targets.length === 0) return;
  gsap.from(targets, {
    opacity: 0,
    y: 16,
    duration: 0.7,
    ease: EASE,
    stagger: 0.08,
    clearProps: 'transform',
  });
}

/** スクロール連動を張り直す。revealListのときは一覧の行を順に立ち上げる */
export function setupScroll(root: HTMLElement, revealList: boolean): void {
  ScrollTrigger.getAll().forEach((t) => t.kill());
  const entries = root.querySelectorAll<HTMLElement>('.entry');
  if (prefersReduced()) {
    gsap.set(entries, { clearProps: 'all' });
    return;
  }
  const fig = root.querySelector<HTMLElement>('.lead-figure img');
  if (fig) {
    gsap.to(fig, {
      yPercent: -8,
      ease: 'none',
      scrollTrigger: { trigger: '.lead', start: 'top top', end: 'bottom top', scrub: true },
    });
  }
  if (revealList && entries.length > 0) {
    ScrollTrigger.batch(entries, {
      start: 'top 92%',
      onEnter: (batch) =>
        gsap.fromTo(
          batch,
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: 0.55, ease: EASE, stagger: 0.07, overwrite: true },
        ),
    });
    gsap.set(entries, { opacity: 0, y: 18 });
  }
  ScrollTrigger.refresh();
}

/** 数値を0から目標へ数える(初回のみ) */
export function countUp(el: HTMLElement, value: number): void {
  if (prefersReduced()) {
    el.textContent = String(value);
    return;
  }
  const obj = { n: 0 };
  gsap.to(obj, {
    n: value,
    duration: 0.9,
    ease: EASE,
    onUpdate: () => {
      el.textContent = String(Math.round(obj.n));
    },
  });
}
