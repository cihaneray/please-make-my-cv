from alembic import context
from sqlalchemy import create_engine

import app.db.models  # noqa: F401
from app.db.base import Base
from app.db.session import database_url


def run():
    connection = context.config.attributes.get("connection")
    if connection is not None:
        context.configure(connection=connection, target_metadata=Base.metadata)
        with context.begin_transaction():
            context.run_migrations()
    else:
        engine = create_engine(database_url)
        with engine.begin() as conn:
            context.configure(connection=conn, target_metadata=Base.metadata)
            context.run_migrations()


run()
