# AI-használati nyilatkozat

**Verseny:** Dusza Árpád Országos Programozói Emlékverseny, 2026/2027, I. forduló  
**Csapat:** Bugvadászok
**Dátum:** 2026. november 8.

## 1. Milyen AI-eszközöket használtunk?

A fejlesztés különböző szakaszaiban az alábbi eszközöket használtuk:

- **OpenCode**, a korábbi munkamenetben megadott **DeepSeek V4.1 Flash Free** modellel. A feljegyzett szolgáltatóazonosító `opencode`, a modellazonosító `deepseek-v4.1-flash-free` volt.
- **OpenAI Codex**, az asztali alkalmazáson keresztül, a meglévő projekt átvizsgálására, módosítására és ellenőrzésére. A munkához használt pontos modellverziót nem rögzítettük.
- A Codexben elérhető **beépített képgeneráló eszköz**, a bányászós és téli hangulatú illusztrációk elkészítésére. A képgeneráló pontos modellazonosítóját nem rögzítettük.

Az AI használata beszélgetéses segítséget, közvetlen forráskód-módosítást, képgenerálást és automatizált ellenőrzések futtatását is jelentette.

## 2. Mire használtuk az AI-t?

### Meglévő alkalmazás átvizsgálása és javítása

Az AI használatakor már rendelkezésre állt egy működő projekt. A közös parser, interpreter, térképfeldolgozó, az API alapstruktúrája és az adatbázisséma nem a későbbi Codex-munkamenetben készült. Ezeket az AI átvizsgálta, és egyes részeiken célzott módosításokat végzett.

A korábbi OpenCode-munkamenetben AI-segítséget vettünk igénybe többek között:

- a CSS-stílusrendszer kialakításához és fájlokra bontásához;
- a kódszerkesztő szintaxiskiemeléséhez, behúzáskezeléséhez és gyorsparancsaihoz;
- a nem négyzetes térképeken megjelenő robot méretének javításához;
- a térképlista és a játékoldal megjelenítéséhez;
- szerveroldali lekérdezések, tömörítés, gyorsítótárazási fejlécek és adatbázisindexek átalakításához;
- a bejelentkezés időzítéskülönbségének mérsékléséhez;
- a dokumentáció elkészítéséhez.

### A felület teljes vizuális átdolgozása

A Codexszel végzett munka során a felület újabb, jelentős áttervezést kapott. A téli, bányászós hangulatot és az átalakítás irányát mi kértük; az AI ezek alapján készítette el a módosításokat.

AI-segítséggel készült:

- a belépőoldal, a térképlista, a játékoldal, a profil és a pályaszerkesztő átdolgozása;
- az oldalsó navigáció és a mobilos elrendezés;
- az antracit- és palaszürke alapra, arany kiemelésekre épülő színvilág;
- az új bányászrobot-grafika és a térképmezők megjelenítése;
- a havas bányabejáratot ábrázoló nyitókép és 15 térképkártya-illusztráció;
- a több rétegből álló, szélben sodródó havazás.

A havazás kikapcsolható, illetve finom és sűrű fokozatban használható. A beállítást az alkalmazás megjegyzi. Az animáció háttérbe tett böngészőlapon szünetel, csökkentett mozgásra vonatkozó rendszerbeállítás esetén nem jelenik meg.

A megjelenést több körben módosítottuk a saját visszajelzéseink alapján. Ilyen változtatás volt a világos belépési panel visszaállítása sötétre, a zöldes háttér elhagyása, a sűrű havazás erősítése és a hópelyhek megjelenítési sorrendjének javítása.

### Működési változtatások

Az AI a kérésünkre a program működését is módosította:

- Az utolsó aranyrög kibányászása sikeresen lezárja a futást, beágyazott ciklusban is. Ez a közös futtatómotorban történt, így a kliens és a szerver ugyanazt a szabályt alkalmazza.
- Az „Azonnali” sebesség futás közbeni kiválasztása közvetlenül a kész végállapotra vált.
- A mintaprogram- és havazásválasztó új, billentyűzettel is kezelhető menüt kapott.
- Javítottuk azt a hibát, amely miatt a lenyíló használata felfelé görgette az oldalt.
- Minden térképen megjelent a „Saját program” lehetőség. A saját kód pályánként megmarad mintaváltás és oldalfrissítés után is.
- Az alappályák új neveket kaptak, és elkészült az „Örökfagy labirintusa” nevű, 15 × 15 mezős, 18 aranyrögös pálya.
- Elkészült a rendszerpályák adatbázis-frissítése és külön SQL-importfájlja.

A futás automatikus befejezése viselkedésváltozás volt, nem pusztán megjelenítési javítás. A kapcsolódó tesztelvárást ennek megfelelően módosítottuk.

### Segítség a fejlesztéshez és a MineScript-programokhoz

Az AI segített a helyi indítás, a PowerShell-parancsok, a szerverkapcsolat és a MySQL beállításának hibakeresésében.

Külön bemásolható MineScript-programokat is kértünk tőle. Ezek nem mind kerültek be az alkalmazásba. Az AI több falkövető megoldást javasolt, majd egy általunk megadott keresőprogramot optimalizált és összehasonlító próbákat futtatott vele.

Az AI közreműködésének pontos százalékát nem tudjuk hitelesen meghatározni. A vizuális rétegben jelentős volt a szerepe, de TypeScript-kódot, teszteket, adatbázis-kezelést, illusztrációkat és dokumentációt is érintett.

## 3. Hogyan ellenőriztük az eredményeket?

Az ellenőrzések egy részét az AI-ügynök futtatta, más részét mi végeztük a helyi alkalmazás használatával.

- **Típusellenőrzés:** a `npm run typecheck` parancsot többször lefuttattuk, a felmerült hibákat javítottuk.
- **Egységtesztek:** a korábbi feljegyzésben 67 sikeres teszt szerepelt. A későbbi javításokkal és új tesztekkel a tesztkészlet 73 sikeres tesztre bővült.
- **Build:** a `npm run build` sikeresen elkészítette a szerver és a kliens futtatható változatát.
- **Böngészős próbák:** automatizált, tesztadatokat szolgáltató API-val végzett ellenőrzések készültek asztali és mobilos méretben. Ezek érintették a fő oldalakat, a futtatást, a sebességváltást, a pályaszerkesztést, a havazást, a menük kezelését és a saját program megőrzését.
- **Saját kipróbálás:** helyben használtuk az alkalmazást, és képernyőképekkel jeleztük a hibákat. Több javítás ezekből a visszajelzésekből indult.
- **Adatbázis:** a korábbi munkamenetben még nem állt rendelkezésre helyi MySQL. Később telepítettük és beállítottuk; a rendszerpályák frissítése és az új pálya létrehozása valódi helyi adatbázison is sikeresen lefutott.
- **Pálya és keresőprogram ellenőrzése:** automatizált próba igazolta, hogy az új mesterpálya összes aranya elérhető és megfelelő útvonallal az 1000 soros kereten belül összegyűjthető. A külön kért keresőprogramokat a közös motorral futtattuk le.

A korábbi feljegyzés szerint a `npm audit --omit=dev` akkor nem jelzett termelési függőségi sebezhetőséget. Ez nem jelent teljes körű biztonsági vizsgálatot.

A mock API-val végzett böngészős próbák nem helyettesítik a teljes, valódi adatbázissal végzett integrációs tesztet. Ilyen teljes körű végső ellenőrzést nem dokumentáltunk. A CSS-fájl méretének növekedését önmagában nem tekintjük a minőség bizonyítékának.

## 4. Öt konkrét eset

### 1. Téli megjelenés és illusztrációk – sikeres, több módosítással

Az AI elkészítette az új bányászós felületet és a képeket. Az első változat egyes részei nem feleltek meg az elképzeléseinknek: túl kevés kép ismétlődött, a világos belépési panel és a zöldes háttér nem illett a kívánt hangulathoz, a két havazási fokozat között pedig kicsi volt a különbség.

Ezeket jeleztük, az AI módosította a színeket, bővítette a képkészletet és erősítette a sűrű havazást. Az eredményt böngészős próbákkal és saját megtekintéssel ellenőriztük.

### 2. Futás közbeni sebességváltás – sikeres javítás

Észrevettük, hogy normál futásról „Azonnali” módra váltva a program csak felgyorsult. Az AI feltárta, hogy az események továbbra is egyenként kerültek lejátszásra.

A javított változat közvetlenül a már kiszámolt végállapotot jeleníti meg. Az ellenőrzés hosszabb program futása közben végzett sebességváltást is tartalmazott.

### 3. Leállás az utolsó aranynál – sikeres működésmódosítás

A kérésünkre az AI úgy módosította a közös interpretert, hogy az utolsó arany kibányászása után ne hajtsa végre a további utasításokat.

Ehhez új tesztek készültek: ellenőrizték a beágyazott ciklusból való kilépést és azt is, hogy a program folytatódik, amíg maradt arany. Böngészőben rendszerpályán és saját pályát utánzó tesztadattal is ellenőriztük a viselkedést.

### 4. Lenyílók és saját program – sikeres, felhasználói hibajelzés alapján

A havazásmenü használatakor az oldal felfelé gördült. Jeleztük, hogy ez megnyitáskor és a lehetőségek közötti válogatáskor is előfordul.

Az AI módosította a fókusz- és görgetéskezelést, majd lefelé görgetett oldalon is ellenőrizte a menüt. Ezzel együtt bekerült a „Saját program” lehetőség, amelynek tartalma mintaváltás és frissítés után is megmarad.

### 5. Általános keresőprogram – hibás javaslatok és részleges eredmény

Az AI első falkövető kódja hibás MineScript-szintaxist tartalmazott: közvetlen összehasonlítást írt az `if` után. Ezt változóba mentett feltétellel javította.

A következő változat nyílt területen körözött. Egy további módosítás eljutott a falig, de a faltól távoli aranyat kihagyhatta. A problémákat mi jeleztük képernyőképekkel. Ezek a javaslatok nem adtak általános megoldást.

Később egy általunk megadott programot optimalizált az AI. Kivette belőle a fix négyaranyas célt és a felesleges számlálást. Az ellenőrzés szerint az első négy alappályát teljesítette, a két nehezebb pályán azonban elérte az 1000 soros korlátot. Ezt részleges eredménynek tekintjük, nem minden térképre működő megoldásnak.

## 5. A csapat és az AI szerepe

Mi adtuk meg a kívánt irányt, választottuk ki a megtartandó változtatásokat, próbáltuk ki az alkalmazást, és jeleztük a tapasztalt problémákat. Az AI jelentős mennyiségű kódot, képet és dokumentációt készített, valamint több ellenőrzést önállóan futtatott.

Az AI javaslatait nem tekintettük automatikusan helyesnek. A munkában voltak szintaktikai hibák, nem megfelelő algoritmusok és újabb javítást igénylő felületi megoldások is. Az elfogadott változtatások ellenőrzéséhez típusellenőrzést, teszteket, buildet, böngészős próbákat és saját kipróbálást használtunk.

Ez a nyilatkozat a rendelkezésünkre álló korábbi feljegyzést és a dokumentált Codex-munkamenetet foglalja össze. A projekt ezek előtti teljes fejlesztéstörténetéről nem állítjuk, hogy kizárólag AI nélkül készült.
