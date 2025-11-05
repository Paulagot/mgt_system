// server/src/services/AuthService.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import database from '../config/database.js';
import config from '../config/environment.js';

const CONSENT_VERSION = process.env.CONSENT_VERSION || '1.0';

export class AuthService {
  /**
   * Register new club with GDPR compliance + seed FREE plan
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
      if (!gdprConsent || !privacyPolicyAccepted) {
        return res.status(400).json({ 
          error: 'GDPR consent and privacy policy acceptance are required' 
        });
      }

      // Pre-check (pool)
      const [existing] = await database.execute(
        `SELECT id FROM ${prefix}clubs WHERE email = ?`,
        [email]
      );
      if (Array.isArray(existing) && existing.length > 0) {
        return res.status(400).json({ error: 'Club with this email already exists' });
      }

      // Client + consent metadata
      const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';
      const consentDate = new Date();

      const hashedPassword = await bcrypt.hash(password, 12);
      const clubId = uuidv4();
      const userId = uuidv4();

      const conn = await database.getConnection();
      try {
        await conn.beginTransaction();

        // Clubs
        await conn.execute(
          `INSERT INTO ${prefix}clubs (id, name, email, password_hash) VALUES (?, ?, ?, ?)`,
          [clubId, name, email, hashedPassword]
        );

        // Users (NOTE: no consent_version in users table)
        await conn.execute(
          `INSERT INTO ${prefix}users (
            id, club_id, name, email, role,
            gdpr_consent, privacy_policy_accepted, marketing_consent,
            consent_date, consent_ip, consent_user_agent
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId, clubId, name, email, 'host',
            gdprConsent, privacyPolicyAccepted, marketingConsent,
            consentDate, clientIp, userAgent
          ]
        );

        // Seed FREE plan for the club
        let freePlanId = 1;
        try {
          const [[planRow]] = await conn.execute(
            `SELECT id FROM ${prefix}plans WHERE code = ? LIMIT 1`,
            ['FREE']
          );
          if (planRow?.id) freePlanId = planRow.id;
        } catch { /* plans table may not exist yet */ }

        const DEFAULT_FREE_CREDITS = 3;
        await conn.execute(
          `INSERT INTO ${prefix}club_plan (club_id, plan_id, game_credits_remaining, overrides)
           VALUES (?, ?, ?, ?)`,
          [clubId, freePlanId, DEFAULT_FREE_CREDITS, null]
        );

        // Consent audit trail (consent_log) — includes consent_version
        const consentTypes = [
          { type: 'gdpr', given: gdprConsent },
          { type: 'privacy_policy', given: privacyPolicyAccepted },
          { type: 'marketing', given: marketingConsent }
        ];
        for (const c of consentTypes) {
          if (c.given) {
            try {
              await conn.execute(
                `INSERT INTO ${prefix}consent_log (
                  id, user_id, consent_type, consent_given, 
                  consent_date, ip_address, user_agent, consent_version
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  uuidv4(), userId, c.type, c.given ? 1 : 0,
                  consentDate, clientIp, userAgent, CONSENT_VERSION
                ]
              );
            } catch {
              console.log('Consent log table not found, skipping audit trail');
            }
          }
        }

        await conn.commit();

        const token = jwt.sign({ userId, clubId }, config.JWT_SECRET, { expiresIn: '7d' });
        return res.status(201).json({
          message: 'Club registered successfully',
          token,
          user: { id: userId, club_id: clubId, name, email, role: 'host' },
          club: { id: clubId, name, email }
        });
      } catch (dbError) {
        await conn.rollback();
        throw dbError;
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error('❌ Registration error:', error);
      return res.status(500).json({ error: 'Internal server error' });
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
      const isValidPassword = await bcrypt.compare(password, data.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

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
   * Update consent preferences (keeps consent_version in consent_log)
   */
  async updateConsent(req, res) {
    try {
      const { marketingConsent } = req.body;
      const userId = req.user.id;
      const prefix = config.DB_TABLE_PREFIX;

      const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';
      const consentDate = new Date();

      // Update flag on users
      await database.connection.execute(
        `UPDATE ${prefix}users SET 
          marketing_consent = ?, 
          consent_date = ?,
          consent_ip = ?,
          consent_user_agent = ?
        WHERE id = ?`,
        [marketingConsent ? 1 : 0, consentDate, clientIp, userAgent, userId]
      );

      // Audit log with consent_version
      await database.connection.execute(
        `INSERT INTO ${prefix}consent_log (
          id, user_id, consent_type, consent_given, 
          consent_date, ip_address, user_agent, consent_version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(), userId, 'marketing', marketingConsent ? 1 : 0,
          consentDate, clientIp, userAgent, CONSENT_VERSION
        ]
      ).catch(() => { /* ignore if table absent */ });

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
