FROM python:3.12-slim

WORKDIR /app

COPY server.py index.html three.min.js .env.example ./
COPY config/company_profile.example.json ./config/company_profile.example.json

RUN mkdir -p /app/config /app/reports /app/daily-content /app/uploads

EXPOSE 8484

ENV APP_HOST=0.0.0.0 \
    APP_PORT=8484 \
    PYTHONUNBUFFERED=1

CMD ["python3", "-u", "server.py"]
