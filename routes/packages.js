// ── packages.js ──────────────────────────────────────────────────────
const express = require('express');
const pkgRouter = express.Router();
const { Package } = require('../models');
const { protect, authorize } = require('../middleware/auth');

// GET /api/packages — list all active packages
pkgRouter.get('/', async (req, res) => {
  try {
    const packages = await Package.find({ isActive: true }).sort({ durationDays: 1 });
    res.json({ success: true, data: packages });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/packages — admin creates package
pkgRouter.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const pkg = await Package.create(req.body);
    res.status(201).json({ success: true, data: pkg });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Seed default packages (run once)
pkgRouter.post('/seed', protect, authorize('admin'), async (req, res) => {
  try {
    await Package.deleteMany({});
    const packages = await Package.insertMany([
      { name: 'Starter', durationDays: 7,  price: 499,  sessions: 3,  sessionMins: 30,
        features: ['3 mentor sessions (30 min)', 'AI report + weak area analysis', 'Daily study plan for 7 days', 'Unlimited AI doubt solving', 'Chat support with mentor'] },
      { name: 'Growth',  durationDays: 15, price: 1299, sessions: 7,  sessionMins: 45, isFeatured: true,
        features: ['7 mentor sessions (45 min)', 'Deep AI performance report', 'Chapter-wise study plan', '2 full mock tests + review', 'Progress report for parents', 'Priority booking with mentor'] },
      { name: 'Full Prep', durationDays: 30, price: 2499, sessions: 15, sessionMins: 60,
        features: ['15 mentor sessions (60 min)', 'Complete AI readiness dashboard', 'Subject-wise specialist mentors', '5 full mock tests + analysis', 'Daily progress monitoring', 'Parent dashboard access', 'Rank projection updates'] }
    ]);
    res.json({ success: true, message: 'Packages seeded!', data: packages });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = pkgRouter;
