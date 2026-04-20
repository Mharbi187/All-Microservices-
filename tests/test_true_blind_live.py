import os
import sys
import time
import logging
import joblib
import pandas as pd
from datetime import datetime
from src.data_acquisition import GEEDataAcquisition

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

# Events strictly NOT in tunisia_disasters_real.csv or tunisia_events.csv
# We use dates before 2018 (since CSV starts 2018) or highly specific omission dates.
UNSEEN_EVENTS = [
    {
        "name": "Boukornine Massive Wildfire (Unseen Date)",
        "type": "FIRE",
        "date": "2022-07-19",
        "lat": 36.6997, 
        "lon": 10.3397,
        "expected": 1
    },
    {
        "name": "Medjerda River Overflow (Historic Unseen)",
        "type": "FLOOD",
        "date": "2015-02-26",
        "lat": 36.4513, 
        "lon": 8.4411,
        "expected": 1
    },
    {
        "name": "Tunis Gulf Tremor (Historic Unseen)",
        "type": "EARTHQUAKE",
        "date": "2017-05-18",
        "lat": 36.8500, 
        "lon": 10.4000,
        "expected": 1
    },
    {
        "name": "Deep Sahara Desert (Random Normal Day)",
        "type": "NORMAL",
        "date": "2023-11-14",
        "lat": 31.9000, 
        "lon": 10.4000,
        "expected": 0
    }
]

def run_blind_gee_test():
    print("======================================================================")
    print("  ULTIMATE GODMODE BLIND TEST (LIVE GEE EXTRACTION)")
    print("======================================================================")
    
    print("\n[1] Loading M1 Production Model...")
    model_path = "data/models/disaster_model.pkl"
    if not os.path.exists(model_path):
        print(f"ERROR: Model not found at {model_path}")
        return
        
    with open(model_path, 'rb') as f:
        model_data = joblib.load(f)
    model = model_data.get('model')
    features_list = model_data.get('feature_names')
    
    print(f"    Loaded Random Forest trained on {model_data.get('training_metrics', {}).get('train_size')} items.")
    
    print("\n[2] Initializing Live Google Earth Engine Connection...")
    gee = GEEDataAcquisition()
    
    print("\n[3] Executing Blind Tests on Unseen Coords/Dates...")
    
    correct_count = 0
    for i, event in enumerate(UNSEEN_EVENTS, 1):
        print(f"\n--- Scenario {i}/4: {event['name']} ({event['type']}) ---")
        print(f"    Date: {event['date']} | Coords: {event['lat']}, {event['lon']}")
        
        start_t = time.time()
        
        # 1. Fetch live features
        print("    Fetching GEE Telemetry (AlphaEarth + Climate)...", end="", flush=True)
        try:
            raw_features = gee.get_features_for_event(event['date'], event['lat'], event['lon'])
            if not raw_features:
                print(" FAILED (GEE returned empty dict)")
                continue
        except Exception as e:
            print(f" FAILED Exception: {e}")
            continue
            
        fetch_time = time.time() - start_t
        print(f" OK ({fetch_time:.1f}s)")
        
        # 2. Build feature vector
        # (Must inject the one-hot hazard columns for the model to know what it's looking for)
        raw_features["is_fire"] = 1 if event["type"] in ("FIRE", "WILDFIRE") else 0
        raw_features["is_flood"] = 1 if event["type"] == "FLOOD" else 0
        raw_features["is_earthquake"] = 1 if event["type"] == "EARTHQUAKE" else 0
        raw_features["is_normal"] = 1 if event["type"] == "NORMAL" else 0
        
        # Geodetic Norms
        raw_features["lat_norm"] = (event["lat"] - 30.2) / (37.3 - 30.2)
        raw_features["lon_norm"] = (event["lon"] - 7.5) / (11.5 - 7.5)
        
        df_raw = pd.DataFrame([raw_features])
        
        from src.model import DisasterRiskModel
        risk_model = DisasterRiskModel()
        risk_model.load("data/models/disaster_model.pkl")
        
        X = risk_model.prepare_features(df_raw)
        
        # 3. Predict
        prob = risk_model.model.predict_proba(X)[0][1]
        pred_label = 1 if prob >= 0.5 else 0
        
        status = "[PASS]" if pred_label == event['expected'] else "[FAIL]"
        if pred_label == event['expected']:
            correct_count += 1
            
        print(f"    Raw Extracted Metrics : Max FRP={raw_features.get('max_frp', 0):.1f}, 7d Precip={raw_features.get('precipitation_7d', 0):.1f}mm")
        print(f"    Machine Prediction    : {'DISASTER' if pred_label == 1 else 'NORMAL/SAFE'} (Confidence: {prob*100:.1f}%)")
        print(f"    Ground Truth Status   : {status}")
        
    print("\n======================================================================")
    print(f"  BLIND GEE TEST COMPLETE: {correct_count}/{len(UNSEEN_EVENTS)} Correct")
    print("======================================================================")

if __name__ == "__main__":
    run_blind_gee_test()
