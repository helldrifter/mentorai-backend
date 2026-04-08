const express = require('express');
const router = express.Router();
const { Mentor, Session } = require('../models');
const { protect, authorize } = require('../middleware/auth');

// ── GET /api/mentors ─────────────────────────────────────────────────
// Public: list all active mentors with optional filters
router.get('/', async (req, res) => {
  try {
    const { exam, subject, minRating, maxPrice, search } = req.query;
    const filter = { isActive: true, isVerified: true };
    if (exam)       filter.exams    = { $in: [exam] };
    if (subject)    filter.subjects = { $in: [subject] };
    if (minRating)  filter.rating   = { $gte: parseFloat(minRating) };
    if (maxPrice)   filter.pricePerSession = { $lte: parseInt(maxPrice) };
    if (search)     filter.name     = { $regex: search, $options: 'i' };

    const mentors = await Mentor.find(filter)
      .select('-password -__v')
      .sort({ rating: -1, totalStudents: -1 });

    res.json({ success: true, count: mentors.length, data: mentors });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/mentors/:id ─────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const mentor = await Mentor.findById(req.params.id).select('-password');
    if (!mentor) return res.status(404).json({ success: false, message: 'Mentor not found.' });
    res.json({ success: true, data: mentor });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/mentors/:id/book-demo ──────────────────────────────────
// Authenticated student books a free demo session
router.post('/:id/book-demo', protect, authorize('student'), async (req, res) => {
  try {
    const mentor = await Mentor.findById(req.params.id);
    if (!mentor) return res.status(404).json({ success: false, message: 'Mentor not found.' });

    // Check student hasn't already booked a demo with any mentor
    const existingDemo = await Session.findOne({ student: req.user._id, type: 'demo' });
    if (existingDemo) return res.status(400).json({ success: false, message: 'You have already used your free demo session.' });

    const { scheduledAt, subject, topic } = req.body;
    if (!scheduledAt) return res.status(400).json({ success: false, message: 'Please provide a scheduled date/time.' });

    const session = await Session.create({
      student: req.user._id,
      mentor: mentor._id,
      type: 'demo',
      subject, topic,
      scheduledAt: new Date(scheduledAt),
      duration: 20,
      status: 'scheduled'
    });

    await session.populate(['student', 'mentor']);
    res.status(201).json({ success: true, message: 'Free demo session booked!', data: session });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/mentors/:id/availability ────────────────────────────────
router.get('/:id/availability', async (req, res) => {
  try {
    const mentor = await Mentor.findById(req.params.id).select('availability name');
    if (!mentor) return res.status(404).json({ success: false, message: 'Mentor not found.' });

    // Get booked slots for next 7 days
    const from = new Date();
    const to = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const bookedSessions = await Session.find({
      mentor: req.params.id,
      scheduledAt: { $gte: from, $lte: to },
      status: { $ne: 'cancelled' }
    }).select('scheduledAt duration');

    res.json({ success: true, data: { availability: mentor.availability, bookedSlots: bookedSessions } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PUT /api/mentors/profile ──────────────────────────────────────────
// Mentor updates own profile
router.put('/profile', protect, authorize('mentor'), async (req, res) => {
  try {
    const allowed = ['bio', 'subjects', 'exams', 'specialisations', 'pricePerSession', 'languages', 'availability'];
    const updates = {};
    allowed.forEach(field => { if (req.body[field] !== undefined) updates[field] = req.body[field]; });
    const mentor = await Mentor.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-password');
    res.json({ success: true, data: mentor });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
