import { FlaskConical } from "lucide-react";

export function SyntheticDataBanner() {
  return (
    <div
      role="note"
      aria-label="Synthetic data environment"
      className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-6 py-1.5 text-xs text-amber-900"
    >
      <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="font-medium">Synthetic data environment</span>
      <span className="text-amber-800/70">
        All animals, assets, sensors, documents and metrics are illustrative and clearly labeled.
      </span>
    </div>
  );
}
