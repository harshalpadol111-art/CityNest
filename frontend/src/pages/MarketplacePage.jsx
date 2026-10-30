import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Package, Search, ShieldCheck, Tag } from "lucide-react";
import ShowcaseCard from "../components/showcase/ShowcaseCard";
import { getMarketplaceItems } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const HERO_IMAGE = "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1800&q=85";

function MarketplacePage() {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getMarketplaceItems({ limit: 50 })
      .then((data) => mounted && setItems(Array.isArray(data) ? data : []))
      .catch((requestError) => mounted && setError(requestError.message || "Unable to load live marketplace listings."))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const categories = useMemo(() => ["All", ...new Set(items.map((item) => item.category).filter(Boolean))], [items]);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return items.filter((item) => {
      const categoryMatch = category === "All" || item.category === category;
      const textMatch = !term || [item.title, item.description, item.category, item.condition, item.locality_name].filter(Boolean).join(" ").toLowerCase().includes(term);
      return categoryMatch && textMatch;
    });
  }, [items, query, category]);

  return (
    <div className="showcase-page">
      <section className="showcase-hero showcase-hero-market">
        <div className="showcase-hero-copy">
          <span className="showcase-eyebrow"><span className="showcase-eyebrow-dot" />CityNest marketplace</span>
          <h1>Buy smart.<br /><em>Sell locally.</em></h1>
          <p>Find live secondhand listings from people using CityNest to settle into or move out of Chhatrapati Sambhajinagar.</p>
          <div className="showcase-search"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search laptops, furniture, books..." /></div>
          <div className="showcase-category-row">{categories.slice(0, 8).map((value) => <button type="button" key={value} className={category === value ? "active" : ""} onClick={() => setCategory(value)}>{value}</button>)}</div>
        </div>
        <div className="showcase-market-hero-card"><img src={HERO_IMAGE} alt="Laptop and desk setup" /><div className="market-hero-caption"><strong>Buy from people nearby.</strong><span>Open a listing to contact the seller directly.</span></div></div>
      </section>

      <section className="showcase-content">
        <div className="showcase-section-heading"><div><span className="showcase-section-label">LIVE MARKETPLACE</span><h2>Useful things. Direct contact.</h2></div><div><p>Every item below is a database-backed CityNest listing. Open it to see the full details and contact the seller.</p>{isAuthenticated && <Link className="primary-button" to="/marketplace/sell?type=marketplace">Sell an item →</Link>}</div></div>
        <div className="marketplace-value-strip"><div><ShieldCheck size={20} /><span><strong>Seller contact</strong>Start a CityNest conversation from the listing.</span></div><div><Package size={20} /><span><strong>Move-out friendly</strong>List useful things when your stay ends.</span></div><div><Tag size={20} /><span><strong>Local pricing</strong>Compare practical secondhand prices nearby.</span></div></div>

        {loading ? <div className="showcase-loading">Loading live marketplace listings...</div> : error ? <div className="showcase-empty"><Package size={28} /><h3>We could not load the marketplace.</h3><p>{error}</p></div> : filtered.length ? <div className="showcase-grid showcase-grid-market">{filtered.map((item) => <ShowcaseCard key={item.id} item={item} type="marketplace" />)}</div> : <div className="showcase-empty"><Package size={28} /><h3>No items match that search.</h3><p>Try another keyword or category.</p></div>}

        <div className="showcase-bottom-note"><div><strong>One platform for the whole move.</strong><span>Stay, food and secondhand essentials — all backed by real CityNest listing records.</span></div><span className="showcase-pill">Buy · Sell · Relocate</span></div>
      </section>
    </div>
  );
}

export default MarketplacePage;
