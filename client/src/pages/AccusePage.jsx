import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { accuseCase, fetchCase } from '../api/cases';

export default function AccusePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [selected, setSelected] = useState('');
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchCase(id);
        setCaseData(data);
        if (data.status === 'completed') {
          navigate(`/case/${id}/result`, { replace: true });
        }
      } catch (error) {
        navigate(`/case/${id}`, { replace: true });
      }
    };

    load();
  }, [id, navigate]);

  const handleSubmit = async () => {
    if (!selected) return;
    setPending(true);
    setError('');
    try {
      await accuseCase(id, selected);
      navigate(`/case/${id}/result`);
    } catch (err) {
      setError(err.message || 'Unable to submit accusation.');
    } finally {
      setPending(false);
      setConfirmOpen(false);
    }
  };

  return (
    <main className="page-shell">
      <header className="topbar">
        <div className="brand">AI Mystery Room</div>
        <Link to={`/case/${id}`} className="header-link">Back to case</Link>
      </header>
      <section className="card accusation-card">
        <h1>Make your accusation</h1>

        {error ? <div className="error-banner" role="alert">{error}</div> : null}

        <div className="suspect-grid">
          {caseData?.suspects.map((suspect) => (
            <label key={suspect.id} className={`mini-card suspect-select ${selected === suspect.id ? 'selected' : ''}`}>
              <input type="radio" name="suspect" checked={selected === suspect.id} onChange={() => setSelected(suspect.id)} />
              <strong>{suspect.name}</strong>
              <span>{suspect.role}</span>
              <small>{suspect.description}</small>
            </label>
          ))}
        </div>

        <div className="accusation-summary">
          <h2>Discovered clues</h2>
          <ul>
            {caseData?.clues.filter((clue) => clue.discovered).map((clue) => (
              <li key={clue.id}><strong>{clue.label}:</strong> {clue.text}</li>
            )) || <li>No clues discovered yet.</li>}
          </ul>
        </div>

        <div className="cta-row flex-row">
          <button
            className="primary-btn"
            onClick={() => setConfirmOpen(true)}
            disabled={!selected || pending}
          >
            {pending ? 'Submitting…' : 'Submit Accusation'}
          </button>
          <Link className="secondary-btn" to={`/case/${id}`}>Back to investigation</Link>
        </div>
      </section>

      {confirmOpen ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h2>Final accusation</h2>
            <p>
              This is final. Are you certain you want to accuse <strong>{caseData?.suspects.find((suspect) => suspect.id === selected)?.name}</strong>?
            </p>
            <div className="modal-actions">
              <button className="secondary-btn" onClick={() => setConfirmOpen(false)} disabled={pending}>Cancel</button>
              <button className="primary-btn" onClick={handleSubmit} disabled={pending}>
                {pending ? 'Submitting…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}