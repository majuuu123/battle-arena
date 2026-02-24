'use strict';

const amqp = require('amqplib');
const axios = require('axios');

class QueueManager {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.queueName = 'matchmaking_queue';
    this.playersInQueue = [];
    this.isProcessing = false;
  }

  async connect() {
    try {
      const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
      console.log('Connecting to RabbitMQ...');
      
      this.connection = await amqp.connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();
      
      await this.channel.assertQueue(this.queueName, {
        durable: true,
      });

      console.log(`✓ Connected to RabbitMQ, queue: ${this.queueName}`);

      this.startConsuming();

      this.connection.on('error', (err) => {
        console.error('RabbitMQ connection error:', err);
      });

      this.connection.on('close', () => {
        console.log('RabbitMQ connection closed');
      });

    } catch (error) {
      console.error('Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }

  async addPlayerToQueue(playerId, username) {
    if (this.playersInQueue.some(p => p.playerId === playerId)) {
      return { success: false, message: 'Player already in queue' };
    }

    const player = {
      playerId,
      username,
      joinedAt: new Date().toISOString()
    };

    this.playersInQueue.push(player);

    const message = JSON.stringify(player);
    this.channel.sendToQueue(this.queueName, Buffer.from(message), {
      persistent: true,
    });

    console.log(`Player ${username} (ID: ${playerId}) added to queue`);

    this.checkForMatches();

    return { 
      success: true, 
      message: 'Added to matchmaking queue',
      queuePosition: this.playersInQueue.length,
      playersInQueue: this.playersInQueue.length
    };
  }

  async removePlayerFromQueue(playerId) {
    const index = this.playersInQueue.findIndex(p => p.playerId === playerId);
    
    if (index === -1) {
      return { success: false, message: 'Player not in queue' };
    }

    this.playersInQueue.splice(index, 1);
    console.log(`Player ${playerId} removed from queue`);

    return { 
      success: true, 
      message: 'Removed from queue',
      playersInQueue: this.playersInQueue.length
    };
  }

  startConsuming() {
    this.channel.consume(this.queueName, async (msg) => {
      if (msg !== null) {
        try {
          const player = JSON.parse(msg.content.toString());
          console.log('Consumed player from queue:', player.username);
          
          this.channel.ack(msg);
          
        } catch (error) {
          console.error('Error processing queue message:', error);
          this.channel.nack(msg, false, false);
        }
      }
    });
  }

  async checkForMatches() {
    if (this.isProcessing || this.playersInQueue.length < 2) {
      return;
    }

    this.isProcessing = true;

    try {
      const player1 = this.playersInQueue.shift();
      const player2 = this.playersInQueue.shift();

      console.log(`\n🎮 MATCH FOUND: ${player1.username} vs ${player2.username}`);

      const battleServiceUrl = process.env.BATTLE_SERVICE_URL || 'https://battle-service:3002';
      
      const battleResponse = await axios.post(`${battleServiceUrl}/battle/simulate`, {
        player1Id: player1.playerId,
        player2Id: player2.playerId
      });

      console.log(`Battle completed: ${battleResponse.data.winner} wins!`);

      const statsServiceUrl = process.env.STATS_SERVICE_URL || 'https://stats-service:3004';
      try {
        await axios.post(`${statsServiceUrl}/stats/refresh`);
        console.log('Leaderboard refreshed after battle');
      } catch (err) {
        console.log('Could not refresh leaderboard:', err.message);
      }

    } catch (error) {
      console.error('Error during match:', error.message);
    } finally {
      this.isProcessing = false;

      if (this.playersInQueue.length >= 2) {
        setTimeout(() => this.checkForMatches(), 1000);
      }
    }
  }

  getQueueStatus() {
    return {
      playersInQueue: this.playersInQueue.length,
      players: this.playersInQueue.map(p => ({
        playerId: p.playerId,
        username: p.username,
        joinedAt: p.joinedAt
      }))
    };
  }

  async close() {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
    console.log('RabbitMQ connection closed');
  }
}

module.exports = new QueueManager();