import type { ToolStatus } from "../types";

interface TopBarProps {
  toolStatus: ToolStatus | null;
  onAddFiles: () => void;
  onAddFolder: () => void;
  onRunOrStop: () => void;
  onSavePreset: () => void;
  isRunning: boolean;
  canRun: boolean;
  canSavePreset: boolean;
}

export function TopBar({
  toolStatus,
  onAddFiles,
  onAddFolder,
  onRunOrStop,
  onSavePreset,
  isRunning,
  canRun,
  canSavePreset,
}: TopBarProps) {
  return (
    <header className="relative overflow-hidden rounded-[36px] border border-white/15 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.22),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(251,146,60,0.2),_transparent_28%),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(49,46,129,0.78))] p-8 text-white shadow-[0_30px_120px_-40px_rgba(14,116,144,0.75)]">
      <div className="absolute inset-y-0 right-[-6rem] w-72 rounded-full bg-pink-500/10 blur-3xl" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-4xl lg:max-w-[50rem]">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">
            ffui desktop
          </div>
          <h1 className="mt-5 text-[2.15rem] font-semibold leading-[1.08] tracking-tight sm:text-[2.85rem]">
            Turn media conversion
            <br className="hidden lg:block" />
            <span className="lg:hidden"> </span>
            into something fast and fun
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-200/85 sm:text-base lg:max-w-none lg:whitespace-nowrap">
            Drop in your files, pick a preset and turn videos, audio and clips
            into exports in seconds
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ActionButton icon="🎞️" label="Add Files" onClick={onAddFiles} />
          <ActionButton icon="📁" label="Add Folder" onClick={onAddFolder} />
          <ActionButton
            icon="💾"
            label="Save Preset"
            onClick={onSavePreset}
            disabled={!canSavePreset}
          />
          <ActionButton
            icon={isRunning ? "🛑" : "🚀"}
            label={isRunning ? "Stop Queue" : "Run Queue"}
            onClick={onRunOrStop}
            disabled={isRunning ? false : !toolStatus?.ready || !canRun}
            emphasis="primary"
          />
        </div>
      </div>
      <div className="relative mt-6 flex flex-wrap items-center gap-3 text-sm">
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-semibold ${
            toolStatus?.ready
              ? "border-emerald-300/20 bg-emerald-400/15 text-emerald-100"
              : "border-rose-300/25 bg-rose-500/15 text-rose-100"
          }`}
        >
          <span aria-hidden="true">{toolStatus?.ready ? "✓" : "✕"}</span>
          <span>ffmpeg</span>
        </span>
        <span className="text-slate-200/80">{toolStatus?.message}</span>
      </div>
    </header>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  disabled,
  emphasis = "default",
}: {
  icon: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  emphasis?: "default" | "primary";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group rounded-[26px] border px-5 py-4 text-left text-sm font-medium text-white transition duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
        emphasis === "primary"
          ? "border-cyan-200/45 bg-gradient-to-br from-cyan-400/20 via-sky-400/10 to-fuchsia-400/16 shadow-[0_0_0_1px_rgba(103,232,249,0.18),0_24px_50px_-28px_rgba(34,211,238,0.9)] hover:border-cyan-200/70 hover:from-cyan-400/28 hover:to-fuchsia-400/22"
          : "border-white/15 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:border-white/25 hover:bg-white/16"
      }`}
    >
      <span className="flex flex-col items-center justify-center gap-2 text-center">
        <span className="text-2xl leading-none transition group-hover:scale-110">
          {icon}
        </span>
        <span className="text-base font-semibold tracking-[-0.02em]">
          {label}
        </span>
      </span>
    </button>
  );
}
