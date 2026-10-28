
"use strict";

const $ = (id) => document.getElementById(id);

const state = {
  city: "Vijayawada",
  country: "IN",
  weather: null,
  favorites: [],
  worldLoaded: false
};

const worldCityList = [
  { city: "New York", country: "US", image: "photo-1534430480872-3498386e7856" },
  { city: "London", country: "GB", image: "photo-1513635269975-59663e0ac1ad" },
  { city: "Tokyo", country: "JP", image: "photo-1540959733332-eab4deabeeaf" },
  { city: "Sydney", country: "AU", image: "photo-1506973035872-a4ec16b8e8d9" }
];

const weatherEmoji = (condition, iconCode = "") => {
  const main = String(condition || "").toLowerCase();

  if (iconCode.startsWith("11") || main.includes("thunder")) return "⛈️";
  if (iconCode.startsWith("13") || main.includes("snow")) return "❄️";
  if (main.includes("rain") || main.includes("drizzle") || iconCode.startsWith("09") || iconCode.startsWith("10")) return "🌧️";
  if (main.includes("cloud") || iconCode.startsWith("02") || iconCode.startsWith("03") || iconCode.startsWith("04")) {
    return iconCode.startsWith("02") ? "🌤️" : "☁️";
  }
  if (main.includes("mist") || main.includes("fog") || main.includes("haze")) return "🌫️";
  if (main.includes("clear") || iconCode.startsWith("01")) {
    return iconCode.endsWith("n") ? "🌙" : "☀️";
  }
  return "🌤️";
};

function unwrap(payload) {
  let result = payload;

  // Supports common Flask response formats:
  // {status: "success", data: {...}}
  // {weather: {...}}, or a raw OpenWeather response.
  for (let i = 0; i < 3; i++) {
    if (!result || typeof result !== "object" || Array.isArray(result)) break;

    if (result.data && typeof result.data === "object") {
      result = result.data;
    } else if (
      result.result &&
      typeof result.result === "object" &&
      !Array.isArray(result.result)
    ) {
      result = result.result;
    } else if (
      result.weather &&
      typeof result.weather === "object" &&
      !Array.isArray(result.weather)
    ) {
      result = result.weather;
    } else {
      break;
    }
  }

  return result;
}

function getNumber(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "" && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return null;
}

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function formatNumber(value, digits = 0) {
  return value === null ? "--" : Number(value).toFixed(digits);
}

function normalizeWeather(payload, fallbackCity = "") {
  const raw = unwrap(payload);
  const current = raw.current || raw.current_weather || raw;

  const weatherArray = Array.isArray(current.weather) ? current.weather : [];
  const weatherObject = current.weather && !Array.isArray(current.weather)
    ? current.weather
    : {};

  const weatherInfo = weatherArray[0] || weatherObject;

  const main = current.main || {};
  const wind = current.wind || {};
  const sys = current.sys || {};
  const coord = current.coord || {};

  // Supports both raw OpenWeather data and many common Flask JSON shapes.
  const temp = getNumber(
    main.temp, current.temp, current.temperature, current.temp_c,
    current.temperature_c, current.current_temp
  );

  const feels = getNumber(
    main.feels_like, current.feels_like, current.feelsLike,
    current.feels_like_c, current.apparent_temperature
  );

  const humidity = getNumber(main.humidity, current.humidity);
  const windSpeed = getNumber(wind.speed, current.wind_speed, current.windSpeed);
  const pressure = getNumber(main.pressure, current.pressure);
  const visibilityRaw = getNumber(current.visibility, current.visibility_km);
  const visibility = visibilityRaw !== null && current.visibility_km === undefined &&
    current.visibility !== undefined
    ? visibilityRaw / 1000
    : visibilityRaw;

  const description = firstValue(
    weatherInfo.description, current.description, current.condition,
    current.weather_description
  );

  const iconCode = firstValue(weatherInfo.icon, current.icon, "");
  const city = firstValue(
    current.name, current.city, current.city_name,
    raw.name, raw.city, fallbackCity
  );
  const country = firstValue(sys.country, current.country, raw.country, "");

  return {
    raw,
    city: String(city || fallbackCity || "Unknown city"),
    country: String(country || ""),
    temp,
    feels,
    humidity,
    windSpeed,
    pressure,
    visibility,
    description: String(description || "Weather details unavailable"),
    iconCode: String(iconCode || ""),
    condition: String(firstValue(weatherInfo.main, current.condition, description, "") || ""),
    coord: {
      lat: firstValue(coord.lat, current.latitude),
      lon: firstValue(coord.lon, current.longitude, coord.lng)
    }
  };
}

async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    }
  });

  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error(`Server returned an invalid response (${response.status}).`);
  }

  if (!response.ok || body.status === "error" || body.success === false) {
    throw new Error(
      body.message || body.error || `Request failed (${response.status}).`
    );
  }

  return body;
}

function showStatus(message, type = "") {
  const element = $("statusMessage");
  element.textContent = message || "";
  element.className = `status-message ${type}`.trim();
}

function toast(message) {
  const element = $("toastMessage");
  element.textContent = message;
  element.classList.add("show");

  clearTimeout(toast.timeout);
  toast.timeout = setTimeout(() => element.classList.remove("show"), 2800);
}

function setLoading(button, loading, loadingText = "Loading...") {
  if (!button) return;

  if (loading) {
    button.dataset.originalText = button.innerHTML;
    button.innerHTML = loadingText;
    button.disabled = true;
  } else {
    button.innerHTML = button.dataset.originalText || button.innerHTML;
    button.disabled = false;
  }
}

function updateClock() {
  const now = new Date();

  $("todayDate").textContent = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(now);

  $("todayTime").textContent = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }).format(now);
}

function renderCurrentWeather(weather) {
  state.weather = weather;

  $("weatherCity").innerHTML = "";
  $("weatherCity").append(document.createTextNode(weather.city + ", "));

  const countryLabel = document.createElement("small");
  countryLabel.textContent = weather.country || state.country;
  $("weatherCity").append(countryLabel);

  $("weatherLocation").innerHTML = "";
  const locationIcon = document.createElement("i");
  locationIcon.className = "bi bi-geo-alt-fill";
  $("weatherLocation").append(locationIcon, document.createTextNode(
    weather.raw?.sys?.country
      ? `${weather.raw.name || weather.city}, ${weather.raw.sys.country}`
      : `${weather.city}${weather.country ? ", " + weather.country : ""}`
  ));

  $("weatherDate").textContent = new Date().toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  $("temperature").textContent = formatNumber(weather.temp, 1);
  $("heroFeels").textContent = `${formatNumber(weather.feels, 1)}°C`;
  $("weatherDescription").textContent = weather.description;
  $("heroIcon").textContent = weatherEmoji(weather.condition, weather.iconCode);

  $("statFeels").textContent = `${formatNumber(weather.feels, 1)}°C`;
  $("statHumidity").textContent = weather.humidity === null ? "--" : `${formatNumber(weather.humidity)}%`;
  $("statWind").textContent = weather.windSpeed === null ? "-- m/s" : `${formatNumber(weather.windSpeed, 1)} m/s`;
  $("statPressure").textContent = weather.pressure === null ? "-- hPa" : `${formatNumber(weather.pressure)} hPa`;
  $("statVisibility").textContent = weather.visibility === null ? "-- km" : `${formatNumber(weather.visibility, 1)} km`;
}

async function loadCurrentWeather(city, country = "") {
  const cityQuery = country ? `${city},${country}` : city;
  const url = `/api/weather?city=${encodeURIComponent(cityQuery)}`;

  const payload = await apiFetch(url);
  const weather = normalizeWeather(payload, city);

  if (weather.temp === null) {
    throw new Error(
      "Weather API response lo temperature dorakaledu. Check weather_current.py JSON format."
    );
  }

  renderCurrentWeather(weather);
  return weather;
}

function getForecastList(payload) {
  const raw = unwrap(payload);

  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.list)) return raw.list;
  if (Array.isArray(raw.forecast)) return raw.forecast;
  if (Array.isArray(raw.forecast?.list)) return raw.forecast.list;
  if (Array.isArray(raw.data)) return raw.data;
  if (Array.isArray(raw.forecast_days)) return raw.forecast_days;
  if (Array.isArray(raw.daily)) return raw.daily;

  return [];
}

function forecastDate(item) {
  const rawDate = firstValue(item.dt_txt, item.datetime, item.date, item.dt, item.timestamp);
  if (rawDate === undefined) return null;

  const date = typeof rawDate === "number" || /^\d+$/.test(String(rawDate))
    ? new Date(Number(rawDate) * 1000)
    : new Date(rawDate);

  return Number.isNaN(date.getTime()) ? null : date;
}

function forecastItemValues(item) {
  const main = item.main || item;
  const weatherInfo = Array.isArray(item.weather) ? item.weather[0] : (item.weather || {});
  const tempObj = item.temp || item.temperature || {};

  return {
    temp: getNumber(main.temp, item.temp_c, item.temperature_c,
      typeof item.temperature === "number" ? item.temperature : null,
      tempObj.day, tempObj.max),
    max: getNumber(main.temp_max, item.temp_max, item.max_temp, item.max, tempObj.max, tempObj.day),
    min: getNumber(main.temp_min, item.temp_min, item.min_temp, item.min, tempObj.min, tempObj.night),
    description: String(firstValue(weatherInfo.description, item.description, item.condition, "") || "Forecast"),
    condition: String(firstValue(weatherInfo.main, item.condition, weatherInfo.description, "") || ""),
    icon: String(firstValue(weatherInfo.icon, item.icon, "") || ""),
    rain: getNumber(item.pop, item.precipitation_probability, item.rain_probability, item.rain_chance)
  };
}

function renderForecast(payload) {
  const items = getForecastList(payload);
  const container = $("forecastGrid");

  if (!items.length) {
    container.innerHTML = '<div class="empty-state">Forecast data format is not recognized. Check weather_forecast.py response.</div>';
    return;
  }

  const days = new Map();

  for (const item of items) {
    const date = forecastDate(item);
    if (!date) continue;

    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const values = forecastItemValues(item);

    if (!days.has(key)) {
      days.set(key, { date, values: [], rain: [] });
    }

    const day = days.get(key);
    day.values.push(values);
    if (values.rain !== null) day.rain.push(values.rain);
  }

  const entries = [...days.values()].slice(0, 5);

  if (!entries.length) {
    container.innerHTML = '<div class="empty-state">Forecast dates could not be read. Check the forecast API response.</div>';
    return;
  }

  container.innerHTML = "";

  entries.forEach((day, index) => {
    const values = day.values;
    const highs = values.map(v => v.max ?? v.temp).filter(v => v !== null);
    const lows = values.map(v => v.min ?? v.temp).filter(v => v !== null);
    const high = highs.length ? Math.max(...highs) : null;
    const low = lows.length ? Math.min(...lows) : null;
    const representative = values[Math.floor(values.length / 2)] || values[0];
    const rain = day.rain.length ? Math.round(Math.max(...day.rain) <= 1
      ? Math.max(...day.rain) * 100
      : Math.max(...day.rain)) : null;

    const card = document.createElement("article");
    card.className = `forecast-card${index === 0 ? " today" : ""}`;

    const dayName = index === 0 ? "Today" : day.date.toLocaleDateString("en-US", { weekday: "short" });
    const dateLabel = day.date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

    card.innerHTML = `
      <div class="forecast-day">${dayName}</div>
      <div class="forecast-date">${dateLabel}</div>
      <div class="forecast-icon">${weatherEmoji(representative.condition, representative.icon)}</div>
      <div class="forecast-temps">${formatNumber(high)}° / ${formatNumber(low)}°</div>
      <div class="forecast-description"></div>
      <div class="forecast-rain">${rain === null ? "💧 --" : `💧 ${rain}%`}</div>
    `;

    card.querySelector(".forecast-description").textContent = representative.description;
    container.append(card);
  });

  $("forecastCityLabel").textContent = state.city;
}

async function loadForecast(city) {
  const payload = await apiFetch(`/api/forecast?city=${encodeURIComponent(city)}`);
  renderForecast(payload);
}

function favoriteId(item) {
  return firstValue(item.id, item.favorite_id, item.favourite_id);
}

function favoriteCity(item) {
  return String(firstValue(item.city, item.city_name, item.name, "Unknown city"));
}

function favoriteCountry(item) {
  return String(firstValue(item.country, item.country_code, "IN"));
}

function favoriteNickname(item) {
  return String(firstValue(item.nickname, item.nick_name, ""));
}

function renderFavorites() {
  const container = $("favoritesList");
  container.innerHTML = "";

  if (!state.favorites.length) {
    container.innerHTML = '<div class="empty-state">No favourite cities yet. Click Add City to save one.</div>';
    return;
  }

  state.favorites.forEach((favorite) => {
    const row = document.createElement("div");
    row.className = "favorite-row";

    const icon = document.createElement("span");
    icon.className = "mini-weather-icon";
    icon.textContent = "🌤️";

    const nameBox = document.createElement("div");
    nameBox.className = "favorite-city";

    const name = document.createElement("strong");
    name.textContent = favoriteCity(favorite);

    const sub = document.createElement("small");
    sub.textContent = `${favoriteCountry(favorite)}${favoriteNickname(favorite) ? " | " + favoriteNickname(favorite) : ""}`;

    nameBox.append(name, sub);

    const temp = document.createElement("span");
    temp.className = "favorite-temp";
    temp.textContent = favorite._temperature ?? "--°C";

    const actions = document.createElement("div");
    actions.className = "row-actions";

    const edit = document.createElement("button");
    edit.className = "icon-btn";
    edit.type = "button";
    edit.title = "Edit favourite";
    edit.setAttribute("aria-label", `Edit ${favoriteCity(favorite)}`);
    edit.innerHTML = '<i class="bi bi-pencil-fill"></i>';
    edit.addEventListener("click", () => editFavorite(favorite));

    const del = document.createElement("button");
    del.className = "icon-btn delete";
    del.type = "button";
    del.title = "Delete favourite";
    del.setAttribute("aria-label", `Delete ${favoriteCity(favorite)}`);
    del.innerHTML = '<i class="bi bi-trash-fill"></i>';
    del.addEventListener("click", () => deleteFavorite(favorite));

    actions.append(edit, del);
    row.append(icon, nameBox, temp, actions);
    container.append(row);

    // Get live temperatures for saved cities; failures do not break the list.
    loadFavoriteTemperature(favorite, icon, temp);
  });
}

async function loadFavoriteTemperature(favorite, iconElement, tempElement) {
  try {
    const city = favoriteCity(favorite);
    const country = favoriteCountry(favorite);
    const query = country ? `${city},${country}` : city;

    const payload = await apiFetch(`/api/weather?city=${encodeURIComponent(query)}`);
    const weather = normalizeWeather(payload, city);

    if (weather.temp !== null) {
      tempElement.textContent = `${formatNumber(weather.temp, 1)}°C`;
      iconElement.textContent = weatherEmoji(weather.condition, weather.iconCode);
    }
  } catch {
    // Keep the saved favourite visible even if its live weather cannot load.
  }
}

async function loadFavorites() {
  const payload = await apiFetch("/api/favorites");
  const raw = unwrap(payload);

  let items = Array.isArray(raw) ? raw
    : Array.isArray(raw.favorites) ? raw.favorites
    : Array.isArray(raw.favourites) ? raw.favourites
    : Array.isArray(raw.items) ? raw.items
    : null;

  if (!items) {
    throw new Error("Favorites API response format is not recognized. Check favorites_read.py.");
  }

  state.favorites = items;
  renderFavorites();
}

async function addFavorite() {
  const city = prompt("Enter the city name:", state.city);
  if (city === null) return;

  const cleanCity = city.trim();
  if (!cleanCity) {
    toast("Please enter a city name.");
    return;
  }

  const country = (prompt("Enter country code (for example IN):", state.country) || "IN")
    .trim().toUpperCase();

  const nickname = (prompt("Enter a nickname (optional):", "") || "").trim();

  try {
    await apiFetch("/api/favorites", {
      method: "POST",
      body: JSON.stringify({ city: cleanCity, country, nickname: nickname || null })
    });

    toast(`${cleanCity} added to favourites.`);
    await loadFavorites();
  } catch (error) {
    toast(error.message || "Could not add favourite.");
  }
}

async function editFavorite(favorite) {
  const id = favoriteId(favorite);
  if (id === undefined || id === null) {
    toast("Favorite ID missing from API response.");
    return;
  }

  const city = prompt("Edit city name:", favoriteCity(favorite));
  if (city === null) return;

  const cleanCity = city.trim();
  if (!cleanCity) {
    toast("City name cannot be empty.");
    return;
  }

  const country = (prompt("Edit country code:", favoriteCountry(favorite)) || favoriteCountry(favorite))
    .trim().toUpperCase();

  const nickname = prompt("Edit nickname (optional):", favoriteNickname(favorite));
  if (nickname === null) return;

  try {
    await apiFetch(`/api/favorites/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify({ city: cleanCity, country, nickname: nickname.trim() || null })
    });

    toast("Favourite updated.");
    await loadFavorites();
  } catch (error) {
    toast(error.message || "Could not update favourite.");
  }
}

async function deleteFavorite(favorite) {
  const id = favoriteId(favorite);
  if (id === undefined || id === null) {
    toast("Favorite ID missing from API response.");
    return;
  }

  if (!confirm(`Delete ${favoriteCity(favorite)} from favourite cities?`)) return;

  try {
    await apiFetch(`/api/favorites/${encodeURIComponent(id)}`, { method: "DELETE" });
    toast("Favourite deleted.");
    await loadFavorites();
  } catch (error) {
    toast(error.message || "Could not delete favourite.");
  }
}

async function loadWorldWeather() {
  const container = $("worldCities");
  container.innerHTML = '<div class="empty-state">Loading live weather...</div>';

  const results = await Promise.all(worldCityList.map(async (place) => {
    try {
      const query = `${place.city},${place.country}`;
      const payload = await apiFetch(`/api/weather?city=${encodeURIComponent(query)}`);
      return { place, weather: normalizeWeather(payload, place.city) };
    } catch (error) {
      return { place, error };
    }
  }));

  container.innerHTML = "";

  results.forEach(({ place, weather, error }) => {
    const row = document.createElement("div");
    row.className = "world-row";

    const thumb = document.createElement("div");
    thumb.className = "world-thumb";
    const image = document.createElement("img");
    image.src = `https://images.unsplash.com/${place.image}?auto=format&fit=crop&w=140&q=70`;
    image.alt = `${place.city} city`;
    image.loading = "lazy";
    image.onerror = () => { thumb.textContent = "🌍"; };
    thumb.append(image);

    const nameBox = document.createElement("div");
    const name = document.createElement("div");
    name.className = "world-name";
    name.textContent = `${place.city}, ${place.country}`;

    const description = document.createElement("span");
    description.className = "world-desc";
    description.textContent = error ? "Weather unavailable" : weather.description;
    nameBox.append(name, description);

    const icon = document.createElement("span");
    icon.className = "world-icon";
    icon.textContent = error ? "🌐" : weatherEmoji(weather.condition, weather.iconCode);

    const temp = document.createElement("span");
    temp.className = "world-temp";
    temp.textContent = error || weather.temp === null ? "--°C" : `${formatNumber(weather.temp, 1)}°C`;

    const arrow = document.createElement("i");
    arrow.className = "bi bi-chevron-right world-arrow";

    row.append(thumb, nameBox, icon, temp, arrow);
    container.append(row);
  });

  state.worldLoaded = true;
}

async function searchWeather(event) {
  if (event) event.preventDefault();

  const button = $("searchForm").querySelector('button[type="submit"]');
  const city = $("cityInput").value.trim();
  const country = $("countryInput").value.trim().toUpperCase();

  if (!city) {
    showStatus("Please enter a city name.", "error");
    return;
  }

  state.city = city;
  state.country = country;

  setLoading(button, true, '<span class="spinner-border spinner-border-sm"></span> Searching');
  showStatus("Fetching current weather and forecast...");

  try {
    const results = await Promise.allSettled([
      loadCurrentWeather(city, country),
      loadForecast(city)
    ]);

    const errors = results
      .filter(result => result.status === "rejected")
      .map(result => result.reason?.message || "Request failed.");

    if (results[0].status === "fulfilled") {
      showStatus(errors.length ? `Current weather loaded. Forecast: ${errors[0]}` : "Weather updated successfully.", errors.length ? "error" : "success");
    } else {
      showStatus(results[0].reason?.message || "Unable to load current weather.", "error");
    }

    if (results[0].status === "fulfilled") {
      $("forecastCityLabel").textContent = city;
    }
  } finally {
    setLoading(button, false);
  }
}

function initNavigation() {
  document.querySelectorAll(".side-nav .nav-link").forEach(link => {
    link.addEventListener("click", () => {
      document.querySelectorAll(".side-nav .nav-link").forEach(item => item.classList.remove("active"));
      link.classList.add("active");
    });
  });
}

function initTheme() {
  const saved = localStorage.getItem("weatherhub-theme");
  if (saved === "light") document.body.classList.add("light-theme");

  $("themeToggle").addEventListener("click", () => {
    document.body.classList.toggle("light-theme");
    localStorage.setItem(
      "weatherhub-theme",
      document.body.classList.contains("light-theme") ? "light" : "dark"
    );
  });
}

async function initializeDashboard() {
  updateClock();
  setInterval(updateClock, 30000);
  initNavigation();
  initTheme();

  $("searchForm").addEventListener("submit", searchWeather);
  $("addFavoriteBtn").addEventListener("click", addFavorite);

  $("viewFavoritesBtn").addEventListener("click", () => {
    $("favoritesList").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // Independent loading means one failed section won't block the others.
  const tasks = [
    loadCurrentWeather(state.city, state.country),
    loadForecast(state.city),
    loadFavorites(),
    loadWorldWeather()
  ];

  const results = await Promise.allSettled(tasks);
  const failures = results.filter(item => item.status === "rejected");

  if (failures.length) {
    const message = failures.map(item => item.reason?.message).filter(Boolean).join(" ");
    showStatus(message || "Some dashboard information could not be loaded.", "error");
  } else {
    showStatus("Dashboard connected successfully.", "success");
  }
}

document.addEventListener("DOMContentLoaded", initializeDashboard);
