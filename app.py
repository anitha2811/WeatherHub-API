from flask import Flask, jsonify, render_template

from config import Config
from weather_current import current_weather_bp
from weather_forecast import forecast_bp
from favorites_create import favorites_create_bp
from favorites_read import favorites_read_bp
from favorites_update import favorites_update_bp
from favorites_delete import favorites_delete_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    @app.route("/")
    def home():
        return render_template("index.html")

    @app.route("/api/health", methods=["GET"])
    def health_check():
        return jsonify({
            "status": "success",
            "message": "WeatherHub backend is running"
        }), 200

    app.register_blueprint(current_weather_bp)
    app.register_blueprint(forecast_bp)
    app.register_blueprint(favorites_create_bp)
    app.register_blueprint(favorites_read_bp)
    app.register_blueprint(favorites_update_bp)
    app.register_blueprint(favorites_delete_bp)

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            "status": "error",
            "message": "Endpoint not found"
        }), 404

    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({
            "status": "error",
            "message": "HTTP method not allowed"
        }), 405

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=app.config["DEBUG"])