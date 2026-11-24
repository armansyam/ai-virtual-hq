FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    TZ=Asia/Makassar \
    APP_HOST=0.0.0.0 \
    APP_PORT=8484

RUN apt-get update && apt-get install -y --no-install-recommends \
      tzdata \
      curl \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY server.py index.html ./
COPY brand/ ./brand/

RUN mkdir -p config memory reports daily-content skills

EXPOSE 8484

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8484/api/public/live-state >/dev/null || exit 1

CMD ["python3", "-u", "server.py"]
