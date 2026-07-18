<div align="center">

# 🏗️ CityBrain AI — Architecture

![Style](https://img.shields.io/badge/architecture-shared--state-blue) ![Runtime](https://img.shields.io/badge/runtime-FastAPI-009688) ![Frontend](https://img.shields.io/badge/frontend-Next.js-black)

</div>

## Overview

CityBrain AI follows a **shared-state architecture**. Incident intake flows through a FastAPI runtime that invokes a supervisor-led workflow of specialist agents. The runtime emits structured traces and a decision payload consumed by the frontend.

---

## Runtime Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as FastAPI API
    participant R as CityRuntime
    participant S as Supervisor Agent
    participant V as Vision / Understanding / Prediction / Decision / Validation

    U->>F: Submit incident
    F->>A: POST /api/v1/run
    A->>R: Execute workflow
    R->>S: Plan and route
    S->>V: Run specialist agents
    V-->>S: Structured outputs
    S-->>R: Decision and validation
    R-->>A: Runtime response
    A-->>F: Decision, explanation, validation
    F-->>U: Render dashboard and explainability
```

---

## Components

| Layer | Description |
|---|---|
| **Frontend** | Next.js and Tailwind-based operator experience |
| **Backend** | FastAPI application with middleware, metrics, security headers, and runtime orchestration |
| **Agents** | Specialist modules working over shared `IncidentState` |
| **Configuration** | Environment-driven settings for Gemini, Firebase, Maps, and security |
