import { Component, For, createSignal, createMemo } from "solid-js";
import { useSettings, AVAILABLE_MODELS } from "../stores/settings";
import { testConnection } from "../lib/tauri-api";
import "./Settings.css";

const Settings: Component = () => {
  const { settings, updateSetting, toggleSettings } = useSettings();
  const [testing, setTesting] = createSignal(false);
  const [testResult, setTestResult] = createSignal<string | null>(null);
  // const [saving, setSaving] = createSignal(false);

  // Group models by provider
  const groupedModels = createMemo(() => {
    const groups: Record<string, typeof AVAILABLE_MODELS> = {};
    AVAILABLE_MODELS.forEach(model => {
      const provider = model.provider || 'other';
      if (!groups[provider]) groups[provider] = [];
      groups[provider].push(model);
    });
    return groups;
  });

  const providerNames: Record<string, string> = {
    anthropic: 'Anthropic (Claude)',
    openai: 'OpenAI (GPT)',
    google: 'Google (Gemini)',
    minimax: 'Minimax',
    other: 'Other'
  };

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
      setTestResult(`Error: ${errorMsg}`);
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
        <h2>Settings</h2>
        <button class="close-btn" onClick={toggleSettings}>
          Close
        </button>
      </div>

      <div class="settings-content">
        <div class="settings-section">
          <h3>API Configuration</h3>

          <div class="form-group">
            <label for="apiKey">API Key</label>
            <input
              id="apiKey"
              type="password"
              value={settings().apiKey}
              onInput={(e) => updateSetting("apiKey", e.currentTarget.value)}
              placeholder="sk-ant-..."
            />
            <span class="hint">
              Get your API key from{" "}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
              >
                Anthropic Console
              </a>
            </span>
          </div>

          <div class="form-group">
            <label for="baseUrl">API Base URL</label>
            <input
              id="baseUrl"
              type="text"
              value={settings().baseUrl}
              onInput={(e) => updateSetting("baseUrl", e.currentTarget.value)}
              placeholder="https://api.anthropic.com"
            />
            <span class="hint">
              Use custom endpoint for proxies or compatible APIs
            </span>
          </div>

          <div class="form-group">
            <button
              class="test-btn"
              onClick={handleTest}
              disabled={testing() || !settings().apiKey}
            >
              {testing() ? "Testing..." : "Test Connection"}
            </button>
            {testResult() === "success" && (
              <span class="test-success">Connection successful!</span>
            )}
            {testResult() && testResult() !== "success" && (
              <span class="test-error">{testResult()}</span>
            )}
          </div>
        </div>

        <div class="settings-section">
          <h3>Model Selection</h3>

          <div class="form-group">
            <label for="model">Model</label>
            <select
              id="model"
              value={settings().model}
              onChange={(e) => updateSetting("model", e.currentTarget.value)}
            >
              <For each={Object.entries(groupedModels())}>
                {([provider, models]) => (
                  <optgroup label={providerNames[provider] || provider}>
                    <For each={models}>
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
            <span class="hint">
              Base URL will auto-update when you change models
            </span>
          </div>

          <div class="form-group">
            <label for="maxTokens">Max Tokens</label>
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

        </div>

        <div class="settings-section">
          <h3>Data Storage</h3>
          <p class="hint" style={{ margin: 0 }}>
            All data is stored locally on your computer in SQLite database.
            <br />
            API key is securely stored and never sent to any server except Anthropic's API.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
