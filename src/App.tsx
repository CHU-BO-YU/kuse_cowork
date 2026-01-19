import { Component, Show, createSignal, onMount, onCleanup } from "solid-js";
import { useSettings, loadSettings } from "./stores/settings";
import { useI18n } from "./stores/i18n";
import { Task, TaskMessage, AgentEvent, listTasks, createTask, deleteTask, runTaskAgent, getTask, getTaskMessages } from "./lib/tauri-api";
import AgentMain from "./components/AgentMain";
import Settings from "./components/Settings";
import SkillsList from "./components/SkillsList";
import MCPSettings from "./components/MCPSettings";
import TaskSidebar from "./components/TaskSidebar";
import TaskPanel from "./components/TaskPanel";
import "./styles/global.css"; // Ensure this is imported for layout & resize styles

interface ToolExecution {
  id: number;
  tool: string;
  status: "running" | "completed" | "error";
}

const App: Component = () => {
  const { showSettings, toggleSettings, isLoading } = useSettings();
  const { locale } = useI18n();

  // UI state
  const [showSkills, setShowSkills] = createSignal(false);
  const [showMCP, setShowMCP] = createSignal(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = createSignal(false);

  // Layout state
  const [sidebarWidth, setSidebarWidth] = createSignal(260);
  // Fixed task panel width
  const TASK_PANEL_WIDTH = 320;

  const [isMobile, setIsMobile] = createSignal(window.innerWidth < 768);
  const [showTaskPanel, setShowTaskPanel] = createSignal(window.innerWidth >= 1024);

  // Task state
  const [tasks, setTasks] = createSignal<Task[]>([]);
  const [activeTask, setActiveTask] = createSignal<Task | null>(null);
  const [taskMessages, setTaskMessages] = createSignal<TaskMessage[]>([]);
  const [isRunning, setIsRunning] = createSignal(false);
  const [toolExecutions, setToolExecutions] = createSignal<ToolExecution[]>([]);
  const [currentText, setCurrentText] = createSignal("");

  onMount(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setShowTaskPanel(width >= 1024);
    };
    window.addEventListener("resize", handleResize);
    onCleanup(() => window.removeEventListener("resize", handleResize));

    // Async initialization
    (async () => {
      await loadSettings();
      await refreshTasks();
    })();
  });

  const toggleSkills = () => {
    setShowSkills(!showSkills());
    if (showSettings()) toggleSettings();
    if (showMCP()) setShowMCP(false);
  };

  const toggleMCP = () => {
    setShowMCP(!showMCP());
    if (showSettings()) toggleSettings();
    if (showSkills()) setShowSkills(false);
  };

  const handleToggleSettings = () => {
    if (showSkills()) setShowSkills(false);
    if (showMCP()) setShowMCP(false);
    toggleSettings();
  };

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed());
    // Restore width if expanding from collapsed state
    if (isSidebarCollapsed()) {
      // It's becoming collapsed
    } else {
      // It's expanding
      if (sidebarWidth() < 200) setSidebarWidth(260);
    }
  };

  const refreshTasks = async () => {
    const taskList = await listTasks();
    setTasks(taskList);
  };

  const handleNewTask = async (title: string, description: string, projectPath?: string) => {
    const task = await createTask(title, description, projectPath);
    setActiveTask(task);

    const tempUserMessage: TaskMessage = {
      id: `temp-${Date.now()}`,
      task_id: task.id,
      role: "user",
      content: description,
      timestamp: Date.now(),
    };
    setTaskMessages([tempUserMessage]);
    await refreshTasks();

    setIsRunning(true);
    setToolExecutions([]);
    setCurrentText("");

    try {
      await runTaskAgent(
        {
          task_id: task.id,
          message: description,
          project_path: projectPath,
          max_turns: 50,
          locale: locale(),
        },
        handleAgentEvent
      );
    } catch (err) {
      console.error("Task error:", err);
    } finally {
      setIsRunning(false);
      const updated = await getTask(task.id);
      if (updated) setActiveTask(updated);
      const messages = await getTaskMessages(task.id);
      setTaskMessages(messages);
      await refreshTasks();
    }
  };

  const handleAgentEvent = async (event: AgentEvent) => {
    console.log("Agent event:", event);

    switch (event.type) {
      case "text":
        setCurrentText(event.content);
        break;
      case "plan":
        setActiveTask((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            plan: event.steps.map((s) => ({
              step: s.step,
              description: s.description,
              status: "pending" as const,
            })),
          };
        });
        break;
      case "step_start":
        setActiveTask((prev) => {
          if (!prev || !prev.plan) return prev;
          return {
            ...prev,
            current_step: event.step,
            plan: prev.plan.map((s) =>
              s.step === event.step ? { ...s, status: "running" as const } : s
            ),
          };
        });
        break;
      case "step_done":
        setActiveTask((prev) => {
          if (!prev || !prev.plan) return prev;
          return {
            ...prev,
            plan: prev.plan.map((s) =>
              s.step === event.step ? { ...s, status: "completed" as const } : s
            ),
          };
        });
        break;
      case "tool_start":
        setToolExecutions((prev) => [
          ...prev,
          { id: Date.now(), tool: event.tool, status: "running" },
        ]);
        break;
      case "tool_end":
        setToolExecutions((prev) => {
          const updated = [...prev];
          const last = updated.findLast((t: ToolExecution) => t.tool === event.tool && t.status === "running");
          if (last) {
            last.status = event.success ? "completed" : "error";
          }
          return updated;
        });
        break;
      case "done":
        setActiveTask((prev) => {
          if (!prev) return prev;
          return { ...prev, status: "completed" };
        });
        break;
      case "error":
        setActiveTask((prev) => {
          if (!prev) return prev;
          return { ...prev, status: "failed" };
        });
        break;
    }
  };


  const handleSelectTask = async (task: Task) => {
    // Auto-close other panels to focus on task
    if (showSettings()) toggleSettings();
    setShowSkills(false);
    setShowMCP(false);

    setActiveTask(task);
    setCurrentText("");
    setToolExecutions([]);
    const messages = await getTaskMessages(task.id);
    setTaskMessages(messages);
  };

  const handleContinueTask = async (message: string, projectPath?: string) => {
    const task = activeTask();
    if (!task) return;

    const tempUserMessage: TaskMessage = {
      id: `temp-${Date.now()}`,
      task_id: task.id,
      role: "user",
      content: message,
      timestamp: Date.now(),
    };
    setTaskMessages((prev) => [...prev, tempUserMessage]);

    setIsRunning(true);
    setToolExecutions([]);
    setCurrentText("");

    try {
      await runTaskAgent(
        {
          task_id: task.id,
          message,
          project_path: projectPath || task.project_path || undefined,
          max_turns: 50,
          locale: locale(),
        },
        handleAgentEvent
      );
    } catch (err) {
      console.error("Task error:", err);
    } finally {
      setIsRunning(false);
      const updated = await getTask(task.id);
      if (updated) setActiveTask(updated);
      const messages = await getTaskMessages(task.id);
      setTaskMessages(messages);
      await refreshTasks();
    }
  };

  const handleNewConversation = () => {
    setActiveTask(null);
    setTaskMessages([]);
    setCurrentText("");
    setToolExecutions([]);
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteTask(taskId);
    if (activeTask()?.id === taskId) {
      setActiveTask(null);
      setTaskMessages([]);
      setCurrentText("");
      setToolExecutions([]);
    }
    await refreshTasks();
  };

  // Layout Styles
  const getGridStyle = () => {
    if (isMobile()) return "1fr";
    if (!showTaskPanel()) {
      // Hide Panel: [Sidebar] [Main]
      return `${isSidebarCollapsed() ? "60px" : `${sidebarWidth()}px`} 1fr 0px`;
    }
    // Grid: [Sidebar] [Main Content] [Task Panel]
    return `${isSidebarCollapsed() ? "60px" : `${sidebarWidth()}px`} 1fr ${TASK_PANEL_WIDTH}px`;
  };

  return (
    <div
      class="app agent-layout"
      style={{
        "grid-template-columns": getGridStyle(),
        "position": "relative"
      }}
    >
      <Show when={!isLoading()} fallback={<LoadingScreen />}>
        {/* Sidebar & Mobile Backdrop */}
        <Show when={isMobile() && !isSidebarCollapsed()}>
          <div
            class="sidebar-backdrop"
            onClick={() => setIsSidebarCollapsed(true)}
          />
        </Show>

        <div
          class={`sidebar-container ${isMobile() ? "mobile" : ""} ${isSidebarCollapsed() ? "collapsed" : ""}`}
          style={{ width: isMobile() ? "260px" : (isSidebarCollapsed() ? "60px" : `${sidebarWidth()}px`) }}
        >
          <TaskSidebar
            tasks={tasks()}
            activeTaskId={activeTask()?.id || null}
            collapsed={isMobile() ? false : isSidebarCollapsed()}
            onToggleCollapse={handleToggleSidebar}
            onSelectTask={handleSelectTask}
            onDeleteTask={handleDeleteTask}
            onSettingsClick={handleToggleSettings}
            onSkillsClick={toggleSkills}
            onMCPClick={toggleMCP}
          />
        </div>


        <main class="main-content">
          {/* Mobile Header Toggle (if Sidebar is hidden) */}
          <Show when={isMobile() && isSidebarCollapsed()}>
            <button
              class="mobile-menu-btn"
              onClick={() => setIsSidebarCollapsed(false)}
              style={{ position: 'absolute', top: '1rem', left: '1rem', 'z-index': 10 }}
            >
              ☰
            </button>
          </Show>

          <Show when={showSettings()}>
            <Settings />
          </Show>
          <Show when={showSkills()}>
            <SkillsList onClose={() => setShowSkills(false)} />
          </Show>
          <Show when={showMCP()}>
            <MCPSettings onClose={() => setShowMCP(false)} />
          </Show>
          <Show when={!showSettings() && !showSkills() && !showMCP()}>
            <AgentMain
              onNewTask={handleNewTask}
              onContinueTask={handleContinueTask}
              onNewConversation={handleNewConversation}
              currentText={currentText()}
              isRunning={isRunning()}
              activeTask={activeTask()}
              messages={taskMessages()}
              currentLocale={locale()}
            />
          </Show>
        </main>

        <aside
          class="task-panel-container"
          style={{
            display: (isMobile() || !showTaskPanel()) ? 'none' : 'block',
            width: `${TASK_PANEL_WIDTH}px`
          }}
        >
          <TaskPanel
            task={activeTask()}
            isRunning={isRunning()}
            toolExecutions={toolExecutions()}
          />
        </aside>
      </Show>
    </div>
  );
};

const LoadingScreen: Component = () => (
  <div class="loading-screen">
    <div class="loading-content">
      <h1>Kuse Cowork</h1>
      <p>Loading...</p>
    </div>
  </div>
);

export default App;
