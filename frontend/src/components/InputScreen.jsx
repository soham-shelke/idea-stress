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
        <h2>What's your startup idea?</h2>
        <p>Describe your idea in a few sentences. Our AI agents will extract the core assumptions, research them, and stress-test the concept.</p>
        
        <form onSubmit={handleSubmit}>
          <textarea 
            className="input-glass mb-4"
            placeholder="E.g., A mobile app that uses AI to write personalized bedtime stories for kids based on their day..."
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
