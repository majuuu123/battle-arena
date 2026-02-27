import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Leaderboard({ apiUrl }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    fetchLeaderboard();
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchLeaderboard, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/stats/leaderboard`);
      setLeaderboard(response.data.leaderboard);
      setLastUpdated(new Date().toLocaleTimeString());
      setLoading(false);
    } catch (err) {
      setError('Failed to load leaderboard');
      setLoading(false);
    }
  };

  const getMedal = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
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
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>🏆 Leaderboard</h2>
        {lastUpdated && (
          <span style={{ color: '#666', fontSize: '0.9rem' }}>
            Last updated: {lastUpdated}
          </span>
        )}
      </div>

      {leaderboard.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
          No players yet. Be the first to battle!
        </p>
      ) : (
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Wins</th>
              <th>Losses</th>
              <th>Win Rate</th>
              <th>Stats</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((player, index) => (
              <tr key={player.id}>
                <td>
                  <span className="rank-medal">{getMedal(index + 1)}</span>
                </td>
                <td>
                  <strong>{player.username}</strong>
                </td>
                <td style={{ color: '#28a745' }}>{player.wins}</td>
                <td style={{ color: '#dc3545' }}>{player.losses}</td>
                <td>
                  <span style={{ 
                    background: player.win_rate >= 50 ? '#d4edda' : '#f8d7da',
                    color: player.win_rate >= 50 ? '#155724' : '#721c24',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '15px',
                    fontWeight: 'bold'
                  }}>
                    {player.win_rate}%
                  </span>
                </td>
                <td>
                  <small style={{ color: '#666' }}>
                    ATK: {player.attack} | DEF: {player.defense} | HP: {player.hp}
                  </small>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ 
        marginTop: '2rem', 
        padding: '1rem',
        background: '#f8f9fa',
        borderRadius: '5px',
        textAlign: 'center'
      }}>
        <p style={{ color: '#666', margin: 0 }}>
          💡 The leaderboard updates automatically every 5 seconds
        </p>
      </div>
    </div>
  );
}

export default Leaderboard;