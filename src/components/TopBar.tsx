import type { ToolStatus } from "../types";

interface TopBarProps {
  toolStatus: ToolStatus | null;
  onAddFiles: () => void;
  onAddFolder: () => void;
  onRun: () => void;
  onSavePreset: () => void;
  isRunning: boolean;
}

export function TopBar({ toolStatus, onAddFiles, onAddFolder, onRun, onSavePreset, isRunning }: TopBarProps) {
  return (
    <header className="relative overflow-hidden rounded-[36px] border border-white/15 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.22),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(251,146,60,0.2),_transparent_28%),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(49,46,129,0.78))] p-8 text-white shadow-[0_30px_120px_-40px_rgba(14,116,144,0.75)]">
      <div className="absolute inset-y-0 right-[-6rem] w-72 rounded-full bg-pink-500/10 blur-3xl" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">
            ffui desktop
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
            Make ffmpeg feel like a candy-colored power tool.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200/85 sm:text-base">
            Queue files, pick an intent-first preset, tweak a few knobs, inspect the real command, and run conversions without living in terminal flag soup.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ActionButton label="🎞️ Add Files" onClick={onAddFiles} />
          <ActionButton label="📁 Add Folder" onClick={onAddFolder} />
          <ActionButton label="💾 Save Preset" onClick={onSavePreset} />
          <ActionButton label={isRunning ? "⏳ Running" : "🚀 Run Queue"} onClick={onRun} disabled={isRunning || !toolStatus?.ready} />
        </div>
      </div>
      <div className="relative mt-6 flex flex-wrap items-center gap-3 text-sm">
        <span className={`rounded-full px-3 py-1 font-medium ${toolStatus?.ready ? "bg-emerald-400/15 text-emerald-200" : "bg-rose-400/15 text-rose-200"}`}>
          {toolStatus?.ready ? "ffmpeg ready" : "ffmpeg missing"}
        </span>
        <span className="text-slate-200/80">{toolStatus?.message}</span>
      </div>
    </header>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-left text-sm font-medium text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {label}
    </button>
  );
}
