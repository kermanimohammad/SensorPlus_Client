# AI Integration Guide for DigitalTwin SensorPlus

## 📋 Overview

This guide provides comprehensive instructions for AI systems to integrate with the DigitalTwin SensorPlus platform. The guide covers both real-time data access and historical database queries.

**Target Audience:** AI systems, external applications, and developers who need to access sensor data programmatically.

## 🌐 System Architecture

### Data Access Points

```
External AI/Application
    ↓
┌─────────────────────────────────────┐
│  DigitalTwin SensorPlus Platform   │
├─────────────────────────────────────┤
│  Real-time API (HTTP)              │ ← Live sensor data
│  Database API (MySQL)              │ ← Historical data
│  WebSocket (Optional)              │ ← Real-time streaming
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  Data Sources                      │
├─────────────────────────────────────┤
│  • 21 IoT Sensors (5 rooms)        │
│  • Temperature, Humidity, CO2,     │
│    Light, Solar sensors            │
│  • MySQL Database (Historical)     │
└─────────────────────────────────────┘
```

## 🔗 Connection Information

### Server Details
- **Production URL:** https://digitaltwin-sensorplus-1.onrender.com
- **Protocol:** HTTPS
- **Port:** 10000 (internal)
- **API Base:** `/api/`

### Database Details
- **Host:** kbz.rew.mybluehost.me
- **Database:** kbzrewmy_sensor
- **User:** kbzrewmy_mo_kerma
- **Password:** Mehrafarid.5435
- **Port:** 3306
- **SSL:** Required

## 📊 Available Data Sources

### 1. Real-time Data (HTTP API)

#### Endpoint: `GET /api/data`
- **URL:** `https://digitaltwin-sensorplus-1.onrender.com/api/data`
- **Method:** GET
- **Response:** JSON with current sensor readings
- **Update Frequency:** Every 5 seconds
- **Data Format:** Current values for all 21 devices

#### Sample Response:
```json
{
  "success": true,
  "devices": {
    "temp-1": {
      "device_id": "temp-1",
      "kind": "temperature",
      "value": 22.3,
      "unit": "°C",
      "room_id": "room1",
      "timestamp": "2024-01-15T10:30:00",
      "db_saved": true
    },
    "hum-1": {
      "device_id": "hum-1",
      "kind": "humidity",
      "value": 45.2,
      "unit": "%",
      "room_id": "room1",
      "timestamp": "2024-01-15T10:30:00",
      "db_saved": true
    }
    // ... 19 more devices
  },
  "total_devices": 21,
  "db_saves": 150,
  "db_fails": 0
}
```

### 2. Historical Data (Database)

#### Database Tables:
- `temperature_data` - Temperature sensor history
- `humidity_data` - Humidity sensor history  
- `co2_data` - CO2 sensor history
- `light_data` - Light sensor history
- `solar_data` - Solar panel history

#### Table Structure:
```sql
-- Temperature Data Table
CREATE TABLE temperature_data (
    id INT PRIMARY KEY AUTO_INCREMENT,
    device_id VARCHAR(50) NOT NULL,
    room_id VARCHAR(20),
    temperature_c FLOAT,
    timestamp DATETIME NOT NULL,
    raw_data TEXT
);

-- Humidity Data Table  
CREATE TABLE humidity_data (
    id INT PRIMARY KEY AUTO_INCREMENT,
    device_id VARCHAR(50) NOT NULL,
    room_id VARCHAR(20),
    humidity_percent FLOAT,
    timestamp DATETIME NOT NULL,
    raw_data TEXT
);

-- CO2 Data Table
CREATE TABLE co2_data (
    id INT PRIMARY KEY AUTO_INCREMENT,
    device_id VARCHAR(50) NOT NULL,
    room_id VARCHAR(20),
    co2_ppm INT,
    timestamp DATETIME NOT NULL,
    raw_data TEXT
);

-- Light Data Table
CREATE TABLE light_data (
    id INT PRIMARY KEY AUTO_INCREMENT,
    device_id VARCHAR(50) NOT NULL,
    room_id VARCHAR(20),
    is_on BOOLEAN,
    power_watts FLOAT,
    timestamp DATETIME NOT NULL,
    raw_data TEXT
);

-- Solar Data Table
CREATE TABLE solar_data (
    id INT PRIMARY KEY AUTO_INCREMENT,
    device_id VARCHAR(50) NOT NULL,
    power_watts FLOAT,
    voltage_volts FLOAT,
    current_amps FLOAT,
    timestamp DATETIME NOT NULL,
    raw_data TEXT
);
```

## 🤖 AI Integration Examples

### Python Implementation

#### 1. Real-time Data Access

```python
import requests
import json
import time
from datetime import datetime

class DigitalTwinClient:
    def __init__(self, base_url="https://digitaltwin-sensorplus-1.onrender.com"):
        self.base_url = base_url
        self.session = requests.Session()
    
    def get_current_data(self):
        """Get current sensor data from all 21 devices"""
        try:
            response = self.session.get(f"{self.base_url}/api/data")
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"Error fetching data: {e}")
            return None
    
    def get_room_data(self, room_id):
        """Get data for a specific room"""
        data = self.get_current_data()
        if not data or not data.get('success'):
            return None
        
        room_devices = {}
        for device_id, device_data in data['devices'].items():
            if device_data.get('room_id') == room_id:
                room_devices[device_id] = device_data
        
        return room_devices
    
    def get_sensor_type_data(self, sensor_type):
        """Get data for a specific sensor type (temperature, humidity, etc.)"""
        data = self.get_current_data()
        if not data or not data.get('success'):
            return None
        
        sensor_devices = {}
        for device_id, device_data in data['devices'].items():
            if device_data.get('kind') == sensor_type:
                sensor_devices[device_id] = device_data
        
        return sensor_devices
    
    def monitor_real_time(self, callback, interval=5):
        """Monitor real-time data with callback function"""
        while True:
            data = self.get_current_data()
            if data and data.get('success'):
                callback(data)
            time.sleep(interval)

# Usage Example
def process_sensor_data(data):
    """Process incoming sensor data"""
    print(f"Received data for {data['total_devices']} devices")
    
    # Analyze temperature data
    temp_devices = {}
    for device_id, device_data in data['devices'].items():
        if device_data['kind'] == 'temperature':
            temp_devices[device_id] = device_data['value']
    
    # Calculate average temperature
    if temp_devices:
        avg_temp = sum(temp_devices.values()) / len(temp_devices)
        print(f"Average temperature: {avg_temp:.1f}°C")
    
    # Check for anomalies
    for device_id, temp in temp_devices.items():
        if temp > 30 or temp < 15:
            print(f"⚠️ Temperature anomaly in {device_id}: {temp}°C")

# Initialize client and start monitoring
client = DigitalTwinClient()
client.monitor_real_time(process_sensor_data, interval=10)
```

#### 2. Historical Database Access

```python
import mysql.connector
import pandas as pd
from datetime import datetime, timedelta

class DigitalTwinDatabase:
    def __init__(self):
        self.config = {
            'host': 'kbz.rew.mybluehost.me',
            'database': 'kbzrewmy_sensor',
            'user': 'kbzrewmy_mo_kerma',
            'password': 'Mehrafarid.5435',
            'port': 3306,
            'ssl_disabled': False
        }
    
    def connect(self):
        """Establish database connection"""
        try:
            connection = mysql.connector.connect(**self.config)
            return connection
        except mysql.connector.Error as e:
            print(f"Database connection error: {e}")
            return None
    
    def get_temperature_history(self, device_id=None, hours=24):
        """Get temperature history"""
        connection = self.connect()
        if not connection:
            return None
        
        try:
            cursor = connection.cursor(dictionary=True)
            
            # Build query
            query = """
                SELECT device_id, room_id, temperature_c, timestamp, raw_data
                FROM temperature_data
                WHERE timestamp >= %s
            """
            params = [datetime.now() - timedelta(hours=hours)]
            
            if device_id:
                query += " AND device_id = %s"
                params.append(device_id)
            
            query += " ORDER BY timestamp DESC"
            
            cursor.execute(query, params)
            results = cursor.fetchall()
            
            return pd.DataFrame(results)
            
        except mysql.connector.Error as e:
            print(f"Query error: {e}")
            return None
        finally:
            connection.close()
    
    def get_humidity_history(self, device_id=None, hours=24):
        """Get humidity history"""
        connection = self.connect()
        if not connection:
            return None
        
        try:
            cursor = connection.cursor(dictionary=True)
            
            query = """
                SELECT device_id, room_id, humidity_percent, timestamp, raw_data
                FROM humidity_data
                WHERE timestamp >= %s
            """
            params = [datetime.now() - timedelta(hours=hours)]
            
            if device_id:
                query += " AND device_id = %s"
                params.append(device_id)
            
            query += " ORDER BY timestamp DESC"
            
            cursor.execute(query, params)
            results = cursor.fetchall()
            
            return pd.DataFrame(results)
            
        except mysql.connector.Error as e:
            print(f"Query error: {e}")
            return None
        finally:
            connection.close()
    
    def get_room_summary(self, room_id, hours=24):
        """Get summary data for a specific room"""
        connection = self.connect()
        if not connection:
            return None
        
        try:
            cursor = connection.cursor(dictionary=True)
            
            # Get latest data from all sensor types for the room
            queries = {
                'temperature': """
                    SELECT device_id, temperature_c, timestamp
                    FROM temperature_data
                    WHERE room_id = %s AND timestamp >= %s
                    ORDER BY timestamp DESC LIMIT 1
                """,
                'humidity': """
                    SELECT device_id, humidity_percent, timestamp
                    FROM humidity_data
                    WHERE room_id = %s AND timestamp >= %s
                    ORDER BY timestamp DESC LIMIT 1
                """,
                'co2': """
                    SELECT device_id, co2_ppm, timestamp
                    FROM co2_data
                    WHERE room_id = %s AND timestamp >= %s
                    ORDER BY timestamp DESC LIMIT 1
                """,
                'light': """
                    SELECT device_id, is_on, power_watts, timestamp
                    FROM light_data
                    WHERE room_id = %s AND timestamp >= %s
                    ORDER BY timestamp DESC LIMIT 1
                """
            }
            
            summary = {}
            params = [room_id, datetime.now() - timedelta(hours=hours)]
            
            for sensor_type, query in queries.items():
                cursor.execute(query, params)
                result = cursor.fetchone()
                if result:
                    summary[sensor_type] = result
            
            return summary
            
        except mysql.connector.Error as e:
            print(f"Query error: {e}")
            return None
        finally:
            connection.close()
    
    def get_analytics_data(self, start_date, end_date):
        """Get analytics data for a date range"""
        connection = self.connect()
        if not connection:
            return None
        
        try:
            cursor = connection.cursor(dictionary=True)
            
            # Get aggregated data
            query = """
                SELECT 
                    DATE(timestamp) as date,
                    AVG(temperature_c) as avg_temp,
                    MIN(temperature_c) as min_temp,
                    MAX(temperature_c) as max_temp,
                    COUNT(*) as readings
                FROM temperature_data
                WHERE timestamp BETWEEN %s AND %s
                GROUP BY DATE(timestamp)
                ORDER BY date
            """
            
            cursor.execute(query, [start_date, end_date])
            results = cursor.fetchall()
            
            return pd.DataFrame(results)
            
        except mysql.connector.Error as e:
            print(f"Query error: {e}")
            return None
        finally:
            connection.close()

# Usage Example
db = DigitalTwinDatabase()

# Get temperature history for last 24 hours
temp_data = db.get_temperature_history(hours=24)
if temp_data is not None:
    print(f"Retrieved {len(temp_data)} temperature readings")
    print(temp_data.head())

# Get room summary
room_summary = db.get_room_summary('room1', hours=24)
if room_summary:
    print("Room 1 Summary:")
    for sensor_type, data in room_summary.items():
        print(f"  {sensor_type}: {data}")
```

### JavaScript/Node.js Implementation

```javascript
const axios = require('axios');
const mysql = require('mysql2/promise');

class DigitalTwinClient {
    constructor(baseUrl = 'https://digitaltwin-sensorplus-1.onrender.com') {
        this.baseUrl = baseUrl;
        this.httpClient = axios.create({
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    async getCurrentData() {
        try {
            const response = await this.httpClient.get(`${this.baseUrl}/api/data`);
            return response.data;
        } catch (error) {
            console.error('Error fetching data:', error.message);
            return null;
        }
    }

    async getRoomData(roomId) {
        const data = await this.getCurrentData();
        if (!data || !data.success) {
            return null;
        }

        const roomDevices = {};
        for (const [deviceId, deviceData] of Object.entries(data.devices)) {
            if (deviceData.room_id === roomId) {
                roomDevices[deviceId] = deviceData;
            }
        }

        return roomDevices;
    }

    async monitorRealTime(callback, interval = 5000) {
        setInterval(async () => {
            const data = await this.getCurrentData();
            if (data && data.success) {
                callback(data);
            }
        }, interval);
    }
}

class DigitalTwinDatabase {
    constructor() {
        this.config = {
            host: 'kbz.rew.mybluehost.me',
            database: 'kbzrewmy_sensor',
            user: 'kbzrewmy_mo_kerma',
            password: 'Mehrafarid.5435',
            port: 3306,
            ssl: false
        };
    }

    async connect() {
        try {
            return await mysql.createConnection(this.config);
        } catch (error) {
            console.error('Database connection error:', error);
            return null;
        }
    }

    async getTemperatureHistory(deviceId = null, hours = 24) {
        const connection = await this.connect();
        if (!connection) return null;

        try {
            const since = new Date(Date.now() - hours * 60 * 60 * 1000);
            let query = `
                SELECT device_id, room_id, temperature_c, timestamp, raw_data
                FROM temperature_data
                WHERE timestamp >= ?
            `;
            const params = [since];

            if (deviceId) {
                query += ' AND device_id = ?';
                params.push(deviceId);
            }

            query += ' ORDER BY timestamp DESC';

            const [rows] = await connection.execute(query, params);
            return rows;
        } catch (error) {
            console.error('Query error:', error);
            return null;
        } finally {
            await connection.end();
        }
    }

    async getRoomSummary(roomId, hours = 24) {
        const connection = await this.connect();
        if (!connection) return null;

        try {
            const since = new Date(Date.now() - hours * 60 * 60 * 1000);
            
            const queries = {
                temperature: `
                    SELECT device_id, temperature_c, timestamp
                    FROM temperature_data
                    WHERE room_id = ? AND timestamp >= ?
                    ORDER BY timestamp DESC LIMIT 1
                `,
                humidity: `
                    SELECT device_id, humidity_percent, timestamp
                    FROM humidity_data
                    WHERE room_id = ? AND timestamp >= ?
                    ORDER BY timestamp DESC LIMIT 1
                `,
                co2: `
                    SELECT device_id, co2_ppm, timestamp
                    FROM co2_data
                    WHERE room_id = ? AND timestamp >= ?
                    ORDER BY timestamp DESC LIMIT 1
                `,
                light: `
                    SELECT device_id, is_on, power_watts, timestamp
                    FROM light_data
                    WHERE room_id = ? AND timestamp >= ?
                    ORDER BY timestamp DESC LIMIT 1
                `
            };

            const summary = {};
            for (const [sensorType, query] of Object.entries(queries)) {
                const [rows] = await connection.execute(query, [roomId, since]);
                if (rows.length > 0) {
                    summary[sensorType] = rows[0];
                }
            }

            return summary;
        } catch (error) {
            console.error('Query error:', error);
            return null;
        } finally {
            await connection.end();
        }
    }
}

// Usage Example
async function main() {
    const client = new DigitalTwinClient();
    const db = new DigitalTwinDatabase();

    // Get current data
    const currentData = await client.getCurrentData();
    if (currentData) {
        console.log(`Current data for ${currentData.total_devices} devices`);
    }

    // Get historical data
    const tempHistory = await db.getTemperatureHistory('temp-1', 24);
    if (tempHistory) {
        console.log(`Temperature history: ${tempHistory.length} readings`);
    }

    // Monitor real-time
    client.monitorRealTime((data) => {
        console.log(`Real-time update: ${data.total_devices} devices`);
    }, 10000);
}

main().catch(console.error);
```

## 📈 Data Analysis Examples

### 1. Temperature Trend Analysis

```python
import matplotlib.pyplot as plt
import pandas as pd
from datetime import datetime, timedelta

def analyze_temperature_trends():
    db = DigitalTwinDatabase()
    
    # Get temperature data for last 7 days
    temp_data = db.get_temperature_history(hours=168)
    
    if temp_data is not None:
        # Convert timestamp to datetime
        temp_data['timestamp'] = pd.to_datetime(temp_data['timestamp'])
        
        # Group by device and calculate daily averages
        daily_avg = temp_data.groupby([
            temp_data['timestamp'].dt.date, 
            'device_id'
        ])['temperature_c'].mean().reset_index()
        
        # Plot trends
        plt.figure(figsize=(12, 8))
        for device_id in daily_avg['device_id'].unique():
            device_data = daily_avg[daily_avg['device_id'] == device_id]
            plt.plot(device_data['timestamp'], device_data['temperature_c'], 
                    label=device_id, marker='o')
        
        plt.xlabel('Date')
        plt.ylabel('Temperature (°C)')
        plt.title('Temperature Trends - Last 7 Days')
        plt.legend()
        plt.grid(True)
        plt.show()
        
        # Calculate statistics
        stats = temp_data.groupby('device_id')['temperature_c'].agg([
            'mean', 'std', 'min', 'max'
        ]).round(2)
        
        print("Temperature Statistics:")
        print(stats)

analyze_temperature_trends()
```

### 2. Anomaly Detection

```python
import numpy as np
from scipy import stats

def detect_anomalies():
    db = DigitalTwinDatabase()
    
    # Get temperature data for last 24 hours
    temp_data = db.get_temperature_history(hours=24)
    
    if temp_data is not None:
        # Detect anomalies using Z-score
        z_scores = np.abs(stats.zscore(temp_data['temperature_c']))
        threshold = 2.5
        
        anomalies = temp_data[z_scores > threshold]
        
        if len(anomalies) > 0:
            print(f"Detected {len(anomalies)} temperature anomalies:")
            for _, anomaly in anomalies.iterrows():
                print(f"  {anomaly['device_id']}: {anomaly['temperature_c']}°C at {anomaly['timestamp']}")
        else:
            print("No temperature anomalies detected")
        
        # Detect humidity anomalies
        hum_data = db.get_humidity_history(hours=24)
        if hum_data is not None:
            hum_z_scores = np.abs(stats.zscore(hum_data['humidity_percent']))
            hum_anomalies = hum_data[hum_z_scores > threshold]
            
            if len(hum_anomalies) > 0:
                print(f"Detected {len(hum_anomalies)} humidity anomalies:")
                for _, anomaly in hum_anomalies.iterrows():
                    print(f"  {anomaly['device_id']}: {anomaly['humidity_percent']}% at {anomaly['timestamp']}")

detect_anomalies()
```

### 3. Energy Efficiency Analysis

```python
def analyze_energy_efficiency():
    db = DigitalTwinDatabase()
    
    # Get light and solar data
    connection = db.connect()
    if not connection:
        return
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Get light usage patterns
        light_query = """
            SELECT 
                device_id,
                room_id,
                is_on,
                power_watts,
                timestamp
            FROM light_data
            WHERE timestamp >= %s
            ORDER BY timestamp
        """
        
        cursor.execute(light_query, [datetime.now() - timedelta(hours=24)])
        light_data = cursor.fetchall()
        
        # Get solar generation
        solar_query = """
            SELECT 
                device_id,
                power_watts,
                voltage_volts,
                current_amps,
                timestamp
            FROM solar_data
            WHERE timestamp >= %s
            ORDER BY timestamp
        """
        
        cursor.execute(solar_query, [datetime.now() - timedelta(hours=24)])
        solar_data = cursor.fetchall()
        
        # Calculate energy consumption
        total_light_power = sum(row['power_watts'] for row in light_data if row['is_on'])
        total_solar_power = sum(row['power_watts'] for row in solar_data)
        
        efficiency = (total_solar_power / total_light_power) * 100 if total_light_power > 0 else 0
        
        print(f"Energy Analysis (Last 24 hours):")
        print(f"  Total Light Power: {total_light_power:.2f}W")
        print(f"  Total Solar Power: {total_solar_power:.2f}W")
        print(f"  Efficiency: {efficiency:.1f}%")
        
    except mysql.connector.Error as e:
        print(f"Query error: {e}")
    finally:
        connection.close()

analyze_energy_efficiency()
```

## 🔧 Configuration and Setup

### Environment Variables

```bash
# API Configuration
DIGITALTWIN_API_URL=https://digitaltwin-sensorplus-1.onrender.com
DIGITALTWIN_API_TIMEOUT=10000

# Database Configuration
DB_HOST=kbz.rew.mybluehost.me
DB_NAME=kbzrewmy_sensor
DB_USER=kbzrewmy_mo_kerma
DB_PASSWORD=Mehrafarid.5435
DB_PORT=3306
DB_SSL=true

# Monitoring Configuration
MONITORING_INTERVAL=5000
ANOMALY_THRESHOLD=2.5
DATA_RETENTION_DAYS=30
```

### Dependencies

#### Python
```bash
pip install requests mysql-connector-python pandas matplotlib scipy numpy
```

#### Node.js
```bash
npm install axios mysql2
```

## 📊 Data Schema Reference

### Device Mapping

| Device ID | Type | Room | Description |
|-----------|------|------|-------------|
| temp-1 to temp-5 | temperature | room1 to room5 | Temperature sensors |
| hum-1 to hum-5 | humidity | room1 to room5 | Humidity sensors |
| co2-1 to co2-5 | co2 | room1 to room5 | CO2 sensors |
| light-1 to light-5 | light | room1 to room5 | Light sensors |
| solar-plant | solar | solar-farm | Solar panel |

### Data Types

| Sensor Type | Value Field | Unit | Range |
|-------------|-------------|------|-------|
| temperature | temperature_c | °C | 15-30 |
| humidity | humidity_percent | % | 30-60 |
| co2 | co2_ppm | ppm | 350-600 |
| light | power_watts | W | 100-1200 |
| solar | power_watts | W | 100-150 |

## 🚨 Error Handling

### Common Issues and Solutions

1. **Connection Timeout**
   - Increase timeout value
   - Implement retry logic
   - Check network connectivity

2. **Database Connection Failed**
   - Verify credentials
   - Check SSL configuration
   - Ensure firewall allows connection

3. **No Data Available**
   - Check if sensors are active
   - Verify data is being saved
   - Check timestamp ranges

4. **Rate Limiting**
   - Implement request throttling
   - Use appropriate intervals
   - Cache data when possible

### Error Handling Example

```python
import time
import logging
from functools import wraps

def retry_on_failure(max_retries=3, delay=1):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_retries - 1:
                        logging.error(f"Function {func.__name__} failed after {max_retries} attempts: {e}")
                        raise
                    logging.warning(f"Attempt {attempt + 1} failed: {e}. Retrying in {delay} seconds...")
                    time.sleep(delay)
            return None
        return wrapper
    return decorator

@retry_on_failure(max_retries=3, delay=2)
def get_data_with_retry():
    client = DigitalTwinClient()
    return client.get_current_data()
```

## 📈 Performance Optimization

### Best Practices

1. **Connection Pooling**
   - Reuse database connections
   - Implement connection pooling
   - Close connections properly

2. **Data Caching**
   - Cache frequently accessed data
   - Implement TTL for cache
   - Use appropriate cache strategies

3. **Batch Processing**
   - Process data in batches
   - Implement pagination for large datasets
   - Use efficient queries

4. **Monitoring**
   - Implement health checks
   - Monitor API response times
   - Track error rates

### Performance Example

```python
import redis
from functools import lru_cache

class OptimizedDigitalTwinClient:
    def __init__(self, cache_ttl=300):
        self.client = DigitalTwinClient()
        self.redis_client = redis.Redis(host='localhost', port=6379, db=0)
        self.cache_ttl = cache_ttl
    
    @lru_cache(maxsize=128)
    def get_cached_data(self, cache_key):
        """Get data with caching"""
        # Try Redis cache first
        cached_data = self.redis_client.get(cache_key)
        if cached_data:
            return json.loads(cached_data)
        
        # Fetch from API
        data = self.client.get_current_data()
        if data:
            # Cache for 5 minutes
            self.redis_client.setex(
                cache_key, 
                self.cache_ttl, 
                json.dumps(data)
            )
        
        return data
    
    def get_room_data_cached(self, room_id):
        """Get room data with caching"""
        cache_key = f"room_data:{room_id}"
        return self.get_cached_data(cache_key)
```

## 🔒 Security Considerations

### Authentication
- Use HTTPS for all API calls
- Implement API key authentication (if available)
- Secure database credentials

### Data Privacy
- Encrypt sensitive data
- Implement access controls
- Log access attempts

### Rate Limiting
- Respect API rate limits
- Implement client-side throttling
- Use appropriate request intervals

## 📞 Support and Troubleshooting

### Debug Information

```python
def debug_connection():
    """Debug connection issues"""
    print("=== DigitalTwin Connection Debug ===")
    
    # Test API connection
    try:
        client = DigitalTwinClient()
        data = client.get_current_data()
        if data:
            print("✅ API Connection: SUCCESS")
            print(f"   Devices: {data.get('total_devices', 0)}")
        else:
            print("❌ API Connection: FAILED")
    except Exception as e:
        print(f"❌ API Connection: ERROR - {e}")
    
    # Test database connection
    try:
        db = DigitalTwinDatabase()
        connection = db.connect()
        if connection:
            print("✅ Database Connection: SUCCESS")
            connection.close()
        else:
            print("❌ Database Connection: FAILED")
    except Exception as e:
        print(f"❌ Database Connection: ERROR - {e}")
    
    print("=== Debug Complete ===")

debug_connection()
```

### Contact Information
- **Repository:** https://github.com/kermanimohammad/DigitalTwin_SensorPlus
- **Documentation:** See PROJECT_DOCUMENTATION.md
- **API Endpoint:** https://digitaltwin-sensorplus-1.onrender.com/api/data

---

**Last Updated:** October 2025  
**Version:** 1.0  
**Status:** ✅ Production Ready  
**Target:** AI Systems and External Applications
