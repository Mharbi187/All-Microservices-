"""
evaluate_model.py
=================
Regenerates the confusion matrix and all performance metrics for the
saved disaster_model.pkl WITHOUT re-training.

How it works
------------
1. Loads the saved model (pkl) which already contains the fitted sklearn
   pipeline + metadata.
2. Reads the same training CSV that was originally used.
3. Rebuilds the feature matrix following the exact same pipeline
   (engineer_features → prepare_features → scaler.transform).
4. Splits with the SAME random_state=42 so the test split is identical.
5. Generates and saves:
   - confusion_matrix.png         – binary heat-map (Low Risk vs High Risk)
   - confusion_matrix_hazard.png  – per-hazard matrix (Normal/Flood/Fire/Earthquake)
   - roc_curve.png                – ROC with AUC annotation
   - performance_metrics.json     – machine-readable metrics
   - classification_report.txt    – full sklearn report
   - feature_importances.png      – top-N bar chart (if available)

Usage (run from the disaster-detection root)
--------------------------------------------
    python evaluate_model.py
    python evaluate_model.py --model  data/models/disaster_model.pkl
    python evaluate_model.py --data   data/tunisia_final_balanced_training.csv
    python evaluate_model.py --outdir results/

Docker:
    docker exec -it <container> python /app/evaluate_model.py
"""

import os
import sys
import json
import logging
import argparse
import warnings
from datetime import datetime
from pathlib import Path

warnings.filterwarnings("ignore")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Optional heavy deps – degrade gracefully
# ---------------------------------------------------------------------------
try:
    import numpy as np
    import pandas as pd
    import joblib
    import matplotlib
    matplotlib.use("Agg")           # non-interactive backend (works in Docker)
    import matplotlib.pyplot as plt
    import matplotlib.ticker as mticker
    import seaborn as sns
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import (
        accuracy_score, precision_score, recall_score,
        f1_score, confusion_matrix, classification_report,
        roc_auc_score, roc_curve, ConfusionMatrixDisplay,
    )
except ImportError as e:
    sys.exit(f"[ERROR] Missing dependency: {e}\n"
             "Install with: pip install numpy pandas joblib matplotlib seaborn scikit-learn")

# ---------------------------------------------------------------------------
# Paths (overridable via CLI)
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).parent
DEFAULT_MODEL_PATH = BASE_DIR / "data" / "models" / "disaster_model.pkl"
DEFAULT_DATA_PATH  = BASE_DIR / "data" / "tunisia_final_balanced_training.csv"
DEFAULT_OUTPUT_DIR = BASE_DIR / "results"


# ---------------------------------------------------------------------------
# Feature engineering (mirrors src/model.py exactly)
# ---------------------------------------------------------------------------
RISK_THRESHOLDS = {
    "wildfire": {"T21": 300},
    "flood":    {"water_extent": 0.3, "precipitation": 50},
}

CANONICAL_FEATURE_ORDER = [
    "fire_count", "max_frp", "flood_area_km2", "water_change_pct",
    "precipitation_7d", "precip_anomaly", "ndvi",
    "A00", "A01", "A02", "A03", "A04", "A05", "A06", "A07", "A08", "A09",
    "temperature", "wind_speed", "humidity",
    "max_magnitude", "lat_norm", "lon_norm", "day_of_year_norm",
]

VALIDATED_MODEL_FEATURES = CANONICAL_FEATURE_ORDER + [
    "flood_risk_composite", "fire_risk_composite", "storm_composite",
]


def _safe_float(v, default=0.0):
    try:
        return float(v) if v is not None else default
    except (TypeError, ValueError):
        return default


def _compute_context(lat, lon, event_date=None):
    ts = event_date or datetime.utcnow()
    return {
        "lat_norm":          (lat - 30.2) / (37.3 - 30.2),
        "lon_norm":          (lon - 7.5)  / (11.5 - 7.5),
        "day_of_year_norm":  ts.timetuple().tm_yday / 365.0,
    }


def build_canonical_row(row: pd.Series) -> dict:
    """Convert a training-CSV row to the 24-feature canonical schema."""
    try:
        dt = datetime.strptime(str(row.get("date", "")), "%Y-%m-%d")
    except ValueError:
        dt = None
    lat = _safe_float(row.get("lat", 34.0))
    lon = _safe_float(row.get("lon", 9.0))

    r = {k: 0.0 for k in CANONICAL_FEATURE_ORDER}
    r.update(_compute_context(lat, lon, dt))

    hazard = str(row.get("hazard", "")).lower()
    severity = _safe_float(row.get("severity", 0))
    magnitude = _safe_float(row.get("magnitude", 0))

    if hazard == "fire":
        r["max_frp"]   = severity * 80.0   # proxy: severity → FRP
        r["fire_count"] = 1.0
    if hazard == "flood":
        r["precipitation_7d"]  = severity * 30.0
        r["water_change_pct"]  = severity * 0.15
    if hazard == "earthquake":
        r["max_magnitude"] = magnitude if magnitude > 0 else severity * 0.8

    return r


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    X = df.copy()
    if "precipitation_7d" in X.columns and "water_change_pct" in X.columns:
        X["flood_risk_composite"] = (
            (X["precipitation_7d"] / 50).clip(0, 3)
            * (1 + X["water_change_pct"]).clip(0.5, 5)
        )
    elif "precipitation_7d" in X.columns and "humidity" in X.columns:
        X["flood_risk_composite"] = (
            (X["precipitation_7d"] / 50).clip(0, 3)
            * (X["humidity"] / 100).clip(0, 1)
        )
    else:
        X["flood_risk_composite"] = 0.0

    if "max_frp" in X.columns and "temperature" in X.columns and "humidity" in X.columns:
        X["fire_risk_composite"] = (
            (X["max_frp"] / 100).clip(0, 3)
            + (X["temperature"] / 45).clip(0, 1.5)
            * (1 - X["humidity"] / 100).clip(0, 1)
        )
    elif "temperature" in X.columns and "humidity" in X.columns:
        X["fire_risk_composite"] = (
            (X["temperature"] / 45).clip(0, 1.5)
            * (1 - X["humidity"] / 100).clip(0, 1)
        )
    else:
        X["fire_risk_composite"] = 0.0

    if "wind_speed" in X.columns and "precipitation_7d" in X.columns:
        X["storm_composite"] = (
            (X["wind_speed"] / 60).clip(0, 2)
            * (1 + X["precipitation_7d"] / 20).clip(1, 5)
        )
    elif "wind_speed" in X.columns:
        X["storm_composite"] = (X["wind_speed"] / 60).clip(0, 2)
    else:
        X["storm_composite"] = 0.0

    return X


def prepare_features_for_eval(df: pd.DataFrame, model_feature_names: list) -> pd.DataFrame:
    """Build the feature matrix aligned to what the pkl model expects."""
    df_eng = engineer_features(df)

    # Add any required columns that are missing
    for col in model_feature_names:
        if col not in df_eng.columns:
            df_eng[col] = 0.0

    X = df_eng[model_feature_names].copy()
    X = X.fillna(0).replace([np.inf, -np.inf], 0)
    return X


# ---------------------------------------------------------------------------
# Plotting helpers
# ---------------------------------------------------------------------------
PALETTE = {
    "bg":        "#0f1117",
    "surface":   "#1a1d2e",
    "primary":   "#6366f1",
    "secondary": "#a78bfa",
    "accent":    "#22d3ee",
    "positive":  "#4ade80",
    "negative":  "#f87171",
    "text":      "#e2e8f0",
    "muted":     "#64748b",
}

def _apply_dark_theme(fig, ax_or_axes):
    fig.patch.set_facecolor(PALETTE["bg"])
    axes = [ax_or_axes] if hasattr(ax_or_axes, "set_facecolor") else list(ax_or_axes)
    for ax in axes:
        ax.set_facecolor(PALETTE["surface"])
        ax.tick_params(colors=PALETTE["text"])
        ax.xaxis.label.set_color(PALETTE["text"])
        ax.yaxis.label.set_color(PALETTE["text"])
        ax.title.set_color(PALETTE["text"])
        for spine in ax.spines.values():
            spine.set_edgecolor(PALETTE["muted"])


def plot_confusion_matrix(cm, labels, path, title="Confusion Matrix – Disaster Risk Detection",
                          figsize=None):
    n = len(labels)
    if figsize is None:
        figsize = (max(6, n * 1.8), max(5, n * 1.6))
    fig, ax = plt.subplots(figsize=figsize)
    _apply_dark_theme(fig, ax)

    annot_size = max(9, 18 - n * 2)
    sns.heatmap(
        cm, annot=True, fmt="d", cmap="Blues",
        xticklabels=labels, yticklabels=labels,
        linewidths=0.5, linecolor=PALETTE["muted"],
        ax=ax, annot_kws={"size": annot_size, "weight": "bold", "color": "white"},
    )
    ax.set_xlabel("Predicted Label", fontsize=13)
    ax.set_ylabel("True Label",      fontsize=13)
    ax.set_title(title, fontsize=14, pad=15)
    ax.tick_params(axis="x", rotation=30)
    ax.tick_params(axis="y", rotation=0)

    for text in ax.texts:
        text.set_color("white")

    plt.tight_layout()
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    logger.info(f"Saved: {path}")


HAZARD_LABEL_MAP = {
    # For the per-hazard matrix we use 3 classes:
    #   Normal (0), Flood (1), Fire (2)
    "normal":     0,
    "flood":      1,
    "fire":       2,
}
HAZARD_CLASS_NAMES = ["Normal", "Flood", "Fire"]
HAZARD_COLORS = [PALETTE["muted"], PALETTE["accent"], PALETTE["negative"]]


def plot_hazard_confusion_matrix(y_hazard_true, y_hazard_pred, path):
    """
    3-class confusion matrix: Normal / Flood / Fire.

    y_hazard_true / y_hazard_pred – integer arrays with values 0..2
    using HAZARD_CLASS_NAMES ordering.
    """
    from sklearn.metrics import confusion_matrix as _cm
    n = len(HAZARD_CLASS_NAMES)
    cm = _cm(y_hazard_true, y_hazard_pred, labels=list(range(n)))

    fig, axes = plt.subplots(1, 2, figsize=(16, 6),
                             gridspec_kw={"width_ratios": [3, 1]})
    _apply_dark_theme(fig, axes)

    # ---- left: heatmap ----
    ax = axes[0]
    # Normalised version for colour shading, raw counts in annotation
    cm_norm = cm.astype(float)
    row_sums = cm_norm.sum(axis=1, keepdims=True)
    row_sums[row_sums == 0] = 1           # avoid division by zero
    cm_norm = cm_norm / row_sums

    sns.heatmap(
        cm_norm, annot=cm, fmt="d", cmap="Blues",
        xticklabels=HAZARD_CLASS_NAMES,
        yticklabels=HAZARD_CLASS_NAMES,
        vmin=0, vmax=1,
        linewidths=0.5, linecolor=PALETTE["muted"],
        ax=ax,
        annot_kws={"size": 14, "weight": "bold", "color": "white"},
    )
    ax.set_xlabel("Predicted Hazard Type", fontsize=13)
    ax.set_ylabel("True Hazard Type",      fontsize=13)
    ax.set_title("Per-Hazard Confusion Matrix\n(row-normalised shading, raw counts)",
                 fontsize=13, pad=12)
    ax.tick_params(axis="x", rotation=20)
    ax.tick_params(axis="y", rotation=0)
    for text in ax.texts:
        text.set_color("white")

    # ---- right: per-class bar chart of recall ----
    ax2 = axes[1]
    per_class_recall = np.diag(cm_norm)
    bar_colors = HAZARD_COLORS
    bars = ax2.barh(HAZARD_CLASS_NAMES, per_class_recall,
                    color=bar_colors, edgecolor="none", height=0.55)
    ax2.set_xlim(0, 1.15)
    ax2.set_xlabel("Recall (per class)", fontsize=12)
    ax2.set_title("Per-Class Recall", fontsize=12, pad=12)
    ax2.invert_yaxis()
    for bar, val in zip(bars, per_class_recall):
        ax2.text(bar.get_width() + 0.02, bar.get_y() + bar.get_height() / 2,
                 f"{val:.0%}", va="center", ha="left",
                 color=PALETTE["text"], fontsize=11, fontweight="bold")

    fig.suptitle("Disaster Detection — Hazard-Type Breakdown",
                 fontsize=15, color=PALETTE["text"], y=1.02, fontweight="bold")
    plt.tight_layout()
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    logger.info(f"Saved: {path}")


def plot_roc_curve(fpr, tpr, auc_score, path):
    fig, ax = plt.subplots(figsize=(7, 6))
    _apply_dark_theme(fig, ax)

    ax.plot(fpr, tpr, color=PALETTE["primary"],  lw=2.5,
            label=f"ROC Curve  (AUC = {auc_score:.3f})")
    ax.plot([0, 1], [0, 1], color=PALETTE["muted"], lw=1.5,
            linestyle="--", label="Random Classifier")
    ax.fill_between(fpr, tpr, alpha=0.15, color=PALETTE["primary"])
    ax.set_xlim([0, 1])
    ax.set_ylim([0, 1.02])
    ax.set_xlabel("False Positive Rate", fontsize=13)
    ax.set_ylabel("True Positive Rate",  fontsize=13)
    ax.set_title("ROC Curve – Disaster Risk Detection", fontsize=15, pad=15)
    ax.legend(loc="lower right", fontsize=11,
              facecolor=PALETTE["surface"], labelcolor=PALETTE["text"])

    plt.tight_layout()
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    logger.info(f"Saved: {path}")


def plot_feature_importances(feat_df: pd.DataFrame, path, top_n=15):
    feat_df = feat_df.head(top_n)
    fig, ax = plt.subplots(figsize=(9, 6))
    _apply_dark_theme(fig, ax)

    colors = [PALETTE["primary"] if i == 0 else PALETTE["secondary"]
              for i in range(len(feat_df))]
    bars = ax.barh(feat_df["feature"], feat_df["importance"],
                   color=colors, edgecolor="none", height=0.6)
    ax.invert_yaxis()
    ax.set_xlabel("Importance Score", fontsize=13)
    ax.set_title(f"Top {top_n} Feature Importances", fontsize=15, pad=15)
    ax.xaxis.set_major_formatter(mticker.FormatStrFormatter("%.3f"))

    for bar, val in zip(bars, feat_df["importance"]):
        ax.text(bar.get_width() + 0.001, bar.get_y() + bar.get_height() / 2,
                f"{val:.4f}", va="center", ha="left",
                color=PALETTE["text"], fontsize=9)

    plt.tight_layout()
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    logger.info(f"Saved: {path}")


# ---------------------------------------------------------------------------
# Main evaluation routine
# ---------------------------------------------------------------------------
def evaluate(model_path: Path, data_path: Path, out_dir: Path):
    out_dir.mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------------
    # 1. Load model
    # ------------------------------------------------------------------
    logger.info(f"Loading model from: {model_path}")
    model_data   = joblib.load(model_path)
    model        = model_data["model"]
    scaler       = model_data.get("scaler")
    feature_names = model_data.get("feature_names") or VALIDATED_MODEL_FEATURES
    stored_metrics = model_data.get("training_metrics", {})
    metadata     = model_data.get("metadata", {})

    logger.info(f"Model type : {metadata.get('model_type', 'unknown')}")
    logger.info(f"Features   : {len(feature_names)}")
    logger.info(f"Saved at   : {metadata.get('saved_at', 'unknown')}")
    if stored_metrics:
        logger.info(f"Stored accuracy: {stored_metrics.get('accuracy', 0):.2%}")

    # ------------------------------------------------------------------
    # 2. Load data
    # ------------------------------------------------------------------
    logger.info(f"Loading training data from: {data_path}")
    raw_df = pd.read_csv(data_path)
    
    # Exclude earthquakes based on user request
    if "hazard" in raw_df.columns:
        raw_df = raw_df[raw_df["hazard"].str.strip().str.lower() != "earthquake"].reset_index(drop=True)
    
    logger.info(f"Total rows (excluding earthquakes): {len(raw_df)}")

    # Build canonical feature rows
    canonical_rows = [build_canonical_row(row) for _, row in raw_df.iterrows()]
    feat_df = pd.DataFrame(canonical_rows)

    # Ground-truth labels come from the CSV 'label' column
    if "label" in raw_df.columns:
        y = raw_df["label"].astype(int).values
    else:
        sys.exit("[ERROR] Training CSV has no 'label' column – cannot evaluate.")

    # Hazard string per row (for multi-class confusion matrix)
    hazard_col = raw_df["hazard"].str.strip().str.lower() if "hazard" in raw_df.columns \
        else pd.Series(["unknown"] * len(raw_df))
    # Map to integer 0-3; anything unknown → use label: 0=normal, 1=fire
    hazard_int = hazard_col.map(
        lambda h: HAZARD_LABEL_MAP.get(h, 0 if h == "normal" else 1)
    ).values

    # ------------------------------------------------------------------
    # 3. Prepare features & reproduce the same train/test split
    # ------------------------------------------------------------------
    X = prepare_features_for_eval(feat_df, list(feature_names))

    # Same split as training (test_size=0.3, random_state=42, stratified)
    unique_classes = np.unique(y)
    stratify = y if len(unique_classes) > 1 else None
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.3, random_state=42, stratify=stratify
    )
    # Mirror the exact same split indices for hazard labels
    _, _, hazard_train, hazard_test = train_test_split(
        X, hazard_int, test_size=0.3, random_state=42, stratify=stratify
    )
    logger.info(f"Test set size : {len(X_test)} samples")
    logger.info(f"Class balance : {dict(zip(*np.unique(y_test, return_counts=True)))}")  

    # Scale
    if scaler is not None:
        X_test_scaled = scaler.transform(X_test)
    else:
        X_test_scaled = X_test.values

    # ------------------------------------------------------------------
    # 4. Predict
    # ------------------------------------------------------------------
    y_pred = model.predict(X_test_scaled)
    try:
        proba = model.predict_proba(X_test_scaled)
        y_score = proba[:, 1] if proba.shape[1] > 1 else proba[:, 0]
    except Exception:
        y_score = None

    # ------------------------------------------------------------------
    # 5. Compute metrics
    # ------------------------------------------------------------------
    cm   = confusion_matrix(y_test, y_pred)
    acc  = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, zero_division=0)
    rec  = recall_score(y_test, y_pred,    zero_division=0)
    f1   = f1_score(y_test, y_pred,        zero_division=0)

    tn = fp = fn = tp = None
    fpr_val = tpr_val = 0.0
    if cm.shape == (2, 2):
        tn, fp, fn, tp = cm.ravel()
        fpr_val = fp / (fp + tn) if (fp + tn) > 0 else 0.0
        tpr_val = tp / (tp + fn) if (tp + fn) > 0 else 0.0

    auc_score = None
    fpr_curve = tpr_curve = None
    if y_score is not None and len(unique_classes) > 1:
        try:
            auc_score  = roc_auc_score(y_test, y_score)
            fpr_curve, tpr_curve, _ = roc_curve(y_test, y_score)
        except Exception as e:
            logger.warning(f"ROC-AUC could not be computed: {e}")

    report_str = classification_report(
        y_test, y_pred, target_names=["Low Risk (0)", "High Risk (1)"]
    )

    # ------------------------------------------------------------------
    # 6. Print summary
    # ------------------------------------------------------------------
    sep = "=" * 56
    logger.info(f"\n{sep}")
    logger.info("  PERFORMANCE METRICS  –  Disaster Detection Model")
    logger.info(sep)
    logger.info(f"  Accuracy              : {acc:.4f}  ({acc:.2%})")
    logger.info(f"  Precision             : {prec:.4f}  ({prec:.2%})")
    logger.info(f"  Recall (Sensitivity)  : {rec:.4f}  ({rec:.2%})")
    logger.info(f"  F1 Score              : {f1:.4f}  ({f1:.2%})")
    logger.info(f"  False Positive Rate   : {fpr_val:.4f}  ({fpr_val:.2%})")
    logger.info(f"  True Positive Rate    : {tpr_val:.4f}  ({tpr_val:.2%})")
    if auc_score is not None:
        logger.info(f"  ROC-AUC Score         : {auc_score:.4f}")
    if cm.shape == (2, 2):
        logger.info(f"\n  Confusion Matrix:")
        logger.info(f"    TN={tn}  FP={fp}")
        logger.info(f"    FN={fn}  TP={tp}")
    logger.info(f"\n{sep}")
    logger.info(f"\n{report_str}")

    # ------------------------------------------------------------------
    # 7. Save artefacts
    # ------------------------------------------------------------------
    # 7a-i. Binary confusion matrix (Low Risk vs High Risk)
    plot_confusion_matrix(
        cm, labels=["Low Risk", "High Risk"],
        path=out_dir / "confusion_matrix.png",
        title="Binary Confusion Matrix – Low Risk vs High Risk",
    )

    # 7a-ii. Per-hazard confusion matrix (Normal / Flood / Fire)
    # Build hazard-level predictions: for each test sample, if the model
    # predicts 1 (high risk) we keep the true hazard type; if it predicts 0
    # we call it 'Normal' regardless of true type (model said no event).
    hazard_pred = np.where(y_pred == 1, hazard_test, 0)   # 0 = Normal
    plot_hazard_confusion_matrix(
        hazard_test, hazard_pred,
        path=out_dir / "confusion_matrix_hazard.png"
    )

    # 7b. ROC curve plot
    if fpr_curve is not None and auc_score is not None:
        plot_roc_curve(fpr_curve, tpr_curve, auc_score,
                       path=out_dir / "roc_curve.png")
    else:
        logger.warning("ROC curve skipped (single class or no probability output).")

    # 7c. Feature importances plot
    feat_imp_df = model_data.get("feature_importances")
    if feat_imp_df is None:
        # Try extracting directly from model
        if hasattr(model, "feature_importances_"):
            feat_imp_df = pd.DataFrame({
                "feature":    list(feature_names),
                "importance": model.feature_importances_,
            }).sort_values("importance", ascending=False)

    if feat_imp_df is not None and not feat_imp_df.empty:
        plot_feature_importances(feat_imp_df, path=out_dir / "feature_importances.png")
    else:
        logger.warning("Feature importances not available (ensemble or unsupported model).")

    # 7d. JSON metrics
    # Per-hazard counts in test set
    hazard_counts = {}
    for cls_id, cls_name in enumerate(HAZARD_CLASS_NAMES):
        mask = hazard_test == cls_id
        total  = int(mask.sum())
        if total == 0:
            hazard_counts[cls_name] = {"total": 0, "detected": 0, "missed": 0, "recall": None}
            continue
        detected = int(((y_pred == 1) & mask).sum())   # model flagged as high-risk
        hazard_counts[cls_name] = {
            "total":    total,
            "detected": detected,
            "missed":   total - detected,
            "recall":   round(detected / total, 4),
        }

    metrics_dict = {
        "evaluated_at":      datetime.utcnow().isoformat() + "Z",
        "model_path":        str(model_path),
        "data_path":         str(data_path),
        "test_size":         int(len(X_test)),
        "total_samples":     int(len(y)),
        "accuracy":          round(acc,  4),
        "precision":         round(prec, 4),
        "recall":            round(rec,  4),
        "f1_score":          round(f1,   4),
        "false_positive_rate": round(fpr_val, 4),
        "true_positive_rate":  round(tpr_val, 4),
        "roc_auc":           round(auc_score, 4) if auc_score else None,
        "confusion_matrix_binary":  cm.tolist(),
        "confusion_matrix_labels":  ["Low Risk", "High Risk"],
        "per_hazard_recall": hazard_counts,
        "model_type":        metadata.get("model_type", "unknown"),
        "sklearn_version":   metadata.get("sklearn_version", "unknown"),
        "originally_saved_at": metadata.get("saved_at", "unknown"),
    }
    metrics_path = out_dir / "performance_metrics.json"
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics_dict, f, indent=2)
    logger.info(f"Saved: {metrics_path}")

    # 7e. Classification report text
    report_path = out_dir / "classification_report.txt"
    header = (
        f"Disaster Detection Model – Classification Report\n"
        f"Generated : {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}\n"
        f"Model     : {model_path}\n"
        f"Data      : {data_path}\n"
        f"{'=' * 56}\n\n"
    )
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(header + report_str)
    logger.info(f"Saved: {report_path}")

    logger.info(f"\n✅  All outputs written to: {out_dir.resolve()}")
    return metrics_dict


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def parse_args():
    parser = argparse.ArgumentParser(
        description="Regenerate confusion matrix & metrics from a saved .pkl model."
    )
    parser.add_argument(
        "--model", type=Path, default=DEFAULT_MODEL_PATH,
        help=f"Path to disaster_model.pkl  (default: {DEFAULT_MODEL_PATH})",
    )
    parser.add_argument(
        "--data", type=Path, default=DEFAULT_DATA_PATH,
        help=f"Path to training CSV  (default: {DEFAULT_DATA_PATH})",
    )
    parser.add_argument(
        "--outdir", type=Path, default=DEFAULT_OUTPUT_DIR,
        help=f"Output directory  (default: {DEFAULT_OUTPUT_DIR})",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()

    if not args.model.exists():
        sys.exit(f"[ERROR] Model file not found: {args.model}")
    if not args.data.exists():
        sys.exit(f"[ERROR] Data file not found:  {args.data}")

    evaluate(args.model, args.data, args.outdir)
