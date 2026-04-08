const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ══════════════════════════════════════
//  USER MODEL (Students)
// ══════════════════════════════════════
const userSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  email:      { type: String, required: true, unique: true, lowercase: true },
  phone:      { type: String },
  password:   { type: String, required: true, select: false },
  targetExam: { type: String, enum: ['JEE', 'NEET', 'BOTH'], default: 'JEE' },
  examYear:   { type: Number, default: 2026 },
  class:      { type: String, enum: ['11', '12', 'Dropper'], default: '12' },
  city:       { type: String },
  medium:     { type: String, enum: ['English', 'Hindi'], default: 'English' },

  // AI Report data
  diagnosticScore: {
    physics:   { type: Number, default: 0 },
    chemistry: { type: Number, default: 0 },
    maths:     { type: Number, default: 0 },
    biology:   { type: Number, default: 0 },
    completedAt: Date
  },
  weakAreas:    [String],
  studyStreak:  { type: Number, default: 0 },
  lastStudyDate: Date,

  // Package info
  activePackage: { type: mongoose.Schema.Types.ObjectId, ref: 'Package' },
  packageExpiry:  Date,

  isVerified:   { type: Boolean, default: false },
  verifyToken:  String,
  resetToken:   String,
  resetExpiry:  Date,
  role:         { type: String, enum: ['student', 'admin'], default: 'student' },
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
userSchema.methods.matchPassword = async function(entered) {
  return bcrypt.compare(entered, this.password);
};

// ══════════════════════════════════════
//  MENTOR MODEL
// ══════════════════════════════════════
const mentorSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  email:      { type: String, required: true, unique: true },
  phone:      { type: String },
  password:   { type: String, required: true, select: false },
  avatar:     { type: String },        // initials or image URL
  college:    { type: String },        // IIT Delhi, AIIMS etc
  experience: { type: Number },        // years
  bio:        { type: String },
  languages:  [String],                // ['Hindi', 'English']

  subjects:   [{ type: String }],      // ['Physics', 'Maths']
  exams:      [{ type: String }],      // ['JEE', 'NEET']
  specialisations: [String],           // ['Mechanics', 'Calculus']

  pricePerSession: { type: Number, required: true },
  rating:          { type: Number, default: 5.0 },
  totalRatings:    { type: Number, default: 0 },
  totalStudents:   { type: Number, default: 0 },
  successRate:     { type: Number, default: 90 },

  availability: [{
    day:       { type: String },        // 'Monday'
    startTime: { type: String },        // '16:00'
    endTime:   { type: String }         // '21:00'
  }],

  isVerified: { type: Boolean, default: false },
  isActive:   { type: Boolean, default: true },
  role:       { type: String, default: 'mentor' },
}, { timestamps: true });

mentorSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ══════════════════════════════════════
//  SESSION MODEL
// ══════════════════════════════════════
const sessionSchema = new mongoose.Schema({
  student:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mentor:     { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor', required: true },
  package:    { type: mongoose.Schema.Types.ObjectId, ref: 'Package' },

  type:       { type: String, enum: ['demo', 'paid'], default: 'paid' },
  subject:    { type: String },
  topic:      { type: String },
  notes:      { type: String },

  scheduledAt: { type: Date, required: true },
  duration:    { type: Number, default: 45 },   // minutes
  meetLink:    { type: String },

  status:     { type: String, enum: ['scheduled', 'completed', 'cancelled', 'no-show'], default: 'scheduled' },
  studentRating:  { type: Number, min: 1, max: 5 },
  studentReview:  { type: String },
  mentorNotes:    { type: String },
}, { timestamps: true });

// ══════════════════════════════════════
//  PACKAGE MODEL
// ══════════════════════════════════════
const packageSchema = new mongoose.Schema({
  name:         { type: String, required: true },   // 'Starter', 'Growth', 'Full Prep'
  durationDays: { type: Number, required: true },   // 7, 15, 30
  price:        { type: Number, required: true },   // in INR
  sessions:     { type: Number, required: true },   // number of sessions
  sessionMins:  { type: Number, required: true },   // minutes per session
  features:     [String],
  isActive:     { type: Boolean, default: true },
  isFeatured:   { type: Boolean, default: false },
}, { timestamps: true });

// ══════════════════════════════════════
//  PAYMENT MODEL
// ══════════════════════════════════════
const paymentSchema = new mongoose.Schema({
  student:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  package:         { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
  amount:          { type: Number, required: true },
  currency:        { type: String, default: 'INR' },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  razorpaySignature: { type: String },
  status:          { type: String, enum: ['pending', 'success', 'failed', 'refunded'], default: 'pending' },
}, { timestamps: true });

// ══════════════════════════════════════
//  SCORE MODEL (Calculator submissions)
// ══════════════════════════════════════
const scoreSchema = new mongoose.Schema({
  student:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  exam:       { type: String, enum: ['JEE', 'NEET'], default: 'JEE' },
  shift:      { type: String },
  physics:    { correct: Number, wrong: Number, skipped: Number, score: Number },
  chemistry:  { correct: Number, wrong: Number, skipped: Number, score: Number },
  maths:      { correct: Number, wrong: Number, skipped: Number, score: Number },
  totalScore: Number,
  percentile: Number,
  rankEstimate: Number,
  accuracy:   Number,
  weakAreas:  [String],
  aiReport:   { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

module.exports = {
  User:    mongoose.model('User', userSchema),
  Mentor:  mongoose.model('Mentor', mentorSchema),
  Session: mongoose.model('Session', sessionSchema),
  Package: mongoose.model('Package', packageSchema),
  Payment: mongoose.model('Payment', paymentSchema),
  Score:   mongoose.model('Score', scoreSchema),
};
