import { Component, createSignal, createMemo, Show, For } from "solid-js";
import { useSettings, AVAILABLE_MODELS, PROVIDER_PRESETS, getProviderFromModel } from "../stores/settings";
import { testConnection } from "../lib/tauri-api";
import { useI18n, SUPPORTED_LOCALES, Locale } from "../stores/i18n";
import ModelSelector from "./ModelSelector";
import Icon from "./Icon";
import "./Settings.css";

const Settings: Component = () => {
  const { settings, updateSetting, toggleSettings } = useSettings();
  const { t, locale, setLocale } = useI18n();
  const [testing, setTesting] = createSignal(false);
  const [testResult, setTestResult] = createSignal<string | null>(null);


  // Get current selected model's provider info
  const currentProviderInfo = createMemo(() => {
    const model = AVAILABLE_MODELS.find(m => m.id === settings().model);
    if (model) {
      return PROVIDER_PRESETS[model.provider];
    }
    // If not in preset list, check baseUrl to determine provider
    const baseUrl = settings().baseUrl;
    if (baseUrl.includes("localhost:11434") || baseUrl.includes("127.0.0.1:11434")) {
      return PROVIDER_PRESETS["ollama"];
    }
    if (baseUrl.includes("localhost:8080")) {
      return PROVIDER_PRESETS["localai"];
    }
    // Other local services - use custom preset
    if (baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1")) {
      return PROVIDER_PRESETS["custom"];
    }
    return null;
  });

  // Check if it's a true local service (authType === "none", no API Key needed at all)
  const isNoAuthProvider = createMemo(() => {
    const info = currentProviderInfo();
    return info?.authType === "none";
  });

  // Check if API key is optional (custom provider - can work with or without key)
  const isApiKeyOptional = createMemo(() => {
    const providerId = getProviderFromModel(settings().model);
    // Custom provider with localhost URL - API key is optional
    if (providerId === "custom") {
      return true;
    }
    return false;
  });

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      console.log("Testing connection...");
      const result = await testConnection();
      console.log("Test result:", result, typeof result);
      setTestResult(result);
    } catch (e) {
      console.error("Test connection error:", e);
      const errorMsg = e instanceof Error ? e.message : String(e);
      setTestResult(`${t("common.error")}: ${errorMsg}`);
    }
    setTesting(false);
  };

  // const handleSave = async () => {
  //   setSaving(true);
  //   await saveAllSettings(settings());
  //   setSaving(false);
  // };

  return (
    <div class="settings">
      <div class="settings-header">
        <h2>{t("settings.title")}</h2>
        <button class="header-close-btn" onClick={toggleSettings}>
          <Icon name="close" size={24} />
        </button>
      </div>

      <div class="settings-content">
        <div class="settings-section">
          <h3>{t("settings.language")}</h3>
          <div class="form-group">
            <select
              value={locale()}
              onChange={(e) => setLocale(e.currentTarget.value as Locale)}
            >
              <For each={Object.entries(SUPPORTED_LOCALES)}>
                {([key, label]) => <option value={key}>{label}</option>}
              </For>
            </select>
          </div>
        </div>

        <div class="settings-section">
          <h3>{t("settings.modelSelection")}</h3>

          <ModelSelector
            value={settings().model}
            onChange={(modelId: string, baseUrl?: string) => {
              updateSetting("model", modelId);
              if (baseUrl) {
                updateSetting("baseUrl", baseUrl);
              }
            }}
          />
        </div>

        <div class="settings-section">
          <h3>{t("settings.apiConfiguration")}</h3>

          {/* Local service notice - only for providers that truly don't need auth */}
          <Show when={isNoAuthProvider()}>
            <div class="local-service-notice">
              <div class="notice-icon"><Icon name="home" size={20} /></div>
              <div class="notice-content">
                <strong>{t("settings.localService.title")}</strong>
                <p>{t("settings.localService.desc").replace("{name}", currentProviderInfo()?.name || "Service")}</p>
              </div>
            </div>
          </Show>

          {/* API Key input - show for all providers except those with authType === "none" */}
          <Show when={!isNoAuthProvider()}>
            <div class="form-group">
              <label for="apiKey">
                {t("settings.apiKey.label")}
                <Show when={isApiKeyOptional()}>
                  <span class="optional-tag">{t("settings.apiKey.optional")}</span>
                </Show>
              </label>
              <input
                id="apiKey"
                type="password"
                value={settings().apiKey}
                onInput={(e) => updateSetting("apiKey", e.currentTarget.value)}
                placeholder={currentProviderInfo()?.authType === "bearer" ? "sk-..." : t("settings.apiKey.placeholder")}
              />
              <span class="hint">
                <Show
                  when={currentProviderInfo()?.id === "anthropic"}
                  fallback={
                    <Show
                      when={isApiKeyOptional()}
                      fallback={<>{t("settings.apiKey.get")} {currentProviderInfo()?.name}</>}
                    >
                      {t("settings.apiKey.customOptional")}
                    </Show>
                  }
                >
                  {t("settings.apiKey.get")}{" "}
                  <a href="https://console.anthropic.com/settings/keys" target="_blank">
                    Anthropic Console
                  </a>
                </Show>
              </span>
            </div>
          </Show>

          <div class="form-group">
            <label for="baseUrl">{t("settings.baseUrl.label")}</label>
            <input
              id="baseUrl"
              type="text"
              value={settings().baseUrl}
              onInput={(e) => updateSetting("baseUrl", e.currentTarget.value)}
              placeholder={currentProviderInfo()?.baseUrl || "https://api.example.com"}
            />
            <span class="hint">
              {isNoAuthProvider()
                ? t("settings.baseUrl.hintLocal")
                : t("settings.baseUrl.hintCustom")}
            </span>
          </div>

          {/* OpenAI Organization and Project ID - only show for OpenAI provider */}
          <Show when={currentProviderInfo()?.id === "openai"}>
            <div class="form-group">
              <label for="openaiOrg">
                {t("settings.openai.orgId")}
                <span class="optional-tag">{t("settings.apiKey.optional")}</span>
              </label>
              <input
                id="openaiOrg"
                type="text"
                value={settings().openaiOrganization || ""}
                onInput={(e) => updateSetting("openaiOrganization", e.currentTarget.value || undefined)}
                placeholder="org-..."
              />
              <span class="hint">
                {t("settings.openai.orgHint")}
              </span>
            </div>

            <div class="form-group">
              <label for="openaiProject">
                {t("settings.openai.projectId")}
                <span class="optional-tag">{t("settings.apiKey.optional")}</span>
              </label>
              <input
                id="openaiProject"
                type="text"
                value={settings().openaiProject || ""}
                onInput={(e) => updateSetting("openaiProject", e.currentTarget.value || undefined)}
                placeholder="proj_..."
              />
              <span class="hint">
                {t("settings.openai.projectHint")}
              </span>
            </div>
          </Show>

          <div class="form-group">
            <label for="maxTokens">{t("settings.maxTokens")}</label>
            <input
              id="maxTokens"
              type="number"
              value={settings().maxTokens}
              onInput={(e) =>
                updateSetting("maxTokens", parseInt(e.currentTarget.value) || 4096)
              }
              min={1}
              max={200000}
            />
          </div>

          <div class="form-group">
            <button
              class="test-btn"
              onClick={handleTest}
              disabled={testing() || (!isNoAuthProvider() && !isApiKeyOptional() && !settings().apiKey)}
            >
              {testing() ? t("settings.test.testing") : t("settings.test.button")}
            </button>
            {testResult() === "success" && (
              <span class="test-success">{t("settings.test.success")}</span>
            )}
            {testResult() && testResult() !== "success" && (
              <span class="test-error">{testResult()}</span>
            )}
          </div>
        </div>

        <div class="settings-section">
          <h3>{t("settings.dataStorage.title")}</h3>
          <p class="hint" style={{ margin: 0 }}>
            {t("settings.dataStorage.desc1")}
            <br />
            {t("settings.dataStorage.desc2")}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
