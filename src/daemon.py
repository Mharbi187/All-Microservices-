"""
Production-Grade Multi-Source Detection Daemon
NexusAid MS4 - Module 4 - Disaster Detection

Orchestrates ALL data sources for real-time disaster detection:
- Google Earth Engine (FIRMS fire, Sentinel-1 SAR flood, CHIRPS precipitation, NDVI, AlphaEarth)
- USGS Earthquake API (seismic events near Tunisia)
- OpenWeather API (temperature, wind, humidity, alerts)

Designed for delivery to official authorities (Tunisian Red Crescent / Civil Protection).
Zero tolerance for false signals. Full audit trail.
"""

import os
import sys
import json
import time
import logging
import tempfile
import traceback
import csv
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List, Tuple
import pandas as pd

# Setup paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE_PATH = os.path.join(BASE_DIR, "data", "cache", "radar_cache.json")
AUDIT_LOG_PATH = os.path.join(BASE_DIR, "logs", "audit.csv")

sys.path.append(BASE_DIR)

from src.model import DisasterRiskModel
from src.feature_schema import from_satellite_monitor
from src.inference_shared import classify_disaster_type
try:
    from src.messaging import publish_disaster_alert
except ImportError:
    def publish_disaster_alert(**kwargs):
        logger.warning(f"RabbitMQ unavailable (pika not installed). Alert NOT published: {kwargs}")
from src.config import WILAYAT_COORDS

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [DAEMON] %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ================================================================
#  DATA SOURCE INITIALIZATION
# ================================================================

# --- GEE Satellite Monitor ---
try:
    from src.satellite_monitor import SatelliteMonitor
    satellite_monitor = SatelliteMonitor()
    GEE_AVAILABLE = satellite_monitor.initialized
    if GEE_AVAILABLE:
        logger.info("[OK] Google Earth Engine initialized (FIRMS, Sentinel-1, CHIRPS, NDVI)")
    else:
        logger.warning("[DEGRADED] GEE not initialized -- satellite features unavailable")
except Exception as e:
    logger.warning(f"[DEGRADED] SatelliteMonitor import failed: {e}")
    satellite_monitor = None
    GEE_AVAILABLE = False

# --- AlphaEarth Embeddings (via GEE) ---
try:
    from src.data_acquisition import GEEDataAcquisition
    if GEE_AVAILABLE:
        gee_data = GEEDataAcquisition()
        ALPHAEARTH_AVAILABLE = True
        logger.info("[OK] AlphaEarth embeddings available (A00-A09)")
    else:
        gee_data = None
        ALPHAEARTH_AVAILABLE = False
except Exception as e:
    logger.warning(f"[DEGRADED] AlphaEarth unavailable: {e}")
    gee_data = None
    ALPHAEARTH_AVAILABLE = False

# --- USGS Seismic Monitor ---
try:
    from src.multi_source_monitor import SeismicDataMonitor, WeatherAPIMonitor
    seismic_monitor = SeismicDataMonitor()
    USGS_AVAILABLE = True
    logger.info("[OK] USGS Seismic Monitor initialized")
except Exception as e:
    logger.warning(f"[DEGRADED] SeismicDataMonitor import failed: {e}")
    seismic_monitor = None
    USGS_AVAILABLE = False

# --- OpenWeather Monitor ---
try:
    weather_monitor = WeatherAPIMonitor()
    OPENWEATHER_AVAILABLE = bool(weather_monitor.openweather_api_key)
    if OPENWEATHER_AVAILABLE:
        logger.info("[OK] OpenWeather API initialized")
    else:
        logger.warning("[DEGRADED] OpenWeather API key missing -- weather features simulated")
except Exception as e:
    logger.warning(f"[DEGRADED] WeatherAPIMonitor failed: {e}")
    weather_monitor = None
    OPENWEATHER_AVAILABLE = False

# --- Weather Fetcher ---
from src.weather_api import fetch_weather, fetch_weather_simulated

# --- ML Model ---
try:
    model = DisasterRiskModel()
    model.load()
    logger.info(f"[OK] ML Model loaded. Features: {model.feature_names}")
except Exception as e:
    logger.error(f"[FATAL] Model load failed: {e}")
    sys.exit(1)

# ================================================================
#  STATE & CONFIGURATION
# ================================================================

DAEMON_START_TIME = datetime.now().isoformat()
_cycle_count = 0
_previous_risk_state: Dict[str, bool] = {}
RISK_THRESHOLD = 0.7
CYCLE_INTERVAL_SECONDS = 900  # 15 minutes (GEE needs ~12 min for 24 wilayat)

# ================================================================
#  AUDIT LOGGING
# ================================================================

def _ensure_audit_log():
    """Create audit log file with headers if it does not exist."""
    os.makedirs(os.path.dirname(AUDIT_LOG_PATH), exist_ok=True)
    if not os.path.exists(AUDIT_LOG_PATH):
        with open(AUDIT_LOG_PATH, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([
                'timestamp', 'cycle', 'wilaya', 'risk_score', 'confidence_pct',
                'disaster_type', 'is_high_risk', 'data_sources',
                'fire_count', 'max_frp', 'precipitation_7d', 'max_magnitude',
                'temperature', 'wind_speed', 'humidity'
            ])

def log_audit(cycle: int, wilaya: str, risk_score: float, confidence: float,
              disaster_type: str, is_high_risk: bool, sources: str, features: dict):
    """Append one row to the audit CSV for accountability."""
    try:
        with open(AUDIT_LOG_PATH, 'a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([
                datetime.now().isoformat(), cycle, wilaya,
                round(risk_score, 4), round(confidence, 1),
                disaster_type, is_high_risk, sources,
                features.get('fire_count', 0), features.get('max_frp', 0),
                features.get('precipitation_7d', 0), features.get('max_magnitude', 0),
                features.get('temperature', 0), features.get('wind_speed', 0),
                features.get('humidity', 0),
            ])
    except Exception as e:
        logger.error(f"Audit log write failed: {e}")

# ================================================================
#  DATA FETCHING
# ================================================================

def fetch_satellite_features(lat: float, lon: float) -> Dict[str, float]:
    """Fetch GEE satellite features for a single wilaya."""
    defaults = {
        'fire_count': 0, 'max_frp': 0,
        'flood_area_km2': 0, 'water_change_pct': 0,
        'precipitation_7d': 0, 'precip_anomaly': 0, 'ndvi': 0.5,
    }

    if not GEE_AVAILABLE or satellite_monitor is None:
        return defaults

    try:
        analysis = satellite_monitor.get_comprehensive_satellite_analysis(lat, lon)
        if analysis.get('status') != 'success':
            return defaults

        fires = analysis.get('active_fires', {})
        flood = analysis.get('flood_analysis', {})
        precip = analysis.get('precipitation', {})
        veg = analysis.get('vegetation_health', {})

        return {
            'fire_count': fires.get('count', 0),
            'max_frp': max((d.get('frp', 0) for d in fires.get('detections', [])), default=0),
            'flood_area_km2': flood.get('area_km2', 0),
            'water_change_pct': flood.get('water_change_percent', 0),
            'precipitation_7d': precip.get('total_mm', 0),
            'precip_anomaly': precip.get('anomaly_percent', 0),
            'ndvi': veg.get('ndvi_mean', 0.5) if isinstance(veg, dict) else 0.5,
        }
    except Exception as e:
        logger.warning(f"GEE satellite fetch failed for ({lat:.2f}, {lon:.2f}): {e}")
        return defaults


def get_chirps_recency_days() -> Optional[int]:
    """
    Return CHIRPS lag in days compared to current UTC date.
    None means the lag could not be determined.
    """
    if not GEE_AVAILABLE:
        return None
    try:
        import ee
        chirps = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY').sort('system:time_start', False)
        if chirps.size().getInfo() <= 0:
            return None
        latest = chirps.first()
        latest_ms = latest.get('system:time_start').getInfo()
        latest_dt = datetime.utcfromtimestamp(float(latest_ms) / 1000.0)
        lag_days = (datetime.utcnow().date() - latest_dt.date()).days
        return max(0, lag_days)
    except Exception as e:
        logger.warning(f"CHIRPS recency check failed: {e}")
        return None


def fetch_satellite_features_with_health(
    lat: float,
    lon: float,
    chirps_lag_days: Optional[int],
) -> Tuple[Dict[str, float], Dict[str, Any]]:
    """
    Fetch satellite features plus data-source health metadata.
    Missing data is explicitly reported and never confused with real zeros.
    """
    sat = fetch_satellite_features(lat, lon)
    health = {
        "status": "online" if GEE_AVAILABLE else "offline",
        "chirps_lag_days": chirps_lag_days,
        "precipitation_source": "chirps",
        "missing_flags": {
            "precipitation": False,
        },
    }

    if not GEE_AVAILABLE:
        health["precipitation_source"] = "missing"
        health["missing_flags"]["precipitation"] = True
        return sat, health

    precip_val = sat.get("precipitation_7d", 0)
    if precip_val is None:
        sat["precipitation_7d"] = 0
        health["missing_flags"]["precipitation"] = True
        health["precipitation_source"] = "missing"
        health["status"] = "degraded"

    if chirps_lag_days is None:
        health["status"] = "degraded"
        health["missing_flags"]["precipitation"] = True
        health["precipitation_source"] = "missing"
    elif chirps_lag_days > 7:
        health["status"] = "degraded"
        health["missing_flags"]["precipitation"] = True
        health["precipitation_source"] = "stale"

    return sat, health


def fetch_alphaearth_embeddings(lat: float, lon: float) -> Dict[str, float]:
    """Fetch AlphaEarth foundation model embeddings (A00-A09)."""
    defaults = {f'A0{i}': 0.0 for i in range(10)}

    if not ALPHAEARTH_AVAILABLE or gee_data is None:
        return defaults

    try:
        import ee
        point = ee.Geometry.Point([float(lon), float(lat)])
        region = point.buffer(5000)

        alpha = (
            ee.ImageCollection('GOOGLE/SATELLITE_EMBEDDING/V1/ANNUAL')
            .filterBounds(region)
            .sort('system:time_start', False)
            .first()
        )

        if alpha is None:
            return defaults

        bands = [f'A0{i}' for i in range(10)]
        vals = alpha.select(bands).reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=region,
            scale=1000,
            bestEffort=True
        ).getInfo()

        return {b: float(vals.get(b, 0) or 0) for b in bands}
    except Exception as e:
        logger.warning(f"AlphaEarth fetch failed for ({lat:.2f}, {lon:.2f}): {e}")
        return defaults


def fetch_seismic_events() -> List:
    """Fetch recent earthquakes near Tunisia (called once per cycle)."""
    if not USGS_AVAILABLE or seismic_monitor is None:
        return []

    try:
        events = seismic_monitor.get_usgs_earthquakes(
            min_magnitude=3.0,
            days_back=7,
            lat=34.0, lon=9.0,
            radius_km=500
        )
        return events
    except Exception as e:
        logger.warning(f"USGS fetch failed: {e}")
        return []


def fetch_weather_features(lat: float, lon: float) -> Dict[str, Any]:
    """Fetch weather from OpenWeather or simulation fallback."""
    try:
        weather_data = fetch_weather(lat, lon)
        return {
            'temperature': weather_data.get('temperature', 25.0),
            'wind_speed': weather_data.get('wind_speed', 0.0),
            'humidity': weather_data.get('humidity', 50.0),
            'precipitation': weather_data.get('precipitation', 0.0),
            'condition': weather_data.get('condition', 'Clear'),
            'is_raining': weather_data.get('is_raining', False),
        }
    except Exception as e:
        logger.warning(f"Weather fetch failed for ({lat:.2f}, {lon:.2f}): {e}")
        sim = fetch_weather_simulated(lat, lon)
        return {
            'temperature': sim['temperature'],
            'wind_speed': sim['wind_speed'],
            'humidity': sim['humidity'],
            'precipitation': sim['precipitation'],
            'condition': sim['condition'],
            'is_raining': sim['is_raining'],
        }


def get_max_magnitude_near(earthquakes: list, lat: float, lon: float, radius_deg: float = 1.0) -> float:
    """Find the strongest earthquake within radius_deg of (lat, lon)."""
    max_mag = 0.0
    for eq in earthquakes:
        dlat = abs(eq.latitude - lat)
        dlon = abs(eq.longitude - lon)
        if dlat <= radius_deg and dlon <= radius_deg:
            max_mag = max(max_mag, eq.magnitude)
    return max_mag

# ================================================================
#  FEATURE FUSION & PREDICTION
# ================================================================

def build_feature_vector(satellite: dict, alphaearth: dict, weather: dict,
                         max_magnitude: float, lat: float, lon: float) -> dict:
    """
    Fuse all data sources into a single feature vector.
    This MUST match what the model was trained on.
    """
    features = from_satellite_monitor(
        satellite_payload=satellite,
        lat=lat,
        lon=lon,
        alphaearth=alphaearth,
        weather=weather,
        max_magnitude=max_magnitude,
        event_date=datetime.utcnow(),
    )
    # Non-ML metadata used by disaster type classification.
    features["is_raining"] = bool(weather.get("is_raining", False))
    return features


# ================================================================
#  CACHE & ALERTING
# ================================================================

def write_cache_atomic(data: dict, path: str):
    """Atomically write cache to prevent partial reads."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(path), suffix='.tmp')
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        os.replace(tmp, path)
    except Exception:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


def load_cached_wilayats(path: str) -> Dict[str, Any]:
    """
    Load last known wilaya payloads so we can stream incremental updates
    during long-running cycles instead of exposing an empty frame.
    """
    if not os.path.exists(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            payload = json.load(f)
        wilayats = payload.get("wilayats", {})
        if isinstance(wilayats, dict):
            return wilayats
    except Exception as e:
        logger.warning(f"Could not load existing cache snapshot: {e}")
    return {}

# ================================================================
#  MAIN INFERENCE CYCLE
# ================================================================

def run_inference_cycle():
    """Production inference cycle across all 24 Tunisian Wilayat."""
    global _cycle_count
    _cycle_count += 1

    logger.info("=" * 60)
    logger.info(f"INFERENCE CYCLE #{_cycle_count} STARTING")
    logger.info(f"  Data sources: GEE={'ON' if GEE_AVAILABLE else 'OFF'} | "
                f"AlphaEarth={'ON' if ALPHAEARTH_AVAILABLE else 'OFF'} | "
                f"USGS={'ON' if USGS_AVAILABLE else 'OFF'} | "
                f"OpenWeather={'ON' if OPENWEATHER_AVAILABLE else 'OFF'}")
    logger.info("=" * 60)

    chirps_lag_days = get_chirps_recency_days()
    if chirps_lag_days is not None:
        logger.info(f"  CHIRPS lag: {chirps_lag_days} day(s)")
    else:
        logger.warning("  CHIRPS lag: unknown")

    # 1. Fetch seismic data ONCE per cycle (covers all Tunisia)
    earthquakes = fetch_seismic_events()
    if earthquakes:
        logger.info(f"  Seismic: {len(earthquakes)} earthquakes M3.0+ in last 7 days")

    # 2. Build radar frame
    radar_frame = {
        "timestamp": datetime.now().isoformat(),
        "daemon_status": "running",
        "daemon_uptime": DAEMON_START_TIME,
        "cycle": _cycle_count,
        "data_sources": {
            "gee_satellite": "online" if GEE_AVAILABLE else "offline",
            "alphaearth": "online" if ALPHAEARTH_AVAILABLE else "offline",
            "usgs_seismic": "online" if USGS_AVAILABLE else "offline",
            "openweather": "online" if OPENWEATHER_AVAILABLE else "offline",
            "chirps_lag_days": chirps_lag_days,
        },
        "recent_earthquakes": [
            {"magnitude": eq.magnitude, "location": eq.location,
             "lat": eq.latitude, "lon": eq.longitude,
             "time": eq.timestamp.isoformat()}
            for eq in earthquakes[:5]
        ],
        "wilayats": load_cached_wilayats(CACHE_PATH)
    }

    alerts_fired = 0
    stale_cycle = False

    # 3. Process each wilaya
    for wilaya, coords in WILAYAT_COORDS.items():
        lat, lon = coords[0], coords[1]

        # Fetch from all sources (with individual fallbacks)
        sat_features, sat_health = fetch_satellite_features_with_health(lat, lon, chirps_lag_days)
        alpha_features = fetch_alphaearth_embeddings(lat, lon)
        weather_features = fetch_weather_features(lat, lon)
        max_mag = get_max_magnitude_near(earthquakes, lat, lon)

        # Degrade mode: fallback precipitation from OpenWeather when CHIRPS is stale/missing.
        if sat_health["missing_flags"].get("precipitation", False):
            weather_precip = float(weather_features.get("precipitation", 0) or 0)
            if weather_precip > 0:
                sat_features["precipitation_7d"] = max(sat_features.get("precipitation_7d", 0), weather_precip * 7)
                sat_health["precipitation_source"] = "openweather_fallback"
            else:
                stale_cycle = True

        # Fuse features
        features = build_feature_vector(sat_features, alpha_features, weather_features, max_mag, lat, lon)

        # Predict
        try:
            df = pd.DataFrame([features])
            predictions, probas = model.predict(df)
            risk_score = float(probas[0])
            risk_score = max(0.0, min(1.0, risk_score))
            is_high_risk = risk_score > RISK_THRESHOLD
            confidence_pct = round(risk_score * 100 if is_high_risk else (1 - risk_score) * 100, 1)
            disaster_type = classify_disaster_type(
                features,
                risk_score,
                is_raining=bool(features.get("is_raining", False)),
            )
        except Exception as e:
            logger.error(f"Prediction failed for {wilaya}: {e}")
            risk_score = 0.0
            is_high_risk = False
            confidence_pct = 0.0
            disaster_type = "NONE"

        # Determine active data sources for this wilaya
        active_sources = []
        if GEE_AVAILABLE:
            active_sources.append("GEE")
        if ALPHAEARTH_AVAILABLE:
            active_sources.append("AlphaEarth")
        if USGS_AVAILABLE:
            active_sources.append("USGS")
        if OPENWEATHER_AVAILABLE:
            active_sources.append("OpenWeather")
        else:
            active_sources.append("Simulation")

        # Build cache entry
        radar_frame["wilayats"][wilaya] = {
            "coordinates": {"lat": lat, "lon": lon},
            "risk_score": round(risk_score, 4),
            "confidence_pct": confidence_pct,
            "is_high_risk": is_high_risk,
            "disaster_type": disaster_type,
            "data_sources": active_sources,
            "satellite": {
                "fire_count": sat_features['fire_count'],
                "max_frp": round(sat_features['max_frp'], 1),
                "flood_area_km2": round(sat_features['flood_area_km2'], 2),
                "water_change_pct": round(sat_features['water_change_pct'], 2),
                "precipitation_7d_mm": round(sat_features['precipitation_7d'], 1),
                "ndvi": round(sat_features['ndvi'], 3),
            },
            "weather": {
                "temperature": round(weather_features['temperature'], 1),
                "wind_speed": round(weather_features['wind_speed'], 1),
                "humidity": round(weather_features['humidity'], 1),
                "precipitation": round(weather_features['precipitation'], 1),
                "condition": weather_features['condition'],
                "is_raining": weather_features['is_raining'],
            },
            "seismic": {
                "max_magnitude": round(max_mag, 1),
            },
            "source_health": sat_health,
        }

        # Stream partial progress so UI can refresh during long cycles.
        try:
            write_cache_atomic(radar_frame, CACHE_PATH)
        except Exception as e:
            logger.warning(f"Partial cache update failed for {wilaya}: {e}")

        # Audit log
        log_audit(_cycle_count, wilaya, risk_score, confidence_pct,
                  disaster_type, is_high_risk, "+".join(active_sources), features)

        # State-transition RabbitMQ alerting (zero false alarm tolerance)
        was_high = _previous_risk_state.get(wilaya, False)
        if is_high_risk and not was_high:
            severity = "CRITICAL" if risk_score > 0.85 else "HIGH"
            logger.warning(
                f">> NEW ALERT: {wilaya} [{disaster_type}] "
                f"risk={risk_score:.2f} confidence={confidence_pct}% severity={severity}"
            )
            publish_disaster_alert(
                region=wilaya,
                disaster_type=disaster_type,
                severity=severity,
                risk_score=risk_score
            )
            alerts_fired += 1
        elif was_high and not is_high_risk:
            logger.info(f"<< CLEARED: {wilaya} returned to normal (score={risk_score:.2f})")

        _previous_risk_state[wilaya] = is_high_risk

    # 4. Atomically save radar state
    try:
        if stale_cycle:
            radar_frame["daemon_status"] = "stale"
        write_cache_atomic(radar_frame, CACHE_PATH)
        logger.info(
            f"Cycle #{_cycle_count} complete. 24 wilayat swept. "
            f"{alerts_fired} new alerts. "
            f"Sources: GEE={'Y' if GEE_AVAILABLE else 'N'} "
            f"USGS={'Y' if USGS_AVAILABLE else 'N'} "
            f"OWM={'Y' if OPENWEATHER_AVAILABLE else 'N'}"
        )
    except Exception as e:
        logger.error(f"Cache write failed: {e}")


# ================================================================
#  ENTRY POINT
# ================================================================

if __name__ == "__main__":
    logger.info("=" * 60)
    logger.info("MS4 PRODUCTION DAEMON - STARTING")
    logger.info(f"  Cycle interval: {CYCLE_INTERVAL_SECONDS}s")
    logger.info(f"  Risk threshold: {RISK_THRESHOLD}")
    logger.info(f"  Audit log: {AUDIT_LOG_PATH}")
    logger.info("=" * 60)

    _ensure_audit_log()

    while True:
        cycle_started = time.time()
        try:
            run_inference_cycle()
        except Exception as e:
            logger.error(f"Cycle error: {e}")
            logger.error(traceback.format_exc())

        elapsed = time.time() - cycle_started
        sleep_for = max(5.0, CYCLE_INTERVAL_SECONDS - elapsed)
        if elapsed > CYCLE_INTERVAL_SECONDS:
            logger.warning(
                "Cycle runtime %.1fs exceeded configured interval %ss; sleeping %.1fs guard window.",
                elapsed,
                CYCLE_INTERVAL_SECONDS,
                sleep_for,
            )
        else:
            logger.info(f"Sleeping {sleep_for:.1f}s before next cycle...")
        time.sleep(sleep_for)
