
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import PropertyCard from "../components/stay/PropertyCard";
import PropertySkeleton from "../components/stay/PropertySkeleton";
import StayFilters from "../components/stay/StayFilters";

import {
  getCities,
  getLocalities,
  getProperties,
} from "../lib/api";

const INITIAL_FILTERS = {
  city_id: "",
  locality_id: "",
  min_rent: "",
  max_rent: "",
  property_type: "",
  available_for: "",
  furnishing: "",
  min_rating: "",
  sort_by_rating: false,
};

function StayPage() {
  const [filters, setFilters] =
    useState(INITIAL_FILTERS);

  const [cities, setCities] = useState([]);
  const [localities, setLocalities] =
    useState([]);

  const [properties, setProperties] =
    useState([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isLoadingLocalities, setIsLoadingLocalities] =
    useState(false);

  const [error, setError] = useState("");

  const [offset, setOffset] = useState(0);
  const LIMIT = 12;

  const [hasMore, setHasMore] =
    useState(false);

  const [isLoadingMore, setIsLoadingMore] =
    useState(false);

  const loadCities = useCallback(async () => {
    try {
      const data = await getCities();
      setCities(
        Array.isArray(data) ? data : [],
      );
    } catch (requestError) {
      console.error(
        "Failed to load cities:",
        requestError,
      );
    }
  }, []);

  const loadLocalities = useCallback(
    async (cityId) => {
      if (!cityId) {
        setLocalities([]);
        return;
      }

      setIsLoadingLocalities(true);

      try {
        const data = await getLocalities(cityId);

        setLocalities(
          Array.isArray(data) ? data : [],
        );
      } catch (requestError) {
        console.error(
          "Failed to load localities:",
          requestError,
        );

        setLocalities([]);
      } finally {
        setIsLoadingLocalities(false);
      }
    },
    [],
  );

  const loadProperties = useCallback(
    async (nextOffset = 0) => {
      if (nextOffset === 0) {
        setIsLoading(true);
        setError("");
      } else {
        setIsLoadingMore(true);
      }

      try {
        const data = await getProperties({
          ...filters,
          limit: LIMIT,
          offset: nextOffset,
        });

        const nextProperties =
          Array.isArray(data) ? data : [];

        if (nextOffset === 0) {
          setProperties(nextProperties);
        } else {
          setProperties((current) => [
            ...current,
            ...nextProperties,
          ]);
        }

        setOffset(nextOffset);

        setHasMore(
          nextProperties.length === LIMIT,
        );
      } catch (requestError) {
        console.error(
          "Failed to load properties:",
          requestError,
        );

        if (nextOffset === 0) {
          setProperties([]);
          setError(
            requestError.message ||
              "Unable to load properties.",
          );
        }
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [filters],
  );

  useEffect(() => {
    loadCities();
  }, [loadCities]);

  useEffect(() => {
    loadLocalities(filters.city_id);
  }, [
    filters.city_id,
    loadLocalities,
  ]);

  useEffect(() => {
    setOffset(0);
    loadProperties(0);
  }, [loadProperties]);

  const handleFilterChange = (
    key,
    value,
  ) => {
    if (key === "city_id") {
      setFilters((current) => ({
        ...current,
        city_id: value,
        locality_id: "",
      }));

      return;
    }

    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleReset = () => {
    setFilters(INITIAL_FILTERS);
  };

  const handleLoadMore = () => {
    if (
      isLoadingMore ||
      !hasMore
    ) {
      return;
    }

    loadProperties(offset + LIMIT);
  };

  const resultLabel = useMemo(() => {
    if (isLoading) {
      return "Finding available places...";
    }

    if (properties.length === 0) {
      return "No live places found";
    }

    return `${properties.length}${hasMore ? "+" : ""} live places`;
  }, [
    isLoading,
    properties.length,
    hasMore,
  ]);

  return (
    <div className="stay-page">
      <section className="stay-hero">
        <div className="stay-hero-inner">
          <div>
            <span className="eyebrow">
              Stay
            </span>

            <h1>
              Find a place to settle in.
            </h1>

            <p>
              Explore rooms, PGs, hostels and
              rental properties around your
              destination.
            </p>
          </div>
        </div>
      </section>

      <section className="stay-content">
        <StayFilters
          filters={filters}
          cities={cities}
          localities={localities}
          isLoadingLocalities={
            isLoadingLocalities
          }
          onChange={handleFilterChange}
          onReset={handleReset}
        />

        <div className="stay-results">
          <div className="stay-results-header">
            <div>
              <span className="stay-result-count">
                {resultLabel}
              </span>

              {!isLoading &&
                properties.length > 0 && (
                  <p>
                    Showing live properties
                    matching your preferences.
                  </p>
                )}
            </div>
          </div>

          {isLoading ? (
            <div className="property-grid">
              {Array.from({
                length: 6,
              }).map((_, index) => (
                <PropertySkeleton
                  key={index}
                />
              ))}
            </div>
          ) : error ? (
            <div className="stay-state-card">
              <div className="stay-state-icon">
                !
              </div>

              <h2>
                We couldn't load live properties.
              </h2>

              <p>{error}</p>

              <button
                type="button"
                className="primary-button"
                onClick={() =>
                  loadProperties(0)
                }
              >
                Try again
              </button>
            </div>
          ) : properties.length === 0 ? (
            <div className="stay-state-card">
              <div className="stay-state-icon">
                ⌂
              </div>

              <h2>
                No live properties match your filters.
              </h2>

              <p>
                Try clearing a filter or check back after an owner publishes a new CityNest listing.
              </p>

              <button
                type="button"
                className="secondary-button"
                onClick={handleReset}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="property-grid">
                {properties.map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                  />
                ))}
              </div>

              {hasMore && (
                <div className="stay-load-more">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore
                      ? "Loading..."
                      : "Load more properties"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default StayPage;
