# Uzak Sunucuda Yayınlama (Port 3002)

Bu kılavuz, Bibliotheca'yı uzak sunucuda **tek port (3002)** üzerinden
yayınlamak içindir. Artık Express hem REST API'yi hem de frontend'i (`index.html`)
aynı porttan sunar — ayrı bir Live Server'a gerek yok.

> Sunucuya erişim VPN (openfortivpn) tüneliyle yapılıyorsa, aşağıdaki tüm
> adımlardan önce VPN'in açık ve sunucuya `ping`/`ssh` ile erişilebilir
> olduğundan emin ol.

---

## 0. Ön koşullar (uzak sunucu)

- Node.js 18+ (`node -v`)
- Erişilebilir bir SQL Server örneği (lokal veya ağda)
- `sqlcmd` (şemayı yüklemek için) — yoksa SSMS/Azure Data Studio ile de yüklenebilir
- 3002 portunun güvenlik duvarında açık olması

---

## 1. Dosyaları sunucuya gönder

Yerel makinende, proje kök dizininde:

```bash
REMOTE_USER=eren REMOTE_HOST=<sunucu-ip> ./deploy/deploy.sh
```

`deploy.sh` şunları yapar: hedef dizini (`/opt/bibliotheca`) oluşturur,
dosyaları `rsync`/`scp` ile gönderir (`node_modules` ve `.env` hariç),
sunucuda `npm ci --omit=dev` çalıştırır.

> Script kullanmak istemezsen elle scp:
> ```bash
> scp -r api.js db.js server.js index.html schema.sql package*.json \
>     middleware routes db deploy eren@<sunucu-ip>:/opt/bibliotheca/
> ```

---

## 2. `.env` dosyasını oluştur (sunucuda)

```bash
cd /opt/bibliotheca
cp .env.example .env
nano .env
```

Doldurulması gerekenler:

| Değişken      | Açıklama                                  |
|---------------|-------------------------------------------|
| `DB_SERVER`   | SQL Server host (örn. `localhost`)        |
| `DB_PORT`     | `1433`                                    |
| `DB_DATABASE` | `Bibliotheca`                             |
| `DB_USER`     | SQL kullanıcısı (örn. `sa`)               |
| `DB_PASSWORD` | SQL şifresi                               |
| `JWT_SECRET`  | En az 32 karakter rastgele değer          |
| `ADMIN_EMAIL` | Admin e-postası                           |
| `PORT`        | **3002**                                  |
| `NODE_ENV`    | `production`                              |

> `JWT_SECRET` üretmek için: `openssl rand -hex 32`

---

## 3. Veritabanı şemasını yükle

```bash
sqlcmd -S localhost -d Bibliotheca -U sa -P '<DB_PASSWORD>' -i db/schema.sql
```

Script idempotent — tekrar çalıştırmak güvenlidir.

---

## 4. Hızlı test (geçici)

```bash
cd /opt/bibliotheca
node server.js
```

Başka bir terminalden:

```bash
curl http://localhost:3002/api/health
```

`{"status":"ok","database":"connected",...}` görüyorsan çalışıyor.
Tarayıcıdan `http://<sunucu-ip>:3002` → arayüz açılır. `Ctrl+C` ile durdur.

---

## 5. Kalıcı servis (systemd) — önerilen

```bash
# Servisi çalıştıracak ayrı bir kullanıcı (opsiyonel ama önerilir)
sudo useradd -r -s /usr/sbin/nologin bibliotheca || true
sudo chown -R bibliotheca:bibliotheca /opt/bibliotheca

# Servis dosyasını kur
sudo cp /opt/bibliotheca/deploy/bibliotheca.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now bibliotheca

# Durum ve loglar
systemctl status bibliotheca
journalctl -u bibliotheca -f
```

> `node` yolu farklıysa (`which node`), `bibliotheca.service` içindeki
> `ExecStart=/usr/bin/node server.js` satırını güncelle.

---

## 6. Güvenlik duvarı — 3002 portunu aç

CachyOS/Arch (firewalld):
```bash
sudo firewall-cmd --add-port=3002/tcp --permanent && sudo firewall-cmd --reload
```

veya ufw:
```bash
sudo ufw allow 3002/tcp
```

---

## 7. (Opsiyonel) Nginx ile 80/443 reverse proxy

Dışarıya doğrudan 3002 yerine alan adı/HTTPS sunmak istersen:

```nginx
server {
    listen 80;
    server_name kutuphane.example.com;
    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

`server.js` zaten `trust proxy` ayarlıdır; ardından `certbot` ile HTTPS ekleyebilirsin.

---

## Güncelleme (sonraki dağıtımlar)

```bash
# Yerelden tekrar gönder
REMOTE_USER=eren REMOTE_HOST=<sunucu-ip> ./deploy/deploy.sh
# Sunucuda servisi yeniden başlat
sudo systemctl restart bibliotheca
```
