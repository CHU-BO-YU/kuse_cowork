import { Component, For } from "solid-js";
import { useChat } from "../stores/chat";
import { useI18n } from "../stores/i18n";
import Icon from "./Icon";
import "./Sidebar.css";

interface SidebarProps {
  onSettingsClick: () => void;
  mode: "chat" | "agent";
  onModeChange: (mode: "chat" | "agent") => void;
}

const Sidebar: Component<SidebarProps> = (props) => {
  const { t } = useI18n();
  const {
    conversations,
    activeConversationId,
    selectConversation,
    createConversation,
    deleteConversation,
  } = useChat();

  return (
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="logo-container">
          <img src="/logo.png" alt="Kuse Cowork" class="logo-image" />
          <h1 class="logo-text">Kuse Cowork</h1>
        </div>
        <div class="mode-tabs">
          <button
            class={`mode-tab ${props.mode === "chat" ? "active" : ""}`}
            onClick={() => props.onModeChange("chat")}
          >
            <Icon name="chat" size={16} />
            {t("sidebar.chat")}
          </button>
          <button
            class={`mode-tab ${props.mode === "agent" ? "active" : ""}`}
            onClick={() => props.onModeChange("agent")}
          >
            <Icon name="agent" size={16} />
            {t("sidebar.agent")}
          </button>
        </div>
        <button class="new-chat-btn" onClick={() => createConversation()}>
          <Icon name="plus" size={16} /> {t("sidebar.newChat")}
        </button>
      </div>

      <nav class="conversations">
        <For each={conversations()}>
          {(conv) => (
            <div
              class={`conversation-item ${conv.id === activeConversationId() ? "active" : ""
                }`}
              onClick={() => selectConversation(conv.id)}
            >
              <span class="conversation-title">{conv.title}</span>
              <button
                class="delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConversation(conv.id);
                }}
              >
                <Icon name="close" size={12} />
              </button>
            </div>
          )}
        </For>
      </nav>

      <div class="sidebar-footer">
        <button
          class="footer-btn primary-btn"
          onClick={() => {
            // TODO: Implement Skills Manager functionality
            console.log("Skills Manager clicked - coming soon");
          }}
        >
          <Icon name="skills" size={16} />
          {t("sidebar.skills")}
        </button>
        <button
          class="footer-btn primary-btn"
          onClick={() => {
            // TODO: Implement MCPs functionality
            console.log("MCPs clicked - coming soon");
          }}
        >
          <Icon name="server" size={16} />
          {t("sidebar.mcps")}
        </button>
        <button class="footer-btn primary-btn" onClick={props.onSettingsClick}>
          <Icon name="settings" size={16} />
          {t("sidebar.settings")}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
