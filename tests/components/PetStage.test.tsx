import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PetStage } from '@/components/PetStage';
import { TamagotchiProvider } from '@/hooks/useTamagotchi';

describe('<PetStage />', () => {
  it('renders its children', () => {
    render(
      <TamagotchiProvider>
        <PetStage>
          <span data-testid="child">x</span>
        </PetStage>
      </TamagotchiProvider>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('does not render the sick indicator when state is Normal', () => {
    render(
      <TamagotchiProvider>
        <PetStage>
          <span>anything</span>
        </PetStage>
      </TamagotchiProvider>,
    );
    expect(screen.queryByTestId('sick-indicator')).not.toBeInTheDocument();
  });
});
