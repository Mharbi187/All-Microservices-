"""
Google Earth Engine Satellite Monitoring System
Integrates satellite data for comprehensive disaster monitoring:
- Active Fire Detection (FIRMS/MODIS)
- Flood Detection (Sentinel-1 SAR)
- Precipitation Analysis (CHIRPS)
- Vegetation Health (NDVI)
- Land Cover Changes
"""

import ee
import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
import os
from dotenv import load_dotenv
import json

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class FireDetection:
    """Active fire detection data"""
    latitude: float
    longitude: float
    brightness: float
    confidence: str
    frp: float  # Fire Radiative Power
    acquisition_time: datetime
    satellite: str
    

@dataclass
class FloodEvent:
    """Flood detection data"""
    area_km2: float
    severity: str
    water_extent_change: float  # Percentage change
    affected_regions: List[str]
    detection_time: datetime


@dataclass
class PrecipitationData:
    """Precipitation analysis data"""
    total_mm: float
    avg_daily_mm: float
    anomaly_score: float  # Deviation from normal
    drought_risk: str
    period_days: int


class SatelliteMonitor:
    """
    Google Earth Engine Satellite Data Monitor
    Provides real-time satellite-based disaster detection
    """
    
    def __init__(self):
        """Initialize GEE with service account authentication"""
        self.service_account = os.getenv('GEE_SERVICE_ACCOUNT')
        self.private_key_path = os.getenv('GEE_PRIVATE_KEY_PATH')
        
        self.initialized = False
        self._initialize_gee()
    
    def _initialize_gee(self):
        """Initialize Google Earth Engine with service account"""
        try:
            if not self.service_account or not self.private_key_path:
                logger.warning("GEE credentials not configured. Satellite monitoring disabled.")
                return
            
            # Check if key file exists
            if not os.path.exists(self.private_key_path):
                logger.error(f"GEE private key file not found: {self.private_key_path}")
                return
            
            # Authenticate with service account
            credentials = ee.ServiceAccountCredentials(
                self.service_account, 
                self.private_key_path
            )
            ee.Initialize(credentials)
            
            self.initialized = True
            logger.info("✅ Google Earth Engine initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Google Earth Engine: {e}")
            self.initialized = False
    
    def detect_active_fires(self, 
                           lat: float, 
                           lon: float, 
                           radius_km: float = 100,
                           days_back: int = 7,
                           end_date: Optional[datetime] = None) -> List[FireDetection]:
        """
        Detect active fires using FIRMS (MODIS/VIIRS)
        
        Args:
            lat: Center latitude
            lon: Center longitude
            radius_km: Search radius in kilometers
            days_back: Number of days to look back
            
        Returns:
            List of FireDetection objects
        """
        if not self.initialized:
            logger.warning("GEE not initialized. Cannot detect fires.")
            return []
        
        try:
            # Create point and buffer
            point = ee.Geometry.Point([lon, lat])
            region = point.buffer(radius_km * 1000)  # Convert to meters
            
            # Date range
            if end_date is None:
                end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days_back)
            
            # FIRMS MODIS Active Fire Product
            firms = ee.ImageCollection('FIRMS') \
                .filterDate(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d')) \
                .filterBounds(region)
            
            # Alternative: Use MODIS Thermal Anomalies
            modis_fires = ee.ImageCollection('MODIS/006/MOD14A1') \
                .filterDate(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d')) \
                .filterBounds(region) \
                .select(['MaxFRP', 'FireMask'])
            
            # Get fire detections
            fire_detections = []
            
            # Sample fire pixels
            if modis_fires.size().getInfo() > 0:
                # Get the most recent image
                latest = modis_fires.sort('system:time_start', False).first()
                
                # Sample fire pixels
                fire_mask = latest.select('FireMask')
                samples = fire_mask.sample(
                    region=region,
                    scale=1000,
                    numPixels=100,
                    geometries=True
                )
                
                # Convert to list
                sample_list = samples.getInfo().get('features', [])
                
                for feature in sample_list:
                    props = feature.get('properties', {})
                    coords = feature.get('geometry', {}).get('coordinates', [0, 0])
                    
                    # Filter for actual fires (FireMask values 7-9 indicate fires)
                    fire_mask_value = props.get('FireMask', 0)
                    if fire_mask_value >= 7:
                        detection = FireDetection(
                            latitude=coords[1],
                            longitude=coords[0],
                            brightness=props.get('MaxFRP', 0),
                            confidence='high' if fire_mask_value == 9 else 'medium',
                            frp=props.get('MaxFRP', 0),
                            acquisition_time=datetime.fromtimestamp(
                                latest.get('system:time_start').getInfo() / 1000
                            ),
                            satellite='MODIS'
                        )
                        fire_detections.append(detection)
            
            logger.info(f"Detected {len(fire_detections)} active fires")
            return fire_detections
            
        except Exception as e:
            logger.error(f"Error detecting fires: {e}")
            return []
    
    def analyze_flood_extent(self,
                            lat: float,
                            lon: float,
                            radius_km: float = 50,
                            days_back: int = 14,
                            end_date: Optional[datetime] = None) -> Optional[FloodEvent]:
        """
        Analyze flood extent using Sentinel-1 SAR data
        
        Args:
            lat: Center latitude
            lon: Center longitude
            radius_km: Search radius
            days_back: Days to analyze
            
        Returns:
            FloodEvent object or None
        """
        if not self.initialized:
            logger.warning("GEE not initialized. Cannot analyze floods.")
            return None
        
        try:
            # Create region of interest
            point = ee.Geometry.Point([lon, lat])
            region = point.buffer(radius_km * 1000)
            
            # Date ranges
            if end_date is None:
                end_date = datetime.utcnow()
            event_start = end_date - timedelta(days=days_back)
            baseline_start = end_date - timedelta(days=90)
            baseline_end = event_start
            
            # Sentinel-1 SAR data (detects water regardless of clouds)
            s1 = ee.ImageCollection('COPERNICUS/S1_GRD') \
                .filterBounds(region) \
                .filter(ee.Filter.eq('instrumentMode', 'IW')) \
                .filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING')) \
                .select('VV')
            
            # Get baseline (before event)
            baseline = s1.filterDate(
                baseline_start.strftime('%Y-%m-%d'),
                baseline_end.strftime('%Y-%m-%d')
            ).mean()
            
            # Get recent (during/after event)
            recent = s1.filterDate(
                event_start.strftime('%Y-%m-%d'),
                end_date.strftime('%Y-%m-%d')
            ).mean()
            
            # Calculate difference (increased water shows as darker in SAR)
            if baseline.bandNames().size().getInfo() > 0 and recent.bandNames().size().getInfo() > 0:
                difference = recent.subtract(baseline)
                
                # 1. Permanent Water Mask (JRC Global Surface Water)
                # occurrence > 5% means it's generally water
                permanent_water = ee.Image("JRC/GSW1_4/GlobalSurfaceWater").select('occurrence')
                water_mask = permanent_water.gt(5).unmask(0)
                
                # 2. Terrain Slope Mask (SRTM)
                # Floods don't happen on steep slopes, but SAR shadows do
                elevation = ee.Image("USGS/SRTMGL1_003")
                slope = ee.Terrain.slope(elevation)
                slope_mask = slope.gt(5)
                
                # 3. Water detection threshold (Refined from -3.0 to -3.5)
                water_threshold = -3.5  # dB decrease indicates water
                flooded_area = difference.lt(water_threshold)
                
                # Apply Masks: Remove permanent water and steep slopes
                flooded_area = flooded_area.where(water_mask, 0).where(slope_mask, 0)
                
                # Calculate flooded area
                stats = flooded_area.multiply(ee.Image.pixelArea()).reduceRegion(
                    reducer=ee.Reducer.sum(),
                    geometry=region,
                    scale=30,
                    maxPixels=1e9
                )
                
                area_m2 = stats.get('VV').getInfo() or 0
                area_km2 = area_m2 / 1_000_000
                
                # Calculate percentage change
                total_area_m2 = region.area().getInfo()
                percent_change = (area_m2 / total_area_m2) * 100
                
                # Determine severity
                if area_km2 > 100:
                    severity = 'severe'
                elif area_km2 > 50:
                    severity = 'moderate'
                elif area_km2 > 10:
                    severity = 'minor'
                else:
                    severity = 'minimal'
                
                flood_event = FloodEvent(
                    area_km2=area_km2,
                    severity=severity,
                    water_extent_change=percent_change,
                    affected_regions=['Region under analysis'],
                    detection_time=end_date
                )
                
                logger.info(f"Flood analysis: {area_km2:.2f} km² affected ({severity})")
                return flood_event
            
            return None
            
        except Exception as e:
            logger.error(f"Error analyzing flood extent: {e}")
            return None
    
    def get_precipitation_analysis(self,
                                  lat: float,
                                  lon: float,
                                  days_back: int = 30,
                                  end_date: Optional[datetime] = None) -> Optional[PrecipitationData]:
        """
        Analyze precipitation using CHIRPS dataset
        
        Args:
            lat: Latitude
            lon: Longitude
            days_back: Days to analyze
            
        Returns:
            PrecipitationData object
        """
        if not self.initialized:
            logger.warning("GEE not initialized. Cannot analyze precipitation.")
            return None
        
        try:
            point = ee.Geometry.Point([lon, lat])
            
            # Date range
            if end_date is None:
                end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days_back)
            
            # CHIRPS: Climate Hazards Group InfraRed Precipitation with Station data
            chirps = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY') \
                .filterDate(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d')) \
                .select('precipitation')
            
            # Calculate total precipitation
            total_precip_img = chirps.sum()
            total_precip_dict = total_precip_img.reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=point,
                scale=5000
            )
            total_precip = float(
                ee.Number(total_precip_dict.get('precipitation', 0)).getInfo() or 0
            )
            
            # Calculate average daily
            avg_daily = total_precip / days_back
            
            # Get long-term average for anomaly detection
            long_term_start = end_date - timedelta(days=365)
            long_term = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY') \
                .filterDate(long_term_start.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d')) \
                .select('precipitation') \
                .mean()
            
            long_term_dict = long_term.reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=point,
                scale=5000
            )
            long_term_avg = float(
                ee.Number(long_term_dict.get('precipitation', 1)).getInfo() or 1
            )
            if long_term_avg <= 0:
                long_term_avg = 1.0
            
            # Calculate anomaly score (deviation from normal)
            anomaly_score = ((avg_daily - long_term_avg) / long_term_avg) * 100
            
            # Determine drought risk
            if anomaly_score < -50:
                drought_risk = 'severe'
            elif anomaly_score < -25:
                drought_risk = 'moderate'
            elif anomaly_score < -10:
                drought_risk = 'low'
            else:
                drought_risk = 'none'
            
            precip_data = PrecipitationData(
                total_mm=total_precip,
                avg_daily_mm=avg_daily,
                anomaly_score=anomaly_score,
                drought_risk=drought_risk,
                period_days=days_back
            )
            
            logger.info(f"Precipitation: {total_precip:.1f}mm over {days_back} days (anomaly: {anomaly_score:+.1f}%)")
            return precip_data
            
        except Exception as e:
            logger.error(f"Error analyzing precipitation: {e}")
            return None
    
    def calculate_ndvi(self,
                      lat: float,
                      lon: float,
                      radius_km: float = 10,
                      days_back: int = 16,
                      end_date: Optional[datetime] = None) -> Dict[str, Any]:
        """
        Calculate NDVI (Normalized Difference Vegetation Index) for vegetation health
        
        Args:
            lat: Latitude
            lon: Longitude
            radius_km: Radius in kilometers
            days_back: Days to look back
            
        Returns:
            Dictionary with NDVI analysis
        """
        if not self.initialized:
            logger.warning("GEE not initialized. Cannot calculate NDVI.")
            return {'error': 'GEE not initialized'}
        
        try:
            point = ee.Geometry.Point([lon, lat])
            region = point.buffer(radius_km * 1000)
            
            # Date range
            if end_date is None:
                end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days_back)
            
            # Sentinel-2 for high-resolution NDVI
            s2 = ee.ImageCollection('COPERNICUS/S2_SR') \
                .filterDate(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d')) \
                .filterBounds(region) \
                .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
            
            if s2.size().getInfo() > 0:
                # Calculate NDVI
                def add_ndvi(image):
                    ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI')
                    return image.addBands(ndvi)
                
                s2_ndvi = s2.map(add_ndvi).select('NDVI').mean()
                
                # Get NDVI statistics
                stats = s2_ndvi.reduceRegion(
                    reducer=ee.Reducer.mean().combine(
                        ee.Reducer.stdDev(), '', True
                    ).combine(
                        ee.Reducer.minMax(), '', True
                    ),
                    geometry=region,
                    scale=30,
                    maxPixels=1e9
                )
                
                ndvi_mean = stats.get('NDVI_mean').getInfo() or 0
                ndvi_std = stats.get('NDVI_stdDev').getInfo() or 0
                ndvi_min = stats.get('NDVI_min').getInfo() or 0
                ndvi_max = stats.get('NDVI_max').getInfo() or 0
                
                # Interpret NDVI
                if ndvi_mean > 0.6:
                    health = 'excellent'
                elif ndvi_mean > 0.4:
                    health = 'good'
                elif ndvi_mean > 0.2:
                    health = 'moderate'
                else:
                    health = 'poor'
                
                result = {
                    'mean_ndvi': ndvi_mean,
                    'std_ndvi': ndvi_std,
                    'min_ndvi': ndvi_min,
                    'max_ndvi': ndvi_max,
                    'vegetation_health': health,
                    'analysis_date': end_date.isoformat()
                }
                
                logger.info(f"NDVI: {ndvi_mean:.3f} - Vegetation health: {health}")
                return result
            
            return {'error': 'No cloud-free imagery available'}
            
        except Exception as e:
            logger.error(f"Error calculating NDVI: {e}")
            return {'error': str(e)}
    
    def get_comprehensive_satellite_analysis(self,
                                            lat: float,
                                            lon: float,
                                            end_date: Optional[datetime] = None) -> Dict[str, Any]:
        """
        Get comprehensive satellite analysis for all disaster types
        
        Args:
            lat: Latitude
            lon: Longitude
            
        Returns:
            Dictionary with all satellite analyses
        """
        if not self.initialized:
            return {
                'status': 'unavailable',
                'message': 'Google Earth Engine not initialized'
            }
        
        if end_date is None:
            end_date = datetime.utcnow()
            
        logger.info(f"Running comprehensive satellite analysis for ({lat}, {lon}) at {end_date}")
        
        # Run all analyses
        fires = self.detect_active_fires(lat, lon, radius_km=100, days_back=7, end_date=end_date)
        flood = self.analyze_flood_extent(lat, lon, radius_km=50, days_back=14, end_date=end_date)
        precipitation = self.get_precipitation_analysis(lat, lon, days_back=30, end_date=end_date)
        ndvi = self.calculate_ndvi(lat, lon, radius_km=10, days_back=16, end_date=end_date)
        
        return {
            'status': 'success',
            'timestamp': end_date.isoformat(),
            'location': {'lat': lat, 'lon': lon},
            'active_fires': {
                'count': len(fires),
                'detections': [
                    {
                        'lat': f.latitude,
                        'lon': f.longitude,
                        'brightness': f.brightness,
                        'confidence': f.confidence,
                        'frp': f.frp,
                        'time': f.acquisition_time.isoformat(),
                        'satellite': f.satellite
                    }
                    for f in fires
                ]
            },
            'flood_analysis': {
                'detected': flood is not None,
                'area_km2': flood.area_km2 if flood else 0,
                'severity': flood.severity if flood else 'none',
                'water_change_percent': flood.water_extent_change if flood else 0
            } if flood else {'detected': False},
            'precipitation': {
                'total_mm': precipitation.total_mm if precipitation else 0,
                'avg_daily_mm': precipitation.avg_daily_mm if precipitation else 0,
                'anomaly_percent': precipitation.anomaly_score if precipitation else 0,
                'drought_risk': precipitation.drought_risk if precipitation else 'unknown'
            } if precipitation else {},
            'vegetation_health': ndvi
        }


if __name__ == "__main__":
    # Test the satellite monitor
    monitor = SatelliteMonitor()
    
    if monitor.initialized:
        # Tunisia coordinates
        lat, lon = 36.8065, 10.1815
        
        print("\n" + "="*60)
        print("SATELLITE MONITORING TEST")
        print("="*60)
        
        analysis = monitor.get_comprehensive_satellite_analysis(lat, lon)
        
        print(f"\nStatus: {analysis['status']}")
        print(f"\nActive Fires: {analysis['active_fires']['count']}")
        print(f"Flood Detected: {analysis['flood_analysis']['detected']}")
        print(f"Precipitation (30d): {analysis['precipitation'].get('total_mm', 0):.1f} mm")
        print(f"Vegetation Health: {analysis['vegetation_health'].get('vegetation_health', 'N/A')}")
        print("="*60)
    else:
        print("❌ Google Earth Engine not initialized. Check credentials.")
