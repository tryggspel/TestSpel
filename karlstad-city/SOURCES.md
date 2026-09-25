# Karlstad: art, history and open data

Reference review: 25 September 2026. All new building and character geometry is original procedural art. Reference photographs informed shapes; no photographs or third-party character assets are distributed. The geography, scale and positions are compressed for gameplay. The game is not a navigation service or a surveyed digital twin.

## Architectural references

- [Värmlands museum](https://sv.wikipedia.org/wiki/V%C3%A4rmlands_museum): Cyrillushuset's ochre plaster, arched entrance, star window and swept copper roof; Nyrén's red timber extension; reflecting pool. Original interpretation in `landmarks.js`.
- [Karlstads domkyrka](https://sv.wikipedia.org/wiki/Karlstads_domkyrka): pale plaster church and clock tower silhouette.
- [Sandgrund](https://sandgrund.org/sandgrund/): horizontal white gallery pavilion and orange sign. The displayed art/sculpture is original, not a reproduction of Lars Lerin's paintings.
- [Karlstad cultural environment programme](https://gi.karlstad.se/kulprog/visa.php?id=32&typ=miljo): Stora torget and Rådhuset.
- [naturum Värmland](https://karlstad.se/mariebergsskogen/upptack-mariebergsskogen/naturum-varmland): curved glazed timber frontage, deck and wetland setting.
- [Solapromenaden](https://karlstad.se/uppleva-och-gora/friluftsliv-och-motion/solapromenaden): context for the city's historic landmarks.

## Historical characters

- [Sola i Karlstad](https://sv.wikipedia.org/wiki/Sola_i_Karlstad): Eva Lisa Holtz (1739–1818), waitress and innkeeper. The original character is inspired by historical dress, not copied from the protected modern statue. The game makes no claim that its dialogue was spoken by Holtz.
- [Frödingsällskapet biography](https://frodingsallskapet.se/om-froding/biografi/), [municipal biography](https://karlstad.se/Alsters-herrgard/gustaf-froding/) and [Wikipedia](https://sv.wikipedia.org/wiki/Gustaf_Fr%C3%B6ding): Gustaf Fröding, born at Alster in 1860, poet and journalist. Dialogue and discovery prompts are newly written. No historical quotations are fabricated.

## APIs used in the pilot

| Source | Use | Cache / fallback | Commercial considerations |
|---|---|---|---|
| SMHI SNOW1g v1 | Temperature, wind, cloud fraction and precipitation forecast for fixed coordinates 59.3793, 13.5036; cloud fraction alters sun and sky | 30-minute cache; 8-second timeout; forecast must be within 2 hours of current time; unavailable status and artistic sunny light on failure | SMHI CC BY 4.0, attributed in the game. Conversion of values to game lighting is identified as an adaptation |
| SCB PxWeb v2, TAB5557 | Karlstad municipality population, 2025, region 1780; one total, not a sum of subgroups | 24-hour cache; 8-second timeout; dated 99,007 reference from the municipality if API unavailable | Public official statistics, source and reference year displayed. SCB table metadata reports `copyright: false` |
| OpenStreetMap / Leaflet | Real-world mission map | Loaded only when the map opens; external map link on failure | OSM attribution displayed. Public tile service is a pilot dependency; production needs a usage-policy-compliant tile provider |

SMHI point API:
`https://opendata-download-metfcst.smhi.se/api/category/snow1g/version/1/geotype/point/lon/13.5036/lat/59.3793/data.json`

- [SMHI API discovery](https://www.smhi.se/data/sok-oppna-data-i-utforskaren/meteorologisk-prognos-api)
- [SMHI terms](https://www.smhi.se/data/om-smhis-data/villkor-for-anvandning)
- [SCB v2 documentation](https://www.scb.se/vara-tjanster/oppna-data/pxwebapi/pxwebapi-v2/)
- [PxWeb query syntax](https://www.pxtools.net/PxWebApi/documentation/user-guide/)
- [Municipal population reference](https://karlstad.se/kommun-och-politik/kommunfakta/statistik)

The SCB query selects Region=1780, Civilstand=SC, Alder=TotSA, Kon=TotSa, ContentsCode=000007ME, Tid=2025. A real response was verified as 99,007. This is the municipality, not the urban settlement. It is a dated statistical snapshot, not a live population counter. The code deliberately fixes the reference year instead of silently changing definitions.

## Considered, not connected

- [Open-Meteo](https://open-meteo.com/en/pricing): its free hosted service is limited to non-commercial use. SMHI was selected for this commercial pilot instead. No paid subscription was created.
- Event and transit links remain official curated links. There is no claimed live departures or automatic event feed in this release; the bus is a fictional in-game journey. A later production integration must use an authorised feed and its actual terms.

No GPS permission, location tracking, account or analytics is added. Forecast and population requests use fixed public city parameters. Progress and action records remain on the player's device.
