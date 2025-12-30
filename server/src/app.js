// server/src/app.js
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import config from './config/environment.js';
import database from './config/database.js';
import socketManager from './config/socket.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Import existing routes
import authRoutes from './routes/auth.js';
import campaignRoutes from './routes/campaigns.js'
import eventRoutes from './routes/events.js';
import expenseRoutes from './routes/expenses.js';
import incomeRoutes from './routes/income.js';
import financialRoutes from './routes/financials.js';
import supporterRoutes from './routes/supporters.js';

// Import NEW routes for sprint features
import userRoutes from './routes/users.js';
import prizeRoutes from './routes/prizes.js';
import taskRoutes from './routes/tasks.js';

import impactRoutes from './routes/impact.js';

import entitySetupRoutes from './routes/entitySetup.js';

// Initialize Express app

const app = express();
const httpServer = createServer(app);

// Required for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Socket.IO through our manager
socketManager.initialize(httpServer);

// Make socketManager available to routes
app.set('socketManager', socketManager);

// Middleware
app.use(cors());
app.use(express.json());

// API Routes - Existing (keep original mounting)
app.use('/api', authRoutes);
app.use('/', campaignRoutes);
app.use('/', eventRoutes);
app.use('/', expenseRoutes);
app.use('/', incomeRoutes);
app.use('/', financialRoutes);
app.use('/', supporterRoutes);
app.use('/', impactRoutes); 
app.use('/', entitySetupRoutes);


// API Routes - NEW Sprint Features (need to check the route structure)
app.use('/api', userRoutes);    // User management - ONLY this one needs /api
app.use('/api', prizeRoutes);      // Prize management
app.use('/api', taskRoutes);       // Task management

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Fundraisely API is running!',
    database: database.connection ? 'Connected' : 'Disconnected',
    socket: socketManager.io ? 'Connected' : 'Disconnected',
    sprint_features: {
      user_management: '✅ NEW',
      price_management: '✅ NEW', 
      task_management: '✅ NEW',
      communication_fix: '✅ FIXED'
    }
  });
});

// Basic route for testing
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API is working!',
    config: {
      port: config.PORT,
      frontend: config.FRONTEND_URL
    },
    new_endpoints: {
      users: '/api/clubs/:clubId/users',
      prizes: '/api/events/:eventId/prizes', 
      tasks: '/api/events/:eventId/tasks'
    }
  });
});

// Serve frontend static files in production
const clientBuildPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientBuildPath));

// Serve index.html on unknown routes (for React Router)
app.get('*', (req, res, next) => {
  // Only serve frontend for GET requests that aren't API routes
  if (req.method === 'GET' && !req.originalUrl.startsWith('/api')) {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  } else {
    next(); // pass to next middleware (e.g., 404)
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    ...(import.meta.env.DEV && { details: error.message })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

/**
 * Start the server
 */
async function startServer() {
  try {
    // Connect to database first
    await database.connect();
    
    // Start HTTP server
    httpServer.listen(config.PORT, () => {
      console.log(`🚀 Server running on port ${config.PORT}`);
      console.log(`📊 Socket.IO server running`);
      console.log(`🗄️ Database connected`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🆕 Sprint Features: User, Prize, Task Management + Communication Fix`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer().catch(console.error);

export default app;