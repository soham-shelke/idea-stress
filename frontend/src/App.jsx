import { useState, useEffect } from 'react';
import './App.css';
import { startIdeaStress, checkStatus, resumeGate } from './api';

import InputScreen from './components/InputScreen';
import PollingScreen from './components/PollingScreen';
import GateOneScreen from './components/GateOneScreen';
import GateTwoScreen from './components/GateTwoScreen';
import OutputScreen from './components/OutputScreen';

const PHASES = {
  INPUT: 'INPUT',
  POLLING_GATE_1: 'POLLING_GATE_1',
  GATE_1: 'GATE_1',
  POLLING_GATE_2: 'POLLING_GATE_2',
  GATE_2: 'GATE_2',
  POLLING_OUTPUT: 'POLLING_OUTPUT',
  OUTPUT: 'OUTPUT',
  ERROR: 'ERROR'
};

function App() {
  const [phase, setPhase] = useState(PHASES.INPUT);
  const [executionArn, setExecutionArn] = useState(null);
  const [gateData, setGateData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const [pollIntervalId, setPollIntervalId] = useState(null);

  // General Poller
  const startPolling = (gateName, successPhase) => {
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes max
    
    const interval = setInterval(async () => {
      try {
        attempts++;
        if (attempts > maxAttempts) {
          clearInterval(interval);
          throw new Error('Polling timed out.');
        }

        const data = await checkStatus(executionArn, gateName);
        if (data.ready) {
          clearInterval(interval);
          setGateData(data.payload);
          setPhase(successPhase);
        }
      } catch (err) {
        clearInterval(interval);
        setErrorMessage(err.message);
        setPhase(PHASES.ERROR);
      }
    }, 2500);
    
    setPollIntervalId(interval);
  };

  // Cleanup on unmount or phase change
  useEffect(() => {
    return () => {
      if (pollIntervalId) clearInterval(pollIntervalId);
    };
  }, [pollIntervalId]);

  // Handle Initial Submit
  const handleInputSubmit = async (idea) => {
    try {
      const res = await startIdeaStress(idea);
      setExecutionArn(res.executionArn);
      setPhase(PHASES.POLLING_GATE_1);
    } catch (err) {
      setErrorMessage(err.message);
      setPhase(PHASES.ERROR);
    }
  };

  // Trigger poll for Gate 1 when ARN is set
  useEffect(() => {
    if (phase === PHASES.POLLING_GATE_1 && executionArn) {
      startPolling('gate1', PHASES.GATE_1);
    }
  }, [phase, executionArn]);

  // Handle Gate 1 Submit
  const handleGateOneSubmit = async (payload) => {
    try {
      await resumeGate(executionArn, 'gate1', payload);
      setPhase(PHASES.POLLING_GATE_2);
      startPolling('gate2', PHASES.GATE_2);
    } catch (err) {
      setErrorMessage(err.message);
      setPhase(PHASES.ERROR);
    }
  };

  // Handle Gate 2 Submit
  const handleGateTwoSubmit = async (payload) => {
    try {
      await resumeGate(executionArn, 'gate2', payload);
      setPhase(PHASES.POLLING_OUTPUT);
      startPolling('output', PHASES.OUTPUT);
    } catch (err) {
      setErrorMessage(err.message);
      setPhase(PHASES.ERROR);
    }
  };

  return (
    <div className="App">
      <div className="container">
        
        {phase === PHASES.INPUT && (
          <InputScreen onSubmit={handleInputSubmit} />
        )}
        
        {phase === PHASES.POLLING_GATE_1 && (
          <PollingScreen message="Excavating Assumptions & Researching Facts..." />
        )}

        {phase === PHASES.GATE_1 && (
          <GateOneScreen payload={gateData} onSubmit={handleGateOneSubmit} />
        )}

        {phase === PHASES.POLLING_GATE_2 && (
          <PollingScreen message="Devil's Advocate is finding fatal flaws..." />
        )}

        {phase === PHASES.GATE_2 && (
          <GateTwoScreen payload={gateData} onSubmit={handleGateTwoSubmit} />
        )}

        {phase === PHASES.POLLING_OUTPUT && (
          <PollingScreen message="Planner & Critic are arguing over your 90-day execution plan..." />
        )}

        {phase === PHASES.OUTPUT && (
          <OutputScreen payload={gateData} />
        )}

        {phase === PHASES.ERROR && (
          <div className="screen-container glass-card animate-in text-center" style={{ borderLeft: '4px solid var(--danger)' }}>
            <h2 style={{ color: 'var(--danger)' }}>Something went wrong</h2>
            <p>{errorMessage}</p>
            <button className="btn-primary mt-4" onClick={() => setPhase(PHASES.INPUT)}>Try Again</button>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
