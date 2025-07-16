const { APIError } = require('./errorHandler');

/**
 * Middleware to check if user is authenticated
 */
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return next(new APIError('Authentication required', 401));
    }
    return res.redirect('/login');
  }
  next();
};

/**
 * Middleware to check if user is an admin
 */
const isAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return next(new APIError('Admin access required', 403));
  }
  next();
};

/**
 * Middleware to prevent authenticated users from accessing auth pages
 */
const preventAuthPages = (req, res, next) => {
  if (req.session.user) {
    return res.redirect('/events/user/dashboard');
  }
  next();
};

module.exports = {
  requireAuth,
  isAdmin,
  preventAuthPages
};