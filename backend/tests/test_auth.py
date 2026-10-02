"""
Tests for POST /api/login/v-id.

Uses Flask's test client. All database access is mocked — no real
MongoDB connection is made, and app.py's own startup init_db() call
is patched too so importing the app is safe in a test environment.
"""

import os
import sys
from unittest.mock import MagicMock, patch

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


@pytest.fixture
def client():
    """Flask test client, built with MongoDB startup calls mocked out."""
    with patch("database.get_client", return_value=MagicMock()):
        import app as app_module

    app_module.app.config.update(TESTING=True)
    with app_module.app.test_client() as test_client:
        yield test_client


def _mock_user_lookup(user_doc):
    """Patch routes.auth.get_db so find_one() returns the given user doc."""
    fake_collection = MagicMock()
    fake_collection.find_one.return_value = user_doc
    fake_db = MagicMock()
    fake_db.__getitem__.return_value = fake_collection
    return patch("routes.auth.get_db", return_value=fake_db)


LOGIN_URL = "/api/login/v-id"


def test_missing_v_id_returns_400(client):
    response = client.post(LOGIN_URL, json={"password": "secret"})
    assert response.status_code == 400


def test_missing_password_returns_400(client):
    response = client.post(LOGIN_URL, json={"v_id": "vlearn123"})
    assert response.status_code == 400


def test_invalid_credentials_returns_401(client):
    with _mock_user_lookup(None), \
         patch("routes.auth.verify_password", return_value=False):
        response = client.post(
            LOGIN_URL, json={"v_id": "vlearn123", "password": "wrong"}
        )
    assert response.status_code == 401


def test_valid_credentials_returns_200(client):
    user_doc = {
        "name": "Asha",
        "v_id": "vlearn123",
        "password_hash": "hashed-value",
    }
    with _mock_user_lookup(user_doc), \
         patch("routes.auth.verify_password", return_value=True):
        response = client.post(
            LOGIN_URL, json={"v_id": "vlearn123", "password": "correct"}
        )
    assert response.status_code == 200


def test_successful_response_contains_name_and_v_id(client):
    user_doc = {
        "name": "Asha",
        "v_id": "vlearn123",
        "password_hash": "hashed-value",
    }
    with _mock_user_lookup(user_doc), \
         patch("routes.auth.verify_password", return_value=True):
        response = client.post(
            LOGIN_URL, json={"v_id": "vlearn123", "password": "correct"}
        )
    body = response.get_json()
    assert body["user"]["name"] == "Asha"
    assert body["user"]["v_id"] == "vlearn123"


def test_password_hash_never_returned(client):
    user_doc = {
        "name": "Asha",
        "v_id": "vlearn123",
        "password_hash": "hashed-value",
    }
    with _mock_user_lookup(user_doc), \
         patch("routes.auth.verify_password", return_value=True):
        response = client.post(
            LOGIN_URL, json={"v_id": "vlearn123", "password": "correct"}
        )
    body_text = response.get_data(as_text=True)
    assert "password_hash" not in body_text
    assert "hashed-value" not in body_text
