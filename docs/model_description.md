# Description du Modèle de Détection de Catastrophes Naturelles en Tunisie

## 1. Vue d'ensemble

La plateforme de détection de catastrophes naturelles en Tunisie est un système de surveillance en temps quasi-réel qui combine l'observation satellitaire multi-capteurs et l'apprentissage automatique ensembliste pour détecter et classifier les risques naturels — incendies de forêt, inondations, séismes, conditions météorologiques extrêmes — sur l'ensemble des 24 gouvernorats tunisiens. Le système couvre la zone géographique délimitée par les coordonnées **[7.5°E, 30.2°N]** à **[11.5°E, 37.3°N]**.

L'application est conteneurisée via **Docker** (Python 3.11-slim, build multi-stage) et expose une **API REST** via **FastAPI** (port 8000) ainsi que des tableaux de bord interactifs **Streamlit**. L'authentification auprès de Google Earth Engine (GEE) est assurée par un compte de service dédié.

---

## 2. Pipeline d'Acquisition de Données Satellitaires

Le module `GEEDataAcquisition` (fichier `src/data_acquisition.py`) orchestre l'extraction de données depuis **cinq sources satellitaires** via l'API Google Earth Engine :

| Source | Collection GEE | Résolution | Variable Extraite |
|---|---|---|---|
| **MODIS Active Fire** | `MODIS/061/MOD14A1` | 1 km | MaxFRP (puissance radiative du feu), FireMask |
| **Sentinel-1 SAR** | `COPERNICUS/S1_GRD` | 10 m | Polarisation VV (détection d'eau par seuil −15 dB) |
| **CHIRPS** | `UCSB-CHG/CHIRPS/DAILY` | ~5 km | Précipitations journalières (mm/jour) |
| **Sentinel-2 SR** | `COPERNICUS/S2_SR_HARMONIZED` | 10 m | Bandes B4 (Rouge), B8 (NIR), B11 (SWIR) |
| **Google AlphaEarth** | `GOOGLE/SATELLITE_EMBEDDING/V1/ANNUAL` | Variable | Embeddings fondationnels A00–A09 (10 dimensions) |

### 2.1 Extraction ponctuelle pour événements labélisés

Pour l'entraînement sur des événements historiques labélisés, la méthode `get_features_for_event(date, lat, lon)` calcule des **features basées sur l'anomalie** afin d'obtenir des indicateurs discriminants :

- **`chirps_7d_sum`** : Précipitations cumulées sur 7 jours (mm). Signal fortement discriminant — les événements d'inondation montrent 92–98 mm contre 0–27 mm en temps normal.
- **`chirps_1d`** : Précipitation du jour de l'événement (mm).
- **`vv_change`** : Variation du signal radar Sentinel-1 VV (dB) entre la période de l'événement (±7 jours) et une baseline sèche (30–90 jours antérieurs). Les inondations affichent un changement de +0.7 à +3.3 dB, les incendies de −0.2 à −0.5 dB.
- **`water_anomaly`** : Variation de la fraction d'étendue d'eau entre l'événement et la baseline (seuil VV < −15 dB).
- **`water_extent`** : Fraction d'eau absolue autour de l'événement.
- **`MaxFRP`** / **`FireMask`** : Produit d'incendie actif MODIS Collection 6.1 (maximum spatial dans la zone d'intérêt).
- **`A00`–`A09`** : Embeddings géospatiaux annuels AlphaEarth (10 dimensions) capturant les caractéristiques géographiques du terrain (forêt, urbain, côtier, désert).

Chaque extraction utilise un **buffer de 10 km** autour du point d'intérêt avec la méthode `reduceRegion` (moyenne spatiale, résolution 1 000 m à 5 000 m selon la source) pour pallier la rareté des pixels actifs dans les produits à basse résolution.

### 2.2 Surveillance en temps réel

Pour le monitoring continu, le module crée une **image composite multi-bandes** couvrant toute la Tunisie en combinant les données de toutes les sources, puis échantillonne jusqu'à 5 000 pixels (résolution de 1 km) pour alimenter le modèle de prédiction. Les fenêtres temporelles sont adaptées à chaque type de risque :

| Type de risque | Fenêtre temporelle |
|---|---|
| Incendie de forêt | 12 heures |
| Inondation | 2 jours |
| Précipitation | 1 jour |

---

## 3. Architecture du Modèle d'Apprentissage Automatique

Le modèle `DisasterRiskModel` (fichier `src/model.py`) utilise par défaut un classifieur **Random Forest peu profond**, validé sur des données satellitaires réelles extraites de Google Earth Engine :

| Paramètre | Valeur |
|---|---|
| Algorithme | Random Forest (`sklearn`) |
| Nombre d'arbres | 100 |
| Profondeur maximale | **3** (limitation volontaire pour éviter le surapprentissage) |
| `min_samples_leaf` | 2 |
| `class_weight` | `'balanced'` (pondération automatique des classes) |
| Nombre de features | **8** (6 base + 2 dérivées) |

Ce choix architectural a été **validé empiriquement** sur des événements réels tunisiens (inondations, incendies, conditions normales) avec les résultats suivants : **90% de précision globale, 80% de taux de détection, 0% de faux positifs, et un écart de surapprentissage de seulement +5,2%**.

> **Remarque** : Un mode ensemble (VotingClassifier RF + GBM + XGBoost) est disponible en option (`model_type='ensemble'`) pour des jeux de données plus volumineux (> 50 échantillons labélisés).

### 3.1 Gestion du déséquilibre de classes

Le système intègre la technique **SMOTE** (*Synthetic Minority Over-sampling Technique*) pour rééquilibrer les classes lors de l'entraînement. Les événements de catastrophe étant naturellement rares, SMOTE génère des exemples synthétiques de la classe minoritaire, permettant au modèle d'apprendre des frontières de décision plus précises.

### 3.2 Normalisation

Toutes les features sont normalisées via un `StandardScaler` (centrage-réduction) avant leur passage dans les classificateurs, assurant une contribution équitable de chaque variable indépendamment de son échelle physique.

---

## 4. Ingénierie des Features

À partir des features brutes extraites par le pipeline satellitaire, le module `engineer_features()` génère **deux features dérivées** qui capturent les interactions physiques clés :

| Feature Dérivée | Formule | Interprétation |
|---|---|---|
| `flood_composite` | $\min\left(\frac{\text{chirps\_7d}}{100}, 2\right) \times (1 + \text{vv\_change})$ | Indice composite d'inondation : forte pluie cumulée AND hausse du signal SAR |
| `fire_indicator` | $\left(1 - \min\left(\frac{\text{chirps\_7d}}{50}, 1\right)\right) \times \max(-\text{vv\_change}, 0)$ | Indice de sécheresse + assèchement de surface (risque incendie) |

### 4.1 Sélection des features

Le modèle utilise un total de **8 features** organisées en deux catégories :

1. **Features d'anomalie de base** (6) : `chirps_7d_sum`, `chirps_1d`, `vv_change`, `water_anomaly`, `water_extent`, `precipitation`
2. **Features dérivées** (2) : `flood_composite`, `fire_indicator`

Cette sélection restreinte (8 features au lieu de ~29 dans la version initiale) est le résultat d'un processus de validation rigoureux : les features supplémentaires (AlphaEarth embeddings, Sentinel-2, indices normalisés) n'apportaient pas de gain discriminant sur les événements réels et provoquaient un surapprentissage sévère sur les petits jeux de données labélisés.

### 4.2 Importance des features (validation réelle)

| Feature | Importance | Rôle principal |
|---|---|---|
| `vv_change` | 19.5% | Signal SAR le plus discriminant (inondation vs normal) |
| `water_extent` | 19.0% | Étendue d'eau absolue |
| `chirps_7d_sum` | 13.6% | Précipitations cumulées 7 jours |
| `precipitation` | 13.3% | Précipitation journalière |
| `water_anomaly` | 12.9% | Variation de surface d'eau vs baseline |
| `fire_indicator` | 11.5% | Détection conditions de sécheresse |
| `flood_composite` | 6.3% | Composite pluie × signal SAR |
| `chirps_1d` | 4.0% | Précipitation du jour de l'événement |

---

## 5. Labélisation et Seuils de Risque

Les labels d'entraînement sont créés automatiquement via la méthode `create_labels()` en appliquant des seuils physiques :

| Condition | Seuil | Label |
|---|---|---|
| Puissance radiative (MaxFRP) | > 310 K | Risque élevé (1) |
| Étendue d'eau (water_extent) | > 0.5 | Risque élevé (1) |
| Précipitation (precipitation) | > 50 mm/jour | Risque élevé (1) |
| Aucune condition remplie | — | Risque faible (0) |

Pour l'entraînement supervisé à partir d'événements labélisés, les labels sont assignés directement (`disaster=1` pour les événements catastrophiques connus, `disaster=0` pour les conditions normales).

---

## 6. Entraînement et Évaluation

### 6.1 Protocole d'entraînement

1. **Préparation** : Feature engineering (2 features dérivées) + remplissage des valeurs manquantes (→ 0) + suppression des infinis.
2. **Split** : 70% entraînement / 30% test (stratifié si plusieurs classes).
3. **Rééquilibrage** : SMOTE sur l'ensemble d'entraînement uniquement.
4. **Normalisation** : `StandardScaler` ajusté sur l'entraînement, appliqué au test.
5. **Entraînement** : Fit du Random Forest (max_depth=3, 100 arbres).
6. **Évaluation** : Accuracy, Precision, Recall, F1-Score, ROC-AUC, taux de faux positifs.
7. **Tuning optionnel** : Grid Search CV sur les hyperparamètres (si activé).

### 6.2 Résultats de validation sur données réelles

Le modèle a été validé sur **10 événements test** (5 catastrophes + 5 conditions normales) avec des données satellitaires réelles extraites de GEE :

| Métrique | Résultat | Objectif |
|---|---|---|
| **Accuracy** | **90%** | ≥ 85% ✓ |
| **Taux de détection** | **80%** | ≥ 65% ✓ |
| **Faux positifs** | **0%** | ≤ 15% ✓ |
| **Écart de surapprentissage** | **+5,2%** | < 30% ✓ |

### 6.3 Objectifs de performance

| Métrique | Objectif |
|---|---|
| Accuracy | ≥ 85% |
| Precision | ≥ 80% |
| Recall | ≥ 80% |
| Taux de faux positifs | ≤ 15% |
| Latence d'alerte | ≤ 15 minutes |
| Disponibilité | ≥ 95% |

---

## 7. Architecture Technique

### 7.1 Conteneurisation Docker

Le système est déployé via un **Dockerfile multi-stage** :

- **Stage builder** : Installation des dépendances Python dans un layer isolé.
- **Stage runtime** : Image minimale Python 3.11-slim avec copie des packages. Un utilisateur non-root (`appuser`) est créé pour la sécurité.
- **Health check** : Vérification automatique toutes les 30 secondes via l'endpoint `/status`.

### 7.2 API REST (FastAPI)

Le serveur FastAPI expose les endpoints pour :
- La prédiction de risque en temps réel
- La récupération du statut du modèle
- L'intégration avec le tableau de bord

### 7.3 Interface utilisateur (Streamlit)

Le tableau de bord Streamlit fournit :
- Carte interactive de la Tunisie (Folium) avec les 24 gouvernorats
- Niveaux de risque colorés (rouge = élevé, orange = moyen, vert = faible)
- Support bilingue (العربية / English)
- Alertes en temps réel avec seuils configurables

---

## 8. Système d'Alertes

Le module d'alertes est configurable avec deux niveaux :

| Canal | Seuil de déclenchement |
|---|---|
| **SMS** (Twilio) | Score de risque > 0.8 |
| **Email** (SendGrid) | Score de risque > 0.6 |

Un maximum de **50 alertes par jour** est imposé pour éviter la surcharge.

---

## 9. Résumé du Flux de Données

```
Google Earth Engine (MODIS, Sentinel-1, CHIRPS, Sentinel-2, AlphaEarth)
        │
        ▼
  GEEDataAcquisition  ──►  Image composite multi-bandes
        │                         │
        │                         ▼
        │                   Échantillonnage (5000 pixels, 1km)
        │                         │
        ▼                         ▼
  get_features_for_event()   sample_data()
  (extraction ponctuelle)    (surveillance continue)
        │                         │
        └──────────┬──────────────┘
                   ▼
         Feature Engineering
         (flood_composite, fire_indicator)
                   │
                   ▼
          StandardScaler (normalisation)
                   │
                   ▼
         RandomForest (max_depth=3)
         8 features validées
                   ▼
         Probabilité de risque [0, 1]
                   │
                   ▼
         Alertes (SMS/Email) + Dashboard Streamlit
```

---

## 10. Technologies Utilisées

| Composant | Technologie |
|---|---|
| Langage | Python 3.11 |
| Données satellitaires | Google Earth Engine (API Python) |
| ML | scikit-learn, XGBoost, imbalanced-learn (SMOTE) |
| API Backend | FastAPI + Uvicorn |
| Dashboard | Streamlit + Folium |
| Conteneurisation | Docker (multi-stage build) |
| Alertes | Twilio (SMS), SendGrid (Email) |
| Sérialisation du modèle | joblib (.pkl) |
