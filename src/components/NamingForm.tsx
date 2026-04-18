'use client';

import { useId, useState, type Dispatch, type FormEvent } from 'react';
import type { Action } from '@/game/state';

interface NamingFormProps {
  dispatch: Dispatch<Action>;
}

const ERROR_MESSAGE = 'Name must be 1-24 characters';

export function NamingForm({ dispatch }: NamingFormProps) {
  const inputId = useId();
  const errorId = useId();
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length === 0 || trimmed.length > 24) {
      setError(true);
      return;
    }
    setError(false);
    dispatch({ type: 'SET_NAME', name: trimmed });
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <form
        onSubmit={onSubmit}
        className="flex w-full max-w-sm flex-col gap-3"
        aria-describedby={error ? errorId : undefined}
      >
        <h1 className="text-2xl font-semibold tracking-tight">Name your pet</h1>
        <label htmlFor={inputId} className="text-sm font-medium text-neutral-700">
          Pet name
        </label>
        <input
          id={inputId}
          type="text"
          placeholder="Enter a name"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={24}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error}
          className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500"
        />
        {error && (
          <p id={errorId} role="alert" className="text-sm text-red-600">
            {ERROR_MESSAGE}
          </p>
        )}
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-full bg-emerald-700 px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-600"
        >
          Confirm
        </button>
      </form>
    </main>
  );
}
