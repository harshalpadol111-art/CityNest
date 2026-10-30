import { useState } from "react";
import { Search, Sparkles } from "lucide-react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

function AISearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (event) => {
    event.preventDefault();

    if (!query.trim()) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/ai/search`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: query.trim(),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "AI search could not be completed.",
        );
      }

      const normalized =
        Array.isArray(data)
          ? data
          : data.results ||
            data.items ||
            [];

      setResults(normalized);
    } catch (requestError) {
      console.error(
        "AI search failed:",
        requestError,
      );

      setError(
        requestError.message ||
          "Unable to perform AI search.",
      );

      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ai-search-page">
      <section className="ai-search-hero">
        <div className="ai-search-hero-inner">
          <span className="eyebrow">
            CityNest AI
          </span>

          <h1>
            Tell us what you need.
          </h1>

          <p>
            Search stays, messes and secondhand
            items using normal language.
          </p>

          <form
            className="ai-search-form"
            onSubmit={handleSearch}
          >
            <Search size={21} />

            <input
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="Try: furnished room near MGM under ₹10,000"
            />

            <button
              type="submit"
              disabled={isLoading}
            >
              {isLoading
                ? "Searching..."
                : "Search"}
            </button>
          </form>

          <div className="ai-search-examples">
            <button
              type="button"
              onClick={() =>
                setQuery(
                  "furnished room near MGM under ₹10000",
                )
              }
            >
              Furnished room near MGM
            </button>

            <button
              type="button"
              onClick={() =>
                setQuery(
                  "veg mess under ₹3500 per month",
                )
              }
            >
              Veg mess under ₹3500
            </button>

            <button
              type="button"
              onClick={() =>
                setQuery(
                  "used laptop under ₹30000",
                )
              }
            >
              Used laptop under ₹30000
            </button>
          </div>
        </div>
      </section>

      <section className="ai-search-results">
        <div className="ai-search-results-heading">
          <div>
            <span className="demo-stays-label">
              Intelligent discovery
            </span>

            <h2>
              {results.length
                ? `${results.length} matches found`
                : "Search across CityNest"}
            </h2>
          </div>

          <Sparkles size={25} />
        </div>

        {error && (
          <div className="stay-state-card">
            <h2>AI search unavailable</h2>
            <p>{error}</p>
          </div>
        )}

        {!error &&
          !isLoading &&
          results.length === 0 && (
            <div className="ai-empty-state">
              <Sparkles size={32} />

              <h3>
                One search. Three CityNest
                categories.
              </h3>

              <p>
                Ask for a place to stay, a mess,
                or something useful to buy.
              </p>
            </div>
          )}

        {results.length > 0 && (
          <div className="ai-results-grid">
            {results.map((item, index) => (
              <article
                className="ai-result-card"
                key={
                  item.id ||
                  `${item.title}-${index}`
                }
              >
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={
                      item.title ||
                      item.name ||
                      "CityNest listing"
                    }
                  />
                )}

                <div className="ai-result-card-body">
                  <span>
                    {item.listing_type ||
                      item.property_type ||
                      item.category ||
                      "CityNest listing"}
                  </span>

                  <h3>
                    {item.title ||
                      item.name ||
                      "Listing"}
                  </h3>

                  <p>
                    {item.description ||
                      "Available on CityNest."}
                  </p>

                  {item.monthly_rent && (
                    <strong>
                      ₹
                      {Number(
                        item.monthly_rent,
                      ).toLocaleString("en-IN")}
                      / month
                    </strong>
                  )}

                  {item.price && (
                    <strong>
                      ₹
                      {Number(
                        item.price,
                      ).toLocaleString("en-IN")}
                    </strong>
                  )}

                  {item.monthly_price && (
                    <strong>
                      ₹
                      {Number(
                        item.monthly_price,
                      ).toLocaleString("en-IN")}
                      / month
                    </strong>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default AISearchPage;