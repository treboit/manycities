// Manycities — Google Apps Script Calendar Bridge
//
// Setup:
//   1. Paste this code into script.google.com
//   2. Run setupToken() once from the editor — copy the token from the Execution Log
//   3. Deploy → New deployment → Web App
//      Execute as: Me | Who has access: Anyone
//   4. Copy the Web App URL + your token into Manycities settings
//
// To regenerate the token (e.g. after a leak): run regenerateToken() from the editor.

const TOKEN_KEY = 'MANYCITIES_TOKEN';

function doGet(e) {
  const params = e.parameter || {};

  // Verify token
  const storedToken = PropertiesService.getScriptProperties().getProperty(TOKEN_KEY);
  if (!storedToken) {
    return json({ error: 'Token not set. Run setupToken() first.' });
  }
  if (params.token !== storedToken) {
    return json({ error: 'Invalid token.' });
  }

  const action = params.action;
  if (action === 'calendars') return getCalendars();
  if (action === 'events')    return getEvents(params);
  return json({ error: 'Unknown action. Use action=calendars or action=events.' });
}

// Returns list of all calendars the user has access to
function getCalendars() {
  const calendars = CalendarApp.getAllCalendars().map(cal => ({
    id: cal.getId(),
    summary: cal.getName(),
    backgroundColor: calendarColor(cal)
  }));
  return json({ calendars });
}

// Returns events for the requested calendarIds within [timeMin, timeMax]
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
    } catch (e) {
      // Skip calendars we can't access
    }
  });

  events.sort((a, b) => new Date(a.start) - new Date(b.start));
  return json({ events });
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// CalendarApp returns named color constants — map them to hex
function calendarColor(cal) {
  const colorMap = {
    COCOA: '#795548', FLAMINGO: '#e67c73', TANGERINE: '#f4511e', BANANA: '#f6bf26',
    SAGE: '#33b679', BASIL: '#0f9d58', PEACOCK: '#039be5', BLUEBERRY: '#3f51b5',
    LAVENDER: '#7986cb', GRAPE: '#8e24aa', GRAPHITE: '#616161',
    // Hex values returned by newer API
    '#795548': '#795548', '#e67c73': '#e67c73', '#f4511e': '#f4511e',
    '#f6bf26': '#f6bf26', '#33b679': '#33b679', '#0f9d58': '#0f9d58',
    '#039be5': '#039be5', '#3f51b5': '#3f51b5', '#7986cb': '#7986cb',
    '#8e24aa': '#8e24aa', '#616161': '#616161'
  };
  const raw = cal.getColor().toString().toUpperCase().replace('#', '');
  return colorMap[raw] || colorMap['#' + raw.toLowerCase()] || '#1a73e8';
}

function buildEventLink(ev) {
  try {
    // Google Calendar event deep-link format
    const eid = Utilities.base64Encode(ev.getId());
    return 'https://www.google.com/calendar/event?eid=' + eid;
  } catch (e) {
    return null;
  }
}

// ── Token management ─────────────────────────────────────────────────────────

// Run once after pasting this script. Token will appear in View → Execution log.
function setupToken() {
  const existing = PropertiesService.getScriptProperties().getProperty(TOKEN_KEY);
  if (existing) {
    Logger.log('Token already set: ' + existing);
    Logger.log('Run regenerateToken() to create a new one.');
    return;
  }
  const token = generateToken();
  PropertiesService.getScriptProperties().setProperty(TOKEN_KEY, token);
  Logger.log('Token created: ' + token);
  Logger.log('Paste this token into Manycities settings.');
}

// Run if the token was leaked. Then update the token in Manycities settings.
function regenerateToken() {
  const token = generateToken();
  PropertiesService.getScriptProperties().setProperty(TOKEN_KEY, token);
  Logger.log('New token: ' + token);
  Logger.log('Update the token in Manycities settings.');
}

function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let t = '';
  for (let i = 0; i < 40; i++) t += chars[Math.floor(Math.random() * chars.length)];
  return t;
}
