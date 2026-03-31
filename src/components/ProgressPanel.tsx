import { SectionCard } from "./SectionCard";

interface ProgressPanelProps {
  isRunning: boolean;
  percent: number | null;
  logs: string[];
}

export function ProgressPanel({ isRunning, percent, logs }: ProgressPanelProps) {
  return (
    <SectionCard title="Run Console" eyebrow="Execution">
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-fuchsia-500/15 via-cyan-500/10 to-amber-400/10 p-5">
          <div className="text-xs uppercase tracking-[0.25em] text-slate-300">Queue status</div>
          <div className="mt-4 text-3xl font-semibold text-white">{isRunning ? "Running" : "Idle"}</div>
          <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-teal-300 to-amber-300 transition-all duration-300"
              style={{ width: `${percent ?? 0}%` }}
            />
          </div>
          <div className="mt-3 text-sm text-slate-300">{percent !== null ? `${percent.toFixed(0)}% complete` : "Waiting for progress"}</div>
        </div>

        <div className="rounded-3xl bg-slate-950/80 p-5">
          <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Live log</div>
          <div className="mt-4 max-h-64 overflow-auto font-mono text-sm leading-7 text-slate-200">
            {logs.length === 0 ? "No logs yet." : logs.map((line, index) => <div key={`${line}-${index}`}>{line}</div>)}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
