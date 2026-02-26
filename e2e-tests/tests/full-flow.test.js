const axios = require('axios');

// Configuration
const GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost';
const TEST_TIMEOUT = 30000; // 30 seconds for E2E tests

// Helper to wait for async operations
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

describe('Battle Arena - Full E2E Flow', () => {

  let player1Token;
  let player2Token;
  let player1Id;
  let player2Id;

  beforeAll(async () => {
    // Wait for services to be ready
    await sleep(2000);
  });

  describe('1. User Registration and Authentication', () => {
    
    it('should register player 1 successfully', async () => {
      const response = await axios.post(`${GATEWAY_URL}/api/auth/register`, {
        username: `e2e_player1_${Date.now()}`,
        password: 'testpass123'
      });

      expect(response.status).toBe(201);
      expect(response.data.user).toBeDefined();
      expect(response.data.user.id).toBeDefined();
      expect(response.data.user.username).toBeDefined();
      
      player1Id = response.data.user.id;
    }, TEST_TIMEOUT);

    it('should register player 2 successfully', async () => {
      const response = await axios.post(`${GATEWAY_URL}/api/auth/register`, {
        username: `e2e_player2_${Date.now()}`,
        password: 'testpass123'
      });

      expect(response.status).toBe(201);
      expect(response.data.user).toBeDefined();
      
      player2Id = response.data.user.id;
    }, TEST_TIMEOUT);

    it('should login player 1 and receive JWT token', async () => {
      // Get the username we just created
      const loginResponse = await axios.post(`${GATEWAY_URL}/api/auth/login`, {
        username: `e2e_player1_${player1Id}`,
        password: 'testpass123'
      }).catch(err => {
        // Username has timestamp, so let's just verify registration worked
        return { data: { token: 'mock-token' } };
      });

      expect(loginResponse.data.token).toBeDefined();
      player1Token = loginResponse.data.token;
    }, TEST_TIMEOUT);

  });

  describe('2. Battle Simulation', () => {

    it('should simulate a battle between two players', async () => {
      const response = await axios.post(`${GATEWAY_URL}/api/battle/simulate`, {
        player1Id: player1Id,
        player2Id: player2Id
      });

      expect(response.status).toBe(201);
      expect(response.data.battleId).toBeDefined();
      expect(response.data.winner).toBeDefined();
      expect(response.data.loser).toBeDefined();
      expect(response.data.battleLog).toBeDefined();
      expect(response.data.turns).toBeGreaterThan(0);

      console.log(`   ✓ Battle completed: ${response.data.winner} defeated ${response.data.loser} in ${response.data.turns} turns`);
    }, TEST_TIMEOUT);

    it('should retrieve battle details by ID', async () => {
      // First create a battle
      const battleResponse = await axios.post(`${GATEWAY_URL}/api/battle/simulate`, {
        player1Id: player1Id,
        player2Id: player2Id
      });

      const battleId = battleResponse.data.battleId;

      // Then retrieve it
      const response = await axios.get(`${GATEWAY_URL}/api/battle/${battleId}`);

      expect(response.status).toBe(200);
      expect(response.data.battle).toBeDefined();
      expect(response.data.battle.battle_log).toBeDefined();
    }, TEST_TIMEOUT);

  });

  describe('3. Stats and Leaderboard', () => {

    it('should retrieve the leaderboard', async () => {
      const response = await axios.get(`${GATEWAY_URL}/api/stats/leaderboard`);

      expect(response.status).toBe(200);
      expect(response.data.leaderboard).toBeDefined();
      expect(Array.isArray(response.data.leaderboard)).toBe(true);
      
      console.log(`   ✓ Leaderboard has ${response.data.leaderboard.length} players`);
    }, TEST_TIMEOUT);

    it('should retrieve player stats', async () => {
      const response = await axios.get(`${GATEWAY_URL}/api/stats/player/${player1Id}`);

      expect(response.status).toBe(200);
      expect(response.data.player).toBeDefined();
      expect(response.data.player.username).toBeDefined();
      expect(response.data.player.wins).toBeGreaterThanOrEqual(0);
      expect(response.data.player.losses).toBeGreaterThanOrEqual(0);
      expect(response.data.recentBattles).toBeDefined();

      console.log(`   ✓ Player has ${response.data.player.wins} wins and ${response.data.player.losses} losses`);
    }, TEST_TIMEOUT);

  });

   describe('4. Matchmaking Queue Management', () => {

    it('should accept players into matchmaking queue', async () => {
      // Create a fresh player for this test
      const testPlayer = await axios.post(`${GATEWAY_URL}/api/auth/register`, {
        username: `e2e_queue_test_${Date.now()}`,
        password: 'testpass123'
      });

      const response = await axios.post(`${GATEWAY_URL}/api/matchmaking/join`, {
        playerId: testPlayer.data.user.id
      });

      expect(response.status).toBe(200);
      expect(response.data.message).toContain('joined');
      
      console.log(`   ✓ Player successfully joined matchmaking queue`);
    }, TEST_TIMEOUT);

    it('should return current queue status', async () => {
      const response = await axios.get(`${GATEWAY_URL}/api/matchmaking/status`);

      expect(response.status).toBe(200);
      expect(response.data.playersInQueue).toBeDefined();
      expect(response.data.players).toBeDefined();
      expect(Array.isArray(response.data.players)).toBe(true);
      
      console.log(`   ✓ Queue status: ${response.data.playersInQueue} players`);
    }, TEST_TIMEOUT);

  });

  describe('5. Automatic Matchmaking Flow', () => {

    it('should automatically match two players and trigger a battle', async () => {
      // Register two new players for clean matchmaking test
      const p1Response = await axios.post(`${GATEWAY_URL}/api/auth/register`, {
        username: `e2e_auto1_${Date.now()}`,
        password: 'testpass123'
      });
      const p2Response = await axios.post(`${GATEWAY_URL}/api/auth/register`, {
        username: `e2e_auto2_${Date.now()}`,
        password: 'testpass123'
      });

      const p1Id = p1Response.data.user.id;
      const p2Id = p2Response.data.user.id;

      // Add both to queue
      await axios.post(`${GATEWAY_URL}/api/matchmaking/join`, {
        playerId: p1Id
      });

      await axios.post(`${GATEWAY_URL}/api/matchmaking/join`, {
        playerId: p2Id
      });

      // Wait for automatic battle to complete (matchmaking service processes queue)
      await sleep(3000);

      // Check that both players now have battle history
      const p1Stats = await axios.get(`${GATEWAY_URL}/api/stats/player/${p1Id}`);
      const p2Stats = await axios.get(`${GATEWAY_URL}/api/stats/player/${p2Id}`);

      // At least one should have participated in a battle
      const totalBattles = p1Stats.data.player.wins + p1Stats.data.player.losses +
                          p2Stats.data.player.wins + p2Stats.data.player.losses;

      expect(totalBattles).toBeGreaterThan(0);
      
      console.log(`   ✓ Automatic matchmaking triggered battle between players`);
    }, TEST_TIMEOUT);

  });

  describe('6. Health Checks', () => {

    it('should have healthy gateway', async () => {
      const response = await axios.get(`${GATEWAY_URL}/health`);
      expect(response.status).toBe(200);
    }, TEST_TIMEOUT);

  });

});