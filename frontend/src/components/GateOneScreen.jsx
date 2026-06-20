import { useState } from 'react';

export default function GateOneScreen({ payload, onSubmit }) {
  // payload should have { idea_summary, domain, assumptions: [...] }
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // Submit validated_assumptions back to the step function
    // For this hackathon, we simply pass them all through as accepted
    const validated = payload.validated_assumptions;
    try {
      await onSubmit({ 
        idea_summary: payload.idea_summary,
        session_id: payload.session_id,
        validated_assumptions: validated 
      });
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="screen-container animate-in">
      <div className="header">
        <h1>Research Results</h1>
        <p className="subtitle">The Researcher has gathered statistical evidence for your core assumptions.</p>
      </div>
      
      <div className="glass-card mb-8">
        <h3>{payload.idea_summary}</h3>
        {payload.domain && <span className="badge conservative">{payload.domain}</span>}
      </div>

      <div style={{ display: 'grid', gap: '20px', marginBottom: '2rem' }}>
        {payload.validated_assumptions && payload.validated_assumptions.map((a, i) => {
          if (a.statusCode) {
            return (
              <div key={i} className="glass-card" style={{ borderLeft: '4px solid var(--danger)' }}>
                <strong style={{ color: 'var(--danger)' }}>Error processing assumption:</strong>
                <p>{a.body}</p>
              </div>
            );
          }

          return (
            <div key={i} className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <span className={`badge ${a.verdict === 'optimistic' ? 'aggressive' : a.verdict === 'realistic' ? 'moderate' : 'conservative'}`}>
                  {(a.risk_level || 'UNKNOWN').toUpperCase()} RISK
                </span>
                <span className="badge" style={{ background: 'rgba(255,255,255,0.1)' }}>Score: {Math.round((a.confidence_score || 0) * 100)}/100</span>
              </div>
              <h4 style={{ color: 'white', marginBottom: '12px' }}>{a.assumption || 'Missing Assumption'}</h4>
              
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid var(--accent-primary)' }}>
                <strong style={{ display: 'block', marginBottom: '4px', color: 'var(--accent-primary)' }}>Research Evidence:</strong>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>{a.evidence_summary || 'No evidence gathered.'}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center">
        <button className="btn-primary" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Approve Assumptions & Continue'}
        </button>
      </div>
    </div>
  );
}
