# Hotel Cali timetable sync (Chrome extension)

Copies MICA's class timetable from SharePoint into the Hotel Cali app every hour, on its own, while Chrome is open. It uses your normal MICA sign-in in Chrome, so nothing to log in to here.

## Install (one time)

1. Unzip `hotelcali-timetable-sync.zip` somewhere you'll keep it (e.g. Documents\hotelcali-sync).
2. In Chrome, go to `chrome://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and pick the unzipped folder.
4. Make sure you're signed in to MICA SharePoint in Chrome (open the timetable once from the extension's popup).

The first sync runs about a minute after install, then every hour.

## Using it

- Click the extension icon to see the last sync and to **Sync now**.
- A red **!** on the icon means the last sync failed. You'll get one notification when it starts failing, e.g. if you're signed out of SharePoint.
- You'll also get a notification when the timetable changes.

## Notes

- `sync-core.js` is `scripts/schedule-sync.js` wrapped as a function, plus a signed-out check. Keep them in step if the parsing changes.
- It only reads the spreadsheet; it never edits anything on SharePoint.
