import React, { useState, useEffect, useRef } from 'react';
import './PatientSimulator.css';
import SpeechTest from './SpeechTest';
import VisemeFace from './VisemeFace';

// Services for API communication
import { transcribeSpeech } from '../services/speechToTextService';
import { generateResponse } from '../services/gpt4Service';
import { textToSpeech, textToSpeechWithViseme } from '../services/textToSpeechService';

const PatientSimulator = ({ isActive, onStart, onStop, onConversationUpdate, onAudioRecorded }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [patientResponse, setPatientResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [conversationHistory, setConversationHistory] = useState([]);
  const [showSpeechTest, setShowSpeechTest] = useState(false);
  const [useViseme, setUseViseme] = useState(true);
  const [visemeData, setVisemeData] = useState([]);
  const [isVisemePlaying, setIsVisemePlaying] = useState(false);
  const [conversationAudio, setConversationAudio] = useState([]); // Track audio recordings
  const [currentAudioUrl, setCurrentAudioUrl] = useState(''); // Store the current audio URL
  const [isFullscreen, setIsFullscreen] = useState(false); // State for fullscreen mode
  
  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const controlPanelRef = useRef(null); // Reference for the control panel element

  // Also need to add global audioCache reference
  const audioCache = useRef(null);

  // Function to toggle fullscreen mode
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      // Request fullscreen for the control panel
      if (controlPanelRef.current && controlPanelRef.current.requestFullscreen) {
        controlPanelRef.current.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable fullscreen mode: ${err.message}`);
        });
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };
  
  // Listen for fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

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
      
      // Add the nurse's input to conversation immediately for better UX
      const nurseEntry = {
        role: 'nurse',
        text,
        timestamp: new Date().toISOString()
      };
      setConversationHistory(prev => [...prev, nurseEntry]);
      onConversationUpdate(nurseEntry);
      
      // Clear previous audio to prevent it from playing - do this immediately
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        
        if (currentAudioUrl && !isCachedUrl(currentAudioUrl)) {
          try {
            URL.revokeObjectURL(currentAudioUrl);
          } catch (e) {
            console.warn('Error revoking URL:', e);
          }
        }
      }
      
      // Reset audio and indicate thinking state
      setCurrentAudioUrl('');
      setIsVisemePlaying(false);
      
      // Start pre-animation to indicate the patient is thinking
      setVisemeData([
        { visemeId: 0, audioOffset: 0 },
        { visemeId: 2, audioOffset: 300 },
        { visemeId: 0, audioOffset: 600 },
        { visemeId: 1, audioOffset: 900 },
        { visemeId: 0, audioOffset: 1200 }
      ]);
      setIsVisemePlaying(true);
      
      // Create a stream handler callback to process response in real-time
      let streamedText = '';
      const streamHandler = (content, fullText) => {
        streamedText = fullText;
        // Update patient response in real-time as words come in
        setPatientResponse(fullText);
      };
      
      // Flag to avoid starting TTS multiple times
      let ttsStarted = false;
      let firstSentencePromise = null;
      
      // Function to start TTS - simplified to just log the request
      const startFirstSentenceTTS = async (sentence) => {
        try {
          console.log("Pre-processing text for TTS:", sentence.length, "characters");
          // We're not going to use this anymore
        } catch (e) {
          console.warn("Error pre-processing text:", e);
        }
      };
      
      // Start warming up TTS with a parallel empty request to initialize connection
      const warmupPromise = textToSpeech("我明白，請稍等一下。").catch(e => console.warn("Warmup error:", e));
      
      // Start generating the response with streaming handler
      const responsePromise = generateResponse(text, conversationHistory, streamHandler);
      
      // Wait for the response to complete
      const response = await responsePromise;
      setPatientResponse(response);
      
      // Add patient's response to conversation
      const patientEntry = {
        role: 'patient',
        text: response,
        timestamp: new Date().toISOString()
      };
      
      // Update conversation history in the background
      setTimeout(() => {
        setConversationHistory(prev => [...prev, patientEntry]);
        onConversationUpdate(patientEntry);
      }, 0);
      
      if (useViseme) {
        try {
          // Process the complete response only, no more partial processing
          console.log("Processing complete response at once, length:", response.length);
          
          // Make sure viseme is not playing before starting a new one
          setIsVisemePlaying(false);
          
          // Add a small delay to ensure any previous animation is fully stopped
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const result = await textToSpeechWithViseme(response);
          
          // Ensure all viseme data is properly received
          if (result.visemeData && result.visemeData.length > 0) {
            console.log(`Received ${result.visemeData.length} viseme entries`);
            
            // Make sure the viseme data has appropriate end padding to ensure all animations complete
            const lastVisemeTime = result.visemeData[result.visemeData.length - 1].audioOffset;
            const paddedVisemeData = [...result.visemeData];
            
            // Add an explicit closing viseme with extra time offset
            paddedVisemeData.push({
              visemeId: 0,  // neutral mouth position
              audioOffset: lastVisemeTime + 500
            });
            
            setVisemeData(paddedVisemeData);
          } else {
            console.warn("Warning: No viseme data received or empty array");
            setVisemeData([
              { visemeId: 0, audioOffset: 0 }, 
              { visemeId: 1, audioOffset: 500 },
              { visemeId: 0, audioOffset: 1000 }
            ]);
          }
          
          setCurrentAudioUrl(result.audioUrl);
          setIsVisemePlaying(true);
          
          // Capture the response audio in the background
          captureAudioForSaving(result.audioUrl).catch(e => 
            console.error('Error capturing viseme audio for saving:', e)
          );
        } catch (audioErr) {
          console.error('Text-to-speech with viseme error:', audioErr);
          setError(`音頻生成錯誤: ${audioErr.message}`);
          setIsVisemePlaying(false);
          
          // Fall back to regular text-to-speech
          fallbackToRegularTTS(response);
        }
      } else {
        // Regular text-to-speech without viseme
        regularTextToSpeech(response);
      }
    } catch (err) {
      console.error('Response generation error:', err);
      setError(`處理響應時出錯: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Helper to check if a URL is in the audio cache
  const isCachedUrl = (url) => {
    let isCached = false;
    try {
      if (audioCache.current && typeof audioCache.current.get === 'function') {
        for (const cacheEntry of audioCache.current.entries()) {
          if (cacheEntry[1] && cacheEntry[1].url === url) {
            isCached = true;
            break;
          }
        }
      }
    } catch (e) {
      console.warn('Error checking audio cache:', e);
    }
    return isCached;
  };
  
  // Helper for regular TTS fallback
  const fallbackToRegularTTS = async (text) => {
    try {
      const audioUrl = await textToSpeech(text);
      
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      
      audioRef.current.src = audioUrl;
      audioRef.current.play().catch(e => console.error(e));
      
      // Capture audio in background
      captureAudioForSaving(audioUrl).catch(e => 
        console.error('Error capturing audio for saving:', e)
      );
    } catch (e) {
      console.error('Fallback speech synthesis failed:', e);
      setError(`備用語音合成失敗: ${e.message}`);
    }
  };
  
  // Helper for regular TTS
  const regularTextToSpeech = async (text) => {
    try {
      const audioUrl = await textToSpeech(text);
      
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      
      audioRef.current.src = audioUrl;
      
      // Add event listeners for audio playback
      audioRef.current.onerror = (e) => {
        console.error('Audio playback error:', e);
        setError('音頻播放失敗。請閱讀文本回應。');
      };
      
      audioRef.current.onended = () => {
        console.log('Audio playback finished successfully');
      };
      
      audioRef.current.play().catch(err => {
        console.error('Audio play error:', err);
        // Try playing again after a short delay
        setTimeout(() => {
          audioRef.current.play().catch(e => {
            console.error('Retry audio play error:', e);
            setError('音頻播放失敗。請閱讀文本回應。');
          });
        }, 500); // Reduced delay to 500ms for faster retry
      });
      
      // Capture audio in background
      captureAudioForSaving(audioUrl).catch(e => 
        console.error('Error capturing audio for saving:', e)
      );
    } catch (audioErr) {
      console.error('Text-to-speech error:', audioErr);
      setError(`音頻生成錯誤: ${audioErr.message}`);
    }
  };
  
  // Helper to capture audio for saving
  const captureAudioForSaving = async (audioUrl) => {
    try {
      // Only proceed if we have a valid URL
      if (!audioUrl) {
        console.warn('No audio URL provided to capture');
        return;
      }

      const response = await fetch(audioUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.statusText}`);
      }

      const audioBlob = await response.blob();
      
      // Store the audio with its metadata
      const audioEntry = {
        role: 'patient',
        blob: audioBlob,
        timestamp: new Date().toISOString()
      };

      // Update conversation audio state
      setConversationAudio(prev => [...prev, audioEntry]);
      
      // Notify parent component
      if (onAudioRecorded) {
        onAudioRecorded(audioEntry);
      }
    } catch (error) {
      console.error('Error in captureAudioForSaving:', error);
    }
  };

  // Start recording audio
  const startRecording = async () => {
    try {
      setIsRecording(true);
      setError('');
      
      // Reset previous transcription and response
      setTranscribedText('');
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Pre-process audio settings for better quality
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const sourceNode = audioContext.createMediaStreamSource(stream);
      
      // Add noise reduction and gain control if supported
      let processorNode = sourceNode;
      if (audioContext.createDynamicsCompressor) {
        const compressor = audioContext.createDynamicsCompressor();
        compressor.threshold.value = -50;
        compressor.knee.value = 40;
        compressor.ratio.value = 12;
        compressor.attack.value = 0;
        compressor.release.value = 0.25;
        sourceNode.connect(compressor);
        processorNode = compressor;
      }
      
      // Create a gain node to boost volume if needed
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 1.5; // Boost volume by 50%
      processorNode.connect(gainNode);
      
      // Connect final node to destination (not output to speakers)
      // gainNode.connect(audioContext.destination);
      
      // Use higher quality recording settings
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      });
      
      // Clear previous audio chunks
      audioChunksRef.current = [];
      
      // Event handler for data available
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      // Start recording
      recorder.start();
      mediaRecorderRef.current = recorder;
      
      console.log('Started recording');
    } catch (err) {
      console.error('Error starting recording:', err);
      setError(`麥克風訪問錯誤: ${err.message}`);
      setIsRecording(false);
    }
  };

  // Stop recording and process the audio
  const stopRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) {
      console.warn('No active recording to stop');
      return;
    }
    
    console.log('Stopping recording');
    
    try {
      // Set up onstop handler before stopping
      mediaRecorderRef.current.onstop = async () => {
        try {
          // Create audio blob from chunks
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          // Check if recording has content
          if (audioBlob.size < 100) {
            setError('錄音太短或沒有聲音被錄製。請再試一次。');
            setIsRecording(false);
            return;
          }
          
          // Start processing immediately
          setIsProcessing(true);
          
          // Store the user's audio with its metadata
          const userAudioEntry = {
            role: 'nurse',
            blob: audioBlob,
            timestamp: new Date().toISOString()
          };
          
          // Update audio recordings in the background to avoid blocking UI
          setTimeout(() => {
            setConversationAudio(prev => [...prev, userAudioEntry]);
            if (onAudioRecorded) {
              onAudioRecorded(userAudioEntry);
            }
          }, 0);
          
          // Start transcription immediately
          const transcriptionPromise = transcribeSpeech(audioBlob);
          
          // Show loading indicator during transcription
          setTranscribedText('轉錄中...'); // "Transcribing..."
          
          // Wait for transcription result
          const text = await transcriptionPromise;
          
          if (!text || text.trim() === '') {
            setError('無法識別您的語音，請再試一次。');
            setIsProcessing(false);
            setIsRecording(false);
            return;
          }
          
          // Update transcribed text
          setTranscribedText(text);
          
          // Process patient response with the transcribed text
          // This function has already been optimized with streaming responses
          await handlePatientResponse(text);
        } catch (err) {
          console.error('Error processing recording:', err);
          setError(`處理錄音時出錯: ${err.message}`);
          setIsProcessing(false);
        }
      };
      
      // Stop the recording - this will trigger the onstop handler
      mediaRecorderRef.current.stop();
      
      // Reset state
      setIsRecording(false);
    } catch (err) {
      console.error('Error stopping recording:', err);
      setError(`停止錄音時出錯: ${err.message}`);
      setIsRecording(false);
      setIsProcessing(false);
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

  // Method to get all recorded audio (can be called from parent)
  const getConversationAudio = () => {
    console.log('Getting all conversation audio, count:', conversationAudio.length);
    // Extract just the blobs from the audio entries
    return conversationAudio
      .filter(entry => entry && entry.blob instanceof Blob)
      .map(entry => entry.blob);
  };

  // Expose the getConversationAudio method to parent through useEffect
  useEffect(() => {
    if (isActive && typeof onAudioRecorded === 'function') {
      console.log('Registering audio getter with parent component');
      // Allow parent to get all audio by calling this function
      onAudioRecorded({
        getAll: getConversationAudio
      });
    }
    
    // Clean up audio blobs when component is unmounted or simulation ends
    return () => {
      // Revoke any object URLs to prevent memory leaks
      if (audioRef.current && audioRef.current.src.startsWith('blob:')) {
        URL.revokeObjectURL(audioRef.current.src);
      }
    };
  }, [isActive, onAudioRecorded]);

  const handleVisemePlayComplete = () => {
    console.log("Viseme animation playback complete");
    setIsVisemePlaying(false);
    
    // Ensure we clean up and go back to neutral state
    // Set a neutral mouth position
    setVisemeData([
      { visemeId: 0, audioOffset: 0 },
      { visemeId: 0, audioOffset: 500 }
    ]);
    
    // Clean up audio URL if needed
    if (currentAudioUrl && !isCachedUrl(currentAudioUrl)) {
      try {
        URL.revokeObjectURL(currentAudioUrl);
      } catch (e) {
        console.warn("Error revoking audio URL:", e);
      }
    }
  };

  // Clean up audio resources
  useEffect(() => {
    return () => {
      // Clean up audio URL objects when component unmounts
      if (audioRef.current && audioRef.current.src) {
        try {
          URL.revokeObjectURL(audioRef.current.src);
        } catch (e) {
          console.warn("Error revoking audio URL:", e);
        }
      }
    };
  }, []);

  // At the beginning of the component, after refs
  useEffect(() => {
    // Get a reference to the audio cache from the textToSpeechService
    try {
      import('../services/textToSpeechService').then(module => {
        if (module._getAudioCache) {
          audioCache.current = module._getAudioCache();
        }
      });
    } catch (e) {
      console.warn('Could not access audio cache:', e);
    }
  }, []);

  return (
    <div className={`patient-simulator ${isFullscreen ? 'fullscreen' : ''}`}>
      {/* Nurse Control Panel - Full width at the top */}
      <div className="nurse-control-panel" ref={controlPanelRef}>
        <div className="panel-header">
          <h2>護士控制台 Nurse Control Panel</h2>
          <button 
            className="fullscreen-btn" 
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
              </svg>
            )}
          </button>
        </div>
        
        <div className="control-panel-content">
          <div className="control-panel-row">
            {isActive && (
              <div className="patient-info-brief">
                <span className="patient-name">陳先生，58歲</span>
                <span className="scenario-name">大腸內窺鏡準備</span>
              </div>
            )}
            
            <div className="control-buttons">
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
          </div>
        </div>
        
        {/* Include the two-column layout inside the nurse control panel when in fullscreen mode */}
        {isFullscreen && isActive && (
          <div className="fullscreen-content">
            <div className="avatar-only-container">
              <div className="avatar-section fullscreen-avatar">
                {/* Show only the avatar in fullscreen mode */}
                <div className="viseme-animation-container fullscreen-face">
                  <VisemeFace 
                    visemeData={visemeData.length > 0 ? visemeData : []}
                    audioUrl={currentAudioUrl}
                    isPlaying={isVisemePlaying}
                    onPlayComplete={handleVisemePlayComplete}
                  />
                </div>
              </div>
              
              {/* Error message and debug tools */}
              {error && <div className="error-message fullscreen-error">{error}</div>}
              
              {error && error.includes('Failed to convert text to speech') && (
                <button 
                  className="debug-btn"
                  onClick={() => setShowSpeechTest(!showSpeechTest)}
                >
                  {showSpeechTest ? '隱藏語音測試' : '顯示語音測試工具'}
                </button>
              )}
              
              {showSpeechTest && <SpeechTest />}
            </div>
            
            {/* Floating conversation container in fullscreen mode */}
            <div className="fullscreen-conversation-container">
              {/* Recording controls and patient response */}
              <div className="control-buttons fullscreen-controls">
                {isProcessing ? (
                  <button className="stop-btn" disabled>處理中...</button>
                ) : isRecording ? (
                  <button 
                    className={`record-btn ${isRecording ? 'recording' : ''}`} 
                    onClick={stopRecording}
                    disabled={isProcessing}
                  >
                    停止錄音
                  </button>
                ) : (
                  <button 
                    className="record-btn" 
                    onClick={startRecording}
                    disabled={isProcessing}
                  >
                    開始錄音
                  </button>
                )}
              </div>

              {/* Show most recent message in floating container */}
              {conversationHistory.length > 0 && (
                <div className="latest-message">
                  {conversationHistory[conversationHistory.length - 1].role === 'nurse' ? (
                    <div className="nurse-message">
                      <strong>護士:</strong> {conversationHistory[conversationHistory.length - 1].text}
                    </div>
                  ) : (
                    <div className="patient-message">
                      <strong>陳先生:</strong> {conversationHistory[conversationHistory.length - 1].text}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Show the normal two-column layout only when not in fullscreen mode */}
      {isActive && !isFullscreen && (
        <div className="two-column-layout">
          {/* Left column - Clinical scenario information */}
          <div className="clinical-scenario-column">
            <div className="patient-info">
              <h4>臨床情景: 大腸內窺鏡準備</h4>
              <p>- 陳先生因最近大便習態改變、偶爾便血和輕微腹部不適被轉介做大腸內窺鏡。</p>
              <p>- 他目前尚未得到診斷，這顯著增加了他的焦慮。</p>
              <p>- 他對大腸內窺鏡程序、準備工作、潛在不適和可能的嚴重結果感到擔憂。</p>
              <p>- 他感到焦慮、困惑、尷尬和緊張。</p>
              <p className="role-instruction"><strong>注意：</strong> 您是護士，陳先生是病人。您需要向陳先生提問，他會回答您的問題。</p>
            </div>
          </div>
          
          {/* Right column - Avatar */}
          <div className="avatar-column">
            <div className="avatar-section">
              {/* Always show the avatar whether there's a response or not */}
              <div className="viseme-animation-container">
                <VisemeFace 
                  visemeData={visemeData.length > 0 ? visemeData : []}
                  audioUrl={currentAudioUrl}
                  isPlaying={isVisemePlaying}
                  onPlayComplete={handleVisemePlayComplete}
                />
              </div>
            </div>
            
            {/* Error message and debug tools */}
            {error && <div className="error-message">{error}</div>}
            
            {error && error.includes('Failed to convert text to speech') && (
              <button 
                className="debug-btn"
                onClick={() => setShowSpeechTest(!showSpeechTest)}
              >
                {showSpeechTest ? '隱藏語音測試' : '顯示語音測試工具'}
              </button>
            )}
            
            {showSpeechTest && <SpeechTest />}
          </div>
        </div>
      )}
      
      <audio ref={audioRef} style={{ display: 'none' }} />
    </div>
  );
};

export default PatientSimulator; 