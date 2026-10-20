# Bakgrundsfoto till Julkalendern

Lägg ett snöigt vinterfoto av Karlstad här så ersätter det den ritade bakgrunden automatiskt. Ingen kodändring behövs.

| Fil | Innehåll |
|---|---|
| `karlstad-snow.webp` eller `karlstad-snow.jpg` | Fotot. WebP provas först. |
| `credit.txt` (valfri) | En rad bildtext som visas i sidfoten efter "Foto: ", till exempel `Förnamn Efternamn, CC BY-SA 4.0`. |

## Råd

- **Liggande, minst 2000 px bred**, helst under 500 kB (WebP kvalitet ~75). Bilden täcker hela skärmen (`object-fit: cover`), och på mobil beskärs sidorna, så **lägg det viktiga i mitten**. Tyngdpunkten är 62 % ned (`.scene-photo` i `calendar.css`).
- Mörk eller dämpad himmel fungerar bäst: texten ligger direkt på bilden. Sidan lägger själv på en mörk toning, men en ljus dagbild blir ändå svårläst.
- **Licens:** använd ett eget foto eller ett med licens som tillåter publicering, och ange fotograf och licens i `credit.txt` om licensen kräver det (till exempel CC BY). Lägg inte in bilder utan rätt att publicera dem.
- Om bilden är smalare än 400 px ignoreras den.
