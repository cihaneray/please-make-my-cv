from collections.abc import Generator

from sqlalchemy import URL, create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

connect_args = {}
if not settings.database_user and settings.database_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False
    connect_args["timeout"] = 30

database_url = (
    URL.create(
        "postgresql+psycopg2",
        username=settings.database_user,
        password=settings.database_password,
        host=settings.database_host,
        database=settings.database_name,
    )
    if settings.database_user
    else settings.database_url
)
engine = create_engine(
    database_url,
    connect_args=connect_args,
    pool_pre_ping=True,
    echo=False,
)

if engine.dialect.name == "sqlite":

    @event.listens_for(engine, "connect")
    def enable_foreign_keys(connection, _record):
        connection.execute("PRAGMA foreign_keys=ON")


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db() -> None:
    from pathlib import Path

    from alembic import command
    from alembic.config import Config

    root = Path(__file__).resolve().parents[2]
    config = Config(str(root / "alembic.ini"))
    # A separate SQLite migration connection permits Alembic table rebuilds.
    migration_engine = (
        create_engine(database_url, connect_args=connect_args)
        if engine.dialect.name == "sqlite"
        else engine
    )
    with migration_engine.begin() as connection:
        if connection.dialect.name == "postgresql":
            connection.exec_driver_sql("SELECT pg_advisory_xact_lock(1129944915)")
        elif connection.dialect.name == "sqlite":
            connection.exec_driver_sql("BEGIN IMMEDIATE")
        config.attributes["connection"] = connection
        command.upgrade(config, "head")
    if migration_engine is not engine:
        migration_engine.dispose()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
