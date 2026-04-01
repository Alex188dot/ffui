import {
  labels,
  audioFormats,
  jobTypes,
  qualityProfiles,
  resizePresets,
  targetProfiles,
  videoFormats,
} from "../lib/format";
import type {
  BuiltInPreset,
  JobConfig,
  QueueItemPreview,
  UserPreset,
} from "../types";
import { SectionCard } from "./SectionCard";

interface InspectorPanelProps {
  item: QueueItemPreview | null;
  builtInPresets: BuiltInPreset[];
  userPresets: UserPreset[];
  onChange: (next: JobConfig) => void;
}

export function InspectorPanel({
  item,
  builtInPresets,
  userPresets,
  onChange,
}: InspectorPanelProps) {
  if (!item) {
    return (
      <SectionCard title="Inspector" eyebrow="Options">
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-sm text-slate-300/75">
          Add one or more items to the queue first
        </div>
      </SectionCard>
    );
  }

  const config = item.config;
  const showVideoControls = config.input.kind === "Video";
  const showAudioControls =
    config.input.kind === "Audio" ||
    config.jobType === "AudioConvert" ||
    config.jobType === "ExtractAudio";
  const isGifJob = config.jobType === "MakeGif" || config.videoFormat === "Gif";
  const trimEnabled = config.trim !== null;

  return (
    <SectionCard title="Inspector" eyebrow="Options">
      <div className="grid gap-4">
        <SelectRow
          label="Built-in preset"
          value={config.presetName ?? ""}
          options={["", ...builtInPresets.map((preset) => preset.name)]}
          renderValue={(value) => value || "None"}
          emphasis="feature"
          onChange={(name) => {
            const preset = builtInPresets.find(
              (candidate) => candidate.name === name,
            );
            if (!preset) {
              onChange({ ...config, presetName: null });
              return;
            }
            onChange({
              ...config,
              jobType: preset.jobType,
              quality: preset.quality,
              target: preset.target,
              videoFormat: preset.videoFormat,
              audioFormat: preset.audioFormat,
              resize: preset.resize,
              presetName: preset.name,
            });
          }}
        />

        <SelectRow
          label="Custom preset"
          value=""
          options={["", ...userPresets.map((preset) => preset.name)]}
          renderValue={(value) => value || "Apply saved preset"}
          onChange={(name) => {
            const preset = userPresets.find(
              (candidate) => candidate.name === name,
            );
            if (!preset) {
              return;
            }
            onChange({
              ...preset.config,
              input: config.input,
              presetName: preset.name,
            });
          }}
        />

        <EnumSelectRow
          label="Job type"
          value={config.jobType}
          options={jobTypes}
          renderValue={(value) => labels.jobType[value]}
          onChange={(jobType) =>
            onChange({
              ...config,
              jobType,
              trim:
                jobType === "MakeGif"
                  ? (config.trim ?? { startSeconds: 0, durationSeconds: 15 })
                  : config.trim,
            })
          }
        />
        <EnumSelectRow
          label="Quality"
          value={config.quality}
          options={qualityProfiles}
          renderValue={(value) => labels.quality[value]}
          onChange={(quality) => onChange({ ...config, quality })}
        />
        <EnumSelectRow
          label="Target"
          value={config.target}
          options={targetProfiles}
          renderValue={(value) => labels.target[value]}
          onChange={(target) => onChange({ ...config, target })}
        />
        {showVideoControls ? (
          <EnumSelectRow
            label="Video format"
            value={config.videoFormat}
            options={videoFormats}
            renderValue={(value) => labels.videoFormat[value]}
            onChange={(videoFormat) => onChange({ ...config, videoFormat })}
          />
        ) : null}
        {showAudioControls ? (
          <EnumSelectRow
            label="Audio format"
            value={config.audioFormat}
            options={audioFormats}
            renderValue={(value) => labels.audioFormat[value]}
            onChange={(audioFormat) => onChange({ ...config, audioFormat })}
          />
        ) : null}
        {showVideoControls ? (
          <EnumSelectRow
            label="Resize"
            value={config.resize}
            options={resizePresets}
            renderValue={(value) => labels.resize[value]}
            onChange={(resize) => onChange({ ...config, resize })}
          />
        ) : null}

        {config.input.kind === "Video" ? (
          <>
            <label className="flex items-center justify-between gap-4 rounded-2xl bg-white/5 p-4">
              <div className="grid gap-1">
                <span className="text-xs uppercase tracking-[0.25em] text-slate-400">
                  Trim clip
                </span>
                <span className="text-sm leading-6 text-slate-300/85">
                  Export only a slice of the source instead of the full file.
                  Useful for GIFs and short test clips.
                </span>
              </div>
              <input
                type="checkbox"
                checked={trimEnabled}
                onChange={(event) =>
                  onChange({
                    ...config,
                    trim: event.target.checked
                      ? (config.trim ?? {
                          startSeconds: 0,
                          durationSeconds: 15,
                        })
                      : null,
                  })
                }
                className="h-5 w-5 rounded border-white/20 bg-slate-950/60"
              />
            </label>

            {trimEnabled ? (
              <>
                <div className="grid gap-2 rounded-2xl bg-white/5 p-4">
                  <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
                    Trim start
                  </label>
                  <p className="text-sm leading-6 text-slate-300/80">
                    Start the export from this second in the original file. `0`
                    means from the beginning.
                  </p>
                  <input
                    type="number"
                    min={0}
                    value={config.trim?.startSeconds ?? 0}
                    onChange={(event) =>
                      onChange({
                        ...config,
                        trim: {
                          startSeconds: Number(event.target.value),
                          durationSeconds: config.trim?.durationSeconds ?? 15,
                        },
                      })
                    }
                    className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none ring-0"
                  />
                </div>

                <div className="grid gap-2 rounded-2xl bg-white/5 p-4">
                  <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
                    Trim duration
                  </label>
                  <p className="text-sm leading-6 text-slate-300/80">
                    Keep this many seconds after the trim start. A value of `15`
                    exports a 15-second segment.
                  </p>
                  <input
                    type="number"
                    min={1}
                    value={config.trim?.durationSeconds ?? 15}
                    onChange={(event) =>
                      onChange({
                        ...config,
                        trim: {
                          startSeconds: config.trim?.startSeconds ?? 0,
                          durationSeconds: Math.max(
                            1,
                            Number(event.target.value),
                          ),
                        },
                      })
                    }
                    className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none ring-0"
                  />
                </div>
              </>
            ) : null}
          </>
        ) : null}

        <details
          className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 open:bg-slate-950/70"
          open
        >
          <summary className="cursor-pointer list-none text-sm font-semibold text-white">
            Advanced
          </summary>
          <div className="mt-4 grid gap-4">
            {showAudioControls ? (
              <div className="grid gap-2 rounded-2xl bg-white/5 p-4">
                <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
                  Audio bitrate
                </label>
                <input
                  type="number"
                  min={64}
                  step={16}
                  value={config.audioBitrateKbps}
                  onChange={(event) =>
                    onChange({
                      ...config,
                      audioBitrateKbps: Math.max(
                        64,
                        Number(event.target.value),
                      ),
                    })
                  }
                  className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none ring-0"
                />
              </div>
            ) : null}

            {isGifJob ? (
              <div className="grid gap-2 rounded-2xl bg-white/5 p-4">
                <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
                  GIF FPS
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={config.gifFps}
                  onChange={(event) =>
                    onChange({
                      ...config,
                      gifFps: Math.min(
                        60,
                        Math.max(1, Number(event.target.value)),
                      ),
                    })
                  }
                  className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none ring-0"
                />
              </div>
            ) : null}

            <div className="rounded-2xl bg-slate-950/80 p-4">
              <div className="text-xs uppercase tracking-[0.25em] text-slate-400">
                Command preview
              </div>
              <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all text-sm leading-7 text-emerald-200">
                {item.command.rendered}
              </pre>
            </div>
          </div>
        </details>
      </div>
    </SectionCard>
  );
}

function SelectRow<T extends string>({
  label,
  value,
  options,
  renderValue,
  onChange,
  emphasis = "default",
}: {
  label: string;
  value: T | "";
  options: (T | "")[];
  renderValue: (value: T) => string;
  onChange: (value: T | "") => void;
  emphasis?: "default" | "feature";
}) {
  return (
    <label
      className={`grid gap-2 rounded-2xl p-4 ${
        emphasis === "feature"
          ? "border border-cyan-300/20 bg-gradient-to-br from-cyan-400/12 via-slate-900/92 to-slate-900/96 shadow-[0_0_0_1px_rgba(103,232,249,0.08)]"
          : "bg-white/5"
      }`}
    >
      <span
        className={`text-xs uppercase tracking-[0.25em] ${emphasis === "feature" ? "text-cyan-200" : "text-slate-400"}`}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T | "")}
        className={`rounded-xl px-3 py-2 text-sm text-white outline-none ${
          emphasis === "feature"
            ? "border border-cyan-300/20 bg-slate-950/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            : "border border-white/10 bg-slate-950/60"
        }`}
      >
        {options.map((option) => (
          <option key={option || "empty"} value={option}>
            {option ? renderValue(option as T) : "None"}
          </option>
        ))}
      </select>
    </label>
  );
}

function EnumSelectRow<T extends string>({
  label,
  value,
  options,
  renderValue,
  onChange,
}: {
  label: string;
  value: T;
  options: T[];
  renderValue: (value: T) => string;
  onChange: (value: T) => void;
}) {
  return (
    <label className="grid gap-2 rounded-2xl bg-white/5 p-4">
      <span className="text-xs uppercase tracking-[0.25em] text-slate-400">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {renderValue(option)}
          </option>
        ))}
      </select>
    </label>
  );
}
