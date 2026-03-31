use crate::models::{
    AudioFormat, BuiltInPreset, JobConfig, JobType, QualityProfile, ResizePreset, TargetProfile,
    UserPreset, VideoFormat,
};
use uuid::Uuid;

pub fn built_in_presets() -> Vec<BuiltInPreset> {
    vec![
        preset("Web MP4", JobType::VideoConvert, QualityProfile::Good, TargetProfile::Web, VideoFormat::Mp4H264, AudioFormat::Mp3, ResizePreset::P1080),
        preset("Small MP4", JobType::CompressForSharing, QualityProfile::Small, TargetProfile::Email, VideoFormat::Mp4H264, AudioFormat::Mp3, ResizePreset::P720),
        preset("High Quality MP4", JobType::VideoConvert, QualityProfile::Best, TargetProfile::Universal, VideoFormat::Mp4H264, AudioFormat::Aac, ResizePreset::P1080),
        preset("HEVC Smaller File", JobType::VideoConvert, QualityProfile::Good, TargetProfile::Apple, VideoFormat::Mp4Hevc, AudioFormat::Aac, ResizePreset::P1080),
        preset("MP3", JobType::AudioConvert, QualityProfile::Good, TargetProfile::Universal, VideoFormat::Mp4H264, AudioFormat::Mp3, ResizePreset::Source),
        preset("AAC", JobType::AudioConvert, QualityProfile::Good, TargetProfile::Apple, VideoFormat::Mp4H264, AudioFormat::Aac, ResizePreset::Source),
        preset("WAV", JobType::AudioConvert, QualityProfile::Best, TargetProfile::Universal, VideoFormat::Mp4H264, AudioFormat::Wav, ResizePreset::Source),
        preset("FLAC", JobType::AudioConvert, QualityProfile::Best, TargetProfile::Universal, VideoFormat::Mp4H264, AudioFormat::Flac, ResizePreset::Source),
        preset("Discord Upload", JobType::CompressForSharing, QualityProfile::Small, TargetProfile::Discord, VideoFormat::Mp4H264, AudioFormat::Aac, ResizePreset::P720),
        preset("Email Attachment", JobType::CompressForSharing, QualityProfile::Small, TargetProfile::Email, VideoFormat::Mp4H264, AudioFormat::Aac, ResizePreset::P720),
        preset("Just Play Everywhere", JobType::VideoConvert, QualityProfile::Good, TargetProfile::Universal, VideoFormat::Mp4H264, AudioFormat::Aac, ResizePreset::P1080),
        preset("GIF Clip", JobType::MakeGif, QualityProfile::Good, TargetProfile::Web, VideoFormat::Gif, AudioFormat::Mp3, ResizePreset::P720),
    ]
}

pub fn make_user_preset(name: String, config: JobConfig) -> UserPreset {
    UserPreset {
        id: Uuid::new_v4().to_string(),
        name,
        config,
    }
}

fn preset(
    name: &str,
    job_type: JobType,
    quality: QualityProfile,
    target: TargetProfile,
    video_format: VideoFormat,
    audio_format: AudioFormat,
    resize: ResizePreset,
) -> BuiltInPreset {
    BuiltInPreset {
        name: name.to_string(),
        job_type,
        quality,
        target,
        video_format,
        audio_format,
        resize,
    }
}
