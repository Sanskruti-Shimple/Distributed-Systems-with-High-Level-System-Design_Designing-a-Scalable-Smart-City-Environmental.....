from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from sensor_contracts import SensorEvent, SensorReading


def valid_event() -> dict[str, object]:
    return {
        "deviceId": "MV-021",
        "eventId": "event-000001",
        "observedAt": datetime.now(timezone.utc).isoformat(),
        "readings": [{"metric": "PM2.5", "value": 8.7, "unit": "ug/m3"}],
    }


def test_sensor_event_accepts_camel_case_contract() -> None:
    event = SensorEvent.model_validate(valid_event())

    assert event.device_id == "MV-021"
    assert event.model_dump(by_alias=True)["eventId"] == "event-000001"


@pytest.mark.parametrize(
    ("metric", "value", "unit"),
    [
        ("AQI", 501, "AQI"),
        ("PM2.5", 8.7, "ppm"),
        ("Temperature", -51, "C"),
        ("Humidity", 101, "%"),
        ("Noise", 201, "dBA"),
    ],
)
def test_sensor_reading_rejects_invalid_range_or_unit(
    metric: str, value: float, unit: str
) -> None:
    with pytest.raises(ValidationError):
        SensorReading(metric=metric, value=value, unit=unit)


def test_sensor_event_rejects_timezone_naive_timestamp() -> None:
    payload = valid_event()
    payload["observedAt"] = "2026-10-07T10:43:48"

    with pytest.raises(ValidationError, match="must include a timezone"):
        SensorEvent.model_validate(payload)


def test_sensor_event_rejects_unknown_fields() -> None:
    payload = valid_event()
    payload["unexpected"] = True

    with pytest.raises(ValidationError):
        SensorEvent.model_validate(payload)