type GoalRingProps = {
  value: number;
  goal: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
};

export function GoalRing({ value, goal, size = 64, strokeWidth = 7, label }: GoalRingProps) {
  const pct = goal > 0 ? Math.min(1, value / goal) : 0;
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className="stroke-success transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <span className="absolute text-center text-xs leading-tight font-semibold">
        {label ?? (
          <>
            {value}
            <span className="text-muted-foreground">/{goal}</span>
          </>
        )}
      </span>
    </div>
  );
}
