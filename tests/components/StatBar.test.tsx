import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatBar } from '@/components/StatBar';

describe('<StatBar />', () => {
  it('exposes a progressbar with ARIA values and the numeric readout', () => {
    render(<StatBar label="Hunger" value={42} />);

    const bar = screen.getByRole('progressbar', { name: 'Hunger' });
    expect(bar).toHaveAttribute('aria-valuenow', '42');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');

    expect(screen.getByText('42 / 100')).toBeInTheDocument();
  });

  it('renders a zero-width fill when value is 0', () => {
    render(<StatBar label="Hunger" value={0} />);
    const fill = screen.getByTestId('hunger-fill');
    expect(fill.style.width).toBe('0%');
  });

  it('clamps out-of-range values into [0, max] in both display and ARIA', () => {
    render(<StatBar label="Hunger" value={250} />);
    const bar = screen.getByRole('progressbar', { name: 'Hunger' });
    expect(bar).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByText('100 / 100')).toBeInTheDocument();
  });
});
