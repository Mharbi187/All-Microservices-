"""
RabbitMQ messaging for Disaster Detection (MS4).

Publishes disaster.alert events to the nexusaid.exchange topic exchange.
Implements retry-with-exponential-backoff to prevent silent data loss (C1 fix).
"""

import json
import logging
import time
import pika
import os
from datetime import datetime

logger = logging.getLogger(__name__)

RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "localhost")
RABBITMQ_PORT = int(os.getenv("RABBITMQ_PORT", "5672"))
RABBITMQ_USER = os.getenv("RABBITMQ_USER", "guest")
RABBITMQ_PASS = os.getenv("RABBITMQ_PASS", "guest")

NEXUSAID_EXCHANGE = "nexusaid.exchange"
DISASTER_ROUTING_KEY = "disaster.alert"

# Retry configuration
MAX_RETRIES = int(os.getenv("RABBITMQ_MAX_RETRIES", "5"))
INITIAL_BACKOFF_SEC = float(os.getenv("RABBITMQ_INITIAL_BACKOFF", "1.0"))
MAX_BACKOFF_SEC = float(os.getenv("RABBITMQ_MAX_BACKOFF", "30.0"))

# --- Metrics counters (for observability) ---
_publish_success_count = 0
_publish_failure_count = 0


def get_publish_metrics() -> dict:
    """Return publish success/failure counters for /status endpoint."""
    return {
        "rabbitmq_publish_success": _publish_success_count,
        "rabbitmq_publish_failure": _publish_failure_count,
    }


def _get_connection_parameters() -> pika.ConnectionParameters:
    """Build RabbitMQ connection parameters from environment."""
    url = os.getenv("RABBITMQ_URL")
    if url:
        return pika.URLParameters(url)
    credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASS)
    return pika.ConnectionParameters(
        host=RABBITMQ_HOST,
        port=RABBITMQ_PORT,
        credentials=credentials,
        connection_attempts=3,
        retry_delay=2,
    )


def publish_disaster_alert(
    region: str, disaster_type: str, severity: str, risk_score: float
) -> bool:
    """
    Publish a disaster alert to the RabbitMQ event bus for MS1/MS3 consumption.

    Uses exponential backoff retry to guarantee delivery. Returns True if
    the message was successfully published, False otherwise (after all retries
    exhausted).

    BEFORE (C1 vulnerability):
        Single try/except that silently swallowed the error.
        A RabbitMQ outage meant the disaster alert was PERMANENTLY LOST.

    AFTER (C1 fix):
        Retries up to MAX_RETRIES times with exponential backoff.
        Logs a CRITICAL alarm if all retries fail.
        Returns a boolean so callers can act on failure.
    """
    global _publish_success_count, _publish_failure_count

    event = {
        "eventType": "DISASTER_DETECTED",
        "region": region,
        "disasterType": disaster_type,
        "severity": severity,
        "riskScore": risk_score,
        "timestamp": datetime.now().isoformat(),
        "source": "disaster-detection",
    }

    parameters = _get_connection_parameters()

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            connection = pika.BlockingConnection(parameters)
            channel = connection.channel()

            # Ensure exchange exists (Topic exchange as configured in Java MS1)
            channel.exchange_declare(
                exchange=NEXUSAID_EXCHANGE, exchange_type="topic", durable=True
            )

            channel.basic_publish(
                exchange=NEXUSAID_EXCHANGE,
                routing_key=DISASTER_ROUTING_KEY,
                body=json.dumps(event),
                properties=pika.BasicProperties(
                    delivery_mode=2,  # persistent
                    content_type="application/json",
                ),
            )

            connection.close()
            _publish_success_count += 1
            logger.info(
                "Published disaster alert to RabbitMQ (attempt %d/%d): %s in %s",
                attempt, MAX_RETRIES, disaster_type, region,
            )
            return True

        except Exception as e:
            backoff = min(INITIAL_BACKOFF_SEC * (2 ** (attempt - 1)), MAX_BACKOFF_SEC)
            logger.warning(
                "RabbitMQ publish attempt %d/%d failed: %s — retrying in %.1fs",
                attempt, MAX_RETRIES, e, backoff,
            )
            time.sleep(backoff)

    # All retries exhausted — this is a CRITICAL operational failure
    _publish_failure_count += 1
    logger.critical(
        "ALERT: Failed to publish disaster alert after %d retries! "
        "Event LOST: %s in %s (severity=%s, risk=%.4f). "
        "Immediate operator intervention required.",
        MAX_RETRIES, disaster_type, region, severity, risk_score,
    )
    return False
