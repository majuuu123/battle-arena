'use strict';

const request = require('supertest');
const server = require('../src/index');

jest.mock('../src/db/database', () => ({
  query: jest.fn(),
}));

const pool = require('../src/db/database');

afterAll((done) => {
  server.close(done);
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Combat Engine', () => {
  const { simulateBattle, calculateDamage } = require('../src/engine/combat');

  describe('calculateDamage', () => {
    it('should always return at least 1 damage', () => {
      const damage = calculateDamage({ attack: 1 }, { defense: 100 });
      expect(damage).toBeGreaterThanOrEqual(1);
    });

    it('should return higher average damage for stronger attackers', () => {
      let strongTotal = 0;
      let weakTotal = 0;
      for (let i = 0; i < 100; i++) {
        strongTotal += calculateDamage({ attack: 50 }, { defense: 2 });
        weakTotal += calculateDamage({ attack: 5 }, { defense: 2 });
      }
      expect(strongTotal).toBeGreaterThan(weakTotal);
    });
  });

  describe('simulateBattle', () => {
    const p1 = { id: 1, username: 'Hero', attack: 15, defense: 8, hp: 100 };
    const p2 = { id: 2, username: 'Villain', attack: 12, defense: 6, hp: 100 };

    it('should return a winner', () => {
      const result = simulateBattle(p1, p2);
      expect(result.winner).toBeDefined();
    });

    it('should return a loser different from winner', () => {
      const result = simulateBattle(p1, p2);
      expect(result.loser.id).not.toBe(result.winner.id);
    });

    it('should return a battle log with start and end', () => {
      const result = simulateBattle(p1, p2);
      expect(result.battleLog).toContain('Battle starts');
      expect(result.battleLog).toContain('wins the battle');
    });

    it('should not mutate original player objects', () => {
      const originalHp = p1.hp;
      simulateBattle(p1, p2);
      expect(p1.hp).toBe(originalHp);
    });

    it('should return final HP values above or equal to zero', () => {
      const result = simulateBattle(p1, p2);
      expect(result.finalHp.player1).toBeGreaterThanOrEqual(0);
      expect(result.finalHp.player2).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('Battle API Routes', () => {

  describe('POST /battle/simulate', () => {
    it('should return 400 if player IDs missing', async () => {
      const res = await request(server).post('/battle/simulate').send({});
      expect(res.status).toBe(400);
    });

    it('should return 400 if same player battles themselves', async () => {
      const res = await request(server)
        .post('/battle/simulate')
        .send({ player1Id: 1, player2Id: 1 });
      expect(res.status).toBe(400);
    });

    it('should return 404 if players not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      const res = await request(server)
        .post('/battle/simulate')
        .send({ player1Id: 99, player2Id: 100 });
      expect(res.status).toBe(404);
    });

    it('should simulate battle and return result', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          { id: 1, username: 'Hero', attack: 15, defense: 8, hp: 100 },
          { id: 2, username: 'Villain', attack: 12, defense: 6, hp: 100 },
        ],
      });
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1, created_at: new Date() }] });
      pool.query.mockResolvedValueOnce({ rows: [] });
      pool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(server)
        .post('/battle/simulate')
        .send({ player1Id: 1, player2Id: 2 });

      expect(res.status).toBe(201);
      expect(res.body.winner).toBeDefined();
      expect(res.body.battleLog).toBeDefined();
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await request(server).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });
});