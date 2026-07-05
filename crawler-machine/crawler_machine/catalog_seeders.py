from __future__ import annotations

import json
import logging
from typing import Any

logger = logging.getLogger(__name__)


_CITY = {
    "name": "Jaraguá do Sul",
    "slug": "jaragua-do-sul",
    "state": "SC",
}

_NEIGHBORHOODS = [
    "Centro",
    "Vila Lenzi",
    "Rau",
    "Boehmerwald",
    "Três Rios do Norte",
    "Três Rios do Sul",
    "Jaraguá 84",
    "Jaraguá Esquerdo",
    "Jaraguá Direito",
    "Novo Horizonte",
    "Santo Antônio",
    "Barra do Rio Molha",
    "Cordeiros",
    "Itaum",
    "Parque Malwee",
    "Água Verde",
    "Bom Retiro",
    "Czerniewicz",
    "Iririú",
    "Parque Guarani",
    "Rio Cerro I",
    "Rio Cerro II",
    "Rio da Luz",
    "Santo Amaro da Imperatriz",
    "Schramm",
    "Tifa Monos",
    "Tifa Martins",
    "Vila Baependi",
    "Vila Lalau",
    "Vila Nova",
    "Vieira",
    "Amizade",
    "Boa Vista",
    "Canela",
    "Costa e Silva",
    "Dona Francisca",
    "Erasmo Schmidt",
    "Fazenda",
    "Guanabara",
    "Ilha da Figueira",
    "João Pessoa",
    "Nereu Ramos",
    "Rio Molha",
    "São Luís",
    "Zarella",
]

_PROPERTY_TYPES = [
    {"name": "Apartamento", "aliases": ["apto", "apart"]},
    {"name": "Casa", "aliases": ["casa residencial"]},
    {"name": "Casa de Condomínio", "aliases": ["casa em condominio", "casa em condomínio"]},
    {"name": "Sobrado", "aliases": []},
    {"name": "Sobrado Geminado", "aliases": ["sobrado geminado", "casa geminada"]},
    {"name": "Geminado", "aliases": ["casa geminado"]},
    {"name": "Terreno", "aliases": ["terreno urbano", "terreno rural"]},
    {"name": "Sala Comercial", "aliases": ["sala comercial", "sala"]},
    {"name": "Galpão", "aliases": ["galpao", "pavilhão", "pavilhao"]},
    {"name": "Sítio/Fazenda", "aliases": ["sitio", "fazenda", "chácara", "chacara"]},
    {"name": "Loja", "aliases": []},
]


def _slugify(name: str) -> str:
    """Converte um nome em slug amigável para URLs/identificadores."""
    import re
    from unidecode import unidecode

    slug = unidecode(name).lower()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    return slug.strip("-")


def seed_catalogs(connection: Any) -> None:
    """Popula as tabelas de catálogo do schema crawler."""
    with connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO crawler.cities (name, slug, state)
                VALUES (%s, %s, %s)
                ON CONFLICT (slug, state) DO NOTHING
                RETURNING id
                """,
                (_CITY["name"], _CITY["slug"], _CITY["state"]),
            )
            row = cursor.fetchone()
            if row is not None:
                city_id = row[0]
            else:
                cursor.execute(
                    "SELECT id FROM crawler.cities WHERE slug = %s AND state = %s",
                    (_CITY["slug"], _CITY["state"]),
                )
                city_id = cursor.fetchone()[0]

            neighborhood_values = [
                (city_id, name, _slugify(name), json.dumps([]))
                for name in _NEIGHBORHOODS
            ]
            cursor.executemany(
                """
                INSERT INTO crawler.neighborhoods (city_id, name, slug, aliases)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (city_id, slug) DO NOTHING
                """,
                neighborhood_values,
            )

            property_type_values = [
                (item["name"], _slugify(item["name"]), json.dumps(item["aliases"]))
                for item in _PROPERTY_TYPES
            ]
            cursor.executemany(
                """
                INSERT INTO crawler.property_types (name, slug, aliases)
                VALUES (%s, %s, %s)
                ON CONFLICT (slug) DO NOTHING
                """,
                property_type_values,
            )

            logger.info("Catálogos do crawler seedados.")
