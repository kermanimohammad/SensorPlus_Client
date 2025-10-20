// server.js — Express server for database API
import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Database configuration
const DB_CONFIG = {
  host: 'kbz.rew.mybluehost.me',
  database: 'kbzrewmy_sensor',
  user: 'kbzrewmy_mo_kerma',
  password: 'Mehrafarid.5435',
  port: 3306,
  ssl: false
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Database connection pool
let dbPool = null;

async function initDatabase() {
  try {
    dbPool = mysql.createPool({
      ...DB_CONFIG,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    
    // Test connection
    const connection = await dbPool.getConnection();
    await connection.ping();
    connection.release();
    
    console.log('✅ Database connection pool initialized');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    database: dbPool ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Database test endpoint
app.get('/api/db/test', async (req, res) => {
  try {
    if (!dbPool) {
      return res.json({ 
        success: false, 
        connected: false, 
        error: 'Database pool not initialized' 
      });
    }

    const connection = await dbPool.getConnection();
    await connection.ping();
    connection.release();
    
    res.json({ 
      success: true, 
      connected: true, 
      message: 'Database connection successful.' 
    });
  } catch (error) {
    console.error('[DB] Connection test failed:', error);
    res.json({ 
      success: false, 
      connected: false, 
      error: error.message 
    });
  }
});

// Proxy endpoint for external API to avoid CORS issues
app.get('/api/proxy/data', async (req, res) => {
  try {
    const externalApiUrl = 'https://digitaltwin-sensorplus-1.onrender.com/api/data';
    
    const response = await fetch(externalApiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'DigitalTwin-Local-Proxy/1.0'
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

// Get available devices for a sensor type
app.get('/api/devices/:sensorType', async (req, res) => {
  try {
    if (!dbPool) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    const { sensorType } = req.params;
    let tableName;

    switch (sensorType) {
      case 'temperature':
        tableName = 'temperature_data';
        break;
      case 'humidity':
        tableName = 'humidity_data';
        break;
      case 'co2':
        tableName = 'co2_data';
        break;
      case 'light':
        tableName = 'light_data';
        break;
      case 'solar':
        tableName = 'solar_data';
        break;
      default:
        return res.status(400).json({ error: 'Invalid sensor type' });
    }

    const [rows] = await dbPool.execute(
      `SELECT DISTINCT device_id FROM ${tableName} ORDER BY device_id`
    );

    const devices = rows.map(row => row.device_id);
    res.json({ devices });
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// Get historical data for a sensor
app.get('/api/history/:sensorType/:deviceId', async (req, res) => {
  try {
    if (!dbPool) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    const { sensorType, deviceId } = req.params;
    const hours = parseInt(req.query.hours) || 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    let query, tableName;

    switch (sensorType) {
      case 'temperature':
        tableName = 'temperature_data';
        query = `SELECT device_id, room_id, temperature_c as value, timestamp 
                 FROM ${tableName} 
                 WHERE device_id = ? AND timestamp >= ? 
                 ORDER BY timestamp ASC`;
        break;
      case 'humidity':
        tableName = 'humidity_data';
        query = `SELECT device_id, room_id, humidity_percent as value, timestamp 
                 FROM ${tableName} 
                 WHERE device_id = ? AND timestamp >= ? 
                 ORDER BY timestamp ASC`;
        break;
      case 'co2':
        tableName = 'co2_data';
        query = `SELECT device_id, room_id, co2_ppm as value, timestamp 
                 FROM ${tableName} 
                 WHERE device_id = ? AND timestamp >= ? 
                 ORDER BY timestamp ASC`;
        break;
      case 'light':
        tableName = 'light_data';
        query = `SELECT device_id, room_id, is_on, power_watts, timestamp 
                 FROM ${tableName} 
                 WHERE device_id = ? AND timestamp >= ? 
                 ORDER BY timestamp ASC`;
        break;
      case 'solar':
        tableName = 'solar_data';
        query = `SELECT device_id, power_watts, voltage_volts, current_amps, timestamp 
                 FROM ${tableName} 
                 WHERE device_id = ? AND timestamp >= ? 
                 ORDER BY timestamp ASC`;
        break;
      default:
        return res.status(400).json({ error: 'Invalid sensor type' });
    }

    const [rows] = await dbPool.execute(query, [deviceId, since]);

    // Format data based on sensor type
    let data;
    if (sensorType === 'light') {
      data = rows.map(row => ({
        timestamp: row.timestamp,
        is_on: Boolean(row.is_on),
        power_watts: row.power_watts,
        device_id: row.device_id,
        room_id: row.room_id
      }));
    } else if (sensorType === 'solar') {
      data = rows.map(row => ({
        timestamp: row.timestamp,
        power_watts: row.power_watts,
        voltage_volts: row.voltage_volts,
        current_amps: row.current_amps,
        device_id: row.device_id
      }));
    } else {
      data = rows.map(row => ({
        timestamp: row.timestamp,
        value: row.value,
        device_id: row.device_id,
        room_id: row.room_id
      }));
    }

    res.json({ 
      success: true, 
      data, 
      count: data.length,
      sensorType,
      deviceId,
      hours
    });
  } catch (error) {
    console.error('Error fetching sensor history:', error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// Test database connection
app.get('/api/db/test', async (req, res) => {
  try {
    if (!dbPool) {
      return res.json({ connected: false, error: 'Database pool not initialized' });
    }

    const connection = await dbPool.getConnection();
    await connection.ping();
    connection.release();

    res.json({ connected: true, message: 'Database connection successful' });
  } catch (error) {
    console.error('Database test failed:', error);
    res.json({ connected: false, error: error.message });
  }
});

// Serve the main application
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Initialize database and start server
async function startServer() {
  console.log('🚀 Starting DigitalTwin Database API Server...');
  
  const dbConnected = await initDatabase();
  if (!dbConnected) {
    console.warn('⚠️  Database connection failed, but server will continue');
  }

  app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`📊 Database API available at http://localhost:${PORT}/api/`);
    console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
  });
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  if (dbPool) {
    await dbPool.end();
    console.log('✅ Database connections closed');
  }
  process.exit(0);
});

startServer().catch(console.error);
