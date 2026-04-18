import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ResetButton } from '@/components/ResetButton';

describe('<ResetButton />', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls confirm with the locked message and dispatches RESET when accepted', () => {
    const dispatch = vi.fn();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<ResetButton dispatch={dispatch} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reset pet' }));
    expect(confirm).toHaveBeenCalledWith('Reset your pet? This cannot be undone.');
    expect(dispatch).toHaveBeenCalledWith({ type: 'RESET' });
  });

  it('does not dispatch when confirm is cancelled', () => {
    const dispatch = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<ResetButton dispatch={dispatch} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reset pet' }));
    expect(dispatch).not.toHaveBeenCalled();
  });
});
