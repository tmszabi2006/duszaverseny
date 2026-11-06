# MineScript – bányászrobot-szimulátor

Webes játék a **Dusza Árpád Országos Programozói Emlékverseny 2026/2027. évi I. fordulójára**.

A játékos MineScript nyelven programozza a bányászrobotot: a programot a szerkesztőben
megírhatja vagy fájlból importálhatja, a futást animációval követheti, a szerver pedig
függetlenül újrafuttatja és hitelesíti az eredményt. A térképek saját szerkesztővel
készíthetők, és minden térképhez ranglista tartozik.

## Fő funkciók

- **Fiókkezelés** – regisztráció, bejelentkezés, kijelentkezés, HttpOnly cookie-ban tárolt
  JWT-munkamenet, bcrypt jelszóhash, bejelentkezési és futtatási rate limit.
- **Térképlista** – keresés név, leírás és készítő szerint, „csak a sajátjaim” szűrő,
  rendszer- és privát térképek jelölése.
- **Térképszerkesztő** – fal, arany, üres mező és robot festése húzással, átméretezés
  1–15 sor/oszlop között, robotirány állítása, import/export szöveges fájlból.
- **Programszerkesztő** – szintaxiskiemelés, sorszámok, mintaprogramok, import/export,
  automatikus piszkozatmentés a böngészőben.
- **Futtatás és animáció** – lépésenkénti robotmozgás, felfedezett terület, begyűjtött arany,
  aktuális programsor kiemelése, konzol, lassú/normál/gyors/azonnali sebesség, leállítás.
- **Hitelesített eredmény** – a kliens csak animál; a beküldött programot a szerver ugyanazzal
  a közös interpreterrel futtatja újra, és az így kapott arany-/lépésszám kerül az adatbázisba.
- **Ranglista** – térképenként minden játékos legjobb futása; több arany előrébb, azonos
  aranymennyiségnél kevesebb feldolgozott programsor előrébb.
- **Profil** – összesített statisztikák és a legutóbbi 50 futás; korábbi program egy kattintással
  visszatölthető a szerkesztőbe.
- **Kész játékkörnyezet** – az adatbázis inicializálása öt rendszer-térképet tesz elérhetővé,
  a kliens pedig pályánként mintaprogramokat kínál az azonnali kipróbáláshoz.

## Gyors indítás fejlesztéshez

Előfeltételek: **Node.js 20+** (ajánlott: 24), **npm**, **MySQL 8**.

```bash
npm install
cp server/.env.example server/.env
```

A `server/.env` fájlban legalább ezeket állítsd be:

```dotenv
NODE_ENV=development
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=minescript
DB_PASSWORD=helyi-jelszo
DB_NAME=minescript
JWT_SECRET=legalabb-32-karakteres-veletlen-titok
COOKIE_SECURE=false
TRUST_PROXY=0
```

Ezután hozd létre az adatbázist és a felhasználót (MySQL 8):

```sql
CREATE DATABASE minescript CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'minescript'@'localhost' IDENTIFIED BY 'helyi-jelszo';
GRANT ALL PRIVILEGES ON minescript.* TO 'minescript'@'localhost';
FLUSH PRIVILEGES;
```

Adatbázisséma és demótérképek létrehozása:

```bash
npm run db:init
```

Indítás fejlesztői módban (API + Vite, automatikus újratöltéssel):

```bash
npm run dev
```

- Web: <http://localhost:5173>
- API: <http://localhost:3000/api/health>

A `db:init` idempotens: a már létező rendszer-térképeket nem duplikálja. Az adatbázist a
fenti SQL hozza létre; ha mégis a `db:init`-re bíznád a létrehozást, és a felhasználó nem
rendelkezik `CREATE DATABASE` joggal, add meg a `DB_ADMIN_USER` és `DB_ADMIN_PASSWORD`
értékeket is a `server/.env` fájlban; a szkript ezekkel hozza létre az adatbázist.

### Éles build helyben

```bash
npm ci
npm run build
npm run db:init
npm start
```

Ekkor a teljes alkalmazás a <http://localhost:3000> címen érhető el: az Express szerver
szolgálja ki a `client/dist` statikus buildet és az `/api` végpontokat.

## Hogyan használd?

1. **Regisztrálj** a kezdőlapon, vagy lépj be egy meglévő fiókkal.
2. A **Térképek** oldalon válassz pályát. A rendszer-térképek mellett saját és mások által
   közzétett nyilvános pályák is megjelennek.
3. A pálya oldalán tölts be egy **mintaprogramot**, írj sajátot, vagy importálj fájlt.
4. Nyomd meg a **Futtatás** gombot. Az animáció közben látszik a robot, a felfedezett terület,
   az arany, az aktuális sor és a konzol. A futás leállítható.
5. A futás végén a szerver **hitelesíti** az eredményt; sikeres hitelesítés után frissül a
   ranglista és a profil.
6. **Térképszerkesztéshez** nyisd meg a saját pályát, vagy válaszd az „Új térkép építése”
   lehetőséget. A szerkesztő importálja és exportálja is a szöveges térképformátumot.
7. A **Profil** oldalon visszakeresheted a futásaidat, és bármelyik korábbi programot
   visszatöltheted a szerkesztőbe.

### Fontos játékszabályok

- A robot csak a **közvetlenül előtte** lévő mezőt érzékeli `isThere` hívással; a térkép
  felfedezetlen részeit a felület nem árulja el.
- A `step forward` utasítás egy végrehajtás alatt akár több mezőt is halad, de **minden
  feldolgozott programsor egy lépésnek** számít.
- A futás legfeljebb **1000 feldolgozott programsorig** tart; a 1001. sor feldolgozása előtt
  `INSTRUCTION_COUNT_LIMIT_EXCEEDED` hibával megszakad.
- Hibás program nem futtatható: a szintaktikai ellenőrzés megjelöli a hibás sort.
- A futásidejű hibák is bekerülnek a futástörténetbe, de a ranglistán a legjobb eredmény
  szerepel.
- Ha egy térképen már született futás, a **pálya tartalma nem módosítható**, csak a neve,
  leírása és láthatósága. Ez védi a ranglista hitelességét.

## MineScript nyelv

A nyelv sororientált és behúzásvezérelt. Egy sor egy utasítás; a tokeneket pontosan egy
szóköz választja el, a behúzás csak szóköz lehet. Üres sor nem megengedett. A kulcsszavak
kis- és nagybetűérzékenyek.

```text
set count to 0
set fal to isThere 1
set megy to not fal
while megy
  set arany to isThere 2
  if arany
    step forward 1
    mine here
    set count to count + 1
  else
    step forward 1
  set fal to isThere 1
  set megy to not fal
print count
```

| Utasítás | Jelentés |
| --- | --- |
| `step forward <érték>` | Előrehaladás nemnegatív egész számmal; fal vagy térképszél esetén `E_BEDROCK_HIT`. |
| `turn by <érték>` | Balra fordulás ennyi negyedfordulattal (0–3 hatás). |
| `mine here` | Az aktuális mező aranyának begyűjtése; arany nélkül `E_NO_GOLD`. |
| `print <érték>` | Egész vagy logikai érték kiírása a konzolra. |
| `set <név> to <kifejezés>` | Változó létrehozása vagy értékadás; a típus az első értékadáskor rögzül. |
| `if <érték>` / `else` | Elágazás logikai feltétellel. |
| `while <érték>` | Ciklus logikai feltétellel. |
| `isThere <0\|1\|2>` | Üres / fal / arany vizsgálata a robot előtti mezőn; a térképen kívül falnak számít. |

Kifejezések: `+ - *`, `< <= > >=`, `= <>`, `and or not`. Számliterál csak 0 és 100
közötti egész lehet; beágyazott zárójeles kifejezés nincs. A feltételek egyetlen egyszerű
értéket fogadnak el, ezért összetett feltételt előbb változóba kell menteni.

Futásidejű hibakódok: `E_TYPE_MISMATCH`, `E_UNINITIALIZED`, `E_NON_BOOL_CONDITION`,
`E_BAD_OPERAND`, `E_BEDROCK_HIT`, `E_NO_GOLD`, `E_BAD_ARG`,
`INSTRUCTION_COUNT_LIMIT_EXCEEDED`.

## Architektúra

```text
duszaverseny/
├─ shared/   MineScript típusok, térképformátum, parser, interpreter, demótérképek
├─ server/   Express + MySQL REST API, JWT-hitelesítés, statikus kliens kiszolgálása
├─ client/   React + TypeScript + Vite egyoldalas alkalmazás
├─ deploy/   systemd és Apache konfiguráció
└─ docs/     beadandó leírás és telepítési útmutató
```

A `shared` csomag az egyetlen igazságforrás a nyelvhez: ugyanaz a parser és interpreter fut a
böngészőben az animációhoz és a szerveren a hitelesítéshez. Ez kizárja, hogy a két oldal
eltérően értelmezze a programot. A szerver soha nem fogadja el a kliens által jelentett
arany-/lépésszámot, hanem a beküldött forráskódból újraszámolja.

**Miért Node.js és nem PHP?** A célkörnyezetben PHP is rendelkezésre áll, de a feladat
lényege egy összetett interpreter és egy élő animáció. A Node.js lehetővé teszi, hogy a
parser/interpreter **egyetlen TypeScript-implementáció** legyen, amelyet a kliens és a
szerver is használ. Így nincs két, egymástól elcsúszó nyelvi implementáció, és a szerver
hitelesítése pontosan azt a szemantikát követi, amit a játékos lát. A Node-szerver Apache
reverse proxy mögött fut, a célkörnyezet többi eleme (MySQL, Apache, HTTPS) változatlanul
használható.

### API-végpontok

| Metódus | Útvonal | Leírás |
| --- | --- | --- |
| `GET` | `/api/health` | Adatbázis-kapcsolat ellenőrzése. |
| `POST` | `/api/auth/register` | Regisztráció, munkamenet-cookie beállítása. |
| `POST` | `/api/auth/login` | Bejelentkezés. |
| `POST` | `/api/auth/logout` | Kijelentkezés. |
| `GET` | `/api/auth/me` | Aktuális felhasználó. |
| `GET` | `/api/maps` | Látható térképek listája. |
| `POST` | `/api/maps` | Új térkép létrehozása. |
| `GET` | `/api/maps/:id` | Térkép részletei. |
| `PUT` | `/api/maps/:id` | Térkép módosítása (tulajdonos). |
| `DELETE` | `/api/maps/:id` | Térkép törlése (tulajdonos). |
| `GET` | `/api/maps/:id/leaderboard` | Térkép ranglistája. |
| `POST` | `/api/runs` | Program beküldése; szerveroldali újrafuttatás és mentés. |
| `GET` | `/api/runs/mine` | Saját futások és statisztikák. |
| `GET` | `/api/runs/:id` | Egy futás (tulajdonos vagy térképtulajdonos). |

A térkép- és futásvégpontok, valamint a `/api/auth/me` bejelentkezést igényelnek. A
munkamenet HttpOnly, `SameSite=Lax` cookie-ban utazik; a jelszavak bcrypt hashként tárolódnak.

## Fejlesztés és ellenőrzés

```bash
npm test          # a közös parser/interpreter/térkép tesztek (Vitest)
npm run typecheck # shared, server és client TypeScript-ellenőrzés
npm run build     # teljes éles build
```

A tesztek lefedik a térképformátumot, a parser hibakezelését, a futásidejű szemantikát,
a lépésszámolást, az 1000 soros limitet és a demótérképek érvényességét.

## Ismert korlátok / nem készült el

- Nincs jelszó-visszaállítás, e-mail-verifikáció, fióktörlés és adminisztrátori moderáció.
- Nincs valós idejű többjátékos mód; a ranglista esemény után, kérésre frissül.
- A ranglista felhasználónként a legjobb futást mutatja, nem az összes futást.
- A profil csak a legutóbbi 50 futást tölti be.
- A szerkesztő piszkozatai böngészőnként, `localStorage`-ban maradnak meg, nem szinkronizálódnak.
- Nincs migrációs keretrendszer; a `db:init` idempotens sémainicializálást végez.
- A felület magyar nyelvű; nincs többnyelvű választó.
- Automatizált böngészős end-to-end teszt nem készült; a megosztott motor egységtesztjei,
  a TypeScript-ellenőrzés és az éles build futnak.

## További ötletek

- Térkép „forkolása” és verziózása, hogy a ranglista mellett a pályák változásai is
  nyomon követhetők legyenek.
- Felhasználói megoldások megosztása és megtekintése a ranglistából.
- Napi kihívás és szezonális ranglista.
- Automatikus megoldás-ellenőrző mód a tanároknak.
- Hang- és részecskeanimációk, illetve akadálymentes „csökkentett mozgás” beállítás.
- Angol nyelvű felület és beküldési lehetőség.

## Telepítés

Részletes Ubuntu 22.04 + Apache + MySQL útmutató: [docs/deployment.md](docs/deployment.md).

A beadandó rövid projektleírás: [docs/beadando.md](docs/beadando.md).
