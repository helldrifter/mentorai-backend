// ── sessions.js ──────────────────────────────────────────────────────
const express = require('express');
const sRouter = express.Router();
const { Session } = require('../models');
const { protect, authorize } = require('../middleware/auth');

// GET /api/sessions/my — student's sessions
sRouter.get('/my', protect, async (req, res) => {
  try {
    const filter = req.user.role === 'mentor'
      ? { mentor: req.user._id }
      : { student: req.user._id };
    const sessions = await Session.find(filter)
      .populate('mentor', 'name subjects rating pricePerSession college')
      .populate('student', 'name email targetExam')
      .sort({ scheduledAt: 1 });
    res.json({ success: true, data: sessions });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/sessions — book a paid session
sRouter.post('/', protect, authorize('student'), async (req, res) => {
  try {
    const { mentor, scheduledAt, subject, topic, duration = 45 } = req.body;
    // Verify student has active package
    if (!req.user.activePackage || new Date(req.user.packageExpiry) < new Date()) {
      return res.status(403).json({ success: false, message: 'No active package. Please purchase a package first.' });
    }
    const session = await Session.create({
      student: req.user._id, mentor, package: req.user.activePackage,
      scheduledAt: new Date(scheduledAt), subject, topic, duration, type: 'paid'
    });
    await session.populate(['mentor', 'student']);
    res.status(201).json({ success: true, data: session });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// PATCH /api/sessions/:id/complete — mentor marks complete
sRouter.patch('/:id/complete', protect, authorize('mentor'), async (req, res) => {
  try {
    const session = await Session.findOneAndUpdate(
      { _id: req.params.id, mentor: req.user._id },
      { status: 'completed', mentorNotes: req.body.notes },
      { new: true }
    );
    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });
    res.json({ success: true, data: session });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// PATCH /api/sessions/:id/rate — student rates session
sRouter.patch('/:id/rate', protect, authorize('student'), async (req, res) => {
  try {
    const { rating, review } = req.body;
    const session = await Session.findOneAndUpdate(
      { _id: req.params.id, student: req.user._id, status: 'completed' },
      { studentRating: rating, studentReview: review },
      { new: true }
    ).populate('mentor');
    if (!session) return res.status(404).json({ success: false, message: 'Session not found or not completed.' });

    // Update mentor average rating
    const { Mentor } = require('../models');
    const allRatings = await Session.find({ mentor: session.mentor._id, studentRating: { $exists: true } });
    const avg = allRatings.reduce((s, r) => s + r.studentRating, 0) / allRatings.length;
    await Mentor.findByIdAndUpdate(session.mentor._id, { rating: Math.round(avg * 10) / 10, totalRatings: allRatings.length });

    res.json({ success: true, message: 'Rating submitted!', data: session });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = sRouter;
