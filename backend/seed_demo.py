"""Idempotent CityNest presentation dataset seed.
Creates a database-backed presentation dataset with 5 stays, 5 food places and student-focused marketplace items.
Run from backend/: python seed_demo.py

The seeded listings are synthetic CityNest-owned presentation data, not
third-party listings copied from external marketplaces. Replace them with
actual owner-submitted listings before a public launch.
"""
from datetime import datetime, timezone

from sqlalchemy import select
from app.database import SessionLocal
from app.models import City, Locality, User, Property, PropertyImage, FoodPlace, FoodMenuItem, MarketplaceItem, PropertyReview, FoodReview, Notification
from app.security import hash_password

CITY_NAME = "Chhatrapati Sambhajinagar"
PASSWORD = "CityNest@2026"

LOCALITIES = [
    ("CIDCO", "431136"), ("Garkheda", "431005"), ("N-6", "431003"),
    ("Waluj", "431136"), ("Kranti Chowk", "431001"), ("Seven Hills", "431001"),
]

STAYS = [
    ("MGM Scholar House", "Modern student rooms 5 minutes from MGM University with study desk, Wi-Fi and housekeeping.", "pg", 7200, 15000, "students", "fully_furnished", "N-6, near MGM University", "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1400&q=85"),
    ("Garkheda Urban Studio", "Compact private studio for students and young professionals in a quiet residential pocket.", "room", 8500, 17000, "bachelors", "fully_furnished", "Garkheda, Chhatrapati Sambhajinagar", "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=85"),
    ("CIDCO Co-Living House", "Bright shared accommodation with common lounge, kitchen access and flexible student-friendly rules.", "hostel", 6200, 12000, "students", "semi_furnished", "CIDCO N-3, Chhatrapati Sambhajinagar", "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1400&q=85"),
    ("Seven Hills Executive Flat", "Fully furnished 1BHK suited to professionals relocating for work, with easy access to the city core.", "flat", 14500, 30000, "professionals", "fully_furnished", "Seven Hills, Chhatrapati Sambhajinagar", "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1400&q=85"),
    ("Waluj Budget PG", "Affordable twin-sharing PG close to the industrial area with meals and basic housekeeping options.", "pg", 5800, 10000, "boys", "semi_furnished", "Waluj MIDC, Chhatrapati Sambhajinagar", "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1400&q=85"),
]

FOODS = [
    ("MGM Student Mess", "Home-style vegetarian meals with monthly plans designed around student budgets.", "vegetarian", 2600, 95, "N-6, near MGM University", "9876501001"),
    ("Campus Tiffin Co.", "Daily lunch and dinner tiffins with rotating Maharashtrian and North Indian menus.", "veg", 2900, 110, "Garkheda", "9876501002"),
    ("The Working Plate", "Reliable monthly meal service for professionals and shared apartments.", "mixed", 3400, 130, "Seven Hills", "9876501003"),
    ("Annapurna Home Kitchen", "Simple home-cooked meals, packed fresh each morning and evening.", "vegetarian", 2500, 90, "CIDCO", "9876501004"),
    ("Waluj Meals & More", "Budget-friendly meals near Waluj with pickup and local delivery.", "mixed", 2800, 105, "Waluj MIDC", "9876501005"),
]

ITEMS = [
    ("Student Study Table", "Compact study desk with storage. Clean and lightly used, ideal for a hostel or rented room.", "Furniture", 1800, "Good", "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=85"),
    ("Ergonomic Office Chair", "Comfortable mesh chair, ideal for hostel rooms, study setups and WFH.", "Furniture", 2400, "Like New", "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?auto=format&fit=crop&w=1200&q=85"),
    ("Scientific Calculator", "Scientific calculator suitable for engineering and mathematics students. Photo shows a real hand-held use scenario.", "Study", 650, "Good", "https://images.unsplash.com/photo-1701453031726-303c097f6b04?auto=format&fit=crop&w=1200&q=85"),
    ("Single Mattress", "Clean single mattress used for one academic year. Good option for a new rental room.", "Home", 2200, "Good", "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=85"),
    ("Mixer Grinder", "Working kitchen mixer, useful for a new flat or PG setup.", "Appliances", 1300, "Used", "https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=1200&q=85"),
    ("LPG Gas Cylinder", "Used domestic LPG cylinder for a student kitchen setup. Buyer and seller must complete any required local transfer or safety formalities.", "Kitchen", 900, "Used", "https://upload.wikimedia.org/wikipedia/commons/a/a9/Kitchen-LPG_cooking_gas_cylinder.JPG"),
    ("Study Floor Mat", "Lightweight floor mat for a hostel room, study corner or small apartment.", "Home", 450, "Good", "https://images.unsplash.com/photo-1637157216470-d92cd2edb2e8?auto=format&fit=crop&w=1200&q=85"),
    ("Extension Board", "Multi-socket extension board for a student desk with a clean working condition.", "Electronics", 350, "Good", "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=85"),
    ("Portable Induction Cooktop", "Compact induction cooktop for a rented room or small kitchen. Working condition.", "Kitchen", 1100, "Good", "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1200&q=85"),
]


def user(db, name, email, role="user"):
    item = db.scalar(select(User).where(User.email == email))
    if item:
        if item.role != role:
            item.role = role
        return item
    item = User(full_name=name, email=email, password_hash=hash_password(PASSWORD), role=role, is_active=True)
    db.add(item); db.flush(); return item


def city_localities(db):
    city = db.scalar(select(City).where(City.name == CITY_NAME))
    if not city:
        city = City(name=CITY_NAME, state="Maharashtra", country="India", is_active=True)
        db.add(city); db.flush()
    locs = {}
    for name, pincode in LOCALITIES:
        loc = db.scalar(select(Locality).where(Locality.city_id == city.id, Locality.name == name))
        if not loc:
            loc = Locality(city_id=city.id, name=name, pincode=pincode); db.add(loc); db.flush()
        locs[name] = loc
    return city, locs


def seed():
    db = SessionLocal()
    try:
        city, locs = city_localities(db)
        owner_a = user(db, "Aarav Mehta", "owner1@citynest.local", "owner")
        owner_b = user(db, "Isha Kulkarni", "owner2@citynest.local", "owner")
        student = user(db, "Rahul Patil", "student@citynest.local", "user")
        admin = user(db, "CityNest Admin", "admin@citynest.local", "admin")
        for demo_owner in (owner_a, owner_b):
            demo_owner.owner_verified = True
            demo_owner.verified_by = admin.id
            demo_owner.verified_at = datetime.now(timezone.utc)

        for i, (title, desc, ptype, rent, deposit, available_for, furnishing, address, image) in enumerate(STAYS):
            existing = db.scalar(select(Property).where(Property.title == title))
            if not existing:
                owner = owner_a if i % 2 == 0 else owner_b
                locality = locs[["N-6", "Garkheda", "CIDCO", "Seven Hills", "Waluj"][i]]
                existing = Property(owner_id=owner.id, city_id=city.id, locality_id=locality.id, title=title, description=desc, property_type=ptype, address=address, monthly_rent=rent, security_deposit=deposit, available_for=available_for, furnishing=furnishing, is_available=True, status="active")
                db.add(existing); db.flush(); db.add(PropertyImage(property_id=existing.id, image_url=image, sort_order=0))
                db.add(PropertyReview(property_id=existing.id, user_id=student.id, rating=5 if i in (0,2) else 4, comment="Helpful listing and a good option for relocating.") )

        for i, (name, desc, food_type, monthly, daily, address, phone) in enumerate(FOODS):
            existing = db.scalar(select(FoodPlace).where(FoodPlace.name == name))
            if not existing:
                owner = owner_a if i % 2 == 0 else owner_b
                locality = locs[["N-6", "Garkheda", "Seven Hills", "CIDCO", "Waluj"][i]]
                existing = FoodPlace(owner_id=owner.id, city_id=city.id, locality_id=locality.id, name=name, description=desc, address=address, food_type=food_type, monthly_price=monthly, daily_price=daily, contact_phone=phone, status="active")
                db.add(existing); db.flush()
                menus = [("Monday", "Lunch", "Dal, rice, roti, seasonal sabzi"), ("Monday", "Dinner", "Dal khichdi, salad, roti"), ("Wednesday", "Lunch", "Rajma rice, roti, salad"), ("Friday", "Dinner", "Paneer curry, rice, roti")]
                for day, meal, text in menus: db.add(FoodMenuItem(food_place_id=existing.id, day_of_week=day, meal_type=meal, menu_description=text, price=daily))
                db.add(FoodReview(food_place_id=existing.id, user_id=student.id, rating=5 if i < 3 else 4, comment="Good demo listing with clear pricing."))

        marketplace_localities = ["N-6", "Garkheda", "CIDCO", "Seven Hills", "Waluj", "N-6", "Garkheda", "CIDCO", "Seven Hills"]
        for i, (title, desc, category, price, condition, image) in enumerate(ITEMS):
            existing = db.scalar(select(MarketplaceItem).where(MarketplaceItem.title == title))
            if existing is None and title == "Student Study Table":
                existing = db.scalar(select(MarketplaceItem).where(MarketplaceItem.title == "IKEA-style Study Table"))
                if existing is not None:
                    existing.title = title
            if not existing:
                seller = student if i % 2 == 0 else owner_a
                locality = locs[marketplace_localities[i % len(marketplace_localities)]]
                existing = MarketplaceItem(seller_id=seller.id, city_id=city.id, locality_id=locality.id, title=title, description=desc, category=category, price=price, condition=condition, image_url=image, status="active")
                db.add(existing)
            else:
                existing.description = desc
                existing.category = category
                existing.price = price
                existing.condition = condition
                existing.image_url = image
                existing.status = "active"

        if not db.scalar(select(Notification).where(Notification.user_id == student.id, Notification.title == "Welcome to CityNest")):
            db.add(Notification(user_id=student.id, title="Welcome to CityNest", message="Your demo account is ready. Explore stays, food and marketplace listings.", notification_type="system"))
        db.commit()
        print("CityNest presentation dataset seed complete.")
        print(f"Listings: 5 stays + 5 food + {len(ITEMS)} marketplace")
        print("Demo password:", PASSWORD)
        print("student@citynest.local | owner1@citynest.local | owner2@citynest.local | admin@citynest.local")
    except Exception:
        db.rollback(); raise
    finally:
        db.close()

if __name__ == "__main__": seed()
