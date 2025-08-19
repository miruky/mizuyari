import { describe, expect, it } from 'vitest';
import { heroPhoto, plantPhoto } from './photo';

describe('plantPhoto', () => {
  it('写真URLが設定されていればそれを使う', () => {
    expect(plantPhoto({ id: 'a', photo: ' https://example.com/p.jpg ' }, 400)).toBe(
      'https://example.com/p.jpg',
    );
  });

  it('未設定なら同じidに毎回同じ写真を割り当て、寸法を含む', () => {
    const a1 = plantPhoto({ id: 'seed-pachira', photo: '' }, 400);
    const a2 = plantPhoto({ id: 'seed-pachira', photo: '' }, 400);
    expect(a1).toBe(a2);
    expect(a1).toContain('images.unsplash.com');
    expect(a1).toContain('w=400');
    expect(a1).toContain('h=400');
  });

  it('idが違えば別の写真になりうる', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'];
    const urls = new Set(ids.map((id) => plantPhoto({ id, photo: '' }, 200)));
    expect(urls.size).toBeGreaterThan(1);
  });
});

describe('heroPhoto', () => {
  it('指定した寸法の横長写真URLを返す', () => {
    const url = heroPhoto(1600, 900);
    expect(url).toContain('w=1600');
    expect(url).toContain('h=900');
  });
});
