# Plan: URL Shortening for Vacation Calculator

## Problem
Current sharing generates URLs like:
```
https://yoursite.com/?data=eyJpZCI6IjEyMzQ1Njc4OSIsIm5hbWUiOi...
```
With many participants and expenses, URLs can exceed 2000+ characters, making them:
- Difficult to share via SMS/chat
- Sometimes truncated by services
- Ugly looking

## Solutions Overview

| Option | Backend Required | Complexity | URL Length |
|--------|-----------------|------------|------------|
| 1. Self-hosted URL shortener | Yes (Proxmox) | Medium | ~30 chars |
| 2. Custom API backend | Yes (Proxmox) | Medium | ~30 chars |
| 3. Client-side compression | No | Low | ~40-60% shorter |
| 4. Hybrid (compression + backend) | Yes (Proxmox) | Medium | ~30 chars |

---

## Option 1: Self-hosted URL Shortener (Recommended)

Deploy a URL shortener service on your Proxmox server that the app will use.

### Recommended: Shlink (Docker)

**Pros:**
- Full-featured URL shortener
- REST API for programmatic use
- Statistics/analytics
- Custom short codes support
- Docker deployment (easy on Proxmox)

**Architecture:**
```
[GitHub Pages App] ---> [Shlink API on Proxmox] ---> [Database]
                              |
                        Returns: https://short.yourdomain.com/abc123
```

**Implementation Steps:**

1. **Server Setup (Proxmox)**
   - Create LXC container or VM
   - Install Docker + Docker Compose
   - Deploy Shlink with PostgreSQL/MySQL

2. **DNS Configuration**
   - Point subdomain (e.g., `s.yourdomain.com`) to Proxmox server
   - Configure SSL certificate (Let's Encrypt)

3. **Frontend Changes**
   ```javascript
   const handleSave = async () => {
     // Generate long URL as before
     const longUrl = `${origin}?data=${encoded}`;

     // Call Shlink API to shorten
     const response = await fetch('https://s.yourdomain.com/rest/v3/short-urls', {
       method: 'POST',
       headers: {
         'X-Api-Key': 'your-api-key',
         'Content-Type': 'application/json'
       },
       body: JSON.stringify({ longUrl })
     });

     const { shortUrl } = await response.json();
     setShareUrl(shortUrl);
   };
   ```

**Docker Compose for Shlink:**
```yaml
version: '3'
services:
  shlink:
    image: shlinkio/shlink:stable
    environment:
      - DEFAULT_DOMAIN=s.yourdomain.com
      - IS_HTTPS_ENABLED=true
      - DB_DRIVER=postgres
      - DB_HOST=db
      - DB_NAME=shlink
      - DB_USER=shlink
      - DB_PASSWORD=your_password
    ports:
      - "8080:8080"
    depends_on:
      - db
  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=shlink
      - POSTGRES_USER=shlink
      - POSTGRES_PASSWORD=your_password
    volumes:
      - shlink_db:/var/lib/postgresql/data

volumes:
  shlink_db:
```

---

## Option 2: Custom Minimal Backend

Build a simple API that stores calculation data and returns short IDs.

**Pros:**
- Minimal footprint
- Tailored exactly to your needs
- No URL length limit (data stored on server)

**Architecture:**
```
[GitHub Pages App] --POST /save--> [Node.js API] ---> [SQLite/PostgreSQL]
                                         |
                                   Returns: { id: "abc123" }
                                         |
[User shares] https://yourapp.com/s/abc123
                                         |
[GitHub Pages App] --GET /load/abc123--> [Node.js API]
                                         |
                                   Returns: { calculation data }
```

**Backend Code (Node.js + Express):**
```javascript
// server.js
const express = require('express');
const cors = require('cors');
const { nanoid } = require('nanoid');
const Database = require('better-sqlite3');

const app = express();
const db = new Database('calculations.db');

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS calculations (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Save calculation
app.post('/api/save', (req, res) => {
  const id = nanoid(8); // 8-char unique ID
  const data = JSON.stringify(req.body);

  db.prepare('INSERT INTO calculations (id, data) VALUES (?, ?)').run(id, data);
  res.json({ id });
});

// Load calculation
app.get('/api/load/:id', (req, res) => {
  const row = db.prepare('SELECT data FROM calculations WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(JSON.parse(row.data));
});

app.listen(3000, () => console.log('API running on port 3000'));
```

**Frontend Changes:**
```javascript
// Save to backend instead of URL encoding
const handleSave = async () => {
  const response = await fetch('https://api.yourdomain.com/api/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(calculation)
  });
  const { id } = await response.json();
  setShareUrl(`${window.location.origin}/s/${id}`);
};

// Load from backend when URL has short ID
useEffect(() => {
  const path = window.location.pathname;
  const match = path.match(/^\/s\/([a-zA-Z0-9_-]+)$/);
  if (match) {
    fetch(`https://api.yourdomain.com/api/load/${match[1]}`)
      .then(r => r.json())
      .then(data => {
        setCurrentCalc(data);
        setIsReadOnly(true);
        setView('calculation');
      });
  }
}, []);
```

---

## Option 3: Client-side Compression (No Backend)

Use compression library to reduce URL length without any backend changes.

**Pros:**
- No backend required
- Works with current GitHub Pages setup
- Simple to implement

**Cons:**
- URLs still ~40-60% of original (not truly "short")
- May still be too long for complex calculations

**Implementation:**
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.5.0/lz-string.min.js"></script>
```

```javascript
// Compress before encoding
const encodeCalcData = (calc) => {
  const json = JSON.stringify(calc);
  const compressed = LZString.compressToEncodedURIComponent(json);
  return compressed;
};

// Decompress after decoding
const decodeCalcData = (encoded) => {
  const json = LZString.decompressFromEncodedURIComponent(encoded);
  return JSON.parse(json);
};
```

**Expected Results:**
- Current URL: ~2500 characters (typical calculation)
- Compressed URL: ~1000-1500 characters (40-60% reduction)

---

## Option 4: Hybrid Approach (Recommended for Flexibility)

Combine compression with backend storage:
1. Try compression first
2. If URL still > 500 chars, use backend storage
3. Fallback to full URL if backend unavailable

```javascript
const handleSave = async () => {
  // Try compression first
  const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(calculation));
  const compressedUrl = `${origin}?c=${compressed}`;

  if (compressedUrl.length < 500) {
    setShareUrl(compressedUrl);
    return;
  }

  // Use backend for longer data
  try {
    const response = await fetch('https://api.yourdomain.com/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(calculation)
    });
    const { id } = await response.json();
    setShareUrl(`${origin}/s/${id}`);
  } catch (e) {
    // Fallback to compressed URL
    setShareUrl(compressedUrl);
  }
};
```

---

## Recommendation

For your setup (GitHub Pages + Proxmox server), I recommend **Option 2 (Custom API)** because:

1. **Simple deployment** - Single Node.js/Python service
2. **Full control** - Data stays on your server
3. **Clean URLs** - `https://yourdomain.com/s/abc123`
4. **No external dependencies** - Unlike Shlink, no complex stack needed
5. **Scalable** - Can add features later (expiration, edit links, etc.)

### Quick Start Steps:

1. **On Proxmox:** Create LXC container with Node.js
2. **Deploy:** Copy backend code, install dependencies, start service
3. **DNS:** Point `api.yourdomain.com` to Proxmox IP
4. **SSL:** Use Caddy or nginx with Let's Encrypt
5. **Update frontend:** Modify save/load logic in index.html

---

## Questions to Consider

1. **Data retention:** How long should shared calculations be stored?
2. **Editing:** Should shared links be editable by the owner?
3. **Privacy:** Is the data sensitive? (affects hosting/encryption decisions)
4. **Domain:** Do you want `yourdomain.com/s/id` or `short.yourdomain.com/id`?
