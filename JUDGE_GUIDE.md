# Judge Guide

## Key questions

- Why Google ADK? The project is structured around a modular, agent-driven runtime that preserves an extensible orchestration pattern suitable for ADK integration.
- Why Gemini Pro vs Flash? The architecture uses lightweight routing with Flash and more detailed reasoning with Pro-ready abstractions.
- How do you prevent hallucinations? The system uses structured outputs, validation, deterministic fallbacks, and human review paths.
- How is explainability handled? Each agent emits reasoning decisions and the frontend surfaces an explainability trace.
- How is data protected? The project uses environment-based secrets, security headers, and a conservative architecture that avoids hardcoded credentials.
