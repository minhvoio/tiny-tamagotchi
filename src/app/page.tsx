'use client';

import { Pet } from '@/components/Pet';
import { PetStage } from '@/components/PetStage';
import { StatBar } from '@/components/StatBar';
import { FeedButton } from '@/components/FeedButton';
import { TamagotchiProvider, useTamagotchi } from '@/hooks/useTamagotchi';

function HungerBar() {
  const { state } = useTamagotchi();
  return <StatBar label="Hunger" value={state.vitals.hunger} />;
}

export default function Home() {
  return (
    <TamagotchiProvider>
      <main className="flex min-h-screen flex-col items-center justify-center gap-8">
        <h1 className="text-3xl font-semibold tracking-tight">Tiny Tamagotchi</h1>
        <PetStage>
          <Pet />
        </PetStage>
        <HungerBar />
        <FeedButton />
      </main>
    </TamagotchiProvider>
  );
}
