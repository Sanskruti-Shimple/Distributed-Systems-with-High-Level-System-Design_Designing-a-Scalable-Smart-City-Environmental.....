from datetime import datetime
from enum import StrEnum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class Metric(StrEnum):
    AQI = "AQI"
    PM25 = "PM2.5"
    TEMPERATURE = "Temperature"
    HUMIDITY = "Humidity"
    NOISE = "Noise"


METRIC_CONSTRAINTS: dict[Metric, tuple[str, float, float]] = {
    Metric.AQI: ("AQI", 0, 500),
    Metric.PM25: ("ug/m3", 0, 1000),
    Metric.TEMPERATURE: ("C", -50, 80),
    Metric.HUMIDITY: ("%", 0, 100),
    Metric.NOISE: ("dBA", 0, 200),
}


class SensorReading(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    metric: Metric
    value: Annotated[float, Field(allow_inf_nan=False)]
    unit: Annotated[str, Field(min_length=1, max_length=16)]

    @model_validator(mode="after")
    def validate_metric_value_and_unit(self) -> "SensorReading":
        expected_unit, minimum, maximum = METRIC_CONSTRAINTS[self.metric]
        if self.unit != expected_unit:
            raise ValueError(f"{self.metric.value} readings must use {expected_unit}")
        if not minimum <= self.value <= maximum:
            raise ValueError(
                f"{self.metric.value} must be between {minimum} and {maximum} {expected_unit}"
            )
        return self


class SensorEvent(BaseModel):
    model_config = ConfigDict(
        extra="forbid", populate_by_name=True, str_strip_whitespace=True
    )

    device_id: Annotated[str, Field(alias="deviceId", min_length=3, max_length=64)]
    event_id: Annotated[str, Field(alias="eventId", min_length=8, max_length=128)]
    observed_at: datetime = Field(alias="observedAt")
    location: Annotated[str, Field(min_length=1, max_length=128)] = "Unknown"
    readings: Annotated[list[SensorReading], Field(min_length=1, max_length=20)]

    @field_validator("device_id")
    @classmethod
    def validate_device_id(cls, value: str) -> str:
        if not value.replace("-", "").replace("_", "").isalnum():
            raise ValueError("deviceId may contain only letters, numbers, hyphens, and underscores")
        return value

    @field_validator("event_id")
    @classmethod
    def validate_event_id(cls, value: str) -> str:
        if not value.replace("-", "").replace("_", "").isalnum():
            raise ValueError("eventId may contain only letters, numbers, hyphens, and underscores")
        return value

    @field_validator("observed_at")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("observedAt must include a timezone")
        return value