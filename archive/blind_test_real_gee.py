"""
Blind Test avec Données Satellitaires Réelles (GEE)
====================================================
Ce script :
  1. ENTRAÎNE le modèle sur des événements CONNUS (GEE réel)
  2. TESTE le modèle sur des catastrophes CONFIRMÉES qu'il n'a JAMAIS vues

Contrairement à test_blind.py (features synthétiques), ce script
extrait les features RÉELLES depuis Google Earth Engine via
get_features_for_event(), puis les passe au modèle.

TRAINING SET (le modèle apprend sur ceux-ci) :
  - Feux de Tabarka — Juillet 2023
  - Inondations de Sousse — Octobre 2018
  - Inondations de Tunis — Septembre 2020
  - Normal : Kairouan Février 2024
  - Normal : Tozeur Mars 2024
  - Normal : Médenine Janvier 2024

BLIND TEST SET (le modèle n'a JAMAIS vu ceux-ci) :
  1. Inondations de Bizerte — Septembre 2024
  2. Inondations de Gabès — Octobre 2022
  3. Inondations du Cap Bon — Septembre 2023
  4. Incendies de Siliana — Août 2024
  5. Incendies du Kef — Juillet 2023
  6. Normal : Sfax — Février 2024
  7. Normal : Monastir — Avril 2024
  8. Normal : Tunis — Mars 2024

Usage (dans le conteneur Docker) :
    python blind_test_real_gee.py
"""

import sys
import os
import logging
import numpy as np
import pandas as pd
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.model import DisasterRiskModel
from src.data_acquisition import GEEDataAcquisition
from src.config import RISK_THRESHOLDS

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s | %(message)s"
)
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
#  TRAINING EVENTS — the model LEARNS from these
# ─────────────────────────────────────────────────────────────────────────────

TRAIN_EVENTS = [
    # ── Known disasters ──────────────────────────────────────────────────
    {
        "name": "Feux de Tabarka — Juil 2023",
        "date": "2023-07-24",
        "lat": 36.954, "lon": 8.758,
        "label": 1,
    },
    {
        "name": "Inondations de Sousse — Oct 2018",
        "date": "2018-10-12",
        "lat": 35.8245, "lon": 10.6346,
        "label": 1,
    },
    {
        "name": "Inondations de Tunis — Sept 2020",
        "date": "2020-09-22",
        "lat": 36.8065, "lon": 10.1815,
        "label": 1,
    },
    {
        "name": "Feux de Jendouba — Août 2021",
        "date": "2021-08-10",
        "lat": 36.4513, "lon": 8.7857,
        "label": 1,
    },
    {
        "name": "Inondations de Monastir — Sept 2020",
        "date": "2020-09-18",
        "lat": 35.7832, "lon": 10.8262,
        "label": 1,
    },
    # ── Known normal days ────────────────────────────────────────────────
    {
        "name": "Kairouan — Normal Fév 2024",
        "date": "2024-02-10",
        "lat": 35.6781, "lon": 10.0963,
        "label": 0,
    },
    {
        "name": "Tozeur — Normal Mars 2024",
        "date": "2024-03-15",
        "lat": 33.9197, "lon": 8.1335,
        "label": 0,
    },
    {
        "name": "Médenine — Normal Jan 2024",
        "date": "2024-01-20",
        "lat": 33.3540, "lon": 10.5055,
        "label": 0,
    },
    {
        "name": "Sfax — Normal Nov 2023",
        "date": "2023-11-10",
        "lat": 34.7406, "lon": 10.7603,
        "label": 0,
    },
    {
        "name": "Béja — Normal Avr 2024",
        "date": "2024-04-05",
        "lat": 36.7256, "lon": 9.1817,
        "label": 0,
    },
]


# ─────────────────────────────────────────────────────────────────────────────
#  BLIND TEST EVENTS — the model has NEVER seen these
# ─────────────────────────────────────────────────────────────────────────────

BLIND_EVENTS = [
    # ── FLOODS ────────────────────────────────────────────────────────────
    {
        "name": "Inondations de Bizerte — Sept 2024",
        "date": "2024-09-14",
        "type": "flood",
        "lat": 37.2744, "lon": 9.8739,
        "expected_label": 1,
        "description": (
            "Pluies torrentielles de 170mm en 24h. 5 décès confirmés, "
            "centaines d'habitations inondées."
        ),
    },
    {
        "name": "Inondations de Gabès — Oct 2022",
        "date": "2022-10-16",
        "type": "flood",
        "lat": 33.8815, "lon": 10.0982,
        "expected_label": 1,
        "description": "Fortes précipitations dans le sud-est, routes coupées.",
    },
    {
        "name": "Inondations du Cap Bon — Sept 2023",
        "date": "2023-09-17",
        "type": "flood",
        "lat": 36.4513, "lon": 10.7381,
        "expected_label": 1,
        "description": "Crues soudaines, évacuations massives, récoltes détruites.",
    },
    # ── WILDFIRES ─────────────────────────────────────────────────────────
    {
        "name": "Incendies de Siliana — Août 2024",
        "date": "2024-08-12",
        "type": "wildfire",
        "lat": 36.0833, "lon": 9.3750,
        "expected_label": 1,
        "description": "Plus de 300 hectares de forêts brûlés.",
    },
    {
        "name": "Incendies du Kef — Juil 2023",
        "date": "2023-07-22",
        "type": "wildfire",
        "lat": 36.1667, "lon": 8.8000,
        "expected_label": 1,
        "description": "Feux de forêt dans les pinèdes, sécheresse sévère.",
    },
    # ── NORMAL CONTROLS ──────────────────────────────────────────────────
    {
        "name": "Sfax — Normal Fév 2024",
        "date": "2024-02-15",
        "type": "normal",
        "lat": 34.7406, "lon": 10.7603,
        "expected_label": 0,
        "description": "Aucun événement — conditions calmes.",
    },
    {
        "name": "Monastir — Normal Avr 2024",
        "date": "2024-04-10",
        "type": "normal",
        "lat": 35.7832, "lon": 10.8262,
        "expected_label": 0,
        "description": "Aucun événement — printemps stable.",
    },
    {
        "name": "Tunis — Normal Mars 2024",
        "date": "2024-03-20",
        "type": "normal",
        "lat": 36.8065, "lon": 10.1815,
        "expected_label": 0,
        "description": "Aucun événement — conditions standard.",
    },
]


# ─────────────────────────────────────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def print_header(title: str):
    w = 74
    print("\n" + "=" * w)
    print(f"  {title}")
    print("=" * w)


def extract_features(gee: GEEDataAcquisition, date: str,
                     lat: float, lon: float, name: str) -> dict:
    """Extract real GEE features for one event, with error handling."""
    print(f"     Extraction GEE pour : {name}...")
    try:
        features = gee.get_features_for_event(
            date=date, lat=lat, lon=lon
        )
        if not features:
            print(f"     ⚠️  GEE n'a retourné aucune donnée")
            return None

        # Show key values
        key_vals = []
        for k in ['chirps_7d_sum', 'vv_change', 'water_extent', 'MaxFRP']:
            v = features.get(k)
            if v is not None:
                key_vals.append(f"{k}={v:.2f}")
        print(f"     → {', '.join(key_vals)}")
        return features

    except Exception as e:
        print(f"     ⚠️  Erreur GEE : {e}")
        return None


def print_event_result(event: dict, prediction: int, probability: float,
                       features: dict):
    """Pretty-print result for one blind event."""
    expected = event["expected_label"]
    correct = (prediction == expected)
    icon = "✅" if correct else "❌"
    pred_label = "CATASTROPHE" if prediction == 1 else "NORMAL"
    exp_label = "CATASTROPHE" if expected == 1 else "NORMAL"

    print(f"\n  {icon} {event['name']}")
    print(f"     Date       : {event['date']}")
    print(f"     Coord.     : {event['lat']:.4f}°N, {event['lon']:.4f}°E")
    print(f"     Type       : {event['type'].upper()}")
    print(f"     Attendu    : {exp_label}")
    print(f"     Prédit     : {pred_label}  (confiance: {probability:.1%})")
    print(f"     {event['description']}")

    # Key features from GEE
    print(f"     ── Features réelles GEE ──")
    for feat in ['chirps_7d_sum', 'chirps_1d', 'vv_change',
                 'water_anomaly', 'water_extent', 'precipitation',
                 'MaxFRP', 'FireMask']:
        val = features.get(feat)
        if val is not None:
            flag = ""
            if feat == "MaxFRP" and val > RISK_THRESHOLDS['wildfire']['T21']:
                flag = " ⚠️  (> seuil feu)"
            elif feat == "water_extent" and val > RISK_THRESHOLDS['flood']['water_extent']:
                flag = " ⚠️  (> seuil inondation)"
            elif feat == "precipitation" and val > RISK_THRESHOLDS['flood']['precipitation']:
                flag = " ⚠️  (> seuil précip.)"
            print(f"       {feat:20s}: {val:>10.4f}{flag}")

    return correct


# ─────────────────────────────────────────────────────────────────────────────
#  MAIN
# ─────────────────────────────────────────────────────────────────────────────

def main():
    print_header("BLIND TEST — DONNÉES SATELLITAIRES RÉELLES (GEE)")
    print(f"  Date d'exécution : {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"  Événements train : {len(TRAIN_EVENTS)}")
    print(f"  Événements blind : {len(BLIND_EVENTS)}")
    n_dis = sum(1 for e in BLIND_EVENTS if e['expected_label'] == 1)
    n_nor = sum(1 for e in BLIND_EVENTS if e['expected_label'] == 0)
    print(f"    - Catastrophes : {n_dis}")
    print(f"    - Normaux      : {n_nor}")

    # ── 1. Initialize GEE ────────────────────────────────────────────────
    print_header("PHASE 1 : CONNEXION À GOOGLE EARTH ENGINE")
    try:
        gee = GEEDataAcquisition()
        print("  ✅ GEE initialisé avec succès")
    except Exception as e:
        print(f"  ❌ Impossible de se connecter à GEE : {e}")
        sys.exit(1)

    # ── 2. Extract TRAINING features from GEE ────────────────────────────
    print_header("PHASE 2 : EXTRACTION DES FEATURES D'ENTRAÎNEMENT (GEE)")
    print(f"  Extraction de {len(TRAIN_EVENTS)} événements connus...\n")

    train_rows = []
    train_labels = []
    failed_train = []

    for i, ev in enumerate(TRAIN_EVENTS, 1):
        print(f"  [{i}/{len(TRAIN_EVENTS)}]", end="")
        features = extract_features(gee, ev["date"], ev["lat"], ev["lon"],
                                    ev["name"])
        if features:
            train_rows.append(features)
            train_labels.append(ev["label"])
        else:
            failed_train.append(ev["name"])

    if len(train_rows) < 4:
        print(f"\n  ❌ Pas assez de données d'entraînement ({len(train_rows)}/10)")
        print(f"     Événements échoués : {failed_train}")
        sys.exit(1)

    print(f"\n  ✅ {len(train_rows)}/{len(TRAIN_EVENTS)} événements extraits")
    if failed_train:
        print(f"  ⚠️  Échoués : {', '.join(failed_train)}")

    # Build training DataFrame
    df_train = pd.DataFrame(train_rows)
    labels = np.array(train_labels)

    n_pos = labels.sum()
    n_neg = len(labels) - n_pos
    print(f"  Échantillons : {len(df_train)} ({n_pos} catastrophes, {n_neg} normaux)")
    print(f"  Colonnes     : {list(df_train.columns)}")

    # ── 3. Train model ───────────────────────────────────────────────────
    print_header("PHASE 3 : ENTRAÎNEMENT DU MODÈLE")

    model = DisasterRiskModel()

    # Override create_labels to use our known labels
    model.create_labels = lambda d, _l=labels: pd.Series(
        _l[:len(d)], index=d.index
    )

    metrics = model.train(df_train, test_size=0.3, use_smote=False)

    print(f"\n  Métriques d'entraînement :")
    for k in ("accuracy", "precision", "recall", "f1_score", "roc_auc"):
        v = metrics.get(k)
        if v is not None:
            print(f"    {k:20s}: {v:.3f}")

    # Training accuracy for overfit check
    from sklearn.metrics import accuracy_score
    train_pred, _ = model.predict(df_train)
    train_acc = accuracy_score(labels, train_pred)
    test_acc = metrics.get("accuracy", 0)
    overfit_gap = train_acc - test_acc
    print(f"    {'train_accuracy':20s}: {train_acc:.3f}")
    print(f"    {'overfit_gap':20s}: {overfit_gap:+.3f}")

    # ── 4. BLIND TEST — extract & predict unseen events ──────────────────
    print_header("PHASE 4 : TEST BLIND SUR ÉVÉNEMENTS INÉDITS (GEE RÉEL)")
    print(f"  Extraction + prédiction de {len(BLIND_EVENTS)} événements...\n")

    results = []

    for i, event in enumerate(BLIND_EVENTS, 1):
        print(f"  [{i}/{len(BLIND_EVENTS)}]", end="")
        features = extract_features(gee, event["date"], event["lat"],
                                    event["lon"], event["name"])
        if not features:
            print(f"     → Ignoré (pas de données GEE)")
            continue

        # Predict
        df = pd.DataFrame([features])
        try:
            prediction, probability = model.predict(df)
            pred = prediction[0]
            prob = probability[0]
        except Exception as e:
            print(f"     ⚠️  Erreur de prédiction : {e}")
            continue

        correct = print_event_result(event, pred, prob, features)
        results.append({
            "name": event["name"],
            "type": event["type"],
            "date": event["date"],
            "expected": event["expected_label"],
            "predicted": pred,
            "probability": prob,
            "correct": correct,
            "features": features,
        })

    # ── 5. Results ───────────────────────────────────────────────────────
    if not results:
        print("\n  ❌ Aucun résultat — vérifiez la connexion GEE.")
        sys.exit(1)

    print_header("RÉSULTATS FINAUX DU BLIND TEST")

    total = len(results)
    correct_count = sum(1 for r in results if r["correct"])
    accuracy = correct_count / total

    disaster_results = [r for r in results if r["expected"] == 1]
    normal_results = [r for r in results if r["expected"] == 0]

    det_ok = sum(1 for r in disaster_results if r["correct"])
    det_total = len(disaster_results)

    fp_count = sum(1 for r in normal_results if r["predicted"] == 1)
    fp_total = len(normal_results)

    print(f"\n  GLOBAL")
    print(f"    Score global     : {correct_count}/{total} ({accuracy:.0%})")

    if det_total > 0:
        print(f"\n  DÉTECTION (catastrophes confirmées)")
        print(f"    Détectées        : {det_ok}/{det_total} ({det_ok/det_total:.0%})")
        for r in disaster_results:
            icon = "✅" if r["correct"] else "❌"
            print(f"      {icon} {r['name']:45s} conf={r['probability']:.1%}")

    if fp_total > 0:
        print(f"\n  FAUX POSITIFS (jours normaux)")
        print(f"    Fausses alertes  : {fp_count}/{fp_total} ({fp_count/fp_total:.0%})")
        for r in normal_results:
            icon = "✅" if r["correct"] else "❌"
            print(f"      {icon} {r['name']:45s} conf={r['probability']:.1%}")

    # By disaster type
    print(f"\n  PAR TYPE DE CATASTROPHE")
    for dtype in ["flood", "wildfire"]:
        subset = [r for r in disaster_results if r["type"] == dtype]
        if subset:
            ok = sum(1 for r in subset if r["correct"])
            avg_prob = np.mean([r["probability"] for r in subset])
            print(f"    {dtype:12s}: {ok}/{len(subset)} détectés "
                  f"(confiance moy. {avg_prob:.1%})")

    # ── GENERALIZATION SUMMARY ───────────────────────────────────────────
    print(f"\n  GÉNÉRALISATION")
    print(f"    Accuracy entraînement : {train_acc:.1%}")
    print(f"    Accuracy test interne : {test_acc:.1%}")
    print(f"    Écart surapprentissage: {overfit_gap:+.1%}")
    print(f"    Accuracy blind test   : {accuracy:.0%}")

    # ── VERDICT ───────────────────────────────────────────────────────────
    print(f"\n  {'─' * 50}")
    if det_total > 0 and fp_total > 0:
        detection_rate = det_ok / det_total
        fp_rate = fp_count / fp_total

        if detection_rate >= 0.80 and fp_rate <= 0.20:
            verdict = "✅ PASS"
            detail = "Le modèle généralise bien sur des catastrophes inédites"
        elif detection_rate >= 0.60:
            verdict = "⚠️  ACCEPTABLE"
            detail = "Performance correcte mais améliorable"
        else:
            verdict = "❌ ÉCHEC"
            detail = "Le modèle ne généralise pas — probable surapprentissage"

        print(f"  VERDICT          : {verdict}")
        print(f"  Taux détection   : {detection_rate:.0%} (objectif ≥ 80%)")
        print(f"  Taux FP          : {fp_rate:.0%} (objectif ≤ 20%)")
        print(f"  {detail}")

    print("=" * 74 + "\n")

    return accuracy >= 0.70


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
