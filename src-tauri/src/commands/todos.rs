use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

const FILENAME: &str = "todos.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Todo {
    pub id: String,
    pub title: String,
    pub completed: bool,
    #[serde(default)]
    pub updated_at: i64,
    #[serde(default)]
    pub created_at: i64,
    #[serde(default)]
    pub completed_at: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TodosPayload {
    pub todos: Vec<Todo>,
    #[serde(default)]
    pub updated_at: i64,
}

fn todos_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join(FILENAME))
}

#[tauri::command]
pub fn read_todos(app: AppHandle) -> Result<TodosPayload, String> {
    let path = todos_path(&app)?;
    if !path.exists() {
        return Ok(TodosPayload { todos: vec![], updated_at: 0 });
    }
    let s = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let mut payload: TodosPayload = serde_json::from_str(&s).unwrap_or(TodosPayload { todos: vec![], updated_at: 0 });
    for t in &mut payload.todos {
        if t.created_at == 0 && t.updated_at != 0 {
            t.created_at = t.updated_at;
        }
    }
    Ok(payload)
}

#[tauri::command]
pub fn write_todos(app: AppHandle, payload: TodosPayload) -> Result<(), String> {
    let path = todos_path(&app)?;
    let s = serde_json::to_string_pretty(&payload).map_err(|e| e.to_string())?;
    fs::write(&path, s).map_err(|e| e.to_string())?;
    Ok(())
}
