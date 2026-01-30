use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

const FILENAME: &str = "window_state.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowState {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

fn state_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join(FILENAME))
}

#[tauri::command]
pub fn read_window_state(app: AppHandle) -> Result<Option<WindowState>, String> {
    let path = state_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }
    let s = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let state: WindowState = serde_json::from_str(&s).map_err(|e| e.to_string())?;
    Ok(Some(state))
}

#[tauri::command]
pub fn save_window_state(app: AppHandle, state: WindowState) -> Result<(), String> {
    let path = state_path(&app)?;
    let s = serde_json::to_string_pretty(&state).map_err(|e| e.to_string())?;
    fs::write(&path, s).map_err(|e| e.to_string())?;
    Ok(())
}
