<div align="center">

# 🚀 Deployment Guide
### CityBrain AI

![Local](https://img.shields.io/badge/local-supported-brightgreen) ![Docker](https://img.shields.io/badge/docker-supported-2496ED) ![Cloud Run](https://img.shields.io/badge/Google%20Cloud%20Run-supported-4285F4)

</div>

---

## Table of Contents

- [Local Deployment](#local-deployment)
- [Docker Deployment](#docker-deployment)
- [Environment Variables](#environment-variables)
- [Firebase Setup](#firebase-setup)
- [CI/CD](#cicd)
- [Google Cloud Run](#google-cloud-run)

---

## Local Deployment

**1. Configure environment variables**

Copy [`.env.example`](.env.example) to `.env`.

```bash
cp .env.example .env
```

**2. Start the backend**

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**3. Start the frontend**

```bash
cd frontend
npm run dev
```

---

## Docker Deployment

```bash
docker compose up --build
```

---

## Environment Variables

Copy [`.env.example`](.env.example) to `.env` and populate all values before deployment.

### Backend

| Variable | Purpose |
|---|---|
| `CITYBRAIN_APPLICATION__ENVIRONMENT` | Application environment (e.g. `local`, `production`) |
| `CITYBRAIN_APPLICATION__PROJECT_NAME` | Project name used by the runtime |
| `CITYBRAIN_GEMINI__API_KEY` | Gemini API key for AI agent calls |
| `CITYBRAIN_FIREBASE__PROJECT_ID` | Firebase project ID |
| `CITYBRAIN_FIREBASE__STORAGE_BUCKET` | Firebase Storage bucket name |
| `CITYBRAIN_GOOGLE_MAPS__API_KEY` | Google Maps API key |
| `CITYBRAIN_SECURITY__JWT_SECRET_KEY` | Secret key for JWT signing |

### Frontend

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket name |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Cloud Messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app ID |
| `NEXT_PUBLIC_API_BASE_URL` | Base URL the frontend uses to reach the backend API |

---

## Firebase Setup

1. Enable **Authentication** with Email/Password and Google sign-in.
2. Create a **Firestore** database and deploy rules from [`frontend/firebase.rules`](frontend/firebase.rules).
3. Create a **Storage** bucket and deploy rules from [`frontend/storage.rules`](frontend/storage.rules).
4. Deploy **Firestore indexes** from [`frontend/firestore.indexes.json`](frontend/firestore.indexes.json).

---

## CI/CD

GitHub Actions is scaffolded in [`.github/workflows/ci.yml`](.github/workflows/ci.yml). It validates backend tests and the frontend build on every push and pull request.

---

## Google Cloud Run

Deploy using the provided Dockerfiles with a Cloud Run service, configured with the following environment variables:

| Variable | Purpose |
|---|---|
| `CITYBRAIN_GEMINI__API_KEY` | Gemini API key for AI agent calls |
| `CITYBRAIN_FIREBASE__PROJECT_ID` | Firebase project ID |
| `CITYBRAIN_GOOGLE_MAPS__API_KEY` | Google Maps API key |
| `CITYBRAIN_CORS__ALLOWED_ORIGINS` | Allowed CORS origins for the deployed API |
