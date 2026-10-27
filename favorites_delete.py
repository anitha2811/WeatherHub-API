
from flask import Blueprint, jsonify
from mysql.connector import Error

from database import get_db_connection

favorites_delete_bp = Blueprint("favorites_delete", __name__)


@favorites_delete_bp.route(
    "/api/favorites/<int:favorite_id>",
    methods=["DELETE"]
)
def delete_favorite(favorite_id):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute(
            "DELETE FROM favorites WHERE id = %s",
            (favorite_id,)
        )

        if cursor.rowcount == 0:
            connection.rollback()
            return jsonify({
                "status": "error",
                "message": "Favorite city not found"
            }), 404

        connection.commit()

        return jsonify({
            "status": "success",
            "message": "Favorite city deleted successfully"
        }), 200

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