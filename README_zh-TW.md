# Kuse Cowork

Claude Code Desktop App 的開源替代方案。支援任何模型、BYOK (自備金鑰)，使用 Rust 語言編寫。

> [!NOTE]
> 本專案正處於活躍開發階段。若允許 Agent 存取本地目錄，請務必謹慎操作。

---

## 為何選擇 Kuse Cowork？

**BYOK (自備金鑰)**
使用您自己的 API Key (Anthropic, OpenAI) 甚至本地模型 (Ollama)，確保絕對的隱私與控制權。

**純 Rust Agent**
Agent 完全以 Rust 編寫，具備極致效能與記憶體安全性，且零外部依賴。

**原生跨平台**
在 macOS、Windows 和 Linux 上皆能展現原生效能。

**容器隔離**
使用 Docker 容器執行指令，確保安全並與您的主機系統完全隔離。

**可擴充技能系統**
透過自訂技能擴充 Agent 能力。內建支援文件處理 (docx, pdf, pptx, xlsx)。

**支援 MCP 協定**
完整支援 Model Context Protocol (MCP)，無縫整合各種工具。

---

## 功能特色

*   **本地私有**: 完全在您的機器上運行，API 呼叫直接發送至您的提供商。
*   **模型通用**: 相容 Claude、GPT、本地模型等。
*   **跨平台**: 支援 macOS (ARM/Intel)、Windows 和 Linux。
*   **輕量級**: 使用 Tauri 構建，應用程式大小僅約 10MB。
*   **容器化**: Docker 隔離執行，增強安全性。

---

## 快速開始

### 前置需求
*   [Node.js](https://nodejs.org/) 18+
*   [Rust](https://rustup.rs/)
*   [Docker Desktop](https://www.docker.com/products/docker-desktop/) (容器隔離功能必需)

### 安裝步驟

1.  **複製儲存庫**
    ```bash
    git clone https://github.com/kuse-ai/kuse-cowork.git
    cd kuse-cowork
    ```

2.  **安裝依賴**
    ```bash
    npm install
    ```

3.  **以開發模式執行**
    ```bash
    npm run tauri dev
    ```

4.  **建置正式版**
    ```bash
    npm run tauri build
    ```

---

## 使用指南

### 設定 AI 模型
1.  開啟 **設定** (側邊欄齒輪圖示)。
2.  選擇 **語言** (English / 繁體中文)。
3.  選擇 **AI 提供商** (Cloud / Ollama / Custom)。
4.  輸入您的 **API Key** (金鑰僅儲存於本地)。

### 開始任務
1.  點擊 **新任務**。
2.  描述您的目標 (例如：「分析 data 資料夾中的 CSV 檔案」)。
3.  若有需要，選擇工作目錄。
4.  觀察 Agent 規劃並一步步執行任務。

---

## 貢獻指南

### 如何新增/更新語言

Kuse Cowork 支援國際化 (i18n)。您可以輕鬆新增語言或更新現有翻譯。

**1. 找到翻譯檔案**
所有翻譯檔案皆位於 `src/locales/` 目錄中。
*   `en.json` (英文 - 基準檔案)
*   `zh-TW.json` (繁體中文)

**2. 新增語言**
1.  在 `src/locales/` 中建立新的 JSON 檔案 (例如：`ja.json` 用於日文)。
2.  將 `en.json` 的內容複製到新檔案中。
3.  翻譯所有數值 (請勿更改 Key)。
4.  在 `src/stores/i18n.ts` (或相關設定檔) 中註冊新語言。

**3. 更新現有翻譯**
1.  開啟相關的 JSON 檔案 (例如：`zh-TW.json`)。
2.  找到您想更新的 Key。
3.  修改翻譯內容。
4.  儲存檔案。

> [!TIP]
> 請確保翻譯字串中保留如 `{count}` 或 `{name}` 等變數符號。

---

## 授權

MIT License - 詳情請見 [LICENSE](LICENSE)。

## 致謝

靈感來自 **Claude Cowork**。
