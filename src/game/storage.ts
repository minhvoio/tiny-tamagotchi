import type { PetModel } from '@/game/state';

const STORAGE_KEY = 'tiny-tamagotchi:v1';
const SCHEMA_VERSION = 1;

export function isAvailable(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    const probe = '__tiny_tamagotchi_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function read(): PetModel | null {
  if (!isAvailable()) return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    (parsed as { version?: unknown }).version !== SCHEMA_VERSION
  ) {
    return null;
  }
  const { version: _discarded, ...rest } = parsed as { version: number } & PetModel;
  void _discarded;
  return rest as PetModel;
}

export function write(state: PetModel): void {
  if (!isAvailable()) return;
  const payload = { version: SCHEMA_VERSION, ...state };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clear(): void {
  if (!isAvailable()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}
