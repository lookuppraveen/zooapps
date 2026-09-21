"use client";

type Props = {
  values: number[];
  width?: number;
  height?: number;
};

export function Sparkline({ values, width = 200, height = 40 }: Props) {
  if (values.length === 0) {
    return <div className="h-10 text-[10px] text-slate-400">no data</div>;
  }
  const max = Math.max(1, ...values);
  const stepX = width / Math.max(1, values.length - 1);
  const points = values
    .map((v, i) => `${(i * stepX).toFixed(1)},${(height - (v / max) * (height - 2) - 1).toFixed(1)}`)
    .join(" ");
  const areaPoints = `0,${height} ${points} ${width},${height}`;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label="Trend sparkline"
      className="overflow-visible"
    >
      <polygon points={areaPoints} fill="url(#g-spark)" opacity="0.3" />
      <polyline points={points} fill="none" stroke="#0E7C86" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <defs>
        <linearGradient id="g-spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0AA2B0" />
          <stop offset="100%" stopColor="#0AA2B0" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}
