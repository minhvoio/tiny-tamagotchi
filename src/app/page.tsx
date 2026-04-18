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
      <h1 className="text-3xl font-semibold tracking-tight">Tiny Tamagotchi</h1>
      <PetStage>
        <Pet />
      </PetStage>
      <VitalsPanel />
      <div className="flex gap-3">
        <FeedButton />
        <PlayButton />
        <RestButton />
        <HealButton />
      </div>
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
    </TamagotchiProvider>
  );
}
