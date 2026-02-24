'use strict';

const request = require('supertest');

// Mock dependencies BEFORE any imports
jest.mock('../src/db/database', () => ({
  query: jest.fn(),
}));

jest.mock('../src/queue/manager', () => ({
  connect: jest.fn().mockResolvedValue(true),
  addPlayerToQueue: jest.fn(),
  removePlayerFromQueue: jest.fn(),
  getQueueStatus: jest.fn().mockReturnValue({
    playersInQueue: 0,
    players: []
  }),
  close: jest.fn(),
}));

const pool = require('../src/db/database');
const queueManager = require('../src/queue/manager');

let app;

beforeAll(async () => {
  // Create a minimal express app for testing without importing the real index.js
  const express = require('express');
  const cors = require('cors');
  
  app = express();
  app.use(cors());
  app.use(express.json());
  app.disable('x-powered-by');

  // Mock the metrics exports that routes expect
  jest.mock('../src/index', () => ({
    httpRequestCounter: { inc: jest.fn() },
    httpRequestDuration: { startTimer: jest.fn(() => jest.fn()) }
  }), { virtual: true });

  const matchmakingRoutes = require('../src/routes/matchmaking');
  app.use('/matchmaking', matchmakingRoutes);

  app.get('/health', (req, res) => {
    const queueStatus = queueManager.getQueueStatus();
    res.json({ 
      status: 'ok', 
      service: 'matchmaking-service',
      playersInQueue: queueStatus.playersInQueue
    });
  });
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Matchmaking Service API Routes', () => {

  describe('POST /matchmaking/join', () => {
    it('should return 400 if playerId is missing', async () => {
      const res = await request(app)
        .post('/matchmaking/join')
        .send({});
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('playerId is required');
    });

    it('should return 404 if player not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/matchmaking/join')
        .send({ playerId: 999 });
      
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Player not found');
    });

    it('should successfully add player to queue', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 1, username: 'hero' }]
      });

      queueManager.addPlayerToQueue.mockResolvedValueOnce({
        success: true,
        queuePosition: 1,
        playersInQueue: 1
      });

      const res = await request(app)
        .post('/matchmaking/join')
        .send({ playerId: 1 });
      
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Successfully joined matchmaking queue');
      expect(res.body.queuePosition).toBe(1);
      expect(res.body.playersInQueue).toBe(1);
    });

    it('should return 409 if player already in queue', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 1, username: 'hero' }]
      });

      queueManager.addPlayerToQueue.mockResolvedValueOnce({
        success: false,
        message: 'Player already in queue'
      });

      const res = await request(app)
        .post('/matchmaking/join')
        .send({ playerId: 1 });
      
      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Player already in queue');
    });
  });

  describe('DELETE /matchmaking/leave', () => {
    it('should return 400 if playerId is missing', async () => {
      const res = await request(app)
        .delete('/matchmaking/leave')
        .send({});
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('playerId is required');
    });

    it('should return 404 if player not in queue', async () => {
      queueManager.removePlayerFromQueue.mockResolvedValueOnce({
        success: false,
        message: 'Player not in queue'
      });

      const res = await request(app)
        .delete('/matchmaking/leave')
        .send({ playerId: 1 });
      
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Player not in queue');
    });

    it('should successfully remove player from queue', async () => {
      queueManager.removePlayerFromQueue.mockResolvedValueOnce({
        success: true,
        playersInQueue: 0
      });

      const res = await request(app)
        .delete('/matchmaking/leave')
        .send({ playerId: 1 });
      
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Successfully left matchmaking queue');
      expect(res.body.playersInQueue).toBe(0);
    });
  });

  describe('GET /matchmaking/status', () => {
    it('should return queue status', async () => {
      queueManager.getQueueStatus.mockReturnValueOnce({
        playersInQueue: 2,
        players: [
          { playerId: 1, username: 'hero', joinedAt: new Date().toISOString() },
          { playerId: 2, username: 'villain', joinedAt: new Date().toISOString() }
        ]
      });

      const res = await request(app).get('/matchmaking/status');
      
      expect(res.status).toBe(200);
      expect(res.body.playersInQueue).toBe(2);
      expect(res.body.players.length).toBe(2);
      expect(res.body.players[0].username).toBe('hero');
    });

    it('should return empty queue status', async () => {
      queueManager.getQueueStatus.mockReturnValueOnce({
        playersInQueue: 0,
        players: []
      });

      const res = await request(app).get('/matchmaking/status');
      
      expect(res.status).toBe(200);
      expect(res.body.playersInQueue).toBe(0);
      expect(res.body.players).toEqual([]);
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      queueManager.getQueueStatus.mockReturnValueOnce({
        playersInQueue: 1,
        players: []
      });

      const res = await request(app).get('/health');
      
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('matchmaking-service');
      expect(res.body.playersInQueue).toBe(1);
    });
  });

});

describe('Queue Manager Logic', () => {
  
  it('should have required methods', () => {
    expect(queueManager.addPlayerToQueue).toBeDefined();
    expect(queueManager.removePlayerFromQueue).toBeDefined();
    expect(queueManager.getQueueStatus).toBeDefined();
  });

});