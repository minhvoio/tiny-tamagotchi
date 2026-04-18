import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PetStage } from '@/components/PetStage';

describe('<PetStage />', () => {
  it('renders its children', () => {
    render(
      <PetStage>
        <span data-testid="child">x</span>
      </PetStage>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});
