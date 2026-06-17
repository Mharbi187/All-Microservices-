"""
Advanced Disaster Propagation Models
Implements sophisticated algorithms to forecast disaster spread and impact
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta
import logging
from scipy.spatial.distance import cdist
from scipy.ndimage import convolve

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class PropagationForecast:
    """Disaster propagation forecast result"""
    disaster_type: str
    current_extent_km2: float
    predicted_extent_km2: float
    affected_population: int
    time_to_peak: timedelta
    propagation_direction: str
    risk_zones: List[Dict]
    confidence: float


class WildfirePropagationModel:
    """
    Advanced wildfire spread prediction model
    Based on Rothermel fire spread equations and meteorological conditions
    """
    
    def __init__(self):
        self.fuel_models = {
            'grass': {'ros_base': 2.5, 'moisture_threshold': 0.15},
            'shrub': {'ros_base': 1.8, 'moisture_threshold': 0.20},
            'forest': {'ros_base': 0.5, 'moisture_threshold': 0.25},
            'urban_interface': {'ros_base': 3.0, 'moisture_threshold': 0.12}
        }
    
    def calculate_rate_of_spread(self, fuel_type: str, 
                                 wind_speed_kmh: float,
                                 temperature_c: float,
                                 humidity_percent: float,
                                 slope_percent: float) -> float:
        """
        Calculate fire rate of spread using modified Rothermel model
        
        Args:
            fuel_type: Type of fuel ('grass', 'shrub', 'forest', 'urban_interface')
            wind_speed_kmh: Wind speed in km/h
            temperature_c: Temperature in Celsius
            humidity_percent: Relative humidity percentage
            slope_percent: Slope percentage
            
        Returns:
            Rate of spread in km/h
        """
        fuel_model = self.fuel_models.get(fuel_type, self.fuel_models['forest'])
        base_ros = fuel_model['ros_base']
        
        # Wind effect (exponential relationship)
        wind_factor = 1 + (wind_speed_kmh / 20) ** 1.5
        
        # Moisture effect
        moisture_factor = max(0.1, 1 - (humidity_percent / 100) * 2)
        
        # Temperature effect
        temp_factor = 1 + max(0, (temperature_c - 25) / 50)
        
        # Slope effect (uphill increases spread rate)
        slope_factor = 1 + (slope_percent / 30)
        
        ros = base_ros * wind_factor * moisture_factor * temp_factor * slope_factor
        
        return ros
    
    def predict_spread(self, 
                      current_location: Tuple[float, float],
                      current_size_km2: float,
                      wind_speed_kmh: float,
                      wind_direction_deg: float,
                      temperature_c: float,
                      humidity_percent: float,
                      fuel_type: str = 'forest',
                      hours_ahead: int = 24) -> PropagationForecast:
        """
        Predict wildfire spread over time
        
        Args:
            current_location: (lat, lon) of fire center
            current_size_km2: Current fire size in km²
            wind_speed_kmh: Wind speed
            wind_direction_deg: Wind direction (0-360, where 0 is North)
            temperature_c: Temperature
            humidity_percent: Humidity
            fuel_type: Type of fuel
            hours_ahead: Hours to forecast
            
        Returns:
            PropagationForecast object
        """
        ros = self.calculate_rate_of_spread(
            fuel_type, wind_speed_kmh, temperature_c, humidity_percent, 0
        )
        
        # Calculate spread
        distance_spread_km = ros * hours_ahead
        
        # Elliptical spread pattern (wind-driven)
        length_to_width_ratio = 1 + (wind_speed_kmh / 15)
        major_axis = distance_spread_km * length_to_width_ratio
        minor_axis = distance_spread_km / length_to_width_ratio
        
        # Calculate area (ellipse)
        predicted_size = np.pi * (major_axis / 2) * (minor_axis / 2) + current_size_km2
        
        # Estimate affected population (simplified)
        population_density_per_km2 = 50  # Tunisia rural average
        affected_population = int(predicted_size * population_density_per_km2)
        
        # Determine propagation direction from wind
        directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
        direction_idx = int((wind_direction_deg + 22.5) / 45) % 8
        propagation_direction = directions[direction_idx]
        
        # Calculate risk zones
        risk_zones = self._calculate_risk_zones(
            current_location, major_axis, minor_axis, wind_direction_deg
        )
        
        # Confidence based on data quality
        confidence = self._calculate_confidence(wind_speed_kmh, temperature_c, humidity_percent)
        
        return PropagationForecast(
            disaster_type='wildfire',
            current_extent_km2=current_size_km2,
            predicted_extent_km2=predicted_size,
            affected_population=affected_population,
            time_to_peak=timedelta(hours=hours_ahead),
            propagation_direction=propagation_direction,
            risk_zones=risk_zones,
            confidence=confidence
        )
    
    def _calculate_risk_zones(self, center: Tuple[float, float],
                             major_axis_km: float, minor_axis_km: float,
                             direction_deg: float) -> List[Dict]:
        """Calculate concentric risk zones"""
        zones = []
        
        for i, (zone_name, multiplier) in enumerate([
            ('immediate', 1.0),
            ('high', 1.5),
            ('moderate', 2.0),
            ('watch', 3.0)
        ]):
            zones.append({
                'name': zone_name,
                'center_lat': center[0],
                'center_lon': center[1],
                'radius_km': major_axis_km * multiplier,
                'priority': 4 - i
            })
        
        return zones
    
    def _calculate_confidence(self, wind_speed: float, temp: float, humidity: float) -> float:
        """Calculate prediction confidence based on input quality"""
        confidence = 0.8
        
        # Reduce confidence for extreme conditions
        if wind_speed > 50:
            confidence -= 0.15
        if temp > 45 or temp < 0:
            confidence -= 0.1
        if humidity > 90 or humidity < 10:
            confidence -= 0.1
        
        return max(0.5, confidence)


class FloodPropagationModel:
    """
    Flood inundation and propagation model
    Based on watershed analysis and precipitation forecasts
    """
    
    def __init__(self):
        self.flow_rates = {
            'urban': 0.8,  # High runoff
            'rural': 0.4,  # Moderate runoff
            'forest': 0.2  # Low runoff
        }
    
    def predict_inundation(self,
                          precipitation_mm: float,
                          watershed_area_km2: float,
                          land_use: str,
                          elevation_relief_m: float,
                          river_capacity_m3s: float,
                          hours_duration: int = 24) -> PropagationForecast:
        """
        Predict flood inundation extent
        
        Args:
            precipitation_mm: Rainfall amount
            watershed_area_km2: Watershed catchment area
            land_use: Land use type ('urban', 'rural', 'forest')
            elevation_relief_m: Elevation difference in watershed
            river_capacity_m3s: River channel capacity
            hours_duration: Rainfall duration
            
        Returns:
            PropagationForecast object
        """
        # Calculate runoff volume
        runoff_coefficient = self.flow_rates.get(land_use, 0.4)
        rainfall_m = precipitation_mm / 1000
        runoff_volume_m3 = watershed_area_km2 * 1e6 * rainfall_m * runoff_coefficient
        
        # Calculate peak discharge (simplified rational method)
        time_to_peak_hours = self._calculate_time_to_peak(watershed_area_km2, elevation_relief_m)
        peak_discharge_m3s = runoff_volume_m3 / (time_to_peak_hours * 3600)
        
        # Calculate excess flow (flooding occurs when discharge exceeds capacity)
        excess_discharge = max(0, peak_discharge_m3s - river_capacity_m3s)
        
        # Estimate inundation area
        if excess_discharge > 0:
            # Simplified inundation area calculation
            flood_depth_m = (excess_discharge / river_capacity_m3s) * 2
            flood_width_km = 0.5 * (excess_discharge / river_capacity_m3s) ** 0.5
            river_length_km = watershed_area_km2 ** 0.5 * 3  # Approximate
            inundation_area_km2 = flood_width_km * river_length_km
        else:
            inundation_area_km2 = 0
        
        # Population impact
        population_density = {'urban': 500, 'rural': 80, 'forest': 10}
        affected_population = int(
            inundation_area_km2 * population_density.get(land_use, 80)
        )
        
        # Risk zones
        risk_zones = self._calculate_flood_risk_zones(
            inundation_area_km2, peak_discharge_m3s, river_capacity_m3s
        )
        
        # Confidence
        confidence = 0.75 if excess_discharge > 0 else 0.85
        
        return PropagationForecast(
            disaster_type='flood',
            current_extent_km2=0,
            predicted_extent_km2=inundation_area_km2,
            affected_population=affected_population,
            time_to_peak=timedelta(hours=time_to_peak_hours),
            propagation_direction='downstream',
            risk_zones=risk_zones,
            confidence=confidence
        )
    
    def _calculate_time_to_peak(self, area_km2: float, relief_m: float) -> float:
        """Calculate time to peak flow (Kirpich equation)"""
        if relief_m <= 0:
            return 6  # Default
        
        length_km = area_km2 ** 0.5
        slope = relief_m / (length_km * 1000)
        
        # Kirpich equation
        time_hours = 0.0195 * (length_km * 1000) ** 0.77 * slope ** (-0.385) / 60
        
        return max(1, min(time_hours, 48))
    
    def _calculate_flood_risk_zones(self, inundation_area: float,
                                   peak_discharge: float,
                                   capacity: float) -> List[Dict]:
        """Calculate flood risk zones"""
        severity = peak_discharge / capacity if capacity > 0 else 1
        
        zones = []
        if severity > 2:
            zones.append({'name': 'critical', 'area_km2': inundation_area * 0.3, 'priority': 4})
        if severity > 1.5:
            zones.append({'name': 'high', 'area_km2': inundation_area * 0.5, 'priority': 3})
        if severity > 1:
            zones.append({'name': 'moderate', 'area_km2': inundation_area * 0.8, 'priority': 2})
        
        zones.append({'name': 'watch', 'area_km2': inundation_area * 1.2, 'priority': 1})
        
        return zones


class StormPropagationModel:
    """
    Storm track prediction and impact modeling
    """
    
    def predict_storm_path(self,
                          current_location: Tuple[float, float],
                          wind_speed_kmh: float,
                          wind_direction_deg: float,
                          pressure_mb: float,
                          hours_ahead: int = 48) -> PropagationForecast:
        """
        Predict storm movement and impact
        
        Args:
            current_location: (lat, lon) of storm center
            wind_speed_kmh: Maximum sustained winds
            wind_direction_deg: Direction of movement
            pressure_mb: Central pressure
            hours_ahead: Forecast hours
            
        Returns:
            PropagationForecast object
        """
        # Estimate storm movement speed (typically 20-40 km/h)
        movement_speed_kmh = 25 + (wind_speed_kmh - 60) / 10
        movement_speed_kmh = max(10, min(movement_speed_kmh, 60))
        
        # Calculate distance traveled
        distance_km = movement_speed_kmh * hours_ahead
        
        # Storm diameter (larger for lower pressure)
        diameter_km = 100 + (1013 - pressure_mb) * 5
        
        # Affected area (circular approximation)
        affected_area_km2 = np.pi * (diameter_km / 2) ** 2
        
        # Population impact
        coastal_density = 150  # People per km²
        affected_population = int(affected_area_km2 * coastal_density)
        
        # Determine storm category
        category = self._categorize_storm(wind_speed_kmh)
        
        # Risk zones
        risk_zones = self._calculate_storm_risk_zones(
            current_location, diameter_km, wind_speed_kmh
        )
        
        # Direction
        directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
        direction_idx = int((wind_direction_deg + 22.5) / 45) % 8
        direction = directions[direction_idx]
        
        return PropagationForecast(
            disaster_type=f'{category}_storm',
            current_extent_km2=affected_area_km2,
            predicted_extent_km2=affected_area_km2,
            affected_population=affected_population,
            time_to_peak=timedelta(hours=hours_ahead // 2),
            propagation_direction=direction,
            risk_zones=risk_zones,
            confidence=0.7
        )
    
    def _categorize_storm(self, wind_speed_kmh: float) -> str:
        """Categorize storm by wind speed"""
        if wind_speed_kmh >= 252:
            return 'category_5'
        elif wind_speed_kmh >= 209:
            return 'category_4'
        elif wind_speed_kmh >= 178:
            return 'category_3'
        elif wind_speed_kmh >= 154:
            return 'category_2'
        elif wind_speed_kmh >= 119:
            return 'category_1'
        else:
            return 'tropical_storm'
    
    def _calculate_storm_risk_zones(self, center: Tuple[float, float],
                                   diameter_km: float,
                                   wind_speed: float) -> List[Dict]:
        """Calculate storm risk zones"""
        return [
            {'name': 'eye', 'radius_km': diameter_km * 0.1, 'priority': 5},
            {'name': 'eyewall', 'radius_km': diameter_km * 0.25, 'priority': 4},
            {'name': 'severe', 'radius_km': diameter_km * 0.5, 'priority': 3},
            {'name': 'moderate', 'radius_km': diameter_km * 0.75, 'priority': 2},
            {'name': 'watch', 'radius_km': diameter_km, 'priority': 1}
        ]


class DisasterPropagationAnalyzer:
    """
    Main analyzer that coordinates all propagation models
    """
    
    def __init__(self):
        self.wildfire_model = WildfirePropagationModel()
        self.flood_model = FloodPropagationModel()
        self.storm_model = StormPropagationModel()
    
    def analyze_wildfire_spread(self, **kwargs) -> Dict:
        """Analyze wildfire propagation"""
        forecast = self.wildfire_model.predict_spread(**kwargs)
        return self._forecast_to_dict(forecast)
    
    def analyze_flood_risk(self, **kwargs) -> Dict:
        """Analyze flood propagation"""
        forecast = self.flood_model.predict_inundation(**kwargs)
        return self._forecast_to_dict(forecast)
    
    def analyze_storm_track(self, **kwargs) -> Dict:
        """Analyze storm propagation"""
        forecast = self.storm_model.predict_storm_path(**kwargs)
        return self._forecast_to_dict(forecast)
    
    def _forecast_to_dict(self, forecast: PropagationForecast) -> Dict:
        """Convert forecast to dictionary"""
        return {
            'disaster_type': forecast.disaster_type,
            'current_extent_km2': forecast.current_extent_km2,
            'predicted_extent_km2': forecast.predicted_extent_km2,
            'affected_population': forecast.affected_population,
            'time_to_peak_hours': forecast.time_to_peak.total_seconds() / 3600,
            'propagation_direction': forecast.propagation_direction,
            'risk_zones': forecast.risk_zones,
            'confidence': forecast.confidence,
            'severity': self._calculate_severity(forecast),
            'timestamp': datetime.utcnow().isoformat()
        }
    
    def _calculate_severity(self, forecast: PropagationForecast) -> str:
        """Calculate overall severity level"""
        score = 0
        
        if forecast.predicted_extent_km2 > 100:
            score += 30
        elif forecast.predicted_extent_km2 > 50:
            score += 20
        elif forecast.predicted_extent_km2 > 10:
            score += 10
        
        if forecast.affected_population > 10000:
            score += 40
        elif forecast.affected_population > 5000:
            score += 25
        elif forecast.affected_population > 1000:
            score += 15
        
        if forecast.time_to_peak.total_seconds() < 3600 * 6:
            score += 20
        elif forecast.time_to_peak.total_seconds() < 3600 * 24:
            score += 10
        
        if score >= 70:
            return 'CRITICAL'
        elif score >= 50:
            return 'SEVERE'
        elif score >= 30:
            return 'MODERATE'
        else:
            return 'LOW'


if __name__ == "__main__":
    # Test the propagation models
    analyzer = DisasterPropagationAnalyzer()
    
    print("="*70)
    print("DISASTER PROPAGATION MODEL TESTING")
    print("="*70)
    
    # Test 1: Wildfire
    print("\n1. WILDFIRE PROPAGATION TEST")
    print("-"*70)
    wildfire_forecast = analyzer.analyze_wildfire_spread(
        current_location=(36.8, 10.2),
        current_size_km2=5.0,
        wind_speed_kmh=25,
        wind_direction_deg=90,  # East
        temperature_c=38,
        humidity_percent=15,
        fuel_type='forest',
        hours_ahead=24
    )
    print(f"Disaster Type: {wildfire_forecast['disaster_type']}")
    print(f"Current Extent: {wildfire_forecast['current_extent_km2']:.1f} km²")
    print(f"Predicted Extent (24h): {wildfire_forecast['predicted_extent_km2']:.1f} km²")
    print(f"Affected Population: {wildfire_forecast['affected_population']:,}")
    print(f"Propagation Direction: {wildfire_forecast['propagation_direction']}")
    print(f"Severity: {wildfire_forecast['severity']}")
    print(f"Confidence: {wildfire_forecast['confidence']:.1%}")
    
    # Test 2: Flood
    print("\n2. FLOOD PROPAGATION TEST")
    print("-"*70)
    flood_forecast = analyzer.analyze_flood_risk(
        precipitation_mm=150,
        watershed_area_km2=200,
        land_use='rural',
        elevation_relief_m=300,
        river_capacity_m3s=50,
        hours_duration=12
    )
    print(f"Disaster Type: {flood_forecast['disaster_type']}")
    print(f"Predicted Inundation: {flood_forecast['predicted_extent_km2']:.1f} km²")
    print(f"Affected Population: {flood_forecast['affected_population']:,}")
    print(f"Time to Peak: {flood_forecast['time_to_peak_hours']:.1f} hours")
    print(f"Severity: {flood_forecast['severity']}")
    print(f"Confidence: {flood_forecast['confidence']:.1%}")
    
    # Test 3: Storm
    print("\n3. STORM PROPAGATION TEST")
    print("-"*70)
    storm_forecast = analyzer.analyze_storm_track(
        current_location=(35.0, 11.0),
        wind_speed_kmh=180,
        wind_direction_deg=270,  # West
        pressure_mb=960,
        hours_ahead=48
    )
    print(f"Disaster Type: {storm_forecast['disaster_type']}")
    print(f"Affected Area: {storm_forecast['current_extent_km2']:.1f} km²")
    print(f"Affected Population: {storm_forecast['affected_population']:,}")
    print(f"Movement Direction: {storm_forecast['propagation_direction']}")
    print(f"Severity: {storm_forecast['severity']}")
    print(f"Risk Zones: {len(storm_forecast['risk_zones'])}")
    
    print("\n" + "="*70)
    print("ALL PROPAGATION MODELS TESTED SUCCESSFULLY")
    print("="*70)
