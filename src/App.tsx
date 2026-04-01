import { useEffect, useMemo, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { api, events } from "./lib/tauri";
import type { BootstrapPayload, JobConfig, QueueItemPreview, UserPreset } from "./types";
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

  useEffect(() => {
    api.bootstrap().then(setBootstrap).catch((error) => {
      setLogs((current) => [`Failed to bootstrap app: ${String(error)}`, ...current]);
    });

    const disposers = [
      events.onLog((payload) => {
        setLogs((current) => [`[${payload.index + 1}] ${payload.line}`, ...current].slice(0, 60));
        setItems((current) =>
          current.map((item, index) => (index === payload.index ? { ...item, lastLog: payload.line } : item)),
        );
      }),
      events.onProgress((payload) => {
        setItems((current) =>
          current.map((item, index) =>
            index === payload.index
              ? { ...item, progressPercent: payload.percent ?? item.progressPercent, state: "Running" }
              : item,
          ),
        );
      }),
      events.onStatus((payload) => {
        setLogs((current) =>
          [`[${payload.index + 1}] ${payload.state}${payload.message ? `: ${payload.message}` : ""}`, ...current].slice(0, 60),
        );
        setItems((current) => {
          const next = current.map((item, index) =>
            index === payload.index
              ? {
                  ...item,
                  state: payload.state,
                  lastLog: payload.message,
                  progressPercent: payload.state === "Succeeded" ? 100 : item.progressPercent,
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
  const lastCompletedItem = items.find((item) => item.id === lastCompletedId) ?? null;
  const progressSummary = useMemo(() => {
    if (items.length === 0) {
      return {
        percent: null as number | null,
        statusLabel: running ? "Running" : "Idle",
        detailLabel: "Add files to start a queue.",
      };
    }

    const completedCount = items.filter((item) =>
      item.state === "Succeeded" || item.state === "Failed" || item.state === "Cancelled",
    ).length;
    const successfulCount = items.filter((item) => item.state === "Succeeded").length;
    const failedCount = items.filter((item) => item.state === "Failed").length;
    const cancelledCount = items.filter((item) => item.state === "Cancelled").length;
    const runningItem = items.find((item) => item.state === "Running") ?? null;
    const runningContribution = runningItem ? (runningItem.progressPercent ?? 0) / 100 : 0;
    const percent = Math.min(100, ((completedCount + runningContribution) / items.length) * 100);

    let statusLabel = "Idle";
    if (running) statusLabel = "Running";
    else if (cancelledCount > 0) statusLabel = "Cancelled";
    else if (failedCount > 0) statusLabel = "Finished with errors";
    else if (successfulCount === items.length) statusLabel = "Completed";

    let detailLabel = `${completedCount} of ${items.length} items processed`;
    if (runningItem) {
      const currentIndex = items.findIndex((item) => item.id === runningItem.id) + 1;
      const currentName = runningItem.config.input.path.split(/[\\/]/).pop() ?? "current file";
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
          extensions: ["mp4", "mov", "mkv", "webm", "avi", "m4v", "mp3", "wav", "m4a", "aac", "flac", "ogg"],
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

  async function savePreset() {
    if (!selectedItem) return;
    const name = window.prompt("Preset name");
    if (!name) return;
    const userPresets = await api.saveUserPreset(name, selectedItem.config);
    setBootstrap((current) => (current ? { ...current, userPresets } : current));
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
      setLogs((current) => [`Failed to start queue: ${String(error)}`, ...current].slice(0, 60));
    }
  }

  async function stopQueue() {
    try {
      await api.stopQueue();
    } catch (error) {
      setLogs((current) => [`Failed to stop queue: ${String(error)}`, ...current].slice(0, 60));
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
    const rebuilt = await api.rebuildPreviews(nextItems.map((item) => item.config));
    setItems(
      rebuilt.map((item, index) => ({
        ...item,
        id: nextItems[index]?.id ?? item.id,
        state: nextItems[index]?.state ?? item.state,
        progressPercent: nextItems[index]?.progressPercent ?? item.progressPercent,
        lastLog: nextItems[index]?.lastLog ?? item.lastLog,
      })),
    );
    setSelectedId((current) => current ?? nextItems[0]?.id ?? null);
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
          onSavePreset={() => void savePreset()}
          isRunning={running}
          canRun={items.length > 0}
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
            canReset={!running && (items.length > 0 || logs.length > 0 || hasLaunchedRun)}
          />
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.05fr_1fr_1.15fr]">
          <QueuePanel items={items} selectedId={selectedId} onSelect={setSelectedId} />
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
    </div>
  );
}

function normalizeSelection(selection: string | string[] | null): string[] {
  if (!selection) return [];
  return Array.isArray(selection) ? selection : [selection];
}

export default App;
