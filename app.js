// app.js

let userSettings = { cities: [] };
let useFahrenheit = false;
let use12h = false;
let activeCities = [];

// --- INITIALIZATION & STORAGE ---
function loadSettings() {
    const saved = localStorage.getItem('globalSyncSettings');
    if (saved) {
        const parsed = JSON.parse(saved);
        userSettings.cities = DEFAULT_CONFIG.cities.map(cfgCity => {
            const savedCity = parsed.cities ? parsed.cities.find(c => c.id === cfgCity.id) : null;
            // Merge local storage settings with config defaults
            if (savedCity) {
                return { ...cfgCity, visible: savedCity.visible, workStart: savedCity.workStart, workEnd: savedCity.workEnd };
            }
            return { ...cfgCity };
        });
    } else {
        userSettings.cities = JSON.parse(JSON.stringify(DEFAULT_CONFIG.cities));
    }
}

function saveSettings() {
    localStorage.setItem('globalSyncSettings', JSON.stringify(userSettings));
}

// --- TIME & TIMEZONE LOGIC ---
function getTzDetails(city) {
    const now = new Date();
    const utcDateStr = now.toLocaleString('en-US', { timeZone: 'UTC' });
    const tzDateStr = now.toLocaleString('en-US', { timeZone: city.timezone });
    const diff = new Date(tzDateStr) - new Date(utcDateStr);
    const offsetHours = diff / 3600000;

    // Determine if timezone is currently in Daylight Saving Time
    const currentYear = now.getFullYear();
    const getOffset = (d) => {
        const u = d.toLocaleString('en-US', { timeZone: 'UTC' });
        const l = d.toLocaleString('en-US', { timeZone: city.timezone });
        return (new Date(l) - new Date(u)) / 3600000;
    };
    // Compare current offset to the standard (lowest) offset of the year
    const stdOffset = Math.min(getOffset(new Date(currentYear, 0, 1)), getOffset(new Date(currentYear, 6, 1)));
    const isDST = offsetHours > stdOffset;
    
    // Pick the right name provided in config.js
    const tzName = isDST ? city.tzDst : city.tzStd;

    return { tzName, offsetHours };
}

function updateActiveCities() {
    // Filter visible cities and calculate current offsets
    activeCities = userSettings.cities
        .filter(c => c.visible)
        .map(c => {
            const details = getTzDetails(c);
            return { ...c, temp: null, icon: "", ...details };
        });

    // Sort West to East (Smallest offset to Largest)
    activeCities.sort((a, b) => a.offsetHours - b.offsetHours);
}

// --- HELPERS ---
const cToF = (c) => Math.round((c * 9/5) + 32);

function formatTime(h, m=0) {
    if (!use12h) return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2,'0')} ${ampm}`;
}

function formatOffsetStr(offset) {
    const sign = offset >= 0 ? '+' : '';
    return `UTC${sign}${offset}`;
}

function getWeatherIcon(code) {
    if (code === 0) return "☀️"; 
    if (code >= 1 && code <= 3) return "🌤️"; 
    if (code >= 45 && code <= 48) return "🌫️"; 
    if (code >= 51 && code <= 67) return "🌧️"; 
    if (code >= 71 && code <= 77) return "❄️"; 
    if (code >= 80 && code <= 82) return "🌦️"; 
    if (code >= 95 && code <= 99) return "⛈️"; 
    return "☁️"; 
}

// --- RENDERING ---
function renderWeather() {
    const container = document.getElementById('weather-rail');
    container.querySelectorAll('.tick-line, .tick-label, .city-chip').forEach(e => e.remove());

    const minC = -20, maxC = 40;
    
    for (let c = maxC; c >= minC; c -= 5) {
        const pct = ((maxC - c) / (maxC - minC)) * 100;
        container.insertAdjacentHTML('beforeend', `<div class="tick-line left" style="top:${pct}%"></div><div class="tick-label left" style="top:${pct}%">${c}°</div>`);
    }
    for (let f = 100; f >= 0; f -= 10) {
        const cEquiv = (f - 32) * 5/9;
        const pct = ((maxC - cEquiv) / (maxC - minC)) * 100;
        if (pct >= 0 && pct <= 100) {
            container.insertAdjacentHTML('beforeend', `<div class="tick-line right" style="top:${pct}%"></div><div class="tick-label right" style="top:${pct}%">${f}°</div>`);
        }
    }

    let validCities = activeCities.filter(c => c.temp !== null);
    if (validCities.length === 0) return;

    let chips = validCities.map(city => ({ ...city, pct: ((maxC - city.temp) / (maxC - minC)) * 100, finalTop: ((maxC - city.temp) / (maxC - minC)) * 100 }));
    chips.sort((a, b) => a.pct - b.pct);

    const minDistance = 4;
    for (let i = 1; i < chips.length; i++) {
        if (chips[i].finalTop < chips[i-1].finalTop + minDistance) chips[i].finalTop = chips[i-1].finalTop + minDistance;
    }
    if (chips.length > 0 && chips[chips.length-1].finalTop > 98) {
         chips[chips.length-1].finalTop = 98;
         for (let i = chips.length - 2; i >= 0; i--) {
            if (chips[i].finalTop > chips[i+1].finalTop - minDistance) chips[i].finalTop = chips[i+1].finalTop - minDistance;
         }
    }

    chips.forEach(city => {
        const chip = document.createElement('div');
        chip.className = 'city-chip';
        chip.style.top = `${city.finalTop}%`;
        const tempDisplay = useFahrenheit ? `${cToF(city.temp)}°` : `${city.temp}°`;
        chip.innerHTML = `${city.icon} ${city.name} <b>${tempDisplay}</b>`;
        container.appendChild(chip);
    });
}

function renderTimeGrid() {
    const headerRow = document.getElementById('time-header');
    const grid = document.getElementById('time-grid');
    
    headerRow.innerHTML = '';
    grid.innerHTML = '';

    // Render Headers
    activeCities.forEach(city => {
        const h = document.createElement('div');
        h.className = 'header-cell';
        h.innerHTML = `
            <div class="h-city" title="${city.name}">${city.name}</div>
            <div class="h-tz">${city.tzName}, ${formatOffsetStr(city.offsetHours)}</div>
            <div class="h-time" id="live-${city.id}">--:--</div>
        `;
        headerRow.appendChild(h);
    });

    // Render Grid
    for (let i = 0; i <= 24; i++) {
        const row = document.createElement('div');
        row.className = 'grid-row';
        
        // Make the first and last rows act as 30-minute half-blocks
        row.style.flex = (i === 0 || i === 24) ? "0.5" : "1";

        // Determine the correct hour block for the zone color (shifted back 1 hr for i=0)
        let hourBlockUtc = DEFAULT_CONFIG.baseStartHourUTC + i - 1;
        if (hourBlockUtc < 0) hourBlockUtc += 24;

        activeCities.forEach(city => {
            const cell = document.createElement('div');
            let localH = Math.floor(hourBlockUtc + city.offsetHours) % 24;
            if (localH < 0) localH += 24;

            // Determines working hours individually for each city
            const isWork = (localH >= city.workStart && localH < city.workEnd);
            cell.className = isWork ? 'grid-cell' : 'grid-cell rest-zone';
            
            // Only add the time label to the lines between whole hours
            if (i > 0) {
                cell.innerHTML = `<span class="time-label">${formatTime(localH)}</span>`;
            }
            
            row.appendChild(cell);
        });
        grid.appendChild(row);
    }
}

async function fetchWeatherData() {
    const requests = activeCities.map(async (city) => {
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current_weather=true`;
            const res = await fetch(url);
            const data = await res.json();
            city.temp = Math.round(data.current_weather.temperature);
            city.icon = getWeatherIcon(data.current_weather.weathercode);
        } catch (e) { console.error("Weather fetch failed for", city.name); }
    });
    await Promise.all(requests);
    renderWeather();
}

function updateLive() {
    const now = new Date();
    
    activeCities.forEach(city => {
        const tzTime = new Date(now.toLocaleString('en-US', { timeZone: city.timezone }));
        const el = document.getElementById(`live-${city.id}`);
        if(el) el.innerText = formatTime(tzTime.getHours(), tzTime.getMinutes());
    });

    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    
    // Subtracted extra 30 mins (-0.5 from start or +0.5 to hoursSinceStart) to align with visual CSS shift
    let hoursSinceStart = utcHours - DEFAULT_CONFIG.baseStartHourUTC + 0.5;
    if (hoursSinceStart < 0) hoursSinceStart += 24;
    
    const pct = ((hoursSinceStart * 60 + utcMinutes) / (24 * 60)) * 100;
    const line = document.getElementById('red-line');
    if(line) line.style.top = `${pct}%`;
}

// --- MODAL & EVENTS ---
function populateModal() {
    const togglesContainer = document.getElementById('city-toggles');
    togglesContainer.innerHTML = '';
    
    userSettings.cities.forEach(city => {
        const div = document.createElement('div');
        div.className = 'city-toggle-item';
        div.innerHTML = `
            <div class="city-name-label">${city.name}</div>
            <div class="hours-input-group">
                <input type="number" id="start-${city.id}" value="${city.workStart}" min="0" max="23">
                -
                <input type="number" id="end-${city.id}" value="${city.workEnd}" min="0" max="24">
            </div>
            <label class="toggle-switch">
                <input type="checkbox" id="toggle-${city.id}" ${city.visible ? 'checked' : ''}>
                <span class="slider"></span>
            </label>
        `;
        togglesContainer.appendChild(div);
    });
}

document.getElementById('open-settings').addEventListener('click', () => {
    populateModal();
    document.getElementById('settings-modal').showModal();
});

document.getElementById('cancel-settings').addEventListener('click', () => {
    document.getElementById('settings-modal').close();
});

document.getElementById('save-settings').addEventListener('click', () => {
    // Read individual settings before saving
    userSettings.cities.forEach(city => {
        city.visible = document.getElementById(`toggle-${city.id}`).checked;
        city.workStart = parseInt(document.getElementById(`start-${city.id}`).value, 10);
        city.workEnd = parseInt(document.getElementById(`end-${city.id}`).value, 10);
    });

    saveSettings();
    document.getElementById('settings-modal').close();
    
    updateActiveCities();
    renderTimeGrid();
    updateLive();
    fetchWeatherData(); 
});

document.getElementById('toggle-unit').addEventListener('change', (e) => {
    useFahrenheit = e.target.checked;
    renderWeather();
});

document.getElementById('toggle-format').addEventListener('change', (e) => {
    use12h = e.target.checked;
    renderTimeGrid();
    updateLive();
});

// Sync horizontal scrolling
const timeGridWrapper = document.getElementById('time-grid-wrapper');
const timeHeaderContainer = document.querySelector('.time-header-container');
timeGridWrapper.addEventListener('scroll', () => {
    timeHeaderContainer.scrollLeft = timeGridWrapper.scrollLeft;
});

// --- BOOTSTRAP ---
loadSettings();
updateActiveCities();
renderTimeGrid();
updateLive();
fetchWeatherData();

setInterval(updateLive, 60000); 
setInterval(fetchWeatherData, 3600000);