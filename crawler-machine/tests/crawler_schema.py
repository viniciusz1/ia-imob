"""Helper de schema exclusivo para os testes do crawler.

ATENÇÃO: a fonte da verdade do banco de dados do crawler fica no backend
Laravel (ai-backendd-imobiliaria/database/migrations).  Este módulo existe
apenas para permitir que os testes Python garantam o schema localmente sem
depender de um ambiente Laravel rodando.  Sempre que for necessário alterar
o schema, criar seeders ou qualquer outra mudança no banco, faça isso no PHP.
"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

_SCHEMA_SQL = """
CREATE SCHEMA IF NOT EXISTS crawler;

CREATE TABLE IF NOT EXISTS crawler.cities (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    state CHAR(2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (slug, state)
);

CREATE TABLE IF NOT EXISTS crawler.neighborhoods (
    id SERIAL PRIMARY KEY,
    city_id INT NOT NULL REFERENCES crawler.cities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    aliases JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (city_id, slug)
);

CREATE TABLE IF NOT EXISTS crawler.property_types (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    aliases JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crawler.raw_properties (
    id SERIAL PRIMARY KEY,
    crawler_run_id INT NOT NULL REFERENCES public.crawler_runs(id) ON DELETE CASCADE,
    source_url TEXT,
    external_id TEXT,
    tipo_imovel TEXT,
    imagem TEXT,
    quartos TEXT,
    sala TEXT,
    banheiros TEXT,
    suites TEXT,
    vagas TEXT,
    ano TEXT,
    valor TEXT,
    area_privada TEXT,
    area_util TEXT,
    detalhes TEXT,
    bairro TEXT,
    cidade TEXT,
    piscina TEXT,
    churrasqueira TEXT,
    academia TEXT,
    salao_festas TEXT,
    playground TEXT,
    sacada TEXT,
    mobiliado TEXT,
    ar_condicionado TEXT,
    lavanderia TEXT,
    escritorio TEXT,
    closet TEXT,
    elevador TEXT,
    portaria_24h TEXT,
    aceita_permuta TEXT,
    financiamento TEXT,
    raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crawler.market_properties (
    id SERIAL PRIMARY KEY,
    crawler_run_id INT NOT NULL REFERENCES public.crawler_runs(id) ON DELETE CASCADE,
    raw_property_id INT REFERENCES crawler.raw_properties(id) ON DELETE SET NULL,
    source_url TEXT,
    tipo TEXT,
    imobiliaria TEXT,
    valor NUMERIC,
    bairro TEXT,
    cidade TEXT,
    imagem TEXT,
    link_imovel TEXT,
    descricao TEXT,
    quartos INT,
    suites INT,
    banheiros INT,
    vagas INT,
    area NUMERIC,
    aceita_permuta BOOLEAN,
    financiamento BOOLEAN,
    piscina BOOLEAN,
    churrasqueira BOOLEAN,
    academia BOOLEAN,
    salao_festas BOOLEAN,
    playground BOOLEAN,
    sacada BOOLEAN,
    mobiliado BOOLEAN,
    ar_condicionado BOOLEAN,
    lavanderia BOOLEAN,
    escritorio BOOLEAN,
    closet BOOLEAN,
    elevador BOOLEAN,
    portaria_24h BOOLEAN,
    andar TEXT,
    posicao_solar TEXT,
    ano_construcao INT,
    quality_status TEXT,
    quality_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
"""


def ensure_schema(connection: Any) -> None:
    """Garante que o schema crawler e suas tabelas existam no banco (apenas testes)."""
    with connection:
        with connection.cursor() as cursor:
            cursor.execute(_SCHEMA_SQL)
            logger.info("Schema crawler garantido no banco (helper de teste).")
