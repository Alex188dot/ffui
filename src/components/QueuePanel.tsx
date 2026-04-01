import { fileName } from "../lib/format";
import type { QueueItemPreview } from "../types";
import { SectionCard } from "./SectionCard";

interface QueuePanelProps {
  items: QueueItemPreview[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

export function QueuePanel({ items, selectedId, onSelect, onRemove }: QueuePanelProps) {
  return (
    <SectionCard title="Queue" eyebrow="Inputs">
      <div className="space-y-3">
        {items.length === 0 ? (
          <EmptyState />
        ) : (
          items.map((item, index) => {
            const selected = selectedId === item.id;
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => onSelect(item.id)}
                className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                  selected
                    ? "border-cyan-300/60 bg-cyan-300/10 shadow-[0_0_0_1px_rgba(103,232,249,0.35)]"
                    : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.25em] text-slate-400">#{String(index + 1).padStart(2, "0")}</div>
                    <div className="mt-1 text-sm font-semibold text-white">{fileName(item.config.input.path)}</div>
                  </div>
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      aria-label={`Remove ${fileName(item.config.input.path)} from queue`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onRemove(item.id);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/6 text-sm font-semibold text-slate-200 transition hover:border-rose-300/40 hover:bg-rose-400/12 hover:text-rose-100"
                    >
                      -
                    </button>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                      item.state === "Succeeded"
                        ? "bg-emerald-400/15 text-emerald-200"
                        : item.state === "Cancelled"
                          ? "bg-slate-300/15 text-slate-200"
                        : item.state === "Failed"
                          ? "bg-rose-400/15 text-rose-200"
                          : item.state === "Running"
                            ? "bg-amber-400/15 text-amber-200"
                            : "bg-white/10 text-slate-200"
                    }`}>
                      {item.state}
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300/85">{item.summary}</p>
              </button>
            );
          })
        )}
      </div>
    </SectionCard>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-sm leading-7 text-slate-300/75">
      Start by adding one or more files. Folder intake expands recursively and prepares batch-ready jobs automatically.
    </div>
  );
}
