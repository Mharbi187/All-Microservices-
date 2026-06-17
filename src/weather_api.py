"""
Real-time Weather Data Client for NexusAid MS4
Uses OpenWeatherMap API with automatic simulation fallback.
"""

import os
import logging
import requests
from typing import Dict, Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "")
OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5/weather"

# Validation ranges (physically plausible for Tunisia)
FEATURE_RANGES = {
    "temperature": (-10, 55),
    "wind_speed": (0, 200),
    "humidity": (0, 100),
    "precipitation": (0, 500),
    "pressure": (950, 1060),
    "clouds": (0, 100),
}


def _is_valid_api_key(key: str) -> bool:
    """Check if the API key looks real (not a placeholder)."""
    if not key or len(key) < 10:
        return False
    # Detect common placeholder patterns
    if key.startswith("xxxx") or "placeholder" in key.lower():
        return False
    # Check for sequential hex-like placeholder
    if all(c in "0123456789abcdefghijklmnopqrstuvwxyz" for c in key) and len(set(key)) > 8:
        return True
    return True


def _clamp(value: float, min_val: float, max_val: float) -> float:
    return max(min_val, min(max_val, value))


def fetch_weather_real(lat: float, lon: float) -> Optional[Dict[str, float]]:
    """
    Fetch real weather data from OpenWeatherMap API.
    
    Returns None if API call fails (caller should fall back to simulation).
    """
    if not _is_valid_api_key(OPENWEATHER_API_KEY):
        return None

    try:
        params = {
            "lat": lat,
            "lon": lon,
            "appid": OPENWEATHER_API_KEY,
            "units": "metric",
        }
        resp = requests.get(OPENWEATHER_BASE_URL, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()

        # Extract and standardize
        main = data.get("main", {})
        wind = data.get("wind", {})
        clouds_data = data.get("clouds", {})
        rain = data.get("rain", {})
        weather_list = data.get("weather", [])
        
        condition = weather_list[0].get("main", "Clear") if weather_list else "Clear"
        is_raining = condition.lower() in ["rain", "drizzle", "thunderstorm"]

        weather = {
            "temperature": _clamp(main.get("temp", 25.0), *FEATURE_RANGES["temperature"]),
            "wind_speed": _clamp(wind.get("speed", 0.0) * 3.6, *FEATURE_RANGES["wind_speed"]),  # m/s → km/h
            "humidity": _clamp(main.get("humidity", 50.0), *FEATURE_RANGES["humidity"]),
            "precipitation": _clamp(rain.get("1h", 0.0), *FEATURE_RANGES["precipitation"]),
            "pressure": _clamp(main.get("pressure", 1013.0), *FEATURE_RANGES["pressure"]),
            "clouds": _clamp(clouds_data.get("all", 0.0), *FEATURE_RANGES["clouds"]),
            "condition": condition,
            "is_raining": is_raining,
        }
        return weather

    except requests.RequestException as e:
        logger.warning(f"OpenWeather API failed for ({lat}, {lon}): {e}")
        return None
    except (KeyError, ValueError) as e:
        logger.warning(f"Failed to parse OpenWeather response: {e}")
        return None


def fetch_weather_simulated(lat: float, lon: float) -> Dict[str, float]:
    """
    Simulate realistic weather data for Tunisia based on geography.
    Southern regions are hotter/drier, northern regions are cooler/wetter.
    """
    import random

    # Geographic modifiers (Tunisia: lat 30-37, lon 7.5-11.5)
    lat_factor = (lat - 30.0) / 7.0  # 0=south, 1=north
    season_noise = random.uniform(-0.2, 0.2)

    # Base temperature: hotter in south, cooler in north
    base_temp = 35.0 - lat_factor * 10.0 + random.uniform(-5, 5)
    humidity = 30.0 + lat_factor * 30.0 + random.uniform(-10, 10)
    wind = random.uniform(2.0, 25.0)
    precip = max(0.0, random.uniform(-2, 5) + lat_factor * 3.0)
    pressure = 1013.0 + random.uniform(-10, 10)
    clouds = random.uniform(0, 60) + lat_factor * 20

    # 5% chance of extreme weather for testing
    if random.random() < 0.05:
        anomaly = random.choice(["heatwave", "storm", "flood"])
        if anomaly == "heatwave":
            base_temp = random.uniform(42, 50)
            humidity = random.uniform(5, 20)
            precip = 0.0
        elif anomaly == "storm":
            wind = random.uniform(60, 130)
            precip = random.uniform(15, 40)
            clouds = random.uniform(80, 100)
        else:  # flood
            precip = random.uniform(50, 150)
            humidity = random.uniform(85, 100)
            clouds = random.uniform(90, 100)

    return {
        "temperature": round(_clamp(base_temp, *FEATURE_RANGES["temperature"]), 1),
        "wind_speed": round(_clamp(wind, *FEATURE_RANGES["wind_speed"]), 1),
        "humidity": round(_clamp(humidity, *FEATURE_RANGES["humidity"]), 1),
        "precipitation": round(_clamp(precip, *FEATURE_RANGES["precipitation"]), 1),
        "pressure": round(_clamp(pressure, *FEATURE_RANGES["pressure"]), 1),
        "clouds": round(_clamp(clouds, *FEATURE_RANGES["clouds"]), 1),
        "condition": "Rain" if precip > 2.0 else "Clouds" if clouds > 50 else "Clear",
        "is_raining": precip > 2.0,
    }


def fetch_weather(lat: float, lon: float) -> Dict[str, float]:
    """
    Fetch weather data with automatic fallback.
    Tries real API first, falls back to simulation if unavailable.
    """
    real_data = fetch_weather_real(lat, lon)
    if real_data is not None:
        logger.debug(f"Got real weather for ({lat:.2f}, {lon:.2f})")
        return real_data

    logger.debug(f"Using simulated weather for ({lat:.2f}, {lon:.2f})")
    return fetch_weather_simulated(lat, lon)
