import { Server } from 'socket.io';
import { config } from './environment.js';

class SocketManager {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // Track connected users by club
  }

  initialize(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: config.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.setupEventHandlers();
    console.log('✅ Socket.IO server initialized');
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 User connected: ${socket.id}`);

      // Handle user joining their club room
      socket.on('join_club', (data) => {
        const { clubId, userId, userName } = data;
        
        if (!clubId) {
          socket.emit('error', { message: 'Club ID is required' });
          return;
        }

        // Join the club room
        socket.join(clubId);
        
        // Store user info
        socket.clubId = clubId;
        socket.userId = userId;
        socket.userName = userName;

        // Track connected users for this club
        if (!this.connectedUsers.has(clubId)) {
          this.connectedUsers.set(clubId, new Set());
        }
        this.connectedUsers.get(clubId).add({
          socketId: socket.id,
          userId,
          userName,
          connectedAt: new Date()
        });

        console.log(`👥 User ${userName} (${userId}) joined club ${clubId}`);
        
        // Notify other users in the club
        socket.to(clubId).emit('user_joined', {
          userId,
          userName,
          connectedAt: new Date()
        });

        // Send current club stats to the new user
        this.sendClubStats(socket, clubId);
      });

      // Handle user leaving club room
      socket.on('leave_club', () => {
        this.handleUserLeave(socket);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`🔌 User disconnected: ${socket.id}`);
        this.handleUserLeave(socket);
      });

      // Handle real-time data requests
      socket.on('request_live_data', (dataType) => {
        this.handleLiveDataRequest(socket, dataType);
      });
    });
  }

  handleUserLeave(socket) {
    if (socket.clubId) {
      const clubUsers = this.connectedUsers.get(socket.clubId);
      if (clubUsers) {
        // Remove user from connected users
        for (let user of clubUsers) {
          if (user.socketId === socket.id) {
            clubUsers.delete(user);
            break;
          }
        }

        // Notify other users in club
        socket.to(socket.clubId).emit('user_left', {
          userId: socket.userId,
          userName: socket.userName
        });

        console.log(`👋 User ${socket.userName} left club ${socket.clubId}`);
      }
    }
  }

  async sendClubStats(socket, clubId) {
    try {
      // This would typically fetch current stats from services
      socket.emit('club_stats_update', {
        timestamp: new Date(),
        message: 'Connected to live updates'
      });
    } catch (error) {
      console.error('Error sending club stats:', error);
    }
  }

  handleLiveDataRequest(socket, dataType) {
    switch (dataType) {
      case 'campaigns':
        socket.emit('live_data_response', {
          type: 'campaigns',
          message: 'Live campaign updates enabled'
        });
        break;
      case 'events':
        socket.emit('live_data_response', {
          type: 'events', 
          message: 'Live event updates enabled'
        });
        break;
      case 'financials':
        socket.emit('live_data_response', {
          type: 'financials',
          message: 'Live financial updates enabled'
        });
        break;
      default:
        socket.emit('error', { message: 'Unknown data type requested' });
    }
  }

  // ===== EVENT EMISSION METHODS =====

  // Campaign events
  emitCampaignCreated(clubId, campaign) {
    if (this.io) {
      this.io.to(clubId).emit('campaign_created', {
        type: 'campaign_created',
        data: campaign,
        timestamp: new Date()
      });
      console.log(`📢 Emitted campaign_created to club ${clubId}`);
    }
  }

  emitCampaignUpdated(clubId, campaign) {
    if (this.io) {
      this.io.to(clubId).emit('campaign_updated', {
        type: 'campaign_updated',
        data: campaign,
        timestamp: new Date()
      });
      console.log(`📢 Emitted campaign_updated to club ${clubId}`);
    }
  }

  emitCampaignDeleted(clubId, campaignId) {
    if (this.io) {
      this.io.to(clubId).emit('campaign_deleted', {
        type: 'campaign_deleted',
        data: { campaignId },
        timestamp: new Date()
      });
      console.log(`📢 Emitted campaign_deleted to club ${clubId}`);
    }
  }

  // Event events
  emitEventCreated(clubId, event) {
    if (this.io) {
      this.io.to(clubId).emit('event_created', {
        type: 'event_created',
        data: event,
        timestamp: new Date()
      });
      console.log(`📢 Emitted event_created to club ${clubId}`);
    }
  }

  emitEventUpdated(clubId, event) {
    if (this.io) {
      this.io.to(clubId).emit('event_updated', {
        type: 'event_updated',
        data: event,
        timestamp: new Date()
      });
      console.log(`📢 Emitted event_updated to club ${clubId}`);
    }
  }

  emitEventDeleted(clubId, eventId) {
    if (this.io) {
      this.io.to(clubId).emit('event_deleted', {
        type: 'event_deleted',
        data: { eventId },
        timestamp: new Date()
      });
      console.log(`📢 Emitted event_deleted to club ${clubId}`);
    }
  }

  // Financial events
  emitExpenseCreated(clubId, expense) {
    if (this.io) {
      this.io.to(clubId).emit('expense_created', {
        type: 'expense_created',
        data: expense,
        timestamp: new Date()
      });
      console.log(`📢 Emitted expense_created to club ${clubId}`);
    }
  }

  emitIncomeCreated(clubId, income) {
    if (this.io) {
      this.io.to(clubId).emit('income_created', {
        type: 'income_created',
        data: income,
        timestamp: new Date()
      });
      console.log(`📢 Emitted income_created to club ${clubId}`);
    }
  }

  emitEventFinancialsUpdated(clubId, eventId, financials) {
    if (this.io) {
      this.io.to(clubId).emit('event_financials_updated', {
        type: 'event_financials_updated',
        data: { eventId, financials },
        timestamp: new Date()
      });
      console.log(`📢 Emitted event_financials_updated to club ${clubId}`);
    }
  }

  // Supporter events
  emitSupporterCreated(clubId, supporter) {
    if (this.io) {
      this.io.to(clubId).emit('supporter_created', {
        type: 'supporter_created',
        data: supporter,
        timestamp: new Date()
      });
      console.log(`📢 Emitted supporter_created to club ${clubId}`);
    }
  }

  emitSupporterUpdated(clubId, supporter) {
    if (this.io) {
      this.io.to(clubId).emit('supporter_updated', {
        type: 'supporter_updated',
        data: supporter,
        timestamp: new Date()
      });
      console.log(`📢 Emitted supporter_updated to club ${clubId}`);
    }
  }

  emitSupporterDeleted(clubId, supporterId) {
    if (this.io) {
      this.io.to(clubId).emit('supporter_deleted', {
        type: 'supporter_deleted',
        data: { supporterId },
        timestamp: new Date()
      });
      console.log(`📢 Emitted supporter_deleted to club ${clubId}`);
    }
  }

  // ===== UTILITY METHODS =====

  getConnectedUsers(clubId) {
    return this.connectedUsers.get(clubId) || new Set();
  }

  getConnectedUserCount(clubId) {
    const users = this.connectedUsers.get(clubId);
    return users ? users.size : 0;
  }

  isClubOnline(clubId) {
    return this.getConnectedUserCount(clubId) > 0;
  }

  // Broadcast message to all users in a club
  broadcastToClub(clubId, event, data) {
    if (this.io) {
      this.io.to(clubId).emit(event, {
        ...data,
        timestamp: new Date()
      });
      console.log(`📢 Broadcasted ${event} to club ${clubId}`);
    }
  }

  // Send message to specific user
  sendToUser(socketId, event, data) {
    if (this.io) {
      this.io.to(socketId).emit(event, {
        ...data,
        timestamp: new Date()
      });
    }
  }
}

// Create and export singleton instance
const socketManager = new SocketManager();
export default socketManager;