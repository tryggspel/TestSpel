# Karlstad identity pass 2.6

Checked 2026-09-30. The game uses a stylised, simplified city, not a survey-grade reconstruction. Building footprints and street axes share one projection, with Stora Torget at **59.380767, 13.50295**. Silhouettes, heights, colours and architectural details are original low-poly/comic interpretations. Streets retain their real OSM bends; movement rules are unchanged.

## Geography

© [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), [ODbL](https://opendatacommons.org/licenses/odbl/). The derived street data is in `../city-streets.mjs`, extracted from the repository's `karlstad-city-mobile/data/osm-roads.json`. Buildings come from the existing `osm-buildings.json`. OSM way IDs remain with each feature. In-game attribution appears beneath the map.

The four orientation landmarks are explicitly reserved within the **95-building cap**:

| Place | OSM way | Characteristic used in the original game drawing |
| --- | --- | --- |
| Rådhuset | 101456563 | East-facing square facade, central projection, three levels of arched windows and a dark roof |
| Domkyrkan | 75070676 | White cruciform church, west tower, clock faces and dark pointed roof |
| Stadsbiblioteket | 75360972 | Long horizontal facade and entrance toward Västra Torggatan |
| Sandgrund | 95639598 | Low white building, glazing, projecting white portico and orange roof lettering |

Architectural references: [Sveriges Domstolar — Rådhusets historia](https://www.domstol.se/varmlands-tingsratt/om-tingsratten/organisation/historia/), [Svenska kyrkan — Om Domkyrkan](https://www.svenskakyrkan.se/karlstad/om-domkyrkan), [Sandgrund](https://sandgrund.org/sandgrund/), and the user's existing comic image of Domkyrkan. No third-party building photographs have been shipped as game textures.

## Actual businesses and facade anchors

Store locator coordinates can point into a road rather than onto a door. Each shop is therefore bound to the **specific OSM building at its address**, and the sign is projected onto its street-facing wall. This corrects the previous freestanding O’Learys slab in the square. The existing O’Learys game remains outside the restaurant.

| Business | Verified address | Official pin (lat, lon) | OSM facade |
| --- | --- | --- | --- |
| O’Learys | Tingvallagatan 9 | Existing game pin: 59.380512, 13.503791 | 100833292, north |
| Espresso House | Drottninggatan 22 | 59.3794, 13.49963 | 113214336, south; corner building has Järnvägsgatan 8 as its OSM address |
| Espresso House | Drottninggatan 15 | 59.379049, 13.502027 | 106078946, north |
| Pressbyrån | Kungsgatan 14 | 59.38107, 13.5036259 | 104778937, south |
| Pressbyrån | Drottninggatan 20 | 59.37927, 13.5001049 | 110733723, south |

Address sources:
- [O’Learys Karlstad](https://olearys.com/sv-se/karlstad/)
- [Espresso House Drottninggatan](https://espressohouse.com/hitta-oss/drottninggatan-kar), [15-huset](https://espressohouse.com/hitta-oss/karlstad-15-huset) — coordinates from their public store page data.
- [Pressbyråns store locator](https://www.pressbyran.se/kontakt/hitta-butik/) — its [public store dataset](https://public-store-data-prod.storage.googleapis.com/stores-pressbyran.json), store IDs **25391** and **28390**.

## Original logo assets

Three small, local logo files total approximately **42 kB**, loaded asynchronously once. The game needs no external brand server while playing. Fallback text remains readable if an asset fails.

- `brands/olearys.png`: the unchanged white PNG wordmark from the official [O’Learys career site](https://career.olearys.com/) at its original aspect ratio. [Original file](https://images.teamtailor-cdn.com/images/s3/teamtailor-production/logotype-v3/image_uploads/5a945a6d-b23a-42f1-b715-8b1d5ac8ca2f/original.png).
- `brands/espresso.svg`: original inline SVG logo paths from the official Espresso House page, with its CSS colour resolved to a dark green so it renders standalone.
- `brands/pressbyran.png`: unchanged PNG of the 2026 wordmark from [Pressbyråns official logo page](https://www.pressbyran.se/om-pressbyran/logotyper/). [Original file](https://storage.googleapis.com/pressbyran-media-bucket-prod/public/cb1e2c55-pb-logo-2026-argb-1024x205.png).

Marks belong to their respective owners. Depiction of real shops does not assert sponsorship or a commercial agreement. The earlier Löfbergs, NWT and Karlstads Energi gameplay kiosks remain fictional game stations, distinct from these address-based shopfronts.

## Graphics 2.8 · shops and sharper facades (2026-10-01)

Tenant names and floors: https://mitticity.com/butiker/ . Coop City and Cervera are on plan 0; Clas Ohlson is on plan 1. The three room footprints are a playable interpretation, not a surveyed indoor plan. External mall entrances follow the OSM corridors documented above. Friendly clerks are fictional game characters.

Official tenant logos downloaded unchanged from the centre directory (WebP; 300 px sources, baked into cached sign textures at boot):
- `cervera.webp`: https://dam.thon.com/transform/e5641523-f00e-4e46-b688-e35fd7a3bc15/cervera-png?io=transform%3Afit%2Cwidth%3A300&format=webp
- `clas.webp`: https://dam.thon.com/transform/297df5c7-5029-49f5-bcce-1ec63365b046/clas_ohlson-logo-svg?io=transform%3Afit%2Cwidth%3A300&format=webp
- `coop.webp`: https://dam.thon.com/transform/d9d78941-42e0-4c52-8cf6-6fc693166c71/Coop_City_logo-png?io=transform%3Afit%2Cwidth%3A300&format=webp

The generic street facade artwork remains original procedural comic art. All 81 decorated blocks keep their existing OSM coordinates; their windows and shop drawings are stylized rather than surveyed facades. The nine landmark volumes keep separate, reference-based geometry and artwork.
