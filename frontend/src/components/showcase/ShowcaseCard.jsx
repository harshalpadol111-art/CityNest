import { MapPin, Star, Tag, Utensils } from "lucide-react";
import { Link } from "react-router-dom";
import { getImageUrl } from "../../lib/api";
import { getFoodImage } from "../../lib/listingImages";

const FOOD_FALLBACK =
  "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=85";
const MARKET_FALLBACK =
  "https://images.unsplash.com/photo-1517336714739-489689fd1ca8?auto=format&fit=crop&w=1200&q=85";

function money(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function ShowcaseCard({ item, type }) {
  const isFood = type === "food";
  const isMarket = type === "marketplace";
  const title = isFood ? item.name : item.title;
  const image = isFood
    ? item.image || getFoodImage(item.id) || FOOD_FALLBACK
    : isMarket
      ? getImageUrl(item.image_url, MARKET_FALLBACK)
      : getImageUrl(item.images?.[0], FOOD_FALLBACK);
  const path = `/${isFood ? "food" : isMarket ? "marketplace" : "stay"}/${item.id}`;
  const location = item.locality_name || "Chhatrapati Sambhajinagar";

  return (
    <article className="showcase-card">
      <Link to={path} className="showcase-card-media-link" aria-label={`Open ${title}`}>
        <div className="showcase-card-media">
          <img
            src={image}
            alt={title}
            loading="lazy"
            onError={(event) => {
              const fallback = isMarket ? MARKET_FALLBACK : FOOD_FALLBACK;
              if (event.currentTarget.src !== fallback) event.currentTarget.src = fallback;
            }}
          />
          <div className="showcase-card-top">
            <span className="showcase-chip">
              {isFood ? item.food_type || "Mess" : isMarket ? item.condition : item.property_type}
            </span>
            {item.owner_verified && <span className="showcase-verified">✓ Verified owner</span>}
          </div>
        </div>
      </Link>

      <div className="showcase-card-body">
        <div className="showcase-location"><MapPin size={14} />{location}</div>
        <h3><Link to={path}>{title}</Link></h3>
        <p className="showcase-card-description">{item.description || "Listing details available on CityNest."}</p>

        <div className="showcase-card-meta">
          {isFood ? (
            <>
              <span><Utensils size={14} />{item.food_type || "Local food"}</span>
              <span><Star size={14} fill="currentColor" />{item.average_rating ? Number(item.average_rating).toFixed(1) : "New"}</span>
            </>
          ) : isMarket ? (
            <>
              <span><Tag size={14} />{item.category}</span>
              <span>{item.condition}</span>
            </>
          ) : (
            <>
              <span>{item.property_type}</span>
              <span>{item.furnishing}</span>
              <span><Star size={14} fill="currentColor" />{item.average_rating ? Number(item.average_rating).toFixed(1) : "New"}</span>
            </>
          )}
        </div>

        <div className="showcase-card-footer">
          <div className="showcase-price">
            <strong>{money(isFood ? item.monthly_price || item.daily_price : isMarket ? item.price : item.monthly_rent)}</strong>
            <span>{isFood ? (item.monthly_price ? "/ month" : "/ day") : isMarket ? "asking" : "/ month"}</span>
          </div>
          <Link className="showcase-view-button secondary" to={path}>View listing →</Link>
        </div>
      </div>
    </article>
  );
}

export default ShowcaseCard;
