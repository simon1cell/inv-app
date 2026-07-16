import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base
import models
from main import app, get_db as main_get_db

from auth import get_db as auth_get_db
from fastapi.testclient import TestClient
from schemas import UserCreate
from crud import create_user
from auth import create_access_token

from sqlalchemy.pool import StaticPool

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    Base.metadata.create_all(bind=engine)
    db_session = TestingSessionLocal()
    try:
        yield db_session
    finally:
        db_session.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[main_get_db] = override_get_db
    app.dependency_overrides[auth_get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
def admin_headers(db):
    user_in = UserCreate(username="admin", password="adminpassword", role="admin")
    create_user(db, user_in)
    token = create_access_token({"sub": "admin"})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="function")
def user_headers(db):
    user_in = UserCreate(username="user", password="userpassword", role="user")
    create_user(db, user_in)
    token = create_access_token({"sub": "user"})
    return {"Authorization": f"Bearer {token}"}
