'use strict';

const MAX_TURNS = 10;

function calculateDamage(attacker, defender) {
  const baseDamage = attacker.attack - Math.floor(defender.defense / 2);
  // NOSONAR: Math.random() is intentional here - used for game combat
  // randomness only, not for security or cryptographic purposes
  const randomBonus = Math.floor(Math.random() * 6) + 1;
  return Math.max(1, baseDamage + randomBonus);
}

function simulateBattle(player1, player2) {
  const p1 = { ...player1, currentHp: player1.hp };
  const p2 = { ...player2, currentHp: player2.hp };

  const log = [];
  let turn = 1;

  log.push(`⚔️  Battle starts: ${p1.username} vs ${p2.username}`);
  log.push(`${p1.username} - HP: ${p1.currentHp} | ATK: ${p1.attack} | DEF: ${p1.defense}`);
  log.push(`${p2.username} - HP: ${p2.currentHp} | ATK: ${p2.attack} | DEF: ${p2.defense}`);
  log.push('─────────────────────────────────');

  while (p1.currentHp > 0 && p2.currentHp > 0 && turn <= MAX_TURNS) {
    const damage1 = calculateDamage(p1, p2);
    p2.currentHp = Math.max(0, p2.currentHp - damage1);
    log.push(`Turn ${turn}: ${p1.username} attacks ${p2.username} for ${damage1} damage! (${p2.username} HP: ${p2.currentHp})`);

    if (p2.currentHp <= 0) break;

    const damage2 = calculateDamage(p2, p1);
    p1.currentHp = Math.max(0, p1.currentHp - damage2);
    log.push(`Turn ${turn}: ${p2.username} attacks ${p1.username} for ${damage2} damage! (${p1.username} HP: ${p1.currentHp})`);

    turn++;
  }

  let winner;
  if (p1.currentHp > p2.currentHp) {
    winner = player1;
  } else if (p2.currentHp > p1.currentHp) {
    winner = player2;
  } else {
    winner = player1;
  }

  log.push('─────────────────────────────────');
  log.push(`🏆 ${winner.username} wins the battle!`);

  return {
    winner,
    loser: winner.id === player1.id ? player2 : player1,
    battleLog: log.join('\n'),
    turns: turn,
    finalHp: {
      player1: p1.currentHp,
      player2: p2.currentHp,
    },
  };
}

module.exports = { simulateBattle, calculateDamage, MAX_TURNS };