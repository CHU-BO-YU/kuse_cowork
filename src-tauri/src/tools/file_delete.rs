use crate::agent::ToolDefinition;
use serde_json::json;
use std::fs;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

pub fn definition() -> ToolDefinition {
    ToolDefinition {
        name: "delete_file".to_string(),
        description: "Safely delete a file or directory by moving it to the project trash. This is reversible.".to_string(),
        input_schema: json!({
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "The path to the file or directory to delete"
                }
            },
            "required": ["path"]
        }),
    }
}

pub fn execute(
    input: &serde_json::Value,
    project_path: Option<&str>,
) -> Result<String, String> {
    let path_str = input
        .get("path")
        .and_then(|v| v.as_str())
        .ok_or("Missing 'path' parameter")?;

    // Resolve path
    let path = resolve_path(path_str, project_path)?;

    if !path.exists() {
        return Err(format!("File not found: {}", path_str));
    }

    // Setup trash directory: .kuse/trash/
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    
    let project_root = std::env::current_dir().map_err(|e| e.to_string())?;
    let trash_dir = project_root
        .join(".kuse")
        .join("trash");

    fs::create_dir_all(&trash_dir).map_err(|e| e.to_string())?;

    let file_name = path.file_name().ok_or("Invalid file name")?;
    // Prefix with timestamp to avoid collision
    let trash_file_name = format!("{}_{}", timestamp, file_name.to_string_lossy());
    let trash_path = trash_dir.join(trash_file_name);

    // ACTUALLY MOVE (RENAME), NOT DELETE
    fs::rename(&path, &trash_path).map_err(|e| format!("Failed to move to trash: {}", e))?;

    Ok(json!({
        "message": format!("Successfully moved {} to trash (recoverable)", path.display()),
        "original_path": path.to_string_lossy().to_string(),
        "trash_path": trash_path.to_string_lossy().to_string()
    }).to_string())
}

fn resolve_path(path_str: &str, project_path: Option<&str>) -> Result<std::path::PathBuf, String> {
    let path = Path::new(path_str);

    if path.is_absolute() {
        Ok(path.to_path_buf())
    } else if let Some(project) = project_path {
        Ok(Path::new(project).join(path))
    } else {
        std::env::current_dir()
            .map(|cwd| cwd.join(path))
            .map_err(|e| format!("Failed to get current directory: {}", e))
    }
}

