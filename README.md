# Manycities

A minimal, offline-first dashboard for international teams — see what time it is across your cities, visualize work-hour overlaps, and optionally overlay your Google Calendar events.

**[manycities.app](https://treboit.github.io/manycities/)**

![Manycities screenshot](screenshot.png)

---

## Features

- Time grid showing current time across multiple cities, and colour-coded work hours to find overlap windows at a glance
- Weather panel with current temperatures (°C / °F)
- Optional Google Calendar overlay
- No account, no sign-up, no server

---

## Privacy

### What is stored and where

All settings — cities, work hours, calendar URL, calendar token, visible calendars, theme preference — are stored **only in your browser's `localStorage`**. Nothing is sent to any server run by this project. Clearing your browser data removes everything.

### Calendar integration

The Google Calendar feature is entirely optional. When enabled, it works like this:

1. **You deploy your own Google Apps Script** (the code is provided in the settings panel). The script runs under your personal Google account, not ours.
2. **Events are fetched directly from your script to your browser.** The request goes: your browser → your Apps Script → your Google Calendar → back to your browser. No data passes through any server we control.
3. **Access is protected by a private token** you generate yourself. The token is stored in your browser's `localStorage` and in the script's `PropertiesService` — it is never sent anywhere else.
4. **You can revoke access at any time** by deleting or undeploying the Apps Script, or by clicking Disconnect in the settings panel.

> ⚠️ Do not use with a work Google account. Your organization's IT policy may prohibit personal scripts from accessing corporate calendar data. Instead, you can share your work calendar with your personal account, and then connect it.

The full Apps Script source is visible in the settings panel and in [`appsscript.gs`](appsscript.gs) in this repository. You can audit exactly what it does before deploying.

### Analytics

This site uses [Umami](https://umami.is/) for anonymous, privacy-friendly analytics. Umami records **page views only** — no personal data, no cookies, no fingerprinting, no cross-site tracking. Calendar tokens and event data are never included in any analytics payload. You can verify this in the [Umami documentation](https://umami.is/docs).

### Summary

| Data | Stored where | Sent to third parties |
|---|---|---|
| City / timezone settings | Your browser (localStorage) | No |
| Calendar URL & token | Your browser (localStorage) | No |
| Calendar events | Never stored | No (fetched to your browser only) |
| Theme / format preferences | Your browser (localStorage) | No |
| Page view count | Umami (anonymous) | Umami only (no personal data) |

---

## Running locally

No build step required — open `index.html` directly in a browser, or serve the folder with any static file server:

```bash
npx serve .
```

---

## License

MIT
