const express = require('express');
const cors = require('cors');
const { nanoid } = require('nanoid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Data file setup
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'calculations.json');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Load existing data or initialize empty
let calculations = {};
if (fs.existsSync(dataFile)) {
  try {
    calculations = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  } catch (e) {
    console.error('Failed to load data file, starting fresh:', e.message);
    calculations = {};
  }
}

// Save data to file
const saveData = () => {
  try {
    fs.writeFileSync(dataFile, JSON.stringify(calculations, null, 2));
  } catch (e) {
    console.error('Failed to save data:', e.message);
  }
};

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json({ limit: '1mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Save calculation - returns short ID
app.post('/api/save', (req, res) => {
  try {
    const data = req.body;

    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Invalid data' });
    }

    const id = nanoid(8); // 8-character unique ID

    calculations[id] = {
      data: data,
      createdAt: new Date().toISOString(),
      accessedAt: new Date().toISOString(),
      accessCount: 0
    };

    saveData();

    console.log(`Saved calculation: ${id}`);
    res.json({ id });
  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({ error: 'Failed to save calculation' });
  }
});

// Load calculation by ID
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
    saveData();

    console.log(`Loaded calculation: ${id}`);
    res.json(record.data);
  } catch (error) {
    console.error('Load error:', error);
    res.status(500).json({ error: 'Failed to load calculation' });
  }
});

// Stats endpoint (optional, for monitoring)
app.get('/api/stats', (req, res) => {
  try {
    const ids = Object.keys(calculations);
    const totalAccesses = ids.reduce((sum, id) => sum + (calculations[id].accessCount || 0), 0);

    res.json({
      total_calculations: ids.length,
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
  console.log(`Data file: ${dataFile}`);
  console.log(`Loaded ${Object.keys(calculations).length} existing calculations`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down...');
  saveData();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down...');
  saveData();
  process.exit(0);
});
