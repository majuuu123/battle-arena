'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const client = require('prom-client');
const wsManager = require('./websocket/manager');

const app = express();
const PORT = process.env.PORT || 3004;

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestCounter = new client.Counter({
  name: 'stats_service_http_requests_total',
  help: 'Total HTTP requests to stats service',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

const httpRequestDuration = new client.Histogram({
  name: 'stats_service_http_duration_seconds',
  help: 'HTTP request duration in stats service',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

const websocketConnectionsGauge = new client.Gauge({
  name: 'stats_service_websocket_connections',
  help: 'Number of active WebSocket connections',
  registers: [register],
  collect() {
    this.set(wsManager.getConnectedClientsCount());
  }
});

module.exports = { httpRequestCounter, httpRequestDuration };

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.disable('x-powered-by');

const statsRoutes = require('./routes/stats');
app.use('/stats', statsRoutes);

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'stats-service',
    websocketClients: wsManager.getConnectedClientsCount()
  });
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.send(await register.metrics());
});

const server = http.createServer(app);

wsManager.initialize(server);

server.listen(PORT, () => {
  console.log(`Stats service running on port ${PORT}`);
  console.log(`WebSocket available at ws://localhost:${PORT}/stats/live`);
});

module.exports = server;