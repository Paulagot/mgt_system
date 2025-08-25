import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import database from '../config/database.js';
import config from '../config/environment.js';

export class AuthService {
  /**
   * Register new club with GDPR compliance
   */
  async register(req, res) {
    try {
      const { 
        name, 
        email, 
        password, 
        gdprConsent, 
        privacyPolicyAccepted, 
        marketingConsent = false 
      } = req.body;
      const prefix = config.DB_TABLE_PREFIX;
      
      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
      }

      // Validate GDPR requirements
      if (!gdprConsent || !privacyPolicyAccepted) {
        return res.status(400).json({ 
          error: 'GDPR consent and privacy policy acceptance are required' 
        });
      }

      // Check if club exists
      const [existing] = await database.connection.execute(
        `SELECT id FROM ${prefix}clubs WHERE email = ?`, 
        [email]
      );
      
      if (Array.isArray(existing) && existing.length > 0) {
        return res.status(400).json({ error: 'Club with this email already exists' });
      }

      // Get client info for consent logging
      const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';
      const consentDate = new Date();

      // Create club and user with GDPR data
      const hashedPassword = await bcrypt.hash(password, 12);
      const clubId = uuidv4();
      const userId = uuidv4();
      
      // Start transaction
      await database.connection.beginTransaction();

      try {
        // Insert club
        await database.connection.execute(
          `INSERT INTO ${prefix}clubs (id, name, email, password_hash) VALUES (?, ?, ?, ?)`,
          [clubId, name, email, hashedPassword]
        );
        
        // Insert host user with GDPR consent data
        await database.connection.execute(
          `INSERT INTO ${prefix}users (
            id, club_id, name, email, role, 
            gdpr_consent, privacy_policy_accepted, marketing_consent, 
            consent_date, consent_ip, consent_user_agent, consent_version
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId, clubId, name, email, 'host',
            gdprConsent, privacyPolicyAccepted, marketingConsent,
            consentDate, clientIp, userAgent, '1.0'
          ]
        );

        // Log consent for audit trail (if consent_log table exists)
        const consentTypes = [
          { type: 'gdpr', given: gdprConsent },
          { type: 'privacy_policy', given: privacyPolicyAccepted },
          { type: 'marketing', given: marketingConsent }
        ];

        for (const consent of consentTypes) {
          if (consent.given) {
            await database.connection.execute(
              `INSERT INTO ${prefix}consent_log (
                id, user_id, consent_type, consent_given, 
                consent_date, ip_address, user_agent, consent_version
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                uuidv4(), userId, consent.type, consent.given,
                consentDate, clientIp, userAgent, '1.0'
              ]
            ).catch(() => {
              // Ignore error if consent_log table doesn't exist
              console.log('Consent log table not found, skipping audit trail');
            });
          }
        }

        // Commit transaction
        await database.connection.commit();

        // Generate token
        const token = jwt.sign({ userId, clubId }, config.JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
          message: 'Club registered successfully',
          token,
          user: { 
            id: userId, 
            club_id: clubId, 
            name, 
            email, 
            role: 'host' 
          },
          club: { 
            id: clubId, 
            name, 
            email 
          }
        });

      } catch (dbError) {
        // Rollback transaction
        await database.connection.rollback();
        throw dbError;
      }

    } catch (error) {
      console.error('❌ Registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Login club (unchanged)
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
   * Get user profile (unchanged)
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

  /**
   * Update consent preferences
   */
  async updateConsent(req, res) {
    try {
      const { marketingConsent } = req.body;
      const userId = req.user.id;
      const prefix = config.DB_TABLE_PREFIX;

      // Get client info
      const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      // Update user marketing consent
      await database.connection.execute(
        `UPDATE ${prefix}users SET 
          marketing_consent = ?, 
          consent_date = CURRENT_TIMESTAMP,
          consent_ip = ?,
          consent_user_agent = ?
        WHERE id = ?`,
        [marketingConsent, clientIp, userAgent, userId]
      );

      // Log consent change
      await database.connection.execute(
        `INSERT INTO ${prefix}consent_log (
          id, user_id, consent_type, consent_given, 
          ip_address, user_agent, consent_version
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(), userId, 'marketing', marketingConsent,
          clientIp, userAgent, '1.0'
        ]
      ).catch(() => {
        // Ignore if consent_log table doesn't exist
      });

      res.json({
        message: 'Consent preferences updated successfully',
        marketingConsent
      });

    } catch (error) {
      console.error('❌ Update consent error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export default AuthService;