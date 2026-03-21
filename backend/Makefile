.PHONY: run build test lint clean

run:
	go run cmd/server/main.go

build:
	go build -o bin/server cmd/server/main.go

test:
	go test ./...

lint:
	golangci-lint run ./...

clean:
	rm -rf bin/
