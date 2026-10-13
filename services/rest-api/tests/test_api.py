import importlib.util
from pathlib import Path
from datetime import datetime, timezone

from fastapi.testclient import TestClient
from smartcity_store import store_event
from sensor_contracts import SensorEvent

api_spec = importlib.util.spec_from_file_location(
    "rest_api_main", Path(__file__).parents[1] / "src" / "main.py"
)
assert api_spec is not None and api_spec.loader is not None
api_module = importlib.util.module_from_spec(api_spec)
api_spec.loader.exec_module(api_module)

client = TestClient(api_module.app)


def test_sensor_and_alert_endpoints_use_read_model(monkeypatch, tmp_path):
    monkeypatch.setenv("SQLITE_PATH", str(tmp_path / "api.db"))
    event = SensorEvent.model_validate(
        {
            "deviceId": "MV-021",
            "eventId": "event-00000001",
            "observedAt": datetime.now(timezone.utc).isoformat(),
            "location": "Civic Center",
            "readings": [{"metric": "PM2.5", "value": 40, "unit": "ug/m3"}],
        }
    )
    store_event(event)

    assert client.get("/api/v1/sensors").json()["items"][0]["id"] == "MV-021"
    assert client.get("/api/v1/alerts").json()["items"][0]["severity"] == "Warning"
    assert client.get("/api/health").json()["sensorCoverage"]["total"] == 1


def test_historical_query_requires_a_bounded_window():
    response = client.get(
        "/api/v1/readings",
        params={"from": "2020-01-01T00:00:00Z", "to": "2026-10-07T00:00:00Z"},
    )

    assert response.status_code == 422
