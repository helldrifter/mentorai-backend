const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// ── Security middleware ──────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global rate limiter
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

// ── Routes ───────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/students',  require('./routes/students'));
app.use('/api/mentors',   require('./routes/mentors'));
app.use('/api/sessions',  require('./routes/sessions'));
app.use('/api/packages',  require('./routes/packages'));
app.use('/api/payments',  require('./routes/payments'));
app.use('/api/calculator',require('./routes/calculator'));
app.use('/api/stats',     require('./routes/stats'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', env: process.env.NODE_ENV }));

// ── 404 handler ──────────────────────────
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// ── Global error handler ─────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// ── Connect DB & start server ────────────
const PORT = process.env.PORT || 5000;

// Start server FIRST
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

// Then connect DB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ DB connection failed:', err.message));
  .catch(err => { console.error('❌ DB connection failed:', err.message); process.exit(1); });

module.exports = app;
