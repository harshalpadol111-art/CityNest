
"""
CityNest presentation/showcase seed.

Adds realistic sample listings without deleting or resetting existing data.

Run from backend:
    python seed_showcase.py

Safe to run repeatedly: listings are matched by their title/name
before insertion.
"""

from sqlalchemy import select

from app.database import SessionLocal
from app.models import (
    City,
    FoodMenuItem,
    FoodPlace,
    FoodReview,
    Locality,
    MarketplaceItem,
    Property,
    PropertyImage,
    PropertyReview,
    User,
)


CITY_NAME = "Chhatrapati Sambhajinagar"

PROPERTY_IMAGES = [
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1400&q=85",
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=85",
    "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1400&q=85",
    "https://images.unsplash.com/photo-1502672023488-70e25813eb80?auto=format&fit=crop&w=1400&q=85",
    "https://images.unsplash.com/photo-1560185008-b033106af5c3?auto=format&fit=crop&w=1400&q=85",
]

MARKET_IMAGES = [
    "https://images.unsplash.com/photo-1517336714739-489689fd1ca8?auto=format&fit=crop&w=1400&q=85",
    "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1400&q=85",
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1400&q=85",
    "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1400&q=85",
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1400&q=85",
]

PROPERTIES = [
    {
        "title": "Sunrise Residency — Private Room",
        "locality": "Cidco",
        "property_type": "PG",
        "address": "Near MGM University, Cidco",
        "rent": 8500,
        "deposit": 12000,
        "available_for": "Students",
        "furnishing": "Fully furnished",
        "description": "Bright private room with Wi-Fi, study desk, housekeeping and easy access to MGM University.",
        "rating": 5,
        "review": "Clean room, good Wi-Fi and very convenient for campus.",
    },
    {
        "title": "The Nest — Twin Sharing",
        "locality": "N-3, Cidco",
        "property_type": "Hostel",
        "address": "N-3, Cidco, 5 minutes from MGM",
        "rent": 6200,
        "deposit": 8000,
        "available_for": "Students",
        "furnishing": "Fully furnished",
        "description": "Student-friendly twin sharing with power backup, laundry, common lounge and secure entry.",
        "rating": 5,
        "review": "Affordable and well managed. The common area is useful.",
    },
    {
        "title": "Green View 1BHK — Move-in Ready",
        "locality": "Garkheda",
        "property_type": "Apartment",
        "address": "Garkheda Main Road",
        "rent": 14500,
        "deposit": 30000,
        "available_for": "Working professionals",
        "furnishing": "Semi furnished",
        "description": "Quiet 1BHK with balcony, modular kitchen and dedicated two-wheeler parking.",
        "rating": 5,
        "review": "Peaceful locality and a practical layout for a professional.",
    },
    {
        "title": "Campus Corner — Girls PG",
        "locality": "Beed Bypass",
        "property_type": "PG",
        "address": "Beed Bypass, near college route",
        "rent": 7800,
        "deposit": 10000,
        "available_for": "Female students",
        "furnishing": "Fully furnished",
        "description": "Comfortable girls PG with meals, CCTV, housekeeping and a dedicated study area.",
        "rating": 4,
        "review": "The meals and study area make this convenient for students.",
    },
    {
        "title": "Urban Grove — Studio",
        "locality": "Seven Hills",
        "property_type": "Studio",
        "address": "Seven Hills, Jalna Road",
        "rent": 16500,
        "deposit": 33000,
        "available_for": "Professionals",
        "furnishing": "Fully furnished",
        "description": "Compact premium studio for professionals with fast Wi-Fi, lift and covered parking.",
        "rating": 5,
        "review": "Modern, clean and ideal for someone working nearby.",
    },
]

FOOD = [
    {
        "name": "Maa Annapurna Mess",
        "locality": "N-4, Cidco",
        "food_type": "North Indian",
        "monthly": 3200,
        "daily": 130,
        "description": "Homestyle thali with breakfast, lunch and dinner options. Popular with MGM students.",
        "menu": "Dal • 2 sabzi • roti • rice • salad",
        "rating": 5,
        "review": "Consistent food and generous portions for the price.",
    },
    {
        "name": "Ghar Ka Zaika",
        "locality": "Garkheda",
        "food_type": "Maharashtrian",
        "monthly": 3600,
        "daily": 150,
        "description": "Simple Maharashtrian meals, generous portions and weekly special bhakri-thali.",
        "menu": "Bhakri • pithla • bharit • rice • dal",
        "rating": 5,
        "review": "Tastes like home and the monthly plan is reasonable.",
    },
    {
        "name": "Green Bowl Kitchen",
        "locality": "Seven Hills",
        "food_type": "Healthy",
        "monthly": 4200,
        "daily": 170,
        "description": "Lighter meals with high-protein add-ons, salads and low-oil options for busy professionals.",
        "menu": "Rice bowl • paneer • dal • salad",
        "rating": 5,
        "review": "Good option when you want lighter meals during workdays.",
    },
    {
        "name": "Sai Krupa Family Mess",
        "locality": "Beed Bypass",
        "food_type": "Veg",
        "monthly": 3000,
        "daily": 120,
        "description": "Affordable vegetarian mess with fixed monthly plans and Sunday special meals.",
        "menu": "Sabzi • dal • roti • rice • sweet",
        "rating": 4,
        "review": "Simple, affordable and dependable.",
    },
    {
        "name": "Urban Tiffin Co.",
        "locality": "Jalna Road",
        "food_type": "Multi-cuisine",
        "monthly": 3900,
        "daily": 160,
        "description": "Tiffin delivery for students and professionals with flexible weekly plans.",
        "menu": "2 sabzi • dal • roti • rice • dessert",
        "rating": 5,
        "review": "Delivery timing is useful for professionals with late classes.",
    },
]

MARKETPLACE = [
    {
        "title": "Lenovo IdeaPad 15 — i5 / 8GB / 512GB",
        "locality": "Cidco",
        "category": "Electronics",
        "price": 28500,
        "condition": "Excellent",
        "description": "Well-maintained laptop, ideal for coding and college work. Charger included.",
    },
    {
        "title": "HP 14 Laptop — Ryzen 5",
        "locality": "Garkheda",
        "category": "Electronics",
        "price": 23500,
        "condition": "Good",
        "description": "Reliable everyday laptop with original charger. Battery and keyboard in good condition.",
    },
    {
        "title": "Nike Running Shoes — UK 9",
        "locality": "Seven Hills",
        "category": "Fashion",
        "price": 1800,
        "condition": "Like new",
        "description": "Used only a few times. Clean pair, comfortable for running and daily college use.",
    },
    {
        "title": "Study Desk + Ergonomic Chair",
        "locality": "N-4, Cidco",
        "category": "Furniture",
        "price": 4200,
        "condition": "Good",
        "description": "Compact study setup for a room or PG. Sold together to make moving easier.",
    },
    {
        "title": "Casio Analog Watch",
        "locality": "Jalna Road",
        "category": "Accessories",
        "price": 2200,
        "condition": "Excellent",
        "description": "Classic everyday watch with original box. No scratches on the dial.",
    },
]


def get_or_create_locality(db, city_id, name, pincode):
    locality = db.scalar(
        select(Locality).where(
            Locality.city_id == city_id,
            Locality.name == name,
        )
    )

    if locality:
        return locality

    locality = Locality(
        city_id=city_id,
        name=name,
        pincode=pincode,
    )
    db.add(locality)
    db.flush()
    return locality


def main():
    db = SessionLocal()

    try:
        city = db.scalar(
            select(City).where(
                City.name == CITY_NAME,
                City.is_active.is_(True),
            )
        )

        if not city:
            raise RuntimeError(
                f"City '{CITY_NAME}' was not found."
            )

        owner = db.scalar(
            select(User)
            .where(
                User.role == "owner",
                User.is_active.is_(True),
            )
            .order_by(User.id)
        )

        if not owner:
            raise RuntimeError(
                "No active owner account exists. Approve your owner account first, then run this script."
            )

        reviewer = db.scalar(
            select(User)
            .where(
                User.is_active.is_(True),
                User.id != owner.id,
            )
            .order_by(User.id)
        ) or owner

        locality_map = {}
        for name, pin in [
            ("Cidco", "431136"),
            ("N-3, Cidco", "431136"),
            ("Garkheda", "431005"),
            ("Beed Bypass", "431005"),
            ("Seven Hills", "431005"),
            ("Jalna Road", "431001"),
            ("N-4, Cidco", "431136"),
        ]:
            locality_map[name] = get_or_create_locality(
                db,
                city.id,
                name,
                pin,
            )

        created_properties = 0
        created_food = 0
        created_market = 0

        for index, item in enumerate(PROPERTIES):
            existing = db.scalar(
                select(Property).where(
                    Property.title == item["title"]
                )
            )

            if existing:
                continue

            locality = locality_map[item["locality"]]

            property_item = Property(
                owner_id=owner.id,
                city_id=city.id,
                locality_id=locality.id,
                title=item["title"],
                description=item["description"],
                property_type=item["property_type"],
                address=item["address"],
                monthly_rent=item["rent"],
                security_deposit=item["deposit"],
                available_for=item["available_for"],
                furnishing=item["furnishing"],
                is_available=True,
                status="active",
            )

            db.add(property_item)
            db.flush()

            db.add(
                PropertyImage(
                    property_id=property_item.id,
                    image_url=PROPERTY_IMAGES[index],
                    sort_order=0,
                )
            )

            db.add(
                PropertyReview(
                    property_id=property_item.id,
                    user_id=reviewer.id,
                    rating=item["rating"],
                    comment=item["review"],
                )
            )

            created_properties += 1

        for index, item in enumerate(FOOD):
            existing = db.scalar(
                select(FoodPlace).where(
                    FoodPlace.name == item["name"]
                )
            )

            if existing:
                continue

            locality = locality_map[item["locality"]]

            food = FoodPlace(
                owner_id=owner.id,
                city_id=city.id,
                locality_id=locality.id,
                name=item["name"],
                description=item["description"],
                address=f"{item['locality']}, Chhatrapati Sambhajinagar",
                food_type=item["food_type"],
                monthly_price=item["monthly"],
                daily_price=item["daily"],
                status="active",
            )

            db.add(food)
            db.flush()

            db.add(
                FoodMenuItem(
                    food_place_id=food.id,
                    day_of_week="Monday",
                    meal_type="Lunch",
                    menu_description=item["menu"],
                    price=item["daily"],
                )
            )

            db.add(
                FoodReview(
                    food_place_id=food.id,
                    user_id=reviewer.id,
                    rating=item["rating"],
                    comment=item["review"],
                )
            )

            created_food += 1

        for index, item in enumerate(MARKETPLACE):
            existing = db.scalar(
                select(MarketplaceItem).where(
                    MarketplaceItem.title == item["title"]
                )
            )

            if existing:
                continue

            locality = locality_map[item["locality"]]

            marketplace_item = MarketplaceItem(
                seller_id=owner.id,
                city_id=city.id,
                locality_id=locality.id,
                title=item["title"],
                description=item["description"],
                category=item["category"],
                price=item["price"],
                condition=item["condition"],
                image_url=MARKET_IMAGES[index],
                status="active",
            )

            db.add(marketplace_item)
            created_market += 1

        db.commit()

        print("CityNest showcase seed complete.")
        print(
            f"Created: {created_properties} properties + "
            f"{created_food} food listings + "
            f"{created_market} marketplace items."
        )
        print(
            "Existing data was preserved. "
            "Running the script again will not duplicate these listings."
        )

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
