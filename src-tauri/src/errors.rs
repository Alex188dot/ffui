use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("unsupported extension for {0}")]
    UnsupportedExtension(String),
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("json error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("config error: {0}")]
    Config(String),
    #[error("ffprobe error: {0}")]
    Probe(String),
    #[error("ffmpeg error: {0}")]
    Ffmpeg(String),
}

impl From<AppError> for String {
    fn from(value: AppError) -> Self {
        value.to_string()
    }
}
