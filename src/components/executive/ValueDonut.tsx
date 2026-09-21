"use client";

type Props = {
  headline: string;
  sub: string;
  percent: number; // 0..100
};

export function ValueDonut({ headline, sub, percent }: Props) {
  const pct = Math.max(0, Math.min(100, percent));
  const r = 34;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <div className="flex items-center gap-4">
      <div className="relative flex h-24 w-24 items-center justify-center">
        <svg viewBox="0 0 80 80" className="h-24 w-24 -rotate-90">
          <circle cx="40" cy="40" r={r} stroke="#E2E8F0" strokeWidth="10" fill="none" />
          <circle
            cx="40"
            cy="40"
            r={r}
            stroke="url(#g-donut)"
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
          />
          <defs>
            <linearGradient id="g-donut" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0E7C86" />
              <stop offset="100%" stopColor="#0AA2B0" />
            </linearGradient>
          </defs>
        </svg>
        <span className="absolute text-sm font-semibold text-slate-nav">{pct.toFixed(0)}%</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Operational value
        </p>
        <p className="mt-0.5 text-lg font-semibold text-slate-nav">{headline}</p>
        <p className="text-[11px] text-slate-500">{sub}</p>
      </div>
    </div>
  );
}
