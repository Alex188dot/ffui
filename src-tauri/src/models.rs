use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaMetadata {
    pub duration_seconds: Option<f64>,
    pub has_video: bool,
    pub has_audio: bool,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub sample_rate: Option<u32>,
    pub video_codec: Option<String>,
    pub audio_codec: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum InputKind {
    Video,
    Audio,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InputSource {
    pub path: String,
    pub kind: InputKind,
    pub metadata: Option<MediaMetadata>,
    pub is_from_folder_batch: bool,
    pub batch_root: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum JobType {
    VideoConvert,
    AudioConvert,
    ExtractAudio,
    TrimClip,
    ResizeVideo,
    CompressForSharing,
    MakeGif,
    BatchConvertFolder,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum QualityProfile {
    Best,
    Good,
    Small,
    Fast,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TargetProfile {
    Web,
    Apple,
    Universal,
    Discord,
    Email,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum VideoFormat {
    Mp4H264,
    Mp4Hevc,
    Gif,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AudioFormat {
    Mp3,
    Aac,
    Wav,
    Flac,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ResizePreset {
    Source,
    P720,
    P1080,
    Square720,
    Portrait1080x1920,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrimRange {
    pub start_seconds: u64,
    pub duration_seconds: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JobConfig {
    pub input: InputSource,
    pub job_type: JobType,
    pub quality: QualityProfile,
    pub target: TargetProfile,
    pub video_format: VideoFormat,
    pub audio_format: AudioFormat,
    pub resize: ResizePreset,
    pub trim: Option<TrimRange>,
    pub audio_bitrate_kbps: u32,
    pub gif_fps: u32,
    pub preset_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OutputPlan {
    pub output_path: String,
    pub extension: String,
    pub container: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedCommand {
    pub program: String,
    pub args: Vec<String>,
    pub rendered: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ExecutionState {
    Queued,
    Running,
    Succeeded,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueueItemPreview {
    pub id: String,
    pub config: JobConfig,
    pub output_plan: OutputPlan,
    pub command: GeneratedCommand,
    pub summary: String,
    pub state: ExecutionState,
    pub progress_percent: Option<f64>,
    pub last_log: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolStatus {
    pub ready: bool,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BuiltInPreset {
    pub name: String,
    pub job_type: JobType,
    pub quality: QualityProfile,
    pub target: TargetProfile,
    pub video_format: VideoFormat,
    pub audio_format: AudioFormat,
    pub resize: ResizePreset,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserPreset {
    pub id: String,
    pub name: String,
    pub config: JobConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BootstrapPayload {
    pub tool_status: ToolStatus,
    pub built_in_presets: Vec<BuiltInPreset>,
    pub user_presets: Vec<UserPreset>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ProgressPayload {
    pub index: i32,
    pub percent: Option<f64>,
    pub speed: Option<f64>,
    pub processed_seconds: Option<f64>,
}

#[derive(Debug, Clone, Serialize)]
pub struct StatusPayload {
    pub index: i32,
    pub state: ExecutionState,
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct LogPayload {
    pub index: i32,
    pub line: String,
}
