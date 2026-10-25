import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fetchCase, discoverClue, requestHint } from '../api/cases';

export default function InvestigationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [discoveringId, setDiscoveringId] = useState(null);
  const [hintPending, setHintPending] = useState(false);

  const loadCase = async () => {
    try {
      const data = await fetchCase(id);
      setCaseData(data);
      setError('');
      if (data.status === 'completed') {
        navigate(`/case/${id}/result`, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Unable to load the case.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCase();
  }, [id]);

  const handleDiscover = async (clueId) => {
    setDiscoveringId(clueId);
    try {
      const result = await discoverClue(id, clueId);
      setCaseData((current) => ({
        ...current,
        clues: current.clues.map((clue) => clue.id === clueId ? { ...clue, discovered: true, text: result.clue.text } : clue),
        progress: { ...current.progress, cluesDiscovered: result.progress.cluesDiscovered },
      }));
      setError('');
    } catch (err) {
      setError(err.message || 'Unable to discover clue.');
    } finally {
      setDiscoveringId(null);
    }
  };

  const handleHint = async () => {
    if (!caseData || caseData.hints.used >= caseData.hints.total) return;

    setHintPending(true);
    try {
      const result = await requestHint(id);
      setCaseData((current) => ({
        ...current,
        hints: {
          ...current.hints,
          used: result.hints.used,
          revealed: [...current.hints.revealed, { level: result.hint.level, text: result.hint.text }],
        },
        progress: { ...current.progress, hintsUsed: result.hints.used },
      }));
      setError('');
    } catch (err) {
      setError(err.message || 'Unable to request hint.');
    } finally {
      setHintPending(false);
    }
  };

  if (loading) return <main className="page-shell"><div className="card loading-state">Loading case…</div></main>;
  if (error || !caseData) return <main className="page-shell"><div className="card error-state">{error || 'Case not found.'}</div></main>;

  const clueProgress = `${caseData.progress.cluesDiscovered}/${caseData.progress.cluesTotal}`;

  return (
    <main className="page-shell">
      <header className="topbar">
        <div className="brand">AI Mystery Room</div>
        <Link to="/" className="header-link">Home</Link>
      </header>

      <section className="card case-card">
        <div className="header-row">
          <div>
            <p className="eyebrow">Case file</p>
            <h1>{caseData.title}</h1>
          </div>
          <span className="badge difficulty-badge">{caseData.difficulty}</span>
        </div>

        <div className="progress-strip" aria-live="polite">
          <span>Clues {clueProgress}</span>
          <span>Hints {caseData.hints.used}/{caseData.hints.total}</span>
          <span>Current score preview: {Math.max(0, 100 - caseData.hints.used * 10)}</span>
        </div>

        <div className="story-block">
          <h2>Story</h2>
          <p className="story-copy">{caseData.story}</p>
        </div>

        {error ? <div className="error-banner" role="alert">{error}</div> : null}

        <div className="two-col">
          <section>
            <h2>Suspects</h2>
            <div className="suspect-grid">
              {caseData.suspects.map((suspect) => (
                <article key={suspect.id} className="mini-card suspect-card">
                  <h3>{suspect.name}</h3>
                  <p className="muted-label">{suspect.role}</p>
                  <p>{suspect.description}</p>
                  <small>Alibi: {suspect.alibi}</small>
                </article>
              ))}
            </div>
          </section>

          <aside className="side-panel">
            <h2>Hints</h2>
            <ul className="hint-list">
              {caseData.hints.revealed.length === 0 ? <li className="hint-empty">No hints revealed yet.</li> : null}
              {caseData.hints.revealed.map((hint) => (
                <li key={hint.level} className="hint-item">{hint.text}</li>
              ))}
            </ul>
            <button className="secondary-btn" onClick={handleHint} disabled={hintPending || caseData.hints.used >= caseData.hints.total}>
              {hintPending ? 'Requesting…' : `Request Hint${caseData.hints.used < caseData.hints.total ? ' (-10 points)' : ' (exhausted)'}`}
            </button>
            <Link className="primary-btn accuse-link" to={`/case/${id}/accuse`}>Make Accusation</Link>
          </aside>
        </div>

        <section className="clue-section">
          <h2>Clues</h2>
          <div className="clue-grid">
            {caseData.clues.map((clue) => (
              <article key={clue.id} className={`mini-card clue-card ${clue.discovered ? 'revealed' : ''}`}>
                <h3>{clue.label}</h3>
                {!clue.discovered ? (
                  <button className="secondary-btn" onClick={() => handleDiscover(clue.id)} disabled={discoveringId === clue.id}>
                    {discoveringId === clue.id ? 'Examining…' : 'Examine'}
                  </button>
                ) : (
                  <p>{clue.text}</p>
                )}
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}