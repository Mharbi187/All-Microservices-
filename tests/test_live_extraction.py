import sys
import os

# Set working directory to project root so imports work
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, '..'))
sys.path.insert(0, project_root)

import pandas as pd
import numpy as np
from src.data_acquisition import GEEDataAcquisition
from src.model import DisasterRiskModel
from src.config import ALPHAEARTH_BANDS

def run_live_extraction_test():
    print("\n==================================================")
    print("      LIVE GEE DATA EXTRACTION & MODEL TEST       ")
    print("==================================================")
    print("Initializing Google Earth Engine connection...")
    
    # 1. Initialize GEE
    import ee
    try:
        ee.Initialize(project='detection-478419')
        gee = GEEDataAcquisition()
    except Exception as e:
        print(f"Project-based init failed ({e}), falling back to default...")
        gee = GEEDataAcquisition()
    
    # 2. Define the Confirmed Disaster Event (Nabeul Floods 2023)
    event_name = "Nabeul 2023 Floods"
    event_date = "2023-09-15"
    event_lat = 36.45
    event_lon = 10.73
    
    print(f"\nTarget Event : {event_name}")
    print(f"Date         : {event_date}")
    print(f"Coordinates  : {event_lat}, {event_lon}")
    
    print("\n--- FETCHING LIVE DATA FROM GEE RESOURCES ---")
    print("1. Fetching NASA FIRMS (Wildfire/Thermal Data)...")
    print("2. Fetching NASA HydroSAR (Water Extent)...")
    print("3. Fetching UCSB CHIRPS (Precipitation)...")
    print("4. Fetching Google AlphaEarth Foundation Model Vectors (A00-A09)...")
    
    # 3. Fetch Live Data
    try:
        live_features = gee.get_features_for_event(date=event_date, lat=event_lat, lon=event_lon)
        if not live_features:
            print("\n[ERROR] Failed to extract features from GEE. Check authentication or coordinates.")
            return
            
        print("\n[SUCCESS] Live data successfully extracted!")
        print("Data Received:")
        for k, v in live_features.items():
            if isinstance(v, float):
                print(f"  - {k}: {v:.4f}")
            else:
                print(f"  - {k}: {v}")
                
    except Exception as e:
        print(f"\n[ERROR] GEE Extraction Failed: {e}")
        return

    # 4. Initialize and Train Model
    print("\n--- INITIALIZING THE DISASTER RISK MODEL ---")
    model = DisasterRiskModel()
    
    # We train the model on synthetic data to simulate the pre-trained weights
    # ensuring it recognizes flood patterns (high water, high precip)
    np.random.seed(42)
    df_train = pd.DataFrame({
        'MaxFRP': np.random.uniform(280, 310, 100),
        'water_extent': np.random.uniform(0, 0.2, 100),
        'precipitation': np.random.uniform(0, 10, 100),
        'max_frp': np.random.uniform(0, 10, 100),
        'water_change_pct': np.random.uniform(0, 0.2, 100),
        'precipitation_7d': np.random.uniform(0, 10, 100),
    })
    for band in ALPHAEARTH_BANDS:
        df_train[band] = np.random.randn(100)
        
    df_train.loc[0:20, 'water_extent'] = np.random.uniform(0.6, 1.0, 21)
    df_train.loc[0:20, 'precipitation'] = np.random.uniform(80, 150, 21)
    df_train.loc[0:20, 'water_change_pct'] = np.random.uniform(0.6, 1.0, 21)
    df_train.loc[0:20, 'precipitation_7d'] = np.random.uniform(80, 150, 21)
    
    # Fill in the train targets
    model.train(df_train, test_size=0.2, use_smote=False, tune_hyperparameters=False)
    
    # 5. Predict on LIVE Data
    print("\n--- RUNNING LIVE PREDICTION ---")
    live_df = pd.DataFrame([live_features])
    
    # The model's predict method handles engineer_features and prepare_features internally
    prediction, proba = model.predict(live_df)
    
    print("\n==================================================")
    print("               FINAL MODEL VERDICT                ")
    print("==================================================")
    print(f"Predicted Risk Level : {'DISASTER DETECTED' if prediction[0] == 1 else 'NORMAL'}")
    print(f"Confidence Score     : {proba[0]*100:.2f}%")
    print("==================================================")
    print("Verdict: LIVE INTEGRATION TEST COMPLETE.")

if __name__ == "__main__":
    run_live_extraction_test()
