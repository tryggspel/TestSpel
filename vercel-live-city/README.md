# Karlstad Live City proxy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ftryggspel%2FTestSpel%2Ftree%2Ffeature%2Flive-city-2%2Fvercel-live-city&project-name=karlstad-live-city&repository-name=karlstad-live-city-proxy&env=TRAFIKLAB_API_KEY%2CTRAFIKVERKET_API_KEY&envDescription=Server-side%20API%20keys%20for%20V%C3%A4rmlandstrafik%20(Trafiklab)%20and%20Trafikverket.%20Store%20both%20as%20Secrets%3B%20never%20expose%20them%20to%20the%20game%20client.)%20and%20Trafikverket.%20Store%20both%20as%20Secrets%3B%20never%20expose%20them%20to%20the%20game%20client.)

Vercel serverless proxy for Karlstad City Live City 2.1.

## Fastest setup

1. Click **Deploy with Vercel** above.
2. Keep the suggested project name `karlstad-live-city`.
3. Enter `TRAFIKLAB_API_KEY` and `TRAFIKVERKET_API_KEY` in Vercel when prompted. Use **Secret** for both.
4. Deploy.
5. Verify:
   - `/api/health`
   - `/api/transit`
   - `/api/incidents`

The game can then be tested without another code change by appending:

`?liveProxy=https://YOUR-PROJECT.vercel.app`

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
