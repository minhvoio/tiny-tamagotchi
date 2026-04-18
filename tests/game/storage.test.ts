import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as storage from '@/game/storage';
import { initialState, type PetModel } from '@/game/state';

const KEY = 'tiny-tamagotchi:v1';

function sampleState(): PetModel {
  return {
    ...initialState,
    name: 'Pixel',
    vitals: { hunger: 80, happiness: 60, energy: 70 },
    lastTickAt: 12345,
  };
}

describe('storage adapter', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('write then read round-trip returns the same state', () => {
    const s = sampleState();
    storage.write(s);
    const out = storage.read();
    expect(out).toEqual(s);
  });

  it('write puts a JSON string with version=1 at tiny-tamagotchi:v1', () => {
    storage.write(sampleState());
    const raw = window.localStorage.getItem(KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed.version).toBe(1);
    expect(parsed.name).toBe('Pixel');
  });

  it('clear removes the key', () => {
    storage.write(sampleState());
    storage.clear();
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it('read returns null on corrupt JSON and does not throw', () => {
    window.localStorage.setItem(KEY, '{bad json');
    expect(() => storage.read()).not.toThrow();
    expect(storage.read()).toBeNull();
  });

  it('read returns null on version mismatch', () => {
    window.localStorage.setItem(KEY, JSON.stringify({ version: 99, name: 'x' }));
    expect(storage.read()).toBeNull();
  });

  it('read returns null when nothing is stored', () => {
    expect(storage.read()).toBeNull();
  });

  it('isAvailable returns true in jsdom', () => {
    expect(storage.isAvailable()).toBe(true);
  });
});
