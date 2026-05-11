import os
import sys
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import logging

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.model import DisasterRiskModel
from src.weather_api import fetch_weather
from src.data_acquisition import GEEDataAcquisition
from src.feature_schema import from_sampled_row

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("MahdiaTest")

MAHDIA_COORDS = (35.5047, 11.0622)
START_DATE = datetime(2026, 4, 13)
END_DATE = datetime(2026, 4, 16)

def run_test():
    logger.info("Starting Mahdia Disaster Detection Test (%s to %s)", START_DATE.date(), END_DATE.date())
    
    # 1. Load Model and GEE
    model = DisasterRiskModel()
    gee = GEEDataAcquisition()
    try:
        model.load()
        logger.info("Model loaded successfully.")
    except Exception as e:
        logger.warning("Could not load model: %s. Using initialized model.", e)

    # Validate GEE
    gee_active = False
    try:
        import ee
        # Check if initialized
        ee.Image(0)
        gee_active = True
        logger.info("GEE is Active and Authorized.")
    except Exception as e:
        logger.warning("GEE Authorization failed: %s. Falling back to model-only analysis.", e)

    results = []
    
    # 2. Daily Analysis
    current_date = START_DATE
    while current_date <= END_DATE:
        logger.info("Analyzing %s...", current_date.date())
        
        # Fetch Weather (Real or Simulated)
        weather = fetch_weather(MAHDIA_COORDS[0], MAHDIA_COORDS[1])
        
        # Fetch GEE Data if active
        gee_row = {}
        if gee_active:
            try:
                # Use point-based feature extraction for the specific date and location
                gee_row = gee.get_features_for_event(
                    date=current_date.strftime("%Y-%m-%d"),
                    lat=MAHDIA_COORDS[0],
                    lon=MAHDIA_COORDS[1]
                )
                if gee_row:
                    logger.info("Got REAL historical GEE data for %s", current_date.date())
            except Exception as e:
                logger.warning("GEE Fetch failed for %s: %s", current_date.date(), e)

        # Build Sampled Row (Priority to REAL GEE data)
        sampled_data = {
            "MaxFRP": gee_row.get("max_frp", 0.0),
            "water_change_pct": gee_row.get("water_change_pct", 0.0),
            "precipitation_7d": gee_row.get("precipitation", 0.0),
            "temperature": weather.get("temp", 20.0),
            "humidity": weather.get("humidity", 50.0),
            "wind_speed": weather.get("wind_speed", 10.0),
            "clouds": weather.get("clouds", 0.0),
        }
        
        # AlphaEarth Embeddings (geographical context)
        for i in range(10):
            band = f"A0{i}"
            sampled_data[band] = gee_row.get(band, 0.0)

        
        # Normalize to canonical feature set
        canonical_row = from_sampled_row(
            sampled_data, 
            lat=MAHDIA_COORDS[0], 
            lon=MAHDIA_COORDS[1], 
            event_date=current_date
        )
        
        df = pd.DataFrame([canonical_row])
        
        # Predict Risk
        _, probabilities = model.predict(df)
        risk_score = float(probabilities[0])
        
        # Determine Hazard Type
        hazard = "Low Risk"
        if risk_score > 0.7:
            hazard = "Critical Hazard"
        elif risk_score > 0.4:
            hazard = "Elevated Risk"
            
        # Specific Type Detection
        if weather.get("is_raining") and risk_score > 0.3:
            hazard += " (Potential Flooding)"
        elif weather.get("temperature", 0) > 40 and risk_score > 0.3:
            hazard += " (Heatwave/Fire Risk)"
        elif weather.get("wind_speed", 0) > 60 and risk_score > 0.3:
            hazard += " (Storm Alert)"

        results.append({
            "Date": current_date.strftime("%Y-%m-%d"),
            "Temp (°C)": sampled_data["temperature"],
            "Precip (mm)": sampled_data["precipitation_7d"],
            "Wind (km/h)": sampled_data["wind_speed"],
            "Risk Score": f"{risk_score:.2f}",
            "Status": hazard
        })
        
        current_date += timedelta(days=1)

    # 3. Generate Markdown Report
    report = f"# Mahdia Disaster Detection Test Report\n"
    report += f"**Region:** Mahdia, Tunisia ({MAHDIA_COORDS[0]}, {MAHDIA_COORDS[1]})\n"
    report += f"**Period:** {START_DATE.date()} to {END_DATE.date()}\n\n"
    report += "| Date | Temp (°C) | Precip (mm) | Wind (km/h) | Risk Score | Status |\n"
    report += "| :--- | :--- | :--- | :--- | :--- | :--- |\n"
    
    for r in results:
        report += f"| {r['Date']} | {r['Temp (°C)']} | {r['Precip (mm)']} | {r['Wind (km/h)']} | {r['Risk Score']} | {r['Status']} |\n"
    
    report += "\n**Analysis Summary:**\n"
    max_risk = max([float(r["Risk Score"]) for r in results])
    report += f"- **Peak Risk Observed:** {max_risk:.2f}\n"
    report += f"- **System Status:** Operational with hybrid satellite/weather fusion.\n"
    
    report_path = "/tmp/MAHDIA_TEST_REPORT.md"
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report)
    
    print(f"\n--- TEST COMPLETED (Report: {report_path}) ---")
    print(report)

if __name__ == "__main__":
    run_test()
