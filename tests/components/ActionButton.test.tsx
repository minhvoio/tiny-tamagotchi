import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ActionButton } from '@/components/ActionButton';

describe('<ActionButton />', () => {
  it('calls onPress when clicked and enabled', () => {
    const onPress = vi.fn();
    render(<ActionButton label="Feed" onPress={onPress} />);
    fireEvent.click(screen.getByRole('button', { name: 'Feed' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress and sets aria-disabled + title when disabled', () => {
    const onPress = vi.fn();
    render(<ActionButton label="Feed" onPress={onPress} disabled disabledReason="Pet is full" />);
    const btn = screen.getByRole('button', { name: 'Feed' });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-disabled', 'true');
    expect(btn).toHaveAttribute('title', 'Pet is full');
    fireEvent.click(btn);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('omits title when enabled even if disabledReason is provided', () => {
    render(
      <ActionButton
        label="Feed"
        onPress={() => {}}
        disabled={false}
        disabledReason="Should not show"
      />,
    );
    const btn = screen.getByRole('button', { name: 'Feed' });
    expect(btn).not.toHaveAttribute('title');
    expect(btn).toHaveAttribute('aria-disabled', 'false');
  });
});
