.PHONY: help install dev build test lint clean docker-build docker-up

help:
	@echo "Available commands:"
	@echo "  install       Install dependencies"
	@echo "  dev           Start development server"
	@echo "  build         Build for production"
	@echo "  test          Run tests"
	@echo "  lint          Run linter"
	@echo "  clean         Remove build artifacts"
	@echo "  docker-build  Build Docker image"
	@echo "  docker-up     Run with docker-compose"

install:
	npm install

dev:
	npm run dev

build:
	npm run build

test:
	npm test

lint:
	npm run lint

clean:
	rm -rf dist node_modules

docker-build:
	docker build -t genesis:latest .

docker-up:
	docker-compose up -d
