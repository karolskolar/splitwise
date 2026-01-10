const express = require('express');
const cors = require('cors');
const { nanoid } = require('nanoid');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';
const JWT_EXPIRES_IN = '7d';

// Google OAuth client
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Data file setup
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
const calculationsFile = path.join(dataDir, 'calculations.json');
const usersFile = path.join(dataDir, 'users.json');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Load existing data or initialize empty
let calculations = {};
let users = {};

if (fs.existsSync(calculationsFile)) {
  try {
    calculations = JSON.parse(fs.readFileSync(calculationsFile, 'utf8'));
  } catch (e) {
    console.error('Failed to load calculations file:', e.message);
    calculations = {};
  }
}

if (fs.existsSync(usersFile)) {
  try {
    users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
  } catch (e) {
    console.error('Failed to load users file:', e.message);
    users = {};
  }
}

// Save data to files
const saveCalculations = () => {
  try {
    fs.writeFileSync(calculationsFile, JSON.stringify(calculations, null, 2));
  } catch (e) {
    console.error('Failed to save calculations:', e.message);
  }
};

const saveUsers = () => {
  try {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
  } catch (e) {
    console.error('Failed to save users:', e.message);
  }
};

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '1mb' }));

// JWT Authentication middleware (optional auth - allows anonymous)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    req.user = null;
    next();
  }
};

// Required auth middleware
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== AUTH ENDPOINTS ====================

// Google Login
app.post('/api/auth/google', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    if (!GOOGLE_CLIENT_ID) {
      return res.status(500).json({ error: 'Google OAuth not configured' });
    }

    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const googleId = payload['sub'];
    const email = payload['email'];
    const name = payload['name'];
    const picture = payload['picture'];

    const userId = `google_${googleId}`;

    // Create or update user
    const isNewUser = !users[userId];
    users[userId] = {
      id: userId,
      email,
      name,
      picture,
      createdAt: users[userId]?.createdAt || new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };
    saveUsers();

    // Generate JWT
    const jwtToken = jwt.sign(
      { userId, email, name, picture },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    console.log(`User ${isNewUser ? 'created' : 'logged in'}: ${email}`);

    res.json({
      token: jwtToken,
      user: {
        id: userId,
        email,
        name,
        picture
      }
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(401).json({ error: 'Invalid Google token' });
  }
});

// Get current user info
app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = users[req.user.userId];
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    picture: user.picture
  });
});

// ==================== CALCULATIONS ENDPOINTS ====================

// Get user's calculations (authenticated)
app.get('/api/calculations', requireAuth, (req, res) => {
  try {
    const userCalculations = Object.entries(calculations)
      .filter(([_, calc]) => calc.userId === req.user.userId)
      .map(([id, calc]) => ({
        id,
        ...calc.data,
        createdAt: calc.createdAt
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(userCalculations);
  } catch (error) {
    console.error('Get calculations error:', error);
    res.status(500).json({ error: 'Failed to get calculations' });
  }
});

// Save calculation (authenticated users get it saved to their account)
app.post('/api/save', optionalAuth, (req, res) => {
  try {
    const data = req.body;

    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Invalid data' });
    }

    const id = nanoid(8);

    calculations[id] = {
      data: data,
      userId: req.user?.userId || null,
      createdAt: new Date().toISOString(),
      accessedAt: new Date().toISOString(),
      accessCount: 0
    };

    saveCalculations();

    console.log(`Saved calculation: ${id}${req.user ? ` for user ${req.user.email}` : ' (anonymous)'}`);
    res.json({ id });
  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({ error: 'Failed to save calculation' });
  }
});

// Load calculation by ID (public - for shared links)
app.get('/api/load/:id', (req, res) => {
  try {
    const { id } = req.params;

    if (!id || id.length < 6 || id.length > 12) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const record = calculations[id];

    if (!record) {
      return res.status(404).json({ error: 'Calculation not found' });
    }

    // Update access statistics
    record.accessedAt = new Date().toISOString();
    record.accessCount = (record.accessCount || 0) + 1;
    saveCalculations();

    console.log(`Loaded calculation: ${id}`);
    res.json(record.data);
  } catch (error) {
    console.error('Load error:', error);
    res.status(500).json({ error: 'Failed to load calculation' });
  }
});

// Update calculation (owner only)
app.post('/api/calculations/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const record = calculations[id];
    if (!record) {
      return res.status(404).json({ error: 'Calculation not found' });
    }

    if (record.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to update this calculation' });
    }

    record.data = data;
    record.accessedAt = new Date().toISOString();
    saveCalculations();

    console.log(`Updated calculation: ${id}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: 'Failed to update calculation' });
  }
});

// Delete calculation (owner only)
app.delete('/api/calculations/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;

    const record = calculations[id];
    if (!record) {
      return res.status(404).json({ error: 'Calculation not found' });
    }

    if (record.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to delete this calculation' });
    }

    delete calculations[id];
    saveCalculations();

    console.log(`Deleted calculation: ${id}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete calculation' });
  }
});

// Stats endpoint (for monitoring)
app.get('/api/stats', (req, res) => {
  try {
    const calcIds = Object.keys(calculations);
    const totalAccesses = calcIds.reduce((sum, id) => sum + (calculations[id].accessCount || 0), 0);

    res.json({
      total_calculations: calcIds.length,
      total_users: Object.keys(users).length,
      total_accesses: totalAccesses
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Splitwise API running on port ${PORT}`);
  console.log(`Data directory: ${dataDir}`);
  console.log(`Loaded ${Object.keys(calculations).length} calculations, ${Object.keys(users).length} users`);
  if (!GOOGLE_CLIENT_ID) {
    console.warn('WARNING: GOOGLE_CLIENT_ID not set - Google login will not work');
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down...');
  saveCalculations();
  saveUsers();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down...');
  saveCalculations();
  saveUsers();
  process.exit(0);
});
