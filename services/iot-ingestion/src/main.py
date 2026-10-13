import json
import os
from typing import Any

from fastapi import FastAPI, Header, HTTPException, status
from pydantic import ValidationError
from sensor_contracts import SensorEvent

app = FastAPI(title="Metrovale IoT Ingestion", version="1.0.0")
TOPIC = os.getenv("KAFKA_TOPIC", "sensor-readings")


def publish_event(event: SensorEvent) -> None:
    bootstrap_servers = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
    from confluent_kafka import Producer

    config = {"bootstrap.servers": bootstrap_servers}
    sasl_password = os.getenv("KAFKA_SASL_PASSWORD")
    if sasl_password:
        config.update(
            {
                "security.protocol": "SASL_SSL",
                "sasl.mechanism": "PLAIN",
                "sasl.username": os.getenv("KAFKA_SASL_USERNAME", "$ConnectionString"),
                "sasl.password": sasl_password,
            }
        )
    producer = Producer(config)
    key = f"{event.device_id}:{event.event_id}"
    producer.produce(
        TOPIC,
        key=key.encode(),
        value=json.dumps(event.model_dump(mode="json", by_alias=True)).encode(),
    )
    remaining = producer.flush(5)
    if remaining:
        raise TimeoutError("Kafka publish timed out")


def authorize_device(device_token: str | None) -> None:
    configured_tokens = {
        token.strip()
        for token in os.getenv("DEVICE_TOKENS", "").split(",")
        if token.strip()
    }
    if configured_tokens and device_token not in configured_tokens:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid device token")


@app.get("/health/live")
def liveness() -> dict[str, str]:
    return {"status": "alive"}


@app.get("/health/ready")
def readiness() -> dict[str, str]:
    return {"status": "ready"}


@app.post("/api/v1/ingest/readings", status_code=status.HTTP_202_ACCEPTED)
def ingest_readings(
    payload: dict[str, Any],
    x_device_token: str | None = Header(default=None),
) -> dict[str, str | int]:
    authorize_device(x_device_token)
    try:
        event = SensorEvent.model_validate(payload)
    except ValidationError as error:
        raise HTTPException(
            status_code=422,
            detail=error.errors(include_context=False),
        ) from error

    try:
        publish_event(event)
    except Exception as error:
        raise HTTPException(status_code=503, detail="Event broker unavailable") from error
    return {"accepted": len(event.readings), "eventId": event.event_id}