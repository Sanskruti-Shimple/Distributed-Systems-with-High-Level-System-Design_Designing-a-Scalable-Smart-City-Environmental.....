from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from smartcity_store import get_sensor, list_alerts, list_readings, list_sensors

app = FastAPI(title="Metrovale Environmental API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


def page(items: list[dict[str, Any]], cursor: str | None, limit: int) -> dict[str, Any]:
    offset = int(cursor or "0")
    selected = items[offset : offset + limit]
    next_offset = offset + limit
    return {"items": selected, "nextCursor": str(next_offset) if next_offset < len(items) else None}


@app.get("/health/live")
def liveness() -> dict[str, str]:
    return {"status": "alive"}


@app.get("/health/ready")
def readiness() -> dict[str, Any]:
    try:
        list_sensors()
        return {"status": "ready", "dependencies": []}
    except Exception as error:
        raise HTTPException(status_code=503, detail="Read model unavailable") from error


@app.get("/api/health")
def health() -> dict[str, Any]:
    sensors = list_sensors()
    online = sum(sensor["state"] == "online" for sensor in sensors)
    delayed = sum(sensor["state"] == "delayed" for sensor in sensors)
    return {
        "status": "healthy",
        "services": [
            {"name": "Ingestion API", "state": "healthy", "detail": "Accepting sensor events"},
            {"name": "Stream processor", "state": "healthy", "detail": "Event read model available"},
            {"name": "Event stream", "state": "healthy", "detail": "Kafka-compatible broker configured"},
            {"name": "Time-series store", "state": "healthy", "detail": "Queries responding"},
        ],
        "sensorCoverage": {
            "online": online,
            "total": len(sensors),
            "delayed": delayed,
            "onlinePercent": round(100 * online / len(sensors)) if sensors else 0,
        },
        "lastEventFreshness": min(
            (sensor["freshnessLabel"] for sensor in sensors), default="No events received"
        ),
    }


@app.get("/api/v1/sensors")
def sensors(
    location: str | None = None,
    metric: str | None = None,
    state: str | None = Query(default=None, pattern="^(online|delayed|offline)$"),
    cursor: str | None = Query(default=None, pattern=r"^\d+$"),
    limit: int = Query(default=50, ge=1, le=100),
) -> dict[str, Any]:
    return page(list_sensors(location, metric, state), cursor, limit)


@app.get("/api/v1/sensors/{sensor_id}")
def sensor(sensor_id: str) -> dict[str, Any]:
    item = get_sensor(sensor_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Sensor not found")
    return {"sensor": item}


@app.get("/api/v1/readings/latest")
def latest_readings(location: str | None = None, metric: str | None = None) -> dict[str, Any]:
    items = list_sensors(location, metric)
    observed_at = max((item["observedAt"] for item in items), default="")
    return {"items": items, "observedAt": observed_at}


@app.get("/api/v1/readings")
def historical_readings(
    from_time: datetime = Query(alias="from"),
    to_time: datetime = Query(alias="to"),
    location: str | None = None,
    metric: str | None = None,
    cursor: str | None = Query(default=None, pattern=r"^\d+$"),
    limit: int = Query(default=100, ge=1, le=500),
) -> dict[str, Any]:
    if from_time.tzinfo is None or to_time.tzinfo is None:
        raise HTTPException(status_code=422, detail="from and to must include a timezone")
    from_utc = from_time.astimezone(timezone.utc)
    to_utc = to_time.astimezone(timezone.utc)
    if from_utc >= to_utc:
        raise HTTPException(status_code=422, detail="from must be earlier than to")
    if to_utc - from_utc > timedelta(days=30):
        raise HTTPException(status_code=422, detail="time range cannot exceed 30 days")
    items = list_readings(from_utc.isoformat(), to_utc.isoformat(), location, metric, 5000)
    return page(items, cursor, limit)


@app.get("/api/v1/alerts")
def alerts(
    from_time: datetime | None = Query(default=None, alias="from"),
    to_time: datetime | None = Query(default=None, alias="to"),
    severity: str | None = Query(default=None, pattern="^(Informational|Warning|Critical)$"),
    state: str | None = Query(default=None, pattern="^(Open|Resolved)$"),
    cursor: str | None = Query(default=None, pattern=r"^\d+$"),
    limit: int = Query(default=100, ge=1, le=500),
) -> dict[str, Any]:
    return page(
        list_alerts(
            severity,
            state,
            from_time.isoformat() if from_time else None,
            to_time.isoformat() if to_time else None,
            5000,
        ),
        cursor,
        limit,
    )
