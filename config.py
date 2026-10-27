import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # Flask configuration
    DEBUG = os.getenv("FLASK_DEBUG", "false").lower() == "true"

    # OpenWeather configuration
    OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "")
    DEFAULT_CITY = os.getenv("DEFAULT_CITY", "Vijayawada")

    # MySQL configuration
    MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
    MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
    MYSQL_USER = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
    MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "weatherhub_db")