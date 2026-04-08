const express = require('express');
const router = express.Router();
const { Score } = require('../models');
const { protect } = require('../middleware/auth');

// Score + percentile logic
function calcScore(correct, wrong) { return correct * 4 - wrong; }
function estPercentile(score) {
  if (score >= 280) return 99.9; if (score >= 250) return 99.5;
  if (score >= 220) return 99;   if (score >= 200) return 98;
  if (score >= 180) return 96;   if (score >= 160) return 93;
  if (score >= 140) return 88;   if (score >= 120) return 80;
  if (score >= 100) return 70;   if (score >= 80)  return 58;
  if (score >= 60)  return 45;   if (score >= 40)  return 32;
  return 18;
}
function estRank(pct) { return Math.round(1200000 * (1 - pct / 100)); }

function generateAIReport({ physics, chemistry, maths }) {
  const subjects = [
    { name: 'Physics',   ...physics,   score: Math.max(0, calcScore(physics.correct, physics.wrong)) },
    { name: 'Chemistry', ...chemistry, score: Math.max(0, calcScore(chemistry.correct, chemistry.wrong)) },
    { name: 'Maths',     ...maths,     score: Math.max(0, calcScore(maths.correct, maths.wrong)) },
  ];
  const sorted = [...subjects].sort((a, b) => a.score - b.score);
  const worst  = sorted[0];
  const best   = sorted[2];
  const totalC = subjects.reduce((s, x) => s + x.correct, 0);
  const totalW = subjects.reduce((s, x) => s + x.wrong, 0);
  const totalS = subjects.reduce((s, x) => s + x.skipped, 0);
  const totalQ = totalC + totalW + totalS;
  const accuracy = totalQ > 0 ? Math.round(totalC / totalQ * 100) : 0;

  const weakAreas = subjects.filter(s => s.score < 50).map(s => s.name);

  let strategyIssue = 'Exam temperament — push accuracy higher.';
  if (worst.wrong / (worst.correct + worst.wrong + 0.01) > 0.35)
    strategyIssue = `Concept clarity issues in ${worst.name}. Understanding gaps detected.`;
  else if (totalS > 12)
    strategyIssue = `Time management — ${totalS} questions skipped. Spend less time on hard questions.`;
  else if (totalW > 8)
    strategyIssue = 'Question selection — attempting uncertain questions. Apply skip strategy.';

  const improvements = [];
  if (worst.score < 50) improvements.push(`Revise ${worst.name} basics immediately — priority #1`);
  if (totalW > 6)       improvements.push('Practice selective attempting — skip uncertain questions');
  if (totalS > 10)      improvements.push(`Improve time management in ${worst.name}`);
  improvements.push(`Maintain strength in ${best.name} — don't neglect it`);
  if (accuracy < 70)    improvements.push('Focus on easy & moderate questions before attempting tough ones');

  return { weakAreas, accuracy, strategyIssue, improvements, bestSubject: best.name, worstSubject: worst.name };
}

// ── POST /api/calculator/submit ──────────────────────────────────────
// Public (anyone can calculate). If logged in, save to DB.
router.post('/submit', async (req, res) => {
  try {
    const { physics, chemistry, maths, exam = 'JEE', shift } = req.body;
    if (!physics || !chemistry || !maths) {
      return res.status(400).json({ success: false, message: 'Provide physics, chemistry and maths data.' });
    }

    const pScore = Math.max(0, calcScore(physics.correct, physics.wrong));
    const cScore = Math.max(0, calcScore(chemistry.correct, chemistry.wrong));
    const mScore = Math.max(0, calcScore(maths.correct, maths.wrong));
    const total  = pScore + cScore + mScore;
    const pct    = estPercentile(total);
    const rank   = estRank(pct);
    const report = generateAIReport({ physics, chemistry, maths });

    const result = {
      physics:   { ...physics, score: pScore },
      chemistry: { ...chemistry, score: cScore },
      maths:     { ...maths, score: mScore },
      totalScore: total, percentile: pct, rankEstimate: rank,
      accuracy: report.accuracy, weakAreas: report.weakAreas, aiReport: report
    };

    // Save to DB if logged in (optional)
    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
        await Score.create({ student: decoded.id, exam, shift, ...result });
      } catch (_) { /* not logged in - skip save */ }
    }

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/calculator/history ───────────────────────────────────────
// Student's past score submissions
router.get('/history', protect, async (req, res) => {
  try {
    const scores = await Score.find({ student: req.user._id }).sort({ createdAt: -1 }).limit(20);
    res.json({ success: true, data: scores });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
