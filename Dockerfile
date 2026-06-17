# ---- Build stage ----
FROM python:3.11-slim AS builder

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install --timeout=300 --retries=5 -r requirements.txt && \
    pip install --no-cache-dir --prefix=/install supervisor

# ---- Runtime stage ----
FROM python:3.11-slim

LABEL maintainer="Nexus-AID Team"
LABEL description="Tunisia Disaster Detection - Module 4"

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application source
COPY src/ src/
COPY data/ data/
COPY requirements.txt .
COPY supervisord.conf /etc/supervisord.conf

# Create non-root user and grant runtime write access for daemon outputs
RUN useradd --create-home appuser \
    && mkdir -p /app/logs /app/data/cache \
    && chown -R appuser:appuser /app
USER appuser

# Expose FastAPI port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/status')" || exit 1

# Default: run supervisord which manages both the ML daemon and FastAPI
CMD ["supervisord", "-c", "/etc/supervisord.conf"]
