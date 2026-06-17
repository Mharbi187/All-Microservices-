"""
Historical Accuracy Test: Tabarka Wildfires (July 2023)
"""
import ee
from datetime import datetime, timedelta
from src.satellite_monitor import SatelliteMonitor
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_tabarka_wildfires():
    print("\n" + "="*70)
    print("🔥 HISTORICAL ACCURACY TEST: Tabarka Wildfires (July 2023)")
    print("="*70)
    
    # Initialize monitor
    monitor = SatelliteMonitor()
    if not monitor.initialized:
        print("❌ GEE not initialized. Check credentials.")
        return

    # Test Parameters - PEAK FIRE DATE
    target_date = datetime(2023, 7, 24, 12, 0, 0)
    location = {
        'name': 'Tabarka, Tunisia',
        'lat': 36.954,
        'lon': 8.758
    }
    
    print(f"\n📍 Location: {location['name']} ({location['lat']}, {location['lon']})")
    print(f"📅 Target Date: {target_date.strftime('%Y-%m-%d')}")
    print("\n🔍 Running analysis...")
    
    # Manually call detect_active_fires to debug
    print("\nDEBUG: Checking fires directly...")
    fires = monitor.detect_active_fires(
        lat=location['lat'],
        lon=location['lon'],
        radius_km=50,  # 50km radius
        days_back=3,   # Look back 3 days (21st-24th)
        end_date=target_date
    )
    
    print(f"🔥 Direct Fire Count: {len(fires)}")
    for f in fires:
        print(f"   - Found fire at {f.latitude:.3f}, {f.longitude:.3f} on {f.acquisition_time}")

    # Run full analysis
    print("\n🔍 Running full comprehensive analysis...")
    analysis = monitor.get_comprehensive_satellite_analysis(
        lat=location['lat'],
        lon=location['lon'],
        end_date=target_date
    )
    
    # Check Results
    print("\n📊 RESULTS:")
    print("-" * 30)
    
    # 1. Fire Detection
    fires_data = analysis['active_fires']
    fire_count = fires_data['count']
    print(f"\n🔥 Active Fires Detected: {fire_count}")
    
    if fire_count > 0:
        print("   ✅ SUCCESS: Fires correctly detected!")
    else:
        print("   ❌ FAILURE: No fires detected (False Negative)")
        
    # 2. Precipitation (Drought Context)
    precip = analysis['precipitation']
    if precip:
        print(f"\n🌧️ Precipitation (30 days prior): {precip.get('total_mm', 0):.1f} mm")
        print(f"   Anomaly: {precip.get('anomaly_percent', 0):+.1f}%")
        if precip.get('anomaly_percent', 0) < -50:
            print("   ✅ SUCCESS: Severe drought detected (Anomaly < -50%)")

    print("\n" + "="*70)

if __name__ == "__main__":
    test_tabarka_wildfires()
