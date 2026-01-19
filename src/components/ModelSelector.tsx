import { Component, For, Show, createSignal, createMemo, onMount } from "solid-js";
import { AVAILABLE_MODELS, PROVIDER_PRESETS, ProviderConfig } from "../stores/settings";
import { useI18n } from "../stores/i18n";
import { getOllamaModels, OllamaModel } from "../lib/tauri-api";
import Icon from "./Icon";
import "./ModelSelector.css";

// Format file size
function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// Provider type
type ProviderType = "cloud" | "ollama" | "custom";

// Ollama service status
type OllamaStatus = "checking" | "running" | "not-running";

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string, baseUrl?: string) => void;
}

const ModelSelector: Component<ModelSelectorProps> = (props) => {
  const { t } = useI18n();

  // Helper for time formatting with translation
  const formatTimeStr = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return t("modelSelector.time.today");
    if (diffDays === 1) return t("modelSelector.time.yesterday");
    if (diffDays < 7) return t("modelSelector.time.daysAgo").replace("{days}", diffDays.toString());
    if (diffDays < 30) return t("modelSelector.time.weeksAgo").replace("{weeks}", Math.floor(diffDays / 7).toString());
    return t("modelSelector.time.monthsAgo").replace("{months}", Math.floor(diffDays / 30).toString());
  };

  // Determine current model's provider type
  const getCurrentProviderType = (): ProviderType => {
    const model = AVAILABLE_MODELS.find(m => m.id === props.value);
    if (!model) {
      if (props.value && !props.value.includes("/")) {
        return "ollama";
      }
      return "cloud";
    }
    if (model.provider === "ollama") return "ollama";
    if (model.provider === "custom") return "custom";
    return "cloud";
  };

  const [providerType, setProviderType] = createSignal<ProviderType>(getCurrentProviderType());
  const [ollamaStatus, setOllamaStatus] = createSignal<OllamaStatus>("checking");
  const [ollamaModels, setOllamaModels] = createSignal<OllamaModel[]>([]);
  const [ollamaBaseUrl, _setOllamaBaseUrl] = createSignal("http://localhost:11434");

  // Cloud provider categories
  const cloudProviderCategories = createMemo(() => ({
    official: {
      name: t("modelSelector.cloud.official"),
      providers: ["anthropic", "openai", "google", "minimax", "deepseek"]
    },
    aggregator: {
      name: t("modelSelector.cloud.aggregator"),
      providers: ["openrouter", "together", "groq", "siliconflow"]
    }
  }));

  // Get cloud models grouped by provider
  const cloudModels = createMemo(() => {
    const result: Record<string, { name: string; models: typeof AVAILABLE_MODELS }> = {};
    const categories = cloudProviderCategories();

    for (const [key, category] of Object.entries(categories)) {
      const models = AVAILABLE_MODELS.filter(m => category.providers.includes(m.provider));
      if (models.length > 0) {
        result[key] = { name: category.name, models };
      }
    }
    return result;
  });

  // Check Ollama service status and get model list
  const checkOllamaStatus = async () => {
    setOllamaStatus("checking");
    try {
      const baseUrl = ollamaBaseUrl().replace(/\/$/, "");
      const models = await getOllamaModels(baseUrl);
      setOllamaModels(models);
      setOllamaStatus("running");
    } catch (error) {
      console.error("Ollama connection failed:", error);
      setOllamaStatus("not-running");
      setOllamaModels([]);
    }
  }

  onMount(() => {
    checkOllamaStatus();
  });

  // Currently selected Ollama model
  const selectedOllamaModel = createMemo(() => {
    return ollamaModels().find(m => m.name === props.value);
  });

  // Handle model selection
  const handleCloudModelChange = (modelId: string) => {
    const model = AVAILABLE_MODELS.find(m => m.id === modelId);
    if (model) {
      props.onChange(modelId, model.baseUrl);
    }
  };

  const handleOllamaModelSelect = (modelName: string) => {
    props.onChange(modelName, ollamaBaseUrl());
  };

  // Get current provider info
  const currentProviderInfo = createMemo((): ProviderConfig | null => {
    const model = AVAILABLE_MODELS.find(m => m.id === props.value);
    if (!model) return null;
    return PROVIDER_PRESETS[model.provider] || null;
  });

  return (
    <div class="model-selector">
      {/* Provider type tabs */}
      <div class="provider-tabs">
        <button
          class={`provider-tab ${providerType() === "cloud" ? "active" : ""}`}
          onClick={() => setProviderType("cloud")}
        >
          <div class="tab-icon"><Icon name="cloud" size={18} /></div>
          <span class="tab-label">{t("modelSelector.tabs.cloud")}</span>
        </button>
        <button
          class={`provider-tab ${providerType() === "ollama" ? "active" : ""}`}
          onClick={() => {
            setProviderType("ollama");
            checkOllamaStatus();
          }}
        >
          <div class="tab-icon"><Icon name="ollama" size={18} /></div>
          <span class="tab-label">{t("modelSelector.tabs.ollama")}</span>
        </button>
        <button
          class={`provider-tab ${providerType() === "custom" ? "active" : ""}`}
          onClick={() => setProviderType("custom")}
        >
          <div class="tab-icon"><Icon name="settings" size={18} /></div>
          <span class="tab-label">{t("modelSelector.tabs.custom")}</span>
        </button>
      </div>

      {/* Cloud service selection */}
      <Show when={providerType() === "cloud"}>
        <div class="cloud-selector">
          <select
            value={(() => {
              const currentVal = props.value;
              let exists = false;
              const categories = cloudModels();
              for (const cat of Object.values(categories)) {
                if (cat.models.some(m => m.id === currentVal)) {
                  exists = true;
                  break;
                }
              }
              return exists ? currentVal : "";
            })()}
            onChange={(e) => handleCloudModelChange(e.currentTarget.value)}
          >
            <option value="" disabled selected>
              {t("modelSelector.selectModel")}
            </option>
            <For each={Object.entries(cloudModels())}>
              {([_key, categoryData]) => (
                <optgroup label={categoryData.name}>
                  <For each={categoryData.models}>
                    {(model) => (
                      <option value={model.id}>
                        {model.name} - {model.description}
                      </option>
                    )}
                  </For>
                </optgroup>
              )}
            </For>
          </select>

          <Show when={currentProviderInfo()}>
            <div class="selected-info">
              <span class="info-badge">{currentProviderInfo()?.name}</span>
              <span class="info-desc">{currentProviderInfo()?.description}</span>
            </div>
          </Show>
        </div>
      </Show>

      {/* Ollama model selection */}
      <Show when={providerType() === "ollama"}>
        <div class="ollama-section">
          {/* Status indicator */}
          <Show when={ollamaStatus() === "checking"}>
            <div class="ollama-status checking">
              <div class="status-icon"><Icon name="search" size={16} /></div>
              <p>{t("modelSelector.ollama.checking")}</p>
            </div>
          </Show>

          <Show when={ollamaStatus() === "not-running"}>
            <div class="ollama-status not-running">
              <div class="status-icon"><Icon name="command" size={16} /></div>
              <div class="status-content">
                <p><strong>{t("modelSelector.ollama.notRunning.title")}</strong></p>
                <p>
                  {t("modelSelector.ollama.notRunning.desc")}{" "}
                  <a href="https://ollama.ai" target="_blank">Ollama</a>
                </p>
                <button class="retry-btn" onClick={checkOllamaStatus}>
                  {t("modelSelector.ollama.notRunning.retry")}
                </button>
              </div>
            </div>
          </Show>

          <Show when={ollamaStatus() === "running"}>
            <div class="ollama-status running">
              <div class="status-icon"><Icon name="docker" size={16} /></div>
              <p>{t("modelSelector.ollama.running").replace("{count}", ollamaModels().length.toString())}</p>
              <button class="refresh-btn" onClick={checkOllamaStatus}>
                {t("modelSelector.ollama.refresh")}
              </button>
            </div>

            <Show when={ollamaModels().length === 0}>
              <div class="no-models">
                <p>{t("modelSelector.ollama.noModels.title")}</p>
                <p class="hint">
                  {t("modelSelector.ollama.noModels.hint").split("{command}")[0]}
                  <code>ollama pull llama3.2</code>
                  {t("modelSelector.ollama.noModels.hint").split("{command}")[1]}
                </p>
              </div>
            </Show>

            <Show when={ollamaModels().length > 0}>
              <div class="model-list">
                <For each={ollamaModels()}>
                  {(model) => (
                    <div
                      class={`model-item ${selectedOllamaModel()?.name === model.name ? "selected" : ""}`}
                      onClick={() => handleOllamaModelSelect(model.name)}
                    >
                      <div class="model-main">
                        <span class="model-name">{model.name}</span>
                        <span class="model-size">{formatSize(model.size)}</span>
                      </div>
                      <div class="model-meta">
                        <span class="model-time">
                          {t("modelSelector.ollama.modelInfo.updated").replace("{time}", formatTimeStr(model.modified_at))}
                        </span>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </Show>

          {/* Current selected model */}
          <Show when={selectedOllamaModel()}>
            <div class="selected-model-info">
              <span class="label">{t("modelSelector.ollama.modelInfo.label")}</span>
              <span class="value">{selectedOllamaModel()?.name}</span>
            </div>
          </Show>
        </div>
      </Show>

      {/* Custom service */}
      <Show when={providerType() === "custom"}>
        <div class="custom-section">
          <div class="custom-notice">
            <div class="notice-icon"><Icon name="settings" size={20} /></div>
            <p>{t("modelSelector.custom.notice")}</p>
          </div>

          <div class="custom-form">
            <div class="form-group">
              <label>{t("modelSelector.custom.modelId")}</label>
              <input
                type="text"
                value={props.value === "custom-model" ? "" : props.value}
                placeholder={t("modelSelector.custom.placeholder")}
                onInput={(e) => props.onChange(e.currentTarget.value || "custom-model")}
              />
            </div>
            <p class="hint">{t("modelSelector.custom.hint")}</p>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default ModelSelector;
