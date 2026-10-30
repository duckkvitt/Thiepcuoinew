# Deploy len Railway

Repository nay co ca `BE/` va `FE/`. File `Dockerfile` o thu muc goc se build
frontend, chep ket qua vao backend va chay ca website trong mot Railway service.
Container se tu khoi tao/cap nhat schema MySQL truoc khi mo web server.

## Cau hinh service

- De trong **Root Directory** (Railway phai build tu root repository).
- De trong **Custom Build Command** va **Custom Start Command**.
- De trong **Config File Path**. Railway tu nhan `Dockerfile` o root.
- Them mot MySQL service vao cung Railway project.

Trong tab **Variables** cua web service, tao cac reference variable tu MySQL:

```dotenv
MYSQLHOST=${{MySQL.MYSQLHOST}}
MYSQLPORT=${{MySQL.MYSQLPORT}}
MYSQLUSER=${{MySQL.MYSQLUSER}}
MYSQLPASSWORD=${{MySQL.MYSQLPASSWORD}}
MYSQLDATABASE=${{MySQL.MYSQLDATABASE}}
ADMIN_USERNAME=admin
ADMIN_PASSWORD=thay-bang-mat-khau-manh
ADMIN_SESSION_SECRET=thay-bang-chuoi-ngau-nhien-dai
ADMIN_API_KEY=thay-bang-chuoi-ngau-nhien-dai-khac
WISHES_REQUIRE_APPROVAL=false
```

Neu database service khong co ten `MySQL`, thay ten o phan `${{MySQL.*}}` bang
ten service thuc te. Khong can tao bien `PORT`; Railway tu cap bien nay.

Sau khi deploy, vao **Settings > Networking > Generate Domain**. Kiem tra
`https://TEN-MIEN.up.railway.app/api/health`; ket qua dung la:

```json
{"status":"ok","database":"connected"}
```

Upload trong container se mat khi redeploy. De luu anh lau dai, tao Railway
Volume va mount vao `/app/uploads`.

