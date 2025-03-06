import React, { useState, useEffect, useRef } from 'react';
import './PatientSimulator.css';

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
      const audioUrl = await textToSpeech(response);
      audioRef.current.src = audioUrl;
      audioRef.current.play();
    } catch (err) {
      setError(`Error processing response: ${err.message}`);
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Start recording audio
  const startRecording = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        audioChunksRef.current = [];
        
        try {
          setIsProcessing(true);
          
          // Step 1: Transcribe speech to text
          const text = await transcribeSpeech(audioBlob);
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
          setError(`Error processing audio: ${err.message}`);
          console.error(err);
        } finally {
          setIsProcessing(false);
        }
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      setError(`Microphone access error: ${err.message}`);
      console.error(err);
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
      <div className="patient-avatar">
        <img src="/patient-avatar.png" alt="Mr. Chan - Virtual Patient" />
        {isProcessing && <div className="processing-indicator">處理中...</div>}
      </div>

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
        
        {isActive && (
          <div className="suggestion-box">
            <h4>建議問題:</h4>
            {suggestedQuestions.map((category, catIndex) => (
              <div key={catIndex} className="question-category">
                <h5>{category.category}</h5>
                <div className="suggested-questions">
                  {category.questions.map((question, qIndex) => (
                    <div 
                      key={qIndex} 
                      className="suggested-question"
                      onClick={() => useSuggestedQuestion(question)}
                    >
                      {question}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <audio ref={audioRef} className="hidden" />
    </div>
  );
};

export default PatientSimulator; 