from __future__ import annotations

from sqlalchemy import inspect, text

from app import models as _models  # noqa: F401 - register SQLModel metadata
from app.database import engine, init_db


def run_app_specific_migrations() -> None:
    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())
    if "videocontent" in table_names:
        columns = {column["name"] for column in inspector.get_columns("videocontent")}
        if "posted" not in columns:
            with engine.begin() as connection:
                connection.execute(
                    text(
                        "ALTER TABLE videocontent ADD COLUMN posted BOOLEAN NOT NULL "
                        "DEFAULT 0"
                    )
                )
    if "postmedia" not in table_names:
        return
    columns = {column["name"] for column in inspector.get_columns("postmedia")}
    if "asset_id" in columns:
        return
    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE postmedia ADD COLUMN asset_id VARCHAR"))


def init_app_db() -> None:
    run_app_specific_migrations()
    init_db()
