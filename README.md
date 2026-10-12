# DarkNightsProject

Concept website for **Dark Nights Project**, a (simulated) nonprofit that organizes monthly neighborhood switch-offs of unnecessary outdoor light on the Saturday nearest the new moon, so people can go outside and see the stars.

Built with plain HTML, CSS and JavaScript (no frameworks). Uses the Leaflet library for the map, the Open-Meteo geocoding service for the town search, and Google Fonts.

## What's here

| Path | What it is |
|---|---|
| `index.html`, `styles.css`, `script.js` | The website |
| `prompt-log.md` | Every prompt from the two Claude chats that built the site, in order |
| `artifact/` | The copy published as a Claude artifact: https://claude.ai/artifact/6aTshX5yrq6nt6dRDCvSJH |

## Run it

The scripts need a local server (opening `index.html` directly won't run everything):

```bash
python3 -m http.server 8123
```

Then open http://localhost:8123. The fonts, map and town search need an internet connection.

## About the artifact copy

Artifacts block outside services, so `artifact/` differs from the main site in three ways: the town search falls back to a built-in list of towns, the map shows its points without land and water imagery, and the first screen shows immediately instead of fading in. The main site files are unchanged.
