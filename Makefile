SHELL := /bin/bash

.PHONY: dev
.PHONY: stop
.PHONY: logs
.PHONY: test
.PHONY: lint
.PHONY: migrate
.PHONY: seed
.PHONY: reset-db

# Development
dev:
	./scripts/dev.sh

stop:
	./scripts/stop.sh

logs:
	./scripts/logs.sh

# Testing
test:
	./scripts/test.sh

lint:
	./scripts/lint.sh

# Database
migrate:
	./scripts/migrate.sh

seed:
	./scripts/seed.sh

reset-db:
	./scripts/reset-db.sh

# Build and check
build:
	docker compose build

check:
	./scripts/dev.sh --check