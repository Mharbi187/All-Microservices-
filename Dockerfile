FROM python:3.11-slim

WORKDIR /app

# Install Python server dependencies only (no heavy ML libs)
RUN pip install --no-cache-dir \
    fastapi==0.111.0 \
    uvicorn==0.30.0 \
    websockets \
    py-eureka-client==0.11.13 \
    python-multipart

# Copy just the server entry point
COPY server.py .

# Create a stub for the vision system so the import doesn't crash at startup
RUN mkdir -p cpr_vision_system && \
    echo "class CPRPipeline:\n    def __init__(self, session_id=None): pass\n    async def process(self, frame, meta): return {'status': 'STUB'}\n    def cleanup(self): pass" > cpr_vision_system/pipeline.py && \
    touch cpr_vision_system/__init__.py

EXPOSE 8000

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
