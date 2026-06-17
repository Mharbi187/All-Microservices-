"""
Tests for the alert system (src/alerts.py).
Uses mocked Twilio / SendGrid clients to avoid sending real messages.
"""

import pytest
from unittest.mock import patch, MagicMock
from src.alerts import AlertSystem


class TestAlertFormatting:
    """Test alert message formatting."""

    def test_format_arabic(self):
        system = AlertSystem()
        msg = system.format_alert_message(
            hazard_type='flood',
            location={'name': 'Nabeul', 'lat': 36.45, 'lon': 10.73},
            risk_score=0.85,
            language='العربية'
        )
        assert isinstance(msg, str)
        assert len(msg) > 0

    def test_format_english(self):
        system = AlertSystem()
        msg = system.format_alert_message(
            hazard_type='wildfire',
            location={'name': 'Tabarka', 'lat': 36.95, 'lon': 8.75},
            risk_score=0.92,
            language='English'
        )
        assert isinstance(msg, str)
        assert len(msg) > 0


class TestAlertRateLimiting:
    """Test daily alert count limiting."""

    def test_reset_daily_count(self):
        system = AlertSystem()
        system.alert_count_today = 99
        system.reset_daily_count()
        assert system.alert_count_today == 0


class TestAlertStatus:
    """Test alert system status reporting."""

    def test_get_status(self):
        system = AlertSystem()
        status = system.get_alert_status()
        assert isinstance(status, dict)
        assert 'alerts_sent_today' in status
        assert 'max_alerts_per_day' in status


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
