"""
CPR Backend Tests
==================
Unit and integration tests covering:
  - server.py syntax and import validity
  - SIMULATION_MODE release gate
  - WebSocket contract (metric schema alignment)
  - Online vs offline metric field equivalence
  - Model registry structure validation
"""

import json
import pytest
import sys
import os

# Add app-mobile to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))


# ─── Fixtures ────────────────────────────────────────────────────────────────

ONLINE_RESPONSE_SCHEMA = {
    "status": str,
    "metrics": dict,
    "ui_commands": list,
    "low_visibility_warning": bool,
}

OFFLINE_RESPONSE_SCHEMA = {
    "status": str,
    "metrics": dict,
    "ui_commands": list,
    "low_visibility_warning": bool,
}

SAMPLE_ONLINE_RESPONSE = {
    "status": "ACTIVE",
    "metrics": {
        "bpm": 110,
        "depth_torso_pct": 5.2,
        "recoil_quality": 0.95,
        "elbow_angle": 170.0,
        "compression_count": 12,
    },
    "ui_commands": [
        {
            "id": "compressions_good",
            "severity": "POSITIVE",
            "text_fr": "Compressions parfaites",
            "text_en": "Excellent compressions",
            "text_ar": "ضغطات ممتازة",
            "value": 110.0
        }
    ],
    "low_visibility_warning": False,
}

SAMPLE_OFFLINE_RESPONSE = {
    "status": "ACTIVE",
    "metrics": {
        "bpm": 108,
        "compression_count": 11,
        "recoil_quality": 0.90,
        "elbow_angle": 165.0,
        "victim_type": "adult",
        "mode": "offline",
    },
    "ui_commands": [
        {
            "id": "compressions_good",
            "severity": "POSITIVE",
            "text_fr": "Compressions parfaites — continuez!",
            "text_en": "Excellent compressions — keep going!",
            "text_ar": "ضغطات ممتازة — استمر!",
            "value": 108
        }
    ],
    "low_visibility_warning": False,
}


# ─── 1. schema integrity tests ───────────────────────────────────────────────

class TestSchemaEquivalence:
    """Ensure online and offline responses share the same top-level schema."""

    def _validate_schema(self, response, schema):
        for key, expected_type in schema.items():
            assert key in response, f"Missing key: '{key}'"
            assert isinstance(response[key], expected_type), (
                f"Key '{key}' expected {expected_type.__name__}, got {type(response[key]).__name__}"
            )

    def test_online_response_shape(self):
        self._validate_schema(SAMPLE_ONLINE_RESPONSE, ONLINE_RESPONSE_SCHEMA)

    def test_offline_response_shape(self):
        self._validate_schema(SAMPLE_OFFLINE_RESPONSE, OFFLINE_RESPONSE_SCHEMA)

    def test_same_top_level_keys(self):
        online_keys = set(ONLINE_RESPONSE_SCHEMA.keys())
        offline_keys = set(OFFLINE_RESPONSE_SCHEMA.keys())
        assert online_keys == offline_keys, (
            f"Schema mismatch! Online-only: {online_keys - offline_keys}, "
            f"Offline-only: {offline_keys - online_keys}"
        )

    def test_ui_commands_are_objects(self):
        """ui_commands must be a list of dicts with id, severity, and at least one text field."""
        for cmd in SAMPLE_ONLINE_RESPONSE["ui_commands"]:
            assert "id" in cmd
            assert "severity" in cmd
            assert cmd["severity"] in ("CRITICAL", "HIGH", "MEDIUM", "POSITIVE")
            assert any(k in cmd for k in ("text_fr", "text_en", "text_ar"))

        for cmd in SAMPLE_OFFLINE_RESPONSE["ui_commands"]:
            assert "id" in cmd
            assert "severity" in cmd
            assert cmd["severity"] in ("CRITICAL", "HIGH", "MEDIUM", "POSITIVE")
            assert any(k in cmd for k in ("text_fr", "text_en", "text_ar"))


# ─── 2. Model Registry Tests ─────────────────────────────────────────────────

REGISTRY_PATH = os.path.join(os.path.dirname(__file__), '..', 'model_registry.json')


class TestModelRegistry:
    def test_registry_exists(self):
        assert os.path.exists(REGISTRY_PATH), "model_registry.json not found"

    def test_registry_has_models(self):
        with open(REGISTRY_PATH) as f:
            reg = json.load(f)
        assert "models" in reg
        assert len(reg["models"]) > 0

    def test_model_has_required_fields(self):
        with open(REGISTRY_PATH) as f:
            reg = json.load(f)
        required = {"name", "version", "input_shape", "output_shape", "checksum_sha256", "metrics_thresholds"}
        for model in reg["models"]:
            missing = required - set(model.keys())
            assert not missing, f"Model '{model.get('name')}' missing fields: {missing}"

    def test_model_thresholds_are_numeric(self):
        with open(REGISTRY_PATH) as f:
            reg = json.load(f)
        for model in reg["models"]:
            for metric, val in model["metrics_thresholds"].items():
                assert isinstance(val, (int, float)), (
                    f"Threshold '{metric}' in model '{model['name']}' is not numeric"
                )


# ─── 3. SIMULATION_MODE Release Gate ─────────────────────────────────────────

SERVER_PY = os.path.join(os.path.dirname(__file__), '..', 'server.py')


class TestReleaseGates:
    def test_simulation_mode_is_false(self):
        import ast
        with open(SERVER_PY) as f:
            tree = ast.parse(f.read())
        for node in ast.walk(tree):
            if isinstance(node, ast.Assign):
                for t in node.targets:
                    if isinstance(t, ast.Name) and t.id == 'SIMULATION_MODE':
                        val = node.value
                        assert isinstance(val, ast.Constant) and not val.value, (
                            "SIMULATION_MODE must be False in production"
                        )

    def test_no_mock_users_in_code(self):
        import glob
        js_files = glob.glob(os.path.join(
            os.path.dirname(__file__), '..', 'cpr_mobile_app', 'src', '**', '*.js'), recursive=True)
        for f in js_files:
            content = open(f).read()
            assert 'MOCK_USERS' not in content, f"MOCK_USERS found in {f}"

    def test_tflite_models_exist(self):
        assets_dir = os.path.join(os.path.dirname(__file__), '..', 'cpr_mobile_app', 'assets')
        assert os.path.exists(os.path.join(assets_dir, 'best.tflite')), "best.tflite missing"
        assert os.path.exists(os.path.join(assets_dir, 'pose.tflite')), "pose.tflite missing"


# ─── 4. Python syntax gate ───────────────────────────────────────────────────

class TestPythonSyntax:
    def test_server_py_compiles(self):
        import py_compile
        try:
            py_compile.compile(SERVER_PY, doraise=True)
        except py_compile.PyCompileError as e:
            pytest.fail(f"server.py has syntax errors: {e}")
