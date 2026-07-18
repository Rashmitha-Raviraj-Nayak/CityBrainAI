<div align="center">

# 📡 CityBrain AI — API Reference

![Version](https://img.shields.io/badge/api-v1-blue) ![Status](https://img.shields.io/badge/status-stable-brightgreen)

</div>

Base URL (local development):

```
http://localhost:8000
```

---

## Table of Contents

- [Runtime](#runtime)
  - [`POST /api/v1/run`](#post-apiv1run)
- [Health & Observability](#health--observability)
  - [`GET /health`](#get-health)
  - [`GET /health/ready`](#get-healthready)
  - [`GET /metrics`](#get-metrics)

---

## Runtime

### `POST /api/v1/run`

Submits a civic incident to the multi-agent runtime for processing. The runtime routes the incident through vision, understanding, prediction, decision, and explainability agents, and returns a structured decision payload.

**Endpoint**

```
POST /api/v1/run
```

**Request Body**

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | `string` | Yes | Short human-readable title for the incident |
| `description` | `string` | Yes | Free-text description of the incident |
| `category` | `string` | Yes | Incident category (e.g. `infrastructure`) |
| `location` | `string` | Yes | Location label for the incident |
| `source` | `string` | Yes | Origin of the report (e.g. `citizen_report`) |
| `severity_hint` | `integer` | No | Optional caller-supplied severity estimate (0–10 scale) |
| `metadata` | `object` | No | Free-form key/value metadata (e.g. `channel`) |

**Example Request**

```json
{
  "title": "Blocked storm drain",
  "description": "Water is pooling near the intersection",
  "category": "infrastructure",
  "location": "Downtown District",
  "source": "citizen_report",
  "severity_hint": 7,
  "metadata": {
    "channel": "web"
  }
}
```

**Example Response**

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

**Response Fields**

| Field | Type | Description |
|---|---|---|
| `workflow_id` | `string` | Unique identifier for the processed workflow run |
| `decision.recommended_action` | `string` | The operator-facing recommended action |
| `explanation.summary` | `string` | Human-readable explanation of the decision reasoning |
| `validation.is_valid` | `boolean` | Whether the submitted incident passed input validation |

---

## Health & Observability

Endpoints for monitoring service liveness, readiness, and runtime metrics.

### `GET /health`

Returns basic service liveness status.

```
GET /health
```

### `GET /health/ready`

Returns readiness status, indicating whether the service is fully initialized and able to accept traffic.

```
GET /health/ready
```

### `GET /metrics`

Exposes runtime metrics for observability tooling.

```
GET /metrics
```
