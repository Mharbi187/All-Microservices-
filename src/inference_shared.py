"""
Shared inference helpers for MS4 daemon/API/workflows.

This module centralizes:
- Canonical feature inference from sampled GEE rows
- Disaster type classification logic
- Alert candidate capping and deduplication
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, List, Mapping, Optional, Tuple

import numpy as np
import pandas as pd

from src.feature_schema import from_sampled_row

logger = logging.getLogger(__name__)


def classify_disaster_type(
    features: Mapping[str, Any],
    risk_score: float,
    is_raining: bool = False,
) -> str:
    """
    Determine the likely disaster type from canonical features and weather support.
    """
    if risk_score < 0.5:
        return "NONE"

    precip_7d = float(features.get("precipitation_7d", 0) or 0)
    flood_area = float(features.get("flood_area_km2", 0) or 0)
    water_change = float(features.get("water_change_pct", 0) or 0)
    fire_count = float(features.get("fire_count", 0) or 0)
    max_frp = float(features.get("max_frp", 0) or 0)
    max_magnitude = float(features.get("max_magnitude", 0) or 0)
    wind_speed = float(features.get("wind_speed", 0) or 0)

    raining_now = bool(is_raining or features.get("is_raining", False))
    is_dry_day = (precip_7d < 5.0) and (not raining_now)

    flood_score = (precip_7d / 50.0) + (flood_area / 10.0) + (water_change * 2.0)
    if is_dry_day:
        flood_score *= 0.1

    scores = {
        "WILDFIRE": fire_count * 0.4 + max_frp / 100.0,
        "FLOOD": flood_score,
        "EARTHQUAKE": max_magnitude * 2.0,
        "SEVERE_STORM": wind_speed / 30.0,
    }

    best = max(scores, key=scores.get)
    if scores[best] < 0.1:
        return "ANOMALY"

    if is_dry_day and best == "FLOOD" and risk_score < 0.75:
        return "NONE"

    return best


def hazard_type_from_disaster_type(disaster_type: str) -> str:
    """
    Map internal disaster type labels to alert hazard taxonomy.
    """
    mapping = {
        "WILDFIRE": "wildfire",
        "FLOOD": "flood",
        "SEVERE_STORM": "storm",
        "EARTHQUAKE": "earthquake",
        "ANOMALY": "anomaly",
        "NONE": "none",
    }
    return mapping.get((disaster_type or "NONE").upper(), disaster_type.lower() if disaster_type else "none")


def _extract_lat_lon(sampled_row: Mapping[str, Any]) -> Tuple[Optional[float], Optional[float]]:
    geom = sampled_row.get(".geo")
    if isinstance(geom, Mapping):
        coords = geom.get("coordinates")
        if isinstance(coords, (list, tuple)) and len(coords) >= 2:
            try:
                return float(coords[1]), float(coords[0])
            except (TypeError, ValueError):
                pass

    lat = sampled_row.get("lat")
    lon = sampled_row.get("lon")
    if lat is not None and lon is not None:
        try:
            return float(lat), float(lon)
        except (TypeError, ValueError):
            return None, None

    return None, None


def predict_sampled_dataframe(
    sampled_df: pd.DataFrame,
    model: Any,
    data_source_health: Optional[Mapping[str, Any]] = None,
    event_date: Optional[datetime] = None,
    risk_threshold: float = 0.7,
    fallback_lat: float = 34.0,
    fallback_lon: float = 9.0,
) -> pd.DataFrame:
    """
    Run model inference on raw GEE sampled dataframe and emit canonical outputs.
    """
    if sampled_df.empty:
        return pd.DataFrame(
            columns=[
                "lat",
                "lon",
                "risk_score",
                "is_high_risk",
                "disaster_type",
                "hazard_type",
                "data_source_health",
            ]
        )

    now = event_date or datetime.utcnow()
    canonical_rows: List[Dict[str, float]] = []
    point_meta: List[Tuple[float, float]] = []
    point_labels: List[str] = []

    for _, row in sampled_df.iterrows():
        row_dict = row.to_dict()
        lat, lon = _extract_lat_lon(row_dict)
        lat = fallback_lat if lat is None else lat
        lon = fallback_lon if lon is None else lon
        canonical_rows.append(from_sampled_row(row_dict, lat=lat, lon=lon, event_date=now))
        point_meta.append((lat, lon))
        point_labels.append(str(row_dict.get("wilaya") or row_dict.get("location") or f"{lat:.3f},{lon:.3f}"))

    canonical_df = pd.DataFrame(canonical_rows)
    if canonical_df.empty:
        return pd.DataFrame()

    try:
        _, probabilities = model.predict(canonical_df)
        risk_scores = np.asarray(probabilities, dtype=float)
    except Exception as exc:
        logger.error("Shared inference model.predict failed: %s", exc)
        risk_scores = np.zeros(len(canonical_df), dtype=float)

    records: List[Dict[str, Any]] = []
    shared_health = dict(data_source_health or {})

    for idx, features in canonical_df.iterrows():
        risk = float(np.clip(risk_scores[idx], 0.0, 1.0))
        disaster_type = classify_disaster_type(features.to_dict(), risk_score=risk)
        hazard_type = hazard_type_from_disaster_type(disaster_type)
        lat, lon = point_meta[idx]
        location_name = point_labels[idx]

        records.append(
            {
                "lat": lat,
                "lon": lon,
                "location_name": location_name,
                "risk_score": risk,
                "is_high_risk": risk >= risk_threshold,
                "disaster_type": disaster_type,
                "hazard_type": hazard_type,
                "data_source_health": shared_health,
            }
        )

    return pd.DataFrame(records)


def select_alert_candidates(
    predictions: pd.DataFrame,
    max_alerts: int = 5,
    dedupe_precision: int = 2,
    min_risk: float = 0.8,
) -> List[Dict[str, Any]]:
    """
    Select capped/deduplicated high-risk alerts from prediction dataframe.
    """
    if predictions.empty:
        return []

    high = predictions[(predictions["is_high_risk"] == True) & (predictions["risk_score"] >= min_risk)].copy()
    if high.empty:
        return []

    high = high.sort_values("risk_score", ascending=False)
    deduped: List[Dict[str, Any]] = []
    seen = set()

    for _, row in high.iterrows():
        disaster_type = str(row.get("disaster_type", "NONE"))
        key = (
            disaster_type,
            round(float(row.get("lat", 0.0)), dedupe_precision),
            round(float(row.get("lon", 0.0)), dedupe_precision),
        )
        if key in seen:
            continue
        seen.add(key)
        deduped.append(
            {
                "hazard_type": str(row.get("hazard_type", "none")),
                "disaster_type": disaster_type,
                "lat": float(row.get("lat", 0.0)),
                "lon": float(row.get("lon", 0.0)),
                "location_name": str(row.get("location_name", "Unknown")),
                "risk_score": float(row.get("risk_score", 0.0)),
                "data_source_health": row.get("data_source_health", {}),
            }
        )
        if len(deduped) >= max_alerts:
            break

    return deduped
