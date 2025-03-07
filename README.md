# Colonoscopy Patient Simulation for Student Nurses in Hong Kong

<div align="left">
  <a href="README.zh-hk.md">
    <img src="https://img.shields.io/badge/%E4%B8%AD%E6%96%87-Chinese (Traditional)-blue" alt="繁體中文">
  </a>
</div>

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
- **Facial Animation**: Realistic viseme-based facial animation synchronized with speech

## Components and Architecture

### Main Components

#### PatientSimulator (src/components/PatientSimulator.jsx)
The core component responsible for managing the entire simulation experience.

- **Functionality**:
  - Manages recording of nurse's voice input
  - Controls the conversation flow between nurse and virtual patient
  - Processes user input through the speech-to-text service
  - Generates patient responses via the GPT-4o service
  - Synthesizes speech with viseme data for facial animation
  - Maintains conversation history and audio recordings
  - Provides suggested questions for practice
  - Supports fullscreen mode for immersive experience

- **Key Functions**:
  - `startRecording()`: Initiates audio recording of user's voice
  - `stopRecording()`: Stops recording and sends audio for transcription
  - `handlePatientResponse()`: Processes the nurse's input and generates patient response
  - `useSuggestedQuestion()`: Allows selection from predefined questions
  - `getConversationAudio()`: Maintains recordings of the conversation

#### VisemeFace (src/components/VisemeFace.jsx)
Renders an animated face that synchronizes mouth movements with speech.

- **Functionality**:
  - Displays a SVG-based facial avatar with animation capabilities
  - Synchronizes viseme (visual phoneme) data with audio playback
  - Provides realistic mouth movements corresponding to speech sounds
  - Includes natural animations like blinking and expression changes
  - Supports both automatic and manual animation modes

- **Key Features**:
  - Detailed viseme mapping for different speech sounds
  - Smooth transitions between facial expressions
  - Natural eye blinking and eyebrow movements
  - Support for animation speed control
  - Pause detection for natural speech rhythms

#### ConversationLog (src/components/ConversationLog.jsx)
Displays the history of interactions between the nurse and patient.

- **Functionality**:
  - Renders the conversation history with clear role distinction
  - Supports scrolling through long conversations
  - Provides timestamps for each interaction
  - Allows review of previous exchanges

### Service Modules

#### speechToTextService.js
Handles speech recognition using Azure OpenAI Whisper API.

- **Main Function**: `transcribeSpeech(audioBlob)`
  - Converts recorded audio to text
  - Optimized for Cantonese language processing
  - Communicates with Azure Whisper API endpoints
  - Handles errors and provides detailed logging

#### gpt4Service.js
Manages AI-powered response generation using Azure OpenAI GPT-4o.

- **Main Function**: `generateResponse(userInput, conversationHistory)`
  - Processes nurse's input to generate realistic patient responses
  - Maintains context through conversation history
  - Uses a detailed system prompt to define Mr. Chan's personality
  - Ensures responses are in natural Hong Kong-style Cantonese
  - Simulates appropriate emotional states (anxiety, confusion, etc.)

#### textToSpeechService.js
Converts text to natural-sounding Cantonese speech with synchronized viseme data.

- **Main Functions**:
  - `textToSpeech(text)`: Basic text-to-speech conversion
  - `textToSpeechWithViseme(text)`: Advanced conversion with viseme data for animation
  - Supports SSML (Speech Synthesis Markup Language) for fine-tuning pronunciation
  - Uses the Azure Speech Studio API with WanLung neural voice
  - Generates synchronized viseme data for facial animation

### Utility Modules

#### fileUtils.js
Provides helper functions for file operations and data handling.

- **Functionality**:
  - Handles audio file processing
  - Manages blob URLs and cleanup
  - Provides utility functions for data conversion

## Technical Implementation Details

### Speech Recognition Process
1. Audio is captured using the browser's MediaRecorder API
2. The resulting audio blob is sent to Azure OpenAI Whisper API
3. The API returns transcribed text optimized for Cantonese
4. Transcribed text is displayed and processed for response generation

### AI Response Generation
1. The transcribed nurse's input is combined with conversation history
2. A detailed system prompt defines Mr. Chan's personality and emotional state
3. The complete context is sent to Azure OpenAI GPT-4o API
4. The API generates a contextually appropriate response in Cantonese
5. The response is processed for speech synthesis

### Text-to-Speech with Viseme Animation
1. The patient's text response is formatted with SSML tags
2. Azure Speech Studio API processes the SSML and generates:
   - Audio file with natural Cantonese speech
   - Viseme data with timing information for facial movements
3. The audio is played while viseme data drives the facial animation
4. Synchronization ensures mouth movements match the speech sounds

### Conversation Flow
1. Nurse speaks or selects a suggested question
2. Speech is transcribed to text using Whisper API
3. GPT-4o generates Mr. Chan's response based on context
4. Response is converted to speech with synchronized facial animation
5. Conversation history is updated and displayed
6. The process repeats for continued interaction

## Technical Stack

- React.js for the frontend UI
- Azure OpenAI API for Whisper (speech-to-text) and GPT-4o (response generation)
- Azure Speech Studio API for text-to-speech synthesis
- Microsoft Cognitive Services Speech SDK for viseme generation
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

## Viseme Animation for Cantonese Speech

This application supports viseme animation for the Cantonese text-to-speech using Azure Speech Service. Visemes are visual representations of the sounds in speech, allowing for realistic facial animation that synchronizes with the spoken audio.

### Features

- **Integrated Animation**: The application includes facial animation synchronized with audio
- **Cantonese Support**: Full viseme ID support for the zh-HK-WanLungNeural voice
- **Real-time Animation**: Facial animations are synchronized with audio playback

### Technical Implementation

The implementation uses the Microsoft Cognitive Services Speech SDK to generate both speech audio and viseme data. The viseme data includes:

- Viseme IDs: Numbers that represent different mouth positions
- Audio timing: Precise timing data to synchronize the visemes with audio
- Animation data: Additional data for advanced animation (when available)

### How It Works

1. Text is sent to Azure Speech Service with a special SSML tag requesting viseme data
2. The service returns both audio and a series of viseme events
3. Each viseme event contains an ID and a timestamp
4. The application plays the audio and animates a face based on the viseme data
