import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { RestButton } from '@/components/RestButton';
import { TamagotchiProvider } from '@/hooks/useTamagotchi';

function renderApp() {
  return render(
    <TamagotchiProvider>
      <RestButton />
    </TamagotchiProvider>,
  );
}

describe('<RestButton />', () => {
  it('starts with label "Rest" and is never disabled', () => {
    renderApp();
    const btn = screen.getByRole('button', { name: 'Rest' });
    expect(btn).not.toBeDisabled();
  });

  it('toggles the label to "Wake" when clicked, then back to "Rest" on second click', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Rest' }));
    const wake = screen.getByRole('button', { name: 'Wake' });
    expect(wake).not.toBeDisabled();
    fireEvent.click(wake);
    expect(screen.getByRole('button', { name: 'Rest' })).toBeInTheDocument();
  });
});
