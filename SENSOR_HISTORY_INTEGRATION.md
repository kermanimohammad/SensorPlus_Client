# Sensor History Integration - DigitalTwin Project

## 📋 Overview

This document describes the integration of historical sensor data visualization capabilities into the DigitalTwin project. The integration allows users to view historical data charts for selected sensors by connecting to the MySQL database.

## 🏗️ Architecture

### New Components Added

1. **Database Client** (`src/database-client.ts`)
   - Handles MySQL database connections
   - Provides methods to fetch historical data for all sensor types
   - Manages connection state and error handling

2. **Chart Manager** (`src/chart-manager.ts`)
   - Creates and manages historical data visualization charts
   - Supports different chart types for different sensor types
   - Provides interactive chart controls (time range, refresh)

3. **Sensor History UI** (`src/sensor-history-ui.ts`)
   - Integrates historical data functionality into the existing UI
   - Adds database connection status indicator
   - Provides "Show History" button in sensor properties panel

## 🔗 Database Integration

### Connection Details
- **Host:** kbz.rew.mybluehost.me
- **Database:** kbzrewmy_sensor
- **User:** kbzrewmy_mo_kerma
- **Port:** 3306
- **SSL:** Disabled

### Available Tables
- `temperature_data` - Temperature sensor readings
- `humidity_data` - Humidity sensor readings
- `co2_data` - CO2 sensor readings
- `light_data` - Light sensor readings (on/off + power)
- `solar_data` - Solar panel readings (power, voltage, current)

### Data Structure
Each table contains:
- `id` - Primary key
- `device_id` - Sensor device identifier
- `room_id` - Room identifier (where applicable)
- `timestamp` - Reading timestamp
- `raw_data` - JSON metadata
- Sensor-specific value fields

## 🎯 User Interface Integration

### New UI Elements

1. **Database Status Indicator**
   - Located in the API panel
   - Shows connection status (Connected/Disconnected)
   - Provides connect/retry button

2. **Show History Button**
   - Added to sensor properties panel
   - Appears when a sensor is selected
   - Triggers historical data visualization

3. **Historical Data Chart Modal**
   - Full-screen modal overlay
   - Interactive chart with time range controls
   - Close button and refresh functionality

## 📊 Chart Features

### Supported Chart Types

1. **Value Charts** (Temperature, Humidity, CO2)
   - Line chart showing value over time
   - Interactive data points with tooltips
   - Proper axis labels and units

2. **Light Charts** (Planned)
   - Dual-axis chart showing on/off status and power consumption
   - Bar chart for power usage over time

3. **Solar Charts** (Planned)
   - Multi-line chart showing power, voltage, and current
   - Energy generation visualization

### Chart Controls

- **Time Range Selection:**
  - Last 1 hour
  - Last 6 hours
  - Last 24 hours (default)
  - Last 3 days
  - Last week

- **Interactive Features:**
  - Hover tooltips on data points
  - Refresh button for real-time updates
  - Responsive design

## 🔧 Technical Implementation

### Database Client Methods

```typescript
// Connect to database
await databaseClient.connect()

// Get historical data
const data = await databaseClient.getSensorHistory(deviceId, sensorType, hours)

// Get available devices
const devices = await databaseClient.getAvailableDevices(sensorType)

// Test connection
const isConnected = await databaseClient.testConnection()
```

### Chart Manager Methods

```typescript
// Show sensor history
await chartManager.showSensorHistory(deviceId, sensorType, hours)

// Create chart container
chartManager.createChartContainer()

// Destroy chart
chartManager.destroyChart()
```

### UI Integration Methods

```typescript
// Initialize UI components
sensorHistoryUI.initialize()

// Show history for selected sensor
sensorHistoryUI.showSensorHistory()

// Show history for specific device
await sensorHistoryUI.showDeviceHistory(deviceId, sensorType, hours)
```

## 🚀 Usage Instructions

### For End Users

1. **Connect to Database:**
   - Look for "Database: Disconnected" in the API panel
   - Click "Connect" button
   - Wait for "Database: Connected" status

2. **View Sensor History:**
   - Select a sensor in the 3D scene
   - In the properties panel, click "📊 Show History"
   - Choose time range and view the chart
   - Close chart when done

3. **Available Sensors:**
   - Temperature: temp-1 to temp-5
   - Humidity: hum-1 to hum-5
   - CO2: co2-1 to co2-5
   - Light: light-1 to light-5
   - Solar: solar-plant

### For Developers

1. **Adding New Chart Types:**
   - Extend `ChartManager` class
   - Add new render methods for specific sensor types
   - Update chart configuration

2. **Database Schema Changes:**
   - Update `DatabaseClient` methods
   - Modify data type interfaces
   - Test with new table structures

3. **UI Customization:**
   - Modify `SensorHistoryUI` for different layouts
   - Update chart styling in `ChartManager`
   - Add new control elements

## 🔒 Security Considerations

- Database credentials are stored in the client code (not recommended for production)
- Consider implementing server-side API for database access
- Add authentication and authorization layers
- Implement rate limiting for database queries

## 🐛 Error Handling

### Common Issues

1. **Database Connection Failed:**
   - Check network connectivity
   - Verify database credentials
   - Ensure database server is running

2. **No Data Available:**
   - Verify device ID exists in database
   - Check time range selection
   - Ensure sensor is actively recording data

3. **Chart Rendering Issues:**
   - Check browser console for errors
   - Verify data format compatibility
   - Test with different time ranges

### Error Messages

- "Database not connected" - Connection required
- "Device not found" - Invalid device ID
- "No data available" - Empty dataset
- "Connection failed" - Network/database issues

## 📈 Performance Considerations

### Optimization Strategies

1. **Data Fetching:**
   - Limit query results with time ranges
   - Use database indexes on timestamp fields
   - Implement data pagination for large datasets

2. **Chart Rendering:**
   - Limit data points for smooth rendering
   - Use efficient SVG rendering
   - Implement chart virtualization for large datasets

3. **Memory Management:**
   - Clean up chart resources when closed
   - Limit concurrent database connections
   - Implement proper error recovery

## 🔮 Future Enhancements

### Planned Features

1. **Advanced Chart Types:**
   - Heat maps for multiple sensors
   - Statistical analysis overlays
   - Export functionality (PNG, CSV)

2. **Real-time Updates:**
   - Live chart updates
   - WebSocket integration
   - Push notifications for anomalies

3. **Analytics Features:**
   - Trend analysis
   - Anomaly detection
   - Predictive modeling

4. **UI Improvements:**
   - Multiple chart windows
   - Chart comparison tools
   - Customizable dashboards

## 📝 Testing

### Test Scenarios

1. **Database Connection:**
   - Test successful connection
   - Test connection failure handling
   - Test reconnection after failure

2. **Data Retrieval:**
   - Test all sensor types
   - Test different time ranges
   - Test with empty datasets

3. **Chart Rendering:**
   - Test chart display
   - Test interactive features
   - Test responsive design

4. **UI Integration:**
   - Test button functionality
   - Test status indicators
   - Test error handling

## 📚 Dependencies

### New Dependencies Added

- `mysql2` - MySQL database client for Node.js
- No additional UI libraries (using native SVG)

### Existing Dependencies Used

- `@babylonjs/core` - 3D scene management
- Native DOM APIs - UI manipulation
- Fetch API - HTTP requests

## 🎉 Conclusion

The sensor history integration successfully adds historical data visualization capabilities to the DigitalTwin project. Users can now:

- Connect to the MySQL database containing sensor data
- View historical charts for any selected sensor
- Analyze data trends over different time periods
- Monitor sensor performance and patterns

The implementation is modular, extensible, and maintains compatibility with the existing codebase. Future enhancements can be easily added to provide more advanced analytics and visualization features.

---

**Last Updated:** October 2025  
**Version:** 1.0  
**Status:** ✅ Ready for Testing  
**Integration:** Complete
