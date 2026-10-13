import json
import os
import random
import time
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timezone

INGEST_URL = os.getenv("INGEST_URL", "http://ingestion:8000/api/v1/ingest/readings")
DEVICE_TOKEN = os.getenv("SIMULATOR_DEVICE_TOKEN", "")
DEVICES = [
    ("MV-021", "Civic Center, Downtown"),
    ("MV-034", "Riverside Park"),
    ("MV-048", "East Market"),
    ("MV-017", "West Station"),
]


def submit(device_id: str, location: str) -> None:
    temperature = round(random.uniform(18, 34), 1)
    pm25 = round(random.uniform(4, 43), 1)
    payload = {
        "deviceId": device_id,
        "eventId": str(uuid.uuid4()),
        "observedAt": datetime.now(timezone.utc).isoformat(),
        "location": location,
        "readings": [
            {"metric": "AQI", "value": round(pm25 * 2.1), "unit": "AQI"},
            {"metric": "PM2.5", "value": pm25, "unit": "ug/m3"},
            {"metric": "Temperature", "value": temperature, "unit": "C"},
            {"metric": "Humidity", "value": round(random.uniform(30, 86)), "unit": "%"},
            {"metric": "Noise", "value": round(random.uniform(42, 82), 1), "unit": "dBA"},
        ],
    }
    headers = {"Content-Type": "application/json"}
    if DEVICE_TOKEN:
        headers["X-Device-Token"] = DEVICE_TOKEN
    request = urllib.request.Request(
        INGEST_URL,
        data=json.dumps(payload).encode(),
        headers=headers,
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            print(f"{device_id}: accepted ({response.status})", flush=True)
    except (urllib.error.URLError, TimeoutError) as error:
        print(f"{device_id}: ingestion unavailable: {error}", flush=True)


if __name__ == "__main__":
    while True:
        for device, place in DEVICES:
            submit(device, place)
        time.sleep(5)