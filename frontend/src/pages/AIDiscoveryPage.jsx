import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import {
  aiSearch,
  createSavedSearch,
  getRecommendations,
} from "../lib/api";
import { useAuth } from "../context/AuthContext";

const TYPES = [
  ["property", "Stay", "Rooms, PGs, hostels and rentals"],
  ["food", "Food", "Mess and meal plans"],
  ["marketplace", "Marketplace", "Used items and essentials"],
];

const TYPE_LABELS = Object.fromEntries(
  TYPES.map(([key, label]) => [key, label]),
);

function price(item, type) {
  if (type === "property") {
    return item.monthly_rent
      ? `₹${Number(item.monthly_rent).toLocaleString("en-IN")}/mo`
      : "";
  }

  if (type === "food") {
    if (item.monthly_price) {
      return `₹${Number(item.monthly_price).toLocaleString("en-IN")}/mo`;
    }
    return item.daily_price
      ? `₹${Number(item.daily_price).toLocaleString("en-IN")}/day`
      : "";
  }

  return item.price
    ? `₹${Number(item.price).toLocaleString("en-IN")}`
    : "";
}

function ResultGrid({ type, items }) {
  if (!items.length) {
    return (
      <div className="cn-empty">
        No matching listings yet. Try a broader budget, locality or category.
      </div>
    );
  }

  return (
    <div className="cn-ai-grid">
      {items.map((item) => {
        const path =
          type === "property"
            ? `/stay/${item.id}`
            : type === "food"
              ? `/food/${item.id}`
              : `/marketplace/${item.id}`;
        const title = type === "food" ? item.name : item.title;

        return (
          <Link
            to={path}
            className="cn-ai-card"
            key={`${type}-${item.id}`}
          >
            <div>
              <span className="cn-ai-card-type">
                {TYPE_LABELS[type]}
              </span>
              {item.owner_verified && (
                <span className="cn-verified">✓ Verified</span>
              )}
            </div>
            <h3>{title}</h3>
            <p>
              {item.address || item.category || item.description || "CityNest listing"}
            </p>
            <strong>{price(item, type)}</strong>
            {item.average_rating > 0 && (
              <span>
                ★ {Number(item.average_rating).toFixed(1)} · {item.review_count} reviews
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

function AIDiscoveryPage() {
  const [params] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const [type, setType] = useState(params.get("type") || "");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [recommendations, setRecommendations] = useState({});
  const [loading, setLoading] = useState(false);
  const [recLoading, setRecLoading] = useState(false);
  const [message, setMessage] = useState("");

  const activeLabel = useMemo(
    () => TYPE_LABELS[type] || "everything",
    [type],
  );

  useEffect(() => {
    if (!isAuthenticated) {
      setRecommendations({});
      return;
    }

    let cancelled = false;
    const requestedTypes = type
      ? [type]
      : TYPES.map(([key]) => key);

    setRecLoading(true);

    Promise.all(
      requestedTypes.map(async (listingType) => {
        try {
          const data = await getRecommendations(listingType);
          return [listingType, data.results || []];
        } catch {
          return [listingType, []];
        }
      }),
    )
      .then((entries) => {
        if (!cancelled) {
          setRecommendations(Object.fromEntries(entries));
        }
      })
      .finally(() => {
        if (!cancelled) setRecLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [type, isAuthenticated]);

  const submit = async (event) => {
    event.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setMessage("");

    try {
      const data = await aiSearch(query, type || undefined);
      setType(data.criteria.listing_type);
      setResult(data);
    } catch (error) {
      setMessage(error.message || "AI search is unavailable.");
    } finally {
      setLoading(false);
    }
  };

  const saveSearch = async () => {
    if (!isAuthenticated || !result) return;

    try {
      await createSavedSearch({
        name: query.trim().slice(0, 120),
        listing_type: result.criteria.listing_type,
        query_text: query.trim(),
        filters: result.criteria,
      });
      setMessage("Search saved. CityNest can use it for future recommendations.");
    } catch (error) {
      setMessage(error.message || "Could not save this search.");
    }
  };

  return (
    <div className="cn-ai-page">
      <main className="cn-container">
        <section className="cn-ai-hero">
          <span className="eyebrow">CITYNEST INTELLIGENCE</span>
          <h1>Tell CityNest what you need.</h1>
          <p>
            Search stays, messes and secondhand items using normal language. CityNest converts the request into structured filters and searches live listings.
          </p>

          <form className="cn-ai-search" onSubmit={submit}>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="“Furnished room under ₹8000 near MGM with good ratings”"
              maxLength={1000}
            />
            <button className="primary-button" disabled={loading}>
              {loading ? "Thinking..." : "Search with AI →"}
            </button>
          </form>

          <div className="cn-ai-types">
            <button
              className={!type ? "active" : ""}
              onClick={() => setType("")}
              type="button"
            >
              All
            </button>
            {TYPES.map(([key, label, text]) => (
              <button
                key={key}
                className={type === key ? "active" : ""}
                onClick={() => setType(key)}
                type="button"
              >
                <strong>{label}</strong>
                <small>{text}</small>
              </button>
            ))}
          </div>

          {message && <div className="cn-inline-note">{message}</div>}
        </section>

        {result && (
          <section className="cn-ai-results">
            <div className="cn-section-head">
              <div>
                <span className="eyebrow">SEARCH RESULTS</span>
                <h2>{result.results.length} matches for {activeLabel}.</h2>
              </div>
              <div className="cn-ai-actions">
                <span>{result.ai_powered ? "AI powered" : "Local parser"}</span>
                {isAuthenticated && (
                  <button className="secondary-button" onClick={saveSearch}>
                    Save search
                  </button>
                )}
              </div>
            </div>
            <p className="cn-ai-explanation">{result.explanation}</p>
            <ResultGrid type={result.criteria.listing_type} items={result.results} />
          </section>
        )}

        {isAuthenticated && (
          <section className="cn-ai-results">
            <div className="cn-section-head">
              <div>
                <span className="eyebrow">FOR YOU</span>
                <h2>Personalized recommendations.</h2>
              </div>
              <Link className="secondary-button" to="/dashboard">
                Manage saved searches
              </Link>
            </div>

            {recLoading ? (
              <div className="cn-detail-state compact">Loading recommendations…</div>
            ) : type ? (
              <ResultGrid type={type} items={recommendations[type] || []} />
            ) : (
              <div className="cn-ai-recommendation-groups">
                {TYPES.map(([key, label]) => (
                  <div key={key} className="cn-ai-recommendation-group">
                    <div className="cn-section-heading">
                      <div>
                        <span className="eyebrow">{label}</span>
                        <h3>Recommended {label.toLowerCase()}.</h3>
                      </div>
                    </div>
                    <ResultGrid type={key} items={recommendations[key] || []} />
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default AIDiscoveryPage;
