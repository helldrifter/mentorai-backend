const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { User, Mentor } = require('../models');
const { generateToken, protect } = require('../middleware/auth');

// Email helper
const sendEmail = async ({ to, subject, html }) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST, port: process.env.EMAIL_PORT,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });
  await transporter.sendMail({ from: `"MentorAI" <${process.env.EMAIL_USER}>`, to, subject, html });
};

// ── POST /api/auth/register ───────────────────────────────────────────
// Register a new student
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, targetExam, examYear, class: cls, phone } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Name, email and password are required.' });
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ success: false, message: 'Email already registered.' });

    const verifyToken = crypto.randomBytes(32).toString('hex');
    const user = await User.create({ name, email, password, targetExam, examYear, class: cls, phone, verifyToken });

    // Send verification email
    const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${verifyToken}`;
    await sendEmail({
      to: email, subject: 'Verify your MentorAI account',
      html: `<p>Hi ${name},</p><p>Click below to verify your email:</p><a href="${verifyUrl}" style="background:#534AB7;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Verify Email</a>`
    }).catch(console.error);

    const token = generateToken(user._id);
    res.status(201).json({ success: true, message: 'Registered! Please verify your email.', token, user: { id: user._id, name: user.name, email: user.email, targetExam: user.targetExam } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required.' });

    // Try student first, then mentor
    let user = await User.findOne({ email }).select('+password');
    let role = 'student';
    if (!user) { user = await Mentor.findOne({ email }).select('+password'); role = 'mentor'; }
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials.' });

    const match = await user.matchPassword(password);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials.' });

    const token = generateToken(user._id);
    res.json({ success: true, token, role, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/auth/verify-email?token=xxx ─────────────────────────────
router.get('/verify-email', async (req, res) => {
  try {
    const user = await User.findOne({ verifyToken: req.query.token });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired token.' });
    user.isVerified = true; user.verifyToken = undefined;
    await user.save();
    res.json({ success: true, message: 'Email verified successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/auth/forgot-password ───────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.json({ success: true, message: 'If that email exists, a reset link was sent.' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetToken = resetToken;
    user.resetExpiry = Date.now() + 3600000; // 1 hour
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
    await sendEmail({ to: user.email, subject: 'Reset your MentorAI password', html: `<p>Click to reset your password (expires in 1 hour):</p><a href="${resetUrl}">Reset Password</a>` });
    res.json({ success: true, message: 'Password reset email sent.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/auth/reset-password ────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const user = await User.findOne({ resetToken: req.body.token, resetExpiry: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired reset token.' });
    user.password = req.body.password;
    user.resetToken = undefined; user.resetExpiry = undefined;
    await user.save();
    res.json({ success: true, message: 'Password reset successful. Please log in.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = router;
