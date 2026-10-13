FROM python:3.12-slim-bookworm
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PYTHONPATH=/app/shared
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl gnupg \
	&& curl -fsSL https://packages.microsoft.com/config/debian/12/packages-microsoft-prod.deb -o /tmp/msprod.deb \
	&& dpkg -i /tmp/msprod.deb && rm /tmp/msprod.deb \
	&& apt-get update && ACCEPT_EULA=Y apt-get install -y --no-install-recommends msodbcsql18 unixodbc \
	&& rm -rf /var/lib/apt/lists/*
COPY services/shared/python /app/shared
RUN pip install --no-cache-dir -e /app/shared
COPY services/rest-api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY services/rest-api/src ./src
USER 10001:10001
EXPOSE 8001
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8001"]