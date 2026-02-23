'use strict';

const WebSocket = require('ws');

class WebSocketManager {
  constructor() {
    this.wss = null;
    this.clients = new Set();
  }

  initialize(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/stats/live'
    });

    this.wss.on('connection', (ws) => {
      console.log('WebSocket client connected');
      this.clients.add(ws);

      ws.on('close', () => {
        console.log('WebSocket client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });

      ws.send(JSON.stringify({ 
        type: 'connected',
        message: 'Connected to live leaderboard updates',
        timestamp: new Date().toISOString()
      }));
    });

    console.log('WebSocket server initialized on /stats/live');
  }

  broadcastLeaderboard(leaderboardData) {
    const message = JSON.stringify({
      type: 'leaderboard_update',
      data: leaderboardData,
      timestamp: new Date().toISOString()
    });

    let broadcastCount = 0;
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
        broadcastCount++;
      }
    });

    console.log(`Broadcasted leaderboard to ${broadcastCount} clients`);
  }

  getConnectedClientsCount() {
    return this.clients.size;
  }
}

module.exports = new WebSocketManager();