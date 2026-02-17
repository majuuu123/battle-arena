'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const client = require('prom-client');

const app = express();
const PORT = process.env.PORT || 3002;

// --- Prometheus Metrics ---
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestCounter = new client.Counter({
  name: 'battle_service_http_requests_total',
  help: 'Total HTTP requests to battle service',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

const httpRequestDuration = new client.Histogram({
  name: 'battle_service_http_duration_seconds',
  help: 'HTTP request duration in battle service',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

module.exports = { httpRequestCounter, httpRequestDuration };

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Routes ---
const battleRoutes = require('./routes/battle');
app.use('/battle', battleRoutes);

// --- Health Check ---
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'battle-service' });
});

// --- Metrics Endpoint ---
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.send(await register.metrics());
});

const server = app.listen(PORT, () => {
  console.log(`Battle service running on port ${PORT}`);
});

module.exports = server;