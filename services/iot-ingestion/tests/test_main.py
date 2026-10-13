import importlib.util
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

main_spec = importlib.util.spec_from_file_location(
    "iot_ingestion_main", Path(__file__).parents[1] / "src" / "main.py"
)
assert main_spec is not None and main_spec.loader is not None
main = importlib.util.module_from_spec(main_spec)
main_spec.loader.exec_module(main)

client = TestClient(main.app)
EVENT = {
    "deviceId": "MV-021",
    "eventId": "event-00000001",
    "observedAt": "2026-10-07T10:30:00Z",
    "readings": [{"metric": "AQI", "value": 42, "unit": "AQI"}],
}


def test_ingestion_validates_and_publishes(monkeypatch):
    published = []
    monkeypatch.setattr(main, "publish_event", published.append)

    response = client.post("/api/v1/ingest/readings", json=EVENT)

    assert response.status_code == 202
    assert response.json() == {"accepted": 1, "eventId": "event-00000001"}
    assert published[0].device_id == "MV-021"


def test_ingestion_rejects_invalid_metric_range(monkeypatch):
    monkeypatch.setattr(main, "publish_event", lambda event: pytest.fail("must not publish"))
    invalid = {**EVENT, "readings": [{"metric": "AQI", "value": 501, "unit": "AQI"}]}

    assert client.post("/api/v1/ingest/readings", json=invalid).status_code == 422


def test_ingestion_requires_configured_device_token(monkeypatch):
    monkeypatch.setenv("DEVICE_TOKENS", "test-device-secret")

    response = client.post("/api/v1/ingest/readings", json=EVENT)

    assert response.status_code == 401


def test_ingestion_reports_broker_failure(monkeypatch):
    monkeypatch.setattr(main, "publish_event", lambda event: (_ for _ in ()).throw(TimeoutError()))

    assert client.post("/api/v1/ingest/readings", json=EVENT).status_code == 503