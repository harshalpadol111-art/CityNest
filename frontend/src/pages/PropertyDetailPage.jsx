import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  addPropertyFavorite,
  createConversation,
  createPropertyReview,
  createVisitRequest,
  getProperty,
  getPropertyReviews,
  removePropertyFavorite,
  getImageUrl,
} from "../lib/api";

import { useAuth } from "../context/AuthContext";
import { getCompareSelection, toggleCompare } from "../lib/compare";

function PropertyDetailPage() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [property, setProperty] =
    useState(null);
  const [inCompare, setInCompare] = useState(() => getCompareSelection("property").includes(Number(propertyId)));

  const [reviews, setReviews] =
    useState([]);

  const [selectedImage, setSelectedImage] =
    useState(0);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] = useState("");

  const [isFavorite, setIsFavorite] =
    useState(false);

  const [isFavoriteLoading, setIsFavoriteLoading] =
    useState(false);

  const [showVisitForm, setShowVisitForm] =
    useState(false);

  const [visitDate, setVisitDate] =
    useState("");

  const [visitMessage, setVisitMessage] =
    useState("");

  const [isVisitSubmitting, setIsVisitSubmitting] =
    useState(false);

  const [visitSuccess, setVisitSuccess] =
    useState("");

  const [visitError, setVisitError] =
    useState("");

  const [showReviewForm, setShowReviewForm] =
    useState(false);

  const [reviewRating, setReviewRating] =
    useState(5);

  const [reviewText, setReviewText] =
    useState("");

  const [isReviewSubmitting, setIsReviewSubmitting] =
    useState(false);

  const [reviewError, setReviewError] =
    useState("");

  const handleCompare = () => {
    const current = getCompareSelection("property");
    if (!inCompare && current.length >= 3) {
      setError("You can compare up to 3 stays.");
      return;
    }
    setInCompare(toggleCompare("property", propertyId).includes(Number(propertyId)));
  };

  const loadProperty = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const [propertyData, reviewData] =
        await Promise.all([
          getProperty(propertyId),
          getPropertyReviews(propertyId),
        ]);

      setProperty(propertyData);

      setReviews(
        Array.isArray(reviewData)
          ? reviewData
          : [],
      );

      setSelectedImage(0);
    } catch (requestError) {
      console.error(
        "Failed to load property:",
        requestError,
      );

      setProperty(null);

      setError(
        requestError.message ||
        "Unable to load this property.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    loadProperty();
  }, [loadProperty]);

  const images = useMemo(() => {
    if (
      property?.images &&
      property.images.length > 0
    ) {
      return property.images;
    }

    return [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1600&q=85",
    ];
  }, [property]);

  const fallbackImage =
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1600&q=85";

  const currentImage =
    getImageUrl(images[selectedImage] || images[0], fallbackImage);

  const [isContactingOwner, setIsContactingOwner] =
    useState(false);

  const [contactError, setContactError] =
    useState("");

  const handleContactOwner = async () => {
    if (!isAuthenticated) {
      navigate("/login", {
        state: {
          from: `/stay/${propertyId}`,
        },
      });

      return;
    }

    setIsContactingOwner(true);
    setContactError("");

    try {
      const conversation =
        await createConversation({
          property_id: Number(propertyId),
        });

      navigate(
        `/messages/${conversation.id}`,
      );
    } catch (requestError) {
      console.error(
        "Could not start conversation:",
        requestError,
      );

      setContactError(
        requestError.message ||
        "Unable to contact the owner.",
      );
    } finally {
      setIsContactingOwner(false);
    }
  };

  const handleFavorite = async () => {
    if (!isAuthenticated) {
      navigate("/login", {
        state: {
          from: `/stay/${propertyId}`,
        },
      });

      return;
    }

    setIsFavoriteLoading(true);

    try {
      if (isFavorite) {
        await removePropertyFavorite(
          propertyId,
        );

        setIsFavorite(false);
      } else {
        await addPropertyFavorite(
          propertyId,
        );

        setIsFavorite(true);
      }
    } catch (requestError) {
      console.error(
        "Favorite action failed:",
        requestError,
      );
    } finally {
      setIsFavoriteLoading(false);
    }
  };

  const handleVisitSubmit = async (event) => {
    event.preventDefault();

    if (!isAuthenticated) {
      navigate("/login", {
        state: {
          from: `/stay/${propertyId}`,
        },
      });

      return;
    }

    if (!visitDate) {
      setVisitError(
        "Please select a date and time.",
      );

      return;
    }

    setIsVisitSubmitting(true);
    setVisitError("");
    setVisitSuccess("");

    try {
      await createVisitRequest(
        propertyId,
        {
          requested_at: visitDate,
          message:
            visitMessage.trim() || undefined,
        },
      );

      setVisitSuccess(
        "Your visit request has been sent to the owner.",
      );

      setVisitDate("");
      setVisitMessage("");
    } catch (requestError) {
      console.error(
        "Visit request failed:",
        requestError,
      );

      setVisitError(
        requestError.message ||
        "Unable to submit the visit request.",
      );
    } finally {
      setIsVisitSubmitting(false);
    }
  };

  const handleReviewSubmit = async (event) => {
    event.preventDefault();

    if (!isAuthenticated) {
      navigate("/login", {
        state: {
          from: `/stay/${propertyId}`,
        },
      });

      return;
    }

    setIsReviewSubmitting(true);
    setReviewError("");

    try {
      const createdReview =
        await createPropertyReview(
          propertyId,
          {
            rating: reviewRating,
            review_text:
              reviewText.trim() || undefined,
          },
        );

      setReviews((current) => [
        createdReview,
        ...current,
      ]);

      setReviewText("");
      setReviewRating(5);
      setShowReviewForm(false);

      setProperty((current) => {
        if (!current) {
          return current;
        }

        const oldCount =
          current.review_count || 0;

        const oldAverage =
          current.average_rating || 0;

        const newCount = oldCount + 1;

        const newAverage =
          (oldAverage * oldCount +
            reviewRating) /
          newCount;

        return {
          ...current,
          review_count: newCount,
          average_rating: Number(
            newAverage.toFixed(1),
          ),
        };
      });
    } catch (requestError) {
      console.error(
        "Review submission failed:",
        requestError,
      );

      setReviewError(
        requestError.message ||
        "Unable to submit your review.",
      );
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="property-detail-state">
        <div className="property-detail-spinner" />

        <strong>
          Loading property...
        </strong>

        <span>
          Getting the latest property details.
        </span>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="property-detail-state">
        <div className="stay-state-icon">
          !
        </div>

        <h1>
          Property unavailable
        </h1>

        <p>
          {error ||
            "This property could not be found."}
        </p>

        <Link
          to="/stay"
          className="primary-button"
        >
          Back to Stay
        </Link>
      </div>
    );
  }

  return (
    <div className="property-detail-page">
      <div className="property-detail-container">
        <Link
          to="/stay"
          className="property-back-link"
        >
          ← Back to Stay
        </Link>

        {/* =================================================
            IMAGE GALLERY
        ================================================= */}

        <section className="property-gallery">
          <div className="property-main-image">
            <img
              src={currentImage}
              alt={property.title}
              onError={(event) => {
                if (event.currentTarget.src !== fallbackImage) {
                  event.currentTarget.src = fallbackImage;
                }
              }}
            />

            {images.length > 1 && (
              <div className="property-image-count">
                {selectedImage + 1} /{" "}
                {images.length}
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="property-thumbnail-row">
              {images.map(
                (image, index) => (
                  <button
                    type="button"
                    key={`${image}-${index}`}
                    className={`property-thumbnail ${selectedImage === index
                      ? "active"
                      : ""
                      }`}
                    onClick={() =>
                      setSelectedImage(index)
                    }
                  >
                    <img
                      src={getImageUrl(image, fallbackImage)}
                      alt={`${property.title} ${index + 1}`}
                      onError={(event) => {
                        if (event.currentTarget.src !== fallbackImage) {
                          event.currentTarget.src = fallbackImage;
                        }
                      }}
                    />
                  </button>
                ),
              )}
            </div>
          )}
        </section>

        {/* =================================================
            MAIN INFORMATION
        ================================================= */}

        <div className="property-detail-layout">
          <main className="property-detail-main">
            <div className="property-detail-heading">
              <div>
                <div className="property-detail-tags">
                  <span>
                    {property.property_type}
                  </span>

                  {property.furnishing && (
                    <span>
                      {property.furnishing}
                    </span>
                  )}

                  {property.available_for && (
                    <span>
                      {property.available_for}
                    </span>
                  )}
                </div>

                <h1>
                  {property.title}
                </h1>

                <p className="property-detail-address">
                  {property.address}
                </p>
              </div>

              <button
                type="button"
                className={`favorite-button ${isFavorite ? "active" : ""
                  }`}
                onClick={handleFavorite}
                disabled={isFavoriteLoading}
                aria-label={
                  isFavorite
                    ? "Remove from favorites"
                    : "Add to favorites"
                }
              >
                {isFavorite ? "♥" : "♡"}
              </button>
            </div>

            {/* Rating */}

            <div className="property-detail-rating">
              <span className="large-rating-star">
                ★
              </span>

              <strong>
                {property.average_rating > 0
                  ? Number(
                    property.average_rating,
                  ).toFixed(1)
                  : "New"}
              </strong>

              <span>
                {property.review_count > 0
                  ? `${property.review_count} review${property.review_count === 1
                    ? ""
                    : "s"
                  }`
                  : "No reviews yet"}
              </span>
            </div>

            <button type="button" className={`secondary-button compare-detail-button ${inCompare ? "is-active" : ""}`} onClick={handleCompare}>
              {inCompare ? "✓ Added to compare" : "Add to compare"}
            </button>

            {/* Description */}

            <section className="property-detail-section">
              <h2>
                About this place
              </h2>

              <p className="property-description">
                {property.description ||
                  "The owner has not added a description yet."}
              </p>
            </section>

            {/* Property facts */}

            <section className="property-detail-section">
              <h2>
                Property details
              </h2>

              <div className="property-facts">
                <div>
                  <span>
                    Property type
                  </span>

                  <strong>
                    {property.property_type}
                  </strong>
                </div>

                <div>
                  <span>
                    Suitable for
                  </span>

                  <strong>
                    {property.available_for ||
                      "Not specified"}
                  </strong>
                </div>

                <div>
                  <span>
                    Furnishing
                  </span>

                  <strong>
                    {property.furnishing ||
                      "Not specified"}
                  </strong>
                </div>

                <div>
                  <span>
                    Availability
                  </span>

                  <strong>
                    {property.is_available
                      ? "Available now"
                      : "Currently unavailable"}
                  </strong>
                </div>
              </div>
            </section>

            {/* Reviews */}

            <section className="property-detail-section">
              <div className="property-section-heading">
                <div>
                  <h2>
                    Reviews
                  </h2>

                  <p>
                    What people say about this
                    property.
                  </p>
                </div>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    if (!isAuthenticated) {
                      navigate("/login", {
                        state: {
                          from: `/stay/${propertyId}`,
                        },
                      });

                      return;
                    }

                    setShowReviewForm(
                      (current) => !current,
                    );
                  }}
                >
                  Write a review
                </button>
              </div>

              {showReviewForm && (
                <form
                  className="review-form"
                  onSubmit={handleReviewSubmit}
                >
                  <label>
                    Rating

                    <select
                      value={reviewRating}
                      onChange={(event) =>
                        setReviewRating(
                          Number(
                            event.target.value,
                          ),
                        )
                      }
                    >
                      <option value="5">
                        5 — Excellent
                      </option>

                      <option value="4">
                        4 — Good
                      </option>

                      <option value="3">
                        3 — Average
                      </option>

                      <option value="2">
                        2 — Poor
                      </option>

                      <option value="1">
                        1 — Very poor
                      </option>
                    </select>
                  </label>

                  <label>
                    Your review

                    <textarea
                      rows="4"
                      maxLength="2000"
                      placeholder="Share your experience..."
                      value={reviewText}
                      onChange={(event) =>
                        setReviewText(
                          event.target.value,
                        )
                      }
                    />
                  </label>

                  {reviewError && (
                    <p className="form-error">
                      {reviewError}
                    </p>
                  )}

                  <button
                    type="submit"
                    className="primary-button"
                    disabled={
                      isReviewSubmitting
                    }
                  >
                    {isReviewSubmitting
                      ? "Submitting..."
                      : "Submit review"}
                  </button>
                </form>
              )}

              {reviews.length === 0 ? (
                <div className="no-reviews">
                  <strong>
                    No reviews yet
                  </strong>

                  <span>
                    Be the first person to review
                    this property.
                  </span>
                </div>
              ) : (
                <div className="reviews-list">
                  {reviews.map((review) => (
                    <article
                      className="review-item"
                      key={review.id}
                    >
                      <div className="review-item-header">
                        <div className="review-user">
                          <span>
                            {review.user_id}
                          </span>
                        </div>

                        <div>
                          <div className="review-stars">
                            {"★".repeat(
                              review.rating,
                            )}
                            <span>
                              {"★".repeat(
                                5 -
                                review.rating,
                              )}
                            </span>
                          </div>

                          <time>
                            {new Date(
                              review.created_at,
                            ).toLocaleDateString(
                              "en-IN",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              },
                            )}
                          </time>
                        </div>
                      </div>

                      {review.review_text && (
                        <p>
                          {review.review_text}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </main>

          {/* =================================================
              SIDEBAR
          ================================================= */}

          <aside className="property-detail-sidebar">
            <div className="property-price-card">
              <div className="property-detail-price">
                <strong>
                  ₹
                  {Number(
                    property.monthly_rent,
                  ).toLocaleString("en-IN")}
                </strong>

                <span>
                  / month
                </span>
              </div>

              {property.security_deposit !=
                null && (
                  <p>
                    Security deposit: ₹
                    {Number(
                      property.security_deposit,
                    ).toLocaleString("en-IN")}
                  </p>
                )}

              <button
                type="button"
                className="secondary-button property-contact-button"
                onClick={handleContactOwner}
                disabled={isContactingOwner}
              >
                {isContactingOwner
                  ? "Opening chat..."
                  : "Contact owner"}
              </button>

              {contactError && (
                <p className="form-error">
                  {contactError}
                </p>
              )}

              <button
                type="button"
                className="primary-button property-visit-button"
                onClick={() => {
                  if (!isAuthenticated) {
                    navigate("/login", {
                      state: {
                        from: `/stay/${propertyId}`,
                      },
                    });

                    return;
                  }

                  setShowVisitForm(
                    (current) => !current,
                  );

                  setVisitSuccess("");
                  setVisitError("");
                }}
              >
                Request a visit
              </button>

              {showVisitForm && (
                <form
                  className="visit-form"
                  onSubmit={handleVisitSubmit}
                >
                  <label>
                    Preferred date & time

                    <input
                      type="datetime-local"
                      value={visitDate}
                      onChange={(event) =>
                        setVisitDate(
                          event.target.value,
                        )
                      }
                      required
                    />
                  </label>

                  <label>
                    Message

                    <textarea
                      rows="3"
                      maxLength="1000"
                      placeholder="Anything you'd like the owner to know?"
                      value={visitMessage}
                      onChange={(event) =>
                        setVisitMessage(
                          event.target.value,
                        )
                      }
                    />
                  </label>

                  {visitError && (
                    <p className="form-error">
                      {visitError}
                    </p>
                  )}

                  {visitSuccess && (
                    <p className="form-success">
                      {visitSuccess}
                    </p>
                  )}

                  <button
                    type="submit"
                    className="primary-button"
                    disabled={
                      isVisitSubmitting
                    }
                  >
                    {isVisitSubmitting
                      ? "Sending..."
                      : "Send request"}
                  </button>
                </form>
              )}

              {!showVisitForm &&
                visitSuccess && (
                  <p className="form-success">
                    {visitSuccess}
                  </p>
                )}
            </div>

            <div className="property-safety-card">
              <strong>
                CityNest safety tip
              </strong>

              <p>
                Visit the property before making
                any payment and verify the details
                with the owner.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default PropertyDetailPage;