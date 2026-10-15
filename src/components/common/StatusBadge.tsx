import type { AssetStatus, GenerationStatus } from "@/lib/database.types";
import { GENERATION_STATUS_LABELS } from "@/lib/services/documents";
import { ASSET_STATUS_LABELS } from "@/lib/validation/asset";

const assetTones: Record<AssetStatus, string> = {
  active: "border-primary/30 bg-primary-soft text-primary-hover",
  in_repair: "border-amber-400/40 bg-amber-500/15 text-amber-300",
  retired: "border-line bg-surface text-muted",
  disposed: "border-line bg-surface text-muted",
  lost: "border-danger/30 bg-danger-soft text-danger",
};

export function AssetStatusBadge({ status }: { status: AssetStatus }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-xs ${assetTones[status]}`}
    >
      {ASSET_STATUS_LABELS[status] ?? status}
    </span>
  );
}

const documentTones: Record<GenerationStatus, string> = {
  ready: "border-primary/30 bg-primary-soft text-primary-hover",
  pending: "border-line bg-surface text-muted",
  generating: "border-amber-400/40 bg-amber-500/15 text-amber-300",
  failed: "border-danger/30 bg-danger-soft text-danger",
};

export function DocumentStatusBadge({ status }: { status: GenerationStatus }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-xs ${documentTones[status]}`}
    >
      {GENERATION_STATUS_LABELS[status] ?? status}
    </span>
  );
}
