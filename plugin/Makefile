.PHONY: all install build build-proto build-descriptors build-all clean run dev help

all: build-all

install:
	@echo "Installing dependencies..."
	npm ci

build:
	@echo "Building TypeScript..."
	npm run build

build-proto:
	@echo "Regenerating protobuf code from .proto files..."
	npm run build:proto

build-descriptors:
	@echo "Generating proto descriptors..."
	npm run build:descriptors

build-all: install
	@echo "Full build: proto -> descriptors -> TypeScript..."
	npm run build:all

clean:
	@echo "Cleaning build artifacts..."
	rm -rf dist/ node_modules/

run:
	@echo "Running Canopy Circle plugin..."
	npm start

dev:
	@echo "Running in development mode with hot reload..."
	npm run dev

help:
	@echo "Canopy Circle Plugin — make targets:"
	@echo "  build-all   Full rebuild (install + proto + descriptors + TS)"
	@echo "  build       TypeScript compilation only"
	@echo "  build-proto Regenerate protobuf code from .proto files"
	@echo "  install     npm ci"
	@echo "  run         Start the compiled plugin"
	@echo "  dev         Start with hot reload (nodemon)"
	@echo "  clean       Remove dist/ and node_modules/"
