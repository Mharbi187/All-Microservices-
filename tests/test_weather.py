"""
Tests for the weather module (src/weather.py).
Uses mocked HTTP responses to avoid real API calls.
"""

import os
import pytest
from unittest.mock import patch, MagicMock
from src.weather import get_current_weather, get_openweather_api_key


class TestGetOpenweatherApiKey:
    """Test API key loading."""

    @patch.dict(os.environ, {"OPENWEATHER_API_KEY": "test_key_123"})
    def test_returns_key_when_set(self):
        key = get_openweather_api_key()
        assert key == "test_key_123"

    @patch("src.weather.load_dotenv")
    @patch.dict(os.environ, {}, clear=True)
    def test_returns_none_when_missing(self, mock_dotenv):
        key = get_openweather_api_key()
        assert key is None


class TestGetCurrentWeather:
    """Test weather fetching with mocked HTTP."""

    MOCK_RESPONSE = {
        "main": {"temp": 32.5, "humidity": 45, "pressure": 1013},
        "wind": {"speed": 5.2, "deg": 180},
        "weather": [{"description": "clear sky"}],
        "rain": {"1h": 0.5},
    }

    @patch.dict(os.environ, {"OPENWEATHER_API_KEY": "fake_key"})
    @patch("src.weather.requests.get")
    def test_successful_fetch(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.raise_for_status = MagicMock()
        mock_resp.json.return_value = self.MOCK_RESPONSE
        mock_get.return_value = mock_resp

        result = get_current_weather(lat=36.45, lon=10.73)

        assert result is not None
        assert result["temp_c"] == 32.5
        assert result["humidity"] == 45
        assert result["wind_speed"] == 5.2
        assert result["description"] == "clear sky"
        assert result["rain_mm"] == 0.5

        # Verify lat/lon were passed correctly
        call_kwargs = mock_get.call_args
        params = call_kwargs[1].get("params") or call_kwargs[0][1] if len(call_kwargs[0]) > 1 else call_kwargs[1]["params"]
        assert params["lat"] == 36.45
        assert params["lon"] == 10.73

    @patch("src.weather.load_dotenv")
    @patch.dict(os.environ, {}, clear=True)
    def test_returns_none_without_api_key(self, mock_dotenv):
        result = get_current_weather(lat=36.0, lon=10.0)
        assert result is None

    @patch.dict(os.environ, {"OPENWEATHER_API_KEY": "fake_key"})
    @patch("src.weather.requests.get")
    def test_returns_none_on_network_error(self, mock_get):
        mock_get.side_effect = Exception("Connection refused")
        result = get_current_weather(lat=36.0, lon=10.0)
        assert result is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
