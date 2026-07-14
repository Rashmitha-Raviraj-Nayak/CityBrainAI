# Deployment Guide

## Local deployment

1. Copy [.env.example](.env.example) to .env.
2. Start the backend:
   ```bash
   cd backend
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
3. Start the frontend:
   ```bash
   cd frontend
   npm run dev
   ```

## Docker deployment

```bash
docker compose up --build
```

## Google Cloud Run

Use the Dockerfiles with a Cloud Run service using the following environment variables:

- CITYBRAIN_GEMINI__API_KEY
- CITYBRAIN_FIREBASE__PROJECT_ID
- CITYBRAIN_GOOGLE_MAPS__API_KEY
- CITYBRAIN_CORS__ALLOWED_ORIGINS
