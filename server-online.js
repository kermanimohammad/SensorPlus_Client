// server-online.js — Express server for online deployment
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Proxy endpoint for external API to avoid CORS issues
app.get('/api/proxy/data', async (req, res) => {
  try {
    const externalApiUrl = 'https://digitaltwin-sensorplus-1.onrender.com/api/data';
    
    const response = await fetch(externalApiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'DigitalTwin-Online-Proxy/1.0'
      },
      timeout: 30000
    });

    if (!response.ok) {
      throw new Error(`External API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    res.json(data);
  } catch (error) {
    console.error('[Proxy] Failed to fetch external API:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch external API data',
      details: error.message 
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    environment: 'online',
    timestamp: new Date().toISOString()
  });
});

// Serve the main application
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Online server running on port ${PORT}`);
  console.log(`📊 Proxy API available at http://localhost:${PORT}/api/proxy/data`);
  console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
});

export default app;
