import type { Settings } from "../stores/settings";
import type { Message } from "../stores/chat";
import { getModelInfo } from "../stores/settings";

interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

interface AIProvider {
  name: string;
  sendMessage(
    messages: AIMessage[],
    settings: Settings,
    onStream?: (text: string) => void
  ): Promise<string>;
  testConnection(settings: Settings): Promise<string>;
}

// Anthropic Claude Provider
class AnthropicProvider implements AIProvider {
  name = "anthropic";

  async sendMessage(
    messages: AIMessage[],
    settings: Settings,
    onStream?: (text: string) => void
  ): Promise<string> {
    const response = await fetch(`${settings.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": settings.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: settings.model,
        max_tokens: settings.maxTokens,
        stream: !!onStream,
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `API error: ${response.status}`);
    }

    if (onStream) {
      return this.handleStreamResponse(response, onStream);
    }

    const data = await response.json();
    return data.content[0]?.text || "";
  }

  private async handleStreamResponse(
    response: Response,
    onStream: (text: string) => void
  ): Promise<string> {
    let fullText = "";
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                fullText += parsed.delta.text;
                onStream(fullText);
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    }

    return fullText;
  }

  async testConnection(settings: Settings): Promise<string> {
    try {
      const response = await fetch(`${settings.baseUrl}/v1/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": settings.apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: settings.model,
          max_tokens: 10,
          messages: [{ role: "user", content: "Hi" }],
        }),
      });

      if (response.ok) return "success";
      const error = await response.json().catch(() => ({}));
      return `Error: ${error.error?.message || response.status}`;
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : "Unknown error"}`;
    }
  }
}

// OpenAI Provider
class OpenAIProvider implements AIProvider {
  name = "openai";

  async sendMessage(
    messages: AIMessage[],
    settings: Settings,
    onStream?: (text: string) => void
  ): Promise<string> {
    const response = await fetch(`${settings.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model,
        max_tokens: settings.maxTokens,
        stream: !!onStream,
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `API error: ${response.status}`);
    }

    if (onStream) {
      return this.handleStreamResponse(response, onStream);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
  }

  private async handleStreamResponse(
    response: Response,
    onStream: (text: string) => void
  ): Promise<string> {
    let fullText = "";
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                fullText += delta;
                onStream(fullText);
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    }

    return fullText;
  }

  async testConnection(settings: Settings): Promise<string> {
    try {
      const response = await fetch(`${settings.baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify({
          model: settings.model,
          max_tokens: 10,
          messages: [{ role: "user", content: "Hi" }],
        }),
      });

      if (response.ok) return "success";
      const error = await response.json().catch(() => ({}));
      return `Error: ${error.error?.message || response.status}`;
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : "Unknown error"}`;
    }
  }
}

// Google Gemini Provider
class GoogleProvider implements AIProvider {
  name = "google";

  async sendMessage(
    messages: AIMessage[],
    settings: Settings,
    onStream?: (text: string) => void
  ): Promise<string> {
    // Convert messages to Gemini format
    const contents = messages.map(msg => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }]
    }));

    const url = `${settings.baseUrl}/v1beta/models/${settings.model}:generateContent?key=${settings.apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          maxOutputTokens: settings.maxTokens,
          },
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (onStream) {
      onStream(text);
    }

    return text;
  }

  async testConnection(settings: Settings): Promise<string> {
    try {
      const url = `${settings.baseUrl}/v1beta/models/${settings.model}:generateContent?key=${settings.apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "Hi" }] }],
          generationConfig: { maxOutputTokens: 10 },
        }),
      });

      if (response.ok) return "success";
      const error = await response.json().catch(() => ({}));
      return `Error: ${error.error?.message || response.status}`;
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : "Unknown error"}`;
    }
  }
}

// Minimax Provider
class MinimaxProvider implements AIProvider {
  name = "minimax";

  async sendMessage(
    messages: AIMessage[],
    settings: Settings,
    onStream?: (text: string) => void
  ): Promise<string> {
    const response = await fetch(`${settings.baseUrl}/v1/text/chatcompletion_v2`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model,
        max_tokens: settings.maxTokens,
        stream: !!onStream,
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";

    if (onStream) {
      onStream(text);
    }

    return text;
  }

  async testConnection(settings: Settings): Promise<string> {
    try {
      const response = await fetch(`${settings.baseUrl}/v1/text/chatcompletion_v2`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify({
          model: settings.model,
          max_tokens: 10,
          messages: [{ role: "user", content: "Hi" }],
        }),
      });

      if (response.ok) return "success";
      const error = await response.json().catch(() => ({}));
      return `Error: ${error.error?.message || response.status}`;
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : "Unknown error"}`;
    }
  }
}

// Provider registry
const providers: Record<string, AIProvider> = {
  anthropic: new AnthropicProvider(),
  openai: new OpenAIProvider(),
  google: new GoogleProvider(),
  minimax: new MinimaxProvider(),
};

// Get provider for a model
function getProvider(modelId: string): AIProvider {
  const modelInfo = getModelInfo(modelId);
  const providerName = modelInfo?.provider || 'anthropic';
  return providers[providerName] || providers.anthropic;
}

// Unified AI client
export async function sendMessage(
  messages: Message[],
  settings: Settings,
  onStream?: (text: string) => void
): Promise<string> {
  const provider = getProvider(settings.model);
  const aiMessages: AIMessage[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  return provider.sendMessage(aiMessages, settings, onStream);
}

export async function testConnection(settings: Settings): Promise<string> {
  const provider = getProvider(settings.model);
  return provider.testConnection(settings);
}