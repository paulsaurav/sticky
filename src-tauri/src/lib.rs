mod commands;

use commands::{read_todos, write_todos};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![read_todos, write_todos])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
