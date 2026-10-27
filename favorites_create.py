
from flask import Blueprint, jsonify, request
from mysql.connector import IntegrityError, Error

from database import get_db_connection

favorites_create_bp = Blueprint("favorites_create", __name__)


@favorites_create_bp.route("/api/favorites", methods=["POST"])
def create_favorite():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "status": "error",
            "message": "Request body must be valid JSON"
        }), 400

    city = data.get("city")
    country = data.get("country")
    nickname = data.get("nickname")

    if not isinstance(city, str) or not city.strip():
        return jsonify({
            "status": "error",
            "message": "City is required"
        }), 400

    if not isinstance(country, str) or not country.strip():
        return jsonify({
            "status": "error",
            "message": "Country is required"
        }), 400

    if nickname is not None and not isinstance(nickname, str):
        return jsonify({
            "status": "error",
            "message": "Nickname must be a string"
        }), 400

    city = city.strip()
    country = country.strip()
    nickname = nickname.strip() if nickname else None

    if len(city) > 100 or len(country) > 100:
        return jsonify({
            "status": "error",
            "message": "City and country must be 100 characters or fewer"
        }), 400

    if nickname is not None and len(nickname) > 100:
        return jsonify({
            "status": "error",
            "message": "Nickname must be 100 characters or fewer"
        }), 400

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            INSERT INTO favorites (city, country, nickname)
            VALUES (%s, %s, %s)
            """,
            (city, country, nickname)
        )

        favorite_id = cursor.lastrowid
        connection.commit()

        return jsonify({
            "status": "success",
            "message": "Favorite city created",
            "data": {
                "id": favorite_id,
                "city": city,
                "country": country,
                "nickname": nickname
            }
        }), 201

    except IntegrityError:
        if connection and connection.is_connected():
            connection.rollback()

        return jsonify({
            "status": "error",
            "message": "This city and country are already in favorites"
        }), 409

    except Error:
        if connection and connection.is_connected():
            connection.rollback()

        return jsonify({
            "status": "error",
            "message": "Database operation failed"
        }), 500

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()
