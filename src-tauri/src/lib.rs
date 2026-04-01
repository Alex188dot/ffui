mod commands;
mod errors;
mod ffmpeg;
mod models;
mod presets;
mod state;
mod storage;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(state::AppState::default())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::bootstrap,
            commands::scan_paths,
            commands::refresh_preview,
            commands::rebuild_previews,
            commands::save_user_preset,
            commands::delete_user_preset,
            commands::run_queue,
            commands::stop_queue
        ])
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_title("ffui");
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
