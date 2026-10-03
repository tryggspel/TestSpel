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


## City Explore 2.9 · 2026-10-02

Derived geometry in `city-south-data.mjs` is © OpenStreetMap contributors, ODbL. Coordinates use the existing origin/projection; no new pixel-to-world alignment is introduced.

- OSM map extract: https://api.openstreetmap.org/api/0.6/map?bbox=13.48,59.366,13.516,59.383
- Klarälven relation 2153149: https://api.openstreetmap.org/api/0.6/relation/2153149/full
- Additional water: Inre hamn way 6959681, Mariebergsviken 10844531, Pråmkanalen 81834339. Central river/harbour geometry is clipped, triangulated offline and paired with precomputed two-metre collision rows. OSM outer/inner rings are preserved.
- School ways 77107220, 100024120 and 100024325; Löfbergs 80278038 and 103767839; Karlstad Central 356121937; Home Hotel Bilan 80868525; Frimurarlogen 101608925. Kil station: https://api.openstreetmap.org/api/0.6/way/100310623/full
- Boat landing nodes: Inre hamn 5754143904 and Mariebergsskogen 4230809786. Boarding positions use the adjacent safe quays. Remote destinations retain world coordinates but are small game areas, not complete geographic replicas.
- Tingvalla facade cues (arched windows/doors, yellow brick, low metal roof, iron fence): [Länsstyrelsen's building record](https://ext-dokument.lansstyrelsen.se/Varmland/Dokumentarkiv/Kulturmiljo/Byggnadsminnen/tingvallagymnasiet.pdf) and [Karlstad's Tingvallastaden reference](https://karlstad.se/kommun-och-politik/sa-arbetar-vi-med/kulturmiljo/omradesbeskrivningar/tingvallastaden). All game artwork is original mesh geometry.
- Bilan's former prison identity and architectural reference: https://www.strawberry.se/hotell/sverige/karlstad/home-hotel-bilan/ . Lobby/cell corridor is fictional game layout with a permanently open exit.
- Löfbergs location reference: https://www.lofbergs.se/kaffebar/ . The coffee tower and wordmarks are stylized; the nearby concept kiosks still do not represent real business addresses.
- Boat route reference: [Värmlandstrafik 2026 season](https://www.varmlandstrafik.se/varmlandstrafik/nyhetsarkiv/nyhetsarkiv-varmlandstrafik/2026-03-11-sa-ser-sommarens-batbussasong-ut), line 91 Inre hamn–Mariebergsskogen. Train destination reference: https://www.jernhusen.se/hitta-din-station/kil-station/ and https://www.varmlandstrafik.se/varmlandstrafik/res-med-oss/tidtabeller/tag . Travel time/boarding availability in the game is fictional, not a live public-transport timetable.
- `brands/varmlandstrafik.svg`: unchanged official logo, downloaded from https://www.varmlandstrafik.se/images/18.27ed5965185a5174b3e11bd7/1674035489724/VarmlandTrafikLogga.svg . Yellow/grey follows the agency's [colour identity](https://www.varmlandstrafik.se/varmlandstrafik/sidor/om/om-varmlandstrafik/grafisk-profil/om-var-grafiska-profil/farger) in the game's comic palette. Depiction does not imply sponsorship.


## 2.11.0

- Kvartersfyllnad, gågator (highway=pedestrian), gatstensytan vid Museigatan (way 923099551), Västra bron (ways 101485444, 101485446, 101485447, 101485449), Residenset (101186411), Biskopsgården (106864586) och Wermland Opera (75896103): OpenStreetMap-utdraget i `data/`, © OpenStreetMap contributors, ODbL.
- En stadskarta över Karlstad (2006) användes som referens för namn och lägen (stadsdelar, parker, gågator). Kartbilden ingår inte i spelet.
- Landmärkenas former, färger och detaljer är stiliserade tolkningar, inte uppmätta.


## Kungsgatan reference pass · 2.11.4

User-provided Street View: https://maps.app.goo.gl/isAY5kcebe71yz1q9
Panorama `w8KtpcPLB5AximYHC5oAcQ`, camera 59.3810358, 13.5030645, June 2026 imagery, visually inspected 2026-10-03. Kungsgatan 14/16/18 are bound to OSM ways 104778937/106078910/104529126. Colours, window rhythm and terrace construction are hand-built interpretations; no imagery is shipped. Roofs/heights retain the existing OSM interpretation. The foliage obscures parts of the facades, so unobserved details are simplified. This pass covers only the north facade row facing the square, not a complete survey of Stora Torget.

## Inner-city reference pass · 2.11.5 (first batch)

This pass continues the hand-built facade system from Kungsgatan 14–18. OSM supplies footprint, address and height; visual references only guide facade colour, window rhythm, storefront proportions and characteristic details. No third-party photograph is included in the game.

First bound buildings:
- Drottninggatan 19 / OSM 104396327 — yellow-brick Läkarhuset frontage. Public facade reference: https://www.realadvice.se/2019/04/11/stadsrum-forvarvar-lakarhuset-i-karlstad/ ; current address/business cross-check: https://www.synsam.se/optiker/synsam-outlet-karlstad .
- Västra Torggatan 5 / OSM 108352774 — brick pedestrian-street frontage with green awning/street-level rhythm. Public facade references: https://www.realadvice.se/objekt/vastra-torggatan-5-centrum/ and https://commons.wikimedia.org/wiki/File:V%C3%A4stra_Torggatan_5,_Karlstad.JPG .
- Västra Torggatan 11 / OSM 105746401 — red four-storey corner frontage with pale window surrounds. Public facade reference: https://www.lokalguiden.se/lokal/5-v%C3%A4stra-torggatan-11-centrum .
- Kungsgatan 12 / OSM 101170479 — pale 1960-era block with regular broad bays. Public facade reference: https://objektvision.se/Beskriv/258051625 .
- Kungsgatan 20 / OSM 102590980 — orange-brick frontage with strong blue balcony identity. Public facade reference: https://hyresbostader.se/sok-ledigt/118602-0350/ .

Direct interactive Google Street View rendering is not available in this build environment, so these five are an initial reference-photo pass. Exact panorama-by-panorama refinement should retain these OSM bindings and static-mesh limits.


## Inner-city reference pass · 2.11.6

Continuation west along Drottninggatan and into Västra Torggatan. OSM remains authoritative for footprint, address and building height; the sources below are visual references for hand-built facade interpretation only.

- **Drottninggatan 17 / OSM 104529134 · Hotel Fratelli.** Current facade references: https://www.strawberry.se/hotell/sverige/karlstad/hotel-fratelli/ and https://www.krooktjader.se/projekt/hotel-fratelli . These support the warm brick facade, pale framed windows, dark street-level band and striped awnings.
- **Drottninggatan 20 / OSM 110733723.** Address/building-age cross-check: https://www.hitta.se/v%C3%A4rmlands%2Bl%C3%A4n/karlstad/drottninggatan%2B20/omr%C3%A5de/59.379395%3A13.5004 . Storefront reference: https://www.hemnet.se/bostad/ovrigt-44m2-centrum-karlstads-kommun-drottninggatan-20-21274065 . The implementation keeps a red-brick upper facade and a light tiled retail base; current business names are intentionally not baked into geometry.
- **Drottninggatan 26 / OSM 101935904.** Property reference: https://www.altra.se/sv/property/karlstad-bjornen-12/ and historical property data in Nyfosa/Altra material (Karlstad Björnen 12, built 1977). Exact facade details are deliberately conservative because the available public imagery is incomplete.
- **Västra Torggatan 1 / OSM 106078942 · Hotel Savoy.** Current visual references: https://www.booking.com/hotel/se/best-western-savoy.html and Google Maps place listing for Västra Torggatan 1. The facade treatment uses a dark hotel/restaurant canopy, warm brick upper storeys and large ground-floor glazing.
- **Kungsgatan 22 / OSM 102496100 · Elite Stadshotellet** remains the next Kungsgatan refinement anchor. Historical identification: https://commons.wikimedia.org/wiki/File:Karlstad,_V%C3%A4rmland,_Sweden_(6800042144).jpg ; current facade reference: https://www.hotelspecials.se/elite-stadshotellet-karlstad .

Direct interactive Street View rendering is not available in this execution environment. Where a Google place listing is used, it is a location/business cross-check; exact visual details come only from public facade photographs that can be inspected directly.


## Street View/reference pass · 2.11.7

- **Drottninggatan 21 / OSM 103767827.** Primary visual reference: https://www.larande.se/om-oss/nyheter/har-startar-realgymnasiet-i-karlstad . The photograph clearly supports the red-brown brick facade, stacked projecting bay windows, dark retail/entrance band, large display glazing, benches and dark pedestrian-street lamps.
- **Elite Stadshotellet / Kungsgatan 22 / OSM 102496100.** Primary current reference: https://www.elite.se/hotell/karlstad/elite-stadshotellet-karlstad/ . Google place/address cross-check: https://www.google.com/travel/hotels/entity/CgoInJn5jvOF5PpSEAE . The dedicated facade uses the documented yellow plaster, white pilaster rhythm, tall arched windows, balconies, green awnings and black ELITE entrance canopy.
- **Västra Torggatan pedestrian furniture.** Visual rhythm cross-check: https://www.realadvice.se/objekt/vastra-torggatan-5-centrum/ . Benches and lamps are stylised placements inside the existing pedestrian corridor and are render-only.

Google Street View was explicitly attempted as the preferred method. Interactive Street View itself is not exposed to the current execution environment, so no unverified panorama detail has been invented. Where direct Street View inspection is unavailable, only features supported by inspectable public facade photographs are modelled.


## Inner-city reference pass · 2.11.8

- **Drottninggatan 24 / OSM 101485439.** Address/property cross-check: https://www.altra.se/en/property/karlstad-bjornen-7/ and https://www.hitta.se/v%C3%A4rmlands%2Bl%C3%A4n/karlstad/drottninggatan%2B24/omr%C3%A5de/59.379402%3A13.498833 . Current streetscape reference includes the photographed pink-grey stone cladding, tall blue glazing and horizontal blue awnings visible in Karlstad street imagery.
- **Västra Torggatan 9 / OSM 106864602.** Karlstad culture-environment reference: https://gi.karlstad.se/kulprog/visa.php?id=17&typ=byggnad . Historical location confirmation: https://preprod.digitaltmuseum.se/021019677134/fasad-av-byggnad-vid-torg-med-butikslokaler-i-bottenplanet-fotografens and the Värmlands Museum/DigitaltMuseum record for Bäckmans färghandel. The game uses the documented light plaster, pilasters/decorative rhythm, portal and shop-window character; it does not reproduce historical advertising.
- **Västra Torggatan 3 / OSM 104778900.** Conservative streetscape interpretation based on the continuous pedestrian-street photo series around Västra Torggatan 5: https://www.realadvice.se/objekt/vastra-torggatan-5-centrum/ . Only brick tone, glazing rhythm and a restrained awning band are inferred; no exact business identity is asserted.
- **Gågatan street furniture.** Benches, dark lamp posts, planters and hanging/greenery rhythm are based on repeated contemporary imagery of Västra Torggatan and Drottninggatan, including Real Advice/Objektvision street photos.

Google Street View remains the preferred visual reference when an inspectable panorama is available. The execution environment still cannot drive the interactive Street View viewer directly, so every geometric detail in this pass is cross-checked against public still imagery and OSM instead of pretending that an uninspected panorama was used.
