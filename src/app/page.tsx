'use client';

import { Pet } from '@/components/Pet';
import { PetStage } from '@/components/PetStage';
import { StatBar } from '@/components/StatBar';
import { FeedButton } from '@/components/FeedButton';
import { PlayButton } from '@/components/PlayButton';
import { RestButton } from '@/components/RestButton';
import { HealButton } from '@/components/HealButton';
import { StateAnnouncer } from '@/components/StateAnnouncer';
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

export default function Home() {
  return (
    <TamagotchiProvider>
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
        <StateAnnouncer />
      </main>
    </TamagotchiProvider>
  );
}
