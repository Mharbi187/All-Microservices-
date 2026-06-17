"""
Live GEE Data Test v4 -- Small-sample optimized.

Changes from v3:
  - Dry-season normals to avoid seasonal rainfall noise in training
  - Added moderate flood (Nabeul 2024) to training set
  - Feature subset (8 features) instead of 28 to prevent overfitting
  - Shallow RandomForest (max_depth=3) for small-sample robustness
  - Manual feature engineering for flood/fire composite indicators
"""

import sys
import os
import time
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.data_acquisition import GEEDataAcquisition
from src.config import ALPHAEARTH_BANDS


# ── Feature configuration (8 total: 6 base + 2 derived) ───────────
BASE_FEATURES = [
    'chirps_7d_sum', 'chirps_1d', 'vv_change',
    'water_anomaly', 'water_extent', 'precipitation',
]


# ── Events ─────────────────────────────────────────────────────────
# 14 disasters + 7 normals = 21 training events
TRAIN_EVENTS = [
    # Extreme floods 2020
    ("2020-09-11", 35.7832, 10.8262, 1, "flood",  "Monastir flood 2020"),
    ("2020-09-11", 36.8065, 10.1815, 1, "flood",  "Tunis flood 2020"),
    ("2020-09-11", 35.5037, 10.9611, 1, "flood",  "Mahdia flood 2020"),
    ("2020-09-11", 35.8245, 10.6346, 1, "flood",  "Sousse flood 2020"),
    # Moderate floods (important for generalization)
    ("2022-03-15", 33.8815, 10.0982, 1, "flood",  "Gabes rain 2022"),
    ("2024-09-10", 36.4513, 10.7381, 1, "flood",  "Nabeul flood 2024"),
    # Fires 2021
    ("2021-07-15", 36.8833, 9.1833,  1, "fire",   "Beja fire 2021"),
    ("2021-08-05", 37.0628, 9.0481,  1, "fire",   "Bizerte fire 2021"),
    ("2021-08-10", 36.8065, 10.1815, 1, "fire",   "Tunis peri-urban fire 2021"),
    # Fires 2023
    ("2023-07-01", 36.8833, 9.1833,  1, "fire",   "Beja fire 2023"),
    ("2023-07-15", 37.0628, 9.0481,  1, "fire",   "Bizerte fire 2023"),
    ("2023-07-20", 36.1667, 8.8,     1, "fire",   "Le Kef fire 2023"),
    ("2023-08-01", 36.5,    9.5,     1, "fire",   "Siliana fire 2023"),
    ("2023-08-05", 35.1667, 8.8333,  1, "fire",   "Kasserine fire 2023"),
    # Normals -- DRY SEASON ONLY to avoid label noise from seasonal rain
    ("2021-05-15", 36.8065, 10.1815, 0, "normal", "Tunis normal 2021-05"),
    ("2021-06-01", 34.7406, 10.7603, 0, "normal", "Sfax normal 2021-06"),
    ("2022-06-15", 36.4513, 10.7381, 0, "normal", "Nabeul normal 2022-06"),
    ("2021-07-15", 33.3500, 8.1300,  0, "normal", "Tozeur dry 2021-07"),
    ("2022-08-01", 33.7000, 8.9700,  0, "normal", "Gafsa dry 2022-08"),
    ("2023-07-15", 34.7406, 10.7603, 0, "normal", "Sfax dry 2023-07"),
    ("2024-07-01", 37.0628, 9.0481,  0, "normal", "Bizerte dry 2024-07"),
]

# 5 disasters + 5 normals = 10 test events
TEST_EVENTS = [
    # Blind floods
    ("2022-03-15", 36.4513, 10.7381, 1, "flood",  "Nabeul 120mm 2022"),
    ("2024-09-10", 35.8245, 10.6346, 1, "flood",  "Sousse flood 2024"),
    ("2024-09-10", 35.7832, 10.8262, 1, "flood",  "Monastir flood 2024"),
    # Blind fires
    ("2021-07-20", 36.4513, 8.7857,  1, "fire",   "Jendouba fire 2021"),
    ("2023-07-10", 36.4513, 8.7857,  1, "fire",   "Jendouba fire 2023"),
    # Blind normals
    ("2022-11-15", 36.4513, 10.7381, 0, "normal", "Nabeul calm 2022-11"),
    ("2024-02-15", 35.7832, 10.8262, 0, "normal", "Monastir calm 2024-02"),
    ("2023-09-15", 34.7406, 10.7603, 0, "normal", "Sfax calm 2023-09"),
    ("2021-11-01", 36.8065, 10.1815, 0, "normal", "Tunis calm 2021-11"),
    ("2024-06-01", 33.8815, 10.0982, 0, "normal", "Gabes calm 2024-06"),
]

KEY_SIGNALS = [
    "chirps_7d_sum", "chirps_1d", "vv_change", "water_anomaly",
    "water_extent", "precipitation", "MaxFRP", "max_frp", "water_change_pct", "precipitation_7d"
]


def extract(gee, events, tag):
    """Extract features from GEE for each event."""
    rows = []
    for i, (date, lat, lon, label, dtype, desc) in enumerate(events):
        t0 = time.time()
        print(f"  [{tag}] {i+1}/{len(events)} {desc} ...", end=" ", flush=True)
        try:
            feats = gee.get_features_for_event(date, lat, lon)
            elapsed = time.time() - t0
            if feats:
                feats["label"] = label
                feats["disaster_type"] = dtype
                feats["description"] = desc
                rows.append(feats)
                c7 = feats.get("chirps_7d_sum", 0)
                vv = feats.get("vv_change", 0)
                wa = feats.get("water_anomaly", 0)
                print(f"OK  c7d={c7:.1f} vv={vv:+.2f} wa={wa:+.3f} ({elapsed:.1f}s)")
            else:
                print(f"EMPTY ({time.time()-t0:.1f}s)")
        except Exception as exc:
            print(f"ERR ({time.time()-t0:.1f}s): {exc}")
    return pd.DataFrame(rows) if rows else pd.DataFrame()


def report(df, tag):
    """Print feature summary statistics."""
    print(f"\n{'_'*65}")
    print(f"Feature summary -- {tag} ({len(df)} events)")
    print(f"{'_'*65}")
    for feat in KEY_SIGNALS + ALPHAEARTH_BANDS:
        if feat in df.columns:
            vals = df[feat].fillna(0)
            nz = (vals != 0).sum()
            print(f"  {feat:18s}  non-zero:{nz:>3d}/{len(df)}"
                  f"  min={vals.min():+10.3f}  max={vals.max():+10.3f}")
    if "label" in df.columns:
        print(f"\n  Per-class means:")
        for feat in ["chirps_7d_sum", "chirps_1d", "vv_change", "water_anomaly"]:
            if feat in df.columns:
                dis = df[df["label"] == 1][feat].mean()
                nor = df[df["label"] == 0][feat].mean()
                print(f"    {feat:22s}  disaster={dis:+8.3f}"
                      f"  normal={nor:+8.3f}  gap={dis-nor:+8.3f}")


def prepare_features(df):
    """
    Select features and compute derived signals.
    Only 8 features -- appropriate for ~20-sample training.
    """
    X = pd.DataFrame(index=df.index)

    for f in BASE_FEATURES:
        X[f] = df[f].fillna(0) if f in df.columns else 0

    # Flood composite: high cumulative rain + positive VV change
    X['flood_composite'] = (
        (X['chirps_7d_sum'] / 100).clip(0, 2)
        * (1 + X['vv_change'].clip(0, 5))
    )

    # Fire indicator: dry conditions + negative VV change (surface drying)
    X['fire_indicator'] = (
        (1 - (X['chirps_7d_sum'] / 50).clip(0, 1))
        * (-X['vv_change']).clip(0, 3)
    )

    return X.fillna(0).replace([np.inf, -np.inf], 0)


def main():
    print("=" * 70)
    print("  LIVE GEE TEST v4 -- Small-Sample Optimized")
    print("=" * 70)
    t0 = time.time()

    # ── 1. Connect ────────────────────────────────────────────────
    print("\n[1/5] GEE connect...")
    gee = GEEDataAcquisition()
    print("  OK\n")

    # ── 2. Extract TRAIN ──────────────────────────────────────────
    print(f"[2/5] TRAIN features ({len(TRAIN_EVENTS)} events)...")
    train_df = extract(gee, TRAIN_EVENTS, "TR")
    if len(train_df) < 6:
        print(f"FATAL: only {len(train_df)} events")
        sys.exit(1)
    report(train_df, "TRAIN")

    # ── 3. Extract TEST ───────────────────────────────────────────
    print(f"\n[3/5] TEST features ({len(TEST_EVENTS)} events)...")
    test_df = extract(gee, TEST_EVENTS, "TE")
    if len(test_df) < 4:
        print(f"FATAL: only {len(test_df)} events")
        sys.exit(1)
    report(test_df, "TEST")

    # ── 4. Train ──────────────────────────────────────────────────
    print(f"\n[4/5] Training on {len(train_df)} events...")

    X_train = prepare_features(train_df)
    y_train = train_df["label"].astype(int)

    print(f"  Features ({len(X_train.columns)}): {list(X_train.columns)}")
    print(f"  Balance: {(y_train==1).sum()} disaster, {(y_train==0).sum()} normal")

    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)

    # Shallow RF -- appropriate for small samples, prevents overfitting
    clf = RandomForestClassifier(
        n_estimators=100,
        max_depth=3,
        min_samples_leaf=2,
        class_weight='balanced',
        random_state=42,
        n_jobs=-1,
    )
    clf.fit(X_train_s, y_train)

    tr_pred = clf.predict(X_train_s)
    tr_acc = (tr_pred == y_train.values).mean()
    print(f"  Train acc: {tr_acc:.1%}")

    # ── 5. Blind Test ─────────────────────────────────────────────
    print(f"\n[5/5] Blind test on {len(test_df)} events...")

    X_test = prepare_features(test_df)
    y_test = test_df["label"].astype(int)
    X_test_s = scaler.transform(X_test)

    pred = clf.predict(X_test_s)
    proba = clf.predict_proba(X_test_s)

    correct = (pred == y_test.values).sum()
    total = len(y_test)
    te_acc = correct / total
    gap = tr_acc - te_acc
    dm = y_test.values == 1
    nm = y_test.values == 0
    det = (pred[dm] == 1).sum() / dm.sum() if dm.sum() else 0
    fp = (pred[nm] == 1).sum() / nm.sum() if nm.sum() else 0

    print("\n" + "=" * 70)
    print("  RESULTS")
    print("=" * 70)
    print(f"\n  Test accuracy:     {correct}/{total} = {te_acc:.1%}")
    print(f"  Train accuracy:    {tr_acc:.1%}")
    print(f"  Overfit gap:       {gap:+.1%}")
    print(f"  Detection rate:    {det:.1%}  ({(pred[dm]==1).sum()}/{dm.sum()})")
    print(f"  False positive:    {fp:.1%}  ({(pred[nm]==1).sum()}/{nm.sum()})")

    print(f"\n  {'Event':<40s} {'True':>5s} {'Pred':>5s} {'Prob':>6s} {'OK':>3s}")
    print(f"  {'-'*58}")
    for i in range(total):
        desc = str(test_df.iloc[i].get("description", "?"))[:39]
        tl = int(y_test.iloc[i])
        pl = int(pred[i])
        pr = proba[i][1] if proba.shape[1] > 1 else proba[i][0]
        ok = "Y" if tl == pl else "N"
        print(f"  {desc:<40s} {tl:>5d} {pl:>5d} {pr:>6.3f} {ok:>3s}")

    # Feature importances
    print(f"\n  Feature importances:")
    try:
        importances = clf.feature_importances_
        feature_names = list(X_train.columns)
        pairs = sorted(zip(feature_names, importances),
                        key=lambda x: x[1], reverse=True)
        for fn, imp in pairs:
            bar = '#' * int(imp * 40)
            print(f"    {fn:<24s} {imp:.4f}  {bar}")
    except Exception as e:
        print(f"    (error: {e})")

    elapsed = time.time() - t0
    print(f"\n  Time: {elapsed:.0f}s")

    PASS = te_acc >= 0.70 and det >= 0.65 and gap < 0.30
    status = "PASS" if PASS else "FAIL"
    print(f"\n  STATUS: {status}")
    print(f"    (acc>=70%, det>=65%, gap<30%)")
    print("=" * 70)
    return PASS


if __name__ == "__main__":
    ok = main()
    sys.exit(0 if ok else 1)
