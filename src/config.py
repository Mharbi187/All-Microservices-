"""
Configuration file for Tunisia Disaster Detection Platform
"""
import os
from dotenv import load_dotenv

load_dotenv()

# Geographic Configuration
TUNISIA_ROI = {
    'west': 7.5,
    'south': 30.2,
    'east': 11.5,
    'north': 37.3
}

# ROI as list [west, south, east, north]
TUNISIA_BBOX = [7.5, 30.2, 11.5, 37.3]

# Priority regions (wilaya coordinates)
PRIORITY_REGIONS = {
    'Jendouba': {'lat': 36.5, 'lon': 8.7, 'type': 'wildfire'},
    'Tabarka': {'lat': 36.95, 'lon': 8.75, 'type': 'wildfire'},
    'Nabeul': {'lat': 36.45, 'lon': 10.73, 'type': 'flood'},
    'Tunis': {'lat': 36.8, 'lon': 10.18, 'type': 'flood'},
    'Sousse': {'lat': 35.83, 'lon': 10.64, 'type': 'storm'},
}

# All 24 Tunisian Wilayat (Governorates)
TUNISIAN_WILAYAT = [
    'Tunis', 'Ariana', 'Ben Arous', 'Manouba',
    'Nabeul', 'Zaghouan', 'Bizerte',
    'Béja', 'Jendouba', 'Kef', 'Siliana',
    'Kairouan', 'Kasserine', 'Sidi Bouzid',
    'Sousse', 'Monastir', 'Mahdia', 'Sfax',
    'Gabès', 'Medenine', 'Tataouine',
    'Gafsa', 'Tozeur', 'Kebili'
]

WILAYAT_COORDS = {
    'Tunis': (36.8065, 10.1815),
    'Ariana': (36.8625, 10.1956),
    'Ben Arous': (36.7531, 10.2320),
    'Manouba': (36.8080, 10.1001),
    'Nabeul': (36.4561, 10.7376),
    'Zaghouan': (36.4029, 10.1429),
    'Bizerte': (37.2744, 9.8739),
    'Béja': (36.7256, 9.1816),
    'Jendouba': (36.5011, 8.7802),
    'Le Kef': (36.1676, 8.7046),
    'Siliana': (36.0849, 9.3708),
    'Sousse': (35.8253, 10.6369),
    'Monastir': (35.7779, 10.8261),
    'Mahdia': (35.5047, 11.0622),
    'Sfax': (34.7405, 10.7602),
    'Kairouan': (35.6784, 10.0963),
    'Kasserine': (35.1676, 8.8365),
    'Sidi Bouzid': (35.0382, 9.4849),
    'Gabès': (33.8814, 10.0982),
    'Médenine': (33.3549, 10.5054),
    'Tataouine': (32.9296, 10.4517),
    'Gafsa': (34.4250, 8.7842),
    'Tozeur': (33.9196, 8.1335),
    'Kébili': (33.7043, 8.9690)
}

# Data Source Configuration
GEE_COLLECTIONS = {
    'FIRMS': 'FIRMS',  # NASA Fire Information for Resource Management System
    'HYDROSAR': 'NASA/HydroSAR',  # Flood mapping
    'CHIRPS': 'UCSB-CHG/CHIRPS/DAILY',  # Precipitation
    'SENTINEL2': 'COPERNICUS/S2_SR_HARMONIZED',  # Surface reflectance
    'ALPHAEARTH': 'GOOGLE/SATELLITE_EMBEDDING/V1/ANNUAL'  # AlphaEarth embeddings
}

# Wind Data Resource: OpenWeatherMap (OWM)
# Used for live monitoring and propagation simulations.
# API Key must be set in OPENWEATHER_API_KEY environment variable.


# Temporal Configuration
TIME_WINDOWS = {
    'wildfire': {'hours': -12},  # 12 hours lookback
    'flood': {'days': -2},       # 2 days lookback
    'precipitation': {'days': -1} # 1 day lookback
}

# Risk Thresholds
RISK_THRESHOLDS = {
    'wildfire': {
        'T21': 310,  # Kelvin (brightness temperature)
        'confidence': 50  # FIRMS confidence %
    },
    'flood': {
        'water_extent': 0.5,  # HydroSAR water fraction
        'precipitation': 50   # mm/day (extreme rainfall)
    },
    'extreme_weather': {
        'heatwave': 10,  # <10mm/month precipitation
        'heavy_rain': 50  # >50mm/day precipitation
    }
}

# Model Configuration
# Validated on real GEE data: shallow RF (max_depth=3) avoids overfitting
# on small labelled-event datasets while achieving 90% accuracy.
MODEL_CONFIG = {
    'algorithm': 'RandomForest',
    'n_estimators': 100,
    'max_depth': 3,
    'min_samples_split': 5,
    'min_samples_leaf': 2,
    'random_state': 42,
    'n_jobs': -1
}

# Feature Configuration
ALPHAEARTH_BANDS = ['A00', 'A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09']  # Top 10 AlphaEarth dimensions
SENTINEL2_BANDS = ['B8', 'B4', 'B11']  # NIR, Red, SWIR for vegetation/fire

# Sampling Configuration
SAMPLE_CONFIG = {
    'scale': 1000,  # meters (1km resolution)
    'num_pixels': 5000,  # For training
    'urban_scale': 500,  # meters for urban areas
    'rural_scale': 1000  # meters for rural areas
}

# Cache Configuration
CACHE_CONFIG = {
    'ttl_seconds': 900,  # 15 minutes
    'db_path': os.getenv('CACHE_DB_PATH', 'data/cache/gee_cache.db')
}

# Alert Configuration
ALERT_CONFIG = {
    'sms_threshold': 0.8,  # Send SMS if risk > 0.8
    'email_threshold': 0.6,  # Send email if risk > 0.6
    'max_alerts_per_day': 50,
    'confidence_label': True  # Show confidence % in alerts
}

# Twilio Configuration
TWILIO_CONFIG = {
    'account_sid': os.getenv('TWILIO_ACCOUNT_SID'),
    'auth_token': os.getenv('TWILIO_AUTH_TOKEN'),
    'phone_number': os.getenv('TWILIO_PHONE_NUMBER'),
    'recipients': os.getenv('ALERT_PHONE_NUMBERS', '').split(',')
}

# SendGrid Configuration
SENDGRID_CONFIG = {
    'api_key': os.getenv('SENDGRID_API_KEY'),
    'from_email': os.getenv('SENDGRID_FROM_EMAIL', 'alerts@tunisia-disaster.org'),
    'recipients': os.getenv('ALERT_EMAILS', '').split(',')
}

# Validation Events (for backtesting)
VALIDATION_EVENTS = {
    '2023_nabeul_floods': {
        'date': '2023-09-15',
        'location': [36.45, 10.73],
        'type': 'flood',
        'description': 'Major flooding in Nabeul, thousands displaced'
    },
    '2024_tabarka_fires': {
        'date': '2024-07-20',
        'location': [36.95, 8.75],
        'type': 'wildfire',
        'description': '15% forest loss in Tabarka region'
    },
    '2023_heatwave': {
        'date': '2023-07-01',
        'location': [35.83, 10.64],
        'type': 'extreme_weather',
        'description': 'Severe heatwave, <10mm precipitation'
    }
}

# Performance Targets
PERFORMANCE_TARGETS = {
    'accuracy': 0.85,
    'precision': 0.80,
    'recall': 0.80,
    'false_positive_rate': 0.15,
    'alert_latency_minutes': 15,
    'uptime_percentage': 95
}

# UI Configuration
UI_CONFIG = {
    'default_language': 'العربية',
    'available_languages': ['العربية', 'English'],
    'map_center': [34.0, 9.0],  # Tunisia center
    'map_zoom': 7,
    'color_scheme': {
        'high_risk': '#FF0000',
        'medium_risk': '#FFA500',
        'low_risk': '#00FF00',
        'no_risk': '#0000FF'
    }
}

# Arabic Translations
TRANSLATIONS = {
    'العربية': {
        'title': 'منصة رصد الكوارث في تونس',
        'wildfire': 'حريق',
        'flood': 'فيضان',
        'storm': 'عاصفة',
        'heatwave': 'موجة حر',
        'high_risk': 'خطر مرتفع',
        'medium_risk': 'خطر متوسط',
        'low_risk': 'خطر منخفض',
        'select_wilaya': 'اختر الولاية',
        'alert': 'تنبيه',
        'disclaimer': 'نسخة تجريبية: يرجى التحقق من السلطات الرسمية'
    },
    'English': {
        'title': 'Tunisia Disaster Detection Platform',
        'wildfire': 'Wildfire',
        'flood': 'Flood',
        'storm': 'Storm',
        'heatwave': 'Heatwave',
        'high_risk': 'High Risk',
        'medium_risk': 'Medium Risk',
        'low_risk': 'Low Risk',
        'select_wilaya': 'Select Wilaya',
        'alert': 'Alert',
        'disclaimer': 'Beta Version: Please verify with official authorities'
    }
}

# Logging Configuration
LOG_CONFIG = {
    'level': os.getenv('LOG_LEVEL', 'INFO'),
    'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    'file': 'logs/app.log'
}

# API Configuration (for future expansion)
API_CONFIG = {
    'host': '0.0.0.0',
    'port': 8000,
    'enable_cors': True
}
