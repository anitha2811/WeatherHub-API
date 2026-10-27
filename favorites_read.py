
from flask import Blueprint, jsonify
from mysql.connector import Error

from database import get_db_connection

favorites_read_bp = Blueprint("favorites_read", __name__)


@favorites_read_bp.route("/api/favorites", methods=["GET"])
def get_favorites():
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT id, city, country, nickname, created_at
            FROM favorites
            ORDER BY id DESC
        """)

        favorites = cursor.fetchall()

        for favorite in favorites:
            if favorite["created_at"]:
                favorite["created_at"] = favorite["created_at"].isoformat()

        return jsonify({
            "status": "success",
            "count": len(favorites),
            "data": favorites
        }), 200

    except Error:
        return jsonify({
            "status": "error",
            "message": "Database operation failed"
        }), 500

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


@favorites_read_bp.route("/api/favorites/<int:favorite_id>", methods=["GET"])
def get_favorite(favorite_id):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT id, city, country, nickname, created_at
            FROM favorites
            WHERE id = %s
        """, (favorite_id,))

        favorite = cursor.fetchone()

        if not favorite:
            return jsonify({
                "status": "error",
                "message": "Favorite city not found"
            }), 404

        if favorite["created_at"]:
            favorite["created_at"] = favorite["created_at"].isoformat()

        return jsonify({
            "status": "success",
            "data": favorite
        }), 200

    except Error:
        return jsonify({
            "status": "error",
            "message": "Database operation failed"
        }), 500

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()
