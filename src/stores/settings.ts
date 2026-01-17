import { createSignal } from "solid-js";
import {
  getSettings as getSettingsApi,
  saveSettings as saveSettingsApi,
  Settings as ApiSettings,
} from "../lib/tauri-api";

export interface Settings {
  apiKey: string;
  model: string;
  baseUrl: string;
  maxTokens: number;
  temperature?: number;
}

export const AVAILABLE_MODELS = [
  // Claude Models (Anthropic)
  { id: "claude-opus-4-5-20251101", name: "Claude Opus 4.5", description: "Most capable", provider: "anthropic", baseUrl: "https://api.anthropic.com" },
  { id: "claude-sonnet-4-5-20250929", name: "Claude Sonnet 4.5", description: "Enhanced balanced model", provider: "anthropic", baseUrl: "https://api.anthropic.com" },

  // GPT Models (OpenAI)
  { id: "gpt-5.2", name: "GPT 5.2", description: "Latest OpenAI model", provider: "openai", baseUrl: "https://api.openai.com" },
  { id: "gpt-5.1-codex", name: "GPT 5.1 Codex", description: "Code-specialized model", provider: "openai", baseUrl: "https://api.openai.com" },

  // Gemini Models (Google)
  { id: "gemini-3-pro", name: "Gemini 3 Pro", description: "Google's latest model", provider: "google", baseUrl: "https://generativelanguage.googleapis.com" },

  // Minimax Models
  { id: "minimax-m2.1", name: "Minimax M2.1", description: "Advanced Chinese model", provider: "minimax", baseUrl: "https://api.minimax.chat" },
];

const DEFAULT_SETTINGS: Settings = {
  apiKey: "",
  model: "claude-sonnet-4-5-20250929",
  baseUrl: "https://api.anthropic.com",
  maxTokens: 4096,
};

// Convert between frontend and API formats
function fromApiSettings(api: ApiSettings): Settings {
  return {
    apiKey: api.api_key,
    model: api.model,
    baseUrl: api.base_url,
    maxTokens: api.max_tokens,
  };
}

function toApiSettings(settings: Settings): ApiSettings {
  return {
    api_key: settings.apiKey,
    model: settings.model,
    base_url: settings.baseUrl,
    max_tokens: settings.maxTokens,
  };
}

const [settings, setSettings] = createSignal<Settings>(DEFAULT_SETTINGS);
const [showSettings, setShowSettings] = createSignal(false);
const [isLoading, setIsLoading] = createSignal(true);

// Load settings on startup
export async function loadSettings() {
  setIsLoading(true);
  try {
    const apiSettings = await getSettingsApi();
    setSettings(fromApiSettings(apiSettings));
  } catch (e) {
    console.error("Failed to load settings:", e);
  } finally {
    setIsLoading(false);
  }
}

// Save settings
async function persistSettings(newSettings: Settings) {
  try {
    await saveSettingsApi(toApiSettings(newSettings));
  } catch (e) {
    console.error("Failed to save settings:", e);
  }
}

// Helper function to get model info
export function getModelInfo(modelId: string) {
  return AVAILABLE_MODELS.find(m => m.id === modelId);
}

// Helper function to get default base URL for a model
export function getDefaultBaseUrl(modelId: string): string {
  const model = getModelInfo(modelId);
  return model?.baseUrl || "https://api.anthropic.com";
}

export function useSettings() {
  return {
    settings,
    setSettings,
    showSettings,
    isLoading,
    toggleSettings: () => setShowSettings((v) => !v),
    updateSetting: async <K extends keyof Settings>(key: K, value: Settings[K]) => {
      let newSettings = { ...settings(), [key]: value };

      // Auto-update base URL when model changes (unless user has custom URL)
      if (key === 'model' && typeof value === 'string') {
        const currentModel = getModelInfo(settings().model);
        const newModel = getModelInfo(value);

        // Only auto-update if current URL matches the previous model's default
        if (currentModel && newModel && settings().baseUrl === currentModel.baseUrl) {
          newSettings.baseUrl = newModel.baseUrl;
        }
      }

      setSettings(newSettings);
      await persistSettings(newSettings);
    },
    saveAllSettings: async (newSettings: Settings) => {
      setSettings(newSettings);
      await persistSettings(newSettings);
    },
    isConfigured: () => settings().apiKey.length > 0,
    loadSettings,
    getModelInfo,
    getDefaultBaseUrl,
  };
}
