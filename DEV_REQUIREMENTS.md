# Patient Simulation for Student Nurses in Hong Kong

## Overview
This application simulates a patient for student nurses in Hong Kong to practice their communication skills. The system uses speech recognition, AI-powered responses, and text-to-speech to create an interactive virtual patient that speaks Cantonese.

## Technical Requirements

### Core Functionality
1. **Speech Recognition**
   - Use Azure OpenAI Whisper API to transcribe spoken Cantonese to text
   - Handle real-time audio input from the user's microphone

2. **AI Response Generation**
   - Process transcribed text with Azure OpenAI GPT-4o API
   - Use custom prompts to generate contextually appropriate patient responses in Cantonese
   - Maintain conversation context throughout the session

3. **Text-to-Speech**
   - Convert AI-generated text responses to spoken Cantonese using Azure Speech Studio API
   - Use the WanLung voice model for natural-sounding speech

4. **User Interface**
   - Build a responsive React-based interface for the simulation
   - Include controls for starting/stopping recording
   - Display transcribed text and AI responses
   - Provide visual indicators for recording status and system processing

### Technical Specifications
- **Frontend**: React.js with modern JavaScript
- **API Integration**: Azure OpenAI APIs and Azure Speech Studio API
- **Security**: All API keys stored in environment variables (.env file)
- **Logging**: Record conversation history for review

### User Experience
- Simple, intuitive interface for nursing students
- Clear visual feedback for each step of the conversation
- Minimal latency between speech input and AI response

## Implementation Phases
1. Setup project structure and environment
2. Implement speech-to-text functionality
3. Integrate GPT-4o for response generation
4. Add text-to-speech capability
5. Build and refine the user interface
6. Add conversation logging and history
7. Testing and optimization

## Note
API keys for Azure services will be provided separately and should not be committed to the repository.
