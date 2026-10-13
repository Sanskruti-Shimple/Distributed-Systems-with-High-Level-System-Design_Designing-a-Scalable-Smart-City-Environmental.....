FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY services/shared/python /tmp/sensor-contracts
RUN pip install --no-cache-dir /tmp/sensor-contracts
COPY services/iot-ingestion/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY services/iot-ingestion/src ./src
EXPOSE 8000
USER 10001:10001
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]