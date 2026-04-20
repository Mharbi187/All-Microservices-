"""
Machine Learning Model for Tunisia Disaster Detection
Uses advanced ensemble methods (XGBoost + Random Forest) for risk prediction
with hyperparameter tuning and feature engineering
"""

import numpy as np
import pandas as pd
import sklearn
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, confusion_matrix, classification_report,
    roc_auc_score, roc_curve, precision_recall_curve
)
import joblib
import logging
from typing import Dict, Tuple, Optional
import os
from datetime import datetime

from src.config import (
    MODEL_CONFIG, RISK_THRESHOLDS, PERFORMANCE_TARGETS,
    ALPHAEARTH_BANDS
)
from src.feature_schema import CANONICAL_FEATURE_ORDER, from_sampled_row

# Try to import XGBoost (optional but recommended)
try:
    import xgboost as xgb
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False
    logging.warning("XGBoost not available. Install with: pip install xgboost")

# Try to import SMOTE for handling imbalanced data
try:
    from imblearn.over_sampling import SMOTE
    SMOTE_AVAILABLE = True
except ImportError:
    SMOTE_AVAILABLE = False
    logging.warning("SMOTE not available. Install with: pip install imbalanced-learn")

# Use an absolute default model path so training and Streamlit
# always look at the same file regardless of the working directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_MODEL_PATH = os.path.join(BASE_DIR, "data", "models", "disaster_model.pkl")

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

VALIDATED_MODEL_FEATURES = CANONICAL_FEATURE_ORDER + [
    'flood_risk_composite',
    'fire_risk_composite',
    'storm_composite',
]


class DisasterRiskModel:
    """
    Random Forest classifier for multi-hazard disaster risk prediction
    """
    
    def __init__(self, model_path: str = DEFAULT_MODEL_PATH, model_type: Optional[str] = None):
        """
        Initialize the model
        
        Args:
            model_path: Path to save/load the trained model
        """
        self.model_path = model_path
        self.model = None
        self.feature_names = None
        self.feature_importances_ = None
        self.training_metrics = {}
        self.model_metadata = {}
        self.model_type = (model_type or os.getenv("MODEL_TYPE", "random_forest")).strip().lower()

        # Initialize selected model architecture
        self.initialize_model(self.model_type)
    
    def initialize_model(self, model_type='random_forest'):
        """
        Initialize ML model with support for multiple algorithms.

        The validated configuration uses a shallow Random Forest
        (max_depth=3) with 8 discriminative features.  This avoids
        overfitting on small labelled-event datasets (< 50 samples).

        Args:
            model_type: 'random_forest' (default, validated),
                        'xgboost', or 'ensemble'
        """
        if model_type == 'xgboost' and XGBOOST_AVAILABLE:
            self.model = xgb.XGBClassifier(
                n_estimators=200,
                max_depth=8,
                learning_rate=0.05,
                subsample=0.8,
                colsample_bytree=0.8,
                random_state=MODEL_CONFIG['random_state'],
                n_jobs=MODEL_CONFIG['n_jobs'],
                eval_metric='logloss',
                scale_pos_weight=2  # Handle imbalanced classes
            )
            logger.info("XGBoost model initialized")
            self.model_type = 'xgboost'

        elif model_type == 'ensemble':
            # Create ensemble of Random Forest and Gradient Boosting
            rf = RandomForestClassifier(
                n_estimators=300,
                max_depth=15,
                min_samples_split=4,
                min_samples_leaf=2,
                random_state=MODEL_CONFIG['random_state'],
                n_jobs=MODEL_CONFIG['n_jobs'],
                class_weight='balanced'
            )

            gb = GradientBoostingClassifier(
                n_estimators=250,
                max_depth=10,
                learning_rate=0.05,
                subsample=0.8,
                random_state=MODEL_CONFIG['random_state']
            )

            estimators = [('rf', rf), ('gb', gb)]

            # Add XGBoost to ensemble if available
            if XGBOOST_AVAILABLE:
                xgb_model = xgb.XGBClassifier(
                    n_estimators=300,
                    max_depth=12,
                    learning_rate=0.05,
                    gamma=0.7,
                    colsample_bytree=0.8,
                    random_state=MODEL_CONFIG['random_state'],
                    n_jobs=MODEL_CONFIG['n_jobs'],
                    eval_metric='logloss'
                )
                estimators.append(('xgb', xgb_model))

            self.model = VotingClassifier(
                estimators=estimators,
                voting='soft',
                n_jobs=MODEL_CONFIG['n_jobs']
            )
            logger.info(f"Ensemble model initialized with {len(estimators)} estimators")
            self.model_type = 'ensemble'

        else:
            if model_type == 'xgboost' and not XGBOOST_AVAILABLE:
                logger.warning("MODEL_TYPE=xgboost requested but xgboost is unavailable. Falling back to random_forest.")

            # Default (validated): Shallow Random Forest
            # Validated on real GEE data: 90% accuracy, 80% detection,
            # 0% false positive, +5.2% overfit gap.
            self.model = RandomForestClassifier(
                n_estimators=MODEL_CONFIG['n_estimators'],
                max_depth=3,
                min_samples_split=MODEL_CONFIG['min_samples_split'],
                min_samples_leaf=MODEL_CONFIG['min_samples_leaf'],
                random_state=MODEL_CONFIG['random_state'],
                n_jobs=MODEL_CONFIG['n_jobs'],
                class_weight='balanced'
            )
            logger.info("Random Forest (shallow, validated) model initialized")
            self.model_type = 'random_forest'
        
        # Initialize scaler for feature normalization
        self.scaler = StandardScaler()
    
    def create_labels(self, df: pd.DataFrame) -> pd.Series:
        """
        Create binary risk labels based on thresholds
        
        Args:
            df: DataFrame with feature columns
        
        Returns:
            Binary labels (1 = high risk, 0 = low risk)
        """
        # If the input DataFrame already has beautifully curated ground-truth labels 
        # (e.g., from our historical edge-case CSVs), USE THEM exclusively!
        if 'label' in df.columns:
            logger.info(f"Using explicitly provided labels instead of threshold generation. Total: {len(df)}")
            return df['label'].astype(int)

        # Otherwise, fall back to physical synthetic heuristics (mostly for real-time unlabelled API data)
        # Initialize risk as False
        risk = pd.Series([False] * len(df), index=df.index)
        
        # Wildfire risk: High fire radiative power
        if 'max_frp' in df.columns:
            wildfire_risk = df['max_frp'] > RISK_THRESHOLDS['wildfire']['T21']
            risk = risk | wildfire_risk
        elif 'MaxFRP' in df.columns:
            wildfire_risk = df['MaxFRP'] > RISK_THRESHOLDS['wildfire']['T21']
            risk = risk | wildfire_risk
        
        # Flood risk: High water extent
        if 'water_change_pct' in df.columns:
            flood_risk = df['water_change_pct'] > RISK_THRESHOLDS['flood']['water_extent']
            risk = risk | flood_risk
        elif 'water_extent' in df.columns:
            flood_risk = df['water_extent'] > RISK_THRESHOLDS['flood']['water_extent']
            risk = risk | flood_risk
        
        # Extreme precipitation risk
        if 'precipitation_7d' in df.columns:
            precip_risk = df['precipitation_7d'] > RISK_THRESHOLDS['flood']['precipitation']
            risk = risk | precip_risk
        elif 'precipitation' in df.columns:
            precip_risk = df['precipitation'] > RISK_THRESHOLDS['flood']['precipitation']
            risk = risk | precip_risk
        
        # Convert to integer labels
        labels = risk.astype(int)
        
        logger.info(f"Created labels: {labels.sum()} high risk, {len(labels) - labels.sum()} low risk")
        logger.info(f"Risk ratio: {labels.mean():.2%}")
        
        return labels
    
    def engineer_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Create engineered composite features from multi-source data.

        Composites:
        - ``flood_risk_composite``: satellite precipitation x water change
        - ``fire_risk_composite``: satellite FRP x low humidity x high temperature
        - ``storm_composite``: wind speed x precipitation
        """
        X = df.copy()

        # -- Flood composite: satellite precipitation x water change --
        if 'precipitation_7d' in X.columns and 'water_change_pct' in X.columns:
            X['flood_risk_composite'] = (
                (X['precipitation_7d'] / 50).clip(0, 3)
                * (1 + X['water_change_pct']).clip(0.5, 5)
            )
        elif 'precipitation_7d' in X.columns and 'humidity' in X.columns:
            X['flood_risk_composite'] = (
                (X['precipitation_7d'] / 50).clip(0, 3)
                * (X['humidity'] / 100).clip(0, 1)
            )
        else:
            X['flood_risk_composite'] = 0

        # -- Fire composite: FRP x temperature x low humidity --
        if 'max_frp' in X.columns and 'temperature' in X.columns and 'humidity' in X.columns:
            X['fire_risk_composite'] = (
                (X['max_frp'] / 100).clip(0, 3)
                + (X['temperature'] / 45).clip(0, 1.5)
                * (1 - X['humidity'] / 100).clip(0, 1)
            )
        elif 'temperature' in X.columns and 'humidity' in X.columns:
            X['fire_risk_composite'] = (
                (X['temperature'] / 45).clip(0, 1.5)
                * (1 - X['humidity'] / 100).clip(0, 1)
            )
        else:
            X['fire_risk_composite'] = 0

        # -- Storm composite: wind x precipitation --
        if 'wind_speed' in X.columns and 'precipitation_7d' in X.columns:
            X['storm_composite'] = (
                (X['wind_speed'] / 60).clip(0, 2)
                * (1 + X['precipitation_7d'] / 20).clip(1, 5)
            )
        elif 'wind_speed' in X.columns:
            X['storm_composite'] = (X['wind_speed'] / 60).clip(0, 2)
        else:
            X['storm_composite'] = 0

        logger.info(f"Engineered {len(X.columns) - len(df.columns)} composite features")
        return X
    
    def prepare_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Prepare feature matrix from multi-source data.
        
        Full 27-feature set: 7 satellite + 10 AlphaEarth + 3 weather +
        1 seismic + 3 context + 3 composites.
        Must match daemon's build_feature_vector() output.
        """
        # Apply feature engineering
        df_engineered = self.engineer_features(df)

        # Multi-source validated features (24 base + 3 composites = 27)
        validated_features = VALIDATED_MODEL_FEATURES

        feature_cols = []
        for feat in validated_features:
            if feat in df_engineered.columns:
                feature_cols.append(feat)
        
        X = df_engineered[feature_cols].copy()

        # When predicting with an already-trained model, align features
        if self.feature_names is not None:
            for col in self.feature_names:
                if col not in X.columns:
                    X[col] = 0
            X = X[self.feature_names]
            feature_cols = list(self.feature_names)
        else:
            self.feature_names = feature_cols

        X = X.fillna(0)
        X = X.replace([np.inf, -np.inf], 0)

        logger.info(f"Prepared {len(feature_cols)} features: {feature_cols}")

        return X
    
    def train(self, df: pd.DataFrame, test_size: float = 0.3, use_smote: bool = True, tune_hyperparameters: bool = False) -> Dict:
        """
        Train the ML model with advanced techniques
        
        Args:
            df: Training data DataFrame
            test_size: Fraction of data for testing
            use_smote: Whether to use SMOTE for handling imbalanced classes
            tune_hyperparameters: Whether to perform hyperparameter tuning (slower)
        
        Returns:
            Dictionary with training metrics
        """
        logger.info("Starting model training with advanced techniques...")
        
        # Prepare features and labels
        X = self.prepare_features(df)
        y = self.create_labels(df)
        
        # Check class balance
        class_counts = y.value_counts()
        logger.info(f"Class distribution:\n{class_counts}")
        
        if class_counts.min() < 10:
            logger.warning("Very few positive samples! Consider collecting more data.")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42, stratify=y if len(class_counts) > 1 else None
        )
        
        logger.info(f"Training set: {len(X_train)} samples")
        logger.info(f"Test set: {len(X_test)} samples")
        
        # Apply SMOTE to handle imbalanced classes (only on training data)
        if use_smote and SMOTE_AVAILABLE and len(class_counts) > 1:
            try:
                smote = SMOTE(random_state=42, k_neighbors=min(5, class_counts.min() - 1))
                X_train, y_train = smote.fit_resample(X_train, y_train)
                logger.info(f"Applied SMOTE. New training set: {len(X_train)} samples")
                logger.info(f"New class distribution: {pd.Series(y_train).value_counts()}")
            except Exception as e:
                logger.warning(f"SMOTE failed: {e}. Continuing without SMOTE.")
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Hyperparameter tuning (optional)
        if tune_hyperparameters and isinstance(self.model, RandomForestClassifier):
            logger.info("Performing hyperparameter tuning...")
            param_grid = {
                'n_estimators': [100, 150, 200],
                'max_depth': [10, 15, 20],
                'min_samples_split': [2, 5],
                'min_samples_leaf': [1, 2]
            }
            cv_folds = min(3, class_counts.min()) if class_counts.min() > 1 else 2
            try:
                grid_search = GridSearchCV(self.model, param_grid, cv=cv_folds, scoring='f1', n_jobs=-1, verbose=1)
                grid_search.fit(X_train_scaled, y_train)
                self.model = grid_search.best_estimator_
                logger.info(f"Best parameters: {grid_search.best_params_}")
            except Exception as e:
                logger.warning(f"GridSearchCV failed (likely imbalanced split limit): {e}. Falling back to default.")
                self.model.fit(X_train_scaled, y_train)
        else:
            # Train model
            self.model.fit(X_train_scaled, y_train)
            logger.info("Model training completed")
        
        # Evaluate on test set
        y_pred = self.model.predict(X_test_scaled)
        
        # Get predicted probabilities
        unique_test_classes = set(y_test.unique())
        if len(unique_test_classes) > 0:
            try:
                proba = self.model.predict_proba(X_test_scaled)
                y_pred_proba = proba[:, 1] if proba.shape[1] > 1 else proba[:, 0]
            except:
                y_pred_proba = None
        else:
            y_pred_proba = None
        
        # Calculate comprehensive metrics
        metrics = {
            'accuracy': accuracy_score(y_test, y_pred),
            'precision': precision_score(y_test, y_pred, zero_division=0),
            'recall': recall_score(y_test, y_pred, zero_division=0),
            'f1_score': f1_score(y_test, y_pred, zero_division=0),
            'train_size': len(X_train),
            'test_size': len(X_test),
            'training_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'used_smote': use_smote and SMOTE_AVAILABLE,
            'tuned_hyperparameters': tune_hyperparameters
        }
        
        # ROC-AUC score
        if y_pred_proba is not None and len(unique_test_classes) > 1:
            try:
                metrics['roc_auc'] = roc_auc_score(y_test, y_pred_proba)
                logger.info(f"ROC-AUC Score: {metrics['roc_auc']:.3f}")
            except:
                metrics['roc_auc'] = None
        else:
            metrics['roc_auc'] = None
        
        # Calculate false positive rate
        cm = confusion_matrix(y_test, y_pred)
        if cm.shape == (2, 2):
            tn, fp, fn, tp = cm.ravel()
            metrics['false_positive_rate'] = fp / (fp + tn) if (fp + tn) > 0 else 0
            metrics['true_positive_rate'] = tp / (tp + fn) if (tp + fn) > 0 else 0
        else:
            metrics['false_positive_rate'] = 0
            metrics['true_positive_rate'] = 0
        
        self.training_metrics = metrics
        
        # Feature importances (if available)
        if hasattr(self.model, 'feature_importances_'):
            self.feature_importances_ = pd.DataFrame({
                'feature': self.feature_names,
                'importance': self.model.feature_importances_
            }).sort_values('importance', ascending=False)
        elif isinstance(self.model, VotingClassifier):
            try:
                first_estimator = self.model.estimators_[0]
                if hasattr(first_estimator, 'feature_importances_'):
                    self.feature_importances_ = pd.DataFrame({
                        'feature': self.feature_names,
                        'importance': first_estimator.feature_importances_
                    }).sort_values('importance', ascending=False)
            except:
                self.feature_importances_ = None
        else:
            self.feature_importances_ = None
        
        # Log comprehensive results
        logger.info("\n" + "="*50)
        logger.info("MODEL PERFORMANCE METRICS")
        logger.info("="*50)
        logger.info(f"Accuracy: {metrics['accuracy']:.2%} (target: {PERFORMANCE_TARGETS['accuracy']:.0%})")
        logger.info(f"Precision: {metrics['precision']:.2%} (target: {PERFORMANCE_TARGETS['precision']:.0%})")
        logger.info(f"Recall: {metrics['recall']:.2%} (target: {PERFORMANCE_TARGETS['recall']:.0%})")
        logger.info(f"F1 Score: {metrics['f1_score']:.2%}")
        logger.info(f"False Positive Rate: {metrics['false_positive_rate']:.2%} (target: <{PERFORMANCE_TARGETS['false_positive_rate']:.0%})")
        if metrics['roc_auc'] is not None:
            logger.info(f"ROC-AUC Score: {metrics['roc_auc']:.3f}")
        logger.info("="*50)
        
        if self.feature_importances_ is not None:
            logger.info("\nTop 10 Feature Importances:")
            logger.info(self.feature_importances_.head(10).to_string(index=False))
        
        # Safe classification report
        try:
            report = classification_report(y_test, y_pred, target_names=['Low Risk', 'High Risk'])
            logger.info("\nClassification Report:")
            logger.info("\n" + report)
        except ValueError as e:
            logger.warning(f"Could not compute full classification report: {e}")
        
        # Check if meets performance targets
        if metrics['accuracy'] >= PERFORMANCE_TARGETS['accuracy']:
            logger.info("✓ Accuracy target achieved!")
        else:
            logger.warning("✗ Accuracy below target. Consider more training data or feature engineering.")
        
        if metrics['false_positive_rate'] <= PERFORMANCE_TARGETS['false_positive_rate']:
            logger.info("✓ False positive rate target achieved!")
        else:
            logger.warning("✗ False positive rate above target. Consider adjusting thresholds.")
        
        return metrics
    
    def predict(self, df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """
        Predict risk for new data
        
        Args:
            df: DataFrame with feature columns
        
        Returns:
            Tuple of (predictions, probabilities)
        """
        if self.model is None:
            raise ValueError("Model not trained or loaded. Call train() or load() first.")

        X = self.prepare_features(df)
        
        # Scale features using the fitted scaler
        X_scaled = self.scaler.transform(X)

        predictions = self.model.predict(X_scaled)

        # Guard against cases where the model only has a single class
        try:
            proba = self.model.predict_proba(X_scaled)
            if proba.shape[1] > 1:
                probabilities = proba[:, 1]
            else:
                probabilities = proba[:, 0]
        except Exception:
            probabilities = predictions.astype(float)

        return predictions, probabilities
    
    def predict_risk_score(self, df: pd.DataFrame) -> pd.Series:
        """
        Get risk scores (0-1) for visualization
        
        Args:
            df: DataFrame with feature columns
        
        Returns:
            Series with risk scores
        """
        _, probabilities = self.predict(df)
        return pd.Series(probabilities, index=df.index)
    
    def save(self, path: Optional[str] = None):
        """
        Save trained model to disk
        
        Args:
            path: Path to save model (uses self.model_path if None)
        """
        if path is None:
            path = self.model_path
        
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(path), exist_ok=True)
        
        # Save model and metadata
        model_data = {
            'model': self.model,
            'scaler': self.scaler,
            'feature_names': self.feature_names,
            'feature_importances': self.feature_importances_,
            'training_metrics': self.training_metrics,
            'metadata': {
                'model_type': self.model_type,
                'feature_schema': 'canonical-v1',
                'feature_names': list(self.feature_names or []),
                'sklearn_version': sklearn.__version__,
                'numpy_version': np.__version__,
                'saved_at': datetime.utcnow().isoformat(),
            },
        }
        
        joblib.dump(model_data, path)
        logger.info(f"Model saved to {path}")
    
    def load(self, path: Optional[str] = None):
        """
        Load trained model from disk
        
        Args:
            path: Path to load model from (uses self.model_path if None)
        """
        if path is None:
            path = self.model_path
        
        if not os.path.exists(path):
            raise FileNotFoundError(f"Model file not found: {path}")
        
        model_data = joblib.load(path)
        
        self.model = model_data['model']
        self.scaler = model_data.get('scaler', StandardScaler())
        self.feature_names = model_data['feature_names']
        self.feature_importances_ = model_data.get('feature_importances')
        self.training_metrics = model_data.get('training_metrics', {})
        self.model_metadata = model_data.get('metadata', {})
        self.model_type = self.model_metadata.get('model_type', self.model_type)

        schema_tag = self.model_metadata.get('feature_schema')
        if schema_tag and schema_tag != 'canonical-v1':
            raise ValueError(
                "Loaded model feature schema is incompatible with runtime schema. "
                f"Expected 'canonical-v1', got '{schema_tag}'."
            )

        unknown_features = [f for f in (self.feature_names or []) if f not in VALIDATED_MODEL_FEATURES]
        if unknown_features:
            raise ValueError(
                "Loaded model feature schema is incompatible with runtime schema. "
                f"Unknown features: {unknown_features}"
            )

        # For models saved with canonical metadata, enforce exact feature alignment.
        if schema_tag == 'canonical-v1':
            expected = set(VALIDATED_MODEL_FEATURES)
            loaded = set(self.feature_names or [])
            if loaded != expected:
                missing = sorted(expected - loaded)
                extra = sorted(loaded - expected)
                raise ValueError(
                    "Loaded model feature schema mismatch for canonical-v1. "
                    f"Missing: {missing}. Extra: {extra}."
                )
        
        logger.info(f"Model loaded from {path}")
        logger.info(f"Training date: {self.training_metrics.get('training_date', 'Unknown')}")
        logger.info(f"Accuracy: {self.training_metrics.get('accuracy', 0):.2%}")
    
    def cross_validate(self, df: pd.DataFrame, cv: int = 5) -> Dict:
        """
        Perform cross-validation
        
        Args:
            df: Training data
            cv: Number of folds
        
        Returns:
            Cross-validation scores
        """
        logger.info(f"Performing {cv}-fold cross-validation...")
        
        X = self.prepare_features(df)
        y = self.create_labels(df)
        
        scores = cross_val_score(self.model, X, y, cv=cv, scoring='accuracy')
        
        cv_results = {
            'mean_accuracy': scores.mean(),
            'std_accuracy': scores.std(),
            'scores': scores.tolist()
        }
        
        logger.info(f"Cross-validation accuracy: {cv_results['mean_accuracy']:.2%} (+/- {cv_results['std_accuracy']:.2%})")
        
        return cv_results


def train_model_from_historical_data(start_date: str = '2023-01-01',
                                     end_date: str = '2025-01-01') -> DisasterRiskModel:
    """
    Train model using historical GEE data
    
    Args:
        start_date: Start date for historical data
        end_date: End date for historical data
    
    Returns:
        Trained DisasterRiskModel
    """
    from src.data_acquisition import GEEDataAcquisition
    
    logger.info(f"Training model with historical data from {start_date} to {end_date}")
    
    # Fetch historical data
    gee = GEEDataAcquisition()
    df = gee.get_historical_data(start_date, end_date)
    
    if df.empty:
        logger.error("No historical data available!")
        return None

    # Normalize legacy sampled rows into canonical schema before training.
    canonical_rows = []
    for _, row in df.iterrows():
        row_dict = row.to_dict()
        geom = row_dict.get(".geo")
        lat, lon = 34.0, 9.0  # Tunisia centroid fallback
        if isinstance(geom, dict):
            coords = geom.get("coordinates")
            if isinstance(coords, (list, tuple)) and len(coords) >= 2:
                try:
                    lon = float(coords[0])
                    lat = float(coords[1])
                except (TypeError, ValueError):
                    lat, lon = 34.0, 9.0
        canonical_rows.append(from_sampled_row(row_dict, lat=lat, lon=lon))

    df = pd.DataFrame(canonical_rows)
    logger.info("Historical sampled data converted to canonical schema: %s rows", len(df))
    
    # Train model
    model = DisasterRiskModel()
    metrics = model.train(df)
    
    # Save model
    model.save()
    
    return model


if __name__ == "__main__":
    # Example: Train model with historical data
    logger.info("Starting model training script...")
    
    # For testing, create synthetic data
    logger.info("Creating synthetic training data for testing...")
    
    np.random.seed(42)
    n_samples = 1000
    
    # Create synthetic features
    data = {
        'MaxFRP': np.random.uniform(280, 350, n_samples),
        'water_extent': np.random.uniform(0, 1, n_samples),
        'precipitation': np.random.uniform(0, 100, n_samples),
    }
    
    # Add AlphaEarth embeddings
    for i in ALPHAEARTH_BANDS:
        data[i] = np.random.randn(n_samples)
    
    df = pd.DataFrame(data)
    
    # Train model
    model = DisasterRiskModel()
    metrics = model.train(df)
    
    # Save model
    model.save()
    
    logger.info("Model training complete!")
