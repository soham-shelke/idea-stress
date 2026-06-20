export default function OutputScreen({ payload }) {
  // payload: { final_plan: {...}, critic_scores: {...} }
  const plan = payload.final_plan;
  const critic = payload.critic_scores;

  return (
    <div className="screen-container animate-in">
      <div className="header">
        <h1>{plan.plan_title || "Final Output"}</h1>
        <p className="subtitle">
          {plan.tension_warning ? (
            <span style={{ color: 'var(--warning)', fontWeight: 'bold' }}>{plan.tension_warning}</span>
          ) : (
            "Your 30/60/90-Day Execution Plan and final Critic scores."
          )}
        </p>
      </div>

      {/* Critic Score Dashboard */}
      <div className="glass-card mb-8" style={{ display: 'flex', gap: '20px', justifyContent: 'space-around', textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--accent-primary)' }}>
            {(critic?.overall || 0) * 10}/100
          </div>
          <p style={{ margin: 0, textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px' }}>Overall Score</p>
        </div>
        <div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: (critic?.scores?.feasibility?.score || 0) < 5 ? 'var(--danger)' : 'var(--success)' }}>
            {(critic?.scores?.feasibility?.score || 0) * 10}
          </div>
          <p style={{ margin: 0, textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px' }}>Feasibility</p>
        </div>
        <div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: (critic?.scores?.risk_coverage?.score || 0) < 5 ? 'var(--warning)' : 'var(--success)' }}>
            {(critic?.scores?.risk_coverage?.score || 0) * 10}
          </div>
          <p style={{ margin: 0, textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px' }}>Risk Coverage</p>
        </div>
      </div>

      {critic.revision_needed && (
        <div className="glass-card mb-8" style={{ borderLeft: '4px solid var(--warning)' }}>
          <h3 style={{ color: 'var(--warning)' }}>Critic's Warning</h3>
          <p>{critic.final_verdict}</p>
        </div>
      )}

      {/* 30/60/90 Day Plan */}
      <h2>Execution Plan</h2>
      <div style={{ display: 'grid', gap: '24px', marginBottom: '40px' }}>
        
        {/* 30 Days */}
        <div className="glass-card">
          <h3 style={{ color: '#60a5fa' }}>First 30 Days: Validation</h3>
          <p style={{ color: 'var(--text-primary)', fontStyle: 'italic', marginBottom: '12px' }}>
            <strong>First step tomorrow:</strong> {plan.plan?.day_30?.first_real_step}
          </p>
          <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)' }}>
            {(plan.plan?.day_30?.milestones || []).map((item, i) => (
              <li key={i} style={{ marginBottom: '8px' }}>{item}</li>
            ))}
          </ul>
        </div>

        {/* 60 Days */}
        <div className="glass-card">
          <h3 style={{ color: '#a78bfa' }}>60 Days: MVP & Initial Traction</h3>
          <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)' }}>
            {(plan.plan?.day_60?.milestones || []).map((item, i) => (
              <li key={i} style={{ marginBottom: '8px' }}>{item}</li>
            ))}
          </ul>
        </div>

        {/* 90 Days */}
        <div className="glass-card">
          <h3 style={{ color: '#f472b6' }}>90 Days: Scale & Market Entry</h3>
          <p style={{ color: 'var(--text-primary)', fontStyle: 'italic', marginBottom: '12px' }}>
            <strong>Success Metric:</strong> {plan.plan?.day_90?.success_metric}
          </p>
          <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)' }}>
            {(plan.plan?.day_90?.milestones || []).map((item, i) => (
              <li key={i} style={{ marginBottom: '8px' }}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="text-center">
        <button className="btn-primary" onClick={() => window.location.reload()}>
          Stress Test Another Idea
        </button>
      </div>
    </div>
  );
}
