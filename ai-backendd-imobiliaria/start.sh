#!/bin/bash

set -e

echo "=========================================="
echo "  🚀 Iniciando Backend - IA Imobiliária"
echo "=========================================="

# Diretório do backend
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Verifica se o .env existe, caso contrário copia o .env.example
if [ ! -f .env ]; then
    echo "📄 Arquivo .env não encontrado. Copiando .env.example..."
    cp .env.example .env
    chmod 664 .env
    echo "⚠️  Configure o arquivo .env antes de continuar!"
fi

# Garante que o .env tem permissão de escrita
chmod 664 .env

# Verifica se o vendor existe
# Como o PHP local pode não ser compatível, usamos um container Docker temporário
if [ ! -d vendor ]; then
    echo "📦 Instalando dependências do Composer via Docker..."
    docker run --rm \
        -v "$SCRIPT_DIR:/var/www/html" \
        -w /var/www/html \
        composer:2 \
        composer install --ignore-platform-reqs
fi

echo ""
echo "📁 Configurando diretórios de cache e logs..."
mkdir -p storage/logs storage/framework/{sessions,views,cache}
chmod -R 777 storage bootstrap/cache

echo ""
echo "🐳 Subindo containers Docker (Sail)..."
./vendor/bin/sail up -d

echo ""
echo "⏳ Aguardando banco de dados ficar pronto..."
sleep 5

# Aguarda o PostgreSQL estar acessível
MAX_RETRIES=30
RETRY_COUNT=0
until ./vendor/bin/sail exec pgsql pg_isready -q 2>/dev/null; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
        echo "❌ Timeout: banco de dados não ficou pronto após ${MAX_RETRIES} tentativas."
        exit 1
    fi
    echo "   Aguardando PostgreSQL... (tentativa $RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done
echo "✅ Banco de dados pronto!"

echo ""
echo "🔑 Gerando APP_KEY (se necessário)..."
./vendor/bin/sail artisan key:generate --force

echo ""
echo "🗑️  Resetando banco de dados e executando seeders..."
./vendor/bin/sail artisan migrate:fresh --seed --force

echo ""
echo "🧹 Limpando caches..."
./vendor/bin/sail artisan config:clear
./vendor/bin/sail artisan cache:clear
./vendor/bin/sail artisan route:clear

echo ""
echo "=========================================="
echo "  ✅ Backend iniciado com sucesso!"
echo "=========================================="
echo ""
echo "  🌐 API disponível em: http://localhost:${APP_PORT:-80}"
echo "  📊 PostgreSQL em: localhost:${FORWARD_DB_PORT:-7777}"
echo "  🔴 Redis em: localhost:${FORWARD_REDIS_PORT:-6379}"
echo ""
echo "  📋 Comandos úteis:"
echo "     ./vendor/bin/sail stop     - Parar containers"
echo "     ./vendor/bin/sail logs -f  - Ver logs"
echo "     ./vendor/bin/sail shell    - Acessar shell do container"
echo ""
