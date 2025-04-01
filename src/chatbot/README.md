# Text-based Azure OpenAI Chatbot

This is a sleek, modern text-based chatbot interface that integrates with Azure OpenAI API. It provides a user interface similar to OpenAI's ChatGPT, with the ability to download conversations as text files.

## Features

- Clean, modern UI inspired by OpenAI's design
- Real-time message streaming for a responsive experience
- History of conversation maintained during the session
- Download conversation as a text file
- Start new chat with a single click
- Responsive design that works on both desktop and mobile devices

## Components

- `ChatUI.jsx` - The main user interface component
- `ChatService.js` - Service for handling API calls to Azure OpenAI
- `utils.js` - Utility functions for the chatbot
- `ChatbotApp.jsx` - Standalone app component for the chatbot
- `index.jsx` - Export for the chatbot component

## API Integration

The chatbot uses the Azure OpenAI API with the following environment variables:

```
VITE_AZURE_OPENAI_API_KEY - Your Azure OpenAI API key
VITE_AZURE_OPENAI_ENDPOINT - Your Azure OpenAI endpoint
VITE_AZURE_OPENAI_DEPLOYMENT_ID - The deployment ID for your GPT model
VITE_AZURE_OPENAI_API_VERSION - The API version for Azure OpenAI
```

## Usage

The chatbot can be used standalone or integrated into an existing application:

```jsx
import Chatbot from './chatbot';

function MyApp() {
  return (
    <div>
      <h1>My App</h1>
      <Chatbot />
    </div>
  );
}
```

## Customization

The chatbot's appearance can be customized by modifying the `ChatUI.css` file. The system message for the AI can be modified in the `ChatService.js` file. 