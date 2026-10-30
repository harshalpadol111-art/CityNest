# Deployment

## Frontend
Build with:
```bash
docker build --build-arg VITE_API_BASE_URL=https://YOUR-API-DOMAIN -t citynest-frontend ./frontend
```
Serve the resulting nginx container on your frontend domain.

## Backend
Set:
- `DATABASE_URL`
- `JWT_SECRET_KEY`
- `ACCESS_TOKEN_EXPIRE_MINUTES`
- `CORS_ORIGINS`

Run:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## PostgreSQL
Use a managed PostgreSQL service for production. Do not expose PostgreSQL directly to the public internet.

## Demo deployment
For a presentation environment, use `docker-compose.demo.yml` so the demo records are inserted automatically. Do not use the demo seed in a production environment with real users.
