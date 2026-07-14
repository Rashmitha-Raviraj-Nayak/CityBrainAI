"""Request context middleware for the CityBrain AI backend.

This middleware enriches incoming requests with a request identifier and ensures the
runtime can correlate logs and tracing information across the application.
"""

from __future__ import annotations

import uuid
from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Attach a request identifier to each inbound request."""

    async def dispatch(self, request: Request, call_next: Callable[[Request], Response]) -> Response:
        """Process the request and add a request ID to the scope and response headers."""

        request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["x-request-id"] = request_id
        return response
