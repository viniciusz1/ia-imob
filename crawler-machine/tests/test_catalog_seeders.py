import os

import psycopg2
import pytest
from dotenv import load_dotenv

from crawler_machine.catalog_seeders import seed_catalogs
from crawler_machine.schema import ensure_schema

load_dotenv()


def _connect():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_DATABASE"),
        user=os.getenv("DB_USERNAME"),
        password=os.getenv("DB_PASSWORD"),
    )


@pytest.fixture
def db_connection():
    connection = _connect()
    ensure_schema(connection)
    yield connection
    connection.close()


def test_seed_catalogs_inserts_jaragua_do_sul_neighborhoods(db_connection):
    seed_catalogs(db_connection)

    with db_connection.cursor() as cursor:
        cursor.execute(
            "SELECT n.name FROM crawler.neighborhoods n JOIN crawler.cities c ON c.id = n.city_id WHERE c.slug = 'jaragua-do-sul'"
        )
        neighborhoods = {row[0] for row in cursor.fetchall()}

    assert "Centro" in neighborhoods
    assert "Vila Lenzi" in neighborhoods
    assert "Rau" in neighborhoods


def test_seed_catalogs_inserts_property_types(db_connection):
    seed_catalogs(db_connection)

    with db_connection.cursor() as cursor:
        cursor.execute("SELECT slug FROM crawler.property_types")
        types = {row[0] for row in cursor.fetchall()}

    assert "apartamento" in types
    assert "casa" in types
    assert "sobrado" in types
    assert "sobrado-geminado" in types
    assert "geminado" in types
    assert "terreno" in types
    assert "sala-comercial" in types
