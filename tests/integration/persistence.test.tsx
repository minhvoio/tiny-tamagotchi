import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import Home from '@/app/page';
import { MAX_OFFLINE_MS, TICK_INTERVAL_MS } from '@/game/constants';
import { initialState, type PetModel } from '@/game/state';

const KEY = 'tiny-tamagotchi:v1';

function storedPayload(partial: Partial<PetModel>): string {
  const state: PetModel = { ...initialState, name: 'Pixel', ...partial };
  return JSON.stringify({ version: 1, ...state });
}

function valueOf(label: string): number {
  return Number(screen.getByRole('progressbar', { name: label }).getAttribute('aria-valuenow'));
}

describe('persistence integration', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-18T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders the naming form when no name is stored', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { name: 'Name your pet' })).toBeInTheDocument();
    expect(screen.queryByRole('progressbar', { name: 'Hunger' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Feed' })).not.toBeInTheDocument();
  });

  it('naming gate shows the form even when other PetModel fields are non-default', () => {
    window.localStorage.setItem(
      KEY,
      storedPayload({ name: '', state: 'Evolved', hasEvolved: true }),
    );
    render(<Home />);
    expect(screen.getByRole('heading', { name: 'Name your pet' })).toBeInTheDocument();
  });

  it('submitting a name reveals the pet UI, saves to storage, and hides the form', () => {
    render(<Home />);
    fireEvent.change(screen.getByPlaceholderText('Enter a name'), {
      target: { value: 'Pixel' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(screen.queryByRole('heading', { name: 'Name your pet' })).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Hunger' })).toBeInTheDocument();
    const raw = window.localStorage.getItem(KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed.name).toBe('Pixel');
    expect(parsed.version).toBe(1);
  });

  it('hydrates from storage on mount when a name is saved', () => {
    window.localStorage.setItem(
      KEY,
      storedPayload({
        name: 'Pixel',
        vitals: { hunger: 80, happiness: 70, energy: 60 },
        lastTickAt: Date.now(),
      }),
    );
    render(<Home />);
    expect(screen.queryByRole('heading', { name: 'Name your pet' })).not.toBeInTheDocument();
    expect(screen.getByText('Pixel')).toBeInTheDocument();
  });

  it('applies offline catch-up when elapsed < MAX_OFFLINE_MS', () => {
    const oneMinuteAgo = Date.now() - 60_000;
    window.localStorage.setItem(
      KEY,
      storedPayload({
        name: 'Pixel',
        vitals: { hunger: 80, happiness: 80, energy: 80 },
        lastTickAt: oneMinuteAgo,
      }),
    );
    render(<Home />);
    expect(valueOf('Hunger')).toBeLessThan(80);
    expect(valueOf('Hunger')).toBeGreaterThanOrEqual(60);
  });

  it('clamps offline catch-up to MAX_OFFLINE_MS when elapsed is far larger', () => {
    const tenDaysAgo = Date.now() - 10 * 24 * 60 * 60 * 1000;
    window.localStorage.setItem(
      KEY,
      storedPayload({
        name: 'Pixel',
        vitals: { hunger: 100, happiness: 100, energy: 100 },
        lastTickAt: tenDaysAgo,
      }),
    );
    render(<Home />);
    const expectedDecay = Math.floor(MAX_OFFLINE_MS / TICK_INTERVAL_MS);
    const expectedHunger = Math.max(0, 100 - expectedDecay);
    expect(valueOf('Hunger')).toBe(expectedHunger);
  });

  it('writes to storage after every dispatch when name is non-empty', () => {
    window.localStorage.setItem(
      KEY,
      storedPayload({
        name: 'Pixel',
        vitals: { hunger: 50, happiness: 50, energy: 50 },
        lastTickAt: Date.now(),
      }),
    );
    render(<Home />);
    act(() => {
      vi.advanceTimersByTime(TICK_INTERVAL_MS * 2);
    });
    const raw = window.localStorage.getItem(KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed.vitals.hunger).toBeLessThan(50);
  });

  it('RESET via the button clears storage and shows the naming form again', () => {
    window.localStorage.setItem(
      KEY,
      storedPayload({
        name: 'Pixel',
        vitals: { hunger: 80, happiness: 80, energy: 80 },
        lastTickAt: Date.now(),
      }),
    );
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<Home />);
    expect(screen.getByText('Pixel')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reset pet' }));
    expect(screen.getByRole('heading', { name: 'Name your pet' })).toBeInTheDocument();
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it('RESET via Cancel in the native confirm leaves state untouched', () => {
    window.localStorage.setItem(
      KEY,
      storedPayload({
        name: 'Pixel',
        lastTickAt: Date.now(),
      }),
    );
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<Home />);
    fireEvent.click(screen.getByRole('button', { name: 'Reset pet' }));
    expect(screen.queryByRole('heading', { name: 'Name your pet' })).not.toBeInTheDocument();
    expect(window.localStorage.getItem(KEY)).not.toBeNull();
  });

  it('recovers from corrupt localStorage by showing the naming form', () => {
    window.localStorage.setItem(KEY, '{bad json');
    render(<Home />);
    expect(screen.getByRole('heading', { name: 'Name your pet' })).toBeInTheDocument();
  });

  it('recovers from version mismatch by showing the naming form', () => {
    window.localStorage.setItem(KEY, JSON.stringify({ version: 99, name: 'ghost' }));
    render(<Home />);
    expect(screen.getByRole('heading', { name: 'Name your pet' })).toBeInTheDocument();
  });
});
