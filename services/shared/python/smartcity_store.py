import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sensor_contracts import SensorEvent

THRESHOLDS: dict[str, tuple[float, str]] = {
    "AQI": (100, "Warning"),
    "PM2.5": (35, "Warning"),
    "Temperature": (35, "Warning"),
    "Humidity": (80, "Informational"),
    "Noise": (75, "Critical"),
}


def _use_azure_store() -> bool:
    return bool(os.getenv("AZURE_SQL_SERVER") and os.getenv("ADX_CLUSTER_URI"))


def connect() -> sqlite3.Connection:
    database_path = os.getenv("SQLITE_PATH", "/data/smartcity.db")
    Path(database_path).parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(database_path, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA journal_mode=WAL")
    return connection


def initialize() -> None:
    if _use_azure_store():
        return
    with connect() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS sensors (
                sensor_id TEXT PRIMARY KEY,
                location TEXT NOT NULL,
                last_seen TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS events (
                sensor_id TEXT NOT NULL,
                event_id TEXT NOT NULL,
                observed_at TEXT NOT NULL,
                PRIMARY KEY (sensor_id, event_id)
            );
            CREATE TABLE IF NOT EXISTS readings (
                sensor_id TEXT NOT NULL,
                event_id TEXT NOT NULL,
                metric TEXT NOT NULL,
                value REAL NOT NULL,
                unit TEXT NOT NULL,
                observed_at TEXT NOT NULL,
                location TEXT NOT NULL,
                PRIMARY KEY (sensor_id, event_id, metric)
            );
            CREATE INDEX IF NOT EXISTS ix_readings_time ON readings(observed_at DESC);
            CREATE INDEX IF NOT EXISTS ix_readings_location ON readings(location, metric);
            CREATE TABLE IF NOT EXISTS alerts (
                alert_id TEXT PRIMARY KEY,
                sensor_id TEXT NOT NULL,
                location TEXT NOT NULL,
                condition_text TEXT NOT NULL,
                severity TEXT NOT NULL,
                state TEXT NOT NULL DEFAULT 'Open',
                created_at TEXT NOT NULL
            );
            """
        )


def store_event(event: SensorEvent) -> bool:
    if _use_azure_store():
        from smartcity_azure_store import store_event as store_azure_event

        return store_azure_event(event)
    initialize()
    observed_at = event.observed_at.astimezone(timezone.utc).isoformat()
    with connect() as connection:
        inserted = connection.execute(
            "INSERT OR IGNORE INTO events(sensor_id, event_id, observed_at) VALUES (?, ?, ?)",
            (event.device_id, event.event_id, observed_at),
        ).rowcount
        if not inserted:
            return False
        connection.execute(
            """INSERT INTO sensors(sensor_id, location, last_seen) VALUES (?, ?, ?)
               ON CONFLICT(sensor_id) DO UPDATE SET location=excluded.location,
               last_seen=MAX(sensors.last_seen, excluded.last_seen)""",
            (event.device_id, event.location, observed_at),
        )
        for reading in event.readings:
            connection.execute(
                """INSERT INTO readings
                   (sensor_id, event_id, metric, value, unit, observed_at, location)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (
                    event.device_id,
                    event.event_id,
                    reading.metric.value,
                    reading.value,
                    reading.unit,
                    observed_at,
                    event.location,
                ),
            )
            threshold = THRESHOLDS.get(reading.metric.value)
            if threshold and reading.value > threshold[0]:
                alert_id = f"{event.device_id}:{event.event_id}:{reading.metric.value}"
                connection.execute(
                    """INSERT OR IGNORE INTO alerts
                       (alert_id, sensor_id, location, condition_text, severity, created_at)
                       VALUES (?, ?, ?, ?, ?, ?)""",
                    (
                        alert_id,
                        event.device_id,
                        event.location,
                        f"{reading.metric.value} {reading.value:g} {reading.unit}; limit {threshold[0]:g}",
                        threshold[1],
                        observed_at,
                    ),
                )
    return True


def _freshness(timestamp: str) -> tuple[str, str]:
    observed = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    seconds = max(0, int((datetime.now(timezone.utc) - observed).total_seconds()))
    label = f"{seconds} sec ago" if seconds < 60 else f"{seconds // 60} min ago"
    state = "offline" if seconds > 900 else "delayed" if seconds > 180 else "online"
    return label, state


def list_sensors(
    location: str | None = None,
    metric: str | None = None,
    state: str | None = None,
) -> list[dict[str, Any]]:
    if _use_azure_store():
        from smartcity_azure_store import list_sensors as list_azure_sensors

        return list_azure_sensors(location, metric, state)
    initialize()
    with connect() as connection:
        sensors = connection.execute("SELECT * FROM sensors ORDER BY sensor_id").fetchall()
        result = []
        for sensor in sensors:
            freshness, current_state = _freshness(sensor["last_seen"])
            if location and sensor["location"] != location:
                continue
            if state and current_state != state:
                continue
            rows = connection.execute(
                """SELECT metric, value, unit, observed_at FROM readings
                   WHERE sensor_id=? ORDER BY observed_at DESC""",
                (sensor["sensor_id"],),
            ).fetchall()
            latest: dict[str, dict[str, Any]] = {}
            for row in rows:
                latest.setdefault(
                    row["metric"],
                    {
                        "sensorId": sensor["sensor_id"],
                        "metric": row["metric"],
                        "value": row["value"],
                        "unit": row["unit"],
                        "observedAt": row["observed_at"],
                    },
                )
            readings = list(latest.values())
            metrics = list(latest)
            if metric and metric not in metrics:
                continue
            if metric:
                readings = [reading for reading in readings if reading["metric"] == metric]
                metrics = [metric]
            result.append(
                {
                    "id": sensor["sensor_id"],
                    "location": sensor["location"],
                    "metrics": metrics,
                    "latestReadings": readings,
                    "state": current_state,
                    "freshnessLabel": freshness,
                    "observedAt": sensor["last_seen"],
                }
            )
        return result


def get_sensor(sensor_id: str) -> dict[str, Any] | None:
    if _use_azure_store():
        from smartcity_azure_store import get_sensor as get_azure_sensor

        return get_azure_sensor(sensor_id)
    return next((sensor for sensor in list_sensors() if sensor["id"] == sensor_id), None)


def list_readings(
    from_time: str,
    to_time: str,
    location: str | None = None,
    metric: str | None = None,
    limit: int = 100,
) -> list[dict[str, Any]]:
    if _use_azure_store():
        from smartcity_azure_store import list_readings as list_azure_readings

        return list_azure_readings(from_time, to_time, location, metric, limit)
    initialize()
    clauses = ["observed_at >= ?", "observed_at <= ?"]
    values: list[Any] = [from_time, to_time]
    if location:
        clauses.append("location = ?")
        values.append(location)
    if metric:
        clauses.append("metric = ?")
        values.append(metric)
    values.append(limit)
    with connect() as connection:
        rows = connection.execute(
            "SELECT sensor_id, metric, value, unit, observed_at FROM readings WHERE "
            + " AND ".join(clauses)
            + " ORDER BY observed_at DESC LIMIT ?",
            values,
        ).fetchall()
        return [
            {
                "sensorId": row["sensor_id"],
                "metric": row["metric"],
                "value": row["value"],
                "unit": row["unit"],
                "observedAt": row["observed_at"],
            }
            for row in rows
        ]


def list_alerts(
    severity: str | None = None,
    state: str | None = None,
    from_time: str | None = None,
    to_time: str | None = None,
    limit: int = 100,
) -> list[dict[str, Any]]:
    if _use_azure_store():
        from smartcity_azure_store import list_alerts as list_azure_alerts

        return list_azure_alerts(severity, state, from_time, to_time, limit)
    initialize()
    clauses = ["1=1"]
    values: list[Any] = []
    for column, value in (("severity", severity), ("state", state), ("created_at >=", from_time), ("created_at <=", to_time)):
        if value:
            clauses.append(f"{column} ?")
            values.append(value)
    values.append(limit)
    with connect() as connection:
        rows = connection.execute(
            "SELECT * FROM alerts WHERE " + " AND ".join(clauses) + " ORDER BY created_at DESC LIMIT ?",
            values,
        ).fetchall()
        return [
            {
                "id": row["alert_id"],
                "sensorId": row["sensor_id"],
                "location": row["location"],
                "condition": row["condition_text"],
                "severity": row["severity"],
                "state": row["state"],
                "createdAt": row["created_at"],
                "timeLabel": row["created_at"][11:16],
            }
            for row in rows
        ]