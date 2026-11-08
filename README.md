# MineScript – bányászrobot-szimulátor

A **Bugvadászok** csapat webes játéka a **Dusza Árpád Országos Programozói Emlékverseny 2026/2027. évi I. fordulójára**.

A játékos MineScript nyelven irányít egy bányászrobotot: programot ír vagy importál, animációval követi a futást, és aranyat gyűjt. A böngészőben futó szimuláció mellett a szerver önállóan újrafuttatja a beküldött programot; a mentett eredmény és a ranglista ebből a szerveroldali számításból készül. Saját térképek is szerkeszthetők, importálhatók és megoszthatók.

## Csapat

**Csapatnév: Bugvadászok**

- Tóth-Mikita Szabolcs
- Szolár Ádám
- Debreczeni Kristóf

## Fő funkciók

- **Fiókkezelés:** regisztráció, bejelentkezés és kijelentkezés; HttpOnly, SameSite=Lax cookie-ban tárolt JWT-munkamenet; bcrypt jelszóhash és kérésgyakoriság-korlátozás a hitelesítési és futtatási műveleteknél.
- **Térképlista:** keresés név, leírás és készítő szerint; saját pályák szűrése; rendezés frissítés, aranymennyiség vagy név szerint; rendszer-, saját és privát térképek jelölése.
- **Pályaműhely:** 1–15 sorból és 1–15 oszlopból álló térképek készítése; fal, üres mező, arany és robot elhelyezése; robotirány beállítása; szöveges import és export. A mezők egérrel és billentyűzettel is szerkeszthetők.
- **Robotprogram:** szintaxiskiemelés, sorszámozás, behúzáskezelés, mintaprogramok, saját program, import és export. A kódot a böngésző pályánként megjegyzi; a külön saját program mintaváltás után is visszatölthető.
- **Futás és animáció:** robotmozgás, felfedezett mezők, aranyhaladás, aktuális programsor, konzol, valamint lassú, normál, gyors és azonnali mód. A sebesség futás közben is váltható. Az azonnali mód közvetlenül a végállapotot mutatja.
- **Automatikus befejezés:** az utolsó aranyrög kibányászásakor a program sikeresen véget ér, cikluson belül is.
- **Térképnézet:** alapértelmezésben a felderítetlen falak és aranyrögök halványan láthatók. A „Sötét mód” bekapcsolásakor csak a már felfedezett mezők látszanak.
- **Hitelesített eredmények:** a szerver a program forrásából számolja az arany- és lépésszámot; a kliens által megadott pontszámot nem használja.
- **Ranglista:** térképenként minden játékos legjobb futása szerepel. Több arany jobb helyezést jelent; azonos aranymennyiségnél a kevesebb feldolgozott programsor dönt.
- **Bányásznapló:** összesített statisztikák, a legutóbbi 50 futás és korábbi programok visszatöltése.
- **Téli megjelenés:** sötét, arany kiemelésű felület, bányászrobot, havas nyitókép és 15 térképkártya-illusztráció. A képek a pályaazonosító alapján váltakoznak, nem a pálya tényleges alaprajzát ábrázolják.
- **Havazás:** kikapcsolt, finom és sűrű fokozat, megjegyzett beállítással. A háttérbe tett böngészőlapon az animáció szünetel; a rendszer csökkentett mozgás beállítását is figyelembe veszi.

## Alappályák

Az adatbázis inicializálása hat rendszerpályát készít elő:

| Pálya | Méret (oszlop × sor) | Aranyrögök |
| --- | --- | --- |
| Hajnalcsillag-tárna | 15 × 3 | 3 |
| Deres szikla | 15 × 3 | 2 |
| Jégcsap-akna | 7 × 7 | 2 |
| Fagyos kanyarulat | 11 × 11 | 5 |
| Északi aranymély | 15 × 15 | 10 |
| Örökfagy labirintusa | 15 × 15 | 18 |

Az első három pályához külön útvonalat bemutató mintaprogram tartozik. A Szintaxis-bemutató minden pályán elérhető, de nem megoldóprogram. A „Saját program” minden pályán használható; külön pályaspecifikus minta hiányában új piszkozatként üres szerkesztővel indul.

## Gyors indítás fejlesztéshez

Szükséges: Node.js és npm, valamint futó MySQL 8 szolgáltatás. A helyi fejlesztés Node.js 24-gyel történt; a projekt gyökércsomagja legalább Node.js 20-at ír elő, de a függőségek pontos követelményeit is teljesíteni kell.

Minden parancsot a projekt gyökérmappájából futtass, ahol a `package.json` található. A meglévő `server/.env` fájlt ne írd felül egy már beállított telepítésen.

### 1. Függőségek és konfiguráció

Linuxon vagy macOS-en, új telepítésnél:

```bash
npm ci
cp server/.env.example server/.env
```

Windows PowerShellben, a helyi projektútvonallal:

```powershell
cd C:\duszaverseny-main
npm.cmd ci
Copy-Item server/.env.example server/.env
```

PowerShellben az `npm.cmd` használható akkor is, ha a rendszer nem engedi az `npm.ps1` szkript futtatását. A további `npm` parancsok ugyanígy helyettesíthetők `npm.cmd`-vel.

A `server/.env` helyi, közvetlen HTTP-s fejlesztéshez például az alábbi értékeket tartalmazza:

```dotenv
NODE_ENV=development
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=minescript
DB_PASSWORD=ide-kerul-a-helyi-adatbazisjelszo
DB_NAME=minescript
DB_POOL_SIZE=10
JWT_SECRET=ide-kerul-a-generalttitok
COOKIE_SECURE=false
TRUST_PROXY=0
```

A jelszót és a JWT-titkot saját értékkel töltsd ki. Véletlen titok generálása:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

A `JWT_SECRET` értékéhez másold a kimenetet. Éles módban a szerver legalább 32 karakteres titkot követel meg. A `.env` fájlt ne tedd nyilvános verziókezelésbe.

### 2. MySQL előkészítése

Az alábbi SQL egy új, helyi adatbázis és alkalmazásfelhasználó létrehozására szolgál. MySQL-adminisztrátori kapcsolattal futtasd; a jelszó egyezzen a `.env` fájlban megadottal.

```sql
CREATE DATABASE minescript
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'minescript'@'localhost'
  IDENTIFIED BY 'ide-kerul-a-helyi-adatbazisjelszo';
GRANT ALL PRIVILEGES ON minescript.* TO 'minescript'@'localhost';
```

Ha az adatbázis vagy a felhasználó már létezik, annak meglévő beállításait használd. Ez a példa a helyi telepítéshez ad jogosultságot, nem szervezeti üzemeltetési szabályzat.

Ezután a projekt gyökerében:

```bash
npm run db:init
```

A szkript létrehozza a hiányzó táblákat és a kezelt indexeket, feltölti a hiányzó rendszerpályákat, a régi nevükön megtalált rendszerpályák nevét és leírását pedig frissíti. Megtartja az azonosítókat, a pályaadatokat és a hozzájuk kapcsolódó futásokat. A saját térképeket nem módosítja.

Ha az adatbázis létrehozását is a szkriptre bízod, megfelelő jogosultságú kapcsolat szükséges. A `DB_ADMIN_USER` és `DB_ADMIN_PASSWORD` opcionális változók megadásakor a teljes `db:init` ezekkel a hitelesítési adatokkal fut; az alkalmazás normál működéséhez továbbra is a `DB_USER` és `DB_PASSWORD` értékei használatosak.

### 3. Indítás

```bash
npm run dev
```

- Felület: [localhost:5173](http://localhost:5173)
- API és adatbázis-kapcsolat ellenőrzése: [localhost:3000/api/health](http://localhost:3000/api/health)

A gyökérszintű parancs együtt indítja az API-t és a Vite fejlesztői szervert. Csak a kliens elindítása nem elég a regisztrációhoz, mentéshez és ranglistához. A MySQL szolgáltatásnak is futnia kell.

A közös `shared` csomag a fejlesztői indítás elején fordul le. Ha ennek forrását módosítod, indítsd újra a gyökérszintű `npm run dev` parancsot, hogy az új motorverzió betöltődjön.

### A buildelt alkalmazás kipróbálása helyben

A konfiguráció és az adatbázis előkészítése után:

```bash
npm run build
npm start
```

A teljes alkalmazás a [localhost:3000](http://localhost:3000) címen érhető el. Az Express a `client/dist` tartalmát és az API-végpontokat is kiszolgálja. Az `npm start` önmagában nem állítja át a `NODE_ENV` értékét éles módra.

## Használat

1. Regisztrálj vagy jelentkezz be.
2. A **Térképek** oldalon keress vagy válassz egy elérhető pályát.
3. A **Robotprogram** panelen válassz mintát vagy **Saját program** módot. A kód közvetlenül szerkeszthető és fájlból is importálható. Egy minta kézi módosítása saját programmá válik.
4. Indítsd el a futást a **Futtatás** gombbal vagy a **Ctrl+Enter**, macOS-en **Cmd+Enter** billentyűkkel.
5. Kövesd az animációt, válts sebességet, vagy állítsd le a lejátszást. Az utolsó arany kibányászása automatikusan befejezi a programot.
6. A befejezett futást a szerver újrafuttatja és menti; sikeres mentés után a ranglista frissül. A kézzel megszakított animáció részeredményét a felület nem küldi be mentésre.
7. A **Pályaműhelyben** készíts új térképet, vagy a saját pályádnál válaszd a szerkesztést.
8. A **Bányásznaplóban** nézd meg a korábbi futásokat, és tölts vissza egy programot.

A kódszerkesztőben a Tab és Shift+Tab a behúzást kezeli. A fókusz továbbléptetéséhez előbb nyomj Esc-et, majd Tabot. A térképszerkesztő mezői nyílbillentyűkkel bejárhatók, Enterrel vagy szóközzel festhetők.

## A jelenlegi játék működési szabályai

- Az `isThere` a robot közvetlenül előtti mezőt vizsgálja. A térképen kívüli terület falnak számít.
- A felület halvány nézetben előre megmutathat falakat és aranyat. Ez megjelenítési segítség: a MineScript-program nem kap közvetlen hozzáférést a teljes térképhez vagy a felület felfedezési adataihoz.
- A `step forward` több mezőt is megtehet egyetlen utasításként. A ranglistán használt lépésszám a **feldolgozott programsorok száma**, nem a megtett mezőké. A ciklus feltételsora minden vizsgálatkor számít, a végrehajtott `else` sor szintén számít.
- Egy futás legfeljebb **1000 feldolgozott programsorig** tart. A következő sor feldolgozása előtt `INSTRUCTION_COUNT_LIMIT_EXCEEDED` hibával megszakad.
- Az utolsó aranyrög kibányászásakor a futás azonnal, sikeresen véget ér. Az utána következő utasítások, így a további `print` vagy értékadó sorok sem hajtódnak végre. Arany nélküli pályán a program továbbra is futtatható.
- Szintaktikailag hibás program nem indul el. Futásidejű hiba esetén a már elért eredmény megmarad, és a befejezett futás a hiba adataival együtt menthető.
- Ha egy pályához már tartozik mentett futás, a rácsa, mérete és robotkezdőállapota nem módosítható. A tulajdonos a nevet, leírást és láthatóságot továbbra is szerkesztheti.
- Egy térkép törlése a hozzá tartozó mentett futásokat is törli az adatbázisból.

## MineScript nyelv

A nyelv sororientált és behúzásvezérelt. Az utasítás tokenjeit pontosan egy szóköz választja el; a behúzás csak szóközökből állhat. Az egymásba ágyazott blokkok következetes behúzást igényelnek. A kulcsszavak kis- és nagybetűérzékenyek. Az üres program elfogadott, de egy nem üres program belsejében nem lehet üres sor.

Az alábbi példa egyenesen halad a falig, és közben kibányássza az útjába kerülő aranyat. Nem általános labirintusmegoldó:

```text
set fal to isThere 1
set mehet to not fal
while mehet
  set arany to isThere 2
  step forward 1
  if arany
    mine here
  set fal to isThere 1
  set mehet to not fal
```

| Utasítás vagy kifejezés | Jelentés |
| --- | --- |
| `step forward <érték>` | Előrehaladás nemnegatív egész számú mezővel. Fal vagy térképszél esetén `E_BEDROCK_HIT`. |
| `turn by <érték>` | Balra fordulás nemnegatív egész számú negyedfordulattal; az irányt a néggyel vett maradék határozza meg. |
| `mine here` | Az aktuális mező aranyának kibányászása. Arany nélkül `E_NO_GOLD`. |
| `print <érték>` | Egész vagy logikai érték kiírása a konzolra. |
| `set <név> to <kifejezés>` | Változó létrehozása vagy értékadás. A típus az első értékadáskor rögzül. |
| `if <érték>` / `else` | Elágazás logikai érték vagy változó alapján. |
| `while <érték>` | Ciklus logikai érték vagy változó alapján. |
| `isThere <érték>` | `set` jobb oldalán használható vizsgálat: 0 = üres, 1 = fal, 2 = arany. |

Operátorok: `+`, `-`, `*`, `<`, `<=`, `>`, `>=`, `=`, `<>`, `and`, `or`, `not`.

A forrásba írt számliterál csak 0–100 közötti egész lehet; a számított változóértékek ettől eltérhetnek. Nincs zárójeles, egymásba ágyazott kifejezés. Az `if` és a `while` feltétele egyetlen egyszerű érték, ezért összehasonlítást előbb változóba kell menteni:

```text
set db to 4
set kesz to db = 4
if kesz
  print db
```

Futásidejű hibakódok: `E_TYPE_MISMATCH`, `E_UNINITIALIZED`, `E_NON_BOOL_CONDITION`, `E_BAD_OPERAND`, `E_BEDROCK_HIT`, `E_NO_GOLD`, `E_BAD_ARG`, `INSTRUCTION_COUNT_LIMIT_EXCEEDED`.

## Térképformátum

Az első sor a sorok és oszlopok száma, ebben a sorrendben. Ezután pontosan a megadott számú, megfelelő hosszúságú rácssor következik. Mindkét méret 1–15 közötti lehet, és pontosan egy robot szükséges.

- `.`: üres mező
- `#`: fal
- `@`: aranyrög
- `>`, `<`, `^`, `v`: robot és kezdőiránya

Példa:

```text
3 5
#####
#>@.#
#####
```

A térkép szintaktikai érvényessége önmagában nem garantálja, hogy minden arany elérhető vagy a pálya megoldható az 1000 soros kereten belül.

## Architektúra

- `shared/`: MineScript-típusok, térképformátum, parser, interpreter és rendszerpályák.
- `server/`: Express + MySQL REST API, JWT-hitelesítés, a buildelt kliens kiszolgálása.
- `client/`: React + TypeScript + Vite alkalmazás; a helyben kiszolgált képek a `client/public/assets/` mappában vannak.
- `deploy/`: systemd- és Apache-konfigurációminták.
- `docs/`: projektleírás, telepítési és frissítési útmutatók.

A böngésző és a szerver ugyanazt a `shared` parser- és interpreter-implementációt használja. Ez csökkenti a két végrehajtás eltérésének kockázatát; telepítéskor mindkét oldalt ugyanabból a forrásverzióból kell buildelni. A böngésző kiszámítja és lejátssza a futást, a szerver pedig ettől függetlenül újraszámolja a mentendő eredményt.

A Node.js használatának fő oka a közös TypeScript-motor. A versenyszerveren az alkalmazás Apache reverse proxy mögött futtatható; a külső HTTPS-forgalmat az Apache továbbítja a helyi Node-szervernek.

### API-végpontok

| Metódus | Útvonal | Leírás |
| --- | --- | --- |
| GET | `/api/health` | Az API és az adatbázis-kapcsolat ellenőrzése. |
| POST | `/api/auth/register` | Regisztráció és munkamenet létrehozása. |
| POST | `/api/auth/login` | Bejelentkezés. |
| POST | `/api/auth/logout` | Kijelentkezés. |
| GET | `/api/auth/me` | Az aktuális felhasználó lekérése. |
| GET | `/api/maps` | Az elérhető térképek listája. |
| POST | `/api/maps` | Új térkép létrehozása. |
| GET | `/api/maps/:id` | Egy elérhető térkép részletei. |
| PUT | `/api/maps/:id` | Saját térkép módosítása. |
| DELETE | `/api/maps/:id` | Saját térkép és kapcsolódó futásainak törlése. |
| GET | `/api/maps/:id/leaderboard` | Egy elérhető térkép ranglistája. |
| POST | `/api/runs` | Program szerveroldali futtatása és eredményének mentése. |
| GET | `/api/runs/mine` | Saját futások és összesített statisztikák. |
| GET | `/api/runs/:id` | Futás lekérése a futás tulajdonosának vagy a térkép tulajdonosának, az elérhetőségi ellenőrzés mellett. |

A térkép- és futásvégpontok, valamint az `/api/auth/me` bejelentkezést igényelnek. Privát térképhez a tulajdonosa fér hozzá. A beküldött program legfeljebb 20 000 karakter lehet.

## Fejlesztés és ellenőrzés

```bash
npm test
npm run typecheck
npm run build
```

A legutóbbi dokumentált egységteszt-futásban **73 teszt** sikerült. A tesztek a térképkezelést, a parsert, az interpretert, a feldolgozott sorok számolását, a futási korlátot, az utolsó arany utáni leállást, a futásadatok hozzáférési ellenőrzését és az új mesterpálya megoldhatóságát is érintik.

A fejlesztés során ideiglenes Playwright-szkriptekkel, mock API mellett automatizált böngészős próbák is készültek. Ezek között szerepelt asztali és mobilos megjelenés, futás közbeni sebességváltás, saját program megőrzése, menük, havazás és térképszerkesztés. Ezek nem részei a projekt `npm test` parancsának, és nem helyettesítik a valódi adatbázissal végzett végponttól végpontig tartó tesztelést.

A helyi MySQL-inicializálás és a rendszerpályák frissítése sikeresen lefutott. Teljes körű, éles környezetű végső integrációs tesztet nem dokumentáltunk.

## Ismert korlátok

- Nincs jelszó-visszaállítás, e-mail-ellenőrzés, fióktörlési felület vagy adminisztrátori moderáció.
- Nincs valós idejű többjátékos mód vagy automatikusan frissülő élő ranglista.
- A profil a legutóbbi 50 futást listázza; a ranglista játékosonként a legjobb eredményt mutatja.
- A programpiszkozatok böngészőben, pályaazonosító szerint tárolódnak. Nem szinkronizálódnak eszközök között, és ugyanazon böngészőben nincsenek felhasználói fiókonként elkülönítve.
- Nincs általános migrációs keretrendszer. A `db:init` a benne kezelt táblákat, indexeket és rendszerpályákat készíti elő, de nem végez tetszőleges sémamigrációt.
- A felület magyar nyelvű.
- Nincs beépített, minden térképet automatikusan megoldó keresőprogram; az 1000 soros korlát és a pálya szerkezete is számít.
- A fejlesztéskor használt ideiglenes böngészős tesztek nem alkotnak önálló, a projekttel együtt telepített E2E-tesztcsomagot.

## További fejlesztési lehetőségek

- Térképmásolás és verziózás a korábbi eredmények megőrzésével.
- Megoldások megosztása a játékos döntése alapján.
- Napi kihívások és szezonális ranglista.
- Kapcsolható hanghatások.
- Fiókhoz kötött, eszközök között szinkronizált programpiszkozatok.
- Angol nyelvű felület.
- Tartós, valódi adatbázissal futó automatizált integrációs tesztek.

## Telepítés és kapcsolódó dokumentáció

- [Ubuntu, Apache és MySQL telepítési útmutató](docs/deployment.md)
- [Rövid projektleírás](docs/beadando.md)
- [Expedíciós frissítés és meglévő telepítés frissítése](docs/expedition-update.md)
- [A hat rendszerpálya külön SQL-importja](server/sql/rendszerpalyak-import.sql)

HTTPS-es éles telepítésnél a környezethez igazítva állítsd be a `NODE_ENV=production`, `COOKIE_SECURE=true` és az Apache proxy esetén a `TRUST_PROXY=1` értékeket. Az SSH- és tűzfalbeállításokat a versenyszerver üzemeltetési előírásainak megfelelően hagyd változatlanul.

A külön SQL-import a meglévő `maps` táblába tölti a hiányzó alappályákat. A régi néven már létező rendszerpályákat kihagyja; az átnevezést és leírásfrissítést a `npm run db:init` végzi.

## AI-közreműködés

A fejlesztésben AI-eszközöket is használtunk: felülettervezésre, kódmódosításokra, illusztrációkra, hibakeresésre, ellenőrzésekre és dokumentációra. A felhasználás részleteit, az ellenőrzéseket és a hibás javaslatokat a beadáshoz készített külön AI-használati nyilatkozat ismerteti.
