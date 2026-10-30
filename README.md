# CityNest

**Smart relocation ecosystem for students and working professionals.**

CityNest combines accommodation discovery, local mess/meal discovery and a secondhand marketplace into one relocation platform for Chhatrapati Sambhajinagar.

## Core experience

- Public discovery of rooms, PGs, hostels and rental properties
- Public discovery of messes and meal plans
- Secondhand marketplace with direct seller contact
- Listing detail pages with ratings, reviews, favorites and contact actions
- In-app conversations between users and listing owners/sellers
- Property visit requests with owner confirmation/decline
- Owner Studio for publishing, editing and removing listings
- Owner inbox with requester name, email, phone (when available), listing and latest message
- Browser notifications plus persistent in-app notifications
- Optional AI listing-writing assistant for owners
- Three-way comparison for Stay, Food and Marketplace
- Admin owner verification, reports and listing moderation

## Stack

- Frontend: React 19 + Vite + React Router
- Backend: FastAPI + SQLAlchemy
- Database: PostgreSQL
- Authentication: JWT + Argon2 password hashing
- Migrations: Alembic

## Local setup

### Backend (Terminal 1)

Keep the FastAPI server running in a separate terminal from Vite. If the backend is not running, Stay/Food/Marketplace cannot load database listings.

```powershell
cd D:\Coding_Playground\CityNest\backend
.venv\Scripts\Activate.ps1
alembic upgrade head
python -m uvicorn app.main:app --reload
```

Verify it at `http://127.0.0.1:8000/health`.

### Presentation data (only if your database has no listings)

`seed_demo.py` is idempotent. It does not drop tables or reset users. Run it once from the backend terminal when you need the local presentation dataset:

```powershell
python seed_demo.py
```

It creates 5 stays, 5 food places and a student-focused marketplace dataset with study furniture, calculator, mattress, kitchen essentials and other practical items, plus demo accounts.

### Frontend (Terminal 2)

```powershell
cd D:\Coding_Playground\CityNest\frontend
npm install
npm run lint
npm run build
npm run dev
```

Open `http://localhost:5173`.

## Presentation dataset

`backend/seed_demo.py` creates database-backed presentation listings and test accounts. These records are **synthetic CityNest data**, not copied third-party listings. They are intended for local development and project presentation.

For a real public launch, actual property owners, mess operators and marketplace sellers should create or claim their own listings through CityNest.

## Security

Never commit `.env`, database credentials, JWT secrets or API keys. Use `.env.example` as the configuration template.
