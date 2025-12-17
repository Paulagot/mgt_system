// server/src/middleware/auth.js
import jwt from 'jsonwebtoken';
import config from '../config/environment.js';
import database from '../config/database.js';

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    const prefix = config.DB_TABLE_PREFIX;
    
    if (!database.connection) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const [rows] = await database.connection.execute(
      `SELECT u.*, c.name as club_name FROM ${prefix}users u JOIN ${prefix}clubs c ON u.club_id = c.id WHERE u.id = ?`,
      [decoded.userId]
    );
    
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    
    req.user = rows[0];
    req.club_id = req.user.club_id;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

export default authenticateToken;