import json
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import SavedSearch, Notification


def _matches(filters, listing):
    if filters.get("city_id") and listing.city_id != int(filters["city_id"]):
        return False
    if filters.get("locality_id") and listing.locality_id != int(filters["locality_id"]):
        return False
    price = getattr(listing, "monthly_rent", None)
    if price is None:
        price = getattr(listing, "monthly_price", None) or getattr(listing, "daily_price", None)
    if price is None:
        price = getattr(listing, "price", None)
    if filters.get("min_price") is not None and price is not None and float(price) < float(filters["min_price"]):
        return False
    if filters.get("max_price") is not None and price is not None and float(price) > float(filters["max_price"]):
        return False
    return True


def notify_saved_search_matches(db: Session, listing_type: str, listing) -> int:
    searches = db.scalars(select(SavedSearch).where(
        SavedSearch.listing_type == listing_type,
        SavedSearch.is_active.is_(True),
    )).all()
    created = 0
    title = getattr(listing, "title", None) or getattr(listing, "name", None) or "New CityNest listing"
    for search in searches:
        try:
            filters = json.loads(search.filters_json or "{}")
        except json.JSONDecodeError:
            filters = {}
        if not _matches(filters, listing):
            continue
        db.add(Notification(
            user_id=search.user_id,
            title=f"New match: {search.name}",
            message=f'"{title}" matches one of your saved CityNest searches.',
            notification_type="saved_search_match",
            is_read=False,
        ))
        created += 1
    return created
