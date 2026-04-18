import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Pet } from '@/components/Pet';

describe('<Pet />', () => {
  it('renders with the idling aria-label and the pet CSS Module class', () => {
    render(<Pet />);
    const pet = screen.getByRole('img', {
      name: /tiny tamagotchi, idling/i,
    });
    expect(pet).toBeInTheDocument();
    expect(pet).toHaveClass(/pet/);
  });
});
