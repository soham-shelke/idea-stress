import { useState } from 'react';

export default function InputScreen({ onSubmit }) {
  const [idea, setIdea] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!idea.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(idea);
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="screen-container animate-in">
      <div className="glass-card">
        <h2>What's your big idea?</h2>
        <p>Describe your concept, ambition, or project in a few sentences. Our AI agents will extract the core assumptions, research them, and stress-test your vision.</p>
        
        <form onSubmit={handleSubmit}>
          <textarea 
            className="input-glass mb-4"
            placeholder="E.g., A bold plan to transition from marketing to software engineering, or a class project to build a solar-powered drone..."
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            disabled={isSubmitting}
            autoFocus
          />
          <div className="text-center">
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={isSubmitting || !idea.trim()}
            >
              {isSubmitting ? 'Initializing Agents...' : 'Stress Test Idea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
