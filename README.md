# Kuse Cowork

Open-source Alternative for Claude Code Desktop App. Works with any model, BYOK (Bring Your Own Key), written in Rust.

> [!NOTE]
> This project is in active development. Please exercise caution when allowing the agent to access local directories.

---

## Why Kuse Cowork?

**BYOK (Bring Your Own Key)**
Use your own API keys (Anthropic, OpenAI) or local models (Ollama) for complete privacy and control.

**Pure Rust Agent**
Built entirely in Rust for maximum performance and memory safety, with zero external runtime dependencies.

**Native Cross-Platform**
Native performance on macOS, Windows, and Linux.

**Container Isolation**
Executes commands within Docker containers to ensure security and isolation from your host system.

**Extensible Skills System**
Extend agent capabilities with custom skills. Supports document handling (docx, pdf, etc.) out of the box.

**MCP Protocol Support**
Full support for the Model Context Protocol (MCP) for seamless tool integration.

---

## Features

*   **Local & Private**: Runs on your machine; API calls go directly to your provider.
*   **Model Agnostic**: Compatible with Claude, GPT, local LLMs, and more.
*   **Cross-Platform**: Support for macOS (ARM/Intel), Windows, and Linux.
*   **Lightweight**: Minimal footprint using Tauri (~10MB).
*   **Containerized**: Docker isolation for secure execution.

---

## Quick Start

### Prerequisites
*   [Node.js](https://nodejs.org/) 18+
*   [Rust](https://rustup.rs/)
*   [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Required for container isolation)

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/kuse-ai/kuse-cowork.git
    cd kuse-cowork
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Run in development mode**
    ```bash
    npm run tauri dev
    ```

4.  **Build for production**
    ```bash
    npm run tauri build
    ```

---

## Usage

### Configure AI Model
1.  Open **Settings** (gear icon in sidebar).
2.  Select your **Language** (English / Traditional Chinese).
3.  Choose your **AI Provider** (Cloud / Ollama / Custom).
4.  Enter your **API Key** (keys are stored locally).

### Start a Task
1.  Click **New Task**.
2.  Describe your objective (e.g., "Analyze the CSV files in the data folder").
3.  Select a working directory if needed.
4.  Watch the agent plan and execute the task step-by-step.

---

## Contributing

### How to Add/Update Languages

Kuse Cowork supports internationalization (i18n). You can easily add a new language or update existing translations.

**1. Locate Translation Files**
All translation files are located in `src/locales/`.
*   `en.json` (English - Base)
*   `zh-TW.json` (Traditional Chinese)

**2. Add a New Language**
1.  Create a new JSON file in `src/locales/` (e.g., `ja.json` for Japanese).
2.  Copy the content from `en.json` to your new file.
3.  Translate all values (do not change the keys).
4.  Register the new language in `src/stores/i18n.ts` (or relevant configuration file).

**3. Update Existing Translations**
1.  Open the relevant JSON file (e.g., `zh-TW.json`).
2.  Find the key you want to update.
3.  Modify the value.
4.  Save the file.

> [!TIP]
> Ensure that any variables like `{count}` or `{name}` are preserved in the translated string.

---

## License

MIT License - see [LICENSE](LICENSE) for details.

## Credits

Inspired by **Claude Cowork**.
