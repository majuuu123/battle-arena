import React, { useState, useEffect } from 'react';
import axios from 'axios';

function BattleArena({ user, apiUrl }) {
  const [players, setPlayers] = useState([]);
  const [selectedOpponent, setSelectedOpponent] = useState('');
  const [battleResult, setBattleResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/stats/leaderboard`);
      // Filter out current user
      const otherPlayers = response.data.leaderboard.filter(p => p.id !== user.id);
      setPlayers(otherPlayers);
    } catch (err) {
      setError('Failed to load players');
    }
  };

  const handleBattle = async () => {
    if (!selectedOpponent) {
      setError('Please select an opponent');
      return;
    }

    setLoading(true);
    setError('');
    setBattleResult(null);

    try {
      const response = await axios.post(`${apiUrl}/api/battle/simulate`, {
        player1Id: user.id,
        player2Id: parseInt(selectedOpponent)
      });

      setBattleResult(response.data);
    } catch (err) {
      setError('Battle failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="card">
        <h2>⚔️ Battle Arena</h2>
        <p style={{ color: '#666', marginBottom: '2rem' }}>
          Choose your opponent and engage in combat!
        </p>

        {error && <div className="error">{error}</div>}

        <div className="form-group">
          <label>Select Opponent</label>
          <select 
            value={selectedOpponent}
            onChange={(e) => setSelectedOpponent(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '0.75rem', 
              border: '2px solid #e0e0e0',
              borderRadius: '5px',
              fontSize: '1rem'
            }}
          >
            <option value="">-- Choose an opponent --</option>
            {players.map(player => (
              <option key={player.id} value={player.id}>
                {player.username} (Wins: {player.wins}, Losses: {player.losses})
              </option>
            ))}
          </select>
        </div>

        <button 
          onClick={handleBattle} 
          className="btn-primary"
          disabled={loading || !selectedOpponent}
        >
          {loading ? 'Fighting...' : '⚔️ Start Battle!'}
        </button>
      </div>

      {battleResult && (
        <div className="card">
          <h3>
            {battleResult.winner === user.username ? '🎉 Victory!' : '💀 Defeat!'}
          </h3>
          <p style={{ fontSize: '1.2rem', margin: '1rem 0' }}>
            <strong>{battleResult.winner}</strong> defeated <strong>{battleResult.loser}</strong> in {battleResult.turns} turns!
          </p>

          <div className="battle-log">
            {battleResult.battleLog}
          </div>

          <button 
            onClick={() => setBattleResult(null)}
            className="btn-secondary"
            style={{ marginTop: '1rem' }}
          >
            Close Battle Log
          </button>
        </div>
      )}
    </div>
  );
}

export default BattleArena;