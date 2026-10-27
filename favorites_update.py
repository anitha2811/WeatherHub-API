
from flask import Blueprint, jsonify, request
from mysql.connector import IntegrityError, Error

from database import get_db_connection

favorites_update_bp = Blueprint("favorites_update", __name__)


@favorites_update_bp.route("/api/favorites/<int:favorite_id>", methods=["PUT"])
def update_favorite(favorite_id):
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "status": "error",
            "message": "Request body must be valid JSON"
        }), 400

    allowed_fields = {"city", "country", "nickname"}

    if not data:
        return jsonify({
            "status": "error",
            "message": "Provide at least one field to update"
        }), 400

    if not set(data.keys()).issubset(allowed_fields):
        return jsonify({
            "status": "error",
            "message": "Only city, country and nickname can be updated"
        }), 400

    for field in ("city", "country"):
        if field in data:
            if not isinstance(data[field], str) or not data[field].strip():
                return jsonify({
                    "status": "error",
                    "message": f"{field} must be a non-empty string"
                }), 400
            if len(data[field].strip()) > 100:
                return jsonify({
                    "status": "error",
                    "message": f"{field} must be 100 characters or fewer"
                }), 400
            data[field] = data[field].strip()

    if "nickname" in data:
        if data["nickname"] is not None and not isinstance(data["nickname"], str):
            return jsonify({
                "status": "error",
                "message": "Nickname must be a string or null"
            }), 400

        if isinstance(data["nickname"], str):
            data["nickname"] = data["nickname"].strip() or None
            if data["nickname"] and len(data["nickname"]) > 100:
                return jsonify({
                    "status": "error",
                    "message": "Nickname must be 100 characters or fewer"
                }), 400

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            "SELECT id FROM favorites WHERE id = %s",
            (favorite_id,)
        )

        if not cursor.fetchone():
            return jsonify({
                "status": "error",
                "message": "Favorite city not found"
            }), 404

        fields = list(data.keys())
        assignments = ", ".join(f"{field} = %s" for field in fields)
        values = [data[field] for field in fields]
        values.append(favorite_id)

        cursor.execute(
            f"UPDATE favorites SET {assignments} WHERE id = %s",
            tuple(values)
        )
        connection.commit()

        cursor.execute("""
            SELECT id, city, country, nickname, created_at
            FROM favorites
            WHERE id = %s
        """, (favorite_id,))

        favorite = cursor.fetchone()

        if favorite["created_at"]:
            favorite["created_at"] = favorite["created_at"].isoformat()

        return jsonify({
            "status": "success",
            "message": "Favorite city updated",
            "data": favorite
        }), 200

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