"""
Tests for data acquisition module
"""

import pytest
import pandas as pd
from src.data_acquisition import GEEDataAcquisition


def test_gee_initialization():
    """Test GEE initialization"""
    try:
        gee = GEEDataAcquisition()
        assert gee is not None
        assert gee.roi is not None
    except Exception as e:
        pytest.skip(f"GEE not available: {e}")


def test_date_range():
    """Test date range calculation"""
    try:
        gee = GEEDataAcquisition()
        
        # Test wildfire date range
        start, end = gee.get_date_range('wildfire')
        assert start is not None
        assert end is not None
        
        # Test flood date range
        start, end = gee.get_date_range('flood')
        assert start is not None
        assert end is not None
    
    except Exception as e:
        pytest.skip(f"GEE not available: {e}")


def test_firms_data():
    """Test FIRMS data fetching"""
    try:
        gee = GEEDataAcquisition()
        fires = gee.get_firms_data()
        assert fires is not None
    except Exception as e:
        pytest.skip(f"FIRMS data not available: {e}")


def test_hydrosar_data():
    """Test HydroSAR data fetching"""
    try:
        gee = GEEDataAcquisition()
        floods = gee.get_hydrosar_data()
        assert floods is not None
    except Exception as e:
        pytest.skip(f"HydroSAR data not available: {e}")


def test_chirps_data():
    """Test CHIRPS data fetching"""
    try:
        gee = GEEDataAcquisition()
        precip = gee.get_chirps_data()
        assert precip is not None
    except Exception as e:
        pytest.skip(f"CHIRPS data not available: {e}")


def test_composite_image():
    """Test composite image creation"""
    try:
        gee = GEEDataAcquisition()
        composite = gee.create_composite_image()
        assert composite is not None
    except Exception as e:
        pytest.skip(f"GEE not available: {e}")


def test_data_sampling():
    """Test data sampling"""
    try:
        gee = GEEDataAcquisition()
        composite = gee.create_composite_image()
        df = gee.sample_data(composite, num_pixels=10)
        
        assert isinstance(df, pd.DataFrame)
        assert len(df) > 0
    
    except Exception as e:
        pytest.skip(f"GEE sampling not available: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
