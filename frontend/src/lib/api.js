const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

const ACCESS_TOKEN_KEY = "citynest_access_token";

/* =========================================================
   CORE API
========================================================= */

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token) {
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  }
}

export function clearAccessToken() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

function buildQueryString(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();

  return query ? `?${query}` : "";
}

async function parseResponse(response) {
  const contentType =
    response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

function getErrorMessage(data, response) {
  if (
    typeof data === "object" &&
    data?.detail
  ) {
    if (Array.isArray(data.detail)) {
      return data.detail
        .map((item) => {
          if (typeof item === "string") {
            return item;
          }

          return (
            item?.msg ||
            "Validation error."
          );
        })
        .join(", ");
    }

    return String(data.detail);
  }

  if (
    typeof data === "string" &&
    data.trim()
  ) {
    return data;
  }

  if (response.status === 401) {
    return "Your session has expired. Please log in again.";
  }

  if (response.status === 403) {
    return "You do not have permission to perform this action.";
  }

  if (response.status === 404) {
    return "The requested resource was not found.";
  }

  if (response.status === 409) {
    return "This action conflicts with existing data.";
  }

  if (response.status >= 500) {
    return "The server encountered an error. Please try again.";
  }

  return "Something went wrong with the API request.";
}

export async function apiRequest(
  endpoint,
  options = {},
) {
  const token = getAccessToken();

  const isFormData =
    options.body instanceof FormData;

  const headers = {
    ...(isFormData
      ? {}
      : {
          "Content-Type": "application/json",
        }),
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(
      `${API_BASE_URL}${endpoint}`,
      {
        ...options,
        headers,
      },
    );
  } catch (networkError) {
    const error = new Error(
      "Unable to connect to the CityNest backend. Make sure the FastAPI server is running.",
    );

    error.cause = networkError;

    throw error;
  }

  const data =
    await parseResponse(response);

  if (!response.ok) {
    const error = new Error(
      getErrorMessage(data, response),
    );

    error.status = response.status;
    error.data = data;

    throw error;
  }

  return data;
}

/* =========================================================
   AUTH
========================================================= */

export async function registerUser({
  full_name,
  email,
  password,
  phone,
}) {
  return apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      full_name: full_name.trim(),
      email: email.trim().toLowerCase(),
      password,
      ...(phone?.trim()
        ? { phone: phone.trim() }
        : {}),
    }),
  });
}

export async function loginUser(
  email,
  password,
) {
  const response = await apiRequest(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
      }),
    },
  );

  if (response?.access_token) {
    setAccessToken(
      response.access_token,
    );
  }

  return response;
}

export async function getCurrentUser() {
  return apiRequest("/auth/me");
}

export function logoutUser() {
  clearAccessToken();
}

/* =========================================================
   HEALTH
========================================================= */

export async function checkBackendHealth() {
  return apiRequest("/health");
}

/* =========================================================
   CITIES / LOCALITIES
========================================================= */

export async function getCities() {
  return apiRequest("/cities");
}

export async function getLocalities(
  cityId,
) {
  if (!cityId) {
    return [];
  }

  return apiRequest(
    `/cities/${cityId}/localities`,
  );
}

/* =========================================================
   PROPERTIES
========================================================= */

export async function getProperties(
  filters = {},
) {
  const query = buildQueryString({
    city_id: filters.city_id,
    locality_id: filters.locality_id,
    min_rent: filters.min_rent,
    max_rent: filters.max_rent,
    property_type: filters.property_type,
    available_for: filters.available_for,
    furnishing: filters.furnishing,
    min_rating: filters.min_rating,
    sort_by_rating:
      filters.sort_by_rating
        ? "true"
        : undefined,
    limit: filters.limit,
    offset: filters.offset,
  });

  return apiRequest(
    `/properties${query}`,
  );
}

export async function getProperty(
  propertyId,
) {
  return apiRequest(
    `/properties/${propertyId}`,
  );
}

export async function getPropertyReviews(
  propertyId,
) {
  return apiRequest(
    `/properties/${propertyId}/reviews`,
  );
}

/* =========================================================
   PROPERTY REVIEWS
========================================================= */

export async function createPropertyReview(
  propertyId,
  {
    rating,
    review_text,
  },
) {
  return apiRequest(
    `/properties/${propertyId}/reviews`,
    {
      method: "POST",
      body: JSON.stringify({
        rating,
        review_text:
          review_text?.trim() || undefined,
      }),
    },
  );
}

/* =========================================================
   FAVORITES
========================================================= */

export async function addPropertyFavorite(
  propertyId,
) {
  return apiRequest(
    `/favorites/property/${propertyId}`,
    {
      method: "POST",
    },
  );
}

export async function removePropertyFavorite(
  propertyId,
) {
  return apiRequest(
    `/favorites/property/${propertyId}`,
    {
      method: "DELETE",
    },
  );
}

/* =========================================================
   PROPERTY VISITS
========================================================= */

export async function createVisitRequest(
  propertyId,
  {
    requested_at,
    message,
  },
) {
  return apiRequest(
    `/properties/${propertyId}/visits`,
    {
      method: "POST",
      body: JSON.stringify({
        requested_at,
        message:
          message?.trim() || undefined,
      }),
    },
  );
}

/* =========================================================
   CONVERSATIONS
========================================================= */

export async function createConversation({
  property_id,
  food_place_id,
  marketplace_item_id,
}) {
  const targets = {
    property_id,
    food_place_id,
    marketplace_item_id,
  };

  const providedTargets =
    Object.values(targets).filter(
      (value) =>
        value !== undefined &&
        value !== null,
    );

  if (providedTargets.length !== 1) {
    throw new Error(
      "A conversation must be connected to exactly one listing.",
    );
  }

  return apiRequest(
    "/conversations",
    {
      method: "POST",
      body: JSON.stringify(
        targets,
      ),
    },
  );
}

export async function getConversations() {
  return apiRequest(
    "/conversations",
  );
}

export async function getConversationMessages(
  conversationId,
) {
  return apiRequest(
    `/conversations/${conversationId}/messages`,
  );
}

export async function sendConversationMessage(
  conversationId,
  messageText,
) {
  const text =
    messageText?.trim() || "";

  if (!text) {
    throw new Error(
      "Message cannot be empty.",
    );
  }

  return apiRequest(
    `/conversations/${conversationId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({
        message_text: text,
      }),
    },
  );
}

export async function markConversationMessageRead(
  conversationId,
  messageId,
) {
  return apiRequest(
    `/conversations/${conversationId}/messages/${messageId}/read`,
    {
      method: "PATCH",
    },
  );
}

/* =========================================================
   FOOD / MESS
========================================================= */

export async function getFoodPlaces(filters = {}) {
  const query = buildQueryString({
    city_id: filters.city_id,
    locality_id: filters.locality_id,
    search: filters.search,
    min_price: filters.min_price,
    max_price: filters.max_price,
    food_type: filters.food_type,
    min_rating: filters.min_rating,
    sort_by_rating: filters.sort_by_rating ? "true" : undefined,
    limit: filters.limit,
    offset: filters.offset,
  });

  return apiRequest(`/food${query}`);
}

export async function getFoodPlace(foodPlaceId) {
  return apiRequest(`/food/${foodPlaceId}`);
}

export async function getFoodMenu(foodPlaceId) {
  return apiRequest(`/food/${foodPlaceId}/menu`);
}

export async function getFoodReviews(foodPlaceId) {
  return apiRequest(`/food/${foodPlaceId}/reviews`);
}

export async function createFoodReview(foodPlaceId, { rating, review_text }) {
  return apiRequest(`/food/${foodPlaceId}/reviews`, {
    method: "POST",
    body: JSON.stringify({
      rating,
      review_text: review_text?.trim() || undefined,
    }),
  });
}

export async function addFoodFavorite(foodPlaceId) {
  return apiRequest(`/favorites/food/${foodPlaceId}`, {
    method: "POST",
  });
}

export async function removeFoodFavorite(foodPlaceId) {
  return apiRequest(`/favorites/food/${foodPlaceId}`, {
    method: "DELETE",
  });
}

export async function createFoodPlace(payload) {
  return apiRequest("/food", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateFoodPlace(foodPlaceId, payload) {
  return apiRequest(`/owner/food/${foodPlaceId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteFoodPlace(foodPlaceId) {
  return apiRequest(`/owner/food/${foodPlaceId}`, {
    method: "DELETE",
  });
}

export async function createFoodMenuItem(foodPlaceId, payload) {
  return apiRequest(`/food/${foodPlaceId}/menu`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateFoodMenuItem(menuItemId, payload) {
  return apiRequest(`/food/menu/${menuItemId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteFoodMenuItem(menuItemId) {
  return apiRequest(`/food/menu/${menuItemId}`, {
    method: "DELETE",
  });
}

/* =========================================================
   MARKETPLACE
========================================================= */

export async function getMarketplaceItems(filters = {}) {
  const query = buildQueryString({
    city_id: filters.city_id,
    locality_id: filters.locality_id,
    search: filters.search,
    category: filters.category,
    condition: filters.condition,
    min_price: filters.min_price,
    max_price: filters.max_price,
    limit: filters.limit,
    offset: filters.offset,
  });

  return apiRequest(`/marketplace${query}`);
}

export async function getMarketplaceItem(itemId) {
  return apiRequest(`/marketplace/${itemId}`);
}

export async function createMarketplaceItem(payload) {
  return apiRequest("/marketplace", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getMyMarketplaceItems() {
  return apiRequest("/owner/marketplace");
}

export async function updateMarketplaceItem(itemId, payload) {
  return apiRequest(`/owner/marketplace/${itemId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteMarketplaceItem(itemId) {
  return apiRequest(`/owner/marketplace/${itemId}`, {
    method: "DELETE",
  });
}

export async function addMarketplaceFavorite(itemId) {
  return apiRequest(`/favorites/marketplace/${itemId}`, {
    method: "POST",
  });
}

export async function removeMarketplaceFavorite(itemId) {
  return apiRequest(`/favorites/marketplace/${itemId}`, {
    method: "DELETE",
  });
}

/* =========================================================
   FAVORITES / DASHBOARD
========================================================= */

export async function getFavorites() {
  return apiRequest("/favorites");
}

export async function getMyVisitRequests() {
  return apiRequest("/visits/me");
}

export async function getOwnerVisitRequests() {
  return apiRequest("/owner/visit-requests");
}

export async function updateOwnerVisitRequest(visitId, status) {
  return apiRequest(`/owner/visit-requests/${visitId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function getNotifications() {
  return apiRequest("/notifications");
}

export async function markNotificationRead(notificationId) {
  return apiRequest(`/notifications/${notificationId}/read`, {
    method: "PATCH",
  });
}

export async function markAllNotificationsRead() {
  return apiRequest("/notifications/read-all", {
    method: "PATCH",
  });
}

export async function reportListing(payload) {
  return apiRequest("/reports", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/* =========================================================
   HELPERS
========================================================= */

export function getImageUrl(
  imageUrl,
  fallback = "",
) {
  if (typeof imageUrl === "string" && imageUrl.trim()) {
    const value = imageUrl.trim();
    if (value.startsWith("/")) return `${API_BASE_URL}${value}`;
    return value;
  }

  return fallback;
}

export {
  API_BASE_URL,
  ACCESS_TOKEN_KEY,
};
export async function getMyProperties() {
  return apiRequest("/owner/properties");
}

export async function getMyFoodPlaces() {
  return apiRequest("/owner/food");
}


export async function uploadPropertyImages(files) {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  return apiRequest("/property-image-uploads", {
    method: "POST",
    body: formData,
    isFormData: true,
  });
}

export async function createProperty(payload) {
  return apiRequest("/properties", { method: "POST", body: JSON.stringify(payload) });
}

export async function updateProperty(propertyId, payload) {
  return apiRequest(`/owner/properties/${propertyId}`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function deleteProperty(propertyId) {
  return apiRequest(`/owner/properties/${propertyId}`, { method: "DELETE" });
}

export async function createOwnerApplication(payload) {
  return apiRequest("/owner-applications", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getMyOwnerApplications() {
  return apiRequest("/owner-applications/me");
}

export async function getOwnerApplications() {
  return apiRequest("/admin/owner-applications");
}

export async function approveOwnerApplication(applicationId) {
  return apiRequest(`/admin/owner-applications/${applicationId}/approve`, { method: "PATCH" });
}

export async function rejectOwnerApplication(applicationId) {
  return apiRequest(`/admin/owner-applications/${applicationId}/reject`, { method: "PATCH" });
}


export async function generateListingCopy(listingType, draft, instruction = "") {
  return apiRequest("/ai/listing-assistant", {
    method: "POST",
    body: JSON.stringify({ listing_type: listingType, draft, instruction: instruction || undefined }),
  });
}

export async function getVerificationQueue() {
  return apiRequest("/admin/verification");
}

export async function setOwnerVerification(userId, verified) {
  return apiRequest(`/admin/users/${userId}/verification?verified=${verified ? "true" : "false"}`, {
    method: "PATCH",
  });
}
/* =========================================================
   ADMIN / MODERATION
========================================================= */

export async function getAdminReports() {
  return apiRequest("/admin/reports");
}

export async function updateAdminReport(reportId, status) {
  return apiRequest(`/admin/reports/${reportId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function getAdminProperties() {
  return apiRequest("/admin/properties");
}

export async function getAdminFoodPlaces() {
  return apiRequest("/admin/food");
}

export async function getAdminMarketplaceItems() {
  return apiRequest("/admin/marketplace");
}

export async function setAdminPropertyStatus(propertyId, isActive) {
  return apiRequest(`/admin/properties/${propertyId}/status?is_active=${isActive ? "true" : "false"}`, {
    method: "PATCH",
  });
}

export async function setAdminFoodStatus(foodPlaceId, isActive) {
  return apiRequest(`/admin/food/${foodPlaceId}/status?is_active=${isActive ? "true" : "false"}`, {
    method: "PATCH",
  });
}

export async function setAdminMarketplaceStatus(itemId, isActive) {
  return apiRequest(`/admin/marketplace/${itemId}/status?is_active=${isActive ? "true" : "false"}`, {
    method: "PATCH",
  });
}

