# AI-használati nyilatkozat

**Projekt:** MineScript – bányászrobot szimulátor  
**Verseny:** Dusza Árpád Országos Programozói Emlékverseny, 2026/2027, I. forduló  
**Csapat:** három fős verseny-csapat  
**Dátum:** 2026. november 7.

## 1. Milyen AI-eszközöket és modelleket használtam?

- **OpenCode** – AI-vezérelt fejlesztői ügynök (az OpenCode asztali alkalmazás aktuális verziója; a munkamenet nem jelentett meg külön verziószámot).
- **DeepSeek V4.1 Flash Free** – nyelvi modell (szolgáltató: `opencode`, modellazonosító: `deepseek-v4.1-flash-free`).

A munkamenet során nem használtunk más generatív AI-eszközt vagy modellt.

## 2. Mire használtunk az AI-t, és körülbelül mekkora részben?

Az AI-t elsősorban a **megjelenítési réteg újratervezésére**, néhány kliensoldali komponens átalakítására, valamint a **backend és az adatbázis célzott átvizsgálására és optimalizálására** használtuk.

Konkrétan AI-segítséggel készült:

- a teljes `client/src/styles.css` designrendszer újraírása (kb. 2 700 sor: színtokenek, tipográfia, elrendezés, kártyák, űrlapok, térképnézet, kódszerkesztő, ranglista, reszponzív töréspontok, animációk, csökkentett mozgás támogatása);
- a `Logo` komponens kiemelése, a fejléc és a belépőoldal frissítése, favicon készítése;
- a `ProgramEditor` újraírása szintaxiskiemelő átfedéssel, görgetésszinkronnal, Tab/Shift+Tab behúzással, automatikus behúzással és Ctrl/Cmd+Enter gyorsparanccsal;
- a `MapView` robotméret-hibájának javítása nem négyzetes térképeken, valamint a térkép látogatási módainak (alapértelmezett halvány fal/arany és a teljes sötétség opció) stílusának beállítása;
- a játékoldal jelmagyarázatának, aranyhaladás-sávjának és gyorsparancsának hozzáadása;
- a térképlista keresőtörlésének és kártyagrafikájának javítása;
- backend-oldali lekérdezés-optimalizálások, tömörítés, cache-fejlécek, indexmigráció és bejelentkezési időzítés elleni védelem;
- a dokumentáció és ez a nyilatkozat.

A program **funkcionális magja** (a közös parser, interpreter, térképfeldolgozó motor, az API alapstruktúrája és az eredeti adatbázisséma) nem ebben a munkamenetben készült, ezért ahhoz az AI csak célzott, kis módosításokat végzett. A jelenlegi forráskódbázis **kb. 35–40%-a** érintett AI-segítséggel; ezen belül a CSS gyakorlatilag teljes egészében AI-val készült, a TypeScript-kód kisebb részben (főleg a felsorolt komponensek és a szerveroptimalizálások).

Nem használtunk AI-t a versenyfeladat értelmezésére, a játékszabályok eldöntésére, a meglévő tesztek elvárásainak megváltoztatására, illetve arra, hogy a program viselkedését ellenőrzés nélkül elfogadjuk.

## 3. Hogyan ellenőriztük és javították az AI eredményét?

- **Típusellenőrzés:** `npm run typecheck` – a shared, a server és a client csomag is hibamentesen lefordult.
- **Egységtesztek:** `npm run test` – 67 teszt futott le sikeresen (parser, interpreter, térképkezelés).
- **Éles build:** `npm run build` – a Vite build elkészült; a CSS mérete az eredeti ~3 KB-ról ~43,5 KB-ra nőtt, ami visszaigazolja, hogy a hiányzó stílusok pótlásra kerültek.
- **Biztonsági audit:** `npm audit --omit=dev` – 0 termelési sebezhetőség.
- **Böngészős manuális ellenőrzés:** ideiglenes mock API-val kipróbáltuk a belépést, a térképlistát, a játékoldalt (futtatás, aranyhaladás, konzol, ranglista), a profilt és a térképszerkesztőt. Ellenőriztük a 919 px széles (tablet) elrendezést is.
- **Hibajavítások az ellenőrzés után:**
  - a szintaxiskiemelő első változata a globális `code` stílus egy sorral eltolta; ezt CSS-resettel javították, majd böngészőben újra ellenőrizték;
  - a csákány-logó első vonalas változata kicsiben nem volt felismerhető, ezért letisztultabb, nagyobb kontrasztú ikonra cserélték;
  - a mobilos töréspontoknál a statisztikakártyák és a gombok tördelését kézzel finomították;
  - a térképen a halvány falak és aranyok túlreztek voltak, ezért a `.map-cell-faint-*` stílusok átállítókra kerültek, hogy alapértelmezésben látszódjanak, de halványak maradjanak; a „teljes sötétség” módban a felderítetlen mezők teljesen sötétek.

**Korlát:** a gépen nem futott MySQL szolgáltatás, ezért a valódi adatbázis ellen a teljes integrációs teszt nem volt elvégezhető. A SQL-módosításokat (indexek, idempotens migráció, lekérdezések) típusellenőrzéssel és kódolvasással validáltuk, a felületet pedig mock API-val. Élesítés előtt kötelezőnek tartjuk a `npm run db:init` futtatását és egy valódi adatbázisos füsttesztet.

## 4. Öt konkrét eset

### 1. eset – A teljes CSS designrendszer újraírása (sikeres)

A kiinduló `styles.css` mindössze ~170 sor volt, miközben a komponensek több száz osztálynevet használtak, ezért az oldalak nagy része formázatlanul jelent meg. Az AI-val új, sötét bányász témájú, arany kiemelésű designrendszert készítettek: tokenek, elrendezés, kártyák, űrlapok, állapotjelzők, táblázatok, kódszerkesztő és reszponzív szabályok. **Ellenőrzés:** a build során a CSS ~43,5 KB lett, és böngészőben a belépő-, térkép-, játék-, profil- és szerkesztőoldal is helyesen jelent meg. **Eredmény:** sikerült; a legnagyobb vizuális hiányosság megszűnt.

### 2. eset – Robotméret nem négyzetes térképen (sikeres)

A `MapView` a robot szélességét és magasságát is a `--cols` változóból számolta. Egy 15×3-as térképen ezért a robot magassága a térkép magasságának csak 1/15-e volt, míg a szélessége 1/15-e, így a robot négyzetes helyett összenyomottan jelent meg. Hozzáadták a `--rows` változót, és a magasságszámítást arra állították át. **Ellenőrzés:** a 15×3-as „Aranyér” pályán a robot a várt méretben és helyen jelent meg. **Eredmény:** sikerült.

### 3. eset – Szintaxiskiemelő szerkesztő és gyorsparancs (sikeres, egy javítással)

A `ProgramEditor` korábban csak olvasható módban emelte ki a szintaxist, szerkesztés közben sima textarea volt. Az új változat átlátszó textarea fölötti kiemelő réteget, görgetésszinkront, sorszámozást, Tab/Shift+Tab behúzást, automatikus behúzást és Ctrl/Cmd+Enter futtatást kapott. Az első böngészős ellenőrzéskor a globális `code` elem paddingja miatt a kiemelés egy sorral elcsúszott; ezt a `.code-highlight code` stílus nullázásával javították. **Ellenőrzés:** a Tab két szóközt szúrt be, a Ctrl+Enter elindította a futást, a kiemelés pedig sorra illeszkedett. **Eredmény:** sikerült.

### 4. eset – Backend- és adatbázis-optimalizálás (részben ellenőrzött)

Az AI átvizsgálta a szervert, és több pazarló műveletet talált: a térképlista a teljes `data` mezőt letöltötte, a térkép mentése külön `COUNT(*)` lekérdezést futtatott, a futásindítás pedig feleslegesen számolta a futásszámot. Ezek külön summary/detail/content lekérdezésekre bontottak, tömörítést és API `no-store` fejlécet tett be, a statikus assetekhez hosszú cache-t adtak, a lekérdezéseket előkészített rejtett paraméterezésre állították, valamint indexeket és idempotens `db:init` migrációt készítettek. **Ellenőrzés:** typecheck, 67 teszt és build sikeres; valódi MySQL hiányában azonban a lekérdezések futásidejű viselkedését nem sikerült mérni. **Eredmény:** a kód szintjén sikeres, éles adatbázison még füsttesztelendő.

### 5. eset – Bejelentkezési időzítés és hibás AI-feltételezés (részben sikertelen)

A bejelentkezésnél a nem létező felhasználónév esetén a szerver azonnal hibát adott, létező felhasználónál viszont lefuttatta a bcrypt-összehasonlítást, így a válaszidőből következtethető volt a felhasználónév létezésére. Az AI javaslatára egy ismert, soha nem egyező dummy bcrypt-hash-sel minden esetben lefuttatták az összehasonlítást. **A részben sikertelen rész:** a helyes megoldás végleges ellenőrzéséhez valódi MySQL és időmérés kellett volna, ami a gépen nem volt elérhető; továbbá az AI első javaslata a rövid/üres felhasználóneveket még a bcrypt előtt utasította el, ami továbbra is hagy egy kisebb időzítéskülönbséget. Ezt a korlátot tudatosan vállalták, mert a gyakorlati kockázat kicsi, a felhasználónév-létezés pedig amúgy is kiderülhet regisztrációs próbával. **Eredmény:** a fő időzítési rés betömve, de az éles ellenőrzés hiányos.

## 5. Összegzés

Az AI érdemi segítséget adott a felület újratervezésében és a backend célzott optimalizálásában, de a végső döntéseket, az ellenőrzést és a hibajavításokat a csapat végezte. A projekt funkcionális magja továbbra is a korábban elkészült, saját kódon alapul; az AI által generált részeket típusellenőrzéssel, tesztekkel, builddel és böngészős próbákkal ellenőrizték.
