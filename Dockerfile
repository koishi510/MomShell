# ---- Stage 1: Build frontend ----
FROM node:24-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# ---- Stage 2: Build backend ----
FROM golang:1.25-alpine AS backend-builder
WORKDIR /app
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ .
RUN CGO_ENABLED=0 go build -o /server cmd/server/main.go

# ---- Stage 3: Final image ----
FROM nginx:alpine
RUN apk --no-cache add ca-certificates tzdata postgresql postgresql-contrib

# Nginx config
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Frontend static files
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# Backend binary
COPY --from=backend-builder /server /app/server

# Entrypoint: start backend + nginx
COPY deploy/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 7860
CMD ["/entrypoint.sh"]
