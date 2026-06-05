# ==================================================
#  🏠 IA Imobiliária — Makefile
# ==================================================
# Monorepo with four components:
#   backend     -> ai-backendd-imobiliaria  (Laravel 12 + Sail)
#   frontend    -> ai-front-end-imobiliaria (Next.js 16)
#   scraper     -> imobscrapy               (Scrapy, Python .venv)
#   cadastrador -> imobscrapy/cadastrador   (FastAPI, shares imobscrapy .venv)
#
# Run `make help` to list every target.

# ---- Directories --------------------------------------------------
BACKEND_DIR   := ai-backendd-imobiliaria
FRONTEND_DIR  := ai-front-end-imobiliaria
SCRAPER_DIR   := imobscrapy

# ---- Tooling ------------------------------------------------------
SAIL    := $(BACKEND_DIR)/vendor/bin/sail
VENV    := $(SCRAPER_DIR)/.venv
PYTHON  := $(VENV)/bin/python
PIP     := $(VENV)/bin/pip
PYTEST  := $(VENV)/bin/pytest
UVICORN := $(VENV)/bin/uvicorn

# Cadastrador onboarding service host/port
CADASTRADOR_HOST ?= 0.0.0.0
CADASTRADOR_PORT ?= 8000

.DEFAULT_GOAL := help
.PHONY: help \
        up start \
        install install-backend install-frontend install-scraper \
        dev-backend dev-frontend dev-scraper cadastrador \
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
	@echo "🏠 IA Imobiliária — available targets:"
	@echo ""
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| sort \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}'
	@echo ""

# ==================================================
#  Full stack
# ==================================================
up start: ## Start backend (Sail) + frontend together via start.sh
	./start.sh

install: install-backend install-frontend install-scraper ## Install dependencies for every component

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
cadastrador: ## Start the Cadastrador FastAPI service
	cd $(SCRAPER_DIR) && ../$(UVICORN) cadastrador.app:app --host $(CADASTRADOR_HOST) --port $(CADASTRADOR_PORT)

test-cadastrador: ## Run the Cadastrador test suite
	cd $(SCRAPER_DIR) && ../$(PYTHON) -m pytest cadastrador/tests/

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
	rm -rf .pytest_cache $(SCRAPER_DIR)/.pytest_cache
	find . -type d -name __pycache__ -prune -exec rm -rf {} + 2>/dev/null || true
	@echo "🧹 Clean complete."
