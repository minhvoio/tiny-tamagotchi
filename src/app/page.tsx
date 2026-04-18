'use client';

import { Pet } from '@/components/Pet';
import { PetStage } from '@/components/PetStage';
import { StatBar } from '@/components/StatBar';
import { FeedButton } from '@/components/FeedButton';
import { PlayButton } from '@/components/PlayButton';
import { RestButton } from '@/components/RestButton';
import { HealButton } from '@/components/HealButton';
import { StateAnnouncer } from '@/components/StateAnnouncer';
import { NamingForm } from '@/components/NamingForm';
import { ResetButton } from '@/components/ResetButton';
import { KonamiListener } from '@/components/KonamiListener';
import { TamagotchiProvider, useTamagotchi } from '@/hooks/useTamagotchi';

function VitalsPanel() {
  const { state } = useTamagotchi();
  return (
    <div className="flex flex-col gap-3">
      <StatBar label="Hunger" value={state.vitals.hunger} />
      <StatBar label="Happiness" value={state.vitals.happiness} />
      <StatBar label="Energy" value={state.vitals.energy} />
    </div>
  );
}

function PetScreen() {
  const { state, dispatch } = useTamagotchi();
  if (state.name === '') {
    return <NamingForm dispatch={dispatch} />;
  }
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8">
      <a
        href="#pet-actions"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-black focus:shadow"
      >
        Skip to actions
      </a>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Tiny Tamagotchi</h1>
      <PetStage>
        <Pet />
      </PetStage>
      <section aria-label="Pet vitals">
        <VitalsPanel />
      </section>
      <section
        id="pet-actions"
        aria-label="Pet actions"
        tabIndex={-1}
        className="grid grid-cols-2 gap-3 sm:flex sm:flex-row"
      >
        <FeedButton />
        <PlayButton />
        <RestButton />
        <HealButton />
      </section>
      <div className="flex items-center gap-4 text-sm text-neutral-600">
        <span>{state.name}</span>
        <ResetButton dispatch={dispatch} />
      </div>
      <StateAnnouncer />
    </main>
  );
}

export default function Home() {
  return (
    <TamagotchiProvider>
      <PetScreen />
      <KonamiListener />
    </TamagotchiProvider>
  );
}
