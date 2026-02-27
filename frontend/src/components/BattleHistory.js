import React, { useState, useEffect } from 'react';
import axios from 'axios';

function BattleHistory({ user, apiUrl }) {
  const [battles, setBattles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBattle, setSelectedBattle] = useState(null);

  useEffect(() => {
    fetchBattleHistory();
  }, []);

  const fetchBattleHistory = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/stats/player/${user.id}`);
      setBattles(response.data.recentBattles || []);
      setLoading(false);
    } catch (err) {
      setError('Failed to load battle history');
      setLoading(false);
    }
  };

  const viewBattleDetails = async (battleId) => {
    try {
      const response = await axios.get(`${apiUrl}/api/battle/${battleId}`);
      setSelectedBattle(response.data.battle);
    } catch (err) {
      setError('Failed to load battle details');
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return <div className="card"><div className="error">{error}</div></div>;
  }

  return (
    <div>
      <div className="card">
        <h2>📜 Battle History</h2>
        <p style={{ color: '#666', marginBottom: '2rem' }}>
          Your recent battles and combat records
        </p>

        {battles.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
            No battles yet. Start fighting to build your history!
          </p>
        ) : (
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Opponent</th>
                <th>Result</th>
                <th>Winner</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {battles.map((battle) => (
                <tr key={battle.id}>
                  <td>
                    {new Date(battle.created_at).toLocaleString()}
                  </td>
                  <td>
                    {battle.player1_name === user.username 
                      ? battle.player2_name 
                      : battle.player1_name}
                  </td>
                  <td>
                    {battle.won ? (
                      <span style={{ 
                        color: '#28a745', 
                        fontWeight: 'bold',
                        background: '#d4edda',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '15px'
                      }}>
                        ✓ Victory
                      </span>
                    ) : (
                      <span style={{ 
                        color: '#dc3545', 
                        fontWeight: 'bold',
                        background: '#f8d7da',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '15px'
                      }}>
                        ✗ Defeat
                      </span>
                    )}
                  </td>
                  <td>
                    <strong>{battle.winner_name}</strong>
                  </td>
                  <td>
                    <button 
                      onClick={() => viewBattleDetails(battle.id)}
                      className="btn-secondary"
                      style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedBattle && (
        <div className="card">
          <h3>⚔️ Battle Details</h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '2rem',
            marginBottom: '1rem'
          }}>
            <div>
              <p><strong>Battle ID:</strong> #{selectedBattle.id}</p>
              <p><strong>Date:</strong> {new Date(selectedBattle.created_at).toLocaleString()}</p>
            </div>
            <div>
              <p><strong>Player 1:</strong> {selectedBattle.player1_name}</p>
              <p><strong>Player 2:</strong> {selectedBattle.player2_name}</p>
            </div>
          </div>

          <h4 style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>Battle Log:</h4>
          <div className="battle-log">
            {selectedBattle.battle_log}
          </div>

          <button 
            onClick={() => setSelectedBattle(null)}
            className="btn-secondary"
            style={{ marginTop: '1rem' }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}

export default BattleHistory;