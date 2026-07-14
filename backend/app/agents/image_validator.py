"""Server-side image validation and scrubbing before Gemini analysis."""

from __future__ import annotations

import io

from PIL import Image

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024


class ImageValidationError(Exception):
    """Raised when an uploaded image is invalid or unsafe for downstream processing."""


def validate_and_scrub(image_bytes: bytes, mime_type: str) -> tuple[bytes, dict]:
    """Validate size and MIME type, then strip EXIF metadata from the image."""

    if mime_type not in ALLOWED_MIME_TYPES:
        raise ImageValidationError(f"Unsupported MIME type: {mime_type}")
    if len(image_bytes) > MAX_FILE_SIZE_BYTES:
        raise ImageValidationError("Image exceeds 10MB limit")

    image = Image.open(io.BytesIO(image_bytes))
    width, height = image.size

    scrubbed = Image.new(image.mode, image.size)
    scrubbed.putdata(list(image.getdata()))
    buffer = io.BytesIO()
    scrubbed.save(buffer, format=image.format or "PNG")

    quality_metadata = {
        "width": width,
        "height": height,
        "image_quality_score": min((width * height) / (1280 * 720), 1.0),
    }
    return buffer.getvalue(), quality_metadata
