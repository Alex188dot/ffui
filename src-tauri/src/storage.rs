use crate::errors::AppError;
use crate::models::UserPreset;
use directories::ProjectDirs;
use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf};

#[derive(Debug, Default, Serialize, Deserialize)]
struct UserPresetFile {
    presets: Vec<UserPreset>,
}

fn preset_path() -> Result<PathBuf, AppError> {
    let dirs = ProjectDirs::from("dev", "ffui", "ffui")
        .ok_or_else(|| AppError::Config("config directory unavailable".to_string()))?;
    let dir = dirs.config_dir();
    fs::create_dir_all(dir)?;
    Ok(dir.join("presets.json"))
}

pub fn load_user_presets() -> Result<Vec<UserPreset>, AppError> {
    let path = preset_path()?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let content = fs::read_to_string(path)?;
    let file: UserPresetFile = serde_json::from_str(&content)?;
    Ok(file.presets)
}

pub fn save_user_preset(preset: UserPreset) -> Result<Vec<UserPreset>, AppError> {
    let path = preset_path()?;
    let mut presets = load_user_presets()?;
    presets.push(preset);
    fs::write(&path, serde_json::to_string_pretty(&UserPresetFile { presets: presets.clone() })?)?;
    Ok(presets)
}

pub fn delete_user_preset(id: &str) -> Result<Vec<UserPreset>, AppError> {
    let path = preset_path()?;
    let presets = load_user_presets()?
        .into_iter()
        .filter(|preset| preset.id != id)
        .collect::<Vec<_>>();
    fs::write(&path, serde_json::to_string_pretty(&UserPresetFile { presets: presets.clone() })?)?;
    Ok(presets)
}
