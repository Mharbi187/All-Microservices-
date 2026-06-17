"""
Data Acquisition Module for Tunisia Disaster Detection
Fetches data from Google Earth Engine (FIRMS, HydroSAR, CHIRPS, Sentinel-2, AlphaEarth)
"""

import os
import ee
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import logging
from typing import Dict, List, Tuple, Optional

from dotenv import load_dotenv

from src.config import (
    TUNISIA_BBOX, GEE_COLLECTIONS, TIME_WINDOWS, SAMPLE_CONFIG,
    ALPHAEARTH_BANDS, SENTINEL2_BANDS
)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class GEEDataAcquisition:
    """
    Class to handle all Google Earth Engine data acquisition
    """
    
    def __init__(self):
        """Initialize GEE connection"""
        load_dotenv()

        service_account = os.getenv("GEE_SERVICE_ACCOUNT")
        key_path = os.getenv("GEE_PRIVATE_KEY_PATH")

        try:
            if service_account and key_path:
                logger.info(
                    f"Initializing GEE with service account: {service_account}"
                )
                credentials = ee.ServiceAccountCredentials(
                    service_account, key_path
                )
                ee.Initialize(credentials, project='detection-478419')
            else:
                logger.info(
                    "GEE_SERVICE_ACCOUNT / GEE_PRIVATE_KEY_PATH not set; "
                    "using default Earth Engine credentials with project detection-478419"
                )
                ee.Initialize(project='detection-478419')

            logger.info("Google Earth Engine initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize GEE: {e}")
            logger.info(
                "Attempting interactive authentication via ee.Authenticate()..."
            )
            ee.Authenticate()
            ee.Initialize(project='detection-478419')
        
        # Define Tunisia Region of Interest
        self.roi = ee.Geometry.Rectangle(TUNISIA_BBOX)
        logger.info(f"ROI set to: {TUNISIA_BBOX}")
    
    def get_date_range(self, hazard_type: str = 'wildfire') -> Tuple[ee.Date, ee.Date]:
        """
        Get appropriate date range for each hazard type
        
        Args:
            hazard_type: 'wildfire', 'flood', or 'precipitation'
        
        Returns:
            Tuple of (start_date, end_date) as ee.Date objects
        """
        end_date = ee.Date(datetime.now())
        start_date = self._compute_start_date(end_date, hazard_type)
        
        return start_date, end_date

    def get_date_range_for_reference(self, hazard_type: str, reference_date: str) -> Tuple[ee.Date, ee.Date]:
        """
        Get date range around a reference date string (YYYY-MM-DD) for a hazard.

        This is used for training on historical labeled events.
        """
        end_date = ee.Date(reference_date)
        start_date = self._compute_start_date(end_date, hazard_type)
        return start_date, end_date

    def _compute_start_date(self, end_date: ee.Date, hazard_type: str) -> ee.Date:
        """Internal helper to compute start date given an end date and hazard type."""
        if hazard_type == 'wildfire':
            return end_date.advance(TIME_WINDOWS['wildfire']['hours'], 'hour')
        elif hazard_type == 'flood':
            return end_date.advance(TIME_WINDOWS['flood']['days'], 'day')
        elif hazard_type == 'precipitation':
            return end_date.advance(TIME_WINDOWS['precipitation']['days'], 'day')
        else:
            return end_date.advance(-1, 'day')
    
    def get_firms_data(self, start_date: Optional[ee.Date] = None, 
                       end_date: Optional[ee.Date] = None) -> ee.Image:
        """
        Fetch NASA FIRMS (Fire Information) data
        
        Args:
            start_date: Start date for query
            end_date: End date for query
        
        Returns:
            ee.Image with fire brightness temperature (T21)
        """
        if start_date is None or end_date is None:
            start_date, end_date = self.get_date_range('wildfire')
        
        try:
            # MODIS Collection 6.1 active fire product (Collection 6 decommissioned)
            firms = ee.ImageCollection('MODIS/061/MOD14A1') \
                .filterDate(start_date, end_date) \
                .filterBounds(self.roi) \
                .select(['MaxFRP', 'FireMask'])
            
            # Get mean fire radiative power
            firms_mean = firms.mean().clip(self.roi)
            logger.info(f"FIRMS data fetched for {start_date.format().getInfo()} to {end_date.format().getInfo()}")
            
            return firms_mean
        
        except Exception as e:
            logger.warning(f"Error fetching FIRMS data: {e}")
            logger.info("Returning empty image for FIRMS")
            return ee.Image.constant(0).rename('MaxFRP')
    
    def get_hydrosar_data(self, start_date: Optional[ee.Date] = None,
                          end_date: Optional[ee.Date] = None) -> ee.Image:
        """
        Fetch NASA HydroSAR flood data (water extent)
        
        Args:
            start_date: Start date for query
            end_date: End date for query
        
        Returns:
            ee.Image with water extent values
        """
        if start_date is None or end_date is None:
            start_date, end_date = self.get_date_range('flood')
        
        try:
            # Using Sentinel-1 SAR as proxy for flood detection
            s1 = ee.ImageCollection('COPERNICUS/S1_GRD') \
                .filterDate(start_date, end_date) \
                .filterBounds(self.roi) \
                .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV')) \
                .select('VV')

            # Some time windows/regions may have no S1 data. In that case,
            # return a constant 0 water_extent image to avoid 0-band errors.
            def _compute_water_extent(col):
                s1_mean = col.mean()
                return s1_mean.lt(-15).rename('water_extent')  # Threshold at -15 dB

            water_extent = ee.Image(
                ee.Algorithms.If(
                    s1.size().gt(0),
                    _compute_water_extent(s1),
                    ee.Image.constant(0).rename('water_extent')
                )
            )

            water_clipped = water_extent.clip(self.roi)
            logger.info("HydroSAR/SAR data fetched for flood detection")

            return water_clipped

        except Exception as e:
            logger.warning(f"Error fetching HydroSAR data: {e}")
            logger.info("Returning empty image for water extent")
            return ee.Image.constant(0).rename('water_extent')
    
    def get_chirps_data(self, start_date: Optional[ee.Date] = None,
                        end_date: Optional[ee.Date] = None) -> ee.Image:
        """
        Fetch CHIRPS precipitation data
        
        Args:
            start_date: Start date for query
            end_date: End date for query
        
        Returns:
            ee.Image with precipitation values (mm/day)
        """
        if start_date is None or end_date is None:
            start_date, end_date = self.get_date_range('precipitation')
        
        try:
            chirps = ee.ImageCollection(GEE_COLLECTIONS['CHIRPS']) \
                .filterDate(start_date, end_date) \
                .filterBounds(self.roi) \
                .select('precipitation')
            
            precip_mean = chirps.mean().clip(self.roi)
            logger.info(f"CHIRPS precipitation data fetched")
            
            return precip_mean
        
        except Exception as e:
            logger.warning(f"Error fetching CHIRPS data: {e}")
            logger.info("Returning empty image for precipitation")
            return ee.Image.constant(0).rename('precipitation')
    
    def get_sentinel2_data(self, start_date: Optional[ee.Date] = None,
                           end_date: Optional[ee.Date] = None) -> ee.Image:
        """
        Fetch Sentinel-2 surface reflectance data
        
        Args:
            start_date: Start date for query
            end_date: End date for query
        
        Returns:
            ee.Image with selected bands (B8, B4, B11)
        """
        if start_date is None:
            end_date = ee.Date(datetime.now())
            start_date = end_date.advance(-5, 'day')  # 5-day lookback
        
        try:
            s2 = ee.ImageCollection(GEE_COLLECTIONS['SENTINEL2']) \
                .filterDate(start_date, end_date) \
                .filterBounds(self.roi) \
                .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)) \
                .select(SENTINEL2_BANDS)
            
            s2_mean = s2.mean().clip(self.roi)
            logger.info(f"Sentinel-2 data fetched")
            
            return s2_mean
        
        except Exception as e:
            logger.warning(f"Error fetching Sentinel-2 data: {e}")
            logger.info("Returning empty image for Sentinel-2")
            return ee.Image.constant([0, 0, 0]).rename(SENTINEL2_BANDS)
    
    def get_alphaearth_embeddings(self, year: int = 2024) -> ee.Image:
        """
        Fetch AlphaEarth embeddings (Foundation Model Vectors)
        
        Args:
            year: Year for embeddings (default 2024)
        
        Returns:
            ee.Image with selected AlphaEarth bands A00-A09
        """
        try:
            # AlphaEarth dataset from GEE
            embeddings = ee.ImageCollection(GEE_COLLECTIONS['ALPHAEARTH']) \
                .filterDate(f'{year}-01-01', f'{year}-12-31') \
                .filterBounds(self.roi) \
                .select(ALPHAEARTH_BANDS)
            
            # Since it's an annual collection, taking the mean works
            embeddings_img = embeddings.mean().clip(self.roi)
            
            logger.info(f"AlphaEarth embeddings (A00-A09) fetched successfully")
            
            return embeddings_img
        
        except Exception as e:
            logger.warning(f"Error fetching AlphaEarth embeddings: {e}")
            logger.info("Returning empty image for embeddings")
            band_images = [ee.Image.constant(0).rename(b) for b in ALPHAEARTH_BANDS]
            return ee.Image.cat(band_images)
    
    def create_composite_image(self, include_sentinel: bool = False) -> ee.Image:
        """
        Create composite image with all data sources
        
        Args:
            include_sentinel: Whether to include Sentinel-2 bands
        
        Returns:
            ee.Image with all bands combined
        """
        logger.info("Creating composite image...")
        
        # Fetch all data sources
        fires = self.get_firms_data()
        floods = self.get_hydrosar_data()
        precip = self.get_chirps_data()
        embeddings = self.get_alphaearth_embeddings()
        
        # Combine all bands
        composite = fires.addBands(floods).addBands(precip).addBands(embeddings)
        
        if include_sentinel:
            sentinel = self.get_sentinel2_data()
            composite = composite.addBands(sentinel)
        
        logger.info("Composite image created successfully")
        return composite
    
    def sample_data(self, image: ee.Image, num_pixels: int = None,
                    scale: int = None) -> pd.DataFrame:
        """
        Sample data from composite image for model training
        
        Args:
            image: ee.Image to sample from
            num_pixels: Number of pixels to sample
            scale: Resolution in meters
        
        Returns:
            pandas DataFrame with sampled features
        """
        if num_pixels is None:
            num_pixels = SAMPLE_CONFIG['num_pixels']
        if scale is None:
            scale = SAMPLE_CONFIG['scale']
        
        logger.info(f"Sampling {num_pixels} pixels at {scale}m resolution...")

        try:
            # Sample random points
            sample = image.sample(
                region=self.roi,
                scale=scale,
                numPixels=num_pixels,
                seed=42,
                geometries=True
            )

            # Convert the FeatureCollection to a pandas DataFrame without relying on geemap
            fc_dict = sample.getInfo()
            features = fc_dict.get("features", [])

            if not features:
                logger.warning("No features returned from sampling.")
                return pd.DataFrame()

            rows = []
            for f in features:
                props = f.get("properties", {})
                # Preserve geometry as a separate column if present
                if "geometry" in f:
                    props[".geo"] = f["geometry"]
                rows.append(props)

            df = pd.DataFrame(rows)
            logger.info(f"Sampled {len(df)} pixels successfully with columns: {list(df.columns)}")
            return df

        except Exception as e:
            logger.error(f"Error sampling data: {e}")
            return pd.DataFrame()
    
    def get_historical_data(self, start_date: str, end_date: str) -> pd.DataFrame:
        """
        Fetch historical data for model training and validation
        
        Args:
            start_date: Start date (YYYY-MM-DD format)
            end_date: End date (YYYY-MM-DD format)
        
        Returns:
            pandas DataFrame with historical features
        """
        logger.info(f"Fetching historical data from {start_date} to {end_date}")
        
        start = ee.Date(start_date)
        end = ee.Date(end_date)
        
        # Fetch data for the historical period
        fires = self.get_firms_data(start, end)
        floods = self.get_hydrosar_data(start, end)
        precip = self.get_chirps_data(start, end)
        embeddings = self.get_alphaearth_embeddings()
        
        # Create composite
        composite = fires.addBands(floods).addBands(precip).addBands(embeddings)
        
        # Sample data
        df = self.sample_data(composite, num_pixels=10000)
        
        return df

    # ------------------------------------------------------------------
    # Point-based feature extraction for labeled events
    # ------------------------------------------------------------------

    def get_features_for_event(self, date: str, lat: float, lon: float) -> Dict:
        """
        Extract model features for a single labeled event at a given
        date and location (lat, lon) in Tunisia.

        Computes **anomaly-based** features that are discriminative:
        - chirps_7d_sum  : cumulative 7-day CHIRPS precipitation (mm)
        - chirps_1d      : single-day precipitation on event date (mm)
        - vv_change      : Sentinel-1 VV dB change (event vs 30-90d baseline)
        - water_anomaly  : water-extent fraction change (event vs baseline)
        - water_extent   : absolute water-extent fraction around the event
        - MaxFRP         : MODIS 061 mean FRP (kept for compatibility)
        - A00-A09        : AlphaEarth annual embeddings

        Args:
            date: Event date in 'YYYY-MM-DD' format
            lat: Latitude
            lon: Longitude

        Returns:
            Dictionary of feature_name -> value
        """
        try:
            point = ee.Geometry.Point([float(lon), float(lat)])
            region = point.buffer(10000)  # 10 km buffer
            event_date = ee.Date(date)
            _val = lambda d, default=0: d if d is not None else default
            _red = lambda img, geom, sc=1000: img.reduceRegion(
                reducer=ee.Reducer.mean(), geometry=geom,
                scale=sc, bestEffort=True,
            ).getInfo()

            props: Dict = {}

            # ── 1. CHIRPS cumulative 7-day precipitation ──────────────
            chirps_7d = (
                ee.ImageCollection(GEE_COLLECTIONS['CHIRPS'])
                .filterDate(event_date.advance(-7, 'day'), event_date)
                .filterBounds(region)
                .select('precipitation')
            )
            if chirps_7d.size().getInfo() > 0:
                r = _red(chirps_7d.sum(), region, 5000)
                props['chirps_7d_sum'] = _val(r.get('precipitation'))
                r1 = _red(chirps_7d.mean(), region, 5000)
                props['precipitation'] = _val(r1.get('precipitation'))
            else:
                props['chirps_7d_sum'] = 0
                props['precipitation'] = 0

            # Single-day precipitation (event date)
            chirps_1d = (
                ee.ImageCollection(GEE_COLLECTIONS['CHIRPS'])
                .filterDate(event_date.advance(-1, 'day'), event_date.advance(1, 'day'))
                .filterBounds(region)
                .select('precipitation')
            )
            if chirps_1d.size().getInfo() > 0:
                r = _red(chirps_1d.mean(), region, 5000)
                props['chirps_1d'] = _val(r.get('precipitation'))
            else:
                props['chirps_1d'] = 0

            # ── 2. Sentinel-1 VV change (event vs baseline) ──────────
            s1_event = (
                ee.ImageCollection('COPERNICUS/S1_GRD')
                .filterDate(event_date.advance(-7, 'day'), event_date.advance(7, 'day'))
                .filterBounds(region)
                .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
                .select('VV')
            )
            s1_base = (
                ee.ImageCollection('COPERNICUS/S1_GRD')
                .filterDate(event_date.advance(-90, 'day'), event_date.advance(-30, 'day'))
                .filterBounds(region)
                .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
                .select('VV')
            )
            n_event = s1_event.size().getInfo()
            n_base = s1_base.size().getInfo()

            if n_event > 0 and n_base > 0:
                vv_e = _val(_red(s1_event.mean(), region).get('VV'))
                vv_b = _val(_red(s1_base.mean(), region).get('VV'))
                props['vv_change'] = vv_e - vv_b

                # Water extent: fraction of pixels < -15 dB
                w_e = _val(_red(s1_event.mean().lt(-15).rename('w'), region).get('w'))
                w_b = _val(_red(s1_base.mean().lt(-15).rename('w'), region).get('w'))
                props['water_anomaly'] = w_e - w_b
                props['water_extent'] = w_e
            elif n_event > 0:
                vv_e = _val(_red(s1_event.mean(), region).get('VV'))
                props['vv_change'] = 0
                w_e = _val(_red(s1_event.mean().lt(-15).rename('w'), region).get('w'))
                props['water_anomaly'] = 0
                props['water_extent'] = w_e
            else:
                props['vv_change'] = 0
                props['water_anomaly'] = 0
                props['water_extent'] = 0

            # ── 3. MODIS FireMask & FRP (kept for compatibility) ──────
            modis = (
                ee.ImageCollection('MODIS/061/MOD14A1')
                .filterDate(event_date.advance(-5, 'day'), event_date.advance(5, 'day'))
                .filterBounds(region)
                .select(['MaxFRP', 'FireMask'])
            )
            if modis.size().getInfo() > 0:
                r = modis.max().reduceRegion(
                    reducer=ee.Reducer.max(), geometry=region,
                    scale=1000, bestEffort=True,
                ).getInfo()
                props['MaxFRP'] = _val(r.get('MaxFRP'))
                props['FireMask'] = _val(r.get('FireMask'))
            else:
                props['MaxFRP'] = 0
                props['FireMask'] = 0

            # ── 4. AlphaEarth annual embeddings ───────────────────────
            embeddings = self.get_alphaearth_embeddings()
            r_emb = _red(embeddings, region)
            for band in ALPHAEARTH_BANDS:
                props[band] = _val(r_emb.get(band))

            # Final cleanup
            props = {k: (v if v is not None else 0) for k, v in props.items()}
            return props

        except Exception as e:
            logger.error(f"Error extracting features for event {date}, {lat}, {lon}: {e}")
            return {}


def test_gee_connection():
    """Test GEE connection and data fetching"""
    logger.info("Testing GEE connection...")
    
    try:
        gee = GEEDataAcquisition()
        
        # Test each data source
        logger.info("Testing FIRMS data...")
        fires = gee.get_firms_data()
        
        logger.info("Testing HydroSAR data...")
        floods = gee.get_hydrosar_data()
        
        logger.info("Testing CHIRPS data...")
        precip = gee.get_chirps_data()
        
        logger.info("Testing AlphaEarth embeddings...")
        embeddings = gee.get_alphaearth_embeddings()
        
        logger.info("Creating composite image...")
        composite = gee.create_composite_image()
        
        logger.info("Sampling data...")
        sample_df = gee.sample_data(composite, num_pixels=100)
        
        logger.info(f"Sample data shape: {sample_df.shape}")
        logger.info(f"Sample columns: {sample_df.columns.tolist()}")
        
        logger.info("✓ All GEE tests passed successfully!")
        
        return True
    
    except Exception as e:
        logger.error(f"✗ GEE test failed: {e}")
        return False


if __name__ == "__main__":
    # Run tests when module is executed directly
    test_gee_connection()
