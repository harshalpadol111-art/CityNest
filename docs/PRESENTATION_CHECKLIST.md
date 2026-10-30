# CityNest presentation checklist

## Start

1. Start PostgreSQL.
2. Run `alembic upgrade head` once after schema changes.
3. Start FastAPI.
4. Start Vite.
5. Run `python seed_demo.py` if presentation data is not already present.

## Recommended demo flow

1. **Home** — explain the relocation problem and the three core modules.
2. **Stay** — show realistic properties, filters, ratings and property detail.
3. **Compare** — add up to three stays and compare rent/furnishing/ratings.
4. **Food** — show realistic mess plans, pricing and menu preview.
5. **Marketplace** — show secondhand items and local discovery.
6. **Dashboard** — show favorites, visit requests, clickable conversation/inquiry stats and notifications.
7. **Owner Studio** — apply/approve owner access, then create a property, food listing or marketplace item.
8. **AI listing assistant** — improve a draft before publishing.
9. **Admin Console** — approve/reject owner applications, verify owners, resolve reports, open listings and activate/deactivate listings.
10. **Messaging** — contact an owner/seller and show the conversation flow.

See `docs/DEMO_CREDENTIALS.md` for the seeded presentation accounts.
