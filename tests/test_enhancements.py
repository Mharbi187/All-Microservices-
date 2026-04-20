"""
Quick test script to verify model enhancements work correctly
Run this after installing dependencies to ensure everything is working
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def test_imports():
    """Test that all required imports work"""
    import numpy as np
    assert np is not None

    import pandas as pd
    assert pd is not None

    from sklearn.ensemble import RandomForestClassifier, VotingClassifier
    assert RandomForestClassifier is not None
    assert VotingClassifier is not None

    # Optional imports — should not fail the test suite
    try:
        import xgboost as xgb
        assert xgb is not None
    except ImportError:
        pass  # XGBoost is optional

    try:
        from imblearn.over_sampling import SMOTE
        assert SMOTE is not None
    except ImportError:
        pass  # SMOTE is optional


def test_model_initialization():
    """Test model initialization"""
    from src.model import DisasterRiskModel

    model = DisasterRiskModel()
    assert model is not None
    assert model.model is not None

    model_type = type(model.model).__name__
    assert model_type in ("VotingClassifier", "RandomForestClassifier", "XGBClassifier")


def test_feature_engineering():
    """Test specific feature engineering logic"""
    import pandas as pd
    import numpy as np
    from src.model import DisasterRiskModel
    from src.config import ALPHAEARTH_BANDS

    model = DisasterRiskModel()

    df = pd.DataFrame({
        'MaxFRP': [300, 350, 280],
        'water_extent': [0.5, 0.8, 0.3],
        'precipitation': [50, 80, 20],
        'lat': [36.8, 36.8, 36.8],
        'lon': [10.1, 10.1, 10.1],
        'hazard': ['normal', 'fire', 'flood']
    })
    for band in ALPHAEARTH_BANDS:
        df[band] = np.random.randn(3)

    df_eng = model.engineer_features(df)

    # Should have created new features
    assert len(df_eng.columns) > len(df.columns)

    # Check interaction features exist (we now use chirps and vv_change for these)
    # The dummy data needs these to trigger the engineering blocks
    assert 'flood_risk_composite' in df_eng.columns
    assert 'fire_risk_composite' in df_eng.columns


if __name__ == "__main__":
    try:
        import pytest
        pytest.main([__file__, "-v"])
    except ImportError:
        test_imports()
        print("[SUCCESS] Imports passed")
        test_model_initialization()
        print("[SUCCESS] Model init passed")
        test_feature_engineering()
        print("[SUCCESS] Feature engineering passed")
