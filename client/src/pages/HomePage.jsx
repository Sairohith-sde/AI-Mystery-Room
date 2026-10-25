import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <main className="page-shell">
      <header className="topbar">
        <div className="brand">AI Mystery Room</div>
      </header>
      <section className="hero-card">
        <p className="eyebrow">Detective fiction, generated fresh</p>
        <h1>Investigate a mystery that nobody has seen before.</h1>
        <p className="lede">
          Create a case, gather clues, and decide who is guilty before the final answer reveals itself.
        </p>
        <div className="cta-row">
          <Link to="/create" className="primary-btn">Start Investigation</Link>
        </div>

        <div className="info-grid">
          <article className="info-card">
            <span>1</span>
            <h2>Build a premise</h2>
            <p>Describe the setting, tension, and stakes in a single prompt.</p>
          </article>
          <article className="info-card">
            <span>2</span>
            <h2>Follow the clues</h2>
            <p>Examine leads, reveal hidden context, and decide who fits the story.</p>
          </article>
          <article className="info-card">
            <span>3</span>
            <h2>Make the call</h2>
            <p>Accuse the culprit and compare your verdict against the truth.</p>
          </article>
        </div>
      </section>
    </main>
  );
}