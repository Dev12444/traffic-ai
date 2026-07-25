# Optional container image for the inference API (alternative to Render's native
# Python runtime). Builds a slim CPU-only image serving app.main:app.
FROM python:3.10-slim

WORKDIR /app

# System libs occasionally needed by numpy/torch wheels.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 && rm -rf /var/lib/apt/lists/*

COPY requirements-api.txt .
RUN pip install --no-cache-dir -r requirements-api.txt

COPY src ./src
COPY app ./app
COPY models ./models

ENV PORT=8000
EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
