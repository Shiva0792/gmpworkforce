const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const JOBS_FILE = path.join(__dirname, 'jobs.json');

let adminTokens = new Set();

app.use(express.json());
app.use(express.static(__dirname));

function readJobs() {
  try {
    const data = fs.readFileSync(JOBS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeJobs(jobs) {
  fs.writeFileSync(JOBS_FILE, JSON.stringify(jobs, null, 2), 'utf-8');
}

function authMiddleware(req, res, next) {
  const token = req.headers['authorization'];
  if (!token || !adminTokens.has(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    const token = crypto.randomBytes(32).toString('hex');
    adminTokens.add(token);
    res.json({ success: true, token });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

app.get('/api/jobs', (req, res) => {
  const all = readJobs();
  const includeInactive = req.query.all === 'true';
  if (includeInactive) {
    return res.json(all);
  }
  res.json(all.filter(j => j.active !== false));
});

app.post('/api/jobs', authMiddleware, (req, res) => {
  const { type, title, location, employmentType, vacancies } = req.body;
  if (!type || !title || !location || !employmentType || vacancies == null) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  const jobs = readJobs();
  const maxId = jobs.reduce((max, j) => Math.max(max, j.id), 0);
  const job = {
    id: maxId + 1,
    type,
    title,
    location,
    employmentType,
    vacancies: parseInt(vacancies, 10),
    active: true
  };
  jobs.push(job);
  writeJobs(jobs);
  res.status(201).json(job);
});

app.put('/api/jobs/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const jobs = readJobs();
  const idx = jobs.findIndex(j => j.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Job not found' });
  const { type, title, location, employmentType, vacancies, active } = req.body;
  if (type !== undefined) jobs[idx].type = type;
  if (title !== undefined) jobs[idx].title = title;
  if (location !== undefined) jobs[idx].location = location;
  if (employmentType !== undefined) jobs[idx].employmentType = employmentType;
  if (vacancies !== undefined) jobs[idx].vacancies = parseInt(vacancies, 10);
  if (active !== undefined) jobs[idx].active = active;
  writeJobs(jobs);
  res.json(jobs[idx]);
});

app.delete('/api/jobs/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  let jobs = readJobs();
  jobs = jobs.filter(j => j.id !== id);
  writeJobs(jobs);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin.html`);
});
