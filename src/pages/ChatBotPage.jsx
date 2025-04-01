import React from 'react';
import ChatBot from '../chatbot';
import '../chatbot/ChatBot.css';

const ChatBotPage = () => {
  return (
    <div className="chatbot-page">
      <header>
        <h1>AI Chat Assistant</h1>
        <p>Ask me anything about nursing and healthcare</p>
      </header>
      <main>
        <ChatBot />
      </main>
    </div>
  );
};

export default ChatBotPage; 