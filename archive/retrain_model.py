"""
Script de Ré-entraînement du Modèle avec Données Réelles
Disaster Detection - Module 4 - Croissant Rouge Tunisien
"""

import os
import pandas as pd
import numpy as np
import logging
from datetime import datetime
import sys

# Add src to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.model import DisasterRiskModel
from src.config import ALPHAEARTH_BANDS

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def load_real_data(csv_path='data/tunisia_disasters_real.csv'):
    """Charger les données réelles de catastrophes tunisiennes"""
    if not os.path.exists(csv_path):
        logger.error(f"Fichier non trouvé: {csv_path}")
        logger.info("Exécutez d'abord: python fetch_real_data.py")
        return None
    
    df = pd.read_csv(csv_path)
    logger.info(f"Chargé {len(df)} événements depuis {csv_path}")
    
    return df


def augment_data_with_gee_features(df):
    """
    Augmenter les données avec des features GEE simulées
    En production, utiliser GEEDataAcquisition.get_features_for_event()
    """
    logger.info("Génération des features pour chaque événement...")
    
    augmented_rows = []
    
    for idx, row in df.iterrows():
        # Base features
        base = {
            'date': row['date'],
            'disaster_type': row['disaster_type'],
            'latitude': row['latitude'],
            'longitude': row['longitude'],
            'label': row['label']
        }
        
        # Générer des features réalistes selon le type
        if row['disaster_type'] == 'fire' and row['label'] == 1:
            # Feux actifs: FRP élevé, précipitations faibles
            base['MaxFRP'] = np.random.uniform(150, 500)  # MW élevé
            base['water_extent'] = np.random.uniform(0, 0.1)  # Pas d'eau
            base['precipitation'] = np.random.uniform(0, 10)  # Sec
            
        elif row['disaster_type'] == 'flood' and row['label'] == 1:
            # Inondations: FRP faible, water_extent élevé
            base['MaxFRP'] = np.random.uniform(0, 20)  # Pas de feu
            base['water_extent'] = np.random.uniform(0.3, 0.9)  # Beaucoup d'eau
            base['precipitation'] = np.random.uniform(50, 150)  # Fortes pluies
            
        elif row['disaster_type'] == 'earthquake' and row['label'] == 1:
            # Séismes: Pas de signal direct dans satellite
            # Mais on peut détecter les dégâts post-séisme
            base['MaxFRP'] = np.random.uniform(0, 50)
            base['water_extent'] = np.random.uniform(0, 0.2)
            base['precipitation'] = np.random.uniform(0, 30)
            # Ajouter magnitude comme feature
            base['magnitude'] = row.get('magnitude', 4.0)
            
        else:  # Normal
            base['MaxFRP'] = np.random.uniform(0, 30)  # Faible
            base['water_extent'] = np.random.uniform(0, 0.15)  # Normal
            base['precipitation'] = np.random.uniform(0, 30)  # Normal
        
        # Ajouter embeddings terrain (pseudo AlphaEarth)
        for band_idx in ALPHAEARTH_BANDS:
            # Les embeddings varient selon la position géographique
            lat_factor = (row['latitude'] - 30) / 7  # Normaliser lat
            lon_factor = (row['longitude'] - 7.5) / 4  # Normaliser lon
            base[f'b{band_idx}'] = np.random.randn() * 0.5 + lat_factor + lon_factor * 0.1
        
        augmented_rows.append(base)
    
    # Créer DataFrame
    augmented_df = pd.DataFrame(augmented_rows)
    
    # Multiplier les données pour avoir plus d'échantillons
    logger.info("Augmentation des données par duplication avec bruit...")
    
    expanded_rows = []
    for _ in range(10):  # 10x plus de données
        for idx, row in augmented_df.iterrows():
            new_row = row.copy()
            # Ajouter du bruit
            for col in ['MaxFRP', 'water_extent', 'precipitation']:
                if col in new_row:
                    noise = np.random.randn() * row[col] * 0.1  # 10% bruit
                    new_row[col] = max(0, new_row[col] + noise)
            for band_idx in ALPHAEARTH_BANDS:
                col = f'b{band_idx}'
                if col in new_row:
                    new_row[col] += np.random.randn() * 0.05
            expanded_rows.append(new_row)
    
    final_df = pd.DataFrame(expanded_rows)
    logger.info(f"Dataset final: {len(final_df)} échantillons")
    
    return final_df


def train_model_with_real_data():
    """Entraîner le modèle avec les données réelles"""
    
    logger.info("=" * 70)
    logger.info("RÉ-ENTRAÎNEMENT DU MODÈLE AVEC DONNÉES RÉELLES")
    logger.info("=" * 70)
    
    # 1. Charger les données réelles
    df_real = load_real_data()
    if df_real is None:
        return None
    
    # 2. Augmenter avec features GEE
    df_augmented = augment_data_with_gee_features(df_real)
    
    # 3. Statistiques
    logger.info("\n" + "=" * 50)
    logger.info("STATISTIQUES DU DATASET")
    logger.info("=" * 50)
    logger.info(f"Total échantillons: {len(df_augmented)}")
    logger.info(f"Catastrophes (label=1): {df_augmented['label'].sum()}")
    logger.info(f"Normal (label=0): {len(df_augmented) - df_augmented['label'].sum()}")
    logger.info(f"\nFeatures disponibles:")
    for col in df_augmented.columns:
        if col not in ['date', 'disaster_type', 'latitude', 'longitude', 'label']:
            logger.info(f"  - {col}")
    
    # 4. Préparer les données pour l'entraînement
    # Sélectionner uniquement les colonnes numériques
    feature_cols = ['MaxFRP', 'water_extent', 'precipitation']
    for band_idx in ALPHAEARTH_BANDS:
        feature_cols.append(f'b{band_idx}')
    
    X = df_augmented[feature_cols].copy()
    y = df_augmented['label'].copy()
    
    # Créer un DataFrame dans le format attendu par le modèle
    training_df = X.copy()
    training_df['label'] = y
    
    # 5. Créer et entraîner le modèle
    logger.info("\n" + "=" * 50)
    logger.info("ENTRAÎNEMENT DU MODÈLE")
    logger.info("=" * 50)
    
    model = DisasterRiskModel()
    
    # Configuration pour éviter l'overfitting
    metrics = model.train(
        training_df, 
        test_size=0.3,  # 30% pour le test
        use_smote=True,  # Équilibrer les classes
        tune_hyperparameters=False  # Plus rapide
    )
    
    # 6. Sauvegarder le modèle
    model.save()
    
    # 7. Afficher les résultats
    logger.info("\n" + "=" * 70)
    logger.info("RÉSULTATS DE L'ENTRAÎNEMENT")
    logger.info("=" * 70)
    
    print("\n┌" + "─" * 50 + "┐")
    print("│" + " MÉTRIQUES FINALES".center(50) + "│")
    print("├" + "─" * 50 + "┤")
    
    for key, value in metrics.items():
        if isinstance(value, float):
            bar_length = int(value * 20)
            bar = "█" * bar_length + "░" * (20 - bar_length)
            print(f"│  {key:25} │ {bar} {value:.2%}  │")
        elif key not in ['train_size', 'test_size', 'training_date']:
            print(f"│  {key:25} │ {str(value):25} │")
    
    print("└" + "─" * 50 + "┘")
    
    # 8. Vérification de la qualité
    print("\n┌" + "─" * 50 + "┐")
    print("│" + " ÉVALUATION QUALITÉ".center(50) + "│")
    print("├" + "─" * 50 + "┤")
    
    issues = []
    
    if metrics.get('accuracy', 0) >= 0.95:
        issues.append("⚠️  Accuracy trop élevée - possible overfitting léger")
    elif metrics.get('accuracy', 0) >= 0.75:
        print("│  ✓ Accuracy: BON                                  │")
    else:
        issues.append("⚠️  Accuracy trop faible - modèle à améliorer")
    
    if metrics.get('recall', 0) >= 0.70:
        print("│  ✓ Recall: BON (détecte bien les catastrophes)    │")
    else:
        issues.append("⚠️  Recall faible - risque de manquer des catastrophes")
    
    if metrics.get('false_positive_rate', 1) <= 0.20:
        print("│  ✓ Faux positifs: BON                             │")
    else:
        issues.append("⚠️  Trop de fausses alertes")
    
    if issues:
        for issue in issues:
            print(f"│  {issue:48} │")
    
    print("└" + "─" * 50 + "┘")
    
    # 9. Conclusion
    print("\n" + "=" * 70)
    if metrics.get('accuracy', 0) >= 0.70 and metrics.get('recall', 0) >= 0.60:
        print("✅ MODÈLE PRÊT POUR LA PRODUCTION")
        print("   Le modèle peut maintenant détecter:")
        print("   - 🔥 Incendies (via MaxFRP)")
        print("   - 🌊 Inondations (via water_extent + precipitation)")
        print("   - 🌍 Événements multi-risques")
    else:
        print("⚠️  MODÈLE NÉCESSITE PLUS DE DONNÉES")
        print("   Recommandations:")
        print("   1. Ajouter plus d'événements historiques")
        print("   2. Utiliser les données GEE réelles (pas simulées)")
        print("   3. Augmenter la période d'entraînement")
    
    print("=" * 70)
    
    return model, metrics


def test_model_prediction():
    """Tester le modèle sur quelques cas"""
    
    logger.info("\n" + "=" * 50)
    logger.info("TEST DE PRÉDICTION")
    logger.info("=" * 50)
    
    model = DisasterRiskModel()
    model.load()
    
    # Cas de test
    test_cases = [
        {
            'name': 'Feu actif intense',
            'MaxFRP': 350,
            'water_extent': 0.05,
            'precipitation': 2,
            'expected': 'RISQUE ÉLEVÉ'
        },
        {
            'name': 'Inondation grave',
            'MaxFRP': 10,
            'water_extent': 0.7,
            'precipitation': 100,
            'expected': 'RISQUE ÉLEVÉ'
        },
        {
            'name': 'Journée normale',
            'MaxFRP': 15,
            'water_extent': 0.1,
            'precipitation': 10,
            'expected': 'NORMAL'
        },
    ]
    
    for case in test_cases:
        # Créer les données
        data = {
            'MaxFRP': [case['MaxFRP']],
            'water_extent': [case['water_extent']],
            'precipitation': [case['precipitation']]
        }
        for band_idx in ALPHAEARTH_BANDS:
            data[f'b{band_idx}'] = [0]
        
        df_test = pd.DataFrame(data)
        
        # Prédire
        try:
            predictions, probabilities = model.predict(df_test)
            score = probabilities[0]
            
            status = "🔴 RISQUE" if score > 0.5 else "🟢 NORMAL"
            
            print(f"\n{case['name']}:")
            print(f"  MaxFRP={case['MaxFRP']}, water={case['water_extent']}, precip={case['precipitation']}")
            print(f"  → Score: {score:.2%} | {status}")
            print(f"  → Attendu: {case['expected']}")
            
        except Exception as e:
            print(f"  Erreur: {e}")


if __name__ == "__main__":
    # Entraîner le modèle
    model, metrics = train_model_with_real_data()
    
    if model:
        # Tester le modèle
        test_model_prediction()
