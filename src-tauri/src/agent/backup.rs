use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

const MAX_FILE_SIZE_BYTES: u64 = 100 * 1024 * 1024; // 100MB
const MAX_HISTORY_PER_CONVERSATION: usize = 10;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum UndoAction {
    /// Restore content from a backup file (for write/edit)
    ContentRestore {
        target_path: String,
        backup_path: String,
        timestamp: u64,
    },
    /// Reverse a move operation (move back to source)
    MoveReverse {
        from_path: String, // Where it is now (destination of original move)
        to_path: String,   // Where it was (source of original move)
        timestamp: u64,
    },
    /// Restore a deleted file from trash
    DeleteRestore {
        trash_path: String,    // Where it is now (in trash)
        original_path: String, // Where it was
        timestamp: u64,
    },
}

pub struct BackupManager {
    /// Maps conversation_id to a list of undo actions (stack)
    history: Mutex<std::collections::HashMap<String, Vec<UndoAction>>>,
}

impl BackupManager {
    pub fn new() -> Self {
        Self {
            history: Mutex::new(std::collections::HashMap::new()),
        }
    }

    /// Create a backup for writing/editing a file. Returns path to backup if successful.
    pub fn create_backup(&self, conversation_id: &str, file_path: &Path) -> Result<Option<String>, String> {
        if !file_path.exists() {
            return Ok(None); // Nothing to backup if creating new file
        }

        let metadata = fs::metadata(file_path).map_err(|e| e.to_string())?;
        if metadata.len() > MAX_FILE_SIZE_BYTES {
            println!("Skipping backup for {}: file size {} exceeds limit", file_path.display(), metadata.len());
            return Ok(None);
        }

        // Setup backup directory: .kuse/backups/<conversation_id>/<timestamp>/
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
        
        let project_root = std::env::current_dir().map_err(|e| e.to_string())?;
        let backup_dir = project_root
            .join(".kuse")
            .join("backups")
            .join(conversation_id)
            .join(timestamp.to_string());

        fs::create_dir_all(&backup_dir).map_err(|e| e.to_string())?;

        let file_name = file_path.file_name().ok_or("Invalid file name")?;
        let backup_path = backup_dir.join(file_name);

        fs::copy(file_path, &backup_path).map_err(|e| e.to_string())?;

        let action = UndoAction::ContentRestore {
            target_path: file_path.to_string_lossy().to_string(),
            backup_path: backup_path.to_string_lossy().to_string(),
            timestamp,
        };

        self.push_history(conversation_id, action);

        Ok(Some(backup_path.to_string_lossy().to_string()))
    }

    /// Register a move operation (for Smart Undo)
    pub fn register_move(&self, conversation_id: &str, from: &Path, to: &Path) {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        // Check if "from" is effectively a delete (move to trash)
        // Actually, we use DeleteRestore for that specific case to be clearer, but MoveReverse works generic.
        // Let's rely on the tool to call the right register method.
        
        let action = UndoAction::MoveReverse {
            from_path: to.to_string_lossy().to_string(), // To undo, we move FROM the 'to' path
            to_path: from.to_string_lossy().to_string(), // Back TO the 'from' path
            timestamp,
        };

        self.push_history(conversation_id, action);
    }

    /// Register a delete operation (move to trash)
    pub fn register_delete(&self, conversation_id: &str, original_path: &Path, trash_path: &Path) {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let action = UndoAction::DeleteRestore {
            trash_path: trash_path.to_string_lossy().to_string(),
            original_path: original_path.to_string_lossy().to_string(),
            timestamp,
        };

        self.push_history(conversation_id, action);
    }

    fn push_history(&self, conversation_id: &str, action: UndoAction) {
        let mut history = self.history.lock().unwrap();
        let list = history.entry(conversation_id.to_string()).or_insert_with(Vec::new);
        list.push(action);
        
        // Limit history size
        if list.len() > MAX_HISTORY_PER_CONVERSATION {
            list.remove(0); // Remove oldest
        }
    }

    pub fn undo_last(&self, conversation_id: &str) -> Result<String, String> {
        let action = {
            let mut history = self.history.lock().unwrap();
            let list = history.get_mut(conversation_id).ok_or("No history for this conversation")?;
            list.pop().ok_or("Nothing to undo")?
        };

        match action {
            UndoAction::ContentRestore { target_path, backup_path, .. } => {
                let target = PathBuf::from(&target_path);
                let backup = PathBuf::from(&backup_path);

                if !backup.exists() {
                     return Err(format!("Backup file missing: {}", backup_path));
                }

                fs::copy(&backup, &target).map_err(|e| format!("Failed to restore file: {}", e))?;
                Ok(format!("Restored content of {}", target_path))
            }
            UndoAction::MoveReverse { from_path, to_path, .. } => {
                let from = PathBuf::from(&from_path);
                let to = PathBuf::from(&to_path);

                if !from.exists() {
                    return Err(format!("File not found at {}. Cannot move back.", from_path));
                }

                if let Some(parent) = to.parent() {
                    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
                }

                fs::rename(&from, &to).map_err(|e| format!("Failed to move file back: {}", e))?;
                Ok(format!("Moved {} back to {}", from_path, to_path))
            }
            UndoAction::DeleteRestore { trash_path, original_path, .. } => {
                let from = PathBuf::from(&trash_path);
                let to = PathBuf::from(&original_path);

                if !from.exists() {
                    return Err(format!("Trash file missing: {}", trash_path));
                }

                 if let Some(parent) = to.parent() {
                    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
                }

                fs::rename(&from, &to).map_err(|e| format!("Failed to restore from trash: {}", e))?;
                Ok(format!("Restored {} from trash", original_path))
            }
        }
    }

    pub fn clear_history(&self, conversation_id: &str) {
        // Also clean up disk backups?
        // For simplicity, we just clear the memory state. 
        // A full cleanup would require deleting the .kuse/backups/<id> folder.
        let mut history = self.history.lock().unwrap();
        history.remove(conversation_id);
    }
}
