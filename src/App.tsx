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
            index === payload.index ? { ...item, progressPercent: payload.percent, state: "Running" } : item,
          ),
        );
      }),
      events.onStatus((payload) => {
        setLogs((current) =>
          [`[${payload.index + 1}] ${payload.state}${payload.message ? `: ${payload.message}` : ""}`, ...current].slice(0, 60),
        );
        setItems((current) => {
          const next = current.map((item, index) =>
            index === payload.index ? { ...item, state: payload.state, lastLog: payload.message } : item,
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
  const currentPercent = useMemo(() => {
    if (items.length === 0) return null;
    const values = items.map((item) => item.progressPercent ?? 0);
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }, [items]);

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
    appendItems(next);
  }

  async function addFolder() {
    const selected = await open({ directory: true, multiple: false });
    const paths = normalizeSelection(selected);
    if (paths.length === 0) return;
    const next = await api.scanPaths(paths);
    appendItems(next);
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
    const refreshed = await api.refreshPreview(config);
    setItems((current) =>
      current.map((item) =>
        item.id === selectedItem.id
          ? {
              ...refreshed,
              id: item.id,
              state: item.state,
              progressPercent: item.progressPercent,
              lastLog: item.lastLog,
            }
          : item,
      ),
    );
  }

  function appendItems(next: QueueItemPreview[]) {
    setItems((current) => {
      const merged = [...current, ...next];
      if (!selectedId && merged[0]) {
        setSelectedId(merged[0].id);
      }
      return merged;
    });
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
            percent={currentPercent}
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
            percent={currentPercent}
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
