# Expedíciós frissítés

- Az utolsó aranyrög kibányászása sikeresen lezárja a programot, beágyazott ciklusban is. A kliens és a szerver ugyanazt a motort használja. Arany nélküli térképen továbbra is futtathatók a nyelvi példák.
- Futás közben minden sebességváltás azonnal érvényesül. Az Azonnali mód a már kiszámolt végállapotot jeleníti meg, nem egyenként gyorsítja az animáció eseményeit.
- A mintaprogram-választóból az aktuális minta is újra betölthető. A havazás és a mintaprogramok menüje egérrel, nyilakkal, Enterrel és Escape-pel is kezelhető.
- A rendszerpályák új nevei: Hajnalcsillag-tárna, Deres szikla, Jégcsap-akna, Fagyos kanyarulat, Északi aranymély. Új pálya: Örökfagy labirintusa (15 × 15, 18 arany).
- 15 kártyaillusztráció áll rendelkezésre, stabil pályaazonosító szerinti választással.

## Meglévő telepítés frissítése

Futtasd a projekt gyökerében az `npm run db:init` parancsot, majd az `npm run build` parancsot és indítsd újra a szervert. A db:init a rendszerpályákat a régi nevük alapján is megtalálja: helyben frissíti a nevüket és leírásukat, megtartja az azonosítókat, a pályaadatokat és a kapcsolódó futásokat. A saját térképeket nem módosítja. Az új rendszerpályát csak akkor hozza létre, ha még nem létezik.

A helyi adatbázis frissítése megtörtént. Ellenőrzés: 73 egységteszt, típusellenőrzés, build, valamint böngészős próbák a futás közbeni sebességváltásra, saját pályás automatikus leállásra és a lenyílók mobilos/billentyűzetes használatára.
