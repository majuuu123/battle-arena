'use strict';

const express = require('express');
const pool = require('../db/database');
const queueManager = require('../queue/manager');
const { httpRequestCounter, httpRequestDuration } = require('../index');

const router = express.Router();

router.post('/join', async (req, res) => {
  const end = httpRequestDuration.startTimer();
  try {
    const { playerId } = req.body;

    if (!playerId) {
      httpRequestCounter.inc({ method: 'POST', route: '/join', status: 400 });
      return res.status(400).json({ error: 'playerId is required' });
    }

    const result = await pool.query(
      'SELECT id, username FROM users WHERE id = $1',
      [playerId]
    );

    if (result.rows.length === 0) {
      httpRequestCounter.inc({ method: 'POST', route: '/join', status: 404 });
      return res.status(404).json({ error: 'Player not found' });
    }

    const player = result.rows[0];

    const queueResult = await queueManager.addPlayerToQueue(player.id, player.username);

    if (!queueResult.success) {
      httpRequestCounter.inc({ method: 'POST', route: '/join', status: 409 });
      return res.status(409).json({ error: queueResult.message });
    }

    httpRequestCounter.inc({ method: 'POST', route: '/join', status: 200 });
    end({ method: 'POST', route: '/join', status: 200 });

    res.json({
      message: 'Successfully joined matchmaking queue',
      queuePosition: queueResult.queuePosition,
      playersInQueue: queueResult.playersInQueue
    });

  } catch (err) {
    console.error(err);
    httpRequestCounter.inc({ method: 'POST', route: '/join', status: 500 });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/leave', async (req, res) => {
  const end = httpRequestDuration.startTimer();
  try {
    const { playerId } = req.body;

    if (!playerId) {
      httpRequestCounter.inc({ method: 'DELETE', route: '/leave', status: 400 });
      return res.status(400).json({ error: 'playerId is required' });
    }

    const result = await queueManager.removePlayerFromQueue(playerId);

    if (!result.success) {
      httpRequestCounter.inc({ method: 'DELETE', route: '/leave', status: 404 });
      return res.status(404).json({ error: result.message });
    }

    httpRequestCounter.inc({ method: 'DELETE', route: '/leave', status: 200 });
    end({ method: 'DELETE', route: '/leave', status: 200 });

    res.json({
      message: 'Successfully left matchmaking queue',
      playersInQueue: result.playersInQueue
    });

  } catch (err) {
    console.error(err);
    httpRequestCounter.inc({ method: 'DELETE', route: '/leave', status: 500 });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/status', (req, res) => {
  const end = httpRequestDuration.startTimer();
  try {
    const status = queueManager.getQueueStatus();

    httpRequestCounter.inc({ method: 'GET', route: '/status', status: 200 });
    end({ method: 'GET', route: '/status', status: 200 });

    res.json(status);

  } catch (err) {
    console.error(err);
    httpRequestCounter.inc({ method: 'GET', route: '/status', status: 500 });
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;