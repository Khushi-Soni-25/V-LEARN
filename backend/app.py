"""
V-LEARN backend entry point.

Sets up the Flask app and MongoDB foundation, and registers the auth
blueprints: V-ID login, phone login, OTP verification, and password
recovery. Registration routes are intentionally not defined yet.
"""

from flask import Flask

from database import init_db
from routes.auth import auth_bp
from routes.otp_auth import otp_auth_bp
from routes.password_reset import password_reset_bp
from routes.phone_auth import phone_auth_bp


def create_app() -> Flask:
    app = Flask(__name__)

    with app.app_context():
        init_db()

    app.register_blueprint(auth_bp)
    app.register_blueprint(phone_auth_bp)
    app.register_blueprint(otp_auth_bp)
    app.register_blueprint(password_reset_bp)

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True)
