#!/bin/bash

# ==================================================
#  🏠 IA Imobiliária — Inicializador Completo
# ==================================================

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/ai-backendd-imobiliaria"
FRONTEND_DIR="$ROOT_DIR/ai-front-end-imobiliaria"

BACKEND_LOG="$BACKEND_DIR/backend-dev.log"
FRONTEND_LOG="$FRONTEND_DIR/frontend-dev.log"

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${CYAN}=================================================="
echo -e "  🏠  IA Imobiliária — Inicializando Sistema"
echo -e "==================================================${NC}"
echo ""

# ------------------------------------
# Cleanup ao pressionar Ctrl+C
# ------------------------------------
cleanup() {
    echo ""
    echo -e "${YELLOW}⚠️  Encerrando processos...${NC}"

    # Para o frontend (Node)
    if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
        kill "$FRONTEND_PID" 2>/dev/null
        echo -e "${GREEN}✅ Frontend encerrado.${NC}"
    fi

    # Para o backend (Sail)
    echo -e "${YELLOW}🐳 Parando containers Docker (Sail)...${NC}"
    cd "$BACKEND_DIR" && ./vendor/bin/sail stop 2>/dev/null || true

    echo -e "${GREEN}✅ Tudo encerrado. Até mais!${NC}"
    echo ""
    exit 0
}

trap cleanup SIGINT SIGTERM

# ------------------------------------
# 1. BACKEND (Laravel Sail)
# ------------------------------------
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  [1/2] 🚀 Iniciando Backend (Laravel + Sail)${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

cd "$BACKEND_DIR"

# Verifica .env
if [ ! -f .env ]; then
    echo -e "${YELLOW}📄 .env não encontrado. Copiando .env.example...${NC}"
    cp .env.example .env
    chmod 664 .env
fi
chmod 664 .env

# Instala dependências Composer se necessário
if [ ! -d vendor ]; then
    echo -e "${YELLOW}📦 Instalando dependências Composer via Docker...${NC}"
    docker run --rm \
        -v "$BACKEND_DIR:/var/www/html" \
        -w /var/www/html \
        composer:2 \
        composer install --ignore-platform-reqs
fi

# Verifica se está rodando como root (por causa do erro "npm: command not found")
if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}❌ ERRO: Por favor, NÃO execute este script com 'sudo'.${NC}"
    echo -e "${YELLOW}O uso do 'sudo' faz com que o comando 'npm' do seu usuário não seja encontrado.${NC}"
    echo -e "${YELLOW}Se houver problema de permissão na pasta storage do Laravel, o script pedirá a senha do sudo automaticamente apenas para essa pasta.${NC}"
    echo ""
    exit 1
fi

# Diretórios de storage
mkdir -p storage/logs storage/framework/{sessions,views,cache} 2>/dev/null || sudo mkdir -p storage/logs storage/framework/{sessions,views,cache}
# Aplica permissão, mas se falhar não derruba o script
chmod -R 777 storage bootstrap/cache 2>/dev/null || sudo chmod -R 777 storage bootstrap/cache 2>/dev/null || true

# Sobe os containers
echo -e "${YELLOW}🐳 Subindo containers Docker (Sail)...${NC}"
./vendor/bin/sail up -d

# Aguarda PostgreSQL
echo -e "${YELLOW}⏳ Aguardando banco de dados...${NC}"
MAX_RETRIES=30
RETRY_COUNT=0
until ./vendor/bin/sail exec pgsql pg_isready -q 2>/dev/null; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
        echo -e "${RED}❌ Timeout: banco não ficou pronto após ${MAX_RETRIES} tentativas.${NC}"
        exit 1
    fi
    echo -e "   Aguardando PostgreSQL... (tentativa $RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done
echo -e "${GREEN}✅ Banco pronto!${NC}"

# APP_KEY
./vendor/bin/sail artisan key:generate --force 2>/dev/null || true

# Migrations
echo -e "${YELLOW}🗄️  Executando migrations...${NC}"
./vendor/bin/sail artisan migrate --force

# Limpa caches
./vendor/bin/sail artisan config:clear
./vendor/bin/sail artisan cache:clear
./vendor/bin/sail artisan route:clear

echo ""
echo -e "${GREEN}✅ Backend pronto!${NC}"
echo ""

# ------------------------------------
# 2. FRONTEND (Next.js)
# ------------------------------------
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  [2/2] 🖥️  Iniciando Frontend (Next.js)${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

cd "$FRONTEND_DIR"

# Instala dependências npm se necessário
if [ ! -d node_modules ]; then
    echo -e "${YELLOW}📦 Instalando dependências npm...${NC}"
    npm install
fi

# Sobe o servidor de desenvolvimento em background
echo -e "${YELLOW}▶  Iniciando servidor Next.js (dev)...${NC}"
npm run dev > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!

# Aguarda o Next.js subir
echo -ne "${YELLOW}⏳ Aguardando Next.js${NC}"
for i in $(seq 1 20); do
    sleep 1
    echo -n "."
    if grep -q "Ready" "$FRONTEND_LOG" 2>/dev/null || grep -q "Local:" "$FRONTEND_LOG" 2>/dev/null; then
        break
    fi
done
echo ""

if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
    echo -e "${RED}❌ Frontend falhou ao iniciar. Veja o log: $FRONTEND_LOG${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Frontend pronto!${NC}"
echo ""

# ------------------------------------
# 3. Resumo
# ------------------------------------
echo -e "${CYAN}=================================================="
echo -e "  ✅  Sistema Iniciado com Sucesso!"
echo -e "==================================================${NC}"
echo ""
echo -e "  🌐 Backend  → http://localhost:5555"
echo -e "  🖥️  Frontend → http://localhost:3000"
echo ""
echo -e "  📋 Logs:"
echo -e "     Backend  → \$SAIL logs -f  (no diretório do backend)"
echo -e "     Frontend → $FRONTEND_LOG"
echo ""
echo -e "${YELLOW}  Pressione Ctrl+C para encerrar tudo.${NC}"
echo ""

# Mantém o script rodando mostrando logs do frontend
tail -f "$FRONTEND_LOG"
