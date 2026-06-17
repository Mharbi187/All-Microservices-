"""
Training utilities for labeled Tunisian disaster events.

Goal:
- Allow training on a CSV of real events for the Tunisian Red Crescent /
  Civil Protection, instead of synthetic labels.

Expected CSV schema (example file path: data/tunisia_events.csv):

    date,lat,lon,hazard,label
    2023-09-15,36.45,10.73,flood,1
    2023-09-16,36.45,10.73,flood,0
    2024-07-20,36.95,8.75,wildfire,1

Where:
    - date   : YYYY-MM-DD
    - lat,lon: location of interest
    - hazard : one of 'wildfire', 'flood', 'extreme_weather'
    - label  : 1 = event, 0 = no event (control)
"""

import logging
from typing import Optional

import numpy as np
import pandas as pd

from src.data_acquisition import GEEDataAcquisition
from src.feature_schema import from_event_features
from src.model import DisasterRiskModel

logger = logging.getLogger(__name__)


def load_labeled_events(csv_path: str) -> pd.DataFrame:
    """
    Load labeled events CSV and perform basic validation.

    Supports two schemas:
    1) Native labeled schema (recommended):
       date,lat,lon,hazard,label
    2) Raw FIRMS wildfire export (auto-converted):
       latitude,longitude,acq_date,...

    In case (2), we infer:
       date   = acq_date
       lat    = latitude
       lon    = longitude
       hazard = 'wildfire'
       label  = 1
    
    Args:
        csv_path: Path to the labeled events CSV file
    
    Returns:
        Cleaned DataFrame with required columns.
    """
    df = pd.read_csv(csv_path)

    required_cols = {"date", "lat", "lon", "hazard", "label"}
    missing = required_cols - set(df.columns)

    # Auto-convert FIRMS schema if we detect it
    if missing == required_cols and {"latitude", "longitude", "acq_date"}.issubset(df.columns):
        logger.info("Detected FIRMS-like schema. Converting to labeled wildfire events.")
        df = df.rename(columns={"latitude": "lat", "longitude": "lon", "acq_date": "date"})
        df["hazard"] = "wildfire"
        df["label"] = 1
        missing = required_cols - set(df.columns)

    if missing:
        raise ValueError(f"CSV is missing required columns: {missing}")

    # Basic cleanup
    df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")
    df["hazard"] = df["hazard"].str.lower().str.strip()
    df["label"] = df["label"].astype(int)

    # Keep only known hazards
    # Note: 'fire' and 'wildfire' both map to fire events. 'normal' maps to non-event baseline days.
    known_hazards = {"wildfire", "fire", "flood", "extreme_weather", "earthquake", "normal"}
    before = len(df)
    df = df[df["hazard"].isin(known_hazards)].copy()
    after = len(df)
    if after < before:
        logger.warning(f"Dropped {before - after} rows with unknown hazard types.")

    logger.info(f"Loaded {len(df)} labeled events from {csv_path}")
    return df


def build_feature_table_from_events(csv_path: str) -> pd.DataFrame:
    """
    For each labeled event row in the CSV, pull GEE features and
    assemble a training DataFrame.

    Args:
        csv_path: Path to the labeled events CSV file

    Returns:
        DataFrame with GEE features + label column.
    """
    import concurrent.futures
    import time
    
    events = load_labeled_events(csv_path)
    gee = GEEDataAcquisition()
    rows = []
    
    def fetch_row(row_tuple):
        _, row = row_tuple
        date = row["date"]
        lat = float(row["lat"])
        lon = float(row["lon"])
        hazard = row["hazard"]
        label = int(row["label"])

        raw_features = gee.get_features_for_event(date=date, lat=lat, lon=lon)
        if not raw_features:
            return None
        features = from_event_features(raw_features, lat=lat, lon=lon, event_date=pd.to_datetime(date))

        h = hazard.lower()
        features["is_fire"] = 1 if h in ("fire", "wildfire") else 0
        features["is_flood"] = 1 if h == "flood" else 0
        features["is_earthquake"] = 1 if h == "earthquake" else 0
        features["is_normal"] = 1 if h == "normal" else 0

        features["lat_norm"] = (lat - 30.2) / (37.3 - 30.2)
        features["lon_norm"] = (lon - 7.5) / (11.5 - 7.5)

        features["label"] = label
        features["hazard"] = hazard
        features["event_date"] = date
        features["lat"] = lat
        features["lon"] = lon
        return features

    logger.info("Starting concurrent hyper-fetch across Google Earth Engine...")
    start_t = time.time()
    with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
        results = list(executor.map(fetch_row, events.iterrows()))
        
    for r in results:
        if r is not None:
            rows.append(r)
            
    logger.info(f"Finished concurrent fetch in {time.time() - start_t:.1f}s")

    if not rows:
        logger.error("No features could be extracted for any events.")
        return pd.DataFrame()

    df_features = pd.DataFrame(rows)
    logger.info(f"Built feature table from labeled events with shape {df_features.shape}")
    return df_features


def train_model_from_labeled_events(csv_path: str) -> Optional[DisasterRiskModel]:
    """
    Train the DisasterRiskModel using a CSV of labeled events.

    This function reuses the existing DisasterRiskModel binary
    classifier: label=1 is 'high risk/event', label=0 is 'no event'.

    In the future, this can be extended to multi-class models per hazard.

    Args:
        csv_path: Path to the labeled events CSV

    Returns:
        Trained DisasterRiskModel instance, or None if training failed.
    """
    logger.info(f"Training model from labeled events in {csv_path}")

    df = build_feature_table_from_events(csv_path)
    if df.empty:
        logger.error("No training data could be built from labeled events.")
        return None

    # Use only numeric feature columns plus the label
    # (Drop metadata columns added above)
    metadata_cols = {"label", "hazard", "event_date", "lat", "lon"}
    feature_cols = [c for c in df.columns if c not in metadata_cols]

    train_df = df[feature_cols + ["label"]].copy()

    model = DisasterRiskModel()

    # Reuse existing training logic but with explicit labels
    # We temporarily override create_labels by passing in a DataFrame
    # that already contains the 'label' column.
    original_create_labels = model.create_labels

    def create_labels_from_column(df_in: pd.DataFrame) -> pd.Series:
        return df_in["label"].astype(int)

    model.create_labels = create_labels_from_column  # type: ignore

    try:
        metrics = model.train(train_df)
    finally:
        # Restore original method
        model.create_labels = original_create_labels  # type: ignore

    model.save()
    logger.info("Model trained and saved from labeled events.")
    logger.info(f"Training metrics: {metrics}")
    return model


if __name__ == "__main__":
    # Example usage:
    #   python -m src.training_events data/tunisia_events.csv
    import argparse

    parser = argparse.ArgumentParser(
        description="Train Tunisia Disaster Detection model from labeled events CSV."
    )
    parser.add_argument(
        "csv_path",
        type=str,
        help="Path to labeled events CSV (e.g., data/tunisia_events.csv)",
    )
    args = parser.parse_args()

    train_model_from_labeled_events(args.csv_path)


