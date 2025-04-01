import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import PatientSimulator from './components/PatientSimulator';
import ConversationLog from './components/ConversationLog';
import ChatbotApp from './chatbot/ChatbotApp';
import './App.css';

function PatientSimulatorApp() {
  const [conversations, setConversations] = useState([]);
  const [isSimulationActive, setIsSimulationActive] = useState(false);
  const [audioRecordings, setAudioRecordings] = useState([]);
  const audioRecordingsRef = useRef(null);

  const addConversationEntry = (entry) => {
    setConversations(prev => [...prev, entry]);
  };

  const handleAudioRecorded = (audioData) => {
    console.log('Audio recorded handler called with:', audioData);
    
    // If it has a getAll function, this is the reference object to get all recordings
    if (audioData && typeof audioData.getAll === 'function') {
      console.log('Received audio getter function');
      audioRecordingsRef.current = audioData;
      return;
    }
    
    // Otherwise, it's a new audio recording to add to the list
    if (audioData && audioData.blob) {
      console.log('Adding new audio recording, role:', audioData.role);
      setAudioRecordings(prev => [...prev, audioData]);
    }
  };

  const startSimulation = () => {
    setIsSimulationActive(true);
    // Reset recordings when starting a new simulation
    setAudioRecordings([]);
    audioRecordingsRef.current = null;
  };

  const stopSimulation = () => {
    setIsSimulationActive(false);
  };

  // Get all audio recordings, either from the ref or the state
  const getAllAudioRecordings = () => {
    console.log('Getting all audio recordings');
    
    // First try to get from the ref if available
    if (audioRecordingsRef.current && typeof audioRecordingsRef.current.getAll === 'function') {
      console.log('Getting recordings from ref');
      return audioRecordingsRef.current;
    }
    
    // Otherwise return from state
    console.log('Getting recordings from state, count:', audioRecordings.length);
    return audioRecordings;
  };

  return (
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
}

function Navigation() {
  return (
    <nav className="app-navigation">
      <ul>
        <li><Link to="/">Patient Simulator</Link></li>
        <li><Link to="/chatbot">Text Chatbot</Link></li>
      </ul>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="app-wrapper">
        <Navigation />
        <Routes>
          <Route path="/" element={<PatientSimulatorApp />} />
          <Route path="/chatbot" element={<ChatbotApp />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App; 