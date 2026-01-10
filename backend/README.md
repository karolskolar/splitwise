# Splitwise API

Backend API for Splitwise app with Google OAuth authentication.

## Quick Start (Local Development)

```bash
cd backend
npm install
npm start
```

The API will run at `http://localhost:3001`

## Google OAuth Setup (Required)

Before deploying, you need to set up Google OAuth credentials:

1. **Go to Google Cloud Console:** https://console.cloud.google.com/

2. **Create a new project** (or select existing):
   - Click the project dropdown → "New Project"
   - Name: "Splitwise"

3. **Enable Google Identity API:**
   - Go to "APIs & Services" → "Library"
   - Search for "Google Identity" and enable it

4. **Create OAuth 2.0 credentials:**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Name: "Splitwise Web Client"

5. **Configure authorized JavaScript origins:**
   - `http://localhost:8080` (local development)
   - `https://yourusername.github.io` (GitHub Pages - your frontend URL)

6. **Save the Client ID** - you'll need it for:
   - Frontend: `GOOGLE_CLIENT_ID` constant in `index.html`
   - Backend: `GOOGLE_CLIENT_ID` environment variable

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
   Environment=GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   Environment=JWT_SECRET=your-random-secret-here

   [Install]
   WantedBy=multi-user.target
   ```

   **Generate a secure JWT secret:**
   ```bash
   openssl rand -base64 32
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

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | No | Health check |
| POST | `/api/auth/google` | No | Verify Google token, return JWT |
| GET | `/api/auth/me` | Yes | Get current user info |
| GET | `/api/calculations` | Yes | Get user's calculations |
| POST | `/api/save` | Optional | Save calculation (links to user if logged in) |
| GET | `/api/load/:id` | No | Load calculation by ID (public for sharing) |
| POST | `/api/calculations/:id` | Yes | Update calculation (owner only) |
| DELETE | `/api/calculations/:id` | Yes | Delete calculation (owner only) |
| GET | `/api/stats` | No | Get usage statistics |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Server port |
| `DATA_DIR` | `./data` | Directory for data storage |
| `CORS_ORIGIN` | `*` | Allowed CORS origin |
| `GOOGLE_CLIENT_ID` | (required) | Google OAuth Client ID |
| `JWT_SECRET` | (change in prod) | Secret for signing JWT tokens |

## Data Storage

- Calculations are stored in `./data/calculations.json`
- Users are stored in `./data/users.json`
- Simple JSON files - easy to backup, inspect, and migrate
- No database required

## Backup

To backup the data:
```bash
cp data/calculations.json data/calculations.json.backup
cp data/users.json data/users.json.backup
```

Or with Docker:
```bash
docker cp splitwise-api:/app/data ./backup-data/
```
