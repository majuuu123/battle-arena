'use strict';

const express = require('express');
const pool = require('../db/database');
const wsManager = require('../websocket/manager');
const { httpRequestCounter, httpRequestDuration } = require('../index');

const router = express.Router();

router.get('/leaderboard', async (req, res) => {
  const end = httpRequestDuration.startTimer();
  try {
    const result = await pool.query(
      `SELECT id, username, wins, losses, attack, defense, hp,
              CASE WHEN (wins + losses) > 0 
                   THEN ROUND((wins::numeric / (wins + losses)) * 100, 1)
                   ELSE 0 
              END as win_rate
       FROM users
       ORDER BY wins DESC, win_rate DESC
       LIMIT 10`
    );

    httpRequestCounter.inc({ method: 'GET', route: '/leaderboard', status: 200 });
    end({ method: 'GET', route: '/leaderboard', status: 200 });
    
    res.json({ 
      leaderboard: result.rows,
      lastUpdated: new Date().toISOString()
    });

  } catch (err) {
    console.error(err);
    httpRequestCounter.inc({ method: 'GET', route: '/leaderboard', status: 500 });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/player/:userId', async (req, res) => {
  const end = httpRequestDuration.startTimer();
  try {
    const { userId } = req.params;

    const playerResult = await pool.query(
      `SELECT id, username, wins, losses, attack, defense, hp, created_at,
              CASE WHEN (wins + losses) > 0 
                   THEN ROUND((wins::numeric / (wins + losses)) * 100, 1)
                   ELSE 0 
              END as win_rate
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (playerResult.rows.length === 0) {
      httpRequestCounter.inc({ method: 'GET', route: '/player/:userId', status: 404 });
      return res.status(404).json({ error: 'Player not found' });
    }

    const player = playerResult.rows[0];

    const battlesResult = await pool.query(
      `SELECT b.id, b.created_at,
              u1.username as player1_name,
              u2.username as player2_name,
              uw.username as winner_name,
              CASE WHEN b.winner_id = $1 THEN true ELSE false END as won
       FROM battles b
       JOIN users u1 ON b.player1_id = u1.id
       JOIN users u2 ON b.player2_id = u2.id
       JOIN users uw ON b.winner_id = uw.id
       WHERE b.player1_id = $1 OR b.player2_id = $1
       ORDER BY b.created_at DESC
       LIMIT 10`,
      [userId]
    );

    const rankResult = await pool.query(
      `SELECT COUNT(*) + 1 as rank
       FROM users
       WHERE wins > (SELECT wins FROM users WHERE id = $1)`,
      [userId]
    );

    httpRequestCounter.inc({ method: 'GET', route: '/player/:userId', status: 200 });
    end({ method: 'GET', route: '/player/:userId', status: 200 });

    res.json({
      player: {
        ...player,
        rank: parseInt(rankResult.rows[0].rank),
        totalBattles: player.wins + player.losses
      },
      recentBattles: battlesResult.rows
    });

  } catch (err) {
    console.error(err);
    httpRequestCounter.inc({ method: 'GET', route: '/player/:userId', status: 500 });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, wins, losses,
              CASE WHEN (wins + losses) > 0 
                   THEN ROUND((wins::numeric / (wins + losses)) * 100, 1)
                   ELSE 0 
              END as win_rate
       FROM users
       ORDER BY wins DESC, win_rate DESC
       LIMIT 10`
    );

    wsManager.broadcastLeaderboard(result.rows);

    res.json({ 
      message: 'Leaderboard refresh broadcasted',
      connectedClients: wsManager.getConnectedClientsCount()
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/websocket/clients', (req, res) => {
  res.json({ 
    connectedClients: wsManager.getConnectedClientsCount()
  });
});

module.exports = router;