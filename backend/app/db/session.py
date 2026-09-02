import logging
from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings

logger = logging.getLogger(__name__)

# ── Declarative Base ───────────────────────────────────────────────────────────
class Base(DeclarativeBase):
    pass


def _init_engine():
    db_url = settings.database_url
    if db_url.startswith("sqlite"):
        eng = create_engine(db_url, connect_args={"check_same_thread": False})
        return eng

    try:
        eng = create_engine(
            db_url,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
        )
        with eng.connect() as conn:
            conn.execute(text("SELECT 1"))
        return eng
    except Exception:
        logger.info("PostgreSQL service unavailable. Operating on primary local SQLite database: sqlite:///./s21_db.sqlite3")
        sqlite_url = "sqlite:///./s21_db.sqlite3"
        eng = create_engine(sqlite_url, connect_args={"check_same_thread": False})
        return eng


# ── Engine ─────────────────────────────────────────────────────────────────────
engine = _init_engine()

# Ensure all models register with Base metadata
import app.models  # noqa: F401
Base.metadata.create_all(bind=engine)

# ── Session factory ────────────────────────────────────────────────────────────
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


# ── FastAPI dependency ─────────────────────────────────────────────────────────
def get_db() -> Generator[Session, None, None]:
    """
    Yields a database session and guarantees it is closed after the request,
    even on exceptions.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Connectivity helper ────────────────────────────────────────────────────────
def check_db_connection() -> bool:
    """
    Runs a minimal round-trip query against the database.
    Returns True if reachable, False otherwise.
    Called by the health endpoint; does NOT raise.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False

