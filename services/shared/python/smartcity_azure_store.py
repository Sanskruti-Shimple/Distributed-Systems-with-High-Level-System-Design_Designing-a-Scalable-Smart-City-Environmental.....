import json
import os
import struct
from datetime import datetime, timezone
from io import BytesIO
from typing import Any

from azure.identity import DefaultAzureCredential
from azure.kusto.data import ClientRequestProperties, KustoClient, KustoConnectionStringBuilder
from azure.kusto.ingest import DataFormat, IngestionProperties, QueuedIngestClient
from sensor_contracts import SensorEvent

THRESHOLDS: dict[str, tuple[float, str]] = {
    "AQI": (100, "Warning"),
    "PM2.5": (35, "Warning"),
    "Temperature": (35, "Warning"),
    "Humidity": (80, "Informational"),
    "Noise": (75, "Critical"),
}


def _credential() -> DefaultAzureCredential:
    return DefaultAzureCredential()


def _sql_connection():
    import pyodbc

    server = os.environ["AZURE_SQL_SERVER"]
    database = os.getenv("AZURE_SQL_DATABASE", "smartcity")
    credential = _credential()
    access_token = credential.get_token("https://database.windows.net/.default").token
    token_bytes = access_token.encode("utf-16-le")
    token_struct = struct.pack("=I", len(token_bytes)) + token_bytes
    connection_string = (
        "Driver={ODBC Driver 18 for SQL Server};"
        f"Server=tcp:{server},1433;Database={database};"
        "Encrypt=yes;TrustServerCertificate=no;Connection Timeout=30;"
    )
    return pyodbc.connect(connection_string, attrs_before={1256: token_struct}, timeout=30)


def _adx_clients():
    uri = os.environ["ADX_CLUSTER_URI"].rstrip("/")
    database = os.getenv("ADX_DATABASE", "smartcity")
    credential = _credential()
    query_builder = KustoConnectionStringBuilder.with_azure_token_credential_authentication(
        uri, credential
    )
    ingest_uri = os.getenv("ADX_INGEST_URI") or uri.replace("https://", "https://ingest-", 1)
    ingest_builder = KustoConnectionStringBuilder.with_azure_token_credential_authentication(
        ingest_uri, credential
    )
    return KustoClient(query_builder), QueuedIngestClient(ingest_builder), database


def store_event(event: SensorEvent) -> bool:
    observed_at = event.observed_at.astimezone(timezone.utc).isoformat()
    connection = _sql_connection()
    try:
        cursor = connection.cursor()
        cursor.execute(
            """INSERT INTO dbo.SensorEvents (SensorId, EventId, ObservedAt)
               OUTPUT INSERTED.EventId
               SELECT ?, ?, ? WHERE NOT EXISTS
                 (SELECT 1 FROM dbo.SensorEvents WHERE SensorId=? AND EventId=?)""",
            event.device_id,
            event.event_id,
            observed_at,
            event.device_id,
            event.event_id,
        )
        inserted = cursor.fetchone() is not None
        cursor.execute(
            "IF NOT EXISTS (SELECT 1 FROM dbo.Locations WHERE Name=?) "
            "INSERT INTO dbo.Locations (Name) VALUES (?)",
            event.location,
            event.location,
        )
        cursor.execute("SELECT LocationId FROM dbo.Locations WHERE Name=?", event.location)
        location_id = cursor.fetchone()[0]
        cursor.execute(
            """MERGE dbo.Sensors AS target
               USING (SELECT ? AS SensorId, ? AS LocationId, ? AS LastSeenAt) AS source
               ON target.SensorId=source.SensorId
               WHEN MATCHED THEN UPDATE SET LocationId=source.LocationId,
                 LastSeenAt=CASE WHEN target.LastSeenAt IS NULL OR target.LastSeenAt < source.LastSeenAt
                   THEN source.LastSeenAt ELSE target.LastSeenAt END
               WHEN NOT MATCHED THEN INSERT (SensorId, LocationId, DeviceState, LastSeenAt)
                 VALUES (source.SensorId, source.LocationId, N'active', source.LastSeenAt);""",
            event.device_id,
            location_id,
            observed_at,
        )
        for reading in event.readings:
            cursor.execute(
                "IF NOT EXISTS (SELECT 1 FROM dbo.SensorMetrics WHERE SensorId=? AND Metric=?) "
                "INSERT INTO dbo.SensorMetrics (SensorId, Metric, Unit) VALUES (?, ?, ?)",
                event.device_id,
                reading.metric.value,
                event.device_id,
                reading.metric.value,
                reading.unit,
            )
            threshold = THRESHOLDS.get(reading.metric.value)
            if threshold and reading.value > threshold[0]:
                alert_id = f"{event.device_id}:{event.event_id}:{reading.metric.value}"
                cursor.execute(
                    """IF NOT EXISTS (SELECT 1 FROM dbo.SensorAlerts WHERE AlertId=?)
                       INSERT INTO dbo.SensorAlerts
                         (AlertId, SensorId, LocationId, ConditionText, Severity, State, CreatedAt)
                       VALUES (?, ?, ?, ?, ?, N'Open', ?);""",
                    alert_id,
                    alert_id,
                    event.device_id,
                    location_id,
                    f"{reading.metric.value} {reading.value:g} {reading.unit}; limit {threshold[0]:g}",
                    threshold[1],
                    observed_at,
                )
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()

    client, ingest_client, database = _adx_clients()
    records = [
        {
            "DeviceId": event.device_id,
            "EventId": event.event_id,
            "ObservedAt": observed_at,
            "Location": event.location,
            "Metric": reading.metric.value,
            "Value": reading.value,
            "Unit": reading.unit,
        }
        for reading in event.readings
    ]
    properties = IngestionProperties(
        database=database,
        table="SensorReadings",
        data_format=DataFormat.MULTIJSON,
        ingestion_mapping_reference="SensorReadingsMapping",
    )
    stream = BytesIO(b"\n".join(json.dumps(record).encode() for record in records))
    ingest_client.ingest_from_stream(stream, ingestion_properties=properties)
    client.close()
    ingest_client.close()
    return inserted


def _query(query: str, parameters: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    client, _, database = _adx_clients()
    properties = ClientRequestProperties()
    for name, value in (parameters or {}).items():
        properties.set_parameter(name, value)
    try:
        response = client.execute_query(database, query, properties)
        table = response.primary_results[0]
        columns = [column.column_name for column in table.columns]
        return [dict(zip(columns, row)) for row in table]
    finally:
        client.close()


def _freshness(timestamp: datetime) -> tuple[str, str]:
    observed = timestamp.replace(tzinfo=timezone.utc) if timestamp.tzinfo is None else timestamp
    seconds = max(0, int((datetime.now(timezone.utc) - observed).total_seconds()))
    label = f"{seconds} sec ago" if seconds < 60 else f"{seconds // 60} min ago"
    return label, "offline" if seconds > 900 else "delayed" if seconds > 180 else "online"


def list_sensors(
    location: str | None = None,
    metric: str | None = None,
    state: str | None = None,
) -> list[dict[str, Any]]:
    connection = _sql_connection()
    try:
        cursor = connection.cursor()
        cursor.execute(
            """SELECT s.SensorId, l.Name, s.LastSeenAt FROM dbo.Sensors s
               JOIN dbo.Locations l ON l.LocationId=s.LocationId WHERE s.DeviceState=N'active'
               ORDER BY s.SensorId"""
        )
        sensors = cursor.fetchall()
    finally:
        connection.close()
    if not sensors:
        return []
    ids = [row[0] for row in sensors]
    query = """declare query_parameters (sensorIds:dynamic);
               SensorReadings | where DeviceId in (sensorIds)
               | summarize arg_max(ObservedAt, *) by DeviceId, Metric
               | order by ObservedAt desc"""
    readings = _query(query, {"sensorIds": ids})
    by_sensor: dict[str, list[dict[str, Any]]] = {}
    for reading in readings:
        by_sensor.setdefault(reading["DeviceId"], []).append(
            {
                "sensorId": reading["DeviceId"],
                "metric": reading["Metric"],
                "value": reading["Value"],
                "unit": reading["Unit"],
                "observedAt": reading["ObservedAt"].isoformat(),
            }
        )
    result = []
    for row in sensors:
        sensor_id, sensor_location, last_seen = row
        freshness, current_state = _freshness(last_seen)
        if location and sensor_location != location:
            continue
        if state and current_state != state:
            continue
        sensor_readings = by_sensor.get(sensor_id, [])
        metrics = [reading["metric"] for reading in sensor_readings]
        if metric and metric not in metrics:
            continue
        if metric:
            sensor_readings = [reading for reading in sensor_readings if reading["metric"] == metric]
            metrics = [metric]
        result.append(
            {
                "id": sensor_id,
                "location": sensor_location,
                "metrics": metrics,
                "latestReadings": sensor_readings,
                "state": current_state,
                "freshnessLabel": freshness,
                "observedAt": last_seen.isoformat(),
            }
        )
    return result


def get_sensor(sensor_id: str) -> dict[str, Any] | None:
    return next((sensor for sensor in list_sensors() if sensor["id"] == sensor_id), None)


def list_readings(
    from_time: str,
    to_time: str,
    location: str | None = None,
    metric: str | None = None,
    limit: int = 100,
) -> list[dict[str, Any]]:
    filters = ["ObservedAt between (fromTime .. toTime)"]
    parameters: dict[str, Any] = {
        "fromTime": datetime.fromisoformat(from_time),
        "toTime": datetime.fromisoformat(to_time),
    }
    if location:
        filters.append("Location == selectedLocation")
        parameters["selectedLocation"] = location
    if metric:
        filters.append("Metric == selectedMetric")
        parameters["selectedMetric"] = metric
    query = (
        "declare query_parameters (fromTime:datetime, toTime:datetime, "
        "selectedLocation:string = '', selectedMetric:string = '');\n"
        f"SensorReadings | where {' and '.join(filters)} "
        "| summarize arg_max(ObservedAt, *) by DeviceId, EventId, Metric "
        f"| order by ObservedAt desc | take {limit}"
    )
    return [
        {
            "sensorId": row["DeviceId"],
            "metric": row["Metric"],
            "value": row["Value"],
            "unit": row["Unit"],
            "observedAt": row["ObservedAt"].isoformat(),
        }
        for row in _query(query, parameters)
    ]


def list_alerts(
    severity: str | None = None,
    state: str | None = None,
    from_time: str | None = None,
    to_time: str | None = None,
    limit: int = 100,
) -> list[dict[str, Any]]:
    clauses = ["1=1"]
    parameters: list[Any] = []
    for column, value in (("a.Severity", severity), ("a.State", state)):
        if value:
            clauses.append(f"{column}=?")
            parameters.append(value)
    if from_time:
        clauses.append("a.CreatedAt>=?")
        parameters.append(from_time)
    if to_time:
        clauses.append("a.CreatedAt<=?")
        parameters.append(to_time)
    connection = _sql_connection()
    try:
        cursor = connection.cursor()
        cursor.execute(
            """SELECT a.AlertId, a.SensorId, l.Name, a.ConditionText, a.Severity,
                      a.State, a.CreatedAt FROM dbo.SensorAlerts a
               JOIN dbo.Locations l ON l.LocationId=a.LocationId WHERE """
            + " AND ".join(clauses)
            + " ORDER BY a.CreatedAt DESC OFFSET 0 ROWS FETCH NEXT ? ROWS ONLY",
            *parameters,
            limit,
        )
        rows = cursor.fetchall()
    finally:
        connection.close()
    return [
        {
            "id": row[0],
            "sensorId": row[1],
            "location": row[2],
            "condition": row[3],
            "severity": row[4],
            "state": row[5],
            "createdAt": row[6].isoformat(),
            "timeLabel": row[6].strftime("%H:%M"),
        }
        for row in rows
    ]