const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/database');
const { httpRequestCounter, httpRequestDuration } = require('../index');

const router = express.Router();

// POST /auth/register
router.post('/register', async (req, res) => {
  const end = httpRequestDuration.startTimer();
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      httpRequestCounter.inc({ method: 'POST', route: '/register', status: 400 });
      return res.status(400).json({ error: 'Username and password required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, attack, defense, hp',
      [username, hashedPassword]
    );

    httpRequestCounter.inc({ method: 'POST', route: '/register', status: 201 });
    end({ method: 'POST', route: '/register', status: 201 });
    res.status(201).json({ user: result.rows[0] });

  } catch (err) {
    if (err.code === '23505') {
      httpRequestCounter.inc({ method: 'POST', route: '/register', status: 409 });
      return res.status(409).json({ error: 'Username already exists' });
    }
    console.error(err);
    httpRequestCounter.inc({ method: 'POST', route: '/register', status: 500 });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const end = httpRequestDuration.startTimer();
  try {
    const { username, password } = req.body;

    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      httpRequestCounter.inc({ method: 'POST', route: '/login', status: 401 });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      httpRequestCounter.inc({ method: 'POST', route: '/login', status: 401 });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    httpRequestCounter.inc({ method: 'POST', route: '/login', status: 200 });
    end({ method: 'POST', route: '/login', status: 200 });
    res.json({ token, user: { id: user.id, username: user.username } });

  } catch (err) {
    console.error(err);
    httpRequestCounter.inc({ method: 'POST', route: '/login', status: 500 });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /auth/profile
router.get('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query(
      'SELECT id, username, attack, defense, hp, wins, losses FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;