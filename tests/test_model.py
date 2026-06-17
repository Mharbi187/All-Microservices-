"""
Tests for ML model module
"""

import pytest
import pandas as pd
import numpy as np
from src.model import DisasterRiskModel
from src.config import ALPHAEARTH_BANDS


def create_synthetic_data(n_samples=100):
    """Create synthetic data for testing"""
    np.random.seed(42)
    
    data = {
        'MaxFRP': np.random.uniform(280, 350, n_samples),
        'water_extent': np.random.uniform(0, 1, n_samples),
        'precipitation': np.random.uniform(0, 100, n_samples),
        'max_frp': np.random.uniform(0, 100, n_samples),
        'water_change_pct': np.random.uniform(0, 1, n_samples),
        'precipitation_7d': np.random.uniform(0, 100, n_samples),
        'temperature': np.random.uniform(20, 25, n_samples),
        'humidity': np.random.uniform(40, 60, n_samples),
        'wind_speed': np.random.uniform(0, 10, n_samples),
    }
    
    # Add AlphaEarth embeddings
    for i in ALPHAEARTH_BANDS:
        data[i] = np.random.randn(n_samples)
    
    return pd.DataFrame(data)


def test_model_initialization():
    """Test model initialization"""
    model = DisasterRiskModel()
    assert model is not None
    assert model.model is not None


def test_label_creation():
    """Test label creation"""
    model = DisasterRiskModel()
    df = create_synthetic_data(100)
    
    labels = model.create_labels(df)
    
    assert len(labels) == len(df)
    assert np.issubdtype(labels.dtype, np.integer)
    assert set(labels.unique()).issubset({0, 1})


def test_feature_preparation():
    """Test feature preparation"""
    model = DisasterRiskModel()
    df = create_synthetic_data(100)
    
    X = model.prepare_features(df)
    
    assert isinstance(X, pd.DataFrame)
    assert len(X) == len(df)
    assert X.isnull().sum().sum() == 0  # No missing values
    assert not X.isin([np.inf, -np.inf]).any().any()  # No infinite values


def test_model_training():
    """Test model training"""
    model = DisasterRiskModel()
    df = create_synthetic_data(500)
    
    metrics = model.train(df, test_size=0.3)
    
    assert 'accuracy' in metrics
    assert 'precision' in metrics
    assert 'recall' in metrics
    assert 'f1_score' in metrics
    assert metrics['accuracy'] >= 0
    assert metrics['accuracy'] <= 1


def test_model_prediction():
    """Test model prediction"""
    model = DisasterRiskModel()
    df = create_synthetic_data(500)
    
    # Train model
    model.train(df, test_size=0.3)
    
    # Predict on new data
    test_df = create_synthetic_data(50)
    predictions, probabilities = model.predict(test_df)
    
    assert len(predictions) == len(test_df)
    assert len(probabilities) == len(test_df)
    assert set(predictions).issubset({0, 1})
    assert (probabilities >= 0).all()
    assert (probabilities <= 1).all()


def test_risk_score():
    """Test risk score calculation"""
    model = DisasterRiskModel()
    df = create_synthetic_data(500)
    
    # Train model
    model.train(df, test_size=0.3)
    
    # Get risk scores
    test_df = create_synthetic_data(50)
    risk_scores = model.predict_risk_score(test_df)
    
    assert len(risk_scores) == len(test_df)
    assert (risk_scores >= 0).all()
    assert (risk_scores <= 1).all()


def test_model_save_load(tmp_path):
    """Test model saving and loading"""
    model = DisasterRiskModel()
    df = create_synthetic_data(500)
    
    # Train and save
    model.train(df, test_size=0.3)
    model_path = tmp_path / "test_model.pkl"
    model.save(str(model_path))
    
    assert model_path.exists()
    
    # Load model
    model2 = DisasterRiskModel()
    model2.load(str(model_path))
    
    assert model2.model is not None
    assert model2.feature_names is not None
    
    # Test prediction with loaded model
    test_df = create_synthetic_data(50)
    predictions, _ = model2.predict(test_df)
    assert len(predictions) == len(test_df)


def test_feature_importances():
    """Test feature importance calculation"""
    model = DisasterRiskModel()
    df = create_synthetic_data(500)
    
    model.train(df, test_size=0.3)
    
    assert model.feature_importances_ is not None
    assert 'feature' in model.feature_importances_.columns
    assert 'importance' in model.feature_importances_.columns
    assert len(model.feature_importances_) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
