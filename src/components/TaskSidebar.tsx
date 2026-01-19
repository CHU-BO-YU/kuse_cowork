import { Component, For, Show } from "solid-js";
import { Task } from "../lib/tauri-api";
import { useI18n } from "../stores/i18n";
import Icon from "./Icon";
import "./TaskSidebar.css";

interface TaskSidebarProps {
  tasks: Task[];
  activeTaskId: string | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSelectTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onSettingsClick: () => void;
  onSkillsClick: () => void;
  onMCPClick: () => void;
}

const TaskSidebar: Component<TaskSidebarProps> = (props) => {
  const { t } = useI18n();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return "✓";
      case "running":
        return "●";
      case "failed":
        return "✗";
      default:
        return "○";
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return t("taskSidebar.today");
    } else if (days === 1) {
      return t("taskSidebar.yesterday");
    } else if (days < 7) {
      return t("taskSidebar.daysAgo").replace("{days}", days.toString());
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <aside class={`task-sidebar ${props.collapsed ? "collapsed" : ""}`}>
      <div class="sidebar-header">
        <div class="brand-container" onClick={props.onToggleCollapse} style={{ cursor: "pointer" }}>
          <img src="/logo.png" alt="Kuse Cowork" class="logo-image" />
          <Show when={!props.collapsed}>
            <h1 class="app-title">Kuse Cowork</h1>
          </Show>
        </div>
        <Show when={!props.collapsed}>
          <button class="toggle-btn" onClick={(e) => { e.stopPropagation(); props.onToggleCollapse(); }}>
            <Icon name="menu" size={20} />
          </button>
        </Show>
      </div>

      <div class="task-list">
        <Show when={!props.collapsed}>
          <div class="task-list-header">{t("taskSidebar.title")}</div>
        </Show>
        <Show
          when={props.tasks.length > 0}
          fallback={
            <Show when={!props.collapsed}>
              <div class="no-tasks">
                <p>{t("taskSidebar.noTasks")}</p>
                <p class="hint">{t("taskSidebar.createHint")}</p>
              </div>
            </Show>
          }
        >
          <For each={props.tasks}>
            {(task) => (
              <div
                class={`task-item ${props.activeTaskId === task.id ? "active" : ""} ${task.status}`}
                onClick={() => props.onSelectTask(task)}
                title={props.collapsed ? task.title : undefined}
              >
                <span class={`task-icon ${task.status}`}>{getStatusIcon(task.status)}</span>
                <Show when={!props.collapsed}>
                  <div class="task-info">
                    <div class="task-item-title">{task.title}</div>
                    <div class="task-date">{formatDate(task.updated_at)}</div>
                  </div>
                  <button
                    class="task-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      props.onDeleteTask(task.id);
                    }}
                    title={t("taskSidebar.delete")}
                  >
                    ×
                  </button>
                </Show>
              </div>
            )}
          </For>
        </Show>
      </div>

      <div class="sidebar-footer">
        <button
          class="footer-btn primary-btn"
          onClick={props.onSkillsClick}
          title={props.collapsed ? t("taskSidebar.skills") : undefined}
        >
          <Icon name="skills" size={18} />
          <Show when={!props.collapsed}>
            <span>{t("taskSidebar.skills")}</span>
          </Show>
        </button>
        <button
          class="footer-btn primary-btn"
          onClick={props.onMCPClick}
          title={props.collapsed ? t("taskSidebar.mcps") : undefined}
        >
          <Icon name="server" size={18} />
          <Show when={!props.collapsed}>
            <span>{t("taskSidebar.mcps")}</span>
          </Show>
        </button>
        <button
          class="footer-btn primary-btn"
          onClick={props.onSettingsClick}
          title={props.collapsed ? t("taskSidebar.settings") : undefined}
        >
          <Icon name="settings" size={18} />
          <Show when={!props.collapsed}>
            <span>{t("taskSidebar.settings")}</span>
          </Show>
        </button>
      </div>
    </aside>
  );
};

export default TaskSidebar;
