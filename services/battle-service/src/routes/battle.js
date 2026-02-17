'use strict';

const express = require('express');
const { simulateBattle } = require('../engine/combat');
const pool = require('../db/database');
const { httpRequestCounter, httpRequestDuration } = require('../index');

const router = express.Router();

// POST /battle/simulate
router.post('/simulate', async (req, res) => {
  const end = httpRequestDuration.startTimer();
  try {
    const { player1Id, player2Id } = req.body;

    if (!player1Id || !player2Id) {
      httpRequestCounter.inc({ method: 'POST', route: '/simulate', status: 400 });
      return res.status(400).json({ error: 'player1Id and player2Id are required' });
    }

    if (player1Id === player2Id) {
      httpRequestCounter.inc({ method: 'POST', route: '/simulate', status: 400 });
      return res.status(400).json({ error: 'Players must be different' });
    }

    const result = await pool.query(
      'SELECT id, username, attack, defense, hp FROM users WHERE id = ANY($1)',
      [[player1Id, player2Id]]
    );

    if (result.rows.length !== 2) {
      httpRequestCounter.inc({ method: 'POST', route: '/simulate', status: 404 });
      return res.status(404).json({ error: 'One or both players not found' });
    }

    const player1 = result.rows.find(p => p.id === parseInt(player1Id));
    const player2 = result.rows.find(p => p.id === parseInt(player2Id));

    const battleResult = simulateBattle(player1, player2);

    const battleRecord = await pool.query(
      `INSERT INTO battles (player1_id, player2_id, winner_id, battle_log)
       VALUES ($1, $2, $3, $4)
       RETURNING id, created_at`,
      [player1.id, player2.id, battleResult.winner.id, battleResult.battleLog]
    );

    await pool.query('UPDATE users SET wins = wins + 1 WHERE id = $1', [battleResult.winner.id]);
    await pool.query('UPDATE users SET losses = losses + 1 WHERE id = $1', [battleResult.loser.id]);

    httpRequestCounter.inc({ method: 'POST', route: '/simulate', status: 201 });
    end({ method: 'POST', route: '/simulate', status: 201 });

    res.status(201).json({
      battleId: battleRecord.rows[0].id,
      winner: battleResult.winner.username,
      loser: battleResult.loser.username,
      turns: battleResult.turns,
      finalHp: battleResult.finalHp,
      battleLog: battleResult.battleLog,
      createdAt: battleRecord.rows[0].created_at,
    });

  } catch (err) {
    console.error(err);
    httpRequestCounter.inc({ method: 'POST', route: '/simulate', status: 500 });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /battle/:id
router.get('/:id', async (req, res) => {
  const end = httpRequestDuration.startTimer();
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT b.id, b.battle_log, b.created_at,
              u1.username as player1_name,
              u2.username as player2_name,
              uw.username as winner_name
       FROM battles b
       JOIN users u1 ON b.player1_id = u1.id
       JOIN users u2 ON b.player2_id = u2.id
       JOIN users uw ON b.winner_id = uw.id
       WHERE b.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      httpRequestCounter.inc({ method: 'GET', route: '/battle/:id', status: 404 });
      return res.status(404).json({ error: 'Battle not found' });
    }

    httpRequestCounter.inc({ method: 'GET', route: '/battle/:id', status: 200 });
    end({ method: 'GET', route: '/battle/:id', status: 200 });
    res.json({ battle: result.rows[0] });

  } catch (err) {
    console.error(err);
    httpRequestCounter.inc({ method: 'GET', route: '/battle/:id', status: 500 });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /battle/history/:userId
router.get('/history/:userId', async (req, res) => {
  const end = httpRequestDuration.startTimer();
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `SELECT b.id, b.created_at,
              u1.username as player1_name,
              u2.username as player2_name,
              uw.username as winner_name
       FROM battles b
       JOIN users u1 ON b.player1_id = u1.id
       JOIN users u2 ON b.player2_id = u2.id
       JOIN users uw ON b.winner_id = uw.id
       WHERE b.player1_id = $1 OR b.player2_id = $1
       ORDER BY b.created_at DESC
       LIMIT 20`,
      [userId]
    );

    httpRequestCounter.inc({ method: 'GET', route: '/history/:userId', status: 200 });
    end({ method: 'GET', route: '/history/:userId', status: 200 });
    res.json({ battles: result.rows });

  } catch (err) {
    console.error(err);
    httpRequestCounter.inc({ method: 'GET', route: '/history/:userId', status: 500 });
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;