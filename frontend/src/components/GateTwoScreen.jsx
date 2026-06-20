import { useState } from 'react';

export default function GateTwoScreen({ payload, onSubmit }) {
  // payload: { adversary_output: { total_fatal_risks, analysis, pivot_options: [] } }
  const [selectedTrack, setSelectedTrack] = useState('');
  const [userTrackDesc, setUserTrackDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedTrack) return;
    setIsSubmitting(true);
    
    let user_track = selectedTrack;
    if (selectedTrack === 'custom') {
      user_track = userTrackDesc;
    }
    
    try {
      await onSubmit({ user_track });
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  const adv = payload.adversary_output;

  return (
    <div className="screen-container animate-in">
      <div className="header">
        <h1>Devil's Advocate Analysis</h1>
        <p className="subtitle">The Adversary agent has stress-tested your idea against the research data to find fatal flaws.</p>
      </div>

      <div className="glass-card mb-8" style={{ borderLeft: '4px solid var(--danger)' }}>
        <h3 style={{ color: 'var(--danger)', marginBottom: '16px' }}>
          Fatal Risks Identified
        </h3>
        {adv.top_risks && adv.top_risks.map((risk, i) => (
          <div key={i} style={{ marginBottom: '12px' }}>
            <strong>{risk.risk}</strong>
            <p style={{ fontSize: '0.9rem', margin: '4px 0' }}>{risk.argument}</p>
          </div>
        ))}
        
        <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>
          <strong>The Hardest Question:</strong>
          <p style={{ margin: '4px 0 0 0', color: '#fca5a5' }}>{adv.hardest_question}</p>
        </div>
      </div>

      <h3 className="mb-4">Select a Pivot Strategy to proceed:</h3>
      
      <div style={{ display: 'grid', gap: '16px', marginBottom: '32px' }}>
        <label 
          className="glass-card" 
          style={{ 
            cursor: 'pointer', 
            display: 'flex', 
            gap: '16px',
            border: selectedTrack === adv.steelman_counterplan ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)'
          }}
        >
          <input 
            type="radio" 
            name="track" 
            value={adv.steelman_counterplan} 
            checked={selectedTrack === adv.steelman_counterplan}
            onChange={() => setSelectedTrack(adv.steelman_counterplan)}
            style={{ marginTop: '4px' }}
          />
          <div>
            <strong style={{ display: 'block', marginBottom: '4px' }}>Recommended Pivot (Steelman Plan)</strong>
            <p style={{ margin: 0 }}>{adv.steelman_counterplan}</p>
          </div>
        </label>

        <label 
          className="glass-card" 
          style={{ 
            cursor: 'pointer', 
            display: 'flex', 
            gap: '16px',
            border: selectedTrack === 'custom' ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)'
          }}
        >
          <input 
            type="radio" 
            name="track" 
            value="custom" 
            checked={selectedTrack === 'custom'}
            onChange={() => setSelectedTrack('custom')}
            style={{ marginTop: '4px' }}
          />
          <div style={{ width: '100%' }}>
            <strong style={{ display: 'block', marginBottom: '8px' }}>Or, forge your own path:</strong>
            {selectedTrack === 'custom' ? (
              <textarea 
                className="input-glass"
                placeholder="Describe how you will overcome the fatal risks..."
                value={userTrackDesc}
                onChange={(e) => setUserTrackDesc(e.target.value)}
                style={{ minHeight: '80px', padding: '12px' }}
                autoFocus
              />
            ) : (
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>Write a custom track...</p>
            )}
          </div>
        </label>
      </div>

      <div className="text-center">
        <button 
          className="btn-primary" 
          onClick={handleSubmit} 
          disabled={isSubmitting || !selectedTrack || (selectedTrack === 'custom' && !userTrackDesc.trim())}
        >
          {isSubmitting ? 'Generating Final Plan...' : 'Confirm Track & Generate Plan'}
        </button>
      </div>
    </div>
  );
}
