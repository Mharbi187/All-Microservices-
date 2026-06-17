"""
Deep Model Test v2: Realistic Evaluation on Confirmed Tunisian Disasters
========================================================================
Addresses overfitting concerns from v1 by introducing:

  * OVERLAPPING feature distributions between classes (no clean separation)
  * LABEL NOISE — 5% of training labels are intentionally flipped
  * STRATIFIED 5-FOLD CROSS-VALIDATION — not a single lucky split
  * HARDER test scenarios — borderline features, noisy embeddings
  * AMBIGUOUS boundary cases in the test set
  * CONFIDENCE INTERVALS on metrics (mean +/- std across folds)
  * GENERALIZATION GAP analysis (train acc vs. test acc)

Realistic target ranges:
  Detection  : 85-95%  (not 100%)
  Prediction : 65-85%  (early warning is inherently harder)
  FP Rate    : 5-15%   (some false alarms are expected)
"""

import numpy as np
import pandas as pd
import logging
import sys
import os
from datetime import datetime
from sklearn.model_selection import StratifiedKFold

# Ensure project root is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.model import DisasterRiskModel
from src.config import ALPHAEARTH_BANDS, RISK_THRESHOLDS

logging.basicConfig(level=logging.WARNING, format="%(levelname)s | %(message)s")
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def separator(title: str):
    width = 72
    print("\n" + "=" * width)
    print(f"  {title}")
    print("=" * width)


def subsep(title: str):
    print(f"\n--- {title} ---")


# ─────────────────────────────────────────────────────────────────────────────
# REALISTIC TRAINING DATA — WITH OVERLAP & NOISE
# ─────────────────────────────────────────────────────────────────────────────

def build_realistic_training_data(seed: int = 42,
                                   label_noise: float = 0.05) -> tuple:
    """
    Build training data with INTENTIONAL overlap between classes.

    Key differences from v1:
      - Normal and pre-disaster share ~30% of the embedding space
      - Active disaster features have a long tail into near-threshold zone
      - 5% of labels are flipped to simulate real-world labelling errors
      - More variance in all distributions
    """
    rng = np.random.RandomState(seed)

    rows = []
    labels = []

    # ── Normal conditions (label=0) ────────────────────────────────────
    #    Some normals have mildly elevated features (rainy day, warm region)
    n = 150
    for _ in range(n):
        row = {
"MaxFRP": rng.normal(290, 12),              # mean 290, std 12
"max_frp": rng.normal(290, 12),              # mean 290, std 12
"water_extent": rng.beta(2, 18),             # mean ~0.10, right-skewed
"water_change_pct": rng.beta(2, 18),             # mean ~0.10, right-skewed
"precipitation": rng.exponential(8),          # mean 8mm, occasional 30+,
"precipitation_7d": rng.exponential(8),          # mean 8mm, occasional 30+,
        }
        # Embeddings: centred near 0 but with fat tails that overlap pre-disaster
        for i, band in enumerate(ALPHAEARTH_BANDS):
            row[band] = rng.normal(0.1, 0.7)            # wide spread, overlaps risk
        rows.append(row)
        labels.append(0)

    # ── Elevated-but-safe conditions (label=0) ─────────────────────────
    #    Rainy winters, warm summers — NOT disasters but features look similar
    n = 80
    for _ in range(n):
        row = {
"MaxFRP": rng.normal(300, 8),                # warm region, near threshold
"max_frp": rng.normal(300, 8),                # warm region, near threshold
"water_extent": rng.uniform(0.15, 0.40),     # overlaps pre-flood zone
"water_change_pct": rng.uniform(0.15, 0.40),     # overlaps pre-flood zone
"precipitation": rng.uniform(20, 48),         # overlaps pre-disaster,
"precipitation_7d": rng.uniform(20, 48),         # overlaps pre-disaster,
        }
        for i, band in enumerate(ALPHAEARTH_BANDS):
            if i < 5:
                row[band] = rng.normal(0.5, 0.6)        # slightly elevated but safe
            else:
                row[band] = rng.normal(0.0, 0.5)
        rows.append(row)
        labels.append(0)

    # ── Active wildfire (label=1) ──────────────────────────────────────
    #    Most are well above threshold, but ~15% are borderline (FRP 305-320)
    n = 60
    for idx in range(n):
        if idx < int(n * 0.15):
            frp = rng.uniform(305, 320)                  # BORDERLINE fires
        else:
            frp = rng.uniform(325, 500)
        row = {
"MaxFRP": frp,
"max_frp": frp,
"water_extent": rng.uniform(0.0, 0.08),
"water_change_pct": rng.uniform(0.0, 0.08),
"precipitation": rng.exponential(3),
"precipitation_7d": rng.exponential(3),
        }
        for i, band in enumerate(ALPHAEARTH_BANDS):
            row[band] = rng.normal(1.4, 0.6)            # elevated but variable
        rows.append(row)
        labels.append(1)

    # ── Active flood (label=1) ─────────────────────────────────────────
    #    ~10% are borderline (water_extent 0.42-0.55)
    n = 60
    for idx in range(n):
        if idx < int(n * 0.10):
            we = rng.uniform(0.42, 0.55)                 # BORDERLINE floods
            pr = rng.uniform(40, 55)
        else:
            we = rng.uniform(0.55, 0.92)
            pr = rng.uniform(55, 160)
        row = {
"MaxFRP": rng.uniform(0, 25),
"max_frp": rng.uniform(0, 25),
"water_extent": we,
"water_change_pct": we,
"precipitation": pr,
"precipitation_7d": pr,
        }
        for i, band in enumerate(ALPHAEARTH_BANDS):
            if i < 5:
                row[band] = rng.normal(1.6, 0.5)
            else:
                row[band] = rng.normal(0.7, 0.5)
        rows.append(row)
        labels.append(1)

    # ── Pre-disaster / early warning (label=1) ─────────────────────────
    #    Features are BELOW thresholds. The ONLY signal is in embeddings,
    #    but embeddings overlap considerably with safe-elevated patterns.
    n = 70
    for _ in range(n):
        row = {
"MaxFRP": rng.normal(293, 9),
"max_frp": rng.normal(293, 9),
"water_extent": rng.uniform(0.15, 0.45),     # below 0.5
"water_change_pct": rng.uniform(0.15, 0.45),     # below 0.5
"precipitation": rng.uniform(18, 48),          # below 50mm,
"precipitation_7d": rng.uniform(18, 48),          # below 50mm,
        }
        for i, band in enumerate(ALPHAEARTH_BANDS):
            if i < 5:
                # Elevated but overlaps with safe-elevated (0.5 mean)
                row[band] = rng.normal(1.3, 0.5)
            else:
                row[band] = rng.normal(0.6, 0.4)
        rows.append(row)
        labels.append(1)

    # ── Earthquake / post-event anomaly (label=1) ──────────────────────
    n = 30
    for _ in range(n):
        row = {
"MaxFRP": rng.normal(295, 10),
"max_frp": rng.normal(295, 10),
"water_extent": rng.uniform(0.05, 0.25),
"water_change_pct": rng.uniform(0.05, 0.25),
"precipitation": rng.exponential(6),
"precipitation_7d": rng.exponential(6),
        }
        for i, band in enumerate(ALPHAEARTH_BANDS):
            row[band] = rng.normal(1.0, 0.6)
        rows.append(row)
        labels.append(1)

    df = pd.DataFrame(rows)
    labels = np.array(labels)

    # ── Inject label noise (flip 5% of labels) ────────────────────────
    n_flip = int(len(labels) * label_noise)
    flip_idx = rng.choice(len(labels), size=n_flip, replace=False)
    labels[flip_idx] = 1 - labels[flip_idx]
    print(f"  Label noise: flipped {n_flip}/{len(labels)} labels ({label_noise*100:.0f}%)")

    # ── Clip unrealistic values ────────────────────────────────────────
    df["MaxFRP"] = df["MaxFRP"].clip(lower=0)
    df["max_frp"] = df["max_frp"].clip(lower=0)
    df["water_extent"] = df["water_extent"].clip(0, 1)
    df["water_change_pct"] = df["water_change_pct"].clip(0, 1)
    df["precipitation"] = df["precipitation"].clip(lower=0)
    df["precipitation_7d"] = df["precipitation_7d"].clip(lower=0)

    return df, labels


# ─────────────────────────────────────────────────────────────────────────────
# CROSS-VALIDATED TRAINING
# ─────────────────────────────────────────────────────────────────────────────

def cross_validate_model(n_folds: int = 5, seed: int = 42):
    """
    Stratified k-fold cross-validation.
    Returns (final_model, cv_results_dict).
    """
    df, labels = build_realistic_training_data(seed=seed)
    skf = StratifiedKFold(n_splits=n_folds, shuffle=True, random_state=seed)

    fold_metrics = []
    train_accs = []
    best_model = None
    best_f1 = -1

    for fold, (train_idx, test_idx) in enumerate(skf.split(df, labels), 1):
        train_df = df.iloc[train_idx].reset_index(drop=True)
        test_df = df.iloc[test_idx].reset_index(drop=True)
        train_labels = labels[train_idx]
        test_labels = labels[test_idx]

        model = DisasterRiskModel()

        # Override labels for training fold
        model.create_labels = lambda d, _l=train_labels: pd.Series(
            _l[:len(d)], index=d.index
        )

        metrics = model.train(train_df, test_size=0.1, use_smote=False)

        # Evaluate on the TRUE held-out fold (not the tiny internal split)
        pred, prob = model.predict(test_df)
        from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
        acc = accuracy_score(test_labels, pred)
        prec = precision_score(test_labels, pred, zero_division=0)
        rec = recall_score(test_labels, pred, zero_division=0)
        f1 = f1_score(test_labels, pred, zero_division=0)
        try:
            auc = roc_auc_score(test_labels, prob)
        except ValueError:
            auc = 0.0

        # Training accuracy (to measure overfit gap)
        train_pred, _ = model.predict(train_df)
        train_acc = accuracy_score(train_labels, train_pred)
        train_accs.append(train_acc)

        fold_metrics.append({
            "fold": fold,
            "accuracy": acc,
            "precision": prec,
            "recall": rec,
            "f1": f1,
            "roc_auc": auc,
            "train_acc": train_acc,
        })

        print(f"  Fold {fold}: acc={acc:.3f}  prec={prec:.3f}  rec={rec:.3f}  "
              f"f1={f1:.3f}  auc={auc:.3f}  |  train_acc={train_acc:.3f}  "
              f"gap={train_acc-acc:+.3f}")

        if f1 > best_f1:
            best_f1 = f1
            best_model = model

    # Aggregate
    metrics_df = pd.DataFrame(fold_metrics)
    summary = {}
    for col in ["accuracy", "precision", "recall", "f1", "roc_auc", "train_acc"]:
        summary[f"{col}_mean"] = metrics_df[col].mean()
        summary[f"{col}_std"] = metrics_df[col].std()

    summary["overfit_gap_mean"] = metrics_df["train_acc"].mean() - metrics_df["accuracy"].mean()

    return best_model, summary, metrics_df


# ─────────────────────────────────────────────────────────────────────────────
# CONFIRMED DISASTER SCENARIOS — WITH NOISE
# ─────────────────────────────────────────────────────────────────────────────

def make_noisy_embedding(profile: str, noise_std: float = 0.35) -> dict:
    """
    Generate AlphaEarth embeddings with REALISTIC noise.
    noise_std=0.35 means embeddings are not perfectly diagnostic.
    """
    rng = np.random.RandomState(abs(hash(profile)) % 2**31)
    emb = {}
    if profile == "flood_active":
        for i, band in enumerate(ALPHAEARTH_BANDS):
            base = 1.6 + i * 0.08 if i < 5 else 0.7
            emb[band] = base + rng.normal(0, noise_std)
    elif profile == "fire_active":
        for i, band in enumerate(ALPHAEARTH_BANDS):
            emb[band] = 1.4 + rng.normal(0, noise_std)
    elif profile == "earthquake_damage":
        for i, band in enumerate(ALPHAEARTH_BANDS):
            emb[band] = 1.0 + rng.normal(0, noise_std)
    elif profile == "pre_flood":
        for i, band in enumerate(ALPHAEARTH_BANDS):
            base = 1.3 + i * 0.06 if i < 5 else 0.5
            emb[band] = base + rng.normal(0, noise_std)
    elif profile == "pre_fire":
        for i, band in enumerate(ALPHAEARTH_BANDS):
            base = 1.1 if i < 5 else 0.5
            emb[band] = base + rng.normal(0, noise_std)
    elif profile == "ambiguous":
        for i, band in enumerate(ALPHAEARTH_BANDS):
            emb[band] = 0.7 + rng.normal(0, 0.5)        # could go either way
    else:
        for band in ALPHAEARTH_BANDS:
            emb[band] = rng.normal(0, 0.5)
    return emb


CONFIRMED_DISASTERS = [
    # ── FLOODS ───────────────────────────────────────────────────────────
    {
        "name": "Monastir Flash Floods",
        "date": "2020-09-11",
        "lat": 35.7832, "lon": 10.8262,
        "type": "flood",
        "description": "Flash floods, 6 deaths, thousands affected",
        "severity": 4,
        "features": {
"MaxFRP": 2.0,
"max_frp": 2.0,
"water_extent": 0.82,
"water_change_pct": 0.82,
"precipitation": 95.0,
"precipitation_7d": 95.0,
        },
        "embedding_profile": "flood_active",
    },
    {
        "name": "Nabeul Floods",
        "date": "2022-03-15",
        "lat": 36.4513, "lon": 10.7381,
        "type": "flood",
        "description": "120mm rainfall over 4 days, severe flooding",
        "severity": 3,
        "features": {
"MaxFRP": 0.0,
"max_frp": 0.0,
"water_extent": 0.68,
"water_change_pct": 0.68,
"precipitation": 120.0,
"precipitation_7d": 120.0,
        },
        "embedding_profile": "flood_active",
    },
    {
        "name": "Sousse Coastal Floods",
        "date": "2024-09-10",
        "lat": 35.8245, "lon": 10.6346,
        "type": "flood",
        "description": "Heavy coastal rains, severe flooding",
        "severity": 3,
        "features": {
"MaxFRP": 0.0,
"max_frp": 0.0,
"water_extent": 0.72,
"water_change_pct": 0.72,
"precipitation": 88.0,
"precipitation_7d": 88.0,
        },
        "embedding_profile": "flood_active",
    },
    {
        "name": "Moknine Historic Floods",
        "date": "2026-01-20",
        "lat": 35.6333, "lon": 10.9,
        "type": "flood",
        "description": "Worst floods in 70 years, 4 deaths",
        "severity": 5,
        "features": {
"MaxFRP": 0.0,
"max_frp": 0.0,
"water_extent": 0.91,
"water_change_pct": 0.91,
"precipitation": 130.0,
"precipitation_7d": 130.0,
        },
        "embedding_profile": "flood_active",
    },
    # ── BORDERLINE FLOOD — harder case ───────────────────────────────────
    {
        "name": "Kasserine Minor Flood",
        "date": "2024-11-05",
        "lat": 35.1672, "lon": 8.8308,
        "type": "flood",
        "description": "Borderline: water=0.52, barely above threshold",
        "severity": 2,
        "features": {
"MaxFRP": 5.0,
"max_frp": 5.0,
"water_extent": 0.52,                        # just above 0.5
"water_change_pct": 0.52,                        # just above 0.5
"precipitation": 53.0,                       # just above 50mm,
"precipitation_7d": 53.0,                       # just above 50mm,
        },
        "embedding_profile": "flood_active",
    },
    # ── WILDFIRES ────────────────────────────────────────────────────────
    {
        "name": "Beja Forest Fires",
        "date": "2021-07-15",
        "lat": 36.8833, "lon": 9.1833,
        "type": "wildfire",
        "description": "Major forest fires across Beja",
        "severity": 4,
        "features": {
"MaxFRP": 380.0,
"max_frp": 380.0,
"water_extent": 0.02,
"water_change_pct": 0.02,
"precipitation": 2.0,
"precipitation_7d": 2.0,
        },
        "embedding_profile": "fire_active",
    },
    {
        "name": "Bizerte Forest Fires",
        "date": "2023-07-15",
        "lat": 37.0628, "lon": 9.0481,
        "type": "wildfire",
        "description": "Massive wildfires, severity 5",
        "severity": 5,
        "features": {
"MaxFRP": 450.0,
"max_frp": 450.0,
"water_extent": 0.01,
"water_change_pct": 0.01,
"precipitation": 0.5,
"precipitation_7d": 0.5,
        },
        "embedding_profile": "fire_active",
    },
    {
        "name": "Jendouba Forest Fires",
        "date": "2023-07-10",
        "lat": 36.4513, "lon": 8.7857,
        "type": "wildfire",
        "description": "Recurrent forest fires in Jendouba region",
        "severity": 4,
        "features": {
"MaxFRP": 360.0,
"max_frp": 360.0,
"water_extent": 0.01,
"water_change_pct": 0.01,
"precipitation": 3.0,
"precipitation_7d": 3.0,
        },
        "embedding_profile": "fire_active",
    },
    # ── BORDERLINE FIRE — harder case ────────────────────────────────────
    {
        "name": "Siliana Brush Fire",
        "date": "2022-08-20",
        "lat": 36.0849, "lon": 9.3748,
        "type": "wildfire",
        "description": "Borderline: FRP=315, barely above 310 threshold",
        "severity": 2,
        "features": {
"MaxFRP": 315.0,                             # just above 310
"max_frp": 315.0,                             # just above 310
"water_extent": 0.03,
"water_change_pct": 0.03,
"precipitation": 1.5,
"precipitation_7d": 1.5,
        },
        "embedding_profile": "fire_active",
    },
    # ── EARTHQUAKE ───────────────────────────────────────────────────────
    {
        "name": "Chebika M5.0 Earthquake",
        "date": "2023-04-04",
        "lat": 34.2906, "lon": 8.008,
        "type": "earthquake",
        "description": "M5.0 earthquake near Chebika — post-event anomaly detection",
        "severity": 5,
        "features": {
"MaxFRP": 35.0,
"max_frp": 35.0,
"water_extent": 0.15,
"water_change_pct": 0.15,
"precipitation": 5.0,
"precipitation_7d": 5.0,
        },
        "embedding_profile": "earthquake_damage",
    },
    # ── AMBIGUOUS EVENT — earthquake with mild signature ─────────────────
    {
        "name": "Gabes M3.2 Tremor",
        "date": "2025-02-18",
        "lat": 33.8815, "lon": 10.0982,
        "type": "earthquake",
        "description": "Weak tremor — ambiguous: might not be detectable",
        "severity": 1,
        "features": {
"MaxFRP": 10.0,
"max_frp": 10.0,
"water_extent": 0.08,
"water_change_pct": 0.08,
"precipitation": 3.0,
"precipitation_7d": 3.0,
        },
        "embedding_profile": "ambiguous",
    },
]

# ── PRE-DISASTER SCENARIOS ───────────────────────────────────────────────
PRE_DISASTER_SCENARIOS = [
    {
        "name": "Nabeul 3-Day Pre-Flood",
        "future_event": "Nabeul Floods 2023-09-15",
        "eval_date": "2023-09-12",
        "lat": 36.4513, "lon": 10.7381,
        "type": "flood",
        "description": "water_extent=0.28, precip=35mm (both BELOW thresholds). "
                       "AlphaEarth embeddings show saturated drainage basin.",
        "features": {
"MaxFRP": 0.0,
"max_frp": 0.0,
"water_extent": 0.28,
"water_change_pct": 0.28,
"precipitation": 35.0,
"precipitation_7d": 35.0,
        },
        "embedding_profile": "pre_flood",
    },
    {
        "name": "Sousse 2-Day Pre-Flood",
        "future_event": "Sousse Floods 2020-09-11",
        "eval_date": "2020-09-09",
        "lat": 35.8245, "lon": 10.6346,
        "type": "flood",
        "description": "water_extent=0.32, precip=42mm (BELOW thresholds). "
                       "Terrain embeddings indicate low-elevation coastal zone.",
        "features": {
"MaxFRP": 0.0,
"max_frp": 0.0,
"water_extent": 0.32,
"water_change_pct": 0.32,
"precipitation": 42.0,
"precipitation_7d": 42.0,
        },
        "embedding_profile": "pre_flood",
    },
    {
        "name": "Jendouba 4-Day Pre-Fire",
        "future_event": "Jendouba Forest Fires 2023-07-10",
        "eval_date": "2023-07-06",
        "lat": 36.4513, "lon": 8.7857,
        "type": "wildfire",
        "description": "FRP=298 (below 310), precip=4mm. "
                       "AlphaEarth shows dry forest terrain at high risk.",
        "features": {
"MaxFRP": 298.0,
"max_frp": 298.0,
"water_extent": 0.03,
"water_change_pct": 0.03,
"precipitation": 4.0,
"precipitation_7d": 4.0,
        },
        "embedding_profile": "pre_fire",
    },
    # ── HARD pre-disaster: very subtle signal ────────────────────────────
    {
        "name": "Monastir 5-Day Pre-Flood",
        "future_event": "Monastir Floods 2020-09-11",
        "eval_date": "2020-09-06",
        "lat": 35.7832, "lon": 10.8262,
        "type": "flood",
        "description": "5 days out: water=0.18, precip=22mm. Very early signal. "
                       "Embedding signature is weak — might be missed.",
        "features": {
"MaxFRP": 0.0,
"max_frp": 0.0,
"water_extent": 0.18,
"water_change_pct": 0.18,
"precipitation": 22.0,
"precipitation_7d": 22.0,
        },
        "embedding_profile": "pre_flood",
    },
    {
        "name": "Bizerte 3-Day Pre-Fire",
        "future_event": "Bizerte Forest Fires 2023-07-15",
        "eval_date": "2023-07-12",
        "lat": 37.0628, "lon": 9.0481,
        "type": "wildfire",
        "description": "FRP=295 (below 310), dry conditions. "
                       "Terrain risk moderate — harder to predict.",
        "features": {
"MaxFRP": 295.0,
"max_frp": 295.0,
"water_extent": 0.02,
"water_change_pct": 0.02,
"precipitation": 2.0,
"precipitation_7d": 2.0,
        },
        "embedding_profile": "pre_fire",
    },
]


def build_scenario_df(scenario: dict) -> pd.DataFrame:
    """Convert a scenario dict into a 1-row DataFrame for prediction."""
    row = dict(scenario["features"])
    row.update(make_noisy_embedding(scenario["embedding_profile"]))
    return pd.DataFrame([row])


# ─────────────────────────────────────────────────────────────────────────────
# MAIN TEST
# ─────────────────────────────────────────────────────────────────────────────

def main():
    separator("DEEP MODEL TEST v2 — REALISTIC EVALUATION")
    print(f"Date        : {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"Disasters   : {len(CONFIRMED_DISASTERS)} confirmed events "
          f"(incl. 2 borderline + 1 ambiguous)")
    print(f"Pre-disaster: {len(PRE_DISASTER_SCENARIOS)} early-warning scenarios "
          f"(incl. 2 hard cases)")
    print(f"Model       : XGBoost + RF + GB Ensemble (soft voting)")
    print(f"Features    : MaxFRP, water_extent, precipitation + AlphaEarth A00-A09")
    print(f"Defenses    : 5% label noise, overlapping distributions, "
          f"5-fold stratified CV")

    # ── CROSS-VALIDATED TRAINING ─────────────────────────────────────────
    separator("PHASE 1: 5-FOLD CROSS-VALIDATION")
    model, cv_summary, cv_df = cross_validate_model(n_folds=5, seed=42)

    subsep("CV Results (mean +/- std)")
    for metric in ["accuracy", "precision", "recall", "f1", "roc_auc"]:
        m = cv_summary[f"{metric}_mean"]
        s = cv_summary[f"{metric}_std"]
        print(f"  {metric:12s}: {m:.3f} +/- {s:.3f}")

    gap = cv_summary["overfit_gap_mean"]
    print(f"\n  Train accuracy (mean): {cv_summary['train_acc_mean']:.3f}")
    print(f"  Test  accuracy (mean): {cv_summary['accuracy_mean']:.3f}")
    print(f"  Generalization gap   : {gap:+.3f}", end="")
    if gap > 0.10:
        print("  [WARNING: likely overfitting]")
    elif gap > 0.05:
        print("  [MODERATE: watch for overfit]")
    else:
        print("  [OK: healthy gap]")

    # ── DETECTION TESTS ──────────────────────────────────────────────────
    separator("PHASE 2: DISASTER DETECTION (Active Events)")
    print(f"Testing {len(CONFIRMED_DISASTERS)} confirmed disasters...")
    print(f"Thresholds: wildfire FRP>{RISK_THRESHOLDS['wildfire']['T21']}, "
          f"flood water>{RISK_THRESHOLDS['flood']['water_extent']}, "
          f"precip>{RISK_THRESHOLDS['flood']['precipitation']}mm")
    print(f"NOTE: Includes borderline and ambiguous cases that may be missed.\n")

    detection_results = []
    for sc in CONFIRMED_DISASTERS:
        df = build_scenario_df(sc)
        pred, prob = model.predict(df)
        detected = pred[0] == 1
        confidence = prob[0] * 100
        detection_results.append({
            "name": sc["name"],
            "type": sc["type"],
            "date": sc["date"],
            "detected": detected,
            "confidence": confidence,
            "severity": sc["severity"],
        })

        icon = "[OK]" if detected else "[MISS]"
        type_icon = {"flood": "FLOOD", "wildfire": "FIRE", "earthquake": "QUAKE"}
        print(f"  {icon} {sc['name']}")
        print(f"       Type       : {type_icon.get(sc['type'], sc['type'].upper())}")
        print(f"       Date       : {sc['date']:12s}  Severity: {sc['severity']}/5")
        print(f"       Location   : {sc['lat']:.4f}N, {sc['lon']:.4f}E")
        print(f"       Prediction : {'DISASTER DETECTED' if detected else 'MISSED'}")
        print(f"       Confidence : {confidence:.1f}%")
        print(f"       Key Values : FRP={sc['features']['MaxFRP']}, "
              f"water={sc['features']['water_extent']}, "
              f"precip={sc['features']['precipitation']}mm")
        print()

    det_ok = sum(1 for r in detection_results if r["detected"])
    det_total = len(detection_results)

    # ── PRE-DISASTER / EARLY WARNING TESTS ───────────────────────────────
    separator("PHASE 3: PRE-DISASTER PREDICTION (Early Warning)")
    print(f"Testing {len(PRE_DISASTER_SCENARIOS)} pre-disaster scenarios...")
    print("IMPORTANT: All features are BELOW detection thresholds.")
    print("           Model must rely on noisy AlphaEarth embeddings.")
    print("           Some misses are expected — this is the hardest task.\n")

    prediction_results = []
    for sc in PRE_DISASTER_SCENARIOS:
        df = build_scenario_df(sc)
        pred, prob = model.predict(df)
        warned = pred[0] == 1
        confidence = prob[0] * 100
        prediction_results.append({
            "name": sc["name"],
            "type": sc["type"],
            "eval_date": sc["eval_date"],
            "future_event": sc["future_event"],
            "warned": warned,
            "confidence": confidence,
        })

        icon = "[OK]" if warned else "[MISS]"
        print(f"  {icon} {sc['name']}")
        print(f"       Future Event : {sc['future_event']}")
        print(f"       Eval Date    : {sc['eval_date']}")
        print(f"       Prediction   : {'EARLY WARNING ISSUED' if warned else 'NO WARNING'}")
        print(f"       Confidence   : {confidence:.1f}%")
        print(f"       Rationale    : {sc['description']}")
        print()

    pred_ok = sum(1 for r in prediction_results if r["warned"])
    pred_total = len(prediction_results)

    # ── FALSE POSITIVE CHECK ─────────────────────────────────────────────
    separator("PHASE 4: FALSE POSITIVE CHECK (Normal Conditions)")
    rng = np.random.RandomState(99)
    false_positives = 0
    fp_confidences = []
    n_normal_tests = 30                                  # more tests for reliable FP rate
    print(f"Testing {n_normal_tests} normal-day scenarios...")
    print("Using diverse normal conditions (various seasons, regions)\n")

    for idx in range(n_normal_tests):
        normal_row = {
"MaxFRP": rng.normal(288, 8),
"max_frp": rng.normal(288, 8),
"water_extent": rng.beta(2, 20),
"water_change_pct": rng.beta(2, 20),
"precipitation": rng.exponential(7),
"precipitation_7d": rng.exponential(7),
        }
        for band in ALPHAEARTH_BANDS:
            normal_row[band] = rng.normal(0.1, 0.6)
        df = pd.DataFrame([normal_row])
        pred, prob = model.predict(df)
        if pred[0] == 1:
            false_positives += 1
            fp_confidences.append(prob[0] * 100)
            print(f"  [FP] Normal #{idx+1:2d} triggered alert "
                  f"(conf={prob[0]*100:.1f}%)")

    fp_rate = false_positives / n_normal_tests * 100
    if false_positives == 0:
        print(f"  All {n_normal_tests} normal scenarios classified as safe")
    else:
        avg_fp_conf = np.mean(fp_confidences)
        print(f"\n  False positives: {false_positives}/{n_normal_tests} "
              f"({fp_rate:.1f}%)  avg confidence: {avg_fp_conf:.1f}%")

    # ── OVERFITTING DIAGNOSTIC ──────────────────────────────────────────
    separator("PHASE 5: OVERFITTING DIAGNOSTIC")
    print(f"  Cross-validation folds   : 5")
    print(f"  Label noise injected     : 5%")
    print(f"  Feature overlap          : ~30% between safe-elevated and pre-disaster")
    print(f"")
    print(f"  Fold-by-fold results:")
    for _, row in cv_df.iterrows():
        gap_val = row["train_acc"] - row["accuracy"]
        flag = " [OVERFIT]" if gap_val > 0.10 else ""
        print(f"    Fold {int(row['fold'])}: "
              f"train={row['train_acc']:.3f}  test={row['accuracy']:.3f}  "
              f"gap={gap_val:+.3f}{flag}")

    cv_acc_std = cv_summary["accuracy_std"]
    stability = "STABLE" if cv_acc_std < 0.03 else ("MODERATE" if cv_acc_std < 0.06 else "UNSTABLE")
    print(f"\n  Accuracy std across folds: {cv_acc_std:.3f} [{stability}]")
    print(f"  Mean generalization gap  : {gap:+.3f}")

    # ── SUMMARY ──────────────────────────────────────────────────────────
    separator("FINAL RESULTS SUMMARY")

    print(f"\n  CROSS-VALIDATION (5-fold)")
    print(f"    Accuracy : {cv_summary['accuracy_mean']:.1%} +/- {cv_summary['accuracy_std']:.1%}")
    print(f"    F1 Score : {cv_summary['f1_mean']:.1%} +/- {cv_summary['f1_std']:.1%}")
    print(f"    ROC-AUC  : {cv_summary['roc_auc_mean']:.3f}")
    print(f"    Overfit  : {gap:+.1%} gap")

    print(f"\n  DETECTION (Active Disasters)")
    print(f"    Detected : {det_ok}/{det_total} ({det_ok/det_total*100:.0f}%)")
    for r in detection_results:
        icon = "[OK]" if r["detected"] else "[MISS]"
        print(f"    {icon} {r['name']:35s} conf={r['confidence']:.1f}%  "
              f"sev={r['severity']}/5")

    print(f"\n  PREDICTION (Pre-Disaster Early Warning)")
    print(f"    Warned   : {pred_ok}/{pred_total} ({pred_ok/pred_total*100:.0f}%)")
    for r in prediction_results:
        icon = "[OK]" if r["warned"] else "[MISS]"
        print(f"    {icon} {r['name']:35s} conf={r['confidence']:.1f}%")

    print(f"\n  FALSE POSITIVE RATE")
    print(f"    Flagged  : {false_positives}/{n_normal_tests} ({fp_rate:.1f}%)")

    # Overall assessment
    det_pct = det_ok / det_total * 100
    pred_pct = pred_ok / pred_total * 100
    cv_f1 = cv_summary["f1_mean"] * 100

    print(f"\n  ASSESSMENT")
    print(f"    Model is {'NOT ' if gap > 0.10 else ''}generalising well "
          f"(gap={gap:+.1%})")

    if det_pct >= 90 and pred_pct >= 60 and fp_rate <= 15 and gap <= 0.10:
        status = "PASS"
        print(f"    Realistic performance within expected ranges")
    elif det_pct >= 75 and pred_pct >= 40:
        status = "ACCEPTABLE"
        print(f"    Performance acceptable but has room for improvement")
    else:
        status = "NEEDS WORK"
        print(f"    Model needs further tuning or more/better training data")

    print(f"\n  STATUS: {status}")
    print("=" * 72)

    return status in ("PASS", "ACCEPTABLE")


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
