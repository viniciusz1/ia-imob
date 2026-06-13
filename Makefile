# ==================================================
#  🏠 IA Imobiliária — Makefile
# ==================================================
# Monorepo with four components:
#   backend     -> ai-backendd-imobiliaria  (Laravel 12 + Sail)
#   frontend    -> ai-front-end-imobiliaria (Next.js 16)
#   scraper     -> imobscrapy               (Scrapy, Python .venv)
#   cadastrador -> cadastrador              (FastAPI onboarding service)
#
# Run `make help` to list every target.

# ---- Directories --------------------------------------------------
BACKEND_DIR   := ai-backendd-imobiliaria
FRONTEND_DIR  := ai-front-end-imobiliaria
SCRAPER_DIR   := imobscrapy
CADASTRADOR_DIR := cadastrador

# ---- Tooling ------------------------------------------------------
SAIL    := ./vendor/bin/sail
VENV    := $(SCRAPER_DIR)/.venv
PYTHON  := $(VENV)/bin/python
PIP     := $(VENV)/bin/pip
PYTEST  := $(VENV)/bin/pytest
UVICORN := $(VENV)/bin/uvicorn
CADASTRADOR_VENV := .venv
CADASTRADOR_PYTHON := $(abspath $(CADASTRADOR_VENV))/bin/python
CADASTRADOR_PIP := $(abspath $(CADASTRADOR_VENV))/bin/pip
CADASTRADOR_UVICORN := $(abspath $(CADASTRADOR_VENV))/bin/uvicorn

# Cadastrador onboarding service host/port
CADASTRADOR_HOST ?= 0.0.0.0
CADASTRADOR_PORT ?= 8000
VERBOSE ?= 0
INSPECTION_PACKAGE ?= millar:v1
CREATE_INSPECTION_PACKAGE ?=
INSPECTION_SAMPLE_SIZE ?= 5
INIT_URL ?= 0
AGENCY ?=
FORCE ?= 0
DB_INSPECTION_PACKAGE ?= db-rich:v1

.DEFAULT_GOAL := help
.PHONY: help \
        up start \
        install install-backend install-frontend install-scraper install-cadastrador \
        dev-backend dev-frontend dev-scraper cadastrador inspect-cadastrador create-inspection-package \
        create-db-inspection-package inspect-db-cadastrador \
        test test-backend test-frontend test-scraper test-cadastrador \
        lint lint-backend lint-frontend format-backend \
        build build-frontend \
        crawl crawl-sitemap crawl-api \
        backend-stop clean

# ==================================================
#  Help
# ==================================================
help: ## Show this help
	@echo ""
	@echo "🏠 IA Imobiliária — comandos disponíveis:"
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
	printf "\033[1mScraper / Imobscrapy\033[0m\n"; \
	print_target install-scraper; \
	print_target dev-scraper; \
	print_target crawl; \
	print_target crawl-sitemap; \
	print_target crawl-api; \
	print_target test-scraper; \
	echo ""; \
	printf "\033[1mCadastrador / Inspector\033[0m\n"; \
	print_target install-cadastrador; \
	print_target cadastrador; \
	print_target test-cadastrador; \
	print_target inspect-cadastrador; \
	print_target create-inspection-package; \
	print_target create-db-inspection-package; \
	print_target inspect-db-cadastrador
	@echo ""

# ==================================================
#  Full stack
# ==================================================
up start: ## Start backend (Sail) + frontend together via start.sh
	./start.sh

install: install-backend install-frontend install-scraper install-cadastrador ## Install dependencies for every component

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
#  Scraper (imobscrapy)
# ==================================================
install-scraper: ## Create the imobscrapy venv and install requirements
	test -d $(VENV) || python3 -m venv $(VENV)
	$(PIP) install -r $(SCRAPER_DIR)/requirements.txt

dev-scraper: crawl ## Alias for the default crawl

crawl: ## Run the WSM listing/pagination spider (imobscrapy)
	cd $(SCRAPER_DIR) && ../$(PYTHON) -m scrapy crawl imobscrapy

crawl-sitemap: ## Run the sitemap-driven spider
	cd $(SCRAPER_DIR) && ../$(PYTHON) -m scrapy crawl sitemap

crawl-api: ## Run the API-endpoint spider
	cd $(SCRAPER_DIR) && ../$(PYTHON) -m scrapy crawl apispider

test-scraper: ## Run the agency extraction test suite
	cd $(SCRAPER_DIR) && ../$(PYTHON) -m pytest tests

# ==================================================
#  Cadastrador (FastAPI onboarding service)
# ==================================================
install-cadastrador: ## Create the Cadastrador venv and install dependencies
	test -d $(CADASTRADOR_VENV) || python3 -m venv $(CADASTRADOR_VENV)
	$(CADASTRADOR_PIP) install -e '$(CADASTRADOR_DIR)[test]'

cadastrador: ## Start the Cadastrador FastAPI service
	cd $(CADASTRADOR_DIR) && $(CADASTRADOR_UVICORN) app.main:app --host $(CADASTRADOR_HOST) --port $(CADASTRADOR_PORT) $(if $(filter 1,$(VERBOSE)),--log-level debug --reload,)

test-cadastrador: ## Run the Cadastrador test suite
	cd $(CADASTRADOR_DIR) && $(CADASTRADOR_PYTHON) -m pytest tests/

ic: ## Run Cadastrador inspection bench (set INSPECTION_PACKAGE=agency:v1)
	cd $(CADASTRADOR_DIR) && $(CADASTRADOR_PYTHON) -m app.inspection run $(INSPECTION_PACKAGE) --llm

create-inspection-package: ## Create inspector samples from sitemap (set SITEMAP_URL=...)
	@test -n "$(SITEMAP_URL)" || (echo "Use: make create-inspection-package SITEMAP_URL=https://site.test/sitemap.xml [INIT_URL=50] [CREATE_INSPECTION_PACKAGE=agency:v1] [AGENCY='Agency Name'] [FORCE=1]"; exit 1)
	cd $(CADASTRADOR_DIR) && $(CADASTRADOR_PYTHON) -m app.inspection create-package --sitemap-url "$(SITEMAP_URL)" --sample-size $(INSPECTION_SAMPLE_SIZE) --init-url $(INIT_URL) $(if $(CREATE_INSPECTION_PACKAGE),--package "$(CREATE_INSPECTION_PACKAGE)",) $(if $(AGENCY),--agency "$(AGENCY)",) $(if $(filter 1,$(FORCE)),--force,)

create-db-inspection-package: ## Create inspector samples from scrapy-properties DB rows
	cd $(CADASTRADOR_DIR) && $(CADASTRADOR_PYTHON) -m app.inspection create-db-package --package "$(DB_INSPECTION_PACKAGE)" --sample-size $(INSPECTION_SAMPLE_SIZE) $(if $(AGENCY),--agency "$(AGENCY)",) $(if $(filter 1,$(FORCE)),--force,)

inspect-db-cadastrador: create-db-inspection-package ## Create DB-backed inspector package and run it
	$(MAKE) ic INSPECTION_PACKAGE="$(DB_INSPECTION_PACKAGE)"

# ==================================================
#  Aggregate test / lint
# ==================================================
test: test-backend test-frontend test-scraper test-cadastrador ## Run all test suites

lint: lint-backend lint-frontend ## Lint backend and frontend

# ==================================================
#  Cleanup
# ==================================================
clean: ## Remove local build artifacts and caches
	rm -rf $(FRONTEND_DIR)/.next
	rm -rf .pytest_cache $(SCRAPER_DIR)/.pytest_cache $(CADASTRADOR_DIR)/.pytest_cache
	find . -type d -name __pycache__ -prune -exec rm -rf {} + 2>/dev/null || true
	@echo "🧹 Clean complete."
