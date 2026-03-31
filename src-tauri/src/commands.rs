use crate::{
    errors::AppError,
    ffmpeg,
    models::{BootstrapPayload, JobConfig, QueueItemPreview, UserPreset},
    presets,
    state::AppState,
    storage,
};
use tauri::{AppHandle, Emitter, Manager};

#[tauri::command]
pub async fn bootstrap() -> Result<BootstrapPayload, String> {
    Ok(BootstrapPayload {
        tool_status: ffmpeg::discover_tools(),
        built_in_presets: presets::built_in_presets(),
        user_presets: storage::load_user_presets().map_err(String::from)?,
    })
}

#[tauri::command]
pub async fn scan_paths(paths: Vec<String>) -> Result<Vec<QueueItemPreview>, String> {
    ffmpeg::scan_paths(paths).await.map_err(String::from)
}

#[tauri::command]
pub async fn refresh_preview(config: JobConfig) -> Result<QueueItemPreview, String> {
    ffmpeg::preview_for_config(config).map_err(String::from)
}

#[tauri::command]
pub async fn save_user_preset(name: String, config: JobConfig) -> Result<Vec<UserPreset>, String> {
    storage::save_user_preset(presets::make_user_preset(name, config)).map_err(String::from)
}

#[tauri::command]
pub async fn delete_user_preset(id: String) -> Result<Vec<UserPreset>, String> {
    storage::delete_user_preset(&id).map_err(String::from)
}

#[tauri::command]
pub async fn run_queue(
    app: AppHandle,
    configs: Vec<JobConfig>,
) -> Result<(), String> {
    {
        let app_state = app.state::<AppState>();
        let mut running = app_state
            .running
            .lock()
            .map_err(|_| AppError::Config("failed to lock app state".to_string()))?;
        if *running {
            return Err("Queue is already running".to_string());
        }
        *running = true;
    }

    tauri::async_runtime::spawn(async move {
        let result = ffmpeg::run_queue(app.clone(), configs).await;
        let app_state = app.state::<AppState>();
        if let Ok(mut running) = app_state.running.lock() {
            *running = false;
        }
        if let Err(error) = result {
            app.emit(
                "ffui://job-status",
                crate::models::StatusPayload {
                    index: -1,
                    state: crate::models::ExecutionState::Failed,
                    message: Some(error.to_string()),
                },
            )
            .ok();
        }
    });

    Ok(())
}
