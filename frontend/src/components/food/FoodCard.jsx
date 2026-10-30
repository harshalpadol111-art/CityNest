import { Link } from "react-router-dom";

const FALLBACK =
  "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80";

function FoodCard({ food, isFavorite = false, onFavorite }) {
  const price = food.monthly_price || food.daily_price;
  const priceLabel = food.monthly_price ? "/ month" : "/ day";

  return (
    <article className="cn-listing-card">
      <div className="cn-card-media">
        <img src={FALLBACK} alt={food.name} />
        <span className="cn-card-badge">Food</span>
        {onFavorite && (
          <button
            type="button"
            className={`cn-favorite-button ${isFavorite ? "active" : ""}`}
            onClick={() => onFavorite(food.id)}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            {isFavorite ? "♥" : "♡"}
          </button>
        )}
      </div>

      <div className="cn-card-body">
        <div className="cn-card-location">Local mess · Chhatrapati Sambhajinagar</div>
        <h3>{food.name}</h3>
        <p className="cn-card-description">
          {food.description || "A local meal option for students and working professionals."}
        </p>

        <div className="cn-card-rating-row">
          <span className="cn-rating">★ {food.average_rating ? food.average_rating.toFixed(1) : "New"}</span>
          <span>{food.review_count || 0} reviews</span>
          {food.food_type && <span>{food.food_type}</span>}
        </div>

        <div className="cn-card-footer">
          <div>
            <strong>{price ? `₹${Number(price).toLocaleString("en-IN")}` : "Contact"}</strong>
            {price && <span>{priceLabel}</span>}
          </div>
          <Link className="cn-card-link" to={`/food/${food.id}`}>View</Link>
        </div>
      </div>
    </article>
  );
}

export default FoodCard;
