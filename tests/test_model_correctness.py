"""
Production-grade model correctness tests for DisasterRiskModel.

Validates determinism, boundary conditions, label sanity,
feature alignment, save/load round-trip, and cross-validation stability.
"""

import os
import numpy as np
import pandas as pd
import pytest
from src.model import DisasterRiskModel
from src.config import ALPHAEARTH_BANDS, RISK_THRESHOLDS


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_calm_data(n: int = 200) -> pd.DataFrame:
    """Generate data that should be classified as LOW risk."""
    np.random.seed(99)
    data = {
        'MaxFRP': np.random.uniform(280, 300, n),     # below T21 = 310
        'water_extent': np.random.uniform(0, 0.3, n),  # below 0.5
        'precipitation': np.random.uniform(0, 20, n),   # below 50
        'max_frp': np.random.uniform(0, 20, n),
        'water_change_pct': np.random.uniform(0, 0.1, n),
        'precipitation_7d': np.random.uniform(0, 10, n),
        'temperature': np.random.uniform(20, 25, n),
        'humidity': np.random.uniform(30, 50, n),
        'wind_speed': np.random.uniform(0, 5, n),
        'lat': [36.8] * n,
        'lon': [10.1] * n,
        'hazard': ['normal'] * n,
    }
    for band in ALPHAEARTH_BANDS:
        data[band] = np.random.randn(n)
    return pd.DataFrame(data)


def _make_flood_data(n: int = 200) -> pd.DataFrame:
    """Generate data that should be classified as HIGH risk (flood)."""
    np.random.seed(77)
    data = {
        'MaxFRP': np.random.uniform(280, 300, n),
        'water_extent': np.random.uniform(0.6, 1.0, n),   # above 0.5
        'precipitation': np.random.uniform(60, 150, n),     # above 50
        'max_frp': np.random.uniform(0, 20, n),
        'water_change_pct': np.random.uniform(0.6, 1.0, n),
        'precipitation_7d': np.random.uniform(60, 150, n),
        'temperature': np.random.uniform(15, 20, n),
        'humidity': np.random.uniform(80, 100, n),
        'wind_speed': np.random.uniform(30, 50, n),
        'lat': [36.8] * n,
        'lon': [10.1] * n,
        'hazard': ['flood'] * n,
    }
    for band in ALPHAEARTH_BANDS:
        data[band] = np.random.randn(n)
    return pd.DataFrame(data)


def _make_mixed_data(n: int = 400) -> pd.DataFrame:
    """50/50 mix of calm and flood data for training."""
    half = n // 2
    calm = _make_calm_data(half)
    flood = _make_flood_data(half)
    return pd.concat([calm, flood], ignore_index=True)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestDeterminism:
    """Same seed and data must produce identical results."""

    def test_predictions_are_deterministic(self):
        df = _make_mixed_data()
        m1 = DisasterRiskModel()
        m1.train(df, test_size=0.2, use_smote=False, tune_hyperparameters=False)
        p1, prob1 = m1.predict(df.iloc[:10])

        m2 = DisasterRiskModel()
        m2.train(df, test_size=0.2, use_smote=False, tune_hyperparameters=False)
        p2, prob2 = m2.predict(df.iloc[:10])

        np.testing.assert_array_equal(p1, p2)
        np.testing.assert_array_almost_equal(prob1, prob2)


class TestBoundaryConditions:
    """Extreme / edge-case inputs must not crash the model."""

    def test_all_zeros(self):
        model = DisasterRiskModel()
        model.train(_make_mixed_data(), test_size=0.2, use_smote=False, tune_hyperparameters=False)

        row = {col: 0.0 for col in ['MaxFRP', 'water_extent', 'precipitation', 'max_frp', 'water_change_pct', 'precipitation_7d']}
        for band in ALPHAEARTH_BANDS:
            row[band] = 0.0
        df = pd.DataFrame([row])
        pred, prob = model.predict(df)

        assert len(pred) == 1
        assert 0.0 <= prob[0] <= 1.0

    def test_extreme_high_values(self):
        model = DisasterRiskModel()
        model.train(_make_mixed_data(), test_size=0.2, use_smote=False, tune_hyperparameters=False)

        row = {'MaxFRP': 9999, 'water_extent': 1.0, 'precipitation': 9999, 'max_frp': 9999, 'water_change_pct': 1.0, 'precipitation_7d': 9999}
        for band in ALPHAEARTH_BANDS:
            row[band] = 100.0
        df = pd.DataFrame([row])
        pred, prob = model.predict(df)

        assert len(pred) == 1
        assert 0.0 <= prob[0] <= 1.0

    def test_single_sample_prediction(self):
        model = DisasterRiskModel()
        model.train(_make_mixed_data(), test_size=0.2, use_smote=False, tune_hyperparameters=False)

        df = _make_flood_data(1)
        pred, prob = model.predict(df)
        assert len(pred) == 1


class TestLabelSanity:
    """Labels generated from thresholds should match expectations."""

    def test_calm_data_labeled_zero(self):
        model = DisasterRiskModel()
        df = _make_calm_data(100)
        labels = model.create_labels(df)
        # All values are below thresholds → all should be 0
        assert (labels == 0).all(), f"Expected all 0 labels, got {labels.value_counts().to_dict()}"

    def test_flood_data_labeled_one(self):
        model = DisasterRiskModel()
        df = _make_flood_data(100)
        labels = model.create_labels(df)
        # water_extent > 0.5 and precipitation > 50 → should be 1
        assert (labels == 1).all(), f"Expected all 1 labels, got {labels.value_counts().to_dict()}"

    def test_thresholds_match_config(self):
        """Verify the model uses RISK_THRESHOLDS from config."""
        assert RISK_THRESHOLDS['wildfire']['T21'] == 310
        assert RISK_THRESHOLDS['flood']['water_extent'] == 0.5
        assert RISK_THRESHOLDS['flood']['precipitation'] == 50


class TestFeatureAlignment:
    """Features used at prediction must match those used at training."""

    def test_feature_names_preserved_after_training(self):
        model = DisasterRiskModel()
        df = _make_mixed_data()
        model.train(df, test_size=0.2, use_smote=False, tune_hyperparameters=False)

        assert model.feature_names is not None
        assert len(model.feature_names) > 0
        # The base indicators should be present (MaxFRP is intentionally dropped for fire_indicator)
        for col in ['water_change_pct', 'precipitation_7d']:
            assert col in model.feature_names
        for band in ALPHAEARTH_BANDS:
            assert band in model.feature_names

    def test_predict_aligns_features_to_training(self):
        model = DisasterRiskModel()
        df = _make_mixed_data()
        model.train(df, test_size=0.2, use_smote=False, tune_hyperparameters=False)

        # Predict with a DataFrame that has a missing column
        test_df = pd.DataFrame({
            'MaxFRP': [300],
            'water_extent': [0.7],
            'precipitation': [80],
            'max_frp': [30],
            'water_change_pct': [0.7],
            'precipitation_7d': [80],
        })
        # AlphaEarth bands are missing — prepare_features should fill with 0
        pred, prob = model.predict(test_df)
        assert len(pred) == 1


class TestSaveLoadRoundTrip:
    """Model serialisation must preserve predictions exactly."""

    def test_round_trip(self, tmp_path):
        model = DisasterRiskModel()
        df = _make_mixed_data()
        model.train(df, test_size=0.2, use_smote=False, tune_hyperparameters=False)

        test_df = df.iloc[:20]
        pred_before, prob_before = model.predict(test_df)

        path = str(tmp_path / "model.pkl")
        model.save(path)

        model2 = DisasterRiskModel()
        model2.load(path)
        pred_after, prob_after = model2.predict(test_df)

        np.testing.assert_array_equal(pred_before, pred_after)
        np.testing.assert_array_almost_equal(prob_before, prob_after)

    def test_load_restores_metadata(self, tmp_path):
        model = DisasterRiskModel()
        df = _make_mixed_data()
        model.train(df, test_size=0.2, use_smote=False, tune_hyperparameters=False)

        path = str(tmp_path / "model.pkl")
        model.save(path)

        model2 = DisasterRiskModel()
        model2.load(path)

        assert model2.feature_names == model.feature_names
        assert model2.training_metrics.get('accuracy') == model.training_metrics.get('accuracy')


class TestCrossValidation:
    """Cross-validation scores should be reasonable and stable."""

    def test_cv_scores_above_chance(self):
        model = DisasterRiskModel()
        df = _make_mixed_data(400)
        cv_results = model.cross_validate(df, cv=3)

        assert cv_results['mean_accuracy'] > 0.50, "CV accuracy should be above chance (50%)"

    def test_cv_scores_low_variance(self):
        model = DisasterRiskModel()
        df = _make_mixed_data(400)
        cv_results = model.cross_validate(df, cv=3)

        assert cv_results['std_accuracy'] < 0.20, "CV variance should be low"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
