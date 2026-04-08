// ── students.js ──────────────────────────────────────────────────────
const express = require('express');
const studRouter = express.Router();
const { User } = require('../models');
const { protect, authorize } = require('../middleware/auth');

// GET /api/students/dashboard — student dashboard data
studRouter.get('/dashboard', protect, authorize('student'), async (req, res) => {
  try {
    const { Session, Score } = require('../models');
    const [upcomingSessions, recentScores, user] = await Promise.all([
      Session.find({ student: req.user._id, status: 'scheduled', scheduledAt: { $gte: new Date() } })
        .populate('mentor', 'name subjects college').sort({ scheduledAt: 1 }).limit(5),
      Score.find({ student: req.user._id }).sort({ createdAt: -1 }).limit(5),
      User.findById(req.user._id).populate('activePackage', 'name durationDays sessions')
    ]);

    const daysLeft = user.packageExpiry
      ? Math.max(0, Math.ceil((new Date(user.packageExpiry) - new Date()) / (1000 * 60 * 60 * 24)))
      : 0;

    res.json({ success: true, data: { user, upcomingSessions, recentScores, daysLeft } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// PUT /api/students/profile
studRouter.put('/profile', protect, authorize('student'), async (req, res) => {
  try {
    const allowed = ['name', 'phone', 'city', 'medium', 'targetExam', 'examYear', 'class'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    res.json({ success: true, data: user });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/students/diagnostic — save diagnostic test result
studRouter.post('/diagnostic', protect, authorize('student'), async (req, res) => {
  try {
    const { physics, chemistry, maths, biology } = req.body;
    const weakAreas = [];
    const scores = { physics, chemistry, maths, biology, completedAt: new Date() };
    if (physics  < 50) weakAreas.push('Physics');
    if (chemistry< 50) weakAreas.push('Chemistry');
    if (maths    < 50) weakAreas.push('Maths');
    if (biology  < 50) weakAreas.push('Biology');
    const user = await User.findByIdAndUpdate(req.user._id, { diagnosticScore: scores, weakAreas }, { new: true });
    res.json({ success: true, data: { diagnosticScore: user.diagnosticScore, weakAreas: user.weakAreas } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = studRouter;
