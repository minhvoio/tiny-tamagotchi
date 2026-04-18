import { Pet } from '@/components/Pet';
import { PetStage } from '@/components/PetStage';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-12">
      <h1 className="text-3xl font-semibold tracking-tight">Tiny Tamagotchi</h1>
      <PetStage>
        <Pet />
      </PetStage>
    </main>
  );
}
