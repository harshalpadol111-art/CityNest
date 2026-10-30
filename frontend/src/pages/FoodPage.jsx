import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Search, Star, Utensils } from "lucide-react";
import ShowcaseCard from "../components/showcase/ShowcaseCard";
import { getFoodPlaces } from "../lib/api";
import { getFoodImage } from "../lib/listingImages";

const HERO_IMAGE = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1800&q=85";

function FoodPage() {
  const [foodPlaces, setFoodPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getFoodPlaces({ limit: 50 })
      .then((data) => {
        if (mounted) setFoodPlaces(Array.isArray(data) ? data : []);
      })
      .catch((requestError) => {
        if (mounted) setError(requestError.message || "Unable to load live food listings.");
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return foodPlaces;
    return foodPlaces.filter((place) =>
      [place.name, place.description, place.food_type, place.address, place.locality_name]
        .filter(Boolean).join(" ").toLowerCase().includes(term),
    );
  }, [foodPlaces, query]);

  return (
    <div className="showcase-page">
      <section className="showcase-hero showcase-hero-food">
        <div className="showcase-hero-copy">
          <span className="showcase-eyebrow"><span className="showcase-eyebrow-dot" />Food & mess</span>
          <h1>Good food makes<br /><em>new cities easier.</em></h1>
          <p>Discover live CityNest mess and meal-plan listings with pricing, menus, ratings and direct owner contact.</p>
          <div className="showcase-search"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search mess, locality or food type..." /></div>
          <div className="showcase-trust-row">
            <span><CheckCircle2 size={15} />Live CityNest listings</span>
            <span><Star size={15} fill="currentColor" />Community ratings</span>
            <span><Clock3 size={15} />Monthly plans</span>
          </div>
        </div>
        <div className="showcase-market-hero-card"><img src={HERO_IMAGE} alt="Indian meal spread" /><div className="market-hero-caption"><strong>Find your everyday meal plan.</strong><span>Compare real listings before you commit.</span></div></div>
      </section>

      <section className="showcase-content">
        <div className="showcase-section-heading">
          <div><span className="showcase-section-label">LIVE FOOD DIRECTORY</span><h2>Meals you can actually contact.</h2></div>
          <p>Every card below comes from the CityNest database. Open a listing to view the menu, reviews, save it or contact the owner.</p>
        </div>

        {loading ? <div className="showcase-loading">Loading live food listings...</div> : error ? <div className="showcase-empty"><Utensils size={28} /><h3>We could not load the food directory.</h3><p>{error}</p></div> : filtered.length ? <div className="showcase-grid showcase-grid-food">{filtered.map((item) => <ShowcaseCard key={item.id} item={{ ...item, image: getFoodImage(item.id) }} type="food" />)}</div> : <div className="showcase-empty"><Utensils size={28} /><h3>No live messes match that search.</h3><p>Try a broader locality or keyword.</p></div>}

        <div className="showcase-bottom-note"><div><strong>Owners publish directly.</strong><span>New listings appear here as soon as an approved owner publishes them.</span></div><span className="showcase-pill">Chhatrapati Sambhajinagar</span></div>
      </section>
    </div>
  );
}

export default FoodPage;
