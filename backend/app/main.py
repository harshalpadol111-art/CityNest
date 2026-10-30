from collections.abc import Sequence
from datetime import datetime, timezone
import os
import uuid
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_admin, require_owner
from app.models import (
    City,
    Conversation,
    Favorite,
    FoodMenuItem,
    FoodPlace,
    FoodReview,
    ListingReport,
    Locality,
    MarketplaceItem,
    Message,
    Notification,
    OwnerApplication,
    Property,
    PropertyImage,
    PropertyReview,
    User,
    VisitRequest,
)
from app.schemas import (
    ConversationCreate,
    ConversationResponse,
    ConversationSummaryResponse,
    FavoriteResponse,
    FoodMenuItemCreate,
    FoodMenuItemResponse,
    FoodMenuItemUpdate,
    FoodPlaceCreate,
    FoodPlaceResponse,
    FoodPlaceUpdate,
    FoodReviewCreate,
    FoodReviewResponse,
    ListingReportCreate,
    ListingReportResponse,
    ListingReportStatusUpdate,
    LoginRequest,
    MarketplaceItemCreate,
    MarketplaceItemResponse,
    MarketplaceItemUpdate,
    MessageCreate,
    MessageResponse,
    NotificationResponse,
    OwnerApplicationCreate,
    OwnerApplicationResponse,
    PropertyAvailabilityUpdate,
    PropertyCreate,
    PropertyCreateResponse,
    PropertyReviewCreate,
    PropertyReviewResponse,
    PropertyUpdate,
    UserRegister,
    UserResponse,
    VisitRequestCreate,
    VisitRequestResponse,
    VisitRequestStatusUpdate,
)
from app.security import create_access_token, hash_password, verify_password
from app.routers.discovery import router as discovery_router


app = FastAPI(
    title="CityNest API",
    description="Backend API for the CityNest relocation platform",
    version="2.0.0",
)

UPLOAD_ROOT = Path(__file__).resolve().parents[1] / "uploads"
PROPERTY_UPLOAD_DIR = UPLOAD_ROOT / "properties"
PROPERTY_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_ROOT)), name="uploads")

load_dotenv()
_allowed_origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if origin.strip()]

app.include_router(discovery_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def utc_now():
    return datetime.now(timezone.utc)


def create_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    notification_type: str,
):
    db.add(
        Notification(
            user_id=user_id,
            title=title,
            message=message,
            notification_type=notification_type,
            is_read=False,
        )
    )


def validate_city_and_locality(
    db: Session,
    city_id: int,
    locality_id: int | None,
):
    city = db.scalar(
        select(City).where(
            City.id == city_id,
            City.is_active.is_(True),
        )
    )

    if city is None:
        raise HTTPException(
            status_code=404,
            detail="City not found or inactive.",
        )

    if locality_id is not None:
        locality = db.scalar(
            select(Locality).where(
                Locality.id == locality_id,
                Locality.city_id == city_id,
            )
        )

        if locality is None:
            raise HTTPException(
                status_code=404,
                detail="Locality not found for the selected city.",
            )


def property_rating_map(
    db: Session,
    property_ids: list[int],
):
    result = {
        property_id: {
            "average_rating": 0.0,
            "review_count": 0,
        }
        for property_id in property_ids
    }

    if not property_ids:
        return result

    rows = db.execute(
        select(
            PropertyReview.property_id,
            func.avg(PropertyReview.rating).label("average_rating"),
            func.count(PropertyReview.id).label("review_count"),
        )
        .where(PropertyReview.property_id.in_(property_ids))
        .group_by(PropertyReview.property_id)
    ).all()

    for row in rows:
        result[row.property_id] = {
            "average_rating": round(float(row.average_rating), 2),
            "review_count": int(row.review_count),
        }

    return result


def food_rating_map(
    db: Session,
    food_ids: list[int],
):
    result = {
        food_id: {
            "average_rating": 0.0,
            "review_count": 0,
        }
        for food_id in food_ids
    }

    if not food_ids:
        return result

    rows = db.execute(
        select(
            FoodReview.food_place_id,
            func.avg(FoodReview.rating).label("average_rating"),
            func.count(FoodReview.id).label("review_count"),
        )
        .where(FoodReview.food_place_id.in_(food_ids))
        .group_by(FoodReview.food_place_id)
    ).all()

    for row in rows:
        result[row.food_place_id] = {
            "average_rating": round(float(row.average_rating), 2),
            "review_count": int(row.review_count),
        }

    return result


def property_response(
    db: Session,
    property_item: Property,
):
    images = db.scalars(
        select(PropertyImage)
        .where(PropertyImage.property_id == property_item.id)
        .order_by(
            PropertyImage.sort_order,
            PropertyImage.id,
        )
    ).all()

    rating = property_rating_map(
        db,
        [property_item.id],
    )[property_item.id]
    owner = db.get(User, property_item.owner_id)
    locality = db.get(Locality, property_item.locality_id)

    return {
        "id": property_item.id,
        "owner_id": property_item.owner_id,
        "owner_verified": bool(owner and owner.owner_verified),
        "city_id": property_item.city_id,
        "locality_id": property_item.locality_id,
        "locality_name": locality.name if locality else None,
        "title": property_item.title,
        "description": property_item.description,
        "property_type": property_item.property_type,
        "address": property_item.address,
        "monthly_rent": float(property_item.monthly_rent),
        "security_deposit": (
            float(property_item.security_deposit)
            if property_item.security_deposit is not None
            else None
        ),
        "available_for": property_item.available_for,
        "furnishing": property_item.furnishing,
        "is_available": property_item.is_available,
        "status": property_item.status,
        "images": [
            image.image_url
            for image in images
        ],
        "average_rating": rating["average_rating"],
        "review_count": rating["review_count"],
        "created_at": property_item.created_at,
    }


def food_response(
    db: Session,
    food_place: FoodPlace,
):
    rating = food_rating_map(
        db,
        [food_place.id],
    )[food_place.id]
    owner = db.get(User, food_place.owner_id)
    locality = db.get(Locality, food_place.locality_id)

    return {
        "id": food_place.id,
        "owner_id": food_place.owner_id,
        "owner_verified": bool(owner and owner.owner_verified),
        "city_id": food_place.city_id,
        "locality_id": food_place.locality_id,
        "locality_name": locality.name if locality else None,
        "name": food_place.name,
        "description": food_place.description,
        "address": food_place.address,
        "food_type": food_place.food_type,
        "monthly_price": (
            float(food_place.monthly_price)
            if food_place.monthly_price is not None
            else None
        ),
        "daily_price": (
            float(food_place.daily_price)
            if food_place.daily_price is not None
            else None
        ),
        "contact_phone": food_place.contact_phone,
        "status": food_place.status,
        "average_rating": rating["average_rating"],
        "review_count": rating["review_count"],
        "created_at": food_place.created_at,
    }


def marketplace_response(db: Session, item: MarketplaceItem):
    owner = db.get(User, item.seller_id)
    locality = db.get(Locality, item.locality_id) if item.locality_id else None
    return {
        "id": item.id,
        "seller_id": item.seller_id,
        "owner_verified": bool(owner and owner.owner_verified),
        "city_id": item.city_id,
        "locality_id": item.locality_id,
        "locality_name": locality.name if locality else None,
        "title": item.title,
        "description": item.description,
        "category": item.category,
        "price": float(item.price),
        "condition": item.condition,
        "image_url": item.image_url,
        "status": item.status,
        "created_at": item.created_at,
    }


def property_response_many(db: Session, properties: Sequence[Property]):
    if not properties:
        return []

    property_ids = [item.id for item in properties]
    owner_ids = {item.owner_id for item in properties}
    locality_ids = {item.locality_id for item in properties if item.locality_id is not None}

    ratings = property_rating_map(db, property_ids)
    images = db.scalars(
        select(PropertyImage)
        .where(PropertyImage.property_id.in_(property_ids))
        .order_by(PropertyImage.property_id, PropertyImage.sort_order, PropertyImage.id)
    ).all()
    owners = {
        owner.id: owner
        for owner in db.scalars(select(User).where(User.id.in_(owner_ids))).all()
    }
    localities = {
        locality.id: locality.name
        for locality in db.scalars(select(Locality).where(Locality.id.in_(locality_ids))).all()
    }
    images_by_property = {property_id: [] for property_id in property_ids}
    for image in images:
        images_by_property.setdefault(image.property_id, []).append(image.image_url)

    return [
        {
            "id": item.id,
            "owner_id": item.owner_id,
            "owner_verified": bool(owners.get(item.owner_id) and owners[item.owner_id].owner_verified),
            "city_id": item.city_id,
            "locality_id": item.locality_id,
            "locality_name": localities.get(item.locality_id) if item.locality_id is not None else None,
            "title": item.title,
            "description": item.description,
            "property_type": item.property_type,
            "address": item.address,
            "monthly_rent": float(item.monthly_rent),
            "security_deposit": float(item.security_deposit) if item.security_deposit is not None else None,
            "available_for": item.available_for,
            "furnishing": item.furnishing,
            "is_available": item.is_available,
            "status": item.status,
            "images": images_by_property.get(item.id, []),
            "average_rating": ratings[item.id]["average_rating"],
            "review_count": ratings[item.id]["review_count"],
            "created_at": item.created_at,
        }
        for item in properties
    ]


def food_response_many(db: Session, food_places: Sequence[FoodPlace]):
    if not food_places:
        return []

    food_ids = [item.id for item in food_places]
    owner_ids = {item.owner_id for item in food_places}
    locality_ids = {item.locality_id for item in food_places if item.locality_id is not None}
    ratings = food_rating_map(db, food_ids)
    owners = {
        owner.id: owner
        for owner in db.scalars(select(User).where(User.id.in_(owner_ids))).all()
    }
    localities = {
        locality.id: locality.name
        for locality in db.scalars(select(Locality).where(Locality.id.in_(locality_ids))).all()
    }

    return [
        {
            "id": item.id,
            "owner_id": item.owner_id,
            "owner_verified": bool(owners.get(item.owner_id) and owners[item.owner_id].owner_verified),
            "city_id": item.city_id,
            "locality_id": item.locality_id,
            "locality_name": (
                localities.get(item.locality_id)
                if item.locality_id is not None
                else None
            ),
            "name": item.name,
            "description": item.description,
            "address": item.address,
            "food_type": item.food_type,
            "monthly_price": float(item.monthly_price) if item.monthly_price is not None else None,
            "daily_price": float(item.daily_price) if item.daily_price is not None else None,
            "contact_phone": item.contact_phone,
            "status": item.status,
            "average_rating": ratings[item.id]["average_rating"],
            "review_count": ratings[item.id]["review_count"],
            "created_at": item.created_at,
        }
        for item in food_places
    ]


def marketplace_response_many(db: Session, items: Sequence[MarketplaceItem]):
    if not items:
        return []

    owner_ids = {item.seller_id for item in items}
    locality_ids = {item.locality_id for item in items if item.locality_id is not None}
    owners = {
        owner.id: owner
        for owner in db.scalars(select(User).where(User.id.in_(owner_ids))).all()
    }
    localities = {
        locality.id: locality.name
        for locality in db.scalars(select(Locality).where(Locality.id.in_(locality_ids))).all()
    }

    return [
        {
            "id": item.id,
            "seller_id": item.seller_id,
            "owner_verified": bool(owners.get(item.seller_id) and owners[item.seller_id].owner_verified),
            "city_id": item.city_id,
            "locality_id": item.locality_id,
            "locality_name": (
                localities.get(item.locality_id)
                if item.locality_id is not None
                else None
            ),
            "title": item.title,
            "description": item.description,
            "category": item.category,
            "price": float(item.price),
            "condition": item.condition,
            "image_url": item.image_url,
            "status": item.status,
            "created_at": item.created_at,
        }
        for item in items
    ]




def conversation_summary_many(
    db: Session,
    conversations: Sequence[Conversation],
    current_user_id: int,
):
    if not conversations:
        return []

    user_ids = {
        conversation.user_id
        for conversation in conversations
    } | {
        conversation.owner_id
        for conversation in conversations
    }

    users = {
        user.id: user
        for user in db.scalars(
            select(User).where(User.id.in_(user_ids))
        ).all()
    }

    property_ids = {
        conversation.property_id
        for conversation in conversations
        if conversation.property_id is not None
    }
    food_ids = {
        conversation.food_place_id
        for conversation in conversations
        if conversation.food_place_id is not None
    }
    marketplace_ids = {
        conversation.marketplace_item_id
        for conversation in conversations
        if conversation.marketplace_item_id is not None
    }

    properties = {
        item.id: item.title
        for item in db.scalars(
            select(Property).where(Property.id.in_(property_ids))
        ).all()
    } if property_ids else {}
    foods = {
        item.id: item.name
        for item in db.scalars(
            select(FoodPlace).where(FoodPlace.id.in_(food_ids))
        ).all()
    } if food_ids else {}
    marketplace = {
        item.id: item.title
        for item in db.scalars(
            select(MarketplaceItem).where(MarketplaceItem.id.in_(marketplace_ids))
        ).all()
    } if marketplace_ids else {}

    conversation_ids = [conversation.id for conversation in conversations]
    messages = db.scalars(
        select(Message)
        .where(Message.conversation_id.in_(conversation_ids))
        .order_by(Message.sent_at.desc(), Message.id.desc())
    ).all()

    last_messages = {}
    unread_counts = {}
    for message in messages:
        last_messages.setdefault(message.conversation_id, message)
        if (
            message.sender_id != current_user_id
            and not message.is_read
        ):
            unread_counts[message.conversation_id] = (
                unread_counts.get(message.conversation_id, 0) + 1
            )

    result = []
    for conversation in conversations:
        other_id = (
            conversation.owner_id
            if conversation.user_id == current_user_id
            else conversation.user_id
        )
        other = users.get(other_id)

        if conversation.property_id is not None:
            listing_type = "property"
            listing_title = properties.get(
                conversation.property_id,
                f"Property #{conversation.property_id}",
            )
        elif conversation.food_place_id is not None:
            listing_type = "food"
            listing_title = foods.get(
                conversation.food_place_id,
                f"Food listing #{conversation.food_place_id}",
            )
        else:
            listing_type = "marketplace"
            marketplace_id = conversation.marketplace_item_id
            listing_title = (
                marketplace.get(marketplace_id, f"Marketplace item #{marketplace_id}")
                if marketplace_id is not None
                else "Marketplace item"
            )

        last_message = last_messages.get(conversation.id)
        result.append({
            "id": conversation.id,
            "user_id": conversation.user_id,
            "owner_id": conversation.owner_id,
            "property_id": conversation.property_id,
            "food_place_id": conversation.food_place_id,
            "marketplace_item_id": conversation.marketplace_item_id,
            "created_at": conversation.created_at,
            "other_party_name": other.full_name if other else None,
            "other_party_email": other.email if other else None,
            "other_party_phone": other.phone if other else None,
            "listing_type": listing_type,
            "listing_title": listing_title,
            "last_message_text": last_message.message_text if last_message else None,
            "last_message_at": last_message.sent_at if last_message else None,
            "unread_count": unread_counts.get(conversation.id, 0),
        })

    return result


def get_conversation_for_user(
    db: Session,
    conversation_id: int,
    user_id: int,
):
    conversation = db.get(
        Conversation,
        conversation_id,
    )

    if conversation is None:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found.",
        )

    if (
        conversation.user_id != user_id
        and conversation.owner_id != user_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this conversation.",
        )

    return conversation


# =========================================================
# ROOT / HEALTH
# =========================================================

@app.get("/")
def root():
    return {
        "message": "Welcome to CityNest API",
        "status": "running",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "CityNest Backend",
    }


# =========================================================
# AUTHENTICATION
# =========================================================

@app.post(
    "/auth/register",
    response_model=UserResponse,
    status_code=201,
)
def register_user(
    user_data: UserRegister,
    db: Session = Depends(get_db),
):
    normalized_email = user_data.email.strip().lower()

    existing_user = db.scalar(
        select(User).where(
            User.email == normalized_email
        )
    )

    if existing_user is not None:
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists.",
        )

    new_user = User(
        full_name=user_data.full_name.strip(),
        email=normalized_email,
        password_hash=hash_password(
            user_data.password
        ),
        role="user",
        is_active=True,
    )

    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
    except Exception:
        db.rollback()
        raise

    return new_user


@app.post("/auth/login")
def login_user(
    login_data: LoginRequest,
    db: Session = Depends(get_db),
):
    normalized_email = login_data.email.strip().lower()

    user = db.scalar(
        select(User).where(
            User.email == normalized_email
        )
    )

    if user is None or not verify_password(
        login_data.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Your account is inactive.",
        )

    access_token = create_access_token(
        user_id=user.id,
        role=user.role,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


@app.get(
    "/auth/me",
    response_model=UserResponse,
)
def get_me(
    current_user: User = Depends(get_current_user),
):
    return current_user


# =========================================================
# OWNER APPLICATIONS
# =========================================================

@app.post(
    "/owner-applications",
    response_model=OwnerApplicationResponse,
    status_code=201,
)
def create_owner_application(
    application_data: OwnerApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role == "owner":
        raise HTTPException(
            status_code=409,
            detail="You are already an owner.",
        )

    existing_application = db.scalar(
        select(OwnerApplication).where(
            OwnerApplication.user_id == current_user.id,
            OwnerApplication.status == "pending",
        )
    )

    if existing_application is not None:
        raise HTTPException(
            status_code=409,
            detail="You already have a pending owner application.",
        )

    application = OwnerApplication(
        user_id=current_user.id,
        applicant_type=application_data.applicant_type.strip(),
        description=application_data.description.strip(),
        status="pending",
    )

    db.add(application)
    db.commit()
    db.refresh(application)

    return application


@app.get(
    "/owner-applications/me",
    response_model=list[OwnerApplicationResponse],
)
def get_my_owner_applications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    statement = (
        select(OwnerApplication)
        .where(
            OwnerApplication.user_id
            == current_user.id
        )
        .order_by(
            OwnerApplication.created_at.desc()
        )
    )

    return db.scalars(statement).all()


@app.get("/admin/owner-applications", response_model=list[OwnerApplicationResponse])
def admin_owner_applications(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return db.scalars(
        select(OwnerApplication).order_by(OwnerApplication.created_at.desc())
    ).all()


@app.patch(
    "/admin/owner-applications/{application_id}/approve",
    response_model=OwnerApplicationResponse,
)
def approve_owner_application(
    application_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    application = db.scalar(
        select(OwnerApplication).where(
            OwnerApplication.id == application_id
        )
    )

    if application is None:
        raise HTTPException(
            status_code=404,
            detail="Owner application not found.",
        )

    if application.status != "pending":
        raise HTTPException(
            status_code=409,
            detail=f"Application is already {application.status}.",
        )

    applicant = db.scalar(
        select(User).where(
            User.id == application.user_id
        )
    )

    if applicant is None:
        raise HTTPException(
            status_code=404,
            detail="Applicant user not found.",
        )

    application.status = "approved"
    application.reviewed_by = admin_user.id
    application.reviewed_at = utc_now()

    applicant.role = "owner"

    create_notification(
        db,
        applicant.id,
        "Owner application approved",
        "Your CityNest owner application has been approved.",
        "owner_application",
    )

    db.commit()
    db.refresh(application)

    return application


@app.patch(
    "/admin/owner-applications/{application_id}/reject",
    response_model=OwnerApplicationResponse,
)
def reject_owner_application(
    application_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    application = db.scalar(
        select(OwnerApplication).where(
            OwnerApplication.id == application_id
        )
    )

    if application is None:
        raise HTTPException(
            status_code=404,
            detail="Owner application not found.",
        )

    if application.status != "pending":
        raise HTTPException(
            status_code=409,
            detail=f"Application is already {application.status}.",
        )

    application.status = "rejected"
    application.reviewed_by = admin_user.id
    application.reviewed_at = utc_now()

    create_notification(
        db,
        application.user_id,
        "Owner application rejected",
        "Your CityNest owner application was rejected.",
        "owner_application",
    )

    db.commit()
    db.refresh(application)

    return application


# =========================================================
# CITIES / LOCALITIES
# =========================================================

@app.get("/cities")
def get_cities(
    db: Session = Depends(get_db),
):
    statement = (
        select(City)
        .where(City.is_active.is_(True))
        .order_by(City.name)
    )

    cities = db.scalars(statement).all()

    return [
        {
            "id": city.id,
            "name": city.name,
            "state": city.state,
            "country": city.country,
        }
        for city in cities
    ]


@app.get("/cities/{city_id}/localities")
def get_localities(
    city_id: int,
    db: Session = Depends(get_db),
):
    city = db.scalar(
        select(City).where(
            City.id == city_id,
            City.is_active.is_(True),
        )
    )

    if city is None:
        raise HTTPException(
            status_code=404,
            detail="City not found or inactive.",
        )

    localities = db.scalars(
        select(Locality)
        .where(Locality.city_id == city_id)
        .order_by(Locality.name)
    ).all()

    return [
        {
            "id": locality.id,
            "name": locality.name,
            "pincode": locality.pincode,
            "city_id": locality.city_id,
        }
        for locality in localities
    ]


# =========================================================
# IMAGE UPLOADS
# =========================================================

@app.post("/property-image-uploads")
async def upload_property_images(
    files: list[UploadFile] = File(...),
    current_owner: User = Depends(require_owner),
):
    if not files:
        raise HTTPException(status_code=400, detail="Please select at least one image.")
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="You can upload up to 10 images.")

    allowed = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    max_size = 8 * 1024 * 1024
    urls = []
    for upload in files:
        if upload.content_type not in allowed:
            raise HTTPException(status_code=400, detail=f"Unsupported image type: {upload.filename}")
        data = await upload.read()
        if len(data) > max_size:
            raise HTTPException(status_code=400, detail=f"{upload.filename} is larger than 8 MB.")
        suffix = Path(upload.filename or "image.jpg").suffix.lower() or ".jpg"
        filename = f"{uuid.uuid4().hex}{suffix}"
        destination = PROPERTY_UPLOAD_DIR / filename
        destination.write_bytes(data)
        urls.append(f"/uploads/properties/{filename}")
    return {"urls": urls}


# =========================================================
# PROPERTIES
# =========================================================

@app.post(
    "/properties",
    response_model=PropertyCreateResponse,
    status_code=201,
)
def create_property(
    property_data: PropertyCreate,
    current_owner: User = Depends(require_owner),
    db: Session = Depends(get_db),
):
    validate_city_and_locality(
        db,
        property_data.city_id,
        property_data.locality_id,
    )

    new_property = Property(
        owner_id=current_owner.id,
        city_id=property_data.city_id,
        locality_id=property_data.locality_id,
        title=property_data.title.strip(),
        description=property_data.description.strip(),
        property_type=property_data.property_type.strip(),
        address=property_data.address.strip(),
        monthly_rent=property_data.monthly_rent,
        security_deposit=property_data.security_deposit,
        available_for=property_data.available_for.strip(),
        furnishing=property_data.furnishing.strip(),
        is_available=property_data.is_available,
        status="active",
    )

    db.add(new_property)
    db.flush()

    for index, image_url in enumerate(
        property_data.images
    ):
        image_url = image_url.strip()

        if image_url:
            db.add(
                PropertyImage(
                    property_id=new_property.id,
                    image_url=image_url,
                    sort_order=index,
                )
            )

    db.commit()
    db.commit()
    db.refresh(new_property)

    return property_response(
        db,
        new_property,
    )


@app.get("/properties")
def get_properties(
    city_id: int | None = None,
    locality_id: int | None = None,
    min_rent: float | None = Query(
        default=None,
        ge=0,
    ),
    max_rent: float | None = Query(
        default=None,
        ge=0,
    ),
    property_type: str | None = None,
    available_for: str | None = None,
    furnishing: str | None = None,
    min_rating: float | None = Query(
        default=None,
        ge=0,
        le=5,
    ),
    sort_by_rating: bool = False,
    limit: int = Query(
        default=20,
        ge=1,
        le=100,
    ),
    offset: int = Query(
        default=0,
        ge=0,
    ),
    db: Session = Depends(get_db),
):
    if (
        min_rent is not None
        and max_rent is not None
        and min_rent > max_rent
    ):
        raise HTTPException(
            status_code=422,
            detail="min_rent cannot be greater than max_rent.",
        )

    statement = select(Property).where(
        Property.status == "active",
        Property.is_available.is_(True),
    )

    if city_id is not None:
        statement = statement.where(
            Property.city_id == city_id
        )

    if locality_id is not None:
        statement = statement.where(
            Property.locality_id == locality_id
        )

    if min_rent is not None:
        statement = statement.where(
            Property.monthly_rent >= min_rent
        )

    if max_rent is not None:
        statement = statement.where(
            Property.monthly_rent <= max_rent
        )

    if property_type:
        statement = statement.where(
            Property.property_type.ilike(
                property_type.strip()
            )
        )

    if available_for:
        statement = statement.where(
            Property.available_for.ilike(
                available_for.strip()
            )
        )

    if furnishing:
        statement = statement.where(
            Property.furnishing.ilike(
                furnishing.strip()
            )
        )

    average_rating_subquery = (
        select(func.avg(PropertyReview.rating))
        .where(
            PropertyReview.property_id
            == Property.id
        )
        .correlate(Property)
        .scalar_subquery()
    )

    if min_rating is not None:
        statement = statement.where(
            func.coalesce(
                average_rating_subquery,
                0,
            )
            >= min_rating
        )

    if sort_by_rating:
        statement = statement.order_by(
            func.coalesce(
                average_rating_subquery,
                0,
            ).desc(),
            Property.created_at.desc(),
            Property.id.desc(),
        )
    else:
        statement = statement.order_by(
            Property.created_at.desc(),
            Property.id.desc(),
        )

    properties = db.scalars(
        statement
        .offset(offset)
        .limit(limit)
    ).all()

    return property_response_many(db, properties)


@app.get("/properties/{property_id}")
def get_property(
    property_id: int,
    db: Session = Depends(get_db),
):
    property_item = db.scalar(
        select(Property).where(
            Property.id == property_id,
            Property.status == "active",
        )
    )

    if property_item is None:
        raise HTTPException(
            status_code=404,
            detail="Property not found.",
        )

    return property_response(
        db,
        property_item,
    )


@app.get("/owner/properties")
def get_my_properties(
    current_owner: User = Depends(require_owner),
    db: Session = Depends(get_db),
):
    statement = (
        select(Property)
        .where(
            Property.owner_id
            == current_owner.id
        )
        .order_by(
            Property.created_at.desc(),
            Property.id.desc(),
        )
    )

    properties = db.scalars(statement).all()

    return [
        property_response(
            db,
            property_item,
        )
        for property_item in properties
    ]


@app.put("/owner/properties/{property_id}")
def update_my_property(
    property_id: int,
    property_data: PropertyUpdate,
    current_owner: User = Depends(require_owner),
    db: Session = Depends(get_db),
):
    property_item = db.scalar(
        select(Property).where(
            Property.id == property_id,
            Property.owner_id == current_owner.id,
        )
    )

    if property_item is None:
        raise HTTPException(
            status_code=404,
            detail="Property not found.",
        )

    final_city_id = (
        property_data.city_id
        if property_data.city_id is not None
        else property_item.city_id
    )

    final_locality_id = (
        property_data.locality_id
        if property_data.locality_id is not None
        else property_item.locality_id
    )

    validate_city_and_locality(
        db,
        final_city_id,
        final_locality_id,
    )

    update_data = property_data.model_dump(
        exclude_unset=True,
        exclude_none=True,
    )

    images = update_data.pop(
        "images",
        None,
    )

    for field, value in update_data.items():
        if isinstance(value, str):
            value = value.strip()

        setattr(
            property_item,
            field,
            value,
        )

    if images is not None:
        old_images = db.scalars(
            select(PropertyImage).where(
                PropertyImage.property_id
                == property_item.id
            )
        ).all()

        for image in old_images:
            db.delete(image)

        for index, image_url in enumerate(images):
            image_url = image_url.strip()

            if image_url:
                db.add(
                    PropertyImage(
                        property_id=property_item.id,
                        image_url=image_url,
                        sort_order=index,
                    )
                )

    db.commit()
    db.refresh(property_item)

    return property_response(
        db,
        property_item,
    )


@app.delete("/owner/properties/{property_id}")
def delete_my_property(
    property_id: int,
    current_owner: User = Depends(require_owner),
    db: Session = Depends(get_db),
):
    property_item = db.scalar(
        select(Property).where(
            Property.id == property_id,
            Property.owner_id == current_owner.id,
        )
    )

    if property_item is None:
        raise HTTPException(
            status_code=404,
            detail="Property not found.",
        )

    property_item.is_available = False
    property_item.status = "inactive"

    db.commit()

    return {
        "message": "Property removed successfully.",
        "property_id": property_item.id,
        "status": property_item.status,
    }


@app.patch(
    "/owner/properties/{property_id}/availability"
)
def update_property_availability(
    property_id: int,
    availability_data: PropertyAvailabilityUpdate,
    current_owner: User = Depends(require_owner),
    db: Session = Depends(get_db),
):
    property_item = db.scalar(
        select(Property).where(
            Property.id == property_id,
            Property.owner_id == current_owner.id,
        )
    )

    if property_item is None:
        raise HTTPException(
            status_code=404,
            detail="Property not found.",
        )

    property_item.is_available = (
        availability_data.is_available
    )

    property_item.status = (
        "active"
        if availability_data.is_available
        else "inactive"
    )

    db.commit()
    db.refresh(property_item)

    return {
        "property_id": property_item.id,
        "is_available": property_item.is_available,
        "status": property_item.status,
    }


# =========================================================
# PROPERTY REVIEWS
# =========================================================

@app.post(
    "/properties/{property_id}/reviews",
    response_model=PropertyReviewResponse,
    status_code=201,
)
def create_property_review(
    property_id: int,
    review_data: PropertyReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    property_item = db.scalar(
        select(Property).where(
            Property.id == property_id,
            Property.status == "active",
        )
    )

    if property_item is None:
        raise HTTPException(
            status_code=404,
            detail="Property not found.",
        )

    existing_review = db.scalar(
        select(PropertyReview).where(
            PropertyReview.property_id
            == property_id,
            PropertyReview.user_id
            == current_user.id,
        )
    )

    if existing_review is not None:
        raise HTTPException(
            status_code=409,
            detail="You have already reviewed this property.",
        )

    review = PropertyReview(
        property_id=property_id,
        user_id=current_user.id,
        rating=review_data.rating,
        comment=(
            review_data.review_text.strip()
            if review_data.review_text
            else None
        ),
    )

    db.add(review)
    db.commit()
    db.refresh(review)

    return {
        "id": review.id,
        "property_id": review.property_id,
        "user_id": review.user_id,
        "rating": review.rating,
        "review_text": review.comment,
        "created_at": review.created_at,
    }


@app.get(
    "/properties/{property_id}/reviews",
    response_model=list[PropertyReviewResponse],
)
def get_property_reviews(
    property_id: int,
    db: Session = Depends(get_db),
):
    property_item = db.scalar(
        select(Property).where(
            Property.id == property_id,
            Property.status == "active",
        )
    )

    if property_item is None:
        raise HTTPException(
            status_code=404,
            detail="Property not found.",
        )

    reviews = db.scalars(
        select(PropertyReview)
        .where(
            PropertyReview.property_id
            == property_id
        )
        .order_by(
            PropertyReview.created_at.desc()
        )
    ).all()

    return [
        {
            "id": review.id,
            "property_id": review.property_id,
            "user_id": review.user_id,
            "rating": review.rating,
            "review_text": review.comment,
            "created_at": review.created_at,
        }
        for review in reviews
    ]


# =========================================================
# FOOD / MESS
# =========================================================

@app.post(
    "/food",
    response_model=FoodPlaceResponse,
    status_code=201,
)
def create_food_place(
    food_data: FoodPlaceCreate,
    current_owner: User = Depends(require_owner),
    db: Session = Depends(get_db),
):
    validate_city_and_locality(
        db,
        food_data.city_id,
        food_data.locality_id,
    )

    food_place = FoodPlace(
        owner_id=current_owner.id,
        city_id=food_data.city_id,
        locality_id=food_data.locality_id,
        name=food_data.name.strip(),
        description=(
            food_data.description.strip()
            if food_data.description
            else None
        ),
        address=food_data.address.strip(),
        food_type=(
            food_data.food_type.strip()
            if food_data.food_type
            else None
        ),
        monthly_price=food_data.monthly_price,
        daily_price=food_data.daily_price,
        contact_phone=(
            food_data.contact_phone.strip()
            if food_data.contact_phone
            else None
        ),
        status="active",
    )

    db.add(food_place)
    db.commit()
    db.commit()
    db.refresh(food_place)

    return food_response(
        db,
        food_place,
    )


@app.get("/food")
def get_food_places(
    city_id: int | None = None,
    locality_id: int | None = None,
    search: str | None = None,
    min_price: float | None = Query(
        default=None,
        ge=0,
    ),
    max_price: float | None = Query(
        default=None,
        ge=0,
    ),
    food_type: str | None = None,
    min_rating: float | None = Query(
        default=None,
        ge=0,
        le=5,
    ),
    sort_by_rating: bool = False,
    limit: int = Query(
        default=20,
        ge=1,
        le=100,
    ),
    offset: int = Query(
        default=0,
        ge=0,
    ),
    db: Session = Depends(get_db),
):
    if (
        min_price is not None
        and max_price is not None
        and min_price > max_price
    ):
        raise HTTPException(
            status_code=422,
            detail="min_price cannot be greater than max_price.",
        )

    statement = select(FoodPlace).where(
        FoodPlace.status == "active"
    )

    if city_id is not None:
        statement = statement.where(
            FoodPlace.city_id == city_id
        )

    if locality_id is not None:
        statement = statement.where(
            FoodPlace.locality_id == locality_id
        )

    if search and search.strip():
        search_term = f"%{search.strip()}%"
        statement = statement.where(
            or_(
                FoodPlace.name.ilike(search_term),
                FoodPlace.description.ilike(search_term),
                FoodPlace.address.ilike(search_term),
                FoodPlace.food_type.ilike(search_term),
            )
        )

    if min_price is not None:
        statement = statement.where(
            func.coalesce(
                FoodPlace.monthly_price,
                FoodPlace.daily_price,
            )
            >= min_price
        )

    if max_price is not None:
        statement = statement.where(
            func.coalesce(
                FoodPlace.monthly_price,
                FoodPlace.daily_price,
            )
            <= max_price
        )

    if food_type:
        statement = statement.where(
            FoodPlace.food_type.ilike(
                food_type.strip()
            )
        )

    average_rating_subquery = (
        select(func.avg(FoodReview.rating))
        .where(
            FoodReview.food_place_id
            == FoodPlace.id
        )
        .correlate(FoodPlace)
        .scalar_subquery()
    )

    if min_rating is not None:
        statement = statement.where(
            func.coalesce(
                average_rating_subquery,
                0,
            )
            >= min_rating
        )

    if sort_by_rating:
        statement = statement.order_by(
            func.coalesce(
                average_rating_subquery,
                0,
            ).desc(),
            FoodPlace.created_at.desc(),
            FoodPlace.id.desc(),
        )
    else:
        statement = statement.order_by(
            FoodPlace.created_at.desc(),
            FoodPlace.id.desc(),
        )

    food_places = db.scalars(
        statement
        .offset(offset)
        .limit(limit)
    ).all()

    return food_response_many(db, food_places)


@app.get(
    "/food/{food_place_id}",
    response_model=FoodPlaceResponse,
)
def get_food_place(
    food_place_id: int,
    db: Session = Depends(get_db),
):
    food_place = db.scalar(
        select(FoodPlace).where(
            FoodPlace.id == food_place_id,
            FoodPlace.status == "active",
        )
    )

    if food_place is None:
        raise HTTPException(
            status_code=404,
            detail="Food place not found.",
        )

    return food_response(
        db,
        food_place,
    )


@app.get("/owner/food")
def get_my_food(
    current_owner: User = Depends(require_owner),
    db: Session = Depends(get_db),
):
    food_places = db.scalars(
        select(FoodPlace)
        .where(
            FoodPlace.owner_id
            == current_owner.id
        )
        .order_by(
            FoodPlace.created_at.desc()
        )
    ).all()

    return [
        food_response(
            db,
            food_place,
        )
        for food_place in food_places
    ]


@app.put(
    "/owner/food/{food_place_id}",
    response_model=FoodPlaceResponse,
)
def update_food_place(
    food_place_id: int,
    food_data: FoodPlaceUpdate,
    current_owner: User = Depends(require_owner),
    db: Session = Depends(get_db),
):
    food_place = db.scalar(
        select(FoodPlace).where(
            FoodPlace.id == food_place_id,
            FoodPlace.owner_id == current_owner.id,
        )
    )

    if food_place is None:
        raise HTTPException(
            status_code=404,
            detail="Food place not found.",
        )

    update_data = food_data.model_dump(
        exclude_unset=True,
        exclude_none=True,
    )

    final_city_id = update_data.get(
        "city_id",
        food_place.city_id,
    )

    final_locality_id = update_data.get(
        "locality_id",
        food_place.locality_id,
    )

    validate_city_and_locality(
        db,
        final_city_id,
        final_locality_id,
    )

    for field, value in update_data.items():
        if isinstance(value, str):
            value = value.strip()

        setattr(
            food_place,
            field,
            value,
        )

    db.commit()
    db.refresh(food_place)

    return food_response(
        db,
        food_place,
    )


@app.delete("/owner/food/{food_place_id}")
def delete_food_place(
    food_place_id: int,
    current_owner: User = Depends(require_owner),
    db: Session = Depends(get_db),
):
    food_place = db.scalar(
        select(FoodPlace).where(
            FoodPlace.id == food_place_id,
            FoodPlace.owner_id == current_owner.id,
        )
    )

    if food_place is None:
        raise HTTPException(
            status_code=404,
            detail="Food place not found.",
        )

    food_place.status = "inactive"

    db.commit()

    return {
        "message": "Food listing removed successfully.",
        "food_place_id": food_place.id,
        "status": food_place.status,
    }


@app.post(
    "/food/{food_place_id}/menu",
    response_model=FoodMenuItemResponse,
    status_code=201,
)
def create_food_menu_item(
    food_place_id: int,
    menu_data: FoodMenuItemCreate,
    current_owner: User = Depends(require_owner),
    db: Session = Depends(get_db),
):
    food_place = db.scalar(
        select(FoodPlace).where(
            FoodPlace.id == food_place_id,
            FoodPlace.owner_id == current_owner.id,
        )
    )

    if food_place is None:
        raise HTTPException(
            status_code=404,
            detail="Food place not found.",
        )

    menu_item = FoodMenuItem(
        food_place_id=food_place_id,
        day_of_week=(
            menu_data.day_of_week.strip()
            if menu_data.day_of_week
            else None
        ),
        meal_type=menu_data.meal_type.strip(),
        menu_description=menu_data.menu_description.strip(),
        price=menu_data.price,
    )

    db.add(menu_item)
    db.commit()
    db.refresh(menu_item)

    return menu_item


@app.get(
    "/food/{food_place_id}/menu",
    response_model=list[FoodMenuItemResponse],
)
def get_food_menu(
    food_place_id: int,
    db: Session = Depends(get_db),
):
    food_place = db.scalar(
        select(FoodPlace).where(
            FoodPlace.id == food_place_id,
            FoodPlace.status == "active",
        )
    )

    if food_place is None:
        raise HTTPException(
            status_code=404,
            detail="Food place not found.",
        )

    return db.scalars(
        select(FoodMenuItem)
        .where(
            FoodMenuItem.food_place_id
            == food_place_id
        )
        .order_by(FoodMenuItem.id)
    ).all()


@app.put(
    "/food/menu/{menu_item_id}",
    response_model=FoodMenuItemResponse,
)
def update_food_menu_item(
    menu_item_id: int,
    menu_data: FoodMenuItemUpdate,
    current_owner: User = Depends(require_owner),
    db: Session = Depends(get_db),
):
    menu_item = db.get(
        FoodMenuItem,
        menu_item_id,
    )

    if menu_item is None:
        raise HTTPException(
            status_code=404,
            detail="Menu item not found.",
        )

    food_place = db.scalar(
        select(FoodPlace).where(
            FoodPlace.id == menu_item.food_place_id,
            FoodPlace.owner_id == current_owner.id,
        )
    )

    if food_place is None:
        raise HTTPException(
            status_code=403,
            detail="You do not own this food listing.",
        )

    update_data = menu_data.model_dump(
        exclude_unset=True,
        exclude_none=True,
    )

    for field, value in update_data.items():
        if isinstance(value, str):
            value = value.strip()

        setattr(
            menu_item,
            field,
            value,
        )

    db.commit()
    db.refresh(menu_item)

    return menu_item


@app.delete("/food/menu/{menu_item_id}")
def delete_food_menu_item(
    menu_item_id: int,
    current_owner: User = Depends(require_owner),
    db: Session = Depends(get_db),
):
    menu_item = db.get(
        FoodMenuItem,
        menu_item_id,
    )

    if menu_item is None:
        raise HTTPException(
            status_code=404,
            detail="Menu item not found.",
        )

    food_place = db.scalar(
        select(FoodPlace).where(
            FoodPlace.id == menu_item.food_place_id,
            FoodPlace.owner_id == current_owner.id,
        )
    )

    if food_place is None:
        raise HTTPException(
            status_code=403,
            detail="You do not own this food listing.",
        )

    db.delete(menu_item)
    db.commit()

    return {
        "message": "Menu item deleted successfully.",
        "menu_item_id": menu_item_id,
    }


@app.post(
    "/food/{food_place_id}/reviews",
    response_model=FoodReviewResponse,
    status_code=201,
)
def create_food_review(
    food_place_id: int,
    review_data: FoodReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    food_place = db.scalar(
        select(FoodPlace).where(
            FoodPlace.id == food_place_id,
            FoodPlace.status == "active",
        )
    )

    if food_place is None:
        raise HTTPException(
            status_code=404,
            detail="Food place not found.",
        )

    existing_review = db.scalar(
        select(FoodReview).where(
            FoodReview.food_place_id
            == food_place_id,
            FoodReview.user_id
            == current_user.id,
        )
    )

    if existing_review is not None:
        raise HTTPException(
            status_code=409,
            detail="You have already reviewed this food place.",
        )

    review = FoodReview(
        food_place_id=food_place_id,
        user_id=current_user.id,
        rating=review_data.rating,
        comment=(
            review_data.review_text.strip()
            if review_data.review_text
            else None
        ),
    )

    db.add(review)
    db.commit()
    db.refresh(review)

    return {
        "id": review.id,
        "food_place_id": review.food_place_id,
        "user_id": review.user_id,
        "rating": review.rating,
        "review_text": review.comment,
        "created_at": review.created_at,
    }


@app.get(
    "/food/{food_place_id}/reviews",
    response_model=list[FoodReviewResponse],
)
def get_food_reviews(
    food_place_id: int,
    db: Session = Depends(get_db),
):
    food_place = db.scalar(
        select(FoodPlace).where(
            FoodPlace.id == food_place_id,
            FoodPlace.status == "active",
        )
    )

    if food_place is None:
        raise HTTPException(
            status_code=404,
            detail="Food place not found.",
        )

    reviews = db.scalars(
        select(FoodReview)
        .where(
            FoodReview.food_place_id
            == food_place_id
        )
        .order_by(
            FoodReview.created_at.desc()
        )
    ).all()

    return [
        {
            "id": review.id,
            "food_place_id": review.food_place_id,
            "user_id": review.user_id,
            "rating": review.rating,
            "review_text": review.comment,
            "created_at": review.created_at,
        }
        for review in reviews
    ]


# =========================================================
# MARKETPLACE
# =========================================================

@app.post(
    "/marketplace",
    response_model=MarketplaceItemResponse,
    status_code=201,
)
def create_marketplace_item(
    marketplace_data: MarketplaceItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    validate_city_and_locality(
        db,
        marketplace_data.city_id,
        marketplace_data.locality_id,
    )

    marketplace_item = MarketplaceItem(
        seller_id=current_user.id,
        city_id=marketplace_data.city_id,
        locality_id=marketplace_data.locality_id,
        title=marketplace_data.title.strip(),
        description=(
            marketplace_data.description.strip()
            if marketplace_data.description
            else None
        ),
        category=marketplace_data.category.strip(),
        price=marketplace_data.price,
        condition=marketplace_data.condition.strip(),
        image_url=(
            marketplace_data.image_url.strip()
            if marketplace_data.image_url
            else None
        ),
        status="active",
    )

    db.add(marketplace_item)
    db.commit()
    db.commit()
    db.refresh(marketplace_item)

    return marketplace_response(
        db, marketplace_item
    )


@app.get("/marketplace")
def get_marketplace_items(
    city_id: int | None = None,
    locality_id: int | None = None,
    search: str | None = None,
    category: str | None = None,
    condition: str | None = None,
    min_price: float | None = Query(
        default=None,
        ge=0,
    ),
    max_price: float | None = Query(
        default=None,
        ge=0,
    ),
    limit: int = Query(
        default=20,
        ge=1,
        le=100,
    ),
    offset: int = Query(
        default=0,
        ge=0,
    ),
    db: Session = Depends(get_db),
):
    if (
        min_price is not None
        and max_price is not None
        and min_price > max_price
    ):
        raise HTTPException(
            status_code=422,
            detail="min_price cannot be greater than max_price.",
        )

    statement = select(MarketplaceItem).where(
        MarketplaceItem.status == "active"
    )

    if city_id is not None:
        statement = statement.where(
            MarketplaceItem.city_id == city_id
        )

    if locality_id is not None:
        statement = statement.where(
            MarketplaceItem.locality_id
            == locality_id
        )

    if search and search.strip():
        search_term = f"%{search.strip()}%"
        statement = statement.where(
            or_(
                MarketplaceItem.title.ilike(search_term),
                MarketplaceItem.description.ilike(search_term),
                MarketplaceItem.category.ilike(search_term),
                MarketplaceItem.condition.ilike(search_term),
            )
        )

    if category:
        statement = statement.where(
            MarketplaceItem.category.ilike(
                category.strip()
            )
        )

    if condition:
        statement = statement.where(
            MarketplaceItem.condition.ilike(
                condition.strip()
            )
        )

    if min_price is not None:
        statement = statement.where(
            MarketplaceItem.price >= min_price
        )

    if max_price is not None:
        statement = statement.where(
            MarketplaceItem.price <= max_price
        )

    statement = (
        statement
        .order_by(
            MarketplaceItem.created_at.desc(),
            MarketplaceItem.id.desc(),
        )
        .offset(offset)
        .limit(limit)
    )

    items = db.scalars(statement).all()

    return marketplace_response_many(db, items)


@app.get(
    "/marketplace/{item_id}",
    response_model=MarketplaceItemResponse,
)
def get_marketplace_item(
    item_id: int,
    db: Session = Depends(get_db),
):
    item = db.scalar(
        select(MarketplaceItem).where(
            MarketplaceItem.id == item_id,
            MarketplaceItem.status == "active",
        )
    )

    if item is None:
        raise HTTPException(
            status_code=404,
            detail="Marketplace item not found.",
        )

    return marketplace_response(db, item)


@app.get("/owner/marketplace")
def get_my_marketplace_items(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = db.scalars(
        select(MarketplaceItem)
        .where(
            MarketplaceItem.seller_id
            == current_user.id
        )
        .order_by(
            MarketplaceItem.created_at.desc()
        )
    ).all()

    return [
        marketplace_response(db, item)
        for item in items
    ]


@app.put(
    "/owner/marketplace/{item_id}",
    response_model=MarketplaceItemResponse,
)
def update_marketplace_item(
    item_id: int,
    marketplace_data: MarketplaceItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.scalar(
        select(MarketplaceItem).where(
            MarketplaceItem.id == item_id,
            MarketplaceItem.seller_id
            == current_user.id,
        )
    )

    if item is None:
        raise HTTPException(
            status_code=404,
            detail="Marketplace item not found.",
        )

    update_data = marketplace_data.model_dump(
        exclude_unset=True,
        exclude_none=True,
    )

    final_city_id = update_data.get(
        "city_id",
        item.city_id,
    )

    final_locality_id = update_data.get(
        "locality_id",
        item.locality_id,
    )

    validate_city_and_locality(
        db,
        final_city_id,
        final_locality_id,
    )

    for field, value in update_data.items():
        if isinstance(value, str):
            value = value.strip()

        setattr(
            item,
            field,
            value,
        )

    db.commit()
    db.refresh(item)

    return marketplace_response(db, item)


@app.delete("/owner/marketplace/{item_id}")
def delete_marketplace_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.scalar(
        select(MarketplaceItem).where(
            MarketplaceItem.id == item_id,
            MarketplaceItem.seller_id
            == current_user.id,
        )
    )

    if item is None:
        raise HTTPException(
            status_code=404,
            detail="Marketplace item not found.",
        )

    item.status = "inactive"

    db.commit()

    return {
        "message": "Marketplace item removed successfully.",
        "item_id": item.id,
        "status": item.status,
    }


# =========================================================
# FAVORITES
# =========================================================

def add_favorite(
    db: Session,
    user_id: int,
    **target,
):
    filters = [
        getattr(Favorite, key) == value
        for key, value in target.items()
    ]

    existing = db.scalar(
        select(Favorite).where(
            Favorite.user_id == user_id,
            *filters,
        )
    )

    if existing is not None:
        raise HTTPException(
            status_code=409,
            detail="Item is already in your favorites.",
        )

    favorite = Favorite(
        user_id=user_id,
        **target,
    )

    db.add(favorite)
    db.commit()
    db.refresh(favorite)

    return favorite


def remove_favorite(
    db: Session,
    user_id: int,
    **target,
):
    filters = [
        getattr(Favorite, key) == value
        for key, value in target.items()
    ]

    favorite = db.scalar(
        select(Favorite).where(
            Favorite.user_id == user_id,
            *filters,
        )
    )

    if favorite is None:
        raise HTTPException(
            status_code=404,
            detail="Favorite not found.",
        )

    db.delete(favorite)
    db.commit()

    return {
        "message": "Removed from favorites."
    }


@app.post(
    "/favorites/property/{property_id}",
    response_model=FavoriteResponse,
    status_code=201,
)
def favorite_property(
    property_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    property_item = db.scalar(
        select(Property).where(
            Property.id == property_id,
            Property.status == "active",
        )
    )

    if property_item is None:
        raise HTTPException(
            status_code=404,
            detail="Property not found.",
        )

    return add_favorite(
        db,
        current_user.id,
        property_id=property_id,
    )


@app.post(
    "/favorites/food/{food_place_id}",
    response_model=FavoriteResponse,
    status_code=201,
)
def favorite_food(
    food_place_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    food_place = db.scalar(
        select(FoodPlace).where(
            FoodPlace.id == food_place_id,
            FoodPlace.status == "active",
        )
    )

    if food_place is None:
        raise HTTPException(
            status_code=404,
            detail="Food place not found.",
        )

    return add_favorite(
        db,
        current_user.id,
        food_place_id=food_place_id,
    )


@app.post(
    "/favorites/marketplace/{item_id}",
    response_model=FavoriteResponse,
    status_code=201,
)
def favorite_marketplace(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.scalar(
        select(MarketplaceItem).where(
            MarketplaceItem.id == item_id,
            MarketplaceItem.status == "active",
        )
    )

    if item is None:
        raise HTTPException(
            status_code=404,
            detail="Marketplace item not found.",
        )

    return add_favorite(
        db,
        current_user.id,
        marketplace_item_id=item_id,
    )


@app.delete("/favorites/property/{property_id}")
def unfavorite_property(
    property_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return remove_favorite(
        db,
        current_user.id,
        property_id=property_id,
    )


@app.delete("/favorites/food/{food_place_id}")
def unfavorite_food(
    food_place_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return remove_favorite(
        db,
        current_user.id,
        food_place_id=food_place_id,
    )


@app.delete("/favorites/marketplace/{item_id}")
def unfavorite_marketplace(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return remove_favorite(
        db,
        current_user.id,
        marketplace_item_id=item_id,
    )


@app.get(
    "/favorites",
    response_model=list[FavoriteResponse],
)
def get_favorites(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.scalars(
        select(Favorite)
        .where(
            Favorite.user_id
            == current_user.id
        )
        .order_by(Favorite.id.desc())
    ).all()


# =========================================================
# PROPERTY VISIT REQUESTS
# =========================================================

def visit_response_many(
    db: Session,
    visits: Sequence[VisitRequest],
):
    if not visits:
        return []

    property_ids = {visit.property_id for visit in visits}
    user_ids = {visit.user_id for visit in visits}
    property_titles = {
        item.id: item.title
        for item in db.scalars(
            select(Property).where(Property.id.in_(property_ids))
        ).all()
    }
    users = {
        item.id: item
        for item in db.scalars(
            select(User).where(User.id.in_(user_ids))
        ).all()
    }

    result = []
    for visit in visits:
        requester = users.get(visit.user_id)
        result.append({
            "id": visit.id,
            "property_id": visit.property_id,
            "user_id": visit.user_id,
            "requested_at": visit.requested_at,
            "message": visit.message,
            "status": visit.status,
            "created_at": visit.created_at,
            "property_title": property_titles.get(visit.property_id),
            "requester_name": requester.full_name if requester else None,
            "requester_email": requester.email if requester else None,
            "requester_phone": requester.phone if requester else None,
        })

    return result



@app.post(
    "/properties/{property_id}/visits",
    response_model=VisitRequestResponse,
    status_code=201,
)
def create_visit_request(
    property_id: int,
    visit_data: VisitRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    property_item = db.scalar(
        select(Property).where(
            Property.id == property_id,
            Property.status == "active",
            Property.is_available.is_(True),
        )
    )

    if property_item is None:
        raise HTTPException(
            status_code=404,
            detail="Available property not found.",
        )

    visit_request = VisitRequest(
        property_id=property_id,
        user_id=current_user.id,
        requested_at=visit_data.requested_at,
        message=(
            visit_data.message.strip()
            if visit_data.message
            else None
        ),
        status="pending",
    )

    db.add(visit_request)

    create_notification(
        db,
        property_item.owner_id,
        "New property visit request",
        (
            f"{current_user.full_name} requested "
            f"a visit for {property_item.title}."
        ),
        "visit_request",
    )

    db.commit()
    db.refresh(visit_request)

    return visit_request


@app.get(
    "/visits/me",
    response_model=list[VisitRequestResponse],
)
def get_my_visit_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    visits = db.scalars(
        select(VisitRequest)
        .where(
            VisitRequest.user_id
            == current_user.id
        )
        .order_by(
            VisitRequest.created_at.desc()
        )
    ).all()

    return visit_response_many(db, visits)


@app.get(
    "/owner/visit-requests",
    response_model=list[VisitRequestResponse],
)
def get_owner_visit_requests(
    current_owner: User = Depends(require_owner),
    db: Session = Depends(get_db),
):
    visits = db.scalars(
        select(VisitRequest)
        .join(
            Property,
            Property.id
            == VisitRequest.property_id,
        )
        .where(
            Property.owner_id
            == current_owner.id
        )
        .order_by(
            VisitRequest.created_at.desc()
        )
    ).all()

    return visit_response_many(db, visits)


@app.patch(
    "/owner/visit-requests/{visit_id}",
    response_model=VisitRequestResponse,
)
def update_visit_request(
    visit_id: int,
    status_data: VisitRequestStatusUpdate,
    current_owner: User = Depends(require_owner),
    db: Session = Depends(get_db),
):
    visit_request = db.scalar(
        select(VisitRequest)
        .join(
            Property,
            Property.id
            == VisitRequest.property_id,
        )
        .where(
            VisitRequest.id == visit_id,
            Property.owner_id
            == current_owner.id,
        )
    )

    if visit_request is None:
        raise HTTPException(
            status_code=404,
            detail="Visit request not found.",
        )

    if visit_request.status != "pending":
        raise HTTPException(
            status_code=409,
            detail=(
                f"Visit request is already "
                f"{visit_request.status}."
            ),
        )

    visit_request.status = status_data.status

    create_notification(
        db,
        visit_request.user_id,
        f"Visit request {status_data.status}",
        (
            "Your property visit request has "
            f"been {status_data.status}."
        ),
        "visit_request",
    )

    db.commit()
    db.refresh(visit_request)

    return visit_request


# =========================================================
# CONVERSATIONS / MESSAGES
# =========================================================

@app.post(
    "/conversations",
    response_model=ConversationResponse,
    status_code=201,
)
def create_conversation(
    conversation_data: ConversationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    targets = [
        conversation_data.property_id,
        conversation_data.food_place_id,
        conversation_data.marketplace_item_id,
    ]

    if sum(
        target is not None
        for target in targets
    ) != 1:
        raise HTTPException(
            status_code=422,
            detail="Provide exactly one listing target.",
        )

    if conversation_data.property_id is not None:
        property_item = db.scalar(
            select(Property).where(
                Property.id
                == conversation_data.property_id,
                Property.status == "active",
            )
        )

        if property_item is None:
            raise HTTPException(
                status_code=404,
                detail="Property not found.",
            )

        owner_id = property_item.owner_id

    elif conversation_data.food_place_id is not None:
        food_place = db.scalar(
            select(FoodPlace).where(
                FoodPlace.id
                == conversation_data.food_place_id,
                FoodPlace.status == "active",
            )
        )

        if food_place is None:
            raise HTTPException(
                status_code=404,
                detail="Food place not found.",
            )

        owner_id = food_place.owner_id

    else:
        marketplace_item = db.scalar(
            select(MarketplaceItem).where(
                MarketplaceItem.id
                == conversation_data.marketplace_item_id,
                MarketplaceItem.status == "active",
            )
        )

        if marketplace_item is None:
            raise HTTPException(
                status_code=404,
                detail="Marketplace item not found.",
            )

        owner_id = marketplace_item.seller_id

    if owner_id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot start a conversation with yourself.",
        )

    existing = db.scalar(
        select(Conversation).where(
            Conversation.user_id
            == current_user.id,
            Conversation.owner_id
            == owner_id,
            Conversation.property_id
            == conversation_data.property_id,
            Conversation.food_place_id
            == conversation_data.food_place_id,
            Conversation.marketplace_item_id
            == conversation_data.marketplace_item_id,
        )
    )

    if existing is not None:
        return existing

    conversation = Conversation(
        user_id=current_user.id,
        owner_id=owner_id,
        property_id=conversation_data.property_id,
        food_place_id=conversation_data.food_place_id,
        marketplace_item_id=conversation_data.marketplace_item_id,
    )

    db.add(conversation)
    create_notification(
        db,
        owner_id,
        "New listing inquiry",
        (
            f"{current_user.full_name} contacted you about "
            f"a listing on CityNest."
        ),
        "message",
    )
    db.commit()
    db.refresh(conversation)

    return conversation


@app.get(
    "/conversations",
    response_model=list[ConversationSummaryResponse],
)
def get_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conversations = db.scalars(
        select(Conversation)
        .where(
            (
                Conversation.user_id
                == current_user.id
            )
            | (
                Conversation.owner_id
                == current_user.id
            )
        )
        .order_by(
            Conversation.created_at.desc()
        )
    ).all()

    return conversation_summary_many(
        db,
        conversations,
        current_user.id,
    )


@app.get(
    "/conversations/{conversation_id}/messages",
    response_model=list[MessageResponse],
)
def get_messages(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_conversation_for_user(
        db,
        conversation_id,
        current_user.id,
    )

    return db.scalars(
        select(Message)
        .where(
            Message.conversation_id
            == conversation_id
        )
        .order_by(
            Message.sent_at,
            Message.id,
        )
    ).all()


@app.post(
    "/conversations/{conversation_id}/messages",
    response_model=MessageResponse,
    status_code=201,
)
def send_message(
    conversation_id: int,
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conversation = get_conversation_for_user(
        db,
        conversation_id,
        current_user.id,
    )

    message = Message(
        conversation_id=conversation.id,
        sender_id=current_user.id,
        message_text=message_data.message_text.strip(),
        is_read=False,
    )

    db.add(message)

    recipient_id = (
        conversation.owner_id
        if current_user.id
        == conversation.user_id
        else conversation.user_id
    )

    create_notification(
        db,
        recipient_id,
        "New message",
        (
            f"You have a new message "
            f"from {current_user.full_name}."
        ),
        "message",
    )

    db.commit()
    db.refresh(message)

    return message


@app.patch(
    "/conversations/{conversation_id}/messages/{message_id}/read"
)
def mark_message_read(
    conversation_id: int,
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_conversation_for_user(
        db,
        conversation_id,
        current_user.id,
    )

    message = db.scalar(
        select(Message).where(
            Message.id == message_id,
            Message.conversation_id
            == conversation_id,
        )
    )

    if message is None:
        raise HTTPException(
            status_code=404,
            detail="Message not found.",
        )

    if message.sender_id != current_user.id:
        message.is_read = True
        db.commit()

    return {
        "message_id": message.id,
        "is_read": message.is_read,
    }


# =========================================================
# REPORTS
# =========================================================

@app.post(
    "/reports",
    response_model=ListingReportResponse,
    status_code=201,
)
def create_listing_report(
    report_data: ListingReportCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if report_data.listing_type == "property":
        listing = db.get(
            Property,
            report_data.listing_id,
        )
    elif report_data.listing_type == "food":
        listing = db.get(
            FoodPlace,
            report_data.listing_id,
        )
    else:
        listing = db.get(
            MarketplaceItem,
            report_data.listing_id,
        )

    if listing is None:
        raise HTTPException(
            status_code=404,
            detail="Listing not found.",
        )

    report = ListingReport(
        reporter_id=current_user.id,
        listing_type=report_data.listing_type,
        listing_id=report_data.listing_id,
        reason=report_data.reason.strip(),
        description=(
            report_data.description.strip()
            if report_data.description
            else None
        ),
        status="pending",
    )

    db.add(report)
    db.commit()
    db.refresh(report)

    return report


@app.get(
    "/admin/reports",
    response_model=list[ListingReportResponse],
)
def get_admin_reports(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return db.scalars(
        select(ListingReport)
        .order_by(
            ListingReport.created_at.desc()
        )
    ).all()


@app.patch(
    "/admin/reports/{report_id}",
    response_model=ListingReportResponse,
)
def update_admin_report(
    report_id: int,
    status_data: ListingReportStatusUpdate,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    report = db.get(
        ListingReport,
        report_id,
    )

    if report is None:
        raise HTTPException(
            status_code=404,
            detail="Report not found.",
        )

    report.status = status_data.status

    db.commit()
    db.refresh(report)

    return report


# =========================================================
# NOTIFICATIONS
# =========================================================

@app.get(
    "/notifications",
    response_model=list[NotificationResponse],
)
def get_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.scalars(
        select(Notification)
        .where(
            Notification.user_id
            == current_user.id
        )
        .order_by(
            Notification.created_at.desc()
        )
    ).all()


@app.patch(
    "/notifications/{notification_id}/read"
)
def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notification = db.scalar(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id
            == current_user.id,
        )
    )

    if notification is None:
        raise HTTPException(
            status_code=404,
            detail="Notification not found.",
        )

    notification.is_read = True

    db.commit()

    return {
        "notification_id": notification.id,
        "is_read": True,
    }


@app.patch("/notifications/read-all")
def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notifications = db.scalars(
        select(Notification).where(
            Notification.user_id
            == current_user.id,
            Notification.is_read.is_(False),
        )
    ).all()

    for notification in notifications:
        notification.is_read = True

    db.commit()

    return {
        "message": "All notifications marked as read.",
        "count": len(notifications),
    }


# =========================================================
# ADMIN LISTING MODERATION
# =========================================================

@app.patch("/admin/properties/{property_id}/status")
def admin_property_status(
    property_id: int,
    is_active: bool,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    property_item = db.get(
        Property,
        property_id,
    )

    if property_item is None:
        raise HTTPException(
            status_code=404,
            detail="Property not found.",
        )

    property_item.status = (
        "active"
        if is_active
        else "inactive"
    )

    if not is_active:
        property_item.is_available = False

    db.commit()

    return {
        "property_id": property_item.id,
        "status": property_item.status,
        "is_available": property_item.is_available,
    }


@app.patch("/admin/food/{food_place_id}/status")
def admin_food_status(
    food_place_id: int,
    is_active: bool,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    food_place = db.get(
        FoodPlace,
        food_place_id,
    )

    if food_place is None:
        raise HTTPException(
            status_code=404,
            detail="Food place not found.",
        )

    food_place.status = (
        "active"
        if is_active
        else "inactive"
    )

    db.commit()

    return {
        "food_place_id": food_place.id,
        "status": food_place.status,
    }


@app.patch("/admin/marketplace/{item_id}/status")
def admin_marketplace_status(
    item_id: int,
    is_active: bool,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    marketplace_item = db.get(
        MarketplaceItem,
        item_id,
    )

    if marketplace_item is None:
        raise HTTPException(
            status_code=404,
            detail="Marketplace item not found.",
        )

    marketplace_item.status = (
        "active"
        if is_active
        else "inactive"
    )

    db.commit()

    return {
        "item_id": marketplace_item.id,
        "status": marketplace_item.status,
    }


@app.get("/admin/properties")
def admin_properties(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return db.scalars(
        select(Property).order_by(
            Property.created_at.desc()
        )
    ).all()


@app.get("/admin/food")
def admin_food(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return db.scalars(
        select(FoodPlace).order_by(
            FoodPlace.created_at.desc()
        )
    ).all()


@app.get("/admin/marketplace")
def admin_marketplace(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return db.scalars(
        select(MarketplaceItem).order_by(
            MarketplaceItem.created_at.desc()
        )
    ).all()
