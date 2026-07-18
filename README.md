# CityBrain AI

CityBrain AI is an AI-powered civic operations platform that combines shared incident state, multi-agent reasoning, and an intuitive operator experience to support incident intake, triage, explainability, and decision support.

It is designed for public-sector and enterprise teams that need faster situational awareness, structured workflows, and more transparent AI-assisted decision-making.

---

## Overview

CityBrain AI enables operators to:

- Capture and structure civic incidents
- Analyze incidents using specialized AI agents
- Prioritize and predict potential outcomes
- Generate structured recommendations
- Review explainability and reasoning traces
- Support human oversight and operational decision-making

The platform combines a modern web interface with a FastAPI backend and a supervisor-led multi-agent AI workflow.

---

## Key Capabilities

- **Incident Intake**  
  Capture and process structured civic reports.

- **Multi-Agent Analysis**  
  Coordinate specialized agents for vision, understanding, prediction, decision-making, and validation.

- **Explainable AI**  
  Surface reasoning traces and structured decision paths for operator review.

- **Operational Dashboard**  
  Provide dashboards, analytics, workflow views, and administrative oversight.

- **AI and Cloud Integrations**  
  Support configurable integrations with Google Gemini, Firebase, and mapping services.

- **Human-in-the-Loop Workflows**  
  Enable validation and human review for sensitive operational decisions.

---

## System Architecture

The platform follows a frontend-to-backend workflow built around a shared incident state and a supervisor-led multi-agent pipeline.

```mermaid
flowchart LR
    User[Operator / Citizen] --> Frontend[Next.js Frontend]
    Frontend --> API[FastAPI Runtime API]
    API --> Runtime[CityRuntime]

    Runtime --> Supervisor[Supervisor Agent]

    Supervisor --> Vision[Vision Agent]
    Supervisor --> Understanding[Understanding Agent]
    Supervisor --> Prediction[Prediction Agent]
    Supervisor --> Decision[Decision Agent]
    Supervisor --> Validation[Validation Agent]

    Runtime --> Health[Health / Metrics]
