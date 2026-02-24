'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const client = require('prom-client');
const queueManager = require('./queue/manager');

const app = express();
const PORT = process.env.PORT || 3003;

// --- Prometheus Metrics ---
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestCounter = new client.Counter({
  name: 'matchmaking_service_http_requests_total',
  help: 'Total HTTP requests to matchmaking service',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

const httpRequestDuration = new client.Histogram({
  name: 'matchmaking_service_http_duration_seconds',
  help: 'HTTP request duration in matchmaking service',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

const queueSizeGauge = new client.Gauge({
  name: 'matchmaking_service_queue_size',
  help: 'Number of players in matchmaking queue',
  registers: [register],
  collect() {
    const status = queueManager.getQueueStatus();
    this.set(status.playersInQueue);
  }
});

module.exports = { httpRequestCounter, httpRequestDuration };

// --- Middleware ---
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.disable('x-powered-by');

// --- Routes ---
const matchmakingRoutes = require('./routes/matchmaking');
app.use('/matchmaking', matchmakingRoutes);

// --- Health Check ---
app.get('/health', (req, res) => {
  const queueStatus = queueManager.getQueueStatus();
  res.json({ 
    status: 'ok', 
    service: 'matchmaking-service',
    playersInQueue: queueStatus.playersInQueue
  });
});

// --- Metrics Endpoint ---
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.send(await register.metrics());
});

// --- Initialize RabbitMQ and Start Server ---
async function start() {
  try {
    await queueManager.connect();

    const server = app.listen(PORT, () => {
      console.log(`Matchmaking service running on port ${PORT}`);
    });

    process.on('SIGINT', async () => {
      console.log('\nShutting down gracefully...');
      await queueManager.close();
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

    module.exports = server;

  } catch (error) {
    console.error('Failed to start matchmaking service:', error);
    process.exit(1);
  }
}

start();