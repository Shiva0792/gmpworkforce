const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const JOBS_FILE = path.join(__dirname, 'jobs.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

const VALID_SLOTS = ['hero', 'intro', 'about'];

let adminTokens = new Set();

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const slot = req.params.slot;
    const dir = path.join(UPLOADS_DIR, slot);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = file.originalname.replace(ext, '').replace(/[^a-zA-Z0-9 _-]/g, '').trim() || 'image';
    cb(null, `${safeName}_${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) return cb(null, true);
    cb(new Error('Only jpg, jpeg, png, gif, webp allowed'));
  }
});

app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));
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

// Admin login
app.get('/api/admin/verify', authMiddleware, (req, res) => {
  res.json({ valid: true });
});

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

// Jobs CRUD
app.get('/api/jobs', (req, res) => {
  const all = readJobs();
  res.json(req.query.all === 'true' ? all : all.filter(j => j.active !== false));
});

app.post('/api/jobs', authMiddleware, (req, res) => {
  const { type, company, title, department, qualification, experience, salaryRange, location, employmentType, vacancies, roles } = req.body;
  if (!type || !company || !title || !location || !employmentType || vacancies == null) {
    return res.status(400).json({ error: 'Required fields missing: type, company, title, location, employmentType, vacancies' });
  }
  const jobs = readJobs();
  const maxId = jobs.reduce((max, j) => Math.max(max, j.id), 0);
  const job = { id: maxId + 1, type, company, title, department: department || '', qualification: qualification || '', experience: experience || '', salaryRange: salaryRange || '', location, employmentType, vacancies: parseInt(vacancies, 10), roles: roles || '', active: true };
  jobs.push(job);
  writeJobs(jobs);
  res.status(201).json(job);
});

app.put('/api/jobs/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const jobs = readJobs();
  const idx = jobs.findIndex(j => j.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Job not found' });
  const { type, company, title, department, qualification, experience, salaryRange, location, employmentType, vacancies, roles, active } = req.body;
  ['type','company','title','department','qualification','experience','salaryRange','location','employmentType','roles'].forEach(k => { if (req.body[k] !== undefined) jobs[idx][k] = req.body[k]; });
  if (vacancies !== undefined) jobs[idx].vacancies = parseInt(vacancies, 10);
  if (active !== undefined) jobs[idx].active = active;
  writeJobs(jobs);
  res.json(jobs[idx]);
});

app.delete('/api/jobs/:id', authMiddleware, (req, res) => {
  let jobs = readJobs().filter(j => j.id !== parseInt(req.params.id, 10));
  jobs.forEach((j, i) => j.id = i + 1);
  writeJobs(jobs);
  res.json({ success: true });
});

// Image management
app.get('/api/images/:slot', (req, res) => {
  const slot = req.params.slot;
  if (!VALID_SLOTS.includes(slot)) return res.status(400).json({ error: 'Invalid slot' });
  const dir = path.join(UPLOADS_DIR, slot);
  if (!fs.existsSync(dir)) return res.json([]);
  const files = fs.readdirSync(dir).filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));
  res.json(files.map(f => ({ file: f, url: `/uploads/${slot}/${f}`, name: path.parse(f).name.replace(/_\d+$/, '') })));
});

app.post('/api/images/:slot', authMiddleware, (req, res) => {
  const slot = req.params.slot;
  if (!VALID_SLOTS.includes(slot)) return res.status(400).json({ error: 'Invalid slot' });
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const name = path.parse(req.file.filename).name.replace(/_\d+$/, '');
    res.json({ file: req.file.filename, url: `/uploads/${slot}/${req.file.filename}`, name });
  });
});

app.delete('/api/images/:slot/:file', authMiddleware, (req, res) => {
  const { slot, file } = req.params;
  if (!VALID_SLOTS.includes(slot)) return res.status(400).json({ error: 'Invalid slot' });
  if (/\.\./.test(file)) return res.status(400).json({ error: 'Invalid file' });
  const filePath = path.join(UPLOADS_DIR, slot, file);
  try {
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch {
    res.status(404).json({ error: 'File not found' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin.html`);
});
