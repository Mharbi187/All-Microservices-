"""
Tests for configuration constants (src/config.py).
Ensures all configuration values are valid and consistent.
"""

import pytest
from src.config import (
    TUNISIA_BBOX, TUNISIA_ROI, PRIORITY_REGIONS,
    TUNISIAN_WILAYAT, GEE_COLLECTIONS, TIME_WINDOWS,
    RISK_THRESHOLDS, MODEL_CONFIG, ALPHAEARTH_BANDS,
    SENTINEL2_BANDS, SAMPLE_CONFIG, ALERT_CONFIG,
    PERFORMANCE_TARGETS, UI_CONFIG, TRANSLATIONS
)


class TestGeographicConfig:
    """Test geographic configuration constants."""

    def test_bbox_has_four_values(self):
        assert len(TUNISIA_BBOX) == 4

    def test_bbox_is_valid(self):
        west, south, east, north = TUNISIA_BBOX
        assert west < east
        assert south < north

    def test_roi_matches_bbox(self):
        assert TUNISIA_ROI['west'] == TUNISIA_BBOX[0]
        assert TUNISIA_ROI['south'] == TUNISIA_BBOX[1]
        assert TUNISIA_ROI['east'] == TUNISIA_BBOX[2]
        assert TUNISIA_ROI['north'] == TUNISIA_BBOX[3]

    def test_all_24_wilayat(self):
        assert len(TUNISIAN_WILAYAT) == 24

    def test_priority_regions_have_coordinates(self):
        for name, info in PRIORITY_REGIONS.items():
            assert 'lat' in info
            assert 'lon' in info
            assert 'type' in info


class TestDataSourceConfig:
    """Test data source configuration."""

    def test_gee_collections_present(self):
        required = ['FIRMS', 'HYDROSAR', 'CHIRPS', 'SENTINEL2', 'ALPHAEARTH']
        for key in required:
            assert key in GEE_COLLECTIONS

    def test_alphaearth_has_10_bands(self):
        assert len(ALPHAEARTH_BANDS) == 10
        assert ALPHAEARTH_BANDS[0] == 'A00'
        assert ALPHAEARTH_BANDS[-1] == 'A09'

    def test_sentinel2_bands(self):
        assert len(SENTINEL2_BANDS) == 3


class TestModelConfig:
    """Test model configuration."""

    def test_random_state_is_set(self):
        assert 'random_state' in MODEL_CONFIG
        assert MODEL_CONFIG['random_state'] == 42

    def test_risk_thresholds_valid(self):
        assert RISK_THRESHOLDS['wildfire']['T21'] > 0
        assert 0 < RISK_THRESHOLDS['flood']['water_extent'] < 1
        assert RISK_THRESHOLDS['flood']['precipitation'] > 0


class TestPerformanceTargets:
    """Test performance target configuration."""

    def test_targets_between_0_and_1(self):
        assert 0 < PERFORMANCE_TARGETS['accuracy'] <= 1
        assert 0 < PERFORMANCE_TARGETS['precision'] <= 1
        assert 0 < PERFORMANCE_TARGETS['recall'] <= 1


class TestUIConfig:
    """Test UI configuration."""

    def test_translations_have_both_languages(self):
        assert 'العربية' in TRANSLATIONS
        assert 'English' in TRANSLATIONS

    def test_translation_keys_match(self):
        arabic_keys = set(TRANSLATIONS['العربية'].keys())
        english_keys = set(TRANSLATIONS['English'].keys())
        assert arabic_keys == english_keys


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
