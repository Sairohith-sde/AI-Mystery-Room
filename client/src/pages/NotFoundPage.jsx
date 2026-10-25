import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <main className="page-shell">
      <div className="card error-state">
        <h1>404</h1>
        <p>That page doesn't exist.</p>
        <Link to="/" className="primary-btn">Return home</Link>
      </div>
    </main>
  );
}