import { useEffect, useMemo, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { api, events } from "./lib/tauri";
import type {
  BootstrapPayload,
  JobConfig,
  QueueItemPreview,
  UserPreset,
} from "./types";
import { InspectorPanel } from "./components/InspectorPanel";
import { PreviewPanel } from "./components/PreviewPanel";
import { ProgressPanel } from "./components/ProgressPanel";
import { QueuePanel } from "./components/QueuePanel";
import { TopBar } from "./components/TopBar";

function App() {
  const [bootstrap, setBootstrap] = useState<BootstrapPayload | null>(null);
  const [items, setItems] = useState<QueueItemPreview[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [lastCompletedId, setLastCompletedId] = useState<string | null>(null);
  const [hasLaunchedRun, setHasLaunchedRun] = useState(false);
  const [presetDraftName, setPresetDraftName] = useState("");
  const [presetDialogOpen, setPresetDialogOpen] = useState(false);
  const [presetDialogError, setPresetDialogError] = useState<string | null>(
    null,
  );
  const [savingPreset, setSavingPreset] = useState(false);

  useEffect(() => {
    api
      .bootstrap()
      .then(setBootstrap)
      .catch((error) => {
        setLogs((current) => [
          `Failed to bootstrap app: ${String(error)}`,
          ...current,
        ]);
      });

    const disposers = [
      events.onLog((payload) => {
        setLogs((current) =>
          [`[${payload.index + 1}] ${payload.line}`, ...current].slice(0, 60),
        );
        setItems((current) =>
          current.map((item, index) =>
            index === payload.index ? { ...item, lastLog: payload.line } : item,
          ),
        );
      }),
      events.onProgress((payload) => {
        setItems((current) =>
          current.map((item, index) =>
            index === payload.index
              ? {
                  ...item,
                  progressPercent: payload.percent ?? item.progressPercent,
                  state: "Running",
                }
              : item,
          ),
        );
      }),
      events.onStatus((payload) => {
        setLogs((current) =>
          [
            `[${payload.index + 1}] ${payload.state}${payload.message ? `: ${payload.message}` : ""}`,
            ...current,
          ].slice(0, 60),
        );
        setItems((current) => {
          const next = current.map((item, index) =>
            index === payload.index
              ? {
                  ...item,
                  state: payload.state,
                  lastLog: payload.message,
                  progressPercent:
                    payload.state === "Succeeded" ? 100 : item.progressPercent,
                }
              : item,
          );
          if (payload.index >= 0 && payload.state === "Succeeded") {
            setLastCompletedId(next[payload.index]?.id ?? null);
          }
          return next;
        });
        if (payload.index === -1) {
          setRunning(false);
        }
      }),
    ];

    return () => {
      Promise.all(disposers).then((unlisteners) => {
        unlisteners.forEach((unlisten) => void unlisten());
      });
    };
  }, []);

  const selectedItem = items.find((item) => item.id === selectedId) ?? null;
  const lastCompletedItem =
    items.find((item) => item.id === lastCompletedId) ?? null;
  const progressSummary = useMemo(() => {
    if (items.length === 0) {
      return {
        percent: null as number | null,
        statusLabel: running ? "Running" : "Idle",
        detailLabel: "Add files to start a queue",
      };
    }

    const completedCount = items.filter(
      (item) =>
        item.state === "Succeeded" ||
        item.state === "Failed" ||
        item.state === "Cancelled",
    ).length;
    const successfulCount = items.filter(
      (item) => item.state === "Succeeded",
    ).length;
    const failedCount = items.filter((item) => item.state === "Failed").length;
    const cancelledCount = items.filter(
      (item) => item.state === "Cancelled",
    ).length;
    const runningItem = items.find((item) => item.state === "Running") ?? null;
    const runningContribution = runningItem
      ? (runningItem.progressPercent ?? 0) / 100
      : 0;
    const percent = Math.min(
      100,
      ((completedCount + runningContribution) / items.length) * 100,
    );

    let statusLabel = "Idle";
    if (running) statusLabel = "Running";
    else if (cancelledCount > 0) statusLabel = "Cancelled";
    else if (failedCount > 0) statusLabel = "Finished with errors";
    else if (successfulCount === items.length) statusLabel = "Completed";

    let detailLabel = `${completedCount} of ${items.length} items processed`;
    if (runningItem) {
      const currentIndex =
        items.findIndex((item) => item.id === runningItem.id) + 1;
      const currentName =
        runningItem.config.input.path.split(/[\\/]/).pop() ?? "current file";
      detailLabel = `Processing ${currentIndex} of ${items.length}: ${currentName}`;
    } else if (cancelledCount > 0) {
      detailLabel = `${successfulCount} succeeded, ${failedCount} failed, ${cancelledCount} cancelled`;
    } else if (failedCount > 0) {
      detailLabel = `${successfulCount} succeeded, ${failedCount} failed`;
    } else if (successfulCount === items.length) {
      detailLabel = `${successfulCount} of ${items.length} items completed`;
    }

    return { percent, statusLabel, detailLabel };
  }, [items, running]);

  async function addFiles() {
    const selected = await open({
      multiple: true,
      directory: false,
      filters: [
        {
          name: "Media",
          extensions: [
            "mp4",
            "mov",
            "mkv",
            "webm",
            "avi",
            "m4v",
            "mp3",
            "wav",
            "m4a",
            "aac",
            "flac",
            "ogg",
          ],
        },
      ],
    });
    const paths = normalizeSelection(selected);
    if (paths.length === 0) return;
    const next = await api.scanPaths(paths);
    await appendItems(next);
  }

  async function addFolder() {
    const selected = await open({ directory: true, multiple: false });
    const paths = normalizeSelection(selected);
    if (paths.length === 0) return;
    const next = await api.scanPaths(paths);
    await appendItems(next);
  }

  function openSavePresetDialog() {
    if (!selectedItem) return;
    const suggestedName =
      selectedItem.config.presetName ||
      `${selectedItem.config.input.path.split(/[\\/]/).pop() ?? "Preset"} preset`;
    setPresetDraftName(suggestedName);
    setPresetDialogError(null);
    setPresetDialogOpen(true);
  }

  function closeSavePresetDialog() {
    if (savingPreset) return;
    setPresetDialogOpen(false);
    setPresetDialogError(null);
  }

  async function savePreset() {
    if (!selectedItem) return;
    const trimmedName = presetDraftName.trim();
    if (!trimmedName) {
      setPresetDialogError("Enter a preset name.");
      return;
    }
    try {
      setSavingPreset(true);
      const userPresets = await api.saveUserPreset(
        trimmedName,
        selectedItem.config,
      );
      setBootstrap((current) =>
        current ? { ...current, userPresets } : current,
      );
      setPresetDialogOpen(false);
      setPresetDialogError(null);
      setLogs((current) =>
        [`Saved preset: ${trimmedName}`, ...current].slice(0, 60),
      );
    } catch (error) {
      const message = `Failed to save preset: ${String(error)}`;
      setPresetDialogError(message);
      setLogs((current) => [message, ...current].slice(0, 60));
    } finally {
      setSavingPreset(false);
    }
  }

  async function runQueue() {
    if (items.length === 0) return;
    setLastCompletedId(null);
    setHasLaunchedRun(true);
    setRunning(true);
    try {
      await api.runQueue(items.map((item) => item.config));
    } catch (error) {
      setRunning(false);
      setLogs((current) =>
        [`Failed to start queue: ${String(error)}`, ...current].slice(0, 60),
      );
    }
  }

  async function stopQueue() {
    try {
      await api.stopQueue();
    } catch (error) {
      setLogs((current) =>
        [`Failed to stop queue: ${String(error)}`, ...current].slice(0, 60),
      );
    }
  }

  async function updateSelected(config: JobConfig) {
    if (!selectedItem) return;
    const nextItems = items.map((item) =>
      item.id === selectedItem.id
        ? {
            ...item,
            config,
          }
        : item,
    );
    await replanQueue(nextItems);
  }

  async function appendItems(next: QueueItemPreview[]) {
    const merged = [...items, ...next];
    await replanQueue(merged);
  }

  async function replanQueue(nextItems: QueueItemPreview[]) {
    const rebuilt = await api.rebuildPreviews(
      nextItems.map((item) => item.config),
    );
    setItems(
      rebuilt.map((item, index) => ({
        ...item,
        id: nextItems[index]?.id ?? item.id,
        state: nextItems[index]?.state ?? item.state,
        progressPercent:
          nextItems[index]?.progressPercent ?? item.progressPercent,
        lastLog: nextItems[index]?.lastLog ?? item.lastLog,
      })),
    );
    setSelectedId((current) => current ?? nextItems[0]?.id ?? null);
  }

  async function removeItem(id: string) {
    const nextItems = items.filter((item) => item.id !== id);
    if (nextItems.length === 0) {
      setItems([]);
      setSelectedId(null);
      return;
    }
    if (selectedId === id) {
      setSelectedId(nextItems[0]?.id ?? null);
    }
    await replanQueue(nextItems);
  }

  function resetRun() {
    setItems([]);
    setSelectedId(null);
    setLogs([]);
    setRunning(false);
    setLastCompletedId(null);
    setHasLaunchedRun(false);
  }

  const showProgressFirst = hasLaunchedRun || running;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),transparent_25%),radial-gradient(circle_at_right,_rgba(244,114,182,0.16),transparent_22%),linear-gradient(180deg,#020617_0%,#0f172a_45%,#111827_100%)] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <TopBar
          toolStatus={bootstrap?.toolStatus ?? null}
          onAddFiles={() => void addFiles()}
          onAddFolder={() => void addFolder()}
          onRunOrStop={() => void (running ? stopQueue() : runQueue())}
          onSavePreset={openSavePresetDialog}
          isRunning={running}
          canRun={items.length > 0}
          canSavePreset={selectedItem !== null}
        />

        {showProgressFirst ? (
          <ProgressPanel
            isRunning={running}
            percent={progressSummary.percent}
            statusLabel={progressSummary.statusLabel}
            detailLabel={progressSummary.detailLabel}
            logs={logs}
            completedItem={lastCompletedItem}
            onReset={resetRun}
            canReset={
              !running &&
              (items.length > 0 || logs.length > 0 || hasLaunchedRun)
            }
          />
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.05fr_1fr_1.15fr]">
          <QueuePanel
            items={items}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onRemove={(id) => void removeItem(id)}
          />
          <InspectorPanel
            item={selectedItem}
            builtInPresets={bootstrap?.builtInPresets ?? []}
            userPresets={bootstrap?.userPresets ?? ([] as UserPreset[])}
            onChange={(config) => void updateSelected(config)}
          />
          <PreviewPanel item={selectedItem} />
        </div>

        {!showProgressFirst ? (
          <ProgressPanel
            isRunning={running}
            percent={progressSummary.percent}
            statusLabel={progressSummary.statusLabel}
            detailLabel={progressSummary.detailLabel}
            logs={logs}
            completedItem={lastCompletedItem}
            onReset={resetRun}
            canReset={!running && (items.length > 0 || logs.length > 0)}
          />
        ) : null}
      </div>
      {presetDialogOpen ? (
        <SavePresetDialog
          value={presetDraftName}
          error={presetDialogError}
          saving={savingPreset}
          onChange={setPresetDraftName}
          onCancel={closeSavePresetDialog}
          onSubmit={() => void savePreset()}
        />
      ) : null}
    </div>
  );
}

function normalizeSelection(selection: string | string[] | null): string[] {
  if (!selection) return [];
  return Array.isArray(selection) ? selection : [selection];
}

function SavePresetDialog({
  value,
  error,
  saving,
  onChange,
  onCancel,
  onSubmit,
}: {
  value: string;
  error: string | null;
  saving: boolean;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(17,24,39,0.96))] p-6 shadow-[0_30px_120px_-40px_rgba(14,116,144,0.75)]">
        <div className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">
          Custom Preset
        </div>
        <h2 className="mt-3 text-2xl font-semibold text-white">
          Save Current Settings
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-300/85">
          Give this preset a name so you can reapply the same conversion
          settings later.
        </p>

        <label className="mt-5 block">
          <span className="text-xs uppercase tracking-[0.25em] text-slate-400">
            Preset name
          </span>
          <input
            autoFocus
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onSubmit();
              if (event.key === "Escape") onCancel();
            }}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
            placeholder="My favorite export"
          />
        </label>

        {error ? (
          <div className="mt-3 rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={saving}
            className="rounded-full border border-cyan-200/45 bg-gradient-to-br from-cyan-400/20 via-sky-400/10 to-fuchsia-400/16 px-4 py-2 text-sm font-medium text-white transition hover:border-cyan-200/70 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Preset"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
