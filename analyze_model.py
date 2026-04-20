"""
Script d'analyse du modèle de détection de catastrophes
"""
import joblib
import os
import json

model_path = 'd:/Dev Projects/PFE/Distaster Detection/data/models/disaster_model.pkl'

print("=" * 60)
print("ANALYSE DU MODELE DE DETECTION DE CATASTROPHES")
print("=" * 60)

try:
    model_data = joblib.load(model_path)
    
    print("\n[1] CONTENU DU MODELE")
    print("-" * 40)
    for key in model_data.keys():
        print(f"  - {key}")
    
    print("\n[2] METRIQUES D'ENTRAINEMENT")
    print("-" * 40)
    metrics = model_data.get('training_metrics', {})
    if metrics:
        for k, v in metrics.items():
            if isinstance(v, float):
                print(f"  {k}: {v:.4f}")
            else:
                print(f"  {k}: {v}")
    else:
        print("  AUCUNE METRIQUE - Le modele n'a peut-etre pas ete entraine correctement!")
    
    print("\n[3] FEATURES UTILISEES")
    print("-" * 40)
    features = model_data.get('feature_names', [])
    print(f"  Nombre total: {len(features)}")
    for i, f in enumerate(features):
        print(f"    {i+1}. {f}")
    
    print("\n[4] TYPE DE MODELE")
    print("-" * 40)
    model = model_data.get('model')
    if model:
        print(f"  Type: {type(model).__name__}")
        if hasattr(model, 'estimators_'):
            print(f"  Nombre d'estimateurs: {len(model.estimators_)}")
            for name, est in model.estimators_:
                print(f"    - {name}: {type(est).__name__}")
    
    print("\n[5] SCALER")
    print("-" * 40)
    scaler = model_data.get('scaler')
    if scaler and hasattr(scaler, 'mean_'):
        print(f"  Type: {type(scaler).__name__}")
        print(f"  Nombre de features: {len(scaler.mean_)}")
    else:
        print("  Scaler non entraine ou absent!")
    
    print("\n[6] EVALUATION QUALITATIVE")
    print("-" * 40)
    
    # Verifier la qualite
    issues = []
    
    if not metrics:
        issues.append("CRITIQUE: Pas de metriques d'entrainement")
    else:
        acc = metrics.get('accuracy', 0)
        if acc < 0.7:
            issues.append(f"ATTENTION: Accuracy faible ({acc:.2%})")
        
        recall = metrics.get('recall', 0)
        if recall < 0.5:
            issues.append(f"ATTENTION: Recall faible ({recall:.2%}) - risque de manquer des catastrophes")
        
        train_size = metrics.get('train_size', 0)
        if train_size < 1000:
            issues.append(f"ATTENTION: Peu de donnees d'entrainement ({train_size} echantillons)")
    
    if not features:
        issues.append("CRITIQUE: Pas de features definies")
    
    if issues:
        print("  PROBLEMES DETECTES:")
        for issue in issues:
            print(f"    - {issue}")
    else:
        print("  Le modele semble correctement configure")
    
    print("\n" + "=" * 60)
    print("CONCLUSION")
    print("=" * 60)
    
    if metrics and metrics.get('accuracy', 0) > 0.7:
        print("\n  ✓ Le modele EST CAPABLE de detecter des catastrophes")
        print(f"  - Precision: {metrics.get('accuracy', 0):.2%}")
        print(f"  - Rappel: {metrics.get('recall', 0):.2%}")
    elif metrics:
        print("\n  ⚠ Le modele a ete entraine mais ses performances sont LIMITEES")
        print("  - Recommandation: Re-entrainer avec plus de donnees")
    else:
        print("\n  ✗ Le modele N'A PAS ETE correctement entraine")
        print("  - Recommandation: Lancer l'entrainement avec des donnees historiques")

except Exception as e:
    print(f"\nERREUR: {e}")
    import traceback
    traceback.print_exc()
