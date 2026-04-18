import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Pet } from '@/components/Pet';
import { TamagotchiProvider, useTamagotchi } from '@/hooks/useTamagotchi';
import type { Action, PetModel, SeedPreset } from '@/game/state';

function SeedOnMount({ preset }: { preset: SeedPreset }) {
  const { dispatch } = useTamagotchi();
  useEffect(() => {
    dispatch({ type: '__SEED__', preset });
  }, [dispatch, preset]);
  return null;
}

function Hydrate({ state }: { state: PetModel }) {
  const { dispatch } = useTamagotchi();
  useEffect(() => {
    dispatch({ type: '__HYDRATE__', state });
  }, [dispatch, state]);
  return null;
}

function Dispatcher({ on }: { on: (dispatch: (a: Action) => void) => void }) {
  const { dispatch } = useTamagotchi();
  useEffect(() => {
    on(dispatch);
  }, [on, dispatch]);
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

interface BaseOverrides {
  name?: string;
  hunger?: number;
  happiness?: number;
  energy?: number;
  isResting?: boolean;
  state?: PetModel['state'];
  hasEvolved?: boolean;
  feedStreak?: PetModel['feedStreak'];
  queasyUntil?: number;
  sleepCapUntil?: number;
}

function baseState(overrides: BaseOverrides = {}): PetModel {
  return {
    name: overrides.name ?? 'Pixel',
    vitals: {
      hunger: overrides.hunger ?? 100,
      happiness: overrides.happiness ?? 100,
      energy: overrides.energy ?? 100,
    },
    isResting: overrides.isResting ?? false,
    state: overrides.state ?? 'Normal',
    hasEvolved: overrides.hasEvolved ?? false,
    neglectTicks: { hunger: 0, happiness: 0, energy: 0 },
    careTicks: 0,
    lastTickAt: 0,
    feedStreak: overrides.feedStreak ?? { count: 0, lastFeedAt: 0 },
    queasyUntil: overrides.queasyUntil ?? 0,
    sleepCapUntil: overrides.sleepCapUntil ?? 0,
  };
}

function mockMatchMedia(reduced: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduced && query.includes('reduce'),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
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

describe('<Pet /> — Phase 6 variant class', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockMatchMedia(false);
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('applies a petVariant class derived from state.name', () => {
    render(
      <TamagotchiProvider>
        <Hydrate state={baseState({ name: 'Blob' })} />
        <Pet />
      </TamagotchiProvider>,
    );
    const pet = screen.getByRole('img');
    expect(pet.getAttribute('class') ?? '').toMatch(/petVariant[012]/);
  });

  it('does not throw and still applies a variant for the empty-string name', () => {
    render(
      <TamagotchiProvider>
        <Hydrate state={baseState({ name: '' })} />
        <Pet />
      </TamagotchiProvider>,
    );
    const pet = screen.getByRole('img');
    expect(pet.getAttribute('class') ?? '').toMatch(/petVariant[012]/);
  });
});

describe('<Pet /> — Phase 6 reaction animations', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockMatchMedia(false);
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  function setupReactionHarness(initial: PetModel) {
    let dispatchRef: ((a: Action) => void) | null = null;
    render(
      <TamagotchiProvider>
        <Dispatcher on={(d) => (dispatchRef = d)} />
        <Hydrate state={initial} />
        <Pet />
      </TamagotchiProvider>,
    );
    const pet = screen.getByRole('img');
    act(() => {
      fireEvent.animationEnd(pet);
    });
    return { pet, dispatch: (a: Action) => act(() => dispatchRef!(a)) };
  }

  it('sets data-reaction="chomp" immediately after a FEED dispatch', () => {
    const { pet, dispatch } = setupReactionHarness(
      baseState({ hunger: 40, happiness: 40, energy: 50 }),
    );
    dispatch({ type: 'FEED', nowMs: 1_700_000_000_000 });
    expect(pet).toHaveAttribute('data-reaction', 'chomp');
  });

  it('clears data-reaction on animationend (stale-reaction guard)', () => {
    const { pet, dispatch } = setupReactionHarness(
      baseState({ hunger: 40, happiness: 40, energy: 50 }),
    );
    dispatch({ type: 'FEED', nowMs: 1_700_000_000_000 });
    expect(pet).toHaveAttribute('data-reaction', 'chomp');
    act(() => {
      fireEvent.animationEnd(pet, { animationName: 'chomp' });
    });
    expect(pet).not.toHaveAttribute('data-reaction');
  });

  it('sets data-reaction="hop" after a PLAY dispatch that drops energy', () => {
    const { pet, dispatch } = setupReactionHarness(
      baseState({ hunger: 80, happiness: 40, energy: 50 }),
    );
    dispatch({ type: 'PLAY', nowMs: 1_700_000_000_000 });
    expect(pet).toHaveAttribute('data-reaction', 'hop');
  });

  it('sets data-reaction="sparkle" after HEAL transitions from Sick', () => {
    const { pet, dispatch } = setupReactionHarness(
      baseState({ hunger: 5, happiness: 5, energy: 5, state: 'Sick' }),
    );
    dispatch({ type: 'HEAL', nowMs: 1_700_000_000_000 });
    expect(pet).toHaveAttribute('data-reaction', 'sparkle');
  });

  it('still sets data-reaction under prefers-reduced-motion (CSS zeroes duration, attribute remains for testability)', () => {
    mockMatchMedia(true);
    const { pet, dispatch } = setupReactionHarness(
      baseState({ hunger: 40, happiness: 40, energy: 50 }),
    );
    dispatch({ type: 'FEED', nowMs: 1_700_000_000_000 });
    expect(pet).toHaveAttribute('data-reaction', 'chomp');
  });
});

describe('<Pet /> — Phase 6 idle mini-animations', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('never sets data-idle-animation under prefers-reduced-motion across 100 ticks', () => {
    mockMatchMedia(true);
    render(
      <TamagotchiProvider>
        <Hydrate state={baseState()} />
        <Pet />
      </TamagotchiProvider>,
    );
    const pet = screen.getByRole('img');
    act(() => {
      vi.advanceTimersByTime(100_000);
    });
    expect(pet).not.toHaveAttribute('data-idle-animation');
  });

  it('sets data-idle-animation when Math.random fires under threshold', () => {
    mockMatchMedia(false);
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.01);
    render(
      <TamagotchiProvider>
        <Hydrate state={baseState()} />
        <Pet />
      </TamagotchiProvider>,
    );
    const pet = screen.getByRole('img');
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    const idle = pet.getAttribute('data-idle-animation');
    expect(['yawn', 'blink', 'look-around']).toContain(idle);
    randomSpy.mockRestore();
  });

  it('clears data-idle-animation ~2s after it fired', () => {
    mockMatchMedia(false);
    const randomSpy = vi.spyOn(Math, 'random');
    randomSpy.mockReturnValueOnce(0.01);
    randomSpy.mockReturnValueOnce(0.5);
    randomSpy.mockReturnValue(0.99);
    render(
      <TamagotchiProvider>
        <Hydrate state={baseState()} />
        <Pet />
      </TamagotchiProvider>,
    );
    const pet = screen.getByRole('img');
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(pet).toHaveAttribute('data-idle-animation');
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(pet).not.toHaveAttribute('data-idle-animation');
    randomSpy.mockRestore();
  });
});

describe('<Pet /> — Phase 6 queasy overlay', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('sets data-egg="queasy" while queasyUntil is in the future', () => {
    const start = Date.now();
    render(
      <TamagotchiProvider>
        <Hydrate state={baseState({ queasyUntil: start + 30_000 })} />
        <Pet />
      </TamagotchiProvider>,
    );
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    const pet = screen.getByRole('img');
    expect(pet).toHaveAttribute('data-egg', 'queasy');
  });

  it('does not set data-egg when queasyUntil has already expired', () => {
    render(
      <TamagotchiProvider>
        <Hydrate state={baseState({ queasyUntil: 1 })} />
        <Pet />
      </TamagotchiProvider>,
    );
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    const pet = screen.getByRole('img');
    expect(pet).not.toHaveAttribute('data-egg');
  });
});

describe('<Pet /> — Phase 6 sleep-cap overlay', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders the sleep-cap path while sleepCapUntil is in the future', () => {
    const start = Date.now();
    render(
      <TamagotchiProvider>
        <Hydrate state={baseState({ sleepCapUntil: start + 30_000 })} />
        <Pet />
      </TamagotchiProvider>,
    );
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(screen.getByTestId('sleep-cap')).toBeInTheDocument();
  });

  it('does not render the sleep-cap path when sleepCapUntil is in the past', () => {
    render(
      <TamagotchiProvider>
        <Hydrate state={baseState({ sleepCapUntil: 1 })} />
        <Pet />
      </TamagotchiProvider>,
    );
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(screen.queryByTestId('sleep-cap')).not.toBeInTheDocument();
  });
});
