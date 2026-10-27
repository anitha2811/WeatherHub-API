import requests
from flask import Blueprint, current_app, jsonify, request

current_weather_bp = Blueprint("current_weather", __name__)


@current_weather_bp.route("/api/weather", methods=["GET"])
def get_current_weather():
    city = request.args.get(
        "city",
        current_app.config.get("DEFAULT_CITY", "Vijayawada")
    ).strip()

    if not city:
        return jsonify({
            "status": "error",
            "message": "City parameter is required"
        }), 400

    api_key = current_app.config.get("OPENWEATHER_API_KEY")

    if not api_key:
        return jsonify({
            "status": "error",
            "message": "OpenWeather API key is not configured"
        }), 503

    try:
        response = requests.get(
            "https://api.openweathermap.org/data/2.5/weather",
            params={
                "q": city,
                "appid": api_key,
                "units": "metric"
            },
            timeout=10
        )

        if response.status_code == 404:
            return jsonify({
                "status": "error",
                "message": "City not found"
            }), 404

        if response.status_code == 401:
            return jsonify({
                "status": "error",
                "message": "Invalid OpenWeather API key"
            }), 502

        if response.status_code == 429:
            return jsonify({
                "status": "error",
                "message": "Weather API rate limit exceeded"
            }), 429

        response.raise_for_status()

        return jsonify({
            "status": "success",
            "data": response.json()
        }), 200

    except requests.Timeout:
        return jsonify({
            "status": "error",
            "message": "Weather API request timed out"
        }), 504

    except requests.RequestException:
        return jsonify({
            "status": "error",
            "message": "Unable to connect to weather service"
        }), 502