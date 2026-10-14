const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const db = require('./db');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- config ----------
const PORT = process.env.PORT || 3000;
const SECRET_FILE = path.join(__dirname, '.jwt-secret');
let SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  if (fs.existsSync(SECRET_FILE)) SECRET = fs.readFileSync(SECRET_FILE, 'utf8');
  else {
    SECRET = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(SECRET_FILE, SECRET);
  }
}
const TZ = process.env.TZ_NAME || 'Africa/Cairo';
const CHECKPOINT_ANY_DAY = process.env.CHECKPOINT_ANY_DAY === '1';

// ---------- first run: make a teacher account ----------
if (!db.prepare("SELECT 1 FROM users WHERE role='teacher'").get()) {
  db.prepare(
    "INSERT INTO users (username, full_name, password_hash, role, active) VALUES (?,?,?,?,1)"
  ).run('teacher', 'Teacher', bcrypt.hashSync('teacher123', 10), 'teacher');
  console.log('Created default teacher account: teacher / teacher123  (change it!)');
}

require('./seed').run();

// ---------- helpers ----------
const wrap = (fn) => (req, res) => {
  try { fn(req, res); } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
};

function auth(required = true) {
  return (req, res, next) => {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) return required ? res.status(401).json({ error: 'Please log in' }) : next();
    try {
      const payload = jwt.verify(token, SECRET);
      const user = db.prepare('SELECT id, username, full_name, role, active FROM users WHERE id=?').get(payload.id);
      if (!user) return res.status(401).json({ error: 'Please log in' });
      if (!user.active) return res.status(403).json({ error: 'Account not activated' });
      req.user = user;
      next();
    } catch {
      res.status(401).json({ error: 'Session expired, please log in again' });
    }
  };
}
const teacherOnly = (req, res, next) =>
  req.user.role === 'teacher' ? next() : res.status(403).json({ error: 'Teachers only' });

function cairoParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  });
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  return { weekday: p.weekday, ymd: `${p.year}-${p.month}-${p.day}` };
}
// Week key = the date of the Saturday that started the current week (week runs Sat..Fri)
function weekKey(date = new Date()) {
  const { ymd, weekday } = cairoParts(date);
  const order = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const back = order.indexOf(weekday);
  const d = new Date(ymd + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - back);
  return d.toISOString().slice(0, 10);
}

const parseQ = (q) => ({ id: q.id, lessonId: q.lesson_id, text: q.text, options: JSON.parse(q.options) });

function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Weak lessons: at least 2 answers and accuracy under 60%
function weakLessonsFor(userId) {
  return db.prepare(`
    SELECT l.id, l.title, b.title AS book, COUNT(*) AS attempts,
           SUM(a.is_correct) AS correct,
           ROUND(100.0 * SUM(a.is_correct) / COUNT(*)) AS accuracy
    FROM attempts a
    JOIN questions q ON q.id = a.question_id
    JOIN lessons l ON l.id = q.lesson_id
    JOIN books b ON b.id = l.book_id
    WHERE a.user_id = ?
    GROUP BY l.id
    HAVING COUNT(*) >= 2 AND 100.0 * SUM(a.is_correct) / COUNT(*) < 60
    ORDER BY accuracy ASC
  `).all(userId);
}

// ---------- auth routes ----------
app.post('/api/register', wrap((req, res) => {
  const { username, password, fullName } = req.body || {};
  if (!username || !password || !fullName) return res.status(400).json({ error: 'Name, username and password are required' });
  if (!/^[A-Za-z0-9_.-]{3,30}$/.test(username)) return res.status(400).json({ error: 'Username: 3-30 letters, numbers, _ . -' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (db.prepare('SELECT 1 FROM users WHERE username=?').get(username))
    return res.status(409).json({ error: 'That username is taken' });
  db.prepare('INSERT INTO users (username, full_name, password_hash, role, active) VALUES (?,?,?,?,0)')
    .run(username, String(fullName).trim().slice(0, 80), bcrypt.hashSync(password, 10), 'student');
  res.json({ ok: true, message: 'Account created. Your teacher must activate it before you can log in.' });
}));

app.post('/api/login', wrap((req, res) => {
  const { username, password } = req.body || {};
  const u = db.prepare('SELECT * FROM users WHERE username=?').get(username || '');
  if (!u || !bcrypt.compareSync(password || '', u.password_hash))
    return res.status(401).json({ error: 'Wrong username or password' });
  if (!u.active) return res.status(403).json({ error: 'Your account is waiting for teacher activation' });
  db.prepare("UPDATE users SET last_login=datetime('now') WHERE id=?").run(u.id);
  const token = jwt.sign({ id: u.id }, SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: u.id, username: u.username, fullName: u.full_name, role: u.role } });
}));

app.get('/api/me', auth(), (req, res) => {
  res.json({ id: req.user.id, username: req.user.username, fullName: req.user.full_name, role: req.user.role });
});

// ---------- books & lessons ----------
app.get('/api/books', auth(), wrap((req, res) => {
  const rows = db.prepare(`
    SELECT b.id, b.title, b.grade, b.description,
      (SELECT COUNT(*) FROM lessons l WHERE l.book_id=b.id) AS lessons,
      (SELECT COUNT(*) FROM questions q JOIN lessons l ON l.id=q.lesson_id WHERE l.book_id=b.id) AS questions
    FROM books b ORDER BY b.id`).all();
  res.json(rows);
}));

app.get('/api/books/:id/lessons', auth(), wrap((req, res) => {
  const rows = db.prepare(`
    SELECT l.id, l.title, l.position,
      (SELECT COUNT(*) FROM questions q WHERE q.lesson_id=l.id) AS questions,
      (SELECT COUNT(*) FROM attempts a JOIN questions q ON q.id=a.question_id WHERE q.lesson_id=l.id AND a.user_id=?) AS attempts,
      (SELECT COALESCE(SUM(a.is_correct),0) FROM attempts a JOIN questions q ON q.id=a.question_id WHERE q.lesson_id=l.id AND a.user_id=?) AS correct
    FROM lessons l WHERE l.book_id=? ORDER BY l.position, l.id`).all(req.user.id, req.user.id, req.params.id);
  res.json(rows);
}));

app.get('/api/lessons/:id', auth(), wrap((req, res) => {
  const l = db.prepare(`SELECT l.id, l.title, l.content, l.book_id, b.title AS book
    FROM lessons l JOIN books b ON b.id=l.book_id WHERE l.id=?`).get(req.params.id);
  if (!l) return res.status(404).json({ error: 'Lesson not found' });
  const qs = db.prepare('SELECT * FROM questions WHERE lesson_id=?').all(l.id).map(parseQ);
  res.json({ ...l, questions: qs });
}));

// ---------- tests ----------
app.post('/api/tests/start', auth(), wrap((req, res) => {
  const bookIds = (req.body.bookIds || []).map(Number).filter(Boolean);
  const count = Math.min(Math.max(parseInt(req.body.count) || 10, 3), 30);
  if (!bookIds.length) return res.status(400).json({ error: 'Choose at least one book' });
  const ph = bookIds.map(() => '?').join(',');
  const all = db.prepare(`SELECT q.* FROM questions q JOIN lessons l ON l.id=q.lesson_id WHERE l.book_id IN (${ph})`).all(...bookIds);
  if (!all.length) return res.status(404).json({ error: 'No questions in the selected books' });
  res.json({ questions: shuffle(all).slice(0, count).map(parseQ) });
}));

// ---------- submit answers (tests, skills, checkpoint) ----------
app.post('/api/answers', auth(), wrap((req, res) => {
  const { kind = 'test', answers = [] } = req.body || {};
  if (!['test', 'skill', 'checkpoint'].includes(kind)) return res.status(400).json({ error: 'Bad kind' });
  if (!Array.isArray(answers) || !answers.length) return res.status(400).json({ error: 'No answers' });

  if (kind === 'checkpoint') {
    const wk = weekKey();
    if (db.prepare('SELECT 1 FROM checkpoints WHERE user_id=? AND week_key=?').get(req.user.id, wk))
      return res.status(409).json({ error: 'You already finished this week\'s checkpoint' });
  }

  const getQ = db.prepare(`SELECT q.*, l.title AS lesson_title FROM questions q JOIN lessons l ON l.id=q.lesson_id WHERE q.id=?`);
  const ins = db.prepare('INSERT INTO attempts (user_id, question_id, selected, is_correct, kind) VALUES (?,?,?,?,?)');
  const results = [];
  let score = 0;
  db.transaction(() => {
    for (const a of answers) {
      const q = getQ.get(a.questionId);
      if (!q) continue;
      const selected = Number.isInteger(a.selected) ? a.selected : -1;
      const ok = selected === q.correct ? 1 : 0;
      score += ok;
      ins.run(req.user.id, q.id, selected, ok, kind);
      results.push({
        questionId: q.id, text: q.text, options: JSON.parse(q.options), selected,
        correct: q.correct, isCorrect: !!ok, explanation: q.explanation, lesson: q.lesson_title,
      });
    }
    if (kind === 'checkpoint')
      db.prepare('INSERT INTO checkpoints (user_id, week_key, score, total) VALUES (?,?,?,?)')
        .run(req.user.id, weekKey(), score, results.length);
  })();
  res.json({ score, total: results.length, results });
}));

// ---------- mistakes ----------
app.get('/api/mistakes', auth(), wrap((req, res) => {
  const rows = db.prepare(`
    SELECT q.id, q.text, q.options, q.correct, q.explanation, l.id AS lesson_id, l.title AS lesson,
           b.title AS book, a.selected, a.created_at
    FROM attempts a
    JOIN questions q ON q.id=a.question_id
    JOIN lessons l ON l.id=q.lesson_id
    JOIN books b ON b.id=l.book_id
    WHERE a.user_id=? AND a.is_correct=0
      AND a.id = (SELECT MAX(id) FROM attempts WHERE user_id=a.user_id AND question_id=a.question_id)
    ORDER BY a.id DESC`).all(req.user.id);
  res.json(rows.map((r) => ({ ...r, options: JSON.parse(r.options) })));
}));

// ---------- weak lessons ----------
app.get('/api/weak-lessons', auth(), wrap((req, res) => {
  res.json(weakLessonsFor(req.user.id));
}));

// ---------- weekly checkpoint ----------
app.get('/api/checkpoint/status', auth(), wrap((req, res) => {
  const { weekday, ymd } = cairoParts();
  const wk = weekKey();
  const done = db.prepare('SELECT score, total, created_at FROM checkpoints WHERE user_id=? AND week_key=?').get(req.user.id, wk);
  const history = db.prepare('SELECT week_key, score, total FROM checkpoints WHERE user_id=? ORDER BY week_key DESC LIMIT 12').all(req.user.id);
  res.json({
    today: ymd, weekday,
    isFriday: weekday === 'Fri' || CHECKPOINT_ANY_DAY,
    done: done || null,
    weakCount: weakLessonsFor(req.user.id).length,
    history,
  });
}));

app.post('/api/checkpoint/start', auth(), wrap((req, res) => {
  const { weekday } = cairoParts();
  if (!(weekday === 'Fri' || CHECKPOINT_ANY_DAY)) return res.status(403).json({ error: 'The checkpoint opens every Friday' });
  if (db.prepare('SELECT 1 FROM checkpoints WHERE user_id=? AND week_key=?').get(req.user.id, weekKey()))
    return res.status(409).json({ error: 'You already finished this week\'s checkpoint' });

  const weak = weakLessonsFor(req.user.id);
  if (!weak.length) return res.status(404).json({ error: 'No weak lessons yet. Take some tests and practice first, then come back on Friday!' });
  const ph = weak.map(() => '?').join(',');
  const all = db.prepare(`SELECT * FROM questions WHERE lesson_id IN (${ph})`).all(...weak.map((w) => w.id));
  res.json({ weakLessons: weak, questions: shuffle(all).slice(0, 10).map(parseQ) });
}));

// ---------- teacher ----------
function studentStats() {
  return db.prepare(`
    SELECT u.id, u.username, u.full_name, u.active, u.created_at, u.last_login,
      (SELECT COUNT(*) FROM attempts a WHERE a.user_id=u.id) AS answered,
      (SELECT COALESCE(SUM(is_correct),0) FROM attempts a WHERE a.user_id=u.id) AS correct,
      (SELECT COUNT(*) FROM checkpoints c WHERE c.user_id=u.id) AS checkpoints,
      (SELECT MAX(created_at) FROM attempts a WHERE a.user_id=u.id) AS last_activity
    FROM users u WHERE u.role='student' ORDER BY u.active ASC, u.created_at DESC`).all();
}

app.get('/api/teacher/overview', auth(), teacherOnly, wrap((req, res) => {
  const students = studentStats().map((s) => ({
    ...s, accuracy: s.answered ? Math.round((100 * s.correct) / s.answered) : null,
  }));
  const lessons = db.prepare(`
    SELECT l.id, l.title, b.title AS book, COUNT(a.id) AS attempts,
           COALESCE(ROUND(100.0*SUM(a.is_correct)/NULLIF(COUNT(a.id),0)),NULL) AS accuracy
    FROM lessons l JOIN books b ON b.id=l.book_id
    LEFT JOIN questions q ON q.lesson_id=l.id
    LEFT JOIN attempts a ON a.question_id=q.id
    GROUP BY l.id HAVING COUNT(a.id) > 0
    ORDER BY accuracy ASC LIMIT 10`).all();
  const daily = db.prepare(`
    SELECT date(created_at) AS day, COUNT(*) AS answers, COUNT(DISTINCT user_id) AS students
    FROM attempts WHERE created_at >= datetime('now','-14 days')
    GROUP BY day ORDER BY day`).all();
  res.json({
    totals: {
      students: students.length,
      active: students.filter((s) => s.active).length,
      pending: students.filter((s) => !s.active).length,
      answers: students.reduce((n, s) => n + s.answered, 0),
    },
    students, hardestLessons: lessons, daily,
  });
}));

app.get('/api/teacher/students/:id', auth(), teacherOnly, wrap((req, res) => {
  const s = db.prepare("SELECT id, username, full_name, active, created_at, last_login FROM users WHERE id=? AND role='student'").get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Student not found' });
  const byLesson = db.prepare(`
    SELECT l.title AS lesson, b.title AS book, COUNT(*) AS attempts, SUM(a.is_correct) AS correct,
           ROUND(100.0*SUM(a.is_correct)/COUNT(*)) AS accuracy
    FROM attempts a JOIN questions q ON q.id=a.question_id JOIN lessons l ON l.id=q.lesson_id JOIN books b ON b.id=l.book_id
    WHERE a.user_id=? GROUP BY l.id ORDER BY accuracy ASC`).all(s.id);
  const checkpoints = db.prepare('SELECT week_key, score, total FROM checkpoints WHERE user_id=? ORDER BY week_key DESC').all(s.id);
  res.json({ student: s, byLesson, checkpoints, weak: weakLessonsFor(s.id) });
}));

app.post('/api/teacher/students/:id/active', auth(), teacherOnly, wrap((req, res) => {
  const active = req.body.active ? 1 : 0;
  const r = db.prepare("UPDATE users SET active=? WHERE id=? AND role='student'").run(active, req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'Student not found' });
  res.json({ ok: true, active });
}));

app.post('/api/teacher/students/:id/reset-password', auth(), teacherOnly, wrap((req, res) => {
  const { password } = req.body || {};
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const r = db.prepare("UPDATE users SET password_hash=? WHERE id=? AND role='student'").run(bcrypt.hashSync(password, 10), req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'Student not found' });
  res.json({ ok: true });
}));

app.post('/api/teacher/change-password', auth(), teacherOnly, wrap((req, res) => {
  const { password } = req.body || {};
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(password, 10), req.user.id);
  res.json({ ok: true });
}));

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(PORT, () => console.log(`MathHub running on http://localhost:${PORT}`));
