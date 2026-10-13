from datetime import datetime, timezone

from sensor_contracts import SensorEvent
from smartcity_store import initialize, list_alerts, list_readings, store_event


def event(event_id="event-00000001", value=120):
    return SensorEvent.model_validate(
        {
            "deviceId": "MV-021",
            "eventId": event_id,
            "observedAt": datetime.now(timezone.utc).isoformat(),
            "location": "Civic Center",
            "readings": [{"metric": "AQI", "value": value, "unit": "AQI"}],
        }
    )


def test_store_is_idempotent_and_creates_threshold_alert(monkeypatch, tmp_path):
    monkeypatch.setenv("SQLITE_PATH", str(tmp_path / "city.db"))
    initialize()

    assert store_event(event()) is True
    assert store_event(event()) is False
    readings = list_readings("2000-01-01T00:00:00+00:00", "2999-01-01T00:00:00+00:00")
    alerts = list_alerts()

    assert len(readings) == 1
    assert readings[0]["value"] == 120
    assert len(alerts) == 1
    assert alerts[0]["severity"] == "Warning"