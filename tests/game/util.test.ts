import { describe, expect, it } from 'vitest';
import { clamp, djb2, petVariant } from '@/game/util';

describe('clamp', () => {
  it('passes through in-range values', () => {
    expect(clamp(50, 0, 100)).toBe(50);
  });
  it('clamps below min', () => {
    expect(clamp(-1, 0, 100)).toBe(0);
  });
  it('clamps above max', () => {
    expect(clamp(150, 0, 100)).toBe(100);
  });
});

describe('djb2', () => {
  it('returns a deterministic unsigned integer for the same input', () => {
    expect(djb2('Pixel')).toBe(djb2('Pixel'));
    expect(djb2('Pixel')).toBeGreaterThanOrEqual(0);
  });

  it('returns different hashes for different inputs (sanity check)', () => {
    expect(djb2('Pixel')).not.toBe(djb2('Blob'));
  });

  it('handles the empty string', () => {
    expect(djb2('')).toBe(5381);
  });
});

describe('petVariant', () => {
  it('returns a value in {0, 1, 2}', () => {
    for (const name of ['Pixel', 'Blob', 'Luna', 'Zap', 'x', 'a', 'bb']) {
      const v = petVariant(name);
      expect([0, 1, 2]).toContain(v);
    }
  });

  it('is deterministic across 50 calls with the same name', () => {
    const first = petVariant('Blob');
    for (let i = 0; i < 50; i++) {
      expect(petVariant('Blob')).toBe(first);
    }
  });

  it('distributes three distinct names across at least two variants', () => {
    const results = new Set([petVariant('alpha'), petVariant('beta'), petVariant('gamma')]);
    expect(results.size).toBeGreaterThanOrEqual(2);
  });

  it('handles the empty string without throwing', () => {
    expect([0, 1, 2]).toContain(petVariant(''));
  });
});
