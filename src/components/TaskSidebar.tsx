import { Component, For, Show } from "solid-js";
import { Task } from "../lib/tauri-api";
import { useI18n } from "../stores/i18n";
import "./TaskSidebar.css";

interface TaskSidebarProps {
  tasks: Task[];
  activeTaskId: string | null;
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
    <aside class="task-sidebar">
      <div class="sidebar-header">
        <div class="logo-container">
          <img src="/logo.png" alt="Kuse Cowork" class="logo-image" />
          <h1 class="app-title">Kuse Cowork</h1>
        </div>
      </div>

      <div class="task-list">
        <div class="task-list-header">{t("taskSidebar.title")}</div>
        <Show
          when={props.tasks.length > 0}
          fallback={
            <div class="no-tasks">
              <p>{t("taskSidebar.noTasks")}</p>
              <p class="hint">{t("taskSidebar.createHint")}</p>
            </div>
          }
        >
          <For each={props.tasks}>
            {(task) => (
              <div
                class={`task-item ${props.activeTaskId === task.id ? "active" : ""} ${task.status}`}
                onClick={() => props.onSelectTask(task)}
              >
                <span class={`task-icon ${task.status}`}>{getStatusIcon(task.status)}</span>
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
              </div>
            )}
          </For>
        </Show>
      </div>

      <div class="sidebar-footer">
        <button
          class="footer-btn primary-btn"
          onClick={props.onSkillsClick}
        >
          {t("taskSidebar.skills")}
        </button>
        <button
          class="footer-btn primary-btn"
          onClick={props.onMCPClick}
        >
          {t("taskSidebar.mcps")}
        </button>
        <button class="footer-btn primary-btn" onClick={props.onSettingsClick}>
          {t("taskSidebar.settings")}
        </button>
      </div>
    </aside>
  );
};

export default TaskSidebar;
