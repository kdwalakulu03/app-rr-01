# Roam Richer — Setup on Oracle VPS

## What runs where

```
System nginx (port 80/443)
├── timeceptor.com    → port 47000 (existing, untouched)
└── app.roamricher.com → port 3847 (this app, Docker)

Docker containers:
├── nn4_postgres  (PostGIS 14, host port 5847)
└── nn4_backend   (Node.js API, host port 3847)

Frontend: served as static files by system nginx from /opt/roamricher/app/frontend/dist
```

---

## Step 1 — Copy files to VPS
```bash
# From your local machine:
scp -r docker-copy ubuntu@YOUR_VPS_IP:/opt/roamricher
```

---

## Step 2 — First-time deploy
```bash
ssh ubuntu@YOUR_VPS_IP
cd /opt/roamricher
cp app/.env.production app/.env
nano app/.env                    # change POSTGRES_PASSWORD
sudo bash deploy/deploy.sh --first-time
```
This installs Docker + pnpm, builds frontend, starts containers, sets up nginx.

---

## Step 3 — Point DNS
Add an A record: `app.roamricher.com → YOUR_VPS_IP`

---

## Step 4 — SSL
```bash
sudo certbot --nginx -d app.roamricher.com
```

---

## Step 5 — Import 186k places (one time, ~10 min)
```bash
cd /opt/roamricher/app
DUCKDB_DIR=./data \
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5847/nearnow4 \
python3 backend/src/db/import-places.py
```

---

## Redeploy (after code changes)
```bash
cd /opt/roamricher
sudo bash deploy/deploy.sh
```

---

## Useful commands
```bash
cd /opt/roamricher/app
docker compose -f docker-compose.prod.yml logs -f         # logs
docker compose -f docker-compose.prod.yml restart backend  # restart
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres nearnow4  # DB shell
```
