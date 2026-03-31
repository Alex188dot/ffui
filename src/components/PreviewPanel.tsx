import { fileName } from "../lib/format";
import type { QueueItemPreview } from "../types";
import { SectionCard } from "./SectionCard";

export function PreviewPanel({ item }: { item: QueueItemPreview | null }) {
  return (
    <SectionCard title="Preview" eyebrow="Output">
      {item ? (
        <div className="space-y-5">
          <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/8 p-5">
            <div className="text-xs uppercase tracking-[0.25em] text-cyan-200/75">Human summary</div>
            <p className="mt-3 text-base leading-7 text-white">{item.summary}</p>
          </div>

          <InfoLine label="Input" value={fileName(item.config.input.path)} />
          <InfoLine label="Output" value={item.outputPlan.outputPath} />
          <InfoLine label="Container" value={item.outputPlan.container} />

          <div className="rounded-2xl bg-slate-950/80 p-5">
            <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Generated command</div>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all text-sm leading-7 text-emerald-200">
              {item.command.rendered}
            </pre>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-sm text-slate-300/75">
          No preview yet. Add a file, pick an operation, and the backend will generate the real ffmpeg command.
        </div>
      )}
    </SectionCard>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-white/5 px-4 py-3">
      <div className="text-xs uppercase tracking-[0.25em] text-slate-400">{label}</div>
      <div className="text-sm text-slate-100">{value}</div>
    </div>
  );
}
