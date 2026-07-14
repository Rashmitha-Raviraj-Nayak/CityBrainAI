"""Bounded Google Maps enrichment for high-severity incidents."""

from __future__ import annotations

from functools import lru_cache

try:
    import googlemaps
except Exception:  # pragma: no cover - optional dependency for local tests
    googlemaps = None  # type: ignore[assignment]

from app.config import settings


if googlemaps is not None:
    gmaps = googlemaps.Client(key=settings.maps_api_key)
else:
    gmaps = None


@lru_cache(maxsize=256)
def nearby_critical_infrastructure(lat_rounded: float, lng_rounded: float) -> tuple[str, ...]:
    """Return a small list of nearby critical infrastructure names for the given area."""

    if gmaps is None:
        return ()

    try:
        results = gmaps.places_nearby(
            location=(lat_rounded, lng_rounded),
            radius=1500,
            keyword="hospital|school|government office",
        )
    except Exception:
        return ()

    return tuple(item["name"] for item in results.get("results", [])[:5] if isinstance(item, dict) and item.get("name"))


def enrich_if_needed(lat: float | None, lng: float | None, severity: str | None) -> list[str]:
    """Enrich only for high or critical incidents with available GPS coordinates."""

    if severity not in {"high", "critical"} or lat is None or lng is None:
        return []
    return list(nearby_critical_infrastructure(round(lat, 3), round(lng, 3)))
