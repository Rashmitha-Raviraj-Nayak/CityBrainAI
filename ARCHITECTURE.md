# Architecture

## Overview

CityBrain AI follows the existing shared-state architecture. Incident intake flows through a FastAPI runtime that invokes a supervisor-led workflow of specialist agents. The runtime emits structured traces and a decision payload for the frontend.

## Runtime flow

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

## Components

- Frontend: Next.js and Tailwind-based operator experience
- Backend: FastAPI application with middleware, metrics, security headers, and runtime orchestration
- Agents: Specialist modules working over shared IncidentState
- Configuration: Environment-driven settings for Gemini, Firebase, Maps, and security
