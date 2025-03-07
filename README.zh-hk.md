# 香港護理學生腸鏡檢查病人模擬系統

<div align="right">
  <a href="README.md">
    <img src="https://img.shields.io/badge/English-Language-blue" alt="English">
  </a>
</div>

為香港護理學生提供的模擬系統，用於練習與準備進行腸鏡檢查的病人的溝通技巧。該系統使用語音識別、AI驅動的回應和文字轉語音技術，創建一個說廣東話的互動式虛擬病人。

## 病人場景

模擬系統中的陳先生是一位58歲的男性，正準備進行腸鏡檢查，具有以下特點：

- **背景**：因最近排便習慣改變、偶爾大便帶血和輕微腹部不適而被轉介進行腸鏡檢查
- **情緒狀態**：焦慮、對檢查程序感到困惑、對討論症狀感到尷尬，並對潛在的不適感到緊張
- **溝通方式**：以香港式廣東話回應，表達關注並詢問有關檢查的問題

## 功能特點

- **語音識別**：使用Azure OpenAI Whisper API將口語廣東話轉錄為文字
- **AI回應生成**：使用Azure OpenAI GPT-4o API處理轉錄文字，創建情境適當的病人回應
- **文字轉語音**：使用Azure Speech Studio API的WanLung聲音將AI生成的文字回應轉換為口語廣東話
- **雙語界面**：支持廣東話和英語界面元素
- **對話歷史**：記錄並顯示對話以供回顧
- **建議問題**：提供護理學生可以用於練習的相關問題
- **面部動畫**：與語音同步的逼真視位基礎面部動畫

## 組件和架構

### 主要組件

#### PatientSimulator (src/components/PatientSimulator.jsx)
負責管理整個模擬體驗的核心組件。

- **功能**：
  - 管理護士語音輸入的錄製
  - 控制護士和虛擬病人之間的對話流程
  - 通過語音轉文字服務處理用戶輸入
  - 通過GPT-4o服務生成病人回應
  - 合成帶有視位數據的語音用於面部動畫
  - 維護對話歷史和音頻記錄
  - 提供練習用的建議問題
  - 支持全屏模式以獲得沉浸式體驗

- **主要功能**：
  - `startRecording()`：開始錄製用戶的語音
  - `stopRecording()`：停止錄製並發送音頻進行轉錄
  - `handlePatientResponse()`：處理護士的輸入並生成病人回應
  - `useSuggestedQuestion()`：允許從預定義問題中選擇
  - `getConversationAudio()`：維護對話的錄音

#### VisemeFace (src/components/VisemeFace.jsx)
渲染一個與語音同步口部動作的動畫面孔。

- **功能**：
  - 顯示具有動畫功能的基於SVG的面部頭像
  - 將視位（視覺音素）數據與音頻播放同步
  - 提供與語音聲音相對應的逼真口部動作
  - 包括眨眼和表情變化等自然動畫
  - 支持自動和手動動畫模式

- **主要特點**：
  - 不同語音聲音的詳細視位映射
  - 面部表情之間的平滑過渡
  - 自然的眨眼和眉毛動作
  - 支持動畫速度控制
  - 檢測停頓以實現自然語音節奏

#### ConversationLog (src/components/ConversationLog.jsx)
顯示護士和病人之間的互動歷史。

- **功能**：
  - 清晰區分角色的對話歷史渲染
  - 支持滾動瀏覽長對話
  - 為每次互動提供時間戳
  - 允許回顧先前的交流

### 服務模塊

#### speechToTextService.js
使用Azure OpenAI Whisper API處理語音識別。

- **主要功能**：`transcribeSpeech(audioBlob)`
  - 將錄製的音頻轉換為文字
  - 針對廣東話語言處理進行優化
  - 與Azure Whisper API端點通信
  - 處理錯誤並提供詳細日誌

#### gpt4Service.js
使用Azure OpenAI GPT-4o管理AI驅動的回應生成。

- **主要功能**：`generateResponse(userInput, conversationHistory)`
  - 處理護士的輸入以生成逼真的病人回應
  - 通過對話歷史維持上下文
  - 使用詳細的系統提示定義陳先生的性格
  - 確保回應使用自然的香港式廣東話
  - 模擬適當的情緒狀態（焦慮、困惑等）

#### textToSpeechService.js
將文字轉換為自然發音的廣東話語音，並帶有同步的視位數據。

- **主要功能**：
  - `textToSpeech(text)`：基本文字轉語音轉換
  - `textToSpeechWithViseme(text)`：帶有用於動畫的視位數據的高級轉換
  - 支持SSML（語音合成標記語言）以微調發音
  - 使用帶有WanLung神經聲音的Azure Speech Studio API
  - 生成用於面部動畫的同步視位數據

### 工具模塊

#### fileUtils.js
提供文件操作和數據處理的輔助功能。

- **功能**：
  - 處理音頻文件
  - 管理blob URL和清理
  - 提供數據轉換的實用功能

## 技術實現細節

### 語音識別過程
1. 使用瀏覽器的MediaRecorder API捕獲音頻
2. 將生成的音頻blob發送到Azure OpenAI Whisper API
3. API返回針對廣東話優化的轉錄文字
4. 顯示轉錄文字並處理以生成回應

### AI回應生成
1. 將轉錄的護士輸入與對話歷史結合
2. 詳細的系統提示定義陳先生的性格和情緒狀態
3. 完整的上下文發送到Azure OpenAI GPT-4o API
4. API生成廣東話的情境適當回應
5. 處理回應以進行語音合成

### 帶視位動畫的文字轉語音
1. 病人的文字回應使用SSML標籤格式化
2. Azure Speech Studio API處理SSML並生成：
   - 帶有自然廣東話語音的音頻文件
   - 帶有面部動作時間信息的視位數據
3. 播放音頻的同時視位數據驅動面部動畫
4. 同步確保口部動作與語音聲音匹配

### 對話流程
1. 護士說話或選擇建議問題
2. 使用Whisper API將語音轉錄為文字
3. GPT-4o根據上下文生成陳先生的回應
4. 回應轉換為帶有同步面部動畫的語音
5. 更新並顯示對話歷史
6. 重複該過程以繼續互動

## 技術堆疊

- 前端UI使用React.js
- 使用Azure OpenAI API的Whisper（語音轉文字）和GPT-4o（回應生成）
- 使用Azure Speech Studio API進行文字轉語音合成
- 使用Microsoft Cognitive Services Speech SDK進行視位生成
- 使用Vite進行快速開發和構建

## 開始使用

### 前提條件

- Node.js（v14或更高版本）
- Azure OpenAI API訪問權限
- Azure Speech Service訪問權限

### 安裝

1. 克隆此存儲庫
2. 安裝依賴項：
   ```
   npm install
   ```
3. 在根目錄中創建一個`.env`文件，包含您的API密鑰：
   ```
   # Azure OpenAI API Configuration for GPT-4o
   VITE_AZURE_OPENAI_API_KEY=your_azure_openai_api_key_here
   VITE_AZURE_OPENAI_ENDPOINT=your_azure_openai_endpoint_here
   VITE_AZURE_OPENAI_DEPLOYMENT_ID=your_azure_openai_gpt4o_deployment_id_here
   VITE_AZURE_OPENAI_API_VERSION=your_azure_openai_api_version_here
   
   # Azure OpenAI API Configuration for Whisper
   VITE_AZURE_WHISPER_API_KEY=your_azure_whisper_api_key_here
   VITE_AZURE_WHISPER_ENDPOINT=your_azure_whisper_endpoint_here
   VITE_AZURE_WHISPER_API_VERSION=your_azure_whisper_api_version_here
   VITE_AZURE_WHISPER_DEPLOYMENT_ID=your_azure_whisper_deployment_id_here

   # Azure Speech Service Configuration
   VITE_AZURE_SPEECH_KEY=your_azure_speech_service_key_here
   VITE_AZURE_SPEECH_REGION=your_azure_speech_service_region_here
   VITE_AZURE_SPEECH_VOICE_NAME=zh-HK-WanLungNeural
   ```
   
   注意：如果GPT-4o和Whisper部署在同一個Azure OpenAI資源下，您可以使用相同的API密鑰；如果使用不同的資源，則可以設置單獨的密鑰。

### 開發

要啟動開發服務器：

```
npm run dev
```

### 構建生產版本

要構建用於生產的應用程序：

```
npm run build
```

### 在Vercel上部署

此應用程序配置為在Vercel上輕鬆部署：

1. 如果您還沒有，請在[Vercel](https://vercel.com)上創建一個帳戶
2. 安裝Vercel CLI（可選）：
   ```
   npm install -g vercel
   ```
3. 使用以下方法之一部署：

   **方法1：使用Vercel儀表板（推薦）**
   
   1. 將您的代碼推送到GitHub、GitLab或Bitbucket存儲庫
   2. 登錄您的Vercel帳戶
   3. 點擊"Add New">"Project"
   4. 選擇您的存儲庫
   5. 配置項目：
      - 框架預設：Vite
      - 構建命令：`npm run build`
      - 輸出目錄：`dist`
      - 環境變量：添加所有帶有`VITE_`前綴的Azure API密鑰
   6. 點擊"Deploy"

   **方法2：使用Vercel CLI**
   
   1. 登錄Vercel CLI：
      ```
      vercel login
      ```
   2. 從您的項目目錄部署：
      ```
      vercel
      ```
   3. 按照提示配置您的項目

**部署的重要注意事項：**

- 確保在Vercel儀表板的項目設置下添加所有環境變量
- 所有環境變量必須帶有`VITE_`前綴（例如，`VITE_AZURE_OPENAI_API_KEY`）
- 應用程序使用客戶端環境變量，因此它們將在瀏覽器中公開
- 對於生產環境，考慮實現後端代理以保持API調用的安全

## 使用方法

1. 點擊"開始模擬"按鈕開始模擬
2. 點擊錄音按鈕開始錄製您的聲音
3. 用廣東話與虛擬病人互動
4. 系統將轉錄您的語音，生成病人回應，並向您說出回應
5. 對話歷史記錄在右側顯示
6. 如果您不想說話，也可以點擊建議問題

## 教育目標

此模擬幫助護理學生練習：
- 醫療程序前的病人溝通
- 解決病人的焦慮和困惑
- 用病人友好的語言解釋醫療程序
- 以同理心回應情緒關注
- 在臨床環境中練習廣東話溝通

## 隱私說明

- 音頻不會永久存儲，僅用於轉錄
- 所有API密鑰應保持安全，不應提交到版本控制
- 對話數據僅存儲在瀏覽器會話中

## 廣東話語音的視位動畫

此應用程序支持使用Azure Speech Service為廣東話文字轉語音提供視位動畫。視位是語音中聲音的視覺表示，允許與口語音頻同步的逼真面部動畫。

### 特點

- **集成動畫**：應用程序包括與音頻同步的面部動畫
- **廣東話支持**：完全支持zh-HK-WanLungNeural聲音的視位ID
- **實時動畫**：面部動畫與音頻播放同步

### 技術實現

實現使用Microsoft Cognitive Services Speech SDK生成語音音頻和視位數據。視位數據包括：

- 視位ID：表示不同口部位置的數字
- 音頻時間：將視位與音頻同步的精確時間數據
- 動畫數據：用於高級動畫的附加數據（如果可用）

### 工作原理

1. 文字使用特殊SSML標籤發送到Azure Speech Service，請求視位數據
2. 服務返回音頻和一系列視位事件
3. 每個視位事件包含ID和時間戳
4. 應用程序播放音頻並根據視位數據為面部添加動畫
</rewritten_file> 