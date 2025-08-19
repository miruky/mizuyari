import { describe, expect, it } from 'vitest';
import { isThemePref, nextTheme, resolveTheme } from './theme';

describe('isThemePref', () => {
  it('既知の値だけ受け付ける', () => {
    expect(isThemePref('system')).toBe(true);
    expect(isThemePref('light')).toBe(true);
    expect(isThemePref('dark')).toBe(true);
    expect(isThemePref('sepia')).toBe(false);
    expect(isThemePref(null)).toBe(false);
  });
});

describe('nextTheme', () => {
  it('端末→ライト→ダーク→端末と巡回する', () => {
    expect(nextTheme('system')).toBe('light');
    expect(nextTheme('light')).toBe('dark');
    expect(nextTheme('dark')).toBe('system');
  });
});

describe('resolveTheme', () => {
  it('systemはOS設定に従い、明示指定はそのまま', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });
});
