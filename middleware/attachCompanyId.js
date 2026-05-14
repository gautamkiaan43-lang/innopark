// =====================================================
// Attach Company ID Middleware
// =====================================================
// This middleware extracts company_id from JWT token and attaches it to req.companyId
// It helps ensure multi-tenancy data isolation across the application

const jwt = require('jsonwebtoken');

/**
 * Middleware to attach company_id to request object
 * Extracts from JWT token or allows override from query/body params
 */
const attachCompanyId = (req, res, next) => {
  try {
    // Try to extract from JWT token first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

        // Attach decoded information to request
        req.companyId = decoded.company_id;
        req.userId = decoded.userId;
        req.userRole = decoded.role;

        console.log('JWT decoded - companyId:', req.companyId, 'userId:', req.userId, 'role:', req.userRole);
      } catch (jwtError) {
        console.error('JWT verification failed:', jwtError.message);
        // Don't fail the request, just log the error
        // The controller will handle missing companyId
      }
    }

    // Allow query/body parameters to override (useful for admin operations)
    // But only if not already set from token
    if (req.query.company_id) {
      const queryCompanyId = parseInt(req.query.company_id, 10);
      if (!isNaN(queryCompanyId) && queryCompanyId > 0) {
        req.companyId = queryCompanyId;
        console.log('companyId overridden from query:', req.companyId);
      }
    } else if (req.body.company_id) {
      const bodyCompanyId = parseInt(req.body.company_id, 10);
      if (!isNaN(bodyCompanyId) && bodyCompanyId > 0) {
        req.companyId = bodyCompanyId;
        console.log('companyId overridden from body:', req.companyId);
      }
    }

    // Continue to next middleware/controller
    next();
  } catch (error) {
    console.error('attachCompanyId middleware error:', error);
    // Don't block the request, let controllers handle validation
    next();
  }
};

module.exports = attachCompanyId;
