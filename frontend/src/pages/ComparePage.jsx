import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import {
  getFoodPlace,
  getMarketplaceItem,
  getProperty,
} from "../lib/api";
import { clearCompare, getCompareSelection } from "../lib/compare";

const TYPES = {
  property: "Stays",
  food: "Messes",
  marketplace: "Marketplace",
};

const BROWSE_PATHS = {
  property: "/stay",
  food: "/food",
  marketplace: "/marketplace",
};

function getRows(type) {
  if (type === "property") {
    return [
      ["Monthly rent", "monthly_rent", (value) => value ? `₹${Number(value).toLocaleString("en-IN")}` : "—"],
      ["Property type", "property_type"],
      ["Furnishing", "furnishing"],
      ["Available for", "available_for"],
      ["Rating", "average_rating", (value) => value ? `★ ${Number(value).toFixed(1)}` : "No ratings"],
      ["Reviews", "review_count"],
    ];
  }

  if (type === "food") {
    return [
      ["Monthly price", "monthly_price", (value) => value ? `₹${Number(value).toLocaleString("en-IN")}` : "—"],
      ["Daily price", "daily_price", (value) => value ? `₹${Number(value).toLocaleString("en-IN")}` : "—"],
      ["Food type", "food_type"],
      ["Rating", "average_rating", (value) => value ? `★ ${Number(value).toFixed(1)}` : "No ratings"],
      ["Reviews", "review_count"],
    ];
  }

  return [
    ["Price", "price", (value) => value ? `₹${Number(value).toLocaleString("en-IN")}` : "—"],
    ["Category", "category"],
    ["Condition", "condition"],
  ];
}

function ComparePage() {
  const [params] = useSearchParams();
  const type = TYPES[params.get("type")] ? params.get("type") : "property";
  const [selectedIds, setSelectedIds] = useState(() =>
    getCompareSelection(type),
  );
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSelectedIds(getCompareSelection(type));
  }, [type]);

  useEffect(() => {
    const handleChange = () => {
      setSelectedIds(getCompareSelection(type));
    };
    window.addEventListener("citynest-compare-change", handleChange);
    return () =>
      window.removeEventListener("citynest-compare-change", handleChange);
  }, [type]);

  useEffect(() => {
    let cancelled = false;
    const ids = selectedIds;
    const getter =
      type === "property"
        ? getProperty
        : type === "food"
          ? getFoodPlace
          : getMarketplaceItem;

    if (!ids.length) {
      setItems([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    Promise.all(ids.map((id) => getter(id).catch(() => null)))
      .then((data) => {
        if (!cancelled) setItems(data.filter(Boolean));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [type, selectedIds]);

  const rows = getRows(type);

  const handleClear = () => {
    clearCompare(type);
    setSelectedIds([]);
  };

  return (
    <div className="cn-compare-page">
      <main className="cn-container">
        <div className="cn-section-head">
          <div>
            <span className="eyebrow">CITYNEST COMPARE</span>
            <h1>Compare {TYPES[type].toLowerCase()} side by side.</h1>
          </div>
          <button className="secondary-button" onClick={handleClear} disabled={!selectedIds.length}>
            Clear
          </button>
        </div>

        <p className="cn-compare-help">
          Select up to three listings from Stay, Food or Marketplace, then compare the details that matter.
        </p>

        {!selectedIds.length ? (
          <div className="cn-empty">
            <strong>No {TYPES[type].toLowerCase()} selected.</strong>
            <p>Open a listing and choose “Add to compare”.</p>
            <Link className="primary-button" to={BROWSE_PATHS[type]}>
              Browse {TYPES[type]}
            </Link>
          </div>
        ) : loading ? (
          <div className="cn-detail-state compact">Loading comparison…</div>
        ) : !items.length ? (
          <div className="cn-empty">
            <strong>Those listings are no longer available.</strong>
            <p>Clear the comparison and choose current CityNest listings.</p>
            <button className="primary-button" onClick={handleClear}>Clear comparison</button>
          </div>
        ) : (
          <div className="cn-compare-table">
            <div className="cn-compare-row cn-compare-head">
              <div>Feature</div>
              {items.map((item) => (
                <div key={item.id}>
                  <strong>{item.title || item.name}</strong>
                  <Link to={`${BROWSE_PATHS[type]}/${item.id}`}>
                    Open listing →
                  </Link>
                </div>
              ))}
            </div>

            {rows.map(([label, key, formatter]) => (
              <div className="cn-compare-row" key={key}>
                <div><strong>{label}</strong></div>
                {items.map((item) => (
                  <div key={item.id}>
                    {formatter ? formatter(item[key]) : item[key] || "—"}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default ComparePage;
