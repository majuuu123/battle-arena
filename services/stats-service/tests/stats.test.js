'use strict';

const request = require('supertest');
const WebSocket = require('ws');

jest.mock('../src/db/database', () => ({
  query: jest.fn(),
}));

const pool = require('../src/db/database');

let server;

beforeAll(() => {
  server = require('../src/index');
});

afterAll((done) => {
  server.close(done);
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Stats Service API Routes', () => {

  describe('GET /stats/leaderboard', () => {
    it('should return top 10 players', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          { id: 1, username: 'hero', wins: 10, losses: 2, win_rate: 83.3 },
          { id: 2, username: 'villain', wins: 8, losses: 4, win_rate: 66.7 },
        ],
      });

      const res = await request(server).get('/stats/leaderboard');
      
      expect(res.status).toBe(200);
      expect(res.body.leaderboard).toBeDefined();
      expect(res.body.leaderboard.length).toBe(2);
      expect(res.body.leaderboard[0].username).toBe('hero');
    });

    it('should handle empty leaderboard', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(server).get('/stats/leaderboard');
      
      expect(res.status).toBe(200);
      expect(res.body.leaderboard).toEqual([]);
    });
  });

  describe('GET /stats/player/:userId', () => {
    it('should return 404 if player not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(server).get('/stats/player/999');
      
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Player not found');
    });

    it('should return player stats with recent battles', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          username: 'hero',
          wins: 10,
          losses: 2,
          attack: 15,
          defense: 8,
          hp: 100,
          win_rate: 83.3,
          created_at: new Date()
        }]
      });

      pool.query.mockResolvedValueOnce({
        rows: [
          { id: 1, winner_name: 'hero', won: true },
          { id: 2, winner_name: 'villain', won: false },
        ]
      });

      pool.query.mockResolvedValueOnce({
        rows: [{ rank: 1 }]
      });

      const res = await request(server).get('/stats/player/1');
      
      expect(res.status).toBe(200);
      expect(res.body.player).toBeDefined();
      expect(res.body.player.username).toBe('hero');
      expect(res.body.player.rank).toBe(1);
      expect(res.body.recentBattles).toBeDefined();
      expect(res.body.recentBattles.length).toBe(2);
    });
  });

  describe('POST /stats/refresh', () => {
    it('should trigger leaderboard broadcast', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          { id: 1, username: 'hero', wins: 10, losses: 2, win_rate: 83.3 },
        ]
      });

      const res = await request(server).post('/stats/refresh');
      
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Leaderboard refresh broadcasted');
      expect(res.body.connectedClients).toBeDefined();
    });
  });

  describe('GET /stats/websocket/clients', () => {
    it('should return number of connected clients', async () => {
      const res = await request(server).get('/stats/websocket/clients');
      
      expect(res.status).toBe(200);
      expect(res.body.connectedClients).toBeDefined();
      expect(typeof res.body.connectedClients).toBe('number');
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await request(server).get('/health');
      
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('stats-service');
      expect(res.body.websocketClients).toBeDefined();
    });
  });

});

describe('WebSocket Functionality', () => {
  
  it('should accept WebSocket connections', (done) => {
    const ws = new WebSocket('ws://localhost:3004/stats/live');

    ws.on('open', () => {
      expect(ws.readyState).toBe(WebSocket.OPEN);
      ws.close();
    });

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      expect(message.type).toBe('connected');
      done();
    });

    ws.on('error', (error) => {
      done(error);
    });
  });

  it('should broadcast messages to connected clients', (done) => {
    const ws1 = new WebSocket('ws://localhost:3004/stats/live');
    
    ws1.on('open', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 1, username: 'hero', wins: 10 }]
      });

      await request(server).post('/stats/refresh');
    });

    let messageCount = 0;
    ws1.on('message', (data) => {
      messageCount++;
      const message = JSON.parse(data.toString());
      
      if (message.type === 'leaderboard_update') {
        expect(message.data).toBeDefined();
        ws1.close();
        done();
      }
    });

    ws1.on('error', (error) => {
      done(error);
    });
  });

});