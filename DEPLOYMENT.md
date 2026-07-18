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

## Environment variables

Copy [.env.example](.env.example) to .env and populate the values before deployment.

Required backend variables:

- CITYBRAIN_APPLICATION__ENVIRONMENT
- CITYBRAIN_APPLICATION__PROJECT_NAME
- CITYBRAIN_GEMINI__API_KEY
- CITYBRAIN_FIREBASE__PROJECT_ID
- CITYBRAIN_FIREBASE__STORAGE_BUCKET
- CITYBRAIN_GOOGLE_MAPS__API_KEY
- CITYBRAIN_SECURITY__JWT_SECRET_KEY

Required frontend variables:

- NEXT_PUBLIC_FIREBASE_API_KEY
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- NEXT_PUBLIC_FIREBASE_PROJECT_ID
- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- NEXT_PUBLIC_FIREBASE_APP_ID
- NEXT_PUBLIC_API_BASE_URL

## Firebase setup

1. Enable Authentication with Email/Password and Google sign-in.
2. Create a Firestore database and deploy rules from [frontend/firebase.rules](frontend/firebase.rules).
3. Create a Storage bucket and deploy rules from [frontend/storage.rules](frontend/storage.rules).
4. Deploy Firestore indexes from [frontend/firestore.indexes.json](frontend/firestore.indexes.json).

## CI/CD

GitHub Actions is already scaffolded in [.github/workflows/ci.yml](.github/workflows/ci.yml). It validates backend tests and the frontend build on push and pull requests.

## Google Cloud Run

Use the Dockerfiles with a Cloud Run service using the following environment variables:

- CITYBRAIN_GEMINI__API_KEY
- CITYBRAIN_FIREBASE__PROJECT_ID
- CITYBRAIN_GOOGLE_MAPS__API_KEY
- CITYBRAIN_CORS__ALLOWED_ORIGINS
