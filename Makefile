# ==================================================
#  IA Imobiliária — Makefile
# ==================================================
# Monorepo with three components:
#   backend  -> ai-backendd-imobiliaria  (Laravel 12 + Sail)
#   frontend -> ai-front-end-imobiliaria (Next.js 16)
#   scraper  -> crawler-machine          (Python .venv)
#
# Run `make help` to list every target.

# ---- Directories --------------------------------------------------
BACKEND_DIR   := ai-backendd-imobiliaria
FRONTEND_DIR  := ai-front-end-imobiliaria
CRAWLER_DIR   := crawler-machine

# ---- Tooling ------------------------------------------------------
SAIL    := ./vendor/bin/sail
VENV    := $(CRAWLER_DIR)/.venv
PYTHON  := $(VENV)/bin/python
PIP     := $(VENV)/bin/pip
PYTEST  := $(VENV)/bin/pytest

.DEFAULT_GOAL := help
.PHONY: help \
        up start \
        install install-backend install-frontend install-crawler \
        dev-backend dev-frontend \
        test test-backend test-frontend test-crawler \
        lint lint-backend lint-frontend format-backend \
        build build-frontend \
        backend-stop clean

# ==================================================
#  Help
# ==================================================
help: ## Show this help
	@echo ""
	@echo "IA Imobiliária — comandos disponíveis:"
	@echo ""
	@print_target() { \
		target="$$1"; \
		awk -v target="$$target" 'BEGIN {FS = ":.*?## "} /^[A-Za-z0-9_-]/ && /##/ { split($$1, names, " "); for (i in names) if (names[i] == target) { printf "  \033[36m%-28s\033[0m %s\n", $$1, $$2; exit } }' $(MAKEFILE_LIST); \
	}; \
	printf "\033[1mGlobal\033[0m\n"; \
	print_target up; \
	print_target install; \
	print_target test; \
	print_target lint; \
	print_target clean; \
	echo ""; \
	printf "\033[1mBackend / Laravel\033[0m\n"; \
	print_target install-backend; \
	print_target dev-backend; \
	print_target test-backend; \
	print_target lint-backend; \
	print_target format-backend; \
	print_target migrate; \
	print_target migrate-status; \
	print_target migrate-rollback; \
	print_target migrate-refresh; \
	print_target migrate-fresh; \
	print_target seed; \
	print_target migrate-fresh-seed; \
	print_target backend-stop; \
	echo ""; \
	printf "\033[1mFrontend / Next.js\033[0m\n"; \
	print_target install-frontend; \
	print_target dev-frontend; \
	print_target build; \
	print_target test-frontend; \
	print_target lint-frontend; \
	echo ""; \
	printf "\033[1mScraper / crawler-machine\033[0m\n"; \
	print_target install-crawler; \
	print_target test-crawler; \
	echo ""

# ==================================================
#  Full stack
# ==================================================
up start: ## Start backend (Sail) + frontend together via start.sh
	./start.sh

install: install-backend install-frontend install-crawler ## Install dependencies for every component

# ==================================================
#  Backend (Laravel + Sail)
# ==================================================
install-backend: ## Install backend dependencies (composer setup)
	cd $(BACKEND_DIR) && composer install && composer run setup

dev-backend: ## Run the backend dev stack (server, queue, logs, vite)
	cd $(BACKEND_DIR) && composer run dev

test-backend: ## Run backend PHPUnit tests
	cd $(BACKEND_DIR) && composer test

lint-backend: ## Check backend code style with Pint (dry run)
	cd $(BACKEND_DIR) && vendor/bin/pint --test

format-backend: ## Fix backend code style with Pint
	cd $(BACKEND_DIR) && vendor/bin/pint

migrate: ## Run pending database migrations
	cd $(BACKEND_DIR) && $(SAIL) artisan migrate

migrate-fresh: ## Drop all tables and re-run all migrations
	cd $(BACKEND_DIR) && $(SAIL) artisan migrate:fresh

migrate-refresh: ## Rollback all migrations and re-run them
	cd $(BACKEND_DIR) && $(SAIL) artisan migrate:refresh

migrate-rollback: ## Rollback the last database migration batch
	cd $(BACKEND_DIR) && $(SAIL) artisan migrate:rollback

migrate-status: ## Show the status of each migration
	cd $(BACKEND_DIR) && $(SAIL) artisan migrate:status

seed: ## Run the database seeders
	cd $(BACKEND_DIR) && $(SAIL) artisan db:seed

migrate-fresh-seed: ## Drop all tables, re-run migrations, and seed
	cd $(BACKEND_DIR) && $(SAIL) artisan migrate:fresh --seed

backend-stop: ## Stop the Sail Docker containers
	cd $(BACKEND_DIR) && ./vendor/bin/sail stop

# ==================================================
#  Frontend (Next.js)
# ==================================================
install-frontend: ## Install frontend npm dependencies
	cd $(FRONTEND_DIR) && npm install

dev-frontend: ## Run the Next.js dev server
	cd $(FRONTEND_DIR) && npm run dev

build build-frontend: ## Build the frontend for production
	cd $(FRONTEND_DIR) && npm run build

test-frontend: ## Run frontend Vitest suite
	cd $(FRONTEND_DIR) && npm test

lint-frontend: ## Lint the frontend with ESLint
	cd $(FRONTEND_DIR) && npm run lint

# ==================================================
#  Scraper (crawler-machine)
# ==================================================
install-crawler: ## Create the crawler-machine venv and install requirements
	test -d $(VENV) || python3 -m venv $(VENV)
	$(PIP) install -r $(CRAWLER_DIR)/requirements.txt

test-crawler: ## Run the crawler-machine test suite
	cd $(CRAWLER_DIR) && ../$(PYTHON) -m pytest tests

# ==================================================
#  Aggregate test / lint
# ==================================================
test: test-backend test-frontend test-crawler ## Run all test suites

lint: lint-backend lint-frontend ## Lint backend and frontend

# ==================================================
#  Cleanup
# ==================================================
clean: ## Remove local build artifacts and caches
	rm -rf $(FRONTEND_DIR)/.next
	rm -rf .pytest_cache $(CRAWLER_DIR)/.pytest_cache
	find . -type d -name __pycache__ -prune -exec rm -rf {} + 2>/dev/null || true
	@echo "Clean complete."
