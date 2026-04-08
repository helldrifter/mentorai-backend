const jwt = require('jsonwebtoken');
const { User, Mentor } = require('../models');

// Protect routes - verify JWT
const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ success: false, message: 'Not authorised. Please log in.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Check both User and Mentor collections
    req.user = await User.findById(decoded.id) || await Mentor.findById(decoded.id);
    if (!req.user) return res.status(401).json({ success: false, message: 'User not found.' });
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

// Restrict to specific roles
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: `Role '${req.user.role}' not allowed here.` });
  }
  next();
};

// Generate JWT token helper
const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

module.exports = { protect, authorize, generateToken };
