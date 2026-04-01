use crate::errors::AppError;
use crate::models::{
    AudioFormat, ExecutionState, GeneratedCommand, InputKind, InputSource, JobConfig, JobType,
    LogPayload, MediaMetadata, OutputPlan, ProgressPayload, QualityProfile, QueueItemPreview,
    ResizePreset, StatusPayload, TargetProfile, ToolStatus, VideoFormat,
};
use crate::state::AppState;
use serde::Deserialize;
use std::{
    collections::HashSet,
    path::{Path, PathBuf},
};
use tauri::{AppHandle, Emitter, Manager};
use tokio::{
    io::{AsyncBufReadExt, BufReader},
    process::Command,
};
use uuid::Uuid;

pub fn discover_tools() -> ToolStatus {
    let ffmpeg = resolve_binary("ffmpeg");
    let ffprobe = resolve_binary("ffprobe");
    match (ffmpeg, ffprobe) {
        (Some(_), Some(_)) => ToolStatus {
            ready: true,
            message: "ffmpeg and ffprobe are available in PATH.".to_string(),
        },
        _ => ToolStatus {
            ready: false,
            message: "Install ffmpeg and ffprobe first. macOS: brew install ffmpeg. Ubuntu/Debian: sudo apt install ffmpeg.".to_string(),
        },
    }
}

pub async fn scan_paths(paths: Vec<String>) -> Result<Vec<QueueItemPreview>, AppError> {
    let mut items = Vec::new();
    let mut reserved_outputs = HashSet::new();
    for path in paths {
        let discovered = discover_inputs(Path::new(&path))?;
        for input in discovered {
            items.push(preview_for_config_with_reserved(
                default_config(input).await?,
                &mut reserved_outputs,
            )?);
        }
    }
    Ok(items)
}

pub fn preview_for_config(config: JobConfig) -> Result<QueueItemPreview, AppError> {
    preview_for_config_with_reserved(config, &mut HashSet::new())
}

fn preview_for_config_with_reserved(
    config: JobConfig,
    reserved_outputs: &mut HashSet<PathBuf>,
) -> Result<QueueItemPreview, AppError> {
    let output_plan = plan_output(&config, reserved_outputs);
    let command = build_command(&config, &output_plan);
    Ok(QueueItemPreview {
        id: Uuid::new_v4().to_string(),
        summary: summary(&config, &output_plan),
        config,
        output_plan,
        command,
        state: ExecutionState::Queued,
        progress_percent: None,
        last_log: None,
    })
}

pub async fn run_queue(app: AppHandle, configs: Vec<JobConfig>) -> Result<(), AppError> {
    let mut reserved_outputs = HashSet::new();
    for (index, config) in configs.into_iter().enumerate() {
        if cancel_requested(&app)? {
            app.emit(
                "ffui://job-status",
                StatusPayload {
                    index: -1,
                    state: ExecutionState::Cancelled,
                    message: Some("Queue stopped".to_string()),
                },
            )
            .ok();
            return Ok(());
        }

        app.emit(
            "ffui://job-status",
            StatusPayload {
                index: index as i32,
                state: ExecutionState::Running,
                message: Some("Starting ffmpeg".to_string()),
            },
        )
        .ok();

        let output = plan_output(&config, &mut reserved_outputs);
        let command = build_command(&config, &output);
        let mut child = Command::new(&command.program)
            .args(&command.args)
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()?;

        {
            let app_state = app.state::<AppState>();
            let mut current_pid = app_state
                .current_pid
                .lock()
                .map_err(|_| AppError::Config("failed to lock app state".to_string()))?;
            *current_pid = child.id();
        }

        if let Some(stdout) = child.stdout.take() {
            let app_handle = app.clone();
            let duration = config.input.metadata.as_ref().and_then(|meta| meta.duration_seconds);
            tokio::spawn(async move {
                let mut reader = BufReader::new(stdout).lines();
                while let Ok(Some(line)) = reader.next_line().await {
                    if let Some((percent, speed, processed)) = parse_progress_line(&line, duration) {
                        app_handle
                            .emit(
                                "ffui://job-progress",
                                ProgressPayload {
                                    index: index as i32,
                                    percent,
                                    speed,
                                    processed_seconds: processed,
                                },
                            )
                            .ok();
                    }
                }
            });
        }

        if let Some(stderr) = child.stderr.take() {
            let app_handle = app.clone();
            tokio::spawn(async move {
                let mut reader = BufReader::new(stderr).lines();
                while let Ok(Some(line)) = reader.next_line().await {
                    app_handle
                        .emit(
                            "ffui://job-log",
                            LogPayload {
                                index: index as i32,
                                line,
                            },
                        )
                        .ok();
                }
            });
        }

        let status = child.wait().await?;
        {
            let app_state = app.state::<AppState>();
            let mut current_pid = app_state
                .current_pid
                .lock()
                .map_err(|_| AppError::Config("failed to lock app state".to_string()))?;
            *current_pid = None;
        }

        if cancel_requested(&app)? {
            app.emit(
                "ffui://job-status",
                StatusPayload {
                    index: index as i32,
                    state: ExecutionState::Cancelled,
                    message: Some("Stopped by user".to_string()),
                },
            )
            .ok();
            app.emit(
                "ffui://job-status",
                StatusPayload {
                    index: -1,
                    state: ExecutionState::Cancelled,
                    message: Some("Queue stopped".to_string()),
                },
            )
            .ok();
            return Ok(());
        }

        let state = if status.success() {
            ExecutionState::Succeeded
        } else {
            ExecutionState::Failed
        };

        app.emit(
            "ffui://job-status",
            StatusPayload {
                index: index as i32,
                state,
                message: Some(format!("Exited with status {status}")),
            },
        )
        .ok();
    }

    app.emit(
        "ffui://job-status",
        StatusPayload {
            index: -1,
            state: ExecutionState::Succeeded,
            message: Some("Queue finished".to_string()),
        },
    )
    .ok();

    Ok(())
}

pub fn stop_process(pid: u32) -> Result<(), AppError> {
    #[cfg(target_os = "windows")]
    let status = std::process::Command::new("taskkill")
        .args(["/PID", &pid.to_string(), "/T", "/F"])
        .status()?;

    #[cfg(not(target_os = "windows"))]
    let status = std::process::Command::new("kill")
        .args(["-TERM", &pid.to_string()])
        .status()?;

    if status.success() {
        Ok(())
    } else {
        Err(AppError::Ffmpeg(format!("failed to stop ffmpeg process {pid}")))
    }
}

fn cancel_requested(app: &AppHandle) -> Result<bool, AppError> {
    let app_state = app.state::<AppState>();
    let cancel_requested = app_state
        .cancel_requested
        .lock()
        .map_err(|_| AppError::Config("failed to lock app state".to_string()))?;
    Ok(*cancel_requested)
}

async fn default_config(mut input: InputSource) -> Result<JobConfig, AppError> {
    input.metadata = probe(&input.path).await.ok();
    let job_type = match input.kind {
        InputKind::Video => {
            if input.is_from_folder_batch {
                JobType::BatchConvertFolder
            } else {
                JobType::CompressForSharing
            }
        }
        InputKind::Audio => JobType::AudioConvert,
    };
    Ok(JobConfig {
        input,
        job_type,
        quality: QualityProfile::Good,
        target: crate::models::TargetProfile::Web,
        video_format: VideoFormat::Mp4H264,
        audio_format: AudioFormat::Mp3,
        resize: ResizePreset::P1080,
        trim: None,
        audio_bitrate_kbps: 192,
        gif_fps: 12,
        preset_name: None,
    })
}

fn discover_inputs(path: &Path) -> Result<Vec<InputSource>, AppError> {
    if path.is_dir() {
        let mut items = Vec::new();
        walk_folder(path, path, &mut items)?;
        return Ok(items);
    }

    Ok(vec![InputSource {
        path: path.to_string_lossy().to_string(),
        kind: detect_kind(path)?,
        metadata: None,
        is_from_folder_batch: false,
        batch_root: None,
    }])
}

fn walk_folder(root: &Path, current: &Path, items: &mut Vec<InputSource>) -> Result<(), AppError> {
    for entry in std::fs::read_dir(current)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_dir() {
            walk_folder(root, &path, items)?;
        } else if let Ok(kind) = detect_kind(&path) {
            items.push(InputSource {
                path: path.to_string_lossy().to_string(),
                kind,
                metadata: None,
                is_from_folder_batch: true,
                batch_root: Some(root.to_string_lossy().to_string()),
            });
        }
    }
    Ok(())
}

fn detect_kind(path: &Path) -> Result<InputKind, AppError> {
    let ext = path
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();
    match ext.as_str() {
        "mp4" | "mov" | "mkv" | "webm" | "avi" | "m4v" => Ok(InputKind::Video),
        "mp3" | "wav" | "m4a" | "aac" | "flac" | "ogg" => Ok(InputKind::Audio),
        _ => Err(AppError::UnsupportedExtension(path.display().to_string())),
    }
}

fn resolve_binary(name: &str) -> Option<PathBuf> {
    std::env::var_os("PATH").and_then(|paths| {
        std::env::split_paths(&paths)
            .map(|path| path.join(name))
            .find(|candidate| candidate.exists())
    })
}

#[derive(Debug, Deserialize)]
struct ProbeResponse {
    streams: Vec<ProbeStream>,
    format: ProbeFormat,
}

#[derive(Debug, Deserialize)]
struct ProbeStream {
    codec_type: Option<String>,
    width: Option<u32>,
    height: Option<u32>,
    codec_name: Option<String>,
    sample_rate: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ProbeFormat {
    duration: Option<String>,
}

async fn probe(path: &str) -> Result<MediaMetadata, AppError> {
    let output = Command::new("ffprobe")
        .arg("-v")
        .arg("error")
        .arg("-show_streams")
        .arg("-show_format")
        .arg("-print_format")
        .arg("json")
        .arg(path)
        .output()
        .await?;
    if !output.status.success() {
        return Err(AppError::Probe(
            String::from_utf8_lossy(&output.stderr).trim().to_string(),
        ));
    }
    let parsed: ProbeResponse = serde_json::from_slice(&output.stdout)?;
    let mut metadata = MediaMetadata {
        duration_seconds: parsed.format.duration.and_then(|value| value.parse().ok()),
        has_video: false,
        has_audio: false,
        width: None,
        height: None,
        sample_rate: None,
        video_codec: None,
        audio_codec: None,
    };
    for stream in parsed.streams {
        match stream.codec_type.as_deref() {
            Some("video") => {
                metadata.has_video = true;
                metadata.width = stream.width;
                metadata.height = stream.height;
                metadata.video_codec = stream.codec_name;
            }
            Some("audio") => {
                metadata.has_audio = true;
                metadata.sample_rate = stream.sample_rate.and_then(|value| value.parse().ok());
                metadata.audio_codec = stream.codec_name;
            }
            _ => {}
        }
    }
    Ok(metadata)
}

fn plan_output(config: &JobConfig, reserved_outputs: &mut HashSet<PathBuf>) -> OutputPlan {
    let input_path = Path::new(&config.input.path);
    let stem = input_path
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("output");
    let suffix = match config.job_type {
        JobType::VideoConvert => "video",
        JobType::AudioConvert => "audio",
        JobType::ExtractAudio => "extract",
        JobType::TrimClip => "trim",
        JobType::ResizeVideo => "resize",
        JobType::CompressForSharing => "share",
        JobType::MakeGif => "gif",
        JobType::BatchConvertFolder => "batch",
    };
    let ext = match config.job_type {
        JobType::AudioConvert | JobType::ExtractAudio => match config.audio_format {
            AudioFormat::Mp3 => "mp3",
            AudioFormat::Aac => "m4a",
            AudioFormat::Wav => "wav",
            AudioFormat::Flac => "flac",
        },
        JobType::MakeGif => "gif",
        _ => match config.video_format {
            VideoFormat::Mp4H264 | VideoFormat::Mp4Hevc => "mp4",
            VideoFormat::Gif => "gif",
        },
    };
    let output_path = reserve_output_path(
        input_path
        .parent()
        .unwrap_or_else(|| Path::new("."))
        .join(format!("{stem}-{suffix}.{ext}")),
        reserved_outputs,
    );
    OutputPlan {
        output_path: output_path.to_string_lossy().to_string(),
        extension: ext.to_string(),
        container: ext.to_string(),
    }
}

fn build_command(config: &JobConfig, output: &OutputPlan) -> GeneratedCommand {
    let mut args = vec![
        "-n".to_string(),
        "-i".to_string(),
        config.input.path.clone(),
    ];
    if let Some(trim) = &config.trim {
        args.splice(
            0..0,
            vec![
                "-ss".to_string(),
                trim.start_seconds.to_string(),
                "-t".to_string(),
                trim.duration_seconds.to_string(),
            ],
        );
    }
    match config.job_type {
        JobType::AudioConvert | JobType::ExtractAudio => {
            args.push("-vn".to_string());
            apply_audio(&mut args, config);
        }
        JobType::TrimClip => {
            apply_video(&mut args, config);
        }
        JobType::MakeGif => {
            let scale = match config.resize {
                ResizePreset::P720 => "1280:720",
                ResizePreset::P1080 => "1920:1080",
                ResizePreset::Square720 => "720:720",
                ResizePreset::Portrait1080x1920 => "1080:1920",
                ResizePreset::Source => "640:-1",
            };
            args.extend([
                "-vf".to_string(),
                format!("fps={},scale={scale}:flags=lanczos", config.gif_fps),
                "-an".to_string(),
            ]);
        }
        _ => apply_video(&mut args, config),
    }
    args.extend([
        "-progress".to_string(),
        "pipe:1".to_string(),
        "-nostats".to_string(),
        output.output_path.clone(),
    ]);
    let rendered = std::iter::once("ffmpeg".to_string())
        .chain(args.iter().cloned())
        .collect::<Vec<_>>()
        .join(" ");
    GeneratedCommand {
        program: "ffmpeg".to_string(),
        args,
        rendered,
    }
}

fn apply_video(args: &mut Vec<String>, config: &JobConfig) {
    match config.video_format {
        VideoFormat::Mp4H264 => args.extend([
            "-c:v".to_string(),
            "libx264".to_string(),
            "-pix_fmt".to_string(),
            "yuv420p".to_string(),
            "-crf".to_string(),
            target_crf(config).to_string(),
            "-preset".to_string(),
            preset(&config.quality).to_string(),
        ]),
        VideoFormat::Mp4Hevc => args.extend([
            "-c:v".to_string(),
            "libx265".to_string(),
            "-pix_fmt".to_string(),
            "yuv420p".to_string(),
            "-crf".to_string(),
            target_crf(config).to_string(),
            "-preset".to_string(),
            preset(&config.quality).to_string(),
        ]),
        VideoFormat::Gif => {}
    }
    match config.resize {
        ResizePreset::P720 => args.extend(["-vf".to_string(), "scale=1280:720:force_original_aspect_ratio=decrease".to_string()]),
        ResizePreset::P1080 => args.extend(["-vf".to_string(), "scale=1920:1080:force_original_aspect_ratio=decrease".to_string()]),
        ResizePreset::Square720 => args.extend(["-vf".to_string(), "scale=720:720:force_original_aspect_ratio=decrease".to_string()]),
        ResizePreset::Portrait1080x1920 => args.extend(["-vf".to_string(), "scale=1080:1920:force_original_aspect_ratio=decrease".to_string()]),
        ResizePreset::Source => {}
    }
    apply_target_video_constraints(args, config);
    args.extend([
        "-c:a".to_string(),
        "aac".to_string(),
        "-b:a".to_string(),
        format!("{}k", target_audio_bitrate(config)),
    ]);
}

fn apply_audio(args: &mut Vec<String>, config: &JobConfig) {
    match config.audio_format {
        AudioFormat::Mp3 => args.extend(["-c:a".to_string(), "libmp3lame".to_string(), "-b:a".to_string(), format!("{}k", target_audio_bitrate(config).min(config.audio_bitrate_kbps))]),
        AudioFormat::Aac => args.extend(["-c:a".to_string(), "aac".to_string(), "-b:a".to_string(), format!("{}k", target_audio_bitrate(config).min(config.audio_bitrate_kbps))]),
        AudioFormat::Wav => args.extend(["-c:a".to_string(), "pcm_s16le".to_string()]),
        AudioFormat::Flac => args.extend(["-c:a".to_string(), "flac".to_string()]),
    }
}

fn summary(config: &JobConfig, output: &OutputPlan) -> String {
    let input = Path::new(&config.input.path)
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("input");
    match config.job_type {
        JobType::VideoConvert => format!("Convert {input} to {:?}, {:?}, {:?}.", config.video_format, config.resize, config.target),
        JobType::AudioConvert => format!("Convert {input} to {:?} at {:?}.", config.audio_format, config.quality),
        JobType::ExtractAudio => format!("Extract audio from {input} as {:?}.", config.audio_format),
        JobType::TrimClip => format!("Trim {input} and export to {}.", output.output_path),
        JobType::ResizeVideo => format!("Resize {input} to {:?} and keep it shareable.", config.resize),
        JobType::CompressForSharing => format!("Compress {input} for {:?} with {:?} quality.", config.target, config.quality),
        JobType::MakeGif => format!("Turn {input} into a playful GIF clip."),
        JobType::BatchConvertFolder => format!("Batch convert folder media from {}.", config.input.path),
    }
}

fn crf(quality: &QualityProfile) -> u8 {
    match quality {
        QualityProfile::Best => 18,
        QualityProfile::Good => 23,
        QualityProfile::Small => 28,
        QualityProfile::Fast => 26,
    }
}

fn target_crf(config: &JobConfig) -> u8 {
    match config.target {
        TargetProfile::Discord => crf(&config.quality).max(26),
        TargetProfile::Email => crf(&config.quality).max(30),
        _ => crf(&config.quality),
    }
}

fn preset(quality: &QualityProfile) -> &'static str {
    match quality {
        QualityProfile::Best => "slow",
        QualityProfile::Good => "medium",
        QualityProfile::Small => "medium",
        QualityProfile::Fast => "veryfast",
    }
}

fn audio_bitrate(quality: &QualityProfile) -> u16 {
    match quality {
        QualityProfile::Best => 192,
        QualityProfile::Good => 160,
        QualityProfile::Small => 128,
        QualityProfile::Fast => 128,
    }
}

fn target_audio_bitrate(config: &JobConfig) -> u32 {
    let quality_default = u32::from(audio_bitrate(&config.quality));
    match config.target {
        TargetProfile::Discord => quality_default.min(128),
        TargetProfile::Email => quality_default.min(96),
        _ => quality_default,
    }
}

fn apply_target_video_constraints(args: &mut Vec<String>, config: &JobConfig) {
    if matches!(config.video_format, VideoFormat::Mp4H264 | VideoFormat::Mp4Hevc) {
        args.extend(["-movflags".to_string(), "+faststart".to_string()]);
    }

    match config.target {
        TargetProfile::Discord => args.extend([
            "-maxrate".to_string(),
            "2500k".to_string(),
            "-bufsize".to_string(),
            "5000k".to_string(),
        ]),
        TargetProfile::Email => args.extend([
            "-maxrate".to_string(),
            "1500k".to_string(),
            "-bufsize".to_string(),
            "3000k".to_string(),
        ]),
        _ => {}
    }
}

fn parse_progress_line(
    line: &str,
    total_duration: Option<f64>,
) -> Option<(Option<f64>, Option<f64>, Option<f64>)> {
    let (key, value) = line.split_once('=')?;
    match key {
        "out_time_ms" => {
            let micros = value.parse::<u64>().ok()?;
            let processed = micros as f64 / 1_000_000.0;
            let percent = total_duration.map(|duration| (processed / duration).clamp(0.0, 1.0) * 100.0);
            Some((percent, None, Some(processed)))
        }
        "speed" => Some((None, value.trim_end_matches('x').parse().ok(), None)),
        _ => None,
    }
}

fn reserve_output_path(base_output_path: PathBuf, reserved_outputs: &mut HashSet<PathBuf>) -> PathBuf {
    if !base_output_path.exists() && !reserved_outputs.contains(&base_output_path) {
        reserved_outputs.insert(base_output_path.clone());
        return base_output_path;
    }

    let parent = base_output_path
        .parent()
        .unwrap_or_else(|| Path::new("."))
        .to_path_buf();
    let stem = base_output_path
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("output");
    let extension = base_output_path
        .extension()
        .and_then(|value| value.to_str())
        .map(ToString::to_string);

    let mut index = 2;
    loop {
        let candidate = match &extension {
            Some(extension) => parent.join(format!("{stem}-{index}.{extension}")),
            None => parent.join(format!("{stem}-{index}")),
        };
        if !candidate.exists() && !reserved_outputs.contains(&candidate) {
            reserved_outputs.insert(candidate.clone());
            return candidate;
        }
        index += 1;
    }
}
