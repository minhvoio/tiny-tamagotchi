import { MAX_STAT, MIN_STAT } from '@/game/constants';
import { clamp } from '@/game/util';

interface StatBarProps {
  label: string;
  value: number;
  max?: number;
}

export function StatBar({ label, value, max = MAX_STAT }: StatBarProps) {
  const safeValue = clamp(value, MIN_STAT, max);
  const percent = max === 0 ? 0 : (safeValue / max) * 100;

  return (
    <div className="flex w-64 flex-col gap-1">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-neutral-600">
          {safeValue} / {max}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={safeValue}
        aria-valuemin={MIN_STAT}
        aria-valuemax={max}
        className="h-3 overflow-hidden rounded-full bg-neutral-200"
      >
        <div
          data-testid={`${label.toLowerCase()}-fill`}
          className="h-full bg-emerald-500 transition-[width] duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
