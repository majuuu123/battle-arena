import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

function Matchmaking({ user, apiUrl }) {
  const [inQueue, setInQueue] = useState(false);
  const [queueStatus, setQueueStatus] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [battleResult, setBattleResult] = useState(null);
  const [searching, setSearching] = useState(false);
  
  const previousStatsRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  useEffect(() => {
    fetchQueueStatus();
    const interval = setInterval(fetchQueueStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  // When in queue, poll for battle completion
  useEffect(() => {
    if (inQueue && searching) {
      startBattlePolling();
    } else {
      stopBattlePolling();
    }

    return () => stopBattlePolling();
  }, [inQueue, searching]);

  const fetchQueueStatus = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/matchmaking/status`);
      setQueueStatus(response.data);
    } catch (err) {
      console.error('Failed to fetch queue status');
    }
  };

  const startBattlePolling = async () => {
    // Get initial stats
    try {
      const statsResponse = await axios.get(`${apiUrl}/api/stats/player/${user.id}`);
      previousStatsRef.current = {
        wins: statsResponse.data.player.wins,
        losses: statsResponse.data.player.losses
      };
    } catch (err) {
      console.error('Failed to get initial stats');
    }

    // Poll every 2 seconds to check if stats changed
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const statsResponse = await axios.get(`${apiUrl}/api/stats/player/${user.id}`);
        const currentStats = {
          wins: statsResponse.data.player.wins,
          losses: statsResponse.data.player.losses
        };

        // Check if a battle happened (stats changed)
        if (previousStatsRef.current && 
            (currentStats.wins !== previousStatsRef.current.wins || 
             currentStats.losses !== previousStatsRef.current.losses)) {
          
          // Battle completed! Get the latest battle
          const recentBattles = statsResponse.data.recentBattles;
          if (recentBattles && recentBattles.length > 0) {
            const latestBattle = recentBattles[0];
            
            // Fetch full battle details
            const battleResponse = await axios.get(`${apiUrl}/api/battle/${latestBattle.id}`);
            
            setBattleResult({
              ...battleResponse.data.battle,
              won: latestBattle.won
            });
          }

          // Remove from queue
          setInQueue(false);
          setSearching(false);
          stopBattlePolling();
        }
      } catch (err) {
        console.error('Error polling for battle results');
      }
    }, 2000);
  };

  const stopBattlePolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const joinQueue = async () => {
    setError('');
    setMessage('');
    setBattleResult(null);

    try {
      const response = await axios.post(`${apiUrl}/api/matchmaking/join`, {
        playerId: user.id
      });

      setInQueue(true);
      setSearching(true);
      setMessage(response.data.message);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join queue');
    }
  };

  const leaveQueue = async () => {
    setError('');
    setMessage('');
    setSearching(false);

    try {
      const response = await axios.delete(`${apiUrl}/api/matchmaking/leave`, {
        data: { playerId: user.id }
      });

      setInQueue(false);
      setMessage(response.data.message);
      stopBattlePolling();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to leave queue');
    }
  };

  const closeBattleResult = () => {
    setBattleResult(null);
    setMessage('');
  };

  return (
    <div>
      <div className="card">
        <h2>🎮 Matchmaking</h2>
        <p style={{ color: '#666', marginBottom: '2rem' }}>
          Join the queue and we'll automatically match you with an opponent!
        </p>

        {error && <div className="error">{error}</div>}
        {message && !battleResult && <div className="success">{message}</div>}

        {queueStatus && (
          <div style={{ 
            background: '#f8f9fa', 
            padding: '1rem', 
            borderRadius: '5px',
            marginBottom: '2rem'
          }}>
            <p><strong>Players in Queue:</strong> {queueStatus.playersInQueue}</p>
            {queueStatus.players.length > 0 && (
              <div style={{ marginTop: '0.5rem' }}>
                <strong>Waiting players:</strong>
                <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem' }}>
                  {queueStatus.players.map((p, idx) => (
                    <li key={idx}>{p.username}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {!inQueue && !battleResult && (
          <button onClick={joinQueue} className="btn-primary">
            🎯 Join Matchmaking Queue
          </button>
        )}

        {inQueue && searching && !battleResult && (
          <div>
            <div className="queue-status pulse">
              <h3>⏳ Searching for opponent...</h3>
              <p>You are in the matchmaking queue</p>
              <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                When another player joins, the battle will start automatically!
              </p>
            </div>
            <button onClick={leaveQueue} className="btn-secondary">
              ❌ Leave Queue
            </button>
          </div>
        )}
      </div>

      {battleResult && (
        <div className="card">
          <h3 style={{ textAlign: 'center', marginBottom: '1rem' }}>
            {battleResult.won ? '🎉 VICTORY!' : '💀 DEFEAT!'}
          </h3>
          
          <div style={{ 
            background: battleResult.won ? '#d4edda' : '#f8d7da',
            color: battleResult.won ? '#155724' : '#721c24',
            padding: '1rem',
            borderRadius: '5px',
            textAlign: 'center',
            marginBottom: '1rem',
            fontSize: '1.1rem',
            fontWeight: 'bold'
          }}>
            {battleResult.won ? 'You won the automatic matchmaking battle!' : 'You were defeated in the matchmaking battle!'}
          </div>

          <h4 style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>Battle Log:</h4>
          <div className="battle-log">
            {battleResult.battle_log}
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button 
              onClick={closeBattleResult}
              className="btn-primary"
              style={{ flex: 1 }}
            >
              ✓ Close
            </button>
            <button 
              onClick={() => {
                closeBattleResult();
                joinQueue();
              }}
              className="btn-secondary"
              style={{ flex: 1 }}
            >
              🔄 Queue Again
            </button>
          </div>
        </div>
      )}

      {!battleResult && (
        <div className="card">
          <h3>ℹ️ How Matchmaking Works</h3>
          <ul style={{ marginLeft: '1.5rem', lineHeight: '1.8' }}>
            <li>Join the queue and wait for another player</li>
            <li>When 2 players are in queue, a battle automatically starts</li>
            <li>The battle results will appear here automatically</li>
            <li>Your stats and leaderboard rank will be updated</li>
            <li>Check battle history to see all your matches!</li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default Matchmaking;