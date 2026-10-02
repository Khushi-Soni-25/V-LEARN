"""
Authentication routes for V-LEARN.

Only the V-ID login route lives here. Registration is intentionally
not implemented yet.
"""

from flask import Blueprint, jsonify, request

from database import USERS_COLLECTION, get_db
from models import verify_password

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/api/login/v-id")
def login_v_id():
    data = request.get_json(silent=True) or {}
    v_id = data.get("v_id")
    password = data.get("password")

    if not v_id or not password:
        return jsonify(status="error", message="v_id and password are required"), 400

    db = get_db()
    user = db[USERS_COLLECTION].find_one({"v_id": v_id})

    if not user or not verify_password(user["password_hash"], password):
        return jsonify(status="error", message="Invalid credentials"), 401

    return jsonify(
        status="success",
        message="Login successful",
        user={"name": user["name"], "v_id": user["v_id"]},
    ), 200
