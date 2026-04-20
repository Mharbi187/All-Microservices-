"""
Multi-Source Data Monitoring System
Integrates weather APIs, news feeds, and seismic data for comprehensive disaster monitoring
"""

import requests
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import json
from dataclasses import dataclass
import os
from dotenv import load_dotenv

# Import satellite monitoring
try:
    from .satellite_monitor import SatelliteMonitor
    SATELLITE_AVAILABLE = True
except ImportError:
    logger.warning("Satellite monitoring not available. Install 'earthengine-api' to enable.")
    SATELLITE_AVAILABLE = False

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class WeatherAlert:
    """Weather alert data structure"""
    alert_type: str
    severity: str
    description: str
    start_time: datetime
    end_time: datetime
    affected_area: str
    source: str


@dataclass
class SeismicEvent:
    """Seismic event data structure"""
    magnitude: float
    depth: float
    latitude: float
    longitude: float
    location: str
    timestamp: datetime
    source: str
    event_id: str


@dataclass
class NewsAlert:
    """News-based alert data structure"""
    title: str
    description: str
    source: str
    url: str
    published_at: datetime
    keywords: List[str]
    severity_score: float


class WeatherAPIMonitor:
    """
    Monitor multiple weather APIs for severe weather alerts
    Supports: OpenWeather, AccuWeather
    """
    
    def __init__(self):
        self.openweather_api_key = os.getenv('OPENWEATHER_API_KEY')
        self.accuweather_api_key = os.getenv('ACCUWEATHER_API_KEY')
        self.base_url_openweather = "https://api.openweathermap.org/data/3.0"
        self.base_url_accuweather = "http://dataservice.accuweather.com"
        
    def get_openweather_alerts(self, lat: float, lon: float) -> List[WeatherAlert]:
        """
        Fetch weather alerts from OpenWeather OneCall API
        
        Args:
            lat: Latitude
            lon: Longitude
            
        Returns:
            List of WeatherAlert objects
        """
        if not self.openweather_api_key:
            logger.warning("OpenWeather API key not configured")
            return []
        
        try:
            url = f"{self.base_url_openweather}/onecall"
            params = {
                'lat': lat,
                'lon': lon,
                'appid': self.openweather_api_key,
                'exclude': 'minutely,hourly'
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            alerts = []
            if 'alerts' in data:
                for alert_data in data['alerts']:
                    alert = WeatherAlert(
                        alert_type=alert_data.get('event', 'Unknown'),
                        severity='high',
                        description=alert_data.get('description', ''),
                        start_time=datetime.fromtimestamp(alert_data.get('start', 0)),
                        end_time=datetime.fromtimestamp(alert_data.get('end', 0)),
                        affected_area=alert_data.get('sender_name', 'Unknown'),
                        source='OpenWeather'
                    )
                    alerts.append(alert)
            
            logger.info(f"Fetched {len(alerts)} alerts from OpenWeather")
            return alerts
            
        except Exception as e:
            logger.error(f"Error fetching OpenWeather alerts: {e}")
            return []
    
    def get_severe_weather_forecast(self, lat: float, lon: float) -> Dict[str, Any]:
        """
        Get severe weather forecast for the next 7 days
        
        Args:
            lat: Latitude
            lon: Longitude
            
        Returns:
            Dictionary with forecast data and risk scores
        """
        if not self.openweather_api_key:
            return {'error': 'API key not configured'}
        
        try:
            url = f"{self.base_url_openweather}/onecall"
            params = {
                'lat': lat,
                'lon': lon,
                'appid': self.openweather_api_key,
                'units': 'metric'
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            # Analyze daily forecasts for severe weather
            severe_weather_days = []
            for day in data.get('daily', [])[:7]:
                risk_score = 0
                risk_factors = []
                
                # Check for heavy rain
                if day.get('rain', 0) > 50:
                    risk_score += 30
                    risk_factors.append('heavy_rain')
                
                # Check for extreme temperatures
                temp_max = day.get('temp', {}).get('max', 0)
                if temp_max > 40:
                    risk_score += 25
                    risk_factors.append('extreme_heat')
                
                # Check for high wind
                wind_speed = day.get('wind_speed', 0)
                if wind_speed > 20:
                    risk_score += 20
                    risk_factors.append('high_wind')
                
                # Check for storms
                weather_main = day.get('weather', [{}])[0].get('main', '')
                if weather_main in ['Thunderstorm', 'Tornado']:
                    risk_score += 35
                    risk_factors.append('storm')
                
                if risk_score > 30:
                    severe_weather_days.append({
                        'date': datetime.fromtimestamp(day['dt']),
                        'risk_score': risk_score,
                        'risk_factors': risk_factors,
                        'temp_max': temp_max,
                        'rain': day.get('rain', 0),
                        'wind_speed': wind_speed,
                        'description': day.get('weather', [{}])[0].get('description', '')
                    })
            
            return {
                'severe_days_count': len(severe_weather_days),
                'severe_days': severe_weather_days,
                'max_risk_score': max([d['risk_score'] for d in severe_weather_days]) if severe_weather_days else 0
            }
            
        except Exception as e:
            logger.error(f"Error fetching weather forecast: {e}")
            return {'error': str(e)}


class SeismicDataMonitor:
    """
    Monitor seismic data from USGS and EMSC
    """
    
    def __init__(self):
        self.usgs_base_url = "https://earthquake.usgs.gov/fdsnws/event/1/query"
        self.emsc_base_url = "https://www.seismicportal.eu/fdsnws/event/1/query"
        
    def get_usgs_earthquakes(self, min_magnitude: float = 4.0, 
                             days_back: int = 7,
                             lat: float = None, lon: float = None,
                             radius_km: float = 500) -> List[SeismicEvent]:
        """
        Fetch earthquake data from USGS
        
        Args:
            min_magnitude: Minimum earthquake magnitude
            days_back: Number of days to look back
            lat: Center latitude for radius search
            lon: Center longitude for radius search
            radius_km: Search radius in kilometers
            
        Returns:
            List of SeismicEvent objects
        """
        try:
            start_time = (datetime.utcnow() - timedelta(days=days_back)).isoformat()
            
            params = {
                'format': 'geojson',
                'starttime': start_time,
                'minmagnitude': min_magnitude,
                'orderby': 'magnitude'
            }
            
            # Add location-based filtering if coordinates provided
            if lat is not None and lon is not None:
                params.update({
                    'latitude': lat,
                    'longitude': lon,
                    'maxradiuskm': radius_km
                })
            
            response = requests.get(self.usgs_base_url, params=params, timeout=15)
            response.raise_for_status()
            data = response.json()
            
            events = []
            for feature in data.get('features', []):
                props = feature['properties']
                coords = feature['geometry']['coordinates']
                
                event = SeismicEvent(
                    magnitude=props.get('mag', 0),
                    depth=coords[2],
                    latitude=coords[1],
                    longitude=coords[0],
                    location=props.get('place', 'Unknown'),
                    timestamp=datetime.fromtimestamp(props.get('time', 0) / 1000),
                    source='USGS',
                    event_id=props.get('code', '')
                )
                events.append(event)
            
            logger.info(f"Fetched {len(events)} earthquakes from USGS")
            return events
            
        except Exception as e:
            logger.error(f"Error fetching USGS earthquakes: {e}")
            return []
    
    def get_emsc_earthquakes(self, min_magnitude: float = 4.0,
                            days_back: int = 7) -> List[SeismicEvent]:
        """
        Fetch earthquake data from EMSC (European-Mediterranean Seismological Centre)
        
        Args:
            min_magnitude: Minimum earthquake magnitude
            days_back: Number of days to look back
            
        Returns:
            List of SeismicEvent objects
        """
        try:
            start_time = (datetime.utcnow() - timedelta(days=days_back)).isoformat()
            
            params = {
                'format': 'json',
                'start': start_time,
                'minmag': min_magnitude,
                'orderby': 'magnitude'
            }
            
            response = requests.get(self.emsc_base_url, params=params, timeout=15)
            response.raise_for_status()
            data = response.json()
            
            events = []
            # EMSC JSON structure may vary, handle gracefully
            if isinstance(data, dict) and 'events' in data:
                for event_data in data['events']:
                    event = SeismicEvent(
                        magnitude=event_data.get('mag', 0),
                        depth=event_data.get('depth', 0),
                        latitude=event_data.get('lat', 0),
                        longitude=event_data.get('lon', 0),
                        location=event_data.get('flynn_region', 'Unknown'),
                        timestamp=datetime.fromisoformat(event_data.get('time', '')),
                        source='EMSC',
                        event_id=event_data.get('id', '')
                    )
                    events.append(event)
            
            logger.info(f"Fetched {len(events)} earthquakes from EMSC")
            return events
            
        except Exception as e:
            logger.error(f"Error fetching EMSC earthquakes: {e}")
            return []


class NewsMonitor:
    """
    Monitor news sources for disaster-related information
    Supports: Google News API, Twitter (via API)
    """
    
    def __init__(self):
        self.newsapi_key = os.getenv('NEWS_API_KEY')
        self.twitter_bearer_token = os.getenv('TWITTER_BEARER_TOKEN')
        self.newsapi_base_url = "https://newsapi.org/v2/everything"
        
        # Disaster-related keywords
        self.disaster_keywords = [
            'earthquake', 'flood', 'wildfire', 'tsunami', 'hurricane',
            'tornado', 'drought', 'landslide', 'volcanic eruption',
            'storm', 'cyclone', 'disaster', 'emergency', 'evacuation',
            'زلزال', 'فيضان', 'حريق', 'إعصار', 'كارثة'  # Arabic keywords
        ]
    
    def search_news(self, location: str = "Tunisia", 
                   days_back: int = 1,
                   language: str = 'en') -> List[NewsAlert]:
        """
        Search news for disaster-related articles
        
        Args:
            location: Location to search for
            days_back: Number of days to look back
            language: Language code (en, ar, etc.)
            
        Returns:
            List of NewsAlert objects
        """
        if not self.newsapi_key:
            logger.warning("News API key not configured")
            return []
        
        try:
            from_date = (datetime.utcnow() - timedelta(days=days_back)).isoformat()
            
            # Build query with disaster keywords and location
            query = f'({" OR ".join(self.disaster_keywords[:10])}) AND {location}'
            
            params = {
                'q': query,
                'from': from_date,
                'language': language,
                'sortBy': 'publishedAt',
                'apiKey': self.newsapi_key
            }
            
            response = requests.get(self.newsapi_base_url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            alerts = []
            for article in data.get('articles', []):
                # Extract keywords and calculate severity
                title = article.get('title', '').lower()
                description = article.get('description', '').lower()
                
                matched_keywords = [kw for kw in self.disaster_keywords 
                                   if kw in title or kw in description]
                
                # Simple severity scoring based on keywords
                severity_score = len(matched_keywords) * 0.2
                if 'emergency' in title or 'urgent' in title:
                    severity_score += 0.3
                if 'death' in description or 'casualties' in description:
                    severity_score += 0.3
                
                alert = NewsAlert(
                    title=article.get('title', ''),
                    description=article.get('description', ''),
                    source=article.get('source', {}).get('name', 'Unknown'),
                    url=article.get('url', ''),
                    published_at=datetime.fromisoformat(
                        article.get('publishedAt', '').replace('Z', '+00:00')
                    ),
                    keywords=matched_keywords,
                    severity_score=min(severity_score, 1.0)
                )
                alerts.append(alert)
            
            # Sort by severity
            alerts.sort(key=lambda x: x.severity_score, reverse=True)
            
            logger.info(f"Fetched {len(alerts)} news alerts")
            return alerts[:20]  # Return top 20
            
        except Exception as e:
            logger.error(f"Error fetching news: {e}")
            return []
    
    def get_twitter_alerts(self, location: str = "Tunisia", 
                          max_results: int = 20) -> List[Dict]:
        """
        Search Twitter for disaster-related tweets (requires Twitter API v2)
        
        Args:
            location: Location to search
            max_results: Maximum number of tweets to return
            
        Returns:
            List of tweet data dictionaries
        """
        if not self.twitter_bearer_token:
            logger.warning("Twitter API token not configured")
            return []
        
        try:
            url = "https://api.twitter.com/2/tweets/search/recent"
            
            # Build query
            keywords = ' OR '.join(self.disaster_keywords[:5])
            query = f'({keywords}) {location} -is:retweet'
            
            headers = {
                'Authorization': f'Bearer {self.twitter_bearer_token}'
            }
            
            params = {
                'query': query,
                'max_results': max_results,
                'tweet.fields': 'created_at,public_metrics,entities'
            }
            
            response = requests.get(url, headers=headers, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            tweets = data.get('data', [])
            logger.info(f"Fetched {len(tweets)} tweets")
            return tweets
            
        except Exception as e:
            logger.error(f"Error fetching Twitter data: {e}")
            return []


class MultiSourceAggregator:
    """
    Aggregate data from all sources and provide unified interface
    """
    
    def __init__(self):
        self.weather_monitor = WeatherAPIMonitor()
        self.seismic_monitor = SeismicDataMonitor()
        self.news_monitor = NewsMonitor()
        
        # Initialize satellite monitor if available
        if SATELLITE_AVAILABLE:
            try:
                self.satellite_monitor = SatelliteMonitor()
                logger.info("✅ Satellite monitoring enabled")
            except Exception as e:
                logger.warning(f"Satellite monitor initialization failed: {e}")
                self.satellite_monitor = None
        else:
            self.satellite_monitor = None
    
    def get_comprehensive_alerts(self, lat: float, lon: float, 
                                location: str = "Tunisia") -> Dict[str, Any]:
        """
        Get all alerts from all sources
        
        Args:
            lat: Latitude
            lon: Longitude
            location: Location name
            
        Returns:
            Dictionary with all alert types
        """
        logger.info(f"Fetching comprehensive alerts for {location}")
        
        # Fetch all data in parallel (could be optimized with async)
        weather_alerts = self.weather_monitor.get_openweather_alerts(lat, lon)
        weather_forecast = self.weather_monitor.get_severe_weather_forecast(lat, lon)
        
        earthquakes_usgs = self.seismic_monitor.get_usgs_earthquakes(
            min_magnitude=3.0, lat=lat, lon=lon, radius_km=500
        )
        earthquakes_emsc = self.seismic_monitor.get_emsc_earthquakes(min_magnitude=3.0)
        
        news_alerts = self.news_monitor.search_news(location=location, days_back=2)
        
        # Fetch satellite data if available
        satellite_data = {}
        if self.satellite_monitor and self.satellite_monitor.initialized:
            try:
                satellite_data = self.satellite_monitor.get_comprehensive_satellite_analysis(lat, lon)
                logger.info("✅ Satellite data integrated")
            except Exception as e:
                logger.warning(f"Satellite data fetch failed: {e}")
                satellite_data = {'status': 'error', 'message': str(e)}
        else:
            satellite_data = {'status': 'unavailable', 'message': 'Satellite monitoring not initialized'}
        
        # Calculate overall risk score
        risk_score = 0
        
        # Weather contribution
        if weather_alerts:
            risk_score += len(weather_alerts) * 15
        risk_score += weather_forecast.get('max_risk_score', 0) * 0.5
        
        # Seismic contribution
        for eq in earthquakes_usgs + earthquakes_emsc:
            if eq.magnitude >= 6.0:
                risk_score += 40
            elif eq.magnitude >= 5.0:
                risk_score += 25
            elif eq.magnitude >= 4.0:
                risk_score += 10
        
        # News contribution
        high_severity_news = [n for n in news_alerts if n.severity_score > 0.6]
        risk_score += len(high_severity_news) * 5
        
        # Satellite contribution
        if satellite_data.get('status') == 'success':
            # Active fires
            fire_count = satellite_data.get('active_fires', {}).get('count', 0)
            risk_score += fire_count * 20
            
            # Flood detection
            if satellite_data.get('flood_analysis', {}).get('detected'):
                flood_severity = satellite_data.get('flood_analysis', {}).get('severity', 'none')
                if flood_severity == 'severe':
                    risk_score += 35
                elif flood_severity == 'moderate':
                    risk_score += 20
                elif flood_severity == 'minor':
                    risk_score += 10
            
            # Drought risk from precipitation
            drought_risk = satellite_data.get('precipitation', {}).get('drought_risk', 'none')
            if drought_risk == 'severe':
                risk_score += 15
            elif drought_risk == 'moderate':
                risk_score += 8
        
        risk_score = min(risk_score, 100)
        
        return {
            'timestamp': datetime.utcnow().isoformat(),
            'location': location,
            'coordinates': {'lat': lat, 'lon': lon},
            'overall_risk_score': risk_score,
            'risk_level': self._get_risk_level(risk_score),
            'weather_alerts': [
                {
                    'type': a.alert_type,
                    'severity': a.severity,
                    'description': a.description,
                    'start': a.start_time.isoformat(),
                    'end': a.end_time.isoformat()
                }
                for a in weather_alerts
            ],
            'severe_weather_forecast': weather_forecast,
            'earthquakes': [
                {
                    'magnitude': e.magnitude,
                    'depth': e.depth,
                    'location': e.location,
                    'time': e.timestamp.isoformat(),
                    'source': e.source
                }
                for e in (earthquakes_usgs + earthquakes_emsc)[:10]
            ],
            'news_alerts': [
                {
                    'title': n.title,
                    'source': n.source,
                    'severity': n.severity_score,
                    'published': n.published_at.isoformat(),
                    'url': n.url
                }
                for n in news_alerts[:10]
            ],
            'summary': self._generate_summary(
                weather_alerts, earthquakes_usgs + earthquakes_emsc, news_alerts, satellite_data
            ),
            'satellite_data': satellite_data
        }
    
    def _get_risk_level(self, risk_score: float) -> str:
        """Convert risk score to level"""
        if risk_score >= 70:
            return 'CRITICAL'
        elif risk_score >= 50:
            return 'HIGH'
        elif risk_score >= 30:
            return 'MODERATE'
        elif risk_score >= 10:
            return 'LOW'
        else:
            return 'MINIMAL'
    
    def _generate_summary(self, weather_alerts, earthquakes, news_alerts, satellite_data=None) -> str:
        """Generate human-readable summary"""
        parts = []
        
        if weather_alerts:
            parts.append(f"{len(weather_alerts)} active weather alert(s)")
        
        if earthquakes:
            max_mag = max([e.magnitude for e in earthquakes])
            parts.append(f"{len(earthquakes)} seismic event(s), max magnitude {max_mag:.1f}")
        
        if news_alerts:
            high_severity = len([n for n in news_alerts if n.severity_score > 0.6])
            parts.append(f"{len(news_alerts)} news mention(s), {high_severity} high-severity")
        
        # Add satellite data summary
        if satellite_data and satellite_data.get('status') == 'success':
            fire_count = satellite_data.get('active_fires', {}).get('count', 0)
            if fire_count > 0:
                parts.append(f"{fire_count} active fire(s) detected by satellite")
            
            if satellite_data.get('flood_analysis', {}).get('detected'):
                flood_area = satellite_data.get('flood_analysis', {}).get('area_km2', 0)
                parts.append(f"Flood detected: {flood_area:.1f} km²")
        
        if not parts:
            return "No significant alerts detected"
        
        return "; ".join(parts)


if __name__ == "__main__":
    # Test the multi-source aggregator
    aggregator = MultiSourceAggregator()
    
    # Tunisia coordinates (Tunis center)
    lat, lon = 36.8065, 10.1815
    
    print("Fetching comprehensive alerts for Tunisia...")
    alerts = aggregator.get_comprehensive_alerts(lat, lon, "Tunisia")
    
    print(f"\n{'='*60}")
    print("COMPREHENSIVE ALERT SUMMARY")
    print('='*60)
    print(f"Risk Level: {alerts['risk_level']}")
    print(f"Risk Score: {alerts['overall_risk_score']}/100")
    print(f"\nSummary: {alerts['summary']}")
    print(f"\nWeather Alerts: {len(alerts['weather_alerts'])}")
    print(f"Earthquakes: {len(alerts['earthquakes'])}")
    print(f"News Mentions: {len(alerts['news_alerts'])}")
    print('='*60)
