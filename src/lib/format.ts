import type { AudioFormat, JobType, QualityProfile, ResizePreset, TargetProfile, VideoFormat } from "../types";

export const labels = {
  jobType: {
    VideoConvert: "Video Convert",
    AudioConvert: "Audio Convert",
    ExtractAudio: "Extract Audio",
    TrimClip: "Trim Clip",
    ResizeVideo: "Resize Video",
    CompressForSharing: "Compress for Sharing",
    MakeGif: "Make GIF",
    BatchConvertFolder: "Batch Convert Folder",
  } satisfies Record<JobType, string>,
  quality: {
    Best: "Best quality",
    Good: "Good",
    Small: "Smallest file",
    Fast: "Fast encode",
  } satisfies Record<QualityProfile, string>,
  target: {
    Web: "Web",
    Apple: "Apple",
    Universal: "Play everywhere",
    Discord: "Discord",
    Email: "Email",
  } satisfies Record<TargetProfile, string>,
  videoFormat: {
    Mp4H264: "MP4 H.264",
    Mp4Hevc: "MP4 HEVC",
    Gif: "GIF",
  } satisfies Record<VideoFormat, string>,
  audioFormat: {
    Mp3: "MP3",
    Aac: "AAC",
    Wav: "WAV",
    Flac: "FLAC",
  } satisfies Record<AudioFormat, string>,
  resize: {
    Source: "Source size",
    P720: "1280x720",
    P1080: "1920x1080",
    Square720: "720x720",
    Portrait1080x1920: "1080x1920",
  } satisfies Record<ResizePreset, string>,
};

export const jobTypes = Object.keys(labels.jobType) as JobType[];
export const qualityProfiles = Object.keys(labels.quality) as QualityProfile[];
export const targetProfiles = Object.keys(labels.target) as TargetProfile[];
export const videoFormats = Object.keys(labels.videoFormat) as VideoFormat[];
export const audioFormats = Object.keys(labels.audioFormat) as AudioFormat[];
export const resizePresets = Object.keys(labels.resize) as ResizePreset[];

export function fileName(path: string) {
  return path.split(/[\\/]/).pop() ?? path;
}
