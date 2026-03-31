import { labels, audioFormats, jobTypes, qualityProfiles, resizePresets, targetProfiles, videoFormats } from "../lib/format";
import type { BuiltInPreset, JobConfig, QueueItemPreview, UserPreset } from "../types";
import { SectionCard } from "./SectionCard";

interface InspectorPanelProps {
  item: QueueItemPreview | null;
  builtInPresets: BuiltInPreset[];
  userPresets: UserPreset[];
  onChange: (next: JobConfig) => void;
}

export function InspectorPanel({ item, builtInPresets, userPresets, onChange }: InspectorPanelProps) {
  if (!item) {
    return (
      <SectionCard title="Inspector" eyebrow="Options">
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-sm text-slate-300/75">
          Select a queue item to tweak presets, formats, and trim settings.
        </div>
      </SectionCard>
    );
  }

  const config = item.config;

  return (
    <SectionCard title="Inspector" eyebrow="Options">
      <div className="grid gap-4">
        <SelectRow
          label="Built-in preset"
          value={config.presetName ?? ""}
          options={["", ...builtInPresets.map((preset) => preset.name)]}
          renderValue={(value) => value || "None"}
          onChange={(name) => {
            const preset = builtInPresets.find((candidate) => candidate.name === name);
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
            const preset = userPresets.find((candidate) => candidate.name === name);
            if (!preset) {
              return;
            }
            onChange({ ...preset.config, input: config.input, presetName: preset.name });
          }}
        />

        <EnumSelectRow label="Job type" value={config.jobType} options={jobTypes} renderValue={(value) => labels.jobType[value]} onChange={(jobType) => onChange({ ...config, jobType })} />
        <EnumSelectRow label="Quality" value={config.quality} options={qualityProfiles} renderValue={(value) => labels.quality[value]} onChange={(quality) => onChange({ ...config, quality })} />
        <EnumSelectRow label="Target" value={config.target} options={targetProfiles} renderValue={(value) => labels.target[value]} onChange={(target) => onChange({ ...config, target })} />
        <EnumSelectRow label="Video format" value={config.videoFormat} options={videoFormats} renderValue={(value) => labels.videoFormat[value]} onChange={(videoFormat) => onChange({ ...config, videoFormat })} />
        <EnumSelectRow label="Audio format" value={config.audioFormat} options={audioFormats} renderValue={(value) => labels.audioFormat[value]} onChange={(audioFormat) => onChange({ ...config, audioFormat })} />
        <EnumSelectRow label="Resize" value={config.resize} options={resizePresets} renderValue={(value) => labels.resize[value]} onChange={(resize) => onChange({ ...config, resize })} />

        <div className="grid gap-2 rounded-2xl bg-white/5 p-4">
          <label className="text-xs uppercase tracking-[0.25em] text-slate-400">Trim start</label>
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
          <label className="text-xs uppercase tracking-[0.25em] text-slate-400">Trim duration</label>
          <input
            type="number"
            min={1}
            value={config.trim?.durationSeconds ?? 15}
            onChange={(event) =>
              onChange({
                ...config,
                trim: {
                  startSeconds: config.trim?.startSeconds ?? 0,
                  durationSeconds: Math.max(1, Number(event.target.value)),
                },
              })
            }
            className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none ring-0"
          />
        </div>
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
}: {
  label: string;
  value: T | "";
  options: (T | "")[];
  renderValue: (value: T) => string;
  onChange: (value: T | "") => void;
}) {
  return (
    <label className="grid gap-2 rounded-2xl bg-white/5 p-4">
      <span className="text-xs uppercase tracking-[0.25em] text-slate-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T | "")}
        className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none"
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
      <span className="text-xs uppercase tracking-[0.25em] text-slate-400">{label}</span>
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
