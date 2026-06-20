export default function PollingScreen({ message }) {
  return (
    <div className="screen-container animate-in">
      <div className="glass-card polling-container pulse">
        <div className="spinner"></div>
        <h2>{message || 'AI Agents are working...'}</h2>
        <p>This process takes time as our AI performs live vector searches, browses the web, and debates with itself.</p>
      </div>
    </div>
  );
}
