# Colonoscopy Patient Simulation for Student Nurses in Hong Kong

A simulation system for nursing students in Hong Kong to practice their communication skills with patients preparing for colonoscopy procedures. The system uses speech recognition, AI-powered responses, and text-to-speech to create an interactive virtual patient that speaks Cantonese.

## Patient Scenario

The simulation features Mr. Chan, a 58-year-old man preparing for a colonoscopy with the following characteristics:

- **Background**: Referred for colonoscopy due to recent changes in bowel habits, occasional blood in stool, and mild abdominal discomfort
- **Emotional State**: Anxious, confused about the procedure, embarrassed about discussing symptoms, and nervous about potential discomfort
- **Communication**: Responds in Hong Kong-style Cantonese, expressing concerns and asking questions about the procedure

## Features

- **Speech Recognition**: Uses Azure OpenAI Whisper API to transcribe spoken Cantonese to text
- **AI Response Generation**: Processes transcribed text with Azure OpenAI GPT-4o API to create contextually appropriate patient responses
- **Text-to-Speech**: Converts AI-generated text responses to spoken Cantonese using Azure Speech Studio API with WanLung voice
- **Bilingual Interface**: Support for both Cantonese and English UI elements
- **Conversation History**: Records and displays the conversation for review
- **Suggested Questions**: Provides relevant questions that nursing students can use to practice

## Technical Stack

- React.js for the frontend UI
- Azure OpenAI API for Whisper (speech-to-text) and GPT-4o (response generation)
- Azure Speech Studio API for text-to-speech synthesis
- Vite for fast development and building

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- Azure OpenAI API access
- Azure Speech Service access

### Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file in the root directory with your API keys:
   ```
   # Azure OpenAI API Configuration for GPT-4o
   AZURE_OPENAI_API_KEY=your_azure_openai_api_key_here
   AZURE_OPENAI_ENDPOINT=your_azure_openai_endpoint_here
   AZURE_OPENAI_DEPLOYMENT_ID=your_azure_openai_gpt4o_deployment_id_here
   AZURE_OPENAI_API_VERSION=your_azure_openai_api_version_here
   
   # Azure OpenAI API Configuration for Whisper
   AZURE_WHISPER_API_KEY=your_azure_whisper_api_key_here
   AZURE_WHISPER_ENDPOINT=your_azure_whisper_endpoint_here
   AZURE_WHISPER_API_VERSION=your_azure_whisper_api_version_here
   AZURE_WHISPER_DEPLOYMENT_ID=your_azure_whisper_deployment_id_here

   # Azure Speech Service Configuration
   AZURE_SPEECH_KEY=your_azure_speech_service_key_here
   AZURE_SPEECH_REGION=your_azure_speech_service_region_here
   AZURE_SPEECH_VOICE_NAME=zh-HK-WanLungNeural
   ```
   
   Note: You can use the same API keys for both GPT-4o and Whisper if they're deployed under the same Azure OpenAI resource, or you can set up separate keys if you're using different resources.

### Development

To start the development server:

```
npm run dev
```

### Building for Production

To build the application for production:

```
npm run build
```

### Deployment on Vercel

This application is configured for easy deployment on Vercel:

1. Create an account on [Vercel](https://vercel.com) if you don't have one
2. Install the Vercel CLI (optional):
   ```
   npm install -g vercel
   ```
3. Deploy using one of these methods:

   **Method 1: Using Vercel Dashboard (Recommended)**
   
   1. Push your code to a GitHub, GitLab, or Bitbucket repository
   2. Log in to your Vercel account
   3. Click "Add New" > "Project"
   4. Select your repository
   5. Configure the project:
      - Framework Preset: Vite
      - Build Command: `npm run build`
      - Output Directory: `dist`
      - Environment Variables: Add all your Azure API keys with the `VITE_` prefix
   6. Click "Deploy"

   **Method 2: Using Vercel CLI**
   
   1. Log in to Vercel CLI:
      ```
      vercel login
      ```
   2. Deploy from your project directory:
      ```
      vercel
      ```
   3. Follow the prompts to configure your project

**Important Notes for Deployment:**

- Make sure to add all environment variables in the Vercel dashboard under your project settings
- All environment variables must be prefixed with `VITE_` (e.g., `VITE_AZURE_OPENAI_API_KEY`)
- The application uses client-side environment variables, so they will be exposed in the browser
- For production, consider implementing a backend proxy for API calls to keep your keys secure

## Usage

1. Start the simulation by clicking the "開始模擬" (Start Simulation) button
2. Click the record button to start recording your voice
3. Speak in Cantonese to interact with the virtual patient
4. The system will transcribe your speech, generate a patient response, and speak it back to you
5. The conversation history is recorded and displayed on the right side
6. You can also click on suggested questions if you prefer not to speak

## Educational Goals

This simulation helps nursing students practice:
- Patient communication before medical procedures
- Addressing patient anxiety and confusion
- Explaining medical procedures in patient-friendly language
- Responding to emotional concerns with empathy
- Practicing communication in Cantonese in a clinical context

## Privacy Notes

- Audio is not stored permanently and is only used for transcription
- All API keys should be kept secure and not committed to version control
- Conversation data is stored only in the browser session