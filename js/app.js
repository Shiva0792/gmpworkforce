const pageCache = {};
let isLoadingPage = false;

// Observe dynamically added elements
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => { if(e.isIntersecting) { e.target.style.opacity='1'; e.target.style.transform='translateY(0)'; } });
}, {threshold: 0.1});

function observeNewElements(container) {
  container.querySelectorAll('.service-card, .why-card, .compliance-badge, .industry-card, .job-card, .industry-detail-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(el);
  });
}

function initPage(name) {
  if (name === 'home') {
    setTimeout(animateStats, 500);
    setupCarousels();
  }
  if (name === 'careers') loadJobs();
}

async function showPage(name) {
  if (isLoadingPage) return;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  let pageEl = document.getElementById('page-' + name);
  if (!pageEl) {
    isLoadingPage = true;
    const container = document.getElementById('page-container');
    pageEl = document.createElement('div');
    pageEl.className = 'page';
    pageEl.id = 'page-' + name;
    container.appendChild(pageEl);

    if (!pageCache[name]) {
      const res = await fetch('pages/' + name + '.html');
      pageCache[name] = await res.text();
    }
    pageEl.innerHTML = pageCache[name];

    observeNewElements(pageEl);
    isLoadingPage = false;
  }

  pageEl.classList.add('active');
  document.querySelectorAll('.nav-links a').forEach(a => { a.classList.remove('active'); a.style.outline = ''; });
  const navPages = ['home','about','services','industries','careers','contact'];
  const idx = navPages.indexOf(name);
  const navLinks = document.querySelectorAll('.nav-links a');
  if (idx >= 0 && idx < navLinks.length) navLinks[idx].classList.add('active');
  document.getElementById('mainNav').classList.remove('open');
  window.scrollTo({top: 0, behavior: 'smooth'});
  document.title = name.charAt(0).toUpperCase() + name.slice(1) + ' | GMP Workforce';

  if (name !== 'home') document.querySelectorAll('.stat-number').forEach(el => { el.textContent = el.dataset.orig || el.textContent; });
  initPage(name);
}

function toggleNav() {
  document.getElementById('mainNav').classList.toggle('open');
}

function scrollToEnquiry() {
  showPage('home');
  setTimeout(() => {
    document.getElementById('enquiry-section').scrollIntoView({behavior:'smooth'});
  }, 100);
}

// Load jobs from API and render
async function loadJobs() {
  const grid = document.getElementById('jobGrid');
  if (!grid) return;
  try {
    const res = await fetch('/api/jobs');
    if (!res.ok) throw new Error('Failed to load');
    const jobs = await res.json();
    if (jobs.length === 0) {
      grid.innerHTML = '<div style="text-align:center;padding:48px 24px;color:var(--mid-gray);font-size:1rem">No open positions right now. Check back later or contact us directly.</div>';
      return;
    }
    grid.innerHTML = jobs.map(j => {
      const isImmediate = j.type === 'immediate';
      const tagStyle = isImmediate ? '' : ' style="background:#e8f0fe;color:#2a5298"';
      const tagLabel = isImmediate ? '● Immediate Joining' : '● Ongoing';
      const hasLongRoles = j.roles && j.roles.length > 100;
      return `<div class="job-card" data-id="${j.id}">
        <div>
          <div class="company-name">${escHtml(j.company)}</div>
          <span class="job-type-tag"${tagStyle}>${tagLabel}</span>
          <h3 style="margin-top:10px">${escHtml(j.title)}</h3>
          <div class="job-meta">
            <div class="job-meta-item"><svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>${escHtml(j.location)}</div>
            <div class="job-meta-item"><svg viewBox="0 0 24 24"><path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2z"/></svg>${escHtml(j.employmentType)}</div>
            <div class="job-meta-item"><svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z"/></svg>${j.vacancies} Vacancies</div>
          </div>
          ${j.department ? `<div class="job-detail-grid">
            <div class="job-detail-item"><div class="label">Department</div><div class="value">${escHtml(j.department)}</div></div>
            <div class="job-detail-item"><div class="label">Qualification</div><div class="value">${escHtml(j.qualification || '-')}</div></div>
            <div class="job-detail-item"><div class="label">Experience</div><div class="value">${escHtml(j.experience || '-')}</div></div>
          </div>` : ''}
          ${j.salaryRange ? `<div class="job-detail-item" style="margin-top:10px"><div class="label">Salary Range</div><div class="value" style="font-weight:700;color:var(--green)">${escHtml(j.salaryRange)}</div></div>` : ''}
          ${j.roles ? `<div class="job-roles"><strong>Roles & Responsibilities</strong><span class="roles-text${hasLongRoles ? ' collapsed' : ''}" data-full="${escHtml(j.roles)}">${hasLongRoles ? escHtml(j.roles).substring(0, 100) : escHtml(j.roles)}</span>${hasLongRoles ? '<button class="roles-toggle-btn">Read More</button>' : ''}</div>` : ''}
        </div>
        <div class="job-card-right">
          <button class="btn btn-navy" onclick="document.getElementById('applyForm').scrollIntoView({behavior:'smooth'})">Apply Now →</button>
        </div>
      </div>`;
    }).join('');
    grid.querySelectorAll('.job-card').forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(24px)';
      el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      observer.observe(el);
    });
    const sel = document.getElementById('positionSelect');
    if (sel) {
      sel.innerHTML = '<option value="">Select a position...</option>' +
        jobs.map(j => `<option>${escHtml(j.company)} – ${escHtml(j.title)}</option>`).join('') +
        '<option>Other</option>';
    }
  } catch {
    grid.innerHTML = '<div style="text-align:center;padding:48px 24px;color:var(--mid-gray);font-size:1rem">Unable to load jobs. Please try again later.</div>';
  }
}

function escHtml(s) {
  const d = document.createElement('div'); d.textContent = s; return d.innerHTML;
}

function animateStats() {
  document.querySelectorAll('.stat-number').forEach(el => {
    if (!el.dataset.orig) el.dataset.orig = el.textContent;
    const target = parseInt(el.textContent);
    if (isNaN(target)) return;
    const suffix = el.textContent.replace(/[0-9]/g, '');
    let start = 0;
    const step = target / 40;
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { el.textContent = target + suffix; clearInterval(timer); }
      else el.textContent = Math.floor(start) + suffix;
    }, 30);
  });
}

// Roles Read More toggle (event delegation on page container)
document.getElementById('page-container').addEventListener('click', (e) => {
  if (e.target.classList.contains('roles-toggle-btn')) {
    const textSpan = e.target.previousElementSibling;
    const isCollapsed = textSpan.classList.contains('collapsed');
    if (isCollapsed) {
      textSpan.textContent = textSpan.dataset.full;
      textSpan.classList.remove('collapsed');
      e.target.textContent = 'Show Less';
    } else {
      textSpan.textContent = textSpan.dataset.full.substring(0, 100);
      textSpan.classList.add('collapsed');
      e.target.textContent = 'Read More';
    }
  }
});

// Carousel system
class CarouselCtrl {
  constructor(slot) {
    this.slot = slot;
    this.current = 0;
    this.images = [];
    this.timer = null;
  }
  getElements() {
    this.track = document.getElementById(this.slot + 'Track');
    this.dotsContainer = document.getElementById(this.slot + 'Dots');
  }
  load(images) {
    this.getElements();
    if (!this.track || !this.dotsContainer) return;
    this.images = images;
    if (!images.length) {
      this.track.innerHTML = this.track.innerHTML;
      this.dotsContainer.innerHTML = '';
      return;
    }
    this.track.innerHTML = images.map(img =>
      `<div class="carousel-slide"><img src="${img.url}" alt="${escHtml(img.name)}" loading="lazy"></div>`
    ).join('');
    this.dotsContainer.innerHTML = images.map((_, i) =>
      `<button class="dot${i === 0 ? ' active' : ''}" onclick="carousels.${this.slot}.goTo(${i})"></button>`
    ).join('');
    this.current = 0;
    this.updateDots();
    this.start();
  }
  goTo(index) {
    if (!this.images.length) return;
    this.current = (index + this.images.length) % this.images.length;
    if (this.track) this.track.style.transform = `translateX(-${this.current * 100}%)`;
    this.updateDots();
  }
  next() { this.goTo(this.current + 1); }
  prev() { this.goTo(this.current - 1); }
  updateDots() {
    if (this.dotsContainer) {
      this.dotsContainer.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === this.current));
    }
  }
  start() {
    this.stop();
    if (this.images.length > 1) this.timer = setInterval(() => this.next(), 4000);
  }
  stop() { if (this.timer) { clearInterval(this.timer); this.timer = null; } }
}

const carousels = {};
function setupCarousels() {
  ['hero', 'intro', 'about'].forEach(slot => {
    if (!carousels[slot]) {
      const ctrl = new CarouselCtrl(slot);
      carousels[slot] = ctrl;
      fetch(`/api/images/${slot}`).then(r => r.json()).then(imgs => ctrl.load(imgs)).catch(() => {});
    } else {
      carousels[slot].getElements();
    }
  });
}

// Form submission handlers with event delegation
document.getElementById('page-container').addEventListener('submit', async (e) => {
  const form = e.target;

  if (form.id === 'enquiryForm') {
    e.preventDefault();
    const btn = document.getElementById('enquirySubmitBtn');
    const msg = document.getElementById('enquiryMessage');
    btn.textContent = 'Submitting...'; btn.disabled = true;
    const data = { name: form.contact.value, company: form.company.value, contact: form.contact.value, phone: form.phone.value, email: form.email.value, message: form.message.value };
    try {
      const res = await fetch('/api/enquiry', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Submission failed');
      msg.innerHTML = '<span style="color:var(--green);font-weight:600">✓ ' + json.message + '</span>';
      form.reset();
    } catch (err) {
      msg.innerHTML = '<span style="color:var(--red);font-weight:600">✗ ' + err.message + '</span>';
    }
    btn.textContent = 'Submit Enquiry →'; btn.disabled = false;
  }

  if (form.id === 'careerForm') {
    e.preventDefault();
    const btn = document.getElementById('careerSubmitBtn');
    const msg = document.getElementById('careerMessage');
    btn.textContent = 'Submitting...'; btn.disabled = true;
    const data = { name: form.name.value, email: form.email.value, phone: form.phone.value, location: form.location.value, position: form.position.value, message: form.message.value };
    try {
      const res = await fetch('/api/apply', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Submission failed');
      msg.innerHTML = '<span style="color:var(--green);font-weight:600">✓ ' + json.message + '</span>';
      form.reset();
    } catch (err) {
      msg.innerHTML = '<span style="color:var(--red);font-weight:600">✗ ' + err.message + '</span>';
    }
    btn.textContent = 'Submit Application →'; btn.disabled = false;
  }

  if (form.id === 'contactForm') {
    e.preventDefault();
    const btn = document.getElementById('contactSubmitBtn');
    const msg = document.getElementById('contactMessage');
    btn.textContent = 'Sending...'; btn.disabled = true;
    const data = { name: form.name.value, phone: form.phone.value, email: form.email.value, message: form.message.value };
    try {
      const res = await fetch('/api/contact', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Submission failed');
      msg.innerHTML = '<span style="color:var(--green);font-weight:600">✓ ' + json.message + '</span>';
      form.reset();
    } catch (err) {
      msg.innerHTML = '<span style="color:var(--red);font-weight:600">✗ ' + err.message + '</span>';
    }
    btn.textContent = 'Send Message →'; btn.disabled = false;
  }
});

// Load home page on initial load
if (window.location.hash) {
  showPage(window.location.hash.slice(1));
} else {
  showPage('home');
}
