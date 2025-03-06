import React, { useState, useRef } from 'react';
import { textToSpeech } from '../services/textToSpeechService';

const SpeechTest = () => {
  const [testText, setTestText] = useState('你好，我是陳先生。');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const audioRef = useRef(null);

  const handleTestSpeech = async () => {
    try {
      setIsLoading(true);
      setError('');
      setSuccess(false);
      
      console.log('Testing speech with text:', testText);
      const audioUrl = await textToSpeech(testText);
      
      audioRef.current.src = audioUrl;
      audioRef.current.onplay = () => {
        setSuccess(true);
        console.log('Audio playback started');
      };
      
      audioRef.current.onerror = (e) => {
        console.error('Audio playback error:', e);
        setError('音頻播放失敗');
      };
      
      await audioRef.current.play();
    } catch (err) {
      console.error('Test speech error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="speech-test" style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', marginTop: '20px' }}>
      <h3>文字轉語音測試 (Text-to-Speech Test)</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <textarea
          value={testText}
          onChange={(e) => setTestText(e.target.value)}
          style={{ width: '100%', padding: '10px', height: '100px' }}
          placeholder="輸入測試文本..."
        />
      </div>
      
      <button
        onClick={handleTestSpeech}
        disabled={isLoading || !testText.trim()}
        style={{
          padding: '10px 20px',
          backgroundColor: '#3498db',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isLoading ? 'wait' : 'pointer',
          opacity: isLoading || !testText.trim() ? 0.7 : 1
        }}
      >
        {isLoading ? '處理中...' : '測試文字轉語音'}
      </button>
      
      {error && (
        <div style={{ color: 'red', marginTop: '10px', padding: '10px', backgroundColor: '#ffebee', borderRadius: '4px' }}>
          錯誤: {error}
        </div>
      )}
      
      {success && (
        <div style={{ color: 'green', marginTop: '10px', padding: '10px', backgroundColor: '#e8f5e9', borderRadius: '4px' }}>
          成功! 音頻正在播放。
        </div>
      )}
      
      <audio ref={audioRef} style={{ marginTop: '15px', width: '100%', display: 'block' }} controls />
      
      <div style={{ marginTop: '15px', fontSize: '14px', color: '#666' }}>
        <p>此測試組件直接使用文字轉語音服務，可幫助識別問題。</p>
        <p>如果這裡的測試成功但主應用程序失敗，可能是在處理整體對話流程時出現問題。</p>
      </div>
    </div>
  );
};

export default SpeechTest; 