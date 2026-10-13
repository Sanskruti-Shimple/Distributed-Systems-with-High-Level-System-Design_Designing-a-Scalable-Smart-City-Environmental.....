import json
import logging
import os
import time

from confluent_kafka import Consumer, KafkaError, Producer
from pydantic import ValidationError
from sensor_contracts import SensorEvent
from smartcity_store import initialize, store_event

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("stream-processor")


def run() -> None:
    brokers = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "redpanda:9092")
    topic = os.getenv("KAFKA_TOPIC", "sensor-readings")
    dead_letter_topic = os.getenv("KAFKA_DEAD_LETTER_TOPIC", "sensor-readings-dead-letter")
    kafka_config = {"bootstrap.servers": brokers}
    sasl_password = os.getenv("KAFKA_SASL_PASSWORD")
    if sasl_password:
        kafka_config.update(
            {
                "security.protocol": "SASL_SSL",
                "sasl.mechanism": "PLAIN",
                "sasl.username": os.getenv("KAFKA_SASL_USERNAME", "$ConnectionString"),
                "sasl.password": sasl_password,
            }
        )
    consumer = Consumer(
        {
            **kafka_config,
            "group.id": "metrovale-processor-v1",
            "auto.offset.reset": "earliest",
            "enable.auto.commit": False,
        }
    )
    dead_letters = Producer(kafka_config)
    consumer.subscribe([topic])
    initialize()
    logger.info("Consuming topic %s", topic)
    try:
        while True:
            message = consumer.poll(1.0)
            if message is None:
                continue
            if message.error():
                if message.error().code() != KafkaError._PARTITION_EOF:
                    logger.error("Broker error: %s", message.error())
                continue
            try:
                event = SensorEvent.model_validate_json(message.value())
                inserted = store_event(event)
                logger.info("Processed event=%s inserted=%s", event.event_id, inserted)
            except (ValidationError, ValueError, json.JSONDecodeError):
                dead_letters.produce(dead_letter_topic, key=message.key(), value=message.value())
                dead_letters.flush(5)
                logger.exception("Invalid message routed to %s", dead_letter_topic)
            consumer.commit(message=message, asynchronous=False)
    finally:
        consumer.close()


if __name__ == "__main__":
    while True:
        try:
            run()
        except Exception:
            logger.exception("Processor stopped; retrying broker connection")
            time.sleep(3)