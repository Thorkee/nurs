import React, { useState, useEffect, useRef } from 'react';
import './PatientSimulator.css';
import SpeechTest from './SpeechTest';

// Services for API communication
import { transcribeSpeech } from '../services/speechToTextService';
import { generateResponse } from '../services/gpt4Service';
import { textToSpeech } from '../services/textToSpeechService';

const PatientSimulator = ({ isActive, onStart, onStop, onConversationUpdate }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [patientResponse, setPatientResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [conversationHistory, setConversationHistory] = useState([]);
  const [showSpeechTest, setShowSpeechTest] = useState(false);
  
  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Suggested questions based on the colonoscopy scenario
  const suggestedQuestions = [
    {
      category: "一般疑問",
      questions: [
        "我係咪真係需要做呢個大腸內窺鏡？係咪咁重要㗎？",
        "呢個檢查實際上係點做㗎？會唔會痛？"
      ]
    },
    {
      category: "大腸內窺鏡準備",
      questions: [
        "做呢個檢查之前要準備啲咩？會唔會好麻煩或者唔舒服？",
        "準備過程會唔會令我覺得唔舒服或者作嘔？"
      ]
    },
    {
      category: "身體檢查階段",
      questions: [
        "點解要做身體檢查先？係咪一定要做？",
        "你而家做緊啲咩？可唔可以解釋比我知？",
        "呢個檢查會唔會好唔舒服，或者好尷尬？"
      ]
    },
    {
      category: "檢查後疑問",
      questions: [
        "做呢個檢查有冇咩風險或者副作用？做完之後我要注意啲咩？",
        "通常要幾耐先有結果？之後會發生咩事？"
      ]
    }
  ];

  // Function to use a suggested question
  const useSuggestedQuestion = (question) => {
    const nurseEntry = {
      role: 'nurse',
      text: question,
      timestamp: new Date().toISOString()
    };
    
    setTranscribedText(question);
    setConversationHistory(prev => [...prev, nurseEntry]);
    onConversationUpdate(nurseEntry);
    
    // Process the question to get a response
    handlePatientResponse(question);
  };

  // Process the patient response after getting transcribed text
  const handlePatientResponse = async (text) => {
    try {
      setIsProcessing(true);
      setError('');
      
      // Generate patient response
      const response = await generateResponse(text, conversationHistory);
      setPatientResponse(response);
      
      // Add patient's response to conversation
      const patientEntry = {
        role: 'patient',
        text: response,
        timestamp: new Date().toISOString()
      };
      setConversationHistory(prev => [...prev, patientEntry]);
      onConversationUpdate(patientEntry);
      
      // Convert response to speech
      try {
        const audioUrl = await textToSpeech(response);
        audioRef.current.src = audioUrl;
        
        // Add event listeners for audio playback
        audioRef.current.onerror = (e) => {
          console.error('Audio playback error:', e);
          setError('音頻播放失敗。請閱讀文本回應。');
        };
        
        audioRef.current.onended = () => {
          console.log('Audio playback finished successfully');
        };
        
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            console.error('Audio play error:', err);
            // Try playing again after a short delay
            setTimeout(() => {
              audioRef.current.play().catch(e => {
                console.error('Retry audio play error:', e);
                setError('音頻播放失敗。請閱讀文本回應。');
              });
            }, 1000);
          });
        }
      } catch (audioErr) {
        console.error('Text-to-speech error:', audioErr);
        setError(`音頻生成錯誤: ${audioErr.message}`);
        // We can still continue with the text response
      }
    } catch (err) {
      console.error('Response generation error:', err);
      setError(`處理響應時出錯: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Start recording audio
  const startRecording = async () => {
    try {
      setError('');
      setTranscribedText('');
      setPatientResponse('');
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        audioChunksRef.current = [];
        
        if (audioBlob.size < 100) {
          setError('錄音太短或沒有聲音被錄製。請再試一次。');
          return;
        }
        
        try {
          setIsProcessing(true);
          setError('');
          
          // Step 1: Transcribe speech to text
          const text = await transcribeSpeech(audioBlob);
          
          if (!text || text.trim() === '') {
            setError('無法識別您的語音，請再試一次或使用建議問題。');
            setIsProcessing(false);
            return;
          }
          
          setTranscribedText(text);
          
          // Add nurse's speech to conversation
          const nurseEntry = {
            role: 'nurse',
            text: text,
            timestamp: new Date().toISOString()
          };
          setConversationHistory(prev => [...prev, nurseEntry]);
          onConversationUpdate(nurseEntry);
          
          // Step 2 & 3: Generate response and convert to speech
          await handlePatientResponse(text);
          
        } catch (err) {
          console.error('Audio processing error:', err);
          setError(`音頻處理錯誤: ${err.message}`);
        } finally {
          setIsProcessing(false);
        }
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access error:', err);
      setError(`麥克風訪問錯誤: ${err.message}. 請確保麥克風已連接並且已授予訪問權限。`);
    }
  };

  // Stop recording audio
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Stop all microphone tracks
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        if (mediaRecorderRef.current.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
      }
    };
  }, []);

  return (
    <div className="patient-simulator">
      <div className="patient-controls">
        <h3>病人模擬器 - 陳先生，58歲</h3>
        <p>Patient Simulator - Mr. Chan, 58 years old</p>
        
        {isActive && (
          <div className="patient-info">
            <h4>臨床情景: 大腸內窺鏡準備</h4>
            <p>- 陳先生因最近大便習慣改變、偶爾便血和輕微腹部不適被轉介做大腸內窺鏡。</p>
            <p>- 他目前尚未得到診斷，這顯著增加了他的焦慮。</p>
            <p>- 他對大腸內窺鏡程序、準備工作、潛在不適和可能的嚴重結果感到擔憂。</p>
            <p>- 他感到焦慮、困惑、尷尬和緊張。</p>
            <p className="role-instruction"><strong>注意：</strong> 您是護士，陳先生是病人。您需要向陳先生提問，他會回答您的問題。</p>
          </div>
        )}
        
        <div className="conversation-display">
          {transcribedText && (
            <div className="nurse-speech">
              <strong>護士:</strong> {transcribedText}
            </div>
          )}
          
          {patientResponse && (
            <div className="patient-speech">
              <strong>陳先生:</strong> {patientResponse}
            </div>
          )}
        </div>

        <div className="controls">
          {!isActive ? (
            <button className="start-btn" onClick={onStart}>
              開始模擬
            </button>
          ) : (
            <>
              <button 
                className={`record-btn ${isRecording ? 'recording' : ''}`} 
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
              >
                {isRecording ? '停止錄音' : '開始錄音'}
              </button>
              
              <button className="stop-btn" onClick={onStop}>
                結束模擬
              </button>
            </>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}
        
        {error && error.includes('Failed to convert text to speech') && (
          <button 
            className="debug-btn"
            onClick={() => setShowSpeechTest(!showSpeechTest)}
            style={{
              marginTop: '10px',
              padding: '5px 10px',
              backgroundColor: '#f39c12',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {showSpeechTest ? '隱藏語音測試' : '顯示語音測試工具'}
          </button>
        )}
        
        {showSpeechTest && <SpeechTest />}
      </div>
      
      <audio ref={audioRef} className="hidden" />
    </div>
  );
};

export default PatientSimulator; 