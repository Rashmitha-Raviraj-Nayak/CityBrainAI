# API Reference

## Runtime

### POST /api/v1/run

Submit a civic incident for processing.

Request body:

```json
{
  "title": "Blocked storm drain",
  "description": "Water is pooling near the intersection",
  "category": "infrastructure",
  "location": "Downtown District",
  "source": "citizen_report",
  "severity_hint": 7,
  "metadata": {"channel": "web"}
}
```

Response:

```json
{
  "workflow_id": "...",
  "decision": {
    "recommended_action": "Assign a field team"
  },
  "explanation": {
    "summary": "..."
  },
  "validation": {
    "is_valid": true
  }
}
```

## Health

- GET /health
- GET /health/ready
- GET /metrics
