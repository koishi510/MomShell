FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /server cmd/server/main.go

FROM alpine:3.20
RUN apk --no-cache add ca-certificates tzdata \
    && addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY --from=builder /server .
RUN chmod 555 /app/server
USER appuser
EXPOSE 8000
CMD ["./server"]
