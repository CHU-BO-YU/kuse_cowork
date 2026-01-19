import { Component, Show, For, createSignal } from "solid-js";
import Markdown from "./Markdown";
import Icon from "./Icon";
import { Task, TaskMessage, openMultipleFoldersDialog } from "../lib/tauri-api";
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
  const { isConfigured, toggleSettings } = useSettings();
  const { t } = useI18n();
  const [input, setInput] = createSignal("");
  const [selectedPaths, setSelectedPaths] = createSignal<string[]>([]);
  const [showPathsPanel, setShowPathsPanel] = createSignal(false);
  let textareaRef: HTMLTextAreaElement | undefined;

  // Check if we're in an existing conversation
  const isInConversation = () => props.activeTask !== null && props.messages.length > 0;

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
    if (textareaRef) {
      textareaRef.style.height = "auto";
    }
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
                <For each={props.messages}>
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
                  onInput={(e) => {
                    setInput(e.currentTarget.value);
                    const target = e.currentTarget;
                    target.style.height = "auto";
                    target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
                  }}
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
