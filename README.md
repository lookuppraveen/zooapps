# Feng Zoo Application User Guide

## Overview
This project is a browser-based web application for a zoo operations experience. The interface is branded as "Zoo AI" and presents a polished, dashboard-style experience for viewing operational information.

## What This App Does
The current version is a front-end application that:
- opens as a standalone web page from the browser
- shows a branded login and app experience
- provides a modern UI layout for an operational dashboard concept

> This repository currently contains a static web page, so there is no separate backend or database setup.

## How to Run the App
### Option 1: Open directly in a browser
1. Open the project folder.
2. Double-click the file named index.html.
3. The app should open in your default browser.

### Option 2: Run a local web server
If you want a more reliable local preview, use a simple static server:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## How to Use the App
1. Open the app in your browser.
2. Review the landing screen and interface.
3. Use the navigation and dashboard areas as presented by the UI.
4. If the page does not load correctly, refresh the browser or reopen the file.

## Expected Behavior
- The app should load as a complete webpage without needing a build step.
- The layout is designed for a polished, modern experience.
- The content is bundled into a single HTML file, so it is easy to share and run locally.

## Troubleshooting
### The page does not open
- Make sure you opened the correct file: index.html.
- Try refreshing the browser.
- If using a local server, confirm the server is running and the URL is correct.

### The app looks broken or incomplete
- Ensure the browser is up to date.
- Check that the file was not moved or renamed.
- If you changed files, refresh the browser cache.

## Project Structure
- index.html — main application file
- README.md — this user guide

## Next Steps
If you want to expand this project further, possible improvements include:
- adding real data and charts
- connecting the UI to an API or database
- creating login and user roles
- adding more zoo-specific modules such as animal care, staff schedules, or visitor insights
