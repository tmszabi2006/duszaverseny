# MineScript – projektleírás

**Dusza Árpád Országos Programozói Emlékverseny 2026/2027., I. forduló (webes verseny)**

A beadott alkalmazás egy webes bányászrobot-szimulátor. A játékos MineScript nyelven
programot ír, a program vezérli a robotot egy labirintusban, a begyűjtött arany és a
feldolgozott programsorok száma pedig ranglistára kerül. A program forrása szöveges
fájlból importálható, szerkeszthető, szintaktikailag ellenőrizhető és futtatható.

## Hogyan érhető el?

Indítás után a `http://localhost:5173` (fejlesztés) vagy a telepített domain cím nyílik meg.
Először regisztrálni kell; utána a **Térképek** oldal érhető el.

| Funkció | Elérés |
| --- | --- |
| Regisztráció / bejelentkezés | Kezdőlap, jobb oldali panel; a munkamenet HttpOnly cookie-ban marad. |
| Térkép választása | **Térképek** menü; kereső és „csak a sajátjaim” szűrő. |
| Program írása / importálása | Térkép megnyitása → jobb oldali **Program** panel; mintaprogram, Import, Export, Törlés. |
| Szintaktikai ellenőrzés | **Futtatás** előtt automatikusan; hiba esetén a hibás sor és üzenet jelenik meg. |
| Futtatás és animáció | **Futtatás** gomb; a robot, a felfedezett terület, az arany, az aktuális sor és a konzol élőben követhető. Sebesség és **Leállítás** is választható. |
| Ranglista | Térkép oldalának jobb alsó **Ranglista** panelje; futás után automatikusan frissül. |
| Térkép készítése | **+ Új térkép építése**; fal/arany/üres/robot festése, méret, irány, import/export, mentés. |
| Saját térkép szerkesztése | Térképlista → **Szerkesztés**, vagy a pálya oldalán a **Szerkesztés** gomb. |
| Futástörténet | **Profil** menü; statisztikák és az utolsó 50 futás, program visszatöltése. |

## Elkészült részek

- Teljes MineScript nyelvtan és interpreter a feladatsor szerint: változók és típusrögzítés,
  `step`, `turn`, `mine`, `print`, `isThere`, `set`, `if/else`, `while`, kifejezések,
  behúzásvezérelt blokkok, szintaktikai és futásidejű hibák.
- Pontos lépésszámolás, 1000 feldolgozott programsoros limit és a hozzá tartozó
  `INSTRUCTION_COUNT_LIMIT_EXCEEDED` hiba.
- Térképformátum beolvasása, validálása, kanonikus exportja; hibás fájl nem töltődik be.
- Regisztráció, bejelentkezés, kijelentkezés, jelszóhash, munkamenet, jogosultságkezelés.
- Térképlista, nyilvános/privát pályák, tulajdonosi szerkesztés és törlés.
- Térképszerkesztő importtal/exporttal, méretezéssel, festéssel, robotirányítással.
- Program-import/export, mintaprogramok, böngészős piszkozatmentés.
- Animatív futtatás, aktuális sor kiemelése, konzol, sebességállítás, leállítás.
- Szerveroldali újrafuttatás és eredményhitelesítés; a kliens által jelentett pontszám nem
  számít.
- Térképenkénti ranglista (több arany, majd kevesebb lépés), profilstatisztikák.
- Öt demótérkép és mintaprogramok az azonnali kipróbáláshoz.
- Reszponzív, sötét bányatémájú felület, akadálymentes címkék, fókusz- és kontrasztkezelés.
- Biztonsági alapok: Helmet/CSP, HttpOnly cookie, SameSite, bcrypt, rate limit, bemeneti
  hossz- és típusellenőrzés, SQL-paraméterezés.

## Nem készült el / tudatosan kimaradt

- Jelszó-visszaállítás, e-mail-verifikáció, fióktörlés, adminfelület és moderáció.
- Valós idejű többjátékos mód; a ranglista kérésre frissül, nincs websocket.
- Felhasználói megoldások nyilvános megosztása és a ranglistából való megnyitása.
- Térkép-verziózás/forkolás; a futással rendelkező pálya tartalma szándékosan zárolt.
- Automatizált böngészős end-to-end teszt; a közös motor egységtesztjei készültek el.
- Többnyelvűség; a felület magyar.

## Plusz szolgáltatások az alapfeladathoz képest

- Élő, sebességállítható animáció és szerveroldali eredményhitelesítés.
- Saját pályák nyilvános vagy privát megosztása, kereshető térképlista.
- Mintaprogramok, piszkozatmentés, korábbi program visszatöltése a profilból.
- Részletes profilstatisztikák és futástörténet.
- Sötét, tematikus, mobilra is alkalmazkodó felület; akadálymentes jelölések.
- Biztonsági védelem és alkalmas telepítési konfiguráció (systemd, Apache reverse proxy).

## Felmerült problémák és megoldások

1. **A kliens és a szerver ne értsen mást a nyelven.** Külön parser/interpreter a
   böngészőben és a szerveren könnyen elcsúszott volna. Ezért a nyelvet, a térképkezelést és
   a futtatót közös TypeScript-csomagba (`shared`) szerveztük, amelyet mindkét oldal ugyanúgy
   használ.
2. **A pontszám ne legyen hamisítható.** A kliens csak az animációhoz futtat; a beküldött
   forráskódot a szerver újra futtatja, és kizárólag az ő eredménye kerül az adatbázisba.
3. **A ranglista ne romoljon el pályamódosítással.** Ha egy térképen már született futás, a
   pálya tartalma nem módosítható; csak a név, leírás és láthatóság. Új változathoz új térkép
   hozható létre.
4. **A felfedezetlen terület ne szivárogjon ki.** A kezdetben ismeretlen mezőket a felület
   egységes sötét cellaként rajzolja, az arany és a fal csak felfedezés után látszik.
5. **Az 1000 soros limit pontosan érvényesüljön.** A számláló minden végrehajtott sor előtt
   nő, a ciklusok visszaugráskor is számítanak, az `else` csak lefutáskor. A limit túllépése
   külön hibakóddal jelenik meg.
6. **A célkörnyezet PHP-t is kínál, mégis Node.js-t használunk.** A közös interpreter miatt
   így nem kell a nyelvet kétszer implementálni; a Node-szerver Apache reverse proxy mögött
   fut, a MySQL 8 és a HTTPS változatlanul működik. Ezt a döntést a projekt dokumentációja
   részletesen indokolja.
7. **Hibás import ne törje össze az alkalmazást.** A térkép- és programimportálás a közös
   validátort használja; hiba esetén a korábbi tartalom megmarad, és érthető, sorszámot is
   tartalmazó üzenet jelenik meg.

## Téli kiegészítés és használhatósági javítások

- Új expedíciós megjelenés: havas bányabejárat, lámpafény, feldíszített fenyő, saját bányászrobot és illusztrált tárnák.
- Többrétegű, szélben sodródó canvas-havazás, megjegyzett kikapcsolt / finom / erősebb fokozattal. Csökkentett mozgás beállításnál
  nem jelenik meg; háttérbe tett böngészőlapon szünetel.
- A térképszerkesztő mezői Tab billentyűvel elérhetők, Enterrel vagy szóközzel festhetők.
  A nyílbillentyűkkel a szomszédos mezőre lehet lépni.
- Méretcsökkentéskor a robot új mezője mindig üres kamra marad.
- A későn érkező futási és ranglista-válaszok nem írják felül az új pálya állapotát.
- A futások lekérdezése a futás tulajdonosát is betölti, így a saját megoldás
  idegen pályán is hozzáférhető. A jogosultságokat külön regressziós teszt ellenőrzi.

## Fejlesztési ötletek

- Megoldások közzététele és összehasonlítása a ranglistából.
- Napi kihívás, szezonális ranglista, teljesítményjelvények.
- Térkép-verziózás és fork, hogy a régi ranglista megmaradjon.
- Tanári mód automatikus megoldás-ellenőrzéssel.
- Csökkentett mozgás és további akadálymentesítési beállítások.

## Futtatás

A részletes telepítési és fejlesztői útmutató a [README.md](../README.md) és a
[docs/deployment.md](deployment.md) fájlban található. A lényeg:

```bash
npm install
cp server/.env.example server/.env   # adatok kitöltése
npm run db:init                      # séma + demótérképek
npm run dev                          # fejlesztés
# vagy
npm run build && npm start           # éles build
```
