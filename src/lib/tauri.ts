import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type {
  BootstrapPayload,
  JobConfig,
  LogPayload,
  ProgressPayload,
  QueueItemPreview,
  StatusPayload,
  UserPreset,
} from "../types";

export const api = {
  bootstrap: () => invoke<BootstrapPayload>("bootstrap"),
  scanPaths: (paths: string[]) => invoke<QueueItemPreview[]>("scan_paths", { paths }),
  refreshPreview: (config: JobConfig) => invoke<QueueItemPreview>("refresh_preview", { config }),
  saveUserPreset: (name: string, config: JobConfig) =>
    invoke<UserPreset[]>("save_user_preset", { name, config }),
  deleteUserPreset: (id: string) => invoke<UserPreset[]>("delete_user_preset", { id }),
  runQueue: (configs: JobConfig[]) => invoke<void>("run_queue", { configs }),
  stopQueue: () => invoke<void>("stop_queue"),
};

export const events = {
  onProgress: (handler: (payload: ProgressPayload) => void) =>
    listen<ProgressPayload>("ffui://job-progress", (event) => handler(event.payload)),
  onStatus: (handler: (payload: StatusPayload) => void) =>
    listen<StatusPayload>("ffui://job-status", (event) => handler(event.payload)),
  onLog: (handler: (payload: LogPayload) => void) =>
    listen<LogPayload>("ffui://job-log", (event) => handler(event.payload)),
};
