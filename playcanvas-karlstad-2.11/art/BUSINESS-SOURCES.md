# Karlstad business facade sources

Verified 2026-10-03. These sources are for geographic/visual identity only; gameplay does not depend on them.

| Business | Address used in game | Status | Source |
| --- | --- | --- | --- |
| MusicPartner | Kungsgatan 6D | verified | https://www.musicpartner.se/kontakt |
| Synsam Karlstad O Torggatan | Ostra Torggatan 11 | verified | https://www.synsam.se/optiker/synsam-karlstad-o-torggatan |
| Normal | Drottninggatan 11 | verified; OSM building anchor approximate | https://www.hitta.se/normal%2Bsweden%2Bab%2Bkarlstad%2Bdrottninggatan/karlstad/aqxehjop |
| Hotel Fratelli | Drottninggatan 17 | verified | https://www.strawberry.se/hotell/sverige/karlstad/hotel-fratelli/ |
| Hemkop Karlstad C | Drottninggatan 33 | verified | https://www.hemkop.se/butik/4755 |
| Burger King Karlstad City | Ostra Torggatan 9 | verified | https://www.karlstad.com/restauranger/burger-king-ostra-torggatan |
| Sibylla Karlstad City | Ostra Torggatan 7 | verified | https://www.sibylla.se/vara-sibyllor/ |
| Grekiska Grill & Bar | Tingvallagatan 15 | verified | https://www.tripadvisor.se/Restaurant_Review-g189873-d27109063-Reviews-Grekiska_Grill_Bar-Karlstad_Varmland_County.html |
| The Leprechaun | Ostra Torggatan 4 | verified | https://alkt.karlstad.se/AlkTWebbforms/Restaurants/Show/132 |
| Apoteket Mitt i City | Jarnvagsgatan 14 | verified; rendered inside Mitt i City | https://www.apoteket.se/apotek/apoteket-mitt-i-city-karlstad/ |
| Go Banana | Drottninggatan 37B | verified; outside current OSM building snapshot, not rendered yet | https://wolt.com/sv/swe/karlstad/venue/go-banana/items/snacks-4 |

## Rendering rule

A business is rendered only when its facade can be attached to a mapped building or a mapped mall interior. Never create a floating facade just to make a brand visible. Businesses outside the current building snapshot stay in `UNMAPPED_BUSINESSES` until the OSM extract is expanded.

MusicPartner is represented as a music-service office/studio with a coffee-bar feel, not as an instrument shop.

## Skyltar och logotyper (2.11.26)

Butiksuppgifterna (namn, adress, färger, `REAL_BUSINESSES` i `businesses.mjs`) fanns redan och ritades som kort på fasaderna, men skyltarna var små och bestod bara av namnet i ett vanligt typsnitt. Det som saknades var logotyper och tydliga neonskyltar.

Nu har alla 20 verkliga verksamheter (neonskyltarna som först lades ovanför butikerna togs bort i 2.11.27 eftersom de dubblade fascia-skylten; neonläget finns kvar i ):

* **Logotyp på fascian.** Egenritade vektorlogotyper i `brand-logos.mjs`, byggda på varumärkets färger och bokstavsstil (till exempel Synsams glasögon, Hemköps hjärta, Leprechauns klöver, Burger Kings bullar, Apoteketets blad och kors). Inga tredjepartsfiler kopieras eller distribueras.
* **Hängskylt** med logotyp, 1,3 × 1,3 m, vinkelrät mot fasaden.
* **Skyltplatta** med logotyp för verksamheter utan egen butiksfasad (hotellen, Lindex, KICKS, Apoteket Örnen, Synsam Outlet).

Rättat i samma pass: Rådhuscaféets skylt göms bakom Rådhusets pelare (flyttad fram 2,6 m) och KICKS/Apoteket Örnen krockade med Galleria Duvans skylt och pelare (sidoförskjutna 10,5 m och framflyttade 0,9 m).

Pressbyrån (Kungsgatan 14) får ingen neonskylt: den fasaden är låst. Verksamheter med officiell logotypfil (`art/brands/`: O'Learys, Pressbyrån, Espresso House, Galleria Duvan, Åhléns, Mitt i City, Värmlandsmuseet, Värmlandstrafik) behåller den.

Bilder efter ändringen: `art/signage/`.
