use crate::agent::{ToolResult, ToolUse};
use crate::agent::backup::BackupManager;
use crate::mcp::{MCPManager, MCPToolCall};
use crate::tools;
use std::sync::Arc;
use std::path::Path;

pub struct ToolExecutor {
    project_path: Option<String>,
    mcp_manager: Option<Arc<MCPManager>>,
    backup_manager: Option<Arc<BackupManager>>,
    conversation_id: Option<String>,
}

impl ToolExecutor {
    pub fn new(project_path: Option<String>) -> Self {
        Self {
            project_path,
            mcp_manager: None,
            backup_manager: None,
            conversation_id: None,
        }
    }

    pub fn with_mcp_manager(mut self, mcp_manager: Arc<MCPManager>) -> Self {
        self.mcp_manager = Some(mcp_manager);
        self
    }

    pub fn with_backup_manager(mut self, backup_manager: Arc<BackupManager>) -> Self {
        self.backup_manager = Some(backup_manager);
        self
    }

    pub fn with_conversation_id(mut self, conversation_id: String) -> Self {
        self.conversation_id = Some(conversation_id);
        self
    }

    pub async fn execute(&self, tool_use: &ToolUse) -> ToolResult {
        let project_path = self.project_path.as_deref();

        // Check if this is an MCP tool (format: mcp_server_id_tool_name)
        if tool_use.name.starts_with("mcp_") {
            if let Some(mcp_manager) = &self.mcp_manager {
                // Get all available tools to find the correct mapping
                let all_tools = mcp_manager.get_all_tools().await;
                let mut matching_tool = None;

                // Find the tool that matches the current tool_use name
                for tool in &all_tools {
                    let safe_server_id = tool.server_id.replace("-", "_").replace(":", "_");
                    let safe_tool_name = tool.name.replace("-", "_").replace(":", "_");
                    let expected_name = format!("mcp_{}_{}", safe_server_id, safe_tool_name);

                    if expected_name == tool_use.name {
                        matching_tool = Some(tool);
                        break;
                    }
                }

                if let Some(tool) = matching_tool {
                    let mcp_call = MCPToolCall {
                        server_id: tool.server_id.clone(),
                        tool_name: tool.name.clone(),
                        parameters: tool_use.input.clone(),
                    };

                    let mcp_result = mcp_manager.execute_tool(&mcp_call).await;

                    return if mcp_result.success {
                        ToolResult::success(tool_use.id.clone(), mcp_result.result.to_string())
                    } else {
                        ToolResult::error(
                            tool_use.id.clone(),
                            mcp_result.error.unwrap_or("MCP tool execution failed".to_string())
                        )
                    };
                } else {
                    return ToolResult::error(
                        tool_use.id.clone(),
                        format!("MCP tool '{}' not found", tool_use.name)
                    );
                }
            } else {
                return ToolResult::error(
                    tool_use.id.clone(),
                    "MCP manager not available".to_string()
                );
            }
        }

        // Docker tools have their own result handling
        if tool_use.name.starts_with("docker_") {
            return tools::docker::execute_docker_tool(tool_use, &self.project_path);
        }

        let result = match tool_use.name.as_str() {
            "read_file" => tools::file_read::execute(&tool_use.input, project_path),
            "write_file" => {
                // Create backup before writing
                if let (Some(bm), Some(conv_id)) = (&self.backup_manager, &self.conversation_id) {
                    if let Some(path_str) = tool_use.input.get("path").and_then(|v| v.as_str()) {
                        let file_path = Path::new(path_str);
                        let _ = bm.create_backup(conv_id, file_path);
                    }
                }
                tools::file_write::execute(&tool_use.input, project_path)
            },
            "edit_file" => {
                // Create backup before editing
                if let (Some(bm), Some(conv_id)) = (&self.backup_manager, &self.conversation_id) {
                    if let Some(path_str) = tool_use.input.get("path").and_then(|v| v.as_str()) {
                        let file_path = Path::new(path_str);
                        let _ = bm.create_backup(conv_id, file_path);
                    }
                }
                tools::file_edit::execute(&tool_use.input, project_path)
            },
            "bash" => tools::bash::execute(&tool_use.input, project_path),
            "glob" => tools::glob::execute(&tool_use.input, project_path),
            "grep" => tools::grep::execute(&tool_use.input, project_path),
            "list_dir" => tools::list_dir::execute(&tool_use.input, project_path),
            "move_file" => {
                let result = tools::file_move::execute(&tool_use.input, project_path);
                // Register move for undo after successful execution
                if result.is_ok() {
                    if let (Some(bm), Some(conv_id)) = (&self.backup_manager, &self.conversation_id) {
                        if let (Some(src), Some(dst)) = (
                            tool_use.input.get("source").and_then(|v| v.as_str()),
                            tool_use.input.get("destination").and_then(|v| v.as_str())
                        ) {
                            bm.register_move(conv_id, Path::new(src), Path::new(dst));
                        }
                    }
                }
                result
            },
            "delete_file" => {
                let result = tools::file_delete::execute(&tool_use.input, project_path);
                if let Ok(json_str) = &result {
                    if let Ok(val) = serde_json::from_str::<serde_json::Value>(json_str) {
                         if let (Some(bm), Some(conv_id)) = (&self.backup_manager, &self.conversation_id) {
                             if let (Some(orig_path), Some(trash_path)) = (
                                 val.get("original_path").and_then(|v| v.as_str()),
                                 val.get("trash_path").and_then(|v| v.as_str())
                             ) {
                                 bm.register_delete(conv_id, Path::new(orig_path), Path::new(trash_path));
                             }
                         }
                         // Return only the message field to the LLM to keep it clean
                         if let Some(msg) = val.get("message").and_then(|v| v.as_str()) {
                             return ToolResult::success(tool_use.id.clone(), msg.to_string());
                         }
                    }
                }
                result
            },
            _ => Err(format!("Unknown tool: {}", tool_use.name)),
        };

        match result {
            Ok(content) => ToolResult::success(tool_use.id.clone(), content),
            Err(error) => ToolResult::error(tool_use.id.clone(), error),
        }
    }
}
