import { useState, useRef, useEffect } from 'react';
import { generateChatResponse } from './ChatService';
import { formatTime, exportChatAsText } from './utils';
import './ChatUI.css';

// Icons as SVG components
const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);

const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

const NewChatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

export default function ChatUI() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);
  const messageEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    // Add user message to chat
    const userMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      // Create a placeholder for the assistant's message
      const assistantPlaceholder = {
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true
      };
      
      setMessages(prev => [...prev, assistantPlaceholder]);

      // Define stream handler for real-time updates
      const streamHandler = (chunk, fullText) => {
        setMessages(prev => {
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;
          
          if (lastIndex >= 0 && newMessages[lastIndex].role === 'assistant') {
            newMessages[lastIndex] = {
              ...newMessages[lastIndex],
              content: fullText,
              isStreaming: true
            };
          }
          
          return newMessages;
        });
      };
      
      // Get response from API with streaming
      const response = await generateChatResponse(
        input.trim(),
        messages.map(m => ({ role: m.role, content: m.content })),
        streamHandler
      );
      
      // Update the last message with the complete response and remove streaming flag
      setMessages(prev => {
        const newMessages = [...prev];
        const lastIndex = newMessages.length - 1;
        
        if (lastIndex >= 0 && newMessages[lastIndex].role === 'assistant') {
          newMessages[lastIndex] = {
            ...newMessages[lastIndex],
            content: response,
            isStreaming: false
          };
        }
        
        return newMessages;
      });
    } catch (error) {
      console.error('Error getting response:', error);
      
      // Add error message to chat
      setMessages(prev => {
        const newMessages = [...prev];
        const lastIndex = newMessages.length - 1;
        
        if (lastIndex >= 0 && newMessages[lastIndex].role === 'assistant') {
          // Replace the placeholder with error message
          newMessages[lastIndex] = {
            role: 'assistant',
            content: 'Sorry, I encountered an error. Please try again.',
            timestamp: Date.now(),
            isError: true,
            isStreaming: false
          };
        } else {
          // Add new error message
          newMessages.push({
            role: 'assistant',
            content: 'Sorry, I encountered an error. Please try again.',
            timestamp: Date.now(),
            isError: true,
            isStreaming: false
          });
        }
        
        return newMessages;
      });
    } finally {
      setIsLoading(false);
      // Focus back on input after response
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e) => {
    // Submit on Enter without Shift
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const startNewChat = () => {
    if (messages.length > 0 && window.confirm('Start a new conversation? This will clear the current chat.')) {
      setMessages([]);
      setInput('');
      inputRef.current?.focus();
    } else if (messages.length === 0) {
      inputRef.current?.focus();
    }
  };

  const downloadChat = () => {
    exportChatAsText(messages);
  };

  return (
    <div className="chat-container">
      <header className="chat-header">
        <h1>Azure OpenAI Chat</h1>
        <div className="chat-actions">
          <button
            className="action-button"
            onClick={startNewChat}
            title="New Chat"
            aria-label="Start a new chat"
          >
            <NewChatIcon />
            <span>New Chat</span>
          </button>
          <button
            className="action-button"
            onClick={downloadChat}
            disabled={messages.length === 0}
            title="Download Chat"
            aria-label="Download chat as a text file"
          >
            <DownloadIcon />
            <span>Download</span>
          </button>
        </div>
      </header>
      
      <div className="messages-container" ref={chatContainerRef}>
        {messages.length === 0 ? (
          <div className="empty-state">
            <h2>Start a conversation</h2>
            <p>Ask a question to begin chatting with the AI assistant.</p>
          </div>
        ) : (
          messages.map((message, i) => (
            <div
              key={i}
              className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'} ${
                message.isError ? 'error-message' : ''
              }`}
            >
              <div className="message-header">
                <span className="message-role">{message.role === 'user' ? 'You' : 'Assistant'}</span>
                {message.timestamp && (
                  <span className="message-time">{formatTime(message.timestamp)}</span>
                )}
              </div>
              <div className="message-content">
                {message.content}
                {message.isStreaming && <span className="typing-indicator"></span>}
              </div>
            </div>
          ))
        )}
        <div ref={messageEndRef} />
      </div>
      
      <form className="input-form" onSubmit={handleSubmit}>
        <div className="input-container">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            rows={1}
            disabled={isLoading}
            className="chat-input"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="send-button"
            aria-label="Send message"
          >
            <SendIcon />
          </button>
        </div>
        <div className="input-help-text">
          Press Enter to send. Shift+Enter for new line.
        </div>
      </form>
    </div>
  );
} 