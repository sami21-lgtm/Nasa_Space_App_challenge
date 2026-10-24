// Mission Mode API:
//   GET  /api/mission/status    → is Mission Mode unlocked for me? best score, runs
//   POST /api/mission/complete  → save a finished mission and give XP
// Mount in server.js:  app.use('/api/mission', require('./routes/mission')(authenticate));
const express = require('express');
const { db } = require('../lib/db');

const NEEDED = 5; // correct guesses needed to unlock (keep in sync with public/data/missions.js)
const XP = { success: 30, partial: 15, fail: 5 };
const MAX_XP_RUNS_PER_DAY = 3; // stops XP farming
const OUTPOSTS = ['moon', 'mars'];

// Created here too, so this file works even if lib/db.js was not changed.
db.exec(`
  CREATE TABLE IF NOT EXISTS mission_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    outpost TEXT NOT NULL,
    result TEXT NOT NULL,
    sols INTEGER NOT NULL,
    score INTEGER NOT NULL,
    xp INTEGER NOT NULL DEFAULT 0,
    log TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

function correctAnswers(userId) {
  const row = db.prepare('SELECT correct_answers FROM learning_progress WHERE user_id = ?').get(userId);
  return row ? row.correct_answers : 0;
}

module.exports = function missionRoutes(authenticate) {
  const router = express.Router();

  router.get('/status', authenticate, (req, res) => {
    const correct = correctAnswers(req.userId);
    const best = db.prepare('SELECT MAX(score) AS best, COUNT(*) AS runs FROM mission_runs WHERE user_id = ?').get(req.userId);
    const wins = db.prepare("SELECT COUNT(*) AS n FROM mission_runs WHERE user_id = ? AND result = 'success'").get(req.userId);
    res.json({
      unlocked: correct >= NEEDED,
      needed: NEEDED,
      correct,
      best: best.best || 0,
      runs: best.runs || 0,
      wins: wins.n || 0,
    });
  });

  router.post('/complete', authenticate, (req, res) => {
    const b = req.body || {};
    const outpost = String(b.outpost || '');
    const result = String(b.result || '');
    const sols = Number(b.sols);
    const score = Number(b.score);

    if (!OUTPOSTS.includes(outpost) || !(result in XP)) return res.status(400).json({ message: 'Invalid mission data.' });
    if (!Number.isInteger(sols) || sols < 1 || sols > 20) return res.status(400).json({ message: 'Invalid mission length.' });
    if (!Number.isFinite(score) || score < 0 || score > 200) return res.status(400).json({ message: 'Invalid score.' });
    if (correctAnswers(req.userId) < NEEDED) return res.status(403).json({ message: 'Mission Mode is still locked.' });

    // Full mission with the wrong number of sols can't be a success.
    if (result !== 'fail' && sols < 8) return res.status(400).json({ message: 'Mission not finished.' });

    const today = db
      .prepare("SELECT COUNT(*) AS n FROM mission_runs WHERE user_id = ? AND xp > 0 AND date(created_at) = date('now')")
      .get(req.userId).n;
    const xp = today < MAX_XP_RUNS_PER_DAY ? XP[result] : 0;

    const log = JSON.stringify(Array.isArray(b.log) ? b.log.slice(0, 20) : []).slice(0, 6000);

    db.transaction(() => {
      db.prepare('INSERT INTO mission_runs (user_id, outpost, result, sols, score, xp, log) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        req.userId, outpost, result, sols, Math.round(score), xp, log
      );
      if (xp > 0) {
        db.prepare('INSERT OR IGNORE INTO learning_progress (user_id) VALUES (?)').run(req.userId);
        db.prepare('UPDATE learning_progress SET xp = xp + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?').run(xp, req.userId);
      }
    })();

    res.json({ ok: true, xp, xpLimitReached: xp === 0 });
  });

  return router;
};
