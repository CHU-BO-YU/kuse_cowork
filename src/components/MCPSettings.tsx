import { Component, For, createSignal, onMount, createMemo } from "solid-js";
import {
  MCPServerConfig,
  MCPServerStatus,
  listMCPServers,
  saveMCPServer,
  deleteMCPServer,
  connectMCPServer,
  disconnectMCPServer,
  getMCPServerStatuses
} from "../lib/mcp-api";
import { useI18n } from "../stores/i18n";
import Icon from "./Icon";
import "./MCPSettings.css";

interface MCPSettingsProps {
  onClose: () => void;
}

const MCPSettings: Component<MCPSettingsProps> = (props) => {
  const { t } = useI18n();
  const [servers, setServers] = createSignal<MCPServerConfig[]>([]);
  const [statuses, setStatuses] = createSignal<MCPServerStatus[]>([]);
  const [showAddForm, setShowAddForm] = createSignal(false);
  const [editingServer, setEditingServer] = createSignal<MCPServerConfig | null>(null);
  const [loading, setLoading] = createSignal(false);

  // Form state
  const [formData, setFormData] = createSignal({
    name: "",
    serverUrl: "",
    oauthClientId: "",
    oauthClientSecret: "",
  });

  const mergedData = createMemo(() => {
    const statusMap = new Map(statuses().map(s => [s.id, s]));
    return servers().map(server => ({
      server,
      status: statusMap.get(server.id)
    }));
  });

  onMount(async () => {
    await refreshData();
  });

  const refreshData = async () => {
    try {
      setLoading(true);
      const [serverList, statusList] = await Promise.all([
        listMCPServers(),
        getMCPServerStatuses()
      ]);
      setServers(serverList);
      setStatuses(statusList);
    } catch (err) {
      console.error("Failed to load MCP data:", err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      serverUrl: "",
      oauthClientId: "",
      oauthClientSecret: "",
    });
    setEditingServer(null);
    setShowAddForm(false);
  };

  const startEdit = (server: MCPServerConfig) => {
    setFormData({
      name: server.name,
      serverUrl: server.server_url || "",
      oauthClientId: server.oauth_client_id || "",
      oauthClientSecret: server.oauth_client_secret || "",
    });
    setEditingServer(server);
    setShowAddForm(true);
  };

  const handleSave = async () => {
    try {
      const data = formData();

      if (!data.name.trim()) {
        alert(t("mcp.alerts.nameRequired"));
        return;
      }

      if (!data.serverUrl.trim()) {
        alert(t("mcp.alerts.urlRequired"));
        return;
      }

      const config: MCPServerConfig = {
        id: editingServer()?.id || crypto.randomUUID(),
        name: data.name,
        server_url: data.serverUrl,
        oauth_client_id: data.oauthClientId.trim() || undefined,
        oauth_client_secret: data.oauthClientSecret.trim() || undefined,
        enabled: editingServer()?.enabled ?? true,
        created_at: editingServer()?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await saveMCPServer(config);
      await refreshData();
      resetForm();
    } catch (err) {
      console.error("Failed to save server:", err);
      alert(t("mcp.alerts.saveFailed"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("mcp.deleteConfirm"))) {
      return;
    }

    try {
      await deleteMCPServer(id);
      await refreshData();
    } catch (err) {
      console.error("Failed to delete server:", err);
      alert("Failed to delete server");
    }
  };

  const handleToggleConnection = async (server: MCPServerConfig, currentStatus?: MCPServerStatus) => {
    try {
      if (currentStatus?.status === "Connected") {
        await disconnectMCPServer(server.id);
      } else {
        await connectMCPServer(server.id);
      }
      await refreshData();
    } catch (err) {
      console.error("Failed to toggle connection:", err);
      alert("Failed to connect/disconnect server");
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "Connected": return "green";
      case "Connecting": return "orange";
      case "Error": return "red";
      default: return "gray";
    }
  };

  return (
    <div class="mcp-settings">
      <div class="mcp-settings-header">
        <h2>{t("mcp.title")}</h2>
        <div class="header-actions">
          <button class="add-btn" onClick={() => setShowAddForm(true)}>
            {t("mcp.addServer")}
          </button>
          <button class="refresh-btn" onClick={refreshData} disabled={loading()}>
            {loading() ? t("common.loading") : t("mcp.refresh")}
          </button>
          <button class="header-close-btn" onClick={props.onClose}>
            <Icon name="close" size={24} />
          </button>
        </div>
      </div>

      <div class="mcp-settings-content">
        {showAddForm() && (
          <div class="add-form">
            <h3>{editingServer() ? t("mcp.addForm.titleEdit") : t("mcp.addForm.titleAdd")}</h3>

            <div class="form-group">
              <label>{t("mcp.addForm.name")}</label>
              <input
                type="text"
                value={formData().name}
                onInput={(e) => setFormData(prev => ({ ...prev, name: e.currentTarget.value }))}
                placeholder={t("mcp.addForm.namePlaceholder")}
              />
            </div>

            <div class="form-group">
              <label>{t("mcp.addForm.url")}</label>
              <input
                type="url"
                value={formData().serverUrl}
                onInput={(e) => setFormData(prev => ({ ...prev, serverUrl: e.currentTarget.value }))}
                placeholder={t("mcp.addForm.urlPlaceholder")}
              />
            </div>

            <details class="advanced-settings">
              <summary>{t("mcp.addForm.advanced")}</summary>
              <div class="advanced-content">
                <div class="form-group">
                  <label>{t("mcp.addForm.oauthId")}</label>
                  <input
                    type="text"
                    value={formData().oauthClientId}
                    onInput={(e) => setFormData(prev => ({ ...prev, oauthClientId: e.currentTarget.value }))}
                    placeholder="your-oauth-client-id"
                  />
                </div>

                <div class="form-group">
                  <label>{t("mcp.addForm.oauthSecret")}</label>
                  <input
                    type="password"
                    value={formData().oauthClientSecret}
                    onInput={(e) => setFormData(prev => ({ ...prev, oauthClientSecret: e.currentTarget.value }))}
                    placeholder="your-oauth-client-secret"
                  />
                </div>
              </div>
            </details>

            <div class="warning-text">
              <strong>{t("mcp.warning")}</strong> {t("mcp.warningDesc")}
            </div>

            <div class="form-actions">
              <button class="save-btn" onClick={handleSave}>
                {editingServer() ? t("mcp.update") : t("mcp.add")}
              </button>
              <button class="cancel-btn" onClick={resetForm}>{t("mcp.cancel")}</button>
            </div>
          </div>
        )}

        <div class="servers-list">
          <h3>{t("mcp.listTitle")}</h3>

          {mergedData().length === 0 ? (
            <div class="empty-state">
              <p>{t("mcp.empty")}</p>
              <p>{t("mcp.emptyHint")}</p>
            </div>
          ) : (
            <div class="servers-grid">
              <For each={mergedData()}>
                {({ server, status }) => (
                  <div class="server-card">
                    <div class="server-header">
                      <div class="server-info">
                        <h4>{server.name}</h4>
                        <p>{server.server_url}</p>
                      </div>
                      <div class="server-status">
                        <span
                          class={`status-badge ${getStatusColor(status?.status)}`}
                          title={status?.last_error}
                        >
                          {status?.status === "Connected" ? t("mcp.status.connected") :
                            status?.status === "Error" ? t("mcp.status.error") :
                              status?.status || t("mcp.status.disconnected")}
                        </span>
                      </div>
                    </div>

                    <div class="server-details">
                      <div class="detail-row">
                        <strong>URL:</strong> {server.server_url}
                      </div>

                      {server.oauth_client_id && (
                        <div class="detail-row">
                          <strong>OAuth:</strong> Configured
                        </div>
                      )}

                      {status?.tools && status.tools.length > 0 && (
                        <div class="detail-row">
                          <strong>Tools:</strong> {status.tools.map(t => t.name).join(", ")}
                        </div>
                      )}
                    </div>

                    <div class="server-actions">
                      <button
                        class={`toggle-btn ${status?.status === "Connected" ? "disconnect" : "connect"}`}
                        onClick={() => handleToggleConnection(server, status)}
                        disabled={status?.status === "Connecting"}
                      >
                        {status?.status === "Connected" ? t("mcp.disconnect") :
                          status?.status === "Connecting" ? t("mcp.connecting") : t("mcp.connect")}
                      </button>
                      <button class="edit-btn" onClick={() => startEdit(server)}>
                        {t("mcp.edit")}
                      </button>
                      <button class="delete-btn" onClick={() => handleDelete(server.id)}>
                        {t("mcp.delete")}
                      </button>
                    </div>
                  </div>
                )}
              </For>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MCPSettings;