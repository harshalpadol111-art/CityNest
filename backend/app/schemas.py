from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# =========================================================
# AUTHENTICATION
# =========================================================

class UserRegister(BaseModel):
    full_name: str = Field(
        min_length=2,
        max_length=150,
    )
    email: EmailStr
    password: str = Field(
        min_length=8,
        max_length=128,
    )


class UserResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: int
    full_name: str
    email: EmailStr
    phone: str | None = None
    role: str
    is_active: bool
    owner_verified: bool = False


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(
        min_length=1,
        max_length=128,
    )


# =========================================================
# OWNER APPLICATIONS
# =========================================================

class OwnerApplicationCreate(BaseModel):
    applicant_type: str = Field(
        min_length=2,
        max_length=50,
    )
    description: str = Field(
        min_length=10,
        max_length=2000,
    )


class OwnerApplicationResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: int
    user_id: int
    applicant_type: str
    description: str
    status: str


# =========================================================
# PROPERTIES
# =========================================================

class PropertyCreate(BaseModel):
    city_id: int
    locality_id: int

    title: str = Field(
        min_length=5,
        max_length=200,
    )

    description: str = Field(
        min_length=10,
        max_length=5000,
    )

    property_type: str = Field(
        min_length=2,
        max_length=50,
    )

    address: str = Field(
        min_length=5,
        max_length=500,
    )

    monthly_rent: float = Field(
        gt=0
    )

    security_deposit: float | None = Field(
        default=None,
        ge=0,
    )

    available_for: str = Field(
        min_length=2,
        max_length=100,
    )

    furnishing: str = Field(
        min_length=2,
        max_length=50,
    )

    is_available: bool = True

    images: list[str] = Field(
        default_factory=list,
        max_length=10,
    )


class PropertyUpdate(BaseModel):
    city_id: int | None = None
    locality_id: int | None = None

    title: str | None = Field(
        default=None,
        min_length=5,
        max_length=200,
    )

    description: str | None = Field(
        default=None,
        min_length=10,
        max_length=5000,
    )

    property_type: str | None = Field(
        default=None,
        min_length=2,
        max_length=50,
    )

    address: str | None = Field(
        default=None,
        min_length=5,
        max_length=500,
    )

    monthly_rent: float | None = Field(
        default=None,
        gt=0,
    )

    security_deposit: float | None = Field(
        default=None,
        ge=0,
    )

    available_for: str | None = Field(
        default=None,
        min_length=2,
        max_length=100,
    )

    furnishing: str | None = Field(
        default=None,
        min_length=2,
        max_length=50,
    )

    is_available: bool | None = None

    images: list[str] | None = Field(
        default=None,
        max_length=10,
    )


class PropertyAvailabilityUpdate(BaseModel):
    is_available: bool


class PropertyCreateResponse(BaseModel):
    id: int
    owner_id: int
    city_id: int
    locality_id: int

    title: str
    description: str | None
    property_type: str
    address: str

    monthly_rent: float
    security_deposit: float | None

    available_for: str | None
    furnishing: str | None

    is_available: bool
    status: str
    images: list[str]

    average_rating: float = 0.0
    review_count: int = 0

    created_at: datetime | None = None


class PropertyReviewCreate(BaseModel):
    rating: int = Field(
        ge=1,
        le=5,
    )

    review_text: str | None = Field(
        default=None,
        max_length=2000,
    )


class PropertyReviewResponse(BaseModel):
    id: int
    property_id: int
    user_id: int
    rating: int
    review_text: str | None
    created_at: datetime


# =========================================================
# FOOD / MESS
# =========================================================

class FoodPlaceCreate(BaseModel):
    city_id: int
    locality_id: int

    name: str = Field(
        min_length=3,
        max_length=200,
    )

    description: str | None = Field(
        default=None,
        max_length=5000,
    )

    address: str = Field(
        min_length=5,
        max_length=500,
    )

    food_type: str | None = Field(
        default=None,
        max_length=30,
    )

    monthly_price: float | None = Field(
        default=None,
        gt=0,
    )

    daily_price: float | None = Field(
        default=None,
        gt=0,
    )

    contact_phone: str | None = Field(
        default=None,
        max_length=20,
    )


class FoodPlaceUpdate(BaseModel):
    city_id: int | None = None
    locality_id: int | None = None

    name: str | None = Field(
        default=None,
        min_length=3,
        max_length=200,
    )

    description: str | None = Field(
        default=None,
        max_length=5000,
    )

    address: str | None = Field(
        default=None,
        min_length=5,
        max_length=500,
    )

    food_type: str | None = Field(
        default=None,
        max_length=30,
    )

    monthly_price: float | None = Field(
        default=None,
        gt=0,
    )

    daily_price: float | None = Field(
        default=None,
        gt=0,
    )

    contact_phone: str | None = Field(
        default=None,
        max_length=20,
    )


class FoodPlaceResponse(BaseModel):
    id: int
    owner_id: int
    city_id: int
    locality_id: int

    name: str
    description: str | None
    address: str

    food_type: str | None
    monthly_price: float | None
    daily_price: float | None
    contact_phone: str | None

    status: str

    average_rating: float = 0.0
    review_count: int = 0

    created_at: datetime


class FoodMenuItemCreate(BaseModel):
    day_of_week: str | None = Field(
        default=None,
        max_length=20,
    )

    meal_type: str = Field(
        min_length=2,
        max_length=30,
    )

    menu_description: str = Field(
        min_length=2,
        max_length=2000,
    )

    price: float | None = Field(
        default=None,
        gt=0,
    )


class FoodMenuItemUpdate(BaseModel):
    day_of_week: str | None = Field(
        default=None,
        max_length=20,
    )

    meal_type: str | None = Field(
        default=None,
        min_length=2,
        max_length=30,
    )

    menu_description: str | None = Field(
        default=None,
        min_length=2,
        max_length=2000,
    )

    price: float | None = Field(
        default=None,
        gt=0,
    )


class FoodMenuItemResponse(BaseModel):
    id: int
    food_place_id: int
    day_of_week: str | None
    meal_type: str
    menu_description: str
    price: float | None


class FoodReviewCreate(BaseModel):
    rating: int = Field(
        ge=1,
        le=5,
    )

    review_text: str | None = Field(
        default=None,
        max_length=2000,
    )


class FoodReviewResponse(BaseModel):
    id: int
    food_place_id: int
    user_id: int
    rating: int
    review_text: str | None
    created_at: datetime


# =========================================================
# MARKETPLACE
# =========================================================

class MarketplaceItemCreate(BaseModel):
    city_id: int
    locality_id: int | None = None

    title: str = Field(
        min_length=3,
        max_length=200,
    )

    description: str | None = Field(
        default=None,
        max_length=5000,
    )

    category: str = Field(
        min_length=2,
        max_length=100,
    )

    price: float = Field(
        ge=0
    )

    condition: str = Field(
        min_length=2,
        max_length=30,
    )

    image_url: str | None = Field(
        default=None,
        max_length=2000,
    )


class MarketplaceItemUpdate(BaseModel):
    city_id: int | None = None
    locality_id: int | None = None

    title: str | None = Field(
        default=None,
        min_length=3,
        max_length=200,
    )

    description: str | None = Field(
        default=None,
        max_length=5000,
    )

    category: str | None = Field(
        default=None,
        min_length=2,
        max_length=100,
    )

    price: float | None = Field(
        default=None,
        ge=0,
    )

    condition: str | None = Field(
        default=None,
        min_length=2,
        max_length=30,
    )

    image_url: str | None = Field(
        default=None,
        max_length=2000,
    )


class MarketplaceItemResponse(BaseModel):
    id: int
    seller_id: int
    city_id: int
    locality_id: int | None

    title: str
    description: str | None
    category: str
    price: float
    condition: str
    image_url: str | None

    status: str
    created_at: datetime


# =========================================================
# FAVORITES
# =========================================================

class FavoriteResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: int
    user_id: int
    property_id: int | None
    food_place_id: int | None
    marketplace_item_id: int | None


# =========================================================
# VISIT REQUESTS
# =========================================================

class VisitRequestCreate(BaseModel):
    requested_at: datetime

    message: str | None = Field(
        default=None,
        max_length=2000,
    )


class VisitRequestStatusUpdate(BaseModel):
    status: str = Field(
        pattern="^(confirmed|declined|cancelled)$"
    )


class VisitRequestResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: int
    property_id: int
    user_id: int
    requested_at: datetime
    message: str | None
    status: str
    created_at: datetime
    property_title: str | None = None
    requester_name: str | None = None
    requester_email: EmailStr | None = None
    requester_phone: str | None = None


# =========================================================
# CONVERSATIONS / MESSAGES
# =========================================================

class ConversationCreate(BaseModel):
    property_id: int | None = None
    food_place_id: int | None = None
    marketplace_item_id: int | None = None


class ConversationResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: int
    user_id: int
    owner_id: int

    property_id: int | None
    food_place_id: int | None
    marketplace_item_id: int | None

    created_at: datetime


class ConversationSummaryResponse(ConversationResponse):
    other_party_name: str | None = None
    other_party_email: EmailStr | None = None
    other_party_phone: str | None = None
    listing_type: str
    listing_title: str
    last_message_text: str | None = None
    last_message_at: datetime | None = None
    unread_count: int = 0


class MessageCreate(BaseModel):
    message_text: str = Field(
        min_length=1,
        max_length=5000,
    )


class MessageResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: int
    conversation_id: int
    sender_id: int
    message_text: str
    sent_at: datetime
    is_read: bool


# =========================================================
# REPORTS
# =========================================================

class ListingReportCreate(BaseModel):
    listing_type: str = Field(
        pattern="^(property|food|marketplace)$"
    )

    listing_id: int = Field(
        gt=0
    )

    reason: str = Field(
        min_length=2,
        max_length=200,
    )

    description: str | None = Field(
        default=None,
        max_length=3000,
    )


class ListingReportStatusUpdate(BaseModel):
    status: str = Field(
        pattern="^(pending|reviewed|resolved|dismissed)$"
    )


class ListingReportResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: int
    reporter_id: int
    listing_type: str
    listing_id: int
    reason: str
    description: str | None
    status: str
    created_at: datetime


# =========================================================
# NOTIFICATIONS
# =========================================================

class NotificationResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: int
    user_id: int
    title: str
    message: str
    notification_type: str
    is_read: bool
    created_at: datetime


# =========================================================
# AI / DISCOVERY
# =========================================================

class AIListingAssistantRequest(BaseModel):
    listing_type: str = Field(pattern="^(property|food|marketplace)$")
    draft: dict
    instruction: str | None = Field(default=None, max_length=1000)


class AIListingAssistantResponse(BaseModel):
    title: str
    description: str
    highlights: list[str] = Field(default_factory=list, max_length=8)
    missing_details: list[str] = Field(default_factory=list, max_length=8)
    ai_powered: bool


