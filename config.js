// config.js

const DEFAULT_CONFIG = {
    baseStartHourUTC: 4, // Grid starts at 4 AM UTC
    cities: [
        { id: "sf",    name: "San Francisco", timezone: "America/Los_Angeles", tzStd: "PST",  tzDst: "PDT",   lat: 37.77,  lon: -122.41, workStart: 9, workEnd: 18, visible: true  },
        { id: "la",    name: "Los Angeles",   timezone: "America/Los_Angeles", tzStd: "PST",  tzDst: "PDT",   lat: 34.05,  lon: -118.24, workStart: 9, workEnd: 18, visible: false },
        { id: "austin",name: "Austin",        timezone: "America/Chicago",     tzStd: "CST",  tzDst: "CDT",   lat: 30.26,  lon: -97.74,  workStart: 9, workEnd: 18, visible: true  },
        { id: "chi",   name: "Chicago",       timezone: "America/Chicago",     tzStd: "CST",  tzDst: "CDT",   lat: 41.85,  lon: -87.65,  workStart: 9, workEnd: 18, visible: false },
        { id: "sp",    name: "Sao Paulo",     timezone: "America/Sao_Paulo",   tzStd: "BRT",  tzDst: "BRST",  lat: -23.55, lon: -46.63,  workStart: 9, workEnd: 18, visible: true  },
        { id: "lon",   name: "London",        timezone: "Europe/London",       tzStd: "GMT",  tzDst: "BST",   lat: 51.51,  lon: -0.13,   workStart: 9, workEnd: 18, visible: false },
        { id: "ams",   name: "Amsterdam",     timezone: "Europe/Amsterdam",    tzStd: "CET",  tzDst: "CEST",  lat: 52.36,  lon: 4.90,    workStart: 9, workEnd: 18, visible: true  },
        { id: "bcn",   name: "Barcelona",     timezone: "Europe/Madrid",       tzStd: "CET",  tzDst: "CEST",  lat: 41.38,  lon: 2.16,    workStart: 9, workEnd: 18, visible: true  },
        { id: "lim",   name: "Limassol",      timezone: "Asia/Nicosia",        tzStd: "EET",  tzDst: "EEST",  lat: 34.68,  lon: 33.04,   workStart: 9, workEnd: 18, visible: false },
        { id: "spb",   name: "St Petersburg", timezone: "Europe/Moscow",       tzStd: "MSK",  tzDst: "MSK",   lat: 59.93,  lon: 30.36,   workStart: 9, workEnd: 18, visible: false },
        { id: "yer",   name: "Yerevan",       timezone: "Asia/Yerevan",        tzStd: "AMT",  tzDst: "AMST",  lat: 40.18,  lon: 44.51,   workStart: 9, workEnd: 18, visible: true  }
    ]
};

// ─── Calendar setup instructions ──────────────────────────────────────────────
// Edit this object to change the text shown in the Calendar settings panel.

const APPS_SCRIPT_CODE = `// Manycities — Google Apps Script Calendar Bridge
// Deploy as Web App: Execute as Me | Who has access: Anyone
// After deploying, run setupToken() once from the editor.

const TOKEN_KEY = 'MANYCITIES_TOKEN';

function doGet(e) {
  const params = e.parameter || {};
  const storedToken = PropertiesService.getScriptProperties().getProperty(TOKEN_KEY);
  if (!storedToken) return json({ error: 'Token not set. Run setupToken() first.' });
  if (params.token !== storedToken) return json({ error: 'Invalid token.' });

  if (params.action === 'calendars') return getCalendars();
  if (params.action === 'events')    return getEvents(params);
  return json({ error: 'Unknown action.' });
}

function getCalendars() {
  const calendars = CalendarApp.getAllCalendars().map(cal => ({
    id: cal.getId(),
    summary: cal.getName(),
    backgroundColor: calendarColor(cal)
  }));
  return json({ calendars });
}

function getEvents(params) {
  const calendarIds = (params.calendarIds || '').split(',').filter(Boolean);
  const timeMin = params.timeMin ? new Date(params.timeMin) : new Date();
  const timeMax = params.timeMax ? new Date(params.timeMax) : new Date(timeMin.getTime() + 86400000);
  const events = [];
  calendarIds.forEach(calId => {
    try {
      const cal = CalendarApp.getCalendarById(calId);
      if (!cal) return;
      const color = calendarColor(cal);
      cal.getEvents(timeMin, timeMax).forEach(ev => {
        events.push({
          title: ev.getTitle() || '(No title)',
          start: ev.getStartTime().toISOString(),
          end:   ev.getEndTime().toISOString(),
          color: color,
          link:  buildEventLink(ev)
        });
      });
    } catch(e) {}
  });
  events.sort((a, b) => new Date(a.start) - new Date(b.start));
  return json({ events });
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function calendarColor(cal) {
  const map = {
    COCOA:'#795548', FLAMINGO:'#e67c73', TANGERINE:'#f4511e', BANANA:'#f6bf26',
    SAGE:'#33b679', BASIL:'#0f9d58', PEACOCK:'#039be5', BLUEBERRY:'#3f51b5',
    LAVENDER:'#7986cb', GRAPE:'#8e24aa', GRAPHITE:'#616161'
  };
  const raw = cal.getColor().toString();
  return map[raw.toUpperCase()] || (raw.startsWith('#') ? raw : '#1a73e8');
}

function buildEventLink(ev) {
  try {
    return 'https://www.google.com/calendar/event?eid=' + Utilities.base64Encode(ev.getId());
  } catch(e) { return null; }
}

// ── Run once to create a token. Check View → Execution log for the value.
function setupToken() {
  const existing = PropertiesService.getScriptProperties().getProperty(TOKEN_KEY);
  if (existing) { Logger.log('Token already set: ' + existing); return; }
  const token = generateToken();
  PropertiesService.getScriptProperties().setProperty(TOKEN_KEY, token);
  Logger.log('Token: ' + token);
}

// ── Run if the token was leaked, then update Manycities settings.
function regenerateToken() {
  const token = generateToken();
  PropertiesService.getScriptProperties().setProperty(TOKEN_KEY, token);
  Logger.log('New token: ' + token);
}

function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let t = '';
  for (let i = 0; i < 40; i++) t += chars[Math.floor(Math.random() * chars.length)];
  return t;
}`;

const CALENDAR_SETUP = {
    // One-sentence summary shown at the top of the instructions
    summary: "Connect your Google Calendar in ~5 minutes by deploying a small personal script that runs entirely under your own Google account — no shared servers.",

    // Security note (HTML allowed). GitHub link should point to the project repo.
    security: `Your calendar data never passes through any external server. The Apps Script runs under your Google account and returns data only to requests that include your private token. The token lives in your browser's localStorage and in the script's own PropertiesService — it is never sent anywhere else. You can audit the full source code on <a href="https://github.com/treboit/manycities" target="_blank" rel="noopener">GitHub</a>.
<br><br>⚠️ <strong>Do not use with a work Google account.</strong> Your organization's IT policy may prohibit personal scripts from accessing corporate calendar data. Instead, you can share your work calendar with your personal account, and then connect it.`,

    // Steps shown as a numbered list (HTML allowed for links/bold/em)
    steps: [
        `Open <a href="https://script.google.com/home/projects/create" target="_blank" rel="noopener">script.google.com</a> and create a new project`,
        `Delete the existing code, paste the script below, then Save (<kbd>Ctrl+S</kbd>)`,
        `Click <strong>Select function → setupToken, then Run</strong> and authorize calendar access when prompted. Open <strong>View → Execution log</strong> and copy the token`,
        `Click <strong>Deploy → New deployment → Web App</strong>. Set <em>Execute as: Me</em> and <em>Who has access: Anyone</em>. Copy the Web App URL`,
        `Paste the Web App URL and token into the fields below and click Connect`
    ],

    // The Apps Script code users should copy — edit APPS_SCRIPT_CODE above
    scriptCode: APPS_SCRIPT_CODE
};
