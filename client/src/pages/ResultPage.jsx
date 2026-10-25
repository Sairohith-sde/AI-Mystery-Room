import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fetchCase, fetchResult } from '../api/cases';

export default function ResultPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [caseDoc, verdict] = await Promise.all([fetchCase(id), fetchResult(id)]);
        setCaseData(caseDoc);
        setResult(verdict);
      } catch (error) {
        navigate(`/case/${id}`, { replace: true });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, navigate]);

  if (loading) return <main className="page-shell"><div className="card loading-state">Loading result…</div></main>;
  if (!result || !caseData) return <main className="page-shell"><div className="card">No result available.</div></main>;

  const accusedSuspect = caseData.suspects.find((suspect) => suspect.id === result.accusedSuspectId);
  const culprit = caseData.suspects.find((suspect) => suspect.id === result.culprit.id) || result.culprit;

  return (
    <main className="page-shell">
      <header className="topbar">
        <div className="brand">AI Mystery Room</div>
        <Link to="/" className="header-link">New case</Link>
      </header>
      <section className="card result-card">
        <div className={`result-banner ${result.correct ? 'success' : 'danger'}`}>
          <p className="eyebrow">Verdict</p>
          <h1>{result.correct ? 'Case Solved' : 'Wrong Suspect'}</h1>
        </div>

        <div className="result-grid">
          <div>
            <p><strong>Accused suspect:</strong> {accusedSuspect?.name || result.accusedSuspectId}</p>
            <p><strong>Actual culprit:</strong> <span className="culprit-name">{culprit.name}</span></p>
            <p><strong>Difficulty:</strong> {result.difficulty}</p>
          </div>
          <div className="score-box">
            <strong>Score {result.score.total}</strong>
            <span>Base: {result.score.base}</span>
            <span>Clues: {result.score.clueBonus}</span>
            <span>Hints: {result.score.hintPenalty}</span>
            <span>Total: {result.score.total}</span>
          </div>
        </div>

        <div className="story-block">
          <h2>Explanation</h2>
          <p>{result.explanation}</p>
        </div>

        <div className="key-clues-panel">
          <h2>Key clues</h2>
          <ul className="key-clue-list">
            {result.keyClues.map((clue) => (
              <li key={clue.id}><strong>{clue.label}:</strong> {clue.text}</li>
            ))}
          </ul>
        </div>

        <div className="cta-row flex-row">
          <Link to="/create" className="primary-btn">New Mystery</Link>
          <Link to={`/case/${id}`} className="secondary-btn">Review case</Link>
        </div>
      </section>
    </main>
  );
}