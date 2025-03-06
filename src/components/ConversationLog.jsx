import React, { useRef, useEffect, useState } from 'react';
import './ConversationLog.css';
import { downloadConversationZip, saveConversationToText } from '../utils/fileUtils';
import { saveAs } from 'file-saver';

const ConversationLog = ({ conversations, audioRecordings }) => {
  const logRef = useRef(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

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

  // Function to save text only as a fallback
  const saveTextOnly = () => {
    try {
      console.log('Saving text only as fallback');
      const textBlob = saveConversationToText(conversations);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `conversation_${timestamp}.txt`;
      saveAs(textBlob, filename);
      return true;
    } catch (error) {
      console.error('Error saving text only:', error);
      return false;
    }
  };

  // Handle the save conversation action
  const handleSaveConversation = async () => {
    try {
      console.log('Save conversation clicked');
      setIsSaving(true);
      setSaveError('');
      setSaveSuccess(false);
      
      // Check if there's anything to save
      if (conversations.length === 0) {
        setSaveError('沒有對話可保存 / No conversation to save');
        return;
      }
      
      console.log('Preparing to save', conversations.length, 'conversation entries');
      
      // Get audio recordings if available
      let audioBlobs = [];
      console.log('Audio recordings received:', audioRecordings);

      if (audioRecordings && typeof audioRecordings.getAll === 'function') {
        console.log('Getting audio from function');
        audioBlobs = audioRecordings.getAll();
      } else if (audioRecordings && Array.isArray(audioRecordings)) {
        console.log('Using array of audio recordings');
        audioBlobs = audioRecordings.filter(blob => blob !== null && blob !== undefined);
      } else if (audioRecordings && audioRecordings.blob) {
        // Single audio recording
        console.log('Using single audio recording');
        audioBlobs = [audioRecordings.blob];
      }
      
      console.log('Collected', audioBlobs.length, 'audio blobs for saving');
      
      // If no audio is available, just save the text
      if (audioBlobs.length === 0) {
        console.log('No audio available, saving only text');
      }
      
      // Download the conversation as a zip file
      let success;
      try {
        success = await downloadConversationZip(conversations, audioBlobs);
        console.log('Download result:', success);
      } catch (zipError) {
        console.error('Error creating zip, falling back to text-only:', zipError);
        // Fall back to saving text only
        success = saveTextOnly();
      }
      
      if (success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000); // Clear success message after 3 seconds
      } else {
        setSaveError('保存失敗 / Save failed');
      }
    } catch (error) {
      console.error('Error saving conversation:', error);
      setSaveError(`保存時出錯: ${error.message} / Error while saving: ${error.message}`);
      
      // Try to save text only as a last resort
      try {
        if (saveTextOnly()) {
          setSaveSuccess(true);
          setSaveError('僅保存了文字對話記錄 / Only text conversation was saved');
        }
      } catch (e) {
        console.error('Even text-only save failed:', e);
      }
    } finally {
      setIsSaving(false);
    }
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
        <button 
          className={`save-btn ${isSaving ? 'saving' : ''}`} 
          onClick={() => {
            console.log('Save button clicked');
            handleSaveConversation();
          }}
          disabled={isSaving || conversations.length === 0}
        >
          {isSaving ? '正在保存...' : '保存對話記錄'}
          <span>{isSaving ? 'Saving...' : 'Save Conversation'}</span>
        </button>
        
        {saveError && (
          <div className="save-error">
            {saveError}
          </div>
        )}
        
        {saveSuccess && (
          <div className="save-success">
            保存成功！文件已下載 / Saved successfully! File downloaded.
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationLog; 