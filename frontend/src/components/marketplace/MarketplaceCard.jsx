import { Link } from "react-router-dom";

const FALLBACK =
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80";

function MarketplaceCard({ item, isFavorite = false, onFavorite }) {
  return (
    <article className="cn-listing-card">
      <div className="cn-card-media marketplace-media">
        <img src={item.image_url || FALLBACK} alt={item.title} />
        <span className="cn-card-badge">Secondhand</span>
        {onFavorite && (
          <button
            type="button"
            className={`cn-favorite-button ${isFavorite ? "active" : ""}`}
            onClick={() => onFavorite(item.id)}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            {isFavorite ? "♥" : "♡"}
          </button>
        )}
      </div>

      <div className="cn-card-body">
        <div className="cn-card-location">Local marketplace · Chhatrapati Sambhajinagar</div>
        <h3>{item.title}</h3>
        <p className="cn-card-description">
          {item.description || "A useful secondhand item listed by someone in the CityNest community."}
        </p>
        <div className="cn-card-rating-row">
          <span>{item.category}</span>
          <span>{item.condition}</span>
        </div>
        <div className="cn-card-footer">
          <div>
            <strong>₹{Number(item.price).toLocaleString("en-IN")}</strong>
            <span>fixed price</span>
          </div>
          <Link className="cn-card-link" to={`/marketplace/${item.id}`}>View</Link>
        </div>
      </div>
    </article>
  );
}

export default MarketplaceCard;
