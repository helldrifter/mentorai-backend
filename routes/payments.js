const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { Package, Payment, User } = require('../models');
const { protect, authorize } = require('../middleware/auth');

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// ── POST /api/payments/create-order ──────────────────────────────────
// Create Razorpay order before payment
router.post('/create-order', protect, authorize('student'), async (req, res) => {
  try {
    const { packageId } = req.body;
    const pkg = await Package.findById(packageId);
    if (!pkg || !pkg.isActive) return res.status(404).json({ success: false, message: 'Package not found.' });

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: pkg.price * 100,   // paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: { studentId: req.user._id.toString(), packageId: pkg._id.toString() }
    });

    // Save pending payment record
    const payment = await Payment.create({
      student: req.user._id,
      package: pkg._id,
      amount: pkg.price,
      razorpayOrderId: order.id,
      status: 'pending'
    });

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      paymentId: payment._id,
      key: process.env.RAZORPAY_KEY_ID,
      prefill: { name: req.user.name, email: req.user.email, contact: req.user.phone }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/payments/verify ─────────────────────────────────────────
// Verify Razorpay signature after payment success on frontend
router.post('/verify', protect, authorize('student'), async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, paymentId } = req.body;

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSig = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body).digest('hex');

    if (expectedSig !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed. Contact support.' });
    }

    // Update payment record
    const payment = await Payment.findByIdAndUpdate(paymentId, {
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      status: 'success'
    }, { new: true }).populate('package');

    // Activate package on student account
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + payment.package.durationDays);
    await User.findByIdAndUpdate(req.user._id, {
      activePackage: payment.package._id,
      packageExpiry: expiry
    });

    res.json({ success: true, message: 'Payment successful! Package activated.', data: payment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/payments/history ─────────────────────────────────────────
router.get('/history', protect, async (req, res) => {
  try {
    const payments = await Payment.find({ student: req.user._id })
      .populate('package', 'name durationDays price')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: payments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/packages ─────────────────────────────────────────────────
// Get all available packages (public)
router.get('/packages', async (req, res) => {
  try {
    const packages = await Package.find({ isActive: true }).sort({ durationDays: 1 });
    res.json({ success: true, data: packages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
