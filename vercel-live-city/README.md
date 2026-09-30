# Karlstad Live City proxy

Vercel serverless proxy for Karlstad City Live City 2.1.

## Vercel root directory

Deploy this folder as the Vercel project root:

`vercel-live-city`

## Required environment variables

- `TRAFIKLAB_API_KEY` — GTFS Sweden 3 Realtime key.
- `TRAFIKVERKET_API_KEY` — Trafikverket Open API key.

Optional tuning:

- `TRANSIT_CACHE_SECONDS` — default 90.
- `INCIDENT_CACHE_SECONDS` — default 120.
- `KARLSTAD_TRANSIT_RADIUS_KM` — default 8.
- `KARLSTAD_INCIDENT_RADIUS_KM` — default 20.

## Public endpoints

- `/api/transit` — normalized Värmlandstrafik GPS positions near central Karlstad.
- `/api/incidents` — normalized Trafikverket Situation records near Karlstad.
- `/api/health` — configuration status only; never returns secret values.

The API keys remain server-side and are never sent to the game client.
