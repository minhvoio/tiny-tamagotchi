import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { NamingForm } from '@/components/NamingForm';

describe('<NamingForm />', () => {
  it('renders the heading, input, and Confirm button', () => {
    const dispatch = vi.fn();
    render(<NamingForm dispatch={dispatch} />);
    expect(screen.getByRole('heading', { name: 'Name your pet' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter a name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
  });

  it('empty submit shows "Name must be 1-24 characters" and does not dispatch', () => {
    const dispatch = vi.fn();
    render(<NamingForm dispatch={dispatch} />);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(screen.getByRole('alert').textContent).toBe('Name must be 1-24 characters');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('whitespace-only submit shows the error and does not dispatch', () => {
    const dispatch = vi.fn();
    render(<NamingForm dispatch={dispatch} />);
    fireEvent.change(screen.getByPlaceholderText('Enter a name'), {
      target: { value: '     ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('valid submit dispatches SET_NAME with the trimmed name', () => {
    const dispatch = vi.fn();
    render(<NamingForm dispatch={dispatch} />);
    fireEvent.change(screen.getByPlaceholderText('Enter a name'), {
      target: { value: '  Pixel  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_NAME', name: 'Pixel' });
  });

  it('24 characters is accepted', () => {
    const dispatch = vi.fn();
    render(<NamingForm dispatch={dispatch} />);
    const name = 'a'.repeat(24);
    fireEvent.change(screen.getByPlaceholderText('Enter a name'), {
      target: { value: name },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_NAME', name });
  });

  it('1 character is accepted', () => {
    const dispatch = vi.fn();
    render(<NamingForm dispatch={dispatch} />);
    fireEvent.change(screen.getByPlaceholderText('Enter a name'), {
      target: { value: 'x' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_NAME', name: 'x' });
  });
});
