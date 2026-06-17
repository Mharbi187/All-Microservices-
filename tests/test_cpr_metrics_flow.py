from fastapi.testclient import TestClient

from src.api import app


def test_cpr_metrics_broadcast_to_crisis_room_ws():
    client = TestClient(app)
    room_id = "crisis_demo_01"
    payload = {"status": "warning", "bpm": 95, "compression_count": 12}

    with client.websocket_connect(f"/ws/crisis/{room_id}") as websocket:
        response = client.post(f"/api/v1/crisis-room/{room_id}/cpr-metrics", json=payload)
        assert response.status_code == 200
        event = websocket.receive_json()
        assert event["event"] == "CPR_METRICS_UPDATE"
        assert event["data"]["bpm"] == 95
