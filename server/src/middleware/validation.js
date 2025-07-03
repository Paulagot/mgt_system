//server/src/middleware/validation.js

/**
 * Common validation middleware functions
 */

/**
 * Validate required fields in request body
 * @param {Array} requiredFields - Array of required field names
 * @returns {Function} Express middleware function
 */
export const validateRequired = (requiredFields) => {
  return (req, res, next) => {
    const missing = requiredFields.filter(field => !req.body[field]);
    
    if (missing.length > 0) {
      return res.status(400).json({ 
        error: `Missing required fields: ${missing.join(', ')}` 
      });
    }
    
    next();
  };
};

/**
 * Validate club access
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const validateClubAccess = (req, res, next) => {
  const { clubId } = req.params;
  
  if (clubId !== req.club_id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  next();
};

export default { validateRequired, validateClubAccess };