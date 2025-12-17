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
   * ✅ Password is stored on USERS (host), not clubs.
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

      // Pre-check: club email still unique (contact email)
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

        // ✅ Clubs (no password_hash)
        await conn.execute(
          `INSERT INTO ${prefix}clubs (id, name, email) VALUES (?, ?, ?)`,
          [clubId, name, email]
        );

        // ✅ Users: store password_hash here (host)
        await conn.execute(
          `INSERT INTO ${prefix}users (
            id, club_id, name, email, password_hash, password_updated_at, role,
            gdpr_consent, privacy_policy_accepted, marketing_consent,
            consent_date, consent_ip, consent_user_agent
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            clubId,
            name,
            email,
            hashedPassword,
            consentDate,
            'host',
            gdprConsent ? 1 : 0,
            privacyPolicyAccepted ? 1 : 0,
            marketingConsent ? 1 : 0,
            consentDate,
            clientIp,
            userAgent
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
        } catch {
          // plans table may not exist yet
        }

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
                  uuidv4(),
                  userId,
                  c.type,
                  c.given ? 1 : 0,
                  consentDate,
                  clientIp,
                  userAgent,
                  CONSENT_VERSION
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
   * ✅ Login now requires: club + email + password
   * - "club" can be a clubId (UUID) OR a club name (exact match)
   * - Password is checked against users.password_hash
   */
  async login(req, res) {
    try {
      const { club, email, password } = req.body;
      const prefix = config.DB_TABLE_PREFIX;

      if (!club || !email || !password) {
        return res.status(400).json({ error: 'Club, email, and password are required' });
      }

      // If club looks like a UUID, allow id match as well
      const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(club);

      const [rows] = await database.execute(
        `
        SELECT
          u.id as user_id,
          u.club_id,
          u.name as user_name,
          u.email as user_email,
          u.role,
          u.password_hash,
          c.name as club_name,
          c.email as club_email
        FROM ${prefix}users u
        JOIN ${prefix}clubs c ON c.id = u.club_id
        WHERE u.email = ?
          AND (
            ${looksLikeUuid ? 'c.id = ? OR' : ''}
            c.name = ?
          )
        LIMIT 1
        `,
        looksLikeUuid ? [email, club, club] : [email, club]
      );

      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const data = rows[0];

      if (!data.password_hash) {
        return res.status(401).json({
          error: 'This user does not have a password set yet'
        });
      }

      const isValidPassword = await bcrypt.compare(password, data.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { userId: data.user_id, clubId: data.club_id },
        config.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
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
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get user profile (unchanged)
   */
  async getProfile(req, res) {
    try {
      const prefix = config.DB_TABLE_PREFIX;

      const [clubRows] = await database.execute(
        `SELECT id, name, email FROM ${prefix}clubs WHERE id = ?`,
        [req.club_id]
      );

      if (!Array.isArray(clubRows) || clubRows.length === 0) {
        return res.status(404).json({ error: 'Club not found' });
      }

      return res.json({
        user: req.user,
        club: clubRows[0]
      });
    } catch (error) {
      console.error('❌ Get user error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Update consent preferences (unchanged)
   */
  async updateConsent(req, res) {
    try {
      const { marketingConsent } = req.body;
      const userId = req.user.id;
      const prefix = config.DB_TABLE_PREFIX;

      const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';
      const consentDate = new Date();

      await database.execute(
        `UPDATE ${prefix}users SET
          marketing_consent = ?,
          consent_date = ?,
          consent_ip = ?,
          consent_user_agent = ?
        WHERE id = ?`,
        [marketingConsent ? 1 : 0, consentDate, clientIp, userAgent, userId]
      );

      await database.execute(
        `INSERT INTO ${prefix}consent_log (
          id, user_id, consent_type, consent_given,
          consent_date, ip_address, user_agent, consent_version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          userId,
          'marketing',
          marketingConsent ? 1 : 0,
          consentDate,
          clientIp,
          userAgent,
          CONSENT_VERSION
        ]
      ).catch(() => { /* ignore if table absent */ });

      return res.json({
        message: 'Consent preferences updated successfully',
        marketingConsent
      });
    } catch (error) {
      console.error('❌ Update consent error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export default AuthService;

