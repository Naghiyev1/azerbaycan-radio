const API_BASE = "https://de1.api.radio-browser.info/json";

const stationsGrid = document.getElementById("stationsGrid");
const statusText = document.getElementById("statusText");
const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const audioPlayer = document.getElementById("audioPlayer");
const currentStation = document.getElementById("currentStation");
const currentMeta = document.getElementById("currentMeta");
const stationCount = document.getElementById("stationCount");
const favoriteCount = document.getElementById("favoriteCount");
const playerFavoriteButton = document.getElementById("playerFavoriteButton");
const powerButton = document.getElementById("powerButton");
const themeToggle = document.getElementById("themeToggle");
const needle = document.getElementById("needle");
const displayLogo = document.getElementById("displayLogo");
const presets = Array.from(document.querySelectorAll(".preset"));
const memoryButtons = Array.from(document.querySelectorAll(".memory"));

let stations = [];
let activeFilter = "";
let currentPlayingStation = null;
let favoriteStations = JSON.parse(localStorage.getItem("azerbaycanRadioFavorites") || "[]");
let recentlyPlayedStations = JSON.parse(localStorage.getItem("azerbaycanRadioRecent") || "[]");
let favorites = favoriteStations.map(station => station.stationuuid);
let nightMode = localStorage.getItem("azerbaycanRadioNight") || "off";

const curatedStationQueries = [
  { name: "ASAN Radio" },
  { name: "Media FM" },
  { name: "Radio Antenn" },
  { name: "İctimai Radio" },
  { name: "Araz FM" },
  { name: "Avto FM" },
  { name: "Baku Jukebox" },
  { name: "Radio Enerji" },
  { name: "Naxçıvan Radio" },
  { name: "Xəzər FM" }
];

function updateFavoriteCount() {
  favoriteCount.textContent = favorites.length;
}

async function fetchStations() {
  if (activeFilter === "__favorites") {
    renderFavoriteStations();
    return;
  }

  if (activeFilter === "__recent") {
    renderRecentlyPlayedStations();
    return;
  }

  if (activeFilter === "__curated") {
    renderCuratedStations();
    return;
  }

  statusText.textContent = "Azərbaycan radioları yüklənir...";
  stationsGrid.innerHTML = "";
  stationCount.textContent = "0";

  const searchTerm = searchInput.value.trim();

  const params = new URLSearchParams({
    countrycode: "AZ",
    hidebroken: "true",
    order: "clickcount",
    reverse: "true",
    limit: "90"
  });

  if (searchTerm) {
    params.set("name", searchTerm);
  }

  if (activeFilter) {
    params.set("tag", activeFilter);
  }

  const url = `${API_BASE}/stations/search?${params.toString()}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Radio API request failed.");
    }

    const data = await response.json();

    stations = data
      .filter(station => station.lastcheckok === 1)
      .filter(station => station.url_resolved || station.url)
      .filter(removeDuplicatesByUrl)
      .slice(0, 70);

    renderStations(stations);

    stationCount.textContent = stations.length;
    statusText.textContent = stations.length
      ? `${stations.length} radio tapıldı`
      : "Radio tapılmadı. Başqa axtarış yoxla.";
  } catch (error) {
    console.error(error);
    statusText.textContent = "Radiolar yüklənmədi. Bir az sonra yenə yoxla.";
    stationsGrid.innerHTML = `<div class="empty-state">Radiolar yüklənərkən problem oldu.</div>`;
  }
}

async function renderCuratedStations() {
  statusText.textContent = "Seçilmiş stansiyalar yüklənir...";
  stationsGrid.innerHTML = "";
  stationCount.textContent = "0";

  try {
    const results = await Promise.all(
      curatedStationQueries.map(query =>
        fetchCuratedStation(query).catch(error => {
          console.warn(`Curated station failed: ${query.name}`, error);
          return null;
        })
      )
    );

    const searchTerm = searchInput.value.trim().toLowerCase();

    stations = results
      .filter(Boolean)
      .filter(station => station.lastcheckok === 1)
      .filter(station => station.url_resolved || station.url)
      .filter(removeDuplicatesByUrl)
      .filter(station => {
        if (!searchTerm) {
          return true;
        }

        return [
          station.name,
          station.tags,
          station.country
        ].some(value => String(value || "").toLowerCase().includes(searchTerm));
      })
      .map(station => ({ ...station, isCurated: true }));

    renderStations(stations);

    stationCount.textContent = stations.length;
    statusText.textContent = stations.length
      ? `${stations.length} seçilmiş stansiya hazırdır`
      : "Seçilmiş siyahıda uyğun radio tapılmadı.";
  } catch (error) {
    console.error(error);
    statusText.textContent = "Seçilmiş stansiyalar yüklənmədi.";
    stationsGrid.innerHTML = `<div class="empty-state">Seçilmiş stansiyalar yüklənərkən problem oldu.</div>`;
  }
}

async function fetchCuratedStation(query) {
  const params = new URLSearchParams({
    countrycode: "AZ",
    hidebroken: "true",
    order: "clickcount",
    reverse: "true",
    limit: "10",
    name: query.name
  });

  const response = await fetch(`${API_BASE}/stations/search?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Curated radio API request failed.");
  }

  const data = await response.json();

  return data
    .filter(station => station.lastcheckok === 1)
    .filter(station => station.url_resolved || station.url)
    .sort((a, b) => Number(b.clickcount || 0) - Number(a.clickcount || 0))[0] || null;
}

function playMemoryStation(index) {
  if (!stations[index]) {
    statusText.textContent = "Bu preset düyməsində hələ radio yoxdur.";
    return;
  }

  memoryButtons.forEach(button => button.classList.remove("active"));
  const button = memoryButtons[index];
  if (button) {
    button.classList.add("active");
  }

  const station = stations[index];
  playStation(station, station.url_resolved || station.url);
}

function removeDuplicatesByUrl(station, index, array) {
  const currentUrl = station.url_resolved || station.url;
  return array.findIndex(item => (item.url_resolved || item.url) === currentUrl) === index;
}

function renderStations(stationsToRender) {
  stationsGrid.innerHTML = "";

  if (!stationsToRender.length) {
    stationsGrid.innerHTML = `<div class="empty-state">Göstəriləcək radio yoxdur.</div>`;
    return;
  }

  stationsToRender.forEach(station => {
    const card = document.createElement("article");
    card.className = `station-card${station.isCurated ? " curated" : ""}`;

    const streamUrl = station.url_resolved || station.url;
    const isFavorite = favorites.includes(station.stationuuid);
    const initials = getInitials(station.name);
    const tags = station.tags ? shortenTags(station.tags) : "Etiket yoxdur";

    card.innerHTML = `
      <div class="station-top">
        <div class="station-logo-wrap">
          ${station.favicon ? `<img class="station-logo" src="${escapeHTML(station.favicon)}" alt="" loading="lazy" />` : initials}
        </div>
        <div>
          <div class="station-name">${escapeHTML(station.name)}</div>
          <div class="station-country">${escapeHTML(station.country || "Azərbaycan")}</div>
        </div>
      </div>

      <div class="station-tags">${escapeHTML(tags)}</div>

      <div class="station-actions">
        <button type="button" class="play-button">DİNLƏ</button>
        <button type="button" class="favorite-button ${isFavorite ? "active" : ""}" aria-label="Favoritə əlavə et">★</button>
      </div>
    `;

    const logo = card.querySelector(".station-logo");

    if (logo) {
      logo.addEventListener("error", () => {
        logo.parentElement.textContent = initials;
      });
    }

    card.querySelector(".play-button").addEventListener("click", () => {
      playStation(station, streamUrl);
    });

    card.querySelector(".favorite-button").addEventListener("click", event => {
      toggleFavorite(station.stationuuid);
      event.currentTarget.classList.toggle("active");
    });

    stationsGrid.appendChild(card);
  });
}

function playStation(station, streamUrl) {
  statusText.textContent = `${station.name} hazırlanır...`;
  audioPlayer.src = streamUrl;

  audioPlayer.play()
    .then(() => {
      currentPlayingStation = station;
      updateDisplay(station);
      saveRecentlyPlayed(station);
      statusText.textContent = `Çalır: ${station.name}`;

      if (activeFilter === "__recent") {
        renderRecentlyPlayedStations();
      }
    })
    .catch(error => {
      console.error(error);
      statusText.textContent = "Bu radio brauzerdə çalmadı. Başqa stansiya yoxla.";
    });
}

function updateDisplay(station) {
  currentStation.textContent = station.name;
  currentMeta.textContent = `${station.country || "Azərbaycan"}${station.codec ? " · " + station.codec.toUpperCase() : ""}${station.bitrate ? " · " + station.bitrate + " kbps" : ""}`;

  const initials = getInitials(station.name);

  if (station.favicon) {
    displayLogo.innerHTML = `<img src="${escapeHTML(station.favicon)}" alt="" />`;
    const logoImage = displayLogo.querySelector("img");
    logoImage.addEventListener("error", () => {
      displayLogo.textContent = initials;
    });
  } else {
    displayLogo.textContent = initials;
  }

  playerFavoriteButton.disabled = false;
  playerFavoriteButton.classList.toggle("active", favorites.includes(station.stationuuid));
  document.body.classList.add("playing");

  const needlePosition = 7 + Math.floor(Math.random() * 84);
  needle.style.left = `${needlePosition}%`;
}

function stopRadio() {
  audioPlayer.pause();
  audioPlayer.removeAttribute("src");
  audioPlayer.load();

  currentPlayingStation = null;
  currentStation.textContent = "STANSİYA SEÇ";
  currentMeta.textContent = "Azərbaycan · Hazır";
  displayLogo.textContent = "AZ";
  playerFavoriteButton.disabled = true;
  playerFavoriteButton.classList.remove("active");
  document.body.classList.remove("playing");
  needle.style.left = "7%";
  statusText.textContent = "Radio dayandırıldı.";
}

function saveRecentlyPlayed(station) {
  recentlyPlayedStations = recentlyPlayedStations.filter(item => item.stationuuid !== station.stationuuid);
  recentlyPlayedStations.unshift(station);
  recentlyPlayedStations = recentlyPlayedStations.slice(0, 20);
  localStorage.setItem("azerbaycanRadioRecent", JSON.stringify(recentlyPlayedStations));
}

function toggleFavorite(stationId) {
  const station = stations.find(item => item.stationuuid === stationId)
    || favoriteStations.find(item => item.stationuuid === stationId)
    || recentlyPlayedStations.find(item => item.stationuuid === stationId);

  if (favorites.includes(stationId)) {
    favorites = favorites.filter(id => id !== stationId);
    favoriteStations = favoriteStations.filter(item => item.stationuuid !== stationId);
  } else if (station) {
    favorites.push(stationId);
    favoriteStations.push(station);
  }

  localStorage.setItem("azerbaycanRadioFavorites", JSON.stringify(favoriteStations));
  updateFavoriteCount();

  if (currentPlayingStation && currentPlayingStation.stationuuid === stationId) {
    playerFavoriteButton.classList.toggle("active", favorites.includes(stationId));
  }

  if (activeFilter === "__favorites") {
    renderFavoriteStations();
  }
}

function renderFavoriteStations() {
  statusText.textContent = favoriteStations.length
    ? `${favoriteStations.length} favorit radio`
    : "Hələ favorit yoxdur. Ulduz düyməsi ilə əlavə edə bilərsən.";

  stationCount.textContent = favoriteStations.length;
  renderStations(favoriteStations);
}

function renderRecentlyPlayedStations() {
  statusText.textContent = recentlyPlayedStations.length
    ? `${recentlyPlayedStations.length} son dinlənən radio`
    : "Hələ son dinlənən yoxdur. Radio çalanda burada görünəcək.";

  stationCount.textContent = recentlyPlayedStations.length;
  renderStations(recentlyPlayedStations);
}

function shortenTags(tags) {
  return tags
    .split(",")
    .map(tag => tag.trim())
    .filter(Boolean)
    .slice(0, 5)
    .join(", ");
}

function getInitials(name) {
  return String(name || "AZ")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join("")
    .toUpperCase();
}

function escapeHTML(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function applyNightMode(mode) {
  const safeMode = mode === "on" ? "on" : "off";
  document.body.classList.toggle("night", safeMode === "on");
  themeToggle.textContent = safeMode === "on" ? "Day Mode" : "Night Mode";
  localStorage.setItem("azerbaycanRadioNight", safeMode);
  nightMode = safeMode;
}

function toggleNightMode() {
  applyNightMode(nightMode === "on" ? "off" : "on");
}

searchButton.addEventListener("click", fetchStations);

searchInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    fetchStations();
  }
});

presets.forEach(preset => {
  preset.addEventListener("click", () => {
    presets.forEach(item => item.classList.remove("active"));
    preset.classList.add("active");
    activeFilter = preset.dataset.filter || "";
    fetchStations();
  });
});

memoryButtons.forEach(button => {
  button.addEventListener("click", () => {
    const index = Number(button.dataset.memory);
    playMemoryStation(index);
  });
});

playerFavoriteButton.addEventListener("click", () => {
  if (currentPlayingStation) {
    toggleFavorite(currentPlayingStation.stationuuid);
  }
});

powerButton.addEventListener("click", stopRadio);
themeToggle.addEventListener("click", toggleNightMode);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(error => {
      console.warn("Service worker registration failed:", error);
    });
  });
}

applyNightMode(nightMode);
updateFavoriteCount();
fetchStations();
