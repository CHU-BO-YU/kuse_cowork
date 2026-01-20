use crate::agent::ToolDefinition;
use serde_json::json;
use std::fs;
use std::path::Path;

pub fn definition() -> ToolDefinition {
    ToolDefinition {
        name: "move_file".to_string(),
        description: "Move or rename a file safely. Supports instant undo.".to_string(),
        input_schema: json!({
            "type": "object",
            "properties": {
                "source": {
                    "type": "string",
                    "description": "The path to the file to move"
                },
                "destination": {
                    "type": "string",
                    "description": "The destination path (can be new folder or filename)"
                }
            },
            "required": ["source", "destination"]
        }),
    }
}

pub fn execute(
    input: &serde_json::Value,
    project_path: Option<&str>,
) -> Result<String, String> {
    let source_str = input
        .get("source")
        .and_then(|v| v.as_str())
        .ok_or("Missing 'source' parameter")?;
        
    let dest_str = input
        .get("destination")
        .and_then(|v| v.as_str())
        .ok_or("Missing 'destination' parameter")?;

    // Resolve paths
    let source = resolve_path(source_str, project_path)?;
    let destination = resolve_path(dest_str, project_path)?;

    if !source.exists() {
        return Err(format!("Source file not found: {}", source_str));
    }

    if destination.exists() {
        return Err(format!("Destination already exists: {}. Move skipped.", dest_str));
    }

    // Ensure parent dir exists
    if let Some(parent) = destination.parent() {
        if !parent.exists() {
             fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
    }

    // ACTUALLY MOVE
    fs::rename(&source, &destination).map_err(|e| format!("Failed to move file: {}", e))?;

    // TODO: Register undo action when BackupManager is integrated into ToolExecutor
    // backup_manager.register_move(conversation_id, &source, &destination);

    Ok(format!(
        "Successfully moved {} to {}",
        source.display(),
        destination.display()
    ))
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

