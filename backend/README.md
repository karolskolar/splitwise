# Splitwise API

Backend API for URL shortening in the Splitwise app.

## Quick Start (Local Development)

```bash
cd backend
npm install
npm start
```

The API will run at `http://localhost:3001`

## Deployment on Proxmox

### Option A: Docker (Recommended)

1. **Copy files to your Proxmox server:**
   ```bash
   scp -r backend/ user@proxmox-server:/opt/splitwise-api/
   ```

2. **SSH into the server:**
   ```bash
   ssh user@proxmox-server
   cd /opt/splitwise-api
   ```

3. **Build and run:**
   ```bash
   docker compose up -d --build
   ```

4. **Check status:**
   ```bash
   docker compose logs -f
   curl http://localhost:3001/health
   ```

### Option B: Direct Node.js

1. **Install Node.js 20+:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Copy and install:**
   ```bash
   cd /opt/splitwise-api
   npm install --production
   ```

3. **Create systemd service:**
   ```bash
   sudo nano /etc/systemd/system/splitwise-api.service
   ```

   ```ini
   [Unit]
   Description=Splitwise API
   After=network.target

   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/opt/splitwise-api
   ExecStart=/usr/bin/node server.js
   Restart=on-failure
   Environment=PORT=3001
   Environment=NODE_ENV=production

   [Install]
   WantedBy=multi-user.target
   ```

4. **Start service:**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable splitwise-api
   sudo systemctl start splitwise-api
   ```

## Setting Up HTTPS with Caddy

1. **Install Caddy:**
   ```bash
   sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
   sudo apt update
   sudo apt install caddy
   ```

2. **Configure Caddy:**
   ```bash
   sudo nano /etc/caddy/Caddyfile
   ```

   ```
   api.yourdomain.com {
       reverse_proxy localhost:3001
   }
   ```

3. **Restart Caddy:**
   ```bash
   sudo systemctl restart caddy
   ```

Caddy will automatically obtain and renew SSL certificates from Let's Encrypt.

## Update Frontend Configuration

After deploying the backend, update the `API_URL` in `index.html`:

```javascript
const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://api.yourdomain.com';  // <-- Your backend URL here
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/save` | Save calculation, returns `{ id }` |
| GET | `/api/load/:id` | Load calculation by ID |
| GET | `/api/stats` | Get usage statistics |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Server port |
| `DATA_DIR` | `./data` | Directory for data storage |
| `CORS_ORIGIN` | `*` | Allowed CORS origin |

## Data Storage

- Calculations are stored in `./data/calculations.json`
- Simple JSON file - easy to backup, inspect, and migrate
- No database required

## Backup

To backup the data:
```bash
cp data/calculations.json data/calculations.json.backup
```

Or with Docker:
```bash
docker cp splitwise-api:/app/data/calculations.json ./backup.json
```
