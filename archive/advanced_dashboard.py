"""
Advanced Early Alert Dashboard
Integrates multi-source monitoring, propagation models, and resource estimation
"""

import streamlit as st
import pandas as pd
import folium
from streamlit_folium import st_folium
from datetime import datetime, timedelta
import json
import logging

# Import our advanced modules
from src.multi_source_monitor import MultiSourceAggregator
from src.propagation_models import DisasterPropagationAnalyzer
from src.resource_estimation import ResourceEstimationEngine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class EarlyAlertDashboard:
    """
    Advanced Early Alert Assistant Dashboard
    """
    
    def __init__(self):
        self.data_aggregator = MultiSourceAggregator()
        self.propagation_analyzer = DisasterPropagationAnalyzer()
        self.resource_engine = ResourceEstimationEngine()
        
        # Tunisia coordinates
        self.default_location = {
            'name': 'Tunisia',
            'lat': 36.8065,
            'lon': 10.1815
        }
    
    def render_multi_source_panel(self):
        """Render multi-source monitoring panel"""
        st.header("🌍 Multi-Source Real-Time Monitoring")
        
        with st.expander("ℹ️ Data Sources", expanded=False):
            st.markdown("""
            **Active Monitoring Sources:**
            - 🌦️ **Weather**: OpenWeather API, AccuWeather
            - 🌍 **Seismic**: USGS, EMSC (European-Mediterranean Seismological Centre)
            - 📰 **News**: NewsAPI, Twitter
            - 🛰️ **Satellite**: Google Earth Engine (FIRMS, HydroSAR, CHIRPS)
            """)
        
        # Fetch comprehensive alerts
        col1, col2 = st.columns([2, 1])
        
        with col1:
            location = st.text_input("Location", value=self.default_location['name'])
        
        with col2:
            if st.button("🔄 Refresh Alerts", type="primary"):
                st.session_state['refresh_alerts'] = True
        
        if 'comprehensive_alerts' not in st.session_state or st.session_state.get('refresh_alerts'):
            with st.spinner("Fetching data from multiple sources..."):
                try:
                    alerts = self.data_aggregator.get_comprehensive_alerts(
                        self.default_location['lat'],
                        self.default_location['lon'],
                        location
                    )
                    st.session_state['comprehensive_alerts'] = alerts
                    st.session_state['refresh_alerts'] = False
                except Exception as e:
                    st.error(f"Error fetching alerts: {e}")
                    logger.error(f"Alert fetch error: {e}", exc_info=True)
                    return
        
        alerts = st.session_state.get('comprehensive_alerts', {})
        
        if alerts:
            # Risk Level Display
            risk_level = alerts.get('risk_level', 'UNKNOWN')
            risk_score = alerts.get('overall_risk_score', 0)
            
            # Color based on risk
            risk_colors = {
                'CRITICAL': '🔴',
                'HIGH': '🟠',
                'MODERATE': '🟡',
                'LOW': '🟢',
                'MINIMAL': '⚪'
            }
            
            st.markdown(f"### {risk_colors.get(risk_level, '⚪')} Risk Level: **{risk_level}**")
            st.progress(risk_score / 100)
            st.caption(f"Overall Risk Score: {risk_score}/100")
            
            # Summary
            st.info(f"**Summary:** {alerts.get('summary', 'No significant activity')}")
            
            # Alert Categories
            col1, col2, col3 = st.columns(3)
            
            with col1:
                st.metric(
                    "Weather Alerts",
                    len(alerts.get('weather_alerts', [])),
                    delta="Active" if len(alerts.get('weather_alerts', [])) > 0 else None
                )
            
            with col2:
                st.metric(
                    "Seismic Events",
                    len(alerts.get('earthquakes', [])),
                    delta="Recent" if len(alerts.get('earthquakes', [])) > 0 else None
                )
            
            with col3:
                st.metric(
                    "News Mentions",
                    len(alerts.get('news_alerts', [])),
                    delta=f"{len([n for n in alerts.get('news_alerts', []) if n.get('severity', 0) > 0.6])} high-severity"
                )
            
            # Add satellite data metrics if available
            satellite_data = alerts.get('satellite_data', {})
            if satellite_data.get('status') == 'success':
                col1, col2, col3 = st.columns(3)
                
                with col1:
                    fire_count = satellite_data.get('active_fires', {}).get('count', 0)
                    st.metric(
                        "🛰️ Satellite Fires",
                        fire_count,
                        delta="Active" if fire_count > 0 else None
                    )
                
                with col2:
                    flood_detected = satellite_data.get('flood_analysis', {}).get('detected', False)
                    flood_area = satellite_data.get('flood_analysis', {}).get('area_km2', 0)
                    st.metric(
                        "🛰️ Flood Area",
                        f"{flood_area:.1f} km²" if flood_detected else "None",
                        delta="Detected" if flood_detected else None
                    )
                
                with col3:
                    precip = satellite_data.get('precipitation', {}).get('total_mm', 0)
                    st.metric(
                        "🛰️ Precipitation (30d)",
                        f"{precip:.0f} mm",
                        delta=satellite_data.get('precipitation', {}).get('drought_risk', 'unknown')
                    )
            
            # Detailed alerts in tabs
            tabs_list = ["🌦️ Weather", "🌍 Seismic", "📰 News", "📊 Forecast"]
            if satellite_data.get('status') == 'success':
                tabs_list.append("🛰️ Satellite")
            
            tabs = st.tabs(tabs_list)
            
            with tabs[0]:
                self._render_weather_alerts(alerts.get('weather_alerts', []))
            
            with tabs[1]:
                self._render_seismic_alerts(alerts.get('earthquakes', []))
            
            with tabs[2]:
                self._render_news_alerts(alerts.get('news_alerts', []))
            
            with tabs[3]:
                self._render_weather_forecast(alerts.get('severe_weather_forecast', {}))
            
            # Render satellite tab if available
            if len(tabs) > 4:
                with tabs[4]:
                    self._render_satellite_alerts(satellite_data)
    
    def _render_weather_alerts(self, alerts):
        """Render weather alerts"""
        if not alerts:
            st.info("No active weather alerts")
            return
        
        for alert in alerts:
            severity_color = "🔴" if alert.get('severity') == 'high' else "🟡"
            st.warning(f"{severity_color} **{alert.get('type')}**")
            st.write(alert.get('description'))
            st.caption(f"Active: {alert.get('start')} to {alert.get('end')}")
            st.divider()
    
    def _render_seismic_alerts(self, earthquakes):
        """Render seismic events"""
        if not earthquakes:
            st.info("No recent seismic activity")
            return
        
        df = pd.DataFrame(earthquakes)
        df = df.sort_values('magnitude', ascending=False)
        
        for _, eq in df.iterrows():
            mag = eq['magnitude']
            color = "🔴" if mag >= 6 else "🟠" if mag >= 5 else "🟡"
            
            st.warning(f"{color} **Magnitude {mag:.1f}** - {eq['location']}")
            st.write(f"Depth: {eq['depth']:.1f} km | Source: {eq['source']}")
            st.caption(f"Time: {eq['time']}")
            st.divider()
    
    def _render_satellite_alerts(self, satellite_data):
        """Render satellite data from Google Earth Engine"""
        if satellite_data.get('status') != 'success':
            st.info(f"🛰️ Satellite monitoring: {satellite_data.get('message', 'Not available')}")
            return
        
        st.subheader("🔥 Active Fire Detections")
        fires = satellite_data.get('active_fires', {})
        if fires.get('count', 0) > 0:
            st.warning(f"⚠️ {fires['count']} active fire(s) detected by MODIS satellite")
            
            fire_df = pd.DataFrame(fires.get('detections', []))
            if not fire_df.empty:
                fire_df_display = fire_df[['lat', 'lon', 'brightness', 'confidence', 'frp', 'time']].copy()
                fire_df_display.columns = ['Latitude', 'Longitude', 'Brightness (K)', 'Confidence', 'FRP (MW)', 'Detection Time']
                st.dataframe(fire_df_display, use_container_width=True)
        else:
            st.success("✅ No active fires detected")
        
        st.divider()
        
        st.subheader("💧 Flood Analysis (Sentinel-1 SAR)")
        flood = satellite_data.get('flood_analysis', {})
        if flood.get('detected'):
            severity = flood.get('severity', 'unknown')
            color = "🔴" if severity == 'severe' else "🟠" if severity == 'moderate' else "🟡"
            st.error(f"{color} **Flood Detected - {severity.upper()} severity**")
            st.metric("Affected Area", f"{flood.get('area_km2', 0):.2f} km²")
            st.metric("Water Extent Change", f"{flood.get('water_change_percent', 0):.2f}%")
        else:
            st.success("✅ No significant flooding detected")
        
        st.divider()
        
        st.subheader("🌧️ Precipitation Analysis (CHIRPS)")
        precip = satellite_data.get('precipitation', {})
        if precip:
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("Total (30 days)", f"{precip.get('total_mm', 0):.1f} mm")
            with col2:
                st.metric("Daily Average", f"{precip.get('avg_daily_mm', 0):.2f} mm")
            with col3:
                anomaly = precip.get('anomaly_percent', 0)
                st.metric("Anomaly", f"{anomaly:+.1f}%")
            
            drought_risk = precip.get('drought_risk', 'unknown')
            if drought_risk != 'none':
                color = "🔴" if drought_risk == 'severe' else "🟠"
                st.warning(f"{color} Drought Risk: **{drought_risk.upper()}**")
        
        st.divider()
        
        st.subheader("🌿 Vegetation Health (NDVI)")
        ndvi = satellite_data.get('vegetation_health', {})
        if not ndvi.get('error'):
            health = ndvi.get('vegetation_health', 'unknown')
            mean_ndvi = ndvi.get('mean_ndvi', 0)
            
            health_colors = {
                'excellent': '🟢',
                'good': '🟡',
                'moderate': '🟠',
                'poor': '🔴'
            }
            
            color = health_colors.get(health, '⚪')
            st.info(f"{color} Vegetation Health: **{health.upper()}**")
            st.metric("Mean NDVI", f"{mean_ndvi:.3f}")
            st.caption(f"Range: {ndvi.get('min_ndvi', 0):.3f} to {ndvi.get('max_ndvi', 0):.3f}")
        else:
            st.info(f"ℹ️ {ndvi.get('error', 'No data')}")
    
    def _render_news_alerts(self, news_alerts):
        """Render news alerts"""
        if not news_alerts:
            st.info("No recent disaster-related news")
            return
        
        for news in news_alerts[:10]:
            severity = news.get('severity', 0)
            color = "🔴" if severity > 0.7 else "🟠" if severity > 0.5 else "🟡"
            
            st.markdown(f"{color} **[{news.get('title')}]({news.get('url')})**")
            st.caption(f"Source: {news.get('source')}  |  Published: {news.get('published')}")
            st.divider()
    
    def _render_weather_forecast(self, forecast):
        """Render severe weather forecast"""
        if not forecast or forecast.get('severe_days_count', 0) == 0:
            st.success("✅ No severe weather forecasted for the next 7 days")
            return
        
        st.warning(f"⚠️ {forecast['severe_days_count']} days with severe weather risk")
        st.metric("Maximum Risk Score", f"{forecast.get('max_risk_score', 0):.0f}/100")
        
        for day in forecast.get('severe_days', []):
            st.error(f"📅 **{day['date']}** - Risk Score: {day['risk_score']}")
            st.write(f"Conditions: {', '.join(day['risk_factors'])}")
            st.write(f"Temperature: {day['temp_max']:.1f}°C | Rain: {day['rain']:.1f}mm | Wind: {day['wind_speed']:.1f} m/s")
            st.divider()
    
    def render_propagation_analysis(self):
        """Render disaster propagation analysis"""
        st.header("🔮 Predictive Propagation Analysis")
        
        disaster_type = st.selectbox(
            "Select Disaster Type for Modeling",
            ["Wildfire", "Flood", "Storm"]
        )
        
        if disaster_type == "Wildfire":
            self._render_wildfire_model()
        elif disaster_type == "Flood":
            self._render_flood_model()
        elif disaster_type == "Storm":
            self._render_storm_model()
    
    def _render_wildfire_model(self):
        """Wildfire propagation interface"""
        st.subheader("🔥 Wildfire Spread Prediction")
        
        col1, col2 = st.columns(2)
        
        with col1:
            current_size = st.number_input("Current Fire Size (km²)", value=5.0, min_value=0.1)
            wind_speed = st.slider("Wind Speed (km/h)", 0, 100, 25)
            temperature = st.slider("Temperature (°C)", 0, 50, 38)
        
        with col2:
            wind_direction = st.slider("Wind Direction (°)", 0, 360, 90)
            humidity = st.slider("Humidity (%)", 0, 100, 15)
            hours_ahead = st.slider("Forecast Hours", 6, 72, 24)
        
        fuel_type = st.selectbox("Fuel Type", ["forest", "grass", "shrub", "urban_interface"])
        
        if st.button("🔮 Generate Forecast", type="primary"):
            with st.spinner("Calculating fire spread..."):
                try:
                    forecast = self.propagation_analyzer.analyze_wildfire_spread(
                        current_location=(self.default_location['lat'], self.default_location['lon']),
                        current_size_km2=current_size,
                        wind_speed_kmh=wind_speed,
                        wind_direction_deg=wind_direction,
                        temperature_c=temperature,
                        humidity_percent=humidity,
                        fuel_type=fuel_type,
                        hours_ahead=hours_ahead
                    )
                    
                    self._display_propagation_forecast(forecast)
                    
                    # Resource estimation
                    st.subheader("📦 Required Resources")
                    resources = self.resource_engine.estimate_wildfire_resources(
                        affected_area_km2=forecast['predicted_extent_km2'],
                        affected_population=forecast['affected_population'],
                        fire_severity=forecast['severity'].lower(),
                        duration_hours=hours_ahead
                    )
                    self._display_resources(resources)
                    
                except Exception as e:
                    st.error(f"Error generating forecast: {e}")
                    logger.error(f"Wildfire forecast error: {e}", exc_info=True)
    
    def _render_flood_model(self):
        """Flood propagation interface"""
        st.subheader("💧 Flood Inundation Prediction")
        
        col1, col2 = st.columns(2)
        
        with col1:
            precipitation = st.number_input("Precipitation (mm)", value=150.0, min_value=0.0)
            watershed_area = st.number_input("Watershed Area (km²)", value=200.0, min_value=1.0)
            elevation_relief = st.number_input("Elevation Relief (m)", value=300.0, min_value=0.0)
        
        with col2:
            river_capacity = st.number_input("River Capacity (m³/s)", value=50.0, min_value=0.0)
            land_use = st.selectbox("Land Use", ["urban", "rural", "forest"])
            duration = st.slider("Rainfall Duration (hours)", 1, 48, 12)
        
        if st.button("🔮 Generate Forecast", type="primary"):
            with st.spinner("Calculating flood inundation..."):
                try:
                    forecast = self.propagation_analyzer.analyze_flood_risk(
                        precipitation_mm=precipitation,
                        watershed_area_km2=watershed_area,
                        land_use=land_use,
                        elevation_relief_m=elevation_relief,
                        river_capacity_m3s=river_capacity,
                        hours_duration=duration
                    )
                    
                    self._display_propagation_forecast(forecast)
                    
                    # Resource estimation
                    st.subheader("📦 Required Resources")
                    resources = self.resource_engine.estimate_flood_resources(
                        inundated_area_km2=forecast['predicted_extent_km2'],
                        affected_population=forecast['affected_population'],
                        flood_depth_m=2.0,  # Estimate
                        duration_days=7
                    )
                    self._display_resources(resources)
                    
                except Exception as e:
                    st.error(f"Error generating forecast: {e}")
                    logger.error(f"Flood forecast error: {e}", exc_info=True)
    
    def _render_storm_model(self):
        """Storm propagation interface"""
        st.subheader("⛈️ Storm Track Prediction")
        
        col1, col2 = st.columns(2)
        
        with col1:
            wind_speed = st.slider("Wind Speed (km/h)", 60, 300, 180)
            wind_direction = st.slider("Movement Direction (°)", 0, 360, 270)
        
        with col2:
            pressure = st.slider("Central Pressure (mb)", 900, 1013, 960)
            hours_ahead = st.slider("Forecast Hours", 12, 120, 48)
        
        if st.button("🔮 Generate Forecast", type="primary"):
            with st.spinner("Calculating storm track..."):
                try:
                    forecast = self.propagation_analyzer.analyze_storm_track(
                        current_location=(self.default_location['lat'], self.default_location['lon']),
                        wind_speed_kmh=wind_speed,
                        wind_direction_deg=wind_direction,
                        pressure_mb=pressure,
                        hours_ahead=hours_ahead
                    )
                    
                    self._display_propagation_forecast(forecast)
                    
                except Exception as e:
                    st.error(f"Error generating forecast: {e}")
                    logger.error(f"Storm forecast error: {e}", exc_info=True)
    
    def _display_propagation_forecast(self, forecast):
        """Display propagation forecast results"""
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric("Severity", forecast['severity'])
        
        with col2:
            st.metric("Predicted Extent", f"{forecast['predicted_extent_km2']:.1f} km²")
        
        with col3:
            st.metric("Affected Population", f"{forecast['affected_population']:,}")
        
        with col4:
            st.metric("Confidence", f"{forecast['confidence']:.0%}")
        
        st.info(f"Direction: {forecast['propagation_direction']} | Time to Peak: {forecast['time_to_peak_hours']:.1f} hours")
        
        # Risk zones
        if forecast.get('risk_zones'):
            st.subheader("🎯 Risk Zones")
            zones_df = pd.DataFrame(forecast['risk_zones'])
            st.dataframe(zones_df, use_container_width=True)
    
    def _display_resources(self, resources):
        """Display resource requirements"""
        plan = self.resource_engine.generate_procurement_plan(resources)
        st.dataframe(plan, use_container_width=True)
        
        total_cost = self.resource_engine.calculate_total_cost(resources)
        st.metric("Total Estimated Cost", f"${total_cost:,.0f} USD")
        
        # Download button
        csv = plan.to_csv(index=False)
        st.download_button(
            label="📥 Download Procurement Plan",
            data=csv,
            file_name=f"resource_plan_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
            mime="text/csv"
        )


def render_advanced_dashboard():
    """Main function to render the advanced dashboard"""
    st.set_page_config(
        page_title="Advanced Early Alert Assistant",
        page_icon="🚨",
        layout="wide",
        initial_sidebar_state="expanded"
    )
    
    # Title
    st.title("🚨 Advanced Early Alert Assistant")
    st.caption("Multi-Source Monitoring | Predictive Analysis | Resource Estimation")
    
    # Sidebar
    with st.sidebar:
        st.header("⚙️ System Controls")
        
        page = st.radio(
            "Navigate",
            ["Multi-Source Monitoring", "Propagation Analysis", "About"]
        )
        
        st.divider()
        st.caption(f"Last Updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Initialize dashboard
    dashboard = EarlyAlertDashboard()
    
    # Render selected page
    if page == "Multi-Source Monitoring":
        dashboard.render_multi_source_panel()
    
    elif page == "Propagation Analysis":
        dashboard.render_propagation_analysis()
    
    elif page == "About":
        st.markdown("""
        ## About Advanced Early Alert Assistant
        
        This system integrates:
        
        ### 🌍 Multi-Source Data Integration
        - **Weather APIs**: OpenWeather, AccuWeather
        - **Seismic Data**: USGS, EMSC
        - **News Feeds**: NewsAPI, Twitter
        - **Satellite Data**: Google Earth Engine
        
        ### 🔮 Predictive Analysis
        - **Wildfire Spread**: Rothermel-based fire behavior model
        - **Flood Inundation**: Watershed analysis and runoff modeling
        - **Storm Tracking**: Meteorological movement prediction
        
        ### 📦 Resource Estimation
        - **Personnel**: Firefighters, rescue teams, medical staff
        - **Equipment**: Vehicles, boats, helicopters, heavy machinery
        - **Supplies**: Food, water, medical kits, shelters
        - **Cost Analysis**: Comprehensive budget estimation
        
        ### 🎯 Features
        - Real-time multi-source alert aggregation
        - Risk score calculation and prioritization
        - Disaster propagation forecasting
        - Dynamic resource requirement estimation
        - Procurement planning with costs
        
        ---
        **Developed for Tunisia Disaster Detection Platform**
        """)


if __name__ == "__main__":
    render_advanced_dashboard()
