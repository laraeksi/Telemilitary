import sqlite3

from config import Config


def get_connection():
    return sqlite3.connect(Config.DB_PATH)


def init_db():
    with get_connection() as conn:
        with open("data/schema.sql", "r", encoding="utf-8") as file:
            conn.executescript(file.read())
