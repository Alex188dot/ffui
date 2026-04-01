export type InputKind = "Video" | "Audio";

export type JobType =
  | "VideoConvert"
  | "AudioConvert"
  | "ExtractAudio"
  | "TrimClip"
  | "ResizeVideo"
  | "CompressForSharing"
  | "MakeGif"
  | "BatchConvertFolder";

export type QualityProfile = "Best" | "Good" | "Small" | "Fast";
export type TargetProfile = "Web" | "Apple" | "Universal" | "Discord" | "Email";
export type VideoFormat = "Mp4H264" | "Mp4Hevc" | "Gif";
export type AudioFormat = "Mp3" | "Aac" | "Wav" | "Flac";
export type ResizePreset = "Source" | "P720" | "P1080" | "Square720" | "Portrait1080x1920";
export type ExecutionState = "Queued" | "Running" | "Succeeded" | "Failed" | "Cancelled";

export interface MediaMetadata {
  durationSeconds: number | null;
  hasVideo: boolean;
  hasAudio: boolean;
  width: number | null;
  height: number | null;
  sampleRate: number | null;
  videoCodec: string | null;
  audioCodec: string | null;
}

export interface InputSource {
  path: string;
  kind: InputKind;
  metadata: MediaMetadata | null;
  isFromFolderBatch: boolean;
  batchRoot: string | null;
}

export interface TrimRange {
  startSeconds: number;
  durationSeconds: number;
}

export interface JobConfig {
  input: InputSource;
  jobType: JobType;
  quality: QualityProfile;
  target: TargetProfile;
  videoFormat: VideoFormat;
  audioFormat: AudioFormat;
  resize: ResizePreset;
  trim: TrimRange | null;
  audioBitrateKbps: number;
  gifFps: number;
  presetName: string | null;
}

export interface OutputPlan {
  outputPath: string;
  extension: string;
  container: string;
}

export interface GeneratedCommand {
  program: string;
  args: string[];
  rendered: string;
}

export interface QueueItemPreview {
  id: string;
  config: JobConfig;
  outputPlan: OutputPlan;
  command: GeneratedCommand;
  summary: string;
  state: ExecutionState;
  progressPercent: number | null;
  lastLog: string | null;
}

export interface ToolStatus {
  ready: boolean;
  message: string;
}

export interface BuiltInPreset {
  name: string;
  jobType: JobType;
  quality: QualityProfile;
  target: TargetProfile;
  videoFormat: VideoFormat;
  audioFormat: AudioFormat;
  resize: ResizePreset;
}

export interface UserPreset {
  id: string;
  name: string;
  config: JobConfig;
}

export interface BootstrapPayload {
  toolStatus: ToolStatus;
  builtInPresets: BuiltInPreset[];
  userPresets: UserPreset[];
}

export interface ProgressPayload {
  index: number;
  percent: number | null;
  speed: number | null;
  processedSeconds: number | null;
}

export interface StatusPayload {
  index: number;
  state: ExecutionState;
  message: string | null;
}

export interface LogPayload {
  index: number;
  line: string;
}
