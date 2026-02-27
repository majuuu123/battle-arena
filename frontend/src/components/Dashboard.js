import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Dashboard({ user, apiUrl }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/stats/player/${user.id}`);
      setStats(response.data.player);
      setLoading(false);
    } catch (err) {
      setError('Failed to load stats');
      setLoading(false);
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

  const winRate = stats.wins + stats.losses > 0 
    ? ((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(1)
    : 0;

  return (
    <div>
      <div className="card">
        <h2>Welcome back, {user.username}! 👋</h2>
        <p style={{ color: '#666', marginTop: '0.5rem' }}>
          Ready to dominate the arena?
        </p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.wins}</div>
          <div className="stat-label">Victories</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.losses}</div>
          <div className="stat-label">Defeats</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{winRate}%</div>
          <div className="stat-label">Win Rate</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">#{stats.rank}</div>
          <div className="stat-label">Global Rank</div>
        </div>
      </div>

      <div className="card">
        <h3>⚔️ Combat Stats</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1rem' }}>
          <div>
            <strong style={{ color: '#667eea' }}>Attack:</strong> {stats.attack}
          </div>
          <div>
            <strong style={{ color: '#667eea' }}>Defense:</strong> {stats.defense}
          </div>
          <div>
            <strong style={{ color: '#667eea' }}>HP:</strong> {stats.hp}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;