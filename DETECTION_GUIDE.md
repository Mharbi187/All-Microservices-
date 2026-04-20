# 🔬 GUIDE : DÉTECTION CORRECTE DES CATASTROPHES
## Module 4 - Nexus-AID - Croissant Rouge Tunisien

---

## 📋 PROBLÈME ACTUEL

Le modèle actuel a **100% d'accuracy** ce qui indique un **OVERFITTING** car :
1. Les données d'entraînement sont simulées (pas réelles)
2. Le modèle a mémorisé les patterns au lieu de les apprendre
3. Il ne généralisera pas bien aux vraies catastrophes

---

## ✅ ÉTAPES POUR UNE DÉTECTION CORRECTE

### ÉTAPE 1 : Obtenir les Données Réelles (EM-DAT)

#### 1.1 Inscription EM-DAT
1. Aller sur : https://public.emdat.be/
2. Cliquer sur "Register" (gratuit pour usage académique)
3. Remplir le formulaire avec votre email universitaire
4. Confirmer l'email

#### 1.2 Télécharger les Données Tunisie
1. Se connecter à EM-DAT
2. Aller dans "Data" → "Country Profile"
3. Sélectionner : Tunisia
4. Période : 2010-2025
5. Types : Flood, Wildfire, Earthquake, Storm
6. Télécharger en Excel

#### 1.3 Format des Données EM-DAT
```csv
Year,Month,Day,DisasterType,DisasterSubType,Country,Location,Latitude,Longitude,TotalDeaths,TotalAffected
2020,9,11,Flood,Riverine flood,Tunisia,Monastir,35.7832,10.8262,6,40000
2023,7,15,Wildfire,Forest fire,Tunisia,Bizerte,37.063,9.048,0,500
...
```

---

### ÉTAPE 2 : Configurer Google Earth Engine

#### 2.1 Créer un Projet Google Cloud
1. Aller sur : https://console.cloud.google.com/
2. Créer un nouveau projet : "nexusaid-disasters"
3. Activer l'API "Earth Engine"

#### 2.2 Créer un Compte de Service
1. IAM & Admin → Service Accounts
2. Créer un compte de service
3. Télécharger la clé JSON
4. Sauvegarder dans : `credentials/gee-service-key.json`

#### 2.3 S'inscrire à Earth Engine
1. Aller sur : https://earthengine.google.com/signup/
2. Utiliser le même compte Google
3. Sélectionner le projet créé
4. Attendre l'approbation (24-48h)

#### 2.4 Configurer .env
```env
GEE_SERVICE_ACCOUNT=nexusaid@nexusaid-disasters.iam.gserviceaccount.com
GEE_PRIVATE_KEY_PATH=./credentials/gee-service-key.json
```

---

### ÉTAPE 3 : Créer le Dataset d'Entraînement

#### 3.1 Script de Préparation des Données

Créer et exécuter ce script :

```python
"""
prepare_training_data.py
Prépare le dataset avec données GEE réelles
"""

import pandas as pd
import os
from datetime import datetime
import time

# Importer après configuration GEE
from src.data_acquisition import GEEDataAcquisition
from src.config import ALPHAEARTH_BANDS

def load_emdat_data(excel_path):
    """Charger les données EM-DAT téléchargées"""
    df = pd.read_excel(excel_path)
    
    # Standardiser les colonnes
    df = df.rename(columns={
        'Year': 'year',
        'Start Month': 'month',
        'Start Day': 'day',
        'Disaster Type': 'disaster_type',
        'Location': 'location',
        'Latitude': 'latitude',
        'Longitude': 'longitude'
    })
    
    # Créer la colonne date
    df['date'] = pd.to_datetime(df[['year', 'month', 'day']])
    
    # Mapper les types
    type_map = {
        'Flood': 'flood',
        'Wildfire': 'fire',
        'Earthquake': 'earthquake',
        'Storm': 'storm'
    }
    df['disaster_type'] = df['disaster_type'].map(type_map)
    
    # Label = 1 pour toutes les catastrophes
    df['label'] = 1
    
    return df

def add_gee_features(df, gee):
    """Ajouter les features satellite réelles"""
    
    features_list = []
    
    for idx, row in df.iterrows():
        print(f"[{idx+1}/{len(df)}] Récupération features pour {row['date']} - {row['location']}")
        
        try:
            # Récupérer les features GEE pour cet événement
            features = gee.get_features_for_event(
                date=row['date'].strftime('%Y-%m-%d'),
                lat=row['latitude'],
                lon=row['longitude']
            )
            
            if features:
                features['date'] = row['date']
                features['disaster_type'] = row['disaster_type']
                features['latitude'] = row['latitude']
                features['longitude'] = row['longitude']
                features['label'] = row['label']
                features_list.append(features)
            else:
                print(f"  ⚠️ Pas de données pour cet événement")
            
            # Pause pour éviter les limites d'API
            time.sleep(1)
            
        except Exception as e:
            print(f"  ❌ Erreur: {e}")
    
    return pd.DataFrame(features_list)

def add_normal_samples(gee, n_samples=100):
    """Ajouter des échantillons normaux (pas de catastrophe)"""
    
    import numpy as np
    from datetime import timedelta
    
    # Points aléatoires en Tunisie à des dates sans catastrophes
    normal_samples = []
    
    # Coordonnées Tunisie
    lat_range = (30.2, 37.5)
    lon_range = (7.5, 11.6)
    
    # Dates sans catastrophes (hiver, printemps)
    normal_dates = pd.date_range('2022-01-01', '2022-03-31', freq='7D')
    
    for date in normal_dates[:n_samples]:
        lat = np.random.uniform(*lat_range)
        lon = np.random.uniform(*lon_range)
        
        try:
            features = gee.get_features_for_event(
                date=date.strftime('%Y-%m-%d'),
                lat=lat,
                lon=lon
            )
            
            if features:
                features['date'] = date
                features['disaster_type'] = 'normal'
                features['latitude'] = lat
                features['longitude'] = lon
                features['label'] = 0  # Pas de catastrophe
                normal_samples.append(features)
            
            time.sleep(0.5)
            
        except Exception as e:
            print(f"Erreur sample normal: {e}")
    
    return pd.DataFrame(normal_samples)

def main():
    print("=" * 60)
    print("PRÉPARATION DU DATASET D'ENTRAÎNEMENT")
    print("=" * 60)
    
    # 1. Initialiser GEE
    print("\n[1/4] Initialisation Google Earth Engine...")
    gee = GEEDataAcquisition()
    
    # 2. Charger données EM-DAT
    print("\n[2/4] Chargement des données EM-DAT...")
    emdat_path = 'data/emdat_tunisia.xlsx'  # Fichier téléchargé
    
    if not os.path.exists(emdat_path):
        print(f"❌ Fichier {emdat_path} non trouvé!")
        print("   Téléchargez les données depuis https://public.emdat.be/")
        return
    
    disasters_df = load_emdat_data(emdat_path)
    print(f"   {len(disasters_df)} catastrophes chargées")
    
    # 3. Ajouter features GEE aux catastrophes
    print("\n[3/4] Récupération des features satellite...")
    disasters_with_features = add_gee_features(disasters_df, gee)
    print(f"   {len(disasters_with_features)} événements avec features")
    
    # 4. Ajouter échantillons normaux
    print("\n[4/4] Ajout d'échantillons normaux...")
    normal_df = add_normal_samples(gee, n_samples=len(disasters_with_features))
    print(f"   {len(normal_df)} échantillons normaux")
    
    # 5. Combiner
    final_df = pd.concat([disasters_with_features, normal_df], ignore_index=True)
    
    # 6. Sauvegarder
    output_path = 'data/training_data_real.csv'
    final_df.to_csv(output_path, index=False)
    
    print("\n" + "=" * 60)
    print("DATASET CRÉÉ AVEC SUCCÈS")
    print("=" * 60)
    print(f"Total: {len(final_df)} échantillons")
    print(f"  - Catastrophes: {len(disasters_with_features)}")
    print(f"  - Normal: {len(normal_df)}")
    print(f"Sauvegardé: {output_path}")

if __name__ == "__main__":
    main()
```

---

### ÉTAPE 4 : Entraîner le Modèle Correctement

#### 4.1 Script d'Entraînement Amélioré

```python
"""
train_production_model.py
Entraîne le modèle avec les données réelles
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
import logging

from src.model import DisasterRiskModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def train_production_model():
    # 1. Charger les données réelles
    df = pd.read_csv('data/training_data_real.csv')
    
    logger.info(f"Dataset: {len(df)} échantillons")
    logger.info(f"Distribution: {df['label'].value_counts().to_dict()}")
    
    # 2. Créer le modèle
    model = DisasterRiskModel()
    
    # 3. Entraîner avec validation croisée d'abord
    logger.info("Validation croisée...")
    cv_results = model.cross_validate(df, cv=5)
    
    logger.info(f"CV Accuracy: {cv_results['mean_accuracy']:.2%} (+/- {cv_results['std_accuracy']:.2%})")
    
    # 4. Si CV OK, entraîner le modèle final
    if cv_results['mean_accuracy'] >= 0.75:
        logger.info("Entraînement du modèle final...")
        metrics = model.train(
            df,
            test_size=0.25,
            use_smote=True,
            tune_hyperparameters=True  # Optimiser les hyperparamètres
        )
        
        # 5. Vérifier les métriques
        logger.info("\n=== MÉTRIQUES FINALES ===")
        logger.info(f"Accuracy: {metrics['accuracy']:.2%}")
        logger.info(f"Precision: {metrics['precision']:.2%}")
        logger.info(f"Recall: {metrics['recall']:.2%}")
        logger.info(f"F1-Score: {metrics['f1_score']:.2%}")
        logger.info(f"Faux Positifs: {metrics['false_positive_rate']:.2%}")
        
        # 6. Vérification anti-overfitting
        if metrics['accuracy'] < 0.99:
            logger.info("✅ Modèle semble correct (pas d'overfitting)")
            model.save()
            logger.info("Modèle sauvegardé!")
        else:
            logger.warning("⚠️ Accuracy trop élevée - possible overfitting")
            logger.warning("   Solution: Ajouter plus de données variées")
    else:
        logger.error("❌ Performance insuffisante en validation croisée")
        logger.error("   Solution: Améliorer les features ou ajouter des données")

if __name__ == "__main__":
    train_production_model()
```

---

### ÉTAPE 5 : Valider le Modèle

#### 5.1 Tests de Validation

```python
"""
validate_model.py
Valide le modèle sur des cas réels
"""

import pandas as pd
from src.model import DisasterRiskModel
from src.config import ALPHAEARTH_BANDS

def validate_model():
    model = DisasterRiskModel()
    model.load()
    
    print("=" * 60)
    print("VALIDATION DU MODÈLE")
    print("=" * 60)
    
    # Cas de test réalistes
    test_cases = [
        {
            'name': 'Feu actif intense (doit détecter)',
            'MaxFRP': 350,
            'water_extent': 0.05,
            'precipitation': 2,
            'expected_risk': True
        },
        {
            'name': 'Inondation grave (doit détecter)',
            'MaxFRP': 10,
            'water_extent': 0.7,
            'precipitation': 100,
            'expected_risk': True
        },
        {
            'name': 'Pluie forte sans inondation',
            'MaxFRP': 5,
            'water_extent': 0.2,
            'precipitation': 60,
            'expected_risk': True  # Risque potentiel
        },
        {
            'name': 'Journée normale été (ne doit pas alerter)',
            'MaxFRP': 15,
            'water_extent': 0.05,
            'precipitation': 0,
            'expected_risk': False
        },
        {
            'name': 'Journée normale hiver (ne doit pas alerter)',
            'MaxFRP': 5,
            'water_extent': 0.1,
            'precipitation': 20,
            'expected_risk': False
        },
    ]
    
    success_count = 0
    
    for case in test_cases:
        # Préparer les données
        data = {
            'MaxFRP': [case['MaxFRP']],
            'water_extent': [case['water_extent']],
            'precipitation': [case['precipitation']]
        }
        for band_idx in ALPHAEARTH_BANDS:
            data[f'b{band_idx}'] = [0]
        
        df_test = pd.DataFrame(data)
        
        # Prédire
        predictions, probabilities = model.predict(df_test)
        score = probabilities[0]
        detected_risk = score > 0.5
        
        # Vérifier
        correct = (detected_risk == case['expected_risk'])
        status = "✅" if correct else "❌"
        
        print(f"\n{status} {case['name']}")
        print(f"   Score: {score:.2%}")
        print(f"   Détecté: {'RISQUE' if detected_risk else 'NORMAL'}")
        print(f"   Attendu: {'RISQUE' if case['expected_risk'] else 'NORMAL'}")
        
        if correct:
            success_count += 1
    
    print("\n" + "=" * 60)
    print(f"RÉSULTAT: {success_count}/{len(test_cases)} tests passés")
    
    if success_count == len(test_cases):
        print("✅ Le modèle fonctionne correctement!")
    else:
        print("⚠️ Le modèle nécessite des ajustements")
    
    print("=" * 60)

if __name__ == "__main__":
    validate_model()
```

---

### ÉTAPE 6 : Configurer les Seuils d'Alerte

#### 6.1 Modifier les seuils dans `config.py`

```python
# Seuils de risque (à ajuster selon les tests)
RISK_THRESHOLDS = {
    'wildfire': {
        'T21': 320,           # Température minimale pour feu actif (K)
        'MaxFRP': 50,         # Puissance radiative min (MW)
    },
    'flood': {
        'water_extent': 0.25, # 25% de surface couverte d'eau
        'precipitation': 40,   # mm/jour
    },
    'combined': {
        'alert_threshold': 0.5,   # Score pour alerte JAUNE
        'warning_threshold': 0.7,  # Score pour alerte ORANGE
        'critical_threshold': 0.85 # Score pour alerte ROUGE
    }
}

# Niveaux d'alerte
ALERT_LEVELS = {
    'GREEN': (0, 0.5),
    'YELLOW': (0.5, 0.7),
    'ORANGE': (0.7, 0.85),
    'RED': (0.85, 1.0)
}
```

---

## 📊 RÉSUMÉ DES ACTIONS

| # | Action | Temps Estimé | Priorité |
|---|--------|--------------|----------|
| 1 | Inscription EM-DAT | 10 min | 🔴 |
| 2 | Télécharger données Tunisie | 5 min | 🔴 |
| 3 | Configurer GEE | 30 min + 24h approbation | 🔴 |
| 4 | Exécuter `prepare_training_data.py` | 1-2 heures | 🔴 |
| 5 | Exécuter `train_production_model.py` | 10-30 min | 🔴 |
| 6 | Valider avec `validate_model.py` | 5 min | 🔴 |
| 7 | Ajuster les seuils si nécessaire | 15 min | 🟠 |

---

## ⚡ COMMANDES RAPIDES

```bash
# 1. Préparer les données (après avoir téléchargé EM-DAT)
python prepare_training_data.py

# 2. Entraîner le modèle
python train_production_model.py

# 3. Valider
python validate_model.py

# 4. Tester en temps réel
python -m streamlit run app.py
```

---

## 🎯 OBJECTIFS DE PERFORMANCE

| Métrique | Minimum | Cible | Maximum |
|----------|---------|-------|---------|
| Accuracy | 75% | 85% | 95% |
| Recall | 80% | 90% | - |
| Precision | 70% | 80% | - |
| Faux Positifs | - | 10% | 20% |

**Important :** Un modèle à 85% d'accuracy est MEILLEUR qu'un modèle à 100% qui fait de l'overfitting !

---

## 📞 CHECKLIST FINALE

- [ ] Compte EM-DAT créé
- [ ] Données Tunisie téléchargées (Excel)
- [ ] Projet Google Cloud créé
- [ ] API Earth Engine activée
- [ ] Compte de service avec clé JSON
- [ ] `.env` configuré correctement
- [ ] GEE approuvé et fonctionnel
- [ ] `prepare_training_data.py` exécuté
- [ ] `train_production_model.py` exécuté
- [ ] Accuracy entre 75% et 95%
- [ ] Tests de validation passent
- [ ] Dashboard fonctionne
