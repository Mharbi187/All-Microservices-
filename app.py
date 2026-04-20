"""
Tunisia Disaster Detection Platform
Main Streamlit Dashboard
"""

import streamlit as st
import folium
from streamlit_folium import st_folium
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import logging
import os

# Import custom modules
from src.data_acquisition import GEEDataAcquisition
from src.model import DisasterRiskModel
from src.alerts import AlertSystem
from src.weather import get_current_weather
from src.config import (
    TUNISIA_BBOX, TUNISIAN_WILAYAT, UI_CONFIG, TRANSLATIONS,
    PRIORITY_REGIONS, PERFORMANCE_TARGETS
)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Page configuration
st.set_page_config(
    page_title="Tunisia Disaster Detection | رصد الكوارث في تونس",
    page_icon="🚨",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for modern, premium UI
st.markdown("""
<style>
    /* Import modern fonts */
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap');
    
   /* Global styles */
    * {
        font-family: 'Inter', 'Noto Sans Arabic', sans-serif;
    }
    
    /* Arabic text styling */
    .arabic-text {
        font-family: 'Noto Sans Arabic', sans-serif;
        direction: rtl;
        text-align: right;
    }
    
    /* Main app background with subtle gradient */
    .stApp {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%);
        background-size: 400% 400%;
        animation: gradientShift 15s ease infinite;
    }
    
    @keyframes gradientShift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
    }
    
    /* Alert styling with gradient borders */
    .stAlert {
        padding: 1.5rem;
        border-radius: 1rem;
        border: 2px solid transparent;
        background: linear-gradient(white, white) padding-box,
                    linear-gradient(135deg, #667eea, #764ba2) border-box;
        box-shadow: 0 8px 32px rgba(31, 38, 135, 0.2);
        backdrop-filter: blur(10px);
        transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    
    .stAlert:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 48px rgba(31, 38, 135, 0.3);
    }
    
    /* Metric cards with glassmorphism */
    .metric-card {
        background: rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(15px);
        padding: 1.5rem;
        border-radius: 1.25rem;
        margin: 0.5rem 0;
        border: 1px solid rgba(255, 255, 255, 0.3);
        box-shadow: 0 8px 32px rgba(31, 38, 135, 0.15);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .metric-card:hover {
        transform: translateY(-5px) scale(1.02);
        box-shadow: 0 16px 48px rgba(31, 38, 135, 0.25);
        border-color: rgba(102, 126, 234, 0.5);
    }
    
    /* Enhanced metric styling */
    [data-testid="stMetricValue"] {
        font-size: 2.5rem;
        font-weight: 700;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
    }
    
    [data-testid="stMetricLabel"] {
        font-size: 1rem;
        font-weight: 600;
        color: #4a5568;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    
    /* Sidebar styling */
    [data-testid="stSidebar"] {
        background: linear-gradient(180deg, rgba(102, 126, 234, 0.95) 0%, rgba(118, 75, 162, 0.95) 100%);
        backdrop-filter: blur(20px);
    }
    
    [data-testid="stSidebar"] * {
        color: white !important;
    }
    
    /* Button enhancements */
    .stButton > button {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius:0.75rem;
        padding: 0.75rem 2rem;
        font-weight: 600;
        transition: all 0.3s ease;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    }
    
    .stButton > button:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.6);
        background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
    }
    
    /* Tab styling */
    .stTabs [data-baseweb="tab-list"] {
        gap: 1rem;
        background: rgba(255, 255, 255, 0.9);
        padding: 0.5rem;
        border-radius: 1rem;
    }
    
    .stTabs [data-baseweb="tab"] {
        border-radius: 0.75rem;
        padding: 0.75rem 1.5rem;
        font-weight: 600;
        transition: all 0.3s ease;
    }
    
    .stTabs [aria-selected="true"] {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white !important;
    }
    
    /* Expander styling */
    .streamlit-expanderHeader {
        background: rgba(255, 255, 255, 0.9);
        border-radius: 0.75rem;
        padding: 1rem;
        font-weight: 600;
        transition: all 0.3s ease;
    }
    
    .streamlit-expanderHeader:hover {
        background: rgba(102, 126, 234, 0.1);
        transform: translateX(5px);
    }
    
    /* Smooth page transitions */
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    .element-container {
        animation: fadeIn 0.6s ease-out;
    }
    
    /* Success/Warning/Error message styling */
    .stSuccess, .stWarning, .stError {
        border-radius: 1rem;
        padding: 1.25rem;
        animation: slideIn 0.4s ease-out;
    }
    
    @keyframes slideIn {
        from { transform: translateX(-100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    /* DataFrame styling */
    .dataframe {
        border-radius: 1rem !important;
        overflow: hidden;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    }
    
    /* Scrollbar styling */
    ::-webkit-scrollbar {
        width: 10px;
        height: 10px;
    }
    
    ::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
    }
    
    ::-webkit-scrollbar-thumb {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 10px;
    }
    
    ::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
    }
</style>
""", unsafe_allow_html=True)


# Initialize session state
if 'language' not in st.session_state:
    st.session_state.language = 'العربية'

if 'gee_initialized' not in st.session_state:
    st.session_state.gee_initialized = False

if 'model_loaded' not in st.session_state:
    st.session_state.model_loaded = False


@st.cache_resource
def initialize_gee():
    """Initialize Google Earth Engine (cached)"""
    try:
        gee = GEEDataAcquisition()
        logger.info("GEE initialized successfully")
        return gee
    except Exception as e:
        logger.error(f"Failed to initialize GEE: {e}")
        st.error(f"Failed to connect to Google Earth Engine: {e}")
        return None


@st.cache_resource
def load_model():
    """Load trained model (cached)"""
    try:
        model = DisasterRiskModel()
        
        # Check if model file exists
        if os.path.exists(model.model_path):
            model.load()
            logger.info("Model loaded successfully")
        else:
            logger.warning("No trained model found. Using untrained model.")
            st.warning("⚠️ No trained model found. Please train the model first.")
        
        return model
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        st.error(f"Failed to load model: {e}")
        return None


@st.cache_data(ttl=900)  # Cache for 15 minutes
def get_realtime_data():
    """Fetch real-time data from GEE"""
    gee = initialize_gee()
    if gee is None:
        return None
    
    try:
        # Create composite image
        composite = gee.create_composite_image(include_sentinel=False)
        
        # Sample data
        df = gee.sample_data(composite, num_pixels=1000, scale=1000)
        
        logger.info(f"Fetched {len(df)} data points")
        return df
    
    except Exception as e:
        logger.error(f"Error fetching real-time data: {e}")
        st.error(f"Error fetching data: {e}")
        return None


def create_risk_map(df: pd.DataFrame, risk_scores: np.ndarray, title: str = "Risk") -> folium.Map:
    """
    Create Folium map with risk visualization
    
    Args:
        df: DataFrame with location data
        risk_scores: Array of risk scores (0-1)
    
    Returns:
        Folium map object
    """
    # Create base map centered on Tunisia
    m = folium.Map(
        location=UI_CONFIG['map_center'],
        zoom_start=UI_CONFIG['map_zoom'],
        tiles='OpenStreetMap'
    )
    
    # Add risk markers
    if '.geo' in df.columns:
        for idx, row in df.iterrows():
            if idx >= len(risk_scores):
                break
            
            risk = float(risk_scores[idx])
            
            # Determine color based on risk
            if risk >= 0.8:
                color = 'red'
                icon = 'exclamation-triangle'
            elif risk >= 0.5:
                color = 'orange'
                icon = 'exclamation-circle'
            elif risk >= 0.3:
                color = 'yellow'
                icon = 'info-circle'
            else:
                color = 'green'
                icon = 'check-circle'
            
            # Get coordinates
            try:
                geom = row['.geo']
                if hasattr(geom, 'coordinates'):
                    coords = geom.coordinates
                    lat, lon = coords[1], coords[0]
                    
                    # Add marker
                    folium.Marker(
                        location=[lat, lon],
                        popup=f"{title}: {risk:.2%}",
                        icon=folium.Icon(color=color, icon=icon, prefix='fa'),
                        tooltip=f"{title}: {risk:.0%}"
                    ).add_to(m)
            except:
                continue
    
    # Add priority regions
    for name, info in PRIORITY_REGIONS.items():
        folium.CircleMarker(
            location=[info['lat'], info['lon']],
            radius=10,
            popup=f"{name} - Priority: {info['type']}",
            color='blue',
            fill=True,
            fillColor='blue',
            fillOpacity=0.3
        ).add_to(m)
    
    # Add legend
    legend_html = '''
    <div style="position: fixed; 
                bottom: 50px; right: 50px; width: 200px; height: 140px; 
                background-color: white; border:2px solid grey; z-index:9999; 
                font-size:14px; padding: 10px">
        <p><b>Risk Levels</b></p>
        <p><i class="fa fa-circle" style="color:red"></i> High (>80%)</p>
        <p><i class="fa fa-circle" style="color:orange"></i> Medium (50-80%)</p>
        <p><i class="fa fa-circle" style="color:yellow"></i> Low (30-50%)</p>
        <p><i class="fa fa-circle" style="color:green"></i> Minimal (<30%)</p>
    </div>
    '''
    m.get_root().html.add_child(folium.Element(legend_html))
    
    return m


def sidebar():
    """Render sidebar with controls"""
    trans = TRANSLATIONS[st.session_state.language]
    
    with st.sidebar:
        # Language selector
        st.session_state.language = st.selectbox(
            'اللغة / Language',
            options=['العربية', 'English'],
            index=0 if st.session_state.language == 'العربية' else 1
        )
        
        trans = TRANSLATIONS[st.session_state.language]
        
        st.header(trans['title'] if st.session_state.language == 'العربية' else 'Controls')
        
        # Wilaya selector
        selected_wilaya = st.selectbox(
            trans['select_wilaya'],
            options=['All / الكل'] + TUNISIAN_WILAYAT
        )
        
        # Date range
        st.subheader('📅 Date Range' if st.session_state.language == 'English' else '📅 النطاق الزمني')
        
        lookback_hours = st.slider(
            'Lookback (hours)' if st.session_state.language == 'English' else 'الفترة (ساعات)',
            min_value=1,
            max_value=48,
            value=12
        )
        
        # Refresh button
        if st.button('🔄 Refresh Data' if st.session_state.language == 'English' else '🔄 تحديث البيانات'):
            st.cache_data.clear()
            st.rerun()
        
        # Live weather (uses map center as proxy if no specific wilaya logic)
        st.subheader('🌦️ Live Weather' if st.session_state.language == 'English' else '🌦️ حالة الطقس الآن')

        # Use Tunisia center for now; could be improved to per-wilaya coordinates
        center_lat, center_lon = UI_CONFIG['map_center']
        weather = get_current_weather(center_lat, center_lon)

        if weather is None:
            st.caption(
                "Weather API key missing or service unavailable."
                if st.session_state.language == 'English'
                else "تعذر جلب حالة الطقس (مفتاح API مفقود أو الخدمة غير متاحة)."
            )
        else:
            col_w1, col_w2 = st.columns(2)
            with col_w1:
                st.metric(
                    "🌡️ Temp (°C)" if st.session_state.language == 'English' else "🌡️ الحرارة (°م)",
                    f"{weather.get('temp_c', 0):.1f}"
                )
                st.metric(
                    "💧 Humidity (%)" if st.session_state.language == 'English' else "💧 الرطوبة (%)",
                    f"{weather.get('humidity', 0)}"
                )
            with col_w2:
                rain_val = weather.get('rain_mm')
                rain_str = f"{rain_val:.1f} mm" if rain_val is not None else (
                    "0 mm" if st.session_state.language == 'English' else "0 مم"
                )
                st.metric(
                    "🌧️ Rain (last h)" if st.session_state.language == 'English' else "🌧️ الأمطار (آخر ساعة)",
                    rain_str
                )
                st.metric(
                    "💨 Wind (m/s)" if st.session_state.language == 'English' else "💨 سرعة الرياح",
                    f"{weather.get('wind_speed', 0):.1f}"
                )

            if weather.get("description"):
                st.caption(
                    f"Condition: {weather['description']}"
                    if st.session_state.language == 'English'
                    else f"الحالة: {weather['description']}"
                )

        st.divider()

        # System status
        st.subheader('📊 System Status' if st.session_state.language == 'English' else '📊 حالة النظام')
        
        # Check GEE connection
        gee = initialize_gee()
        st.metric(
            'GEE Connection' if st.session_state.language == 'English' else 'اتصال GEE',
            '✓ Active' if gee is not None else '✗ Inactive'
        )
        
        # Check model
        model = load_model()
        st.metric(
            'Model Status' if st.session_state.language == 'English' else 'حالة النموذج',
            '✓ Loaded' if model is not None else '✗ Not Loaded'
        )
        
        # Performance targets
        st.subheader('🎯 Targets' if st.session_state.language == 'English' else '🎯 الأهداف')
        st.write(f"Accuracy: >{PERFORMANCE_TARGETS['accuracy']:.0%}")
        st.write(f"False Positives: <{PERFORMANCE_TARGETS['false_positive_rate']:.0%}")
        
        # Disclaimer
        st.divider()
        st.caption(trans['disclaimer'])


def main_dashboard():
    """Render main dashboard"""
    trans = TRANSLATIONS[st.session_state.language]
    
    # Title
    if st.session_state.language == 'العربية':
        st.markdown(f'<h1 class="arabic-text">{trans["title"]}</h1>', unsafe_allow_html=True)
    else:
        st.title(trans['title'])
    
    # Subtitle
    st.markdown(f"**Last Updated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Load model
    model = load_model()
    
    if model is None:
        st.error("Model not available. Please train the model first.")
        st.stop()
    
    # Fetch real-time data
    with st.spinner('Fetching real-time data from GEE...' if st.session_state.language == 'English' 
                    else 'جاري جلب البيانات...'):
        df = get_realtime_data()
    
    if df is None or df.empty:
        st.error("No data available. Please check GEE connection.")
        st.stop()
    
    # Predict overall risk with ML model
    with st.spinner('Calculating risk scores...' if st.session_state.language == 'English'
                    else 'جاري حساب درجات المخاطر...'):
        try:
            predictions, overall_risk = model.predict(df)
        except Exception as e:
            st.error(f"Error calculating risks: {e}")
            st.stop()

    # Derive simple hazard-specific scores from raw features
    wildfire_risk = None
    flood_risk = None
    extreme_risk = None

    if 'MaxFRP' in df.columns:
        wildfire_risk = np.clip(df['MaxFRP'] / 350.0, 0, 1)
    if 'water_extent' in df.columns:
        # Combine water extent and recent precipitation if available
        base = df['water_extent'].astype(float)
        if 'precipitation' in df.columns:
            precip_norm = np.clip(df['precipitation'].astype(float) / 100.0, 0, 1)
            flood_risk = np.clip(0.7 * base + 0.3 * precip_norm, 0, 1)
        else:
            flood_risk = np.clip(base, 0, 1)
    if 'precipitation' in df.columns:
        # Heavy-rain extreme weather proxy
        extreme_risk = np.clip(df['precipitation'].astype(float) / 100.0, 0, 1)

    # Overview metrics (overall ML risk)
    col1, col2, col3, col4 = st.columns(4)

    high_risk_count = (overall_risk > 0.8).sum()
    medium_risk_count = ((overall_risk > 0.5) & (overall_risk <= 0.8)).sum()
    low_risk_count = (overall_risk <= 0.5).sum()
    avg_risk = float(overall_risk.mean())

    with col1:
        st.metric(
            trans['high_risk'] if st.session_state.language == 'العربية' else 'High Risk',
            f"{high_risk_count}",
        )

    with col2:
        st.metric(
            trans['medium_risk'] if st.session_state.language == 'العربية' else 'Medium Risk',
            f"{medium_risk_count}",
        )

    with col3:
        st.metric(
            trans['low_risk'] if st.session_state.language == 'العربية' else 'Low Risk',
            f"{low_risk_count}",
        )

    with col4:
        st.metric(
            'Average Risk' if st.session_state.language == 'English' else 'متوسط المخاطر',
            f"{avg_risk:.1%}",
        )

    # Multi-hazard view with tabs
    overview_label = "📊 Overview" if st.session_state.language == 'English' else "📊 نظرة عامة"
    wildfire_label = "🔥 Wildfire" if st.session_state.language == 'English' else "🔥 حرائق الغابات"
    flood_label = "💧 Flood" if st.session_state.language == 'English' else "💧 الفيضانات"
    extreme_label = "⛈️ Extreme Weather" if st.session_state.language == 'English' else "⛈️ الطقس المتطرف"

    tabs = st.tabs([overview_label, wildfire_label, flood_label, extreme_label])

    # Overview tab: model-based risk
    with tabs[0]:
        st.subheader('🗺️ Overall Risk Map' if st.session_state.language == 'English' else '🗺️ خريطة المخاطر العامة')
        risk_map = create_risk_map(df, overall_risk, title="Overall Risk")
        st_folium(risk_map, width=1200, height=600, key="overall_risk_map")

    # Wildfire tab
    with tabs[1]:
        if wildfire_risk is None:
            st.info("No recent wildfire indicators available from FIRMS / MODIS.")
        else:
            st.subheader('🔥 Wildfire Risk' if st.session_state.language == 'English' else '🔥 مخاطر الحرائق')
            st.metric(
                'High Wildfire Risk Areas' if st.session_state.language == 'English' else 'مناطق خطورة حرائق مرتفعة',
                int((wildfire_risk > 0.8).sum()),
            )
            wildfire_map = create_risk_map(df, wildfire_risk.values, title="Wildfire Risk")
            st_folium(wildfire_map, width=1200, height=600, key="wildfire_risk_map")

    # Flood tab
    with tabs[2]:
        if flood_risk is None:
            st.info("No recent flood indicators available (SAR / precipitation).")
        else:
            st.subheader('💧 Flood Risk' if st.session_state.language == 'English' else '💧 مخاطر الفيضانات')
            st.metric(
                'High Flood Risk Areas' if st.session_state.language == 'English' else 'مناطق خطورة فيضانات مرتفعة',
                int((flood_risk > 0.8).sum()),
            )
            flood_map = create_risk_map(df, flood_risk.values, title="Flood Risk")
            st_folium(flood_map, width=1200, height=600, key="flood_risk_map")

    # Extreme weather tab
    with tabs[3]:
        if extreme_risk is None:
            st.info("No recent extreme-weather indicators available from precipitation.")
        else:
            st.subheader('⛈️ Extreme Weather Risk' if st.session_state.language == 'English' else '⛈️ مخاطر الطقس المتطرف')
            st.metric(
                'High Extreme-Weather Risk Areas' if st.session_state.language == 'English' else 'مناطق خطورة طقس متطرف مرتفعة',
                int((extreme_risk > 0.8).sum()),
            )
            extreme_map = create_risk_map(df, extreme_risk.values, title="Extreme Weather Risk")
            st_folium(extreme_map, width=1200, height=600, key="extreme_risk_map")
    
    # Alerts section
    if high_risk_count > 0:
        st.warning(f"⚠️ {high_risk_count} high-risk areas detected!")
        
        # Show alert button
        if st.button('📤 Send Alerts' if st.session_state.language == 'English' else '📤 إرسال التنبيهات'):
            alert_system = AlertSystem()
            
            # Find highest risk location
            max_risk_idx = risk_scores.argmax()
            max_risk = risk_scores[max_risk_idx]
            
            # Mock location (in production, extract from df)
            location = {
                'name': 'Tunisia',
                'lat': 34.0,
                'lon': 9.0
            }
            
            # Send alert
            results = alert_system.send_alert(
                hazard_type='wildfire',
                location=location,
                risk_score=max_risk,
                language=st.session_state.language
            )
            
            st.success("Alerts sent successfully!")
            st.json(results)
    
    # Data table
    with st.expander('📊 View Raw Data' if st.session_state.language == 'English' else '📊 عرض البيانات'):
        df_display = df.copy()
        df_display['overall_risk'] = overall_risk
        if wildfire_risk is not None:
            df_display['wildfire_risk'] = wildfire_risk
        if flood_risk is not None:
            df_display['flood_risk'] = flood_risk
        if extreme_risk is not None:
            df_display['extreme_risk'] = extreme_risk
        df_display['prediction'] = predictions
        st.dataframe(df_display.head(100))


def training_page():
    """Page for model training"""
    st.title("🎓 Model Training")
    
    st.write("Train the disaster detection model with historical data from Google Earth Engine.")
    
    col1, col2 = st.columns(2)
    
    with col1:
        start_date = st.date_input("Start Date", value=datetime(2023, 1, 1))
    
    with col2:
        end_date = st.date_input("End Date", value=datetime(2025, 1, 1))
    
    if st.button("🚀 Start Training"):
        with st.spinner("Training model... This may take several minutes."):
            try:
                from src.model import train_model_from_historical_data
                
                model = train_model_from_historical_data(
                    start_date=start_date.strftime('%Y-%m-%d'),
                    end_date=end_date.strftime('%Y-%m-%d')
                )
                
                if model:
                    st.success("✓ Model trained successfully!")
                    
                    # Display metrics
                    st.subheader("Performance Metrics")
                    metrics = model.training_metrics
                    
                    col1, col2, col3 = st.columns(3)
                    with col1:
                        st.metric("Accuracy", f"{metrics.get('accuracy', 0):.2%}")
                    with col2:
                        st.metric("Precision", f"{metrics.get('precision', 0):.2%}")
                    with col3:
                        st.metric("Recall", f"{metrics.get('recall', 0):.2%}")
                    
                    # Feature importances
                    if model.feature_importances_ is not None:
                        st.subheader("Feature Importances")
                        st.bar_chart(model.feature_importances_.set_index('feature')['importance'])
                
                else:
                    st.error("Training failed. Check logs for details.")
            
            except Exception as e:
                st.error(f"Training error: {e}")
                logger.error(f"Training error: {e}", exc_info=True)


def main():
    """Main application entry point"""
    
    # Sidebar
    sidebar()
    
    # Navigation (simple tab-based)
    page = st.sidebar.radio(
        'Navigation' if st.session_state.language == 'English' else 'التنقل',
        ['Dashboard', 'Training', 'About']
    )
    
    if page == 'Dashboard':
        main_dashboard()
    
    elif page == 'Training':
        training_page()
    
    elif page == 'About':
        st.title("ℹ️ About")
        st.markdown("""
        ## Tunisia Disaster Detection Platform
        
        A real-time disaster detection system for Tunisia using:
        - **Google Earth Engine** for satellite data
        - **Machine Learning** (Random Forest) for risk prediction
        - **Streamlit** for interactive visualization
        
        ### Data Sources
        - NASA FIRMS (Wildfires)
        - HydroSAR (Floods)
        - CHIRPS (Precipitation)
        - Sentinel-2 (Vegetation/Surface)
        - AlphaEarth (Risk Embeddings)
        
        ### Performance Targets
        - Accuracy: >85%
        - False Positives: <15%
        - Alert Latency: <15 minutes
        
        ### Contact
        For partnerships and support:
        - GitHub: [tunisia-disaster-detection]
        - Email: alerts@tunisia-disaster.org
        
        ---
        **License:** MIT | **Version:** 1.0.0
        """)


if __name__ == "__main__":
    main()
