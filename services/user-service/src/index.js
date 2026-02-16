require('dotenv').config();
const express = require('express');
const cors = require('cors');
const client = require('prom-client');

const app = express();
const PORT = process.env.PORT || 3001;

// --- Prometheus Metrics ---
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestCounter = new client.Counter({
  name: 'user_service_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

const httpRequestDuration = new client.Histogram({
  name: 'user_service_http_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

module.exports = { httpRequestCounter, httpRequestDuration };

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Routes ---
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

// --- Health Check ---
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'user-service' });
});

// --- Metrics Endpoint (Prometheus scrapes this) ---
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.send(await register.metrics());
});

app.listen(PORT, () => {
  console.log(`User service running on port ${PORT}`);
});

module.exports = app;