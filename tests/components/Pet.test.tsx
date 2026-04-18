import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { act, render, screen } from '@testing-library/react';
import { Pet } from '@/components/Pet';
import { TamagotchiProvider, useTamagotchi } from '@/hooks/useTamagotchi';
import type { SeedPreset } from '@/game/state';

function SeedOnMount({ preset }: { preset: SeedPreset }) {
  const { dispatch } = useTamagotchi();
  useEffect(() => {
    dispatch({ type: '__SEED__', preset });
  }, [dispatch, preset]);
  return null;
}

function renderAt(preset: SeedPreset | null) {
  return render(
    <TamagotchiProvider>
      {preset && <SeedOnMount preset={preset} />}
      <Pet />
    </TamagotchiProvider>,
  );
}

describe('<Pet />', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders Normal with the idling aria-label and data-state', () => {
    renderAt(null);
    const pet = screen.getByRole('img', { name: /tiny tamagotchi, idling/i });
    expect(pet).toHaveAttribute('data-state', 'Normal');
    expect(pet).toHaveClass(/pet/);
    expect(screen.queryByTestId('crown')).not.toBeInTheDocument();
  });

  it('renders Evolved with thriving aria-label, data-state=Evolved, and the crown overlay', () => {
    renderAt('evolve-near');
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    const pet = screen.getByRole('img', { name: /tiny tamagotchi, thriving/i });
    expect(pet).toHaveAttribute('data-state', 'Evolved');
    expect(pet).toHaveClass(/pet/);
    expect(screen.getByTestId('crown')).toBeInTheDocument();
  });

  it('renders Sick with sick aria-label, data-state=Sick, and no crown', () => {
    renderAt('sick-near');
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    const pet = screen.getByRole('img', { name: /tiny tamagotchi, sick/i });
    expect(pet).toHaveAttribute('data-state', 'Sick');
    expect(pet).toHaveClass(/pet/);
    expect(screen.queryByTestId('crown')).not.toBeInTheDocument();
  });
});
