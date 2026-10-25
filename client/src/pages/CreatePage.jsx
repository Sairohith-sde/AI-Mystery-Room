import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createCase } from '../api/cases';

const difficultyMeta = {
  easy: { suspects: 3, clues: 5, hints: 2, maxPoints: 125 },
  medium: { suspects: 4, clues: 7, hints: 3, maxPoints: 185 },
  hard: { suspects: 5, clues: 9, hints: 3, maxPoints: 245 },
};

const examplePremises = [
  'A celebrated theatre critic is found dead after a backstage argument over a stolen script.',
  'A town mayor disappears on the night a charity gala is raided by masked intruders.',
  'A quiet archivist is murdered in a locked library where only three people had access.',
  'A luxury yacht owner dies after a champagne toast, despite a ring of suspicious witnesses.',
];

const generationSteps = ['Gathering suspects…', 'Planting clues…', 'Checking the alibis…'];

export default function CreatePage() {
  const navigate = useNavigate();
  const [premise, setPremise] = useState('');
  const [difficulty, setDifficulty] = useState('easy');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [stepIndex, setStepIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const requestControllerRef = useRef(null);

  useEffect(() => {
    if (!isLoading) return undefined;

    const timer = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    const stepTimer = window.setInterval(() => {
      setStepIndex((current) => (current + 1) % generationSteps.length);
    }, 1800);

    return () => {
      window.clearInterval(timer);
      window.clearInterval(stepTimer);
    };
  }, [isLoading]);

  const isValid = premise.trim().length >= 10 && premise.trim().length <= 300 && !!difficulty;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isValid) return;

    requestControllerRef.current = new AbortController();
    setIsLoading(true);
    setError('');
    setStepIndex(0);
    setElapsedSeconds(0);

    try {
      const caseData = await createCase({ premise: premise.trim(), difficulty }, { signal: requestControllerRef.current.signal });
      navigate(`/case/${caseData.id}`);
    } catch (err) {
      if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') {
        setError('Mystery generation was cancelled.');
        return;
      }
      setError(err.message || 'Mystery generation failed.');
    } finally {
      setIsLoading(false);
      requestControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (requestControllerRef.current) {
      requestControllerRef.current.abort();
    }
    setIsLoading(false);
    setError('Processing cancelled. You can try again with a revised premise.');
  };

  if (isLoading) {
    return (
      <main className="page-shell loading-shell">
        <div className="loading-overlay" role="status" aria-live="polite">
          <div className="loading-panel">
            <div className="spinner" aria-hidden="true" />
            <p className="eyebrow">Generating case</p>
            <h2>{generationSteps[stepIndex]}</h2>
            <p className="loading-timer">{elapsedSeconds}s elapsed</p>
            <button type="button" className="secondary-btn" onClick={handleCancel}>Cancel</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <header className="topbar">
        <div className="brand">AI Mystery Room</div>
        <Link to="/" className="header-link">Home</Link>
      </header>
      <section className="card form-card">
        <h1>Create a mystery</h1>
        <form onSubmit={handleSubmit}>
          <label htmlFor="premise">Premise</label>
          <textarea
            id="premise"
            value={premise}
            onChange={(event) => setPremise(event.target.value)}
            maxLength={300}
            rows={5}
            placeholder="Describe the setting, motive, and stakes..."
          />
          <div className="meta-row">
            <span>{premise.length}/300</span>
          </div>

          <div className="example-row">
            {examplePremises.map((example) => (
              <button key={example} type="button" className="example-chip" onClick={() => setPremise(example)}>
                {example}
              </button>
            ))}
          </div>

          <div className="difficulty-grid">
            {Object.entries(difficultyMeta).map(([name, meta]) => (
              <button
                key={name}
                type="button"
                className={`difficulty-card ${difficulty === name ? 'selected' : ''}`}
                onClick={() => setDifficulty(name)}
              >
                <strong>{name}</strong>
                <span>{meta.suspects} suspects</span>
                <span>{meta.clues} clues</span>
                <span>{meta.hints} hints</span>
                <span>Max {meta.maxPoints} pts</span>
              </button>
            ))}
          </div>

          {error ? <div className="error-banner" role="alert">{error}</div> : null}

          <button className="primary-btn" type="submit" disabled={!isValid || isLoading}>
            Generate Mystery
          </button>
        </form>
      </section>
    </main>
  );
}