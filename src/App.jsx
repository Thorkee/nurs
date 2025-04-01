import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import PatientSimulator from './components/PatientSimulator';
import ConversationLog from './components/ConversationLog';
import ChatBotPage from './pages/ChatBotPage';
import './App.css';

function App() {
  const [conversations, setConversations] = useState([]);
  const [isSimulationActive, setIsSimulationActive] = useState(false);
  const [audioRecordings, setAudioRecordings] = useState([]);
  const audioRecordingsRef = useRef(null);

  const addConversationEntry = (entry) => {
    setConversations(prev => [...prev, entry]);
  };

  const handleAudioRecorded = (audioData) => {
    console.log('Audio recorded handler called with:', audioData);
    
    if (audioData && typeof audioData.getAll === 'function') {
      console.log('Received audio getter function');
      audioRecordingsRef.current = audioData;
      return;
    }
    
    if (audioData && audioData.blob) {
      console.log('Adding new audio recording, role:', audioData.role);
      setAudioRecordings(prev => [...prev, audioData]);
    }
  };

  const startSimulation = () => {
    setIsSimulationActive(true);
    setAudioRecordings([]);
    audioRecordingsRef.current = null;
  };

  const stopSimulation = () => {
    setIsSimulationActive(false);
  };

  const getAllAudioRecordings = () => {
    console.log('Getting all audio recordings');
    
    if (audioRecordingsRef.current && typeof audioRecordingsRef.current.getAll === 'function') {
      console.log('Getting recordings from ref');
      return audioRecordingsRef.current;
    }
    
    console.log('Getting recordings from state, count:', audioRecordings.length);
    return audioRecordings;
  };

  const SimulationPage = () => (
    <div className="app-container">
      <header>
        <h1>大腸內窺鏡病人模擬系統</h1>
        <h2>Colonoscopy Patient Simulation for Nursing Students</h2>
      </header>

      <main>
        <div className="simulation-panel">
          <PatientSimulator 
            isActive={isSimulationActive}
            onStart={startSimulation}
            onStop={stopSimulation}
            onConversationUpdate={addConversationEntry}
            onAudioRecorded={handleAudioRecorded}
          />
        </div>

        <div className="conversation-panel">
          <ConversationLog 
            conversations={conversations} 
            audioRecordings={getAllAudioRecordings()}
          />
        </div>
      </main>

      <footer>
        <p>© {new Date().getFullYear()} - School of Nursing, The Hong Kong Polytechnic University</p>
      </footer>
    </div>
  );

  return (
    <Router>
      <div className="app">
        <nav className="main-nav">
          <Link to="/" className="nav-link">Patient Simulation</Link>
          <Link to="/chatbot" className="nav-link">AI Chat Assistant</Link>
        </nav>

        <Routes>
          <Route path="/" element={<SimulationPage />} />
          <Route path="/chatbot" element={<ChatBotPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App; 