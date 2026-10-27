CREATE DATABASE IF NOT EXISTS weatherhub_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE weatherhub_db;

CREATE TABLE IF NOT EXISTS favorites (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    nickname VARCHAR(100) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_favorites_city_country UNIQUE (city, country)
);

SHOW TABLES;

DESCRIBE favorites;
