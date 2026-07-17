# CityBrain AI Release Guide

## Overview
CityBrain AI is a production-ready civic operations platform with a Next.js frontend, FastAPI backend, Firebase integration, and Gemini-powered multi-agent runtime.

## Prerequisites
- Node.js 20+
- Python 3.11+
- Firebase project with Authentication, Firestore, and Storage enabled
- Gemini API key
- Google Maps API key (optional for the current UI experience, recommended for production)

## Environment Variables
Copy [.env.example](.env.example) to `.env` and populate the values before deployment.

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

## Firebase Setup
1. Enable Authentication with Email/Password and Google sign-in.
2. Create Firestore database and deploy rules from [frontend/firebase.rules](frontend/firebase.rules).
3. Create Storage bucket and deploy rules from [frontend/storage.rules](frontend/storage.rules).
4. Deploy Firestore indexes from [frontend/firestore.indexes.json](frontend/firestore.indexes.json).

## Backend Deployment
The backend can be deployed to Cloud Run, Docker, or a standard server using the existing FastAPI entrypoint.

Recommended production command:
```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Frontend Deployment
The frontend is built with Next.js and can be deployed to Vercel or any Node-compatible hosting provider.

Build command:
```bash
cd frontend
npm install
npm run build
```

## CI/CD
GitHub Actions is already scaffolded in [.github/workflows/ci.yml](.github/workflows/ci.yml). It validates backend tests and frontend build on push and pull requests.

## Hackathon Submission Checklist
- Confirm Firebase config values are populated.
- Confirm Gemini API key is available.
- Confirm backend URL is reachable from the frontend.
- Confirm authentication flows work for email and Google sign-in.
- Confirm Firestore and Storage rules are deployed.
- Confirm the app builds and tests pass.
- Confirm demo routes work end to end.
