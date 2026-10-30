import { Link } from "react-router-dom";
import { getImageUrl } from "../../lib/api";

function PropertyCard({ property }) {
  const fallbackImage =
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80";

  const image = getImageUrl(property.images?.[0], fallbackImage);

  const rating =
    typeof property.average_rating === "number"
      ? property.average_rating
      : 0;

  return (
    <article className="property-card">
      <Link
        to={`/stay/${property.id}`}
        className="property-card-image-link"
      >
        <div className="property-card-image">
          <img
            src={image}
            alt={property.title}
            loading="lazy"
            onError={(event) => {
              if (event.currentTarget.src !== fallbackImage) {
                event.currentTarget.src = fallbackImage;
              }
            }}
          />

          <span className="property-card-type">
            {property.property_type}
          </span>

          {property.furnishing && (
            <span className="property-card-furnished">
              {property.furnishing}
            </span>
          )}
        </div>
      </Link>

      <div className="property-card-body">
        <div className="property-card-heading">
          <div>
            <h3>
              <Link to={`/stay/${property.id}`}>
                {property.title}
              </Link>
            </h3>

            <p className="property-card-address">
              {property.address}
            </p>
          </div>
        </div>

        <div className="property-card-rating">
          <span className="rating-star">★</span>

          <strong>
            {rating > 0 ? rating.toFixed(1) : "New"}
          </strong>

          <span>
            {property.review_count > 0
              ? `${property.review_count} review${
                  property.review_count === 1 ? "" : "s"
                }`
              : "No reviews yet"}
          </span>
        </div>

        <div className="property-card-meta">
          {property.available_for && (
            <span>{property.available_for}</span>
          )}

          {property.furnishing && (
            <span>{property.furnishing}</span>
          )}
        </div>

        <div className="property-card-footer">
          <div className="property-price">
            <strong>
              ₹{Number(property.monthly_rent).toLocaleString("en-IN")}
            </strong>

            <span>/ month</span>
          </div>

          <Link
            to={`/stay/${property.id}`}
            className="property-view-link"
          >
            View details →
          </Link>
        </div>
      </div>
    </article>
  );
}

export default PropertyCard;