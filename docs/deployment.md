# Telepítési útmutató – Ubuntu 22.04, Apache 2.4, MySQL 8, Node.js

Ez az útmutató a verseny célkörnyezetére készült. Az alkalmazás a Node.js-t használja a
MineScript-motor és az API futtatására; az Apache reverse proxyként szolgálja ki a nyilvános
HTTPS-forgalmat. PHP, Python és Java nem szükséges az alkalmazás működéséhez.

## 1. Csomagok és Node.js

```bash
sudo apt update
sudo apt install -y apache2 mysql-server git curl ca-certificates

# Node.js 24 (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs
node --version   # 24.x
npm --version
```

Apache modulok:

```bash
sudo a2enmod proxy proxy_http headers rewrite ssl
sudo systemctl restart apache2
```

## 2. Alkalmazás és rendszerfelhasználó

```bash
sudo useradd --system --create-home --shell /bin/bash minescript
sudo mkdir -p /opt/minescript
sudo chown -R minescript:minescript /opt/minescript
sudo -u minescript -H bash -lc 'cd /opt/minescript && git clone <REPO_URL> .'
# Ha nem git-repóból telepítesz, másold be a projektet, majd:
sudo chown -R minescript:minescript /opt/minescript
```

Telepítés és build:

```bash
sudo -u minescript -H bash -lc 'cd /opt/minescript && npm ci && npm run build'
```

## 3. MySQL 8

Jelentkezz be rendszergazdaként:

```bash
sudo mysql
```

```sql
CREATE DATABASE minescript CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'minescript'@'localhost' IDENTIFIED BY 'ERŐS_JELSZÓ';
GRANT ALL PRIVILEGES ON minescript.* TO 'minescript'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Az alkalmazás a `minescript` felhasználóval dolgozik. Mivel az adatbázist a 3. lépésben
már létrehoztad, a `db:init` ezzel a felhasználóval is lefut. Ha az adatbázis még nem
létezne, és a `DB_USER` nem rendelkezik `CREATE DATABASE` joggal, add meg a
`DB_ADMIN_USER` / `DB_ADMIN_PASSWORD` értékeket, vagy futtasd a szkriptet olyan
felhasználóval, amely rendelkezik a szükséges jogokkal. A létrehozott adatbázisban a séma
és a demótérképek idempotensen jönnek létre.

## 4. Környezeti változók

```bash
sudo -u minescript -H bash -lc 'cd /opt/minescript && cp server/.env.example server/.env'
sudo -u minescript -H bash -lc 'cd /opt/minescript && \
  node -e "console.log(require(\"crypto\").randomBytes(48).toString(\"base64url\"))"'
```

Szerkeszd a `server/.env` fájlt:

```dotenv
NODE_ENV=production
PORT=3000

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=minescript
DB_PASSWORD=ERŐS_JELSZÓ
DB_NAME=minescript
# Egyidejű MySQL kapcsolatok száma (2–50, alapértelmezés: 10).
DB_POOL_SIZE=10

# Csak akkor kell, ha a db:init rendszergazdai kapcsolatot igényel:
# DB_ADMIN_USER=root
# DB_ADMIN_PASSWORD=root-jelszó

JWT_SECRET=<az előbb generált legalább 32 karakteres titok>
SESSION_DAYS=7
COOKIE_SECURE=true
TRUST_PROXY=1
```

Fontos:

- **`JWT_SECRET`** legalább 32 karakter legyen, és maradjon titkos. Éles módban a szerver
  elindulás előtt hibát dob, ha hiányzik vagy túl rövid.
- **`COOKIE_SECURE=true`** csak HTTPS alatt használható. Ha átmenetileg HTTP-n tesztelsz,
  állítsd `false`-ra, de éles környezetben mindig HTTPS mögött futtasd.
- **`TRUST_PROXY=1`** Apache reverse proxy mögött kell; közvetlen Node-kiszolgálásnál `0`.
- A `.env` ne kerüljön verziókezelésbe; a `.gitignore` már kizárja.

Adatbázis inicializálása:

```bash
sudo -u minescript -H bash -lc 'cd /opt/minescript && npm run db:init'
```

Ez létrehozza a táblákat, az öt rendszer-térképet és beállítja az induló játékkörnyezetet.
A parancs újrafuttatható; a meglévő rendszer-térképeket nem duplikálja, és a hiányzó
teljesítményindexeket (ranglista, térképlista) is pótolja a meglévő adatbázisban.

## 5. systemd szolgáltatás

Másold be a [`deploy/minescript.service`](../deploy/minescript.service) fájlt, majd:

```bash
sudo cp deploy/minescript.service /etc/systemd/system/minescript.service
sudo systemctl daemon-reload
sudo systemctl enable --now minescript
sudo systemctl status minescript
sudo journalctl -u minescript -f
```

Ellenőrzés:

```bash
curl http://127.0.0.1:3000/api/health
# {"ok":true,...}
```

A szolgáltatás a `server/.env` fájlt a saját könyvtárából olvassa; a `WorkingDirectory`
értéke `/opt/minescript`.

## 6. Apache reverse proxy

Másold be a [`deploy/apache-minescript.conf`](../deploy/apache-minescript.conf) fájlt a
`/etc/apache2/sites-available/minescript.conf` helyre, és cseréld ki a `ServerName` és a
tanúsítvány útvonalait. Első körben HTTP-n:

```bash
sudo cp deploy/apache-minescript.conf /etc/apache2/sites-available/minescript.conf
sudo a2dissite 000-default
sudo a2ensite minescript
sudo apache2ctl configtest
sudo systemctl reload apache2
```

Ezután szerezd be a tanúsítványt:

```bash
sudo apt install -y certbot python3-certbot-apache
sudo certbot --apache -d minescript.example.hu
```

A Certbot átírja a vhostot HTTPS-re, és beállítja a megújítást. Ellenőrizd, hogy a
`COOKIE_SECURE=true` és a `TRUST_PROXY=1` érték szerepel a `server/.env`-ben, majd:

```bash
sudo systemctl restart minescript
```

Ha a tanúsítvány kézzel kerül a vhostba, a `deploy/apache-minescript.conf` kommentelt
HTTPS-blokkja használható mintaként.

## 7. Tűzfal és HTTPS

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Apache Full'
sudo ufw enable
sudo ufw status
```

Csak a 80/443 legyen nyilvános; a Node `3000`-es portja maradjon helyi
(`127.0.0.1:3000`). A cookie `Secure` és `HttpOnly`, a munkamenet `SameSite=Lax`.

## 8. Frissítés

```bash
sudo -u minescript -H bash -lc 'cd /opt/minescript && git pull --ff-only'
sudo -u minescript -H bash -lc 'cd /opt/minescript && npm ci && npm run build'
sudo -u minescript -H bash -lc 'cd /opt/minescript && npm run db:init'
sudo systemctl restart minescript
```

Az új verzió kliensét a szerver a `client/dist` könyvtárból szolgálja ki; a build után
nincs szükség Apache újraindításra.

## 9. Mentés és hibakeresés

Adatbázis-mentés:

```bash
mysqldump --single-transaction -u minescript -p minescript | gzip > minescript-$(date +%F).sql.gz
```

Gyakori hibák:

| Tünet | Ok / megoldás |
| --- | --- |
| `ECONNREFUSED 127.0.0.1:3306` | A MySQL nem fut, vagy rossz a `DB_HOST`/`DB_PORT`. |
| `ER_ACCESS_DENIED_ERROR` | Rossz `DB_USER`/`DB_PASSWORD`, vagy hiányzó MySQL-jogosultság. |
| `JWT_SECRET ...` hiba induláskor | Éles módban hiányzó vagy 32 karakternél rövidebb titok. |
| A bejelentkezés nem marad meg | HTTPS mellett `COOKIE_SECURE=true`; HTTP mellett `false`. |
| 502 Bad Gateway | A Node-szolgáltatás nem fut: `systemctl status minescript`, `journalctl -u minescript`. |
| „A kliens még nem készült el” | Nem futott le az `npm run build`, vagy rossz a `client/dist` helye. |

A szerver naplója a `journalctl -u minescript` paranccsal érhető el; a HTTP-hibák JSON
formában, magyar üzenettel jelennek meg.

## 10. Megjegyzés a technológiaválasztásról

A feladatkiírás a célkörnyezethez PHP-t, Pythont és Javát is említ, de nem írja elő
kötelezően ezek használatát. A MineScript-parser és -interpreter egyszeri, közös TypeScript-implementációja miatt a Node.js biztosítja a legkisebb kockázatot: a böngésző animációja és
a szerver hitelesítése garantáltan ugyanazt a nyelvet és szemantikát használja. Az Apache,
a MySQL és a HTTPS továbbra is a célkörnyezet része; a Node csak helyi porton figyel.
