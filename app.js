// app.js

let userSettings = { cities: [], activeCalendars: [] };
let useFahrenheit = false;
let use12h = false;
let activeCities = [];

let dayOffset = 0; 
function getRelativeDateLabel(offset) {
    if (offset === 0) return "Today";
    if (offset === -1) return "Yesterday";
    if (offset === 1) return "Tomorrow";
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/,/g, '');
}
window.changeDay = function(delta) {
    dayOffset += delta;
    renderTimeGrid(); 
    const layer = document.getElementById('events-layer');
    if (layer) layer.innerHTML = ''; 
    updateLive(); 
    if (isGoogleAuth) fetchEvents();
};

let tokenClient, gapiInited = false, gisInited = false, isGoogleAuth = false, calendarList = [], eventList = [];

function gapiLoaded() { gapi.load('client', initializeGapiClient); }
async function initializeGapiClient() {
    await gapi.client.init({ discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'] });
    gapiInited = true;
}
function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: DEFAULT_CONFIG.googleClientId,
        scope: 'https://www.googleapis.com/auth/calendar.readonly',
        callback: (resp) => {
            if (resp.error) return;
            isGoogleAuth = true;
            document.getElementById('google-auth-btn').innerText = 'Sign Out';
            fetchCalendars();
        },
    });
    gisInited = true;
}

function loadSettings() {
    const saved = localStorage.getItem('manyCitiesSettings');
    if (saved) {
        const parsed = JSON.parse(saved);
        userSettings.cities = DEFAULT_CONFIG.cities.map(cfgCity => {
            const savedCity = parsed.cities ? parsed.cities.find(c => c.id === cfgCity.id) : null;
            if (savedCity) return { ...cfgCity, visible: savedCity.visible, workStart: savedCity.workStart, workEnd: savedCity.workEnd };
            return { ...cfgCity };
        });
        userSettings.activeCalendars = parsed.activeCalendars || [];
    } else {
        userSettings.cities = JSON.parse(JSON.stringify(DEFAULT_CONFIG.cities));
        userSettings.activeCalendars = [];
    }
}
function saveSettings() { localStorage.setItem('manyCitiesSettings', JSON.stringify(userSettings)); }

const localOffsetHours = -(new Date().getTimezoneOffset() / 60);

function getTzDetails(city) {
    const now = new Date();
    const utcDateStr = now.toLocaleString('en-US', { timeZone: 'UTC' });
    const tzDateStr = now.toLocaleString('en-US', { timeZone: city.timezone });
    const offsetHours = (new Date(tzDateStr) - new Date(utcDateStr)) / 3600000;

    const currentYear = now.getFullYear();
    const getOffset = (d) => (new Date(d.toLocaleString('en-US', { timeZone: city.timezone })) - new Date(d.toLocaleString('en-US', { timeZone: 'UTC' }))) / 3600000;
    const stdOffset = Math.min(getOffset(new Date(currentYear, 0, 1)), getOffset(new Date(currentYear, 6, 1)));
    const tzName = (offsetHours > stdOffset) ? city.tzDst : city.tzStd;

    return { tzName, offsetHours };
}

function updateActiveCities() {
    activeCities = userSettings.cities.filter(c => c.visible).map(c => ({ ...c, temp: null, icon: "", ...getTzDetails(c) }));
    activeCities.sort((a, b) => a.offsetHours - b.offsetHours);
}

function getGridBoundaries() {
    const now = new Date();
    let gridStart = new Date(now);
    gridStart.setUTCHours(DEFAULT_CONFIG.baseStartHourUTC, 0, 0, 0);
    gridStart.setUTCMinutes(gridStart.getUTCMinutes() - 30);
    if (now.getTime() < gridStart.getTime() + 30*60000) gridStart.setUTCDate(gridStart.getUTCDate() - 1);
    gridStart.setUTCDate(gridStart.getUTCDate() + dayOffset);
    return { gridStart, gridEnd: new Date(gridStart.getTime() + 24 * 60 * 60 * 1000) };
}

function renderTimeGrid() {
    const headerRow = document.getElementById('time-header');
    const grid = document.getElementById('time-grid');
    const showCalendar = userSettings.activeCalendars.length > 0;
    
    headerRow.innerHTML = '';
    grid.innerHTML = '';

    if (showCalendar) {
        headerRow.innerHTML += `<div class="header-cell" id="cal-header">
            <div class="h-city">Calendar</div>
            <div class="h-tz" style="height: 14px;"></div>
            <div class="h-time" style="display:flex; justify-content:space-between; align-items:center; width:100%; padding:0 5px; box-sizing:border-box;">
                <button onclick="changeDay(-1)" class="nav-arrow">&lt;</button>
                <span id="cal-date-label" style="flex:1; text-align:center;">${getRelativeDateLabel(dayOffset)}</span>
                <button onclick="changeDay(1)" class="nav-arrow">&gt;</button>
            </div>
        </div>`;
    }

    activeCities.forEach(city => {
        const isLocal = city.offsetHours === localOffsetHours;
        headerRow.innerHTML += `
        <div class="header-cell ${isLocal ? 'local-tz' : ''}">
            <div class="h-city" title="${city.name}">${city.name}</div>
            <div class="h-tz">${city.tzName}, UTC${city.offsetHours >= 0 ? '+' : ''}${city.offsetHours}</div>
            <div class="h-time" id="live-${city.id}">--:--</div>
        </div>`;
    });

    for (let i = 0; i <= 24; i++) {
        const row = document.createElement('div');
        row.className = 'grid-row';
        row.style.flex = (i === 0 || i === 24) ? "0.5" : "1";

        let hourBlockUtc = DEFAULT_CONFIG.baseStartHourUTC + i - 1;
        if (hourBlockUtc < 0) hourBlockUtc += 24;

        if (showCalendar) {
            // Force the calendar column background to always be the grey rest-zone
            row.innerHTML += `<div class="grid-cell rest-zone calendar-cell"></div>`;
        }

        activeCities.forEach(city => {
            const cell = document.createElement('div');
            let localH = Math.floor(hourBlockUtc + city.offsetHours) % 24;
            if (localH < 0) localH += 24;
            const isWork = (localH >= city.workStart && localH < city.workEnd);
            cell.className = isWork ? 'grid-cell' : 'grid-cell rest-zone';
            if (city.offsetHours === localOffsetHours) cell.classList.add('local-tz');
            if (i > 0) cell.innerHTML = `<span class="time-label">${formatTime(localH)}</span>`;
            row.appendChild(cell);
        });
        grid.appendChild(row);
    }
    renderEvents();
}

function renderEvents() {
    const layer = document.getElementById('events-layer');
    layer.innerHTML = '';
    const showCalendar = userSettings.activeCalendars.length > 0;
    const calHeader = document.getElementById('cal-header');
    
    if (!showCalendar || !calHeader || eventList.length === 0) return;
    layer.style.width = `${calHeader.offsetWidth}px`;

    const { gridStart, gridEnd } = getGridBoundaries();
    const durationMs = gridEnd.getTime() - gridStart.getTime();

    let columns = [], lastEventEnding = null;
    const packEvents = (cols) => {
        cols.forEach((col, colIdx) => col.forEach(ev => {
            ev.leftPct = (colIdx / cols.length) * 100;
            ev.widthPct = (100 / cols.length);
        }));
    };

    eventList.forEach(ev => {
        if (lastEventEnding !== null && ev.startMs >= lastEventEnding) { packEvents(columns); columns = []; lastEventEnding = null; }
        let placed = false;
        for (let col of columns) {
            if (col[col.length - 1].endMs <= ev.startMs) { col.push(ev); placed = true; break; }
        }
        if (!placed) columns.push([ev]);
        if (lastEventEnding === null || ev.endMs > lastEventEnding) lastEventEnding = ev.endMs;
    });
    if (columns.length > 0) packEvents(columns);

    eventList.forEach(ev => {
        const block = document.createElement('div');
        block.className = 'calendar-event';
        block.style.top = `${((ev.startMs - gridStart.getTime()) / durationMs) * 100}%`;
        block.style.height = `${((ev.endMs - ev.startMs) / durationMs) * 100}%`;
        block.style.left = `${ev.leftPct}%`;
        block.style.width = `${ev.widthPct}%`;
        block.style.backgroundColor = ev.color || '#1a73e8';
        block.innerText = ev.title;
        block.title = ev.title;
        // Allows opening the actual Google calendar event
        block.onclick = () => window.open(ev.link, '_blank'); 
        layer.appendChild(block);
    });
}

async function fetchCalendars() {
    try {
        const response = await gapi.client.calendar.calendarList.list();
        calendarList = response.result.items;
        populateModal(); 
        if(userSettings.activeCalendars.length > 0) fetchEvents();
    } catch (e) {}
}

async function fetchEvents() {
    if (!isGoogleAuth || userSettings.activeCalendars.length === 0) return (eventList = [], renderEvents());
    const { gridStart, gridEnd } = getGridBoundaries();
    let allEvents = [];

    await Promise.all(userSettings.activeCalendars.map(async (calId) => {
        const cal = calendarList.find(c => c.id === calId);
        try {
            const response = await gapi.client.calendar.events.list({
                'calendarId': calId, 'timeMin': gridStart.toISOString(), 'timeMax': gridEnd.toISOString(),
                'showDeleted': false, 'singleEvents': true, 'orderBy': 'startTime'
            });
            response.result.items.forEach(e => {
                const startMs = Math.max(new Date(e.start.dateTime || e.start.date).getTime(), gridStart.getTime());
                const endMs = Math.min(new Date(e.end.dateTime || e.end.date).getTime(), gridEnd.getTime());
                allEvents.push({ title: e.summary, startMs, endMs, color: cal.backgroundColor, link: e.htmlLink });
            });
        } catch (e) {}
    }));
    eventList = allEvents.sort((a, b) => a.startMs - b.startMs);
    renderEvents();
}

const cToF = (c) => Math.round((c * 9/5) + 32);
function formatTime(h, m=0) {
    if (!use12h) return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
    return `${h % 12 || 12}:${m.toString().padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

async function fetchWeatherData() {
    await Promise.all(activeCities.map(async (city) => {
        try {
            const data = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current_weather=true`)).json();
            city.temp = Math.round(data.current_weather.temperature);
            const c = data.current_weather.weathercode;
            city.icon = c===0 ? "☀️" : (c>=1&&c<=3) ? "🌤️" : (c>=45&&c<=48) ? "🌫️" : (c>=51&&c<=67) ? "🌧️" : (c>=71&&c<=77) ? "❄️" : (c>=80&&c<=82) ? "🌦️" : (c>=95&&c<=99) ? "⛈️" : "☁️";
        } catch (e) {}
    }));
    renderWeather();
}

function renderWeather() {
    const container = document.getElementById('weather-rail');
    container.querySelectorAll('.tick-line, .tick-label, .city-chip').forEach(e => e.remove());
    for (let c = 40; c >= -20; c -= 5) {
        const pct = ((40 - c) / 60) * 100;
        container.insertAdjacentHTML('beforeend', `<div class="tick-line left" style="top:${pct}%"></div><div class="tick-label left" style="top:${pct}%">${c}°</div>`);
    }
    for (let f = 100; f >= 0; f -= 10) {
        const pct = ((40 - ((f - 32) * 5/9)) / 60) * 100;
        if (pct >= 0 && pct <= 100) container.insertAdjacentHTML('beforeend', `<div class="tick-line right" style="top:${pct}%"></div><div class="tick-label right" style="top:${pct}%">${f}°</div>`);
    }
    let validCities = activeCities.filter(c => c.temp !== null);
    if (validCities.length === 0) return;
    let chips = validCities.map(city => ({ ...city, pct: ((40 - city.temp) / 60) * 100, finalTop: ((40 - city.temp) / 60) * 100 })).sort((a, b) => a.pct - b.pct);
    for (let i = 1; i < chips.length; i++) if (chips[i].finalTop < chips[i-1].finalTop + 4) chips[i].finalTop = chips[i-1].finalTop + 4;
    if (chips.length > 0 && chips[chips.length-1].finalTop > 98) {
         chips[chips.length-1].finalTop = 98;
         for (let i = chips.length - 2; i >= 0; i--) if (chips[i].finalTop > chips[i+1].finalTop - 4) chips[i].finalTop = chips[i+1].finalTop - 4;
    }
    chips.forEach(city => {
        const chip = document.createElement('div');
        chip.className = 'city-chip';
        chip.style.top = `${city.finalTop}%`;
        chip.innerHTML = `${city.icon} ${city.name} <b>${useFahrenheit ? `${cToF(city.temp)}°` : `${city.temp}°`}</b>`;
        container.appendChild(chip);
    });
}

function updateLive() {
    const now = new Date();
    activeCities.forEach(city => {
        const tzTime = new Date(now.toLocaleString('en-US', { timeZone: city.timezone }));
        const el = document.getElementById(`live-${city.id}`);
        if(el) el.innerText = formatTime(tzTime.getHours(), tzTime.getMinutes());
    });

    let hoursSinceStart = now.getUTCHours() - DEFAULT_CONFIG.baseStartHourUTC + 0.5;
    if (hoursSinceStart < 0) hoursSinceStart += 24;
    
    const line = document.getElementById('red-line');
    const grid = document.getElementById('time-grid');
    if(line && grid) {
        line.style.top = `${((hoursSinceStart * 60 + now.getUTCMinutes()) / (24 * 60)) * 100}%`;
        line.style.width = `${grid.scrollWidth}px`; // Force line to match exact horizontal layout length 
    }
    
    const layer = document.getElementById('events-layer');
    const calHeader = document.getElementById('cal-header');
    if (layer && calHeader) layer.style.width = `${calHeader.offsetWidth}px`;
}

function populateModal() {
    const tzContainer = document.getElementById('city-toggles');
    tzContainer.innerHTML = '';
    userSettings.cities.forEach(city => {
        tzContainer.insertAdjacentHTML('beforeend', `
            <div class="city-toggle-item">
                <div class="city-name-label">${city.name}</div>
                <div class="hours-input-group">
                    <input type="number" id="start-${city.id}" value="${city.workStart}" min="0" max="23"> - 
                    <input type="number" id="end-${city.id}" value="${city.workEnd}" min="0" max="24">
                </div>
                <label class="toggle-switch">
                    <input type="checkbox" id="toggle-${city.id}" ${city.visible ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            </div>
        `);
    });

    const calContainer = document.getElementById('calendar-toggles');
    calContainer.innerHTML = '';
    if (!isGoogleAuth) {
        calContainer.innerHTML = '<p style="font-size: 0.85rem; color: var(--text-secondary);">Sign in to see your calendars.</p>';
    } else {
        calendarList.forEach(cal => {
            calContainer.insertAdjacentHTML('beforeend', `
                <div class="city-toggle-item" style="margin-top: 8px;">
                    <div class="city-name-label">
                        <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${cal.backgroundColor}; margin-right:5px;"></span>
                        ${cal.summary}
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" class="cal-checkbox" data-id="${cal.id}" ${userSettings.activeCalendars.includes(cal.id) ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
            `);
        });
    }
}

document.getElementById('google-auth-btn').addEventListener('click', () => {
    if (!isGoogleAuth) {
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        google.accounts.oauth2.revoke(gapi.client.getToken().access_token, () => {
            isGoogleAuth = false; calendarList = []; eventList = []; userSettings.activeCalendars = [];
            document.getElementById('google-auth-btn').innerText = 'Sign In';
            populateModal(); saveSettings(); renderTimeGrid();
        });
    }
});

document.getElementById('open-settings').addEventListener('click', () => { populateModal(); document.getElementById('settings-modal').showModal(); });
document.getElementById('cancel-settings').addEventListener('click', () => document.getElementById('settings-modal').close());

document.getElementById('save-settings').addEventListener('click', () => {
    userSettings.cities.forEach(city => {
        city.visible = document.getElementById(`toggle-${city.id}`).checked;
        city.workStart = parseInt(document.getElementById(`start-${city.id}`).value, 10);
        city.workEnd = parseInt(document.getElementById(`end-${city.id}`).value, 10);
    });
    if (isGoogleAuth) userSettings.activeCalendars = Array.from(document.querySelectorAll('.cal-checkbox')).filter(cb => cb.checked).map(cb => cb.dataset.id);

    saveSettings(); document.getElementById('settings-modal').close();
    updateActiveCities(); renderTimeGrid(); updateLive(); fetchWeatherData(); 
    if (isGoogleAuth) fetchEvents();
});

document.getElementById('toggle-unit').addEventListener('change', (e) => { useFahrenheit = e.target.checked; renderWeather(); });
document.getElementById('toggle-format').addEventListener('change', (e) => { use12h = e.target.checked; renderTimeGrid(); updateLive(); });

const timeGridWrapper = document.getElementById('time-grid-wrapper');
const timeHeaderContainer = document.querySelector('.time-header-container');
timeGridWrapper.addEventListener('scroll', () => timeHeaderContainer.scrollLeft = timeGridWrapper.scrollLeft);
window.addEventListener('resize', () => updateLive());

loadSettings(); updateActiveCities(); renderTimeGrid(); updateLive(); fetchWeatherData();
setInterval(updateLive, 60000); setInterval(fetchWeatherData, 3600000); setInterval(fetchEvents, 300000);