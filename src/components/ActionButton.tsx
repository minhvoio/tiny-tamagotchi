'use client';

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  disabledReason?: string;
}

export function ActionButton({
  label,
  onPress,
  disabled = false,
  disabledReason,
}: ActionButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-disabled={disabled}
      title={disabled ? disabledReason : undefined}
      onClick={onPress}
      className="inline-flex items-center rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500"
    >
      {label}
    </button>
  );
}
