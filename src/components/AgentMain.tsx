import { Component, Show, For, createSignal, onMount, onCleanup, createEffect } from "solid-js";
import Markdown from "./Markdown";
import Icon from "./Icon";
import { Task, TaskMessage, openMultipleFoldersDialog, undoLastAction } from "../lib/tauri-api";
import { useSettings } from "../stores/settings";
import { useI18n } from "../stores/i18n";
import "./AgentMain.css";

interface AgentMainProps {
  onNewTask: (title: string, description: string, projectPath?: string, locale?: string) => void;
  onContinueTask: (message: string, projectPath?: string, locale?: string) => void;
  onNewConversation: () => void;
  currentText: string;
  isRunning: boolean;
  activeTask: Task | null;
  messages: TaskMessage[];
  currentLocale?: string;
}

const AgentMain: Component<AgentMainProps> = (props) => {
  const { isConfigured, toggleSettings, settings } = useSettings();
  const { t } = useI18n();
  const [input, setInput] = createSignal("");
  const [selectedPaths, setSelectedPaths] = createSignal<string[]>([]);
  const [showPathsPanel, setShowPathsPanel] = createSignal(false);
  let textareaRef: HTMLTextAreaElement | undefined;

  // Check if we're in an existing conversation
  const isInConversation = () => props.activeTask !== null && props.messages.length > 0;

  const adjustTextareaHeight = () => {
    if (textareaRef) {
      textareaRef.style.height = "auto";
      textareaRef.style.height = `${Math.min(textareaRef.scrollHeight, 200)}px`;
    }
  };

  onMount(() => {
    // Initial adjustment and resize listener
    adjustTextareaHeight();
    window.addEventListener("resize", adjustTextareaHeight);
    onCleanup(() => window.removeEventListener("resize", adjustTextareaHeight));
  });

  // Watch for input changes to adjust height (e.g. reset on clear)
  createEffect(() => {
    input(); // dependency
    adjustTextareaHeight();
  });

  const handleAddFolders = async () => {
    const folders = await openMultipleFoldersDialog();
    if (folders.length > 0) {
      // Add new folders (avoid duplicates)
      const existing = selectedPaths();
      const newPaths = folders.filter(f => !existing.includes(f));
      setSelectedPaths([...existing, ...newPaths]);
      setShowPathsPanel(true);
    }
  };

  const handleRemovePath = (path: string) => {
    setSelectedPaths(selectedPaths().filter(p => p !== path));
  };

  const handleUndo = async () => {
    if (!props.activeTask) return;
    try {
      const result = await undoLastAction(props.activeTask.id);
      console.log("Undo result:", result);
      // TODO: Show toast notification
    } catch (error) {
      console.error("Undo failed:", error);
    }
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    const message = input().trim();
    if (!message || props.isRunning) return;

    // Join all selected paths with comma for Docker mounting
    const projectPath = selectedPaths().length > 0 ? selectedPaths().join(",") : undefined;

    if (isInConversation()) {
      // Continue existing conversation
      props.onContinueTask(message, projectPath, props.currentLocale);
    } else {
      // Create new task
      const firstLine = message.split("\n")[0];
      const title = firstLine.length > 50 ? firstLine.slice(0, 50) + "..." : firstLine;
      props.onNewTask(title, message, projectPath, props.currentLocale);
    }
    // Height reset handled by createEffect on input change
    setInput("");
  };

  return (
    <div class="agent-main">
      <Show
        when={isConfigured()}
        fallback={
          <div class="agent-setup">
            <h2>{t("agent.welcome")}</h2>
            <p>{t("agent.configure")}</p>
            <button onClick={toggleSettings}>{t("agent.openSettings")}</button>
          </div>
        }
      >
        <div class="agent-content">
          {/* Output area */}
          <div class="agent-output">
            <Show
              when={props.activeTask || props.currentText || props.messages.length > 0}
              fallback={
                <div class="empty-state">
                  <h2>{t("agent.modeTitle")}</h2>
                  <p>{t("agent.modeDesc")}</p>
                  <div class="capabilities">
                    <div class="capability">
                      <div class="capability-icon">
                        <Icon name="file" size={24} />
                      </div>
                      <span>{t("agent.capabilities.files")}</span>
                    </div>
                    <div class="capability">
                      <div class="capability-icon">
                        <Icon name="search" size={24} />
                      </div>
                      <span>{t("agent.capabilities.search")}</span>
                    </div>
                    <div class="capability">
                      <div class="capability-icon">
                        <Icon name="command" size={24} />
                      </div>
                      <span>{t("agent.capabilities.commands")}</span>
                    </div>
                    <div class="capability">
                      <div class="capability-icon">
                        <Icon name="docker" size={24} />
                      </div>
                      <span>{t("agent.capabilities.docker")}</span>
                    </div>
                  </div>
                </div>
              }
            >
              <div class="messages">
                {/* Show saved message history */}
                {(() => {
                  const filteredMessages = props.messages.filter(m => {
                    // Hide messages that are purely tool results (user role)
                    if (m.role === "user") {
                      try {
                        const content = JSON.parse(m.content);
                        // Handle untagged ToolResults: likely an array where elements might be tool results
                        // Format: [{"type":"tool_result", ...}] or {"ToolResults":...} (if tagged)
                        if (Array.isArray(content) && content.length > 0) {
                          if (content[0].type === "tool_result") return false;
                        }
                        if (content.ToolResults) return false;
                      } catch (e) { }
                    }
                    return true;
                  });

                  // Group consecutive agent messages
                  const grouped: { role: string; content: string }[] = [];
                  filteredMessages.forEach(m => {
                    let displayContent = m.content;
                    try {
                      // Try to parse structured content
                      const parsed = JSON.parse(m.content);

                      if (typeof parsed === "string") {
                        displayContent = parsed;
                      } else if (Array.isArray(parsed) && parsed.length > 0) {
                        // Handle blocks: [{"type": "text", ...}]
                        const textBlocks = parsed
                          .filter((b: any) => b.type === "text")
                          .map((b: any) => b.text);

                        if (textBlocks.length > 0) {
                          displayContent = textBlocks.join("\n\n");
                        } else {
                          // Only tool uses or other blocks, hide or empty
                          return;
                        }
                      } else if (parsed.Text) {
                        displayContent = parsed.Text;
                      } else if (parsed.Blocks) {
                        displayContent = parsed.Blocks
                          .filter((b: any) => b.type === "text")
                          .map((b: any) => b.text)
                          .join("\n\n");
                      }
                    } catch (e) { }

                    if (!displayContent || !displayContent.trim()) return;

                    if (grouped.length > 0 && grouped[grouped.length - 1].role === m.role && m.role === "assistant") {
                      grouped[grouped.length - 1].content += "\n\n" + displayContent;
                    } else {
                      grouped.push({ role: m.role, content: displayContent });
                    }
                  });

                  return (
                    <For each={grouped}>
                      {(message) => (
                        <div class={`message ${message.role}`}>
                          <div class="message-label">
                            {message.role === "user" ? "You" : "Agent"}
                          </div>
                          <div class="message-content">
                            <Markdown>{message.content}</Markdown>
                          </div>
                        </div>
                      )}
                    </For>
                  );
                })()}

                {/* Show current streaming text (when running a new task) */}
                <Show when={props.currentText && props.isRunning}>
                  <div class="message assistant streaming">
                    <div class="message-label">Agent</div>
                    <div class="message-content">
                      <Markdown>{props.currentText}</Markdown>
                    </div>
                  </div>
                </Show>
              </div>
            </Show>
          </div>

          {/* Input area */}
          <div class="agent-input-area">
            {/* Selected paths panel */}
            <Show when={showPathsPanel() && selectedPaths().length > 0}>
              <div class="selected-paths">
                <div class="paths-header">
                  <span class="paths-label">
                    {t("agent.mountedFolders").replace("{count}", selectedPaths().length.toString())}
                  </span>
                  <button
                    type="button"
                    class="paths-close"
                    onClick={() => setShowPathsPanel(false)}
                    title={t("agent.hidePaths")}
                  >
                    ×
                  </button>
                </div>
                <div class="paths-list">
                  <For each={selectedPaths()}>
                    {(path) => (
                      <div class="path-item">
                        <span class="path-icon">📁</span>
                        <span class="path-text" title={path}>
                          {path.split("/").pop() || path}
                        </span>
                        <button
                          type="button"
                          class="path-remove"
                          onClick={() => handleRemovePath(path)}
                          disabled={props.isRunning}
                          title={t("agent.removePath").replace("{path}", path)}
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </Show>

            <form class="agent-form" onSubmit={handleSubmit}>
              <div class="input-row">
                <div class="input-tools">
                  <button
                    type="button"
                    class={`path-toggle ${selectedPaths().length > 0 ? "active" : ""}`}
                    onClick={handleAddFolders}
                    disabled={props.isRunning}
                    title={t("agent.addFolders")}
                  >
                    <Icon name="folder" size={18} />
                    <Show when={selectedPaths().length > 0}>
                      <span class="path-count">{selectedPaths().length}</span>
                    </Show>
                  </button>
                  <Show when={isInConversation()}>
                    <Show when={settings().enableUndo}>
                      <button
                        type="button"
                        class="undo-btn ghost"
                        onClick={handleUndo}
                        disabled={props.isRunning}
                        title={t("agent.undo") || "還原"}
                      >
                        <Icon name="undo" size={18} />
                      </button>
                    </Show>
                    <button
                      type="button"
                      class="new-chat-btn ghost"
                      onClick={props.onNewConversation}
                      disabled={props.isRunning}
                      title={t("agent.newChat")}
                    >
                      <Icon name="plus" size={20} />
                    </button>
                  </Show>
                </div>

                <textarea
                  ref={textareaRef}
                  value={input()}
                  onInput={(e) => setInput(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  placeholder={isInConversation()
                    ? t("agent.continueConversation")
                    : t("agent.inputPlaceholderExample")
                  }
                  disabled={props.isRunning}
                  rows={1}
                  style={{ "min-height": "50px", height: "auto" }}
                />

                <button
                  type="submit"
                  class={`submit-btn ${!props.isRunning && isInConversation() ? "icon-btn" : ""}`}
                  disabled={props.isRunning || !input().trim()}
                >
                  {props.isRunning ? t("agent.running") : isInConversation() ? <Icon name="send" size={18} /> : t("agent.startTask")}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default AgentMain;
