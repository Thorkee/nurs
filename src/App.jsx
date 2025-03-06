import React, { useState, useEffect, useRef } from 'react';
import PatientSimulator from './components/PatientSimulator';
import ConversationLog from './components/ConversationLog';
import './App.css';

function App() {
  const [conversations, setConversations] = useState([]);
  const [isSimulationActive, setIsSimulationActive] = useState(false);

  const addConversationEntry = (entry) => {
    setConversations(prev => [...prev, entry]);
  };

  const startSimulation = () => {
    setIsSimulationActive(true);
  };

  const stopSimulation = () => {
    setIsSimulationActive(false);
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
          />
        </div>

        <div className="conversation-panel">
          <ConversationLog conversations={conversations} />
        </div>
      </main>

      <footer>
        <p>© {new Date().getFullYear()} - School of Nursing, The Hong Kong Polytechnic University</p>
      </footer>
    </div>
  );
}

export default App; 