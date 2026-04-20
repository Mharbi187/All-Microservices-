"""
Live weather utilities for Tunisia Disaster Detection.

This module fetches current weather conditions from OpenWeatherMap
for a given latitude/longitude.

Setup:
    1. Sign up at https://openweathermap.org/api
    2. Create an API key.
    3. Add to your .env file:

        OPENWEATHER_API_KEY=your_api_key_here

The functions here are written to fail gracefully if the key is missing
or the API is unreachable, so the rest of the app continues to work.
"""

import os
import logging
from typing import Optional, Dict, Any

import requests
from dotenv import load_dotenv

logger = logging.getLogger(__name__)


def get_openweather_api_key() -> Optional[str]:
    """Load OpenWeatherMap API key from environment variables."""
    load_dotenv()
    api_key = os.getenv("OPENWEATHER_API_KEY")
    if not api_key:
        logger.warning("OPENWEATHER_API_KEY not set. Live weather will be disabled.")
    return api_key


def get_current_weather(lat: float, lon: float) -> Optional[Dict[str, Any]]:
    """
    Fetch current weather from OpenWeatherMap for the given lat/lon.

    Returns a simplified dictionary with key fields or None on failure.
    """
    api_key = get_openweather_api_key()
    if not api_key:
        return None

    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {
        "lat": lat,
        "lon": lon,
        "appid": api_key,
        "units": "metric",
    }

    try:
        resp = requests.get(url, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()

        main = data.get("main", {})
        wind = data.get("wind", {})
        weather_list = data.get("weather", [])
        weather_desc = weather_list[0]["description"] if weather_list else ""

        # Rain can be under "rain" with keys like "1h" or "3h"
        rain = data.get("rain", {})
        rain_1h = rain.get("1h") or rain.get("3h")

        return {
            "temp_c": main.get("temp"),
            "humidity": main.get("humidity"),
            "pressure": main.get("pressure"),
            "wind_speed": wind.get("speed"),
            "wind_deg": wind.get("deg"),
            "description": weather_desc,
            "rain_mm": rain_1h,
        }

    except Exception as exc:
        logger.error(f"Error fetching OpenWeatherMap data: {exc}")
        return None



