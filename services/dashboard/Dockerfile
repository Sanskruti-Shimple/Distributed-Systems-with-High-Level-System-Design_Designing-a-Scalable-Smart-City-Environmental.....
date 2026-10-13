FROM cgr.dev/chainguard/node:22-dev AS build
USER root
WORKDIR /app
RUN chown 65532:65532 /app
USER 65532:65532
COPY services/dashboard/package*.json ./
RUN npm install --no-audit --no-fund
COPY services/dashboard ./
ARG VITE_API_BASE_URL=
ARG VITE_INGESTION_BASE_URL=/ingestion
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL VITE_INGESTION_BASE_URL=$VITE_INGESTION_BASE_URL
RUN npm run build

FROM cgr.dev/chainguard/nginx:latest
COPY services/dashboard/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080