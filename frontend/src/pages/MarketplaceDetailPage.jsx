import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { getCompareSelection, toggleCompare } from "../lib/compare";
import {
  addMarketplaceFavorite,
  createConversation,
  getFavorites,
  getMarketplaceItem,
  removeMarketplaceFavorite,
} from "../lib/api";

const FALLBACK = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&q=85";

function MarketplaceDetailPage() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [item, setItem] = useState(null);
  const [inCompare, setInCompare] = useState(() => getCompareSelection("marketplace").includes(Number(itemId)));
  const [favorite, setFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [contacting, setContacting] = useState(false);

  useEffect(() => {
    Promise.all([
      getMarketplaceItem(itemId),
      isAuthenticated ? getFavorites() : Promise.resolve([]),
    ]).then(([itemData, favorites]) => {
      setItem(itemData);
      setFavorite((favorites || []).some((x) => x.marketplace_item_id === Number(itemId)));
    }).catch((requestError) => setError(requestError.message || "Unable to load this item."))
      .finally(() => setLoading(false));
  }, [itemId, isAuthenticated]);

  const handleCompare = () => {
    const current = getCompareSelection("marketplace");
    if (!inCompare && current.length >= 3) {
      setError("You can compare up to 3 marketplace items.");
      return;
    }
    setInCompare(toggleCompare("marketplace", itemId).includes(Number(itemId)));
  };

  const toggleFavorite = async () => {
    if (!isAuthenticated) { navigate("/login", { state: { from: `/marketplace/${itemId}` } }); return; }
    try {
      if (favorite) { await removeMarketplaceFavorite(itemId); setFavorite(false); }
      else { await addMarketplaceFavorite(itemId); setFavorite(true); }
    } catch (requestError) { console.error(requestError); }
  };

  const contactSeller = async () => {
    if (!isAuthenticated) { navigate("/login", { state: { from: `/marketplace/${itemId}` } }); return; }
    if (user?.id === item?.seller_id) return;
    setContacting(true);
    try {
      const conversation = await createConversation({ marketplace_item_id: Number(itemId) });
      navigate(`/messages/${conversation.id}`);
    } catch (requestError) { setError(requestError.message || "Unable to contact seller."); }
    finally { setContacting(false); }
  };

  if (loading) return <div className="cn-detail-state"><div className="cn-spinner" /><strong>Loading marketplace item...</strong></div>;
  if (error || !item) return <div className="cn-detail-state"><strong>Item unavailable.</strong><p>{error || "This listing could not be found."}</p><Link className="primary-button" to="/marketplace">Back to Marketplace</Link></div>;

  const ownItem = user?.id === item.seller_id;

  return (
    <div className="cn-detail-page">
      <main className="cn-container">
        <Link className="cn-back-link" to="/marketplace">← Back to Marketplace</Link>
        <button type="button" className={`secondary-button compare-detail-button ${inCompare ? "is-active" : ""}`} onClick={handleCompare}>
          {inCompare ? "✓ Added to compare" : "Add to compare"}
        </button>
        <section className="cn-detail-hero-grid">
          <div className="cn-detail-image"><img src={item.image_url || FALLBACK} alt={item.title} /></div>
          <div className="cn-detail-summary">
            <span className="eyebrow">SECONDHAND ITEM</span>
            <h1>{item.title}</h1>
            <div className="cn-detail-tags"><span>{item.category}</span><span>{item.condition}</span></div>
            <div className="cn-market-price">₹{Number(item.price).toLocaleString("en-IN")}</div>
            <p className="cn-detail-description">{item.description || "No additional description was provided by the seller."}</p>
            <div className="cn-seller-note">Seller #{item.seller_id} · Listed {new Date(item.created_at).toLocaleDateString("en-IN")}</div>
            <div className="cn-detail-actions">
              {ownItem ? <Link className="primary-button" to="/dashboard">Manage from dashboard</Link> : <button className="primary-button" disabled={contacting} onClick={contactSeller}>{contacting ? "Opening chat..." : "Contact seller"}</button>}
              <button className={`secondary-button ${favorite ? "is-active" : ""}`} onClick={toggleFavorite}>{favorite ? "♥ Saved" : "♡ Save"}</button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default MarketplaceDetailPage;
