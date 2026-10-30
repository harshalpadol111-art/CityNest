import { Link } from "react-router-dom";

function PlaceholderPage({
  eyebrow,
  title,
  description,
  showHomeButton = false,
}) {
  return (
    <section className="placeholder-page">
      <div className="placeholder-card">
        <span className="section-eyebrow">
          {eyebrow}
        </span>

        <div className="placeholder-icon">✦</div>

        <h1>{title}</h1>

        <p>{description}</p>

        <div className="placeholder-actions">
          {showHomeButton ? (
            <Link to="/" className="primary-button">
              Back to home
              <span>→</span>
            </Link>
          ) : (
            <Link to="/" className="secondary-button">
              Back to home
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

export default PlaceholderPage;