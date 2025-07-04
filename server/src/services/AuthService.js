import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import database from '../config/database.js';
import config from '../config/environment.js';

export class AuthService {
  /**
   * Register new club
   */
  async register(req, res) {
    try {
      const { name, email, password } = req.body;
      const prefix = config.DB_TABLE_PREFIX;
      
      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
      }

      // Check if club exists
      const [existing] = await database.connection.execute(
        `SELECT id FROM ${prefix}clubs WHERE email = ?`, 
        [email]
      );
      
      if (Array.isArray(existing) && existing.length > 0) {
        return res.status(400).json({ error: 'Club with this email already exists' });
      }

      // Create club and user
      const hashedPassword = await bcrypt.hash(password, 12);
      const clubId = uuidv4();
      const userId = uuidv4();
      
      // Insert club
      await database.connection.execute(
        `INSERT INTO ${prefix}clubs (id, name, email, password_hash) VALUES (?, ?, ?, ?)`,
        [clubId, name, email, hashedPassword]
      );
      
      // Insert host user
      await database.connection.execute(
        `INSERT INTO ${prefix}users (id, club_id, name, email, role) VALUES (?, ?, ?, ?, ?)`,
        [userId, clubId, name, email, 'host']
      );

      // Generate token
      const token = jwt.sign({ userId, clubId }, config.JWT_SECRET, { expiresIn: '7d' });

      res.status(201).json({
        message: 'Club registered successfully',
        token,
        user: { id: userId, club_id: clubId, name, email, role: 'host' },
        club: { id: clubId, name, email }
      });
    } catch (error) {
      console.error('❌ Registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Login club
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;
      const prefix = config.DB_TABLE_PREFIX;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Find club and user
      const [rows] = await database.connection.execute(`
        SELECT c.id as club_id, c.name as club_name, c.email as club_email, c.password_hash,
               u.id as user_id, u.name as user_name, u.email as user_email, u.role
        FROM ${prefix}clubs c 
        JOIN ${prefix}users u ON c.id = u.club_id 
        WHERE c.email = ? AND u.role = 'host'
      `, [email]);

      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const data = rows[0];
      
      // Verify password
      const isValidPassword = await bcrypt.compare(password, data.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate token
      const token = jwt.sign({ userId: data.user_id, clubId: data.club_id }, config.JWT_SECRET, { expiresIn: '7d' });

      res.json({
        message: 'Login successful',
        token,
        user: { 
          id: data.user_id, 
          club_id: data.club_id, 
          name: data.user_name, 
          email: data.user_email, 
          role: data.role 
        },
        club: { 
          id: data.club_id, 
          name: data.club_name, 
          email: data.club_email 
        }
      });
    } catch (error) {
      console.error('❌ Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get user profile
   */
  async getProfile(req, res) {
    try {
      const prefix = config.DB_TABLE_PREFIX;
      const [clubRows] = await database.connection.execute(
        `SELECT id, name, email FROM ${prefix}clubs WHERE id = ?`, 
        [req.club_id]
      );
      
      if (!Array.isArray(clubRows) || clubRows.length === 0) {
        return res.status(404).json({ error: 'Club not found' });
      }

      res.json({
        user: req.user,
        club: clubRows[0]
      });
    } catch (error) {
      console.error('❌ Get user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export default AuthService;