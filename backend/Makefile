.PHONY: run build test clean

run:
	go run cmd/server/main.go

build:
	go build -o bin/server cmd/server/main.go

test:
	go test ./...

clean:
	rm -rf bin/
