import mysql from 'mysql2/promise';
import { config } from './environment.js';

class Database {
  constructor() {
    this.pool = null;
  }

  async connect() {
    try {
      // Create connection pool with only valid MySQL2 options
      this.pool = mysql.createPool({
        host: config.DB_HOST,
        user: config.DB_USER,
        password: config.DB_PASSWORD,
        database: config.DB_NAME,
        timezone: '+00:00',
        
        // Core pool settings (all valid for MySQL2)
        connectionLimit: 10,          // Maximum number of connections in pool
        queueLimit: 0,               // No limit on queued connection requests
        
        // Keep connections alive to prevent MySQL timeout
        keepAliveInitialDelay: 0,     
        enableKeepAlive: true,        
        
        // Character set and security
        charset: 'utf8mb4',
        multipleStatements: false,    // Security: prevent SQL injection
        
        // SSL settings (set to true if using SSL)
        ssl: false,
        
        // Type casting
        typeCast: true,               // Automatically cast MySQL types to JS types
      });
      
      // Test the connection
      const connection = await this.pool.getConnection();
      console.log('✅ Connected to MySQL database with connection pool');
      connection.release(); // Return connection to pool
      
      await this.initializeTables();
      
      // Handle pool errors
      this.pool.on('connection', (connection) => {
        console.log('🔗 New database connection established');
      });
      
      this.pool.on('error', (err) => {
        console.error('❌ Database pool error:', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
          console.log('🔄 Database connection lost, pool will reconnect...');
        } else {
          throw err;
        }
      });
      
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      process.exit(1);
    }
  }

  // Method to get connection from pool
  async getConnection() {
    if (!this.pool) {
      throw new Error('Database pool not initialized. Call connect() first.');
    }
    return await this.pool.getConnection();
  }

  // Method to execute queries safely
  async execute(query, params = []) {
    if (!this.pool) {
      throw new Error('Database pool not initialized. Call connect() first.');
    }
    
    try {
      const [results] = await this.pool.execute(query, params);
      return [results];
    } catch (error) {
      console.error('❌ Database query error:', error);
      console.error('Query:', query);
      console.error('Params:', params);
      throw error;
    }
  }

  // For backward compatibility - redirect to pool
  get connection() {
    return {
      execute: (query, params) => this.execute(query, params)
    };
  }

  async initializeTables() {
    const prefix = config.DB_TABLE_PREFIX;
    
    const tables = [
      // ✅ EXISTING TABLES (already working)
      
      // Clubs table
      `CREATE TABLE IF NOT EXISTS ${prefix}clubs (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Users table (for club members with roles)
      `CREATE TABLE IF NOT EXISTS ${prefix}users (
        id VARCHAR(36) PRIMARY KEY,
        club_id VARCHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        role ENUM('host', 'admin', 'treasurer', 'communications', 'volunteer') DEFAULT 'volunteer',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (club_id) REFERENCES ${prefix}clubs(id) ON DELETE CASCADE,
        UNIQUE KEY unique_club_email (club_id, email)
      )`,
      
      // Campaigns table
      `CREATE TABLE IF NOT EXISTS ${prefix}campaigns (
        id VARCHAR(36) PRIMARY KEY,
        club_id VARCHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        target_amount DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (club_id) REFERENCES ${prefix}clubs(id) ON DELETE CASCADE
      )`,
      
      // Events table (updated with all financial fields)
      `CREATE TABLE IF NOT EXISTS ${prefix}events (
        id VARCHAR(36) PRIMARY KEY,
        club_id VARCHAR(36) NOT NULL,
        campaign_id VARCHAR(36) NULL,
        title VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        description TEXT,
        venue VARCHAR(255),
        max_participants INT,
        goal_amount DECIMAL(10,2) NOT NULL,
        actual_amount DECIMAL(10,2) DEFAULT 0,
        total_expenses DECIMAL(10,2) DEFAULT 0,
        net_profit DECIMAL(10,2) DEFAULT 0,
        event_date DATE NOT NULL,
        status ENUM('draft', 'live', 'ended') DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (club_id) REFERENCES ${prefix}clubs(id) ON DELETE CASCADE,
        FOREIGN KEY (campaign_id) REFERENCES ${prefix}campaigns(id) ON DELETE SET NULL
      )`,
      
      // ❌ NEW TABLES TO ADD
      
      // Supporters table
      `CREATE TABLE IF NOT EXISTS ${prefix}supporters (
        id VARCHAR(36) PRIMARY KEY,
        club_id VARCHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        type ENUM('volunteer', 'donor', 'sponsor') NOT NULL,
        contact_info TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (club_id) REFERENCES ${prefix}clubs(id) ON DELETE CASCADE
      )`,
      
      // Prizes table
      `CREATE TABLE IF NOT EXISTS ${prefix}prizes (
        id VARCHAR(36) PRIMARY KEY,
        event_id VARCHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        value DECIMAL(10,2) NOT NULL,
        donated_by VARCHAR(36),
        confirmed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (event_id) REFERENCES ${prefix}events(id) ON DELETE CASCADE,
        FOREIGN KEY (donated_by) REFERENCES ${prefix}supporters(id) ON DELETE SET NULL
      )`,
      
      // Tasks table
      `CREATE TABLE IF NOT EXISTS ${prefix}tasks (
        id VARCHAR(36) PRIMARY KEY,
        event_id VARCHAR(36) NOT NULL,
        title VARCHAR(255) NOT NULL,
        assigned_to VARCHAR(36),
        due_date DATE,
        status ENUM('todo', 'in_progress', 'done') DEFAULT 'todo',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (event_id) REFERENCES ${prefix}events(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_to) REFERENCES ${prefix}supporters(id) ON DELETE SET NULL
      )`,
      
      // Expenses table - CRITICAL for financial tracking
      `CREATE TABLE IF NOT EXISTS ${prefix}expenses (
        id VARCHAR(36) PRIMARY KEY,
        club_id VARCHAR(36) NOT NULL,
        event_id VARCHAR(36) NULL,
        category VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        date DATE NOT NULL,
        receipt_url TEXT,
        vendor VARCHAR(255),
        payment_method ENUM('cash', 'card', 'transfer', 'cheque', 'other') DEFAULT 'card',
        status ENUM('pending', 'approved', 'paid') DEFAULT 'pending',
        created_by VARCHAR(36) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (club_id) REFERENCES ${prefix}clubs(id) ON DELETE CASCADE,
        FOREIGN KEY (event_id) REFERENCES ${prefix}events(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES ${prefix}users(id) ON DELETE RESTRICT
      )`,
      
      // Income table - CRITICAL for financial tracking
      `CREATE TABLE IF NOT EXISTS ${prefix}income (
        id VARCHAR(36) PRIMARY KEY,
        club_id VARCHAR(36) NOT NULL,
        event_id VARCHAR(36) NULL,
        source VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        date DATE NOT NULL,
        payment_method ENUM('cash', 'card', 'transfer', 'sponsorship', 'donation', 'ticket_sales', 'other') DEFAULT 'cash',
        reference VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (club_id) REFERENCES ${prefix}clubs(id) ON DELETE CASCADE,
        FOREIGN KEY (event_id) REFERENCES ${prefix}events(id) ON DELETE CASCADE
      )`
    ];

    console.log(`🔧 Initializing database tables with prefix: ${prefix}`);
    
    for (let i = 0; i < tables.length; i++) {
      try {
        await this.execute(tables[i]);
        console.log(`✅ Table ${i + 1}/${tables.length} initialized`);
      } catch (error) {
        console.error(`❌ Error creating table ${i + 1}:`, error);
        throw error;
      }
    }
    
    console.log('🎉 All database tables initialized successfully!');
  }

  // Graceful shutdown
  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('✅ Database pool closed');
    }
  }
}

// Create and export singleton instance
const database = new Database();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT, closing database pool...');
  await database.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, closing database pool...');
  await database.close();
  process.exit(0);
});

export default database;