"""
Canonical feature schema adapters for MS4 inference/training.

All model-facing paths should emit this schema to avoid silent feature drift.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Mapping, Optional


CANONICAL_FEATURE_ORDER = [
    "fire_count",
    "max_frp",
    "flood_area_km2",
    "water_change_pct",
    "precipitation_7d",
    "precip_anomaly",
    "ndvi",
    "A00",
    "A01",
    "A02",
    "A03",
    "A04",
    "A05",
    "A06",
    "A07",
    "A08",
    "A09",
    "temperature",
    "wind_speed",
    "humidity",
    "max_magnitude",
    "lat_norm",
    "lon_norm",
    "day_of_year_norm",
]


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _compute_context(lat: float, lon: float, event_date: Optional[datetime] = None) -> Dict[str, float]:
    timestamp = event_date or datetime.utcnow()
    return {
        "lat_norm": (lat - 30.2) / (37.3 - 30.2),
        "lon_norm": (lon - 7.5) / (11.5 - 7.5),
        "day_of_year_norm": timestamp.timetuple().tm_yday / 365.0,
    }


def canonical_defaults(lat: float, lon: float, event_date: Optional[datetime] = None) -> Dict[str, float]:
    row = {key: 0.0 for key in CANONICAL_FEATURE_ORDER}
    row.update(_compute_context(lat, lon, event_date=event_date))
    return row


def from_event_features(
    event_features: Mapping[str, Any],
    lat: float,
    lon: float,
    event_date: Optional[datetime] = None,
) -> Dict[str, float]:
    """
    Adapt point-event extraction output to the canonical model schema.
    """
    row = canonical_defaults(lat, lon, event_date=event_date)

    row["precipitation_7d"] = _safe_float(
        event_features.get("chirps_7d_sum", event_features.get("precipitation_7d", 0))
    )
    row["water_change_pct"] = _safe_float(
        event_features.get("water_anomaly", event_features.get("water_change_pct", 0))
    )
    row["max_frp"] = _safe_float(event_features.get("MaxFRP", event_features.get("max_frp", 0)))
    row["flood_area_km2"] = _safe_float(event_features.get("flood_area_km2", 0))
    row["precip_anomaly"] = _safe_float(event_features.get("precip_anomaly", 0))
    row["ndvi"] = _safe_float(event_features.get("ndvi", 0))

    fire_mask = _safe_float(event_features.get("FireMask", -1), default=-1)
    if fire_mask >= 7:
        row["fire_count"] = 1.0
    else:
        row["fire_count"] = _safe_float(event_features.get("fire_count", 0))

    for band in [f"A0{i}" for i in range(10)]:
        row[band] = _safe_float(event_features.get(band, 0))

    row["temperature"] = _safe_float(event_features.get("temperature", 0))
    row["wind_speed"] = _safe_float(event_features.get("wind_speed", 0))
    row["humidity"] = _safe_float(event_features.get("humidity", 0))
    row["max_magnitude"] = _safe_float(event_features.get("max_magnitude", 0))
    return row


def from_satellite_monitor(
    satellite_payload: Mapping[str, Any],
    lat: float,
    lon: float,
    alphaearth: Optional[Mapping[str, Any]] = None,
    weather: Optional[Mapping[str, Any]] = None,
    max_magnitude: float = 0.0,
    event_date: Optional[datetime] = None,
) -> Dict[str, float]:
    """
    Adapt satellite monitor outputs to canonical model schema.
    Supports either flattened daemon satellite dict or nested analysis dict.
    """
    row = canonical_defaults(lat, lon, event_date=event_date)

    if "active_fires" in satellite_payload:
        fires = satellite_payload.get("active_fires", {})
        flood = satellite_payload.get("flood_analysis", {})
        precip = satellite_payload.get("precipitation", {})
        veg = satellite_payload.get("vegetation_health", {})

        row["fire_count"] = _safe_float(fires.get("count", 0))
        detections = fires.get("detections", []) if isinstance(fires, Mapping) else []
        row["max_frp"] = max((_safe_float(item.get("frp", 0)) for item in detections), default=0.0)
        row["flood_area_km2"] = _safe_float(flood.get("area_km2", 0))
        row["water_change_pct"] = _safe_float(flood.get("water_change_percent", 0))
        row["precipitation_7d"] = _safe_float(precip.get("total_mm", 0))
        row["precip_anomaly"] = _safe_float(precip.get("anomaly_percent", 0))
        row["ndvi"] = _safe_float(veg.get("ndvi_mean", veg.get("mean_ndvi", 0)))
    else:
        row["fire_count"] = _safe_float(satellite_payload.get("fire_count", 0))
        row["max_frp"] = _safe_float(satellite_payload.get("max_frp", 0))
        row["flood_area_km2"] = _safe_float(satellite_payload.get("flood_area_km2", 0))
        row["water_change_pct"] = _safe_float(satellite_payload.get("water_change_pct", 0))
        row["precipitation_7d"] = _safe_float(satellite_payload.get("precipitation_7d", 0))
        row["precip_anomaly"] = _safe_float(satellite_payload.get("precip_anomaly", 0))
        row["ndvi"] = _safe_float(satellite_payload.get("ndvi", 0))

    if alphaearth:
        for band in [f"A0{i}" for i in range(10)]:
            row[band] = _safe_float(alphaearth.get(band, 0))

    if weather:
        row["temperature"] = _safe_float(weather.get("temperature", 0))
        row["wind_speed"] = _safe_float(weather.get("wind_speed", 0))
        row["humidity"] = _safe_float(weather.get("humidity", 0))

    row["max_magnitude"] = _safe_float(max_magnitude, 0)
    return row


def from_sampled_row(
    sampled_row: Mapping[str, Any],
    lat: float,
    lon: float,
    event_date: Optional[datetime] = None,
) -> Dict[str, float]:
    """
    Adapt sampled composite rows (from sample_data) to canonical schema.
    """
    row = canonical_defaults(lat, lon, event_date=event_date)

    row["max_frp"] = _safe_float(sampled_row.get("MaxFRP", sampled_row.get("max_frp", 0)))
    row["precipitation_7d"] = _safe_float(
        sampled_row.get("precipitation_7d", sampled_row.get("precipitation", 0))
    )
    row["water_change_pct"] = _safe_float(
        sampled_row.get("water_change_pct", sampled_row.get("water_extent", 0))
    )
    row["fire_count"] = 1.0 if _safe_float(sampled_row.get("FireMask", 0)) >= 7 else 0.0
    row["ndvi"] = _safe_float(sampled_row.get("ndvi", 0))

    for band in [f"A0{i}" for i in range(10)]:
        row[band] = _safe_float(sampled_row.get(band, 0))
    
    # Preserving weather features if present
    for w_feat in ["temperature", "wind_speed", "humidity"]:
        if w_feat in sampled_row:
            row[w_feat] = _safe_float(sampled_row[w_feat])
            
    return row
