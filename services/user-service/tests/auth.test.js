const request = require('supertest');
const app = require('../src/index');

// Mock the database so tests don't need a real PostgreSQL
jest.mock('../src/db/database', () => ({
  query: jest.fn(),
}));

const pool = require('../src/db/database');

describe('Auth Routes', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should return 400 if username or password missing', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ username: 'testuser' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Username and password required');
    });

    it('should register a new user successfully', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 1, username: 'testuser', attack: 10, defense: 5, hp: 100 }]
      });

      const res = await request(app)
        .post('/auth/register')
        .send({ username: 'testuser', password: 'password123' });

      expect(res.status).toBe(201);
      expect(res.body.user.username).toBe('testuser');
    });

    it('should return 409 if username already exists', async () => {
      pool.query.mockRejectedValueOnce({ code: '23505' });

      const res = await request(app)
        .post('/auth/register')
        .send({ username: 'existinguser', password: 'password123' });

      expect(res.status).toBe(409);
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

});