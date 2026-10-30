import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { getCompareSelection, toggleCompare } from "../lib/compare";
import { getFoodImage } from "../lib/listingImages";
import {
  addFoodFavorite,
  createConversation,
  createFoodReview,
  getFavorites,
  getFoodMenu,
  getFoodPlace,
  getFoodReviews,
  removeFoodFavorite,
} from "../lib/api";

const FALLBACK = "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1600&q=85";

function FoodDetailPage() {
  const { foodPlaceId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [food, setFood] = useState(null);
  const [inCompare, setInCompare] = useState(() => getCompareSelection("food").includes(Number(foodPlaceId)));
  const [menu, setMenu] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [contacting, setContacting] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const handleCompare = () => {
    const current = getCompareSelection("food");
    if (!inCompare && current.length >= 3) {
      setError("You can compare up to 3 messes.");
      return;
    }
    setInCompare(toggleCompare("food", foodPlaceId).includes(Number(foodPlaceId)));
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [foodData, menuData, reviewData] = await Promise.all([
        getFoodPlace(foodPlaceId),
        getFoodMenu(foodPlaceId),
        getFoodReviews(foodPlaceId),
      ]);
      setFood(foodData);
      setMenu(Array.isArray(menuData) ? menuData : []);
      setReviews(Array.isArray(reviewData) ? reviewData : []);
    } catch (requestError) {
      console.error(requestError);
      setError(requestError.message || "Unable to load this food place.");
    } finally {
      setLoading(false);
    }
  }, [foodPlaceId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsFavorite(false);
      return;
    }
    getFavorites()
      .then((items) => setIsFavorite((items || []).some((item) => item.food_place_id === Number(foodPlaceId))))
      .catch(() => {});
  }, [foodPlaceId, isAuthenticated]);

  const groupedMenu = useMemo(() => {
    return menu.reduce((groups, item) => {
      const key = item.day_of_week || "Daily";
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {});
  }, [menu]);

  const toggleFavorite = async () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: `/food/${foodPlaceId}` } });
      return;
    }
    try {
      if (isFavorite) {
        await removeFoodFavorite(foodPlaceId);
        setIsFavorite(false);
      } else {
        await addFoodFavorite(foodPlaceId);
        setIsFavorite(true);
      }
    } catch (requestError) {
      console.error(requestError);
    }
  };

  const contactOwner = async () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: `/food/${foodPlaceId}` } });
      return;
    }
    setContacting(true);
    try {
      const conversation = await createConversation({ food_place_id: Number(foodPlaceId) });
      navigate(`/messages/${conversation.id}`);
    } catch (requestError) {
      setError(requestError.message || "Unable to contact the owner.");
    } finally {
      setContacting(false);
    }
  };

  const submitReview = async (event) => {
    event.preventDefault();
    if (!isAuthenticated) {
      navigate("/login", { state: { from: `/food/${foodPlaceId}` } });
      return;
    }
    setReviewSubmitting(true);
    setReviewError("");
    try {
      const created = await createFoodReview(foodPlaceId, {
        rating,
        review_text: reviewText.trim() || undefined,
      });
      setReviews((current) => [created, ...current]);
      setFood((current) => {
        if (!current) return current;
        const count = current.review_count || 0;
        const average = current.average_rating || 0;
        const nextCount = count + 1;
        return {
          ...current,
          review_count: nextCount,
          average_rating: Number(((average * count + rating) / nextCount).toFixed(1)),
        };
      });
      setReviewText("");
      setRating(5);
      setShowReview(false);
    } catch (requestError) {
      setReviewError(requestError.message || "Unable to submit your review.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) return <div className="cn-detail-state"><div className="cn-spinner" /><strong>Loading food place...</strong><span>Getting menu, pricing and reviews.</span></div>;
  if (error || !food) return <div className="cn-detail-state"><strong>Food place unavailable.</strong><p>{error || "This listing could not be found."}</p><Link className="primary-button" to="/food">Back to Food</Link></div>;

  return (
    <div className="cn-detail-page">
      <main className="cn-container">
        <Link className="cn-back-link" to="/food">← Back to Food</Link>
        <button type="button" className={`secondary-button compare-detail-button ${inCompare ? "is-active" : ""}`} onClick={handleCompare}>
          {inCompare ? "✓ Added to compare" : "Add to compare"}
        </button>
        <section className="cn-detail-hero-grid">
          <div className="cn-detail-image"><img src={getFoodImage(food.id)} alt={food.name} onError={(event) => { if (event.currentTarget.src !== FALLBACK) event.currentTarget.src = FALLBACK; }} /></div>
          <div className="cn-detail-summary">
            <span className="eyebrow">LOCAL FOOD</span>
            <h1>{food.name}</h1>
            <p className="cn-detail-address">{food.address}</p>
            <div className="cn-detail-rating">★ {food.average_rating ? food.average_rating.toFixed(1) : "New"} <span>· {food.review_count || 0} reviews</span></div>
            <div className="cn-price-row">
              {food.monthly_price && <div><strong>₹{Number(food.monthly_price).toLocaleString("en-IN")}</strong><span>/ month</span></div>}
              {food.daily_price && <div><strong>₹{Number(food.daily_price).toLocaleString("en-IN")}</strong><span>/ day</span></div>}
            </div>
            <p className="cn-detail-description">{food.description || "A local meal option for students and professionals settling into the city."}</p>
            <div className="cn-detail-actions">
              <button className="primary-button" onClick={contactOwner} disabled={contacting}>{contacting ? "Opening chat..." : "Contact owner"}</button>
              <button className={`secondary-button ${isFavorite ? "is-active" : ""}`} onClick={toggleFavorite}>{isFavorite ? "♥ Saved" : "♡ Save"}</button>
            </div>
            {food.contact_phone && <a className="cn-phone-link" href={`tel:${food.contact_phone}`}>Call {food.contact_phone}</a>}
          </div>
        </section>

        <section className="cn-detail-section">
          <div className="cn-section-heading"><div><span className="eyebrow">MENU</span><h2>What is being served?</h2></div></div>
          {Object.keys(groupedMenu).length === 0 ? (
            <div className="cn-state-card compact"><strong>Menu not added yet.</strong><p>The owner has not published menu items for this listing.</p></div>
          ) : (
            <div className="cn-menu-grid">
              {Object.entries(groupedMenu).map(([day, items]) => (
                <div className="cn-menu-day" key={day}>
                  <h3>{day}</h3>
                  {items.map((item) => (
                    <div className="cn-menu-item" key={item.id}>
                      <div><strong>{item.meal_type}</strong><p>{item.menu_description}</p></div>
                      {item.price && <span>₹{Number(item.price).toLocaleString("en-IN")}</span>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="cn-detail-section">
          <div className="cn-section-heading"><div><span className="eyebrow">REVIEWS</span><h2>What residents say.</h2></div><button className="secondary-button" onClick={() => isAuthenticated ? setShowReview((v) => !v) : navigate("/login", { state: { from: `/food/${foodPlaceId}` } })}>{showReview ? "Close" : "Write a review"}</button></div>
          {showReview && (
            <form className="cn-review-form" onSubmit={submitReview}>
              <label className="cn-field">Rating<select value={rating} onChange={(e) => setRating(Number(e.target.value))}><option value="5">5 — Excellent</option><option value="4">4 — Good</option><option value="3">3 — Average</option><option value="2">2 — Poor</option><option value="1">1 — Very poor</option></select></label>
              <label className="cn-field">Your review<textarea rows="4" maxLength="2000" value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Share your experience..." /></label>
              {reviewError && <p className="cn-form-error">{reviewError}</p>}
              <button className="primary-button" disabled={reviewSubmitting}>{reviewSubmitting ? "Submitting..." : "Publish review"}</button>
            </form>
          )}
          {reviews.length === 0 ? <div className="cn-state-card compact"><strong>No reviews yet.</strong><p>Be the first resident to share an experience.</p></div> : <div className="cn-review-list">{reviews.map((review) => <article className="cn-review-card" key={review.id}><div className="cn-review-top"><strong>User #{review.user_id}</strong><span>★ {review.rating}/5</span></div><p>{review.review_text || "No written comment."}</p><small>{new Date(review.created_at).toLocaleDateString("en-IN")}</small></article>)}</div>}
        </section>
      </main>
    </div>
  );
}

export default FoodDetailPage;
