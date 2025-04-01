import React from 'react';
import ChatUI from './ChatUI';

export default function Chatbot() {
  return (
    <div className="chatbot-wrapper">
      <ChatUI />
    </div>
  );
}

// Also export ChatUI directly for more flexibility
export { ChatUI }; 