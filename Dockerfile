FROM python:3.11-slim

WORKDIR /app

# Install Python server dependencies only (no heavy ML libs)
RUN pip install --no-cache-dir \
    fastapi==0.111.0 \
    uvicorn==0.30.0 \
    websockets \
    py-eureka-client==0.11.13 \
    python-multipart

# Copy the actual vision system and all Python files
COPY . .

# IMPORTANT: Ensure the vision system dependencies like mediapipe and ultralytics are met.
# OpenCV Headless is needed to avoid libGL dependencies inside standard slim containers.
RUN pip install opencv-python-headless mediapipe ultralytics PyJWT cryptography

EXPOSE 8000

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
