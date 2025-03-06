import React, { useRef, useEffect } from 'react';
import './ConversationLog.css';

const ConversationLog = ({ conversations }) => {
  const logRef = useRef(null);

  // Auto-scroll to the latest message
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [conversations]);

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="conversation-log">
      <div className="conversation-header">
        <h3>對話記錄</h3>
        <p>Conversation History</p>
      </div>
      
      <div className="conversation-entries" ref={logRef}>
        {conversations.length === 0 ? (
          <div className="empty-conversation">
            <p>對話將顯示在這裡 / Conversation will appear here</p>
          </div>
        ) : (
          conversations.map((entry, index) => (
            <div 
              key={index} 
              className={`conversation-entry ${entry.role === 'nurse' ? 'nurse-entry' : 'patient-entry'}`}
            >
              <div className="entry-header">
                <span className="entry-role">
                  {entry.role === 'nurse' ? '護士 / Nurse' : '病人 / Patient'}
                </span>
                <span className="entry-time">{formatTimestamp(entry.timestamp)}</span>
              </div>
              <div className="entry-text">{entry.text}</div>
            </div>
          ))
        )}
      </div>

      <div className="conversation-actions">
        <button className="save-btn">
          保存對話記錄
          <span>Save Conversation</span>
        </button>
      </div>
    </div>
  );
};

export default ConversationLog; 